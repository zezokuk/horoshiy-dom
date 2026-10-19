"""Leads → Telegram and amoCRM, against local stand-ins for both (no real accounts needed).

The server must run with the stand-ins in its environment:
    $env:AMO_API='http://127.0.0.1:8765'; $env:AMO_TOKEN='test'; $env:TELEGRAM_API='http://127.0.0.1:8765'; $env:TELEGRAM_BOT_TOKEN='test'; npm run dev
    python tools/crmtest.py

1. amoCRM is down → the lead is saved, Telegram gets it, amoCRM status «в очереди» with the error.
2. amoCRM is back → the next lead goes through and the queued one is re-sent: both «отправлена» with the deal id;
   the deal carries the contact's phone, the source tag and a note with the house / estate / page.
3. A VK Ads click id (rb_clickid) is counted as «Реклама: VK». Test leads are deleted at the end.
"""
import json, os, sqlite3, sys, threading, time, urllib.error, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
H = "horoshiy.localhost:3000"
db = sqlite3.connect(os.path.join(ROOT, "platform.db"))
results = []
seen = {"complex": [], "notes": [], "telegram": []}
mode = {"amo": "down"}
STAMP = int(time.time())


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


class Fake(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"null")
        if self.path.startswith("/bot"):
            seen["telegram"].append(body)
            out, code = {"ok": True}, 200
        elif self.path == "/api/v4/leads/complex":
            if mode["amo"] == "down":
                out, code = {"title": "Service Unavailable"}, 503
            else:
                seen["complex"].append(body)
                out, code = [{"id": 7000 + len(seen["complex"]), "contact_id": 1}], 200
        elif self.path == "/api/v4/leads/notes":
            seen["notes"].append(body)
            out, code = {"_embedded": {"notes": [{"id": 1}]}}, 200
        else:
            out, code = {}, 404
        data = json.dumps(out).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


srv = ThreadingHTTPServer(("127.0.0.1", 8765), Fake)
threading.Thread(target=srv.serve_forever, daemon=True).start()


def submit(name, page, utm=None):
    data = {"name": name, "phone": "+7 (965) 414-93-93", "consent": "on", "region": "krd", "page": page, "utm": utm or {}}
    r = urllib.request.Request("http://127.0.0.1:3000/api/leads/submit", data=json.dumps(data).encode(), method="POST",
                               headers={"Host": f"krd.{H}", "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=120) as resp:
        return resp.status


def row(name):
    return db.execute("select crm, crm_id, crm_tries, crm_error, delivery, source from leads where name = ?", (name,)).fetchone()


def wait_for(name, want, timeout=30):
    end = time.time() + timeout
    r = None
    while time.time() < end:
        r = row(name)
        if r and r[0] in want:
            return r
        time.sleep(0.5)
    return r


def api(path, data=None, method=None, token=None):
    h = {"Host": H, "Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"JWT {token}"
    r = urllib.request.Request(f"http://127.0.0.1:3000{path}", data=json.dumps(data).encode() if data is not None else None, method=method, headers=h)
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or b"{}")


token = api("/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")["token"]
krd = api("/api/regions?where[slug][equals]=krd&depth=0", token=token)["docs"][0]
chats_before = krd.get("leadChatIds") or []
api(f"/api/regions/{krd['id']}", {"leadChatIds": ["111"]}, "PATCH", token)  # a test chat for the Krasnodar manager

names = [f"CRM тест {STAMP} {i}" for i in (1, 2, 3)]
try:
    # 1. amoCRM down
    check("lead accepted while amoCRM is down", submit(names[0], f"http://krd.{H}/houses/di-tip12") == 200)
    r = wait_for(names[0], ("queued", "error"))
    check("…saved, Telegram ok, amoCRM «queued» with the error", r and r[0] == "queued" and r[2] == 1 and "503" in (r[3] or "") and r[4] == "ok", str(r))
    tg = seen["telegram"][-1] if seen["telegram"] else {}
    check("…Telegram message has the lead and its house", "Новая заявка" in tg.get("text", "") and "Тип 12" in tg.get("text", ""), tg.get("text", "")[:80].replace("\n", " | "))

    # 2. amoCRM back: the new lead and the queued one both go through
    mode["amo"] = "up"
    check("lead accepted when amoCRM is back", submit(names[1], f"http://krd.{H}/objects/dinskaya") == 200)
    r2 = wait_for(names[1], ("sent",))
    r1 = wait_for(names[0], ("sent",))
    check("…the new lead is «sent» with a deal id", r2 and r2[0] == "sent" and r2[1], str(r2))
    check("…the queued lead is re-sent", r1 and r1[0] == "sent" and r1[1] and r1[2] == 2, str(r1))
    deal = next((c[0] for c in seen["complex"] if names[0] in c[0]["name"]), None)
    phone = deal and deal["_embedded"]["contacts"][0]["custom_fields_values"][0]["values"][0]["value"]
    tags = deal and [t["name"] for t in deal["_embedded"]["tags"]]
    check("…the deal: title with estate and house, contact phone, tags", deal and "Динская, Тип 12" in deal["name"] and phone == "+7 (965) 414-93-93" and "сайт" in tags, json.dumps(deal, ensure_ascii=False)[:160])
    note = next((n[0]["params"]["text"] for n in seen["notes"] if n and "Тип 12" in n[0]["params"]["text"]), "")
    check("…a note with house, estate, source and page", "Дом: Тип 12" in note and "Посёлок: Динская" in note and "Страница:" in note, note.replace("\n", " | ")[:120])

    # 3. VK Ads click
    submit(names[2], f"http://krd.{H}/", {"rb_clickid": "abc123"})
    r3 = wait_for(names[2], ("sent",))
    check("VK Ads click id → source «Реклама: VK»", r3 and r3[5] == "Реклама: VK", str(r3))
finally:
    for n in names:
        api(f"/api/leads?where[name][equals]={urllib.parse.quote(n)}", None, "DELETE", token)
    api(f"/api/regions/{krd['id']}", {"leadChatIds": chats_before}, "PATCH", token)
    left = db.execute("select count(*) from leads where name like 'CRM тест%'").fetchone()[0]
    after = api(f"/api/regions/{krd['id']}?depth=0", token=token).get("leadChatIds") or []
    check("test leads deleted, the region's Telegram chats restored", left == 0 and after == chats_before, f"{left} {after}")
    srv.shutdown()
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
