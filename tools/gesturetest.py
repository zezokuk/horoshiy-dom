"""Gestures on the estates map and the 3D master plan (region page of the platform), desktop and phone, through real CDP input:

desktop  touchpad two-finger scroll pans (page stays), mouse wheel scrolls the page (+ hint), a page scroll that runs
         into the map keeps scrolling the page, Ctrl+wheel zooms, mouse drag pans, hover card, click -> fly-to,
         «Схема» tab renders;
phone    two fingers pan / pinch-zoom, one finger scrolls the page and shows «Двумя пальцами…», tap-tap opens a house.

Usage: npm run dev, then
    python tools/gesturetest.py [base_url] [--desktop] [--phone]
Prints PASS/FAIL per check and exits 1 if anything failed.

CDP wheel events always carry wheelDeltaY = ±120 and deltaMode 0, so here a «touchpad» event is a wheel event with
a horizontal component (deltaX != 0); the wheelDelta rules are covered by tests/int/gestures.int.spec.ts, plus a few
synthetic WheelEvents (which can set wheelDeltaY but never scroll the page) to check the in-browser wiring.
Map/3D state is read from the DOM only (marker pins, CSS2D price labels), so the test also runs on old builds.
"""
import json, math, os, statistics, subprocess, sys, tempfile, time, urllib.request
import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9347
args = [a for a in sys.argv[1:] if not a.startswith("--")]
BASE = (args[0] if args else "http://krd.horoshiy.localhost:3000").rstrip("/")
MODES = [m for m in ("desktop", "phone") if f"--{m}" in sys.argv] or ["desktop", "phone"]
PARTS = [p for p in ("map", "3d") if f"--{p}" in sys.argv] or ["map", "3d"]
ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36"
GAP = 0.45  # pause between scenarios, longer than the 250 ms «same gesture» window

MAP = ".map.leaflet-container"
PTS = {  # marker pins / price labels, relative to their box (so page scroll does not count as movement)
    "map": f"""(()=>{{const m=document.querySelector('{MAP}');if(!m)return null;const b=m.getBoundingClientRect();
        return [...m.querySelectorAll('.map-pin')].map(p=>{{const r=p.getBoundingClientRect();return [r.x+r.width/2-b.x,r.y+r.height/2-b.y]}})}})()""",
    "3d": """(()=>{const g=document.querySelector('.g3');if(!g)return null;const b=g.getBoundingClientRect();
        return [...g.querySelectorAll('.g3-label')].map(l=>{if(l.style.display==='none')return null;const r=l.getBoundingClientRect();
        return [r.x+r.width/2-b.x,r.y+r.height/2-b.y]})})()""",
}
BOX = {"map": MAP, "3d": ".g3__stage canvas"}
HINT = {"map": "#estates .map-hint", "3d": "#genplan3d .map-hint"}
results = []


def check(name, ok, info=""):
    results.append((name, bool(ok)))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}", flush=True)


def motion(a, b):
    """Median shift (dx, dy) and scale of the point cloud between two samples, or None."""
    pairs = [(p, q) for p, q in zip(a or [], b or []) if p and q]
    if len(pairs) < 2:
        return None
    dx = statistics.median(q[0] - p[0] for p, q in pairs)
    dy = statistics.median(q[1] - p[1] for p, q in pairs)

    def spread(pts):
        cx = sum(x for x, _ in pts) / len(pts)
        cy = sum(y for _, y in pts) / len(pts)
        return sum(math.hypot(x - cx, y - cy) for x, y in pts) / len(pts)

    s0 = spread([p for p, _ in pairs])
    return dx, dy, spread([q for _, q in pairs]) / s0 if s0 else 1.0


def fmt(m, a=None, b=None):
    if m:
        return "shift (%.0f, %.0f) px, scale %.3f" % m
    seen = lambda p: f"{sum(1 for x in p if x)}/{len(p)}" if p is not None else "none"
    return f"not enough points (before {seen(a)}, after {seen(b)} shown)"


