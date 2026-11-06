import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Shield,
  Lock,
  Plus,
  Search,
  QrCode,
  Settings,
  Sparkles,
  Layers,
  Wand2,
  KeyRound,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  Smartphone,
  Eye,
  EyeOff,
  Filter,
  X,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  RotateCcw,
  Trash2,
  BookOpen,
} from 'lucide-react';
import {
  VaultItem,
  VaultTemplate,
  IdentitySnippet,
  VaultPayload,
  AppSettings,
  DeletedVaultItem,
} from './types/vault';
import {
  isVaultInitialized,
  initializeVaultWithPassword,
  unlockVault,
  saveVaultPayload,
  getAppSettings,
  saveAppSettings,
  wipeLocalVault,
} from './services/storageService';
import { deriveKeyFromPassword, generateSalt } from './services/cryptoService';
import { LockScreen } from './components/LockScreen';
import { VaultCard } from './components/VaultCard';
import { VaultEditorModal } from './components/VaultEditorModal';
import { TemplateManager } from './components/TemplateManager';
import { SnippetManager } from './components/SnippetManager';
import { PasswordGeneratorModal } from './components/PasswordGeneratorModal';
import { CrossDeviceSyncModal } from './components/CrossDeviceSyncModal';
import { SettingsModal } from './components/SettingsModal';
import { RecentlyDeletedModal } from './components/RecentlyDeletedModal';
import { UserManualModal } from './components/UserManualModal';
import { useAutoLock } from './hooks/useAutoLock';
import { clearClipboardNow } from './utils/clipboard';
import { CURRENT_APP_VERSION, IS_CURRENT_BETA } from './utils/version';

