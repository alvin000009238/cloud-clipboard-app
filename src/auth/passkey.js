import { getFunctions, httpsCallable } from 'firebase/functions';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Register a new passkey for the current user.
 * Assumes the user is already authenticated with Firebase Auth.
 */
export async function registerPasskey() {
  const functions = getFunctions();
  const createOptions = httpsCallable(functions, 'generateRegistrationOptions');
  const verifyRegistration = httpsCallable(functions, 'verifyRegistration');

  // Obtain registration options (challenge) from server
  const { data: options } = await createOptions();

  // Use WebAuthn API to create credential
  const attestation = await startRegistration(options);

  // Send credential to server for verification and storage
  const { data } = await verifyRegistration(attestation);
  if (!data || !data.verified) {
    throw new Error('Passkey registration failed');
  }
  return data;
}

/**
 * Login using a passkey. Returns a Firebase custom token on success.
 * @param {string} email - Email used to look up user credentials
 */
export async function loginWithPasskey(email) {
  const functions = getFunctions();
  const createOptions = httpsCallable(functions, 'generateAuthenticationOptions');
  const verifyAuthentication = httpsCallable(functions, 'verifyAuthentication');

  // Ask server for authentication options for the user
  const { data } = await createOptions({ email });
  const { options } = data;

  // Request credential from authenticator
  const assertion = await startAuthentication(options);

  // Verify with server, which returns a Firebase custom token
  const verification = await verifyAuthentication({ email, credential: assertion });
  const { token } = verification.data;
  if (!token) {
    throw new Error('Passkey authentication failed');
  }
  return token;
}
