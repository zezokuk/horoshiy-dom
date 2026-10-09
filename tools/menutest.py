"""Phone menu: the burger opens and closes it; a same-page link («Посёлки» → /#estates) closes it, unlocks the page
scroll and lands on the section; a link to another page opens that page with the menu closed.

    python tools/menutest.py        (npm run dev first)
"""
import json, os, subprocess, sys, time, urllib.request
import websocket

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".shots")
URL = "http://krd.horoshiy.localhost:3000/"
results = []

proc = subprocess.Popen([EDGE, "--headless=new", "--remote-debugging-port=9343", "--remote-allow-origins=*",
                         f"--user-data-dir={OUT}\\prof-menu", "--window-size=390,844", "about:blank"])
try:
    for _ in range(50):
        try:
            page = next(t for t in json.load(urllib.request.urlopen("http://127.0.0.1:9343/json")) if t["type"] == "page")
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

    state = "JSON.stringify({open: !!document.querySelector('.mobile-nav'), lock: document.body.style.overflow, y: Math.round(scrollY), path: location.pathname})"
    cmd("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True)
    cmd("Page.navigate", url=URL)
    time.sleep(5)
    js("document.querySelector('.burger').click()")
    time.sleep(0.4)
    s = json.loads(js(state))
    check("burger opens the menu and locks the page", s["open"] and s["lock"] == "hidden", str(s))
    js("document.querySelector('.burger').click()")
    time.sleep(0.4)
    s = json.loads(js(state))
    check("burger again closes it and unlocks", not s["open"] and s["lock"] == "", str(s))

    js("document.querySelector('.burger').click()")
    time.sleep(0.4)
    js("[...document.querySelectorAll('.mobile-nav a')].find(a => a.textContent.trim() === 'Посёлки').click()")
    time.sleep(2.5)  # smooth scroll to the anchor
    s = json.loads(js(state))
    top = js("(()=>{const e=document.getElementById('estates');return e?Math.round(e.getBoundingClientRect().top)+0:null})()")
    check("«Посёлки» on the same page closes the menu, unlocks, scrolls to the section", not s["open"] and s["lock"] == "" and s["y"] > 300 and top is not None and abs(top) < 200,
          f"{s}, section top {top}")

    js("document.querySelector('.burger').click()")
    time.sleep(0.4)
    js("[...document.querySelectorAll('.mobile-nav a')].find(a => a.textContent.trim() === 'Дома в продаже').click()")
    time.sleep(5)
    s = json.loads(js(state))
    check("a link to another page opens it with the menu closed", s["path"] == "/catalog" and not s["open"] and s["lock"] == "", str(s))
    ws.close()
finally:
    proc.terminate()
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
