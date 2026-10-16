// Hunt Mentor service worker.
// App shell (and the map code and libraries): cached on install, served cache first (offline first).
// Map tiles, terrain, fonts: cache first. Offline areas live in hm-offline-* caches, viewed tiles in hm-tiles (size capped).
// Our layer files (data/layers, data/spots): cache first per ?v= version. The layers manifest and the OpenFreeMap
// tile index: network first with a short wait, then the saved copy. PMTiles byte ranges are cut from a saved whole file
// or from the saved range chunks of an offline area (keys "<file>?v=..&hmr=<start>-<end>&hmt=<size>", map/offline.js).
// No signal: navigator.onLine false, or a network request failed or hung in the last few seconds, means "down".
// While down nothing waits on the network: saved copies answer at once and anything not saved fails at once.
const CACHE = 'hm-e9006d483f-2026-10-16';
const TILES = 'hm-tiles';
const DATA = 'hm-data';
const TILE_CAP = 4000;
// CORE must all load or the install fails (the old version keeps running). EXTRA files are added one by one:
// a missing photo or map file is skipped (fetched on demand later) instead of breaking the whole install.
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'content.js'];
const EXTRA = ['home.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', ...["lessons/search.9ec4d9d92c.json","lessons/countdown.345b06ae97.json","lessons/licences.719736f42f.json","lessons/shotgun-guide.cdd2e8707e.json","lessons/scope-guide.fa23a1b092.json","lessons/sighting-in.b74a5690e0.json","lessons/ammo-guide.43c82448fe.json","lessons/what-to-wear.b8c9e43314.json","lessons/pack-kit.df7520bba4.json","lessons/first-duck-hunt.cdaf47aaad.json","lessons/first-deer-hunt.8a73f636ec.json","lessons/first-quail-trip.48c39f1c69.json","lessons/legal-to-shoot.c7eb5c8445.json","lessons/after-the-shot.f262b6363c.json","lessons/know-your-mus.aad5f3eace.json","lessons/firearm-safety.ec8bc56baf.json","lessons/water-safety.86b795d333.json","lessons/bush-safety.59e616d085.json","lessons/atv-rules.a12135f5c0.json","lessons/bc-rules.9c57a916e6.json","lessons/maps-terrain.669539ddf4.json","lessons/maps-navigation.59e0fcb110.json","lessons/maps-land-status.71f4ded307.json","lessons/map-scouting.d883c3c4ea.json","lessons/wind-thermals.2bff01c6ca.json","lessons/glassing.0cdcc8390e.json","lessons/still-hunting.629095465a.json","lessons/weather-moon.3940e99cab.json","lessons/field-first-aid.7271e0d333.json","lessons/cold-injuries.b69fcca975.json","lessons/lost-survival-kit.32eb8b18e4.json","lessons/fire-wet-weather.274c42be3e.json","lessons/shelter-night-out.9d3568d79f.json","lessons/water-safe-drinking.e933cab357.json","lessons/bear-cougar-encounters.c00f1aa3d0.json","lessons/wildfire-smoke-heat.c53c7ebcdb.json","lessons/avalanche-hunters.663176a88e.json","lessons/ice-cold-water.b81ea13aac.json","lessons/rifle-mechanics.d01c47afeb.json","lessons/cartridge-anatomy.a3908e6fae.json","lessons/ballistics-deep.c7b1bb7540.json","lessons/judging-distance.87a099efb3.json","lessons/field-positions.777fde4e7e.json","lessons/season-practice.0ef03e56a9.json","lessons/shotgun-mastery.ef7a0d7790.json","lessons/rimfire-22.4d633fda28.json","lessons/firearm-care.c36f923ffb.json","lessons/optics-mastery.942e91fc9e.json","lessons/topo-deep-dive.6d4379e5d8.json","lessons/compass-mastery.430620b5a8.json","lessons/gps-phone-battery.a47a468c3b.json","lessons/hunt-map-pro.a7aa12f072.json","lessons/route-planning.40b33a9f6d.json","lessons/night-navigation.707e9cabbd.json","lessons/field-weather.b092d0d45f.json","lessons/wind-mastery.007d99a7c5.json","lessons/stay-unseen.de3494ba14.json","lessons/stalking-footwork.e92422bbd5.json","lessons/hunt-fitness.55a5ef484d.json","lessons/packs-carrying.1d9d838e7b.json","lessons/fsr-vehicles-radio.1ae9e7b40f.json","lessons/hunting-camp.13b0cb51b6.json","lessons/hunt-food-water.f0c76dac80.json","lessons/hunting-partner.655a81eec2.json","lessons/ethics-fair-chase.ea3626eb5f.json","lessons/season-planning.cd7ee18622.json","lessons/daylight-weather-bc.4ccf9c8abd.json","lessons/tracks.19f44de7a4.json","lessons/sign.0515034546.json","lessons/funnels.3c95f1d35a.json","lessons/food-water-cover.ae84b9eb05.json","lessons/the-rut.6f8b9705c6.json","lessons/snow-tracking.69e219a5a1.json","lessons/sign-drill.4fbc50eaa5.json","lessons/habitat-deer.024bdaa7c0.json","lessons/habitat-ducks.aed919492c.json","lessons/habitat-upland.445276c1d0.json","lessons/habitat-big-game.b27726079c.json","lessons/migration.5d858be6e7.json","lessons/landforms-101.7aca12e41b.json","lessons/slope-aspect.b482b03681.json","lessons/elevation-snowline.521d50394d.json","lessons/water-on-land.24fd8921dc.json","lessons/edges.4a9a3a181e.json","lessons/bedding-cover.c2cabcd0da.json","lessons/escape-terrain.affbf56aaa.json","lessons/pinch-points.0ab96012fc.json","lessons/habitat-islands.0689222c0e.json","lessons/read-land-truck-map.6d2608d6ff.json","lessons/bec-zones.1ea557d1f0.json","lessons/grassland-country.edf7fe9241.json","lessons/dry-forest-country.76d249f1b6.json","lessons/wet-forest-country.c8e9687a50.json","lessons/wetland-country.b4d28c5b68.json","lessons/burn-country.1c4d902c88.json","lessons/cutblock-country.c3528fd0fa.json","lessons/farm-country.882f6ea2f2.json","lessons/browse-plants.f018e6b5f4.json","lessons/berries-mast.f1df982db0.json","lessons/rs-track-measuring.f65995402c.json","lessons/rs-track-aging.f4c039a537.json","lessons/rs-droppings.90cdf1ff35.json","lessons/rs-beds.53195a7d98.json","lessons/rs-rubs-scrapes.361da9dfb9.json","lessons/rs-bird-sign.0f0fc1a46b.json","lessons/rs-predator-sign.00836c5810.json","lessons/rs-blood-hair-tissue.c8eb67bef2.json","lessons/rs-track-following.ac5f0a71ec.json","lessons/rs-sign-substrates.bfadc2392b.json","lessons/fronts-and-movement.a650ec63f7.json","lessons/pressure-push.d9a2694383.json","lessons/bc-migration-routes.8a21abf87e.json","lessons/winter-range-legal.4452ea31db.json","lessons/waterfowl-daily-flights.3e5baa4181.json","lessons/upland-daily-pattern.c90075d629.json","lessons/build-hunting-map.e57207e298.json","lessons/land-drill-heffley.aa82af7350.json","lessons/moon-and-daylight.5cb951ea08.json","lessons/land-in-weather.dcf71872b6.json","lessons/mule-deer.9192c7a2cb.json","lessons/white-tailed-deer.f52212fc1d.json","lessons/deer-mind.ebb3766aac.json","lessons/moose.1a78fe6728.json","lessons/elk.99eab3c41e.json","lessons/black-bear.34a6da5fd4.json","lessons/ducks.df2e51fce8.json","lessons/geese.6c753fef53.json","lessons/grouse.45e07d0579.json","lessons/upland-birds.c1c711bb12.json","lessons/mountain-sheep.0ef3cf9621.json","lessons/mountain-goat.d4ed96c12d.json","lessons/caribou-bison.aa3c5002ab.json","lessons/wild-turkey.29140a08a4.json","lessons/predators.ddc7ed17fe.json","lessons/small-game.36d55c6f68.json","lessons/sea-ducks.4bcebd6a4b.json","lessons/all-bc-species.a22604ece6.json","lessons/gallery-deer.3f6f0009e8.json","lessons/gallery-waterfowl.b44da6d6d5.json","lessons/gallery-upland.be599706f5.json","lessons/gallery-big-game.dc09f46c4f.json","lessons/shooting-skills.d021d3a068.json","lessons/ballistics-308.15c3b50db2.json","lessons/shot-placement.0ce409e639.json","lessons/shotgun-skills.25e85aa577.json","lessons/blood-trailing.c1724d30f7.json","lessons/tagging-legal.7e5e79d749.json","lessons/field-dressing.7cd606c253.json","lessons/meat-care.b5474f5fdb.json","lessons/packing-out.b43c2c17b2.json","lessons/cwd.7b659aea36.json","lessons/butchering.f00edc5b9b.json","lessons/cooking.9ba73c550a.json","lessons/trophy-care.5598849e9f.json","lessons/bc-calendar.cac5521914.json","lessons/leh-strategy.147b1c7a2f.json","lessons/top-areas.0db0f0e064.json","lessons/etiquette.9c7af667a5.json","lessons/indigenous-respect.a3f0dc9cf8.json","lessons/landowner-permission.ea53aab346.json","lessons/grandpas-rules.fd998eeda7.json","lessons/hunt-journal-guide.9d7ed8f826.json","lessons/mastery-levels.de335ab7e5.json","lessons/mentoring.dda07683e9.json","lessons/local-heffley.8e2b44b123.json","lessons/local-mission.89898b97ff.json","lessons/local-okanagan.381cf62581.json","lessons/trip-yukon.47dbb7f3b6.json","lessons/trip-alberta.03e45ca8bc.json","lessons/trip-saskatchewan.0e185b86d2.json","lessons/trip-manitoba.bf5eb6a09b.json","lessons/trip-alaska.f46a28809f.json","lessons/named-areas.8a04217bbe.json","lessons/rb-definitions.bb26d3b4ea.json","lessons/rb-licences-fees.1346a4b0b8.json","lessons/rb-where-you-can-hunt.7e2ec147c8.json","lessons/rb-unlawful-acts.ec8945a69f.json","lessons/rb-legal-methods.a57b904e0a.json","lessons/rb-bag-limits.7a1a5d891d.json","lessons/rb-after-the-kill.e779b828de.json","lessons/rb-region-3.a9a012471b.json","lessons/rb-region-2.27ab692234.json","lessons/rb-region-8.60b99777d1.json","lessons/rb-migratory-birds.473db5e3a6.json","lessons/rb-region-1.b0c6bdad40.json","lessons/rb-region-4.d91eea218d.json","lessons/rb-region-6.b9ce1c0043.json","lessons/rb-region-7a.dfaa8c9052.json","lessons/rb-region-7b.1065707838.json","lessons/mc-mule-deer-01.b4a7db430e.json","lessons/mc-mule-deer-02.3bdf830011.json","lessons/mc-mule-deer-03.1fc20e31a8.json","lessons/mc-mule-deer-04.c10c3450e7.json","lessons/mc-mule-deer-05.ea4e69e189.json","lessons/mc-mule-deer-06.a31343eb55.json","lessons/mc-mule-deer-07.d8cd41df32.json","lessons/mc-mule-deer-08.87e860f12b.json","lessons/mc-mule-deer-09.63caeae282.json","lessons/mc-mule-deer-10.5326dc61b2.json","lessons/mc-white-tailed-deer-01.0f0103f3ba.json","lessons/mc-white-tailed-deer-02.bb791618e6.json","lessons/mc-white-tailed-deer-03.be7ffafdc3.json","lessons/mc-white-tailed-deer-04.0a1bd1cdc1.json","lessons/mc-white-tailed-deer-05.667c2d7522.json","lessons/mc-white-tailed-deer-06.aec1bd5cf7.json","lessons/mc-white-tailed-deer-07.eb4a8c794d.json","lessons/mc-white-tailed-deer-08.6cd5ef321a.json","lessons/mc-white-tailed-deer-09.b6f05e0856.json","lessons/mc-white-tailed-deer-10.ea7d3b4076.json","lessons/mc-ducks-01.4a550fff1b.json","lessons/mc-ducks-02.61fde85ec4.json","lessons/mc-ducks-03.f0257f1e22.json","lessons/mc-ducks-04.d4b1424bea.json","lessons/mc-ducks-05.ca2e372284.json","lessons/mc-ducks-06.e961706343.json","lessons/mc-ducks-07.3cdf6b4430.json","lessons/mc-ducks-08.f4b989dd81.json","lessons/mc-ducks-09.1325eef98c.json","lessons/mc-ducks-10.0fb5bd21a6.json","lessons/mc-geese-01.377277f840.json","lessons/mc-geese-02.8b9de8abe7.json","lessons/mc-geese-03.d183655b17.json","lessons/mc-geese-04.2781094048.json","lessons/mc-geese-05.e814334e8d.json","lessons/mc-geese-06.94a16edf97.json","lessons/mc-geese-07.f27b880d69.json","lessons/mc-geese-08.ddb48a1dee.json","lessons/mc-geese-09.b948626f77.json","lessons/mc-geese-10.687ed4fc76.json","lessons/mc-grouse-01.b38273ada3.json","lessons/mc-grouse-02.bb3c8a5602.json","lessons/mc-grouse-03.9d3b0b6a3d.json","lessons/mc-grouse-04.f014131329.json","lessons/mc-grouse-05.cf0e65d2c7.json","lessons/mc-grouse-06.2ec8381cc2.json","lessons/mc-grouse-07.5cca61a695.json","lessons/mc-grouse-08.e663106c81.json","lessons/mc-grouse-09.6458796e38.json","lessons/mc-grouse-10.5d0ec47f9e.json","lessons/mc-quail-01.db93eb7f8d.json","lessons/mc-quail-02.ae7b8587cf.json","lessons/mc-quail-03.3ae8990a66.json","lessons/mc-quail-04.829a610d79.json","lessons/mc-quail-05.f08be79992.json","lessons/mc-quail-06.9356fd8c4d.json","lessons/mc-quail-07.d60382b6ba.json","lessons/mc-quail-08.0fd9d19ec9.json","lessons/mc-quail-09.dcd742907d.json","lessons/mc-quail-10.0e6334f16d.json","lessons/mc-moose-01.3c0152526f.json","lessons/mc-moose-02.eee0830465.json","lessons/mc-moose-03.c893c0a5d2.json","lessons/mc-moose-04.d072e5b3c8.json","lessons/mc-moose-05.0236e099a0.json","lessons/mc-moose-06.8f55761f74.json","lessons/mc-moose-07.ecb47defd2.json","lessons/mc-moose-08.afcf3cb355.json","lessons/mc-moose-09.27763fdcb7.json","lessons/mc-moose-10.4fda120dcf.json","lessons/mc-elk-01.1117eb5e45.json","lessons/mc-elk-02.f656f3a955.json","lessons/mc-elk-03.1e1949a81e.json","lessons/mc-elk-04.fe50615445.json","lessons/mc-elk-05.fa7ba51255.json","lessons/mc-elk-06.aa516a3cb8.json","lessons/mc-elk-07.da3c995802.json","lessons/mc-elk-08.0cba0d81f3.json","lessons/mc-elk-09.46da1964ee.json","lessons/mc-elk-10.69953307da.json","lessons/mc-black-bear-01.6647252bc8.json","lessons/mc-black-bear-02.f7c5572751.json","lessons/mc-black-bear-03.79bc06d6cb.json","lessons/mc-black-bear-04.05e6c246d2.json","lessons/mc-black-bear-05.5b23ff2348.json","lessons/mc-black-bear-06.908cb1869d.json","lessons/mc-black-bear-07.107ca65986.json","lessons/mc-black-bear-08.510fa14a67.json","lessons/mc-black-bear-09.658f588469.json","lessons/mc-black-bear-10.f409dd0011.json","lessons/mc-skills-01.461686a800.json","lessons/mc-skills-02.d32ebc2a82.json","lessons/mc-skills-03.d03025a731.json","lessons/mc-skills-04.f3ccea25ce.json","lessons/mc-skills-05.3587928065.json","lessons/mc-skills-06.6c0cf7f77b.json","lessons/mc-skills-07.bbd1daf459.json","lessons/mc-skills-08.5e78992551.json","lessons/mc-skills-09.2354874ec4.json","lessons/mc-skills-10.730337ba30.json","lessons/mc-nav-01.9e680b0cda.json","lessons/mc-nav-02.0d15b460d7.json","lessons/mc-nav-03.c2e37aae6b.json","lessons/mc-nav-04.a55d67ff44.json","lessons/mc-nav-05.ecb4496004.json","lessons/mc-nav-06.4427f9345d.json","lessons/mc-nav-07.dd2eb75897.json","lessons/mc-nav-08.9e359f76cc.json","lessons/mc-nav-09.3a21439ea0.json","lessons/mc-nav-10.cef4086677.json","lessons/fw-rules-01.8f9d48e0af.json","lessons/fw-rules-02.bb08e0962a.json","lessons/fw-rules-03.0d494002af.json","lessons/fw-rules-04.83d8953ac5.json","lessons/fw-rules-05.f91a5b907b.json","lessons/fw-rules-06.291dd99ebe.json","lessons/fw-rules-07.481227001c.json","lessons/fw-rules-08.4ef6bb23e3.json","lessons/fw-rules-09.b6022ba77b.json","lessons/fw-rules-10.4fea9cc24e.json","lessons/fw-grandpa-01.98a22289bc.json","lessons/fw-grandpa-02.da83f32dd2.json","lessons/fw-grandpa-03.10c0f9d799.json","lessons/fw-grandpa-04.56062b54b2.json","lessons/fw-grandpa-05.0cfdadd336.json","lessons/fw-grandpa-06.d5e6604409.json","lessons/fw-grandpa-07.2dd9330ac9.json","lessons/fw-grandpa-08.1c5e649636.json","lessons/fw-grandpa-09.0aa196e1b7.json","lessons/fw-grandpa-10.e35808a6c4.json"], ...["ask.js","plan.js","places.js","vendor/maplibre-gl-shared.mjs","vendor/maplibre-gl-worker.mjs","vendor/maplibre-gl.css","vendor/maplibre-gl.mjs","vendor/mlcontour-worker.js","vendor/mlcontour.min.js","vendor/pmtiles.js","map/analyze-score.js","map/analyze-worker.js","map/analyze.css","map/area-lessons.js","map/core.js","map/focus.js","map/icons.js","map/layer-guide.js","map/layers.js","map/location.js","map/map.css","map/mvt.js","map/offline.js","map/search.js","map/spot-rundown.js","map/spots.js","map/store.js","map/style.js","map/terrain.css","map/tools-analyze.js","map/tools-content.js","map/tools-files.js","map/tools-geo.js","map/tools-insights.js","map/tools-main.js","map/tools-terrain.js","map/tools-track.js","map/tools-wind.js","map/tools.css","map/util.js","data/seasons/migratory.json","data/seasons/region1.json","data/seasons/region2.json","data/seasons/region3.json","data/seasons/region4.json","data/seasons/region5.json","data/seasons/region6.json","data/seasons/region7a.json","data/seasons/region7b.json","data/seasons/region8.json","data/harvest/bc-harvest.json","data/plans/checklists.json","data/plans/species-birds.json","data/plans/species.json","data/analyze/species-model.json","data/places/mu.json","data/places/places.json","data/migration.json"], ...["photos/caribou-bull.jpg","photos/wood-bison.jpg","photos/plains-bison-bulls.jpg","photos/cougar.jpg","photos/cougar-kitten.jpg","photos/grey-wolf.jpg","photos/coyote.jpg","photos/canada-lynx.jpg","photos/bobcat.jpg","photos/wolverine.jpg","photos/snowshoe-hare-summer.jpg","photos/snowshoe-hare-winter.jpg","photos/surf-scoter.jpg","photos/white-winged-scoter.jpg","photos/black-scoter.jpg","photos/long-tailed-duck.jpg","photos/harlequin-duck.jpg","photos/common-eider.jpg","photos/bighorn-ewe.jpg","photos/bighorn-ram-full-curl.jpg","photos/dalls-sheep-ram.jpg","photos/stones-sheep-ram.jpg","photos/stones-sheep-young-ram.jpg","photos/mountain-goat-billy.jpg","photos/mountain-goat-nanny-kid.jpg","photos/mule-deer-buck.jpg","photos/g-md-buck-front.jpg","photos/g-md-buck-sage.jpg","photos/g-md-doe-sage-snow.jpg","photos/g-md-doe-front.jpg","photos/g-md-radium.jpg","photos/g-wt-buck-flag.jpg","photos/g-wt-doe-flag.jpg","photos/g-wt-doe.jpg","photos/g-md-buck-cover.jpg","photos/g-md-doe-fawns-rear.jpg","photos/g-md-doe-fawn-cover.jpg","photos/g-md-distance.jpg","photos/g-md-fawn-bedded.jpg","photos/g-md-fawn.jpg","photos/g-wt-buck-side.jpg","photos/g-wt-buck-front.jpg","photos/g-wt-run.jpg","photos/g-moose-bull-side.jpg","photos/g-moose-bull-front.jpg","photos/g-moose-young-bull.jpg","photos/g-moose-cow.jpg","photos/g-moose-cow-head.jpg","photos/g-moose-cow-calf.jpg","photos/g-moose-calf.jpg","photos/g-moose-calf-winter.jpg","photos/g-elk-bull-side.jpg","photos/g-elk-bull-rear.jpg","photos/g-elk-bulls-distance.jpg","photos/g-elk-cow.jpg","photos/g-elk-cow-rear.jpg","photos/g-elk-herd.jpg","photos/g-bb-side.jpg","photos/g-bb-face.jpg","photos/g-bb-tofino.jpg","photos/g-bb-brown.jpg","photos/g-bb-cinnamon.jpg","photos/g-bb-blonde.jpg","photos/g-bb-sow-cubs.jpg","photos/g-griz-front.jpg","photos/g-griz-side.jpg","photos/g-griz-profile.jpg","photos/g-griz-face.jpg","photos/g-griz-sow.jpg","photos/g-md-run-away.jpg","photos/g-bighorn-pair.jpg","photos/g-md-buck-side.jpg","photos/g-md-buck-rear.jpg","photos/g-md-buck-4pt.jpg","photos/g-md-buck-open.jpg","photos/g-md-bound.jpg","photos/g-md-buck-small.jpg","photos/g-md-forkhorn.jpg","photos/g-bt-buck-velvet.jpg","photos/g-bt-victoria.jpg","photos/g-bt-doe.jpg","photos/g-bt-bedded.jpg","photos/g-bt-buck.jpg","photos/g-md-young-bucks.jpg","photos/g-wigeon-flight.jpg","photos/g-gwt-flight.jpg","photos/g-shoveler-flight.jpg","photos/g-shoveler-flock.jpg","photos/g-wood-duck-flight.jpg","photos/g-scaup-flight.jpg","photos/g-bufflehead-flight.jpg","photos/g-goldeneye-flight.jpg","photos/g-canada-goose-flight.jpg","photos/g-snow-geese-skagit.jpg","photos/g-snow-geese-flock.jpg","photos/g-loon.jpg","photos/g-western-grebe.jpg","photos/g-redhead-flight.jpg","photos/g-trumpeter-swan.jpg","photos/g-tundra-swans-flight.jpg","photos/g-horned-grebe.jpg","photos/g-quail-male-vernon.jpg","photos/g-quail-pair.jpg","photos/g-quail-female.jpg","photos/g-chukar.jpg","photos/g-ruffed-snow.jpg","photos/g-spruce-male.jpg","photos/g-sooty-male.jpg","photos/g-sooty-hen.jpg","photos/g-ptarmigan-summer.jpg","photos/g-ptarmigan-winter.jpg","photos/g-pheasant-rooster.jpg","photos/g-pheasant-hen.jpg","photos/g-turkey-tom.jpg","photos/g-turkey-hen.jpg","photos/g-turkey-flock.jpg","photos/g-sage-grouse.jpg","photos/g-ruffed-grey.jpg","photos/g-ruffed-tree.jpg","photos/g-md-does-bedded.jpg","photos/g-md-buck-bedded.jpg","photos/g-goat-radium.jpg","photos/g-goat-face.jpg","photos/g-wolf-grey.jpg","photos/g-wolf-black.jpg","photos/g-coyote-snow.jpg","photos/g-coyote-howl.jpg","photos/g-lynx.jpg","photos/g-cougar-glacier.jpg","photos/g-bighorn-ram.jpg","photos/wigeon-drake.jpg","photos/wigeon-hen.jpg","photos/green-winged-teal-drake.jpg","photos/green-winged-teal-hen.jpg","photos/blue-winged-teal-drake.jpg","photos/blue-winged-teal-hen.jpg","photos/gadwall-drake.jpg","photos/gadwall-drake-flight.jpg","photos/gadwall-hen.jpg","photos/shoveler-drake.jpg","photos/shoveler-hen.jpg","photos/wood-duck-drake.jpg","photos/wood-duck-hen.jpg","photos/common-goldeneye-drake.jpg","photos/common-goldeneye-hen.jpg","photos/barrows-goldeneye-drake.jpg","photos/barrows-goldeneye-hen.jpg","photos/bufflehead-drake.jpg","photos/bufflehead-hen.jpg","photos/ring-necked-duck-drake.jpg","photos/ring-necked-duck-hen.jpg","photos/lesser-scaup-drake.jpg","photos/lesser-scaup-hen.jpg","photos/canvasback-drake.jpg","photos/canvasback-hen.jpg","photos/redhead-drake.jpg","photos/redhead-hen.jpg","photos/common-merganser-drake.jpg","photos/common-merganser-hen.jpg","photos/hooded-merganser-drake.jpg","photos/hooded-merganser-hen.jpg","photos/divers-taking-off.jpg","photos/mallards-flushing.jpg","photos/mallards-flying.jpg","photos/pintail-hen.jpg","photos/canada-goose.jpg","photos/cackling-goose.jpg","photos/cackling-and-canada-geese.jpg","photos/snow-goose.jpg","photos/ross-goose.jpg","photos/snow-and-ross-geese.jpg","photos/white-fronted-goose.jpg","photos/brant.jpg","photos/hab-aspen-grove-snow.jpg","photos/hab-bear-berry-patch.jpg","photos/hab-bear-claw-aspen.jpg","photos/hab-bear-scat-berries.jpg","photos/hab-bear-scat-okanagan.jpg","photos/hab-bear-track-front.jpg","photos/hab-bear-track-mud.jpg","photos/hab-beaver-lodge.jpg","photos/hab-bitterbrush-leaf.jpg","photos/hab-bitterbrush-slope.jpg","photos/hab-blackberry.jpg","photos/hab-bracken.jpg","photos/hab-cattail-head.jpg","photos/hab-cattail-marsh.jpg","photos/hab-ceanothus-leaf.jpg","photos/hab-ceanothus-patch.jpg","photos/hab-chokecherry.jpg","photos/hab-deer-pellets-fresh.jpg","photos/hab-deer-pellets-old.jpg","photos/hab-deer-rub.jpg","photos/hab-deer-track-dirt.jpg","photos/hab-deer-track-foothills.jpg","photos/hab-deer-trail-reeds.jpg","photos/hab-deer-trail-snow.jpg","photos/hab-dogwood-flowers.jpg","photos/hab-dogwood-stems.jpg","photos/hab-douglas-fir-stand.jpg","photos/hab-douglas-fir-tree.jpg","photos/hab-duck-tracks.jpg","photos/hab-elk-pellets.jpg","photos/hab-elk-rub.jpg","photos/hab-elk-tracks-shore.jpg","photos/hab-elk-trail-snow.jpg","photos/hab-elk-wallow.jpg","photos/hab-geese-stubble.jpg","photos/hab-grass-fir-edge.jpg","photos/hab-grouse-snow-roost.jpg","photos/hab-grouse-track-line.jpg","photos/hab-grouse-tracks-snow.jpg","photos/hab-grouse-wing-prints.jpg","photos/hab-huckleberry-berry.jpg","photos/hab-huckleberry-bush.jpg","photos/hab-kamloops-pond-farm.jpg","photos/hab-kamloops-sagebrush.jpg","photos/hab-kinnikinnick.jpg","photos/hab-lac-du-bois-grassland.jpg","photos/hab-lac-du-bois-potholes.jpg","photos/hab-moose-tracks-mud.jpg","photos/hab-moose-trail-snow.jpg","photos/hab-moose-willows.jpg","photos/hab-north-thompson-burn.jpg","photos/hab-osoyoos-wetland.jpg","photos/hab-pondweed.jpg","photos/hab-quail-vernon.jpg","photos/hab-sagebrush-bush.jpg","photos/hab-salal.jpg","photos/hab-salmonberry.jpg","photos/hab-saskatoon-berries.jpg","photos/hab-saskatoon-flowers.jpg","photos/hab-skunk-cabbage.jpg","photos/hab-snowberry.jpg","photos/hab-soopolallie.jpg","photos/hab-subalpine-forest.jpg","photos/hab-wells-gray-cutblock.jpg","photos/hab-willow-shrub.jpg","photos/hab-woods-rose-hips.jpg","photos/hab-woods-rose-slope.jpg","photos/rl-knoll-newnham.jpg","photos/rl-edge-grass-aspen.jpg","photos/rl-bluff-saddle-mtn.jpg","photos/rl-beaver-pond-manning.jpg","photos/rl-snowy-forest-road.jpg","photos/rl-hedgerow-field-edge.jpg","photos/dusky-grouse-hen.jpg","photos/dusky-grouse-male.jpg","photos/ruffed-grouse-hen.jpg","photos/sharp-tailed-grouse.jpg","photos/sharp-tailed-grouse-snow.jpg","photos/spruce-grouse-hen.jpg","photos/mallard-drake.jpg","photos/mallard-drake-flight.jpg","photos/mallard-hen.jpg","photos/pintail-drake.jpg","photos/pintail-drake-flight.jpg"], 'hunt-mentor-offline.html']; // content: lesson screens and search text (lessons/*.json)
const fresh = (u) => new Request(u, { cache: 'reload' }); // skip the browser HTTP cache so one version never mixes with another

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(CORE.map(fresh));
    let i = 0;
    const worker = async () => { while (i < EXTRA.length) { const u = EXTRA[i++]; try { await c.add(fresh(u)); } catch (err) { /* skipped, loads on demand */ } } };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== TILES && k !== DATA && !k.startsWith('hm-offline-')).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => caches.open(TILES)).then(trim));
});

