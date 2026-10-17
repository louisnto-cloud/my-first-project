# Research log 2026-10-11: Safety and Navigation Masterclass (prefix mc-nav)

Lessons: content/phase8/101-nav-why.md to 110-nav-drills.md (ids mc-nav-01 to mc-nav-10). Flashcards: data/flashcards-nav.json (108 cards). Diagrams: 81 static in diagrams/mc-nav-*.svg plus 5 SMIL animations in diagrams/anim/mc-nav-*.svg, made by a generator script in the scratchpad.
Note: canada.ca (NRCan, Canadian Beacon Registry) blocked; declination from the NOAA calculator as already logged in research/2026-10-11-fn.md.

## Read directly (fetched)
| Source | URL | Used for | Certainty |
|---|---|---|---|
| BC Search and Rescue Association, 2022 Year in Review (PDF, text extracted) | https://bcsara.com/wp-content/uploads/2023/09/BCSARA_2022_Year_In_Review_Report.pdf | 1,510 GSAR tasks, 2,087 deployments, 67 callouts over 24 h, 1,019 lives saved, 12% and 43% figures, activity chart (hiking 41, other recreation 26, biking 11, driving 8, skiing 7, sledding 7: my pairing of chart labels, 80%), top 10 worst things list, "call for help and call early" story, no charge for rescue, GSAR activated by agencies | 95% (chart 80%) |
| Global News, BC SAR calls back to pre pandemic levels (2023) | https://globalnews.ca/news/9571096/bc-search-and-rescue-calls-pre-pandemic-levels | Call totals 2003, 2020, 2021, 2022 | 75% |
| Global News, AdventureSmart STOP (25 January 2023) | https://globalnews.ca/news/9437036/b-c-adventure-smart-safety-plan-stop | STOP wording, "harder to find you if you move", "you want to be found" | 75% |
| North Shore Rescue, Outdoor safety | https://www.northshorerescue.com/education/outdoor-safety/ | Stay calm, stay put, call 911 early and ask for police, no cost, signals, avoid going downhill into ravines, trip plan, turnaround time, 10 essentials and a night out | 75% |
| Popular Science (Undark), The burgeoning science of search and rescue, Sarah Scoles, 22 January 2024 | https://www.popsci.com/environment/the-burgeoning-science-of-search-and-rescue/ | Koester ISRID (about 300,000 incidents), hunters get lost following an animal through dense brush, about 100 feet downhill and off trail, staying put rated excellent | 65% |
| avalanche.org, FACETS | https://avalanche.org/avalanche-encyclopedia/human/decision-making/human-factors/f-a-c-e-t-s/ | Six heuristic traps and their descriptions | 80% |
| ASRC Lost Person Behavior draft table (2007) | https://www.archive.asrc.net/ASRC-Operations/ASRC-Operations-Manual/2007-03-12-ASRC-OpsMan-Lost-Person-Behavior-draft.pdf | Hunter distance quartiles 1.0 / 1.5 / 2.4 / max 5.0 with no units stated. NOT used in lessons (units unclear) | under 60% |
| Hunt Map app code (app/map/tools-track.js, offline.js, location.js, tools-main.js) | local | Back to start wording, 15 m "at the start", GPS good and weak wording, MAX_ACC 30 m skip, Keep my saved maps text, compass mode toast, Measure from here tile | 99% |

