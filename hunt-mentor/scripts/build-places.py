#!/usr/bin/env python3
"""Build the place data for "tap a place to see it on the map" (app/places.js).

Writes (committed, precached by build.mjs):
  data/places/mu.json      every BC Management Unit (MU) and Region: bbox, label point, small outline,
                           neighbours, towns inside, nearest town; plus the incorporated towns list.
  data/places/places.json  gazetteer: place names that the lessons, glossary, flashcards and planner mention,
                           with coordinates from the BC Geographical Names web service (BCGNWS) only.
  data/places/unresolved.json  names left out (not found, ambiguous, outside BC) with the reason.

Sources:
  MU polygons: data/layers/bc/mu/region_*.geojson (WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW, via the
  map data pipeline). Place coordinates: https://apps.gov.bc.ca/pub/bcgnws (Open Government Licence BC).

Run: python3 scripts/build-places.py --cache /path/to/cache   (BCGNWS answers are cached there; reruns are offline)
Needs: shapely, pyproj.
"""
import argparse, glob, json, math, os, re, sys, time, urllib.parse, urllib.request, collections
from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union, transform
from pyproj import Transformer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--cache', required=True)
ap.add_argument('--offline', action='store_true', help='never call the web service (use the cache only)')
args = ap.parse_args()
CACHE = args.cache
os.makedirs(os.path.join(CACHE, 'names'), exist_ok=True)
TODAY = time.strftime('%Y-%m-%d')

fwd = Transformer.from_crs('EPSG:4326', 'EPSG:3005', always_xy=True).transform  # BC Albers, metres
inv = Transformer.from_crs('EPSG:3005', 'EPSG:4326', always_xy=True).transform

# ---------- regions and MUs ----------
REGIONS = [('1', 'Vancouver Island', 'region_1'), ('2', 'Lower Mainland', 'region_2'), ('3', 'Thompson', 'region_3'),
           ('4', 'Kootenay', 'region_4'), ('5', 'Cariboo', 'region_5'), ('6', 'Skeena', 'region_6'),
           ('7A', 'Omineca', 'region_7a'), ('7B', 'Peace', 'region_7b'), ('8', 'Okanagan', 'region_8')]
# Region names: the MU layer's regionName, except 7B (the layer says Omineca for both 7A and 7B); 7B Peace is the
# name the synopsis and the Rule Book lesson use (content/phase7/16-region-7b-peace.md).
lessons = {}
for f in glob.glob(os.path.join(ROOT, 'content', 'phase7', '*.md')):
    m = re.search(r'^id:\s*(rb-region-(\w+))', open(f).read(), re.M)
    if m: lessons[m.group(2).upper()] = m.group(1)

mus = []  # dicts with geometry
for code, name, fn in REGIONS:
    d = json.load(open(os.path.join(ROOT, 'data', 'layers', 'bc', 'mu', fn + '.geojson')))
    for f in d['features']:
        g = shape(f['geometry'])
        if not g.is_valid: g = g.buffer(0)
        mus.append({'id': f['properties']['MU'], 'r': code, 'zone': f['properties'].get('zone') or '', 'g': g, 'ga': transform(fwd, g)})
mus.sort(key=lambda m: (m['r'], int(m['id'].split('-')[1])))
by_id = {m['id']: m for m in mus}
assert len(by_id) == len(mus), 'duplicate MU ids'

def enc(geom, tol_m, digits=3):
    """Simplify in metres, then flat delta encoded integers (1e-3 degrees): [[x0,y0,dx,dy,...], ...] one per ring."""
    s = geom.simplify(tol_m, preserve_topology=True)
    polys = [s] if s.geom_type == 'Polygon' else list(s.geoms)
    out = []
    k = 10 ** digits
    for p in sorted(polys, key=lambda p: -p.area):
        if p.area < (tol_m * 6) ** 2 and out: continue  # tiny islands
        ring = transform(inv, p).exterior.coords
        pts = [(round(x * k), round(y * k)) for x, y in ring]
        flat, px, py = [], 0, 0
        for i, (x, y) in enumerate(pts):
            if i and x == px and y == py: continue
            flat += [x - px, y - py] if i else [x, y]
            px, py = x, y
        if len(flat) >= 8: out.append(flat)
    return out

def bbox(g):
    b = g.bounds
    return [round(b[0], 3), round(b[1], 3), round(b[2], 3), round(b[3], 3)]

# ---------- BC Geographical Names web service ----------
GN = 'https://apps.gov.bc.ca/pub/bcgnws/names/search?outputFormat=json&outputSRS=4326&'

