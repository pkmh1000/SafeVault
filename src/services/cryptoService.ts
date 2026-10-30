/**
 * SafeVault 加密核心服務
 * 使用瀏覽器原生 Web Crypto API (SubtleCrypto)，硬體加速，零網路連線
 * 採用 PBKDF2 (100,000 次雜湊) + AES-GCM (256-bit 金鑰, 96-bit 隨機 IV)
 */

// 將 ArrayBuffer 或 Uint8Array 轉為 Hex 字串
export function bufferToHex(input: ArrayBuffer | Uint8Array): string {
  const byteArray = input instanceof Uint8Array ? input : new Uint8Array(input);
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// 將 Hex 字串轉為 Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// 將 ArrayBuffer 或 Uint8Array 轉為 Base64
export function bufferToBase64(input: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// 將 Base64 轉為 Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 產生加密安全的隨機 Salt (16 位元組)
export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}

// 產生隨機 IV (12 位元組，AES-GCM 標準)
export function generateIV(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
}

// 由主密碼與 Salt 透過 PBKDF2 衍生出 AES-GCM 256 位元金鑰
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password) as unknown as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// AES-GCM 256-bit 加密
export async function encryptAESGCM(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = generateIV();
  const enc = new TextEncoder();
  const encodedPlaintext = enc.encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedPlaintext as unknown as BufferSource
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToHex(iv),
  };
}

// AES-GCM 256-bit 解密
export async function decryptAESGCM(
  ciphertextBase64: string,
  ivHex: string,
  key: CryptoKey
): Promise<string> {
  const iv = hexToBuffer(ivHex);
  const encryptedBytes = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encryptedBytes as unknown as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

// 快速雜湊計算 (SHA-256)
export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return bufferToHex(hashBuffer);
}

// 產生真隨機強密碼產生器
export interface GeneratePasswordOptions {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean; // 排除 0, O, o, 1, l, I
}

export function generateStrongPassword(options: GeneratePasswordOptions): string {
  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lower = 'abcdefghijklmnopqrstuvwxyz';
  let digits = '0123456789';
  let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.excludeAmbiguous) {
    upper = upper.replace(/[OI]/g, '');
    lower = lower.replace(/[ol]/g, '');
    digits = digits.replace(/[01]/g, '');
    symbols = symbols.replace(/[|;:<>,.]/g, '');
  }

  let charset = '';
  const requiredChars: string[] = [];

  if (options.useUpper && upper.length > 0) {
    charset += upper;
    requiredChars.push(getRandomChar(upper));
  }
  if (options.useLower && lower.length > 0) {
    charset += lower;
    requiredChars.push(getRandomChar(lower));
  }
  if (options.useDigits && digits.length > 0) {
    charset += digits;
    requiredChars.push(getRandomChar(digits));
  }
  if (options.useSymbols && symbols.length > 0) {
    charset += symbols;
    requiredChars.push(getRandomChar(symbols));
  }

  if (charset.length === 0) {
    charset = lower + digits;
    requiredChars.push(getRandomChar(charset));
  }

  const length = Math.max(options.length, requiredChars.length);
  const remainingLength = length - requiredChars.length;
  const result: string[] = [...requiredChars];

  const randomValues = new Uint32Array(remainingLength);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < remainingLength; i++) {
    result.push(charset[randomValues[i] % charset.length]);
  }

  // 費雪-葉茲洗牌 (Fisher-Yates Shuffle)
  for (let i = result.length - 1; i > 0; i--) {
    const jRand = new Uint32Array(1);
    crypto.getRandomValues(jRand);
    const j = jRand[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}

function getRandomChar(str: string): string {
  const rand = new Uint32Array(1);
  crypto.getRandomValues(rand);
  return str[rand[0] % str.length];
}

// 密碼強度評估
export interface PasswordStrength {
  score: number; // 0 ~ 4
  entropyBits: number;
  label: '極弱' | '弱' | '中等' | '強' | '極安全';
  color: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, entropyBits: 0, label: '極弱', color: 'text-slate-400' };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  const entropyBits = Math.round(password.length * Math.log2(poolSize || 1));

  let score = 0;
  if (entropyBits >= 80 && password.length >= 14) score = 4;
  else if (entropyBits >= 60 && password.length >= 10) score = 3;
  else if (entropyBits >= 40 && password.length >= 8) score = 2;
  else if (entropyBits >= 25) score = 1;

  const labels: PasswordStrength['label'][] = ['極弱', '弱', '中等', '強', '極安全'];
  const colors = [
    'text-red-500',
    'text-amber-500',
    'text-yellow-600',
    'text-emerald-500',
    'text-teal-600',
  ];

  return {
    score,
    entropyBits,
    label: labels[score],
    color: colors[score],
  };
}

// 產生 6 位數短暫近場授權碼 (用於 QR Code 離線配對認證)
export function generateHandshakePin(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const pin = (array[0] % 900000 + 100000).toString();
  return pin;
}
