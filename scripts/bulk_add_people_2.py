# -*- coding: utf-8 -*-
"""第2弾：哲学者・作曲家をさらに追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"
MANIFEST = ROOT / "data" / "manifest.json"

PEOPLE_DATA = [
    # ============ 哲学者 ============
    {
        "id": "hegel", "name": "ゲオルク・ヘーゲル", "nameEn": "Georg Wilhelm Friedrich Hegel",
        "birth": 1770, "death": 1831, "country": "ドイツ", "field": "哲学者",
        "summary": "ドイツ観念論の完成者。歴史を『絶対精神が自己を実現していく弁証法の運動』と捉え、正・反・合の論理で世界を説明した。難解だがマルクスやサルトルを生んだ源流。",
        "events": [
            {"year": 1770, "age": 0, "title": "シュトゥットガルトに誕生", "detail": "官吏の家に生まれる。ベートーヴェンと同い年。", "tags": []},
            {"year": 1806, "age": 36, "title": "イェーナでナポレオンを見る", "detail": "『馬上の世界精神を見た』と書簡に記す。『精神現象学』を完成。", "tags": ["breakthrough", "turning_encounter"]},
            {"year": 1818, "age": 48, "title": "ベルリン大学教授", "detail": "ドイツ哲学界の頂点へ。教室は熱狂した。", "tags": ["approval"]},
            {"year": 1831, "age": 61, "title": "コレラで急死", "detail": "最後の言葉は『俺を理解したのはひとりだけ、しかもそいつも誤解していた』と伝わる。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "理性的なものは現実的であり、現実的なものは理性的である。", "source": "『法の哲学』序文"},
            {"text": "ミネルヴァのふくろうは、たそがれに飛び立つ。", "source": "『法の哲学』序文"}
        ],
        "relations": [
            {"name": "カント", "id": "kant", "relation": "先行者", "note": "批判哲学の限界を乗り越えようとした"},
            {"name": "マルクス", "id": "marx", "relation": "批判的継承者", "note": "弁証法を唯物論に書き換えた"}
        ],
        "places": [
            {"name": "ベルリン・ドロテーエン墓地", "location": "ドイツ・ベルリン", "note": "フィヒテの隣に眠る"}
        ],
        "books": [
            {"title": "精神現象学 上", "author": "ヘーゲル", "asin": "4582761666", "description": "意識が絶対知に到るまでの壮大な旅"}
        ]
    },
    {
        "id": "marx", "name": "カール・マルクス", "nameEn": "Karl Marx",
        "birth": 1818, "death": 1883, "country": "ドイツ", "field": "哲学者・経済学者",
        "summary": "『資本論』で資本主義の運動法則を暴き、20世紀の世界を二分した革命思想の生みの親。亡命と貧困の生涯、大英博物館の席で思索し続けた。",
        "events": [
            {"year": 1818, "age": 0, "title": "トリーアにユダヤ系弁護士の子として誕生", "detail": "父は改宗プロテスタント。", "tags": []},
            {"year": 1848, "age": 30, "title": "『共産党宣言』刊行", "detail": "『万国の労働者よ、団結せよ』エンゲルスと共著。", "tags": ["breakthrough"]},
            {"year": 1849, "age": 31, "title": "ロンドンへ亡命", "detail": "以後生涯イギリスで過ごす。貧困と子の死に苦しむ。", "tags": ["isolation", "restart"]},
            {"year": 1867, "age": 49, "title": "『資本論』第1巻刊行", "detail": "大英博物館で20年読み続けた集大成。", "tags": ["breakthrough"]},
            {"year": 1883, "age": 64, "title": "ロンドンで没", "detail": "妻の死の2年後、書斎の椅子で息を引き取った。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "哲学者たちは世界をさまざまに解釈してきたにすぎない。大切なのは、それを変えることである。", "source": "フォイエルバッハに関するテーゼ"},
            {"text": "万国の労働者よ、団結せよ！", "source": "『共産党宣言』"}
        ],
        "relations": [
            {"name": "エンゲルス", "relation": "盟友・後援者", "note": "マルクス一家を経済的に支え続けた生涯の友"},
            {"name": "ヘーゲル", "id": "hegel", "relation": "思想的祖", "note": "弁証法を唯物論的に逆立ちさせた"}
        ],
        "places": [
            {"name": "大英博物館閲覧室", "location": "イギリス・ロンドン", "note": "『資本論』を書いた場所"},
            {"name": "ハイゲート墓地", "location": "イギリス・ロンドン", "note": "マルクスの巨大な胸像がある墓"}
        ],
        "books": [
            {"title": "共産党宣言", "author": "マルクス・エンゲルス", "asin": "4003412583", "description": "世界を揺るがした40ページの小冊子"}
        ]
    },
    {
        "id": "heidegger", "name": "マルティン・ハイデガー", "nameEn": "Martin Heidegger",
        "birth": 1889, "death": 1976, "country": "ドイツ", "field": "哲学者",
        "summary": "『存在と時間』で20世紀哲学を塗り替えた実存の思想家。死への先駆、本来性、世界内存在。ナチス加担の暗い影を負ったまま、黒い森で沈黙の哲学を続けた。",
        "events": [
            {"year": 1889, "age": 0, "title": "メスキルヒの樽職人の子に", "detail": "カトリックの片田舎で育つ。", "tags": []},
            {"year": 1927, "age": 38, "title": "『存在と時間』刊行", "detail": "フッサールに捧げられた20世紀最大の哲学書。", "tags": ["breakthrough"]},
            {"year": 1933, "age": 44, "title": "フライブルク大学総長就任、ナチス入党", "detail": "生涯消えない汚点。翌年辞任。", "tags": ["pride_broken"]},
            {"year": 1976, "age": 86, "title": "故郷メスキルヒで没", "detail": "晩年は黒い森の山小屋で思索し続けた。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "言葉は存在の家である。", "source": "『ヒューマニズムについて』"},
            {"text": "死への先駆的決意。", "source": "『存在と時間』"}
        ],
        "relations": [
            {"name": "ハンナ・アーレント", "id": "kant_hannah", "relation": "弟子・恋人", "note": "18歳のユダヤ人学生と35歳の師の禁断の関係"},
            {"name": "サルトル", "id": "sartre", "relation": "思想的影響を与えた相手", "note": "実存主義の直接の源流"}
        ],
        "places": [
            {"name": "トートナウベルクの山小屋", "location": "ドイツ・黒い森", "note": "ハイデガーが生涯思索した山荘"}
        ],
        "books": [
            {"title": "存在と時間 上", "author": "ハイデガー", "asin": "4480089454", "description": "存在の意味を問う20世紀哲学の金字塔"}
        ]
    },
    {
        "id": "camus", "name": "アルベール・カミュ", "nameEn": "Albert Camus",
        "birth": 1913, "death": 1960, "country": "アルジェリア・フランス",
        "field": "作家・哲学者",
        "summary": "『異邦人』『ペスト』『シーシュポスの神話』。不条理の中でなお反抗し続けよと説いた作家。44歳でノーベル賞、46歳で自動車事故死。",
        "events": [
            {"year": 1913, "age": 0, "title": "仏領アルジェリアの貧民街に誕生", "detail": "父は翌年第一次大戦で戦死。母は聾唖の清掃婦。", "tags": ["parent_conflict", "poverty"]},
            {"year": 1942, "age": 29, "title": "『異邦人』『シーシュポスの神話』刊行", "detail": "『ママンが死んだ。昨日だったか、今日だったかわからない。』", "tags": ["breakthrough"]},
            {"year": 1957, "age": 44, "title": "ノーベル文学賞受賞", "detail": "史上2番目に若い受賞者。", "tags": ["approval"]},
            {"year": 1960, "age": 46, "title": "自動車事故で即死", "detail": "ポケットに使われなかった汽車の切符があった。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "シーシュポスが幸福であると想像しなくてはならない。", "source": "『シーシュポスの神話』"},
            {"text": "真に重大な哲学上の問題はひとつしかない。自殺ということである。", "source": "『シーシュポスの神話』"}
        ],
        "relations": [
            {"name": "サルトル", "id": "sartre", "relation": "盟友→決別", "note": "革命暴力を巡って1952年に訣別"}
        ],
        "places": [
            {"name": "ルルマラン墓地", "location": "フランス・プロヴァンス", "note": "カミュが眠る南仏の村"}
        ],
        "books": [
            {"title": "異邦人", "author": "カミュ", "asin": "4102114017", "description": "『太陽のせいだ』不条理文学の金字塔"},
            {"title": "ペスト", "author": "カミュ", "asin": "4102114033", "description": "疫病に閉ざされた街で問われる連帯"}
        ]
    },
    {
        "id": "foucault", "name": "ミシェル・フーコー", "nameEn": "Michel Foucault",
        "birth": 1926, "death": 1984, "country": "フランス", "field": "哲学者",
        "summary": "権力・狂気・監獄・性を『歴史の考古学』として解き明かした20世紀後半最大の思想家。スキンヘッドと知的挑発で時代のアイコンに。エイズで早逝。",
        "events": [
            {"year": 1926, "age": 0, "title": "ポワティエの外科医の子に", "detail": "権威的な父との確執を抱える。", "tags": ["parent_conflict"]},
            {"year": 1961, "age": 35, "title": "『狂気の歴史』", "detail": "理性の側から『狂気』を排除してきた歴史を暴く。", "tags": ["breakthrough"]},
            {"year": 1975, "age": 49, "title": "『監獄の誕生』", "detail": "パノプティコンと規律権力の分析。", "tags": ["breakthrough"]},
            {"year": 1984, "age": 57, "title": "パリでエイズにより死去", "detail": "『性の歴史』執筆途上。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間はたぶん、海辺の砂に描かれた顔のように消え去るであろう。", "source": "『言葉と物』"}
        ],
        "relations": [
            {"name": "サルトル", "id": "sartre", "relation": "論敵", "note": "実存主義を批判した世代"}
        ],
        "places": [
            {"name": "コレージュ・ド・フランス", "location": "フランス・パリ", "note": "フーコーが晩年講義した最高学府"}
        ],
        "books": [
            {"title": "監獄の誕生", "author": "フーコー", "asin": "4105067036", "description": "近代の権力が身体をどう飼い慣らしたか"}
        ]
    },
    {
        "id": "spinoza", "name": "バルーフ・デ・スピノザ", "nameEn": "Baruch Spinoza",
        "birth": 1632, "death": 1677, "country": "オランダ", "field": "哲学者",
        "summary": "ユダヤ教団から破門されながらレンズ磨きで生計を立て、『エチカ』を書いた孤高の思想家。『神即自然』の汎神論。ドゥルーズが『王子』と呼んだ静かな革命家。",
        "events": [
            {"year": 1632, "age": 0, "title": "アムステルダムのユダヤ商人の家に", "detail": "ポルトガル系セファルディ。", "tags": []},
            {"year": 1656, "age": 24, "title": "ユダヤ教団から破門（ヘーレム）", "detail": "『最も激しい呪いの文言』で追放。家族からも断絶。", "tags": ["isolation", "pride_broken"]},
            {"year": 1677, "age": 44, "title": "結核で死去", "detail": "レンズ粉塵を吸い続けた肺で息を引き取る。『エチカ』は死後刊行。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "明日世界が滅ぶとしても、今日私はリンゴの木を植える。", "source": "スピノザに帰される格言"},
            {"text": "すべての高貴なものは稀であるとともに困難である。", "source": "『エチカ』末尾"}
        ],
        "relations": [
            {"name": "デカルト", "id": "descartes", "relation": "哲学的先行者", "note": "デカルト哲学を出発点に独自の体系を築いた"}
        ],
        "places": [
            {"name": "スピノザハウス", "location": "オランダ・レインスブルフ", "note": "哲学を書いた質素な家"}
        ],
        "books": [
            {"title": "エチカ", "author": "スピノザ", "asin": "4003361539", "description": "幾何学的秩序で書かれた神と自由の哲学"}
        ]
    },
    {
        "id": "rousseau", "name": "ジャン＝ジャック・ルソー", "nameEn": "Jean-Jacques Rousseau",
        "birth": 1712, "death": 1778, "country": "スイス・フランス", "field": "哲学者・作家",
        "summary": "『社会契約論』でフランス革命を準備し、『エミール』で教育を変え、『告白』で近代自我の告白文学を発明した男。自分の子5人を孤児院に送った矛盾の人。",
        "events": [
            {"year": 1712, "age": 0, "title": "ジュネーヴで誕生、母は産後9日で死去", "detail": "時計職人の父に育てられる。", "tags": ["parent_conflict"]},
            {"year": 1728, "age": 16, "title": "ジュネーヴを出奔、放浪の旅", "detail": "ヴァランス夫人のもとで学問と愛を知る。", "tags": ["restart"]},
            {"year": 1762, "age": 50, "title": "『社会契約論』『エミール』刊行", "detail": "両書ともパリとジュネーヴで発禁、逮捕状。亡命生活へ。", "tags": ["breakthrough", "isolation"]},
            {"year": 1778, "age": 66, "title": "エルムノンヴィルで客死", "detail": "『告白』は死後刊行。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間は自由なものとして生まれたが、いたるところで鎖につながれている。", "source": "『社会契約論』"},
            {"text": "自然に帰れ。", "source": "ルソー思想を要約する言葉"}
        ],
        "relations": [
            {"name": "ヴォルテール", "relation": "論敵", "note": "啓蒙思想の盟友のはずが、激しく対立した"}
        ],
        "places": [
            {"name": "パンテオン", "location": "フランス・パリ", "note": "ヴォルテールと向かい合って眠る"}
        ],
        "books": [
            {"title": "社会契約論", "author": "ルソー", "asin": "4003362330", "description": "主権在民を説いた革命の書"},
            {"title": "告白 上", "author": "ルソー", "asin": "4003362349", "description": "近代自伝文学の原点"}
        ]
    },
    {
        "id": "laozi", "name": "老子", "nameEn": "Lao Tzu",
        "birth": -571, "death": -471, "country": "古代中国", "field": "哲学者",
        "summary": "『道徳経』わずか五千字で東洋思想の半分を作った伝説の賢者。『道（タオ）』『無為自然』『上善は水の如し』。実在したかさえ定かでない。",
        "events": [
            {"year": -571, "age": 0, "title": "楚の国で誕生（伝承）", "detail": "母の胎内に81年いたという伝説。", "tags": []},
            {"year": -500, "age": 71, "title": "周の図書館長として働く", "detail": "孔子が教えを請いに来たと伝わる。", "tags": ["approval"]},
            {"year": -480, "age": 91, "title": "水牛に乗って関を越え消える", "detail": "関守の求めに応じ『道徳経』を書き残して西へ去ったと伝わる。", "tags": ["restart", "isolation"]}
        ],
        "quotes": [
            {"text": "上善は水の如し。", "source": "『道徳経』第八章"},
            {"text": "大道廃れて仁義あり。", "source": "『道徳経』第十八章"},
            {"text": "知る者は言わず、言う者は知らず。", "source": "『道徳経』第五十六章"}
        ],
        "relations": [
            {"name": "孔子", "id": "confucius", "relation": "対話者（伝承）", "note": "若き孔子が教えを請いに来たという伝説"}
        ],
        "places": [
            {"name": "函谷関", "location": "中国・河南省", "note": "老子が『道徳経』を書き残して消えた関所"}
        ],
        "books": [
            {"title": "老子", "author": "蜂屋邦夫訳", "asin": "4003320514", "description": "五千字に凝縮された東洋思想の原典"}
        ]
    },
    {
        "id": "confucius", "name": "孔子", "nameEn": "Confucius",
        "birth": -551, "death": -479, "country": "古代中国", "field": "哲学者",
        "summary": "『論語』を通じて東アジア2500年の倫理を形作った人。仁・礼・君子。生前は政治家として不遇、死後に聖人となった最大の教師。",
        "events": [
            {"year": -551, "age": 0, "title": "魯の国、下級貴族の子に", "detail": "3歳で父を失い、貧しく育つ。", "tags": ["parent_conflict", "poverty"]},
            {"year": -517, "age": 34, "title": "斉へ亡命、のち各国遍歴", "detail": "理想の政治を求めて14年放浪。", "tags": ["restart", "isolation"]},
            {"year": -483, "age": 68, "title": "魯に帰国、弟子の教育に専念", "detail": "3000人の弟子、72人の高弟を育てた。", "tags": ["restart"]},
            {"year": -479, "age": 72, "title": "死去", "detail": "『泰山其れ頽れんか』と弟子の夢に現れ、7日後に没したと伝わる。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "学びて時に之を習う、亦た説ばしからずや。", "source": "『論語』学而篇"},
            {"text": "己の欲せざる所、人に施す勿れ。", "source": "『論語』衛霊公篇"},
            {"text": "四十にして惑わず、五十にして天命を知る。", "source": "『論語』為政篇"}
        ],
        "relations": [
            {"name": "顔回", "relation": "愛弟子", "note": "貧しくも学を好み続けた最高の弟子。早世し孔子を嘆かせた"},
            {"name": "老子", "id": "laozi", "relation": "伝説の対話者", "note": "若き孔子が教えを請いに行ったと伝わる"}
        ],
        "places": [
            {"name": "孔廟・孔林", "location": "中国・山東省曲阜", "note": "孔子を祀る廟と一族の墓"}
        ],
        "books": [
            {"title": "論語", "author": "金谷治訳注", "asin": "400332021X", "description": "弟子たちがまとめた言行録"}
        ]
    },
    {
        "id": "buddha", "name": "ブッダ（釈迦）", "nameEn": "Gautama Buddha",
        "birth": -563, "death": -483, "country": "古代インド", "field": "思想家・仏教開祖",
        "summary": "カピラヴァストゥの王子として生まれ、29歳で妻子を捨て出家。35歳で菩提樹下で悟り、80歳で入滅するまで遊行説法を続けた。『生きること自体が苦である』と認めたところから始まる思想。",
        "events": [
            {"year": -563, "age": 0, "title": "ルンビニで誕生、母は7日後に死去", "detail": "シャーキヤ族の王子ゴータマ・シッダールタ。", "tags": ["parent_conflict"]},
            {"year": -534, "age": 29, "title": "四門出遊、大いなる出家", "detail": "老病死苦を見て、妻ヤショーダラーと息子ラーフラを捨て家を出る。", "tags": ["restart", "isolation"]},
            {"year": -528, "age": 35, "title": "ブッダガヤの菩提樹下で成道", "detail": "明けの明星を見て『目覚めた者』となった。", "tags": ["breakthrough"]},
            {"year": -483, "age": 80, "title": "クシナガラで入滅", "detail": "『一切の形あるものは壊れる。怠ることなく精進せよ』が最期の言葉。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "自らを灯明とし、自らを依り処とせよ。", "source": "『大般涅槃経』"},
            {"text": "怨みは怨みによって果たされず、怨みを捨ててこそ果たされる。", "source": "『ダンマパダ』"}
        ],
        "relations": [
            {"name": "ヤショーダラー", "relation": "妻", "note": "王子時代の妻。のち尼僧となる"},
            {"name": "ラーフラ", "relation": "息子", "note": "『障碍』の意。のち弟子となる"}
        ],
        "places": [
            {"name": "ブッダガヤ・マハーボディ寺院", "location": "インド・ビハール州", "note": "悟りを開いた菩提樹の場所"},
            {"name": "ルンビニ", "location": "ネパール", "note": "釈迦の生誕地"},
            {"name": "サルナート（鹿野苑）", "location": "インド・ヴァーラーナシー", "note": "初転法輪の地"}
        ],
        "books": [
            {"title": "ブッダの真理のことば・感興のことば", "author": "中村元訳", "asin": "4003330110", "description": "ブッダの肉声に最も近いとされる原始経典"}
        ]
    },
    # ============ 作曲家 ============
    {
        "id": "vivaldi", "name": "アントニオ・ヴィヴァルディ", "nameEn": "Antonio Vivaldi",
        "birth": 1678, "death": 1741, "country": "イタリア", "field": "作曲家",
        "summary": "『四季』の作曲者。『赤毛の司祭』と呼ばれ、ヴェネツィアの孤児院でヴァイオリンを教えながら500以上の協奏曲を書いた。晩年は忘れ去られウィーンで客死。",
        "events": [
            {"year": 1678, "age": 0, "title": "ヴェネツィアで誕生", "detail": "父はサン・マルコのヴァイオリン奏者。", "tags": []},
            {"year": 1703, "age": 25, "title": "司祭に叙階、同年ピエタ院の教師に", "detail": "喘息のためミサを執り行えず、作曲に専念。", "tags": ["restart"]},
            {"year": 1725, "age": 47, "title": "『四季』を含む協奏曲集刊行", "detail": "ヨーロッパ中で大ヒット。", "tags": ["breakthrough", "approval"]},
            {"year": 1741, "age": 63, "title": "ウィーンで貧窮のうちに客死", "detail": "モーツァルトと同じ墓地に無名で埋葬された。", "tags": ["loss", "isolation"]}
        ],
        "quotes": [
            {"text": "音楽は感情の速記法である。", "source": "ヴィヴァルディに帰される言葉"}
        ],
        "relations": [
            {"name": "バッハ", "id": "bach", "relation": "心酔した同時代人", "note": "バッハはヴィヴァルディの協奏曲を多数編曲した"}
        ],
        "places": [
            {"name": "ピエタ慈善院", "location": "イタリア・ヴェネツィア", "note": "ヴィヴァルディが教え作曲した孤児院"}
        ],
        "books": [],
        "works": [
            {"title": "四季『春』", "type": "youtube", "id": "mFWQgxXM_b8", "note": "最も有名なヴァイオリン協奏曲"}
        ]
    },
    {
        "id": "haydn", "name": "ヨーゼフ・ハイドン", "nameEn": "Joseph Haydn",
        "birth": 1732, "death": 1809, "country": "オーストリア", "field": "作曲家",
        "summary": "『交響曲の父』『弦楽四重奏の父』。エステルハージ家に30年仕え、モーツァルトの友、ベートーヴェンの師。『パパ・ハイドン』と慕われた温厚な巨匠。",
        "events": [
            {"year": 1732, "age": 0, "title": "ローラウの車大工の家に誕生", "detail": "農村の貧しい子供だった。", "tags": ["poverty"]},
            {"year": 1761, "age": 29, "title": "エステルハージ侯爵家の副楽長に", "detail": "以後30年、一族に仕え続ける。", "tags": ["restart"]},
            {"year": 1791, "age": 59, "title": "ロンドン旅行で熱狂を浴びる", "detail": "オックスフォード大名誉博士号。『ロンドン交響曲』を書く。", "tags": ["approval", "breakthrough"]},
            {"year": 1809, "age": 77, "title": "ウィーン、ナポレオン侵攻のさなか死去", "detail": "フランス兵も敬意を表し門番に立ったと伝わる。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私の言葉が通じない国でも、音楽は通じた。", "source": "ロンドンからの手紙"}
        ],
        "relations": [
            {"name": "モーツァルト", "id": "mozart", "relation": "友・互いの師", "note": "互いに天才と認め合った稀有な友情"},
            {"name": "ベートーヴェン", "id": "beethoven", "relation": "弟子", "note": "1792年からウィーンで師事"}
        ],
        "places": [
            {"name": "エステルハージ宮殿", "location": "ハンガリー・フェルテード", "note": "30年間仕えた宮廷"}
        ],
        "books": [],
        "works": [
            {"title": "交響曲第94番『驚愕』", "type": "youtube", "id": "_t1dWJ5Vxlk", "note": "居眠り客を起こすための一撃"}
        ]
    },
    {
        "id": "mendelssohn", "name": "フェリックス・メンデルスゾーン", "nameEn": "Felix Mendelssohn",
        "birth": 1809, "death": 1847, "country": "ドイツ", "field": "作曲家",
        "summary": "裕福なユダヤ系銀行家の家に生まれ、20歳で忘れられていたバッハ『マタイ受難曲』を蘇演。『結婚行進曲』『イタリア』『ヴァイオリン協奏曲』。姉ファニーを失い半年後に38歳で急逝。",
        "events": [
            {"year": 1809, "age": 0, "title": "ハンブルクに誕生", "detail": "哲学者モーゼス・メンデルスゾーンの孫。裕福で自由な環境。", "tags": ["approval"]},
            {"year": 1829, "age": 20, "title": "『マタイ受難曲』を百年ぶりに蘇演", "detail": "バッハ再評価の決定的瞬間。", "tags": ["breakthrough"]},
            {"year": 1847, "age": 38, "title": "姉ファニーの急死の半年後、自身も急逝", "detail": "脳卒中。『姉のもとへ行く』と繰り返したという。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "言葉では言い表せないものこそ、音楽で表現されるのだ。", "source": "メンデルスゾーンの手紙"}
        ],
        "relations": [
            {"name": "シューマン", "id": "schumann", "relation": "親友", "note": "ライプツィヒで最も近い同僚作曲家"},
            {"name": "バッハ", "id": "bach", "relation": "再発見した対象", "note": "メンデルスゾーン無しに現代のバッハ像はない"}
        ],
        "places": [
            {"name": "ライプツィヒ・ゲヴァントハウス", "location": "ドイツ・ライプツィヒ", "note": "音楽監督として12年君臨"}
        ],
        "books": [],
        "works": [
            {"title": "ヴァイオリン協奏曲ホ短調", "type": "youtube", "id": "o1dBg__wsuo", "note": "三大協奏曲のひとつ"}
        ]
    },
    {
        "id": "liszt", "name": "フランツ・リスト", "nameEn": "Franz Liszt",
        "birth": 1811, "death": 1886, "country": "ハンガリー", "field": "作曲家・ピアニスト",
        "summary": "史上初の『スーパースター・ピアニスト』。リストマニア（熱狂）を生み、手袋やハンカチが奪い合われた。晩年は僧籍に入り、内面的な遅い作品を書き続けた。",
        "events": [
            {"year": 1811, "age": 0, "title": "ハンガリーに誕生", "detail": "父はエステルハージ家の執事。", "tags": []},
            {"year": 1839, "age": 28, "title": "『超絶技巧練習曲』原型発表、ヨーロッパ演奏旅行開始", "detail": "10年間で1000回以上の演奏会。", "tags": ["breakthrough", "approval"]},
            {"year": 1848, "age": 37, "title": "ヴァイマール宮廷楽長、演奏家引退", "detail": "作曲と教育に専念。", "tags": ["restart"]},
            {"year": 1865, "age": 54, "title": "ローマで下級聖職者となる", "detail": "『アベ・リスト』と呼ばれ黒衣を着た。", "tags": ["restart"]},
            {"year": 1886, "age": 74, "title": "バイロイトで娘の婿ワーグナーの祝祭を見ながら死去", "detail": "『トリスタン！』と呟いたと伝わる。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "技術を超えたところに、音楽がある。", "source": "リストの言葉"}
        ],
        "relations": [
            {"name": "ショパン", "id": "chopin", "relation": "親友", "note": "パリ時代の同僚、ショパン伝記の最初の著者"},
            {"name": "ワーグナー", "id": "wagner", "relation": "娘の夫・盟友", "note": "娘コジマをビューローから奪われたが最終的に和解"}
        ],
        "places": [
            {"name": "ヴァイマール・リスト邸", "location": "ドイツ・ヴァイマール", "note": "作曲・教授に専念した家"}
        ],
        "books": [],
        "works": [
            {"title": "ラ・カンパネラ", "type": "youtube", "id": "VeuPH5P6hGA", "note": "超絶技巧の代名詞"},
            {"title": "愛の夢 第3番", "type": "youtube", "id": "LdH1hSWGFGU", "note": "最も愛される小品"}
        ]
    },
    {
        "id": "verdi", "name": "ジュゼッペ・ヴェルディ", "nameEn": "Giuseppe Verdi",
        "birth": 1813, "death": 1901, "country": "イタリア", "field": "作曲家",
        "summary": "『椿姫』『アイーダ』『リゴレット』『オテロ』。イタリア統一運動（リソルジメント）の音楽的象徴。26歳で妻子を相次ぎ失い、絶望の淵から『ナブッコ』で復活。",
        "events": [
            {"year": 1813, "age": 0, "title": "ロンコーレ村の宿屋の子に誕生", "detail": "ワーグナーと同い年。", "tags": []},
            {"year": 1840, "age": 26, "title": "妻と2人の子を2年で相次いで失う", "detail": "絶望し作曲を断つ決意。", "tags": ["loss"]},
            {"year": 1842, "age": 28, "title": "『ナブッコ』大成功、作曲家として復活", "detail": "『行け我が想いよ金色の翼に乗って』はイタリア第二の国歌に。", "tags": ["breakthrough", "restart"]},
            {"year": 1853, "age": 39, "title": "『椿姫』初演", "detail": "初日は失敗、のち世界で最も愛されるオペラに。", "tags": ["pride_broken", "breakthrough"]},
            {"year": 1901, "age": 87, "title": "ミラノで死去", "detail": "国葬にミラノ市民30万人が集まり『行け我が想いよ』を歌った。", "tags": ["loss", "approval"]}
        ],
        "quotes": [
            {"text": "古きに還れ、さすれば進歩する。", "source": "ヴェルディの手紙"}
        ],
        "relations": [
            {"name": "ワーグナー", "id": "wagner", "relation": "同時代のライバル", "note": "同い年。会うことはなかった二人の巨匠"}
        ],
        "places": [
            {"name": "サンターガタ荘", "location": "イタリア・ブッセート", "note": "ヴェルディが晩年を過ごした農場"},
            {"name": "カーサ・ヴェルディ", "location": "イタリア・ミラノ", "note": "引退音楽家のために建てた養老院。自身もここに眠る"}
        ],
        "books": [],
        "works": [
            {"title": "『椿姫』より乾杯の歌", "type": "youtube", "id": "2FmfZWjKUlE", "note": "オペラで最も有名な二重唱"}
        ]
    },
    {
        "id": "puccini", "name": "ジャコモ・プッチーニ", "nameEn": "Giacomo Puccini",
        "birth": 1858, "death": 1924, "country": "イタリア", "field": "作曲家",
        "summary": "『ラ・ボエーム』『トスカ』『蝶々夫人』『トゥーランドット』。メロディの天才と呼ばれたイタリア・オペラ最後の巨匠。未完の『トゥーランドット』を遺して他界。",
        "events": [
            {"year": 1858, "age": 0, "title": "ルッカの音楽家一族に誕生", "detail": "4代続く教会音楽家の家系。", "tags": []},
            {"year": 1884, "age": 26, "title": "人妻エルヴィーラと駆け落ち", "detail": "スキャンダルだが生涯の伴侶となる。", "tags": ["restart"]},
            {"year": 1904, "age": 45, "title": "『蝶々夫人』初演、初日は大失敗", "detail": "改訂版で世界的成功。日本への関心を持った。", "tags": ["pride_broken", "breakthrough"]},
            {"year": 1924, "age": 65, "title": "ブリュッセルで喉頭癌手術中に死去", "detail": "『トゥーランドット』第3幕途中で絶筆。トスカニーニが初演でペンが止まった場所で指揮を中断した。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "偉大な愛だけが、偉大な痛みを与えてくれる。", "source": "プッチーニの手紙"}
        ],
        "relations": [
            {"name": "ヴェルディ", "id": "verdi", "relation": "憧れた先輩", "note": "ヴェルディの『アイーダ』を観て作曲家を志した"}
        ],
        "places": [
            {"name": "トッレ・デル・ラーゴ", "location": "イタリア・トスカーナ", "note": "プッチーニが作曲した湖畔の邸宅"}
        ],
        "books": [],
        "works": [
            {"title": "『トゥーランドット』誰も寝てはならぬ", "type": "youtube", "id": "cWc7vYjgnTs", "note": "パヴァロッティの名唱"}
        ]
    },
    {
        "id": "sibelius", "name": "ジャン・シベリウス", "nameEn": "Jean Sibelius",
        "birth": 1865, "death": 1957, "country": "フィンランド", "field": "作曲家",
        "summary": "『フィンランディア』で独立運動の象徴となった国民的作曲家。7つの交響曲を書いた後、30年間沈黙。未完の第8番は自ら火に投じた。",
        "events": [
            {"year": 1865, "age": 0, "title": "ハメーンリンナに誕生", "detail": "軍医の父は幼児期に死去。", "tags": ["parent_conflict"]},
            {"year": 1899, "age": 33, "title": "『フィンランディア』作曲", "detail": "ロシア支配下、上演禁止にもかかわらず民衆の愛国歌となる。", "tags": ["breakthrough", "approval"]},
            {"year": 1924, "age": 58, "title": "交響曲第7番完成", "detail": "以後30年、大作を発表せず。『シベリウスの沈黙』。", "tags": ["blank_period"]},
            {"year": 1957, "age": 91, "title": "アイノラ荘で死去", "detail": "ベルグルンド指揮の第5番がラジオで流れた2日後に逝った。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "批評家の言葉に耳を貸すな。彼らのために像が建てられたことは一度もない。", "source": "シベリウスの言葉"}
        ],
        "relations": [],
        "places": [
            {"name": "アイノラ", "location": "フィンランド・ヤルヴェンパー", "note": "妻アイノの名を取った森の家"}
        ],
        "books": [],
        "works": [
            {"title": "交響詩『フィンランディア』", "type": "youtube", "id": "F5zg_af9b8c", "note": "独立運動の魂"}
        ]
    },
    {
        "id": "prokofiev", "name": "セルゲイ・プロコフィエフ", "nameEn": "Sergei Prokofiev",
        "birth": 1891, "death": 1953, "country": "ロシア", "field": "作曲家",
        "summary": "『ピーターと狼』『ロメオとジュリエット』『古典交響曲』。革命を避けて渡米・パリ・そしてソ連に帰還。スターリンと同じ日に死に、死亡記事は埋もれた。",
        "events": [
            {"year": 1891, "age": 0, "title": "ウクライナ東部の農場主の子に", "detail": "5歳でピアノを弾き始める神童。", "tags": ["approval"]},
            {"year": 1918, "age": 27, "title": "革命を避けて日本経由でアメリカへ", "detail": "シベリア鉄道・敦賀を経て。", "tags": ["restart", "isolation"]},
            {"year": 1936, "age": 45, "title": "ソ連に帰国", "detail": "以後『形式主義』批判と栄光を往復する苦難の後半生。", "tags": ["restart"]},
            {"year": 1953, "age": 61, "title": "スターリンと同日死去", "detail": "独裁者の葬儀のため花すら手に入らなかった。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "自らを陳腐さから守る唯一の手段は、より良い作品を書き続けることだ。", "source": "プロコフィエフの言葉"}
        ],
        "relations": [
            {"name": "ショスタコーヴィチ", "id": "shostakovich", "relation": "ソ連の同時代ライバル", "note": "同じ政治的圧力に晒された二大作曲家"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "ピアノ協奏曲第3番", "type": "youtube", "id": "gdLqA6GXa1U", "note": "機械的なリズムと歌心"}
        ]
    },
    {
        "id": "gershwin", "name": "ジョージ・ガーシュウィン", "nameEn": "George Gershwin",
        "birth": 1898, "death": 1937, "country": "アメリカ", "field": "作曲家",
        "summary": "『ラプソディ・イン・ブルー』『パリのアメリカ人』『ポーギーとベス』。ロシア系ユダヤ人移民の子から、ジャズとクラシックを架橋した20世紀アメリカの音の顔に。38歳で脳腫瘍で死去。",
        "events": [
            {"year": 1898, "age": 0, "title": "ニューヨーク・ブルックリンに誕生", "detail": "ロシア系ユダヤ人移民の家庭。", "tags": []},
            {"year": 1924, "age": 25, "title": "『ラプソディ・イン・ブルー』初演", "detail": "2週間で書き上げた。ジャズ交響楽の誕生。", "tags": ["breakthrough"]},
            {"year": 1935, "age": 36, "title": "『ポーギーとベス』初演", "detail": "黒人キャストによるアメリカン・フォーク・オペラ。", "tags": ["breakthrough"]},
            {"year": 1937, "age": 38, "title": "ハリウッドで脳腫瘍により急死", "detail": "ピアノを弾いていて崩れ落ちた。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人生はジャズとよく似ている。即興で弾くときが一番いい。", "source": "ガーシュウィンに帰される言葉"}
        ],
        "relations": [
            {"name": "ラヴェル", "id": "ravel", "relation": "憧れた師", "note": "弟子入りを断られた『あなたは一流のガーシュウィンで、二流のラヴェルにはなるな』"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "ラプソディ・イン・ブルー", "type": "youtube", "id": "ynEOo28lsbc", "note": "ジャズとクラシックの融合"}
        ]
    },
    {
        "id": "bartok", "name": "ベーラ・バルトーク", "nameEn": "Béla Bartók",
        "birth": 1881, "death": 1945, "country": "ハンガリー", "field": "作曲家",
        "summary": "蝋管を抱えて東欧の村々を歩き、消えゆく民謡を録音した民族音楽学の祖。ナチスを嫌って渡米、白血病で貧窮のうちに没した誇り高き作曲家。",
        "events": [
            {"year": 1881, "age": 0, "title": "ハンガリー・ナジセントミクローシュに誕生", "detail": "父は農学校校長、7歳で死別。", "tags": ["parent_conflict"]},
            {"year": 1906, "age": 25, "title": "コダーイと民謡採集を開始", "detail": "エジソンの蝋管で農民の歌を録音。", "tags": ["breakthrough", "turning_encounter"]},
            {"year": 1940, "age": 59, "title": "ナチスの迫害を避け米国へ亡命", "detail": "コロンビア大学で研究。生活は苦しかった。", "tags": ["restart", "isolation"]},
            {"year": 1945, "age": 64, "title": "ニューヨークで白血病により死去", "detail": "『もっと書きたいことがあったのに』が最期の言葉。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "芸術家の真の仕事は、時代の『正しい音』を探し出すことだ。", "source": "バルトーク書簡"}
        ],
        "relations": [
            {"name": "コダーイ", "relation": "盟友", "note": "民謡採集の同志"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "弦楽器、打楽器とチェレスタのための音楽", "type": "youtube", "id": "0f8g56VbjHg", "note": "20世紀音楽の金字塔"}
        ]
    }
]


def main():
    if not PEOPLE.exists():
        PEOPLE.mkdir(parents=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    # manifest can be list or dict
    if isinstance(manifest, dict) and "people" in manifest:
        ids = manifest["people"]
    else:
        ids = manifest
    added = 0
    for p in PEOPLE_DATA:
        fp = PEOPLE / f"{p['id']}.json"
        if fp.exists():
            print(f"SKIP (exists): {p['id']}")
            continue
        fp.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
        if p["id"] not in ids:
            ids.append(p["id"])
        added += 1
        print(f"OK: {p['id']} {p['name']}")
    if isinstance(manifest, dict) and "people" in manifest:
        manifest["people"] = ids
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        MANIFEST.write_text(json.dumps(ids, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{added}人追加完了。合計{len(ids)}人")


if __name__ == "__main__":
    main()
