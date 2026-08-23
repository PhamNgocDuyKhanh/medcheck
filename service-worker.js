/**
 * service-worker.js
 * Caches ONLY the static app shell (HTML/CSS/JS/icons) so MedCheck loads
 * instantly and works offline for everything except live Gemini calls.
 *
 * Deliberately ignores every cross-origin request. Since the Gemini API
 * lives on a different origin (generativelanguage.googleapis.com), that
 * check alone guarantees this file never sees — let alone caches — a
 * scanned photo, a lab PDF, or any other PHI. It literally cannot.
 */

const CACHE_NAME = 'medcheck-shell-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/config.js',
  './js/storage.js',
  './js/i18n.js',
  './js/theme.js',
  './js/camera.js',
  './js/gemini-api.js',
  './js/ui.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cross-origin (Gemini API, Google Fonts, etc.) — never intercept, never
  // cache. This one line is what keeps PHI entirely out of this file.
  if (url.origin !== self.location.origin) return;

  // Only ever cache simple GET requests for the static shell.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
