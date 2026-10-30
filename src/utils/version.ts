export interface VersionRelease {
  version: string;
  isBeta?: boolean;
  releaseDate: string;
  title: string;
  highlights: string[];
  securityNote?: string;
}

export const CURRENT_APP_VERSION = 'v0.9.9-beta';
export const IS_CURRENT_BETA = true;
export const TARGET_STABLE_VERSION = 'v1.0.0 (預定正式發布版)';

export const APP_CHANGELOG: VersionRelease[] = [
  {
    version: 'v0.9.9-beta',
    isBeta: true,
    releaseDate: '2026-10-30',
    title: '近場同步單幀秒掃優化 · 更新設定中心專責化 · Beta 進版',
    highlights: [
      '近場同步單幀秒掃：1~5 筆資料全面採用單幀靜態高密度 QR 碼，鏡頭秒掃即時 100% 接收，杜絕 1/2、1/4 多幀混淆與 50% 滯留問題。',
      '動態光學影格優化：大量資料傳輸提升單幀容納上限至 1200 字元，輪播間隔調整為 550ms，大幅提升手機鏡頭對焦成功率。',
      '更新設定中心專責化：移除全域擾人更新通知橫幅與頂部更新按鍵，所有版本檢查、更新記錄與立即更新均收斂至「設定」模組。',
      '登入頁簡約安全：登入鎖定畫面僅保留簡潔純文字版本號標示，移除多餘彈窗與按鈕，進一步強化防誤觸體驗。',
      '資料絕對不滅保證：所有版本升級與快取更新 100% 完全隔離於本機 AES-256 加密資料庫，無痛安全升級。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.8-beta',
    isBeta: true,
    releaseDate: '2026-10-30',
    title: '登入防誤觸安全重構 · 更新自主決策提醒 · Beta 測試版發布',
    highlights: [
      '手機防誤觸防禦：徹底隔離「銷毀重設資料庫」與「忘記密碼」，移出拇指熱區，徹底解決指紋解鎖誤觸問題。',
      '版本更新自主決策：新增版本更新提醒機制，提供「查看更新記錄」與「立即更新」按鈕，使用者可先審閱記錄再決定是否更新。',
      '進版安全保證：網頁升級與 PWA 快取更新，保證 100% 絕不更動、覆蓋或清除本地已儲存的任何帳密與範本資料。',
      '極致 QR 封包加速：剔除冗餘內建範本，0.05 秒內完成動態同步碼加密生成，並附帶鏡頭光學容量警示指引。',
      '版本號標定：目前標定為 Beta 測試版（v0.9.8-beta），待多端驗證完備後正式推進至 v1.0.0 正式版。',
    ],
    securityNote: '進版絕不影響本地資料：AES-256 加密資料庫完全隔離於程式碼更新之外，升級過程無痛且零資料風險。',
  },
  {
    version: 'v0.9.5-beta',
    isBeta: true,
    releaseDate: '2026-10-29',
    title: '範本管理無損防護 · 常用資料自由自訂 · 跨裝置多選同步',
    highlights: [
      '常用個人資料自訂：分類支援自由輸入標籤名稱，新增「全刪除」按鍵與編輯視窗自動聚焦。',
      '範本安全防護：保證刪除範本不影響已建帳密單元，並支援直接由單元格式「一鍵生成新範本」與防重複偵測。',
      '跨裝置多選傳輸：支援多選、全選、取消全選、即時篩選搜尋與接收端協定嚴格核對。',
      'App 跨裝置分享：支援原生 Web Share 與網址一鍵複製。',
    ],
  },
  {
    version: 'v0.9.0-beta',
    isBeta: true,
    releaseDate: '2026-10-28',
    title: '生物辨識 Touch ID / Face ID 快速解鎖與 Email 離線救援',
    highlights: [
      '生物辨識綁定：支援瀏覽器 WebAuthn 指紋與 FaceID 秒開解鎖。',
      'Email 離線緊急救援：提供 16 碼緊急救援金鑰，防範忘記主密碼。',
      '智慧逾時防窺鎖定：逾時上鎖後記憶最後工作畫面，解鎖後自動回到原位置。',
      '內建軍規 AES-256-GCM 本機加密引擎與密碼強度分析工具。',
    ],
  },
  {
    version: 'v1.0.0 (預定正式版)',
    isBeta: false,
    releaseDate: '規劃推進中',
    title: 'SafeVault 官方正式版 (Release Candidate)',
    highlights: [
      '全功能正式發布版，通過全平台（iOS、Android、Windows、macOS）PWA 離線驗證。',
      '完備的跨裝置動態 QR Code 光學離線差分同步與衝突決策保護。',
      '離線零伺服器極致架構認證。',
    ],
  },
];
