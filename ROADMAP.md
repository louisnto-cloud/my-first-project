# Sparkling Daily — App Growth Roadmap

Living backlog for the improvement loop. Each cycle: pick the top unchecked item,
implement it in the HTML app (and Excel where it makes sense), verify (Node syntax +
math tie-out), commit, push. Keep the app cohesive and simple — no bloat.

## Principles
- The HTML file `organika_sparkling_daily_model.html` is the primary "app".
- Every scenario/number must stay tied out with the Excel model.
- Plain tables, no charts (per user). Colour only for functional cues (inputs, losses).
- Verify before every commit.

## Done
- v3 base: Overview, P&L, Pricing Lab, Sensitivity, Assumptions views.
- 6 SKUs: Singles (12-ct) + 4-Pack across 3 flavours.
- Charts removed; plain tables.

## Backlog (top = next)
- [x] Monthly view (seasonality phasing) — parity with Excel.
- [x] Targets / goal-seek view (price/volume to hit a GP% or EBITDA).
- [x] Persistence: save/load/reset to localStorage + export CSV.
- [x] Add / remove SKU (flexible product list).
- [x] Editable company / product / fiscal year (scenario-name editing deferred).
- [x] Retail price ladder (retailer margin → shelf price) per SKU.
- [x] Unit economics detail (per-unit breakdown) + retail ladder.
- [x] Dark mode toggle.
- [x] Print / PDF-friendly layout + "Print" button.
- [x] Named what-if snapshots (save/load/delete).
- [x] In-app Guide + plain-English glossary.
- [x] Accessibility pass (aria labels, focus-visible states).
- [x] Configurable currency symbol.

## Log
- (start) Loop initiated; branch restarted from main after PR #8 merged.
- Cycle 1 shipped: Monthly, Targets, Persistence (save/load/reset/CSV),
  add/remove SKU, dark mode, print, editable brand/currency, unit economics
  + retail ladder, Guide/glossary, accessibility, named snapshots.
- Browser QA (headless Chromium): all 9 views render, zero console/page errors.
- All original backlog items complete. App is feature-complete & cohesive.
- Cycle 2: Excel parity — added Unit Economics & Retail Price tab (per-unit
  breakdown + shelf price at retailer margin); cover index updated. Ties to
  the HTML (shelf $1.9231/unit @35%); Checks ALL PASS.

## 4h loop — 80% improve / 20% expand (app + easy interface)
- [improve] Sensitivity grid highlights the "today" cell; Assumptions warns if a SKU is priced below cost.
- [improve] Losses now show in red across KPI cards, comparison and P&L for instant scanning.
- [improve] Responsive: every table scrolls horizontally on small screens; row hover.
- [improve] App remembers your last view + scenario across reloads.
- [improve] Reset now asks for confirmation (prevents accidental data loss).
