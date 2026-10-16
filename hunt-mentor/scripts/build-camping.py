#!/usr/bin/env python3
"""Hunt Map "Camping" layer: every campground and camp candidate in BC, one file per hunting region.

Sources (each camp says which one it came from, with the data date):
  1. Recreation Sites and Trails BC: WHSE_FOREST_TENURE.FTEN_REC_SITE_POINTS_SVW (BC Data Catalogue, Open Government Licence BC).
     Official point, name, campsites, access, structures (toilets, fire rings, boat launch), closure note, description.
  2. BC Parks: BC Parks API (bcparks.api.gov.bc.ca, Open Government Licence BC): campground features (frontcountry, group,
     walk in, backcountry, wilderness, marine), site counts, reservations, operating dates, park facilities. The API has no
     campground coordinates: the position is an OpenStreetMap camp site matched by name inside or near the park, else the park
     point from the API (flagged).
  3. OpenStreetMap tourism=camp_site and caravan_site (Overpass API; OpenStreetMap contributors, ODbL). Merged into an official
     camp when within 300 m (official wins) or when ref:FFID names the rec site; otherwise "Unofficial listing (OpenStreetMap), verify".
  4. Crown land camp candidates from the spot pipeline (data/spots/<area>/camps.geojson): flat, near water, not private,
     park or reserve (estimate).
Computed: MU (Management Unit) and region (WAA_WILDLIFE_MGMT_UNITS_SVW), elevation (AWS terrarium tiles, estimate), nearest
municipality (ABMS_MUNICIPALITIES_SP, straight line), photos (Wikimedia Commons, free licences only, metadata only: the app
loads the picture when online).

Run: python3 scripts/build-camping.py --cache /path/outside/repo [--steps fetch,build,photos,manifest] [--regions 2]
Writes data/spots/camping/r<region>.geojson, data/spots/camping/meta.json, data/spots/camping/verify-mission.json and the
"camping" manifest entry. Rerunnable: every download is cached.
"""
import argparse
import gzip
import importlib.util
import json
import math
import re
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pipe', ROOT / 'scripts' / 'spots-pipeline.py')
P = importlib.util.module_from_spec(spec)
spec.loader.exec_module(P)
np, shapely, log, http_get = P.np, P.shapely, P.log, P.http_get
# Wikimedia asks for a User-Agent with a way to reach the tool author: the repo page (never a personal address)
P.UA = 'HuntMentorCampBuilder/1.0 (personal study app; https://github.com/louisnto-cloud/my-first-project)'

TODAY = P.TODAY
OUT = ROOT / 'data' / 'spots' / 'camping'
OGL = 'Open Government Licence BC'
ODBL = 'Open Database License (ODbL), OpenStreetMap contributors'
OVERPASS = ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter']
BCP = 'https://bcparks.api.gov.bc.ca/api'
COMMONS = 'https://commons.wikimedia.org/w/api.php'
REC_PAGE = 'https://www.sitesandtrailsbc.ca/resource/{}'
CAMP_TYPES = {'Frontcountry campground', 'Group campground', 'Walk-in camping', 'Backcountry', 'Wilderness camping',
              'Marine-accessible camping', 'Winter camping'}
# Type keys and colours (owner rule: every layer its own colour; these are not used by any other layer)
TYPES = {'rec': ('Rec site (Recreation Sites and Trails BC)', '#e040fb'),
         'park': ('BC Parks campground', '#2979ff'),
         'osm': ('Other campground (OpenStreetMap, unofficial)', '#ff6d00'),
         'crown': ('Crown land camp candidate', '#8bc34a')}
REC_RULE = {'t': 'No shooting a firearm, bow or crossbow on or into the developed part of a recreation site: 100 m (109 yd) in '
                 'every direction from a structure, campsite or staging area. Walk well clear before you load.',
            'cert': 99, 'src': 'Synopsis page 9 (Recreation Sites and Trails), Forest Recreation Regulation, via Rule Book: where you can '
                               'and cannot hunt', 'link': '#/s/rb-where-you-can-hunt'}
TIP_SEASON = 'Hunting season: many campgrounds close after Thanksgiving. Call or check before you go (Tip).'
MISSION = (-122.3045, 49.1327)


def cache_json(path, fetch):
    path = Path(path)
    if path.exists():
        with gzip.open(path, 'rt') as f:
            return json.load(f)
    data = fetch()
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, 'wt') as f:
        json.dump(data, f)
    return data


# ------------------------------------------------------------------ fetch
def fetch_rec(cache):
    def get():
        out, start = [], 0
        while True:
            q = {'service': 'WFS', 'version': '1.0.0', 'request': 'GetFeature', 'outputFormat': 'application/json', 'srsName': 'EPSG:4326',
                 'typeName': 'pub:WHSE_FOREST_TENURE.FTEN_REC_SITE_POINTS_SVW', 'maxFeatures': '2000', 'startIndex': str(start),
                 'sortBy': 'OBJECTID'}
            js = json.loads(http_get(P.WFS + '?' + urllib.parse.urlencode(q)))
            out += js['features']
            if len(js['features']) < 2000:
                return {'features': out, 'fetched': TODAY}
            start += 2000
    return cache_json(Path(cache) / 'camping' / 'rec_sites.json.gz', get)


