# MÜV Canada Launch — Competitive Intelligence Dossier

An analyst-grade Excel dossier + reproducible build pipeline supporting Organika's decision to launch
**MÜV Sparkling Electrolytes** (a ready-to-drink sparkling electrolyte **can**, SKU 4338) in Canada.

**Deliverable:** `Organika_Sparkling_Competitor_Intelligence_ENTERPRISE.xlsx` (37+ tabs)

## Open it
Open the workbook and start on the **🏠 Start Here** tab (it opens there by default). Click a card to
jump to any section. Every tab has a **🏠 Home** link (top-right) and the **01 Contents** index is fully
clickable.

Fastest paths:
- **The answer in one page:** `Executive Brief 1-page`
- **The recommendation:** `20 GTM Recommendation` · `Go-NoGo Decision`
- **The numbers (interactive, gold tabs):** `Dashboard` · `Financial Model` · `Scenario Comparison`
- **The competition:** `MÜV Peer Set` (direct rivals) vs `07 Comparison Matrix` (category context)
- **Canada launch:** `Canada Regulatory v2` · `Electrolyte BFY Deep-Dive`
- **Trust the data:** `Verification Log` · `24 Sources`

## Interactive tabs
- **Financial Model** — pick a scenario (Conservative/Base/Aggressive) from the dropdown; the P&L →
  EBITDA, break-even and price×COGS sensitivity recompute. Yellow cells are editable; formulas are
  locked (sheet protection) so the model can't break by accident.
- **Scenario Comparison** — all three scenarios side-by-side + chart.
- **Go-NoGo Decision** — weighted scorecard with an auto-verdict.

## Rebuild it
```bash
./build_all.sh
```
This self-heals dependencies (reinstalls `openpyxl` if the environment recycled), runs the base build
plus every `enhance*_workbook.py` stage in order, and validates the result.

Validate only:
```bash
python3 validate_workbook.py   # exits non-zero on any integrity/consistency failure
```

## Pipeline structure
- `build_enterprise_workbook.py` — base workbook (core tabs).
- `enhance_workbook.py` … `enhanceN_workbook.py` — ordered enhancement stages (dashboard, financial
  model, Canada regulatory, peer set, navigation, executive brief, …). Auto-discovered by `build_all.sh`.
- `validate_workbook.py` — integrity + consistency gates, incl. a **stale-content guard** that fails the
  build if MÜV is ever described as a "powder".
- `docs/BACKLOG.md`, `docs/CHANGELOG.md` — improvement-loop plan and history.

## Verified facts / guardrails (do not regress)
- **MÜV = RTD sparkling CAN** (SKU 4338, ~$14.99), **food-regulated** in Canada — not a powder.
- Canada is reclassifying sport-electrolyte products **NHP → Supplemented Foods by 2027-12-31**.
- **Collagen beauty/structure-function claims are NHP-only** — keep them off the food-regulated can.
- Every figure is confidence-tagged (✅ hard / ◐ directional / ⚠ flag); estimates are never dressed up
  as facts. MÜV on-can sodium is TBD — confirm with the brand.

## Companion
Executive slide deck (Gamma): https://gamma.app/docs/ixff92wlc094yul
