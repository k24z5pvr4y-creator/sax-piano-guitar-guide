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
//
// The palm-key and side-key filmstrips below were built the same way: rather
// than assert a tidy story about which of the 24 key codes does what, each
// example note was picked by actually grepping data/sax-fingerings.json for
// the FIRST (lowest) note that requires a given code, so every one of the 24
// codes is demonstrated by a real card at least once. Two codes (C5, Tf) were
// simply absent from an earlier draft of this page because the example notes
// picked at the time never happened to need them — not because the data
// didn't have them.
import { loadFingerings, loadFingerMap, describeFingerChange, renderSaxCard, fingeringsFor, variationLabel } from "../render/sax.js";
import { writtenToConcertMidi, midiToName } from "../theory/pitch.js";

const HOME_ROW_NOTES = ["D3", "E3", "F#3", "G3", "A3", "B3", "C#4"];
// Lowest note that requires each of the 6 left/right pinky-table codes (plus
// the left-thumb LowA key, which rides along on the very lowest note): A2
// (LowA + low C), A#2 (low Bb), B2 (low B), C#3 (low C#), D#3 (Eb), G#3 (G#).
const PINKY_NOTES = ["A2", "A#2", "B2", "C#3", "D#3", "G#3"];
// Lowest note that requires each of the 5 palm-key codes C1-C5, in the order
// they're first needed climbing the top of the range: C1 at D5, C2 at D#5,
// C3 at E5 (alongside C1), C4 at F5 (alongside C3), C5 at G5 (alongside the
// side key X — the link to the side-keys section below).
const PALM_NOTES = ["D5", "D#5", "E5", "F5", "G5"];
// Three notes that between them require all 4 non-bis side-key codes: F#4
// needs Tf, A5 needs Tc, and F#5 needs BOTH Ta and X together (the case that
// makes the side-keys/palm-keys link concrete: two side keys firing at once).
const SIDE_NOTES = ["F#4", "A5", "F#5"];

// Anchors for the "jump to" nav panel — plain in-page scroll targets, NOT
// hash links. The app's router treats any `location.hash` change as a route
// change (see app.js's `route()`: an unrecognized hash falls back to `"/"`
// and re-renders Home), so `<a href="#core-idea">` would nuke this page
// instead of scrolling. Buttons + `scrollIntoView` sidestep the router
// entirely.
const TOC = [
  { id: "core-idea", label: "The core idea: a shortening tube" },
  { id: "home-row", label: "The home row" },
  { id: "octave-key", label: "The octave key" },
  { id: "transposition", label: "Why sax transposes" },
  { id: "chromatic-fixes", label: "Why it looks messy: the chromatic fixes" },
  { id: "variations", label: "One pitch, several fingerings" },
  { id: "see-it-live", label: "See it live" },
];

