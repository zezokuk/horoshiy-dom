"""
Прогулка «Внутри» (как у Villa Aurelia): клипы из видео-нейросети → одно видео, которое сайт проматывает прокруткой.

Клипы кладутся в `БАЗА/11-Хороший-дом-с-нуля/картинки/результаты/v4/прогулка/` (или прямо в `v4/`) с номером в начале имени
(можно с буквой впереди: «а 1 …»; из нескольких клипов с одним номером берётся самый новый):
    1 … .mp4 — крыльцо → холл        (первый кадр К1, последний К2)
    2 … .mp4 — холл → кухня-гостиная (первый К2, последний И1)
    3 … .mp4 — кухня → терраса       (первый И1, последний И2)
Клип N начинается в комнате N из списка на странице (Крыльцо, Холл, Кухня-гостиная, Терраса).
Телефонные клипы (9:16) — с «9x16» в имени; нет такого для клипа — телефон получает вырез из 16:9, от двери к центру.

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


NUM = re.compile(r'^(?:[^\W\d_]\s+)?(\d+)(?!\d)')  # «1 крыльцо-холл», «а 1 крыльцо-холл» (буква-вариант впереди)


def clips(phone: bool) -> list[pathlib.Path]:
    # ищем в «прогулка/» и рядом, в «v4/»; из нескольких клипов с одним номером берётся самый новый
    fs = [f for d in (SRC, SRC.parent) if d.exists() for f in d.glob('*')
          if f.suffix.lower() in VIDEO and NUM.match(f.name) and (('9x16' in f.name) == phone)]
    best: dict[int, pathlib.Path] = {}
    for f in fs:
        n = int(NUM.match(f.name).group(1))
        if n not in best or f.stat().st_mtime > best[n].stat().st_mtime:
            best[n] = f
    return [best[n] for n in sorted(best)]


def num(f: pathlib.Path) -> int:
    return int(NUM.match(f.name).group(1))


def size(f: pathlib.Path) -> tuple[int, int]:
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(f)],
                       capture_output=True, text=True, check=True)
    w, h = r.stdout.strip().split(',')[:2]
    return int(w), int(h)


def encode(fs: list[pathlib.Path], out: pathlib.Path, vf: str | list[str], crf: int = 24) -> None:
    # склейка через concat-фильтр (клипы могут быть разного размера и частоты кадров), 30 к/с, ключевой кадр каждые 4 кадра
    vfs = vf if isinstance(vf, list) else [vf] * len(fs)
    inputs = sum((['-i', str(f)] for f in fs), [])
    chain = ''.join(f'[{i}:v]{vfs[i]},fps=30,format=yuv420p,setsar=1[v{i}];' for i in range(len(fs)))
    chain += ''.join(f'[v{i}]' for i in range(len(fs))) + f'concat=n={len(fs)}:v=1:a=0[out]'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', chain, '-map', '[out]', '-an',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-g', '4', '-keyint_min', '4', '-sc_threshold', '0',
                    '-movflags', '+faststart', str(out)], check=True)


# нет телефонного клипа — вырез 9:16 из широкого: в начале на двери, к середине клипа — в центре.
# Доля ширины кадра, где дверь в первой комнате клипа (те же fx, что у кадров на странице: крыльцо, холл, кухня)
DOOR = {1: 0.51, 2: 0.65, 3: 0.21}
PHONE_VF = 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280'


def phone_crop(n: int, dur: float) -> str:
    d = DOOR.get(n, 0.5)
    x = rf"max(0\,min(iw-720\,({d}+{0.5 - d}*min(t/{dur * 0.45:.2f}\,1))*iw-360))"
    return f"scale=-2:1280,crop=720:1280:x='{x}':y=0"


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
    # размер — по самому мелкому клипу (Flow/Kling дают 720p): растягивать дальше — только раздувать файл
    W = 1920 if min(size(f)[0] for f in wide) >= 1920 else 1600 if min(size(f)[0] for f in wide) >= 1600 else 1280
    H = W * 9 // 16
    encode(wide, OUT / 'walk.mp4', f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}')
    # телефон: свой клип 9:16, где он есть; где нет — вырез из широкого, который ведёт от двери к центру
    phone = {num(f): f for f in clips(True)}
    pf, pv = [], []
    for f, d in zip(wide, durs):
        p = phone.get(num(f))
        pf.append(p or f)
        pv.append(PHONE_VF if p else phone_crop(num(f), d))
    encode(pf, OUT / 'walk-phone.mp4', pv, crf=28)  # телефон: мобильный интернет, экран меньше
    print('Телефон:', ', '.join(f"{num(f)} — {'свой 9x16' if f in phone.values() else 'вырез из 16:9'}" for f in pf))
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
