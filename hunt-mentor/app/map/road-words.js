/* Plain words for the roads_detail and trails_detail layers (scripts/build-roads-detail.py bakes short labels into the tiles).
   One home for the wording, so the tap card, the detailed layer sheet (layers.js featHtml) and the plan Park line (spot-rundown.js roadAt)
   say the same thing. Sources, checked 2026-10-30:
     BC Digital Road Atlas data dictionary (GeoBC, August 2026): class labels (unclassified is "Unknown", restricted is "Restricted Access"),
       surface values, and "should not be used for any purpose that involves navigation" for lines traced from imagery.
     FTEN_ROAD_SEGMENT_LINES_SVW: LIFE_CYCLE_STATUS_CODE Pending, Active or Retired is the permit record, not the road's condition.
   The driving line is a Tip (opinion from the surface value), never a promise. */
const CLS = {
  'Unclassified road': 'Road, type unknown',
  'Restricted road': 'Restricted access road',
  'Pedestrian path': 'Town walkway',
};
const SURF = { 'Not in data': 'Unknown' };
export function roadProps(p) {
  if (!p) return p;
  const o = Object.assign({}, p);
  if (CLS[o.cls]) o.cls = CLS[o.cls];
  if (/^Forest tenure road/.test(o.cls || '')) o.cls = String(o.cls).replace(/^Forest tenure road/, 'Logging road on permit records');
  if (SURF[o.surf]) o.surf = SURF[o.surf];
  if (/^Active \(forest tenure\)/.test(o.status || '')) o.status = 'Permit on record (forest tenure): does not mean open or drivable';
  if (o.src === 'Forest tenure road segments' && o.date) o.date = `Downloaded ${o.date}`;
  return o;
}
/** One plain driving line (Tip) from the surface and kind, or ''. */
export function driveTip(p) {
  const k = (p && p.kind) || '', s = String((p && p.surf) || '').toLowerCase();
  if (k === 'retired' || k === 'overgrown' || /overgrown|decommissioned/.test(s)) return 'Tip: plan to walk it, not drive it.';
  if (k === 'proposed' || k === 'pending') return 'Tip: may not exist on the ground.';
  if (/^paved/.test(s)) return 'Tip: a paved road, if it is open.';
  if (/^loose/.test(s)) return 'Tip: gravel or dirt. Most trucks manage it when open and dry; snow and washouts change that.';
  if (/^rough/.test(s)) return 'Tip: rough. Expect to need high clearance or 4x4.';
  if (/^seasonal/.test(s)) return 'Tip: seasonal. Expect it may be impassable in November.';
  return 'Tip: surface unknown. Do not count on driving it until you see it.';
}
/** True for an unnamed road atlas line (most were traced from air photos). */
export const traced = (p) => !!p && !p.name && p.src === 'BC Digital Road Atlas';
export const NAV_WARN = 'Traced from air photos: the province says not to use these lines to navigate.';
