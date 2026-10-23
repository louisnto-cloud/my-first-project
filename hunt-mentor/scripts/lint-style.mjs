// Hunt Mentor style lint (CLAUDE.md writing rules). Zero dependencies.
// Run: npm run lint:style   (or: node scripts/lint-style.mjs [--quiet])
//
// Checks user facing text only (not code):
//   content/**/*.md               lesson text, quiz JSON, block captions
//   data/*.json, data/addons/**, data/{photos,videos,plans,seasons}/*.json   string values that read as prose
//   app/*.js, app/addons/*.js, data/addons/**/*.js   UI strings
//   diagrams/**/*.svg             <text>, <title>, <desc>
// Not checked: app/map/*, app/vendor/*, data/layers, data/spots (map code and map data).
//
// Errors (exit code 1): em dashes, hyphens in prose.
// Report only: en dashes, acronyms not spelled out at first use in a lesson, VERIFY counts.
//
// Hyphens are allowed in: URLs, file names, code in backticks, link targets, quoted text
// ("..." or “...”, for quoted law and official titles), codes where every part has a digit
// (MU 3-27, .30-06, SOR-2022-105), all capital codes, and terms in scripts/style-allowlist.txt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUIET = process.argv.includes('--quiet');
const rel = (p) => path.relative(ROOT, p);

// ---------- allowlist ----------
const allowFile = path.join(ROOT, 'scripts/style-allowlist.txt');
const allow = new Set();
if (fs.existsSync(allowFile)) {
  for (const l of fs.readFileSync(allowFile, 'utf8').split('\n')) {
    const t = l.replace(/#.*/, '').trim();
    if (t) allow.add(t.toLowerCase());
  }
}

// ---------- file lists ----------
const walk = (d, test, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, test, out); else if (test(p)) out.push(p);
  }
  return out;
};
const J = (...p) => path.join(ROOT, ...p);
const mdFiles = walk(J('content'), (p) => p.endsWith('.md')).sort();
const jsonFiles = [
  ...fs.readdirSync(J('data')).filter((f) => f.endsWith('.json')).map((f) => J('data', f)),
  ...walk(J('data/addons'), (p) => p.endsWith('.json')),
  ...['photos', 'videos', 'plans', 'seasons'].flatMap((d) => walk(J('data', d), (p) => p.endsWith('.json'))),
].sort();
const jsFiles = [
  ...fs.readdirSync(J('app')).filter((f) => f.endsWith('.js')).map((f) => J('app', f)),
  ...walk(J('app/addons'), (p) => p.endsWith('.js')),
  ...walk(J('data/addons'), (p) => p.endsWith('.js')),
].sort();
const svgFiles = walk(J('diagrams'), (p) => p.endsWith('.svg')).sort();

// ---------- findings ----------
const found = { em: [], hyphen: [], en: [], acronym: [], verify: new Map() };
const ctx = (s) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > 110 ? s.slice(0, 107) + '...' : s; };

