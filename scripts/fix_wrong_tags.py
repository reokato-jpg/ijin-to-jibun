# -*- coding: utf-8 -*-
"""明らかに内容と一致しないタグを除去"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

# タグ別の『除外すべきキーワード』
# タイトル or detail がこれに該当する場合、そのタグを外す
EXCLUDE_PATTERNS = {
    # 転機となる出会い：死・病・誕生は出会いではない（ただし"〜との出会い"等は除外しない）
    "turning_encounter": [
        (r"死去|死$|死、|急死|自殺|没$|没、|溺死|刑死|戦死", r"出会|会見|面会|師事|紹介|対面"),
        (r"誕生$|に誕生|で誕生|として誕生", None),
        (r"^病|発病|入院", None),
    ],
    # 死別：実際に誰かが死ぬイベント
    "loss": [
        (r"誕生$|に誕生|で誕生|として誕生", None),
        (r"結婚$|に結婚|と結婚", None),
        (r"出版$|刊行$|完成$|発表$", None),
        (r"入学$|卒業$", None),
        (r"^受賞|賞を|名誉博士|就任", None),
    ],
    # ブレイクスルー：達成・成功・画期的な創作
    "breakthrough": [
        (r"死去|死$|死、|自殺|急死|没$", None),
        (r"誕生$|に誕生|で誕生", None),
        (r"^病|発病|失聴|失明", None),
    ],
    # 病：実際の病気・怪我
    "illness": [
        (r"誕生$|に誕生|で誕生", None),
        (r"出版$|刊行$|完成$|発表$|受賞", None),
    ],
    # 再起：立ち直り
    "restart": [
        (r"死去|死$|自殺|急死|没$", None),
        (r"誕生$|に誕生|で誕生", None),
    ],
    # 失恋：恋愛での破れ
    "heartbreak": [
        (r"誕生$|に誕生|で誕生", None),
        (r"^病|入院", None),
    ],
    # 経済的困窮：お金の問題
    "poverty": [
        (r"誕生$|に誕生|で誕生", None),
        (r"受賞|名誉博士|就任", None),
    ],
    # 自己否定
    "self_denial": [
        (r"誕生$|に誕生|で誕生", None),
        (r"受賞|名誉博士", None),
    ],
    # プライド崩壊
    "pride_broken": [
        (r"誕生$|に誕生|で誕生", None),
    ],
    # 承認欲求
    "approval": [
        (r"死去|死$|自殺|没$|急死", None),
        (r"誕生$|に誕生|で誕生", None),
    ],
    # 孤独：ひとりになる
    "isolation": [
        (r"結婚$|と結婚", None),
        (r"誕生$|に誕生|で誕生", None),
    ],
}


def match_any(patterns, text):
    for p in patterns:
        if re.search(p, text or ""):
            return True
    return False


def should_exclude(tag, title, detail):
    rules = EXCLUDE_PATTERNS.get(tag)
    if not rules:
        return False
    combined = title + " " + detail
    for bad_pattern, keep_pattern in rules:
        if re.search(bad_pattern, combined):
            # keep_pattern が一致する場合はOK
            if keep_pattern and re.search(keep_pattern, combined):
                continue
            return True
    return False


def main():
    removed_count = 0
    changed_files = 0
    examples = {}
    for path in sorted(PEOPLE.glob("*.json")):
        p = json.loads(path.read_text(encoding="utf-8"))
        dirty = False
        for e in p.get("events", []):
            tags = e.get("tags") or []
            title = e.get("title", "")
            detail = e.get("detail", "") or ""
            new_tags = []
            for t in tags:
                if should_exclude(t, title, detail):
                    removed_count += 1
                    examples.setdefault(t, []).append((p["id"], e.get("year"), title[:40]))
                else:
                    new_tags.append(t)
            if new_tags != tags:
                e["tags"] = new_tags
                dirty = True
        if dirty:
            path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
            changed_files += 1
    print(f"---\n{changed_files} files changed, {removed_count} tags removed")
    for tag, exs in examples.items():
        print(f"\n[{tag}] {len(exs)}件除去:")
        for pid, yr, t in exs[:5]:
            print(f"  - {pid} {yr}: {t}")


if __name__ == "__main__":
    main()
