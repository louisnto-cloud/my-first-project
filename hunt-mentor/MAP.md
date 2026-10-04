# MAP.md: Hunt Map (onX style map inside Hunt Mentor)

Owner ask (2026-10-03): "Build onX maps for me, exactly the same features, as high quality as it can." Screenshots showed onX Hunt: muted sage topo with contour lines and elevation labels, white roads, blue streams, red waypoints and lines, scale bar, elevation readout, Topo / 2D toggle, weather button, locate button, "Hunt Map Layers" button, bottom bar: Offline Maps, My Content, Tools, Insights, Go & Track.

## Honest scope
- Match (target): topo with contours and hillshade, satellite, hybrid, 3D terrain, private land vs Crown land, Management Units, closures, parks, reserves, winter ranges, cutblocks, burns, roads, trails, rec sites, waypoints, lines, areas, GPS tracks, measure, elevation profile, compass, search, wind and weather, legal light, offline areas, GPX and KML import and export.
- Cannot match: private land owner names (not open data in BC), background tracking with the screen off (iPhone web app limit; we keep the screen awake while tracking), onX's paid satellite and cartography.

## Tested data sources (2026-10-03, from this environment, Origin https://louisnto-cloud.github.io)
| Source | URL | Browser access (CORS) | Use |
|---|---|---|---|
| OpenFreeMap vector tiles and styles | https://tiles.openfreemap.org/styles/liberty , tilejson https://tiles.openfreemap.org/planet | yes | Topo base (restyle), hybrid labels |
| AWS Terrain Tiles (terrarium PNG, open data) | https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png | yes | 3D terrain, hillshade, contours, elevation readout, profiles |
| Esri World Imagery | https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x} | yes | Satellite (attribution required; personal non commercial use, assumption) |
| OpenTopoMap raster | https://tile.opentopomap.org/{z}/{x}/{y}.png | yes | Optional extra base (no bulk download) |
| Open-Meteo forecast | https://api.open-meteo.com/v1/forecast | yes | Wind, temperature, rain, pressure (CC BY 4.0, attribution) |
| BC Geographical Names | https://apps.gov.bc.ca/pub/bcgnws/names/search?name=...&outputFormat=json | yes | Search lakes, creeks, peaks |
| BC Address Geocoder | https://geocoder.api.gov.bc.ca/addresses.json?addressString=... | yes (echoes origin) | Search places and roads |
| Nominatim | https://nominatim.openstreetmap.org/search?format=json&q=... | yes | Fallback search, 1 request per second max |
| BC open maps WMS and WFS | https://openmaps.gov.bc.ca/geo/pub/... | NO (no allow origin header for github.io) | Build time only, via the data pipeline (SPOTS.md) |
| BC provincial basemap cache | maps.gov.bc.ca | NO | Do not use |
| MapLibre GL JS, maplibre-contour | unpkg.com | yes | Vendor into app/vendor/ (no runtime CDN) |

