# js/theory/ — pure pitch/scale/chord math

No DOM, no fetch, no rendering. Stable — build on it, don't duplicate
interval logic in `render/` or `views/`.

- **`pitch.js`** — note parsing, MIDI conversion, transposition.
  `writtenToConcertMidi` / `concertToWrittenMidi` are the ONLY place sax
  written↔concert conversion should happen — do it at this boundary, never
  inside a renderer or view. Alto = −9 semitones (Eb), Tenor = −14 (Bb),
  both double-checked against reference after a rendering bug was once
  mistaken for a transposition bug (it wasn't — see root `CLAUDE.md`).
  Sharps-only spelling is the default and nothing overrides it; there is no
  flat/sharp toggle in this app.
- **`scales.js`** — scale interval lookup + `scalePcs(root, scale)` pitch-class
  computation. Add new scales to `data/scales.json` as interval formulas,
  never hardcode a scale's note list here or anywhere else (copyright rule —
  see root `CLAUDE.md`).
- **`chords.js`** — **two independent chord-generation paths, don't conflate
  them:**
  - `diatonicTriads(orderedPcs, rootName)` — general, works for any scale
    length, always triads. This is what every "chords in scale" UI in the
    app actually calls. Returns `qualitySuffix` + a correctly-cased `roman`
    (e.g. `i, ii°, III, iv, v, VI, VII` for natural minor) derived from the
    real stacked-triad interval, not a bare uppercase Roman numeral.
  - `diatonicChords(data, scaleId, scalePcs, rootName)` — older, richer path
    using `chords.json`'s `diatonic_seventh_qualities` table for real 7th
    chords, but only for the nine 7-note diatonic scales it has entries for.
    **No view currently calls this** — kept intact for a possible future
    "show 7th chords" mode, not dead code to delete.

Full context/history for all of the above (including the copyright rule
this module exists to satisfy) is in the root `CLAUDE.md`.
