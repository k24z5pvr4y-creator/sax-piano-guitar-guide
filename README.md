# Instrument Reference — Sax · Piano · Guitar

A personal, offline reference app (SPA + tree navigation) for saxophone
fingerings, piano, and guitar scales/chords. No backend, no accounts, no
persistence — it's a lookup tool, not a data app.

## What's here

This is a **scaffold**: the architecture, data layer, theory engine, design
tokens, router, and every view are in place. The theory engine (pitch/scale/
chord math) is complete and working. The three renderers (keyboard, fretboard,
sax) and the leaf views run as skeletons and are marked with `TODO(Claude Code)`
where the branch-specific polish still needs building. `CLAUDE.md` is the build
handoff — read it first.

## Run locally

Service workers (and therefore reliable PWA install) need http/localhost, not
`file://`. From the project root:

```
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly will still work for everything except the service
worker / installability.

## The tree (matches docs/flowchart.jpg)

```
Choose Instrument
├── Saxophone
│   ├── Note Translator   (keyboard → fingerings, all alternates)
│   └── Scales            (concert scale → fingering strip)
├── Piano
│   ├── Scales            (88-key, chords-in-scale as clickable text)
│   └── Chords            (in-scale vs all; mini-keyboard voicings)
└── Guitar
    ├── Scales            (24 frets + piano-relationship view)
    └── Chords            (all versions across frets)
```

## Structure

```
index.html            SPA shell
manifest.webmanifest  PWA manifest
sw.js                 cache-first service worker
css/                  tokens.css (design system) + base + components
data/                 sax-fingerings.json, sax-key-finger-map.json, scales.json, chords.json
js/theory/            pitch.js, scales.js, chords.js   (complete, working)
js/render/            controls.js, keyboard.js, fretboard.js, sax.js
js/views/             one module per leaf of the tree
assets/               sax-template.jpg + fingerings/*.png go here (see README-ASSETS.txt)
docs/                 flowchart.jpg, app-cosmetic-adjustments.md
```

## Data note (needs your call)

`data/sax-fingerings.json` has a **duplicate `B3` entry** (one minimal, one with
the octave key + full lower stack). Reconcile against your handwritten notes and
delete/rename the wrong one. See CLAUDE.md → "Known data issues".
