/* Hunt Map layer guide: plain English for every layer, plus the land colours (onX style).
   Keyed by manifest layer id. Unknown ids fall back to a keyword match on id, label and source, then to the manifest "about".
   The manifest stays the data contract (MAP.md); this file only overrides colours and words, so the data pipeline can change files freely.
   Rules: never state law here. Legal layers say what they mark and link to the Rule Book. Certainty comes from the manifest. */

// Rule Book and lesson screens (hash routes in app.js)
const RB_WHERE = ['#/s/rb-where-you-can-hunt', 'Rule Book: where you can and cannot hunt'];
const RB_R3 = ['#/s/rb-region-3', 'Rule Book: Region 3 Thompson'];
const RB_R2 = ['#/s/rb-region-2', 'Rule Book: Region 2 Lower Mainland'];
const RB_LIC = ['#/s/rb-licences-fees', 'Rule Book: licences, FWID (Fish and Wildlife ID) and fees'];
const RB_BIRDS = ['#/s/rb-migratory-birds', 'Rule Book: ducks, geese and other migratory birds'];
const L_LAND = ['#/s/maps-land-status', 'Lesson: Maps 3, land status and access'];
const L_SCOUT = ['#/s/map-scouting', 'Lesson: map scouting from home'];

const zw = (a, b, c) => [a, b, c]; // line width at zoom 9, 12 and 15 (layers.js builds the zoom curve)
const MU_TEXT = ['to-string', ['coalesce', ['get', 'MU'], ['get', 'mu'], ['get', 'WILDLIFE_MGMT_UNIT_ID'], ['get', 'MU_ID'], ['get', 'mu_id'], ['get', 'unit'], ['get', 'code'], '']];

/* Style overrides. paint merges over the manifest paint. outline: the edge line drawn for a fill
   { color, width [zoom 9, 12, 15], dash, casing (white halo under it on satellite: true, or the zoom it is full from) }. hatch: diagonal stripes in that colour.
   short: name in the Land chip. label: replaces the manifest label. legend: [text, colour] rows. */
export const STYLE = {
  // Land status: bold where you cannot just walk in, almost clear where you can
  crown: { short: 'Crown', paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.06 }, outline: { color: '#7c8b5a', width: zw(0.5, 1, 1.6) } },
  private_land: { short: 'Private', paint: { 'fill-color': '#ff8f00', 'fill-opacity': 0.3 }, outline: { color: '#d84315', width: zw(0.5, 1.3, 2.6), casing: 13 } },
  parks: { short: 'Park', paint: { 'fill-color': '#2e7d32', 'fill-opacity': 0.2 }, outline: { color: '#1b5e20', width: zw(1.2, 2.2, 3), casing: true } },
  reserves: { short: 'Reserve', label: 'First Nations reserves (Indian Reserves)', paint: { 'fill-color': '#ffeb3b', 'fill-opacity': 0.34 }, outline: { color: '#d4a000', width: zw(1.6, 2.6, 3.4), casing: true } },
  wma: { short: 'WMA', paint: { 'fill-color': '#26a69a', 'fill-opacity': 0.12 }, outline: { color: '#00695c', width: zw(1, 1.8, 2.6), casing: true } },
  city_limits: { short: 'Town', paint: { 'fill-color': '#e53935', 'fill-opacity': 0.06 }, outline: { color: '#c62828', width: zw(1.2, 2, 3), dash: [3, 1.5], casing: true } },
  no_hunting: { short: 'No hunting', paint: { 'fill-color': '#d32f2f', 'fill-opacity': 0.08 }, hatch: '#d32f2f', outline: { color: '#b71c1c', width: zw(1.2, 2.2, 3), casing: true } },
  // Hunting: thin dark lines, numbers on top
  mu: { label: 'Management Unit (MU) lines', paint: { 'fill-color': 'rgba(0,0,0,0)' }, outline: { color: '#1b1b1b', width: zw(1.1, 1.6, 2.2), casing: 8 },
    labelExpr: MU_TEXT, labelField: 'MU', labelMinzoom: 9, labelSize: ['interpolate', ['linear'], ['zoom'], 9, 13, 14, 17], labelColor: '#111111' },
  mu_labels: { paint: { 'text-color': '#111111', 'text-halo-color': 'rgba(255,255,255,0.95)', 'text-halo-width': 2.2 },
    layout: { 'text-field': MU_TEXT, 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 9, 13, 14, 17], 'text-padding': 4 } },
  leh: { paint: { 'fill-color': '#4e342e', 'fill-opacity': 0.03 }, outline: { color: '#3e2723', width: zw(0.7, 1.2, 1.8), dash: [4, 2] }, labelMinzoom: 11 },
  // Access: closures purple dashed
  closures: { short: 'Vehicle closure', paint: { 'fill-color': '#7b1fa2', 'fill-opacity': 0.1 },
    outline: { color: ['match', ['get', 'kind'], 'snowmobile', '#9575cd', 'atv', '#ab47bc', '#6a1b9a'], width: zw(1.2, 2.2, 3.2), dash: [2.5, 1.5], casing: true },
    legend: [['Closed to motor vehicles, or to vehicles for hunting', '#6a1b9a'], ['ATV (all terrain vehicle) and electric bicycle', '#ab47bc'], ['Snowmobile', '#9575cd']] },
};

