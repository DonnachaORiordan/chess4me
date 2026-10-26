// The service worker: lets the app open and work with no internet.
// The browser runs this file in the background, separately from the page.
// It must sit in the top folder so it can look after every file of the app.
//
// How it works ("network first"):
// - Online: always fetch the newest file, and keep a copy of it.
// - Offline: hand out the saved copy instead.
// So updates still reach the phone straight away whenever it's online.

// Load APP_NAME from config.js, so the name stays in one place.
importScripts("js/config.js");

// Change this number to throw away all saved copies and start fresh.
const CACHE_VERSION = 1;
const CACHE_NAME = APP_NAME.toLowerCase() + "-v" + CACHE_VERSION;

// Every file the app needs, saved when the service worker is first installed.
const APP_FILES = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "lib/chess.js",
  "js/config.js",
  "js/storage.js",
  "js/sounds.js",
  "js/board.js",
  "js/practice.js",
  "js/watch.js",
  "js/editor.js",
  "js/backup.js",
  "js/app.js",
  "assets/pieces/wP.svg", "assets/pieces/wN.svg", "assets/pieces/wB.svg",
  "assets/pieces/wR.svg", "assets/pieces/wQ.svg", "assets/pieces/wK.svg",
  "assets/pieces/bP.svg", "assets/pieces/bN.svg", "assets/pieces/bB.svg",
  "assets/pieces/bR.svg", "assets/pieces/bQ.svg", "assets/pieces/bK.svg",
  "assets/icons/icon.svg",
  "assets/icons/icon-180.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png"
];

// Install: save a copy of every app file, then take over straight away.
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

// Activate: delete saved copies from older versions (other cache names).
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Fetch: every time the page asks for a file, try the internet first,
// and fall back to the saved copy if that fails.
self.addEventListener("fetch", function (event) {
  const request = event.request;

  // Only handle normal file requests to our own site.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(function (response) {
        // Got the newest file: update the saved copy, then hand it to the page.
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      })
      .catch(function () {
        // Offline: use the saved copy ("ignoreSearch" ignores anything after a "?" in the address).
        return caches.match(request, { ignoreSearch: true });
      })
  );
});
