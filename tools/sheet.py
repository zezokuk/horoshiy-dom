"""Glue several shots into one contact sheet (to look at a sequence at once).

    python tools/sheet.py out.png cols width a.png b.png …   (paths relative to tools/.shots)
"""
import os, sys
from PIL import Image

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".shots")
out, cols, width = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(os.path.join(D, p)).convert("RGB") for p in sys.argv[4:]]
ims = [im.resize((width, round(width * im.height / im.width))) for im in ims]
rows = (len(ims) + cols - 1) // cols
cell_h = max(im.height for im in ims)
sheet = Image.new("RGB", (cols * width + (cols - 1) * 8, rows * cell_h + (rows - 1) * 8), (255, 255, 255))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (width + 8), (i // cols) * (cell_h + 8)))
sheet.save(os.path.join(D, out))
print(os.path.join(D, out))
