#!/usr/bin/env python3
"""Hunt Mentor: "No shooting / no hunting areas" map layer and the unmapped list.

There is no official spatial dataset of Wildlife Act closed areas (No Shooting Areas, No Hunting Areas) in the
BC Data Catalogue (searched 2026-10-16: "no shooting", "hunting closed area", "firearm discharge", "closed areas
regulation", and the openmaps.gov.bc.ca WFS layer list). The synopsis maps are pictures and the Closed Areas
Regulation describes most areas in words. So this script draws ONLY the rules whose legal area is an official polygon
(or a fixed buffer of one), and lists every other closure as text by MU (Management Unit), with its synopsis map and page.

Drawn (official polygons from the BC Geographic Warehouse WFS, Open Government Licence BC):
  BC wide: ecological reserves (synopsis page 9), national parks (page 9)
  Region 3: MU 3-45 Wells Gray Park (page 33), Lac du Bois Grasslands Protected Area inside the City of Kamloops
            (page 33), City of Kamloops rest (Crown land part, page 33: a CHECK area), Tranquille WMA (Map C17),
            Marble Canyon Park (Map C14), McQueen, Griffin and Isobel lakes plus 1 km (Map C12), Logan Lake water (Map C6),
            largest island of Tunkwa Lake (Closed Areas Regulation Schedule 1 s. 12)
Rule wording and pages come from the app's own lessons (content/phase7/*), which quote the synopsis 2026 to 2028.

Outputs:
  data/layers/bc/no_hunting.geojson     the drawn areas (properties below), simplified, 5 decimals
  data/addons/noshoot/unmapped.json     closures not drawn, by MU, for "Still check yourself"
  data/layers/manifest.json             the "no_hunting" entry is added or replaced (other layers kept)

Feature properties: name, kind (nohunt | noshoot | check), ban (plain words), rule, rifle, shot, bow (no | check | ok:
what the rule means for a rifle or slug, a shotgun with shot, and a bow or crossbow), methods (plain words), src, page,
map, boundary, cert (number), certText, mu, region.

Usage: python3 scripts/build-noshoot.py --cache /path/outside/repo
Python packages: shapely pyproj
"""
import argparse
import datetime as dt
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape, mapping, Point, Polygon, MultiPolygon
from shapely.ops import transform, unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
TODAY = dt.date.today().isoformat()
WFS = 'https://openmaps.gov.bc.ca/geo/pub/wfs'
OGL = 'Open Government Licence BC'
SYN = 'BC Hunting and Trapping Regulations Synopsis 2026 to 2028'
TO_WGS = Transformer.from_crs(3005, 4326, always_xy=True).transform
TO_ALB = Transformer.from_crs(4326, 3005, always_xy=True).transform
BC_BOX = (-139.1, 48.2, -114.0, 60.1)


def fetch(cache, key, layer, cql=None, bbox=None, props=None):
    f = cache / f'{key}.json'
    if f.exists():
        return json.load(open(f))
    q = {'service': 'WFS', 'version': '2.0.0', 'request': 'GetFeature', 'outputFormat': 'application/json',
         'srsName': 'EPSG:3005', 'typeNames': f'pub:{layer}', 'count': '10000'}
    if cql:
        q['CQL_FILTER'] = cql
    if bbox:
        q['bbox'] = ','.join(map(str, bbox)) + ',EPSG:4326'
    if props:
        q['propertyName'] = ','.join(props + ['SHAPE'])
    url = f'{WFS}?{urllib.parse.urlencode(q)}'
    print('fetch', key)
    d = json.load(urllib.request.urlopen(url, timeout=600))
    json.dump(d, open(f, 'w'))
    return d


def geoms(fc, pred=lambda p: True):
    out = []
    for ft in fc['features']:
        if ft.get('geometry') and pred(ft['properties']):
            g = shape(ft['geometry'])
            out.append((make_valid(g) if not g.is_valid else g, ft['properties']))
    return out


def polys(g):
    if isinstance(g, (Polygon, MultiPolygon)):
        return g
    ps = [x for x in getattr(g, 'geoms', []) if isinstance(x, (Polygon, MultiPolygon))]
    return unary_union(ps) if ps else None


def title(s):
    small = {'and', 'of', 'the'}
    w = [x if i and x in small else re.sub(r'(^|[/(.])([a-z])', lambda m: m.group(1) + m.group(2).upper(), x)
         for i, x in enumerate(str(s).lower().split())]
    return ' '.join(w).replace('Mcqueen', 'McQueen').replace('Mckenny', 'McKenny')


