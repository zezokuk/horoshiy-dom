"""Tiny Chrome DevTools helper for the browser tests: start headless Chrome or Edge, run JS, click, type, screenshot.

    from cdp import Browser
    with Browser(port=9360, profile="prof-x", width=1440, height=900) as b:
        b.go("http://horoshiy.localhost:3000/")
        b.shot("home.png")

Set CDP_BROWSER to use a browser at a custom path.
"""
import base64, json, os, subprocess, sys, time, urllib.request
import websocket


def browser_executable():
    if os.environ.get("CDP_BROWSER"):
        return os.environ["CDP_BROWSER"]
    if sys.platform == "darwin":
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
    elif os.name == "nt":
        candidates = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        ]
    else:
        candidates = ["/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
    for path in candidates:
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    raise FileNotFoundError("Chrome or Edge not found. Set CDP_BROWSER to the browser executable.")


EDGE = browser_executable()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".shots")


class Browser:
    def __init__(self, port, profile, width=1440, height=900, mobile=False):
        self.port, self.profile, self.w, self.h, self.mobile = port, profile, width, height, mobile
        self.mid = 0
        self.events = []

    def __enter__(self):
        os.makedirs(OUT, exist_ok=True)
        self.proc = subprocess.Popen([EDGE, "--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                                      f"--remote-debugging-port={self.port}", "--remote-allow-origins=*",
                                      f"--user-data-dir={os.path.join(OUT, self.profile)}", f"--window-size={self.w},{self.h}", "about:blank"])
        for _ in range(60):
            try:
                page = next(t for t in json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json")) if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.25)
        self.ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=180)
        self.cmd("Emulation.setDeviceMetricsOverride", width=self.w, height=self.h, deviceScaleFactor=2 if self.mobile else 1, mobile=self.mobile)
        self.cmd("Page.enable")
        self.cmd("Runtime.enable")
        self.cmd("DOM.enable")
        return self

    def __exit__(self, *a):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()

    def cmd(self, method, **params):
        self.mid += 1
        self.ws.send(json.dumps({"id": self.mid, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})
            self.events.append(msg)

    def js(self, expr):
        r = self.cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return r.get("result", {}).get("value")

    def errors(self):
        """Console errors and uncaught exceptions seen so far (and forget them)."""
        out = []
        for e in self.events:
            if e.get("method") == "Runtime.exceptionThrown":
                out.append(e["params"]["exceptionDetails"].get("exception", {}).get("description", "exception")[:200])
            elif e.get("method") == "Runtime.consoleAPICalled" and e["params"]["type"] == "error":
                out.append(" ".join(str(a.get("value", a.get("description", ""))) for a in e["params"]["args"])[:200])
        self.events = []
        return out

    def wait(self, expr, timeout=60):
        end = time.time() + timeout
        while time.time() < end:
            if self.js(expr):
                return True
            time.sleep(0.3)
        return False

    def go(self, url, settle=2):
        self.cmd("Page.navigate", url=url)
        self.wait("document.readyState === 'complete'", 120)
        time.sleep(settle)

    def click(self, selector=None, xy=None):
        if selector:
            r = json.loads(self.js(f"(()=>{{const e=document.querySelector({json.dumps(selector)});if(!e)return 'null';e.scrollIntoView({{block:'center',behavior:'instant'}});return JSON.stringify(e.getBoundingClientRect())}})()"))
            if not r:
                raise RuntimeError(f"no element {selector}")
            xy = (r["x"] + r["width"] / 2, r["y"] + r["height"] / 2)
        x, y = xy
        self.cmd("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y)
        self.cmd("Input.dispatchMouseEvent", type="mousePressed", x=x, y=y, button="left", clickCount=1)
        self.cmd("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y, button="left", clickCount=1)

    def type(self, text):
        self.cmd("Input.insertText", text=text)

    def key(self, key, code=None, vk=0):
        self.cmd("Input.dispatchKeyEvent", type="keyDown", key=key, code=code or key, windowsVirtualKeyCode=vk)
        self.cmd("Input.dispatchKeyEvent", type="keyUp", key=key, code=code or key, windowsVirtualKeyCode=vk)

    def files(self, selector, paths):
        # the element straight from JS (a node id from DOM.getDocument goes stale when React re-renders a drawer)
        obj = self.cmd("Runtime.evaluate", expression=f"document.querySelector({json.dumps(selector)})")["result"]
        if not obj.get("objectId"):
            raise RuntimeError(f"no element {selector}")
        self.cmd("DOM.setFileInputFiles", objectId=obj["objectId"], files=paths)

    def shot(self, name, full=False):
        p = {"format": "png"}
        if full:
            m = self.cmd("Page.getLayoutMetrics")["cssContentSize"]
            p["clip"] = {"x": 0, "y": 0, "width": self.w, "height": min(m["height"], 12000), "scale": 1}
            p["captureBeyondViewport"] = True
        path = os.path.join(OUT, name)
        open(path, "wb").write(base64.b64decode(self.cmd("Page.captureScreenshot", **p)["data"]))
        return path
