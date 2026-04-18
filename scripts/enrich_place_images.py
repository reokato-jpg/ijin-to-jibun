# -*- coding: utf-8 -*-
"""各人物の places[] に image フィールドを追加（Wikipedia API から）"""
import json, pathlib, urllib.parse, urllib.request, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

UA = "IjinApp/1.0 (natsumi@example.com)"
HEADERS = {"User-Agent": UA}


def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode("utf-8"))


def get_thumb(lang, title):
    q = urllib.parse.quote(title.replace(" ", "_"), safe="")
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{q}"
    try:
        data = fetch_json(url)
        thumb = data.get("thumbnail")
        if thumb and thumb.get("source"):
            return thumb["source"]
    except Exception:
        pass
    return None


def wiki_search(lang, query):
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


def main():
    updated_people = 0
    updated_places = 0
    for fp in sorted(PEOPLE.glob("*.json")):
        d = json.loads(fp.read_text(encoding="utf-8"))
        places = d.get("places") or []
        changed = False
        for place in places:
            if place.get("image"):
                continue
            name = place.get("name", "")
            location = place.get("location", "")
            queries = [name, f"{name} {location}", location]
            for q in queries:
                if not q: continue
                for lang in ("ja", "en"):
                    title = wiki_search(lang, q)
                    if not title:
                        continue
                    thumb = get_thumb(lang, title)
                    if thumb:
                        place["image"] = thumb
                        updated_places += 1
                        changed = True
                        break
                if place.get("image"): break
                time.sleep(0.2)
            time.sleep(0.2)
        if changed:
            d["places"] = places
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            updated_people += 1
            print(f"OK: {d['id']}  画像追加")
    print(f"\n{updated_people}人・{updated_places}件の聖地画像を追加")


if __name__ == "__main__":
    main()
