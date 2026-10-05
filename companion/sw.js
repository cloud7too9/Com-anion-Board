// Service Worker der Companion-PWA (Umbau Phase 5): App-Shell im Cache, damit die Seite am Handy auch ohne
// Netz aufgeht. Nur aktiv, wenn konfig.js `pwa: true` setzt (Netlify) – lokal vom Board kommt die Seite
// weiter ohne Cache. Der Stand (__STAND__) wird beim Bauen eingesetzt; ein neuer Stand räumt alte Caches weg.
// Daten gehen nie durch den Cache: Anfragen an andere Ursprünge (die API) laufen immer ins Netz.
const STAND = "__STAND__";
const CACHE = `companion-${STAND}`;
const SHELL = ["./", "index.html", "konfig.js", "regeln.js", "board-karten.js", "texterkennung.js", "biom-ids.js",
  "manifest.webmanifest", "icons/app/icon-192.png", "icons/app/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((alle) => Promise.all(alle.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;                       // API, CDN: immer Netz
  if (!url.pathname.startsWith(new URL("./", self.location.href).pathname)) return;   // nur der eigene Bereich (/app/)
  if (request.mode === "navigate" || url.pathname.endsWith("konfig.js")) {
    // Seite und Konfiguration: erst Netz (neuer Stand), sonst aus dem Cache
    e.respondWith(fetch(request).then((antwort) => { caches.open(CACHE).then((c) => c.put(request, antwort.clone())); return antwort; })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((a) => a ?? caches.match("index.html"))));
    return;
  }
  // Alles andere (Regeln, Icons, Texturen, tesseract.js, Welt-Import): erst Cache, sonst Netz und merken
  e.respondWith(caches.match(request).then((treffer) => treffer ?? fetch(request).then((antwort) => {
    if (antwort.ok) caches.open(CACHE).then((c) => c.put(request, antwort.clone()));
    return antwort;
  })));
});
