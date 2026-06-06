# Beverage Margin Studio

Model beverage **margin, markup and profit** across any combination of MSRP
(selling price), CP (landed cost) and volume — and understand exactly what is
driving the numbers.

Two interchangeable tools, same math:

| Tool | File | Best for |
|------|------|----------|
| **Interactive web studio** | [`index.html`](index.html) | Live, visual modeling — sliders, gauges, heatmaps, charts |
| **Excel workbook** | [`beverage-margin-model.xlsx`](beverage-margin-model.xlsx) | Offline spreadsheet work, sharing, your own formulas |

> **M&P = Margin & Markup.** Margin asks *"what share of the sale do I keep?"*
> Markup asks *"how much did I add on top of cost?"* They are linked but never
> equal — mixing them up is the most common pricing mistake, so the Studio
> always shows both.

---

## Quick start

**Web studio** — just open the file, nothing to install:

```
open index.html        # macOS
xdg-open index.html    # Linux
# or double-click it / drag it into any browser
```

Everything runs locally in your browser. Inputs are saved in *that browser only*
(nothing is uploaded). Use **Save** to persist, **PDF** to print a board-ready
snapshot, and the currency selector to switch symbols.

**Excel workbook** — open `beverage-margin-model.xlsx` in Excel, Google Sheets
or LibreOffice. Yellow cells are inputs; everything else is a live formula.

To regenerate the workbook from source:

```bash
pip install openpyxl
python3 build_workbook.py
```

---

## What's inside

### Web studio (`index.html`) — 6 tabs

1. **Calculator** — one product, live. MSRP / CP / volume in, and gross margin,
   markup, profit/unit, revenue, COGS, gross & net profit, break-even out.
   Includes a margin-health gauge, a revenue→profit waterfall, and a
   net-profit-vs-volume chart with the break-even point marked. Advanced inputs
   add fixed costs, units/case and a target-profit goal.
2. **Cost Builder** — assemble a *defensible* landed cost from base price +
   freight + duty/excise + packaging + deposit, with a spoilage allowance
   (`cost ÷ (1 − spoilage%)`). Send the result straight to the Calculator.
3. **Portfolio** — every SKU side by side in an editable table with per-line
   margin/markup/profit and a **profit-weighted blended margin**. Add/remove
   rows, export to CSV, and compare gross profit by product on a bar chart.
4. **Sensitivity** — a colour-coded heatmap of how margin, markup or profit
   react when MSRP and cost (or volume) move together, ±any range.
5. **Solver** — work backwards: price-to-a-target-margin/markup, max-cost-at-a-price,
   a margin↔markup converter with reference table, and break-even / profit-goal.
6. **Guide** — every formula and the beverage context, in plain language.

### Excel workbook — 6 sheets

`Calculator` · `Cost Builder` · `Portfolio` · `Sensitivity` (switchable
margin/markup heatmap) · `Reference` (margin↔markup converter + table) ·
`Guide`. Conditional formatting highlights margin health and powers the
heatmap; a chart summarises portfolio gross profit.

---

## The math

```
profit / unit     = MSRP − CP
gross margin %     = (MSRP − CP) ÷ MSRP        ← share of the sale you keep
markup %           = (MSRP − CP) ÷ CP          ← uplift on top of cost
revenue            = MSRP × volume
COGS               = CP × volume
gross profit       = revenue − COGS
net profit         = gross profit − fixed costs
break-even units   = fixed costs ÷ (MSRP − CP)
```

Margin and markup convert cleanly:

```
markup = margin ÷ (1 − margin)        margin = markup ÷ (1 + markup)
```

| Gross margin | Equivalent markup |
|---:|---:|
| 20% | 25% |
| 33% | 50% |
| 50% | 100% (keystone) |
| 60% | 150% |
| 75% | 300% |

### Beverage-specific notes

- **Landed cost ≠ supplier price.** Freight, duty/excise, packaging, deposits
  and breakage all sit between the invoice and the shelf — build the real CP in
  the Cost Builder.
- **Three-tier (esp. alcohol):** supplier → distributor → retailer each take a
  margin. Model each tier as its own Portfolio row, using the prior tier's price
  as the next tier's cost.
- **Case packs:** you buy in cases but sell in units — set *units/case* for
  case-level economics.

---

## Verification

The logic is tested, not assumed:

- The web app's math and interactions are checked headlessly with **jsdom**.
- All workbook formulas are evaluated with the **`formulas`** Excel engine and
  compared against independently-computed expected values (35/35 cells).

Figures are estimates — always validate against your own invoices, excise
schedules and tax rules.
