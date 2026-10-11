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
- Areas D and E (2026-10-04): `--areas D,E --steps fetch,dem,layers,spots,migration`, then `--areas A,B,C,D,E --steps manifest`.
- Area F (2026-10-04): `--areas F --steps fetch,dem,layers,spots,migration`, then `--areas A,B,C,D,E,F --steps manifest`. Fetch also caches a few OpenStreetMap outlines from Nominatim (`osm/`, 1.5 s apart) for Region 4 map areas that have no official polygon.
- Area G (2026-10-04): `--areas G --steps fetch,dem,layers,spots,migration`, then `--areas A,B,C,D,E,F,G --steps manifest`.
- Run `manifest` with all areas, so every area stays listed. The manifest also carries `areaBoxes` and `areaNames` for the app.
- The cache used on 2026-10-03 and 04: the session scratchpad `.../scratchpad/gis/` (`raw/`, `dem/12/`, `work/`).

## Steps (in order)
| Step | What it does | Time (this machine) |
|---|---|---|
| fetch | BC Data Catalogue WFS pages, one request at a time, cached in `raw/` | about 23 min for A, B, C (first run); D 20 min (Vernon parcels, many 504 retries); E 5 min; F 11 min; G 5 min (DEM 2 min) |
| dem | AWS terrarium z12 tiles, then an elevation grid per area | 7 min first run; seconds after |
| layers | clean, simplify, write `data/layers/bc/*` and `data/layers/<area>/*` | A 5 min; B and C 5 min |
| spots | score, pick, refine and write `data/spots/<area>/*` | A 1 min 45 s; B 30 s; C 35 s; D 65 s; E 58 s; F 75 s; G 55 s |
| migration | seasonal bands per species, duck waters, quail habitat | 40 s for all three |
| manifest | write `data/layers/manifest.json` | under 1 s |

## Cut outs (areas never overlap)
- An area can list `excl` boxes (lon min, lat min, lon max, lat max). D and E cut out A's box.
- Fetch skips tiles that lie wholly inside a cut out; the analysis grid marks cut out cells out of the area; area layers are clipped (`emit`); a spot whose point lands in a cut out is dropped (`inOtherArea` in meta stats).
- Private parcels are fetched in pages of 2000 (`page` per layer): dense Vernon tiles timed out at 5000. A Java exception reply from the server is retried 5 times with a growing wait.

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
- Area D: Hwy 97C (Okanagan Connector) from Aspen Grove to Peachland is a 400 m no hunting or shooting strip (synopsis page 10): targets left out, routes flagged. Swan Lake north of Vernon (Map J17, No Shooting or Hunting Area): 500 m buffer, targets left out (my pick). Quail spots only in Region 8 (`QUAIL_AREAS`; Region 3 has no quail season).
- Area E: grouse zones add SBPS and SBS (my pick, `GROUSE_ZONES_EXTRA`).
- Spot months come from the general rows (youth only and private land only rows left out). The card shows "Open today" live.

## Area F: Region 4 rules (2026-10-04)
- Winter ranges in Region 4 list several species in one field (`M-CEEL;M-OVCA;M-ODHE`): split on `;` (`sps`). They come in about 100,000 small pieces: the map layers dissolve them per UWR number (pieces under 5 ha dropped, 30 m simplify, PMTiles); spots use every piece. Sheep tags count only ranges where sheep is listed first.
- CWD (Chronic Wasting Disease) Management Zone (MUs from `region4.json` `cwdZone`): flag with the head sampling and brain and spine transport rules, 24 hour route note for MU 4-25, a short line in the plan, `cwd: true` on the spot. The CWD sentence is stripped from season row notes (those rows also cover MUs outside the zone).
- Every Region 4 spot: feeding and baiting ban (ungulates and turkeys) and the snowmobile for hunting closure. Wolf note below 1,100 m in the listed Trench MUs and 4-4 to 4-7 (90%, Trench line not mapped). Deer spots in 4-3, 4-4, 4-5, 4-20: Cranbrook Deer Hunt (Map D27) note; the January row is treated as limited (not in spot months).
- Motor vehicle closures: the WAA_MVPR_AREAS_SP layer has the Region 4 list (120 polygons), used as for other areas. Not in that layer: Soowa Mountain (4-2), Baynes Lake (Map D11, flag only), Oveson Creek.
- Map areas (`_region4_zones`): D2 Elizabeth Lake (closure polygon plus lake), D23 Columbia Lake and River sanctuary (closure polygon, lake plus 300 m, river reach plus 200 m), D9 Skookumchuck mill, D13 and D16 Elk Valley mines, D19 Fairmont and D20 Windermere (2 km), D22 Radium (limits plus 1 km), D10 Wasa Slough (no GNS name: 1.5 km around Wasa), D12 Sulphur Creek (1 km), Whiteswan FSR (65 m), D1 McDougall (closure polygon): targets inside left out, nearby spots flagged. D17 Canal Flats shot only (3 km, under 1,067 m): big game dropped. D14 Hwy 3: 400 m strip from the westernmost Michel Creek bridge east of Sparwood (Loop Bridge not in the data, assumption) to the Alexander Creek crossing. All edges my pick or estimate, and the flag says so.
- Elk spots (weights in `W['elk']`, max 11, min 7) and turkey spots (`W['turkey']`, under 1,100 m, max 5, min 4) only where `ELK_AREAS` and `TURKEY_AREAS` list the area. `AREA_CAPS` trims F grouse (80) and moose (60) per category for the size budget. Spots outside every BC MU (Alberta side of the box) are dropped (`outsideBC`).
- F sizes: layers 22.4 MB, spots 13.0 MB (1,695 spots). Migration bands in F use `MIG_POLY` (3 km2 minimum, 250 m simplify).