def gn_get(params, key):
    f = os.path.join(CACHE, 'names', key + '.json')
    if os.path.exists(f): return json.load(open(f))
    if args.offline: return None
    url = GN + urllib.parse.urlencode(params)
    for k in range(4):
        try:
            d = json.loads(urllib.request.urlopen(url, timeout=60).read())
            json.dump(d, open(f, 'w')); time.sleep(0.15); return d
        except Exception as e:
            print('retry', key, e, file=sys.stderr); time.sleep(2 + k * 3)
    return None

def gn_category(c):
    out, s = [], 1
    while True:
        d = gn_get({'name': '*', 'featureCategory': c, 'itemsPerPage': 200, 'startIndex': s}, f'cat{c}_{s}')
        if not d: break
        out += d['features']
        if not d['features'] or s + len(d['features']) > d['properties']['totalResults']: break
        s += len(d['features'])
    return out

def gn_name(name):
    key = re.sub(r'[^A-Za-z0-9]+', '_', name)[:80]
    d = gn_get({'name': name, 'exactSpelling': 1, 'itemsPerPage': 100}, 'n_' + key)
    if not d: return None
    return [f for f in d['features'] if f['properties']['name'] == name]

def rec(f):
    p = f['properties']; x, y = f['geometry']['coordinates'][:2]
    return {'name': p['name'], 'type': p['featureType'], 'cat': int(p['featureCategory']), 'catd': p['featureCategoryDescription'],
            'lon': x, 'lat': y, 'official': p.get('isOfficial') == 1, 'status': p.get('status'), 'gid': p['feature']['id'], 'uri': 'https://' + p['uri']}

# towns: incorporated places (category 1)
# only adopted, official names (the list also holds rescinded and recorded names such as Matsqui or Borland)
towns, _seen = [], set()
for t in sorted((rec(f) for f in gn_category(1)), key=lambda t: t['name']):
    if not t['official'] or t['status'] != 'adopted' or 'Regional' in t['name'] or t['name'] in _seen: continue
    _seen.add(t['name']); towns.append(t)
bases = json.load(open(os.path.join(ROOT, 'data', 'bases.json')))
BIG = {'City', 'Town', 'District Municipality (1)', 'Resort Municipality', 'Mountain Resort Municipality'}

def mu_at(lon, lat):
    pt = Point(lon, lat)
    for m in mus:
        if m['g'].contains(pt): return m
    best, bd = None, 1e18
    pa = Point(*fwd(lon, lat))
    for m in mus:
        d = m['ga'].distance(pa)
        if d < bd: best, bd = m, d
    return best if bd < 3000 else None  # just off shore: the nearest MU within 3 km

