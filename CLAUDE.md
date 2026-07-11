# CLAUDE.md — Instrument Reference app: current state

Self-contained SPA reference/lookup tool for sax, piano, and guitar theory
(scales, chords, sax fingerings). **All originally scoped build tasks are
complete** — every route renders, every control works, no `TODO(Claude Code)`
markers remain in the codebase. This file now documents what exists and how
it fits together, for whoever picks this up next.

Read `docs/app-cosmetic-adjustments.md` alongside this file — it's the
authoritative cosmetic spec and reflects several rounds of user-driven design
iteration (colors, layout, notation conventions) since the original build.

## Ground rules

- **No backend, no persistence.** It's a reference/lookup tool. Don't add
  localStorage, accounts, or a server. In-memory state only (`js/app.js` →
  `state`).
- **Copyright:** all scale/chord content is generated from interval formulas in
  `data/scales.json` / `data/chords.json`. Do **not** source any content from
  the Musora/Pianote PDF or any copyrighted book. If you need a new scale/chord,
  add its interval formula to the JSON.
- **Validate before each commit:** `node --check` every JS file you touch (the
  ES-module syntax needs a `.mjs` copy or equivalent, since plain `node --check`
  assumes CommonJS). A single unescaped apostrophe in a template string has
  silently killed all event handlers before — don't let it happen again. Also
  re-render every route in a headless browser after non-trivial changes; several
  real bugs here (a dangling-`else`, a missing `display: grid`, an anchor-key
  lookup that silently dropped notes) passed a syntax check and only showed up
  on actual render.
- **Theme:** orange accent only (`--tone-accent` / `--tone-accent-light`) is
  the app-wide default; teal is retired. **Exception:** Guitar ▸ Scales uses a
  dedicated 7-color per-letter note scheme instead (see "Guitar note-color
  scheme" below) — that scheme is scoped to that one view only. White piano
  keys stay white in both themes; only black-key/border/surface/pressed tokens
  flip for dark mode.
- **Touch:** 44px minimum targets; respect `env(safe-area-inset-*)`.
- **Notation:** sharps only, everywhere. There is no flat/sharp toggle — an
  earlier one existed and was removed as confusing/redundant; `spelling`
  params on theory functions still default to `"sharp"` and nothing overrides
  it.

## Architecture

Hash-router SPA. `js/app.js` owns the route table and the shared `state`:

```js
state = {
  instrument: "alto" | "tenor",  // sax transposition; shared by both sax views
  octaveLow, octaveHigh,         // octave-range picker — Guitar ▸ Scales fretboard ONLY
                                  // picker options are bounded to 2-6 (derived from
                                  // TUNING/FRETS in fretboard.js), not a generic 0-8 —
                                  // it used to offer octaves the guitar can't reach
  root: "C",                     // current root, shared across every scale/chord view
}
```

Each view also lazily attaches its own fields to `state` the first time it
renders (`state.foo ??= …`), so they persist across navigation without
polluting the shared shape above:

- `scaleId` — current scale, used by every scales/chords view.
- `chordMode` — `"all" | "inscale"`, used by both chords views.
- `position` — Guitar ▸ Scales position-box selector (`null` = full neck).
- `gtrPressed` — `Set<midi>`, Guitar ▸ Scales press-sync between the mini
  keyboard and the fretboard.
- `fretFullRange` — Guitar ▸ Scales "show entire fretboard" checkbox; when
  true, the fretboard ignores `octaveLow/octaveHigh` **and** the current
  scale's pitch-class filter, lighting every chromatic note across all 24
  frets (root still rings/highlights; scale membership stops mattering while
  this is on). Originally shipped filtering to scale tones only — fixed after
  a user report that the checkbox wasn't showing "every single note." The
  piano-relationship keyboard above the fretboard reads this flag too (via a
  full-chromatic `scalePcs` override in `guitar-scales.js`) — it was missed
  in the original fix, so the fretboard would go fully chromatic while the
  keyboard above it stayed scale-filtered and looked frozen/stuck.
- `saxPressedMidi` — Sax ▸ Translator's single selected key.
- `saxScaleOctave` — Sax ▸ Scales' octave picker, bounded to whatever octaves
  the *currently selected instrument* can actually produce (alto: 2–5,
  tenor: 1–5 — derived each render from the real fingering data's producible
  concert range, not a hardcoded guess). See "Sax Scales" below for why the
  picker exists and how the default is chosen.

Each view module exports `render<Name>(el, { state, navigate })` and mounts
into `#view`.

Layers:
- `js/theory/` — pure pitch/scale/chord math (`pitch.js`, `scales.js`,
  `chords.js`). Stable; build on it, don't duplicate interval logic in views.
  `chords.js` has two parallel chord-generation paths — see "Two chord
  systems" below.
- `js/render/` — instrument renderers and shared controls:
  - `keyboard.js` — piano keyboard, real notched black/white key geometry.
  - `fretboard.js` — 24-fret horizontal board (full-neck scale view).
  - `chordbox.js` — compact vertical chord-diagram box (guitar chords only —
    NOT the same renderer as fretboard.js; see "Guitar chord diagrams" below).
  - `sax.js` — fingering PNG lookup/ranking/card rendering.
  - `noteColors.js` — the 7-letter-color palette (Guitar ▸ Scales only).
  - `controls.js` — `rootPicker`, `octaveRangePicker` (that's it — the old
    `spellingToggle` was removed along with the flat/sharp toggle).
- `js/views/` — one module per route, composing controls + theory + renderer.

## Per-view feature summary

**Sax ▸ Note Translator** (`/sax/translator`) — plain black/white keyboard
spanning the current instrument's full producible concert range (labeled in
concert pitch, sharps only); a key only turns orange when clicked (no default
scale fill). Clicking shows the movement-cheapest fingering plus all
alternates, captioned with friendly `"<note> Variation N"` labels — never a
raw JSON id like `C#4-alt2`. Alto/Tenor toggle changes the concert mapping.

