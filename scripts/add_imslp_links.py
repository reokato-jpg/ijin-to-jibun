# -*- coding: utf-8 -*-
"""各作曲家のworksに、imslpUrlが未設定のものにIMSLP検索URLを追加。
また、楽譜提供サイト（Musescore/8notes）の検索URLも補う。
"""
import json, pathlib, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"


def imslp_search_url(composer_name_en, title):
    q = f"{composer_name_en} {title}" if composer_name_en else title
    return f"https://imslp.org/index.php?search={urllib.parse.quote(q)}&title=Special%3ASearch&go=Go"


def musescore_search_url(composer, title):
    q = f"{composer} {title}".strip()
    return f"https://musescore.com/sheetmusic?text={urllib.parse.quote(q)}"


def youtube_search_url(composer, title):
    q = f"{composer} {title}".strip()
    return f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}"


def is_music_person(d):
    field = d.get("field", "")
    return any(w in field for w in ("作曲家", "ピアニスト", "指揮者", "音楽"))


def main():
    updated_files = 0
    total_added = 0
    for fp in sorted(PEOPLE.glob("*.json")):
        d = json.loads(fp.read_text(encoding="utf-8"))
        if not is_music_person(d):
            continue
        works = d.get("works") or []
        if not works:
            continue
        composer_ja = d.get("name", "")
        composer_en = d.get("nameEn", "")
        changed = False
        for w in works:
            # youtubeId のみの作品にも、IMSLP検索URLと楽譜検索URLを追加
            if not w.get("imslpUrl"):
                w["imslpUrl"] = imslp_search_url(composer_en, w.get("title", ""))
                changed = True
                total_added += 1
            if not w.get("musescoreUrl"):
                w["musescoreUrl"] = musescore_search_url(composer_ja or composer_en, w.get("title", ""))
                changed = True
            if not w.get("youtubeSearchUrl"):
                w["youtubeSearchUrl"] = youtube_search_url(composer_ja or composer_en, w.get("title", ""))
                changed = True
        if changed:
            d["works"] = works
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            updated_files += 1
            print(f"OK: {d['id']} ({composer_ja}) works={len(works)}")
    print(f"\n{updated_files}人のworksに楽譜/検索URLを追加。IMSLP新規: {total_added}件")


if __name__ == "__main__":
    main()
