export const usd0 = (n: number) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');

export const usd2 = (n: number) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct1 = (n: number) => (n * 100).toFixed(1) + '%';

export const num0 = (n: number) => Math.round(n).toLocaleString('en-US');

export const x2 = (n: number) => n.toFixed(2) + 'x';
