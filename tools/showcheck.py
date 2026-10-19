"""Every picture and link in ПОКАЗ.md exists (and the show folder is not bloated). python tools/showcheck.py"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = open(os.path.join(ROOT, "ПОКАЗ.md"), encoding="utf-8").read()
links = re.findall(r"\]\((показ/[^)]+)\)", text)
missing = [l for l in links if not os.path.exists(os.path.join(ROOT, l))]
folder = os.path.join(ROOT, "показ")
size = sum(os.path.getsize(os.path.join(folder, f)) for f in os.listdir(folder)) / 1024 / 1024
print(f"{len(links)} links, {len(missing)} missing, folder {len(os.listdir(folder))} files, {size:.1f} MB")
for m in missing:
    print("  missing:", m)
sys.exit(1 if missing else 0)
