import React, { useState } from 'react';
import { Plus, Copy, Trash2, Edit2, ShieldAlert, Sparkles, Check, ChevronRight, Layers } from 'lucide-react';
import { VaultTemplate, TemplateFieldDef } from '../types/vault';

interface TemplateManagerProps {
  templates: VaultTemplate[];
  onSaveTemplates: (templates: VaultTemplate[]) => void;
  onApplyTemplateToNewItem: (template: VaultTemplate) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onSaveTemplates,
  onApplyTemplateToNewItem,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<VaultTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<TemplateFieldDef[]>([]);

  // 開啟建立或衍生範本
  const startCreateNew = () => {
    setName('自訂新範本');
    setCategory('通用');
    setDescription('使用者自訂帳密範本');
    setFields([
      { label: '登入網址', isSensitive: false },
      { label: '安全提示問題與解答', isSensitive: true },
    ]);
    setIsEditing(true);
  };

  const startDeriveFromExisting = (tpl: VaultTemplate) => {
    setName(`${tpl.name} (衍生新範本)`);
    setCategory(tpl.category);
    setDescription(`由 ${tpl.name} 調用並衍生生成的專用自訂範本`);
    setFields([...tpl.fields.map(f => ({ ...f }))]);
    setIsEditing(true);
  };

  const handleAddField = () => {
    setFields([...fields, { label: '', isSensitive: false }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof TemplateFieldDef, val: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [key]: val };
    setFields(updated);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTpl: VaultTemplate = {
      id: 'tpl_custom_' + Date.now(),
      name,
      category: category || '自訂',
      description,
      icon: 'Layers',
      fields: fields.filter(f => f.label.trim() !== ''),
      isBuiltIn: false,
    };

    onSaveTemplates([newTpl, ...templates]);
    setIsEditing(false);
    setSelectedTemplate(newTpl);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('確定刪除此自訂範本？')) {
      onSaveTemplates(templates.filter(t => t.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">帳密格式範本庫</h2>
          <p className="text-xs text-slate-500">標準格式一鍵套用，支援自訂與「範本衍生再生成」</p>
        </div>
        <button
          onClick={startCreateNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>建立新範本</span>
        </button>
      </div>

      {/* Template Edit Form */}
      {isEditing && (
        <form onSubmit={handleSaveTemplate} className="p-4 bg-white border border-sky-300 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>設定新範本規格 (每筆初始預設第一行帳號、第二行密碼)</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              取消
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                範本名稱 (例如: 私人加密金鑰卡, 證券看盤戶)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="輸入範本名稱..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                分類類別
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="例如: 網銀金融, 雲端服務..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              說明備註
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="簡述此範本用途..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Fields Configuration */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                後續添加欄位標籤與隱私區隔設定
              </span>
              <button
                type="button"
                onClick={handleAddField}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>添加欄位標籤</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {fields.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="text"
                    value={f.label}
                    onChange={e => handleFieldChange(idx, 'label', e.target.value)}
                    placeholder="欄位抬頭標籤 (例如: 信用卡到期日)"
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 select-none cursor-pointer px-2 py-1 bg-white border border-slate-200 rounded-lg">
                    <input
                      type="checkbox"
                      checked={f.isSensitive}
                      onChange={e => handleFieldChange(idx, 'isSensitive', e.target.checked)}
                      className="rounded text-sky-600"
                    />
                    <span>敏感遮罩區</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
            >
              儲存此新範本
            </button>
          </div>
        </form>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map(tpl => (
          <div
            key={tpl.id}
            className={`p-4 bg-white border rounded-2xl transition flex flex-col justify-between ${
              selectedTemplate?.id === tpl.id ? 'border-sky-500 ring-1 ring-sky-500 shadow-sm' : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                    {tpl.isBuiltIn ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                        預置
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-200/60">
                        自訂衍生
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">{tpl.category}</span>
                </div>
                {!tpl.isBuiltIn && (
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    title="刪除此範本"
                    className="p-1 text-slate-300 hover:text-red-500 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                {tpl.description}
              </p>

              {/* Standard Line 1 & Line 2 reminder */}
              <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 mb-3 text-xs border border-slate-100">
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <span className="text-slate-400">行 1:</span>
                  <strong>帳號: ________</strong>
                </div>
                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <span className="text-slate-400">行 2:</span>
                  <strong>密碼: ________</strong>
                </div>
                {tpl.fields.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-200/60 flex flex-wrap gap-1">
                    {tpl.fields.map((f, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          f.isSensitive ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {f.label} {f.isSensitive ? '(隱蔽)' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onApplyTemplateToNewItem(tpl)}
                className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition text-center shadow-sm"
              >
                直接套用建立帳密
              </button>
              <button
                type="button"
                onClick={() => startDeriveFromExisting(tpl)}
                title="以此範本衍生生成新範本"
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition flex items-center gap-1 shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>衍生新範本</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