## Search previews only
| Source | Used for | Certainty |
|---|---|---|
| CTV News and North Shore News on BCSARA hiking data | 271 calls for lost or no navigation, footwear, unaware of difficulty; 504 hiking calls | 70% |
| Backpacker / SSAA / outdoorhub summaries of Koester | Hunter traits: won't admit lost, may avoid searchers out of embarrassment; "83% downhill" (RCMP profile) | 55% (not used as fact; one line labelled Tip) |
| Koester quote via search summary | "spatial disorientation, often related to intense concentration following game or a blood trail" | 60% |
| McCammon 2004 paper descriptions (mtntactical, powderguide, smsr) | 715 accidents 1972 to 2003; correlation not cause | 75% |
| NRCan NTS maps page, GeoNB, Alberta metadata, archive catalogues | Two standard scales 1:50,000 and 1:250,000; sheet area about 1,000 square km; 20 m interval common, older sheets 100 ft | 70 to 85% |
| Scout Resources, Modern Survival Blog, World Scouting solar compass, tradbow | Shadow stick: 1 m stick, 10 to 15 minute wait, first mark west, errors, equal shadow variant | 60% |
| Colorado Parks and Wildlife, Manitoba moose fact sheet, Alaska DFG, NPS Glacier Bay | Moose warning signs, run and use a tree, most charges are bluffs | 75 to 85% |
| CBC (safety bars and ATV rollovers), DriveSmartBC / BC Coroners Service summary, UBC Injury Insight | Almost 13 ATV deaths a year in BC, about half rollovers; coroner 2009 to 2018: Interior 46.5%, alcohol or drugs about half | 60 to 65% |
| GPS Central, Outfitter Satellite, The Outbound | PLB: one way SOS on 406 MHz, no plan, 121.5 MHz homing; messenger: two way, plan | 60% |
| Global News AdventureSmart follow up | Hazardous rest spots (swift water, cornices, ledges), shelter and fire make you visible, bright gear in the open | 70% |

## Carried over from existing lessons (already logged by their authors)
- NOAA WMM declination (Heffley Creek 15.17 E, Mission 15.20 E, Osoyoos 14.58 E), Little Book of Orienteering Techniques, Wikipedia resection: research/2026-10-11-fn.md.
- gps.gov 4.9 m, Apple satellite SOS and temperature pages, Battery University, Energizer: research/2026-10-11-fn.md.
- BCSARA signals, Max Planck circles, Hug a Tree, AdventureSmart 10 essentials: content/phase2/16-lost-survival-kit.md.
- Wilderness Medical Society via American Family Physician, Kamloops climate normals: content/phase2/15-cold-injuries.md and 18-shelter-night-out.md.
- BC Wildfire Service campfire rules, HealthLink BC water: content/phase2/17 and 19.
- Federal boating rules, BC FVPA, synopsis page 11: content/phase2/02-water-safety.md; ATV rules: 04-atv-rules.md.
- Red Cross ice thickness, Minnesota DNR: content/phase2/23-ice-cold-water.md. WildSafeBC: content/phase2/20.
- BC no fall back from March 2026 (BC government release): content/phase2/52 and phase2/15.

## My calculations
- Sun for Heffley Creek 50.858 N 120.269 W and Mission 49.13 N 122.31 W (script mcnav-sun.py in scratchpad, simple solar position equations, refraction minus 0.833 degrees): 15 Oct 2026 Heffley rise 7:25 at 103 degrees, solar noon 12:46 at 30 degrees up, set 18:09 at 257 degrees; 15 Nov (UTC minus 7) rise 8:18 at 119, noon 12:45 at 21 up, set 17:14 at 241. Mission 15 Oct noon 12:55, rise 102, set 257. 85%.
- Legal light end (sunset plus 1 h, BC time): 19:08 (15 Oct), 18:48 (25 Oct), 18:37 (31 Oct), 18:14 (15 Nov). 85%.
- Contour gap to slope at 1:50,000 and 20 m: 2 mm 11.3 degrees, 1 mm 21.8, 0.5 mm 38.7. 95%.
- Scale conversions. 99%.

## Conflicts found (for the lead)
- content/phase2/38-route-planning.md says clocks go back on 1 November 2026 (90%) and gives 15 November times in standard time (sunset 16:14, legal light 17:14). content/phase2/52 and 15 and phase3/51 say BC no longer falls back (95%, BC government release, 2 March 2026). This Masterclass uses BC time with no fall back (15 Nov sunset 17:14, legal light end 18:14) and flags the conflict as VERIFY in chapter 9.

## VERIFY list
- Clock change conflict above.
- Canadian Beacon Registry rules for PLBs (canada.ca blocked).
- Apple satellite SOS cost after the free 2 years.
- Kamloops Fire Centre campfire status after 9 October 2026; exact water or tool wording on the current order.
- Compass and gear prices (not given).
- Walking onto unsafe ice to retrieve game is not "reasonable effort": ask a conservation officer (carried over).
