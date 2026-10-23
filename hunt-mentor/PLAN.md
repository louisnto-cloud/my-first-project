# PLAN.md: Hunt Mentor

Status: Step 0 done. Waiting for owner answers and "go".
Today: 2026-09-30. First hunt: mid to late October 2026.

## 1. The big risk: time
- About 2 to 3 weeks until the first hunt.
- The app is not the bottleneck. Real world tasks are:
  - Buy shotgun, buy scope and mounts, sight in, pattern the shotgun.
  - Buy federal Migratory Game Bird Hunting Permit and stamp.
  - Buy any BC species licences needed (VERIFY which).
  - Buy clothing and waders.
- Plan: Phase A ships in 2 releases.
  - A1 (target 3 to 4 days after "go"): app shell, Field Mode, Sessions 1 to 6
    (countdown, licences, shotgun, scope, sighting in, ammo). These drive purchases.
  - A2 (target 7 to 9 days after "go"): Sessions 7 to 13 + legal flowchart + after the shot.
- Targets are estimates, not promises.

## 2. Phases
| Phase | Content | Stop for review |
|---|---|---|
| Step 0 | PLAN, CLAUDE, SOURCES, questions | Now |
| A1 | App shell, Field Mode, regs data file, Sessions 1 to 6 | Yes |
| A2 | Sessions 7 to 13, deploy, install steps | Yes |
| B | Foundations + Reading the Land | Yes |
| C | Species (core, then advanced, full list checked vs synopsis) | Yes |
| D | The Shot and After | Yes |
| E | Mastery, 3 local plans, 5 trip guides | Yes |

## 3. File layout
```
hunt-mentor/
  CLAUDE.md          rules for every session
  PLAN.md            this file
  SOURCES.md         every source, date checked
  package.json       build scripts only (no runtime libraries)
  build.mjs          Markdown -> JSON bundle, builds PWA + single file
  content/
    phase1/01-countdown.md ... 13-after-the-shot.md
    phase2/ ... phase6/
    species/*.md
    glossary.md
  data/
    regs.json        ALL seasons, limits, fees, with lastChecked per entry
    bases.json       3 bases: coordinates for offline sun times
    gear.json        prices by tier, with priceChecked date
  diagrams/*.svg     hand drawn SVGs
  app/
    index.html, app.js, style.css
    sw.js            service worker (offline cache)
    manifest.webmanifest, icons/
  scripts/
    lint-style.mjs   flags em dashes, hyphens in prose, long paragraphs, bare acronyms
    check-sources.mjs flags any rule without source + certainty + date
  dist/              build output (git ignored)
    hunt-mentor-offline.html   single file backup
```

## 4. Build choices made (small, logged here)
- Vanilla HTML, CSS, JavaScript. No framework. Fast on weak signal.
- Markdown is converted at build time. No Markdown library shipped to the phone.
- Build tool: Node plus one small Markdown parser (dev only).
- Storage: phone local storage for progress, quiz misses, checklists, journal.
- Legal light times: computed offline with standard sunrise and sunset math
  for each base. Labelled "verify with official tables".
  - Assumption: BC big game hours and migratory bird hours are defined relative
    to sunrise and sunset. VERIFY exact wording in synopsis and ECCC summary.
- Journal export: CSV (comma separated values) file download.
- Themes: light, dark, sunlight (max contrast).
- Lives in folder `hunt-mentor/` of this repo, separate from the other apps.
- Root CLAUDE.md is not changed. This folder has its own CLAUDE.md.

## 5. Research plan
- Parallel research agents by topic (licences, migratory birds, Region 2, 3, 8,
  firearms transport, ATV, gear prices).
- Separate reviewer agent checks every rule against its source before each report.
- Primary sources listed in SOURCES.md. Official only for rules.
- Gear prices: Canadian retailers, date checked. Prices are "price checked"
  snapshots, not facts about the future.

