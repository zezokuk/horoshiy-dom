"""Прайс СК «Хороший дом» от 27.10.2026 → база сайта, через REST API под администратором (как в админке).

    python tools/price_27_10.py           # план: «было → стало» по каждому полю, в базу ничего не пишет
    python tools/price_27_10.py --apply   # записать. Перед записью — лог прежних значений: backups/price-27-10-log.json
    python tools/price_27_10.py --undo    # вернуть всё как было по логу: созданные дома удаляются, поля — прежние

Сначала бэкап: python tools/backup.py. Сайт должен быть запущен (npm run dev). Повторный --apply ничего не ломает:
дома ищутся по «Адресу страницы» (code), меняются только отличающиеся поля.

Решения (подробно — в отчёте 29.10):
- Дома Динской в базе были по одному на «карточку типа» из слайдов. Теперь — по участкам прайса: в названии
  «Тип 5 (В3), уч. 17», «Участок на генплане» = номер участка застройщика (на его генплане участки 1–43).
  Старые адреса страниц сохранены: запись того же варианта стала конкретным участком.
- Таманская (1–6) и 300-летия Кубанского войска (1–2) — пока в посёлке «Динская» (клиенту задан вопрос). Их номера
  совпали бы с участками 1–6 основного генплана, поэтому на схеме они стоят на 44–49 и 50–51 (отдельные ряды
  за последним участком застройщика), а улица и настоящий номер — в названии: «Тип 6, ул. Таманская, уч. 1».
- Цена — ПЧО. Цена ЧО, «ПЧО фасадный», акции и маткапитал — в «Заметке для своих» (на сайте не видна): своего
  поля под это у дома нет.
- Площадь и мансарда — как в прайсе: где в прайсе нет «+ N мансарда», мансарда пустая.
"""
import argparse, json, os, sys, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(ROOT, ".env"), encoding="utf-8") if "=" in l and not l.startswith("#"))
HOST = "horoshiy.localhost:3000"
LOG = os.path.join(ROOT, "backups", "price-27-10-log.json")
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # *.localhost must not go to the system proxy
PREFIX = "Прайс 27.10.2026:"

