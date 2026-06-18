# Costco UK — D93 Portfolio ROI Model
## STEP-BY-STEP GUIDE (v9 enterprise)

**You're holding:** `Costco_UK_D93_Portfolio_ROI_v9.xlsx` — an 8-tab Excel model.

**Time to get sorted:** ~30 minutes if you follow this guide top-to-bottom.
**What you'll need:** the file, a browser (Chrome is fine), and access to claude.ai (or ChatGPT).

> **One rule:** Only **YELLOW** cells are editable. Everything else recalculates itself. If you see a grey cell, leave it alone.

---

## PART 1 — Open the file (pick ONE of the three options)

### Option A — Excel desktop (best experience)
1. Double-click `Costco_UK_D93_Portfolio_ROI_v9.xlsx`.
2. If Excel asks "Enable editing," click **Enable Editing** (yellow bar at top).
3. Skip to Part 2.

### Option B — Excel online (works in Chrome, no download)
1. Open Chrome. Go to **onedrive.live.com** and sign in.
2. Click **Upload → Files**, pick `Costco_UK_D93_Portfolio_ROI_v9.xlsx`, wait for the green tick.
3. Click the file name once. It opens in Excel Online inside the browser tab.
4. **Important:** Excel Online supports the dropdown and all formulas. Charts may take 3-5 seconds to render. The bar chart on Summary and the line chart on Cumulative are the slowest.

### Option C — Google Sheets (free, works in Chrome)
1. Open Chrome. Go to **sheets.google.com**.
2. Click the folder icon (top right) → **Upload** → pick the .xlsx file.
3. Once it opens, click **File → Save as Google Sheets**. This converts it.
4. **Heads up — Google Sheets quirks:**
   - The `INDEX(... > 0, 0)` formula on Cumulative break-even may show `#N/A`. Replace the cell with `=MATCH(TRUE, ARRAYFORMULA(F7:AE7>0), 0)` (works in Google Sheets).
   - Currency dropdowns work. FX VLOOKUPs work.
   - Charts: re-add manually via **Insert → Chart** if they don't carry over.

---

## PART 2 — The 5-minute health check

Before you touch a number, do this sanity pass.

1. Click the **Start Here** tab. Read the "Key Assumptions" and "Model Limitations" sections. Make sure nothing makes you sweat. If something does — fix it in step 4 below.
2. Click the **Inputs** tab. Scroll through and check these specific yellow cells:
   - **C21 — Test Start Date.** Default is `12-Jan-2026`. Change if your actual launch is different.
   - **C22 — Warehouses.** Default 20. Change if Costco has confirmed a different number.
   - **C25 — Selling Price.** Default £15.99. This is your MSRP at Costco UK.
   - **C26 — Cost Price.** Default £7.29. This is your landed cost (cost to Costco at depot, in GBP).
   - **C31 — Base Units / Week.** Default 276 (~13.8 units/wh/week × 20 wh). If you have a better number from a prior test, paste it in.
3. Look at **C28 (Gross Margin %)**. If it's coloured **amber** (yellow-orange), GM% is below 30% and you have a margin problem. Either raise C25 or lower C26.
4. Scroll to **rows 40-43**. The probability weights for BEST / IDEAL / WORST. Defaults are 30% / 50% / 20% (must sum to 100%). **C43** shows the sum — if it's amber, the weights don't add to 100% and you need to fix them.

---

## PART 3 — Fill in the other six SKUs

This is the bit you actually have to do work on. Go to the **Portfolio** tab.

Bee Propolis (row 7) is pre-filled. Rows 8 through 13 are empty for the other six SKUs:
- Mag 8-in-1 90's/120's
- O1 450g
- Belli Bliss Raspberry, 450g
- Daily Boost
- Berberine 90's/120's
- L-theanine Capsules 90's/120's

For each row you need to fill in **four numbers** (yellow cells):
- **D** = Selling Price (GBP)
- **E** = Cost Price (GBP, landed)
- **G** = Y1 Units forecast
- **I** = Y1 Promo Spend (GBP)

Plus optionally:
- **K** = Growth rate (default 10%)
- **P** = Rationale text

### 3a. The fast way — open Claude in another Chrome tab and paste this prompt

Open **claude.ai** in a new tab. Paste this prompt **as-is**:

