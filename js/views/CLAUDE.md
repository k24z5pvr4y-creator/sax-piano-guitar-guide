# js/views/ — one module per route

Each file exports `render<Name>(el, { state, navigate })`, composing
`theory/` (compute) + `render/` (draw) into one route's markup. Full
per-view behavioral spec (what each control does, why, and the bug history
behind non-obvious choices) is in the root `CLAUDE.md`'s "Per-view feature
summary" — read that before changing any of these, several real bugs here
were subtle (dangling-`else`, missing `display: grid`, silently-dropped
notes) and passed a syntax check while still being wrong on render.

| File | Route | One-line scope |
|---|---|---|
| `home.js` | `/` | Instrument chooser + the How It Works featured banner |
| `how-it-works.js` | `/learn/how-it-works` | Cross-instrument physics primer — pulls fingering cards live from `data/sax-fingerings.json`, doesn't hardcode any claim about a fingering |
| `sax-translator.js` | `/sax/translator` | Full-range keyboard → click a note → cheapest fingering + alternates |
| `sax-scales.js` | `/sax/scales` | Every A2–D6 written note in-scale, grouped by concert-root recurrence |
| `piano-scales.js` | `/piano/scales` | Fixed 2-octave keyboard + diatonic triads list |
| `piano-chords.js` | `/piano/chords` | All chords / chords-in-scale toggle, root position only, pitch-class-folded into one octave |
| `guitar-scales.js` | `/guitar/scales` | 24-fret board + position boxes + per-letter color scheme (this view only) |
| `guitar-chords.js` | `/guitar/chords` | All chords / chords-in-scale toggle, chord-box diagrams (not fretboard slices) |

**Before adding a new view:** check whether the state it needs is already
shared (`js/app.js`'s `state`) or should be lazily attached
(`state.foo ??= …` on first render, the pattern every existing view follows)
— don't add a new field to the shared `state` object unless more than one
view genuinely needs it.
