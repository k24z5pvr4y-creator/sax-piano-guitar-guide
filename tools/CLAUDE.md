# tools/ — build-time scripts (not shipped to the app)

**`generate_fingering_pngs.py`** — the only script here. Reads
`data/sax-key-seeds.json` + `data/sax-fingerings.json`, flood-fills
`assets/sax-template.jpg` per entry, writes one PNG per fingering to
`assets/fingerings/`. Run it after any edit to either of those two JSON
files:

```
python3 tools/generate_fingering_pngs.py
```

Requires Pillow (`PIL`). Two things NOT to change without re-reading the
script's own header comment first:
- It uses `ImageDraw.floodfill()` to recolor each key's true enclosed shape,
  not `draw.ellipse()`/`draw.circle()` at the seed point — this was
  explicitly checked against and rejected once already. A regeneration that
  produces dot markers instead of filled silhouettes means this got
  swapped out incorrectly.
- Output is saved via `save_optimized()` (palette-mode PNG, ~10x smaller
  than naive RGB) because this artwork only uses a handful of flat colors —
  don't switch to a plain RGB save, it roughly 10x's the PWA's offline
  cache size for no visible quality gain.

If the template image (`assets/sax-template.jpg`) is ever replaced at a
different resolution, every coordinate in `data/sax-key-seeds.json` must be
rescaled first — the script prints a warning if the template size doesn't
match what the seeds file expects, don't ignore that warning.
