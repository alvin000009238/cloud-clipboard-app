const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

admin.initializeApp();
const db = admin.firestore();

const rpName = 'Cloud Clipboard';
function resolveRpInfo(context, data = {}) {
  const headers = context.rawRequest?.headers || {};
  const originFromData = data.origin;
  const originFromHeader = headers.origin;
  const forwardedHost = headers['x-forwarded-host'];
  const host = forwardedHost || headers.host;

  let origin = originFromData || originFromHeader;
  if (!origin && host) {
    const isLocal = /localhost|127\.0\.0\.1|\[::1\]/.test(host);
    const protocol = isLocal ? 'http' : 'https';
    origin = `${protocol}://${host}`;
  }

  if (!origin) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '無法判斷請求來源的 origin，請在請求資料中提供 origin。',
    );
  }

  let rpID = data.rpID;
  if (!rpID) {
    try {
      rpID = new URL(origin).hostname;
    } catch (error) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '提供的 origin 不是有效的 URL，請確認 origin 或直接提供 rpID。',
      );
    }
  }

  if (!rpID) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '無法判斷 RP ID，請提供 rpID。',
    );
  }

  return { origin, rpID };
}


exports.generateRegistrationOptions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '需要登入才能註冊 Passkey');
  }
  const uid = context.auth.uid;

  const { origin, rpID } = resolveRpInfo(context, data);

  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const passkeys = userDoc.exists ? userDoc.data().passkeys || [] : [];

  const options = generateRegistrationOptions({
    rpName,
    rpID,
    userID: uid,
    userName: context.auth.token.email || uid,
    attestationType: 'none',
    excludeCredentials: passkeys.map(pk => ({
      id: Buffer.from(pk.credentialID, 'base64url'),
      type: 'public-key',
    })),
  });

  await userRef.set({ currentChallenge: options.challenge, email: context.auth.token.email }, { merge: true });
  return options;
});

exports.verifyRegistration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '需要登入才能註冊 Passkey');
  }

  if (!data || !data.credential) {
    throw new functions.https.HttpsError('invalid-argument', '缺少 Passkey 憑證資料');
  }
  const uid = context.auth.uid;
  const { origin, rpID } = resolveRpInfo(context, data);
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('failed-precondition', '尚未建立 Passkey 註冊挑戰，請重新操作。');
  }
  const userData = userDoc.data();
  const expectedChallenge = userData.currentChallenge;
  if (!expectedChallenge) {
    throw new functions.https.HttpsError('failed-precondition', '缺少驗證所需的挑戰，請重新開始註冊流程。');
  }


  let verification;
  try {
    verification = await verifyRegistrationResponse({

      response: data.credential,

      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (error) {
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }

  const { verified, registrationInfo } = verification;
  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;
    const credentialIDBase64 = credentialID.toString('base64url');
    const publicKeyBase64 = credentialPublicKey.toString('base64url');

    await userRef.set({
      passkeys: admin.firestore.FieldValue.arrayUnion({
        credentialID: credentialIDBase64,
        publicKey: publicKeyBase64,
        counter,
      }),

      currentChallenge: admin.firestore.FieldValue.delete(),

    }, { merge: true });
  }

  return { verified };
});

exports.generateAuthenticationOptions = functions.https.onCall(async (data, context) => {
  const { email } = data;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', '缺少 email');
  }
  const { origin, rpID } = resolveRpInfo(context, data);

  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', '找不到使用者');
  }
  const userDoc = snap.docs[0];
  const user = userDoc.data();
  const options = generateAuthenticationOptions({
    rpID,
    allowCredentials: (user.passkeys || []).map(pk => ({
      id: Buffer.from(pk.credentialID, 'base64url'),
      type: 'public-key',
    })),
    userVerification: 'preferred',
  });
  await userDoc.ref.update({ currentChallenge: options.challenge });
  return { options };
});

exports.verifyAuthentication = functions.https.onCall(async (data, context) => {

  const { email, credential } = data || {};
  if (!email || !credential) {
    throw new functions.https.HttpsError('invalid-argument', '缺少 Passkey 登入所需的資料');
  }
  const { origin, rpID } = resolveRpInfo(context, data);

  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', '找不到使用者');
  }
  const userDoc = snap.docs[0];
  const user = userDoc.data();
  const expectedChallenge = user.currentChallenge;
  const passkey = (user.passkeys || []).find(pk => pk.credentialID === credential.rawId);
  if (!passkey) {
    throw new functions.https.HttpsError('not-found', 'Passkey 未註冊');
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialPublicKey: Buffer.from(passkey.publicKey, 'base64url'),
        credentialID: Buffer.from(passkey.credentialID, 'base64url'),
        counter: passkey.counter,
      },
    });
  } catch (error) {
    throw new functions.https.HttpsError('invalid-argument', error.message);
  }

  const { verified, authenticationInfo } = verification;
  if (verified) {
    await userDoc.ref.update({
      passkeys: (user.passkeys || []).map(pk =>
        pk.credentialID === passkey.credentialID
          ? { ...pk, counter: authenticationInfo.newCounter }
          : pk
      ),

      currentChallenge: admin.firestore.FieldValue.delete(),

    });
    const token = await admin.auth().createCustomToken(userDoc.id);
    return { token };
  }
  throw new functions.https.HttpsError('unauthenticated', '驗證失敗');
});