# What each kind means for each method (synopsis definitions, page 4, and No Shooting Areas, page 10)
METHODS = {
    'nohunt': {'rifle': 'no', 'shot': 'no', 'bow': 'no', 'methods': 'Closed to rifle, shotgun and bow.'},
    'nodischarge': {'rifle': 'no', 'shot': 'no', 'bow': 'no', 'methods': 'No firearms and no bows, so no hunting with any of them.'},
    'noshoot': {'rifle': 'no', 'shot': 'no', 'bow': 'check',
                'methods': 'No firearms (rifle or shotgun). Bows and crossbows are allowed unless the region restricts them (page 10).'},
    'check': {'rifle': 'check', 'shot': 'check', 'bow': 'check',
              'methods': 'Part of this area bans shooting. The app cannot tell which part you are in.'},
}
KIND_COLOUR = {'nohunt': 'nohunt', 'nodischarge': 'nohunt', 'noshoot': 'noshoot', 'check': 'check'}


def feat(g_alb, tol, min_ha=0, **p):
    """Simplify (tol m) and drop parts under min_ha (coastal islets: keeps the file small; the gap is in the report)."""
    kind = p.pop('kind')
    m = METHODS[kind]
    p.update({'kind': KIND_COLOUR[kind], 'rifle': m['rifle'], 'shot': m['shot'], 'bow': m['bow'], 'methods': m['methods']})
    p['certText'] = f"{p['cert']}%"
    g = g_alb.simplify(tol, preserve_topology=True).buffer(0)
    if min_ha:
        parts = [x for x in getattr(g, 'geoms', [g]) if x.area >= min_ha * 1e4]
        g = unary_union(parts) if parts else g
    return g, p


def mu_at(pt_wgs):
    for f in sorted((ROOT / 'data/layers/bc/mu').glob('region_*.geojson')):
        for ft in json.load(open(f))['features']:
            if shape(ft['geometry']).contains(pt_wgs):
                return ft['properties']['MU']
    return ''


