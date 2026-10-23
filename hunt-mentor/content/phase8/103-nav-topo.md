---
id: mc-nav-03
phase: 8
num: 103
title: "Safety and Navigation Masterclass 3: Reading a topo map"
minutes: 25
checked: 2026-10-11
---
> [!why]
> A topo map is a photo of the ground's shape. Read the shape and you can name the ridge in front of you, find the bench you want, and see the cliff before you reach it.

```diagram mc-nav-topo-parts
```

- Read the margin first: scale, contour interval, legend, north arrows, date (95%).
- Then read the shape.

```more what this chapter adds
- The quick versions: [Maps 1: reading terrain](#/s/maps-terrain), [Topo maps deep dive](#/s/topo-deep-dive) (every contour pattern, dead ground), [Maps 2](#/s/maps-navigation) (UTM, Universal Transverse Mercator, and declination basics).
- This chapter: scale maths, line gap to slope angle, the V rule, map colours, reading a grid reference, and the three norths for Kamloops and Mission.
- Previous: [Chapter 2](#/s/mc-nav-02). Next: [Chapter 4, The compass](#/s/mc-nav-04).
- A [[Topographic map]] shows height with [[Contour line|contour lines]]: lines joining points of equal elevation (95%, USGS (United States Geological Survey) map symbols guide).
```

```more the margin, item by item
- **Scale:** the ratio and a scale bar (95%, USGS).
- **[[Contour interval]]:** the height between lines, printed in the margin (95%).
- **Legend:** what each symbol and colour means on this sheet (95%).
- **North arrows:** true north, magnetic north and grid north, often with the year (95%; see the last screen).
- **Date:** old maps miss new roads, cutblocks and burns, and their declination has drifted (98%, [Maps 2](#/s/maps-navigation)).
- The Hunt Map shows a scale bar and the elevation at the map centre under it (99%, app).
```

## Scale: what 1 cm means

```diagram mc-nav-scale
```

- 1:50,000 means 1 cm on the map is 500 m on the ground (99%).
- So 2 cm is 1 km. The blue grid squares are 1 km (85%).

```more scale maths
- Scale 1:N means 1 unit on the map is N units on the ground (99%, maths).
- 1:50,000: 1 cm = 50,000 cm = 500 m. 1 km = 2 cm (99%).
- 1:20,000: 1 cm = 200 m. 1 km = 5 cm (99%).
- 1:250,000: 1 cm = 2.5 km (99%). Good for planning the drive, too coarse for the walk (Tip).
- Canada's NTS ([[NTS|National Topographic System]]) maps come at two standard scales, 1:50,000 and 1:250,000 (85%, Natural Resources Canada, search preview).
- A 1:50,000 sheet covers about 1,000 square kilometres (75%, search preview).
- The blue grid on a 1:50,000 sheet is 1 km squares, 2 cm on the paper (85%, [Maps 2](#/s/maps-navigation)).
- Phone maps change scale as you zoom. Always read the scale bar, not your gut (Tip).
- Thumb trick (Tip): on a 1:50,000 map, the width of your thumbnail is roughly 1 km. Measure yours once with a ruler.
```

## Contours: the gap tells the slope

```diagram mc-nav-spacing-slope
```

- Close lines: steep. Wide lines: gentle (95%).
- On 1:50,000 with 20 m lines: 1 mm apart is about 22 degrees (95%).

```more line gap to angle, worked out
- Slope angle = arctangent of (contour interval ÷ horizontal distance) (99%, maths).
- 1:50,000 map, 20 m interval (95%, my calculation):
  - 2 mm apart = 100 m on the ground: about 11 degrees. Walking.
  - 1 mm apart = 50 m: about 22 degrees. A real climb.
  - 0.5 mm apart = 25 m: about 39 degrees. Very steep, avalanche angle in snow.
- Lines touching or merging: a cliff (95%, USGS: contours never cross except at an overhang).
- The Hunt Map draws contours every 20 m, with a thicker index line every 100 m (99%, app). Feet mode: 40 ft and 200 ft (99%).
- NTS 1:50,000 sheets often use a 20 m interval, but older sheets used 100 ft. Read the margin (70%, search preview).
- Faster than maths: turn on Slope steepness in the Hunt Map. Red is 30 to 45 degrees (99%, app).
- Every contour pattern in depth: [Topo maps deep dive](#/s/topo-deep-dive).
```

```diagram fn-topo-interval
```

## Landforms on contours

```steps Five shapes to know cold
hf-shape-ridge | Ridge: U or V shapes point downhill.
hf-shape-draw | Draw: V shapes point uphill.
hf-shape-saddle | Saddle: a low dip between two tops.
hf-shape-bench | Bench: a wide gap on a steep slope.
hf-shape-cliff | Cliff: lines crowd or touch.
```

- Ridges point down, draws point up (85%).
- Benches are where game beds and where you glass from (Tip).

