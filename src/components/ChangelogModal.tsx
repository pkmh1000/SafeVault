import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
} from 'lucide-react';
import {
  CURRENT_APP_VERSION,
  IS_CURRENT_BETA,
  TARGET_STABLE_VERSION,
  APP_CHANGELOG,
  VersionRelease,
} from '../utils/version';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerUpdate?: () => void;
  hasPendingUpdate?: boolean;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  isOpen,
  onClose,
  onTriggerUpdate,
  hasPendingUpdate = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUpdateNow = () => {
    setIsUpdating(true);
    setTimeout(() => {
      if (onTriggerUpdate) {
        onTriggerUpdate();
      } else {
        // Force refresh PWA / service worker cache
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) {
              registration.update();
            }
          });
        }
        window.location.reload();
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">版本中心與更新記錄</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                  {CURRENT_APP_VERSION} (測試版)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                可先查閱更新內容，再自主決定是否套用更新
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Zero Data Loss Guarantee Banner */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-emerald-950 block">
                進版安全保證：升級絕不影響已建帳密資料！
              </span>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                SafeVault 採 100% 本地隔離架構。版本更新僅升級前端操作介面與安全性增強，<strong>絕對不會清除、覆蓋或變動瀏覽器內部已加密的任何帳號密碼、範本或常用資料</strong>。
              </p>
            </div>
          </div>

          {/* Version Roadmap Status */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">當前執行階段</span>
              <span className="font-bold text-slate-800">
                {CURRENT_APP_VERSION} · Beta 測試版
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[11px]">正式版規劃目標</span>
              <span className="font-bold text-sky-700">
                {TARGET_STABLE_VERSION}
              </span>
            </div>
          </div>

          {/* Changelog Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>詳細版本變更歷史 (Changelog)</span>
            </h3>

            <div className="space-y-3.5">
              {APP_CHANGELOG.map((item, idx) => {
                const isCurrent = item.version === CURRENT_APP_VERSION;
                return (
                  <div
                    key={item.version}
                    className={`p-4 rounded-2xl border transition ${
                      isCurrent
                        ? 'bg-sky-50/50 border-sky-200 ring-1 ring-sky-200/50'
                        : item.isBeta === false
                        ? 'bg-slate-50/70 border-slate-200 opacity-90'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {item.version}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white shadow-2xs">
                            目前執行版本
                          </span>
                        )}
                        {item.isBeta && !isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Beta
                          </span>
                        )}
                        {!item.isBeta && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            正式版規劃
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.releaseDate}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-800 mb-2">
                      {item.title}
                    </h4>

                    <ul className="space-y-1.5 text-[11px] text-slate-600 pl-1">
                      {item.highlights.map((hl, hlIdx) => (
                        <li key={hlIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{hl}</span>
                        </li>
                      ))}
                    </ul>

                    {item.securityNote && (
                      <p className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                        🛡️ {item.securityNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            關閉視窗
          </button>

          {hasPendingUpdate ? (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleUpdateNow}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer animate-pulse"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? '正在重整更新快取...' : '發現新版本：立即更新'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>目前已是最新版本 ({CURRENT_APP_VERSION})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
