"""/realty.xml — the Yandex Webmaster feed «Список объектов недвижимости» (app/(frontend)/realty.xml/route.ts).

    python tools/feedtest.py     (dev server on :3000)

Valid XML with the 2026-03 namespace; one offer per FREE house of the region (counted via the API); `url` is the first
child; the required elements are there (type, category, location/address, area/value, price/value+currency, dealstatus,
image); the plan goes before the photo; links point to this region's own host; the main domain has no feed.
"""
import json, sys, urllib.error, urllib.request
import xml.etree.ElementTree as ET

H = "horoshiy.localhost:3000"
NS = "{http://webmaster.yandex.ru/schemas/feed/metarealty/2026-03}"
results = []


def check(name, ok, info=""):
    results.append(bool(ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {info}")


def get(path, host):
    try:
        r = urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:3000{path}", headers={"Host": host}), timeout=180)
        return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, ""


st, body = get("/realty.xml", f"krd.{H}")
check("krd: the feed answers", st == 200, st)
root = ET.fromstring(body)
check("root element and namespace", root.tag == f"{NS}supplementing-metarealty-feed", root.tag)
check("generation-date", root.find(f"{NS}generation-date") is not None)
offers = root.findall(f"{NS}offer")
houses = json.loads(get("/api/houses?where[status][equals]=free&limit=500&depth=1", H)[1] or "{}").get("docs", [])
krd = [h for h in houses if (h.get("region") or {}).get("slug") == "krd"] if houses and isinstance(houses[0].get("region"), dict) else houses
check("one offer per free house of the region", len(offers) == len(krd) and len(offers) > 0, f"{len(offers)} offers, {len(krd)} free")
ids = [o.get("internal-id") for o in offers]
check("internal-id unique", len(set(ids)) == len(ids))
bad = []
for o in offers:
    kids = list(o)
    need = ["type", "category", "location/" + NS + "address", "area/" + NS + "value", "price/" + NS + "value", "price/" + NS + "currency", "dealstatus", "image"]
    missing = [n for n in need if o.find(NS + n) is None]
    if kids[0].tag != f"{NS}url" or missing or not o.find(f"{NS}url").text.startswith(f"http://krd.{H}/houses/"):
        bad.append((o.get("internal-id"), missing))
check("every offer: url first, required elements, link on krd.", not bad, str(bad[:2]))
with_plan = [o for o in offers if len(o.findall(f"{NS}image")) > 1]
check("the plan comes before the photo", all("plan" in o.findall(f"{NS}image")[0].text or o.findall(f"{NS}image")[0].text != o.findall(f"{NS}image")[1].text for o in with_plan), f"{len(with_plan)} with two images")
check("main domain: no feed", get("/realty.xml", H)[0] == 404)
print(f"{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
