#!/usr/bin/env python3
"""Key chroma-green fox stills into transparent 128x96 run cells."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

CELL = (128, 96)


def key_green(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if g > 90 and g > r + 25 and g > b + 25:
                pixels[x, y] = (r, g, b, 0)
    return rgba


def crop_content(im: Image.Image, pad: int = 6) -> Image.Image:
    bbox = im.split()[-1].getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def fit_cell(im: Image.Image) -> Image.Image:
    im = crop_content(im)
    cell = Image.new("RGBA", CELL, (0, 0, 0, 0))
    # scale to fit, feet on the bottom edge
    scale = min((CELL[0] - 4) / im.width, (CELL[1] - 2) / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (CELL[0] - nw) // 2
    y = CELL[1] - nh
    cell.alpha_composite(im, (x, y))
    return cell


def main() -> None:
    if len(sys.argv) < 3:
        raise SystemExit("usage: key-fox.py IN OUT")
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    out = fit_cell(key_green(Image.open(src)))
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst)
    print(f"wrote {dst} {out.size}")


if __name__ == "__main__":
    main()