def build_features(cache):
    out = []
    parks = fetch(cache, 'parks', 'WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW')
    nat = fetch(cache, 'natparks', 'WHSE_ADMIN_BOUNDARIES.CLAB_NATIONAL_PARKS', bbox=BC_BOX)
    kam = fetch(cache, 'kamloops', 'WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP', cql="ADMIN_AREA_NAME = 'City of Kamloops'")
    wma = fetch(cache, 'wma', 'WHSE_TANTALIS.TA_WILDLIFE_MGMT_AREAS_SVW')
    lakes = fetch(cache, 'lakes', 'WHSE_BASEMAPPING.FWA_LAKES_POLY',
                  cql="GNIS_NAME_1 IN ('McQueen Lake','Griffin Lake','Isobel Lake','Logan Lake','Tunkwa Lake')")
    mu345 = fetch(cache, 'mu345', 'WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW', cql="WILDLIFE_MGMT_UNIT_ID = '3-45'")
    pk = lambda name: unary_union([g for g, p in geoms(parks, lambda p: p['PROTECTED_LANDS_NAME'] == name)])
    syn = lambda page: f'{SYN}, page {page}'

    # BC wide: ecological reserves and national parks (synopsis page 9)
    for g, p in geoms(parks, lambda p: p['PROTECTED_LANDS_DESIGNATION'] == 'ECOLOGICAL RESERVE'):
        out.append(feat(g, 10, 0.5, kind='nohunt', name=title(p['PROTECTED_LANDS_NAME']), ban='No hunting, trapping or angling. No firearm or bow discharge.',
                        rule='“Hunting, trapping, and angling are prohibited in Ecological Reserves in B.C. The discharge of a firearm, or bow is prohibited.”',
                        src=syn(9), page=9, map='', boundary='Official outline (TA_PARK_ECORES_PA_SVW). Islets under 0.5 ha not drawn.', cert=95))
    for g, p in geoms(nat):
        out.append(feat(g, 60, 2, kind='nohunt', name=p.get('ENGLISH_NAME') or 'National park', ban='No hunting.',
                        rule='“Hunting is prohibited in all National Parks.” Firearms carried through must be dismantled, cased, or wrapped and tied.',
                        src=syn(9), page=9, map='', boundary='Official outline (CLAB_NATIONAL_PARKS). Islets under 2 ha not drawn.', cert=95))

    # Region 3
    g = unary_union([x for x, _ in geoms(mu345)])
    out.append(feat(g, 30, kind='nohunt', name='Wells Gray Park, MU 3-45', ban='No hunting and no firearm discharge.',
                    rule='“Hunting and the discharge of firearms are prohibited in MU 3-45 (Wells Gray Park).”', src=syn(33), page=33, map='',
                    boundary='Official outline: MU (Management Unit) 3-45 (WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW)', cert=99))
    city = unary_union([x for x, _ in geoms(kam)])
    ldb = pk('LAC DU BOIS GRASSLANDS PROTECTED AREA')
    ldb_in = polys(ldb.intersection(city))
    out.append(feat(ldb_in, 10, kind='nodischarge', name='Lac du Bois Grasslands Protected Area, inside the City of Kamloops',
                    ban='No firearms and no bows.',
                    rule='“The discharge of firearms and bows is prohibited on that portion of Lac du Bois Grasslands Protected Area or Crown lands that are within the City of Kamloops municipal boundary.”',
                    src=syn(33), page=33, map='C15 shows the municipal boundary',
                    boundary='Official outlines: the protected area (TA_PARK_ECORES_PA_SVW) cut by the City of Kamloops boundary (ABMS_MUNICIPALITIES_SP)', cert=95))
    rest = polys(city.difference(ldb))
    out.append(feat(rest, 10, kind='check', name='City of Kamloops', ban='Crown land: no firearms and no bows. Private land: city bylaw.',
                    rule='Synopsis: no firearms or bows on Crown land inside the City of Kamloops boundary. Shooting on other land inside the city is set by city bylaw (not in the app). Map C7 also closes the South Thompson band.',
                    src=syn(33), page=33, map='C7 (river band), C15',
                    boundary='Official outline: City of Kamloops (ABMS_MUNICIPALITIES_SP). Which land is Crown land is not drawn here.', cert=90))
    tq = unary_union([x for x, p in geoms(wma, lambda p: p['WILDLIFE_MANAGEMENT_AREA_NAME'] == 'TRANQUILLE WILDLIFE MANAGEMENT AREA')])
    out.append(feat(tq, 10, kind='nohunt', name='Tranquille Wildlife Management Area', ban='No hunting and no shooting.',
                    rule='Map C17: the Tranquille Wildlife Management Area is a No Shooting or Hunting Area. The legal line (Closed Areas Regulation, Schedule 3 s. 2) also takes in Lot 341 and stops at the low water mark.',
                    src=syn(35), page=35, map='C17',
                    boundary='Official outline: Tranquille WMA (TA_WILDLIFE_MGMT_AREAS_SVW). The legal area is close to it, not the same: check Map C17.', cert=85))
    mc = pk('MARBLE CANYON PARK')
    out.append(feat(mc, 10, kind='nohunt', name='Marble Canyon Park', ban='No hunting and no shooting.',
                    rule='Map C14: Marble Canyon Provincial Park is a No Shooting or Hunting Area (MU 3-17).', src=syn(35), page=35, map='C14',
                    boundary='Official outline: Marble Canyon Park (TA_PARK_ECORES_PA_SVW). The regulation draws the area on its own map: check Map C14.', cert=85))
    lk = geoms(lakes)
    near = lambda names: unary_union([g for g, p in lk if p['GNIS_NAME_1'] in names and p.get('WATERSHED_GROUP_CODE') == 'LNTH'])
    mq = near({'McQueen Lake', 'Griffin Lake', 'Isobel Lake'}).buffer(1000, 32)
    out.append(feat(mq, 5, kind='noshoot', name='McQueen, Griffin and Isobel lakes, 1 km', ban='No firearms (No Shooting Area).',
                    rule='“All land and waters within 1 km of the mean high water mark of McQueen, Griffin and Isobel Lakes.” (Map C12, Closed Areas Regulation Schedule 5 s. 4)',
                    src=syn(35), page=35, map='C12',
                    boundary='Official lake outlines (FWA_LAKES_POLY) plus 1 km. The lake outline is close to, not the same as, the mean high water mark.', cert=90))
    ll = unary_union([g for g, p in lk if p['GNIS_NAME_1'] == 'Logan Lake'])
    out.append(feat(ll, 3, kind='noshoot', name='Logan Lake (the water)', ban='No firearms on the lake (No Shooting Area).',
                    rule='“Those waters of Logan Lake to the maximum high water mark.” (Map C6, Closed Areas Regulation Schedule 5 s. 9)',
                    src=syn(35), page=35, map='C6',
                    boundary='Official lake outline (FWA_LAKES_POLY). The outline is close to, not the same as, the maximum high water mark.', cert=90))
    tw = [g for g, p in lk if p['GNIS_NAME_1'] == 'Tunkwa Lake']
    holes = [Polygon(r) for g in tw for poly in getattr(g, 'geoms', [g]) for r in poly.interiors]
    if holes:
        isl = max(holes, key=lambda h: h.area)
        out.append(feat(isl, 2, kind='nohunt', name='Tunkwa Lake, largest island', ban='No hunting, shooting or trapping.',
                        rule='“The largest island in Tunkwa Lake, being in Township 19, Range 21, W6M.” (Closed Areas Regulation, Schedule 1 s. 12. Not printed in the synopsis.)',
                        src='Closed Areas Regulation, Schedule 1 s. 12 (BC Wildlife Act)', page='', map='',
                        boundary='The largest island in the official Tunkwa Lake outline (FWA_LAKES_POLY). The regulation names the Kootenay Land District; the township and range match this lake (my reading).', cert=85))

    res = []
    for g, p in out:
        if g is None or g.is_empty:
            continue
        w = transform(TO_WGS, g)
        c = w.representative_point()
        p['mu'] = p.get('mu') or mu_at(c)
        p['region'] = p['mu'].split('-')[0] if p['mu'] else ''
        res.append((w, p))
    return res