**Sax ▸ Scales** (`/sax/scales`) — Root + Scale + Alto/Tenor + **Octave**
controls, realizing exactly one octave (root up to the next occurrence of the
root) as a strip of fingering cards sized to fit without horizontal scrolling.
The Octave picker (bounded to what the current instrument can actually
produce — alto: 2–5, tenor: 1–5, not a fixed guess) exists because a
hardcoded octave can push part of the scale outside what the instrument can
play — e.g. root A at a fixed octave 4 puts the window's top note (A5, midi
81) 4 semitones past an alto's concert ceiling (F5, midi 77), so the highest
few scale degrees rendered as out-of-range placeholders with no way to pick a
lower, fully-playable octave. The default octave is chosen
automatically (closest to the middle of the current instrument's playable
range) and re-picked if a root/instrument change makes the stored choice
badly wrong, but is otherwise sticky and user-overridable. Cards show written
(sax) notation on top, concert pitch on the bottom; click a card to cycle its
alternates.

**Piano ▸ Scales** (`/piano/scales`) — Root + Scale only, no octave picker.
Fixed 2-octave keyboard, no per-key octave-number label (`showCLabel: false`).
Below: a "Triads in this scale" list (`diatonicTriads()` — always triads,
never 7th chords) as plain text buttons; clicking one shows that triad on the
same 2-octave window.

**Piano ▸ Chords** (`/piano/chords`) — "All chords" vs "Chords in scale"
toggle. Both modes: one card per chord, ROOT POSITION ONLY (no inversion
loop), on a single fixed one-octave window (C4–B4). Because a wide chord
(e.g. a 13th, spanning ~21 semitones) can't fit a register-accurate voicing in
one octave, every card shows the chord's PITCH-CLASS set folded into that one
octave instead — same convention the scale views already use. Cards wrap
(`flex-wrap`) instead of scrolling sideways.

**Guitar ▸ Scales** (`/guitar/scales`) — Root + Scale + Position + octave-range
picker (the only view that keeps it — the fretboard genuinely needs a wide
adjustable window; bounded to octaves 2–6, what standard tuning + 24 frets
can actually reach) + a "Show entire fretboard" checkbox. Two linked displays
genuinely sharing one `scalePcs`: a fixed, unlabeled 2-octave "piano
relationship" keyboard, and the 24-fret board with an always-visible
fret-number ruler — the checkbox's chromatic override applies to both, not
just the fretboard (see `fretFullRange` above). Position I–XII gives
3-notes-per-string boxes. Two-way press-sync: tapping either instrument
injects that exact pitch on the other, even off-scale. **Both displays use
the 7-color per-letter note scheme** (`colorByNote: true`) instead of the
app's usual orange — see below.

