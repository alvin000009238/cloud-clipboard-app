import React, { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { MailIcon } from '../icons';

const EmailVerification = ({ user, onLogout }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async () => {
    setLoading(true);
    setMessage('');
    try {
      await sendEmailVerification(user);
      setMessage('新的驗證信已寄出，請檢查您的信箱。');
    } catch (error) {
      setMessage('寄送失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-lg p-8">
          <MailIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">請驗證您的電子郵件</h2>
          <p className="text-gray-400 mb-6">一封驗證郵件已寄至 <span className="font-semibold text-blue-400">{user.email}</span>。請點擊信中的連結以啟用您的帳號。</p>
          {message && <p className="text-green-400 text-sm mb-4">{message}</p>}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleResendVerification} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50">
              {loading ? '寄送中...' : '重新寄送驗證信'}
            </button>
            <button onClick={onLogout} className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
              登出
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;

