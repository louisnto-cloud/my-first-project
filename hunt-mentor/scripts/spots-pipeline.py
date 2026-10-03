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
import io
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
}
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
    'wma': dict(type='WHSE_TANTALIS.TA_WILDLIFE_MGMT_AREAS_SVW', geom='SHAPE', scope='BC',
                props=['WILDLIFE_MANAGEMENT_AREA_NAME']),
    'leh': dict(type='WHSE_WILDLIFE_MANAGEMENT.WAA_LTD_HNT_ZONE_CURR_YEAR_SVW', geom='GEOMETRY', scope='BC',
                props=['LIMITED_ENTRY_HUNTING_ZONE', 'MANAGEMENT_UNITS', 'LTD_ENTRY_HUNTING_ZONE_TYPE', 'LTD_ENTRY_HUNTING_ZONE_LABEL',
                       'EFFECTIVE_DATE', 'EXPIRY_DATE']),
    # ---- per area
    'uwr': dict(type='WHSE_WILDLIFE_MANAGEMENT.WCP_UNGULATE_WINTER_RANGE_SP', geom='GEOMETRY', scope='area',
                props=['UWR_NUMBER', 'UWR_UNIT_NUMBER', 'SPECIES_1', 'SPECIES_2', 'APPROVAL_DATE', 'HECTARES', 'TIMBER_HARVEST_CODE']),
    'private': dict(type='WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW', geom='SHAPE', scope='area', tile=0.2, margin=0,
                    cql="OWNER_TYPE='Private' AND NOT (PARCEL_CLASS IN ('Building Strata','Air Space'))",
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
    'camp': {'flat': 2, 'water': 2, 'named_water': 1, 'quiet': 1, 'spots_near': 1},
}
SCORE_MAX = {'deer': 11, 'moose': 7, 'duck': 8, 'grouse': 3, 'quail': 6, 'camp': 7}
MIN_SCORE = {'deer': 6, 'moose': 4, 'duck': 4, 'grouse': 2, 'quail': 4, 'camp': 5}
SPACING_M = 800            # no two spots of the same species and category closer than this
SELECT_RADIUS = {'drive': 1500, 'atv': 1500, 'walk': 2000, 'backcountry': 3000, 'camp': 3000}
CAPS = {'deer': 450, 'moose': 250, 'duck': 350, 'grouse': 300, 'quail': 300, 'camp': 120}   # per area and category, safety cap
CUT_AGE = (5, 20)          # cutblock age that feeds deer, moose, bear, grouse
BURN_YEARS = (2015, 2023)  # recent burns for scoring
DEER_ZONES_LOW = {'BG', 'PP', 'IDF'}
DEER_ZONES_MID = {'MS'}
GROUSE_ZONES = {'IDF', 'MS', 'ESSF', 'ICH'}
GROUSE_ZONES_EXTRA = {'B': {'CWH'}}   # Assumption (my pick): coastal grouse use CWH forest in area B
QUAIL_ZONES = {'BG', 'PP'}
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


def months_key(months):
    return ',' + ','.join(str(m) for m in months) + ','


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
    for ti, tb in enumerate(tiles):
        start = 0
        while True:
            key = hashlib.sha1(json.dumps([tb, start, L.get('cql'), L['props']]).encode()).hexdigest()[:12]
            fn = d / f't{ti:03d}_{start:07d}_{key}.json.gz'
            if fn.exists():
                with gzip.open(fn, 'rt') as f:
                    m = json.load(f).get('_n', 0)
            else:
                p = wfs_params(layer, tb, start)
                url = WFS + '?' + urllib.parse.urlencode(p, safe=":,'()")
                b = http_get(url)
                try:
                    js = json.loads(b)
                except Exception:
                    raise RuntimeError(f'{layer}: bad response {b[:300]!r}')
                m = len(js.get('features', []))
                js['_n'] = m
                with gzip.open(fn, 'wt') as f:
                    json.dump(js, f)
            n += m
            if m < PAGE:
                break
            start += PAGE
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
    v = str(v).strip()
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
        out = []
        for w in s.split(' '):
            if re.fullmatch(r'[IVX]+|FSR|BC|[A-Z]?\d+[A-Z]?|N|S|E|W|NE|NW|SE|SW', w):
                out.append(w)
            else:
                out.append(w.capitalize())
        return ' '.join(out)
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


