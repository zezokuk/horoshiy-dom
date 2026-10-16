"""Smoke test of the platform on the dev server: every key URL answers, region routing works, a lead is saved.

    python tools/smoke.py [base_host]        (default horoshiy.localhost:3000; run `npm run dev` first)
Checks status codes, a marker text on each page, the subdomain rewrite/redirect rules and POST /api/leads/submit.
"""
import json, os, re, sqlite3, sys, time, urllib.error, urllib.parse, urllib.request

HOST = sys.argv[1] if len(sys.argv) > 1 else "horoshiy.localhost:3000"
ok = True


def req(url, data=None, method=None):
    # Windows does not resolve krd.localhost outside browsers: connect to 127.0.0.1 and send the real Host header
    parsed = urllib.parse.urlsplit(url)
    target = urllib.parse.urlunsplit((parsed.scheme, "127.0.0.1:" + (parsed.port and str(parsed.port) or "80"), parsed.path, parsed.query, ""))
    headers = {"Host": parsed.netloc}
    if data is not None:
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(target, data=json.dumps(data).encode() if data is not None else None, method=method, headers=headers)
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(r, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), resp.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), e.headers


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def check(name, cond, info=""):
    global ok
    ok &= bool(cond)
    print(("PASS" if cond else "FAIL"), name, info)


pages = [
    ("brand home", f"http://{HOST}/", 200, "там, где"),
    ("brand catalog", f"http://{HOST}/catalog", 200, "Готовые дома в продаже"),
    ("region home krd", f"http://krd.{HOST}/", 200, "Краснодар и Адыгея"),
    ("region soon msk", f"http://msk.{HOST}/", 200, "лист ожидания"),
    ("region hidden more → 404", f"http://more.{HOST}/", 404, ""),
    ("unknown region → 404", f"http://nope.{HOST}/", 404, ""),
    ("estate page", f"http://krd.{HOST}/objects/kalina", 200, "Калина"),
    ("estate under wrong region → 404", f"http://msk.{HOST}/objects/kalina", 404, ""),
    ("house page", f"http://krd.{HOST}/houses/yv-tip9", 200, "Тип 9"),  # price uses a no-break space, so check the type
    ("region catalog", f"http://krd.{HOST}/catalog", 200, "Дома в продаже"),
    ("admin login", f"http://{HOST}/admin/login", 200, ""),
    ("projects", f"http://{HOST}/projects", 200, "проектов домов"),
    ("project page", f"http://{HOST}/projects/tip-5", 200, "Построить такой дом"),
    ("unknown project → 404", f"http://{HOST}/projects/tip-99", 404, ""),
    ("build", f"http://{HOST}/build", 200, "за 6 месяцев"),
    ("mortgage", f"http://{HOST}/mortgage", 200, "Семейная ипотека"),
    ("about", f"http://{HOST}/about", 200, "Строительная компания"),
    ("contacts", f"http://{HOST}/contacts", 200, "аул Козет"),
    ("privacy", f"http://{HOST}/privacy", 200, "Оператор"),
    ("consent", f"http://{HOST}/consent", 200, "согласие на обработку"),
]
for name, url, code, marker in pages:
    s, body, _ = req(url)
    check(name, s == code and (not marker or marker in body), f"{s} {url}" + ("" if not marker or marker in body else f" (no «{marker}»)"))

