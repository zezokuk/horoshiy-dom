"""
Динская: настоящий план участков из векторного PDF Александра → JSON для 3D-генплана и Blender.

    python tools/dinskaya_plan.py "<путь к Динская общий.pdf>" [out.json] [debug.png]

Что делает:
  - номера участков — красный текст 17 pt; тип и вариант — чёрная подпись «Тип N (Вk)» в том же участке;
  - контур участка — заливка от номера внутри длинных линий слоя «Стены» (границы и проезды) и кадастровых границ (слой P),
    плюс клетка, где стоит дом участка (у 35 номер в полосе проезда, дом рядом);
  - дом — самый крупный кластер коротких стен в участке, повёрнутый прямоугольник по осям квартала;
  - перечёркнутые участки — красные диагонали слоя «0» поверх участка;
  - улицы — подписи «ул. …» (группа = подпись, ближайшая к участку).
Масштаб — по размерным подписям (мм) у размерных линий; проверка — площадь участков против «сот.» в базе.
Координаты на выходе — метры, x вправо, y вниз (как в PDF), начало — левый верх плана.
"""
import json
import math
import sys
from collections import defaultdict

import numpy as np
import pymupdf
from PIL import Image, ImageDraw

PDF = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "dinskaya-plan.json"
DBG = sys.argv[3] if len(sys.argv) > 3 else None

doc = pymupdf.open(PDF)
page = doc[0]
page.remove_rotation()


def segs_of(g):
    r = []
    for it in g["items"]:
        if it[0] == "l":
            r.append((it[1].x, it[1].y, it[2].x, it[2].y))
        elif it[0] == "re":
            q = it[1]
            pts = [(q.x0, q.y0), (q.x1, q.y0), (q.x1, q.y1), (q.x0, q.y1)]
            r += [pts[i] + pts[(i + 1) % 4] for i in range(4)]
        elif it[0] == "qu":
            q = it[1]
            pts = [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y), (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]
            r += [pts[i] + pts[(i + 1) % 4] for i in range(4)]
        elif it[0] == "c":
            r.append((it[1].x, it[1].y, it[4].x, it[4].y))
    return r


walls, crosses, dimlines, cadastre = [], [], [], []
for g in page.get_drawings():
    layer = g.get("layer") or ""
    red = g.get("color") and tuple(round(x, 2) for x in g["color"]) == (1.0, 0.0, 0.0)
    s = segs_of(g)
    if layer in ("Стены", "STENA"):
        walls += s
    elif layer == "0" and red:
        crosses += s
    elif layer == "Размеры":
        dimlines += s
    elif layer == "P":  # кадастровые границы: у части участков граница только здесь
        cadastre += s
seglen = lambda s: math.dist(s[:2], s[2:])
longs = [s for s in walls if seglen(s) > 20]

# Разрывы, найденные глазами: ломаная проезда между 9 и 11 и между 10 и 12 не доходит до улицы ~4 м
# (пункты PDF после снятия поворота страницы). Без них участки слипаются попарно.
GAPS = [(313.6, 813.0, 305.5, 770.0), (284.2, 818.0, 276.1, 775.0)]
barriers = longs + [s for s in cadastre if seglen(s) > 5] + GAPS
shorts = [s for s in walls if seglen(s) <= 45]

labels, dims = [], []
for b in page.get_text("dict")["blocks"]:
    for l in b.get("lines", []):
        for sp in l["spans"]:
            t = sp["text"].strip()
            if not t:
                continue
            x0, y0, x1, y1 = sp["bbox"]
            item = {"t": t, "c": ((x0 + x1) / 2, (y0 + y1) / 2), "dir": l["dir"], "size": sp["size"], "red": sp["color"] != 0}
            if sp["size"] > 10:
                labels.append(item)
            elif t.isdigit() and len(t) == 4:
                dims.append(item)

nums = {int(l["t"]): l["c"] for l in labels if l["red"] and l["t"].isdigit()}
types = [l for l in labels if not l["red"] and l["t"].startswith("Тип")]

# оси квартала: самое частое направление длинных линий
ang = defaultdict(float)
for s in longs:
    a = math.degrees(math.atan2(s[3] - s[1], s[2] - s[0])) % 90
    ang[round(a)] += seglen(s)