def bcp_all(path, params):
    out, page = [], 1
    while True:
        q = dict(params, **{'pagination[page]': page, 'pagination[pageSize]': 100})
        js = json.loads(http_get(f'{BCP}/{path}?' + urllib.parse.urlencode(q), min_gap=0.3))
        out += js['data']
        if page >= js['meta']['pagination']['pageCount']:
            return out
        page += 1


def fetch_parks(cache):
    feats = cache_json(Path(cache) / 'camping' / 'bcp_features.json.gz', lambda: {'data': bcp_all('park-features', {
        'populate[protectedArea][fields][0]': 'orcs', 'populate[protectedArea][fields][1]': 'protectedAreaName',
        'populate[protectedArea][fields][2]': 'latitude', 'populate[protectedArea][fields][3]': 'longitude',
        'populate[protectedArea][fields][4]': 'url', 'populate[protectedArea][fields][5]': 'type',
        'populate[protectedArea][fields][6]': 'hasCampfireBan',
        'populate[parkArea][fields][0]': 'parkAreaName', 'populate[parkFeatureType][fields][0]': 'parkFeatureType',
        'populate[parkDates][fields][0]': 'operatingYear', 'populate[parkDates][fields][1]': 'startDate',
        'populate[parkDates][fields][2]': 'endDate', 'populate[parkDates][fields][3]': 'name', 'populate[parkDates][fields][4]': 'isActive',
        'populate[site][fields][0]': 'siteName', 'populate[site][fields][1]': 'latitude', 'populate[site][fields][2]': 'longitude',
        'populate[site][fields][3]': 'url'}), 'fetched': TODAY})
    fac = cache_json(Path(cache) / 'camping' / 'bcp_facilities.json.gz', lambda: {'data': bcp_all('park-facilities', {
        'populate[protectedArea][fields][0]': 'orcs', 'populate[facilityType][fields][0]': 'facilityName',
        'fields[0]': 'isActive', 'fields[1]': 'isFacilityOpen'}), 'fetched': TODAY})
    return feats, fac


def fetch_osm(cache):
    q = '[out:json][timeout:240];(nwr["tourism"~"^(camp_site|caravan_site)$"](48.2,-139.1,60.0,-114.0););out center tags;'

    def get():
        for h in OVERPASS:
            try:
                b = http_get(h + '?' + urllib.parse.urlencode({'data': q}), tries=2, timeout=300)
                js = json.loads(b)
                js['fetched'] = TODAY
                return js
            except Exception as e:  # next mirror
                log('  overpass', h, type(e).__name__)
        raise RuntimeError('no Overpass mirror answered')
    return cache_json(Path(cache) / 'camping' / 'osm_camps.json.gz', get)


# ------------------------------------------------------------------ helpers
def clean(s):
    if s is None:
        return None
    s = re.sub(r'<br\s*/?>', ' ', str(s), flags=re.I)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = s.replace('&nbsp;', ' ').replace('&amp;', '&')
    return re.sub(r'\s+', ' ', s).strip() or None


