// piano-scales.js — Piano ▸ Scales
// FLOWCHART: "all possible scales, choose octave span; mention which chords can
// be played in that scale WITHOUT displaying them, but clicking the text (e.g.
// 'Am') displays how that chord looks."
//
// SPEC
//  - Root + scale controls. Render scale on a fixed 2-octave keyboard, no
//    octave-range picker and no per-key octave label (the C-key text) — the
//    pattern repeats identically each octave, so showing two is enough to see
//    the repeat without the clutter of a printed octave number on every C.
//  - Below: a text list of diatonic TRIADS for the scale (Roman numeral +
//    symbol), NOT rendered by default. Clicking one renders that triad, also
//    within the same 2-octave window.
//  - Sharps only: the app standardizes on sharp spelling everywhere.
import { rootPicker } from "../render/controls.js";
import { loadScales, getScale, byCategory, scalePcs } from "../theory/scales.js";
import { diatonicTriads } from "../theory/chords.js";
import { renderKeyboard } from "../render/keyboard.js";
import { parseNote } from "../theory/pitch.js";

const WIN_LOW = parseNote("C4").midi, WIN_HIGH = parseNote("B5").midi; // two octaves

export async function renderPianoScales(el, ctx) {
  const { state } = ctx;
  const scales = await loadScales();
  state.scaleId ??= "major";
  const scale = getScale(scales, state.scaleId);

  el.innerHTML = `<p class="eyebrow">Piano</p><h1>Scales</h1>
    <div class="controls" id="ctl"></div>
    <div class="controls"><label>Scale <select id="scaleSel"></select></label></div>
    <div id="kbwrap"></div>
    <h3 style="margin-top:24px">Triads in this scale</h3>
    <p class="cap">Tap a chord to show it on the keyboard.</p>
    <div class="chord-row" id="chordList"></div>
    <div id="chordView"></div>`;

  const ctl = el.querySelector("#ctl");
  ctl.append(rootPicker(state, () => renderPianoScales(el, ctx)));
  fillScaleSelect(el.querySelector("#scaleSel"), scales, state, () => renderPianoScales(el, ctx));

  const pcs = new Set(scalePcs(state.root, scale));
  renderKeyboard(el.querySelector("#kbwrap"), {
    lowMidi: WIN_LOW, highMidi: WIN_HIGH, rootPc: parseNote(state.root).pc,
    scalePcs: pcs, pressed: new Set(), showCLabel: false
  });

  // diatonic triad list as clickable text (no render until clicked)
  const list = el.querySelector("#chordList");
  const triads = diatonicTriads(scalePcs(state.root, scale), state.root + "4");
  triads.forEach(t => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="roman">${t.roman}</span> ${t.rootName.replace(/\d+$/, "")}`;
    b.addEventListener("click", () => {
      const view = el.querySelector("#chordView"); view.innerHTML = "";
      renderKeyboard(view, {
        lowMidi: WIN_LOW, highMidi: WIN_HIGH,
        rootPc: parseNote(t.rootName).pc,
        scalePcs: new Set(t.notes.map(n => ((n.midi % 12) + 12) % 12)), pressed: new Set(),
        showCLabel: false
      });
    });
    list.appendChild(b);
  });
}

function fillScaleSelect(sel, scales, state, onChange) {
  for (const [cat, list] of Object.entries(byCategory(scales))) {
    const og = document.createElement("optgroup"); og.label = cat;
    for (const s of list) { const o = document.createElement("option");
      o.value = s.id; o.textContent = s.name; if (s.id===state.scaleId) o.selected=true; og.appendChild(o); }
    sel.appendChild(og);
  }
  sel.addEventListener("change", () => { state.scaleId = sel.value; onChange(); });
}
