"""First screen of one page on a computer (1440×900) and a phone (390×844) + console errors — a quick look while designing.

    python tools/peek.py http://horoshiy.localhost:3000/preview/hero-1 [name] [scrollY | css selector] [wait s]
    → tools/.shots/peek_<name>_d.png, peek_<name>_m.png
"""
import json, sys, time
from cdp import Browser

url = sys.argv[1]
name = sys.argv[2] if len(sys.argv) > 2 else "page"
to = sys.argv[3] if len(sys.argv) > 3 else "0"
wait = float(sys.argv[4]) if len(sys.argv) > 4 else 1.6
for w, h, mob, dev, port in [(1440, 900, False, "d", 9390), (390, 844, True, "m", 9391)]:
    with Browser(port, f"prof-peek-{dev}", w, h, mobile=mob) as b:
        b.go(url, 3)
        b.js("document.querySelector('.cookie button')?.click()")
        if to.lstrip("-").isdigit():
            b.js(f"scrollTo(0,{to})")
        else:  # a selector: its top under the header
            b.js(f"(() => {{ const e = document.querySelector({json.dumps(to)}); if (e) scrollTo(0, e.getBoundingClientRect().top + scrollY - 84) }})()")
        time.sleep(wait)  # entry animations, 3D
        print(dev, b.shot(f"peek_{name}_{dev}.png"), b.errors()[:2], "SIDEWAYS SCROLL" if b.js("document.documentElement.scrollWidth > innerWidth") else "")
