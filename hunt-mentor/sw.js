// Hunt Mentor service worker.
// App shell (and the map code and libraries): cached on install, served cache first (offline first).
// Map tiles, terrain, fonts: cache first. Offline areas live in hm-offline-* caches, viewed tiles in hm-tiles (size capped).
// Our layer files (data/layers, data/spots): cache first per ?v= version. The layers manifest and the OpenFreeMap
// tile index: network first with a short wait, then the saved copy. PMTiles byte ranges are cut from a saved whole file
// or from the saved range chunks of an offline area (keys "<file>?v=..&hmr=<start>-<end>&hmt=<size>", map/offline.js).
// No signal: navigator.onLine false, or a network request failed or hung in the last few seconds, means "down".
// While down nothing waits on the network: saved copies answer at once and anything not saved fails at once.
const CACHE = 'hm-566083795e-2026-10-15';
const TILES = 'hm-tiles';
const DATA = 'hm-data';
const TILE_CAP = 4000;
// CORE must all load or the install fails (the old version keeps running). EXTRA files are added one by one:
// a missing photo or map file is skipped (fetched on demand later) instead of breaking the whole install.
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'content.js'];
const EXTRA = ['home.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', ...["lessons/search.b9c1e26f8d.json","lessons/countdown.345b06ae97.json","lessons/licences.719736f42f.json","lessons/shotgun-guide.cdd2e8707e.json","lessons/scope-guide.544757c2b1.json","lessons/sighting-in.0f7f95dff0.json","lessons/ammo-guide.43c82448fe.json","lessons/what-to-wear.b8c9e43314.json","lessons/pack-kit.df7520bba4.json","lessons/first-duck-hunt.694d633504.json","lessons/first-deer-hunt.0880f13391.json","lessons/first-quail-trip.cb6b1c43bf.json","lessons/legal-to-shoot.7309ed951b.json","lessons/after-the-shot.97ea2e6957.json","lessons/know-your-mus.aad5f3eace.json","lessons/firearm-safety.20fa0b7673.json","lessons/water-safety.a76d656812.json","lessons/bush-safety.59e616d085.json","lessons/atv-rules.46242566fc.json","lessons/bc-rules.8a9f937178.json","lessons/maps-terrain.67d4b2ea92.json","lessons/maps-navigation.a0889aeeca.json","lessons/maps-land-status.c85edff191.json","lessons/map-scouting.82365b62c4.json","lessons/wind-thermals.2bff01c6ca.json","lessons/glassing.6a9fad669d.json","lessons/still-hunting.4fcfa271a8.json","lessons/weather-moon.a2e8b0eb36.json","lessons/field-first-aid.7271e0d333.json","lessons/cold-injuries.b69fcca975.json","lessons/lost-survival-kit.32eb8b18e4.json","lessons/fire-wet-weather.49b2dd0758.json","lessons/shelter-night-out.9d3568d79f.json","lessons/water-safe-drinking.e933cab357.json","lessons/bear-cougar-encounters.c00f1aa3d0.json","lessons/wildfire-smoke-heat.c53c7ebcdb.json","lessons/avalanche-hunters.e50d3746b7.json","lessons/ice-cold-water.071babf85f.json","lessons/rifle-mechanics.e7afeb90e5.json","lessons/cartridge-anatomy.2199e4b3ff.json","lessons/ballistics-deep.89009684bb.json","lessons/judging-distance.065b1efd02.json","lessons/field-positions.411ee81026.json","lessons/season-practice.f4fdf119af.json","lessons/shotgun-mastery.4adaeaebd2.json","lessons/rimfire-22.60306ed0d0.json","lessons/firearm-care.d667708eab.json","lessons/optics-mastery.a78286e5a5.json","lessons/topo-deep-dive.df6a3dfee3.json","lessons/compass-mastery.73063bd434.json","lessons/gps-phone-battery.a47a468c3b.json","lessons/hunt-map-pro.2c7b548c1b.json","lessons/route-planning.9d05166b33.json","lessons/night-navigation.85b156c2d1.json","lessons/field-weather.b092d0d45f.json","lessons/wind-mastery.9fa1dcd7a0.json","lessons/stay-unseen.de3494ba14.json","lessons/stalking-footwork.b9b6b14c17.json","lessons/hunt-fitness.d5291856e3.json","lessons/packs-carrying.f180232685.json","lessons/fsr-vehicles-radio.a5f39ec46a.json","lessons/hunting-camp.7499a1fd56.json","lessons/hunt-food-water.46cd328bf2.json","lessons/hunting-partner.2317ddc41b.json","lessons/ethics-fair-chase.315b26af57.json","lessons/season-planning.99ac8de75f.json","lessons/daylight-weather-bc.a753bd1482.json","lessons/tracks.57cac423d4.json","lessons/sign.0515034546.json","lessons/funnels.71f5081b2f.json","lessons/food-water-cover.2a2a1d2b82.json","lessons/the-rut.98e2c4f2a5.json","lessons/snow-tracking.1a9e64ab19.json","lessons/sign-drill.bf7e26b519.json","lessons/habitat-deer.024bdaa7c0.json","lessons/habitat-ducks.aed919492c.json","lessons/habitat-upland.445276c1d0.json","lessons/habitat-big-game.b27726079c.json","lessons/migration.bfc63bc6a7.json","lessons/landforms-101.114b8432a1.json","lessons/slope-aspect.2259399dbe.json","lessons/elevation-snowline.40213468ef.json","lessons/water-on-land.ae8ab620b6.json","lessons/edges.baafeb5bb3.json","lessons/bedding-cover.18830fb773.json","lessons/escape-terrain.f9ae53e5d4.json","lessons/pinch-points.98b21cfd6b.json","lessons/habitat-islands.525471523b.json","lessons/read-land-truck-map.a74a2d4d4f.json","lessons/bec-zones.1ea557d1f0.json","lessons/grassland-country.91b30124ed.json","lessons/dry-forest-country.aaaa937288.json","lessons/wet-forest-country.c8e9687a50.json","lessons/wetland-country.e2b9914daa.json","lessons/burn-country.1c4d902c88.json","lessons/cutblock-country.d4c4feb56e.json","lessons/farm-country.45a8ca3585.json","lessons/browse-plants.f018e6b5f4.json","lessons/berries-mast.f1df982db0.json","lessons/rs-track-measuring.f65995402c.json","lessons/rs-track-aging.715bfa8af1.json","lessons/rs-droppings.90cdf1ff35.json","lessons/rs-beds.688174eafa.json","lessons/rs-rubs-scrapes.361da9dfb9.json","lessons/rs-bird-sign.0f0fc1a46b.json","lessons/rs-predator-sign.00836c5810.json","lessons/rs-blood-hair-tissue.f430983f90.json","lessons/rs-track-following.ac5f0a71ec.json","lessons/rs-sign-substrates.38ca5f12f6.json","lessons/fronts-and-movement.db1486d816.json","lessons/pressure-push.a56fa85c64.json","lessons/bc-migration-routes.4839a807df.json","lessons/winter-range-legal.a5b994e718.json","lessons/waterfowl-daily-flights.db160482a3.json","lessons/upland-daily-pattern.3467b359f2.json","lessons/build-hunting-map.d52c954103.json","lessons/land-drill-heffley.e9f0b288f9.json","lessons/moon-and-daylight.20523bc08f.json","lessons/land-in-weather.af9c2a27e1.json","lessons/mule-deer.128d1017af.json","lessons/white-tailed-deer.821507b957.json","lessons/deer-mind.ebb3766aac.json","lessons/moose.500c13dbd7.json","lessons/elk.2b954c906a.json","lessons/black-bear.da438b43e4.json","lessons/ducks.7c318051a0.json","lessons/geese.a66c68786c.json","lessons/grouse.0c622bc7fe.json","lessons/upland-birds.402d79e060.json","lessons/mountain-sheep.56487643f2.json","lessons/mountain-goat.02b40da3c9.json","lessons/caribou-bison.670e94a917.json","lessons/wild-turkey.1a21ba7ed3.json","lessons/predators.49813b23e8.json","lessons/small-game.a620b78be7.json","lessons/sea-ducks.fb6fc22350.json","lessons/all-bc-species.1ea7c2acaa.json","lessons/gallery-deer.3f6f0009e8.json","lessons/gallery-waterfowl.b44da6d6d5.json","lessons/gallery-upland.be599706f5.json","lessons/gallery-big-game.dc09f46c4f.json","lessons/shooting-skills.e5c9db57cb.json","lessons/ballistics-308.7e674967ba.json","lessons/shot-placement.0fc7488cc7.json","lessons/shotgun-skills.7b600fb4d2.json","lessons/blood-trailing.0d321bd259.json","lessons/tagging-legal.8732471ebf.json","lessons/field-dressing.e8fc051912.json","lessons/meat-care.a9dc1eec8b.json","lessons/packing-out.37171ce8d8.json","lessons/cwd.e4860eed54.json","lessons/butchering.f8d0325783.json","lessons/cooking.76967c46fa.json","lessons/trophy-care.904e1a79d1.json","lessons/bc-calendar.a73b2c5d63.json","lessons/leh-strategy.9501d14707.json","lessons/top-areas.dfcb6611c1.json","lessons/etiquette.4a6f213b28.json","lessons/indigenous-respect.41c56a7f9e.json","lessons/landowner-permission.5ef4268434.json","lessons/grandpas-rules.a0d4347d15.json","lessons/hunt-journal-guide.edab975865.json","lessons/mastery-levels.ed298bf0aa.json","lessons/mentoring.9abdcdbcc3.json","lessons/local-heffley.2bcc47759f.json","lessons/local-mission.c623d2d2eb.json","lessons/local-okanagan.8c0eee5f0b.json","lessons/trip-yukon.b78fd1a91e.json","lessons/trip-alberta.30c209c4d1.json","lessons/trip-saskatchewan.05569ae5b5.json","lessons/trip-manitoba.32f7b269bc.json","lessons/trip-alaska.c8a1655ec6.json","lessons/named-areas.5e0dfaf990.json","lessons/rb-definitions.e904787a0d.json","lessons/rb-licences-fees.1346a4b0b8.json","lessons/rb-where-you-can-hunt.eebfb81b0e.json","lessons/rb-unlawful-acts.ee77b7df0f.json","lessons/rb-legal-methods.b852aaaa5d.json","lessons/rb-bag-limits.7a1a5d891d.json","lessons/rb-after-the-kill.c73d283d2a.json","lessons/rb-region-3.a9a012471b.json","lessons/rb-region-2.27ab692234.json","lessons/rb-region-8.b86becfae4.json","lessons/rb-migratory-birds.473db5e3a6.json","lessons/rb-region-1.80e016cc0e.json","lessons/rb-region-4.5f5a89b608.json","lessons/rb-region-6.c73b8265dd.json","lessons/rb-region-7a.dfaa8c9052.json","lessons/rb-region-7b.37e1cdd8b4.json","lessons/mc-mule-deer-01.d26262e329.json","lessons/mc-mule-deer-02.3cfb3e8091.json","lessons/mc-mule-deer-03.1cfb4a742d.json","lessons/mc-mule-deer-04.d3ccae4fae.json","lessons/mc-mule-deer-05.ea4e69e189.json","lessons/mc-mule-deer-06.a31343eb55.json","lessons/mc-mule-deer-07.733dd34a8f.json","lessons/mc-mule-deer-08.534520b3c4.json","lessons/mc-mule-deer-09.95f3547e4f.json","lessons/mc-mule-deer-10.b640db691f.json","lessons/mc-white-tailed-deer-01.b62547933d.json","lessons/mc-white-tailed-deer-02.1228316ff6.json","lessons/mc-white-tailed-deer-03.95ca826252.json","lessons/mc-white-tailed-deer-04.0a1bd1cdc1.json","lessons/mc-white-tailed-deer-05.667c2d7522.json","lessons/mc-white-tailed-deer-06.18af192b6f.json","lessons/mc-white-tailed-deer-07.79a26da0d2.json","lessons/mc-white-tailed-deer-08.af7bb15717.json","lessons/mc-white-tailed-deer-09.82ca36ecfd.json","lessons/mc-white-tailed-deer-10.642d044749.json","lessons/mc-ducks-01.4a550fff1b.json","lessons/mc-ducks-02.61fde85ec4.json","lessons/mc-ducks-03.f313f81524.json","lessons/mc-ducks-04.d4b1424bea.json","lessons/mc-ducks-05.2bea1865b5.json","lessons/mc-ducks-06.3264aabb1c.json","lessons/mc-ducks-07.415ae763c9.json","lessons/mc-ducks-08.6e15e875b7.json","lessons/mc-ducks-09.44d8068d67.json","lessons/mc-ducks-10.3a6ad43af4.json","lessons/mc-geese-01.377277f840.json","lessons/mc-geese-02.8b9de8abe7.json","lessons/mc-geese-03.d183655b17.json","lessons/mc-geese-04.2781094048.json","lessons/mc-geese-05.58820e4aa5.json","lessons/mc-geese-06.da21c23f8f.json","lessons/mc-geese-07.8bb7b46571.json","lessons/mc-geese-08.70edb6a100.json","lessons/mc-geese-09.584362f2a9.json","lessons/mc-geese-10.687ed4fc76.json","lessons/mc-grouse-01.b38273ada3.json","lessons/mc-grouse-02.bb3c8a5602.json","lessons/mc-grouse-03.9d3b0b6a3d.json","lessons/mc-grouse-04.f014131329.json","lessons/mc-grouse-05.92b2fa8cf4.json","lessons/mc-grouse-06.ffc1b9b090.json","lessons/mc-grouse-07.ad304cc094.json","lessons/mc-grouse-08.2d54e9c62f.json","lessons/mc-grouse-09.2063182e10.json","lessons/mc-grouse-10.55cb5f8d1a.json","lessons/mc-quail-01.cf40573610.json","lessons/mc-quail-02.0fae84747a.json","lessons/mc-quail-03.3ae8990a66.json","lessons/mc-quail-04.c74b919640.json","lessons/mc-quail-05.d62de45472.json","lessons/mc-quail-06.cf2734d2cd.json","lessons/mc-quail-07.2a907a7b4a.json","lessons/mc-quail-08.0fd9d19ec9.json","lessons/mc-quail-09.cd00ed4186.json","lessons/mc-quail-10.6616c4cfe6.json","lessons/mc-moose-01.3c0152526f.json","lessons/mc-moose-02.eee0830465.json","lessons/mc-moose-03.4e0e35840f.json","lessons/mc-moose-04.7867d5c274.json","lessons/mc-moose-05.0236e099a0.json","lessons/mc-moose-06.ae30b3b69b.json","lessons/mc-moose-07.ecb47defd2.json","lessons/mc-moose-08.afcf3cb355.json","lessons/mc-moose-09.da7fca7650.json","lessons/mc-moose-10.51e19e3879.json","lessons/mc-elk-01.374ae497e0.json","lessons/mc-elk-02.2b77375fd5.json","lessons/mc-elk-03.1e1949a81e.json","lessons/mc-elk-04.ad34e28550.json","lessons/mc-elk-05.fa7ba51255.json","lessons/mc-elk-06.aa516a3cb8.json","lessons/mc-elk-07.10f4589a78.json","lessons/mc-elk-08.0cba0d81f3.json","lessons/mc-elk-09.d52b148dfa.json","lessons/mc-elk-10.936eb4335a.json","lessons/mc-black-bear-01.6647252bc8.json","lessons/mc-black-bear-02.f7c5572751.json","lessons/mc-black-bear-03.79bc06d6cb.json","lessons/mc-black-bear-04.05e6c246d2.json","lessons/mc-black-bear-05.2e650498d1.json","lessons/mc-black-bear-06.776b43a623.json","lessons/mc-black-bear-07.eef4e20036.json","lessons/mc-black-bear-08.510fa14a67.json","lessons/mc-black-bear-09.658f588469.json","lessons/mc-black-bear-10.c88bef614a.json","lessons/mc-skills-01.461686a800.json","lessons/mc-skills-02.4c7c9d9242.json","lessons/mc-skills-03.d03025a731.json","lessons/mc-skills-04.a543bbffaa.json","lessons/mc-skills-05.bd5af7a9cd.json","lessons/mc-skills-06.7af0372501.json","lessons/mc-skills-07.a457d724c9.json","lessons/mc-skills-08.5e78992551.json","lessons/mc-skills-09.4b1af350eb.json","lessons/mc-skills-10.4daa804cb0.json","lessons/mc-nav-01.9e680b0cda.json","lessons/mc-nav-02.74564a5844.json","lessons/mc-nav-03.e91a3997f7.json","lessons/mc-nav-04.dfd731c107.json","lessons/mc-nav-05.b6101a39e3.json","lessons/mc-nav-06.4427f9345d.json","lessons/mc-nav-07.cc4f16f97b.json","lessons/mc-nav-08.9e359f76cc.json","lessons/mc-nav-09.470e488980.json","lessons/mc-nav-10.cef4086677.json","lessons/fw-rules-01.fa0073745e.json","lessons/fw-rules-02.f67899e057.json","lessons/fw-rules-03.0d494002af.json","lessons/fw-rules-04.65cbef2339.json","lessons/fw-rules-05.e3cc336e65.json","lessons/fw-rules-06.75ebbc20b1.json","lessons/fw-rules-07.a95faa6130.json","lessons/fw-rules-08.506a065a02.json","lessons/fw-rules-09.b6022ba77b.json","lessons/fw-rules-10.0db12afe21.json","lessons/fw-grandpa-01.3da7d65460.json","lessons/fw-grandpa-02.289daf1dc4.json","lessons/fw-grandpa-03.7ea3ecbe58.json","lessons/fw-grandpa-04.fc84a3dcd6.json","lessons/fw-grandpa-05.0cfdadd336.json","lessons/fw-grandpa-06.185e23d338.json","lessons/fw-grandpa-07.01d81584cf.json","lessons/fw-grandpa-08.ab333360a8.json","lessons/fw-grandpa-09.fd31371c22.json","lessons/fw-grandpa-10.001e9349dc.json"], ...["ask.js","plan.js","places.js","vendor/maplibre-gl-shared.mjs","vendor/maplibre-gl-worker.mjs","vendor/maplibre-gl.css","vendor/maplibre-gl.mjs","vendor/mlcontour-worker.js","vendor/mlcontour.min.js","vendor/pmtiles.js","map/analyze-score.js","map/analyze-worker.js","map/analyze.css","map/area-lessons.js","map/core.js","map/focus.js","map/icons.js","map/layer-guide.js","map/layers.js","map/location.js","map/map.css","map/mvt.js","map/offline.js","map/search.js","map/spot-rundown.js","map/spots.js","map/store.js","map/style.js","map/terrain.css","map/tools-analyze.js","map/tools-content.js","map/tools-files.js","map/tools-geo.js","map/tools-insights.js","map/tools-main.js","map/tools-terrain.js","map/tools-track.js","map/tools-wind.js","map/tools.css","map/util.js","data/seasons/migratory.json","data/seasons/region1.json","data/seasons/region2.json","data/seasons/region3.json","data/seasons/region4.json","data/seasons/region5.json","data/seasons/region6.json","data/seasons/region7a.json","data/seasons/region7b.json","data/seasons/region8.json","data/harvest/bc-harvest.json","data/plans/checklists.json","data/plans/species-birds.json","data/plans/species.json","data/analyze/species-model.json","data/places/mu.json","data/places/places.json","data/migration.json"], ...["photos/caribou-bull.jpg","photos/wood-bison.jpg","photos/plains-bison-bulls.jpg","photos/cougar.jpg","photos/cougar-kitten.jpg","photos/grey-wolf.jpg","photos/coyote.jpg","photos/canada-lynx.jpg","photos/bobcat.jpg","photos/wolverine.jpg","photos/snowshoe-hare-summer.jpg","photos/snowshoe-hare-winter.jpg","photos/surf-scoter.jpg","photos/white-winged-scoter.jpg","photos/black-scoter.jpg","photos/long-tailed-duck.jpg","photos/harlequin-duck.jpg","photos/common-eider.jpg","photos/bighorn-ewe.jpg","photos/bighorn-ram-full-curl.jpg","photos/dalls-sheep-ram.jpg","photos/stones-sheep-ram.jpg","photos/stones-sheep-young-ram.jpg","photos/mountain-goat-billy.jpg","photos/mountain-goat-nanny-kid.jpg","photos/mule-deer-buck.jpg","photos/g-md-buck-front.jpg","photos/g-md-buck-sage.jpg","photos/g-md-doe-sage-snow.jpg","photos/g-md-doe-front.jpg","photos/g-md-radium.jpg","photos/g-wt-buck-flag.jpg","photos/g-wt-doe-flag.jpg","photos/g-wt-doe.jpg","photos/g-md-buck-cover.jpg","photos/g-md-doe-fawns-rear.jpg","photos/g-md-doe-fawn-cover.jpg","photos/g-md-distance.jpg","photos/g-md-fawn-bedded.jpg","photos/g-md-fawn.jpg","photos/g-wt-buck-side.jpg","photos/g-wt-buck-front.jpg","photos/g-wt-run.jpg","photos/g-moose-bull-side.jpg","photos/g-moose-bull-front.jpg","photos/g-moose-young-bull.jpg","photos/g-moose-cow.jpg","photos/g-moose-cow-head.jpg","photos/g-moose-cow-calf.jpg","photos/g-moose-calf.jpg","photos/g-moose-calf-winter.jpg","photos/g-elk-bull-side.jpg","photos/g-elk-bull-rear.jpg","photos/g-elk-bulls-distance.jpg","photos/g-elk-cow.jpg","photos/g-elk-cow-rear.jpg","photos/g-elk-herd.jpg","photos/g-bb-side.jpg","photos/g-bb-face.jpg","photos/g-bb-tofino.jpg","photos/g-bb-brown.jpg","photos/g-bb-cinnamon.jpg","photos/g-bb-blonde.jpg","photos/g-bb-sow-cubs.jpg","photos/g-griz-front.jpg","photos/g-griz-side.jpg","photos/g-griz-profile.jpg","photos/g-griz-face.jpg","photos/g-griz-sow.jpg","photos/g-md-run-away.jpg","photos/g-bighorn-pair.jpg","photos/g-md-buck-side.jpg","photos/g-md-buck-rear.jpg","photos/g-md-buck-4pt.jpg","photos/g-md-buck-open.jpg","photos/g-md-bound.jpg","photos/g-md-buck-small.jpg","photos/g-md-forkhorn.jpg","photos/g-bt-buck-velvet.jpg","photos/g-bt-victoria.jpg","photos/g-bt-doe.jpg","photos/g-bt-bedded.jpg","photos/g-bt-buck.jpg","photos/g-md-young-bucks.jpg","photos/g-wigeon-flight.jpg","photos/g-gwt-flight.jpg","photos/g-shoveler-flight.jpg","photos/g-shoveler-flock.jpg","photos/g-wood-duck-flight.jpg","photos/g-scaup-flight.jpg","photos/g-bufflehead-flight.jpg","photos/g-goldeneye-flight.jpg","photos/g-canada-goose-flight.jpg","photos/g-snow-geese-skagit.jpg","photos/g-snow-geese-flock.jpg","photos/g-loon.jpg","photos/g-western-grebe.jpg","photos/g-redhead-flight.jpg","photos/g-trumpeter-swan.jpg","photos/g-tundra-swans-flight.jpg","photos/g-horned-grebe.jpg","photos/g-quail-male-vernon.jpg","photos/g-quail-pair.jpg","photos/g-quail-female.jpg","photos/g-chukar.jpg","photos/g-ruffed-snow.jpg","photos/g-spruce-male.jpg","photos/g-sooty-male.jpg","photos/g-sooty-hen.jpg","photos/g-ptarmigan-summer.jpg","photos/g-ptarmigan-winter.jpg","photos/g-pheasant-rooster.jpg","photos/g-pheasant-hen.jpg","photos/g-turkey-tom.jpg","photos/g-turkey-hen.jpg","photos/g-turkey-flock.jpg","photos/g-sage-grouse.jpg","photos/g-ruffed-grey.jpg","photos/g-ruffed-tree.jpg","photos/g-md-does-bedded.jpg","photos/g-md-buck-bedded.jpg","photos/g-goat-radium.jpg","photos/g-goat-face.jpg","photos/g-wolf-grey.jpg","photos/g-wolf-black.jpg","photos/g-coyote-snow.jpg","photos/g-coyote-howl.jpg","photos/g-lynx.jpg","photos/g-cougar-glacier.jpg","photos/g-bighorn-ram.jpg","photos/wigeon-drake.jpg","photos/wigeon-hen.jpg","photos/green-winged-teal-drake.jpg","photos/green-winged-teal-hen.jpg","photos/blue-winged-teal-drake.jpg","photos/blue-winged-teal-hen.jpg","photos/gadwall-drake.jpg","photos/gadwall-drake-flight.jpg","photos/gadwall-hen.jpg","photos/shoveler-drake.jpg","photos/shoveler-hen.jpg","photos/wood-duck-drake.jpg","photos/wood-duck-hen.jpg","photos/common-goldeneye-drake.jpg","photos/common-goldeneye-hen.jpg","photos/barrows-goldeneye-drake.jpg","photos/barrows-goldeneye-hen.jpg","photos/bufflehead-drake.jpg","photos/bufflehead-hen.jpg","photos/ring-necked-duck-drake.jpg","photos/ring-necked-duck-hen.jpg","photos/lesser-scaup-drake.jpg","photos/lesser-scaup-hen.jpg","photos/canvasback-drake.jpg","photos/canvasback-hen.jpg","photos/redhead-drake.jpg","photos/redhead-hen.jpg","photos/common-merganser-drake.jpg","photos/common-merganser-hen.jpg","photos/hooded-merganser-drake.jpg","photos/hooded-merganser-hen.jpg","photos/divers-taking-off.jpg","photos/mallards-flushing.jpg","photos/mallards-flying.jpg","photos/pintail-hen.jpg","photos/canada-goose.jpg","photos/cackling-goose.jpg","photos/cackling-and-canada-geese.jpg","photos/snow-goose.jpg","photos/ross-goose.jpg","photos/snow-and-ross-geese.jpg","photos/white-fronted-goose.jpg","photos/brant.jpg","photos/hab-aspen-grove-snow.jpg","photos/hab-bear-berry-patch.jpg","photos/hab-bear-claw-aspen.jpg","photos/hab-bear-scat-berries.jpg","photos/hab-bear-scat-okanagan.jpg","photos/hab-bear-track-front.jpg","photos/hab-bear-track-mud.jpg","photos/hab-beaver-lodge.jpg","photos/hab-bitterbrush-leaf.jpg","photos/hab-bitterbrush-slope.jpg","photos/hab-blackberry.jpg","photos/hab-bracken.jpg","photos/hab-cattail-head.jpg","photos/hab-cattail-marsh.jpg","photos/hab-ceanothus-leaf.jpg","photos/hab-ceanothus-patch.jpg","photos/hab-chokecherry.jpg","photos/hab-deer-pellets-fresh.jpg","photos/hab-deer-pellets-old.jpg","photos/hab-deer-rub.jpg","photos/hab-deer-track-dirt.jpg","photos/hab-deer-track-foothills.jpg","photos/hab-deer-trail-reeds.jpg","photos/hab-deer-trail-snow.jpg","photos/hab-dogwood-flowers.jpg","photos/hab-dogwood-stems.jpg","photos/hab-douglas-fir-stand.jpg","photos/hab-douglas-fir-tree.jpg","photos/hab-duck-tracks.jpg","photos/hab-elk-pellets.jpg","photos/hab-elk-rub.jpg","photos/hab-elk-tracks-shore.jpg","photos/hab-elk-trail-snow.jpg","photos/hab-elk-wallow.jpg","photos/hab-geese-stubble.jpg","photos/hab-grass-fir-edge.jpg","photos/hab-grouse-snow-roost.jpg","photos/hab-grouse-track-line.jpg","photos/hab-grouse-tracks-snow.jpg","photos/hab-grouse-wing-prints.jpg","photos/hab-huckleberry-berry.jpg","photos/hab-huckleberry-bush.jpg","photos/hab-kamloops-pond-farm.jpg","photos/hab-kamloops-sagebrush.jpg","photos/hab-kinnikinnick.jpg","photos/hab-lac-du-bois-grassland.jpg","photos/hab-lac-du-bois-potholes.jpg","photos/hab-moose-tracks-mud.jpg","photos/hab-moose-trail-snow.jpg","photos/hab-moose-willows.jpg","photos/hab-north-thompson-burn.jpg","photos/hab-osoyoos-wetland.jpg","photos/hab-pondweed.jpg","photos/hab-quail-vernon.jpg","photos/hab-sagebrush-bush.jpg","photos/hab-salal.jpg","photos/hab-salmonberry.jpg","photos/hab-saskatoon-berries.jpg","photos/hab-saskatoon-flowers.jpg","photos/hab-skunk-cabbage.jpg","photos/hab-snowberry.jpg","photos/hab-soopolallie.jpg","photos/hab-subalpine-forest.jpg","photos/hab-wells-gray-cutblock.jpg","photos/hab-willow-shrub.jpg","photos/hab-woods-rose-hips.jpg","photos/hab-woods-rose-slope.jpg","photos/rl-knoll-newnham.jpg","photos/rl-edge-grass-aspen.jpg","photos/rl-bluff-saddle-mtn.jpg","photos/rl-beaver-pond-manning.jpg","photos/rl-snowy-forest-road.jpg","photos/rl-hedgerow-field-edge.jpg","photos/dusky-grouse-hen.jpg","photos/dusky-grouse-male.jpg","photos/ruffed-grouse-hen.jpg","photos/sharp-tailed-grouse.jpg","photos/sharp-tailed-grouse-snow.jpg","photos/spruce-grouse-hen.jpg","photos/mallard-drake.jpg","photos/mallard-drake-flight.jpg","photos/mallard-hen.jpg","photos/pintail-drake.jpg","photos/pintail-drake-flight.jpg"], 'hunt-mentor-offline.html']; // content: lesson screens and search text (lessons/*.json)
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
