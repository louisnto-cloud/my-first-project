# SPOTS.md: Spot Finder data pipeline (where to go, exactly)

Owner asks (2026-10-02 and 10-03): thousands of locations on a map; popular spots and quiet hidden ones; drive in, ATV, walk in, multi day backpack, camping; where to park, where to walk, where to camp; what species, what month; Google Maps links; migration maps; quail hotspots; "get out of the car, walk 100 m and find animals". The map UI is MAP.md. This file is the data.

## The honest frame (read first)
- Nobody publishes where hunters actually go, and true secret spots are secret. Anything that claims to know them would be invented. We never invent.
- What exists, official and free, is what onX itself shows: land status, closures, habitat, roads, trails. We combine these into **candidate spots** with a score and the evidence list. Every spot says "candidate, scout it first".
- "Busier" and "quieter" are estimates from access (distance from roads, towns and rec sites, motor vehicle closures). Label them "(estimate)".
- Every legal flag names its source and a certainty %. Data dates are shown. "Check posted signs" is on every spot.

## Areas
| Key | Name | Box (lon min, lat min, lon max, lat max) | Base |
|---|---|---|---|
| A | Kamloops, North Thompson, Bonaparte, Shuswap west | -121.6, 50.2, -119.4, 51.9 | Heffley Creek 50.8581, -120.2687 |
| B | Mission, Fraser Valley, Harrison, Hope, Fraser Canyon | -122.9, 49.0, -121.3, 49.95 | Mission 49.1327, -122.3045 |
| C | South Okanagan and Similkameen (quail trip) | -120.1, 49.0, -119.2, 49.7 | Oliver 49.1830, -119.5500 (assumption) |
| D | Merritt, Nicola and North Okanagan | -121.3, 49.7, -118.6, 50.5, minus A's box (so D1 -121.3 to -119.4 at 49.7 to 50.2, D2 -119.4 to -118.6 at 49.7 to 50.5) | Merritt 50.1113, -120.7862 (Nominatim) |
| E | Cariboo south: 100 Mile House to Williams Lake | -122.6, 51.2, -120.4, 52.3, minus A's box (west of -121.6, or north of 51.9) | 100 Mile House 51.6428, -121.2957 (Nominatim; the town itself is in A) |
| F | East Kootenay: Cranbrook, Fernie, Invermere | -116.6, 49.0, -114.6, 50.6 (no overlap: A to E all lie west of -118.6) | Cranbrook 49.5107, -115.7673 (Nominatim) |
| G | Shuswap and Revelstoke: Salmon Arm, Sicamous, Enderby north, Mara and Mabel lakes, Seymour Arm, Revelstoke | -119.4, 50.5, -117.6, 51.6 (west edge is A's east edge, south edge is D's north edge; A and D listed as cut outs) | Salmon Arm 50.7005, -119.2791 (Nominatim) |
| BC | Province wide, small layers only | whole province | none |

