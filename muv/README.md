# MÜV RTD — Annual Sales Forecast (FY2027, Canada)

A flexible, fully formula-driven annual sales forecast for **MÜV**, a sparkling
electrolyte RTD beverage launching in Canada in 2027. The model forecasts gross
revenue and volume week-by-week across the fiscal year (starts **1 Sep 2027**,
ends end of August) and tracks progress against a **$3,000,000** gross-revenue goal.

## Deliverables

| File | What it is |
|------|------------|
| **`MUV_RTD_Forecast_v1.xlsx`** | The calculation engine. Editable assumption tables + live formulas (openpyxl). Tabs: Settings, Assumptions, Calc, Summary, **Scenarios**, Charts, ReadMe. Nothing is hard-coded — every result traces back to an input cell. |
| **`MUV_RTD_Forecast_Dashboard_v1.html`** | A standalone, premium **dark-glass** dashboard — fully **self-contained** (Chart.js is inlined, so it works with no internet, behind any firewall). A signature glowing **goal gauge**, plain-language status, one-tap "close the gap" actions, Bear/Base/Bull scenario cards, an explore panel (revenue **or** volume, plus a sensitivity tornado), gradient/glow charts with glassy tooltips, and advanced sliders behind progressive disclosure. Mirrors the Excel math to the cent. |

Both are driven by **editable config**, so you add a SKU, channel, province, or
store tier by **adding a row** — not by rewriting logic.

**Dashboard, at a glance** — designed so anyone can read it in seconds, with the advanced model one tap away:
- A **goal ring** that fills toward $3M, with the gross number counting up and a plain-English status line.
- **Close the gap** card: tap *Raise price +1.3%*, *Sell 1.7% faster*, or *Grow online +6.3%* to land exactly on $3M.
- **Scenario cards** (Bear / Base / Bull) — tap to apply; the model recomputes live.
- **Explore the mix** by channel / province / flavour / SKU / month, switchable between **revenue and volume**, plus **"What moves it"** (a sensitivity tornado ranking the biggest levers).
- **Wholesale ⇄ Sell-through** toggle, 52/53-week toggle, and five driver sliders under *Advanced controls*.

**Workbook Scenarios tab** mirrors this for analysts: a live **Path to $3M** (the exact single move on each lever), a **Bear/Base/Bull** comparison (closed-form, equals the full engine to the cent), and a **doors × price sensitivity grid** that turns green wherever a combination meets $3M.

## Base case (illustrative seed inputs)

| Metric | Value |
|--------|------:|
| Annual gross (Wholesale basis) | **$2,960,558** |
| vs $3.0M goal | **98.7%** — gap of **$39,442** |
| Volume | 88,887 cases · 2,133,277 cans |
| Gross margin | 55.0% ($1,627,260) |

The raw seed anchors deliberately overshoot $3M (~$7.1M); a single **calibration
scalar** on door counts (set to **0.36**) brings the base case into the
$2.7–3.3M band, landing just under goal so the gap and levers stay meaningful.

### Top 3 levers to close the gap (each closes it alone)

1. **Price** — a **+1.3%** price index → $3.0M.
2. **Distribution** — **+1.7%** velocity uplift (or doors calibration 0.36 → **0.366**) → $3.0M.
3. **Online** — **+6.3%** online growth → $3.0M.

(Ramp speed ×1.12 or seasonality amplitude ×1.50 also close it.) Switching the
goal basis from **Wholesale** to **Sell-through** changes the math the most
(sell-through base ≈ $6.47M) — this toggle is exposed in both files.

## How the engine works

- **Grain:** one row per *week × channel × province* (53 × 70 = 3,710 rows).
- **Store tiers (A/B/C)** are editable inputs that roll up per channel via `SUMIF`
  (Σ doors × velocity) — exact totals, and adding a tier is just adding a row.
- **Flavours/SKUs** split by share with **blended COGS/price** (Total = cases ×
  Σ(share × cogs) is exact), so adding a flavour or SKU is adding a row.
- **Online** is modelled by units/week (12-pack), every other channel by
  doors × velocity (4-pack), all behind the same generic logic.
- Core: `ramped_doors → brand_cases (× seasonality) → SKU split → revenue / COGS / margin`.

## Verification

The three implementations agree **to the cent** at the base case:

- Python reference (`build/muv_config.py`) — source of truth.
- Excel live formulas — independently recomputed with `pycel` (`build/verify.py` core; `build/verify2.py` covers the Scenarios tab, Path-to-$3M, sensitivity grid, by-tier and volume).
- Dashboard JS — recomputed in Node against the reference, and the UI exercised headlessly in jsdom (ring, scenarios, gap-chips, basis toggle, explore) with zero JS errors.

QA invariants checked: province splits = 100% per channel, flavour shares = 100%,
ramp = 0 before launch and exactly 1.0 at full, no negative/pre-launch volume,
consistent cans/cases/units (1 case = 24 cans), and Excel totals == HTML totals.

## Regenerate

```bash
pip install openpyxl
python3 build/build_excel.py      # writes MUV_RTD_Forecast_v1.xlsx
python3 build/build_html.py       # writes MUV_RTD_Forecast_Dashboard_v1.html
# optional independent check of the Excel formulas:
pip install pycel && python3 build/verify.py
```

## Extending the model

Edit `build/muv_config.py` (the single source of truth) and rebuild, **or** edit
the workbook's yellow input cells directly. See the **ReadMe** tab in the workbook
for exactly where to add a flavour, SKU, channel, province, or tier.
