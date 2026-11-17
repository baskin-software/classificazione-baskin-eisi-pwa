/* service-worker.js by Daniele Lolli (UncleDan) feat. Claude AI - Release 26.1 - 2026-11-14 13-47-15 */
/* =====================================================================
   Service worker - Classificazione Baskin EISI (PWA)
   Cache-first per il funzionamento completamente offline.
   Aggiornare CACHE_NAME ad ogni rilascio (deve coincidere con APP_VERSION
   in js/app.js): invalida la vecchia cache e dichiara la versione del file.
   ===================================================================== */
const CACHE_NAME = 'classificazione-baskin-eisi-v26.1';

const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/data.js',
  './js/logos.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/logos/logo-baskin.svg',
  './icons/logos/logo-eisi.svg',
  './img/doc/traiettoria-parabolica.png',
  './img/doc/caduta-verticale.png',
  './img/doc/scivolo-foto.jpg',
  './img/doc/scivolo-schema.png',
  './img/doc/percorso-a.png',
  './img/doc/percorso-b.png',
  './img/doc/percorso-c.png'
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (event)=>{
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;
  // service-worker.js va sempre letto dalla rete (verifica aggiornamenti)
  if(url.pathname.endsWith('/service-worker.js')) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if(res && res.ok){ const copy = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copy)); }
      return res;
    }).catch(()=> req.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});