// One cache key for every OpenFreeMap tile set version, so saved areas keep working after the weekly update (same rule in map/offline.js).
const normKey = (u) => u.replace(/^(https:\/\/tiles\.openfreemap\.org\/[a-z0-9_]+)\/[^/]+\/(\d+\/\d+\/\d+\.pbf)(\?.*)?$/, '$1/_/$2');
const MATCH = { ignoreVary: true };

self.addEventListener('message', (e) => { if (e.data && e.data.hm === 'offline-changed') pmIdx = null; });

// ---------- no signal detection ----------
// Down when the phone says offline, or when a request got nothing back for NET_QUIET while no other request came back
// either (a phone with no signal often says "online" and lets requests hang for a minute). Then every waiting request
// stops at once and for DOWN_MS nothing waits on the network. One slow request on a working link is allowed NET_WAIT.
const DOWN_MS = 12000, NET_WAIT = 15000, NET_QUIET = 3000;
let downUntil = 0, lastNetOk = 0;
const inflight = new Set();
const isDown = () => (self.navigator && self.navigator.onLine === false) || Date.now() < downUntil;
function markDown() { downUntil = Date.now() + DOWN_MS; for (const c of inflight) c.abort(); inflight.clear(); }
function net(req, ms = NET_WAIT) {
  const ctrl = new AbortController(), started = Date.now();
  inflight.add(ctrl);
  const quiet = setTimeout(() => { if (lastNetOk < started) markDown(); }, NET_QUIET);
  const hard = setTimeout(() => { inflight.delete(ctrl); ctrl.abort(); }, ms);
  const end = () => { clearTimeout(quiet); clearTimeout(hard); inflight.delete(ctrl); };
  return fetch(req, { signal: ctrl.signal }).then((res) => { end(); lastNetOk = Date.now(); downUntil = 0; return res; }, (err) => {
    end(); if (!ctrl.signal.aborted || Date.now() - started >= NET_QUIET) downUntil = Math.max(downUntil, Date.now() + DOWN_MS);
    throw err;
  });
}
const fail = () => Response.error();

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Offline Maps downloads: straight to the network (byte range header kept), the page stores them itself
  if (url.searchParams.has('hmdl')) {
    url.searchParams.delete('hmdl');
    const h = new Headers(); const r = req.headers.get('range'); if (r) h.set('range', r);
    e.respondWith(fetch(url.href, { mode: 'cors', credentials: 'omit', headers: h, cache: req.cache === 'reload' ? 'reload' : 'default' }));
    return;
  }
  if (url.origin === self.location.origin) {
    if (/\/data\/layers\/manifest\.json$/.test(url.pathname)) { e.respondWith(networkFirst(req, DATA, 1500)); return; }
    if (/\.pmtiles$/.test(url.pathname)) { e.respondWith(pmtiles(req)); return; }
    if (/\/data\/(layers|spots)\//.test(url.pathname)) { e.respondWith(dataFirst(req)); return; }
    e.respondWith(shell(req));
    return;
  }
  if (url.hostname === 'tiles.openfreemap.org') {
    if (/\.pbf$/.test(url.pathname) || url.pathname.startsWith('/sprites/')) e.respondWith(tileFirst(req));
    else e.respondWith(networkFirst(req, TILES, 1000)); // tile index (TileJSON) and styles: a saved copy after 1 s
    return;
  }
  if ((url.hostname === 's3.amazonaws.com' && url.pathname.startsWith('/elevation-tiles-prod/'))
    || (url.hostname === 'server.arcgisonline.com' && url.pathname.includes('/tile/'))
    || url.hostname === 'tile.opentopomap.org') { e.respondWith(tileFirst(req)); return; }
  // everything else (place search, weather): network only
});

