"""Shots for the design show (ПОКАЗ.md): key pages on a computer (1440×900) and a phone (390×844) — the first screen
and the whole page — plus the states that need a hand: the 3D plan with filters, «план → дом» frames, the phone
menu, the admin's «Как вести сайт», the lead form (from the last `python tools/formtest.py` run, which sends and
deletes a test lead). Needs `npm run dev`.

    python tools/designshots.py now           → platform/показ/*.jpg (the show; ПОКАЗ.md links them)
    python tools/designshots.py <tag> [names] → tools/.shots/design_<tag>_*.jpg (before/after comparisons)

The phone's whole page is glued from screens (Chrome's capture beyond the viewport repeats the first screen when it
emulates a phone — seen 20.10); fixed bars are hidden after the first screen. Long pages are cut at 12 screens.
"""
import base64, io, json, os, shutil, sys, time
from PIL import Image
from cdp import Browser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = sys.argv[1] if len(sys.argv) > 1 else "now"
ONLY = set(sys.argv[2:])
OUT = os.path.join(ROOT, "показ") if TAG == "now" else os.path.join(ROOT, "tools", ".shots")
PREFIX = "" if TAG == "now" else f"design_{TAG}_"
H = "horoshiy.localhost:3000"
K = f"krd.{H}"
PAGES = [
    ("01-главная-сейчас", f"http://{H}/"),
    ("02-экран-1-дом-перед-названием", f"http://{H}/preview/hero-1"),
    ("03-экран-2-через-генплан", f"http://{H}/preview/hero-2"),
    ("04-экран-3-минимализм", f"http://{H}/preview/hero-3"),
    ("05-посёлок-динская", f"http://{K}/objects/dinskaya"),
    ("06-дом", f"http://{K}/houses/di-tip12"),
    ("07-построить", f"http://{H}/build"),
    ("08-нововеличковская-скоро", f"http://{K}/objects/novovelichkovskaya"),
    ("09-промо-динская", f"http://{K}/p/dinskaya"),
    ("10-готовые-дома-ключ", f"http://{H}/catalog"),
    ("11-404", f"http://{H}/takoy-stranicy-net"),
]
# shots are of the design, not of the tools around it; instant scrolling (html has smooth scrolling: a second
# scroll call would cancel the first one mid-way)
CLEAN = "nextjs-portal, .preview-switch { display: none !important; } html { scroll-behavior: auto !important; }"
HIDE_FIXED = ".header, .sticky-cta, .float-call, .cookie, .progress { visibility: hidden !important; }"
os.makedirs(OUT, exist_ok=True)


def css(b, text, id_):
    b.js(f"(() => {{ let s = document.getElementById('{id_}'); if (!s) {{ s = document.createElement('style'); s.id = '{id_}'; document.head.append(s) }} s.textContent = {json.dumps(text)} }})()")


def grab(b):
    return Image.open(io.BytesIO(base64.b64decode(b.cmd("Page.captureScreenshot", format="png")["data"]))).convert("RGB")


def save(im, name, width=None, quality=82):
    if width and im.width > width:
        im = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)
    path = os.path.join(OUT, f"{PREFIX}{name}.jpg")
    im.save(path, quality=quality, optimize=True, progressive=True)
    return os.path.relpath(path, ROOT)