## 6. Risks
| Risk | Impact | Plan |
|---|---|---|
| Time to first hunt is short | Owner not ready | Ship A1 fast. Countdown session first. |
| Synopsis PDFs are large, tables hard to parse | Wrong season or limit | Read region PDFs directly. Reviewer agent. VERIFY if unclear. |
| MU (Management Unit) specific exceptions | Legal error in the field | Always show "check the MU table" + link. Never show a limit without MU scope. |
| In season changes after build | Stale data | "Before every hunt" checklist links to official change pages. |
| Gear prices change fast | Wrong budget | Date on every price. Tiers, not exact figures. |
| Local no shooting bylaws hard to map | Legal error | Link to official bylaw or map. VERIFY if not found. |
| Public hosting | Anyone with the link can see it | No personal data in the content. Journal stays on phone. |
| iPhone storage can clear offline data if unused for weeks | Lost progress | Add "export backup" button (JSON file). |

## 7. Owner answers (logged 2026-10-01)
- Phone: iPhone. Install via Safari "Add to Home Screen".
- Hosting: GitHub Pages, this repo, path `/my-first-project/hunt-mentor/`.
- Rifle: owner says "Tikka Arctic", barrel about 18 in, "the Canada version".
  - Likely Tikka T3x Arctic (Canadian Rangers model): 20 in barrel, iron sights,
    removable Picatinny rail (90%, manufacturer page via search). Owner to confirm.
- Budget: about $3,000 total for shotgun, scope, clothing and gear.
- Partner: brother. Has not hunted before. Licence status: ASK.
- Distance: open to ATV and walking 5 to 10 km. Wants best odds on deer.
  - Session 10 shows 3 scenarios: brother's land, ATV on FSRs, walk in.
- Pack out: brother helps.
- Water: brother's boat. Kayak possible. Canoe per brief.
- Quail: no Okanagan permission yet. Brother owns about 20 acres (about 8 ha)
  at Heffley Creek. Legality and safety of shooting there: VERIFY (bylaws,
  no shooting areas, distance to homes, backstop).
- Dog: none. Retrieval plan must work without a dog.
- Priority: deer, ducks, quail. Owner open to ducks and quail first. ASK final pick.

## 7b. Owner answers (logged 2026-10-01, later)
- Brother's own house is ON the 20 acres. 100 m buffer applies around it (75%, VERIFY rule text).
- Neighbours' houses about 100 to 200 m away. Usable shooting area on the property is small.
- Brother has CORE, PAL and FWID. Both will hunt. Plans are for 2 licensed hunters.
- Rifle confirmed iron sights only for now. Budget raised to about $10,000.
- Boat: 10 ft, both have PFDs. Kayak possible.
- Network: government sites blocked in this environment; owner asked to set Full access.

## 7c. Owner update (2026-10-01, later)
- Owner has ALL licences and permits now. Brother too (assumption: he bought his own; owner said "I have all the licenses").
- Owner: do not focus on the brother's land or Sun Peaks. Plan for the WHOLE region (Region 3) and all of BC. Base at Heffley Creek is just where they sleep.
- Official synopsis PDFs now downloaded (network opened 2026-10-01). Rules read directly can be 95%+.
- canada.ca still blocked. Federal duck seasons come from the Migratory Birds Regulations on laws-lois.justice.gc.ca instead.

## 7d. Owner update (2026-10-02)
- Owner wants real animal photos for ID and less text per screen (more screens are fine).
- Decision: photos from Wikimedia Commons and other public domain or Creative Commons sources, with credits. Overrides the "no copied images" line in the brief for photos only.
- Build now auto splits long screens (about 6 points or 120 words per screen) and lightens certainty badges.

## 8. Open questions
- See chat. Answers get logged here.

## 7e. Owner update (2026-10-04)
- Hunt Map (onX style) live: topo, satellite, 3D, layers, 3,534 candidate spots (areas A, B, C).
- Map tools live: waypoints, lines with elevation profile, areas, range rings, wind and scent cone, forecast, Insights, Go and Track, GPX and KML import and export.
- Rule Book complete for general rules plus Regions 3 and 8. Next: Region 2, federal migratory birds, season data per MU for spot cards.

