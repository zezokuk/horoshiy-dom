"""Cut a tall screenshot into viewable parts: python tools/split.py <image> <out-prefix> [parts] [width]"""
import sys
from PIL import Image
im = Image.open(sys.argv[1]); pre = sys.argv[2]; n = int(sys.argv[3]) if len(sys.argv) > 3 else 5; W = int(sys.argv[4]) if len(sys.argv) > 4 else 720
h = -(-im.height // n)
for i in range(n):
    c = im.crop((0, i * h, im.width, min(im.height, (i + 1) * h)))
    c.resize((W, int(c.height * W / c.width))).save(f"{pre}_{i}.jpg", quality=60)
    print(f"{pre}_{i}.jpg")
