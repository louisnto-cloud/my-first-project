/* Hunt Map tool: "Where can I hunt?" Turns on the derived "Where you can likely hunt" layer (manifest hunt_likely,
   scripts/build-crown.py) and explains its two colours in plain words. Never a sure yes: it points to "Can I hunt here now?". */
import { esc } from './util.js';
import * as layers from './layers.js';
import { intro, peek, BANNER } from './hunt-ui.js';

let H, map;
const ID = 'hunt_likely';

export function init(api) { H = api; map = H.map; H.whereHunt = { open }; }

export async function open() {
  await layers.loadManifest();
  const st = layers.stateOf(ID);
  if (!st) {
    H.openSheet({ title: 'Where can I hunt?', html: `<p>This map does not have the “Where you can likely hunt” layer yet. Open the map with signal to update it.</p>${BANNER}` });
    return null;
  }
  layers.setOn(ID, true);
  if (map.getZoom() < (st.l.minzoom || 8)) map.easeTo({ zoom: (st.l.minzoom || 8) + 1 });
  const covered = (st.l.areas || []).join(', ');
  const body = H.openSheet({ title: 'Where can I hunt?', modal: false, onClose: peek(), html: `${intro('a first look at where hunting is likely allowed. Bright green: likely open. Grey: check first.',
    ['The layer is now on. Zoom in to see it (it shows from zoom 8).', 'Tap a green or grey area for how the app worked it out and how sure it is.', 'Then tap “Can I hunt here now?” for one spot, one animal, right now.'])}
    <ul class="hmm-legend"><li><i style="background:#00c853"></i>Likely open to hunt (check season, MU (Management Unit) and signs)</li><li><i style="background:#9e9e9e"></i>Check first: Crown land with a tenure, federal land, or a park</li></ul>
    <p><b>How it is made:</b> Crown land (ParcelMap BC parcels, plus land with no titled parcel), minus the mapped no hunting and no shooting areas, cities and towns, private land, reserves, tenures and federal land. About 75% sure. Worked out by the app, not an official map.</p>
    <p><b>Still check yourself:</b> the open season for your MU, posted signs and fences, the 100 m (109 yd) rule near buildings, and the No Shooting Areas that are only on the synopsis maps. Motor vehicle closures are not taken out: they limit driving, not hunting.</p>
    <p class="hmm-muted">Covered now: ${esc(covered || 'not listed')}. Data: BC Data Catalogue, Open Government Licence BC.</p>
    <div class="hmm-btnrow"><button class="hmm-btn2" data-w="crown">Also show Crown land and tenures</button>${H.canHunt ? '<button class="hmm-btn2" data-w="can">Can I hunt here now?</button>' : ''}</div>
    ${BANNER}` });
  const b = (k) => body.querySelector(`[data-w="${k}"]`);
  b('crown').onclick = () => { layers.setOn('crown_land', true); layers.setOn('crown_tenures', true); H.toast('Crown land and tenures are on.', 2500); };
  if (b('can')) b('can').onclick = () => { const c = map.getCenter(); H.canHunt.open([c.lng, c.lat]); };
  return body;
}