## 7f. Tap a place to see it on the map (2026-10-11)
- Owner ask: "When you reference a place can I click it and it will show me the map of the area."
- MU numbers ("MU 3-27", "MUs 3-27 and 3-28"), regions ("Region 3 Thompson") and place names from the gazetteer are linked by the app as it shows a screen (lessons, glossary, flashcard backs, planner). Lesson files are not edited.
- Tap: a bottom sheet with a small offline map (MU highlighted, neighbours, region border, owner base or town), 2 to 3 plain lines from the data, "Open on Hunt Map" (`#/map/mu/3-27`, `#/map/region/3`, `#/map/place/<id>`) and "Rules for Region N".
- Build choices (mine): first mention of each place per screen is linked, and again inside a "More" box; screen titles are not linked; town names that are everyday words (Hope, Mission, Chase, Trail) are not linked at the start of a sentence; a name followed by another capitalised word ("Nelson Street") is not linked.
- Data: `scripts/build-places.py` (rerun with `--cache <folder>`; `--offline` uses the cache only). New lesson block: ```` ```mumap 3-27 ```` (also `mumap region 3`, `mumap place heffley-creek`).
- Drafts until reviewed: lesson `know-your-mus` (1.14) and deck `data/flashcards-mu.json` ("Know your MUs"). To publish, add `know-your-mus` to `sessions` and `mu` to `flashcards` in `data/published.json`.

- 2026-10-12: Diagram redraw batch 1 (20 worst, mix of field guide A and infographic B) published; owner approved.
- 2026-10-12 PAUSED by owner. State:
  - Live: everything up to diagram batch 1 and the Rule Book "answers first" rewrite.
  - Saved, NOT published: diagram batch 2 (50 diagrams). Owner 2026-10-15: published now (changed from hold). AI images replace some later.
  - Next: owner reviews batch 2, then batch 3 (next 50, start with field dressing steps sk-gut-1, 2, 4 to 8 so the sequence matches).
  - Open owner decisions: AI images (allow for scenes only, or keep all hand drawn); 13 "ask a conservation officer" rules; 42 VERIFY items in moose, elk, bear, skills Masterclasses.
- 2026-10-15: AI photos on hold. Redrawing all remaining 765 flagged diagrams in waves of about 155 (5 writers x 31), lists in scratchpad waves/list-01..25; publish each wave after checks.
- 2026-10-15: all 25 diagram lists redrawn and published (wave 5 = lists 21 to 25). Next: consistency pass for step series + redo list.

- 2026-10-16: published study path (default pace must know by the hunt), 100 diagrams redrawn with tap to learn, safety tools, trainers, map hunt helpers, no shooting layer (official outlines only; unmapped closures listed by MU). Fixed: bear toe line (inner toe), moose yield 100 to 120 kg, goose finish 14 m (15 yd) Tip.
- 2026-10-16: owner home base is Mission (Home default and map first view); priority animals black bear and deer.
- 2026-10-16: owner focus is deer near Mission (Harrison area fine, about 60 km); no bear hunting near Mission.
- 2026-10-16: published practice shooting (50 ranges from OpenStreetMap, 15 rules, Where can I practise? check). Known: glassing sheet can reopen over another tool if its slow calculation finishes after you switch (seen only on a slow network).
- 2026-10-16: published 60 big game photos (bg-*, data/photos/bg.json, 7.9 MB).
- 2026-10-16: published 31 track, sign and terrain photos (ts-*).
- 2026-10-16: published Crown land, tenures and Where you can likely hunt for all of BC (about 41 MB PMTiles, read by range).
- 2026-10-16: published 29 bird photos (bd-*).
- 2026-10-16: published camping (4,422 camps, all BC, official first, closures in red) and hunting spots for all of BC with popular/quieter (estimate 50- 2026-10-16: published camping (4,422 camps, all BC, official first, closures in red) and hunting spots for all of BC with popular or quieter (estimate, 50 percent), tags Good for 2, Good solo, Beginner friendly, detail cards. Colours: rec sites dark green, BC Parks blue, OSM orange, Crown camps lime; popular ring red, quieter ring yellow.
- 2026-10-16: owner hunts deer near Harrison with a rifle; Home has 2 ready made plan starts (with brother, solo); study path swaps the Rule Book region lesson to the plan's MU region.
- 2026-10-17: published Region 2 no shooting areas (349 areas drawn, 161 listed by MU), black tailed deer labels, lesson Your Harrison deer hunt (must know in Harrison deer plans). Gap: Mystery 5500 FSR closed past 0 km (official road notice) affects 2 Chehalis spots.
- 2026-10-17: QA pass merged (7 fixes: 96 MB backup no longer precached, preset Back loop, 44 px taps, 14 px text, backup file routes and data). Updates now reuse unchanged lesson and photo files (tested: second install fetched 0 of 320 lessons and 0 of 377 photos). Presets skip answered questions (3 questions to a saved plan). Fixed white tailed deer look alikes fold; Ask chips 44 px; removed stray file.
- 2026-10-17: published VERIFY sweep (508 to 416). Owner decisions open: Region 1 California quail MUs (law 1-1 to 1-5 vs synopsis 1-1 to 1-15; data keeps synopsis); Mission bylaw 5433-2014 (hunting only in Areas B, C, D; no firing within 150 m of roads incl. forestry roads, 85 to 90%).
- 2026-10-17: Hunt Map gaps fixed. Lakes, wide rivers and reservoirs (Freshwater Atlas, 2 ha or more) are no longer shown as likely Crown land or likely open to hunt (crown_land 13.2 to 20.3 MB, hunt_likely 19.9 to 24.9 MB, all of BC). New layer Range tenures (Range Act grazing and hay cutting, olive stripes, 2.3 MB) with the page 9 grazing rule and a VERIFY (a licence or permit may not be a "grazing lease"); Can I hunt here now? adds a CHECK line inside one and says "Water" on a lake. Glassing tool no longer opens over another tool (seen when its code or its calculation finished late on a slow network). Build warns when two photo ids share one source (coyote and g-coyote-snow; hab-quail-vernon and g-quail-male-vernon; both of each pair are in use, so the big game gallery shows the Yosemite coyote twice). Black bear spots added to areas A, C, D, E, F and G (90, 73, 82, 88, 99, 88; never B), all spots 62.5 to 64.8 MB.
- 2026-10-18: map round 2 part 4 published: Steep ground layer (off by default) and Pack out from here on spot cards.
- 2026-10-18: map round 2 part 2 published: Mark my truck with arrow and walk back time, legal light chip, turnaround chip synced with Safety.
- 2026-10-18: map round 2 part 3 published: Save this hunt area for no signal on plans (Harrison plan about 56 MB, Ready offline check).
- 2026-10-18: map round 2 complete: layer sets (Clean, Scouting, Hunt day), What am I looking at? key, 14 px and 44 px in all map UI. Open owner choice: default layer set. Known: first PMTiles header request fails once then retries (no user impact seen).
- 2026-10-18: owner choices: map starts on Scouting (applied once, later picks kept); base map place, road, water, park and peak names 14 px minimum (contour numbers unchanged).
- 2026-10-23: added How to use this app (#/guide: point form tour with a button per feature; More link; Home card for new users until opened or hidden) and Hunt week (#/huntweek, #/huntweek/<plan id>: countdown checklist by days before, 40 items with certainty and source, ticks in hm.huntweek.<plan id>; Home card only when a saved plan starts within 14 days, until its last day). Backup add on keys now include hm.huntweek.*, hm.guide.* and hm-train-v1 (trainer scores were missed before). Chilliwack road page reread: updated 21 October 2026, Mystery 5500 still no access past 0 km; Hemlock Valley FSR no access at 0 km (new to the app).
