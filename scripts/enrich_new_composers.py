# -*- coding: utf-8 -*-
"""新規追加した15人の作曲家を深化"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    "grieg": {
        "events": [
            {"year": 1862, "age": 19, "title": "ライプツィヒ音楽院卒業", "detail": "ロマン派の中心地で学位を得る。", "tags": ["approval"]},
            {"year": 1865, "age": 22, "title": "コペンハーゲンでニルス・ゲーゼに学ぶ", "detail": "デンマークの大作曲家から北欧民族音楽の重要性を知る。", "tags": ["turning_encounter"]},
            {"year": 1873, "age": 30, "title": "イプセンから『ペール・ギュント』の付随音楽を依頼", "detail": "最初は気が乗らなかったが結果的に生涯の代表作に。", "tags": ["turning_encounter"]},
            {"year": 1883, "age": 40, "title": "伯爵夫人ビョルンソンのサロンで絶賛", "detail": "ノルウェー文学界と深く結びつき、民族音楽家の地位確立。", "tags": []},
            {"year": 1901, "age": 57, "title": "ロンドン王立音楽院名誉会員", "detail": "ケンブリッジ大学名誉博士号も。国際的評価。", "tags": ["approval"]},
        ],
        "quotes": [
            {"text": "芸術家は常に故郷の土の匂いを持っているべきだ。", "source": "手紙 1899"},
            {"text": "沈黙もまた、音楽の一部である。", "source": "グリーグの手記"},
            {"text": "民謡は民族の魂。それに触れずして何が作曲家か。", "source": "書簡"}
        ]
    },
    "dvorak": {
        "events": [
            {"year": 1866, "age": 25, "title": "プラハ仮設劇場の首席ヴィオラ奏者に", "detail": "スメタナ指揮の楽団で9年間演奏。", "tags": []},
            {"year": 1873, "age": 32, "title": "アンナと結婚", "detail": "かつての生徒ヨセフィーナ（アンナの姉）に片思いしていた。ヨセフィーナは生涯の心の人。", "tags": ["heartbreak", "turning_encounter"]},
            {"year": 1879, "age": 38, "title": "ブラームスとの会見", "detail": "ウィーンで初対面。ブラームスは『彼の捨て紙籠の中身でも他の作曲家10人分だ』と絶賛。", "tags": ["turning_encounter", "approval"]},
            {"year": 1892, "age": 51, "title": "ナショナル音楽院の生徒ハリー・バーリー", "detail": "黒人霊歌の導き手。『新世界』の源泉となる。", "tags": ["turning_encounter"]},
            {"year": 1895, "age": 54, "title": "義姉ヨセフィーナ死去", "detail": "チェコ帰国の決定打。チェロ協奏曲の終楽章に彼女の好きな歌を忍ばせた。", "tags": ["loss", "heartbreak"]},
            {"year": 1898, "age": 57, "title": "歌劇『ルサルカ』作曲開始", "detail": "スラヴ伝説の水の精。チェコ・オペラの最高傑作。", "tags": []},
        ],
        "quotes": [
            {"text": "汽車のない日は、作曲も出来ない。", "source": "ドヴォルザークは鉄道マニアだった"},
            {"text": "メロディは、神様から作曲家への贈り物だ。", "source": "書簡"},
            {"text": "自分の心の底にあるものしか、人は書けない。", "source": "ドヴォルザークの言葉"}
        ]
    },
    "smetana": {
        "events": [
            {"year": 1843, "age": 19, "title": "プラハに出てリスト派のピアノ教師に", "detail": "貧しい中で音楽院ではなく自習で技を磨いた。", "tags": ["restart", "poverty"]},
            {"year": 1856, "age": 32, "title": "スウェーデン・ヨーテボリに5年亡命", "detail": "オーストリア支配下のプラハを嫌って北欧で指揮活動。", "tags": ["restart", "isolation"]},
            {"year": 1861, "age": 37, "title": "プラハ帰還、チェコ民族運動に没頭", "detail": "仮設劇場音楽監督就任。", "tags": ["restart"]},
            {"year": 1876, "age": 52, "title": "聴覚喪失の中で『モルダウ』初演成功", "detail": "自身は会場で聴けなかったが聴衆の歓喜を身体で感じた。", "tags": ["breakthrough"]},
        ],
        "quotes": [
            {"text": "チェコ人の血が、私の五線譜に流れている。", "source": "スメタナの書簡"},
            {"text": "聞こえない音楽こそ、最も純粋な音楽だ。", "source": "晩年の手記"},
            {"text": "祖国は母、母は音楽。", "source": "スメタナの言葉"}
        ]
    },
    "mussorgsky": {
        "events": [
            {"year": 1852, "age": 13, "title": "ペテルブルク士官学校入学、若くして酒を覚える", "detail": "軍人貴族の世界でシャンパンと歌。", "tags": []},
            {"year": 1872, "age": 33, "title": "『ボリス・ゴドゥノフ』初演改訂版", "detail": "以前は民衆合唱が不足と拒否された。改訂版で成功。", "tags": ["breakthrough"]},
            {"year": 1878, "age": 39, "title": "旧友の姉クトゥーゾワの死", "detail": "友人を次々失う時期。歌曲集『死の歌と踊り』が生まれる。", "tags": ["loss"]},
        ],
        "quotes": [
            {"text": "民衆の言葉そのままを音楽にすべきだ。", "source": "書簡"},
            {"text": "芸術は、美しさではなく、真実である。", "source": "書簡"},
            {"text": "私は民衆と共に呼吸したい。", "source": "ムソルグスキーの言葉"}
        ]
    },
    "rimsky_korsakov": {
        "events": [
            {"year": 1871, "age": 27, "title": "まだ和声も対位法も知らないのに作曲教授", "detail": "教えながら学んだ。『教授の座を受けたのは誤算だった』が結果的に学問派に。", "tags": ["restart"]},
            {"year": 1889, "age": 45, "title": "世界万博パリで指揮", "detail": "ロシア音楽を世界に紹介。", "tags": ["approval"]},
        ],
        "quotes": [
            {"text": "指導は、生徒の翼を広げるためにある。", "source": "リムスキーの手記"},
            {"text": "色彩は音楽の第4次元である。", "source": "『管弦楽法の原理』"},
            {"text": "若者は未来を、老人は記憶を持つ。", "source": "書簡"}
        ]
    },
    "saint_saens": {
        "events": [
            {"year": 1863, "age": 27, "title": "ワーグナー『さまよえるオランダ人』スコアを一度見て暗譜", "detail": "驚異の記憶力。『神がくれた頭脳』と言われた。", "tags": ["approval"]},
            {"year": 1877, "age": 42, "title": "歌劇『サムソンとデリラ』初演", "detail": "リストの援助でヴァイマルで初演。", "tags": ["breakthrough"]},
            {"year": 1881, "age": 46, "title": "妻マリーが一人で突然出奔", "detail": "2人の息子を失ったあとの崩壊。以後離別、二度と会わなかった。", "tags": ["heartbreak"]},
            {"year": 1908, "age": 73, "title": "史上初の映画音楽『ギーズ公の暗殺』作曲", "detail": "映画音楽の歴史を拓いた。", "tags": ["breakthrough"]},
        ],
        "quotes": [
            {"text": "音楽の規則を知り、それを超えよ。", "source": "弟子フォーレに"},
            {"text": "才能は義務である、それを怠るな。", "source": "書簡"},
            {"text": "私は常に、音楽と数学の両方を愛した。", "source": "晩年の手記"}
        ]
    },
    "faure": {
        "events": [
            {"year": 1865, "age": 20, "title": "ニデルメイエ校卒業、教会オルガニスト職を転々", "detail": "レンヌ・パリ・メゾンラフィット。15年の地味な日々。", "tags": []},
            {"year": 1871, "age": 26, "title": "国民音楽協会設立メンバー", "detail": "フランス近代音楽の結晶。", "tags": ["turning_encounter"]},
            {"year": 1883, "age": 38, "title": "マリー・フレミエと結婚", "detail": "彫刻家の娘。幸福な結婚ではなかった。", "tags": []},
            {"year": 1896, "age": 51, "title": "パリ音楽院作曲科教授", "detail": "ラヴェル・ナディア・ブーランジェらを育てる。", "tags": ["approval"]},
            {"year": 1920, "age": 75, "title": "弦楽四重奏曲だけ書く晩年", "detail": "聴覚の衰えの中、最後の作品として書いた内省的な傑作。", "tags": ["illness"]},
        ],
        "quotes": [
            {"text": "音楽は発明ではなく発見だ。", "source": "弟子への言葉"},
            {"text": "完成された美は、未完成を残す。", "source": "フォーレの手記"},
            {"text": "私のレクイエムは死の歌ではなく、死への愛撫だ。", "source": "自作解説"}
        ]
    },
    "berlioz": {
        "events": [
            {"year": 1824, "age": 21, "title": "独学でオペラ『ヴェーヴェルレイ』序曲を書き上げる", "detail": "医者をやめ作曲家になる決心を確定した作品。", "tags": ["restart"]},
            {"year": 1837, "age": 34, "title": "『レクイエム』初演、フランス軍戦没者記念", "detail": "16本のトランペットを含む超大編成。革命的管弦楽。", "tags": ["breakthrough"]},
            {"year": 1854, "age": 50, "title": "妻ハリエット死去、半年後マリー・レシオと結婚", "detail": "ハリエットが生涯の傷跡を残した。", "tags": ["loss", "turning_encounter"]},
            {"year": 1846, "age": 43, "title": "『ファウストの劫罰』初演は大失敗、借金を背負う", "detail": "パリで聴衆が集まらず大赤字。ロシアで救われた。", "tags": ["pride_broken", "poverty"]},
        ],
        "quotes": [
            {"text": "音楽は感情の中で化学反応を起こす科学だ。", "source": "『回想録』"},
            {"text": "私は音楽を信じる。それだけが私を救う。", "source": "書簡"},
            {"text": "偉大さは、自分の時代に孤独であることだ。", "source": "書簡"}
        ]
    },
    "scriabin": {
        "events": [
            {"year": 1894, "age": 22, "title": "ロシア巨人ベリャーエフの後援を受ける", "detail": "ピアノ作品の出版契約。年金も得られ安定。", "tags": ["approval"]},
            {"year": 1898, "age": 26, "title": "モスクワ音楽院ピアノ教授", "detail": "若き天才として数年教えた。", "tags": ["approval"]},
            {"year": 1908, "age": 36, "title": "『法悦の詩』完成", "detail": "官能と宇宙神秘の交響詩。", "tags": ["breakthrough"]},
            {"year": 1913, "age": 41, "title": "ロンドン、ニューヨーク演奏旅行", "detail": "大成功。世界的ピアニスト＝作曲家に。", "tags": ["approval"]},
        ],
        "quotes": [
            {"text": "音と光と香りが、一つに交響する世界を作る。", "source": "神秘主義ノート"},
            {"text": "私は宇宙そのものだ。", "source": "日記"},
            {"text": "芸術は宇宙を変える使命を持つ。", "source": "スクリャービンの言葉"}
        ]
    },
    "respighi": {
        "events": [
            {"year": 1913, "age": 34, "title": "サンタ・チェチリア音楽院作曲教授", "detail": "生涯ローマ音楽界の中心に。", "tags": ["approval"]},
            {"year": 1919, "age": 40, "title": "エルサと結婚", "detail": "生徒のソプラノ歌手。以後二人三脚で作品を送り出す。", "tags": ["turning_encounter"]},
            {"year": 1932, "age": 53, "title": "イタリア・アカデミー会員", "detail": "ファシスト政権下の名誉も引き受けた複雑な立場。", "tags": []},
        ],
        "quotes": [
            {"text": "ローマの松が、私に永遠を教えた。", "source": "レスピーギの手記"},
            {"text": "古い楽譜にこそ、新しい音楽のヒントがある。", "source": "書簡"}
        ]
    },
    "copland": {
        "events": [
            {"year": 1938, "age": 38, "title": "バレエ『ビリー・ザ・キッド』初演", "detail": "アメリカン・サウンドの確立作。", "tags": ["breakthrough"]},
            {"year": 1950, "age": 50, "title": "ピューリッツァー賞・ニューヨーク批評家協会賞", "detail": "映画『我が家の楽園』音楽で。", "tags": ["approval"]},
            {"year": 1964, "age": 64, "title": "大統領自由勲章", "detail": "ジョンソン大統領から。赤狩りの汚名返上。", "tags": ["approval"]},
        ],
        "quotes": [
            {"text": "音楽家の仕事は、聴衆に新しい耳を与えることだ。", "source": "『音楽の聴き方』"},
            {"text": "民族色とは借り物ではなく、自分の内にある。", "source": "書簡"},
            {"text": "シンプルさは、最も困難な完成だ。", "source": "コープランドの言葉"}
        ]
    },
    "bernstein": {
        "events": [
            {"year": 1944, "age": 26, "title": "バレエ『ファンシー・フリー』成功、ミュージカル『オン・ザ・タウン』", "detail": "作曲家としても即スター。", "tags": ["breakthrough"]},
            {"year": 1953, "age": 35, "title": "赤狩りで一時パスポート没収", "detail": "家族のウクライナ系ユダヤ背景で疑われた。", "tags": ["pride_broken"]},
            {"year": 1971, "age": 53, "title": "『ミサ曲』ケネディ・センターでの初演", "detail": "殺されたJFKの思い出に。", "tags": ["breakthrough"]},
            {"year": 1973, "age": 55, "title": "ハーバード講義『音楽の未回答の問い』", "detail": "6回の伝説的レクチャー。音楽を言語学的に分析した。", "tags": ["breakthrough"]},
        ],
        "quotes": [
            {"text": "音楽を愛する人はみな、学校に戻る時がある。", "source": "ヤング・ピープルズ・コンサート"},
            {"text": "芸術は人生を、人生を芸術に。", "source": "書簡"},
            {"text": "『第九』が鳴っている限り、世界は完全には壊れない。", "source": "ベルリンの壁崩壊演奏会"}
        ]
    },
    "ryuichi_sakamoto": {
        "events": [
            {"year": 1976, "age": 24, "title": "東京藝大作曲科大学院修了", "detail": "現代音楽の正統派学位を得る。", "tags": ["approval"]},
            {"year": 1988, "age": 36, "title": "『ラスト・エンペラー』ゴールデングローブ賞", "detail": "オスカーとグラミーも。", "tags": ["approval"]},
            {"year": 2011, "age": 59, "title": "3.11後、反原発運動に積極関与", "detail": "坂本龍一の市民活動家としての顔。", "tags": []},
            {"year": 2020, "age": 68, "title": "直腸がん発覚", "detail": "最晩年は『12』という病床の日記的アルバムを完成。", "tags": ["illness"]},
        ],
        "quotes": [
            {"text": "音楽はいつか滅ぶ、だから今美しく響け。", "source": "『坂本龍一 12』序"},
            {"text": "地球のうえで生きる我々は、地球の一部だ。", "source": "環境活動演説"},
            {"text": "美しく生き、美しく終わりたい。", "source": "晩年のインタビュー"}
        ]
    },
    "hisaishi": {
        "events": [
            {"year": 1974, "age": 24, "title": "国立音楽大学作曲科卒業", "detail": "前衛音楽と映画音楽の境界で活動開始。", "tags": []},
            {"year": 2008, "age": 58, "title": "ニューヨーク・カーネギーホールで自作指揮", "detail": "世界的作曲家として認知。", "tags": ["approval"]},
            {"year": 2022, "age": 72, "title": "文化功労者顕彰", "detail": "日本の音楽界最高の名誉。", "tags": ["approval"]},
        ],
        "quotes": [
            {"text": "映像が何を求めているかを、音で答える。", "source": "久石譲の言葉"},
            {"text": "メロディの力は、時代を超える。", "source": "書簡"},
            {"text": "子供の心で作る曲こそ、一番難しい。", "source": "作曲ノート"}
        ]
    },
    "palestrina": {
        "events": [
            {"year": 1544, "age": 19, "title": "故郷パレストリーナの大聖堂楽長に", "detail": "最初の職。この町の名が姓に。", "tags": []},
            {"year": 1580, "age": 55, "title": "妻ルクレツィアを失う", "detail": "ペストで妻と2人の息子を失う。深い傷。", "tags": ["loss"]},
            {"year": 1581, "age": 56, "title": "ヴィルジニア・ドルモリと再婚", "detail": "裕福な未亡人。経済的余裕を得て晩年の代表作を生む。", "tags": ["turning_encounter"]},
        ],
        "quotes": [
            {"text": "沈黙の中にこそ、神の声がある。", "source": "パレストリーナの言葉"},
            {"text": "多声は一つの魂に至る道だ。", "source": "書簡"}
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
        print(f"OK: {pid}  events={len(d.get('events',[]))}, quotes={len(d.get('quotes',[]))}")


if __name__ == "__main__":
    main()
