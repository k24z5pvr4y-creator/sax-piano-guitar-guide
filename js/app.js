// app.js — hash router, breadcrumb, theme toggle, global app state.
// The route table maps the flowchart tree 1:1. Each leaf view is a module
// exporting `mount(container, ctx)`; ctx carries shared state (see below).

import { renderHome } from "./views/home.js";
import { renderSaxTranslator } from "./views/sax-translator.js";
import { renderSaxScales } from "./views/sax-scales.js";
import { renderPianoScales } from "./views/piano-scales.js";
import { renderPianoChords } from "./views/piano-chords.js";
import { renderGuitarScales } from "./views/guitar-scales.js";
import { renderGuitarChords } from "./views/guitar-chords.js";
import { renderHowItWorks } from "./views/how-it-works.js";

// --- shared app state (no persistence needed per brief) --------------------
// The octave-range picker propagates to sax + guitar + piano, so it lives here.
export const state = {
  instrument: "alto",     // sax: 'alto' | 'tenor'
  octaveLow: 2,           // octave-range picker low (guitar fretboard only)
  octaveHigh: 6,          // octave-range picker high
  root: "C",              // current root for scale/chord views
};

// route -> { title, crumbs, render }
const routes = {
  "/":                 { title: "Choose Instrument", crumbs: [],                            render: renderHome },
  "/learn/how-it-works": { title: "Fingering Intuition", crumbs: ["Saxophone"],               render: renderHowItWorks },
  "/sax/translator":   { title: "Note Translator",   crumbs: ["Saxophone"],                 render: renderSaxTranslator },
  "/sax/scales":       { title: "Scales",            crumbs: ["Saxophone"],                 render: renderSaxScales },
  "/piano/scales":     { title: "Scales",            crumbs: ["Piano"],                     render: renderPianoScales },
  "/piano/chords":     { title: "Chords",            crumbs: ["Piano"],                     render: renderPianoChords },
  "/guitar/scales":    { title: "Scales",            crumbs: ["Guitar"],                    render: renderGuitarScales },
  "/guitar/chords":    { title: "Chords",            crumbs: ["Guitar"],                    render: renderGuitarChords },
};

const viewEl = document.getElementById("view");
const crumbEl = document.getElementById("breadcrumb");

function parseHash() {
  const h = location.hash.replace(/^#/, "") || "/";
  return h;
}

async function route() {
  const path = parseHash();
  const r = routes[path] || routes["/"];
  // breadcrumb
  const parts = ['<a href="#/">Home</a>', ...r.crumbs.map(c => `<span>› ${c}</span>`),
                 path === "/" ? "" : `<span>› ${r.title}</span>`].filter(Boolean);
  crumbEl.innerHTML = parts.join(" ");
  // render
  viewEl.innerHTML = "";
  try {
    await r.render(viewEl, { state, navigate });
  } catch (err) {
    viewEl.innerHTML = `<p class="eyebrow">Something went wrong loading this view.</p>
      <pre style="white-space:pre-wrap;color:var(--ink-muted)">${String(err)}</pre>`;
    console.error(err);
  }
  window.scrollTo(0, 0);
}

export function navigate(path) { location.hash = path; }

// --- theme toggle ----------------------------------------------------------
const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
});

window.addEventListener("hashchange", route);
route();

// --- service worker (PWA) --------------------------------------------------
// Only registers under https/localhost (not file://). See README for install.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
