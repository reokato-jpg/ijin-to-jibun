# -*- coding: utf-8 -*-
"""映画監督・アニメーターの作品にAmazon（DVD/Blu-ray/配信）購入ASINを追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

# ASIN = Amazon 商品ID（日本のAmazon）
ADD = {
    "miyazaki": [
        {"title": "となりのトトロ", "year": 1988, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "姉妹とトトロの夏。ジブリの魂",
         "asin": "B00005R5J6"},
        {"title": "千と千尋の神隠し", "year": 2001, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "アカデミー長編アニメ賞。日本アニメを世界に。",
         "asin": "B00005R5J0"},
        {"title": "風の谷のナウシカ", "year": 1984, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "ジブリの出発点。腐海と王蟲の物語",
         "asin": "B00005R5GH"},
        {"title": "もののけ姫", "year": 1997, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "邦画最高興収193億円。自然と人の葛藤",
         "asin": "B00005R5GP"},
        {"title": "魔女の宅急便", "year": 1989, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "少女の成長物語。『ルージュの伝言』",
         "asin": "B00005R5GI"},
        {"title": "ハウルの動く城", "year": 2004, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "戦争と愛と老い。久石譲の名曲",
         "asin": "B00091Q6O2"},
        {"title": "紅の豚", "year": 1992, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "『カッコイイとは、こういうことさ』",
         "asin": "B00005R5GJ"},
        {"title": "風立ちぬ", "year": 2013, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "堀越二郎と零戦。最後の宣言",
         "asin": "B00FYIZ2K8"},
        {"title": "君たちはどう生きるか", "year": 2023, "type": "anime", "country": "日本",
         "director": "宮崎駿", "description": "10年ぶりの新作。アカデミー賞",
         "asin": "B0CXLYB27J"}
    ],
    "kurosawa": [
        {"title": "七人の侍", "year": 1954, "type": "movie", "country": "日本",
         "director": "黒澤明", "cast": "三船敏郎", "description": "207分の大作。世界中でリメイクされた",
         "asin": "B00K6JRC1E"},
        {"title": "羅生門", "year": 1950, "type": "movie", "country": "日本",
         "director": "黒澤明", "cast": "三船敏郎／京マチ子", "description": "ヴェネツィア金獅子賞",
         "asin": "B07FCRLGWS"},
        {"title": "用心棒", "year": 1961, "type": "movie", "country": "日本",
         "director": "黒澤明", "cast": "三船敏郎", "description": "西部劇へ影響を与えた一匹狼",
         "asin": "B07FCS8T7V"},
        {"title": "生きる", "year": 1952, "type": "movie", "country": "日本",
         "director": "黒澤明", "cast": "志村喬", "description": "死を宣告された市役所員の最後の仕事",
         "asin": "B07FCRQ3KC"},
        {"title": "乱", "year": 1985, "type": "movie", "country": "日本",
         "director": "黒澤明", "description": "リア王を戦国日本に。武満徹音楽",
         "asin": "B00B4OAOWG"}
    ],
    "walt_disney": [
        {"title": "白雪姫", "year": 1937, "type": "anime", "country": "アメリカ",
         "director": "ウォルト・ディズニー", "description": "世界初の長編アニメーション",
         "asin": "B072VTVMVD"},
        {"title": "ファンタジア", "year": 1940, "type": "anime", "country": "アメリカ",
         "director": "ウォルト・ディズニー", "description": "クラシック音楽とアニメの融合",
         "asin": "B06XG2VCKB"},
        {"title": "ダンボ", "year": 1941, "type": "anime", "country": "アメリカ",
         "director": "ウォルト・ディズニー", "description": "大きな耳の子象の物語",
         "asin": "B07D1BQCXR"},
        {"title": "バンビ", "year": 1942, "type": "anime", "country": "アメリカ",
         "director": "ウォルト・ディズニー", "description": "森の仔鹿バンビの成長",
         "asin": "B0C5PD8GTK"}
    ],
    "chaplin": [
        {"title": "モダン・タイムス", "year": 1936, "type": "movie", "country": "アメリカ",
         "director": "チャップリン", "description": "機械文明批判の不朽の喜劇",
         "asin": "B09G2CRYHB"},
        {"title": "独裁者", "year": 1940, "type": "movie", "country": "アメリカ",
         "director": "チャップリン", "description": "6分間の不滅のスピーチ",
         "asin": "B09G2D2TWJ"},
        {"title": "街の灯", "year": 1931, "type": "movie", "country": "アメリカ",
         "director": "チャップリン", "description": "盲目の花売り娘との恋",
         "asin": "B09G2CRYH9"},
        {"title": "ライムライト", "year": 1952, "type": "movie", "country": "アメリカ",
         "director": "チャップリン", "description": "晩年の自伝的傑作",
         "asin": "B09G2D2TWL"},
        {"title": "黄金狂時代", "year": 1925, "type": "movie", "country": "アメリカ",
         "director": "チャップリン", "description": "『パンダンス』の名場面",
         "asin": "B09G2D2TWF"}
    ]
}


def amazon_url(asin):
    return f"https://www.amazon.co.jp/dp/{asin}?tag=" # 空のタグで標準リンク


def main():
    added_total = 0
    for pid, items in ADD.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        media = d.get("media", [])
        existing_titles = set(m.get("title") for m in media)
        for m in items:
            if m["title"] in existing_titles:
                # 既存を更新（asinを追加）
                for ex in media:
                    if ex["title"] == m["title"]:
                        if "asin" not in ex:
                            ex["asin"] = m.get("asin")
                        break
                continue
            m["url"] = amazon_url(m.get("asin", ""))
            media.append(m)
            added_total += 1
        d["media"] = media
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"OK: {pid}")
    print(f"\n{added_total}件追加")


if __name__ == "__main__":
    main()