def write_pmtiles(path, geoms_wgs, props, layer_name, minzoom=8, maxzoom=14):
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
        sp = [UWR_SPECIES.get(x.get('SPECIES_1'), (None, None)), UWR_SPECIES.get(x.get('SPECIES_2'), (None, None))]
        props.append({'uwr': x.get('UWR_NUMBER'), 'unit': x.get('UWR_UNIT_NUMBER'),
                      'sp1': sp[0][0], 'sp2': sp[1][0], 'species': ' and '.join(s[1] for s in sp if s[1]),
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
    if not force_pm:
        size, n = write_geojson(gj, gw, props)
    if force_pm or size > MAX_GEOJSON:
        if gj.exists():
            gj.unlink()
        size, ntiles = write_pmtiles(pm, gw, props, lid, minzoom=minzoom_pm, maxzoom=14)
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
        emit(info, 'private_land', a, adir / 'private_land', g, [{} for _ in g], 10, adate('private'), m.get('newestRecord'),
             minzoom_pm=9)
        info['private_land'][a]['parcels'] = m.get('parcels')
        # winter ranges by species
        g, p, m = ca['uwr']
        for code, (sp, label) in UWR_SPECIES.items():
            idx = [i for i, x in enumerate(p) if sp in (x['sp1'], x['sp2'])]
            lid = f'uwr_{sp}'
            if not idx:
                info.get(lid, {}).pop(a, None)
                for ext in ('.geojson', '.pmtiles'):
                    f = adir / (lid + ext)
                    if f.exists():
                        f.unlink()
                continue
            months = SPECIES_WINTER_MONTHS.get(sp, [11, 12, 1, 2, 3, 4])
            pp = [dict(p[i], months=months, monthsKey=months_key(months)) for i in idx]
            emit(info, lid, a, adir / lid, g[idx], pp, 15, adate('uwr'), newest(pp, 'approved'))
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
        emit(info, 'wetlands', a, adir / 'wetlands', g, [{'name': x['name'], 'ha': x['ha']} for x in p], 10, adate('wetlands'))
        # habitat zones (BEC)
        g, p, m = ca['bec']
        emit(info, 'habitat_zones', a, adir / 'habitat_zones', g,
             [{'zone': x['zone'], 'label': x['label'], 'zoneName': BEC_NAMES.get(x['zone'], x['zoneName'])} for x in p], 20, adate('bec'))
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
MOTOR_WORDS = ('atv', 'all terrain', 'motorbike', 'motorcycle', 'off road', '4x4', '4 wheel', 'four wheel', 'snowmobile')


def road_label(p):
    """Road name from the road atlas (or forest tenure). Highways as 'Hwy 5 (Yellowhead Hwy)'."""
    n = p.get('name')
    h = p.get('hwy')
    if h:
        h = str(h).split(',')[0].strip()
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
            if cls in SKIP_CLASS:
                continue
            surf = (pi.get('surf') or '').lower()
            if cls in WALK_CLASS or surf in WALK_SURF:
                mode = 2
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
        self.no_hunt_zones, self.single_proj_zones = self._highway_zones()
        self.vaseux = self._named_lake_buffer('Vaseux Lake', 2000) if area == 'C' else None
        nt = [self.no_hunt_zones] if self.no_hunt_zones is not None else []
        if self.vaseux is not None:
            nt.append(self.vaseux)
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
            h = str(pi.get('hwy') or '')
            nums = [x.strip() for x in re.split(r'[,;/ ]+', h) if x.strip()]
            if not nums:
                continue
            c = shapely.centroid(gi)
            lon, lat = xy_to_lonlat(c.x, c.y)
            lon, lat = float(lon), float(lat)
            # Hwy 3 between Hope and Manning Park: no hunting within 400 m of the road allowance
            if '3' in nums and self.area == 'B' and lon > -121.45:
                nh.append(gi)
            # Hwy 5 (Coquihalla) between Hope and the Hwy 1 and 5 junction at Kamloops: single projectile ban 400 m
            if '5' in nums and '1' not in nums and lat < 50.66:
                sp.append(gi)
        nhz = shapely.union_all(shapely.buffer(np.array(nh, dtype=object), 415)) if nh else None
        spz = shapely.union_all(shapely.buffer(np.array(sp, dtype=object), 415)) if sp else None
        return nhz, spz

    def _named_lake_buffer(self, name, dist):
        g, p, _ = self.ca['lakes']
        idx = [i for i, x in enumerate(p) if (x['name'] or '') == name]
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
        bg, bp, _ = ca['bec']
        zones = sorted({x['zone'] for x in bp if x['zone']})
        self.zone_codes = {z: i + 1 for i, z in enumerate(zones)}
        self.zone_names = {i + 1: z for i, z in enumerate(zones)}
        R['bec'] = G.burn_polys(bg, values=[self.zone_codes.get(x['zone'], 0) for x in bp])
        ug, up, _ = ca['uwr']
        for sp in ('mule_deer', 'wt_deer', 'moose', 'elk', 'sheep'):
            idx = [i for i, x in enumerate(up) if sp in (x['sp1'], x['sp2'])]
            R['uwr_' + sp] = (G.burn_polys(ug[idx]) > 0) if idx else np.zeros((G.ny, G.nx), bool)
        cg, cp, _ = ca['cutblocks']
        young = [i for i, x in enumerate(cp) if CUT_AGE[0] <= x['age'] <= CUT_AGE[1]]
        R['cut_young'] = G.burn_polys(cg[young]) > 0
        fg, fp, _ = ca['burns']
        rec = [i for i, x in enumerate(fp) if BURN_YEARS[0] <= x['year'] <= BURN_YEARS[1]]
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
            near_pave = np.minimum(dp[net.u], dp[net.v])
            self._atvz = only & np.isfinite(far) & (far <= 10000) & np.isfinite(near_pave) & (near_pave >= 1000)
            self.ride = (dr, pr, sr)
            self.pave_dist = dp
        return self._atvz


# ======================================================================================
# Spot helpers: text, names, seasons, flags
# ======================================================================================
BANNER = 'Study aid only. The official regulations are the law.'
SYNOPSIS = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028'
SPECIES_LABEL = {'deer': 'deer', 'moose': 'moose', 'elk': 'elk', 'bear': 'black bear', 'grouse': 'grouse',
                 'duck': 'ducks', 'quail': 'California quail', 'sheep': 'bighorn sheep'}
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
# (processing steps are defined below)
# ======================================================================================


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
