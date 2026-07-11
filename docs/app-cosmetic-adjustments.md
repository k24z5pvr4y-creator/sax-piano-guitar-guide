# Cosmetic / Feature Adjustments — Sax / Guitar / Piano Reference App

## Piano
- Full 88-key (A0–C8) classic black/white keyboard, notched key shapes (real interlocking piano silhouette, not rectangles), black keys always stacked visually above white keys regardless of state.
- Root/scale/chord membership recolors the **whole key** (deep orange root, lighter orange scale/chord tone) — not a dot; this was tried both ways and full-fill won.
- Pressing a key turns it grey with an orange outline, independent of scale membership.
- White keys stay white in both light/dark themes; only black-key/border/pressed tokens flip for dark mode.
- Octave-range picker propagates to guitar and sax too.

## Guitar
- 24-fret board, full-neck view + 3-notes-per-string position patterns (Position I–XII).
- Every dot shows full octave (`F#3`, not just `F`).
- Octave-aware, octave-range-picker-aware, press-sync-aware (exact absolute pitch, injects a press-only dot even off-scale).

## Saxophone
- Pre-rendered PNG fingering diagrams (flood-filled from the template), not live SVG.
- Alto/Tenor toggle, movement-cost-efficient default fingering with click-to-compare alternates.
- Press-sync now works even for off-scale piano presses (injects that note into the strip).
- Octave-range-picker-aware.

## Chords (both sections)
- Toggle between **"Chords in scale"** (diatonic, stacked from the selected scale, Roman-numeral labeled, root-position only) and **"All chords"** (full 9-type dictionary × inversions, root-driven, independent of scale).
- Piano Chords: one mini-keyboard per inversion/voicing, all cards in a row share a **fixed C-to-B 2-octave window** (not sliding per root) — with an octave-shift fix so high-root/high-inversion voicings never lose notes off the top.
- Guitar Chords: **real fretboard slices**, not a bespoke grid — same rows/cells/dots/fret-number styling as the main guitar view, up to 3 positions per chord type (open + barre alternatives), no redundant "Nfr" badge.

## Design system
- Orange accent (`--tone-accent`/`--tone-accent-light`), teal fully retired.
- Icon-only theme toggle (custom SVG icon, `currentColor`-based, works both themes) — no emoji, no text.
- Editorial/reference-book visual style, dark mode support, 44px+ touch targets, safe-area PWA.
