# -*- coding: utf-8 -*-
"""哲学者・作家・科学者等にYouTube解説動画を works として追加"""
import json, pathlib, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"


def ytsearch(q):
    return f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}"


# person_id -> list of works to add
# 優先してYouTubeでよく解説されるテーマを選ぶ
WORKS = {
    "socrates": [
        {"title": "ソクラテスの弁明 解説", "year": -399, "type": "講義・解説",
         "description": "ソクラテスの死刑裁判を描いたプラトンの記録。"},
        {"title": "無知の知", "year": -425, "type": "思想",
         "description": "「知らないことを知っている」という哲学の出発点。"},
    ],
    "plato": [
        {"title": "イデア論 解説", "year": -380, "type": "思想",
         "description": "プラトンの中心思想。現実の奥にある永遠の形相。"},
        {"title": "洞窟の比喩", "year": -375, "type": "思想",
         "description": "『国家』第7巻の有名な比喩。"},
        {"title": "国家論", "year": -375, "type": "著作",
         "description": "哲人王、魂の三分説、理想国家。"},
    ],
    "aristotle": [
        {"title": "ニコマコス倫理学 解説", "year": -340, "type": "著作",
         "description": "幸福論と徳倫理の古典。中庸の思想。"},
        {"title": "形而上学", "year": -340, "type": "著作",
         "description": "『存在とは何か』を問う西洋哲学の出発点。"},
    ],
    "descartes": [
        {"title": "我思う、ゆえに我あり 解説", "year": 1637, "type": "思想",
         "description": "『方法序説』の有名な命題を分かりやすく。"},
        {"title": "方法序説", "year": 1637, "type": "著作",
         "description": "近代哲学の出発点。"},
    ],
    "spinoza": [
        {"title": "エチカ 解説", "year": 1677, "type": "著作",
         "description": "幾何学的秩序で書かれた神と自由の哲学。"},
        {"title": "汎神論とは何か", "year": 1670, "type": "思想",
         "description": "神即自然。スピノザの中心思想。"},
    ],
    "kant": [
        {"title": "純粋理性批判 解説", "year": 1781, "type": "著作",
         "description": "コペルニクス的転回。認識論の金字塔。"},
        {"title": "定言命法とは", "year": 1785, "type": "思想",
         "description": "カント倫理学の核心。"},
    ],
    "hegel": [
        {"title": "弁証法 解説", "year": 1807, "type": "思想",
         "description": "正・反・合。世界を動かす論理。"},
        {"title": "精神現象学", "year": 1807, "type": "著作",
         "description": "意識の冒険を描いた大著。"},
    ],
    "schopenhauer": [
        {"title": "意志と表象としての世界 解説", "year": 1819, "type": "著作",
         "description": "世界は表象である、という宣言。"},
        {"title": "ショーペンハウアーの幸福論", "year": 1851, "type": "著作",
         "description": "『余録と補遺』のエッセイ。"},
    ],
    "kierkegaard": [
        {"title": "死に至る病 解説", "year": 1849, "type": "著作",
         "description": "絶望を『死に至る病』として分析した実存主義の先駆。"},
        {"title": "実存主義とは", "year": 1843, "type": "思想",
         "description": "キルケゴールが投げかけた根本問題。"},
    ],
    "nietzsche": [
        {"title": "ツァラトゥストラはこう言った 解説", "year": 1885, "type": "著作",
         "description": "超人思想と永劫回帰。"},
        {"title": "神は死んだ とはどういう意味か", "year": 1882, "type": "思想",
         "description": "ニーチェ最も誤解される命題を正しく理解する。"},
    ],
    "marx": [
        {"title": "資本論 解説", "year": 1867, "type": "著作",
         "description": "資本主義の運動法則を暴いた大著。"},
        {"title": "共産党宣言", "year": 1848, "type": "著作",
         "description": "『万国の労働者よ団結せよ』の40ページの小冊子。"},
    ],
    "wittgenstein": [
        {"title": "論理哲学論考 解説", "year": 1921, "type": "著作",
         "description": "『語り得ぬものについては沈黙せねばならない』。"},
        {"title": "言語ゲーム", "year": 1953, "type": "思想",
         "description": "後期ウィトゲンシュタインの重要概念。"},
    ],
    "heidegger": [
        {"title": "存在と時間 解説", "year": 1927, "type": "著作",
         "description": "20世紀最大の哲学書。死への先駆。"},
    ],
    "sartre": [
        {"title": "実存は本質に先立つ とは", "year": 1945, "type": "思想",
         "description": "サルトル実存主義の中心命題。"},
        {"title": "存在と無 解説", "year": 1943, "type": "著作",
         "description": "占領下パリで書かれた実存主義の聖典。"},
    ],
    "camus": [
        {"title": "シーシュポスの神話 解説", "year": 1942, "type": "著作",
         "description": "不条理の哲学。『山頂を目指す闘争が人間の心を満たす』。"},
        {"title": "異邦人", "year": 1942, "type": "著作",
         "description": "『ママンが死んだ』不条理文学の金字塔。"},
    ],
    "foucault": [
        {"title": "監獄の誕生 解説", "year": 1975, "type": "著作",
         "description": "パノプティコンと規律権力の分析。"},
        {"title": "権力とは何か（フーコー）", "year": 1976, "type": "思想",
         "description": "権力は常に下から来る。"},
    ],
    "kant_hannah": [
        {"title": "悪の陳腐さ とは", "year": 1963, "type": "思想",
         "description": "アイヒマン裁判から生まれた概念。"},
        {"title": "全体主義の起原 解説", "year": 1951, "type": "著作",
         "description": "ナチズムとスターリニズムの分析。"},
    ],
    "beauvoir": [
        {"title": "第二の性 解説", "year": 1949, "type": "著作",
         "description": "『人は女に生まれるのではない、女になるのだ』。"},
    ],
    "rousseau": [
        {"title": "社会契約論 解説", "year": 1762, "type": "著作",
         "description": "『人間は自由なものとして生まれた』フランス革命の下地。"},
        {"title": "エミール", "year": 1762, "type": "著作",
         "description": "教育論の古典。"},
    ],
    "confucius": [
        {"title": "論語 解説", "year": -500, "type": "著作",
         "description": "『子曰く』で始まる東アジア2500年の倫理書。"},
    ],
    "laozi": [
        {"title": "道徳経 解説", "year": -500, "type": "著作",
         "description": "わずか五千字で東洋思想の半分を作った書。"},
    ],
    "buddha": [
        {"title": "仏教の教え 解説", "year": -528, "type": "思想",
         "description": "四諦・八正道・中道を分かりやすく。"},
    ],
    "nishida": [
        {"title": "善の研究 解説", "year": 1911, "type": "著作",
         "description": "日本初の本格的哲学書。純粋経験の哲学。"},
    ],
    # 科学者
    "einstein": [
        {"title": "相対性理論 解説", "year": 1905, "type": "理論",
         "description": "特殊相対論と一般相対論をやさしく。"},
        {"title": "E=mc² の意味", "year": 1905, "type": "理論",
         "description": "質量とエネルギーの等価性。"},
    ],
    "newton": [
        {"title": "万有引力の法則 解説", "year": 1687, "type": "理論",
         "description": "『プリンキピア』の核心。"},
        {"title": "ニュートン運動の3法則", "year": 1687, "type": "理論",
         "description": "近代物理学の出発点。"},
    ],
    "darwin": [
        {"title": "種の起源 解説", "year": 1859, "type": "著作",
         "description": "自然選択による進化論。"},
        {"title": "進化論とは", "year": 1859, "type": "理論",
         "description": "生物学の基礎。"},
    ],
    "turing": [
        {"title": "チューリングマシン 解説", "year": 1936, "type": "理論",
         "description": "計算可能性の数学的定義。"},
        {"title": "チューリング・テスト", "year": 1950, "type": "理論",
         "description": "機械は考えられるか？AIの原点。"},
    ],
    "freud": [
        {"title": "精神分析とは", "year": 1900, "type": "理論",
         "description": "無意識・エス・自我・超自我。"},
        {"title": "夢判断 解説", "year": 1900, "type": "著作",
         "description": "『夢は無意識への王道である』。"},
    ],
    "curie": [
        {"title": "ラジウムの発見", "year": 1898, "type": "発見",
         "description": "キュリー夫妻の放射能研究。"},
    ],
    "yukawa_hideki": [
        {"title": "中間子論 解説", "year": 1935, "type": "理論",
         "description": "湯川秀樹のノーベル賞受賞研究。"},
    ],
    # 作家
    "dostoevsky": [
        {"title": "カラマーゾフの兄弟 解説", "year": 1880, "type": "小説",
         "description": "生涯の総決算。父殺しをめぐる3兄弟。"},
        {"title": "罪と罰 解説", "year": 1866, "type": "小説",
         "description": "貧しい学生ラスコーリニコフの犯罪と魂。"},
    ],
    "tolstoy": [
        {"title": "戦争と平和 解説", "year": 1869, "type": "小説",
         "description": "1500ページの叙事詩。"},
        {"title": "アンナ・カレーニナ 解説", "year": 1877, "type": "小説",
         "description": "『全ての幸福な家庭は…』。"},
    ],
    "kafka": [
        {"title": "変身 解説", "year": 1915, "type": "小説",
         "description": "毒虫になった男の物語。"},
        {"title": "城 解説", "year": 1926, "type": "小説",
         "description": "辿り着けない城。"},
    ],
    "hemingway": [
        {"title": "老人と海 解説", "year": 1952, "type": "小説",
         "description": "『人間は負けるためにつくられてはいない』。"},
    ],
    "soseki": [
        {"title": "こころ 解説", "year": 1914, "type": "小説",
         "description": "『精神的に向上心のないものは馬鹿だ』。"},
        {"title": "吾輩は猫である 解説", "year": 1905, "type": "小説",
         "description": "漱石のデビュー作。"},
    ],
    "dazai_osamu": [
        {"title": "人間失格 解説", "year": 1948, "type": "小説",
         "description": "『恥の多い生涯を送って来ました』絶筆の告白。"},
        {"title": "走れメロス 解説", "year": 1940, "type": "小説",
         "description": "最も愛される友情の物語。"},
    ],
    "akutagawa": [
        {"title": "羅生門 解説", "year": 1915, "type": "小説",
         "description": "芥川のデビュー作。黒澤明『羅生門』の原作。"},
    ],
    "miyazawa_kenji": [
        {"title": "銀河鉄道の夜 解説", "year": 1934, "type": "小説",
         "description": "未完の童話。『本当のさいはひ』を問う。"},
        {"title": "雨ニモマケズ 解説", "year": 1931, "type": "詩",
         "description": "手帳に書かれた遺作。"},
    ],
    "kawabata": [
        {"title": "雪国 解説", "year": 1948, "type": "小説",
         "description": "『国境の長いトンネル』から始まる。"},
    ],
    "mishima_yukio": [
        {"title": "金閣寺 解説", "year": 1956, "type": "小説",
         "description": "放火僧の内面。"},
    ],
    "murasaki": [
        {"title": "源氏物語 解説", "year": 1010, "type": "物語",
         "description": "世界最古の本格的長編小説。"},
    ],
    "basho": [
        {"title": "奥の細道 解説", "year": 1689, "type": "紀行",
         "description": "『月日は百代の過客にして』150日の旅。"},
    ],
    # 歴史人物
    "oda_nobunaga": [
        {"title": "桶狭間の戦い 解説", "year": 1560, "type": "戦",
         "description": "2万の今川義元を奇襲で討った伝説の戦い。"},
        {"title": "本能寺の変 なぜ起きたか", "year": 1582, "type": "事件",
         "description": "明智光秀の謀反の謎。"},
    ],
    "toyotomi_hideyoshi": [
        {"title": "太閤記", "year": 1585, "type": "歴史",
         "description": "百姓から天下人への物語。"},
    ],
    "tokugawa_ieyasu": [
        {"title": "関ヶ原の戦い 解説", "year": 1600, "type": "戦",
         "description": "天下分け目の戦い。"},
    ],
    "sakamoto_ryoma": [
        {"title": "坂本龍馬とは", "year": 1867, "type": "歴史",
         "description": "薩長同盟・大政奉還を成し遂げた男。"},
    ],
    # 画家
    "leonardo": [
        {"title": "モナ・リザの謎 解説", "year": 1503, "type": "絵画",
         "description": "500年続く微笑の秘密。"},
        {"title": "最後の晩餐 解説", "year": 1495, "type": "絵画",
         "description": "12使徒の瞬間を捉えた壁画。"},
    ],
    "van_gogh": [
        {"title": "ゴッホ ひまわり 解説", "year": 1888, "type": "絵画",
         "description": "アルル時代の代表作。"},
        {"title": "星月夜 解説", "year": 1889, "type": "絵画",
         "description": "サン=レミ療養院で描かれた傑作。"},
    ],
    "picasso": [
        {"title": "ゲルニカ 解説", "year": 1937, "type": "絵画",
         "description": "ナチス空爆への怒りを描いた20世紀美術の象徴。"},
    ],
    "monet": [
        {"title": "睡蓮 解説", "year": 1900, "type": "絵画",
         "description": "ジヴェルニーの庭で描き続けた大装飾画。"},
    ],
    "hokusai": [
        {"title": "神奈川沖浪裏 解説", "year": 1831, "type": "浮世絵",
         "description": "富嶽三十六景で最も有名な一枚。"},
    ],
    # 思想家
    "gandhi": [
        {"title": "ガンジーの非暴力思想", "year": 1930, "type": "思想",
         "description": "サティヤーグラハ、塩の行進。"},
    ],
    "mother_teresa": [
        {"title": "マザー・テレサの人生 解説", "year": 1950, "type": "活動",
         "description": "『神の愛の宣教者会』と貧者への奉仕。"},
    ],
    "anne_frank": [
        {"title": "アンネの日記 解説", "year": 1944, "type": "日記",
         "description": "隠れ家で書かれた不滅の記録。"},
    ],
    "chaplin": [
        {"title": "モダン・タイムス 解説", "year": 1936, "type": "映画",
         "description": "機械文明批判の不朽の喜劇。"},
        {"title": "独裁者 ラスト演説", "year": 1940, "type": "映画",
         "description": "6分間の不滅のスピーチ。"},
    ],
}


def main():
    updated = 0
    total_added = 0
    for pid, items in WORKS.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        works = d.get("works") or []
        existing_titles = set(w.get("title") for w in works)
        composer = d.get("name", "")
        added = 0
        for w in items:
            if w["title"] in existing_titles:
                continue
            # YouTube検索URLを付与
            w["youtubeSearchUrl"] = ytsearch(f"{composer} {w['title']}")
            works.append(w)
            added += 1
        if added:
            d["works"] = works
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            updated += 1
            total_added += added
            print(f"OK: {pid} +{added}")
    print(f"\n{updated}人に計 {total_added}件 のYouTube解説作品を追加")


if __name__ == "__main__":
    main()
