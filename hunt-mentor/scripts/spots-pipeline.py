#!/usr/bin/env python3
"""Hunt Mentor: Hunt Map layers and Spot Finder data pipeline.

Spec: SPOTS.md (data) and MAP.md (manifest contract). How to run: scripts/SPOTS-PIPELINE.md.

Steps (each cached, rerunnable):
  fetch      download BC Data Catalogue WFS layers (raw pages cached, never in the repo)
  dem        download AWS terrarium z12 tiles per area and build an elevation grid
  layers     clean, simplify and write data/layers/bc/*.geojson and data/layers/<area>/*
  spots      score candidate spots, write data/spots/<area>/*
  migration  winter, transition and summer bands per species (general pattern)
  manifest   write data/layers/manifest.json

Usage:
  python3 scripts/spots-pipeline.py --cache /path/to/cache [--areas A,B,C] [--steps all]

Python packages: numpy shapely pyproj scipy pillow pmtiles mapbox-vector-tile
"""
import argparse
import datetime as dt
import gzip
import hashlib
import json
import math
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TODAY = dt.date.today().isoformat()
YEAR = dt.date.today().year

# --------------------------------------------------------------------------------------
# Areas (SPOTS.md)
# --------------------------------------------------------------------------------------
AREAS = {
    'A': {'name': 'Kamloops, North Thompson, Bonaparte, Shuswap west', 'box': (-121.6, 50.2, -119.4, 51.9),
          'base': {'name': 'Heffley Creek', 'lat': 50.8581, 'lon': -120.2687}},
    'B': {'name': 'Mission, Fraser Valley, Harrison, Hope, Fraser Canyon', 'box': (-122.9, 49.0, -121.3, 49.95),
          'base': {'name': 'Mission', 'lat': 49.1327, 'lon': -122.3045}},
    'C': {'name': 'South Okanagan and Similkameen (quail trip)', 'box': (-120.1, 49.0, -119.2, 49.7),
          'base': {'name': 'Oliver', 'lat': 49.1830, 'lon': -119.5500, 'note': 'Assumption: Oliver town centre'}},
    # D and E: 'excl' boxes are cut out so areas never overlap (here: area A's box). 'box' stays the bounding box.
    'D': {'name': 'Merritt, Nicola and North Okanagan', 'box': (-121.3, 49.7, -118.6, 50.5),
          'excl': [(-121.6, 50.2, -119.4, 51.9)],
          'base': {'name': 'Merritt', 'lat': 50.1113, 'lon': -120.7862, 'note': 'Nominatim 2026-10-04 (town 50.1125, -120.7884)'}},
    'E': {'name': 'Cariboo south: 100 Mile House to Williams Lake', 'box': (-122.6, 51.2, -120.4, 52.3),
          'excl': [(-121.6, 50.2, -119.4, 51.9)],
          'base': {'name': '100 Mile House', 'lat': 51.6428, 'lon': -121.2957,
                   'note': 'Nominatim 2026-10-04. The town sits inside area A; area E spots lie west of -121.6 and north of 51.9.'}},
    # F: Region 4 (Kootenay), CWD Management Zone rules, no overlap with A to E (all west of -118.6)
    'F': {'name': 'East Kootenay: Cranbrook, Fernie, Invermere', 'box': (-116.6, 49.0, -114.6, 50.6),
          'base': {'name': 'Cranbrook', 'lat': 49.5107, 'lon': -115.7673, 'note': 'Nominatim 2026-10-04 (municipality centroid)'}},
    # G: Regions 3, 4 and 8. Its west edge is A's east edge and its south edge is D's north edge; A and D are listed as cut outs anyway.
    'G': {'name': 'Shuswap and Revelstoke', 'box': (-119.4, 50.5, -117.6, 51.6),
          'excl': [(-121.6, 50.2, -119.4, 51.9), (-119.4, 49.7, -118.6, 50.5)],
          'base': {'name': 'Salmon Arm', 'lat': 50.7005, 'lon': -119.2791, 'note': 'Nominatim 2026-10-04 (municipality centroid)'}},
}


def area_excl(area):
    return AREAS.get(area, {}).get('excl') or []


def in_excl(area, lon, lat):
    """True where lon/lat (arrays or scalars) fall inside a cut out box of the area."""
    lon, lat = np.asarray(lon), np.asarray(lat)
    m = np.zeros(np.broadcast(lon, lat).shape, bool)
    for b in area_excl(area):
        m |= (lon > b[0]) & (lon < b[2]) & (lat > b[1]) & (lat < b[3])
    return m


def excl_poly_albers(area):
    ex = area_excl(area)
    return shapely.union_all([box_albers(b) for b in ex]) if ex else None
BC_BOX = (-139.1, 48.2, -114.0, 60.0)

WFS = 'https://openmaps.gov.bc.ca/geo/pub/ows'
UA = 'HuntMentorSpotPipeline/1.0 (personal study app, static PWA; build time only)'
TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
DEM_Z = 12

# --------------------------------------------------------------------------------------
# Layers. scope BC = whole province once; area = per area box (tiled when big).
# geom = geometry column (needed for CQL BBOX and propertyName).
# --------------------------------------------------------------------------------------
LAYERS = {
    # ---- BC wide, small
    'mu': dict(type='WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW', geom='GEOMETRY', scope='BC',
               props=['WILDLIFE_MGMT_UNIT_ID', 'REGION_RESPONSIBLE_ID', 'REGION_RESPONSIBLE_NAME', 'GAME_MANAGEMENT_ZONE_NAME']),
    'parks': dict(type='WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW', geom='SHAPE', scope='BC',
                  props=['PROTECTED_LANDS_NAME', 'PROTECTED_LANDS_DESIGNATION', 'PROTECTED_LANDS_CODE', 'PARK_CLASS']),
    'reserves': dict(type='WHSE_ADMIN_BOUNDARIES.CLAB_INDIAN_RESERVES', geom='GEOMETRY', scope='BC',
                     props=['ENGLISH_NAME', 'CLAB_ID']),
    'municipalities': dict(type='WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP', geom='SHAPE', scope='BC',
                           props=['ADMIN_AREA_NAME', 'ADMIN_AREA_ABBREVIATION', 'WHEN_UPDATED']),
    'mvpr_areas': dict(type='WHSE_WILDLIFE_MANAGEMENT.WAA_MVPR_AREAS_SP', geom='SHAPE', scope='BC',
                       props=['REGULATION_GEOGRAPHIC_NAME', 'PROHIBITION_TYPE', 'EFFECTIVE_DESCRIPTION', 'EXEMPTION',
                              'REGION', 'MU_NUMBER', 'MAP_NUMBER', 'SCHEDULE', 'SECTION', 'REGULATION', 'EFFECTIVE_DATE', 'EXPIRY_DATE']),
    'mvpr_routes': dict(type='WHSE_WILDLIFE_MANAGEMENT.WAA_MVPR_ROUTES_SP', geom='SHAPE', scope='BC',
                        props=['REGULATION_GEOGRAPHIC_NAME', 'PROHIBITION_TYPE', 'ROAD_NAME', 'ACCESS_STATUS', 'ACCESS_RANGE',
                               'ACCESS_DESCRIPTION', 'ACCESS_LIMITATION', 'REGION', 'MU_NUMBER', 'MAP_NUMBER', 'EFFECTIVE_DATE', 'EXPIRY_DATE']),
    # national parks (Mount Revelstoke, Glacier and others): not in TA_PARK_ECORES_PA_SVW; merged into 'parks' (no hunting)
    'natparks': dict(type='WHSE_ADMIN_BOUNDARIES.CLAB_NATIONAL_PARKS', geom='GEOMETRY', scope='BC',
                     props=['ENGLISH_NAME', 'NATIONAL_PARK_ID']),
    'wma': dict(type='WHSE_TANTALIS.TA_WILDLIFE_MGMT_AREAS_SVW', geom='SHAPE', scope='BC',
                props=['WILDLIFE_MANAGEMENT_AREA_NAME']),
    'leh': dict(type='WHSE_WILDLIFE_MANAGEMENT.WAA_LTD_HNT_ZONE_CURR_YEAR_SVW', geom='GEOMETRY', scope='BC',
                props=['LIMITED_ENTRY_HUNTING_ZONE', 'MANAGEMENT_UNITS', 'LTD_ENTRY_HUNTING_ZONE_TYPE', 'LTD_ENTRY_HUNTING_ZONE_LABEL',
                       'EFFECTIVE_DATE', 'EXPIRY_DATE']),
    # ---- per area
    'uwr': dict(type='WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP', geom='GEOMETRY', scope='area',
                props=['UWR_NUMBER', 'UWR_UNIT_NUMBER', 'SPECIES_1', 'SPECIES_2', 'APPROVAL_DATE', 'HECTARES', 'TIMBER_HARVEST_CODE']),
    'private': dict(type='WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW', geom='SHAPE', scope='area', tile=0.2, margin=0,
                    page=2000, cql="OWNER_TYPE='Private' AND NOT (PARCEL_CLASS IN ('Building Strata','Air Space'))",
                    props=['PARCEL_CLASS', 'MUNICIPALITY', 'WHEN_UPDATED']),
    'openings': dict(type='WHSE_FOREST_VEGETATION.RSLT_OPENING_SVW', geom='GEOMETRY', scope='area', tile=0.5,
                     props=['OPENING_ID', 'OPENING_CATEGORY_CODE', 'OPENING_STATUS_CODE', 'APPROVE_DATE', 'DISTURBANCE_START_DATE',
                            'DISTURBANCE_END_DATE', 'DENUDATION_1_DISTURBANCE_CODE', 'DENUDATION_1_SILV_SYSTEM_CODE',
                            'DENUDATION_1_COMPLETION_DATE', 'OPENING_GROSS_AREA']),
    'burns': dict(type='WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP', geom='SHAPE', scope='area',
                  props=['FIRE_NUMBER', 'FIRE_YEAR', 'FIRE_CAUSE', 'FIRE_SIZE_HECTARES']),
    'bec': dict(type='WHSE_FOREST_VEGETATION.BEC_BIOGEOCLIMATIC_POLY', geom='GEOMETRY', scope='area',
                props=['ZONE', 'SUBZONE', 'VARIANT', 'MAP_LABEL', 'ZONE_NAME']),
    'lakes': dict(type='WHSE_BASEMAPPING.FWA_LAKES_POLY', geom='GEOMETRY', scope='area', tile=0.5, margin=0.04,
                  props=['WATERBODY_POLY_ID', 'AREA_HA', 'GNIS_NAME_1', 'WATERBODY_TYPE']),
    'wetlands': dict(type='WHSE_BASEMAPPING.FWA_WETLANDS_POLY', geom='GEOMETRY', scope='area', tile=0.5, margin=0.04,
                     props=['WATERBODY_POLY_ID', 'AREA_HA', 'GNIS_NAME_1', 'WATERBODY_TYPE']),
    'rivers': dict(type='WHSE_BASEMAPPING.FWA_RIVERS_POLY', geom='GEOMETRY', scope='area', margin=0.04,
                   props=['WATERBODY_POLY_ID', 'AREA_HA', 'GNIS_NAME_1']),
    'streams': dict(type='WHSE_BASEMAPPING.FWA_STREAM_NETWORKS_SP', geom='GEOMETRY', scope='area', tile=0.25, margin=0.04,
                    cql='GNIS_NAME IS NOT NULL', props=['GNIS_NAME', 'STREAM_ORDER', 'BLUE_LINE_KEY', 'EDGE_TYPE']),
    'ften_roads': dict(type='WHSE_FOREST_TENURE.FTEN_ROAD_SECTION_LINES_SVW', geom='GEOMETRY', scope='area', tile=0.5, margin=0.04,
                       props=['FOREST_FILE_ID', 'ROAD_SECTION_ID', 'ROAD_SECTION_NAME', 'FILE_TYPE_DESCRIPTION', 'FILE_STATUS_CODE',
                              'LIFE_CYCLE_STATUS_CODE', 'RETIREMENT_DATE', 'AWARD_DATE', 'MAP_LABEL']),
    'dra_roads': dict(type='WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP', geom='GEOMETRY', scope='area', tile=0.25, margin=0.04,
                      props=['DIGITAL_ROAD_ATLAS_LINE_ID', 'ROAD_NAME_FULL', 'ROAD_CLASS', 'ROAD_SURFACE', 'NUMBER_OF_LANES',
                             'HIGHWAY_ROUTE_NUMBER', 'FEATURE_TYPE', 'DATA_CAPTURE_DATE']),
    'rec_sites': dict(type='WHSE_FOREST_TENURE.FTEN_REC_SITE_POINTS_SVW', geom='GEOMETRY', scope='area', margin=0.04,
                      props=['FOREST_FILE_ID', 'PROJECT_NAME', 'SITE_LOCATION', 'NUM_CAMP_SITES', 'DRIVING_DIRECTIONS',
                             'CLOSURE_DESCRIPTION', 'ACTIVITY_DESC1', 'ACTIVITY_DESC2', 'ACTIVITY_DESC3', 'MORE_ACTIVITY_IND',
                             'ACCESS_DESC1', 'ACCESS_DESC2', 'ACCESS_DESC3', 'MAINTAIN_STD_DESC']),
    'rec_trailheads': dict(type='WHSE_FOREST_TENURE.FTEN_REC_TRAIL_HEADS_SVW', geom='GEOMETRY', scope='area', margin=0.04,
                           props=['FOREST_FILE_ID', 'PROJECT_NAME', 'SITE_LOCATION', 'DRIVING_DIRECTIONS', 'CLOSURE_DESCRIPTION',
                                  'NUM_CAMP_SITES', 'LIFE_CYCLE_STATUS_CODE', 'FILE_STATUS_CODE', 'RETIREMENT_DATE']
                           + [f'ACTIVITY_DESC{i}' for i in range(1, 11)]),
    'rec_trails': dict(type='WHSE_FOREST_TENURE.FTEN_REC_TRAILS_SVW', geom='GEOMETRY', scope='area', margin=0.04,
                       props=['FOREST_FILE_ID', 'PROJECT_NAME', 'SITE_LOCATION', 'CLOSURE_DESCRIPTION', 'LIFE_CYCLE_STATUS_CODE',
                              'FILE_STATUS_CODE', 'RETIREMENT_DATE'] + [f'ACTIVITY_DESC{i}' for i in range(1, 11)]),
    'rec_polys': dict(type='WHSE_FOREST_TENURE.FTEN_RECREATION_POLY_SVW', geom='GEOMETRY', scope='area', margin=0.04,
                      props=['FOREST_FILE_ID', 'PROJECT_NAME', 'PROJECT_TYPE', 'DEFINED_CAMPSITES', 'LIFE_CYCLE_STATUS_CODE',
                             'FILE_STATUS_CODE', 'RETIREMENT_DATE']),
    'names': dict(type='WHSE_BASEMAPPING.GNS_GEOGRAPHICAL_NAMES_SP', geom='GEOMETRY', scope='area', margin=0.04,
                  props=['GEOGRAPHICAL_NAME', 'FEATURE_TYPE', 'FEATURE_CATEGORY']),
}

PAGE = 5000

# --------------------------------------------------------------------------------------
# Scoring weights (opinion, shown as "my pick"; tune here). Components follow SPOTS.md.
# --------------------------------------------------------------------------------------
W = {
    'deer': {'uwr': 3, 'cut': 2, 'burn': 2, 'bec_low': 2, 'bec_ms': 1, 'aspect': 1, 'fields': 1},
    'moose': {'wetland': 2, 'cut_or_burn': 2, 'uwr': 3},
    'duck': {'size_road': 3, 'complex': 2, 'backwater': 2, 'low': 1},
    'grouse': {'zone': 1, 'cut_edge': 1, 'riparian': 1},
    'quail': {'zone': 2, 'farm': 2, 'creek': 1, 'draw': 1},
    'elk': {'uwr': 3, 'burn': 2, 'cut': 1, 'bec_low': 2, 'bec_ms': 1, 'aspect': 1, 'water': 1},
    'turkey': {'zone': 2, 'farm': 2, 'creek': 1},
    'camp': {'flat': 2, 'water': 2, 'named_water': 1, 'quiet': 1, 'spots_near': 1},
}
SCORE_MAX = {'deer': 11, 'moose': 7, 'duck': 8, 'grouse': 3, 'quail': 6, 'camp': 7, 'elk': 11, 'turkey': 5}
MIN_SCORE = {'deer': 7, 'moose': 4, 'duck': 4, 'grouse': 2, 'quail': 4, 'camp': 5, 'elk': 7, 'turkey': 4}
SPACING_M = 800            # no two spots of the same species and category closer than this
SELECT_RADIUS = {'drive': 1500, 'atv': 1500, 'walk': 2000, 'backcountry': 3000, 'camp': 3000}
CAPS = {'deer': 220, 'moose': 100, 'duck': 180, 'grouse': 120, 'quail': 300, 'camp': 60, 'elk': 120, 'turkey': 80}   # per area and category: best first
AREA_CAPS = {'F': {'grouse': 80, 'moose': 60}, 'G': {'grouse': 80, 'moose': 80}}   # area F size budget (about 35 MB): fewer grouse routes and moose spots


def cap_for(area, sp):
    return AREA_CAPS.get(area, {}).get(sp, CAPS[sp])


TILE_M = 15000             # caps are spread round robin over 15 km tiles (balanced_cap)
CUT_AGE = (5, 20)          # cutblock age that feeds deer, moose, bear, grouse
BURN_YEARS = (2015, 2023)  # recent burns for scoring
BURN_MIN_HA = 10           # smaller spot fires grow too little feed to score (my pick)
DEER_ZONES_LOW = {'BG', 'PP', 'IDF'}
DEER_ZONES_MID = {'MS'}
GROUSE_ZONES = {'IDF', 'MS', 'ESSF', 'ICH'}
GROUSE_ZONES_EXTRA = {'B': {'CWH'}, 'E': {'SBPS', 'SBS'}}   # Assumption (my pick): CWH forest in B; Cariboo pine and spruce in E
QUAIL_AREAS = {'C': None, 'D': {'8'}, 'G': {'8'}}   # quail spots: area -> regions allowed (None = all). Region 3 has no quail season.
QUAIL_ZONES = {'BG', 'PP'}
# Elk and wild turkey spots (Region 4 has general seasons for both; my pick for the weights). Area -> on.
ELK_AREAS = {'F'}
# Region 4 (Kootenay) legal layers: synopsis map areas, CWD zone, feeding ban, wolf note (content/phase7/13-region-4-kootenay.md)
R4_AREAS = {'F'}
R4_WOLF_TRENCH = ['4-2', '4-3', '4-20', '4-21', '4-22', '4-24', '4-25', '4-26', '4-34', '4-35', '4-36', '4-37', '4-40']
R4_WOLF_LOW = ['4-4', '4-5', '4-6', '4-7']
R4_DEER_HUNT_MUS = ['4-3', '4-4', '4-5', '4-20']
R4_TRENCH_AREAS = {'F'}
R3_SHUSWAP_AREAS = {'A', 'G'}   # Region 3 Maps C8 Blind Bay, C9 Sicamous, C10 Salmon Arm (content/phase7/08-region-3-thompson.md)   # the Trench wolf note applies only in F: the 4-37 corner of area G is Selkirk valleys, not the Trench (my reading)   # Cranbrook Deer Hunt, Map D27 portions only
TURKEY_AREAS = {'F'}
ELK_ZONES_LOW = {'BG', 'PP', 'IDF'}
TURKEY_ZONES = {'PP', 'IDF'}
TURKEY_MAX_ELEV = 1100   # Merriam's turkeys in the Kootenay winter low, near farms (my pick)
QUAIL_MAX_ELEV = 700
DUCK_MAX_ELEV = 900
R3_ATV_LIMIT_M = 1700

BEC_NAMES = {
    'BG': 'Bunchgrass', 'PP': 'Ponderosa Pine', 'IDF': 'Interior Douglas fir', 'ICH': 'Interior Cedar Hemlock',
    'MS': 'Montane Spruce', 'ESSF': 'Engelmann Spruce and Subalpine Fir', 'SBS': 'Sub Boreal Spruce',
    'SBPS': 'Sub Boreal Pine and Spruce', 'IMA': 'Interior Mountain heather Alpine', 'CWH': 'Coastal Western Hemlock',
    'MH': 'Mountain Hemlock', 'CDF': 'Coastal Douglas fir', 'CMA': 'Coastal Mountain heather Alpine',
    'BWBS': 'Boreal White and Black Spruce', 'SWB': 'Spruce, Willow and Birch', 'BAFA': 'Boreal Altai Fescue Alpine',
}
# Winter range months (default, conservative; replaced by data/migration.json when present)
SPECIES_WINTER_MONTHS = {'mule_deer': [11, 12, 1, 2, 3, 4], 'wt_deer': [11, 12, 1, 2, 3, 4], 'moose': [11, 12, 1, 2, 3, 4],
                         'elk': [11, 12, 1, 2, 3, 4], 'sheep': [11, 12, 1, 2, 3, 4], 'goat': [11, 12, 1, 2, 3, 4],
                         'caribou': [11, 12, 1, 2, 3, 4], 'bt_deer': [11, 12, 1, 2, 3, 4], 'thinhorn': [11, 12, 1, 2, 3, 4]}


MIG_KEY = {'mule_deer': 'muledeer', 'wt_deer': 'whitetail', 'moose': 'moose', 'elk': 'elk', 'sheep': 'bighorn', 'goat': 'goat',
           'bt_deer': 'blacktail'}
PM_FORCE = {'cutblocks', 'forest_roads'}   # always PMTiles (too big as GeoJSON in area A)


def months_key(months):
    return (',' + ','.join(str(m) for m in months) + ',') if months else ''


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# --------------------------------------------------------------------------------------
# HTTP with cache, polite, one request at a time
# --------------------------------------------------------------------------------------
def _ssl_ctx():
    for c in (os.environ.get('SSL_CERT_FILE'), os.environ.get('REQUESTS_CA_BUNDLE'), '/root/.ccr/ca-bundle.crt'):
        if c and os.path.exists(c):
            return ssl.create_default_context(cafile=c)
    return ssl.create_default_context()


SSL_CTX = _ssl_ctx()
_last_request = [0.0]


def http_get(url, tries=6, timeout=300, min_gap=0.25):
    for i in range(tries):
        wait = min_gap - (time.time() - _last_request[0])
        if wait > 0:
            time.sleep(wait)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'})
            with urllib.request.urlopen(req, context=SSL_CTX, timeout=timeout) as r:
                b = r.read()
                if r.headers.get('Content-Encoding') == 'gzip':
                    b = gzip.decompress(b)
                _last_request[0] = time.time()
                return b
        except urllib.error.HTTPError as e:
            _last_request[0] = time.time()
            if e.code == 404:
                return None
            log('  http', e.code, 'retry', i + 1, url[:120])
        except Exception as e:  # network, timeout
            _last_request[0] = time.time()
            log('  error', type(e).__name__, str(e)[:120], 'retry', i + 1)
        time.sleep(min(120, 3 * 2 ** i))
    raise RuntimeError('failed after retries: ' + url[:200])


def wfs_params(layer, box=None, start=0, count=PAGE):
    L = LAYERS[layer]
    p = {'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature', 'outputFormat': 'application/json',
         'srsName': 'EPSG:4326', 'typeName': 'pub:' + L['type'], 'maxFeatures': str(count), 'startIndex': str(start),
         'sortBy': 'OBJECTID', 'propertyName': ','.join(L['props'] + ['OBJECTID', L['geom']])}
    cql = L.get('cql')
    if box and cql:
        p['CQL_FILTER'] = f"BBOX({L['geom']},{box[0]},{box[1]},{box[2]},{box[3]},'EPSG:4326') AND {cql}"
    elif cql:
        p['CQL_FILTER'] = cql
    elif box:
        p['bbox'] = f'{box[0]},{box[1]},{box[2]},{box[3]},EPSG:4326'
    return p


def tiles_for(box, size):
    if not size:
        return [box]
    out = []
    x = box[0]
    while x < box[2] - 1e-9:
        y = box[1]
        while y < box[3] - 1e-9:
            out.append((round(x, 4), round(y, 4), round(min(x + size, box[2]), 4), round(min(y + size, box[3]), 4)))
            y += size
        x += size
    return out


def fetch_layer(cache, layer, scope_key, box):
    """Download all features of a layer in box (None = whole layer), paged and tiled. Returns list of features (deduped)."""
    L = LAYERS[layer]
    d = Path(cache) / 'raw' / layer / scope_key
    d.mkdir(parents=True, exist_ok=True)
    done = d / 'done.json'
    if done.exists():
        return
    t0 = time.time()
    n = 0
    tiles = tiles_for(box, L.get('tile')) if box else [None]
    ex = area_excl(scope_key)
    pg = L.get('page', PAGE)   # smaller pages for heavy layers (dense parcels time out at 5000)
    for ti, tb in enumerate(tiles):
        if tb and any(tb[0] >= b[0] and tb[2] <= b[2] and tb[1] >= b[1] and tb[3] <= b[3] for b in ex):
            continue   # tile lies inside a cut out box (another area covers it)
        start = 0
        while True:
            key = hashlib.sha1(json.dumps([tb, start, L.get('cql'), L['props']]).encode()).hexdigest()[:12]
            fn = d / f't{ti:03d}_{start:07d}_{key}.json.gz'
            if fn.exists():
                with gzip.open(fn, 'rt') as f:
                    m = json.load(f).get('_n', 0)
            else:
                p = wfs_params(layer, tb, start, count=pg)
                url = WFS + '?' + urllib.parse.urlencode(p, safe=":,'()")
                js = None
                for attempt in range(5):   # the server sometimes answers with a Java exception under load: wait and retry
                    b = http_get(url)
                    try:
                        js = json.loads(b)
                        break
                    except Exception:
                        log(f'  bad response {attempt + 1} for {layer}: {b[:600]!r}'[:900])
                        time.sleep(30 * (attempt + 1))
                if js is None:
                    raise RuntimeError(f'{layer}: bad response {b[:300]!r}')
                m = len(js.get('features', []))
                js['_n'] = m
                with gzip.open(fn, 'wt') as f:
                    json.dump(js, f)
            n += m
            if m < pg:
                break
            start += pg
    json.dump({'features': n, 'seconds': round(time.time() - t0, 1), 'date': TODAY, 'box': box}, open(done, 'w'))
    log(f'  fetched {layer} {scope_key}: {n} features (with tile overlaps) in {time.time() - t0:.0f}s')


def load_raw(cache, layer, scope_key):
    """Read cached pages, dedupe by OBJECTID. Returns list of GeoJSON features."""
    d = Path(cache) / 'raw' / layer / scope_key
    seen = set()
    out = []
    for fn in sorted(d.glob('t*.json.gz')):
        with gzip.open(fn, 'rt') as f:
            js = json.load(f)
        for ft in js.get('features', []):
            oid = ft.get('properties', {}).get('OBJECTID')
            if oid is None:
                oid = ft.get('id')
            if oid in seen:
                continue
            seen.add(oid)
            out.append(ft)
    return out


def fetch_meta(cache, layer, scope_key):
    p = Path(cache) / 'raw' / layer / scope_key / 'done.json'
    return json.load(open(p)) if p.exists() else {}


def area_fetch_box(area, layer):
    b = AREAS[area]['box']
    m = LAYERS[layer].get('margin', 0.0)
    return (round(b[0] - m, 4), round(b[1] - m, 4), round(b[2] + m, 4), round(b[3] + m, 4))


def step_fetch(cache, areas):
    log('fetch: BC wide layers')
    for k, L in LAYERS.items():
        if L['scope'] == 'BC':
            fetch_layer(cache, k, 'BC', None)
    for a in areas:
        log(f'fetch: area {a}')
        for k, L in LAYERS.items():
            if L['scope'] == 'area':
                fetch_layer(cache, k, a, area_fetch_box(a, k))
        fetch_osm(cache, a)


# --------------------------------------------------------------------------------------
# OpenStreetMap outlines (Nominatim) for synopsis map areas that are not in the BC Data Catalogue
# (Region 4 Maps D9, D13, D16, D19, D20, D22, D11). One request at a time, 1.5 s apart, cached in cache/osm/.
# --------------------------------------------------------------------------------------
NOMINATIM = 'https://nominatim.openstreetmap.org/search'
OSM_FEATURES = {
    'F': [('skookumchuck_mill', 'Skookumchuck mill', 'landuse'), ('elkview', 'Elkview Operations', 'landuse'),
          ('greenhills', 'Greenhills Operations', 'landuse'), ('line_creek', 'Line Creek Operations', 'landuse'),
          ('fording_river', 'Fording River Operations', 'landuse'), ('coal_mountain', 'Coal Mountain Operations', 'landuse'),
          ('fairmont', 'Fairmont Hot Springs, British Columbia', 'place'), ('windermere', 'Windermere, British Columbia', 'place'),
          ('radium', 'Radium Hot Springs', 'boundary'), ('baynes_village', 'Baynes Lake, British Columbia', 'place'),
          ('alexander_creek', 'Alexander Creek', 'waterway'), ('wasa', 'Wasa, British Columbia', 'place')],
}


def fetch_osm(cache, area):
    feats = OSM_FEATURES.get(area)
    if not feats:
        return
    b = AREAS[area]['box']
    d = Path(cache) / 'osm'
    d.mkdir(parents=True, exist_ok=True)
    for key, q, cls in feats:
        f = d / f'{key}.json'
        if f.exists():
            continue
        url = NOMINATIM + '?' + urllib.parse.urlencode({'format': 'json', 'limit': 3, 'polygon_geojson': 1, 'countrycodes': 'ca',
                                                         'viewbox': f'{b[0] - 0.4},{b[3] + 0.4},{b[2] + 0.4},{b[1] - 0.4}',
                                                         'bounded': 1, 'q': q})
        raw = http_get(url, min_gap=1.5)
        res = [r for r in json.loads(raw or b'[]') if r.get('class') == cls]
        json.dump({'query': q, 'fetched': TODAY, 'results': res[:1]}, open(f, 'w'))
        log(f'  osm {key}: {len(res)} result(s)')


def load_osm(cache, key):
    """Albers geometry of a cached Nominatim result, or None."""
    f = Path(cache) / 'osm' / f'{key}.json'
    if not f.exists():
        return None
    r = json.load(open(f)).get('results') or []
    if not r:
        return None
    g = shapely.from_geojson(json.dumps(r[0]['geojson']))
    return to_albers(np.array([g], dtype=object))[0]


# --------------------------------------------------------------------------------------
# DEM: terrarium z12 tiles, cached
# --------------------------------------------------------------------------------------
def lonlat_to_tilef(lon, lat, z):
    n = 2 ** z
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n
    return x, y


def dem_tile_range(box, z=DEM_Z, pad=0.02):
    x0, y0 = lonlat_to_tilef(box[0] - pad, box[3] + pad, z)
    x1, y1 = lonlat_to_tilef(box[2] + pad, box[1] - pad, z)
    return int(x0), int(y0), int(x1), int(y1)


def step_dem_fetch(cache, areas):
    for a in areas:
        x0, y0, x1, y1 = dem_tile_range(AREAS[a]['box'])
        t0 = time.time()
        n = 0
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                fn = Path(cache) / 'dem' / str(DEM_Z) / str(x) / f'{y}.png'
                if fn.exists():
                    continue
                fn.parent.mkdir(parents=True, exist_ok=True)
                b = http_get(TERRARIUM.format(z=DEM_Z, x=x, y=y), min_gap=0.05)
                if b:
                    fn.write_bytes(b)
                    n += 1
        log(f'dem fetch {a}: {(x1 - x0 + 1) * (y1 - y0 + 1)} tiles ({n} new) in {time.time() - t0:.0f}s')


# ======================================================================================
# Geometry helpers (analysis in BC Albers EPSG:3005 metres, output EPSG:4326, 5 decimals)
# ======================================================================================
import pickle  # noqa: E402

import numpy as np  # noqa: E402
import shapely  # noqa: E402
import shapely.ops  # noqa: E402
from shapely import STRtree  # noqa: E402
from pyproj import Geod, Transformer  # noqa: E402

T_FWD = Transformer.from_crs(4326, 3005, always_xy=True)
T_INV = Transformer.from_crs(3005, 4326, always_xy=True)
GEOD = Geod(ellps='WGS84')


def _tf(tr):
    def f(c):
        x, y = tr.transform(c[:, 0], c[:, 1])
        return np.column_stack([x, y])
    return f


def to_albers(g):
    return shapely.transform(shapely.force_2d(g), _tf(T_FWD))


def to_wgs(g):
    return shapely.transform(g, _tf(T_INV))


def xy_to_lonlat(x, y):
    lon, lat = T_INV.transform(np.asarray(x, float), np.asarray(y, float))
    return lon, lat


def lonlat_to_xy(lon, lat):
    x, y = T_FWD.transform(np.asarray(lon, float), np.asarray(lat, float))
    return x, y


def polys_only(g):
    """Keep polygonal parts of a geometry (make_valid can return collections)."""
    if g is None or shapely.is_empty(g):
        return None
    t = shapely.get_type_id(g)
    if t in (3, 6):
        return g
    if t == 7:
        parts = [p for p in shapely.get_parts(g) if shapely.get_type_id(p) in (3, 6)]
        if not parts:
            return None
        return shapely.union_all(parts)
    return None


def lines_only(g):
    if g is None or shapely.is_empty(g):
        return None
    t = shapely.get_type_id(g)
    if t in (1, 5):
        return g
    if t == 7:
        parts = [p for p in shapely.get_parts(g) if shapely.get_type_id(p) in (1, 5)]
        return shapely.multilinestrings(parts) if parts else None
    return None


