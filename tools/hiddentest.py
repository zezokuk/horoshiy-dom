"""A hidden region is a draft: its estates, houses and promos must not leak onto company-wide pages
(home, /locations, /catalog, /build) — they would link to a 404. Creates a draft estate with a free house and a promo
in the hidden region «more», checks those pages over HTTP, then deletes everything it made.

    python tools/hiddentest.py        (npm run dev first)
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
MARK = "Черновик-посёлок"
results = []


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


s, body = req(f"http://{H}/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")
token = json.loads(body).get("token") if s == 200 else None
check("admin login", token, str(s))


def find(col, field, value):
    s, body = req(f"http://{H}/api/{col}?where[{field}][equals]={urllib.parse.quote(value)}&depth=0", token=token)
    return json.loads(body).get("docs", []) if s == 200 else []


def cleanup():
    for col, field, value in [("houses", "code", "hid-h1"), ("promos", "title", f"{MARK} акция"), ("estates", "slug", "hid-draft")]:
        for d in find(col, field, value):
            req(f"http://{H}/api/{col}/{d['id']}", None, "DELETE", token)


cleanup()
try:
    hidden = find("regions", "slug", "more")
    check("hidden region «more» exists", hidden and hidden[0]["status"] == "hidden", str(hidden[:1]))
    rid = hidden[0]["id"]
    s, body = req(f"http://{H}/api/estates", {"name": MARK, "slug": "hid-draft", "region": rid}, "POST", token)
    eid = json.loads(body).get("doc", {}).get("id")
    check("create draft estate in the hidden region", s == 201 and eid, str(s))
    s, _ = req(f"http://{H}/api/houses", {"code": "hid-h1", "estate": eid, "title": "Тип 98", "price": 1234567, "area": 77, "status": "free"}, "POST", token)
    check("create a free house there", s == 201, str(s))
    s, _ = req(f"http://{H}/api/promos", {"title": f"{MARK} акция", "region": rid, "active": True}, "POST", token)
    check("create a promo for the hidden region", s == 201, str(s))
    time.sleep(1)
    for name, url in [("home", f"http://{H}/"), ("locations", f"http://{H}/locations"), ("catalog", f"http://{H}/catalog"), ("build", f"http://{H}/build")]:
        s, body = req(url)
        leaks = [w for w in (MARK, "hid-draft", "hid-h1", "1 234 567") if w in body]
        check(f"{name}: nothing from the hidden region", s == 200 and not leaks, f"{s} leaks {leaks}")
finally:
    cleanup()
    left = find("estates", "slug", "hid-draft") + find("houses", "code", "hid-h1") + find("promos", "title", f"{MARK} акция")
    check("test records deleted", not left, str(len(left)))
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
