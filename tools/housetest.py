"""House page with room videos (the client's idea): circles on the plan open a video in a dialog.

as is:   the points have no videos yet (the client films them later) -> a circle opens the «video coming» card, no <video>.
then, on TEMPORARY data (two test clips made by ffmpeg, attached to the points, removed at the end):
desktop: click circle 1 -> dialog open, video 1 really plays; «Следующая» -> video 2; Esc -> closed and paused.
phone:   the plan scrolls sideways (bigger rooms); tap a chip -> video plays; tap on the dimmed backdrop -> closed.

    python tools/housetest.py        (npm run dev first)
"""
import json, os, subprocess, sys, time, urllib.parse, urllib.request
import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tools", ".shots")
URL = "http://krd.horoshiy.localhost:3000/houses/di-tip12"
H = "horoshiy.localhost:3000"
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
results = []


def api(path, data=None, method=None, token=None, raw=None, ctype="application/json"):
    headers = {"Host": H, "Content-Type": ctype}
    if token:
        headers["Authorization"] = f"JWT {token}"
    body = raw if raw is not None else (json.dumps(data).encode() if data is not None else None)
    r = urllib.request.Request(f"http://127.0.0.1:3000{path}", data=body, method=method, headers=headers)
    with urllib.request.urlopen(r, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8") or "{}")


def upload(token, file, alt):
    b = "----housetest"
    data = open(file, "rb").read()
    parts = (f"--{b}\r\nContent-Disposition: form-data; name=\"_payload\"\r\n\r\n{json.dumps({'alt': alt})}\r\n"
             f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{os.path.basename(file)}\"\r\nContent-Type: video/mp4\r\n\r\n").encode() + data + f"\r\n--{b}--\r\n".encode()
    return api("/api/media", token=token, raw=parts, method="POST", ctype=f"multipart/form-data; boundary={b}")["doc"]


token = api("/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]}, "POST")["token"]
project = api("/api/projects?where[slug][equals]=tip-12&depth=0", token=token)["docs"][0]
tour_before = [{k: t.get(k) for k in ("label", "x", "y", "video", "poster")} for t in project.get("tour") or []]
clips = []
for i, color in [(1, "0x4a6b52"), (2, "0x8a6d3b")]:
    f = os.path.join(OUT, f"housetest-room-{i}.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c={color}:s=360x640:d=8,format=yuv420p",
                    "-c:v", "libx264", "-movflags", "+faststart", f], check=True)
    clips.append(f)
made = []

proc = subprocess.Popen([EDGE, "--headless=new", "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=9344",
                         "--remote-allow-origins=*", f"--user-data-dir={OUT}\\prof-house", "--window-size=1440,900", "about:blank"])
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9344/json")) if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=120)
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

    def check(name, ok, info=""):
        results.append(bool(ok))
        print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")

    def center(sel, i=0):
        r = json.loads(js(f"(()=>{{const e=document.querySelectorAll('{sel}')[{i}];e.scrollIntoView({{block:'center',inline:'center',behavior:'instant'}});return JSON.stringify(e.getBoundingClientRect())}})()"))
        return r["x"] + r["width"] / 2, r["y"] + r["height"] / 2

    def click(x, y, touch=False):
        if touch:
            cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=[{"x": x, "y": y}])
            cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])
        else:
            cmd("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y)
            cmd("Input.dispatchMouseEvent", type="mousePressed", x=x, y=y, button="left", clickCount=1)
            cmd("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y, button="left", clickCount=1)

    VIDEO = "JSON.stringify((()=>{const d=document.querySelector('.tour__modal');const v=d&&d.querySelector('video');return {open:!!d&&d.open, src:v?v.currentSrc.split('/').pop():null, t:v?+v.currentTime.toFixed(2):0, paused:v?v.paused:null}})())"

    cmd("Emulation.setDeviceMetricsOverride", width=1440, height=900, deviceScaleFactor=1, mobile=False)
    # ---- as is: points without videos
    if not any(t.get("video") for t in tour_before):
        cmd("Page.navigate", url=URL)
        time.sleep(5)
        x, y = center(".tour__dot", 0)
        click(x, y)
        time.sleep(1)
        soon = json.loads(js("JSON.stringify((()=>{const d=document.querySelector('.tour__modal');return {open:!!d&&d.open, card:(d&&d.querySelector('.tour__soon')||{}).textContent||'', video:!!(d&&d.querySelector('video'))}})())"))
        check("no video yet: a circle opens the «video coming» card, no <video>", soon["open"] and "Здесь будет видео" in soon["card"] and not soon["video"], str(soon)[:120])
        js("document.querySelector('.tour__modal').close()")

    # ---- temporary videos on the points
    for i, f in enumerate(clips):
        made.append(upload(token, f, f"housetest {i + 1}"))
    api(f"/api/projects/{project['id']}", {"tour": [{**t, "video": made[i]["id"]} for i, t in enumerate(tour_before[:2])]}, "PATCH", token)
    names = [m["filename"] for m in made]

    # ---- desktop
    cmd("Page.navigate", url=URL)
    time.sleep(5)
    check("plan has 2 circles", js("document.querySelectorAll('.tour__dot').length") == 2)
    x, y = center(".tour__dot", 0)
    click(x, y)
    time.sleep(3)
    s = json.loads(js(VIDEO))
    check("desktop: circle 1 opens the dialog and video 1 plays", s["open"] and s["src"] == names[0] and s["t"] > 0.5 and not s["paused"], str(s))
    js("[...document.querySelectorAll('.tour__nav button')].find(b=>b.textContent.includes('Следующая')).click()")
    time.sleep(3)
    s = json.loads(js(VIDEO))
    check("desktop: «Следующая» switches to video 2, it plays", s["open"] and s["src"] == names[1] and s["t"] > 0.5 and not s["paused"], str(s))
    cmd("Input.dispatchKeyEvent", type="keyDown", key="Escape", code="Escape", windowsVirtualKeyCode=27)
    cmd("Input.dispatchKeyEvent", type="keyUp", key="Escape", code="Escape", windowsVirtualKeyCode=27)
    time.sleep(0.6)
    s = json.loads(js(VIDEO))
    check("desktop: Esc closes the dialog", not s["open"], str(s))
    check("desktop: page scroll is not locked after closing", js("getComputedStyle(document.body).overflow") != "hidden")

    # ---- phone
    cmd("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True)
    cmd("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
    cmd("Page.navigate", url=URL)
    time.sleep(5)
    sw = json.loads(js("JSON.stringify((()=>{const s=document.querySelector('.tour__scroll');return [s.scrollWidth,s.clientWidth,document.documentElement.scrollWidth,innerWidth]})())"))
    check("phone: the plan scrolls sideways, the page does not", sw[0] > sw[1] * 1.3 and sw[2] <= sw[3], str(sw))
    dot = json.loads(js("JSON.stringify(document.querySelector('.tour__dot').getBoundingClientRect())"))
    check("phone: circle is at least 32 px", dot["width"] >= 32, f"{dot['width']}px")
    x, y = center(".tour__chip", 1)
    click(x, y, touch=True)
    time.sleep(3)
    s = json.loads(js(VIDEO))
    check("phone: tap on chip 2 opens video 2, it plays", s["open"] and s["src"] == names[1] and s["t"] > 0.5, str(s))
    box = json.loads(js("JSON.stringify(document.querySelector('.tour__box').getBoundingClientRect())"))
    check("phone: the video fits the screen", box["height"] <= 844 and box["width"] <= 390, f"{box['width']:.0f}x{box['height']:.0f}")
    click(6, 6, touch=True)  # the dimmed backdrop, outside the video box
    time.sleep(0.6)
    s = json.loads(js(VIDEO))
    check("phone: tap on the backdrop closes it and stops the video", not s["open"], str(s))
    paused = js("(()=>{const v=document.querySelector('.tour__modal video');return v?v.paused:true})()")
    check("phone: no sound left playing after closing", paused, str(paused))
    ws.close()
finally:
    proc.terminate()
    # put the points back as they were and remove the test clips
    api(f"/api/projects/{project['id']}", {"tour": tour_before}, "PATCH", token)
    for m in made:
        api(f"/api/media/{m['id']}", None, "DELETE", token)
    left = api(f"/api/media?where[filename][like]=housetest&depth=0", token=token)["totalDocs"]
    after = api(f"/api/projects/{project['id']}?depth=0", token=token).get("tour") or []
    check("test clips deleted, the points restored", left == 0 and [t.get("video") for t in after] == [t.get("video") for t in tour_before], f"left {left}")
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
