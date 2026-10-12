"""Full-page screenshots of key pages (desktop + phone) via headless Edge, plus console errors of each page.

    python tools/shots.py [tag]        (npm run dev first; saves tools/.shots/<tag>_<page>_<size>.png)
"""
import base64, json, os, subprocess, sys, time, urllib.request
import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".shots")
os.makedirs(OUT, exist_ok=True)
TAG = sys.argv[1] if len(sys.argv) > 1 else "now"
R = "horoshiy.localhost:3000"
PAGES = [
    ("home", f"http://{R}/"),
    ("krd", f"http://krd.{R}/"),
    ("msk", f"http://msk.{R}/"),
    ("estate", f"http://krd.{R}/objects/kalina"),
    ("house", f"http://krd.{R}/houses/yv-tip9"),
    ("tour", f"http://krd.{R}/houses/di-tip12"),
    ("locations", f"http://{R}/locations"),
    ("catalog", f"http://{R}/catalog"),
    ("projects", f"http://{R}/projects"),
    ("project", f"http://{R}/projects/tip-5"),
    ("build", f"http://{R}/build"),
    ("about", f"http://{R}/about"),
    ("contacts", f"http://{R}/contacts"),
]
# python tools/shots.py <tag> projects,build  — only these pages
if len(sys.argv) > 2:
    PAGES = [p for p in PAGES if p[0] in sys.argv[2].split(",")]
SIZES = [("desktop", 1440, 900, 1, False), ("phone", 390, 844, 2, True)]

proc = subprocess.Popen([EDGE, "--headless=new", "--remote-debugging-port=9341", "--remote-allow-origins=*",
                         f"--user-data-dir={OUT}\\prof-shots", "--window-size=1440,900", "about:blank"])
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9341/json")) if t["type"] == "page")
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
            if msg.get("method") in ("Runtime.exceptionThrown", "Log.entryAdded", "Runtime.consoleAPICalled"):
                events.append(msg)
            if msg.get("id") == mid[0]:
                return msg.get("result", {})

    cmd("Page.enable"); cmd("Runtime.enable"); cmd("Log.enable")
    for size, w, h, dpr, mobile in SIZES:
        cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
        cmd("Emulation.setEmulatedMedia", features=[{"name": "prefers-reduced-motion", "value": "reduce"}])  # reveal animations off
        for name, url in PAGES:
            events.clear()
            cmd("Page.navigate", url=url)
            time.sleep(6)
            # scroll through so lazy images load, then back to top
            cmd("Runtime.evaluate", expression="(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,80))}scrollTo(0,0)})()", awaitPromise=True)
            time.sleep(1.5)
            dims = cmd("Runtime.evaluate", expression="JSON.stringify([document.documentElement.scrollWidth, document.body.scrollHeight, location.href])", returnByValue=True)["result"]["value"]
            sw, sh, href = json.loads(dims)
            shot = cmd("Page.captureScreenshot", format="png", captureBeyondViewport=True, clip={"x": 0, "y": 0, "width": w, "height": min(sh, 9000), "scale": 1})
            open(os.path.join(OUT, f"{TAG}_{name}_{size}.png"), "wb").write(base64.b64decode(shot["data"]))
            errs = [e["params"].get("exceptionDetails", {}).get("exception", {}).get("description", "")[:160] if e["method"] == "Runtime.exceptionThrown"
                    else (e["params"].get("entry", {}).get("text") or str(e["params"].get("args", [{}])[0].get("value", "")))[:160]
                    for e in events if e["method"] == "Runtime.exceptionThrown" or e["params"].get("entry", {}).get("level") == "error"
                    or (e["method"] == "Runtime.consoleAPICalled" and e["params"].get("type") == "error")]
            print(f"{size:7s} {name:8s} {href:48s} height {sh:5d} {'HORIZONTAL SCROLL ' + str(sw) if sw > w else ''} errors: {errs[:3]}")
    ws.close()
finally:
    proc.terminate()
