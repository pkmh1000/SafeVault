import React, { useState } from 'react';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  Layers,
} from 'lucide-react';
import { VaultItem } from '../types/vault';
import { copyToClipboardSecure } from '../utils/clipboard';

interface VaultCardProps {
  item: VaultItem;
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onGenerateTemplateFromItem?: (item: VaultItem) => void;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  item,
  onEdit,
  onDelete,
  onGenerateTemplateFromItem,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const itemFields = Array.isArray(item.fields) ? item.fields : [];
  const sensitiveFields = itemFields.filter(f => f.isSensitive);
  const normalFields = itemFields.filter(f => !f.isSensitive);

  const handleCopy = async (text: string, label: string) => {
    const res = await copyToClipboardSecure(text, label, 30);
    if (res.success) {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1800);
    }
  };

  const formattedDate = new Date(item.updatedAt).toLocaleDateString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition duration-150 flex flex-col justify-between">
      <div>
        {/* Header: Title, Category, Actions */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">
              {item.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
              <span>{item.category}</span>
              <span aria-hidden="true">·</span>
              <span>更新 {formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* 根據單元格式一鍵生成新範本 */}
            {onGenerateTemplateFromItem && (
              <button
                onClick={() => onGenerateTemplateFromItem(item)}
                title="以此項目格式生成新範本"
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onEdit(item)}
              title="編輯此帳密"
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              title="刪除此帳密"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Core Line 1: 帳號 */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100 group">
            <div className="min-w-0 flex items-baseline gap-1.5 pr-2">
              <span className="text-[11px] font-medium text-slate-500 shrink-0">
                帳號:
              </span>
              <span className="text-xs font-mono font-semibold text-slate-900 truncate select-all">
                {item.account || '未填寫'}
              </span>
            </div>
            {item.account && (
              <button
                onClick={() => handleCopy(item.account, '帳號')}
                title="複製帳號"
                className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition shrink-0"
              >
                {copiedField === '帳號' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Core Line 2: 密碼 */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100 group">
            <div className="min-w-0 flex items-baseline gap-1.5 pr-2">
              <span className="text-[11px] font-medium text-slate-500 shrink-0">
                密碼:
              </span>
              <span className="text-xs font-mono font-semibold text-slate-900 truncate select-all tracking-wider">
                {item.password
                  ? showPassword
                    ? item.password
                    : '••••••••••••'
                  : '未填寫'}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {item.password && (
                <>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? '隱藏密碼' : '顯示密碼'}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCopy(item.password, '密碼')}
                    title="複製密碼 (30秒後自動清空)"
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition"
                  >
                    {copiedField === '密碼' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 顯示區 (一般公開欄位) */}
        {normalFields.length > 0 && (
          <div className="space-y-1 mb-2 pt-1 border-t border-slate-100">
            {normalFields.map(field => (
              <div
                key={field.id}
                className="flex items-center justify-between py-1 px-2.5 rounded-xl hover:bg-slate-50 text-xs transition"
              >
                <div className="min-w-0 flex items-baseline gap-1.5 pr-2">
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {field.label}:
                  </span>
                  <span className="text-xs font-mono text-slate-700 truncate select-all">
                    {field.value || '-'}
                  </span>
                </div>
                {field.value && (
                  <button
                    onClick={() => handleCopy(field.value, field.label)}
                    title={`複製 ${field.label}`}
                    className="p-1 text-slate-300 hover:text-sky-600 rounded transition shrink-0"
                  >
                    {copiedField === field.label ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 不顯示區 / 敏感資料遮罩區 (選擇性顯示開關) */}
        {sensitiveFields.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowSensitiveFields(!showSensitiveFields)}
              className="w-full flex items-center justify-between py-1.5 px-3 rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] font-medium transition"
            >
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {showSensitiveFields
                    ? `敏感資料區 (共 ${sensitiveFields.length} 項)`
                    : `敏感資料已遮罩 (${sensitiveFields.length} 項未顯示)`}
                </span>
              </div>
              {showSensitiveFields ? (
                <ChevronUp className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
              )}
            </button>

            {showSensitiveFields && (
              <div className="mt-2 space-y-1 pl-1">
                {sensitiveFields.map(field => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-amber-50/30 text-xs"
                  >
                    <div className="min-w-0 flex items-baseline gap-1.5 pr-2">
                      <span className="text-[11px] text-amber-700 font-medium shrink-0">
                        {field.label}:
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-800 truncate select-all">
                        {field.value || '-'}
                      </span>
                    </div>
                    {field.value && (
                      <button
                        onClick={() => handleCopy(field.value, field.label)}
                        title={`複製 ${field.label}`}
                        className="p-1 text-slate-400 hover:text-amber-800 rounded transition shrink-0"
                      >
                        {copiedField === field.label ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes (if any) */}
        {item.notes && (
          <p className="mt-2 text-[11px] text-slate-400 italic line-clamp-2 px-1">
            備註: {item.notes}
          </p>
        )}
      </div>
    </div>
  );
};
