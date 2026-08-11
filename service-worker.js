const VERSION = 'ryadom-v1.8.12-otter-high-contrast';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css?v=1.8.1',
  './css/cycle-tracker.css?v=1.6.0',
  './css/style-v050.css?v=1.8.12',
  './css/splash.css?v=1.0.2',
  './manifest.webmanifest',
  './js/splash.js?v=1.0.0',
  './js/app.js?v=1.8.4',
  './js/config.js?v=1.8.1',
  './js/personalization.js?v=1.8.1',
  './js/ambient-audio.js?v=1.8.1',
  './js/db.js?v=0.9.0',
  './js/migration.js',
  './js/dialogue-engine.js',
  './js/typewriter.js',
  './js/reasoning.js',
  './js/ryadom-intelligence.js',
  './js/symptom-advisor.js?v=1.4.0',
  './js/emotional-support.js?v=1.3.0',
  './js/clinical-triage.js',
  './js/knowledge-service.js',
  './js/medical-service.js',
  './js/memory-service.js',
  './js/profile-service.js',
  './js/weather-service.js?v=1.0.0',
  './js/templates.js?v=0.9.0',
  './js/panels.js?v=0.9.0',
  './js/cycle-panel.js?v=1.6.0',
  './js/menstrual-service.js?v=1.6.0',
  './js/backup-service.js?v=0.9.0',
  './js/fflate.js',
  './json/dialogues.json',
  './json/drugs.json',
  './json/conditions.json',
  './json/interactions.json',
  './assets/alek/alek-home.jpg',
  './assets/alek/alek-bed.jpg',
  './assets/alek/alek-work.jpg',
  './assets/alek/alek-asleep.jpg',
  './assets/alek/alek-shower.jpg',
  './assets/alek/alek-ryadom.jpg',
  './assets/backgrounds/living.jpg',
  './assets/backgrounds/bedroom.jpg',
  './assets/icons/icon.jpg',
  './assets/icons/otter-a.png',
  './assets/icons/otter-b.png',
  './assets/icons/otter-c.png'
  ,'./assets/splash-wisteria.png'
  ,'./voice/Alek.1.mp3'
  ,'./voice/Alek.2.mp3'
  ,'./voice/Alek.3.mp3'
  ,'./voice/Alek.4.mp3'
  ,'./voice/Alek.5.mp3'
  ,'./voice/Alek.6.mp3'
  ,'./voice/Alek.7.mp3'
  ,'./voice/Alek.8.mp3'
  ,'./voice/Alek.9.mp3'
  ,'./voice/Alek.10.mp3'
  ,'./voice/Alek.11.mp3'
  ,'./music/elmenreich_tsumugiuta.mp3'
  ,'./music/gluck_seireinoodori.mp3'
  ,'./music/grieg_solveigssong.mp3'
  ,'./music/schumann_morinoiriguchi.mp3'
  ,'./music/straussII_annenpolka.mp3'
  ,'./music/veldy_hanakarahanahe.mp3'
  ,'./sound/bathtub.mp3'
  ,'./sound/doubleclick.mp3'
  ,'./sound/heartbeat.mp3'
  ,'./sound/keyboard.mp3'
  ,'./sound/paper.mp3'
  ,'./sound/phone.mp3'
  ,'./sound/printer.mp3'
  ,'./sound/shower.mp3'
  ,'./sound/vibe.mp3'
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

function isVoiceRequest(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/voice/') || url.pathname.includes('/Voice/');
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
  if (event.request.mode === 'navigate' || isKnowledgeRequest(event.request) || isVoiceRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || networkFirst(event.request))
  );
});
