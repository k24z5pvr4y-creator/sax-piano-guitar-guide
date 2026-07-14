// sw.js — network-first service worker (falls back to cache when offline,
// e.g. iPad use with no signal).
// Requires https or localhost to register (NOT file://) — see README.
//
// Bump CACHE on any deploy that changes a cached file. The browser only
// re-runs install/activate when this script's own bytes differ, so an
// unchanged version string here means clients keep serving whatever they
// cached on their first visit forever, even after a fresh deploy — this bit
// a real deploy once (piano-chords/fretboard fixes didn't show up for a
// returning visitor) and is why the fetch handler below is network-first
// rather than cache-first: it self-heals on every deploy instead of relying
// on remembering to bump this string.
const CACHE = "instrument-ref-v3";
const ASSETS = [
  "./", "./index.html",
  "./css/tokens.css", "./css/base.css", "./css/components.css",
  "./js/app.js",
  "./js/theory/pitch.js", "./js/theory/scales.js", "./js/theory/chords.js",
  "./js/render/controls.js", "./js/render/keyboard.js", "./js/render/fretboard.js",
  "./js/render/sax.js", "./js/render/chordbox.js", "./js/render/noteColors.js",
  "./js/views/home.js", "./js/views/sax-translator.js", "./js/views/sax-scales.js",
  "./js/views/piano-scales.js", "./js/views/piano-chords.js",
  "./js/views/guitar-scales.js", "./js/views/guitar-chords.js",
  "./js/views/how-it-works.js",
  "./data/sax-fingerings.json", "./data/sax-key-finger-map.json",
  "./data/scales.json", "./data/chords.json",
  "./manifest.webmanifest"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting(); // take over without waiting for old tabs to close
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", e => e.respondWith(
  fetch(e.request)
    .then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    })
    .catch(() => caches.match(e.request))
));
