"""The phone menu open (fullscreen, big type) on a page — to see it by eye. → tools/.shots/menu_<name>.png

    python tools/menushot.py [url] [name]
"""
import sys, time
from cdp import Browser

url = sys.argv[1] if len(sys.argv) > 1 else "http://horoshiy.localhost:3000/catalog"
name = sys.argv[2] if len(sys.argv) > 2 else "catalog"
with Browser(9399, "prof-menu", 390, 844, mobile=True) as b:
    b.go(url, 3)
    b.js("document.querySelector('.cookie button')?.click()")
    b.js("document.querySelector('.burger').click()")
    time.sleep(0.9)
    print(b.shot(f"menu_{name}.png"), b.errors()[:1])
