import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  Sparkles,
  BookmarkPlus,
  Layers,
  Wand2,
  Copy,
  Check,
} from 'lucide-react';
import { VaultItem, CustomField, VaultTemplate, IdentitySnippet } from '../types/vault';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import { SnippetPickerModal } from './SnippetPickerModal';
import { copyToClipboardSecure } from '../utils/clipboard';

interface VaultEditorModalProps {
  isOpen: boolean;
  initialItem?: VaultItem | null;
  initialTemplate?: VaultTemplate | null;
  templates: VaultTemplate[];
  snippets: IdentitySnippet[];
  onClose: () => void;
  onSave: (item: VaultItem) => void;
  onSaveNewTemplate: (template: VaultTemplate) => void;
}

export const VaultEditorModal: React.FC<VaultEditorModalProps> = ({
  isOpen,
  initialItem,
  initialTemplate,
  templates,
  snippets,
  onClose,
  onSave,
  onSaveNewTemplate,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('通用帳密');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [notes, setNotes] = useState('');
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | undefined>();

  // Modals inside editor
  const [showGenerator, setShowGenerator] = useState(false);
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [targetFieldForSnippet, setTargetFieldForSnippet] = useState<'account' | 'password' | number | 'new'>('account');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Initialize form
  useEffect(() => {
    if (!isOpen) return;

    if (initialItem) {
      setTitle(initialItem.title);
      setCategory(initialItem.category);
      setAccount(initialItem.account);
      setPassword(initialItem.password);
      setFields(initialItem.fields ? [...initialItem.fields] : []);
      setNotes(initialItem.notes || '');
      setAppliedTemplateId(initialItem.templateId);
    } else if (initialTemplate) {
      applyTemplate(initialTemplate);
    } else {
      // Default blank item with standard line 1 & line 2
      setTitle('');
      setCategory('通用帳密');
      setAccount('');
      setPassword('');
      setFields([]);
      setNotes('');
      setAppliedTemplateId(undefined);
    }
  }, [isOpen, initialItem, initialTemplate]);

  if (!isOpen) return null;

  const applyTemplate = (tpl: VaultTemplate) => {
    setTitle(tpl.name.includes('通用') ? '' : tpl.name);
    setCategory(tpl.category);
    setAppliedTemplateId(tpl.id);
    const newFields: CustomField[] = tpl.fields.map((f, i) => ({
      id: `field_${Date.now()}_${i}`,
      label: f.label,
      value: f.defaultValue || '',
      isSensitive: f.isSensitive,
    }));
    setFields(newFields);
  };

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        id: 'f_' + Date.now(),
        label: '',
        value: '',
        isSensitive: false,
      },
    ]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof CustomField, val: any) => {
    setFields(fields.map(f => (f.id === id ? { ...f, [key]: val } : f)));
  };

  // 調用常用字串填入
  const handleOpenSnippetPicker = (target: 'account' | 'password' | number | 'new') => {
    setTargetFieldForSnippet(target);
    setShowSnippetPicker(true);
  };

  const handleSnippetSelected = (snippetValue: string, snippetLabel?: string) => {
    if (targetFieldForSnippet === 'account') {
      setAccount(snippetValue);
    } else if (targetFieldForSnippet === 'password') {
      setPassword(snippetValue);
    } else if (targetFieldForSnippet === 'new') {
      // 直接新增為一個自訂欄位
      setFields([
        ...fields,
        {
          id: 'f_' + Date.now(),
          label: snippetLabel || '自訂資料',
          value: snippetValue,
          isSensitive: false,
        },
      ]);
    } else if (typeof targetFieldForSnippet === 'number') {
      const idx = targetFieldForSnippet;
      const updated = [...fields];
      if (updated[idx]) {
        updated[idx].value = snippetValue;
        if (!updated[idx].label && snippetLabel) {
          updated[idx].label = snippetLabel;
        }
        setFields(updated);
      }
    }
  };

  // 儲存此項目為新範本
  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const tpl: VaultTemplate = {
      id: 'tpl_custom_' + Date.now(),
      name: newTemplateName.trim(),
      category: category || '自訂分類',
      description: `由【${title || newTemplateName}】結構衍生自訂之範本`,
      icon: 'Layers',
      fields: fields.map(f => ({
        label: f.label || '自訂欄位',
        isSensitive: f.isSensitive,
        defaultValue: '',
      })),
      isBuiltIn: false,
    };

    onSaveNewTemplate(tpl);
    setShowSaveTemplateDialog(false);
    setNewTemplateName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const itemToSave: VaultItem = {
      id: initialItem?.id || 'item_' + Date.now(),
      title: title.trim(),
      category: category.trim() || '通用帳密',
      account: account.trim(),
      password: password,
      fields: fields.filter(f => f.label.trim() !== '' || f.value.trim() !== ''),
      templateId: appliedTemplateId,
      notes: notes.trim(),
      createdAt: initialItem?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(itemToSave);
    onClose();
  };

  const handleQuickCopy = async (text: string, type: string) => {
    const res = await copyToClipboardSecure(text, type, 30);
    if (res.success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {initialItem ? '編輯帳號密碼' : '新增帳號密碼'}
            </h2>
            {/* Quick Template Switcher */}
            <div className="relative">
              <select
                value={appliedTemplateId || ''}
                onChange={e => {
                  const tpl = templates.find(t => t.id === e.target.value);
                  if (tpl) applyTemplate(tpl);
                }}
                className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">選擇/套用範本格式...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} id="vault-form" className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Service Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                服務名稱 / 網站名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如: 玉山網銀、Google 帳號、公司 GitHub..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                分類類別
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="網銀、社群、App..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Section: Standard Core Rows (Line 1 & Line 2) */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                標準核心資訊 (固定第一行與第二行)
              </span>
              <span className="text-[11px] text-slate-400">支援快速複製與調用</span>
            </div>

            {/* Line 1: 帳號 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <span>第一行: 帳號 (Account)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSnippetPicker('account')}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-medium flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>調用常用字串</span>
                  </button>
                  {account && (
                    <button
                      type="button"
                      onClick={() => handleQuickCopy(account, '帳號')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                    >
                      {copiedType === '帳號' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>複製</span>
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={account}
                onChange={e => setAccount(e.target.value)}
                placeholder="帳號: ________"
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            {/* Line 2: 密碼 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <span>第二行: 密碼 (Password)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerator(true)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>隨機強密碼</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSnippetPicker('password')}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-medium flex items-center gap-0.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>調用常用字串</span>
                  </button>
                  {password && (
                    <button
                      type="button"
                      onClick={() => handleQuickCopy(password, '密碼')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                    >
                      {copiedType === '密碼' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>複製</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="密碼: ________"
                  className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 transition tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section: Dynamic Custom Fields (後續添加方式，可自訂標籤) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  延伸標籤欄位 (後續添加與隱私顯示區隔)
                </span>
                <p className="text-[11px] text-slate-400">
                  可自行設定抬頭標籤；勾選「敏感遮罩區」則在列表與檢視時預設隱藏
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenSnippetPicker('new')}
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>由字串直接新增</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>添加欄位</span>
                </button>
              </div>
            </div>

            {fields.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                尚未添加延伸欄位。點擊上方「添加欄位」或套用範本格式。
              </div>
            ) : (
              <div className="space-y-2.5">
                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className={`p-3 rounded-xl border transition ${
                      field.isSensitive
                        ? 'bg-amber-50/40 border-amber-200/80'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Field Label */}
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => handleFieldChange(field.id, 'label', e.target.value)}
                          placeholder="欄位抬頭 (例如: 信用卡有效月年)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      {/* Field Value */}
                      <div className="sm:col-span-5 relative">
                        <input
                          type="text"
                          value={field.value}
                          onChange={e => handleFieldChange(field.id, 'value', e.target.value)}
                          placeholder="內容值..."
                          className="w-full pl-2.5 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenSnippetPicker(idx)}
                          title="調用常用字串填入此欄"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Sensitive Toggle & Remove */}
                      <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-slate-600 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.isSensitive}
                            onChange={e => handleFieldChange(field.id, 'isSensitive', e.target.checked)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className={field.isSensitive ? 'font-semibold text-amber-700' : ''}>
                            {field.isSensitive ? '敏感不顯示' : '一般顯示'}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveField(field.id)}
                          className="p-1 text-slate-300 hover:text-red-500 rounded transition"
                          title="移除此欄位"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              備註說明 (選填)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="記錄安全問題、備援代碼或其他輔助資訊..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Feature: Save current layout as a new Template */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              喜歡目前設定的欄位架構嗎？可另存為專屬範本
            </span>
            <button
              type="button"
              onClick={() => {
                setNewTemplateName(title ? `${title} 格式範本` : '自訂新範本');
                setShowSaveTemplateDialog(true);
              }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>另存為新範本</span>
            </button>
          </div>
        </form>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition"
          >
            取消
          </button>
          <button
            type="submit"
            form="vault-form"
            className="px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm active:scale-[0.98]"
          >
            儲存保險庫
          </button>
        </div>
      </div>

      {/* Password Generator Sub-Modal */}
      <PasswordGeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onApply={pw => setPassword(pw)}
      />

      {/* Snippet Picker Sub-Modal */}
      <SnippetPickerModal
        isOpen={showSnippetPicker}
        snippets={snippets}
        onClose={() => setShowSnippetPicker(false)}
        onSelect={handleSnippetSelected}
      />

      {/* Save As New Template Dialog */}
      {showSaveTemplateDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 border border-slate-200 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>另存為新格式範本</span>
            </h3>
            <p className="text-xs text-slate-500">
              將目前的自訂抬頭標籤與敏感區隔設定另存為範本，日後新增其他帳密時可直接重複調用。
            </p>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                範本名稱
              </label>
              <input
                type="text"
                autoFocus
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                placeholder="例如: 證券交易戶範本"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveTemplateDialog(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition"
              >
                確認儲存範本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
