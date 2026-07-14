// sax-scales.js — Saxophone ▸ Scales
// FLOWCHART: "choose the scales (Concert), see how they're played with the
// fingering chart; see all notes in the scale next to each other; click a note
// to change its fingering when an alternate exists."
//
// SPEC
//  - Root + Scale + Alto/Tenor controls. Every written note the fingering
//    chart covers (A2-D6, the full data range — same 42 written notes
//    regardless of instrument, since the fingering diagrams are written-pitch
//    and instrument-independent; only the CONCERT sound differs) whose
//    CONCERT pitch class belongs to the current scale gets a card, grouped
//    into rows by WRITTEN octave (2 through 6), each row its own line.
//
//    This used to be "exactly one octave, root up to the next occurrence of
//    the root" (optionally stacked via an Octave/Octaves-shown picker), which
//    seemed reasonable but had a real gap: a root-anchored ascending window's
//    start point is tied to (root, octave), so for high-pc roots like A even
//    the lowest selectable octave never reached the instrument's true bottom
//    register — root A's lowest playable instance is already concert A2, so
//    an A-rooted window can never include anything below that, even though
//    written A2-F3 (concert C2-G#2) are correct, real fingerings that simply
//    belong to OTHER roots' scales. Root-anchoring made the complete range
//    reachable only by hunting root-by-root for whichever one happened to
//    reach a given note. Walking the fixed full range directly and filtering
//    by scale membership (rather than by "is this within one ascending
//    window from the root") guarantees every matching note is always shown,
//    for any root/scale — which is the actual requirement.
//  - Each card shows sax (written) notation on TOP and concert pitch on the
//    BOTTOM, using friendly "Variation N" labels — never the raw JSON note
//    id. Clicking a card cycles to that note's alternates.
//  - Reuse rankByMovement so the *sequence* prefers low finger movement,
//    continuing the movement-cost chain across octave rows.
import { rootPicker } from "../render/controls.js";
import { loadScales, getScale, byCategory, scalePcs } from "../theory/scales.js";
import { loadFingerings, fingeringsFor, rankByMovement, renderSaxCard, variationLabel } from "../render/sax.js";
import { concertToWrittenMidi, writtenToConcertMidi, midiToName, parseNote } from "../theory/pitch.js";

