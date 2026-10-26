#!/usr/bin/env python3
"""Hunt Mentor: detailed roads and trails map layers, per area box (prompt prompts/2026-10-26-roads-trails-detail.md).

Sources (BC Geographic Warehouse WFS, openmaps.gov.bc.ca, Open Government Licence BC):
  WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP     BC Digital Road Atlas: every mapped road, with class, surface, name, lanes.
                                                    Kept: the classes the base map does not show clearly (resource, unclassified,
                                                    recreation, restricted, service, proposed, trail, skid, water access...).
                                                    Left out: highways, arterial, collector, local, ramps, lanes, alleys, driveways, ferries.
  WHSE_FOREST_TENURE.FTEN_ROAD_SEGMENT_LINES_SVW   Forest tenure road segments: life cycle status (ACTIVE, RETIRED, PENDING), file id, client.
                                                    Kept: every RETIRED or PENDING segment (drawn as their own class), and ACTIVE segments that
                                                    the road atlas does not already show (under 30% of the length within 20 m of a kept atlas line).
OpenStreetMap (ODbL): tracks, paths, footways, bridleways and barrier=gate were planned. On 2026-10-26 the sandbox could not reach
  Geofabrik, openstreetmap.fr or any Overpass API (connection reset by the proxy), and the only BBBike extract nearby (Vancouver)
  stops at 122.67 W, west of Mission and Harrison. So trails_detail is the road atlas trail class only, and there is no gates layer.
  When an OSM extract is reachable, add it here (osmium) with the ODbL credit; the app wiring already handles an "osm" source value.

Outputs:
  data/layers/<area>/roads_detail.pmtiles   layer roads_detail: name, kind, cls, surf, lanes, status, src, file, date
  data/layers/<area>/trails_detail.pmtiles  layer trails_detail: name, kind, cls, surf, src, date
  manifest entries roads_detail and trails_detail (group Access), areas that have been built.
kind (styling key): resource, unclassified, recreation, restricted, service, proposed, other, overgrown (atlas surface overgrown or
  decommissioned), retired (tenure segment RETIRED), pending (tenure segment PENDING), tenure (tenure segment ACTIVE not in the atlas),
  trail.

Usage: python3 scripts/build-roads-detail.py --cache /path/outside/repo --areas B[,A,C...] [--manifest-only]
Python packages: shapely pyproj numpy pmtiles mapbox-vector-tile (write_pmtiles is reused from spots-pipeline.py)
"""
import argparse
import datetime as dt
import gzip
import importlib.util
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[1]
TODAY = dt.date.today().isoformat()
WFS = 'https://openmaps.gov.bc.ca/geo/pub/wfs'
OGL = 'Open Government Licence BC'
PAGE = 5000
TO_ALB = Transformer.from_crs(4326, 3005, always_xy=True).transform
_sp = importlib.util.spec_from_file_location('spots_pipeline', ROOT / 'scripts' / 'spots-pipeline.py')
SP = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(SP)

DRA = 'WHSE_BASEMAPPING.DRA_DGTL_ROAD_ATLAS_MPAR_SP'
SEG = 'WHSE_FOREST_TENURE.FTEN_ROAD_SEGMENT_LINES_SVW'
# road atlas classes the base map already draws clearly (city and highway network): left out
SKIP_CLASS = {'highway', 'freeway', 'expressway', 'arterial', 'collector', 'local', 'ramp', 'lane', 'alleyway', 'driveway',
              'ferry', 'yield', 'strata', 'runway', 'water'}
CLASS_TEXT = {'resource': 'Resource road', 'unclassified': 'Unclassified road', 'recreation': 'Recreation road',
              'restricted': 'Restricted road', 'service': 'Service road', 'proposed': 'Proposed road (may not exist)',
              'trail': 'Trail (road atlas)', 'skid': 'Skid trail', 'trail_skid': 'Skid trail', 'trail_recreation': 'Recreation trail', 'pedestrian': 'Pedestrian path'}
SURF_TEXT = {'paved': 'Paved', 'loose': 'Loose (gravel or dirt)', 'rough': 'Rough', 'overgrown': 'Overgrown',
             'decommissioned': 'Decommissioned', 'seasonal': 'Seasonal', 'unknown': 'Not in data', 'boat': 'Boat access'}


