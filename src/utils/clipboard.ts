let clearTimer: ReturnType<typeof setTimeout> | null = null;

export interface CopyResult {
  success: boolean;
  message: string;
}

/**
 * 安全複製至剪貼簿，並在指定秒數後自動清空剪貼簿，保護敏感資訊
 */
export async function copyToClipboardSecure(
  text: string,
  label: string = '資訊',
  timeoutSec: number = 30
): Promise<CopyResult> {
  if (!text) {
    return { success: false, message: '無可複製內容' };
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // 清除舊計時器
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }

    // 啟動定時清除
    if (timeoutSec > 0) {
      clearTimer = setTimeout(async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            // 嘗試清空剪貼簿
            await navigator.clipboard.writeText('');
          }
        } catch {
          // ignore background clear restrictions
        }
      }, timeoutSec * 1000);
    }

    return {
      success: true,
      message: `${label} 已複製！(${timeoutSec > 0 ? `${timeoutSec} 秒後自動清除` : '完成'})`,
    };
  } catch (err) {
    console.error('Clipboard write error', err);
    return { success: false, message: '複製失敗，請手動選取複製' };
  }
}
