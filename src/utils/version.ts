export interface VersionRelease {
  version: string;
  isBeta?: boolean;
  releaseDate: string;
  title: string;
  highlights: string[];
  securityNote?: string;
}

export const CURRENT_APP_VERSION = 'v0.9.22-beta';
export const IS_CURRENT_BETA = true;
export const TARGET_STABLE_VERSION = 'v1.0.0 (預定正式發布版)';

export interface ServerVersionInfo {
  version: string;
  isBeta?: boolean;
  releaseDate: string;
  title: string;
  highlights: string[];
  securityNote?: string;
  buildTime?: number;
}

/**
 * 解析版本號 (如 v0.9.17-beta -> { major: 0, minor: 9, patch: 17, isBeta: true })
 */
export function parseVersionParts(vStr: string): { major: number; minor: number; patch: number; isBeta: boolean } {
  const clean = vStr.trim().toLowerCase().replace(/^v/, '');
  const isBeta = clean.includes('beta');
  const numericPart = clean.split('-')[0] || '';
  const parts = numericPart.split('.').map(n => parseInt(n, 10) || 0);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    isBeta,
  };
}

/**
 * 比較兩版本號，如果 v1 比 v2 新返回 > 0，相等返回 0，較舊返回 < 0
 */
export function compareVersions(v1: string, v2: string): number {
  const p1 = parseVersionParts(v1);
  const p2 = parseVersionParts(v2);

  if (p1.major !== p2.major) return p1.major - p2.major;
  if (p1.minor !== p2.minor) return p1.minor - p2.minor;
  if (p1.patch !== p2.patch) return p1.patch - p2.patch;

  // 如果數字相同，正式版 (非 beta) 比 beta 新
  if (p1.isBeta && !p2.isBeta) return -1;
  if (!p1.isBeta && p2.isBeta) return 1;

  return 0;
}

/**
 * 遠端即時檢查伺服器最新發布版本 (以 no-store 與 timestamp 徹底破除快取)
 */
