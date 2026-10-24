#!/usr/bin/env python3
"""Hunt Mentor: "Shooting ranges and clubs" map layer (points, all of BC) and the practice shooting rules card.

Source: OpenStreetMap (OSM) through the Overpass API (ODbL, Open Database Licence: credit "OpenStreetMap contributors").
  Query (BC bounding box, then kept only where the point is inside a BC MU, Management Unit, from data/layers/bc/mu):
    leisure=shooting_ground, sport ~ shooting|archery|clay_pigeon|trap|skeet, any shooting=* tag
  Dropped: shops (shop=*), paintball and airsoft only, disused or abandoned features.
  OSM often maps one club as several parts (bays, archery field, clubhouse). Parts within 1 km are merged into one site
  unless they show two clubs (different operators or two club names; a chain is split around each club).
No other machine readable, reuse licensed list was found (2026-10-16): the BC Wildlife Federation club list
(https://bcwf.bc.ca/our-clubs/) is a web page with no open licence, so the app only links to it.

Each site: name (from the data, or "Shooting range (no name in the data)"), kind (rifle | shotgun | archery | pistol | mixed | unknown),
types (plain words), website, phone, email, hours, operator, access, indoor (only when the OSM data has them, never invented),
parts, osm (ids), mu, note (Tip on fees). Type comes from OSM tags and words in the mapped names (for example "Archery").

Outputs:
  data/addons/practice/ranges.geojson   the sites (precached by the build, so the layer and the practice tool work offline)
  data/addons/practice/backstop.svg     copy of diagrams/hf-backstop.svg (the lessons' backstop diagram)
  data/layers/manifest.json             the "ranges" entry is added or replaced (other layers kept)

Usage: python3 scripts/build-ranges.py --cache /path/outside/repo      (needs shapely)
"""
import argparse
import datetime as dt
import json
import math
import re
import shutil
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import shape, Point
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
TODAY = dt.date.today().isoformat()
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
QUERY = '''[out:json][timeout:180][bbox:48.2,-139.1,60.1,-114.0];
(
  nwr["leisure"="shooting_ground"];
  nwr["sport"~"shooting|archery|clay_pigeon|trap|skeet"];
  nwr["shooting"];
);
out center tags;'''
NOTE = 'Membership or day fees may apply. Call first (Tip).'
MERGE_M = 1000


def fetch(cache):
    f = cache / 'overpass_bc_shooting.json'
    if f.exists():
        return json.load(open(f))
    err = None
    for u in OVERPASS:
        try:
            print('fetch', u)
            req = urllib.request.Request(u, data=urllib.parse.urlencode({'data': QUERY}).encode(), headers={'User-Agent': 'HuntMentor build-ranges'})
            d = json.load(urllib.request.urlopen(req, timeout=400))
            if 'elements' in d:
                json.dump(d, open(f, 'w'))
                return d
        except Exception as e:  # mirror down: try the next
            err = e
    raise SystemExit(f'Overpass failed: {err}')


def split(v):
    return [x.strip().lower() for x in str(v or '').split(';') if x.strip()]


DROP_ONLY = {'paintball', 'airsoft'}


def types_of(t):
    """Types from tags and words in the name. Returns a set of rifle | shotgun | archery | pistol."""
    out = set()
    words = ' '.join(str(t.get(k, '')) for k in ('name', 'description')).lower()
    vals = split(t.get('sport')) + split(t.get('shooting'))
    for v in vals:
        if v == 'archery':
            out.add('archery')
        elif v in ('clay_pigeon', 'trap', 'skeet', 'sporting_clays', 'shotgun'):
            out.add('shotgun')
        elif v in ('pistol', 'handgun'):
            out.add('pistol')
        elif v in ('rifle', 'smallbore', 'fullbore', 'biathlon', 'air_rifle', 'long_range'):
            out.add('rifle')
    if re.search(r'archer|\bbow', words):
        out.add('archery')
    if re.search(r'\btrap\b|skeet|clay|sporting clays|shotgun', words):
        out.add('shotgun')
    if re.search(r'pistol|handgun|ipsc', words):
        out.add('pistol')
    if re.search(r'rifle|long range|\bbench', words):
        out.add('rifle')
    return out


def keep(t):
    if t.get('shop') or t.get('disused') or t.get('abandoned') or t.get('disused:leisure'):
        return False
    vals = set(split(t.get('sport')) + split(t.get('shooting')))
    if vals and vals <= DROP_ONLY:
        return False
    return True


def ll(e):
    if 'lat' in e:
        return e['lon'], e['lat']
    c = e.get('center') or {}
    return c.get('lon'), c.get('lat')


def dist_m(a, b):
    k = math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * 111320 * k, (a[1] - b[1]) * 110574)


def mu_index():
    geoms, ids = [], []
    for f in sorted((ROOT / 'data/layers/bc/mu').glob('region_*.geojson')):
        for ft in json.load(open(f))['features']:
            geoms.append(shape(ft['geometry']))
            ids.append(ft['properties'].get('MU', ''))
    tree = STRtree(geoms)

    def at(x, y):
        pt = Point(x, y)
        for i in tree.query(pt):
            if geoms[i].contains(pt):
                return ids[i]
        return None
    return at


