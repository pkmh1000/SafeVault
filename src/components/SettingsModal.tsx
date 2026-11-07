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
  FileSpreadsheet,
  ShieldAlert,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  Palette,
  Moon,
  Sun,
} from 'lucide-react';
import { THEMES, ThemeId, getThemeConfig, applyThemeColorToDOM } from '../utils/theme';
import {
  exportVaultItemsToCSV,
  triggerCSVDownload,
  generateCSVBackupFilename,
} from '../utils/csvExport';
import {
  CURRENT_APP_VERSION,
  IS_CURRENT_BETA,
  TARGET_STABLE_VERSION,
  APP_CHANGELOG,
  fetchRemoteVersionInfo,
} from '../utils/version';
import { ChangelogModal } from './ChangelogModal';
import { UserManualModal } from './UserManualModal';
import { AppSettings, VaultPayload } from '../types/vault';
import { deriveKeyFromPassword, generateSalt } from '../services/cryptoService';
import { saveVaultPayload, wipeLocalVault, unlockVault, reEncryptVaultWithNewPassword } from '../services/storageService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  isBiometricsSupported,
  isBiometricsConfigured,
  registerBiometrics,
  disableBiometrics,
  generateEmergencyRescueCode,
  setupEmailRecovery,
  isEmailRecoveryConfigured,
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
  onOpenManual?: () => void;
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
  onOpenManual,
}) => {
  const [autoLock, setAutoLock] = useState(settings.autoLockMinutes);
  const [clipboardSec, setClipboardSec] = useState(settings.clearClipboardSeconds);
  const [maskPw, setMaskPw] = useState(settings.maskPasswordsByDefault);
  const [showInternalManual, setShowInternalManual] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(settings.theme || 'classic');

  // Biometrics
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(isBiometricsConfigured());
  const [bioStatusMsg, setBioStatusMsg] = useState('');

  // Email recovery
  const [recoveryEmail, setRecoveryEmail] = useState(settings.recoveryEmail || '');
  const [rescueCode, setRescueCode] = useState('');
  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [copiedRescue, setCopiedRescue] = useState(false);
  const [isEmailConfigured, setIsEmailConfigured] = useState(isEmailRecoveryConfigured());
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // App sharing & version
  const [shareSuccessMsg, setShareSuccessMsg] = useState('');
  const [showChangelogDetails, setShowChangelogDetails] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [pendingReleaseTitle, setPendingReleaseTitle] = useState<string | null>(null);
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  const [updateCheckResult, setUpdateCheckResult] = useState('');
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [isUpdatingNow, setIsUpdatingNow] = useState(false);

  // Change master password
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentMasterPass, setCurrentMasterPass] = useState('');
  const [showCurrentMasterPass, setShowCurrentMasterPass] = useState(false);
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [showNewMasterPassword, setShowNewMasterPassword] = useState(false);
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [newGeneratedRescueCode, setNewGeneratedRescueCode] = useState<string | null>(null);
  const [copiedNewRescueCode, setCopiedNewRescueCode] = useState(false);

  // Wipe confirmation
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  // CSV Export
  const [showCSVExportModal, setShowCSVExportModal] = useState(false);
  const [includeDeletedInCSV, setIncludeDeletedInCSV] = useState(false);
  const [includeCustomFieldsInCSV, setIncludeCustomFieldsInCSV] = useState(true);
  const [maskPasswordsInCSV, setMaskPasswordsInCSV] = useState(false);
  const [csvExportSuccessMsg, setCsvExportSuccessMsg] = useState('');
  const [csvExportErrorMsg, setCsvExportErrorMsg] = useState('');
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  // In-App Master Password Authorization Modal (取代原生 prompt，絕不洩漏網域名稱且支援星號遮罩)
  interface AuthPromptModalState {
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'biometrics' | 'emailRecovery';
  }
  const [authModal, setAuthModal] = useState<AuthPromptModalState | null>(null);
  const [authModalPassword, setAuthModalPassword] = useState('');
  const [authModalShowPassword, setAuthModalShowPassword] = useState(false);
  const [authModalError, setAuthModalError] = useState('');
  const [authModalLoading, setAuthModalLoading] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    isBiometricsSupported().then(supported => {
      setBioSupported(supported);
      setBioEnabled(isBiometricsConfigured());
    });

    if (isOpen) {
      // 進入設定頁時，背景非侵入式探測伺服器是否有新版本發布
      fetchRemoteVersionInfo().then(remote => {
        if (remote.hasUpdate) {
          setHasPendingUpdate(true);
          setIsLatestVersion(false);
          setPendingVersion(remote.serverVersion);
          setPendingReleaseTitle(remote.releaseInfo?.title || null);
        }
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
      theme: currentTheme,
    };
    onUpdateSettings(updated);
    applyThemeColorToDOM(THEMES[currentTheme]);
    onClose();
  };

  const handleSelectTheme = (newTheme: ThemeId) => {
    setCurrentTheme(newTheme);
    const updated = { ...settings, theme: newTheme };
    onUpdateSettings(updated);
    applyThemeColorToDOM(THEMES[newTheme]);
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    setBioStatusMsg('');
    if (!enabled) {
      disableBiometrics();
      setBioEnabled(false);
      setBioStatusMsg('已關閉生物辨識');
      return;
    }

    // 開啟自製授權彈窗，取代原生 prompt
    setAuthModal({
      isOpen: true,
      title: '授權啟用生物辨識',
      description: '請輸入當前的主密碼以授權啟用指紋 / FaceID：',
      actionType: 'biometrics',
    });
    setAuthModalPassword('');
    setAuthModalError('');
    setAuthModalShowPassword(false);
  };

  const handleSetupEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatusMsg('');
    if (!recoveryEmail.trim()) return;

    // 開啟自製授權彈窗，取代原生 prompt
    setAuthModal({
      isOpen: true,
      title: '驗證綁定救援信箱',
      description: `請輸入當前主密碼以驗證並綁定救援信箱（${recoveryEmail.trim()}）：`,
      actionType: 'emailRecovery',
    });
    setAuthModalPassword('');
    setAuthModalError('');
    setAuthModalShowPassword(false);
  };

  const handleConfirmAuthModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authModalPassword) {
      setAuthModalError('請輸入當前主密碼');
      return;
    }

    setAuthModalLoading(true);
    setAuthModalError('');

    try {
      // 驗證主密碼是否正確
      const unlocked = await unlockVault(authModalPassword);
      if (!unlocked) {
        setAuthModalError('主密碼不正確，請重新輸入');
        setAuthModalLoading(false);
        return;
      }

      if (authModal?.actionType === 'biometrics') {
        const ok = await registerBiometrics(authModalPassword);
        if (ok) {
          setBioEnabled(true);
          setBioStatusMsg('指紋 / FaceID 生物辨識啟用成功！');
        } else {
          setBioStatusMsg('生物辨識啟用失敗或已取消');
        }
      } else if (authModal?.actionType === 'emailRecovery') {
        const newCode = generateEmergencyRescueCode();
        setRescueCode(newCode);
        await setupEmailRecovery(recoveryEmail.trim(), authModalPassword, newCode);
        onUpdateSettings({ ...settings, recoveryEmail: recoveryEmail.trim() });
        setIsEmailConfigured(true);
        setIsEditingEmail(false);
        setEmailStatusMsg('救援信箱已綁定！請務必立即抄寫備存下方的 16 碼緊急救援金鑰。');
      }

      setAuthModal(null);
      setAuthModalPassword('');
      setAuthModalError('');
    } catch (err: any) {
      setAuthModalError(err?.message || '授權驗證失敗，請再試一次');
    } finally {
      setAuthModalLoading(false);
    }
  };

  const handleRemoveEmailRecovery = () => {
    localStorage.removeItem('safevault_email_recovery_v1');
    setIsEmailConfigured(false);
    setIsEditingEmail(false);
    setRescueCode('');
    setRecoveryEmail('');
    onUpdateSettings({ ...settings, recoveryEmail: '' });
    setEmailStatusMsg('已解除離線救援信箱綁定');
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

    if (!currentMasterPass) {
      setPwErrorMsg('請輸入當前主密碼以驗證身分');
      return;
    }

    if (newMasterPassword.length < 8) {
      setPwErrorMsg('新主密碼長度建議至少 8 個字元以上');
      return;
    }
    if (newMasterPassword !== confirmMasterPassword) {
      setPwErrorMsg('兩次輸入的新主密碼不一致');
      return;
    }
    if (newMasterPassword === currentMasterPass) {
      setPwErrorMsg('新主密碼不得與當前主密碼相同');
      return;
    }

    setIsChangingPw(true);
    try {
      // 1. 嚴格驗證當前主密碼是否能正確解鎖
      const currentUnlocked = await unlockVault(currentMasterPass);
      if (!currentUnlocked) {
        setPwErrorMsg('當前主密碼不正確，無法授權變更');
        setIsChangingPw(false);
        return;
      }

      // 2. 使用 reEncryptVaultWithNewPassword 生成全新 Salt 與新金鑰，保證 100% 同步
      const { key: newKey } = await reEncryptVaultWithNewPassword(vaultPayload, newMasterPassword);
      onKeyUpdated(newKey);

      // 3. 若有設定 Email 救援，自動同步更新救援容器並生成新救援金鑰
      const activeEmail = (recoveryEmail || settings.recoveryEmail || '').trim();
      let generatedCode: string | null = null;
      if (isEmailConfigured && activeEmail) {
        generatedCode = generateEmergencyRescueCode();
        await setupEmailRecovery(activeEmail, newMasterPassword, generatedCode);
        setNewGeneratedRescueCode(generatedCode);
      }

      // 4. 若開啟生物辨識，使用新密碼重新註冊
      if (bioEnabled) {
        await registerBiometrics(newMasterPassword);
      }

      setPwSuccessMsg(
        generatedCode
          ? `主密碼變更成功！所有資料已重新加密。已為您同步更新離線救援憑證，請查看並抄存下方的新金鑰。`
          : `主密碼變更成功！所有資料已使用全新 300,000 次 PBKDF2 金鑰重新加密。`
      );
      setCurrentMasterPass('');
      setNewMasterPassword('');
      setConfirmMasterPassword('');
      if (!generatedCode) {
        setTimeout(() => {
          setShowPasswordChange(false);
          setPwSuccessMsg('');
        }, 2200);
      }
    } catch (err) {
      setPwErrorMsg('變更密碼失敗，請稍後重試');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleCopyNewRescueCode = async () => {
    if (!newGeneratedRescueCode) return;
    const activeEmail = (recoveryEmail || settings.recoveryEmail || '').trim();
    const text = `【SafeVault 離線救援憑證（變更主密碼更新版）】\n綁定信箱: ${activeEmail}\n16 碼緊急救援金鑰: ${newGeneratedRescueCode}\n\n說明：主密碼變更後，日後若忘記主密碼，輸入此金鑰與信箱即可離線解鎖重設。`;
    const res = await copyToClipboardSecure(text, '新救援金鑰', 0);
    if (res.success) {
      setCopiedNewRescueCode(true);
      setTimeout(() => setCopiedNewRescueCode(false), 2000);
    }
  };

  const handleExecuteCSVExport = () => {
    setIsExportingCSV(true);
    setCsvExportErrorMsg('');
    setCsvExportSuccessMsg('');

    try {
      const deletedItems = vaultPayload.recentlyDeleted || [];
      const result = exportVaultItemsToCSV(
        vaultPayload.items,
        deletedItems,
        {
          includeDeleted: includeDeletedInCSV,
          includeCustomFields: includeCustomFieldsInCSV,
          maskPasswords: maskPasswordsInCSV,
        }
      );

      const filename = generateCSVBackupFilename(maskPasswordsInCSV);
      const ok = triggerCSVDownload(filename, result.csvString);

      if (ok) {
        setCsvExportSuccessMsg(`已成功匯出備份檔案：${filename}（共 ${result.count} 筆單元）！`);
        setShowCSVExportModal(false);
        setTimeout(() => {
          setCsvExportSuccessMsg('');
        }, 6000);
      } else {
        setCsvExportErrorMsg('瀏覽器下載被阻擋或發生錯誤，請稍後重試');
      }
    } catch (err: any) {
      setCsvExportErrorMsg(err?.message || '匯出 CSV 過程發生錯誤');
    } finally {
      setIsExportingCSV(false);
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

    try {
      // 1. 遠端無快取即時檢查伺服器端點 (version.json + no-store)
      const remote = await fetchRemoteVersionInfo();

      // 2. 同步檢查 Service Worker 佇列 (若有 PWA 離線更新註冊)
      let swHasUpdate = false;
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            if (reg.waiting) {
              swHasUpdate = true;
              break;
            }
            await reg.update().catch(() => {});
            if (reg.waiting || reg.installing) {
              swHasUpdate = true;
              break;
            }
          }
        } catch (e) {}
      }

      setIsCheckingUpdate(false);

      if (remote.hasUpdate || swHasUpdate) {
        const newVer = remote.hasUpdate ? remote.serverVersion : '新發布版本';
        setHasPendingUpdate(true);
        setIsLatestVersion(false);
        setPendingVersion(newVer);
        setPendingReleaseTitle(remote.releaseInfo?.title || null);
        setUpdateCheckResult(`🎉 發現新版本 ${newVer} 待更新！(目前執行版本: ${CURRENT_APP_VERSION})`);
      } else {
        setHasPendingUpdate(false);
        setPendingVersion(null);
        setIsLatestVersion(true);
        setUpdateCheckResult(`檢查完成：目前已是最新版本 (${CURRENT_APP_VERSION})，無待更新項目！`);
      }
    } catch (err: any) {
      setIsCheckingUpdate(false);
      setUpdateCheckResult(`檢查連線異常，目前本機執行版本為 ${CURRENT_APP_VERSION}`);
    }
  };

  const handleApplyImmediateUpdate = async () => {
    setIsUpdatingNow(true);
    setUpdateCheckResult('正在清除本機舊程式快取並套用最新版本...');
    try {
      // 1. 清除瀏覽器 CacheStorage，防止載入到舊的 bundle
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }

      // 2. 通知 Service Worker 跳過等待並啟用新版
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }
    } catch (e) {}

    // 3. 破除快取並強制重整載入最新前端檔案
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.href = `${cleanUrl}?_v=${Date.now()}`;
    }, 400);
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
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer active:scale-95"
            aria-label="關閉設定"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Section: Visual Themes (畫面風格) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Palette className="w-4 h-4 text-sky-600" />
                <span>畫面風格外觀 (8 大精選視覺風格)</span>
              </div>
              <span className="text-[10px] text-sky-700 bg-sky-100/80 font-bold px-2 py-0.5 rounded-full border border-sky-200">
                {THEMES[currentTheme]?.name || '韓系淡粉櫻'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              包含韓系淡粉紅、溫暖奶茶、清新翠綠、晴空澄淨淡藍，以及經典白與 OLED 防窺暗黑風格：
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5">
              {(Object.values(THEMES)).map(th => {
                const isSelected = currentTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleSelectTheme(th.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer min-h-[48px] active:scale-[0.98] ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-lg border shrink-0 relative shadow-inner overflow-hidden flex items-center justify-center"
                      style={{
                        backgroundColor: th.palette.previewBg,
                        borderColor: th.palette.previewBorder,
                      }}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: th.palette.previewAccent }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate leading-tight">
                        {th.name}
                      </div>
                      <div className={`text-[9px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {th.isDark ? '暗黑防窺' : '明亮簡約'}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>綁定 Email 離線緊急救援</span>
              </div>
              {isEmailConfigured && !rescueCode && (
                <span className="text-[10px] text-emerald-700 bg-emerald-100/80 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  已啟用離線救援
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              若忘記主密碼，可憑此 Email 與 16 碼緊急金鑰進行本機離線驗證解鎖並重設密碼：
            </p>

            {/* 狀態 A：剛生成 16 碼金鑰（強制提醒立即備存，附帶隱藏關閉按鈕） */}
            {rescueCode && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2.5 animate-in fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>您的專屬 16 碼緊急救援金鑰</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRescueCode}
                    className="text-amber-900 hover:text-black font-bold text-xs flex items-center gap-1 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    {copiedRescue ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRescue ? '已複製憑證' : '一鍵複製憑證'}</span>
                  </button>
                </div>

                <div className="font-mono text-sm font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-amber-200/90 text-center tracking-widest select-all shadow-inner">
                  {rescueCode}
                </div>

                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  ⚠️ <strong>請務必立即手動抄寫或複製備存！</strong> 本系統恪守零知識隱私原則，本機<strong>絕不明文儲存此金鑰</strong>。關閉後金鑰將永久隱藏，以確保他人無法在本裝置偷窺。
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setRescueCode('');
                    setIsEditingEmail(false);
                    setEmailStatusMsg('已妥善隱藏金鑰明文，離線救援設定生效！');
                  }}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  我已妥善記錄金鑰，隱藏並完成綁定
                </button>
              </div>
            )}

            {/* 狀態 B：已綁定狀態（日常防窺：不顯示金鑰明文，提供更換或解除綁定） */}
            {isEmailConfigured && !isEditingEmail && !rescueCode && (
              <div className="p-3 bg-white border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>已綁定救援信箱</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    容器已加密存於本機
                  </span>
                </div>

                <div className="text-xs text-slate-800 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200 break-all font-semibold">
                  {recoveryEmail || settings.recoveryEmail}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  基於防窺與零知識安全原則，16 碼緊急金鑰已於生成時由您備存，本機<strong>不會明文留存金鑰</strong>。日後登入若忘記主密碼，憑信箱與您備存的金鑰即可無痛解鎖並還原所有資料。
                </p>

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(true)}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer text-center"
                  >
                    更換信箱或重設金鑰
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveEmailRecovery}
                    className="py-1.5 px-3 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    解除綁定
                  </button>
                </div>
              </div>
            )}

            {/* 狀態 C：尚未綁定 或 正在更換信箱表單 */}
            {(!isEmailConfigured || isEditingEmail) && !rescueCode && (
              <form onSubmit={handleSetupEmailRecovery} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="輸入救援信箱 (例如: user@gmail.com)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shrink-0 cursor-pointer shadow-xs active:scale-95"
                  >
                    {isEmailConfigured ? '重新綁定生成新金鑰' : '綁定並生成金鑰'}
                  </button>
                </div>
                {isEditingEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingEmail(false);
                      setRecoveryEmail(settings.recoveryEmail || '');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                  >
                    取消更換
                  </button>
                )}
              </form>
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
                    當前主密碼 (授權驗證)
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentMasterPass ? 'text' : 'password'}
                      required
                      value={currentMasterPass}
                      onChange={e => setCurrentMasterPass(e.target.value)}
                      placeholder="請輸入當前的主密碼..."
                      className="w-full px-3 py-1.5 pr-9 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrentMasterPass(!showCurrentMasterPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentMasterPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    新主密碼 (至少 8 字元)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewMasterPassword ? 'text' : 'password'}
                      required
                      value={newMasterPassword}
                      onChange={e => setNewMasterPassword(e.target.value)}
                      placeholder="輸入至少 8 位字元的新主密碼..."
                      className="w-full px-3 py-1.5 pr-9 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewMasterPassword(!showNewMasterPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewMasterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
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

                {isEmailConfigured && (
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 flex items-start gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      已偵測到綁定救援信箱。完成變更後，系統將<strong>自動同步更新救援憑證並生成新救援金鑰</strong>供您備存，確保日後離線救援絕對有效。
                    </span>
                  </div>
                )}

                {pwErrorMsg && (
                  <div className="p-2 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pwErrorMsg}</span>
                  </div>
                )}
                {pwSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="leading-snug">{pwSuccessMsg}</span>
                  </div>
                )}

                {/* Newly Generated Rescue Code Card */}
                {newGeneratedRescueCode && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>新 16 碼緊急救援金鑰</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyNewRescueCode}
                        className="text-xs text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        {copiedNewRescueCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedNewRescueCode ? '已複製' : '一鍵複製'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-900 bg-white p-2 rounded-lg border border-amber-200 text-center tracking-widest select-all">
                      {newGeneratedRescueCode}
                    </div>
                    <p className="text-[10px] text-amber-900/90 leading-tight">
                      主密碼變更後，此新金鑰即刻生效。請妥善抄存後點擊下方完成按鈕。
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewGeneratedRescueCode(null);
                        setShowPasswordChange(false);
                        setPwSuccessMsg('');
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition"
                    >
                      我已記錄新金鑰，完成密碼變更
                    </button>
                  </div>
                )}

                {!newGeneratedRescueCode && (
                  <button
                    type="submit"
                    disabled={isChangingPw}
                    className="w-full py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer shadow-xs active:scale-98"
                  >
                    {isChangingPw ? '驗證重新加密中...' : '確認更新主密碼'}
                  </button>
                )}
              </form>
            )}
          </div>

          {/* Section: Export Decrypted CSV Backup */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>匯出帳密備份 (CSV 試算表)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full border border-emerald-200">
                共 {vaultPayload.items.length} 筆帳密
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              將保險庫中已解密的全部帳號、密碼、分類、備註與自訂欄位完整匯出為標準 CSV 試算表格式（內嵌 UTF-8 BOM 編碼，相容 Excel 與 Google 試算表繁體中文顯示），便於離線冷儲存或遷移至外部備份方案。
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCsvExportErrorMsg('');
                  setShowCSVExportModal(true);
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>匯出帳密備份檔案 (.csv)</span>
              </button>
            </div>

            {csvExportSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="leading-snug">{csvExportSuccessMsg}</span>
              </div>
            )}
            {csvExportErrorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{csvExportErrorMsg}</span>
              </div>
            )}
          </div>

          {/* Section: In-App User Manual Guide */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>SafeVault 使用手冊與操作指南</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded-full border border-sky-200">
                本機隨身手冊
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              內建完整使用說明（與本專案首頁 README 保持同步），涵蓋 PWA 安裝、樹枝階層目錄、自訂隱蔽欄位、編輯復原、光學近場同步、CSV 備份與常見問答。
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onOpenManual) {
                    onOpenManual();
                  } else {
                    setShowInternalManual(true);
                  }
                }}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4" />
                <span>開啟完整使用手冊與操作指南</span>
              </button>
            </div>
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

              {/* Action Buttons: 檢查是否有更新、立即更新、查看更新記錄 */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                {/* 發現新版本時：醒目彈出新版提示卡片與專用【立即更新】按鍵 */}
                {hasPendingUpdate && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>發現新版本 {pendingVersion || ''} 可供更新！</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-200/80 text-amber-950 font-bold rounded-full">
                        待更新
                      </span>
                    </div>

                    {pendingReleaseTitle && (
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        更新摘要：{pendingReleaseTitle}
                      </p>
                    )}

                    {/* 立即更新按鍵：僅在偵測到新版本時提供 */}
                    <button
                      type="button"
                      disabled={isUpdatingNow}
                      onClick={handleApplyImmediateUpdate}
                      className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Sparkles className={`w-4 h-4 text-amber-300 ${isUpdatingNow ? 'animate-spin' : ''}`} />
                      <span>{isUpdatingNow ? '正在清除快取並載入最新版...' : `立即更新至 ${pendingVersion || '最新版'}`}</span>
                    </button>
                  </div>
                )}

                {/* 預設功能按鍵：檢查更新 與 查看記錄 (若已是最新版本，不顯示立即更新鍵) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isCheckingUpdate}
                    onClick={handleCheckUpdate}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-sky-600' : ''}`} />
                    <span>{isCheckingUpdate ? '檢查中...' : '檢查是否有更新'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowChangelogModal(true)}
                    className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>查看更新記錄</span>
                  </button>
                </div>

                {/* 已是最新版本狀態提示 (未待更新時顯示) */}
                {!hasPendingUpdate && (
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>目前已是最新版本 ({CURRENT_APP_VERSION})，無待更新項目</span>
                  </div>
                )}

                {/* 檢查結果回饋提示 (若有特別訊息) */}
                {updateCheckResult && (
                  <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 animate-fade-in ${
                    hasPendingUpdate
                      ? 'bg-amber-50/80 border border-amber-200 text-amber-900'
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

      {/* CSV Export Safety Confirmation Modal */}
      {showCSVExportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">匯出解密帳密備份確認</h3>
                  <button
                    type="button"
                    onClick={() => setShowCSVExportModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  即將把保險庫資料轉為未加密的 CSV 試算表檔案
                </p>
              </div>
            </div>

            {/* High Security Warning Box */}
            <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200/90 text-xs space-y-2 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>重要安全警示：明文檔案風險告知</span>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                匯出的 CSV 檔案包含<strong>完全解密後的真實帳號與密碼</strong>。任何取得該檔案的人皆可直接檢視您的敏感資料！
              </p>
              <ul className="text-[11px] text-amber-800 space-y-1 list-disc list-inside">
                <li>請優先存放在具備硬體加密的隨身碟 (如 BitLocker / FileVault) 或冷儲存硬碟。</li>
                <li>嚴禁上傳至未受保護的公用雲端或公共電腦。</li>
                <li>檢視或完成手動備份後，建議徹底清除本機暫存檔。</li>
              </ul>
            </div>

            {/* Export Statistics & Options */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="text-[11px] font-semibold text-slate-700">匯出範圍與選項：</div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCustomFieldsInCSV}
                    onChange={e => setIncludeCustomFieldsInCSV(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-slate-700 text-xs">
                    包含各單元自訂屬性欄位 (信用卡有效期、CVV、統編等)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDeletedInCSV}
                    onChange={e => setIncludeDeletedInCSV(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="text-slate-700 text-xs">
                    額外包含最近刪除回收站單元 ({vaultPayload.recentlyDeleted?.length || 0} 筆)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none p-2 bg-sky-50/70 border border-sky-100 rounded-xl">
                  <input
                    type="checkbox"
                    checked={maskPasswordsInCSV}
                    onChange={e => setMaskPasswordsInCSV(e.target.checked)}
                    className="rounded border-sky-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-sky-950 block">脫敏防窺安全備份模式</span>
                    <span className="text-[11px] text-sky-700 block">
                      密碼與敏感欄位改以星號 (••••••••) 遮罩輸出，僅保留帳號與分類，適合存檔列印與分享
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                <span>預計匯出單元總數：</span>
                <span className="font-bold text-slate-900">
                  {vaultPayload.items.length + (includeDeletedInCSV ? (vaultPayload.recentlyDeleted?.length || 0) : 0)} 筆單元
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowCSVExportModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isExportingCSV}
                onClick={handleExecuteCSVExport}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingCSV ? '處理中...' : '確認匯出並下載 CSV'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Master Password Authorization Modal (取代原生 prompt，絕不洩漏網域名稱，支援星號遮罩與防窺開關) */}
      {authModal && authModal.isOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{authModal.title}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">SafeVault 安全授權驗證</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthModal(null);
                  setAuthModalPassword('');
                  setAuthModalError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {authModal.description}
            </p>

            <form onSubmit={handleConfirmAuthModal} className="space-y-3">
              <div className="relative">
                <input
                  type={authModalShowPassword ? 'text' : 'password'}
                  autoFocus
                  placeholder="請輸入當前主密碼"
                  value={authModalPassword}
                  onChange={e => {
                    setAuthModalPassword(e.target.value);
                    if (authModalError) setAuthModalError('');
                  }}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm font-mono tracking-wider bg-slate-50/50 text-slate-900"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setAuthModalShowPassword(!authModalShowPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {authModalShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authModalError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 animate-in fade-in duration-100">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{authModalError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModal(null);
                    setAuthModalPassword('');
                    setAuthModalError('');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={authModalLoading || !authModalPassword}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {authModalLoading ? '驗證中...' : '確認'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Changelog Modal */}
      <ChangelogModal
        isOpen={showChangelogModal}
        onClose={() => setShowChangelogModal(false)}
      />

      {/* In-App User Manual Modal */}
      <UserManualModal
        isOpen={showInternalManual}
        onClose={() => setShowInternalManual(false)}
      />
    </div>
  );
};
