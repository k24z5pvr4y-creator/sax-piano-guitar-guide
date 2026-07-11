// sax-scales.js — Saxophone ▸ Scales
// FLOWCHART: "choose the scales (Concert), see how they're played with the
// fingering chart; see all notes in the scale next to each other; click a note
// to change its fingering when an alternate exists."
//
// SPEC
//  - Root + scale + Alto/Tenor + Octave controls (concert pitch; the horn's
//    transposing mapping applies here the same as on the translator). Realize
//    exactly ONE octave of the scale — root up to the next occurrence of the
//    root, e.g. root A shows every fingering from A up to the next A — sized
//    to fit without horizontal scrolling. The octave picker matters because a
//    fixed octave (e.g. always starting at octave 4) can land right at or
//    past the top of the horn's range for some roots — root A at octave 4
//    already exceeds an alto's concert ceiling (F5) — so the octave has to be
//    a real, user-adjustable choice, not hardcoded.
//  - Render the scale as an ordered strip of fingering cards, left→right
//    ascending. Each card shows sax (written) notation on TOP and concert
//    pitch on the BOTTOM, using friendly "Variation N" labels — never the raw
//    JSON note id. Clicking a card cycles to that note's alternates.
//  - Reuse rankByMovement so the *sequence* prefers low finger movement.
import { rootPicker } from "../render/controls.js";
import { loadScales, getScale, byCategory, scaleNotes } from "../theory/scales.js";
import { loadFingerings, fingeringsFor, rankByMovement, renderSaxCard, variationLabel } from "../render/sax.js";
import { concertToWrittenMidi, writtenToConcertMidi, midiToName, parseNote } from "../theory/pitch.js";

export async function renderSaxScales(el, ctx) {
  const { state } = ctx;
  const scales = await loadScales();
  const entries = await loadFingerings();
  state.scaleId ??= "major";
  const scale = getScale(scales, state.scaleId);

  // producible concert range for the current instrument, used both to pick a
  // sane default octave and to size the <select> options.
  const producible = entries
    .filter(e => !/-alt\d*$/.test(e.note))
    .map(e => writtenToConcertMidi(e.note, state.instrument));
  const rangeLow = Math.min(...producible), rangeHigh = Math.max(...producible);

  // Sticky across renders (a deliberate octave pick is respected even if it
  // pushes some notes out of range at the edges), but re-picked automatically
  // whenever it's unset OR whenever it's badly wrong for the current root/
  // instrument — e.g. switching root to A while sitting on octave 4 used to
  // silently put the whole scale past the alto's ceiling with no way out
  // except manually hunting for a better octave.
  const rootAtStored = state.saxScaleOctave == null ? null : parseNote(state.root + state.saxScaleOctave).midi;
  const badlyOutOfRange = rootAtStored != null && (rootAtStored < rangeLow - 12 || rootAtStored > rangeHigh + 12);
  if (state.saxScaleOctave == null || badlyOutOfRange) {
    // smart default: whichever octave puts the root closest to the middle
    // of what this instrument can actually play.
    const mid = (rangeLow + rangeHigh) / 2;
    let best = 4, bestDist = Infinity;
    for (let o = 1; o <= 6; o++) {
      const d = Math.abs(parseNote(state.root + o).midi - mid);
      if (d < bestDist) { bestDist = d; best = o; }
    }
    state.saxScaleOctave = best;
  }

  el.innerHTML = `<p class="eyebrow">Saxophone</p><h1>Scales</h1>
    <div class="controls sax-toggle">
      <div class="seg" id="axtog">
        <button aria-pressed="${state.instrument==='alto'}" data-ax="alto">Alto</button>
        <button aria-pressed="${state.instrument==='tenor'}" data-ax="tenor">Tenor</button>
      </div>
    </div>
    <div class="controls" id="ctl"></div>
    <div class="controls">
      <label>Scale <select id="scaleSel"></select></label>
      <label>Octave <select id="octSel"></select></label>
    </div>
    <div class="sax-strip compact" id="strip"></div>`;

  el.querySelector("#axtog").addEventListener("click", e => {
    const ax = e.target.dataset.ax; if (!ax) return;
    state.instrument = ax; renderSaxScales(el, ctx);
  });
  const ctl = el.querySelector("#ctl");
  ctl.append(rootPicker(state, () => renderSaxScales(el, ctx)));
  fillScaleSelect(el.querySelector("#scaleSel"), scales, state, () => renderSaxScales(el, ctx));
  fillOctaveSelect(el.querySelector("#octSel"), state, () => renderSaxScales(el, ctx));

  // exactly one octave: root up to the next occurrence of the root, at the
  // user-chosen octave.
  const rootLow = parseNote(state.root + state.saxScaleOctave).midi;
  const notes = scaleNotes(state.root, scale, rootLow, rootLow + 12);
  const strip = el.querySelector("#strip");
  strip.innerHTML = "";
  if (!notes.length) { strip.innerHTML = `<p class="cap">No notes in this range.</p>`; return; }
  let prevReq = [];
  for (const n of notes) {
    const written = midiToName(concertToWrittenMidi(n.midi, state.instrument));
    const cands = rankByMovement(fingeringsFor(entries, written), prevReq);
    if (!cands.length) { renderOutOfRange(strip, n.name, written); continue; }
    renderCyclingCard(strip, cands, n.name);
    prevReq = cands[0].required; // sequence prefers low movement off the default
  }
}

// One scale note = one card cycling through its alternates on click/tap.
// Written (sax) notation on top, concert pitch on bottom — friendly labels,
// never the raw JSON note id.
function renderCyclingCard(strip, cands, concertName) {
  let i = 0;
  const wrap = document.createElement("div");
  wrap.className = "sax-cycle";
  const cardHost = document.createElement("div");
  const paint = () => {
    cardHost.innerHTML = "";
    renderSaxCard(cardHost, cands[i], {
      isDefault: i === 0,
      topText: variationLabel(cands[i], i, cands.length),
      bottomText: concertName,
    });
    caption.textContent = cands.length > 1 ? "tap to cycle" : "";
  };
  const caption = document.createElement("div");
  caption.className = "cap";
  if (cands.length > 1) {
    wrap.classList.add("has-alts");
    wrap.addEventListener("click", () => { i = (i + 1) % cands.length; paint(); });
  }
  wrap.append(cardHost, caption);
  paint();
  strip.appendChild(wrap);
}

function renderOutOfRange(strip, concertName, written) {
  const ph = document.createElement("div");
  ph.className = "sax-card is-oor";
  ph.innerHTML = `<div class="cap cap-top">${written}</div>
    <div class="sax-oor" aria-hidden="true">—</div>
    <div class="cap">${concertName}<br><span class="cap-sub">out of range</span></div>`;
  strip.appendChild(ph);
}

function fillOctaveSelect(sel, state, onChange) {
  for (let o = 1; o <= 6; o++) {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    if (o === state.saxScaleOctave) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => { state.saxScaleOctave = parseInt(sel.value, 10); onChange(); });
}

function fillScaleSelect(sel, scales, state, onChange) {
  const groups = byCategory(scales);
  for (const [cat, list] of Object.entries(groups)) {
    const og = document.createElement("optgroup"); og.label = cat;
    for (const s of list) {
      const o = document.createElement("option"); o.value = s.id; o.textContent = s.name;
      if (s.id === state.scaleId) o.selected = true; og.appendChild(o);
    }
    sel.appendChild(og);
  }
  sel.addEventListener("change", () => { state.scaleId = sel.value; onChange(); });
}
