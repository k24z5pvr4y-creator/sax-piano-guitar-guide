// sax.js — saxophone fingering renderer.
// STATUS: data-lookup + movement-cost skeleton working; image rendering is a
// stub because it depends on the PRE-RENDERED flood-filled PNGs (not live SVG).
//
// CONTRACT
//   loadFingerings()                      -> Promise<entries[]>
//   fingeringsFor(entries, writtenName)   -> [{note, required[], optional[]}]  (base + all alts)
//   rankByMovement(cands, prevRequired)   -> same list sorted cheapest-first
//   renderSaxCard(container, entry, {isDefault, onSelect})
//
// COSMETIC REQUIREMENTS (cosmetic doc "Saxophone"):
//   - Pre-rendered PNG fingering diagrams (flood-filled from the YDS-120
//     template at assets/sax-template.jpg), NOT live SVG.
//   - Alto/Tenor toggle. Movement-cost-efficient default fingering with
//     click-to-compare alternates (show ALL alternates).
//   - Press-sync works even for off-scale piano presses (inject that note).
//   - Octave-range-picker-aware.
//
// PNG PIPELINE (build-time, outside the app): tools/generate_fingering_pngs.py
// flood-fills assets/sax-template.jpg (633x1244, verified) using the 24 seed
// coordinates in data/sax-key-seeds.json, two-tier color (orange=required
// pitch-determining, grey=optional resonance). Output PNGs are already
// generated at assets/fingerings/<note>.png (e.g. C#4-alt2.png).
//
// HARD REQUIREMENT: each key must show as its TRUE FILLED SHAPE (the flood
// fill spreads from the seed coordinate until it hits the shape's black
// outline). Do NOT replace this with a colored circle/dot drawn at the seed
// coordinate -- that was explicitly checked against and rejected. If you
// regenerate the PNGs, re-run tools/generate_fingering_pngs.py as-is or keep
// its ImageDraw.floodfill() approach; do not swap in draw.ellipse()/circle().

import { parseNote } from "../theory/pitch.js";

let _entries = null;
export async function loadFingerings() {
  if (_entries) return _entries;
  const res = await fetch("./data/sax-fingerings.json");
  _entries = await res.json();
  return _entries;
}

let _fingerMap = null;
export async function loadFingerMap() {
  if (_fingerMap) return _fingerMap;
  const res = await fetch("./data/sax-key-finger-map.json");
  const json = await res.json();
  // invert key-code -> finger-id for O(1) lookup per key
  const keyToFinger = {};
  for (const [finger, keys] of Object.entries(json.fingers)) {
    for (const k of keys) keyToFinger[k] = finger;
  }
  _fingerMap = keyToFinger;
  return _fingerMap;
}

const FRIENDLY_FINGER = {
  L_thumb: "Left thumb", L_index: "Left index finger", L_middle: "Left middle finger",
  L_ring: "Left ring finger", L_pinky: "Left pinky",
  R_index: "Right index finger", R_middle: "Right middle finger", R_ring: "Right ring finger",
  R_pinky: "Right pinky", R_side: "Right-hand side key", octave_palm: "Palm key",
};

// Describes what changes between two fingerings' required[] sets, in terms of
// which finger(s) actually move — used to auto-caption the "home row" filmstrip
// on the How It Works page instead of hand-writing (and risking wrong) captions.
// Computed live from the real chart so it self-corrects if the data changes,
// and it plainly says so when a step ISN'T a clean single-finger lift (several
// real notes engage extra keys rather than just lifting one more finger).
export function describeFingerChange(prevRequired, curRequired, keyToFinger) {
  const prev = new Set(prevRequired), cur = new Set(curRequired);
  const removed = [...prev].filter(k => !cur.has(k));
  const added = [...cur].filter(k => !prev.has(k));
  if (added.length === 0 && removed.length > 0) {
    const fingers = [...new Set(removed.map(k => FRIENDLY_FINGER[keyToFinger[k]] || k))];
    const verb = fingers.length > 1 ? "lift" : "lifts";
    return `${fingers.join(" and ")} ${verb}`;
  }
  if (added.length > 0) {
    const fingers = [...new Set(added.map(k => FRIENDLY_FINGER[keyToFinger[k]] || k))];
    const verb = fingers.length > 1 ? "engage" : "engages";
    return `Not a simple lift — ${fingers.join(", ")} also ${verb}`;
  }
  return "No change";
}

// All fingerings whose base note matches (strips the -alt/-altN suffix).
export function fingeringsFor(entries, writtenName) {
  const base = writtenName.replace(/-alt\d*$/, "");
  return entries.filter(e => e.note.replace(/-alt\d*$/, "") === base);
}

// Movement cost = number of keys that change on/off state vs the previous note.
// (Per-key here; swap to per-finger using data/sax-key-finger-map.json if you
// prefer to count finger moves instead — see that file's note.)
export function rankByMovement(cands, prevRequired = []) {
  const prev = new Set(prevRequired);
  const cost = e => {
    const cur = new Set(e.required);
    let c = 0;
    for (const k of cur) if (!prev.has(k)) c++;
    for (const k of prev) if (!cur.has(k)) c++;
    return c;
  };
  return [...cands].sort((a, b) => cost(a) - cost(b));
}

// Human-readable label for one fingering candidate: never the raw JSON note
// id (e.g. "C#4-alt2") — the base written note, plus "Variation N" only when
// there's more than one candidate for that pitch (N is 1-indexed, counting
// the default as Variation 1).
export function variationLabel(entry, index, total) {
  const base = entry.note.replace(/-alt\d*$/, "");
  return total > 1 ? `${base} Variation ${index + 1}` : base;
}

// topText/bottomText are the exact strings to show above/below the diagram;
// omit either to leave that side blank. Callers pass friendly labels (see
// variationLabel) — this function never falls back to the raw JSON note id.
export function renderSaxCard(container, entry, { isDefault = false, onSelect, topText = null, bottomText = null } = {}) {
  const card = document.createElement("div");
  card.className = "sax-card" + (isDefault ? " is-default" : "");
  const pngPath = `./assets/fingerings/${encodeURIComponent(entry.note)}.png`;
  const top = topText != null ? `<div class="cap cap-top">${topText}</div>` : "";
  const bottom = bottomText != null ? `<div class="cap">${bottomText}</div>` : "";
  card.innerHTML = `
    ${top}
    <img src="${pngPath}" alt="Fingering for ${entry.note}"
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cap',textContent:'req: ${entry.required.join(' ')}  ·  opt: ${entry.optional.join(' ')}'}))" />
    ${bottom}`;
  if (onSelect) card.addEventListener("click", () => onSelect(entry));
  container.appendChild(card);
  return card;
}
