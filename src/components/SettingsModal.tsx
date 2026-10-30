import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Clock,
  Clipboard,
  KeyRound,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Fingerprint,
  Mail,
  Copy,
  Check,
  Share2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import {
  CURRENT_APP_VERSION,
  IS_CURRENT_BETA,
  TARGET_STABLE_VERSION,
  APP_CHANGELOG,
} from '../utils/version';
import { ChangelogModal } from './ChangelogModal';
import { AppSettings, VaultPayload } from '../types/vault';
import { deriveKeyFromPassword, generateSalt } from '../services/cryptoService';
import { saveVaultPayload, wipeLocalVault } from '../services/storageService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  isBiometricsSupported,
  isBiometricsConfigured,
  registerBiometrics,
  disableBiometrics,
  generateEmergencyRescueCode,
  setupEmailRecovery,
} from '../services/biometricService';
import { copyToClipboardSecure } from '../utils/clipboard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  vaultPayload: VaultPayload;
  currentKey: CryptoKey;
  onKeyUpdated: (newKey: CryptoKey) => void;
  onLockNow: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  vaultPayload,
  currentKey,
  onKeyUpdated,
  onLockNow,
}) => {
  const [autoLock, setAutoLock] = useState(settings.autoLockMinutes);
  const [clipboardSec, setClipboardSec] = useState(settings.clearClipboardSeconds);
  const [maskPw, setMaskPw] = useState(settings.maskPasswordsByDefault);

  // Biometrics
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(isBiometricsConfigured());
  const [bioStatusMsg, setBioStatusMsg] = useState('');

  // Email recovery
  const [recoveryEmail, setRecoveryEmail] = useState(settings.recoveryEmail || '');
  const [rescueCode, setRescueCode] = useState('');
  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [copiedRescue, setCopiedRescue] = useState(false);

  // App sharing & version
  const [shareSuccessMsg, setShareSuccessMsg] = useState('');
  const [showChangelogDetails, setShowChangelogDetails] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false);
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  const [updateCheckResult, setUpdateCheckResult] = useState('');
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  // Change master password
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Wipe confirmation
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    isBiometricsSupported().then(supported => {
      setBioSupported(supported);
      setBioEnabled(isBiometricsConfigured());
    });

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) {
          if (reg.waiting) {
            setHasPendingUpdate(true);
            setIsLatestVersion(false);
            return;
          }
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    const updated: AppSettings = {
      ...settings,
      autoLockMinutes: autoLock,
      clearClipboardSeconds: clipboardSec,
      maskPasswordsByDefault: maskPw,
      biometricsEnabled: bioEnabled,
      recoveryEmail: recoveryEmail.trim(),
    };
    onUpdateSettings(updated);
    onClose();
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    setBioStatusMsg('');
    if (!enabled) {
      disableBiometrics();
      setBioEnabled(false);
      setBioStatusMsg('已關閉生物辨識');
      return;
    }

    // To register biometrics, we need current master password to encrypt
    const pass = prompt('請輸入當前的主密碼以授權啟用指紋 / FaceID：');
    if (!pass) return;

    const ok = await registerBiometrics(pass);
    if (ok) {
      setBioEnabled(true);
      setBioStatusMsg('指紋 / FaceID 生物辨識啟用成功！');
    } else {
      setBioStatusMsg('生物辨識啟用失敗或已取消');
    }
  };

  const handleSetupEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatusMsg('');
    if (!recoveryEmail.trim()) return;

    const pass = prompt('請輸入當前主密碼以驗證綁定救援信箱：');
    if (!pass) return;

    const newCode = generateEmergencyRescueCode();
    setRescueCode(newCode);
    try {
      await setupEmailRecovery(recoveryEmail.trim(), pass, newCode);
      setEmailStatusMsg(`救援信箱已綁定！請務必複製備存下方的 16 碼緊急救援金鑰。`);
    } catch {
      setEmailStatusMsg('綁定救援信箱失敗');
    }
  };

  const handleCopyRescueCode = async () => {
    if (!rescueCode) return;
    const text = `【SafeVault 離線救援憑證】\n綁定信箱: ${recoveryEmail}\n16 碼緊急救援金鑰: ${rescueCode}\n\n說明：忘記密碼時，輸入此金鑰與信箱即可離線解鎖重設密碼。`;
    const res = await copyToClipboardSecure(text, '救援金鑰', 0);
    if (res.success) {
      setCopiedRescue(true);
      setTimeout(() => setCopiedRescue(false), 2000);
    }
  };

  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErrorMsg('');
    setPwSuccessMsg('');

    if (newMasterPassword.length < 8) {
      setPwErrorMsg('新主密碼長度建議至少 8 個字元以上');
      return;
    }
    if (newMasterPassword !== confirmMasterPassword) {
      setPwErrorMsg('兩次輸入的新主密碼不符');
      return;
    }

    setIsChangingPw(true);
    try {
      const newSalt = generateSalt();
      const newKey = await deriveKeyFromPassword(newMasterPassword, newSalt);

      // Re-encrypt vault with new key
      await saveVaultPayload(vaultPayload, newKey);
      onKeyUpdated(newKey);

      // Re-register biometrics if enabled
      if (bioEnabled) {
        await registerBiometrics(newMasterPassword);
      }

      setPwSuccessMsg('主密碼已成功變更！所有資料已使用新金鑰重新加密。');
      setNewMasterPassword('');
      setConfirmMasterPassword('');
      setTimeout(() => {
        setShowPasswordChange(false);
        setPwSuccessMsg('');
      }, 2000);
    } catch (err) {
      setPwErrorMsg('變更密碼失敗，請稍後重試');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleShareApp = async () => {
    setShareSuccessMsg('');
    const shareUrl = window.location.origin + window.location.pathname;
    const shareData = {
      title: 'SafeVault 離線安全密碼庫',
      text: 'SafeVault - 100% 離線本地加密、無聯網外洩風險的極致密碼與敏感資料庫 (PWA)',
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareSuccessMsg('感謝分享 SafeVault！');
        setTimeout(() => setShareSuccessMsg(''), 3000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback to clipboard
    const res = await copyToClipboardSecure(shareUrl, 'SafeVault 網址', 0);
    if (res.success) {
      setShareSuccessMsg('已複製 SafeVault App 網址至剪貼簿！可傳送給好友或在其他裝置瀏覽器開啟安裝。');
      setTimeout(() => setShareSuccessMsg(''), 4000);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateCheckResult('');
    let foundUpdate = false;
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            foundUpdate = true;
            break;
          }
          await reg.update();
          if (reg.waiting || reg.installing) {
            foundUpdate = true;
            break;
          }
        }
      } catch (e) {}
    }
    setTimeout(() => {
      setIsCheckingUpdate(false);
      if (foundUpdate) {
        setHasPendingUpdate(true);
        setIsLatestVersion(false);
        setUpdateCheckResult('發現新版本！請點擊「立即更新」載入最新版本。');
      } else {
        setHasPendingUpdate(false);
        setIsLatestVersion(true);
        setUpdateCheckResult(`檢查完成：目前已是最新版本 (${CURRENT_APP_VERSION})，無待更新項目！`);
        setTimeout(() => setUpdateCheckResult(''), 5000);
      }
    }, 700);
  };

  const handleWipeVault = () => {
    wipeLocalVault();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">安全性與偏好設定</h2>
              <p className="text-xs text-slate-500">生物辨識、救援信箱、逾時鎖定與 PWA 安裝</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Section: Biometrics */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Fingerprint className="w-4 h-4 text-sky-600" />
                <span>生物辨識快速解鎖 (TouchID / FaceID / 指紋)</span>
              </div>
              {bioSupported ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bioEnabled}
                    onChange={e => handleToggleBiometrics(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                </label>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                  本機不支援
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              開啟後每次進入 SafeVault 點擊指紋/FaceID 即可秒開，不需每次手動鍵入複雜密碼。
            </p>
            {bioStatusMsg && (
              <p className="text-xs text-sky-700 font-medium">{bioStatusMsg}</p>
            )}
          </div>

          {/* Section: Email Recovery */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>綁定 Email 離線緊急救援</span>
            </div>
            <p className="text-xs text-slate-500">
              若忘記主密碼，可憑此 Email 與 16 碼緊急金鑰進行本機驗證解鎖並重設密碼：
            </p>

            <form onSubmit={handleSetupEmailRecovery} className="flex gap-2">
              <input
                type="email"
                required
                value={recoveryEmail}
                onChange={e => setRecoveryEmail(e.target.value)}
                placeholder="輸入救援信箱 (例如: user@gmail.com)"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shrink-0"
              >
                綁定生成金鑰
              </button>
            </form>

            {rescueCode && (
              <div className="p-2.5 bg-white border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>您的專屬 16 碼緊急金鑰:</span>
                  <button
                    type="button"
                    onClick={handleCopyRescueCode}
                    className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
                  >
                    {copiedRescue ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>複製憑證</span>
                  </button>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800 select-all tracking-wider">
                  {rescueCode}
                </div>
              </div>
            )}
            {emailStatusMsg && (
              <p className="text-xs text-indigo-700 font-medium">{emailStatusMsg}</p>
            )}
          </div>

          {/* Section: Auto Lock Timeout */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>自動超時防窺鎖定機制</span>
            </div>
            <p className="text-xs text-slate-500">
              設定當使用者無操作或離開應用時，自動清除記憶體金鑰並鎖定畫面（登入後仍會維持原畫面）：
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: '切換視窗立即鎖定', val: 0 },
                { label: '閒置 1 分鐘', val: 1 },
                { label: '閒置 3 分鐘', val: 3 },
                { label: '閒置 5 分鐘', val: 5 },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setAutoLock(opt.val)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition text-center ${
                    autoLock === opt.val
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Clipboard Auto-Clear */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Clipboard className="w-4 h-4 text-emerald-600" />
              <span>剪貼簿自動清空防護</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '15 秒', val: 15 },
                { label: '30 秒', val: 30 },
                { label: '60 秒', val: 60 },
                { label: '不清空', val: 0 },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setClipboardSec(opt.val)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border transition text-center ${
                    clipboardSec === opt.val
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Change Master Password */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <KeyRound className="w-4 h-4 text-slate-700" />
                <span>變更主密碼 (Master Password)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="text-xs text-sky-600 hover:text-sky-800 font-medium"
              >
                {showPasswordChange ? '收合' : '展開變更'}
              </button>
            </div>

            {showPasswordChange && (
              <form onSubmit={handleChangeMasterPassword} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    新主密碼
                  </label>
                  <input
                    type="password"
                    required
                    value={newMasterPassword}
                    onChange={e => setNewMasterPassword(e.target.value)}
                    placeholder="輸入至少 8 位字元的新主密碼..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    再次確認新主密碼
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmMasterPassword}
                    onChange={e => setConfirmMasterPassword(e.target.value)}
                    placeholder="再次輸入新主密碼..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                {pwErrorMsg && <p className="text-xs text-red-600">{pwErrorMsg}</p>}
                {pwSuccessMsg && <p className="text-xs text-emerald-600">{pwSuccessMsg}</p>}

                <button
                  type="submit"
                  disabled={isChangingPw}
                  className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
                >
                  {isChangingPw ? '重新加密儲存中...' : '確認更新主密碼'}
                </button>
              </form>
            )}
          </div>

          {/* Section: Share App */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Share2 className="w-4 h-4 text-sky-600" />
              <span>分享 SafeVault 離線密碼庫</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              將 SafeVault 分享給好友，或在另一台手機、平板與電腦開啟並安裝為離線 App：
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleShareApp}
                className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>立即分享 / 複製 App 安裝連結</span>
              </button>
            </div>
            {shareSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{shareSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Section: App Version & Safe Upgrade Assurance */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>版本與更新管理中心</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full border border-amber-200">
                  {CURRENT_APP_VERSION} (測試版)
                </span>
              </div>
            </div>

            {/* Version Roadmap & Status */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">當前執行版本</span>
                  <span className="font-bold text-slate-800">{CURRENT_APP_VERSION} (Beta)</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">預定正式發布</span>
                  <span className="font-bold text-sky-700">{TARGET_STABLE_VERSION}</span>
                </div>
              </div>

              {/* Action Buttons for User Self-Decision */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isCheckingUpdate}
                    onClick={handleCheckUpdate}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-sky-600' : ''}`} />
                    <span>{isCheckingUpdate ? '正在檢查更新...' : '檢查是否有更新'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowChangelogModal(true)}
                    className="py-1.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>查看更新記錄</span>
                  </button>

                  {/* ONLY show update button when there is a real pending update */}
                  {hasPendingUpdate && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                          navigator.serviceWorker.getRegistrations().then(regs => {
                            for (const reg of regs) {
                              if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                            }
                          });
                        }
                        window.location.reload();
                      }}
                      className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer animate-pulse"
                      title="立即套用更新"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>發現新版本：立即更新</span>
                    </button>
                  )}
                </div>

                {/* If already latest version and no pending update */}
                {!hasPendingUpdate && isLatestVersion && !updateCheckResult && (
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>目前已是最新版本 ({CURRENT_APP_VERSION})，無待更新項目</span>
                  </div>
                )}

                {updateCheckResult && (
                  <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 animate-fade-in ${
                    hasPendingUpdate
                      ? 'bg-amber-50 border border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}>
                    {hasPendingUpdate ? (
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span>{updateCheckResult}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reassurance Banner: Version updates NEVER touch vault items */}
            <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1.5 text-xs text-slate-700">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>進版安全承諾：升級絕不影響已建單元資料！</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                SafeVault 為 100% 本地端執行的 PWA 應用。未來網頁進版或功能更新，僅透過 Service Worker 升級前端程式快取，<strong>絕對不會更動、覆蓋或清除您已儲存在瀏覽器本地的任何帳號密碼、範本或自訂字串</strong>！您的所有資料皆使用 AES-256-GCM 妥善加密存於本機。
              </p>
            </div>
          </div>

          {/* Danger zone: Wipe Vault */}
          <div className="p-4 bg-red-50/50 rounded-2xl border border-red-200/80 space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
              <Trash2 className="w-4 h-4" />
              <span>危險區域：重設清空本機資料庫</span>
            </div>
            {!showWipeConfirm ? (
              <button
                type="button"
                onClick={() => setShowWipeConfirm(true)}
                className="px-3 py-1.5 bg-white border border-red-300 text-red-700 text-xs font-medium rounded-xl hover:bg-red-50 transition"
              >
                重設清空本機保險庫...
              </button>
            ) : (
              <div className="p-3 bg-white border border-red-300 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-red-700">
                  確定要完全清除？所有未備份的帳號密碼都將立即銷毀！
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleWipeVault}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
                  >
                    確定完全銷毀重設
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWipeConfirm(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-lg transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onLockNow}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition"
          >
            立即手動上鎖 (Logout)
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
          >
            儲存設定
          </button>
        </div>
      </div>

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
      />
    </div>
  );
};
