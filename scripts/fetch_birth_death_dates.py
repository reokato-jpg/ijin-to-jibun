# -*- coding: utf-8 -*-
"""Wikidata経由で誕生日・命日を取得"""
import json
import pathlib
import urllib.parse
import urllib.request
import re
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"


def wiki_pageprops(title):
    """Wikipedia記事のwikibase_item（QID）を取得"""
    url = (
        "https://ja.wikipedia.org/w/api.php?action=query&prop=pageprops"
        "&ppprop=wikibase_item&format=json&titles=" + urllib.parse.quote(title)
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ijin-to-jibun/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
            pages = data.get("query", {}).get("pages", {})
            for _, page in pages.items():
                pp = page.get("pageprops", {})
                qid = pp.get("wikibase_item")
                if qid:
                    return qid
    except Exception:
        pass
    return None


def wikidata_dates(qid):
    """Wikidata QIDから P569(誕生日), P570(命日) を取得"""
    url = (
        "https://www.wikidata.org/wiki/Special:EntityData/"
        + qid + ".json"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ijin-to-jibun/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
            claims = data.get("entities", {}).get(qid, {}).get("claims", {})
            def extract(prop):
                lst = claims.get(prop, [])
                for c in lst:
                    try:
                        t = c["mainsnak"]["datavalue"]["value"]["time"]
                        # 例: +1810-03-01T00:00:00Z / -0563-00-00T00:00:00Z
                        m = re.match(r"([+-])(\d{4})-(\d{2})-(\d{2})", t)
                        if m:
                            sign, y, mo, d = m.groups()
                            y = int(y); mo = int(mo); d = int(d)
                            if sign == "-":
                                y = -y
                            return y, mo, d
                    except Exception:
                        continue
                return None
            birth = extract("P569")
            death = extract("P570")
            return birth, death
    except Exception:
        return None, None


def main():
    updated = 0
    missing = []
    for path in sorted(PEOPLE.glob("*.json")):
        p = json.loads(path.read_text(encoding="utf-8"))
        if p.get("birthMonth") and p.get("deathMonth"):
            continue
        title = p.get("wikiTitle")
        if not title:
            missing.append(p["id"])
            continue

        qid = wiki_pageprops(title)
        time.sleep(0.2)
        if not qid:
            # 英語Wikipediaで再挑戦
            if p.get("nameEn"):
                en_url = (
                    "https://en.wikipedia.org/w/api.php?action=query&prop=pageprops"
                    "&ppprop=wikibase_item&format=json&titles=" + urllib.parse.quote(p["nameEn"])
                )
                try:
                    req = urllib.request.Request(en_url, headers={"User-Agent": "ijin-to-jibun/1.0"})
                    with urllib.request.urlopen(req, timeout=15) as r:
                        d = json.loads(r.read().decode("utf-8"))
                        for _, page in d.get("query", {}).get("pages", {}).items():
                            qid = page.get("pageprops", {}).get("wikibase_item")
                            if qid:
                                break
                except Exception:
                    pass
                time.sleep(0.2)
        if not qid:
            missing.append(p["id"])
            continue

        birth, death = wikidata_dates(qid)
        time.sleep(0.2)
        changed = False
        if birth and birth[1] > 0 and birth[2] > 0:
            p["birthMonth"], p["birthDay"] = birth[1], birth[2]
            changed = True
        if death and death[1] > 0 and death[2] > 0:
            p["deathMonth"], p["deathDay"] = death[1], death[2]
            changed = True
        if changed:
            path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
            updated += 1
            print(f"{p['id']}: 誕生 {p.get('birthMonth','?')}/{p.get('birthDay','?')} 命日 {p.get('deathMonth','?')}/{p.get('deathDay','?')}")
        else:
            missing.append(p["id"])

    print(f"\n更新: {updated}件")
    print(f"未取得: {len(missing)}件")
    if missing:
        print("未取得の人:", missing)


if __name__ == "__main__":
    main()
