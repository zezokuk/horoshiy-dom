"""Promos and the «what are you after» form, end to end.

1. Logs into the admin API, creates a company-wide promo and a Krasnodar one, checks where they show
   (home + /locations: both; krd region: both; msk region: only the company-wide one), an expired one is hidden,
   then deletes them.
2. In a browser: the bottom form on the home page, «Пока присматриваюсь» + name + phone + consent -> the lead is saved
   with interest = future and the thank-you text is the «we'll write about promos» one.

    python tools/promotest.py        (npm run dev first)
"""
import json, os, sqlite3, subprocess, sys, time, urllib.request
import websocket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def req(url, data=None, method=None, token=None):
    p = urllib.parse.urlsplit(url)
    target = f"http://127.0.0.1:3000{p.path}{'?' + p.query if p.query else ''}"
    headers = {"Host": p.netloc, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"JWT {token}"
    r = urllib.request.Request(target, data=json.dumps(data).encode() if data is not None else None, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


import urllib.parse  # noqa: E402

s, body = req(f"http://{H}/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")
token = json.loads(body).get("token") if s == 200 else None
check("admin login", token, str(s))
db = sqlite3.connect(os.path.join(ROOT, "platform.db"))
krd = db.execute("select id from regions where slug='krd'").fetchone()[0]
made = []
for data in [
    {"title": "ТЕСТ акция для всех", "text": "проверка", "active": True},
    {"title": "ТЕСТ акция Краснодар", "region": krd, "active": True, "link": "/catalog", "cta": "Смотреть дома"},
    {"title": "ТЕСТ акция прошедшая", "active": True, "until": "2020-01-01"},
]:
    s, body = req(f"http://{H}/api/promos", data, "POST", token)
    doc = json.loads(body).get("doc", {})
    made.append(doc.get("id"))
    check(f"create «{data['title']}»", s == 201 and doc.get("id"), str(s))
try:
    time.sleep(1)
    for name, url, want, not_want in [
        ("home", f"http://{H}/", ["ТЕСТ акция для всех", "ТЕСТ акция Краснодар", "Акция · Краснодар"], ["ТЕСТ акция прошедшая"]),
        ("locations", f"http://{H}/locations", ["ТЕСТ акция для всех", "ТЕСТ акция Краснодар"], ["ТЕСТ акция прошедшая"]),
        ("region krd", f"http://krd.{H}/", ["ТЕСТ акция для всех", "ТЕСТ акция Краснодар", "Смотреть дома", 'href="/catalog"'], ["ТЕСТ акция прошедшая"]),
        ("region msk (soon): no promo block on the waitlist page", f"http://msk.{H}/", [], ["ТЕСТ акция Краснодар"]),
    ]:
        s, body = req(url)
        miss = [w for w in want if w not in body]
        extra = [w for w in not_want if w in body]
        check(f"promos on {name}", s == 200 and not miss and not extra, f"{s} missing {miss} unexpected {extra}")
finally:
    for i in made:
        if i:
            req(f"http://{H}/api/promos/{i}", None, "DELETE", token)
    left = db.execute("select count(*) from promos where title like 'ТЕСТ%'").fetchone()[0]
    check("test promos deleted", left == 0, str(left))

# ---- browser: the bottom form with «Пока присматриваюсь»
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(ROOT, "tools", ".shots")
proc = subprocess.Popen([EDGE, "--headless=new", "--remote-debugging-port=9346", "--remote-allow-origins=*", f"--user-data-dir={OUT}\\prof-promo", "about:blank"])
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9346/json")) if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=120)
    mid = [0]

    def cmd(m, **p):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": m, "params": p}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == mid[0]:
                return msg.get("result", {})

    def js(e):
        return cmd("Runtime.evaluate", expression=e, returnByValue=True, awaitPromise=True).get("result", {}).get("value")

    cmd("Page.navigate", url=f"http://{H}/")
    time.sleep(6)
    name = f"Форма будущее {int(time.time())}"
    js("document.getElementById('lead').scrollIntoView()")
    js("[...document.querySelectorAll('#lead .form__ask button')].find(b=>b.textContent.includes('присматриваюсь')).click()")
    time.sleep(0.3)
    checked = js("[...document.querySelectorAll('#lead .form__ask button')].map(b=>b.getAttribute('aria-checked')).join(',')")
    check("chip «Пока присматриваюсь» becomes selected", checked == "false,false,true", checked)
    js(f"document.querySelector('#lead input[name=name]').focus()")
    cmd("Input.insertText", text=name)
    js("document.querySelector('#lead input[name=phone]').focus()")
    cmd("Input.insertText", text="9654149393")
    js("document.querySelector('#lead input[name=consent]').click()")
    js("document.querySelector('#lead button[type=submit]').click()")
    time.sleep(3)
    thanks = js("document.querySelector('#lead .form__ok')?.textContent || ''")
    check("thank-you text promises promos, not a call", "акциях" in thanks, repr(thanks[:90]))
    row = db.execute("select interest, phone from leads where name = ?", (name,)).fetchone()
    check("lead saved with interest = future", row and row[0] == "future", str(row))
    req(f"http://{H}/api/leads?where[name][equals]={urllib.parse.quote(name)}", None, "DELETE", token)
    left = db.execute("select count(*) from leads where name = ?", (name,)).fetchone()[0]
    check("test lead deleted", left == 0, str(left))
    ws.close()
finally:
    proc.terminate()
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
