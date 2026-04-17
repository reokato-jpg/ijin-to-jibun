# -*- coding: utf-8 -*-
"""
data/people/*.json の imageUrl から Wikimedia Commons のライセンス情報を取得し、
imageCredit フィールドに書き込む。

使い方:
    python scripts/enrich_image_credits.py
    python scripts/enrich_image_credits.py dutilleux   # 指定IDのみ
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PEOPLE_DIR = ROOT / "data" / "people"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
UA = "ijin-to-jibun/0.1 (image-credit)"


def http_get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode("utf-8"))


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def extract_filename(image_url: str) -> str:
    """
    例:
      https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Nietzsche1882.jpg/500px-Nietzsche1882.jpg
        -> Nietzsche1882.jpg
      https://upload.wikimedia.org/wikipedia/commons/3/3e/Portrait_of_Robert_Schumann.jpg
        -> Portrait_of_Robert_Schumann.jpg
    """
    # /thumb/.../元ファイル名/500px-... の場合
    m = re.search(r"/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/]+?)(?:/|$)", image_url)
    if not m:
        return ""
    name = m.group(1)
    return urllib.parse.unquote(name)


def fetch_license_info(filename: str):
    """Commons API でライセンス情報を取得"""
    params = {
        "action": "query",
        "format": "json",
        "prop": "imageinfo",
        "iiprop": "extmetadata",
        "titles": f"File:{filename}",
    }
    url = COMMONS_API + "?" + urllib.parse.urlencode(params)
    data = http_get_json(url)
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None
    page = next(iter(pages.values()))
    info = (page.get("imageinfo") or [{}])[0]
    meta = info.get("extmetadata", {})

    def get(key):
        v = meta.get(key, {}).get("value")
        return strip_html(v) if v else ""

    artist = get("Artist")
    license_short = get("LicenseShortName")
    license_url = get("LicenseUrl")
    credit = get("Credit")

    return {
        "artist": artist,
        "license": license_short,
        "licenseUrl": license_url,
        "credit": credit,
        "sourceUrl": f"https://commons.wikimedia.org/wiki/File:{urllib.parse.quote(filename)}",
    }


def process(person_file: Path):
    data = json.loads(person_file.read_text(encoding="utf-8"))
    pid = data["id"]
    url = data.get("imageUrl", "")
    if not url:
        print(f"  [SKIP] {pid}: imageUrl なし")
        return
    filename = extract_filename(url)
    if not filename:
        print(f"  [SKIP] {pid}: ファイル名を抽出できませんでした")
        return

    print(f"  [取得] {pid}  ({filename})")
    try:
        info = fetch_license_info(filename)
    except Exception as e:
        print(f"    ERROR: {e}")
        return
    if not info:
        print(f"    見つからず")
        return

    data["imageCredit"] = info
    person_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    license_str = info.get("license") or "?"
    artist = info.get("artist") or "不明"
    print(f"    OK  license={license_str}, artist={artist[:40]}")


def main():
    target_ids = set(sys.argv[1:])
    files = sorted(PEOPLE_DIR.glob("*.json"))
    for f in files:
        if target_ids and f.stem not in target_ids:
            continue
        process(f)


if __name__ == "__main__":
    main()
