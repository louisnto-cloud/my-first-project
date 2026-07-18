# Organika Sparkling Daily — Operating Model

A one-year (with 3-year projection) operating & scenario model for the Sparkling Daily
line, delivered as two matching artifacts that produce **identical numbers**:

| File | What it is |
|------|-----------|
| `organika_sparkling_daily_model.html` | Self-contained web app — open in any browser, no install, works offline |
| `Organika_Sparkling_Daily_1YR_Scenario_Model.xlsx` | Excel workbook (17 tabs) |
| `build_model.py` | Generator for the Excel workbook |

All figures are **illustrative placeholders** until you enter real numbers on the
Assumptions tab (or paste them via **Import SKUs** / Export CSV round-trip).

## The web app (primary)

Open the HTML file and drive everything from the top: pick a **scenario**, and every
view updates. **Assumptions** is the only place you type; edits **auto-save** to your
browser.

**Views:** Overview (KPIs + scenario comparison + portfolio mix) · Summary (print/PDF
one-pager + copy-as-text) · P&L · Monthly (seasonality + break-even month) · 3-Year
(growth projection + CAGR) · Pricing Lab (best wholesale price) · Unit Economics (per-unit
+ retail price ladder) · Targets (goal-seek) · Sensitivity (price×volume and cost×volume) ·
Assumptions · Guide + glossary.

**Highlights:** custom scenarios (add/rename/remove/duplicate) · bulk % changes ·
snapshot save/compare · CSV import/export · dark mode · keyboard shortcuts (1–9 scenarios,
←/→ views) · accessible (ARIA + focus) · non-finite-safe (never shows NaN).

## The model (how the numbers work, per SKU)

```
Gross Revenue = Cases × CP (wholesale list price)
Net Sales     = Gross Revenue − Trade Discounts (% of gross)
Gross Profit  = Net Sales − Cost of Sales (COGS direct + indirect)
Contribution  = Gross Profit − A&P
EBITDA        = Σ Contribution − Operating Expenses (fixed + logistics)
Net Income    = EBITDA − D&A − Interest − Tax   (tax floored at 0)
```

Scenarios flex three levers vs base: **Volume ×, Price ×, Trade-discount Δ**. An optional
**price-elasticity** setting makes volume respond to price. The 3-Year view compounds
annual volume/price/cost-inflation rates.

## Verification

Every change is checked: the HTML JS engine and the Excel formulas are recalculated and
must agree (e.g. Base EBITDA \$19,143; 3-Year Y2/Y1 = 1.2875). The Excel **Checks** tab
reads **ALL PASS**. The app is browser-tested across all views × scenarios with zero
console errors and adversarial edge cases (single SKU/scenario, zero/negative/huge inputs).

## Rebuilding the Excel

```
pip install openpyxl
python3 build_model.py   # writes the .xlsx
```
