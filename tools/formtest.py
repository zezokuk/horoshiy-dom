"""The lead form's live details (20.10) on a computer and a phone: the line under the phone fills while typing, a tick
when the number is complete, the success card draws a house with a lit window. Sends one real lead per device and
deletes them through the admin API. Needs `npm run dev`. Shots: tools/.shots/form_<d|m>_<half|full|done>.png

    python tools/formtest.py
"""
import json, os, sqlite3, sys, time, urllib.parse, urllib.request
from cdp import Browser

H = "horoshiy.localhost:3000"
NAME = "Тест формы (formtest)"
ok = True


def check(name, cond, info=""):
    global ok
    ok &= bool(cond)
    print("PASS" if cond else "FAIL", name, info)


FORM = "#lead form"
for w, h, mob, dev, port in [(1440, 900, False, "d", 9386), (390, 844, True, "m", 9387)]:
    with Browser(port, f"prof-form-{dev}", w, h, mobile=mob) as b:
        b.go(f"http://{H}/about", 3)
        b.js("document.querySelector('.cookie button')?.click()")
        b.js(f"document.querySelector('{FORM}').scrollIntoView({{block: 'center'}})")
        time.sleep(0.5)
        # focus by JS: html has smooth scrolling, a click can land while the page still moves
        b.js(f"document.querySelector('{FORM} input[name=name]').focus()")
        b.type(NAME)
        b.js(f"document.querySelector('{FORM} input[type=tel]').focus()")
        b.type("96541")
        time.sleep(0.4)
        half = json.loads(b.js(f"(() => {{ const s = document.querySelector('{FORM} .form__phone'); return JSON.stringify({{fill: getComputedStyle(s).getPropertyValue('--fill').trim(), full: s.classList.contains('is-full'), w: s.querySelector('.form__fill').getBoundingClientRect().width, W: s.getBoundingClientRect().width}}) }})()"))
        check(f"{dev}: half the number → the line is half full, no tick", half["fill"] == "0.5" and not half["full"] and 0.35 < half["w"] / half["W"] < 0.6, half)
        b.shot(f"form_{dev}_half.png")
        b.type("49393")
        time.sleep(0.5)
        full = b.js(f"document.querySelector('{FORM} .form__phone').classList.contains('is-full') && getComputedStyle(document.querySelector('{FORM} .form__tick')).opacity")
        check(f"{dev}: complete number → tick shown", full == "1", full)
        b.shot(f"form_{dev}_full.png")
        b.js(f"document.querySelector('{FORM} input[name=consent]').click(); document.querySelector('{FORM} button[type=submit]').click()")
        done = b.wait("!!document.querySelector('#lead .form__ok .form__house')", 30)
        time.sleep(1.8)
        lit = b.js("getComputedStyle(document.querySelector('#lead .form__house rect')).opacity")
        check(f"{dev}: sent → the house is drawn and its window is lit", done and lit == "1", lit)
        b.js("document.querySelector('#lead').scrollIntoView({block: 'center'})")
        b.shot(f"form_{dev}_done.png")
        check(f"{dev}: no console errors", not b.errors())

# clean up through the admin API, as smoke.py does
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
login = urllib.request.Request("http://127.0.0.1:3000/api/users/login", data=json.dumps({"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}).encode(), headers={"Host": H, "Content-Type": "application/json"})
token = json.loads(urllib.request.urlopen(login, timeout=120).read())["token"]
urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:3000/api/leads?where[name][equals]={urllib.parse.quote(NAME)}", method="DELETE", headers={"Host": H, "Authorization": f"JWT {token}"}), timeout=120).read()
left = sqlite3.connect(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "platform.db")).execute("select count(*) from leads where name = ?", (NAME,)).fetchone()[0]
check("test leads deleted", left == 0, f"left {left}")
print("ALL OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
