"""Roles of the client's team (КП: content maker and the sales head, without access to settings).

Temporary staff accounts are made and removed by the test:
  content — may add/edit/delete houses, estates, projects, promo pages; may NOT see leads or touch regions, company, staff;
  sales   — sees and works leads, changes a house's status; may NOT add or delete houses, nor touch settings.
In the real admin (signed in as each): the menu shows only their sections, «Как вести сайт» only their cards.

    python tools/rolestest.py        (npm run dev or npm start first)
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
from cdp import Browser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
STAMP = int(time.time())
PASSWORD = f"Test-{STAMP}-pw"
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def api(path, data=None, method=None, token=None, host=H):
    h = {"Host": host, "Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"JWT {token}"
    r = urllib.request.Request(f"http://127.0.0.1:3000{path}", data=json.dumps(data).encode() if data is not None else None, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}


login = lambda email, pw: api("/api/users/login", {"email": email, "password": pw}, "POST")[1].get("token")
admin = login(ENV["SEED_ADMIN_EMAIL"], ENV["SEED_ADMIN_PASSWORD"])
emails = {r: f"{r}-{STAMP}@test.local" for r in ("content", "sales")}
made_users, made_houses = [], []
lead_name = f"Роли тест {STAMP}"
din = api("/api/estates?where[slug][equals]=dinskaya&depth=0", token=admin)[1]["docs"][0]["id"]
house = api("/api/houses?where[code][equals]=di-tip5-v3&depth=0", token=admin)[1]["docs"][0]
region = api("/api/regions?where[slug][equals]=krd&depth=0", token=admin)[1]["docs"][0]

try:
    for role, email in emails.items():
        s, d = api("/api/users", {"email": email, "password": PASSWORD, "name": f"Тест {role}", "role": role}, "POST", admin)
        made_users.append(d.get("doc", {}).get("id"))
        check(f"admin creates a «{role}» account", s == 201, str(s))
    content, sales = login(emails["content"], PASSWORD), login(emails["sales"], PASSWORD)

    # ---- content maker
    s, d = api("/api/leads?limit=5", token=content)
    check("content: no access to leads", s in (401, 403) or d.get("totalDocs") == 0, f"{s} {d.get('totalDocs')}")
    s, d = api("/api/houses", {"code": f"tst-role-{STAMP}", "estate": din, "title": "Тип 5", "area": 100, "price": 9000000}, "POST", content)
    hid = d.get("doc", {}).get("id")
    made_houses.append(hid)
    check("content: adds a house", s == 201, str(s))
    check("content: deletes a house", hid and api(f"/api/houses/{hid}", None, "DELETE", content)[0] == 200)
    check("content: edits a project", api("/api/projects?where[slug][equals]=tip-12&depth=0", token=content)[0] == 200 and
          api(f"/api/projects/{api('/api/projects?where[slug][equals]=tip-12&depth=0', token=admin)[1]['docs'][0]['id']}", {"order": 12}, "PATCH", content)[0] == 200)
    check("content: may NOT edit a region", api(f"/api/regions/{region['id']}", {"tagline": region.get("tagline")}, "PATCH", content)[0] in (401, 403))
    check("content: may NOT edit company settings", api("/api/globals/company", {"slogan": "x"}, "POST", content)[0] in (401, 403))
    check("content: may NOT create staff", api("/api/users", {"email": f"x-{STAMP}@t.local", "password": PASSWORD, "role": "admin"}, "POST", content)[0] in (401, 403))

    # ---- sales head
    api("/api/leads/submit", {"name": lead_name, "phone": "+79654149393", "consent": "on", "region": "krd"}, "POST", host=f"krd.{H}")
    time.sleep(1)
    s, d = api(f"/api/leads?where[name][equals]={urllib.parse.quote(lead_name)}", token=sales)
    lid = (d.get("docs") or [{}])[0].get("id")
    check("sales: sees the leads", s == 200 and lid, str(s))
    check("sales: changes a lead's status", lid and api(f"/api/leads/{lid}", {"status": "work"}, "PATCH", sales)[0] == 200)
    check("sales: may NOT delete a lead", lid and api(f"/api/leads/{lid}", None, "DELETE", sales)[0] in (401, 403))
    s = api(f"/api/houses/{house['id']}", {"status": "reserved"}, "PATCH", sales)[0]
    api(f"/api/houses/{house['id']}", {"status": house["status"]}, "PATCH", admin)
    check("sales: changes a house's status", s == 200, str(s))
    check("sales: may NOT add a house", api("/api/houses", {"code": f"tst-role2-{STAMP}", "estate": din, "title": "Тип 5", "area": 100, "price": 1}, "POST", sales)[0] in (401, 403))
    check("sales: may NOT delete a house", api(f"/api/houses/{house['id']}", None, "DELETE", sales)[0] in (401, 403))
    check("sales: may NOT edit company settings", api("/api/globals/company", {"slogan": "x"}, "POST", sales)[0] in (401, 403))

    # ---- the admin as they see it
    for role in ("content", "sales"):
        with Browser(9378 if role == "content" else 9379, f"prof-role-{role}-{STAMP}") as b:
            b.go(f"http://{H}/admin/login", 4)
            b.click("input[name=email]"); b.type(emails[role])
            b.click("input[name=password]"); b.type(PASSWORD)
            b.click("button[type=submit]")
            b.wait("!location.pathname.includes('/login')", 60)
            b.go(f"http://{H}/admin", 5)
            nav = b.js("[...document.querySelectorAll('nav a, .nav a')].map(a=>a.textContent.trim()).filter(Boolean)") or []
            cards = b.js("[...document.querySelectorAll('section h2 ~ div a b')].map(b=>b.textContent.trim())") or []
            hidden = [x for x in ("Регионы", "Сотрудники", "Компания") if x in nav]
            if role == "content":
                check("content admin: no «Заявки», «Регионы», «Сотрудники», «Компания» in the menu", "Заявки" not in nav and not hidden and "Дома" in nav, str(nav))
                check("content admin: guide cards without «Заявки»", cards and "Заявки" not in cards and "Новый дом — за минуту" in cards, str(cards))
            else:
                check("sales admin: «Заявки» and «Дома» in the menu, no settings", "Заявки" in nav and "Дома" in nav and not hidden, str(nav))
                check("sales admin: guide cards «Продан или бронь» and «Заявки» only", sorted(cards) == ["Заявки", "Продан или бронь"], str(cards))
            b.shot(f"rolestest-{role}.png")
finally:
    for hid in made_houses:
        if hid:
            api(f"/api/houses/{hid}", None, "DELETE", admin)
    api(f"/api/leads?where[name][equals]={urllib.parse.quote(lead_name)}", None, "DELETE", admin)
    for uid in made_users:
        if uid:
            api(f"/api/users/{uid}", None, "DELETE", admin)
    left = api(f"/api/users?where[email][like]=-{STAMP}@&depth=0", token=admin)[1].get("totalDocs")
    back = api(f"/api/houses/{house['id']}?depth=0", token=admin)[1].get("status")
    check("test accounts, house and lead removed; the house status is back", left == 0 and back == house["status"], f"{left} {back}")
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
