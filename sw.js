// sw.js — minimal cache-first service worker for offline iPad use.
// Requires https or localhost to register (NOT file://) — see README.
const CACHE = "instrument-ref-v1";
const ASSETS = [
  "./", "./index.html",
  "./css/tokens.css", "./css/base.css", "./css/components.css",
  "./js/app.js",
  "./js/theory/pitch.js", "./js/theory/scales.js", "./js/theory/chords.js",
  "./js/render/controls.js", "./js/render/keyboard.js", "./js/render/fretboard.js", "./js/render/sax.js",
  "./js/views/home.js", "./js/views/sax-translator.js", "./js/views/sax-scales.js",
  "./js/views/piano-scales.js", "./js/views/piano-chords.js",
  "./js/views/guitar-scales.js", "./js/views/guitar-chords.js",
  "./data/sax-fingerings.json", "./data/sax-key-finger-map.json",
  "./data/scales.json", "./data/chords.json",
  "./manifest.webmanifest"
];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
));
self.addEventListener("fetch", e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
