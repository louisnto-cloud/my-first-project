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
