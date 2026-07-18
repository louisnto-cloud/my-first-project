// Tiny client-side CSV export. Builds a UTF-8 (BOM) file so Excel opens
// Vietnamese diacritics correctly, and triggers a download — no server.
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]): void {
  const esc = (v: string | number | null) => {
    let s = v == null ? '' : String(v);
    // Neutralize spreadsheet formula injection: a cell starting with
    // = + - @ (or a lone tab/CR) can execute in Excel/Sheets. Prefix a
    // zero-width guard apostrophe so it always renders as text.
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
