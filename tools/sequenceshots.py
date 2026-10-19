"""Shots of a scroll-driven block at several points of its scroll (computer and phone) — to see the stages by eye.

    python tools/sequenceshots.py <url> <css selector> <name> [fractions, default 0,0.4,0.7,1]
    → tools/.shots/seq_<name>_<d|m>_<fraction>.png
"""
import json, sys, time
from cdp import Browser

url, sel, name = sys.argv[1], sys.argv[2], sys.argv[3]
fr = [float(x) for x in (sys.argv[4] if len(sys.argv) > 4 else "0,0.4,0.7,1").split(",")]
for w, h, mob, dev, port in [(1440, 900, False, "d", 9396), (390, 844, True, "m", 9397)]:
    with Browser(port, f"prof-seq-{dev}", w, h, mobile=mob) as b:
        b.go(url, 3)
        b.js("document.querySelector('.cookie button')?.click()")
        top, height = json.loads(b.js(f"(() => {{ const r = document.querySelector({json.dumps(sel)}).getBoundingClientRect(); return JSON.stringify([r.top + scrollY, r.height]) }})()"))
        for f in fr:
            # 0 = the block's top reaches the header; 1 = its sticky part is about to leave
            y = top - 76 + f * max(0, height - h)
            b.js(f"scrollTo(0, {y})")
            time.sleep(0.9)
            print(dev, f, b.shot(f"seq_{name}_{dev}_{f}.png"), b.errors()[:1])
