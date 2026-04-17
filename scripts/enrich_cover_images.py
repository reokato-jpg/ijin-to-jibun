# -*- coding: utf-8 -*-
"""各偉人に、ゆかりの土地（places[0]）の写真をcoverImageとして設定する。
Wikipedia API で場所名で検索し、代表画像のサムネを取得する。
"""
import json, pathlib, urllib.parse, urllib.request, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

UA = "IjinApp/1.0 (natsumi@example.com)"
SESSION_HEADERS = {"User-Agent": UA}


def fetch_json(url):
    req = urllib.request.Request(url, headers=SESSION_HEADERS)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode("utf-8"))


def get_thumb_for_title(lang, title):
    """Wikipedia REST summary API でページの代表画像サムネを取得"""
    q = urllib.parse.quote(title.replace(" ", "_"), safe="")
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{q}"
    try:
        data = fetch_json(url)
        thumb = data.get("thumbnail") or data.get("originalimage")
        if thumb and thumb.get("source"):
            # なるべく大きい画像
            src = thumb["source"]
            # 500pxサイズに置換
            src = src.replace("/thumb/", "/thumb/")
            return src
    except Exception as e:
        pass
    return None


def search_wikipedia(lang, query):
    """Wikipedia 検索API で最初のヒットのタイトルを取得"""
    url = (
        f"https://{lang}.wikipedia.org/w/api.php?"
        f"action=query&list=search&srsearch={urllib.parse.quote(query)}"
        f"&format=json&srlimit=1"
    )
    try:
        data = fetch_json(url)
        hits = data.get("query", {}).get("search", [])
        if hits:
            return hits[0]["title"]
    except Exception:
        pass
    return None


def find_cover(place):
    """placeエントリ（name/location）から代表画像URLを得る"""
    name = place.get("name", "")
    location = place.get("location", "")
    # まず日本語Wikiで 名前
    queries = [name, f"{name} {location}", location]
    for q in queries:
        if not q:
            continue
        # まず日本語、次に英語で検索
        for lang in ("ja", "en"):
            title = search_wikipedia(lang, q)
            if not title:
                continue
            thumb = get_thumb_for_title(lang, title)
            if thumb:
                return thumb, name
    return None, None


def main():
    files = sorted(PEOPLE.glob("*.json"))
    updated = 0
    skipped_existing = 0
    not_found = []
    for fp in files:
        d = json.loads(fp.read_text(encoding="utf-8"))
        if d.get("coverImage"):
            skipped_existing += 1
            continue
        places = d.get("places") or []
        if not places:
            not_found.append(d["id"])
            continue
        place = places[0]
        print(f"  [探索] {d['id']} ({d['name']}) → {place.get('name')} / {place.get('location')}")
        thumb, caption = find_cover(place)
        time.sleep(0.4)
        if thumb:
            d["coverImage"] = thumb
            d["coverImageCaption"] = caption
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            updated += 1
            print(f"    OK -> {thumb[:80]}")
        else:
            not_found.append(d["id"])
            print(f"    見つからず")
    print(f"\n更新: {updated}人 / 既存: {skipped_existing}人 / 見つからず: {len(not_found)}人")
    if not_found:
        print("見つからなかった:", ", ".join(not_found))


if __name__ == "__main__":
    main()
