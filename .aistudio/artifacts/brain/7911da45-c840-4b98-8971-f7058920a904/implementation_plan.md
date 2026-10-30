# SafeVault 離線安全密碼保險庫 (PWA)

SafeVault 是一款完全不依賴伺服器或網際網路連線的離線個人帳密保險庫。透過軍規等級 AES-256-GCM 本機加密、自動超時鎖定、動態加密 QR Code 近場跨裝置同步，以及模組化自訂範本與常用字串快選系統，提供極致隱私保護與流暢的手機立式操作體驗。

## User Review & Critical Decisions

> [!IMPORTANT]
> 依據前期互動確認之偏好，本架構已確定下列核心機制，所有數據存取與加密計算 100% 於瀏覽器本機內核完成，杜絕任何遠端洩漏風險：

- **跨裝置離線同步**: 採用「動態加密 QR Code 近場雙向掃描」（搭配一次性傳輸金鑰與相機掃描，完全零聯網、免配對，即時安全同步）以及「AES 加密備份檔手動匯入/匯出」雙軌支援。
- **介面視覺風格**: 採用「現代極簡亮白風格 (Clean Minimalist High-Contrast)」，注重清晰文字排版、高對比標籤辨識度、卡片邊框微質地，並適配手機單手直向操作人體工學（44px+ 觸控目標、底層導覽列）。
- **範本與欄位擴充**: 內建 9 大實用範本（網路銀行、行動 App、廠商平台、信用卡、會員卡、電子信箱、GitHub、Google、通用帳密），支援欄位標籤自訂、「敏感內容顯示/隱藏區隔」、範本另存衍生，以及「常用個人資料快選調用庫」（地址、電話、生日、統一編號等一鍵貼入）。

---

## 1. Overview & Core Concept

- **What It Does**: 提供本機完全離線執行的密碼與敏感資料安全庫，具備漸進式網頁應用（PWA）安裝能力。從主密碼設定、AES-256 加密解密、強密碼生成、範本管理到跨裝置 QR 掃描同步，全流程無任何對外 HTTP/WebSocket 請求，所有數據僅保存在裝置的 IndexedDB / LocalStorage 密文中。
- **Target Audience / Persona**: 對數位資產隱私高度警覺的個人、工程師、商務人士與長輩，需要集中管理多種複雜帳密與證件資料，同時拒絕雲端外洩風險。
- **Key Value**: 斷網依然秒開、每次開啟強制登入、閒置自動超時防窺鎖定、帳號密碼一鍵複製自動清除剪貼簿、彈性自由的欄位範本化管理。

---

## 2. User Experience & Visual Design

### Key User Flows

1. **初始啟動與主密碼建立 (Zero-Knowledge Setup)**:
   - 首次載入展示安全歡迎引導與離線安裝說明。
   - 使用者設定主密碼（提供強度即時反饋、密碼可視切換與重要提示）。
   - 系統透過 Web Crypto API PBKDF2 生成衍生金鑰，初始化空保險庫與預設 9 大分類範本。
2. **每次開啟登入與逾時防窺鎖定 (Login & Inactivity Lock)**:
   - App 啟動或重載直接鎖定，展示乾淨高雅的解鎖輸入介面。
   - 支援自動鎖定設定（1分鐘、3分鐘、5分鐘或切換視窗立即鎖定）。
   - 連續密碼錯誤防護與解鎖重試延遲。
3. **帳密列表瀏覽、分類篩選與即時搜尋 (Search & Filter)**:
   - 手機直式頂部設有快速搜尋框，輸入關鍵字即時本機比對服務名稱、標籤與備註。
   - 分類滑動標籤切換（全部、網銀、社群、工作、購物、信用卡等）。
   - 列表以高對比卡片呈現：第一行清楚展示帳號與一鍵複製按鈕，第二行展示密碼遮罩（`••••••••`）與解碼切換/快速複製按鈕。
