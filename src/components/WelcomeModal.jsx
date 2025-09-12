import React from 'react';
import { XIcon } from '../icons';

const WelcomeModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-700">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">歡迎使用雲端剪簿！</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XIcon className="w-7 h-7" />
          </button>
        </div>
        <p className="text-gray-400 mb-8">輕鬆幾步，開始您的跨裝置同步之旅。</p>
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-blue-400 mb-2">新增文字</h4>
            <p className="text-gray-300">在文字輸入框中貼上或輸入任何內容，按下 <code className="bg-gray-700 text-gray-200 px-2 py-1 rounded-md text-sm">Enter</code> 即可立即儲存。</p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-400 mb-2">上傳檔案</h4>
            <p className="text-gray-300">點擊或拖曳檔案到上傳區，即可輕鬆上傳圖片、文件等。</p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-400 mb-2">釘選與管理</h4>
            <p className="text-gray-300">點擊圖示將重要項目置頂，或使用圖示刪除不需要的項目。</p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-400 mb-2">快速搜尋</h4>
            <p className="text-gray-300">項目太多？使用上方的搜尋框，立即找到您需要的內容。</p>
          </div>
        </div>
      </div>
      <div className="bg-gray-700/50 px-8 py-4 rounded-b-2xl text-right">
        <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 transform hover:scale-105">我明白了！</button>
      </div>
    </div>
  </div>
);

export default WelcomeModal;

