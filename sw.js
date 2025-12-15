const CACHE_NAME = "circuit-lab-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./icon.svg",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
        return response || fetch(e.request).catch(err => {
            console.error('Fetch failed:', e.request.url, err);
            // Optional: return a fallback offline page here if navigation
        });
    })
  );
});
