# INSIGHTS.md: Area report (Hunt Map Insights sheet)

Owner ask (2026-10-04): tap or long press anywhere on the map and see what animals live here, the odds, when they are here, how they move, what is open, how to hunt it, what to use.

## Open it
- Long press menu: "Insights" tile.
- Bottom bar "Insights": report for the map centre. While that sheet is open, tap empty map to move the report there.
- Waypoint card and wind sheet: "Insights here".

## What it shows (top to bottom, collapsible)
1. Where: MU (Management Unit) and region, elevation (terrain tiles), BEC (Biogeoclimatic Ecosystem Classification) habitat zone, nearest forest road, land status flags (private, park, reserve, city limits, WMA (Wildlife Management Area), motor vehicle closure, LEH (Limited Entry Hunting) zone, CWD (Chronic Wasting Disease) zone, closed MU).
2. Animals likely here: one card per species with a coloured chip (High, Medium, Low, Unlikely), "(estimate, habitat based)", a 12 month strip and the evidence list.
3. Chance of success: official harvest statistics (resident rows, 3 to 5 year total plus the latest year). Hidden under 20 hunters. Birds and other regions: "No official success rate loaded for this MU".
4. When: open season rows for the MU (dates, class, opens or closes in N days, page, certainty), plus federal duck and goose rows for the district.
5. How they move: one line per species from data/migration.json for this elevation, labelled general pattern, with certainty.
6. How to hunt it: 3 to 5 bullets per likely species from the species lessons, "From the lesson: <title>", opinion labelled Tip.
7. Nearby candidate spots: top 3 within 5 km, tap to open the card.
8. Today: legal light, moon, wind (wind needs signal).
9. Buttons: Ask the mentor about this area (copies the report text, opens the mentor), Directions. Banner: "Study aid only. The official regulations are the law."

## Likelihood rule (estimate, my rule, not a fact)
- Per month: BEC zone in the species band (2 points), elevation in band (2), within 200 m of the band (1).
  - Zone known: 4 High, 3 Medium, 2 Low, 0 or 1 Unlikely. Zone unknown: elevation in band Medium, near Low.
- Raise one level (max, only from Low or better) for: official winter range for that species within 2 km in its months; wetland within 1 km (moose); cutblock 5 to 20 years old within 1 km (deer, moose, elk, bear, grouse); burn 3 to 15 years old within 3 km (deer, moose, elk, bear). Ages from the layer notes.
- Cap at Low: no general season row for that species in the region; ducks and geese with no mapped wetland or duck water within 1 km; sheep and goats without a mapped sheep or goat winter range within 5 km (the app cannot see cliffs).
- Turkey has no month band in the data: Low where the region has a turkey season and the zone is not subalpine or alpine (lesson: valleys and foothill forest edges), else Unlikely.
- Grouse: best of ruffed, dusky and spruce.

## Data (all client side, cached after first load)
- MU, parks, reserves, city limits, WMA, closures, LEH, private land, burns, winter ranges, wetlands, habitat zones, duck waters, spots: data/layers/manifest.json files (GeoJSON point in polygon; PMTiles read tile by tile at zoom 12 with a small vector tile reader).
- Seasons: data/seasons/region*.json and migratory.json. Harvest: data/harvest/bc-harvest.json. Bands: data/migration.json. Tactics: content/phase4 lessons, copied as short bullets into app/map/area-lessons.js with the lesson title.

## Never
- Invent a number. A missing value says so. Likelihood is always labelled estimate.
