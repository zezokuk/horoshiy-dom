"""3D plan on the home (#plots): how many price tags / «Уже купили» are shown and whether any two overlap, on a computer and
a phone, at the start view and after zooming in twice. Shots tools/.shots/g3tags_<d|m>_<0|1>.png (night 09→10.11).

    python tools/g3tags.py [url]
"""
import sys, time, json
from cdp import Browser

URL = sys.argv[1] if len(sys.argv) > 1 else "http://horoshiy.localhost:3000/?look=dom"
CHECK = """(() => { const ls = [...document.querySelectorAll('#plots .g3-label')].filter(e => e.style.display !== 'none');
  const r = ls.map(e => e.getBoundingClientRect()); let over = 0;
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j];
    if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) over++ }
  const all = document.querySelectorAll('#plots .g3-label').length;
  return JSON.stringify({ shown: ls.length, all, overlaps: over, bought: ls.filter(e => e.textContent.startsWith('Уже')).length }) })()"""
bad = 0
for w, h, mob, dev, port in [(1440, 900, False, "d", 9450), (390, 844, True, "m", 9451)]:
    with Browser(port, f"prof-g3-{dev}", w, h, mobile=mob) as b:
        b.go(URL, 3)
        b.js("document.querySelector('.cookie button')?.click()")
        b.js("(() => { const e = document.querySelector('#plots .g3'); e.scrollIntoView({block: 'center'}) })()")
        time.sleep(9)
        for step in (0, 1):
            if step:
                for _ in range(2):
                    b.click('#plots .g3__ctrl button[aria-label="Приблизить"]'); time.sleep(1.2)
                time.sleep(1.5)
            res = json.loads(b.js(CHECK))
            print(dev, step, res, b.shot(f"g3tags_{dev}_{step}.png"), b.errors()[:2])
            if res["overlaps"]: bad += 1
sys.exit(1 if bad else 0)
