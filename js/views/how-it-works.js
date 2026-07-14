// how-it-works.js — "How It Works", the cross-instrument physics primer.
// FLOWCHART: none — this is a new top-level route (/learn/how-it-works),
// featured on Home, that explains WHY the fingerings/frets/keys work the way
// they do, then hands off into the app's own interactive tools (Sax
// Translator/Scales, Piano Scales, Guitar Scales) as "the live version of
// the chart." Every fingering shown here is pulled live from
// data/sax-fingerings.json and rendered with the same renderSaxCard used
// everywhere else — nothing here is a hand-typed claim about what a
// fingering is, so it can't drift out of sync with the real chart.
//
// The "home row" filmstrip below is a good example of why that matters: a
// naive reading of the mechanism ("lift one more finger each time you go up
// a step") holds for D3->A3 but breaks at B3/C#4, where the real chart pulls
// in the octave key and pinky-table keys rather than just lifting one more
// of the original six. describeFingerChange() (render/sax.js) computes this
// live by diffing required[] against the finger map, so the page states the
// true mechanism at each step instead of a smoothed-over story.
import { loadFingerings, loadFingerMap, describeFingerChange, renderSaxCard } from "../render/sax.js";

const HOME_ROW_NOTES = ["D3", "E3", "F#3", "G3", "A3", "B3", "C#4"];
const PINKY_NOTES = ["A2", "A#2", "B2", "C3"];
const PALM_NOTES = ["D5", "E5", "F5"];
const SIDE_KEY_CODES = new Set(["Ta", "Tc", "Tf", "X", "p"]);

