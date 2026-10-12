"""The client fills the admin himself, and not always completely. This creates the barest records the admin accepts —
an active region with nothing but a name, an estate with no houses, an estate with one house that has only the
required fields (no photo, project, plan, plot) — opens every page they touch in a real browser and checks:
status 200, no JS exceptions or console errors, no «undefined / NaN / null / Infinity» in the text. Then deletes them.

    python tools/emptytest.py        (npm run dev first)
"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
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
made = []  # (collection, id), deleted in reverse


def cleanup():
    """Delete the test records by their addresses — also leftovers of a run that was cut off."""
    for col, field, value in [("houses", "code", "tst-h1"), ("estates", "slug", "tst-empty"), ("estates", "slug", "tst-bare"), ("regions", "slug", "tst")]:
        s, body = req(f"http://{H}/api/{col}?where[{field}][equals]={value}&depth=0", None, None, token)
        for d in json.loads(body).get("docs", []) if s == 200 else []:
            req(f"http://{H}/api/{col}/{d['id']}", None, "DELETE", token)


cleanup()


def create(col, data):
    s, body = req(f"http://{H}/api/{col}", data, "POST", token)
    doc = json.loads(body).get("doc", {})
    ok = s == 201 and doc.get("id")
    check(f"create bare {col[:-1]} «{data.get('name') or data.get('title')}»", ok, "" if ok else f"{s} {body[:200]}")
    if ok:
        made.append((col, doc["id"]))
    return doc.get("id")


EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = None
try:
    rid = create("regions", {"name": "Тестовый край", "shortName": "Тест", "slug": "tst", "status": "active"})
    create("estates", {"name": "Пустой посёлок", "slug": "tst-empty", "region": rid})
    eid = create("estates", {"name": "Голый посёлок", "slug": "tst-bare", "region": rid})
    create("houses", {"code": "tst-h1", "estate": eid, "title": "Тип 99", "price": 5000000, "area": 70, "status": "free"})
    time.sleep(1)

    proc = subprocess.Popen([EDGE, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--remote-debugging-port=9349",
                             "--remote-allow-origins=*", f"--user-data-dir={ROOT}\\tools\\.shots\\prof-empty", "about:blank"])
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9349/json")) if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180)
    mid = [0]
    events = []

    def cmd(m, **p):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": m, "params": p}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == mid[0]:
                return msg.get("result", {})
            events.append(msg)

    def js(e):
        return cmd("Runtime.evaluate", expression=e, returnByValue=True).get("result", {}).get("value")

    cmd("Runtime.enable")
    cmd("Log.enable")
    for size, w, hgt, mobile in [("desktop", 1440, 900, False), ("phone", 390, 844, True)]:
        cmd("Emulation.setDeviceMetricsOverride", width=w, height=hgt, deviceScaleFactor=1, mobile=mobile)
        for url in [f"http://tst.{H}/", f"http://tst.{H}/catalog", f"http://tst.{H}/objects/tst-empty", f"http://tst.{H}/objects/tst-bare",
                    f"http://tst.{H}/houses/tst-h1", f"http://{H}/", f"http://{H}/locations", f"http://{H}/catalog", f"http://{H}/build"]:
            status, _ = req(url)
            events.clear()
            cmd("Page.navigate", url=url)
            time.sleep(6)
            if "tst." in url and not mobile:  # for a human look (desktop only: a phone-size capture with software WebGL can crash headless Edge): how a fresh, unfilled record looks
                import base64
                name = re.sub(r"\W+", "_", url.split("3000")[1]).strip("_") or "region"
                shot = cmd("Page.captureScreenshot", format="png")
                open(os.path.join(ROOT, "tools", ".shots", f"empty_{size}_{name}.png"), "wb").write(base64.b64decode(shot["data"]))
            js("scrollTo({top: document.body.scrollHeight / 2, behavior: 'instant'})")  # wake lazy 3D/map blocks
            time.sleep(3)
            js("scrollTo({top: document.body.scrollHeight, behavior: 'instant'})")
            time.sleep(2)
            cmd("Runtime.evaluate", expression="1")  # drain events
            errs = [e["params"]["exceptionDetails"].get("exception", {}).get("description", "")[:160] for e in events if e.get("method") == "Runtime.exceptionThrown"]
            errs += [e["params"]["args"][0].get("value", "")[:160] for e in events
                     if e.get("method") == "Runtime.consoleAPICalled" and e["params"]["type"] == "error" and e["params"].get("args")]
            errs += [e["params"]["entry"]["text"][:160] for e in events if e.get("method") == "Log.entryAdded" and e["params"]["entry"]["level"] == "error"]
            text = js("document.body.innerText") or ""
            junk = sorted(set(re.findall(r"\b(undefined|NaN|null|Infinity)\b|\[object \w+\]", text)) - {""})
            over = js("document.documentElement.scrollWidth - innerWidth")
            check(f"{size}: {url.replace('http://', '')}", status == 200 and not errs and not junk and over <= 0,
                  f"{status} errors {errs} junk {junk} sideways {over}px")
    ws.close()
finally:
    cleanup()
    s, body = req(f"http://{H}/api/regions?where[slug][equals]=tst", None, None, token)
    check("test records deleted", '"totalDocs":0' in body, body[:80])
    if proc:
        proc.terminate()
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
