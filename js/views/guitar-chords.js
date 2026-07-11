// guitar-chords.js — Guitar ▸ Chords
// FLOWCHART: "all versions, all frets; chords played on different fret positions;
// see them all when needed."
//
// SPEC (cosmetic doc "Guitar Chords"):
//  - "Chords in scale" vs "All chords" toggle (mirror piano-chords).
//  - Render each chord as a compact, standard chord-BOX diagram (X/O mute·open
//    markers, narrow fret window, finger dots) — NOT a slice of the full
//    24-fret neck, which just shows a dozen empty frets before the shape. Up
//    to 3 playable voicings per chord type, arranged side by side; chord-type
//    cards wrap into a grid instead of stacking one per line or scrolling.
//
// The voicing finder below searches, for a root + chord tone-set, concrete
// playable fingerings across the 24-fret neck: a windowed (≤4-fret hand span)
// per-string search that requires the bass note to be the root, contiguous
// sounded strings, and full chord-tone coverage, then keeps up-to-3 distinct
// positions — the lowest fret the chord is actually playable at, then shapes
// further up the neck.
import { rootPicker } from "../render/controls.js";
import { loadScales, getScale, byCategory, scalePcs } from "../theory/scales.js";
import { loadChords, byTier, chordSymbol, chordNotes, diatonicTriads } from "../theory/chords.js";
import { renderChordBox } from "../render/chordbox.js";
import { TUNING, FRETS } from "../render/fretboard.js";
import { parseNote } from "../theory/pitch.js";

export async function renderGuitarChords(el, ctx) {
  const { state } = ctx;
  const chordData = await loadChords();
  state.chordMode ??= "all";

  el.innerHTML = `<p class="eyebrow">Guitar</p><h1>Chords</h1>
    <div class="controls">
      <div class="seg" id="modeTog">
        <button aria-pressed="${state.chordMode==='inscale'}" data-m="inscale">Chords in scale</button>
        <button aria-pressed="${state.chordMode==='all'}" data-m="all">All chords</button>
      </div>
    </div>
    <div class="controls" id="ctl"></div>
    <div id="out"></div>`;

  el.querySelector("#modeTog").addEventListener("click", e => {
    if (!e.target.dataset.m) return; state.chordMode = e.target.dataset.m; renderGuitarChords(el, ctx);
  });
  const ctl = el.querySelector("#ctl");
  ctl.append(rootPicker(state, () => renderGuitarChords(el, ctx)));

  const out = el.querySelector("#out");
  if (state.chordMode === "all") {
    for (const [tier, chords] of Object.entries(byTier(chordData))) {
      const h = document.createElement("h3"); h.textContent = titleCase(tier); out.appendChild(h);
      const row = document.createElement("div"); row.className = "chord-row"; out.appendChild(row);
      for (const chord of chords) {
        const rootPc = parseNote(state.root + "3").pc;
        const notes = chordNotes(state.root + "3", chord);
        const noteNames = notes.map(n => n.name.replace(/-?\d+$/, ""));
        const chordPcs = new Set(notes.map(n => ((n.midi % 12) + 12) % 12));
        renderChordBlock(row, chordSymbol(state.root, chord), rootPc, chordPcs, noteNames);
      }
    }
  } else {
    const scales = await loadScales();
    state.scaleId ??= "major";
    const lab = document.createElement("label"); lab.textContent = "Scale ";
    const sel = document.createElement("select");
    fillScaleSelect(sel, scales, state, () => renderGuitarChords(el, ctx));
    lab.appendChild(sel); ctl.appendChild(lab);

    const scale = getScale(scales, state.scaleId);
    const triads = diatonicTriads(scalePcs(state.root, scale), state.root + "3");

    const heading = document.createElement("p"); heading.className = "cap";
    heading.textContent = `${state.root} ${scale.name} — diatonic triads.`;
    out.appendChild(heading);
    const row = document.createElement("div"); row.className = "chord-row"; out.appendChild(row);

    triads.forEach(t => {
      const romanLabel = `${t.roman} ${t.rootName.replace(/\d+$/, "")}`;
      const rootPc = parseNote(t.rootName).pc;
      const noteNames = t.notes.map(n => n.name.replace(/-?\d+$/, ""));
      const chordPcs = new Set(t.notes.map(n => ((n.midi % 12) + 12) % 12));
      renderChordBlock(row, romanLabel, rootPc, chordPcs, noteNames);
    });
  }
}

// --- chord block rendering ---------------------------------------------------
// One card per chord type: symbol + note-letter list, then up to 3 concrete
// voicings side by side as compact chord-box diagrams.

function renderChordBlock(host, title, rootPc, chordPcs, noteNames) {
  const block = document.createElement("div"); block.className = "chord-card";
  block.innerHTML = `<h4>${title}</h4><p class="cap">Notes: ${noteNames.join(" – ")}</p>`;
  const voicings = findVoicings(rootPc, chordPcs, 3);
  if (!voicings.length) {
    const p = document.createElement("p"); p.className = "cap";
    p.textContent = "No standard voicing found on the neck.";
    block.appendChild(p);
  }
  const diagrams = document.createElement("div");
  diagrams.className = "chordbox-row";
  voicings.forEach(v => renderChordBox(diagrams, { cells: v.cells, rootPc, label: v.label }));
  block.appendChild(diagrams);
  host.appendChild(block);
}