export async function renderHowItWorks(el) {
  const [entries, keyToFinger] = await Promise.all([loadFingerings(), loadFingerMap()]);
  const byNote = new Map(entries.map(e => [e.note, e]));
  const sideKeyExample = entries
    .filter(e => !/-alt\d*$/.test(e.note))
    .find(e => e.required.some(k => SIDE_KEY_CODES.has(k)));

  el.innerHTML = `
    <p class="eyebrow">Start here</p>
    <h1>How It Works</h1>
    <p class="lw-lead">Fingering charts look like arbitrary lookup tables until you see the
      mechanism behind them. Once it clicks, you stop memorizing 91 individual pictures and
      start recognizing a handful of physical moves.</p>

    <section class="lw-section">
      <h2>The core idea: a shortening tube</h2>
      <p>A saxophone is a very elaborate whistle. Air travels from the mouthpiece to the
        first open hole it can escape through — the tube's <em>acoustic length</em> stops
        there, not at the actual end of the bell. Every key you press closes a hole and
        keeps the air traveling further; every key you lift opens one and lets the air
        escape sooner. Longer path, lower note. Shorter path, higher note. Lifting your
        fingers from the bottom of the horn upward isn't a fingering convention — it's
        just what makes the tube shorter.</p>
    </section>

    <section class="lw-section">
      <h2>The home row</h2>
      <p>Six fingers — three per hand — rest on the horn's main keys, the same way your
        hands have a home position on a keyboard. Starting with all six down and lifting
        them one at a time, bottom to top, is the closest thing the sax has to a scale
        you can feel rather than look up. Here's what the real chart says happens at each
        step, starting from written D3 (all six main keys closed):</p>
      <div class="lw-filmstrip" id="homeRow"></div>
      <p class="cap lw-note">The last two steps aren't clean lifts — the real fingering pulls
        in the octave key and a pinky-table key rather than simply releasing one more of the
        original six. That's the chart correcting the tidy story: past a certain point, going
        higher stops being just "fewer fingers down."</p>
    </section>

    <section class="lw-section">
      <h2>The octave key — sax's copy-paste button</h2>
      <p>A piano needs a whole separate key for every octave; a guitar needs you to move up
        exactly 12 frets. A sax has neither — your left thumb operates a single octave key
        that vents the tube partway up, forcing the air column to split and vibrate at double
        the frequency. Same tube length, same six fingers, one octave higher. That's why the
        low and middle registers share almost identical fingerings:</p>
      <div class="lw-filmstrip" id="octaveDemo"></div>
      <p class="cap lw-note">Same six fingers down in both cards — only the thumb changes.</p>

      <h3 class="lw-subhead">Same idea, three instruments</h3>
      <div class="lw-compare-grid">
        <a class="nav-card" href="#/sax/scales">
          <h3>Saxophone</h3>
          <p>Shorten the tube with your fingers; the octave key reuses that same shape one
            register up. Open Sax ▸ Scales →</p>
        </a>
        <a class="nav-card" href="#/piano/scales">
          <h3>Piano</h3>
          <p>Every pitch has its own dedicated key — there's no shortcut. Reaching a higher
            octave means physically moving your hand to a different set of keys. Open Piano
            ▸ Scales →</p>
        </a>
        <a class="nav-card" href="#/guitar/scales">
          <h3>Guitar</h3>
          <p>Frets shorten the vibrating string length the same way sax keys shorten the air
            column — and an octave is always exactly 12 frets up the same string. Open
            Guitar ▸ Scales →</p>
        </a>
      </div>
    </section>

    <section class="lw-section">
      <h2>Why it looks messy: the chromatic fixes</h2>
      <p>Ten fingers, twelve semitones per octave. The extra levers clustered around your
        pinkies and palms exist to fill that gap without ever moving your hands off the home
        row.</p>

      <h3 class="lw-subhead">Pinky tables</h3>
      <p>Your pinkies work spatula-shaped keys connected by long rods to the pads at the very
        bottom of the bell — the mechanism behind the horn's lowest notes:</p>
      <div class="lw-filmstrip" id="pinkyDemo"></div>

      <h3 class="lw-subhead">Palm keys</h3>
      <p>Near your left palm, a cluster of keys vents the very top of the tube to reach the
        highest notes in the standard range:</p>
      <div class="lw-filmstrip" id="palmDemo"></div>

      <h3 class="lw-subhead">Side keys</h3>
      <p>Operated by the side of your right-hand fingers without leaving the home row, side
        keys give quick half-step alternatives — like this one, for B♭:</p>
      <div class="lw-filmstrip" id="sideDemo"></div>
    </section>

    <section class="lw-section">
      <h2>See it live</h2>
      <p>This page explains the mechanism; these two views are the interactive chart itself —
        every note, every alternate fingering, ranked by how little you have to move to get
        there.</p>
      <div class="lw-compare-grid">
        <a class="nav-card" href="#/sax/translator">
          <h3>Note Translator →</h3>
          <p>Click any note on the keyboard to see its cheapest fingering plus every
            alternate.</p>
        </a>
        <a class="nav-card" href="#/sax/scales">
          <h3>Scales →</h3>
          <p>See a whole scale laid out as a sequence of fingerings, grouped by octave.</p>
        </a>
      </div>
    </section>

    <section class="lw-section">
      <p class="lw-takeaway">Stop thinking of the sax as a keyboard with a random layout.
        It's a telescoping tube: your six main fingers set its basic length, your pinkies and
        side keys make half-step adjustments to that length, and your thumb's octave key
        reuses the whole shape one register higher. Once that clicks, the chart stops being
        something to memorize and starts being something you can predict.</p>
    </section>`;

  renderHomeRowFilmstrip(el.querySelector("#homeRow"), byNote, keyToFinger);
  renderOctaveDemo(el.querySelector("#octaveDemo"), byNote);
  renderNoteList(el.querySelector("#pinkyDemo"), byNote, PINKY_NOTES);
  renderNoteList(el.querySelector("#palmDemo"), byNote, PALM_NOTES);
  if (sideKeyExample) renderNoteList(el.querySelector("#sideDemo"), byNote, [sideKeyExample.note]);
}

function renderHomeRowFilmstrip(host, byNote, keyToFinger) {
  host.className = "lw-filmstrip sax-strip";
  let prevRequired = null;
  for (const noteName of HOME_ROW_NOTES) {
    const entry = byNote.get(noteName);
    if (!entry) continue;
    const caption = prevRequired
      ? describeFingerChange(prevRequired, entry.required, keyToFinger)
      : "Home position — all six main fingers down";
    renderSaxCard(host, entry, { topText: noteName, bottomText: caption });
    prevRequired = entry.required;
  }
}

function renderOctaveDemo(host, byNote) {
  host.className = "lw-filmstrip sax-strip";
  const low = byNote.get("D3"), high = byNote.get("D4");
  if (low) renderSaxCard(host, low, { topText: "D3", bottomText: "Low register" });
  if (high) renderSaxCard(host, high, { topText: "D4", bottomText: "Middle register (+ octave key)" });
}

function renderNoteList(host, byNote, noteNames) {
  host.className = "lw-filmstrip sax-strip";
  for (const noteName of noteNames) {
    const entry = byNote.get(noteName);
    if (!entry) continue;
    renderSaxCard(host, entry, { topText: noteName, bottomText: `Keys: ${entry.required.join(" · ")}` });
  }
}
