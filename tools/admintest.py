"""«Add a house in a minute» (the client at the meeting: a new house every month or two — «это несложно?»).

In the real admin, as a manager would: log in → Дома → Создать → code, estate, project, type, area, price, photo and plan
files → Сохранить. Then the house is on the site: its page, the estate's list and 3D plan data, the catalog.
Times the form and fails on console errors. The test house and its pictures are deleted at the end.

    python tools/admintest.py [--shots]        (npm run dev or npm start first)
"""
import json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
from cdp import Browser, OUT

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
CODE = "di-test-admin"
SHOTS = "--shots" in sys.argv
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def api(path, data=None, method=None, token=None, host=H):
    headers = {"Host": host, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"JWT {token}"
    r = urllib.request.Request(f"http://127.0.0.1:3000{path}", data=json.dumps(data).encode() if data is not None else None, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=180) as resp:
            body = resp.read().decode("utf-8", "replace")
            return resp.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


# pictures a manager would have on the phone: a house photo and a plan (cut from the client's own slide)
slide = os.path.join(ROOT, "..", "исходники-презентации", "16420356.jpeg")
photo, plan = os.path.join(OUT, "admintest-photo.jpg"), os.path.join(OUT, "admintest-plan.jpg")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", slide, "-vf", "crop=1673:910:0:2175", photo], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", slide, "-vf", "crop=1673:885:0:1265", plan], check=True)

token = json.loads(api("/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")[1])["token"]
api(f"/api/houses?where[code][equals]={CODE}", None, "DELETE", token)  # a leftover of an interrupted run


def pick(b, index, text):
    """react-select number `index` on the form: open, type, choose the first option."""
    b.js(f"document.querySelectorAll('.react-select')[{index}].scrollIntoView({{block:'center',behavior:'instant'}})")
    inp = f"document.querySelectorAll('.react-select input')[{index}]"
    b.js(f"{inp}.focus()")
    b.type(text)
    b.wait("!!document.querySelector('.rs__option')", 20)
    time.sleep(0.6)
    b.key("Enter", "Enter", 13)
    time.sleep(0.5)


def fill(b, name, value):
    b.click(f"input[name='{name}']")
    b.type(str(value))


