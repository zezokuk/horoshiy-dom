"""First screen of one page on a computer (1440×900) and a phone (390×844) + console errors — a quick look while designing.

    python tools/peek.py http://horoshiy.localhost:3000/preview/hero-1 [name] [scrollY]
    → tools/.shots/peek_<name>_d.png, peek_<name>_m.png
"""
import sys, time
from cdp import Browser

url = sys.argv[1]
name = sys.argv[2] if len(sys.argv) > 2 else "page"
y = int(sys.argv[3]) if len(sys.argv) > 3 else 0
for w, h, mob, dev, port in [(1440, 900, False, "d", 9390), (390, 844, True, "m", 9391)]:
    with Browser(port, f"prof-peek-{dev}", w, h, mobile=mob) as b:
        b.go(url, 3)
        b.js("document.querySelector('.cookie button')?.click()")
        if y:
            b.js(f"scrollTo(0,{y})")
        time.sleep(1.6)  # entry animations
        print(dev, b.shot(f"peek_{name}_{dev}.png"), b.errors()[:2])
