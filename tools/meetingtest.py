"""What changed after the meeting with the client (14.10), end to end.

1. «Южный ветер» is sold out: offered nowhere (no free house cards, catalogs, 3D showcase), shown as the company's scale
   («продан · 34 дома») on the home page and in «О компании».
2. Нововеличковская is a «soon» estate: on the region page, the map list and /locations; its page has no numbers, only
   «Узнать о старте продаж»; the lead from there is «на будущее» and linked to the estate.
3. A lead shows where it came from: the bottom form on a house page -> the lead links to the house and its estate,
   source «Прямой заход»; a lead with UTM -> «Реклама: …».
All test leads are deleted at the end.

    python tools/meetingtest.py        (npm run dev first)
"""
import json, os, re, sqlite3, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
import websocket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(ROOT, "tools", ".shots")
results = []
db = sqlite3.connect(os.path.join(ROOT, "platform.db"))
STAMP = int(time.time())


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def req(url, data=None, method=None, token=None):
    p = urllib.parse.urlsplit(url)
    headers = {"Host": p.netloc, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"JWT {token}"
    r = urllib.request.Request(f"http://127.0.0.1:3000{p.path}{'?' + p.query if p.query else ''}",
                               data=json.dumps(data).encode() if data is not None else None, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=180) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def text(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", html, flags=re.S)))


# ---- 1. «Южный ветер» sold out
s, home = req(f"http://{H}/")
check("home: «Южный ветер» in the places band as sold, with its 34 houses", re.search(r"Южный ветер</b><span>продан · 34 дома", home), "")
check("home: no house of «Южный ветер» offered", "houses/yv-" not in home)
s, krd = req(f"http://krd.{H}/")
check("region: no free house card of «Южный ветер»", s == 200 and "houses/yv-" not in krd, str(s))
show = re.search(r"Посмотрите на «([^»]+)»", text(krd))
check("region: the 3D showcase is an estate with free houses, not «Южный ветер»", show and show.group(1) != "Южный ветер", show and show.group(1))
for url in [f"http://{H}/catalog", f"http://krd.{H}/catalog"]:
    # the catalog data has every house (unticking «только свободные» shows the sold ones with their badge); none of them free
    s, body = req(url)
    found = re.findall(r'\\?"status\\?":\\?"(\w+)\\?",[^{}]*?\\?"estateSlug\\?":\\?"yuzhnyy-veter', body)
    offered = [m for m in found if m != "sold"]
    check(f"catalog {url.split('//')[1]}: every house of «Южный ветер» is «sold»", s == 200 and found and not offered, f"{s} found {len(found)}, not sold: {offered}")
s, cat = req(f"http://krd.{H}/catalog")
check("catalog: no «Нововеличковская» in the estate filter (it has no houses yet)", "Нововеличковская" not in text(cat))
s, about = req(f"http://{H}/about")
t = text(about)
check("about: «Уже построили и продали» with «Южный ветер», 34 дома", "Уже построили и продали" in t and "Южный ветер" in t and "34 дома · продан полностью" in t)
s, est = req(f"http://krd.{H}/objects/yuzhnyy-veter")
check("estate page «Южный ветер»: «Все дома проданы», no «0 свободно»", s == 200 and "Все дома проданы" in est and "свободно сейчас" not in est, str(s))

# ---- 2. Нововеличковская «скоро»
check("region: Нововеличковская listed with «Старт продаж скоро»", "Нововеличковская" in krd and "Старт продаж скоро" in krd)
s, loc = req(f"http://{H}/locations")
check("locations: Нововеличковская on the list", s == 200 and "Нововеличковская" in loc, str(s))
s, nv = req(f"http://krd.{H}/objects/novovelichkovskaya")
tn = text(nv)
main = tn.split("Узнать о старте продаж первыми")[0]  # the page itself, before the shared form and footer
check("its page: «Узнать о старте продаж», no prices, house counts or plan", s == 200 and "Узнать о старте продаж" in tn and "₽" not in main
      and "свободно" not in main and "домов в проекте" not in main and "Выберите дом в 3D" not in tn, str(s))

# ---- 3. leads: from the pages, in a browser
proc = subprocess.Popen([EDGE, "--headless=new", "--remote-debugging-port=9351", "--remote-allow-origins=*", f"--user-data-dir={OUT}\\prof-meet",
                         "--window-size=1440,900", "about:blank"])
names = []
try:
    for _ in range(50):
        try:
            page = next(x for x in json.load(urllib.request.urlopen("http://127.0.0.1:9351/json")) if x["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180)
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

    def send_form(url, form_sel, name):
        cmd("Page.navigate", url=url)
        time.sleep(6)
        js(f"document.querySelector('{form_sel}').scrollIntoView()")
        js(f"document.querySelector('{form_sel} input[name=name]').focus()")
        cmd("Input.insertText", text=name)
        js(f"document.querySelector('{form_sel} input[name=phone]').focus()")
        cmd("Input.insertText", text="9654149393")
        js(f"document.querySelector('{form_sel} input[name=consent]').click()")
        js(f"document.querySelector('{form_sel} button[type=submit]').click()")
        names.append(name)
        for _ in range(20):
            row = db.execute("select house_id, estate_id, source, interest, page from leads where name = ?", (name,)).fetchone()
            if row:
                return row
            time.sleep(0.5)
        return None

    cmd("Page.enable")
    house = db.execute("select id, estate_id from houses where code = 'di-tip1'").fetchone()
    row = send_form(f"http://krd.{H}/houses/di-tip1", "#lead form", f"Встреча дом {STAMP}")
    check("bottom form on a house page: the lead links to the house and its estate, source «Прямой заход»",
          row and row[0] == house[0] and row[1] == house[1] and row[2] == "Прямой заход", str(row))
    nv_id = db.execute("select id from estates where slug = 'novovelichkovskaya'").fetchone()[0]
    row = send_form(f"http://krd.{H}/objects/novovelichkovskaya", "#soon form", f"Встреча старт {STAMP}")
    check("«Узнать о старте продаж»: lead «на будущее», linked to Нововеличковская", row and row[1] == nv_id and row[3] == "future", str(row))
    ws.close()
finally:
    proc.terminate()

name = f"Встреча реклама {STAMP}"
names.append(name)
s, body = req(f"http://krd.{H}/api/leads/submit", {"name": name, "phone": "+7 (965) 414-93-93", "consent": "on", "region": "krd",
                                                   "page": f"http://krd.{H}/objects/dinskaya", "ref": "https://yandex.ru/search/?text=dom",
                                                   "utm": {"utm_source": "yandex", "utm_medium": "cpc", "utm_campaign": "dinskaya"}})
row = db.execute("select source, estate_id from leads where name = ?", (name,)).fetchone()
dinskaya = db.execute("select id from estates where slug = 'dinskaya'").fetchone()[0]
check("lead with UTM: «Реклама: yandex (cpc / dinskaya)», estate from the page address", row and row[0] == "Реклама: yandex (cpc / dinskaya)" and row[1] == dinskaya, str(row))

s, body = req(f"http://{H}/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")
token = json.loads(body)["token"]

# ---- 4. a change in the admin is on the site at once (the video moment «продан → красный»), even on the cached prod build
hid = db.execute("select id from houses where code = 'di-tip5-v3'").fetchone()[0]
pat = r'\\?"code\\?":\\?"di-tip5-v3\\?"[^{}]*?\\?"status\\?":\\?"(\w+)'
req(f"http://krd.{H}/objects/dinskaya")  # warm the page cache first
home_count = lambda html: (re.search(r"Динская</b><span>(\d+)", html) or [None, None])[1]
before = home_count(req(f"http://{H}/")[1])
try:
    req(f"http://{H}/api/houses/{hid}", {"status": "sold"}, "PATCH", token)
    s, est = req(f"http://krd.{H}/objects/dinskaya")
    now = re.search(pat, est)
    check("status «Продан» in the admin → the estate page shows it on the next load", now and now.group(1) == "sold", now and now.group(1))
    time.sleep(1)
    req(f"http://{H}/")  # a static page may answer once from the old cache while it rebuilds
    after = home_count(req(f"http://{H}/")[1])
    check("…and the home page counts one free house less", before and after and int(after) == int(before) - 1, f"{before} → {after}")
finally:
    req(f"http://{H}/api/houses/{hid}", {"status": "free"}, "PATCH", token)
s, est = req(f"http://krd.{H}/objects/dinskaya")
back = re.search(pat, est)
check("…and back to «Свободен»", back and back.group(1) == "free", back and back.group(1))

# ---- clean up
for n in names:
    req(f"http://{H}/api/leads?where[name][equals]={urllib.parse.quote(n)}", None, "DELETE", token)
left = db.execute(f"select count(*) from leads where name like 'Встреча %'").fetchone()[0]
check("test leads deleted", left == 0, str(left))
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
