import { VaultItem, DeletedVaultItem } from '../types/vault';

export interface CSVExportOptions {
  includeDeleted?: boolean;
  includeCustomFields?: boolean;
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
 * RFC 4180 CSV 欄位轉義與防試算表公式注入 (Formula Injection) 處理
 */
export function escapeCSVField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) {
    return '""';
  }
  let str = String(val);

  // 防試算表公式注入：如果字串開頭是 =, +, -, @，在前面加上單引號避免被 Excel/Google Sheets 當作公式執行
  if (/^[\=\+\-\@]/.test(str)) {
    str = `'${str}`;
  }

  // 將內部所有的雙引號 " 轉成兩個雙引號 ""
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * 生成帶有時間戳的備份檔案名稱
 */
export function generateCSVBackupFilename(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `SafeVault_帳密備份_${dateStr}_${timeStr}.csv`;
}

/**
 * 將保險庫帳密資料轉換為標準 CSV 格式字串 (含 UTF-8 BOM 避免 Excel 亂碼)
 */
export function exportVaultItemsToCSV(
  items: VaultItem[],
  deletedItems: DeletedVaultItem[] = [],
  options: CSVExportOptions = { includeDeleted: false, includeCustomFields: true }
): { csvString: string; count: number; totalFieldsCount: number } {
  // 表頭定義
  const headers = [
    '名稱 (Title)',
    '分類 (Category)',
    '帳號 (Account)',
    '密碼 (Password)',
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
          return `${f.label}${sensitiveTag}: ${f.value}`;
        })
        .join('\n');
    }

    const row = [
      escapeCSVField(item.title || '未命名單元'),
      escapeCSVField(item.category || '未分類'),
      escapeCSVField(item.account || ''),
      escapeCSVField(item.password || ''),
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
            return `${f.label}${sensitiveTag}: ${f.value}`;
          })
          .join('\n');
      }

      const row = [
        escapeCSVField(item.title || '未命名單元'),
        escapeCSVField(item.category || '未分類'),
        escapeCSVField(item.account || ''),
        escapeCSVField(item.password || ''),
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