try:
    with Browser(9362, "prof-admintest") as b:
        b.go(f"http://{H}/admin/login", 4)
        if b.js("!!document.querySelector('input[name=email]')"):  # the profile may still be logged in from a previous run
            fill(b, "email", ENV["SEED_ADMIN_EMAIL"])
            fill(b, "password", ENV["SEED_ADMIN_PASSWORD"])
            b.click("button[type=submit]")
            b.wait("!location.pathname.includes('/login')", 60)
        # the dashboard opens with «Как вести сайт»: five links straight to the right forms
        b.go(f"http://{H}/admin", 5)
        guide = b.js("[...document.querySelectorAll('h2')].some(h=>h.textContent.trim()==='Как вести сайт') && document.querySelectorAll('a[href=\"/admin/collections/houses/create\"]').length")
        check("admin dashboard: «Как вести сайт» with a link to «Добавить дом»", guide)
        if SHOTS:
            b.shot("admintest-dashboard.png")
        # prices in the list are readable: «8 800 000 ₽», not «8800000»
        b.go(f"http://{H}/admin/collections/houses?sort=price", 5)
        cell = b.js("[...document.querySelectorAll('td')].map(t=>t.textContent).find(t=>/₽/.test(t)) || ''")
        check("admin houses list: price as «8 800 000 ₽»", bool(re.fullmatch(r"\d{1,3}(\s\d{3})+\s₽", cell.strip().replace(" ", " "))), repr(cell))
        b.go(f"http://{H}/admin/collections/houses/create", 6)
        b.errors()
        t0 = time.time()
        fill(b, "code", CODE)
        pick(b, 0, "Динская")
        pick(b, 1, "Тип 5")
        fill(b, "title", "Тип 5")
        fill(b, "area", 110)
        fill(b, "price", 9900000)
        # photo and plan: «Создать» opens a drawer, a file is chosen, «Сохранить» — no description needed any more
        for f in [photo, plan]:
            time.sleep(1.5)  # the previous drawer finishes closing
            b.js("document.querySelectorAll('[data-create]').forEach(x=>x.removeAttribute('data-create'));"
                 "[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Создать').setAttribute('data-create','1')")
            b.click("[data-create]")  # a real mouse click, as a person does
            if not b.wait("!!document.querySelector('input[type=file]')", 30):
                b.shot("admintest-no-drawer.png", full=True)
                print("buttons:", b.js("[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).filter(Boolean).join(' | ')"))
            time.sleep(0.5)
            b.files("input[type=file]", [f])
            time.sleep(1.5)
            b.js("[...document.querySelectorAll('[class*=drawer] button')].find(x=>x.textContent.trim()==='Сохранить').click()")
            # done when the drawer is closed AND the file sits in its field on the form (a person sees its name there)
            stem = os.path.splitext(os.path.basename(f))[0]
            ok = b.wait(f"!document.querySelector('input[type=file]') && document.body.innerText.includes('{stem}')", 60)
            if not ok:
                b.shot("admintest-drawer-stuck.png")
            time.sleep(1)
        if SHOTS:
            b.shot("admintest-form.png", full=True)
        b.js("[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Сохранить').click()")
        saved = b.wait("/\\/houses\\/\\d+/.test(location.pathname)", 60)
        took = time.time() - t0
        errs = [e for e in b.errors() if "Download the React DevTools" not in e]
        check("admin: the form is filled and saved in under a minute", saved and took < 60, "%.0f s" % took)
        check("admin: no errors in the console", not errs, str(errs[:3]))
        if SHOTS:
            b.shot("admintest-saved.png")

    s, body = api(f"/api/houses?where[code][equals]={CODE}&depth=1", token=token)
    doc = (json.loads(body).get("docs") or [None])[0]
    check("the house is saved: free, region from the estate, bedrooms from the project, both pictures",
          doc and doc["status"] == "free" and doc["region"] and doc.get("bedrooms") and doc.get("photo") and doc.get("plan"),
          doc and str({k: (doc.get(k) if not isinstance(doc.get(k), dict) else doc[k].get("id")) for k in ("status", "region", "bedrooms", "photo", "plan")}))
    s, page = api(f"/houses/{CODE}", host=f"krd.{H}")
    check("its page is on the site", s == 200 and "Тип 5" in page and "9 900 000" in page.replace(" ", " "), str(s))
    s, est = api("/objects/dinskaya", host=f"krd.{H}")
    check("it is in the estate's houses and its 3D plan data", s == 200 and f"houses/{CODE}" in est, str(s))
    s, cat = api("/catalog", host=f"krd.{H}")
    check("it is in the catalog", s == 200 and f"houses/{CODE}" in cat, str(s))

    # an estate set to «Продажи завершены» closes its houses (none left «free» by mistake) — on a temporary estate
    krd = json.loads(api("/api/regions?where[slug][equals]=krd&depth=0", token=token)[1])["docs"][0]["id"]
    est = json.loads(api("/api/estates", {"name": "Тест распродан", "slug": "tst-soldout", "region": krd, "status": "selling"}, "POST", token)[1])["doc"]
    for i, st in enumerate(["free", "reserved", "sold"]):
        api("/api/houses", {"code": f"tst-so-{i}", "estate": est["id"], "title": "Тип 5", "area": 100, "price": 9000000, "status": st}, "POST", token)
    api(f"/api/estates/{est['id']}", {"status": "soldOut"}, "PATCH", token)
    left = [h["status"] for h in json.loads(api(f"/api/houses?where[estate][equals]={est['id']}&depth=0", token=token)[1])["docs"]]
    check("«Продажи завершены» → every house of the estate is «Продан»", left == ["sold"] * 3, str(left))
finally:
    for i in range(3):
        api(f"/api/houses?where[code][equals]=tst-so-{i}", None, "DELETE", token)
    api("/api/estates?where[slug][equals]=tst-soldout", None, "DELETE", token)
    s, body = api(f"/api/houses?where[code][equals]={CODE}&depth=0", token=token)
    for d in json.loads(body).get("docs", []):
        for m in [d.get("photo"), d.get("plan")]:
            if m:
                api(f"/api/media/{m}", None, "DELETE", token)
    api(f"/api/houses?where[code][equals]={CODE}", None, "DELETE", token)
    api("/api/media?where[filename][like]=admintest", None, "DELETE", token)  # also pictures of a run that stopped before saving
    s, body = api(f"/api/houses?where[code][equals]={CODE}", token=token)
    s2, mb = api("/api/media?where[filename][like]=admintest&depth=0", token=token)
    check("test house and its pictures deleted", json.loads(body).get("totalDocs") == 0 and json.loads(mb).get("totalDocs") == 0)
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
