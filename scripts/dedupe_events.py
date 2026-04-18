# -*- coding: utf-8 -*-
"""同一人物内で、同じ年・似た内容のイベントを重複除去。"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"


def normalize(s):
    """タイトルから比較用の正規化文字列を作る"""
    if not s:
        return ""
    # 記号・空白を削る
    s = re.sub(r"[『』「」【】《》〈〉\(\)（）\[\]、。・,\.\s]", "", s)
    return s.lower()


DEATH_KW = ["死去", "死", "急死", "逝去", "永眠", "客死", "自殺", "戦死", "刑死", "病死", "他界", "没"]


def has_death(s):
    return any(k in (s or "") for k in DEATH_KW)


def title_similar(a, b):
    """類似判定：部分文字列、共通文字多数、または同年の『死』系イベント"""
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    if na in nb or nb in na:
        return True
    # 同じ年の『死』系は同一の出来事とみなす
    if has_death(a) and has_death(b):
        return True
    # 共通文字の割合（短い方の50%以上が含まれる）
    short, long_ = (na, nb) if len(na) <= len(nb) else (nb, na)
    common = sum(1 for ch in short if ch in long_)
    return common / max(1, len(short)) >= 0.55


def dedupe(events):
    """同じ年 + 似たタイトルを重複とみなし、最初の1つだけ残す"""
    kept = []
    removed = []
    for ev in events:
        y = ev.get("year")
        t = ev.get("title", "")
        dup = False
        for k in kept:
            if k.get("year") == y and title_similar(k.get("title", ""), t):
                dup = True
                break
        if dup:
            removed.append(ev)
        else:
            kept.append(ev)
    return kept, removed


def main():
    total_removed = 0
    files_changed = 0
    for path in sorted(PEOPLE.glob("*.json")):
        p = json.loads(path.read_text(encoding="utf-8"))
        events = p.get("events") or []
        if not events:
            continue
        new_events, removed = dedupe(events)
        if removed:
            p["events"] = new_events
            path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
            files_changed += 1
            total_removed += len(removed)
            print(f"{path.stem}: -{len(removed)}件")
            for ev in removed:
                print(f"    × {ev.get('year')}: {ev.get('title')}")
    print(f"---\n{files_changed}ファイル変更、{total_removed}件の重複を削除")


if __name__ == "__main__":
    main()
