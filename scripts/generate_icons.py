"""Generate Android/web icons from the user's normalized public/app-icon.png.

Artwork-only tooling (not needed by builds):
  python -m pip install Pillow==12.0.0
  python scripts/generate_icons.py

The source is the supplied cloud-and-sparkle artwork with its baked-in outer
checkerboard removed and rounded corners extended for platform masking.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
RES = ROOT / "android/app/src/main/res"
ART = Image.open(PUBLIC / "app-icon.png").convert("RGB")
SAMPLE_SIZE = 432
VISIBLE_SIZE = 288  # 72dp of the adaptive icon's 108dp canvas at 4x.
INSET = (SAMPLE_SIZE - VISIBLE_SIZE) // 2


def masked(size, circular=False):
    image = ART.resize((size * 4, size * 4), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", image.size)
    draw = ImageDraw.Draw(mask)
    bounds = (0, 0, image.width - 1, image.height - 1)
    if circular:
        draw.ellipse(bounds, fill=255)
    else:
        draw.rounded_rectangle(bounds, radius=image.width / 4, fill=255)
    image.putalpha(mask)
    return image.resize((size, size), Image.Resampling.LANCZOS)


for qualifier, size in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96),
                        ("xxhdpi", 144), ("xxxhdpi", 192)]:
    directory = RES / f"mipmap-{qualifier}"
    masked(size).save(directory / "ic_launcher.png")
    masked(size, circular=True).save(directory / "ic_launcher_round.png")

# Keep the supplied art flat (no synthetic parallax between clouds and symbol).
# Extend edge pixels outside the nominal 72dp viewport so any launcher mask has
# a fully opaque background, without shrinking the symbol or exposing a border.
tile = ART.resize((VISIBLE_SIZE, VISIBLE_SIZE), Image.Resampling.LANCZOS)
background = Image.new("RGB", (SAMPLE_SIZE, SAMPLE_SIZE))
background.paste(tile, (INSET, INSET))
background.paste(tile.crop((0, 0, VISIBLE_SIZE, 1)).resize((VISIBLE_SIZE, INSET)), (INSET, 0))
background.paste(tile.crop((0, VISIBLE_SIZE - 1, VISIBLE_SIZE, VISIBLE_SIZE)).resize((VISIBLE_SIZE, INSET)), (INSET, INSET + VISIBLE_SIZE))
background.paste(background.crop((INSET, 0, INSET + 1, SAMPLE_SIZE)).resize((INSET, SAMPLE_SIZE)), (0, 0))
background.paste(background.crop((INSET + VISIBLE_SIZE - 1, 0, INSET + VISIBLE_SIZE, SAMPLE_SIZE)).resize((INSET, SAMPLE_SIZE)), (INSET + VISIBLE_SIZE, 0))
drawable = RES / "drawable-nodpi"
drawable.mkdir(exist_ok=True)
background.save(drawable / "somna_icon_background.png", optimize=True)

# The dark symbol is clearly separated from the pale sky. Preserve only its
# alpha for Android 13 themed icons; the launcher supplies the actual color.
alpha = tile.getchannel("G").point(lambda value: max(0, min(255, (170 - value) * 255 // 130)))
mark = Image.new("RGBA", tile.size, "white")
mark.putalpha(alpha)
monochrome = Image.new("RGBA", background.size)
monochrome.paste(mark, (INSET, INSET))
monochrome.save(drawable / "somna_monochrome.png", optimize=True)

for name in ["ic_launcher", "ic_launcher_round"]:
    for version in [26, 33]:
        themed = '\n    <monochrome android:drawable="@drawable/somna_monochrome" />' if version == 33 else ""
        directory = RES / f"mipmap-anydpi-v{version}"
        directory.mkdir(exist_ok=True)
        (directory / f"{name}.xml").write_text(f'''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/somna_icon_background" />
    <foreground android:drawable="@android:color/transparent" />{themed}
</adaptive-icon>
''')

# Apple applies its own mask; keep this image opaque and square.
ART.resize((180, 180), Image.Resampling.LANCZOS).save(PUBLIC / "apple-touch-icon.png")
masked(32).save(PUBLIC / "favicon-32.png")
masked(64).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
