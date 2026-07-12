# CPG Commercial Decision System — Web App

An interactive, browser-based version of the enterprise CPG commercial decision
model: enter pricing, cost, trade, volume and channel assumptions and instantly
see gross-to-net structure, margins, trade leakage, break-even, scenario
outcomes, promotion ROI, and a **GO / REVIEW / STOP** recommendation.

The engine (`src/model.ts`) is ported from — and numerically matches — the
verified Excel workbook: the default SKU (a sparkling-beverage 12-pack sold
through a distributor into grocery) yields **Gross $727,500 · GM 41.7% ·
Trade 16.0% · NM 14.3% · Net Profit +$84,475 → GO**, with the Promo Case
intentionally dilutive (ROI < 1 → REVIEW).

## Run it

```bash
cd cpg
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # type-check + production build
npm test         # verify the model reproduces the Excel-verified numbers
```

## What's inside

- **Live control bar** — scenario selector + a big GO/REVIEW/STOP badge that
  updates on every edit.
- **Editable assumptions** — collapsible input groups (pricing & volume, cost
  stack, trade & deductions, fixed cost & channel, governance hurdles). Persisted
  to `localStorage`.
- **Dashboard** — 12 KPI tiles (colored against hurdles), a gross-to-net
  waterfall, a hurdle-by-hurdle recommendation rationale, and target/break-even
  prices.
- **Scenarios** — all seven cases (Base, Promo, High/Low Volume, Cost Inflation,
  Margin Recovery) with variance, best/worst markers, and per-scenario decisions;
  click a row to make it active.
- **Promotions** — tactic-by-tactic incremental economics judged on *true*
  incremental net profit (not vanity lift), with a combined-stack roll-up and
  value-destruction flags.

## Architecture

- React 18 + TypeScript + Vite + Tailwind. No runtime dependencies beyond React.
- `src/model.ts` is pure and framework-free — the single source of truth for the
  math, covered by `test-model.ts`.
- Self-contained under `cpg/`; it does not touch the other apps in this repo.
