# -*- coding: utf-8 -*-
"""Wikipedia要約から『人生ダイジェスト』を生成して各偉人に追加"""
import json
import pathlib
import urllib.parse
import urllib.request
import re
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"


def fetch_extract(title, max_chars=600):
    """Wikipedia記事の冒頭テキストを取得（summary APIは短いのでextracts APIを使う）"""
    url = (
        "https://ja.wikipedia.org/w/api.php?action=query&prop=extracts"
        "&exintro=true&explaintext=true&format=json&titles=" + urllib.parse.quote(title)
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ijin-to-jibun/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
            for _, page in data.get("query", {}).get("pages", {}).items():
                extract = page.get("extract", "")
                return extract[:max_chars]
    except Exception:
        pass
    return None


def clean_text(s):
    if not s:
        return ""
    # 参考番号 [1] を除去
    s = re.sub(r"\[\d+\]", "", s)
    # 複数空白・改行を1つに
    s = re.sub(r"\s+", "", s)
    # 余分な句読点
    s = s.replace("。。", "。")
    # 冒頭の『フルネーム（英語表記、日付）』を削る
    s = re.sub(r"^[^。]{0,30}（[^）]+）", "", s, count=1)
    # 残った （...）英語・日付表記もまとめて除去（本文中）
    s = re.sub(r"（[^）]{0,80}\d{3,4}[^）]*）", "", s)
    s = re.sub(r"（[A-Za-z][^）]{0,60}）", "", s)
    # 先頭の `は、` を `は ` に
    s = re.sub(r"^[、。]", "", s)
    s = re.sub(r"^は", "", s)
    return s.strip()


def digest_from_extract(extract):
    """Wikipedia冒頭を4-5文の人生ダイジェストに整形"""
    if not extract:
        return None
    # 文単位で区切る（。で）
    text = clean_text(extract)
    sentences = re.split(r"(?<=。)", text)
    sentences = [s for s in sentences if len(s) > 10][:5]
    if not sentences:
        return None
    digest = "".join(sentences)
    # 300文字程度に短縮
    if len(digest) > 350:
        digest = digest[:350]
        # 最後の句点までに切る
        last_period = digest.rfind("。")
        if last_period > 200:
            digest = digest[: last_period + 1]
    return digest


def main():
    added = 0
    failed = []
    for path in sorted(PEOPLE.glob("*.json")):
        p = json.loads(path.read_text(encoding="utf-8"))
        if p.get("lifeDigest"):
            continue
        title = p.get("wikiTitle") or p.get("name")
        if not title:
            failed.append(p["id"])
            continue
        extract = fetch_extract(title)
        time.sleep(0.25)
        digest = digest_from_extract(extract)
        if digest and len(digest) > 50:
            p["lifeDigest"] = digest
            path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
            added += 1
            print(f"{p['id']}: {digest[:60]}...")
        else:
            failed.append(p["id"])
    print(f"\n追加: {added}件")
    print(f"未取得: {len(failed)}件 {failed}")


if __name__ == "__main__":
    main()
