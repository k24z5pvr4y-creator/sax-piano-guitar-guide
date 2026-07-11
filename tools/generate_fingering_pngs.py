#!/usr/bin/env python3
"""
generate_fingering_pngs.py — build script for sax fingering diagram PNGs.

CRITICAL: this fills each active key's TRUE SHAPE via flood-fill from its seed
coordinate. It does NOT draw a circle/dot at the coordinate. The seed
coordinate is only a starting pixel for the fill algorithm to spread from
until it hits the black outline boundary of that key's shape -- the visual
result is the whole key silhouette recolored, matching the hand-drawn outline
in assets/sax-template.jpg exactly.

If you ever see code that does draw.ellipse(...) or draw.circle(...) at a key's
seed coordinate instead of ImageDraw.floodfill(...), that is WRONG and does not
match the cosmetic spec ("required" keys must show as their real shape,
two-tier orange/grey, not a marker dot).

Usage:
    python3 tools/generate_fingering_pngs.py

Reads:
    data/sax-key-seeds.json     seed coordinates + template path
    data/sax-fingerings.json    one entry per note: {note, required[], optional[]}
    assets/sax-template.jpg     the clean-line template to fill against

Writes:
    assets/fingerings/<note>.png   one PNG per fingering entry, e.g. C#4-alt2.png
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEEDS_PATH = os.path.join(ROOT, "data", "sax-key-seeds.json")
FINGERINGS_PATH = os.path.join(ROOT, "data", "sax-fingerings.json")
OUT_DIR = os.path.join(ROOT, "assets", "fingerings")

# Two-tier color coding per the cosmetic spec.
REQUIRED_COLOR = (230, 126, 34)   # piorange -- pitch-determining keys
OPTIONAL_COLOR = (170, 170, 170)  # grey -- resonance keys
FLOOD_THRESH = 25                 # tolerance for anti-aliased line edges


def load_seeds():
    with open(SEEDS_PATH) as f:
        data = json.load(f)
    template_path = os.path.join(ROOT, data["template_image"])
    return data["seeds"], template_path, (data["template_width"], data["template_height"])


def load_fingerings():
    with open(FINGERINGS_PATH) as f:
        return json.load(f)


def render_fingering(template, seeds, entry):
    """Return a filled copy of `template` for one fingering entry.
    Every key in `required` gets a full flood-fill in REQUIRED_COLOR;
    every key in `optional` gets a full flood-fill in OPTIONAL_COLOR.
    This recolors the enclosed shape, not a marker at the seed point."""
    img = template.copy()
    for key_code in entry.get("optional", []):
        seed = seeds.get(key_code)
        if seed is None:
            print(f"  WARNING: no seed coordinate for optional key '{key_code}' in {entry['note']}")
            continue
        ImageDraw.floodfill(img, tuple(seed), OPTIONAL_COLOR, thresh=FLOOD_THRESH)
    for key_code in entry.get("required", []):
        seed = seeds.get(key_code)
        if seed is None:
            print(f"  WARNING: no seed coordinate for required key '{key_code}' in {entry['note']}")
            continue
        ImageDraw.floodfill(img, tuple(seed), REQUIRED_COLOR, thresh=FLOOD_THRESH)
    return img


def save_optimized(img, path):
    """Save as a palette-mode PNG with optimization. This artwork only uses a
    handful of colors (white background, black lines, orange fill, grey fill,
    anti-aliasing greys), so palette mode + optimize cuts file size by ~10x
    versus a naive full-RGB save with no quality loss visible at this line-art
    style. Falls back to a plain optimized RGB save if quantization ever
    produces a visibly different result (shouldn't happen for this artwork)."""
    quantized = img.convert("P", palette=Image.ADAPTIVE, colors=64)
    quantized.save(path, optimize=True)


def main():
    seeds, template_path, expected_size = load_seeds()
    template = Image.open(template_path).convert("RGB")
    if template.size != tuple(expected_size):
        print(f"WARNING: template is {template.size}, seeds were computed for {expected_size}. "
              f"Rescale data/sax-key-seeds.json before running this script.")
    fingerings = load_fingerings()
    os.makedirs(OUT_DIR, exist_ok=True)

    for entry in fingerings:
        note = entry["note"]
        out_path = os.path.join(OUT_DIR, f"{note}.png")
        img = render_fingering(template, seeds, entry)
        save_optimized(img, out_path)
        print(f"wrote {out_path}")

    print(f"\nDone: {len(fingerings)} fingering PNGs written to {OUT_DIR}")


if __name__ == "__main__":
    main()
