"""«Внешний вид» and «SEO и поиск» in the admin really change the site (globals/Design, globals/Seo, lib/look.ts).

    python tools/looktest.py     (dev server on :3000; changes the two settings and an estate, then puts them back)

1. Without login the settings cannot be changed; a wrong colour is refused.
2. Design: another first screen, another colour set + own accent, every effect off → the home, «Построить», «Готовые
   дома» and an estate «скоро» show the plain versions (no thread, grid instead of the fan, no key, no sketch block).
3. SEO: home title, a page description, the Yandex Webmaster code, an estate's own title → in the pages' <head>.
Everything is restored at the end, also when a check fails.
"""
import json, os, re, sys, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
PAGES = ("home", "build", "catalog", "projects", "locations", "mortgage", "about", "contacts")
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def api(method, path, body=None, token=None, host=H):
    req = urllib.request.Request(f"http://127.0.0.1:3000{path}", method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Host": host, "Content-Type": "application/json", **({"Authorization": f"JWT {token}"} if token else {})})
    try:
        r = urllib.request.urlopen(req, timeout=180)
        return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, {}


def page(path, host=H):
    for _ in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:3000{path}", headers={"Host": host}), timeout=180).read().decode()
        except urllib.error.HTTPError as e:
            if e.code != 500:
                raise
            time.sleep(2)  # dev: the first request after a schema change may answer 500 once
    raise RuntimeError(path)


_, login = api("POST", "/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]})
T = login["token"]
_, design0 = api("GET", "/api/globals/design?depth=0", token=T)
_, seo0 = api("GET", "/api/globals/seo?depth=0", token=T)
_, est = api("GET", "/api/estates?where[slug][equals]=novovelichkovskaya&depth=0", token=T)
estate = est["docs"][0]
keep = lambda d: {k: v for k, v in d.items() if k not in ("id", "createdAt", "updatedAt", "globalType")}

try:
    st, _ = api("POST", "/api/globals/design", {"hero": "hero-1"})
    check("without login the look cannot be changed", st in (401, 403), st)
    st, _ = api("POST", "/api/globals/design", {"colorDark": "red"}, token=T)
    check("a colour not in #rrggbb form is refused", st == 400, st)

    st, _ = api("POST", "/api/globals/design", {"hero": "hero-1", "palette": "navy", "colorAccent": "#c0714f",
                                                "effects": {"thread": False, "motion": False, "fan": False, "sketch": False, "key": False}}, token=T)
    check("admin saves «Внешний вид»", st == 200, st)
    home = page("/")
    html_tag = re.search(r"<html[^>]*>", home).group(0)
    check("home: the chosen first screen (variant 1, not «Чертёж → дом»)", "hd__frame" in home and "hx__house" not in home)
    check("home: the colour set and the own accent", 'data-palette="navy"' in html_tag and "--gold:#c0714f" in html_tag.replace(" ", ""), html_tag[:160])
    check("home: motion off", "no-motion" in html_tag)
    check("home: no thread", "thread__svg" not in home)
    build = page("/build")
    check("«Построить»: a grid of projects instead of the fan", "pf__svg" not in build and "/projects/tip-" in build)
    check("«Построить»: no plan → frame → house block", "s2h__stage" not in build)
    catalog = page("/catalog")
    check("«Готовые дома»: no key", 'class="key"' not in catalog and "key__handle" not in catalog)
    soon = page("/objects/novovelichkovskaya", host=f"krd.{H}")
    check("estate «скоро»: no sketch block, the form stays", "s2h__stage" not in soon and "Узнать о старте" in soon)

    st, _ = api("POST", "/api/globals/seo", {"home": {"title": "Тестовый заголовок главной"}, "build": {"description": "Тестовое описание «Построить»"},
                                             "yandexVerification": "test-yandex-123"}, token=T)
    check("admin saves «SEO и поиск»", st == 200, st)
    home = page("/")
    check("SEO: the home title from the admin (without the « · Хороший дом» tail)", "<title>Тестовый заголовок главной</title>" in home,
          (re.search(r"<title>[^<]*</title>", home) or [""])[0])
    check("SEO: the Yandex Webmaster code is in every page", 'name="yandex-verification" content="test-yandex-123"' in home and "test-yandex-123" in page("/catalog"))
    check("SEO: a page's description from the admin", 'content="Тестовое описание «Построить»"' in page("/build"))
    st, _ = api("PATCH", f"/api/estates/{estate['id']}", {"seo": {"title": "Тестовый посёлок для поиска"}}, token=T)
    check("SEO: an estate's own title", st == 200 and "<title>Тестовый посёлок для поиска · Хороший дом</title>" in page("/objects/novovelichkovskaya", host=f"krd.{H}"))
finally:
    # empty fields do not come back in the GET: clear the own colours explicitly (20.10 the accent stayed after a run)
    api("POST", "/api/globals/design", {"colorDark": None, "colorAccent": None, **keep(design0)}, token=T)
    # a never-saved global comes back empty: put every field back explicitly, or the test texts would stay
    blank = {k: {"title": None, "description": None} for k in PAGES}
    blank.update({"yandexVerification": None, "googleVerification": None, "shareImage": None})
    api("POST", "/api/globals/seo", {**blank, **keep(seo0)}, token=T)
    api("PATCH", f"/api/estates/{estate['id']}", {"seo": estate.get("seo") or {"title": None, "description": None}}, token=T)
    home = page("/")
    tag = re.search(r"<html[^>]*>", home).group(0)
    check("restored: the same first screen, no test texts, no test colours", (design0.get("hero") or "hero-5") in ("hero-5", "hero-4") and "Тестов" not in home
          and "test-yandex" not in home and "data-palette" not in tag and "#c0714f" not in tag, tag[:200])

print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
