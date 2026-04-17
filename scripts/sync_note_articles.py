# -*- coding: utf-8 -*-
"""
Note の RSS フィードから最新記事を取得して data/articles.json を自動更新する。

使い方:
    python scripts/sync_note_articles.py

RSS の URL は data/articles.json の author.noteUrl から自動で組み立てる。
    https://note.com/<username>/rss

既存の articles にある relatedPeople / relatedTags は URL で突合して維持。
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_FILE = ROOT / "data" / "articles.json"

NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
    "atom": "http://www.w3.org/2005/Atom",
    "media": "http://search.yahoo.com/mrss/",
}

UA = "Mozilla/5.0 (ijin-to-jibun/0.1)"


def http_get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as res:
        return res.read().decode("utf-8", errors="replace")


def extract_og_image(article_url: str) -> str:
    """記事ページの og:image を取得"""
    try:
        html = http_get(article_url)
    except Exception as e:
        print(f"    (画像取得失敗: {e})")
        return ""
    m = re.search(r'og:image[^>]+content=["\']([^"\']+)', html)
    return m.group(1) if m else ""


def extract_id_from_url(url: str) -> str:
    m = re.search(r"/n/(n[0-9a-f]+)", url)
    return m.group(1) if m else url.split("/")[-1]


def strip_html(s: str) -> str:
    """HTMLタグを剥がして簡易テキストに"""
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def format_date(rss_date: str) -> str:
    """RSSのpubDate (GMT) を YYYY-MM-DD に"""
    # 例: "Thu, 09 Apr 2026 00:00:00 +0000"
    m = re.search(r"(\d{1,2})\s+(\w{3})\s+(\d{4})", rss_date or "")
    if not m:
        return ""
    day, month_name, year = m.groups()
    months = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
    }
    mm = months.get(month_name, "01")
    return f"{year}-{mm}-{int(day):02d}"


def parse_rss(rss_xml: str):
    root = ET.fromstring(rss_xml)
    channel = root.find("channel")
    if channel is None:
        return []
    items = []
    for item in channel.findall("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()
        desc = (item.findtext("description") or "").strip()
        content = ""
        ce = item.find("content:encoded", NS)
        if ce is not None and ce.text:
            content = ce.text
        # 概要: description > content の冒頭
        body = desc or content
        body_text = strip_html(body)
        items.append({
            "title": title,
            "link": link,
            "pubDate": pub,
            "description": body_text[:180],
        })
    return items


def main():
    if not ARTICLES_FILE.exists():
        print(f"ERROR: {ARTICLES_FILE} が見つかりません")
        sys.exit(1)

    data = json.loads(ARTICLES_FILE.read_text(encoding="utf-8"))
    author = data.get("author") or {}
    note_url = (author.get("noteUrl") or "").rstrip("/")
    if not note_url:
        print("ERROR: data/articles.json の author.noteUrl が空です")
        sys.exit(1)

    rss_url = note_url + "/rss"
    print(f"[RSS取得] {rss_url}")
    try:
        rss_xml = http_get(rss_url)
    except Exception as e:
        print(f"ERROR: RSS取得失敗: {e}")
        sys.exit(1)

    items = parse_rss(rss_xml)
    print(f"[RSS記事数] {len(items)}")

    # 既存データを URL → 記事 でマップ化（メタデータ維持用）
    existing = {a.get("url"): a for a in (data.get("articles") or [])}

    new_articles = []
    for it in items:
        url = it["link"]
        prev = existing.get(url) or {}
        art_id = prev.get("id") or extract_id_from_url(url)

        # og:image は前回取得済みなら使い回す（速度のため）
        thumb = prev.get("thumbnail")
        if not thumb:
            print(f"[サムネ取得] {it['title'][:30]}")
            thumb = extract_og_image(url)

        new_articles.append({
            "id": art_id,
            "title": it["title"],
            "date": format_date(it["pubDate"]),
            "url": url,
            "source": "note",
            "category": prev.get("category", "わたしの話"),
            "thumbnail": thumb,
            "description": prev.get("description") or it["description"],
            "relatedPeople": prev.get("relatedPeople", []),
            "relatedTags": prev.get("relatedTags", []),
        })

    data["articles"] = new_articles
    ARTICLES_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"[保存] {ARTICLES_FILE.relative_to(ROOT)}")
    print(f"[完了] {len(new_articles)} 件")


if __name__ == "__main__":
    main()
