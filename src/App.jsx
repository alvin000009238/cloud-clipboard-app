import React, { useState, useEffect, useRef } from 'react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification,
    signOut 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject 
} from 'firebase/storage';

// --- Firebase Configuration ---
// This setup is now robust for both local development (using .env.local)
// and the execution environment.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// --- App ID Configuration ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-clipboard-app';

// --- Initialize Firebase ---
// We check if the config has placeholder values. If so, we don't initialize.
let app, auth, db, storage;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
}

// --- Icon Components ---
const CloudIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);
const MailIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const SearchIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const UploadIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const XIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const PinIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.49 2.24a.75.75 0 00-1.02-.03L5.33 5.435A2.5 2.5 0 004 7.356v3.288a2.5 2.5 0 00.94 1.921l3.24 2.43a.75.75 0 00.96-.03l4.1-4.1V7.356a2.5 2.5 0 00-1.33-.921L10.49 2.24zM10 18a.75.75 0 00.75-.75V16h-1.5v1.25A.75.75 0 0010 18z"/>
  </svg>
);
const TrashIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);
const FileIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const ImageIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const TextIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);
const CopyIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const DownloadIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const CheckIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const EyeIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);


// --- Firebase Not Configured Component ---
const FirebaseNotConfigured = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4 text-center">
        <div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">Firebase 尚未設定</h2>
            <p className="text-gray-300">
                請在專案根目錄建立一個 <code>.env.local</code> 檔案，<br />
                並填入您的 Firebase 專案金鑰。
            </p>
        </div>
    </div>
);