export async function fetchRemoteVersionInfo(): Promise<{
  hasUpdate: boolean;
  serverVersion: string;
  currentVersion: string;
  releaseInfo?: ServerVersionInfo;
  error?: string;
}> {
  try {
    const res = await fetch(`./version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!res.ok) {
      throw new Error(`伺服器回應狀態碼: ${res.status}`);
    }

    const data: ServerVersionInfo = await res.json();
    const serverVer = data.version?.trim();
    if (!serverVer) {
      throw new Error('伺服器回傳版本資訊格式不全');
    }

    const isNewer = compareVersions(serverVer, CURRENT_APP_VERSION) > 0;
    return {
      hasUpdate: isNewer,
      serverVersion: serverVer,
      currentVersion: CURRENT_APP_VERSION,
      releaseInfo: data,
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      serverVersion: CURRENT_APP_VERSION,
      currentVersion: CURRENT_APP_VERSION,
      error: err?.message || '連線檢查逾時',
    };
  }
}

export const APP_CHANGELOG: VersionRelease[] = [
  {
    version: 'v0.9.22-beta',
    isBeta: true,
    releaseDate: '2026-11-03',
    title: '全面資安架構加固 · 記憶體擦除 (RAM Scrubbing) · 鎖定即時抹除剪貼簿 · 30萬次 PBKDF2 · 脫敏 CSV 備份',
    highlights: [
      '記憶體敏感資料即時擦除 (RAM Scrubbing on Lock)：手動鎖定、閒置超時或切換視窗鎖定時，強制銷毀所有 React State 與解密明文資料陣列，將記憶體結構歸零，杜絕記憶體傾印 (Memory Dump) 洩漏風險。',
      '保險庫鎖定即刻清空剪貼簿 (Instant Clipboard Wipe)：鎖定時無條件即時抹除系統剪貼簿中的明文密碼，徹底縮短剪貼簿暴露時間窗口。',
      'Web Crypto 金鑰衍生強度全面升級至 300,000 次 PBKDF2：雜湊迭代次數由 10 萬次提升至 30 萬次（符合最新 OWASP 規範），並具備 100% 舊版相容性，既有保險庫平滑升級無痛過渡。',
      'CSV 深度試算表公式注入防禦 (OWASP Deep Formula Injection)：自動對 =, +, -, @, \\t, \\r, |, % 開頭之文字欄位進行跳脫，全面防堵試算表巨集與跨應用惡意指令執行。',
      '新增「脫敏防窺安全備份模式」：匯出 CSV 時可勾選以遮罩隱藏密碼與敏感資料（替換為 ••••••••••••），便於離線資產盤點或在非完全安全環境下建檔。',
      '主密碼強制最小熵值驗證與登入失敗防暴力破解延遲 (600ms)：防止使用者設定易被猜測之弱密碼，並於解鎖驗證失敗時加入延遲，大幅阻斷自動化窮舉攻擊。',
      '安全標頭與 HTTP/HTML 防禦：新增 no-referrer、nosniff 與嚴格 Permissions-Policy 等安全標頭防護。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.21-beta',
    isBeta: true,
    releaseDate: '2026-11-03',
    title: '內建完整操作使用手冊與離線查閱 · 首頁頂部快捷鍵 · 與 README 規範同步',
    highlights: [
      '應用程式內建完整操作手冊（與本專案 README 保持常態同步）：收錄 PWA 安裝、樹狀階層目錄、自訂隱蔽欄位、編輯復原、光學近場同步、CSV 備份與常見問答。',
      '頂部導覽列與設定頁面雙向入口：點擊頂部【說明手冊】或在設定模組中皆能一秒開啟手冊。',
      '即時關鍵字搜尋與分類過濾：支援搜尋「備份」、「同步」、「復原」、「CSV」、「快捷鍵」、「FAQ」等關鍵字即時高亮過濾，並附帶一鍵全部展開/收合。',
      '本地離線可查：說明手冊完全打包於前端代碼中，在飛航模式或無網路環境下皆能秒速開啟閱讀。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.20-beta',
    isBeta: true,
    releaseDate: '2026-11-03',
    title: '設定模組新增匯出帳密備份 (CSV) · UTF-8 BOM 萬國碼防亂碼 · 明文安全防護提醒',
    highlights: [
      '設定模組新增『匯出帳密備份』功能：支援將保險庫中解密後的全部帳號、密碼、分類、備註與自訂欄位完整匯出為標準 CSV 試算表檔案，大幅增加外部冷儲存與手動備份的靈活性。',
      '繁體中文 UTF-8 BOM 萬國碼相容：匯出檔案開頭內嵌標準 UTF-8 BOM 標記，在 Microsoft Excel (Windows/Mac) 及 Google Sheets 開啟皆能完美呈現繁體中文字元，徹底杜絕亂碼。',
      'RFC 4180 標準轉義與防公式注入：嚴格遵循 CSV 逗號、雙引號與換行跳脫規範，並內建試算表公式注入防禦 (Formula Injection Protection)，防範帳密內容誤觸試算表巨集或運算。',
      '高敏明文防手滑警示確認窗：提供專屬安全風險告知彈窗，清晰標記即將匯出的單元數量與自訂欄位，並支援自由勾選是否包含最近刪除回收站單元。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.19-beta',
    isBeta: true,
    releaseDate: '2026-11-03',
    title: '常用資料敏感遮罩保護 · 防窺小眼睛解鎖 · 快速調用安全帶入',
    highlights: [
      '常用資料（字串）敏感遮罩開關：新增/編輯常用字串時，可自由啟用「敏感資料遮罩保護」（特別適合身分證號、門禁密碼、銀行帳戶、卡號、個人私密資訊）。',
      '預設星號隱蔽與眼睛解鎖：在樹狀目錄與單元明細中，敏感字串預設以星號 (••••••••••••) 防窺呈現，並附帶專屬「隱蔽」徽章；點擊眼睛圖示即可隨時解鎖檢視或再次隱蔽。',
      '調用常用字串防窺相容：在帳密編輯器調用常用字串時，敏感資料同樣支援防窺遮罩與即時查看，帶入新欄位時自動繼承敏感防護設定。',
      '安全複製機制不變：無論字串處於遮罩或展開狀態，點擊複製皆完整拷貝真實文字，並附帶剪貼簿智慧自動清除防護。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.18-beta',
    isBeta: true,
    releaseDate: '2026-11-02',
    title: '常用字串自訂標籤即時回顯分類區 · 主畫面橫向分類選單 · 智慧分類繼承',
    highlights: [
      '常用字串自訂標籤即時回顯分類區：自訂分類標籤儲存後，立即自動聚合於編輯視窗之「自訂標籤區」，以獨立標籤按鈕醒目呈現，點選即可秒速套用，徹底免去每次手動打字。',
      '主畫面橫向分類選單（對齊保險庫）：常用字串庫主頁頂部新增滑動式分類標籤列（包含全部、各標準分類及所有已自訂之標籤），一鍵點選即可快速篩選指定分類目錄。',
      '智慧分類繼承：在任一特定分類分頁（如「護照台胞」）點選「新增字串」時，編輯視窗自動預先選取並繼承該分類標籤。',
      '自訂標籤樹枝目錄美化：樹狀階層目錄中，自訂分類資料夾附帶專屬「自訂」徽章與深天藍色彩標示，資訊階層一目了然。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.17-beta',
    isBeta: true,
    releaseDate: '2026-11-02',
    title: '伺服器無快取真即時版本偵測 · 智慧更新按鍵判定 · 強制快取清除機制',
    highlights: [
      '伺服器無快取即時版本偵測：淘汰原本純依賴 Service Worker 佇列之假定，改採即時伺服器端點 (version.json + no-store)，確保點擊檢查更新時 100% 精準探測伺服器是否有新版本可供更新。',
      '智慧更新按鍵判定（已是最新版本不提供更新鍵）：精確區分「有新版待更新」與「已是最新版本」。當偵測到伺服器有新版本時，醒目顯示【發現新版待更新】並提供【立即更新至新版】按鍵；已是最新版本時，自動隱藏/不提供更新鍵，徹底遵循使用者要求。',
      '強制快取徹底更新 (Hard Cache Busting)：點擊立即更新時，智慧調用 Cache API 清除本機舊版檔案快取，並以時間戳參數強制重新載入最新前端檔案，確保新版程式碼立即生效。',
      '進版安全承諾：所有更新過程完全隔離於本地 AES-256 加密資料庫，升級絕不影響已存之帳密與範本。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.16-beta',
    isBeta: true,
    releaseDate: '2026-11-02',
    title: '範本與常用資料全樹枝階層目錄 · 點選單元展開明細 · 全局一鍵展開/收合',
    highlights: [
      '範本庫樹枝階層目錄 (分類 ➔ 範本名稱)：全面對齊保險庫架構，各範本依分類資料夾階層收合，垂直樹枝引導線搭配分支接頭，版面俐落清晰。',
      '範本單元點擊開啟：預設以緊湊單行名稱列展示（範本名稱、欄位數量、預置/自訂標籤），點選單元立即流暢展開完整欄位架構、備註與快速套用按鍵。',
      '常用資料庫樹枝階層化：依資料類型（電話、通訊地址、生日、身分證、統編、信箱、自訂）歸類為樹枝目錄，大幅提升大量字串的檢索與視覺分類。',
      '常用資料單元點選展開：預設為簡短名稱與單行預覽列，點擊開啟單元可檢視高辨識大字體等寬區塊，支援一鍵完整複製與即時編輯。',
      '範本與常用資料雙向全局控制：兩大管理模組頂部同步新增【全部展開】與【全部收合】快速按鍵，並內建即時關鍵字穿透搜尋。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.15-beta',
    isBeta: true,
    releaseDate: '2026-11-02',
    title: '編輯器 n 步回復與重作 · 單元刪除專屬安全提醒 · 8秒即時救回與最近刪除回收站',
    highlights: [
      '編輯器 n 步回復 (Undo) 與重作 (Redo)：編輯帳密時支援高達 50 步歷史軌跡，提供編輯器頂部【回復 (↩)】、【重作 (↪)】操作鈕與鍵盤快速鍵（Ctrl+Z / Cmd+Z、Ctrl+Y / Cmd+Shift+Z），誤刪欄位、誤改密碼或錯貼文字隨時一鍵還原。',
      '一鍵還原初始狀態：編輯過程中若大幅改動想重來，可點擊【還原開啟前狀態】，秒速恢復為開啟編輯器當下的原始資料。',
      '防誤關保護警示：編輯中若有未儲存的異動，關閉編輯器時主動跳出安全確認提醒，防止手滑誤觸背景遮罩遺失內容。',
      '單元刪除專屬安全提醒：全面改為精緻防手滑安全確認視窗，清晰列出單元名稱、所屬分類與欄位數量，淘汰生硬確認框。',
      '8 秒底部即時救回 Toast (Undo)：單元刪除後於畫面底部懸浮 8 秒互動提示，提供醒目【↩ 立即救回】按鍵，秒速撤銷刪除。',
      '最近刪除回收站（支援密碼檢視與一鍵還原）：所有已刪單元皆以軍規 AES-256 加密保存於回收站，隨時可檢視被刪密碼、個別還原或全部還原，密碼記憶不易再也無須擔心誤刪！',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.14-beta',
    isBeta: true,
    releaseDate: '2026-11-01',
    title: '光學全視野無畸變解碼 · 徹底修復框內感應問題 · 取景框黃金比例優化',
    highlights: [
      '徹底修復「QR Code 在框內無法讀取、需拉近超出外框 10~20% 才能動作」問題：查修確認先前相機視頻強制設為 1:1，導致 html5-qrcode 內部以非等比比例裁切，畫布產生高達 44% 垂直壓扁畸變，使 QR 碼定位角幾何失效；現已解除強制壓縮，恢復原生等比畫面。',
      '全視野無畸變即時解碼：移除強制小區域截切（qrbox），ZXing 與原生 BarcodeDetector 在全取景視野內無損運作，QR Code 位於框內任意位置、任何適當大小（無需貼近超過外框）皆能秒速捕捉。',
      '瞄準框黃金比例優化（78% 方框）：取景框大小調整為舒適的 78% 導引方框，20~40cm 正常持機距離一照即讀，告別鏡頭過度貼近的失焦與反光問題。',
      '相機硬體軌道變焦優先：變焦按鈕優先調用 MediaStream Track 原生感光元件縮放，變焦清晰度全面升級。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.13-beta',
    isBeta: true,
    releaseDate: '2026-10-31',
    title: '保險庫樹枝階層目錄 · 分類名單收合樹 · 點擊展開單元明細 · 全局一鍵展開/收合',
    highlights: [
      '保險庫「全部」樹枝階層架構：以「分類目錄 ➔ 單元名稱」樹枝分支視覺呈現，垂直樹線搭配橫向分支接頭，資訊井然有序，徹底擺脫瀑布卡片佔位。',
      '預設全部收合與點擊展開明細：進入保險庫/全部預設為全收合狀態；單元預設為極簡單行名稱列，點擊任一單元即流暢展開完整帳密、敏感欄位與快捷動作。',
      '其他特定分類名稱列模式：切換至各分類分頁亦全面升級為緊湊名稱列，點擊才開啟目前單元，大幅提升單手滑動瀏覽效率。',
      '全局「全部展開」與「全部收合」：頂部工具列新增雙向快捷鍵，支援一鍵展開所有目錄單元或一鍵收合成樹狀概覽。',
      '關鍵字搜尋智慧穿透展開：在搜尋列鍵入任何關鍵字時，自動智慧展開命中之分類資料夾，精準檢視搜尋成果。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.12-beta',
    isBeta: true,
    releaseDate: '2026-10-31',
    title: '新建單元分類機制重構 · 常用標籤一鍵點選 · 智慧首頁分類繼承',
    highlights: [
      '常用推薦分類標籤雲：新增 12 大熱門分類標籤（網銀金融、信用卡、社群通訊、工作商務、電子郵件等），一鍵點擊秒速套用，徹底免手動打字。',
      '歷史分類動態聚合：自動整合保險庫內已建立過的所有自訂分類與範本標籤，點擊即套用，避免同類單元名稱拼寫不一致。',
      '下拉自動建議（Datalist）與一鍵清除：輸入框支援即時下拉匹配推薦，並附帶快速清除鍵，自由輸入新自訂分類隨打隨存。',
      '智慧首頁分類繼承：在首頁特定分類分頁（如「網銀金融」）點選「新增帳密」時，編輯器自動預設繼承該分類，零切換最順手。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.11-beta',
    isBeta: true,
    releaseDate: '2026-10-31',
    title: '接收完成自動落盤儲存機制 · 封包極限壓縮 · 雙重入庫防護',
    highlights: [
      '接收端「完成並關閉」自動寫入防漏機制：徹底修復解密後點擊「完成並關閉」未觸發落盤之問題，點擊關閉或右上角叉叉均會智慧自動執行寫入儲存，保證接收單元 100% 入庫。',
      '底部操作按鍵明確化：預覽畫面底部操作鍵全面升級為「完成並寫入儲存 (X 筆)」，提供清晰綠色儲存反饋。',
      '極致壓縮與高辨識大顆粒輪播 (280字元)：大幅壓縮密文結構，1~2 筆極速單幀秒讀；多筆自動拆為大顆粒動態影格，徹底解決鏡頭掃描對焦滯留問題。',
      '相機音效與即時捕捉綠光：新增 Web Audio API 捕捉嗶聲回饋與瞄準框綠光閃爍，並提供拍照/相簿圖片解碼備援。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
  {
    version: 'v0.9.10-beta',
    isBeta: true,
    releaseDate: '2026-10-30',
    title: '光學正方形取景框修正 · 鏡頭變焦與全螢幕放大 QR · 接收端單元清單查修',
    highlights: [
      '手機 1:1 正方形取景框修正：強制隱藏 html5-qrcode 預設長方形遮罩，相機畫面改為 1:1 正方形裁切並配備高質感四角雷射掃描框。',
      '全螢幕極致放大二維碼（遠距秒掃防手震）：發送端新增一鍵放大功能，以 520px 超清超大尺寸呈現，30~50cm 遠距即可秒讀，避免鏡頭貼太近失焦模糊與手震。',
      '接收端相機變焦與放大視窗：接收端提供 1x / 1.5x / 2x / 2.5x 數位/硬體變焦與大視窗切換，單手對準即可快速捕捉。',
      '接收單元清單完整查修：修復全新單元未在預覽列表渲染之問題，支援「全部 / 新增 / 有差異 / 一致」分類審閱與明細展開。',
      '寫入入庫即時引導：資料寫入後自動切換至「全部」分類與保險庫首頁，並提供「成功接收確認畫面」，確保接收成果一目了然。',
    ],
    securityNote: '每次進版保證本地資料完全安全隔離，更新操作絕不影響已儲存之帳密與範本單元。',
  },
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
