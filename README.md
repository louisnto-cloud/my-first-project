# Organika Sparkling Daily — Forecast & Scenario Model

A one-year operating and scenario model (with a 3-year projection) for the
**Organika Sparkling Daily** line, delivered as two artifacts that produce
**identical numbers**.

| File | What it is |
|---|---|
| [`organika_sparkling_daily_model.html`](./organika_sparkling_daily_model.html) | Self-contained web app — open in any browser, no install, works offline |
| [`Organika_Sparkling_Daily_1YR_Scenario_Model.xlsx`](./Organika_Sparkling_Daily_1YR_Scenario_Model.xlsx) | Excel workbook, 17 tabs |
| [`build_model.py`](./build_model.py) | Generator for the Excel workbook |

See [`MODEL.md`](./MODEL.md) for the full model spec and
[`ROADMAP.md`](./ROADMAP.md) for the build log.

> All figures ship as **illustrative placeholders**. Enter your real numbers on
> the Assumptions tab (or paste them via **Import SKUs** / Export CSV
> round-trip) and every view updates.

## Open it

**The web app** — just double-click `organika_sparkling_daily_model.html`. No
install, no server, no internet required. Edits auto-save to your browser.

**The Excel model** — open the `.xlsx` in Excel, Google Sheets, or LibreOffice.
Pick a scenario on the Dashboard; the Checks tab validates the whole workbook.

## How the numbers work (per SKU)

```
Gross Revenue = Cases × CP (wholesale list price)
Net Sales     = Gross Revenue − Trade Discounts (% of gross)
Gross Profit  = Net Sales − Cost of Sales (COGS direct + indirect)
Contribution  = Gross Profit − A&P
EBITDA        = Σ Contribution − Operating Expenses (fixed + logistics)
Net Income    = EBITDA − D&A − Interest − Tax   (tax floored at 0)
```

Scenarios flex three levers against base: **Volume ×**, **Price ×**, and
**Trade-discount Δ**. An optional **price-elasticity** setting makes volume
respond to price. The 3-Year view compounds annual volume, price, and
cost-inflation rates.

## Views in the web app

Overview (KPIs, scenario comparison, portfolio mix) · Summary (print/PDF
one-pager, copy-as-text) · P&L · Monthly (seasonality, break-even month) ·
3-Year (growth projection, CAGR) · Pricing Lab (best wholesale price) · Unit
Economics (per-unit, retail price ladder) · Targets (goal-seek) · Sensitivity
(price×volume, cost×volume) · Assumptions · Guide + glossary.

Custom scenarios (add/rename/remove/duplicate) · bulk % changes · snapshot
save/compare · CSV import/export · dark mode · keyboard shortcuts (1–9
scenarios, ←/→ views) · accessible (ARIA + focus) · never renders NaN.

## Excel tabs (17)

`Home` · `Assumptions` · `Dashboard` · `Base` · `Low` · `High` · `Stretch` ·
`Monthly` · `3-Year` · `Pricing Lab` · `Unit Economics` · `Targets` ·
`Sensitivity` · `Checks` · `Guide` · `Review Log` · `Cover`

## Rebuild the Excel

```bash
pip install openpyxl
python3 build_model.py      # writes the .xlsx
```

## Verification

The HTML engine and the Excel formulas are recalculated and must agree. Current
tie-out, with shipped placeholder assumptions:

| Check | Value |
|---|---|
| Excel `Checks` tab | **ALL PASS** (10/10) |
| Base Net Sales | $927,920 |
| Base GP% | 46.8% |
| Base EBITDA | $19,143 |
| 3-Year Net Sales Y2/Y1 | 1.2875 |

## Also in this repo

[`pilgrimage/`](./pilgrimage) is an unrelated, self-contained project (a
bilingual Catholic companion app) that deploys to `/pilgrimage`. It shares no
code with the forecast model.