/* Plain English: what it shows, why a hunter cares, and where the rules are. */
export const GUIDE = {
  crown: { what: 'Crown land: public land owned by the province. Left almost clear so the map shows through.', why: 'Most BC hunting happens here, in an open season, outside closures and parks that ban it.', links: [RB_WHERE, L_LAND] },
  private_land: { what: 'Private parcels from ParcelMap BC, merged into blocks. Orange with a strong outline.', why: 'You need the owner\'s permission to hunt or cross. Owner names are not open data. Not every parcel is fenced or signed.', links: [RB_WHERE, L_LAND] },
  parks: { what: 'Provincial parks, ecological reserves and protected areas. Green with a dark green edge.', why: 'Many parks ban hunting and shooting. Ecological reserves are closed to hunting. Check the park\'s own page and the Rule Book before you go.', links: [RB_WHERE] },
  reserves: { what: 'First Nations reserves (called Indian Reserves in the official data and the synopsis). Yellow with a gold edge.', why: 'The synopsis treats a reserve like private land. Ask the band office before you hunt on it or cross it.', links: [RB_WHERE] },
  city_limits: { what: 'City, town and village boundaries. Red dashed edge.', why: 'Most towns limit shooting by bylaw, and bylaws are not in the synopsis. Ask the town hall before you shoot near a town.', links: [RB_WHERE] },
  wma: { what: 'WMA (Wildlife Management Area): Crown land set aside for wildlife. Teal edge.', why: 'Hunting is often allowed, but some limit hunting, shooting or vehicles. Call the regional office before you hunt one.', links: [RB_WHERE] },
  no_hunting: { what: 'Areas closed to hunting or shooting. Red stripes and a red edge.', why: 'Do not hunt or shoot inside. Dates and details are on the region pages of the Rule Book.', links: [RB_WHERE, RB_R3, RB_R2] },
  mu: { what: 'MU (Management Unit) boundaries: thin dark lines with the unit number, like 3-27, from zoom 9.', why: 'Seasons and bag limits are set by MU. Know which unit you stand in. A river line follows the right bank as you face downstream.', links: [RB_R3, RB_R2] },
  mu_labels: { what: 'MU (Management Unit) numbers like 3-27, one in each unit.', why: 'Find your unit at a glance, then look up its seasons in the Rule Book.', links: [RB_R3, RB_R2] },
  leh: { what: 'LEH (Limited Entry Hunting) zones: thin dark brown dashed lines. Zones overlap by species. Tap one to see the species.', why: 'Some seasons in these zones need a draw permit you apply for ahead of time.', links: [RB_LIC, RB_R3] },
  closures: { what: 'Motor vehicle closures from the synopsis maps: purple dashed edge. Some close an area to vehicles, some only to using a vehicle to hunt, some only to ATVs (all terrain vehicles) or snowmobiles.', why: 'Driving in, or using a vehicle to hunt, can be illegal inside, often only part of the year. Tap the area for its type and dates.', links: [RB_WHERE, RB_R3, RB_R2] },
  closure_routes: { what: 'Roads inside closures with their listed status: blue dashed lines.', why: 'Shows which roads in a closure are listed as open, and when. Tap a line for the status and dates.', links: [RB_WHERE] },
  forest_roads: { what: 'FSR (Forest Service Road) and other resource roads: brown lines.', why: 'Your way into the back country. A road on the map can be gated, washed out or deactivated. Check the resource road safety page before a trip.', links: [L_LAND] },
  rec_sites: { what: 'Recreation sites and trailheads run by Recreation Sites and Trails BC: green dots.', why: 'Free or low cost camping and parking. Recreation sites have their own no shooting rules near camps and trailheads.', links: [RB_WHERE] },
  rec_trails: { what: 'Official recreation trails: purple dashed lines.', why: 'Quiet walking access into hunting country. Some trails post their own bans.', links: [RB_WHERE] },
  camps: { what: 'Official recreation sites plus Crown land camp candidates (flat, near water, not private, park or reserve).', why: 'Ideas for where to set up camp. Candidates are a computer\'s pick: scout them first.', links: [] },
  uwr_mule_deer: { what: 'Where mule deer spend winter: official ungulate winter range.', why: 'In November and December these are where you find deer as snow pushes them down. Some have access rules.', links: [L_LAND] },
  uwr_wt_deer: { what: 'Where white tailed deer spend winter: official ungulate winter range.', why: 'Late in the season, snow pushes deer down onto these slopes. Some have access rules.', links: [L_LAND] },
  uwr_moose: { what: 'Where moose spend winter: official ungulate winter range.', why: 'Late season moose gather in these areas as snow deepens. Some have access rules.', links: [L_LAND] },
  uwr_elk: { what: 'Where elk spend winter: official ungulate winter range.', why: 'Late in the season, snow pushes elk down onto these slopes. Some have access rules.', links: [L_LAND] },
  uwr_sheep: { what: 'Where bighorn sheep spend winter: official ungulate winter range.', why: 'Shows the low, open slopes sheep use in winter. Some have access rules.', links: [L_LAND] },
  uwr_goat: { what: 'Where mountain goats spend winter: official ungulate winter range.', why: 'Shows the steep winter ground goats use. Some have access rules.', links: [L_LAND] },
  burns: { what: 'Wildfire burns since 2000, coloured by year: grey before 2010, orange 2010 to 2016, red orange 2017 and later.', why: 'Burns 3 to 15 years old grow food for deer, moose and bears. Burns are often closed to vehicles after a fire.', links: [L_LAND] },
  cutblocks: { what: 'Logged openings 25 years old or less, coloured by age.', why: 'Blocks 5 to 20 years old feed deer, moose, bears and grouse. Hunt the edge where a young block meets timber (Tip).', links: [L_LAND, L_SCOUT] },
  wetlands: { what: 'Marshes, swamps and bogs from the Freshwater Atlas.', why: 'Moose feed here and ducks rest here. Good places to glass at first and last light (Tip).', links: [L_SCOUT] },
  habitat_zones: { what: 'BEC (Biogeoclimatic Ecosystem Classification) zones: the plant community you will find.', why: 'Bunchgrass and Ponderosa Pine are low winter country. Higher zones are summer range.', links: [L_SCOUT] },
  season_mule_deer: { what: 'Where mule deer tend to be in the month you pick. General pattern from studies, not mapped corridors.', why: 'Narrows where to look this month. Pick the month at the top of the layers panel.', links: [L_SCOUT] },
  season_wt_deer: { what: 'Where white tailed deer tend to be in the month you pick. General pattern from studies, not mapped corridors.', why: 'Narrows where to look this month. Pick the month at the top of the layers panel.', links: [L_SCOUT] },
  season_moose: { what: 'Where moose tend to be in the month you pick. General pattern from studies, not mapped corridors.', why: 'Narrows where to look this month. Pick the month at the top of the layers panel.', links: [L_SCOUT] },
  season_elk: { what: 'Where elk tend to be in the month you pick. General pattern from studies, not mapped corridors.', why: 'Narrows where to look this month. Pick the month at the top of the layers panel.', links: [L_SCOUT] },
  season_sheep: { what: 'Where bighorn sheep tend to be in the month you pick. General pattern from studies, not mapped corridors.', why: 'Narrows where to look this month. Pick the month at the top of the layers panel.', links: [L_SCOUT] },
  duck_waters: { what: 'Valley lakes and wetlands of 20 ha or more where ducks stop in fall and spring, plus low open water in winter.', why: 'Where to look for ducks by season. Federal migratory bird rules apply.', links: [RB_BIRDS] },
  quail_range: { what: 'Low Bunchgrass and Ponderosa Pine country near farms and brushy creeks, where California quail live all year.', why: 'Quail do not migrate, so this is where to look any month. Much of it is farmland: ask permission.', links: [RB_WHERE] },
  spots: { what: 'Candidate hunting spots scored from open data (my pick): drive, ATV (all terrain vehicle), walk, backcountry and camp.', why: 'Starting points to scout, not promises. Check land status and closures for each one.', links: [L_SCOUT] },
  routes: { what: 'Suggested approach lines from parking to a spot (estimate). Shows from zoom 12.', why: 'A first idea of how to walk or ride in. Check the ground, the land status and closures.', links: [RB_WHERE] },
};

