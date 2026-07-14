# assets/icons/ — PWA icons (STILL NEEDED)

Empty as of this writing. `manifest.webmanifest` references
`icon-192.png` and `icon-512.png` from this folder but neither exists yet —
this is a known, tracked gap (see `assets/README-ASSETS.txt`), not an
oversight to silently work around. If you're setting up the PWA install
experience, this is the folder to fill in; match the manifest's declared
sizes (192×192, 512×512) and the app's theme color (`#d2691e`,
`--tone-accent` in `css/tokens.css`) for a consistent install icon.
