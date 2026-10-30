import React, { useState } from 'react';
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
} from 'lucide-react';
import { AppSettings, VaultPayload } from '../types/vault';
import { deriveKeyFromPassword } from '../services/cryptoService';
import { saveVaultPayload, wipeLocalVault } from '../services/storageService';
import { usePWAInstall } from '../hooks/usePWAInstall';

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

  // Change master password
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Wipe confirmation
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    const updated: AppSettings = {
      autoLockMinutes: autoLock,
      clearClipboardSeconds: clipboardSec,
      maskPasswordsByDefault: maskPw,
    };
    onUpdateSettings(updated);
    onClose();
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
      const { generateSalt } = await import('../services/cryptoService');
      const newSalt = generateSalt();
      const newKey = await deriveKeyFromPassword(newMasterPassword, newSalt);

      // Re-encrypt vault with new key
      await saveVaultPayload(vaultPayload, newKey);
      onKeyUpdated(newKey);

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

  const handleWipeVault = () => {
    wipeLocalVault();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">安全性與偏好設定</h2>
              <p className="text-xs text-slate-500">逾時鎖定、剪貼簿防護與 PWA 離線安裝</p>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section: Auto Lock Timeout */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>自動超時防窺鎖定機制</span>
            </div>
            <p className="text-xs text-slate-500">
              設定當使用者無操作或離開應用時，自動清除記憶體金鑰並鎖定畫面：
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
            <p className="text-xs text-slate-500">
              複製帳號或密碼後，於指定秒數後自動覆蓋清除剪貼簿，避免其他應用竊取：
            </p>
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

          {/* Section: PWA Offline Install */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>安裝為獨立應用程式 (PWA 網頁安裝包)</span>
              </div>
              {isInstalled && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                  已安裝本機
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              安裝後即可直接從手機主畫面或電腦桌面一鍵開啟，無瀏覽器網址列，完全離線秒開！
            </p>

            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={install}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>一鍵安裝 SafeVault 至裝置主畫面</span>
              </button>
            )}

            {isIOS && !isInstalled && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(true)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
                >
                  iPhone / iPad 安裝指引
                </button>
                {showIOSGuide && (
                  <div className="mt-2 p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-700">
                    <p className="font-semibold text-slate-900">iOS Safari 安裝步驟：</p>
                    <p>1. 點擊 Safari 底部工具列的「分享 (Share)」圖示。</p>
                    <p>2. 向下滑動找到並點擊「加入主畫面 (Add to Home Screen)」。</p>
                    <p>3. 點擊右上角「加入」，即可在手機桌面像原生 App 一樣使用！</p>
                  </div>
                )}
              </div>
            )}
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

                {pwErrorMsg && (
                  <p className="text-xs text-red-600">{pwErrorMsg}</p>
                )}
                {pwSuccessMsg && (
                  <p className="text-xs text-emerald-600">{pwSuccessMsg}</p>
                )}

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

          {/* Danger zone: Wipe Vault */}
          <div className="p-4 bg-red-50/50 rounded-2xl border border-red-200/80 space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
              <Trash2 className="w-4 h-4" />
              <span>危險區域：重設清空本機資料庫</span>
            </div>
            <p className="text-xs text-slate-500">
              若要重設主密碼或徹底銷毀本機記錄，可清空本機 IndexedDB 與 LocalStorage。
            </p>

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
            立即上鎖保險庫
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
    </div>
  );
};
