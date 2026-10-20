"""The estate's 3D plan as a scene with filters (reference «HAVN», 20.10): a filter changes the count, the ribbon of
free houses and greys out the price tags of the houses that do not pass in 3D; «Сбросить» brings everything back;
a ribbon card selects its house. Needs `npm run dev`.

    python tools/filtertest.py [estate slug, default dinskaya]
"""
import json, sys, time
from cdp import Browser

H = "horoshiy.localhost:3000"
slug = sys.argv[1] if len(sys.argv) > 1 else "dinskaya"
ok = True


def check(name, cond, info=""):
    global ok
    ok &= bool(cond)
    print("PASS" if cond else "FAIL", name, info)


STATE = """JSON.stringify({
  head: document.querySelector('.gf__tile--head b')?.textContent,
  cards: document.querySelectorAll('.gr li').length,
  tags: document.querySelectorAll('.g3-label').length,
  off: document.querySelectorAll('.g3-label.is-off').length,
  on: document.querySelector('.gr li.is-on .gr__title')?.textContent || null,
  overflow: document.documentElement.scrollWidth > innerWidth,
})"""

for w, h, mob, port in [(1440, 900, False, 9394), (390, 844, True, 9395)]:
    dev = "phone" if mob else "desktop"
    with Browser(port, f"prof-filter-{port}", w, h, mobile=mob) as b:
        b.go(f"http://krd.{H}/objects/{slug}", 3)
        b.js("document.querySelector('.cookie button')?.click()")
        b.js("document.querySelector('.genplan').scrollIntoView({block: 'start'})")
        b.wait("document.querySelectorAll('.g3-label').length > 0", 60)
        s0 = json.loads(b.js(STATE))
        free = int(s0["head"].split()[-1]) if s0["head"] else 0
        check(f"{dev}: all free houses in the ribbon and in 3D", free and s0["cards"] == free == s0["tags"] and s0["off"] == 0, s0)
        check(f"{dev}: no sideways scroll", not s0["overflow"])
        # the first area chip
        b.js("document.querySelector('.gf__opts button').click()")
        time.sleep(0.4)
        s1 = json.loads(b.js(STATE))
        n = int(s1["head"].split()[0])
        check(f"{dev}: a filter narrows count, ribbon and 3D together", 0 < n < free and s1["cards"] == n and s1["off"] == free - n, s1)
        # a ribbon card selects its house
        b.js("document.querySelector('.gr__pick').click()")
        time.sleep(0.3)
        s2 = json.loads(b.js(STATE))
        check(f"{dev}: a ribbon card is selected", s2["on"], s2["on"])
        b.js("document.querySelector('.gf__reset').click()")
        time.sleep(0.4)
        s3 = json.loads(b.js(STATE))
        check(f"{dev}: «Сбросить» brings all back", s3["cards"] == free and s3["off"] == 0, s3)
        check(f"{dev}: no console errors", not b.errors(), "")

        # a sold-out estate: nothing to filter — the plain plan at full width (20.10: the scene shrank into the
        # empty filters' column), no ribbon saying «no houses for this filter»
        b.go(f"http://krd.{H}/objects/yuzhnyy-veter", 3)
        sold = json.loads(b.js("JSON.stringify({stage: !!document.querySelector('.genplan--stage'), ribbon: !!document.querySelector('.gr'), view: document.querySelector('.genplan__view').getBoundingClientRect().width, box: document.querySelector('.genplan').getBoundingClientRect().width})"))
        check(f"{dev}: sold-out estate — plain plan at full width, no ribbon", not sold["stage"] and not sold["ribbon"] and sold["view"] > sold["box"] * 0.85, sold)

print("ALL OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
