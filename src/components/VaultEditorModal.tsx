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
  RotateCcw,
  RotateCw,
  History,
  AlertTriangle,
  CheckCircle2,
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
  existingCategories?: string[];
  defaultCategory?: string;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
  onSaveNewTemplate: (template: VaultTemplate) => void;
}

const RECOMMENDED_CATEGORIES = [
  '通用帳密',
  '網銀金融',
  '信用卡',
  '社群通訊',
  '電子郵件',
  '工作商務',
  '行動應用',
  '影音娛樂',
  '購物消費',
  '會員證卡',
  '雲端服務',
  '政府公務',
];

interface EditorSnapshot {
  title: string;
  category: string;
  account: string;
  password: string;
  fields: CustomField[];
  notes: string;
}

export const VaultEditorModal: React.FC<VaultEditorModalProps> = ({
  isOpen,
  initialItem,
  initialTemplate,
  templates,
  snippets,
  existingCategories = [],
  defaultCategory = '通用帳密',
  onClose,
  onSave,
  onSaveNewTemplate,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [notes, setNotes] = useState('');
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | undefined>();
  const [showAllCategories, setShowAllCategories] = useState(false);

  // 回復 (Undo) & 重做 (Redo) 歷史棧 (支援 n 次多步復原)
  const [history, setHistory] = useState<EditorSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isNavigatingRef = React.useRef(false);
  const debounceTimerRef = React.useRef<any>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // 聚合所有可用分類選項：推薦標籤 + 使用者既有單元分類 + 範本庫分類
  const allAvailableCategories = React.useMemo(() => {
    const set = new Set<string>();
    RECOMMENDED_CATEGORIES.forEach(c => set.add(c));
    (existingCategories || []).forEach(c => c && set.add(c));
    (templates || []).forEach(t => t.category && set.add(t.category));
    return Array.from(set);
  }, [existingCategories, templates]);

  // Modals inside editor
  const [showGenerator, setShowGenerator] = useState(false);
  const [showSnippetPicker, setShowSnippetPicker] = useState(false);
  const [targetFieldForSnippet, setTargetFieldForSnippet] = useState<'account' | 'password' | number | 'new'>('account');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateSaveError, setTemplateSaveError] = useState('');
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // 記錄編輯快照至歷史棧 (支援即時或防抖記錄)
  const recordSnapshot = React.useCallback(
    (newSnapshot: EditorSnapshot, immediate = false) => {
      if (isNavigatingRef.current) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const commit = () => {
        setHistory(prev => {
          const sliced = prev.slice(0, historyIndex + 1);
          const last = sliced[sliced.length - 1];
          if (
            last &&
            last.title === newSnapshot.title &&
            last.category === newSnapshot.category &&
            last.account === newSnapshot.account &&
            last.password === newSnapshot.password &&
            last.notes === newSnapshot.notes &&
            JSON.stringify(last.fields) === JSON.stringify(newSnapshot.fields)
          ) {
            return prev;
          }
          const updated = [...sliced, JSON.parse(JSON.stringify(newSnapshot))];
          if (updated.length > 50) updated.shift();
          return updated;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 50));
      };

      if (immediate) {
        commit();
      } else {
        debounceTimerRef.current = setTimeout(commit, 350);
      }
    },
    [historyIndex]
  );

  // Initialize form
  useEffect(() => {
    if (!isOpen) return;

    let initTitle = '';
    let initCat = defaultCategory && defaultCategory !== '全部' ? defaultCategory : '通用帳密';
    let initAcc = '';
    let initPw = '';
    let initFields: CustomField[] = [];
    let initNotes = '';
    let initTplId: string | undefined = undefined;

    if (initialItem) {
      initTitle = initialItem.title;
      initCat = initialItem.category || '通用帳密';
      initAcc = initialItem.account;
      initPw = initialItem.password;
      initFields = initialItem.fields ? JSON.parse(JSON.stringify(initialItem.fields)) : [];
      initNotes = initialItem.notes || '';
      initTplId = initialItem.templateId;
    } else if (initialTemplate) {
      initTitle = initialTemplate.name.includes('通用') ? '' : initialTemplate.name;
      initCat = initialTemplate.category;
      initTplId = initialTemplate.id;
      initFields = initialTemplate.fields.map((f, i) => ({
        id: `field_${Date.now()}_${i}`,
        label: f.label,
        value: f.defaultValue || '',
        isSensitive: f.isSensitive,
      }));
    }

    setTitle(initTitle);
    setCategory(initCat);
    setAccount(initAcc);
    setPassword(initPw);
    setFields(initFields);
    setNotes(initNotes);
    setAppliedTemplateId(initTplId);
    setShowAllCategories(false);
    setShowUnsavedWarning(false);

    // 建立初始歷史錨點
    const baseSnapshot: EditorSnapshot = {
      title: initTitle,
      category: initCat,
      account: initAcc,
      password: initPw,
      fields: JSON.parse(JSON.stringify(initFields)),
      notes: initNotes,
    };
    setHistory([baseSnapshot]);
    setHistoryIndex(0);
  }, [isOpen, initialItem, initialTemplate, defaultCategory]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 回復 (Undo)
  const handleUndo = () => {
    if (!canUndo) return;
    const targetIdx = historyIndex - 1;
    const s = history[targetIdx];
    if (!s) return;
    isNavigatingRef.current = true;
    setTitle(s.title);
    setCategory(s.category);
    setAccount(s.account);
    setPassword(s.password);
    setFields(JSON.parse(JSON.stringify(s.fields)));
    setNotes(s.notes);
    setHistoryIndex(targetIdx);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 50);
  };

  // 重做 (Redo)
  const handleRedo = () => {
    if (!canRedo) return;
    const targetIdx = historyIndex + 1;
    const s = history[targetIdx];
    if (!s) return;
    isNavigatingRef.current = true;
    setTitle(s.title);
    setCategory(s.category);
    setAccount(s.account);
    setPassword(s.password);
    setFields(JSON.parse(JSON.stringify(s.fields)));
    setNotes(s.notes);
    setHistoryIndex(targetIdx);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 50);
  };

  // 還原回開啟前原始狀態
  const handleRevertToOriginal = () => {
    if (history.length === 0) return;
    const orig = history[0];
    isNavigatingRef.current = true;
    setTitle(orig.title);
    setCategory(orig.category);
    setAccount(orig.account);
    setPassword(orig.password);
    setFields(JSON.parse(JSON.stringify(orig.fields)));
    setNotes(orig.notes);
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(orig))]);
    setHistoryIndex(prev => prev + 1);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 50);
  };

  // 快捷鍵監聽 (Ctrl+Z 回復, Ctrl+Y / Cmd+Shift+Z 重做)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canUndo, canRedo, history, historyIndex]);

  // 判斷是否相較初始狀態有修改
  const isDirty = React.useMemo(() => {
    if (history.length === 0) return false;
    const orig = history[0];
    return (
      title !== orig.title ||
      category !== orig.category ||
      account !== orig.account ||
      password !== orig.password ||
      notes !== orig.notes ||
      JSON.stringify(fields) !== JSON.stringify(orig.fields)
    );
  }, [history, title, category, account, password, notes, fields]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const applyTemplate = (tpl: VaultTemplate) => {
    const newTitle = tpl.name.includes('通用') ? '' : tpl.name;
    const newCat = tpl.category;
    const newTplId = tpl.id;
    const newFields: CustomField[] = tpl.fields.map((f, i) => ({
      id: `field_${Date.now()}_${i}`,
      label: f.label,
      value: f.defaultValue || '',
      isSensitive: f.isSensitive,
    }));

    setTitle(newTitle);
    setCategory(newCat);
    setAppliedTemplateId(newTplId);
    setFields(newFields);
    recordSnapshot(
      { title: newTitle, category: newCat, account, password, fields: newFields, notes },
      true
    );
  };

  const handleAddField = () => {
    const newFields = [
      ...fields,
      {
        id: 'f_' + Date.now(),
        label: '',
        value: '',
        isSensitive: false,
      },
    ];
    setFields(newFields);
    recordSnapshot({ title, category, account, password, fields: newFields, notes }, true);
  };

  const handleRemoveField = (id: string) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    recordSnapshot({ title, category, account, password, fields: newFields, notes }, true);
  };

  const handleFieldChange = (id: string, key: keyof CustomField, val: any) => {
    const newFields = fields.map(f => (f.id === id ? { ...f, [key]: val } : f));
    setFields(newFields);
    recordSnapshot({ title, category, account, password, fields: newFields, notes });
  };

  // 調用常用字串填入
  const handleOpenSnippetPicker = (target: 'account' | 'password' | number | 'new') => {
    setTargetFieldForSnippet(target);
    setShowSnippetPicker(true);
  };

  const handleSnippetSelected = (snippetValue: string, snippetLabel?: string, snippetIsSensitive?: boolean) => {
    if (targetFieldForSnippet === 'account') {
      setAccount(snippetValue);
      recordSnapshot({ title, category, account: snippetValue, password, fields, notes }, true);
    } else if (targetFieldForSnippet === 'password') {
      setPassword(snippetValue);
      recordSnapshot({ title, category, account, password: snippetValue, fields, notes }, true);
    } else if (targetFieldForSnippet === 'new') {
      const newFields = [
        ...fields,
        {
          id: 'f_' + Date.now(),
          label: snippetLabel || '自訂資料',
          value: snippetValue,
          isSensitive: !!snippetIsSensitive,
        },
      ];
      setFields(newFields);
      recordSnapshot({ title, category, account, password, fields: newFields, notes }, true);
    } else if (typeof targetFieldForSnippet === 'number') {
      const idx = targetFieldForSnippet;
      const updated = [...fields];
      if (updated[idx]) {
        updated[idx].value = snippetValue;
        if (!updated[idx].label && snippetLabel) {
          updated[idx].label = snippetLabel;
        }
        if (snippetIsSensitive) {
          updated[idx].isSensitive = true;
        }
        setFields(updated);
        recordSnapshot({ title, category, account, password, fields: updated, notes }, true);
      }
    }
  };

  // 儲存此項目為新範本 (防重複檢查與明確反饋，杜絕原生 alert 顯示網域名稱)
  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTemplateName.trim();
    if (!cleanName) {
      setTemplateSaveError('請輸入範本名稱');
      return;
    }

    // 檢查是否已有相同名稱範本
    const existing = templates.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      setTemplateSaveError(`已有同名範本「${cleanName}」，請更換名稱或直接使用既有範本。`);
      return;
    }

    const tpl: VaultTemplate = {
      id: 'tpl_custom_' + Date.now(),
      name: cleanName,
      category: category || '自訂分類',
      description: `由【${title || cleanName}】格式生成之範本`,
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
    setTemplateSaveError('');
    setTemplateSaveSuccess(`已成功建立新範本「${cleanName}」！`);
    setTimeout(() => setTemplateSaveSuccess(''), 3000);
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
            type="button"
            onClick={handleRequestClose}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Undo / Redo & Safety Recovery Action Ribbon */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-b border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer text-xs ${
                canUndo
                  ? 'bg-white text-slate-800 hover:bg-slate-200/80 shadow-2xs border border-slate-200/80'
                  : 'text-slate-400 opacity-50 cursor-not-allowed'
              }`}
              title="回復上一步 (Ctrl+Z / Cmd+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
              <span>回復</span>
              {historyIndex > 0 && <span className="text-[10px] opacity-75 font-mono font-bold">({historyIndex})</span>}
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition cursor-pointer text-xs ${
                canRedo
                  ? 'bg-white text-slate-800 hover:bg-slate-200/80 shadow-2xs border border-slate-200/80'
                  : 'text-slate-400 opacity-50 cursor-not-allowed'
              }`}
              title="重做下一步 (Ctrl+Y / Cmd+Shift+Z)"
            >
              <RotateCw className="w-3.5 h-3.5 text-sky-600" />
              <span>重做</span>
              {history.length - 1 - historyIndex > 0 && (
                <span className="text-[10px] opacity-75 font-mono font-bold">({history.length - 1 - historyIndex})</span>
              )}
            </button>

            <span className="text-[11px] text-slate-400 hidden sm:inline ml-1">
              (支援 Ctrl+Z 回復 / Ctrl+Y 重做)
            </span>
          </div>

          {initialItem && isDirty && (
            <button
              type="button"
              onClick={handleRevertToOriginal}
              className="px-2.5 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
              title="放棄此次修改，還原回開啟前原始狀態"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>還原原始內容</span>
            </button>
          )}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  分類標籤
                </label>
                <span className="text-[10px] text-slate-400">點選下方標籤或自由輸入</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  list="vault-category-suggestions"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="選擇下方常用分類或自行輸入..."
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                />
                <datalist id="vault-category-suggestions">
                  {allAvailableCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {category && (
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="清除分類文字"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Select Category Chips (一鍵點選推薦與既有分類) */}
              <div className="mt-2 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {allAvailableCategories.slice(0, 6).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        category === cat
                          ? 'bg-sky-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {allAvailableCategories.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCategories(prev => !prev)}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-medium px-1.5 py-0.5 rounded-lg hover:bg-sky-50 transition cursor-pointer"
                    >
                      {showAllCategories ? '收合標籤 ▲' : `更多分類 (${allAvailableCategories.length - 6}) ▼`}
                    </button>
                  )}
                </div>

                {/* Expanded Categories Cloud */}
                {showAllCategories && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100/80 rounded-xl border border-slate-200/80 animate-fade-in">
                    {allAvailableCategories.slice(6).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setShowAllCategories(false);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                          category === cat
                            ? 'bg-sky-600 text-white font-bold shadow-2xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            onClick={handleRequestClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            form="vault-form"
            className="px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm active:scale-[0.98] cursor-pointer"
          >
            儲存保險庫
          </button>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-3.5">
            <div className="flex items-center gap-2.5 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">未儲存的修改提醒</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              您對此帳密單元有尚未儲存的編輯內容。若直接離開，剛才的修改將會遺失。
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="px-3.5 py-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium cursor-pointer"
              >
                繼續編輯
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-medium cursor-pointer shadow-xs"
              >
                放棄變更並離開
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Generator Sub-Modal */}
      <PasswordGeneratorModal
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onApply={pw => {
          setPassword(pw);
          recordSnapshot({ title, category, account, password: pw, fields, notes }, true);
        }}
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-xl space-y-3.5">
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
                onChange={e => {
                  setNewTemplateName(e.target.value);
                  if (templateSaveError) setTemplateSaveError('');
                }}
                placeholder="例如: 證券交易戶範本"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {templateSaveError && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{templateSaveError}</span>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowSaveTemplateDialog(false);
                  setTemplateSaveError('');
                }}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
              >
                確認儲存範本
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Toast */}
      {templateSaveSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-70 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{templateSaveSuccess}</span>
        </div>
      )}
    </div>
  );
};
