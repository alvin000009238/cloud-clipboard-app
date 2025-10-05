const functions = require('firebase-functions');
const admin = require('firebase-admin');

const cors = require('cors');

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

admin.initializeApp();
const db = admin.firestore();


const REGION = 'us-central1';
const rpName = 'Cloud Clipboard';
const PROD_RP_ID = 'cloud.20090408.xyz';
const LOCAL_RP_ID = 'localhost';
const ALLOWED_ORIGINS = [
  'https://cloud.20090408.xyz',
  'http://localhost:5173',
];

const EXPECTED_ORIGINS = [...ALLOWED_ORIGINS];

const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
});

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function toB64u(value) {
  if (!value) {
    return '';
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('base64url');
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(value)).toString('base64url');
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString('base64url');
  }
  return Buffer.from(value).toString('base64url');
}

function fromB64u(value) {
  return Buffer.from(value, 'base64url');
}

function getRequestOrigin(req) {
  return req.get('origin') || '';
}

function determineRpID(origin) {
  if (origin === 'http://localhost:5173') {
    return LOCAL_RP_ID;
  }
  return PROD_RP_ID;
}

function ensureOriginAllowed(origin) {
  if (!origin) {
    throw new HttpError(400, 'originMissing', '缺少請求來源 (origin)。');
  }
  if (!EXPECTED_ORIGINS.includes(origin) && !origin.startsWith('android:')) {
    throw new HttpError(403, 'originNotAllowed', '來源不被允許。');
  }
}

function sendError(res, status, code, message) {
  res.status(status).json({ ok: false, code, message });
}

function mapVerificationError(error) {
  const message = error?.message || '';
  if (message.toLowerCase().includes('origin mismatch')) {
    return 'expectedOriginMismatch';
  }
  if (message.toLowerCase().includes('rp id mismatch') || message.toLowerCase().includes('rp id did not')) {
    return 'expectedRPIDMismatch';
  }
  if (message.toLowerCase().includes('challenge mismatch')) {
    return 'challengeMismatch';
  }
  if (message.toLowerCase().includes('user verification failed')) {
    return 'userVerificationFailed';
  }
  return 'verificationFailed';
}

async function requireAuth(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new HttpError(401, 'unauthenticated', '需要登入才能執行此操作。');
  }
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (error) {
    throw new HttpError(401, 'unauthenticated', '登入資訊已失效，請重新登入。');
  }
}

function withCors(handler) {
  return (req, res) => {
    corsMiddleware(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }
      try {
        await handler(req, res);
      } catch (error) {
        if (error instanceof HttpError) {
          sendError(res, error.status, error.code, error.message);
        } else {
          functions.logger.error('Unhandled error', error);
          sendError(res, 500, 'internal', '內部伺服器錯誤。');
        }
      }
    });
  };
}

async function getUserDocByEmail(email) {
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) {
    return null;
  }
  return snap.docs[0];
}

async function getChallengeDoc(userRef) {
  return userRef.collection('webauthn').doc('challenge').get();
}

function getCredentialCollection(userRef) {
  return userRef.collection('credentials');
}

exports.regOptions = functions
  .region(REGION)
  .https.onRequest(withCors(async (req, res) => {
    if (req.method !== 'GET') {
      throw new HttpError(405, 'methodNotAllowed', '僅支援 GET 請求。');
    }

    const decoded = await requireAuth(req);
    const origin = getRequestOrigin(req);
    ensureOriginAllowed(origin);
    const rpID = determineRpID(origin);
    functions.logger.info('regOptions', { uid: decoded.uid, origin, rpID });

    const userRef = db.collection('users').doc(decoded.uid);
    const userData = {};
    if (decoded.email) {
      userData.email = decoded.email.toLowerCase();
    }
    if (Object.keys(userData).length > 0) {
      await userRef.set(userData, { merge: true });
    }

    const credentialsSnap = await getCredentialCollection(userRef).get();
    const excludeCredentials = credentialsSnap.docs.map(doc => ({
      id: fromB64u(doc.id),
      type: 'public-key',
    }));

    const options = generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(decoded.uid, 'utf8'),
      userName: decoded.email || decoded.uid,
      attestationType: 'none',
      excludeCredentials,
    });

    await userRef.collection('webauthn').doc('challenge').set({
      value: options.challenge,
      type: 'registration',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true, options });
  }));

