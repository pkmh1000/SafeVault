export interface CustomField {
  id: string;
  label: string;          // 欄位抬頭標籤 (例如: 信用卡到期日, 統一編號, CVV 等)
  value: string;          // 內容
  isSensitive: boolean;   // true: 隱私遮罩區 (預設隱蔽), false: 一般顯示區
}

export interface VaultItem {
  id: string;
  title: string;          // 服務名稱 (例如: 玉山網銀, GitHub 公司帳號)
  category: string;       // 分類 (網銀, 信用卡, App, 廠商, 信箱, 平台...)
  account: string;        // 第一行: 帳號
  password: string;       // 第二行: 密碼
  fields: CustomField[];  // 後續添加標籤欄位
  templateId?: string;    // 所套用之範本 ID (選填)
  notes?: string;         // 備註說明
  createdAt: number;
  updatedAt: number;
}

export interface TemplateFieldDef {
  label: string;
  isSensitive: boolean;
  defaultValue?: string;
}

export interface VaultTemplate {
  id: string;
  name: string;           // 範本名稱 (例如: 網路銀行標準格式, 信用卡, 會員卡)
  category: string;
  description: string;
  icon: string;           // Lucide 圖示名稱
  fields: TemplateFieldDef[];
  isBuiltIn: boolean;     // true: 預置 9 大模板, false: 使用者自訂/衍生模板
}

export type SnippetCategory = 'address' | 'phone' | 'birthday' | 'id_card' | 'email' | 'tax_id' | 'custom';

export interface IdentitySnippet {
  id: string;
  title: string;          // 標題 (例如: 戶籍地址, 常用手機, 出生年月日)
  value: string;          // 常用字串內容
  category: SnippetCategory;
  customCategory?: string; // 當 category 為 'custom' 時使用者自訂的分類名稱 (例如: 健保卡、門禁卡、車牌)
}

export interface EncryptedContainer {
  version: number;
  salt: string;           // PBKDF2 salt in hex
  iv: string;             // AES-GCM IV in hex
  ciphertext: string;     // Base64 ciphertext
  timestamp: number;
}

export interface VaultPayload {
  items: VaultItem[];
  templates: VaultTemplate[];
  snippets: IdentitySnippet[];
  recoveryEmail?: string;
  recoveryCodeHash?: string;
  encryptedMasterPassForBio?: { ciphertext: string; iv: string };
  biometricCredentialId?: string;
}

export interface SyncPacket {
  version: number;
  type: 'SAFEVAULT_AIRGAP_SYNC';
  timestamp: number;
  deviceId: string;
  salt: string;
  iv: string;
  ciphertext: string;     // Encrypted with ephemeral 6-digit PIN key
  authHash: string;       // SHA-256 hash of the 6-digit PIN for verification
  rounds?: number;        // PBKDF2 iteration rounds for handshake key
}

export interface SyncConflictItem {
  id: string;
  title: string;
  status: 'new' | 'identical' | 'modified';
  incomingItem: VaultItem;
  localItem?: VaultItem;
  diffSummary?: string[]; // 描述不同處 (例如: 密碼不同、帳號不同、自訂欄位有差異)
  resolution: 'keep_local' | 'overwrite_with_incoming' | 'keep_both';
}

export interface AppSettings {
  autoLockMinutes: number; // 0 = 立即/關閉視窗, 1, 3, 5, 10
  clearClipboardSeconds: number; // 15, 30, 60
  maskPasswordsByDefault: boolean;
  biometricsEnabled: boolean;
  recoveryEmail: string;
  lastActiveTab?: 'vault' | 'templates' | 'snippets' | 'generator';
  lastCategory?: string;
}