DIRS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west']
def dist_dir(lon0, lat0, lon1, lat1):
    """km and compass direction of point 1 seen from point 0."""
    x0, y0 = fwd(lon0, lat0); x1, y1 = fwd(lon1, lat1)
    dx, dy = x1 - x0, y1 - y0
    km = math.hypot(dx, dy) / 1000
    ang = (math.degrees(math.atan2(dx, dy)) + 360) % 360
    return km, DIRS[int((ang + 22.5) // 45) % 8]

def near_town(lon, lat, exclude=(), big=True):
    best, bd = None, 1e18
    for i, t in enumerate(towns):
        if t['name'] in exclude or (big and t['type'] not in BIG): continue
        x0, y0 = fwd(lon, lat); x1, y1 = fwd(t['lon'], t['lat'])
        d = math.hypot(x1 - x0, y1 - y0)
        if d < bd: best, bd = i, d
    return best

# ---------- MU index ----------
mu_out = []
for m in mus:
    ga = m['ga']
    nb = []
    gb = ga.buffer(150)
    for o in mus:
        if o is m: continue
        if not gb.intersects(o['ga']): continue
        shared = gb.intersection(o['ga'].boundary).length
        if shared > 400: nb.append(o['id'])
    lp = m['g'].representative_point()
    inside = []
    for b in bases:
        if m['g'].contains(Point(b['lon'], b['lat'])): inside.append(['b', b['id']])
    RANK = {'City': 0, 'District Municipality (1)': 1, 'Town': 2, 'Mountain Resort Municipality': 3, 'Resort Municipality': 3, 'Village (1)': 4}
    tin = [i for i, t in enumerate(towns) if m['g'].contains(Point(t['lon'], t['lat']))]
    inside += [['t', i] for i in sorted(tin, key=lambda i: (RANK.get(towns[i]['type'], 5), towns[i]['name']))]
    # nearest bigger town outside the MU (or the biggest inside when the MU holds one)
    c = m['g'].centroid if m['g'].contains(m['g'].centroid) else lp
    ins_names = {towns[i]['name'] for k, i in inside if k == 't'}
    ref = near_town(c.x, c.y, exclude=ins_names)
    km, dr = dist_dir(towns[ref]['lon'], towns[ref]['lat'], c.x, c.y)
    area = ga.area / 1e6
    mu_out.append({'id': m['id'], 'r': m['r'], 'z': m['zone'], 'b': bbox(m['g']), 'c': [round(lp.x, 3), round(lp.y, 3)],
                   'km2': int(round(area, -1)), 'o': enc(ga, 1100), 'nb': sorted(nb, key=lambda s: (s.split('-')[0], int(s.split('-')[1]))),
                   'in': inside[:6], 'ref': [ref, int(round(km)), dr]})

nb_of = {x['id']: set(x['nb']) for x in mu_out}
reg_out = []
for code, name, fn in REGIONS:
    ms = [m for m in mus if m['r'] == code]
    ua = unary_union([m['ga'].buffer(60) for m in ms]).buffer(-60)
    ug = transform(inv, ua)
    lp = ug.representative_point()
    big = [i for i, t in enumerate(towns) if t['type'] in ('City',) and ug.contains(Point(t['lon'], t['lat']))]
    big.sort(key=lambda i: towns[i]['name'])
    reg_out.append({'id': code, 'name': name, 'lesson': lessons.get(code), 'b': bbox(ug), 'c': [round(lp.x, 3), round(lp.y, 3)],
                    'o': enc(ua, 2500), 'mus': len(ms), 'cities': big})

mu_json = {
    'updated': TODAY,
    'note': 'Built by scripts/build-places.py. MU outlines simplified (about 1 km) for small offline maps only. Do not use the outlines for legal boundaries.',
    'source': {'mu': 'BC Data Catalogue WHSE_WILDLIFE_MANAGEMENT.WAA_WILDLIFE_MGMT_UNITS_SVW (data/layers/bc/mu, data date 2026-10-03)',
               'towns': 'BC Geographical Names web service (apps.gov.bc.ca/pub/bcgnws), incorporated places', 'licence': 'Open Government Licence BC', 'cert': 95},
    'enc': 'o: rings of delta encoded integers, 1e-3 degrees: [lon0, lat0, dlon, dlat, ...]. in: [["b", baseId] | ["t", townIndex]]. ref: [townIndex, km, direction of the MU from that town].',
    'regions': reg_out, 'mus': mu_out,
    'towns': [[t['name'], round(t['lon'], 4), round(t['lat'], 4), t['type'].replace(' (1)', '')] for t in towns],
}

# ---------- corpus: where place names are mentioned ----------
REGION_FILES = {'local-heffley': '3', 'local-mission': '2', 'local-okanagan': '8'}
corpus = []  # (source, ctx_region, line)
def add_text(src, text, reg=None):
    for line in text.split('\n'):
        if line.strip(): corpus.append((src, reg, line))
for f in sorted(glob.glob(os.path.join(ROOT, 'content', '**', '*.md'), recursive=True)):
    t = open(f).read()
    m = re.search(r'^id:\s*(\S+)', t, re.M); sid = m.group(1) if m else os.path.basename(f)
    reg = None
    m2 = re.match(r'rb-region-(\w+)$', sid)
    if m2: reg = m2.group(1).upper()
    reg = REGION_FILES.get(sid, reg)
    t = re.sub(r'```(diagram|photo|gallery|anim|video)[^\n]*\n[\s\S]*?```', '', t)
    add_text(os.path.relpath(f, ROOT), t, reg)
for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'flashcards*.json'))):
    for c in json.load(open(f)):
        add_text(os.path.relpath(f, ROOT), ' '.join(str(c.get(k, '')) for k in ('front', 'back')))
for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'plans', '*.json'))):
    def strings(o):
        if isinstance(o, str): yield o
        elif isinstance(o, list):
            for v in o: yield from strings(v)
        elif isinstance(o, dict):
            for v in o.values(): yield from strings(v)
    for t in strings(json.load(open(f))): add_text(os.path.relpath(f, ROOT), t)

MU_RE = re.compile(r'\b(\d{1,2}-\d{1,3})\b')
REG_RE = re.compile(r'\bRegions?\s+(\d[AB]?)\b')
def ctx_of(src, reg, line):
    ctx_mu = [x for x in MU_RE.findall(line) if x in by_id] if re.search(r'\bMUs?\b|Management Units?|^\s*\|', line) else []
    ctx_r = REG_RE.findall(line)
    return ctx_mu, ([reg] if reg else []) + [r for r in ctx_r if r not in ('7',)]

