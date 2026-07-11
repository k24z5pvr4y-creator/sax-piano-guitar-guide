// noteColors.js — per-letter color scheme for the Guitar ▸ Scales view only.
// Every natural note (C D E F G A B) gets its own distinct hue; each sharp
// gets a faded (lightened) version of the natural it's a sharp OF — C# is a
// faded C, not a faded D — matching how the sharps are spelled everywhere
// else in the app. Not used anywhere but the guitar fretboard + the piano
// relationship keyboard above it; every other view keeps the orange
// root/scale-tone convention.

const BASE = {
  0: "#c0392b",  // C
  2: "#c87f0a",  // D
  4: "#a68b0a",  // E
  5: "#1e8449",  // F
  7: "#2471a3",  // G
  9: "#7d3c98",  // A
  11: "#bf2290", // B — was #c2185b, a raspberry-red only ~29° of hue away from
                 // C's brick red (they read as near-identical at a glance);
                 // shifted toward fuchsia/magenta for clear separation from
                 // both C and A.
};
// sharp pitch class -> the natural pitch class it fades from
const FADES_FROM = { 1: 0, 3: 2, 6: 5, 8: 7, 10: 9 };
const FADED = {
  0: "#e3a6a0",  // C#
  2: "#e6c591",  // D#
  5: "#9ac8ad",  // F#
  7: "#9cbfd6",  // G#
  9: "#c4a7d1",  // A#
};

export function noteColor(pc) {
  const p = ((pc % 12) + 12) % 12;
  return BASE[p] ?? FADED[FADES_FROM[p]];
}

// naturals are saturated enough for white text; faded sharps are pale and
// need dark text to stay readable.
export function noteTextColor(pc) {
  const p = ((pc % 12) + 12) % 12;
  return BASE[p] ? "#ffffff" : "#1c1a17";
}
