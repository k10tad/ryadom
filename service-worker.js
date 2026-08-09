const VERSION = 'ryadom-v0.5.0';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './css/style-v050.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/core/config.js',
  './js/core/db.js',
  './js/core/migration.js',
  './js/dialogue/dialogue-engine.js',
  './js/dialogue/typewriter.js',
  './js/intelligence/reasoning.js',
  './js/intelligence/ryadom-intelligence.js',
  './js/services/knowledge-service.js',
  './js/services/medical-service.js',
  './js/services/memory-service.js',
  './js/services/profile-service.js',
  './js/ui/templates.js',
  './js/ui/panels.js',
  './json/dialogues.json',
  './json/drugs.json',
  './json/conditions.json',
  './json/interactions.json',
  './assets/alek/alek-home.jpg',
  './assets/alek/alek-bed.jpg',
  './assets/backgrounds/living.jpg',
  './assets/backgrounds/bedroom.jpg',
  './assets/icons/icon.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('ryadom-') && key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isKnowledgeRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/json/');
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return await caches.match(request) || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' || isKnowledgeRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || networkFirst(event.request))
  );
});
