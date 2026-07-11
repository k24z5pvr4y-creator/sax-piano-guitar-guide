// chords.js — chord engine. Pure logic over data/chords.json.
import { parseNote, midiToName, noteToMidi } from "./pitch.js";

let _data = null;
export async function loadChords() {
  if (_data) return _data;
  const res = await fetch("./data/chords.json");
  _data = await res.json();
  return _data;
}

export function chordById(data, id) { return data.chords.find(c => c.id === id); }
export function coreChords(data) { return data.chords.filter(c => c.core); }
export function byTier(data) {
  const t = {};
  for (const c of data.chords) (t[c.tier] ??= []).push(c);
  return t;
}

// Absolute chord tones for root + chord definition, voiced up from a base midi.
// rootName e.g. "C4". Returns [{midi,name}], root-position (inversion 0).
export function chordNotes(rootName, chord, spelling = "sharp") {
  const rootMidi = noteToMidi(rootName);
  return chord.intervals.map(i => ({ midi: rootMidi + i, name: midiToName(rootMidi + i, spelling) }));
}

// Apply an inversion: move the lowest n notes up an octave.
export function invert(notes, inversion, spelling = "sharp") {
  const v = notes.map(n => n.midi).sort((a, b) => a - b);
  for (let k = 0; k < inversion; k++) v.push(v.shift() + 12);
  return v.sort((a, b) => a - b).map(m => ({ midi: m, name: midiToName(m, spelling) }));
}

export function inversionCount(chord) { return chord.intervals.length; }

// Full symbol, e.g. root "C" + maj7 => "Cmaj7".
export function chordSymbol(rootLetterName, chord) { return `${rootLetterName}${chord.symbol}`; }

// --- Diatonic chords in a scale -------------------------------------------
// For the seven-note diatonic scales we have explicit seventh qualities in
// chords.json (diatonic_seventh_qualities). For non-diatonic scales
// (pentatonic/symmetric/bebop) stack thirds *within the scale* instead.
const ROMAN = ["I","II","III","IV","V","VI","VII"];

// Triad quality from the root->3rd and root->5th interval in semitones —
// covers every quality the every-other-scale-tone stack in diatonicTriads
// can actually produce, across 7-note diatonic scales (maj/min/dim/aug) and
// non-heptatonic scales (pentatonic stacks land on sus2/sus4). Anything else
// (whole-tone/symmetric scales can stack oddities) falls back to a bare
// major-shaped label rather than guessing.
function triadQuality(thirdIv, fifthIv) {
  if (thirdIv === 4 && fifthIv === 7) return { suffix: "",     roman: "upper"    }; // major
  if (thirdIv === 3 && fifthIv === 7) return { suffix: "m",    roman: "lower"    }; // minor
  if (thirdIv === 3 && fifthIv === 6) return { suffix: "dim",  roman: "lowerDim" }; // diminished
  if (thirdIv === 4 && fifthIv === 8) return { suffix: "aug",  roman: "upperAug" }; // augmented
  if (thirdIv === 2 && fifthIv === 7) return { suffix: "sus2", roman: "upper"    };
  if (thirdIv === 5 && fifthIv === 7) return { suffix: "sus4", roman: "upper"    };
  return { suffix: "", roman: "upper" };
}
function formatRoman(base, roman) {
  if (roman === "lower") return base.toLowerCase();
  if (roman === "lowerDim") return base.toLowerCase() + "°";
  if (roman === "upperAug") return base + "+";
  return base;
}

// Simple diatonic triads: stack every-other scale tone (root, +2 steps, +4
// steps) for each degree. Works for any scale length (not just 7-note
// diatonic scales) since it only needs the ordered pitch-class list, not a
// quality dictionary — this is the "quick reference" triad list, independent
// of diatonicChords()'s richer (7th-chord) analysis below.
export function diatonicTriads(orderedPcs, rootName, spelling = "sharp") {
  const n = orderedPcs.length;
  const rootMidi = parseNote(rootName).midi;
  // unroll the pc pattern into ascending absolute midi tones, several octaves
  // deep, so any degree's +4-step lookup is always in range.
  const tones = [];
  let prev = rootMidi - 1;
  for (let rep = 0; rep < 3; rep++) {
    for (const pc of orderedPcs) {
      let m = prev + 1;
      while (((m % 12) + 12) % 12 !== pc) m++;
      tones.push(m);
      prev = m;
    }
  }
  const out = [];
  for (let deg = 0; deg < n; deg++) {
    const chordTones = [deg, deg + 2, deg + 4].map(i => tones[i]);
    const thirdIv = ((chordTones[1] - chordTones[0]) % 12 + 12) % 12;
    const fifthIv = ((chordTones[2] - chordTones[0]) % 12 + 12) % 12;
    const q = triadQuality(thirdIv, fifthIv);
    const baseRoman = ROMAN[deg] ?? String(deg + 1);
    out.push({
      degree: deg,
      roman: formatRoman(baseRoman, q.roman),
      qualitySuffix: q.suffix,
      rootName: midiToName(chordTones[0], spelling),
      notes: chordTones.map(m => ({ midi: m, name: midiToName(m, spelling) })),
    });
  }
  return out;
}

export function diatonicChords(data, scaleId, scalePcs, rootName, spelling = "sharp") {
  const qualities = data.diatonic_seventh_qualities[scaleId];
  const rootOct = parseNote(rootName).octave;
  return scalePcs.map((pc, deg) => {
    // build a readable root name for this degree at/around the chosen octave
    const degRootMidi = ((pc - parseNote(rootName).pc + 12) % 12) + (rootOct + 1) * 12 + parseNote(rootName).pc;
    const degRootName = midiToName(degRootMidi, spelling);
    const chord = qualities ? chordById(data, qualities[deg]) : null;
    return {
      degree: deg,
      roman: ROMAN[deg],
      rootName: degRootName,
      chord, // null => caller should stack scale-thirds manually
    };
  });
}