async function shell(req) {
  const hit = await caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }));
  if (hit) return hit;
  try {
    if (isDown() && req.mode !== 'navigate') { const any = await caches.match(req, { ignoreSearch: true, ignoreVary: true }); if (any) return any; }
    const res = await net(req);
    // a precache file that was skipped at install: keep it now (map code, vendor libraries, photos)
    if (res.ok && /\/(map|vendor|photos|seasons|harvest|lessons|places)\/[^/]+$|\/(home|places)\.js$|\/data\/migration\.json$/.test(new URL(req.url).pathname)) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
    return res;
  } catch (err) {
    if (req.mode === 'navigate') { const idx = await caches.match('index.html'); if (idx) return idx; }
    throw err;
  }
}

let puts = 0;
async function tileFirst(req) {
  const key = normKey(req.url);
  const hit = await caches.match(key, MATCH);
  if (hit) return hit;
  if (isDown()) return fail(); // no signal: answer now, do not wait for a network that is not there
  let res;
  try { res = await net(req); } catch (err) { return fail(); }
  if (res.ok) {
    const copy = res.clone();
    caches.open(TILES).then((c) => c.put(key, copy).then(() => { if (++puts % 100 === 0) trim(c); })).catch(() => {});
  }
  return res;
}
async function trim(c) {
  const keys = await c.keys();
  if (keys.length > TILE_CAP) await Promise.all(keys.slice(0, keys.length - TILE_CAP + 300).map((k) => c.delete(k)));
}

