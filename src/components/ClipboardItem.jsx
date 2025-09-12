import React, { useState } from 'react';
import { PinIcon, TrashIcon, TextIcon, ImageIcon, VideoCameraIcon, FileIcon, CheckIcon, CopyIcon, DownloadIcon, EyeIcon, XIcon } from '../icons';
import ConfirmationModal from './ConfirmationModal';

const ImagePreviewModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="圖片預覽" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        <button onClick={onClose} className="absolute -top-4 -right-4 bg-gray-700 text-white rounded-full p-2 hover:bg-gray-600 transition-colors">
          <XIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const ClipboardItem = ({ item, onDelete, onTogglePin }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (contentToCopy) => {
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = item.downloadURL;
    link.setAttribute('download', item.content);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getIconForType = () => {
    switch (item.type) {
      case 'text':
        return <TextIcon className="w-6 h-6 text-blue-400" />;
      case 'image':
        return <ImageIcon className="w-6 h-6 text-green-400" />;
      case 'video':
        return <VideoCameraIcon className="w-6 h-6 text-orange-400" />;
      case 'file':
        return <FileIcon className="w-6 h-6 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <>
      {isPreviewOpen && <ImagePreviewModal imageUrl={item.downloadURL} onClose={() => setIsPreviewOpen(false)} />}
      {showDeleteConfirm && <ConfirmationModal onConfirm={() => { onDelete(item.id, item.storagePath); setShowDeleteConfirm(false); }} onCancel={() => setShowDeleteConfirm(false)} />}

      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg flex flex-col h-full group transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/10 hover:-translate-y-1">
        <div className="p-4 flex-grow flex flex-col min-h-[120px]">
          <div className="flex items-start justify-between mb-3">
            {getIconForType()}
            <div className="flex items-center gap-2">
              <button onClick={() => onTogglePin(item.id, !item.pinned)} className={`p-2 rounded-full transition-colors ${item.pinned ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`} title={item.pinned ? '取消釘選' : '釘選'}>
                <PinIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-full bg-gray-700 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="刪除">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-grow flex items-center">
            <p className="text-gray-200 break-all text-base leading-relaxed truncate">
              {item.content}
            </p>
          </div>
        </div>
        <div className="bg-gray-800/50 border-t border-gray-700 px-4 py-2 rounded-b-xl flex items-center justify-between">
          <p className="text-xs text-gray-500">{item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString() : '剛剛'}</p>
          <div className="flex items-center gap-2">
            {item.type === 'text' && (
              <button onClick={() => handleCopy(item.content)} className="p-2 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" title="複製文字">
                {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
              </button>
            )}
            {(item.type === 'file' || item.type === 'video') && (
              <button onClick={handleDownload} className="p-2 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" title="下載檔案">
                <DownloadIcon className="w-5 h-5" />
              </button>
            )}
            {item.type === 'image' && (
              <>
                <button onClick={() => setIsPreviewOpen(true)} className="p-2 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" title="預覽圖片">
                  <EyeIcon className="w-5 h-5" />
                </button>
                <button onClick={handleDownload} className="p-2 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors" title="下載圖片">
                  <DownloadIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClipboardItem;

