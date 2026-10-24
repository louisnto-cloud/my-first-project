// ─── Vietnamese review export ────────────────────────────────────────────────
// Walks all content and collects every Vietnamese string still marked
// 'unverified', so a native speaker (Jao, or her mother) can check them.

import { WORLDS } from '@/content/worlds';
import { PRAYERS } from '@/content/prayers';
import { GLOSSARY } from '@/content/glossary';
import { UI } from '@/content/ui';

interface ReviewItem {
  path: string;
  en: string;
  vi: string;
}

function isL(v: unknown): v is { en: string; vi: string; viStatus: string } {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as Record<string, unknown>).en === 'string' &&
    typeof (v as Record<string, unknown>).vi === 'string' &&
    typeof (v as Record<string, unknown>).viStatus === 'string'
  );
}

function walk(node: unknown, path: string, out: ReviewItem[]): void {
  if (isL(node)) {
    if (node.viStatus === 'unverified') out.push({ path, en: node.en, vi: node.vi });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}[${i}]`, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) walk(value, path ? `${path}.${key}` : key, out);
  }
}

export function collectUnverified(): ReviewItem[] {
  const out: ReviewItem[] = [];
  walk(WORLDS, 'worlds', out);
  walk(PRAYERS, 'prayers', out);
  walk(GLOSSARY, 'glossary', out);
  walk(UI, 'ui', out);
  // Traditional Vietnamese prayer texts also need a native eye.
  PRAYERS.forEach((p) => {
    if (p.viStatus === 'unverified') {
      out.push({ path: `prayers.${p.id}.vi`, en: p.en.join(' / '), vi: p.vi.join(' / ') });
    }
  });
  return out;
}

export function downloadFile(filename: string, contents: string, type = 'application/json'): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