**Guitar ▸ Chords** (`/guitar/chords`) — "All chords" vs "Chords in scale"
toggle. One card per chord type (symbol + note-letter list), containing up to
3 concrete voicings rendered as compact **chord-box diagrams** (`chordbox.js`
— see below), not fretboard slices. Cards wrap in a grid instead of stacking
one-per-line. "Chords in scale" card titles show the real chord symbol with
quality (`i Am`, `ii° Bdim`, `III C`, …), not a bare Roman numeral — see "Two
chord systems" below for the quality-detection fix in `diatonicTriads`.

## Guitar note-color scheme

`js/render/noteColors.js` maps each of the 7 natural pitch classes to a
distinct hue; each sharp gets a *faded* (lightened) version of the natural
it's a sharp OF — C# is a faded C, not a faded D. Wired into `keyboard.js` and
`fretboard.js` via an opt-in `colorByNote` render option (default `false`,
everywhere else keeps the orange accent). Root notes get a dark ring
(`is-root-ring`) instead of a competing 8th color, since the letter-color fill
already distinguishes pitch classes. **This scheme is used exclusively by
Guitar ▸ Scales** — do not enable it elsewhere without checking with the user
first; it was an explicit, scoped request.

B's color was originally `#c2185b`, only ~29° of hue away from C's `#c0392b`
with similar saturation/lightness — the two read as nearly the same color at
a glance. B is now `#bf2290` (~318° hue, a fuchsia/magenta), giving roughly
even separation from both C (~6°) and A (~282°). If any other pair in this
7-color palette turns out too close, check hue distance (HSL), not just
whether the hex strings differ — two colors can look identical while being
technically distinct values.

## Guitar chord diagrams

Guitar chords are rendered by `js/render/chordbox.js`, a **separate**,
purpose-built compact vertical chord-box diagram — not a reuse of
`fretboard.js`'s full 24-fret horizontal grid. This was a deliberate pivot
from the original spec (which said "reuse `renderFretboard`, no bespoke
grid"): showing a chord shape as a slice of the full neck meant a dozen empty
frets before the actual shape appeared. The chord-box format is the
conventional one (X/O mute·open markers, a narrow ~4-fret window starting at
wherever the shape is actually playable, string lines + fret wires, finger
dots labeled with the note letter, a starting-fret label when not at the
nut). If you touch this, **`.cbox-grid` needs `display: grid`** — its
`grid-template-columns/rows` are set as inline styles from JS and silently do
nothing without it (this exact bug shipped once and looked like a solid grey
smear instead of a grid).

The voicing search itself (`findVoicings`/`bestVoicingAt` in
`guitar-chords.js`) is a windowed (≤4-fret hand-span) per-string backtracking
search requiring the bass note to equal the root, contiguous sounded strings,
and full chord-tone coverage for ≤4-note chords. **Known sharp edge:** the
coverage check was once written as
`if (fullCoverage) for (...) if (...) return; else if (...) return;` —a
classic dangling-`else` that silently rejected every triad. It's fixed now
(braced), but if this function is ever refactored, re-verify triads
specifically produce results (they're the smallest chords and the most likely
to hit this class of bug again).

**Second known sharp edge — position selection, not just coverage:**
`findVoicings` searches every possible 4-fret window across the neck and used
to rank all resulting candidates by `score` (which rewards more sounded
strings and more open strings) before picking up to 3 positions. That silently
discarded canonical open-position shapes: Am's real X02210 shape was found
(score 7.5) but ranked below an ugly 6-string voicing with a doubled root at
fret 2 (score 8.8) just because it sounded one more string, so the app never
showed the open Am chord at all. Selection now sorts candidates by `minFret`
ascending FIRST and uses `score` only to break ties within the same position
— guitarists reach for the lowest playable position first, and the score
should only decide between equally-good fingerings there, not override the
position search entirely. The `"open"` label was a related but separate bug:
it checked `minFret === 0`, which is never true for a shape that mixes open
strings with a fretted note (X02210's lowest *fretted* note is fret 1, so it
never read as "open"). It now checks `c.base === 0` (the search window that
found it), not whether an open string happens to ring — using "does any open
string ring" instead over-fires on higher-position shapes too, since chords
like Am/C/Dm/Em/G share several chord tones with the open strings themselves,
so a barre shape anchored at fret 5 can still legitimately ring an open
string alongside it without being a second "open" chord.

## Strings are lines, not lanes (fretboard.js + chordbox.js)

Both renderers originally modeled each STRING as a cell bounded on both
sides — `fretboard.js` gave every row a `border-bottom` (rows = strings),
`chordbox.js` gave the grid a `border-left` plus every column a
`border-right` (columns = strings). For 6 strings that draws **7** boundary
lines with each note centered in the gap *between* two of them, instead of
sitting *on* its own string's line — visually confusing since a real
fretboard/tab diagram has exactly N lines for N strings. A FRET is correctly
modeled as a bounded cell (a fretted note occupies the physical space between
two fret wires), but a STRING is a single continuous line down the neck, so
it needed different treatment. Fixed by drawing exactly one line per
string, centered through the row/column (where the note marker — already
centered via `.fb-dot`'s `inset` / `.cbox-dot`'s `left:50%;top:50%` — lands
right on it), and leaving the fret dimension's cell-bounded borders alone. If
you touch either renderer's grid CSS, count the visible lines against the
string count, not just check that dots render somewhere.

## Two chord systems (don't conflate them)

`theory/chords.js` has two independent ways to get a chord for a scale
degree:

- **`diatonicTriads(orderedPcs, rootName)`** — general, works for scales of
  any length (5-note pentatonic, 6-note whole-tone, 8-note diminished, not
  just 7-note diatonic scales). Stacks every-other scale tone (root, +2, +4
  steps). This is what every "Chords in scale" / "Triads in this scale" UI in
  the app actually uses now. Each returned degree also carries `qualitySuffix`
  (`""`, `"m"`, `"dim"`, `"aug"`, `"sus2"`, `"sus4"`) and a properly-cased
  `roman` (lowercase for minor, `°` suffix for diminished, `+` for augmented —
  e.g. natural minor comes back `i, ii°, III, iv, v, VI, VII`), derived from
  the actual root→3rd/root→5th interval of the stacked triad. This used to be
  a bare uppercase `ROMAN[deg]` regardless of quality, so every "chords in
  scale" card read like "I A", "II B" with no indication of which degrees
  were minor/diminished — Guitar ▸ Chords surfaces this as the real chord
  symbol (`i Am`, `ii° Bdim`); Piano's views inherited the corrected Roman
  casing for free since they consume the same function, but don't currently
  append the quality suffix to their own labels.
- **`diatonicChords(data, scaleId, scalePcs, rootName)`** — the older,
  richer path: looks up real 7th-chord qualities from
  `chords.json`'s `diatonic_seventh_qualities` table, but only for the nine
  7-note diatonic scales it has entries for. **No view currently calls this**
  — it was superseded when every "chords in scale" UI was simplified to
  triads-only per user feedback, but it's left in place (correct, tested,
  potentially useful for a future "show 7th chords" mode) rather than deleted.

