"""Viewport screenshots while really scrolling: the «Построить» 3D story: with a stage card in the
middle of the screen the badge names that stage and the 3D background is drawn and the 3D showcase on a phone.

    python tools/scrollshots.py        (npm run dev first; saves tools/.shots/ss_*.png)
"""
import base64, json, os, subprocess, sys, time, urllib.request
import websocket
from PIL import Image

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".shots")
R = "horoshiy.localhost:3000"
ok = True

proc = subprocess.Popen([EDGE, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--remote-debugging-port=9342",
                         "--remote-allow-origins=*", f"--user-data-dir={OUT}\\prof-ss", "--window-size=1440,900", "about:blank"])
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9342/json")) if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180)
    mid = [0]

    def cmd(m, **p):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": m, "params": p}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == mid[0]:
                return msg.get("result", {})

    def js(e):
        return cmd("Runtime.evaluate", expression=e, returnByValue=True, awaitPromise=True).get("result", {}).get("value")

    def shot(name, sel):
        """Viewport screenshot + the number of distinct colours inside `sel` on it. A WebGL canvas can't be read back
        from JS (its buffer is cleared after compositing), so the check uses the screenshot: blank = 1-2 colours."""
        path = os.path.join(OUT, f"ss_{name}.png")
        open(path, "wb").write(base64.b64decode(cmd("Page.captureScreenshot", format="png")["data"]))
        r = json.loads(js(f"JSON.stringify(document.querySelector('{sel}')?.getBoundingClientRect() || null)") or "null")
        if not r:
            return "no element"
        k, vh = js("devicePixelRatio"), js("innerHeight")
        box = [int(v * k) for v in (r["x"], max(0, r["y"]), r["x"] + r["width"], min(r["y"] + r["height"], vh))]
        return len({(a >> 4, b >> 4, c >> 4) for a, b, c in Image.open(path).convert("RGB").crop(box).resize((64, 40)).get_flattened_data()})

    STAGES = ["Фундамент", "Стены", "Кровля", "Окна и коммуникации", "Можно заезжать"]
    for size, w, h, dpr, mobile in [("desktop", 1440, 900, 1, False), ("phone", 390, 844, 2, True)]:
        cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
        cmd("Page.navigate", url=f"http://{R}/build")
        time.sleep(5)
        n = shot(f"story_{size}_top", ".build3d__canvas canvas")
        print(f"      {size} first screen: canvas colours {n}")
        for j in (0, 2, 4):  # reason j on the reading line -> the badge names stage j (the last one: the house is done)
            js(f"(()=>{{const c=document.querySelectorAll('.story__card:not(.story__card--intro):not(.story__card--end)')[{j}];"
               f"const r=c.getBoundingClientRect();scrollTo(0, scrollY + r.top + r.height/2 - innerHeight*(innerWidth>=900?0.55:0.74))}})()")
            time.sleep(4)  # the scene follows the scroll with easing; swiftshader is slow
            badge = js("document.querySelector('.story__badge span')?.textContent")
            n = shot(f"story_{size}_{j}", ".build3d__canvas canvas")
            good = badge == STAGES[j] and isinstance(n, int) and n > 8
            ok &= good
            print(f"{'PASS' if good else 'FAIL'} {size:7s} story card {j}  badge «{badge}» (want «{STAGES[j]}»)  canvas colours {n}")

    # phone: the region page's 3D showcase, after the fly-in
    cmd("Page.navigate", url=f"http://krd.{R}/")
    time.sleep(5)
    js("document.getElementById('genplan3d').scrollIntoView({block:'start',behavior:'instant'})")
    time.sleep(1)
    js("document.querySelector('#genplan3d .g3--poster')?.click()")
    time.sleep(12)
    js("scrollTo(0, scrollY + document.querySelector('#genplan3d .genplan').getBoundingClientRect().top - 70)")
    time.sleep(1.5)
    n = shot("showcase_phone", "#genplan3d .g3__stage canvas")
    labels = js("document.querySelectorAll('#genplan3d .g3-label').length")
    good = isinstance(n, int) and n > 8 and labels > 0
    ok &= good
    print(f"{'PASS' if good else 'FAIL'} phone   showcase canvas colours {n}, price labels {labels}")
    ws.close()
finally:
    proc.terminate()
print("ALL OK" if ok else "SOME FAILED")
sys.exit(0 if ok else 1)
