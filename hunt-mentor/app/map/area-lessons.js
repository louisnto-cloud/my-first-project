/* Area report: short "how to hunt it" bullets, copied from the species lessons in content/phase4 (keep in step when a lesson changes).
   Each bullet: t = text, c = certainty % printed in the lesson (null = opinion, shown as Tip), k = kind (tactic, time, gear, range, wind, law),
   when(ctx) = optional filter. ctx: { month (1 to 12), elev (m or null), zone (BEC code or null), wet (wetland within 1 km), cut, burn }. */
const fall = (c) => c.month >= 9 && c.month <= 11;
const rut = (from, to) => (c) => c.month >= from && c.month <= to;
const high = (c) => c.elev != null && c.elev >= 1500;

export const LESSONS = {
  muledeer: { id: 'mule-deer', title: 'Mule deer', b: [
    { k: 'tactic', t: 'Sit at the edge of a grassy slope or opening at dawn or dusk and let them come (Option B, the lesson pick for a first trip).' },
    { k: 'tactic', t: 'Glass from a high point at first light, find a buck, then sneak in with the wind in your face (Option A).', c: 60, when: (c) => high(c) || c.month >= 9 },
    { k: 'time', t: 'Midday: walk slowly through bedding cover, 10 steps then stop 1 minute (Option C), or scout with binoculars.' },
    { k: 'gear', t: 'Rifle: your .308 Winchester with a 150 to 165 grain bullet built to expand. Zero with the box you hunt with.' },
    { k: 'range', t: 'Max range: where you hit a 15 cm (6 in) plate 9 times in 10 from a field rest. For most beginners 200 m (219 yd).' },
  ] },
  whitetail: { id: 'white-tailed-deer', title: 'White tailed deer', b: [
    { k: 'tactic', t: 'Sit the trail between bedding and food, downwind, before light or 2 hours before dark (Option A, the lesson pick).' },
    { k: 'tactic', t: 'Rattling and grunting works best in early November, not mid October (Option C).', when: rut(11, 11) },
    { k: 'time', t: 'Midday in thick bottoms: still hunt, 10 steps then stop a minute, wind in your face (Option B).' },
    { k: 'gear', t: 'Your .308 with a 150 to 165 grain bullet built to expand. Valley shots are often 50 to 150 m (55 to 164 yd).' },
    { k: 'range', t: 'Flat fields, houses and roads: see a solid earth backstop before every shot. Farm land needs permission.' },
  ] },
  moose: { id: 'moose', title: 'Moose', b: [
    { k: 'tactic', t: 'Cow call and bull grunt at dawn near a wetland in the rut window, late September to early October, then wait and glass (Option A).', when: (c) => c.month === 9 || c.month === 10 },
    { k: 'tactic', t: 'Walk cutblocks and willow flats slowly into the wind at dawn and dusk. Stop and glass every opening (Option B, the lesson pick).' },
    { k: 'time', t: 'Dusk: sit a trail between timber and a lake or swamp edge, downwind (Option C).', when: (c) => c.wet },
    { k: 'law', t: 'Legal methods for moose: centrefire rifle or bow only. No shotgun, no rimfire (synopsis page 13).', c: 98 },
    { k: 'gear', t: 'Your .308 with a 165 to 180 grain premium controlled expansion bullet, shots inside about 200 m (219 yd) (hunter consensus).', c: 65 },
  ] },
  elk: { id: 'elk', title: 'Elk', b: [
    { k: 'tactic', t: 'Set up downwind of a bugling bull at dawn. Cow call, bugle sparingly, stay still (Option A).', when: rut(9, 9) },
    { k: 'tactic', t: 'Sit high over a burn or meadow next to timber at dawn and dusk. Find the herd, then move in with the wind (Option B).' },
    { k: 'time', t: 'Afternoon: sit downwind of a fresh wallow or water (Option C).' },
    { k: 'law', t: 'Legal methods for elk: centrefire rifle or bow only (synopsis page 13).', c: 98 },
    { k: 'gear', t: 'Your .308 with a 165 to 180 grain premium bullet, inside about 200 m (219 yd) (hunter consensus). Wait for broadside.', c: 65 },
  ] },
  blackbear: { id: 'black-bear', title: 'Black bear', b: [
    { k: 'tactic', t: 'Glass berry slopes, cutblocks and road edges at dawn and the last 2 hours of light. Stalk with the wind in your face (Option A).' },
    { k: 'tactic', t: 'Sit downwind of a berry patch or creek crossing with fresh scat (Option B).' },
    { k: 'time', t: 'Watch every bear for at least 5 minutes before you decide anything (cubs hide in brush).' },
    { k: 'law', t: 'Legal: centrefire rifle, shotgun 20 gauge or larger with No. 1 buck or larger, bow, or air rifle .35 calibre or larger. No rimfire (synopsis page 13).', c: 98 },
    { k: 'gear', t: 'Your .308 with a 150 to 180 grain expanding bullet. Keep shots inside 150 m (164 yd) until you have done it once.' },
  ] },
  sheep: { id: 'mountain-sheep', title: 'Mountain sheep', b: [
    { k: 'tactic', t: 'Camp high, glass basins at first light, pick a ram, then plan a stalk out of sight, often from above (Option A, hunter consensus).', c: 60 },
    { k: 'tactic', t: 'Region 3 LEH (Limited Entry Hunting) zones: glass canyon walls from roads, then climb. You need a draw first (Option B).' },
    { k: 'law', t: 'Legal for sheep: centrefire rifle, air gun .35 calibre or larger, or bow A, C or D. No rimfire, no shotgun.', c: 98 },
    { k: 'gear', t: 'Your .308 with a 165 grain bonded bullet. On steep angles, shoot for the level distance. Practise prone off a pack at 250 m (273 yd).' },
    { k: 'range', t: 'Judge the ram with your partner. Two yes votes or no shot.' },
  ] },
  goat: { id: 'mountain-goat', title: 'Mountain goat', b: [
    { k: 'tactic', t: 'Find goats from below with a spotting scope, mark the cliff, then climb to their level or above (Option A, hunter consensus).', c: 60 },
    { k: 'time', t: 'Watch a goat 10 minutes or more. Shoot only where a dead goat will stay put.' },
    { k: 'law', t: 'Legal for goats: centrefire rifle, air gun .35 calibre or larger, bow A, C or D. No rimfire, no shotgun.', c: 98 },
    { k: 'gear', t: 'A 165 to 180 grain bonded bullet in your .308. Shots are often steep: hold for the level distance.' },
  ] },
  grouse: { id: 'grouse', title: 'Grouse and ptarmigan', b: [
    { k: 'tactic', t: 'Walk old roads, cutblock edges and aspen draws slowly at dawn and the last 2 hours of light. Stop often (Option A, the lesson pick).' },
    { k: 'time', t: 'Midday: look up for spruce grouse in pines and spruce, dusky grouse in big Douglas fir (Option B).' },
    { k: 'gear', t: 'Shotgun: 12 gauge with lead 6 or 7.5, legal for upland birds; improved cylinder choke.', c: 99 },
    { k: 'law', t: 'A .22 rimfire is legal for grouse and ptarmigan. Head shot on a sitting bird inside 25 m.', c: 95 },
    { k: 'law', t: 'Never hunt from a vehicle (synopsis page 11). Stop, get out, walk off the road, then load.', c: 99 },
  ] },
  ducks: { id: 'ducks', title: 'Ducks', b: [
    { k: 'tactic', t: 'Decoys on a pond: 6 to 12 decoys in a J hook, hide on shore, wind at your back or side (Option A).' },
    { k: 'tactic', t: 'Jump shoot small creeks and sloughs: walk in from downwind, look first, then step up (Option B).' },
    { k: 'gear', t: '12 gauge with steel shot 2, 3 or 4 for ducks; modified or improved cylinder choke rated for steel.', c: 70 },
    { k: 'range', t: 'Max range for a beginner: 35 m (38 yd). Birds in the decoys are 20 to 30 m.' },
    { k: 'law', t: 'No rifle and no single projectile for ducks.', c: 99 },
  ] },
  geese: { id: 'geese', title: 'Geese', b: [
    { k: 'tactic', t: 'Scout the evening before, mark where the flock fed, set 1 to 3 dozen decoys there at dawn (Option A).', c: 65 },
    { k: 'law', t: 'Fields need the owner’s permission on cultivated land.', c: 99 },
    { k: 'gear', t: '12 gauge, steel BB for big Canada geese; modified choke to start.', c: 70 },
    { k: 'range', t: 'Max range this season: 35 m (38 yd). A goose looks close at 50 m because it is big.' },
    { k: 'law', t: 'Electronic calls and recordings are banned for geese in BC.', c: 97 },
  ] },
  quail: { id: 'upland-birds', title: 'Quail, chukar, partridge, pheasant', b: [
    { k: 'tactic', t: 'Two hunters 15 to 25 m apart walk cover edges slowly and stop every 20 steps (Option A).' },
    { k: 'tactic', t: 'Pinch the cover: one walks a draw toward the other. Agree a no shot arc first (Option B).' },
    { k: 'law', t: 'No rifle or .22 for quail, chukar, partridge or pheasant.', c: 95 },
    { k: 'gear', t: 'Quail: lead 7.5 or 6, or steel 6, improved cylinder choke. Pattern it first.' },
    { k: 'range', t: 'No dog: shoot only over short cover and walk straight to the fall, eyes on the spot.' },
  ] },
  turkey: { id: 'wild-turkey', title: 'Wild turkey', b: [
    { k: 'tactic', t: 'Locate a roost the evening before. Set up 100 m away before light with a hen decoy and call softly (Option A).', c: 75 },
    { k: 'tactic', t: 'Fall: find a flock, scatter it, sit down and call the young birds back (Option C).', when: fall },
    { k: 'time', t: 'Midday: walk ridges and use an owl or crow call to make a tom gobble, then move close (Option B).', c: 75 },
    { k: 'gear', t: '12 gauge with a full or turkey choke, lead 4, 5 or 6, patterned at 30 and 40 m (33 and 44 yd).' },
    { k: 'range', t: 'Aim at the head and neck, never the body. Max range usually 40 m.' },
  ] },
};
