const CACHE_NAME = "natural-science-pwa-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./electric01.html",
  "./magnet01.html",
  "./optics01.html",
  "./style.css",
  "./electric01.js",
  "./magnet01.js",
  "./optics01.js",
  "./icon-192.png",
  "./icon-512.png",
];

// Install event - caching static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event - cleaning up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serving from cache or network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
