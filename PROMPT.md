# Reusable prompt — Cases-Sold Revenue Forecast Model

Paste the prompt below into any AI assistant (Claude, ChatGPT, Excel Copilot,
Google Sheets Gemini) to generate — or regenerate — a revenue model that tells
you **how many cases you must sell to hit a revenue target**, and how that
number changes by **price** and **sales channel**.

Fill in the `«...»` placeholders. A worked example (the "$2.5M next year"
scenario) is filled in at the bottom.

---

## ▶️ The prompt (copy everything in this block)

> Build me a **revenue forecast model** that calculates how many **cases** of
> product I need to sell to hit a gross-revenue target, broken out by sales
> channel. Deliver it as **«an Excel workbook with live formulas» / «a single
> self-contained HTML file that recalculates in the browser»** (pick one).
>
> **Inputs I should be able to edit:**
> - Annual gross revenue target: **«$2,500,000»**
> - Units per case (e.g. bottles): **«12»**
> - Selling days per year: **«260»**
> - A table of sales channels, each with a **name**, a **price per case**, and a
>   **volume mix weight** (relative weights, auto-normalised — they need not sum
>   to 100):
>   | Channel | Price / case | Volume mix |
>   |---|---|---|
>   | «Direct-to-Consumer» | «$300» | «20» |
>   | «On-Premise / Food Service» | «$216» | «15» |
>   | «Off-Premise Retail» | «$180» | «30» |
>   | «Wholesale / Distributor» | «$120» | «30» |
>   | «Online Marketplace» | «$150» | «5» |
>
> **Calculations (use these exact formulas):**
> - Blended price/case = `SUMPRODUCT(prices, mix) / SUM(mix)`
> - **Total cases needed** = `target / blended price`
> - Per channel: mix% = `weight / SUM(weights)`; cases = `total cases × mix%`;
>   revenue = `cases × price`. (Revenue should sum to the target.)
> - Cases per month / week / selling-day = total cases ÷ 12 / 52 / selling-days.
> - Implied price per unit = blended price ÷ units per case.
>
> **Views I want:**
> 1. **Headline KPIs** — total cases needed, blended price/case, cases per
>    month/week/day.
> 2. **Channel mix table** — cases, revenue and % of revenue per channel.
> 3. **Pure-play comparison** — "if 100% of volume went through one channel,
>    cases to hit target" = `target / that channel's price`, for every channel.
> 4. **Revenue-at-volume grid** — rows = channels, columns = case volumes
>    (5k, 10k, 15k, 20k, 25k, 30k), each cell = `volume × channel price`.
> 5. **Price sensitivity** — a ladder of prices → cases needed (`target / price`).
> 6. **Monthly plan** — spread the annual total across 12 months with an editable
>    seasonality weight per month; show cases, revenue and running cumulative.
>
> Clearly mark which cells are **inputs** vs **computed**, format money and
> percentages nicely, and keep every output driven by live formulas so changing
> an input updates everything. Gross revenue only (before discounts, returns,
> COGS).

---

## Worked example — "$2.5M next year"

With the example channel prices/mix above, the model returns:

| | |
|---|---|
| Blended price / case | **$189.90** |
| **Total cases to hit $2.5M** | **≈ 13,165 cases** |
| Cases / month | ≈ 1,097 |
| Cases / week | ≈ 253 |

**The price/channel answer to "how many cases?"** — it depends entirely on price:

| If 100% sold through… | Price/case | Cases to hit $2.5M |
|---|---:|---:|
| Wholesale / Distributor | $120 | **20,833** |
| Online Marketplace | $150 | 16,667 |
| Off-Premise Retail | $180 | 13,889 |
| On-Premise | $216 | 11,574 |
| Direct-to-Consumer | $300 | **8,333** |

> Rule of thumb: **cases needed = revenue target ÷ price per case.** Sell through
> cheaper channels and you need far more cases for the same $2.5M; richer
> channels (DTC) get you there on a fraction of the volume.

See `revenue-forecast.xlsx` (live Excel formulas) and `revenue-forecast.html`
(interactive, opens in any browser) in this repo for ready-made versions.
