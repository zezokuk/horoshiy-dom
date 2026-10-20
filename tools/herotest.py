"""The live first screen «Чертёж → дом» (variant 4, components/heroes/DraftSplit): the split line really follows the user.

    python tools/herotest.py     (dev server on :3000)

Computer: on load the house turns from the drawing into the photo and the line rests at 46 %; the mouse moves it; the
mouse leaving puts it back; arrow keys move it (slider for screen readers). Phone: the same rest, a tap moves the line,
no sideways scroll. Reduced motion: the rest position at once, no intro.
"""
import json, sys, time
from cdp import Browser

URL = "http://horoshiy.localhost:3000/"
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


X = "parseFloat(document.querySelector('.hx__house').style.getPropertyValue('--x'))"
BOX = "JSON.stringify(document.querySelector('.hx__house').getBoundingClientRect())"

with Browser(9401, "prof-hero-d", 1440, 900) as b:
    b.go(URL, 1)
    b.js("document.querySelector('.cookie button')?.click()")
    start = b.js(X)
    time.sleep(4)
    rest = b.js(X)
    check("load: starts as a drawing, ends at the rest line", start > 90 and abs(rest - 46) < 2, f"{start:.0f} → {rest:.1f}")
    r = json.loads(b.js(BOX))
    y = r["y"] + r["height"] * 0.45
    b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=r["x"] + r["width"] * 0.2, y=y)
    time.sleep(1.2)
    check("mouse at 20 % of the house: the line follows", abs(b.js(X) - 20) < 3, f"{b.js(X):.1f}")
    b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=r["x"] + r["width"] * 0.8, y=y)
    time.sleep(1.2)
    check("mouse at 80 %: the house is real up to there", abs(b.js(X) - 80) < 3, f"{b.js(X):.1f}")
    b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=720, y=890)  # below the hero
    time.sleep(2.5)
    check("mouse leaves: back to the rest line", abs(b.js(X) - 46) < 2, f"{b.js(X):.1f}")
    b.js("document.querySelector('.hx__handle').focus()")
    b.key("ArrowRight", vk=39)
    b.key("ArrowRight", vk=39)
    time.sleep(1.2)
    now = b.js("document.querySelector('.hx__handle').getAttribute('aria-valuenow')")
    check("arrow keys move the slider (and aria-valuenow)", abs(b.js(X) - 56) < 2 and abs(int(now) - 56) < 2, f"{b.js(X):.1f}, aria {now}")
    check("computer: no console errors", not b.errors())

with Browser(9402, "prof-hero-m", 390, 844, mobile=True) as b:
    b.go(URL, 1)
    b.js("document.querySelector('.cookie button')?.click()")
    time.sleep(4.5)
    check("phone: rests at 46 % after load", abs(b.js(X) - 46) < 2, f"{b.js(X):.1f}")
    r = json.loads(b.js(BOX))
    s = json.loads(b.js("JSON.stringify(document.querySelector('.hd__stage').getBoundingClientRect())"))
    tx = s["x"] + s["width"] * 0.75
    b.click(xy=(tx, r["y"] + r["height"] * 0.5))
    time.sleep(1.5)
    want = (tx - r["x"]) / r["width"] * 100
    check("phone: a tap on the house moves the line there", abs(b.js(X) - want) < 3, f"{b.js(X):.1f} vs {want:.1f}")
    check("phone: no sideways scroll", not b.js("document.documentElement.scrollWidth > innerWidth"))
    check("phone: no console errors", not b.errors())

with Browser(9403, "prof-hero-r", 1440, 900) as b:
    b.cmd("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])
    b.go(URL, 1)
    check("reduced motion: the rest line at once", abs(b.js(X) - 46) < 1, f"{b.js(X):.1f}")

print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
