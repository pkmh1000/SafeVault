import {
  VaultItem,
  VaultTemplate,
  IdentitySnippet,
  EncryptedContainer,
  VaultPayload,
  AppSettings,
} from '../types/vault';
import {
  bufferToHex,
  hexToBuffer,
  generateSalt,
  deriveKeyFromPassword,
  encryptAESGCM,
  decryptAESGCM,
} from './cryptoService';

const STORAGE_KEYS = {
  VAULT_CONTAINER: 'safevault_encrypted_container_v1',
  APP_SETTINGS: 'safevault_settings_v1',
  IS_INITIALIZED: 'safevault_initialized_v1',
};

// 預置 9 大標準範本
export const DEFAULT_TEMPLATES: VaultTemplate[] = [
  {
    id: 'tpl_netbank',
    name: '網路銀行',
    category: '網銀金融',
    description: '適用各銀行線上網銀、數位帳戶，可管理交易密碼與代碼',
    icon: 'Landmark',
    isBuiltIn: true,
    fields: [
      { label: '銀行代碼與名稱', isSensitive: false, defaultValue: '808 玉山銀行' },
      { label: '使用者代號', isSensitive: true },
      { label: '台幣帳號', isSensitive: false },
      { label: '轉帳/非約定交易密碼', isSensitive: true },
      { label: '外幣/證券帳號', isSensitive: false },
      { label: '登入網址', isSensitive: false, defaultValue: 'https://' },
    ],
  },
  {
    id: 'tpl_creditcard',
    name: '信用卡',
    category: '信用卡',
    description: '信用卡/簽帳金融卡專用，背面末三碼預設防窺遮罩',
    icon: 'CreditCard',
    isBuiltIn: true,
    fields: [
      { label: '發卡機構與卡別', isSensitive: false, defaultValue: 'Visa 御璽卡' },
      { label: '有效期限 (MM/YY)', isSensitive: false },
      { label: '背面末三碼 CVV', isSensitive: true },
      { label: '英文姓名 (卡面)', isSensitive: false },
      { label: '預借現金/電話語音密碼', isSensitive: true },
      { label: '客服專線', isSensitive: false },
    ],
  },
  {
    id: 'tpl_app',
    name: '行動 App',
    category: '行動應用',
    description: '手機應用程式、通訊軟體、隨身工具等登入紀錄',
    icon: 'Smartphone',
    isBuiltIn: true,
    fields: [
      { label: '綁定手機號碼', isSensitive: false },
      { label: '綁定電子信箱', isSensitive: false },
      { label: '支付/錢包 PIN 碼', isSensitive: true },
      { label: '兩步驟備用碼', isSensitive: true },
      { label: '常用登入裝置', isSensitive: false },
    ],
  },
  {
    id: 'tpl_vendor',
    name: '廠商平台 / 採購',
    category: '企業廠商',
    description: '供應商後台、B2B 採購系統、企業管理帳戶',
    icon: 'Building2',
    isBuiltIn: true,
    fields: [
      { label: '廠商統一編號', isSensitive: false },
      { label: '廠商完整抬頭', isSensitive: false },
      { label: '業務窗口聯絡電話', isSensitive: false },
      { label: '後台登入網址', isSensitive: false, defaultValue: 'https://' },
      { label: 'API 串接金鑰 / Token', isSensitive: true },
    ],
  },
  {
    id: 'tpl_email',
    name: '電子郵件',
    category: '電子郵件',
    description: '企業信箱、私人 Mailbox、IMAP/SMTP 專用密碼',
    icon: 'Mail',
    isBuiltIn: true,
    fields: [
      { label: '備援救援信箱', isSensitive: false },
      { label: '應用程式專用密碼 (App Password)', isSensitive: true },
      { label: 'IMAP 伺服器與通訊埠', isSensitive: false, defaultValue: 'imap.example.com:993' },
      { label: 'SMTP 伺服器與通訊埠', isSensitive: false, defaultValue: 'smtp.example.com:465' },
    ],
  },
  {
    id: 'tpl_github',
    name: 'GitHub / 開發者',
    category: '雲端服務',
    description: '程式庫帳號、Personal Access Token (PAT)、SSH 備註',
    icon: 'Code2',
    isBuiltIn: true,
    fields: [
      { label: 'Personal Access Token (PAT)', isSensitive: true },
      { label: '2FA 兩步驟備援清單', isSensitive: true },
      { label: 'SSH Key 指紋/註記', isSensitive: false },
      { label: '所屬組織 / Team', isSensitive: false },
    ],
  },
  {
    id: 'tpl_google',
    name: 'Google 帳號',
    category: '雲端服務',
    description: 'Google Workspace、個人 Gmail 與安全性驗證',
    icon: 'Globe',
    isBuiltIn: true,
    fields: [
      { label: '安全提問答案', isSensitive: true },
      { label: '8 位數一次性備援碼', isSensitive: true },
      { label: '備援手機號碼', isSensitive: false },
      { label: '通行密鑰 (Passkey) 裝置', isSensitive: false },
    ],
  },
  {
    id: 'tpl_membership',
    name: '會員卡 / 禮券',
    category: '會員證卡',
    description: '賣場、量販店、航空公司里程、會員卡號管理',
    icon: 'BadgePercent',
    isBuiltIn: true,
    fields: [
      { label: '會員編號 / 條碼字串', isSensitive: false },
      { label: '會員等級 / 卡別', isSensitive: false },
      { label: '登記手機', isSensitive: false },
      { label: '查詢密碼 / 認證碼', isSensitive: true },
      { label: '權益與特約備註', isSensitive: false },
    ],
  },
  {
    id: 'tpl_general',
    name: '通用帳號密碼',
    category: '通用帳密',
    description: '標準雙行（帳號、密碼）與彈性自訂欄位',
    icon: 'KeyRound',
    isBuiltIn: true,
    fields: [
      { label: '登入網址 (URL)', isSensitive: false, defaultValue: 'https://' },
      { label: '安全提問與解答', isSensitive: true },
      { label: '額外備忘', isSensitive: false },
    ],
  },
];

