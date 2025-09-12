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

exports.generateRegistrationOptions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '需要登入才能註冊 Passkey');
  }
  const uid = context.auth.uid;
  const origin = context.rawRequest.headers.origin;
  const rpID = new URL(origin).hostname;
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
  const uid = context.auth.uid;
  const origin = context.rawRequest.headers.origin;
  const rpID = new URL(origin).hostname;
  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const expectedChallenge = userDoc.data().currentChallenge;

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: data,
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
    }, { merge: true });
  }

  return { verified };
});

exports.generateAuthenticationOptions = functions.https.onCall(async (data, context) => {
  const { email } = data;
  const origin = context.rawRequest.headers.origin;
  const rpID = new URL(origin).hostname;
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
  const { email, credential } = data;
  const origin = context.rawRequest.headers.origin;
  const rpID = new URL(origin).hostname;
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
    });
    const token = await admin.auth().createCustomToken(userDoc.id);
    return { token };
  }
  throw new functions.https.HttpsError('unauthenticated', '驗證失敗');
});
