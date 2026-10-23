# CPG Commercial Decision System — Build Specification (v1.0)

**Artifact:** `CPG_Commercial_Decision_System.xlsx` (9 tabs, 137 named ranges, fully formula-driven)
**Generator (auditable source):** `scripts/build_cpg_model.py`
**Model owner:** Commercial Finance Systems · **Business owner:** Revenue Growth Management
**Grain:** one product × one customer/retailer/distributor path × one scenario × one market × one currency

This document is the build/governance spec. The workbook itself is the live tool — open it, change a yellow cell, and every tab recalculates. The default SKU (a sparkling beverage 12-pack sold through a distributor into national grocery in Canada) is calibrated to a **credible, healthy Base Case** so the engine can be sanity-checked on sight.

---

## 1. Executive Summary

This is an enterprise commercial **decision system**, not a spreadsheet. It takes pricing, cost, trade, volume, channel and FX assumptions and returns, in under 10 seconds, the answer to the only questions leadership cares about: **Do we take this deal? Run this promo? What price hits target margin? What is the true net realized price? How much incremental volume to break even? What if cost, fill rate, or FX move against us?**

Every major output ends in a **GO / REVIEW / STOP** recommendation governed by configurable hurdle rates (gross margin, net margin, contribution/unit, trade %, promo ROI). The model is built on a **single scenario selector** (`selScenario`) that drives the entire workbook through `INDEX/MATCH`, a **three-basis trade/deduction architecture** (per-unit, % of gross, fixed $) that makes gross-to-net leakage explicit and auditable, and a **controls tab** that refuses to bless the model until reconciliation and hurdle checks pass.

Verified Base Case economics (default inputs): Gross $727.5k → Net $590.9k, **GM 41.7%, Trade 16.0% of gross, NM 14.3%, Net Profit +$84.5k → GO**. The Promo Case is intentionally calibrated to be **dilutive (ROI −0.5x → REVIEW)** to demonstrate that the tool catches value-destroying programs that look good on volume.

---

## 2. Workbook Structure

| # | Tab | Purpose |
|---|-----|---------|
| 1 | **Read_Me_and_Definitions** | Purpose, ownership, version control, metric dictionary, logic notes, 60-second usage guide. |
| 2 | **Inputs_and_Control_Center** | Single source of truth. Control bar (scenario/model/currency/targets/decision/integrity), all assumptions (yellow = input only), and a Live KPI snapshot. |
| 3 | **Calculations_Gross_to_Net** | Detailed line-item engine for the **active** scenario: volume → revenue → cost → profit → customer path → margin bridge → incremental → break-even → sensitivity → target price/cost. Formulas only. |
| 4 | **Scenarios** | Driver-multiplier table for 7 scenarios + a full compact P&L computed **per scenario**, with variance, best/worst, and per-scenario GO/REVIEW/STOP. |
| 5 | **Promotions_and_ROI** | Tactic-by-tactic incremental economics, combined-stack effect, automatic value-destruction flags, GO/REVIEW/STOP per tactic. |
| 6 | **Currency_and_FX** | Editable rate table (USD/CAD/JPY/KRW), base/reporting selectors, translated KPI table across all four currencies. |
| 7 | **Dashboard_Executive_View** | One-screen executive readout: header, core KPIs, trade/deduction KPIs, unit economics, break-even, customer path, scenario comparison, gross-to-net waterfall + scenario chart. |
| 8 | **Checks_Controls_and_Audit** | 18 automated checks with severity, reconciliation tests, model-health banner, overall integrity status feeding the control bar. |
| 9 | **Lookups_and_Assumptions** | Pick-lists (scenario, business model, currency, decision) and FX seed values that drive data-validation dropdowns. |

---

## 3. Detailed Inputs Design (Tab 2)

**Control bar (rows 6–10):** Model Name, Active Scenario (dropdown → `selScenario`), Business Model (`selBusinessModel`), Base/Reporting Currency (`selBaseCurrency`/`selReportingCurrency`); Targets: `TargetGM` 42%, `TargetNM` 12%, `TargetROI` 1.00x, `MaxTradePct` 22%, `MinContribUnit` $0.15; live **Decision Status** and **Model Integrity** flags.