// 預置常用身份資料字串庫 (可隨時調用填入欄位)
export const DEFAULT_SNIPPETS: IdentitySnippet[] = [
  {
    id: 'snip_phone',
    title: '常用聯絡手機',
    value: '0912-345-678',
    category: 'phone',
  },
  {
    id: 'snip_address',
    title: '通訊聯絡地址',
    value: '106 台北市大安區忠孝東路四段 100 號 5 樓',
    category: 'address',
  },
  {
    id: 'snip_residence',
    title: '戶籍地址',
    value: '100 台北市中正區重慶南路一段 122 號',
    category: 'address',
  },
  {
    id: 'snip_birthday',
    title: '出生年月日 (西元)',
    value: '1992/05/20',
    category: 'birthday',
  },
  {
    id: 'snip_id_card',
    title: '身分證字號 / 居留證號',
    value: 'A123456789',
    category: 'id_card',
  },
  {
    id: 'snip_tax_id',
    title: '公司統一編號 / 抬頭',
    value: '88889999 數位創新科技有限公司',
    category: 'tax_id',
  },
  {
    id: 'snip_email',
    title: '主要聯絡信箱',
    value: 'myname@example.com',
    category: 'email',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 3, // 預設 3 分鐘閒置自動鎖定
  clearClipboardSeconds: 30, // 30 秒自動清空剪貼簿
  maskPasswordsByDefault: true,
  biometricsEnabled: false,
  recoveryEmail: '',
};

// 檢查保險庫是否已建立過主密碼
export function isVaultInitialized(): boolean {
  return localStorage.getItem(STORAGE_KEYS.IS_INITIALIZED) === 'true';
}

// 取得儲存的加密容器
export function getEncryptedContainer(): EncryptedContainer | null {
  const raw = localStorage.getItem(STORAGE_KEYS.VAULT_CONTAINER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// 儲存加密容器
export function saveEncryptedContainer(container: EncryptedContainer): void {
  localStorage.setItem(STORAGE_KEYS.VAULT_CONTAINER, JSON.stringify(container));
  localStorage.setItem(STORAGE_KEYS.IS_INITIALIZED, 'true');
}

// 取得應用程式偏好設定
export function getAppSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// 儲存偏好設定
export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
}

// 首次設定主密碼並初始化保險庫
export async function initializeVaultWithPassword(
  masterPassword: string
): Promise<{ key: CryptoKey; payload: VaultPayload }> {
  const salt = generateSalt();
  const key = await deriveKeyFromPassword(masterPassword, salt);

  const initialPayload: VaultPayload = {
    items: [
      {
        id: 'sample_bank',
        title: '玉山商業銀行 (示範)',
        category: '網銀金融',
        account: 'esun_user_2026',
        password: 'Pass#Esun!2026',
        templateId: 'tpl_netbank',
        fields: [
          { id: 'f1', label: '銀行代碼與名稱', value: '808 玉山銀行', isSensitive: false },
          { id: 'f2', label: '使用者代號', value: 'A123456789', isSensitive: true },
          { id: 'f3', label: '台幣帳號', value: '0015-968-123456', isSensitive: false },
          { id: 'f4', label: '轉帳/非約定交易密碼', value: 'Trx$Pass998', isSensitive: true },
        ],
        notes: '薪轉帳戶，每月 5 號入帳。此為離線示範資料，可直接修改或刪除。',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'sample_google',
        title: 'Google 個人主要帳戶 (示範)',
        category: '雲端服務',
        account: 'mygoogle.id@gmail.com',
        password: 'Safe!Google$9876',
        templateId: 'tpl_google',
        fields: [
          { id: 'g1', label: '備援手機號碼', value: '0912-345-678', isSensitive: false },
          { id: 'g2', label: '8 位數一次性備援碼', value: '4829 1058, 9382 1740', isSensitive: true },
          { id: 'g3', label: '安全提問答案', value: '母校: 台北市立成功高中', isSensitive: true },
        ],
        notes: '兩步驟驗證已開啟。',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    templates: DEFAULT_TEMPLATES,
    snippets: DEFAULT_SNIPPETS,
  };

  const jsonStr = JSON.stringify(initialPayload);
  const { ciphertext, iv } = await encryptAESGCM(jsonStr, key);

  const container: EncryptedContainer = {
    version: 1,
    salt: bufferToHex(salt),
    iv: iv,
    ciphertext: ciphertext,
    timestamp: Date.now(),
  };

  saveEncryptedContainer(container);
  return { key, payload: initialPayload };
}

// 使用主密碼解鎖解密保險庫
export async function unlockVault(
  masterPassword: string
): Promise<{ key: CryptoKey; payload: VaultPayload } | null> {
  const container = getEncryptedContainer();
  if (!container) return null;

  try {
    const salt = hexToBuffer(container.salt);
    const key = await deriveKeyFromPassword(masterPassword, salt);
    const plaintext = await decryptAESGCM(container.ciphertext, container.iv, key);
    const payload: VaultPayload = JSON.parse(plaintext);

    // 確保有預設範本與常用字串
    if (!payload.templates || payload.templates.length === 0) {
      payload.templates = DEFAULT_TEMPLATES;
    }
    if (!payload.snippets || payload.snippets.length === 0) {
      payload.snippets = DEFAULT_SNIPPETS;
    }

    return { key, payload };
  } catch (err) {
    console.error('Vault unlock failed: Invalid master password or corrupted data', err);
    return null;
  }
}

// 儲存更新後的保險庫資料 (使用當前已衍生出的 Session Key)
export async function saveVaultPayload(payload: VaultPayload, key: CryptoKey): Promise<void> {
  const currentContainer = getEncryptedContainer();
  const salt = currentContainer ? hexToBuffer(currentContainer.salt) : generateSalt();
  const jsonStr = JSON.stringify(payload);
  const { ciphertext, iv } = await encryptAESGCM(jsonStr, key);

  const newContainer: EncryptedContainer = {
    version: 1,
    salt: bufferToHex(salt),
    iv: iv,
    ciphertext: ciphertext,
    timestamp: Date.now(),
  };

  saveEncryptedContainer(newContainer);
}

// 重設整個本機保險庫 (危險操作，需使用者多次確認)
export function wipeLocalVault(): void {
  localStorage.removeItem(STORAGE_KEYS.VAULT_CONTAINER);
  localStorage.removeItem(STORAGE_KEYS.IS_INITIALIZED);
}
