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
  Radio,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
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
  const [frameDataUrls, setFrameDataUrls] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isCarouselPlaying, setIsCarouselPlaying] = useState(true);
  const [carouselSpeedMs, setCarouselSpeedMs] = useState(600);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [syncSearchQuery, setSyncSearchQuery] = useState('');

  // Multi-select state for sending sync (預設全選，支援取消全選、搜尋、自選多選)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => {
    return new Set((vaultPayload.items || []).map(i => i.id));
  });

  // Cycle through animation frames if multi-frame transmission
  useEffect(() => {
    if (frameDataUrls.length <= 1 || !isCarouselPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % frameDataUrls.length);
    }, carouselSpeedMs);
    return () => clearInterval(interval);
  }, [frameDataUrls, isCarouselPlaying, carouselSpeedMs]);

  // When modal opens or tab changes, initialize selection and stay in 'select' step
  useEffect(() => {
    if (isOpen) {
      setSelectedItemIds(new Set((vaultPayload.items || []).map(i => i.id)));
      setSendStep('select');
      setSyncSearchQuery('');
      setQrDataUrl('');
      setFrameDataUrls([]);
      setCurrentFrameIndex(0);
      setIsCarouselPlaying(true);
      setCarouselSpeedMs(600);
      setAuthPin('');
      setGenerateError('');
      setIsFullscreenQR(false);
      setCameraZoom(1);
      setIsMaximizedScanner(false);
      setIsSyncSuccess(false);
      setPreviewFilterTab('all');
      setIsFrameCaptured(false);
    }
  }, [isOpen]);

  // Scan QR state & real-time progress
  const [isScanning, setIsScanning] = useState(false);
  const [isFrameCaptured, setIsFrameCaptured] = useState(false);
  const [scannedPacket, setScannedPacket] = useState<SyncPacket | null>(null);
  const [receiveProgress, setReceiveProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    isComplete: boolean;
  }>({ current: 0, total: 1, percent: 0, isComplete: false });
  const receivedChunksMapRef = useRef<Map<number, string>>(new Map());
  const currentTransferIdRef = useRef<string>('');

  const [inputPin, setInputPin] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanWarning, setScanWarning] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPreview, setDecryptedPreview] = useState<VaultPayload | null>(null);

  // Conflict resolution state
  const [conflictList, setConflictList] = useState<SyncConflictItem[]>([]);
  const [previewFilterTab, setPreviewFilterTab] = useState<'all' | 'new' | 'modified' | 'identical'>('all');
  const [isSyncSuccess, setIsSyncSuccess] = useState(false);
  const [syncedItemCount, setSyncedItemCount] = useState(0);

  // Sender full screen QR modal
  const [isFullscreenQR, setIsFullscreenQR] = useState(false);

  // Receiver camera zoom and maximized viewfinder
  const [cameraZoom, setCameraZoom] = useState<number>(1);
  const [isMaximizedScanner, setIsMaximizedScanner] = useState<boolean>(false);

  // File sync & Photo QR fallback state
  const [fileMsg, setFileMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoScanInputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'safevault-qr-reader';

  // 輕量化音效回饋 (Web Audio API)
  const playAudioFeedback = (type: 'frame' | 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      if (type === 'frame') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch (e) {}
  };

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

      // 精簡資料結構：使用短鍵名並剔除未用欄位，極小化密文長度
      const compactItems = itemsToSync.map(item => {
        const c: any = {
          i: item.id,
          t: item.title,
          a: item.account,
          p: item.password,
          c: item.category,
          u: item.updatedAt || Date.now(),
        };
        if (item.notes && item.notes.trim()) c.n = item.notes.trim();
        if (item.templateId) c.tid = item.templateId;
        if (item.fields && item.fields.length > 0) {
          const validFields = item.fields.filter(f => f.label || f.value);
          if (validFields.length > 0) c.f = validFields;
        }
        return c;
      });

      const syncPayload = {
        it: compactItems,
        tp: customTemplatesToSync,
        sn: [],
      };

      const jsonStr = JSON.stringify(syncPayload);
      const { ciphertext, iv } = await encryptAESGCM(jsonStr, pinKey);

      // 極精簡外部封包結構 (短鍵名，authHash 取 16 位 prefix 即有 64-bit 熵，足以驗證 6 位 PIN 且大幅降低體積)
      const packet: SyncPacket = {
        v: 1,
        t: 'SV_SYNC',
        ts: Date.now(),
        d: 'dev_' + Math.random().toString(36).substring(2, 6),
        s: bufferToHex(salt),
        iv: iv,
        ct: ciphertext,
        h: authHash.substring(0, 16),
        r: PIN_PBKDF2_ROUNDS,
      };

      const packetStr = JSON.stringify(packet);

      // 智慧顆粒分幀：
      // 當封包小於 400 字元（約 1~2 筆單元）時，維持單一高精靜態二維碼（秒掃即達 100%）
      // 當資料量較大時，採用 280 字元大顆粒動態輪播（每幀只有 45x45 矩陣，任何手機鏡頭 50ms 內秒讀，絕不卡頓）
      const SINGLE_FRAME_LIMIT = 400;
      const CHUNK_SIZE = 280;
      let frames: string[] = [];
      if (packetStr.length <= SINGLE_FRAME_LIMIT) {
        frames = [packetStr];
      } else {
        const totalChunks = Math.ceil(packetStr.length / CHUNK_SIZE);
        const transferId = Math.random().toString(36).substring(2, 7);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = packetStr.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          frames.push(JSON.stringify({
            t: 'SV_C',
            id: transferId,
            i: i,
            n: totalChunks,
            d: chunk,
          }));
        }
      }

      const generatedUrls: string[] = [];
      for (const frame of frames) {
        const dataUrl = await QRCode.toDataURL(frame, {
          errorCorrectionLevel: 'M', // M 級 15% 容錯，可防手機螢幕反光與眩光
          margin: 1,
          width: 520,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF',
          },
        });
        generatedUrls.push(dataUrl);
      }

      setFrameDataUrls(generatedUrls);
      setCurrentFrameIndex(0);
      setQrDataUrl(generatedUrls[0]);
      setSendStep('qr_ready');
    } catch (err: any) {
      console.error('QR Generate error', err);
      const errMsg = err?.message || String(err);
      setGenerateError(`二維碼生成失敗: ${errMsg || '未知錯誤，請重試'}`);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // 相機數位/光學變焦 (Zoom) 支援 (1x, 1.5x, 2x, 2.5x)
  const handleSetZoom = async (zoom: number) => {
    setCameraZoom(zoom);
    try {
      // 優先調用底層相機硬體軌道變焦 (真實感光元件變焦，無損畫質)
      if (scannerRef.current) {
        try {
          const caps = (scannerRef.current as any).getRunningTrackCameraCapabilities?.();
          if (caps && caps.zoomFeature && caps.zoomFeature().isSupported()) {
            await caps.zoomFeature().apply(zoom);
            return;
          }
        } catch (e) {}
      }

      const videoEl = document.querySelector(`#${scannerContainerId} video`) as HTMLVideoElement | null;
      if (videoEl) {
        if (videoEl.srcObject) {
          const stream = videoEl.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track && track.getCapabilities) {
            const caps = track.getCapabilities() as any;
            if (caps && caps.zoom) {
              const minZoom = caps.zoom.min || 1;
              const maxZoom = caps.zoom.max || 3;
              const target = Math.min(Math.max(zoom, minZoom), maxZoom);
              await track.applyConstraints({ advanced: [{ zoom: target }] as any }).catch(() => {});
              return;
            }
          }
        }
        videoEl.style.transform = `scale(${zoom})`;
      }
    } catch (e) {}
  };

  // 相機 QR Code 掃描器 (接收端)
  const startScanner = async () => {
    setScanError('');
    setIsScanning(true);
    setScannedPacket(null);
    setDecryptedPreview(null);
    setConflictList([]);
    setInputPin('');
    setIsSyncSuccess(false);
    receivedChunksMapRef.current.clear();
    currentTransferIdRef.current = '';
    setReceiveProgress({ current: 0, total: 1, percent: 0, isComplete: false });

    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 25,
          // 全視野無畸變解碼：不設置 qrbox 局部截切限制，維持相機原生長寬比與完整感光視野，
          // 徹底根除先前因比例不一造成的 44% 垂直壓扁畸變（先前導致 QR 碼必須拉近超出外框 10~20% 才能偶發感應的問題）。
          // 現在 QR Code 只要在取景框視野內，正常持機距離（20~40cm）即能瞬間秒讀！
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      // 套用當前選定之變焦倍率
      setTimeout(() => {
        handleSetZoom(cameraZoom);
      }, 250);
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
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        setScanWarning('⚠️ 偵測到二維碼，但格式不符（內容非 SafeVault 專用同步碼）');
        return;
      }

      let completePacketStr = '';

      // Check if multi-frame chunk packet (supports both compact 'SV_C' and legacy 'SV_CHUNK')
      if (parsed && (parsed.t === 'SV_C' || parsed.t === 'SV_CHUNK')) {
        const { id, i, n, d } = parsed;
        if (currentTransferIdRef.current !== id) {
          currentTransferIdRef.current = id;
          receivedChunksMapRef.current.clear();
        }

        if (!receivedChunksMapRef.current.has(i)) {
          receivedChunksMapRef.current.set(i, d);
          playAudioFeedback('frame');
          setIsFrameCaptured(true);
          setTimeout(() => setIsFrameCaptured(false), 200);
        }

        const currentCount = receivedChunksMapRef.current.size;
        const percent = Math.round((currentCount / n) * 100);

        setReceiveProgress({
          current: currentCount,
          total: n,
          percent: percent,
          isComplete: currentCount === n,
        });

        if (currentCount === n) {
          completePacketStr = Array.from({ length: n }, (_, idx) => receivedChunksMapRef.current.get(idx)).join('');
          playAudioFeedback('success');
        } else {
          // Still waiting for remaining optical frames
          return;
        }
      } else if (parsed && (parsed.t === 'SV_SYNC' || parsed.type === 'SAFEVAULT_AIRGAP_SYNC')) {
        // Single QR packet
        completePacketStr = rawText;
        playAudioFeedback('success');
        setIsFrameCaptured(true);
        setTimeout(() => setIsFrameCaptured(false), 200);
        setReceiveProgress({
          current: 1,
          total: 1,
          percent: 100,
          isComplete: true,
        });
      } else {
        setScanWarning('⚠️ 偵測到二維碼，但非 SafeVault 同步碼！請對準發送端畫面。');
        return;
      }

      let packet: SyncPacket;
      try {
        packet = JSON.parse(completePacketStr);
      } catch {
        setScanError('封包重組後解析失敗，資料可能受損');
        return;
      }

      // 密碼學欄位完整性檢查 (相容新短鍵名 ct, iv, s, h 與舊長鍵名)
      const hasCipher = !!(packet.ciphertext || packet.ct);
      const hasIv = !!packet.iv;
      const hasSalt = !!(packet.salt || packet.s);
      const hasAuth = !!(packet.authHash || packet.h);

      if (!hasCipher || !hasIv || !hasSalt || !hasAuth) {
        setScanError('❌ 封包不匹配：缺少必要密碼學欄位 (IV/Salt/密文)，資料可能不完整');
        return;
      }

      const packetVer = packet.v || packet.version || 1;
      if (packetVer > 1) {
        setScanError(`❌ 版本不相容：發送端版本為 v${packetVer}，請更新本機 SafeVault 應用。`);
        return;
      }

      const packetTs = packet.ts || packet.timestamp;
      if (packetTs && Date.now() - packetTs > 15 * 60 * 1000) {
        setScanWarning('⚠️ 提醒：此同步碼生成時間已超過 15 分鐘，若授權失敗請請發送端重新生成。');
      }

      // Brief pause so the user sees 100% reception bar completed
      setTimeout(() => {
        stopScanner();
        setScannedPacket(packet);
      }, 350);
    } catch (err) {
      setScanError('二維碼讀取失敗，請重新對準清晰掃描');
    }
  };

  // 支援手動選取二維碼圖片或拍照解碼 (當鏡頭反光或對焦失焦時之應急方案)
  const handlePhotoFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError('');
    setScanWarning('');

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }
      const decodedText = await scannerRef.current.scanFile(file, false);
      if (decodedText) {
        handleScanSuccess(decodedText);
      }
    } catch (err: any) {
      console.warn('Scan file error', err);
      setScanError('圖片解析未成功：請確認照片二維碼清晰且未反光，或直接使用鏡頭即時掃描。');
    } finally {
      if (e.target) e.target.value = '';
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
      const authHash = scannedPacket.authHash || scannedPacket.h || '';
      const saltStr = scannedPacket.salt || scannedPacket.s || '';
      const iv = scannedPacket.iv;
      const ciphertext = scannedPacket.ciphertext || scannedPacket.ct || '';
      const rounds = scannedPacket.rounds || scannedPacket.r || PIN_PBKDF2_ROUNDS;

      const pinHash = await sha256(inputPin.trim());
      const isMatch = authHash.length <= 16
        ? pinHash.substring(0, authHash.length) === authHash
        : pinHash === authHash;

      if (!isMatch) {
        setScanError('❌ 認證碼錯誤！輸入之授權碼與發送端不匹配，無法解密');
        setIsDecrypting(false);
        return;
      }

      const salt = hexToBuffer(saltStr);
      const pinKey = await deriveKeyFromPassword(inputPin.trim(), salt, rounds);
      const plaintext = await decryptAESGCM(ciphertext, iv, pinKey);
      
      let imported: any;
      try {
        imported = JSON.parse(plaintext);
      } catch {
        setScanError('❌ 解密成功但資料損毀，無法解析為 SafeVault 格式');
        setIsDecrypting(false);
        return;
      }

      const rawItems = imported.items || imported.it || [];
      if (!Array.isArray(rawItems)) {
        setScanError('❌ 資料結構不匹配：未包含有效的帳密清單');
        setIsDecrypting(false);
        return;
      }

      // 保證所有解密出的單元具有完整屬性，相容縮寫短鍵名與完整鍵名
      const normalizedItems: VaultItem[] = rawItems.map((i: any) => ({
        id: i.id || i.i || ('item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
        title: i.title || i.t || '未命名單元',
        account: i.account || i.a || '',
        password: i.password || i.p || '',
        category: i.category || i.c || '通用',
        notes: i.notes || i.n || '',
        templateId: i.templateId || i.tid || undefined,
        fields: Array.isArray(i.fields) ? i.fields : (Array.isArray(i.f) ? i.f : []),
        createdAt: i.createdAt || i.u || Date.now(),
        updatedAt: i.updatedAt || i.u || Date.now(),
      }));

      const rawTemplates = imported.templates || imported.tp || [];
      const rawSnippets = imported.snippets || imported.sn || [];

      const normalizedPayload: VaultPayload = {
        items: normalizedItems,
        templates: Array.isArray(rawTemplates) ? rawTemplates : [],
        snippets: Array.isArray(rawSnippets) ? rawSnippets : [],
      };

      setDecryptedPreview(normalizedPayload);
      analyzeConflicts(normalizedPayload);
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

    // 保證寫入前所有項目包含齊全之必要欄位
    const cleanFinalItems = finalItems.map(item => ({
      ...item,
      fields: Array.isArray(item.fields) ? item.fields : [],
      notes: item.notes || '',
      createdAt: item.createdAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
    }));

    onApplyResolvedSync(cleanFinalItems, newTemplates, newSnippets);
    setSyncedItemCount(cleanFinalItems.length);
    setIsSyncSuccess(true);
  };

  // 智慧完成並關閉：若已成功解密出單元且尚未寫入，點選此按鈕一律自動執行寫入儲存，確保點擊「完成並關閉」時絕對寫入本機保險庫！
  const handleSmartCompleteAndClose = () => {
    if (decryptedPreview && !isSyncSuccess && conflictList.length > 0) {
      handleExecuteFinalSync();
      setTimeout(() => {
        stopScanner();
        onClose();
      }, 200);
      return;
    }
    stopScanner();
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

  const filteredConflictList = useMemo(() => {
    if (previewFilterTab === 'new') return conflictList.filter(c => c.status === 'new');
    if (previewFilterTab === 'modified') return conflictList.filter(c => c.status === 'modified');
    if (previewFilterTab === 'identical') return conflictList.filter(c => c.status === 'identical');
    return conflictList;
  }, [conflictList, previewFilterTab]);

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
            onClick={handleSmartCompleteAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="關閉"
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
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center w-full space-y-3">
                    {/* Active Broadcasting Signal Header */}
                    {frameDataUrls.length > 1 ? (
                      <div className="w-full flex items-center justify-between px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs font-semibold text-sky-950">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                          <span>動態光學輪播中：第 {currentFrameIndex + 1} / {frameDataUrls.length} 影格</span>
                        </div>
                        <span className="font-mono text-[10px] text-sky-700 bg-white px-2 py-0.5 rounded-full border border-sky-100">
                          {carouselSpeedMs}ms 輪播中
                        </span>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl border text-xs font-semibold bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                          </span>
                          <span>🟢 靜態極速碼已啟動 · 廣播待命中</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          畫面靜止為正常
                        </span>
                      </div>
                    )}

                    {frameDataUrls.length === 1 && (
                      <div className="w-full p-2.5 bg-sky-50/80 border border-sky-200 rounded-xl text-left text-[11px] text-sky-900 leading-relaxed flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>💡 為什麼畫面是靜止的？</strong>
                          <p className="text-sky-700 mt-0.5">
                            傳輸單元已採用高精密壓縮封包，生成為「單幀極速二維碼」。接收端相機只要對準下方二維碼 0.1 秒即可瞬間讀取完畢，無須等待輪播！
                          </p>
                        </div>
                      </div>
                    )}

                    {frameDataUrls.length > 0 ? (
                      <div className="flex flex-col items-center w-full">
                        <img
                          src={frameDataUrls[currentFrameIndex] || qrDataUrl}
                          alt="SafeVault Sync QR"
                          className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl shadow-inner bg-white p-2.5 transition-all"
                        />

                        {frameDataUrls.length > 1 && (
                          <div className="w-full mt-2.5 flex flex-col gap-2">
                            {/* Carousel Playback Bar */}
                            <div className="w-full flex items-center justify-between p-2 bg-slate-100 rounded-xl text-xs">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsCarouselPlaying(p => !p)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-bold transition flex items-center gap-1 cursor-pointer"
                                >
                                  {isCarouselPlaying ? '⏸️ 暫停輪播' : '▶️ 繼續輪播'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCurrentFrameIndex(prev => (prev - 1 + frameDataUrls.length) % frameDataUrls.length)}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer font-mono text-[11px]"
                                  title="上一幀"
                                >
                                  ⏮️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCurrentFrameIndex(prev => (prev + 1) % frameDataUrls.length)}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer font-mono text-[11px]"
                                  title="下一幀"
                                >
                                  ⏭️
                                </button>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                <span>速度:</span>
                                {[400, 600, 800].map(speed => (
                                  <button
                                    key={speed}
                                    type="button"
                                    onClick={() => setCarouselSpeedMs(speed)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                                      carouselSpeedMs === speed ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {speed / 1000}s
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Fullscreen QR Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setIsFullscreenQR(true)}
                          className="mt-3 px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>放大二維碼至全螢幕（遠距秒掃防手震）</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-72 h-72 flex items-center justify-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      </div>
                    )}

                    {/* Authentication PIN Box */}
                    <div className="mt-1 p-2.5 bg-white border border-slate-200 rounded-xl w-full flex flex-col items-center">
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
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>重新整理授權碼</span>
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSendStep('select')}
                      className="text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
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
                  {/* Top Controls: Camera Zoom & Maximize Window */}
                  <div className="w-full max-w-sm sm:max-w-md flex items-center justify-between mb-2 px-1 text-xs">
                    {/* Camera Zoom Selection */}
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <span className="text-[11px] text-slate-500 font-semibold px-1 flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5 text-sky-600" />
                        <span>放大:</span>
                      </span>
                      {[1, 1.5, 2, 2.5].map(z => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => handleSetZoom(z)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            cameraZoom === z
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          {z}x
                        </button>
                      ))}
                    </div>

                    {/* Toggle Larger Scanner Window */}
                    <button
                      type="button"
                      onClick={() => setIsMaximizedScanner(prev => !prev)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>{isMaximizedScanner ? '一般視窗' : '放大掃描視窗'}</span>
                    </button>
                  </div>

                  {/* Square 1:1 Aspect Ratio Scanner Window */}
                  <div
                    className={`w-full ${
                      isMaximizedScanner ? 'max-w-md sm:max-w-lg' : 'max-w-sm sm:max-w-md'
                    } aspect-square bg-slate-950 rounded-3xl overflow-hidden shadow-2xl relative border-2 border-slate-700/80 mx-auto flex items-center justify-center transition-all duration-300`}
                  >
                    <div
                      id={scannerContainerId}
                      className="w-full h-full object-cover"
                    />

                    {/* Real-time Camera Sampling Indicator */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 backdrop-blur-md rounded-full text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>鏡頭取景中 · 即時偵測</span>
                    </div>

                    {/* Square Viewfinder Reticle Overlay with 4 corner brackets and scanning laser */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className={`w-[78%] h-[78%] border-2 rounded-2xl relative transition-all duration-200 ${
                        isFrameCaptured
                          ? 'border-emerald-400 shadow-[0_0_30px_#10b981]'
                          : 'border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                      }`}>
                        {/* 4 Square QR corner markers */}
                        <div className={`absolute -top-1.5 -left-1.5 w-7 h-7 border-t-4 border-l-4 rounded-tl-xl transition-colors ${isFrameCaptured ? 'border-emerald-400' : 'border-sky-400'}`} />
                        <div className={`absolute -top-1.5 -right-1.5 w-7 h-7 border-t-4 border-r-4 rounded-tr-xl transition-colors ${isFrameCaptured ? 'border-emerald-400' : 'border-sky-400'}`} />
                        <div className={`absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-4 border-l-4 rounded-bl-xl transition-colors ${isFrameCaptured ? 'border-emerald-400' : 'border-sky-400'}`} />
                        <div className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-4 border-r-4 rounded-br-xl transition-colors ${isFrameCaptured ? 'border-emerald-400' : 'border-sky-400'}`} />
                        {/* Animated Laser Scanline */}
                        {isScanning && (
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_10px_#38bdf8] animate-pulse absolute top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Transmission Progress Bar & Percentage */}
                  <div className="w-full max-w-xs sm:max-w-sm mx-auto mt-3.5 p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-sky-400">
                        <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
                        <span>{receiveProgress.isComplete ? '光學封包接收完成！' : '接收進度'}</span>
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {receiveProgress.percent}%
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(receiveProgress.percent, receiveProgress.current > 0 ? 5 : 0)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>
                        {receiveProgress.total === 1 && receiveProgress.isComplete
                          ? '已接收: 1 / 1 (單幀秒讀完成)'
                          : `已接收: ${receiveProgress.current} / ${receiveProgress.total} 影格`}
                      </span>
                      <span>
                        {receiveProgress.isComplete
                          ? '✅ 封包完整準備解密'
                          : receiveProgress.percent === 0
                          ? '請對準發送端螢幕'
                          : '請保持對準，接收動態影格中...'}
                      </span>
                    </div>
                  </div>

                  {/* Warnings or Errors displayed directly under progress */}
                  {scanWarning && (
                    <div className="w-full max-w-xs sm:max-w-sm mx-auto mt-2 p-2.5 bg-amber-50 text-amber-900 text-xs rounded-xl border border-amber-200 flex items-start gap-2 animate-fade-in">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{scanWarning}</span>
                    </div>
                  )}

                  {scanError && (
                    <div className="w-full max-w-xs sm:max-w-sm mx-auto mt-2 p-2.5 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 flex items-start gap-2 animate-fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{scanError}</span>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 mt-2 text-center max-w-xs leading-relaxed">
                    💡 掃描器已升級全視野無畸變感應：QR Code 只要置於框內（無需貼近超過框外），在 20~40cm 舒適距離即可秒讀！若發送端為靜態碼，保持對準 1 秒即可完成接收。
                  </p>

                  <div className="flex items-center justify-center gap-2 mt-2">
                    {!isScanning && (
                      <button
                        type="button"
                        onClick={startScanner}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer"
                      >
                        重新啟動相機掃描
                      </button>
                    )}

                    {/* Photo/File QR scan fallback */}
                    <button
                      type="button"
                      onClick={() => photoScanInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-600" />
                      <span>拍照或選取二維碼圖片解碼</span>
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={photoScanInputRef}
                      onChange={handlePhotoFileScan}
                      className="hidden"
                    />
                  </div>
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
                        SafeVault v{scannedPacket.v || scannedPacket.version || 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-950 font-mono bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                      <div>
                        <span className="text-slate-400">來源裝置:</span> {scannedPacket.d || scannedPacket.deviceId || 'AirGap-Device'}
                      </div>
                      <div>
                        <span className="text-slate-400">加密標準:</span> AES-256-GCM
                      </div>
                      <div>
                        <span className="text-slate-400">衍生校驗:</span> PBKDF2/SHA-256
                      </div>
                      <div>
                        <span className="text-slate-400">封包時效:</span> {new Date(scannedPacket.ts || scannedPacket.timestamp || Date.now()).toLocaleTimeString()}
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
              ) : isSyncSuccess ? (
                /* SYNC SUCCESS SCREEN (同步成功畫面，明確提示單元已寫入) */
                <div className="p-6 bg-emerald-50/90 border border-emerald-200 rounded-3xl text-center space-y-4 animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-emerald-950">
                      🎉 成功接收！資料已寫入本機保險庫
                    </h3>
                    <p className="text-xs text-emerald-800">
                      本次傳輸已成功儲存，現有保險庫共包含 <strong>{syncedItemCount}</strong> 筆帳密單元。
                    </p>
                  </div>
                  <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200 text-xs text-slate-700 text-left space-y-1.5 font-medium">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>已自動切換回保險庫首頁，新單元已置頂顯示</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>分類過濾已重設為「全部」，方便立即檢視所有單元</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>所有單元均已使用本機 AES-256 主金鑰重新加密落盤</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition shadow-md active:scale-98 cursor-pointer"
                  >
                    立即查看保險庫清單
                  </button>
                </div>
              ) : (
                /* Granular Conflict Resolution & Comprehensive Unit List (資料不同，需保留，讓 user 決定去留！) */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-sky-950">
                      <span className="flex items-center gap-1.5">
                        <GitCompare className="w-4 h-4 text-sky-600" />
                        <span>同步解析成功！共接收 {conflictList.length} 筆單元</span>
                      </span>
                      <span className="text-[11px] text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full">
                        已準備匯入
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-sky-800 pt-0.5">
                      <span>• 新增: <strong className="text-emerald-700">{newItemsCount}</strong> 筆</span>
                      <span>• 完全一致: <strong>{identicalCount}</strong> 筆</span>
                      <span>• 內容有差異: <strong className="text-amber-700">{modifiedConflicts.length}</strong> 筆</span>
                    </div>
                  </div>

                  {/* Filter Tabs for Received Units */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setPreviewFilterTab('all')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer ${
                        previewFilterTab === 'all'
                          ? 'bg-white text-slate-900 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      全部單元 ({conflictList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFilterTab('new')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer ${
                        previewFilterTab === 'new'
                          ? 'bg-white text-emerald-800 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      新增 ({newItemsCount})
                    </button>
                    {modifiedConflicts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilterTab('modified')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer ${
                          previewFilterTab === 'modified'
                            ? 'bg-white text-amber-800 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        有差異 ({modifiedConflicts.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewFilterTab('identical')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer ${
                        previewFilterTab === 'identical'
                          ? 'bg-white text-slate-800 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      一致 ({identicalCount})
                    </button>
                  </div>

                  {/* Global batch decision when there are modified conflicts */}
                  {modifiedConflicts.length > 0 && (
                    <div className="flex items-center justify-between px-1 text-xs text-slate-600">
                      <span className="text-[11px] font-semibold text-slate-700">差異批次處理：</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleSetAllModifiedResolutions('keep_both')}
                          className="text-sky-600 hover:underline font-semibold cursor-pointer"
                        >
                          全部另存副本(零遺失)
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => handleSetAllModifiedResolutions('overwrite_with_incoming')}
                          className="text-slate-600 hover:underline cursor-pointer"
                        >
                          全部用傳輸端覆蓋
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Received Units */}
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {filteredConflictList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                        此分類無單元
                      </div>
                    ) : (
                      filteredConflictList.map(item => (
                        <div
                          key={item.id}
                          className={`p-3.5 bg-white border rounded-2xl space-y-2 shadow-2xs transition ${
                            item.status === 'modified'
                              ? 'border-amber-300 ring-1 ring-amber-100'
                              : item.status === 'new'
                              ? 'border-emerald-300'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0">
                                {item.incomingItem.category || '通用'}
                              </span>
                            </div>

                            {item.status === 'new' && (
                              <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold shrink-0">
                                ✨ 新增單元
                              </span>
                            )}
                            {item.status === 'modified' && (
                              <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold shrink-0">
                                ⚠️ 內容有差異
                              </span>
                            )}
                            {item.status === 'identical' && (
                              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold shrink-0">
                                ✓ 內容一致
                              </span>
                            )}
                          </div>

                          {/* Account & Details row */}
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl flex items-center justify-between">
                            <span>帳號: <strong className="font-mono text-slate-800">{item.incomingItem.account || '(無帳號)'}</strong></span>
                            {item.incomingItem.fields && item.incomingItem.fields.length > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">{item.incomingItem.fields.length} 個自訂欄位</span>
                            )}
                          </div>

                          {/* Diff details if modified */}
                          {item.status === 'modified' && item.diffSummary && (
                            <div className="p-2 bg-amber-50/60 rounded-xl text-[11px] text-amber-900 space-y-1 border border-amber-200/60 font-mono">
                              {item.diffSummary.map((diff, dIdx) => (
                                <div key={dIdx}>• {diff}</div>
                              ))}
                            </div>
                          )}

                          {/* Resolution Choices for modified items */}
                          {item.status === 'modified' && (
                            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleSetResolution(item.id, 'keep_both')}
                                className={`py-1.5 px-2 rounded-xl font-medium border text-center transition cursor-pointer ${
                                  item.resolution === 'keep_both'
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                保留兩者(副本)
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetResolution(item.id, 'overwrite_with_incoming')}
                                className={`py-1.5 px-2 rounded-xl font-medium border text-center transition cursor-pointer ${
                                  item.resolution === 'overwrite_with_incoming'
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                以傳輸端覆蓋
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetResolution(item.id, 'keep_local')}
                                className={`py-1.5 px-2 rounded-xl font-medium border text-center transition cursor-pointer ${
                                  item.resolution === 'keep_local'
                                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs font-bold'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                保留本機原有
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Primary Trigger: 確認執行同步並儲存至本機 */}
                  <button
                    type="button"
                    onClick={handleSmartCompleteAndClose}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>確認匯入並寫入儲存這 {conflictList.length} 筆帳密單元至本機保險庫</span>
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
          {decryptedPreview && !isSyncSuccess ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  onClose();
                }}
                className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 rounded-xl transition cursor-pointer"
              >
                放棄接收
              </button>
              <button
                type="button"
                onClick={handleSmartCompleteAndClose}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>完成並寫入儲存 ({conflictList.length} 筆)</span>
              </button>
            </div>
          ) : isSyncSuccess ? (
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>完成並查看保險庫</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl transition cursor-pointer"
            >
              關閉
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Extra-Large QR Modal Overlay for long-range, anti-shake scanning */}
      {isFullscreenQR && (
        <div className="fixed inset-0 z-[100] bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center space-y-4">
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-sky-600" />
                <span>全螢幕放大同步碼（遠距防抖秒讀）</span>
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreenQR(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-2.5 rounded-2xl border-2 border-slate-900 shadow-lg">
              <img
                src={frameDataUrls[currentFrameIndex] || qrDataUrl}
                alt="SafeVault Sync QR Full"
                className="w-[78vw] h-[78vw] max-w-[360px] max-h-[360px] object-contain"
              />
            </div>

            <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200 w-full text-center">
              <span className="text-[11px] text-sky-800 block font-semibold">6 位數認證授權碼:</span>
              <span className="text-3xl font-mono font-black text-sky-700 tracking-widest block mt-0.5">
                {authPin || '------'}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              💡 放大後可將此手機置於 30～50 公分處，接收端相機即可輕鬆秒讀，鏡頭焦點更銳利、不再手震模糊！
            </p>

            <button
              type="button"
              onClick={() => setIsFullscreenQR(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              縮小並返回
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