def get(url, tries=6):
    for i in range(tries):
        try:
            return urllib.request.urlopen(url, timeout=600).read()
        except Exception as e:  # network hiccups: retry with backoff
            print('  retry', i + 1, str(e)[:100])
            time.sleep(5 * (i + 1))
    raise RuntimeError('failed: ' + url[:200])


def fetch(cache, layer, box, step, props, cql=None):
    """All features of layer inside box (lon/lat), in step degree tiles, paged; raw pages cached as gzip JSON. Deduped by OBJECTID."""
    d = cache / layer.split('.')[-1]
    d.mkdir(parents=True, exist_ok=True)
    out = {}
    x = box[0]
    while x < box[2] - 1e-9:
        y = box[1]
        while y < box[3] - 1e-9:
            tb = (round(x, 4), round(y, 4), round(min(x + step, box[2]), 4), round(min(y + step, box[3]), 4))
            start = 0
            while True:
                fn = d / f'{tb[0]}_{tb[1]}_{tb[2]}_{tb[3]}_{start}.json.gz'
                if fn.exists():
                    js = json.load(gzip.open(fn, 'rt'))
                else:
                    f = f"BBOX(GEOMETRY,{tb[0]},{tb[1]},{tb[2]},{tb[3]},'EPSG:4326')" + (f' AND {cql}' if cql else '')
                    q = {'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature', 'outputFormat': 'application/json',
                         'srsName': 'EPSG:4326', 'typeName': 'pub:' + layer, 'maxFeatures': str(PAGE), 'startIndex': str(start),
                         'sortBy': 'OBJECTID', 'propertyName': ','.join(props + ['OBJECTID', 'GEOMETRY']), 'CQL_FILTER': f}
                    js = json.loads(get(WFS + '?' + urllib.parse.urlencode(q, safe=":,'()")))
                    json.dump(js, gzip.open(fn, 'wt'))
                fs = js.get('features') or []
                for ft in fs:
                    out[ft['properties'].get('OBJECTID') or ft.get('id')] = ft
                if len(fs) < PAGE:
                    break
                start += PAGE
            y += step
        x += step
    print(f'  {layer}: {len(out)} features in {box}')
    return list(out.values())


def km(gs):
    return sum(shapely.length(shapely.transform(g, lambda c: np.column_stack(TO_ALB(c[:, 0], c[:, 1])))) for g in gs) / 1000


def low(v):
    return str(v).strip().lower() if v not in (None, '') else ''


