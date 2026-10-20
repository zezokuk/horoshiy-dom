"""Motion between and on pages (reference «Bikeville», components/PageMotion + Catalog): it must really run, not just exist.

    python tools/motiontest.py     (dev server on :3000)

1. Catalog filter: a change runs a view transition (React calls document.startViewTransition), the list re-sorts, no
   console errors (two cards with one transition name would raise one).
2. Estate → house page on a region subdomain: the browser starts a cross-document view transition, and the clicked
   card's photo carries the name «house-photo» that the house page's main photo has too (the photo flies into place).
3. Hover on a computer: the card gets a green edge, leans to the pointer; a gold button fills with green.
4. Phone: no lean (nothing «stuck» after a tap).
"""
import json, sys, time
from cdp import Browser

H = "horoshiy.localhost:3000"
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


SET_SELECT = """((sel, v) => { const s = document.querySelectorAll('.filters select')[sel];
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, v);
  s.dispatchEvent(new Event('change', { bubbles: true })) })"""

with Browser(9411, "prof-motion-d", 1440, 900) as b:
    b.go(f"http://{H}/catalog", 3)
    b.js("document.querySelector('.cookie button')?.click()")
    b.errors()
    b.js("(() => { window.__vt = 0; const o = document.startViewTransition?.bind(document); if (o) document.startViewTransition = (...a) => { window.__vt++; return o(...a) } })()")
    first = b.js("document.querySelector('.grid .house-card__price')?.textContent")
    n = b.js("document.querySelectorAll('.filters select').length")
    b.js(f"{SET_SELECT}({n - 1}, 'price-desc')")
    time.sleep(1.2)
    after = b.js("document.querySelector('.grid .house-card__price')?.textContent")
    check("catalog: sorting runs a view transition", (b.js("window.__vt") or 0) >= 1, f"transitions: {b.js('window.__vt')}")
    check("…and the list re-sorts (first card changes)", first and after and first != after, f"{first} → {after}")
    check("…with no console errors", not b.errors())

    # hover: green edge, lean, gold button fill
    r = json.loads(b.js("JSON.stringify(document.querySelector('.grid .house-card').getBoundingClientRect())"))
    b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=r["x"] + r["width"] * 0.85, y=r["y"] + r["height"] * 0.3)
    time.sleep(0.6)
    st = b.js("(() => { const c = document.querySelector('.grid .house-card'); return [getComputedStyle(c).borderTopColor, c.style.getPropertyValue('--ry'), getComputedStyle(c.querySelector('.house-card__img'), '::after').transform] })()")
    check("hover: the card's edge turns green", st[0] == "rgb(69, 89, 74)", st[0])
    check("hover: the card leans towards the pointer", st[1] and float(st[1].replace("deg", "")) > 1, st[1])
    check("hover: the «Смотреть дом →» bar slides up", st[2] in ("none", "matrix(1, 0, 0, 1, 0, 0)"), st[2])
    g = json.loads(b.js("(() => { const e = document.querySelector('.btn--gold'); if (!e) return 'null'; e.scrollIntoView({block: 'center', behavior: 'instant'}); return JSON.stringify(e.getBoundingClientRect()) })()") or "null")
    check("there is a gold button to hover", g)
    if g:
        b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=g["x"] + g["width"] / 2, y=g["y"] + g["height"] / 2)
        time.sleep(0.7)
        size = b.js("getComputedStyle(document.querySelector('.btn--gold')).backgroundSize")
        check("hover: a gold button fills with green", size.startswith("100%"), size)

    # estate → house: cross-document view transition with the card photo named
    b.go(f"http://krd.{H}/objects/dinskaya", 3)
    b.js("""addEventListener('pageswap', (e) => { sessionStorage.vt = e.viewTransition ? 'yes' : 'no';
      sessionStorage.vtName = document.querySelector('[data-vt-named]')?.style.viewTransitionName || '' })""")
    href = b.js("(() => { const a = document.querySelector('a.house-card'); a.scrollIntoView({block: 'center', behavior: 'instant'}); return a.href })()")
    time.sleep(0.4)
    b.click("a.house-card")
    b.wait(f"location.href === {json.dumps(href)} && document.readyState === 'complete'", 60)
    time.sleep(1)
    check("estate → house: a cross-document view transition ran", b.js("sessionStorage.vt") == "yes", str(b.js("sessionStorage.vt")))
    check("…the clicked card's photo was named «house-photo»", b.js("sessionStorage.vtName") == "house-photo", str(b.js("sessionStorage.vtName")))
    check("…and the house page's main photo has that name", b.js("getComputedStyle(document.querySelector('.hs__photo img')).viewTransitionName") == "house-photo")
    check("house page: no console errors", not b.errors())

    # «Выберите проект» fan on /build (reference 49d13…): hover pulls a slice out green, a click or Enter puts it in the hub
    b.go(f"http://{H}/build", 2)
    b.js("document.querySelector('#projects .pf').scrollIntoView({block: 'center', behavior: 'instant'})")
    b.wait("document.querySelectorAll('.pf__w image').length >= 11", 20)
    time.sleep(1.5)
    check("fan: 11 photo slices around the chosen project", b.js("document.querySelectorAll('.pf__w image').length") == 11)
    hub0 = b.js("document.querySelector('.pf__info b').textContent")

    def settled(expr, tries=30):
        """The page above the fan (3D, sticky blocks) may still shift it: wait until the rect stops moving."""
        prev = None
        for _ in range(tries):
            now = b.js(expr)
            if now == prev:
                return json.loads(now)
            prev = now
            time.sleep(0.3)
        return json.loads(now)

    w = settled("(() => { const r = document.querySelectorAll('.pf__w')[3].getBoundingClientRect(); return JSON.stringify([r.x, r.y, r.width, r.height].map(Math.round)) })()")
    w = {"x": w[0], "y": w[1], "width": w[2], "height": w[3]}
    b.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=w["x"] + w["width"] / 2, y=w["y"] + w["height"] / 2)
    time.sleep(0.6)
    st = b.js("(() => { const g = document.querySelectorAll('.pf__w')[3]; return [getComputedStyle(g.querySelector('.pf__edge')).stroke, getComputedStyle(g).transform] })()")
    check("fan: pointing at a slice turns its edge green and pulls it out", st[0] == "rgb(69, 89, 74)" and st[1] != "none", str(st))
    name3 = b.js("document.querySelectorAll('.pf__w')[3].getAttribute('aria-label').split(',')[0]")
    b.click(xy=(w["x"] + w["width"] / 2, w["y"] + w["height"] / 2))
    time.sleep(0.8)
    hub1 = b.js("document.querySelector('.pf__info b').textContent")
    check("fan: a click puts that project into the hub", hub1 == name3 and hub1 != hub0, f"{hub0} → {hub1}")
    b.js("document.querySelectorAll('.pf__w')[0].focus()")
    name0 = b.js("document.querySelectorAll('.pf__w')[0].getAttribute('aria-label').split(',')[0]")
    b.key("Enter", vk=13)
    time.sleep(0.6)
    check("fan: Enter on a focused slice works too", b.js("document.querySelector('.pf__info b').textContent") == name0, name0)
    link = b.js("document.querySelector('.pf__info a').href")
    check("fan: the hub link leads to that project", link.endswith(f"/projects/tip-{name0.split()[-1]}"), link)
    check("fan: no console errors", not b.errors())

with Browser(9412, "prof-motion-m", 390, 844, mobile=True) as b:
    b.go(f"http://{H}/catalog", 3)
    r = json.loads(b.js("(() => { const c = document.querySelector('.grid .house-card'); c.scrollIntoView({block: 'center', behavior: 'instant'}); return JSON.stringify(c.getBoundingClientRect()) })()"))
    b.cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": r["x"] + 40, "y": r["y"] + 40}])
    b.cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
    time.sleep(0.4)
    check("phone: no lean after a touch", not b.js("document.querySelector('.grid .house-card').style.getPropertyValue('--ry')"))

print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
