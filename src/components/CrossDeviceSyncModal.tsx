import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { VaultPayload, SyncPacket, EncryptedContainer } from '../types/vault';
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
  onImportPayload: (importedPayload: VaultPayload, mode: 'merge' | 'replace') => void;
}

export const CrossDeviceSyncModal: React.FC<CrossDeviceSyncModalProps> = ({
  isOpen,
  onClose,
  vaultPayload,
  onImportPayload,
}) => {
  const [activeTab, setActiveTab] = useState<'send_qr' | 'scan_qr' | 'file_sync'>('send_qr');

  // Send QR state
  const [authPin, setAuthPin] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  // Scan QR state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPacket, setScannedPacket] = useState<SyncPacket | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [scanError, setScanError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedPreview, setDecryptedPreview] = useState<VaultPayload | null>(null);

  // File sync state
  const [fileMsg, setFileMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'safevault-qr-reader';

  // 產生動態加密 QR Code (發送端)
  const generateSyncQR = async () => {
    setIsGeneratingQR(true);
    try {
      const pin = generateHandshakePin();
      setAuthPin(pin);

      const salt = generateSalt();
      const pinKey = await deriveKeyFromPassword(pin, salt, 20000); // 專用傳輸金鑰
      const authHash = await sha256(pin);

      // 加密 payload
      const jsonStr = JSON.stringify(vaultPayload);
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
      // Generate QR Code with high error correction
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

  useEffect(() => {
    if (isOpen && activeTab === 'send_qr') {
      generateSyncQR();
    }
  }, [isOpen, activeTab]);

  // 相機 QR Code 掃描器 (接收端)
  const startScanner = async () => {
    setScanError('');
    setIsScanning(true);
    setScannedPacket(null);
    setDecryptedPreview(null);
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
        () => {
          // scanning frame (ignore errors)
        }
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
    } catch (err) {
      console.error('Decrypt sync packet error', err);
      setScanError('解密失敗，請確認認證碼是否正確');
    } finally {
      setIsDecrypting(false);
    }
  };

  // 確定套用匯入
  const handleApplySync = (mode: 'merge' | 'replace') => {
    if (!decryptedPreview) return;
    onImportPayload(decryptedPreview, mode);
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

  // 檔案匯入
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

        // 儲存至本機
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

  // 切換分頁時停止相機
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">跨裝置離線近場同步</h2>
              <p className="text-xs text-slate-500">零聯網 · 手機/桌機/平板即時對接傳輸</p>
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
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>在接收裝置（桌機、平板或另一手機）開啟 SafeVault。</li>
                  <li>於接收裝置切換至「掃描接收端」開啟相機對準此二維碼。</li>
                  <li>接收端輸入上方顯示的 <strong>{authPin}</strong> 取得認證同意。</li>
                  <li>完成點對點光學加密傳輸，全程完全不經過任何網路！</li>
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
                    請使用相機對準傳輸端手機螢幕上的動態加密 QR Code
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
                      已讀取加密封包！請輸入認證碼
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
                /* Decrypted preview */
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold">認證成功！已成功離線解密封包</h3>
                  </div>
                  <div className="p-3 bg-white rounded-xl text-xs space-y-1.5 text-slate-700 border border-emerald-100">
                    <p>
                      • 包含帳號密碼項目: <strong>{decryptedPreview.items?.length || 0}</strong> 筆
                    </p>
                    <p>
                      • 包含自訂格式範本: <strong>{decryptedPreview.templates?.length || 0}</strong> 個
                    </p>
                    <p>
                      • 包含常用個人字串: <strong>{decryptedPreview.snippets?.length || 0}</strong> 筆
                    </p>
                  </div>

                  <p className="text-xs text-slate-600">
                    請選擇如何將這筆離線數據同步至本機：
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplySync('merge')}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition text-center shadow-sm"
                    >
                      合併至現有庫 (推薦)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySync('replace')}
                      className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition text-center shadow-sm"
                    >
                      完全覆蓋本機庫
                    </button>
                  </div>
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