4. **帳密編輯與範本調用 (Card Editor & Dynamic Templates)**:
   - 建立新紀錄時可選擇「使用範本」或「空白建立」。
   - 固定首二行：第一行「帳號: ________」、第二行「密碼: ________」。
   - 點擊「+ 添加欄位」：可自行命名抬頭標籤（如卡號、過期日、安全碼、登入網址、安全提示問答、備註等）。
   - 隱私區隔開關：可勾選該欄位是否為「敏感隱蔽欄位」（未點擊眼球圖示前以掩碼保護）。
   - 常用身份資料調用（Personal Snippets）：點選「調用常用字串」選單，即時將已存的個人地址、電話、生日或統編填入目標欄位。
   - 「另存為新範本」：可將當前精心設定的欄位架構一鍵存成新自訂範本，供日後直接調用。
5. **隨機強密碼產生器 (Password Generator)**:
   - 彈出式/獨立工具面板：可滑動設定長度（8-64 字元），勾選大寫、小寫、數字、特殊符號、排除易混淆字元（如 O/0, l/1）。
   - 即時密碼強度分析計量表與一鍵套用至正在編輯的欄位。
6. **動態加密 QR Code 跨裝置無網同步 (Air-Gapped QR Sync)**:
   - 傳輸端（如手機）：選擇「同步至其他裝置」，輸入或生成 6 位數短暫對接驗證碼，系統將保險庫加密封包編碼為動態 QR Code。
   - 接收端（如桌機/iPad）：開啟相機掃描 QR Code，輸入相同的驗證碼確認授權，完成本機解密與合併同步，過程完全不經過任何網路。
   - 額外支援：下載/匯入加密 `.vault` 檔案，支援透過隨身碟或有線連接傳輸。

### Visual Identity & Theme (現代極簡亮白風格)

- **Aesthetic Direction**: 專業醫療/金融等級的高對比現代極簡亮白（Clean Modern Slate & Crisp White）。無雜亂漸層或科技感廉價光暈，強調極致字體可讀性、邊框輕盈微陰影與手勢靈敏度。
- **Color Palette**:
  - 主畫布背景 (`--bg-canvas`): `#F8FAFC` (Slate-50)
  - 卡片與工作區 (`--bg-surface`): `#FFFFFF` (純白)
  - 邊框與分隔線 (`--border-subtle`): `#E2E8F0` (Slate-200)
  - 主要文字 (`--text-primary`): `#0F172A` (Slate-900，深沉墨黑)
  - 次要文字 (`--text-secondary`): `#64748B` (Slate-500)
  - 信任安全主色 (`--primary`): `#0284C7` (Sky-600) 與 `#0D9488` (Teal-600)
  - 安全鎖定/防護色 (`--shield`): `#10B981` (Emerald-600)
  - 警戒與刪除 (`--danger`): `#EF4444` (Rose-500)
- **Typography & Scale**:
  - 標題與品牌：Plus Jakarta Sans / Inter 幾何無襯線體，搭配清晰中文字形。
  - 數值、帳號與密碼顯示：Tabular Numerals (`font-mono tracking-wider tabular-nums`)，避免字符寬度跳動。
- **Component Styling & Layout**:
  - 符合 Mobile Thumb-Zone：底部常駐 4 大頁籤（保險庫、範本庫、常用資料、工具與設定），所有按鈕觸控區域皆 $\ge 44\text{px}$。
  - 複製按鈕點擊後提供微震動（Haptic API 支援時）與綠色打勾動畫提示，並啟動 30 秒倒數計時清除機制。

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: 完全本機 Web Crypto API (AES-GCM 256 + PBKDF2) vs. 雲端後端儲存**
  - *Chosen Approach*: 所有加密與解密均由瀏覽器標準內建的 `crypto.subtle` 在用戶端即時處理。資料庫儲存在用戶本機 IndexedDB 中。
  - *Why*: 徹底杜絕伺服器被駭、資料外洩或服務端偷看的疑慮；離線即可百分之百正常運作。
  - *Alternatives Considered*: Firebase / CloudSQL — 雖便於雲端同步，但違背使用者「完全不連線、所有資料都在本機、不透過網路」的核心隱私訴求。