// --- voicing / shape finder ------------------------------------------------
// TUNING = [64,59,55,50,45,40] -> index 0 = high E, index 5 = low E.

function findVoicings(rootPc, chordPcs, maxResults = 3) {
  const tones = new Set(chordPcs);
  const essentials = pickEssentials(rootPc, tones);
  const fullCoverage = tones.size <= 4; // require every tone only for ≤4-note chords

  // Search the whole practical neck (a 4-fret hand-span window anchored at
  // every possible base fret) so the FIRST result is the lowest fret the
  // chord is actually playable at — not forced to fret 0 — then subsequent
  // results show the shape moving up the neck from there.
  const candidates = [];
  for (let base = 0; base <= FRETS - 3; base++) {
    const v = bestVoicingAt(base, rootPc, tones, essentials, fullCoverage);
    if (v) candidates.push(v);
  }
  // dedupe identical fret signatures
  const seen = new Set();
  const uniq = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    if (seen.has(c.sig)) continue;
    seen.add(c.sig); uniq.push(c);
  }
  // pick up to N distinct positions, greedily from best score, keeping the
  // starting frets at least 2 apart so the results are genuinely different
  // shapes across the neck (the lowest playable position, then higher ones).
  const chosen = [];
  for (const c of uniq) {
    if (chosen.some(x => Math.abs(x.minFret - c.minFret) < 2)) continue;
    chosen.push(c);
    if (chosen.length >= maxResults) break;
  }
  return chosen.sort((a, b) => a.minFret - b.minFret).map(c => ({
    cells: c.cells,
    label: c.minFret === 0 ? "open" : `fret ${c.minFret}`,
  }));
}

// Essentials that must be present for the chord to be recognizable: root, the
// 3rd (or sus 2/4 substitute), and the 7th when the chord has one.
function pickEssentials(rootPc, tones) {
  const iv = pc => ((pc - rootPc) % 12 + 12) % 12;
  const ess = new Set([rootPc]);
  for (const t of tones) {
    const i = iv(t);
    if (i === 3 || i === 4 || i === 2 || i === 5) ess.add(t);   // 3rd / sus color
    if (i === 10 || i === 11) ess.add(t);                        // 7th
  }
  // fall back to including the 5th if the chord is a bare power/triad shape
  if (ess.size < 2) for (const t of tones) if (iv(t) === 7) ess.add(t);
  return ess;
}

function bestVoicingAt(base, rootPc, tones, essentials, fullCoverage) {
  // per-string options: mute (-1), open (0 if chord tone), or a fret in [base,base+3]
  const optionsPerString = TUNING.map(open => {
    const opts = [-1];
    if (tones.has(((open % 12) + 12) % 12)) opts.push(0);        // open string chord tone
    for (let f = Math.max(1, base); f <= base + 3 && f <= FRETS; f++) {
      if (tones.has(((open + f) % 12 + 12) % 12)) opts.push(f);
    }
    return opts;
  });

  let best = null;
  const frets = new Array(6);
  const rec = (s) => {
    if (s === 6) { consider(frets); return; }
    for (const f of optionsPerString[s]) { frets[s] = f; rec(s + 1); }
  };
  const consider = (fr) => {
    const sounded = [];
    for (let s = 0; s < 6; s++) if (fr[s] >= 0) sounded.push(s);
    if (sounded.length < 4) return;
    // contiguous sounded strings (no interior mutes) — cleaner, playable shapes
    const lo = sounded[0], hi = sounded[sounded.length - 1];
    for (let s = lo; s <= hi; s++) if (fr[s] < 0) return;
    // bass note (lowest pitch = highest string index) must be the root
    const bassOpen = TUNING[hi];
    if (((bassOpen + fr[hi]) % 12 + 12) % 12 !== rootPc) return;
    // fret span of fretted notes ≤ 3 (hand span)
    const fretted = sounded.map(s => fr[s]).filter(f => f > 0);
    if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return;
    // coverage
    const soundedPcs = new Set(sounded.map(s => ((TUNING[s] + fr[s]) % 12 + 12) % 12));
    for (const e of essentials) if (!soundedPcs.has(e)) return;
    // NOTE: braces are load-bearing here — without them this is a classic
    // dangling-else bug: the `else` binds to the inner `if`, not the outer
    // `if (fullCoverage)`, silently rejecting every fully-covered triad
    // (soundedPcs.size===3 < 4) even though coverage was actually satisfied.
    if (fullCoverage) { for (const t of tones) if (!soundedPcs.has(t)) return; }
    else if (soundedPcs.size < 4) return;

    const opens = sounded.filter(s => fr[s] === 0).length;
    const mutes = 6 - sounded.length;
    const covered = [...tones].every(t => soundedPcs.has(t));
    const minFret = fretted.length ? Math.min(...fretted) : 0;
    const score = sounded.length + (covered ? 2 : 0) + opens * 0.5 - mutes * 0.5 - base * 0.1;
    if (!best || score > best.score) {
      const cells = new Set();
      for (const s of sounded) cells.add(`${s}:${fr[s]}`);
      best = { score, cells, minFret, sig: fr.join(","), base };
    }
  };
  rec(0);
  return best;
}

// --- helpers ---------------------------------------------------------------

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
