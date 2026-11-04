// Network first for the page itself, so an update shows up on the next launch
// with internet; everything falls back to the cached copy when offline.
// Music lives in its own cache that survives updates, so it downloads once.
const CACHE = 'tyanuchki-v9';
const MUSIC_CACHE = 'tyanuchki-music-1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
const MUSIC = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => 'music/t' + n + '.mp3');
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => {
  // the tunes come down in the background; the game works before they arrive
  caches.open(MUSIC_CACHE).then(c => Promise.all(MUSIC.map(u => c.match(u).then(r => r || c.add(u).catch(() => {})))));
  return self.skipWaiting();
})));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MUSIC_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
function fromNetwork(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req, { cache: 'no-store' }).then(res => {
      clearTimeout(t);
      if (!res.ok) return reject(new Error('bad status'));
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? 'index.html' : req, copy));
      resolve(res);
    }, err => { clearTimeout(t); reject(err); });
  });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/music/')) {
    e.respondWith(caches.open(MUSIC_CACHE).then(c => c.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
      if (res.ok && res.status === 200) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isPage) {
    e.respondWith(fromNetwork(req, 4000).catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
  })));
});
