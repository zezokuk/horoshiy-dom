"""Night 09→10.11: whole pages on a computer (1440) and a phone (390), in the look «dom» and the plain v2, really scrolled
(so data-reveal blocks are shown), as compressed JPEG in ночь-09-11/снимки/<tag>_<page>_<look>_<w>.jpg; prints console
errors and sideways scroll.

    python tools/nightshots.py <tag> [path ...]     e.g. python tools/nightshots.py do /   (npm run dev first)
"""
import io, os, sys, time, base64
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

HOST = "http://horoshiy.localhost:3000"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ночь-09-11", "снимки")
tag = sys.argv[1] if len(sys.argv) > 1 else "shot"
paths = sys.argv[2:] or ["/"]
looks = os.environ.get("LOOKS", "dom,v2").split(",")
os.makedirs(OUT, exist_ok=True)
bad = 0
for w, h, mob, port in [(1440, 900, False, 9440), (390, 844, True, 9441)]:
    with Browser(port, f"prof-night-{w}", w, h, mobile=mob) as b:
        for look in looks:
            for p in paths:
                sep = "&" if "?" in p else "?"
                b.go(f"{p if p.startswith('http') else HOST + p}{sep}look={look}", 3)
                b.js("document.querySelector('.cookie button')?.click()")
                # scroll through the page so every reveal fires and lazy pictures load
                H = b.js("document.documentElement.scrollHeight") or 0
                y = 0
                while y < H:
                    b.js(f"scrollTo(0,{y})"); time.sleep(0.18); y += int(h * 0.7)
                    H = b.js("document.documentElement.scrollHeight") or H
                time.sleep(1.2)
                b.js("scrollTo(0,0)"); time.sleep(0.6)
                side = b.js("document.documentElement.scrollWidth > innerWidth")
                errs = b.errors()
                # viewport by viewport while really scrolling, stitched: a full-page capture breaks the sticky first screen
                H = min(int(b.js("document.documentElement.scrollHeight")), 18000)
                sc = 2 if mob else 1
                im = Image.new("RGB", (w * sc, H * sc), "white")
                y = 0
                while True:
                    b.js(f"scrollTo(0,{y})"); time.sleep(0.45)
                    real = int(b.js("scrollY"))
                    shot = Image.open(io.BytesIO(base64.b64decode(b.cmd("Page.captureScreenshot", format="png")["data"]))).convert("RGB")
                    im.paste(shot, (0, real * sc))
                    if y == 0:  # the header and the floating buttons once, on the first frame only
                        b.js("(()=>{const s=document.createElement('style');s.id='ns';s.textContent='.header,.float-call,.sticky-cta,.cookie,.progress{visibility:hidden!important}';document.head.append(s)})()")
                    if real + h >= H or real < y: break
                    y += h
                ph = H
                b.js("document.getElementById('ns')?.remove()")
                if im.width > 1440: im = im.resize((1440, int(im.height * 1440 / im.width)))
                path = p.split('localhost:3000', 1)[-1] if p.startswith('http') else p
                name = f"{tag}_{path.strip('/').replace('/', '-') or 'home'}_{look}_{w}.jpg"
                im.save(os.path.join(OUT, name), quality=70, optimize=True)
                flag = (" ОШИБКИ: " + " | ".join(errs[:3])) if errs else ""
                if side: flag += " ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ"
                if errs or side: bad += 1
                print(f"{name}  {ph}px{flag}")
sys.exit(1 if bad else 0)
