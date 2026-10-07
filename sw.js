// Bitacora 24RU1 para celular - funciona sin senal con la ultima version descargada
const CACHE = "b24-1.9-202610071712";
const ARCHIVOS = ["./", "ayuda/Guia_Rapida_Tecnicos.pdf", "css/app.css", "fonts/montserrat-latin-400-normal.woff2", "fonts/montserrat-latin-500-normal.woff2", "fonts/montserrat-latin-600-normal.woff2", "fonts/montserrat-latin-700-normal.woff2", "img/bitacora.ico", "img/hojaCfe.png", "img/hojaEscudo.png", "img/hojaPlanta.png", "img/ico1.png", "img/ico2.png", "img/ico3.png", "img/icono-192.png", "img/icono-512.png", "img/membrete.png", "img/ofDer.png", "img/ofIzq.png", "img/ofPie.png", "img/pie.png", "index.html", "js/app.js", "js/ec_lista.js", "js/hoja.js", "js/horasextra.js", "js/local.js", "js/movil.js", "js/nucleo.js", "js/oficio.js", "js/reportes.js", "js/tour.js", "js/ui.js", "js/vistas_sup.js", "js/vistas_tec.js", "manifest.webmanifest"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r, { cache: "no-cache" }).then(resp => {
    if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
    return resp;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || caches.match("./"))));
});
