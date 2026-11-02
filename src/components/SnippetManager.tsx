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
  Sparkles,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Search,
} from 'lucide-react';
import { IdentitySnippet, SnippetCategory } from '../types/vault';
import { copyToClipboardSecure } from '../utils/clipboard';

interface SnippetManagerProps {
  snippets: IdentitySnippet[];
  onSaveSnippets: (snippets: IdentitySnippet[]) => void;
}

const STANDARD_CATEGORIES: { id: SnippetCategory; label: string }[] = [
  { id: 'phone', label: '電話號碼' },
  { id: 'address', label: '地址通訊' },
  { id: 'birthday', label: '出生年月日' },
  { id: 'id_card', label: '身分證/居留' },
  { id: 'tax_id', label: '公司統編' },
  { id: 'email', label: '電子信箱' },
];

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
  const [isAddingNewCustom, setIsAddingNewCustom] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 主頁面分類標籤選取（對齊保險庫分類列）
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('全部');

  // 搜尋與樹枝階層展開/收合狀態 (進常用資料庫預設全收合，點選該單元再開啟)
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSnippetIds, setExpandedSnippetIds] = useState<Set<string>>(new Set());

  // 萃取所有現存的「自訂分類標籤」列表 (動態聚合，自訂過後立即顯示於分類區)
  const existingCustomCategories = useMemo(() => {
    const list: string[] = [];
    snippets.forEach(s => {
      if (s.category === 'custom' && s.customCategory?.trim()) {
        const val = s.customCategory.trim();
        if (!list.includes(val)) {
          list.push(val);
        }
      }
    });
    return list;
  }, [snippets]);

  const getCategoryDisplayName = (snippet: IdentitySnippet): string => {
    if (snippet.category === 'custom') {
      return snippet.customCategory?.trim() || '自訂標籤';
    }
    const map: Record<SnippetCategory, string> = {
      phone: '電話號碼',
      address: '地址通訊',
      birthday: '出生年月日',
      id_card: '身分證/居留證',
      tax_id: '公司統編/抬頭',
      email: '電子郵件',
      custom: '自訂標籤',
    };
    return map[snippet.category];
  };

  // 主畫面橫向分類標籤列：全部 + 常用內建分類 + 所有已自訂之標籤
  const allCategoryTabs = useMemo(() => {
    const set = new Set<string>();
    set.add('全部');
    // 依序加入有使用到的內建分類
    snippets.forEach(s => {
      if (s.category !== 'custom') {
        set.add(getCategoryDisplayName(s));
      }
    });
    // 將所有已自訂之標籤納入主分類列
    existingCustomCategories.forEach(c => set.add(c));
    return Array.from(set);
  }, [snippets, existingCustomCategories]);

  // 開啟新增字串 (智慧繼承目前所選的分類標籤)
  const startAdd = () => {
    setTitle('');
    setValue('');
    setEditingSnippet(null);
    setIsAddingNewCustom(false);

    // 若目前在特定分類標籤下點擊新增，自動繼承該分類
    if (selectedCategoryTab !== '全部') {
      if (existingCustomCategories.includes(selectedCategoryTab)) {
        setCategory('custom');
        setCustomCategoryInput(selectedCategoryTab);
      } else {
        const matched = STANDARD_CATEGORIES.find(
          c => c.label === selectedCategoryTab || selectedCategoryTab.startsWith(c.label)
        );
        if (matched) {
          setCategory(matched.id);
          setCustomCategoryInput('');
        } else {
          setCategory('custom');
          setCustomCategoryInput(selectedCategoryTab);
        }
      }
    } else {
      // 預設若有已自訂標籤，可選自訂或第一個常用
      if (existingCustomCategories.length > 0) {
        setCategory('custom');
        setCustomCategoryInput(existingCustomCategories[0]);
      } else {
        setCategory('phone');
        setCustomCategoryInput('');
      }
    }

    setIsEditorModalOpen(true);
  };

  const startEdit = (snippet: IdentitySnippet) => {
    setTitle(snippet.title);
    setValue(snippet.value);
    setCategory(snippet.category);
    setCustomCategoryInput(snippet.customCategory || '');
    setIsAddingNewCustom(
      snippet.category === 'custom' &&
      !!snippet.customCategory &&
      !existingCustomCategories.includes(snippet.customCategory)
    );
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

    let trimmedCustomCat: string | undefined = undefined;
    if (category === 'custom') {
      trimmedCustomCat = customCategoryInput.trim() || '自訂標籤';
    }

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
      // 自動展開新增字串所屬的分類與單元
      const targetCatName = getCategoryDisplayName(newSnippet);
      setExpandedCategories(prev => new Set(prev).add(targetCatName));
      setExpandedSnippetIds(prev => new Set(prev).add(newSnippet.id));
    }

    setIsEditorModalOpen(false);
    setEditingSnippet(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`確定刪除「${name}」？`)) {
      onSaveSnippets(snippets.filter(s => s.id !== id));
      setExpandedSnippetIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
      case 'phone':
        return <Phone className="w-4 h-4 text-emerald-600" />;
      case 'address':
        return <MapPin className="w-4 h-4 text-sky-600" />;
      case 'birthday':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'id_card':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'tax_id':
        return <Building className="w-4 h-4 text-indigo-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-rose-600" />;
      default:
        return <Tag className="w-4 h-4 text-sky-600" />;
    }
  };

  // 依分類分組與篩選（包含分類標籤篩選與關鍵字搜尋）
  const groupedSnippets = useMemo(() => {
    const filtered = snippets.filter(s => {
      const catName = getCategoryDisplayName(s);

      // 分類標籤篩選
      if (selectedCategoryTab !== '全部') {
        if (catName !== selectedCategoryTab) {
          return false;
        }
      }

      // 關鍵字搜尋
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.value.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q)
      );
    });

    const groups: Record<string, IdentitySnippet[]> = {};
    for (const snip of filtered) {
      const catName = getCategoryDisplayName(snip);
      if (!groups[catName]) groups[catName] = [];
      groups[catName].push(snip);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'zh-TW'));
  }, [snippets, searchQuery, selectedCategoryTab]);

  // 切換分類標籤
  const handleSelectCategoryTab = (catTab: string) => {
    setSelectedCategoryTab(catTab);
    if (catTab !== '全部') {
      // 切換至特定分類時，自動展開該分類目錄
      setExpandedCategories(prev => new Set(prev).add(catTab));
    }
  };

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

  // 單元展開/收合切換 (點選該單元再開啟)
  const toggleSnippet = (snipId: string) => {
    setExpandedSnippetIds(prev => {
      const next = new Set(prev);
      if (next.has(snipId)) {
        next.delete(snipId);
      } else {
        next.add(snipId);
      }
      return next;
    });
  };

  // 全部展開
  const handleExpandAll = () => {
    const allCats = new Set<string>();
    const allIds = new Set<string>();
    groupedSnippets.forEach(([cat, items]) => {
      allCats.add(cat);
      items.forEach(s => allIds.add(s.id));
    });
    setExpandedCategories(allCats);
    setExpandedSnippetIds(allIds);
  };

  // 全部收合
  const handleCollapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedSnippetIds(new Set());
  };

  const totalFilteredCount = groupedSnippets.reduce((acc, [, items]) => acc + items.length, 0);

  return (
    <div className="space-y-4">
      {/* Intro and Add action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">常用個人資料字串庫</h2>
          <p className="text-xs text-slate-500">
            樹枝階層目錄管理，點選單元即可展開完整字串內容與快速複製
          </p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm shrink-0 active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新增字串</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜尋字串標題、內容或分類標籤..."
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
      </div>

      {/* Category Horizontal Scrolling Tabs (包含所有自訂標籤，自訂後即時呈現於此！) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {allCategoryTabs.map(catTab => {
          const isSelected = selectedCategoryTab === catTab;
          const isCustomTag = existingCustomCategories.includes(catTab);

          return (
            <button
              key={catTab}
              type="button"
              onClick={() => handleSelectCategoryTab(catTab)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition font-medium cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : isCustomTag
                  ? 'bg-sky-50/70 text-sky-800 border border-sky-200/80 hover:bg-sky-100'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              {isCustomTag && <Tag className="w-3 h-3 text-sky-600" />}
              <span>{catTab}</span>
            </button>
          );
        })}
      </div>

      {/* Total Summary and Expand/Collapse All Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <span className="text-[11px] shrink-0">
          共 <strong>{totalFilteredCount}</strong> 筆常用資料
          {selectedCategoryTab !== '全部' && ` · ${selectedCategoryTab}`}
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

      {/* Tree Hierarchy for Snippets (分類 -> 字串名稱，點選該單元再開啟) */}
      {groupedSnippets.length === 0 ? (
        <div className="py-12 px-4 text-center bg-white border border-dashed border-slate-200 rounded-3xl space-y-2">
          <Tag className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-xs font-bold text-slate-700">無相符的常用資料字串</h3>
          <p className="text-[11px] text-slate-400">
            {selectedCategoryTab !== '全部'
              ? `在「${selectedCategoryTab}」分類中尚未建立資料，點選上方「新增字串」即可直接建立！`
              : '請嘗試更換搜尋關鍵字，或點選上方新增常用字串'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedSnippets.map(([catName, items]) => {
            const isCatExpanded = searchQuery.trim() || selectedCategoryTab !== '全部'
              ? true
              : expandedCategories.has(catName);
            const isCustomGroup = existingCustomCategories.includes(catName);

            return (
              <div
                key={catName}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs transition"
              >
                {/* 分類目錄夾橫條 */}
                <div
                  onClick={() => toggleCategory(catName)}
                  className="flex items-center justify-between p-3 sm:px-4 cursor-pointer select-none bg-slate-50/70 hover:bg-slate-100/80 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-xl transition ${
                        isCatExpanded
                          ? isCustomGroup ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200/70 text-slate-600'
                      }`}
                    >
                      {isCatExpanded ? (
                        <FolderOpen className="w-4 h-4" />
                      ) : (
                        <Folder className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {catName}
                      </span>
                      {isCustomGroup && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-sky-100 text-sky-700 rounded-md font-semibold border border-sky-200/60 shrink-0">
                          自訂
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 font-medium shrink-0">
                      {items.length} 筆
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
                      {items.map(snippet => {
                        const isSnippetExpanded = searchQuery.trim()
                          ? true
                          : expandedSnippetIds.has(snippet.id);

                        return (
                          <div key={snippet.id} className="relative">
                            {/* 樹枝橫向節點連接線 */}
                            <div className="absolute -left-[14px] sm:-left-[18px] top-4 w-3 sm:w-3.5 h-[2px] bg-slate-200 rounded-full" />

                            {/* 字串單元本體 (收合為名稱列，點選開啟明細) */}
                            <div
                              className={`bg-white border rounded-2xl transition duration-150 overflow-hidden ${
                                isSnippetExpanded
                                  ? 'border-sky-300 shadow-sm ring-1 ring-sky-100'
                                  : 'border-slate-200/90 hover:border-slate-300 hover:shadow-2xs'
                              }`}
                            >
                              {/* 單元名稱列 (點選該單元再開啟) */}
                              <div
                                onClick={() => toggleSnippet(snippet.id)}
                                className="flex items-center justify-between p-3 sm:px-4 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <div
                                    className={`p-1.5 rounded-xl shrink-0 transition ${
                                      isSnippetExpanded
                                        ? 'bg-sky-100 text-sky-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {getCategoryIcon(snippet.category)}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                        {snippet.title}
                                      </span>
                                    </div>

                                    {/* 收合狀態下的簡短內容單行預覽 */}
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                                      <span className="text-slate-600 truncate">
                                        {snippet.value}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 右側快速動作與展開箭頭 */}
                                <div
                                  className="flex items-center gap-1.5 shrink-0"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {/* 快速安全複製按鈕 */}
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(snippet)}
                                    title="安全複製到剪貼簿"
                                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  >
                                    {copiedId === snippet.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* 展開/收合箭頭 */}
                                  <button
                                    type="button"
                                    onClick={() => toggleSnippet(snippet.id)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                    title={isSnippetExpanded ? '收合字串' : '點擊開啟字串資料'}
                                  >
                                    {isSnippetExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-slate-600" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* 點擊展開後的完整內容與操作 */}
                              {isSnippetExpanded && (
                                <div className="p-3.5 sm:p-4 bg-slate-50/50 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                                  {/* Monospace Full Value Display Box */}
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                      <span>完整內容（可點選文字全選或點擊複製）：</span>
                                      <span className="text-[10px] text-slate-400">
                                        分類：{catName}
                                      </span>
                                    </div>
                                    <div className="p-3 bg-white rounded-2xl text-xs sm:text-sm font-mono text-slate-800 break-all select-all border border-slate-200/90 shadow-2xs">
                                      {snippet.value}
                                    </div>
                                  </div>

                                  {/* Actions Bar */}
                                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                                    <div className="flex items-center gap-1.5">
                                      {/* 編輯此字串 */}
                                      <button
                                        type="button"
                                        onClick={() => startEdit(snippet)}
                                        className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl text-xs font-medium border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                                        title="編輯此字串"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>編輯字串</span>
                                      </button>

                                      {/* 刪除 */}
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(snippet.id, snippet.title)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                        title="刪除此字串"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    {/* 複製完整字串 */}
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(snippet)}
                                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ml-auto"
                                    >
                                      {copiedId === snippet.id ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>已安全複製</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          <span>複製完整字串</span>
                                        </>
                                      )}
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

      {/* Focused Editor Modal (包含內建分類與已自訂標籤區，支援一鍵點選) */}
      {isEditorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
              {/* Category Selection Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-700">
                    資料類型分類
                  </label>
                  {category === 'custom' && customCategoryInput && (
                    <span className="text-[10px] text-sky-700 font-semibold px-2 py-0.5 bg-sky-50 rounded-full border border-sky-200 truncate max-w-[150px]">
                      目前選用：{customCategoryInput}
                    </span>
                  )}
                </div>

                {/* 1. 內建標準分類選項 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2.5">
                  {STANDARD_CATEGORIES.map(cat => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          setIsAddingNewCustom(false);
                        }}
                        className={`px-2 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {getCategoryIcon(cat.id)}
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 2. 已自訂標籤區 (自訂過後即時顯示於此！點選即可套用) */}
                <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-sky-600" />
                      <span>自訂標籤區 (自訂後即時顯示)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      點選立即套用
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* 已自訂過的標籤按鈕 */}
                    {existingCustomCategories.map(catName => {
                      const isSelected = category === 'custom' && customCategoryInput.trim() === catName;
                      return (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => {
                            setCategory('custom');
                            setCustomCategoryInput(catName);
                            setIsAddingNewCustom(false);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition cursor-pointer border flex items-center gap-1 ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold'
                              : 'bg-sky-50/70 text-sky-800 border-sky-200 hover:bg-sky-100'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          <span>{catName}</span>
                        </button>
                      );
                    })}

                    {/* 新增全新自訂標籤按鈕 */}
                    <button
                      type="button"
                      onClick={() => {
                        setCategory('custom');
                        setIsAddingNewCustom(true);
                        if (existingCustomCategories.includes(customCategoryInput)) {
                          setCustomCategoryInput('');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium transition cursor-pointer border border-dashed flex items-center gap-1 ${
                        category === 'custom' && (isAddingNewCustom || !existingCustomCategories.includes(customCategoryInput))
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Plus className="w-3 h-3 text-slate-500" />
                      <span>+ 新增自訂標籤</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 若選擇自訂標籤或點擊新增自訂，顯示名稱輸入框（附帶快速下拉建議與清除鍵） */}
              {category === 'custom' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      自訂分類標籤名稱 (儲存後將自動加入自訂標籤區)
                    </label>
                    {customCategoryInput && (
                      <button
                        type="button"
                        onClick={() => setCustomCategoryInput('')}
                        className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        清空
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="custom-category-suggestions"
                      value={customCategoryInput}
                      onChange={e => setCustomCategoryInput(e.target.value)}
                      placeholder="輸入自訂分類標籤 (例如: 護照台胞、緊急聯絡人)..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                    <datalist id="custom-category-suggestions">
                      {existingCustomCategories.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>
              )}

              {/* Title Input with Clear button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    字串標題名稱 (例如: 公司戶籍地址、個人主要手機)
                  </label>
                  {title && (
                    <button
                      type="button"
                      onClick={handleClearTitle}
                      className="text-[10px] text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      清空
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="輸入字串標題..."
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                  {title && (
                    <button
                      type="button"
                      onClick={handleClearTitle}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Value Input with Clear button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    字串內容數值
                  </label>
                  {value && (
                    <button
                      type="button"
                      onClick={handleClearValue}
                      className="text-[10px] text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      清空
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    required
                    rows={3}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="輸入欲儲存的字串內容..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditorModalOpen(false);
                    setEditingSnippet(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
                >
                  {editingSnippet ? '儲存修改' : '新增常用字串'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
