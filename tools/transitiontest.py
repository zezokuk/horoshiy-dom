"""Transition «3D plan → house page» on a region subdomain: hover a house in the 3D plan, click it and record, every frame,
the page scroll, the morph layer phase and the curtain opacity. Fails if the page visibly scrolls on the house page,
if the photo lands off its slot or if the route change was a full page load (the layer would be lost).

    python tools/transitiontest.py [estate_url] [--frames]        (npm run dev first)
--frames also saves screencast frames to tools/.shots/tt_*.jpg
"""
import base64, json, os, subprocess, sys, time, urllib.request
import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".shots")
os.makedirs(OUT, exist_ok=True)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
url = args[0] if args else "http://krd.horoshiy.localhost:3000/objects/dinskaya"  # «Южный ветер» is sold out since 14.10
FRAMES = "--frames" in sys.argv

proc = subprocess.Popen([EDGE, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--remote-debugging-port=9336",
                         "--remote-allow-origins=*", f"--user-data-dir={OUT}\\prof-tt", "--window-size=1440,1000", "about:blank"])
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9336/json")) if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=120)
    mid = [0]

    def cmd(method, **params):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": method, "params": params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == mid[0]:
                return msg.get("result", {})

    def js(e):
        return cmd("Runtime.evaluate", expression=e, returnByValue=True, awaitPromise=True).get("result", {}).get("value")

    def wait(expr, timeout=60):
        end = time.time() + timeout
        while time.time() < end:
            if js(expr):
                return True
            time.sleep(0.3)
        return False

    cmd("Emulation.setDeviceMetricsOverride", width=1440, height=1000, deviceScaleFactor=1, mobile=False)
    cmd("Page.enable")
    cmd("Page.navigate", url=url)
    wait("document.readyState==='complete'")
    # open the 3D (it loads lazily on scroll) and wait for the fly-in
    js("document.querySelector('#genplan .genplan').scrollIntoView({block:'center', behavior:'instant'})")
    time.sleep(1)
    js("document.querySelector('#genplan .g3--poster, #genplan button.g3--loading')?.click()")
    if not wait("!!document.querySelector('#genplan .g3__stage canvas') && document.querySelectorAll('#genplan .g3-label').length>0", 90):
        sys.exit("FAIL: 3D scene did not load")
    time.sleep(4)
    # a document marker: survives a client-side route change, disappears on a full page load
    js("window.__sameDoc = 1")
    r = json.loads(js("JSON.stringify(document.querySelector('#genplan .g3__stage canvas').getBoundingClientRect())"))
    found = None
    for fy in [0.35, 0.45, 0.55, 0.3, 0.6]:
        for fx in [x / 20 for x in range(4, 17)]:
            x, y = r["x"] + r["width"] * fx, r["y"] + r["height"] * fy
            cmd("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y, pointerType="mouse")
            time.sleep(0.15)
            if js("!!document.querySelector('.hover-card img')"):
                found = (x, y)
                break
        if found:
            break
    print("house under cursor:", found, "scrollY before click:", js("scrollY"))
    if not found:
        sys.exit("FAIL: no house found under the cursor")
    js("""(()=>{window.__t=[];const t0=performance.now();const tick=()=>{const m=document.querySelector('.morph');
      const c=m&&m.querySelector('.morph__curtain');
      __t.push([Math.round(performance.now()-t0),Math.round(scrollY),location.pathname.startsWith('/houses')?'H':'E',
        m?m.className.replace('morph morph--',''):'-',c?(+getComputedStyle(c).opacity).toFixed(2):'-']);
      if(performance.now()-t0<30000)requestAnimationFrame(tick)};requestAnimationFrame(tick)})()""")
    js("window.addEventListener('house:ready', e => { window.__ready = e.detail; window.__readyY = scrollY; })")
    x, y = found
    cmd("Input.dispatchMouseEvent", type="mousePressed", x=x, y=y, button="left", clickCount=1, pointerType="mouse")
    cmd("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y, button="left", clickCount=1, pointerType="mouse")
    frames = []
    if FRAMES:
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": "Page.startScreencast", "params": {"format": "jpeg", "quality": 55, "maxWidth": 720, "maxHeight": 500}}))
        t_end = time.time() + 14
        ws.settimeout(0.5)
        while time.time() < t_end:
            try:
                msg = json.loads(ws.recv())
            except Exception:
                continue
            if msg.get("method") == "Page.screencastFrame":
                frames.append(msg["params"]["data"])
                mid[0] += 1
                ws.send(json.dumps({"id": mid[0], "method": "Page.screencastFrameAck", "params": {"sessionId": msg["params"]["sessionId"]}}))
        ws.settimeout(120)
        cmd("Page.stopScreencast")
        for k, f in enumerate(frames):
            open(os.path.join(OUT, f"tt_{k:03d}.jpg"), "wb").write(base64.b64decode(f))
    # wait until the transition is really over: on the house page and the layer removed
    wait("location.pathname.startsWith('/houses') && !document.querySelector('.morph')", 40)
    time.sleep(1.5)
    same_doc = js("window.__sameDoc === 1")
    t = json.loads(js("JSON.stringify(window.__t || [])"))
    last = None
    for row in t:
        key = tuple(row[1:])
        if key != last:
            print("%5dms  scrollY=%-6s page=%s morph=%-6s curtain=%s" % tuple(row))
            last = key
    visible_moves = [row for i, row in enumerate(t[1:], 1)
                     if row[2] == "H" and row[1] != t[i - 1][1] and (row[4] == "-" or float(row[4]) < 0.98)]
    phases = {row[3] for row in t}
    print("final:", js("location.href"), "scrollY", js("scrollY"), "frames", len(frames))
    print("same document (client-side navigation):", same_doc, "| morph phases seen:", sorted(phases))
    print("VISIBLE SCROLL MOVES on house page:", len(visible_moves), visible_moves[:5])
    land = json.loads(js("JSON.stringify({target: window.__ready, scrollAtReady: window.__readyY, real: document.querySelector('.house__photo img').getBoundingClientRect()})"))
    off = abs((land["target"] or {}).get("top", -9999) - land["real"]["top"]) if land["target"] else 9999
    print("photo landing target top=%s, real top=%.0f, scroll at ready=%s -> off by %.0fpx" % (
        (land["target"] or {}).get("top"), land["real"]["top"], land["scrollAtReady"], off))
    ok = bool(same_doc) and "land" in phases and not visible_moves and js("location.pathname").startswith("/houses") and js("scrollY") == 0 and off < 2
    print("RESULT 3D -> house:", "OK" if ok else "FAIL")
    ws.close()
finally:
    proc.terminate()
sys.exit(0 if ok else 1)
