# SPOTS.md: the Spot Finder (where to go, exactly)

Owner ask (2026-10-02): "thousands of locations, drawn on a map, exactly where people park, where they walk, what to hunt, what to use, with Google Maps links, step by step."

## The honest frame (read first)
- There is no dataset of "where hunters go". Hunters do not publish their spots. Anything that claims to know them would be invented. We never invent.
- What exists, official and free, is better than lore: public land, parks, reserves, closures, winter ranges, cutblocks, burns, wetlands, roads, trails, recreation sites. We combine these into **candidate spots**: a real parking point, a real road or trail to walk, and the evidence that game uses the ground. Every spot is labelled "candidate, my pick" with a score. The owner confirms on the ground.
- Every legal flag names its source layer or regulation and a certainty %. Data dates are shown. "Check posted signs" is on every spot card.

## Study areas
| Area | Base | Base coordinates (Nominatim, 2026-10-02) | Box (lon min, lat min, lon max, lat max) | MUs (Management Units) of interest |
|---|---|---|---|---|
| A Kamloops and North Thompson | Heffley Creek | 50.8581, -120.2687 | -121.6, 50.2, -119.4, 51.9 | 3-27, 3-28, 3-26, 3-20, 3-19, 3-29, 3-30, 3-31, 3-32, 3-38, 3-39, 3-40, 3-41, 3-13, 3-14 and any other MU inside the box |
| B Mission and Fraser Valley | Mission | 49.1327, -122.3045 | -122.9, 49.0, -121.6, 49.6 | 2-4, 2-8, 2-9, 2-13 and neighbours |
| C South Okanagan quail trip | Oliver (assumption) | 49.1830, -119.5500 | -120.1, 49.0, -119.2, 49.7 | 8-1, 8-2, 8-9, 8-10 and neighbours |

Build A first. B and C follow the same pipeline.

## Data sources (all BC Data Catalogue via WFS, free, no key)
Endpoint: `https://openmaps.gov.bc.ca/geo/pub/ows?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326&typeName=pub:<LAYER>&bbox=<lonmin>,<latmin>,<lonmax>,<latmax>,EPSG:4326&maxFeatures=5000&startIndex=<n>`
Send a User-Agent header. Page with startIndex. Cache raw responses in the scratchpad (never in the repo). CQL filters: `&CQL_FILTER=...` (GeoServer CQL; geometry column is `GEOMETRY`).

