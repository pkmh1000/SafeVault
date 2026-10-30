/**
 * 生物辨識 (WebAuthn / FaceID / TouchID / 指紋) 與 Email 救援服務
 * 100% 離線運作，免雲端伺服器
 */

import {
  bufferToHex,
  hexToBuffer,
  generateSalt,
  deriveKeyFromPassword,
  encryptAESGCM,
  decryptAESGCM,
  sha256,
} from './cryptoService';

const STORAGE_KEYS = {
  BIO_CREDENTIAL_ID: 'safevault_bio_cred_id_v1',
  BIO_ENCRYPTED_MASTER: 'safevault_bio_encrypted_master_v1',
  BIO_SALT: 'safevault_bio_salt_v1',
  EMAIL_RECOVERY_CONTAINER: 'safevault_email_recovery_v1',
};

// 檢查此裝置是否支援生物辨識 (TouchID, FaceID, Windows Hello, Android 指紋)
export async function isBiometricsSupported(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  ) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// 檢查是否已設定並啟用生物辨識
export function isBiometricsConfigured(): boolean {
  return (
    !!localStorage.getItem(STORAGE_KEYS.BIO_CREDENTIAL_ID) &&
    !!localStorage.getItem(STORAGE_KEYS.BIO_ENCRYPTED_MASTER)
  );
}

// 註冊生物辨識並加密儲存主密碼
export async function registerBiometrics(masterPassword: string): Promise<boolean> {
  try {
    const supported = await isBiometricsSupported();
    if (!supported) return false;

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'SafeVault 離線安全密碼庫',
          id: window.location.hostname || 'localhost',
        },
        user: {
          id: userId,
          name: 'safevault-owner',
          displayName: 'SafeVault Owner',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // 限制為本機生物辨識 (TouchID / FaceID)
          userVerification: 'required',
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    const credIdHex = bufferToHex(credential.rawId);
    const salt = generateSalt();
    // 使用憑證 ID 結合本機 Salt 衍生儲存金鑰
    const bioKey = await deriveKeyFromPassword(credIdHex, salt);

    const { ciphertext, iv } = await encryptAESGCM(masterPassword, bioKey);

    localStorage.setItem(STORAGE_KEYS.BIO_CREDENTIAL_ID, credIdHex);
    localStorage.setItem(STORAGE_KEYS.BIO_SALT, bufferToHex(salt));
    localStorage.setItem(
      STORAGE_KEYS.BIO_ENCRYPTED_MASTER,
      JSON.stringify({ ciphertext, iv })
    );

    return true;
  } catch (err) {
    console.warn('Biometrics registration failed or cancelled', err);
    return false;
  }
}

// 透過生物辨識快速解鎖主密碼
export async function authenticateWithBiometrics(): Promise<string | null> {
  try {
    const credIdHex = localStorage.getItem(STORAGE_KEYS.BIO_CREDENTIAL_ID);
    const bioSaltHex = localStorage.getItem(STORAGE_KEYS.BIO_SALT);
    const encDataStr = localStorage.getItem(STORAGE_KEYS.BIO_ENCRYPTED_MASTER);

    if (!credIdHex || !bioSaltHex || !encDataStr) return null;

    const credIdBuffer = hexToBuffer(credIdHex);
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname || 'localhost',
        allowCredentials: [
          {
            id: credIdBuffer as unknown as BufferSource,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) return null;

    // 生物辨識通過，使用憑證 ID 解密出主密碼
    const salt = hexToBuffer(bioSaltHex);
    const bioKey = await deriveKeyFromPassword(credIdHex, salt);
    const { ciphertext, iv } = JSON.parse(encDataStr);
    const masterPassword = await decryptAESGCM(ciphertext, iv, bioKey);

    return masterPassword;
  } catch (err) {
    console.warn('Biometrics unlock cancelled or failed', err);
    return null;
  }
}

// 清除生物辨識設定
export function disableBiometrics(): void {
  localStorage.removeItem(STORAGE_KEYS.BIO_CREDENTIAL_ID);
  localStorage.removeItem(STORAGE_KEYS.BIO_SALT);
  localStorage.removeItem(STORAGE_KEYS.BIO_ENCRYPTED_MASTER);
}

// 產生隨機 16 碼緊急救援金鑰 (例如: SAFE-8B2F-9C1D-4K7M)
export function generateEmergencyRescueCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const segments = [];
  for (let i = 0; i < 3; i++) {
    let seg = '';
    const rand = new Uint8Array(4);
    crypto.getRandomValues(rand);
    for (let j = 0; j < 4; j++) {
      seg += chars[rand[j] % chars.length];
    }
    segments.push(seg);
  }
  return `SAFE-${segments.join('-')}`;
}

// 綁定救援 Email 與生成救援容器
export async function setupEmailRecovery(
  email: string,
  masterPassword: string,
  rescueCode: string
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const salt = generateSalt();
  // 救援金鑰結合 email 衍生解密密鑰
  const recoveryPass = `${normalizedEmail}:${rescueCode.trim().toUpperCase()}`;
  const recoveryKey = await deriveKeyFromPassword(recoveryPass, salt, 100000);

  const { ciphertext, iv } = await encryptAESGCM(masterPassword, recoveryKey);
  const emailHash = await sha256(normalizedEmail);

  const container = {
    emailHash,
    salt: bufferToHex(salt),
    iv,
    ciphertext,
    createdAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEYS.EMAIL_RECOVERY_CONTAINER, JSON.stringify(container));
}

// 檢查是否已設定 Email 救援
export function isEmailRecoveryConfigured(): boolean {
  return !!localStorage.getItem(STORAGE_KEYS.EMAIL_RECOVERY_CONTAINER);
}

// 使用綁定的 Email 與救援金鑰解鎖並取出主密碼
export async function recoverMasterPasswordWithEmail(
  email: string,
  rescueCode: string
): Promise<string | null> {
  const raw = localStorage.getItem(STORAGE_KEYS.EMAIL_RECOVERY_CONTAINER);
  if (!raw) return null;

  try {
    const container = JSON.parse(raw);
    const normalizedEmail = email.trim().toLowerCase();
    const inputEmailHash = await sha256(normalizedEmail);

    if (inputEmailHash !== container.emailHash) {
      return null; // Email 與當初綁定不符
    }

    const salt = hexToBuffer(container.salt);
    const recoveryPass = `${normalizedEmail}:${rescueCode.trim().toUpperCase()}`;
    const recoveryKey = await deriveKeyFromPassword(recoveryPass, salt, 100000);

    const masterPassword = await decryptAESGCM(container.ciphertext, container.iv, recoveryKey);
    return masterPassword;
  } catch (err) {
    console.error('Email recovery decryption failed', err);
    return null;
  }
}
