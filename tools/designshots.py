"""Before / after screenshots for a design pass: key pages on a computer (1440) and a phone (390), full height.

    python tools/designshots.py before        → tools/.shots/design_before_*.png
    python tools/designshots.py after         → tools/.shots/design_after_*.png
"""
import sys, time
from cdp import Browser

TAG = sys.argv[1] if len(sys.argv) > 1 else "now"
H = "horoshiy.localhost:3000"
PAGES = [("home", f"http://{H}/"), ("estate", f"http://krd.{H}/objects/dinskaya"), ("house", f"http://krd.{H}/houses/di-tip12"), ("build", f"http://{H}/build")]
for w, h, mob, dev in [(1440, 900, False, "d"), (390, 844, True, "m")]:
    with Browser(9380 if dev == "d" else 9381, f"prof-design-{dev}", w, h, mobile=mob) as b:
        for name, url in PAGES:
            b.go(url, 4)
            b.js("document.querySelector('.cookie button')?.click()")
            # walk down so reveal animations run, then back to the top
            height = b.js("document.documentElement.scrollHeight") or 0
            for y in range(0, height, h // 2):
                b.js(f"scrollTo(0,{y})")
                time.sleep(0.08)
            b.js("scrollTo(0,0)")
            time.sleep(0.6)
            print(dev, name, b.shot(f"design_{TAG}_{dev}_{name}.png", full=True), b.errors()[:1])
