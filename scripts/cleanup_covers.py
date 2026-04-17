# -*- coding: utf-8 -*-
"""coverImageが真の肖像画である場合のみ除去。
記念館・博物館・生家などは残す（場所の画像として有効）。
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

# 肖像・署名を強く示唆するキーワード
PORTRAIT_WORDS = [
    "signature", "unterschrift", "autograph",
    "_portrait", "_portret", "portrait_of", "selbstbild", "self-portrait",
    "kaou", "kao.jpg", "kao.svg",
    "haussmann",  # 肖像画家
    "nadar",  # 肖像写真家
    "self_portrait", "autoportrait",
]

# 場所を示す（これが含まれていれば肖像と誤判定しない）
PLACE_WORDS = [
    "museum", "haus", "house", "memorial", "memoria", "hall", "park",
    "kouen", "kōen", "公園", "記念館", "生家",
    "plaza", "piazza", "festspielhaus",
    "monument", "bust", "statue", "tomb", "grave", "cemetery",
    "castle", "jo-", "castle.jpg", "schloss",
    "church", "kirche", "cathedral", "dom",
    "polyana", "ainola", "downe", "bletchley",
    "town", "street", "dori", "-dori",
    "view", "skyline", "river",
]


def is_true_portrait(url):
    low = url.lower()
    # 場所系ワードが入っていれば肖像ではない
    for w in PLACE_WORDS:
        if w.lower() in low:
            return False
    # 肖像系ワード
    for w in PORTRAIT_WORDS:
        if w in low:
            return True
    return False


def main():
    files = sorted(PEOPLE.glob("*.json"))
    cleaned = 0
    for fp in files:
        d = json.loads(fp.read_text(encoding="utf-8"))
        cover = d.get("coverImage")
        if not cover:
            continue
        bad = False
        # imageUrlと同じなら明らかに肖像
        if cover == d.get("imageUrl"):
            bad = True
        elif is_true_portrait(cover):
            bad = True
        if bad:
            del d["coverImage"]
            if "coverImageCaption" in d:
                del d["coverImageCaption"]
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            cleaned += 1
            print(f"  CLEANED: {d['id']} ({d['name']}) — {cover[:80]}")
    print(f"\n{cleaned}人のcoverImageを除去")


if __name__ == "__main__":
    main()