def common_prefix(names):
    ws = [n.split() for n in names]
    out = []
    for parts in zip(*ws):
        if len(set(p.lower() for p in parts)) != 1:
            break
        out.append(parts[0])
    p = ' '.join(out).strip(' -,:')
    return p if len(p) >= 3 and p.lower() not in ('the',) else ''


CLUB = re.compile(r'club|association|society|sportsm|fish (and|&) game|rod (and|&) gun|federation|academy|archers\b|range ltd', re.I)


def club_name(t):
    """The club's own name: a whole site feature (shooting ground, sports centre, club) or a name that reads like a club."""
    n = (t.get('name') or '').strip()
    if n and (t.get('leisure') == 'shooting_ground' or t.get('club') or CLUB.search(n)):
        return n
    return ''


PRIORITY = {'shooting_ground': 0, 'sports_centre': 1, 'club': 1}
TYPE_WORD = {'rifle': 'Rifle', 'shotgun': 'Shotgun (trap, skeet or clays)', 'archery': 'Archery', 'pistol': 'Pistol'}
ORDER = ['rifle', 'shotgun', 'archery', 'pistol']


def first(tags_list, *keys):
    for t in tags_list:
        for k in keys:
            if t.get(k):
                return str(t[k]).strip()
    return ''


def build(d):
    mu_at = mu_index()
    els = []
    for e in d['elements']:
        t = e.get('tags') or {}
        x, y = ll(e)
        if x is None or not keep(t):
            continue
        mu = mu_at(x, y)
        if not mu:
            continue  # outside BC (Alberta, Washington, Yukon) or offshore
        els.append({'x': x, 'y': y, 't': t, 'id': f"{e['type']}/{e['id']}", 'mu': mu})
    # merge parts within MERGE_M (single link)
    n = len(els)
    par = list(range(n))

    def root(i):
        while par[i] != i:
            par[i] = par[par[i]]
            i = par[i]
        return i
    def same_site(a, b):
        """Parts of one club: close, and not two different operators or two different club names."""
        if dist_m((a['x'], a['y']), (b['x'], b['y'])) > MERGE_M:
            return False
        oa, ob = (a['t'].get('operator') or '').strip().lower(), (b['t'].get('operator') or '').strip().lower()
        if oa and ob and oa != ob:
            return False
        ca, cb = club_name(a['t']), club_name(b['t'])
        return not (ca and cb and ca.lower() != cb.lower())
    for i in range(n):
        for j in range(i + 1, n):
            if same_site(els[i], els[j]):
                par[root(i)] = root(j)
    groups = {}
    for i, e in enumerate(els):
        groups.setdefault(root(i), []).append(e)
    # a chain of parts can still join two clubs: split such a group around each club's own feature
    split_groups = []
    for g in groups.values():
        seeds = {}
        for e in g:
            c = club_name(e['t'])
            if c and c.lower() not in seeds:
                seeds[c.lower()] = e
        if len(seeds) < 2:
            split_groups.append(g)
            continue
        sub = {k: [] for k in seeds}
        for e in g:
            c = club_name(e['t'])
            k = c.lower() if c else min(seeds, key=lambda k: dist_m((e['x'], e['y']), (seeds[k]['x'], seeds[k]['y'])))
            sub[k].append(e)
        split_groups.extend(sub.values())
    feats = []
    for g in split_groups:
        g.sort(key=lambda e: (0 if club_name(e['t']) else 1, PRIORITY.get(e['t'].get('leisure') or e['t'].get('club'), 5), 0 if e['t'].get('name') else 1))
        tl = [e['t'] for e in g]
        named = [t['name'].strip() for t in tl if t.get('name')]
        top = g[0]['t']
        if club_name(top):
            name = club_name(top)
        elif len(set(named)) > 1 and common_prefix(named):
            name = common_prefix(named)
        elif first(tl, 'operator'):
            name = first(tl, 'operator')
        elif len(set(named)) > 1:
            name = 'Shooting range (club name not in the data)'
        elif named:
            name = named[0]
        else:
            name = 'Shooting range (no name in the data)'
        ty = set()
        for t in tl:
            ty |= types_of(t)
        kinds = [k for k in ORDER if k in ty]
        kind = kinds[0] if len(kinds) == 1 else 'mixed' if kinds else 'unknown'
        x = sum(e['x'] for e in g) / len(g)
        y = sum(e['y'] for e in g) / len(g)
        parts = sorted({nm for nm in named if nm != name})
        acc = first(tl, 'access')
        p = {
            'name': name, 'kind': kind,
            'types': ', '.join(TYPE_WORD[k] for k in kinds) or 'Type not in the data',
            'website': first(tl, 'website', 'contact:website', 'url'),
            'phone': first(tl, 'phone', 'contact:phone'),
            'email': first(tl, 'email', 'contact:email'),
            'hours': first(tl, 'opening_hours'),
            'operator': first(tl, 'operator') if first(tl, 'operator') != name else '',
            'access': {'private': 'Private (members or permission)', 'members': 'Members', 'customers': 'Customers', 'yes': 'Open to the public (in the data)', 'permissive': 'Open by permission'}.get(acc, acc),
            'indoor': 'Indoor' if any(t.get('indoor') == 'yes' or t.get('building') for t in tl) else '',
            'parts': ', '.join(parts[:8]),
            'osm': ' '.join(e['id'] for e in g[:6]),
            'mu': g[0]['mu'],
            'note': NOTE,
            'src': 'OpenStreetMap contributors (ODbL)',
        }
        p = {k: v for k, v in p.items() if v != ''}
        feats.append({'type': 'Feature', 'properties': p, 'geometry': {'type': 'Point', 'coordinates': [round(x, 5), round(y, 5)]}})
    feats.sort(key=lambda f: (f['properties']['mu'], f['properties']['name']))
    return feats, len(els)


