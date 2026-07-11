// sax-scales.js — Saxophone ▸ Scales
// FLOWCHART: "choose the scales (Concert), see how they're played with the
// fingering chart; see all notes in the scale next to each other; click a note
// to change its fingering when an alternate exists."
//
// SPEC
//  - Root + scale + Alto/Tenor + Octave + Octaves-shown controls (concert
//    pitch; the horn's transposing mapping applies here the same as on the
//    translator). Realizes ONE octave of the scale per row — root up to the
//    next occurrence of the root, e.g. root A shows every fingering from A up
//    to the next A — sized to fit without horizontal scrolling; "Octaves
//    shown" stacks that many consecutive one-octave rows, each on its own
//    line, starting at the picked octave. The Octave picker matters because a
//    fixed octave (e.g. always starting at octave 4) can land right at or
//    past the top of the horn's range for some roots — root A at octave 4
//    already exceeds an alto's concert ceiling (F5) — so the octave has to be
//    a real, user-adjustable choice, not hardcoded. Octaves-shown matters for
//    the SAME reason from the other direction: a single one-octave window's
//    start point is tied to (root, octave), so for many roots even the
//    lowest selectable octave still doesn't reach the instrument's true
//    bottom notes (e.g. root A at the lowest alto octave starts at concert
//    A2, never touching written A2-F3 down at concert C2-G#2, even though
//    those fingerings exist and are correct) — stacking multiple octaves
//    makes the union of what's visible cover more of the real range
//    regardless of which root is selected, instead of only ever showing a
//    single reachable slice.
//  - Render each octave as an ordered strip of fingering cards, left→right
//    ascending. Each card shows sax (written) notation on TOP and concert
//    pitch on the BOTTOM, using friendly "Variation N" labels — never the raw
//    JSON note id. Clicking a card cycles to that note's alternates.
//  - Reuse rankByMovement so the *sequence* prefers low finger movement,
//    continuing the movement-cost chain across octave rows.
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
  // Octave-select bounds: the actual octave numbers this instrument can
  // produce (alto: 2-5, tenor: 1-5), not an arbitrary fixed guess — a picker
  // that let you choose an octave the horn can't play (e.g. alto's nonexistent
  // octave 6) just filled the whole strip with "out of range" placeholders.
  const octLow = Math.floor(rangeLow / 12) - 1, octHigh = Math.floor(rangeHigh / 12) - 1;

  // Sticky across renders (a deliberate octave pick is respected even if it
  // pushes some notes out of range at the edges), but re-picked automatically
  // whenever it's unset OR whenever it's badly wrong for the current root/
  // instrument — e.g. switching root to A while sitting on octave 4 used to
  // silently put the whole scale past the alto's ceiling with no way out
  // except manually hunting for a better octave.
  const rootAtStored = state.saxScaleOctave == null ? null : parseNote(state.root + state.saxScaleOctave).midi;
  const badlyOutOfRange = rootAtStored != null &&
    (rootAtStored < rangeLow - 12 || rootAtStored > rangeHigh + 12 ||
     state.saxScaleOctave < octLow || state.saxScaleOctave > octHigh);
  if (state.saxScaleOctave == null || badlyOutOfRange) {
    // smart default: whichever octave puts the root closest to the middle
    // of what this instrument can actually play.
    const mid = (rangeLow + rangeHigh) / 2;
    let best = octLow, bestDist = Infinity;
    for (let o = octLow; o <= octHigh; o++) {
      const d = Math.abs(parseNote(state.root + o).midi - mid);
      if (d < bestDist) { bestDist = d; best = o; }
    }
    state.saxScaleOctave = best;
  }

  // How many consecutive one-octave rows to stack, starting at
  // saxScaleOctave. Capped to how many octave slots this instrument actually
  // has (octHigh - octLow + 1) — offering "show 8 octaves" on a horn with 4
  // octaves of range would just mean the extra rows are entirely
  // out-of-range placeholders.
  const maxCount = octHigh - octLow + 1;
  state.saxOctaveCount ??= 1;
  if (state.saxOctaveCount > maxCount) state.saxOctaveCount = maxCount;

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
      <label>Octaves shown <select id="octCountSel"></select></label>
    </div>
    <div id="strips"></div>`;

  el.querySelector("#axtog").addEventListener("click", e => {
    const ax = e.target.dataset.ax; if (!ax) return;
    state.instrument = ax; renderSaxScales(el, ctx);
  });
  const ctl = el.querySelector("#ctl");
  ctl.append(rootPicker(state, () => renderSaxScales(el, ctx)));
  fillScaleSelect(el.querySelector("#scaleSel"), scales, state, () => renderSaxScales(el, ctx));
  fillOctaveSelect(el.querySelector("#octSel"), state, octLow, octHigh, () => renderSaxScales(el, ctx));
  fillOctaveCountSelect(el.querySelector("#octCountSel"), state, maxCount, () => renderSaxScales(el, ctx));

  // One octave per row — root up to the next occurrence of the root — with
  // "Octaves shown" stacking that many rows, each its own line, starting at
  // the picked octave and moving upward.
  const strips = el.querySelector("#strips");
  strips.innerHTML = "";
  let prevReq = [];
  for (let i = 0; i < state.saxOctaveCount; i++) {
    const rowOctave = state.saxScaleOctave + i;
    const rootLow = parseNote(state.root + rowOctave).midi;
    const notes = scaleNotes(state.root, scale, rootLow, rootLow + 12);
    if (!notes.length) continue;

    if (state.saxOctaveCount > 1) {
      const heading = document.createElement("p");
      heading.className = "cap";
      heading.style.margin = i === 0 ? "0 0 4px" : "16px 0 4px";
      heading.textContent = `Octave ${rowOctave}`;
      strips.appendChild(heading);
    }
    const strip = document.createElement("div");
    strip.className = "sax-strip compact";
    strips.appendChild(strip);
    for (const n of notes) {
      const written = midiToName(concertToWrittenMidi(n.midi, state.instrument));
      const cands = rankByMovement(fingeringsFor(entries, written), prevReq);
      if (!cands.length) { renderOutOfRange(strip, n.name, written); continue; }
      renderCyclingCard(strip, cands, n.name);
      prevReq = cands[0].required; // sequence prefers low movement off the default, across rows too
    }
  }
  if (!strips.children.length) strips.innerHTML = `<p class="cap">No notes in this range.</p>`;
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

function fillOctaveSelect(sel, state, octLow, octHigh, onChange) {
  for (let o = octLow; o <= octHigh; o++) {
    const opt = document.createElement("option");
    opt.value = o; opt.textContent = o;
    if (o === state.saxScaleOctave) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => { state.saxScaleOctave = parseInt(sel.value, 10); onChange(); });
}

function fillOctaveCountSelect(sel, state, maxCount, onChange) {
  for (let n = 1; n <= maxCount; n++) {
    const opt = document.createElement("option");
    opt.value = n; opt.textContent = n;
    if (n === state.saxOctaveCount) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => { state.saxOctaveCount = parseInt(sel.value, 10); onChange(); });
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