## Data schema

`data/sax-fingerings.json` — flat array of `{ note, required[], optional[] }`,
**91 entries** (was 93 at handoff; two exact-duplicate pairs in the A#3 group
were found and merged — see "Known data issues"). All 91 `note` values are
unique and every one has a matching PNG in `assets/fingerings/`.
- `note`: written pitch, `A2`–`D6`, alternates suffixed `-alt`, `-alt2`, …
  (numbering is sequential per base note, starting the count at the default,
  e.g. `variationLabel()` in `render/sax.js` turns `D5` + `D5-alt` into
  "D5 Variation 1" / "D5 Variation 2" for display — never show the raw id).
- `required`: pitch-determining keys (orange in diagrams).
- `optional`: resonance keys (grey). All-optional/open fingerings are valid
  (e.g. `C#4-alt2`) — don't reject them in any validation.
- 24 key codes: `1 2 3 4 5 6 B Bb C C# C1 C2 C3 C4 C5 Eb G# LowA Oct Ta Tc Tf X p`.

`data/scales.json` — `{ id, name, category, intervals[] }`, semitone offsets.
`data/chords.json` — `{ id, symbol, name, tier, core, intervals[] }` plus
`diatonic_seventh_qualities` (see "Two chord systems" above — currently
unused by the UI but kept intact).
`data/sax-key-finger-map.json` — key→finger for movement cost (Oct & LowA are
left thumb, confirmed; other rows are best-effort — spot-check).

## Transposition (do it at the boundary, never in a renderer)

Sax is a transposing instrument. Alto = Eb (−9 semitones), Tenor = Bb (−14) —
both values verified against standard reference and confirmed musically
correct (this was double-checked after a rendering bug was mistaken for a
transposition bug — see below). The fingering JSON is **written** pitch;
piano/guitar and the concert scale picker are **concert** pitch. Convert with
`writtenToConcertMidi` / `concertToWrittenMidi` in `theory/pitch.js` exactly
where the two meet.

