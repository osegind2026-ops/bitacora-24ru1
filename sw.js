// Bitacora 24RU1 para celular (version 3.3). La aplicacion se sirve desde la copia guardada en el telefono.
const CACHE = "b24-3.3-202610101151";
const ESENCIAL = ["./", "css/app.css?v=202610101151", "js/bitacora.js?v=202610101151", "fonts/montserrat-latin-400-normal.woff2", "fonts/montserrat-latin-500-normal.woff2", "fonts/montserrat-latin-600-normal.woff2", "fonts/montserrat-latin-700-normal.woff2", "img/bitacora.ico", "img/icono-192.png", "img/membrete.png", "manifest.webmanifest"];
const RESTO = ["ayuda/Guia_Rapida_Tecnicos.pdf", "img/e1_interior.jpg", "img/e1_portada.jpg", "img/hojaCfe.png", "img/hojaEscudo.png", "img/hojaPlanta.png", "img/ico1.png", "img/ico2.png", "img/ico3.png", "img/icono-512.png", "img/icono-adaptable-512.png", "img/icono-apple-180.png", "img/ofDer.png", "img/ofIzq.png", "img/ofPie.png", "img/pie.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESENCIAL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
    .then(() => { caches.open(CACHE).then(c => Promise.all(RESTO.map(u => c.add(u).catch(() => { })))); })));
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  const clave = r.mode === "navigate" ? "./" : r;
  e.respondWith(caches.open(CACHE).then(c => c.match(clave, { ignoreSearch: r.mode !== "navigate" && !/[?&]v=/.test(r.url) }).then(x => x || fetch(r).then(resp => {
    if (resp && resp.ok && resp.type === "basic") c.put(clave, resp.clone());
    return resp;
  }).catch(() => c.match("./")))));
});