# ---------- candidate names ----------
SUFFIX = r'(?:Lake|Lakes|River|Creek|Mountain|Mountains|Peak|Range|Valley|Park|Provincial Park|Plateau|Slough|Marsh|Pond|Island|Islands|Bay|Hill|Hills|Ridge|Canyon|Flats|Prairie|Arm|Sound|Inlet|Grasslands|Pass|Falls|Spit|Point|Glacier|Meadows)'
LEAD = {'Near', 'The', 'From', 'At', 'Around', 'No', 'Many', 'Use', 'In', 'On', 'To', 'Upper', 'Lower', 'North', 'South', 'East', 'West', 'Big', 'Little', 'Of', 'And', 'Or', 'Like', 'For', 'Above', 'Below', 'Past', 'By', 'Into', 'Off', 'Hunting', 'District', 'Find', 'Try', 'Visit', 'Drive', 'See', 'Map', 'Each', 'This', 'That', 'All', 'Some', 'Any', 'Most', 'Both', 'Your', 'Our', 'Its', 'Their', 'Then', 'Also', 'Only', 'When', 'Where', 'If', 'Rule', 'Tip', 'My', 'Grandpa', 'Region', 'Closed'}
GENERIC = {'National Park', 'Provincial Park', 'Forest Service Road', 'Off Road', 'Resource Road', 'Ungulate Winter Range', 'Great Lakes',
           'Rocky Mountain', 'Coast Range', 'Use Range', 'Gulf Island', 'One Island', 'Island Pond', 'Southern Mountain', 'Interior Rocky Mountain',
           'Southern Rocky Mountain', 'Muskwa Foothills Mountain', 'Special Mountain', 'Hunting of Mountain', 'Community Lake Southwest'}
cand_re = re.compile(r"\b((?:[A-Z][a-zA-Z'’]+|Mount)(?:\s(?:[A-Z][a-zA-Z'’]+|of|de|la|du))*\s" + SUFFIX + r")\b(?!\s(?:Road|FSR|Forest|rec site))")
mount_re = re.compile(r"\b(Mount\s[A-Z][a-zA-Z'’]+(?:\s[A-Z][a-zA-Z'’]+)?)\b")
cands = collections.Counter()
for src, reg, line in corpus:
    for m in list(cand_re.finditer(line)) + list(mount_re.finditer(line)):
        cands[m.group(1)] += 1

def variants(ph):
    w = ph.split()
    out = [ph]
    while len(w) > 2 and w[0] in LEAD:
        w = w[1:]; out.append(' '.join(w))
    if w and w[0] in LEAD and len(w) == 2 and w[0] not in ('Upper', 'Lower', 'North', 'South', 'East', 'West', 'Big', 'Little'): out.append(None)
    return out

names = set()
for ph in cands:
    for v in variants(ph):
        if v and v not in GENERIC: names.add(v)

# populated places, parks: match the downloaded lists against the text (whole word, case sensitive)
alltext = '\n'.join(l for _, _, l in corpus)
listed = collections.defaultdict(list)
for c in ('1', '2', '3', '4'):
    for f in gn_category(c):
        r = rec(f)
        if r['type'] in ('Railway Point', 'Former Railway Point', 'Station', 'Post Office', 'Former Post Office', 'Former Locality', 'Abandoned Locality',
                         'Former First Nation Village', 'Former Cannery', 'Réserve indienne', 'Indian Reserve', 'Trading Post', 'Indian Settlement', 'Fort',
                         'Landing (1)', 'Ranch'):
            continue
        listed[r['name']].append(r)