AX = max(ang, key=ang.get)
th = math.radians(AX)
U = np.array([math.cos(th), math.sin(th)])
V = np.array([-math.sin(th), math.cos(th)])

# масштаб: размерная подпись (мм) ↔ ближайшая параллельная размерная линия похожей длины
ratios = []
for d in dims:
    mm = int(d["t"])
    if not 1500 <= mm <= 20000:
        continue
    best = None
    for s in dimlines:
        L = seglen(s)
        if L < 5:
            continue
        mx, my = (s[0] + s[2]) / 2, (s[1] + s[3]) / 2
        dd = math.dist((mx, my), d["c"])
        dx, dy = (s[2] - s[0]) / L, (s[3] - s[1]) / L
        par = abs(dx * d["dir"][0] + dy * d["dir"][1])
        if dd < 8 and par > 0.98 and (best is None or dd < best[0]):
            best = (dd, L)
    if best:
        ratios.append(mm / 1000 / best[1])
ratios.sort()
M = ratios[len(ratios) // 2] if ratios else None  # метров в пункте PDF
print(f"оси {AX}°, масштаб {M:.5f} м/pt по {len(ratios)} размерам (разброс {ratios[len(ratios)//10]:.4f}…{ratios[-len(ratios)//10-1]:.4f})")


def hull(pts):
    pts = sorted(set(map(tuple, pts)))
    if len(pts) < 3:
        return pts
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def simplify(poly, tol):
    """Убирает вершины, которые почти на прямой между соседями (ступеньки растра)."""
    p = list(poly)
    changed = True
    while changed and len(p) > 3:
        changed = False
        for i in range(len(p)):
            a, b, c = np.array(p[i - 1]), np.array(p[i]), np.array(p[(i + 1) % len(p)])
            ac = c - a
            n = np.linalg.norm(ac)
            if n == 0 or abs(ac[0] * (b - a)[1] - ac[1] * (b - a)[0]) / n < tol:
                p.pop(i)
                changed = True
                break
    return p


def in_poly(pt, poly):
    x, y = pt
    ins = False
    for i in range(len(poly)):
        x1, y1 = poly[i - 1]
        x2, y2 = poly[i]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            ins = not ins
    return ins


def area(poly):
    return abs(sum(poly[i - 1][0] * poly[i][1] - poly[i][0] * poly[i - 1][1] for i in range(len(poly)))) / 2


# кластеры коротких стен = дома
pts = []
for s in shorts:
    pts += [(s[0], s[1]), (s[2], s[3])]
P = np.array(pts)
seg_id = np.repeat(np.arange(len(shorts)), 2)
parent = list(range(len(shorts)))


def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i


cell = 6.0
grid = defaultdict(list)
for k, (x, y) in enumerate(P):
    grid[(int(x // cell), int(y // cell))].append(k)
for (gx, gy), ks in grid.items():
    near = []
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            near += grid.get((gx + dx, gy + dy), [])
    for a in ks:
        for b in near:
            if a < b and np.hypot(*(P[a] - P[b])) < cell:
                ra, rb = find(seg_id[a]), find(seg_id[b])
                if ra != rb:
                    parent[ra] = rb
clusters = defaultdict(list)
for i, s in enumerate(shorts):
    clusters[find(i)] += [(s[0], s[1]), (s[2], s[3])]
houses = []
for c in clusters.values():
    a = np.array(c)
    u, v = a @ U, a @ V
    w, h = (u.max() - u.min()) * M, (v.max() - v.min()) * M
    if len(c) >= 40 and 7 < w < 22 and 7 < h < 22:
        houses.append({"pts": a, "c": a.mean(0), "u": (u.min(), u.max()), "v": (v.min(), v.max())})
print("домов (кластеров стен):", len(houses))

# заливка участков в локальном растре
R = 3  # пикселей на пункт
PADW = 260
OPEN = 1.8  # м: полосы уже ~3,6 м — проезд, не участок
OPEN_IF = 1.15  # срезать, только если заливка не выпуклая: её оболочка на 15% больше её самой (прилипла полоса)


def face(seed, extra=()):
    cx, cy = seed
    x0, y0 = cx - PADW, cy - PADW
    im = Image.new("L", (PADW * 2 * R, PADW * 2 * R), 0)
    dw = ImageDraw.Draw(im)
    for s in barriers:
        if min(s[0], s[2]) > x0 + 2 * PADW or max(s[0], s[2]) < x0 or min(s[1], s[3]) > y0 + 2 * PADW or max(s[1], s[3]) < y0:
            continue
        dw.line([(s[0] - x0) * R, (s[1] - y0) * R, (s[2] - x0) * R, (s[3] - y0) * R], fill=255, width=5)
    masks = []
    for sx, sy in (seed, *extra):
        m = im.copy()
        ImageDraw.floodfill(m, ((sx - x0) * R, (sy - y0) * R), 128, thresh=10)
        masks.append(np.array(m) == 128)
    mask = np.logical_or.reduce(masks)
    if mask.sum() > 0.5 * mask.size:  # протекло наружу
        return None, None
    raw = mask.copy()

    def inside(pt):  # точка в самой заливке (до среза полос) — для подписей и крестов
        x, y = int((pt[0] - x0) * R), int((pt[1] - y0) * R)
        return 0 <= x < raw.shape[1] and 0 <= y < raw.shape[0] and bool(raw[y, x])

    # срез узких полос (проезды к задним участкам): эрозия и обратное расширение на OPEN метров
    ys, xs = np.nonzero(mask)
    concave = area(hull([(x / R, y / R) for x, y in zip(xs, ys)])) > OPEN_IF * mask.sum() / (R * R)
    r = int(OPEN / M * R) if concave else 0
    m = mask
    for _ in range(r):
        m = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    for _ in range(r):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    m &= mask
    if m.sum() > 0.3 * mask.sum():
        mask = m
    ys, xs = np.nonzero(mask)
    hp = hull([(x / R + x0, y / R + y0) for x, y in zip(xs, ys)])
    return simplify(hp, 1.2), inside


# подписи групп на плане (в PDF разбиты на куски, поэтому списком)
GROUPS = [
    ((1, 6), "ул. Славянская, уч. 89–93"),
    ((7, 8), "ул. Славянская, уч. 86"),
    ((9, 12), "ул. 300-летия Кубанского войска, уч. 86, 88"),
    ((13, 14), "ул. Таманская, 75"),
    ((15, 18), "ул. 300-летия Кубанского войска, уч. 102, 104"),
    ((19, 28), "ул. Славянская, уч. 101–109"),
    ((29, 34), "ул. Таманская, 107–111"),
    ((35, 36), "ул. 300-летия Кубанского войска, уч. 110"),
]


def street_of(n):
    return next(name for (a, b), name in GROUPS if a <= n <= b)


plots = []
owners_in = {}
for n in sorted(nums):
    c = nums[n]
    poly, inside = face(c)
    if poly is None:
        print("!! участок", n, "заливка протекла")
        continue
    mine = [h for h in houses if in_poly(h["c"], poly)]
    extra = ()
    if not mine:  # номер в полосе проезда: дом ближайший, если в его клетке нет другого номера
        h = min(houses, key=lambda h: math.dist(h["c"], c))
        hp, hin = face(tuple(h["c"]))
        if hp and not any(hin(nums[k]) for k in nums if k != n):
            extra = (tuple(h["c"]),)
            poly, inside = face(c, extra)
            mine = [h]
    house = max(mine, key=lambda h: len(h["pts"])) if mine else None
    tl = [t for t in types if inside(t["c"])]
    crossed = sum(1 for s in crosses if in_poly(((s[0] + s[2]) / 2, (s[1] + s[3]) / 2), poly)) >= 2
    rec_in = inside
    rec = {
        "n": n,
        "type": tl[0]["t"] if len(tl) == 1 else [t["t"] for t in tl] or None,
        "crossed": crossed,
        "street": street_of(n),
        "poly": [[float(round(x * M, 2)), float(round(y * M, 2))] for x, y in poly],
        "area": float(round(area(poly) * M * M, 1)),
    }
    if house:
        (u0, u1), (v0, v1) = house["u"], house["v"]
        corners = [U * u + V * v for u, v in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))]
        rec["house"] = [[float(round(p[0] * M, 2)), float(round(p[1] * M, 2))] for p in corners]
        rec["houseSize"] = [float(round((u1 - u0) * M, 1)), float(round((v1 - v0) * M, 1))]
        rec["houseHull"] = [[float(round(x * M, 2)), float(round(y * M, 2))] for x, y in simplify(hull(house["pts"]), 0.6)]
    plots.append(rec)
    owners_in[n] = rec_in

# каждый «Тип» должен попасть ровно в один участок
for t in types:
    owners = [n for n, fn in owners_in.items() if fn(t["c"])]
    if len(owners) != 1:
        print("?? подпись", t["t"], "в участках", owners)

# соседние кадастровые участки (слой P): заливкой по всей странице, 1 px = 1 pt; самая большая область — улицы
def parcels():
    W_, H_ = int(page.rect.width), int(page.rect.height)
    im = Image.new("L", (W_, H_), 0)
    dw = ImageDraw.Draw(im)
    for s_ in cadastre + longs + GAPS:
        dw.line(list(s_), fill=255, width=2)
    a = np.array(im)
    res = []
    for y in range(4, H_ - 4, 6):
        for x in range(4, W_ - 4, 6):
            if a[y, x] != 0:
                continue
            m = Image.fromarray(a)
            ImageDraw.floodfill(m, (x, y), 77)
            b = np.array(m) == 77
            n = int(b.sum())
            a[b] = 200  # помечено
            if n < 400:  # крошки между линиями
                continue
            ys, xs = np.nonzero(b)
            if xs.min() == 0 or ys.min() == 0 or xs.max() >= W_ - 1 or ys.max() >= H_ - 1:
                res.append({"street": True, "area": n})  # касается края листа: улицы и поле
                continue
            hp = simplify(hull(list(zip(xs.tolist(), ys.tolist()))), 1.5)
            res.append({"poly": [[float(round(x_ * M, 2)), float(round(y_ * M, 2))] for x_, y_ in hp], "area": float(round(n * M * M, 1)), "fill": n / max(1.0, area(hp))})
    return res


nb = []
if __import__("os").environ.get("DINSK_NEIGHBOURS") == "1":  # медленно (10+ мин), по умолчанию выключено
    for r in parcels():
        if r.get("street"):
            continue
        if 150 < r["area"] < 3000 and r["fill"] > 0.85 and not any(in_poly(c, [(x / M, y / M) for x, y in r["poly"]]) for c in nums.values()):
            nb.append({"poly": r["poly"], "area": r["area"]})
    print("соседних участков:", len(nb))

out = {
    "source": "Динская общий.pdf (Александр, 15.11.2026)",
    "units": "m",
    "axis_deg": AX,
    "m_per_pt": round(M, 6),
    "page_m": [round(page.rect.width * M, 1), round(page.rect.height * M, 1)],
    "plots": plots,
    "neighbours": nb,
    "groups": [{"plots": list(range(a, b + 1)), "street": name} for (a, b), name in GROUPS],
}
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("участков:", len(plots), "→", OUT)
for p in plots:
    print(f'{p["n"]:>3} {str(p["type"]):<14} {"X" if p["crossed"] else " "} {p["area"]:>6} м²  дом {p.get("houseSize")}  {p["street"]}')

if DBG:
    x0, y0, x1, y1 = 300, 150, 3100, 2250
    sc = 1.0
    im = Image.new("RGB", (int((x1 - x0) * sc), int((y1 - y0) * sc)), "white")
    dw = ImageDraw.Draw(im)
    for s in longs:
        dw.line([(s[0] - x0) * sc, (s[1] - y0) * sc, (s[2] - x0) * sc, (s[3] - y0) * sc], fill=(200, 200, 200))
    for p in plots:
        pp = [((x / M - x0) * sc, (y / M - y0) * sc) for x, y in p["poly"]]
        dw.polygon(pp, outline=(220, 0, 0) if p["crossed"] else (0, 140, 60), width=2)
        if "house" in p:
            dw.polygon([((x / M - x0) * sc, (y / M - y0) * sc) for x, y in p["house"]], outline=(0, 60, 220), width=2)
        cx = sum(q[0] for q in pp) / len(pp)
        cy = sum(q[1] for q in pp) / len(pp)
        dw.text((cx - 8, cy - 6), str(p["n"]), fill=(0, 0, 0))
    for r in nb:
        dw.polygon([((x / M - x0) * sc, (y / M - y0) * sc) for x, y in r["poly"]], outline=(150, 150, 150))
    im.save(DBG)
