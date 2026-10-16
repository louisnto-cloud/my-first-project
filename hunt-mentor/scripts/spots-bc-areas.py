#!/usr/bin/env python3
"""Make the province wide spot areas (scripts/spots-bc-areas.json) for scripts/spots-pipeline.py.

BC is cut into cells of 2 degrees longitude by 1.5 degrees latitude. A cell is kept when at least 800 km2 of BC land (the MU
layer) lies outside the hand made areas A to G; those boxes become the cell's cut outs ('excl'), so areas never overlap.
Key: R<region><letter>, the region holding most of the cell's MU land (BC hunting regions 1 to 8, 7A and 7B).
Name: the region name and the largest municipality in the cell (ABMS_MUNICIPALITIES_SP), or the nearest one.
Base (the "Drive: from" town in the plan text): that municipality's centroid. Never an invented place.
Run after the BC wide fetch: python3 scripts/spots-bc-areas.py --cache /path/outside/repo
"""
import argparse
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pipe', ROOT / 'scripts' / 'spots-pipeline.py')
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
np, shapely = P.np, P.shapely
HAND = {k: v for k, v in P.AREAS.items() if len(k) == 1}
DX, DY = 2.0, 1.5
X0, Y0, X1, Y1 = -139.1, 48.2, -114.0, 60.0
MIN_KM2 = 800
# region names as the app's Rule Book titles them (content/phase7); the MU layer calls 7B "Omineca" too
RNAME = {'1': 'Vancouver Island', '2': 'Lower Mainland', '3': 'Thompson', '4': 'Kootenay', '5': 'Cariboo', '6': 'Skeena',
         '7A': 'Omineca', '7B': 'Peace', '8': 'Okanagan'}
DENSE = {'R1B', 'R2A', 'R8A', 'R4A'}   # many private parcels: keep the pipeline's small fetch tiles


def communities(cache):
    import urllib.parse, gzip
    f = Path(cache) / 'raw' / 'gns_communities.json.gz'
    if not f.exists():
        q = {'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature', 'outputFormat': 'application/json', 'srsName': 'EPSG:4326',
             'typeName': 'pub:WHSE_BASEMAPPING.GNS_GEOGRAPHICAL_NAMES_SP', 'propertyName': 'GEOGRAPHICAL_NAME,FEATURE_TYPE,GEOMETRY',
             'CQL_FILTER': "FEATURE_TYPE='Community'", 'maxFeatures': '10000'}
        b = P.http_get(P.WFS + '?' + urllib.parse.urlencode(q))
        f.write_bytes(gzip.compress(b))
    js = json.loads(gzip.decompress(f.read_bytes()))
    return [(ft['properties']['GEOGRAPHICAL_NAME'], *ft['geometry']['coordinates'][:2]) for ft in js['features'] if ft.get('geometry')]


def excl_of(b):
    return [list(v['box']) for v in HAND.values() if not (v['box'][2] <= b[0] or v['box'][0] >= b[2] or v['box'][3] <= b[1] or v['box'][1] >= b[3])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', required=True)
    a = ap.parse_args()
    bc = P.clean_bc(Path(a.cache))
    g, p, _ = bc['mu']
    mg, mp, _ = bc['municipalities']
    hand = shapely.union_all([P.box_albers(v['box']) for v in HAND.values()])
    cells = []
    y = Y0
    while y < Y1 - 1e-9:
        x = X0
        while x < X1 - 1e-9:
            b = (round(x, 2), round(y, 2), round(min(x + DX, X1), 2), round(min(y + DY, Y1), 2))
            cells.append(b)
            x += DX
        y += DY
    out, used = {}, {}
    tree = P.STRtree(g)
    mtree = P.STRtree(mg)
    comms = communities(a.cache)
    for b in cells:
        poly = P.box_albers(b)
        rest = shapely.difference(poly, hand)
        idx = tree.query(rest, predicate='intersects')
        if not len(idx):
            continue
        parts = shapely.intersection(g[idx], rest)
        areas = shapely.area(parts) / 1e6
        land = float(areas.sum())
        if land < MIN_KM2:
            continue
        by = {}
        for i, ar in zip(idx, areas):
            r = str(p[int(i)]['region'])
            by[r] = by.get(r, 0) + ar
        reg = max(by, key=by.get)
        rname = RNAME.get(reg.upper(), next(q['regionName'] for q in p if str(q['region']) == reg))
        # biggest municipality in the cell's own part, else the nearest one to the land centroid
        mi = [i for i in mtree.query(rest, predicate="intersects") if "Regional Municipality" not in (mp[int(i)]["name"] or "")]
        mi = np.array(mi, dtype=int)
        cen = shapely.centroid(shapely.union_all(parts))
        clon, clat = P.xy_to_lonlat(cen.x, cen.y)
        inside = [c for c in comms if b[0] <= c[1] <= b[2] and b[1] <= c[2] <= b[3] and not P.in_excl_box(excl_of(b), c[1], c[2])]
        if len(mi):
            k = int(mi[int(np.argmax(shapely.area(shapely.intersection(mg[mi], rest))))])
            town = mp[k]['name']
            tc = shapely.point_on_surface(shapely.intersection(mg[k], rest)) if not shapely.is_empty(shapely.intersection(mg[k], rest)) else shapely.point_on_surface(mg[k])
            tlon, tlat = P.xy_to_lonlat(tc.x, tc.y)
            note = 'Municipality from ABMS_MUNICIPALITIES_SP (point inside its boundary)'
        elif inside:
            town, tlon, tlat = min(inside, key=lambda c: (c[1] - float(clon)) ** 2 + ((c[2] - float(clat)) * 1.6) ** 2)
            note = 'Community from BC Geographical Names (GNS_GEOGRAPHICAL_NAMES_SP), nearest the middle of the area'
        else:
            k = int(np.argmin(shapely.distance(mg, cen)))
            town = mp[k]['name']
            tc = shapely.point_on_surface(mg[k])
            tlon, tlat = P.xy_to_lonlat(tc.x, tc.y)
            note = 'Nearest municipality from ABMS_MUNICIPALITIES_SP (outside the area)'
        n = used.get(reg, 0)
        used[reg] = n + 1
        key = f"R{reg.upper()}{chr(65 + n)}"
        excl = excl_of(b)
        short = town.replace('The Corporation of the ', '').replace('Corporation of the ', '')
        out[key] = {'name': f"Region {reg} {rname}: around {short} ({b[1]:.1f} to {b[3]:.1f} N, {-b[2]:.1f} to {-b[0]:.1f} W)",
                    'box': list(b), 'excl': excl, 'region': reg, 'landKm2': round(land),
                    'demz': 11, 'tileScale': 1 if key in DENSE else 4,
                    'base': {'name': short, 'lat': round(float(tlat), 4), 'lon': round(float(tlon), 4), 'note': note}}
        print(key, out[key]['name'], round(land), 'km2', 'excl', len(excl))
    json.dump(out, open(ROOT / 'scripts' / 'spots-bc-areas.json', 'w'), indent=1, ensure_ascii=False)
    print(len(out), 'areas')


if __name__ == '__main__':
    main()
