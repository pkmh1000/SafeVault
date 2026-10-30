import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  Edit2,
  ShieldAlert,
  Sparkles,
  Check,
  ChevronRight,
  Layers,
  X,
  Info,
} from 'lucide-react';
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
  const [editingTemplate, setEditingTemplate] = useState<VaultTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<TemplateFieldDef[]>([]);

  // 開啟建立全新範本
  const startCreateNew = () => {
    setName('');
    setCategory('自訂');
    setDescription('');
    setFields([
      { label: '登入網址', isSensitive: false },
      { label: '安全提示問題與解答', isSensitive: true },
    ]);
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  // 開啟修改/編輯既有範本 (保留編輯修改能力)
  const startEditTemplate = (tpl: VaultTemplate) => {
    setName(tpl.name);
    setCategory(tpl.category);
    setDescription(tpl.description || '');
    setFields([...tpl.fields.map(f => ({ ...f }))]);
    setEditingTemplate(tpl);
    setIsModalOpen(true);
  };

  // 由既有範本衍生生成新範本
  const startDeriveFromExisting = (tpl: VaultTemplate) => {
    setName(`${tpl.name} (衍生新範本)`);
    setCategory(tpl.category);
    setDescription(`由 ${tpl.name} 調用並衍生生成的專用自訂範本`);
    setFields([...tpl.fields.map(f => ({ ...f }))]);
    setEditingTemplate(null); // 視為新增全新衍生範本
    setIsModalOpen(true);
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

    if (editingTemplate) {
      // 編輯既有範本
      const updated = templates.map(t =>
        t.id === editingTemplate.id
          ? {
              ...t,
              name: name.trim(),
              category: category.trim() || '自訂',
              description: description.trim(),
              fields: fields.filter(f => f.label.trim() !== ''),
            }
          : t
      );
      onSaveTemplates(updated);
    } else {
      // 新增全新自訂範本
      const newTpl: VaultTemplate = {
        id: 'tpl_custom_' + Date.now(),
        name: name.trim(),
        category: category.trim() || '自訂',
        description: description.trim(),
        icon: 'Layers',
        fields: fields.filter(f => f.label.trim() !== ''),
        isBuiltIn: false,
      };
      onSaveTemplates([newTpl, ...templates]);
    }

    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  // 刪除範本時的完整確認與安心保證提示
  const handleDeleteTemplate = (id: string, tplName: string) => {
    const confirmed = confirm(
      `確定要刪除「${tplName}」範本嗎？\n\n【安心提醒】\n刪除此範本「完全不會影響」過去已建立的任何帳密項目！\n所有已儲存的帳密資料將完整保留不受任何變更。`
    );
    if (confirmed) {
      onSaveTemplates(templates.filter(t => t.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">帳密格式範本庫</h2>
          <p className="text-xs text-slate-500">標準格式一鍵套用，支援自訂、修改編輯與範本衍生再生成</p>
        </div>
        <button
          onClick={startCreateNew}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm shrink-0 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>建立新範本</span>
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-sky-950">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">範本獨立性保障說明：</p>
          <p className="text-[11px] text-sky-800 leading-relaxed">
            範本僅作為建立帳密時的欄位骨架。<strong>修改或刪除範本「完全不會」影響或更動已儲存的任何帳密資料</strong>；每一筆已儲存的帳密單元皆具備獨立結構，請放心自訂管理。
          </p>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {templates.map(tpl => (
          <div
            key={tpl.id}
            className="p-4 bg-white border border-slate-200/90 hover:border-slate-300 rounded-3xl transition flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                    {tpl.isBuiltIn ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                        預置
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded-md font-medium border border-sky-200/60">
                        自訂範本
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">{tpl.category}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* 修改編輯按鈕 (自訂或預置範本皆可編輯/客製) */}
                  <button
                    onClick={() => startEditTemplate(tpl)}
                    title="編輯修改此範本"
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!tpl.isBuiltIn && (
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                      title="刪除此範本 (不影響已建帳密)"
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {tpl.description && (
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {tpl.description}
                </p>
              )}

              {/* Standard Line 1 & Line 2 reminder */}
              <div className="p-2.5 bg-slate-50 rounded-2xl space-y-1.5 mb-3 text-xs border border-slate-100">
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
                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${
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
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition text-center shadow-xs active:scale-95"
              >
                直接套用建立帳密
              </button>
              <button
                type="button"
                onClick={() => startDeriveFromExisting(tpl)}
                title="以此範本衍生生成新範本"
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition flex items-center gap-1 shrink-0"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>衍生新範本</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Template Create & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingTemplate ? `編輯修改「${editingTemplate.name}」` : '建立新範本規格'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTemplate(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    範本名稱 (例如: 證券看盤戶、私人卡)
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="輸入範本名稱..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    分類類別
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="例如: 網銀金融、社群..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  範本備註說明
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="簡述此範本用途..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              {/* Fields Configuration */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      延伸欄位標籤與隱私區隔設定
                    </span>
                    <p className="text-[10px] text-slate-400">
                      初始皆預設固定第一行帳號、第二行密碼
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加欄位</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {fields.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <input
                        type="text"
                        value={f.label}
                        onChange={e => handleFieldChange(idx, 'label', e.target.value)}
                        placeholder="欄位抬頭標籤 (例如: 信用卡到期日)"
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                      />
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 select-none cursor-pointer px-2 py-1 bg-white border border-slate-200 rounded-xl shrink-0">
                        <input
                          type="checkbox"
                          checked={f.isSensitive}
                          onChange={e => handleFieldChange(idx, 'isSensitive', e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>敏感遮罩</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-xl transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm active:scale-95"
                >
                  {editingTemplate ? '儲存修改' : '儲存此新範本'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
