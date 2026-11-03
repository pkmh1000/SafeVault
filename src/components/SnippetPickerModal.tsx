import React, { useState } from 'react';
import {
  X,
  Search,
  Check,
  Copy,
  Tag,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Mail,
  Building,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { IdentitySnippet, SnippetCategory } from '../types/vault';
import { copyToClipboardSecure } from '../utils/clipboard';

interface SnippetPickerModalProps {
  isOpen: boolean;
  snippets: IdentitySnippet[];
  onClose: () => void;
  onSelect: (value: string, label?: string, isSensitive?: boolean) => void;
}

export const SnippetPickerModal: React.FC<SnippetPickerModalProps> = ({
  isOpen,
  snippets,
  onClose,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filtered = snippets.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (category: SnippetCategory) => {
    switch (category) {
      case 'phone': return <Phone className="w-4 h-4 text-emerald-600" />;
      case 'address': return <MapPin className="w-4 h-4 text-sky-600" />;
      case 'birthday': return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'id_card': return <FileText className="w-4 h-4 text-purple-600" />;
      case 'tax_id': return <Building className="w-4 h-4 text-indigo-600" />;
      case 'email': return <Mail className="w-4 h-4 text-rose-600" />;
      default: return <Tag className="w-4 h-4 text-slate-600" />;
    }
  };

  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async (snippet: IdentitySnippet, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await copyToClipboardSecure(snippet.value, snippet.title, 30);
    if (res.success) {
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">調用常用個人資料字串</h2>
            <p className="text-xs text-slate-500">點擊直接填入此欄位，亦可單獨複製</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="搜尋電話、地址、生日、統編、標籤..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              無相符常用資料，可至「常用資料」分頁進行新增
            </div>
          ) : (
            filtered.map(snippet => {
              const isRevealed = revealedIds.has(snippet.id);

              return (
                <div
                  key={snippet.id}
                  onClick={() => {
                    onSelect(snippet.value, snippet.title, snippet.isSensitive);
                    onClose();
                  }}
                  className="group flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/40 cursor-pointer transition text-left"
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-sky-100 transition shrink-0 mt-0.5">
                      {getCategoryIcon(snippet.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {snippet.title}
                        </span>
                        {snippet.isSensitive && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-50 text-amber-800 rounded font-semibold border border-amber-200/80 flex items-center gap-0.5 shrink-0">
                            <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                            <span>隱蔽</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 font-mono break-all mt-0.5 line-clamp-2">
                        {snippet.isSensitive && !isRevealed ? (
                          <span className="text-slate-400 tracking-widest font-bold">
                            ••••••••••••
                          </span>
                        ) : (
                          snippet.value
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* 敏感資料眼睛切換 */}
                    {snippet.isSensitive && (
                      <button
                        type="button"
                        onClick={e => toggleReveal(snippet.id, e)}
                        title={isRevealed ? '隱藏敏感內容' : '點擊查看敏感內容'}
                        className="p-2 text-slate-400 hover:text-amber-700 hover:bg-white rounded-lg transition cursor-pointer"
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopy(snippet, e)}
                      title="單獨複製此字串"
                      className="p-2 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition cursor-pointer"
                    >
                      {copiedId === snippet.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelect(snippet.value, snippet.title, snippet.isSensitive);
                        onClose();
                      }}
                      className="text-[11px] font-medium text-sky-600 hover:text-sky-800 px-2.5 py-1 bg-sky-100/70 hover:bg-sky-200/80 rounded-lg transition cursor-pointer"
                    >
                      帶入
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