# ---------- the price ----------
# ст. Динская: (участок, тип, м², мансарда, сотки, отделка, цена, статус, примечание, code — старый адрес страницы или новый)
MAIN = [
    (5, "Тип 6 (В2)", 115, 76, "4,2", "ПЧО", 10_500_000, "free", "можно материнский капитал в первоначальный взнос", "di-tip6-v2"),
    (12, "Тип 6 (В3)", 93.6, 55, "4", "ПЧО", 9_300_000, "free", "", "di-tip6-v3"),
    (11, "Тип 5", 110, 67, "4", "ПЧО", 9_700_000, "free", "", "di-tip5"),
    (17, "Тип 5 (В3)", 94.2, 55, "4", "ПЧО", 8_800_000, "reserved", "", "di-tip5-v3"),
    (18, "Тип 5 (В3)", 94.2, 55, "4", "ПЧО", 8_800_000, "free", "", "di-18-tip5-v3"),
    (21, "Тип 5 (В4)", 94, None, "4", "ПЧО", 9_300_000, "reserved", "", "di-tip5-v4"),
    (22, "Тип 2 (В4)", 96.4, None, "4", "ПЧО фасадный", 9_300_000, "free", "", "di-22-tip2-v4"),
    (23, "Тип 5 (В4)", 94, None, "4", "ПЧО фасадный", 9_300_000, "reserved", "", "di-23-tip5-v4"),
    (25, "Тип 6 (В3)", 95, None, "4", "ПЧО", 9_100_000, "free", "", "di-25-tip6-v3"),
    (26, "Тип 2 (В3)", 92.3, None, "4", "ПЧО", 8_900_000, "free", "", "di-26-tip2-v3"),
    (27, "Тип 2 (В4)", 96.4, None, "4", "ПЧО", 9_100_000, "free", "", "di-tip2-v4"),
    (28, "Тип 1 (В2)", 94, None, "4", "ЧО", 8_300_000, "free", "", "di-tip1-v2"),
]
# новые улицы: (улица, первая клетка на схеме, [(участок, тип, м², сотки, цена ПЧО, цена ЧО или None, code)])
STREETS = [
    ("ул. Таманская", 44, [
        (1, "Тип 6", 105, "4,1", 9_760_000, None, "di-tam-1-tip6"),
        (2, "Тип 12", 85, "4,1", 9_400_000, None, "di-tip12"),  # была «Тип 12» без участка, 85 м² — тот же дом по прайсу
        (3, "Тип 12", 85, "4,1", 9_400_000, 8_900_000, "di-tam-3-tip12"),
        (4, "Тип 2 (В5)", 91, "4", 9_300_000, None, "di-tip2-v5"),  # единственный «Тип 2 (В5)» в прайсе, та же цена
        (5, "Тип 5 (В4)", 94, "4", 9_300_000, 8_800_000, "di-tam-5-tip5-v4"),
        (6, "Тип 1 (В2)", 98, "4", 9_000_000, 8_500_000, "di-tam-6-tip1-v2"),
    ]),
    ("ул. 300-летия Кубанского войска", 50, [
        (1, "Тип 12", 86, "3,3", 9_400_000, 8_900_000, "di-300-1-tip12"),
        (2, "Тип 5 (В4)", 94, "4", 9_200_000, 8_700_000, "di-300-2-tip5-v4"),
    ]),
]
# Новая Адыгея: code → поля и примечание
OTHER = {
    "dr-tip10": ({"price": 15_500_000, "status": "free"}, ["ул. Дружбы 43", "отделка ПЧО", "цена 15 500 000 ₽", "акция до 31.12.2026"]),
    "kr-tip5-v2": ({"price": 13_000_000, "status": "reserved"}, ["ул. Красная 39", "отделка ПЧО", "цена 13 000 000 ₽", "бронь"]),
    "kr-tip3": ({"price": 13_500_000, "status": "free", "plot": "4 сот."}, ["ул. Красная 39", "отделка ПЧО", "цена 13 500 000 ₽", "акция до 31.12.2026"]),
}
SOLD_MOVES = {"di-tip8": 2}  # проданный «Тип 8» стоял на клетке 5 — теперь это участок 5 из прайса

GAS, SEPTIC, POWER = "Газ — по меже участка", "Септик до 9 м³", "Электричество 15 кВт на дом"
ESTATES = {
    "dinskaya": {
        # 43 участка застройщика (6 рядов), затем Таманская (6) и 300-летия (2) отдельным кварталом
        "genplan": {"rows": [7, 7, 7, 7, 7, 8, 6, 2], "road": "between"},
        "homes": 51,  # 43 по генплану застройщика + 6 + 2 из прайса; было 14 — число карточек в шахматке
        "utilities": [GAS, "Вода — индивидуальная скважина, второй водоносный слой", POWER, SEPTIC],
    },
    "krasnaya-39": {"utilities": [GAS, "Вода центральная", POWER, SEPTIC]},
    "druzhby-43": {"utilities": [GAS, "Вода центральная", POWER, SEPTIC]},
}
LANDING = ("dinskaya", {
    "offer": "Кирпичные дома с участком 3,3–4,2 сотки на севере станицы Динской, у реки. Предчистовая отделка, скважина и 15 кВт, газ по меже участка, семейная ипотека.",
})

