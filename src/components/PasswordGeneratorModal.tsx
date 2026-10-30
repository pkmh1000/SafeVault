import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Copy, Check, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { generateStrongPassword, evaluatePasswordStrength, GeneratePasswordOptions } from '../services/cryptoService';
import { copyToClipboardSecure } from '../utils/clipboard';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (password: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [options, setOptions] = useState<GeneratePasswordOptions>({
    length: 18,
    useUpper: true,
    useLower: true,
    useDigits: true,
    useSymbols: true,
    excludeAmbiguous: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const refreshPassword = () => {
    const pw = generateStrongPassword(options);
    setGeneratedPassword(pw);
    setCopied(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshPassword();
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  const strength = evaluatePasswordStrength(generatedPassword);

  const handleCopy = async () => {
    const res = await copyToClipboardSecure(generatedPassword, '隨機強密碼', 30);
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (onApply && generatedPassword) {
      onApply(generatedPassword);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">隨機強密碼產生器</h2>
              <p className="text-xs text-slate-500">高熵值密碼學安全真隨機生成</p>
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
        <div className="p-5 space-y-5">
          {/* Output Display */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-base font-semibold text-slate-900 break-all select-all tracking-wider">
                {generatedPassword}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={refreshPassword}
                  title="重新產生"
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopy}
                  title="複製密碼"
                  className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition flex items-center gap-1"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Strength meter */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                強度評估: <strong className={strength.color}>{strength.label}</strong>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {strength.entropyBits} bits 熵值
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Length Slider & Quick Presets */}
            <div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
                <span>密碼長度: <strong className="text-slate-900 font-mono text-sm">{options.length}</strong> 字元</span>
                <span className="text-slate-400">最少 4 碼 · 推薦 16~24 碼</span>
              </div>
              <input
                type="range"
                min="4"
                max="64"
                value={options.length}
                onChange={e => setOptions({ ...options, length: parseInt(e.target.value) || 4 })}
                className="w-full accent-slate-900 cursor-pointer"
              />
              {/* Quick length presets */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400">快速長度:</span>
                {[4, 8, 12, 16, 24, 32].map(len => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setOptions({ ...options, length: len })}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold transition cursor-pointer ${
                      options.length === len
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {len}碼{len === 4 ? '(PIN)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={options.useUpper}
                  onChange={e => setOptions({ ...options, useUpper: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>大寫字母 (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={options.useLower}
                  onChange={e => setOptions({ ...options, useLower: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>小寫字母 (a-z)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={options.useDigits}
                  onChange={e => setOptions({ ...options, useDigits: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>數字 (0-9)</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={options.useSymbols}
                  onChange={e => setOptions({ ...options, useSymbols: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>特殊符號 (!@#$)</span>
              </label>
            </div>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={options.excludeAmbiguous}
                onChange={e => setOptions({ ...options, excludeAmbiguous: e.target.checked })}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <span>排除易混淆字元 (例如 0, O, o, 1, l, I)</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition"
          >
            關閉
          </button>
          {onApply && (
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
            >
              帶入此密碼
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