exports.regVerify = functions
  .region(REGION)
  .https.onRequest(withCors(async (req, res) => {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'methodNotAllowed', '僅支援 POST 請求。');
    }

    const decoded = await requireAuth(req);
    const origin = getRequestOrigin(req);
    ensureOriginAllowed(origin);
    const rpID = determineRpID(origin);

    const credential = req.body?.credential;
    if (!credential) {
      throw new HttpError(400, 'invalidRequest', '缺少 Passkey 憑證資料。');
    }

    const userRef = db.collection('users').doc(decoded.uid);
    const challengeSnap = await getChallengeDoc(userRef);
    if (!challengeSnap.exists) {
      throw new HttpError(400, 'challengeMissing', '找不到註冊挑戰，請重新開始流程。');
    }

    const { value: expectedChallenge, type } = challengeSnap.data();
    if (type !== 'registration' || !expectedChallenge) {
      throw new HttpError(400, 'challengeMismatch', '註冊挑戰無效，請重新開始流程。');
    }

    functions.logger.info('regVerify', { uid: decoded.uid, origin, rpID });

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGINS,
        expectedRPID: rpID,
      });
    } catch (error) {
      const code = mapVerificationError(error);
      throw new HttpError(400, code, error.message);
    }

    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo) {
      throw new HttpError(400, 'userVerificationFailed', 'Passkey 註冊驗證失敗。');
    }

    const { credentialPublicKey, credentialID, counter } = registrationInfo;
    const credentialIDB64 = toB64u(credentialID);
    const publicKeyB64 = toB64u(credentialPublicKey);
    const transports = Array.isArray(credential.transports) ? credential.transports : [];

    await getCredentialCollection(userRef).doc(credentialIDB64).set({
      credentialID: credentialIDB64,
      publicKey: publicKeyB64,
      counter,
      transports,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await userRef.collection('webauthn').doc('challenge').delete();

    res.json({ ok: true });
  }));

exports.authOptions = functions
  .region(REGION)
  .https.onRequest(withCors(async (req, res) => {
    if (req.method !== 'GET') {
      throw new HttpError(405, 'methodNotAllowed', '僅支援 GET 請求。');
    }

    const email = (req.query?.email || '').toString().trim().toLowerCase();
    if (!email) {
      throw new HttpError(400, 'missingEmail', '請提供 email。');
    }

    const origin = getRequestOrigin(req);
    ensureOriginAllowed(origin);
    const rpID = determineRpID(origin);
    functions.logger.info('authOptions', { email, origin, rpID });

    const userDoc = await getUserDocByEmail(email);
    if (!userDoc) {
      throw new HttpError(404, 'userNotFound', '找不到對應的使用者。');
    }

    const credentialsSnap = await getCredentialCollection(userDoc.ref).get();
    if (credentialsSnap.empty) {
      throw new HttpError(404, 'credentialNotFound', '此使用者尚未註冊 Passkey。');
    }

    const allowCredentials = credentialsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: fromB64u(doc.id),
        type: 'public-key',
        transports: data.transports && data.transports.length ? data.transports : undefined,
      };
    });

    const options = generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    await userDoc.ref.collection('webauthn').doc('challenge').set({
      value: options.challenge,
      type: 'authentication',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true, options });
  }));

exports.authVerify = functions
  .region(REGION)
  .https.onRequest(withCors(async (req, res) => {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'methodNotAllowed', '僅支援 POST 請求。');
    }

    const { email, credential } = req.body || {};
    if (!email || !credential) {
      throw new HttpError(400, 'invalidRequest', '缺少 Passkey 登入所需的資料。');
    }

    if (typeof credential.id !== 'string' || !credential.id) {
      throw new HttpError(400, 'invalidCredentialId', '傳入的憑證 ID 無效。');
    }

    const origin = getRequestOrigin(req);
    ensureOriginAllowed(origin);
    const rpID = determineRpID(origin);
    functions.logger.info('authVerify', { email, origin, rpID });

    const userDoc = await getUserDocByEmail(email.toLowerCase());
    if (!userDoc) {
      throw new HttpError(404, 'userNotFound', '找不到對應的使用者。');
    }

    const challengeSnap = await getChallengeDoc(userDoc.ref);
    if (!challengeSnap.exists) {
      throw new HttpError(400, 'challengeMissing', 'Passkey 登入挑戰已過期，請重新操作。');
    }

    const { value: expectedChallenge, type } = challengeSnap.data();
    if (type !== 'authentication' || !expectedChallenge) {
      throw new HttpError(400, 'challengeMismatch', 'Passkey 登入挑戰無效，請重新操作。');
    }

    const credentialId = credential.id;
    const storedCredentialDoc = await getCredentialCollection(userDoc.ref).doc(credentialId).get();
    if (!storedCredentialDoc.exists) {
      throw new HttpError(404, 'credentialNotFound', 'Passkey 未註冊或已被移除。');
    }

    const storedCredential = storedCredentialDoc.data();

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: EXPECTED_ORIGINS,
        expectedRPID: rpID,
        authenticator: {
          credentialPublicKey: fromB64u(storedCredential.publicKey),
          credentialID: fromB64u(storedCredentialDoc.id),
          counter: storedCredential.counter || 0,
          transports: storedCredential.transports || [],
        },
      });
    } catch (error) {
      const code = mapVerificationError(error);
      throw new HttpError(401, code, error.message);
    }

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      throw new HttpError(401, 'userVerificationFailed', 'Passkey 登入驗證失敗。');
    }

    await storedCredentialDoc.ref.update({
      counter: authenticationInfo.newCounter,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await userDoc.ref.collection('webauthn').doc('challenge').delete();

    const customToken = await admin.auth().createCustomToken(userDoc.id);
    res.json({ ok: true, customToken });
  }));
