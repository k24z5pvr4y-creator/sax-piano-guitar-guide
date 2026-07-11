// fretboard.js — guitar fretboard renderer.
// STATUS: contract + tuning/pitch math defined; grid render is a working stub
// that needs the 3-notes-per-string position filtering and press-injection.
//
// CONTRACT
//   renderFretboard(container, opts) where opts = {
//     lowMidi, highMidi,        // octave-range window (dots outside are hidden)
//     rootPc, scalePcs: Set,
//     position: null | 1..12,   // null = full neck; else a 3nps position box
//     pressed: Set<number>,     // absolute midi -> inject a press dot even off-scale
//     onFret(midi)
//   }
//
// COSMETIC REQUIREMENTS (cosmetic doc "Guitar"):
//   - 24-fret board. Full-neck view + 3-notes-per-string Position I–XII boxes.
//   - Every dot shows FULL octave label (F#3, not F).
//   - Octave-aware, octave-range-picker-aware, press-sync-aware (exact absolute
//     pitch; inject a press-only dot even when off-scale).
//   - Open strings sit on the nut line.
//
// Standard tuning, 24 frets. String 6 (low E) = E2 (midi 40) ... string 1 = E4 (64).

import { midiToName } from "../theory/pitch.js";
import { noteColor, noteTextColor } from "./noteColors.js";

export const TUNING = [64, 59, 55, 50, 45, 40]; // high-e -> low-E, midi of open strings
export const FRETS = 24;

export function renderFretboard(container, opts) {
  // fullRange: "show entire fretboard" — every chromatic note on every fret,
  // ignoring both the octave-range window AND the current scale's pitch-class
  // filter (not just the window; a scale-only chromatic-looking board was the
  // original bug here).
  const { lowMidi, highMidi, rootPc, scalePcs = new Set(), pressed = new Set(),
          position = null, cells = null, label = null, showRuler = false,
          colorByNote = false, fullRange = false, onFret } = opts;
  const board = document.createElement("div");
  board.className = "fretboard";
  const cols = () => `repeat(${FRETS + 1}, minmax(30px, 1fr))`;

  // Explicit-cells mode (a concrete chord voicing) or 3-notes-per-string
  // position box; either restricts which cells light up. The box/voicing itself
  // defines the octave, so the octave-range window is not applied to it.
  const active = cells || (position ? threeNPS(scalePcs, position) : null); // Set "s:fret"
  if (active) {
    let minFret = FRETS + 1;
    for (const key of active) {
      const f = parseInt(key.split(":")[1], 10);
      if (f > 0) minFret = Math.min(minFret, f);
    }
    const text = label != null ? label
      : (position ? `Position ${toRoman(position)} · starts at fret ${minFret}` : null);
    if (text && (label != null || minFret <= FRETS)) {
      const badge = document.createElement("div");
      badge.className = "fb-fretno";
      badge.textContent = text;
      board.appendChild(badge);
    }
  }
  const box = active;

  // Persistent fret-number ruler (0..24), aligned to the same column template
  // as the string grid below it — separate row, so the string grid always
  // stays exactly 6 rows.
  if (showRuler) {
    const ruler = document.createElement("div");
    ruler.className = "fb-ruler";
    ruler.style.gridTemplateColumns = cols();
    for (let fret = 0; fret <= FRETS; fret++) {
      const cell = document.createElement("div");
      cell.className = "fb-ruler-cell";
      cell.textContent = fret;
      ruler.appendChild(cell);
    }
    board.appendChild(ruler);
  }

  const grid = document.createElement("div");
  grid.className = "fb-grid";
  grid.style.gridTemplateColumns = cols();

  TUNING.forEach((open, s) => {
    for (let fret = 0; fret <= FRETS; fret++) {
      const midi = open + fret;
      const pc = ((midi % 12) + 12) % 12;
      const cell = document.createElement("div");
      cell.className = "fb-cell" + (fret === 0 ? " nut" : "");
      const inWindow = fullRange || (midi >= lowMidi && midi <= highMidi);
      const inScale = box ? box.has(`${s}:${fret}`) : (fullRange || (scalePcs.has(pc) && inWindow));
      const show = inScale || pressed.has(midi);
      if (show) {
        const dot = document.createElement("div");
        const isRoot = pc === rootPc;
        dot.className = "fb-dot"
          + (isRoot && !colorByNote ? " is-root" : "")
          + (isRoot && colorByNote ? " is-root-ring" : "")
          + (pressed.has(midi) && !inScale ? " is-press" : "");
        if (colorByNote) {
          dot.style.backgroundColor = noteColor(pc);
          dot.style.color = noteTextColor(pc);
        }
        dot.textContent = midiToName(midi);          // FULL octave label
        if (onFret) dot.addEventListener("click", () => onFret(midi));
        cell.appendChild(dot);
      }
      grid.appendChild(cell);
    }
  });
  board.appendChild(grid);
  container.appendChild(board);
  return board;
}

// 3-notes-per-string position box: from the low E string up, take three
// consecutive scale tones per string starting near `startFret`, advancing the
// anchor so the shape stays compact (with the standard +1 shift onto the B
// string, which is tuned a major 3rd rather than a 4th). Returns a Set of
// "stringIndex:fret" cells.
function threeNPS(scalePcs, startFret) {
  const picks = new Set();
  let anchor = startFret;
  for (let s = TUNING.length - 1; s >= 0; s--) {   // low E (index 5) -> high E (0)
    const open = TUNING[s];
    const frets = [];
    for (let f = 0; f <= FRETS; f++) {
      if (scalePcs.has(((open + f) % 12 + 12) % 12)) frets.push(f);
    }
    if (!frets.length) continue;
    let start = frets.findIndex(f => f >= anchor);
    if (start < 0) start = Math.max(0, frets.length - 3);
    const three = frets.slice(start, start + 3);
    for (const f of three) picks.add(`${s}:${f}`);
    if (three.length) {
      anchor = three[0];
      if (s - 1 === 1) anchor += 1; // next string is B: shift the box up one fret
    }
  }
  return picks;
}

const toRoman = n => ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n - 1] || String(n);
