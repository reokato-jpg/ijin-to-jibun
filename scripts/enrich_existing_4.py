# -*- coding: utf-8 -*-
"""第4弾：既存人物の深化（15人）"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    # ==================== プラトン ====================
    "plato": {
        "events": [
            {"year": -408, "age": 19, "title": "ソクラテスと出会う", "detail": "劇作家志望だったが、ソクラテスに出会い自作の悲劇をすべて燃やしたと伝わる。",
             "tags": ["turning_encounter", "restart"]},
            {"year": -404, "age": 23, "title": "三十人政権の叔父たちの恐怖政治を目撃", "detail": "母方の叔父クリティアス、カルミデスの独裁。『正しい政治とは何か』の原体験。",
             "tags": ["pride_broken", "isolation"]},
            {"year": -388, "age": 39, "title": "シチリア島へ、ディオン王との出会い", "detail": "哲学者王の理想を試そうとシラクサのディオニュシオス1世の宮廷へ。しかし王の怒りを買い奴隷として売られそうになった。",
             "tags": ["isolation", "pride_broken"]},
            {"year": -375, "age": 52, "title": "『国家』完成", "detail": "『洞窟の比喩』『哲人王』『魂の三分説』など、西洋思想の型を作った大著。",
             "tags": ["breakthrough"]},
            {"year": -367, "age": 60, "title": "二度目のシチリア行き", "detail": "若き王ディオニュシオス2世の哲学教育のため。挫折して帰国。",
             "tags": ["pride_broken"]},
            {"year": -361, "age": 66, "title": "三度目のシチリア行きも失敗", "detail": "親友ディオンが追放される。哲人政治の夢は完全に崩れた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "哲学は驚きから始まる。", "source": "『テアイテトス』"},
            {"text": "良き始まりは半ばの成功である。", "source": "伝承"},
            {"text": "国家は、哲学者が王になるか、王が哲学者にならない限り、その悪から免れない。", "source": "『国家』第5巻"},
            {"text": "誰であれ、他人の苦しみに無関心でいる者は、人間と呼ぶに値しない。", "source": "プラトンに帰される言葉"},
            {"text": "真の知識とは、自分が何も知らないと知ることだ。", "source": "『ソクラテスの弁明』記録"}
        ]
    },

    # ==================== アリストテレス ====================
    "aristotle": {
        "events": [
            {"year": -367, "age": 17, "title": "アテネのアカデメイア入学、プラトンに20年学ぶ", "detail": "『アカデメイアの精神』と呼ばれるほど優秀な弟子。しかしプラトンのイデア論を徐々に批判していく。",
             "tags": ["turning_encounter"]},
            {"year": -347, "age": 37, "title": "プラトン死去、アカデメイア後継者になれず", "detail": "プラトンの甥スペウシッポスが後継者に。アリストテレスはマケドニア王家の招きで小アジアへ旅立つ。",
             "tags": ["pride_broken", "loss", "restart"]},
            {"year": -343, "age": 41, "title": "アレクサンドロス大王（13歳）の家庭教師に", "detail": "3年間、マケドニア宮廷で未来の世界征服者を教育。",
             "tags": ["approval"]},
            {"year": -335, "age": 49, "title": "アテネに戻りリュケイオン創設", "detail": "散歩しながら講義したため『逍遥学派(ペリパトス派)』と呼ばれた。",
             "tags": ["restart", "breakthrough"]},
            {"year": -323, "age": 61, "title": "アレクサンドロス急死、反マケドニア感情の中で亡命", "detail": "『アテネ人が二度哲学に対して罪を犯さないように』(ソクラテスの処刑を引き合いに)とエウボイアへ逃れる。",
             "tags": ["restart", "isolation"]},
            {"year": -322, "age": 62, "title": "カルキスで胃病により死去", "detail": "200以上の著作を残した万学の祖。現存は31冊のみ。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間は社会的動物である。", "source": "『政治学』"},
            {"text": "幸福は我々自身にかかっている。", "source": "『ニコマコス倫理学』"},
            {"text": "教育の根は苦いが、その実は甘い。", "source": "アリストテレスに帰される言葉"},
            {"text": "中庸こそ最高の徳である。", "source": "『ニコマコス倫理学』"},
            {"text": "我々がしばしば繰り返すものが、我々である。卓越とは行為ではなく習慣である。", "source": "アリストテレスに帰される言葉"},
            {"text": "プラトンは友人だ。だが真理はもっと親しい友人だ。", "source": "アリストテレスに帰される言葉"}
        ]
    },

    # ==================== デカルト ====================
    "descartes": {
        "events": [
            {"year": 1596, "age": 0, "title": "フランス・トゥーレーヌに裕福な家の三男として誕生", "detail": "母を1歳で失い、病弱だった祖母に育てられる。虚弱体質で昼まで寝る習慣は生涯続いた。",
             "tags": ["parent_conflict", "illness"]},
            {"year": 1618, "age": 22, "title": "三十年戦争の志願兵に", "detail": "『世界という大きな書物』を読むため傭兵となる。",
             "tags": ["restart"]},
            {"year": 1619, "age": 23, "title": "ドナウ河畔の暖炉部屋で3つの夢", "detail": "11月10日、一晩で3つの預言的な夢を見る。『驚くべき学問の基礎』を見つけた瞬間とされる。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1628, "age": 32, "title": "オランダに隠棲、20年間24回引越し", "detail": "宗教的に寛容な国で身を隠しながら考える生活。『人は隠れて生きればよく生きる』をモットーに。",
             "tags": ["isolation", "restart"]},
            {"year": 1637, "age": 41, "title": "『方法序説』刊行", "detail": "『我思う、ゆえに我あり』を含む。当時のラテン語ではなくフランス語で書いた画期的著作。",
             "tags": ["breakthrough"]},
            {"year": 1641, "age": 45, "title": "『省察』刊行", "detail": "神の存在証明と精神・身体の二元論を論じた主著。",
             "tags": ["breakthrough"]},
            {"year": 1649, "age": 53, "title": "スウェーデン女王クリスティーナに招かれる", "detail": "寒いストックホルムへ。朝5時から哲学講義を強いられ『魂より肉体が凍える』と手紙に書いた。",
             "tags": ["pride_broken", "illness"]},
            {"year": 1650, "age": 53, "title": "ストックホルムで肺炎により急死", "detail": "僅か数ヶ月で逝く。遺骨は16年後にフランスへ移送されたが途中で頭蓋骨が紛失、現在もオランダにある。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "我思う、ゆえに我あり。", "source": "『方法序説』第4部 / 『省察』"},
            {"text": "良識はこの世で最も公平に分配されているものだ。", "source": "『方法序説』冒頭"},
            {"text": "疑うためには根拠があればよい。信じるためには根拠が必要だ。", "source": "『省察』"},
            {"text": "本を読むことは、その本を書いた優れた人々と会話するようなものだ。", "source": "『方法序説』"},
            {"text": "各人にはその本性にもとづき固有の特性があるから、他人と同じになろうと努める必要はない。", "source": "書簡"}
        ]
    },

    # ==================== スピノザ ====================
    "spinoza": {
        "events": [
            {"year": 1654, "age": 22, "title": "父ミヒャエル死去、家業を継ぐも借金まみれ", "detail": "姉との遺産争い、のちに放棄。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1656, "age": 24, "title": "ユダヤ教団から破門（ヘーレム）", "detail": "『最も激しい呪いの文言』で追放。家族からも断絶。23歳の若者が無一文に。",
             "tags": ["isolation", "pride_broken"]},
            {"year": 1661, "age": 28, "title": "レンズ磨きを始める", "detail": "精密光学レンズの職人として生計を立てる。哲学のために最小限の生活を選んだ。",
             "tags": ["restart"]},
            {"year": 1670, "age": 37, "title": "『神学政治論』を匿名で刊行、発禁", "detail": "聖書批判と信教の自由を説いた。ヨーロッパ全土で禁書に。",
             "tags": ["pride_broken"]},
            {"year": 1673, "age": 40, "title": "ハイデルベルク大学教授職を辞退", "detail": "思想の自由を失うことを恐れ、申し出を断る。『私は安定した職を求めていません』",
             "tags": []},
            {"year": 1676, "age": 43, "title": "ライプニッツが訪問", "detail": "若きライプニッツが何時間も議論。後にライプニッツはこの訪問を『友人に隠した』。",
             "tags": ["turning_encounter"]},
            {"year": 1677, "age": 44, "title": "結核で死去", "detail": "レンズ粉塵を吸い続けた肺で息を引き取る。『エチカ』は死後刊行。家主の娘に看取られた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "明日世界が滅ぶとしても、今日私はリンゴの木を植える。", "source": "スピノザに帰される格言"},
            {"text": "すべての高貴なものは稀であるとともに困難である。", "source": "『エチカ』末尾"},
            {"text": "自由な人間は死について考えない。彼の知恵は死ではなく生についての省察である。", "source": "『エチカ』第4部"},
            {"text": "私は人間の行為を笑わず、嘆かず、呪わず、ただ理解しようと努めた。", "source": "『政治論』"},
            {"text": "神即自然（Deus sive Natura）。", "source": "『エチカ』"},
            {"text": "憎しみは、愛によってのみ克服される。", "source": "『エチカ』第4部"}
        ]
    },

    # ==================== ショーペンハウアー ====================
    "schopenhauer": {
        "events": [
            {"year": 1788, "age": 0, "title": "ダンツィヒの富裕商人の長男に誕生", "detail": "父は成功した貿易商、母は後に流行作家となるヨハンナ。",
             "tags": []},
            {"year": 1805, "age": 17, "title": "父ハインリヒが運河に身を投げて自殺", "detail": "鬱病の父の死。生涯彼を支配した財産の基盤となる。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1814, "age": 26, "title": "母ヨハンナと決別", "detail": "母のサロンに集う文化人（ゲーテら）と衝突。階段から突き落とす事件を起こし、以後24年、母と会わず。",
             "tags": ["parent_conflict", "isolation"]},
            {"year": 1819, "age": 30, "title": "『意志と表象としての世界』刊行、完全に無視される", "detail": "『世界は私の表象である』で始まる主著。500部のうち売れたのは100部以下。",
             "tags": ["breakthrough", "pride_broken"]},
            {"year": 1820, "age": 32, "title": "ベルリン大学でヘーゲルと同時間の講義を設定", "detail": "挑発的に対抗するが聴講者は数人。ヘーゲルは満員。屈辱に終わる。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1831, "age": 43, "title": "コレラ大流行でベルリンを逃げ出す", "detail": "ヘーゲルはこのコレラで死ぬ。ショーペンハウアーはフランクフルトに移り、30年間同じ下宿で暮らす。",
             "tags": ["restart"]},
            {"year": 1851, "age": 63, "title": "『余録と補遺』で遅れた名声を得る", "detail": "エッセイ集が英国で評判になり、世界中から手紙が来るようになる。63歳の遅い祝福。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1860, "age": 72, "title": "フランクフルトで食卓のソファで死去", "detail": "愛犬プードル『アートマン』と過ごした晩年。最期は一人朝食の後、ソファで眠るように。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "世界は私の表象である。", "source": "『意志と表象としての世界』冒頭"},
            {"text": "人生は、退屈と苦痛のあいだを揺れ動く振り子である。", "source": "『意志と表象としての世界』"},
            {"text": "孤独であれるかどうかで、その人の器量が分かる。", "source": "『余録と補遺』"},
            {"text": "読書は、他人の頭で考えることである。", "source": "『読書について』"},
            {"text": "才能は的に当てる。天才は誰にも見えない的に当てる。", "source": "『意志と表象としての世界』"},
            {"text": "健康は全てではない。しかし健康がなければ全ては無である。", "source": "『人生についての金言』"}
        ]
    },

    # ==================== キルケゴール ====================
    "kierkegaard": {
        "events": [
            {"year": 1813, "age": 0, "title": "コペンハーゲンに、羊飼いから富豪になった父の7人目の子として誕生", "detail": "父は82歳、母は44歳で彼を産んだ。父は若き羊飼い時代に神を呪った過去を引きずる敬虔なキリスト者。",
             "tags": ["parent_conflict"]},
            {"year": 1838, "age": 25, "title": "父の衝撃的な告白、『大地震』と呼ぶ体験", "detail": "父が若い頃に神を呪い、また後に妻を妊娠させて再婚した告白。キルケゴールの全世界観が揺らぐ。",
             "tags": ["parent_conflict", "pride_broken"]},
            {"year": 1840, "age": 27, "title": "レギーネ・オルセンと婚約", "detail": "17歳の少女と。翌年、自分の暗い内面が彼女を不幸にすると一方的に婚約解消。",
             "tags": ["turning_encounter"]},
            {"year": 1841, "age": 28, "title": "レギーネとの婚約解消", "detail": "劇的な別れ。残りの人生をほぼ全ての著作で彼女に語りかけ続けた。『神と彼女と、私の全て』。",
             "tags": ["heartbreak", "pride_broken"]},
            {"year": 1843, "age": 30, "title": "『あれかこれか』『おそれとおののき』同年刊行", "detail": "偽名で美的実存と倫理的実存を並立。キルケゴール最良の年。",
             "tags": ["breakthrough"]},
            {"year": 1846, "age": 33, "title": "『コルサール』誌事件", "detail": "風刺新聞に戯画化され、街で子供に指さされる日常に。有名になる屈辱。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1849, "age": 36, "title": "『死に至る病』刊行", "detail": "絶望を『死に至る病』として分析。実存主義の先駆。",
             "tags": ["breakthrough"]},
            {"year": 1855, "age": 42, "title": "街路で倒れ、42歳で死去", "detail": "父の遺産をほぼ使い果たし、教会批判の連続発行を終えた直後。病床で兄の見舞いも拒んだ。",
             "tags": ["loss", "isolation"]}
        ],
        "quotes": [
            {"text": "人生は後ろ向きにしか理解できないが、前向きに生きなければならない。", "source": "日記 1843"},
            {"text": "絶望とは、死に至る病である。", "source": "『死に至る病』"},
            {"text": "主体性こそ真理である。", "source": "『後書』"},
            {"text": "信仰とは、まさに個人が個体として絶対者に絶対的関係を持つことだ。", "source": "『おそれとおののき』"},
            {"text": "飛び込む決意より、飛び込まないための言い訳を、人は作り出す天才である。", "source": "日記"},
            {"text": "最大の危険、自分自身を失うことは、世界ではもっとも静かに進行する。", "source": "『死に至る病』"}
        ]
    },

    # ==================== ハイデガー ====================
    "heidegger": {
        "events": [
            {"year": 1889, "age": 0, "title": "メスキルヒの樽職人の子に", "detail": "カトリックの片田舎で育つ。生涯シュヴァーベン訛りが抜けなかった。",
             "tags": []},
            {"year": 1909, "age": 19, "title": "イエズス会修練院に入るが2週間で心臓病で退去", "detail": "神学の道を断念。以後信仰との格闘が生涯続く。",
             "tags": ["illness", "pride_broken", "restart"]},
            {"year": 1919, "age": 29, "title": "フッサールの助手に", "detail": "現象学の師のもとで10年。後に現象学を乗り越えることになる。",
             "tags": ["turning_encounter"]},
            {"year": 1924, "age": 34, "title": "18歳のハンナ・アーレントとの恋愛", "detail": "既婚の教授と若きユダヤ人学生。4年続いた禁じられた関係。",
             "tags": ["heartbreak", "turning_encounter"]},
            {"year": 1927, "age": 38, "title": "『存在と時間』刊行", "detail": "フッサールに捧げられた20世紀最大の哲学書。『死への先駆』『世界内存在』。",
             "tags": ["breakthrough"]},
            {"year": 1933, "age": 44, "title": "ナチス入党、フライブルク大学総長就任", "detail": "生涯消えない汚点。ユダヤ人を大学から排除する立場となった。",
             "tags": ["pride_broken"]},
            {"year": 1934, "age": 45, "title": "総長辞任", "detail": "ナチス本部との路線対立で1年で辞任。しかし入党は敗戦まで続けた。",
             "tags": []},
            {"year": 1945, "age": 56, "title": "戦後、教職追放", "detail": "連合国により5年間の大学追放。山小屋で思索を続けた。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1966, "age": 76, "title": "『シュピーゲル』紙で戦後唯一の公式インタビュー", "detail": "『死後にのみ公開』の条件で行われた。『ただ神のみが我々を救いうる』と結んだ。",
             "tags": []},
            {"year": 1976, "age": 86, "title": "故郷メスキルヒで没", "detail": "晩年は黒い森の山小屋トートナウベルクで思索し続けた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "言葉は存在の家である。", "source": "『ヒューマニズムについて』"},
            {"text": "死への先駆的決意。", "source": "『存在と時間』"},
            {"text": "ただ神のみが、我々を救いうる。", "source": "『シュピーゲル』紙インタビュー 1966"},
            {"text": "問うこととは、思考の敬虔さである。", "source": "『技術への問い』"},
            {"text": "我々は存在を忘れている。そのことさえ忘れている。", "source": "『存在と時間』"}
        ]
    },

    # ==================== ヘーゲル ====================
    "hegel": {
        "events": [
            {"year": 1770, "age": 0, "title": "シュトゥットガルトに誕生", "detail": "官吏の家。ベートーヴェンと同い年。",
             "tags": []},
            {"year": 1788, "age": 18, "title": "テュービンゲン大学神学校でヘルダーリン・シェリングと同室", "detail": "生涯の友となる天才たち。三人でフランス革命を祝して『自由の木』を植えた。",
             "tags": ["turning_encounter"]},
            {"year": 1801, "age": 30, "title": "イェーナ大学私講師に、シェリングの助手", "detail": "遅いスタート。シェリングの陰に隠れた時期。",
             "tags": ["restart"]},
            {"year": 1806, "age": 36, "title": "イェーナでナポレオンを見る", "detail": "白馬に乗って街を巡察するナポレオンを目撃。『馬上の世界精神を見た』と書簡に記す。同日夜、『精神現象学』原稿をバッグに詰めて街を逃げた。",
             "tags": ["breakthrough", "turning_encounter"]},
            {"year": 1807, "age": 36, "title": "下宿のおかみと庶子、貧困", "detail": "『精神現象学』刊行の年に婚外子ルートヴィヒ誕生。収入のため新聞編集者に。",
             "tags": ["poverty", "pride_broken"]},
            {"year": 1816, "age": 46, "title": "ハイデルベルク大学教授、ようやく安定", "detail": "46歳でやっと教授職。",
             "tags": ["restart", "approval"]},
            {"year": 1818, "age": 48, "title": "ベルリン大学教授", "detail": "ドイツ哲学界の頂点へ。教室は熱狂した。",
             "tags": ["approval"]},
            {"year": 1829, "age": 59, "title": "ベルリン大学総長", "detail": "プロイセン国家哲学者としての絶頂期。",
             "tags": ["breakthrough"]},
            {"year": 1831, "age": 61, "title": "コレラで急死", "detail": "最後の言葉は『俺を理解したのはひとりだけ、しかもそいつも誤解していた』と伝わる。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "理性的なものは現実的であり、現実的なものは理性的である。", "source": "『法の哲学』序文"},
            {"text": "ミネルヴァのふくろうは、たそがれに飛び立つ。", "source": "『法の哲学』序文"},
            {"text": "歴史が我々に教える唯一のことは、人類は歴史から何も学ばないということだ。", "source": "『歴史哲学講義』"},
            {"text": "ただ自分の限界を知る者のみが、自分を超えることができる。", "source": "『精神現象学』"},
            {"text": "真理は全体である。", "source": "『精神現象学』序文"}
        ]
    },

    # ==================== 西田幾多郎 ====================
    "nishida": {
        "events": [
            {"year": 1875, "age": 5, "title": "金沢近郊に富農の長男として誕生", "detail": "加賀の旧家。古風な父と教養深い母のもとで育つ。",
             "tags": []},
            {"year": 1894, "age": 24, "title": "東京帝大選科で差別待遇", "detail": "正規学生ではない『選科生』として、図書館も使用制限。この屈辱が思想の原動力に。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1899, "age": 29, "title": "山口高校に赴任、鈴木大拙と旧交を温める", "detail": "親友の禅仏教学者との議論が『純粋経験』概念の土台に。",
             "tags": ["turning_encounter"]},
            {"year": 1907, "age": 37, "title": "長女弥生が2歳で死去", "detail": "以後5人の子を病で失う。個人的な悲しみが哲学を深めた。",
             "tags": ["loss"]},
            {"year": 1911, "age": 41, "title": "『善の研究』刊行", "detail": "日本初の本格的哲学書。『純粋経験』の哲学。東大学生のベストセラーに。",
             "tags": ["breakthrough"]},
            {"year": 1913, "age": 43, "title": "京都帝大教授", "detail": "『京都学派』の誕生。田辺元・三木清・西谷啓治らを育てる。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1918, "age": 48, "title": "妻寿美が脳溢血で寝たきりに", "detail": "4年間自らおむつを替え看病。『哲学と看病で一日が終わる』と日記に。",
             "tags": ["loss", "illness"]},
            {"year": 1925, "age": 55, "title": "妻・寿美を失う", "detail": "7年の看病の末。『哲学も何も空になった』。",
             "tags": ["loss", "heartbreak"]},
            {"year": 1927, "age": 57, "title": "『働くものから見るものへ』で『場所の論理』", "detail": "『絶対無の場所』を語る独自の哲学へ。",
             "tags": ["breakthrough"]},
            {"year": 1945, "age": 75, "title": "鎌倉で敗戦直前に急死", "detail": "6月7日、尿毒症で。終戦を見ずに逝った。最後の論文は『場所的論理と宗教的世界観』。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人は人、吾は吾なり、とにかくに、吾行く道を、吾は行くなり。", "source": "西田の歌"},
            {"text": "純粋経験において、主もなく客もない。", "source": "『善の研究』"},
            {"text": "考えるという事は、生きるという事である。", "source": "『思索と体験』"},
            {"text": "絶対無の場所。", "source": "西田の独自用語"},
            {"text": "我々は悲しみの故にこそ、深く感じ深く考えるのである。", "source": "『思索と体験』"}
        ]
    },

    # ==================== 孔子 ====================
    "confucius": {
        "events": [
            {"year": -551, "age": 0, "title": "魯の国、下級貴族の子に", "detail": "父は勇士として知られた叔梁紇、70歳で16歳の少女顔徴在との間の子。正妻ではない。",
             "tags": ["parent_conflict", "poverty"]},
            {"year": -548, "age": 3, "title": "父死去、母と貧困の中で育つ", "detail": "母の実家を頼らず、自らの力で学問を積んだ。『吾十有五にして学に志す』。",
             "tags": ["parent_conflict", "loss", "poverty"]},
            {"year": -533, "age": 18, "title": "倉庫番・牧場番の下働き", "detail": "『若くして賤しかった。故に鄙事に多能であった』と後に語った。",
             "tags": ["poverty"]},
            {"year": -521, "age": 30, "title": "『三十にして立つ』、私塾を開く", "detail": "身分を問わず弟子を取った初の教師。『束脩(肉10切れ)以上を持参する者は、教えなかったことがない』。",
             "tags": ["restart", "breakthrough"]},
            {"year": -517, "age": 34, "title": "魯国の内乱、斉へ亡命", "detail": "昭公に従って亡命。景公に政治を説くも受け入れられず。",
             "tags": ["restart", "isolation"]},
            {"year": -500, "age": 51, "title": "魯国の司寇(法務大臣)に登用", "detail": "遅咲きの政治家デビュー。わずか数年で国政を建て直したと伝わる。",
             "tags": ["breakthrough", "approval"]},
            {"year": -497, "age": 54, "title": "失政で追われ14年の諸国遍歴", "detail": "衛・曹・宋・鄭・陳・蔡・楚。『喪家の狗』と揶揄された。陳蔡の間で7日間食糧を絶たれた危機も。",
             "tags": ["restart", "isolation", "pride_broken"]},
            {"year": -484, "age": 67, "title": "息子鯉が40代で死去", "detail": "続いて翌年愛弟子顔回、さらに子路も亡くす。老いた孔子を打ちのめした。",
             "tags": ["loss", "heartbreak"]},
            {"year": -483, "age": 68, "title": "魯に帰国、弟子の教育と経典整理に専念", "detail": "3000人の弟子、72人の高弟を育てた。『詩経』『書経』を整理、『春秋』を編纂。",
             "tags": ["restart"]},
            {"year": -479, "age": 72, "title": "死去", "detail": "『泰山其れ頽れんか』と弟子の夢に現れ、7日後に没したと伝わる。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "学びて時に之を習う、亦た説ばしからずや。", "source": "『論語』学而篇"},
            {"text": "己の欲せざる所、人に施す勿れ。", "source": "『論語』衛霊公篇"},
            {"text": "四十にして惑わず、五十にして天命を知る。", "source": "『論語』為政篇"},
            {"text": "朝に道を聞かば、夕べに死すとも可なり。", "source": "『論語』里仁篇"},
            {"text": "過ちて改めざる、是を過ちと謂う。", "source": "『論語』衛霊公篇"},
            {"text": "故きを温ねて新しきを知る。", "source": "『論語』為政篇"},
            {"text": "知之者不如好之者、好之者不如楽之者。", "source": "『論語』雍也篇"}
        ]
    },

    # ==================== ブッダ ====================
    "buddha": {
        "events": [
            {"year": -563, "age": 0, "title": "ルンビニで誕生、母マーヤー7日後に死去", "detail": "シャーキヤ族の王子ゴータマ・シッダールタ。占星術師は『世界を支配する王か、世界を救う聖者になる』と予言した。",
             "tags": ["parent_conflict", "loss"]},
            {"year": -547, "age": 16, "title": "ヤショーダラーと結婚", "detail": "父は息子を宮殿の快楽で繋ぎ止めようとした。苦しみを見せないために。",
             "tags": []},
            {"year": -534, "age": 29, "title": "四門出遊、息子ラーフラ誕生の夜に出家", "detail": "城外で老人・病人・死者・修行者を見て、宮殿生活の虚しさに目覚める。息子の名を『障碍』とし、妻子を捨てた。",
             "tags": ["restart", "isolation"]},
            {"year": -534, "age": 29, "title": "苦行6年、スジャーターの乳粥", "detail": "骨と皮になるまで断食し倒れる。村娘スジャーターの捧げた乳粥で命をつなぎ『中道』を悟る。",
             "tags": ["restart", "turning_encounter"]},
            {"year": -528, "age": 35, "title": "ブッダガヤの菩提樹下で成道", "detail": "7日間の瞑想の末、明けの明星を見て『目覚めた者(ブッダ)』となった。",
             "tags": ["breakthrough"]},
            {"year": -528, "age": 35, "title": "初転法輪", "detail": "サルナートで共に苦行した5人の修行者に最初の説法。仏教教団の誕生。",
             "tags": ["breakthrough"]},
            {"year": -523, "age": 40, "title": "父の臨終に立ち会う", "detail": "ブッダとなった息子に父は『浄飯』と呼ばれた王として息を引き取った。",
             "tags": ["loss"]},
            {"year": -483, "age": 80, "title": "クシナガラで入滅", "detail": "最期の食事は鍛冶屋チュンダの豚肉(または茸)。『一切の形あるものは壊れる。怠ることなく精進せよ』が最期の言葉。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "自らを灯明とし、自らを依り処とせよ。", "source": "『大般涅槃経』"},
            {"text": "怨みは怨みによって果たされず、怨みを捨ててこそ果たされる。", "source": "『ダンマパダ』"},
            {"text": "天上天下唯我独尊。", "source": "誕生偈として伝わる"},
            {"text": "すべては燃えている。何によって燃えているか。貪り・怒り・愚かさによって燃えている。", "source": "『火の説法』"},
            {"text": "一切の形あるものは壊れる。怠ることなく精進せよ。", "source": "涅槃、最期の言葉"},
            {"text": "過去を追わず、未来を願わず、ただ今なすべきことを、熱心になせ。", "source": "『マッジマ・ニカーヤ』"}
        ]
    },

    # ==================== ハイドン ====================
    "haydn": {
        "events": [
            {"year": 1740, "age": 8, "title": "ウィーンのシュテファン寺院少年聖歌隊に", "detail": "美しいボーイ・ソプラノとして10年在籍。",
             "tags": ["approval"]},
            {"year": 1749, "age": 17, "title": "変声で聖歌隊を放逐、路頭に迷う", "detail": "『一文無し、3着の粗末な服だけ』で屋根裏部屋に。ピアノ伴奏や作曲の雑用で食いつなぐ。",
             "tags": ["pride_broken", "poverty", "restart"]},
            {"year": 1761, "age": 29, "title": "エステルハージ侯爵家の副楽長に", "detail": "以後30年、一族に仕え続ける。『世界から隔離されていた私は独創的になるしかなかった』。",
             "tags": ["restart"]},
            {"year": 1781, "age": 49, "title": "モーツァルトと出会い親友に", "detail": "24歳年下の天才と深い友情。互いに弦楽四重奏を献呈し合った。",
             "tags": ["turning_encounter"]},
            {"year": 1790, "age": 58, "title": "エステルハージ公死去、30年の宮仕え終わる", "detail": "新公は音楽を重視せず楽団解散。ロンドンのザロモンが『25の夢みる客を連れてきた』。",
             "tags": ["restart", "loss"]},
            {"year": 1791, "age": 59, "title": "ロンドン旅行で熱狂を浴びる", "detail": "オックスフォード大名誉博士号。『ロンドン交響曲』を書く。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1792, "age": 60, "title": "ウィーンでベートーヴェンを弟子に取る", "detail": "22歳の激しい青年との関係は緊張に満ちていた。",
             "tags": ["turning_encounter"]},
            {"year": 1798, "age": 66, "title": "オラトリオ『天地創造』初演", "detail": "ヘンデルに倣った晩年の大作。ウィーン宮廷で初演。",
             "tags": ["breakthrough"]},
            {"year": 1809, "age": 77, "title": "ウィーン、ナポレオン侵攻のさなか死去", "detail": "砲撃の中、フランス兵も敬意を表し門番に立ったと伝わる。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私の言葉が通じない国でも、音楽は通じた。", "source": "ロンドンからの手紙"},
            {"text": "年老いて弱くなったが、曲想は限りなく流れてくる。", "source": "晩年の手紙"},
            {"text": "神は喜びを好まれる。ゆえに私の音楽は喜ばしくあるべきだ。", "source": "ハイドンの言葉"}
        ],
        "works": [
            {"title": "交響曲第94番 ト長調『驚愕』", "year": 1791, "type": "交響曲",
             "description": "居眠り客を起こすための一撃",
             "youtubeId": "_t1dWJ5Vxlk"},
            {"title": "交響曲第45番 嬰ヘ短調『告別』", "year": 1772, "type": "交響曲",
             "description": "最終楽章で楽員が順に退場する、休暇を求めた抗議の曲",
             "youtubeId": "4w5oKj1OcyE"},
            {"title": "オラトリオ『天地創造』", "year": 1798, "type": "宗教曲",
             "description": "66歳の大作。『光あれ』の瞬間の劇的爆発",
             "youtubeId": "2jGy0pXc0PY"},
            {"title": "トランペット協奏曲 変ホ長調", "year": 1796, "type": "協奏曲",
             "description": "当時の新しい有鍵トランペットのために書かれた名品",
             "youtubeId": "cAwKWz5IcMY"},
            {"title": "弦楽四重奏曲第77番『皇帝』第2楽章", "year": 1797, "type": "室内楽",
             "description": "主題はのちにドイツ国歌となった",
             "youtubeId": "DoHVBmldN8Q"}
        ]
    },

    # ==================== ヘンデル ====================
    "handel": {
        "events": [
            {"year": 1685, "age": 0, "title": "ドイツ・ハレに宮廷理髪師の子として誕生", "detail": "父は60歳、息子を法律家にしたがった。バッハと同年生まれ。",
             "tags": ["parent_conflict"]},
            {"year": 1703, "age": 18, "title": "ハンブルクでオペラデビュー", "detail": "自作オペラ『アルミーラ』成功。同僚マッテゾンと決闘し、大きなボタンで命を救われた逸話。",
             "tags": ["breakthrough"]},
            {"year": 1706, "age": 21, "title": "イタリアへ留学、3年で最新流行を吸収", "detail": "コレッリ、スカルラッティらと交流。『イタリア風のヘンデル』を身につけた。",
             "tags": ["turning_encounter"]},
            {"year": 1710, "age": 25, "title": "ハノーヴァー選帝侯楽長、のちロンドンへ", "detail": "主君がジョージ1世として英国王に。ヘンデルも英国に帰化、『水上の音楽』で和解した。",
             "tags": ["restart"]},
            {"year": 1727, "age": 42, "title": "英国王戴冠式アンセム『司祭ザドク』作曲", "detail": "以後、英国君主戴冠式で必ず演奏される曲に。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1737, "age": 52, "title": "脳卒中で右手麻痺", "detail": "温泉療法で奇跡的に回復。しかしオペラ興行は破産寸前。",
             "tags": ["illness", "pride_broken"]},
            {"year": 1741, "age": 56, "title": "『メサイア』を24日間で完成", "detail": "破産寸前の状態で食事もせず書いた。『ハレルヤ』を書いたとき『天国が見えた』と涙した。",
             "tags": ["breakthrough"]},
            {"year": 1742, "age": 57, "title": "ダブリンで『メサイア』初演", "detail": "慈善公演として大成功。以後英国で最も愛されるオラトリオに。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1751, "age": 66, "title": "失明", "detail": "片眼の手術が失敗し両目を失う。バッハと同じ眼科医タイラーの手術だった。",
             "tags": ["loss", "illness"]},
            {"year": 1759, "age": 74, "title": "ロンドンで死去、ウェストミンスター寺院に", "detail": "英国国葬。バッハと同い年のもう一人の巨匠。",
             "tags": ["loss", "approval"]}
        ],
        "quotes": [
            {"text": "人々を楽しませるためだけでなく、より良くするために書くのだ。", "source": "『メサイア』に寄せて"},
            {"text": "天国が見えた。偉大なる神そのものが見えた。", "source": "『ハレルヤ・コーラス』を書きながら"}
        ],
        "works": [
            {"title": "メサイア HWV56", "year": 1741, "type": "宗教曲",
             "description": "24日間で書かれた、英国で最も愛されるオラトリオ",
             "youtubeId": "IUZEtVbJT5c"},
            {"title": "水上の音楽 HWV348-350", "year": 1717, "type": "管弦楽",
             "description": "ジョージ1世のテムズ川舟遊びのための組曲",
             "youtubeId": "Lk-cHQvUWfI"},
            {"title": "王宮の花火の音楽 HWV351", "year": 1749, "type": "管弦楽",
             "description": "アーヘンの和約を祝うため書かれた",
             "youtubeId": "NVbGOcKHSTk"},
            {"title": "『リナルド』より『私を泣かせてください』", "year": 1711, "type": "オペラ",
             "description": "オペラ史上の名アリアのひとつ",
             "youtubeId": "DFLs6D0pzDs"}
        ]
    },

    # ==================== ラヴェル ====================
    "ravel": {
        "events": [
            {"year": 1875, "age": 0, "title": "南仏シブールに誕生、生後3ヶ月でパリへ", "detail": "父は発明家、母はバスク人。『私にはバスク人の魂がある』と晩年に語った。",
             "tags": []},
            {"year": 1889, "age": 14, "title": "パリ音楽院入学、フォーレの弟子に", "detail": "ピアノ・和声・作曲を学ぶ。ドビュッシー(13歳年上)と出会うのもこの時期。",
             "tags": ["turning_encounter"]},
            {"year": 1905, "age": 30, "title": "ローマ大賞を5回落選、スキャンダルに", "detail": "才能を認められながら保守的な審査で落選。マスコミが『ラヴェル事件』として批判、音楽院長更迭の引き金に。",
             "tags": ["pride_broken", "approval"]},
            {"year": 1912, "age": 37, "title": "バレエ『ダフニスとクロエ』完成", "detail": "ディアギレフ委嘱、ニジンスキー振付。『交響的舞踊詩』ラヴェル最大規模の管弦楽。",
             "tags": ["breakthrough"]},
            {"year": 1914, "age": 39, "title": "第一次大戦に志願、運転手として従軍", "detail": "小柄で兵役不適格を押して志願。ヴェルダンの激戦地でトラックを運転した。",
             "tags": ["pride_broken"]},
            {"year": 1917, "age": 42, "title": "母マリーを失う", "detail": "最愛の母の死。『母を失った悲しみから立ち直れない』と手紙に書き、数年作曲できなかった。",
             "tags": ["loss", "heartbreak", "blank_period"]},
            {"year": 1928, "age": 53, "title": "『ボレロ』完成", "detail": "バレエダンサー・ルービンシュタインの依頼。『これは失敗作だ』と自ら予言したが、世界で最も演奏される管弦楽曲に。",
             "tags": ["breakthrough"]},
            {"year": 1932, "age": 57, "title": "タクシー事故で頭部打撲、失語症の始まり", "detail": "前頭側頭型認知症の発症とも。音楽は頭の中に鳴っているが、書けない・弾けない地獄が始まる。",
             "tags": ["illness", "pride_broken"]},
            {"year": 1937, "age": 62, "title": "脳手術後、意識を取り戻さず死去", "detail": "実験的な脳手術の2週間後。『ここにまだメロディーがある』と頭を指さした最後。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽とは、不可能な夢を、あたかも可能であるかのように語る言葉である。", "source": "ラヴェルの言葉"},
            {"text": "あなたは一流のガーシュウィンで、二流のラヴェルにはなるな。", "source": "弟子入りを求めたガーシュウィンに"},
            {"text": "ボレロ？ 不幸にも、音楽のない音楽だ。", "source": "自作を評して"}
        ],
        "works": [
            {"title": "ボレロ", "year": 1928, "type": "管弦楽",
             "description": "同じリズムが17分間続く魔術的クレッシェンド",
             "youtubeId": "mBe6v_4g3xc"},
            {"title": "ピアノ協奏曲 ト長調", "year": 1931, "type": "協奏曲",
             "description": "ジャズの影響も受けた晩年の光あふれる傑作",
             "youtubeId": "bLuE3OStE3c"},
            {"title": "亡き王女のためのパヴァーヌ", "year": 1899, "type": "ピアノ曲",
             "description": "学生時代の小品。最も愛される旋律のひとつ",
             "youtubeId": "LKEbT9Z2uv0"},
            {"title": "ダフニスとクロエ 第2組曲", "year": 1912, "type": "バレエ",
             "description": "『夜明け』『パントマイム』『全員の踊り』",
             "youtubeId": "BkPtaTQN_z4"},
            {"title": "クープランの墓", "year": 1917, "type": "ピアノ曲",
             "description": "戦死した友人たちに捧げた組曲。各曲にそれぞれの友の名前",
             "youtubeId": "d_JsYnUb8lg"},
            {"title": "水の戯れ", "year": 1901, "type": "ピアノ曲",
             "description": "印象主義ピアノ書法の出発点",
             "youtubeId": "1QWKoonvDnU"}
        ]
    },

    # ==================== サティ ====================
    "satie": {
        "events": [
            {"year": 1866, "age": 0, "title": "ノルマンディー・オンフルールに誕生", "detail": "4歳で母を失い、祖父母に引き取られる。その祖母も水死で失う。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1879, "age": 13, "title": "パリ音楽院入学、『最も怠惰な学生』と評される", "detail": "7年在籍して何も学ばず。教師から『ピアノの才能ゼロ、作曲も怠惰』と酷評された。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1887, "age": 21, "title": "キャバレー『黒猫』でピアニストに", "detail": "モンマルトルの夜の世界へ。奇妙な服装で現れるボヘミアンとなる。",
             "tags": ["restart"]},
            {"year": 1888, "age": 22, "title": "『3つのジムノペディ』作曲", "detail": "単調な和声進行と空虚な美の発見。当時は全く売れなかった。",
             "tags": ["breakthrough"]},
            {"year": 1893, "age": 27, "title": "画家シュザンヌ・ヴァラドンとの6ヶ月の恋", "detail": "生涯唯一の恋愛。彼女が去った日、サティは『凍えた悲しみだけが残った』と日記に。以後独身。",
             "tags": ["heartbreak", "isolation"]},
            {"year": 1898, "age": 32, "title": "郊外アルクイユの小部屋に移住", "detail": "パリまで徒歩で通う生活。27年間ここに住んだ。誰も部屋に入れなかった。",
             "tags": ["isolation", "restart"]},
            {"year": 1905, "age": 39, "title": "スコラ・カントルムに入学", "detail": "39歳で改めて対位法を学び直す。『貧者の学校』で3年。",
             "tags": ["restart"]},
            {"year": 1917, "age": 50, "title": "バレエ『パラード』、コクトー・ピカソと", "detail": "ピカソ衣装、コクトー脚本、マシーヌ振付。サイレン・タイプライターを使った前衛。大スキャンダル。",
             "tags": ["breakthrough", "pride_broken"]},
            {"year": 1920, "age": 54, "title": "『家具の音楽』提唱", "detail": "『聞かれない音楽』としてのBGMの発明。休憩中にサティは『聴かないでください！』と叫んだ。",
             "tags": []},
            {"year": 1925, "age": 59, "title": "アルクイユで肝硬変により死去", "detail": "死後初めて友人たちが部屋に入り、発見された。ピアノの後ろの山のような未発表原稿、未開封のプレゼント、同じ傘が複数、ブラシが山積み。",
             "tags": ["loss", "isolation"]}
        ],
        "quotes": [
            {"text": "人生で一番大事なのは、退屈しないことだ。", "source": "サティの日記"},
            {"text": "家具の音楽——人々が聴かずに聴き流すための音楽。", "source": "サティの新ジャンル提唱"},
            {"text": "私は若すぎる世界に、歳を取りすぎて生まれた。", "source": "サティの言葉"},
            {"text": "聴かないでください！ 聴かないで！", "source": "『家具の音楽』初演中に叫んだ言葉"},
            {"text": "いつもと同じに、でも違うように。", "source": "弟子への助言"}
        ],
        "works": [
            {"title": "3つのジムノペディ", "year": 1888, "type": "ピアノ曲",
             "description": "『第1番』は20世紀で最も再生された曲のひとつ",
             "youtubeId": "S-Xm7s9eGxU"},
            {"title": "3つのグノシエンヌ", "year": 1890, "type": "ピアノ曲",
             "description": "小節線のない幻想的なピアノ曲集",
             "youtubeId": "2g5xkL4JEjc"},
            {"title": "ヴェクサシオン", "year": 1893, "type": "ピアノ曲",
             "description": "1ページのフレーズを840回繰り返す、約18時間の作品",
             "youtubeId": "GeZKrDw7EZQ"},
            {"title": "バレエ『パラード』", "year": 1917, "type": "バレエ",
             "description": "タイプライター・サイレンが登場する前衛音楽の代表作",
             "youtubeId": "xEQOebqTnN0"},
            {"title": "ジュ・トゥ・ヴ", "year": 1900, "type": "歌曲",
             "description": "『あなたが欲しい』。キャバレー時代のワルツ",
             "youtubeId": "WFwJdyTsKCA"}
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


def merge_works(existing, new):
    titles = set(w.get("title") for w in existing)
    for w in new:
        if w.get("title") in titles:
            continue
        existing.append(w)
    return existing


def main():
    count = 0
    for pid, data in ENRICH.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            print(f"SKIP (no file): {pid}")
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        before = {
            "events": len(d.get("events", [])),
            "quotes": len(d.get("quotes", [])),
            "works": len(d.get("works", []))
        }
        if "events" in data:
            d["events"] = merge_events(d.get("events", []), data["events"])
        if "quotes" in data:
            d["quotes"] = merge_quotes(d.get("quotes", []), data["quotes"])
        if "works" in data:
            d["works"] = merge_works(d.get("works", []), data["works"])
        after = {
            "events": len(d.get("events", [])),
            "quotes": len(d.get("quotes", [])),
            "works": len(d.get("works", []))
        }
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        count += 1
        e_d = after["events"] - before["events"]
        q_d = after["quotes"] - before["quotes"]
        w_d = after["works"] - before["works"]
        print(f"OK: {pid}  events +{e_d}={after['events']}, quotes +{q_d}={after['quotes']}, works +{w_d}={after['works']}")
    print(f"\n{count}人を深化完了")


if __name__ == "__main__":
    main()
