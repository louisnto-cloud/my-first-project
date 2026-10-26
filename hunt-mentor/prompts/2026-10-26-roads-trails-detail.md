# Prompt: more detailed forest roads and trails on the map (2026-10-26)

## Who it is for
- The owner: first time hunter from Mission, BC; black tailed deer near Harrison Lake (MU 2-18), Nov 14 to 15 2026; iPhone, gloves, no signal at the truck.

## Owner ask
- "Create a prompt that allows to get more detailed forest roads and trails and then run it."

## What the map has today
- Forest Service roads: WHSE_FOREST_TENURE.FTEN_ROAD_SECTION_LINES_SVW, tenured road sections only (area B file 1 MB, data 2026-10-03).
- Recreation trails: WHSE_FOREST_TENURE.FTEN_REC_TRAILS_SVW, official RSTBC trails only (area B 64 KB).
- Missing: unmapped and older resource road spurs, deactivated or retired roads, road surface and class, km markers, gates where known, foot trails and old tracks.

## Sources to use (open licences only; record licence, date and certainty)
1. BC Digital Road Atlas, WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP (Open Government Licence BC): every mapped road with class (resource, unclassified, trail etc.), surface (paved, loose, rough, overgrown), name and number of lanes.
2. Forest tenure road segments, WHSE_FOREST_TENURE.FTEN_ROAD_SEGMENT_LINES_SVW (OGL BC): life cycle status (active, retired, pending), client and file id; as built roads where a layer exists.
3. OpenStreetMap (ODbL, credit "OpenStreetMap contributors", already credited in the app): highway=track (with tracktype), path, footway, bridleway, gates (barrier=gate), via a Geofabrik British Columbia extract or the Overpass API. If neither is reachable from the sandbox, say so and ship the BC sources only.

## Rules
- hunt-mentor/CLAUDE.md in full. Remove nothing on the map (owner rule): the existing layers stay; new detail is new layers or richer popups.
- Every road or trail line says what it is not: "a line on the map is not a promise the road is open, drivable or legal to drive" (with the existing closure and access rules).
- Offline first: new layers go into the "Save this hunt area for no signal" download with a size estimate that stays honest; keep area B under a sensible size (report it).
- Style: road class by colour and dash (retired or overgrown dashed and faded), labels at higher zoom, 14 px popup text, 44 px taps. Layer guide entries in plain words with source, date and certainty.
- Do not change hunting facts. Do not imply a trail or road is legal for vehicles or hunting.

## Parts
1. Detailed roads layer per area (start with B: Mission, Fraser Valley, Harrison), all areas if time: class, surface, status, name, source.
2. Trails and tracks layer per area: official trails plus OSM tracks and paths (if reachable), with surface or difficulty where tagged.
3. Gates and barriers points where the data has them.
4. Map wiring: manifest entries, layer guide text, popup fields, presets (Scouting and Hunt day show them), offline download, tap card shows the road class and status.
5. Spot rundowns and the plan's Hunt day "Park" line: name the road class and status at the parking point where the data has it.

## Done means
- Layers built and published for area B at least; size and data date reported; tested at 360 px online and offline at Harrison; regression 0 failures; nothing removed; a short report with what each source added (km of road, km of trail, number of gates).
