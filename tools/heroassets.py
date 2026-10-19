"""Layers for the «house in front of the title» first screen (/preview/hero-1, reference 1).

The same photo twice: the whole photo at the back, the title over it, and on top the photo again with the sky cut out,
so the roof covers the lower part of the letters. The layers come from one file, so they always line up.

    python tools/heroassets.py [media/photo-14427948.webp]   → public/design/: hero1-photo, hero1-house, sketch-tip5, plan-tip5 (+ 900 px copies)

The sky is found by colour (bright and not warmer than blue: sky and clouds) AND smoothness: the metal roof's highlights
are as white as the clouds, but the tile rows make the roof «ripple» (high local contrast) while sky and clouds are
smooth. Only the sky that touches the top edge is kept (a flood fill), so window reflections and white fences below the
roof stay. Then the sky grows a few pixels into sky-coloured pixels to reach the roof edge (the smoothness window stops
short of it). Check the result: tools/.shots/heroassets_check*.png show the cut-out house over magenta.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np


def box_mean(x, radius):
    k = 2 * radius + 1
    p = np.pad(x, radius + 1, mode="edge").cumsum(0).cumsum(1)
    s = p[k:, k:] - p[:-k, k:] - p[k:, :-k] + p[:-k, :-k]
    return s[: x.shape[0], : x.shape[1]] / (k * k)


def local_std(lum, radius):
    return np.sqrt(np.clip(box_mean(lum ** 2, radius) - box_mean(lum, radius) ** 2, 0, None))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "media", "photo-14427948.webp")
OUT = os.path.join(ROOT, "public", "design")
CROP_BOTTOM = 13  # the slide's dark green frame under the photo

im = Image.open(SRC).convert("RGB")
im = im.crop((0, 0, im.width, im.height - CROP_BOTTOM))
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
v = a.max(axis=2)
sky_colour = (v >= 150) & (b >= r - 6) & (b >= g - 12)  # blue sky and white clouds; brick, green roofs and grass fail
lum = 0.299 * r + 0.587 * g + 0.114 * b
smooth = local_std(lum, 3) < 9
sky_like = sky_colour & smooth

mask = Image.fromarray(np.where(sky_like, 255, 0).astype("uint8"), "L")
mask = mask.filter(ImageFilter.MedianFilter(5))  # cloud specks
# keep only the sky that reaches the top edge or the upper sides: fill from every such pixel still unmarked
seeds = [(x, 0) for x in range(0, mask.width, 3)]
seeds += [(x, y) for y in range(0, mask.height * 3 // 4, 3) for x in (0, mask.width - 1)]
for p in seeds:
    if mask.getpixel(p) == 255:
        ImageDraw.floodfill(mask, p, 128)
sky = np.asarray(mask) == 128
# and the other way round: the house is what reaches the bottom edge; textured cloud islands left in the sky go
fg = Image.fromarray(np.where(sky, 0, 255).astype("uint8"), "L").copy()  # fromarray shares a read-only buffer: floodfill would do nothing
for x in range(0, fg.width, 3):
    if fg.getpixel((x, fg.height - 1)) == 255:
        ImageDraw.floodfill(fg, (x, fg.height - 1), 128)
sky = np.asarray(fg) != 128
# grow up to GROW px into sky-coloured pixels that are not white (a white pixel at the edge may be a tile highlight)
GROW = 5
growable = sky_colour & ~((r > 235) & (g > 235) & (b > 235))
for _ in range(GROW):
    d = np.asarray(Image.fromarray(np.where(sky, 255, 0).astype("uint8"), "L").filter(ImageFilter.MaxFilter(3))) == 255
    sky = sky | (d & growable)

house = Image.fromarray(np.where(sky, 0, 255).astype("uint8"), "L")
house = house.filter(ImageFilter.MinFilter(3))  # 1 px into the roof: no light sky fringe on the letters
house = house.filter(ImageFilter.GaussianBlur(0.9))
cut = im.copy()
cut.putalpha(house)

os.makedirs(OUT, exist_ok=True)
im.save(os.path.join(OUT, "hero1-photo.webp"), quality=84, method=6)
cut.save(os.path.join(OUT, "hero1-house.webp"), quality=88, method=6)
for name, src in (("hero1-photo-900.webp", im), ("hero1-house-900.webp", cut)):
    small = src.resize((900, round(900 * src.height / src.width)), Image.LANCZOS)
    small.save(os.path.join(OUT, name), quality=82 if src.mode == "RGB" else 86, method=6)

# the same house as a white line sketch (references 5–6, «каркас → дом», and the 404): edges of the real photo, so the
# geometry is the client's, nothing drawn by hand. A strong blur drops the brick and grass texture, the gradient is
# thinned to one-pixel lines (non-maximum suppression), and the silhouette comes from the sky mask (a clean roof line).
SKETCH_BLUR, SKETCH_T = 2.6, 13
gray = np.asarray(im.convert("L").filter(ImageFilter.GaussianBlur(SKETCH_BLUR))).astype(float)
gx = np.zeros_like(gray)
gy = np.zeros_like(gray)
gx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
gy[1:-1, :] = gray[2:, :] - gray[:-2, :]
mag = np.hypot(gx, gy)
vert = np.abs(gx) >= np.abs(gy)
left, right = np.roll(mag, 1, 1), np.roll(mag, -1, 1)
up, down = np.roll(mag, 1, 0), np.roll(mag, -1, 0)
peak = np.where(vert, (mag >= left) & (mag >= right), (mag >= up) & (mag >= down))
lines = peak & (mag > SKETCH_T) & ~sky
lines[int(im.height * 0.9) :, :] = False  # the grass strip at the bottom is all texture
house_mask = Image.fromarray(np.where(sky, 0, 255).astype("uint8"), "L")
outline = (np.asarray(house_mask) > 0) & (np.asarray(house_mask.filter(ImageFilter.MinFilter(3))) == 0)
lines |= outline
alpha = Image.fromarray(np.where(lines, 255, 0).astype("uint8"), "L").filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
sketch = Image.new("RGBA", im.size, (255, 255, 255, 0))
sketch.putalpha(alpha)
sketch.save(os.path.join(OUT, "sketch-tip5.webp"), quality=90, method=6)
sketch.resize((900, round(900 * im.height / im.width)), Image.LANCZOS).save(os.path.join(OUT, "sketch-tip5-900.webp"), quality=90, method=6)
# the client's plan of «Тип 5» without the slide's text column (the «чертёж» stage)
plan = Image.open(os.path.join(ROOT, "media", "plan-14427948.webp")).convert("RGB").crop((110, 50, 880, 880))
plan.save(os.path.join(OUT, "plan-tip5.webp"), quality=86, method=6)
blue = Image.new("RGB", im.size, (38, 53, 44))
blue.paste(sketch, (0, 0), sketch)
blue.save(os.path.join(ROOT, "tools", ".shots", "heroassets_sketch.png"))

check = Image.new("RGB", im.size, (255, 0, 255))
check.paste(cut, (0, 0), cut)
os.makedirs(os.path.join(ROOT, "tools", ".shots"), exist_ok=True)
check.save(os.path.join(ROOT, "tools", ".shots", "heroassets_check.png"))
# the roof line at full size: where the letters will meet it
check.crop((300, 180, 1100, 520)).save(os.path.join(ROOT, "tools", ".shots", "heroassets_check_roof.png"))
print("sky", f"{sky.mean():.0%}", "| files:", ", ".join(f"{f} {os.path.getsize(os.path.join(OUT, f)) // 1024} KB" for f in sorted(os.listdir(OUT)) if f.startswith("hero1")))
