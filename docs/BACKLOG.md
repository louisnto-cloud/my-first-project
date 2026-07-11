# Improvement-loop backlog — MÜV dossier "app"

Prioritized queue for the autonomous improvement loop. Each iteration: pick the top unblocked item,
implement, validate (`./build_all.sh`), commit, log in CHANGELOG.md. Quality over volume — reconcile
and refine before adding net-new bulk.

## Loop control
- Deadline: **2026-07-11T11:47:49Z** (user revised: stop at 4:30 local == prior 4:00 + 30m)
- Cadence: one iteration per wake (~20–30 min apart)
- Stop when: deadline reached OR backlog exhausted OR user interrupts

## Queue
- [x] I1 — Loop infra: build_all.sh, validate_workbook.py, CHANGELOG, BACKLOG
- [x] I1 — Scenario Comparison tab (all 3 scenarios side-by-side, computed)
- [ ] I2 — Peer-set positioning chart (sodium vs price scatter) on MÜV Peer Set
- [ ] I3 — Hyperlink all source URLs on the Sources tab (clickable)
- [ ] I4 — Financial Model: break-even chart + tornado/one-way sensitivity on price & COGS
- [ ] I5 — "Executive Brief" one-page printable summary tab
- [ ] I6 — Data Dictionary / Assumptions expansion + inline cell comments on model inputs
- [ ] I7 — Consistency QA sweep: reconcile older tabs' MÜV-as-can framing; fix any stale refs
- [ ] I8 — README.md documenting the pipeline + how to rebuild/validate
- [ ] I9 — KPI Dashboard: add target-vs-benchmark mini bar charts
- [ ] I10 — Deep-dive expansion: add 2–3 more Canadian functional-beverage brand profiles (verified)
- [ ] I11 — Export deck to PDF/PPTX (Gamma) and link in workbook
- [ ] I12 — Risk register: add a likelihood×impact scatter/heatmap visual
- [ ] I13 — Sensitivity: 2-way data-table style grid for units × price → EBITDA
- [ ] I14 — Glossary expansion (regulatory terms: SFFt, SFCI, ORS, NPN, NHP interface)
- [ ] I15 — Final QA + polish pass; changelog summary; PR description refresh

## Notes
- MÜV = RTD sparkling CAN (SKU 4338, ~$14.99), food-regulated. Do NOT reintroduce "powder" framing.
- Canada: sport-electrolytes → Supplemented Foods by 2027-12-31. Collagen beauty claims = NHP-only.
- Keep every added figure confidence-tagged; flag estimates.