MORTGAGE = [
    ("Семейная ипотека", None),  # None — оставить текст как есть
    ("IT-ипотека", None),
    ("Сельская ипотека", "Госпрограмма для покупки дома в сельской местности. В каких посёлках действует — подскажет менеджер."),
    ("Материнский капитал в первоначальный взнос", "Материнский капитал можно направить в первоначальный взнос. Для каких домов — уточняйте у менеджера."),
    ("Наличный расчёт", "Покупка без кредита: оплата полной стоимости по договору."),
    ("Рассрочка (индивидуально)", "Условия рассрочки обсуждаются индивидуально с отделом продаж."),
]
FINISHING = [
    "Разводка электричества и отопления",
    "Электрический котёл",
    "Штукатурка стен по маякам",
    "Откатные или распашные ворота",
    "Отмостка по периметру дома и паркоместо из тротуарной плитки",
    "Скважина — второй водоносный слой",
    "Электричество 15 кВт на каждый дом",
    "Газ по меже участка",
    "Септик до 9 м³",
]
FAQ = {
    "Можно купить дом в ипотеку?": "Да: семейная, IT- и сельская ипотека, материнский капитал можно направить в первоначальный взнос. Возможен наличный расчёт, рассрочка — в индивидуальном порядке. Поможем подобрать банк и программу, соберём документы — сделку и регистрацию оформляем за 2 недели.",
    "В каком состоянии дом при покупке?": "В предчистовой отделке: разведены электричество и отопление, стоит электрический котёл, стены оштукатурены по маякам. Откатные или распашные ворота, отмостка вокруг дома и паркоместо из тротуарной плитки. Отдельные дома продаются в черновой отделке — это указано в карточке дома.",
    "Какие коммуникации в доме?": "Вода — скважина на второй водоносный слой (в части посёлков — центральный водопровод), электричество 15 кВт на дом, септик до 9 м³. Газ — по меже участка.",
}
VALUES = {
    "Свой двор": "Участок 3,3–4,9 сотки, паркоместо из тротуарной плитки, место для сада, качелей и мангала.",
    "Тепло и надёжно": "Капитальный кирпичный дом: разводка отопления и электрический котёл, газ — по меже участка. Гарантия 5 лет.",
}
OFFICES = [
    ("Дома в Динской", "ст. Динская, ул. Славянская, 101", None),
    ("КП «Южный ветер»", "Республика Адыгея, аул Козет, ул. Хеттская, 1", "Пн–Вс 10:00–19:00"),  # часы — 04-Клиент-факты.md
]


# ---------- API ----------
def api(method, path, data=None, token=None):
    headers = {"Host": HOST, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"JWT {token}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request("http://127.0.0.1:3000" + path, data=body, method=method, headers=headers)
    try:  # a fresh `next dev` compiles the API route on the first call: minutes, not an error
        with OPENER.open(req, timeout=600) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} → {e.code}: {e.read().decode('utf-8', 'replace')[:1000]}")


def login():
    return api("POST", "/api/users/login", {"email": ENV["SEED_ADMIN_EMAIL"], "password": ENV["SEED_ADMIN_PASSWORD"]})["token"]


def fmt(p):
    return f"{p:,}".replace(",", " ")


def ident(m):
    return m.get("id") if isinstance(m, dict) else m


def note(old, parts):
    line = f"{PREFIX} " + "; ".join(p for p in parts if p) + "."
    old = (old or "").strip()
    if old.startswith(PREFIX):  # a re-run: keep what was there before the first run
        old = old.split("\n", 1)[1].removeprefix("Раньше: ") if "\n" in old else ""
    return line + (f"\nРаньше: {old}" if old else "")


