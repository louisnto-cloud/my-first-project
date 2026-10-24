# Research log: Area analysis habitat model (data/analyze/species-model.json), 2026-10-11

Checked 2026-10-11. Certainty uses the CLAUDE.md scale. canada.ca not used (blocked).

## What the file is built from
- Masterclass lessons (content/phase8), chapters 3 (senses: thermals), 5 (year), 6 (day), 7 (where) for mule deer, white tailed deer, moose, elk, black bear, grouse, quail, ducks, geese. Every block carries the certainty of the lesson line it encodes.
- Research logs: research/2026-10-11-masterclass-*.md, 2026-10-11-rl.md (mule deer winter range slope 10 to 45%, Penn State hunter distance from roads, slope maths), 2026-10-11-rq.md (Curtis and Du Toit 2017 roads; Link 2011 mallard commutes; Oregon elk and roads).
- Elevation by month: data/migration.json (general BC pattern from BEC zone ranges, 55 to 80%), refined where a lesson gives a local band:
  - Mule deer October, Heffley Creek before first snow: 900 to 1,500 m (75%, local-heffley lesson).
  - Moose December to March: below about 1,300 m (85%, BC moose model below).
  - Grouse: union of ruffed core 750 to 1,250 m (85%, BC atlas) with spruce and dusky monthly bands (55 to 65%).

## New sources found this session
- BC wildlife habitat rating account, Moose (M-ALAL), Chilcotin and Fraser Plateau project, 2004. https://a100.gov.bc.ca/pub/acat/documents/r1573/whr_4109_malal_1097078185680_3f7c787cc7c9486aa185bdad7e4c4f53.pdf . Read directly (pdftotext), 85%.
  - "Areas higher than 1300 m seldom used in the winter."
  - Moose migrate "from high elevations in the summer, to elevations below 1300 m in the winter" (Sopuck et al. 1997).
  - Not in "the drier parts of the southern Okanagan Valley"; dry open grassland rated 6 (nil).
  - IDF dry units: "Moderate slopes, south facing slopes with uneven-aged stands within 100m are rated up to 2 for security and feeding." Used as winter aspect (70% applied near Kamloops).
  - Forage production in cutovers peaks 10 to 35 years after disturbance; use of clearcuts and burns decreases in summer and fall (Sopuck 1997).
- Baker, B. G. 1990. Winter habitat selection and use by moose in the West Chilcotin region of British Columbia. MSc thesis, University of British Columbia. https://open.library.ubc.ca/collections/831/items/1.0074938 . Search preview only (UBC page blocked the fetch), 70%: moose concentrated within 100 m of the forest and wetland edge and virtually did not use areas more than 200 m from the edge. Used as moose water_m [100, 200].
- Tried: California quail CDFW life history PDF for a distance to water number. PDF text not readable by the fetch tool; no number used (quail water_m stays null, "no data").

## Model choices (not facts; documented in factors_doc)
- Aspect weights encode written statements: named aspects 1, neighbours 0.7, the rest 0.4.
- Slope: percent grades converted with degrees = atan(percent/100): mule deer winter range 10 to 45% = 5.7 to 24.2 deg; elk 15 to 30% best = 8.5 to 16.7 deg, use drops past 40 to 50% = 26.6 deg. Shoulders without a source: hi_ok = best_hi + 10 deg, lo_ok = best_lo minus 5 deg. "Flat ground" = app flat class under 8 deg, shoulder to 15 deg.
- "On the water" = water_m [0, 60] (one 30 to 60 m grid cell).
- road_m 500: Penn State 2004, 73% of hunters within 0.5 km of a road (85% Pennsylvania, 60% applied to BC).
- Tip lines carry certainty 50 by convention. Factors with no source carry 0, a neutral value and "no data".

## Gaps (cert 0 in the file)
- No distance to water numbers for white tailed deer, elk, black bear, grouse, quail; geese and ducks use water only for on water blocks.
- No aspect data for fall white tails, moose outside winter, elk feeding blocks, black bear outside spring.
- No slope data for black bear outside spring, grouse.
- Sun or shade preference mostly unsourced outside mule deer, elk beds, moose beds.
- No Kamloops elk elevation data; no local snowline by month (VERIFY).