# single word place names that are also everyday words or game names: never auto linked
COMMON = {'Hope', 'Mission', 'Chase', 'Union', 'Lone', 'Grouse', 'Elk', 'Moose', 'Deer', 'Bear', 'Eagle', 'Black', 'White', 'Red', 'Green', 'Blue', 'Gold', 'Silver',
          'Ruby', 'Lillooet' if False else '_', 'Field', 'Ocean', 'Port', 'Glacier', 'Canyon', 'Valley', 'Central', 'North', 'South', 'East', 'West', 'Summit',
          'Fort', 'Lake', 'Junction', 'Harrison', 'Prince', 'Rose', 'Sunset', 'Pioneer', 'Hunter', 'Bridge', 'Spring', 'Cedar', 'Pine', 'Willow', 'Aspen',
          'Birch', 'Alder', 'Fir', 'Spruce', 'Hemlock', 'Sage', 'Clinton', 'Lumby', 'Fairview', 'Cache', 'Range', 'Park', 'Garden', 'Beaver', 'Otter', 'Mink',
          'Fox', 'Wolf', 'Lynx', 'Marten', 'Fisher', 'Quail', 'Pheasant', 'Coyote', 'Cougar', 'Caribou', 'Bison', 'Goat', 'Sheep', 'Mule', 'Rock', 'Stone',
          'Iron', 'Copper', 'Coal', 'Salt', 'Sand', 'Snow', 'Ice', 'Rain', 'Wind', 'Sun', 'Moon', 'Star', 'Lucky', 'Happy', 'Paradise', 'Hazel', 'Dawson',
          'Grand', 'Little', 'Big', 'Long', 'Old', 'New', 'Upper', 'Lower', 'Indian', 'Albert', 'Campbell', 'Canoe', 'Boat', 'Horse', 'Cow', 'Bull',
          'Ram', 'Buck', 'Doe', 'Fawn', 'Calf', 'Lamb', 'Kid', 'Twin', 'Rich', 'Rest', 'Notch', 'Gun', 'Shot', 'Rifle', 'Arrow', 'Bow', 'Point', 'Bay',
          'Arm', 'Falls', 'Rapids', 'Forks', 'Bend', 'Crossing', 'Landing', 'Ranch', 'Mile', 'Halfway', 'Midway', 'Mica', 'Blind', 'Wells', 'Squamish' if False else '_',
          'Tip', 'Grandpa', 'Kent', 'Hall', 'Pass', 'Nelson', 'Taylor', 'Edgewood', 'Riverside', 'Lakeview', 'Hilltop', 'Westside', 'Thompson', 'Fraser',
          'Okanagan', 'Kootenay', 'Cariboo', 'Skeena', 'Omineca', 'Peace', 'Columbia', 'Shuswap', 'Similkameen', 'Nicola', 'Boundary', 'Bonaparte'}
# single word unincorporated names: only these (checked by hand against the lesson text, 2026-10-11); the rest are
# everyday words or mean something else in the lessons (Alaska the state, Likely the word, Carmi in "Upper Carmi Road")
SINGLE_OK = {'Agassiz', 'Atlin', 'Balfour', 'Brisco', 'Chopaka', 'Deroche', 'Dunster', 'Egmont', 'Endako', 'Erickson', 'Fauquier', 'Fontas', 'Gabriola',
             'Ganges', 'Haney', 'Harrop', 'Hatzic', 'Hedley', 'Hosmer', 'Huntingdon', 'Ioco', 'Kaleden', 'Kincolith', 'Kitchener', 'Kitwanga', 'Kleindale',
             'Knutsford', 'Ladner', 'Lund', 'Malahat', 'Merville', 'Naramata', 'Othello', 'Pinantan', 'Popkum', 'Pritchard', 'Sandspit', 'Savona', 'Sorrento',
             'Spillimacheen', 'Spuzzum', 'Squilax', 'Tranquille', 'Vananda', 'Westsyde', 'Westwold', 'Windermere', 'Wonowon', 'Wycliffe', 'Pavilion', 'Glade'}
# towns whose name is also an everyday word or a surname: linked, but never at the start of a sentence (app/places.js)
GUARD = {'Trail', 'Hope', 'Mission', 'Chase', 'Golden', 'Delta', 'Oliver', 'Clinton', 'Nelson', 'Kent', 'Taylor', 'Victoria', 'Stewart', 'Houston', 'Terrace',
         'Merritt', 'Sidney', 'Richmond', 'Surrey', 'Langley', 'Lumby'}
BLOCK = {'North Star', 'Lake Hill', 'Mount Robson', 'Red Rock', 'Clearwater Station'}
for name, rs in listed.items():
    if name in BLOCK: continue
    if ' ' not in name and name not in GUARD and (name in COMMON or len(name) < 4): continue
    if name in GUARD and not any(r['cat'] == 1 for r in rs): continue
    if ' ' not in name and not any(r['cat'] in (1, 4) for r in rs) and name not in SINGLE_OK: continue
    if re.search(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])', alltext): names.add(name)

# ---------- resolve each name ----------
SUF_CAT = [(r'(Lake|Lakes|Pond|Slough|Marsh)$', {10, 11, 13}), (r'(River|Creek)$', {8, 9}), (r'(Mountain|Mountains|Peak|Range|Ridge|Hill|Hills|Plateau|Mount\s.*)$', {15, 16}),
           (r'Park$', {4}), (r'(Bay|Inlet|Sound|Arm|Spit|Point)$', {12, 13, 16, 17, 10, 11}), (r'(Island|Islands)$', {14}), (r'(Valley|Canyon|Pass)$', {19, 15, 6}),
           (r'(Flats|Prairie|Grasslands|Meadows)$', {20, 6})]
POP = {1, 2, 3}
TYPE_WORD = {1: 'town', 2: 'community', 3: 'community', 4: 'park', 8: 'river or creek', 10: 'lake', 11: 'lake', 15: 'mountain', 14: 'island', 12: 'bay or inlet', 13: 'shoreline water', 19: 'valley', 20: 'flat land'}

