# -*- coding: utf-8 -*-
"""最終仕上げ：全作品にYouTube検索URL補充、IMSLP/Musescoreも補充"""
import json, pathlib, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"


def ytsearch(q):
    return f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}"


def main():
    fixed_works = 0
    for fp in sorted(PEOPLE.glob("*.json")):
        d = json.loads(fp.read_text(encoding="utf-8"))
        name = d.get("name", "")
        works = d.get("works") or []
        changed = False
        for w in works:
            if not w.get("youtubeSearchUrl"):
                w["youtubeSearchUrl"] = ytsearch(f"{name} {w.get('title','')}")
                changed = True
                fixed_works += 1
        if changed:
            d["works"] = works
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{fixed_works} 件のworksに YouTube検索URLを追加")


if __name__ == "__main__":
    main()