async function dataFirst(req) {
  const hit = await caches.match(req, MATCH);
  if (hit) return hit;
  const older = () => caches.match(req, { ignoreSearch: true, ignoreVary: true }); // an older version beats nothing offline
  // No signal and never saved (a file next to a saved area): an empty layer, the same as what the map can show there.
  const none = () => (/\.(geo)?json$/.test(new URL(req.url).pathname)
    ? new Response('{"type":"FeatureCollection","features":[]}', { status: 200, headers: { 'Content-Type': 'application/json', 'X-Hm-Offline': 'not-saved' } }) : fail());
  if (isDown()) { const old = await older(); return old || none(); }
  try {
    const res = await net(req);
    if (res.ok) {
      const copy = res.clone(), path = new URL(req.url).pathname;
      caches.open(DATA).then(async (c) => {
        await c.put(req, copy);
        for (const k of await c.keys()) if (new URL(k.url).pathname === path && k.url !== req.url) c.delete(k); // older versions
      }).catch(() => {});
    }
    return res;
  } catch (err) {
    const old = await older();
    return old || none();
  }
}

/** Network first, but never a long wait: down means the saved copy at once; otherwise the saved copy after ms. */
async function networkFirst(req, cacheName, ms) {
  const fromCache = () => caches.match(req, MATCH);
  if (isDown()) { const hit = await fromCache(); if (hit) return hit; }
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(async () => { const hit = await fromCache(); if (hit && !done) { done = true; resolve(hit); } }, ms);
    net(req).then(async (res) => {
      if (res.ok) { const copy = res.clone(); caches.open(cacheName).then((c) => c.put(req, copy)).catch(() => {}); }
      else if (!done) { const hit = await fromCache(); if (hit) { done = true; clearTimeout(timer); resolve(hit); return; } }
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }, async (err) => {
      clearTimeout(timer); if (done) return;
      const hit = await fromCache(); done = true;
      if (hit) resolve(hit); else reject(err);
    });
  });
}

