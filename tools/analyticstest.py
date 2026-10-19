"""Analytics must never cost a lead (Yandex outages 18.10: Direct and Metrika were down for hours).

The server runs with test counter ids:
    $env:NEXT_PUBLIC_YM_ID='12345678'; $env:NEXT_PUBLIC_VK_PIXEL_ID='1234567'; npm run dev
    python tools/analyticstest.py

1. Counters work: the page asks for Metrika and the VK pixel; a phone click and a sent form fire goals in both.
2. Metrika and VK are blocked (as during an outage or with an ad blocker): the page has no errors, the form is sent,
   the lead is saved with its ad source (utm + yclid from the landing URL) and the first page of the visit.
3. The cookie notice shows once and does not cover the phone's sticky bar. Test leads are deleted.
"""
import json, os, sqlite3, sys, time, urllib.parse, urllib.request
from cdp import Browser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
db = sqlite3.connect(os.path.join(ROOT, "platform.db"))
results = []
STAMP = int(time.time())
names = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def send_form(b, name):
    b.js("document.querySelector('#lead').scrollIntoView({behavior:'instant'})")
    b.click("#lead input[name=name]")
    b.type(name)
    b.click("#lead input[name=phone]")
    b.type("9654149393")
    b.js("document.querySelector('#lead input[name=consent]').click()")
    b.js("document.querySelector('#lead button[type=submit]').click()")
    names.append(name)
    for _ in range(30):
        r = db.execute("select source, landing, utm from leads where name = ?", (name,)).fetchone()
        if r:
            return r
        time.sleep(0.5)
    return None


SPY = """(()=>{window.__goals=[];const w=window;
  const t=setInterval(()=>{ if(w.ym && !w.ym.__spy){const o=w.ym;w.ym=function(){__goals.push('ym:'+[...arguments].slice(1,3).join(':'));return o.apply(this,arguments)};w.ym.__spy=1}
    if(w._tmr && !w._tmr.__spy){const p=w._tmr.push.bind(w._tmr);w._tmr.push=e=>{__goals.push('vk:'+(e.goal||e.type));return p(e)};w._tmr.__spy=1} },50);
  setTimeout(()=>clearInterval(t),20000)})()"""

try:
    # ---- 1. counters on
    with Browser(9370, "prof-analytics", 1440, 900) as b:
        b.cmd("Network.enable")
        b.go(f"http://krd.{H}/houses/di-tip12", 6)
        reqs = [e["params"]["request"]["url"] for e in b.events if e.get("method") == "Network.requestWillBeSent"]
        check("Metrika and the VK pixel are requested", any("mc.yandex.ru" in u for u in reqs) and any("top-fragment.mail.ru" in u for u in reqs),
              str([u[:40] for u in reqs if "yandex" in u or "mail.ru" in u][:3]))
        b.js(SPY)
        time.sleep(0.5)
        # the click is counted, but the headless browser must not actually leave for the tel: link
        b.js("(()=>{const a=document.querySelector('a[href^=\"tel:\"]');a.addEventListener('click',e=>e.preventDefault(),{once:true});a.click()})()")
        time.sleep(0.5)
        r = send_form(b, f"Аналитика вкл {STAMP}")
        time.sleep(1)
        goals = b.js("window.__goals") or []
        check("phone click and the sent form fire goals in Metrika and VK",
              {"ym:reachGoal:phone_click", "ym:reachGoal:lead_submit", "vk:phone_click", "vk:lead_submit"} <= set(goals), str(goals))
        check("…and the lead is saved", r is not None, str(r))

    # ---- 2. counters blocked
    with Browser(9371, "prof-analytics-blocked", 1440, 900) as b:
        b.cmd("Network.enable")
        b.cmd("Network.setBlockedURLs", urls=["*mc.yandex.ru*", "*top-fragment.mail.ru*", "*yandex.ru/metrika*"])
        b.errors()
        landing = f"http://krd.{H}/objects/dinskaya?utm_source=yandex&utm_medium=cpc&utm_campaign=dinskaya&yclid=777"
        b.go(landing, 6)
        b.go(f"http://krd.{H}/houses/di-tip12", 5)  # the visitor walks on, then sends the form
        errs = [e for e in b.errors() if "ERR_BLOCKED" not in e and "net::" not in e]
        r = send_form(b, f"Аналитика блок {STAMP}")
        utm = json.loads(r[2]) if r and r[2] else {}
        check("blocked counters: no page errors", not errs, str(errs[:2]))
        check("blocked counters: the lead is saved with its ad source and click id", r and r[0] == "Реклама: yandex (cpc / dinskaya)" and utm.get("yclid") == "777", str(r))
        check("…and the first page of the visit", r and r[1] and "/objects/dinskaya" in r[1], str(r and r[1]))

    # ---- 3. cookie notice on a phone
    with Browser(9372, "prof-analytics-phone", 390, 844, mobile=True) as b:
        b.go(f"http://krd.{H}/", 5)
        box = b.js("JSON.stringify(document.querySelector('.cookie')?.getBoundingClientRect() || null)")
        bar = b.js("JSON.stringify(document.querySelector('.sticky-cta')?.getBoundingClientRect() || null)")
        box, bar = json.loads(box), json.loads(bar)
        check("phone: the cookie notice is shown above the sticky bar, not over it", box and bar and box["bottom"] <= bar["top"] - 4, f"{box and round(box['bottom'])} vs {bar and round(bar['top'])}")
        b.js("document.querySelector('.cookie button').click()")
        time.sleep(0.3)
        b.go(f"http://krd.{H}/", 4)
        check("…«Понятно» hides it for good", not b.js("!!document.querySelector('.cookie')"))
finally:
    t = json.loads(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:3000/api/users/login", data=json.dumps(
        {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}).encode(), method="POST",
        headers={"Host": H, "Content-Type": "application/json"}), timeout=60).read())["token"]
    for n in names:
        urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:3000/api/leads?where[name][equals]={urllib.parse.quote(n)}", method="DELETE",
                                                      headers={"Host": H, "Authorization": f"JWT {t}"}), timeout=60).read()
    left = db.execute("select count(*) from leads where name like 'Аналитика%'").fetchone()[0]
    check("test leads deleted", left == 0, str(left))
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