export default function App() {
  // Vault state
  const [isInitialized, setIsInitialized] = useState<boolean>(() => isVaultInitialized());
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [vaultPayload, setVaultPayload] = useState<VaultPayload>({
    items: [],
    templates: [],
    snippets: [],
  });

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => getAppSettings());

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'vault' | 'templates' | 'snippets' | 'generator'>('vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  // Vault Tree & Item Expansion State (進保險庫/ 全部 預設為全部收合)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  // 切換分類 (預設全部收合)
  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setExpandedItemIds(new Set());
    if (cat === '全部') {
      setExpandedCategories(new Set());
    }
  };

  // 切換分頁 (進保險庫/全部 預設為全部收合)
  const handleSwitchTab = (tab: 'vault' | 'templates' | 'snippets' | 'generator') => {
    setCurrentTab(tab);
    if (tab === 'vault') {
      setSelectedCategory('全部');
      setExpandedCategories(new Set());
      setExpandedItemIds(new Set());
    }
  };

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const toggleItemExpand = useCallback((id: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Remember last screen on timeout lock (跳出 app 或超時鎖定後維持在最後畫面)
  const lastScreenRef = useRef<{
    tab: 'vault' | 'templates' | 'snippets' | 'generator';
    category: string;
    search: string;
    isManualLogout: boolean;
  }>({
    tab: 'vault',
    category: '全部',
    search: '',
    isManualLogout: false,
  });

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [activeTemplateForNew, setActiveTemplateForNew] = useState<VaultTemplate | null>(null);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<VaultItem | null>(null);
  const [trashConfirmAction, setTrashConfirmAction] = useState<{
    type: 'permanent' | 'empty';
    targetId?: string;
    targetTitle?: string;
  } | null>(null);

  // Undo Toast state (防誤刪即時救回)
  const [undoToast, setUndoToast] = useState<{
    message: string;
    item: VaultItem;
  } | null>(null);
  const undoTimerRef = useRef<any>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Inactivity / background timeout lock (維持最後畫面，徹底抹除 RAM 敏感帳密)
  const handleTimeoutLock = useCallback(() => {
    // 儲存當前畫面狀態，登入後恢復
    lastScreenRef.current = {
      tab: currentTab,
      category: selectedCategory,
      search: searchQuery,
      isManualLogout: false,
    };
    // 記憶體敏感資料徹底清空 (Zeroing RAM on Lock)
    setSessionKey(null);
    setVaultPayload({ items: [], templates: [], snippets: [] });
    setEditingItem(null);
    setDeletingItem(null);
    setTrashConfirmAction(null);
    setUndoToast(null);
    clearClipboardNow();

    setIsLocked(true);
    setIsEditorOpen(false);
    setIsSyncModalOpen(false);
    setIsSettingsOpen(false);
    setIsGeneratorOpen(false);
    setIsManualOpen(false);
  }, [currentTab, selectedCategory, searchQuery]);

  // Explicit user manual lock (手動登出，重設回首頁，徹底抹除 RAM 敏感帳密)
  const handleManualLock = useCallback(() => {
    lastScreenRef.current = {
      tab: 'vault',
      category: '全部',
      search: '',
      isManualLogout: true,
    };
    // 記憶體敏感資料徹底清空 (Zeroing RAM on Lock)
    setSessionKey(null);
    setVaultPayload({ items: [], templates: [], snippets: [] });
    setEditingItem(null);
    setDeletingItem(null);
    setTrashConfirmAction(null);
    setUndoToast(null);
    clearClipboardNow();

    setIsLocked(true);
    setIsEditorOpen(false);
    setIsSyncModalOpen(false);
    setIsSettingsOpen(false);
    setIsGeneratorOpen(false);
    setIsManualOpen(false);
    setCurrentTab('vault');
    setSelectedCategory('全部');
    setSearchQuery('');
  }, []);

  // Inactivity auto-lock hook
  useAutoLock({
    timeoutMinutes: settings.autoLockMinutes,
    onLock: handleTimeoutLock,
    isEnabled: !isLocked && sessionKey !== null,
  });

  // Unlock callback (登入後若為逾時鎖定，自動維持在最後畫面)
  const handleUnlock = async (password: string): Promise<boolean> => {
    const result = await unlockVault(password);
    if (!result) return false;

    setSessionKey(result.key);
    setVaultPayload(result.payload);
    setIsLocked(false);

    // 恢復最後瀏覽畫面
    if (!lastScreenRef.current.isManualLogout) {
      setCurrentTab(lastScreenRef.current.tab);
      setSelectedCategory(lastScreenRef.current.category);
      setSearchQuery(lastScreenRef.current.search);
    }

    showToast('保險庫已解鎖');
    return true;
  };

  // First time initialization callback
  const handleInitialize = async (password: string, recoveryEmail?: string): Promise<boolean> => {
    const result = await initializeVaultWithPassword(password);
    if (!result) return false;

    setIsInitialized(true);
    setSessionKey(result.key);

    const payload = {
      ...result.payload,
      recoveryEmail: recoveryEmail || '',
    };
    setVaultPayload(payload);
    setIsLocked(false);

    if (recoveryEmail) {
      const updatedSettings = { ...settings, recoveryEmail };
      setSettings(updatedSettings);
      saveAppSettings(updatedSettings);
    }

    showToast('保險庫初始化完成！已建立安全加密儲存');
    return true;
  };

  // Reset password via Email Recovery
  const handleResetPasswordWithRecovery = async (newPassword: string): Promise<boolean> => {
    try {
      const newSalt = generateSalt();
      const newKey = await deriveKeyFromPassword(newPassword, newSalt);

      await saveVaultPayload(vaultPayload, newKey);
      setSessionKey(newKey);
      setIsLocked(false);
      showToast('主密碼已透過救援成功重設！保險庫已解鎖');
      return true;
    } catch {
      return false;
    }
  };

  // Reset entire vault
  const handleResetVault = () => {
    wipeLocalVault();
    setIsInitialized(false);
    handleManualLock();
    showToast('本機資料庫已完全銷毀重設');
  };

  // Update & Save Vault Payload
  const updateAndSavePayload = async (newPayload: VaultPayload) => {
    if (!sessionKey) return;
    setVaultPayload(newPayload);
    await saveVaultPayload(newPayload, sessionKey);
  };

  // Item CRUD
  const handleSaveItem = async (item: VaultItem) => {
    const exists = vaultPayload.items.some(i => i.id === item.id);
    let updatedItems: VaultItem[];
    if (exists) {
      updatedItems = vaultPayload.items.map(i => (i.id === item.id ? item : i));
      showToast(`已更新「${item.title}」`);
    } else {
      updatedItems = [item, ...vaultPayload.items];
      showToast(`已新增「${item.title}」`);
    }

    await updateAndSavePayload({
      ...vaultPayload,
      items: updatedItems,
    });
  };

  const triggerUndoToast = (item: VaultItem) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({
      message: `已刪除「${item.title}」，已移入最近刪除`,
      item,
    });
    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 8000);
  };

  const handleInstantUndo = async () => {
    if (!undoToast) return;
    const restored = undoToast.item;
    setUndoToast(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    await handleRestoreItem(restored);
  };

  // 觸發安全刪除確認彈窗 (防手滑誤刪)
  const handleDeleteItem = (id: string) => {
    const target = vaultPayload.items.find(i => i.id === id);
    if (!target) return;
    setDeletingItem(target);
  };

  // 確認刪除：移入「最近刪除回收站」，提供即時 Undo 救回
  const confirmDeleteItem = async () => {
    if (!deletingItem) return;
    const target = deletingItem;
    setDeletingItem(null);

    const updatedRecentlyDeleted: DeletedVaultItem[] = [
      { item: target, deletedAt: Date.now() },
      ...(vaultPayload.recentlyDeleted || []).filter(d => d.item.id !== target.id),
    ];
    const updatedItems = vaultPayload.items.filter(i => i.id !== target.id);

    await updateAndSavePayload({
      ...vaultPayload,
      items: updatedItems,
      recentlyDeleted: updatedRecentlyDeleted,
    });

    triggerUndoToast(target);
  };

  // 還原單一已刪除單元
  const handleRestoreItem = async (item: VaultItem) => {
    const exists = vaultPayload.items.some(i => i.id === item.id);
    let updatedItems: VaultItem[];
    if (exists) {
      updatedItems = vaultPayload.items.map(i => (i.id === item.id ? item : i));
    } else {
      updatedItems = [item, ...vaultPayload.items];
    }
    const updatedRecentlyDeleted = (vaultPayload.recentlyDeleted || []).filter(
      d => d.item.id !== item.id
    );
    await updateAndSavePayload({
      ...vaultPayload,
      items: updatedItems,
      recentlyDeleted: updatedRecentlyDeleted,
    });
    showToast(`已成功救回還原「${item.title}」！`);
  };

  // 全部還原
  const handleRestoreAllDeleted = async () => {
    if (!vaultPayload.recentlyDeleted || vaultPayload.recentlyDeleted.length === 0) return;
    const restoredItems = vaultPayload.recentlyDeleted.map(d => d.item);
    const existingIds = new Set(vaultPayload.items.map(i => i.id));
    const newItems = restoredItems.filter(i => !existingIds.has(i.id));
    const updatedItems = [...newItems, ...vaultPayload.items];
    await updateAndSavePayload({
      ...vaultPayload,
      items: updatedItems,
      recentlyDeleted: [],
    });
    setIsTrashOpen(false);
    showToast(`已成功還原所有已刪除之帳密單元 (${restoredItems.length} 筆)！`);
  };

  // 永久徹底刪除 (觸發自製確認彈窗，杜絕原生 confirm 洩漏網域)
  const handlePermanentlyDeleteItem = (id: string) => {
    const target = (vaultPayload.recentlyDeleted || []).find(d => d.item.id === id);
    if (!target) return;
    setTrashConfirmAction({
      type: 'permanent',
      targetId: id,
      targetTitle: target.item.title,
    });
  };

  // 清空回收站 (觸發自製確認彈窗，杜絕原生 confirm 洩漏網域)
  const handleEmptyTrash = () => {
    if (!vaultPayload.recentlyDeleted || vaultPayload.recentlyDeleted.length === 0) return;
    setTrashConfirmAction({
      type: 'empty',
    });
  };

  const confirmTrashAction = async () => {
    if (!trashConfirmAction) return;
    if (trashConfirmAction.type === 'permanent' && trashConfirmAction.targetId) {
      const id = trashConfirmAction.targetId;
      const title = trashConfirmAction.targetTitle;
      const updatedRecentlyDeleted = (vaultPayload.recentlyDeleted || []).filter(
        d => d.item.id !== id
      );
      await updateAndSavePayload({
        ...vaultPayload,
        recentlyDeleted: updatedRecentlyDeleted,
      });
      showToast(`已徹底銷毀「${title}」`);
    } else if (trashConfirmAction.type === 'empty') {
      await updateAndSavePayload({
        ...vaultPayload,
        recentlyDeleted: [],
      });
      setIsTrashOpen(false);
      showToast('已清空最近刪除回收站');
    }
    setTrashConfirmAction(null);
  };

  // Templates & Snippets Save
  const handleSaveTemplates = async (templates: VaultTemplate[]) => {
    await updateAndSavePayload({
      ...vaultPayload,
      templates,
    });
    showToast('範本庫已更新');
  };

  // 根據單元一鍵生成新範本 (防重複點選偵測)
  const handleGenerateTemplateFromItem = (item: VaultItem) => {
    const targetName = `${item.title} 範本`;
    const existing = (vaultPayload.templates || []).find(
      t =>
        t.name.trim().toLowerCase() === targetName.trim().toLowerCase() ||
        t.name.trim().toLowerCase() === item.title.trim().toLowerCase()
    );

    if (existing) {
      showToast(`已有同名範本「${existing.name}」，避免重複建立！`);
      return;
    }

    const newTemplate: VaultTemplate = {
      id: 'tpl_' + Date.now(),
      name: targetName,
      category: item.category || '自訂',
      description: `由單元「${item.title}」自動產生之專用格式`,
      icon: 'BookmarkPlus',
      fields: item.fields.map(f => ({
        label: f.label,
        isSensitive: f.isSensitive,
        defaultValue: '',
      })),
      isBuiltIn: false,
    };

    handleSaveTemplates([newTemplate, ...(vaultPayload.templates || [])]);
    showToast(`已根據「${item.title}」成功生成新範本！`);
  };

  const handleSaveSnippets = async (snippets: IdentitySnippet[]) => {
    await updateAndSavePayload({
      ...vaultPayload,
      snippets,
    });
    showToast('常用個人資料字串庫已更新');
  };

  // Open editor from template
  const handleApplyTemplateToNewItem = (tpl: VaultTemplate) => {
    setActiveTemplateForNew(tpl);
    setEditingItem(null);
    setIsEditorOpen(true);
  };

  // Handle Resolved Cross-Device Sync (資料不同，保留並自主決策結果)
  const handleApplyResolvedSync = async (
    resolvedItems: VaultItem[],
    newTemplates: any[],
    newSnippets: any[]
  ) => {
    if (!sessionKey) return;

    // 保證所有單元具有完整的必要欄位陣列，避免舊資料結構破壞畫面
    const sanitizedItems = resolvedItems.map(item => ({
      ...item,
      fields: Array.isArray(item.fields) ? item.fields : [],
      notes: item.notes || '',
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
    }));

    const updatedTemplates = [...(vaultPayload.templates || []), ...newTemplates];
    const updatedSnippets = [...(vaultPayload.snippets || []), ...newSnippets];

    const mergedPayload: VaultPayload = {
      ...vaultPayload,
      items: sanitizedItems,
      templates: updatedTemplates,
      snippets: updatedSnippets,
    };

    await updateAndSavePayload(mergedPayload);

    // 接收同步完成後，自動切回保險庫首頁並重設為「全部」分類，確保剛接收的單元立即映入眼簾！
    setCurrentTab('vault');
    setSelectedCategory('全部');
    setSearchQuery('');
    setExpandedCategories(new Set());
    setExpandedItemIds(new Set());
    showToast(`同步完成！現有 ${sanitizedItems.length} 筆帳密`);
  };

  // Filtered categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('全部');
    vaultPayload.items.forEach(item => {
      if (item.category) set.add(item.category);
    });
    ['網銀金融', '信用卡', '行動應用', '企業廠商', '電子郵件', '雲端服務', '會員證卡', '通用帳密'].forEach(c => set.add(c));
    return Array.from(set);
  }, [vaultPayload.items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return vaultPayload.items.filter(item => {
      const matchCategory = selectedCategory === '全部' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAccount = item.account.toLowerCase().includes(q);
      const matchCategoryText = item.category.toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchFields = (item.fields || []).some(
        f => f.label.toLowerCase().includes(q) || f.value.toLowerCase().includes(q)
      );

      return matchTitle || matchAccount || matchCategoryText || matchNotes || matchFields;
    });
  }, [vaultPayload.items, selectedCategory, searchQuery]);

  // Group items by category for Tree hierarchy under '全部'
  const groupedCategories = useMemo(() => {
    if (selectedCategory !== '全部') return null;
    const groups = new Map<string, VaultItem[]>();
    filteredItems.forEach(item => {
      const cat = item.category?.trim() || '通用帳密';
      if (!groups.has(cat)) {
        groups.set(cat, []);
      }
      groups.get(cat)!.push(item);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], 'zh-Hant'));
  }, [filteredItems, selectedCategory]);

  const handleExpandAll = useCallback(() => {
    if (selectedCategory === '全部' && groupedCategories) {
      setExpandedCategories(new Set(groupedCategories.map(([cat]) => cat)));
    }
    setExpandedItemIds(new Set(filteredItems.map(item => item.id)));
  }, [selectedCategory, groupedCategories, filteredItems]);

  const handleCollapseAll = useCallback(() => {
    setExpandedCategories(new Set());
    setExpandedItemIds(new Set());
  }, []);

  // If locked or not initialized, render LockScreen
  if (!isInitialized || isLocked || !sessionKey) {
    return (
      <LockScreen
        isInitialized={isInitialized}
        onUnlock={handleUnlock}
        onInitialize={handleInitialize}
        onResetVault={handleResetVault}
        onResetPasswordWithRecovery={handleResetPasswordWithRecovery}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-[calc(max(env(safe-area-inset-bottom),1rem)+5rem)]">
      {/* Top App Bar (with iOS safe area clearance) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                  SafeVault
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">
                  Beta
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className="text-emerald-600 font-semibold">100% 離線安全庫</span>
                <span aria-hidden="true">·</span>
                <span>AES-256</span>
              </div>
            </div>
          </div>

          {/* Top Actions: 更新相關統一收斂於設定 (Settings) 內處理 */}
          <div className="flex items-center gap-1.5">
            {/* Recently Deleted / Trash */}
            {(vaultPayload.recentlyDeleted || []).length > 0 && (
              <button
                type="button"
                onClick={() => setIsTrashOpen(true)}
                title="防誤刪回收站：隨時救回刪除的帳密單元"
                className="px-2.5 py-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">最近刪除</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                  {vaultPayload.recentlyDeleted!.length}
                </span>
              </button>
            )}

            {/* In-App User Manual Guide */}
            <button
              onClick={() => setIsManualOpen(true)}
              title="使用手冊與操作說明"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 text-xs font-medium cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">說明手冊</span>
            </button>

            {/* Cross-device sync */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              title="跨裝置離線同步"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 text-xs font-medium cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">近場同步</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="偏好與安全設定"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Lock Button (手動登出) */}
            <button
              onClick={handleManualLock}
              title="立即手動上鎖保險庫"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">上鎖</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6">
        {/* TAB 1: VAULT ITEMS */}
        {currentTab === 'vault' && (
          <div className="space-y-4">
            {/* Search Bar & Quick Add */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜尋帳號、服務、分類或備註..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    清除
                  </button>
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={() => {
                  setEditingItem(null);
                  setActiveTemplateForNew(null);
                  setIsEditorOpen(true);
                }}
                className="h-10 px-3.5 sm:px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-sm transition flex items-center gap-1.5 shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>新增帳密</span>
              </button>
            </div>

            {/* Category horizontal scrolling tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition font-medium ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Items Count, Expand/Collapse All Buttons, and Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
              <div className="flex items-center gap-2">
                <span>
                  共 <strong>{filteredItems.length}</strong> 筆帳密項目
                  {selectedCategory !== '全部' && ` · ${selectedCategory}`}
                </span>
                {(vaultPayload.recentlyDeleted || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsTrashOpen(true)}
                    className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200/90 text-amber-800 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs"
                    title="開啟防誤刪回收站，隨時救回刪除的帳密"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-600" />
                    <span>最近刪除</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 font-mono text-[10px] font-bold">
                      {vaultPayload.recentlyDeleted!.length}
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filteredItems.length > 0 && (
                  <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200/80">
                    <button
                      onClick={handleExpandAll}
                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-white transition flex items-center gap-1 shadow-2xs"
                      title="全部展開"
                    >
                      <ChevronsDown className="w-3.5 h-3.5 text-slate-600" />
                      <span>全部展開</span>
                    </button>
                    <button
                      onClick={handleCollapseAll}
                      className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-white transition flex items-center gap-1 shadow-2xs"
                      title="全部收合"
                    >
                      <ChevronsUp className="w-3.5 h-3.5 text-slate-600" />
                      <span>全部收合</span>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">強密碼產生器</span>
                  <span className="sm:hidden">產生器</span>
                </button>
              </div>
            </div>

            {/* Vault Content: Tree Hierarchy for '全部', Compact Row List for specific category */}
            {filteredItems.length === 0 ? (
              <div className="py-16 px-4 text-center bg-white border border-dashed border-slate-200 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {searchQuery ? '無相符的帳密搜尋結果' : '保險庫中尚無帳密項目'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {searchQuery
                    ? '請嘗試使用其他關鍵字，或切換分類標籤'
                    : '點擊上方「新增帳密」建立第一筆加密帳號密碼，或使用預設範本快速生成！'}
                </p>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setActiveTemplateForNew(null);
                    setIsEditorOpen(true);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition shadow-sm inline-flex items-center gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>立即建立新帳密</span>
                </button>
              </div>
            ) : selectedCategory === '全部' && groupedCategories ? (
              /* 樹枝階層目錄 (分類 -> 名稱，進全部預設收合，點擊開啟單元) */
              <div className="space-y-3">
                {groupedCategories.map(([cat, items]) => {
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
                            {items.map(item => (
                              <div key={item.id} className="relative">
                                {/* 樹枝橫向節點連接線 */}
                                <div className="absolute -left-[14px] sm:-left-[18px] top-4 w-3 sm:w-3.5 h-[2px] bg-slate-200 rounded-full" />
                                <VaultCard
                                  item={item}
                                  isExpanded={expandedItemIds.has(item.id)}
                                  onToggleExpand={() => toggleItemExpand(item.id)}
                                  showCategoryBadge={false}
                                  onEdit={it => {
                                    setEditingItem(it);
                                    setActiveTemplateForNew(null);
                                    setIsEditorOpen(true);
                                  }}
                                  onDelete={handleDeleteItem}
                                  onGenerateTemplateFromItem={handleGenerateTemplateFromItem}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 其他分類以名稱列呈現，點擊才開啟目前單元 */
              <div className="space-y-2">
                {filteredItems.map(item => (
                  <VaultCard
                    key={item.id}
                    item={item}
                    isExpanded={expandedItemIds.has(item.id)}
                    onToggleExpand={() => toggleItemExpand(item.id)}
                    showCategoryBadge={false}
                    onEdit={it => {
                      setEditingItem(it);
                      setActiveTemplateForNew(null);
                      setIsEditorOpen(true);
                    }}
                    onDelete={handleDeleteItem}
                    onGenerateTemplateFromItem={handleGenerateTemplateFromItem}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEMPLATES */}
        {currentTab === 'templates' && (
          <TemplateManager
            templates={vaultPayload.templates}
            onSaveTemplates={handleSaveTemplates}
            onApplyTemplateToNewItem={handleApplyTemplateToNewItem}
          />
        )}

        {/* TAB 3: SNIPPETS (常用字串庫) */}
        {currentTab === 'snippets' && (
          <SnippetManager
            snippets={vaultPayload.snippets}
            onSaveSnippets={handleSaveSnippets}
          />
        )}

        {/* TAB 4: PASSWORD GENERATOR */}
        {currentTab === 'generator' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">強密碼產生工具</h2>
                  <p className="text-xs text-slate-500">自訂長度與字符集，防範暴力破解</p>
                </div>
              </div>

              <PasswordGeneratorModal
                isOpen={true}
                onClose={() => setCurrentTab('vault')}
                onApply={pw => {
                  showToast('已複製強密碼至剪貼簿！');
                  setCurrentTab('vault');
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Fixed Mobile Bottom Tab Bar (with iOS home bar safe area clearance) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center gap-1">
          <button
            onClick={() => handleSwitchTab('vault')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentTab === 'vault' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-1">保險庫</span>
          </button>

          <button
            onClick={() => handleSwitchTab('templates')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentTab === 'templates' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-1">範本格式</span>
          </button>

          <button
            onClick={() => handleSwitchTab('snippets')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentTab === 'snippets' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1">常用資料</span>
          </button>

          <button
            onClick={() => handleSwitchTab('generator')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentTab === 'generator' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wand2 className="w-5 h-5" />
            <span className="text-[10px] mt-1">密碼工具</span>
          </button>
        </div>
      </nav>

      {/* Vault Editor Modal */}
      <VaultEditorModal
        isOpen={isEditorOpen}
        initialItem={editingItem}
        initialTemplate={activeTemplateForNew}
        templates={vaultPayload.templates}
        snippets={vaultPayload.snippets}
        existingCategories={categories.filter(c => c !== '全部')}
        defaultCategory={selectedCategory !== '全部' ? selectedCategory : '通用帳密'}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingItem(null);
          setActiveTemplateForNew(null);
        }}
        onSave={handleSaveItem}
        onSaveNewTemplate={newTpl => {
          handleSaveTemplates([newTpl, ...vaultPayload.templates]);
        }}
      />

      {/* Cross Device Sync Modal (with Granular Diff & Keep-Both Resolution) */}
      <CrossDeviceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        vaultPayload={vaultPayload}
        onApplyResolvedSync={handleApplyResolvedSync}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={newSettings => {
          setSettings(newSettings);
          saveAppSettings(newSettings);
          showToast('安全偏好設定已儲存');
        }}
        vaultPayload={vaultPayload}
        currentKey={sessionKey}
        onKeyUpdated={newKey => {
          setSessionKey(newKey);
        }}
        onLockNow={handleManualLock}
        onOpenManual={() => setIsManualOpen(true)}
      />

      {/* In-App User Manual Guide Modal */}
      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      {/* Dedicated Floating Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

      {/* Recently Deleted Trash Bin Modal */}
      <RecentlyDeletedModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        deletedItems={vaultPayload.recentlyDeleted || []}
        onRestoreItem={handleRestoreItem}
        onRestoreAll={handleRestoreAllDeleted}
        onPermanentlyDeleteItem={handlePermanentlyDeleteItem}
        onEmptyTrash={handleEmptyTrash}
      />

      {/* Safe Unit Deletion Reminder Modal (單元刪除專屬安全提醒) */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">單元刪除安全提醒</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  請確認是否要刪除以下帳密單元？
                </p>

                {/* Target item summary card */}
                <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {deletingItem.title}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md text-[10px] font-semibold shrink-0">
                      {deletingItem.category || '未分類'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>包含 {deletingItem.fields.length} 個欄位與保密資料</span>
                    {deletingItem.account && (
                      <span className="truncate text-slate-700 font-mono">
                        · 帳號: {deletingItem.account}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recovery Guarantee Notice */}
                <div className="mt-3 p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-amber-900 text-xs space-y-1">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>防手滑誤刪安全保護機制</span>
                  </p>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    刪除後不會立即銷毀，將移至「<strong>最近刪除回收站</strong>」，畫面下方亦會提供 <strong>8 秒內【↩ 立即救回】</strong>，隨時可一鍵完整復原密碼！
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                取消 (保留此單元)
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>確認移入回收站</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Trash Destruction Confirmation Modal (取代原生 confirm，徹底消除網域名稱顯示) */}
      {trashConfirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {trashConfirmAction.type === 'permanent' ? '徹底銷毀確認' : '清空回收站確認'}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">SafeVault 永久銷毀保護</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {trashConfirmAction.type === 'permanent' ? (
                <>
                  確定要徹底銷毀「<strong className="text-slate-900 font-semibold">{trashConfirmAction.targetTitle}</strong>」嗎？此動作將完全清除，無法再救回。
                </>
              ) : (
                <>
                  確定要清空回收站嗎？回收站內的 <strong className="text-slate-900 font-semibold">{vaultPayload.recentlyDeleted?.length || 0}</strong> 筆項目將被徹底銷毀，無法再復原。
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTrashConfirmAction(null)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer text-center"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmTrashAction}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>徹底銷毀</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Undo Toast Notification (8秒內一鍵立即救回) */}
      {undoToast && (
        <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom),1rem)+4.5rem)] left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[92vw] sm:max-w-md">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              已刪除「<strong className="text-white">{undoToast.item.title}</strong>」
            </span>
          </div>
          <button
            type="button"
            onClick={handleInstantUndo}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm shrink-0"
            title="立即還原此項目"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>立即救回</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
              setUndoToast(null);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition shrink-0 cursor-pointer"
            title="關閉提示"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Non-intrusive Toast Notification (above iOS safe area) */}
      {toastMessage && (
        <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom),1rem)+4.5rem)] left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md flex items-center gap-2 animate-bounce-subtle pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