// strip the parts of a text that may keep hyphens
function proseOnly(s) {
  return s
    .replace(/`[^`]*`/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\bhttps?:\/\/\S+/g, ' ')
    .replace(/\bwww\.\S+/g, ' ')
    .replace(/\S+@\S+\.\w+/g, ' ')
    .replace(/"[^"\n]*"/g, ' ')
    .replace(/“[^”\n]*”/g, ' ')
    .replace(/\\"[^"\n]*\\"/g, ' ')
    .replace(/[\w./-]+\.(md|json|mjs|js|css|svg|png|jpe?g|webp|pdf|gpx|kml|kmz|csv|html?|py|geojson|pmtiles|zip|txt)\b/gi, ' ')
    .replace(/\S*[a-z][A-Z]\S*/g, ' ') // camelCase identifiers
    .replace(/\S*_\S*/g, ' ');
}

const HY = /[A-Za-z0-9.'’]*[A-Za-z0-9]-[A-Za-z0-9][A-Za-z0-9.'’-]*/g;
function hyphenAllowed(tok) {
  tok = tok.replace(/[.'’]+$/, '').replace(/['’]s$/, '');
  if (allow.has(tok.toLowerCase())) return true;
  for (const a of allow) if (a.includes('-') && tok.toLowerCase().includes(a)) return true;
  const parts = tok.split('-');
  if (parts.every((p) => /\d/.test(p))) return true; // codes: MU 3-27, .30-06, 7-12
  if (parts.every((p) => /^[A-Z0-9.]+$/.test(p))) return true; // all capital codes: SOR-2022-105
  if (/^[a-z]{1,2}(-\d+)+$/i.test(tok)) return true; // order and map codes: u-3-003
  return false;
}

function checkText(file, line, raw, quoted = false) {
  if (raw.includes('—')) found.em.push({ file, line, text: ctx(raw) });
  if (raw.includes('–')) found.en.push({ file, line, text: ctx(raw) });
  const v = (raw.match(/\bVERIFY\b/g) || []).length;
  if (v) found.verify.set(file, (found.verify.get(file) || 0) + v);
  // quoted law text in a blockquote ("> \"...") and law callout titles keep their wording
  if (quoted || /^\s*>\s*["“]/.test(raw) || /^\s*>\s*\[!law\]/.test(raw)) return;
  const p = proseOnly(raw);
  for (const m of p.matchAll(HY)) if (!hyphenAllowed(m[0])) found.hyphen.push({ file, line, token: m[0], text: ctx(raw) });
  const body = p.replace(/^\s*([-*]|\d+\.)\s+/, '').replace(/^\s*>\s*/, '');
  for (const m of body.matchAll(/(\S+)\s-\s(\S+)/g)) {
    if (/\d$/.test(m[1]) && /^\d/.test(m[2])) continue; // arithmetic
    found.hyphen.push({ file, line, token: `${m[1]} - ${m[2]}`, text: ctx(raw), dash: true });
  }
}

// JSON values that are verbatim quotes (official text or titles of other people's work):
// file path prefix -> key -> test on the value. Only em dashes and VERIFY are checked there.
const QUOTED = {
  'data/seasons/': { limit: () => true }, // bag limit wording as printed in the synopsis
  'data/videos/': { title: () => true, author: () => true }, // titles and channel names of the videos
  'data/addons/noshoot/unmapped.json': { text: (v) => /^Map [A-Z]\d+ /.test(v) }, // synopsis map titles and notes
};
const quotedKey = (file, key, v) => Object.entries(QUOTED).some(([pre, keys]) => file.startsWith(pre) && keys[key] && keys[key](v));

// JSON string scanner: gives each string value with its key and line
const SKIP_KEYS = new Set(['id', 'ids', 'url', 'urls', 'href', 'src', 'link', 'file', 'files', 'path', 'icon', 'img', 'image',
  'licenceUrl', 'licenseUrl', 'author', 'licence', 'license', 'type', 'kind', 'slug', 'route', 'color', 'colour', 'svg', 'diagram',
  'anim', 'cardDeck', 'key', 'session', 'sessions', 'lesson', 'mu', 'mus', 'code', 'photo', 'video', 'yt', 'map', 'geom']);
function scanJSONText(file, text, lineOffset = 0, needSpace = true) {
  const re = /"((?:[^"\\\n]|\\.)*)"(\s*:)?/g;
  let lastKey = '';
  const lineAt = mkLineAt(text);
  for (const m of text.matchAll(re)) {
    if (m[2]) { lastKey = m[1]; continue; }
    let s; try { s = JSON.parse(`"${m[1]}"`); } catch { s = m[1]; }
    if (SKIP_KEYS.has(lastKey)) { if (/—/.test(s)) checkText(file, lineOffset + lineAt(m.index), s, true); continue; }
    if (needSpace && !/[A-Za-z]\s+\S/.test(s) && !/[—–]/.test(s) && !/\bVERIFY\b/.test(s)) continue;
    checkText(file, lineOffset + lineAt(m.index), s, quotedKey(file, lastKey, s));
  }
}
function mkLineAt(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (idx) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; } return lo + 1; };
}

// ---------- glossary acronyms ----------
const glossary = fs.readFileSync(J('content/glossary.md'), 'utf8');
const acronyms = [...new Set([...glossary.matchAll(/^\s*-\s+\*\*([A-Z][A-Z0-9&]{1,9})\*\*\s*:/gm)].map((m) => m[1]))].sort();

// ---------- Markdown ----------
function lintMarkdown(f) {
  const file = rel(f);
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');
  let i = 0;
  const proseLines = []; // [line, text] for the acronym check
  if (lines[0] === '---') {
    i = 1;
    for (; i < lines.length && lines[i] !== '---'; i++) {
      const kv = lines[i].match(/^(title|summary|description|why):\s*(.*)$/);
      if (kv) checkText(file, i + 1, kv[2]);
    }
    i++;
  }
  for (; i < lines.length; i++) {
    const l = lines[i];
    const fence = l.match(/^```(\w+)?\s*(.*)$/);
    if (fence) {
      const kind = fence[1] || '';
      const arg = fence[2] || '';
      const start = i;
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      // caption on the opening line: after the block id
      if (['diagram', 'anim', 'photo', 'video', 'mumap', 'gallery'].includes(kind)) {
        const cap = kind === 'mumap' ? arg.replace(/^(region\s+)?\S+\s*/, '') : arg.replace(/^\S+\s*/, '');
        if (cap) { checkText(file, start + 1, cap); proseLines.push([start + 1, cap]); }
      } else if (['steps', 'more', 'checklist'].includes(kind) && arg) {
        const cap = kind === 'checklist' ? '' : arg;
        if (cap) { checkText(file, start + 1, cap); proseLines.push([start + 1, cap]); }
      }
      if (kind === 'quiz') {
        scanJSONText(file, body.join('\n'), start + 1, false);
        try { for (const q of JSON.parse(body.join('\n'))) proseLines.push([start + 2, [q.q, ...(q.options || []), q.why].join(' ')]); } catch { /* bad quiz JSON is the build's job */ }
      } else if (['checklist', 'more', 'gallery', 'steps', 'video'].includes(kind)) {
        body.forEach((b, k) => {
          const t = ['gallery', 'steps', 'video'].includes(kind) ? b.replace(/^\s*[\w:-]+\s*\|?/, '') : b;
          checkText(file, start + 2 + k, t);
          proseLines.push([start + 2 + k, t]);
        });
      } else if (kind === 'diagram' && body.some((b) => /<svg|<text/.test(b))) {
        lintSvgText(file, body.join('\n'), start + 1);
      }
      continue;
    }
    if (/^\|[-| :]+\|\s*$/.test(l)) continue; // table rule
    checkText(file, i + 1, l);
    proseLines.push([i + 1, l]);
  }
  if (file !== 'content/glossary.md') acronymCheck(file, proseLines);
}

