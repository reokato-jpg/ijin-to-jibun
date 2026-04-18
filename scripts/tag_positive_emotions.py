# -*- coding: utf-8 -*-
"""既存イベントに明るい感情タグを付与（内容ベースで自動判定）"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

# タグ別の検出キーワード（タイトル＋detailから抽出）
RULES = {
    "joy": [
        r"最高の", r"歓喜", r"熱狂的", r"喝采", r"一夜にして", r"大成功",
        r"満場の", r"称賛", r"拍手喝采", r"栄光", r"勝利",
    ],
    "hope": [
        r"決意", r"志す", r"夢", r"未来", r"旅立", r"再起",
        r"新しい", r"目指す",
    ],
    "love": [
        r"結婚", r"恋", r"愛する", r"伴侶", r"最愛",
        r"出会", r"プロポーズ", r"愛情",
    ],
    "creation": [
        r"作曲$", r"完成", r"出版", r"初演", r"発表",
        r"書き上げ", r"創作", r"着手", r"制作",
    ],
    "gratitude": [
        r"献呈", r"感謝", r"恩師", r"支え", r"助けられ",
        r"庇護者", r"救われ",
    ],
    "serenity": [
        r"引退", r"静か", r"隠棲", r"隠居", r"穏やか",
        r"幸福な時期", r"安定",
    ],
    "curiosity": [
        r"入門", r"学ぶ", r"研究開始", r"留学", r"航海",
        r"旅立", r"探究", r"実験",
    ],
    "friendship": [
        r"友情", r"盟友", r"親友", r"生涯の友", r"同志",
        r"同窓", r"師弟関係",
    ],
}


def detect_tags(text):
    """テキストから該当するタグを抽出"""
    found = []
    for tag, patterns in RULES.items():
        for pat in patterns:
            if re.search(pat, text or ""):
                found.append(tag)
                break
    return found


def main():
    added_count = 0
    files_changed = 0
    per_tag = {}
    for path in sorted(PEOPLE.glob("*.json")):
        p = json.loads(path.read_text(encoding="utf-8"))
        dirty = False
        for e in p.get("events", []):
            combined = (e.get("title") or "") + " " + (e.get("detail") or "")
            new_tags = detect_tags(combined)
            if not new_tags:
                continue
            existing = e.get("tags") or []
            added_here = [t for t in new_tags if t not in existing]
            if added_here:
                e["tags"] = existing + added_here
                dirty = True
                for t in added_here:
                    per_tag[t] = per_tag.get(t, 0) + 1
                    added_count += 1
        if dirty:
            path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
            files_changed += 1

    print(f"{files_changed} ファイル更新、{added_count} タグ追加")
    for t, c in sorted(per_tag.items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}件")


if __name__ == "__main__":
    main()