def update_manifest(path, n, osm_date):
    mp = ROOT / 'data/layers/manifest.json'
    man = json.load(open(mp))
    entry = {
        'id': 'ranges', 'group': 'Practice shooting', 'label': 'Shooting ranges and clubs', 'type': 'circle', 'minzoom': 5,
        'paint': {'circle-color': ['match', ['get', 'kind'], 'rifle', '#ffab00', 'shotgun', '#6200ea', 'archery', '#00bfa5', '#3e2723'],
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 10, 7, 14, 9],
                  'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2},
        'popup': [['Type', 'types'], ['Parts', 'parts'], ['Access', 'access'], ['Indoor', 'indoor'], ['Website', 'website'], ['Phone', 'phone'],
                  ['Email', 'email'], ['Hours', 'hours'], ['Operator', 'operator'], ['MU (Management Unit)', 'mu'], ['Fees', 'note'], ['OSM (OpenStreetMap) id', 'osm']],
        'labelField': 'name', 'legal': False,
        'source': 'OpenStreetMap contributors, through the Overpass API: leisure=shooting_ground, sport=shooting or archery, shooting=*',
        'attribution': '© OpenStreetMap contributors (ODbL)',
        'about': 'Shooting ranges, gun clubs and archery ranges mapped in OpenStreetMap, all of BC. Volunteer mapped: some clubs are missing, '
                 'some may have closed. Website and phone only where the data has them. Membership or day fees may apply: call first (Tip).',
        'cert': 70, 'file': f'data/addons/practice/{path.name}', 'areas': 'BC', 'licence': 'ODbL (Open Database Licence), OpenStreetMap contributors',
        'dataDate': osm_date, 'bytes': path.stat().st_size, 'features': n,
        'legend': [['Rifle', '#ffab00'], ['Shotgun: trap, skeet or clays', '#6200ea'], ['Archery', '#00bfa5'], ['Pistol, more than one type, or type not in the data', '#3e2723']],
    }
    layers = [l for l in man['layers'] if l.get('id') != 'ranges']
    at = next((i + 1 for i, l in enumerate(layers) if l.get('id') == 'rec_trails'), len(layers))
    layers.insert(at, entry)
    man['layers'] = layers
    tmp = mp.with_suffix('.tmp')
    json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
    tmp.replace(mp)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cache', required=True, help='folder for the raw Overpass download (outside the repo)')
    a = ap.parse_args()
    cache = Path(a.cache).resolve()
    if str(cache).startswith(str(ROOT)):
        raise SystemExit('cache must be outside the repo')
    cache.mkdir(parents=True, exist_ok=True)
    d = fetch(cache)
    osm_date = str((d.get('osm3s') or {}).get('timestamp_osm_base', TODAY))[:10]
    feats, raw = build(d)
    out = ROOT / 'data/addons/practice'
    out.mkdir(parents=True, exist_ok=True)
    geo = out / 'ranges.geojson'
    lines = [json.dumps(f, ensure_ascii=False, separators=(',', ':')) for f in feats]
    geo.write_text('{"type":"FeatureCollection","osmDate":"%s","built":"%s","features":[\n' % (osm_date, TODAY) + ',\n'.join(lines) + '\n]}\n')
    shutil.copyfile(ROOT / 'diagrams/hf-backstop.svg', out / 'backstop.svg')
    update_manifest(geo, len(feats), osm_date)
    by = {}
    for f in feats:
        by[f['properties']['kind']] = by.get(f['properties']['kind'], 0) + 1
    print(f'{raw} OSM features in BC -> {len(feats)} sites, {geo.stat().st_size / 1e3:.0f} KB, OSM data {osm_date}; by kind {by}')
    for f in feats:
        if f['properties']['mu'].startswith('3-'):
            print(' ', f['properties']['mu'], f['properties']['name'], '|', f['properties']['types'], '|', f['properties'].get('website', ''), f['properties'].get('phone', ''))


if __name__ == '__main__':
    main()
