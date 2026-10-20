"""What a page downloads on a phone, file by file (to find where the kilobytes come from).

    python tools/bytes.py [url] [top N]
"""
import sys, time
from cdp import Browser

url = sys.argv[1] if len(sys.argv) > 1 else "http://krd.horoshiy.localhost:3000/p/dinskaya"
top = int(sys.argv[2]) if len(sys.argv) > 2 else 12
with Browser(9389, "prof-bytes", 390, 844, mobile=True) as b:
    b.cmd("Network.enable")
    b.cmd("Network.setCacheDisabled", cacheDisabled=True)
    b.events = []
    b.go(url, 6)
    urls, size = {}, {}
    for e in b.events:
        p = e.get("params", {})
        if e.get("method") == "Network.responseReceived":
            urls[p["requestId"]] = p["response"]["url"]
        elif e.get("method") == "Network.loadingFinished":
            size[p["requestId"]] = p.get("encodedDataLength", 0)
    rows = sorted(((size.get(r, 0), u) for r, u in urls.items()), reverse=True)
    print(f"total {sum(s for s, _ in rows) / 1024:.0f} KB in {len(rows)} files")
    for s, u in rows[:top]:
        print(f"{s / 1024:8.1f} KB  {u.split('?')[0][-90:]}")
