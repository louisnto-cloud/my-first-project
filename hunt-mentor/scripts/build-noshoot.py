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
  Regions 1 and 2: regional district parks plus 100 m (page 9; Closed Areas Regulation Schedule 3 s. 19 (d)), only the parks
            named "Regional Park" in GBA_LOCAL_REG_GREENSPACES_SP
  Region 2: Burns Bog Partnership Lands by parcel identifier (page 27; Schedule 8.1 s. 1, ParcelMap BC), North Thormanby
            Island (Map B31; Schedule 3 s. 17), Bowen Island (page 27; Schedule 5 s. 11), Keats Island rifle ban (page 27;
            Schedule 11 s. 3), Savary Island shot only (Map B22; Schedule 9 s. 23); islands from FWA_ISLANDS_POLY
  Searched 2026-10-17 and NOT drawn (no official outline equals the legal area): the Fraser Valley Regional District 400 m
  road bands (only a 2017 PDF map from the FVRD; the roads are described in Schedule 5.1), Mount Judge Howay Park (not in
  the parks layer any more), FVRD Electoral Area H (the area was redrawn in 2022, so today's outline may not be the one the
  1996 rule meant). They are in the unmapped list.
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
    # Closed Areas Regulation s. 10 (1) (c): "a rifle in an area set out in Schedule 11"
    'norifle': {'rifle': 'no', 'shot': 'ok', 'bow': 'ok',
                'methods': 'No rifles. A shotgun and a bow are not banned by this rule. The app treats a shotgun slug like a rifle here: check before you use one.'},
    # Closed Areas Regulation s. 10 (1) (a): "a firearm in an area set out in Schedule 9 unless the person uses shot only"
    'shotonly': {'rifle': 'no', 'shot': 'ok', 'bow': 'ok',
                 'methods': 'Firearms Using Shot Only Area: a shotgun with shot is allowed; no rifle and no slug. The rule is about firearms, so it does not ban a bow (my reading).'},
}
KIND_COLOUR = {'nohunt': 'nohunt', 'nodischarge': 'nohunt', 'noshoot': 'noshoot', 'check': 'check', 'norifle': 'noshoot', 'shotonly': 'noshoot'}
CAR = 'Closed Areas Regulation, B.C. Reg. 76/84 (BC Wildlife Act)'


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


_MUS = []


def mu_at(pt_wgs):
    if not _MUS:
        for f in sorted((ROOT / 'data/layers/bc/mu').glob('region_*.geojson')):
            _MUS.extend((ft['properties']['MU'], shape(ft['geometry'])) for ft in json.load(open(f))['features'])
    for m, g in _MUS:
        if g.contains(pt_wgs):
            return m
    return ''


RD_PARK = re.compile(r'\bRegional\b.*\bPark\b', re.I)
BURNS_BOG_PIDS = ['000914991', '000915106', '000915084', '000915114', '000915122', '025945688']  # Schedule 8.1 s. 1 (a) to (d), (f), (g)
BURNS_BOG_PLAN = 'BCP10127'  # (e) Lot E, District Lot 437, Group 2, NWD, Plan BCP10127