proc = subprocess.Popen([EDGE, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", f"--remote-debugging-port={PORT}",
                         "--remote-allow-origins=*", f"--user-data-dir={os.path.join(tempfile.gettempdir(), 'gesturetest-prof')}",
                         "--window-size=1280,900", "about:blank"])
try:
    for _ in range(60):
        try:
            page = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")) if t["type"] == "page")
            break
        except Exception:
            time.sleep(0.25)
    ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180)
    mid = [0]

    def cmd(method, **params):
        mid[0] += 1
        ws.send(json.dumps({"id": mid[0], "method": method, "params": params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("method") == "Runtime.exceptionThrown":
                print("  page exception:", json.dumps(msg["params"]["exceptionDetails"], ensure_ascii=False)[:300])
            if msg.get("id") == mid[0]:
                if "error" in msg:
                    print("  CDP error", method, msg["error"])
                return msg.get("result", {})

    def js(expr):
        return cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True).get("result", {}).get("value")

    def wait(expr, timeout=60):
        end = time.time() + timeout
        while time.time() < end:
            if js(expr):
                return True
            time.sleep(0.3)
        return False

    def pts(kind):
        return js(PTS[kind])

    def settle(kind, timeout=14):
        """Wait until the points and the page scroll stop moving (damping, smooth scroll, zoom animation)."""
        prev, y = pts(kind), js("scrollY")
        end = time.time() + timeout
        while time.time() < end:
            time.sleep(0.4)
            cur, y2 = pts(kind), js("scrollY")
            m = motion(prev, cur)
            if m and abs(m[0]) < 0.3 and abs(m[1]) < 0.3 and abs(m[2] - 1) < 0.002 and y2 == y:
                return cur
            prev, y = cur, y2
        return prev

    def rect(sel):
        return json.loads(js(f"JSON.stringify(document.querySelector('{sel}').getBoundingClientRect())"))

    def place(kind, top):
        """Scroll so the map / 3D box starts `top` px below the top of the viewport."""
        js(f"scrollTo(0, scrollY + document.querySelector('{BOX[kind]}').getBoundingClientRect().top - {top})")
        time.sleep(0.6)

    def center(kind):
        r = rect(BOX[kind])
        return r["x"] + r["width"] / 2, r["y"] + r["height"] / 2

    def record_wheels(kind):
        """Log every wheel event at window level: time, over the box?, captured (defaultPrevented)?, wheelDeltaY."""
        js(f"""window.__wl=[];window.__wlSel='{BOX[kind].split()[0]}';window.__wlOn||(window.__wlOn=1,addEventListener('wheel',e=>
            __wl.push([performance.now(),!!(e.target.closest&&e.target.closest(__wlSel)),e.defaultPrevented,e.wheelDeltaY,e.deltaY]),{{passive:true}}))""")

    def wheel(x, y, dx, dy, n=1, ctrl=False):
        for _ in range(n):
            cmd("Input.dispatchMouseEvent", type="mouseWheel", x=x, y=y, deltaX=dx, deltaY=dy, modifiers=2 if ctrl else 0)

    def hint_text(kind):
        return js(f"(()=>{{const h=document.querySelector('{HINT[kind]}.is-on');return h?h.textContent.trim():''}})()") or ""

    def stop_autorotate():
        # ⟲ then ⟳: the scene ends where it was, autoRotate is switched off by the buttons
        js("(()=>{const b=document.querySelectorAll('.g3__ctrl button');b[2]?.click();b[3]?.click()})()")

    # ------------------------------------------------------------------ desktop
    def desktop_wheel_suite(kind):
        cx, cy = center(kind)
        label = "map" if kind == "map" else "3D"
        settle(kind)

        # 1. touchpad two-finger scroll over the box -> pans, page does not move
        time.sleep(GAP)
        record_wheels(kind)
        y0, p0 = js("scrollY"), pts(kind)
        wheel(cx, cy, 6, 15, n=6)
        p1 = settle(kind)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        prevented = js("__wl.filter(w=>w[2]).length")
        ok = m and math.hypot(m[0], m[1]) >= 15 and m[1] < 0 and m[0] < 0 and dy_page == 0
        check(f"desktop {label}: touchpad scroll pans (content follows fingers), page still", ok,
              f"{fmt(m, p0, p1)}; page moved {dy_page}px; prevented {prevented}/6")

        # 2. classic mouse wheel -> page scrolls, no pan, hint
        time.sleep(GAP)
        y0, p0 = js("scrollY"), pts(kind)
        wheel(cx, cy, 0, 100)
        time.sleep(0.15)
        hint = hint_text(kind)
        p1 = settle(kind)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        check(f"desktop {label}: mouse wheel scrolls the page, no pan", dy_page >= 60 and m and math.hypot(m[0], m[1]) < 3 and abs(m[2] - 1) < 0.01,
              f"page moved {dy_page}px; {fmt(m, p0, p1)}")
        check(f"desktop {label}: mouse wheel shows the hint about two fingers", "двумя пальцами" in hint.lower(), repr(hint))

        # 3. scroll-through: a touchpad scroll that starts above the box and runs into it keeps scrolling the page
        time.sleep(GAP)
        place(kind, 260)
        settle(kind)
        x, y = cx, 170  # page content above the box; the box arrives under the cursor after ~3 events
        record_wheels(kind)
        y0, p0 = js("scrollY"), pts(kind)
        wheel(x, y, 1, 30, n=12)
        p1 = settle(kind)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        wl = js("__wl")
        over = [w for w in wl if w[1]]
        gaps = [round(b[0] - a[0]) for a, b in zip(wl, wl[1:])]
        prevented = sum(1 for w in over if w[2])
        ok = dy_page >= 300 and len(over) >= 3 and prevented == 0 and m and math.hypot(m[0], m[1]) < 3 and max(gaps or [0]) < 250
        check(f"desktop {label}: page scroll running into the box keeps scrolling the page", ok,
              f"page moved {dy_page}px; {len(over)}/{len(wl)} events over the box, {prevented} captured; {fmt(m, p0, p1)}; max gap {max(gaps or [0])}ms")

        # 4. Ctrl + wheel (and trackpad pinch, which Chrome sends the same way) zooms; a small step, then back,
        #    so the 3D price labels stay in front of the camera for the next checks
        time.sleep(GAP)
        place(kind, 120)
        cx, cy = center(kind)
        p0, y0 = settle(kind), js("scrollY")
        record_wheels(kind)
        wheel(cx, cy, 0, -20, ctrl=True)
        p1 = settle(kind)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        seen = js("__wl.map(w=>w[4]).join(', ')")
        check(f"desktop {label}: Ctrl+wheel zooms in", m and m[2] >= 1.1 and dy_page == 0,
              f"{fmt(m, p0, p1)}; page moved {dy_page}px; deltaY seen by the page: {seen}")
        time.sleep(GAP)
        wheel(cx, cy, 0, 20, ctrl=True)
        settle(kind)
        return cx, cy

    def synthetic_suite():
        """Synthetic WheelEvents can set wheelDeltaY (CDP can't): check the browser wiring of the classifier on the map."""
        cx, cy = center("map")
        for name, init, want_pan in [
            ("vertical fractional (Windows precision touchpad)", "{deltaY: 12.5}", True),
            ("Mac trackpad (wheelDeltaY = -3*deltaY)", "{deltaY: 4, wheelDeltaY: -12}", True),
            ("Mac mouse (4.000244140625 steps)", "{deltaY: 4.000244140625, wheelDeltaY: -12}", False),
            ("Windows mouse (100 / -120)", "{deltaY: 100, wheelDeltaY: -120}", False),
        ]:
            time.sleep(GAP)
            p0 = pts("map")
            js(f"""(async()=>{{const t=document.elementFromPoint({cx},{cy});for(let i=0;i<5;i++){{
                t.dispatchEvent(new WheelEvent('wheel',Object.assign({{bubbles:true,cancelable:true,clientX:{cx},clientY:{cy},deltaMode:0}},{init})));
                await new Promise(r=>setTimeout(r,16))}}}})()""")
            p1 = settle("map")
            m = motion(p0, p1)
            moved = bool(m and math.hypot(m[0], m[1]) >= 5)
            check(f"desktop map: synthetic {name} -> {'pan' if want_pan else 'no pan'}", moved == want_pan, fmt(m, p0, p1))

    def desktop():
        # narrow viewport + DPR 0.5: swiftshader renders the 3D at ~7 fps, so wheel events stay < 250 ms apart
        cmd("Emulation.setDeviceMetricsOverride", width=760, height=800, deviceScaleFactor=0.5, mobile=False)
        cmd("Page.navigate", url=BASE + "/")
        wait("document.readyState==='complete'")
        if "map" in PARTS:
            js("document.getElementById('estates').scrollIntoView({block:'start',behavior:'instant'})")
            if not wait(f"!!document.querySelector('{MAP} .map-pin')"):
                check("desktop map: Leaflet loaded", False)
            else:
                place("map", 120)
                desktop_wheel_suite("map")
                print("  wheelDeltaY of CDP wheel events as the page sees them:", js("[...new Set(__wl.map(w=>w[3]))].join(', ')"))
                synthetic_suite()
        if "3d" not in PARTS:
            return

        js("document.getElementById('genplan3d').scrollIntoView({block:'start',behavior:'instant'})")
        time.sleep(1)
        js("document.querySelector('#genplan3d .g3--poster')?.click()")
        if not wait("document.querySelectorAll('.g3-label').length>1", 120):
            check("desktop 3D: scene loaded", False)
            return
        place("3d", 120)
        time.sleep(4)  # fly-in
        stop_autorotate()
        settle("3d", 30)
        cx, cy = desktop_wheel_suite("3d")

        # mouse drag still pans (MapControls), content follows the cursor
        time.sleep(GAP)
        place("3d", 120)
        cx, cy = center("3d")
        p0 = settle("3d")
        cmd("Input.dispatchMouseEvent", type="mouseMoved", x=cx, y=cy)
        cmd("Input.dispatchMouseEvent", type="mousePressed", x=cx, y=cy, button="left", buttons=1, clickCount=1)
        for k in range(1, 9):
            cmd("Input.dispatchMouseEvent", type="mouseMoved", x=cx + 12 * k, y=cy, button="left", buttons=1)
        cmd("Input.dispatchMouseEvent", type="mouseReleased", x=cx + 96, y=cy, button="left", buttons=0, clickCount=1)
        p1 = settle("3d", 25)
        m = motion(p0, p1)
        check("desktop 3D: mouse drag pans", m and m[0] >= 30, fmt(m, p0, p1))

        # hover card + click -> fly-to (morph layer)
        r = rect(BOX["3d"])
        found = None
        for fy in (0.45, 0.35, 0.55, 0.3, 0.6, 0.25, 0.7):
            for fx in [k / 20 for k in range(3, 18)]:
                x, y = r["x"] + r["width"] * fx, r["y"] + r["height"] * fy
                cmd("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y)
                time.sleep(0.12)
                if js("!!document.querySelector('.hover-card img')"):
                    found = (x, y)
                    break
            if found:
                break
        check("desktop 3D: hovering a house shows .hover-card", found, str(found))
        if found:
            cmd("Input.dispatchMouseEvent", type="mousePressed", x=found[0], y=found[1], button="left", buttons=1, clickCount=1)
            cmd("Input.dispatchMouseEvent", type="mouseReleased", x=found[0], y=found[1], button="left", buttons=0, clickCount=1)
            check("desktop 3D: click on a house starts the fly-to (.morph appears)", wait("!!document.querySelector('.morph')", 30))

        # «Схема» tab still renders
        cmd("Page.navigate", url=BASE + "/")
        wait("document.readyState==='complete'")
        js("document.getElementById('genplan3d').scrollIntoView({block:'start',behavior:'instant'})")
        time.sleep(1)
        js("[...document.querySelectorAll('#genplan3d [role=tab]')].find(b=>b.textContent.includes('Схема'))?.click()")
        ok = wait("document.querySelectorAll('#genplan3d svg .plot').length>5", 15)
        check("desktop: «Схема» tab renders the plan", ok, f"{js('document.querySelectorAll(`#genplan3d svg .plot`).length')} plots")
        if ok:
            pos = js("""(()=>{const g=document.querySelector('#genplan3d svg .plot--link');g.scrollIntoView({block:'center',behavior:'instant'});
                const r=g.querySelector('.plot__land').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height*0.2]})()""")
            time.sleep(0.4)
            cmd("Input.dispatchMouseEvent", type="mouseMoved", x=pos[0], y=pos[1])
            time.sleep(0.4)
            check("desktop: hovering a house on the scheme shows .hover-card", js("!!document.querySelector('#genplan3d .hover-card img')"), str(pos))

    # ------------------------------------------------------------------ phone
    def touch(points_at, steps=10):
        """points_at(f) -> [(x, y), ...] for f in 0..1; dispatches start, moves, end."""
        def tp(f):
            return [{"x": x, "y": y, "id": i + 1, "radiusX": 6, "radiusY": 6, "force": 1} for i, (x, y) in enumerate(points_at(f))]
        cmd("Input.dispatchTouchEvent", type="touchStart", touchPoints=tp(0))
        for k in range(1, steps + 1):
            cmd("Input.dispatchTouchEvent", type="touchMove", touchPoints=tp(k / steps))
            time.sleep(0.016)
        cmd("Input.dispatchTouchEvent", type="touchEnd", touchPoints=[])

    def phone_suite(kind):
        label = "map" if kind == "map" else "3D"
        place(kind, 150)
        cx, cy = center(kind)

        # two fingers dragged up -> the map / village moves up, page stays
        p0, y0 = settle(kind), js("scrollY")
        touch(lambda f: [(cx - 50, cy + 60 - 100 * f), (cx + 50, cy + 60 - 100 * f)])
        p1 = settle(kind, 25)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        check(f"phone {label}: two-finger drag up pans, page still", m and m[1] <= -30 and dy_page == 0, f"{fmt(m, p0, p1)}; page moved {dy_page}px")

        # two fingers dragged sideways
        p0, y0 = settle(kind), js("scrollY")
        touch(lambda f: [(cx - 90 + 100 * f, cy - 40), (cx - 90 + 100 * f, cy + 40)])
        p1 = settle(kind, 25)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        check(f"phone {label}: two-finger drag sideways pans", m and m[0] >= 30 and dy_page == 0, f"{fmt(m, p0, p1)}; page moved {dy_page}px")

        # pinch out -> zoom in
        p0, y0 = settle(kind), js("scrollY")
        touch(lambda f: [(cx - 30 - 60 * f, cy), (cx + 30 + 60 * f, cy)])
        p1 = settle(kind, 25)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        check(f"phone {label}: pinch out zooms in", m and m[2] >= 1.1 and dy_page == 0, f"{fmt(m, p0, p1)}; page moved {dy_page}px")

        # one finger -> page scrolls, the map stays, hint about two fingers
        place(kind, 150)
        cx, cy = center(kind)
        p0, y0 = settle(kind), js("scrollY")
        touch(lambda f: [(cx, cy + 100 - 160 * f)])
        time.sleep(0.15)
        hint = hint_text(kind)
        p1 = settle(kind)
        m, dy_page = motion(p0, p1), js("scrollY") - y0
        check(f"phone {label}: one-finger drag scrolls the page, no pan", dy_page >= 50 and m and math.hypot(m[0], m[1]) < 3,
              f"page moved {dy_page}px; {fmt(m, p0, p1)}")
        check(f"phone {label}: one-finger drag shows «Двумя пальцами…»", "двумя пальцами" in hint.lower(), repr(hint))

    def phone():
        cmd("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=1, mobile=True)
        cmd("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
        cmd("Emulation.setUserAgentOverride", userAgent=ANDROID_UA)
        cmd("Page.navigate", url=BASE + "/")
        wait("document.readyState==='complete'")
        if "map" in PARTS:
            js("document.getElementById('estates').scrollIntoView({block:'start',behavior:'instant'})")
            if not wait(f"!!document.querySelector('{MAP} .map-pin')"):
                check("phone map: Leaflet loaded", False)
            else:
                print("  phone map touch-action:", js(f"getComputedStyle(document.querySelector('{MAP}')).touchAction"))
                phone_suite("map")
        if "3d" not in PARTS:
            return

        js("document.getElementById('genplan3d').scrollIntoView({block:'start',behavior:'instant'})")
        time.sleep(1)
        js("document.querySelector('#genplan3d .g3--poster')?.click()")
        if not wait("document.querySelectorAll('.g3-label').length>1", 120):
            check("phone 3D: scene loaded", False)
            return
        place("3d", 150)
        time.sleep(4)
        stop_autorotate()
        settle("3d", 30)
        phone_suite("3d")

        # tap a house -> card with «Открыть дом», second tap -> fly-to
        place("3d", 150)
        settle("3d", 25)
        g = rect(".g3")
        # candidates: just under the price labels (free houses), then a coarse grid over the canvas
        labels = [p for p in pts("3d") if p and 20 < p[0] < g["width"] - 60 and 40 < p[1] < g["height"] - 80]
        cands = [(g["x"] + lx, g["y"] + ly + off) for lx, ly in labels for off in (22, 34, 14, 46)]
        cands += [(g["x"] + g["width"] * fx / 10, g["y"] + g["height"] * fy / 20) for fy in (9, 7, 11, 13, 5, 15) for fx in range(2, 9)]
        hit = None
        for x, y in cands:
            touch(lambda f: [(x, y)], steps=0)
            time.sleep(0.4)
            if js("!!document.querySelector('.hover-card.is-touch img')"):  # a plot with a house (a unit), not an empty plot
                hit = (round(x), round(y))
                break
        check("phone 3D: first tap on a house shows the card", hit, str(hit))
        if hit:
            time.sleep(0.4)
            touch(lambda f: [hit], steps=0)
            check("phone 3D: second tap on the same house starts the fly-to (.morph)", wait("!!document.querySelector('.morph')", 40))

        # «Схема» on a phone: the browser's compatibility mousemove after each tap must not reset the first tap
        cmd("Page.navigate", url=BASE + "/")
        wait("document.readyState==='complete'")
        js("document.getElementById('genplan3d').scrollIntoView({block:'start',behavior:'instant'})")
        time.sleep(1)
        js("[...document.querySelectorAll('#genplan3d [role=tab]')].find(b=>b.textContent.includes('Схема'))?.click()")
        if not wait("document.querySelectorAll('#genplan3d svg .plot--link').length>0", 15):
            check("phone scheme: rendered", False)
            return
        pos = js("""(()=>{const g=document.querySelector('#genplan3d svg .plot--link');g.scrollIntoView({block:'center',inline:'center',behavior:'instant'});
            const r=g.querySelector('.plot__land').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height*0.2]})()""")
        time.sleep(0.6)
        touch(lambda f: [tuple(pos)], steps=0)
        time.sleep(0.6)
        check("phone scheme: first tap on a house shows the card", js("!!document.querySelector('#genplan3d .hover-card.is-touch')"), str(pos))
        touch(lambda f: [tuple(pos)], steps=0)
        check("phone scheme: second tap on the same house opens it", wait("!!document.querySelector('.morph') || location.pathname.startsWith('/houses')", 30))

    cmd("Page.enable")
    cmd("Runtime.enable")
    for mode in MODES:
        print(f"--- {mode} ---", flush=True)
        desktop() if mode == "desktop" else phone()
    ws.close()
finally:
    proc.terminate()

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed" + (f"; FAILED: {', '.join(failed)}" if failed else ""))
sys.exit(1 if failed or not results else 0)
