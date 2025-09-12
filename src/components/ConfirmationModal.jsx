import React from 'react';

const ConfirmationModal = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm border border-gray-700 p-8 text-center">
      <h3 className="text-2xl font-bold text-white mb-2">確定刪除嗎？</h3>
      <p className="text-gray-400 mb-8">此操作無法復原。</p>
      <div className="flex justify-center gap-4">
        <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">確定</button>
        <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">取消</button>
      </div>
    </div>
  </div>
);

export default ConfirmationModal;

