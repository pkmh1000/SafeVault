export interface ManualSection {
  id: string;
  category: 'quickstart' | 'vault' | 'templates' | 'snippets' | 'sync' | 'backup' | 'security' | 'faq';
  categoryLabel: string;
  title: string;
  icon: string;
  summary: string;
  badge?: string;
  highlights: string[];
  details: {
    subtitle?: string;
    steps?: string[];
    note?: string;
  }[];
  tags: string[];
}

export const USER_MANUAL_CATEGORIES = [
  { id: 'all', label: '全部說明' },
  { id: 'quickstart', label: '安裝與入門' },
  { id: 'vault', label: '保險庫管理' },
  { id: 'templates', label: '範本管理' },
  { id: 'snippets', label: '常用資料庫' },
  { id: 'sync', label: '光學近場同步' },
  { id: 'backup', label: 'CSV 備份與匯出' },
  { id: 'security', label: '安全與鎖定' },
  { id: 'faq', label: '常見問答 FAQ' },
];

export const USER_MANUAL_DATA: ManualSection[] = [
  {
    id: 'pwa-install',
    category: 'quickstart',
    categoryLabel: '安裝與入門',
    title: '跨平台安裝指南 (PWA 離線應用)',
    icon: 'Smartphone',
    summary: '符合 PWA 規範，安裝後在飛航模式或無網路環境下皆能秒速開啟使用。',
    badge: '必看入門',
    highlights: [
      'Android：點擊瀏覽器浮現的「新增至主螢幕」或右上選單「安裝應用程式」。',
      'iPhone/iPad：使用 Safari 點擊底部分享圖示 ➔ 選擇「加入主畫面」。',
      '電腦版 (Win/Mac)：Chrome/Edge 網址列右側點擊「安裝 SafeVault」小圖示。',
    ],
    details: [
      {
        subtitle: 'Android 安裝步驟',
        steps: [
          '使用手機 Chrome 或 Edge 開啟 SafeVault 網址。',
          '底部會自動跳出「安裝 SafeVault」提示（或由右上角選單 ⋮ 點選「新增至主螢幕」）。',
          '安裝後桌面將生成獨立圖示，無網址列干擾，支援指紋秒開。',
        ],
      },
      {
        subtitle: 'iPhone / iPad (iOS) 安裝步驟',
        steps: [
          '務必使用系統原生 Safari 瀏覽器開啟網址。',
          '點擊下方工具列正中央的「分享」按鈕（方框帶向上箭頭）。',
          '往下滑動找到「加入主畫面 (Add to Home Screen)」，點選右上角「新增」。',
        ],
      },
      {
        subtitle: '離線飛航驗證',
        note: '安裝完成後，可立即開啟手機飛航模式，點擊 SafeVault 桌面圖示驗證是否能在完全斷網下正常開鎖與查詢！',
      },
    ],
    tags: ['安裝', 'PWA', '桌面', 'iPhone', 'Android', '離線', '飛航模式', 'Safari', 'Chrome'],
  },
  {
    id: 'init-and-recovery',
    category: 'quickstart',
    categoryLabel: '安裝與入門',
    title: '初次初始化、生物辨識與 Email 救援金鑰',
    icon: 'KeyRound',
    summary: '建立主密碼衍生 AES-256 金鑰，綁定 Face ID/指紋與離線 16 碼緊急救援金鑰。',
    badge: '安全核心',
    highlights: [
      '主密碼為唯一推導加密金鑰的依據，伺服器不存任何密碼。',
      '啟用指紋/Face ID，每次進入 SafeVault 即可秒速解鎖。',
      '綁定 Email 生成 16 碼緊急金鑰，忘記密碼時可本機安全重設。',
    ],
    details: [
      {
        subtitle: '主密碼設定建議',
        steps: [
          '建議長度至少 8 位以上，包含英文字母大小寫、數字與符號。',
          '請務必牢記主密碼，本工具採零知識本機加密，無後台管理員可代為找回。',
        ],
      },
      {
        subtitle: '綁定 Email 離線救援憑證與金鑰備存',
        steps: [
          '解鎖進入保險庫後，點擊右上角「設定」圖示。',
          '找到「綁定 Email 離線緊急救援」區塊，填入您的信箱並驗證主密碼後生成 16 碼緊急救援金鑰。',
          '請務必立即將此 16 碼金鑰抄寫或備存於安全處（如紙本筆記）。為確保防窺與零知識安全，系統本機絕不明文留存此金鑰，點擊【我已妥善記錄金鑰，隱藏並完成綁定】後即永久隱藏金鑰。',
        ],
        note: '若不慎忘記主密碼，在登入畫面點擊「忘記密碼？」，輸入信箱與此 16 碼金鑰即可離線驗證解鎖既有保險庫，資料 100% 完整無損保留，並可立即設定新主密碼重新加密。',
      },
    ],
    tags: ['主密碼', 'FaceID', 'TouchID', '指紋', '救援信箱', '忘記密碼', '緊急金鑰'],
  },
  {
    id: 'vault-tree-and-view',
    category: 'vault',
    categoryLabel: '保險庫管理',
    title: '樹狀階層目錄與單元展開明細',
    icon: 'FolderTree',
    summary: '分類 ➔ 單元名稱樹枝目錄，預設整齊收合，點選單元流暢展開完整帳密。',
    badge: '核心檢索',
    highlights: [
      '進保險庫/全部預設為「全收合狀態」，版面極致簡潔不佔位。',
      '垂直樹線引導與橫向分支接頭，階層邏輯清楚分明。',
      '頂部提供【全部展開】與【全部收合】雙向快捷鍵。',
      '單元名稱列點選才開啟明細，支援一鍵複製與倒數計時清空剪貼簿。',
    ],
    details: [
      {
        subtitle: '瀏覽與展開技巧',
        steps: [
          '點擊分類資料夾（如「網銀金融」），即可查看該分類下的所有單元名稱列。',
          '點選特定單元，流暢展開帳號、密碼、備註與所有自訂欄位。',
          '在搜尋列輸入關鍵字，系統會自動智慧穿透並展開命中的分類目錄。',
        ],
      },
    ],
    tags: ['樹枝階層', '目錄', '收合', '展開', '搜尋', '明細', '複製'],
  },
  {
    id: 'vault-custom-fields',
    category: 'vault',
    categoryLabel: '保險庫管理',
    title: '自訂屬性欄位與敏感資料遮罩',
    icon: 'Shield',
    summary: '支援無限制新增自訂標籤欄位，敏感資料預設星號防窺，附帶小眼睛即時解鎖。',
    highlights: [
      '自由新增各類欄位（如：信用卡到期日、CVV、統一編號、API Key、後台網址）。',
      '敏感遮罩開關：重要資料標記為敏感遮罩，在明細中預設以圓點隱蔽。',
      '防窺小眼睛：點擊眼睛圖示切換顯隱，兼具隱私防窺與核對便利。',
    ],
    details: [
      {
        subtitle: '操作指引',
        steps: [
          '在編輯帳密視窗中，點擊「＋新增自訂欄位」。',
          '輸入欄位名稱與內容，並可自由切換盾牌圖示之「敏感資料遮罩保護」。',
          '儲存後，該欄位在單元明細中即會以隱蔽圓點呈現，保障公眾場合閱覽安全。',
        ],
      },
    ],
    tags: ['自訂欄位', '敏感遮罩', '防窺', 'CVV', '隱私', '眼睛圖示'],
  },
  {
    id: 'undo-redo-trash',
    category: 'vault',
    categoryLabel: '保險庫管理',
    title: '編輯防呆：n 步歷史復原、刪除提醒與回收站',
    icon: 'RotateCcw',
    summary: '支援高達 50 步歷史復原/重作、安全刪除確認、8 秒底部即時救回與回收站。',
    badge: '防手滑必備',
    highlights: [
      '編輯器頂部【↩ 回復】與【↪ 重作】，支援 Ctrl+Z / Cmd+Z 與 Ctrl+Y。',
      '支援一鍵【還原開啟前狀態】，改壞了隨時回到初始資料。',
      '單元刪除專屬安全提醒：列出單元名稱與欄位數量，防止手滑誤觸。',
      '8 秒底部即時救回 Toast：刪除後畫面底部懸浮 8 秒【↩ 立即救回】鍵。',
      '最近刪除回收站：被刪項目以 AES-256 加密存於回收站，隨時可檢視密碼與還原。',
    ],
    details: [
      {
        subtitle: '誤刪救援 3 道防線',
        steps: [
          '第一道：刪除時主動跳出「單元刪除安全提醒」卡片確認。',
          '第二道：確認刪除後，畫面下方懸浮 8 秒互動提示，點擊【立即救回】秒速取消。',
          '第三道：若已過 8 秒，點擊頂部「最近刪除」回收站，可隨時復原或檢視密碼。',
        ],
      },
    ],
    tags: ['回復', '重作', 'Undo', 'Redo', '誤刪', '回收站', '防呆', 'Ctrl+Z'],
  },
  {
    id: 'templates-guide',
    category: 'templates',
    categoryLabel: '範本管理',
    title: '9 大生活範本與單元一鍵轉存範本',
    icon: 'FileText',
    summary: '預置網銀、信用卡、App、廠商、伺服器等範本，支援現有帳密直接生成範本。',
    highlights: [
      '內建 9 大生活與商務通用範本，欄位結構清晰規範。',
      '在任何帳密單元中點擊「轉為範本」，秒速儲存為專屬自訂範本。',
      '範本庫全面對齊樹枝階層目錄，支援一鍵點選「套用此範本建立新帳密」。',
    ],
    details: [
      {
        subtitle: '如何自訂專屬範本',
        steps: [
          '方式一：切換至「範本」分頁，點擊「新增範本」，自由定義欄位與預設值。',
          '方式二：在保險庫編輯任一帳密時，點擊「轉為新範本」，系統自動擷取既有欄位架構。',
        ],
      },
    ],
    tags: ['範本', '模組', '網銀', '信用卡', '自訂範本', '一鍵套用'],
  },
  {
    id: 'snippets-guide',
    category: 'snippets',
    categoryLabel: '常用資料庫',
    title: '常用個人資料庫、敏感遮罩與調用',
    icon: 'Layers',
    summary: '集中存放身分證號、統一編號、電話、地址、護照，支援防窺與一鍵調用帶入。',
    badge: '高效輸入',
    highlights: [
      '自由儲存各類常用個人繁複字串，省去每次翻找實體卡片的麻煩。',
      '機敏字串敏感遮罩開關：預設星號隱蔽防窺，支援小眼睛即時解鎖。',
      '自訂標籤即時回顯：自訂標籤儲存後立即聚合回顯在分類區與首頁橫條中。',
      '在編輯帳密時隨時調用常用字串，一鍵加入自訂欄位並自動繼承敏感設定。',
    ],
    details: [
      {
        subtitle: '調用常用資料技巧',
        steps: [
          '新增或編輯保險庫帳密時，點擊自訂欄位區的「調用常用資料」。',
          '在彈出選單中點選指定字串（如「身分證字號」），系統會自動帶入標籤與內容。',
          '若該字串原本啟用了敏感遮罩，匯入時也會自動勾選保護。',
        ],
      },
    ],
    tags: ['常用資料', '身分證', '地址', '電話', '護照', '統編', '調用', '敏感遮罩'],
  },
  {
    id: 'password-generator',
    category: 'vault',
    categoryLabel: '保險庫管理',
    title: '強密碼產生器 (熵值評分與易混淆過濾)',
    icon: 'Sparkles',
    summary: '自訂 8~64 位長度、自選大小寫與特殊符號，內建易混淆字元排除與熵值檢驗。',
    highlights: [
      '支援長度滑桿調節（8 ~ 64 位元）。',
      '四大字元集合自由搭配（大寫英文字母、小寫字母、數字、特殊符號）。',
      '過濾易混淆字元：自動剔除 1, l, I, 0, O 等難以肉眼辨識的文字。',
      '即時資訊熵安全評級，一鍵複製或直接填入編輯中的密碼欄位。',
    ],
    details: [
      {
        subtitle: '開啟方式',
        steps: [
          '編輯帳密時，點擊密碼輸入框右側的「產生」或魔術棒圖示。',
          '或隨時在首頁點選「產生器」分頁，隨機產生密碼並一鍵複製。',
        ],
      },
    ],
    tags: ['密碼產生器', '隨機密碼', '強密碼', '熵值', '易混淆字元'],
  },
  {
    id: 'optical-sync',
    category: 'sync',
    categoryLabel: '光學近場同步',
    title: '近場光學無網跨裝置同步 (動態 QR Code)',
    icon: 'QrCode',
    summary: '免連 Wi-Fi、免配對藍牙，純靠螢幕與相機鏡頭對照，完成光學加密傳輸。',
    badge: '黑科技離線同步',
    highlights: [
      '兩台手機在完全無網路、不同 Wi-Fi 的環境下依然能無礙同步！',
      '多選傳輸：支援自選特定單元或一鍵全選。',
      '暫時性 6 位數 PIN 碼動態加密：傳輸過程二次加密，防止旁人拍攝竊取。',
      '高密度單幀秒掃 vs 大容量 280 字元大顆粒動態輪播影格。',
      '遠距一鍵放大 QR Code (520px 超清放大防手震失焦)。',
      '接收端相機變焦 (1x~2.5x) 與 78% 黃金比例掃瞄方框，自動嗶聲回饋。',
      '接收差異比對審核（新單元/有差異/一致），點擊寫入 100% 入庫。',
    ],
    details: [
      {
        subtitle: '傳輸步驟',
        steps: [
          '發送端：點選頂部「近場同步」➔ 勾選欲同步的單元 ➔ 設定 6 位數 PIN 碼生成 QR 碼。',
          '接收端：點選「近場同步」➔ 切換至「接收同步」➔ 輸入相同 6 位 PIN 碼開啟相機。',
          '對準掃描：接收端鏡頭對準發送端螢幕，辨識成功後點擊「完成並寫入儲存」。',
        ],
      },
    ],
    tags: ['同步', 'QR Code', '相機', '換手機', '光學傳輸', '無網', 'PIN 碼'],
  },
  {
    id: 'csv-backup-export',
    category: 'backup',
    categoryLabel: 'CSV 備份與匯出',
    title: '匯出帳密備份 (CSV 格式、脫敏模式與 UTF-8 BOM 防亂碼)',
    icon: 'FileSpreadsheet',
    summary: '解密資料匯出為標準 CSV，內嵌 UTF-8 BOM 杜絕亂碼，支援脫敏防窺模式與深層防公式注入。',
    badge: '外部冷備份',
    highlights: [
      '位置：進入「設定」➔ 點擊【匯出帳密備份 (CSV 試算表)】。',
      '內嵌 UTF-8 BOM 萬國碼標記，Microsoft Excel (Win/Mac) 開啟絕不出現亂碼。',
      '新增「脫敏防窺安全備份模式」：密碼改為星號遮罩匯出，適合印出備忘或一般封存。',
      'OWASP 深度防公式注入：嚴防 =, +, -, @, \\t, \\r, |, % 與前導空格繞過，防止惡意試算表巨集執行。',
      '高敏感明文防手滑警示確認窗，支援自由勾選是否包含回收站已刪單元。',
    ],
    details: [
      {
        subtitle: '雙重匯出模式選擇',
        steps: [
          '完整備份模式（預設）：匯出解密後的完整真實帳密，請務必存放於 BitLocker / FileVault 加密隨身碟中。',
          '脫敏防窺模式（勾選啟用）：將所有密碼與機敏欄位遮蔽為星號 (••••••••)，僅保留名稱、分類、帳號與備註，適合列印紙本備忘或無密碼歸檔。',
        ],
      },
      {
        subtitle: '安全防護守則',
        note: '切勿將明文 CSV 上傳至未經加密的公開雲端硬碟；檢視或手動備份後，建議將裝置上的臨時下載檔立即徹底銷毀。',
      },
    ],
    tags: ['備份', '匯出', 'CSV', 'Excel', 'BOM', '亂碼', '冷儲存', '脫敏備份', '公式注入'],
  },
  {
    id: 'security-and-locks',
    category: 'security',
    categoryLabel: '安全與鎖定',
    title: '記憶體敏感清除 (RAM Scrubbing)、剪貼簿立即抹除與 30 萬次 PBKDF2',
    icon: 'Lock',
    summary: '上鎖時徹底抹除記憶體與剪貼簿、300,000 次金鑰衍生抗暴力破解、防爆破冷卻延遲。',
    badge: '高規防護',
    highlights: [
      '記憶體敏感清除 (RAM Scrubbing)：上鎖或逾時時，立即清空記憶體中所有解密帳密資料物件。',
      '剪貼簿即時抹除 (Instant Clipboard Wipe)：上鎖或手動登出瞬間，自動抹除剪貼簿中的明文密碼。',
      '金鑰衍生強度升級：採用 300,000 次 PBKDF2-HMAC-SHA256 雜湊，符合 OWASP 最新抗暴力破解標準。',
      '登入防爆破冷卻延遲：密碼輸入錯誤時啟動防字典攻擊階梯延遲，防範程式化暴力試錯。',
      '超時防窺鎖定：支援「切換視窗立即鎖定」、「閒置 1/3/5 分鐘鎖定」。',
    ],
    details: [
      {
        subtitle: 'RAM 與剪貼簿防護機制',
        steps: [
          '平常瀏覽帳密時，資料暫存於記憶體；一旦閒置超時或點擊「上鎖」，系統不僅銷毀 CryptoKey，亦同步將解密帳密狀態全數歸零。',
          '複製密碼後即便設定 30 秒清空，若在 5 秒內鎖定保險庫，剪貼簿將被立即抹除，不留給惡意程式讀取機會。',
        ],
      },
      {
        subtitle: '主密碼強度要求',
        note: '建立主密碼或重設時，系統強制檢驗資訊熵強度（分數需達中等以上），杜絕 12345678 等弱口令。',
      },
    ],
    tags: ['鎖定', '超時', '剪貼簿', 'RAM', 'PBKDF2', '防爆破', '換密碼', '登出', '隱私保護'],
  },
  {
    id: 'update-and-upgrade',
    category: 'security',
    categoryLabel: '安全與鎖定',
    title: '即時檢查更新與進版安全承諾',
    icon: 'RefreshCw',
    summary: '伺服器無快取即時探測，硬快取清除機制，保證更新絕不影響本地已存資料。',
    highlights: [
      '伺服器無快取真即時偵測：向伺服器以 no-store 發起查詢，100% 精準探測。',
      '智慧更新按鈕：僅在偵測到新版本時提供「立即更新」，已是最新版自動隱藏。',
      '硬快取清除更新：點擊立即更新智慧調用 Cache API 清除舊檔，秒載最新版。',
      '進版安全承諾：升級前端程式碼絕對不會影響、覆蓋或清除本地已儲存的任何帳密！',
    ],
    details: [
      {
        subtitle: '如何檢查更新',
        steps: [
          '進入「設定」➔ 往下滑動至「版本與更新管理中心」。',
          '點擊【檢查是否有更新】，系統即刻探測遠端版本。',
          '若發現新版本，點擊【立即更新至新版】即可無痛升級。',
        ],
      },
    ],
    tags: ['版本更新', '檢查更新', '快取', '進版安全', '免重裝'],
  },
  {
    id: 'faq-storage',
    category: 'faq',
    categoryLabel: '常見問答 FAQ',
    title: 'FAQ: 清除瀏覽器歷史記錄資料會消失嗎？',
    icon: 'HelpCircle',
    summary: '清除瀏覽紀錄不會受影響；清除「網站離線儲存空間 (Storage)」則會重設。',
    highlights: [
      '一般清除「快取快照」與「瀏覽紀錄」絕不影響保險庫資料。',
      '強烈建議安裝為 PWA 獨立應用：PWA 享有系統獨立沙盒儲存，保護等級高於普通分頁。',
      '養成定期匯出 CSV 備份或使用「近場同步」備份至第二台裝置的好習慣。',
    ],
    details: [
      {
        subtitle: '防護措施建議',
        steps: [
          '第一步：將 SafeVault 安裝為 PWA 桌面圖示（儲存資料不易被瀏覽器一鍵清除）。',
          '第二步：在「設定」中定期使用【匯出帳密備份 (CSV)】存於安全隨身碟。',
          '第三步：利用「近場 QR Code 同步」常態同步至平板或備用手機。',
        ],
      },
    ],
    tags: ['FAQ', '清除歷史', '資料遺失', 'Cookie', 'Storage', 'PWA沙盒'],
  },
  {
    id: 'faq-offline',
    category: 'faq',
    categoryLabel: '常見問答 FAQ',
    title: 'FAQ: 飛航模式完全斷網下真的可以使用嗎？',
    icon: 'HelpCircle',
    summary: '100% 可以！所有程式資源已被 Service Worker 本機快取，無任何網路依賴。',
    highlights: [
      'SafeVault 在第一次開啟加載後，所有程式碼、樣式與圖示已完整快取在本機。',
      '所有加密與解密運算皆在您裝置的 CPU 與瀏覽器內核處理，不需要任何外部伺服器。',
      '跨裝置同步亦採用相機與螢幕的光學二維碼，完全不消耗任何網路流量。',
    ],
    details: [
      {
        subtitle: '立即驗證',
        note: '隨時開啟飛航模式並關閉 Wi-Fi，打開 SafeVault 依然能正常輸入密碼解鎖、檢視帳密、產生密碼與匯出 CSV！',
      },
    ],
    tags: ['FAQ', '飛航模式', '斷網', '離線驗證', '純本機'],
  },
];
