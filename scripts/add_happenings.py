# -*- coding: utf-8 -*-
"""代表的な偉人に、継続的なイベント・グッズ販売情報を追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

HAPPENINGS = {
    "hokusai": [
        {"type": "exhibition", "title": "すみだ北斎美術館 常設展", "venue": "東京都墨田区", "period": "通年",
         "url": "https://hokusai-museum.jp/", "description": "北斎の生涯と作品を年代順に辿る常設展示。浮世絵の精密なレプリカと映像で楽しめる。"},
        {"type": "exhibition", "title": "北斎館", "venue": "長野県小布施町", "period": "通年",
         "url": "https://hokusai-kan.com/", "description": "晩年の天井画が見られる小布施町の北斎専門美術館。"},
        {"type": "goods", "title": "神奈川沖浪裏 グッズ", "venue": "全国ミュージアムショップ・Amazon",
         "url": "https://www.amazon.co.jp/s?k=%E5%8C%97%E6%96%8E+%E7%A5%9E%E5%A5%88%E5%B7%9D%E6%B2%96%E6%B5%AA%E8%A3%8F",
         "description": "手ぬぐい・クリアファイル・マグカップ・Tシャツなど、浪裏モチーフの定番グッズ多数。"}
    ],
    "van_gogh": [
        {"type": "exhibition", "title": "ファン・ゴッホ美術館", "venue": "オランダ・アムステルダム", "period": "通年",
         "url": "https://www.vangoghmuseum.nl/ja", "description": "世界最大のゴッホコレクション。『ひまわり』『アーモンドの花咲く枝』など。"},
        {"type": "exhibition", "title": "ゴッホ展 巡回", "venue": "日本各地美術館", "period": "不定期開催",
         "url": "https://www.google.com/search?q=%E3%82%B4%E3%83%83%E3%83%9B%E5%B1%95+2026",
         "description": "数年に一度、日本で大規模回顧展が開催される。公式サイトやSNSで最新情報を。"},
        {"type": "goods", "title": "ひまわり モチーフ商品", "venue": "美術館ショップ・ネット通販",
         "url": "https://www.amazon.co.jp/s?k=%E3%82%B4%E3%83%83%E3%83%9B+%E3%81%B2%E3%81%BE%E3%82%8F%E3%82%8A",
         "description": "ポスター・マグカップ・Tシャツ・ジグソーパズル。ゴッホの『ひまわり』は最もグッズ化される絵画のひとつ。"}
    ],
    "monet": [
        {"type": "exhibition", "title": "モネの家と庭園", "venue": "フランス・ジヴェルニー", "period": "4月〜11月",
         "url": "https://fondation-monet.com/", "description": "『睡蓮』が描かれた実際の庭と日本橋。冬季休館。"},
        {"type": "exhibition", "title": "オランジュリー美術館 大装飾画", "venue": "フランス・パリ", "period": "通年",
         "url": "https://www.musee-orangerie.fr/", "description": "モネ晩年の『睡蓮』連作が2つの楕円ホールで体験できる。"}
    ],
    "beethoven": [
        {"type": "exhibition", "title": "ベートーヴェン・ハウス", "venue": "ドイツ・ボン", "period": "通年",
         "url": "https://www.beethoven.de/", "description": "生家博物館。自筆譜・楽器・遺品を展示。"},
        {"type": "concert", "title": "ベートーヴェン交響曲 演奏会", "venue": "全国ホール・オーケストラ", "period": "年中多数",
         "url": "https://www.google.com/search?q=%E3%83%99%E3%83%BC%E3%83%88%E3%83%BC%E3%83%B4%E3%82%A7%E3%83%B3+%E4%BA%A4%E9%9F%BF%E6%9B%B2+%E6%BC%94%E5%A5%8F%E4%BC%9A",
         "description": "特に年末の『第九』は日本の風物詩。"}
    ],
    "mozart": [
        {"type": "exhibition", "title": "モーツァルトハウス・ウィーン", "venue": "オーストリア・ウィーン", "period": "通年",
         "url": "https://www.mozarthausvienna.at/", "description": "『フィガロの結婚』を書いた住居が博物館に。"},
        {"type": "festival", "title": "ザルツブルク音楽祭", "venue": "オーストリア・ザルツブルク", "period": "毎年7月下旬〜8月",
         "url": "https://www.salzburgerfestspiele.at/", "description": "モーツァルト生誕の地で開かれる世界最高峰の音楽祭。"}
    ],
    "chopin": [
        {"type": "exhibition", "title": "ショパン博物館", "venue": "ポーランド・ワルシャワ", "period": "通年",
         "url": "https://muzeum.nifc.pl/ja/", "description": "自筆譜・手紙・ピアノ・デスマスクを展示する最大のショパン博物館。"},
        {"type": "festival", "title": "ショパン国際ピアノコンクール", "venue": "ポーランド・ワルシャワ", "period": "5年に1回（次回2025開催予定）",
         "url": "https://chopincompetition2025.com/", "description": "世界最高峰のピアノコンクール。ショパン没後100年を機に1927年開始。"},
        {"type": "concert", "title": "ショパンの夕べ／ショパン生誕祭", "venue": "日本各地ホール・サロン", "period": "3月1日（誕生日）周辺",
         "url": "https://www.google.com/search?q=%E3%82%B7%E3%83%A7%E3%83%91%E3%83%B3%E7%94%9F%E8%AA%95%E7%A5%AD",
         "description": "毎年3月、世界中でショパン生誕を記念する演奏会が開かれる。"}
    ],
    "bach": [
        {"type": "exhibition", "title": "バッハ博物館", "venue": "ドイツ・ライプツィヒ", "period": "通年",
         "url": "https://www.bachmuseumleipzig.de/", "description": "トーマス教会に隣接する世界有数のバッハ研究・展示施設。"},
        {"type": "festival", "title": "ライプツィヒ・バッハ音楽祭", "venue": "ドイツ・ライプツィヒ", "period": "毎年6月上旬",
         "url": "https://www.bachfestleipzig.de/", "description": "バッハゆかりの教会で10日間、世界中の演奏家が集う。"}
    ],
    "leonardo": [
        {"type": "exhibition", "title": "ルーヴル美術館 モナ・リザ", "venue": "フランス・パリ", "period": "通年",
         "url": "https://www.louvre.fr/", "description": "世界で最も有名な絵画を直接見られる。混雑するので朝一が吉。"},
        {"type": "exhibition", "title": "クロ・リュセ城", "venue": "フランス・アンボワーズ", "period": "通年",
         "url": "https://www.vinci-closluce.com/", "description": "ダ・ヴィンチ晩年の館。機械の復元モデルも展示。"}
    ],
    "einstein": [
        {"type": "exhibition", "title": "アインシュタイン・ハウス", "venue": "スイス・ベルン", "period": "通年",
         "url": "https://www.einstein-bern.ch/", "description": "特許庁時代に住み『奇跡の年』の論文を書いたアパート。"},
        {"type": "goods", "title": "アインシュタイン肖像グッズ", "venue": "ミュージアムショップ・通販",
         "url": "https://www.amazon.co.jp/s?k=%E3%82%A2%E3%82%A4%E3%83%B3%E3%82%B7%E3%83%A5%E3%82%BF%E3%82%A4%E3%83%B3+%E3%82%B0%E3%83%83%E3%82%BA",
         "description": "あの有名な舌を出した写真のTシャツ・マグカップ・ポスターなど。"}
    ],
    "soseki": [
        {"type": "exhibition", "title": "新宿区立 漱石山房記念館", "venue": "東京都新宿区早稲田南町", "period": "通年（月曜休）",
         "url": "https://soseki-museum.jp/", "description": "最期の日々を過ごした漱石山房を復元。自筆原稿・書簡を多数展示。"},
        {"type": "exhibition", "title": "東北大学史料館 漱石文庫", "venue": "宮城県仙台市", "period": "通年",
         "url": "http://www2.archives.tohoku.ac.jp/", "description": "漱石の蔵書・自筆資料を保管する国内最大級のコレクション。"}
    ],
    "dazai_osamu": [
        {"type": "exhibition", "title": "太宰治記念館 斜陽館", "venue": "青森県五所川原市金木町", "period": "通年",
         "url": "https://dazai.or.jp/", "description": "生家である旧津島家住宅。国重要文化財。"},
        {"type": "festival", "title": "桜桃忌", "venue": "東京都三鷹市 禅林寺", "period": "毎年6月19日",
         "url": "https://www.google.com/search?q=%E6%A1%9C%E6%A1%83%E5%BF%8C",
         "description": "太宰の誕生日にして遺体発見の日。全国から太宰ファンが集まる命日。"}
    ],
    "miyazawa_kenji": [
        {"type": "exhibition", "title": "宮沢賢治記念館", "venue": "岩手県花巻市", "period": "通年",
         "url": "https://www.city.hanamaki.iwate.jp/kanko/miyazawakenji/", "description": "賢治の科学・音楽・宗教・文学を総合的に展示。"},
        {"type": "festival", "title": "宮沢賢治祭", "venue": "花巻市", "period": "毎年9月",
         "url": "https://www.google.com/search?q=%E5%AE%AE%E6%B2%A2%E8%B3%A2%E6%B2%BB%E7%A5%AD",
         "description": "賢治の命日周辺に開催。朗読・演奏・講演など。"}
    ],
    "oda_nobunaga": [
        {"type": "festival", "title": "岐阜信長まつり", "venue": "岐阜県岐阜市", "period": "毎年10月上旬",
         "url": "https://www.google.com/search?q=%E5%B2%90%E9%98%9C%E4%BF%A1%E9%95%B7%E3%81%BE%E3%81%A4%E3%82%8A",
         "description": "信長役を有名人が務める大名行列が目玉。2022年は木村拓哉が話題に。"},
        {"type": "exhibition", "title": "安土城跡", "venue": "滋賀県近江八幡市", "period": "通年（登山可）",
         "url": "https://www.google.com/search?q=%E5%AE%89%E5%9C%9F%E5%9F%8E%E8%B7%A1",
         "description": "天下統一の象徴だった安土城の遺構。石段を登って天主台跡へ。"}
    ],
    "tokugawa_ieyasu": [
        {"type": "festival", "title": "家康行列", "venue": "静岡県浜松市・静岡市", "period": "毎年春",
         "url": "https://www.google.com/search?q=%E5%AE%B6%E5%BA%B7%E8%A1%8C%E5%88%97",
         "description": "浜松・静岡それぞれで家康を顕彰する時代行列。"},
        {"type": "exhibition", "title": "久能山東照宮博物館", "venue": "静岡県静岡市駿河区", "period": "通年",
         "url": "http://www.toshogu.or.jp/", "description": "家康の遺品・刀剣・肖像画を展示。本殿は国宝。"}
    ],
    "toyotomi_hideyoshi": [
        {"type": "exhibition", "title": "大阪城天守閣", "venue": "大阪府大阪市中央区", "period": "通年",
         "url": "https://www.osakacastle.net/", "description": "秀吉の築いた天下の城。内部は博物館で展示も充実。"},
        {"type": "festival", "title": "豊国神社 例大祭", "venue": "京都市東山区", "period": "毎年9月18日",
         "url": "https://www.google.com/search?q=%E8%B1%8A%E5%9B%BD%E7%A5%9E%E7%A4%BE+%E4%BE%8B%E5%A4%A7%E7%A5%AD",
         "description": "秀吉の命日に行われる、豊国神社最大の祭典。"}
    ],
    "sakamoto_ryoma": [
        {"type": "exhibition", "title": "高知県立坂本龍馬記念館", "venue": "高知県高知市浦戸", "period": "通年",
         "url": "https://ryoma-kinenkan.jp/", "description": "桂浜に面した龍馬専門の博物館。手紙と刀を常設展示。"},
        {"type": "festival", "title": "龍馬まつり・龍馬生誕祭", "venue": "高知市", "period": "毎年11月中旬",
         "url": "https://www.google.com/search?q=%E9%BE%8D%E9%A6%AC%E7%94%9F%E8%AA%95%E7%A5%AD",
         "description": "11/15は龍馬誕生日＆命日。高知で盛大に祭りが行われる。"}
    ],
    "picasso": [
        {"type": "exhibition", "title": "ピカソ美術館", "venue": "スペイン・バルセロナ", "period": "通年",
         "url": "https://www.museupicasso.bcn.cat/", "description": "青年期の作品を多く所蔵する、本人存命中に作られた唯一の美術館。"},
        {"type": "exhibition", "title": "国立ピカソ美術館", "venue": "フランス・パリ", "period": "通年",
         "url": "https://www.museepicassoparis.fr/", "description": "マレ地区のサレ館を改装した、世界最大のピカソコレクション。"}
    ],
    "curie": [
        {"type": "exhibition", "title": "キュリー博物館", "venue": "フランス・パリ", "period": "火〜土（無料）",
         "url": "https://musee.curie.fr/", "description": "マリーが40年働いた研究所を保存した博物館。"}
    ],
    "anne_frank": [
        {"type": "exhibition", "title": "アンネ・フランクの家", "venue": "オランダ・アムステルダム", "period": "通年（要予約）",
         "url": "https://www.annefrank.org/ja/", "description": "2年間潜伏した『後ろの家』が当時のまま保存されている。事前予約必須。"}
    ],
    "chaplin": [
        {"type": "exhibition", "title": "チャップリン・ワールド", "venue": "スイス・ヴェヴェイ", "period": "通年",
         "url": "https://www.chaplinsworld.com/", "description": "晩年を過ごした自宅とスタジオを再現。名場面のセットで記念撮影可。"}
    ]
}


def main():
    updated = 0
    for pid, items in HAPPENINGS.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        existing = d.get("happenings", [])
        titles = set(h.get("title") for h in existing)
        added = 0
        for h in items:
            if h["title"] in titles:
                continue
            existing.append(h)
            added += 1
        d["happenings"] = existing
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        if added:
            print(f"OK: {pid} +{added} (合計{len(existing)})")
            updated += 1
    print(f"\n{updated}人にイベント情報を追加")


if __name__ == "__main__":
    main()
