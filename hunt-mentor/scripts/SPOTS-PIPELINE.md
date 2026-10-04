# SPOTS-PIPELINE.md: how to run the Hunt Map data pipeline

Spec: `SPOTS.md` (data) and `MAP.md` "Data contract with the pipeline" (manifest).
Script: `scripts/spots-pipeline.py` (Python 3.11). Rerunnable. Every download is cached.

## Run it
- Install: `pip install numpy shapely pyproj scipy pillow pmtiles mapbox-vector-tile`
- Pick a cache folder outside the repo. Raw downloads never go in the repo.
- Everything, all areas:
  `python3 scripts/spots-pipeline.py --cache /path/to/gis-cache --areas A,B,C --steps all`
- Only rebuild spots and the manifest (no downloads):
  `python3 scripts/spots-pipeline.py --cache /path/to/gis-cache --areas A,B,C --steps spots,manifest`
- Run `manifest` with all areas, so every area stays listed.
- The cache used on 2026-10-03 and 04: the session scratchpad `.../scratchpad/gis/` (`raw/`, `dem/12/`, `work/`).

## Steps (in order)
| Step | What it does | Time (this machine) |
|---|---|---|
| fetch | BC Data Catalogue WFS pages, one request at a time, cached in `raw/` | about 23 min for A, B, C (first run) |
| dem | AWS terrarium z12 tiles, then an elevation grid per area | 7 min first run; seconds after |
| layers | clean, simplify, write `data/layers/bc/*` and `data/layers/<area>/*` | A 5 min; B and C 5 min |
| spots | score, pick, refine and write `data/spots/<area>/*` | A 1 min 45 s; B 30 s; C 35 s |
| migration | seasonal bands per species, duck waters, quail habitat | 40 s for all three |
| manifest | write `data/layers/manifest.json` | under 1 s |

## How a spot is made
1. Grid (200 m) scores per species, weights in `W` at the top of the script (my pick, from SPOTS.md).
2. Local best cells, then spacing (800 m or more) and a minimum score (`MIN_SCORE`).
3. Caps per species and category (`CAPS`), spread round robin over 15 km tiles (`balanced_cap`).
   Without this, the big official winter ranges east of Kamloops took every deer slot and Heffley Creek had none.
4. Access from the road network (Digital Road Atlas, forest roads, rec trails): park point, walk or ride line, category.
5. Exact vector checks: evidence with points, legal flags with source, date and certainty, season rows from `data/seasons/region<R>.json` by MU and species tag (fallback `data/regs.json`, then VERIFY).
6. Targets within 10 m of private land, parks, reserves or city limits are dropped.
7. Plan text (7 or 8 short lines), Google Maps and Apple Maps links, a style check for hyphens and dashes.

## Rules baked in
- Names: rec site, lake, river and BC Geographic Names as given; otherwise "1.2 km SW of Louis Creek". Never invented.
- Deer: no approved deer winter range near Kamloops or Heffley Creek. There the top score is 8 of 11, from cutblocks, burns, habitat zone, aspect and fields. Each such spot says so in its evidence.
- Burns under 10 ha do not score (`BURN_MIN_HA`, my pick).
- Named trails in the road atlas (rail, horse, snowmobile, bike) are walk only; rec trails count as ATV (all terrain vehicle) only when motorized use is listed.
- Busier, average, quieter and remote are estimates from access. Labelled "(estimate)".
- Season rows: `data/seasons/region2.json`, `region3.json`, `region5.json`, `region8.json` (synopsis 2 October 2026 season tables, every MU expanded). Deer covers mule and white tailed deer; grouse covers sharp tailed grouse where listed. No file row: `data/regs.json`; still nothing: "VERIFY" with empty months.
- Duck spots: `data/seasons/migratory.json` by MU (federal Migratory Birds Regulations, 2022, Schedule 3, Part 10: district, dates, daily and possession limits). A duck spot lists ducks, Canada geese, white fronted geese, snow and Ross's geese, coots and snipe; its months come from the duck row only. MUs 2-1, 3-45, 3-46, 5-16 and 7-1 are in no district: "No open season" (90%). Districts 1 and 2 dates move each year: rows hold the 2026 to 2027 dates.
- Spot months come from the general rows (youth only and private land only rows left out). The card shows "Open today" live.

## Outputs and sizes (2026-10-04)
- `data/layers/**`: 86 MB. Biggest: A cutblocks 18.2 MB, A forest roads 9.4 MB, A habitat zones 9.2 MB (PMTiles).
- `data/spots/**`: 17 MB (A 8.0 MB, B 3.0 MB, C 5.6 MB including routes).
- Total about 106 MB (budget about 150 MB).
- Each area folder has `meta.json`: counts, layer dates, scoring weights, dropped counts, notes.

## Gaps (honest list)
- Season rows (2026-10-04): every non camp spot in A, B and C has rows. 35 show "No general open season" (34 Region 5 moose, 1 Region 2 moose: LEH only or no row) and 1 duck spot in MU 3-45 shows "No open season" (no federal district).
- Districts 1 and 2 duck and goose dates in `migratory.json` are for 2026 to 2027. Redo them each July.
- Moose in area B: 5 spots only. Coastal moose habitat is thin and the scoring zones exclude CWH.
- Sanctuaries and National Wildlife Areas are not in the data. Vaseux Lake is handled with a 2 km exclusion; any other sanctuary needs a check on the ground.
- Gates, washouts and deactivated roads are not in the data. A road on the map can be closed.
- Road allowance and local bylaws: flagged only for numbered highways, 2 lane paved roads and city limits.
- Elk and sheep get evidence tags only (LEH or no season data), not their own spots.
- B and C layers were built from the same cached download as A (2026-10-03). Rerun `fetch` monthly for fresh closures and cutblocks.
