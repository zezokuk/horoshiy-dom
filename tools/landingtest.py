"""Promo pages of districts (ads landings, the 150 package): krd.домен.ru/p/<адрес>.

1. /p/dinskaya: offer, facts, the estate's free houses (count = the database), «что рядом»; two forms only (the hero
   one and the site-wide one), no prices shown on the coming estate's page /p/novovelichkovskaya.
2. Unknown or switched-off page → 404; a «soon» region has no promo pages; the sitemap lists active ones.
3. Leads from BOTH forms of the page (an ad click: ?utm_source=vk) carry «Промо «…»», the estate and the ad source.
Test leads are deleted, the page is switched back on.

    python tools/landingtest.py        (npm run dev or npm start first)
"""
import json, os, re, sqlite3, sys, time, urllib.error, urllib.parse, urllib.request
from cdp import Browser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
K = f"krd.{H}"
db = sqlite3.connect(os.path.join(ROOT, "platform.db"))
results = []
STAMP = int(time.time())
names = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def req(url, data=None, method=None, token=None):
    p = urllib.parse.urlsplit(url)
    h = {"Host": p.netloc, "Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"JWT {token}"
    r = urllib.request.Request(f"http://127.0.0.1:3000{p.path}{'?' + p.query if p.query else ''}", data=json.dumps(data).encode() if data is not None else None,
                               method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=180) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def text(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", html, flags=re.S))).replace(" ", " ")


token = json.loads(req(f"http://{H}/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")[1])["token"]

# ---- 1. pages
s, html = req(f"http://{K}/p/dinskaya")
t = text(html)
free = db.execute("select count(*) from houses h join estates e on e.id=h.estate_id where e.slug='dinskaya' and h.status='free'").fetchone()[0]
check("/p/dinskaya: title, offer and facts", s == 200 and "Дома в Динской от 8,8 млн" in t and "у реки" in t and "гарантия на дом" in t, str(s))
cards = html.count('class="house-card__price"')
check(f"…{free} free houses of the estate, counted right, cards shown",
      re.search(rf"{free} свободных домов в посёлке « ?Динская ?»", t) and cards == min(free, 6), f"{free} free, {cards} cards")
check("…«что рядом» in minutes and the utilities", "Что рядом" in t and "мин" in t and "Газ" in t)
check("…two forms: the hero one and the site-wide one", html.count("<form") == 2, str(html.count("<form")))
s, html = req(f"http://{K}/p/novovelichkovskaya")
t = text(html)
main = t.split("Подберём дом")[0]
check("/p/novovelichkovskaya: «Узнать о старте продаж», no prices or house counts", s == 200 and "Узнать о старте продаж" in t and "₽" not in main and "свободн" not in main, str(s))

# ---- 2. 404s and sitemap
check("unknown promo page → 404", req(f"http://{K}/p/no-such-page")[0] == 404)
check("a «soon» region has no promo pages → 404", req(f"http://msk.{H}/p/dinskaya")[0] == 404)
lid = json.loads(req(f"http://{H}/api/landings?where[slug][equals]=dinskaya&depth=0", token=token)[1])["docs"][0]["id"]
try:
    req(f"http://{H}/api/landings/{lid}", {"active": False}, "PATCH", token)
    check("switched off in the admin → 404", req(f"http://{K}/p/dinskaya")[0] == 404)
finally:
    req(f"http://{H}/api/landings/{lid}", {"active": True}, "PATCH", token)
check("…switched back on → 200", req(f"http://{K}/p/dinskaya")[0] == 200)
s, sm = req(f"http://{K}/sitemap.xml")
check("the region's sitemap lists the promo pages", s == 200 and f"http://{K}/p/dinskaya" in sm and f"http://{K}/p/novovelichkovskaya" in sm)

# ---- 3. leads from both forms after an ad click
din = db.execute("select id from estates where slug='dinskaya'").fetchone()[0]
try:
    with Browser(9376, "prof-landing", 1440, 900) as b:
        for sel, label in [("#form form", "верхняя"), ("#lead form", "общая")]:
            b.go(f"http://{K}/p/dinskaya?utm_source=vk&utm_medium=cpc&utm_campaign=dinskaya", 5)
            b.js("document.querySelector('.cookie button')?.click()")
            name = f"Промо {label} {STAMP}"
            names.append(name)
            b.js(f"document.querySelector('{sel}').scrollIntoView({{block:'center',behavior:'instant'}})")
            b.click(f"{sel} input[name=name]")
            b.type(name)
            b.click(f"{sel} input[name=phone]")
            b.type("9654149393")
            b.js(f"document.querySelector('{sel} input[name=consent]').click()")
            b.js(f"document.querySelector('{sel} button[type=submit]').click()")
            row = None
            for _ in range(30):
                row = db.execute("select context, estate_id, source, interest from leads where name = ?", (name,)).fetchone()
                if row:
                    break
                time.sleep(0.5)
            check(f"lead from the {label} form: «Промо «…»», the estate, «Реклама: vk»",
                  row and row[0] == "Промо «Дома в Динской от 8,8 млн»" and row[1] == din and row[2].startswith("Реклама: vk"), str(row))
finally:
    for n in names:
        req(f"http://{H}/api/leads?where[name][equals]={urllib.parse.quote(n)}", None, "DELETE", token)
    left = db.execute("select count(*) from leads where name like 'Промо %'").fetchone()[0]
    check("test leads deleted", left == 0, str(left))
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