def box_albers(box, densify=20):
    """Polygon of a lon/lat box in Albers."""
    xs, ys = [], []
    for i in range(densify + 1):
        t = i / densify
        for lon, lat in ((box[0] + t * (box[2] - box[0]), box[1]), (box[2], box[1] + t * (box[3] - box[1])),
                         (box[2] - t * (box[2] - box[0]), box[3]), (box[0], box[3] - t * (box[3] - box[1]))):
            xs.append(lon)
            ys.append(lat)
    x, y = lonlat_to_xy(xs, ys)
    return shapely.convex_hull(shapely.multipoints(np.column_stack([x, y])))


_num_re = re.compile(r'-?\d+\.\d{6,}')


def _round_json(s, nd=5):
    return _num_re.sub(lambda m: (f'{float(m.group()):.{nd}f}').rstrip('0').rstrip('.'), s)


def write_geojson(path, geoms_wgs, props, nd=5):
    """geoms in EPSG:4326. Rounds to nd decimals. Returns (bytes, n features)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    g = shapely.set_precision(np.asarray(geoms_wgs, dtype=object), 10 ** -nd)
    gj = shapely.to_geojson(g)
    parts = []
    for s, p in zip(gj, props):
        if s is None or s.endswith('[]}') or '"coordinates":[]' in s:
            continue
        parts.append('{"type":"Feature","properties":' + json.dumps(p, ensure_ascii=False, separators=(',', ':'))
                     + ',"geometry":' + _round_json(s, nd) + '}')
    txt = '{"type":"FeatureCollection","features":[\n' + ',\n'.join(parts) + '\n]}\n'
    b = txt.encode('utf-8')
    path.write_bytes(b)
    return len(b), len(parts)


def simplify_m(geoms, tol):
    return shapely.simplify(geoms, tol, preserve_topology=True)


def clean_str(v):
    if v is None:
        return None
    v = re.sub(r'<[^>]+>', ' ', str(v))
    v = re.sub(r'&nbsp;|&amp;', lambda m: ' ' if m.group(0) == '&nbsp;' else '&', v)
    v = re.sub(r'\s+', ' ', v).strip()
    return v or None


def date_only(v):
    if not v:
        return None
    return str(v)[:10]


def title_case_name(s):
    """Upper case names from some layers (for example LOUIS CREEK) shown in title case. Not a new name."""
    if not s:
        return s
    if s.isupper():
        keep = re.compile(r'[IVX]+|FSR|BC|TFL|N|S|E|W|NE|NW|SE|SW')
        return re.sub(r"[A-Za-z']+", lambda m: m.group(0) if keep.fullmatch(m.group(0)) else m.group(0).capitalize(), s)
    return s


# --------------------------------------------------------------------------------------
# Vector cache: raw pages -> Albers geometries + properties, pickled per scope
# --------------------------------------------------------------------------------------
_VEC = {}


def load_vec(cache, layer, scope):
    """Return (geoms Albers ndarray, props list, meta). Cached in cache/work/vec/<layer>_<scope>.pkl."""
    k = (layer, scope)
    if k in _VEC:
        return _VEC[k]
    pk = Path(cache) / 'work' / 'vec' / f'{layer}_{scope}.pkl'
    raw_done = Path(cache) / 'raw' / layer / scope / 'done.json'
    if pk.exists() and (not raw_done.exists() or pk.stat().st_mtime > raw_done.stat().st_mtime):
        with open(pk, 'rb') as f:
            _VEC[k] = pickle.load(f)
        return _VEC[k]
    feats = [f for f in load_raw(cache, layer, scope) if f.get('geometry')]
    if feats:
        geoms = shapely.from_geojson([json.dumps(f['geometry']) for f in feats], on_invalid='ignore')
    else:
        geoms = np.array([], dtype=object)
    props = [f['properties'] for f in feats]
    ok = ~shapely.is_missing(geoms)
    geoms = geoms[ok]
    props = [p for p, o in zip(props, ok) if o]
    geoms = to_albers(geoms)
    tid = shapely.get_type_id(geoms)
    if len(geoms) and np.isin(tid, [3, 6]).any():
        bad = ~shapely.is_valid(geoms)
        if bad.any():
            geoms[bad] = [polys_only(g) for g in shapely.make_valid(geoms[bad])]
        keep = ~shapely.is_missing(geoms)
        geoms = geoms[keep]
        props = [p for p, o in zip(props, keep) if o]
    meta = fetch_meta(cache, layer, scope)
    out = (geoms, props, meta)
    pk.parent.mkdir(parents=True, exist_ok=True)
    with open(pk, 'wb') as f:
        pickle.dump(out, f, protocol=pickle.HIGHEST_PROTOCOL)
    _VEC[k] = out
    return out


def subset_box(geoms, props, poly):
    if len(geoms) == 0:
        return geoms, props
    tree = STRtree(geoms)
    idx = np.sort(tree.query(poly, predicate='intersects'))
    return geoms[idx], [props[i] for i in idx]


def newest(props, field):
    vals = [str(p.get(field))[:10] for p in props if p.get(field)]
    return max(vals) if vals else None


# --------------------------------------------------------------------------------------
# PMTiles writer (vector tiles), used when a GeoJSON layer would exceed 6 MB
# --------------------------------------------------------------------------------------
MERC = Transformer.from_crs(4326, 3857, always_xy=True)
WORLD = 20037508.342789244


def to_merc(g_wgs):
    return shapely.transform(g_wgs, _tf(MERC))


def write_pmtiles(path, geoms_wgs, props, layer_name, minzoom=8, maxzoom=12):
    import mapbox_vector_tile
    from pmtiles.tile import Compression, TileType, zxy_to_tileid
    from pmtiles.writer import Writer
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    gm = to_merc(np.asarray(geoms_wgs, dtype=object))
    keep = ~(shapely.is_missing(gm) | shapely.is_empty(gm))
    gm = gm[keep]
    props = [p for p, k in zip(props, keep) if k]
    b = shapely.total_bounds(gm)
    tiles = {}
    fields = {}
    for p in props:
        for kk, vv in p.items():
            fields[kk] = 'Number' if isinstance(vv, (int, float)) else 'String'
    for z in range(minzoom, maxzoom + 1):
        size = 2 * WORLD / 2 ** z
        tol = size / 4096 * (1.5 if z < maxzoom else 0.5)
        gz = shapely.simplify(gm, tol, preserve_topology=True) if z < maxzoom else gm
        tree = STRtree(gz)
        tx0 = int((b[0] + WORLD) // size)
        tx1 = int((b[2] + WORLD) // size)
        ty0 = int((WORLD - b[3]) // size)
        ty1 = int((WORLD - b[1]) // size)
        for tx in range(tx0, tx1 + 1):
            for ty in range(ty0, ty1 + 1):
                minx = -WORLD + tx * size
                maxy = WORLD - ty * size
                tb = (minx, maxy - size, minx + size, maxy)
                buf = size * 64 / 4096
                clip = shapely.box(tb[0] - buf, tb[1] - buf, tb[2] + buf, tb[3] + buf)
                idx = tree.query(clip, predicate='intersects')
                if len(idx) == 0:
                    continue
                feats = []
                for i in idx:
                    g = shapely.clip_by_rect(gz[i], *clip.bounds)
                    if g is None or g.is_empty:
                        continue
                    feats.append({'geometry': g, 'properties': {k: v for k, v in props[i].items() if v is not None and not isinstance(v, (list, dict))}})
                if not feats:
                    continue
                data = mapbox_vector_tile.encode([{'name': layer_name, 'features': feats}],
                                                 default_options={'quantize_bounds': tb, 'extents': 4096, 'y_coord_down': False})
                tiles[zxy_to_tileid(z, tx, ty)] = gzip.compress(data)
    lon0, lat0 = MERC.transform(b[0], b[1], direction='INVERSE')
    lon1, lat1 = MERC.transform(b[2], b[3], direction='INVERSE')
    with open(path, 'wb') as f:
        w = Writer(f)
        for tid in sorted(tiles):
            w.write_tile(tid, tiles[tid])
        w.finalize({'tile_type': TileType.MVT, 'tile_compression': Compression.GZIP,
                    'min_zoom': minzoom, 'max_zoom': maxzoom,
                    'min_lon_e7': int(lon0 * 1e7), 'min_lat_e7': int(lat0 * 1e7),
                    'max_lon_e7': int(lon1 * 1e7), 'max_lat_e7': int(lat1 * 1e7),
                    'center_zoom': minzoom + 2, 'center_lon_e7': int((lon0 + lon1) / 2 * 1e7),
                    'center_lat_e7': int((lat0 + lat1) / 2 * 1e7)},
                   {'name': layer_name, 'format': 'pbf', 'vector_layers': [
                       {'id': layer_name, 'fields': fields, 'minzoom': minzoom, 'maxzoom': maxzoom}],
                    'attribution': 'BC Data Catalogue, Open Government Licence BC'})
    return path.stat().st_size, len(tiles)


# ======================================================================================
# Layer cleaning
# ======================================================================================
MAX_GEOJSON = 6 * 1024 * 1024
PM_MAXZOOM = 12   # PMTiles max zoom (MapLibre overzooms beyond)
OUT_LAYERS = ROOT / 'data' / 'layers'
OUT_SPOTS = ROOT / 'data' / 'spots'
LAYER_LOG = {}   # id -> info for manifest (file, size, count, dataDate, ...)

UWR_SPECIES = {
    'M-ODHE': ('mule_deer', 'Mule deer'), 'M-ODVI': ('wt_deer', 'White tailed deer'), 'M-ALAM': ('moose', 'Moose'),
    'M-CEEL': ('elk', 'Elk'), 'M-OVCA': ('sheep', 'Bighorn sheep'), 'M-ORAM': ('goat', 'Mountain goat'),
    'M-RATA': ('caribou', 'Caribou'), 'M-ODHC': ('bt_deer', 'Black tailed deer'), 'M-OVDA': ('thinhorn', 'Thinhorn sheep'),
}


def mvpr_kind(ptype):
    t = (ptype or '').lower()
    if t.startswith('snowmobile'):
        return 'snowmobile'
    if t.startswith('atv'):
        return 'atv'
    if 'hunting' in t:
        return 'mv_hunting'
    return 'mv_closed'


DESIGNATION = {'PROVINCIAL PARK': 'Provincial park', 'ECOLOGICAL RESERVE': 'Ecological reserve',
               'PROTECTED AREA': 'Protected area', 'RECREATION AREA': 'Recreation area'}


def clean_bc(cache):
    """BC wide layers in Albers with clean properties (full resolution, for analysis and output)."""
    out = {}
    g, p, m = load_vec(cache, 'mu', 'BC')
    out['mu'] = (g, [{'MU': x['WILDLIFE_MGMT_UNIT_ID'], 'region': str(x.get('REGION_RESPONSIBLE_ID') or ''),
                      'regionName': x.get('REGION_RESPONSIBLE_NAME'), 'zone': x.get('GAME_MANAGEMENT_ZONE_NAME')} for x in p], m)
    g, p, m = load_vec(cache, 'parks', 'BC')
    out['parks'] = (g, [{'name': title_case_name(x.get('PROTECTED_LANDS_NAME')),
                         'designation': DESIGNATION.get(x.get('PROTECTED_LANDS_DESIGNATION'), x.get('PROTECTED_LANDS_DESIGNATION')),
                         'code': x.get('PROTECTED_LANDS_CODE')} for x in p], m)
    if (Path(cache) / 'raw' / 'natparks' / 'BC' / 'done.json').exists():   # national parks: no hunting (Canada National Parks Act)
        ng, np_, _ = load_vec(cache, 'natparks', 'BC')
        out['parks'] = (np.concatenate([g, ng]), out['parks'][1] + [{'name': x.get('ENGLISH_NAME'), 'designation': 'National park',
                                                                      'code': 'NP'} for x in np_], m)
    g, p, m = load_vec(cache, 'reserves', 'BC')
    out['reserves'] = (g, [{'name': x.get('ENGLISH_NAME')} for x in p], m)
    g, p, m = load_vec(cache, 'municipalities', 'BC')
    out['municipalities'] = (g, [{'name': x.get('ADMIN_AREA_NAME'), 'abbr': x.get('ADMIN_AREA_ABBREVIATION'),
                                  'updated': date_only(x.get('WHEN_UPDATED'))} for x in p], m)
    g, p, m = load_vec(cache, 'mvpr_areas', 'BC')
    out['mvpr_areas'] = (g, [{'name': x.get('REGULATION_GEOGRAPHIC_NAME'), 'type': x.get('PROHIBITION_TYPE'),
                              'kind': mvpr_kind(x.get('PROHIBITION_TYPE')), 'dates': x.get('EFFECTIVE_DESCRIPTION'),
                              'exemption': x.get('EXEMPTION'), 'region': x.get('REGION'), 'MU': x.get('MU_NUMBER'),
                              'map': x.get('MAP_NUMBER'), 'schedule': x.get('SCHEDULE')} for x in p], m)
    g, p, m = load_vec(cache, 'mvpr_routes', 'BC')
    out['mvpr_routes'] = (g, [{'name': x.get('REGULATION_GEOGRAPHIC_NAME'), 'road': x.get('ROAD_NAME'), 'type': x.get('PROHIBITION_TYPE'),
                               'status': x.get('ACCESS_STATUS'), 'open': (x.get('ACCESS_STATUS') or '').startswith('Open'),
                               'range': x.get('ACCESS_RANGE'), 'description': x.get('ACCESS_DESCRIPTION'),
                               'limitation': x.get('ACCESS_LIMITATION'), 'MU': x.get('MU_NUMBER')} for x in p], m)
    g, p, m = load_vec(cache, 'wma', 'BC')
    out['wma'] = (g, [{'name': x.get('WILDLIFE_MANAGEMENT_AREA_NAME')} for x in p], m)
    g, p, m = load_vec(cache, 'leh', 'BC')
    out['leh'] = (g, [{'zone': x.get('LIMITED_ENTRY_HUNTING_ZONE'), 'label': x.get('LTD_ENTRY_HUNTING_ZONE_LABEL'),
                       'species': (x.get('LTD_ENTRY_HUNTING_ZONE_TYPE') or '').capitalize(), 'MUs': x.get('MANAGEMENT_UNITS')} for x in p], m)
    return out


def harvest_year(p):
    for k in ('DENUDATION_1_COMPLETION_DATE', 'DISTURBANCE_END_DATE', 'DISTURBANCE_START_DATE'):
        v = p.get(k)
        if v:
            try:
                return int(str(v)[:4])
            except ValueError:
                pass
    return None


def dissolve_private(geoms, close_m=0.5):
    """Union of private parcels. A tiny buffer closes slivers between touching parcels, not roads."""
    t0 = time.time()
    g = shapely.buffer(geoms, close_m, quad_segs=1)
    tree_parts = []
    # union in spatial chunks (faster and lighter), then union the chunk results
    cx = shapely.get_x(shapely.centroid(g))
    cy = shapely.get_y(shapely.centroid(g))
    step = 20000.0
    keys = (np.floor(cx / step).astype(np.int64) * 100000 + np.floor(cy / step).astype(np.int64))
    for k in np.unique(keys):
        tree_parts.append(shapely.union_all(g[keys == k]))
    u = shapely.union_all(tree_parts)
    u = shapely.buffer(u, -close_m, quad_segs=1)
    parts = shapely.get_parts(u)
    parts = parts[shapely.area(parts) > 50]
    log(f'  dissolved {len(geoms)} parcels into {len(parts)} polygons in {time.time() - t0:.0f}s')
    return parts


def clean_area(cache, area):
    """Per area vector layers in Albers with clean properties. Cached as a pickle."""
    pk = Path(cache) / 'work' / area / 'clean.pkl'
    if pk.exists():
        newest_raw = max((p.stat().st_mtime for p in (Path(cache) / 'raw').glob(f'*/{area}/done.json')), default=0)
        if pk.stat().st_mtime > newest_raw:
            with open(pk, 'rb') as f:
                return pickle.load(f)
    t0 = time.time()
    out = {}
    # UWR
    g, p, m = load_vec(cache, 'uwr', area)
    props = []
    for x in p:
        # Region 4 lists several species in one field, separated by ';' (for example 'M-CEEL;M-OVCA;M-ODHE')
        codes = [c.strip() for f in ('SPECIES_1', 'SPECIES_2') for c in str(x.get(f) or '').split(';') if c.strip()]
        sp = [UWR_SPECIES[c] for c in dict.fromkeys(codes) if c in UWR_SPECIES] or [(None, None)]
        sp2 = sp[1] if len(sp) > 1 else (None, None)
        props.append({'uwr': x.get('UWR_NUMBER'), 'unit': x.get('UWR_UNIT_NUMBER'), 'sps': [s[0] for s in sp if s[0]],
                      'sp1': sp[0][0], 'sp2': sp2[0], 'species': ' and '.join(s[1] for s in sp if s[1]),
                      'approved': date_only(x.get('APPROVAL_DATE')), 'ha': round(float(x.get('HECTARES') or 0), 1)})
    out['uwr'] = (g, props, m)
    # private land (dissolved)
    g, p, m = load_vec(cache, 'private', area)
    m = dict(m)
    m['newestRecord'] = newest(p, 'WHEN_UPDATED')
    m['parcels'] = len(g)
    out['private'] = (dissolve_private(g), None, m)
    # cutblocks (openings with a harvest date)
    g, p, m = load_vec(cache, 'openings', area)
    keep, props = [], []
    for i, x in enumerate(p):
        if (x.get('OPENING_STATUS_CODE') or '') in ('RET',):
            continue
        y = harvest_year(x)
        if not y or y > YEAR:
            continue
        keep.append(i)
        props.append({'year': y, 'age': YEAR - y, 'opening': x.get('OPENING_ID'),
                      'code': x.get('DENUDATION_1_DISTURBANCE_CODE'), 'silv': x.get('DENUDATION_1_SILV_SYSTEM_CODE')})
    out['cutblocks'] = (g[keep], props, m)
    # burns
    g, p, m = load_vec(cache, 'burns', area)
    out['burns'] = (g, [{'year': int(x.get('FIRE_YEAR') or 0), 'fire': x.get('FIRE_NUMBER'),
                         'ha': round(float(x.get('FIRE_SIZE_HECTARES') or 0)), 'cause': x.get('FIRE_CAUSE')} for x in p], m)
    # BEC
    g, p, m = load_vec(cache, 'bec', area)
    out['bec'] = (g, [{'zone': x.get('ZONE'), 'subzone': x.get('SUBZONE'), 'label': x.get('MAP_LABEL'),
                       'zoneName': x.get('ZONE_NAME')} for x in p], m)
    # water
    for k in ('lakes', 'wetlands', 'rivers'):
        g, p, m = load_vec(cache, k, area)
        out[k] = (g, [{'name': x.get('GNIS_NAME_1'), 'ha': round(float(x.get('AREA_HA') or 0), 2),
                       'id': x.get('WATERBODY_POLY_ID')} for x in p], m)
    g, p, m = load_vec(cache, 'streams', area)
    out['streams'] = (g, [{'name': x.get('GNIS_NAME'), 'order': int(x.get('STREAM_ORDER') or 0)} for x in p], m)
    # roads
    g, p, m = load_vec(cache, 'dra_roads', area)
    out['dra'] = (g, [{'name': clean_str(x.get('ROAD_NAME_FULL')), 'cls': x.get('ROAD_CLASS'), 'surf': x.get('ROAD_SURFACE'),
                       'lanes': int(x.get('NUMBER_OF_LANES') or 0), 'hwy': clean_str(x.get('HIGHWAY_ROUTE_NUMBER')),
                       'ftype': x.get('FEATURE_TYPE'), 'date': date_only(x.get('DATA_CAPTURE_DATE'))} for x in p], m)
    g, p, m = load_vec(cache, 'ften_roads', area)
    out['ften'] = (g, [{'name': title_case_name(clean_str(x.get('ROAD_SECTION_NAME'))), 'type': x.get('FILE_TYPE_DESCRIPTION'),
                        'status': x.get('FILE_STATUS_CODE'), 'life': x.get('LIFE_CYCLE_STATUS_CODE'),
                        'retired': date_only(x.get('RETIREMENT_DATE')), 'file': x.get('FOREST_FILE_ID'),
                        'section': x.get('ROAD_SECTION_ID'), 'label': x.get('MAP_LABEL')} for x in p], m)
    # recreation

    def acts(x, n):
        a = [x.get(f'ACTIVITY_DESC{i}') for i in range(1, n + 1)]
        return ', '.join(v for v in a if v)
    g, p, m = load_vec(cache, 'rec_sites', area)
    out['rec_sites'] = (g, [{'name': clean_str(x.get('PROJECT_NAME')), 'file': x.get('FOREST_FILE_ID'),
                             'location': clean_str(x.get('SITE_LOCATION')),
                             'campsites': int(x.get('NUM_CAMP_SITES') or 0), 'directions': clean_str(x.get('DRIVING_DIRECTIONS')),
                             'closure': clean_str(x.get('CLOSURE_DESCRIPTION')), 'activities': acts(x, 3),
                             'moreActivities': x.get('MORE_ACTIVITY_IND') == 'Y',
                             'access': ', '.join(v for v in (x.get('ACCESS_DESC1'), x.get('ACCESS_DESC2'), x.get('ACCESS_DESC3')) if v),
                             'maintained': clean_str(x.get('MAINTAIN_STD_DESC'))} for x in p], m)
    g, p, m = load_vec(cache, 'rec_trailheads', area)
    out['rec_trailheads'] = (g, [{'name': clean_str(x.get('PROJECT_NAME')), 'file': x.get('FOREST_FILE_ID'),
                                  'directions': clean_str(x.get('DRIVING_DIRECTIONS')), 'closure': clean_str(x.get('CLOSURE_DESCRIPTION')),
                                  'campsites': int(x.get('NUM_CAMP_SITES') or 0), 'activities': acts(x, 10),
                                  'retired': date_only(x.get('RETIREMENT_DATE')), 'life': x.get('LIFE_CYCLE_STATUS_CODE')} for x in p], m)
    g, p, m = load_vec(cache, 'rec_trails', area)
    out['rec_trails'] = (g, [{'name': clean_str(x.get('PROJECT_NAME')), 'file': x.get('FOREST_FILE_ID'),
                              'closure': clean_str(x.get('CLOSURE_DESCRIPTION')), 'activities': acts(x, 10),
                              'retired': date_only(x.get('RETIREMENT_DATE')), 'life': x.get('LIFE_CYCLE_STATUS_CODE')} for x in p], m)
    g, p, m = load_vec(cache, 'rec_polys', area)
    out['rec_polys'] = (g, [{'name': clean_str(x.get('PROJECT_NAME')), 'file': x.get('FOREST_FILE_ID'), 'ptype': x.get('PROJECT_TYPE'),
                             'campsites': int(x.get('DEFINED_CAMPSITES') or 0), 'retired': date_only(x.get('RETIREMENT_DATE')),
                             'life': x.get('LIFE_CYCLE_STATUS_CODE')} for x in p], m)
    g, p, m = load_vec(cache, 'names', area)
    out['names'] = (g, [{'name': x.get('GEOGRAPHICAL_NAME'), 'type': x.get('FEATURE_TYPE'), 'cat': x.get('FEATURE_CATEGORY')} for x in p], m)
    pk.parent.mkdir(parents=True, exist_ok=True)
    with open(pk, 'wb') as f:
        pickle.dump(out, f, protocol=pickle.HIGHEST_PROTOCOL)
    log(f'  clean {area} in {time.time() - t0:.0f}s')
    return out


# ======================================================================================
# Step: layers (write map layers)
# ======================================================================================
def info_path(cache):
    return Path(cache) / 'work' / 'layer_info.json'


def load_info(cache):
    p = info_path(cache)
    return json.load(open(p)) if p.exists() else {}


def save_info(cache, info):
    p = info_path(cache)
    p.parent.mkdir(parents=True, exist_ok=True)
    json.dump(info, open(p, 'w'), indent=1)


def rel(p):
    return str(Path(p).resolve().relative_to(ROOT)).replace(os.sep, '/')


def emit(info, lid, scope, base_path, geoms_albers, props, tol, data_date, newest_record=None, minzoom_pm=8, force_pm=False):
    """Simplify (tol m), write GeoJSON; if over 6 MB write PMTiles instead. Records file info."""
    t0 = time.time()
    g = np.asarray(geoms_albers, dtype=object)
    exp = excl_poly_albers(scope) if scope in AREAS else None
    if exp is not None and len(g):
        hit = shapely.intersects(g, exp)
        if hit.any():
            g = g.copy()
            g[hit] = shapely.difference(g[hit], exp)
    if tol:
        g = simplify_m(g, tol)
    keep = ~(shapely.is_missing(g) | shapely.is_empty(g))
    g = g[keep]
    props = [p for p, k in zip(props, keep) if k]
    gw = to_wgs(g)
    gj = Path(str(base_path) + '.geojson')
    pm = Path(str(base_path) + '.pmtiles')
    size, n = (0, 0)
    fmt = 'geojson'
    force_pm = force_pm or lid in PM_FORCE
    if not force_pm:
        size, n = write_geojson(gj, gw, props)
    if force_pm or size > MAX_GEOJSON:
        if gj.exists():
            gj.unlink()
        size, ntiles = write_pmtiles(pm, gw, props, lid, minzoom=minzoom_pm, maxzoom=PM_MAXZOOM)
        n = len(props)
        fmt = 'pmtiles'
        path = pm
    else:
        if pm.exists():
            pm.unlink()
        path = gj
    rec = info.setdefault(lid, {})
    rec[scope] = {'file': rel(path), 'format': fmt, 'bytes': size, 'features': n, 'dataDate': data_date,
                  'newestRecord': newest_record, 'tol': tol, 'seconds': round(time.time() - t0, 1)}
    log(f'  {lid} {scope}: {n} features, {size / 1e6:.2f} MB {fmt}')
    return rec[scope]


def step_layers(cache, areas):
    info = load_info(cache)
    bc = clean_bc(cache)
    bcdir = OUT_LAYERS / 'bc'

    def bcdate(k):
        return fetch_meta(cache, k, 'BC').get('date', TODAY)
    g, p, m = bc['mu']
    emit(info, 'mu_lines', 'BC', bcdir / 'mu', g, p, 100, bcdate('mu'))
    lab = shapely.point_on_surface(g)
    emit(info, 'mu_labels', 'BC', bcdir / 'mu_labels', lab, [{'MU': x['MU'], 'region': x['region']} for x in p], 0, bcdate('mu'))
    g, p, m = bc['parks']
    emit(info, 'parks', 'BC', bcdir / 'parks', g, p, 50, bcdate('parks'))
    g, p, m = bc['reserves']
    emit(info, 'reserves', 'BC', bcdir / 'reserves', g, p, 50, bcdate('reserves'))
    g, p, m = bc['municipalities']
    emit(info, 'city_limits', 'BC', bcdir / 'city_limits', g, p, 50, bcdate('municipalities'), newest(p, 'updated'))
    g, p, m = bc['mvpr_areas']
    emit(info, 'closures', 'BC', bcdir / 'closures', g, p, 50, bcdate('mvpr_areas'))
    g, p, m = bc['mvpr_routes']
    emit(info, 'closure_routes', 'BC', bcdir / 'closure_routes', g, p, 50, bcdate('mvpr_routes'))
    g, p, m = bc['wma']
    emit(info, 'wma', 'BC', bcdir / 'wma', g, p, 50, bcdate('wma'))
    g, p, m = bc['leh']
    emit(info, 'leh', 'BC', bcdir / 'leh', g, p, 100, bcdate('leh'))

    for a in areas:
        log(f'layers: area {a}')
        ca = clean_area(cache, a)
        adir = OUT_LAYERS / a

        def adate(k):
            return fetch_meta(cache, k, a).get('date', TODAY)
        # private land
        g, _, m = ca['private']
        emit(info, 'private_land', a, adir / 'private_land', g, [{'owner': 'Private'} for _ in g], 10, adate('private'),
             m.get('newestRecord'), minzoom_pm=9)
        info['private_land'][a]['parcels'] = m.get('parcels')
        # winter ranges by species
        g, p, m = ca['uwr']
        for code, (sp, label) in UWR_SPECIES.items():
            idx = [i for i, x in enumerate(p) if sp in uwr_sps(x)]
            lid = f'uwr_{sp}'
            if not idx:
                info.get(lid, {}).pop(a, None)
                for ext in ('.geojson', '.pmtiles'):
                    f = adir / (lid + ext)
                    if f.exists():
                        f.unlink()
                continue
            months = winter_months(MIG_KEY.get(sp), SPECIES_WINTER_MONTHS.get(sp, [11, 12, 1, 2, 3, 4]))
            pp = [dict({k: v for k, v in p[i].items() if k != 'sps'}, months=months, monthsKey=months_key(months)) for i in idx]
            gg = g[idx]
            tol, fpm = 15, False
            if len(idx) > 5000:   # Region 4 winter ranges come in tens of thousands of small pieces: dissolve per UWR number for the map
                groups = {}
                for k, x in zip(range(len(idx)), pp):
                    groups.setdefault(x['uwr'], []).append(k)
                gg2, pp2 = [], []
                for u, ks in groups.items():
                    d = shapely.union_all(shapely.buffer(gg[ks], 20)).buffer(-20)
                    for part in getattr(d, 'geoms', [d]):
                        if part.area >= 50000:   # under 5 ha left out of the map layer (spots still use every piece)
                            gg2.append(part)
                            pp2.append(dict(pp[ks[0]], unit='several', ha=round(part.area / 1e4, 1), species=label))
                log(f'  {lid} {a}: {len(idx)} pieces dissolved into {len(gg2)} polygons for the map')
                gg, pp = np.array(gg2, dtype=object), pp2
                tol, fpm = 30, True   # size budget (about 35 MB for area F): coarser outline, PMTiles
            emit(info, lid, a, adir / lid, gg, pp, tol, adate('uwr'), newest(pp, 'approved'), force_pm=fpm)
        # young cutblocks (25 years or less)
        g, p, m = ca['cutblocks']
        idx = [i for i, x in enumerate(p) if x['age'] <= 25]
        pp = []
        for i in idx:
            x = p[i]
            cls = '0 to 4 years' if x['age'] < 5 else ('5 to 20 years' if x['age'] <= 20 else '21 to 25 years')
            pp.append({'year': x['year'], 'age': x['age'], 'ageClass': cls, 'opening': x['opening']})
        emit(info, 'cutblocks', a, adir / 'cutblocks', g[idx], pp, 15, adate('openings'), None)
        # recent burns (2000 on)
        g, p, m = ca['burns']
        idx = [i for i, x in enumerate(p) if x['year'] >= 2000]
        emit(info, 'burns', a, adir / 'burns', g[idx], [p[i] for i in idx], 15, adate('burns'))
        # wetlands
        g, p, m = ca['wetlands']
        emit(info, 'wetlands', a, adir / 'wetlands', g, [{'name': x['name'], 'ha': x['ha']} for x in p], 15, adate('wetlands'))
        # habitat zones (BEC)
        g, p, m = ca['bec']
        emit(info, 'habitat_zones', a, adir / 'habitat_zones', g,
             [{'zone': x['zone'], 'label': x['label'], 'zoneName': BEC_NAMES.get(x['zone'], x['zoneName'])} for x in p], 40, adate('bec'))
        # forest roads (FTEN), merged per road section
        g, p, m = ca['ften']
        groups = {}
        for i, x in enumerate(p):
            if x['retired'] or (x['life'] and x['life'] != 'ACTIVE'):
                continue
            groups.setdefault((x['file'], x['section'], x['name'], x['type']), []).append(i)
        gg, pp = [], []
        for (file, section, name, typ), idx in groups.items():
            ml = shapely.line_merge(shapely.union_all(g[idx]))
            gg.append(ml)
            pp.append({'name': name, 'type': typ, 'file': file, 'section': section})
        emit(info, 'forest_roads', a, adir / 'forest_roads', np.array(gg, dtype=object), pp, 10, adate('ften_roads'))
        # recreation trails
        g, p, m = ca['rec_trails']
        idx = [i for i, x in enumerate(p) if not x['retired']]
        emit(info, 'rec_trails', a, adir / 'rec_trails', g[idx],
             [{'name': p[i]['name'], 'activities': p[i]['activities'], 'closure': p[i]['closure'], 'file': p[i]['file']} for i in idx],
             10, adate('rec_trails'))
        # rec sites and trailheads (points)
        gs, ps, _ = ca['rec_sites']
        gt, pt, _ = ca['rec_trailheads']
        pts = list(gs) + [gt[i] for i, x in enumerate(pt) if not x['retired']]
        pp = [dict(kind='Rec site', **{k: x[k] for k in ('name', 'campsites', 'activities', 'closure', 'directions', 'file')}) for x in ps]
        pp += [dict(kind='Trailhead', **{k: x[k] for k in ('name', 'campsites', 'activities', 'closure', 'directions', 'file')})
               for x in pt if not x['retired']]
        emit(info, 'rec_sites', a, adir / 'rec_sites', np.array(pts, dtype=object), pp, 0, adate('rec_sites'))
    save_info(cache, info)


# ======================================================================================
# Elevation (terrarium z12) and analysis grid
# ======================================================================================
def build_dem_grid(cache, area):
    from PIL import Image
    out = Path(cache) / 'work' / area / 'dem.npy'
    if out.exists():
        return
    x0, y0, x1, y1 = dem_tile_range(AREAS[area]['box'])
    dem = np.full(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), np.nan, np.float32)
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            fn = Path(cache) / 'dem' / str(DEM_Z) / str(x) / f'{y}.png'
            if not fn.exists():
                continue
            a = np.asarray(Image.open(fn).convert('RGB')).astype(np.float32)
            h = a[..., 0] * 256.0 + a[..., 1] + a[..., 2] / 256.0 - 32768.0
            dem[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = h
    out.parent.mkdir(parents=True, exist_ok=True)
    np.save(out, dem)
    json.dump({'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'z': DEM_Z}, open(out.with_suffix('.json'), 'w'))
    log(f'  dem grid {area}: {dem.shape}, nan {int(np.isnan(dem).sum())}')


class DEM:
    def __init__(self, cache, area):
        from scipy import ndimage
        self.nd = ndimage
        p = Path(cache) / 'work' / area / 'dem.npy'
        self.h = np.load(p)
        self.meta = json.load(open(p.with_suffix('.json')))
        h = np.nan_to_num(self.h, nan=float(np.nanmean(self.h)))
        hs = ndimage.uniform_filter(h, 3)
        z = self.meta['z']
        rows = np.arange(h.shape[0]) + 0.5
        yt = self.meta['y0'] + rows / 256.0
        lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * yt / 2 ** z))))
        px_m = 40075016.686 * np.cos(np.radians(lat)) / (256 * 2 ** z)
        gy, gx = np.gradient(hs)
        gx = gx / px_m[:, None]
        gy = gy / px_m[:, None]
        self.slope = np.degrees(np.arctan(np.hypot(gx, gy))).astype(np.float32)
        self.aspect = ((np.degrees(np.arctan2(-gx, gy)) + 360.0) % 360.0).astype(np.float32)
        # local relief: cell lower than its 500 m neighbourhood mean (draws, gullies)
        k = max(3, int(round(500 / float(np.median(px_m)))) | 1)
        self.relief = (hs - ndimage.uniform_filter(hs, k)).astype(np.float32)
        self.hs = hs.astype(np.float32)

    def _pix(self, lon, lat):
        n = 2 ** self.meta['z']
        lon = np.asarray(lon, float)
        lat = np.asarray(lat, float)
        xt = (lon + 180.0) / 360.0 * n
        yt = (1.0 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2.0 * n
        return (yt - self.meta['y0']) * 256 - 0.5, (xt - self.meta['x0']) * 256 - 0.5

    def sample(self, what, lon, lat, order=1):
        arr = {'elev': self.hs, 'slope': self.slope, 'aspect': self.aspect, 'relief': self.relief}[what]
        r, c = self._pix(lon, lat)
        return self.nd.map_coordinates(arr, [np.atleast_1d(r), np.atleast_1d(c)], order=order, mode='nearest')

    def sample_xy(self, what, x, y, order=1):
        lon, lat = xy_to_lonlat(x, y)
        return self.sample(what, lon, lat, order)

    def profile(self, line_albers, step=50.0):
        """Elevations along a line every step m. Returns (climb up, max elevation, min elevation)."""
        L = line_albers.length
        if L <= 0:
            return 0.0, None, None
        d = np.linspace(0, L, max(2, int(L // step) + 1))
        pts = shapely.line_interpolate_point(line_albers, d)
        e = self.sample_xy('elev', shapely.get_x(pts), shapely.get_y(pts))
        up = float(np.clip(np.diff(e), 0, None).sum())
        return up, float(e.max()), float(e.min())


class Grid:
    """Analysis raster in BC Albers (default 100 m cells) covering one area box."""

    def __init__(self, area, res=100.0):
        self.area = area
        self.res = res
        self.poly = box_albers(AREAS[area]['box'])
        minx, miny, maxx, maxy = self.poly.bounds
        self.x0 = math.floor(minx / res) * res
        self.y1 = math.ceil(maxy / res) * res
        self.nx = int(math.ceil((maxx - self.x0) / res))
        self.ny = int(math.ceil((self.y1 - miny) / res))
        cols = np.arange(self.nx)
        rows = np.arange(self.ny)
        self.cx = self.x0 + (cols + 0.5) * res
        self.cy = self.y1 - (rows + 0.5) * res
        X, Y = np.meshgrid(self.cx, self.cy)
        lon, lat = xy_to_lonlat(X.ravel(), Y.ravel())
        b = AREAS[area]['box']
        self.lon = lon.reshape(X.shape)
        self.lat = lat.reshape(X.shape)
        self.inbox = (self.lon >= b[0]) & (self.lon <= b[2]) & (self.lat >= b[1]) & (self.lat <= b[3])
        if area_excl(area):
            self.inbox &= ~in_excl(area, self.lon, self.lat)

    def _pts(self, coords):
        c = np.asarray(coords)
        return list(zip(((c[:, 0] - self.x0) / self.res - 0.5).tolist(), ((self.y1 - c[:, 1]) / self.res - 0.5).tolist()))

    def burn_polys(self, geoms, values=None, mode='L', base=None):
        from PIL import Image, ImageDraw
        img = Image.new(mode, (self.nx, self.ny), 0) if base is None else base
        d = ImageDraw.Draw(img)
        geoms = np.asarray(geoms, dtype=object)
        if len(geoms) == 0:
            return np.asarray(img)
        parts, idx = shapely.get_parts(geoms, return_index=True)
        order = np.argsort(-shapely.area(parts))
        for j in order:
            p = parts[j]
            if shapely.get_type_id(p) != 3:
                continue
            v = 1 if values is None else int(values[idx[j]])
            ext = shapely.get_coordinates(shapely.get_exterior_ring(p))
            if len(ext) < 3:
                continue
            d.polygon(self._pts(ext), fill=v, outline=v)
            for k in range(shapely.get_num_interior_rings(p)):
                ring = shapely.get_coordinates(shapely.get_interior_ring(p, k))
                if len(ring) >= 3:
                    d.polygon(self._pts(ring), fill=0)
        return np.asarray(img).copy()

    def burn_lines(self, geoms, values=None, mode='L', width=1):
        from PIL import Image, ImageDraw
        img = Image.new(mode, (self.nx, self.ny), 0)
        d = ImageDraw.Draw(img)
        geoms = np.asarray(geoms, dtype=object)
        if len(geoms) == 0:
            return np.asarray(img).copy()
        parts, idx = shapely.get_parts(geoms, return_index=True)
        for j, p in enumerate(parts):
            c = shapely.get_coordinates(p)
            if len(c) < 2:
                continue
            v = 1 if values is None else int(values[idx[j]])
            d.line(self._pts(c), fill=v, width=width)
        return np.asarray(img).copy()

    def burn_points(self, geoms):
        m = np.zeros((self.ny, self.nx), bool)
        if len(geoms) == 0:
            return m
        x = shapely.get_x(geoms)
        y = shapely.get_y(geoms)
        c = np.floor((x - self.x0) / self.res).astype(int)
        r = np.floor((self.y1 - y) / self.res).astype(int)
        ok = (c >= 0) & (c < self.nx) & (r >= 0) & (r < self.ny)
        m[r[ok], c[ok]] = True
        return m

    def dist(self, mask):
        from scipy import ndimage
        mask = np.asarray(mask, bool)
        if not mask.any():
            return np.full(mask.shape, 1e9, np.float32)
        return (ndimage.distance_transform_edt(~mask) * self.res).astype(np.float32)

    def count_within(self, mask, radius_m):
        """Number of True cells within a square window of side 2r (fast box sum)."""
        from scipy import ndimage
        k = int(2 * round(radius_m / self.res) + 1)
        return ndimage.uniform_filter(mask.astype(np.float32), k, mode='constant') * k * k

    def rc(self, x, y):
        c = np.floor((np.asarray(x) - self.x0) / self.res).astype(int)
        r = np.floor((self.y1 - np.asarray(y)) / self.res).astype(int)
        return np.clip(r, 0, self.ny - 1), np.clip(c, 0, self.nx - 1)


# ======================================================================================
# Road and trail network (Digital Road Atlas + forest tenure roads + rec trails)
# ======================================================================================
CAR_SURF = {'paved', 'loose'}
ATV_SURF = {'rough', 'overgrown', 'seasonal', 'unknown', '', None}
WALK_SURF = {'decommissioned'}
SKIP_CLASS = {'ferry', 'water', 'runway', 'proposed', 'driveway', 'strata', 'restricted', 'yield'}
TRAIL_CLASS = {'trail', 'skid'}
WALK_CLASS = {'pedestrian'}
MOTOR_WORDS = ('atv', 'all terrain', 'motorbike', 'motorcycle', 'motorized', 'trail bike', 'off road', '4x4', '4 wheel', 'four wheel')


def hwy_numbers(h):
    return [x for x in re.split(r'[+,;/ ]+', str(h or '')) if x]


def road_label(p):
    """Road name from the road atlas (or forest tenure). Highways as 'Hwy 5 (Yellowhead Hwy)'."""
    n = p.get('name')
    nums = hwy_numbers(p.get('hwy'))
    if nums:
        h = ' and '.join(nums)
        if n and not n.lower().startswith('hwy'):
            return f'Hwy {h} ({n})'
        return f'Hwy {h}'
    return n


class Network:
    def __init__(self, ctx):
        from scipy.spatial import cKDTree
        t0 = time.time()
        g, p, _ = ctx.ca['dra']
        segs, props = [], []
        for gi, pi in zip(g, p):
            cls = (pi.get('cls') or '').lower()
            surf = (pi.get('surf') or '').lower()
            if cls in SKIP_CLASS or surf == 'boat':
                continue
            if cls in WALK_CLASS or surf in WALK_SURF:
                mode = 2
            elif cls in TRAIL_CLASS and re.search(r'\btrail\b', pi.get('name') or '', re.I):
                mode = 2   # named trails (rail, horse, snowmobile, bike trails): walk only, my pick (motor rules unknown)
            elif cls in TRAIL_CLASS or surf in ATV_SURF:
                mode = 1
            elif surf in CAR_SURF:
                mode = 0
            else:
                mode = 1
            for part in shapely.get_parts(gi):
                if part.length < 1:
                    continue
                segs.append(part)
                props.append({'mode': mode, 'name': pi.get('name'), 'hwy': pi.get('hwy'), 'paved': surf == 'paved',
                              'cls': cls, 'surf': surf, 'lanes': pi.get('lanes') or 0, 'src': 'dra'})
        dra_n = len(segs)
        dra_geoms = np.array(segs, dtype=object)
        dra_tree = STRtree(dra_geoms)
        # forest tenure road names for unnamed atlas segments; forest roads missing from the atlas become ATV edges
        fg, fp, _ = ctx.ca['ften']
        fidx = [i for i, x in enumerate(fp) if not x['retired'] and (not x['life'] or x['life'] == 'ACTIVE')]
        fg = fg[fidx]
        fp = [fp[i] for i in fidx]
        if len(fg):
            ftree = STRtree(fg)
            mids = shapely.line_interpolate_point(dra_geoms, 0.5, normalized=True)
            pairs = ftree.query(mids, predicate='dwithin', distance=25)
            for a, b in zip(*pairs):
                if not props[a]['name'] and fp[b]['name']:
                    nm = fp[b]['name']
                    if (fp[b]['type'] or '').startswith('Forest Service Road') and 'FSR' not in nm and 'Forest Service' not in nm:
                        nm = nm + ' FSR'
                    props[a]['name'] = nm
                    props[a]['ften'] = fp[b]['file']
            # coverage of each forest road by the atlas (sample every 100 m)
            parts, pidx = shapely.get_parts(fg, return_index=True)
            plen = shapely.length(parts)
            samp, sidx = [], []
            for j, (part, L) in enumerate(zip(parts, plen)):
                if L < 50:
                    continue
                k = max(2, int(L // 100) + 1)
                samp.append(shapely.line_interpolate_point(part, np.linspace(0, L, k)))
                sidx.append(np.full(k, j))
            if samp:
                samp = np.concatenate(samp)
                sidx = np.concatenate(sidx)
                hit = np.zeros(len(samp), bool)
                q = dra_tree.query(samp, predicate='dwithin', distance=25)
                hit[q[0]] = True
                cov = np.bincount(sidx, weights=hit, minlength=len(parts)) / np.maximum(np.bincount(sidx, minlength=len(parts)), 1)
                for j in np.unique(sidx):
                    if cov[j] >= 0.5:
                        continue
                    x = fp[pidx[j]]
                    nm = x['name']
                    if nm and (x['type'] or '').startswith('Forest Service Road') and 'FSR' not in nm:
                        nm = nm + ' FSR'
                    segs.append(parts[j])
                    props.append({'mode': 1, 'name': nm, 'hwy': None, 'paved': False, 'cls': 'forest tenure road',
                                  'surf': 'unknown', 'lanes': 0, 'src': 'ften'})
        # rec trails: walk edges, ATV edges when motorized use is listed
        tg, tp, _ = ctx.ca['rec_trails']
        for gi, pi in zip(tg, tp):
            if pi['retired']:
                continue
            motor = any(w in (pi['activities'] or '').lower() for w in MOTOR_WORDS)
            for part in shapely.get_parts(gi):
                if part.length < 20:
                    continue
                segs.append(part)
                props.append({'mode': 1 if motor else 2, 'name': (pi['name'] + ' trail') if pi['name'] and 'trail' not in pi['name'].lower() else pi['name'],
                              'hwy': None, 'paved': False, 'cls': 'rec trail', 'surf': '', 'lanes': 0, 'src': 'trail',
                              'activities': pi['activities']})
        self.geoms = np.array(segs, dtype=object)
        self.props = props
        n = len(segs)
        self.mode = np.array([x['mode'] for x in props], np.int8)
        self.paved = np.array([x['paved'] for x in props], bool)
        self.length = shapely.length(self.geoms)
        # nodes from end points; non atlas lines snap to atlas nodes within 40 m
        a = shapely.get_point(self.geoms, 0)
        b = shapely.get_point(self.geoms, -1)
        ax, ay, bx, by = shapely.get_x(a), shapely.get_y(a), shapely.get_x(b), shapely.get_y(b)
        keys = np.concatenate([np.round(ax * 2).astype(np.int64) * 10 ** 8 + np.round(ay * 2).astype(np.int64),
                               np.round(bx * 2).astype(np.int64) * 10 ** 8 + np.round(by * 2).astype(np.int64)])
        _, inv = np.unique(keys, return_inverse=True)
        u = inv[:n].copy()
        v = inv[n:].copy()
        nx_ = np.zeros(inv.max() + 1)
        ny_ = np.zeros(inv.max() + 1)
        nx_[inv] = np.concatenate([ax, bx])
        ny_[inv] = np.concatenate([ay, by])
        dra_nodes = np.unique(np.concatenate([u[:dra_n], v[:dra_n]]))
        tree = cKDTree(np.column_stack([nx_[dra_nodes], ny_[dra_nodes]])) if len(dra_nodes) else None
        if tree is not None and n > dra_n:
            for arr, xx, yy in ((u, ax, ay), (v, bx, by)):
                q = np.arange(dra_n, n)
                d, j = tree.query(np.column_stack([xx[q], yy[q]]), distance_upper_bound=40)
                ok = np.isfinite(d)
                arr[q[ok]] = dra_nodes[j[ok]]
        self.u, self.v = u, v
        self.nx, self.ny = nx_, ny_
        self.N = len(nx_)
        # closures and exclusions per edge (by midpoint)
        mids = shapely.line_interpolate_point(self.geoms, 0.5, normalized=True)
        self.mids = mids
        self.closed = ctx.inside(ctx.closed_mv_polys, mids)          # motor vehicle (or for hunting) closed
        self.atv_closed = ctx.inside(ctx.atv_closed_polys, mids)    # ATV for hunting closed (fall dates)
        no_park = ctx.inside(ctx.no_park_polys, mids)
        self.car = (self.mode == 0) & ~self.closed
        self.atv_ok = (self.mode <= 1) & ~self.closed & ~self.atv_closed
        self.parkable = self.car & ~no_park
        self.edge_key = {}
        order = np.argsort(self.length)
        for i in order[::-1]:
            self.edge_key[(min(u[i], v[i]), max(u[i], v[i]))] = i
        self.node_tree = cKDTree(np.column_stack([nx_, ny_]))
        log(f'  network {ctx.area}: {n} edges ({dra_n} road atlas), {self.N} nodes, car {int(self.car.sum())}, '
            f'parkable {int(self.parkable.sum())}, atv only {int(((self.mode == 1) & self.atv_ok).sum())}, '
            f'closed {int(self.closed.sum())} in {time.time() - t0:.0f}s')

    def matrix(self, mask):
        from scipy.sparse import coo_matrix
        u, v, w = self.u[mask], self.v[mask], self.length[mask]
        a = np.minimum(u, v)
        b = np.maximum(u, v)
        o = np.lexsort((w, b, a))
        a, b, w = a[o], b[o], w[o]
        first = np.ones(len(a), bool)
        first[1:] = (a[1:] != a[:-1]) | (b[1:] != b[:-1])
        a, b, w = a[first], b[first], np.maximum(w[first], 0.01)
        keep = a != b
        a, b, w = a[keep], b[keep], w[keep]
        return coo_matrix((np.r_[w, w], (np.r_[a, b], np.r_[b, a])), shape=(self.N, self.N)).tocsr()

    def multi(self, mask, sources, limit=np.inf):
        from scipy.sparse.csgraph import dijkstra
        M = self.matrix(mask)
        sources = np.unique(np.asarray(sources, dtype=np.int64))
        if len(sources) == 0:
            return np.full(self.N, np.inf), np.full(self.N, -9999), np.full(self.N, -1)
        d, pred, src = dijkstra(M, directed=False, indices=sources, min_only=True, return_predecessors=True, limit=limit)
        return d, pred, src

    def path_nodes(self, pred, node):
        out = [node]
        seen = 0
        while pred[out[-1]] >= 0 and seen < 100000:
            out.append(pred[out[-1]])
            seen += 1
        return out[::-1]

    def path_edges(self, nodes):
        es = []
        for a, b in zip(nodes[:-1], nodes[1:]):
            e = self.edge_key.get((min(a, b), max(a, b)))
            if e is not None:
                es.append(e)
        return es

    def path_line(self, nodes):
        es = self.path_edges(nodes)
        if not es:
            return None
        return shapely.line_merge(shapely.union_all(self.geoms[es]))

    def names_along(self, edges, min_len=300):
        """Ordered road names along a path, consecutive repeats removed, short pieces skipped."""
        out = []
        acc = {}
        for e in edges:
            nm = road_label(self.props[e])
            if not nm:
                continue
            acc[nm] = acc.get(nm, 0) + self.length[e]
            if out and out[-1] == nm:
                continue
            out.append(nm)
        res = []
        for nm in out:
            if acc.get(nm, 0) >= min_len and nm not in res:
                res.append(nm)
        return res


# ======================================================================================
# Area context: all inputs for one area in Albers, rasters at 100 m, network
# ======================================================================================
CAT_CODES = {1: 'drive', 2: 'atv', 3: 'walk', 4: 'backcountry'}


class AreaContext:
    def __init__(self, cache, area):
        t0 = time.time()
        self.cache = cache
        self.area = area
        self.box = AREAS[area]['box']
        self.ca = clean_area(cache, area)
        bc = clean_bc(cache)
        self.grid = Grid(area)
        G = self.grid
        big = self.grid.poly.buffer(15000)

        def sub(k):
            g, p, m = bc[k]
            gg, pp = subset_box(g, p, big)
            return gg, pp
        self.mu = sub('mu')
        self.parks = sub('parks')
        self.reserves = sub('reserves')
        self.cities = sub('municipalities')
        self.mvpr = sub('mvpr_areas')
        self.mvpr_routes = sub('mvpr_routes')
        self.wma = sub('wma')
        self.leh = sub('leh')
        mg, mp = self.mvpr
        self.closed_mv_idx = [i for i, x in enumerate(mp) if x['kind'] in ('mv_closed', 'mv_hunting')]
        self.atv_closed_idx = [i for i, x in enumerate(mp) if x['kind'] == 'atv']
        self.closed_mv_polys = mg[self.closed_mv_idx]
        self.atv_closed_polys = mg[self.atv_closed_idx]
        self.no_shoot_idx = [i for i, x in enumerate(mp) if re.search(r'no (shooting|hunting)', ' '.join(str(v) for v in x.values()), re.I)]
        self.private = self.ca['private'][0]
        self.dem = DEM(cache, area)
        # special no hunting and single projectile zones along listed highways (synopsis, highway rules)
        self.no_hunt_text = set()
        self.no_hunt_zones, self.single_proj_zones = self._highway_zones()
        self.vaseux = self._named_lake_buffer('Vaseux Lake', 2000) if area == 'C' else None
        # Swan Lake north of Vernon (MU 8-22): No Shooting or Hunting Area, the lake and all its marsh (synopsis Map J17).
        # Edge not in the data: 500 m buffer around the lake (my pick).
        self.swan = self._named_lake_buffer('Swan Lake', 500, near=(-119.27, 50.30)) if area == 'D' else None
        # Region 4 synopsis No Hunting and No Shooting areas, shot only areas and access limits (area F)
        self.r4_zones = self._region4_zones() if area in R4_AREAS else []
        # Region 3 Shuswap Lake maps C8, C9 and C10 (area G): flagged by legal_flags, excluded zones join notarget_extra
        self.r3_zones = self._shuswap_zones() if area in R3_SHUSWAP_AREAS else []
        self.shot_only = [z for z in self.r4_zones if z.get('shotOnly')]
        nt = [self.no_hunt_zones] if self.no_hunt_zones is not None else []
        nt += [z['geom'] for z in self.r4_zones + self.r3_zones if z.get('exclude')]
        if self.vaseux is not None:
            nt.append(self.vaseux)
        if self.swan is not None:
            nt.append(self.swan)
        nt += list(mg[self.no_shoot_idx])
        self.notarget_extra = shapely.union_all(nt) if nt else None
        self.no_park_polys = np.concatenate([self.parks[0], self.reserves[0], self.cities[0], self.closed_mv_polys])
        self.net = Network(self)
        self._trees = {}
        self.build_rasters()
        log(f'  context {area} ready in {time.time() - t0:.0f}s')

    # ---------------------------------------------------------------- helpers
    def tree(self, key, geoms):
        if key not in self._trees:
            self._trees[key] = STRtree(np.asarray(geoms, dtype=object))
        return self._trees[key]

    def inside(self, polys, pts):
        polys = np.asarray(polys, dtype=object)
        out = np.zeros(len(pts), bool)
        if len(polys) == 0 or len(pts) == 0:
            return out
        t = STRtree(polys)
        q = t.query(np.asarray(pts, dtype=object), predicate='intersects')
        out[np.unique(q[0])] = True
        return out

    def _highway_zones(self):
        g, p, _ = self.ca['dra']
        nh, sp = [], []
        for gi, pi in zip(g, p):
            nums = hwy_numbers(pi.get('hwy'))
            if not nums:
                continue
            c = shapely.centroid(gi)
            lon, lat = xy_to_lonlat(c.x, c.y)
            lon, lat = float(lon), float(lat)
            # Hwy 3 between Hope and Manning Park: no hunting within 400 m of the road allowance
            if '3' in nums and self.area == 'B' and lon > -121.45:
                nh.append(gi)
                self.no_hunt_text.add('Hwy 3 between Hope and Manning Park')
            # Hwy 97C (Okanagan Connector) between Hwy 97 near Peachland and Hwy 5 near Aspen Grove: no hunting or shooting 400 m
            # (synopsis page 10). The 97C west and north of Merritt (to Logan Lake and Ashcroft) is not on the list.
            if '97C' in nums and '5' not in nums and lon > -120.66 and lat < 50.0:
                nh.append(gi)
                self.no_hunt_text.add('Hwy 97C (Okanagan Connector) between Aspen Grove and Peachland')
            # Region 4 Map D14: Hwy 3 No Hunting/Shooting Area, 400 m each side from Loop Bridge to the Alexander Creek bridge
            # (MU 4-23, east of Sparwood). Ends from hwy3_d14_range (estimate).
            if '3' in nums and self.area in R4_AREAS:
                r = self._hwy3_d14_range()
                if r and r[0] - 0.01 <= lon <= r[1] + 0.01 and lat > 49.6:
                    nh.append(gi)
                    self.no_hunt_text.add('Hwy 3 from Loop Bridge to the Alexander Creek bridge (Map D14)')
            # Hwy 5 (Coquihalla) between Hope and the Hwy 1 and 5 junction at Kamloops: single projectile ban 400 m
            if '5' in nums and '1' not in nums and lat < 50.66:
                sp.append(gi)
        nhz = shapely.union_all(shapely.buffer(np.array(nh, dtype=object), 415)) if nh else None
        spz = shapely.union_all(shapely.buffer(np.array(sp, dtype=object), 415)) if sp else None
        return nhz, spz

    def _hwy3_d14_range(self):
        """Longitude range of the Map D14 strip. East end: the easternmost Hwy 3 crossing of Alexander Creek (FWA streams).
        West end: Loop Bridge is not in the data; assumption: the westernmost Hwy 3 bridge over Michel Creek east of Sparwood
        (lon -114.88), which errs on the side of a longer no hunting strip."""
        if hasattr(self, '_d14'):
            return self._d14
        self._d14 = None
        g, p, _ = self.ca['dra']
        h3 = [gi for gi, pi in zip(g, p) if '3' in hwy_numbers(pi.get('hwy'))]
        sg, sp_, _ = self.ca['streams']
        if not h3:
            return None
        h3u = shapely.union_all(h3)

        def cross(name):
            st = [sg[i] for i, x in enumerate(sp_) if (x['name'] or '') == name]
            if not st:
                return []
            x = shapely.intersection(h3u, shapely.union_all(st))
            return [float(xy_to_lonlat(*pt.coords[0])[0]) for pt in getattr(x, 'geoms', [x]) if not pt.is_empty and pt.geom_type == 'Point']
        ac = cross('Alexander Creek')
        mc = [lon for lon in cross('Michel Creek') if lon > -114.88]
        if not ac or not mc:
            return None
        self._d14 = (min(mc), max(ac))
        log(f'  Map D14 strip: Hwy 3 from lon {self._d14[0]:.3f} to {self._d14[1]:.3f} (estimate)')
        return self._d14

    def _region4_zones(self):
        """Region 4 synopsis map areas (pages 37, 40, 41) inside or near the area. Each: geom (Albers), exclude (targets left out),
        near (flag distance, m), text, cert, src. Edges come from the closure polygons, FWA water, road names or OpenStreetMap;
        where an edge is only an estimate the text says so."""
        Z = []
        mg, mp = self.mvpr
        def mv(name):
            idx = [i for i, x in enumerate(mp) if (x['name'] or '') == name]
            return shapely.union_all(mg[idx]) if idx else None
        def add(key, geom, text, cert, src, exclude=True, near=1500, **kw):
            if geom is None or geom.is_empty:
                log(f'  Region 4 zone {key}: no geometry, skipped')
                return
            Z.append(dict(key=key, geom=geom, text=text, cert=cert, src=src, exclude=exclude, near=near, **kw))
        syn = 'Synopsis Region 4'
        # D2 Elizabeth Lake: the Motor Vehicle Closed Area polygon of the same name, plus the lake
        el = mv('Elizabeth Lake')
        lk = self._named_lake_buffer('Elizabeth Lake', 100, near=(-115.79, 49.50))
        add('D2', shapely.union_all([g for g in (el, lk) if g is not None]) if (el is not None or lk is not None) else None,
            'Elizabeth Lake (Map D2): No Hunting, Shooting or Trapping Area and Motor Vehicle Closed Area (synopsis page 40, 99%). '
            'Edge from the closure polygon and the lake (estimate).', 99, syn + '; WAA_MVPR_AREAS_SP')
        # D23 Columbia Lake and River Wildlife Sanctuary: lake, marshes, sand and gravel bars
        parts = [g for g in (mv('Columbia Lake'), self._named_lake_buffer('Columbia Lake', 300, near=(-115.86, 50.23))) if g is not None]
        rg, rp, _ = self.ca['rivers']
        riv = [rg[i] for i, x in enumerate(rp) if (x['name'] or '') == 'Columbia River'
               and 50.26 < float(xy_to_lonlat(*shapely.centroid(rg[i]).coords[0])[1]) < 50.45]
        if riv:
            parts.append(shapely.union_all(shapely.buffer(np.array(riv, dtype=object), 200)))
        add('D23', shapely.union_all(parts) if parts else None,
            'Columbia Lake and River Wildlife Sanctuary (Map D23): No Shooting, Hunting or Trapping Area, all marshes, sand and gravel '
            'bars included (synopsis page 41, 99%). Edge not in this data: lake and river plus 200 to 300 m (my pick). VERIFY on the ground.',
            99, syn + '; FWA lakes and rivers', near=2000)
        # D9 Skookumchuck pulp mill
        g = load_osm(self.cache, 'skookumchuck_mill')
        add('D9', g.buffer(150) if g is not None else None,
            'Skookumchuck Pulp Mill No Shooting Area (Map D9, synopsis page 40, 99%). Mill outline from OpenStreetMap plus 150 m (estimate).',
            99, syn + '; OpenStreetMap')
        # D10 Wasa Slough Wildlife Sanctuary: GNS name if present, else Wasa village (estimate)
        ng, np_, _ = self.ca['names']
        ws = [ng[i] for i, x in enumerate(np_) if (x['name'] or '').lower() == 'wasa slough']
        if ws:
            add('D10', shapely.union_all(ws).buffer(800),
                'Wasa Slough Wildlife Sanctuary (Map D10): No Shooting, Hunting or Trapping Area (synopsis page 40, 99%). '
                'Edge not in this data: 800 m around the named slough (my pick). VERIFY on the ground.', 99, syn + '; BC Geographical Names', near=2500)
        else:
            g = load_osm(self.cache, 'wasa')
            add('D10', g.buffer(1500) if g is not None else None,
                'Wasa Slough Wildlife Sanctuary (Map D10) is at Wasa: No Shooting, Hunting or Trapping Area (synopsis page 40, 99%). '
                'Edge not in this data: 1.5 km around Wasa left out (my pick). VERIFY on the ground.', 99, syn + '; OpenStreetMap', near=3500)
        # D13 and D16 Elk Valley coal mines: private property, No Hunting/No Shooting and No Shooting Areas
        mines = [(k, n) for k, n in (('fording_river', 'Fording River'), ('greenhills', 'Greenhills'), ('line_creek', 'Line Creek'),
                                    ('elkview', 'Elkview'), ('coal_mountain', 'Coal Mountain'))]
        for k, n in mines:
            g = load_osm(self.cache, k)
            add('D16 ' + n, g.buffer(100) if g is not None else None,
                f'{n} coal mine (Maps D13 and D16): No Hunting/No Shooting and No Shooting Areas on private property; company '
                'permission before entry, maps at the gate houses (synopsis page 41, 99%). Mine outline from OpenStreetMap (estimate).',
                99, syn + '; OpenStreetMap', near=1000)
        # D19 Fairmont and D20 Windermere No Shooting Areas: around the communities (edge not in the data)
        for key, k, n, m in (('D19', 'fairmont', 'Fairmont', 'D19'), ('D20', 'windermere', 'Windermere', 'D20')):
            g = load_osm(self.cache, k)
            add(key, g.buffer(2000) if g is not None else None,
                f'{n} No Shooting Area (Map {m}, synopsis page 41, 99%). Edge not in this data: 2 km around {n} left out (my pick). '
                'VERIFY on the ground.', 99, syn + '; OpenStreetMap', near=4000)
        # D22 Radium No Shooting or Hunting Area
        g = load_osm(self.cache, 'radium')
        add('D22', g.buffer(1000) if g is not None else None,
            'Radium No Shooting or Hunting Area (Map D22, synopsis page 41, 99%). Edge not in this data: village limits plus 1 km '
            'left out (my pick). VERIFY on the ground.', 99, syn + '; OpenStreetMap', near=3000)
        # D11 Baynes Lake: access limits (not a hunting closure, so targets stay)
        g = load_osm(self.cache, 'baynes_village')
        add('D11', g.buffer(1500) if g is not None else None,
            'Baynes Lake area (Map D11, Lake Koocanusa shore lot): motorized use prohibited all year; public access prohibited 15 April to '
            '15 July except public beaches 1 and 2 (synopsis page 40, 99%). The lot edge is not in this data.', 99, syn + '; OpenStreetMap',
            exclude=False, near=3000)
        # D12 Sulphur Creek (MU 4-22): no public access beyond 3 m of Sulphur Creek Road up to 1,310 m
        mug, mup = self.mu
        m22 = [mug[i] for i, x in enumerate(mup) if x['MU'] == '4-22']
        sg, sp_, _ = self.ca['streams']
        sc = [sg[i] for i, x in enumerate(sp_) if (x['name'] or '') == 'Sulphur Creek']
        if m22 and sc:
            scg = shapely.intersection(shapely.union_all(sc), shapely.union_all(m22))
            add('D12', scg.buffer(1000) if not scg.is_empty else None,
                'Sulphur Creek (Map D12): from Sulphur Creek Bridge to Hartley Pass Road, no public access beyond 3 m of Sulphur Creek '
                'Road, up to 1,310 m elevation (synopsis page 40, 99%). Edge not in this data: 1 km around the creek left out (my pick).',
                99, syn + '; FWA streams', near=2500)
        # Whiteswan FSR No Shooting Area: 50 m each side of about 4.9 km of road (page 37)
        roads = []
        for key in ('dra', 'ften'):
            g, p, _ = self.ca[key]
            roads += [g[i] for i, x in enumerate(p) if 'whiteswan' in (x.get('name') or '').lower()]
        add('Whiteswan', shapely.union_all(shapely.buffer(np.array(roads, dtype=object), 65)) if roads else None,
            'Whiteswan FSR No Shooting Area: no firearms on or within 50 m of the road from Inlet Creek Campground to the White River '
            'bridge, and from the White Moscow junction to the Moscow and Home Basin Campground junction, about 4.9 km (synopsis page 37, 99%). '
            'Which stretch is not in this data: targets within 65 m of any Whiteswan road are left out (my pick).', 99,
            syn + '; road atlas', near=100, routeOnly=True)
        # D17 Canal Flats Firearms Using Shot Only Area, below the 1,067 m contour (edge around the village: estimate)
        cf = [i for i, x in enumerate(self.cities[1]) if 'Canal Flats' in (x['name'] or '')]
        if cf:
            add('D17', self.cities[0][cf[0]].buffer(3000),
                'Canal Flats Firearms Using Shot Only Area (Map D17), below the 1,067 m contour: shotgun with shot only, no rifle, slug or .22 '
                '(synopsis page 41, 99%). Edge not in this data: 3 km around the village below 1,067 m (my pick).', 99,
                syn + '; ABMS_MUNICIPALITIES_SP; AWS terrain tiles', exclude=False, near=0, shotOnly=1067)
        # D1 McDougall Wildlife Sanctuary: the McDougall Creek Motor Vehicle Closed Area polygon (my reading that they match)
        add('D1', mv('McDougall Creek'),
            'McDougall Wildlife Sanctuary (Map D1): No Shooting, Hunting or Trapping Area and Motor Vehicle Closed Area (synopsis page 40, 99%). '
            'Edge from the McDougall Creek closure polygon (my reading, 85%).', 99, syn + '; WAA_MVPR_AREAS_SP')
        box = self.grid.poly.buffer(5000)
        Z = [z for z in Z if shapely.intersects(z['geom'], box.buffer(z['near']))]
        log(f"  Region 4 zones in area {self.area}: {', '.join(z['key'] for z in Z)}")
        return Z

    def _shuswap_zones(self):
        """Region 3 synopsis Maps C8, C9 and C10 (page 35, all MU 3-26). Points from BC Geographical Names, water from FWA lakes.
        Where the legal line is not in the data the text says so and the edge is my pick."""
        Z = []
        syn = 'Synopsis Region 3'
        ng, np_, _ = self.ca['names']
        def name_pt(n):
            idx = [i for i, x in enumerate(np_) if (x['name'] or '').lower() == n.lower()]
            return shapely.centroid(shapely.union_all(ng[idx])) if idx else None
        lg, lp, _ = self.ca['lakes']
        def lake(*names):
            idx = [i for i, x in enumerate(lp) if (x['name'] or '') in names]
            return shapely.union_all(lg[idx]) if idx else None
        def add(key, geom, text, cert, src, exclude=True, near=1500):
            if geom is None or geom.is_empty:
                log(f'  Region 3 zone {key}: no geometry, skipped')
                return
            Z.append(dict(key=key, geom=geom, text=text, cert=cert, src=src, exclude=exclude, near=near))
        water = lake('Shuswap Lake', 'Mara Lake')
        # C9 Sicamous: waters of Mara and Shuswap lakes east of Murdock Point to Semaphore Point and north of an east west line
        # through the mouth of Sicamous Creek
        mp_, sp_ = name_pt('Murdock Point'), name_pt('Semaphore Point')
        sg, spp, _ = self.ca['streams']
        sc = [sg[i] for i, x in enumerate(spp) if (x['name'] or '') == 'Sicamous Creek']
        if water is not None and sp_ is not None and sc:
            cc = shapely.get_coordinates(shapely.union_all(sc))
            dd = shapely.distance(water, shapely.points(cc))
            mouth_y = float(cc[int(np.argmin(dd)), 1])   # creek vertex nearest the lake water (estimate of the mouth)
            far = 60000
            if mp_ is not None:
                ax, ay, bx, by = mp_.x, mp_.y, sp_.x, sp_.y
                how = 'the named points'
            else:   # Murdock Point is not in BC Geographical Names: north south line through Semaphore Point (estimate)
                ax, ay, bx, by = sp_.x, sp_.y, sp_.x, sp_.y + 1000
                how = 'a north south line through Semaphore Point (Murdock Point is not in BC Geographical Names)'
            dx, dy = bx - ax, by - ay
            L = (dx * dx + dy * dy) ** 0.5
            ux, uy = dx / L, dy / L
            nx_, ny_ = uy, -ux
            if nx_ < 0:
                nx_, ny_ = -nx_, -ny_
            half = shapely.Polygon([(ax - ux * far, ay - uy * far), (ax + ux * far, ay + uy * far),
                                    (ax + ux * far + nx_ * far, ay + uy * far + ny_ * far), (ax - ux * far + nx_ * far, ay - uy * far + ny_ * far)])
            north = shapely.box(ax - far, mouth_y, ax + far, mouth_y + far)
            near_sic = shapely.Point(sp_.x, sp_.y).buffer(15000)   # the Sicamous end of the lakes only
            g = shapely.intersection(shapely.intersection(shapely.intersection(water, half), north), near_sic)
            add('C9', g.buffer(100) if not g.is_empty else None,
                'Sicamous (Map C9): No Shooting or Hunting Area on all waters of Mara and Shuswap lakes east of a line from Murdock Point '
                'to Semaphore Point and north of an east west line through the mouth of Sicamous Creek (synopsis page 35, 99%). '
                f'Drawn from {how}, the creek and FWA lake outlines, within 15 km of Sicamous, plus 100 m (estimate). VERIFY on the ground.', 99,
                syn + '; BC Geographical Names; FWA lakes', near=2000)
        # C10 Salmon Arm: waters of Shuswap Lake southeast of a line from the Salmon Arm Wharf to a white marker (not in the data)
        cg, cp = self.cities
        sa = [cg[i] for i, x in enumerate(cp) if 'Salmon Arm' in (x['name'] or '')]
        if water is not None and sa:
            g = shapely.intersection(water, shapely.union_all(sa).buffer(1500))
            add('C10', g.buffer(100) if not g.is_empty else None,
                'Salmon Arm (Map C10): No Shooting or Hunting Area on the waters of Shuswap Lake southeast of a line from the end of the '
                'Salmon Arm Wharf to a white marker (synopsis page 35, 99%). The wharf line is not in this data: lake water within 1.5 km '
                'of the city limits is left out (my pick). VERIFY on the ground.', 99, syn + '; ABMS_MUNICIPALITIES_SP; FWA lakes', near=2500)
        # C8 Blind Bay No Shooting Area: from Reedman Point to the Sorrento Eagle Bay Road (land and shore, legal line not in the data)
        rp_ = name_pt('Reedman Point')
        pts = []
        if rp_ is not None:   # 'Blind Bay' also names a bay on Upper Arrow Lake: keep only names within 5 km of Reedman Point
            pts = [rp_] + [shapely.centroid(ng[i]) for i, x in enumerate(np_) if (x['name'] or '') == 'Blind Bay'
                           and shapely.distance(ng[i], rp_) < 5000]
        if pts:
            add('C8', shapely.union_all([q.buffer(1500) for q in pts]),
                'Blind Bay (Map C8): No Shooting Area from Reedman Point to the Sorrento Eagle Bay Road; bows allowed unless posted '
                '(synopsis pages 10 and 35, 99%). The legal line is not in this data: 1.5 km around Reedman Point and Blind Bay is left '
                'out (my pick). VERIFY on the ground.', 99, syn + '; BC Geographical Names', near=3000)
        # Roderick Haig-Brown Recreation Area (MU 3-37, near Chase): no hunting south of the Squilax Anglemont Road and downstream
        # of the Adams River bridge. Bridge = where that road meets the Adams River; zone = park land south of the bridge (estimate)
        pg, pp = self.parks
        hb = [pg[i] for i, x in enumerate(pp) if re.search(r'haig|tsutswecw', x['name'] or '', re.I)]
        dg, dp, _ = self.ca['dra']
        rd = [dg[i] for i, x in enumerate(dp) if 'squilax' in (x['name'] or '').lower()]
        ar = [sg[i] for i, x in enumerate(spp) if (x['name'] or '') == 'Adams River']
        if hb and rd and ar:
            park = shapely.union_all(hb)
            br = shapely.intersection(shapely.union_all(rd), shapely.union_all(ar).buffer(150))
            if not br.is_empty and shapely.intersects(br, park.buffer(500)):
                by = shapely.centroid(br).y
                b0 = park.bounds
                g = shapely.intersection(park, shapely.box(b0[0] - 10, b0[1] - 10, b0[2] + 10, by))
                add('HB', g.buffer(100) if not g.is_empty else None,
                    'Roderick Haig Brown Recreation Area, now Tsutswecw Park (MU 3-37, near Chase): no hunting south of the Squilax Anglemont Road and '
                    'downstream of the Adams River bridge (synopsis Region 3, 99%). Drawn as park land south of the bridge plus 100 m '
                    '(estimate). VERIFY on the ground.', 99, syn + '; TA_PARK_ECORES_PA_SVW; DRA; FWA streams', near=2000)
        box = self.grid.poly.buffer(5000)
        Z = [z for z in Z if shapely.intersects(z['geom'], box.buffer(z['near']))]
        log(f"  Region 3 Shuswap zones in area {self.area}: {', '.join(z['key'] for z in Z)}")
        return Z

    def shot_only_at(self, x, y, elev=None):
        """Shot only zone (Region 4 Map D17) at this point, below its elevation contour."""
        pt = shapely.points(x, y)
        for z in self.shot_only:
            if shapely.intersects(z['geom'], pt):
                el = elev if elev is not None else float(self.dem.sample_xy('elev', x, y)[0])
                if el < z['shotOnly']:
                    return z
        return None

    def _named_lake_buffer(self, name, dist, near=None):
        g, p, _ = self.ca['lakes']
        idx = [i for i, x in enumerate(p) if (x['name'] or '') == name]
        if near and idx:
            nx, ny = lonlat_to_xy(*near)
            idx = [i for i in idx if shapely.distance(g[i], shapely.Point(float(nx), float(ny))) < 5000]
        if not idx:
            return None
        return shapely.union_all(shapely.buffer(g[idx], dist))

    # ---------------------------------------------------------------- rasters
    def build_rasters(self):
        t0 = time.time()
        G = self.grid
        ca = self.ca
        R = {}
        R['private'] = G.burn_polys(self.private) > 0
        R['park'] = G.burn_polys(self.parks[0]) > 0
        R['reserve'] = G.burn_polys(self.reserves[0]) > 0
        R['city'] = G.burn_polys(self.cities[0]) > 0
        R['closed'] = G.burn_polys(self.closed_mv_polys) > 0
        R['atvclosed'] = G.burn_polys(self.atv_closed_polys) > 0
        R['lake'] = G.burn_polys(ca['lakes'][0]) > 0
        R['river'] = G.burn_polys(ca['rivers'][0]) > 0
        wg, wp, _ = ca['wetlands']
        R['wetland'] = G.burn_polys(wg) > 0
        R['notarget'] = (G.burn_polys([self.notarget_extra]) > 0) if self.notarget_extra is not None else np.zeros((G.ny, G.nx), bool)
        R['singleproj'] = (G.burn_polys([self.single_proj_zones]) > 0) if self.single_proj_zones is not None else np.zeros((G.ny, G.nx), bool)
        so_cells = [(G.burn_polys([z['geom']]) > 0, z['shotOnly']) for z in self.shot_only]
        bg, bp, _ = ca['bec']
        zones = sorted({x['zone'] for x in bp if x['zone']})
        self.zone_codes = {z: i + 1 for i, z in enumerate(zones)}
        self.zone_names = {i + 1: z for i, z in enumerate(zones)}
        R['bec'] = G.burn_polys(bg, values=[self.zone_codes.get(x['zone'], 0) for x in bp])
        ug, up, _ = ca['uwr']
        for sp in ('mule_deer', 'wt_deer', 'moose', 'elk', 'sheep'):
            idx = [i for i, x in enumerate(up) if sp in uwr_sps(x)]
            R['uwr_' + sp] = (G.burn_polys(ug[idx]) > 0) if idx else np.zeros((G.ny, G.nx), bool)
        cg, cp, _ = ca['cutblocks']
        young = [i for i, x in enumerate(cp) if CUT_AGE[0] <= x['age'] <= CUT_AGE[1]]
        R['cut_young'] = G.burn_polys(cg[young]) > 0
        fg, fp, _ = ca['burns']
        rec = [i for i, x in enumerate(fp) if BURN_YEARS[0] <= x['year'] <= BURN_YEARS[1] and (x.get('ha') or 0) >= BURN_MIN_HA]
        R['burn'] = G.burn_polys(fg[rec]) > 0
        net = self.net
        R['car_park'] = G.burn_lines(net.geoms[net.parkable]) > 0
        R['paved'] = G.burn_lines(net.geoms[net.parkable & net.paved]) > 0
        R['atvzone'] = G.burn_lines(net.geoms[self.atv_zone_edges()]) > 0
        sg, sp_, _ = ca['streams']
        R['stream'] = G.burn_lines(sg) > 0
        rg, rp, _ = ca['rec_sites']
        R['rec'] = G.burn_points(rg)
        # elevation, slope, aspect, relief at cell centres
        lon, lat = G.lon.ravel(), G.lat.ravel()
        for k in ('elev', 'slope', 'relief'):
            R[k] = self.dem.sample(k, lon, lat).reshape(G.lon.shape).astype(np.float32)
        R['aspect'] = self.dem.sample('aspect', lon, lat, order=0).reshape(G.lon.shape).astype(np.float32)
        for m_, lim in so_cells:   # shot only areas below their contour (Region 4 Map D17)
            R['singleproj'] |= m_ & (R['elev'] < lim)
        # distances (m)
        D = {}
        for k in ('car_park', 'paved', 'atvzone', 'cut_young', 'burn', 'wetland', 'stream', 'rec', 'city', 'lake', 'river'):
            D[k] = G.dist(R[k])
        D['water'] = np.minimum(np.minimum(D['wetland'], D['stream']), np.minimum(D['lake'], D['river']))
        D['uwr_deer'] = G.dist(R['uwr_mule_deer'] | R['uwr_wt_deer'])
        for sp in ('mule_deer', 'wt_deer', 'moose', 'elk', 'sheep'):
            D['uwr_' + sp] = G.dist(R['uwr_' + sp])
        fields = R['private'] & ~R['city']
        D['fields'] = G.dist(fields)
        # wetland count within 2 km (centroids, square window: estimate)
        wc = G.burn_points(shapely.point_on_surface(wg)) if len(wg) else np.zeros((G.ny, G.nx), bool)
        R['wet_count2k'] = G.count_within(wc, 2000)
        big = [i for i, x in enumerate(wp) if x['ha'] >= 5]
        D['wetland_big'] = G.dist(G.burn_polys(wg[big]) > 0) if big else np.full((G.ny, G.nx), 1e9, np.float32)
        # city (under 30 minutes, estimate): within 25 km of a municipality named City of ...
        ci = [i for i, x in enumerate(self.cities[1]) if 'City of' in (x['name'] or '')]
        D['bigcity'] = G.dist(G.burn_polys(self.cities[0][ci]) > 0) if ci else np.full((G.ny, G.nx), 1e9, np.float32)
        self.R, self.D = R, D
        # eligibility and access category
        self.eligible = (G.inbox & ~R['private'] & ~R['park'] & ~R['reserve'] & ~R['city'] & ~R['lake'] & ~R['river']
                         & ~R['notarget'])
        cat = np.full((G.ny, G.nx), 3, np.int8)
        cat[D['car_park'] > 5000] = 4
        cat[(D['atvzone'] <= 300)] = 2
        cat[D['car_park'] <= 300] = 1
        self.cat = cat
        log(f'  rasters {self.area}: {G.nx}x{G.ny} cells, eligible {self.eligible.mean() * 100:.0f}% in {time.time() - t0:.0f}s')

    def atv_zone_edges(self):
        """ATV only roads and trails, open, 0 to 10 km ride from a truck parking point and 1 km or more from pavement."""
        net = self.net
        if not hasattr(self, '_atvz'):
            srcs = np.unique(np.concatenate([net.u[net.parkable], net.v[net.parkable]]))
            only = (net.mode == 1) & net.atv_ok
            dr, pr, sr = net.multi(only, srcs, limit=12000)
            psrc = np.unique(np.concatenate([net.u[net.parkable & net.paved], net.v[net.parkable & net.paved]]))
            dp, _, _ = net.multi(net.car | net.atv_ok, psrc, limit=60000)
            far = np.maximum(dr[net.u], dr[net.v])
            near = np.minimum(dr[net.u], dr[net.v])
            near_pave = np.minimum(dp[net.u], dp[net.v])
            self._atvz = (only & np.isfinite(far) & (far <= 10000) & (near >= 800) & np.isfinite(near_pave)
                          & (near_pave >= 1000))
            self.ride = (dr, pr, sr)
            self.pave_dist = dp
        return self._atvz


# ======================================================================================
# Spot helpers: text, names, seasons, flags
# ======================================================================================
BANNER = 'Study aid only. The official regulations are the law.'
SYNOPSIS = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028'
SPECIES_LABEL = {'deer': 'deer', 'moose': 'moose', 'elk': 'elk', 'bear': 'black bear', 'grouse': 'grouse',
                 'duck': 'ducks', 'quail': 'California quail', 'sheep': 'bighorn sheep', 'turkey': 'wild turkey'}
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']


def mu_range(a, b):
    r, x = a.split('-')
    _, y = b.split('-')
    return [f'{r}-{i}' for i in range(int(x), int(y) + 1)]


# Season rows from data/regs.json: key, region, MUs covered (None = whole region or BC), months (from the row text)
SEASON_ROWS = {
    'deer': [('r3mule', '3', ['3-27', '3-28'], [9, 10, 11, 12], ['3-27 and 3-28', '1 to 31 Oct']),
             ('r3wt', '3', ['3-27', '3-28'], [9, 10, 11, 12], ['10 Sept to 10 Dec']),
             ('r3bag', '3', None, None, ['Mule deer 1'])],
    'moose': [('r3moose', '3', ['3-27', '3-28'], [11], ['1 to 15 Nov'])],
    'elk': [('r3elk', '3', None, [], ['LEH draw only'])],
    'bear': [('r3bear', '3', None, [4, 5, 6, 9, 10, 11], ['1 Sept to 30 Nov'])],
    'grouse': [('r3grouse', '3', None, [9, 10, 11], ['10 Sept to 30 Nov'])],
    'duck': [('ducksR3', '3', mu_range('3-12', '3-20') + mu_range('3-26', '3-44'), [9, 10, 11, 12], ['8 Sept to 23 Dec']),
             ('duckbag', None, None, None, ['8 ducks a day']), ('plug', None, None, None, ['3 shells'])],
    'quail': [('r8quail', '8', mu_range('8-1', '8-15') + mu_range('8-21', '8-26'), [10, 11], ['1 Oct to 30 Nov']),
              ('r3quail', '3', None, [], ['No quail season in Region 3'])],
    'sheep': [],
}
REGS = {}
REGS_WARN = []


def load_regs():
    if REGS:
        return REGS
    d = json.load(open(ROOT / 'data' / 'regs.json'))
    for it in d.get('items', []):
        REGS[it['key']] = it
    REGS['_meta'] = {'edition': d.get('edition'), 'lastChecked': d.get('lastChecked')}
    for sp, rows in SEASON_ROWS.items():
        for key, reg, mus, months, must in rows:
            it = REGS.get(key)
            if not it:
                REGS_WARN.append(f'regs.json has no row {key} ({sp})')
                continue
            for s in must:
                if s.lower() not in (it.get('value') or '').lower():
                    REGS_WARN.append(f'regs.json row {key} no longer says "{s}": months for {sp} need a check (VERIFY)')
    return REGS


def season_rows(species, region, mu):
    """Rows that apply to this species, region and MU. Returns (keys, months, note)."""
    load_regs()
    keys, months, note = [], set(), None
    rows = SEASON_ROWS.get(species, [])
    region_rows = [r for r in rows if r[1] in (None, region)]
    for key, reg, mus, mo, _ in region_rows:
        if key not in REGS:
            continue
        if mus is not None and mu not in mus:
            continue
        keys.append(key)
        if mo:
            months.update(mo)
    has_season = any(r[1] == region and r[3] is not None for r in rows if r[0] in keys)
    if not has_season:
        if any(r[1] == region and r[2] is not None for r in rows):
            note = f'No season row for MU {mu} in data/regs.json yet. VERIFY in the synopsis season table for Region {region}.'
        else:
            note = f'No {SPECIES_LABEL.get(species, species)} season row for Region {region} in data/regs.json yet. VERIFY in the synopsis.'
    return keys, sorted(months), note


# Season rows from data/seasons/region<R>.json (synopsis season tables, every MU listed). First choice for a spot.
# Ducks and geese come from data/seasons/migratory.json (federal districts, by MU), see mig_rows.
SEASON_SP = {'deer': ['mule deer', 'white tailed deer'], 'moose': ['moose'], 'elk': ['elk'], 'bear': ['black bear'],
             'grouse': ['grouse', 'sharp tailed grouse'], 'quail': ['quail'], 'chukar': ['chukar'], 'sheep': ['bighorn sheep'],
             'goat': ['mountain goat'], 'pheasant': ['pheasant'], 'turkey': ['turkey']}
SEASONS = {}


def load_seasons():
    if not SEASONS:
        SEASONS['_files'] = []
        for p in sorted((ROOT / 'data' / 'seasons').glob('region*.json')):
            d = json.load(open(p))
            SEASONS[str(d['region'])] = d
            SEASONS['_files'].append({'region': d['region'], 'edition': d.get('edition'), 'rows': len(d.get('rows', [])),
                                      'checked': d.get('checked')})
    return SEASONS


MIG = {}
MIG_SP = {'duck': ['ducks', 'canada and cackling geese', 'white fronted geese', 'snow and ross geese', 'coot', 'snipe'],
          'goose': ['canada and cackling geese', 'white fronted geese', 'snow and ross geese', 'brant']}
MIG_MAIN = {'duck': 'ducks', 'goose': 'canada and cackling geese'}
MIG_LABEL = {'snow and ross geese': "snow and Ross's geese", 'coot': 'coots'}


def load_mig():
    if not MIG:
        p = ROOT / 'data' / 'seasons' / 'migratory.json'
        MIG.update(json.load(open(p)) if p.exists() else {'rows': []})
    return MIG


def mig_rows(tag, mu):
    """Federal rows (Migratory Birds Regulations, 2022) for a duck or goose spot, by MU. None when the MU is in no list."""
    d = load_mig()
    names = MIG_SP.get(tag)
    if not names or not mu or not d.get('rows'):
        return None
    law = 'Migratory Birds Regulations, 2022, Schedule 3, Part 10'
    nd = d.get('noDistrict') or {}
    if mu in nd.get('mus', []):
        return [{'sp': MIG_MAIN[tag], 'cls': '', 'dates': 'No open season', 'notes': nd['notes'], 'src': law,
                 'cert': nd['cert'], 'none': True}]
    dist = next((k for k, v in d.get('districts', {}).items() if mu in v['mus']), None)
    if not dist:
        return None
    out = []
    for n in names:
        for r in d['rows']:
            if r['district'] != dist or r['species'] != n or ('mus' in r and mu not in r['mus']):
                continue
            o = {'sp': MIG_LABEL.get(n, n), 'cls': '', 'open': r['open'], 'close': r['close'],
                 'dates': f"{md_text(r['open'])} to {md_text(r['close'])}" + (f" ({r['season']})" if r.get('season') else ''),
                 'limit': f"{r['daily']} a day, {r['possession']} in possession", 'notes': f"District {dist}. {r.get('notes') or ''}".strip(),
                 'src': f"{law}, {r['item'].replace('Table 1, ', 'Table 1 ')}", 'cert': r['cert'], 'months': r['months']}
            if n != MIG_MAIN[tag]:
                o['side'] = True
            out.append(o)
    return out or None


def md_text(md):
    m, d = md.split('-')
    return f'{MONTHS[int(m) - 1]} {int(d)}'


def file_rows(tag, region, mu):
    """Rows for one species tag in one MU from data/seasons. None when the region has no file or the tag is not covered."""
    d = load_seasons().get(str(region)) if region else None
    names = SEASON_SP.get(tag)
    if not d or not names or not mu:
        return None
    out = []
    for c in d.get('closedMus', []):
        if c['mu'] == mu:
            return [{'sp': SPECIES_LABEL.get(tag, tag), 'cls': '', 'dates': 'No hunting', 'notes': c['notes'],
                     'page': c['page'], 'cert': c['cert'], 'none': True}]
    nr = d.get('noRow') or {}
    for n in names:
        rows = [r for r in d['rows'] if r['species'] == n]
        mine = [r for r in rows if mu in r['mus']]
        for r in mine:
            # the Region 4 CWD note is repeated on rows that also cover MUs outside the zone: the spot's own CWD flag says it instead
            nt = re.sub(r';?\s*CWD Management Zone MUs: mandatory head submission and carcass transport rules \(pages 15, 37\)\.?', '',
                        r.get('notes') or '').strip(' ;.')
            o = {'sp': n, 'cls': r.get('class') or '', 'open': r['open'], 'close': r['close'],
                 'dates': 'No closed season' if r.get('allYear') else f"{md_text(r['open'])} to {md_text(r['close'])}",
                 'notes': nt, 'page': r['page'], 'cert': r['cert'], 'months': r['months']}
            if re.search(r'youth|private land only|Map D27', o['notes'], re.I):
                o['limited'] = True
            out.append(o)
        if mine:
            for l in d.get('leh', []):
                if l['species'] == n:
                    out.append({'sp': n, 'cls': l['class'], 'dates': 'LEH draw only', 'notes': 'LEH (Limited Entry Hunting): '
                                'draw only, not a general open season', 'page': l['page'], 'cert': l['cert'], 'leh': True})
        elif n in nr.get('species', []):
            out.append({'sp': n, 'cls': '', 'dates': 'No general open season', 'notes': nr.get('notes', ''),
                        'page': nr['page'], 'cert': nr['cert'], 'none': True})
        elif rows:
            out.append({'sp': n, 'cls': '', 'dates': 'No general open season', 'cert': 95, 'page': rows[0]['page'], 'none': True,
                        'notes': f"MU {mu} is not listed in the Region {region} {n} rows (my reading of the table)."})
    return out or None


def spot_seasons(s):
    """Season rows for every species tag of a spot: data/seasons first, then data/regs.json, then VERIFY."""
    keys, notes, months, rows = [], {}, [], []
    s.pop('seasonNote', None)
    for t in s['species']:
        fr = mig_rows(t, s.get('mu')) if t in MIG_SP else file_rows(t, s.get('region'), s.get('mu'))
        if fr:
            for r in fr:
                r['tag'] = t
            rows += fr
            if t == s['sp']:
                months = sorted({m for r in fr if not r.get('limited') and not r.get('side') for m in r.get('months', [])})
            continue
        k, mo, note = season_rows(t, s.get('region'), s.get('mu'))
        keys += [kk for kk in k if kk not in keys]
        if t == s['sp']:
            months = mo
            if note:
                s['seasonNote'] = note
        if note:
            notes[t] = note
    s['seasons'], s['seasonNotes'], s['months'], s['seasonRows'] = keys, notes, months, rows


def fmt_dist(m):
    if m < 950:
        return f'{int(round(m / 10.0) * 10)} m'
    if m < 9950:
        return f'{m / 1000:.1f} km'
    return f'{m / 1000:.0f} km'


def fmt_int(v):
    return f'{int(round(v)):,}'


def compass8(az):
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][int(((az % 360) + 22.5) // 45) % 8]


def bearing_dist(x0, y0, x1, y1):
    lon, lat = xy_to_lonlat([x0, x1], [y0, y1])
    az, _, d = GEOD.inv(lon[0], lat[0], lon[1], lat[1])
    return az % 360, d


def aspect_word(a, slope):
    if slope < 5:
        return 'flat'
    return compass8(a) + ' facing'


def ll(x, y):
    lon, lat = xy_to_lonlat(x, y)
    return round(float(lon), 5), round(float(lat), 5)


def links(lat, lon, plat, plon, name):
    return {'gmaps': f'https://www.google.com/maps/search/?api=1&query={lat},{lon}',
            'gdir': f'https://www.google.com/maps/dir/?api=1&destination={plat},{plon}',
            'apple': f'https://maps.apple.com/?ll={plat},{plon}&q={urllib.parse.quote(name)}'}


def month_span(months):
    if not months:
        return ''
    ms = sorted(months)
    return ', '.join(MONTHS[m - 1] for m in ms)


# ---------------------------------------------------------------- style guard for generated text
_HY_OK = re.compile(r'https?://\S+|\b\d+-\d+[A-Z]?\b|\b[A-Z]-[A-Z]{4}\b')


def style_issues(text, allowed_names=()):
    """Hyphens and em dashes in generated prose (codes, URLs and official names are allowed)."""
    t = _HY_OK.sub('', text)
    for n in allowed_names:
        if n:
            t = t.replace(n, '')
    out = []
    if '—' in t or '–' in t:
        out.append('dash')
    if re.search(r'\w-\w', t):
        out.append('hyphen')
    return out


# ======================================================================================
# Candidate generation (grid species, ducks, grouse routes, camps) and selection
# ======================================================================================
def zone_mask(ctx, zones):
    codes = [ctx.zone_codes[z] for z in zones if z in ctx.zone_codes]
    return np.isin(ctx.R['bec'], codes) if codes else np.zeros(ctx.R['bec'].shape, bool)


def clip01(a):
    return np.clip(a, 0.0, 1.0)


def grid_scores(ctx, sp):
    """Score arrays for grid based species. Returns (S int, TB float in [0,1), extra mask)."""
    R, D = ctx.R, ctx.D
    w = W.get(sp, {})
    if sp == 'deer':
        S = (w['uwr'] * (D['uwr_deer'] <= 500) + w['cut'] * (D['cut_young'] <= 1000) + w['burn'] * (D['burn'] <= 1000)
             + w['bec_low'] * zone_mask(ctx, DEER_ZONES_LOW) + w['bec_ms'] * zone_mask(ctx, DEER_ZONES_MID)
             + w['aspect'] * ((R['slope'] >= 5) & (R['aspect'] >= 135) & (R['aspect'] <= 315))
             + w['fields'] * (D['fields'] <= 2000))
        TB = (0.3 * (1 - clip01(D['uwr_deer'] / 2000)) + 0.3 * (1 - clip01(D['cut_young'] / 1000))
              + 0.2 * (1 - clip01(D['burn'] / 1000)) + 0.19 * clip01(1 - np.abs(R['slope'] - 15) / 15))
        extra = ~zone_mask(ctx, {'IMA', 'CMA', 'BAFA'}) & ~R['singleproj']
    elif sp == 'moose':
        wet = (R['wet_count2k'] >= 3) | (D['wetland_big'] <= 500)
        cb = (D['cut_young'] <= 1000) | (D['burn'] <= 1000)
        S = w['wetland'] * wet + w['cut_or_burn'] * cb + w['uwr'] * (D['uwr_moose'] <= 500)
        TB = (0.4 * (1 - clip01(D['wetland'] / 1000)) + 0.3 * (1 - clip01(np.minimum(D['cut_young'], D['burn']) / 1000))
              + 0.29 * clip01(R['wet_count2k'] / 12))
        extra = ~zone_mask(ctx, {'BG', 'PP', 'CWH', 'CDF', 'MH', 'IMA', 'CMA', 'BAFA'}) & ~R['singleproj']
    elif sp == 'quail':
        S = (w['zone'] * zone_mask(ctx, QUAIL_ZONES) + w['farm'] * (D['fields'] <= 1000) + w['creek'] * (D['stream'] <= 1000)
             + w['draw'] * ((R['relief'] < -10) & (R['slope'] >= 5) & (R['slope'] <= 35)))
        TB = 0.5 * (1 - clip01(D['fields'] / 1000)) + 0.49 * (1 - clip01(D['stream'] / 1000))
        extra = R['elev'] < QUAIL_MAX_ELEV
    elif sp == 'elk':
        S = (w['uwr'] * (D['uwr_elk'] <= 500) + w['burn'] * (D['burn'] <= 1000) + w['cut'] * (D['cut_young'] <= 1000)
             + w['bec_low'] * zone_mask(ctx, ELK_ZONES_LOW) + w['bec_ms'] * zone_mask(ctx, DEER_ZONES_MID)
             + w['aspect'] * ((R['slope'] >= 5) & (R['aspect'] >= 135) & (R['aspect'] <= 315))
             + w['water'] * (D['water'] <= 500))
        TB = (0.35 * (1 - clip01(D['uwr_elk'] / 2000)) + 0.3 * (1 - clip01(D['burn'] / 1000))
              + 0.15 * (1 - clip01(D['cut_young'] / 1000)) + 0.19 * clip01(1 - np.abs(R['slope'] - 12) / 15))
        extra = ~zone_mask(ctx, {'IMA', 'CMA', 'BAFA'}) & ~R['singleproj']
    elif sp == 'turkey':
        S = w['zone'] * zone_mask(ctx, TURKEY_ZONES) + w['farm'] * (D['fields'] <= 1000) + w['creek'] * (D['stream'] <= 300)
        TB = 0.5 * (1 - clip01(D['fields'] / 1000)) + 0.49 * (1 - clip01(D['stream'] / 300))
        extra = R['elev'] < TURKEY_MAX_ELEV
    else:
        raise ValueError(sp)
    return S.astype(np.int16), TB.astype(np.float32), extra


def nms_select(xs, ys, order, radius, cap=None):
    """Greedy pick in order, keeping points at least radius apart. Returns kept indexes (into xs)."""
    cell = radius
    buckets = {}
    kept = []
    r2 = radius * radius
    for i in order:
        x, y = xs[i], ys[i]
        bx, by = int(x // cell), int(y // cell)
        ok = True
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in buckets.get((bx + dx, by + dy), ()):
                    if (xs[j] - x) ** 2 + (ys[j] - y) ** 2 < r2:
                        ok = False
                        break
                if not ok:
                    break
            if not ok:
                break
        if ok:
            kept.append(i)
            buckets.setdefault((bx, by), []).append(i)
            if cap and len(kept) >= cap:
                break
    return kept


def balanced_cap(kept, xs, ys, cap, tile=TILE_M):
    """Keep at most cap picks, spread over the area: round robin over tiles, best first within each tile.
    Stops one strong corner (say, a big winter range) from taking every slot. Rank order is kept in the output."""
    if len(kept) <= cap:
        return list(kept)
    tiles = {}
    for rank, i in enumerate(kept):
        tiles.setdefault((int(xs[i] // tile), int(ys[i] // tile)), []).append((rank, i))
    chosen, depth = [], 0
    while len(chosen) < cap:
        layer = [t[depth] for t in tiles.values() if len(t) > depth]
        if not layer:
            break
        layer.sort()
        chosen += layer[:cap - len(chosen)]
        depth += 1
    return [i for _, i in sorted(chosen)]


def grid_candidates(ctx, sp, stats):
    from scipy import ndimage
    G = ctx.grid
    S, TB, extra = grid_scores(ctx, sp)
    base = ctx.eligible & extra & (S >= 2)
    val = np.where(base, S + TB, -1.0)
    mx = ndimage.maximum_filter(val, size=5)
    cand = base & (val >= mx - 1e-6)
    rows, cols = np.nonzero(cand)
    out = []
    st = stats.setdefault(sp, {})
    for code, cat in CAT_CODES.items():
        m = ctx.cat[rows, cols] == code
        r, c = rows[m], cols[m]
        if len(r) == 0:
            continue
        s = S[r, c]
        tb = TB[r, c]
        order = np.lexsort((-tb, -s))
        xs, ys = G.cx[c], G.cy[r]
        kept = nms_select(xs, ys, order, max(SPACING_M, SELECT_RADIUS[cat]))
        strong = [i for i in kept if s[i] >= MIN_SCORE[sp]]
        weak = len(kept) - len(strong)
        capped = max(0, len(strong) - cap_for(ctx.area, sp))
        strong = balanced_cap(strong, xs, ys, cap_for(ctx.area, sp))
        st[cat] = {'candidates': len(kept), 'droppedWeak': weak, 'droppedCap': capped, 'kept': len(strong)}
        for i in strong:
            out.append({'sp': sp, 'cat': cat, 'x': float(xs[i]), 'y': float(ys[i]), 'score': int(s[i]), 'tb': float(tb[i]),
                        'r': int(r[i]), 'c': int(c[i])})
    return out


def duck_candidates(ctx, stats):
    """Lakes and wetlands scored per SPOTS.md. Target is a Crown shore point near the parking."""
    G, R, D = ctx.grid, ctx.R, ctx.D
    net = ctx.net
    lg, lp, _ = ctx.ca['lakes']
    wg, wp, _ = ctx.ca['wetlands']
    geoms = np.concatenate([lg, wg])
    props = [dict(x, kind='lake') for x in lp] + [dict(x, kind='wetland') for x in wp]
    rep = shapely.point_on_surface(geoms)
    rx, ry = shapely.get_x(rep), shapely.get_y(rep)
    rr, cc = G.rc(rx, ry)
    inbox = G.inbox[rr, cc]
    ha = np.array([x['ha'] for x in props])
    park_tree = ctx.tree('parkable', net.geoms[net.parkable])
    river_tree = ctx.tree('rivers', ctx.ca['rivers'][0])
    excl = R['park'][rr, cc] | R['city'][rr, cc] | R['notarget'][rr, cc] | R['reserve'][rr, cc]
    elev = R['elev'][rr, cc]
    sel = np.nonzero(inbox & ~excl & (ha >= 0.5) & (ha <= 3000))[0]
    out = []
    w = W['duck']
    st = stats.setdefault('duck', {})
    weak = 0
    for i in sel:
        g = geoms[i]
        j, d = park_tree.query_nearest(g, return_distance=True, max_distance=8000)
        if len(j) == 0:
            continue
        d = float(d[0])
        edge = net.geoms[net.parkable][j[0]]
        s = 0
        comp = []
        if 1 <= ha[i] <= 200 and d <= 500:
            s += w['size_road']
            comp.append('size_road')
        if R['wet_count2k'][rr[i], cc[i]] >= 3:
            s += w['complex']
            comp.append('complex')
        near_river = len(river_tree.query(g, predicate='dwithin', distance=150)) > 0
        if near_river:
            s += w['backwater']
            comp.append('backwater')
        if elev[i] < DUCK_MAX_ELEV:
            s += w['low']
            comp.append('low')
        if s < 2:
            continue
        if s < MIN_SCORE['duck']:
            weak += 1
            continue
        # shore point on Crown land nearest the road
        ring = shapely.boundary(g)
        L = ring.length
        k = max(8, min(400, int(L // 40)))
        pts = shapely.line_interpolate_point(ring, np.linspace(0, L, k, endpoint=False))
        pr, pc = G.rc(shapely.get_x(pts), shapely.get_y(pts))
        okp = ~R['private'][pr, pc] & ~R['park'][pr, pc] & ~R['reserve'][pr, pc] & ~R['city'][pr, pc] & ~R['notarget'][pr, pc]
        if not okp.any():
            continue
        okpts = pts[okp]
        dd = shapely.distance(okpts, edge)
        t = okpts[int(np.argmin(dd))]
        dpark = float(dd.min())
        cat = 'drive' if dpark <= 300 else ('walk' if dpark <= 5000 else 'backcountry')
        tb = 0.5 * (1 - min(dpark, 2000) / 2000) + 0.49 * (1 - min(abs(math.log10(max(ha[i], 0.5) / 20)), 2) / 2)
        out.append({'sp': 'duck', 'cat': cat, 'x': t.x, 'y': t.y, 'score': s, 'tb': tb, 'water': i, 'waterProps': props[i],
                    'waterGeom': g, 'comp': comp, 'nearRiver': near_river})
    # selection per category
    res = []
    for cat in ('drive', 'walk', 'backcountry'):
        cs = [c for c in out if c['cat'] == cat]
        order = sorted(range(len(cs)), key=lambda i: (-cs[i]['score'], -cs[i]['tb']))
        xs = [c['x'] for c in cs]
        ys = [c['y'] for c in cs]
        kept = nms_select(xs, ys, order, max(SPACING_M, 1000))
        capped = max(0, len(kept) - CAPS['duck'])
        kept = balanced_cap(kept, xs, ys, CAPS['duck'])
        st[cat] = {'candidates': len(cs), 'kept': len(kept), 'droppedCap': capped}
        res += [cs[i] for i in kept]
    st['droppedWeak'] = weak
    return res


def grouse_candidates(ctx, stats):
    """Forest road stretches 3 to 10 km through grouse zones with cutblock and riparian edges (roadside routes)."""
    from shapely import ops
    G, R, D = ctx.grid, ctx.R, ctx.D
    net = ctx.net
    zones = set(GROUSE_ZONES) | GROUSE_ZONES_EXTRA.get(ctx.area, set())
    zmask = zone_mask(ctx, zones)
    cg, cp, _ = ctx.ca['cutblocks']
    cut_idx = [i for i, x in enumerate(cp) if x['age'] <= 30]
    cut_tree = STRtree(cg[cut_idx]) if cut_idx else None
    wat = np.concatenate([ctx.ca['wetlands'][0], ctx.ca['lakes'][0], ctx.ca['streams'][0]])
    wat_tree = STRtree(wat) if len(wat) else None
    groups = {}
    for e in range(len(net.geoms)):
        p = net.props[e]
        if p['paved'] or p['cls'] in ('highway', 'freeway', 'arterial', 'collector', 'ramp', 'local', 'lane', 'alleyway', 'service'):
            if not (p['cls'] == 'local' and not p['paved']):
                continue
        if net.closed[e] or net.mode[e] == 2:
            cat = 'walk'
        elif net.parkable[e]:
            cat = 'drive'
        elif net.atv_ok[e] and net.mode[e] == 1:
            cat = 'atv'
        else:
            continue
        groups.setdefault((cat, p.get('name') or ''), []).append(e)
    pieces = []
    for (cat, name), es in groups.items():
        merged = shapely.line_merge(shapely.union_all(net.geoms[es]))
        for line in shapely.get_parts(merged):
            L = line.length
            if L < 3000:
                continue
            n = max(1, int(round(L / 5000)))
            step = L / n
            if step > 10000:
                n = int(math.ceil(L / 10000))
                step = L / n
            for k in range(n):
                seg = ops.substring(line, k * step, (k + 1) * step)
                if seg.length >= 3000:
                    pieces.append((cat, name, seg))
    st = stats.setdefault('grouse', {})
    w = W['grouse']
    out, weak = [], 0
    for cat, name, seg in pieces:
        L = seg.length
        pts = shapely.line_interpolate_point(seg, np.linspace(0, L, max(5, int(L // 100))))
        pr, pc = G.rc(shapely.get_x(pts), shapely.get_y(pts))
        if (~G.inbox[pr, pc]).mean() > 0.5:
            continue
        bad = R['private'][pr, pc] | R['park'][pr, pc] | R['reserve'][pr, pc] | R['city'][pr, pc] | R['notarget'][pr, pc]
        if bad.mean() > 0.2:
            continue
        s = 0
        comp = []
        zf = zmask[pr, pc].mean()
        if zf >= 0.6:
            s += w['zone']
            comp.append('zone')
        buf = seg.buffer(100)
        ncut = len(cut_tree.query(buf, predicate='intersects')) if cut_tree is not None else 0
        if ncut >= 2:
            s += w['cut_edge']
            comp.append('cut_edge')
        nwat = len(wat_tree.query(buf, predicate='intersects')) if wat_tree is not None else 0
        if nwat >= 2:
            s += w['riparian']
            comp.append('riparian')
        if s < 1:
            continue
        if s < MIN_SCORE['grouse']:
            weak += 1
            continue
        tb = min(0.99, 0.05 * ncut / (L / 1000) + 0.05 * nwat / (L / 1000))
        # start at the end nearest a parkable road
        a = shapely.get_point(seg, 0)
        b = shapely.get_point(seg, -1)
        pt = ctx.tree('parkable', net.geoms[net.parkable])
        ja, da = pt.query_nearest(a, return_distance=True)
        jb, db = pt.query_nearest(b, return_distance=True)
        if len(db) and len(da) and db[0] < da[0]:
            seg = shapely.reverse(seg)
            a = b
        out.append({'sp': 'grouse', 'cat': cat, 'x': a.x, 'y': a.y, 'score': s, 'tb': tb, 'route': seg, 'roadName': name,
                    'comp': comp, 'zoneFrac': float(zf), 'ncut': ncut, 'nwat': nwat})
    res = []
    for cat in ('drive', 'atv', 'walk'):
        cs = [c for c in out if c['cat'] == cat]
        order = sorted(range(len(cs)), key=lambda i: (-cs[i]['score'], -cs[i]['tb']))
        xs, ys = [c['x'] for c in cs], [c['y'] for c in cs]
        kept = nms_select(xs, ys, order, max(SPACING_M, 1500))
        capped = max(0, len(kept) - cap_for(ctx.area, 'grouse'))
        kept = balanced_cap(kept, xs, ys, cap_for(ctx.area, 'grouse'))
        st[cat] = {'candidates': len(cs), 'kept': len(kept), 'droppedCap': capped}
        res += [cs[i] for i in kept]
    st['droppedWeak'] = weak
    return res


def camp_candidates(ctx, hunt_spots, stats):
    """Official rec sites with campsites, plus Crown land camp candidates (flat, near water, by a road)."""
    G, R, D = ctx.grid, ctx.R, ctx.D
    st = stats.setdefault('camp', {})
    out = []
    rg, rp, _ = ctx.ca['rec_sites']
    for g, p in zip(rg, rp):
        r, c = G.rc(g.x, g.y)
        if not G.inbox[r, c]:
            continue
        camping = p['campsites'] > 0 or 'camping' in (p['activities'] or '').lower()
        if not camping:
            continue
        out.append({'sp': 'camp', 'cat': 'camp', 'x': g.x, 'y': g.y, 'score': SCORE_MAX['camp'], 'tb': 0.99, 'official': p,
                    'kind': 'rec site'})
    st['official'] = len(out)
    # Crown candidates
    hx = np.array([s['x'] for s in hunt_spots]) if hunt_spots else np.zeros(0)
    hy = np.array([s['y'] for s in hunt_spots]) if hunt_spots else np.zeros(0)
    pts = G.burn_points(shapely.points(hx, hy)) if len(hx) else np.zeros((G.ny, G.nx), bool)
    near = G.count_within(pts, 5000)
    w = W['camp']
    flat = R['slope'] < 5
    water = D['water'] <= 200
    named = np.zeros_like(flat)
    S = (w['flat'] * flat + w['water'] * water + w['quiet'] * ((D['paved'] >= 1000) & (D['fields'] >= 500))
         + w['spots_near'] * (near >= 5))
    ok = ctx.eligible & (D['car_park'] <= 150) & ~R['closed'] & flat & (D['water'] >= 30) & (D['rec'] >= 1500) & ~R['wetland']
    rows, cols = np.nonzero(ok & (S >= MIN_SCORE['camp']))
    weak = int((ok & (S < MIN_SCORE['camp']) & (S >= 3)).sum())
    s = S[rows, cols]
    tb = (1 - clip01(D['water'][rows, cols] / 200)) * 0.5 + clip01(near[rows, cols] / 20) * 0.49
    order = np.lexsort((-tb, -s))
    xs, ys = G.cx[cols], G.cy[rows]
    off = [(o['x'], o['y']) for o in out]
    ox = np.array([o[0] for o in off] + list(xs))
    oy = np.array([o[1] for o in off] + list(ys))
    order2 = list(range(len(off))) + [len(off) + i for i in order]
    kept = nms_select(ox, oy, order2, 3000)
    crown = [k - len(off) for k in kept if k >= len(off)]
    capped = max(0, len(crown) - CAPS['camp'])
    crown = balanced_cap(crown, xs, ys, CAPS['camp'])
    for i in crown:
        out.append({'sp': 'camp', 'cat': 'camp', 'x': float(xs[i]), 'y': float(ys[i]), 'score': int(s[i]), 'tb': float(tb[i]),
                    'kind': 'crown', 'r': int(rows[i]), 'c': int(cols[i])})
    st.update({'crownKept': len(crown), 'droppedWeak': weak, 'droppedCap': capped})
    return out


# ======================================================================================
# Refinement: vector checks, access, evidence, legal flags, plan text
# ======================================================================================
class Refiner:
    def __init__(self, ctx, dates):
        self.ctx = ctx
        self.dates = dates
        net = ctx.net
        self.pk_idx = np.nonzero(net.parkable)[0]
        self.pk_tree = ctx.tree('parkable', net.geoms[net.parkable])
        self.all_tree = ctx.tree('alledges', net.geoms)
        atvz = ctx.atv_zone_edges()
        self.az_idx = np.nonzero(atvz)[0]
        self.az_tree = STRtree(net.geoms[atvz]) if len(self.az_idx) else None
        srcs = np.unique(np.concatenate([net.u[net.parkable], net.v[net.parkable]]))
        self.walk = net.multi(np.ones(len(net.geoms), bool), srcs, limit=20000)
        base = AREAS[ctx.area]['base']
        bx, by = lonlat_to_xy(base['lon'], base['lat'])
        self.base_xy = (float(bx), float(by))
        car_set = set(np.unique(np.concatenate([net.u[net.car], net.v[net.car]])).tolist())
        d, j = net.node_tree.query([self.base_xy[0], self.base_xy[1]], k=50)
        bn = [int(jj) for jj in np.atleast_1d(j) if int(jj) in car_set]
        self.base_node = bn[0] if bn else int(np.atleast_1d(j)[0])
        self.drive = net.multi(net.car, [self.base_node], limit=400000)
        ca = ctx.ca
        cg, cp, _ = ca['cutblocks']
        self.cut_young = [i for i, x in enumerate(cp) if CUT_AGE[0] <= x['age'] <= CUT_AGE[1]]
        self.cut_tree = STRtree(cg[self.cut_young]) if self.cut_young else None
        fg, fp, _ = ca['burns']
        self.burn_idx = [i for i, x in enumerate(fp) if BURN_YEARS[0] <= x['year'] <= BURN_YEARS[1] and (x.get('ha') or 0) >= BURN_MIN_HA]
        self.burn_tree = STRtree(fg[self.burn_idx]) if self.burn_idx else None
        ug, up, _ = ca['uwr']
        self.uwr_tree = STRtree(ug) if len(ug) else None
        wg, wp, _ = ca['wetlands']
        self.wet_tree = STRtree(wg) if len(wg) else None
        self.bec_tree = STRtree(ca['bec'][0])
        self.mu_tree = STRtree(ctx.mu[0])
        self.priv_tree = STRtree(ctx.private) if len(ctx.private) else None
        self.park_tree = STRtree(ctx.parks[0]) if len(ctx.parks[0]) else None
        self.res_tree = STRtree(ctx.reserves[0]) if len(ctx.reserves[0]) else None
        self.city_tree = STRtree(ctx.cities[0]) if len(ctx.cities[0]) else None
        mg, mp = ctx.mvpr
        self.mv_idx = [i for i, x in enumerate(mp) if x['kind'] != 'snowmobile']
        self.mv_tree = STRtree(mg[self.mv_idx]) if self.mv_idx else None
        self.wma_tree = STRtree(ctx.wma[0]) if len(ctx.wma[0]) else None
        sg, spp, _ = ca['streams']
        self.stream_tree = STRtree(sg) if len(sg) else None
        lg, lp, _ = ca['lakes']
        self.lake_tree = STRtree(lg) if len(lg) else None
        # road allowance roads: numbered highways and 2 lane or wider paved public roads
        dg, dp, _ = ca['dra']
        ra = [i for i, x in enumerate(dp) if x['hwy'] or (x['surf'] == 'paved' and (x['lanes'] or 0) >= 2
                                                       and x['cls'] in ('highway', 'freeway', 'arterial', 'collector', 'local'))]
        self.ra_idx = ra
        self.ra_tree = STRtree(dg[ra]) if ra else None
        # naming anchors
        anchors, alabels = [], []
        rg, rp, _ = ca['rec_sites']
        for g, p in zip(rg, rp):
            if p['name']:
                nm = title_case_name(p['name'])
                anchors.append(g)
                alabels.append(nm if re.search(r'rec(reation)? site', nm, re.I) else nm + ' rec site')
        for g, p in zip(lg, lp):
            if p['name']:
                anchors.append(g)
                alabels.append(p['name'])
        ng, npp, _ = ca['names']
        keep_types = ('Mountain', 'Peak', 'Hill', 'Ridge', 'Locality', 'Community', 'Settlement', 'Plateau', 'Meadow', 'Flat',
                      'Valley', 'Canyon', 'Butte', 'Bluff', 'Range', 'Pass', 'Knoll', 'Bench', 'Basin', 'Mount', 'Village')
        skip_types = ('Railway', 'Reserve', 'Park', 'Protected', 'Municipality', 'Lake', 'Creek', 'River')
        for g, p in zip(ng, npp):
            t = p.get('type') or ''
            if p.get('name') and any(k.lower() in t.lower() for k in keep_types) and not any(k.lower() in t.lower() for k in skip_types):
                anchors.append(g)
                alabels.append(p['name'])
        n_pts = len(anchors)
        # named creeks and rivers (lines) as a last choice
        seen = {}
        for g, p in zip(sg, spp):
            if p['name']:
                seen.setdefault(p['name'], []).append(g)
        for nm, gs in seen.items():
            anchors.append(shapely.union_all(gs))
            alabels.append(nm)
        self.anchor_weight = np.array([1.0] * n_pts + [1.6] * (len(anchors) - n_pts))
        self.anchors = np.array(anchors, dtype=object)
        self.alabels = alabels
        self.anchor_tree = STRtree(self.anchors) if anchors else None
        self.rec_g, self.rec_p = rg, rp
        self.rec_tree = STRtree(rg) if len(rg) else None

    # ------------------------------------------------------------ small helpers
    def nearest(self, tree, geoms_idx, pt, maxd):
        if tree is None:
            return None, None
        j, d = tree.query_nearest(pt, max_distance=maxd, return_distance=True)
        if len(j) == 0:
            return None, None
        k = int(j[0])
        return (geoms_idx[k] if geoms_idx is not None else k), float(d[0])

    def point_ok(self, x, y):
        G, R = self.ctx.grid, self.ctx.R
        r, c = G.rc(x, y)
        return bool(self.ctx.eligible[r, c])

    def name_for(self, x, y, prefer=None):
        if prefer:
            return prefer
        if self.anchor_tree is None:
            return 'Unnamed spot'
        pt = shapely.points(x, y)
        idx = self.anchor_tree.query(pt.buffer(10000))
        if len(idx) == 0:
            j, d = self.anchor_tree.query_nearest(pt, return_distance=True)
            idx = j
        best = None
        for k in idx:
            g = self.anchors[k]
            d = shapely.distance(g, pt)
            # rec sites and lakes read better: small preference
            w = d * (0.8 if self.alabels[k].endswith('rec site') else 1.0) * self.anchor_weight[k]
            if best is None or w < best[0]:
                best = (w, k, d)
        _, k, d = best
        g = self.anchors[k]
        if d < 120:
            return f'By {self.alabels[k]}'
        np_ = shapely.ops.nearest_points(g, pt)[0] if shapely.get_type_id(g) != 0 else g
        az, dd = bearing_dist(np_.x, np_.y, x, y)
        return f'{fmt_dist(dd)} {compass8(az)} of {self.alabels[k]}'

    def crosses_private(self, line):
        """True when the line touches dissolved private land (ParcelMap BC)."""
        if self.priv_tree is None or line is None or line.is_empty:
            return False
        return len(self.priv_tree.query(line, predicate='intersects')) > 0

    # ------------------------------------------------------------ access
    def access(self, s):
        """Fill parking, route, category for a candidate. Returns False if no access."""
        ctx, net = self.ctx, self.ctx.net
        tgt = shapely.points(s['x'], s['y'])
        j, d = self.pk_tree.query_nearest(tgt, return_distance=True, max_distance=40000)
        if len(j) == 0:
            return False
        e = self.pk_idx[int(j[0])]
        edge = net.geoms[e]
        ppt = shapely.line_interpolate_point(edge, shapely.line_locate_point(edge, tgt))
        dpark = float(d[0])
        s['parkEdge'] = int(e)
        s['ride'] = None
        if s['sp'] == 'grouse':
            start = shapely.get_point(s['route'], 0)
            j2, d2 = self.pk_tree.query_nearest(start, return_distance=True, max_distance=40000)
            e2 = self.pk_idx[int(j2[0])]
            edge2 = net.geoms[e2]
            ppt = shapely.line_interpolate_point(edge2, shapely.line_locate_point(edge2, start))
            s['parkEdge'] = int(e2)
            s['park'] = (ppt.x, ppt.y)
            walk_in = float(d2[0])
            s['approach'] = shapely.linestrings([[ppt.x, ppt.y], [start.x, start.y]]) if walk_in > 20 else None
            s['walkLine'] = s['route']
            s['walkM'] = s['route'].length + walk_in
            if s['cat'] == 'atv':
                s['ride'] = s['route']
                s['walkLine'] = None
                s['walkM'] = walk_in
            return True
        if s['sp'] == 'camp':
            s['park'] = (s['x'], s['y']) if s.get('kind') == 'rec site' else (ppt.x, ppt.y)
            s['walkLine'] = None if s.get('kind') == 'rec site' else shapely.linestrings([[ppt.x, ppt.y], [s['x'], s['y']]])
            s['walkM'] = 0.0 if s.get('kind') == 'rec site' else dpark
            return True
        if dpark <= 300:
            s['cat'] = 'drive'
            s['park'] = (ppt.x, ppt.y)
            s['walkLine'] = shapely.linestrings([[ppt.x, ppt.y], [s['x'], s['y']]])
            s['walkM'] = dpark
            return True
        if s['cat'] == 'atv' and self.az_tree is not None:
            j3, d3 = self.az_tree.query_nearest(tgt, return_distance=True, max_distance=400)
            if len(j3):
                e3 = self.az_idx[int(j3[0])]
                dr, pr, sr = ctx.ride
                u, v = net.u[e3], net.v[e3]
                n0 = u if dr[u] <= dr[v] else v
                if np.isfinite(dr[n0]):
                    nodes = net.path_nodes(pr, n0)
                    stage = nodes[0]
                    ride = net.path_line(nodes)
                    eg = net.geoms[e3]
                    loc_t = shapely.line_locate_point(eg, tgt)
                    loc_n = shapely.line_locate_point(eg, shapely.points(net.nx[n0], net.ny[n0]))
                    from shapely import ops
                    part = ops.substring(eg, min(loc_t, loc_n), max(loc_t, loc_n))
                    parts = [x for x in (ride, part) if x is not None and not x.is_empty and x.length > 0]
                    ride_line = shapely.line_merge(shapely.union_all(parts)) if parts else None
                    near_pt = shapely.line_interpolate_point(eg, loc_t)
                    ride_m = float(dr[n0]) + part.length
                    if ride_line is not None and 1000 <= ride_m <= 10500 and not self.crosses_private(
                            shapely.linestrings([[near_pt.x, near_pt.y], [s['x'], s['y']]])):
                        s['park'] = (float(net.nx[stage]), float(net.ny[stage]))
                        s['ride'] = ride_line
                        s['rideM'] = ride_m
                        s['rideNames'] = net.names_along(net.path_edges(nodes), min_len=200)
                        s['walkLine'] = shapely.linestrings([[near_pt.x, near_pt.y], [s['x'], s['y']]])
                        s['walkM'] = float(d3[0])
                        s['cat'] = 'atv'
                        return True
        # walk or backcountry: straight line versus the walk network (closed roads, trails)
        s['cat'] = 'walk' if dpark <= 5000 else 'backcountry'
        s['park'] = (ppt.x, ppt.y)
        s['walkLine'] = shapely.linestrings([[ppt.x, ppt.y], [s['x'], s['y']]])
        s['walkM'] = dpark
        s['walkVia'] = None
        j4, d4 = self.all_tree.query_nearest(tgt, return_distance=True, max_distance=250)
        if len(j4):
            e4 = int(j4[0])
            dw, pw, sw = self.walk
            u, v = net.u[e4], net.v[e4]
            n0 = u if dw[u] + math.hypot(net.nx[u] - s['x'], net.ny[u] - s['y']) <= dw[v] + math.hypot(net.nx[v] - s['x'], net.ny[v] - s['y']) else v
            if np.isfinite(dw[n0]):
                tot = float(dw[n0]) + math.hypot(net.nx[n0] - s['x'], net.ny[n0] - s['y'])
                nodes = net.path_nodes(pw, n0)
                if tot <= 1.6 * dpark and len(nodes) > 1:
                    pl = net.path_line(nodes)
                    if pl is not None:
                        tail = shapely.linestrings([[net.nx[n0], net.ny[n0]], [s['x'], s['y']]])
                        s['park'] = (float(net.nx[nodes[0]]), float(net.ny[nodes[0]]))
                        s['walkLine'] = shapely.line_merge(shapely.union_all([pl, tail]))
                        s['walkM'] = tot
                        s['walkVia'] = net.names_along(net.path_edges(nodes), min_len=200)
                        s['cat'] = 'walk' if tot <= 6500 else 'backcountry'
        return True


# ---------------------------------------------------------------- evidence per species (vector, exact)
def _feat_dir(x, y, geom):
    """'inside' or '250 m NE' from the point to the nearest part of geom."""
    pt = shapely.points(x, y)
    d = shapely.distance(geom, pt)
    if d < 15:
        return 'right here', 0.0
    p = shapely.ops.nearest_points(geom, pt)[0]
    az, dd = bearing_dist(x, y, p.x, p.y)
    return f'{fmt_dist(dd)} {compass8(az)}', dd


def _zone_at(rf, x, y):
    pt = shapely.points(x, y)
    k = rf.bec_tree.query(pt, predicate='intersects')
    if len(k) == 0:
        return None, None
    p = rf.ctx.ca['bec'][1][int(k[0])]
    return p['zone'], p['label']


def uwr_sps(x):
    """Species keys of a winter range record (several in Region 4)."""
    return x.get('sps') or [v for v in (x.get('sp1'), x.get('sp2')) if v]


def _uwr_near(rf, x, y, species_set, maxd, first=False):
    if rf.uwr_tree is None:
        return None
    pt = shapely.points(x, y)
    ug, up, _ = rf.ctx.ca['uwr']
    best = None
    for k in rf.uwr_tree.query(pt.buffer(maxd)):
        p = up[k]
        if not (set(uwr_sps(p)[:1] if first else uwr_sps(p)) & species_set):
            continue
        d = shapely.distance(ug[k], pt)
        if d <= maxd and (best is None or d < best[0]):
            best = (d, k)
    if best is None:
        return None
    d, k = best
    p = up[k]
    where, _ = _feat_dir(x, y, ug[k])
    sp = [UWR_SPECIES[c][1] for c in UWR_SPECIES if UWR_SPECIES[c][0] in (set(uwr_sps(p)) & species_set)]
    return {'d': d, 'where': where, 'uwr': p['uwr'], 'unit': re.sub(r'\.0$', '', str(p['unit'])), 'species': ' and '.join(sp)}


def _cut_near(rf, x, y, maxd):
    if rf.cut_tree is None:
        return None
    pt = shapely.points(x, y)
    j, d = rf.cut_tree.query_nearest(pt, max_distance=maxd, return_distance=True)
    if len(j) == 0:
        return None
    i = rf.cut_young[int(j[0])]
    g = rf.ctx.ca['cutblocks'][0][i]
    p = rf.ctx.ca['cutblocks'][1][i]
    where, dd = _feat_dir(x, y, g)
    return {'d': float(d[0]), 'where': where, 'year': p['year'], 'age': p['age'], 'geom': g}


def _burn_near(rf, x, y, maxd):
    if rf.burn_tree is None:
        return None
    pt = shapely.points(x, y)
    j, d = rf.burn_tree.query_nearest(pt, max_distance=maxd, return_distance=True)
    if len(j) == 0:
        return None
    i = rf.burn_idx[int(j[0])]
    g = rf.ctx.ca['burns'][0][i]
    p = rf.ctx.ca['burns'][1][i]
    where, dd = _feat_dir(x, y, g)
    return {'d': float(d[0]), 'where': where, 'year': p['year'], 'fire': p['fire'], 'ha': p['ha'], 'geom': g}


def _fields_near(rf, x, y, maxd):
    if rf.priv_tree is None:
        return None
    pt = shapely.points(x, y)
    j, d = rf.priv_tree.query_nearest(pt, max_distance=maxd, return_distance=True)
    if len(j) == 0:
        return None
    g = rf.ctx.private[int(j[0])]
    where, dd = _feat_dir(x, y, g)
    # fields: private land outside city limits (estimate)
    r, c = rf.ctx.grid.rc(*xy_of(shapely.ops.nearest_points(g, pt)[0]))
    if rf.ctx.R['city'][r, c]:
        return None
    return {'d': float(d[0]), 'where': where}


def xy_of(p):
    return p.x, p.y


def evidence(rf, s):
    """Exact evidence list and score for a spot. Returns (items, score)."""
    x, y = s['x'], s['y']
    sp = s['sp']
    ctx = rf.ctx
    items = []
    if sp == 'deer':
        w = W['deer']
        u = _uwr_near(rf, x, y, {'mule_deer', 'wt_deer'}, 500)
        if u:
            items.append({'t': f"{u['species']} winter range {u['uwr']} unit {u['unit']} (official), {u['where']}. Counts from October.", 'pts': w['uwr']})
        else:
            items.append({'t': 'No official deer winter range within 500 m, so the top score here is 8 of 11. '
                               'This score leans on cutblocks, burns, habitat zone and aspect.', 'pts': 0})
        c = _cut_near(rf, x, y, 1000)
        if c:
            items.append({'t': f"Cutblock harvested {c['year']} ({c['age']} years old), {c['where']}.", 'pts': w['cut']})
        b = _burn_near(rf, x, y, 1000)
        if b:
            items.append({'t': f"Burn from {b['year']} (fire {b['fire']}, {fmt_int(b['ha'])} ha), {b['where']}.", 'pts': w['burn']})
        z, lab = _zone_at(rf, x, y)
        if z in DEER_ZONES_LOW:
            items.append({'t': f'Habitat zone {BEC_NAMES.get(z, z)} ({lab}): low winter and fall range.', 'pts': w['bec_low']})
        elif z in DEER_ZONES_MID:
            items.append({'t': f'Habitat zone {BEC_NAMES.get(z, z)} ({lab}).', 'pts': w['bec_ms']})
        sl = float(rf.ctx.dem.sample_xy('slope', x, y)[0])
        a = float(rf.ctx.dem.sample_xy('aspect', x, y, order=0)[0])
        if sl >= 5 and 135 <= a <= 315:
            items.append({'t': f'{compass8(a)} facing slope, {sl:.0f} degrees: sun melts snow first.', 'pts': w['aspect']})
        f = _fields_near(rf, x, y, 2000)
        if f:
            items.append({'t': f"Private fields {f['where']}: deer feed on field edges (fields are private).", 'pts': w['fields']})
    elif sp == 'moose':
        w = W['moose']
        pt = shapely.points(x, y)
        wg, wp, _ = ctx.ca['wetlands']
        near = rf.wet_tree.query(pt.buffer(2000), predicate='intersects') if rf.wet_tree is not None else []
        n = len(near)
        nb = None
        if n:
            dd = shapely.distance(wg[near], pt)
            k = int(near[int(np.argmin(dd))])
            nb = (float(dd.min()), k)
        bigk = [k for k in near if wp[k]['ha'] >= 5 and shapely.distance(wg[k], pt) <= 500]
        if n >= 3 or bigk:
            where, _ = _feat_dir(x, y, wg[nb[1]])
            nm = wp[nb[1]]['name']
            items.append({'t': f"{n} wetlands within 2 km; nearest {(nm + ', ') if nm else ''}{wp[nb[1]]['ha']:.1f} ha, {where}.", 'pts': w['wetland']})
        c = _cut_near(rf, x, y, 1000)
        b = _burn_near(rf, x, y, 1000)
        if c and (not b or c['d'] <= b['d']):
            items.append({'t': f"Cutblock harvested {c['year']} ({c['age']} years old), {c['where']}: browse.", 'pts': w['cut_or_burn']})
        elif b:
            items.append({'t': f"Burn from {b['year']} (fire {b['fire']}), {b['where']}: browse.", 'pts': w['cut_or_burn']})
        u = _uwr_near(rf, x, y, {'moose'}, 500)
        if u:
            items.append({'t': f"Moose winter range {u['uwr']} unit {u['unit']} (official), {u['where']}. Counts from November.", 'pts': w['uwr']})
    elif sp == 'quail':
        w = W['quail']
        z, lab = _zone_at(rf, x, y)
        el = float(rf.ctx.dem.sample_xy('elev', x, y)[0])
        if el >= QUAIL_MAX_ELEV:
            return items, 0
        items.append({'t': f'Elevation {fmt_int(el)} m: under {QUAIL_MAX_ELEV} m, quail country.', 'pts': 0})
        if z in QUAIL_ZONES:
            items.append({'t': f'Habitat zone {BEC_NAMES.get(z, z)} ({lab}).', 'pts': w['zone']})
        f = _fields_near(rf, x, y, 1000)
        if f:
            items.append({'t': f"Farm fields (private) {f['where']}: quail feed on field edges (Tip).", 'pts': w['farm']})
        if rf.stream_tree is not None:
            j, d = rf.stream_tree.query_nearest(shapely.points(x, y), max_distance=1000, return_distance=True)
            if len(j):
                g = ctx.ca['streams'][0][int(j[0])]
                where, _ = _feat_dir(x, y, g)
                items.append({'t': f"{ctx.ca['streams'][1][int(j[0])]['name']} {where}: water and cover.", 'pts': w['creek']})
        sl = float(rf.ctx.dem.sample_xy('slope', x, y)[0])
        rel = float(rf.ctx.dem.sample_xy('relief', x, y)[0])
        if rel < -10 and 5 <= sl <= 35:
            items.append({'t': f'Draw or gully (ground {abs(rel):.0f} m below its surroundings, estimate): brushy cover.', 'pts': w['draw']})
    elif sp == 'elk':
        w = W['elk']
        u = _uwr_near(rf, x, y, {'elk'}, 500)
        if u:
            items.append({'t': f"Elk winter range {u['uwr']} unit {u['unit']} (official), {u['where']}.", 'pts': w['uwr']})
        else:
            items.append({'t': 'No official elk winter range within 500 m, so the top score here is 8 of 11.', 'pts': 0})
        b = _burn_near(rf, x, y, 1000)
        if b:
            items.append({'t': f"Burn from {b['year']} (fire {b['fire']}, {fmt_int(b['ha'])} ha), {b['where']}: grass and shrubs.", 'pts': w['burn']})
        c = _cut_near(rf, x, y, 1000)
        if c:
            items.append({'t': f"Cutblock harvested {c['year']} ({c['age']} years old), {c['where']}.", 'pts': w['cut']})
        z, lab = _zone_at(rf, x, y)
        if z in ELK_ZONES_LOW:
            items.append({'t': f'Habitat zone {BEC_NAMES.get(z, z)} ({lab}): open forest and grass, fall and winter elk range.', 'pts': w['bec_low']})
        elif z in DEER_ZONES_MID:
            items.append({'t': f'Habitat zone {BEC_NAMES.get(z, z)} ({lab}).', 'pts': w['bec_ms']})
        sl = float(rf.ctx.dem.sample_xy('slope', x, y)[0])
        a = float(rf.ctx.dem.sample_xy('aspect', x, y, order=0)[0])
        if sl >= 5 and 135 <= a <= 315:
            items.append({'t': f'{compass8(a)} facing slope, {sl:.0f} degrees: grass greens up and snow melts first.', 'pts': w['aspect']})
        wn = _water_near(rf, x, y, 500)
        if wn:
            items.append({'t': f"Water: {wn['name'] or 'unnamed ' + wn['kind']} {wn['where']}.", 'pts': w['water']})
    elif sp == 'turkey':
        w = W['turkey']
        el = float(rf.ctx.dem.sample_xy('elev', x, y)[0])
        if el >= TURKEY_MAX_ELEV:
            return items, 0
        items.append({'t': f'Elevation {fmt_int(el)} m: valley bottom, under {fmt_int(TURKEY_MAX_ELEV)} m (my pick).', 'pts': 0})
        z, lab = _zone_at(rf, x, y)
        if z in TURKEY_ZONES:
            items.append({'t': f'Habitat zone {BEC_NAMES.get(z, z)} ({lab}): open pine and fir with roost trees.', 'pts': w['zone']})
        f = _fields_near(rf, x, y, 1000)
        if f:
            items.append({'t': f"Farm fields (private) {f['where']}: turkeys feed on field edges (Tip). Do not cross without permission.", 'pts': w['farm']})
        if rf.stream_tree is not None:
            j, d = rf.stream_tree.query_nearest(shapely.points(x, y), max_distance=300, return_distance=True)
            if len(j):
                g = ctx.ca['streams'][0][int(j[0])]
                where, _ = _feat_dir(x, y, g)
                items.append({'t': f"{ctx.ca['streams'][1][int(j[0])]['name']} {where}: creek bottom cover and roosts.", 'pts': w['creek']})
    elif sp == 'duck':
        w = W['duck']
        wpp = s['waterProps']
        nm = wpp['name'] or ('Unnamed lake' if wpp['kind'] == 'lake' else 'Unnamed wetland')
        g = s['waterGeom']
        net = ctx.net
        dpark = float(shapely.distance(g, net.geoms[s['parkEdge']])) if s.get('parkEdge') is not None else 1e9
        if 1 <= wpp['ha'] <= 200 and dpark <= 500:
            items.append({'t': f"{nm}, {wpp['ha']:.1f} ha, {fmt_dist(dpark)} from the road.", 'pts': w['size_road']})
        else:
            items.append({'t': f"{nm}, {wpp['ha']:.1f} ha.", 'pts': 0})
        r, c = ctx.grid.rc(x, y)
        n = int(round(ctx.R['wet_count2k'][r, c]))
        if n >= 3:
            items.append({'t': f'About {n} wetlands within 2 km (estimate): ducks move between them.', 'pts': w['complex']})
        if s.get('nearRiver'):
            rg, rp, _ = ctx.ca['rivers']
            j, d = STRtree(rg).query_nearest(g, return_distance=True) if len(rg) else ([], [])
            rn = rp[int(j[0])]['name'] if len(j) else None
            items.append({'t': f"Beside {rn or 'a river'}: backwater or oxbow (estimate).", 'pts': w['backwater']})
        el = float(ctx.dem.sample_xy('elev', x, y)[0])
        if el < DUCK_MAX_ELEV:
            items.append({'t': f'Elevation {fmt_int(el)} m: under {DUCK_MAX_ELEV} m, open water later in fall.', 'pts': w['low']})
    elif sp == 'grouse':
        w = W['grouse']
        L = s['route'].length
        nm = s.get('roadName') or 'unnamed road'
        kind_ = 'Trail' if 'trail' in nm.lower() else 'Road'
        items.append({'t': f'{kind_}: {nm}, {L / 1000:.1f} km stretch.', 'pts': 0})
        zones = sorted(set(GROUSE_ZONES) | GROUSE_ZONES_EXTRA.get(ctx.area, set()))
        if 'zone' in s['comp']:
            items.append({'t': f"{s['zoneFrac'] * 100:.0f}% of the stretch in grouse forest zones ({', '.join(zones)}).", 'pts': w['zone']})
        if 'cut_edge' in s['comp']:
            items.append({'t': f"{s['ncut']} cutblocks touch the road (30 years old or less): edges and clover.", 'pts': w['cut_edge']})
        if 'riparian' in s['comp']:
            items.append({'t': f"{s['nwat']} wetlands, lakes or creeks along the road: riparian edges.", 'pts': w['riparian']})
    elif sp == 'camp':
        w = W['camp']
        if s.get('kind') == 'rec site':
            o = s['official']
            items.append({'t': f"{title_case_name(o['name'])} rec site (official): {o['campsites']} campsites.", 'pts': 0})
            if o.get('closure'):
                items.append({'t': f"Closure note (official): {o['closure'][:160]}", 'pts': 0})
        sl = float(ctx.dem.sample_xy('slope', x, y)[0])
        if sl < 5:
            items.append({'t': f'Flat ground ({sl:.0f} degrees).', 'pts': w['flat']})
        wn = _water_near(rf, x, y, 200)
        if wn:
            items.append({'t': f"Water: {wn['name'] or 'unnamed ' + wn['kind']} {wn['where']}.", 'pts': w['water']})
            if wn['name']:
                items.append({'t': 'Named water: easy to find on any map.', 'pts': w['named_water']})
        r, c = ctx.grid.rc(x, y)
        if ctx.D['paved'][r, c] >= 1000 and ctx.D['fields'][r, c] >= 500:
            items.append({'t': '1 km or more from pavement and from private land: quieter (estimate).', 'pts': w['quiet']})
        if s.get('nearSpots', 0) >= 5:
            items.append({'t': f"{s['nearSpots']} hunting spots within 5 km.", 'pts': w['spots_near']})
    score = int(sum(i['pts'] for i in items))
    return items, score


def _water_near(rf, x, y, maxd):
    pt = shapely.points(x, y)
    best = None
    ca = rf.ctx.ca
    for key, kind, tree in (('lakes', 'lake', rf.lake_tree), ('wetlands', 'wetland', rf.wet_tree), ('streams', 'creek', rf.stream_tree)):
        if tree is None:
            continue
        j, d = tree.query_nearest(pt, max_distance=maxd, return_distance=True)
        if len(j) and (best is None or d[0] < best[0]):
            best = (float(d[0]), key, kind, int(j[0]))
    if best is None:
        return None
    d, key, kind, k = best
    g = ca[key][0][k]
    where, _ = _feat_dir(x, y, g)
    return {'d': d, 'name': ca[key][1][k].get('name'), 'kind': kind, 'where': where}


# ---------------------------------------------------------------- legal flags (facts with source and certainty)
def legal_flags(rf, s):
    ctx = rf.ctx
    x, y = s['x'], s['y']
    pt = shapely.points(x, y)
    parts = [g for g in (s.get('walkLine'), s.get('ride'), s.get('approach')) if g is not None and not g.is_empty]
    route = shapely.union_all(parts + [pt])
    dates = rf.dates
    flags = []
    mu = region = region_name = None
    k = rf.mu_tree.query(pt, predicate='intersects')
    if len(k):
        mg, mp = ctx.mu
        i = int(k[0])
        p = mp[i]
        mu, region, region_name = p['MU'], p['region'], p['regionName']
        near = shapely.distance(shapely.boundary(mg[i]), pt) < 300
        flags.append({'t': f"MU (Management Unit) {mu}, Region {region} {region_name}." + (' Near the MU line: check the MU map.' if near else ''),
                      'src': 'WAA_WILDLIFE_MGMT_UNITS_SVW', 'date': dates['mu'], 'cert': 80 if near else 95})
    s['mu'], s['region'], s['regionName'] = mu, region, region_name
    s['inClosure'] = False
    if rf.mv_tree is not None:
        mg, mp = ctx.mvpr
        for j in rf.mv_tree.query(route, predicate='intersects'):
            i = rf.mv_idx[int(j)]
            p = mp[i]
            inside = bool(shapely.intersects(mg[i], pt))
            if inside and p['kind'] in ('mv_closed', 'mv_hunting'):
                s['inClosure'] = True
            what = {'mv_closed': 'Motor Vehicle Closed Area', 'mv_hunting': 'Motor Vehicle for Hunting Closed Area',
                    'atv': 'ATV (all terrain vehicle) for Hunting Closed Area'}[p['kind']]
            art = 'an' if what[:1].upper() in 'AEIOU' else 'a'
            t = f"{'Spot is inside' if inside else 'Route enters'} {art} {what}: {p['name']}."
            if p['dates']:
                t += f" {p['dates'].rstrip('.')}."
            if p['exemption']:
                t += f" Exemption: {p['exemption'].rstrip('.')}."
            if p['map']:
                t += f" Synopsis map {p['map']}."
            flags.append({'t': t, 'src': 'WAA_MVPR_AREAS_SP', 'date': dates['closures'], 'cert': 90})
    if rf.park_tree is not None:
        for j in rf.park_tree.query(route, predicate='intersects'):
            p = ctx.parks[1][int(j)]
            if p['designation'] == 'National park':
                rule = 'No hunting in a national park; carry firearms unloaded and cased (Canada National Parks Act, 99%).'
            elif p['designation'] == 'Ecological reserve':
                rule = 'No hunting and no firing a firearm or bow in an ecological reserve (synopsis page 9, 99%).'
            else:
                rule = 'Hunting only where that park allows it, in open season. Check its bcparks.ca page (synopsis page 9, 99%).'
            flags.append({'t': f"Route crosses {p['designation'].lower()}: {p['name']}. {rule}", 'src': 'TA_PARK_ECORES_PA_SVW',
                          'date': dates['parks'], 'cert': 95})
    if rf.res_tree is not None:
        for j in rf.res_tree.query(route, predicate='intersects'):
            p = ctx.reserves[1][int(j)]
            flags.append({'t': f"Route crosses reserve land: {p['name']}. Get permission from the band office to hunt on or across it (synopsis page 9, 99%).",
                          'src': 'CLAB_INDIAN_RESERVES', 'date': dates['reserves'], 'cert': 95})
    if rf.city_tree is not None:
        for j in rf.city_tree.query(route.buffer(50), predicate='intersects'):
            p = ctx.cities[1][int(j)]
            t = f"Route touches city limits: {p['name']}. Local firearm bylaw applies."
            if 'Kamloops' in (p['name'] or ''):
                t += ' City of Kamloops Bylaw No. 24-49: no firearm discharge in the city (99%).'
            flags.append({'t': t, 'src': 'ABMS_MUNICIPALITIES_SP', 'date': dates['cities'], 'cert': 95})
    if rf.priv_tree is not None:
        line_parts = [g for g in parts if g is not None]
        crosses = False
        if line_parts:
            rl = shapely.union_all(line_parts)
            crosses = len(rf.priv_tree.query(rl, predicate='intersects')) > 0
        if crosses:
            flags.append({'t': f"Route crosses private land (ParcelMap BC, updated {dates['private']}): get permission first or go around.",
                          'src': 'PMBC_PARCEL_FABRIC_POLY_SVW', 'date': dates['private'], 'cert': 90})
        j, d = rf.priv_tree.query_nearest(pt, max_distance=500, return_distance=True)
        if len(j):
            where, _ = _feat_dir(x, y, ctx.private[int(j[0])])
            flags.append({'t': f'Private land {where}: no shooting within 100 m (109 yd) of an occupied house or farm building (synopsis page 10, 99%).',
                          'src': 'PMBC_PARCEL_FABRIC_POLY_SVW', 'date': dates['private'], 'cert': 95})
    if region == '3':
        mx = s.get('routeMaxElev') or s.get('elev') or 0
        if max(mx, s.get('elev') or 0) > R3_ATV_LIMIT_M:
            flags.append({'t': 'Above 1,700 m: in Region 3 no motor vehicles except snowmobiles, except on existing roads and trails '
                               '(synopsis page 33, 99%). Elevation from terrain tiles (estimate).',
                          'src': 'Synopsis Region 3; AWS terrain tiles', 'date': dates['dem'], 'cert': 90})
    if rf.ra_tree is not None:
        j, d = rf.ra_tree.query_nearest(pt, max_distance=400, return_distance=True)
        if len(j):
            dp = ctx.ca['dra'][1][rf.ra_idx[int(j[0])]]
            nm = road_label(dp) or 'A paved public road'
            where, _ = _feat_dir(x, y, ctx.ca['dra'][0][rf.ra_idx[int(j[0])]])
            flags.append({'t': f'{nm} {where}: no hunting or shooting on or across the road allowance of a numbered highway or 2 lane public road, '
                               '15 m (16 yd) each side of the centre line (synopsis page 10, 99%).',
                          'src': 'DRA_DGTL_ROAD_ATLAS_MPAR_SP', 'date': dates['roads'], 'cert': 90})
    if ctx.single_proj_zones is not None and (shapely.intersects(ctx.single_proj_zones, pt)):
        flags.append({'t': 'Inside the 400 m single projectile ban beside Hwy 5 (Coquihalla): shotgun with shot only, no rifle, slug or .22 '
                           '(synopsis, 99%). Zone drawn from the road atlas (estimate).',
                      'src': 'Synopsis highway rules; DRA_DGTL_ROAD_ATLAS_MPAR_SP', 'date': dates['roads'], 'cert': 85})
        s['singleProj'] = True
    if ctx.no_hunt_zones is not None and shapely.intersects(ctx.no_hunt_zones, route):
        flags.append({'t': f"Route crosses the 400 m no hunting strip beside {' or '.join(sorted(ctx.no_hunt_text))}: "
                           'no hunting or shooting there (synopsis page 10, 99%).',
                      'src': 'Synopsis highway rules; DRA_DGTL_ROAD_ATLAS_MPAR_SP', 'date': dates['roads'], 'cert': 85})
    if rf.wma_tree is not None:
        for j in rf.wma_tree.query(pt, predicate='intersects'):
            p = ctx.wma[1][int(j)]
            extra = (' No conveyance with a motor over 10 hp, except boats on navigable parts of the Columbia River; no electric or gas boats '
                     'in the wetlands (synopsis pages 38 and 41, Map D21, 99%).') if 'COLUMBIA WETLANDS' in (p['name'] or '').upper() else ''
            flags.append({'t': f"Inside {p['name']} Wildlife Management Area: rules differ by area. Call the regional office before you hunt (synopsis page 9, 99%).{extra}",
                          'src': 'TA_WILDLIFE_MGMT_AREAS_SVW', 'date': dates['wma'], 'cert': 95})
    if region == '4':
        flags += region4_flags(rf, s, pt, route)
    for z in getattr(ctx, 'r3_zones', []):
        if shapely.intersects(z['geom'], route):
            flags.append({'t': 'Route enters this area: ' + z['text'], 'src': z['src'], 'date': dates['roads'], 'cert': 85})
        elif z['near'] and shapely.distance(z['geom'], pt) < z['near']:
            flags.append({'t': 'Nearby: ' + z['text'], 'src': z['src'], 'date': dates['roads'], 'cert': 85})
    if getattr(ctx, 'swan', None) is not None and shapely.distance(ctx.swan, pt) < 1500:
        flags.append({'t': 'Near Swan Lake: the lake and all its marsh are a No Shooting or Hunting Area (synopsis Region 8, Map J17, 99%). '
                           'The edge is not in this data. VERIFY on the ground.',
                      'src': 'Synopsis Region 8', 'date': dates['roads'], 'cert': 99})
    if ctx.vaseux is not None and shapely.distance(ctx.vaseux, pt) < 1500:
        flags.append({'t': 'Near Vaseux Lake: hunting is prohibited in the Vaseux Migratory Bird Sanctuary and the National Wildlife Areas '
                           '(synopsis page 67, 99%). Their edges are not in this data. VERIFY on the ground.',
                      'src': 'Synopsis Region 8', 'date': dates['roads'], 'cert': 99})
    return flags


def region4_flags(rf, s, pt, route):
    """Region 4 rules: CWD Management Zone, feeding and baiting ban, snowmobile closure, wolf note, Cranbrook Deer Hunt and the
    synopsis map areas near the spot (content/phase7/13-region-4-kootenay.md, synopsis pages 15, 36 to 41)."""
    ctx = rf.ctx
    dates = rf.dates
    mu = s.get('mu')
    out = []
    syn = 'Synopsis Region 4'
    d4 = (load_seasons().get('4') or {}).get('checked') or dates['mu']
    cwd = (load_seasons().get('4') or {}).get('cwdZone') or {}
    if mu in cwd.get('mus', []):
        t = (f'CWD (Chronic Wasting Disease) Management Zone, MU {mu}: every deer, elk and moose taken here must have its head sampled at a '
             'CWD freezer before you leave the zone (www.gov.bc.ca/CWDdropoff). Brain and spinal column (vertebrae, not the tail) may not '
             'leave the zone: leave them at the kill site or a landfill in it (synopsis pages 15, 36, 37, 99%).')
        if mu == '4-25':
            t += ' From MU 4-25 you have 24 hours to take the animal to the Invermere or Canal Flats freezer through MU 4-26 (page 15, 99%).'
        out.append({'t': t, 'src': syn + ' (CWD Management Zone)', 'date': d4, 'cert': 99, 'cwd': True})
        s['cwd'] = True
    out.append({'t': 'Region 4: it is unlawful to feed or bait deer, elk, moose and other hoofed game, or turkeys, anywhere in the '
                     'Kootenay Region (synopsis page 37, 99%). Snowmobiles may not be used for hunting in Region 4 from 1 April to '
                     '30 November (page 37, 99%).', 'src': syn, 'date': d4, 'cert': 99})
    el = s.get('elev') or 0
    if ((mu in R4_WOLF_TRENCH and ctx.area in R4_TRENCH_AREAS) or mu in R4_WOLF_LOW) and el < 1100:
        where = 'the East Kootenay Trench part of MU ' + mu if mu in R4_WOLF_TRENCH else 'MU ' + mu
        out.append({'t': f'Wolf: no closed season in {where} below 1,100 m (synopsis page 39 footnote, 90%: the Trench line is not '
                         'mapped and "below 1,100 m" is my reading for both groups). VERIFY with the regional office.',
                    'src': syn, 'date': d4, 'cert': 90})
    if mu in R4_DEER_HUNT_MUS and 'deer' in s.get('species', []):
        out.append({'t': 'Cranbrook Deer Hunt (Map D27): 5 to 31 January, one extra deer of either species and either sex, only inside '
                         'the mapped portions of MUs 4-3, 4-4, 4-5 and 4-20. Never more than 3 deer province wide (synopsis pages 37 '
                         'and 41, 99%). The Map D27 line is not in this data: check the map.', 'src': syn, 'date': d4, 'cert': 99})
    for z in ctx.r4_zones:
        g = z['geom']
        if z.get('shotOnly'):
            if ctx.shot_only_at(s['x'], s['y'], s.get('elev')):
                out.append({'t': 'Spot is inside this area: ' + z['text'], 'src': z['src'], 'date': d4, 'cert': 85})
                s['singleProj'] = True
            continue
        if z.get('routeOnly'):
            if shapely.intersects(g, route.buffer(z['near'])):
                out.append({'t': 'Route or spot is on or near the road: ' + z['text'], 'src': z['src'], 'date': d4, 'cert': 85})
            continue
        if shapely.intersects(g, route):
            out.append({'t': 'Route enters this area: ' + z['text'], 'src': z['src'], 'date': d4, 'cert': 85})
        elif z['near'] and shapely.distance(g, pt) < z['near']:
            out.append({'t': 'Nearby: ' + z['text'], 'src': z['src'], 'date': d4, 'cert': 85})
    return out


# ---------------------------------------------------------------- pressure (estimate)
def pressure(rf, s):
    ctx = rf.ctx
    r, c = ctx.grid.rc(s['x'], s['y'])
    D = ctx.D
    wm = s.get('walkM') or 0
    if s['sp'] == 'grouse':
        wm = 0 if s['cat'] != 'walk' else wm
    if s['cat'] == 'backcountry' or wm > 5000:
        return 'remote', 'More than 5 km from a drivable road (estimate).'
    if wm >= 2000 or (s.get('inClosure') and wm >= 1000):
        why = f"{fmt_dist(wm)} on foot from the nearest parking" + (' inside a motor vehicle closure' if s.get('inClosure') else '')
        return 'quieter', why + ' (estimate).'
    reasons = []
    if D['rec'][r, c] <= 1000:
        reasons.append('within 1 km of a rec site')
    if D['paved'][r, c] <= 1000:
        reasons.append('within 1 km of a paved road')
    if D['city'][r, c] <= 1000:
        reasons.append('within 1 km of a town')
    if D['bigcity'][r, c] <= 25000:
        reasons.append('under 30 minutes from a city')
    if reasons:
        return 'busier', 'Busier: ' + ', '.join(reasons) + ' (estimate).'
    return 'average', 'No town, pavement or rec site within 1 km and not behind a closure (estimate).'


# ---------------------------------------------------------------- plan text (short lines, under 160 words)
def words(t):
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'.,:%/()]*", t))


SURF_WORD = {'paved': 'paved road', 'loose': 'gravel road', 'rough': 'rough road', 'overgrown': 'overgrown road',
             'seasonal': 'seasonal road', 'unknown': 'road', '': 'road', None: 'road'}
USE = {
    'deer': 'Use: your .308 Winchester with a 150 to 165 grain expanding bullet (Tip).',
    'bear': 'Use: your .308 Winchester with a 150 to 180 grain expanding bullet (Tip).',
    'moose': 'Use: .308 Winchester, 165 to 180 grain premium bullet, shots inside about 200 m (219 yd) (Tip).',
    'elk': 'Use: .308 Winchester, 165 to 180 grain premium bullet, shots inside about 200 m (219 yd) (Tip).',
    'duck': 'Use: 12 gauge, steel 2 to 4 (non toxic shot only), modified or improved cylinder rated for steel, plugged to 3 shells (regs).',
    'grouse': 'Use: .22 rimfire for a sitting grouse inside 25 m (27 yd), or a shotgun with lead 6 or 7.5 (Tip).',
    'quail': 'Use: a shotgun, improved cylinder, lead 7.5 or 6, or steel 6 (Tip). No rifle or .22 for quail (synopsis page 13, 95%).',
    'turkey': 'Use: a 12 or 20 gauge shotgun, full or turkey choke, lead or non toxic 4 to 6 shot, head and neck inside 35 m (38 yd) (Tip).',
    'sheep': 'Use: VERIFY. Sheep hunting needs special rules or a draw. Not in data/regs.json yet.',
}


def first_sentence(t, max_words=24):
    if not t:
        return ''
    t = re.sub(r'\s+', ' ', t).strip()
    m = re.match(r'(.+?[.!?])(\s|$)', t)
    s = m.group(1) if m else t
    w = s.split(' ')
    if len(w) > max_words:
        s = ' '.join(w[:max_words]) + ' ...'
    return s


def make_plan(rf, s):
    ctx = rf.ctx
    base = AREAS[ctx.area]['base']
    plon, plat = s['parkLL']
    sp = s['sp']
    lines = []
    bx, by = rf.base_xy
    _, crow = bearing_dist(bx, by, s['park'][0], s['park'][1])
    t = f"Drive: from {base['name']}, about {max(1, round(crow * 1.3 / 1000))} km (straight line times 1.3, estimate)."
    if s.get('driveVia'):
        t += ' Via ' + ', '.join(s['driveVia'][:4]) + '.'
    opt_rec = f" Official directions to {s['recName']}: {first_sentence(s['recDirections'])}" if s.get('recDirections') else ''
    lines.append([t, opt_rec])
    lines.append([f"Park: {plat}, {plon}, {s['parkWhat']}. Map links below.", ''])
    cat = s['cat']
    if sp == 'grouse':
        km = s['route'].length / 1000
        how = 'Walk' if cat == 'walk' else ('Ride' if cat == 'atv' else 'Walk or drive slowly')
        t = f"{how}: the {s.get('roadName') or 'unnamed road'} stretch, {km:.1f} km one way. About {round(km / 3 * 60)} min one way at 3 km/h."
        if s.get('approach') is not None:
            t = f"Walk {fmt_dist(s['approach'].length)} to the start. " + t
        lines.append([t, ''])
    elif sp == 'camp':
        if s.get('walkM', 0) > 30:
            lines.append([f"Walk: {fmt_dist(s['walkM'])} from the road to the flat ground.", ''])
    elif cat == 'atv':
        names = ', '.join(s.get('rideNames') or []) or 'unnamed roads and trails'
        veh = 'ATV (all terrain vehicle)' + (' or 4x4 on rough road, estimate' if s.get('rideRough') else '')
        t = (f"Ride: {s['rideM'] / 1000:.1f} km on {names} by {veh}. Then walk {fmt_dist(s['walkM'])} {s['walkDir']}"
             f", climb about {fmt_int(s['climb'])} m.")
        lines.append([t, ''])
    elif s['walkM'] < 25:
        lines.append(['Walk: none. The spot is at the road.', ''])
    else:
        via = s.get('walkVia')
        how = ('on ' + ', '.join(via[:2])) if via else 'cross country, no trail mapped'
        t = (f"Walk: {fmt_dist(s['walkM'])} {s['walkDir']}, {how}. Climb about {fmt_int(s['climb'])} m, "
             f"about {max(5, round(s['walkM'] / 3000 * 60 + s['climb'] / 10))} min at 3 km/h.")
        lines.append([t, ''])
    if s.get('campLine'):
        lines.append([s['campLine'], ''])
    # hunt
    months = s.get('months') or []
    when = (month_span(months) + ' (season rows)') if months else 'season: VERIFY'
    if sp == 'deer':
        feat = s.get('watch') or 'the open slopes and forest edges'
        t = f"Hunt: deer, {when}. Watch {feat} at first and last light. Sit above it with the wind in your face and glass (Tip)."
    elif sp == 'moose':
        t = f"Hunt: moose, {when}. Glass the wetland and cutblock edges at dawn and dusk. Move slowly, stop often (Tip)."
    elif sp == 'duck':
        t = f"Hunt: ducks, {when}. Set up on the shore with the wind at your back: ducks land into the wind (Tip). Shoot only birds you can retrieve."
    elif sp == 'grouse':
        t = f"Hunt: grouse, {when}. Walk slowly in the first and last 2 hours of light. Watch where cutblocks and creeks meet the road (Tip)."
    elif sp == 'elk':
        feat = s.get('watch') or 'the open grass slopes and burn edges'
        t = (f"Hunt: elk, {when}. Glass {feat} at first and last light; in September listen for bugling bulls. "
             "Keep the wind in your face (Tip).")
    elif sp == 'turkey':
        t = (f"Hunt: wild turkey, {when}. Find roost trees by the creek, set up before first light, call softly. "
             "Never bait: unlawful in Region 4 (Tip).")
    elif sp == 'quail':
        t = f"Hunt: California quail, {when}. Walk the brushy draws and field edges in the morning. Listen for coveys calling (Tip)."
    else:
        t = f"Hunt: {s.get('nearSpots', 0)} hunting spots within 5 km of this camp (my pick)."
    also = [SPECIES_LABEL[x] for x in s['species'] if x != sp]
    opt_also = (' Also: ' + ', '.join(also) + ' (see evidence).') if also else ''
    lines.append([t, opt_also])
    if sp != 'camp':
        use = USE.get(sp, '')
        if s.get('singleProj'):
            use = 'Use: shotgun with shot only here (single projectile ban). No rifle, slug or .22.'
        lines.append([use, ''])
    # legal
    lt = f"Legal: MU (Management Unit) {s.get('mu') or 'VERIFY'}, Region {s.get('region') or 'VERIFY'}."
    if s.get('cwd'):
        lt += ' CWD zone: deer, elk and moose heads go to a CWD freezer; brain and spine stay in the zone.'
    if s.get('region') == '4':
        lt += ' No baiting in Region 4.'
    nflags = len(s['flags'])
    season_txt = ''
    prim = [r for r in s.get('seasonRows', []) if r.get('tag') == sp]
    if prim:
        gen = [r for r in prim if r.get('open') and not r.get('limited') and not r.get('side')]
        where = lambda r: 'federal Migratory Birds Regulations' if r.get('src') else f"synopsis page {r['page']}"
        if gen:
            season_txt = (f" Season: {gen[0]['sp']}{' ' + gen[0]['cls'].lower() if gen[0]['cls'] else ''} {gen[0]['dates']}"
                          f"{', ' + gen[0]['limit'] if gen[0].get('limit') else ''}"
                          f"{' and more rows' if len(prim) > 1 else ''} ({where(gen[0])}, {gen[0]['cert']}%).")
        else:
            season_txt = f" Season: {prim[0]['dates'].lower()} ({where(prim[0])}, {prim[0]['cert']}%)."
    elif s.get('seasons'):
        it = REGS.get(s['seasons'][0], {})
        season_txt = f" Season: {it.get('value', '')} ({it.get('certainty', '')}%)."
    elif s.get('seasonNote'):
        season_txt = ' ' + s['seasonNote']
    lines.append([lt, season_txt + f" {nflags} legal flag{'s' if nflags != 1 else ''} below. {BANNER}"])
    dd = rf.dates
    lines.append([f"Verify: Candidate, scout it first. Check posted signs. Private land can be unsigned. "
                  f"Data dates: roads {dd['roads']}, private land {dd['private']}, closures {dd['closures']}.", ''])
    # fit under 160 words: drop optional parts in this order
    order = [0, 4, 6]   # rec directions, also, season text

    def total():
        return sum(words(a + b) for a, b in lines)
    for i in order:
        if total() <= 160:
            break
        for j, (a, b) in enumerate(lines):
            if b and ((i == 0 and a.startswith('Drive')) or (i == 4 and a.startswith('Hunt')) or (i == 6 and a.startswith('Legal'))):
                if a.startswith('Legal'):
                    lines[j][1] = f' Season rows below. {BANNER}'
                else:
                    lines[j][1] = ''
    return [(a + b).strip() for a, b in lines]


# ---------------------------------------------------------------- one spot, start to finish
def _snap_to_edge(rf, s, geom, maxd=300):
    pt = shapely.points(s['x'], s['y'])
    if geom is None or shapely.distance(geom, pt) > maxd:
        return
    b = shapely.boundary(geom) if shapely.get_type_id(geom) in (3, 6) else geom
    p = shapely.ops.nearest_points(b, pt)[0]
    if rf.point_ok(p.x, p.y):
        s['x'], s['y'] = p.x, p.y


def backcountry_camp(rf, s):
    """Flat Crown ground near water within 1.5 km of a backcountry spot (estimate)."""
    ctx = rf.ctx
    G, R, D = ctx.grid, ctx.R, ctx.D
    r0, c0 = G.rc(s['x'], s['y'])
    k = 15
    rs = slice(max(0, r0 - k), min(G.ny, r0 + k + 1))
    cs = slice(max(0, c0 - k), min(G.nx, c0 + k + 1))
    ok = ctx.eligible[rs, cs] & (R['slope'][rs, cs] < 8) & (D['water'][rs, cs] <= 300) & (D['water'][rs, cs] >= 30) & ~R['wetland'][rs, cs]
    if not ok.any():
        return None, 'Camp: no flat ground near water in the data within 1.5 km. Plan a dry camp and carry water (Tip).'
    rr, cc = np.nonzero(ok)
    rr = rr + rs.start
    cc = cc + cs.start
    d2 = (G.cx[cc] - s['x']) ** 2 + (G.cy[rr] - s['y']) ** 2
    i = int(np.argmin(d2))
    x, y = float(G.cx[cc[i]]), float(G.cy[rr[i]])
    wn = _water_near(rf, x, y, 400)
    el = float(ctx.dem.sample_xy('elev', x, y)[0])
    az, dd = bearing_dist(s['x'], s['y'], x, y)
    water = (f"{wn['name'] or 'unnamed ' + wn['kind']} {wn['where']}") if wn else 'VERIFY water'
    lon, lat = ll(x, y)
    line = (f"Camp: flat ground {fmt_dist(dd)} {compass8(az)} of the spot at {fmt_int(el)} m ({lat}, {lon}). "
            f"Water: {water} (estimate).")
    return {'x': x, 'y': y, 'elev': el, 'water': water}, line


def finalize(rf, s, stats):
    ctx = rf.ctx
    sp = s['sp']
    st = stats.setdefault(sp, {})
    if sp in ('deer', 'elk'):
        c = _cut_near(rf, s['x'], s['y'], 300)
        b = _burn_near(rf, s['x'], s['y'], 300)
        g = c['geom'] if c and (not b or c['d'] <= b['d']) else (b['geom'] if b else None)
        _snap_to_edge(rf, s, g)
    elif sp == 'moose' and rf.wet_tree is not None:
        j, d = rf.wet_tree.query_nearest(shapely.points(s['x'], s['y']), max_distance=300, return_distance=True)
        if len(j):
            _snap_to_edge(rf, s, ctx.ca['wetlands'][0][int(j[0])])
    if not rf.access(s):
        st['droppedNoAccess'] = st.get('droppedNoAccess', 0) + 1
        return None
    if sp != 'grouse' and not (sp == 'camp' and s.get('kind') == 'rec site'):
        tp = shapely.points(s['x'], s['y']).buffer(10)
        for tree in (rf.priv_tree, rf.park_tree, rf.res_tree, rf.city_tree):
            if tree is not None and len(tree.query(tp, predicate='intersects')):
                st['droppedOnClosedLand'] = st.get('droppedOnClosedLand', 0) + 1
                return None
    items, score = evidence(rf, s)
    official = sp == 'camp' and s.get('kind') == 'rec site'
    if not official and score < MIN_SCORE[sp]:
        st['droppedExact'] = st.get('droppedExact', 0) + 1
        return None
    s['evidence'] = items
    s['score'] = score
    x, y = s['x'], s['y']
    s['elev'] = float(ctx.dem.sample_xy('elev', x, y)[0])
    sl = float(ctx.dem.sample_xy('slope', x, y)[0])
    asp = float(ctx.dem.sample_xy('aspect', x, y, order=0)[0])
    s['slope'], s['aspectWord'] = sl, aspect_word(asp, sl)
    climb, mx = 0.0, s['elev']
    for key in ('walkLine', 'ride', 'approach'):
        g = s.get(key)
        if g is not None and not g.is_empty and g.length > 30:
            up, emax, _ = ctx.dem.profile(g if g.geom_type == 'LineString' else shapely.line_merge(g))
            if key != 'ride':
                climb += up
            if emax is not None:
                mx = max(mx, emax)
    s['climb'], s['routeMaxElev'] = climb, mx
    az, _ = bearing_dist(s['park'][0], s['park'][1], x, y)
    s['walkDir'] = compass8(az)
    # secondary species tags (vector checks)
    tags = [sp] if sp != 'camp' else []
    if sp in ('deer', 'moose', 'grouse', 'elk'):
        c = _cut_near(rf, x, y, 300)
        b = _burn_near(rf, x, y, 500)
        sunny = sl >= 5 and 135 <= asp <= 315
        if b or (c and sunny):
            tags.append('bear')
            items.append({'t': 'Black bear: young cutblocks and burns grow berries in late summer and fall (Tip).', 'pts': 0, 'tag': 'bear'})
    if sp in ('deer', 'moose', 'elk'):
        u = _uwr_near(rf, x, y, {'elk'}, 1000) if sp != 'elk' else None
        if u:
            tags.append('elk')
            items.append({'t': f"Elk winter range {u['uwr']} (official), {u['where']}.", 'pts': 0, 'tag': 'elk'})
        u = _uwr_near(rf, x, y, {'sheep'}, 1000, first=True)
        if u:
            tags.append('sheep')
            items.append({'t': f"Bighorn sheep winter range {u['uwr']} (official), {u['where']}.", 'pts': 0, 'tag': 'sheep'})
    if sp == 'deer':
        u = _uwr_near(rf, x, y, {'moose'}, 500)
        if u:
            tags.append('moose')
            items.append({'t': f"Moose winter range {u['uwr']} (official), {u['where']}.", 'pts': 0, 'tag': 'moose'})
    if sp in ('moose', 'elk'):
        u = _uwr_near(rf, x, y, {'mule_deer', 'wt_deer'}, 500)
        if u:
            tags.append('deer')
            items.append({'t': f"{u['species']} winter range {u['uwr']} (official), {u['where']}.", 'pts': 0, 'tag': 'deer'})
    if (s.get('singleProj') or (ctx.single_proj_zones is not None and shapely.intersects(ctx.single_proj_zones, shapely.points(x, y)))
            or ctx.shot_only_at(x, y, s['elev'])):
        tags = [t for t in tags if t in ('duck', 'grouse', 'quail', 'turkey')]
        if not tags and sp != 'camp':
            st['droppedSingleProjectile'] = st.get('droppedSingleProjectile', 0) + 1
            return None
    s['species'] = tags
    s['flags'] = legal_flags(rf, s)
    # seasons
    spot_seasons(s)
    s['pressure'], s['pressureWhy'] = pressure(rf, s)
    # names, parking description, drive route
    if sp == 'duck':
        wp_ = s['waterProps']
        prefer = wp_['name'] if wp_['name'] else None
        if not prefer:
            nm_ = rf.name_for(x, y)
            nm_ = nm_[0].lower() + nm_[1:] if nm_.startswith('By ') else nm_
            s['name'] = ('Unnamed lake ' if wp_['kind'] == 'lake' else 'Unnamed wetland ') + nm_
        else:
            s['name'] = prefer
    elif official:
        s['name'] = title_case_name(s['official']['name']) + ' rec site'
    else:
        s['name'] = rf.name_for(x, y)
    net = ctx.net
    pe = s.get('parkEdge')
    j, d = rf.pk_tree.query_nearest(shapely.points(*s['park']), return_distance=True)
    pe = rf.pk_idx[int(j[0])]
    pp = net.props[pe]
    rl = road_label(pp)
    surf = SURF_WORD.get(pp.get('surf'), 'road')
    if official:
        s['parkWhat'] = 'the rec site'
    elif s['cat'] == 'atv':
        s['parkWhat'] = f"where the truck road ends ({rl or 'unnamed ' + surf}); unload the ATV (all terrain vehicle)"
    else:
        s['parkWhat'] = f"pull off on {rl} ({surf})" if rl else f"pull off on an unnamed {surf}"
    s['rideRough'] = bool(s.get('ride') is not None)
    dd, pr, _ = rf.drive
    u, v = net.u[pe], net.v[pe]
    n0 = u if dd[u] <= dd[v] else v
    s['driveVia'] = net.names_along(net.path_edges(net.path_nodes(pr, n0)), min_len=1000) if np.isfinite(dd[n0]) else []
    # official rec site directions near the parking
    if official and s['official'].get('directions'):
        s['recName'], s['recDirections'] = s['name'], s['official']['directions']
    elif rf.rec_tree is not None:
        jj, d2 = rf.rec_tree.query_nearest(shapely.points(*s['park']), max_distance=1500, return_distance=True)
        if len(jj) and rf.rec_p[int(jj[0])].get('directions'):
            s['recName'] = title_case_name(rf.rec_p[int(jj[0])]['name']) + ' rec site'
            s['recDirections'] = rf.rec_p[int(jj[0])]['directions']
    # watch feature for the deer and elk plan
    if sp in ('deer', 'elk'):
        for it in items:
            if it['t'].startswith('Cutblock'):
                m = re.match(r'Cutblock harvested (\d+) .*?, (.+)\.$', it['t'])
                s['watch'] = f"the edge of the {m.group(1)} cutblock ({m.group(2)})" if m else None
                break
            if it['t'].startswith('Burn'):
                m = re.match(r'Burn from (\d+) .*?\), (.+)\.$', it['t'])
                s['watch'] = f"the edge of the {m.group(1)} burn ({m.group(2)})" if m else None
                break
    if s['cat'] == 'backcountry':
        camp, line = backcountry_camp(rf, s)
        s['bcCamp'] = camp
        s['campLine'] = line
    elif official:
        o = s['official']
        s['campLine'] = f"Camp: {o['campsites']} campsites (official). " + (f"Closure note: {first_sentence(o['closure'], 14)}" if o.get('closure') else '')
    elif sp == 'camp':
        s['campLine'] = 'Camp: Crown land candidate, flat and near water (estimate). Check fire bans and posted signs.'
    plon, plat = ll(*s['park'])
    s['parkLL'] = (plon, plat)
    return s


def enforce_spacing(spots):
    """No two spots of the same species and category closer than SPACING_M. Higher score wins; extra tags are removed."""
    order = sorted(range(len(spots)), key=lambda i: (-(spots[i]['score'] / max(1, SCORE_MAX[spots[i]['sp']])), -spots[i].get('tb', 0)))
    buckets = {}
    keep = []
    removed = 0
    for i in order:
        s = spots[i]
        cat = s['cat']
        tags = s['species'] if s['species'] else ['camp']
        ok_tags = []
        for t in tags:
            b = buckets.setdefault((t, cat), {})
            bx, by = int(s['x'] // SPACING_M), int(s['y'] // SPACING_M)
            clash = False
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    for (x2, y2) in b.get((bx + dx, by + dy), ()):
                        if (x2 - s['x']) ** 2 + (y2 - s['y']) ** 2 < SPACING_M ** 2:
                            clash = True
            if not clash:
                ok_tags.append(t)
        primary = s['sp'] if s['sp'] != 'camp' else 'camp'
        if primary not in ok_tags:
            removed += 1
            continue
        for t in ok_tags:
            buckets[(t, cat)].setdefault((int(s['x'] // SPACING_M), int(s['y'] // SPACING_M)), []).append((s['x'], s['y']))
        if s['sp'] != 'camp':
            dropped = [t for t in s['species'] if t not in ok_tags]
            s['species'] = [t for t in s['species'] if t in ok_tags]
            if dropped:
                s['evidence'] = [e for e in s['evidence'] if e.get('tag') not in dropped]
        keep.append(s)
    return keep, removed


def post_spot(rf, s):
    """Season rows (for the final tags) and plan text."""
    spot_seasons(s)
    s['plan'] = make_plan(rf, s)


def area_dates(cache, a, ca):
    def fd(layer, scope):
        return fetch_meta(cache, layer, scope).get('date', TODAY)
    dem_meta = Path(cache) / 'work' / a / 'dem.json'
    return {'roads': fd('dra_roads', a), 'private': ca['private'][2].get('newestRecord') or fd('private', a),
            'privateFetched': fd('private', a), 'closures': fd('mvpr_areas', 'BC'), 'mu': fd('mu', 'BC'), 'parks': fd('parks', 'BC'),
            'reserves': fd('reserves', 'BC'), 'cities': fd('municipalities', 'BC'), 'wma': fd('wma', 'BC'),
            'cutblocks': fd('openings', a), 'burns': fd('burns', a), 'winterRange': fd('uwr', a),
            'dem': time.strftime('%Y-%m-%d', time.localtime(dem_meta.stat().st_mtime)) if dem_meta.exists() else TODAY}


def spot_feature(s, sid):
    lon, lat = ll(s['x'], s['y'])
    plon, plat = s['parkLL']
    lk = links(lat, lon, plat, plon, s['name'])
    sp = s['sp']
    props = {
        'id': sid, 'area': s['area'], 'name': s['name'], 'category': s['cat'], 'species': s['species'] or [], 'primary': sp,
        'score': s['score'], 'scoreMax': SCORE_MAX[sp], 'scoreLabel': f"Score {s['score']} of {SCORE_MAX[sp]} (my pick)",
        'pressure': s['pressure'], 'pressureWhy': s['pressureWhy'],
        'mu': s.get('mu'), 'region': s.get('region'), 'regionName': s.get('regionName'),
        'elev': int(round(s['elev'])), 'slope': int(round(s['slope'])), 'aspect': s['aspectWord'],
        'park': [plon, plat], 'parkWhat': s['parkWhat'],
        'walkKm': round((s.get('walkM') or 0) / 1000, 2), 'rideKm': round((s.get('rideM') or 0) / 1000, 2) if s['cat'] == 'atv' else 0,
        'climbM': int(round(s.get('climb') or 0)),
        'walkMin': int(round((s.get('walkM') or 0) / 3000 * 60 + (s.get('climb') or 0) / 10)),
        'driveVia': s.get('driveVia') or [],
        'evidence': [{k: v for k, v in e.items()} for e in s['evidence']],
        'flags': s['flags'],
        'seasons': s['seasons'], 'seasonNote': s.get('seasonNote'), 'months': s['months'], 'monthsKey': months_key(s['months']),
        'seasonRows': [{k: v for k, v in r.items() if k not in ('months', 'tag', 'side')} for r in s.get('seasonRows', [])],
        'plan': s['plan'],
        'gmaps': lk['gmaps'], 'gdir': lk['gdir'], 'apple': lk['apple'],
    }
    if s.get('cwd'):
        props['cwd'] = True
    if s.get('recDirections'):
        props['recName'] = s['recName']
        props['recDirections'] = s['recDirections']
    if s.get('bcCamp'):
        props['camp'] = list(ll(s['bcCamp']['x'], s['bcCamp']['y']))
    return {'type': 'Feature', 'properties': props, 'geometry': {'type': 'Point', 'coordinates': [lon, lat]}}


def line_feature(g, props):
    gw = to_wgs(np.array([g], dtype=object))[0]
    gw = shapely.set_precision(gw, 1e-5)
    return {'type': 'Feature', 'properties': props, 'geometry': json.loads(_round_json(shapely.to_geojson(gw)))}


def write_fc(path, feats):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    txt = '{"type":"FeatureCollection","features":[\n' + ',\n'.join(
        json.dumps(f, ensure_ascii=False, separators=(',', ':')) for f in feats) + '\n]}\n'
    path.write_text(txt, encoding='utf-8')
    return len(txt.encode('utf-8'))


TILE_DEG = 0.25   # spot detail and route tiles: 0.25 degree grid, key "<floor(lon/0.25)>_<floor(lat/0.25)>" (same rule in app/map/spots.js)
INDEX_KEYS = (('id', 'id'), ('name', 'name'), ('category', 'cat'), ('species', 'species'), ('score', 'score'),
              ('pressure', 'busy'), ('mu', 'mu'), ('months', 'months'))


def tile_key(lon, lat):
    return f'{math.floor(lon / TILE_DEG)}_{math.floor(lat / TILE_DEG)}'


def write_spot_tiles(out, feats, routes):
    """Phone friendly spot files: index.geojson (light points for the map), detail/<tile>.json (full properties by id,
    fetched when a spot is tapped) and routes/<tile>.geojson (routes by their spot's tile, fetched in view at zoom 12+).
    Returns (sizes, tiles) where tiles = {'detail': [keys], 'routes': {key: bbox}}."""
    import shutil
    for d in ('detail', 'routes'):
        if (out / d).exists():
            shutil.rmtree(out / d)
    for old in ('spots.geojson', 'routes.geojson'):   # the old whole area files (replaced by the tiles)
        if (out / old).exists():
            (out / old).unlink()
    idx, detail, where = [], {}, {}
    for f in feats:
        p = f['properties']
        lon, lat = (round(c, 5) for c in f['geometry']['coordinates'][:2])
        ip = {k2: p[k] for k, k2 in INDEX_KEYS if p.get(k) not in (None, '', [])}
        idx.append({'type': 'Feature', 'properties': ip, 'geometry': {'type': 'Point', 'coordinates': [lon, lat]}})
        k = tile_key(lon, lat)
        detail.setdefault(k, {})[p['id']] = p
        where[p['id']] = k
    rt, boxes = {}, {}
    for f in routes:
        k = where.get(f['properties'].get('spotId'))
        if k is None:
            c = f['geometry']['coordinates'][0]
            k = tile_key(c[0], c[1])
        rt.setdefault(k, []).append(f)
        xs, ys = [], []
        for c in (f['geometry']['coordinates'] if f['geometry']['type'] == 'LineString'
                  else [c for part in f['geometry']['coordinates'] for c in part]):
            xs.append(c[0]); ys.append(c[1])
        b = boxes.get(k) or [999, 999, -999, -999]
        boxes[k] = [min(b[0], min(xs)), min(b[1], min(ys)), max(b[2], max(xs)), max(b[3], max(ys))]
    sizes = {'index.geojson': write_fc(out / 'index.geojson', idx), 'detail': 0, 'routes': 0}
    (out / 'detail').mkdir(parents=True, exist_ok=True)
    for k, d in sorted(detail.items()):
        txt = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
        (out / 'detail' / f'{k}.json').write_text(txt, encoding='utf-8')
        sizes['detail'] += len(txt.encode('utf-8'))
    for k, fs in sorted(rt.items()):
        sizes['routes'] += write_fc(out / 'routes' / f'{k}.geojson', fs)
    rbox = {k: [math.floor(b[0] * 1000) / 1000, math.floor(b[1] * 1000) / 1000, math.ceil(b[2] * 1000) / 1000,
                math.ceil(b[3] * 1000) / 1000] for k, b in sorted(boxes.items())}
    return sizes, {'deg': TILE_DEG, 'detail': sorted(detail), 'routes': rbox}


def step_spots(cache, areas):
    load_regs()
    for w_ in REGS_WARN:
        log('  WARN', w_)
    for a in areas:
        t0 = time.time()
        log(f'spots: area {a}')
        ctx = AreaContext(cache, a)
        dates = area_dates(cache, a, ctx.ca)
        rf = Refiner(ctx, dates)
        stats = {}
        cands = []
        for sp in (('deer', 'moose') + (('quail',) if a in QUAIL_AREAS else ()) + (('elk',) if a in ELK_AREAS else ())
                   + (('turkey',) if a in TURKEY_AREAS else ())):
            c = grid_candidates(ctx, sp, stats)
            log(f'  {sp}: {len(c)} grid candidates')
            cands += c
        c = duck_candidates(ctx, stats)
        log(f'  duck: {len(c)} candidates')
        cands += c
        c = grouse_candidates(ctx, stats)
        log(f'  grouse: {len(c)} candidates')
        cands += c
        spots = []
        t1 = time.time()
        for c in cands:
            c['area'] = a
            s = finalize(rf, c, stats)
            if s and s['sp'] == 'quail' and QUAIL_AREAS.get(a) and str(s.get('region')) not in QUAIL_AREAS[a]:
                stats.setdefault('quail', {}).setdefault('outsideQuailRegion', 0)
                stats['quail']['outsideQuailRegion'] += 1
                continue
            if s:
                spots.append(s)
        log(f'  refined {len(spots)} of {len(cands)} hunting candidates in {time.time() - t1:.0f}s')
        camps = camp_candidates(ctx, spots, stats)
        if spots:
            from scipy.spatial import cKDTree
            kd = cKDTree(np.column_stack([[s['x'] for s in spots], [s['y'] for s in spots]]))
        for c in camps:
            c['area'] = a
            c['nearSpots'] = len(kd.query_ball_point([c['x'], c['y']], 5000)) if spots else 0
            s = finalize(rf, c, stats)
            if s:
                spots.append(s)
        n0 = len(spots)
        spots = [s for s in spots if s.get('mu')]   # outside every BC MU (Alberta side of the box): not ours
        stats['outsideBC'] = n0 - len(spots)
        if area_excl(a):   # keep areas apart: a spot whose point falls in a cut out box belongs to the other area
            n0 = len(spots)
            spots = [s for s in spots if not in_excl(a, *ll(s['x'], s['y']))]
            stats['inOtherArea'] = n0 - len(spots)
        spots, removed = enforce_spacing(spots)
        stats['spacingRemoved'] = removed
        for s in spots:
            post_spot(rf, s)
        # ids, ranks
        spots.sort(key=lambda s: (s['sp'], s['cat'], -s['score'], -s.get('tb', 0)))
        counters = {}
        feats, routes, campf = [], [], []
        for s in spots:
            k = (s['sp'], s['cat'])
            counters[k] = counters.get(k, 0) + 1
            sid = f"{a}-{s['sp']}-{s['cat']}-{counters[k]:04d}"
            s['id'] = sid
            f = spot_feature(s, sid)
            f['properties']['rank'] = counters[k]
            feats.append(f)
            for key, kind in (('approach', 'walk'), ('ride', 'ride'), ('walkLine', 'roadside' if s['sp'] == 'grouse' else 'walk')):
                g = s.get(key)
                if g is None or g.is_empty or g.length < 10:
                    continue
                if s['sp'] == 'grouse' and key == 'walkLine' and s['cat'] == 'atv':
                    kind = 'ride'
                if s['cat'] == 'backcountry' and kind == 'walk':
                    kind = 'backcountry'
                up, emax, _ = ctx.dem.profile(g if g.geom_type == 'LineString' else shapely.line_merge(g))
                rflags = [x['t'] for x in s['flags'] if x['t'].startswith('Route')]
                routes.append(line_feature(g, {'spotId': sid, 'kind': kind, 'km': round(g.length / 1000, 2), 'climbM': int(round(up)),
                                               'name': s['name'], 'flags': rflags}))
            if s['sp'] == 'camp':
                o = s.get('official') or {}
                campf.append({'type': 'Feature', 'properties': {
                    'id': sid, 'kind': 'Rec site' if s.get('kind') == 'rec site' else 'Crown land candidate', 'name': s['name'],
                    'campsites': o.get('campsites'), 'water': next((e['t'] for e in s['evidence'] if e['t'].startswith('Water')), None),
                    'nearSpots': s.get('nearSpots', 0), 'closure': o.get('closure'), 'spotIds': [],
                    'note': 'Official rec site' if o else 'Candidate, scout it first (estimate)'},
                    'geometry': {'type': 'Point', 'coordinates': list(ll(s['x'], s['y']))}})
            if s.get('bcCamp'):
                bc_ = s['bcCamp']
                campf.append({'type': 'Feature', 'properties': {
                    'id': sid + '-camp', 'kind': 'Backcountry camp', 'name': 'Camp for ' + s['name'], 'campsites': None,
                    'water': bc_['water'], 'elev': int(round(bc_['elev'])), 'spotIds': [sid],
                    'note': 'Flat ground near water from the data (estimate). Scout it first.'},
                    'geometry': {'type': 'Point', 'coordinates': list(ll(bc_['x'], bc_['y']))}})
        # link camps to nearby spots (5 km)
        cmap = [c for c in campf if c['properties']['kind'] != 'Backcountry camp']
        if cmap and feats:
            from scipy.spatial import cKDTree
            sx = np.array([[s['x'], s['y']] for s in spots if s['sp'] != 'camp'])
            sids = [s['id'] for s in spots if s['sp'] != 'camp']
            if len(sx):
                kd = cKDTree(sx)
                for c in cmap:
                    lon, lat = c['geometry']['coordinates']
                    cx, cy = lonlat_to_xy(lon, lat)
                    idx = kd.query_ball_point([float(cx), float(cy)], 5000)
                    c['properties']['spotIds'] = [sids[i] for i in sorted(idx)][:40]
        out = OUT_SPOTS / a
        sizes, tiles = write_spot_tiles(out, feats, routes)
        sizes['camps.geojson'] = write_fc(out / 'camps.geojson', campf)
        # style check of generated text
        bad = 0
        for f in feats:
            p = f['properties']
            allowed = [p['name']] + (p['driveVia'] or []) + [x for x in re.findall(r'(?:on|of|Via) ([^,.]+)', ' '.join(p['plan']))]
            for line in p['plan']:
                if style_issues(line, allowed):
                    bad += 1
        counts = {}
        for s in spots:
            counts.setdefault('byCategory', {}).setdefault(s['cat'], 0)
            counts['byCategory'][s['cat']] += 1
            counts.setdefault('byPrimary', {}).setdefault(s['sp'], 0)
            counts['byPrimary'][s['sp']] += 1
            for t in s['species']:
                counts.setdefault('bySpeciesTag', {}).setdefault(t, 0)
                counts['bySpeciesTag'][t] += 1
            counts.setdefault('byPressure', {}).setdefault(s['pressure'], 0)
            counts['byPressure'][s['pressure']] += 1
            k = f"{s['sp']}:{s['cat']}"
            counts.setdefault('byPrimaryCategory', {}).setdefault(k, 0)
            counts['byPrimaryCategory'][k] += 1
        load_regs()
        meta = {
            'area': a, 'name': AREAS[a]['name'], 'box': AREAS[a]['box'], 'base': AREAS[a]['base'], 'generated': TODAY,
            'total': len(feats), 'counts': counts, 'routes': len(routes), 'camps': len(campf), 'bytes': sizes, 'tiles': tiles,
            'layerDates': dates, 'stats': stats, 'styleLinesFlagged': bad,
            'scoring': {'weights': W, 'max': SCORE_MAX, 'min': MIN_SCORE, 'spacingM': SPACING_M, 'selectRadiusM': SELECT_RADIUS,
                        'capsPerCategory': CAPS, 'cutAgeYears': CUT_AGE, 'burnYears': BURN_YEARS, 'burnMinHa': BURN_MIN_HA,
                        'grouseZones': sorted(set(GROUSE_ZONES) | GROUSE_ZONES_EXTRA.get(a, set()))},
            'seasonRows': {k: {kk: REGS[k].get(kk) for kk in ('label', 'value', 'certainty', 'source', 'url', 'page', 'checked')}
                           for k in sorted({k for s in spots for k in s['seasons']}) if k in REGS},
            'regsEdition': REGS.get('_meta'), 'regsWarnings': REGS_WARN,
            'seasonFiles': load_seasons().get('_files') + [{'file': 'migratory.json', 'edition': load_mig().get('edition'),
                                                             'rows': len(load_mig().get('rows', [])), 'checked': load_mig().get('checked')}],
            'seasonCoverage': {'withFileRows': sum(1 for s in spots if any(r.get('tag') == s['sp'] for r in s.get('seasonRows', []))),
                               'withRegsRows': sum(1 for s in spots if s['sp'] != 'camp' and s['seasons'] and not s.get('seasonNote')
                                                   and not any(r.get('tag') == s['sp'] for r in s.get('seasonRows', []))),
                               'verify': sum(1 for s in spots if s['sp'] != 'camp' and s.get('seasonNote'))},
            'notes': [
                'Candidate spots from official open data. Nobody publishes where hunters go; nothing here says animals are present.',
                'Scores are opinion (my pick). Busier, average, quieter and remote are estimates from access.',
                'Targets are never on private land, parks, protected areas, ecological reserves, reserves, city limits or lakes.',
                'Parking points are never inside parks, reserves, city limits or Motor Vehicle Closed Areas.',
                'Drive: within 300 m of a paved or gravel road. ATV: rough roads and trails 1 to 10 km from a truck parking point '
                'and 1 km or more from pavement, outside closures. Walk: 0.3 to 5 km. Backcountry: more than 5 km.',
                'Big game targets inside the Hwy 5 (Coquihalla) single projectile zone are left out.',
                'Caps per species and category are spread round robin over 15 km tiles, so every part of the area keeps its best '
                'spots instead of one big winter range taking every slot (my pick).',
                'Assumption: road surface from the Digital Road Atlas decides truck (paved, gravel) versus ATV (rough, overgrown, trails).',
                'Assumption: named trails in the road atlas (rail, horse, snowmobile and bike trails) are walk only, because their motor '
                'vehicle rules are not in the data. Rec trails count as ATV only when their listed activities include motorized use.',
            ] + (['No approved deer winter range near Kamloops or Heffley Creek: deer scores there come from cutblocks, burns, '
                  'habitat zone, aspect and fields (top score 8 of 11).'] if a == 'A' else [])
              + (['Assumption: grouse zones include CWH (Coastal Western Hemlock) in area B (my pick).'] if a == 'B' else [])
              + (['Vaseux Lake: quail and duck targets within 2 km are left out (sanctuary and National Wildlife Area edges not mapped).'] if a == 'C' else [])
              + (['Area D leaves out the part of its box inside area A (north of 50.2 and west of -119.4).',
                  'Hwy 97C (Okanagan Connector) from Aspen Grove to Peachland: 400 m no hunting or shooting strip, targets left out.',
                  'Swan Lake north of Vernon: No Shooting or Hunting Area (Map J17); targets within 500 m of the lake are left out (my pick).',
                  'Quail spots only in Region 8 (Region 3 has no quail season).'] if a == 'D' else [])
              + (['Area E leaves out the part of its box inside area A (south of 51.9 and east of -121.6). 100 Mile House itself is in area A.',
                  'Assumption: grouse zones include SBPS and SBS (Sub Boreal Pine and Spruce, Sub Boreal Spruce) in area E (my pick).'] if a == 'E' else [])
              + (['Area F is Region 4 (Kootenay). Every spot in MUs 4-1 to 4-8 and 4-20 to 4-25 carries the CWD (Chronic Wasting Disease) '
                  'Management Zone flag: head sampling at a CWD freezer and the brain and spine transport ban (synopsis pages 15, 36, 37).',
                  'Every Region 4 spot carries the region wide ungulate and turkey feeding and baiting ban and the snowmobile for hunting closure.',
                  'Elk spots (my pick weights: elk winter range, burns, cutblocks, open low habitat zones, sunny slopes, water) and wild turkey '
                  'spots (valley bottom under 1,100 m, pine and fir zones, field edges, creeks) are scored only in area F.',
                  'Synopsis map areas without official polygons (Maps D9, D10, D13, D16, D19, D20, D22, D23 and the Whiteswan FSR) are drawn from '
                  'OpenStreetMap, FWA water or road names with a margin (my pick); targets inside are left out and nearby spots are flagged.',
                  'Hwy 3 Map D14 strip: 400 m no hunting or shooting from the westernmost Hwy 3 bridge over Michel Creek east of Sparwood '
                  '(Loop Bridge is not in the data, assumption) '
                  'to the Alexander Creek crossing. Canal Flats Map D17 shot only area: big game targets within 3 km of the village and under '
                  '1,067 m are left out (my pick).'] if a in R4_AREAS else [])
              + (['Area G (Shuswap and Revelstoke) spans Regions 3, 4 and 8; its west edge is area A and its south edge is area D (no overlap).',
                  'Region 4 spots in G carry the region wide ungulate and turkey feeding and baiting ban and the snowmobile for hunting closure. '
                  'No G MU is in the CWD Management Zone. The Trench wolf note is not applied in the 4-37 corner of G (not the Trench, my reading).',
                  'Region 3 Maps C8 Blind Bay, C9 Sicamous and C10 Salmon Arm: drawn from BC Geographical Names, FWA lakes and the city limits '
                  'with a margin (my pick); targets inside are left out and nearby spots are flagged.',
                  'National parks (Mount Revelstoke, Glacier) come from CLAB_NATIONAL_PARKS: no hunting, targets inside left out.',
                  'Quail spots only in Region 8 (Region 3 and Region 4 have no quail season in G).'] if a == 'G' else []),
        }
        json.dump(meta, open(out / 'meta.json', 'w'), indent=1, ensure_ascii=False)
        log(f'spots {a}: {len(feats)} spots, {len(routes)} routes, {len(campf)} camps, '
            f'index {sizes["index.geojson"] / 1e3:.0f} KB, detail {sizes["detail"] / 1e6:.2f} MB, routes {sizes["routes"] / 1e6:.2f} MB, style flags {bad}, in {time.time() - t0:.0f}s')
        log('  ' + json.dumps(counts))


# ======================================================================================
# Step: migration and seasons layers (general pattern, from data/migration.json)
# ======================================================================================
MIG_SPECIES = [('muledeer', 'mule_deer', 'Mule deer'), ('whitetail', 'wt_deer', 'White tailed deer'), ('moose', 'moose', 'Moose'),
               ('elk', 'elk', 'Elk'), ('bighorn', 'sheep', 'Bighorn sheep')]
# Conservative defaults used only when data/migration.json is missing (marked VERIFY in about)
MIG_DEFAULT = {
    'muledeer': [([11, 12, 1, 2, 3, 4], ['BG', 'PP', 'IDF'], [300, 1200]), ([5, 10], ['IDF', 'MS'], [500, 1800]),
                 ([6, 7, 8, 9], ['MS', 'ESSF'], [1000, 2200])],
    'whitetail': [(list(range(1, 13)), ['PP', 'IDF', 'ICH'], [300, 1000])],
    'moose': [([12, 1, 2, 3, 4], ['IDF', 'ICH', 'MS', 'SBS'], [400, 1500]), ([5, 11], ['IDF', 'MS', 'SBS', 'ICH'], [500, 1700]),
              ([6, 7, 8, 9, 10], ['MS', 'SBS', 'ESSF', 'ICH'], [800, 1900])],
    'elk': [([11, 12, 1, 2, 3, 4], ['BG', 'PP', 'IDF', 'CWH'], [0, 1300]), ([5, 10], ['IDF', 'MS', 'ESSF', 'CWH'], [300, 2000]),
            ([6, 7, 8, 9], ['MS', 'ESSF', 'IMA'], [1000, 2300])],
    'bighorn': [([11, 12, 1, 2, 3, 4], ['BG', 'PP', 'IDF'], [300, 1800]), ([5, 10], ['BG', 'PP', 'IDF', 'ESSF'], [300, 2300]),
                ([6, 7, 8, 9], ['IDF', 'ESSF', 'IMA'], [300, 2500])],
}
_MJ = {}


def load_migration():
    if 'd' not in _MJ:
        p = ROOT / 'data' / 'migration.json'
        _MJ['d'] = json.load(open(p)) if p.exists() else None
    return _MJ['d']


def species_bands(key):
    """[(band, months, zones, [elev min, max], where, cert, verify)] from migration.json or defaults."""
    mj = load_migration()
    if not mj or key not in mj.get('species', {}):
        out = []
        dflt = MIG_DEFAULT.get(key, [])
        names = ['winter', 'transition', 'summer'] if len(dflt) == 3 else ['all year']
        for (mo, z, e), b in zip(dflt, names):
            out.append((b, mo, z, e, 'Default band. VERIFY against data/migration.json.', 50, True))
        return out
    s = mj['species'][key]
    mon = {m: s['months'][str(m)] for m in range(1, 13)}
    mx = {m: mon[m]['elevM'][1] for m in mon}
    lo, hi = min(mx.values()), max(mx.values())
    rng = hi - lo
    if rng < 300:
        groups = {'all year': list(range(1, 13))}
    else:
        winter = [m for m in mon if mx[m] <= lo + 0.25 * rng or 'winter' in mon[m]['where'].lower()]
        summer = [m for m in mon if mx[m] >= hi - 0.15 * rng and m not in winter]
        trans = [m for m in mon if m not in winter and m not in summer]
        groups = {'winter': winter, 'transition': trans, 'summer': summer}
    out = []
    for b, ms in groups.items():
        if not ms:
            continue
        zones = []
        for m in ms:
            zones += [z for z in mon[m]['zones'] if z not in zones]
        e = [min(mon[m]['elevM'][0] for m in ms), max(mon[m]['elevM'][1] for m in ms)]
        where = []
        for m in ms:
            w = mon[m]['where']
            if w not in where:
                where.append(w)
        cert = min(mon[m]['cert'] for m in ms)
        out.append((b, sorted(ms, key=lambda m: (m - 7) % 12), zones, e, ' '.join(where[:3]), cert, False))
    return out


def winter_months(key, default):
    for b, ms, z, e, w, c, v in species_bands(key):
        if b == 'winter':
            return sorted(ms)
    return default


MIG_POLY = {'F': {'min_km2': 3.0, 'simplify': 250}, 'G': {'min_km2': 3.0, 'simplify': 250}}   # mountain bands in area F are fragmented: coarser, for the size budget


def mask_to_polys(grid, mask, min_km2=0.5, simplify=120):
    """Raster mask to polygons (row runs, then union). Grid cell units first so edges line up exactly."""
    rects = []
    for r in range(mask.shape[0]):
        row = mask[r]
        if not row.any():
            continue
        d = np.diff(np.r_[0, row.astype(np.int8), 0])
        st = np.nonzero(d == 1)[0]
        en = np.nonzero(d == -1)[0]
        for a, b in zip(st, en):
            rects.append(shapely.box(int(a), -int(r) - 1, int(b), -int(r)))
    if not rects:
        return []
    u = shapely.union_all(np.array(rects, dtype=object))
    u = shapely.affinity.affine_transform(u, [grid.res, 0, 0, grid.res, grid.x0, grid.y1])
    parts = [p for p in shapely.get_parts(u) if p.area >= min_km2 * 1e6]
    if not parts:
        return []
    return list(shapely.simplify(np.array(parts, dtype=object), simplify, preserve_topology=True))


def step_migration(cache, areas):
    import shapely.affinity  # noqa: F401
    info = load_info(cache)
    mj = load_migration()
    src_note = 'data/migration.json (research file, ' + (mj.get('updated') if mj else '') + ')' if mj else 'defaults (VERIFY)'
    for a in areas:
        t0 = time.time()
        ca = clean_area(cache, a)
        build_dem_grid(cache, a)
        dem = DEM(cache, a)
        G = Grid(a, res=200.0)
        bg, bp, _ = ca['bec']
        zones = sorted({x['zone'] for x in bp if x['zone']})
        zc = {z: i + 1 for i, z in enumerate(zones)}
        zr = G.burn_polys(bg, values=[zc.get(x['zone'], 0) for x in bp])
        el = dem.sample('elev', G.lon.ravel(), G.lat.ravel()).reshape(G.lon.shape)
        adir = OUT_LAYERS / a
        for key, sp, label in MIG_SPECIES:
            geoms, props = [], []
            for band, months, zz, e, where, cert, verify in species_bands(key):
                codes = [zc[z] for z in zz if z in zc]
                if not codes:
                    continue
                m = G.inbox & np.isin(zr, codes) & (el >= e[0]) & (el <= e[1])
                for g in mask_to_polys(G, m, **MIG_POLY.get(a, {})):
                    geoms.append(g)
                    props.append({'species': label, 'band': band, 'months': months, 'monthsKey': months_key(months),
                                  'monthsText': month_span(months), 'zones': ', '.join(zz), 'elevM': f'{fmt_int(e[0])} to {fmt_int(e[1])} m',
                                  'where': where, 'cert': cert, 'label': 'general pattern' + (' (VERIFY)' if verify else '')})
            lid = f'season_{sp}'
            if geoms:
                emit(info, lid, a, adir / lid, np.array(geoms, dtype=object), props, 0, TODAY)
                info[lid][a]['source'] = src_note
            else:
                info.get(lid, {}).pop(a, None)
        # ducks: staging and wintering waters
        if mj and 'ducks' in mj.get('species', {}):
            dm = mj['species']['ducks']['months']
            passage = [m for m in range(1, 13) if re.search(r'migra|passage', dm[str(m)]['where'], re.I)]
            winter = [m for m in range(1, 13) if re.search(r'winter', dm[str(m)]['where'], re.I)]
            dcert = min(dm[str(m)]['cert'] for m in passage + winter)
            dverify = False
        else:
            passage, winter, dcert, dverify = [3, 4, 9, 10, 11], [12, 1, 2], 50, True
        geoms, props = [], []
        for k, kind in (('lakes', 'lake'), ('wetlands', 'wetland'), ('rivers', 'river')):
            g, p, _ = ca[k]
            if len(g) == 0:
                continue
            rep = shapely.point_on_surface(g)
            ev = dem.sample_xy('elev', shapely.get_x(rep), shapely.get_y(rep))
            for gi, pi, e in zip(g, p, ev):
                if kind != 'river' and pi['ha'] < 20:
                    continue
                if kind == 'river' and pi['ha'] < 20:
                    continue
                bands = []
                if kind != 'river' and e < 1000:
                    bands.append(('fall and spring passage', passage))
                if e < 700 and (kind == 'river' or pi['ha'] >= 50):
                    bands.append(('winter open water', winter))
                for b, ms in bands:
                    geoms.append(gi)
                    props.append({'name': pi['name'] or f'Unnamed {kind}', 'ha': round(pi['ha']), 'band': b, 'months': ms,
                                  'monthsKey': months_key(ms), 'monthsText': month_span(ms), 'elevM': int(round(e)),
                                  'cert': dcert, 'label': 'general pattern' + (' (VERIFY)' if dverify else '')})
        if geoms:
            emit(info, 'duck_waters', a, adir / 'duck_waters', np.array(geoms, dtype=object), props, 20, TODAY)
            info['duck_waters'][a]['source'] = src_note
        # quail: resident habitat (no migration), area C trip only
        if a in QUAIL_AREAS:
            qb = species_bands('quail') if mj and 'quail' in mj.get('species', {}) else [('all year', list(range(1, 13)), ['BG', 'PP'], [250, 750], 'Default band. VERIFY.', 50, True)]
            geoms, props = [], []
            for band, months, zz, e, where, cert, verify in qb:
                codes = [zc[z] for z in zz if z in zc]
                m = G.inbox & np.isin(zr, codes) & (el >= e[0]) & (el <= e[1])
                if QUAIL_AREAS.get(a):
                    mg_, mp_, _ = clean_bc(cache)['mu']
                    sel_ = [i for i, x in enumerate(mp_) if x['region'] in QUAIL_AREAS[a]]
                    sub_ = subset_box(mg_[sel_], [mp_[i] for i in sel_], G.poly)[0]
                    m &= (G.burn_polys(sub_) > 0) if len(sub_) else False
                for g in mask_to_polys(G, m, min_km2=0.2):
                    geoms.append(g)
                    props.append({'species': 'California quail', 'band': 'resident all year', 'months': list(range(1, 13)),
                                  'monthsKey': months_key(list(range(1, 13))), 'monthsText': 'all year', 'zones': ', '.join(zz),
                                  'elevM': f'{fmt_int(e[0])} to {fmt_int(e[1])} m', 'where': where, 'cert': cert,
                                  'label': 'general pattern, no migration' + (' (VERIFY)' if verify else '')})
            if geoms:
                emit(info, 'quail_range', a, adir / 'quail_range', np.array(geoms, dtype=object), props, 0, TODAY)
                info['quail_range'][a]['source'] = src_note
        log(f'migration {a} in {time.time() - t0:.0f}s')
    save_info(cache, info)


# ======================================================================================
# Step: manifest (data/layers/manifest.json, contract in MAP.md)
# ======================================================================================
OGL = 'Open Government Licence BC'
_FILL = lambda c, o, line=None: dict({'fill-color': c, 'fill-opacity': o}, **({'fill-outline-color': line} if line else {}))
# id in manifest -> (info id, group, label, type, minzoom, paint, popup, labelField, source, about, cert)
MANIFEST_SPEC = [
    ('private_land', 'private_land', 'Land status', 'Private land', 'fill', 9, _FILL('#e4472b', 0.32, '#b5321b'), [], None,
     'WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW (ParcelMap BC)',
     "Private parcels, merged into blocks. You need the owner's permission to hunt here. Owner names are not open data in BC. "
     'Not every parcel is fenced or signed.', 90),
    ('parks', 'parks', 'Land status', 'Parks and protected areas', 'fill', 6, _FILL('#3f8f3a', 0.22, '#2e6b2b'),
     [['Name', 'name'], ['Designation', 'designation']], 'name', 'WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW',
     'Provincial parks, ecological reserves and protected areas. Hunting rules differ by park.', 95),
    ('reserves', 'reserves', 'Land status', 'Reserves', 'fill', 7, _FILL('#8e5bb5', 0.25), [['Name', 'name']], 'name',
     'WHSE_ADMIN_BOUNDARIES.CLAB_INDIAN_RESERVES', 'First Nations reserves. Hunting needs permission from the Nation.', 95),
    ('city_limits', 'city_limits', 'Land status', 'City and town limits', 'fill', 7, _FILL('#78909c', 0.15, '#546e7a'),
     [['Name', 'name']], 'abbr', 'WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP',
     'Cities, towns and villages. Most ban shooting inside their limits by bylaw. Check the local bylaw.', 95),
    ('wma', 'wma', 'Land status', 'Wildlife Management Areas', 'fill', 7, _FILL('#00897b', 0.2, '#00695c'), [['Name', 'name']], 'name',
     'WHSE_TANTALIS.TA_WILDLIFE_MGMT_AREAS_SVW',
     'Crown land set aside for wildlife. Hunting is often allowed, but some have their own rules. Read the area notes.', 95),
    ('mu', 'mu_lines', 'Hunting', 'Management Units', 'fill', 5, {'fill-color': 'rgba(0,0,0,0)', 'fill-outline-color': '#6b3fa0'},
     [['MU (Management Unit)', 'MU'], ['Region', 'regionName'], ['Zone', 'zone']], None,
     'WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW',
     'Seasons and limits are set by MU (Management Unit). Check the unit before you hunt.', 95),
    ('mu_labels', 'mu_labels', 'Hunting', 'Management Unit numbers', 'symbol', 6,
     {'text-color': '#4b2a75', 'text-halo-color': '#ffffff', 'text-halo-width': 2}, [['MU (Management Unit)', 'MU']], 'MU',
     'WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW', 'Unit numbers like 3-27.', 95),
    ('leh', 'leh', 'Hunting', 'Limited Entry Hunting zones', 'fill', 7, _FILL('#f9a825', 0.12, '#f57f17'),
     [['Zone', 'label'], ['Species', 'species'], ['Management Units', 'MUs']], 'label',
     'WHSE_WILDLIFE_MANAGEMENT.WAA_LTD_HNT_ZONE_CURR_YEAR_SVW',
     'Zones where some seasons need a Limited Entry Hunting draw permit. Zones overlap by species.', 90),
    ('closures', 'closures', 'Access', 'Motor vehicle closures', 'fill', 7, _FILL('#d81b60', 0.18, '#ad1457'),
     [['Name', 'name'], ['Type', 'type'], ['Dates', 'dates'], ['Exemption', 'exemption'], ['MU (Management Unit)', 'MU'],
      ['Synopsis map', 'map']], 'name', 'WHSE_WILDLIFE_MANAGEMENT.WAA_MVPR_AREAS_SP',
     'Motor Vehicle Closed Areas and ATV (all terrain vehicle) closures from the hunting synopsis maps.', 90),
    ('closure_routes', 'closure_routes', 'Access', 'Routes in closures', 'line', 8,
     {'line-color': '#1565c0', 'line-width': 2.5, 'line-dasharray': [2, 1]}, [['Name', 'name'], ['Status', 'status'], ['Dates', 'range']],
     None, 'WHSE_WILDLIFE_MANAGEMENT.WAA_MVPR_ROUTES_SP', 'Roads open or closed to motor vehicles inside closures.', 90),
    ('forest_roads', 'forest_roads', 'Access', 'Forest Service roads', 'line', 9,
     {'line-color': '#8d6e63', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 14, 2.2]},
     [['Road', 'name'], ['Type', 'type'], ['Section', 'section']], 'name', 'WHSE_FOREST_TENURE.FTEN_ROAD_SECTION_LINES_SVW',
     'Resource roads on the forest tenure list. A road on the map can be gated, washed out or deactivated.', 85),
    ('rec_sites', 'rec_sites', 'Access', 'Recreation sites', 'circle', 8,
     {'circle-color': '#2e7d32', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 7], 'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5},
     [['Name', 'name'], ['Kind', 'kind'], ['Campsites', 'campsites'], ['Activities', 'activities'], ['Closure', 'closure'],
      ['Directions', 'directions']], 'name', 'WHSE_FOREST_TENURE.FTEN_REC_SITE_POINTS_SVW and FTEN_REC_TRAIL_HEADS_SVW',
     'Free or low cost campsites run by Recreation Sites and Trails BC.', 90),
    ('rec_trails', 'rec_trails', 'Access', 'Recreation trails', 'line', 9, {'line-color': '#6a1b9a', 'line-width': 2, 'line-dasharray': [2, 1.5]},
     [['Trail', 'name'], ['Activities', 'activities'], ['Closure', 'closure']], 'name', 'WHSE_FOREST_TENURE.FTEN_REC_TRAILS_SVW',
     'Official trails from Recreation Sites and Trails BC.', 90),
    ('uwr_mule_deer', 'uwr_mule_deer', 'Habitat and migration', 'Mule deer winter range', 'fill', 7, _FILL('#b8860b', 0.3),
     [['Range', 'uwr'], ['Species', 'species'], ['Approved', 'approved'], ['Hectares', 'ha']], None,
     'WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP',
     'Official ungulate winter range. Deer gather here from about November to April. None is mapped near Heffley Creek.', 95),
    ('uwr_wt_deer', 'uwr_wt_deer', 'Habitat and migration', 'White tailed deer winter range', 'fill', 7, _FILL('#a1887f', 0.3),
     [['Range', 'uwr'], ['Species', 'species'], ['Approved', 'approved'], ['Hectares', 'ha']], None,
     'WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP', 'Official white tailed deer winter range.', 95),
    ('uwr_moose', 'uwr_moose', 'Habitat and migration', 'Moose winter range', 'fill', 7, _FILL('#6d4c41', 0.3),
     [['Range', 'uwr'], ['Species', 'species'], ['Approved', 'approved'], ['Hectares', 'ha']], None,
     'WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP', 'Official moose winter range.', 95),
    ('uwr_elk', 'uwr_elk', 'Habitat and migration', 'Elk winter range', 'fill', 7, _FILL('#8d6e63', 0.3),
     [['Range', 'uwr'], ['Species', 'species'], ['Approved', 'approved'], ['Hectares', 'ha']], None,
     'WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP', 'Official elk winter range.', 95),
    ('uwr_sheep', 'uwr_sheep', 'Habitat and migration', 'Bighorn sheep winter range', 'fill', 7, _FILL('#bcaaa4', 0.35),
     [['Range', 'uwr'], ['Species', 'species'], ['Approved', 'approved'], ['Hectares', 'ha']], None,
     'WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP', 'Official bighorn sheep winter range.', 95),
    ('uwr_goat', 'uwr_goat', 'Habitat and migration', 'Mountain goat winter range', 'fill', 7, _FILL('#90a4ae', 0.35),
     [['Range', 'uwr'], ['Species', 'species'], ['Approved', 'approved'], ['Hectares', 'ha']], None,
     'WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP', 'Ungulate winter range for mountain goats, set by government order.', 95),
    ('burns', 'burns', 'Habitat and migration', 'Burns by year', 'fill', 8,
     {'fill-color': ['step', ['get', 'year'], '#9e9e9e', 2010, '#ff9800', 2017, '#f4511e'], 'fill-opacity': 0.3},
     [['Year', 'year'], ['Hectares', 'ha'], ['Cause', 'cause']], None, 'WHSE_LAND_AND_NATURAL_RESOURCE.PROT_HISTORICAL_FIRE_POLYS_SP',
     'Fires since 2000. Burns 3 to 15 years old grow food for deer, moose and bears.', 95),
    ('cutblocks', 'cutblocks', 'Habitat and migration', 'Cutblocks by age', 'fill', 9,
     {'fill-color': ['match', ['get', 'ageClass'], '5 to 20 years', '#7cb342', '0 to 4 years', '#dce775', '#c5e1a5'], 'fill-opacity': 0.4},
     [['Harvest year', 'year'], ['Age', 'age'], ['Age class', 'ageClass']], None, 'WHSE_FOREST_VEGETATION.RSLT_OPENING_SVW',
     'Logged openings 25 years old or less. Blocks 5 to 20 years old feed deer, moose, bears and grouse.', 90),
    ('wetlands', 'wetlands', 'Habitat and migration', 'Wetlands', 'fill', 9, _FILL('#4fc3f7', 0.35), [['Name', 'name'], ['Hectares', 'ha']],
     None, 'WHSE_BASEMAPPING.FWA_WETLANDS_POLY', 'Marshes, swamps and bogs from the Freshwater Atlas. Good for moose and ducks.', 90),
    ('habitat_zones', 'habitat_zones', 'Habitat and migration', 'Habitat zones', 'fill', 9,
     {'fill-color': ['match', ['get', 'zone'], 'BG', '#e6c86e', 'PP', '#d4a259', 'IDF', '#9ccc65', 'MS', '#4db6ac', 'ESSF', '#64b5f6',
                     'ICH', '#81c784', 'SBS', '#aed581', 'CWH', '#66bb6a', 'CDF', '#c0ca33', 'MH', '#90caf9', 'IMA', '#e0e0e0',
                     'CMA', '#e0e0e0', '#bdbdbd'], 'fill-opacity': 0.25},
     [['Zone', 'zoneName'], ['Code', 'label']], 'label', 'WHSE_FOREST_VEGETATION.BEC_BIOGEOCLIMATIC_POLY',
     'Biogeoclimatic zones: the plant community you will find. Bunchgrass and Ponderosa Pine are low winter country.', 90),
]
MIG_PAINT = {'mule_deer': '#b8860b', 'wt_deer': '#a1887f', 'moose': '#6d4c41', 'elk': '#8d6e63', 'sheep': '#bcaaa4'}
MIG_POPUP = [['Species', 'species'], ['Band', 'band'], ['Months', 'monthsText'], ['Habitat zones', 'zones'], ['Elevation', 'elevM'],
             ['Where', 'where'], ['Certainty %', 'cert'], ['Label', 'label']]


def _files_entry(rec, areas_order=tuple(AREAS)):
    """{area: info} -> manifest keys: file with {area} when uniform, else files list."""
    if 'BC' in rec:
        return {'file': rec['BC']['file'], 'areas': 'BC'}
    ar = [a for a in areas_order if a in rec]
    if not ar:
        return None
    paths = [rec[a]['file'] for a in ar]
    tmpl = {p.replace(f'/{a}/', '/{area}/') for p, a in zip(paths, ar)}
    if len(tmpl) == 1:
        return {'file': tmpl.pop(), 'areas': ar}
    return {'files': [{'area': a, 'file': rec[a]['file']} for a in ar], 'areas': ar}


def _date_of(rec):
    ds = [v.get('newestRecord') or v.get('dataDate') for v in rec.values() if isinstance(v, dict)]
    ds = [d for d in ds if d]
    return min(ds) if ds else TODAY


def _duck_months():
    mj = load_migration()
    if mj and 'ducks' in mj.get('species', {}):
        dm = mj['species']['ducks']['months']
        return [m for m in range(1, 13) if re.search(r'migra|passage|winter', dm[str(m)]['where'], re.I)]
    return [9, 10, 11, 12, 1, 2, 3, 4]


def step_manifest(cache, areas):
    info = load_info(cache)
    mpath = OUT_LAYERS / 'manifest.json'
    old = json.load(open(mpath)) if mpath.exists() else {'layers': []}
    out, made = [], set()

    def add(entry, rec):
        fe = _files_entry(rec)
        if not fe:
            return
        entry.update(fe)
        entry['licence'] = OGL
        entry['dataDate'] = _date_of(rec)
        entry['bytes'] = sum(v.get('bytes', 0) for v in rec.values() if isinstance(v, dict))
        out.append(entry)
        made.add(entry['id'])

    for mid, iid, group, label, typ, mz, paint, popup, lf, src, about, cert in MANIFEST_SPEC:
        rec = info.get(iid) or {}
        e = {'id': mid, 'group': group, 'label': label, 'type': typ, 'minzoom': mz, 'paint': paint, 'popup': popup}
        if lf:
            e['labelField'] = lf
        e.update({'source': src, 'about': about, 'cert': cert})
        if iid.startswith('uwr_'):
            sp = iid[4:]
            e['months'] = winter_months(MIG_KEY.get(sp), SPECIES_WINTER_MONTHS.get(sp, [11, 12, 1, 2, 3, 4]))
        add(e, rec)
    # seasonal bands (general pattern) from data/migration.json
    for key, sp, label in MIG_SPECIES:
        lid = f'season_{sp}'
        rec = info.get(lid) or {}
        months = sorted({m for b in species_bands(key) for m in b[1]})
        add({'id': lid, 'group': 'Habitat and migration', 'label': f'{label} by month (general pattern)', 'type': 'fill', 'minzoom': 7,
             'paint': {'fill-color': MIG_PAINT.get(sp, '#8d6e63'),
                       'fill-opacity': ['match', ['get', 'band'], 'winter', 0.35, 'transition', 0.22, 0.15]},
             'popup': MIG_POPUP, 'source': 'data/migration.json (cited studies) with BEC zones and elevation (terrarium tiles)',
             'about': f'Where {label.lower()} tend to be by month: habitat zones and elevation bands from studies. General pattern, '
                      'not mapped corridors. Use the month slider.', 'cert': 60, 'months': months, 'legal': False}, rec)
    rec = info.get('duck_waters') or {}
    add({'id': 'duck_waters', 'group': 'Habitat and migration', 'label': 'Duck staging and winter waters', 'type': 'fill', 'minzoom': 8,
         'paint': {'fill-color': ['match', ['get', 'band'], 'winter open water', '#1e88e5', '#4dd0e1'], 'fill-opacity': 0.45,
                   'fill-outline-color': '#0d47a1'},
         'popup': [['Name', 'name'], ['Hectares', 'ha'], ['Band', 'band'], ['Months', 'monthsText'], ['Elevation m', 'elevM'],
                   ['Label', 'label']],
         'source': 'FWA lakes, wetlands and rivers with data/migration.json flyway timing',
         'about': 'Valley lakes and wetlands of 20 ha or more where ducks stop in fall and spring, and low open water in winter. '
                  'General pattern.', 'cert': 60,
         'months': _duck_months(), 'legal': False}, rec)
    rec = info.get('quail_range') or {}
    add({'id': 'quail_range', 'group': 'Habitat and migration', 'label': 'California quail habitat (no migration)', 'type': 'fill',
         'minzoom': 8, 'paint': _FILL('#c0a060', 0.3, '#8d6e3f'), 'popup': MIG_POPUP,
         'source': 'BEC zones and elevation with data/migration.json',
         'about': 'Quail do not migrate. Low Bunchgrass and Ponderosa Pine country near farms and brushy creeks, all year. General pattern.',
         'cert': 60, 'months': list(range(1, 13)), 'legal': False}, rec)
    # spots, routes, camps
    sp_areas = [a for a in AREAS if (OUT_SPOTS / a / 'index.geojson').exists()]
    sp_meta = {a: json.load(open(OUT_SPOTS / a / 'meta.json')) if (OUT_SPOTS / a / 'meta.json').exists() else {} for a in sp_areas}

    def spot_rec(fname):
        r = {}
        for a in sp_areas:
            f = OUT_SPOTS / a / fname
            if f.exists():
                md = json.load(open(OUT_SPOTS / a / 'meta.json')) if (OUT_SPOTS / a / 'meta.json').exists() else {}
                r[a] = {'file': rel(f), 'bytes': f.stat().st_size, 'dataDate': md.get('generated', TODAY)}
        return r
    add({'id': 'spots', 'group': 'Spots', 'kind': 'spots', 'label': 'Candidate spots', 'type': 'symbol', 'minzoom': 6,
         'popup': [], 'source': 'Hunt Mentor spot pipeline (scripts/spots-pipeline.py) from BC Data Catalogue layers',
         'about': 'Candidate spots scored from open data (my pick): drive, ATV (all terrain vehicle), walk, backcountry and camp. '
                  'Busier and quieter are estimates. Candidate, scout it first.', 'cert': 60,
         # index.geojson holds light points; a tapped spot's full card comes from detail/<tile>.json (keyed by id)
         'detail': 'data/spots/{area}/detail/{tile}.json', 'tileDeg': TILE_DEG,
         'detailTiles': {a: sp_meta[a].get('tiles', {}).get('detail', []) for a in sp_areas}}, spot_rec('index.geojson'))
    # routes: one file per tile (the tile of the route's spot), each with the bbox of its lines, loaded in view from zoom 12
    rt_files, rt_bytes, rt_date = [], 0, TODAY
    for a in sp_areas:
        for k, b in sp_meta[a].get('tiles', {}).get('routes', {}).items():
            f = OUT_SPOTS / a / 'routes' / f'{k}.geojson'
            if f.exists():
                rt_files.append({'area': a, 'file': rel(f), 'bbox': b})
                rt_bytes += f.stat().st_size
        rt_date = sp_meta[a].get('generated', rt_date)
    rt = {'id': 'routes', 'group': 'Spots', 'kind': 'routes', 'label': 'Walk and ride routes', 'type': 'line', 'minzoom': 12,
          'loadMinzoom': 12,
         'paint': {'line-color': ['match', ['get', 'kind'], 'ride', '#6d4c41', 'roadside', '#f9a825', 'backcountry', '#5e35b1', '#e8590c'],
                   'line-width': 3, 'line-dasharray': [1, 1.5]},
         'popup': [['Route', 'name'], ['Kind', 'kind'], ['Length km', 'km'], ['Climb m', 'climbM']],
         'source': 'Hunt Mentor spot pipeline (road atlas, forest roads, rec trails)', 'about': 'Suggested approach lines (estimate).',
         'cert': 60, 'legal': False}
    if rt_files:
        rt.update({'files': rt_files, 'areas': sp_areas, 'licence': OGL, 'dataDate': rt_date, 'bytes': rt_bytes})
        out.append(rt)
        made.add('routes')
    add({'id': 'camps', 'group': 'Access', 'kind': 'camps', 'label': 'Camps (rec sites and candidates)', 'type': 'circle', 'minzoom': 9,
         'paint': {'circle-color': ['match', ['get', 'kind'], 'Rec site', '#2e7d32', 'Backcountry camp', '#5e35b1', '#8bc34a'],
                   'circle-radius': 5, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5},
         'popup': [['Name', 'name'], ['Kind', 'kind'], ['Campsites', 'campsites'], ['Water', 'water'], ['Note', 'note']],
         'labelField': 'name', 'source': 'FTEN_REC_SITE_POINTS_SVW plus Crown land camp candidates (Hunt Mentor spot pipeline)',
         'about': 'Official rec sites and Crown land camp candidates (flat, near water, not private, park or reserve). Scout it first.',
         'cert': 60, 'legal': False}, spot_rec('camps.geojson'))
    # keep layers the pipeline does not make (hand added), drop the old per area spot ids
    for l in old.get('layers', []):
        if l.get('id') in made or l.get('id') in ('spots_a', 'routes_a', 'spots_b', 'routes_b', 'spots_c', 'routes_c'):
            continue
        if l.get('id') in {s[0] for s in MANIFEST_SPEC}:
            continue   # pipeline layer with no data this run
        out.append(l)
    man = {'updated': TODAY,
           'areaBoxes': {a: list(v['box']) for a, v in AREAS.items()},
           'areaNames': {a: v['name'] for a, v in AREAS.items()},
           'layers': out}
    tmp = mpath.with_suffix('.tmp')
    json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
    tmp.replace(mpath)
    tot = sum(l.get('bytes', 0) for l in out)
    log(f'manifest: {len(out)} layers, {tot / 1e6:.1f} MB of data listed')


# ======================================================================================
# CLI
# ======================================================================================
STEP_ORDER = ['fetch', 'dem', 'layers', 'spots', 'migration', 'manifest']


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cache', default=os.environ.get('HM_GIS_CACHE', '/tmp/hm-gis-cache'),
                    help='cache folder for raw downloads and work files (never inside the repo)')
    ap.add_argument('--areas', default='A,B,C')
    ap.add_argument('--steps', default='all', help='comma list of ' + ','.join(STEP_ORDER) + ' or all')
    args = ap.parse_args()
    cache = Path(args.cache).resolve()
    if str(cache).startswith(str(ROOT)):
        sys.exit('cache must be outside the repo')
    cache.mkdir(parents=True, exist_ok=True)
    areas = [a.strip().upper() for a in args.areas.split(',') if a.strip()]
    steps = STEP_ORDER if args.steps == 'all' else [s.strip() for s in args.steps.split(',')]
    timings = {}
    for s in STEP_ORDER:
        if s not in steps:
            continue
        t0 = time.time()
        globals()['step_' + s](cache, areas)
        timings[s] = round(time.time() - t0, 1)
        log(f'step {s} done in {timings[s]}s')
    tf = cache / 'timings.json'
    old = json.load(open(tf)) if tf.exists() else {}
    old.update({f'{s}:{",".join(areas)}': v for s, v in timings.items()})
    json.dump(old, open(tf, 'w'), indent=1)


def step_dem(cache, areas):
    step_dem_fetch(cache, areas)
    for a in areas:
        build_dem_grid(cache, a)


if __name__ == '__main__':
    main()
