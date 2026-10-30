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
} from 'lucide-react';
import {
  VaultItem,
  VaultTemplate,
  IdentitySnippet,
  VaultPayload,
  AppSettings,
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
import { useAutoLock } from './hooks/useAutoLock';
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

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Inactivity / background timeout lock (維持最後畫面)
  const handleTimeoutLock = useCallback(() => {
    // 儲存當前畫面狀態，登入後恢復
    lastScreenRef.current = {
      tab: currentTab,
      category: selectedCategory,
      search: searchQuery,
      isManualLogout: false,
    };
    setSessionKey(null);
    setIsLocked(true);
    setIsEditorOpen(false);
    setIsSyncModalOpen(false);
    setIsSettingsOpen(false);
    setIsGeneratorOpen(false);
  }, [currentTab, selectedCategory, searchQuery]);

  // Explicit user manual lock (手動登出，重設回首頁)
  const handleManualLock = useCallback(() => {
    lastScreenRef.current = {
      tab: 'vault',
      category: '全部',
      search: '',
      isManualLogout: true,
    };
    setSessionKey(null);
    setIsLocked(true);
    setIsEditorOpen(false);
    setIsSyncModalOpen(false);
    setIsSettingsOpen(false);
    setIsGeneratorOpen(false);
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

  const handleDeleteItem = async (id: string) => {
    const target = vaultPayload.items.find(i => i.id === id);
    if (!target) return;
    if (confirm(`確定要刪除「${target.title}」嗎？此動作不可復原。`)) {
      const updatedItems = vaultPayload.items.filter(i => i.id !== id);
      await updateAndSavePayload({
        ...vaultPayload,
        items: updatedItems,
      });
      showToast(`已刪除「${target.title}」`);
    }
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
                  onClick={() => setSelectedCategory(cat)}
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

            {/* Items Count and quick summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                共 <strong>{filteredItems.length}</strong> 筆帳密項目
                {selectedCategory !== '全部' && ` · ${selectedCategory}`}
              </span>
              <button
                onClick={() => setIsGeneratorOpen(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>強密碼產生器</span>
              </button>
            </div>

            {/* Vault Cards Grid */}
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredItems.map(item => (
                  <VaultCard
                    key={item.id}
                    item={item}
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
            onClick={() => setCurrentTab('vault')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentTab === 'vault' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] mt-1">保險庫</span>
          </button>

          <button
            onClick={() => setCurrentTab('templates')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentTab === 'templates' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-1">範本格式</span>
          </button>

          <button
            onClick={() => setCurrentTab('snippets')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentTab === 'snippets' ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1">常用資料</span>
          </button>

          <button
            onClick={() => setCurrentTab('generator')}
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
      />

      {/* Dedicated Floating Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

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
