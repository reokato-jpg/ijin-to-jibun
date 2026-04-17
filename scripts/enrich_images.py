# -*- coding: utf-8 -*-
"""
登録済みの人物JSONを読み、Wikipediaから肖像画のサムネイルURLを取得して
imageUrl フィールドに書き込むスクリプト。

使い方:
    python scripts/enrich_images.py             # 全員を処理
    python scripts/enrich_images.py dutilleux   # 指定IDのみ
"""

import sys
import json
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PEOPLE_DIR = ROOT / "data" / "people"

API = "https://ja.wikipedia.org/w/api.php"

# ID → Wikipediaタイトル（日本語版）のマッピング
DEFAULT_WIKI_TITLES = {
    "dutilleux": "アンリ・デュティユー",
    "chopin": "フレデリック・ショパン",
    "schumann": "ロベルト・シューマン",
    "rachmaninoff": "セルゲイ・ラフマニノフ",
    "nietzsche": "フリードリヒ・ニーチェ",
    "soseki": "夏目漱石",
    "van_gogh": "フィンセント・ファン・ゴッホ",
    "wittgenstein": "ルートヴィヒ・ウィトゲンシュタイン",
}

def fetch_thumbnail(title: str, size: int = 400):
    params = {
        "action": "query",
        "format": "json",
        "prop": "pageimages",
        "piprop": "thumbnail|original",
        "pithumbsize": str(size),
        "redirects": "1",
        "titles": title,
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "ijin-to-jibun/0.1"})
    with urllib.request.urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None
    page = next(iter(pages.values()))
    thumb = page.get("thumbnail", {}).get("source")
    return thumb

def process(person_file: Path):
    data = json.loads(person_file.read_text(encoding="utf-8"))
    pid = data["id"]
    # wikiTitle があればそれを使う。なければデフォルト辞書、最後は name
    title = data.get("wikiTitle") or DEFAULT_WIKI_TITLES.get(pid) or data.get("name")
    if not title:
        print(f"  [SKIP] {pid}: タイトル不明")
        return
    print(f"  [取得] {pid}  ({title})")
    try:
        url = fetch_thumbnail(title)
    except Exception as e:
        print(f"    ERROR: {e}")
        return
    if not url:
        print(f"    見つからず")
        return
    data["imageUrl"] = url
    if "wikiTitle" not in data:
        data["wikiTitle"] = title
    person_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"    OK  -> {url}")

def main():
    target_ids = set(sys.argv[1:])
    files = sorted(PEOPLE_DIR.glob("*.json"))
    for f in files:
        if target_ids and f.stem not in target_ids:
            continue
        process(f)

if __name__ == "__main__":
    main()
