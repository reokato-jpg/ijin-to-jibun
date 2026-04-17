# -*- coding: utf-8 -*-
"""
Wikipedia から人物ページを取得して、
data/people/<id>.json のひな形を作るスクリプト。

使い方:
    python scripts/fetch_wikipedia.py <id> <日本語Wikipediaのタイトル>

例:
    python scripts/fetch_wikipedia.py debussy クロード・ドビュッシー
    python scripts/fetch_wikipedia.py kant イマヌエル・カント

取得できるのは:
  - 名前 / 生没年 / 国 / 分野 / 概要
出来事（events）と感情タグは、あとで手動で追加してください。
（または AI に依頼して整形する）
"""

import sys
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "people"
MANIFEST = ROOT / "data" / "manifest.json"

API = "https://ja.wikipedia.org/w/api.php"

def fetch_summary(title: str):
    """Wikipedia の要約（先頭セクション）と画像サムネイルを取得"""
    params = {
        "action": "query",
        "format": "json",
        "prop": "extracts|pageimages",
        "exintro": "1",
        "explaintext": "1",
        "piprop": "thumbnail",
        "pithumbsize": "400",
        "redirects": "1",
        "titles": title,
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "ijin-to-jibun/0.1"})
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None
    page = next(iter(pages.values()))
    if "missing" in page:
        return None
    return {
        "title": page.get("title", title),
        "extract": page.get("extract", ""),
        "imageUrl": page.get("thumbnail", {}).get("source", ""),
    }

def parse_years(extract: str):
    """概要テキストから生没年を抽出（できる範囲で）"""
    m = re.search(r"(\d{3,4})年[^\n]{0,20}?(\d{1,2})?月?[^\n]{0,20}?生", extract)
    birth = int(m.group(1)) if m else None
    m2 = re.search(r"(\d{3,4})年[^\n]{0,20}?(\d{1,2})?月?[^\n]{0,20}?(没|死去)", extract)
    death = int(m2.group(1)) if m2 else None
    if not birth:
        nums = re.findall(r"(\d{4})年", extract[:200])
        if len(nums) >= 1:
            birth = int(nums[0])
        if len(nums) >= 2 and not death:
            death = int(nums[1])
    return birth, death

def guess_field(extract: str):
    for k, v in [
        ("作曲家", "作曲家"),
        ("ピアニスト", "ピアニスト"),
        ("哲学者", "哲学者"),
        ("画家", "画家"),
        ("詩人", "詩人"),
        ("小説家", "小説家"),
        ("作家", "作家"),
        ("数学者", "数学者"),
        ("物理学者", "物理学者"),
        ("科学者", "科学者"),
        ("演奏家", "演奏家"),
    ]:
        if k in extract[:300]:
            return v
    return "不明"

def guess_country(extract: str):
    for c in ["日本", "フランス", "ドイツ", "オーストリア", "イタリア",
             "ロシア", "ポーランド", "イギリス", "アメリカ", "オランダ",
             "スペイン", "ノルウェー", "ハンガリー", "チェコ", "ベルギー"]:
        if c in extract[:300]:
            return c
    return "不明"

def main():
    if len(sys.argv) < 3:
        print("使い方: python scripts/fetch_wikipedia.py <id> <Wikipediaタイトル>")
        sys.exit(1)

    pid = sys.argv[1]
    title = " ".join(sys.argv[2:])

    print(f"[取得中] {title}")
    info = fetch_summary(title)
    if not info:
        print("  Wikipediaページが見つかりませんでした")
        sys.exit(1)

    birth, death = parse_years(info["extract"])
    field = guess_field(info["extract"])
    country = guess_country(info["extract"])
    # 概要の先頭300文字
    summary = info["extract"].strip().split("\n")[0][:300]

    data = {
        "id": pid,
        "name": info["title"],
        "nameEn": "",
        "birth": birth,
        "death": death,
        "country": country,
        "field": field,
        "summary": summary,
        "imageUrl": info.get("imageUrl", ""),
        "wikiTitle": info["title"],
        "events": []  # ← ここを手動 or AI で埋める
    }

    out = DATA_DIR / f"{pid}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[保存] {out.relative_to(ROOT)}")

    # manifest.json に追記
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if pid not in manifest["people"]:
        manifest["people"].append(pid)
        MANIFEST.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"[追加] manifest.json に {pid} を追加")
    else:
        print(f"[スキップ] manifest.json には既に {pid} あり")

    print()
    print("完了しました。次のステップ:")
    print(f"  1. data/people/{pid}.json を開く")
    print("  2. events（出来事）を追加する。1件につき year / title / detail / tags")
    print("  3. 利用可能なタグは data/tags.json を参照")

if __name__ == "__main__":
    main()
