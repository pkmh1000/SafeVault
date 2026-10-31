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
  KeyRound,
} from 'lucide-react';
import { VaultItem } from '../types/vault';
import { copyToClipboardSecure } from '../utils/clipboard';

interface VaultCardProps {
  item: VaultItem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showCategoryBadge?: boolean;
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onGenerateTemplateFromItem?: (item: VaultItem) => void;
}

export const VaultCard: React.FC<VaultCardProps> = ({
  item,
  isExpanded: controlledExpanded,
  onToggleExpand,
  showCategoryBadge = false,
  onEdit,
  onDelete,
  onGenerateTemplateFromItem,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const toggleExpand = onToggleExpand || (() => setInternalExpanded(prev => !prev));

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

  const formattedDate = new Date(item.updatedAt || Date.now()).toLocaleDateString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <div
      className={`bg-white border rounded-2xl transition duration-150 overflow-hidden ${
        isExpanded
          ? 'border-sky-300 shadow-sm ring-1 ring-sky-100'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
      }`}
    >
      {/* 條目收合/展開標題列 (點擊才開啟目前單元) */}
      <div
        onClick={toggleExpand}
        className="flex items-center justify-between p-3 sm:px-4 sm:py-3 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div
            className={`p-1.5 rounded-xl shrink-0 transition ${
              isExpanded ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {item.title}
              </span>
              {showCategoryBadge && item.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0">
                  {item.category}
                </span>
              )}
            </div>

            {/* 收合狀態下的小預覽 */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              {item.account && (
                <span className="text-slate-600 truncate">
                  帳號: {item.account}
                </span>
              )}
              {itemFields.length > 0 && (
                <span className="text-slate-400 shrink-0">
                  · {itemFields.length} 欄位
                </span>
              )}
              <span className="text-slate-300 shrink-0 hidden sm:inline">
                · {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* 右側：快速複製與展開指示符 */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {/* 未展開時的快速複製帳號 */}
          {!isExpanded && item.account && (
            <button
              type="button"
              onClick={() => handleCopy(item.account, '帳號')}
              title="快速複製帳號"
              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
            >
              {copiedField === '帳號' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* 展開/收合箭頭按鍵 */}
          <button
            type="button"
            onClick={toggleExpand}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title={isExpanded ? '收合單元' : '點擊開啟單元明細'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-sky-600" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* 展開後的詳細內容區塊 */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/30 space-y-3 animate-fade-in">
          {/* 單元操作列 */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-b border-slate-100 pb-2">
            <span>分類: <strong className="text-slate-600">{item.category || '通用'}</strong> · 更新於 {formattedDate}</span>
            <div className="flex items-center gap-1 shrink-0">
              {onGenerateTemplateFromItem && (
                <button
                  type="button"
                  onClick={() => onGenerateTemplateFromItem(item)}
                  title="以此項目格式生成新範本"
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">生成範本</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onEdit(item)}
                title="編輯此帳密"
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>編輯</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                title="刪除此帳密"
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除</span>
              </button>
            </div>
          </div>

          {/* Core Line 1: 帳號 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
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
                  type="button"
                  onClick={() => handleCopy(item.account, '帳號')}
                  title="複製帳號"
                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded-lg transition shrink-0 cursor-pointer"
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
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
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
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? '隱藏密碼' : '顯示密碼'}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.password, '密碼')}
                      title="複製密碼 (30秒後自動清空)"
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-50 rounded-lg transition cursor-pointer"
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

          {/* 顯示區 (一般公開自訂欄位) */}
          {normalFields.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {normalFields.map(field => (
                <div
                  key={field.id}
                  className="flex items-center justify-between py-1.5 px-2.5 bg-white rounded-xl border border-slate-100 text-xs transition"
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
                      type="button"
                      onClick={() => handleCopy(field.value, field.label)}
                      title={`複製 ${field.label}`}
                      className="p-1 text-slate-400 hover:text-sky-600 rounded transition shrink-0 cursor-pointer"
                    >
                      {copiedField === field.label ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 不顯示區 / 敏感資料遮罩區 (選擇性顯示開關) */}
          {sensitiveFields.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowSensitiveFields(!showSensitiveFields)}
                className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200/70 text-amber-900 text-[11px] font-medium transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {showSensitiveFields
                      ? `敏感隱私欄位 (共 ${sensitiveFields.length} 項)`
                      : `敏感隱私已遮罩 (${sensitiveFields.length} 項未顯示)`}
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
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-amber-50/40 border border-amber-100 text-xs"
                    >
                      <div className="min-w-0 flex items-baseline gap-1.5 pr-2">
                        <span className="text-[11px] text-amber-800 font-medium shrink-0">
                          {field.label}:
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-800 truncate select-all">
                          {field.value || '-'}
                        </span>
                      </div>
                      {field.value && (
                        <button
                          type="button"
                          onClick={() => handleCopy(field.value, field.label)}
                          title={`複製 ${field.label}`}
                          className="p-1 text-slate-400 hover:text-amber-800 rounded transition shrink-0 cursor-pointer"
                        >
                          {copiedField === field.label ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
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
            <p className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-100 italic leading-relaxed">
              備註: {item.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