- **Decision 2: 跨裝置同步採用「動態加密 QR Code」+「加密檔案手動傳輸」**
  - *Chosen Approach*: 透過相機直接掃描高密度加密 QR Code（若數據較大則支援動態翻頁 QR 傳輸），並具備 6 位數短碼授權驗證；同時提供 AES 加密 `.vault` 檔供有線隨身碟傳輸。
  - *Why*: Web 標準目前在手機瀏覽器端不允許網頁扮演藍牙周邊伺服設備（無法雙向 Web Bluetooth 虛擬配對），且瀏覽器無法直接存取 USB 裝置；QR 碼完全不需要 Wi-Fi 或網際網路，以純光學通道傳輸加密密文，是離線環境下最直覺、最安全的無網近場傳輸。
- **Decision 3: 帳密項目結構採用「固定雙行 + 靈活延伸鍵值 + 敏感區隔」**
  - *Chosen Approach*: 強制規範第一行為「帳號」、第二行為「密碼」，後續可自由新增任意名稱標籤，並能獨立標記為「隱藏區」或「一般區」。
  - *Why*: 符合使用者開箱即用的習慣，同時保留記錄如信用卡 CVV、銀行代碼、兩步驟復原碼（Recovery Codes）等專案的多樣彈性。

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│               SafeVault Web App (PWA - Fully Offline)                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │ App Lock Screen     │   │ Main Navigation (Bottom Tab Bar)     │   │
│   │ • Master Password   │   │ [Vault] [Templates] [Snippets] [More]│   │
│   │ • Auto-Timeout Watch│   └──────────────────────────────────────┘   │
│   └──────────┬──────────┘                                              │
│              │ Derives Key (PBKDF2 100,000 iter + Salt)                │
│              ▼                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Security Kernel (Web Crypto API - Hardware Accelerated)         │   │
│   │ • AES-GCM 256-bit Encryption / Decryption                      │   │
│   │ • In-Memory Session Key (Zero-Persistence, Auto Purge)         │   │
│   │ • Secure Password Generator & Strength Entropy Calculator      │   │
│   └──────────┬─────────────────────────────────────┬───────────────┘   │
│              │                                     │                   │
│              ▼                                     ▼                   │
│   ┌──────────────────────┐             ┌───────────────────────────┐   │
│   │ Data Store Manager   │             │ Cross-Device Air-Gap Sync │   │
│   │ • Vault Items Store  │             │ • Encrypted QR Generator  │   │
│   │ • Template Registry  │             │ • Camera QR Scanner       │   │
│   │ • Identity Snippets  │             │ • 6-Digit Auth Handshake  │   │
│   │ (IndexedDB Cipher)   │             │ • .vault File Export/Import│  │
│   └──────────────────────┘             └───────────────────────────┘   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Schema (TypeScript Interfaces)

```typescript
// 保險庫項目定義
interface VaultItem {
  id: string;
  title: string;                 // 項目名稱 (例如: 玉山網路銀行, Google 帳號)
  category: string;              // 分類 (網銀, 社群, 信用卡, 郵件...)
  account: string;               // 第一行: 帳號
  password: string;              // 第二行: 密碼
  fields: CustomField[];         // 後續動態添加標籤欄位
  templateId?: string;           // 所屬範本 ID (若有)
  notes?: string;                // 額外備註
  updatedAt: number;             // 更新時間戳
  createdAt: number;
}

// 動態欄位結構 (支援顯示/不顯示區隔)
interface CustomField {
  id: string;
  label: string;                 // 欄位抬頭 (例如: 信用卡到期日, 統編, API Key)
  value: string;                 // 內容值
  isSensitive: boolean;          // true = 隱私遮罩區 (預設隱藏), false = 一般顯示區
}

// 範本定義 (可被調用並衍生出新範本)
interface VaultTemplate {
  id: string;
  name: string;                  // 範本名稱 (例如: 信用卡標準範本, GitHub Token 範本)
  category: string;
  icon: string;
  defaultFields: {
    label: string;
    isSensitive: boolean;
    defaultValue?: string;
  }[];
  isBuiltIn: boolean;            // 是否為內建或自訂
}

// 常用身份字串庫 (可隨時調用填入欄位)
interface IdentitySnippet {
  id: string;
  title: string;                 // 例如: 戶籍地址, 常用手機, 出生年月日, 身分證字號
  value: string;
  category: 'address' | 'phone' | 'birthday' | 'id_card' | 'custom';
}

// 本機加密資料包裹結構
interface EncryptedVaultContainer {
  version: number;
  salt: string;                  // PBKDF2 Salt (Hex)
  iv: string;                    // AES-GCM IV (Hex)
  ciphertext: string;            // AES 加密後的 JSON 字串 (Base64)
  lastSyncedAt: number;
}
```

