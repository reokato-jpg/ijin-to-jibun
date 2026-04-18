# -*- coding: utf-8 -*-
"""parent_conflict タグを整理：『誕生』『母死去』『父死去』など
葛藤以外の背景イベントから parent_conflict タグを外し、より適切なタグに置換"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

# parent_conflict を外すべきタイトル／detailのパターン（＝「単なる背景」の類型）
NOT_CONFLICT = [
    r"誕生",
    r"生まれる",
    r"生まれ$",
    r"に生まれ",
    r"として生ま",
    r"出生",
    r"に生を受け",
]
# これらの単語が入っているなら『死別』(bereavement) タグに置換
BEREAVEMENT = [
    r"母.{0,12}死",
    r"父.{0,12}死",
    r"両親.{0,12}死",
    r"母.{0,8}失",
    r"父.{0,8}失",
    r"両親.{0,10}失",
    r"父を失",
    r"母を失",
    r"^父.{0,6}死",
    r"^母.{0,6}死",
    r"自殺",
    r"発狂",
    r"戦死",
    r"結核で死",
    r"殺害",
    r"溺死",
    r"病死",
    r"早逝",
]
# 実際に『葛藤』とみなせるパターン（これらを含むなら parent_conflict を残す）
REAL_CONFLICT = [
    r"反対",
    r"対立",
    r"決別",
    r"勘当",
    r"絶縁",
    r"家出",
    r"口論",
    r"激怒",
    r"罵倒",
    r"父に隠れ",
    r"母に隠れ",
    r"拒絶",
    r"衝突",
    r"押し切って",
    r"確執",
    r"服従を拒",
    r"猛反対",
    r"反抗",
    r"裏切",
    r"縁を切",
    r"辞めさせ",
    r"父と対立",
    r"母と対立",
    r"離縁",
    r"追放",
    r"父子は別離",
    r"父との確執",
    r"父との関係",
    r"威圧的な父",
    r"家族.{0,4}決定的に対立",
]


def contains_any(s, patterns):
    for pat in patterns:
        if re.search(pat, s or ""):
            return True
    return False


def main():
    changed = 0
    for path in sorted(PEOPLE.glob("*.json")):
        p = json.loads(path.read_text(encoding="utf-8"))
        dirty = False
        for e in p.get("events", []):
            tags = e.get("tags") or []
            if "parent_conflict" not in tags:
                continue
            title = e.get("title", "")
            detail = e.get("detail", "")
            combined = title + " / " + detail
            # 実際の葛藤なら残す
            if contains_any(combined, REAL_CONFLICT):
                continue
            # 誕生系のみ → parent_conflict を外す
            if contains_any(title, NOT_CONFLICT) and not contains_any(detail, REAL_CONFLICT):
                tags = [t for t in tags if t != "parent_conflict"]
                dirty = True
            # 親の死が中心 → bereavement に置換
            elif contains_any(combined, BEREAVEMENT) and not contains_any(combined, REAL_CONFLICT):
                tags = [t for t in tags if t != "parent_conflict"]
                if "bereavement" not in tags:
                    tags.append("bereavement")
                dirty = True
            e["tags"] = tags
        if dirty:
            path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
            changed += 1
            print(f"{path.stem}: 修正")
    print(f"---{changed} files updated")


if __name__ == "__main__":
    main()
