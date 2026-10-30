/* Plain words for the roads_detail and trails_detail layers (scripts/build-roads-detail.py bakes short labels into the tiles).
   One home for the wording, so the tap card, the detailed layer sheet (layers.js featHtml) and the plan Park line (spot-rundown.js roadAt)
   say the same thing. Sources, checked 2026-10-30:
     BC Digital Road Atlas data dictionary (GeoBC, August 2026): class labels (unclassified is "Unknown", restricted is "Restricted Access"),
       surface values, and "should not be used for any purpose that involves navigation" for lines traced from imagery.
     FTEN_ROAD_SEGMENT_LINES_SVW: LIFE_CYCLE_STATUS_CODE Pending, Active or Retired is the permit record, not the road's condition.
   The driving line is a Tip (opinion from the surface value), never a promise. */
const CLS = {
  'Unclassified road': 'Road of unknown type',
  'Road, type unknown': 'Road of unknown type',
  'Restricted road': 'Restricted access road',
  'Pedestrian path': 'Town walkway',
};
const SURF = { 'Not in data': 'Unknown' };
export function roadProps(p) {
  if (!p) return p;
  const o = Object.assign({}, p);
  if (CLS[o.cls]) o.cls = CLS[o.cls];
  if (/^Forest tenure road/.test(o.cls || '')) o.cls = 'Logging road on permit records';
  if (SURF[o.surf]) o.surf = SURF[o.surf];
  if (o.name && /^[a-z]/.test(o.name)) { o.use = o.name; o.name = null; } // the atlas stores some descriptions as names ("parking lot", "private road")
  if (o.name && o.src === 'Forest tenure road segments' && /^[A-Z]{0,2}\d{3,}/.test(o.name)) { o.permitRoad = o.name; o.name = null; } // a permit code, not a road name
  if (/^Active \(forest tenure\)/.test(o.status || '')) o.status = 'Permit on record: does not mean open or drivable';
  const ret = /^Retired \(forest tenure\)\s*([\d-]*)/.exec(o.status || '');
  if (ret) o.status = `Permit retired${ret[1] ? ` ${ret[1]}` : ''}: the road may be deactivated, overgrown or still in use`;
  if (/^Pending \(forest tenure\)/.test(o.status || '')) o.status = 'Permit pending: the road may not be built yet';
  if (/^Overgrown or decommissioned \(road atlas surface\)/.test(o.status || '')) o.status = '';
  if (o.src === 'Forest tenure road segments' && o.date) o.date = `Downloaded ${o.date}`;
  return o;
}
/** One plain driving line (Tip) from the surface and kind, or ''. */
export function driveTip(p) {
  const k = (p && p.kind) || '', s = String((p && p.surf) || '').toLowerCase();
  if (k === 'overgrown' || /overgrown|decommissioned/.test(s)) return 'Tip: plan to walk it, not drive it. On foot, private land, reserves and parks still apply: check the land layers.';
  if (k === 'retired') return 'Tip: condition unknown. Do not count on driving it until you see it.';
  if (k === 'proposed' || k === 'pending') return 'Tip: may not exist on the ground.';
  if (k === 'restricted') return 'Tip: you may not be allowed in. Look for gates and signs.';
  const yieldTip = k === 'resource' || k === 'tenure' ? ' "Always yield to industrial traffic on resource roads" (BC Recreation Sites and Trails): that means logging trucks. No radio: headlights on, keep right, pull over for loaded trucks (Tip).' : '';
  if (/^paved/.test(s)) return `Tip: paved, if it is open.${yieldTip}`;
  if (/^loose/.test(s)) return `Tip: most trucks manage it when open and dry; snow and washouts change that.${yieldTip}`;
  if (/^rough/.test(s)) return `Tip: expect to need high clearance or four wheel drive.${yieldTip}`;
  if (/^seasonal/.test(s)) return `Tip: seasonal. It may be impassable in late fall and winter.${yieldTip}`;
  return `Tip: surface unknown. Do not count on driving it until you see it.${yieldTip}`;
}
/** A road name a person can read: FSR spelled out; a bare permit code is shown as a permit number. */
export function roadName(p) {
  const n = String((p && p.name) || '').trim();
  if (!n) return p && p.permitRoad ? `permit ${p.permitRoad}` : '';
  return n.replace(/\bFSR\b/, 'FSR (Forest Service Road)');
}
/** True for an unnamed road atlas line (most were traced from air photos). */
export const traced = (p) => !!p && !p.name && !p.permitRoad && p.src === 'BC Digital Road Atlas';
export const NAV_WARN = 'If this line was traced from air photos, the province says not to use it for navigation.';
