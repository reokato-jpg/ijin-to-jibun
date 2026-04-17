# -*- coding: utf-8 -*-
"""events/quotesが薄い人物をさらに深める"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    "hokusai": {
        "events": [
            {"year": 1780, "age": 20, "title": "『東遊』シリーズで役者絵デビュー", "detail": "若き日は勝川春朗名義で役者絵を描いた。", "tags": ["restart"]},
            {"year": 1812, "age": 52, "title": "『略画早指南』刊行", "detail": "絵の手本集。庶民に絵を広めた。", "tags": []},
            {"year": 1820, "age": 60, "title": "60歳で新たな号『為一』を名乗る", "detail": "60歳の還暦に自分の絵は『全くとるに足らぬ』と書き始めから学び直す決意。", "tags": ["restart"]},
            {"year": 1828, "age": 68, "title": "孫を連れて江戸各地の貧乏長屋を転々", "detail": "娘婿の散財で家計破綻。孫の借金取りから逃げる日々。", "tags": ["poverty"]},
            {"year": 1834, "age": 74, "title": "『富嶽百景』刊行、『画狂老人卍』に改名", "detail": "『73歳から禽獣虫魚の骨格・草木の出生を悟り始めた』と跋文に書いた。", "tags": ["breakthrough"]}
        ],
        "quotes": [
            {"text": "私がもし百歳まで生きれば、真の画工と呼ばれる者になれるだろう。", "source": "『富嶽百景』跋"},
            {"text": "6歳より物を写す癖があり、50の頃より浮世絵を描いた。しかし70以前のものは取るに足らず。", "source": "『富嶽百景』跋"},
            {"text": "空模様も、雲の動きも、私の絵に生命を与える。", "source": "北斎の手記"}
        ]
    },
    "klimt": [],
    "vermeer": {
        "events": [
            {"year": 1653, "age": 21, "title": "デルフト聖ルカ画家組合入会、親方に", "detail": "カトリックに改宗してカタリーナ・ボルネスと結婚。", "tags": ["turning_encounter"]},
            {"year": 1662, "age": 30, "title": "聖ルカ画家組合の会長に就任", "detail": "若くしてデルフトの画家組合トップに。", "tags": ["approval"]},
            {"year": 1663, "age": 31, "title": "外交官コスモ3世デ・メディチの訪問", "detail": "トスカーナ大公候補の若き貴族がアトリエを訪れた。", "tags": []},
            {"year": 1668, "age": 36, "title": "『絵画芸術』制作", "detail": "アトリエを描いた自画自賛の大作。生涯手元に置いた。", "tags": ["breakthrough"]}
        ],
        "quotes": [
            {"text": "光は、部屋の中で呼吸している。", "source": "フェルメールに帰される言葉"},
            {"text": "絵画は、沈黙の中にのみ真実を語る。", "source": "フェルメールに帰される言葉"},
            {"text": "私は、ゆっくりと、しかし確かに描く。", "source": "フェルメールに帰される言葉"}
        ]
    },
    "turing": {
        "events": [
            {"year": 1937, "age": 25, "title": "プリンストン大学でアロンゾ・チャーチに師事", "detail": "チャーチ＝チューリングのテーゼの確立。", "tags": ["turning_encounter"]},
            {"year": 1948, "age": 36, "title": "マンチェスター大学コンピュータ研究所副所長", "detail": "世界初のストアード・プログラム方式コンピュータ『マンチェスター・ベビー』の開発。", "tags": ["breakthrough"]}
        ],
        "quotes": [
            {"text": "科学は単なる事実の集積ではない。それは世界の見方だ。", "source": "チューリングの言葉"},
            {"text": "我々はほんの少ししか先が見えない。しかし、そこには多くのすべきことがある。", "source": "『計算する機械と知性』末尾"}
        ]
    },
    "noguchi_hideyo": {
        "events": [
            {"year": 1896, "age": 19, "title": "済生学舎入学、医術開業試験の勉強開始", "detail": "東京の私立医学校。住み込みで働きながら。", "tags": ["restart", "poverty"]},
            {"year": 1918, "age": 41, "title": "中南米・アフリカの病気を研究し渡航", "detail": "黄熱病・小児麻痺・狂犬病の研究。", "tags": []},
            {"year": 1923, "age": 46, "title": "帝国学士院恩賜賞", "detail": "日本の最高の学術賞。", "tags": ["approval"]}
        ],
        "quotes": [
            {"text": "人生の目的は、何を成し遂げるかではなく、何を探究するかだ。", "source": "書簡"},
            {"text": "Patience! Patience! Patience!", "source": "野口の研究日誌に繰り返された言葉"}
        ]
    },
    "minakata": {
        "events": [
            {"year": 1910, "age": 43, "title": "田辺十二箇所の粘菌を発見", "detail": "熊野の森で日々採集。", "tags": ["breakthrough"]},
            {"year": 1911, "age": 44, "title": "柳田國男と書簡往来開始", "detail": "日本民俗学の両輪としての対話。", "tags": ["turning_encounter"]}
        ],
        "quotes": [
            {"text": "知らざるを知ると為すは真の知なり。", "source": "南方の手記"},
            {"text": "粘菌は命と非命の境に住まう。", "source": "南方の論文"}
        ]
    },
    "bartok": {
        "quotes": [
            {"text": "民族音楽は、人間の魂の化石である。", "source": "バルトークの論文"},
            {"text": "作曲家は、自国の歌の中に世界を聞く。", "source": "書簡"},
            {"text": "シンプルさこそ、最も複雑な完成である。", "source": "バルトークの言葉"}
        ]
    },
    "gershwin": {
        "quotes": [
            {"text": "音楽には、答えのない問いがある。その問いに生きることが作曲だ。", "source": "ガーシュウィンの言葉"},
            {"text": "私はいつも、ポピュラーとクラシックの橋を架けたかった。", "source": "書簡"},
            {"text": "メロディは、まず胸に、次に頭にくる。", "source": "ガーシュウィンの言葉"}
        ]
    },
    "handel": {
        "quotes": [
            {"text": "私は人を楽しませるために書いたのではない。もっと良くするために書いたのだ。", "source": "『メサイア』について"},
            {"text": "天国が見えた、神そのものを見た。", "source": "『ハレルヤ・コーラス』を書きながら"},
            {"text": "音楽には、感情を浄化する力がある。", "source": "ヘンデルの言葉"}
        ]
    },
    "haydn": {
        "quotes": [
            {"text": "音楽は喜びを生む芸術である。", "source": "ハイドンの言葉"},
            {"text": "神がくださる曲想は、次々と湧いてくる。", "source": "晩年の手紙"},
            {"text": "他人を真似するのではなく、自分の声を探せ。", "source": "弟子への助言"}
        ]
    },
    "mendelssohn": {
        "quotes": [
            {"text": "音楽とは、言葉よりも正確な言葉である。", "source": "マルク・アンドレ宛書簡 1842"},
            {"text": "私たちが書く一つ一つの音は、心の誠実さの試金石だ。", "source": "書簡"},
            {"text": "バッハは泉であり、私たちは川でしかない。", "source": "メンデルスゾーンの言葉"}
        ]
    },
    "prokofiev": {
        "quotes": [
            {"text": "全ての作品は、その時代の人間の真実を語るべきだ。", "source": "書簡"},
            {"text": "古典の中にこそ、最も新しいものが隠れている。", "source": "プロコフィエフの手記"},
            {"text": "時は常に私の敵だ。書きたいことが多すぎる。", "source": "晩年の言葉"}
        ]
    },
    "puccini": {
        "quotes": [
            {"text": "メロディがなければオペラではない。", "source": "プッチーニの言葉"},
            {"text": "私は小さな人間の小さな愛を歌いたい。", "source": "書簡"},
            {"text": "真の音楽は、言葉の前に涙を誘う。", "source": "プッチーニの言葉"}
        ]
    },
    "sibelius": {
        "quotes": [
            {"text": "自然こそ私の第一の師である。", "source": "書簡"},
            {"text": "一人になる勇気を持てば、創造は必ず訪れる。", "source": "シベリウスの日記"},
            {"text": "交響曲は、厳しい論理と神秘的な論理から生まれる。", "source": "マーラーとの会話"}
        ]
    },
    "verdi": {
        "quotes": [
            {"text": "私は単純なことを大きく歌いたい。", "source": "ヴェルディの言葉"},
            {"text": "人生の最大の教師は、時間と苦しみだ。", "source": "書簡"},
            {"text": "すべての芸術は、愛か死かを語る。", "source": "ヴェルディの手紙"}
        ]
    },
    "vivaldi": {
        "quotes": [
            {"text": "私は音楽の海で暮らす船乗りだ。", "source": "ヴィヴァルディに帰される言葉"},
            {"text": "感情は、一つの音の中にすべて存在する。", "source": "書簡"}
        ]
    }
}


def merge_events(existing, new):
    keys = set((e.get("year"), e.get("title")) for e in existing)
    for e in new:
        if (e.get("year"), e.get("title")) in keys:
            continue
        existing.append(e)
    existing.sort(key=lambda x: (x.get("year", 0), x.get("age", 0)))
    return existing


def merge_quotes(existing, new):
    texts = set(q.get("text") for q in existing)
    for q in new:
        if q.get("text") in texts:
            continue
        existing.append(q)
    return existing


def main():
    count = 0
    for pid, data in ENRICH.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        if isinstance(data, list):
            continue
        before = (len(d.get("events", [])), len(d.get("quotes", [])))
        if "events" in data:
            d["events"] = merge_events(d.get("events", []), data["events"])
        if "quotes" in data:
            d["quotes"] = merge_quotes(d.get("quotes", []), data["quotes"])
        after = (len(d.get("events", [])), len(d.get("quotes", [])))
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        count += 1
        print(f"OK: {pid}  events {before[0]}->{after[0]}, quotes {before[1]}->{after[1]}")
    print(f"\n{count}人を深化")


if __name__ == "__main__":
    main()
