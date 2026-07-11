// pitch.js — foundational pitch utilities shared by every module.
// Pure functions, no DOM. Scientific pitch notation (C4 = middle C = MIDI 60).
// This file is intentionally complete: scales, chords, and all three renderers
// build on top of these primitives, so keep it stable.

const SHARP_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_NAMES  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

// --- name <-> pitch class / midi ------------------------------------------

// Parse "F#3", "Bb5", "C4" -> { pc: 0-11, octave: int, midi: int }.
// The octave is optional: a bare pitch name like "C" or "F#" defaults to
// octave 4, so callers that only care about the pitch class (scale/chord
// membership) can pass the root letter straight from the picker.
export function parseNote(name) {
  const m = /^([A-G])([#b]?)(-?\d+)?$/.exec(name.trim());
  if (!m) throw new Error(`Bad note name: ${name}`);
  const [, letter, accidental, octStr] = m;
  const base = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }[letter];
  const pc = (base + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0) + 12) % 12;
  const octave = octStr === undefined ? 4 : parseInt(octStr, 10);
  const midi = (octave + 1) * 12 + pc;
  return { pc, octave, midi };
}

// MIDI -> name. spelling: "sharp" (default) or "flat".
export function midiToName(midi, spelling = "sharp") {
  const table = spelling === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${table[pc]}${octave}`;
}

export function noteToMidi(name) { return parseNote(name).midi; }

// --- transposition ---------------------------------------------------------
// The saxophone is a transposing instrument. Alto = Eb (written sounds -9
// semitones), Tenor = Bb (written sounds -14 semitones). The fingering JSON is
// in WRITTEN pitch; the piano/guitar and the "concert" scale picker are in
// CONCERT pitch. Convert at the boundary, never inside a renderer.

export const TRANSPOSE = { alto: -9, tenor: -14 };

// written sax note -> concert sounding midi
export function writtenToConcertMidi(writtenName, instrument = "alto") {
  return noteToMidi(writtenName) + TRANSPOSE[instrument];
}
// concert midi -> written sax midi (what the player fingers)
export function concertToWrittenMidi(concertMidi, instrument = "alto") {
  return concertMidi - TRANSPOSE[instrument];
}

// --- helpers ---------------------------------------------------------------

// Build the pitch-class set for a root + interval formula.
export function pcSet(rootPc, intervals) {
  return intervals.map(i => ((rootPc + i) % 12 + 12) % 12);
}

// Expand a root note name + intervals into concrete note names across a MIDI
// window [lowMidi, highMidi]. Used to light up keys/frets/fingerings.
export function realizeNotes(rootName, intervals, lowMidi, highMidi, spelling = "sharp") {
  const set = new Set(pcSet(parseNote(rootName).pc, intervals));
  const out = [];
  for (let m = lowMidi; m <= highMidi; m++) {
    if (set.has(((m % 12) + 12) % 12)) out.push({ midi: m, name: midiToName(m, spelling) });
  }
  return out;
}

export const CHROMATIC_SHARP = SHARP_NAMES;
export const CHROMATIC_FLAT = FLAT_NAMES;
