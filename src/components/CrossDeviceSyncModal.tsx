import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  QrCode,
  Camera,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  FileCheck,
  Smartphone,
  Laptop,
  GitCompare,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowLeft,
  CheckSquare,
  Square,
  BadgeCheck,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { VaultPayload, SyncPacket, EncryptedContainer, VaultItem, SyncConflictItem } from '../types/vault';
import {
  generateHandshakePin,
  generateSalt,
  deriveKeyFromPassword,
  encryptAESGCM,
  decryptAESGCM,
  sha256,
  bufferToHex,
  hexToBuffer,
} from '../services/cryptoService';
import { getEncryptedContainer } from '../services/storageService';

interface CrossDeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultPayload: VaultPayload;
  onApplyResolvedSync: (resolvedItems: VaultItem[], newTemplates: any[], newSnippets: any[]) => void;
}

export const CrossDeviceSyncModal: React.FC<CrossDeviceSyncModalProps> = ({
  isOpen,
  onClose,
  vaultPayload,
  onApplyResolvedSync,
}) => {
  const [activeTab, setActiveTab] = useState<'send_qr' | 'scan_qr' | 'file_sync'>('send_qr');

  // Send QR state: 'select' (選取單元畫面) vs 'qr_ready' (二維碼展示畫面)
  const [sendStep, setSendStep] = useState<'select' | 'qr_ready'>('select');
  const [authPin, setAuthPin] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [syncSearchQuery, setSyncSearchQuery] = useState('');

  // Multi-select state for sending sync (預設全選，支援取消全選、搜尋、自選多選)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => {
    return new Set((vaultPayload.items || []).map(i => i.id));
  });

  // When modal opens or tab changes, initialize selection and stay in 'select' step
  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set((vaultPayload.items || []).map(i => i.id)));
      setSendStep('select');
      setSyncSearchQuery('');
      setQrDataUrl('');
      setAuthPin('');
      setGenerateError('');
    }
  }, [isOpen]);

  // Scan QR state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPacket, setScannedPacket] = useState<SyncPacket | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanWarning, setScanWarning] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPreview, setDecryptedPreview] = useState<VaultPayload | null>(null);

  // Conflict resolution state
  const [conflictList, setConflictList] = useState<SyncConflictItem[]>([]);

  // File sync state
  const [fileMsg, setFileMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'safevault-qr-reader';

  // 搜尋過濾欲發送的帳密項目
  const filteredSendItems = useMemo(() => {
    const all = vaultPayload.items || [];
    if (!syncSearchQuery.trim()) return all;
    const q = syncSearchQuery.trim().toLowerCase();
    return all.filter(item => {
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchAccount = (item.account || '').toLowerCase().includes(q);
      const matchCategory = (item.category || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchFields = (item.fields || []).some(
        f => (f.label || '').toLowerCase().includes(q) || (f.value || '').toLowerCase().includes(q)
      );
      return matchTitle || matchAccount || matchCategory || matchNotes || matchFields;
    });
  }, [vaultPayload.items, syncSearchQuery]);

  // Toggle single item selection
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all items
  const handleSelectAll = () => {
    setSelectedItemIds(new Set((vaultPayload.items || []).map(i => i.id)));
  };

  // Deselect all items
  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // 僅全選搜尋結果
  const handleSelectFilteredOnly = () => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      filteredSendItems.forEach(item => next.add(item.id));
      return next;
    });
  };

  // 僅取消選取搜尋結果
  const handleDeselectFilteredOnly = () => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      filteredSendItems.forEach(item => next.delete(item.id));
      return next;
    });
  };

  const PIN_PBKDF2_ROUNDS = 10000;

  // 產生動態加密 QR Code (發送端，僅傳輸勾選之多選單元，待 user 確定後調用)
  const generateSyncQR = async () => {
    if (selectedItemIds.size === 0) {
      setGenerateError('請先勾選至少 1 筆欲同步的帳密單元');
      return;
    }
    setGenerateError('');
    setIsGeneratingQR(true);
    try {
      const pin = generateHandshakePin();
      setAuthPin(pin);

      const salt = generateSalt();
      const pinKey = await deriveKeyFromPassword(pin, salt, PIN_PBKDF2_ROUNDS);
      const authHash = await sha256(pin);

      // 依使用者勾選多選項目進行過濾，僅包含選取項目
      const itemsToSync = (vaultPayload.items || []).filter(item => selectedItemIds.has(item.id));

      // 僅提取這批項目有使用到的自訂範本（9大內建範本兩端均原生預載，無須重複封裝入QR碼避免膨脹超出光學極限）
      const usedTplIds = new Set(itemsToSync.map(i => i.templateId).filter(Boolean));
      const customTemplatesToSync = (vaultPayload.templates || []).filter(
        t => !t.isBuiltIn && usedTplIds.has(t.id)
      );

      const syncPayload: VaultPayload = {
        items: itemsToSync,
        templates: customTemplatesToSync,
        snippets: [],
      };

      const jsonStr = JSON.stringify(syncPayload);
      const { ciphertext, iv } = await encryptAESGCM(jsonStr, pinKey);

      const packet: SyncPacket = {
        version: 1,
        type: 'SAFEVAULT_AIRGAP_SYNC',
        timestamp: Date.now(),
        deviceId: 'device_' + Math.random().toString(36).substring(2, 7),
        salt: bufferToHex(salt),
        iv: iv,
        ciphertext: ciphertext,
        authHash: authHash,
        rounds: PIN_PBKDF2_ROUNDS,
      };

      const packetStr = JSON.stringify(packet);

      // 檢核字串長度（若大於 2,800 字元即可能超出 QR 鏡頭掃描光學極限）
      if (packetStr.length > 2800) {
        throw new Error('amount of data too big to fit in a qr code');
      }

      const dataUrl = await QRCode.toDataURL(packetStr, {
        errorCorrectionLevel: 'L', // 使用 L 級別以容納最大資料量並提升螢幕對準掃描速率
        margin: 2,
        width: 320,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      });

      setQrDataUrl(dataUrl);
      setSendStep('qr_ready');
    } catch (err: any) {
      console.error('QR Generate error', err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('amount of data') || errMsg.includes('too big') || errMsg.includes('capacity')) {
        setGenerateError('⚠️ 勾選之單元資料量較大，超出單一 QR Code 光學鏡頭解析極限。建議勾選 1~3 筆分批生成，或切換至上方「有線/檔案」分頁匯出完整 .vault 備份！');
      } else {
        setGenerateError(`二維碼生成失敗: ${errMsg || '未知錯誤，請重試'}`);
      }
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // 相機 QR Code 掃描器 (接收端)
  const startScanner = async () => {
    setScanError('');
    setIsScanning(true);
    setScannedPacket(null);
    setDecryptedPreview(null);
    setConflictList([]);
    setInputPin('');

    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Camera start error', err);
      setScanError('無法啟用相機，請確認已授予相機使用權限或切換至檔案傳輸模式。');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {}
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (rawText: string) => {
    setScanError('');
    setScanWarning('');
    try {
      let packet: SyncPacket;
      try {
        packet = JSON.parse(rawText);
      } catch {
        setScanError('二維碼內容格式不符，非 JSON 格式資料');
        return;
      }

      // 1. 協定名稱檢查 (Protocol Matching)
      if (!packet || packet.type !== 'SAFEVAULT_AIRGAP_SYNC') {
        setScanError('❌ 協定不匹配：此二維碼非 SafeVault 專用近場同步碼！請確認掃描的是 SafeVault 發送端所顯示的二維碼。');
        return;
      }

      // 2. 密碼學欄位完整性檢查 (Cryptographic Integrity)
      if (!packet.ciphertext || !packet.iv || !packet.salt || !packet.authHash) {
        setScanError('❌ 封包不匹配：同步封包缺少必要密碼學欄位 (IV/Salt/密文)，資料可能不完整或遭截斷。');
        return;
      }

      // 3. 版本相容性檢查 (Version Compatibility)
      if (packet.version && packet.version > 1) {
        setScanError(`❌ 版本不相容：發送端版本為 v${packet.version}，本裝置尚未支援此格式，請更新本機 SafeVault 應用。`);
        return;
      }

      // 4. 時效性檢查 (Freshness check)
      if (packet.timestamp && Date.now() - packet.timestamp > 15 * 60 * 1000) {
        setScanWarning('⚠️ 提醒：此同步碼生成時間已超過 15 分鐘，若授權失敗請請發送端重新生成。');
      }

      stopScanner();
      setScannedPacket(packet);
    } catch (err) {
      setScanError('二維碼讀取失敗，請重新對準清晰掃描');
    }
  };

  // 分析傳輸端資料與本機資料差異 (Diff Analysis)
  const analyzeConflicts = (incomingPayload: VaultPayload) => {
    const localItems = vaultPayload.items || [];
    const incomingItems = incomingPayload.items || [];

    const localMap = new Map<string, VaultItem>();
    const localTitleMap = new Map<string, VaultItem>();
    localItems.forEach(item => {
      localMap.set(item.id, item);
      localTitleMap.set(item.title.trim().toLowerCase(), item);
    });

    const conflicts: SyncConflictItem[] = [];

    incomingItems.forEach(incoming => {
      // 比對 ID 或比對名稱
      const matchedLocal = localMap.get(incoming.id) || localTitleMap.get(incoming.title.trim().toLowerCase());

      if (!matchedLocal) {
        conflicts.push({
          id: incoming.id,
          title: incoming.title,
          status: 'new',
          incomingItem: incoming,
          resolution: 'overwrite_with_incoming', // 新項目自動新增
        });
      } else {
        // 比對內容是否完全一致
        const diffs: string[] = [];
        if (incoming.account !== matchedLocal.account) {
          diffs.push(`帳號不同: [本地: ${matchedLocal.account || '空'}] ➔ [傳輸端: ${incoming.account || '空'}]`);
        }
        if (incoming.password !== matchedLocal.password) {
          diffs.push(`密碼內容不同`);
        }
        if (JSON.stringify(incoming.fields) !== JSON.stringify(matchedLocal.fields)) {
          diffs.push(`自訂欄位有異動 (本地 ${matchedLocal.fields?.length || 0} 欄，傳輸端 ${incoming.fields?.length || 0} 欄)`);
        }
        if ((incoming.notes || '') !== (matchedLocal.notes || '')) {
          diffs.push(`備註內容不同`);
        }

        if (diffs.length === 0) {
          conflicts.push({
            id: incoming.id,
            title: incoming.title,
            status: 'identical',
            incomingItem: incoming,
            localItem: matchedLocal,
            resolution: 'keep_local',
          });
        } else {
          conflicts.push({
            id: incoming.id,
            title: incoming.title,
            status: 'modified',
            incomingItem: incoming,
            localItem: matchedLocal,
            diffSummary: diffs,
            resolution: 'keep_both', // 預設「保留兩者 (另存副本)」，確保零遺失！
          });
        }
      }
    });

    setConflictList(conflicts);
  };

  // 驗證 6 位數認證碼並解密
  const handleVerifyPinAndDecrypt = async () => {
    if (!scannedPacket || !inputPin.trim()) return;

    setIsDecrypting(true);
    setScanError('');

    try {
      const pinHash = await sha256(inputPin.trim());
      if (pinHash !== scannedPacket.authHash) {
        setScanError('❌ 認證碼錯誤！輸入之授權碼與發送端不匹配，無法解密');
        setIsDecrypting(false);
        return;
      }

      const salt = hexToBuffer(scannedPacket.salt);
      const rounds = scannedPacket.rounds || 20000;
      const pinKey = await deriveKeyFromPassword(inputPin.trim(), salt, rounds);
      const plaintext = await decryptAESGCM(scannedPacket.ciphertext, scannedPacket.iv, pinKey);
      
      let imported: VaultPayload;
      try {
        imported = JSON.parse(plaintext);
      } catch {
        setScanError('❌ 解密成功但資料損毀，無法解析為 SafeVault 格式');
        setIsDecrypting(false);
        return;
      }

      // 檢查資料結構是否匹配 SafeVault
      if (!imported || typeof imported !== 'object' || !Array.isArray(imported.items)) {
        setScanError('❌ 資料結構不匹配：未包含有效的帳密清單');
        setIsDecrypting(false);
        return;
      }

      setDecryptedPreview(imported);
      analyzeConflicts(imported);
    } catch (err) {
      console.error('Decrypt sync packet error', err);
      setScanError('❌ 解密失敗，金鑰可能不正確或傳輸內容已受損');
    } finally {
      setIsDecrypting(false);
    }
  };

  // 修改單項衝突的去留決定
  const handleSetResolution = (
    id: string,
    resolution: 'keep_local' | 'overwrite_with_incoming' | 'keep_both'
  ) => {
    setConflictList(prev =>
      prev.map(c => (c.id === id ? { ...c, resolution } : c))
    );
  };

  // 全域快速設定衝突去留
  const handleSetAllModifiedResolutions = (
    resolution: 'keep_local' | 'overwrite_with_incoming' | 'keep_both'
  ) => {
    setConflictList(prev =>
      prev.map(c => (c.status === 'modified' ? { ...c, resolution } : c))
    );
  };

  // 執行最終同步套用
  const handleExecuteFinalSync = () => {
    if (!decryptedPreview) return;

    // 建立新資料清單
    const finalItems: VaultItem[] = [];
    const localItems = [...(vaultPayload.items || [])];
    const handledLocalIds = new Set<string>();

    conflictList.forEach(c => {
      if (c.status === 'new') {
        finalItems.push(c.incomingItem);
      } else if (c.status === 'identical') {
        if (c.localItem) {
          finalItems.push(c.localItem);
          handledLocalIds.add(c.localItem.id);
        }
      } else if (c.status === 'modified') {
        if (c.resolution === 'keep_both') {
          // 保留本機原有項目
          if (c.localItem) {
            finalItems.push(c.localItem);
            handledLocalIds.add(c.localItem.id);
          }
          // 將傳輸端項目另存為新副本，避免覆蓋
          const duplicateItem: VaultItem = {
            ...c.incomingItem,
            id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            title: `${c.incomingItem.title} (同步副本)`,
            updatedAt: Date.now(),
          };
          finalItems.push(duplicateItem);
        } else if (c.resolution === 'overwrite_with_incoming') {
          // 以傳輸端覆蓋本機
          finalItems.push(c.incomingItem);
          if (c.localItem) {
            handledLocalIds.add(c.localItem.id);
          }
        } else if (c.resolution === 'keep_local') {
          // 保留本機原有，忽略傳輸端
          if (c.localItem) {
            finalItems.push(c.localItem);
            handledLocalIds.add(c.localItem.id);
          }
        }
      }
    });

    // 加上本地存在但傳輸端沒有的項目 (避免刪除本地獨有項目)
    localItems.forEach(local => {
      if (!handledLocalIds.has(local.id)) {
        finalItems.push(local);
      }
    });

    // 合併範本與字串
    const existingTplNames = new Set((vaultPayload.templates || []).map(t => t.name));
    const newTemplates = (decryptedPreview.templates || []).filter(t => !existingTplNames.has(t.name));

    const existingSnipTitles = new Set((vaultPayload.snippets || []).map(s => s.title));
    const newSnippets = (decryptedPreview.snippets || []).filter(s => !existingSnipTitles.has(s.title));

    onApplyResolvedSync(finalItems, newTemplates, newSnippets);
    onClose();
  };

  // 檔案匯出 (有線/隨身碟備用)
  const handleExportBackupFile = () => {
    const container = getEncryptedContainer();
    if (!container) return;

    const blob = new Blob([JSON.stringify(container, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.href = url;
    a.download = `SafeVault_Backup_${dateStr}.vault`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFileMsg('已成功匯出加密備份檔 (.vault)，可透過隨身碟或有線連接轉移！');
  };

  // 檔案匯入並進入比對流程
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const container: EncryptedContainer = JSON.parse(content);
        if (!container.ciphertext || !container.salt || !container.iv) {
          setFileMsg('無效的 SafeVault 備份檔案格式');
          return;
        }

        localStorage.setItem('safevault_encrypted_container_v1', JSON.stringify(container));
        setFileMsg('成功匯入加密備份！請關閉視窗並重新輸入主密碼登入。');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        setFileMsg('讀取檔案失敗，請確認檔案未損毀');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (activeTab !== 'scan_qr') {
      stopScanner();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const modifiedConflicts = useMemo(
    () => conflictList.filter(c => c.status === 'modified'),
    [conflictList]
  );
  const newItemsCount = useMemo(
    () => conflictList.filter(c => c.status === 'new').length,
    [conflictList]
  );
  const identicalCount = useMemo(
    () => conflictList.filter(c => c.status === 'identical').length,
    [conflictList]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">跨裝置離線近場同步</h2>
              <p className="text-xs text-slate-500">零聯網 · 光學加密傳輸 · 差異自主決策</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 mx-5 mt-4 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('send_qr')}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'send_qr' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>產生同步碼</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('scan_qr');
              setTimeout(startScanner, 100);
            }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'scan_qr' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>掃描接收端</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file_sync')}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'file_sync' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>有線/檔案</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: SEND QR */}
          {activeTab === 'send_qr' && (
            <div className="space-y-4">
              {/* STEP 1: ITEM SELECTION SCREEN (先停在展開單元畫面，待 user 選好後再按生成) */}
              {sendStep === 'select' ? (
                <div className="space-y-3.5">
                  <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-sky-600" />
                        <span>選取欲同步之帳密單元</span>
                      </span>
                      <span className="text-[11px] font-semibold text-sky-800">
                        已勾選 {selectedItemIds.size} / {(vaultPayload.items || []).length} 筆
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-700 leading-relaxed">
                      請先勾選欲傳輸至另一裝置的帳密單元。可利用下方搜尋框快速篩選特定項目，確認後點擊「生成動態同步碼」。
                    </p>
                  </div>

                  {/* Search Bar for Quick Filtering */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={syncSearchQuery}
                      onChange={e => setSyncSearchQuery(e.target.value)}
                      placeholder="快速搜尋欲同步的帳號、名稱或標籤..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                    />
                    {syncSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSyncSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Batch Selection Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100/80 rounded-xl text-xs">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <span>已選 <strong>{selectedItemIds.size}</strong> 筆</span>
                      {syncSearchQuery && (
                        <span>（搜尋符合 {filteredSendItems.length} 筆）</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-2 py-1 bg-white hover:bg-slate-50 text-sky-600 hover:text-sky-800 rounded-lg border border-slate-200 font-semibold transition"
                      >
                        全部全選
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 font-medium transition"
                      >
                        全部取消
                      </button>
                      {syncSearchQuery.trim() && (
                        <>
                          <button
                            type="button"
                            onClick={handleSelectFilteredOnly}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold transition text-[11px]"
                          >
                            選取搜尋結果
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectFilteredOnly}
                            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition text-[11px]"
                          >
                            取消搜尋結果
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Item Selection List (預設直接展開展示) */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {filteredSendItems.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                        {syncSearchQuery
                          ? `未搜尋到符合「${syncSearchQuery}」的帳密單元`
                          : '保險庫內尚無帳密項目'}
                      </div>
                    ) : (
                      filteredSendItems.map(item => {
                        const isChecked = selectedItemIds.has(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer border transition ${
                              isChecked
                                ? 'bg-sky-50/80 border-sky-200 text-slate-900 shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectItem(item.id)}
                                className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 truncate block">
                                  {item.title}
                                </span>
                                {item.account && (
                                  <span className="text-[11px] font-mono text-slate-500 truncate block">
                                    帳號: {item.account}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.fields && item.fields.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                  {item.fields.length} 欄位
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                                {item.category || '通用'}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Primary Trigger Button: 確定選好後再生成同步碼 */}
                  <div className="pt-2 space-y-2">
                    {generateError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 space-y-2 animate-fade-in">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <p className="font-medium leading-relaxed">{generateError}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-100">
                          <button
                            type="button"
                            onClick={() => {
                              setGenerateError('');
                              setActiveTab('file_sync');
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] transition shadow-xs flex items-center gap-1.5"
                          >
                            <Laptop className="w-3.5 h-3.5" />
                            <span>前往「有線/檔案」分頁備份傳輸</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={selectedItemIds.size === 0 || isGeneratingQR}
                      onClick={generateSyncQR}
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-2xl transition shadow-md flex items-center justify-center gap-2 active:scale-98"
                    >
                      {isGeneratingQR ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                          <span>正在加密封包並生成動態同步碼...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 text-sky-400" />
                          <span>
                            {selectedItemIds.size === 0
                              ? '請至少勾選 1 筆欲同步的帳密'
                              : `確認勾選完成，生成動態同步碼 (${selectedItemIds.size} 筆)`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: QR CODE READY SCREEN (生成後的二維碼傳輸畫面) */
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Back to selection header */}
                  <div className="w-full flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setSendStep('select')}
                      className="text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>返回重新調整選取單元</span>
                    </button>
                    <span className="text-[11px] font-semibold text-slate-600">
                      已加密傳輸 {selectedItemIds.size} 筆帳密
                    </span>
                  </div>

                  {/* QR Code Container */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="SafeVault Sync QR"
                        className="w-64 h-64 rounded-xl shadow-inner bg-white p-2"
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      </div>
                    )}

                    {/* Authentication PIN Box */}
                    <div className="mt-3 p-2.5 bg-white border border-slate-200 rounded-xl w-full flex flex-col items-center">
                      <span className="text-[11px] text-slate-500 font-medium">
                        本次傳輸 6 位數認證授權碼:
                      </span>
                      <span className="text-2xl font-mono font-bold tracking-widest text-sky-600 mt-0.5">
                        {authPin || '------'}
                      </span>
                    </div>
                  </div>

                  <div className="text-left space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 w-full">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>離線無網同步步驟：</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 text-[11px]">
                      <li>在接收端（桌機、平板或另一手機）開啟 SafeVault。</li>
                      <li>於接收端切換至「掃描接收端」開啟鏡頭對準此二維碼。</li>
                      <li>輸入 <strong>{authPin}</strong> 取得認證同意。</li>
                      <li>若發現兩端資料不同，系統將清楚標註差異，由您決定去留或保留兩者！</li>
                    </ol>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <button
                      type="button"
                      onClick={generateSyncQR}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>重新整理授權碼</span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSendStep('select')}
                      className="text-sky-600 hover:text-sky-800 font-medium"
                    >
                      修改勾選項
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCAN QR (接收端) */}
          {activeTab === 'scan_qr' && (
            <div className="space-y-4">
              {!scannedPacket ? (
                <div className="flex flex-col items-center">
                  <div
                    id={scannerContainerId}
                    className="w-full max-w-xs h-64 bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center text-white"
                  />
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    請使用相機對準傳輸端螢幕上的動態加密 QR Code
                  </p>
                  {!isScanning && (
                    <button
                      type="button"
                      onClick={startScanner}
                      className="mt-3 px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-xl hover:bg-slate-800 transition"
                    >
                      重新啟動相機掃描
                    </button>
                  )}
                </div>
              ) : !decryptedPreview ? (
                /* Got scanned packet, verified protocol matching, ask for 6-digit PIN */
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-center">
                  {/* Protocol Matching Verification Card */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>掃描同步端協定匹配成功！</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-200/80 text-emerald-800 rounded-full font-bold">
                        SafeVault v{scannedPacket.version || 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-950 font-mono bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <div>
                        <span className="text-slate-400">來源裝置:</span> {scannedPacket.deviceId || 'AirGap-Device'}
                      </div>
                      <div>
                        <span className="text-slate-400">加密標準:</span> AES-256-GCM
                      </div>
                      <div>
                        <span className="text-slate-400">衍生校驗:</span> PBKDF2/SHA-256
                      </div>
                      <div>
                        <span className="text-slate-400">封包時效:</span> {new Date(scannedPacket.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    {scanWarning && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        {scanWarning}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      請輸入發送端 6 位數認證授權碼
                    </h3>
                    <p className="text-xs text-slate-500">
                      其他裝置必須取得認證同意才能解密。請輸入發送端螢幕顯示的 6 位數授權碼：
                    </p>
                  </div>

                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={inputPin}
                      onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 位數認證碼..."
                      className="w-full py-2.5 text-center text-xl font-mono tracking-widest bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={inputPin.length < 6 || isDecrypting}
                      onClick={handleVerifyPinAndDecrypt}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                    >
                      {isDecrypting ? '驗證授權解密中...' : '確認認證並解密傳輸'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScannedPacket(null);
                        startScanner();
                      }}
                      className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-xl transition"
                    >
                      重掃
                    </button>
                  </div>
                </div>
              ) : (
                /* Granular Conflict Resolution Screen (資料不同，需保留，讓 user 決定去留！) */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-sky-950">
                      <span className="flex items-center gap-1.5">
                        <GitCompare className="w-4 h-4 text-sky-600" />
                        <span>同步差異比對結果</span>
                      </span>
                      <span>共掃描 {decryptedPreview.items?.length || 0} 筆</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-sky-800 pt-1">
                      <span>• 新增: <strong>{newItemsCount}</strong> 筆</span>
                      <span>• 完全一致: <strong>{identicalCount}</strong> 筆</span>
                      <span>• 內容有差異: <strong className="text-amber-700">{modifiedConflicts.length}</strong> 筆</span>
                    </div>
                  </div>

                  {/* Conflicting items section */}
                  {modifiedConflicts.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          <span>偵測到資料不同之項目（請決定去留）：</span>
                        </span>
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleSetAllModifiedResolutions('keep_both')}
                            className="text-sky-600 hover:underline font-medium"
                          >
                            全部另存副本
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleSetAllModifiedResolutions('overwrite_with_incoming')}
                            className="text-slate-600 hover:underline"
                          >
                            全部用傳輸端
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {modifiedConflicts.map(item => (
                          <div
                            key={item.id}
                            className="p-3.5 bg-white border border-amber-200/90 rounded-2xl space-y-2 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                                內容有差異
                              </span>
                            </div>

                            {/* Diff details */}
                            {item.diffSummary && (
                              <div className="p-2 bg-amber-50/50 rounded-xl text-[11px] text-slate-700 space-y-1 border border-amber-100 font-mono">
                                {item.diffSummary.map((diff, dIdx) => (
                                  <div key={dIdx}>• {diff}</div>
                                ))}
                              </div>
                            )}

                            {/* Resolution Choices */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleSetResolution(item.id, 'keep_both')}
                                className={`py-1.5 px-2 rounded-xl font-medium border text-center transition ${
                                  item.resolution === 'keep_both'
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                保留兩者(另存副本)
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetResolution(item.id, 'overwrite_with_incoming')}
                                className={`py-1.5 px-2 rounded-xl font-medium border text-center transition ${
                                  item.resolution === 'overwrite_with_incoming'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                以傳輸端覆蓋
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetResolution(item.id, 'keep_local')}
                                className={`py-1.5 px-2 rounded-xl font-medium border text-center transition ${
                                  item.resolution === 'keep_local'
                                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                保留本機原有
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>現有項目完全一致，即將自動加入 {newItemsCount} 筆新帳密！</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleExecuteFinalSync}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition shadow-md active:scale-95"
                  >
                    確認執行同步並儲存至本機
                  </button>
                </div>
              )}

              {scanError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FILE SYNC */}
          {activeTab === 'file_sync' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <Download className="w-4 h-4 text-sky-600" />
                  <span>匯出加密備份檔 (.vault)</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  將本機所有已透過 AES-256 加密的密文打包成單一備份檔案。即使備份檔案遺失，在沒有主密碼的情況下任何人都無法讀取。可使用 USB 隨身碟或有線連接存放到其他裝置。
                </p>
                <button
                  type="button"
                  onClick={handleExportBackupFile}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
                >
                  下載 SafeVault 加密備份檔
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>匯入加密備份檔 (.vault)</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  從隨身碟或本機檔案選取之前匯出的 <code>.vault</code> 檔案進行還原。
                </p>
                <input
                  type="file"
                  accept=".vault,.json"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  選取 .vault 備份檔匯入
                </button>
              </div>

              {fileMsg && (
                <div className="p-3 bg-sky-50 text-sky-800 text-xs rounded-xl border border-sky-200 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 shrink-0 text-sky-600" />
                  <span>{fileMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            完全不透過任何外部網路 · 近場直接傳輸
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl transition"
          >
            完成並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