**`keyboard.js` black-key placement is anchor-based, not octave-based:** each
black key positions itself relative to whichever of its two natural neighbors
(the white key directly below or above it in pitch) is actually rendered —
NOT "the C of this octave." A window that doesn't start on a C — tenor sax's
concert range starts on G1 — has no C in its first partial octave, and the
old "find the octave's C" logic silently dropped every black key there. If
you ever see missing black keys at one end of a keyboard, this is the first
thing to check.

## Known data issues

- **Both duplicate-fingering issues are resolved.** The original `B3`
  duplicate became `B3-alt` (sparse fingering) at handoff. A second,
  independently-found duplicate pair in the A#3 group (`A#3`≡`A#3-alt2` and
  `A#3-alt`≡`A#3-alt3`, byte-identical required+optional sets) was merged and
  the remaining alternates renumbered — both the JSON and the corresponding
  PNGs. Current count: 91 unique entries, 91 PNGs, verified by an exhaustive
  pairwise diff across every note group (not just the one flagged).
- **Template resolution:** shipped at native 1068×2100 rather than an
  available 1472×2894 upscale — the upscale looked clean but pushed the full
  PNG set to 85–150MB depending on compression, too heavy for service-worker
  pre-caching. Native resolution keeps the set at ~25MB and is still crisp
  for on-screen reference use. If print-quality output is ever needed (e.g.
  exporting to the LaTeX guide), regenerate from the upscaled source instead
  — see `tools/generate_fingering_pngs.py`.

## Distribution

Self-contained PWA. Service worker needs https/localhost to register. For
local development: `python3 -m http.server` from the project root, then open
the printed `localhost` URL — `fetch()` calls to `./data/*.json` and
`./assets/*.png` need a real HTTP origin, not `file://`.

**Live at GitHub Pages:**
https://k24z5pvr4y-creator.github.io/sax-piano-guitar-guide/, served from
`main` at the repo root. This project directory is its **own standalone git
repo** (`git init` here), deliberately separate from the much larger personal
RWTH vault repo it physically lives inside (`/Users/shadi/RWTH` is a
different git root entirely, with no remote and unrelated private content —
don't let the two get confused, and never push from the vault root). `.gitignore`
excludes the reference PDFs/images sitting in this folder (Musora/Pianote-style
scale & chord books, `Flowchart (1).jpg`, `saxchart.jpeg`) — those are source
material for the human, not app content, and per the copyright rule above must
never end up in the public repo. A push to `main` needs a manual Pages rebuild
trigger (`gh api -X POST repos/.../pages/builds`) to actually redeploy; it
doesn't always fire automatically.

**Service worker is network-first, not cache-first** (`sw.js`). It shipped
cache-first with a static cache name (`instrument-ref-v1`) that never changed
between deploys — since browsers only re-run a service worker's install step
when the worker's own script bytes differ, and `sw.js` itself never changed
(only the app files it cached did), a returning visitor's browser kept
serving whatever it cached on their very first visit *forever*, regardless of
what was actually deployed. Two real fix bugs (piano-chords card sizing,
guitar full-fretboard) were pushed and built successfully but invisible to a
returning user until this was fixed. It's now network-first (falls back to
cache only when offline) with `skipWaiting`/`clients.claim` so a new worker
takes over immediately, and the cache name (`instrument-ref-v2`) still gets
bumped on any change as a fallback. The precache list was also missing
`keyboard.js`, `chordbox.js`, and `noteColors.js` despite every view
importing at least one of them — offline use would have broken entirely; now
all three are included.

**Touch targets on real devices:** `select` elements only shared a CSS
selector with `button` for font/color reset — the 44px `min-height` rule
that CLAUDE.md's own ground rules mandate was written for `button` alone, so
every dropdown (root/scale/octave/position pickers) rendered at ~20px tall,
and the "show entire fretboard" checkbox's bare `<label>` had no sizing at
all (~20px tap area around a 13px box). Fixed in `base.css`/`components.css`
(`select` now gets the same touch-target treatment as `button`; the checkbox
label uses a dedicated `.chk-label` class sized to the full 44px row, since
labels already toggle their checkbox by native semantics — enlarging the
label's hit area was the fix, not just the checkbox glyph). Verified via a
headless-browser audit across 4 device widths (360–768px): no page-level
horizontal overflow anywhere, all controls now report ≥44px tall. If you add
a new control, don't assume the shared `button, select, input { font:
inherit }` reset selector also gives it touch sizing — it doesn't.
