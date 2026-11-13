"""
Картинки из Gemini → сайт v4 одной командой (13.11.2026).

Илья кладёт готовые файлы в `БАЗА/11-Хороший-дом-с-нуля/картинки/результаты/v4/`; имя начинается с кода из
`Промты/lark/хороший-дом-v4-картинки.md`:
    П1  — вид сверху «Типа 5» ×2           → мини-план и «кукольный домик» во «Внутри»
    К1  — крыльцо, дверь открыта (пролёт)    → «Внутри», 07:00 (на сайт — со сборкой пролёта)
    К2  — холл, проход в кухню (пролёт)      → «Внутри», 07:10
    И1  — кухня-гостиная                    → «Внутри», 07:30
    И2  — терраса                           → «Внутри», 08:30
    И3  — спальня                           → «Внутри», 22:00
    И4  — вечер на участке, мангал          → «Внутри», 20:30, и фон финала «Приезжайте на показ»
    С1…С5 — слайды первого экрана с небом   → Тип 1, 2, 3, 6, 10 (в этом порядке)
    НОЧЬ — ночной кадр первого экрана        → ночь вместо затемнённого утра
Телефонная версия того же кадра — тот же код и «9x16» в имени (например «И1 9x16.png»).
Из нескольких файлов с одним кодом берётся самый новый.

Скрипт: webp 2560 px (телефон — 1170 px) в `public/v4/img/`, манифест `src/v4/images.json`, отчёт по размерам.
Запуск из папки platform:  python tools/v4images.py
"""
import json
import pathlib
import re
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT.parents[1] / '11-Хороший-дом-с-нуля' / 'картинки' / 'результаты' / 'v4'
OUT = ROOT / 'public' / 'v4' / 'img'
MANIFEST = ROOT / 'src' / 'v4' / 'images.json'
CODES = ['П1', 'К1', 'К2', 'И1', 'И2', 'И3', 'И4', 'С1', 'С2', 'С3', 'С4', 'С5', 'НОЧЬ']
SLUG = {'П1': 'plan-tip5', 'К1': 'in-porch', 'К2': 'in-hall', 'И1': 'in-kitchen', 'И2': 'in-terrace', 'И3': 'in-bedroom', 'И4': 'in-evening',
        'С1': 'slide-tip-1', 'С2': 'slide-tip-2', 'С3': 'slide-tip-3', 'С4': 'slide-tip-6', 'С5': 'slide-tip-10', 'НОЧЬ': 'hero-night'}
MIN_LONG = 2400  # меньше — на экране 1440–2560 px будет мыло


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    OUT.mkdir(parents=True, exist_ok=True)
    files = [f for f in SRC.glob('*') if f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp')] if SRC.exists() else []
    manifest, report = {}, []
    for code in CODES:
        for phone in (False, True):
            mine = [f for f in files if re.match(rf'^{code}(?![0-9А-Яа-я])', f.stem) and (('9x16' in f.stem) == phone)]
            if not mine:
                continue
            f = max(mine, key=lambda x: x.stat().st_mtime)
            im = Image.open(f).convert('RGB')
            w, h = im.size
            target = 1170 if phone else 2560
            if max(w, h) > target:
                k = target / max(w, h)
                im = im.resize((round(w * k), round(h * k)), Image.LANCZOS)
            name = f"{SLUG[code]}{'-phone' if phone else ''}.webp"
            im.save(OUT / name, 'WEBP', quality=82, method=6)
            entry = manifest.setdefault(code, {})
            entry['phone' if phone else 'src'] = f'/v4/img/{name}'
            if not phone:
                entry['w'], entry['h'] = im.size
            warn = '' if phone or max(w, h) >= MIN_LONG else f'  ⚠ мало пикселей ({max(w, h)} < {MIN_LONG}) — попроси у Gemini больше'
            report.append(f"{code}{' (телефон)' if phone else ''}: {f.name} {w}×{h} → {name} {(OUT / name).stat().st_size // 1024} КБ{warn}")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Папка: {SRC}')
    print('\n'.join(report) if report else 'Готовых картинок пока нет — сайт показывает прежние.')
    missing = [c for c in CODES if c not in manifest]
    if missing:
        print('Ещё нет:', ', '.join(missing))
    print(f'Манифест: {MANIFEST.relative_to(ROOT)} — обнови страницу /v4, картинки подхватятся.')


if __name__ == '__main__':
    main()