### Component & View Mapping

- `src/components/LockScreen.tsx`: 主密碼解鎖介面、密碼錯誤震動、首次建立主密碼引導。
- `src/components/VaultList.tsx`: 帳密卡片瀑布流、頂部快速搜尋、分類快速滑動按鈕、浮動新增按鈕。
- `src/components/VaultDetailModal.tsx`: 檢視與單鍵複製、顯示/隱藏切換、遮罩管理、編輯與刪除。
- `src/components/VaultEditorModal.tsx`: 帳密新增/編輯面板、固定第一二行、添加自訂標籤、「調用常用字串庫」按鈕、「另存為新範本」功能。
- `src/components/TemplateManager.tsx`: 9 大內建範本檢視、自訂範本編輯、從既有範本複製衍生新範本。
- `src/components/SnippetManager.tsx`: 常用字串庫維護（地址、電話、生日等），支援快速複製或於編輯中即刻填入。
- `src/components/PasswordGenerator.tsx`: 強密碼配置面板（長度、字符群組、強度評估指標）。
- `src/components/CrossDeviceSyncModal.tsx`: 離線 QR Code 產生器、QR 掃描器對接視窗、6 位認證碼授權確認、.vault 備份檔案匯出與還原。
- `src/components/PWAInstallBanner.tsx`: 符合 PWA 規範的離線安裝導引用戶端元件（Chromium 與 iOS 指引）。
- `src/services/cryptoService.ts`: Web Crypto API 加密核心，提供 AES-256-GCM、PBKDF2、Secure Random、SHA-256。
- `src/services/storageService.ts`: 本機 IndexedDB / LocalStorage 存取抽象層。

---

## 5. Verification Plan

1. **安全性驗證 (Security Check)**:
   - 驗證密文儲存：檢查 LocalStorage / IndexedDB 中所有帳號密碼皆為 AES-256-GCM 密文，未登入前無任何明文存留。
   - 驗證剪貼簿防護：複製密碼後測試 30 秒自動清空機制。
   - 驗證自動鎖定：測試閒置 1 分鐘或切換視窗時自動觸發上鎖。
2. **範本與資料調用驗證 (Template & Snippet Check)**:
   - 測試內建 9 大範本（網銀、信用卡、GitHub 等）順暢載入。
   - 測試首二行固定為「帳號」、「密碼」，後續可自由新增標籤。
   - 測試「常用資料字串調用」將地址、電話或生日快速填入自訂欄位。
   - 測試「另存為新範本」與範本再衍生功能。
   - 測試「顯示區」與「不顯示遮罩區」的切換。
3. **離線跨裝置同步驗證 (Sync Check)**:
   - 測試動態加密 QR Code 產生與相機掃描還原。
   - 測試 6 位數配對認證確認機制。
   - 測試 `.vault` 加密檔案的匯出、下載與跨裝置檔案匯入。
4. **離線安裝與編譯驗證 (PWA & Build Check)**:
   - 測試 Service Worker 快取，斷網重載驗證應用依舊秒開正常運作。
   - 執行 `compile_applet` 確認 TypeScript 與 Vite 打包零錯誤。
