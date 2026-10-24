#!/usr/bin/env python3
"""Hunt Mentor: Crown land, Crown tenures and "Likely open to hunt" map layers, region by region, all of BC.

Sources (BC Geographic Warehouse WFS, openmaps.gov.bc.ca, Open Government Licence BC):
  WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW            ParcelMap BC parcels (OWNER_TYPE, PARCEL_CLASS)
  WHSE_TANTALIS.TA_CROWN_TENURES_SVW                   Crown land tenures (leases, licences of occupation, rights of way, ...)
  WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW                  provincial parks, ecological reserves, protected areas
  WHSE_ADMIN_BOUNDARIES.CLAB_NATIONAL_PARKS            national parks
  WHSE_ADMIN_BOUNDARIES.CLAB_INDIAN_RESERVES           Indian Reserves
  WHSE_LEGAL_ADMIN_BOUNDARIES.FNT_TREATY_LAND_SP       treaty settlement lands
  WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP   municipalities (city, town and village limits)
  WHSE_BASEMAPPING.NTS_BC_COASTLINE_POLYS_125M         BC land and islands at 1:125,000 (land mask, so the sea is never called Crown land)
  WHSE_TANTALIS.TA_CONSERVANCY_AREAS_SVW               conservancies (treated like parks)
  WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW MUs (Management Units), grouped into hunting regions
Plus the app's own no shooting / no hunting layer (data/layers/bc/no_hunting.geojson, scripts/build-noshoot.py).

Classes (layer crown_land, property cls):
  crown    parcel with OWNER_TYPE Crown Provincial or Untitled Provincial (not a road or right of way parcel)
  federal  parcel with OWNER_TYPE Federal: CHECK (federal land has its own rules)
  likely   land inside the province outline that is NOT inside any parcel (any owner), reserve, treaty land, park,
           national park or municipality. Gaps narrower than 50 m (road allowances, slivers) and pieces under 5 ha are dropped.
           "Likely Crown land (no titled parcel)": most BC Crown land is unsurveyed and has no parcel. 80%.
           Lakes, wide rivers and reservoirs of 2 ha or more (FWA_LAKES_POLY, FWA_RIVERS_POLY, FWA_MANMADE_WATERBODIES_POLY) are cut out
           of this class and of hunt_likely open (the 1:125,000 land mask includes lakes).
  Parks, reserves, treaty lands and national parks are never drawn as Crown land (they have their own layers and rules).
Layer crown_tenures: TA_CROWN_TENURES_SVW, stage TENURE, in good standing, not RESERVE/NOTATION (government reserves and
  notations are not leases or licences), where it touches the land above (kind, type, purpose).
Layer hunt_likely (derived): cls open = crown or likely land, minus no_hunting areas, municipalities, tenures and federal land;
  cls check = tenures (on Crown land), federal land, and provincial parks and protected areas (rules differ by park; ecological
  reserves are already closed in no_hunting). Motor vehicle closures are not cut out: they limit vehicles, not hunting.

Outputs: data/layers/crown/<region>/{crown_land,crown_tenures,hunt_likely}.pmtiles and the three manifest entries.
Cache: raw downloads go to --cache (outside the repo); parcel pages are reduced per tile and deleted as it goes.

Usage: python3 scripts/build-crown.py --cache /path/outside/repo --regions 3 [--regions 3,8,...] [--manifest-only]
       --cut-water --regions 1,2,...: cut water out of the existing PMTiles only (no parcel download; 2026-10-17)
       --range: Range Act tenures (WHSE_FOREST_TENURE.FTEN_RANGE_POLY_SVW, active) -> data/layers/bc/range_tenures.pmtiles (2026-10-17)
Python packages: shapely pyproj numpy pmtiles mapbox-vector-tile (write_pmtiles is reused from spots-pipeline.py)
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import importlib.util
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

import shapely
from pyproj import Transformer
from shapely import wkb
from shapely.geometry import box, shape
from shapely.ops import transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
TODAY = dt.date.today().isoformat()
WFS = 'https://openmaps.gov.bc.ca/geo/pub/wfs'
OGL = 'Open Government Licence BC'
TO_WGS = Transformer.from_crs(3005, 4326, always_xy=True).transform
TO_ALB = Transformer.from_crs(4326, 3005, always_xy=True).transform
SYN = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028'
REGIONS = ['3', '8', '2', '4', '5', '1', '7A', '7B', '6']
TILE = 0.25          # degrees, parcel download tiles
OPEN_M = 25          # opening radius: gaps narrower than 2 x 25 m are not "likely Crown"
MIN_HA = 5           # likely Crown pieces under this are dropped
CROWN_OWNERS = ('Crown Provincial', 'Untitled Provincial')
SKIP_CLASS = ('Building Strata', 'Air Space', 'Interest')        # these sit on top of other parcels
NOT_LAND_CLASS = ('Road', 'Right of Way')                         # Crown road parcels: not drawn as Crown land
PAGE = 5000
MAXZ = 11            # PMTiles max zoom: MapLibre overzooms, 11 keeps about 5 m detail and halves the files

_sp = importlib.util.spec_from_file_location('spots_pipeline', ROOT / 'scripts' / 'spots-pipeline.py')
SP = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(SP)


def get(url, tries=6):
    for i in range(tries):
        try:
            return urllib.request.urlopen(url, timeout=600).read()
        except Exception as e:  # network hiccups: retry with backoff
            print('  retry', i + 1, str(e)[:80])
            time.sleep(5 * (i + 1))
    raise RuntimeError('failed: ' + url[:200])


def wfs(layer, cql=None, props=None, start=0, count=PAGE, sort='OBJECTID'):
    q = {'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'outputFormat': 'application/json',
         'srsName': 'EPSG:3005', 'typeNames': f'pub:{layer}', 'count': str(count)}
    if start:
        q['startIndex'] = str(start)
    if sort:
        q['sortBy'] = sort
    if cql:
        q['CQL_FILTER'] = cql
    if props:
        q['propertyName'] = ','.join(props)
    return json.loads(get(f'{WFS}?{urllib.parse.urlencode(q)}'))


def wfs_all(layer, cql=None, props=None, sort='OBJECTID', count=PAGE):
    out, start = [], 0
    while True:
        d = wfs(layer, cql, props, start, count, sort)
        fs = d.get('features') or []
        out += fs
        if len(fs) < count:
            return out
        start += count


def cached(cache, key, layer, cql=None, props=None, sort='OBJECTID'):
    f = cache / f'{key}.json'
    if f.exists():
        return json.load(open(f))
    print('fetch', key)
    fs = wfs_all(layer, cql, props, sort)
    json.dump(fs, open(f, 'w'))
    return fs


def geoms(fs):
    out = []
    for ft in fs:
        if ft.get('geometry'):
            g = shapely.make_valid(shape(ft['geometry']))
            out.append((g, ft.get('properties') or {}))
    return out


def polys(g):
    """Polygon parts only (make_valid and difference can leave lines and points)."""
    if g is None or g.is_empty:
        return shapely.Polygon()
    if g.geom_type in ('Polygon', 'MultiPolygon'):
        return g
    ps = [x for x in getattr(g, 'geoms', []) if x.geom_type in ('Polygon', 'MultiPolygon')]
    return unary_union(ps) if ps else shapely.Polygon()


def _safe(op):
    """GEOS overlay that retries on a 1 cm grid when the plain overlay hits a topology error (parcel slivers)."""
    def f(a, b):
        try:
            return op(a, b)
        except shapely.errors.GEOSException:
            return op(polys(shapely.make_valid(a)), polys(shapely.make_valid(b)), grid_size=0.01)
    return f


INT, DIFF = _safe(shapely.intersection), _safe(shapely.difference)


def UNION(gs):
    try:
        return unary_union(gs)
    except shapely.errors.GEOSException:
        return shapely.union_all([polys(shapely.make_valid(g)) for g in gs], grid_size=0.01)


# ---------- BC wide inputs ----------
def bc_inputs(cache):
    mu = cached(cache, 'mu', 'WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW', props=['WILDLIFE_MGMT_UNIT_ID', 'GEOMETRY'])
    reg_of = {}
    for f in sorted((ROOT / 'data/layers/bc/mu').glob('region_*.geojson')):
        for ft in json.load(open(f))['features']:
            reg_of[ft['properties']['MU']] = str(ft['properties']['region']).upper()
    regions = {}
    for g, p in geoms(mu):
        r = reg_of.get(p['WILDLIFE_MGMT_UNIT_ID'])
        if r:
            regions.setdefault(r, []).append(g)
    regions = {r: unary_union(v) for r, v in regions.items()}
    prov = [g for g, _ in geoms(cached(cache, 'land', 'WHSE_BASEMAPPING.NTS_BC_COASTLINE_POLYS_125M', props=['QCST_TAG', 'GEOMETRY']))]
    cons = geoms(cached(cache, 'conservancies', 'WHSE_TANTALIS.TA_CONSERVANCY_AREAS_SVW', sort=None))
    parks = geoms(cached(cache, 'parks', 'WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW',
                         props=['PROTECTED_LANDS_NAME', 'PROTECTED_LANDS_DESIGNATION', 'SHAPE']))
    nat = geoms(cached(cache, 'natparks', 'WHSE_ADMIN_BOUNDARIES.CLAB_NATIONAL_PARKS', props=['ENGLISH_NAME', 'GEOMETRY']))
    res = geoms(cached(cache, 'reserves', 'WHSE_ADMIN_BOUNDARIES.CLAB_INDIAN_RESERVES', props=['ENGLISH_NAME', 'GEOMETRY']))
    tre = geoms(cached(cache, 'treaty', 'WHSE_LEGAL_ADMIN_BOUNDARIES.FNT_TREATY_LAND_SP', sort=None))
    muni = geoms(cached(cache, 'municipalities', 'WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP', props=['ADMIN_AREA_NAME', 'SHAPE']))
    nh = []
    for ft in json.load(open(ROOT / 'data/layers/bc/no_hunting.geojson'))['features']:
        nh.append(transform(TO_ALB, shapely.make_valid(shape(ft['geometry']))))
    return {
        'regions': regions, 'prov': prov,
        'excl': [g for g, _ in parks] + [g for g, _ in cons] + [g for g, _ in nat] + [g for g, _ in res] + [g for g, _ in tre],
        'parks_open': [g for g, p in parks if p.get('PROTECTED_LANDS_DESIGNATION') != 'ECOLOGICAL RESERVE'] + [g for g, _ in cons],
        'muni': [g for g, _ in muni], 'nohunt': nh,
    }


class Index:
    def __init__(self, gs):
        self.gs = [g for g in gs if g is not None and not g.is_empty]
        self.t = shapely.STRtree(self.gs)

    def union_in(self, b):
        idx = self.t.query(b, predicate='intersects')
        return UNION([INT(self.gs[i], b) for i in idx]) if len(idx) else shapely.Polygon()


# ---------- per tile ----------
def tile_boxes(region_alb):
    w, s, e, n = transform(TO_WGS, region_alb).bounds
    out = []
    x = int(w / TILE) * TILE - TILE
    while x < e:
        y = int(s / TILE) * TILE - TILE
        while y < n:
            out.append((round(x, 4), round(y, 4), round(x + TILE, 4), round(y + TILE, 4)))
            y += TILE
        x += TILE
    return out


def parcels(tb):
    bb = f"BBOX(SHAPE,{tb[0]},{tb[1]},{tb[2]},{tb[3]},'EPSG:4326')"
    skip = "PARCEL_CLASS NOT IN ('" + "','".join(SKIP_CLASS) + "')"
    a = wfs_all('WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW', f"{bb} AND MUNICIPALITY='Rural' AND {skip}",
                ['OWNER_TYPE', 'PARCEL_CLASS', 'SHAPE'])
    b = wfs_all('WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW',
                f"{bb} AND MUNICIPALITY<>'Rural' AND OWNER_TYPE IN ('Crown Provincial','Untitled Provincial','Federal') AND {skip}",
                ['OWNER_TYPE', 'PARCEL_CLASS', 'SHAPE'])
    return geoms(a), geoms(b)


def do_tile(tb, region, X, cache_dir):
    out_f = cache_dir / f'{tb[0]}_{tb[1]}.wkb.json'
    if out_f.exists():
        return json.load(open(out_f))
    t_alb = transform(TO_ALB, box(*tb))
    land = polys(INT(INT(t_alb, region), X['prov_i'].union_in(t_alb)))
    if land.is_empty:
        json.dump({}, open(out_f, 'w'))
        return {}
    rural, muni_crown = parcels(tb)
    allp = [g for g, _ in rural]
    crown = [g for g, p in rural + muni_crown if p.get('OWNER_TYPE') in CROWN_OWNERS and p.get('PARCEL_CLASS') not in NOT_LAND_CLASS]
    fed = [g for g, p in rural + muni_crown if p.get('OWNER_TYPE') == 'Federal' and p.get('PARCEL_CLASS') not in NOT_LAND_CLASS]
    big = t_alb.buffer(4 * OPEN_M)
    excl = X['excl_i'].union_in(big)
    muni = X['muni_i'].union_in(big)
    fedU = UNION(fed) if fed else shapely.Polygon()
    crown_t = polys(INT(DIFF(DIFF(UNION(crown), fedU), excl), land)) if crown else shapely.Polygon()
    fed_t = polys(INT(DIFF(fedU, excl), land))
    # likely Crown: land with no parcel of any owner, outside reserves, treaty lands, parks and municipalities
    land_big = polys(INT(INT(big, region), X['prov_i'].union_in(big)))
    gap = DIFF(land_big, UNION(allp + [excl, muni]))
    gap = polys(gap).buffer(-OPEN_M, join_style='mitre').buffer(OPEN_M, join_style='mitre')
    gap = polys(INT(gap, land))
    gap = unary_union([p for p in getattr(gap, 'geoms', [gap]) if p.area >= MIN_HA * 1e4]) if not gap.is_empty else gap
    res = {k: wkb.dumps(v, hex=True) for k, v in (('crown', crown_t), ('federal', fed_t), ('likely', polys(gap))) if not v.is_empty}
    res['n'] = len(allp) + len(muni_crown)
    json.dump(res, open(out_f, 'w'))
    return res


# ---------- water (lakes, wide rivers, reservoirs) ----------
# The land mask (1:125,000 coastline) includes lakes, so the derived "likely" class and hunt_likely "open" used to cover them.
# Water is cut out of those two classes (parcel classes and "check" classes are left as they are).
WATER_LAYERS = (('lakes', 'WHSE_BASEMAPPING.FWA_LAKES_POLY'), ('rivers', 'WHSE_BASEMAPPING.FWA_RIVERS_POLY'),
                ('manmade', 'WHSE_BASEMAPPING.FWA_MANMADE_WATERBODIES_POLY'))
WATER_MIN_HA = 2     # smaller ponds are a few pixels at zoom 11 (my pick; 1 ha made Region 2 files 7% bigger again)
WATER_SIMPLIFY = 5   # metres, well inside the 1:20,000 Freshwater Atlas accuracy
WATER_PAGE = 2000
WATER_PX = 3        # my pick: a lake under about 3 by 3 pixels stays green below the top zoom (file size)
WATER_TOL = (3, 8)  # simplify water by this many tile units at the top zoom (about 15 m) and below it (1 pixel); my pick, for file size
WATER_NOTE = '; lakes, wide rivers and reservoirs (WHSE_BASEMAPPING.FWA_LAKES_POLY, FWA_RIVERS_POLY, FWA_MANMADE_WATERBODIES_POLY) cut out'


def water(cache):
    """All BC water polygons of WATER_MIN_HA or more, in BC Albers, simplified. Raw pages are never written to disk:
    each page is reduced to simplified WKB as it arrives (cache/water_<key>.wkb.json)."""
    out = []
    for key, layer in WATER_LAYERS:
        f = cache / f'water_{key}.wkb.json'
        if not f.exists():
            cql = f'AREA_HA>={WATER_MIN_HA}'
            hits = int(get(f"{WFS}?{urllib.parse.urlencode({'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'resultType': 'hits', 'typeNames': f'pub:{layer}', 'CQL_FILTER': cql})}")
                       .decode().split('numberMatched="')[1].split('"')[0])
            print(f'fetch water {key}: {hits} polygons')

            def page(start):
                fs = wfs(layer, cql, ['AREA_HA', 'GEOMETRY'], start, WATER_PAGE).get('features') or []
                hx = []
                for g, _ in geoms(fs):
                    g = polys(g.simplify(WATER_SIMPLIFY, preserve_topology=True))
                    if not g.is_empty:
                        hx.append(wkb.dumps(g, hex=True))
                return hx
            allhx = []
            for i, start in enumerate(range(0, hits, WATER_PAGE)):   # one request at a time (the server pool is small)
                allhx += page(start)
                print(f'  {key} page {i + 1}/{-(-hits // WATER_PAGE)}', flush=True)
            json.dump(allhx, open(f, 'w'))
        out += [g for g in (wkb.loads(h, hex=True) for h in json.load(open(f))) if g.area >= WATER_MIN_HA * 1e4]
    print(f'water: {len(out)} polygons')
    return out


def cut_water_pmtiles(path, cls_value, wtree, wgeoms_merc, patch=None):
    """Rewrite one PMTiles file in place: in every tile, features whose cls is cls_value lose the water polygons.
    Works on the stored tiles (each zoom keeps its own simplification), so the parcel download is not needed again."""
    import gzip
    import mapbox_vector_tile
    import numpy as np
    from pmtiles.reader import MmapSource, Reader, all_tiles
    from pmtiles.tile import zxy_to_tileid
    from pmtiles.writer import Writer
    path = Path(path)
    with open(path, 'rb') as fh:
        src = MmapSource(fh)
        rd = Reader(src)
        header, meta = rd.header(), rd.metadata()
        maxz = header['max_zoom']
        tiles, cut = {}, 0
        for (z, x, y), data in all_tiles(src):
            raw = gzip.decompress(data)
            size = 2 * SP.WORLD / 2 ** z
            minx, maxy = -SP.WORLD + x * size, SP.WORLD - y * size
            tb = (minx, maxy - size, minx + size, maxy)
            buf = size * 64 / 4096
            clip = box(tb[0] - buf, tb[1] - buf, tb[2] + buf, tb[3] + buf)
            idx = wtree.query(clip, predicate='intersects')
            dec = mapbox_vector_tile.decode(raw, default_options={'y_coord_down': False})
            has = any(f['properties'].get('cls') == cls_value for L in dec.values() for f in L['features'])
            if not has or (not len(idx) and not patch):
                tiles[zxy_to_tileid(z, x, y)] = data
                continue
            unit = size / 4096
            w = shapely.clip_by_rect(UNION([wgeoms_merc[i] for i in idx]), *clip.bounds) if len(idx) else shapely.Polygon()
            if not w.is_empty:   # tile units: 1 is about 5 m at zoom 11 (keeps files small; the likely class is 15 m simplified)
                w = w.simplify(unit * (WATER_TOL[0] if z == maxz else WATER_TOL[1]), preserve_topology=True)
            # to tile units (0..4096, y up), the same frame decode returns
            w = shapely.transform(w, lambda c: np.column_stack([(c[:, 0] - tb[0]) / unit, (c[:, 1] - tb[1]) / unit]))
            w = polys(shapely.make_valid(w))
            if z < maxz and not w.is_empty:   # below the top zoom, water smaller than WATER_PX screen pixels is not drawn (8 units a pixel)
                w = unary_union([q for q in getattr(w, 'geoms', [w]) if q.area >= (8 * WATER_PX) ** 2]) if WATER_PX else w
            layers = []
            for name, L in dec.items():
                feats = []
                for f in L['features']:
                    g = shape(f['geometry'])
                    pr = f['properties']
                    if pr.get('cls') == cls_value:
                        pr = dict(pr, **(patch or {}))
                        if g.geom_type in ('Polygon', 'MultiPolygon') and not w.is_empty:
                            g = polys(DIFF(shapely.make_valid(g), w))
                            if z < maxz:   # same small piece rule as write_pmtiles (drop_units 6)
                                g = unary_union([p for p in getattr(g, 'geoms', [g]) if p.area >= 36]) if not g.is_empty else g
                            cut += 1
                    if g.is_empty:
                        continue
                    feats.append({'geometry': g, 'properties': pr})
                if feats:
                    layers.append({'name': name, 'features': feats})
            if layers:
                tiles[zxy_to_tileid(z, x, y)] = gzip.compress(mapbox_vector_tile.encode(
                    layers, default_options={'quantize_bounds': (0, 0, 4096, 4096), 'extents': 4096, 'y_coord_down': False}))
    tmp = path.with_suffix('.tmp')
    with open(tmp, 'wb') as fo:
        wr = Writer(fo)
        for tid in sorted(tiles):
            wr.write_tile(tid, tiles[tid])
        wr.finalize({k: header[k] for k in ('tile_type', 'tile_compression', 'min_zoom', 'max_zoom', 'min_lon_e7', 'min_lat_e7',
                                              'max_lon_e7', 'max_lat_e7', 'center_zoom', 'center_lon_e7', 'center_lat_e7')}, meta)
    before = path.stat().st_size
    tmp.replace(path)
    return before, path.stat().st_size, len(tiles), cut


def cut_water_region(r, wtree, wgeoms_merc, cache):
    out = ROOT / 'data/layers/crown' / r.lower()
    res = {}
    for lid, cls, patch in (('crown_land', 'likely', {'how': PROPS['likely']['how']}), ('hunt_likely', 'open', {'how': HL_HOW_OPEN})):
        t0 = time.time()
        res[lid] = cut_water_pmtiles(out / f'{lid}.pmtiles', cls, wtree, wgeoms_merc, patch)
        print(f'Region {r} {lid}: {res[lid][0]} -> {res[lid][1]} bytes, {res[lid][2]} tiles, {res[lid][3]} features cut, {time.time() - t0:.0f} s')
    sf = cache / f'stats_{r}.json'
    st = json.load(open(sf)) if sf.exists() else None
    if st:
        for lid in res:
            st[lid] = [res[lid][1], res[lid][2]]
        st['water'] = TODAY
        json.dump(st, open(sf, 'w'))
    return res


# ---------- outputs ----------
RULE_CROWN = ('On Crown land the open seasons apply (synopsis page 11, 99%). Hunting is usually allowed in an open season '
              'unless a closure, park, No Shooting Area, posted sign or town bylaw says no (Rule Book: where you can hunt, 85%, my reading).')
RULE_GRAZE = ('“A person is not permitted to hunt on cultivated land or on Crown land which is subject to a grazing lease while the land '
              'is occupied by livestock, without the consent of the owner, lessee, or occupant of the land.” “Note: leased land is subject '
              'to the Trespass Act, regardless of whether livestock are present.” (synopsis page 9, 99%)')
RULE_TEN = ('Crown land with a tenure: hunting is often allowed, but buildings, fences, posted areas and the 100 m dwelling rule '
            '(synopsis page 10) may apply: CHECK. Leased land is subject to the Trespass Act (synopsis page 9, 99%).')
RULE_FED = ('Federal land: CHECK. Hunting is prohibited in National Wildlife Areas and Migratory Bird Sanctuaries unless a federal '
            'permit or posted notice allows it (synopsis page 9, 99%). Other federal land (for example defence land) has its own rules: VERIFY.')
PROPS = {
    'crown': {'land': 'Crown land (provincial)', 'how': 'ParcelMap BC parcel, owner type Crown Provincial or Untitled Provincial',
              'cert': 90, 'rule': RULE_CROWN},
    'federal': {'land': 'Federal land: CHECK', 'how': 'ParcelMap BC parcel, owner type Federal', 'cert': 90, 'rule': RULE_FED},
    'likely': {'land': 'Likely Crown land (no titled parcel)', 'cert': 80, 'rule': RULE_CROWN,
               'how': 'Derived: inside BC and not inside any ParcelMap BC parcel, reserve, treaty land, park or municipality. '
                      'Most BC Crown land is unsurveyed, so it has no parcel. Gaps under 50 m wide (road allowances) and pieces under 5 ha are left out. '
                      'Lakes, wide rivers and reservoirs of 2 ha or more (Freshwater Atlas) are left out.'},
}


HL_HOW_OPEN = ('Derived from Crown land (parcel and likely), minus mapped no hunting / no shooting areas, towns, tenures and federal land. '
               'Lakes, wide rivers and reservoirs of 2 ha or more (Freshwater Atlas) are left out. '
               'Motor vehicle closures are not cut out: they limit vehicles, not hunting. Most No Shooting Areas are not drawn.')


def tenure_kind(p):
    t, s = (p.get('TENURE_TYPE') or '').upper(), (p.get('TENURE_SUBPURPOSE') or '').upper()
    if 'GRAZ' in s or 'GRAZ' in (p.get('TENURE_SUBTYPE') or '').upper():
        return 'grazing'
    return {'LEASE': 'lease', 'LICENCE': 'licence', 'RIGHT-OF-WAY': 'row', 'PERMIT': 'permit'}.get(t, 'other')


KIND_WORD = {'grazing': 'Grazing lease or licence (Land Act tenure)', 'lease': 'Lease', 'licence': 'Licence of occupation or other licence',
             'row': 'Right of way or easement', 'permit': 'Permit', 'other': 'Other tenure'}
CHECK_KINDS = {'grazing', 'lease', 'licence', 'permit'}   # rights of way (power lines, pipelines) stay "open" in hunt_likely


def cap(s):
    s = (s or '').strip().lower()
    return s[:1].upper() + s[1:]


def write(path, items, lid, minzoom=8, tol=8, maxzoom=MAXZ):
    gs, ps = [], []
    for g, p in items:
        if g is None or g.is_empty:
            continue
        g = polys(g.simplify(tol, preserve_topology=True))
        for part in getattr(g, 'geoms', [g]):
            if part.area < 2000:
                continue
            gs.append(transform(TO_WGS, part))
            ps.append(p)
    if not gs:
        return 0, 0
    size, n = SP.write_pmtiles(path, gs, ps, lid, minzoom=minzoom, maxzoom=maxzoom, tol_units=2, drop_units=6)
    return size, n


def build_region(r, X, cache):
    region = X['regions'][r]
    tdir = cache / 'tiles' / r
    tdir.mkdir(parents=True, exist_ok=True)
    tiles = [tb for tb in tile_boxes(region) if transform(TO_ALB, box(*tb)).intersects(region)]
    print(f'Region {r}: {len(tiles)} tiles')
    t0 = time.time()
    acc = {'crown': [], 'federal': [], 'likely': []}
    n = 0
    with cf.ThreadPoolExecutor(4) as ex:
        futs = {ex.submit(do_tile, tb, region, X, tdir): tb for tb in tiles}
        for i, fu in enumerate(cf.as_completed(futs)):
            res = fu.result()
            for k in acc:
                if res.get(k):
                    acc[k].append(wkb.loads(res[k], hex=True))
            n += res.get('n', 0)
            if i % 25 == 0:
                print(f'  {i + 1}/{len(tiles)} tiles, {n} parcels, {time.time() - t0:.0f} s')
    U = {k: polys(shapely.union_all(shapely.make_valid(v), grid_size=0.01)) if v else shapely.Polygon() for k, v in acc.items()}
    for k in U:
        U[k] = polys(shapely.make_valid(U[k]))
    # the derived class follows the 1:125,000 coastline and 50 m gaps: 15 m simplification is well inside its accuracy (keeps files small)
    U['likely'] = polys(shapely.make_valid(U['likely'].simplify(15, preserve_topology=True)))
    wat = polys(X['water_i'].union_in(region))
    U['likely'] = polys(DIFF(U['likely'], wat))
    crownish = UNION([U['crown'], U['likely']])
    # tenures, clipped to Crown land (provincial, likely and federal)
    rw = transform(TO_WGS, region).bounds
    tf = wfs_all('WHSE_TANTALIS.TA_CROWN_TENURES_SVW',
                 f"TENURE_STAGE='TENURE' AND TENURE_STATUS='DISPOSITION IN GOOD STANDING' AND TENURE_TYPE<>'RESERVE/NOTATION' AND BBOX(SHAPE,{rw[0]},{rw[1]},{rw[2]},{rw[3]},'EPSG:4326')",
                 ['TENURE_TYPE', 'TENURE_SUBTYPE', 'TENURE_PURPOSE', 'TENURE_SUBPURPOSE', 'TENURE_EXPIRY', 'SHAPE'])
    landU = UNION([crownish, U['federal']])
    lt = Index([landU]) if not landU.is_empty else None
    ten = []
    for g, p in geoms(tf):
        if not g.intersects(region) or lt is None:
            continue
        g = polys(INT(g, region))
        if g.is_empty or g.area < 2000 or not lt.t.query(g, predicate='intersects').size:
            continue
        k = tenure_kind(p)
        exp = (p.get('TENURE_EXPIRY') or '')[:10]
        ten.append((g, {'kind': k, 'tenure': KIND_WORD[k], 'type': cap(p.get('TENURE_SUBTYPE') or p.get('TENURE_TYPE')),
                        'purpose': ' / '.join(x for x in (cap(p.get('TENURE_PURPOSE')), cap(p.get('TENURE_SUBPURPOSE'))) if x),
                        'expiry': '' if exp.startswith('9999') else exp,
                        'rule': RULE_GRAZE if k == 'grazing' else RULE_TEN, 'cert': 90, 'certText': '90%',
                        'how': 'TA_CROWN_TENURES_SVW, stage TENURE, in good standing. Shown where it touches Crown land in this layer set.'}))
    print(f'  {len(ten)} tenures')
    # hunt_likely
    big = box(*region.bounds)
    cut = lambda gs: Index(gs).union_in(big) if gs else shapely.Polygon()
    nohunt, muni = cut(X['nohunt']), cut(X['muni'])
    tchk = UNION([g for g, p in ten if p['kind'] in CHECK_KINDS]) if ten else shapely.Polygon()
    parks = polys(INT(INT(cut(X['parks_open']), region), X['prov_i'].union_in(big)))
    open_ = polys(DIFF(crownish, UNION([nohunt, muni, tchk, U['federal'], wat])))
    chk_t = polys(DIFF(INT(crownish, tchk), UNION([nohunt, muni])))
    chk_p = polys(DIFF(parks, nohunt))
    chk_f = polys(DIFF(U['federal'], UNION([nohunt, muni])))
    # files
    out = ROOT / 'data/layers/crown' / r.lower()
    out.mkdir(parents=True, exist_ok=True)
    stats = {}
    base = {'src': 'ParcelMap BC (WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW)', 'date': TODAY}
    items = [(U[k], dict(base, cls=k, certText=f"{PROPS[k]['cert']}%", **PROPS[k])) for k in ('crown', 'federal', 'likely')]
    stats['crown_land'] = write(out / 'crown_land.pmtiles', items, 'crown_land')
    stats['crown_tenures'] = write(out / 'crown_tenures.pmtiles', ten, 'crown_tenures', minzoom=9, tol=10)
    items = [
        (open_, {'cls': 'open', 'land': 'Likely open to hunt (check season, MU and signs)', 'cert': 75, 'certText': '75%',
                 'how': HL_HOW_OPEN,
                 'rule': RULE_CROWN, 'date': TODAY}),
        (chk_t, {'cls': 'check', 'land': 'Check first: Crown land with a tenure', 'cert': 90, 'certText': '90%', 'how': 'TA_CROWN_TENURES_SVW on Crown land',
                 'rule': RULE_TEN, 'date': TODAY}),
        (chk_f, {'cls': 'check', 'land': 'Check first: federal land', 'cert': 90, 'certText': '90%', 'how': 'ParcelMap BC owner type Federal',
                 'rule': RULE_FED, 'date': TODAY}),
        (chk_p, {'cls': 'check', 'land': 'Check first: park or protected area', 'cert': 95, 'certText': '95%', 'how': 'TA_PARK_ECORES_PA_SVW',
                 'rule': 'Hunting rules differ by park. Some allow hunting, some do not. Check BC Parks and the synopsis (page 9).', 'date': TODAY}),
    ]
    stats['hunt_likely'] = write(out / 'hunt_likely.pmtiles', items, 'hunt_likely')
    area = lambda g: round(g.area / 1e4)
    stats['ha'] = {k: area(v) for k, v in U.items()}
    stats['ha'].update({'open': area(open_), 'check_tenure': area(chk_t), 'check_parks': area(chk_p)})
    stats['bbox'] = [round(x, 4) for x in transform(TO_WGS, region).bounds]
    stats['parcels'] = n
    print(f'Region {r} done in {time.time() - t0:.0f} s:', json.dumps(stats))
    json.dump(stats, open(cache / f'stats_{r}.json', 'w'))
    return stats


# ---------- Range Act tenures (grazing and hay cutting licences and permits), all of BC ----------
RANGE_LAYER = 'WHSE_FOREST_TENURE.FTEN_RANGE_POLY_SVW'
RANGE_FILE = 'data/layers/bc/range_tenures.pmtiles'
RANGE_TOL = 20             # metres: range lines are drawn coarsely (often along creeks and ridges); with max zoom 10 keeps the file small (my pick)
RANGE_COLOUR = '#827717'   # olive: not used by any other layer (owner rule 2026-10-16, every layer its own colour)
# FILE_TYPE_CODE words from the dataset column notes (BC Data Catalogue, Range Tenure Polygons, read 2026-10-17)
RANGE_TYPES = {'E01': ('grazing', 'Grazing licence (Range Act)'), 'E02': ('grazing', 'Grazing permit (Range Act)'),
               'E03': ('grazing', 'Non replaceable grazing permit (Range Act)'), 'H01': ('hay', 'Hay cutting licence (Range Act)'),
               'H02': ('hay', 'Hay cutting permit (Range Act)'), 'H03': ('hay', 'Non replaceable hay cutting permit (Range Act)')}
RANGE_RULE = ('“A person is not permitted to hunt on cultivated land or on Crown land which is subject to a grazing lease while the land '
              'is occupied by livestock, without the consent of the owner, lessee, or occupant of the land.” (synopsis page 9, 99%)')
RANGE_VERIFY = ('VERIFY: a Range Act grazing licence or permit may not be a “grazing lease” in this rule (a lease is a different kind of tenure). '
                'Ask FrontCounter BC or a conservation officer. Tip: if cattle are on it, ask the tenure holder or the district office first.')
RANGE_HOW = ('FTEN_RANGE_POLY_SVW, active tenures only, merged by type and district. Range tenures apply only to Crown land: where a line '
             'crosses private land, that private land is not part of the grazing area, and grazing can reach into lakes at low water '
             '(dataset notes). Tenure holder names are left out.')


def build_range(cache):
    f = cache / 'range.json'
    if not f.exists():
        print('fetch range tenures')
        fs = wfs_all(RANGE_LAYER, "LIFE_CYCLE_STATUS_CODE='ACTIVE'", ['FOREST_FILE_ID', 'FILE_TYPE_CODE', 'ADMIN_DISTRICT_NAME', 'GEOMETRY'])
        json.dump(fs, open(f, 'w'))
    groups = {}
    for g, p in geoms(json.load(open(f))):
        t = RANGE_TYPES.get(p.get('FILE_TYPE_CODE'))
        if not t:
            continue
        g = polys(g.simplify(RANGE_TOL, preserve_topology=True))
        groups.setdefault((p['FILE_TYPE_CODE'], p.get('ADMIN_DISTRICT_NAME') or ''), []).append(g)
    items = []
    for (code, dist), gs in sorted(groups.items()):
        kind, word = RANGE_TYPES[code]
        items.append((polys(UNION(gs)), {'kind': kind, 'tenure': word, 'district': dist, 'n': len(gs), 'rule': RANGE_RULE, 'verify': RANGE_VERIFY,
                                         'how': RANGE_HOW, 'cert': 90, 'certText': '90%', 'src': RANGE_LAYER, 'date': TODAY}))
    print(f'range tenures: {sum(len(v) for v in groups.values())} polygons in {len(items)} groups')
    size, n = write(ROOT / RANGE_FILE, items, 'range_tenures', minzoom=8, tol=RANGE_TOL, maxzoom=10)  # overzoomed past 10: about 10 m detail
    bb = shapely.total_bounds([transform(TO_WGS, g) for g, _ in items])
    mp = ROOT / 'data/layers/manifest.json'
    man = json.load(open(mp))
    E = {'id': 'range_tenures', 'group': 'Land status', 'label': 'Range tenures (grazing, Range Act)', 'type': 'fill', 'minzoom': 8,
         'paint': {'fill-color': RANGE_COLOUR, 'fill-opacity': 0.06}, 'hatch': RANGE_COLOUR,
         'legend': [['Grazing or hay cutting licence or permit (Range Act)', RANGE_COLOUR]],
         'popup': [['Range tenure', 'tenure'], ['District', 'district'], ['Rule', 'rule'], ['Check', 'verify'], ['How we know', 'how'],
                   ['Certainty', 'certText'], ['Data date', 'date']],
         'source': f'{RANGE_LAYER} (Range tenures, active)', 'licence': OGL, 'dataDate': TODAY, 'cert': 90,
         'about': 'Crown land where someone holds a Range Act grazing or hay cutting licence or permit. Cattle may be out. Respect gates and fences.',
         'areas': 'BC', 'bytes': size, 'files': [{'area': 'BC', 'file': RANGE_FILE, 'bbox': [round(x, 4) for x in bb]}]}
    layers = [l for l in man['layers'] if l.get('id') != 'range_tenures']
    at = next((i + 1 for i, l in enumerate(layers) if l.get('id') == 'crown_tenures'), len(layers))
    man['layers'] = layers[:at] + [E] + layers[at:]
    tmp = mp.with_suffix('.tmp')
    json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
    tmp.replace(mp)
    print('range_tenures:', size, 'bytes,', n, 'tiles')


LEG = {'crown_land': None}


def update_manifest(cache):
    mp = ROOT / 'data/layers/manifest.json'
    man = json.load(open(mp))
    stats = {f.stem[6:]: json.load(open(f)) for f in cache.glob('stats_*.json')}
    done = [r for r in REGIONS if r in stats]
    files = lambda lid: [{'area': f'Region {r}', 'file': f'data/layers/crown/{r.lower()}/{lid}.pmtiles', 'bbox': stats[r]['bbox']}
                         for r in done if stats[r][lid][0]]
    size = lambda lid: sum(stats[r][lid][0] for r in done)
    common = {'group': 'Land status', 'type': 'fill', 'licence': OGL, 'dataDate': TODAY, 'areas': [f'Region {r}' for r in done]}
    E = [
        dict(common, id='crown_land', label='Crown land', minzoom=8,
             paint={'fill-color': ['match', ['get', 'cls'], 'crown', '#66bb6a', 'federal', '#00b0ff', '#c5e1a5'],
                    'fill-opacity': ['match', ['get', 'cls'], 'likely', 0.3, 0.22]},
             legend=[['Crown land (provincial parcel), 90%', '#66bb6a'], ['Likely Crown land (no titled parcel), 80%', '#c5e1a5'],
                     ['Federal land: CHECK, 90%', '#00b0ff']],
             popup=[['Land', 'land'], ['How we know', 'how'], ['Certainty', 'certText'], ['Rule', 'rule'], ['Source', 'src'], ['Data date', 'date']],
             source='WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW (ParcelMap BC owner type), with reserves, treaty lands, parks and municipalities cut out' + WATER_NOTE,
             about='Public provincial land. Hunting is usually allowed here in an open season. Light green is derived: land with no titled parcel.',
             cert=80, files=files('crown_land'), bytes=size('crown_land')),
        dict(common, id='crown_tenures', label='Crown tenures (leases, licences)', minzoom=9,
             paint={'fill-color': '#8d6e63', 'fill-opacity': 0.12},
             popup=[['Tenure', 'tenure'], ['Type', 'type'], ['Purpose', 'purpose'], ['Expires', 'expiry'], ['Rule', 'rule'], ['How we know', 'how'],
                    ['Certainty', 'certText']],
             source='WHSE_TANTALIS.TA_CROWN_TENURES_SVW (Crown land tenures, in good standing)',
             about='Leases, licences of occupation, permits and rights of way on Crown land. Hunting is often allowed, but check for buildings, fences and signs.',
             cert=90, files=files('crown_tenures'), bytes=size('crown_tenures')),
        dict(common, id='hunt_likely', label='Where you can likely hunt', minzoom=8,
             paint={'fill-color': ['match', ['get', 'cls'], 'open', '#00c853', '#9e9e9e'], 'fill-opacity': ['match', ['get', 'cls'], 'open', 0.28, 0.3]},
             legend=[['Likely open to hunt (check season, MU and signs)', '#00c853'], ['Check first: tenure, federal land or park', '#9e9e9e']],
             popup=[['Land', 'land'], ['How we know', 'how'], ['Certainty', 'certText'], ['Rule', 'rule'], ['Data date', 'date']],
             source='Derived: Crown land layer minus no_hunting, municipalities, tenures and federal land; parks as check first' + WATER_NOTE,
             about='Derived. Never a sure yes: the season, MU (Management Unit), signs, closures and the 100 m rule still decide.',
             cert=75, files=files('hunt_likely'), bytes=size('hunt_likely')),
    ]
    ids = {e['id'] for e in E}
    layers = [l for l in man['layers'] if l.get('id') not in ids]
    at = next((i + 1 for i, l in enumerate(layers) if l.get('id') == 'private_land'), 0)
    man['layers'] = layers[:at] + E + layers[at:]
    tmp = mp.with_suffix('.tmp')
    json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
    tmp.replace(mp)
    print('manifest:', {e['id']: (len(e['files']), e['bytes']) for e in E})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cache', required=True)
    ap.add_argument('--regions', default='3')
    ap.add_argument('--manifest-only', action='store_true')
    ap.add_argument('--cut-water', action='store_true',
                    help='only cut lakes, wide rivers and reservoirs out of the existing crown_land (likely) and hunt_likely (open) files')
    ap.add_argument('--range', action='store_true', help='only build the Range Act tenures layer (range_tenures) for all of BC')
    a = ap.parse_args()
    cache = Path(a.cache).resolve()
    if str(cache).startswith(str(ROOT)):
        raise SystemExit('cache must be outside the repo')
    cache.mkdir(parents=True, exist_ok=True)
    if a.range:
        build_range(cache)
        return
    if a.cut_water:
        TO_MERC = Transformer.from_crs(3005, 3857, always_xy=True)
        wm = [shapely.transform(g, SP._tf(TO_MERC)) for g in water(cache)]
        wt = shapely.STRtree(wm)
        for r in a.regions.upper().split(','):
            cut_water_region(r, wt, wm, cache)
        mp = ROOT / 'data/layers/manifest.json'
        man = json.load(open(mp))
        for l in man['layers']:
            if l.get('id') in ('crown_land', 'hunt_likely'):
                l['bytes'] = sum((ROOT / f['file']).stat().st_size for f in l['files'])
                if WATER_NOTE not in l['source']:
                    l['source'] += WATER_NOTE
        tmp = mp.with_suffix('.tmp')
        json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
        tmp.replace(mp)
        return
    if not a.manifest_only:
        X = bc_inputs(cache)
        X['prov_i'] = Index(X['prov'])
        X['excl_i'] = Index(X['excl'])
        X['muni_i'] = Index(X['muni'])
        X['water_i'] = Index(water(cache))
        for r in a.regions.upper().split(','):
            build_region(r, X, cache)
    update_manifest(cache)


if __name__ == '__main__':
    main()
