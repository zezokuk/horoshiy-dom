"""
Прогулка «Внутри» (как у Villa Aurelia): клипы из видео-нейросети → одно видео, которое сайт проматывает прокруткой.

Клипы кладутся в `БАЗА/11-Хороший-дом-с-нуля/картинки/результаты/v4/прогулка/` с номером в начале имени:
    1 … .mp4 — крыльцо → холл        (первый кадр К1, последний К2)
    2 … .mp4 — холл → кухня-гостиная (первый К2, последний И1)
    3 … .mp4 — кухня → терраса       (первый И1, последний И2)
Клип N начинается в комнате N из списка на странице (Крыльцо, Холл, Кухня-гостиная, Терраса).
Телефонные клипы (9:16) — с «9x16» в имени; нет их — телефон получает середину кадра 16:9.

Что делает: склеивает клипы по порядку, кодирует для перемотки (ключевой кадр каждые 4 кадра, без звука),
пишет `public/v4/walk/walk.mp4`, `walk-phone.mp4`, `walk-poster.webp` и `src/v4/walk.json` (длительность и секунды комнат).
Запуск из папки platform:  python tools/v4walk.py        Убрать видео с сайта:  python tools/v4walk.py --off
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT.parents[1] / '11-Хороший-дом-с-нуля' / 'картинки' / 'результаты' / 'v4' / 'прогулка'
OUT = ROOT / 'public' / 'v4' / 'walk'
MANIFEST = ROOT / 'src' / 'v4' / 'walk.json'
VIDEO = ('.mp4', '.mov', '.webm', '.mkv')


def duration(f: pathlib.Path) -> float:
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def clips(phone: bool) -> list[pathlib.Path]:
    fs = [f for f in SRC.glob('*') if f.suffix.lower() in VIDEO and re.match(r'^\d+', f.stem) and (('9x16' in f.stem) == phone)]
    return sorted(fs, key=lambda f: int(re.match(r'^\d+', f.stem).group()))


def encode(fs: list[pathlib.Path], out: pathlib.Path, vf: str) -> None:
    # склейка через concat-фильтр (клипы могут быть разного размера и частоты кадров), 30 к/с, ключевой кадр каждые 4 кадра
    inputs = sum((['-i', str(f)] for f in fs), [])
    chain = ''.join(f'[{i}:v]{vf},fps=30,format=yuv420p,setsar=1[v{i}];' for i in range(len(fs)))
    chain += ''.join(f'[v{i}]' for i in range(len(fs))) + f'concat=n={len(fs)}:v=1:a=0[out]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', chain, '-map', '[out]', '-an',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-g', '4', '-keyint_min', '4', '-sc_threshold', '0',
                    '-movflags', '+faststart', str(out)], check=True)


def main() -> None:
    sys.stdout.reconfigure(encoding='utf-8')
    if '--off' in sys.argv:
        MANIFEST.write_text('{}\n', encoding='utf-8')
        print('Видео прогулки выключено: сайт показывает кадры.')
        return
    wide = clips(False)
    if not wide:
        print(f'Клипов нет в {SRC} — сайт показывает кадры (К1, К2, И1…).')
        return
    OUT.mkdir(parents=True, exist_ok=True)
    durs = [duration(f) for f in wide]
    encode(wide, OUT / 'walk.mp4', 'scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900')
    phone = clips(True)
    if phone and len(phone) == len(wide):
        encode(phone, OUT / 'walk-phone.mp4', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280')
    else:  # середина широкого кадра
        encode(wide, OUT / 'walk-phone.mp4', 'scale=-2:1280,crop=720:1280')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'walk.mp4'), '-frames:v', '1', '-q:v', '80', str(OUT / 'walk-poster.webp')], check=True)
    total = duration(OUT / 'walk.mp4')
    at, t = [], 0.0
    for d in durs:
        at.append(round(t, 2))
        t += d
    at = [round(a * total / t, 2) for a in at]  # склейка могла чуть сдвинуть длину — секунды по итоговому файлу
    MANIFEST.write_text(json.dumps({'src': '/v4/walk/walk.mp4', 'phone': '/v4/walk/walk-phone.mp4', 'poster': '/v4/walk/walk-poster.webp',
                                    'duration': round(total, 2), 'at': at}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for f, d in zip(wide, durs):
        print(f'{f.name}: {d:.1f} с')
    print(f"Итог: {total:.1f} с, комнаты с секунд {at}; walk.mp4 {(OUT / 'walk.mp4').stat().st_size // 1024} КБ, "
          f"walk-phone.mp4 {(OUT / 'walk-phone.mp4').stat().st_size // 1024} КБ. Обнови /v4.")


if __name__ == '__main__':
    main()