def kind_of(r):
    t = r['type'].replace(' (1)', '').replace(' (2)', '')
    if r['cat'] == 1: return 'town'
    if r['cat'] in (2, 3): return 'community'
    if r['cat'] == 4: return 'park'
    low = t.lower()
    if 'mountains' in low or 'range' in low: return 'mountain range'
    if 'hills' in low: return 'group of hills'
    if 'islands' in low: return 'group of islands'
    for k in ('lake', 'river', 'creek', 'mountain', 'peak', 'range', 'ridge', 'hill', 'plateau', 'island', 'bay', 'inlet', 'sound', 'valley', 'canyon', 'pass',
              'marsh', 'slough', 'pond', 'arm', 'flat', 'meadow', 'spit', 'point', 'falls', 'glacier'):
        if k in low: return {'flat': 'flats', 'meadow': 'meadows'}.get(k, k)
    return low or 'place'

def km_between(a, b):
    x0, y0 = fwd(a['lon'], a['lat']); x1, y1 = fwd(b['lon'], b['lat'])
    return math.hypot(x1 - x0, y1 - y0) / 1000

occ = collections.defaultdict(list)  # name -> [(src, ctx_mu, ctx_reg)]
# longest name first, no overlaps: the same rule the app uses when it links (a mention of "Paul Lake Park" is not one of "Paul Lake")
big_re = re.compile(r'(?<![\w-])(' + '|'.join(re.escape(n) for n in sorted(names, key=len, reverse=True)) + r')(?![\w-])')
for src, reg, line in corpus:
    found = big_re.findall(line)
    if not found: continue
    cm, cr = ctx_of(src, reg, line)
    for name in found: occ[name].append((src, tuple(cm), tuple(cr)))

places, unresolved = [], []
for name in sorted(names):
    if not occ[name]:
        continue
    if name in listed:
        recs = list(listed[name])
        extra = gn_name(name) if ' ' in name else None
        if extra: recs += [rec(f) for f in extra if rec(f)['gid'] not in {r['gid'] for r in recs}]
    else:
        fs = gn_name(name)
        if fs is None: unresolved.append({'name': name, 'why': 'web service did not answer'}); continue
        recs = [rec(f) for f in fs]
    recs = [r for r in recs if r['type'] not in ('Railway Point', 'Former Railway Point', 'Station', 'Post Office', 'Former Post Office', 'Indian Reserve',
                                                 'Indian Reserve-Réserve indienne', 'Réserve indienne', 'Former Locality', 'Abandoned Locality')]
    if not recs:
        unresolved.append({'name': name, 'why': 'not found in BC Geographical Names (may be outside BC, a road, or an unofficial name)', 'n': len(occ[name])}); continue
    if any(r['official'] for r in recs): recs = [r for r in recs if r['official']]
    # a city, town or village with this exact name is what people mean (Campbell River, Logan Lake, Burns Lake)
    if any(r['cat'] == 1 for r in recs): recs = [r for r in recs if r['cat'] == 1]
    # type implied by the name ending
    want = None
    for rx, cats in SUF_CAT:
        if re.search(rx, name): want = cats; break
    pool = [r for r in recs if (want is None or r['cat'] in want)] or recs
    if want is None:  # a bare town or community name: populated places first
        pool = [r for r in recs if r['cat'] in POP] or pool
    # a town or community with the same name close by is the place people mean (Heffley Creek, Logan Lake, Salmon Arm)
    pops = [r for r in recs if r['cat'] in POP]
    if pops and len(pool) == 1 and pool[0]['cat'] not in POP:
        close = [p for p in pops if km_between(p, pool[0]) < 12]
        if len(close) == 1: pool = close
    # several records of the same feature (within 15 km of each other): one place
    def one_cluster(rs):
        return all(km_between(a, b) < 15 for a in rs for b in rs)
    note, cert, ambiguous_pick = '', 95, False
    if len(pool) > 1 and not one_cluster(pool):
        # context: every mention names an MU or region that holds exactly one of them
        picks, free = set(), 0
        for src, cm, cr in occ[name]:
            got = None
            if cm:
                inm = [r for r in pool if any(by_id[x]['g'].buffer(0.02).contains(Point(r['lon'], r['lat'])) for x in cm)]
                if len(inm) == 1: got = inm[0]['gid']
            if got is None and cr:
                inr = [r for r in pool if (lambda m: m and m['r'] in cr)(mu_at(r['lon'], r['lat']))]
                if len(inr) == 1: got = inr[0]['gid']
            if got is None:
                if cm or cr: picks.add(None)  # had context, but it does not settle it
                else: free += 1
            else: picks.add(got)
        if len(picks) == 1 and None not in picks:
            pool = [r for r in pool if r['gid'] in picks]
            ambiguous_pick = True
            note = 'Other places in BC share this name. Picked by the MU or region named next to it in the lessons' + (', and assumed the same where no MU or region is named.' if free else '.')
            cert = 80 if free else 85
        else:
            unresolved.append({'name': name, 'why': f'ambiguous: {len(pool)} places in BC have this name', 'n': len(occ[name])}); continue
    if pool[0]['cat'] in POP and len(pool) > 1:
        pool.sort(key=lambda r: (r['cat'], not r['official']))
    r = pool[0]
    m = mu_at(r['lon'], r['lat'])
    if not m:
        unresolved.append({'name': name, 'why': 'outside the MU map (not in a BC Management Unit)', 'n': len(occ[name])}); continue
    # a mention that names an MU must agree: the place sits in that MU or next to it
    near_ok = lambda ids: any(m['id'] == x or m['id'] in nb_of.get(x, ()) for x in ids)
    # checked for picks that could be wrong: same name elsewhere, or a small unincorporated place (towns, rivers and parks
    # are often named as a reference point next to MUs they are not in)
    risky = ambiguous_pick or len(recs) > 1 or r['cat'] in (2, 3)
    withmu = [cm for _, cm, _ in occ[name] if cm]
    bad = [cm for cm in withmu if not near_ok(cm)]
    if risky and r['cat'] != 1 and bad and len(bad) == len(withmu):
        unresolved.append({'name': name, 'why': f'found in MU {m["id"]}, but the lesson names MU {", ".join(bad[0])} next to it', 'n': len(occ[name])}); continue
    places.append({'name': name, 'r': r, 'mu': m, 'note': note, 'cert': cert if r['official'] else min(cert, 80), 'n': len(occ[name])})

