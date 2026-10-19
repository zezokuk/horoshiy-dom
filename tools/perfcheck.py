"""Phone speed without Lighthouse (not installed): the same core numbers, measured in Edge on a throttled «phone».

Emulation like Lighthouse mobile: 390×844, CPU 4× slower, network 150 ms / 1.6 Mbit/s. Per page:
  LCP (largest picture/text shown), CLS (layout jumps), TBT (main thread blocked by long tasks), bytes transferred.
Lighthouse «good»: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms. Run against the prod build (npm start).

    python tools/perfcheck.py
"""
import json, time
from cdp import Browser

H = "horoshiy.localhost:3000"
PAGES = [("home", f"http://{H}/"), ("estate", f"http://krd.{H}/objects/dinskaya"), ("house", f"http://krd.{H}/houses/di-tip12"), ("promo", f"http://krd.{H}/p/dinskaya")]
OBS = """(()=>{window.__perf={lcp:0,cls:0,tbt:0};
new PerformanceObserver(l=>{for(const e of l.getEntries())__perf.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput)__perf.cls+=e.value}).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>{for(const e of l.getEntries())__perf.tbt+=Math.max(0,e.duration-50)}).observe({type:'longtask',buffered:true});})()"""

rows = []
with Browser(9390, "prof-perf", 390, 844, mobile=True) as b:
    b.cmd("Network.enable")
    b.cmd("Network.setCacheDisabled", cacheDisabled=True)
    b.cmd("Network.emulateNetworkConditions", offline=False, latency=150, downloadThroughput=1.6e6 / 8, uploadThroughput=750e3 / 8)
    b.cmd("Emulation.setCPUThrottlingRate", rate=4)
    b.cmd("Page.addScriptToEvaluateOnNewDocument", source=OBS)
    for name, url in PAGES:
        b.events.clear()
        b.go(url, 6)
        time.sleep(2)
        p = b.js("JSON.stringify(window.__perf)")
        p = json.loads(p) if p else {}
        size = sum(e["params"].get("encodedDataLength", 0) for e in b.events if e.get("method") == "Network.loadingFinished")
        rows.append((name, p.get("lcp", 0) / 1000, p.get("cls", 0), p.get("tbt", 0), size / 1024))
print(f"{'page':8s} {'LCP, s':>7s} {'CLS':>6s} {'TBT, ms':>8s} {'KB':>7s}")
bad = 0
for n, lcp, cls, tbt, kb in rows:
    flag = " <-" if lcp > 2.5 or cls > 0.1 or tbt > 200 else ""
    bad += bool(flag)
    print(f"{n:8s} {lcp:7.2f} {cls:6.3f} {tbt:8.0f} {kb:7.0f}{flag}")
print("all within Lighthouse «good»" if not bad else f"{bad} page(s) outside «good» (marked <-)")
