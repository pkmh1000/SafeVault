import React from 'react';
import { X, Check, Palette, Sparkles, Moon, Sun } from 'lucide-react';
import { THEMES, ThemeDefinition, ThemeId, getThemeConfig } from '../utils/theme';

interface ThemeSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSwitcherModal: React.FC<ThemeSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const currentConfig = getThemeConfig(currentTheme);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in touch-manipulation">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200 ${
          currentConfig.isDark
            ? 'bg-[#131b2c] border-slate-700/80 text-slate-100 shadow-black/60'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            currentConfig.isDark ? 'border-slate-800 bg-[#0f172a]/60' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                currentConfig.isDark ? 'bg-cyan-950/80 text-cyan-400' : 'bg-sky-50 text-sky-600'
              }`}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">畫面風格外觀</h3>
              <p className={`text-xs ${currentConfig.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                選擇您喜愛的專屬視覺配色（支援 OLED 純黑防窺與金庫綠）
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition cursor-pointer active:scale-95 ${
              currentConfig.isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="關閉風格選擇視窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme List */}
        <div className="p-4 overflow-y-auto space-y-3">
          {(Object.values(THEMES) as ThemeDefinition[]).map(theme => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  onSelectTheme(theme.id);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer min-h-[58px] active:scale-[0.99] ${
                  isSelected
                    ? theme.isDark
                      ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-[#162238]'
                      : 'border-slate-900 ring-2 ring-slate-900/20 bg-slate-100/70'
                    : currentConfig.isDark
                    ? 'border-slate-800/80 bg-[#0d1524]/60 hover:border-slate-700 hover:bg-[#111b2e]'
                    : 'border-slate-200/90 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                {/* Left: Swatch Palette Preview & Name */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Swatch Pill */}
                  <div
                    className="w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner overflow-hidden relative"
                    style={{
                      backgroundColor: theme.palette.previewBg,
                      borderColor: theme.palette.previewBorder,
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-lg border shadow-xs"
                      style={{
                        backgroundColor: theme.palette.previewSurface,
                        borderColor: theme.palette.previewBorder,
                      }}
                    />
                    <div
                      className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full ring-1 ring-black/40"
                      style={{ backgroundColor: theme.palette.previewAccent }}
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">
                        {theme.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-medium inline-flex items-center gap-1 shrink-0 ${
                          theme.isDark
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {theme.isDark ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                        <span>{theme.isDark ? '暗黑防窺' : '明亮簡約'}</span>
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-0.5 line-clamp-1 ${
                        currentConfig.isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {theme.description}
                    </p>
                  </div>
                </div>

                {/* Right: Selected check indicator */}
                <div className="shrink-0 flex items-center justify-center">
                  {isSelected ? (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        theme.isDark
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full border ${
                        currentConfig.isDark ? 'border-slate-700' : 'border-slate-300'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-between text-xs ${
            currentConfig.isDark ? 'border-slate-800 bg-[#0f172a]/60 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'
          }`}
        >
          <span>已即時儲存於本機偏好</span>
          <button
            type="button"
            onClick={onClose}
            className={`min-h-[44px] px-5 py-2 font-bold rounded-xl transition cursor-pointer active:scale-95 ${
              currentConfig.isDark
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