// --- Auth Component ---
const AuthComponent = () => {
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
  
  const getFriendlyErrorMessage = (code) => {
      switch (code) {
          case 'auth/invalid-email': return '電子郵件格式不正確。';
          case 'auth/user-not-found':
          case 'auth/wrong-password': return '電子郵件或密碼錯誤。';
          case 'auth/email-already-in-use': return '此電子郵件已被註冊。';
          case 'auth/weak-password': return '密碼強度不足，請至少設定6個字元。';
          default: return '發生未知錯誤，請稍後再試。';
      }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8"><CloudIcon className="w-16 h-16 text-blue-400 mx-auto mb-4" /><h1 className="text-3xl font-bold text-white">{isLogin ? '歡迎回來' : '建立帳號'}</h1><p className="text-gray-400 mt-2">{isLogin ? '登入以同步您的剪貼簿' : '開始您的跨裝置同步之旅'}</p></div>
          <form onSubmit={(e) => handleAuthAction(e, isLogin ? 'login' : 'register')}>
            <div className="mb-4"><label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">電子郵件</label><input className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" id="email" name="email" type="email" placeholder="you@example.com" required /></div>
            <div className="mb-6"><label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">密碼</label><input className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" id="password" name="password" type="password" placeholder="••••••••" minLength="6" required /></div>
            {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
            <button className={`w-full font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center ${isLogin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} type="submit" disabled={loading}>
              {loading && (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>)}
              {loading ? '處理中...' : (isLogin ? '登入' : '註冊')}
            </button>
          </form>
          <div className="text-center mt-6"><button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="inline-block align-baseline font-bold text-sm text-blue-400 hover:text-blue-300">{isLogin ? '還沒有帳號？ 立即註冊' : '已經有帳號了？ 返回登入'}</button></div>
        </div>
      </div>
    </div>
  );
};


// --- Email Verification Component ---
const EmailVerification = ({ user, onLogout }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const handleResendVerification = async () => { setLoading(true); setMessage(''); try { await sendEmailVerification(user); setMessage('新的驗證信已寄出，請檢查您的信箱。'); } catch (error) { setMessage('寄送失敗，請稍後再試。'); } finally { setLoading(false); } };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 px-4">
            <div className="w-full max-w-md text-center">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-lg p-8">
                    <MailIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-white mb-4">請驗證您的電子郵件</h2>
                    <p className="text-gray-400 mb-6">一封驗證郵件已寄至 <span className="font-semibold text-blue-400">{user.email}</span>。請點擊信中的連結以啟用您的帳號。</p>
                     {message && <p className="text-green-400 text-sm mb-4">{message}</p>}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={handleResendVerification} disabled={loading} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50">{loading ? '寄送中...' : '重新寄送驗證信'}</button>
                        <button onClick={onLogout} className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">登出</button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Clipboard Components ---
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
    switch(item.type) {
        case 'text': return <TextIcon className="w-6 h-6 text-blue-400" />;
        case 'image': return <ImageIcon className="w-6 h-6 text-green-400" />;
        case 'file': return <FileIcon className="w-6 h-6 text-purple-400" />;
        default: return null;
    }
  }

  return (
    <>
      {isPreviewOpen && <ImagePreviewModal imageUrl={item.downloadURL} onClose={() => setIsPreviewOpen(false)} />}
      {showDeleteConfirm && <ConfirmationModal onConfirm={() => { onDelete(item.id, item.storagePath); setShowDeleteConfirm(false); }} onCancel={() => setShowDeleteConfirm(false)} />}
      
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg flex flex-col h-full group transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/10 hover:-translate-y-1">
        <div className="p-4 flex-grow flex flex-col min-h-[120px]">
          <div className="flex items-start justify-between mb-3">
            {getIconForType()}
            <div className="flex items-center gap-2">
              <button onClick={() => onTogglePin(item.id, !item.pinned)} className={`p-2 rounded-full transition-colors ${item.pinned ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`} title={item.pinned ? "取消釘選" : "釘選"}>
                <PinIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-full bg-gray-700 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="刪除">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-grow flex items-center">
             <p className="text-gray-200 break-words text-base leading-relaxed">
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
            {item.type === 'file' && (
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

const WelcomeModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl border border-gray-700">
      <div className="p-8"><div className="flex justify-between items-center mb-6"><h2 className="text-3xl font-bold text-white">歡迎使用雲端剪貼簿！</h2><button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><XIcon className="w-7 h-7" /></button></div><p className="text-gray-400 mb-8">輕鬆幾步，開始您的跨裝置同步之旅。</p><div className="space-y-6"><div><h4 className="text-lg font-semibold text-blue-400 mb-2">新增文字</h4><p className="text-gray-300">在文字輸入框中貼上或輸入任何內容，按下 <code className="bg-gray-700 text-gray-200 px-2 py-1 rounded-md text-sm">Enter</code> 即可立即儲存。</p></div><div><h4 className="text-lg font-semibold text-blue-400 mb-2">上傳檔案</h4><p className="text-gray-300">點擊或拖曳檔案到上傳區，即可輕鬆上傳圖片、文件等。</p></div><div><h4 className="text-lg font-semibold text-blue-400 mb-2">釘選與管理</h4><p className="text-gray-300">點擊圖示將重要項目置頂，或使用圖示刪除不需要的項目。</p></div><div><h4 className="text-lg font-semibold text-blue-400 mb-2">快速搜尋</h4><p className="text-gray-300">項目太多？使用上方的搜尋框，立即找到您需要的內容。</p></div></div></div>
      <div className="bg-gray-700/50 px-8 py-4 rounded-b-2xl text-right"><button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 transform hover:scale-105">我明白了！</button></div>
    </div>
  </div>
);

const UploadProgress = ({ fileName, progress }) => (
  <div className="w-full px-4">
    <p className="text-sm text-gray-300 mb-2 truncate">{fileName}</p>
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
    </div>
    <p className="text-sm text-blue-400 text-center mt-2">{Math.round(progress)}%</p>
  </div>
);

const ClipboardApp = ({ user, onLogout }) => {
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
      querySnapshot.forEach((doc) => { itemsData.push({ id: doc.id, ...doc.data() }); });
      itemsData.sort((a, b) => { if (a.pinned !== b.pinned) return b.pinned - a.pinned; return (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0); });
      setItems(itemsData);
      setLoadingItems(false);
      if (itemsData.length === 0) { setShowWelcome(true); }
    }, (error) => { console.error("Error fetching clipboard items:", error); setLoadingItems(false); });
    return () => unsubscribe();
  }, [userId]);

  const handleAddText = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || !userId) return;
    const collectionPath = `/artifacts/${appId}/users/${userId}/clipboard`;
    try { await addDoc(collection(db, collectionPath), { type: 'text', content: textInput, pinned: false, timestamp: serverTimestamp() }); setTextInput(''); } catch (error) { console.error("Error adding text item:", error); }
  };

  const handleFileUpload = async (file) => {
    if (!file || !userId) return;
    
    // ** NEW: File size check **
    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`檔案大小超過 ${MAX_SIZE_MB}MB 的限制。`);
      setTimeout(() => setUploadError(''), 5000); // Clear error after 5 seconds
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
        // ** NEW: Update progress **
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload failed:", error);
        setUploadError('上傳失敗，請稍後再試。');
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const collectionPath = `/artifacts/${appId}/users/${userId}/clipboard`;
        await addDoc(collection(db, collectionPath), { type: file.type.startsWith('image/') ? 'image' : 'file', content: file.name, downloadURL: downloadURL, storagePath: storagePath, pinned: false, timestamp: serverTimestamp() });
        setUploading(false);
      }
    );
  };
  
  const triggerFileSelect = () => fileInputRef.current.click();
  const onFileSelected = (e) => { const file = e.target.files[0]; if (file) handleFileUpload(file); };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); };

  const handleDelete = async (id, storagePath) => {
    if (!userId) return;
    try {
      const docPath = `/artifacts/${appId}/users/${userId}/clipboard/${id}`;
      await deleteDoc(doc(db, docPath));
      if (storagePath) { const fileRef = ref(storage, storagePath); await deleteObject(fileRef); }
    } catch (error) { console.error("Error deleting item:", error); }
  };

  const handleTogglePin = async (id, newPinState) => {
    if (!userId) return;
    try { const docPath = `/artifacts/${appId}/users/${userId}/clipboard/${id}`; await updateDoc(doc(db, docPath), { pinned: newPinState }); } catch (error) { console.error("Error updating pin state:", error); }
  };

  const filteredItems = items.filter(item => item.content.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      <header className="bg-gray-800/80 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex items-center justify-between h-16"><div className="flex items-center"><CloudIcon className="h-8 w-8 text-blue-400" /><span className="text-xl font-bold ml-2 text-white">雲端剪貼簿</span></div><div className="flex items-center gap-4"><span className="text-gray-400 text-sm hidden sm:block">{user.email}</span><button onClick={onLogout} className="text-sm bg-gray-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300">登出</button></div></div></div>
      </header>
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <form onSubmit={handleAddText} className="bg-gray-800 border border-gray-700 rounded-xl p-4"><input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="貼上文字後按 Enter 新增..." className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none" /></form>
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
        <div className="relative mb-8"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-500" /></div><input type="text" placeholder="搜尋您的剪貼簿..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        {loadingItems ? (<div className="text-center py-20"><svg className="animate-spin h-10 w-10 text-blue-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>) : filteredItems.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{filteredItems.map(item => <ClipboardItem key={item.id} item={item} onDelete={handleDelete} onTogglePin={handleTogglePin} />)}</div>) : items.length > 0 ? (<div className="text-center py-20"><div className="bg-gray-800 inline-block p-6 rounded-full border border-gray-700 mb-4"><SearchIcon className="h-12 w-12 text-gray-600" /></div><h3 className="text-xl font-semibold text-white">找不到結果</h3><p className="text-gray-500 mt-2">試試看其他的關鍵字吧。</p></div>) : (<div className="text-center py-20"><div className="bg-gray-800 inline-block p-6 rounded-full border border-gray-700 mb-4"><CloudIcon className="h-12 w-12 text-gray-600" /></div><h3 className="text-xl font-semibold text-white">您的剪貼簿是空的</h3><p className="text-gray-500 mt-2">開始新增一些文字或檔案吧！</p></div>)}
      </main>
    </div>
  );
};


// --- Main App Component ---
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!app) { return <FirebaseNotConfigured />; }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setLoading(false); });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error("Error signing out: ", error); }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-gray-400">正在載入應用程式...</p>
        </div>
      );
    }
    if (!user) { return <AuthComponent />; }
    if (!user.emailVerified) { return <EmailVerification user={user} onLogout={handleLogout} />; }
    return <ClipboardApp user={user} onLogout={handleLogout} />;
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      {renderContent()}
    </div>
  );
};

export default App;