function acronymCheck(file, proseLines) {
  proseLines = proseLines.map(([line, raw]) => [line, raw, proseOnly(raw).replace(/\*\*/g, '')]);
  for (const a of acronyms) {
    const re = new RegExp(`(^|[^A-Za-z0-9])${a}(s|'s)?(?![A-Za-z0-9])`);
    for (const [line, raw, t] of proseLines) {
      if (!t.includes(a)) continue;
      const m = t.match(re);
      if (!m) continue;
      const at = m.index + m[1].length;
      const after = t.slice(at + a.length + (m[2] || '').length);
      const before = t.slice(0, at);
      const spelled = /^\s*\(/.test(after) || /\(\s*$/.test(before) || /\b[A-Z][a-z]+\s*\(\s*$/.test(before);
      if (!spelled) found.acronym.push({ file, line, token: a, text: ctx(raw) });
      break;
    }
  }
}

// ---------- SVG ----------
function lintSvgText(file, text, lineOffset = 0) {
  const lineAt = mkLineAt(text);
  for (const m of text.matchAll(/<(text|title|desc)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const inner = m[2].replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (inner.trim()) checkText(file, lineOffset + lineAt(m.index), inner);
  }
}

// ---------- JavaScript UI strings ----------
function jsStrings(src) {
  const out = []; // [index, text]
  const n = src.length;
  let i = 0;
  let prev = ''; // last significant code char, to tell a regex from a division
  // read code until the end, or until the } that closes a template ${ (depth 0)
  const code = (inTemplate) => {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
      if (c === '"' || c === "'" || c === '`') { str(c); prev = 'a'; continue; }
      if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev))) {
        i++; let cls = false;
        while (i < n && (src[i] !== '/' || cls) && src[i] !== '\n') { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; }
        i++; prev = 'a'; continue;
      }
      if (inTemplate) { if (c === '{') depth++; else if (c === '}') { if (!depth) { i++; return; } depth--; } }
      if (!/\s/.test(c)) prev = /[\w$)\]]/.test(c) ? 'a' : c;
      i++;
    }
  };
  const str = (q) => {
    const st = i; i++;
    let s = '';
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') { s += src[i] + (src[i + 1] || ''); i += 2; continue; }
      if (q === '`' && src[i] === '$' && src[i + 1] === '{') { i += 2; prev = '{'; code(true); s += ' \u0000 '; continue; }
      s += src[i++];
    }
    i++;
    out.push([st, s]);
  };
  code(false);
  return out;
}
function lintJs(f) {
  const file = rel(f);
  const src = fs.readFileSync(f, 'utf8');
  const lineAt = mkLineAt(src);
  for (const [idx, s0] of jsStrings(src)) {
    const s = s0.replace(/\\n/g, ' ').replace(/\\(['"`\\])/g, '$1');
    const text = s.replace(/<[^>]*>/g, ' ').replace(/\u0000/g, ' ');
    if (!/[A-Za-z]{2,}\s+[A-Za-z]/.test(text) && !/[—–]/.test(text)) continue; // identifiers, class names, selectors
    // a CSS selector or class list ("btn primary", ".card h2"), not a sentence
    if (/^[\s\w.#,>+~:\[\]^$*=()"'-]*$/.test(text) && (/[.#][\w-]/.test(text) || !/[a-z]{3,} [a-z]{3,} [a-z]{3,}/.test(text))) continue;
    if (/^\s*[\w-]+\s*:\s*[^;]+;/.test(text) || /\b(px|rem|em|rgba?|var\(--)\b/.test(text) && /[:;]/.test(text)) continue; // inline CSS
    checkText(file, lineAt(idx), text);
  }
}

// ---------- run ----------
mdFiles.forEach(lintMarkdown);
jsonFiles.forEach((f) => scanJSONText(rel(f), fs.readFileSync(f, 'utf8')))
jsFiles.forEach(lintJs);
svgFiles.forEach((f) => lintSvgText(rel(f), fs.readFileSync(f, 'utf8')));

// ---------- report ----------
const byFile = (arr) => { const m = new Map(); for (const x of arr) { if (!m.has(x.file)) m.set(x.file, []); m.get(x.file).push(x); } return m; };
const out = [];
const section = (title, arr, fmt, limitPerFile = Infinity) => {
  out.push('', `== ${title}: ${arr.length}`);
  if (!arr.length) { out.push('  none'); return; }
  if (QUIET) return;
  for (const [file, xs] of byFile(arr)) {
    out.push(`  ${file} (${xs.length})`);
    xs.slice(0, limitPerFile).forEach((x) => out.push('    ' + fmt(x)));
    if (xs.length > limitPerFile) out.push(`    ... ${xs.length - limitPerFile} more`);
  }
};
out.push('Hunt Mentor style lint', `Checked: ${mdFiles.length} Markdown, ${jsonFiles.length} JSON, ${jsFiles.length} JS, ${svgFiles.length} SVG files. Allowlist: ${allow.size} terms.`);
section('ERROR em dashes', found.em, (x) => `line ${x.line}: ${x.text}`);
section('ERROR hyphens in prose', found.hyphen, (x) => `line ${x.line}: "${x.token}"${x.dash ? ' (spaced hyphen used as a dash)' : ''}  | ${x.text}`);
section('report en dashes', found.en, (x) => `line ${x.line}: ${x.text}`);
section('report acronyms not spelled out at first use in the lesson', found.acronym, (x) => `line ${x.line}: ${x.token}  | ${x.text}`, 15);
const vTotal = [...found.verify.values()].reduce((a, b) => a + b, 0);
out.push('', `== report VERIFY markers: ${vTotal} in ${found.verify.size} files`);
if (!QUIET) [...found.verify].sort((a, b) => b[1] - a[1]).forEach(([f, c]) => out.push(`  ${String(c).padStart(4)}  ${f}`));
out.push('', 'Summary',
  `  em dashes:            ${found.em.length}  (error)`,
  `  hyphens in prose:     ${found.hyphen.length}  (error)`,
  `  en dashes:            ${found.en.length}  (report only)`,
  `  acronyms first use:   ${found.acronym.length}  (report only; glossary list: ${acronyms.length} acronyms)`,
  `  VERIFY markers:       ${vTotal}  (report only)`);
const fail = found.em.length + found.hyphen.length > 0;
out.push(fail ? 'Result: FAIL (fix the em dashes and prose hyphens above, or add an official name to scripts/style-allowlist.txt)' : 'Result: PASS');
console.log(out.join('\n'));
process.exitCode = fail ? 1 : 0;
