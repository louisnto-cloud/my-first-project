# Beverage P&L & Margin Toolkit

Two layers of beverage decision tooling, each shipped as **both** an
interactive web app and a fully formula-driven Excel workbook:

1. **Organika CPG P&L Model** — an enterprise gross-sales-to-EBITDA model with a
   bill-of-materials COGS build-up, channel-level economics, a profit-lever
   tornado, a price×COGS sensitivity heatmap and Base/Bull/Bear scenarios.
2. **Beverage Margin Studio** — a fast margin / markup / profit calculator for
   per-unit pricing decisions.

| Tool | Web app | Excel | Use it for |
|------|---------|-------|------------|
| **Organika CPG P&L** | [`organika-pnl.html`](organika-pnl.html) | [`organika-cpg-pnl.xlsx`](organika-cpg-pnl.xlsx) | Full P&L, channel mix, COGS levers, scenarios |
| **Margin Studio** | [`index.html`](index.html) | [`beverage-margin-model.xlsx`](beverage-margin-model.xlsx) | Quick margin/markup, break-even, target pricing |

Everything runs locally — open the HTML files in any browser, no install, no
network, inputs saved only in your browser. Regenerate the workbooks with the
Python builders (`pip install openpyxl`).

---

## 1 · Organika MÜV Sparkling Electrolytes — CPG P&L Model

A real consumer-packaged-goods P&L is a waterfall: start from gross sales and
subtract progressively — trade, COGS, channel costs, corporate overhead — to
reach EBITDA. This model makes every subtraction a live, editable lever, grounded
in realistic premium functional-beverage economics (355 ml can, zero-sugar,
stevia; magnesium bisglycinate + Fibersol prebiotic fiber).

**Web app (`organika-pnl.html`) — 8 tabs**

0. **Overview (simple mode)** — the Apple-style front door anyone can use: a
   plain-English verdict ("you keep 64.9% of every sale, but the business loses
   13.1%…"), one big status number, three friendly dials (price, cost, volume)
   that preview live, a "where every $1 goes" bar, and coaching cards — *your
   biggest lever* and *concrete break-even routes*. Tap **Make this my plan** to
   commit the dials; everything else stays one tap away under "Explore the full
   model." Same engine underneath — simple on top, advanced beneath.
1. **P&L Statement** — blended gross-sales-to-EBIT statement with Total / per-case
   / %-of-net columns, benchmark-graded KPIs, and a 16-step P&L bridge waterfall.
2. **COGS / BOM** — editable bill of materials (ingredients, primary/secondary/
   tertiary packaging, co-pack conversion, freight, yield loss) rolling up to
   landed cost per can, with a cost-composition chart and target-price preview.
3. **Channels** — DTC / Amazon / Retail-Distributor / Club economics side by side,
   each with its own price realization and cost stack, rolling up to a blended
   company P&L. Add or remove channels.
4. **Levers** — a **tornado** ranking every driver by its EBITDA impact, plus a
   two-way **price × COGS** heatmap. This is where you see what actually moves the
   bottom line.
5. **Compare (Scenario Lab)** — lay unlimited full plans **side by side in one
   window**. Each column has its own price / cost / volume / trade / marketing and
   recomputes live; the best number in every row lights up green, with an EBITDA
   race chart underneath. Add, duplicate, rename and remove scenarios freely
   (seeded with Base / Bull / Bear).
6. **Unit Economics** — per-case statement, break-even volume with a path-to-profit
   bar, and retail velocity ($/store/week).
7. **Guide** — the waterfall, why contribution margin is the number to watch, and a
   CPG glossary.

Multi-currency display, save/CSV/PDF, live recompute on every keystroke.

**Excel workbook (`organika-cpg-pnl.xlsx`) — 6 sheets**

`P&L` · `COGS_BOM` · `Channels` (the engine; per-channel formula columns that
total into the P&L) · `Sensitivity` (live price×COGS EBITDA% heatmap with a
colour scale) · `Scenarios` (Base/Bull/Bear via editable multipliers) · `Guide`.
Yellow cells are inputs; everything else is a formula.

### The CPG waterfall

```
Gross Sales − Trade & promo − Returns                       = NET SALES
NET SALES − COGS                                            = GROSS PROFIT  (GM %)
GROSS PROFIT − fulfillment − platform fees − channel ad − slotting
                                                            = CONTRIBUTION   (CM %)
CONTRIBUTION − brand marketing − sales − G&A − R&D          = EBITDA         (EBITDA %)
EBITDA − D&A                                                = EBIT
```

**Why contribution margin, not gross margin.** Gross margin flatters DTC and
Amazon because their shelf prices are high — but those channels bleed it back
through referral fees, fulfillment and customer acquisition. Contribution margin
is what each channel actually leaves to cover overhead. Manage the mix on
contribution.

### Default scenario at a glance

| | Base | Bull | Bear |
|---|---:|---:|---:|
| Annual cases | 250,000 | 350,000 | 187,500 |
| Net sales | $4.96M | $7.44M | $3.54M |
| Gross margin | 64.9% | 70.5% | 59.3% |
| Contribution | 27.8% | 36.5% | 18.9% |
| EBITDA | −$648K (−13.1%) | **+$490K (+6.6%)** | −$1.25M (−35.2%) |
| Break-even | 415,070 cases | 269,102 | 795,422 |

The Base case is a classic emerging-CPG shape: strong gross margin, but channel
selling costs plus fixed overhead exceed contribution — so the levers (COGS,
price, mix, and volume against fixed cost) are where profitability is won.

---

## 2 · Beverage Margin Studio

A fast per-unit pricing tool. **M&P = Margin & Markup** shown side by side
(margin = share of the sale kept; markup = uplift on cost).

**Web app (`index.html`)** — Calculator (gauge + revenue→profit waterfall),
Cost Builder (landed cost), Portfolio (multi-SKU blended margin), Sensitivity
heatmap, Solver (price-to-target, max-cost, converter, break-even), Guide.

**Excel (`beverage-margin-model.xlsx`)** — the same model with live formulas,
conditional-format heatmaps and a portfolio chart.

```
gross margin % = (price − cost) ÷ price      markup % = (price − cost) ÷ cost
markup = margin ÷ (1 − margin)               margin = markup ÷ (1 + markup)
```

---

## Verification

The logic is tested, not assumed:

- **Web apps** — math, rendering and interactions are checked headlessly with
  **jsdom** (the P&L model alone has 30 assertions covering COGS, the channel
  roll-up, EBITDA, break-even and scenario apply/restore), and every tab is
  rendered and screenshot-reviewed with headless Chromium.
- **Workbooks** — every formula is evaluated with the **`formulas`** Excel engine
  and compared against independently-computed expected values; the P&L workbook
  and web app reconcile to the dollar (net sales $4,961,478; COGS $0.58125/can;
  EBITDA −$648,238; break-even 415,070 cases).

> Defaults model Organika MÜV Sparkling Electrolytes as a representative premium
> functional beverage. They are editable estimates — replace with your invoices,
> co-pack quotes, retailer terms and excise/HST rules. Figures are not Organika
> financials.
