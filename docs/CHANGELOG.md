# Changelog — MÜV dossier improvement loop

Reverse-chronological. Each entry = one committed iteration.

## Iteration 1 — 2026-07-11 ~06:55Z
- Added loop infrastructure: `build_all.sh` (one-command pipeline), `validate_workbook.py`
  (integrity + stale-content guard), `docs/BACKLOG.md`, `docs/CHANGELOG.md`.
- Added **Scenario Comparison** tab: all three scenarios (Conservative/Base/Aggressive) shown
  side-by-side with computed per-can economics, 3-yr net revenue, EBITDA and break-even — so the
  reader sees the full envelope, not just the active scenario.
- Workbook: 34 → 35 tabs.

## Iteration 2–3 — 2026-07-18 (continuous loop start)
- [I2] Added **🏠 Start Here** navigator front-door: grouped clickable cards (See the answer /
  Explore the numbers / Know the competition / Canada launch / Trust the data). Set as the tab the
  workbook opens on — the easy interface for the whole dossier.
- [I3] Added a **🏠 Home** link (top-right) to every tab; kept the ↩ Contents link. Full two-way nav.
- Workbook: 35 → 36 tabs. Validator green.

## Iteration 4 — 2026-07-18 ~08:47Z (batch I5/I6/I8)
- [I5] Financial Model usability: input/formula LEGEND, cell comments on the scenario selector +
  price/COGS inputs, and sheet protection that LOCKS formula cells while keeping the yellow inputs
  (and the scenario dropdown) fully editable. Prevents accidental model breakage.
- [I6] Sources: first source in each cell is now a clickable link (22 links on the 24 Sources tab).
- [I8] MÜV Peer Set: added a sodium-vs-price positioning scatter (LMNT/Liquid I.V./Nuun/Organika
  sachets); MÜV plots once on-can sodium is confirmed.

## Iteration 5 — 2026-07-18 ~08:52Z (batch I4/I7/I9)
- [I4] Print polish: print_area set to used range on every sheet; header freeze-panes on the big
  table tabs (Landscape, Peer Set, Outcomes, SWOT, Risk, Sources).
- [I9] Added **Executive Brief 1-page** (portrait, fit-to-1-page): verdict, what MÜV is, category,
  price/sodium ladder, 5 moves, top risks, regulatory — placed right after Start Here.
- [I7] Strengthened validate_workbook.py with consistency assertions: Start Here + Exec Brief present,
  and a Home link on every content tab (fails the build otherwise).
- Workbook: 36 → 37 tabs.

## Iteration 6 — 2026-07-18 ~08:57Z (batch I10/I11/I12)
- [I10] Added README.md: how to open/navigate/use/rebuild the workbook + pipeline structure + guardrails.
- [I11] Scenario Comparison: added a break-even-units-by-scenario bar chart.
- [I12] Glossary: appended a 'Regulatory & format terms' section (RTD, NHP, NPN, Supplemented Food,
  SFFt, SFCI, ORS, food–NHP interface, Fibersol, Bill 96).

## Iteration 7 — 2026-07-18 ~09:01Z (batch I13/I15 + backlog refill)
- [I13] Risk Register: added a likelihood×impact heatmap (3×3, red/amber/green) with risk numbers.
- [I15] Added Assumptions Audit tab: every Financial Model input across all 3 scenarios with a
  source/confidence tag; explicit "illustrative, not a forecast" note.
- Refilled backlog with I16–I20 (confidence scoreboard, number-format pass, contrast check, per-tab
  subtitles, cover refresh).
- Workbook: 37 → 38 tabs.

## Iteration 8 — 2026-07-18 ~09:06Z (batch I16/I20)
- [I16] Added Data Confidence Scoreboard: auto-tallies ✅/◐/⚠ tags across every tab, with a chart —
  shows at a glance how much rests on hard evidence vs estimates.
- [I20] Cover refresh: updated date, decision line (MÜV = sparkling electrolyte RTD can), and status
  (points to Start Here + Executive Brief + interactive tabs).
- Workbook: 38 → 39 tabs.

## Iteration 9 — 2026-07-18 ~09:11Z (batch I18/I19)
- [I18] Added a contrast/accessibility checker to validate_workbook.py (WCAG-style luminance ratio);
  flags any solid-fill cell whose text drops below 2.0 contrast. Current build: 0 low-contrast cells.
- [I19] Added a "How to navigate" legend to the Contents tab (click-to-jump, Start Here, Home links,
  gold=interactive, confidence tags) — the interface now self-explains.
