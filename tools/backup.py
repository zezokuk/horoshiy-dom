"""Daily backup of the site's data: the database (safe copy while the site runs) and the uploaded photos/videos,
with a restore check. Run by cron on the server once a day (DEPLOY.md), keeps the last 14 days.

    python tools/backup.py [--dest backups] [--keep 14]
    python tools/backup.py --check backups/2026-10-19   # restore test of one backup (also run after every backup)

The check restores into a temporary folder and compares it with the live site: database integrity, the number of
houses / estates / leads / files, and that every file the database refers to is in the archive.
"""
import argparse, datetime, os, shutil, sqlite3, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "platform.db")
MEDIA = os.path.join(ROOT, "media")
TABLES = ["regions", "estates", "houses", "projects", "leads", "landings", "media", "users"]


def counts(db_path):
    c = sqlite3.connect(db_path)
    try:
        return {t: c.execute(f"select count(*) from {t}").fetchone()[0] for t in TABLES}
    finally:
        c.close()


def referenced_files(db_path):
    c = sqlite3.connect(db_path)
    try:
        cols = [r[1] for r in c.execute("pragma table_info(media)") if r[1] == "filename" or r[1].endswith("_filename")]
        return {x for row in c.execute(f"select {','.join(cols)} from media") for x in row if x}
    finally:
        c.close()


def backup(dest_root, keep):
    day = datetime.date.today().isoformat()
    dest = os.path.join(dest_root, day)
    os.makedirs(dest, exist_ok=True)
    # sqlite's online backup: a consistent copy even while the site writes
    src, dst = sqlite3.connect(DB), sqlite3.connect(os.path.join(dest, "platform.db"))
    with dst:
        src.backup(dst)
    src.close()
    dst.close()
    with zipfile.ZipFile(os.path.join(dest, "media.zip"), "w", zipfile.ZIP_STORED) as z:  # webp/mp4 are compressed already
        for f in sorted(os.listdir(MEDIA)):
            z.write(os.path.join(MEDIA, f), f)
    # keep the last `keep` days
    days = sorted(d for d in os.listdir(dest_root) if len(d) == 10 and d[4] == "-")
    for old in days[:-keep]:
        shutil.rmtree(os.path.join(dest_root, old), ignore_errors=True)
    return dest


def check(dest):
    problems = []
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "platform.db")
        shutil.copy(os.path.join(dest, "platform.db"), db)
        c = sqlite3.connect(db)
        ok = c.execute("pragma integrity_check").fetchone()[0]
        c.close()
        if ok != "ok":
            problems.append(f"database integrity: {ok}")
        restored, live = counts(db), counts(DB)
        for t in TABLES:
            if restored[t] != live[t]:
                problems.append(f"{t}: {restored[t]} in the backup, {live[t]} live")
        with zipfile.ZipFile(os.path.join(dest, "media.zip")) as z:
            bad = z.testzip()
            if bad:
                problems.append(f"broken file in media.zip: {bad}")
            z.extractall(os.path.join(tmp, "media"))
        missing = referenced_files(db) - set(os.listdir(os.path.join(tmp, "media")))
        if missing:
            problems.append(f"{len(missing)} files the database refers to are not in the archive, e.g. {sorted(missing)[:3]}")
        print("restore check:", "OK" if not problems else "FAILED", "|", ", ".join(f"{t} {restored[t]}" for t in ("houses", "estates", "leads", "media")))
    for p in problems:
        print("  -", p)
    return not problems


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--dest", default=os.path.join(ROOT, "backups"))
    a.add_argument("--keep", type=int, default=14)
    a.add_argument("--check")
    args = a.parse_args()
    if args.check:
        sys.exit(0 if check(args.check) else 1)
    d = backup(args.dest, args.keep)
    size = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d)) / 1024 / 1024
    print(f"backup: {d} ({size:.1f} MB)")
    sys.exit(0 if check(d) else 1)
