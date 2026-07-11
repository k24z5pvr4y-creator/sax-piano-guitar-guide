// noteColors.js — per-letter color scheme for the Guitar ▸ Scales view only.
// Every natural note (C D E F G A B) gets its own distinct hue; each sharp
// gets a faded (lightened) version of the natural it's a sharp OF — C# is a
// faded C, not a faded D — matching how the sharps are spelled everywhere
// else in the app. Not used anywhere but the guitar fretboard + the piano
// relationship keyboard above it; every other view keeps the orange
// root/scale-tone convention.
//
// Base palette is Okabe-Ito (colorblind-safe, chosen by the user).

const BASE = {
  0: "#D55E00",  // C
  2: "#E69F00",  // D
  4: "#009E73",  // E — swapped with F
  5: "#F0E442",  // F — swapped with E
  7: "#56B4E9",  // G
  9: "#0072B2",  // A
  11: "#CC79A7", // B
};
// sharp pitch class -> the natural pitch class it fades from
const FADES_FROM = { 1: 0, 3: 2, 6: 5, 8: 7, 10: 9 };
const FADED = {
  0: "#f7c7a1",  // C#
  2: "#f7dda1",  // D#
  5: "#f1eca7",  // F# — re-derived from F's new (yellow) base after the swap
  7: "#abd5ed",  // G#
  9: "#a1d8f7",  // A#
};

export function noteColor(pc) {
  const p = ((pc % 12) + 12) % 12;
  return BASE[p] ?? FADED[FADES_FROM[p]];
}

// Text color is picked by actual contrast against the fill, not a blanket
// "naturals get white / sharps get dark" assumption — this palette's yellows
// and light blues (E, D, G) fail contrast badly with white (as low as 1.3:1
// for E) despite being "base" colors, unlike the old palette where every
// base happened to be dark enough for white text.
function relLuminance(hex) {
  const c = hex.slice(1).match(/../g).map(h => parseInt(h, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(hexA, hexB) {
  const lA = relLuminance(hexA), lB = relLuminance(hexB);
  const lighter = Math.max(lA, lB), darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}
export function noteTextColor(pc) {
  const bg = noteColor(((pc % 12) + 12) % 12);
  return contrastRatio(bg, "#ffffff") >= contrastRatio(bg, "#1c1a17") ? "#ffffff" : "#1c1a17";
}
