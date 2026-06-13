# Reusable prompt — Cases-Sold Revenue **& Profit** Model

Paste the block below into any capable AI (Claude, ChatGPT, Excel/Sheets
Copilot) to generate — or regenerate — a model that tells you **how many cases
you must sell to hit a revenue target, and what profit that leaves**, modelled
per sales channel. Fill in the `«...»` placeholders. A worked example is at the
bottom.

---

## ▶️ The prompt (copy everything in this block)

> Build me a **revenue & profit forecast model** that calculates how many
> **cases** of product I must sell to hit a gross-revenue target, and the profit
> that produces, broken out by sales channel. Deliver it as **«a self-contained
> HTML dashboard that recalculates in the browser» / «an Excel workbook with live
> formulas»** (pick one). Mark inputs clearly, format money/percentages, and keep
> everything driven by live formulas.
>
> **Inputs I can edit:**
> - Annual gross revenue target: **«$2,500,000»**
> - Units per case: **«12»** · Selling days/year: **«260»**
> - Annual fixed costs: **«$600,000»** · YoY growth: **«15%»** · Projection years: **«3»**
> - A channel table — each row has a **name, gross price/case, volume mix weight
>   (relative), COGS/case, trade-discount %, and selling % (cost-to-serve)**:
>   | Channel | Gross/case | Mix | COGS/case | Disc % | Sell % |
>   |---|---|---|---|---|---|
>   | «DTC» | «$300» | «20» | «$90» | «5%» | «18%» |
>   | «On-Premise» | «$216» | «15» | «$90» | «10%» | «5%» |
>   | «Off-Premise Retail» | «$180» | «30» | «$90» | «12%» | «4%» |
>   | «Wholesale / Distributor» | «$120» | «30» | «$90» | «0%» | «3%» |
>   | «Online Marketplace» | «$150» | «5» | «$90» | «8%» | «15%» |
>
> **Formulas (use exactly these):**
> - Net price/case = `gross × (1 − discount%)`
> - Contribution/case = `net × (1 − selling%) − COGS`
> - Blended price/case = `SUMPRODUCT(gross, mix) / SUM(mix)` (same shape for net & contribution)
> - **Total cases to hit target** = `target / blended gross price`
> - Per channel: mix% = `weight / SUM(weights)`; cases = `total cases × mix%`;
>   then gross/net/COGS/selling/contribution = cases × the per-case figure.
> - Operating profit = `total contribution − fixed costs`
> - **Break-even cases** = `fixed costs / blended contribution per case`
>
> **Views I want:**
> 1. **Headline KPIs** — cases needed, gross/net revenue, contribution & margin, operating profit & margin, break-even.
> 2. **Channel table** — net, contribution/case, margin, cases, gross $, contribution $ per channel.
> 3. **Profit cascade / waterfall** — Gross → Trade discounts → Net → COGS → Selling → Contribution → Fixed → Operating profit.
> 4. **Break-even** — cases & revenue, shown against the target.
> 5. **Scenarios** — Conservative / Base / Aggressive targets, side by side (cases, net, contribution, operating profit).
> 6. **Multi-year projection** at the growth rate (revenue, cases, contribution, profit).
> 7. **Monthly plan** with editable seasonality weights (cases, revenue, contribution, cumulative).
> 8. **Pure-play comparison** — cases to hit target if 100% sold through each single channel = `target / that price`.
> 9. **Profit grid** — operating profit across price × volume combinations (colour green=profit / red=loss).
> 10. **Two-way calculator** — cases↔revenue↔profit at a tested price.
> 11. **Goal-seek** — cases for a target operating profit = `(target profit + fixed) / blended contribution`; plus a capacity ceiling (max cases → resulting revenue & profit).
> 12. **Sensitivity / tornado** — operating-profit swing from ±10% on price, volume, COGS, fixed costs and discounts, ranked by impact.
>
> Gross revenue is before discounts/returns/taxes; contribution and operating
> profit layer in discounts, COGS, cost-to-serve and fixed costs.

---

## Worked example — "$2.5M next year"

With the sample inputs above the model returns: blended **$189.90/case** →
**≈ 13,165 cases**; net revenue **$2.32M**; contribution **$933k (40.1%)**;
operating profit **$333k (14.3%)** after $600k fixed; **break-even 8,469 cases**.

Cases to hit $2.5M if 100% sold through one channel: **20,833** (Wholesale $120)
→ **8,333** (DTC $300). Cheaper channels need far more cases for the same revenue.

Ready-made versions live in this repo: `revenue-forecast.html` (interactive) and
`revenue-forecast.xlsx` (Excel formulas). The math core is `engine.js`.
