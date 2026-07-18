# Sparkling Daily Model — 10× Improvement Loop

**Run window:** ~3 hours · **Hard stop:** 2026-07-18 11:39:47 UTC (epoch 1784374787)
**Branch:** `claude/sparkling-daily-10x` · **Target:** `build_model.py` → `Organika_Sparkling_Daily_1YR_Scenario_Model.xlsx` + `organika_sparkling_daily_model.html`

## Loop rules (each cycle)
1. `date -u +%s` — if ≥ 1784374787 → **STOP** (final QA + summary, do not reschedule).
2. Pick the top unchecked backlog item.
3. Implement it in `build_model.py` and/or the HTML.
4. `python3 verify_model.py` — commit + push **only if PASS**; otherwise revert.
5. Check the item off, append a one-line note under **Done**.
6. Schedule the next cycle (~5 min) carrying the loop instruction.

Guardrails: additive & safe, never break working functionality, keep the Apple-style
simplicity (Home/Cover stay clean), verify before every commit.

## Backlog (highest value first)
- [x] Harden `verify_model.py` with a formulas-engine recompute (catch #DIV/0!, #REF! at calc time) + key tie-outs
- [x] Cross-tab tie-out checks on the Checks tab (Dashboard = Scenarios = Monthly totals)
- [ ] HTML dashboard → live interactive app: sliders for volume × / price × / trade Δ that recompute revenue & EBITDA in JS
- [ ] HTML: Apple-grade visual polish — typography, spacing, light/dark, clean charts
- [ ] New tab: Break-even & payback (units / weeks to cover fixed + launch spend)
- [ ] New tab: Cash flow & working-capital timeline (deposit, terms, inventory)
- [ ] Channel-level P&L build (Convenience / On-Prem / Fitness / Costco / FDM / Specialty / Online)
- [ ] Distribution ramp + weekly seasonality refinement toward the $3M path
- [ ] Pricing Lab: per-province price points + margin gate
- [ ] Sensitivity: tornado chart of the top EBITDA drivers
- [ ] Targets: path-to-$3M waterfall + gap-to-goal
- [ ] Scenario manager: named saved scenarios + side-by-side compare
- [ ] Home/Cover: one-screen exec verdict + headline charts
- [ ] `MODEL_README.md` (what / how / sources) + refresh in-workbook Guide
- [ ] Review Log: auto-append each loop improvement with timestamp
- [ ] Input guards + data validation on every input; unit toggle (case / 4-pack / can)
- [ ] Number-format, accessibility & print polish across all tabs
- [ ] Formula hardening: IFERROR coverage; convert any stray hardcodes to formulas

## Done
- Cycle 0: stood up the loop — roadmap + `verify_model.py` safety gate, isolated branch.
- Cycle 1: hardened `verify_model.py` — formulas-engine recompute flags errors on real sheets only (INDIRECT scenario-selector phantoms ignored). Confirmed model is calc-clean.
- Cycle 2: added two cross-tab tie-out checks — scenario P&L identities (Net/CM/EBITDA, all 4 scenarios) and Dashboard↔scenario EBITDA; both residual 0.
