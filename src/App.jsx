import React, { useState, useEffect } from 'react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Component Imports
import AuthComponent from './components/AuthComponent';
import EmailVerification from './components/EmailVerification';
import ClipboardApp from './components/ClipboardApp';

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

// --- Main App Component ---
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!app) {
    return <FirebaseNotConfigured />;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <svg className="animate-spin h-10 w-10 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-400">正在載入應用程式...</p>
        </div>
      );
    }
    if (!user) {
      return <AuthComponent auth={auth} />;
    }
    if (!user.emailVerified) {
      return <EmailVerification user={user} onLogout={handleLogout} />;
    }
    return <ClipboardApp user={user} onLogout={handleLogout} db={db} storage={storage} appId={appId} />;
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      {renderContent()}
    </div>
  );
};

export default App;

