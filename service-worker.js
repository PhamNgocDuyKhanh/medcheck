/**
 * service-worker.js
 * Caches ONLY the static app shell (HTML/CSS/JS/icons) so MedCheck loads
 * instantly and works offline for everything except live Gemini calls.
 *
 * Deliberately ignores every cross-origin request. Since the Gemini API
 * lives on a different origin (generativelanguage.googleapis.com), that
 * check alone guarantees this file never sees — let alone caches — a
 * scanned photo, a lab PDF, or any other PHI. It literally cannot.
 *
 * ⚠️ RELEASE CHECKLIST — READ BEFORE DEPLOYING ANY CHANGE:
 * Browsers detect a service worker update by byte-diffing THIS FILE against
 * the version they already have installed — nothing else triggers a
 * re-check. That means:
 *
 *   1. If you change any file listed in SHELL_ASSETS below (any js/*.js,
 *      style.css, index.html, manifest.json, or app icons), you MUST bump
 *      CACHE_NAME on the very next line, or already-installed users
 *      (anyone who added MedCheck to their home screen) will keep being
 *      served the OLD cached files indefinitely — the app on your server
 *      can be fully updated and it won't matter to them.
 *   2. If you add or remove a shell file, update the SHELL_ASSETS array
 *      too (there's no build step to auto-discover files here).
 *   3. Bumping CACHE_NAME alone (with SHELL_ASSETS unchanged) is a safe,
 *      cheap way to force a fresh recache of everything if you're ever
 *      unsure whether a change landed for existing users.
 *
 * We deliberately do NOT derive CACHE_NAME from config.js's APP_VERSION via
 * `import` — that would require registering this file with
 * `{ type: 'module' }`, and Firefox still does not support module service
 * workers (github.com/w3c/ServiceWorker issues, longstanding). A silent
 * offline-caching failure for an entire browser isn't worth saving one
 * manual edit, so this stays a plain classic script with an explicit,
 * manually-bumped version string.
 */

const CACHE_NAME = 'medcheck-shell-v2';

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
      .then(() => {
        // Visible in remote DevTools (chrome://inspect, Safari Web Inspector)
        // under this service worker's console — the quickest way to confirm
        // on a real phone that an update actually took effect, vs. still
        // running a stale cached version.
        console.log(`[service-worker] active: ${CACHE_NAME}`);
      })
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