export async function renderHowItWorks(el) {
  const [entries, keyToFinger] = await Promise.all([loadFingerings(), loadFingerMap()]);
  const byNote = new Map(entries.map(e => [e.note, e]));

  const altoLow = midiToName(writtenToConcertMidi("D3", "alto"));
  const altoHigh = midiToName(writtenToConcertMidi("D4", "alto"));
  const tenorLow = midiToName(writtenToConcertMidi("D3", "tenor"));
  const tenorHigh = midiToName(writtenToConcertMidi("D4", "tenor"));

  el.innerHTML = `
    <p class="eyebrow">Start here</p>
    <h1>How It Works</h1>
    <p class="lw-lead">Fingering charts look like arbitrary lookup tables until you see the
      mechanism behind them. Once it clicks, you stop memorizing 91 individual pictures and
      start recognizing a handful of physical moves.</p>

    <nav class="lw-toc" aria-label="Jump to section">
      <p class="lw-toc-label">On this page</p>
      <div class="lw-toc-list">
        ${TOC.map(t => `<button type="button" class="lw-toc-item" data-target="${t.id}">${t.label}</button>`).join("")}
      </div>
    </nav>

    <section class="lw-section" id="core-idea">
      <h2>The core idea: a shortening tube</h2>
      <p>A saxophone is a very elaborate whistle. Air travels from the mouthpiece to the
        first open hole it can escape through — the tube's <em>acoustic length</em> stops
        there, not at the actual end of the bell. Every key you press closes a hole and
        keeps the air traveling further; every key you lift opens one and lets the air
        escape sooner. Longer path, lower note. Shorter path, higher note. Lifting your
        fingers from the bottom of the horn upward isn't a fingering convention — it's
        just what makes the tube shorter.</p>
    </section>

    <section class="lw-section" id="home-row">
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

    <section class="lw-section" id="octave-key">
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

    <section class="lw-section" id="transposition">
      <h2>Same fingers, different pitch: why sax transposes</h2>
      <p>Every fingering on this page so far has been described in terms of what's
        <strong>written</strong> — the note printed on the part, and the note this whole
        chart is organized by. That's deliberately not the same thing as the note that
        actually comes out of the bell. The saxophone family (soprano, alto, tenor,
        baritone) are built in different physical sizes, but they're pitched so that a
        player who learns one fingering chart can pick up any of them and read the same
        written part — "all six main keys down" always means the same shape, on every
        horn, but that shape produces a different actual pitch depending on the horn's
        size.</p>
      <p>Alto is pitched in E♭: everything you play sounds a major sixth lower than
        written. Tenor is pitched in B♭, a full octave-plus-a-step lower than written.
        Take the very first fingering from the home row above — written D3, six main
        fingers down, nothing else:</p>
      <p class="cap lw-note">Written D3 sounds as concert <strong>${altoLow}</strong> on
        alto, concert <strong>${tenorLow}</strong> on tenor. Add the octave key (written
        D4) and both come out exactly one octave higher: concert
        <strong>${altoHigh}</strong> / concert <strong>${tenorHigh}</strong> — same
        fingering shape, same octave-key trick, just transposed.</p>
      <p>This is why the fingering charts on this page and everywhere in this app are
        written pitch, unaffected by the Alto/Tenor toggle — the shape you finger doesn't
        change. What changes is which concert pitch it produces, and that's exactly what
        the toggle recalculates. The piano keyboard, the guitar fretboard, and the Root
        picker used for every scale in this app are all concert pitch instead, since
        piano and guitar aren't transposing instruments — the conversion between the two
        pitch systems happens at one boundary in the code
        (<code>writtenToConcertMidi</code>), so nothing downstream has to think about it.
        Try it directly: <a href="#/sax/translator">Sax ▸ Note Translator →</a> flips the
        Alto/Tenor toggle without changing a single fingering.</p>
    </section>

    <section class="lw-section" id="chromatic-fixes">
      <h2>Why it looks messy: the chromatic fixes</h2>
      <p>Ten fingers, twelve semitones per octave. The extra levers clustered around your
        pinkies, palm, and the side of your right hand exist to fill that gap without ever
        moving your hands off the home row — three different clusters, each solving a
        different part of the problem: the lowest notes, the highest notes, and quick
        half-step alternates in between. They also lean on each other more than a tidy
        diagram would suggest — see the note at the end of the side-keys section below.</p>

      <h3 class="lw-subhead">Pinky tables</h3>
      <p>Your pinkies work spatula-shaped keys connected by long rods to pads at the very
        bottom of the bell, for notes below what the home row's six main keys can reach.
        The left pinky operates a table of four (G♯, low C♯, low B, low B♭); the right
        pinky operates a table of two (low C, E♭). One note below demonstrates each of
        those six keys, plus the left thumb's LowA key that rides along on the very
        lowest note:</p>
      <div class="lw-filmstrip" id="pinkyDemo"></div>

      <h3 class="lw-subhead">Palm keys</h3>
      <p>Near your left palm, a cluster of keys vents the very top of the tube — you roll
        your palm across them rather than pressing straight down, the same motion in every
        method book. This app's data labels them C1 through C5, numbered in the order they
        first get pulled in as you climb: C1 at D5, C2 at D♯5, C3 at E5, C4 at F5, C5 at
        G5. That numbering is <em>not</em> a clean ladder where each key stacks on top of
        the last, though — like the home row's B3/C♯4 register break above, the real chart
        doesn't stay tidy. E5 needs C1 <em>and</em> C3 together; F5 swaps in C4 but keeps
        C3; G5 drops the C1-C4 pattern entirely in favor of C5 plus a side key. The cards
        below are the ground truth — don't assume a pattern climbing past what's actually
        shown:</p>
      <div class="lw-filmstrip" id="palmDemo"></div>

      <h3 class="lw-subhead">Side keys</h3>
      <p>Reachable by the side of your right-hand index and middle fingers without leaving
        the home row, side keys serve two different jobs depending on register: down low
        they're quick half-step alternates (see the B♭ example in the next section — its
        default fingering uses one); up high, past the palm keys, they help reach notes the
        palm keys alone can't. This app's data labels the ones demonstrated below Tf, Tc,
        and Ta:</p>
      <div class="lw-filmstrip" id="sideDemo"></div>
      <p class="cap lw-note">F#5 needs Ta and X <em>at the same time</em> — two side keys
        firing together, not one. And G5 above, in the palm-keys section, needed a side key
        (X) together with a palm key (C5): past a certain point in the range, these two
        "separate" clusters stop being separate and start combining.</p>
    </section>

    <section class="lw-section" id="variations">
      <h2>One pitch, several fingerings</h2>
      <p>Not every note has exactly one "correct" fingering. Written B♭3 is the sax's
        most famous example — the real chart lists five different ways to play it, and
        working saxophonists switch between them depending on what comes immediately
        before and after: which one requires the least finger movement, which one speaks
        more in tune in context, which one is physically possible in a fast passage. None
        of the five is more "correct" than the others — they're trade-offs, not a primary
        fingering plus four backups:</p>
      <div class="lw-filmstrip" id="bbDemo"></div>
      <p class="cap lw-note">Same pitch, five different key combinations — including one
        that uses the left-hand "bis" key (labeled <code>p</code> in this app's data,
        positioned between keys 1 and 2) and one that's really the pinky-table B♭ from the
        chromatic-fixes section above, played with the full home-row grip on top.</p>
      <p>This is exactly what Sax ▸ Note Translator's ranking does automatically: click a
        note and it shows every alternate the chart has, cheapest-to-reach first based on
        whatever you clicked before it. B♭ isn't unique in having alternates — it's just
        the note with the most — but you'll find two or three on plenty of other notes
        too. Try it live: <a href="#/sax/translator">Sax ▸ Note Translator →</a></p>
    </section>

    <section class="lw-section" id="see-it-live">
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
        It's a telescoping tube: your six main fingers set its basic length, your pinkies
        and side keys make half-step adjustments to that length, your palm keys vent it for
        the top of the range, and your thumb's octave key reuses the whole shape one
        register higher. Some notes have more than one valid shape, and every shape means a
        different actual pitch depending on which size of horn you're holding — but once
        the tube-shortening idea clicks, the chart stops being something to memorize and
        starts being something you can predict.</p>
    </section>`;

  el.querySelector(".lw-toc").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".lw-toc-item");
    if (!btn) return;
    el.querySelector(`#${btn.dataset.target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  renderHomeRowFilmstrip(el.querySelector("#homeRow"), byNote, keyToFinger);
  renderOctaveDemo(el.querySelector("#octaveDemo"), byNote);
  renderNoteList(el.querySelector("#pinkyDemo"), byNote, PINKY_NOTES);
  renderNoteList(el.querySelector("#palmDemo"), byNote, PALM_NOTES, { compact: true });
  renderNoteList(el.querySelector("#sideDemo"), byNote, SIDE_NOTES, { compact: true });
  renderVariationsFilmstrip(el.querySelector("#bbDemo"), entries, "A#3");
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

function renderNoteList(host, byNote, noteNames, { compact = false } = {}) {
  host.className = "lw-filmstrip sax-strip" + (compact ? " compact" : "");
  for (const noteName of noteNames) {
    const entry = byNote.get(noteName);
    if (!entry) continue;
    renderSaxCard(host, entry, { topText: noteName, bottomText: `Keys: ${entry.required.join(" · ")}` });
  }
}

function renderVariationsFilmstrip(host, entries, baseNote) {
  host.className = "lw-filmstrip sax-strip compact";
  const variants = fingeringsFor(entries, baseNote);
  variants.forEach((entry, i) => {
    renderSaxCard(host, entry, {
      topText: variationLabel(entry, i, variants.length),
      bottomText: `Keys: ${entry.required.join(" · ")}`,
    });
  });
}