```
I'm pitching seven SKUs to Costco UK (D93 division). I need to fill in
pricing and forecast data for these six SKUs:

1. Mag 8-in-1 90's/120's (magnesium supplement)
2. O1 450g (omega-3 supplement)
3. Belli Bliss Raspberry, 450g (collagen / gut-health drink mix)
4. Daily Boost (multivitamin)
5. Berberine 90's/120's
6. L-theanine Capsules 90's/120's

For each one, give me a realistic estimate for Costco UK in GBP of:
- SP   (Selling price / MSRP in GBP, per pack)
- Cost (Landed cost to Costco UK in GBP, per pack)
- Y1 Units (Forecast units sold across 20 Costco UK warehouses in Year 1)
- Y1 Promo Spend (in GBP — typical Costco demo + end-cap + TPD budget)

Costco UK supplement benchmarks:
- Demo: ~£199 / warehouse / weekend
- End cap: ~£850 / warehouse / 2-week placement
- TPD: 20% off MSRP (≈ 25% off net to brand)
- Typical supplement GM% at Costco: 45-60%
- A successful supplement SKU at 20-warehouse test: 12k-25k Y1 units

Return as a table I can paste directly into Excel — exactly six rows,
columns: SP | Cost | Y1 Units | Y1 Promo. Numbers only, no currency
symbols. One row per SKU in the order listed above.
```

Claude will give you a table. Paste each number into the matching yellow cell on the Portfolio tab.

### 3b. The manual way — fill them in yourself

If you've got pricing in Asana already, just type the four numbers into D, E, G, I for each row.

### 3c. After you've filled in the six SKUs
- Look at column **O (3-Yr ROI)**. Cells should now show numbers.
- Green = ROI ≥ 50% (good). Red = ROI < 0% (bad — fix the inputs).
- Look at the bottom row (row 14, "PORTFOLIO TOTAL / BLENDED"). The blended GM% in column F is your pitch headline. If it's above 50%, you have a strong pitch. Below 40% means you need a higher-margin SKU in the mix.

---

## PART 4 — Review the scenarios

Click **Forecast**. You see three blocks (BEST, IDEAL, WORST), each a 26-week P&L.

- Just scan **Total** column (column AF). For each scenario, look at:
  - **Revenue total**
  - **Promo Spend total**
  - **Net Profit total**

If Net Profit is positive in IDEAL but negative in WORST, that's a normal-shape model. If Net Profit is negative in IDEAL too, something is off — go back to Inputs and check Base Units / Week (C31) or Selling Price (C25).

Click **Cumulative**. The break-even table near the top shows you the first week each scenario goes cash-positive. Look at the line chart below it. If WORST goes deeply negative late, that's the markdown clearance weeks (18-20) eating the gross profit.

Click **Sensitivity**. This grid shows IDEAL Net Profit if BOTH the demo-week lift multiplier AND the demo cost moved. The centre cell (lift 3.6x, cost £7,403) is your base case. Green to the upper-left = upside; red to the lower-right = downside. If a moderate move (e.g., lift 3.0x instead of 3.6x) puts you in the red zone, the plan is fragile — flag it.

Click **Summary**. The four columns are BEST, IDEAL, WORST, and **E[Value]** (expected value, weighted by your probability weights). Read the E[Value] column — that's the single number to put on the pitch slide.

---

## PART 5 — The Pitch Memo

Click **Pitch Memo**. This is the exec 1-pager. **Every number on it is live** — it pulls from Summary and Portfolio. Read it top to bottom. If a line says something weird ("Net Profit £-X"), the underlying number is wrong and you need to go back.

To copy the whole memo for a pitch deck:
1. Click cell **B2** on Pitch Memo.
2. Press **Ctrl+Shift+End** (Cmd+Shift+End on Mac) — selects everything.
3. **Ctrl+C** to copy.
4. Paste into PowerPoint / Google Slides / Word. The text comes through cleanly; formatting may need a tidy.

---

## PART 6 — Switch currency (USD / CAD / EUR / GBP)

If you need the pitch in USD:
1. On each tab (Forecast, Cumulative, Summary, Portfolio, Pitch Memo) find cell **C3**. It's a yellow dropdown.
2. Click it. Pick **USD**.
3. Every number on that tab converts. Column headers update too ("Revenue ($)" instead of "Revenue (£)").
4. **Important:** the dropdowns are per-tab. To make the whole workbook USD, switch C3 on each tab.

To update FX rates (they change daily — defaults are snapshot values):
1. Go to **Inputs** tab.
2. Cells **D13** (GBP, leave as 1.0), **D14** (USD), **D15** (CAD), **D16** (EUR).
3. Overtype with the current rate vs GBP. E.g., if 1 GBP = 1.28 USD today, put 1.28 in D14.
4. Every tab updates.

---

## PART 7 — Stress test (devil's advocate prompts)

Paste these into Claude one at a time to pressure-test your numbers before the pitch.

### Prompt A: Margin sanity check
```
I have a Costco UK pitch for a supplement SKU at:
  Selling price (MSRP): £15.99
  Landed cost:          £7.29
  Gross margin:         £8.70 / 54.4%

For UK supplements at Costco (D93), is 54% GM realistic?
What's the typical range for: bee propolis, magnesium, omega-3,
multivitamin, berberine, L-theanine in 90-120ct packs?

What would buyers push back on? Be blunt.
```

