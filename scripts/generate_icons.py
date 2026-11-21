"""Generate launcher/web rasters and Android vectors from public/app-icon.svg.

Artwork-only tooling, not needed by builds:
  python -m pip install CairoSVG==2.8.2 Pillow==12.0.0
  python scripts/generate_icons.py

Keep the mark inside Android's central 66dp safe circle (108dp canvas).
The SVG's 72dp viewport matches the adaptive icon's nominal visible area.
"""

from copy import deepcopy
from io import BytesIO
from pathlib import Path
import xml.etree.ElementTree as ET

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
RES = ROOT / "android/app/src/main/res"
SVG = "{http://www.w3.org/2000/svg}"
ART = ET.parse(PUBLIC / "app-icon.svg").getroot()
GRADIENTS = {g.attrib["id"]: g for g in ART.findall(f"{SVG}defs/{SVG}linearGradient")}
MARK = ART.find(f"{SVG}g[@id='mark']")
ET.register_namespace("", "http://www.w3.org/2000/svg")


def png(svg, size):
    # Supersample so tiny launcher and tab icons retain smooth edges.
    data = cairosvg.svg2png(bytestring=ET.tostring(svg), output_width=size * 4, output_height=size * 4)
    return Image.open(BytesIO(data)).resize((size, size), Image.Resampling.LANCZOS)


def vector(paths, monochrome=False):
    lines = ['<vector xmlns:android="http://schemas.android.com/apk/res/android"',
             '    xmlns:aapt="http://schemas.android.com/aapt"',
             '    android:width="108dp" android:height="108dp"',
             '    android:viewportWidth="108" android:viewportHeight="108">']
    for path in paths:
        fill = "#FFFFFF" if monochrome else path.attrib["fill"]
        lines.append(f'    <path android:pathData="{path.attrib["d"]}"')
        if not fill.startswith("url("):
            lines.append(f'        android:fillColor="{fill}" />')
            continue
        gradient = GRADIENTS[fill[5:-1]]
        a = gradient.attrib
        lines.extend(['        android:fillColor="#FFFFFFFF">',
                      '        <aapt:attr name="android:fillColor">',
                      f'            <gradient android:type="linear" android:startX="{a["x1"]}" android:startY="{a["y1"]}"',
                      f'                android:endX="{a["x2"]}" android:endY="{a["y2"]}">'])
        for stop in gradient:
            lines.append(f'                <item android:offset="{stop.get("offset", "0")}" android:color="{stop.attrib["stop-color"]}" />')
        lines.extend(['            </gradient>', '        </aapt:attr>', '    </path>'])
    return "\n".join([*lines, '</vector>', ''])


def write(relative, contents):
    path = RES / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents)


# Adaptive foreground is genuinely transparent; no dark cutout or baked-in tile.
write("drawable-v24/somna_moon.xml", vector(MARK))
write("drawable/somna_monochrome.xml", vector(MARK, monochrome=True))
background = ET.Element(f"{SVG}path", {"fill": "url(#night)", "d": "M0 0H108V108H0Z"})
write("drawable-v24/ic_launcher_background.xml", vector([background]))

for qualifier, size, foreground_size in [("mdpi", 48, 108), ("hdpi", 72, 162),
                                         ("xhdpi", 96, 216), ("xxhdpi", 144, 324),
                                         ("xxxhdpi", 192, 432)]:
    directory = RES / f"mipmap-{qualifier}"
    png(ART, size).save(directory / "ic_launcher.png")
    round_art = deepcopy(ART)
    tile = round_art.find(f"{SVG}rect")
    tile.set("rx", "36")
    png(round_art, size).save(directory / "ic_launcher_round.png")
    foreground = deepcopy(ART)
    foreground.remove(foreground.find(f"{SVG}rect"))
    foreground.set("viewBox", "0 0 108 108")
    png(foreground, foreground_size).save(directory / "ic_launcher_foreground.png")

# iOS applies its own mask to touch icons; don't bake rounded transparent corners in.
touch = deepcopy(ART)
touch.find(f"{SVG}rect").set("rx", "0")
png(touch, 180).save(PUBLIC / "apple-touch-icon.png")
png(ART, 32).save(PUBLIC / "favicon-32.png")
png(ART, 64).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# Android 13+ themed icons use a single opaque silhouette, not the full tile.
for name in ["ic_launcher", "ic_launcher_round"]:
    for version in [26, 33]:
        monochrome = '\n    <monochrome android:drawable="@drawable/somna_monochrome" />' if version == 33 else ""
        write(f"mipmap-anydpi-v{version}/{name}.xml", f'''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/somna_moon" />{monochrome}
</adaptive-icon>
''')
