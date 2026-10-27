"""Renders themes/material-you/icons.json to PNGs with Material Symbols Rounded.

Values are a symbol name, {"symbol": ..., "fill": 1} for the filled style, or null for an empty
image (the second layer of discord's two-layer icons).

    python3 scripts/render-icons.py path/to/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].ttf

The font and its .codepoints file are in google/material-design-icons under variablefont/.
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# 24dp at xxhdpi, same as discord's own icons
SIZE = 72
AXES = {"Fill": 0, "Grade": 0, "Optical Size": 24, "Weight": 400}

root = Path(__file__).resolve().parent.parent
theme = root / "themes" / "material-you"
out = theme / "assets" / "icons"

font_path = Path(sys.argv[1])
codepoints = dict(
    line.split()
    for line in font_path.with_suffix(".codepoints").read_text().splitlines()
)



def load_font(fill):
    font = ImageFont.truetype(str(font_path), SIZE)
    axes = {**AXES, "Fill": fill}
    font.set_variation_by_axes(
        [axes[axis["name"].decode()] for axis in font.get_variation_axes()]
    )
    return font


fonts = {0: load_font(0), 1: load_font(1)}
# top of the em box, so glyphs keep their position inside the 24dp grid
top = fonts[0].getmetrics()[0] - SIZE

out.mkdir(parents=True, exist_ok=True)
for old in out.glob("*.png"):
    old.unlink()

for name, value in json.loads((theme / "icons.json").read_text()).items():
    image = Image.new("RGBA", (SIZE, SIZE))
    if value is not None:
        if isinstance(value, str):
            value = {"symbol": value}
        ImageDraw.Draw(image).text(
            (0, -top),
            chr(int(codepoints[value["symbol"]], 16)),
            font=fonts[value.get("fill", 0)],
            fill="white",
        )
    image.save(out / f"{name}.png", optimize=True)
