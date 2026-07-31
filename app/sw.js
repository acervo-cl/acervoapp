// Service worker de Acervo — cachea la "cáscara" de la app para que abra sin conexión.
// Los datos viajan por Supabase (red), nunca se cachean aquí.
const CACHE = 'acervo-v354';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // solo GET
  const url = new URL(req.url);

  // Nunca cachear llamadas a Supabase (datos siempre frescos desde la red)
  if (url.hostname.endsWith('supabase.co')) return;

  // Navegación (cargar la app): red primero, cae a la caché si no hay internet
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto (CDN, iconos): caché primero, luego red (y guarda copia)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && (url.protocol === 'https:' || url.protocol === 'http:')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
