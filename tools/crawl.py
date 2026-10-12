"""Crawl the whole site (main domain + every region subdomain) and hunt for broken links and small text bugs.

For every page reachable by links: status, <title>, meta description, exactly one <h1>, images with alt,
and the visible text checked for «undefined», «NaN», «null», «[object», wrong Russian plurals («1 спальни»),
a space before a comma, doubled words. Every internal link and image is requested once (broken = not 200 after redirects).

    python tools/crawl.py        (npm run dev first)
"""
import html, json, re, sys, urllib.error, urllib.parse, urllib.request
from collections import defaultdict

ROOT = "horoshiy.localhost:3000"
START = [f"http://{ROOT}/", f"http://krd.{ROOT}/", f"http://msk.{ROOT}/", f"http://{ROOT}/locations"]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


opener = urllib.request.build_opener(NoRedirect)


def get(url, head=False, hops=5):
    """GET through 127.0.0.1 with the real Host header (Windows doesn't resolve *.localhost outside browsers)."""
    for _ in range(hops):
        p = urllib.parse.urlsplit(url)
        target = f"http://127.0.0.1:{p.port or 80}{p.path or '/'}{'?' + p.query if p.query else ''}"
        # Payload's file route answers HEAD with 404 — ask for the first byte instead
        hdrs = {"Host": p.netloc, **({"Range": "bytes=0-0"} if head else {})}
        r = urllib.request.Request(target, headers=hdrs)
        try:
            with opener.open(r, timeout=120) as resp:
                return (200 if resp.status == 206 else resp.status), url, resp.headers.get("content-type", ""), (b"" if head else resp.read()).decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 307, 308):
                url = urllib.parse.urljoin(url, e.headers["location"])
                continue
            return e.code, url, "", ""
        except Exception as e:  # noqa: BLE001
            return 0, url, "", str(e)
    return 0, url, "", "too many redirects"


def visible_text(body):
    body = body.split("</head>", 1)[-1]
    body = re.sub(r"(?is)<(script|style|noscript|template)\b.*?</\1>", " ", body)
    body = re.sub(r"<!--.*?-->", "", body)  # React splits «1<!-- --> спальни»
    body = re.sub(r"</?(b|i|em|strong|small|sup|sub)\b[^>]*>", "", body)  # inline tags glue to the words around
    body = re.sub(r"(?s)<[^>]+>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(body))


TEXT_BUGS = [
    (r"\bundefined\b", "undefined"),
    (r"\bNaN\b", "NaN"),
    (r"\bnull\b", "null"),
    (r"\[object ", "[object"),
    (r"(?<![\d,])\b1 (спальни|спален|дома|домов|посёлка|посёлков|года|лет|проекта|проектов|комнаты|санузла)\b", "plural after 1"),
    (r"\b([5-9]|1[0-9]) (спальни|дома|посёлка|проекта|комнаты|санузла)\b", "plural after 5+"),
    (r"\b[234] (спален|домов|посёлков|проектов|комнат)\b", "plural after 2-4"),
    (r"\s,", "space before comma"),
    (r"\b([А-Яа-яЁёA-Za-z]{3,}) \1\b", "doubled word"),
    (r"\.\.(?!\.)", "double dot"),
    (r"«\s|\s»", "space inside «»"),
]

WARN = {"doubled word"}  # crumbs + h1 («Контакты Контакты»), place + name («ст. Динская Динская»): look, don't fail
pages, assets, ref, page_ids, anchors = {}, {}, {}, {}, []
issues = defaultdict(list)
queue = list(START)
while queue:
    url = queue.pop(0).split("#")[0]
    if url in pages:
        continue
    s, final, ctype, body = get(url)
    pages[url] = s
    if s != 200:
        issues[url].append(f"status {s}")
        continue
    if "text/html" not in ctype:
        continue
    host = urllib.parse.urlsplit(final).netloc
    if not host.endswith(ROOT) or "/admin" in final or "/api/" in final:
        continue
    head = body.split("</head>")[0]
    if not re.search(r"<title>[^<]{5,}</title>", head):
        issues[final].append("no <title>")
    if not re.search(r'<meta name="description" content="[^"]{20,}"', head):
        issues[final].append("no meta description")
    h1 = len(re.findall(r"<h1[\s>]", body))
    if h1 != 1:
        issues[final].append(f"{h1} <h1>")
    for tag in re.findall(r"<img\b[^>]*>", body):
        if not re.search(r'\balt="', tag):
            issues[final].append(f"img without alt: {tag[:90]}")
    ids = re.findall(r'\bid="([^"]+)"', body)
    page_ids[url] = page_ids[final] = set(ids)
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        issues[final].append(f"duplicate ids {sorted(dup)}")
    text = visible_text(body)
    for rx, name in TEXT_BUGS:
        for m in re.finditer(rx, text):
            issues[final].append(f"{name}: …{text[max(0, m.start() - 40):m.end() + 30]}…")
    for href in re.findall(r'<a\b[^>]*\bhref="([^"]+)"', body):
        href = html.unescape(href)
        if href.startswith("#") and len(href) > 1:
            anchors.append((final, final, href[1:]))
        if href.startswith(("tel:", "mailto:", "#", "javascript:")):
            if href.startswith("tel:") and not re.fullmatch(r"tel:\+\d{11}", href):
                issues[final].append(f"odd tel link {href}")
            continue
        u = urllib.parse.urljoin(final, href)
        if urllib.parse.urlsplit(u).netloc.endswith(ROOT):
            if u.split("#")[0].endswith("/") and urllib.parse.urlsplit(u).path not in ("", "/"):
                issues[final].append(f"trailing slash link {href}")
            queue.append(u)
            if "#" in u and u.split("#", 1)[1]:
                anchors.append((final, u.split("#")[0], u.split("#", 1)[1]))
            ref.setdefault(u.split("#")[0], final)
    for src in re.findall(r'<(?:img|source|video)\b[^>]*\b(?:src|poster)="([^"]+)"', body) + [
        x.strip().split(" ")[0] for ss in re.findall(r'\bsrcSet="([^"]+)"|\bsrcset="([^"]+)"', body) for x in "".join(ss).split(",")
    ]:
        if src and not src.startswith("data:"):
            assets.setdefault(urllib.parse.urljoin(final, html.unescape(src)), final)

for a, page in assets.items():
    if not urllib.parse.urlsplit(a).netloc.endswith(ROOT):
        continue
    s, *_ = get(a, head=True)
    if s != 200:
        issues[page].append(f"broken asset {s} {a}")

for page, target, frag in anchors:
    if target in page_ids and frag not in page_ids[target]:
        issues[page].append(f"dead anchor #{frag} on {target}")

print(f"pages crawled: {len(pages)}, assets checked: {len(assets)}")
for u, s in sorted(pages.items()):
    if s != 200:
        print(f"  {s}  {u}   <- linked from {ref.get(u)}")
for u, lst in sorted(issues.items()):
    print(f"\n{u}")
    for x in sorted(set(lst)):
        print(f"  - {x}")
bad = {u: {x for x in v if x.split(":")[0] not in WARN} for u, v in issues.items()}
bad = {u: v for u, v in bad.items() if v}
print("\nCLEAN (warnings above are for a human look)" if not bad else f"\n{sum(len(v) for v in bad.values())} issues on {len(bad)} pages")
sys.exit(0 if not bad else 1)
