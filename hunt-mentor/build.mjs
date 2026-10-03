// Hunt Mentor build: Markdown content + data -> static PWA and single file backup.
// Zero dependencies. Run: node build.mjs [--out dist]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const outArg = process.argv.indexOf('--out');
const OUT = path.resolve(outArg > -1 ? process.argv[outArg + 1] : path.join(ROOT, 'dist'));

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJSON = (p) => JSON.parse(read(p));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- inline Markdown ----------
function inline(s) {
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, term, label) =>
    `<button class="term" data-term="${term.trim()}">${(label || term).trim()}</button>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
    u.startsWith('#') ? `<a href="${u}">${t}</a>` : `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  s = s.replace(/\((\d{2,3})%\)/g, (_, n) => {
    const v = +n; const cls = v >= 95 ? 'c-hi' : v >= 80 ? 'c-mid' : v >= 60 ? 'c-lo' : 'c-tip';
    return `<span class="cert ${cls}" title="Certainty">${v}%</span>`;
  });
  s = s.replace(/\bVERIFY\b/g, '<span class="verify">VERIFY</span>');
  return s;
}

// ---------- block Markdown ----------
function blocks(md, ctx) {
  const lines = md.replace(/\r/g, '').split('\n');
  let html = '';
  let i = 0;
  const listStack = [];
  const closeLists = (depth = 0) => {
    while (listStack.length > depth) html += `</li></${listStack.pop()}>`;
  };
  while (i < lines.length) {
    const line = lines[i];
    // fenced blocks
    const fence = line.match(/^```(\w+)?\s*(.*)$/);
    if (fence) {
      closeLists();
      const kind = fence[1] || ''; const arg = fence[2].trim();
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      i++;
      html += fenced(kind, arg, body.join('\n'), ctx);
      continue;
    }
    if (/^\s*$/.test(line)) { closeLists(); i++; continue; }
    const h = line.match(/^(#{3,4})\s+(.*)$/);
    if (h) { closeLists(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; i++; continue; }
    // callouts: > [!rule] Title
    if (line.startsWith('>')) {
      closeLists();
      const body = [];
      while (i < lines.length && lines[i].startsWith('>')) body.push(lines[i++].replace(/^>\s?/, ''));
      let kind = 'note'; let title = '';
      const m = body[0] && body[0].match(/^\[!(\w+)\]\s*(.*)$/);
      if (m) { kind = m[1]; title = m[2]; body.shift(); }
      const labels = { rule: "Grandpa's rule (wisdom, not law)", warn: 'Warning', tip: 'Tip (opinion)', law: 'The rule', note: '', lean: 'My lean (opinion)', mistake: 'Common mistakes', field: 'Do this in the field', why: 'Why it matters' };
      const label = title || labels[kind] || '';
      html += `<aside class="callout ${kind}">${label ? `<div class="callout-t">${inline(label)}</div>` : ''}${blocks(body.join('\n'), ctx)}</aside>`;
      continue;
    }
    // tables
    if (line.startsWith('|')) {
      closeLists();
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const bodyRows = rows.slice(2).map(cells);
      html += `<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    // lists
    const li = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (li) {
      const depth = Math.floor(li[1].length / 2) + 1;
      const tag = /\d/.test(li[2]) ? 'ol' : 'ul';
      if (listStack.length < depth) {
        while (listStack.length < depth) { html += `<${tag}><li>`; listStack.push(tag); }
      } else {
        closeLists(depth);
        html += '</li><li>';
      }
      html += inline(li[3]);
      i++;
      continue;
    }
    closeLists();
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{3,4}\s|>|\||```|\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++]);
    html += `<p>${inline(para.join(' '))}</p>`;
  }
  closeLists();
  return html;
}

// drafts build (--drafts) shows placeholders for missing photos; the published build leaves them out
const DRAFTS = process.argv.includes('--drafts');

function fenced(kind, arg, body, ctx) {
  if (kind === 'quiz') {
    const qs = JSON.parse(body);
    ctx.quiz.push(...qs);
    return '';
  }
  if (kind === 'checklist') {
    const items = body.split('\n').filter((l) => l.trim()).map((l) => l.replace(/^\s*[-*]\s*/, ''));
    ctx.checklists.push(arg);
    return `<div class="checklist" data-list="${arg}">${items.map((t, n) =>
      `<label class="check"><input type="checkbox" data-key="${arg}:${n}"><span>${inline(t)}</span></label>`).join('')}</div>`;
  }
  if (kind === 'diagram') {
    const file = path.join(ROOT, 'diagrams', `${arg}.svg`);
    if (!fs.existsSync(file)) { ctx.missing.push(`${arg}.svg`); return '<p class="verify">Diagram missing</p>'; }
    return `<figure class="diagram">${fs.readFileSync(file, 'utf8')}</figure>`;
  }
  if (kind === 'photo') {
    // ```photo id [caption override]```  -> figure from data/photos/*.json manifest
    const [id, ...rest] = arg.split(/\s+/);
    const ph = PHOTOS[id];
    if (!ph || !fs.existsSync(path.join(ROOT, 'photos', `${id}.jpg`))) { ctx.missingPhotos.push(id); return DRAFTS ? `<p class="verify">Photo missing: ${esc(id)}</p>` : ''; }
    return photoFigure(ph, rest.join(' ') || body.trim() || ph.caption);
  }
  if (kind === 'gallery') {
    // ```gallery id id ...``` and/or one "id | caption" per line -> grid of credited photos
    const specs = [...arg.split(/\s+/).filter(Boolean).map((id) => ({ id })),
      ...body.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [id, ...c] = l.split('|'); return { id: id.trim(), caption: c.join('|').trim() }; })];
    const figs = specs.map(({ id, caption }) => {
      const ph = PHOTOS[id];
      if (!ph || !fs.existsSync(path.join(ROOT, 'photos', `${id}.jpg`))) { ctx.missingPhotos.push(id); return DRAFTS ? `<p class="verify">Photo missing: ${esc(id)}</p>` : ''; }
      return photoFigure(ph, caption || ph.caption);
    }).filter(Boolean);
    return figs.length ? `<div class="gallery">${figs.join('')}</div>` : '';
  }
  if (kind === 'regs') {
    // ```regs key  -> rendered from data/regs.json at runtime
    return `<div class="regs" data-regs="${arg}"></div>`;
  }
  return `<pre><code>${esc(body)}</code></pre>`;
}

// ---------- photos (public domain / Creative Commons, credited) ----------
function loadPhotos() {
  const dir = path.join(ROOT, 'data', 'photos');
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    for (const ph of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) {
      if (out[ph.id]) console.warn(`Duplicate photo id ${ph.id} in ${f}`);
      out[ph.id] = ph;
    }
  }
  return out;
}
const PHOTOS = loadPhotos();
function photoFigure(ph, caption) {
  const credit = `Photo: ${esc(ph.author || 'unknown')}, ${esc(ph.licence || 'licence VERIFY')}` +
    (ph.source ? `, <a href="${esc(ph.source)}" target="_blank" rel="noopener">source</a>` : '');
  return `<figure class="photo"><img src="__PHOTO__${ph.id}__" alt="${esc(caption)}" loading="lazy"><figcaption>${inline(caption)} <span class="credit">${credit}</span></figcaption></figure>`;
}

