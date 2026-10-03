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
