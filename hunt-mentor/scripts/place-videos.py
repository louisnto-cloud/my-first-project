#!/usr/bin/env python3
"""Insert ```video blocks from research/*-video-placements.md under their ## headings (end of section). Idempotent."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
plan = (root / 'research/2026-10-04-video-placements.md').read_text()
items, cur = {}, None
for l in plan.splitlines():
    m = re.match(r'^## (content/\S+\.md)', l)
    if m: cur = m.group(1); continue
    m = re.match(r'^- `([\w-]+)` under `## (.+?)`: (.+)$', l)
    if m and cur: items.setdefault(cur, []).append((m.group(2).strip(), m.group(3).strip()))
miss = []
for f, rows in items.items():
    p = root / f; s = p.read_text(); lines = s.split('\n')
    bysec = {}
    for head, line in rows:
        if line.split('|')[0].strip() in s: continue
        bysec.setdefault(head, []).append(line)
    for head, ls in bysec.items():
        idx = next((i for i, l in enumerate(lines) if l.strip() == '## ' + head), None)
        if idx is None:
            miss.append(f'{f}: {head}'); continue
        j = idx + 1; fence = False
        while j < len(lines):
            if lines[j].startswith('```'): fence = not fence
            if not fence and lines[j].startswith('## '): break
            j += 1
        while j > idx + 1 and not lines[j - 1].strip(): j -= 1
        lines[j:j] = ['', '```video', *ls, '```']
    p.write_text('\n'.join(lines))
print('missing headings:', *miss, sep='\n  ')