```more the shapes in hunter words
- [[Spur]] or ridge: contour bends point away from the high ground, downhill (85%, [Topo maps deep dive](#/s/topo-deep-dive)).
- [[Draw]] or gully: contour bends point toward the high ground, uphill (85%).
- [[Saddle]]: the low point on a ridge between two tops. Game crosses there; so do you (Tip).
- [[Bench]]: a flat step on a slope, shown by a wide gap between lines on a steep face (85%).
- Cliff: lines bunch or merge (95%).
- Hilltop: a closed ring, often with a spot height. A depression has tick marks pointing in (85%, USGS).
- Dead ground: ground you cannot see from where you stand, hidden behind a convex slope (85%, see [[Dead ground]] in [Topo maps deep dive](#/s/topo-deep-dive)).
```

## The V rule: which way is up?

```diagram mc-nav-v-upstream
```

- Where contours cross a creek, they bend into a V that points upstream (95%).
- Water runs the other way: down the V.

```more reading up and down
- Contours crossing a stream form a V pointing upstream, toward higher ground (95%, USGS map symbols guide).
- Index contours carry height numbers. Read two of them: which way do they rise? (95%)
- Lakes sit low. Peaks have spot heights (85%).
- Creeks join going downhill: two small creeks make one bigger one (Tip).
- On the Hunt Map, the elevation readout under the scale shows the height at the cross in the middle (99%, app). Move the map and watch it change.
```

```diagram fn-topo-updown
```

## Map colours and symbols

```diagram mc-nav-symbols
```

- Brown is shape, blue is water, green is trees (95%).
- Read each sheet's legend: Canadian maps differ in detail (Tip).

```more colours in full
- USGS topo colours (95%, map symbols guide): brown for contours; blue for water; green for vegetation such as woods; black for roads, buildings, names and boundaries; red for main roads and survey lines; white for open ground or areas with no tree cover shown.
- NTS sheets use a similar scheme. Always check the legend on the sheet (Tip).
- On paper, green woods do not show cutblocks or burns made after the print date (98%, maps age).
- The Hunt Map Topo: sage land, pale forest tint, white roads, blue water, brown contours (99%, Hunt Map design). Hunting layers use their own colours: orange private land, red stripes no hunting, purple dashed vehicle closures (99%, see [Hunt Map like a pro](#/s/hunt-map-pro)).
> [!warn]
> Study aid only. The official regulations are the law.
- Land status rules: [Maps 3: land status](#/s/maps-land-status) and [Rule Book: where you can hunt](#/s/rb-where-you-can-hunt).
```

## Grid and UTM: read right, then up

```diagram mc-nav-utm-read
```

- UTM (Universal Transverse Mercator): a metre grid on most topo maps (95%).
- Read right first (easting), then up (northing) (95%).

```more grid references in full
- UTM gives a zone, an easting (metres east) and a northing (metres north) (98%, [Maps 2](#/s/maps-navigation)).
- Heffley Creek and Mission are in zone 10. The South Okanagan near Osoyoos is east of 120 degrees west, so zone 11 (90%, zones are 6 degrees wide).
- A wrong zone puts you hundreds of kilometres out (90%).
- Four figure reference: the square's easting and northing numbers. Six figure: add tenths inside the square, about 100 m (Tip, standard map reading).
- The numbers on the drawing are examples only.
- The Hunt Map menu, Coordinates: Decimal, Deg min sec, or UTM (99%, app). Tap the elevation readout for Map centre with a copy button (99%).
- My lean: pick one format for you and your brother and use it on every trip plan (Tip).
- Datum: Canadian maps use NAD83 and phones WGS84; for hunting they agree within a couple of metres (75%).
```

## Coordinates for a rescue

| Format | Example look | Good for |
|---|---|---|
| Decimal degrees | 50.86, minus 120.27 | Phones, 911 |
| Deg min sec | 50° 51′ 29″ N | Older maps |
| UTM | 10U, easting, northing | Paper grid maps |

- Whatever you read, say the format out loud on the call (Tip).

```more why it matters
- BCSARA lists "not knowing your location (such as latitude and longitude)" as one of the 10 worst things you can do (95%).
- The example line shows Heffley Creek, about 50.86 N 120.27 W (95%, as used for the NOAA (National Oceanic and Atmospheric Administration) declination query in [Compass mastery](#/s/compass-mastery)).
- West longitudes are negative in decimal degrees (95%). Say "west" anyway on a call (Tip).
- iPhone satellite SOS shares your location for you (95%, Apple). A number read off a paper map is your backup (Tip).
```

## Three norths, and declination where you hunt

```diagram mc-nav-three-norths
```

- The needle points about 15 degrees east of true north at Heffley Creek and Mission (95%).
- South Okanagan: about 14.6 degrees east (95%).

