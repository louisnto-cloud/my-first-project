# Prompt: Region 2 advice for every animal, not Kamloops (2026-10-23)

## Who it is for
- The owner: first time hunter who lives in Mission, BC (Region 2, Lower Mainland). Deer near Harrison first; other animals later.

## Owner ask
"Fix the region advice for other animals."

## The problem
- Each animal's plan text in data/plans/species.json and data/plans/species-birds.json (where, when, tactics, day plan, raise your odds, red flags, after the kill, checklist, mistakes, lessons) was written for Region 3 around Heffley Creek, the old home base.
- A plan for Region 2 (Mission, Harrison, Fraser Valley) shows Kamloops places, Region 3 MUs (Management Units) and Region 3 rules. Only mule deer (black tailed deer) is fixed so far.

## Rules
- hunt-mentor/CLAUDE.md in full. Never invent a rule, season, bag limit, date, MU or place.
- Region 2 facts only from sources already in the app: data/seasons/region2.json and migratory.json, data/regs.json, the Rule Book Region 2 lesson (content/phase7/09), Rule Book general lessons, the Mission and Harrison local lessons, the species lessons and Masterclasses. Each fact keeps its certainty, synopsis page and date. Missing: VERIFY, leave the value blank.
- Tactics stay labelled Tip. Region 3 content stays unchanged for Region 3 plans.
- An animal with no Region 2 season says so plainly (for example "No general season in Region 2 (99%, page N)") and points to the nearest region that has one, from the season tables.

## Parts
1. Big game, predators and small game (species.json): a `regions["2"]` block per animal whose base text is Region 3 specific, same shapes as the mule deer block.
2. Birds and small game (species-birds.json): the same.
3. Any other region: when a plan's region has no block and the base text is Region 3 specific, the plan shows one line "This advice was written for Region 3 (Kamloops area). Check your region's rows" with the official link, instead of presenting it as local.

## Done means
- A Region 2 plan for each animal shows no Heffley, Kamloops, Sun Peaks, Paul Lake or Region 3 MU text presented as local advice; Region 3 plans unchanged; 360 px, no errors; lint and regression pass; published; report lists every new fact with source and certainty and every VERIFY.
