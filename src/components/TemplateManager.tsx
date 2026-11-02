import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Layers,
  X,
  Info,
  Folder,
  FolderOpen,
  Search,
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

  // 搜尋與樹枝階層展開/收合狀態 (進範本庫預設全收合，點選該單元再開啟)
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Set<string>>(new Set());

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
      // 自動展開該新增範本所屬的分類
      setExpandedCategories(prev => new Set(prev).add(newTpl.category));
      setExpandedTemplateIds(prev => new Set(prev).add(newTpl.id));
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
      setExpandedTemplateIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 依分類分組與篩選
  const groupedTemplates = useMemo(() => {
    const filtered = templates.filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.fields.some(f => f.label.toLowerCase().includes(q))
      );
    });

    const groups: Record<string, VaultTemplate[]> = {};
    for (const tpl of filtered) {
      const cat = tpl.category || '自訂';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tpl);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'zh-TW'));
  }, [templates, searchQuery]);

  // 分類展開/收合切換
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // 範本單元展開/收合切換 (點選該單元再開啟)
  const toggleTemplate = (tplId: string) => {
    setExpandedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(tplId)) {
        next.delete(tplId);
      } else {
        next.add(tplId);
      }
      return next;
    });
  };

  // 全部展開
  const handleExpandAll = () => {
    const allCats = new Set<string>();
    const allIds = new Set<string>();
    groupedTemplates.forEach(([cat, items]) => {
      allCats.add(cat);
      items.forEach(t => allIds.add(t.id));
    });
    setExpandedCategories(allCats);
    setExpandedTemplateIds(allIds);
  };

  // 全部收合
  const handleCollapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedTemplateIds(new Set());
  };

  const totalFilteredCount = groupedTemplates.reduce((acc, [, items]) => acc + items.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">帳密格式範本庫</h2>
          <p className="text-xs text-slate-500">
            樹枝階層目錄管理，點選範本即可展開詳細欄位結構與快速套用
          </p>
        </div>
        <button
          onClick={startCreateNew}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm shrink-0 active:scale-95 cursor-pointer self-start sm:self-auto"
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

      {/* Search Bar & Expand/Collapse All Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜尋範本名稱、分類、說明或欄位標籤..."
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Total Summary and Expand/Collapse All Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500 px-1">
          <span className="text-[11px] shrink-0">
            共 <strong>{totalFilteredCount}</strong> 個範本 · {groupedTemplates.length} 個分類
          </span>

          {totalFilteredCount > 0 && (
            <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/80 shrink-0">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
                title="全部展開"
              >
                <ChevronsDown className="w-3.5 h-3.5 text-slate-600" />
                <span>全部展開</span>
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
                title="全部收合"
              >
                <ChevronsUp className="w-3.5 h-3.5 text-slate-600" />
                <span>全部收合</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tree Hierarchy for Templates (分類 -> 範本名稱，點擊展開單元明細) */}
      {groupedTemplates.length === 0 ? (
        <div className="py-12 px-4 text-center bg-white border border-dashed border-slate-200 rounded-3xl space-y-2">
          <Layers className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-xs font-bold text-slate-700">無相符的範本格式</h3>
          <p className="text-[11px] text-slate-400">請嘗試更換搜尋關鍵字，或點選上方建立新範本</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedTemplates.map(([cat, items]) => {
            const isCatExpanded = searchQuery.trim() ? true : expandedCategories.has(cat);

            return (
              <div
                key={cat}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs transition"
              >
                {/* 分類目錄夾橫條 */}
                <div
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center justify-between p-3 sm:px-4 cursor-pointer select-none bg-slate-50/70 hover:bg-slate-100/80 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-xl transition ${
                        isCatExpanded
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      {isCatExpanded ? (
                        <FolderOpen className="w-4 h-4" />
                      ) : (
                        <Folder className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {cat}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 font-medium shrink-0">
                      {items.length} 個範本
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      {isCatExpanded ? '收合目錄' : '展開目錄'}
                    </span>
                    {isCatExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* 樹枝階層子單元清單 (左側樹枝線條 + 橫向分支接頭) */}
                {isCatExpanded && (
                  <div className="p-3 sm:p-4 bg-slate-50/30 border-t border-slate-100">
                    <div className="relative pl-3 sm:pl-4 space-y-2 border-l-2 border-slate-200">
                      {items.map(tpl => {
                        const isTplExpanded = searchQuery.trim()
                          ? true
                          : expandedTemplateIds.has(tpl.id);

                        return (
                          <div key={tpl.id} className="relative">
                            {/* 樹枝橫向節點連接線 */}
                            <div className="absolute -left-[14px] sm:-left-[18px] top-4 w-3 sm:w-3.5 h-[2px] bg-slate-200 rounded-full" />

                            {/* 範本單元本體 (收合為名稱列，點選開啟明細) */}
                            <div
                              className={`bg-white border rounded-2xl transition duration-150 overflow-hidden ${
                                isTplExpanded
                                  ? 'border-sky-300 shadow-sm ring-1 ring-sky-100'
                                  : 'border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                              }`}
                            >
                              {/* 單元名稱列 (點選該單元再開啟) */}
                              <div
                                onClick={() => toggleTemplate(tpl.id)}
                                className="flex items-center justify-between p-3 sm:px-4 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <div
                                    className={`p-1.5 rounded-xl shrink-0 transition ${
                                      isTplExpanded
                                        ? 'bg-sky-100 text-sky-700'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    <Layers className="w-3.5 h-3.5" />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                        {tpl.name}
                                      </span>
                                      {tpl.isBuiltIn ? (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium shrink-0">
                                          預置
                                        </span>
                                      ) : (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded-md font-medium border border-sky-200/60 shrink-0">
                                          自訂範本
                                        </span>
                                      )}
                                    </div>

                                    {/* 收合狀態下的簡要欄位預覽 */}
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                                      <span className="text-slate-500">
                                        包含 {tpl.fields.length} 個擴充欄位
                                      </span>
                                      {tpl.description && (
                                        <span className="truncate hidden sm:inline text-slate-400">
                                          · {tpl.description}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* 右側快速動作與展開箭頭 */}
                                <div
                                  className="flex items-center gap-1.5 shrink-0"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {/* 未展開時的快速套用按鈕 */}
                                  {!isTplExpanded && (
                                    <button
                                      type="button"
                                      onClick={() => onApplyTemplateToNewItem(tpl)}
                                      className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-semibold transition active:scale-95 cursor-pointer shadow-2xs"
                                      title="直接以此範本建立新帳密"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-300" />
                                      <span>套用</span>
                                    </button>
                                  )}

                                  {/* 展開/收合箭頭 */}
                                  <button
                                    type="button"
                                    onClick={() => toggleTemplate(tpl.id)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                    title={isTplExpanded ? '收合範本明細' : '點擊開啟範本資料'}
                                  >
                                    {isTplExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-slate-600" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* 點擊展開後的完整範本資料結構與操作 */}
                              {isTplExpanded && (
                                <div className="p-3.5 sm:p-4 bg-slate-50/50 border-t border-slate-100 space-y-3.5 animate-in fade-in duration-150">
                                  {tpl.description && (
                                    <p className="text-xs text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-slate-100">
                                      {tpl.description}
                                    </p>
                                  )}

                                  {/* Standard Line 1 & Line 2 and Field definitions */}
                                  <div className="p-3 bg-white rounded-2xl space-y-2 border border-slate-200/80 text-xs">
                                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                                      <span className="text-slate-400">固定行 1:</span>
                                      <strong className="text-slate-800">帳號: ________</strong>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                                      <span className="text-slate-400">固定行 2:</span>
                                      <strong className="text-slate-800">密碼: ________</strong>
                                    </div>

                                    {tpl.fields.length > 0 ? (
                                      <div className="pt-2 border-t border-slate-100">
                                        <div className="text-[10px] text-slate-400 mb-1.5 font-medium">
                                          自訂擴充標籤欄位：
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {tpl.fields.map((f, i) => (
                                            <span
                                              key={i}
                                              className={`text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                                                f.isSensitive
                                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/80 font-medium'
                                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                                              }`}
                                            >
                                              <span>{f.label}</span>
                                              {f.isSensitive && (
                                                <span className="text-[9px] px-1 py-0.2 bg-amber-200/70 text-amber-900 rounded font-bold">
                                                  隱蔽
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-400">
                                        此範本僅包含標準帳號與密碼欄位
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions Bar */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                                    <div className="flex items-center gap-1.5">
                                      {/* 修改編輯 */}
                                      <button
                                        type="button"
                                        onClick={() => startEditTemplate(tpl)}
                                        className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl text-xs font-medium border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                                        title="編輯修改範本規格"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>編輯規格</span>
                                      </button>

                                      {/* 衍生新範本 */}
                                      <button
                                        type="button"
                                        onClick={() => startDeriveFromExisting(tpl)}
                                        className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl text-xs font-medium border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                                        title="以此範本為基礎複製並衍生自訂範本"
                                      >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>衍生新範本</span>
                                      </button>

                                      {/* 刪除 (僅限自訂範本) */}
                                      {!tpl.isBuiltIn && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                          title="刪除此範本 (不影響已儲存帳密)"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>

                                    {/* 直接套用按鈕 */}
                                    <button
                                      type="button"
                                      onClick={() => onApplyTemplateToNewItem(tpl)}
                                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ml-auto"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                      <span>套用此範本建立帳密</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
                    分類目錄 (例如: 網銀金融、社群)
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
                    className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加欄位</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {fields.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl"
                    >
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
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
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
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
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