// ---------- auto split long screens (phone first: about 6 points a screen) ----------
const MAX_UNITS = 6, MAX_WORDS = 120;
function screenUnits(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const units = []; let i = 0;
  const words = (t) => t.replace(/[#>*`|\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
  const push = (ls, w, heading) => units.push({ md: ls.join('\n'), words: w, heading: !!heading });
  while (i < lines.length) {
    const l = lines[i];
    if (/^\s*$/.test(l)) { i++; continue; }
    const fence = l.match(/^```(\w+)?/);
    if (fence) {
      const ls = [lines[i++]]; while (i < lines.length && !lines[i].startsWith('```')) ls.push(lines[i++]); if (i < lines.length) ls.push(lines[i++]);
      const k = fence[1] || '';
      const w = k === 'quiz' ? 0 : k === 'diagram' ? 50 : k === 'photo' ? 40 : k === 'gallery' ? 90 : k === 'checklist' ? ls.length * 8 : k === 'regs' ? 60 : 40;
      push(ls, w); continue;
    }
    if (/^#{3,4}\s/.test(l)) { push([lines[i++]], 2, true); continue; }
    if (l.startsWith('>')) { const ls = []; while (i < lines.length && lines[i].startsWith('>')) ls.push(lines[i++]); push(ls, words(ls.join(' '))); continue; }
    if (l.startsWith('|')) { const ls = []; while (i < lines.length && lines[i].startsWith('|')) ls.push(lines[i++]); push(ls, words(ls.join(' ')) + 30); continue; }
    if (/^([-*]|\d+\.)\s/.test(l)) {
      const ls = [lines[i++]]; while (i < lines.length && /^\s+\S/.test(lines[i])) ls.push(lines[i++]);
      push(ls, words(ls.join(' '))); continue;
    }
    const ls = []; while (i < lines.length && lines[i].trim() && !/^(#{3,4}\s|>|\||```|([-*]|\d+\.)\s)/.test(lines[i])) ls.push(lines[i++]);
    if (!ls.length) ls.push(lines[i++]);
    push(ls, words(ls.join(' ')));
  }
  // a heading belongs with the unit that follows it
  for (let k = units.length - 2; k >= 0; k--) if (units[k].heading && !units[k + 1].heading) { units[k + 1] = { md: units[k].md + '\n' + units[k + 1].md, words: units[k].words + units[k + 1].words }; units.splice(k, 1); }
  return units;
}
function splitScreen(title, md) {
  const units = screenUnits(md);
  const chunks = [];
  let cur = null;
  for (const u of units) {
    if (!cur || cur.n >= MAX_UNITS || (cur.words + u.words > MAX_WORDS && cur.n > 0)) { cur = { md: [], n: 0, words: 0 }; chunks.push(cur); }
    cur.md.push(u.md); cur.n++; cur.words += u.words;
  }
  if (chunks.length > 1) { const last = chunks[chunks.length - 1]; if (last.words < 35 && last.n <= 2) { const prev = chunks[chunks.length - 2]; prev.md.push(...last.md); prev.n += last.n; prev.words += last.words; chunks.pop(); } }
  if (chunks.length <= 1) return [{ title, md }];
  return chunks.map((c, k) => ({ title: `${title} (${k + 1} of ${chunks.length})`, md: c.md.join('\n\n') }));
}

function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (m) for (const l of m[1].split('\n')) {
    const kv = l.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { meta, body: m ? src.slice(m[0].length) : src };
}

// ---------- sessions ----------
function loadSessions() {
  const dir = path.join(ROOT, 'content');
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md') && e.name !== 'glossary.md') files.push(p);
  });
  walk(dir);
  const sessions = files.map((f) => {
    const { meta, body } = frontMatter(fs.readFileSync(f, 'utf8'));
    const ctx = { id: meta.id, quiz: [], checklists: [], missing: [], missingPhotos: [] };
    const parts = body.split(/^## /m);
    const steps = [];
    const intro = parts.shift().trim();
    const addScreen = (title, md) => { for (const sc of splitScreen(title, md)) steps.push({ title: sc.title, html: blocks(sc.md, ctx) }); };
    if (intro) addScreen(meta.title, intro);
    for (const p of parts) {
      const nl = p.indexOf('\n');
      addScreen(p.slice(0, nl).trim(), p.slice(nl + 1));
    }
    const text = body.replace(/```[\s\S]*?```/g, '').replace(/[#>*`|[\]]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
    if (ctx.missingPhotos.length) console.warn(`Photos missing in ${meta.id}: ${ctx.missingPhotos.join(', ')}`);
    return { ...meta, phase: +meta.phase, num: +meta.num, minutes: +meta.minutes, steps, quiz: ctx.quiz, checklists: ctx.checklists, missing: ctx.missing, text };
  });
  sessions.sort((a, b) => a.phase - b.phase || a.num - b.num);
  // Review gate: drafts stay in content/ but only reviewed ids ship.
  const published = new Set(readJSON('data/published.json').sessions);
  const drafts = sessions.filter((s) => !published.has(s.id)).map((s) => s.id);
  if (drafts.length) console.log(`Drafts not published: ${drafts.join(', ')}`);
  const out = process.argv.includes('--drafts') ? sessions : sessions.filter((s) => published.has(s.id));
  for (const s of out) if (s.missing.length) throw new Error(`Missing diagram(s) in ${s.id}: ${s.missing.join(', ')}`);
  out.forEach((s) => delete s.missing);
  return out;
}

function loadGlossary() {
  const src = read('content/glossary.md');
  const out = {};
  for (const l of src.split('\n')) {
    const m = l.match(/^-\s+\*\*(.+?)\*\*\s*:\s*(.+)$/);
    if (m) out[m[1].trim()] = inline(m[2]);
  }
  return out;
}

// ---------- style lint (CLAUDE.md rules) ----------
function lint(sessions) {
  const problems = [];
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.md')) files.push(p);
  });
  walk(path.join(ROOT, 'content'));
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    let fence = null; // kind of the fenced block we are inside, if any
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, n) => {
      if (l.startsWith('```')) { fence = fence === null ? (l.slice(3).trim().split(/\s+/)[0] || 'code') : null; return; }
      if (fence && fence !== 'checklist' && fence !== 'gallery') return;
      if (fence === 'gallery') l = l.replace(/^\s*[\w-]+\s*\|?/, '');
      if (/^---$/.test(l) || /^\|[-| :]+\|$/.test(l)) return;
      const prose = l.replace(/\]\([^)]*\)/g, ']').replace(/https?:\/\/\S+/g, '').replace(/`[^`]*`/g, '').replace(/\{[^}]*\}/g, '').replace(/"[^"]*"/g, '');
      if (/—/.test(prose)) problems.push(`${rel}:${n + 1} em dash`);
      if (/[A-Za-z]-[A-Za-z]/.test(prose) && !/^\s*"/.test(l) && !/^(id|phase|num|minutes|title|checked):/.test(l)) problems.push(`${rel}:${n + 1} hyphen: ${prose.match(/\S*[A-Za-z]-[A-Za-z]\S*/)[0]}`);
    });
  }
  return problems;
}

// ---------- write output ----------
function build() {
  const sessions = loadSessions();
  const data = {
    built: new Date().toISOString().slice(0, 10),
    sessions,
    glossary: loadGlossary(),
    regs: readJSON('data/regs.json'),
    bases: readJSON('data/bases.json'),
    field: readJSON('data/field.json'),
    flashcards: [
      ...readJSON('data/flashcards.json').map((c) => {
        const f = c.diagram && path.join(ROOT, 'diagrams', `${c.diagram}.svg`);
        return { ...c, diagram: f && fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : undefined };
      }),
      ...Object.values(PHOTOS).filter((ph) => ph.card && fs.existsSync(path.join(ROOT, 'photos', `${ph.id}.jpg`))).map((ph) => ({
        id: 'photo-' + ph.id, deck: ph.cardDeck || 'Photo ID', front: ph.cardFront || 'What is this?', photo: photoFigure(ph, ''), back: ph.cardBack || ph.caption,
      })),
    ],
    photos: Object.values(PHOTOS).filter((ph) => fs.existsSync(path.join(ROOT, 'photos', `${ph.id}.jpg`))).map(({ id, species, caption, author, licence, source }) => ({ id, species, caption, author, licence, source })),
  };
  const problems = lint(sessions);
  if (problems.length) {
    console.warn(`Style lint: ${problems.length} issue(s)`);
    problems.forEach((p) => console.warn('  ' + p));
    if (process.argv.includes('--strict')) process.exit(1);
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const css = read('app/style.css');
  const js = read('app/app.js');
  const photoIds = Object.keys(PHOTOS).filter((id) => fs.existsSync(path.join(ROOT, 'photos', `${id}.jpg`)));
  const jsonPwa = JSON.stringify(data).replace(/__PHOTO__([\w-]+)__/g, 'photos/$1.jpg');
  const jsonSingle = JSON.stringify(data).replace(/__PHOTO__([\w-]+)__/g, (_, id) => {
    const sm = path.join(ROOT, 'photos', 'sm', `${id}.jpg`);
    const f = fs.existsSync(sm) ? sm : path.join(ROOT, 'photos', `${id}.jpg`);
    return 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
  });
  const json = jsonPwa;
  const version = 'hm-' + Buffer.from(json + css + js).length.toString(36) + '-' + data.built;
  let html = read('app/index.html');

  // PWA build
  fs.writeFileSync(path.join(OUT, 'index.html'), html
    .replace('<!--CSS-->', '<link rel="stylesheet" href="style.css">')
    .replace('<!--DATA-->', '<script src="content.js"></script>')
    .replace('<!--JS-->', '<script src="app.js"></script>')
    .replace('<!--SW-->', '<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");</script>'));
  fs.writeFileSync(path.join(OUT, 'style.css'), css);
  fs.writeFileSync(path.join(OUT, 'app.js'), js);
  fs.writeFileSync(path.join(OUT, 'content.js'), `window.HM=${json};`);
  fs.writeFileSync(path.join(OUT, 'sw.js'), read('app/sw.js').replace('__VERSION__', version).replace('__PHOTOS__', JSON.stringify(photoIds.map((id) => `photos/${id}.jpg`))));
  fs.mkdirSync(path.join(OUT, 'photos'), { recursive: true });
  for (const id of photoIds) fs.copyFileSync(path.join(ROOT, 'photos', `${id}.jpg`), path.join(OUT, 'photos', `${id}.jpg`));
  fs.copyFileSync(path.join(ROOT, 'app/manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));
  fs.cpSync(path.join(ROOT, 'app/icons'), path.join(OUT, 'icons'), { recursive: true });

  // Single file offline backup
  fs.writeFileSync(path.join(OUT, 'hunt-mentor-offline.html'), html
    .replace('<!--CSS-->', `<style>${css}</style>`)
    .replace('<!--DATA-->', `<script>window.HM=${jsonSingle.replace(/<\//g, '<\\/')};</script>`)
    .replace('<!--JS-->', `<script>${js.replace(/<\//g, '<\\/')}</script>`)
    .replace('<!--SW-->', '')
    .replace(/<link rel="manifest"[^>]*>/, '')
    .replace(/<link rel="apple-touch-icon"[^>]*>/, ''));

  // Artifact preview variant: no document skeleton (the host wraps it)
  const single = fs.readFileSync(path.join(OUT, 'hunt-mentor-offline.html'), 'utf8');
  const head = single.match(/<head>([\s\S]*?)<\/head>/)[1];
  const body = single.match(/<body>([\s\S]*?)<\/body>/)[1];
  fs.writeFileSync(path.join(OUT, 'preview.html'),
    head.match(/<title>.*?<\/title>/)[0] + '\n' + head.match(/<style>[\s\S]*?<\/style>/)[0] + '\n' + body);

  console.log(`Built ${sessions.length} sessions, ${sessions.reduce((n, s) => n + s.steps.length, 0)} screens, ${photoIds.length} photos, ${Object.keys(data.glossary).length} glossary terms -> ${OUT} (${version})`);
}

build();
