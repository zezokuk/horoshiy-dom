"""The video route (platform/VIDEO.md) step by step at 1440×900, as it will be recorded: one screenshot per moment
in tools/.shots/route_*.png and the console errors of every page. Look at the pictures: empty blocks, «0», dashes,
wrong plurals, cut text.

    python tools/routeshots.py        (npm start or npm run dev first)
"""
import os, sys, time
from cdp import Browser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
K = f"krd.{H}"
bad = []


def step(b, name, url=None, js=None, settle=3, full=False):
    if url:
        b.go(url, settle)
    if js:
        b.js(js)
        time.sleep(settle)
    path = b.shot(f"route_{name}.png", full=full)
    errs = [e for e in b.errors() if "React DevTools" not in e]
    print(f"{name:28s} {'errors: ' + str(errs[:2]) if errs else 'ok'}  {os.path.basename(path)}")
    if errs:
        bad.append(name)


with Browser(9364, "prof-route", 1440, 900) as b:
    step(b, "1a-home", f"http://{H}/", settle=4)
    step(b, "1b-home-two-ways", js="document.getElementById('choose').scrollIntoView({behavior:'instant'})")
    step(b, "1c-home-places", js="document.querySelector('.places').scrollIntoView({block:'center',behavior:'instant'})")
    step(b, "2a-region", f"http://{K}/", settle=4)
    step(b, "2b-region-map", js="document.getElementById('estates').scrollIntoView({behavior:'instant'})", settle=5)
    step(b, "2c-region-cards", js="document.querySelector('#estates .grid').scrollIntoView({block:'center',behavior:'instant'})")
    step(b, "3a-dinskaya", f"http://{K}/objects/dinskaya", settle=4)
    b.js("document.querySelector('#genplan .genplan').scrollIntoView({block:'center',behavior:'instant'})")
    time.sleep(1)
    b.js("document.querySelector('.g3--poster, button.g3--loading')?.click()")
    b.wait("!!document.querySelector('.g3__stage canvas') && document.querySelectorAll('.g3-label').length>0", 120)
    step(b, "3b-dinskaya-3d", js="document.querySelector('.g3__stage').scrollIntoView({block:'center',behavior:'instant'})", settle=6)
    step(b, "4a-house-tip12", f"http://{K}/houses/di-tip12", settle=4)
    step(b, "4b-house-plan", js="document.querySelector('.tour').scrollIntoView({block:'center',behavior:'instant'})")
    step(b, "4c-house-circle", js="document.querySelector('.tour__dot').click()", settle=2)
    b.js("document.querySelector('.tour__modal')?.close()")
    step(b, "4d-house-mortgage", js="document.getElementById('mortgage').scrollIntoView({behavior:'instant'})")
    step(b, "5a-build", f"http://{H}/build", settle=5)
    step(b, "5b-build-mid", js="scrollTo({top: innerHeight*1.3, behavior:'instant'})", settle=3)
    step(b, "5c-build-done", js="scrollTo({top: innerHeight*2.7, behavior:'instant'})", settle=3)
    step(b, "6-novovelichkovskaya", f"http://{K}/objects/novovelichkovskaya", settle=4)
    step(b, "6b-novovelichkovskaya-form", js="document.getElementById('soon').scrollIntoView({behavior:'instant'})")
    b.go(f"http://{H}/admin/login", 4)
    if b.js("!!document.querySelector('input[name=email]')"):
        b.click("input[name=email]"); b.type(ENV["SEED_ADMIN_EMAIL"])
        b.click("input[name=password]"); b.type(ENV["SEED_ADMIN_PASSWORD"])
        b.click("button[type=submit]")
        b.wait("!location.pathname.includes('/login')", 60)
        time.sleep(3)
    b.errors()
    step(b, "7a-admin-houses", f"http://{H}/admin/collections/houses?where[estate][equals]=5&sort=price", settle=5)
    step(b, "7b-admin-house-create", f"http://{H}/admin/collections/houses/create", settle=5)
    step(b, "7c-admin-leads", f"http://{H}/admin/collections/leads", settle=5)
    step(b, "8-llms", f"http://{H}/llms.txt", settle=2)
print("console errors on:", bad or "none")
sys.exit(1 if bad else 0)