def rnd(o, nd=5):
    if isinstance(o, float):
        return round(o, nd)
    if isinstance(o, (list, tuple)):
        return [rnd(x, nd) for x in o]
    return o


def write_geojson(path, feats):
    lines = []
    for g, p in feats:
        gm = mapping(g)
        gm = {'type': gm['type'], 'coordinates': rnd(gm['coordinates'])}
        lines.append(json.dumps({'type': 'Feature', 'properties': p, 'geometry': gm}, ensure_ascii=False, separators=(',', ':')))
    path.write_text('{"type":"FeatureCollection","features":[\n' + ',\n'.join(lines) + '\n]}\n')


# ---------- the unmapped list ----------
R3 = [  # Region 3 closures with a described boundary (content/phase7/08-region-3-thompson.md, synopsis page 35 and the regulation)
    ('C7', 'Kamloops', ['3-19', '3-20', '3-26', '3-27', '3-28'], 'No Shooting or Hunting Area and No Shooting Area: a band along the South Thompson River from Kamloops east to the Pritchard Bridge.', 35),
    ('C11', 'Sun Peaks', ['3-27'], 'No hunting or shooting within 400 m (437 yd) of any ski lift, run, facility or development of Sun Peaks Resort.', 35),
    ('C4', 'Highland Valley', ['3-18'], 'No Shooting Area around the Highland Valley mines.', 35),
    ('C8', 'Blind Bay', ['3-26'], 'No Shooting Area from Reedman Point to the Sorrento Eagle Bay Road.', 35),
    ('C9', 'Sicamous', ['3-26'], 'No Shooting or Hunting Area on Mara and Shuswap lake water near Sicamous.', 35),
    ('C10', 'Salmon Arm', ['3-26'], 'No Shooting or Hunting Area on Shuswap Lake southeast of the Salmon Arm wharf line.', 35),
    ('C14', 'Marble Canyon', ['3-17'], 'No Shooting or Hunting Area. Drawn on this map from the park outline; the legal line is on Map C14.', 35),
    ('C17', 'Tranquille', ['3-29'], 'No Shooting or Hunting Area. Drawn from the WMA outline; the legal line also takes in Lot 341.', 35),
    ('', 'Roderick Haig Brown Recreation Area, near Chase', ['3-37'], 'No hunting or shooting south of the Squilax Anglemont Road and downstream of the Adams River bridge. Closed Areas Regulation, Schedule 3 s. 31 (not printed in the synopsis).', None),
    ('', 'Trophy Mountain, near Wells Gray Park', [], 'No Shooting or Hunting Area of about 6,934 hectares around Moul Creek and the south slopes of Trophy Mountain. Closed Areas Regulation, Schedule 3 s. 46 (not printed in the synopsis).', None),
]
FILES = {'12-region-1-vancouver-island.md': '1', '09-region-2-lower-mainland.md': '2', '13-region-4-kootenay.md': '4',
         '14-region-6-skeena.md': '6', '15-region-7a-omineca.md': '7A', '16-region-7b-peace.md': '7B', '10-region-8-okanagan.md': '8'}
BAN = re.compile(r'No Shooting|No Hunting|Shot Only|Sanctuary|Hunting/Shooting|Archery only', re.I)
CAP = re.compile(r'"(Map ([A-Z]\d+)\b[^"]*)"')
MU = re.compile(r'\b([1-8])-(\d{1,2})\b')


