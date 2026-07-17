/* LearnQuest service worker — cache-first so the app runs fully offline
   after the first load when served over HTTP(S) (e.g. on an iPad). */
'use strict';

const CACHE = 'learnquest-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './js/util.js',
  './js/audio.js',
  './js/storage.js',
  './js/content-english.js',
  './js/generators-math.js',
  './js/generators-english.js',
  './js/data.js',
  './js/activities.js',
  './js/celebrate.js',
  './js/rewards.js',
  './js/level.js',
  './js/map.js',
  './js/parent.js',
  './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
