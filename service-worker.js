// Numéro de version du cache : à incrémenter (reactivite-v2, v3, ...) à
// CHAQUE modification d'un fichier listé dans FICHIERS. Sans ça, l'iPad déjà
// installé continue de servir l'ancienne version indéfiniment, hors ligne
// comme en ligne, et le kinésithérapeute ne verra jamais les corrections.
var CACHE = "reactivite-v2";

var FICHIERS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./assets/logo.svg",
  "./assets/favicon.svg",
  "./assets/icone-180.png",
  "./assets/icone-192.png",
  "./assets/icone-512.png",
  "./src/modele.js",
  "./src/aleatoire.js",
  "./src/generateur.js",
  "./src/moteur.js",
  "./src/exercices-livres.js",
  "./src/stockage.js",
  "./src/rendu.js",
  "./src/audio.js",
  "./src/veille.js",
  "./src/ecran-liste.js",
  "./src/ecran-reglages.js",
  "./src/ecran-exercice.js",
  "./src/app.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  // Purge des anciennes versions, sinon une mise à jour laisserait cohabiter
  // deux jeux de fichiers.
  e.waitUntil(caches.keys().then(function (noms) {
    return Promise.all(noms.map(function (n) { return n === CACHE ? null : caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  // Cache d'abord : au cabinet, le réseau est la partie la moins fiable.
  e.respondWith(caches.match(e.request).then(function (r) {
    return r || fetch(e.request);
  }));
});