export async function renderSaxScales(el, ctx) {
  const { state } = ctx;
  const scales = await loadScales();
  const entries = await loadFingerings();
  state.scaleId ??= "major";
  const scale = getScale(scales, state.scaleId);
  const scalePcSet = new Set(scalePcs(state.root, scale));

  el.innerHTML = `<p class="eyebrow">Saxophone</p><h1>Scales</h1>
    <p class="cap lw-crosslink"><a href="#/learn/how-it-works">Fingering Intuition →</a></p>
    <div class="controls sax-toggle">
      <div class="seg" id="axtog">
        <button aria-pressed="${state.instrument==='alto'}" data-ax="alto">Alto</button>
        <button aria-pressed="${state.instrument==='tenor'}" data-ax="tenor">Tenor</button>
      </div>
    </div>
    <div class="controls" id="ctl"></div>
    <div class="controls">
      <label>Scale <select id="scaleSel"></select></label>
    </div>
    <div id="strips"></div>`;

  el.querySelector("#axtog").addEventListener("click", e => {
    const ax = e.target.dataset.ax; if (!ax) return;
    state.instrument = ax; renderSaxScales(el, ctx);
  });
  const ctl = el.querySelector("#ctl");
  ctl.append(rootPicker(state, () => renderSaxScales(el, ctx)));
  fillScaleSelect(el.querySelector("#scaleSel"), scales, state, () => renderSaxScales(el, ctx));

  // Full written range, sorted by actual pitch (not string order — "A#2" <
  // "B2" alphabetically is wrong musically), filtered to scale membership by
  // CONCERT pitch class, then chunked into rows that each span one complete
  // CONCERT octave of the scale, starting at the concert root. Grouping by
  // written octave (the old approach) doesn't line up with musical octaves
  // in concert pitch at all — sax is a transposing instrument, so a
  // written-octave boundary falls at an arbitrary point in the concert
  // scale depending on root/instrument. A new row starts every time the
  // concert root recurs; whatever notes precede the first root occurrence
  // in the fixed A2-D6 range form a single leading (partial) row.
  const rootPc = parseNote(state.root).pc;
  const baseNotes = entries
    .filter(e => !/-alt\d*$/.test(e.note))
    .map(e => ({ note: e.note, midi: parseNote(e.note).midi }))
    .sort((a, b) => a.midi - b.midi);

  const filtered = [];
  for (const n of baseNotes) {
    const concertPc = ((writtenToConcertMidi(n.note, state.instrument) % 12) + 12) % 12;
    if (!scalePcSet.has(concertPc)) continue;
    filtered.push({ note: n.note, concertPc });
  }

  const groups = [];
  let current = [];
  for (const n of filtered) {
    if (n.concertPc === rootPc && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(n.note);
  }
  if (current.length) groups.push(current);

  const strips = el.querySelector("#strips");
  strips.innerHTML = "";
  let prevReq = [];
  groups.forEach((notes, i) => {
    const heading = document.createElement("p");
    heading.className = "cap";
    heading.style.margin = i === 0 ? "0 0 4px" : "16px 0 4px";
    heading.textContent = `Octave ${i + 1}`;
    strips.appendChild(heading);

    const strip = document.createElement("div");
    strip.className = "sax-strip compact";
    strips.appendChild(strip);
    for (const written of notes) {
      const concertName = midiToName(writtenToConcertMidi(written, state.instrument));
      const cands = rankByMovement(fingeringsFor(entries, written), prevReq);
      if (!cands.length) { renderOutOfRange(strip, concertName, written); continue; }
      renderCyclingCard(strip, cands, concertName);
      prevReq = cands[0].required; // sequence prefers low movement off the default, across rows too
    }
  });
  if (!strips.children.length) strips.innerHTML = `<p class="cap">No notes in this scale.</p>`;
}

// One scale note = one card cycling through its alternates on click/tap.
// Written (sax) notation on top, concert pitch on bottom — friendly labels,
// never the raw JSON note id.
function renderCyclingCard(strip, cands, concertName) {
  let i = 0;
  const wrap = document.createElement("div");
  wrap.className = "sax-cycle";
  const cardHost = document.createElement("div");
  const paint = () => {
    cardHost.innerHTML = "";
    renderSaxCard(cardHost, cands[i], {
      isDefault: i === 0,
      topText: variationLabel(cands[i], i, cands.length),
      bottomText: concertName,
    });
    caption.textContent = cands.length > 1 ? "tap to cycle" : "";
  };
  const caption = document.createElement("div");
  caption.className = "cap";
  if (cands.length > 1) {
    wrap.classList.add("has-alts");
    wrap.addEventListener("click", () => { i = (i + 1) % cands.length; paint(); });
  }
  wrap.append(cardHost, caption);
  paint();
  strip.appendChild(wrap);
}

function renderOutOfRange(strip, concertName, written) {
  const ph = document.createElement("div");
  ph.className = "sax-card is-oor";
  ph.innerHTML = `<div class="cap cap-top">${written}</div>
    <div class="sax-oor" aria-hidden="true">—</div>
    <div class="cap">${concertName}<br><span class="cap-sub">out of range</span></div>`;
  strip.appendChild(ph);
}

function fillScaleSelect(sel, scales, state, onChange) {
  const groups = byCategory(scales);
  for (const [cat, list] of Object.entries(groups)) {
    const og = document.createElement("optgroup"); og.label = cat;
    for (const s of list) {
      const o = document.createElement("option"); o.value = s.id; o.textContent = s.name;
      if (s.id === state.scaleId) o.selected = true; og.appendChild(o);
    }
    sel.appendChild(og);
  }
  sel.addEventListener("change", () => { state.scaleId = sel.value; onChange(); });
}
