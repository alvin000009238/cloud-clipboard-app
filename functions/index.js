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

// 您的應用程式名稱，會顯示在 Passkey 驗證提示中
const rpName = 'Cloud Clipboard';

/**
 * 解析請求來源 (origin) 和依賴方 ID (rpID)。
 * 優先使用前端傳來的資料，若無則嘗試從請求標頭中解析。
 * @param {functions.https.CallableContext} context - Cloud Function 的上下文。
 * @param {object} data - 前端傳來的資料。
 * @returns {{origin: string, rpID: string}}
 */
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

  // rpID 通常是網站的主機名稱
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

/**
 * 產生 Passkey 註冊選項 (Challenge)
 */
exports.generateRegistrationOptions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '需要登入才能註冊 Passkey');
  }
  const uid = context.auth.uid;

  const { origin, rpID } = resolveRpInfo(context, data);

  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const passkeys = userDoc.exists ? userDoc.data().passkeys || [] : [];

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: uid,
    userName: context.auth.token.email || uid,
    attestationType: 'none',
    // 排除已註冊過的憑證
    excludeCredentials: passkeys.map(pk => ({
      id: Buffer.from(pk.credentialID, 'base64url'),
      type: 'public-key',
    })),
  });

  // 將 challenge 暫存到使用者資料中，以便後續驗證
  await userRef.set({ currentChallenge: options.challenge }, { merge: true });

  return options;
});

/**
 * 驗證 Passkey 註冊憑證
 */
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
  const expectedChallenge = userDoc.exists ? userDoc.data().currentChallenge : undefined;

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
    console.error('Passkey Registration Verification Error:', error);
    throw new functions.https.HttpsError('invalid-argument', `憑證驗證失敗: ${error.message}`);
  }

  const { verified, registrationInfo } = verification;
  if (verified && registrationInfo) {
    const { credentialPublicKey, credentialID, counter } = registrationInfo;
    
    // 將二進位資料轉為 base64url 字串以便存入 Firestore
    const newPasskey = {
      credentialID: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
    };

    await userRef.set({
      passkeys: admin.firestore.FieldValue.arrayUnion(newPasskey),
      currentChallenge: admin.firestore.FieldValue.delete(), // 驗證完畢後刪除 challenge
    }, { merge: true });
  }

  return { verified };
});

/**
 * 產生 Passkey 登入選項 (Challenge)
 */
exports.generateAuthenticationOptions = functions.https.onCall(async (data, context) => {
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', '缺少 email');
  }

  const { origin, rpID } = resolveRpInfo(context, data);

  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) {
    throw new functions.https.HttpsError('not-found', '找不到與此電子郵件相關的 Passkey。');
  }

  const userDoc = snap.docs[0];
  const user = userDoc.data();

  if (!user.passkeys || user.passkeys.length === 0) {
    throw new functions.https.HttpsError('not-found', '此帳號尚未註冊任何 Passkey。');
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.passkeys.map(pk => ({
      id: Buffer.from(pk.credentialID, 'base64url'),
      type: 'public-key',
    })),
    userVerification: 'required', // 提高安全性，要求使用者進行生物辨識或 PIN 碼驗證
  });

  await userDoc.ref.update({ currentChallenge: options.challenge });

  return { options };
});

/**
 * 驗證 Passkey 登入憑證
 */
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

  if (!expectedChallenge) {
    throw new functions.https.HttpsError('failed-precondition', 'Passkey 登入挑戰已過期，請重新操作。');
  }

  const passkey = (user.passkeys || []).find(pk => pk.credentialID === credential.id);
  if (!passkey) {
    throw new functions.https.HttpsError('not-found', '此裝置的 Passkey 未註冊');
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
      requireUserVerification: true,
    });
  } catch (error) {
    console.error('Passkey Authentication Verification Error:', error);
    throw new functions.https.HttpsError('unauthenticated', `驗證失敗: ${error.message}`);
  }

  const { verified, authenticationInfo } = verification;
  if (verified) {
    // 更新 counter
    await userDoc.ref.update({
      passkeys: user.passkeys.map(pk =>
        pk.credentialID === passkey.credentialID
          ? { ...pk, counter: authenticationInfo.newCounter }
          : pk
      ),
      currentChallenge: admin.firestore.FieldValue.delete(),
    });

    // 產生 Firebase custom token 讓前端登入
    const token = await admin.auth().createCustomToken(userDoc.id);
    return { token };
  }

  throw new functions.https.HttpsError('unauthenticated', 'Passkey 驗證失敗');
});
