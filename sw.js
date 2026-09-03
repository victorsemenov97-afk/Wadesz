// Мандашня — service worker (offline-ready)
const CACHE = "mandashnya-v19";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./theme.css",
  "./game.js",
  "./firebase-config.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./assets/wood_light.jpg",
  "./assets/wood_dark.jpg",
  "./assets/bg.jpg",
  "./assets/pawn_red.png",
  "./assets/pawn_yellow.png",
  "./assets/pawn_blue.png",
  "./assets/pawn_green.png",
  "./assets/nameplate.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Статику берём из кеша; сетевые запросы (Firebase) не кешируем.
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return; // Firebase/Google — напрямую в сеть
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => {
          try { c.put(req, copy); } catch (err) {}
        });
        return res;
      }).catch(() => {
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