// New or renamed layers from the data pipeline: match by words in id, label or source
const KEYS = [
  [/no[ _]?(hunt|shoot)|closed[ _]to[ _]hunt|ecolog/i, 'no_hunting'],
  [/crown/i, 'crown'],
  [/private|parcel/i, 'private_land'],
  [/indian[ _]?reserve|first[ _]nation|clab|^reserves?$/i, 'reserves'],
  [/park|protected/i, 'parks'],
  [/wma|wildlife[ _]management[ _]area/i, 'wma'],
  [/municipal|city|town/i, 'city_limits'],
  [/mu[ _]?labels?|unit[ _]numbers?/i, 'mu_labels'],
  [/^mus?$|wildlife[ _]mgmt[ _]units|management[ _]units?/i, 'mu'],
  [/\bleh\b|ltd[ _]hnt|limited[ _]entry/i, 'leh'],
  [/mvpr[ _]areas|vehicle[ _]closure|^closures?$/i, 'closures'],
];
function keyFor(l) {
  if (STYLE[l.id] || GUIDE[l.id]) return l.id;
  const s = `${l.id} ${l.label || ''}`;
  for (const [re, k] of KEYS) if (re.test(s)) return k;
  for (const [re, k] of KEYS) if (re.test(l.source || '')) return k;
  return null;
}
export const styleFor = (l) => STYLE[keyFor(l)] || null;
export const guideFor = (l) => GUIDE[keyFor(l)] || null;

/** Manifest layer with the colour and text overrides applied (the manifest object is not changed). */
export function withOverrides(l) {
  const s = styleFor(l); if (!s) return l;
  const o = Object.assign({}, l);
  if (s.paint) o.paint = Object.assign({}, l.paint || {}, s.paint);
  if (s.layout) o.layout = Object.assign({}, l.layout || {}, s.layout);
  for (const k of ['outline', 'hatch', 'labelExpr', 'labelMinzoom', 'labelSize', 'labelColor', 'short']) if (s[k] != null) o[k] = s[k];
  if (s.labelField && !l.labelField) o.labelField = s.labelField;
  if (s.label) o.label = s.label;
  if (s.legend && !(Array.isArray(l.legend) && l.legend.length)) o.legend = s.legend;
  return o;
}
