import React, { useState } from 'react';
import { X, Search, Check, Copy, Tag, Phone, MapPin, Calendar, FileText, Mail, Building } from 'lucide-react';
import { IdentitySnippet, SnippetCategory } from '../types/vault';
import { copyToClipboardSecure } from '../utils/clipboard';

interface SnippetPickerModalProps {
  isOpen: boolean;
  snippets: IdentitySnippet[];
  onClose: () => void;
  onSelect: (value: string, label?: string) => void;
}

export const SnippetPickerModal: React.FC<SnippetPickerModalProps> = ({
  isOpen,
  snippets,
  onClose,
  onSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
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
              placeholder="搜尋電話、地址、生日、統編..."
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
            filtered.map(snippet => (
              <div
                key={snippet.id}
                onClick={() => {
                  onSelect(snippet.value, snippet.title);
                  onClose();
                }}
                className="group flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/40 cursor-pointer transition text-left"
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-sky-100 transition shrink-0 mt-0.5">
                    {getCategoryIcon(snippet.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {snippet.title}
                    </div>
                    <div className="text-xs text-slate-600 font-mono break-all mt-0.5 line-clamp-2">
                      {snippet.value}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(snippet, e)}
                    title="單獨複製此字串"
                    className="p-2 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition"
                  >
                    {copiedId === snippet.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <span className="text-[11px] font-medium text-sky-600 px-2 py-1 bg-sky-100/70 rounded-md">
                    帶入
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
