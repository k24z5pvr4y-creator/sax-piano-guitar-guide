# assets/fingerings/ — generated fingering diagrams

**Do not hand-edit or hand-draw anything in this folder.** Every PNG here is
build output: `tools/generate_fingering_pngs.py` flood-fills
`assets/sax-template.jpg` from the seed coordinates in
`data/sax-key-seeds.json`, driven by the `required[]`/`optional[]` arrays in
`data/sax-fingerings.json`. To change a fingering diagram, edit the JSON and
regenerate:

```
python3 tools/generate_fingering_pngs.py
```

**91 files**, one per entry in `sax-fingerings.json`, named `<note>.png`
(alternates suffixed `-alt`, `-alt2`, …, e.g. `C#4-alt2.png`). The count and
the JSON entry count must always match — if they don't, something wasn't
regenerated after a data edit. Every key shown is flood-filled to its TRUE
shape, never a colored circle/dot at a marker point — if you ever see a
regeneration that produces dot markers instead of filled key silhouettes,
the generator script has been changed incorrectly (see that file's own
warning comment).