# ---------- forest service roads (FSRs) from the app's own road layer ----------
# The BCGNWS has no roads. Our map layer data/layers/<area>/forest_roads.pmtiles (FTEN road sections) has names:
# a road is placed at the middle of its longest named section, only when the name is unique.
def fsr_names():
    out = collections.Counter()
    for src, reg, line in corpus:
        for mm in re.finditer(r"\b((?:[A-Z][a-zA-Z'’]+\s){1,4})(FSR|Forest Service Road)\b", line):
            out[mm.group(1).strip()] += 1
    return out
roads_wanted = fsr_names()
roads = {}
try:
    import pmtiles.reader as pmr, mapbox_vector_tile, gzip
    for pm in sorted(glob.glob(os.path.join(ROOT, 'data', 'layers', '*', 'forest_roads.pmtiles'))):
        with open(pm, 'rb') as fh:
            rd = pmr.Reader(pmr.MmapSource(fh))
            hdr = rd.header(); z = hdr['max_zoom']
            for (tz, tx, ty), data in pmr.all_tiles(rd.get_bytes):
                if tz != z: continue
                try: data = gzip.decompress(data)
                except OSError: pass
                t = mapbox_vector_tile.decode(data)
                for lname, lay in t.items():
                    ext = lay.get('extent', 4096)
                    for f in lay['features']:
                        nm = (f['properties'].get('name') or '').strip()
                        if not nm: continue
                        base = re.sub(r'\s*(FSR|Forest Service Road|Road|Rd)\s*$', '', nm, flags=re.I).strip()
                        if base not in roads_wanted: continue
                        g = f['geometry']; cs = g['coordinates']
                        lines = cs if g['type'] == 'MultiLineString' else [cs] if g['type'] == 'LineString' else []
                        n = 2 ** tz
                        for ln in lines:
                            if len(ln) < 2: continue
                            pts = []
                            for x, y in ln:
                                lon = (tx + x / ext) / n * 360 - 180
                                lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * ((ty + (ext - y) / ext) / n)))))
                                pts.append((lon, lat))
                            L = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
                            roads.setdefault(base, []).append((L, pts, nm, os.path.basename(os.path.dirname(pm))))
except Exception as e:
    print('forest roads skipped:', e, file=sys.stderr)