## Area G: Shuswap and Revelstoke (2026-10-04)
- Box -119.4, 50.5, -117.6, 51.6. It touches A (west) and D (south) without overlap; both are listed in `excl` anyway. Base Salmon Arm (Nominatim).
- Regions from the MU layer: 3 (3-26, 3-34 to 3-37, 3-41, 3-42), 4 (4-29 to 4-33, 4-37 to 4-39) and 8 (8-23 to 8-26). Seasons from `region3.json`, `region4.json`, `region8.json` and `migratory.json`.
- Region 4 spots: feeding and baiting ban and snowmobile closure (as in F). No G MU is in the CWD zone. The Trench wolf note is only applied in F (`R4_TRENCH_AREAS`): the 4-37 corner of G is not the Trench (my reading).
- Closures in the WAA_MVPR_AREAS_SP layer cover Downie Creek (4-38, Motor Vehicle Hunting Closed Area) and Joss, Tsuius and Mabel mountains (Map J21).
- Region 3 Maps C8 Blind Bay, C9 Sicamous and C10 Salmon Arm (`_shuswap_zones`, `R3_SHUSWAP_AREAS`): C9 from Semaphore Point (Murdock Point is not in BC Geographical Names: north south line through Semaphore Point, estimate), the Sicamous Creek mouth and FWA lakes within 15 km; C10 Shuswap Lake water within 1.5 km of the Salmon Arm city limits (my pick); C8 1.5 km around Reedman Point and Blind Bay (my pick). Targets inside left out, nearby spots flagged.
- National parks: new BC layer `natparks` (WHSE_ADMIN_BOUNDARIES.CLAB_NATIONAL_PARKS) merged into `parks` (designation "National park", no hunting). Mount Revelstoke and Glacier now show on the parks layer for every area.
- `AREA_CAPS` G: grouse 80, moose 80. Quail only in Region 8 (`QUAIL_AREAS`). Coarse migration bands (`MIG_POLY`). No elk or turkey spots in G.
- G sizes: layers 12 MB, spots 7.1 MB (1,052 spots, 1,221 routes, 99 camps). 0 VERIFY. 18 style lines, all official road names (Trans-Canada Hwy, Three Valley-Mabel FSR and similar).

## Outputs and sizes (2026-10-04)
- D: layers 17.1 MB, spots 10.8 MB. E: layers 13.2 MB, spots 10.0 MB. All data now about 157 MB (layers 115, spots 42), a little over the 150 MB budget.
- `data/layers/**`: 86 MB. Biggest: A cutblocks 18.2 MB, A forest roads 9.4 MB, A habitat zones 9.2 MB (PMTiles).
- `data/spots/**`: about 21 MB. Per area: `index.geojson` (light points for the map: id, name, cat, species, score, busy, mu, months; A 422 KB, B 132 KB, C 323 KB), `detail/<tile>.json` (full spot properties keyed by id, fetched when a spot is tapped), `routes/<tile>.geojson` (fetched for tiles in view from zoom 12), `camps.geojson`, `meta.json`. Tile = 0.25 degree grid, key `floor(lon/0.25)_floor(lat/0.25)`; routes go in their spot's tile. The old whole area `spots.geojson` and `routes.geojson` are no longer written (2026-10-04).
- Total about 106 MB (budget about 150 MB).
- Each area folder has `meta.json`: counts, layer dates, scoring weights, dropped counts, notes.

## Gaps (honest list)
- D and E (2026-10-04): every non camp spot has season rows, 0 VERIFY. E: 264 Region 5 moose spots (all of them) show "No general open season" (Region 5 moose is LEH only); 30 Region 3 moose spots in E have a general season. Sharp tailed grouse rows say "No general open season" in 3-12, 3-13 and Region 8 MUs and in some Region 5 MUs (the grouse row itself is open).
- 100 Mile House sits inside area A. Area E starts about 20 km west (west of -121.6) and north of 51.9 (Lac la Hache north to Williams Lake and the Fraser).
- Region 5 regional No Shooting Areas were not reviewed against the synopsis map pages (no Region 5 study file yet). Silver Star Park No Hunting Area (Map J16) is covered only by the park polygon.
- E has no moose winter range in the UWR layer (only mule deer and goat).
- FWA source typo kept as given: "CanoeLake" in area E.
- The style checker flags official road names with hyphens (Hornet-Deadman FSR, Merritt-Princeton Hwy 5A): D 34 lines, E 43, all names (same as A, B, C).
- Season rows (2026-10-04): every non camp spot in A, B and C has rows. 35 show "No general open season" (34 Region 5 moose, 1 Region 2 moose: LEH only or no row) and 1 duck spot in MU 3-45 shows "No open season" (no federal district).
- Districts 1 and 2 duck and goose dates in `migratory.json` are for 2026 to 2027. Redo them each July.
- Moose in area B: 5 spots only. Coastal moose habitat is thin and the scoring zones exclude CWH.
- Sanctuaries and National Wildlife Areas are not in the data. Vaseux Lake is handled with a 2 km exclusion; any other sanctuary needs a check on the ground.
- Gates, washouts and deactivated roads are not in the data. A road on the map can be closed.
- Road allowance and local bylaws: flagged only for numbered highways, 2 lane paved roads and city limits.
- Elk and sheep get evidence tags only (LEH or no season data), not their own spots.
- B and C layers were built from the same cached download as A (2026-10-03). Rerun `fetch` monthly for fresh closures and cutblocks.
