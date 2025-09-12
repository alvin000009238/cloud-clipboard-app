import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { registerPasskey } from '../auth/passkey';
import ConfirmationModal from './ConfirmationModal';

const UserSettings = ({ user, onClose, onLogout }) => {
  const auth = getAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetPassword = async () => {
    setMessage('');
    setError('');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage('已寄出重設密碼的郵件。');
    } catch (e) {
      setError('寄送重設密碼郵件失敗。');
    }
  };

  const handleAddPasskey = async () => {
    setMessage('');
    setError('');
    try {
      await registerPasskey();
      setMessage('Passkey 已成功新增。');
    } catch (e) {
      setError('新增 Passkey 失敗。');
    }
  };

  const handleDeleteAccount = async () => {
    setShowConfirm(false);
    setMessage('');
    setError('');
    try {
      await deleteUser(user);
      await onLogout();
    } catch (e) {
      setError('刪除帳號失敗。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm border border-gray-700 p-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">使用者設定</h3>
        {message && <p className="text-green-400 mb-4">{message}</p>}
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="space-y-4">
          <button onClick={handleResetPassword} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">重設密碼</button>
          <button onClick={handleAddPasskey} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">加入 Passkey</button>
          <button onClick={() => setShowConfirm(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">刪除帳號</button>
          <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">關閉</button>
        </div>
      </div>
      {showConfirm && (
        <ConfirmationModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
};

export default UserSettings;

