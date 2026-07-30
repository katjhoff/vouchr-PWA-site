const CACHE_NAME = 'vouchr-v1';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'builder.html',
  'privacy.html',
  'terms.html',
  'get.html',
  'js/nacl-fast.min.js',
  'js/nacl-util.min.js',
  'js/qrcode.min.js',
  'js/i18n.js',
  'locales/en.json',
  'locales/es.json',
  'locales/fr.json',
  'locales/de.json',
  'locales/ko.json',
  'locales/ja.json',
  'locales/pt.json',
  'locales/sv.json',
  'locales/da.json',
  'images/LOGONEW.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Individual cache attempt prevents 1 missing image from killing offline SW
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`[SW] Warning: Failed to cache ${asset}:`, err);
        }
      }
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});
