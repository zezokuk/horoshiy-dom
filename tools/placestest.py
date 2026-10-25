"""Places explorer: order, selection, planned fallback, links, SVG analytics, region fan. No records are created."""

import sys, time
from cdp import Browser

results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def last_name(b, selector):
    return b.js(f"document.querySelector('{selector}')?.textContent.replace(/\u00ad/g, '') || ''")


with Browser(9434, "prof-places-test-d", 1440, 900) as b:
    b.go("http://horoshiy.localhost:3000/", 2)
    b.js("document.querySelector('#places').scrollIntoView({block:'center',behavior:'instant'})")
    time.sleep(.3)
    check("home: «Скоро» is last", "Нововеличковская" in last_name(b, ".places-explorer__list li:last-child button"))

    b.click(".places-explorer__list li:nth-child(3) button")
    check("selection updates the card", b.js("document.querySelector('.places-explorer__info h3').textContent") == "Динская")
    check("selection updates the map", b.js("document.querySelector('.pmap__spot.is-active')?.getAttribute('aria-current')") == "location")

    b.click(".places-explorer__list li:last-child button")
    check("planned: honest empty state", b.js("document.querySelector('.places-explorer__info h3').textContent") == "Нововеличковская" and b.js("!!document.querySelector('.places-explorer__empty')"))

    b.click(".places-explorer__list li:nth-child(3) button")
    b.click(".places-explorer__info a")
    b.wait("location.pathname.includes('/objects/dinskaya')", 20)
    check("card link opens the estate", "dinskaya" in b.js("location.href"), b.js("location.href"))

    b.go("http://horoshiy.localhost:3000/", 2)
    b.js("document.querySelector('#places').scrollIntoView({block:'center',behavior:'instant'})")
    time.sleep(.3)
    b.click(".places-explorer__list li:nth-child(3) button")
    b.click(".pmap__spot.is-active")
    b.wait("location.pathname.includes('/objects/dinskaya')", 20)
    check("SVG map link opens the estate", "dinskaya" in b.js("location.href"), b.js("location.href"))
    check("SVG link and analytics: no console errors", not b.errors(), str(b.errors()))

    b.go("http://krd.horoshiy.localhost:3000/", 2)
    check("region fan: «Скоро» is last", "Нововеличковская" in last_name(b, ".ef__w:last-of-type") or "Нововеличковская" in b.js("Array.from(document.querySelectorAll('.ef__w')).at(-1)?.getAttribute('aria-label') || ''"))

with Browser(9435, "prof-places-test-m", 390, 844, mobile=True) as b:
    b.go("http://horoshiy.localhost:3000/", 2)
    b.js("document.querySelector('#places').scrollIntoView({block:'center',behavior:'instant'})")
    time.sleep(.3)
    b.click(".places-explorer__list li:last-child button")
    check("phone: planned can be selected", b.js("document.querySelector('.places-explorer__info h3').textContent") == "Нововеличковская")
    check("phone: no sideways page scroll", not b.js("document.documentElement.scrollWidth > innerWidth"))
    check("phone: no console errors", not b.errors(), str(b.errors()))

print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
