// piano-chords.js — Piano ▸ Chords
// FLOWCHART: two sub-branches —
//  "Chords in Scales": like the sax fingering chart; display the chord scale.
//  "Chord Variations": pick a note, see ALL its chord types triad→most complex.
//
// SPEC (cosmetic doc "Chords"):
//  - Toggle "Chords in scale" (diatonic TRIADS, Roman-numeral) vs "All chords"
//    (full dictionary, root-driven, scale-independent).
//  - One mini-keyboard per chord, ROOT POSITION ONLY (no inversions), starting
//    at C on a single fixed octave — no horizontal scrolling. Since a wide
//    chord (e.g. a 13th) can't fit its literal register spread in 12 semitones,
//    every card shows the chord's PITCH-CLASS set within that one octave
//    (deep-orange root, light-orange the rest) — the same convention already
//    used for scale display, just applied to chord tones.
//  - Sharps only.
import { rootPicker } from "../render/controls.js";
import { loadScales, getScale, byCategory, scalePcs } from "../theory/scales.js";
import { loadChords, byTier, chordSymbol, diatonicTriads } from "../theory/chords.js";
import { renderKeyboard } from "../render/keyboard.js";
import { parseNote, pcSet } from "../theory/pitch.js";

const WIN_LOW = parseNote("C4").midi, WIN_HIGH = parseNote("B4").midi; // one octave, starts at C

export async function renderPianoChords(el, ctx) {
  const { state } = ctx;
  const chordData = await loadChords();
  state.chordMode ??= "all"; // 'inscale' | 'all'

  el.innerHTML = `<p class="eyebrow">Piano</p><h1>Chords</h1>
    <div class="controls">
      <div class="seg" id="modeTog">
        <button aria-pressed="${state.chordMode==='inscale'}" data-m="inscale">Chords in scale</button>
        <button aria-pressed="${state.chordMode==='all'}" data-m="all">All chords</button>
      </div>
    </div>
    <div class="controls" id="ctl"></div>
    <div id="out"></div>`;

  el.querySelector("#modeTog").addEventListener("click", e => {
    if (!e.target.dataset.m) return; state.chordMode = e.target.dataset.m; renderPianoChords(el, ctx);
  });
  const ctl = el.querySelector("#ctl");
  ctl.append(rootPicker(state, () => renderPianoChords(el, ctx)));
  if (state.chordMode === "inscale") {
    const scales = await loadScales();
    state.scaleId ??= "major";
    const lab = document.createElement("label");
    lab.textContent = "Scale ";
    const sel = document.createElement("select");
    fillScaleSelect(sel, scales, state, () => renderPianoChords(el, ctx));
    lab.appendChild(sel);
    ctl.appendChild(lab);
  }

  const out = el.querySelector("#out");
  const rootPc = parseNote(state.root).pc;
  if (state.chordMode === "all") {
    // full dictionary grouped by tier, one card per chord, root position only
    for (const [tier, chords] of Object.entries(byTier(chordData))) {
      const h = document.createElement("h3"); h.textContent = titleCase(tier); out.appendChild(h);
      const row = document.createElement("div"); row.className = "chord-row"; out.appendChild(row);
      for (const chord of chords) {
        const card = document.createElement("div"); card.className = "chord-card chord-card-piano";
        card.innerHTML = `<h4>${chordSymbol(state.root, chord)}</h4>`;
        renderKeyboard(card, { lowMidi: WIN_LOW, highMidi: WIN_HIGH, rootPc,
          scalePcs: new Set(pcSet(rootPc, chord.intervals)), pressed: new Set() });
        row.appendChild(card);
      }
    }
  } else {
    // "Chords in scale": diatonic triad per degree, Roman-numeral labeled.
    const scales = await loadScales();
    const scale = getScale(scales, state.scaleId);
    const triads = diatonicTriads(scalePcs(state.root, scale), state.root + "4");

    const heading = document.createElement("p"); heading.className = "cap";
    heading.textContent = `${state.root} ${scale.name} — diatonic triads.`;
    out.appendChild(heading);
    const row = document.createElement("div"); row.className = "chord-row"; out.appendChild(row);

    triads.forEach(t => {
      const degRootPc = parseNote(t.rootName).pc;
      const card = document.createElement("div"); card.className = "chord-card chord-card-piano";
      card.innerHTML = `<h4><span class="roman">${t.roman}</span> ${t.rootName.replace(/\d+$/, "")}</h4>`;
      renderKeyboard(card, { lowMidi: WIN_LOW, highMidi: WIN_HIGH, rootPc: degRootPc,
        scalePcs: new Set(t.notes.map(n => ((n.midi % 12) + 12) % 12)), pressed: new Set() });
      row.appendChild(card);
    });
  }
}

function fillScaleSelect(sel, scales, state, onChange) {
  for (const [cat, list] of Object.entries(byCategory(scales))) {
    const og = document.createElement("optgroup"); og.label = cat;
    for (const s of list) { const o = document.createElement("option");
      o.value = s.id; o.textContent = s.name; if (s.id === state.scaleId) o.selected = true; og.appendChild(o); }
    sel.appendChild(og);
  }
  sel.addEventListener("change", () => { state.scaleId = sel.value; onChange(); });
}
const titleCase = s => s.charAt(0).toUpperCase() + s.slice(1);
