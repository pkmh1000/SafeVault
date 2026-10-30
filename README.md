# SafeVault 離線安全密碼保險庫 (PWA)

SafeVault 是一款完全不依賴雲端伺服器、零網路連線、本機軍規 AES-256 加密的個人帳密保險庫。支援 PWA 規範，可直接由 GitHub Pages 託管並安裝至手機主畫面或電腦桌面。

---

## 🚀 如何部署至 GitHub Pages？

本專案已內建完整的 GitHub Actions 自動化部署腳本（位於 `.github/workflows/deploy.yml`）。

### 部署步驟：

1. **建立 GitHub 儲存庫（Repository）**：
   - 在 GitHub 上建立一個新的 Public 或 Private Repository（例如名為 `safevault`）。
   - 將本專案的所有檔案 Push 推送至該儲存庫的 `main` 分支。

2. **啟用 GitHub Pages**：
   - 前往儲存庫的 **Settings**（設定）分頁。
   - 在左側選單點選 **Pages**。
   - 在 **Build and deployment** 下方的 **Source** 下拉選單中，選擇：
     👉 **`GitHub Actions`**。

3. **自動完成部署**：
   - 推送程式碼後，GitHub Actions 會自動執行編譯並發布。
   - 數十秒後，您即可在 Pages 頁面看到發布的網址（通常為 `https://<您的帳號>.github.io/<儲存庫名稱>/`）。

---

## 📲 使用者如何由網頁安裝此 App？

由於 GitHub Pages 全程提供 **HTTPS 加密連線**，完全符合現代瀏覽器對 PWA（Progressive Web App）安裝的標準要求：

### 📱 Android 手機（Chrome / Edge 等瀏覽器）：
1. 用手機瀏覽器打開部署好的 GitHub Pages 網址。
2. 畫面底部會自動浮現 **「安裝應用程式」** 或點擊右上角選單（⋮）選擇 **「新增至主螢幕 / 安裝應用程式」**。
3. 安裝後即可在手機桌面找到 **SafeVault** 圖示，點擊即可全螢幕秒開（無網址列），**斷網/飛航模式下也能正常運作！**

### 🍏 iPhone / iPad（Safari 瀏覽器）：
1. 在 iOS Safari 中打開該 GitHub Pages 網址。
2. 點擊 Safari 底部工具列中央的 **「分享」** 圖示（方框向上箭頭）。
3. 往下滑動找到並點擊 **「加入主畫面 (Add to Home Screen)」**。
4. 點擊右上角「加入」即完成安裝。

### 💻 電腦版（Google Chrome / Microsoft Edge / Safari macOS）：
1. 在電腦瀏覽器打開網址。
2. 網址列最右側會出現一個 **電腦螢幕帶有向下箭頭的「安裝」小圖示**。
3. 點擊即可安裝至 Windows 開始功能表或 macOS 應用程式資料夾，獨立視窗秒開運作。

---

## 🔒 為什麼極致安全且能完全離線運作？

- **完全離線執行**：Service Worker 會將網頁所需的所有 JS、CSS、圖示等資源完整快取至使用者裝置本機。第一次造訪安裝後，即使拔掉網路線、關閉 Wi-Fi 或處於深山斷網環境，也能秒開使用。
- **純本地 Web Crypto API**：所有加密、解密、衍生金鑰全由使用者瀏覽器內核處理，**沒有任何數據會被傳送出去**。
- **近場 QR Code 離線同步**：跨裝置同步透過螢幕二維碼與相機光學傳輸，不經過 Wi-Fi 或任何雲端伺服器。
