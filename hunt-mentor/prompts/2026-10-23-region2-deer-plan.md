# Prompt: Harrison plans show Region 2 black tailed deer advice, not Kamloops (2026-10-23)

## Who it is for
- The owner: first time hunter, home base Mission, BC; black tailed deer near Harrison (MUs 2-18, 2-19, 2-8).

## Why (found while testing plan trip version 2)
- Plans use species `mule-deer` (the synopsis lists black tails as mule deer), and that entry was written for Region 3 (old home base Heffley Creek): "Drive the Heffley Lake road", the Region 3 four point rule, the mule deer rut.
- The map's "My base area" for no signal still pointed at Heffley Creek.

## Rules
- hunt-mentor/CLAUDE.md in full. Only facts already sourced in the app (Black tailed deer Masterclass, Harrison and Mission lessons, Rule Book Region 2, data/seasons/region2.json), with their certainty. Region 3 content unchanged for Region 3 plans. Remove nothing on the map.

## Parts
1. A Region 2 block on `mule-deer` in data/plans/species.json (phases, tactics, day plan, raise odds, red flags, after the kill, checklist, mistakes, shot).
2. plan.js, the spot rundown and the map "Best times" pick the region block by the plan's or spot's MU.
3. Map offline base area: Mission, 25 km.

## Done means
- A Harrison plan has no Heffley, Kamloops, 3-27 or Region 3 text; a Region 3 plan is unchanged; 360 px, no errors; lint passes; published.
- Status: done and published 2026-10-23. Still VERIFY: black tail rut peak dates at Harrison.