# ---------- plan ----------
def build(T):
    """What every touched document should look like: [(kind, key, id or None, before, after)]."""
    houses = {h["code"]: h for h in api("GET", "/api/houses?limit=500&depth=0", token=T)["docs"]}
    estates = {e["slug"]: e for e in api("GET", "/api/estates?limit=100&depth=0", token=T)["docs"]}
    projects = {p["name"]: p for p in api("GET", "/api/projects?limit=100&depth=0", token=T)["docs"]}
    din = estates["dinskaya"]["id"]
    # same variant, as the house had it before this price: bedrooms, bathrooms, features, its own plan picture
    sibling = {}
    for h in houses.values():
        if h["estate"] == din and not (h.get("note") or "").startswith(PREFIX):
            sibling.setdefault(h["title"], h)
    sibling.update({h["title"]: h for h in houses.values() if h["estate"] == din and h["code"].startswith("di-tip")})

    plan = []

    def house(code, want, parts):
        h = houses.get(code)
        want["note"] = note(h and h.get("note"), parts)
        if h is None:  # a new house: the rest of its facts from the same variant
            base = want["title"].split(",")[0]
            proj = projects[base.split(" (")[0]]
            sib = sibling.get(base)
            want.update(code=code, estate=din, project=proj["id"])
            if sib:
                want.update(bedrooms=sib.get("bedrooms"), bathrooms=sib.get("bathrooms"), features=list(sib.get("features") or []))
                if sib.get("plan") and ident(sib["plan"]) != ident(proj.get("plan")):
                    want["plan"] = ident(sib["plan"])  # a variant's own plan, so the project's 3D-view with other rooms is not shown
        plan.append(("houses", code, h and h["id"], h, want))

    for n, typ, area, mans, sot, fin, price, status, extra, code in MAIN:
        want = {"title": f"{typ}, уч. {n}", "status": status, "price": price, "plotNo": n, "area": area, "mansard": mans, "plot": f"{sot} сот."}
        if fin == "ЧО":
            feats = list((houses.get(code) or {}).get("features") or [])
            want["features"] = feats + ([] if "Черновая отделка" in feats else ["Черновая отделка"])
        house(code, want, ["ст. Динская", f"участок {n}", f"отделка {fin}", f"цена {fmt(price)} ₽", "бронь" if status == "reserved" else "", extra])
    for street, first, rows in STREETS:
        for i, (n, typ, area, sot, pcho, cho, code) in enumerate(rows):
            want = {"title": f"{typ}, {street}, уч. {n}", "status": "free", "price": pcho, "plotNo": first + i, "area": area, "mansard": None, "plot": f"{sot} сот."}
            if code in houses:
                want["photo"] = None  # the old card's photo shows a built house; for a new street — the project's picture, as for the others
            house(code, want, [f"ст. Динская, {street}", f"участок {n}", f"цена ПЧО {fmt(pcho)} ₽", f"цена ЧО (черновая) {fmt(cho)} ₽" if cho else "цена ЧО в прайсе не указана"])
    for code, (want, parts) in OTHER.items():
        house(code, dict(want), parts)
    for code, n in SOLD_MOVES.items():
        plan.append(("houses", code, houses[code]["id"], houses[code], {"plotNo": n}))

    for slug, want in ESTATES.items():
        plan.append(("estates", slug, estates[slug]["id"], estates[slug], dict(want)))
    lslug, lwant = LANDING
    landing = api("GET", f"/api/landings?where[slug][equals]={lslug}&depth=0", token=T)["docs"][0]
    plan.append(("landings", lslug, landing["id"], landing, dict(lwant)))

    c = api("GET", "/api/globals/company?depth=0", token=T)
    old_m = {m["title"]: m for m in c.get("mortgage") or []}
    mortgage = [{**({"id": old_m[t]["id"]} if t in old_m else {}), "title": t, "text": txt if txt is not None else old_m[t].get("text")} for t, txt in MORTGAGE]
    faq = [{**f, "a": FAQ.get(f["q"], f["a"])} for f in c.get("faq") or []]
    values = [{**v, "text": VALUES.get(v["title"], v.get("text"))} for v in c.get("values") or []]
    old_o = {o["title"]: o for o in c.get("offices") or []}
    offices = [{**({"id": old_o[t]["id"]} if t in old_o else {}), "title": t, "address": a, "hours": hrs} for t, a, hrs in OFFICES]
    missing = [q for q in FAQ if q not in {f["q"] for f in faq}] + [t for t in VALUES if t not in {v["title"] for v in values}]
    if missing:
        sys.exit(f"не нашёл в «Компании»: {missing} — тексты в админке поменялись, сверьте вручную")
    plan.append(("globals", "company", None, c, {"mortgage": mortgage, "finishing": FINISHING, "faq": faq, "values": values, "offices": offices}))
    return plan


RELATIONS = ("plan", "photo", "project", "estate")


def changed(before, after):
    return {k: v for k, v in after.items() if before is None or before.get(k) != v and not (k in RELATIONS and ident(before.get(k)) == v)}


