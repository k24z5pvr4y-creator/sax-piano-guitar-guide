// scales.js — scale engine. Pure logic over data/scales.json.
import { realizeNotes, pcSet, parseNote } from "./pitch.js";

let _scales = null;
export async function loadScales() {
  if (_scales) return _scales;
  const res = await fetch("./data/scales.json");
  _scales = (await res.json()).scales;
  return _scales;
}

export function byCategory(scales) {
  const groups = {};
  for (const s of scales) (groups[s.category] ??= []).push(s);
  return groups;
}

export function getScale(scales, id) {
  return scales.find(s => s.id === id);
}

// Ordered scale-tone pitch classes for a root (root first).
export function scalePcs(rootName, scale) {
  return pcSet(parseNote(rootName).pc, scale.intervals);
}

// Concrete scale notes across a midi window (for keyboard/fret/sax lighting).
export function scaleNotes(rootName, scale, lowMidi, highMidi, spelling = "sharp") {
  return realizeNotes(rootName, scale.intervals, lowMidi, highMidi, spelling);
}
