/* Sound Garden service worker — makes the whole app work offline.
   Every file (including all voice audio) is downloaded once on first
   visit and then served from the device, so the app works with no wifi.
   Bump CACHE_NAME whenever any file changes so devices refetch. */
const CACHE_NAME = 'sound-garden-v2';
const CORE = ['./', './index.html', './manifest.json', './apple-touch-icon.png', './icon-512.png'];
const AUDIO = [
  'assets/a.mp3',
  'assets/an.mp3',
  'assets/at.mp3',
  'assets/b.mp3',
  'assets/bag.mp3',
  'assets/bat.mp3',
  'assets/big.mp3',
  'assets/bin.mp3',
  'assets/box.mp3',
  'assets/bug.mp3',
  'assets/c.mp3',
  'assets/can.mp3',
  'assets/cap.mp3',
  'assets/car.mp3',
  'assets/cat.mp3',
  'assets/ch.mp3',
  'assets/chat.mp3',
  'assets/chip.mp3',
  'assets/ck.mp3',
  'assets/clap.mp3',
  'assets/cop.mp3',
  'assets/crab.mp3',
  'assets/cup.mp3',
  'assets/cut.mp3',
  'assets/d.mp3',
  'assets/dad.mp3',
  'assets/den.mp3',
  'assets/dig.mp3',
  'assets/dot.mp3',
  'assets/duck.mp3',
  'assets/e.mp3',
  'assets/f.mp3',
  'assets/fin.mp3',
  'assets/fish.mp3',
  'assets/flag.mp3',
  'assets/fox.mp3',
  'assets/fun.mp3',
  'assets/g.mp3',
  'assets/gum.mp3',
  'assets/h.mp3',
  'assets/ham.mp3',
  'assets/hat.mp3',
  'assets/hen.mp3',
  'assets/hop.mp3',
  'assets/hot.mp3',
  'assets/i.mp3',
  'assets/in.mp3',
  'assets/it.mp3',
  'assets/j.mp3',
  'assets/jam.mp3',
  'assets/job.mp3',
  'assets/k.mp3',
  'assets/kid.mp3',
  'assets/kit.mp3',
  'assets/l.mp3',
  'assets/lap.mp3',
  'assets/lip.mp3',
  'assets/log.mp3',
  'assets/m.mp3',
  'assets/map.mp3',
  'assets/mat.mp3',
  'assets/math.mp3',
  'assets/mom.mp3',
  'assets/n.mp3',
  'assets/nap.mp3',
  'assets/net.mp3',
  'assets/nip.mp3',
  'assets/o.mp3',
  'assets/p.mp3',
  'assets/p_again.mp3',
  'assets/p_family.mp3',
  'assets/p_find.mp3',
  'assets/p_firstword.mp3',
  'assets/p_hi.mp3',
  'assets/p_listen.mp3',
  'assets/p_more.mp3',
  'assets/p_pick.mp3',
  'assets/p_pop.mp3',
  'assets/p_same.mp3',
  'assets/p_tap.mp3',
  'assets/p_this.mp3',
  'assets/p_trace.mp3',
  'assets/p_word.mp3',
  'assets/p_yay.mp3',
  'assets/pan.mp3',
  'assets/pat.mp3',
  'assets/pen.mp3',
  'assets/pet.mp3',
  'assets/pick.mp3',
  'assets/pin.mp3',
  'assets/pit.mp3',
  'assets/pot.mp3',
  'assets/pup.mp3',
  'assets/qu.mp3',
  'assets/quick.mp3',
  'assets/r.mp3',
  'assets/rat.mp3',
  'assets/rock.mp3',
  'assets/run.mp3',
  'assets/s.mp3',
  'assets/sap.mp3',
  'assets/sat.mp3',
  'assets/sh.mp3',
  'assets/ship.mp3',
  'assets/sip.mp3',
  'assets/sit.mp3',
  'assets/six.mp3',
  'assets/sock.mp3',
  'assets/spot.mp3',
  'assets/star.mp3',
  'assets/step.mp3',
  'assets/stop.mp3',
  'assets/sun.mp3',
  'assets/t.mp3',
  'assets/tag.mp3',
  'assets/tan.mp3',
  'assets/tap.mp3',
  'assets/ten.mp3',
  'assets/th.mp3',
  'assets/thick.mp3',
  'assets/tin.mp3',
  'assets/tip.mp3',
  'assets/top.mp3',
  'assets/trip.mp3',
  'assets/u.mp3',
  'assets/v.mp3',
  'assets/van.mp3',
  'assets/vet.mp3',
  'assets/w.mp3',
  'assets/wag.mp3',
  'assets/wet.mp3',
  'assets/win.mp3',
  'assets/wish.mp3',
  'assets/x.mp3',
  'assets/y.mp3',
  'assets/yes.mp3',
  'assets/yum.mp3',
  'assets/z.mp3',
  'assets/zap.mp3',
  'assets/zip.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    // audio in chunks so one slow file can't stall the whole install
    for (let i = 0; i < AUDIO.length; i += 20)
      await cache.addAll(AUDIO.slice(i, i + 20));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k !== CACHE_NAME) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const resp = await fetch(e.request);
      if (resp.ok && new URL(e.request.url).origin === location.origin) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(e.request, resp.clone());
      }
      return resp;
    } catch (err) {
      if (e.request.mode === 'navigate')
        return caches.match('./index.html');
      throw err;
    }
  })());
});
