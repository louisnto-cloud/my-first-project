# Organika RTD Forecast - Playbook (Enterprise v3)

**You don't need to know anything. Follow the steps. Copy-paste the templates.**

This playbook walks you through the FY26-27 weekly forecast workbook from "I just downloaded the file" to "the model is locked, stakeholders have signed off, and the production PO is sent to the co-man." Every email, every Slack DM, every prompt is pre-written. Just fill in the **`[BRACKETS]`** and send.

---

## Contents

1. [60-second orientation](#1-60-second-orientation)
2. [Open the file - Excel, Mac Numbers, or cloud Chrome / Google Sheets](#2-open-the-file)
3. [Tour of the 22 tabs](#3-tour-of-the-22-tabs)
4. [Your 30-day execution plan](#4-your-30-day-execution-plan)
5. [Copy-paste email templates for stakeholders](#5-copy-paste-email-templates)
6. [Copy-paste Slack messages](#6-copy-paste-slack-messages)
7. [Copy-paste LLM prompts to pressure-test the model](#7-copy-paste-llm-prompts)
8. [Forecast review meeting agenda (template)](#8-forecast-review-meeting-agenda)
9. [Final sign-off checklist](#9-final-sign-off-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. 60-second orientation

What you have:
- **One Excel file** with 22 tabs.
- Three input layers: **Doors**, **Velocity**, **Class Mix**.
- One engine: **Forecast Weekly**.
- Five output layers: **Production Plan**, **Revenue**, **Trade Spend**, **OPEX**, **P&L**.
- Three governance layers: **Assumption Register**, **Risk Register**, **Change Log**.
- One front page: **Exec Summary**.

Headline numbers at base scenario:
- Revenue: **$3.4M CAD**
- Gross profit: **$1.64M (48%)**
- Trade spend: **$584K** (heavy in Y1: listing + slotting)
- OPEX cash: **$1.5M**
- **EBITDA: -$445K** at base. Path to positive is in section 4 below.

Where to start: open the file, read **Exec Summary**, then come back here.

---

## 2. Open the file

### 2a. On your Mac / PC (Excel)

1. Double-click `Organika_RTD_Forecast_FY26_27_Weekly.xlsx`.
2. If Excel says "external links" - click **Enable**. If it says "macros" - there are none, click **Disable** safely.
3. Press `F9` to force a full recalculation (some cached values may have rounded during transit).

### 2b. On cloud Chrome / Google Sheets (no Excel needed)

1. Open Chrome and go to <https://drive.google.com>.
2. Sign in with your Organika Google account.
3. Click `+ New` (top-left, blue button) > **File upload**.
4. Select `Organika_RTD_Forecast_FY26_27_Weekly.xlsx`. Wait ~30 seconds.
5. Right-click the uploaded file > **Open with > Google Sheets**.
6. Once it opens, click **File > Save as Google Sheets** (top-left menu). This converts the file to a native Sheet that handles formulas faster.
7. **Important** for Google Sheets users: VLOOKUP and SUMIFS work natively but data validation dropdowns may need re-applying. The model still calculates correctly.

### 2c. On iPhone / iPad

Don't. The 52-week grid is unreadable on a phone. Use a laptop.

### 2d. Tip: pin the file

In Drive, click the file once, then press `S` to add a star. In Excel, right-click the file in the Recent menu and **Pin to list**.

---

## 3. Tour of the 22 tabs

Read top-to-bottom. The order in the workbook is the order you should read.

| Order | Tab | What it does | Edit? |
|---|---|---|---|
| 1 | **README** | What every colour and tag means. | No. |
| 2 | **Exec Summary** | The story in 30 numbers and 10 bullets. | No. |
| 3 | **Dashboard** | Monthly + quarterly roll-ups by SKU, channel, province. Chart. | No. |
| 4 | **P&L** | Revenue -> Trade -> Net -> COGS -> GP -> A&P -> SG&A -> EBITDA. | No. |
| 5 | **Scenarios** | Conservative / Base / Stretch side-by-side. | Edit B6:B8 only. |
| 6 | **KPIs** | 10 metrics: GP%, GP/case, new-channel mix, etc. | No. |
| 7 | **Assumptions** | The toggles. **Edit B4-B6 (units/case, buffer, multiplier).** | YES. |
| 8 | **Class Mix** | % A/B/C doors per channel. Rows must sum to 100% (green = OK). | YES, blue cells. |
| 9 | **Velocity** | Units per door per week, by SKU x channel x class. | YES, blue cells. |
| 10 | **Doors** | Active doors. **12 monthly inputs (cream) drive 52 weekly outputs.** | YES, monthly inputs only. |
| 11 | **Pricing** | Net case price + landed cost per SKU. | YES, blue cells. |
| 12 | **Trade Spend** | Listing, slotting, scan/promo by channel. | YES, blue cells. |
| 13 | **OPEX** | Reps, brokers, A&P, freight, G&A. | YES, blue cells. |
| 14 | **Marketing and Sampling** | Account sampling, events, rep samples, buffer. | YES, blue cells. |
| 15 | **Forecast Weekly** | The engine. 360 rows of formulas. | NEVER. |
| 16 | **Production Plan** | Weekly cases to produce, with buffer. | No. |
| 17 | **Revenue** | Weekly revenue and gross profit by SKU. | No. |
| 18 | **Assumption Register** | Every assumption + owner + confidence. | YES, sign-off column. |
| 19 | **Risk Register** | Top 12 risks with mitigation. Score = likelihood x impact. | YES, status column. |
| 20 | **Change Log** | Version history + sign-offs. | YES, sign-off column. |
| 21 | **Glossary** | Data dictionary. | No. |
| 22 | **Validation Lists** | Dropdown source data. | No, unless adding channel/SKU. |

---

## 4. Your 30-day execution plan

### Week 1: validate the foundation

| Day | Owner | Action |
|---|---|---|
| Mon | You (Louis) | Open file, read Exec Summary + Dashboard. |
| Mon | You | Review Assumption Register. Flag any "Low" confidence assumption you can validate by Friday. |
| Tue | You + Aaron | 30-min scenario sign-off. Lock the multiplier. **Use email template 5a below.** |
| Wed | You + Rijo | 30-min pricing & landed cost review. **Use email template 5b.** |
| Thu | You + Teresa | 30-min marketing budget alignment. **Use email template 5c.** |
| Fri | You + Elliot | 30-min OPEX review. **Use email template 5d.** |

### Week 2: validate the new channels

This is the highest-risk part of the model. Five channels are placeholders.

| Day | Action |
|---|---|
| Mon | Pull velocity benchmarks for On-Premise from peer brands (use LLM prompt 7a). |
| Tue | Same for Convenience (LLM prompt 7b). |
| Wed | Same for Gym & Fitness (LLM prompt 7c). |
| Thu | Validate Private Liquor + RAS province coverage (LLM prompt 7d). |
| Fri | Update Velocity tab. Update Assumption Register confidence column. |

### Week 3: validate field reality

| Day | Action |
|---|---|
| Mon | Brokers: get pipeline by province by channel for next 90 days. |
| Tue | Field reps: confirm door plan for BC and ON (largest markets). |
| Wed | Update Doors monthly inputs to reflect broker pipeline. |
| Thu | Re-check Production Plan with Rijo. Confirm co-man can hit buffer. |
| Fri | Re-baseline P&L. Re-run Scenarios. |

### Week 4: lock and ship

| Day | Action |
|---|---|
| Mon | Final review meeting (use agenda 8 below). |
| Tue | Aaron signs off. Update Change Log v3.1 with sign-off date. |
| Wed | Email production PO to co-man (use template 5e). |
| Thu | Distribute the locked model to the team (template 5f). |
| Fri | Calendar a monthly model review (template 6e in Slack). |

---

## 5. Copy-paste email templates

> All templates: replace **`[BRACKETS]`** with your details before sending.

### 5a. Scenario sign-off email to Aaron (CEO)

```
Subject: 30 min this week - FY26-27 scenario sign-off

Aaron,

The FY26-27 weekly forecast is ready for your sign-off on the
scenario multiplier. Three options are computed side-by-side on
the Scenarios tab:

  Conservative (0.85x): $2.9M revenue, GP $1.4M, EBITDA -$604K
  Base         (1.00x): $3.4M revenue, GP $1.6M, EBITDA -$445K
  Stretch      (1.15x): $3.9M revenue, GP $1.9M, EBITDA -$286K

All three are negative on EBITDA because FY1 carries one-time
trade spend ($584K - listing + slotting at FDM, Costco,
Convenience) plus full OPEX scale ($1.5M).

Path to EBITDA positive by FY27-28:
  - Trade spend drops ~$300K (slotting amortised)
  - Revenue scales with year-2 door retention
  - Hold OPEX flat

Asks for the 30 min:
  1. Lock the multiplier. My recommendation: Base (1.00x).
  2. Approve the new-channel rollout plan (5 channels, ~24%
     of FY revenue mix).
  3. Confirm the FY27-28 path-to-positive narrative.

When suits you this week? I have a 30-min hold open Tue 10am or
Thu 2pm.

Louis
```

### 5b. Pricing & landed cost validation email to Rijo (Ops)

```
Subject: 30 min - Pricing & landed cost lock for FY26-27 forecast

Rijo,

I need to lock pricing and landed cost on the FY26-27 model.
Current placeholders on the Pricing tab:

  MUV (RL / Lime / PFP):  $28 net case price,  $14.50 landed cost
                          -> $13.50 GP per case, 48% GP%
  LCA Energy:             $32 net case price,  $16.00 landed cost
                          -> $16.00 GP per case, 50% GP%

Three things I need from you:
  1. Co-man pricing - is $14.50 / $16.00 still accurate after
     the September renegotiation?
  2. Freight in (to DC) - is that included in landed cost, or
     should I add a line?
  3. Production buffer - currently 10%. Industry norm 10-15%.
     Where do you want it for FY1?

These three changes flow to:
  - Gross profit (Revenue tab)
  - Total cases to produce (Production Plan)
  - The co-man PO going out in 4 weeks

Can we grab 30 min this week?

Louis
```

### 5c. Marketing budget alignment email to Teresa (VP Marketing)

```
Subject: Marketing & Sampling - 30 min to align on FY26-27 plan

Teresa,

The marketing & sampling section of the FY26-27 forecast pulls
into production demand and into the P&L:

  Account sampling rates (cases/door/week):
    Natural 0.025 | Specialty 0.020 | FDM 0.0125 | Costco 0.050
    On-Premise 0.040 | Convenience 0.005 | Gym & Fitness 0.050
    Private Liquor 0.010 | RAS 0.010

  Events plan: 13 events totaling ~404 cases (CHFA, Stampede,
    Toronto Vegfest, Costco roadshows, recurring sampling).

  Buffer (gifting / R&D / content / freight / unallocated):
    2.75 cases/week steady state.

  A&P cash budget (OPEX tab):
    Paid digital      $120K
    Influencer/content $90K
    Events/sampling   $180K
    PR/retainer        $60K
    Brand design       $30K
    Total              $480K

Three asks:
  1. Sign off on the sampling rates, or adjust.
  2. Lock the events list - any missing or to drop?
  3. Approve the $480K A&P cash envelope, or rebalance.

Tue or Wed work? 30 min on Meet.

Louis
```

### 5d. OPEX review email to Elliot (Finance)

```
Subject: OPEX FY26-27 - 30 min lock

Elliot,

OPEX cash for the FY26-27 model is $1,503K. Breakdown on the
OPEX tab:

  SG&A          $690K  (5 sales reps + lead + brokers + T&E)
  A&P           $480K  (paid digital, influencer, events, PR, design)
  Logistics     $230K  (freight to DC + 3PL warehousing)
  G&A           $103K  (insurance, software, contingency)

This drives a base-case EBITDA of -$445K on $3.4M revenue.

Three discussion points:
  1. Sales rep loaded cost ($72K each). Is that the right blend
     of base + commission + benefits?
  2. Broker commission at 3% of revenue. Standard, but want
     your read.
  3. Path to EBITDA positive in FY27-28 - want to walk through
     the bridge.

30 min this week? I'll send the file before our call.

Louis
```

### 5e. Production PO email to co-man (after lock)

```
Subject: Organika FY26-27 production PO - quarterly schedule

Hi [CO-MAN CONTACT],

Following our lock of the FY26-27 forecast, here's the quarterly
production demand for Organika RTD (24-can cases, 355ml):

  Q1 (Sep-Nov 2026):  ~13,000 cases
  Q2 (Dec-Feb 2027):  ~20,000 cases
  Q3 (Mar-May 2027):  ~38,000 cases  (Costco roadshow + FDM ramp)
  Q4 (Jun-Aug 2027):  ~67,000 cases  (peak summer + full national)

  Full FY production with 10% buffer:  ~137,600 cases

SKU mix:
  MUV Raspberry Lemon  ~33%
  MUV Lime             ~31%
  MUV PFP              ~35%
  LCA Energy            ~1%

I'll send the weekly schedule with 8-week visibility on a
rolling basis starting [DATE].

Can we book a 30 min call this week to confirm capacity and
lead times?

Louis
```

### 5f. Distribution email to the team (after Aaron's sign-off)

```
Subject: FY26-27 forecast - locked. v3.1 attached.

Team,

Aaron signed off on the FY26-27 forecast today. v3.1 is locked
and attached.

What changed from v3.0:
  - [CHANGE 1, e.g. "Convenience door plan reduced 15% per Aaron"]
  - [CHANGE 2]
  - [CHANGE 3]

Headline numbers at base (1.00x multiplier):
  Revenue           $[X]M
  Gross profit      $[Y]M ([Z]%)
  Sales cases       [N]
  Production buffer [N]
  Active doors W52  [N]

Cadence:
  - Weekly: Louis updates Doors monthly inputs as field
    reality lands.
  - Monthly: 30-min review with Aaron on the 1st of each month.
  - Quarterly: full reforecast and sign-off.

Risk register is current. Three reds to watch: co-man capacity,
LCA Energy GP, new-channel velocity.

Reach out with questions.

Louis
```

---

## 6. Copy-paste Slack messages

### 6a. To Aaron - quick scenario heads-up

```
Aaron - sending the FY26-27 forecast over now for your sign-off.
30 min any time this week? Three scenarios in the file, my rec is Base (1.00x).
Headline: $3.4M revenue, -$445K EBITDA at base, path to positive in FY27-28.
```

### 6b. To Rijo - landed cost ping

```
Rijo - need 30 min on the FY26-27 model. Landed cost still $14.50/MUV
and $16.00/LCA? Want to confirm before I lock and send the PO to co-man.
```

### 6c. To Teresa - marketing budget ping

```
Teresa - quick 30 on the FY26-27 marketing plan? Budget is $480K cash + ~400
sampling cases. Want your read before locking. Tue or Wed?
```

### 6d. To Elliot - OPEX ping

```
Elliot - OPEX for FY26-27 is $1.5M, driving base EBITDA -$445K.
Want a 30-min walkthrough with the bridge to FY27-28 positive?
```

### 6e. Monthly review calendar invite (Slack DM to team or your assistant)

```
Set a recurring 30-min meeting "FY26-27 Forecast Monthly Review"
on the 1st business day of each month, 10:00am PT.
Attendees: Louis, Aaron, Teresa, Rijo, Elliot.
Agenda template lives in the playbook (section 8).
```

---

## 7. Copy-paste LLM prompts to pressure-test the model

Paste these into Claude / ChatGPT / Gemini. They're designed to find weaknesses you'd miss.

### 7a. Pressure-test On-Premise velocity assumptions

```
I'm building a Canadian non-alcoholic functional beverage RTD
forecast. For the On-Premise channel (restaurants, bars, hotel
F&B, cafes), I'm assuming 6 / 4 / 2 cases per door per week for
Class A / B / C tier doors. Pack is 24 cans (355ml). Retail
price ~$5/can.

  1. Is this velocity realistic for a non-alcoholic functional
     RTD in Canadian on-premise? Cite peers if possible.
  2. What would change my assumption up or down 25%?
  3. What's the typical case-velocity range for Olipop / Poppi
     / Recess / Vita Coco in Canadian on-premise?
  4. What 3 questions should I ask a restaurant GM to validate
     this number for a real account?
```

### 7b. Pressure-test Convenience velocity assumptions

```
Convenience (Circle K / 7-Eleven / Couche-Tard) for a Canadian
non-alcoholic functional RTD. I'm assuming 8 / 5 / 3 cases per
door per week for Class A / B / C, plus $250 slotting per door
and 4% scan/promo allowance.

  1. Are those velocities right for a brand-new entrant with
     no consumer pull?
  2. Is $250/door slotting realistic, or too low for FY1?
  3. What's the typical scan/promo cost as % of revenue in
     Canadian convenience for emerging beverage brands?
  4. What's the biggest reason a convenience listing fails in
     year one?
```

### 7c. Pressure-test Gym & Fitness velocity assumptions

```
Gym & Fitness studios (yoga, boutique fitness, big-box gyms)
as a beverage channel for a Canadian functional RTD. I'm
assuming 10 / 7 / 4 cases/door/week, $0 slotting, $2K listing
fee per chain.

  1. Is gym & fitness a real sustainable channel for RTD or
     mostly sampling-only?
  2. What's the realistic shelf velocity at a gym front desk
     vs. a yoga studio smoothie bar?
  3. What's the typical commercial relationship (consignment,
     wholesale, free fills)?
  4. Which gym chains in Canada actually carry retail RTD?
```

### 7d. Pressure-test Private Liquor and RAS coverage

```
For a Canadian non-alcoholic functional RTD I'm planning to
distribute in Private Liquor (BC, AB, SK, MB) and Rural Agency
Stores / RAS (ON, NB, NS).

  1. Do private liquor stores in BC and AB sell non-alcoholic
     beverages? Material % of store sales?
  2. Are there regulatory barriers (LDB, AGLC) to listing a
     non-alc RTD in private liquor?
  3. RAS in Ontario - is a non-alc product allowed under the
     agency store agreement, or is it alcohol-only?
  4. Realistic FY1 door count target per province for these
     two channels?
```

### 7e. Stress-test the P&L

```
I have a Canadian beverage startup forecast: $3.4M revenue,
$1.64M GP (48%), trade spend $584K, OPEX $1.5M, EBITDA -$445K.

Acting as a CFO from a CPG investor perspective:

  1. Is -$445K EBITDA on $3.4M revenue a red flag or expected
     for a year-1 national launch?
  2. The trade spend is 17% of revenue in year 1. Will it
     compress to 10-12% in year 2 (industry norm)?
  3. OPEX is 44% of revenue. What's the realistic OPEX
     compression as revenue scales?
  4. What's the realistic path-to-positive-EBITDA timeline?
     Year 2 or year 3?
  5. What 3 levers should I model in a sensitivity table?
```

### 7f. Find what's missing in the model

```
Review this enterprise beverage forecast model structure and
tell me what's missing for a Series A diligence pack:

Tabs: Exec Summary, Dashboard, P&L, Scenarios, KPIs,
Assumptions, Class Mix, Velocity, Doors, Pricing, Trade Spend,
OPEX, Marketing and Sampling, Forecast Weekly, Production Plan,
Revenue, Assumption Register, Risk Register, Change Log,
Glossary, Validation Lists.

  1. What's missing for a Series A diligence pack? Be ruthless.
  2. What's missing for ongoing monthly operating reviews?
  3. What's the one tab the model needs that no one will ask
     for until it's too late?
```

---

## 8. Forecast review meeting agenda

> Use as the body of a calendar invite. 30 minutes, monthly.

```
Subject: FY26-27 Forecast Monthly Review

Attendees: Louis, Aaron, Teresa, Rijo, Elliot
Duration: 30 minutes

Agenda:
  0-2     Louis: 30-second number update vs last month
  2-7     Walk Exec Summary tab
  7-12    Dashboard: this month vs plan, top movers
  12-17   Risk Register: any new reds since last month?
  17-22   Decisions needed (specify ahead of meeting)
  22-27   Next month watchlist (what could move the number)
  27-30   Action items + owners

Pre-read (sent 24h before):
  - Latest .xlsx attached
  - 5-bullet email of the headline change
  - Specific decision asks
```

---

## 9. Final sign-off checklist

Before you call the model "locked", check every box.

- [ ] All "Class Mix" rows show **green** (sum = 100%).
- [ ] No cells anywhere show `#VALUE!`, `#REF!`, `#N/A`, or `#DIV/0!`.
- [ ] Assumption Register: every row has a sign-off date in column I.
- [ ] Risk Register: no Red items without a named owner.
- [ ] Change Log: new v3.1 row added with today's date and Aaron's sign-off.
- [ ] Exec Summary EBITDA number matches the P&L EBITDA number.
- [ ] Dashboard total cases matches Production Plan total cases.
- [ ] Revenue tab total matches the Dashboard headline.
- [ ] Doors W52 total matches the KPI year-end doors.
- [ ] File saved with name `Organika_RTD_Forecast_FY26_27_v3_1_LOCKED.xlsx`.
- [ ] File uploaded to the team Drive in the locked folder.
- [ ] Read-only link shared with stakeholders.
- [ ] Production PO sent to co-man.

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| Cell shows `#####` | Column too narrow. Double-click the column border to auto-fit. |
| Cell shows `#VALUE!` | A referenced cell has text where a number is expected. Check the cell the formula points at. |
| Cell shows `#REF!` | A referenced row or column was deleted. Restore from the prior version. |
| Numbers haven't updated after editing | Press `F9` (Windows) or `Cmd+=` (Mac) to force recalculation. |
| Dropdown doesn't appear in Google Sheets | Re-add the dropdown: Data > Data validation > Range from Validation Lists tab. |
| Conditional formatting (green/red) is missing in Google Sheets | Reapply: Format > Conditional formatting > Custom formula. |
| Sheet feels slow | Disable iterative calculation. File > Options > Formulas in Excel. |
| Trade spend total doesn't match my hand-calculated number | Trade spend pulls from Forecast Weekly column BF (FY revenue helper). If you manually changed any Forecast Weekly cells, restore the formula. |
| Class Mix sum check stays red | Row doesn't sum to exactly 1.00. Likely rounding - re-enter values as decimals (0.25, not 25%). |
| Doors weekly cells went hard-coded after copy/paste | Restore the formula `=$E6` (or the appropriate month input column letter) on the affected weekly cells. |
| I want to add a 10th channel | (a) Add row in Class Mix. (b) Add corresponding 4 SKU x channel rows in Velocity. (c) Add 20 brand x province x channel rows in Doors. (d) Add row in Forecast Weekly for each SKU x province. (e) Add row in Trade Spend. (f) Add to Validation Lists. The lookup ranges are extended to row 200 so existing formulas still work. |

---

## Closing note

This model is the source of truth. Anyone running a "scratch" model in their own spreadsheet is creating risk for the company. Point them here.

Owner: Louis - RTD lead, Organika.
Last reviewed: [DATE].
Next review: [DATE + 1 month].
