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

## What the shipped placeholders actually say

Read this before quoting any number out of the model. With the placeholder
assumptions as shipped:

| Scenario | Net sales | GP% | EBITDA | **Net income** | |
|---|---|---|---|---|---|
| Low | \$610,397 | 43.4% | −\$114,181 | **−\$149,181** | loss |
| Base | \$927,920 | 46.8% | \$19,143 | **−\$15,857** | **loss** |
| High | \$1,206,296 | 46.8% | \$114,886 | **+\$58,317** | profit |
| Stretch | \$1,575,756 | 49.9% | \$298,070 | **+\$192,041** | profit |

**Base is loss-making.** EBITDA is \$19,143, but depreciation (\$25,000) and interest
(\$10,000) sit below it, so the bottom line is −\$15,857. Quoting "Base EBITDA \$19,143"
on its own overstates the case.

Two different break-evens, and the gap between them matters:

| Break-even on | Volume × | Cases | vs Base (50,000) |
|---|---|---|---|
| EBITDA = 0 | 0.94× | 47,001 | 2,999 **below** Base |
| **Net income = 0** | **1.05×** | **52,484** | **2,484 above Base** |

The EBITDA-only figure sits below Base volume, which makes Base look comfortably
profitable. It isn't. Bottom-line break-even needs ~5% more volume than Base. Both
figures are now labelled as such in the app (Sensitivity view) and the workbook
(Sensitivity tab), and the Overview/Dashboard state profit-or-loss outright.

At 2.1% EBITDA margin the Base case is knife-edge: a ~1% COGS miss or a small volume
miss flips it materially negative. Treat the assumptions, not the formulas, as the
thing to review.

## Verification

Every change is checked: the HTML JS engine and the Excel formulas are recalculated and
must agree (Base EBITDA \$19,143; Base net income −\$15,857; net-income break-even
52,484 cases; 3-Year Y2/Y1 = 1.2875 — all matching across both artifacts). The Excel
**Checks** tab reads **ALL PASS** (10/10). The app is browser-tested across all views ×
scenarios with zero console errors and adversarial edge cases (single SKU/scenario,
zero/negative/huge inputs).

## Rebuilding the Excel

```
pip install openpyxl
python3 build_model.py   # writes the .xlsx
```