**Input sections (yellow cells only):**
- **A. Business Context** — SKU, brand, customer, channel, market, launch flag, `UnitsPerCase`, servings, `NumStores`.
- **B. Pricing** — `ListPrice`, `InvoicePrice`, `WholesalePrice`, `SRP`, `PromoRetail`, `PromoDepth`, `RetailerMargin`, `DistributorMargin`.
- **C. Cost Stack** — 10 per-unit cost lines → subtotal `vc_pu` ($0.83); `BrokerPct` (3%) + `DistributorPct` (0% by default — *distributor margin lives in the price chain to avoid double-count*) → `vc_pct`.
- **D. Trade Investment** — 17 elements, each entered on **one** of three bases (`$/unit`, `% gross`, `fixed $`), rolled into buckets `ded_trade_pu` / `ded_trade_pct` / `ded_trade_fix`.
- **D2. Other Gross-to-Net Deductions** — accruals, EPD, customer deductions, chargebacks, claims → buckets `ded_other_*` (kept **separate from trade** so trade ROI isn't polluted by financial deductions).
- **E. Volume & Distribution** — `ForecastUnits`, `BaseUnits`, `PromoLiftPct`, `CannibPct`, `ForwardBuyPct`, `PantryPct`, `PostDipPct`, `VelocityPSPW`, `PromoWeeks`, `FillRate`, `ACV`.
- **F. Fixed & Program Costs** — 8 lines → `FixedCommercialTotal`.
- **G. Governance** — `MinGM`, `MinNM`, `PriceApprovalThr`, commentary.
- **H. Live KPI Snapshot** — Gross, Net, GM%, NM%, Trade$, Trade%, Contribution, NP, Profit/unit, BE units, ROI, **DECISION**.

---

## 4. Detailed Calculation Logic (Tab 3)

All values are computed at **active** assumptions = base input × the active scenario multiplier, resolved at the top of the tab:
`actVolM = INDEX(volMult, MATCH(selScenario, scnHeaders, 0))` (and the same for price, var-cost, trade, fill, cannibalization, promo flag, FX).

**Core chain (named cells):**
```
actFill         = MIN(1, FillRate*actFillM)
actUnits        = ForecastUnits*actVolM*actFill
actPrice        = WholesalePrice*actPriceM
actGross        = actUnits*actPrice
actTradeSpend   = (ded_trade_pct*actGross + ded_trade_pu*actUnits + ded_trade_fix)*actTradeM
actOtherDed     = (ded_other_pct*actGross + ded_other_pu*actUnits + ded_other_fix)*actTradeM
actGtN          = actTradeSpend + actOtherDed
actNet          = actGross - actGtN
actVCost        = (vc_pu*actVcM)*actUnits + vc_pct*actGross
actGP           = actGross - actVCost           ; actGM = actGP/actGross
actContrib      = actNet  - actVCost            ; actCM = actContrib/actNet
actNP           = actContrib - FixedCommercialTotal ; actNM = actNP/actNet
actPPU          = actNP/actUnits ; actCPU = actContrib/actUnits
actNRPunit      = actNet/actUnits
```
All ratios are `IF(denominator=0,0,…)` guarded.

**Customer path** (business-model aware): `actDistSell = IF(model="Distributor", actPrice/(1-DistributorMargin), actPrice)`; `actRetailReq = actDistSell/(1-RetailerMargin)`; retailer/distributor $ and % margins derived from those.

**Margin bridge:** Gross → −On-Invoice → −Off-Invoice → Net → −Product/Landed → −Broker/Distributor → Contribution → −Fixed → **Net Profit**.

**Incremental economics** (active vs Base column on Tab 4): incremental net sales, trade, variable cost, contribution, net profit; `promoSpend = MAX(0, incrTrade)`; `actROI = IF(promoSpend=0,0, incrNP/promoSpend)`; payback multiple.

**Break-even engine:**
- Units: `IF(actCPU<=0,"contrib<=0", FixedCommercialTotal/actCPU)`.
- Wholesale price to hit Target NM — closed-form solve (helpers `a` = deduction % of gross, `b` = deduction $/unit, `c` = deduction fixed $):
  `BE = ((b+vc)·U + c + Fixed − t·(b·U+c)) / ((1−a−f − t·(1−a))·U)` where `vc=vc_pu·actVcM`, `f=vc_pct`, `t=TargetNM`, `U=actUnits`. Verified: $1.4633 at NM 12% vs current $1.50 — internally consistent (we sit above target).
- Retail price grossed up for distributor + retailer margin; promo-lift %, velocity, store-count, and promo-week break-evens.

**Sensitivity engine:** ±5%/±10% shocks on Price, Volume, Cost inflation, Trade %, and FX → Net Profit.
**Target price/cost logic:** wholesale needed for Target GM, and the per-unit cost reduction required if price can't move.

---

## 5. Scenario Engine (Tab 4)

Scenarios are stored as **driver multipliers** (1.00 = base) in a 7-column table (`scnHeaders` C:I): Volume, Wholesale price, Variable cost, Trade spend, Fill rate, Cannibalization, Promo flag (1/0), FX stress. The active column is selected by `selScenario` and read everywhere via `INDEX(driverRow, MATCH(selScenario, scnHeaders, 0))`.

A **compact P&L is computed for every scenario column** using the *identical bucket math* as the Calc engine, so the Base column reconciles to the Calc tab to the dollar (Checks #2–#4 enforce `ABS(diff)<$1`). Each column ends in its own GO/REVIEW/STOP via the same hurdle logic, conditionally colored. Variance-vs-Base, best-case and worst-case Net Profit are surfaced below.

Scenarios shipped: Base, Promo, High Volume, Low Volume, Cost Inflation, Margin Recovery, Custom (Custom = base until a user overrides its column).

---

## 6. Promotions & ROI (Tab 5)

For each tactic (TPD, End Cap, Fence/Feature, Display, Advertising, Flyer, Digital, Demo) the model computes:
spend → base volume (`actBase`) → lift % → gross incremental volume → cannibalization → **true incremental volume** = `incr×(1−cannib)` → contribution/unit (`actCPU`) → incremental contribution → **incremental net profit = incr contribution − spend** → **ROI = incrNP/spend** → break-even lift % = `spend/(actCPU×actBase)` → **verdict** = `IF(incrNP<0,"STOP", IF(ROI≥TargetROI,"GO","REVIEW"))`.

A **Combined Stack** row sums spend/volume/profit and recomputes blended ROI. **Automatic flags** fire for: any tactic below ROI hurdle, any negative incremental profit, combined stack below hurdle, combined trade above `MaxTradePct`, and profit per $1 of promo spend. This is the layer that distinguishes **gross sales lift from true incremental profit** and exposes forward-buy/pantry-loading/post-promo-dip erosion.

---

## 7. Currency & FX (Tab 6)

Rates are entered as **USD value of 1 currency unit** (`fxRate` keyed by `fxCcy`). Conversion factor `fxFactor = fxBaseRate/fxRptRate`. Any KPI translates as `value_reporting = value_base × fxBaseRate ÷ fxRate(target)`. A translated KPI table renders Gross, Net, Trade, Contribution and Net Profit simultaneously in **USD, CAD, JPY, KRW**. Base and reporting currency are switched from the Inputs control bar; rates are the only editable cells, keeping it simple for a finance team to maintain.

---

## 8. Dashboard (Tab 7)

One screen, executive-grade. **A.** Header (product/customer/channel/scenario/currencies + big DECISION and INTEGRITY tiles). **B.** Core financial KPIs. **C.** Trade & deduction KPIs (trade % vs ceiling colored red/green live). **D/E.** Unit economics and break-even. **F.** Customer-path economics (retailer & distributor margins, company net realization). **G.** Scenario comparison (Base vs Active vs Best vs Worst vs Δ). **H.** Gross-to-Net **waterfall** data + chart and a **Net-Profit-by-scenario** bar chart. Color logic throughout: green = above hurdle, yellow = caution, red = below hurdle / value destruction.

---

## 9. Checks, Controls & Audit (Tab 8)

18 checks, each with Expected / Actual / Status / Severity, conditionally colored, including:
- **Reconciliation:** Calc Net Sales / Net Profit / Trade Spend each equal the active Scenario-table column within $1; GM% and NM% tie to their dollar values; per-unit × units ties to total NP; FX factor ties to base/reporting rates.
- **Sanity:** Net ≤ Gross; no negative units; contribution > 0 for break-even; net realized price ≤ wholesale.
- **Governance:** scenario selector valid; required assumptions present (price/units/case > 0); trade %, GM, NM within hurdles.

A **Model Health Summary** counts passes/warnings/critical failures and emits an overall status — `HEALTHY` / `CAUTION — WARNINGS` / `REVIEW — CHECK FAILS` / `UNSAFE — CRITICAL FAIL` — that drives the red/green banner and feeds the Inputs and Dashboard integrity tiles. The model declares itself unsafe before anyone makes a decision on it.

---

## 10. Build Notes

- **Separation:** inputs (yellow, unlocked) vs formulas (locked). Every sheet is protected (password `cpg`); only yellow cells accept entry. No hardcodes in calculation zones — all assumptions live in designated input areas and flow by named range.
- **Named ranges:** 137, human-readable (`actGross`, `ded_trade_pct`, `beWholesale`, `selScenario`…), so formulas read like English and survive row insertion.
- **Validation:** list dropdowns for scenario, business model, base & reporting currency (sourced from Lookups).
- **Formatting:** consistent fonts, banded sections, frozen panes, currency/percent/multiple number formats, gridlines off, no merged cells inside calculation areas, conditional formatting for all decision/status cells.
- **No circular references.** Incremental economics reference the Base scenario column (a separate computed block), not the active cell, so there is no feedback loop.
- **Reusability:** the template is SKU/customer/channel/market agnostic — clone the file, repoint the inputs.

---

## 11. Recommended Enhancements (high-value, no bloat)

1. **Mix/portfolio roll-up tab** — link N copies of this template into a customer- or category-level P&L (kept out of v1 to honor "don't build an ERP").
2. **Trade accrual vs. actual tracker** — compare planned vs. settled trade to catch leakage over a promo cycle.
3. **Elasticity-driven lift** — replace the flat promo-lift input with a price-elasticity curve once the org has clean POS data.
4. **Scenario snapshot log** — a paste-values archive of approved deals for governance/audit trails.
5. **Two-variable data tables** (price × volume) on the Sensitivity block for a full profit surface.

---

## 12. Step-by-Step Build Guide

The workbook is generated deterministically from `scripts/build_cpg_model.py` (openpyxl). To rebuild or adapt:

1. `pip install openpyxl` (3.1+).
2. `python3 scripts/build_cpg_model.py` → writes `CPG_Commercial_Decision_System.xlsx`.
3. The script builds tabs in this order and wires them: Lookups (pick-lists) → Inputs (named cells + buckets) → Scenarios (driver table + per-scenario P&L) → Calculations (active engine via INDEX/MATCH) → back-fills the Inputs KPI snapshot → Promotions → Currency/FX → Checks (integrity) → Dashboard → Read-Me; then reorders tabs to the mandated sequence, applies data validation, conditional formatting, and sheet protection.
4. To re-point to a new SKU/customer, edit only the input defaults (sections A–G) or, in the live file, the yellow cells.
5. **Verification performed:** (a) every named reference in every formula resolves — 0 undefined names; (b) no text label is mis-parsed as a formula; (c) independent Python replication of the engine reproduces the Base Case (GM 41.7%, NM 14.3%, NP +$84.5k) and the full 7-scenario decision spread, and confirms the closed-form break-even price ($1.4633 @ 12% NM) is internally consistent.

> Note: this environment's headless LibreOffice could not load *any* xlsx (an environment limitation, confirmed on a trivial control file), so formula values are validated by name-resolution analysis + independent numeric replication rather than a headless recalc. Opening the file in Excel or Google Sheets will recalculate all formulas live.