def unmapped():
    out = [{'region': '3', 'map': m, 'name': n, 'mus': mus, 'text': t, 'page': pg, 'cert': 99,
            'src': f'{SYN}, page {pg}' if pg else 'Closed Areas Regulation (BC Wildlife Act)'} for m, n, mus, t, pg in R3]
    seen = set()
    for fn, reg in FILES.items():
        page = None
        for line in (ROOT / 'content/phase7' / fn).read_text().splitlines():
            m = re.search(r'\[!law\][^\n]*?pages? (\d+)', line)
            if m:
                page = int(m.group(1))
            for cap, code in CAP.findall(line):
                if code in seen or not BAN.search(cap) or code[0] == 'C':
                    continue
                seen.add(code)
                mus = sorted({f'{a}-{int(b)}' for a, b in MU.findall(cap)})
                out.append({'region': reg, 'map': code, 'name': '', 'mus': mus, 'text': cap.strip(), 'page': page, 'cert': 99,
                            'src': f'{SYN}, page {page}' if page else SYN})
    return {'built': TODAY, 'source': SYN,
            'note': 'Closures whose boundary is a description or a map picture, not an official polygon. Not drawn on the map. Quoted from the app lessons (content/phase7).',
            'items': out}


def update_manifest(path_geo, n):
    mp = ROOT / 'data/layers/manifest.json'
    man = json.load(open(mp))
    entry = {
        'id': 'no_hunting', 'group': 'Land status', 'label': 'No shooting / no hunting areas', 'type': 'fill', 'minzoom': 6,
        'paint': {'fill-color': ['match', ['get', 'kind'], 'noshoot', '#ef6c00', 'check', '#f9a825', '#d32f2f'], 'fill-opacity': 0.1},
        'popup': [['What is banned', 'ban'], ['Rule', 'rule'], ['Rifle, shotgun, bow', 'methods'], ['Source', 'src'], ['Synopsis map', 'map'],
                  ['Boundary', 'boundary'], ['Certainty', 'certText'], ['MU (Management Unit)', 'mu']],
        'labelField': 'name', 'legal': True,
        'source': 'Synopsis 2026 to 2028 and Closed Areas Regulation rules, drawn on official outlines: TA_PARK_ECORES_PA_SVW, CLAB_NATIONAL_PARKS, '
                  'ABMS_MUNICIPALITIES_SP, TA_WILDLIFE_MGMT_AREAS_SVW, FWA_LAKES_POLY and the MU 3-45 outline',  # never name the MU layer here: layers.js muLayer() picks the MU layer by its source
        'about': 'Areas where hunting or shooting is banned, drawn only where the legal area is an official outline (BC wide: ecological '
                 'reserves and national parks; Region 3: the closures listed in the Rule Book that follow an official outline). '
                 'Most No Shooting Areas are not drawn: see the synopsis maps.',
        'cert': 90, 'file': f'data/layers/bc/{path_geo.name}', 'areas': 'BC', 'licence': OGL, 'dataDate': TODAY,
        'bytes': path_geo.stat().st_size, 'features': n,
    }
    layers = [l for l in man['layers'] if l.get('id') != 'no_hunting']
    at = next((i + 1 for i, l in enumerate(layers) if l.get('id') == 'wma'), len(layers))
    layers.insert(at, entry)
    man['layers'] = layers
    tmp = mp.with_suffix('.tmp')
    json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
    tmp.replace(mp)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cache', required=True, help='folder for raw WFS downloads (outside the repo)')
    a = ap.parse_args()
    cache = Path(a.cache).resolve()
    if str(cache).startswith(str(ROOT)):
        raise SystemExit('cache must be outside the repo')
    cache.mkdir(parents=True, exist_ok=True)
    feats = build_features(cache)
    geo = ROOT / 'data/layers/bc/no_hunting.geojson'
    write_geojson(geo, feats)
    um = ROOT / 'data/addons/noshoot/unmapped.json'
    um.parent.mkdir(parents=True, exist_ok=True)
    json.dump(unmapped(), open(um, 'w'), indent=1, ensure_ascii=False)
    update_manifest(geo, len(feats))
    print(f'{len(feats)} areas, {geo.stat().st_size / 1e3:.0f} KB; unmapped {len(json.load(open(um))["items"])}')
    for g, p in feats:
        if p['region'] == '3' or 'Kamloops' in p['name']:
            print(' ', p['name'], p['mu'], p['kind'], round(transform(TO_ALB, g).area / 1e4), 'ha')


if __name__ == '__main__':
    main()
