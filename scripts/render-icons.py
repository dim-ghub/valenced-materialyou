"""Renders themes/material-you/icons.json to PNGs with Material Symbols Rounded.

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

font = ImageFont.truetype(str(font_path), SIZE)
font.set_variation_by_axes(
    [AXES[axis["name"].decode()] for axis in font.get_variation_axes()]
)
# top of the em box, so glyphs keep their position inside the 24dp grid
top = font.getmetrics()[0] - SIZE

out.mkdir(parents=True, exist_ok=True)
for old in out.glob("*.png"):
    old.unlink()

for name, symbol in json.loads((theme / "icons.json").read_text()).items():
    image = Image.new("RGBA", (SIZE, SIZE))
    ImageDraw.Draw(image).text(
        (0, -top), chr(int(codepoints[symbol], 16)), font=font, fill="white"
    )
    image.save(out / f"{name}.png", optimize=True)
