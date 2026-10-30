# Prompt: forge pass on the detailed roads and trails layers (2026-10-30)

## Who it is for
- The owner: first time hunter from Mission, BC. Black tailed deer near Harrison Lake (MU, Management Unit, 2-18), Nov 14 to 15 2026.
- iPhone, gloves, no signal at the truck.

## Goal
- Prove and improve the new map layers "Detailed roads" and "Trails and old tracks" (shipped 2026-10-26, commit 1b7060ab).
- At a glance, the owner can tell: a main road a truck can likely use, a retired or overgrown spur, and a foot trail.
- Nothing on these layers may sound like permission to drive or hunt there.

## Rules
- Owner asked for forge-enterprise. No proof trigger (no price, no outside reader, no outside commitment), so it runs as forge-10x (canon section 4).
- Remove nothing on the map unless asked. Change only what a finding proves wrong or unclear.
- Every number shown (km totals, counts, data date) is recomputed in code twice, the last time after the final edit.
- Every claim about a source has its name, link or layer code, and date checked.
- App style rules: no em dashes, no prose hyphens, acronyms spelled out, certainty %.

## Parts
1. Research (2 agents): facts and numbers (re count km by class from the shipped files, check the class and surface codes against the BC road atlas data dictionary); gap, best in class and internal (what a beginner needs from a back road map; what the app already says elsewhere).
2. Build: fix what research finds.
3. Attack (2 agents): hostile reader plus exposure plus outsider; numbers plus design (render at 360 px, light and dark, zoom 10 to 15 near Harrison).
4. Clean room (1 agent) on the final version. Reverify only if it finds a material error.
5. Gate, regression (30 checks), lint, publish.

## Done means
- Gate says SHIP.
- Regression 0 failures, lint pass, live on the site.
- Report to the owner: what changed, what is still to confirm, live link.
