import os, json, re

IMG_DIR = os.path.join("assets", "images")
TXT_DIR = os.path.join("assets", "texts")

pattern = re.compile(r"^(\d{2})_(.+)\.png$", re.IGNORECASE)

cards = []
missing = []

if not os.path.isdir(IMG_DIR):
    raise SystemExit(f"Missing folder: {IMG_DIR}")
if not os.path.isdir(TXT_DIR):
    raise SystemExit(f"Missing folder: {TXT_DIR}")

for fn in sorted(os.listdir(IMG_DIR)):
    m = pattern.match(fn)
    if not m:
        continue

    id_num = int(m.group(1))
    base = fn[:-4]  # remove .png
    txt_name = base + ".txt"
    txt_path = os.path.join(TXT_DIR, txt_name)

    if not os.path.exists(txt_path):
        missing.append(txt_name)
        continue

    title = base.split("_", 1)[1].replace("_", " ").upper()

    cards.append({
        "id": id_num,
        "title": title,
        "image": f"assets/images/{fn}",
        "text": f"assets/texts/{txt_name}"
    })

cards.sort(key=lambda c: c["id"])

with open("index.json", "w", encoding="utf-8") as f:
    json.dump(cards, f, ensure_ascii=False, indent=2)

print("Wrote index.json with", len(cards), "cards")
if missing:
    print("Missing text files for:")
    for m in missing:
        print(" -", m)