def norm(s):
    s = (s or '').lower().replace('&', 'and')
    s = re.sub(r'\b(recreation site|rec site|provincial park|park|campground|camp ground|campsite|camp site|site|camping|the|rv|resort)\b', ' ', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def name_match(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    ta, tb = set(a.split()), set(b.split())
    return len(ta & tb) >= max(1, min(len(ta), len(tb)) - 0)


def dist_m(a, b):
    return float(P.GEOD.inv(a[0], a[1], b[0], b[1])[2])


class DemZ10:
    """Elevation from AWS terrarium z10 tiles (about 100 m pixels; estimate)."""
    Z = 10

    def __init__(self, cache):
        self.d = Path(cache) / 'dem' / str(self.Z)
        self.tiles = {}

    def at(self, lon, lat):
        from PIL import Image
        x, y = P.lonlat_to_tilef(lon, lat, self.Z)
        tx, ty = int(x), int(y)
        k = (tx, ty)
        if k not in self.tiles:
            fn = self.d / str(tx) / f'{ty}.png'
            if not fn.exists():
                fn.parent.mkdir(parents=True, exist_ok=True)
                b = http_get(P.TERRARIUM.format(z=self.Z, x=tx, y=ty), min_gap=0.05)
                if not b:
                    self.tiles[k] = None
                    return None
                fn.write_bytes(b)
            a = np.asarray(Image.open(fn).convert('RGB')).astype(np.float32)
            self.tiles[k] = a[..., 0] * 256.0 + a[..., 1] + a[..., 2] / 256.0 - 32768.0
        t = self.tiles[k]
        if t is None:
            return None
        px, py = min(255, int((x - tx) * 256)), min(255, int((y - ty) * 256))
        return int(round(float(t[py, px])))


# ------------------------------------------------------------------ build
def struct_list(p):
    return [p.get(f'STRUCTURE_DESC{i}') for i in range(1, 11) if p.get(f'STRUCTURE_DESC{i}')]


def yesno_from(structs, pat):
    return 'Yes' if any(re.search(pat, s, re.I) for s in structs) else None


def rec_fee(desc):
    d = (desc or '').lower()
    if re.search(r'\bno (camping )?fees?\b|\bfree of charge\b|\bno charge\b|\bthere is no fee', d):
        return 'Free (official description)'
    if re.search(r'\bfees?\b.{0,40}\b(in effect|charged|apply|applies|collected|required|per night|per party)|\b(camping|overnight|user) fees?\b', d):
        return 'Fee (official description; amount not listed)'
    return None


def rec_reserve(desc):
    d = (desc or '').lower()
    if re.search(r'first[ -]come[ ,-]*first[ -]serve', d):
        return 'First come, first served (official description)'
    if re.search(r'reserv', d):
        return 'Reservations mentioned (official description): check the site page'
    return None


def rec_road(p):
    acc = [p.get(f'ACCESS_DESC{i}') for i in (1, 2, 3) if p.get(f'ACCESS_DESC{i}')]
    sub = [p.get(f'SUB_ACCESS_DESC{i}') for i in (1, 2, 3) if p.get(f'SUB_ACCESS_DESC{i}')]
    dd = (p.get('DRIVING_DIRECTIONS') or '')
    bits = []
    if acc:
        bits.append('; '.join(acc + sub))
    m = re.findall(r'(2 ?WD|4 ?WD|4x4|two wheel drive|four wheel drive|high clearance)', dd, re.I)
    if m:
        bits.append('directions mention: ' + ', '.join(dict.fromkeys(x.upper().replace(' ', '') for x in m)))
    if re.search(r'\bFSR\b|forest service road|gravel', dd, re.I):
        bits.append('gravel or FSR (Forest Service Road) in the directions')
    return '. '.join(bits) or None


def drive_up(p):
    acc = ' '.join(str(p.get(f'ACCESS_DESC{i}') or '') for i in (1, 2, 3)).lower()
    return 'road' in acc


def build(cache, regions=None):
    rec = fetch_rec(cache)
    feats, fac = fetch_parks(cache)
    osm = fetch_osm(cache)
    bc = P.clean_bc(cache)
    mu_g, mu_p, mu_m = bc['mu']
    tree = P.STRtree(mu_g)
    park_g, park_p, _ = bc['parks']
    ptree = P.STRtree(park_g)
    mun_g, mun_p, _ = bc['municipalities']
    mun_c = [P.xy_to_lonlat(c.x, c.y) for c in shapely.centroid(mun_g)]
    dem = DemZ10(cache)
    mu_date = P.fetch_meta(cache, 'mu', 'BC').get('date', TODAY)

    def mu_at(lon, lat):
        x, y = P.lonlat_to_xy(lon, lat)
        pt = shapely.points(float(x), float(y))
        hit = tree.query(pt, predicate='intersects')
        if len(hit):
            q = mu_p[int(hit[0])]
            return q['MU'], q['region'], q['regionName']
        return None, None, None

    def park_at(lon, lat, buf=0):
        x, y = P.lonlat_to_xy(lon, lat)
        pt = shapely.points(float(x), float(y))
        hit = ptree.query(pt.buffer(buf) if buf else pt, predicate='intersects')
        return [park_p[int(i)] for i in hit]

    def town(lon, lat):
        best = None
        for (tlon, tlat), q in zip(mun_c, mun_p):
            d = dist_m((lon, lat), (float(tlon), float(tlat)))
            if best is None or d < best[0]:
                best = (d, q['name'])
        return {'name': best[1], 'km': round(best[0] / 1000, 1)} if best else None

    camps = []
    # ---- 1. rec sites (official)
    for f in rec['features']:
        p = f['properties']
        if not f.get('geometry'):
            continue
        lon, lat = f['geometry']['coordinates'][:2]
        st = struct_list(p)
        desc = clean(p.get('PROJECT_DESCRIPTION'))
        nm0 = clean(p.get('PROJECT_NAME')) or ''
        camp_words = re.search(r'\bcamp', ' '.join(x for x in (desc or '', ' '.join(st)) if x), re.I)
        if not (p.get('NUM_CAMP_SITES') or camp_words) or re.search(r'day use|put-?in|interpretive|trail$', nm0, re.I) and not p.get('NUM_CAMP_SITES'):
            continue   # not a camping site (day use, trail, river put in)
        org = p.get('OPERATOR_CLIENT_NAME') if not p.get('OPERATOR_LEGAL_FIRST_NAME') else None
        camps.append({
            't': 'rec', 'id': p['FOREST_FILE_ID'], 'name': P.title_case_name(clean(p.get('PROJECT_NAME'))) or p['FOREST_FILE_ID'],
            'lon': round(lon, 5), 'lat': round(lat, 5), 'pos': 'Official point (FTEN_REC_SITE_POINTS_SVW)', 'posCert': 95,
            'src': 'Recreation Sites and Trails BC, FTEN_REC_SITE_POINTS_SVW (BC Data Catalogue)', 'srcDate': rec['fetched'], 'licence': OGL,
            'operator': ('Recreation Sites and Trails BC' + (f'; site operator: {P.title_case_name(clean(org))}' if org else
                                                              ('; site operator: a person under agreement (name not shown)' if p.get('OPERATOR_CLIENT_NAME') else ''))),
            'sites': p.get('NUM_CAMP_SITES') if p.get('NUM_CAMP_SITES') else None,
            'fee': rec_fee(desc), 'reserve': rec_reserve(desc),
            'toilets': yesno_from(st, r'toilet|outhouse|privy'), 'water': yesno_from(st, r'water|pump|well'),
            'fire': yesno_from(st, r'fire ring|fire pit|firepit'), 'boat': yesno_from(st, r'boat launch'),
            'tables': yesno_from(st, r'table'), 'structures': st or None,
            'road': rec_road(p), 'driveUp': drive_up(p), 'maintained': clean(p.get('MAINTAIN_STD_DESC')),
            'closure': clean(p.get('CLOSURE_DESCRIPTION')), 'directions': clean(p.get('DRIVING_DIRECTIONS')),
            'desc': (desc[:600] + '...') if desc and len(desc) > 600 else desc,
            'activities': ', '.join(x for x in (p.get('ACTIVITY_DESC1'), p.get('ACTIVITY_DESC2'), p.get('ACTIVITY_DESC3')) if x) or None,
            'page': REC_PAGE.format(p['FOREST_FILE_ID']), 'district': clean(p.get('REC_DISTRICT_CODE_DESC')),
        })
    rec_by_id = {c['id']: c for c in camps}
    # ---- 3. OpenStreetMap points (filtered to BC by the MU layer later)
    osm_pts = []
    for e in osm['elements']:
        t = e.get('tags', {})
        if 'lat' in e:
            lon, lat = e['lon'], e['lat']
        elif 'center' in e:
            lon, lat = e['center']['lon'], e['center']['lat']
        else:
            continue
        osm_pts.append({'osm': f"{e['type']}/{e['id']}", 'lon': lon, 'lat': lat, 'tags': t, 'used': False})
    # merge OSM into rec sites: ref:FFID, else within 300 m
    rec_xy = np.array([[c['lon'], c['lat']] for c in camps])
    for o in osm_pts:
        ffid = (o['tags'].get('ref:FFID') or '').strip().upper()
        tgt = rec_by_id.get(ffid)
        how = 'ref:FFID'
        if tgt is None and len(rec_xy):
            dd = np.hypot((rec_xy[:, 0] - o['lon']) * math.cos(math.radians(o['lat'])), rec_xy[:, 1] - o['lat']) * 111320
            k = int(np.argmin(dd))
            if dd[k] <= 300:
                tgt, how = camps[k], 'within 300 m'
        if tgt is not None:
            o['used'] = True
            d = dist_m((o['lon'], o['lat']), (tgt['lon'], tgt['lat']))
            tgt.setdefault('osmMatch', []).append({'osm': o['osm'], 'how': how, 'm': round(d), 'name': o['tags'].get('name')})
    # ---- 2. BC Parks campgrounds
    facs = {}
    for x in fac['data']:
        pa = x.get('protectedArea') or {}
        ft = (x.get('facilityType') or {}).get('facilityName')
        if pa.get('orcs') is not None and ft and x.get('isActive') is not False:
            facs.setdefault(pa['orcs'], set()).add(ft)
    park_osm = [o for o in osm_pts if not o['used']]
    for x in feats['data']:
        ft = (x.get('parkFeatureType') or {}).get('parkFeatureType')
        if ft not in CAMP_TYPES or x.get('isActive') is False:
            continue
        pa = x.get('protectedArea') or {}
        area = ((x.get('parkArea') or {}).get('parkAreaName') or '').strip(' :') or None
        fname = (x.get('parkFeatureName') or '').strip(' :')
        name = area if (fname or '').lower() in ('all sites', '', 'campground') or not fname else (
            fname if not area or norm(area) in norm(fname) else f'{area}: {fname}')
        pname = pa.get('protectedAreaName')
        full = name if norm(pname or '') and norm(pname) in norm(name) else f'{pname}, {name}' if pname and name else (name or pname)
        # position: OSM camp matched by name within 3 km of the park point or inside the park polygon
        best = None
        plon, plat = pa.get('longitude'), pa.get('latitude')
        site = x.get('site') or {}
        if site.get('longitude') is not None:
            plon, plat = site['longitude'], site['latitude']
        want = set(norm(name or '').split()) - set(norm(pname or '').split()) or set(norm(name or '').split())
        grp = 'group' in (ft or '').lower() or 'group' in (name or '').lower()
        for o in park_osm:
            nm = o['tags'].get('name') or ''
            if not nm or o['used']:
                continue
            if not (name_match(nm, name or '') or (name_match(nm, pname or '') and ft == 'Frontcountry campground')):
                continue
            if ('group' in nm.lower()) != grp:
                continue   # a group site is never matched to a family campground, or the other way round
            inpark = any(norm(q['name']) == norm(pname) or name_match(q['name'], pname or '') for q in park_at(o['lon'], o['lat'], 500))
            near = plon is not None and dist_m((o['lon'], o['lat']), (plon, plat)) <= 30000
            if not (inpark or near):
                continue
            have = set(norm(nm).split())
            jac = len(want & have) / max(1, len(want | (have - set(norm(pname or '').split()))))
            if jac == 0 and want:
                continue   # nothing of the campground's own name in the OSM name
            score = 3 * jac + (1 if inpark else 0) + (0.5 if 'park' in (o['tags'].get('operator') or '').lower() else 0)
            if best is None or score > best[0]:
                best = (score, o)
        dates = sorted([d for d in (x.get('parkDates') or []) if d.get('isActive') is not False and str(d.get('operatingYear')) == str(P.YEAR)
                        and 'Operation' in (d.get('name') or '')], key=lambda d: d.get('startDate') or '')
        season = '; '.join(f"{d['startDate']} to {d['endDate']}" for d in dates if d.get('startDate')) or None
        fset = facs.get(pa.get('orcs'), set())
        sites = x.get('frontcountrySites') or x.get('vehicleSites') or x.get('walkInSites') or x.get('backcountrySites') or x.get('wildernessSites') or x.get('groupSites')
        c = {'t': 'park', 'id': f"BCP-{x.get('featureId')}", 'name': full, 'park': pname, 'kind': ft,
             'src': 'BC Parks API (bcparks.api.gov.bc.ca), park features', 'srcDate': feats['fetched'], 'licence': OGL,
             'operator': 'BC Parks', 'sites': str(sites) if sites not in (None, '', '*') else None,
             'rv': x.get('rvSites') if x.get('rvSites') not in (None, '') else None,
             'reserve': ('Reservable (BC Parks reservations)' if x.get('hasReservations') else None) or
                        ('First come, first served' if x.get('hasFirstComeFirstServed') or x.get('nonReservableSites') else None),
             'season': (f'{P.YEAR} operating dates (BC Parks): {season}' if season else None),
             'offSeason': clean(x.get('offSeasonNote')), 'isOpen': x.get('isOpen'),
             'toilets': 'Yes, in this park' if 'Pit or flush toilets' in fset else None,
             'water': 'Yes, in this park' if 'Drinking water' in fset else None,
             'fire': 'Yes, in this park' if ('Fire rings' in fset or 'Campfires' in fset) else None,
             'boat': ('Yes, in this park' if 'Boat launch' in fset else None) or (str(x['boatLaunches']) if x.get('boatLaunches') else None),
             'campfireBan': bool(pa.get('hasCampfireBan')), 'page': pa.get('url') or site.get('url'), 'driveUp': ft == 'Frontcountry campground'}
        if best:
            o = best[1]
            o['used'] = True
            c.update(lon=round(o['lon'], 5), lat=round(o['lat'], 5),
                     pos=f"OpenStreetMap camp site {o['osm']} ({o['tags'].get('name')}), matched to the BC Parks listing by name. Verify.",
                     posCert=75, osmMatch=[{'osm': o['osm'], 'how': 'name match', 'name': o['tags'].get('name'),
                                            'm': round(dist_m((o['lon'], o['lat']), (plon, plat))) if plon is not None else None}])
        elif plon is not None:
            if ft not in ('Frontcountry campground', 'Group campground', 'Walk-in camping'):
                continue   # backcountry and wilderness camping with only a park point: no usable position
            c.update(lon=round(plon, 5), lat=round(plat, 5), posCert=40,
                     pos='Shown at the park point from the BC Parks API: the campground position is not in the data. It can be km away.')
        else:
            continue
        camps.append(c)
    # merge remaining OSM points within 300 m of a park campground
    pk = [c for c in camps if c['t'] == 'park']
    for o in osm_pts:
        if o['used']:
            continue
        for c in pk:
            if abs(c['lat'] - o['lat']) < 0.004 and dist_m((o['lon'], o['lat']), (c['lon'], c['lat'])) <= 300:
                o['used'] = True
                c.setdefault('osmMatch', []).append({'osm': o['osm'], 'how': 'within 300 m', 'name': o['tags'].get('name'),
                                                     'm': round(dist_m((o['lon'], o['lat']), (c['lon'], c['lat'])))})
                break
    # remaining OSM: unofficial listings
    for o in osm_pts:
        if o['used']:
            continue
        t = o['tags']
        if t.get('access') in ('private', 'no') or t.get('disused') == 'yes':
            continue
        fee = t.get('fee')
        camps.append({
            't': 'osm', 'id': 'OSM-' + o['osm'].replace('/', '-'), 'name': t.get('name') or 'Camp site (no name in OpenStreetMap)',
            'lon': round(o['lon'], 5), 'lat': round(o['lat'], 5), 'pos': f"OpenStreetMap {o['osm']}", 'posCert': 60,
            'src': 'OpenStreetMap (Overpass API), unofficial listing: verify', 'srcDate': osm['fetched'], 'licence': ODBL,
            'kind': 'Caravan or RV park' if t.get('tourism') == 'caravan_site' else ('Backcountry camp site' if t.get('backcountry') == 'yes' else 'Camp site'),
            'operator': t.get('operator'), 'sites': t.get('capacity') or t.get('capacity:pitches'),
            'fee': ('Fee' + (f": {t['charge']}" if t.get('charge') else '') if fee == 'yes' else 'Free' if fee == 'no' else None),
            'reserve': {'yes': 'Reservations taken', 'required': 'Reservation required', 'no': 'No reservations', 'recommended': 'Reservation recommended'}.get(t.get('reservation')),
            'toilets': {'yes': 'Yes', 'no': 'No'}.get(t.get('toilets')), 'water': {'yes': 'Yes', 'no': 'No'}.get(t.get('drinking_water')),
            'fire': {'yes': 'Yes', 'no': 'No'}.get(t.get('openfire') or t.get('fireplace')),
            'maxLength': t.get('maxlength'), 'season': ('Opening hours (OpenStreetMap): ' + t['opening_hours']) if t.get('opening_hours') else None,
            'page': t.get('website') or t.get('url') or t.get('contact:website'), 'osmUrl': f"https://www.openstreetmap.org/{o['osm']}",
            'commons': t.get('wikimedia_commons'), 'image': t.get('image'), 'driveUp': t.get('backcountry') != 'yes',
        })
    # ---- 4. Crown land candidates from the spot pipeline
    for f in sorted((ROOT / 'data' / 'spots').glob('*/camps.geojson')):
        if f.parent.name == 'camping':
            continue
        for ft in json.load(open(f))['features']:
            q = ft['properties']
            if q.get('kind') == 'Rec site':
                continue
            lon, lat = ft['geometry']['coordinates']
            camps.append({'t': 'crown', 'id': q['id'], 'name': q.get('name'), 'lon': lon, 'lat': lat,
                          'kind': 'Backcountry camp candidate (near a spot)' if q.get('kind') == 'Backcountry camp' else 'Crown land camp candidate',
                          'pos': 'Computed by the Hunt Mentor spot pipeline (estimate)', 'posCert': 50,
                          'src': 'Hunt Mentor spot pipeline from BC open data: flat, near water, not private, park or reserve (estimate)',
                          'srcDate': json.load(open(f.parent / 'meta.json')).get('generated'), 'licence': OGL,
                          'water': q.get('water'), 'spotIds': q.get('spotIds') or [], 'nearSpots': q.get('nearSpots'),
                          'elevData': q.get('elev'), 'driveUp': False})
    # ---- computed fields, BC filter
    out = []
    for c in camps:
        mu, reg, rname = mu_at(c['lon'], c['lat'])
        if not mu:
            continue   # outside BC
        c['mu'], c['region'], c['regionName'], c['muDate'] = mu, reg, rname, mu_date
        c['elev'] = c.pop('elevData', None) or dem.at(c['lon'], c['lat'])
        c['town'] = town(c['lon'], c['lat'])
        inp = [q for q in park_at(c['lon'], c['lat'])]
        c['inPark'] = inp[0]['name'] + ' (' + (inp[0]['designation'] or 'park') + ')' if inp else None
        c['typeLabel'], c['color'] = TYPES[c['t']]
        c['rule'] = REC_RULE if c['t'] == 'rec' else None
        c['tip'] = TIP_SEASON
        c['cert'] = {'rec': 95, 'park': 85, 'osm': 60, 'crown': 50}[c['t']]
        c['rank'] = (0 if c['t'] == 'rec' and c.get('driveUp') else 1 if c['t'] == 'rec' else 2 if c['t'] == 'park' else 3 if c['t'] == 'osm' else 4)
        out.append(c)
    log(f'camps: {len(out)} in BC ({sum(1 for c in out if c["t"] == "rec")} rec, {sum(1 for c in out if c["t"] == "park")} park, '
        f'{sum(1 for c in out if c["t"] == "osm")} osm, {sum(1 for c in out if c["t"] == "crown")} crown)')
    return out


# ------------------------------------------------------------------ photos (Wikimedia Commons, metadata only)
_cg = [0.0]


def commons_get(q, tries=4):
    """Commons API through curl (the API answers urllib with 429 from this network), one request a second."""
    import subprocess
    url = COMMONS + '?' + urllib.parse.urlencode(q)
    for i in range(tries):
        wait = 1.0 - (time.time() - _cg[0])
        if wait > 0:
            time.sleep(wait)
        _cg[0] = time.time()
        r = subprocess.run(['curl', '-sS', '--max-time', '60', '-A', P.UA, '-w', '\n%{http_code}', url], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition('\n')
        if code == '200':
            return body
        log('  commons', code, 'retry', i + 1)
        time.sleep(5 * (i + 1))
    raise RuntimeError('commons failed')


FREE = re.compile(r'^(cc0|public domain|pd|cc by( |-)?(sa )?\d|cc by( |-)sa|cc by\b|cc-by)', re.I)


def commons_info(titles):
    q = {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 480,
         'titles': '|'.join(titles), 'iiextmetadatafilter': 'LicenseShortName|LicenseUrl|Artist|ImageDescription|ObjectName|Credit'}
    js = json.loads(commons_get(q))
    out = []
    for pg in (js.get('query', {}).get('pages') or {}).values():
        ii = (pg.get('imageinfo') or [{}])[0]
        md = ii.get('extmetadata') or {}
        lic = clean((md.get('LicenseShortName') or {}).get('value'))
        if not lic or not FREE.search(lic) or not str(ii.get('mime', '')).startswith('image/jpeg'):
            continue
        out.append({'file': pg['title'], 'thumb': ii.get('thumburl'), 'page': ii.get('descriptionurl'), 'licence': lic,
                    'licenceUrl': (md.get('LicenseUrl') or {}).get('value'),
                    'author': (clean((md.get('Artist') or {}).get('value')) or 'unknown')[:120],
                    'desc': (clean((md.get('ImageDescription') or {}).get('value')) or '')[:300], 'w': ii.get('thumbwidth'), 'h': ii.get('thumbheight')})
    return out


def photos(cache, camps, limit):
    """Best free photo per camp (title or description must name the place). Order: drive up rec sites, Mission first."""
    pc = Path(cache) / 'camping' / 'photos'
    pc.mkdir(parents=True, exist_ok=True)
    order = sorted([c for c in camps if c['t'] in ('rec', 'park', 'osm') and c.get('name') and 'Unnamed' not in c['name']],
                   key=lambda c: (c['rank'] > 1, dist_m(MISSION, (c['lon'], c['lat'])) > 100000, c['region'] != '3', c['rank'],
                                  dist_m(MISSION, (c['lon'], c['lat']))))
    n = found = 0
    for c in order:
        if n >= limit:
            break
        n += 1
        fn = pc / f"{re.sub(r'[^A-Za-z0-9_-]', '_', c['id'])}.json"
        if fn.exists():
            res = json.load(open(fn))
        else:
            res = {'cand': []}
            titles = []
            if c.get('commons') and c['commons'].startswith('File:'):
                titles.append(c['commons'])
            q = {'action': 'query', 'format': 'json', 'list': 'geosearch', 'gscoord': f"{c['lat']}|{c['lon']}", 'gsradius': 500,
                 'gsnamespace': 6, 'gslimit': 20}
            try:
                gs = json.loads(commons_get(q)).get('query', {}).get('geosearch', [])
            except Exception:
                continue   # not cached: tried again on the next run
            titles += [g['title'] for g in gs if g['title'].lower().endswith(('.jpg', '.jpeg'))]
            if titles:
                try:
                    res['cand'] = commons_info(titles[:20])
                except Exception:
                    continue
            json.dump(res, open(fn, 'w'))
        key = [w for w in norm(c['name']).split() if len(w) >= 4] or norm(c['name']).split()
        best = None
        for x in res['cand']:
            txt = norm(x['file'] + ' ' + x['desc'])
            hits = sum(1 for w in key if w in txt.split())
            if key and hits >= max(1, len(key) - 1) and not re.search(r'\b(map|logo|sign|diagram|plaque)\b', txt):
                if best is None or hits > best[0]:
                    best = (hits, x)
        if best:
            x = best[1]
            c['photo'] = {'thumb': x['thumb'], 'page': x['page'], 'author': x['author'], 'licence': x['licence'], 'licenceUrl': x['licenceUrl'],
                          'file': x['file'], 'w': x['w'], 'h': x['h'], 'match': 'Wikimedia Commons, within 500 m, file title or description names the place'}
            found += 1
    log(f'photos: checked {n} camps, {found} with a matched free photo')


# ------------------------------------------------------------------ write
KEEP = ('t', 'id', 'name', 'kind', 'park', 'typeLabel', 'pos', 'posCert', 'src', 'srcDate', 'licence', 'operator', 'sites', 'rv', 'fee', 'reserve',
        'season', 'offSeason', 'isOpen', 'toilets', 'water', 'fire', 'boat', 'tables', 'maxLength', 'road', 'driveUp', 'maintained', 'closure',
        'directions', 'desc', 'activities', 'page', 'osmUrl', 'district', 'campfireBan', 'mu', 'region', 'regionName', 'muDate', 'elev', 'town',
        'inPark', 'rule', 'cert', 'rank', 'photo', 'osmMatch', 'nearSpots', 'spotIds')


def write(camps):
    OUT.mkdir(parents=True, exist_ok=True)
    files, counts = [], {}
    by = {}
    for c in camps:
        by.setdefault(c['region'], []).append(c)
    for reg, cs in sorted(by.items()):
        cs.sort(key=lambda c: (c['rank'], c['name'] or ''))
        feats = [{'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [c['lon'], c['lat']]},
                  'properties': {k: c[k] for k in KEEP if c.get(k) not in (None, '', [], False) or k in ('driveUp',)}} for c in cs]
        fn = OUT / f'r{reg.lower()}.geojson'
        size = P.write_fc(fn, feats)
        xs, ys = [c['lon'] for c in cs], [c['lat'] for c in cs]
        files.append({'area': f'R{reg}', 'file': P.rel(fn), 'bbox': [math.floor(min(xs) * 100) / 100, math.floor(min(ys) * 100) / 100,
                                                                   math.ceil(max(xs) * 100) / 100, math.ceil(max(ys) * 100) / 100], 'bytes': size, 'features': len(cs)})
        counts[reg] = {t: sum(1 for c in cs if c['t'] == t) for t in TYPES}
    meta = {'generated': TODAY, 'counts': counts, 'total': len(camps), 'files': files, 'types': {k: {'label': v[0], 'color': v[1]} for k, v in TYPES.items()},
            'photos': sum(1 for c in camps if c.get('photo')),
            'sources': {'rec': 'https://catalogue.data.gov.bc.ca/dataset/recreation-sites-and-trails-bc-recreation-site-points (FTEN_REC_SITE_POINTS_SVW), ' + OGL,
                        'park': 'https://catalogue.data.gov.bc.ca/dataset/bc-parks-data-api-access (BC Parks API), ' + OGL,
                        'osm': 'https://www.openstreetmap.org/copyright, ' + ODBL,
                        'crown': 'Hunt Mentor spot pipeline (scripts/spots-pipeline.py), from BC Data Catalogue layers, ' + OGL,
                        'photos': 'Wikimedia Commons (CC0, public domain, CC BY, CC BY-SA only), credit shown on each card'}}
    json.dump(meta, open(OUT / 'meta.json', 'w'), indent=1)
    # verification table for the Mission area (within 100 km)
    ver = []
    for c in sorted(camps, key=lambda c: dist_m(MISSION, (c['lon'], c['lat']))):
        d = dist_m(MISSION, (c['lon'], c['lat']))
        if d > 100000 or c['t'] == 'crown':
            continue
        mm = []
        for m in c.get('osmMatch') or []:
            if m.get('m') is not None and m['m'] > 100 and c['t'] == 'rec':
                mm.append(f"OpenStreetMap point {m['osm']} is {m['m']} m from the official point")
            if m.get('name') and c.get('name') and not name_match(m['name'], c['name']):
                mm.append(f"OpenStreetMap name \"{m['name']}\" differs")
        if c['t'] == 'park' and (c.get('posCert') or 0) < 50:
            mm.append('No campground position in the BC Parks data: shown at the park point')
        ver.append({'name': c['name'], 'id': c['id'], 'type': c['typeLabel'], 'lat': c['lat'], 'lon': c['lon'], 'kmFromMission': round(d / 1000, 1),
                    'mu': c['mu'], 'source': c['src'], 'position': c.get('pos'), 'status': c.get('closure') or ('Closed (BC Parks)' if c.get('isOpen') is False else 'No closure listed'),
                    'osm': [m['osm'] for m in c.get('osmMatch') or []], 'mismatches': mm})
    json.dump({'generated': TODAY, 'centre': 'Mission (49.1327, -122.3045)', 'radiusKm': 100, 'rows': ver},
              open(OUT / 'verify-mission.json', 'w'), indent=1, ensure_ascii=False)
    log(f'write: {len(files)} region files, {sum(f["bytes"] for f in files) / 1e6:.2f} MB; Mission verification rows {len(ver)}')
    return files, meta


def update_manifest(files, meta):
    mp = ROOT / 'data' / 'layers' / 'manifest.json'
    man = json.load(open(mp))
    col = ['match', ['get', 't']] + [x for k, v in TYPES.items() for x in (k, v[1])][:-2] + [TYPES['crown'][1]]
    entry = {
        'id': 'camping', 'group': 'Camping', 'kind': 'camps', 'card': 'camp', 'label': 'Campgrounds and camp spots', 'type': 'circle', 'minzoom': 7,
        'paint': {'circle-color': col, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3.5, 12, 6, 15, 8],
                  'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5},
        'legend': [[v[0], v[1]] for v in TYPES.values()],
        'popup': [], 'labelField': 'name', 'labelMinzoom': 13,
        'source': 'Recreation Sites and Trails BC (FTEN_REC_SITE_POINTS_SVW), BC Parks API, OpenStreetMap (unofficial listings) and Hunt Mentor Crown land camp candidates',
        'about': 'Every campground and camp spot we can find in BC, by type. Tap one for the details and the source of each line.',
        'attribution': 'Rec sites and BC Parks: Open Government Licence BC. Other campgrounds: OpenStreetMap contributors (ODbL).',
        'cert': 80, 'legal': False, 'files': [{'area': f['area'], 'file': f['file'], 'bbox': f['bbox']} for f in files],
        'areas': 'BC', 'licence': f'{OGL}; {ODBL}', 'dataDate': meta['generated'],
        'bytes': sum(f['bytes'] for f in files), 'features': meta['total'],
    }
    layers = [l for l in man['layers'] if l.get('id') not in ('camping', 'camps')]
    at = next((i for i, l in enumerate(layers) if l.get('group') == 'Spots'), len(layers))
    layers.insert(at, entry)
    man['layers'] = layers
    tmp = mp.with_suffix('.tmp')
    json.dump(man, open(tmp, 'w'), indent=1, ensure_ascii=False)
    tmp.replace(mp)
    log('manifest: camping entry written')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--cache', required=True)
    ap.add_argument('--photos', type=int, default=1500, help='camps to check for a Commons photo (best first)')
    a = ap.parse_args()
    cache = Path(a.cache).resolve()
    if str(cache).startswith(str(ROOT)):
        raise SystemExit('cache must be outside the repo')
    camps = build(cache)
    if a.photos:
        photos(cache, camps, a.photos)
    files, meta = write(camps)
    update_manifest(files, meta)


if __name__ == '__main__':
    main()