| Layer | Use | Key fields |
|---|---|---|
| WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW | MU boundaries, labels | WILDLIFE_MGMT_UNIT_ID, REGION_RESPONSIBLE_NAME |
| WHSE_FOREST_TENURE.FTEN_REC_SITE_POINTS_SVW | parking and camp points, official driving directions | PROJECT_NAME, SITE_LOCATION, DRIVING_DIRECTIONS, PROJECT_DESCRIPTION, ACTIVITY_DESC1..n (some say Hunting), NUM_CAMP_SITES |
| WHSE_FOREST_TENURE.FTEN_REC_TRAIL_HEADS_SVW | trailheads (parking) | PROJECT_NAME, DRIVING_DIRECTIONS, CLOSURE_DESCRIPTION |
| WHSE_FOREST_TENURE.FTEN_REC_TRAILS_SVW | trails to walk | PROJECT_NAME, ACTIVITY_DESC1, CLOSURE_DESCRIPTION |
| WHSE_FOREST_TENURE.FTEN_RECREATION_POLY_SVW | rec reserves and sites (polygons) | PROJECT_NAME, PROJECT_TYPE |
| WHSE_FOREST_TENURE.FTEN_ROAD_SECTION_LINES_SVW | forest service roads and permit roads (walk routes, ATV routes) | ROAD_SECTION_NAME, FILE_TYPE_DESCRIPTION, FILE_STATUS_CODE, ROAD_SECTION_LENGTH |
| WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP | all roads with surface and class (drive to the parking point) | ROAD_CLASS, ROAD_SURFACE, NUMBER_OF_LANES, ROAD_NAME_FULL if present |
| WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP | official deer and moose winter ranges (where they are from late fall) | SPECIES_1, SPECIES_2 (M-ODHE mule deer, M-ODVI white tailed deer, M-ALAM moose, M-CEEL elk), UWR_NUMBER |
| WHSE_FOREST_VEGETATION.RSLT_OPENING_SVW | cutblocks with dates (young cutblocks 5 to 20 years old feed deer, moose, bear, grouse) | OPENING_ID, APPROVE_DATE, OPENING_STATUS_CODE, DISTURBANCE_START_DATE if present |
| WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP | burns by year (2017 to 2023 burns are prime feed now) | FIRE_YEAR, FIRE_NUMBER, FIRE_SIZE_HECTARES |
| WHSE_FOREST_VEGETATION.BEC_BIOGEOCLIMATIC_POLY | habitat zones (BG bunchgrass, PP ponderosa pine, IDF interior Douglas fir = mule deer country; MS and ESSF higher; ICH wet) | ZONE, SUBZONE, MAP_LABEL, ZONE_NAME |
| WHSE_BASEMAPPING.FWA_LAKES_POLY and FWA_WETLANDS_POLY | duck water, moose wetlands | GNIS_NAME_1, AREA_HA |
| WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW | parks and protected areas (hunting closed unless the BC Parks guide lists it open) | PROTECTED_LANDS_NAME, PROTECTED_LANDS_DESIGNATION |
| WHSE_TANTALIS.TA_WILDLIFE_MGMT_AREAS_SVW | Wildlife Management Areas (rules vary, VERIFY each) | WILDLIFE_MANAGEMENT_AREA_NAME |
| WHSE_WILDLIFE_MANAGEMENT.WAA_MVPR_AREAS_SP and WAA_MVPR_ROUTES_SP | official Motor Vehicle for Hunting Closed Areas and open routes | REGULATION_GEOGRAPHIC_NAME, PROHIBITION_TYPE, EFFECTIVE_DESCRIPTION, ACCESS_STATUS, ACCESS_RANGE, MU_NUMBER, MAP_NUMBER, PDF_NAME |
| WHSE_WILDLIFE_MANAGEMENT.WAA_LTD_HNT_ZONE_CURR_YEAR_SVW | Limited Entry Hunting zones (information only) | LIMITED_ENTRY_HUNTING_ZONE, LTD_ENTRY_HUNTING_ZONE_TYPE |
| WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP | city limits (local firearm bylaws apply inside) | ADMIN_AREA_NAME |
| WHSE_ADMIN_BOUNDARIES.CLAB_INDIAN_RESERVES | reserves (permission needed) | ENGLISH_NAME |
| WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW | private versus Crown land. Heavy: filter with CQL `OWNER_TYPE='Private' AND FEATURE_AREA_SQM>20000` and drop parcels inside city limits; dissolve touching parcels if shapely is available | OWNER_TYPE, PARCEL_CLASS, MUNICIPALITY, FEATURE_AREA_SQM |

Not available here: a "no shooting areas" layer (use the Closed Areas Regulation text and the synopsis maps, by hand), boat launches (the CHRA layer is coastal), OpenStreetMap Overpass (blocked). OpenStreetMap tiles and Nominatim work. Elevation: try `https://api.opentopodata.org/v1/srtm30m?locations=lat,lon|...` (free, 100 locations per call, 1 call per second); if blocked, skip elevation and say so.

## Candidate spot rules (opinion, labelled "my pick")
A spot = parking point + walk route + evidence + legal flags + plan.

Parking point, in order of preference: a recreation site or trailhead (official coordinates and driving directions), a forest service road junction with a public road, a landing or road end on Crown land. Must be outside parks, reserves and city limits, and not inside a Motor Vehicle Closed Area unless the route is an open route in WAA_MVPR_ROUTES_SP.

