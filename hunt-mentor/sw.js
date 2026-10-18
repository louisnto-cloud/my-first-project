// Hunt Mentor service worker.
// App shell (and the map code and libraries): cached on install, served cache first (offline first).
// Map tiles, terrain, fonts: cache first. Offline areas live in hm-offline-* caches, viewed tiles in hm-tiles (size capped).
// Our layer files (data/layers, data/spots): cache first per ?v= version. The layers manifest and the OpenFreeMap
// tile index: network first with a short wait, then the saved copy. PMTiles byte ranges are cut from a saved whole file
// or from the saved range chunks of an offline area (keys "<file>?v=..&hmr=<start>-<end>&hmt=<size>", map/offline.js).
// No signal: navigator.onLine false, or a network request failed or hung in the last few seconds, means "down".
// While down nothing waits on the network: saved copies answer at once and anything not saved fails at once.
const CACHE = 'hm-a2da8f4735-2026-10-18';
const TILES = 'hm-tiles';
const DATA = 'hm-data';
const TILE_CAP = 4000;
// CORE must all load or the install fails (the old version keeps running). EXTRA files are added one by one:
// a missing photo or map file is skipped (fetched on demand later) instead of breaking the whole install.
const CORE = ['./', 'index.html', 'style.css', 'app.js', 'content.js'];
const EXTRA = ['home.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', ...["lessons/search.d6ce043319.json","lessons/countdown.345b06ae97.json","lessons/licences.719736f42f.json","lessons/shotgun-guide.b4bc581f84.json","lessons/scope-guide.fa23a1b092.json","lessons/sighting-in.b74a5690e0.json","lessons/ammo-guide.a7308bdbf8.json","lessons/what-to-wear.b8c9e43314.json","lessons/pack-kit.df7520bba4.json","lessons/first-duck-hunt.cdaf47aaad.json","lessons/first-deer-hunt.84cca1f187.json","lessons/first-quail-trip.48c39f1c69.json","lessons/legal-to-shoot.40d686a305.json","lessons/after-the-shot.db2a34618d.json","lessons/know-your-mus.aad5f3eace.json","lessons/firearm-safety.74b7214e6e.json","lessons/water-safety.86b795d333.json","lessons/bush-safety.48de9d5c92.json","lessons/atv-rules.dbd3bcc5f4.json","lessons/bc-rules.136790f7fa.json","lessons/maps-terrain.669539ddf4.json","lessons/maps-navigation.59e0fcb110.json","lessons/maps-land-status.71f4ded307.json","lessons/map-scouting.d883c3c4ea.json","lessons/wind-thermals.2bff01c6ca.json","lessons/glassing.7e1c220ac7.json","lessons/still-hunting.629095465a.json","lessons/weather-moon.3940e99cab.json","lessons/field-first-aid.7271e0d333.json","lessons/cold-injuries.76da0e3074.json","lessons/lost-survival-kit.32eb8b18e4.json","lessons/fire-wet-weather.caf30be675.json","lessons/shelter-night-out.9d3568d79f.json","lessons/water-safe-drinking.e933cab357.json","lessons/bear-cougar-encounters.c00f1aa3d0.json","lessons/wildfire-smoke-heat.c53c7ebcdb.json","lessons/avalanche-hunters.663176a88e.json","lessons/ice-cold-water.b81ea13aac.json","lessons/rifle-mechanics.b0f946518e.json","lessons/cartridge-anatomy.a3908e6fae.json","lessons/ballistics-deep.c7b1bb7540.json","lessons/judging-distance.87a099efb3.json","lessons/field-positions.777fde4e7e.json","lessons/season-practice.0ef03e56a9.json","lessons/shotgun-mastery.ef7a0d7790.json","lessons/rimfire-22.4d633fda28.json","lessons/firearm-care.5770bf9e24.json","lessons/optics-mastery.942e91fc9e.json","lessons/topo-deep-dive.6d4379e5d8.json","lessons/compass-mastery.430620b5a8.json","lessons/gps-phone-battery.a40673dd91.json","lessons/hunt-map-pro.a7aa12f072.json","lessons/route-planning.40b33a9f6d.json","lessons/night-navigation.13518605a6.json","lessons/field-weather.b092d0d45f.json","lessons/wind-mastery.007d99a7c5.json","lessons/stay-unseen.369b083531.json","lessons/stalking-footwork.e92422bbd5.json","lessons/hunt-fitness.55a5ef484d.json","lessons/packs-carrying.1d9d838e7b.json","lessons/fsr-vehicles-radio.da7220ef0e.json","lessons/hunting-camp.13b0cb51b6.json","lessons/hunt-food-water.f0c76dac80.json","lessons/hunting-partner.46f32acdb8.json","lessons/ethics-fair-chase.ea3626eb5f.json","lessons/season-planning.cd7ee18622.json","lessons/daylight-weather-bc.4ccf9c8abd.json","lessons/tracks.704bed03d9.json","lessons/sign.5a52578e4a.json","lessons/funnels.3c95f1d35a.json","lessons/food-water-cover.571066157d.json","lessons/the-rut.8e816580c6.json","lessons/snow-tracking.69e219a5a1.json","lessons/sign-drill.a6fbc989bf.json","lessons/habitat-deer.024bdaa7c0.json","lessons/habitat-ducks.c68ee93b71.json","lessons/habitat-upland.445276c1d0.json","lessons/habitat-big-game.b27726079c.json","lessons/migration.5dddb98048.json","lessons/landforms-101.47a897ab00.json","lessons/slope-aspect.35ca0e7c65.json","lessons/elevation-snowline.ddb3de18b2.json","lessons/water-on-land.24fd8921dc.json","lessons/edges.4a9a3a181e.json","lessons/bedding-cover.4a2503f8eb.json","lessons/escape-terrain.2909bab74b.json","lessons/pinch-points.224b329341.json","lessons/habitat-islands.763cbf964e.json","lessons/read-land-truck-map.0054b151a3.json","lessons/bec-zones.1ea557d1f0.json","lessons/grassland-country.25e3566e04.json","lessons/dry-forest-country.76d249f1b6.json","lessons/wet-forest-country.c8e9687a50.json","lessons/wetland-country.4bb35759bb.json","lessons/burn-country.4a26adb89a.json","lessons/cutblock-country.b8c189764f.json","lessons/farm-country.9d67b82724.json","lessons/browse-plants.5fb56d24c7.json","lessons/berries-mast.f1df982db0.json","lessons/rs-track-measuring.f4383e3529.json","lessons/rs-track-aging.4025aa25e8.json","lessons/rs-droppings.19c6191ca4.json","lessons/rs-beds.53195a7d98.json","lessons/rs-rubs-scrapes.aee319e92f.json","lessons/rs-bird-sign.0f0fc1a46b.json","lessons/rs-predator-sign.e2753c0e47.json","lessons/rs-blood-hair-tissue.87fd862382.json","lessons/rs-track-following.ac5f0a71ec.json","lessons/rs-sign-substrates.bfadc2392b.json","lessons/fronts-and-movement.a5b4051af6.json","lessons/pressure-push.5c7ea4adf5.json","lessons/bc-migration-routes.7a192a7fff.json","lessons/winter-range-legal.4452ea31db.json","lessons/waterfowl-daily-flights.24e17839b7.json","lessons/upland-daily-pattern.11611f51f4.json","lessons/build-hunting-map.9f48693a74.json","lessons/land-drill-heffley.707f466681.json","lessons/moon-and-daylight.80df64ab0b.json","lessons/land-in-weather.dcf71872b6.json","lessons/mule-deer.bd49afa6be.json","lessons/white-tailed-deer.5234a1f244.json","lessons/deer-mind.84cbb6cca5.json","lessons/moose.4ff1c21799.json","lessons/elk.46932ab5b8.json","lessons/black-bear.cabc804aea.json","lessons/ducks.516d10c911.json","lessons/geese.df6ef0e6c6.json","lessons/grouse.cebdd35d10.json","lessons/upland-birds.d17451d3d3.json","lessons/mountain-sheep.937b210163.json","lessons/mountain-goat.531c2a0fb5.json","lessons/caribou-bison.911d0137be.json","lessons/wild-turkey.f9031d4aaf.json","lessons/predators.04a29744f7.json","lessons/small-game.9ef8b6782e.json","lessons/sea-ducks.7f21e070a7.json","lessons/all-bc-species.fa14eda26b.json","lessons/gallery-deer.3f6f0009e8.json","lessons/gallery-waterfowl.4ed11193a3.json","lessons/gallery-upland.9678a7a5b3.json","lessons/gallery-big-game.dc09f46c4f.json","lessons/shooting-skills.d021d3a068.json","lessons/ballistics-308.15c3b50db2.json","lessons/shot-placement.525672eeeb.json","lessons/shotgun-skills.25e85aa577.json","lessons/blood-trailing.987a5ba1f1.json","lessons/tagging-legal.96f51187f1.json","lessons/field-dressing.0b374dcad4.json","lessons/meat-care.c3839f4d38.json","lessons/packing-out.d3bd3d9c6a.json","lessons/cwd.f9bddb9d94.json","lessons/butchering.131a11c821.json","lessons/cooking.da3f304904.json","lessons/trophy-care.8d138b05b4.json","lessons/bc-calendar.7a305fa264.json","lessons/leh-strategy.147b1c7a2f.json","lessons/top-areas.0db0f0e064.json","lessons/etiquette.9c7af667a5.json","lessons/indigenous-respect.a3f0dc9cf8.json","lessons/landowner-permission.90efe31303.json","lessons/grandpas-rules.fd998eeda7.json","lessons/hunt-journal-guide.9d7ed8f826.json","lessons/mastery-levels.de335ab7e5.json","lessons/mentoring.9c22ce6b19.json","lessons/local-heffley.1dfb9bebd2.json","lessons/local-mission.15b8803d5c.json","lessons/local-okanagan.76f718dad8.json","lessons/trip-yukon.496cfd0b55.json","lessons/trip-alberta.8055eb7a19.json","lessons/trip-saskatchewan.73b71c0cc7.json","lessons/trip-manitoba.f8d05f0926.json","lessons/trip-alaska.f8d0837439.json","lessons/named-areas.8a04217bbe.json","lessons/local-harrison-deer.14112ff49e.json","lessons/rb-definitions.ed41d5c6ce.json","lessons/rb-licences-fees.f378c3fdc3.json","lessons/rb-where-you-can-hunt.8eb9f55850.json","lessons/rb-unlawful-acts.fc4e3f6684.json","lessons/rb-legal-methods.a57b904e0a.json","lessons/rb-bag-limits.3652d5407a.json","lessons/rb-after-the-kill.e2226af395.json","lessons/rb-region-3.6a128c2cbc.json","lessons/rb-region-2.f14418b738.json","lessons/rb-region-8.18bcb64fa0.json","lessons/rb-migratory-birds.a08a9a4874.json","lessons/rb-region-1.b81cf732dd.json","lessons/rb-region-4.50eef125ec.json","lessons/rb-region-6.1b30d1a407.json","lessons/rb-region-7a.71a3fadf8a.json","lessons/rb-region-7b.b467accaf1.json","lessons/mc-mule-deer-01.3ecc0492c7.json","lessons/mc-mule-deer-02.7e40b14c0d.json","lessons/mc-mule-deer-03.0e55e8bf3f.json","lessons/mc-mule-deer-04.d0061d383e.json","lessons/mc-mule-deer-05.dcaa13e050.json","lessons/mc-mule-deer-06.e82cccb077.json","lessons/mc-mule-deer-07.e17e922e7b.json","lessons/mc-mule-deer-08.9c0b44a24e.json","lessons/mc-mule-deer-09.455adeec3d.json","lessons/mc-mule-deer-10.1dc592f598.json","lessons/mc-white-tailed-deer-01.6855fd9ea7.json","lessons/mc-white-tailed-deer-02.72c7c97356.json","lessons/mc-white-tailed-deer-03.efbe9a534a.json","lessons/mc-white-tailed-deer-04.54baf12baf.json","lessons/mc-white-tailed-deer-05.e137a982f4.json","lessons/mc-white-tailed-deer-06.cf124a8871.json","lessons/mc-white-tailed-deer-07.eb4a8c794d.json","lessons/mc-white-tailed-deer-08.5e2f598b4d.json","lessons/mc-white-tailed-deer-09.b6f05e0856.json","lessons/mc-white-tailed-deer-10.d33c1bbb86.json","lessons/mc-ducks-01.4f35a7c43a.json","lessons/mc-ducks-02.61fde85ec4.json","lessons/mc-ducks-03.f0257f1e22.json","lessons/mc-ducks-04.d4b1424bea.json","lessons/mc-ducks-05.20d8de89ed.json","lessons/mc-ducks-06.e961706343.json","lessons/mc-ducks-07.3cdf6b4430.json","lessons/mc-ducks-08.f4b989dd81.json","lessons/mc-ducks-09.1325eef98c.json","lessons/mc-ducks-10.bcc8ed5bad.json","lessons/mc-geese-01.8e699ba5dd.json","lessons/mc-geese-02.8b9de8abe7.json","lessons/mc-geese-03.d183655b17.json","lessons/mc-geese-04.2781094048.json","lessons/mc-geese-05.6dbc4fb770.json","lessons/mc-geese-06.94a16edf97.json","lessons/mc-geese-07.f27b880d69.json","lessons/mc-geese-08.ddb48a1dee.json","lessons/mc-geese-09.f7abbd0661.json","lessons/mc-geese-10.3c8e0285d0.json","lessons/mc-grouse-01.5d1ad5727b.json","lessons/mc-grouse-02.bb3c8a5602.json","lessons/mc-grouse-03.9d3b0b6a3d.json","lessons/mc-grouse-04.f014131329.json","lessons/mc-grouse-05.c6a122b99b.json","lessons/mc-grouse-06.2ec8381cc2.json","lessons/mc-grouse-07.5cca61a695.json","lessons/mc-grouse-08.e663106c81.json","lessons/mc-grouse-09.e34d0f59e0.json","lessons/mc-grouse-10.dee8abab41.json","lessons/mc-quail-01.f845bce00f.json","lessons/mc-quail-02.ae7b8587cf.json","lessons/mc-quail-03.3ae8990a66.json","lessons/mc-quail-04.829a610d79.json","lessons/mc-quail-05.f08be79992.json","lessons/mc-quail-06.9356fd8c4d.json","lessons/mc-quail-07.d60382b6ba.json","lessons/mc-quail-08.0fd9d19ec9.json","lessons/mc-quail-09.7f666de9b6.json","lessons/mc-quail-10.f11d02a816.json","lessons/mc-moose-01.b9f2af7107.json","lessons/mc-moose-02.8286f3b00b.json","lessons/mc-moose-03.7bcad12e4f.json","lessons/mc-moose-04.ace749a470.json","lessons/mc-moose-05.0e9a1b542b.json","lessons/mc-moose-06.33e76fc493.json","lessons/mc-moose-07.f177316e53.json","lessons/mc-moose-08.2220e017ee.json","lessons/mc-moose-09.7a49cacc02.json","lessons/mc-moose-10.7180bc4d33.json","lessons/mc-elk-01.453452a175.json","lessons/mc-elk-02.38300c7c0b.json","lessons/mc-elk-03.1e1949a81e.json","lessons/mc-elk-04.71a69161cd.json","lessons/mc-elk-05.d4eb445a6e.json","lessons/mc-elk-06.aa516a3cb8.json","lessons/mc-elk-07.3901dfab0e.json","lessons/mc-elk-08.47ebcc4033.json","lessons/mc-elk-09.164cc06de7.json","lessons/mc-elk-10.f71b2ab7dc.json","lessons/mc-black-bear-01.aaa1e837ee.json","lessons/mc-black-bear-02.4554760dae.json","lessons/mc-black-bear-03.79bc06d6cb.json","lessons/mc-black-bear-04.05e6c246d2.json","lessons/mc-black-bear-05.1c4edba7b2.json","lessons/mc-black-bear-06.908cb1869d.json","lessons/mc-black-bear-07.c497ce2233.json","lessons/mc-black-bear-08.f9886592e9.json","lessons/mc-black-bear-09.7055e1afab.json","lessons/mc-black-bear-10.e6c0c00a1f.json","lessons/mc-skills-01.bdbe47d2b4.json","lessons/mc-skills-02.b48940fca5.json","lessons/mc-skills-03.d03025a731.json","lessons/mc-skills-04.f3ccea25ce.json","lessons/mc-skills-05.3587928065.json","lessons/mc-skills-06.6c0cf7f77b.json","lessons/mc-skills-07.cad0b33a26.json","lessons/mc-skills-08.aef785b60d.json","lessons/mc-skills-09.2354874ec4.json","lessons/mc-skills-10.97b7487117.json","lessons/mc-nav-01.9e680b0cda.json","lessons/mc-nav-02.0d15b460d7.json","lessons/mc-nav-03.c2e37aae6b.json","lessons/mc-nav-04.a55d67ff44.json","lessons/mc-nav-05.ecb4496004.json","lessons/mc-nav-06.43d0d9b848.json","lessons/mc-nav-07.dd2eb75897.json","lessons/mc-nav-08.602b534290.json","lessons/mc-nav-09.9e1efae4c4.json","lessons/mc-nav-10.cef4086677.json","lessons/fw-rules-01.019ee8ccbe.json","lessons/fw-rules-02.e490b2422a.json","lessons/fw-rules-03.8199deedcd.json","lessons/fw-rules-04.0fb1838d8c.json","lessons/fw-rules-05.fe66df2b82.json","lessons/fw-rules-06.01d0b7213e.json","lessons/fw-rules-07.a6c12ff3fd.json","lessons/fw-rules-08.a8e77b453e.json","lessons/fw-rules-09.64da6681d6.json","lessons/fw-rules-10.51629864b8.json","lessons/fw-grandpa-01.121d49c06a.json","lessons/fw-grandpa-02.7c01f3f763.json","lessons/fw-grandpa-03.caee155552.json","lessons/fw-grandpa-04.f042bf45d6.json","lessons/fw-grandpa-05.441d3fd566.json","lessons/fw-grandpa-06.6949af6d41.json","lessons/fw-grandpa-07.ea4859721b.json","lessons/fw-grandpa-08.8503fcefaa.json","lessons/fw-grandpa-09.751bb9716d.json","lessons/fw-grandpa-10.aa5cee27b1.json"], ...["ask.js","plan.js","places.js","addons/safety.js","addons/train.js","data/addons/noshoot/unmapped.json","data/addons/practice/backstop.svg","data/addons/practice/ranges.geojson","data/addons/practice/rules.json","data/addons/safety/safety.json","data/addons/train/facts.json","vendor/maplibre-gl-shared.mjs","vendor/maplibre-gl-worker.mjs","vendor/maplibre-gl.css","vendor/maplibre-gl.mjs","vendor/mlcontour-worker.js","vendor/mlcontour.min.js","vendor/pmtiles.js","map/analyze-score.js","map/analyze-worker.js","map/analyze.css","map/area-lessons.js","map/core.js","map/focus.js","map/hunt-canhunt.js","map/hunt-field.js","map/hunt-glass.js","map/hunt-osm.js","map/hunt-practice.js","map/hunt-sightings.js","map/hunt-ui.js","map/hunt-where.js","map/hunt.css","map/icons.js","map/layer-guide.js","map/layers.js","map/location.js","map/map.css","map/mvt.js","map/offline.js","map/place-card.js","map/plan-offline.js","map/search.js","map/spot-rundown.js","map/spots.js","map/store.js","map/style.js","map/terrain.css","map/tools-analyze.js","map/tools-content.js","map/tools-files.js","map/tools-geo.js","map/tools-hunt.js","map/tools-insights.js","map/tools-main.js","map/tools-terrain.js","map/tools-track.js","map/tools-wind.js","map/tools.css","map/util.js","data/seasons/migratory.json","data/seasons/region1.json","data/seasons/region2.json","data/seasons/region3.json","data/seasons/region4.json","data/seasons/region5.json","data/seasons/region6.json","data/seasons/region7a.json","data/seasons/region7b.json","data/seasons/region8.json","data/harvest/bc-harvest.json","data/plans/checklists.json","data/plans/species-birds.json","data/plans/species.json","data/analyze/species-model.json","data/places/mu.json","data/places/places.json","data/migration.json"], ...["photos/caribou-bull.jpg","photos/wood-bison.jpg","photos/plains-bison-bulls.jpg","photos/cougar.jpg","photos/cougar-kitten.jpg","photos/grey-wolf.jpg","photos/coyote.jpg","photos/canada-lynx.jpg","photos/bobcat.jpg","photos/wolverine.jpg","photos/snowshoe-hare-summer.jpg","photos/snowshoe-hare-winter.jpg","photos/surf-scoter.jpg","photos/white-winged-scoter.jpg","photos/black-scoter.jpg","photos/long-tailed-duck.jpg","photos/harlequin-duck.jpg","photos/common-eider.jpg","photos/bg-moose-young-bull.jpg","photos/bg-moose-young-bull-points.jpg","photos/bg-moose-big-bull.jpg","photos/bg-moose-yearling-bc.jpg","photos/bg-moose-shiras.jpg","photos/bg-moose-bell.jpg","photos/bg-moose-snow.jpg","photos/bg-moose-ghost.jpg","photos/bg-moose-velvet-early.jpg","photos/bg-moose-velvet.jpg","photos/bg-moose-sparring.jpg","photos/bg-elk-spike-bc.jpg","photos/bg-elk-roosevelt-cow.jpg","photos/bg-elk-rocky-bull.jpg","photos/bg-elk-spikes.jpg","photos/bg-elk-calf.jpg","photos/bg-elk-velvet.jpg","photos/bg-elk-bugle.jpg","photos/bg-elk-winter-range.jpg","photos/bg-elk-winter-coat.jpg","photos/bg-elk-antlers-count.jpg","photos/bg-md-velvet-sunpeaks.jpg","photos/bg-md-rut.jpg","photos/bg-md-buck-group.jpg","photos/bg-md-winter-kelowna.jpg","photos/bg-md-winter-coat.jpg","photos/bg-md-sitka-haida.jpg","photos/bg-md-blacktail-vi.jpg","photos/bg-md-one-antler.jpg","photos/bg-wt-buck-rack.jpg","photos/bg-wt-rack-rear.jpg","photos/bg-wt-young-spikes.jpg","photos/bg-wt-young-velvet.jpg","photos/bg-wt-fawn.jpg","photos/bg-wt-doe-fawn.jpg","photos/bg-wt-sparring.jpg","photos/bg-bb-kermode.jpg","photos/bg-bb-glacier-cubs.jpg","photos/bg-bb-yearling.jpg","photos/bg-bb-cubs-tree-bc.jpg","photos/bg-bb-sow-cub-bc.jpg","photos/bg-bb-sitting.jpg","photos/bg-bb-paws-1909.jpg","photos/bg-bb-den.jpg","photos/bg-bb-skull.jpg","photos/bg-bb-yoho.jpg","photos/bg-bb-climbing-claws.jpg","photos/bg-bb-talus.jpg","photos/bg-bb-chest-patch.jpg","photos/bg-bb-devils-club.jpg","photos/bg-bb-brown-quesnel.jpg","photos/bg-wt-winter-bc.jpg","photos/bg-md-rumps-penticton.jpg","photos/bg-md-doe-clearwater.jpg","photos/bg-moose-cow-calf-bowron.jpg","photos/bg-moose-slough-bowron.jpg","photos/bg-moose-newborn-bc.jpg","photos/bg-moose-cow-calf-water.jpg","photos/bg-elk-sparring-jasper.jpg","photos/bg-elk-cow-calf-jasper.jpg","photos/bighorn-ewe.jpg","photos/bighorn-ram-full-curl.jpg","photos/dalls-sheep-ram.jpg","photos/stones-sheep-ram.jpg","photos/stones-sheep-young-ram.jpg","photos/mountain-goat-billy.jpg","photos/mountain-goat-nanny-kid.jpg","photos/mule-deer-buck.jpg","photos/g-md-buck-front.jpg","photos/g-md-buck-sage.jpg","photos/g-md-doe-sage-snow.jpg","photos/g-md-doe-front.jpg","photos/g-md-radium.jpg","photos/g-wt-buck-flag.jpg","photos/g-wt-doe-flag.jpg","photos/g-wt-doe.jpg","photos/g-md-buck-cover.jpg","photos/g-md-doe-fawns-rear.jpg","photos/g-md-doe-fawn-cover.jpg","photos/g-md-distance.jpg","photos/g-md-fawn-bedded.jpg","photos/g-md-fawn.jpg","photos/g-wt-buck-side.jpg","photos/g-wt-buck-front.jpg","photos/g-wt-run.jpg","photos/g-moose-bull-side.jpg","photos/g-moose-bull-front.jpg","photos/g-moose-young-bull.jpg","photos/g-moose-cow.jpg","photos/g-moose-cow-head.jpg","photos/g-moose-cow-calf.jpg","photos/g-moose-calf.jpg","photos/g-moose-calf-winter.jpg","photos/g-elk-bull-side.jpg","photos/g-elk-bull-rear.jpg","photos/g-elk-bulls-distance.jpg","photos/g-elk-cow.jpg","photos/g-elk-cow-rear.jpg","photos/g-elk-herd.jpg","photos/g-bb-side.jpg","photos/g-bb-face.jpg","photos/g-bb-tofino.jpg","photos/g-bb-brown.jpg","photos/g-bb-cinnamon.jpg","photos/g-bb-blonde.jpg","photos/g-bb-sow-cubs.jpg","photos/g-griz-front.jpg","photos/g-griz-side.jpg","photos/g-griz-profile.jpg","photos/g-griz-face.jpg","photos/g-griz-sow.jpg","photos/g-md-run-away.jpg","photos/g-bighorn-pair.jpg","photos/g-md-buck-side.jpg","photos/g-md-buck-rear.jpg","photos/g-md-buck-4pt.jpg","photos/g-md-buck-open.jpg","photos/g-md-bound.jpg","photos/g-md-buck-small.jpg","photos/g-md-forkhorn.jpg","photos/g-bt-buck-velvet.jpg","photos/g-bt-victoria.jpg","photos/g-bt-doe.jpg","photos/g-bt-bedded.jpg","photos/g-bt-buck.jpg","photos/g-md-young-bucks.jpg","photos/g-wigeon-flight.jpg","photos/g-gwt-flight.jpg","photos/g-shoveler-flight.jpg","photos/g-shoveler-flock.jpg","photos/g-wood-duck-flight.jpg","photos/g-scaup-flight.jpg","photos/g-bufflehead-flight.jpg","photos/g-goldeneye-flight.jpg","photos/g-canada-goose-flight.jpg","photos/g-snow-geese-skagit.jpg","photos/g-snow-geese-flock.jpg","photos/g-loon.jpg","photos/g-western-grebe.jpg","photos/g-redhead-flight.jpg","photos/g-trumpeter-swan.jpg","photos/g-tundra-swans-flight.jpg","photos/g-horned-grebe.jpg","photos/g-quail-male-vernon.jpg","photos/g-quail-pair.jpg","photos/g-quail-female.jpg","photos/g-chukar.jpg","photos/g-ruffed-snow.jpg","photos/g-spruce-male.jpg","photos/g-sooty-male.jpg","photos/g-sooty-hen.jpg","photos/g-ptarmigan-summer.jpg","photos/g-ptarmigan-winter.jpg","photos/g-pheasant-rooster.jpg","photos/g-pheasant-hen.jpg","photos/g-turkey-tom.jpg","photos/g-turkey-hen.jpg","photos/g-turkey-flock.jpg","photos/g-sage-grouse.jpg","photos/g-ruffed-grey.jpg","photos/g-ruffed-tree.jpg","photos/g-md-does-bedded.jpg","photos/g-md-buck-bedded.jpg","photos/g-goat-radium.jpg","photos/g-goat-face.jpg","photos/g-wolf-grey.jpg","photos/g-wolf-black.jpg","photos/g-coyote-snow.jpg","photos/g-coyote-howl.jpg","photos/g-lynx.jpg","photos/g-cougar-glacier.jpg","photos/g-bighorn-ram.jpg","photos/wigeon-drake.jpg","photos/wigeon-hen.jpg","photos/green-winged-teal-drake.jpg","photos/green-winged-teal-hen.jpg","photos/blue-winged-teal-drake.jpg","photos/blue-winged-teal-hen.jpg","photos/gadwall-drake.jpg","photos/gadwall-drake-flight.jpg","photos/gadwall-hen.jpg","photos/shoveler-drake.jpg","photos/shoveler-hen.jpg","photos/wood-duck-drake.jpg","photos/wood-duck-hen.jpg","photos/common-goldeneye-drake.jpg","photos/common-goldeneye-hen.jpg","photos/barrows-goldeneye-drake.jpg","photos/barrows-goldeneye-hen.jpg","photos/bufflehead-drake.jpg","photos/bufflehead-hen.jpg","photos/ring-necked-duck-drake.jpg","photos/ring-necked-duck-hen.jpg","photos/lesser-scaup-drake.jpg","photos/lesser-scaup-hen.jpg","photos/canvasback-drake.jpg","photos/canvasback-hen.jpg","photos/redhead-drake.jpg","photos/redhead-hen.jpg","photos/common-merganser-drake.jpg","photos/common-merganser-hen.jpg","photos/hooded-merganser-drake.jpg","photos/hooded-merganser-hen.jpg","photos/divers-taking-off.jpg","photos/mallards-flushing.jpg","photos/mallards-flying.jpg","photos/pintail-hen.jpg","photos/canada-goose.jpg","photos/cackling-goose.jpg","photos/cackling-and-canada-geese.jpg","photos/snow-goose.jpg","photos/ross-goose.jpg","photos/snow-and-ross-geese.jpg","photos/white-fronted-goose.jpg","photos/brant.jpg","photos/bd-mountain-quail.jpg","photos/bd-ruffed-male-display.jpg","photos/bd-ruffed-male-tail.jpg","photos/bd-spruce-pair-bc.jpg","photos/bd-sharptail-dance.jpg","photos/bd-wt-ptarmigan-fall.jpg","photos/bd-wt-ptarmigan-winter.jpg","photos/bd-willow-ptarmigan-spring.jpg","photos/bd-rock-ptarmigan-male-winter.jpg","photos/bd-pheasant-cock-flight.jpg","photos/bd-american-coot.jpg","photos/bd-pied-billed-grebe.jpg","photos/bd-mallard-eclipse.jpg","photos/bd-blue-goose.jpg","photos/bd-gray-partridge.jpg","photos/bd-snow-geese-flight.jpg","photos/bd-whitefront-snow-flight.jpg","photos/bd-snow-ross-flight.jpg","photos/bd-merganser-flight.jpg","photos/bd-hooded-merganser-flight.jpg","photos/bd-coot-with-ducks.jpg","photos/bd-wt-ptarmigan-hen-chicks.jpg","photos/bd-mallard-speculum.jpg","photos/bd-gadwall-hen-flight.jpg","photos/bd-band-tailed-pigeon.jpg","photos/bd-tundra-swan.jpg","photos/bd-canada-goose-goslings.jpg","photos/bd-sharptail-standing.jpg","photos/bd-red-breasted-merganser.jpg","photos/hab-aspen-grove-snow.jpg","photos/hab-bear-berry-patch.jpg","photos/hab-bear-claw-aspen.jpg","photos/hab-bear-scat-berries.jpg","photos/hab-bear-scat-okanagan.jpg","photos/hab-bear-track-front.jpg","photos/hab-bear-track-mud.jpg","photos/hab-beaver-lodge.jpg","photos/hab-bitterbrush-leaf.jpg","photos/hab-bitterbrush-slope.jpg","photos/hab-blackberry.jpg","photos/hab-bracken.jpg","photos/hab-cattail-head.jpg","photos/hab-cattail-marsh.jpg","photos/hab-ceanothus-leaf.jpg","photos/hab-ceanothus-patch.jpg","photos/hab-chokecherry.jpg","photos/hab-deer-pellets-fresh.jpg","photos/hab-deer-pellets-old.jpg","photos/hab-deer-rub.jpg","photos/hab-deer-track-dirt.jpg","photos/hab-deer-track-foothills.jpg","photos/hab-deer-trail-reeds.jpg","photos/hab-deer-trail-snow.jpg","photos/hab-dogwood-flowers.jpg","photos/hab-dogwood-stems.jpg","photos/hab-douglas-fir-stand.jpg","photos/hab-douglas-fir-tree.jpg","photos/hab-duck-tracks.jpg","photos/hab-elk-pellets.jpg","photos/hab-elk-rub.jpg","photos/hab-elk-tracks-shore.jpg","photos/hab-elk-trail-snow.jpg","photos/hab-elk-wallow.jpg","photos/hab-geese-stubble.jpg","photos/hab-grass-fir-edge.jpg","photos/hab-grouse-snow-roost.jpg","photos/hab-grouse-track-line.jpg","photos/hab-grouse-tracks-snow.jpg","photos/hab-grouse-wing-prints.jpg","photos/hab-huckleberry-berry.jpg","photos/hab-huckleberry-bush.jpg","photos/hab-kamloops-pond-farm.jpg","photos/hab-kamloops-sagebrush.jpg","photos/hab-kinnikinnick.jpg","photos/hab-lac-du-bois-grassland.jpg","photos/hab-lac-du-bois-potholes.jpg","photos/hab-moose-tracks-mud.jpg","photos/hab-moose-trail-snow.jpg","photos/hab-moose-willows.jpg","photos/hab-north-thompson-burn.jpg","photos/hab-osoyoos-wetland.jpg","photos/hab-pondweed.jpg","photos/hab-quail-vernon.jpg","photos/hab-sagebrush-bush.jpg","photos/hab-salal.jpg","photos/hab-salmonberry.jpg","photos/hab-saskatoon-berries.jpg","photos/hab-saskatoon-flowers.jpg","photos/hab-skunk-cabbage.jpg","photos/hab-snowberry.jpg","photos/hab-soopolallie.jpg","photos/hab-subalpine-forest.jpg","photos/hab-wells-gray-cutblock.jpg","photos/hab-willow-shrub.jpg","photos/hab-woods-rose-hips.jpg","photos/hab-woods-rose-slope.jpg","photos/ts-cougar-track-wa.jpg","photos/ts-wolf-front-hind.jpg","photos/ts-wolf-track-birch.jpg","photos/ts-moose-pellets.jpg","photos/ts-moose-pellets-snow.jpg","photos/ts-bear-rub-tree.jpg","photos/ts-bear-rub-jasper.jpg","photos/ts-avalanche-chute-cascades.jpg","photos/ts-saddle-banff.jpg","photos/ts-burn-year1-glacier.jpg","photos/ts-burn-year10-yellowstone.jpg","photos/ts-burn-fireweed-lolo.jpg","photos/ts-burn-alpine-lakes.jpg","photos/ts-wolf-track-hand.jpg","photos/ts-moose-track-katmai.jpg","photos/ts-elk-tracks-cmr.jpg","photos/ts-bear-claw-hartnup.jpg","photos/ts-bear-scratches-ncascades.jpg","photos/ts-browse-highlined-pine.jpg","photos/ts-riparian-willow-creek.jpg","photos/ts-clearcut-holmes.jpg","photos/ts-browse-subalpine-fir.jpg","photos/ts-kamloops-dewdrop-2.jpg","photos/ts-beaver-chewed-nps.jpg","photos/ts-embelton-sw-kamloops.jpg","photos/ts-skoatl-point.jpg","photos/ts-wolf-scat-katmai.jpg","photos/ts-wolf-scat-hollinger.jpg","photos/ts-grizzly-claw-marks.jpg","photos/ts-lac-du-bois-east.jpg","photos/ts-lac-du-bois-foubister-2.jpg","photos/rl-knoll-newnham.jpg","photos/rl-edge-grass-aspen.jpg","photos/rl-bluff-saddle-mtn.jpg","photos/rl-beaver-pond-manning.jpg","photos/rl-snowy-forest-road.jpg","photos/rl-hedgerow-field-edge.jpg","photos/dusky-grouse-hen.jpg","photos/dusky-grouse-male.jpg","photos/ruffed-grouse-hen.jpg","photos/sharp-tailed-grouse.jpg","photos/sharp-tailed-grouse-snow.jpg","photos/spruce-grouse-hen.jpg","photos/mallard-drake.jpg","photos/mallard-drake-flight.jpg","photos/mallard-hen.jpg","photos/pintail-drake.jpg","photos/pintail-drake-flight.jpg"]]; // content: lesson screens and search text (lessons/*.json). Not the single file backup (hunt-mentor-offline.html, about 100 MB): precaching it doubled every install and update
const fresh = (u) => new Request(u, { cache: 'reload' }); // skip the browser HTTP cache so one version never mixes with another

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(CORE.map(fresh));
    let i = 0;
    // lesson files carry a content hash in their name, and photos keep their name for life: copy them from the
    // last version's cache instead of downloading them again, so an update only fetches what changed
    const reuse = (u) => /^lessons\/.+\.[0-9a-f]{10}\.json$/.test(u) || /^photos\//.test(u);
    const worker = async () => { while (i < EXTRA.length) { const u = EXTRA[i++]; try { const hit = reuse(u) && await caches.match(u, MATCH); if (hit) await c.put(u, hit); else await c.add(fresh(u)); } catch (err) { /* skipped, loads on demand */ } } };
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
    || url.hostname === 'tile.opentopomap.org'
    || (url.hostname === 'upload.wikimedia.org' && url.pathname.includes('/thumb/'))) { e.respondWith(tileFirst(req)); return; } // free photo thumbnails on camp and spot cards: kept once viewed
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
