import React, { useState } from 'react';
import { Shield, Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { evaluatePasswordStrength } from '../services/cryptoService';

interface LockScreenProps {
  isInitialized: boolean;
  onUnlock: (password: string) => Promise<boolean>;
  onInitialize: (password: string) => Promise<boolean>;
  onResetVault: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isInitialized,
  onUnlock,
  onInitialize,
  onResetVault,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const strength = evaluatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password.trim()) {
      setErrorMsg('請輸入主密碼');
      return;
    }

    if (!isInitialized) {
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
        const ok = await onInitialize(password);
        if (!ok) {
          setErrorMsg('初始化失敗，請稍候重試');
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-50 text-slate-900 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white mb-3 shadow-md shadow-slate-900/10">
            <Shield className="w-9 h-9 text-sky-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            SafeVault
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isInitialized ? '請輸入主密碼以解鎖您的離線保險庫' : '首次使用：請設定您的專屬主密碼'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>完全離線運作 · AES-256 軍規加密保護</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isInitialized ? '主密碼 (Master Password)' : '設定主密碼'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isInitialized ? '輸入主密碼...' : '建議包含大小寫字母、數字與符號'}
                autoFocus
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!isInitialized && password && (
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

          {!isInitialized && (
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
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200/60 leading-relaxed">
                ⚠️ 重要提醒：本保險庫零聯網且不備份至雲端，若遺忘主密碼將<strong>無法透過客服找回</strong>，請務必牢記或妥善保管。
              </p>
            </div>
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
                <span>處理中...</span>
              </>
            ) : isInitialized ? (
              <span>解鎖保險庫</span>
            ) : (
              <span>建立並初始化保險庫</span>
            )}
          </button>
        </form>

        {/* Footer actions */}
        {isInitialized && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-slate-400 hover:text-red-600 transition"
              >
                忘記密碼或需要重設？
              </button>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl text-left border border-slate-200">
                <p className="text-xs font-semibold text-red-600 mb-1">重設本機資料庫警告</p>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  若重設將會清除本機所有已儲存的密碼紀錄。此動作無法復原！
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onResetVault}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition"
                  >
                    確定完全清除重設
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-slate-400 flex items-center gap-1.5">
        <span>SafeVault v1.0</span>
        <span>·</span>
        <span>純本機儲存</span>
        <span>·</span>
        <span>無伺服器</span>
      </div>
    </div>
  );
};
