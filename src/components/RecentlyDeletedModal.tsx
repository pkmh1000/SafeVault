import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Trash2,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import { DeletedVaultItem, VaultItem } from '../types/vault';
import { copyToClipboardSecure } from '../utils/clipboard';

interface RecentlyDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedItems: DeletedVaultItem[];
  onRestoreItem: (item: VaultItem) => void;
  onRestoreAll: () => void;
  onPermanentlyDeleteItem: (id: string) => void;
  onEmptyTrash: () => void;
}

export const RecentlyDeletedModal: React.FC<RecentlyDeletedModalProps> = ({
  isOpen,
  onClose,
  deletedItems,
  onRestoreItem,
  onRestoreAll,
  onPermanentlyDeleteItem,
  onEmptyTrash,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (text: string, label: string) => {
    const res = await copyToClipboardSecure(text, label, 30);
    if (res.success) {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1800);
    }
  };

  const filteredList = deletedItems.filter(entry => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const item = entry.item;
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.account || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.notes || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">最近刪除與防誤刪回收站</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  共 {deletedItems.length} 筆
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                誤刪的帳密均安全保存在此，隨時可一鍵還原救回
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search and Bulk Actions */}
        {deletedItems.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋已刪除之帳密、服務名稱或分類..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600"
                >
                  清除
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onRestoreAll}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-sky-200/80"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>全部還原</span>
              </button>
              <button
                type="button"
                onClick={onEmptyTrash}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-rose-200/80"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空回收站</span>
              </button>
            </div>
          </div>
        )}

        {/* List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {deletedItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">回收站目前是空的</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                若在保險庫中刪除任何帳密單元，系統會自動移入此處暫存備份，避免記憶不易的密碼意外遺失。
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              無相符的搜尋結果，請嘗試其他關鍵字
            </div>
          ) : (
            filteredList.map(({ item, deletedAt }) => {
              const isPasswordVisible = visiblePasswords.has(item.id);
              const formattedDeletedDate = new Date(deletedAt).toLocaleString('zh-TW', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 hover:border-slate-300 transition shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                          {item.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {item.category}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>刪除於 {formattedDeletedDate}</span>
                          </span>
                        </div>

                        {/* Account and Password Details Preview */}
                        <div className="mt-2 space-y-1.5 text-xs font-mono">
                          {item.account && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="text-slate-400 text-[11px] w-10 shrink-0 font-sans">帳號:</span>
                              <span className="truncate bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
                                {item.account}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.account, `acc_${item.id}`)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                                title="複製帳號"
                              >
                                {copiedField === `acc_${item.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {item.password && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <span className="text-slate-400 text-[11px] w-10 shrink-0 font-sans">密碼:</span>
                              <span className="truncate bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
                                {isPasswordVisible ? item.password : '••••••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(item.id)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                                title={isPasswordVisible ? '隱藏' : '檢視密碼'}
                              >
                                {isPasswordVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.password, `pw_${item.id}`)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                                title="複製密碼"
                              >
                                {copiedField === `pw_${item.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Fields or Notes Badge count */}
                        {item.fields && item.fields.length > 0 && (
                          <div className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Layers className="w-3 h-3" />
                            <span>內含 {item.fields.length} 個自訂欄位完整保留</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Restore or Permanently Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onRestoreItem(item)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>還原救回</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onPermanentlyDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="永久徹底刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            💡 提示：所有刪除單元均在本地加密保存，還原後將立即重新入庫於保險庫首頁。
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
