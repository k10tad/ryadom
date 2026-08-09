const VERSION = 'ryadom-v0.6.0-knowledge-general-1';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './css/style-v050.css?v=0.5.1',
  './manifest.webmanifest',
  './js/app.js?v=0.5.1',
  './js/config.js',
  './js/db.js',
  './js/migration.js',
  './js/dialogue-engine.js',
  './js/typewriter.js',
  './js/reasoning.js',
  './js/ryadom-intelligence.js',
  './js/knowledge-service.js',
  './js/medical-service.js',
  './js/memory-service.js',
  './js/profile-service.js',
  './js/templates.js',
  './js/panels.js',
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
