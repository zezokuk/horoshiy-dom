"""Smoke test of the platform on the dev server: every key URL answers, region routing works, a lead is saved.

    python tools/smoke.py [base_host]        (default horoshiy.localhost:3000; run `npm run dev` first)
Checks status codes, a marker text on each page, the subdomain rewrite/redirect rules and POST /api/leads/submit.
"""
import json, sys, urllib.error, urllib.parse, urllib.request

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
]
for name, url, code, marker in pages:
    s, body, _ = req(url)
    check(name, s == code and (not marker or marker in body), f"{s} {url}" + ("" if not marker or marker in body else f" (no «{marker}»)"))

# routing rules
s, _, h = req(f"http://{HOST}/r/krd/objects/kalina")
check("main /r/krd/… → 308 to subdomain", s == 308 and h.get("location", "").startswith(f"http://krd.{HOST}/objects/kalina"), f"{s} {h.get('location')}")
s, _, h = req(f"http://krd.{HOST}/projects")
check("subdomain /projects → 308 to main", s == 308 and h.get("location", "").startswith(f"http://{HOST}/projects"), f"{s} {h.get('location')}")

# leads
s, body, _ = req(f"http://krd.{HOST}/api/leads/submit", {"name": "Тест смоук", "phone": "+7 (965) 414-93-93", "consent": "on", "region": "krd",
                                                         "context": "smoke", "utm": {"utm_source": "test", "bad": "x"}})
check("lead accepted", s == 200 and '"ok":true' in body, f"{s} {body[:100]}")
s, body, _ = req(f"http://{HOST}/api/leads/submit", {"name": "x", "phone": "123", "consent": "on"})
check("bad phone → 422", s == 422, f"{s}")
s, body, _ = req(f"http://{HOST}/api/leads/submit", {"name": "Бот", "phone": "+79654149393", "consent": "on", "website": "spam"})
check("honeypot → 200 silent", s == 200, f"{s}")
s, body, _ = req(f"http://{HOST}/api/leads?limit=1")
check("leads not public", s in (401, 403) or '"docs":[]' in body, f"{s} {body[:80]}")
print("ALL OK" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
