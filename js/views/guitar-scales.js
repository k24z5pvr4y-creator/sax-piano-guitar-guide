// guitar-scales.js — Guitar ▸ Scales
// FLOWCHART: "all positions with octave number on notes (e.g. A5, C4); see the
// relationship between the notes on the piano and the guitar; fret numbers on
// the fretboard."
//
// SPEC
//  - Root + scale + octave-range + position (full neck / I–XII) controls.
//  - Render the scale on the 24-fret board; every dot shows full octave label.
//  - PIANO RELATIONSHIP: also render the same scale on a keyboard directly above
//    the fretboard so the shared pitch classes line up — this is the flowchart's
//    "relationship between piano and guitar" feature. Same scalePcs feed both.
import { rootPicker, octaveRangePicker } from "../render/controls.js";
import { loadScales, getScale, byCategory, scalePcs } from "../theory/scales.js";
import { renderFretboard, TUNING, FRETS } from "../render/fretboard.js";
import { renderKeyboard } from "../render/keyboard.js";
import { parseNote } from "../theory/pitch.js";

// The "piano relationship" keyboard is a fixed 2-octave reference (not tied to
// the fretboard's octave-range picker, which needs its own wider range) —
// showing the scale pattern repeat once is enough, and it's not labeled with
// octave numbers since it's illustrating pitch-class relationships, not a
// specific register.
const REL_LOW = parseNote("C4").midi, REL_HIGH = parseNote("B5").midi;

// Octave-picker bounds: the actual range standard tuning + 24 frets can
// produce (open low E to the 24th fret on high E), not a generic 0-8
// piano-style range — the picker used to offer octaves the guitar can't
// physically reach.
const GTR_MIN_OCTAVE = Math.floor(Math.min(...TUNING) / 12) - 1;
const GTR_MAX_OCTAVE = Math.floor((Math.max(...TUNING) + FRETS) / 12) - 1;

export async function renderGuitarScales(el, ctx) {
  const { state } = ctx;
  const scales = await loadScales();
  state.scaleId ??= "major";
  state.position ??= null;
  const scale = getScale(scales, state.scaleId);

  el.innerHTML = `<p class="eyebrow">Guitar</p><h1>Scales</h1>
    <div class="controls" id="ctl"></div>
    <div class="controls">
      <label>Scale <select id="scaleSel"></select></label>
      <label>Position <select id="posSel"></select></label>
      <label><input type="checkbox" id="fullRange" ${state.fretFullRange ? "checked" : ""} /> Show entire fretboard</label>
    </div>
    <h3>Piano relationship</h3>
    <div id="kbwrap"></div>
    <h3 style="margin-top:20px">Fretboard</h3>
    <div id="fbwrap"></div>`;

  const ctl = el.querySelector("#ctl");
  ctl.append(rootPicker(state, () => renderGuitarScales(el, ctx)),
             octaveRangePicker(state, () => renderGuitarScales(el, ctx),
               { minOctave: GTR_MIN_OCTAVE, maxOctave: GTR_MAX_OCTAVE }));
  fillScaleSelect(el.querySelector("#scaleSel"), scales, state, () => renderGuitarScales(el, ctx));
  fillPosSelect(el.querySelector("#posSel"), state, () => renderGuitarScales(el, ctx));
  el.querySelector("#fullRange").addEventListener("change", e => {
    state.fretFullRange = e.target.checked; renderGuitarScales(el, ctx);
  });

  const pcs = new Set(scalePcs(state.root, scale));
  const low = (state.octaveLow + 1) * 12, high = (state.octaveHigh + 1) * 12 + 11;
  const rootPc = parseNote(state.root + "4").pc;

  // Press-sync: a shared set of pressed CONCERT midis. Tapping a keyboard key
  // lights every fret position of that exact pitch (and vice-versa), even when
  // the note is off-scale. Tap again to release. Guitar is concert pitch, so
  // keyboard midi and fret (open+fret) midi share one domain — no transposition.
  state.gtrPressed ??= new Set();
  const pressed = state.gtrPressed;
  const toggle = (midi) => {
    pressed.has(midi) ? pressed.delete(midi) : pressed.add(midi);
    paint();
  };
  const kbHost = el.querySelector("#kbwrap"), fbHost = el.querySelector("#fbwrap");
  function paint() {
    kbHost.innerHTML = ""; fbHost.innerHTML = "";
    renderKeyboard(kbHost, { lowMidi: REL_LOW, highMidi: REL_HIGH, rootPc, scalePcs: pcs,
      pressed, octaveDigits: false, colorByNote: true, onKey: toggle });
    renderFretboard(fbHost, { lowMidi: low, highMidi: high, rootPc, scalePcs: pcs,
      position: state.position, pressed, showRuler: true, colorByNote: true,
      fullRange: !!state.fretFullRange, onFret: toggle });
  }
  paint();
}

function fillScaleSelect(sel, scales, state, onChange) {
  for (const [cat, list] of Object.entries(byCategory(scales))) {
    const og = document.createElement("optgroup"); og.label = cat;
    for (const s of list) { const o = document.createElement("option");
      o.value=s.id; o.textContent=s.name; if (s.id===state.scaleId) o.selected=true; og.appendChild(o); }
    sel.appendChild(og);
  }
  sel.addEventListener("change", () => { state.scaleId = sel.value; onChange(); });
}
function fillPosSelect(sel, state, onChange) {
  const opts = [["", "Full neck"]];
  for (let i=1;i<=12;i++) opts.push([String(i), "Position " + toRoman(i)]);
  for (const [v,t] of opts) { const o=document.createElement("option");
    o.value=v; o.textContent=t; if ((state.position?String(state.position):"")===v) o.selected=true; sel.appendChild(o); }
  sel.addEventListener("change", () => { state.position = sel.value ? parseInt(sel.value,10) : null; onChange(); });
}
const toRoman = n => ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n-1];