def build_area(a, box, cache):
    print('area', a, box)
    dra = fetch(cache, DRA, box, 0.25, ['ROAD_NAME_FULL', 'ROAD_CLASS', 'ROAD_SURFACE', 'NUMBER_OF_LANES', 'DATA_CAPTURE_DATE'])
    seg = fetch(cache, SEG, box, 0.5, ['FOREST_FILE_ID', 'ROAD_SECTION_ID', 'MAP_LABEL', 'LIFE_CYCLE_STATUS_CODE', 'RETIREMENT_DATE',
                                         'FILE_TYPE_DESCRIPTION', 'CLIENT_NAME'])
    classes = {}
    roads, rprops, trails, tprops = [], [], [], []
    for ft in dra:
        p = ft['properties']
        c = low(p.get('ROAD_CLASS'))
        classes[c] = classes.get(c, 0) + 1
        if not ft.get('geometry') or c in SKIP_CLASS:
            continue
        g = shape(ft['geometry'])
        s = low(p.get('ROAD_SURFACE'))
        date = str(p.get('DATA_CAPTURE_DATE') or '')[:10] or None
        base = {'name': (p.get('ROAD_NAME_FULL') or '').strip() or None, 'cls': CLASS_TEXT.get(c, c.capitalize() or 'Road'),
                'surf': SURF_TEXT.get(s, s.capitalize() or None) if s else None, 'src': 'BC Digital Road Atlas', 'date': date}
        if c.startswith('trail') or c in ('skid', 'pedestrian'):
            trails.append(g)
            tprops.append(dict(base, kind='trail'))
            continue
        kind = 'overgrown' if s in ('overgrown', 'decommissioned') else (c if c in CLASS_TEXT else 'other')
        lanes = p.get('NUMBER_OF_LANES')
        roads.append(g)
        rprops.append(dict(base, kind=kind, lanes=int(lanes) if lanes else None,
                           status='Overgrown or decommissioned (road atlas surface)' if kind == 'overgrown' else None))
    print('  road atlas classes:', dict(sorted(classes.items(), key=lambda kv: -kv[1])))
    n_dra = len(roads)
    # tenure segments: retired and pending always; active only where the atlas has no line
    tree = shapely.STRtree(np.array([shapely.buffer(shapely.transform(g, lambda c: np.column_stack(TO_ALB(c[:, 0], c[:, 1]))), 20)
                                     for g in roads], dtype=object)) if roads else None
    near = tree.geometries if tree is not None else None
    stat = {}
    for ft in seg:
        p = ft['properties']
        if not ft.get('geometry'):
            continue
        st = low(p.get('LIFE_CYCLE_STATUS_CODE'))
        stat[st] = stat.get(st, 0) + 1
        g = shape(ft['geometry'])
        if st == 'active' and tree is not None:
            ga = shapely.transform(g, lambda c: np.column_stack(TO_ALB(c[:, 0], c[:, 1])))
            idx = tree.query(ga, predicate='intersects')
            if len(idx):
                cov = shapely.length(shapely.intersection(ga, shapely.union_all(near[idx]))) / max(ga.length, 1)
                if cov >= 0.3:
                    continue
        kind = {'retired': 'retired', 'pending': 'pending'}.get(st, 'tenure')
        ret = str(p.get('RETIREMENT_DATE') or '')[:10]
        status = {'retired': f'Retired (forest tenure){" " + ret if ret else ""}: may be deactivated, overgrown or gone',
                  'pending': 'Pending (forest tenure): may not be built yet'}.get(st, 'Active (forest tenure)')
        roads.append(g)
        rprops.append({'name': (p.get('MAP_LABEL') or '').strip() or None, 'kind': kind,
                       'cls': 'Forest tenure road (' + (p.get('FILE_TYPE_DESCRIPTION') or 'road') + ')', 'status': status,
                       'file': p.get('FOREST_FILE_ID'), 'client': (p.get('CLIENT_NAME') or '').title() or None,
                       'src': 'Forest tenure road segments', 'date': TODAY})
    print('  tenure segment status:', stat, '| kept', len(roads) - n_dra)
    adir = ROOT / 'data' / 'layers' / a
    res = {'bbox': list(box)}
    for lid, gs, ps in (('roads_detail', roads, rprops), ('trails_detail', trails, tprops)):
        if not gs:
            res[lid] = None
            continue
        gw = np.array(gs, dtype=object)
        size, nt = SP.write_pmtiles(adir / f'{lid}.pmtiles', gw, ps, lid, minzoom=10, maxzoom=12, tol_units=2)
        kinds = {}
        for g, p in zip(gs, ps):
            kinds[p['kind']] = kinds.get(p['kind'], 0) + 1
        res[lid] = {'bytes': size, 'tiles': nt, 'features': len(gs), 'km': round(km(gs)), 'kinds': kinds,
                    'kmByKind': {k: round(km([g for g, p in zip(gs, ps) if p['kind'] == k])) for k in kinds}}
        print(f'  {lid}: {len(gs)} lines, {res[lid]["km"]} km, {size / 1e6:.2f} MB, {nt} tiles, kinds {kinds}')
    json.dump(res, open(cache / f'stats_{a}.json', 'w'), indent=1)


ABOUT_NOT = ('A line on the map is not a promise the road is open, drivable or legal to drive. Roads can be gated, washed out, '
             'deactivated or inside a motor vehicle closure: check the Motor vehicle closures layer, the synopsis and posted signs.')


