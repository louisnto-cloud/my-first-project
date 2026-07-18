# Organika Sparkling Daily — Improvement Loop

**Target app:** `organika_sparkling_daily_model.html` (single-file interactive model;
`build_model.py` generates only the Excel and is not the app).
**Mandate:** ~80% improvement / ~20% expansion. Keep it **one app, easy interface.**
**Loop window:** started 2026-07-11T07:34Z → deadline **2026-07-11T11:34Z**.
**Branch:** `claude/organika-sparkling-loop` → PR **#34** (base `main`). The originally
designated `claude/sharp-bardeen-tl7s8t` was contested/force-pushed, so the user
approved moving the loop here. Push here each cycle.
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

- **Iter 2 (expand+improve):** SVG charts — P&L **waterfall** (Net Sales→…→Net
  Income, colour-coded costs/subtotals/result) and **EBITDA-by-scenario** bars
  (current highlighted). Theme-aware via CSS-var fills, hover tooltips, mobile
  horizontal-scroll, mark specs (rounded ends, connectors, recessive axes). The
  existing tables serve as the accessible data fallback. 11 headless checks pass.

- **Iter 3 (improve):** KPI cards show delta-vs-Base (coloured ▲/▼ in $/pp/cases)
  + per-case context. **Iter 4 (expand):** new **Monthly** tab — editable
  seasonality curve, EBITDA-by-month chart (fixed costs land evenly → shows the
  underwater months), reconciling table. Monthly EBITDA ties to annual exactly.

- **Iter 5 (expand):** Targets/goal-seek tab — bisection-solves the volume to hit
  a target EBITDA/Net Income (refactor compute→computeLever). **Iter 6 (improve):**
  motion polish (KPI entrance, hover lift, view transitions) + full keyboard tab nav
  (Arrow/Home/End, roving tabindex, aria). **Iter 7 (expand):** shareable links —
  whole model encodes into the URL hash, "Share" copies it, loads reproduce exactly.

- **Iter 8–13:** Pricing Lab heat + ★ best-price marker (8); executive insight
  headline + favicon/meta (9); Assumptions UX — help chips, descriptions, min
  clamping keeping valid negatives (10); Contribution-by-SKU flavour chart (11);
  **EBITDA tornado** — biggest-lever ranking, base reconciles (12); **break-even
  curve** with scenarios plotted (13). All verified headless.

Current app: 7 tabs (Overview, P&L, Pricing Lab, Sensitivity, Monthly, Targets,
Assumptions); 6 chart types; dark mode; persistence; shareable links; CSV/print;
keyboard nav. Now on **v3.13**.

## Backlog (priority order)
### Improvement (80%)
1. Scenario compare/delta view; number-format polish; contrast QA; per-unit toggles.
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
