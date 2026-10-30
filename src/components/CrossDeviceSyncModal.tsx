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

  // Send QR state
  const [authPin, setAuthPin] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Multi-select state for sending sync (預設全選，支援取消全選、自選多選)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => {
    return new Set((vaultPayload.items || []).map(i => i.id));
  });
  const [showItemSelector, setShowItemSelector] = useState(false);

  // Sync selected items whenever vaultPayload changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set((vaultPayload.items || []).map(i => i.id)));
    }
  }, [isOpen, vaultPayload.items]);

  // Scan QR state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPacket, setScannedPacket] = useState<SyncPacket | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [scanError, setScanError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPreview, setDecryptedPreview] = useState<VaultPayload | null>(null);

  // Conflict resolution state
  const [conflictList, setConflictList] = useState<SyncConflictItem[]>([]);

  // File sync state
  const [fileMsg, setFileMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'safevault-qr-reader';

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

  // 產生動態加密 QR Code (發送端，僅傳輸勾選之多選單元)
  const generateSyncQR = async () => {
    setIsGeneratingQR(true);
    try {
      const pin = generateHandshakePin();
      setAuthPin(pin);

      const salt = generateSalt();
      const pinKey = await deriveKeyFromPassword(pin, salt, 20000);
      const authHash = await sha256(pin);

      // 依使用者勾選多選項目進行過濾
      const itemsToSync = (vaultPayload.items || []).filter(item => selectedItemIds.has(item.id));
      const syncPayload: VaultPayload = {
        ...vaultPayload,
        items: itemsToSync,
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
      };

      const packetStr = JSON.stringify(packet);
      const dataUrl = await QRCode.toDataURL(packetStr, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      });

      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR Generate error', err);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Re-generate QR when selection or tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'send_qr') {
      generateSyncQR();
    }
  }, [isOpen, activeTab, selectedItemIds]);

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
    try {
      const packet: SyncPacket = JSON.parse(rawText);
      if (packet.type !== 'SAFEVAULT_AIRGAP_SYNC') {
        setScanError('非 SafeVault 專用近場同步二維碼');
        return;
      }

      stopScanner();
      setScannedPacket(packet);
    } catch (err) {
      setScanError('二維碼解析失敗，請重新對準掃描');
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
        setScanError('認證碼錯誤！未取得對端授權，無法解密');
        setIsDecrypting(false);
        return;
      }

      const salt = hexToBuffer(scannedPacket.salt);
      const pinKey = await deriveKeyFromPassword(inputPin.trim(), salt, 20000);
      const plaintext = await decryptAESGCM(scannedPacket.ciphertext, scannedPacket.iv, pinKey);
      const imported: VaultPayload = JSON.parse(plaintext);

      setDecryptedPreview(imported);
      analyzeConflicts(imported);
    } catch (err) {
      console.error('Decrypt sync packet error', err);
      setScanError('解密失敗，請確認認證碼是否正確');
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
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Multi-select Item Selection Bar */}
              <div className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>同步帳密項目選擇：已選取 {selectedItemIds.size} / {(vaultPayload.items || []).length} 筆</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sky-600 hover:text-sky-800 font-semibold hover:underline"
                    >
                      全選
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-slate-500 hover:text-slate-800 font-semibold hover:underline"
                    >
                      取消全選
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] text-slate-500">
                    {selectedItemIds.size === 0
                      ? '⚠️ 尚未選取任何帳密，請至少勾選一筆進行同步'
                      : `二維碼僅包含勾選的 ${selectedItemIds.size} 筆項目`}
                  </span>
                  {(vaultPayload.items || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowItemSelector(!showItemSelector)}
                      className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-0.5 font-medium"
                    >
                      <span>{showItemSelector ? '收合勾選清單' : '展開自訂勾選'}</span>
                      {showItemSelector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {showItemSelector && (vaultPayload.items || []).length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pt-2 border-t border-slate-200 pr-1">
                    {(vaultPayload.items || []).map(item => {
                      const isChecked = selectedItemIds.has(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition ${
                            isChecked
                              ? 'bg-sky-50/80 border-sky-200 text-slate-900 font-medium'
                              : 'bg-white border-slate-150 text-slate-500 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectItem(item.id)}
                              className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 shrink-0 cursor-pointer"
                            />
                            <span className="font-semibold text-slate-800 truncate">{item.title}</span>
                            {item.account && (
                              <span className="text-[11px] font-mono text-slate-500 truncate">
                                ({item.account})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 ml-2">
                            {item.category || '通用'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* QR Code display */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center">
                {selectedItemIds.size === 0 ? (
                  <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-400 p-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-xs text-slate-600 font-medium">請在上方勾選至少一筆帳密</span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="mt-3 px-3 py-1 bg-sky-600 text-white rounded-lg text-xs"
                    >
                      點擊全選
                    </button>
                  </div>
                ) : qrDataUrl ? (
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
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>在接收端（桌機、平板或另一手機）開啟 SafeVault。</li>
                  <li>於接收端切換至「掃描接收端」開啟鏡頭對準此二維碼。</li>
                  <li>輸入 <strong>{authPin}</strong> 取得認證同意。</li>
                  <li>若發現兩端資料不同，系統將<strong>清楚標註差異，由您決定去留或保留兩者</strong>！</li>
                </ol>
              </div>

              <button
                type="button"
                onClick={generateSyncQR}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新生成傳輸碼</span>
              </button>
            </div>
          )}

          {/* TAB 2: SCAN QR */}
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
                /* Got scanned packet, ask for 6-digit PIN */
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 mx-auto flex items-center justify-center">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      已讀取加密封包！請輸入認證授權碼
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      其他裝置必須取得認證同意才能傳輸解密。請輸入發送端顯示的 6 位數授權碼：
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

                  <button
                    type="button"
                    disabled={inputPin.length < 6 || isDecrypting}
                    onClick={handleVerifyPinAndDecrypt}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                  >
                    {isDecrypting ? '驗證解密中...' : '確認認證並解密傳輸'}
                  </button>
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
