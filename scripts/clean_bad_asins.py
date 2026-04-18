# -*- coding: utf-8 -*-
"""確認できていないASINを全部削除して、Amazon検索フォールバックに統一"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"


def main():
    cleaned_people = 0
    cleaned_items = 0
    for fp in sorted(PEOPLE.glob("*.json")):
        d = json.loads(fp.read_text(encoding="utf-8"))
        changed = False
        # media からasin除去
        for m in d.get("media", []):
            if "asin" in m:
                del m["asin"]
                cleaned_items += 1
                changed = True
        if changed:
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            cleaned_people += 1
            print(f"OK: {d['id']}")
    print(f"\n{cleaned_people}人 / {cleaned_items}件 のASIN削除")


if __name__ == "__main__":
    main()
