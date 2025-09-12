import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { CloudIcon, SearchIcon, UploadIcon } from '../icons';
import UploadProgress from './UploadProgress';
import WelcomeModal from './WelcomeModal';
import ClipboardItem from './ClipboardItem';

const getFileType = (file) => {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  return 'file';
};

const ClipboardApp = ({ user, onLogout, db, storage, appId }) => {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [textInput, setTextInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;
    setLoadingItems(true);
    const collectionPath = `/artifacts/${appId}/users/${userId}/clipboard`;
    const q = query(collection(db, collectionPath));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData = [];
      querySnapshot.forEach((doc) => {
        itemsData.push({ id: doc.id, ...doc.data() });
      });
      itemsData.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned - a.pinned;
        return (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0);
      });
      setItems(itemsData);
      setLoadingItems(false);
      if (itemsData.length === 0) {
        setShowWelcome(true);
      }
    }, (error) => {
      console.error('Error fetching clipboard items:', error);
      setLoadingItems(false);
    });
    return () => unsubscribe();
  }, [userId, db, appId]);

  const handleAddText = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !userId) return;
    const collectionPath = `/artifacts/${appId}/users/${userId}/clipboard`;
    try {
      await addDoc(collection(db, collectionPath), {
        type: 'text',
        content: textInput,
        pinned: false,
        timestamp: serverTimestamp()
      });
      setTextInput('');
    } catch (error) {
      console.error('Error adding text item:', error);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !userId) return;

    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`檔案大小超過 ${MAX_SIZE_MB}MB 的限制。`);
      setTimeout(() => setUploadError(''), 5000);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadingFileName(file.name);
    setUploadError('');

    const storagePath = `/artifacts/${appId}/users/${userId}/files/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        setUploadError('上傳失敗，請稍後再試。');
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const collectionPath = `/artifacts/${appId}/users/${userId}/clipboard`;
        await addDoc(collection(db, collectionPath), {
          type: getFileType(file),
          content: file.name,
          downloadURL: downloadURL,
          storagePath: storagePath,
          pinned: false,
          timestamp: serverTimestamp()
        });
        setUploading(false);
      }
    );
  };

  const triggerFileSelect = () => fileInputRef.current.click();
  const onFileSelected = (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDelete = async (id, storagePath) => {
    if (!userId) return;
    try {
      const docPath = `/artifacts/${appId}/users/${userId}/clipboard/${id}`;
      await deleteDoc(doc(db, docPath));
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleTogglePin = async (id, newPinState) => {
    if (!userId) return;
    try {
      const docPath = `/artifacts/${appId}/users/${userId}/clipboard/${id}`;
      await updateDoc(doc(db, docPath), { pinned: newPinState });
    } catch (error) {
      console.error('Error updating pin state:', error);
    }
  };

  const filteredItems = items.filter(item => item.content.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      <header className="bg-gray-800/80 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <CloudIcon className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold ml-2 text-white">雲端剪貼簿</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm hidden sm:block">{user.email}</span>
              <button onClick={onLogout} className="text-sm bg-gray-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300">登出</button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <form onSubmit={handleAddText} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="貼上文字後按 Enter 新增..." className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none" />
          </form>
          <div onDragOver={onDragOver} onDrop={onDrop} onClick={!uploading ? triggerFileSelect : undefined} className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-xl p-6 text-center bg-gray-800/50 transition-colors ${!uploading ? 'hover:border-blue-500 hover:bg-gray-800 cursor-pointer' : ''}`}>
            <input type="file" ref={fileInputRef} onChange={onFileSelected} className="hidden" />
            {uploading ? (
              <UploadProgress fileName={uploadingFileName} progress={uploadProgress} />
            ) : (
              <>
                <UploadIcon className="w-8 h-8 text-gray-500 mb-2" />
                <p className="text-gray-400"><span className="font-semibold text-blue-400">選擇一個檔案</span> 或拖曳到此處</p>
                <p className="text-xs text-gray-500 mt-1">最大 50MB</p>
                {uploadError && <p className="text-red-400 text-sm mt-2">{uploadError}</p>}
              </>
            )}
          </div>
        </div>
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-500" />
          </div>
          <input type="text" placeholder="搜尋您的剪貼簿..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {loadingItems ? (
          <div className="text-center py-20">
            <svg className="animate-spin h-10 w-10 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <ClipboardItem key={item.id} item={item} onDelete={handleDelete} onTogglePin={handleTogglePin} />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-800 inline-block p-6 rounded-full border border-gray-700 mb-4">
              <SearchIcon className="h-12 w-12 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white">找不到結果</h3>
            <p className="text-gray-500 mt-2">試試看其他的關鍵字吧。</p>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-gray-800 inline-block p-6 rounded-full border border-gray-700 mb-4">
              <CloudIcon className="h-12 w-12 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-white">您的剪貼簿是空的</h3>
            <p className="text-gray-500 mt-2">開始新增一些文字或檔案吧！</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ClipboardApp;