Build A first, then B, then C, then D and E (2026-10-04). Areas never overlap: D and E cut out A's box (`excl` in the pipeline's area table). Seasons: D is Regions 3 and 8, E is Regions 5 and 3 (each spot's region comes from the MU layer). F (2026-10-04) is Region 4: CWD Management Zone flag on every spot in MUs 4-1 to 4-8 and 4-20 to 4-25, region wide feeding and baiting ban, East Kootenay Trench wolf note, Cranbrook Deer Hunt note, and the Region 4 No Hunting and No Shooting map areas as exclusions or flags; elk and wild turkey get their own spots. G (2026-10-04) spans Regions 3, 4 and 8 (MUs 3-26, 3-34 to 3-37, 3-41, 3-42; 4-29 to 4-33, 4-37 to 4-39; 8-23 to 8-26): Region 4 spots carry the region wide feeding and baiting ban (no G MU is in the CWD zone), Region 3 Maps C8 Blind Bay, C9 Sicamous and C10 Salmon Arm are exclusions, national parks (Mount Revelstoke, Glacier) come from CLAB_NATIONAL_PARKS, quail only in Region 8. Owner's own onX pins seen in screenshots: Upper Louis Creek Road (area A) and near Mission and Hope (area B).

## Data sources (BC Data Catalogue WFS, free, no key; build time only: the server does not allow browser access from github.io)
Endpoint: `https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326&typeName=pub:<LAYER>&bbox=<lonmin>,<latmin>,<lonmax>,<latmax>,EPSG:4326&maxFeatures=5000&startIndex=<n>` (version 1.0.0 bbox order is lon,lat). CQL: `&CQL_FILTER=...` (geometry column `GEOMETRY`). One request at a time, User-Agent header, retry with backoff, cache raw pages in the scratchpad (never in the repo).

| Layer | Use | Key fields | Scope |
|---|---|---|---|
| WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW | MU (Management Unit) boundaries and labels | WILDLIFE_MGMT_UNIT_ID, REGION_RESPONSIBLE_NAME | BC |
| WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW | parks, ecological reserves, protected areas | PROTECTED_LANDS_NAME, PROTECTED_LANDS_DESIGNATION | BC |
| WHSE_ADMIN_BOUNDARIES.CLAB_INDIAN_RESERVES | reserves (permission needed) | ENGLISH_NAME | BC |
| WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP | city limits (local firearm bylaws) | ADMIN_AREA_NAME | BC |
| WHSE_WILDLIFE_MANAGEMENT.WAA_MVPR_AREAS_SP and WAA_MVPR_ROUTES_SP | Motor Vehicle for Hunting Closed Areas, ATV closures, open routes | REGULATION_GEOGRAPHIC_NAME, PROHIBITION_TYPE, EFFECTIVE_DESCRIPTION, ACCESS_STATUS, ACCESS_RANGE, MU_NUMBER, MAP_NUMBER | BC |
| WHSE_ADMIN_BOUNDARIES.CLAB_NATIONAL_PARKS | national parks (no hunting), merged into the parks layer | ENGLISH_NAME | BC |
| WHSE_TANTALIS.TA_WILDLIFE_MGMT_AREAS_SVW | Wildlife Management Areas | WILDLIFE_MANAGEMENT_AREA_NAME | BC |
| WHSE_WILDLIFE_MANAGEMENT.WAA_LTD_HNT_ZONE_CURR_YEAR_SVW | LEH (Limited Entry Hunting) zones, info only | LIMITED_ENTRY_HUNTING_ZONE, LTD_ENTRY_HUNTING_ZONE_TYPE | BC |
| WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP | official winter ranges by species | SPECIES_1, SPECIES_2 (M-ODHE mule deer, M-ODVI white tailed deer, M-ALAM moose, M-CEEL elk, M-OVCA bighorn, M-ORAM goat, M-RATA caribou) | BC if under budget, else areas |
| WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW | private land (OWNER_TYPE='Private'), dissolved | OWNER_TYPE, PARCEL_CLASS, MUNICIPALITY | areas |
| WHSE_FOREST_VEGETATION.RSLT_OPENING_SVW | cutblocks with dates (5 to 20 years old feed deer, moose, bear, grouse) | APPROVE_DATE, DISTURBANCE dates if present | areas |
| WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP | burns by year | FIRE_YEAR, FIRE_SIZE_HECTARES | areas |
| WHSE_FOREST_VEGETATION.BEC_BIOGEOCLIMATIC_POLY | habitat zones (BG, PP, IDF low; ICH, MS mid; ESSF, IMA high) | ZONE, SUBZONE, MAP_LABEL | areas |
| WHSE_BASEMAPPING.FWA_LAKES_POLY, FWA_WETLANDS_POLY | duck water, moose wetlands, camp water | GNIS_NAME_1, AREA_HA | areas |
| WHSE_FOREST_TENURE.FTEN_ROAD_SECTION_LINES_SVW | forest service and permit roads | ROAD_SECTION_NAME, FILE_TYPE_DESCRIPTION, FILE_STATUS_CODE | areas |
| WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP | all roads, surface, class, names | ROAD_CLASS, ROAD_SURFACE, ROAD_NAME_FULL | areas |
| WHSE_FOREST_TENURE.FTEN_REC_SITE_POINTS_SVW, FTEN_REC_TRAIL_HEADS_SVW, FTEN_REC_TRAILS_SVW, FTEN_RECREATION_POLY_SVW | rec sites (camping counts, official driving directions, listed activities incl. Hunting), trailheads, trails | PROJECT_NAME, DRIVING_DIRECTIONS, NUM_CAMP_SITES, ACTIVITY_DESC1..n, CLOSURE_DESCRIPTION | areas |
Elevation: AWS terrarium tiles (decode PNG: R*256 + G + B/256 - 32768) at z 12, cached in the scratchpad. Slope and aspect from the same grid.

## Spot categories (each spot has one)
- `drive`: target within 300 m of a drivable public or forest road. For grouse this is a roadside route (walk the road at dawn and dusk).
- `atv`: reached on a road or trail where motor vehicles are allowed for hunting at that time (outside closures, respecting ATV closures such as MU 3-28, 3-29, 3-30 from 1 September to 10 December and the Region 3 1,700 m rule). 1 to 10 km from pavement.
- `walk`: 0.3 to 5 km on foot from the parking point (often behind a gate or inside a Motor Vehicle Closed Area).
- `backcountry`: more than 5 km from any drivable road; a 2 to 3 day trip with a camp.
- `camp`: rec sites with campsites (official) and Crown land camp candidates (flat, near water, not private, not a park, not a reserve).
- `quail`, `duck`, `deer`, `moose`, `elk`, `bear`, `grouse`, `sheep` are species tags, not categories (a spot can carry several).

## Scoring (opinion, labelled "my pick"; weights tunable)
- Deer: inside or near mule or white tailed deer winter range (+3 from October), cutblock 5 to 20 years old within 1 km (+2), burn 2015 to 2023 within 1 km (+2), BEC BG, PP or IDF (+2), MS (+1), south or west aspect (+1), edge with fields within 2 km (+1, fields are private).
- Ducks: lake or wetland 1 to 200 ha within 500 m of a road (+3), 3 or more wetlands within 2 km (+2), river backwater or oxbow (+2), under 900 m (+1); excluded: parks, sanctuaries, National Wildlife Areas, city limits.
- Grouse: forest road 3 to 10 km long through IDF, MS, ESSF or ICH with cutblock edges and aspen or riparian edges (+3).
- Moose: wetland complexes plus young cutblocks or burns, moose winter range (+3 from November).
- Quail (area C): Crown land under 700 m within 1 km of farmland or a creek, BG or PP zone, brushy draws; excluded: Vaseux Lake and other sanctuaries, National Wildlife Areas, parks, city limits.
- Busier or quieter (estimate): busier when within 1 km of a rec site, paved road or town, or under 30 minutes from a city; quieter when 2 km or more behind a gate or closure; remote when more than 5 km from roads.

## Legal flags per spot (fact, with source and certainty)
MU and region; inside a Motor Vehicle Closed Area or ATV closure (dates); park, ecological reserve, protected area; reserve; city limits (Kamloops bylaw 24-49, 99%); private parcels touching the walk route (ParcelMap BC, data date); 1,700 m Region 3 rule (elevation); road allowance rule near numbered highways and 2 lane public roads; season rows from data/regs.json for that species and region; banner line.

## Plan per spot (generated text, short lines, under 160 words)
1. Drive: from the base, road names from the road atlas, official rec site driving directions when present, distance as the crow flies times 1.3, "(estimate)".
2. Park: coordinates, what the point is, Google Maps and Apple Maps links.
3. Walk or ride: the named road or trail, distance to the evidence, climb if known, time at 3 km/h.
4. Camp (for backcountry and camp spots): where, water, flat ground, distance.
5. Hunt: species, months, the edge or feature to watch, time of day, where to sit or glass (Tip).
6. Use: rifle and load for deer; shotgun, choke and non toxic shot for ducks; .22 rimfire or shotgun for grouse; shotgun for quail.
7. Legal: the flags, the season rows, the banner.
8. Verify: "Candidate only. Check posted signs. Private land can be unsigned. Data dates: ...".

## Migration and seasons layers
- Winter ranges (official UWR) per species with months shown (deer and moose: about November to April, from the research file).
- Summer and transition bands per species from BEC zones and elevation (general pattern from cited studies, not mapped corridors; label "general pattern").
- `data/migration.json` (written by the research agent): species, month, likely zones and elevation bands, certainty, source. The map's month slider uses it.
- Ducks: staging waters (large wetlands and lakes in valleys) plus the flyway timing; quail and chukar: no migration (say so), resident habitat only.

## Output files (repo, keep total under about 150 MB)
- `data/layers/manifest.json` (contract in MAP.md).
- `data/layers/bc/*.geojson` (province wide small layers, simplified about 50 to 100 m, 5 decimals).
- `data/layers/<area>/*.geojson` or `.pmtiles` (area layers, simplified about 10 to 20 m). Any single GeoJSON over 6 MB: split by MU or convert to PMTiles (python `pmtiles` plus `mapbox-vector-tile` from PyPI; do not clone GitHub repos).
- `data/spots/<area>/spots.geojson` (points with all properties and the plan), `data/spots/<area>/routes.geojson` (walk and ride lines), `data/spots/<area>/camps.geojson`.
- `data/spots/<area>/meta.json` (counts, layer dates, box, notes).
- Scripts: `scripts/spots-pipeline.py` (rerunnable, cached), `scripts/SPOTS-PIPELINE.md` (how to run, timings, gaps). A GitHub Actions job can rerun it monthly later.

## Map links
- Google Maps pin: `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>`; directions: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>`.
- Apple Maps: `https://maps.apple.com/?ll=<lat>,<lon>&q=<name>`.

## Accuracy rules for this feature
- A spot never claims animals are there. It shows the evidence and the score.
- Legal flags are facts with sources and dates. Everything else is labelled opinion (Tip, my pick, estimate).
- No invented names: GNIS names, road atlas names, rec site names as given; otherwise "2.3 km NE of Mayson Lake rec site".

## 2026-10-04 area A rerun
- Area A now applies Region 3 Map C8 Blind Bay and the Roderick Haig Brown Recreation Area closure (MU 3-37).
- The park is named TSUTSWECW PARK in TA_PARK_ECORES_PA_SVW (renamed from Roderick Haig-Brown, 90
## 2026-10-04 area A rerun
- Area A now applies Region 3 Map C8 Blind Bay and the Roderick Haig Brown Recreation Area closure (MU 3-37).
- The park is named TSUTSWECW PARK in TA_PARK_ECORES_PA_SVW (renamed from Roderick Haig-Brown, 90%). Zone = park land south of the Squilax Anglemont Road bridge over the Adams River, plus 100 m (estimate, VERIFY).
- No area A spot sat inside either zone; one nearby spot now carries the warning.