Evidence scores (sum, show the list on the card):
- Deer: inside or within 1 km of a mule deer or white tailed deer UWR polygon +3; cutblock 5 to 20 years old within 1 km +2; burn 2017 to 2023 within 1 km +2; BEC zone BG, PP or IDF +2, MS +1; south or west aspect if elevation data allows +1; a forest service road or trail to walk from the parking point +1; agricultural fields within 2 km (private, do not enter, but deer feed there at dusk) +1.
- Ducks: lake or wetland 2 to 200 ha within 500 m of a road +3; at least 3 wetlands within 2 km +2; elevation under 900 m +1; river backwater or oxbow +2; not a park or sanctuary (required); Crown shoreline (required unless the parcel is Crown).
- Grouse: forest service road 3 to 8 km long through IDF, MS or ESSF with cutblock edges +3; aspen or riparian edge (BEC ICH or wetland edge) +1; walk route is the road itself.
- Moose and bear: wetland complexes plus young cutblocks or burns; same scoring with wetlands +3, burns +3.
- Quail (area C): Crown parcels under 700 m elevation within 1 km of farmland or a creek, BG or PP zone, outside sanctuaries and parks (Vaseux Lake and the National Wildlife Areas are closed).

Legal flags per spot (each with source and certainty): MU, inside a Motor Vehicle Closed Area (and the open routes), park, reserve, city limits (Kamloops bylaw, 99%), private parcels touching the walk route (from ParcelMap, 95%, "data date" shown), 1,700 m rule for Region 3 (elevation if known), road allowance rule (numbered highway or 2 lane public road within 15 m), Map C closures by hand from the synopsis (text), season rows from data/regs.json for that MU and species.

Plan text per spot (template):
1. Drive: from the base to the parking point, with the road names from the Digital Road Atlas and the official driving directions when a rec site. Distance as the crow flies times 1.3, say "estimate".
2. Park: coordinates, what the point is (rec site, junction, landing), "Open in Google Maps" and "Open in Apple Maps" links.
3. Walk: the named road or trail, how far to the evidence (cutblock edge, burn, wetland), elevation gain if known, time at 3 km/h.
4. Hunt: species, the edge or feature to watch, time of day, where to sit or glass (opinion, Tip).
5. Use: rifle and load from the gear sessions for deer; shotgun, choke and non toxic shot for ducks; .22 or shotgun for grouse (per the legal methods rule book).
6. Legal: the flags above, the season row, the banner line.
7. Verify: "Check posted signs. Private land can be unsigned. Data dates: ...".

## Output files (in the repo, small)
- `data/spots/<area>/index.json`: array of spots `{id, area, name, type: deer|duck|grouse|moose|bear|quail|mixed, score, park: [lat, lon], parkKind, walk: [[lat, lon], ...] (simplified, max 60 points), walkKm, mu, elevM?, evidence: [string], flags: [{text, level: ok|warn|stop, source, cert}], plan: {drive, park, walk, hunt, use, legal, verify}, links: {google, apple, imap}, dataDates: {layer: date}}`
- `data/spots/<area>/layers/<layer>.geojson`: simplified overlays (5 decimal places, tolerance about 20 m): mu, parks, reserves, city, mvpr_areas, mvpr_routes, uwr, cutblocks_young, burns_recent, wetlands, lakes_small, private_rural, fsr, trails, recsites, trailheads. Budget: 8 MB per area total; split big ones per MU if needed. Not in the single file backup.
- `spots/img/<id>.jpg`: a static map image per spot (600 by 400, about 40 KB) made with Playwright from the Leaflet map with OpenStreetMap tiles (attribution burned in), so the card works offline. One overview image per area.
- The app's Spots tab (app/app.js): list with filters (species, max drive estimate, max walk, ATV route), Leaflet map (vendored in app/vendor/, BSD licence noted on the credits page) with OpenStreetMap tiles when online and the overlays, spot cards with the plan and the map links. Offline: list, cards and static images still work.

## Map links
- Google Maps: `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>` (opens the app on iPhone). Directions: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>`.
- Apple Maps: `https://maps.apple.com/?ll=<lat>,<lon>&q=<name>`.
- iMapBC: `https://maps.gov.bc.ca/ess/hm/imap4m/` (no deep link to a point known; say so).

## Accuracy rules for this feature
- A spot card never claims game is there. It says what the evidence is and how strong (score and list).
- Legal flags are facts with sources and dates. Everything else on the card is labelled opinion (Tip, my pick).
- "Private" and "closed" come from official layers with their data dates. Signs on the ground win.
- No invented place names: use GNIS names from the layers, road names from the atlas, rec site names as given.
