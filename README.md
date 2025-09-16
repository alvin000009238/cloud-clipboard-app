# ☁️ 雲端剪貼簿 (Cloud Clipboard)
這是一個使用 React 和 Firebase 建立的雲端剪貼簿應用程式。使用者可以輕鬆地在多個裝置間同步文字、圖片和檔案，實現無縫的跨平台工作流程。

## ✨ 主要功能
* 跨裝置同步：在任何裝置登入，即可存取您所有的剪貼項目。
* 多種類型支援：輕鬆新增文字、上傳圖片、影片或任何其他檔案。
* 即時更新：所有內容透過 Firebase Firestore 進行即時同步。
* 圖片預覽：點擊按鈕即可預覽圖片。
* 檔案下載：一鍵下載您儲存的任何檔案。
* 進度顯示：上傳檔案時，會顯示即時進度條。
* 安全驗證：使用 Firebase Authentication 進行安全的電子郵件/密碼註冊和登入。
* 釘選功能：將重要的項目釘選在最上方，方便快速存取。
* 快速搜尋：即時篩選，迅速找到您需要的內容。
* 帳號設定：重設密碼、加入 Passkey 或刪除帳號。

## 🛠️ 使用的技術
### 前端：
* React - 用於建立使用者介面的 JavaScript 函式庫。
* Vite - 新一代的前端開發與建置工具。
* Tailwind CSS - 一個功能優先的 CSS 框架，用於快速設計介面。

### 後端與資料庫 (Firebase)：
* Firebase Authentication - 處理使用者註冊、登入和驗證。
* Cloud Firestore Database - 用於即時儲存和同步文字資料。
* Cloud Storage for Firebase - 用於儲存使用者上傳的檔案（圖片、影片等）。
* Firebase Hosting - 用於部署和託管網站。

### 自動化部署 (CI/CD)：
GitHub Actions - 自動化打包專案並部署到 Firebase Hosting。

## 🚀 如何在本機執行
如果您想在本機環境執行此專案，請依照以下步驟操作：
### 1. 前置需求
   * 已安裝 Node.js (建議版本 v16 或以上)。
   * 新建一個 Firebase 專案。
### 2. 複製並安裝專案

```sh
# 複製儲存庫
git clone https://github.com/alvin000009238/cloud-clipboard-app.git
```
```sh
# 進入專案資料夾
cd cloud-clipboard-app
```
```sh
# 安裝所有依賴套件
npm install
```
### 3. 設定 Firebase 金鑰
   * 在您的 Firebase 專案設定中，找到您的網頁應用程式設定金鑰 (firebaseConfig)。在專案的根目錄下，建立一個名為 `.env.local` 的檔案。將您的金鑰依照以下格式填入檔案中：
```sh
VITE_FIREBASE_API_KEY="YOUR_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_APP_ID"
```
### 4. 設定 Firebase 安全規則
   * 請務必在您的 Firebase 控制台中，為 Firestore Database 和 Storage 設定正確的安全規則，以確保只有已登入的使用者可以存取自己的資料。
```sh
// Firestore Database 規則
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
```sh
// Storage 規則
rules_version = '2';
service firebase.storage {
	match /b/{bucket}/o {
		match /artifacts/{appId}/users/{userId}/{allPaths=**} {
			allow read, write, delete: if request.auth != null && request.auth.uid == userId;
		}
	}
}
```

### 5. 啟動開發伺服器
```sh
npm run dev
```

應用程式將會在 `http://localhost:5173` 上執行。


## 🔐 設定 Passkey 與 Cloud Functions
### 1. 安裝前端套件
```sh
npm install @simplewebauthn/browser
```


### 2. 設定 Functions 與 Firebase
專案已提供完成的 Cloud Functions 實作（`functions/index.js`），包含：

* RP ID：正式站固定為 `cloud.20090408.xyz`，本機自動切換為 `localhost`。
* CORS：允許 `https://cloud.20090408.xyz` 與 `http://localhost:5173`，並啟用 `credentials`。
* Base64URL：所有 WebAuthn 欄位（credentialID、publicKey、signature…）以 Base64URL 存取 Firestore。
* 挑戰管理：註冊與登入分別儲存挑戰值，驗證成功後即時清除，避免重複使用。
* 自訂回應：統一回傳 `{ ok, code, message }` 便於前端顯示詳細錯誤。

部署前請先安裝函式依賴並設定 Firebase 專案：

```sh
npm --prefix functions install
firebase deploy --only functions
```

如需指定 Functions 區域，可在 `.env.local` 加入：

```sh
VITE_FIREBASE_FUNCTIONS_REGION="us-central1"
```

### 3. 前端呼叫流程
* 註冊：使用者點擊「加入 Passkey」→ `GET /regOptions` → `startRegistration` → `POST /regVerify`。
* 登入：按下「使用 Passkey 登入」→ `GET /authOptions?email=...` → `startAuthentication` → `POST /authVerify` → 以 `customToken` 呼叫 `signInWithCustomToken`。

前端 `fetch` 皆設定 `credentials: 'include'`，如需使用 Firebase Session Cookie 可直接延伸；所有錯誤碼會透過 UI 呈現。

### 4. 測試與驗證
1. 本機測試：以 `npm run dev` 在 `http://localhost:5173` 操作，確認 Functions 端 `rpID` 轉為 `localhost`。
2. 正式測試：於 `https://cloud.20090408.xyz` 重新註冊與登入，確認 Firestore `users/{uid}/credentials/{credId}` 寫入成功且 `authVerify` 回傳 `customToken`。
3. 若遇錯誤，可查看 Cloud Functions Logs 以確認 `origin`、`rpID` 與 `challenge` 狀態。

更多細節請參考 [SimpleWebAuthn 文件](https://simplewebauthn.dev/)。