def region2_features(cache, syn):
    """Region 1 and 2 regional district parks plus 100 m, and the Region 2 closures whose legal area is an official outline."""
    out = []
    rdp = fetch(cache, 'rdparks', 'WHSE_BASEMAPPING.GBA_LOCAL_REG_GREENSPACES_SP', cql="PARK_TYPE = 'Regional'")
    groups = {}
    for g, p in geoms(rdp, lambda p: RD_PARK.search(p.get('PARK_NAME') or '')):
        gr = groups.setdefault(p['PARK_NAME'].strip(), [[], set()])  # one park can be listed under two regional districts (Glen Valley)
        gr[0].append(g)
        gr[1].add(p.get('REGIONAL_DISTRICT') or '')
    for name, (gs, rds) in sorted(groups.items()):
        rd = ' and '.join(sorted(x for x in rds if x))
        park = unary_union(gs)
        mu = mu_at(transform(TO_WGS, park).representative_point())
        if not mu or mu.split('-')[0] not in ('1', '2'):
            continue
        out.append(feat(park.buffer(100, 8), 5, kind='nohunt', name=f'{name}, plus 100 m', mu=mu,
                        ban='No hunting and no firearm discharge in the park and within 100 m of it.',
                        rule='“Hunting and the discharge of firearms is prohibited within 100 m of all Regional District Parks in Regions 1 and 2.” '
                             'Regional district bylaws also ban firearms and bows in most of these parks (page 9). Closed Areas Regulation, Schedule 3 s. 19 (d).',
                        src=syn(9), page=9, map='',
                        boundary=f'Park outline from Local and Regional Greenspaces (GBA_LOCAL_REG_GREENSPACES_SP, listed under {rd}, '
                                 'compiled by the Province from regional district maps), plus 100 m. Only parks named "Regional Park" in that data are '
                                 'drawn: a newer or unnamed regional district park is not.', cert=85))
    # Burns Bog Partnership Lands (synopsis page 27; Schedule 8.1 s. 1 lists the parcels)
    pids = ','.join(f"'{x}'" for x in BURNS_BOG_PIDS)
    bb = fetch(cache, 'burnsbog', 'WHSE_CADASTRE.PMBC_PARCEL_FABRIC_POLY_SVW', cql=f"PID IN ({pids}) OR PLAN_NUMBER = '{BURNS_BOG_PLAN}'",
               props=['PID_FORMATTED', 'PLAN_NUMBER', 'PARCEL_STATUS'])
    got = geoms(bb)
    found = sorted({p.get('PID_FORMATTED') or p.get('PLAN_NUMBER') for _, p in got})
    missing = [f'{x[:3]}-{x[3:6]}-{x[6:]}' for x in BURNS_BOG_PIDS if f'{x[:3]}-{x[3:6]}-{x[6:]}' not in found]
    if got:
        out.append(feat(unary_union([g for g, _ in got]), 5, kind='nohunt', name='Burns Bog Partnership Lands', mu='2-4',
                        ban='No hunting and no trapping.',
                        rule='“Burns Bog (MU 2-4) No Hunting or Trapping Area: no hunting or trapping in the Burns Bog Partnership Lands.” '
                             'The regulation lists the parcels (Closed Areas Regulation, Schedule 8.1 s. 1).',
                        src=syn(27), page=27, map='',
                        boundary='Official parcel outlines (ParcelMap BC, PMBC_PARCEL_FABRIC_POLY_SVW) of the parcels listed in Schedule 8.1 s. 1'
                                 + (f'. Not found in ParcelMap BC, so not drawn: parcel {", ".join(missing)} (VERIFY).' if missing else '.'),
                        cert=85 if missing else 90))
    isl = fetch(cache, 'islands', 'WHSE_BASEMAPPING.FWA_ISLANDS_POLY',
                cql="GNIS_NAME_1 IN ('North Thormanby Island','Bowen Island','Keats Island','Savary Island')")
    one = lambda n: unary_union([g for g, p in geoms(isl, lambda p: p['GNIS_NAME_1'] == n)])
    edge = 'Official island outline (FWA_ISLANDS_POLY). The outline follows the shore; the legal line is the low water mark, so the beach below it is not drawn.'
    out.append(feat(one('North Thormanby Island'), 5, kind='nohunt', name='North Thormanby Island', mu='2-16',
                    ban='No hunting and no shooting.', rule='Map B31: North Thormanby Island is a No Shooting or Hunting Area. “The mean low water mark of North Thormanby Island.” (Closed Areas Regulation, Schedule 3 s. 17)',
                    src=syn(31), page=31, map='B31', boundary=edge, cert=90))
    out.append(feat(one('Bowen Island'), 5, kind='noshoot', name='Bowen Island', mu='2-16',
                    ban='No firearms (No Shooting Area). Bows: municipal bylaws, ask the Bowen Island Municipal Clerk (604 947 4255).',
                    rule='“Bowen Island No Shooting Area (MU 2-16).” Also no hunting within 150 m of any public highway, school, park, playground, church, workshop, business, house or farm building (page 27; not drawn). Closed Areas Regulation, Schedule 5 s. 11 and Schedule 7 s. 5.',
                    src=syn(27), page=27, map='', boundary=edge, cert=90))
    out.append(feat(one('Keats Island'), 5, kind='norifle', name='Keats Island', mu='2-16', ban='No rifles.',
                    rule='“The discharge of rifles is prohibited on Keats Island (MU 2-16, east of Gibsons).” Closed Areas Regulation, Schedule 11 s. 3.',
                    src=syn(27), page=27, map='', boundary=edge, cert=90))
    out.append(feat(one('Savary Island'), 5, kind='shotonly', name='Savary Island', mu='2-12', ban='Shotgun with shot only. No rifles or slugs.',
                    rule='Map B22: Savary Island Firearms Using Shot Only Area (MU 2-12). “The mean low water mark of Savary Island.” (Closed Areas Regulation, Schedule 9 s. 23)',
                    src=syn(30), page=30, map='B22', boundary=edge, cert=90))
    # Seasonal No Shooting Areas (Closed Areas Regulation s. 7 and Schedule 6): drawn as "check", because they are not in force all year
    parks = fetch(cache, 'parks', 'WHSE_TANTALIS.TA_PARK_ECORES_PA_SVW')
    gp = unary_union([g for g, p in geoms(parks, lambda p: p['PROTECTED_LANDS_NAME'] == 'GARIBALDI PARK')])
    out.append(feat(gp, 30, kind='check', name='Garibaldi Park', ban='No firearms from 1 January to 31 August. Much of the park is also closed to hunting all year.',
                    rule='“That portion of the Province of British Columbia in M.U.s 2-06, 2-07, 2-08 and 2-09 known as Garibaldi Park, during the period January 1 to August 31.” '
                         '(Closed Areas Regulation, Schedule 6 s. 4: a seasonal No Shooting Area.) Schedule 3 s. 30 also makes a described part of the park a No Shooting or Hunting Area all year '
                         '(not drawn on its own). BC Parks rules apply too (page 9). Not printed in the Region 2 pages.',
                    src=f'{CAR}, Schedule 6 s. 4 and Schedule 3 s. 30', page='', map='B16 shows the Garibaldi No Shooting Area next to the park',
                    boundary='Official park outline (TA_PARK_ECORES_PA_SVW) for the seasonal rule. The year round Schedule 3 area is described in words and is not drawn.', cert=90))
    cl = fetch(cache, 'cultus', 'WHSE_BASEMAPPING.FWA_LAKES_POLY', cql="GNIS_NAME_1 = 'Cultus Lake'")
    cw = [g for g, p in geoms(cl) if mu_at(transform(TO_WGS, g).representative_point()) == '2-3']
    if cw:
        out.append(feat(unary_union(cw), 3, kind='check', name='Cultus Lake (the water)', mu='2-3', ban='No firearms on the lake from 1 February to 30 September.',
                        rule='“Those waters of Cultus Lake to the maximum high water mark during the period of February 1 to September 30.” (Closed Areas Regulation, Schedule 6 s. 3.) '
                             'The land around the lake is a Firearms Using Shot Only Area (Schedule 9 s. 7, not drawn). Not printed in the Region 2 pages.',
                        src=f'{CAR}, Schedule 6 s. 3', page='', map='',
                        boundary='Official lake outline (FWA_LAKES_POLY). The outline is close to, not the same as, the maximum high water mark.', cert=90))
    return out


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

    # Regions 1 and 2 (regional district parks) and Region 2
    out.extend(region2_features(cache, syn))

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
# Region 2 closures with no official outline, near Mission and Harrison first (content/phase7/09-region-2-lower-mainland.md,
# synopsis pages 9, 27 to 31 and the Closed Areas Regulation, read 2026-10-17). (map, name, MUs, text, page, source, certainty)
# MUs for areas described by roads and places are my reading: BC Geographical Names points on the MU layer.
R2 = [
    ('', 'Nicomen, Harrison Bay and Harrison Mills lowland: no rifles', ['2-8', '2-18', '2-19'],
     'No rifles. The area runs from the southeast corner of Squawkum Creek Indian Reserve 3 east along the Canadian Pacific Railway to the District of Kent, '
     'along the Kent line to the District of Chilliwack line, then by the dykes at Zaitscullachan Slough and Skumalasph Indian Reserve 16, Malcolm Road, '
     'a creek near Hodgkin Road and the 200 m contour back to the start. A shotgun and a bow are not banned by this rule. MUs are my reading (85%).',
     None, f'{CAR}, Schedule 11 s. 1 (not printed in the synopsis)', 99),
    ('', 'Nicomen, Deroche, Lake Errock and Harrison Bay: shot only', ['2-8', '2-19'],
     'Firearms Using Shot Only Area: (1) the lowland from Eagle Road and Hatzic Lake east past Stave Lake, Davis Lake Park, Norrish Creek and Deroche Creek '
     'to Malcolm Road and the Harrison Hill dyke, south to the Fraser River, excepting Indian Reserve lands; (2) Harrison Bay, from Squawkum Indian Reserve 3 '
     'to the Highway 7 bridge and the District of Kent. Rifles and slugs are out; shotguns with shot are allowed (99% rule, 85% my reading of the long boundary).',
     None, f'{CAR}, Schedule 9 s. 9 (not printed in the synopsis)', 99),
    ('', 'Highways 1 and 7: shot only within 150 m', ['2-3', '2-8', '2-17', '2-18', '2-19'],
     'Firearms Using Shot Only Area within 150 m (164 yd) of the travelled road: Highway 7 from the east line of Mission to Highway 1, and Highway 1 '
     'from the east line of Chilliwack to the north boundary of MU 2-18. MUs are my reading (85%).',
     None, f'{CAR}, Schedule 9 s. 1 (not printed in the synopsis)', 99),
    ('', 'Nicomen and Hatzic: No Shooting', ['2-8'],
     'No Shooting Area, four pieces east of Mission: Farms, Durieu, Sylvester and Seux roads; Hatzic Slough by Dale Road and Farms Road; north of Highway 7 '
     'from Eagle Road to Hatzic Lake and Sward Road; Ross Road to Taylor Road and Deroche Creek. Also 50 m either side of Sylvester Road from Farms Road to Dale Road (my reading, 85%).',
     None, f'{CAR}, Schedule 5 ss. 63 and 85 (not printed in the synopsis)', 99),
    ('', 'Fraser Valley Regional District roads: no target shooting', ['2-2', '2-3', '2-4', '2-8', '2-17', '2-18', '2-19'],
     'Unless lawfully hunting or trapping, no firearm discharge within 400 m (437 yd) of select FVRD (Fraser Valley Regional District) roads. Hunting is allowed; '
     'target shooting is not. The road map is the FVRD PDF (www.fvrd.ca/assets/Government/Documents/NoShootingAreas.pdf, dated 2017): there is no official outline to draw. '
     'MUs are my reading (80%).', 27, f'{SYN}, page 27', 99),
    ('', 'Forest Service roads north of Mission: no target shooting', ['2-8'],
     'Crown land within 400 m of the Florence Lake, Lost Creek, Terepocki, Lease, Murdo, Mount Kettley and Salsbury Forest Service roads (with spurs), the Hatzic roads '
     'on Map 5.1-1/17 and every road in the Norrish Creek watershed. These are FVRD roads: hunting is allowed, target shooting is not (95%, my reading of page 27).',
     27, f'{SYN}, page 27; {CAR}, Schedule 5.1 ss. 7 to 10', 95),
    ('', 'Harrison west side roads: no target shooting', ['2-19'],
     "Crown land within 400 m of the Francis Lake and Weaver Lake Forest Service roads (with spurs), the Sts'ailes (West) Forest Service Road from the Weaver Lake road "
     'to the Davidson Creek bridge, and the Chehalis Forest Service Road from the Statlu road to the Elbow Lake area (Map B29). Hunting is allowed, target shooting '
     'is not (90%, my reading of page 27 with the regulation).', 27, f'{SYN}, page 27; {CAR}, Schedule 5.1 ss. 11 and 12', 90),
    ('', 'Mount Judge Howay Park', ['2-8'],
     'No Shooting Area: the whole park, north of Stave Lake. Not printed in the synopsis. The park is not in the current BC parks layer, so its line is not drawn: VERIFY the boundary with the regional office (604 586 4400).',
     None, f'{CAR}, Schedule 5 s. 115', 99),
    ('', 'Pitt Wildlife Management Area and Addington Marsh', ['2-8'],
     'No Shooting or Hunting Areas near Pitt Meadows and Port Coquitlam: the Pitt Wildlife Management Area lands from Grant Narrows, and Addington Marsh inside the dyke. '
     'Part of the Pitt area by Koerner and Rannie roads is a seasonal No Shooting or Hunting Area (Schedule 4 s. 3). Described in words, not drawn. '
     'Addington Marsh is also closed to motor vehicles all year (page 27).', None, f'{CAR}, Schedule 3 ss. 12 and 22, Schedule 4 s. 3', 95),
    ('', 'FVRD Electoral Area H (Huntingdon and Sumas Mountain)', ['2-3', '2-4'],
     'No Shooting Area: "Electoral Area H of the Fraser Valley Regional District" (1996 wording, headed Huntingdon and Sumas Mountain). Today\'s Area H, redrawn in 2022, '
     'is around Cultus Lake, not Sumas Mountain, so the app cannot tell which outline the rule means. VERIFY with the regional office before you shoot in either place.',
     None, f'{CAR}, Schedule 5 s. 49', 80),
    ('', 'Cultus Lake land: shot only', ['2-3'],
     'Firearms Using Shot Only Area on the land around Cultus Lake, from the 250 m contour west of the Sweltzer River along Cultus Lake Park. The lake water is drawn as a seasonal No Shooting Area.',
     None, f'{CAR}, Schedule 9 s. 7', 95),
    ('', 'McGillivray Creek, Chilliwack', ['2-4'],
     'No Shooting, Hunting or Trapping Area between McGillivray Creek, the Little Sumas River, the Fraser River and Miller Slough, north of the dyke (my reading, 85%).',
     None, f'{CAR}, Schedule 1 s. 7', 95),
    ('', 'Regional district parks not drawn', [],
     'No hunting or shooting within 100 m (109 yd) of any regional district park (page 9). The map draws only the parks named "Regional Park" in the provincial data. '
     'Community parks run by a regional district, and new parks, are not drawn: watch for park signs.', 9, f'{SYN}, page 9', 99),
    ('', 'Whistler Olympic Park', ['2-6'], 'No hunting inside the park boundaries (Schedule 7 s. 52 draws it on its own map).', 27, f'{SYN}, page 27', 99),
    ('', 'Highway 99 and Callaghan Road', ['2-6', '2-7', '2-8', '2-9'],
     'No hunting and no shooting within 400 m of the road allowance of Highway 99 from Squamish to Whistler and Callaghan Road to the Whistler Olympic Park gate (page 27). '
     'No shooting 400 m west and 1 km east of Highway 99 from West Vancouver to Squamish (page 10). MUs are my reading (80%).', 27, f'{SYN}, pages 10 and 27', 99),
    ('', 'Bowen Island: near buildings and roads', ['2-16'],
     'No hunting within 150 m of any public highway, school building, school yard, public park, playground, church, workshop, place of business, dwelling house or farm building.',
     27, f'{SYN}, page 27', 99),
    ('', 'Burrard Inlet', ['2-8'], 'No firearms on Burrard Inlet east of a straight line from Point Grey to Point Atkinson (Lighthouse Park).', 27, f'{SYN}, page 27', 99),
    ('', 'Boundary Bay and the Delta and Surrey dykes', ['2-4'],
     'Boundary Bay Wildlife Management Area is closed to snipe hunting. No lead shot on any dyke in Delta or on the water side of it, or on the Mud Bay dykes in Surrey.',
     27, f'{SYN}, page 27', 99),
]
FILES = {'12-region-1-vancouver-island.md': '1', '09-region-2-lower-mainland.md': '2', '13-region-4-kootenay.md': '4',
         '14-region-6-skeena.md': '6', '15-region-7a-omineca.md': '7A', '16-region-7b-peace.md': '7B', '10-region-8-okanagan.md': '8'}
