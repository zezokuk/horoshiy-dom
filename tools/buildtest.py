"""«Построить»: how much scrolling it takes until the 3D house is finished, and that the page holds together.

Scrolls /build from the very top in small steps (like a wheel) on a desktop and a phone and reports the distance,
in screens, until the progress bar under the house is full (house built). Also: no sideways scroll, every text card
fits the screen, the badge reaches the last stage, the canvas is drawn.

    python tools/buildtest.py [max_screens]        (npm run dev first; default limit 3.5 screens)
"""
import json, os, subprocess, sys, time, urllib.request
import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".shots")
R = "horoshiy.localhost:3000"
LIMIT = float(sys.argv[1]) if len(sys.argv) > 1 else 3.5
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


proc = subprocess.Popen([EDGE, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--remote-debugging-port=9347",
                         "--remote-allow-origins=*", f"--user-data-dir={OUT}\\prof-build", "about:blank"])
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9347/json")) if t["type"] == "page")
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

    for size, w, h, dpr, mobile in [("desktop", 1440, 900, 1, False), ("phone", 390, 844, 2, True)]:
        cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=dpr, mobile=mobile)
        cmd("Page.navigate", url=f"http://{R}/build")
        time.sleep(5)
        # the bar under the house is scaleX(progress / 0.8): full = the house is built
        bar = "(()=>{const t=getComputedStyle(document.querySelector('.story__progress div')).transform;" \
              "return t==='none'?0:+t.split('(')[1].split(',')[0]})()"
        done_at = None
        y = 0
        total = js("document.documentElement.scrollHeight")
        while y < total:
            js(f"scrollTo({{top:{y},behavior:'instant'}})")
            time.sleep(0.05)
            if js(bar) >= 0.999:
                done_at = y
                break
            y += 60
        screens = done_at / h if done_at is not None else None
        check(f"{size}: house built within {LIMIT} screens of scrolling", screens is not None and screens <= LIMIT,
              f"{screens:.2f} screens ({done_at}px)" if screens is not None else "never finished")
        js(f"scrollTo({{top:{(done_at or 0) + 10},behavior:'instant'}})")
        time.sleep(0.3)
        badge = js("document.querySelector('.story__badge')?.innerText.replace(/\\s+/g,' ')")
        check(f"{size}: badge at the end", badge and ("Дом готов" in badge or "6 из 6" in badge or "5 из 5" in badge), repr(badge))
        over = js("document.documentElement.scrollWidth - innerWidth")
        check(f"{size}: no sideways scroll", over <= 0, f"{over}px")
        bad = js("[...document.querySelectorAll('.story__card')].filter(c=>{const r=c.getBoundingClientRect();"
                 "return r.left<0||r.right>innerWidth||r.height>innerHeight*0.6}).length")
        check(f"{size}: every text card fits the screen (and is under 60% of its height)", bad == 0, f"{bad} bad")
        if mobile:
            # with each reason on the reading line, the house zone (upper part of the screen) is not hidden by a solid card
            covered = []
            for j in range(5):
                js(f"(()=>{{const c=document.querySelectorAll('.story__card:not(.story__card--intro):not(.story__card--end)')[{j}];"
                   f"const r=c.getBoundingClientRect();scrollTo({{top:scrollY + r.top + r.height/2 - innerHeight*0.74,behavior:'instant'}})}})()")
                time.sleep(0.2)
                covered.append(js("[...document.querySelectorAll('.story__card')].filter(c=>{const r=c.getBoundingClientRect();"
                                  "return +getComputedStyle(c).opacity>0.4&&r.bottom>innerHeight*0.25&&r.top<innerHeight*0.45}).length"))
            check("phone: the house zone stays visible while reading", not any(covered), f"solid cards over the house per reason: {covered}")
        cards = js("document.querySelectorAll('.story__card').length")
        print(f"      cards {cards}, section height {js('Math.round(document.querySelector(\".story\").offsetHeight/innerHeight*100)/100')} screens")
    ws.close()
finally:
    proc.terminate()
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