## Architecture
- MapLibre GL JS (latest stable that works, BSD 3 clause) and maplibre-contour (BSD 3 clause) vendored in `app/vendor/`, licences copied. Optional: pmtiles JS (BSD 3 clause) if the pipeline ships PMTiles.
- New route `#/map` (plus `#/map/@lat,lon,zoom` deep links). Full screen, its own chrome like onX. Map code lives in `app/map/*.js` and loads only when the map opens (the rest of the app stays light). A "Map" entry in the main nav.
- Styles (built in code, not fetched at runtime except OpenFreeMap's style as a base):
  - Topo (default): OpenFreeMap vector data restyled in an onX like palette (sage green land, pale forest tint, white roads with grey casing, blue water lines, brown contours), hillshade from terrarium, contours from maplibre-contour (index lines every 100 m with labels, intermediate every 20 m; feet option shows 200 ft and 40 ft), labels for peaks, lakes, roads.
  - Satellite: Esri World Imagery plus contours toggle.
  - Hybrid: Esri plus OpenFreeMap roads and labels.
  - 3D: terrain from terrarium (exaggeration 1.3, adjustable), pitch up to 80, sky. "2D / 3D" toggle like onX. Two finger tilt and rotate.
- Units: metric default (m, km), toggle to feet and miles. Coordinates: decimal degrees, degrees minutes seconds, UTM.
- Chrome (match the screenshots): top left menu and elevation profile buttons; centre title "HUNT MAP"; top right search; scale bar plus "NNN m elevation" readout under the top left (elevation at map centre); right side: weather button, basemap and 2D / 3D pill, locate and compass button; bottom left "Hunt Map Layers" button; bottom bar: Offline Maps, My Content, Tools, Insights, Go & Track. Big touch targets (44 px), works at 360 px wide, safe areas on iPhone, light and dark.
- Location: `navigator.geolocation.watchPosition` with an accuracy circle and a heading cone (iOS: `DeviceOrientationEvent.requestPermission`, `webkitCompassHeading`). Follow mode.
- Elevation readout and profiles: `map.queryTerrainElevation` when terrain is on, else decode terrarium pixels (height = R*256 + G + B/256 - 32768).
- Search: one box. Order: coordinates (decimal, DMS, UTM), MU number like 3-27, our spots and rec sites (local data), BC Geographical Names, BC Geocoder, Nominatim last. Results list, tap to fly.
- Layers panel ("Hunt Map Layers"): built from `data/layers/manifest.json` (written by the data pipeline). Groups: Land status, Hunting, Habitat and migration, Access, Spots, My Content. Each layer: on or off, opacity, legend swatch, source and data date, tap the "i" for what it means (plain English, certainty, source). Remember choices in localStorage.
- Feature popups: tap any official layer feature to see its key fields in plain English (for example "Private land, ParcelMap BC, data date 2026-10-02", "MU 3-27, Region 3 Thompson", "Motor Vehicle for Hunting Closed Area: Greenstone Mountain Burn, closed year round").
- Offline Maps: draw a box or use the current view, choose zooms, see an estimate (tile count and MB) before downloading; downloads OpenFreeMap tiles (z 0 to 14), terrarium (z 0 to 12), glyphs and sprites used by the style, and our layer files for that area into Cache Storage (`hm-offline-<name>`); progress bar; list, rename, delete. The service worker answers those hosts cache first. Satellite is not bulk downloaded (licence); viewed tiles are cached normally. Show storage used (`navigator.storage.estimate`) and ask for persistent storage (`navigator.storage.persist`).
- Attribution always visible (collapsible): OpenStreetMap contributors, OpenFreeMap, Esri and its providers, Terrain Tiles (Mapzen, AWS Open Data), Open-Meteo, BC Data Catalogue (Open Government Licence BC).

## Phase 2 (separate agent, after the core lands): tools
- Waypoints with hunting icons (parking, camp, stand, glassing point, bed, rub, scrape, tracks, scat, water, gate, trail camera, kill, blood, other), name, note, photo (IndexedDB), colour.
- Lines and routes (distance, elevation profile chart), areas (hectares, perimeter), measure tool, range rings around a point (100, 200, 300 m), scent cone from a point using the current wind (opinion, labelled Tip).
- Go & Track: record a GPS track with Screen Wake Lock, distance, moving time, elevation gain, pause, save; warn that the screen must stay on.
- My Content: folders, list, show or hide, edit, delete; import GPX, KML and GeoJSON (onX exports GPX and KML); export GPX, KML, GeoJSON; share with the Web Share API.
- Insights at the map centre or a waypoint: MU and region, what is open today there (from data/seasons when it exists, else the regs.json rows and a link to the Rule Book), legal light today, sunrise and sunset, moon phase, hourly wind (arrow), temperature, rain, pressure trend, and a plain "Wind is from the NW: approach from the SE" line (Tip).
- Weather button: overlay wind arrows on a grid for the view (Open-Meteo, a few points), and a 3 day mini forecast.
- User data (waypoints, tracks, lines, areas, offline list) lives in IndexedDB and is included in the existing backup export and import.

## Data contract with the pipeline
- `data/layers/manifest.json`: `{ "updated": "YYYY-MM-DD", "layers": [ { "id", "group", "label", "type": "fill|line|circle|symbol", "file" (GeoJSON or .pmtiles path), "areas": ["A","B","C"] or "BC", "minzoom", "paint": {...MapLibre paint}, "labelField"?, "popup": [["Field label","PROPERTY"],...], "source": "BC Data Catalogue layer name", "licence": "Open Government Licence BC", "dataDate", "about": "plain English, one or two lines", "cert": 95 } ] }`
- Spot points and routes as described in SPOTS.md, listed in the same manifest under group "Spots".
- Seasonal migration layers listed under group "Habitat and migration" with a `months` property per feature or per layer so the map can show a month slider.

## Quality bar
- Looks like the onX screenshots in the Topo style (muted greens, brown contour lines with labels, white roads, blue streams).
- Smooth on an iPhone: vector base, simplified GeoJSON, layers loaded on demand by area and zoom.
- No console errors. Works offline for downloaded areas. Every legal layer shows its source, date and certainty. Banner on legal popups: "Study aid only. The official regulations are the law."
