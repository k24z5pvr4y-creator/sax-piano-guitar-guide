# js/render/ — instrument renderers + shared controls

DOM-building layer. Takes already-computed data (pitch classes, note names,
fingering entries) from a view and renders it; doesn't compute theory itself.
Full behavioral spec for each renderer lives in the root `CLAUDE.md` —
this is just an orientation map plus the sharp edges that bite if you touch
these files without reading the history first.

| File | Renders | Watch out for |
|---|---|---|
| `keyboard.js` | Piano keyboard, notched black/white geometry | Black-key placement is **anchor-based** (relative to whichever natural neighbor is actually rendered), not octave-based — a window that doesn't start on a C (e.g. tenor sax's concert range starts on G1) has no C in its first partial octave. Optional `whiteKeyWidth`/`colorByNote` params, default off. |
| `fretboard.js` | 24-fret horizontal board | Full-neck scale view only — chord *shapes* use `chordbox.js` instead, not this. |
| `chordbox.js` | Compact vertical chord-box diagram | **Separate renderer from `fretboard.js`**, not a reuse — a deliberate pivot from the original spec. `.cbox-grid` needs `display: grid` in CSS or it silently renders as a grey smear. |
| `sax.js` | Fingering PNG lookup/ranking/card rendering | PNGs are pre-rendered (flood-filled), not live SVG — never draw a circle/dot in place of the real key shape. Also exports `loadFingerMap()`/`describeFingerChange()`, added for the How It Works page — diffs two `required[]` arrays into a human finger-movement caption; reuse this rather than writing a second diff routine if you need similar captions elsewhere. |
| `noteColors.js` | 7-letter-color palette | **Guitar ▸ Scales only** — don't enable `colorByNote` elsewhere without checking with the user first, it was an explicit scoped request. |
| `controls.js` | `rootPicker`, `octaveRangePicker` | That's the whole file — the old `spellingToggle` was removed with the flat/sharp toggle; don't re-add a spelling control without checking, "sharps only" is a deliberate app-wide rule. |

**Strings-are-lines-not-lanes convention** (`fretboard.js` + `chordbox.js`):
each STRING gets exactly one border line through the cell center, not a
bounded lane — count visible lines against the string count if you touch
either renderer's grid CSS, don't just check that dots render somewhere. Full
explanation with the before/after bug in the root `CLAUDE.md`.

**Position-selection sharp edge** (`chordbox.js` / `guitar-chords.js`'s
`findVoicings`): candidates are sorted by `minFret` ascending first, `score`
only breaks ties within a position — re-verify triads specifically produce
the canonical open-position shape if you ever touch the ranking, that class
of bug (ranking a valid-but-uglier high-score voicing above the actually
recognizable open chord) has shipped once already.
