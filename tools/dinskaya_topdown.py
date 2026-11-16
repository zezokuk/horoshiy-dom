"""
Динская: эскиз вида строго сверху по точному плану → основа для Gemini («сделай как снимок с дрона»).

    python tools/dinskaya_topdown.py <dinskaya-plan.json> <out.png> [участки через запятую | all] [px_на_метр]

Рисует: асфальт вокруг, газон участков, плитку-подъезд у короткой стороны дома, вальмовые крыши с коньком,
тонкий забор по границе. Без подписей — их кладём вектором поверх на сайте. Геометрия = план Александра.
"""
import json
import math
import sys

from PIL import Image, ImageDraw, ImageFilter

src, out = sys.argv[1], sys.argv[2]
only = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 and sys.argv[3] not in ("", "all") else None
PX = float(sys.argv[4]) if len(sys.argv) > 4 else 20.0
d = json.load(open(src, encoding="utf-8"))
plots = [p for p in d["plots"] if not only or p["n"] in only]

pts = [q for p in plots for q in p["poly"]]
pad = 12.0  # м вокруг
x0, y0 = min(q[0] for q in pts) - pad, min(q[1] for q in pts) - pad
x1, y1 = max(q[0] for q in pts) + pad, max(q[1] for q in pts) + pad
W, H = int((x1 - x0) * PX), int((y1 - y0) * PX)
tr = lambda q: ((q[0] - x0) * PX, (q[1] - y0) * PX)

im = Image.new("RGB", (W, H), (138, 136, 130))  # асфальт / проезды
dw = ImageDraw.Draw(im)
for p in plots:
    dw.polygon([tr(q) for q in p["poly"]], fill=(92, 140, 70))  # газон
for p in plots:
    dw.line([tr(q) for q in p["poly"]] + [tr(p["poly"][0])], fill=(70, 62, 52), width=max(2, int(PX * 0.15)))  # забор
    h = p.get("house")
    if not h:
        continue
    c = [tr(q) for q in h]
    # плитка: полоса от дома к ближайшей границе участка (к улице)
    cx, cy = sum(q[0] for q in c) / 4, sum(q[1] for q in c) / 4
    poly = [tr(q) for q in p["poly"]]
    near = min(poly, key=lambda q: math.dist(q, (cx, cy)))
    edges = [(poly[i], poly[(i + 1) % len(poly)]) for i in range(len(poly))]
    def dist_seg(pt, a, b):
        ax, ay, bx, by = *a, *b
        t = max(0, min(1, ((pt[0] - ax) * (bx - ax) + (pt[1] - ay) * (by - ay)) / max(1e-9, (bx - ax) ** 2 + (by - ay) ** 2)))
        return math.dist(pt, (ax + t * (bx - ax), ay + t * (by - ay))), (ax + t * (bx - ax), ay + t * (by - ay))
    _, foot = min((dist_seg((cx, cy), a, b) for a, b in edges), key=lambda r: r[0])
    vx, vy = foot[0] - cx, foot[1] - cy
    L = math.hypot(vx, vy) or 1
    nx, ny = -vy / L * PX * 2.2, vx / L * PX * 2.2
    if __import__("os").environ.get("DINSK_DRIVE") == "1":  # въезд по догадке «к ближайшей границе» — в плане его нет, по умолчанию не рисуем
        dw.polygon([(cx + nx, cy + ny), (cx - nx, cy - ny), (foot[0] - nx, foot[1] - ny), (foot[0] + nx, foot[1] + ny)], fill=(196, 190, 178))
    # крыша: тёмная черепица, вальма — конёк по длинной оси
    dw.polygon(c, fill=(64, 66, 72))
    a, b, cc, dd = c
    l1, l2 = math.dist(a, b), math.dist(b, cc)
    if l1 >= l2:
        m1 = ((a[0] + dd[0]) / 2, (a[1] + dd[1]) / 2); m2 = ((b[0] + cc[0]) / 2, (b[1] + cc[1]) / 2); s = l2 / 2
    else:
        m1 = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); m2 = ((dd[0] + cc[0]) / 2, (dd[1] + cc[1]) / 2); s = l1 / 2
    ux, uy = m2[0] - m1[0], m2[1] - m1[1]
    ul = math.hypot(ux, uy) or 1
    r1 = (m1[0] + ux / ul * s, m1[1] + uy / ul * s); r2 = (m2[0] - ux / ul * s, m2[1] - uy / ul * s)
    for q, r in ((a, None), (b, None), (cc, None), (dd, None)):
        rr = r1 if math.dist(q, r1) < math.dist(q, r2) else r2
        dw.line([q, rr], fill=(40, 42, 46), width=max(1, int(PX * 0.12)))
    dw.line([r1, r2], fill=(40, 42, 46), width=max(1, int(PX * 0.15)))
    dw.polygon(c, outline=(30, 30, 34))
im = im.filter(ImageFilter.SMOOTH)
im.save(out, quality=95)
print(out, W, "x", H, "px;", len(plots), "участков")

