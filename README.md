# my-first-project

## Revenue & Profit Forecast — Cases-Sold Planner

Work out **how many cases you must sell to hit a revenue target** — and, just as
importantly, **what profit that leaves** once discounts, COGS, cost-to-serve and
fixed costs are taken out. Pricing and economics are modelled **per sales
channel**, because the same case earns very differently through DTC vs. retail
vs. a distributor.

**Simple enough to use in five seconds; deep enough for a CFO.** Open the page,
type your goal, and it tells you how many cases to sell. Everything advanced —
channels, profit, scenarios, sensitivity — is one tap away under **Detailed**.

| File | What it is |
|---|---|
| `revenue-forecast.html` | Self-contained interactive **planner** — opens in any browser, no install. **Simple** view: type a goal → see the cases. **Detailed** view reveals channels, profit breakdown, scenarios, the year, sensitivity and goal-seek. Light/dark, count-up animation, saves locally, CSV export, print to PDF. |
| `revenue-forecast.xlsx` | The same model as a real Excel workbook with **live formulas** (recalculates on open). Sheets: Model · Scenarios · Projection · Profit Grid · Monthly Plan · Channel View. |
| `engine.js` | The pure calculation core (no UI). Single source of truth, headless-tested. |
| `build_html.py` / `build_xlsx.py` | Regenerate the HTML (inlines `engine.js`) and the workbook. |
| `PROMPT.md` | A reusable prompt to regenerate or extend the whole model in any AI tool. |

### What it calculates

- **Cases needed** to hit a gross-revenue target — overall and per channel.
- **The full profit cascade:** Gross → Trade discounts → **Net** → COGS → Cost-to-serve → **Contribution** → Fixed costs → **Operating profit**, with margins.
- **Break-even** volume and revenue.
- **Scenarios** (Conservative / Base / Aggressive) side by side.
- **Multi-year projection** at your growth rate.
- **Monthly plan** with editable seasonality.
- **Profit grid** — operating profit across price × volume combinations.
- **Goal-seek** — cases needed for a target *operating profit*, plus a capacity ceiling.
- **Sensitivity (tornado)** — which lever (price, volume, COGS, fixed, discounts) moves profit most.

### The core relationships

> **Cases needed = revenue target ÷ price per case.**
> **Contribution per case = net price − COGS − cost-to-serve.**

**Worked example — "$2.5M next year"** (sample channel mix, $90 COGS/case, $600k fixed costs):

| | |
|---|---|
| Blended price / case | **$189.90** |
| **Cases to hit $2.5M** | **≈ 13,165** |
| Net revenue (after discounts) | $2.32M |
| Contribution | **$933k** (40.1% of net) |
| Operating profit (after $600k fixed) | **$333k** (14.3%) |
| Break-even | **8,469 cases** / $1.61M |

And the price/channel sensitivity behind the headline — cases to hit $2.5M if **100%** sold through one channel:

| Channel | Price/case | Cases |
|---|---:|---:|
| Wholesale | $120 | **20,833** |
| Online | $150 | 16,667 |
| Retail | $180 | 13,889 |
| On-Premise | $216 | 11,574 |
| DTC | $300 | **8,333** |

*Everything is illustrative — swap in your real channels, prices, mix and costs. Planning aid only; gross revenue is before discounts/returns/taxes.*
