☁️ 雲端剪貼簿 (Cloud Clipboard)這是一個使用 React 和 Firebase 建立的現代化雲端剪貼簿應用程式。使用者可以輕鬆地在多個裝置間同步文字、圖片和檔案，實現無縫的跨平台工作流程。(提示：您可以將您的應用程式截圖上傳到 Imgur 等圖床網站，然後替換上面的連結)✨ 主要功能跨裝置同步：在任何裝置登入，即可存取您所有的剪貼項目。多種類型支援：輕鬆新增文字、上傳圖片、影片或任何其他檔案。即時更新：所有內容透過 Firebase Firestore 進行即時同步。檔案管理：圖片預覽：點擊按鈕即可預覽圖片。檔案下載：一鍵下載您儲存的任何檔案。進度顯示：上傳大型檔案時，會顯示即時進度條。安全驗證：使用 Firebase Authentication 進行安全的電子郵件/密碼註冊和登入。釘選功能：將重要的項目釘選在最上方，方便快速存取。快速搜尋：即時篩選，迅速找到您需要的內容。🛠️ 使用的技術前端：React - 用於建立使用者介面的 JavaScript 函式庫。Vite - 新一代的前端開發與建置工具。Tailwind CSS - 一個功能優先的 CSS 框架，用於快速設計介面。後端與資料庫 (Firebase)：Firebase Authentication - 處理使用者註冊、登入和驗證。Cloud Firestore - 用於即時儲存和同步文字資料。Cloud Storage for Firebase - 用於儲存使用者上傳的檔案（圖片、影片等）。Firebase Hosting - 用於部署和託管網站。自動化部署 (CI/CD)：GitHub Actions - 自動化打包專案並部署到 Firebase Hosting。🚀 如何在本機執行如果您想在本機環境執行此專案，請依照以下步驟操作：1. 前置需求已安裝 Node.js (建議版本 v16 或以上)。擁有一個 Firebase 專案。2. 複製並安裝專案# 複製儲存庫
git clone [https://github.com/your-username/your-repository-name.git](https://github.com/your-username/your-repository-name.git)

# 進入專案資料夾
cd your-repository-name

# 安裝所有依賴套件
npm install
3. 設定 Firebase 金鑰在您的 Firebase 專案設定中，找到您的網頁應用程式設定金鑰 (firebaseConfig)。在專案的根目錄下，建立一個名為 .env.local 的檔案。將您的金鑰依照以下格式填入檔案中：VITE_FIREBASE_API_KEY="YOUR_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_APP_ID"
4. 設定 Firebase 安全規則請務必在您的 Firebase 控制台中，為 Firestore 和 Storage 設定正確的安全規則，以確保只有已登入的使用者可以存取自己的資料。5. 啟動開發伺服器npm run dev
應用程式將會在 http://localhost:5173 (或指定的埠號) 上執行。部署這個專案已設定好使用 GitHub Actions 進行自動化部署。只要有新的提交被推送到 main 分支，就會自動觸發部署流程，將最新的版本發布到 Firebase Hosting。
