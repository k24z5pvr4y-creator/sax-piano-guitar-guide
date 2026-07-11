// keyboard.js — piano keyboard renderer.
// STATUS: contract defined, minimal working render; needs the notched-key
// polish and full membership/press wiring per docs/app-cosmetic-adjustments.md.
//
// CONTRACT
//   renderKeyboard(container, opts) where opts = {
//     lowMidi, highMidi,          // window to draw (from octave-range picker)
//     rootPc,                     // pitch class of root -> is-root fill
//     scalePcs: Set<number>,      // scale/chord membership -> is-scale fill
//     pressed: Set<number>,       // midi notes pressed -> grey + orange ring
//     onKey(midi)                 // click handler (press-sync source)
//   }
//
// COSMETIC REQUIREMENTS (see cosmetic doc "Piano"):
//   - Full 88-key support (A0–C8); notched interlocking silhouette, NOT bare
//     rectangles. Black keys always stacked above whites regardless of state.
//   - Membership recolors the WHOLE key (deep orange root, lighter orange
//     tone) — not a dot. This was A/B tested; full-fill won.
//   - Pressed = grey fill + orange outline, independent of scale membership.
//   - White keys stay white in BOTH themes; only black/border/pressed flip.
//
// Current implementation draws correct key layout + fills but uses simple
// rectangles. TODO: replace white-key geometry with notched shapes (SVG path
// or clip-path) so black keys sit in real cutouts.

import { midiToName } from "../theory/pitch.js";
import { noteColor, noteTextColor } from "./noteColors.js";

const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);

function stripOctave(name) { return name.replace(/-?\d+$/, ""); }

export function renderKeyboard(container, opts) {
  const { lowMidi, highMidi, rootPc, scalePcs = new Set(), pressed = new Set(),
          onKey, noteLabels = false, spelling = "sharp", octaveDigits = true,
          fillScale = true, showCLabel = true, colorByNote = false } = opts;
  const kb = document.createElement("div");
  kb.className = "keyboard";
  const label = (m) => {
    const name = midiToName(m, spelling);
    return octaveDigits ? name : stripOctave(name);
  };

  // pass 1: white keys
  const whites = [];
  for (let m = lowMidi; m <= highMidi; m++) {
    const pc = ((m % 12) + 12) % 12;
    if (!WHITE_PCS.has(pc)) continue;
    const k = document.createElement("div");
    k.className = "pkey white";
    applyState(k, pc, m, rootPc, scalePcs, pressed, fillScale, colorByNote);
    if (noteLabels && (scalePcs.has(pc) || pressed.has(m))) {
      k.innerHTML = `<span class="keylabel">${label(m)}</span>`;
    } else if (pc === 0 && showCLabel) {
      k.innerHTML = `<span class="octlabel">${label(m)}</span>`;
    }
    if (onKey) k.addEventListener("click", () => onKey(m));
    kb.appendChild(k);
    whites.push({ m, el: k });
  }

  // pass 2: black keys, absolutely placed relative to their flanking white
  // keys, then carve real interlocking notches into the white keys so the
  // black keys sit in true cutouts (the top band of each white key is clipped
  // wherever a black key overlaps it). Done after layout so we can read real
  // pixel geometry.
  //
  // Every black-key pitch class sits exactly on the boundary between the
  // natural note below it (pc-1) and the natural note above it (pc+1) — both
  // always white. Anchor off whichever of those two neighbors is actually
  // rendered, rather than "the C of this octave": a window that doesn't start
  // on a C (e.g. tenor sax's concert range starts on G) has no C in its first
  // partial octave, and anchoring there silently dropped every black key in
  // it.
  requestAnimationFrame(() => {
    const blacks = [];
    for (let m = lowMidi; m <= highMidi; m++) {
      const pc = ((m % 12) + 12) % 12;
      if (WHITE_PCS.has(pc)) continue;
      const below = whites.find(w => w.m === m - 1);
      const above = whites.find(w => w.m === m + 1);
      let centerLeft;
      if (below) centerLeft = below.el.offsetLeft + below.el.offsetWidth;
      else if (above) centerLeft = above.el.offsetLeft;
      else continue; // neither natural neighbor is in the rendered window
      const k = document.createElement("div");
      k.className = "pkey black";
      applyState(k, pc, m, rootPc, scalePcs, pressed, fillScale, colorByNote);
      if (noteLabels && (scalePcs.has(pc) || pressed.has(m))) {
        k.innerHTML = `<span class="keylabel">${label(m)}</span>`;
      }
      k.style.left = `${centerLeft}px`;
      if (onKey) k.addEventListener("click", () => onKey(m));
      kb.appendChild(k);
      blacks.push({ centerLeft, el: k });
    }

    // half-width of a black key (they're all the same CSS width)
    const half = blacks.length ? blacks[0].el.offsetWidth / 2 : 11;
    for (const { el } of whites) {
      const wl = el.offsetLeft, ww = el.offsetWidth, wh = el.offsetHeight;
      const depth = wh * 0.62; // black keys extend this far down
      const overlaps = blacks
        .map(b => ({ l: b.centerLeft - half - wl, r: b.centerLeft + half - wl }))
        .filter(iv => iv.r > 0.5 && iv.l < ww - 0.5)
        .map(iv => ({ l: Math.max(0, iv.l), r: Math.min(ww, iv.r) }))
        .sort((a, b) => a.l - b.l);
      if (!overlaps.length) { el.style.clipPath = ""; continue; }
      el.style.clipPath = notchPolygon(ww, wh, depth, overlaps);
    }
  });

  container.appendChild(kb);
  return kb;
}

// Build a clip-path polygon for a white key: a full rectangle whose top band
// (down to `depth`) is cut back to `depth` wherever a black key overlaps.
// `overlaps` are non-overlapping [l,r] intervals in local px, sorted by l.
function notchPolygon(w, h, depth, overlaps) {
  const p = [];
  const push = (x, y) => p.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  push(0, h);                                   // bottom-left
  let cur = overlaps[0].l <= 0.5 ? depth : 0;   // top-left corner (notched?)
  push(0, cur);
  for (const iv of overlaps) {
    if (iv.l > 0.5) { push(iv.l, cur); push(iv.l, depth); } // step down into notch
    if (iv.r < w - 0.5) { push(iv.r, depth); push(iv.r, 0); cur = 0; } // step back up
    else { push(iv.r, depth); cur = depth; }                // notch runs to right edge
  }
  push(w, cur);                                 // top-right
  push(w, h);                                   // bottom-right
  return `polygon(${p.join(", ")})`;
}

function applyState(k, pc, m, rootPc, scalePcs, pressed, fillScale, colorByNote) {
  const isPressed = pressed.has(m);
  if (isPressed) k.classList.add("is-pressed"); // grey + ring wins over any fill
  if (fillScale && scalePcs.has(pc) && !isPressed) {
    if (colorByNote) {
      k.style.backgroundColor = noteColor(pc);
      k.style.color = noteTextColor(pc);
    } else {
      k.classList.add("is-scale");
    }
  }
  if (fillScale && pc === rootPc && !isPressed) {
    k.classList.add(colorByNote ? "is-root-ring" : "is-root");
  }
}
