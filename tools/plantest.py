"""Plan render with room areas (components/PlanRender) on the «Тип 5» project page and its houses.

Checks: the render and 8 room labels are shown, a room in the list lights its label, «Чертёж» swaps in the client's
plan (labels gone) and back, the «мебель для примера» note is there, no sideways scroll on a phone; a house with the
project's own plan shows the render, a «Тип 5 (В2)» house (another layout) keeps its own plan.

    python tools/plantest.py        (npm run dev first)
"""
import sys, time
from cdp import Browser

R = "horoshiy.localhost:3000"
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


for size, w, h, mob, port in [("desktop", 1440, 900, False, 9395), ("phone", 390, 844, True, 9396)]:
    with Browser(port, f"prof-plan-{size}", w, h, mobile=mob) as b:
        b.go(f"http://{R}/projects/tip-5", 2)
        b.wait("document.querySelector('.pr__stage img')?.complete", 30)
        n = b.js("document.querySelectorAll('.pr__room').length")
        alt = b.js("document.querySelector('.pr__stage img')?.alt")
        check(f"{size}: render with room labels", n == 8 and "визуализация" in (alt or ""), f"{n} labels, alt «{alt}»")
        b.click(".pr__list li:first-child button")
        time.sleep(0.4)
        lit = b.js("[...document.querySelectorAll('.pr__room.is-on b')].map(e=>e.textContent)")
        check(f"{size}: list lights its room", lit == ["27,2 м²"], repr(lit))
        b.click(".pr__tabs button:nth-child(2)")
        time.sleep(0.4)
        alt2 = b.js("document.querySelector('.pr__stage img')?.alt")
        n2 = b.js("document.querySelectorAll('.pr__room').length")
        check(f"{size}: «Чертёж» shows the client's plan", n2 == 0 and alt2 and "визуализация" not in alt2, f"alt «{alt2}», labels {n2}")
        b.click(".pr__tabs button:nth-child(1)")
        time.sleep(0.4)
        check(f"{size}: back to «3D-вид»", b.js("document.querySelectorAll('.pr__room').length") == 8)
        check(f"{size}: note «мебель для примера»", "мебель — для примера" in (b.js("document.querySelector('.pr__note')?.textContent") or ""))
        check(f"{size}: no sideways scroll", not b.js("document.documentElement.scrollWidth > innerWidth"))
        # every label sits inside the picture
        out = b.js("(()=>{const s=document.querySelector('.pr__stage').getBoundingClientRect();return [...document.querySelectorAll('.pr__room')]"
                   ".filter(e=>{const r=e.getBoundingClientRect();return r.left<s.left||r.right>s.right||r.top<s.top||r.bottom>s.bottom}).length})()")
        check(f"{size}: labels inside the picture", out == 0, f"{out} outside")
        check(f"{size}: no console errors", not b.errors())

with Browser(9397, "prof-plan-house", 1440, 900) as b:
    b.go(f"http://krd.{R}/houses/yv-tip5", 2)
    check("house «Тип 5» with the project's plan: render shown", b.js("document.querySelectorAll('.pr__room').length") == 8)
    b.go(f"http://krd.{R}/houses/ka-tip5-v2-a", 2)
    check("house «Тип 5 (В2)», another layout: own plan, no render",
          b.js("!document.querySelector('.pr') && !!document.querySelector('.hs__plan .plan img')"))

print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
