# -*- coding: utf-8 -*-
"""更に深い彫り込み：事件・名言・世界観を広げる"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    "chopin": {
        "events": [
            {"year": 1829, "age": 19, "title": "ウィーンデビュー大成功", "detail": "ピアノ協奏曲第2番で聴衆を虜に。『詩的センスで聴衆を沈黙させた』と批評。", "tags": ["breakthrough", "approval"]},
            {"year": 1834, "age": 24, "title": "シューマンが論文で絶賛", "detail": "『帽子を取れ、諸君、天才だ！』の有名な一文。", "tags": ["approval"]},
        ],
        "quotes": [
            {"text": "音楽における単純さは、最高の極みである。", "source": "弟子への助言"},
            {"text": "ピアノの前に座ったときだけ、私は本当の私になれる。", "source": "書簡"}
        ]
    },
    "mozart": {
        "events": [
            {"year": 1770, "age": 14, "title": "システィーナ礼拝堂のアレグリ『ミゼレーレ』を一度聴いて記憶し再現", "detail": "門外不出だった楽譜を14歳の少年が暗譜。法王から黄金の拍車騎士団の叙勲。", "tags": ["breakthrough", "approval"]},
            {"year": 1783, "age": 27, "title": "父レオポルトがウィーンを訪問、二人は和解", "detail": "数年ぶりの再会。父は『彼らは音楽で私たちを泣かせた』と友人への手紙に書く。", "tags": ["parent_conflict"]}
        ],
        "quotes": [
            {"text": "私はまず書く前に、すべてを頭の中で聴く。ペンは残りの仕事をするだけだ。", "source": "書簡"},
            {"text": "愛こそが、天才の真の啓示である。", "source": "書簡"}
        ]
    },
    "beethoven": {
        "events": [
            {"year": 1795, "age": 24, "title": "ウィーンで公開ピアニストデビュー", "detail": "自作の協奏曲第2番。即興演奏でモーツァルトを超えたと評された。", "tags": ["breakthrough", "approval"]},
            {"year": 1816, "age": 45, "title": "甥カールの後見人に、養子訴訟", "detail": "兄カスパールの死後、甥の後見を巡り義姉と法廷闘争。晩年の創作を大きく消耗させた。", "tags": ["heartbreak", "parent_conflict"]}
        ]
    },
    "bach": {
        "events": [
            {"year": 1713, "age": 28, "title": "ドレスデン宮廷オルガニストの公開コンテストで圧勝", "detail": "相手のフランス人奏者は対決前夜に逃亡。", "tags": ["breakthrough", "approval"]},
            {"year": 1747, "age": 62, "title": "フリードリヒ大王の宮殿を訪れ即興で6声のフーガを披露", "detail": "大王与えた主題で、暖炉の前で演奏。", "tags": ["breakthrough"]}
        ]
    },
    "nietzsche": {
        "events": [
            {"year": 1888, "age": 43, "title": "トリノに落ち着く、『アンチクリスト』『この人を見よ』執筆", "detail": "発狂前の最後の生産的1年。超人思想の頂点。", "tags": []},
        ],
        "quotes": [
            {"text": "私が人を許すとき、私はすでにその人の上にいる。", "source": "『ツァラトゥストラ』"},
        ]
    },
    "einstein": {
        "quotes": [
            {"text": "宇宙について最も理解しがたいことは、それが理解可能であることだ。", "source": "『物理と実在』1936"},
            {"text": "重要なのは質問を止めないことだ。", "source": "ライフ誌インタビュー 1955"}
        ]
    },
    "socrates": {
        "events": [
            {"year": -420, "age": 50, "title": "悪妻クサンティッペとの結婚", "detail": "妻は口うるさく、ソクラテスは『荒馬を乗りこなせるなら、どの馬にも乗れる』と弟子に語った。", "tags": []},
        ],
        "quotes": [
            {"text": "結婚しなさい。良妻なら幸福に、悪妻なら哲学者になれる。", "source": "ソクラテスに帰される言葉"}
        ]
    },
    "dazai_osamu": {
        "events": [
            {"year": 1930, "age": 21, "title": "東京帝大仏文科入学", "detail": "ほぼ授業に出ず、左翼運動とカフェを転々。", "tags": ["restart"]},
        ],
        "quotes": [
            {"text": "弱虫は、幸福でさえ恐れるのです。", "source": "『人間失格』"}
        ]
    },
    "sakamoto_ryoma": {
        "quotes": [
            {"text": "男子志を立てるの時は 本来吾に在り。", "source": "龍馬の手紙"}
        ]
    },
    "van_gogh": {
        "events": [
            {"year": 1883, "age": 30, "title": "オランダ・ドレンテに短期移住", "detail": "孤独な湿地で『ジャガイモを食べる人々』へつながる暗色の習作。", "tags": ["isolation"]},
        ],
        "quotes": [
            {"text": "偉大なものは、小さな連続の積み重ねから生まれる。", "source": "テオへの手紙"},
            {"text": "絵画は私の心臓を通って、紙に流れる血液だ。", "source": "テオへの手紙"}
        ]
    },
    "leonardo": {
        "quotes": [
            {"text": "芸術は決して完成しない、ただ放棄されるだけだ。", "source": "レオナルドに帰される言葉"},
            {"text": "鉄は使わねば錆び、水は流れねば濁り、人の心もまた使わねば鈍る。", "source": "手稿"}
        ]
    },
    "curie": {
        "quotes": [
            {"text": "偉大なる発見は、発見の瞬間より、その準備の時の方がずっと長い。", "source": "自伝"},
            {"text": "私は、大きな志を抱くだけで十分だ。結果は自然についてくる。", "source": "書簡"}
        ]
    },
    "marx": {
        "quotes": [
            {"text": "偉大な歴史上の人物は、二度現れる。一度目は悲劇として、二度目は茶番として。", "source": "『ブリュメール18日』"}
        ]
    },
    "tolstoy": {
        "quotes": [
            {"text": "死を恐れる者は生きていない、自由もない。", "source": "『戦争と平和』"}
        ]
    },
    "dostoevsky": {
        "quotes": [
            {"text": "人間は、不幸に慣れる生き物である。", "source": "『死の家の記録』"}
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
    for pid, data in ENRICH.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        if "events" in data:
            d["events"] = merge_events(d.get("events", []), data["events"])
        if "quotes" in data:
            d["quotes"] = merge_quotes(d.get("quotes", []), data["quotes"])
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"OK: {pid}")


if __name__ == "__main__":
    main()
