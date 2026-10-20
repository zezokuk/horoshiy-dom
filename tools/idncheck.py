"""The site on a Cyrillic domain (хорошийдом.рф), checked locally without DNS: start the server with the domain in
Cyrillic, then ask it as browsers do — the Host header in punycode.

    set NEXT_PUBLIC_ROOT_DOMAIN=хорошийдом.рф   (PowerShell: $env:NEXT_PUBLIC_ROOT_DOMAIN='хорошийдом.рф')
    npm run dev           (process env wins over .env)
    python tools/idncheck.py

Checks: main domain and region subdomain pages, the redirects between them, sitemap / robots / llms in punycode,
the admin only on the main domain. Afterwards restart `npm run dev` without the variable.
"""
import json, re, sys, urllib.error, urllib.request

PUNY = "хорошийдом.рф".encode("idna").decode()  # xn--d1ahdngadl7b7a.xn--p1ai
MAIN, KRD = PUNY, f"krd.{PUNY}"
ok = True


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def get(host, path):
    r = urllib.request.Request(f"http://127.0.0.1:3000{path}", headers={"Host": host})
    try:
        with urllib.request.build_opener(NoRedirect).open(r, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), resp.headers
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), e.headers


def check(name, cond, info=""):
    global ok
    ok &= bool(cond)
    print("PASS" if cond else "FAIL", name, info)


s, body, _ = get(MAIN, "/")
check("main domain: home 200", s == 200, s)
check("main domain: region links are https://krd.<punycode>", f'href="https://{KRD}' in body, re.findall(r'href="(https://krd\.[^"/]+)', body)[:1])
check("no Cyrillic domain in links", "хорошийдом" not in body.lower())
s, body, _ = get(KRD, "/")
check("region subdomain: krd home 200", s == 200 and "Краснодар" in body, s)
s, _, h = get(MAIN, "/r/krd/catalog")
check("/r/krd/… on the main domain → 308 to the subdomain", s == 308 and h.get("Location") == f"https://{KRD}/catalog", f"{s} {h.get('Location')}")
s, _, h = get(KRD, "/build")
check("company page on a subdomain → 308 to the main domain", s == 308 and h.get("Location") == f"https://{MAIN}/build", f"{s} {h.get('Location')}")
s, _, h = get(KRD, "/admin")
check("admin only on the main domain", s == 308 and h.get("Location", "").startswith(f"https://{MAIN}/admin"), f"{s} {h.get('Location')}")
s, body, _ = get(KRD, "/sitemap.xml")
locs = re.findall(r"<loc>([^<]+)</loc>", body)
check("region sitemap: punycode https URLs only", s == 200 and locs and all(l.startswith(f"https://{KRD}/") for l in locs), f"{len(locs)} urls, e.g. {locs[:1]}")
s, body, _ = get(MAIN, "/robots.txt")
check("robots.txt points at the punycode sitemap", s == 200 and f"https://{MAIN}/sitemap.xml" in body, body.strip().splitlines()[-1:] if body else s)
s, body, _ = get(KRD, "/llms.txt")
check("llms.txt of the region in punycode", s == 200 and f"https://{KRD}" in body, s)
print("ALL OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
