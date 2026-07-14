# data/ — app content as JSON

All scale/chord/fingering content lives here as interval formulas or raw
lookup tables, never hardcoded in JS — see the copyright rule in the root
`CLAUDE.md`: content must be generated from these files, not sourced from
the Musora/Pianote PDF or any copyrighted book. If you need a new scale or
chord, add its interval formula here first.

| File | Schema | Notes |
|---|---|---|
| `sax-fingerings.json` | flat array `{ note, required[], optional[] }` | **91 unique entries**, all with a matching PNG in `assets/fingerings/`. `note` is written pitch A2–D6, alternates suffixed `-alt`, `-alt2`, … Two exact-duplicate pairs were found and merged at handoff (details in root `CLAUDE.md`'s "Known data issues") — if you ever add entries by hand, diff against existing required+optional sets first, duplicates are easy to introduce silently. |
| `sax-key-finger-map.json` | `{ fingers: { fingerId: [keyCode, …] } }` | Key→finger lookup, used for movement-cost ranking (`render/sax.js`) and the How It Works page's auto-captions (`describeFingerChange`). `Oct`/`LowA` = left thumb is CONFIRMED; other assignments are best-effort — spot-check before trusting a new use of this file. |
| `sax-key-seeds.json` | `{ template_image, template_width/height, seeds: { keyCode: [x,y] } }` | Flood-fill seed coordinates for `tools/generate_fingering_pngs.py`. Tied to `assets/sax-template.jpg`'s exact native resolution (1068×2100) — rescale every coordinate before reusing against a differently-sized template. |
| `scales.json` | `{ id, name, category, intervals[] }` | Semitone offsets from root. |
| `chords.json` | `{ id, symbol, name, tier, core, intervals[] }` + `diatonic_seventh_qualities` | The seventh-qualities table backs `theory/chords.js`'s `diatonicChords()`, which no view currently calls (kept intact, not dead code — see `js/theory/CLAUDE.md`). |

**After editing `sax-fingerings.json` or `sax-key-seeds.json`:** regenerate
the PNGs (`python3 tools/generate_fingering_pngs.py`) — the JSON and the
pre-rendered images in `assets/fingerings/` must stay in sync; nothing
enforces that automatically.
