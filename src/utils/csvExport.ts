import { VaultItem, DeletedVaultItem } from '../types/vault';

export interface CSVExportOptions {
  includeDeleted?: boolean;
  includeCustomFields?: boolean;
  maskPasswords?: boolean; // 脫敏安全備份：密碼與機敏欄位以星號遮罩匯出，適合安全存檔或列印
}

/**
 * 格式化時間戳記為 YYYY-MM-DD HH:mm:ss 本地時間
 */
export function formatTimestamp(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * RFC 4180 CSV 欄位轉義與深度防試算表公式注入 (OWASP CSV Formula Injection Defense)
 * 嚴防 =, +, -, @, \t, \r, |, % 以及前導空格繞過
 */
export function escapeCSVField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) {
    return '""';
  }
  let str = String(val);

  // 深度防試算表公式注入：即便開頭帶有空白，Excel 仍可能解析執行。先 trimStart 檢查危險開頭
  const trimmed = str.trimStart();
  if (/^[\=\+\-\@\t\r\|\%]/.test(trimmed)) {
    str = `'${str}`;
  }

  // 將內部所有的雙引號 " 轉成兩個雙引號 "" (RFC 4180 標準)
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * 生成帶有時間戳的備份檔案名稱
 */
export function generateCSVBackupFilename(isMasked?: boolean): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const prefix = isMasked ? 'SafeVault_帳密備份_脫敏防窺' : 'SafeVault_帳密備份';
  return `${prefix}_${dateStr}_${timeStr}.csv`;
}

/**
 * 將保險庫帳密資料轉換為標準 CSV 格式字串 (含 UTF-8 BOM 避免 Excel 亂碼)
 */
export function exportVaultItemsToCSV(
  items: VaultItem[],
  deletedItems: DeletedVaultItem[] = [],
  options: CSVExportOptions = { includeDeleted: false, includeCustomFields: true, maskPasswords: false }
): { csvString: string; count: number; totalFieldsCount: number } {
  // 表頭定義
  const headers = [
    '名稱 (Title)',
    '分類 (Category)',
    '帳號 (Account)',
    options.maskPasswords ? '密碼 (Password - 已脫敏)' : '密碼 (Password)',
    '備註說明 (Notes)',
    '自訂欄位與屬性 (Custom Fields)',
    '單元狀態 (Status)',
    '建立時間 (Created At)',
    '最後更新時間 (Updated At)',
  ];

  const rows: string[] = [];
  rows.push(headers.map(h => escapeCSVField(h)).join(','));

  let totalFieldsCount = 0;
  let count = 0;

  // 1. 導出正常有效單元
  for (const item of items) {
    count++;
    let customFieldsStr = '';
    if (options.includeCustomFields && item.fields && item.fields.length > 0) {
      totalFieldsCount += item.fields.length;
      customFieldsStr = item.fields
        .map(f => {
          const sensitiveTag = f.isSensitive ? '[隱蔽]' : '';
          const displayVal = (options.maskPasswords && f.isSensitive) ? '••••••••' : f.value;
          return `${f.label}${sensitiveTag}: ${displayVal}`;
        })
        .join('\n');
    }

    const effectivePassword = options.maskPasswords
      ? '••••••••••••'
      : (item.password || '');

    const row = [
      escapeCSVField(item.title || '未命名單元'),
      escapeCSVField(item.category || '未分類'),
      escapeCSVField(item.account || ''),
      escapeCSVField(effectivePassword),
      escapeCSVField(item.notes || ''),
      escapeCSVField(customFieldsStr),
      escapeCSVField('正常有效 (Active)'),
      escapeCSVField(formatTimestamp(item.createdAt)),
      escapeCSVField(formatTimestamp(item.updatedAt)),
    ];

    rows.push(row.join(','));
  }

  // 2. 選填：若使用者勾選包含回收站單元
  if (options.includeDeleted && deletedItems && deletedItems.length > 0) {
    for (const del of deletedItems) {
      const item = del.item;
      count++;
      let customFieldsStr = '';
      if (options.includeCustomFields && item.fields && item.fields.length > 0) {
        totalFieldsCount += item.fields.length;
        customFieldsStr = item.fields
          .map(f => {
            const sensitiveTag = f.isSensitive ? '[隱蔽]' : '';
            const displayVal = (options.maskPasswords && f.isSensitive) ? '••••••••' : f.value;
            return `${f.label}${sensitiveTag}: ${displayVal}`;
          })
          .join('\n');
      }

      const effectivePassword = options.maskPasswords
        ? '••••••••••••'
        : (item.password || '');

      const row = [
        escapeCSVField(item.title || '未命名單元'),
        escapeCSVField(item.category || '未分類'),
        escapeCSVField(item.account || ''),
        escapeCSVField(effectivePassword),
        escapeCSVField(item.notes || ''),
        escapeCSVField(customFieldsStr),
        escapeCSVField(`回收站已刪除 (已刪於: ${formatTimestamp(del.deletedAt)})`),
        escapeCSVField(formatTimestamp(item.createdAt)),
        escapeCSVField(formatTimestamp(item.updatedAt)),
      ];

      rows.push(row.join(','));
    }
  }

  // 加入 UTF-8 BOM (\uFEFF) 讓 Microsoft Excel (Windows/Mac) 自動識別編碼，徹底避免中文亂碼
  const csvString = '\uFEFF' + rows.join('\r\n');

  return {
    csvString,
    count,
    totalFieldsCount,
  };
}

/**
 * 觸發瀏覽器下載 CSV 檔案
 */
export function triggerCSVDownload(filename: string, csvContent: string): boolean {
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    return true;
  } catch (error) {
    console.error('匯出 CSV 下載失敗:', error);
    return false;
  }
}