road_places = []
for base, cnt in sorted(roads_wanted.items()):
    segs = roads.get(base)
    if not segs:
        unresolved.append({'name': base + ' FSR', 'why': 'road not found in the app forest road layer (data/layers/*/forest_roads)', 'n': cnt}); continue
    segs.sort(key=lambda s: -s[0])
    L, pts, nm, area = segs[0]
    # all pieces within 40 km of the longest one: one road
    def mid(p): return p[len(p) // 2]
    far = [s for s in segs if math.dist(mid(s[1]), mid(pts)) > 0.5]
    if far:
        unresolved.append({'name': base + ' FSR', 'why': 'more than one road with this name in the forest road layer', 'n': cnt}); continue
    lon, lat = mid(pts)
    m = mu_at(lon, lat)
    if not m: continue
    road_places.append({'name': base + ' FSR', 'alias': [base + ' Forest Service Road'], 'lon': lon, 'lat': lat, 'mu': m, 'n': cnt})

# ---------- write places.json ----------
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower().replace('’', '').replace("'", '')).strip('-')
regname = {c: n for c, n, _ in REGIONS}
def describe(name, kind, lon, lat, m):
    tw = near_town(lon, lat, big=False)
    t = towns[tw]
    km, dr = dist_dir(t['lon'], t['lat'], lon, lat)
    where = f'in MU {m["id"]}, Region {m["r"]} {regname[m["r"]]}'
    if km < 3: rel = f'Next to {t["name"]}.' if kind not in ('town',) else ''
    elif km > 150: rel = ''
    else: rel = f'About {int(round(km))} km {dr} of {t["name"]}.'
    art = 'an' if kind[0] in 'aeiou' else 'a'
    return f'{name} is {art} {kind} {where}. {rel}'.strip()

out, seen = [], set()
for p in places:
    r, m = p['r'], p['mu']
    kind = kind_of(r)
    pid = slug(p['name'])
    if pid in seen: pid += '-' + r['gid']
    seen.add(pid)
    out.append({'id': pid, 'name': p['name'], 'type': kind, 'lat': round(r['lat'], 5), 'lon': round(r['lon'], 5), 'mu': m['id'], 'region': m['r'],
                'desc': describe(p['name'], kind, r['lon'], r['lat'], m),
                'src': 'gn', 'ft': r['type'].replace(' (1)', '').replace(' (2)', ''), 'nid': r['uri'].rsplit('/', 1)[-1], **({} if r['official'] else {'unofficial': 1}),
                'cert': p['cert'], **({'note': p['note']} if p['note'] else {}), **({'g': 1} if p['name'] in GUARD else {})})
for p in road_places:
    m = p['mu']; pid = slug(p['name'])
    if pid in seen: continue
    seen.add(pid)
    out.append({'id': pid, 'name': p['name'], 'alias': p['alias'], 'type': 'forest service road', 'lat': round(p['lat'], 5), 'lon': round(p['lon'], 5),
                'mu': m['id'], 'region': m['r'], 'desc': describe(p['name'], 'forest service road', p['lon'], p['lat'], m).replace(' is a forest', ' is a forest') + ' Pin: the middle of its longest mapped section.',
                'src': 'road', 'cert': 85})
out.sort(key=lambda p: p['name'])
os.makedirs(os.path.join(ROOT, 'data', 'places'), exist_ok=True)
pj = {'updated': TODAY, 'note': 'Place names mentioned in the lessons, glossary, flashcards and planner. Coordinates only from BC Geographical Names (apps.gov.bc.ca/pub/bcgnws) or the app map data. Built by scripts/build-places.py.',
      'licence': 'Open Government Licence BC',
      'sources': {'gn': {'name': 'BC Geographical Names', 'url': 'https://apps.gov.bc.ca/pub/bcgnws/names/'},
                  'road': {'name': 'App forest road layer (BC Data Catalogue FTEN_ROAD_SECTION_LINES_SVW, data date 2026-10-03)'}},
      'places': out}
json.dump(pj, open(os.path.join(ROOT, 'data', 'places', 'places.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(mu_json, open(os.path.join(ROOT, 'data', 'places', 'mu.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
# leave out phrase fragments ("Near Heffley Creek", "of Kamloops Lake", "BC Park") whose real name resolved or is generic
done = {p['name'] for p in out}
def fragment(n):
    w = n.split()
    if w[0][0].islower() or w[0] in ('BC', 'US', 'The', 'Near', 'From', 'Around', 'At', 'No', 'Many', 'District'): return True
    return any(v in done for v in variants(n)[1:] if v)
unresolved = [u for u in unresolved if not fragment(u['name'])]
unresolved.sort(key=lambda u: (-u.get('n', 0), u['name']))
json.dump({'updated': TODAY, 'note': 'Names found in the content but left out of places.json, with the reason. Not shipped in the app.', 'names': unresolved},
          open(os.path.join(ROOT, 'data', 'places', 'unresolved.json'), 'w'), ensure_ascii=False, indent=1)
print(f'MUs {len(mu_out)}, regions {len(reg_out)}, towns {len(towns)}, places {len(out)} (roads {len(road_places)}), unresolved {len(unresolved)}')
for f in ('mu.json', 'places.json'):
    print(f, os.path.getsize(os.path.join(ROOT, 'data', 'places', f)), 'bytes')
