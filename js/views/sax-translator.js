// sax-translator.js — Saxophone ▸ Note Translator
// FLOWCHART: "keyboard with all available notes on the sax, e.g. C2–B5 concert,
// covering all concert pitches the sax can produce; for alternate fingerings show all."
//
// SPEC
//  - Render a piano keyboard over the sax's CONCERT range (written A2–D6 maps to
//    concert via TRANSPOSE; alto -9), labeled in concert pitch (sharps only).
//  - The keyboard itself stays plain black/white — no default scale fill. Only
//    the key you actually click turns orange (the standard "pressed" state).
//  - Click a key -> show its fingering diagram(s): default (movement-cheapest)
//    plus ALL alternates as click-to-compare cards.
//  - Alto/Tenor toggle changes the concert mapping (written stays the same).
import { renderKeyboard } from "../render/keyboard.js";
import { loadFingerings, fingeringsFor, rankByMovement, renderSaxCard, variationLabel } from "../render/sax.js";
import { writtenToConcertMidi, concertToWrittenMidi, midiToName } from "../theory/pitch.js";

const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
function countWhiteKeys(lowMidi, highMidi) {
  let n = 0;
  for (let m = lowMidi; m <= highMidi; m++) if (WHITE_PCS.has(((m % 12) + 12) % 12)) n++;
  return n;
}

export async function renderSaxTranslator(el, { state }) {
  const entries = await loadFingerings();
  // producible written notes -> concert midis
  const producible = entries
    .filter(e => !/-alt\d*$/.test(e.note))
    .map(e => writtenToConcertMidi(e.note, state.instrument));
  const lowMidi = Math.min(...producible), highMidi = Math.max(...producible);
  const producibleSet = new Set(producible); // exact producible MIDIs, for labeling only
  const produciblePcs = new Set(producible.map(m => ((m % 12) + 12) % 12));
  state.saxPressedMidi ??= null;

  el.innerHTML = `<p class="eyebrow">Saxophone</p><h1>Note Translator</h1>
    <p class="cap lw-crosslink"><a href="#/learn/how-it-works">Wondering why lifting fingers raises pitch? →</a></p>
    <div class="controls sax-toggle">
      <div class="seg" id="axtog">
        <button aria-pressed="${state.instrument==='alto'}" data-ax="alto">Alto</button>
        <button aria-pressed="${state.instrument==='tenor'}" data-ax="tenor">Tenor</button>
      </div>
    </div>
    <p class="cap">Concert range: <strong>${midiToName(lowMidi)}</strong> – <strong>${midiToName(highMidi)}</strong></p>
    <div id="kbwrap"></div>
    <h3 style="margin-top:24px">Fingering</h3>
    <div id="strip"><p class="cap">Tap a key to see its fingering.</p></div>`;

  el.querySelector("#axtog").addEventListener("click", e => {
    const ax = e.target.dataset.ax; if (!ax) return;
    state.instrument = ax; state.saxPressedMidi = null; renderSaxTranslator(el, { state });
  });

  const kbHost = el.querySelector("#kbwrap"), strip = el.querySelector("#strip");
  // Focusable so arrow keys can drive it right after a click/tap selects a
  // note (see onKey below, which calls kbHost.focus()) — a plain div isn't
  // focusable by default, and focus never bubbles up from a clicked child.
  kbHost.tabIndex = 0;
  const paintStrip = (concertMidi) => {
    const writtenName = midiToName(concertToWrittenMidi(concertMidi, state.instrument));
    const cands = rankByMovement(fingeringsFor(entries, writtenName));
    strip.innerHTML = "";
    if (!cands.length) { strip.innerHTML = `<p class="cap">No fingering for ${writtenName} (written).</p>`; return; }
    const heading = document.createElement("p");
    heading.className = "cap";
    heading.innerHTML = `Concert <strong>${midiToName(concertMidi)}</strong>`;
    strip.appendChild(heading);
    const cards = document.createElement("div");
    cards.className = "sax-strip";
    strip.appendChild(cards);
    cands.forEach((c, i) => renderSaxCard(cards, c, {
      isDefault: i === 0,
      bottomText: variationLabel(c, i, cands.length),
    }));
  };

  const selectNote = (concertMidi) => {
    state.saxPressedMidi = concertMidi;
    paintKeyboard();
    paintStrip(concertMidi);
  };

  // Full instrument range is ~3.5 octaves (25 white keys) — wider than the
  // app's default 44px key width fits without a horizontal scrollbar on most
  // windows. Shrink to whatever actually fits this container, never grow
  // past 44px on wide screens. Computed once per paint (not resize-reactive,
  // matching the rest of this renderer, which already isn't) so the white
  // and black key geometry it drives always stay in sync with each other.
  const whiteCount = countWhiteKeys(lowMidi, highMidi);
  const paintKeyboard = () => {
    kbHost.innerHTML = "";
    const whiteKeyWidth = Math.max(1, Math.min(44, Math.floor(kbHost.clientWidth / whiteCount)));
    renderKeyboard(kbHost, {
      lowMidi, highMidi, rootPc: -1, scalePcs: produciblePcs, fillScale: false,
      pressed: state.saxPressedMidi == null ? new Set() : new Set([state.saxPressedMidi]),
      noteLabels: true, whiteKeyWidth,
      onKey: (concertMidi) => {
        if (!producibleSet.has(concertMidi)) return; // outside what the horn can play
        kbHost.focus(); // lets arrow keys take over navigation right after this click/tap
        if (state.saxPressedMidi === concertMidi) {
          state.saxPressedMidi = null;
          paintKeyboard();
          strip.innerHTML = `<p class="cap">Tap a key to see its fingering.</p>`;
        } else {
          selectNote(concertMidi);
        }
      }
    });
  };

  // Arrow-key navigation once a note is selected: left/right step a whole
  // tone (2 semitones), up/down a half tone (1 semitone), clamped to the
  // instrument's producible concert range.
  kbHost.addEventListener("keydown", (e) => {
    const steps = { ArrowLeft: -2, ArrowRight: 2, ArrowUp: 1, ArrowDown: -1 };
    const step = steps[e.key];
    if (step === undefined || state.saxPressedMidi == null) return;
    e.preventDefault();
    const next = Math.min(highMidi, Math.max(lowMidi, state.saxPressedMidi + step));
    if (next !== state.saxPressedMidi && producibleSet.has(next)) selectNote(next);
  });

  paintKeyboard();
  if (state.saxPressedMidi != null) paintStrip(state.saxPressedMidi);
}
