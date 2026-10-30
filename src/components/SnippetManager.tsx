import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Mail,
  Building,
  Tag,
  X,
  Eraser,
  Sparkles,
} from 'lucide-react';
import { IdentitySnippet, SnippetCategory } from '../types/vault';
import { copyToClipboardSecure } from '../utils/clipboard';

interface SnippetManagerProps {
  snippets: IdentitySnippet[];
  onSaveSnippets: (snippets: IdentitySnippet[]) => void;
}

export const SnippetManager: React.FC<SnippetManagerProps> = ({
  snippets,
  onSaveSnippets,
}) => {
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<IdentitySnippet | null>(null);
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<SnippetCategory>('custom');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const startAdd = () => {
    setTitle('');
    setValue('');
    setCategory('custom');
    setCustomCategoryInput('');
    setEditingSnippet(null);
    setIsEditorModalOpen(true);
  };

  const startEdit = (snippet: IdentitySnippet) => {
    setTitle(snippet.title);
    setValue(snippet.value);
    setCategory(snippet.category);
    setCustomCategoryInput(snippet.customCategory || '');
    setEditingSnippet(snippet);
    setIsEditorModalOpen(true);
  };

  const handleClearTitle = () => {
    setTitle('');
  };

  const handleClearValue = () => {
    setValue('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !value.trim()) return;

    const trimmedCustomCat = category === 'custom' ? customCategoryInput.trim() : undefined;

    if (editingSnippet) {
      const updated = snippets.map(s =>
        s.id === editingSnippet.id
          ? {
              ...s,
              title: title.trim(),
              value: value.trim(),
              category,
              customCategory: trimmedCustomCat,
            }
          : s
      );
      onSaveSnippets(updated);
    } else {
      const newSnippet: IdentitySnippet = {
        id: 'snip_' + Date.now(),
        title: title.trim(),
        value: value.trim(),
        category,
        customCategory: trimmedCustomCat,
      };
      onSaveSnippets([newSnippet, ...snippets]);
    }

    setIsEditorModalOpen(false);
    setEditingSnippet(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`確定刪除「${name}」？`)) {
      onSaveSnippets(snippets.filter(s => s.id !== id));
    }
  };

  const handleCopy = async (snippet: IdentitySnippet) => {
    const res = await copyToClipboardSecure(snippet.value, snippet.title, 30);
    if (res.success) {
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const getCategoryIcon = (cat: SnippetCategory) => {
    switch (cat) {
      case 'phone': return <Phone className="w-4 h-4 text-emerald-600" />;
      case 'address': return <MapPin className="w-4 h-4 text-sky-600" />;
      case 'birthday': return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'id_card': return <FileText className="w-4 h-4 text-purple-600" />;
      case 'tax_id': return <Building className="w-4 h-4 text-indigo-600" />;
      case 'email': return <Mail className="w-4 h-4 text-rose-600" />;
      default: return <Tag className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryDisplayName = (snippet: IdentitySnippet) => {
    if (snippet.category === 'custom') {
      return snippet.customCategory || '自訂類別';
    }
    const map: Record<SnippetCategory, string> = {
      phone: '電話號碼',
      address: '地址通訊',
      birthday: '出生年月日',
      id_card: '身分證/居留證',
      tax_id: '公司統編/抬頭',
      email: '電子郵件',
      custom: '自訂類別',
    };
    return map[snippet.category];
  };

  return (
    <div className="space-y-4">
      {/* Intro and Add action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">常用個人資料字串庫</h2>
          <p className="text-xs text-slate-500">預建地址、電話、生日等常用字串，在各帳密編輯時可一鍵快速調用填入</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm shrink-0 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增字串</span>
        </button>
      </div>

      {/* Snippet List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {snippets.map(snippet => (
          <div
            key={snippet.id}
            className="p-3.5 bg-white border border-slate-200/90 rounded-2xl hover:border-slate-300 transition flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="p-1.5 rounded-lg bg-slate-100 shrink-0">
                    {getCategoryIcon(snippet.category)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block">
                      {snippet.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {getCategoryDisplayName(snippet)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(snippet)}
                    title="安全複製"
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    {copiedId === snippet.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(snippet)}
                    title="編輯此字串"
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(snippet.id, snippet.title)}
                    title="刪除"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl text-xs font-mono text-slate-700 break-all select-all border border-slate-100">
                {snippet.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Focused Editor Modal */}
      {isEditorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingSnippet ? `編輯「${editingSnippet.title}」` : '新增常用個人資料字串'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditorModalOpen(false);
                  setEditingSnippet(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      字串抬頭標籤
                    </label>
                    {title && (
                      <button
                        type="button"
                        onClick={handleClearTitle}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5"
                      >
                        <Eraser className="w-3 h-3" />
                        <span>全清除</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="例如: 戶籍地址、健保卡號..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    類別分類
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as SnippetCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="phone">電話號碼</option>
                    <option value="address">地址通訊</option>
                    <option value="birthday">出生年月日</option>
                    <option value="id_card">身分證/居留證</option>
                    <option value="tax_id">公司統編/抬頭</option>
                    <option value="email">電子郵件</option>
                    <option value="custom">自訂其他分類...</option>
                  </select>
                </div>
              </div>

              {/* Custom Category Input if category === 'custom' */}
              {category === 'custom' && (
                <div className="p-3 bg-sky-50/60 border border-sky-200/80 rounded-2xl space-y-1.5 animate-fade-in">
                  <label className="block text-[11px] font-bold text-sky-900">
                    自訂分類名稱 (例如: 健保卡、門禁卡、車牌號碼、會員標籤)
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    placeholder="輸入自訂分類名稱..."
                    className="w-full px-3 py-2 bg-white border border-sky-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <p className="text-[10px] text-sky-700">
                    自訂名稱將顯示於字串卡片標籤與調用選單中，方便分類歸納。
                  </p>
                </div>
              )}

              {/* Value Textarea with Full-Clear Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    字串內容值 (可多行)
                  </label>
                  {value && (
                    <button
                      type="button"
                      onClick={handleClearValue}
                      className="text-[10px] text-red-500 hover:text-red-700 font-medium flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>全清除原字串內容</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    required
                    rows={3}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="輸入文字內容..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditorModalOpen(false);
                    setEditingSnippet(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm active:scale-95"
                >
                  儲存字串
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
