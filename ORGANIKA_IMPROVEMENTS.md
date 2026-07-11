# Organika Sparkling Daily — Improvement Loop

**Target app:** `organika_sparkling_daily_model.html` (single-file interactive model;
`build_model.py` generates only the Excel and is not the app).
**Mandate:** ~80% improvement / ~20% expansion. Keep it **one app, easy interface.**
**Loop window:** started 2026-07-11T07:34Z → deadline **2026-07-11T11:34Z**.
**Each cycle:** make changes → verify (extract `<script>` → `node --check`; jsdom render
test in `/tmp/org-test.js`) → commit → push → update this file.

Verify recipe:
```
python3 -c "import re;open('/tmp/org.js','w').write('\n;\n'.join(re.findall(r'<script>(.*?)</script>',open('organika_sparkling_daily_model.html').read(),re.S)))"
node --check /tmp/org.js
cd /tmp && npm install jsdom >/dev/null 2>&1   # then run /tmp/org-test.js with url:"https://example.org/"
```

## Done
- **Iter 1 (improve):** dark mode (`prefers-color-scheme`), theme tokens, mobile
  horizontal-scroll for wide tables, responsive hero, localStorage persistence +
  Reset, CSV export, Print/PDF, tab a11y (`role=tablist/tab`, `aria-selected`),
  reduced-motion. **Fixed dead `heatColor()`** — Sensitivity is now a real heatmap
  with per-cell tooltips + legend. 18 headless checks pass.

## Backlog (priority order)
### Improvement (80%)
1. **Charts** (biggest beauty win) — use the dataviz skill palette (validate it):
   - P&L **waterfall** (Net → COGS → GP → A&P → Contribution → Opex → EBITDA → NI)
   - Scenario **comparison bar chart** (EBITDA / Net Income across Low/Base/High/Stretch)
   - Per-SKU **contribution bars** on P&L
   - Legend + hover tooltips + a data-table fallback (accessibility)
2. KPI polish — inline % bars / sparkline feel; per-unit metrics; delta vs Base.
3. Input validation + friendlier assumptions UX (grouping, units, help "?").
4. Micro-interactions / entrance; number formatting polish; dark-mode contrast pass.
5. Print layout: print all views, not just the current tab.

### Expansion (20%)
6. **Monthly view** — seasonality phasing + monthly revenue/EBITDA trend chart
   (parity with Excel "Monthly" sheet).
7. **Targets / goal-seek view** — solve volume/price to hit a target EBITDA or Net
   Income (parity with Excel "Targets" sheet).
8. Shareable URL (encode model state in the hash) + "Copy link".
9. Scenario delta view (compare any two scenarios side by side).

## Notes
- My branch `claude/sharp-bardeen-tl7s8t` is **not** in `deploy.yml` triggers, so
  pushes don't touch the live GitHub Pages site. Safe to iterate.
- Excel (`build_model.py`) is left as-is unless the underlying model changes; the
  loop is UI/UX-focused, so model numbers stay put and the Excel stays valid.
