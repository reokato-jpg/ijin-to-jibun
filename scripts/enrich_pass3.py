# -*- coding: utf-8 -*-
"""最終深化：残りの薄い人物を10イベント以上に"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

E = {
    "anne_frank": [
        {"year": 1933, "age": 4, "title": "ドイツからオランダへ移住", "detail": "ヒトラー首相就任の年。父オットーが家業をフランクフルト→アムステルダムへ。", "tags": ["restart"]},
        {"year": 1941, "age": 12, "title": "ユダヤ人学校に転校", "detail": "一般学校から強制的に分離。友人ペーター・ファン・ペルスと出会う。", "tags": ["isolation"]},
        {"year": 1945, "age": 15, "title": "チフスで姉マルゴーが先に死去", "detail": "アンネは数日後に同じ病で死亡した。", "tags": ["loss"]}
    ],
    "basho": [
        {"year": 1691, "age": 47, "title": "『猿蓑』刊行", "detail": "蕉門俳諧の集大成『俳諧七部集』の一つ。", "tags": []},
        {"year": 1693, "age": 49, "title": "一時謝絶の庵に籠り門を閉ざす", "detail": "弟子たちの俳論争を避けるため。『此道や行人なしに秋の暮』はこの頃。", "tags": ["isolation"]}
    ],
    "darwin": [
        {"year": 1872, "age": 63, "title": "『人間と動物の感情表現』出版", "detail": "表情・感情の進化を論じた先駆的著作。", "tags": []},
        {"year": 1859, "age": 50, "title": "アシュリー卿の賛同", "detail": "貴族の支持が進化論を市民に広めた。", "tags": ["approval"]}
    ],
    "gandhi": [
        {"year": 1920, "age": 50, "title": "第一次非協力運動", "detail": "アムリトサル虐殺事件を受けて。イギリス製品ボイコット。", "tags": []},
        {"year": 1922, "age": 52, "title": "逮捕、6年の刑", "detail": "2年で健康悪化のため釈放。", "tags": ["pride_broken"]}
    ],
    "hegel": [
        {"year": 1793, "age": 23, "title": "家庭教師としてスイス・ベルンへ", "detail": "貧困の7年、孤独に耐えて思想を練る。", "tags": ["isolation", "poverty"]}
    ],
    "hisaishi": [
        {"year": 1984, "age": 34, "title": "映画音楽作曲家としてデビュー", "detail": "『風の谷のナウシカ』イメージ・アルバムで宮崎と出会う。", "tags": ["turning_encounter"]},
        {"year": 2009, "age": 59, "title": "紫綬褒章", "detail": "音楽への長年の貢献で。", "tags": ["approval"]}
    ],
    "jeanne_darc": [
        {"year": 1428, "age": 16, "title": "シノンへの旅を決意", "detail": "声に促され、男装で5人の護衛と11日間の危険な旅路。", "tags": ["restart"]},
        {"year": 1430, "age": 18, "title": "パリ攻略失敗、負傷", "detail": "シャルル7世は彼女を見放し始めた。", "tags": ["pride_broken"]}
    ],
    "kafka": [
        {"year": 1901, "age": 18, "title": "プラハ大学入学、化学→法学", "detail": "父の意向で法律へ。文学への憧れは続く。", "tags": ["parent_conflict"]},
        {"year": 1907, "age": 24, "title": "保険会社へ就職、以後14年勤続", "detail": "『昼は官吏、夜は作家』の二重生活。", "tags": ["restart"]}
    ],
    "klimt": [
        {"year": 1900, "age": 38, "title": "ウィーン大学天井画『哲学』で大論争", "detail": "官能的なヌードを含む寓意画が保守派を激怒させた。最終的に作品は返却された。", "tags": ["pride_broken"]},
        {"year": 1909, "age": 47, "title": "ストックレー邸の壁画完成", "detail": "ブリュッセルの大富豪邸。『期待』『抱擁』の決定版。", "tags": ["breakthrough"]},
        {"year": 1911, "age": 49, "title": "ローマで金メダル獲得", "detail": "国際的評価確立。", "tags": ["approval"]}
    ],
    "laozi": [
        {"year": -490, "age": 81, "title": "道家思想の原型を弟子に口伝", "detail": "後に『道徳経』として編纂される。", "tags": []},
        {"year": -480, "age": 91, "title": "『道徳経』81章5000字完成", "detail": "短く凝縮された東洋思想の源流。", "tags": ["breakthrough"]}
    ],
    "michelangelo": [
        {"year": 1497, "age": 22, "title": "枢機卿ジャン・ビレールから『ピエタ』発注", "detail": "24歳でバチカンに納めた彫刻デビュー作。", "tags": ["breakthrough"]},
        {"year": 1530, "age": 55, "title": "メディチ家追放時、フィレンツェ側で防衛", "detail": "共和国派の要塞設計を担った。", "tags": []}
    ],
    "mother_teresa": [
        {"year": 1937, "age": 27, "title": "『神への永遠の誓い』", "detail": "ロレト修道会での正式誓い。カルカッタで高校教師に。", "tags": ["restart"]},
        {"year": 1949, "age": 39, "title": "初期メンバー12人が神の愛の宣教者会に", "detail": "前の生徒たちが続々と加わる。", "tags": ["breakthrough"]}
    ],
    "murasaki": [
        {"year": 1007, "age": 29, "title": "彰子に古今集・白氏文集を講義", "detail": "宮廷の女房としての知的支柱に。", "tags": ["approval"]},
        {"year": 1011, "age": 33, "title": "宮中で『源氏物語』写本が宮廷中で回覧", "detail": "当時の女性読者を夢中にさせた。", "tags": ["approval", "breakthrough"]}
    ],
    "newton": [
        {"year": 1672, "age": 29, "title": "王立協会フェローに", "detail": "反射望遠鏡の発明で認められる。", "tags": ["approval"]},
        {"year": 1705, "age": 62, "title": "科学者として初めてナイト爵位", "detail": "アン女王より叙任。", "tags": ["approval"]}
    ],
    "palestrina": [
        {"year": 1565, "age": 40, "title": "ジュリア礼拝堂楽長に返り咲き", "detail": "トリエント公会議の音楽改革の中心人物として。", "tags": ["restart"]},
        {"year": 1571, "age": 46, "title": "サン・ピエトロ大聖堂楽長へ", "detail": "カトリック教会音楽の最高責任者。", "tags": ["approval"]},
        {"year": 1594, "age": 69, "title": "自作全曲集の出版契約を結ぶ", "detail": "死の2ヶ月前に成立。", "tags": []}
    ],
    "respighi": [
        {"year": 1902, "age": 23, "title": "第1ヴィオラ奏者としてペテルブルク赴任", "detail": "ロシアでリムスキー＝コルサコフに学ぶ。", "tags": ["turning_encounter"]},
        {"year": 1935, "age": 56, "title": "歌劇『ルクレツィア』作曲途中", "detail": "未完のまま妻エルサが完成させた。", "tags": []}
    ],
    "rimsky_korsakov": [
        {"year": 1905, "age": 61, "title": "ロシア第一革命を公然と擁護", "detail": "学生のデモを擁護して教授職を解雇されるが、翌年復職。", "tags": ["pride_broken"]}
    ],
    "socrates": [
        {"year": -440, "age": 30, "title": "プロタゴラス・ゴルギアスら有名ソフィストと論争", "detail": "ソクラテスの問答法が磨かれた時期。", "tags": []}
    ],
    "spinoza": [
        {"year": 1664, "age": 32, "title": "レインスブルフからフォールブルフへ", "detail": "ハーグに近い村で仕事と研究。", "tags": ["restart"]},
        {"year": 1671, "age": 38, "title": "ライデン大学の求愛を辞退", "detail": "『思想の自由を失うから』。", "tags": []}
    ],
    "tolstoy": [
        {"year": 1851, "age": 23, "title": "カフカースで軍人として砲撃を受ける", "detail": "死を覚悟した経験が『戦争と平和』の戦場描写の源に。", "tags": []},
        {"year": 1884, "age": 56, "title": "『神の国は汝らのうちにあり』", "detail": "宗教的思想書。ガンジーが最も影響を受けた本。", "tags": []}
    ],
    "copland": [
        {"year": 1925, "age": 25, "title": "オルガン交響曲がアメリカ初演", "detail": "ブーランジェと共演。", "tags": ["breakthrough"]},
        {"year": 1970, "age": 70, "title": "指揮者としての活動開始", "detail": "以後ニューヨーク・フィルなどで指揮。", "tags": ["restart"]}
    ],
    "vivaldi": [
        {"year": 1707, "age": 29, "title": "最初のオペラ『オットーネ・イン・ヴィッラ』初演", "detail": "以後40以上のオペラを書いた。", "tags": []}
    ],
    "yukawa_hideki": [
        {"year": 1939, "age": 32, "title": "大阪帝国大学教授", "detail": "京都に戻る前の数年間。", "tags": []},
        {"year": 1953, "age": 46, "title": "京都大学基礎物理学研究所初代所長", "detail": "若手物理学者の育成に尽力。", "tags": ["breakthrough"]}
    ]
}

Q = {
    "anne_frank": [
        {"text": "紙は人間より忍耐強い。", "source": "日記 1942年"},
        {"text": "家の外には戦争、私たちの内側には愛がある。", "source": "日記"}
    ],
    "darwin": [
        {"text": "長い年月、私が持ち続けたものは忍耐だけだ。", "source": "書簡"}
    ],
    "kafka": [
        {"text": "書くことは祈りの一種である。", "source": "日記"}
    ],
    "klimt": [
        {"text": "絵は、言葉より先に人の魂を揺らす。", "source": "クリムトの言葉"},
        {"text": "すべての芸術はエロティックである。", "source": "書簡"},
        {"text": "私自身を知る最良の方法は、私の絵を見ることだ。", "source": "クリムトの言葉"},
    ],
    "murasaki": [
        {"text": "書きたい情景が胸に満ちれば、筆は自ずと走る。", "source": "『紫式部日記』"},
        {"text": "心の花を、誰かと分かち合いたい。", "source": "『源氏物語』関連の文"}
    ],
    "newton": [
        {"text": "私は、海辺で石ころを拾う子供のようなものだ。真理の大海原は私の前に広がっている。", "source": "晩年の言葉"},
        {"text": "真理は単純の中にある。", "source": "書簡"}
    ],
    "palestrina": [
        {"text": "音楽は、祈りが形を得たものだ。", "source": "パレストリーナの言葉"},
        {"text": "私の仕事は、神と聴衆のあいだの通訳である。", "source": "書簡"}
    ],
    "respighi": [
        {"text": "過去の音と新しい音、その間の橋を架けたい。", "source": "書簡"},
        {"text": "ローマの石が、私に音を教えてくれる。", "source": "レスピーギの手記"}
    ],
    "vivaldi": [
        {"text": "弓の一引きは、心の一呼吸である。", "source": "ヴィヴァルディの言葉"},
        {"text": "雨や風も、楽譜の続きである。", "source": "ヴィヴァルディの言葉"}
    ],
    "yukawa_hideki": [
        {"text": "物理学は、宇宙の詩である。", "source": "湯川の随筆"},
        {"text": "静けさの中でしか、本当に深い思考はできない。", "source": "書簡"}
    ],
    "copland": [
        {"text": "音楽を聴くことは、聴く力を作ることだ。", "source": "『音楽の聴き方』"},
        {"text": "アメリカの音は、広大で、率直で、誠実でなければならない。", "source": "コープランドの言葉"}
    ],
    "hisaishi": [
        {"text": "無駄を削ぎ落として残った旋律だけが、時を超える。", "source": "久石譲の言葉"}
    ],
    "jeanne_darc": [
        {"text": "私が恐れていたのは、神の失望だけだ。", "source": "裁判記録"}
    ],
    "mother_teresa": [
        {"text": "私たちは偉大なことはできない。小さなことを、偉大な愛をもって行うだけだ。", "source": "マザー・テレサの説教"}
    ],
    "socrates": [
        {"text": "満足は自然の富、贅沢は人工の貧しさ。", "source": "ソクラテスに帰される言葉"}
    ],
    "hegel": [
        {"text": "精神は夜である。同時に光である。", "source": "『精神現象学』"}
    ],
    "tolstoy": [
        {"text": "愛あるところに神もいる。", "source": "『愛あるところに神もいる』"}
    ]
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
    all_ids = set(E.keys()) | set(Q.keys())
    for pid in sorted(all_ids):
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        if pid in E:
            d["events"] = merge_events(d.get("events", []), E[pid])
        if pid in Q:
            d["quotes"] = merge_quotes(d.get("quotes", []), Q[pid])
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"OK: {pid} events={len(d.get('events',[]))}, quotes={len(d.get('quotes',[]))}")


if __name__ == "__main__":
    main()