def update_manifest(cache):
    mp = ROOT / 'data/layers/manifest.json'
    man = json.load(open(mp))
    stats = {f.stem[6:]: json.load(open(f)) for f in sorted(cache.glob('stats_*.json'))}
    order = [a for a in man['areaBoxes'] if a in stats]

    def size(lid):
        return sum(stats[a][lid]['bytes'] for a in order if stats[a].get(lid))
    dash = ['in', ['get', 'kind'], ['literal', ['retired', 'overgrown', 'pending']]]
    E = [
        {'id': 'roads_detail', 'group': 'Access', 'label': 'Detailed roads (class, surface, status)', 'type': 'line', 'minzoom': 10,
         'paint': {'line-color': ['match', ['get', 'kind'], 'resource', '#6d4c41', 'unclassified', '#9e9d24', 'recreation', '#2e7d32',
                                  'restricted', '#c62828', 'service', '#546e7a', 'proposed', '#90a4ae', 'tenure', '#a1887f',
                                  'retired', '#8d6e63', 'overgrown', '#8d6e63', 'pending', '#90a4ae', '#757575'],
                   'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.9, 14, 2.6]},
         'dashFilter': dash, 'dash': [2, 2], 'dashOpacity': 0.6,
         'legend': [['Resource road', '#6d4c41'], ['Unclassified road', '#9e9d24'], ['Recreation road', '#2e7d32'],
                    ['Restricted road', '#c62828'], ['Service road', '#546e7a'], ['Forest tenure road not in the road atlas', '#a1887f'],
                    ['Dashed, faded: retired, overgrown or decommissioned', '#8d6e63'], ['Dashed grey: proposed or pending (may not exist)', '#90a4ae']],
         'popup': [['Road', 'name'], ['Class', 'cls'], ['Surface', 'surf'], ['Lanes', 'lanes'], ['Status', 'status'], ['File', 'file'],
                   ['Holder', 'client'], ['Source', 'src'], ['Data date', 'date']],
         'labelField': 'name', 'labelMinzoom': 13,
         'source': f'{DRA} (BC Digital Road Atlas: class, surface, lanes) and {SEG} (forest tenure road segments: life cycle status)',
         'about': 'Every mapped resource, unclassified and back road, with its class and surface, plus retired forest roads. ' + ABOUT_NOT,
         'cert': 85, 'legal': False, 'licence': OGL, 'dataDate': TODAY, 'areas': [a for a in order if stats[a].get('roads_detail')], 'file': 'data/layers/{area}/roads_detail.pmtiles', 'bytes': size('roads_detail')},
        {'id': 'trails_detail', 'group': 'Access', 'label': 'Trails and old tracks (road atlas)', 'type': 'line', 'minzoom': 10,
         'paint': {'line-color': '#4e342e', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 14, 1.6], 'line-dasharray': [1.5, 1.5],
                   'line-opacity': 0.85},
         'popup': [['Trail', 'name'], ['Class', 'cls'], ['Surface', 'surf'], ['Source', 'src'], ['Data date', 'date']],
         'labelField': 'name', 'labelMinzoom': 13,
         'source': f'{DRA} (road atlas trail class). OpenStreetMap tracks and paths were not reachable when built',
         'about': 'Trails and old tracks the road atlas maps, beyond the official recreation trails. A trail on the map is not a promise '
                  'it is open, passable or legal to ride: closures, private land and posted signs still apply.',
         'cert': 75, 'legal': False, 'licence': OGL, 'dataDate': TODAY, 'areas': [a for a in order if stats[a].get('trails_detail')], 'file': 'data/layers/{area}/trails_detail.pmtiles', 'bytes': size('trails_detail')},
    ]
    ids = {e['id'] for e in E}
    layers = [l for l in man['layers'] if l.get('id') not in ids]
    at = next((i + 1 for i, l in enumerate(layers) if l.get('id') == 'rec_trails'), len(layers))
    man['layers'] = layers[:at] + E + layers[at:]
    tmp = mp.with_suffix('.tmp')
    json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
    tmp.replace(mp)
    print('manifest:', {e['id']: (e['areas'], e['bytes']) for e in E})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', required=True, help='folder for raw downloads (never inside the repo)')
    ap.add_argument('--areas', default='B')
    ap.add_argument('--manifest-only', action='store_true')
    a = ap.parse_args()
    cache = Path(a.cache)
    cache.mkdir(parents=True, exist_ok=True)
    boxes = json.load(open(ROOT / 'data/layers/manifest.json'))['areaBoxes']
    if not a.manifest_only:
        for ar in a.areas.split(','):
            build_area(ar, boxes[ar], cache)
    update_manifest(cache)


if __name__ == '__main__':
    main()