def show(v):
    if isinstance(v, list):
        return " / ".join(x.get("title") or x.get("q") or json.dumps(x, ensure_ascii=False) if isinstance(x, dict) else str(x) for x in v) or "—"
    if isinstance(v, dict):
        return json.dumps(v, ensure_ascii=False)
    return "—" if v in (None, "") else (fmt(v) if isinstance(v, int) and v > 100_000 else str(v).replace("\n", " ⏎ "))


def report(plan):
    print("| что | поле | было | стало |\n|---|---|---|---|")
    for kind, key, _id, before, after in plan:
        diff = changed(before, after)
        if before is None:
            print(f"| {kind}: **{key}** | (новый) | — | {after['title']}, {show(after['price'])} ₽, {after['status']} |")
            continue
        for k, v in diff.items():
            if kind == "globals" and k in ("faq", "values"):
                for b, a in zip(before.get(k) or [], v):
                    if b != a:
                        print(f"| {key}.{k} | {a.get('q') or a.get('title')} | {show(b.get('a') or b.get('text'))} | {show(a.get('a') or a.get('text'))} |")
                continue
            if k == "note":
                continue  # staff-only, shown after
            print(f"| {kind}: {key} | {k} | {show(before.get(k))} | {show(v)} |")


def apply(T, plan):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    log = {"created": [], "before": []}
    for kind, key, _id, before, after in plan:
        if before is None:
            log["created"].append(key)
        else:
            diff = changed(before, after)
            if diff:
                log["before"].append({"kind": kind, "key": key, "id": _id, "fields": {k: before.get(k) for k in diff}})
    if os.path.exists(LOG):  # keep the very first «before» (a re-run must not overwrite it with already-changed values)
        first = json.load(open(LOG, encoding="utf-8"))
        seen = {(b["kind"], b["key"]) for b in first["before"]}
        log["before"] = first["before"] + [b for b in log["before"] if (b["kind"], b["key"]) not in seen]
        log["created"] = sorted(set(first["created"]) | set(log["created"]))
    json.dump(log, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"лог прежних значений: {LOG}")

    for kind, key, _id, before, after in plan:
        diff = changed(before, after)
        if not diff:
            continue
        if kind == "globals":
            api("POST", f"/api/globals/{key}", diff, T)
        elif before is None:
            doc = api("POST", f"/api/{kind}", {k: v for k, v in after.items() if v is not None}, T)["doc"]
            if after.get("mansard") is None and doc.get("mansard") is not None:  # the create hook filled it from the project
                api("PATCH", f"/api/{kind}/{doc['id']}", {"mansard": None}, T)
        else:
            api("PATCH", f"/api/{kind}/{_id}", diff, T)
        print(f"  записано: {kind} {key} ({', '.join(diff)})")

    # read back: every field as planned
    bad = [(kind, key, k) for kind, key, _id, b, a in build(T) for k in changed(b, a)]
    print("проверка после записи:", "OK — всё как в прайсе" if not bad else f"РАСХОЖДЕНИЯ: {bad}")
    return not bad


def undo(T):
    log = json.load(open(LOG, encoding="utf-8"))
    for code in log["created"]:
        api("DELETE", f"/api/houses?where[code][equals]={code}", token=T)
        print("  удалён новый дом", code)
    for b in log["before"]:
        if b["kind"] == "globals":
            api("POST", f"/api/globals/{b['key']}", b["fields"], T)
        else:
            # relations back to ids; JSON fields (genplan) stay as they are
            fields = {k: ident(v) if k in RELATIONS else v for k, v in b["fields"].items()}
            api("PATCH", f"/api/{b['kind']}/{b['id']}", fields, T)
        print("  возвращено:", b["kind"], b["key"], ", ".join(b["fields"]))
    os.replace(LOG, LOG + ".undone")
    print("готово; лог переименован в", LOG + ".undone")


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--apply", action="store_true")
    a.add_argument("--undo", action="store_true")
    args = a.parse_args()
    T = login()
    if args.undo:
        undo(T)
        sys.exit(0)
    p = build(T)
    report(p)
    if args.apply:
        sys.exit(0 if apply(T, p) else 1)
