import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Fingerprint,
  Mail,
  Copy,
  Check,
  ArrowLeft,
  LifeBuoy,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { evaluatePasswordStrength } from '../services/cryptoService';
import {
  CURRENT_APP_VERSION,
  IS_CURRENT_BETA,
} from '../utils/version';
import {
  isBiometricsSupported,
  isBiometricsConfigured,
  authenticateWithBiometrics,
  registerBiometrics,
  generateEmergencyRescueCode,
  setupEmailRecovery,
  isEmailRecoveryConfigured,
  recoverMasterPasswordWithEmail,
} from '../services/biometricService';
import { copyToClipboardSecure } from '../utils/clipboard';

interface LockScreenProps {
  isInitialized: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onInitialize: (password: string, recoveryEmail?: string) => Promise<boolean>;
  onResetVault: () => void;
  onResetPasswordWithRecovery: (newPassword: string) => Promise<boolean>;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isInitialized,
  onUnlock,
  onInitialize,
  onResetVault,
  onResetPasswordWithRecovery,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAdvancedDanger, setShowAdvancedDanger] = useState(false);

  // Biometrics
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioConfigured, setBioConfigured] = useState(false);
  const [enableBioOnSetup, setEnableBioOnSetup] = useState(true);

  // Email Recovery Mode
  const [mode, setMode] = useState<'login' | 'setup' | 'email_recovery' | 'reset_password_after_recovery'>(
    isInitialized ? 'login' : 'setup'
  );
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [rescueCode, setRescueCode] = useState('');
  const [setupRescueCode, setSetupRescueCode] = useState('');
  const [copiedRescue, setCopiedRescue] = useState(false);

  // New password after recovery
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const strength = evaluatePasswordStrength(password);
  const newStrength = evaluatePasswordStrength(newPassword);

  // Check biometric support on mount
  useEffect(() => {
    isBiometricsSupported().then(supported => {
      setBioAvailable(supported);
      setBioConfigured(isBiometricsConfigured());
    });

    if (!isInitialized) {
      setSetupRescueCode(generateEmergencyRescueCode());
    }
  }, [isInitialized]);

  // Attempt biometrics on mount if configured
  useEffect(() => {
    if (isInitialized && bioConfigured && mode === 'login') {
      handleBiometricUnlock();
    }
  }, [bioConfigured, isInitialized, mode]);

  // Handle Biometric Unlock
  const handleBiometricUnlock = async () => {
    setErrorMsg('');
    try {
      const recoveredPassword = await authenticateWithBiometrics();
      if (recoveredPassword) {
        setIsLoading(true);
        const ok = await onUnlock(recoveredPassword);
        if (!ok) {
          setErrorMsg('生物辨識解鎖成功，但解密金鑰驗證失敗');
        }
        setIsLoading(false);
      }
    } catch {
      // cancelled by user or not recognized
    }
  };

  // Submit Password Login / Setup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password.trim()) {
      setErrorMsg('請輸入主密碼');
      return;
    }

    if (mode === 'setup') {
      if (password.length < 8) {
        setErrorMsg('主密碼長度建議至少 8 個字元以上');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('兩次輸入的主密碼不一致');
        return;
      }
      setIsLoading(true);
      try {
        const ok = await onInitialize(password, recoveryEmail.trim() || undefined);
        if (!ok) {
          setErrorMsg('初始化失敗，請稍候重試');
          setIsLoading(false);
          return;
        }

        // Setup email recovery if email provided
        if (recoveryEmail.trim() && setupRescueCode) {
          await setupEmailRecovery(recoveryEmail, password, setupRescueCode);
        }

        // Prompt biometric registration if supported & enabled
        if (bioAvailable && enableBioOnSetup) {
          await registerBiometrics(password);
        }
      } catch (err) {
        setErrorMsg('初始化錯誤');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        const ok = await onUnlock(password);
        if (!ok) {
          setErrorMsg('主密碼錯誤，無法解密本機保險庫');
          setPassword('');
        }
      } catch (err) {
        setErrorMsg('解鎖過程發生錯誤');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle Email Recovery Verification
  const handleVerifyEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!recoveryEmail.trim() || !rescueCode.trim()) {
      setErrorMsg('請填寫綁定的救援信箱與 16 碼緊急救援金鑰');
      return;
    }

    setIsLoading(true);
    try {
      const recoveredMaster = await recoverMasterPasswordWithEmail(recoveryEmail, rescueCode);
      if (!recoveredMaster) {
        setErrorMsg('救援信箱或 16 碼金鑰不符，無法完成離線救援驗證');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('救援驗證成功！請立即設定您的新主密碼以重新加密保險庫');
      setMode('reset_password_after_recovery');
    } catch {
      setErrorMsg('救援驗證過程失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Setting New Master Password After Recovery
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('新主密碼長度至少需 8 個字元');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('兩次輸入的新主密碼不符');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await onResetPasswordWithRecovery(newPassword);
      if (ok) {
        // Re-register biometrics with new password if enabled
        if (bioAvailable && bioConfigured) {
          await registerBiometrics(newPassword);
        }
      } else {
        setErrorMsg('重設新密碼失敗');
      }
    } catch {
      setErrorMsg('重設密碼失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySetupRescue = async () => {
    const text = `【SafeVault 離線保險庫安全救援憑證】\n綁定信箱: ${recoveryEmail || '未填寫'}\n緊急救援碼: ${setupRescueCode}\n\n說明：當忘記主密碼時，輸入此救援碼與綁定信箱即可離線解鎖並重設新密碼。`;
    const res = await copyToClipboardSecure(text, '救援憑證', 0);
    if (res.success) {
      setCopiedRescue(true);
      setTimeout(() => setCopiedRescue(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),2rem)] bg-slate-50 text-slate-900 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 transition-all">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white mb-3 shadow-md shadow-slate-900/10">
            <Shield className="w-9 h-9 text-sky-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            SafeVault
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {mode === 'login'
              ? '請解鎖您的離線安全保險庫'
              : mode === 'setup'
              ? '首次使用：設定專屬主密碼與救援信箱'
              : mode === 'email_recovery'
              ? '忘記密碼：綁定 Email 離線緊急救援'
              : '救援成功：請設定新主密碼'}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% 離線運作 · AES-256 軍規加密保護</span>
          </div>
        </div>

        {/* MODE 1: LOGIN */}
        {mode === 'login' && (
          <div className="space-y-4">
            {/* Quick Biometrics Button with generous thumb touch target */}
            {bioAvailable && bioConfigured && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleBiometricUnlock}
                  className="w-full h-12 px-4 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/90 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition active:scale-[0.98] shadow-xs cursor-pointer"
                >
                  <Fingerprint className="w-5 h-5 text-sky-600 animate-pulse" />
                  <span>點擊使用指紋 / FaceID 快速解鎖</span>
                </button>
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200/80 w-full" />
                  <span className="bg-white px-3 text-[11px] text-slate-400 font-medium">或輸入主密碼</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  主密碼 (Master Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="輸入主密碼..."
                    autoFocus={!bioConfigured}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200/80">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                    <span>驗證解密中...</span>
                  </>
                ) : (
                  <span>解鎖保險庫</span>
                )}
              </button>

              {/* Forgot password moved safely below submit button to prevent mis-touching */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('email_recovery');
                  }}
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium hover:underline py-1 px-3 rounded-lg transition cursor-pointer"
                >
                  忘記密碼？使用綁定 Email 離線救援
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODE 2: SETUP (首次設定主密碼 + 救援信箱) */}
        {mode === 'setup' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                設定主密碼 (Master Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="建議包含大小寫字母、數字與符號"
                  autoFocus
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">密碼強度</span>
                    <span className={`font-semibold ${strength.color}`}>{strength.label} ({strength.entropyBits} bits)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.score <= 1
                          ? 'bg-red-500'
                          : strength.score === 2
                          ? 'bg-amber-500'
                          : strength.score === 3
                          ? 'bg-emerald-500'
                          : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, (strength.score + 1) * 20)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                再次確認主密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="請再次輸入相同的密碼..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Optional Email Recovery Binding */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <span>綁定救援 Email (強烈建議，忘記密碼時可救援)</span>
              </label>
              <input
                type="email"
                value={recoveryEmail}
                onChange={e => setRecoveryEmail(e.target.value)}
                placeholder="例如: yourname@gmail.com"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <div className="pt-1">
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>您的 16 碼緊急救援金鑰:</span>
                  <button
                    type="button"
                    onClick={handleCopySetupRescue}
                    className="text-sky-600 hover:text-sky-800 font-medium flex items-center gap-0.5"
                  >
                    {copiedRescue ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>複製備存</span>
                  </button>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800 bg-white p-2 rounded-lg border border-slate-200 mt-1 select-all tracking-wider text-center">
                  {setupRescueCode}
                </div>
              </div>
            </div>

            {/* Biometric Toggle if supported */}
            {bioAvailable && (
              <label className="flex items-center gap-2 p-2.5 bg-sky-50/50 border border-sky-100 rounded-xl text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableBioOnSetup}
                  onChange={e => setEnableBioOnSetup(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <Fingerprint className="w-4 h-4 text-sky-600" />
                <span>啟用指紋 / FaceID 快速解鎖 (免反覆輸入密碼)</span>
              </label>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200/80">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>初始化中...</span>
                </>
              ) : (
                <span>建立並初始化保險庫</span>
              )}
            </button>
          </form>
        )}

        {/* MODE 3: EMAIL RECOVERY (輸入綁定 Email 與救援碼) */}
        {mode === 'email_recovery' && (
          <form onSubmit={handleVerifyEmailRecovery} className="space-y-4">
            <div className="p-3.5 bg-sky-50/60 rounded-2xl border border-sky-200 text-xs text-sky-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <LifeBuoy className="w-4 h-4 text-sky-600" />
                <span>離線安全救援解鎖機制</span>
              </p>
              <p className="text-[11px] leading-relaxed text-sky-800">
                輸入您當初設定保險庫時綁定的 Email 與 16 碼緊急救援金鑰，系統將進行本機離線解密並讓您重新設定新主密碼。
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                綁定的救援 Email 地址
              </label>
              <input
                type="email"
                required
                autoFocus
                value={recoveryEmail}
                onChange={e => setRecoveryEmail(e.target.value)}
                placeholder="例如: yourname@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                16 碼緊急救援金鑰 (SAFE-XXXX-XXXX-XXXX)
              </label>
              <input
                type="text"
                required
                value={rescueCode}
                onChange={e => setRescueCode(e.target.value.toUpperCase())}
                placeholder="SAFE-XXXX-XXXX-XXXX"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200/80">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              {isLoading ? '驗證救援金鑰中...' : '驗證並進入密碼重設'}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setMode('login');
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回主密碼登入</span>
            </button>
          </form>
        )}

        {/* MODE 4: RESET PASSWORD AFTER RECOVERY */}
        {mode === 'reset_password_after_recovery' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>救援驗證成功！請立即設定您的新主密碼：</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                新主密碼 (至少 8 字元)
              </label>
              <input
                type="password"
                required
                autoFocus
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="輸入新主密碼..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {newPassword && (
                <div className="mt-1.5 flex justify-between text-[11px]">
                  <span className="text-slate-400">強度:</span>
                  <span className={`font-semibold ${newStrength.color}`}>{newStrength.label}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                再次確認新主密碼
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="再次輸入新主密碼..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200/80">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-sm"
            >
              {isLoading ? '重新加密並解鎖中...' : '確認重設並解鎖保險庫'}
            </button>
          </form>
        )}
      </div>

      {/* App Version only: 更新與資訊統一於 Setting 內處理，login 僅純文字標示 version */}
      <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs select-none">
        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <span className="font-semibold text-slate-500">SafeVault {CURRENT_APP_VERSION}</span>
          {IS_CURRENT_BETA && (
            <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600 font-medium text-[9px]">
              Beta
            </span>
          )}
        </div>

        {/* Emergency Maintenance Danger Area: Tiny discreet icon at bottom, hard to touch accidentally */}
        {isInitialized && mode === 'login' && (
          <div className="pt-3 flex justify-center">
            {!showAdvancedDanger ? (
              <button
                type="button"
                onClick={() => setShowAdvancedDanger(true)}
                title="進階異常救援"
                aria-label="進階異常救援"
                className="p-1.5 text-slate-300 hover:text-slate-500 rounded-full transition cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
              </button>
            ) : (
              <div className="max-w-xs w-full bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-left space-y-2.5 animate-fade-in mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>緊急資料庫重設（危險操作）</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvancedDanger(false);
                      setShowResetConfirm(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs p-0.5"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  若忘記密碼且無救援信箱，此功能允許完全清空本地加密庫重新初始化。
                </p>
                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition"
                  >
                    展開重設/銷毀確認
                  </button>
                ) : (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-rose-800">⚠️ 確定銷毀重設？</p>
                    <p className="text-[10px] text-rose-700 leading-tight">
                      此動作將永久清空所有本機密碼，無法復原！
                    </p>
                    <div className="flex gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={onResetVault}
                        className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        確認銷毀
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="px-2.5 py-1.5 bg-white text-slate-700 border border-slate-200 text-xs rounded-lg hover:bg-slate-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
