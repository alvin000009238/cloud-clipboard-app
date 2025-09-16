import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signInWithCustomToken } from 'firebase/auth';
import { CloudIcon } from '../icons';
import { loginWithPasskey } from '../auth/passkey';

const AuthComponent = ({ auth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e, action) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      if (action === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const emailInput = document.getElementById('email');
      const email = emailInput ? emailInput.value : '';
      const token = await loginWithPasskey(email);
      await signInWithCustomToken(auth, token);
    } catch (err) {
      setError(err?.message || 'Passkey 登入失敗，請再試一次。');
    } finally {
      setLoading(false);
    }
  };

  const getFriendlyErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return '電子郵件格式不正確。';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return '電子郵件或密碼錯誤。';
      case 'auth/email-already-in-use':
        return '此電子郵件已被註冊。';
      case 'auth/weak-password':
        return '密碼強度不足，請至少設定6個字元。';
      default:
        return '發生未知錯誤，請稍後再試。';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <CloudIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white">{isLogin ? '歡迎回來' : '建立帳號'}</h1>
            <p className="text-gray-400 mt-2">{isLogin ? '登入以同步您的剪貼簿' : '開始您的跨裝置同步之旅'}</p>
          </div>
          <form onSubmit={(e) => handleAuthAction(e, isLogin ? 'login' : 'register')}>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">電子郵件</label>
              <input className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="mb-6">
              <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">密碼</label>
              <input className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" id="password" name="password" type="password" placeholder="••••••••" minLength="6" required />
            </div>
            {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
            <button className={`w-full font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center ${isLogin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} type="submit" disabled={loading}>
              {loading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? '處理中...' : (isLogin ? '登入' : '註冊')}
            </button>
              {isLogin && (
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  className={`w-full mt-3 bg-purple-600 hover:bg-purple-700 font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={loading}
                >
                  使用 Passkey 登入
                </button>
              )}
            </form>
            <div className="text-center mt-6">
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="inline-block align-baseline font-bold text-sm text-blue-400 hover:text-blue-300">
              {isLogin ? '還沒有帳號？ 立即註冊' : '已經有帳號了？ 返回登入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthComponent;