// ---------- PMTiles: byte ranges ----------
// Saved whole: cut the range from the saved file. Saved as range chunks (big files, map/offline.js): cut it from the chunk
// that holds it. Not saved: network (or fail at once when there is no signal).
const plain = (u) => { const x = new URL(u); x.searchParams.delete('hmr'); x.searchParams.delete('hmt'); x.searchParams.delete('hmdl'); return x.href; };
let pmIdx = null;
async function pmIndex() {
  if (pmIdx) return pmIdx;
  const idx = new Map(); // path -> [{ file, s, e, t, key, cache }]
  for (const name of (await caches.keys()).filter((k) => k.startsWith('hm-offline-'))) {
    const c = await caches.open(name);
    for (const k of await c.keys()) {
      const m = /[?&]hmr=(\d+)-(\d+)(?:&hmt=(\d+))?/.exec(k.url); if (!m) continue;
      const file = plain(k.url), path = new URL(file).pathname;
      if (!idx.has(path)) idx.set(path, []);
      idx.get(path).push({ file, s: +m[1], e: +m[2], t: +m[3] || 0, key: k.url, cache: name });
    }
  }
  pmIdx = idx;
  return idx;
}
const sliceRes = (blob, s, e, total, etag) => {
  const part = blob.slice(0, e - s + 1), h = { 'Content-Type': 'application/octet-stream', 'Content-Length': String(part.size), 'Content-Range': `bytes ${s}-${s + part.size - 1}/${total || '*'}` };
  if (etag) h.ETag = etag;
  return new Response(part, { status: 206, headers: h });
};
async function pmtiles(req) {
  const range = req.headers.get('range');
  const hit = await caches.match(req.url, MATCH) || (isDown() && await caches.match(plain(req.url), { ignoreSearch: true, ignoreVary: true }));
  const m = range && /bytes=(\d+)-(\d*)/.exec(range);
  if (hit && !hit.headers.get('x-hm-range')) { // a whole saved file
    if (!range) return hit;
    const blob = await hit.blob();
    if (!m) return new Response(blob, { status: 200, headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(blob.size) } });
    const start = +m[1], end = m[2] ? Math.min(+m[2], blob.size - 1) : blob.size - 1;
    if (start >= blob.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
    return sliceRes(blob.slice(start), start, end, blob.size);
  }
  if (m) {
    const s = +m[1], e = m[2] ? +m[2] : Infinity, file = plain(req.url), down = isDown();
    const list = (await pmIndex()).get(new URL(file).pathname) || [];
    const ok = (c) => c.s <= s && (c.e >= e || (c.t && c.e >= c.t - 1 && c.e >= s));
    const c = list.find((x) => x.file === file && ok(x)) || (down && list.find(ok));
    if (c) {
      const res = await caches.open(c.cache).then((x) => x.match(c.key));
      if (res) { const blob = await res.blob(); return sliceRes(blob.slice(s - c.s), s, Math.min(e, c.e), c.t, res.headers.get('etag')); }
      pmIdx = null; // the area was deleted: rebuild the index next time
    }
  }
  if (isDown()) return fail();
  try { return await net(req); } catch (err) { return fail(); }
}