```more declination in full
- [[Declination]]: the angle between true north and magnetic north (98%).
- NOAA World Magnetic Model calculator, 15 October 2026 (95%, read directly, via [Compass mastery](#/s/compass-mastery)):
  - Heffley Creek, 50.858 N 120.269 W: 15.17 degrees east, changing minus 0.13 degrees a year.
  - Mission, 49.13 N 122.31 W: 15.20 degrees east, minus 0.13 a year.
  - Osoyoos area, 49.03 N 119.47 W: 14.58 degrees east, minus 0.12 a year.
  - Model uncertainty about 0.4 degrees.
- The Natural Resources Canada calculator could not be read from this environment, so the NOAA model is used (95%).
- Grid north: on UTM zone 10 grid lines near Heffley Creek, grid north is about 2.5 degrees east of true north, so the needle sits about 12.7 degrees east of the grid lines (85%, my calculation).
- The Hunt Map draws true north up when not rotated (90%).
- Rhyme: "declination east, magnetic least": map to compass, subtract 15; compass to map, add 15 (90%, NRCan rhyme via [Maps 2](#/s/maps-navigation)).
- Set it once on an adjustable compass: [Chapter 4](#/s/mc-nav-04).
```

## Memory hooks

```diagram mc-nav-spacing-slope
```

- **Rhyme:** "Close is steep, wide is sleep."
- **Number trick:** 1:50,000: 2 cm is 1 km. 1 mm gap at 20 m lines is about 22 degrees (95 to 99%).
- **Old hand's rule** (opinion, short form of the USGS V rule): "The V points to where the water came from."

```more more hooks
- **Rhyme:** "Ridges point down, draws point up."
- **Rhyme:** "Read right, then up" (UTM, 95%).
- **Number trick:** 15, 15, 14.6: declination at Heffley Creek, Mission and Osoyoos (95%).
- **Rhyme:** "Declination east, magnetic least" (90%).
- **Old hand's rule** (opinion): "Read the margin before the map."

> [!mistake]
> - Ignoring the contour interval and scale of a new map.
> - Reading a draw as a ridge.
> - Mixing up UTM zones 10 and 11.

> [!field]
> On the Hunt Map at home: find a bench, a saddle and a draw near Heffley Creek. Check each with Slope steepness. Write the UTM coordinates of the bench.
```

## Sources

- USGS Topographic Map Symbols (Montana State Library copy), via [Topo maps deep dive](#/s/topo-deep-dive), read 2026-10-11: contours, index lines, V rule, colours (95%).
- [NOAA NCEI magnetic declination calculator](https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml), queried 2026-10-11 for 15 October 2026, via [Compass mastery](#/s/compass-mastery) (95%).
- [Natural Resources Canada: National Topographic System maps](https://natural-resources.canada.ca/maps-tools-publications/maps/topographic-maps/national-topographic-system-maps), search preview 2026-10-11: two standard scales (85%).
- NTS sheet contour intervals and area: archive catalogue and GeoNB search previews 2026-10-11 (70 to 75%).
- UTM zones, datum and NRCan rhyme: [Maps 2](#/s/maps-navigation), checked 2026-10-01 (90 to 98%).
- [BC Search and Rescue Association 2022 Year in Review](https://bcsara.com/wp-content/uploads/2023/09/BCSARA_2022_Year_In_Review_Report.pdf), read directly 2026-10-11 (95%).
- Scale and slope angle maths, grid convergence: my calculation (85 to 99%).
- Hunt Map contours, coordinates and readouts: the Hunt Mentor app, read 2026-10-11 (99%).
- [Hunt Mentor research notes (summary of the sources listed in Sources)](#/sources).

```quiz
[
  {"q": "On a 1:50,000 map, how far is 1 cm on the ground?", "options": ["50 m", "500 m", "5 km"], "answer": 1, "why": "1:50,000 means 1 cm on the map is 50,000 cm, which is 500 m. So 2 cm is 1 km (99%, maths)."},
  {"q": "20 m contour lines sit 1 mm apart on a 1:50,000 map. How steep?", "options": ["About 5 degrees", "About 22 degrees", "About 60 degrees"], "answer": 1, "why": "1 mm is 50 m on the ground. 20 m up over 50 m across is about 22 degrees (95%, my calculation)."},
  {"q": "Contour lines make a V where they cross a creek. Which way does the V point?", "options": ["Downstream", "Upstream, toward higher ground", "North"], "answer": 1, "why": "USGS: contours crossing a stream form a V that points upstream (95%). Water flows the other way."},
  {"q": "How do you read a UTM grid reference?", "options": ["Up, then right", "Right first (easting), then up (northing)", "Any order"], "answer": 1, "why": "Read right, then up: easting first, northing second (95%)."},
  {"q": "What is the declination near Heffley Creek in October 2026?", "options": ["About 15 degrees east", "About 15 degrees west", "Zero"], "answer": 0, "why": "NOAA World Magnetic Model: 15.17 degrees east at Heffley Creek, 15.20 at Mission (95%). East declination: magnetic least."}
]
```
