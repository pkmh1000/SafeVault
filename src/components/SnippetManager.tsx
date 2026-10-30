import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Copy, Check, Phone, MapPin, Calendar, FileText, Mail, Building, Tag } from 'lucide-react';
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
  const [editingSnippet, setEditingSnippet] = useState<IdentitySnippet | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<SnippetCategory>('custom');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const startAdd = () => {
    setTitle('');
    setValue('');
    setCategory('custom');
    setEditingSnippet(null);
    setIsAdding(true);
  };

  const startEdit = (snippet: IdentitySnippet) => {
    setTitle(snippet.title);
    setValue(snippet.value);
    setCategory(snippet.category);
    setEditingSnippet(snippet);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !value.trim()) return;

    if (editingSnippet) {
      const updated = snippets.map(s =>
        s.id === editingSnippet.id ? { ...s, title, value, category } : s
      );
      onSaveSnippets(updated);
    } else {
      const newSnippet: IdentitySnippet = {
        id: 'snip_' + Date.now(),
        title,
        value,
        category,
      };
      onSaveSnippets([newSnippet, ...snippets]);
    }

    setIsAdding(false);
    setEditingSnippet(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('確定刪除此常用字串？')) {
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增字串</span>
        </button>
      </div>

      {/* Editor Modal / Card */}
      {isAdding && (
        <form onSubmit={handleSave} className="p-4 bg-white border border-sky-200 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800">
            {editingSnippet ? '編輯常用字串' : '新增常用字串'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                字串標題 (例如: 戶籍地址、公司統編)
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="輸入名稱..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                分類類別
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as SnippetCategory)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="phone">電話號碼</option>
                <option value="address">地址通訊</option>
                <option value="birthday">出生年月日</option>
                <option value="id_card">身分證/居留證</option>
                <option value="tax_id">公司統編/抬頭</option>
                <option value="email">電子郵件</option>
                <option value="custom">自訂其他</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              字串內容值 (可為多行或長文字)
            </label>
            <textarea
              required
              rows={2}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="輸入要調用的文字內容..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingSnippet(null);
              }}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition"
            >
              儲存字串
            </button>
          </div>
        </form>
      )}

      {/* Snippet List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {snippets.map(snippet => (
          <div
            key={snippet.id}
            className="p-3.5 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100">
                    {getCategoryIcon(snippet.category)}
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {snippet.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
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
                    title="編輯"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(snippet.id)}
                    title="刪除"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 break-all select-all">
                {snippet.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