def walk(b, h):
    """Scroll down and back so reveal animations and lazy images run."""
    height = b.js("document.documentElement.scrollHeight") or 0
    for y in range(0, height, h // 2):
        b.js(f"scrollTo(0,{y})")
        time.sleep(0.06)
    b.js("scrollTo(0,0)")
    time.sleep(0.8)


def full_phone(b, h, scale):
    height = b.js("document.documentElement.scrollHeight")
    tiles, y = [], 0
    while y < height and len(tiles) < 12:
        b.js(f"scrollTo(0,{y})")
        time.sleep(0.5)
        if tiles:
            css(b, HIDE_FIXED, "shots-fixed")
        tiles.append((b.js("scrollY"), grab(b)))
        y += h
    css(b, "", "shots-fixed")
    last_y, last = tiles[-1]
    sheet = Image.new("RGB", (last.width, round((last_y + h) * scale)), (255, 255, 255))
    for ty, im in tiles:
        sheet.paste(im, (0, round(ty * scale)))
    return sheet


for w, h, mob, dev, port in [(1440, 900, False, "d", 9380), (390, 844, True, "m", 9381)]:
    with Browser(port, f"prof-design-{dev}", w, h, mobile=mob) as b:
        for name, url in PAGES:
            if ONLY and name not in ONLY:
                continue
            b.go(url, 4)
            b.js("document.querySelector('.cookie button')?.click()")
            css(b, CLEAN, "shots-clean")
            walk(b, h)
            first = save(grab(b), f"{name}-{dev}-экран")
            if mob:
                whole = save(full_phone(b, h, 2), f"{name}-{dev}-целиком", 390, 72)  # whole pages are for scrolling through, not zooming
            else:
                m = b.cmd("Page.getLayoutMetrics")["cssContentSize"]
                data = b.cmd("Page.captureScreenshot", format="png", captureBeyondViewport=True, clip={"x": 0, "y": 0, "width": w, "height": min(m["height"], 14000), "scale": 1})["data"]
                whole = save(Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB"), f"{name}-{dev}-целиком", 960, 72)
            print(dev, first, whole, b.errors()[:1])

        if not ONLY or "генплан" in ONLY:
            # the 3D plan as a scene: filters + ribbon, after the 3D has loaded
            b.go(f"http://{K}/objects/dinskaya", 3)
            css(b, CLEAN, "shots-clean")
            b.js("document.querySelector('.genplan').scrollIntoView({block: 'start'}); scrollBy(0, -80)")
            b.wait("document.querySelectorAll('.g3-label').length > 0", 60)
            time.sleep(2)
            print(dev, save(grab(b), f"12-генплан-фильтры-{dev}"))
            b.js("document.querySelector('.gf__opts button')?.click()")
            time.sleep(1)
            print(dev, save(grab(b), f"12-генплан-фильтр-включён-{dev}"))

        if not ONLY or "план-дом" in ONLY:
            # «план → каркас → дом» on /build: four points of its scroll, glued into one picture
            b.go(f"http://{H}/build", 3)
            css(b, CLEAN, "shots-clean")
            top, height = json.loads(b.js("(() => { const r = document.querySelector('.s2h').getBoundingClientRect(); return JSON.stringify([r.top + scrollY, r.height]) })()"))
            frames = []
            for f in (0, 0.4, 0.72, 1):
                b.js(f"scrollTo(0, {top - 76 + f * max(0, height - h)})")
                time.sleep(0.9)
                frames.append(grab(b))
            fw = 700 if not mob else 300
            frames = [im.resize((fw, round(fw * im.height / im.width))) for im in frames]
            cols = 2 if not mob else 4
            rows = (len(frames) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * fw + (cols - 1) * 10, rows * frames[0].height + (rows - 1) * 10), (255, 255, 255))
            for i, im in enumerate(frames):
                sheet.paste(im, ((i % cols) * (fw + 10), (i // cols) * (im.height + 10)))
            print(dev, save(sheet, f"13-план-каркас-дом-{dev}"))

        if mob and (not ONLY or "меню" in ONLY):
            b.go(f"http://{H}/catalog", 3)
            css(b, CLEAN, "shots-clean")
            b.js("document.querySelector('.burger').click()")
            time.sleep(0.9)
            print(dev, save(grab(b), "14-меню-m"))

        if not mob and (not ONLY or "админка" in ONLY):
            ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
            b.go(f"http://{H}/admin/login", 4)
            if b.js("!!document.querySelector('input[name=email]')"):
                for field in ("email", "password"):
                    b.js(f"document.querySelector('input[name={field}]').focus()")
                    b.type(ENV["SEED_ADMIN_" + field.upper()])
                b.js("document.querySelector('button[type=submit]').click()")
                b.wait("!location.pathname.includes('/login')", 60)
            b.go(f"http://{H}/admin", 5)
            css(b, CLEAN, "shots-clean")
            print(dev, save(grab(b), "15-админка-как-вести-сайт-d"))

# the lead form: shots of the last formtest run (it sends a real lead and deletes it, so it is not run from here)
if TAG == "now":
    for dev in ("d", "m"):
        for st, label in (("full", "номер-набран"), ("done", "отправлено")):
            src = os.path.join(ROOT, "tools", ".shots", f"form_{dev}_{st}.png")
            if os.path.exists(src):
                print(save(Image.open(src).convert("RGB"), f"16-форма-{label}-{dev}"))
