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
- [ ] Add / remove SKU (flexible product list).
- [ ] Editable company name, fiscal year, scenario names.
- [ ] Retail price ladder (retailer margin → shelf price) per SKU.
- [ ] Unit economics detail (per-can / per-unit breakdown).
- [ ] Dark mode toggle.
- [ ] Print / PDF-friendly layout + "Print" button.
- [ ] Named what-if snapshots (compare saved states).
- [ ] Inline help tooltips + glossary panel.
- [ ] Accessibility pass (aria labels, focus states, contrast).
- [ ] Number/locale formatting options (currency symbol).

## Log
- (start) Loop initiated; branch restarted from main after PR #8 merged.
