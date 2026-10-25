"""Real-homes carousel: autoplay only in view, pause controls, swipe, reduced motion. No records are created."""

import json, sys, time
from cdp import Browser

H = "http://horoshiy.localhost:3000/"
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def counter(b):
    return b.js("document.querySelector('.real-homes__counter')?.textContent.trim().slice(0, 2)")


def scroll_stage(b):
    b.js("document.querySelector('.real-homes__stage').scrollIntoView({block: 'center', behavior: 'instant'})")
    time.sleep(.3)


with Browser(9430, "prof-real-homes-d", 1440, 900) as b:
    b.go(H, 1)
    time.sleep(7.3)
    check("offscreen: the first house stays", counter(b) == "01", counter(b))

    scroll_stage(b)
    check("in view: autoplay advances", b.wait(f"document.querySelector('.real-homes__counter')?.textContent.trim().startsWith('02')", 10), counter(b))

    r = json.loads(b.js("JSON.stringify(document.querySelector('.real-homes__stage').getBoundingClientRect())"))
    b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=r["x"] + r["width"] / 2, y=r["y"] + r["height"] / 2)
    time.sleep(7.3)
    check("hover: autoplay is paused", counter(b) == "02" and b.js("document.querySelector('.real-homes').dataset.playing") == "no", counter(b))

    b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=8, y=8)
    check("mouse leaves: autoplay resumes", b.wait(f"document.querySelector('.real-homes__counter')?.textContent.trim().startsWith('03')", 10), counter(b))

    b.click(".real-homes__toggle")
    time.sleep(7.3)
    check("pause button: the same house stays", counter(b) == "03", counter(b))

    b.click(".real-homes__controls button:last-child")
    check("next: wraps to the first house", counter(b) == "01", counter(b))
    b.click(".real-homes__controls button:first-child")
    check("previous: wraps back", counter(b) == "03", counter(b))
    b.click(".real-homes__selector button:nth-child(2)")
    check("selector: chooses a house", counter(b) == "02", counter(b))

    b.click("a[data-house-photo]")
    b.wait("location.pathname.includes('/houses/')", 20)
    check("the active house opens", "/houses/" in b.js("location.pathname"), b.js("location.href"))
    check("desktop: no console errors", not b.errors(), str(b.errors()))

with Browser(9431, "prof-real-homes-m", 390, 844, mobile=True) as b:
    b.go(H, 1)
    scroll_stage(b)
    b.click(".real-homes__toggle")
    b.click(".real-homes__controls button:last-child")
    r = json.loads(b.js("JSON.stringify(document.querySelector('.real-homes__media').getBoundingClientRect())"))
    x, y = r["x"] + r["width"] * .75, r["y"] + r["height"] / 2
    b.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
    for i in range(1, 7):
        b.cmd("Input.dispatchTouchEvent", type="touchMove", touchPoints=[{"x": x - i * 20, "y": y}])
        time.sleep(.03)
    b.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    time.sleep(.4)
    check("phone: a horizontal swipe changes the house", counter(b) == "03", counter(b))
    check("phone: no sideways page scroll", not b.js("document.documentElement.scrollWidth > innerWidth"))
    check("phone: no console errors", not b.errors(), str(b.errors()))

with Browser(9432, "prof-real-homes-reduced", 390, 844, mobile=True) as b:
    b.cmd("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])
    b.go(H, 1)
    scroll_stage(b)
    time.sleep(7.3)
    check("reduced motion: no autoplay", counter(b) == "01", counter(b))
    check("reduced motion: no autoplay toggle", b.js("!document.querySelector('.real-homes__toggle')"))
    check("reduced motion: no progress animation", b.js("document.querySelector('.real-homes').dataset.playing") == "no")

print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