BAN = re.compile(r'No Shooting|No Hunting|Shot Only|Sanctuary|Hunting/Shooting|Archery only', re.I)
CAP = re.compile(r'"(Map ([A-Z]\d+)\b[^"]*)"')
MU = re.compile(r'\b([1-8])-(\d{1,2})\b')


def unmapped():
    out = [{'region': '3', 'map': m, 'name': n, 'mus': mus, 'text': t, 'page': pg, 'cert': 99,
            'src': f'{SYN}, page {pg}' if pg else 'Closed Areas Regulation (BC Wildlife Act)'} for m, n, mus, t, pg in R3]
    out += [{'region': '2', 'map': m, 'name': n, 'mus': mus, 'text': t, 'page': pg, 'cert': c, 'src': s} for m, n, mus, t, pg, s, c in R2]
    out.append({'region': '1', 'map': '', 'name': 'Regional district parks not drawn', 'mus': [], 'page': 9, 'cert': 99, 'src': f'{SYN}, page 9',
                'text': R2[[x[1] for x in R2].index('Regional district parks not drawn')][3]})
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
                  'ABMS_MUNICIPALITIES_SP, TA_WILDLIFE_MGMT_AREAS_SVW, FWA_LAKES_POLY, FWA_ISLANDS_POLY, GBA_LOCAL_REG_GREENSPACES_SP, '
                  'PMBC_PARCEL_FABRIC_POLY_SVW and the MU 3-45 outline',  # never name the MU layer here: layers.js muLayer() picks the MU layer by its source
        'about': 'Areas where hunting or shooting is banned, drawn only where the legal area is an official outline (BC wide: ecological '
                 'reserves and national parks; Regions 1 and 2: regional district parks plus 100 m; Region 2: Burns Bog, Bowen, Keats, '
                 'Savary and North Thormanby islands, seasonal Garibaldi Park and Cultus Lake; Region 3: the closures listed in the Rule Book '
                 'that follow an official outline). '
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
