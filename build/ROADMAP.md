# MÜV App — Autonomous Improvement Loop

**Re-scoped:** 2026-07-11T07:31Z · **Deadline:** 2026-07-11T11:31:00Z (4 hours)
**Mix:** ~80% improvement / 20% expansion. **North star:** keep it a clean, easy-to-use
application — anyone should understand it at a glance. Improvements (usability, clarity,
polish, robustness, a11y, performance) take priority; expansion is the occasional [EXPAND] item.
**Branch:** claude/clever-ride-xgh441 · **PR:** #14

## Per-iteration procedure (follow every wake-up)
1. `date -u` → if now ≥ deadline OR all items done, `ScheduleWakeup(stop:true)` + short wrap-up. Else continue.
2. FIRST reschedule the next wakeup (resilience), THEN take the next unchecked `[ ]` item.
3. Implement in `build/` generators only (never hand-edit built files). Rebuild.
4. Verify green: `node build/ui_test.js` (HTML) + engine parity; `pycel` verify.py/verify2.py (Excel).
5. Clean npm artifacts, commit, push (retry). Tick `[x]`, append a one-line Log entry.
Keep every change additive, reversible, and shipped working. Preserve the dark-glass / citrus-aqua look.
If an item fails twice, skip it (note why) and move on.

## Backlog (priority order — improvement-first)
- [ ] I1 · [IMPROVE] Onboarding & plain language: dismissible "how to read this" helper + jargon tooltips (basis / velocity / ramp / seasonality / sell-through) so anyone gets it instantly
- [ ] I2 · [IMPROVE] Mobile / responsive pass: hero, tiles, map, charts, controls clean on phone widths; bigger tap targets
- [ ] I3 · [IMPROVE] Map polish: colour-scale legend, tidier layout (+ territory labels), hover/focus a11y
- [ ] I4 · [IMPROVE] Chart clarity: consistent axis/tick formatting, de-clutter gridlines, clear legends, uniform tooltips
- [ ] I5 · [IMPROVE] Robustness & performance: guard extremes (0 / negative / huge), smooth re-render, no layout shift
- [ ] I6 · [EXPAND] Share your view: encode control state in the URL hash + "Copy link" button (no storage APIs)
- [ ] I7 · [IMPROVE] Accessibility: aria roles/labels, focus-visible everywhere, reduced-motion audit, contrast check
- [ ] I8 · [IMPROVE] Microcopy & hierarchy: tighten every label/heading; goal + next action always obvious; spell-check
- [ ] I9 · [IMPROVE] Hero & gauge refinement: spacing, type scale, status sentence, tile readability; make $3M unmistakable
- [ ] I10 · [EXPAND] Download data (CSV): weekly + by-dimension via data URI
- [ ] I11 · [IMPROVE] Empty / extreme states: graceful visuals + friendly copy when a category is 0 or the goal is smashed
- [ ] I12 · [IMPROVE] Excel readability: number formats, widths, headers, freeze panes, print setup, cover note
- [ ] I13 · [EXPAND] Distribution-build view: active-distribution % and active doors by week (simple, easy read)
- [ ] I14 · [IMPROVE] Quality net: pytest for muv_config + Makefile wiring the node engine/UI tests
- [ ] I15 · [IMPROVE] Final QA sweep: dashboard == Excel to the cent, CSS/cross-browser sanity, README refresh

## Log
- 06:56Z · #1 D1 — Canada tile map (10 provinces, colour=revenue, hover tooltip) + durable build/ui_test.js (16 checks). Green.
