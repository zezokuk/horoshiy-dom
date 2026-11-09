"""One-off check of the cinema first screen (10.11): rest, hover on the house, past-hero header, click through to catalog."""
import io, os, sys, time, base64
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cdp import Browser

HOST = "http://horoshiy.localhost:7100"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ночь-09-11", "снимки")
os.makedirs(OUT, exist_ok=True)

def shot(b, name, w):
    im = Image.open(io.BytesIO(base64.b64decode(b.cmd("Page.captureScreenshot", format="png")["data"]))).convert("RGB")
    im.save(os.path.join(OUT, name), quality=80)
    print(name)

for w, h, mob, port in [(1440, 900, False, 9450), (390, 844, True, 9451)]:
    with Browser(port, f"prof-cinema-{w}", w, h, mobile=mob) as b:
        b.go(f"{HOST}/", 4)
        b.js("document.querySelector('.cookie button')?.click()")
        time.sleep(2.5)  # let the glow breathe in
        shot(b, f"cinema_rest_{w}.jpg", w)
        print("header hidden at rest:", b.js("getComputedStyle(document.querySelector('.header')).opacity"))
        print("house hotspot:", b.js("!!document.querySelector('.hn__house')"))
        # hover the house
        box = b.js("(()=>{const r=document.querySelector('.hn__house').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        if box:
            b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=box[0], y=box[1])
            time.sleep(0.6)
            shot(b, f"cinema_hover_{w}.jpg", w)
        # scroll past the hero: the header and the interface join
        b.js("scrollTo(0, document.querySelector('.hn').offsetHeight * 0.75)")
        time.sleep(1.2)
        shot(b, f"cinema_scrolled_{w}.jpg", w)
        print("past-hero:", b.js("document.documentElement.classList.contains('past-hero')"))
        print("header opacity after scroll:", b.js("getComputedStyle(document.querySelector('.header')).opacity"))
        # back to the top and click the house
        b.js("scrollTo(0,0)"); time.sleep(1)
        if box:
            b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=box[0], y=box[1])
            b.cmd("Input.dispatchMouseEvent", type="mousePressed", x=box[0], y=box[1], button="left", clickCount=1)
            b.cmd("Input.dispatchMouseEvent", type="mouseReleased", x=box[0], y=box[1], button="left", clickCount=1)
            time.sleep(3.5)
            print("after click url:", b.js("location.href"))
            shot(b, f"cinema_afterclick_{w}.jpg", w)
        errs = b.errors()
        print("console errors:", errs[:5] if errs else "none")
        print("sideways scroll:", b.js("document.documentElement.scrollWidth > innerWidth"))