### Prompt B: Demand sanity check
```
For a new SKU at Costco UK across 20 warehouses, no promo:
- 276 units / week total ≈ 13.8 units / warehouse / week.

Is this a realistic base run-rate for a supplement at Costco UK?
Cite any public benchmarks. What's a realistic demo-week lift (3x, 4x, 5x)?

What's the most common reason a Costco supplement test fails?
```

### Prompt C: Worst-case pre-mortem
```
A Costco UK supplement test goes badly. List the top 8 ways it can fail
and the rough financial impact each (in % of forecast Net Profit).
Be specific: stocking issues, demo no-shows, end-cap conflict, member
demographics, competitor de-listing, etc.

For each, what's the early warning sign in the first 4 weeks of a
26-week test?
```

### Prompt D: Pitch attack
```
I'm pitching this portfolio to a Costco UK buyer:
  Blended Y1 Revenue: £[X]
  Blended Y1 Net:     £[Y]
  Blended GM%:        [Z]%

You're the buyer. Give me your top 5 hardest questions. For each,
write the answer you'd accept and the answer that would tank the pitch.
```

Replace [X], [Y], [Z] with your blended Portfolio totals (row 14 columns H, J, F in your chosen currency).

---

## PART 8 — Share / present

### Share the file
- Excel Online: click **Share** (top right) → enter emails → set "Can edit" or "Can view".
- Google Sheets: same — top-right blue **Share** button.
- Desktop: attach .xlsx to email.

### Make a one-slide pitch
Use this prompt (paste into Claude or ChatGPT):

```
Here is my Costco UK D93 portfolio pitch in numbers:

Bee Propolis (lead SKU, 26-week market test):
  E[Net Profit]:  [paste Summary cell F<net_row>]
  IDEAL Net:      [paste Summary cell D<net_row>]
  IDEAL GM%:      [paste Summary cell D<gp_pct_row>]
  IDEAL ROI:      [paste Summary cell D<roi_row>]

Portfolio (3-year blended):
  3-Yr Net:       [paste Portfolio cell N14]
  Blended ROI:    [paste Portfolio cell O14]
  Blended GM%:    [paste Portfolio cell F14]

Write me a single PowerPoint slide for a Costco UK buyer pitch. Format:
  - Headline (1 line)
  - Three bullets of proof
  - One ask (the GO/NO-GO sentence)
  - Closing line

Keep total under 60 words. Use buyer language, not finance language.
```

---

## PART 9 — When something looks wrong

| Symptom | Probable cause | Fix |
|---|---|---|
| All Forecast cells are `#REF!` | Inputs tab got rearranged | Don't insert/delete rows on Inputs — use undo (Ctrl+Z) |
| Summary E[Value] column is blank | Probability weights don't sum to 100% | Inputs C43 is amber. Adjust C40-C42. |
| Cumulative chart is empty | Excel Online sometimes lazy-loads | Wait 5 seconds, refresh the tab |
| Sensitivity grid all the same number | You set Lift = 0 on the Inputs grid | Restore lifts to 1.0 (base) / 3.0 (demo) / 3.6 (combo) |
| Currency dropdown won't change | Cell C3 is referenced but not set | Pick a value from the dropdown — don't type free text |
| Portfolio ROI is `#DIV/0!` | Y1 Promo (column I) is blank or 0 | Fill in a positive promo number |
| Margin shows in amber | GM% below 30% | Either raise SP (C25) or lower Cost (C26) on Inputs |
| Status says "Loss-making" on Cumulative | Cumulative Net Profit stays below 0 | Open Sensitivity tab — your inputs are in the red zone |

---

## PART 10 — Make the model 10x better tomorrow

Things to add next sprint (not in v9, but the wiring would support them):
- **Hedge cost** in the FX table — adds 1-2% to non-GBP rates.
- **Quarterly seasonality** — multiply Base Units by 1.3 in Q4, 0.8 in Q3.
- **Per-SKU scenario plans** instead of one shared scenario plan.
- **Monte Carlo tab** — distributions over lift, cost, and demand; histogram of Net.
- **Inventory carry cost** — added to Promo Spend.
- **Listing fee / slotting fee** — explicit line on Inputs.
- **Charts on Portfolio** — bar of 3-Yr Net per SKU.

If you want any of these, paste this into Claude:

```
Open the file `Costco_UK_D93_Portfolio_ROI_v9.xlsx` and add a
[NAME OF FEATURE] feature. Keep the same colour palette (navy
title bars, blue section headers, yellow inputs, light-blue
KPIs, Calibri 11pt). Yellow = editable, grey = calculated.
Show me a screenshot of the result before saving.
```

---

**Owner:** [Your name]
**Model version:** v9 (enterprise)
**Last build:** see Start Here → CHANGE LOG
**Questions?** Paste this guide + the file into Claude and ask.
