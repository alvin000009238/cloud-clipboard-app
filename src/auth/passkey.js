import { getAuth } from 'firebase/auth';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

const DEFAULT_REGION = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

function getFunctionsBaseUrl() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('缺少 Firebase Project ID 設定。');
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `http://localhost:5001/${projectId}/${DEFAULT_REGION}`;
  }

  return `https://${DEFAULT_REGION}-${projectId}.cloudfunctions.net`;
}

async function fetchJson(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    // ignore JSON parse errors; handled below
  }

  if (!response.ok || (payload && payload.ok === false)) {
    const error = new Error(payload?.message || '請求失敗，請稍後再試。');
    if (payload?.code) {
      error.code = payload.code;
    }
    throw error;
  }

  return payload;
}

/**
 * Register a new passkey for the current user.
 */
export async function registerPasskey() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('請先登入後再新增 Passkey。');
  }

  const baseUrl = getFunctionsBaseUrl();
  const idToken = await user.getIdToken();

  const { options } = await fetchJson(`${baseUrl}/regOptions`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  const attestation = await startRegistration(options);

  await fetchJson(`${baseUrl}/regVerify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ credential: attestation }),
  });

  return true;
}

/**
 * Login using a passkey. Returns a Firebase custom token on success.
 * @param {string} email - Email used to look up user credentials
 */
export async function loginWithPasskey(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('請輸入電子郵件後再使用 Passkey 登入。');
  }

  const baseUrl = getFunctionsBaseUrl();
  const query = new URLSearchParams({ email: normalizedEmail });

  const { options } = await fetchJson(`${baseUrl}/authOptions?${query.toString()}`, {
    method: 'GET',
  });

  const assertion = await startAuthentication(options);

  const { customToken } = await fetchJson(`${baseUrl}/authVerify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: normalizedEmail, credential: assertion }),
  });

  if (!customToken) {
    throw new Error('Passkey 驗證失敗，請再試一次。');
  }

  return customToken;
}