# features carried over from the demo: map of estates, 3D plan + scheme, 3D build (server-rendered parts)
features = [
    ("region: map/list switch", f"http://krd.{HOST}/", ["На карте", "Списком"]),
    ("region: 3D showcase of an estate", f"http://krd.{HOST}/", ["Посёлок в 3D", "3D-вид", "Схема"]),
    ("estate: 3D plan with scheme tab + poster", f"http://krd.{HOST}/objects/dinskaya", ["Выберите дом в 3D", "3D-вид", "Схема", "Открыть 3D"]),
    ("estate: developer's master plan kept", f"http://krd.{HOST}/objects/dinskaya", ["Генплан застройщика"]),
    ("home: company first, then two ways in + the places band under both", f"http://{HOST}/",
     ["там, где", "Два пути", "Построить дом", "Купить готовый", "ways__or", "Посмотреть локации", "places__list", "/objects/kalina", "/locations"]),
    ("home: lead form asks what the visitor is after", f"http://{HOST}/", ["Пока присматриваюсь"]),
    ("locations page: regions, all estates on a map, «на будущее» form", f"http://{HOST}/locations", ["Где мы строим", "Все посёлки", "На карте", "Подписаться"]),
    ("build page: 3D house behind reasons to trust, then proof", f"http://{HOST}/build",
     ["story__bg", "Строим с 2014 года", "Материалы с документами", "Гарантия на дом", "Дом готов", "Это построили мы", "built__item", "Выберите"]),
    ("house with a tour: plan circles + videos", f"http://krd.{HOST}/houses/di-tip12", ["tour__dot", "Кладовая: прачечная на 1", "Детская 9,2"]),  # a no-break space before «м²»
    ("house: slide-like facts + family mortgage", f"http://krd.{HOST}/houses/di-tip12", ["Площадь дома", "Стоимость дома", "Расчёт по семейной ипотеке", "fm__card"]),
    ("house without a tour: plain plan, mortgage", f"http://krd.{HOST}/houses/yv-tip9", ["Расчёт по семейной ипотеке"]),
]
for name, url, markers in features:
    s, body, _ = req(url)
    missing = [m for m in markers if m not in body]
    check(name, s == 200 and not missing, f"{s}" + (f" missing {missing}" if missing else ""))

# routing rules
s, _, h = req(f"http://{HOST}/r/krd/objects/kalina")
check("main /r/krd/… → 308 to subdomain", s == 308 and h.get("location", "").startswith(f"http://krd.{HOST}/objects/kalina"), f"{s} {h.get('location')}")
s, _, h = req(f"http://krd.{HOST}/projects")
check("subdomain /projects → 308 to main", s == 308 and h.get("location", "").startswith(f"http://{HOST}/projects"), f"{s} {h.get('location')}")
s, _, h = req(f"http://krd.{HOST}/locations")
check("subdomain /locations → 308 to main", s == 308 and h.get("location", "").startswith(f"http://{HOST}/locations"), f"{s} {h.get('location')}")
s, body, _ = req(f"http://krd.{HOST}/houses/di-tip12")
# the old placeholders were other people's reels: they must never come back (housetest checks real videos on temporary data)
check("no placeholder room videos (tour-*) on the house page", s == 200 and "tour-laundry" not in body and "tour-bedroom" not in body, f"{s}")

# leads
s, body, _ = req(f"http://krd.{HOST}/api/leads/submit", {"name": "Тест смоук", "phone": "+7 (965) 414-93-93", "consent": "on", "region": "krd",
                                                         "context": "smoke", "utm": {"utm_source": "test", "bad": "x"}})
check("lead accepted", s == 200 and '"ok":true' in body, f"{s} {body[:100]}")
mark = f"Смоук будущее {int(time.time())}"
s, body, _ = req(f"http://{HOST}/api/leads/submit", {"name": mark, "phone": "+7 (965) 414-93-93", "consent": "on", "interest": "future", "context": "smoke"})
row = sqlite3.connect(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "platform.db")).execute("select interest from leads where name = ?", (mark,)).fetchone()
check("lead «на будущее» saved with its interest", s == 200 and row and row[0] == "future", f"{s} {row}")
s, body, _ = req(f"http://{HOST}/api/leads/submit", {"name": "x", "phone": "123", "consent": "on"})
check("bad phone → 422", s == 422, f"{s}")
s, body, _ = req(f"http://{HOST}/api/leads/submit", {"name": "Бот", "phone": "+79654149393", "consent": "on", "website": "spam"})
check("honeypot → 200 silent", s == 200, f"{s}")
s, body, _ = req(f"http://{HOST}/api/leads?limit=1")
check("leads not public", s in (401, 403) or '"docs":[]' in body, f"{s} {body[:80]}")

# clean up: the test leads go away, so the admin shows only real ones (and nothing test-like gets into a video)
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
s, body, _ = req(f"http://{HOST}/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")
token = json.loads(body).get("token") if s == 200 else None
left = None
if token:
    for name in ["Тест смоук", mark]:
        q = urllib.parse.quote(name)
        r = urllib.request.Request(f"http://127.0.0.1:{HOST.split(':')[1]}/api/leads?where[name][equals]={q}", method="DELETE",
                                   headers={"Host": HOST, "Authorization": f"JWT {token}"})
        urllib.request.urlopen(r, timeout=120).read()
    left = sqlite3.connect(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "platform.db")).execute(
        "select count(*) from leads where context = 'smoke'").fetchone()[0]
check("test leads deleted", left == 0, f"left {left}")
print("ALL OK" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
