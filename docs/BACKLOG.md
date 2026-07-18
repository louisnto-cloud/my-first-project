# Improvement-loop backlog — MÜV dossier "app"

Prioritized queue for the autonomous improvement loop. Each iteration: pick the top unblocked item,
implement, validate (`./build_all.sh`), commit, log in CHANGELOG.md.

## Mandate (user-set)
- **80% improvement / refinement, 20% expansion.** Roughly 4 of every 5 iterations refine, polish,
  reconcile, QA, or improve usability; ~1 of 5 adds net-new content.
- **The "app" = the workbook + build pipeline. Prioritize the application and an EASY INTERFACE**
  (simple navigation, a clear front-door, usable controls) over adding depth. Keep it simple.

## Loop control
- Deadline: **2026-07-18T11:38:12Z** (3h continuous; user's 6:30 PM local)
- Cadence: CONTINUOUS — multiple items per wake, tight (~120s) spacing; tokens uncapped by user
- Stop when: deadline reached OR user interrupts (backlog auto-refills before exhaustion)

## Queue (improvement-weighted, interface-first)
- [x] I1 — Loop infra + Scenario Comparison tab
- [x] I2 — [IMPROVE/INTERFACE] "🏠 Start Here" home/navigator tab = the front door: big clickable
        links to Dashboard, Financial Model, Recommendation, Peer Set, Regulatory, Risk; make it the
        active tab on open. The easy interface for the whole workbook.
- [x] I3 — [IMPROVE] Navigation polish: ↩ Home + ↩ Contents link on every tab; tab-color legend.
- [x] I4 — [IMPROVE] Formatting QA sweep: consistent fonts/widths/wrap/row-heights; freeze panes on
        all data tabs; fix any text overflow or clipped cells.
- [x] I5 — [IMPROVE/INTERFACE] Financial Model usability: clearly mark input vs formula cells, add
        cell comments/instructions, lock formula cells (sheet protection, inputs unlocked), make the
        scenario dropdown prominent.
- [x] I6 — [IMPROVE] Hyperlink all source URLs on the Sources tab (clickable).
- [x] I7 — [IMPROVE] Consistency QA: reconcile older tabs to MÜV-as-can; run stale-guard; fix wording.
- [x] I8 — [EXPAND 20%] Peer-set positioning chart (sodium vs price scatter).
- [x] I9 — [IMPROVE] Executive one-page brief tab (consolidate thesis + reco + numbers).
- [x] I10 — [IMPROVE/INTERFACE] README.md: how to open, navigate and use the workbook + rebuild it.
- [x] I11 — [EXPAND 20%] Break-even chart + one-way sensitivity on price & COGS.
- [x] I12 — [IMPROVE] Glossary / data-dictionary polish + inline definitions.
- [ ] I13 — [EXPAND 20%] Risk register likelihood×impact heatmap visual.
- [ ] I14 — [IMPROVE] Final QA + polish + changelog closing summary.

## Guardrails
- MÜV = RTD sparkling CAN (SKU 4338, ~$14.99), food-regulated. NEVER reintroduce "powder" framing.
- Canada: sport-electrolytes → Supplemented Foods by 2027-12-31. Collagen beauty claims = NHP-only.
- Every added figure confidence-tagged; flag estimates. Prefer refinement over bulk.
