// chordbox.js — compact guitar chord-diagram renderer.
// STATUS: replaces the earlier approach of reusing the full 24-fret
// renderFretboard for chords, which showed a mostly-empty horizontal strip
// with the actual shape buried a dozen empty frets in. Guitar chords are
// conventionally read as a small vertical "box": a handful of frets (not the
// whole neck), string order low-E-to-high-e left to right, X/O markers for
// muted/open strings, and finger dots labeled with the note letter.
//
// CONTRACT
//   renderChordBox(container, { cells, rootPc, label }) where
//     cells:  Set<"stringIndex:fret">  (stringIndex 0 = high e … 5 = low E,
//             same convention as fretboard.js/TUNING) — one concrete voicing.
//     rootPc: pitch class of the chord root -> highlighted dot.
//     label:  optional caption under the box (e.g. "open", "fret 5").
import { midiToName } from "../theory/pitch.js";
import { TUNING } from "./fretboard.js";

const STRING_ORDER = [5, 4, 3, 2, 1, 0]; // low E -> high e, left to right (standard reading)
const NUM_FRETS = 4;                     // box height: 4 frets is enough for any hand-span shape

export function renderChordBox(container, { cells, rootPc, label = null }) {
  const box = document.createElement("div");
  box.className = "chordbox";

  const perString = new Array(6).fill(null); // null = muted
  for (const c of cells) {
    const [s, f] = c.split(":").map(Number);
    perString[s] = f;
  }

  const fretted = perString.filter(f => f != null && f > 0);
  const minFretted = fretted.length ? Math.min(...fretted) : 0;
  const nutted = minFretted <= 1;         // open position: box starts right at the nut
  const startFret = nutted ? 1 : minFretted;

  // X / O marker row (muted / open), one per string, above the grid.
  const markers = document.createElement("div");
  markers.className = "cbox-markers";
  for (const s of STRING_ORDER) {
    const m = document.createElement("div");
    m.className = "cbox-marker";
    if (perString[s] == null) { m.textContent = "×"; m.classList.add("is-mute"); }
    else if (perString[s] === 0) { m.textContent = "○"; m.classList.add("is-open"); }
    markers.appendChild(m);
  }
  box.appendChild(markers);

  const gridWrap = document.createElement("div");
  gridWrap.className = "cbox-gridwrap";
  if (!nutted) {
    const lbl = document.createElement("div");
    lbl.className = "cbox-startfret";
    lbl.textContent = `${startFret}fr`;
    gridWrap.appendChild(lbl);
  }

  const grid = document.createElement("div");
  grid.className = "cbox-grid" + (nutted ? " is-nut" : "");
  grid.style.gridTemplateColumns = "repeat(6, 1fr)";
  grid.style.gridTemplateRows = `repeat(${NUM_FRETS}, 1fr)`;

  for (let row = 0; row < NUM_FRETS; row++) {
    const fret = startFret + row;
    for (const s of STRING_ORDER) {
      const cell = document.createElement("div");
      cell.className = "cbox-cell";
      if (perString[s] === fret) {
        const pc = ((TUNING[s] + fret) % 12 + 12) % 12;
        const dot = document.createElement("div");
        dot.className = "cbox-dot" + (pc === rootPc ? " is-root" : "");
        dot.textContent = midiToName(TUNING[s] + fret, "sharp").replace(/-?\d+$/, "");
        cell.appendChild(dot);
      }
      grid.appendChild(cell);
    }
  }
  gridWrap.appendChild(grid);
  box.appendChild(gridWrap);

  if (label) {
    const cap = document.createElement("div");
    cap.className = "cbox-caption cap";
    cap.textContent = label;
    box.appendChild(cap);
  }

  container.appendChild(box);
  return box;
}
