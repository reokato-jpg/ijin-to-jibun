# -*- coding: utf-8 -*-
"""一気に偉人を追加するスクリプト（編集しやすいよう一箇所に集約）"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"
MANIFEST = ROOT / "data" / "manifest.json"

PEOPLE_DATA = [
    # ============ 哲学者 ============
    {
        "id": "socrates", "name": "ソクラテス", "nameEn": "Socrates",
        "birth": -470, "death": -399, "country": "古代ギリシャ",
        "field": "哲学者",
        "summary": "書かれた著作を一切残さず、アテネの街頭で問答を繰り返した西洋哲学の祖。『無知の知』を説き、国家を堕落させた罪で死刑に処され、毒杯を自ら仰いだ。",
        "events": [
            {"year": -470, "age": 0, "title": "アテネに石工の子として誕生", "detail": "母は助産婦。『産婆術』と呼ぶ問答法の原点はここから。", "tags": ["approval"]},
            {"year": -431, "age": 39, "title": "ペロポネソス戦争に従軍", "detail": "勇敢な戦士として何度も命を救った記録が残る。", "tags": []},
            {"year": -399, "age": 70, "title": "裁判で死刑判決、毒杯を仰ぐ", "detail": "『国家の神を認めず若者を堕落させた』として告発。自ら毒ニンジンを飲んで死去。『汝自身を知れ』", "tags": ["loss", "pride_broken"]}
        ],
        "quotes": [
            {"text": "私が知っていることは、私が何も知らないということだけだ。", "source": "『ソクラテスの弁明』"},
            {"text": "汝自身を知れ。", "source": "デルフォイの神託に由来"}
        ],
        "relations": [
            {"name": "プラトン", "id": "plato", "relation": "弟子", "note": "ソクラテスの問答を記録に残した最大の継承者"},
            {"name": "クセノフォン", "relation": "弟子", "note": "『ソクラテスの思い出』の著者"}
        ],
        "places": [
            {"name": "アクロポリス・アゴラ", "location": "ギリシャ・アテネ", "note": "ソクラテスが問答を行った広場"},
            {"name": "ソクラテスの牢獄", "location": "ギリシャ・アテネ・フィロパポスの丘", "note": "死刑を待った洞窟と伝わる場所"}
        ],
        "books": [
            {"title": "ソクラテスの弁明・クリトン", "author": "プラトン", "asin": "4003360117", "description": "裁判の記録。哲学の原点の書"}
        ]
    },
    {
        "id": "plato", "name": "プラトン", "nameEn": "Plato",
        "birth": -427, "death": -347, "country": "古代ギリシャ", "field": "哲学者",
        "summary": "ソクラテスの弟子。アカデメイアを創立し、『国家』『饗宴』などの対話篇で西洋思想の基礎を築いた。『イデア論』で現実の奥にある永遠の形相を説いた。",
        "events": [
            {"year": -427, "age": 0, "title": "アテネの名門貴族に誕生", "detail": "本名アリストクレス。『プラトン』は『広い肩』の意の渾名。", "tags": ["approval"]},
            {"year": -399, "age": 28, "title": "師ソクラテス刑死に衝撃", "detail": "政治家の道を諦め、哲学に生涯を捧げる決意。", "tags": ["loss", "turning_encounter"]},
            {"year": -387, "age": 40, "title": "アカデメイアを創立", "detail": "西洋初の高等教育機関。900年続いた。", "tags": ["breakthrough", "restart"]},
            {"year": -347, "age": 80, "title": "執筆中に死去", "detail": "書斎でペンを握ったまま息を引き取ったと伝わる。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "哲学は驚きから始まる。", "source": "『テアイテトス』"},
            {"text": "良き始まりは半ばの成功である。", "source": "伝承"}
        ],
        "relations": [
            {"name": "ソクラテス", "id": "socrates", "relation": "師", "note": "刑死した師の言葉を対話篇に遺した"},
            {"name": "アリストテレス", "id": "aristotle", "relation": "弟子", "note": "アカデメイアで20年学んだ最高の弟子"}
        ],
        "places": [
            {"name": "アカデメイア跡", "location": "ギリシャ・アテネ", "note": "プラトンが創立した学園の跡地、現・公園"}
        ],
        "books": [
            {"title": "国家 上", "author": "プラトン", "asin": "4003360125", "description": "哲学者王・イデア論・洞窟の比喩"},
            {"title": "饗宴", "author": "プラトン", "asin": "4003360141", "description": "愛について語る対話篇の最高傑作"}
        ]
    },
    {
        "id": "aristotle", "name": "アリストテレス", "nameEn": "Aristotle",
        "birth": -384, "death": -322, "country": "古代ギリシャ", "field": "哲学者",
        "summary": "プラトンの弟子、アレクサンドロス大王の家庭教師。論理学・倫理学・政治学・生物学・詩学を体系化した『万学の祖』。リュケイオンを創立。",
        "events": [
            {"year": -384, "age": 0, "title": "北ギリシャ・スタゲイラに誕生", "detail": "父はマケドニア王の侍医。幼くして両親を失う。", "tags": ["loss"]},
            {"year": -367, "age": 17, "title": "プラトンのアカデメイアに入学", "detail": "20年学び、プラトンの次世代の頭脳となる。", "tags": ["turning_encounter"]},
            {"year": -343, "age": 41, "title": "アレクサンドロス大王の家庭教師に", "detail": "後の世界征服者を3年教育。哲学が現実政治と結びついた瞬間。", "tags": ["turning_encounter"]},
            {"year": -335, "age": 49, "title": "リュケイオンを創立", "detail": "散歩しながら講義するスタイルから『逍遥学派』と呼ばれた。", "tags": ["restart"]},
            {"year": -322, "age": 62, "title": "カルキスで病没", "detail": "反マケドニア運動に巻き込まれアテネから逃れ、翌年没。", "tags": ["escape", "loss"]}
        ],
        "quotes": [
            {"text": "人間は社会的な動物である。", "source": "『政治学』"},
            {"text": "徳とは習慣である。繰り返し行うことが、我々自身になる。", "source": "『ニコマコス倫理学』"}
        ],
        "places": [
            {"name": "リュケイオン跡", "location": "ギリシャ・アテネ", "note": "アリストテレスの学園跡地"},
            {"name": "スタゲイラ", "location": "ギリシャ北部", "note": "生誕地"}
        ],
        "books": [
            {"title": "ニコマコス倫理学 上", "author": "アリストテレス", "asin": "4334750745", "description": "幸福と徳について。西洋倫理学の古典"}
        ]
    },
    {
        "id": "descartes", "name": "ルネ・デカルト", "nameEn": "René Descartes",
        "birth": 1596, "death": 1650, "country": "フランス → オランダ → スウェーデン",
        "field": "哲学者・数学者",
        "summary": "『我思う、ゆえに我あり』で近代哲学を始めた人物。すべてを疑い、疑っている自分だけは疑えないと確かめた。スウェーデン女王のため早朝講義を強いられ肺炎で客死。",
        "events": [
            {"year": 1596, "age": 0, "title": "フランス・トゥレーヌに誕生", "detail": "病弱で生後まもなく母を亡くす。", "tags": ["loss"]},
            {"year": 1619, "age": 23, "title": "三つの夢", "detail": "ドイツの暖炉部屋で見た夢が、新しい学問の方法を示したとされる。", "tags": ["turning_encounter"]},
            {"year": 1637, "age": 41, "title": "『方法序説』刊行", "detail": "ラテン語でなくフランス語で書き、広く読まれた革命的書。", "tags": ["breakthrough"]},
            {"year": 1641, "age": 45, "title": "『省察』刊行", "detail": "『我思う、ゆえに我あり』を体系的に展開。", "tags": ["breakthrough"]},
            {"year": 1650, "age": 53, "title": "ストックホルムで肺炎死", "detail": "女王クリスティーナの朝5時の講義に通ううち体調を崩す。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "我思う、ゆえに我あり。", "source": "『方法序説』『省察』"},
            {"text": "よい本を読むことは、過去のもっとも優れた人々との対話である。", "source": "『方法序説』"}
        ],
        "places": [
            {"name": "デカルト記念館", "location": "フランス・デカルト村", "note": "生家を改装した博物館"},
            {"name": "サン=ジェルマン=デ=プレ教会", "location": "フランス・パリ", "note": "デカルトの墓"}
        ],
        "books": [
            {"title": "方法序説", "author": "ルネ・デカルト", "asin": "4003361318", "description": "近代哲学の出発点。短く深い古典"}
        ]
    },
    {
        "id": "schopenhauer", "name": "アルトゥル・ショーペンハウアー", "nameEn": "Arthur Schopenhauer",
        "birth": 1788, "death": 1860, "country": "ドイツ", "field": "哲学者",
        "summary": "『生きる意志』を根源と見た厭世主義の哲学者。30歳の主著『意志と表象としての世界』は30年無視され続けたが、晩年に爆発的人気を得た。",
        "events": [
            {"year": 1788, "age": 0, "title": "ダンツィヒの裕福な商家に誕生", "detail": "父は商人で後に自殺、母は当時人気の小説家。", "tags": ["parent_conflict"]},
            {"year": 1819, "age": 31, "title": "『意志と表象としての世界』出版", "detail": "誰からも相手にされず。書庫で埃をかぶった。", "tags": ["setback", "isolation"]},
            {"year": 1820, "age": 32, "title": "ベルリン大学でヘーゲルに対抗", "detail": "同時間帯に講義を組んだが、学生は全員ヘーゲルへ。無名のまま30年。", "tags": ["jealousy", "setback"]},
            {"year": 1851, "age": 63, "title": "『余録と補遺』刊行、突然の人気", "detail": "平明な随筆集がベストセラーに。30年の孤独が報われた。", "tags": ["breakthrough", "approval"]},
            {"year": 1860, "age": 72, "title": "フランクフルトで死去", "detail": "愛犬アトマと暮らした下宿で。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "読書は他人にものを考えてもらうことである。", "source": "『読書について』"},
            {"text": "幸福の第一条件は、名誉ではなく健康である。", "source": "『幸福について』"}
        ],
        "places": [
            {"name": "ショーペンハウアーアルヒーフ", "location": "ドイツ・フランクフルト", "note": "大学に併設の記念施設"}
        ],
        "books": [
            {"title": "読書について", "author": "ショーペンハウアー", "asin": "4334753264", "description": "なぜ『考えて読むこと』が大切か"},
            {"title": "幸福について", "author": "ショーペンハウアー", "asin": "4334753248", "description": "人生を穏やかに生きるための知恵"}
        ]
    },
    {
        "id": "kierkegaard", "name": "セーレン・キルケゴール", "nameEn": "Søren Kierkegaard",
        "birth": 1813, "death": 1855, "country": "デンマーク", "field": "哲学者",
        "summary": "実存主義の先駆者。婚約破棄と自己批判の中で『あれか、これか』『死に至る病』を書き、42歳の若さで倒れた。『神の前に立つ単独者』。",
        "events": [
            {"year": 1813, "age": 0, "title": "コペンハーゲンの商家に誕生", "detail": "厳格なキリスト教の父に罪意識を叩き込まれて育つ。", "tags": ["parent_conflict"]},
            {"year": 1841, "age": 28, "title": "レギーネ・オルセンとの婚約を自ら破棄", "detail": "愛するがゆえに『自分は結婚するに値しない』と離れた。生涯彼女を想い続けた。", "tags": ["heartbreak", "self_denial"]},
            {"year": 1843, "age": 30, "title": "『あれか、これか』『おそれとおののき』", "detail": "匿名と実名を使い分け、膨大な著作活動の始まり。", "tags": ["breakthrough"]},
            {"year": 1849, "age": 36, "title": "『死に至る病』刊行", "detail": "絶望を『死に至る病』として分析。実存主義の原点。", "tags": ["breakthrough"]},
            {"year": 1855, "age": 42, "title": "路上で倒れ急死", "detail": "所持金を使い果たした直後、コペンハーゲンの街で意識を失った。", "tags": ["loss", "poverty"]}
        ],
        "quotes": [
            {"text": "あれか、これか。それが問題である。", "source": "『あれか、これか』"},
            {"text": "絶望は死に至る病である。", "source": "『死に至る病』"}
        ],
        "places": [
            {"name": "コペンハーゲン・アシステンス墓地", "location": "デンマーク・コペンハーゲン", "note": "父と並ぶ墓"},
            {"name": "キルケゴール博物館", "location": "デンマーク・コペンハーゲン", "note": "遺品と草稿を展示"}
        ],
        "books": [
            {"title": "死に至る病", "author": "キルケゴール", "asin": "4003363612", "description": "『絶望とは自分自身であることを欲せぬこと』"}
        ]
    },
    {
        "id": "sartre", "name": "ジャン＝ポール・サルトル", "nameEn": "Jean-Paul Sartre",
        "birth": 1905, "death": 1980, "country": "フランス", "field": "哲学者・小説家",
        "summary": "実存主義の旗手。『存在と無』『嘔吐』で戦後思想を牽引し、ボーヴォワールと契約結婚の関係を50年続けた。ノーベル文学賞を辞退した唯一の人物。",
        "events": [
            {"year": 1905, "age": 0, "title": "パリに誕生、1歳で父を失う", "detail": "厳格な祖父に育てられる。幼少期の孤独が実存主義の源に。", "tags": ["loss", "parent_conflict"]},
            {"year": 1929, "age": 24, "title": "シモーヌ・ド・ボーヴォワールと契約結婚", "detail": "『他の愛もあり、すべてを打ち明け合う』。以後50年続く知の共同体。", "tags": ["turning_encounter"]},
            {"year": 1943, "age": 38, "title": "『存在と無』刊行", "detail": "第二次大戦下の執筆。『人間は自由の刑に処せられている』", "tags": ["breakthrough"]},
            {"year": 1964, "age": 59, "title": "ノーベル文学賞を辞退", "detail": "『作家を制度化したくない』と史上唯一の辞退。", "tags": ["pride_broken", "self_reinvention"]},
            {"year": 1980, "age": 74, "title": "パリで死去", "detail": "葬儀には5万人が行列を作った。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間は自由の刑に処せられている。", "source": "『存在と無』"},
            {"text": "実存は本質に先立つ。", "source": "『実存主義とは何か』"}
        ],
        "relations": [
            {"name": "シモーヌ・ド・ボーヴォワール", "id": "beauvoir", "relation": "生涯の伴侶・思想的パートナー", "years": "1929–1980"}
        ],
        "places": [
            {"name": "カフェ・ド・フロール", "location": "フランス・パリ・サン=ジェルマン=デ=プレ", "note": "ボーヴォワールと毎日通ったカフェ"},
            {"name": "モンパルナス墓地", "location": "フランス・パリ", "note": "ボーヴォワールと並ぶ墓"}
        ],
        "books": [
            {"title": "嘔吐", "author": "サルトル", "asin": "4409140078", "description": "実存を生々しく描いた小説"},
            {"title": "実存主義とは何か", "author": "サルトル", "asin": "4409030620", "description": "サルトル哲学の最良の入門書"}
        ]
    },
    {
        "id": "beauvoir", "name": "シモーヌ・ド・ボーヴォワール", "nameEn": "Simone de Beauvoir",
        "birth": 1908, "death": 1986, "country": "フランス", "field": "哲学者・小説家",
        "summary": "『第二の性』で現代フェミニズムの礎を築いた哲学者。『人は女に生まれるのではない、女になるのだ』。サルトルとの契約結婚は50年続いた。",
        "events": [
            {"year": 1908, "age": 0, "title": "パリの中産階級の家に誕生", "detail": "厳格なカトリック教育を受ける。", "tags": ["parent_conflict"]},
            {"year": 1929, "age": 21, "title": "サルトルと出会い契約結婚へ", "detail": "教員試験で2位（サルトルは1位）。知と恋の共同体が始まる。", "tags": ["turning_encounter"]},
            {"year": 1949, "age": 41, "title": "『第二の性』刊行", "detail": "『人は女に生まれるのではない、女になるのだ』。世界に衝撃。", "tags": ["breakthrough", "self_reinvention"]},
            {"year": 1980, "age": 72, "title": "サルトルの死", "detail": "『彼の死が私の中の何かを決定的に断ち切った』と『別れの儀式』に記す。", "tags": ["loss"]},
            {"year": 1986, "age": 78, "title": "パリで死去", "detail": "サルトルと並ぶ墓に。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人は女に生まれるのではない、女になるのだ。", "source": "『第二の性』"},
            {"text": "愛は服従ではない。", "source": "書簡"}
        ],
        "relations": [
            {"name": "ジャン＝ポール・サルトル", "id": "sartre", "relation": "生涯の伴侶", "years": "1929–1980"}
        ],
        "places": [
            {"name": "モンパルナス墓地", "location": "フランス・パリ", "note": "サルトルと並ぶ墓"}
        ],
        "books": [
            {"title": "第二の性", "author": "ボーヴォワール", "asin": "4406029850", "description": "フェミニズムの記念碑的名著"}
        ]
    },
    {
        "id": "nishida", "name": "西田幾多郎", "nameEn": "Nishida Kitaro",
        "birth": 1870, "death": 1945, "country": "日本", "field": "哲学者",
        "summary": "日本最初のオリジナル哲学を打ち立てた『京都学派』の祖。『善の研究』『無の場所』で東洋思想と西洋哲学を接続した。禅の体験と論理が融合する独自の思想。",
        "events": [
            {"year": 1870, "age": 0, "title": "石川県宇ノ気の地主の家に誕生", "detail": "幼少期から学問を愛する少年だった。", "tags": ["approval"]},
            {"year": 1890, "age": 20, "title": "第四高等中学校を中退", "detail": "体調不良と家庭の事情で。『選科生』として再出発。", "tags": ["setback", "restart"]},
            {"year": 1911, "age": 41, "title": "『善の研究』刊行", "detail": "日本初の独創的哲学書。『純粋経験』の概念。", "tags": ["breakthrough"]},
            {"year": 1910, "age": 40, "title": "京都帝大助教授に", "detail": "以後、京都学派の中心人物として後進を育てた。", "tags": ["restart"]},
            {"year": 1945, "age": 75, "title": "敗戦直前の鎌倉で死去", "detail": "戦時中、軍部に利用されることを恐れつつ思索を続けた。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "我々の直接の実在は、意識現象以外のものではない。", "source": "『善の研究』"}
        ],
        "places": [
            {"name": "哲学の道", "location": "京都市左京区", "note": "西田が思索しながら歩いた散歩道"},
            {"name": "西田幾多郎記念哲学館", "location": "石川県かほく市", "note": "安藤忠雄設計の記念館"}
        ],
        "books": [
            {"title": "善の研究", "author": "西田幾多郎", "asin": "4003312414", "description": "日本初の独自哲学書"}
        ]
    },
    {
        "id": "kant_hannah", "name": "ハンナ・アーレント", "nameEn": "Hannah Arendt",
        "birth": 1906, "death": 1975, "country": "ドイツ → アメリカ", "field": "哲学者・政治思想家",
        "summary": "ハイデガーの弟子でユダヤ人。ナチスを逃れアメリカへ亡命、『全体主義の起原』『人間の条件』で20世紀の政治思想を変えた。『悪の凡庸さ』は現代を象徴する言葉。",
        "events": [
            {"year": 1906, "age": 0, "title": "ハノーファーのユダヤ人家庭に誕生", "detail": "父は7歳のときに病没。", "tags": ["loss"]},
            {"year": 1924, "age": 18, "title": "マールブルク大学でハイデガーに師事", "detail": "17歳年上の師と4年にわたる秘密の恋愛関係に入る。", "tags": ["turning_encounter", "heartbreak"]},
            {"year": 1933, "age": 26, "title": "ゲシュタポに逮捕、パリへ亡命", "detail": "釈放後ユダヤ難民を助ける活動に従事。", "tags": ["escape", "isolation"]},
            {"year": 1941, "age": 34, "title": "ニューヨークへ到着", "detail": "以後アメリカで思索を深める。英語で書くことを学んだ。", "tags": ["restart", "self_reinvention"]},
            {"year": 1961, "age": 55, "title": "アイヒマン裁判を傍聴", "detail": "『悪の凡庸さ』という衝撃の概念を提示。ユダヤ人社会から激しく非難された。", "tags": ["breakthrough", "pride_broken"]},
            {"year": 1975, "age": 69, "title": "ニューヨークで急死", "detail": "執筆中に心筋梗塞。『思考』の第三部は未完。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "思考停止こそが悪の本質である。", "source": "『エルサレムのアイヒマン』"},
            {"text": "自由は行為の中にのみある。", "source": "『人間の条件』"}
        ],
        "relations": [
            {"name": "マルティン・ハイデガー", "relation": "師・恋人", "note": "17歳年上の既婚者。ナチス協力で一時決別するも晩年に再会"}
        ],
        "places": [
            {"name": "バード・カレッジ", "location": "アメリカ・ニューヨーク州", "note": "遺骸が眠るリベラルアーツ大学"}
        ],
        "books": [
            {"title": "人間の条件", "author": "ハンナ・アーレント", "asin": "4480081569", "description": "労働・仕事・活動を分ける画期的政治哲学"}
        ]
    },
    # ============ 作曲家 ============
    {
        "id": "handel", "name": "ゲオルク・フリードリヒ・ヘンデル", "nameEn": "George Frideric Handel",
        "birth": 1685, "death": 1759, "country": "ドイツ → イギリス", "field": "作曲家",
        "summary": "バッハと同年生まれのバロック音楽のもう一方の巨匠。オペラの興行で大成功し倒産し、52歳で脳卒中から復活、晩年は盲目でオラトリオ『メサイア』を指揮した。",
        "events": [
            {"year": 1685, "age": 0, "title": "ハレの外科医の家に誕生", "detail": "音楽を嫌う父に隠れて屋根裏でクラヴィコードを弾いた少年時代。", "tags": ["parent_conflict"]},
            {"year": 1712, "age": 27, "title": "ロンドンに移住", "detail": "以後47年イギリスで活動。のちに帰化。", "tags": ["restart", "self_reinvention"]},
            {"year": 1737, "age": 52, "title": "脳卒中で右半身麻痺", "detail": "オペラ興行の倒産と過労で倒れる。温泉療養で奇跡的に回復。", "tags": ["illness", "setback"]},
            {"year": 1741, "age": 56, "title": "『メサイア』を24日で作曲", "detail": "没落の底で書かれた傑作。ダブリン初演は大成功。", "tags": ["breakthrough", "restart"]},
            {"year": 1751, "age": 66, "title": "失明", "detail": "白内障手術の失敗で視力を失う。口述筆記で作曲を続けた。", "tags": ["illness", "loss"]},
            {"year": 1759, "age": 74, "title": "『メサイア』指揮の8日後に死去", "detail": "ウェストミンスター寺院に王のごとく葬られた。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "もし私の音楽が聴衆を楽しませただけなら、申し訳なく思う。私は彼らを良くしたいのだ。", "source": "ロンドン初演後"}
        ],
        "places": [
            {"name": "ヘンデル・ハウス博物館", "location": "イギリス・ロンドン", "note": "『メサイア』を作曲した住居"},
            {"name": "ウェストミンスター寺院", "location": "ロンドン", "note": "遺体が眠る"}
        ],
        "books": [
            {"title": "ヘンデル", "author": "ジョナサン・キーツ", "asin": "4393933079", "description": "英国を魅了した巨匠の評伝"}
        ]
    },
    {
        "id": "schubert", "name": "フランツ・シューベルト", "nameEn": "Franz Schubert",
        "birth": 1797, "death": 1828, "country": "オーストリア", "field": "作曲家",
        "summary": "600曲以上の歌曲で知られる『歌曲の王』。生涯ウィーンを離れず、貧困のうちに31歳で梅毒の合併症により没した。『未完成』交響曲と『冬の旅』が代表作。",
        "events": [
            {"year": 1797, "age": 0, "title": "ウィーン郊外の教師の家に誕生", "detail": "14人兄弟、9人が夭折。音楽的な家庭で育つ。", "tags": ["loss"]},
            {"year": 1815, "age": 18, "title": "1年で140曲を作曲", "detail": "『魔王』『野ばら』含む驚異的な多作。", "tags": ["breakthrough"]},
            {"year": 1822, "age": 25, "title": "梅毒発症、『未完成』交響曲", "detail": "生涯の闇の始まりにして、最も有名な楽曲。", "tags": ["illness", "breakthrough"]},
            {"year": 1827, "age": 30, "title": "『冬の旅』連作歌曲", "detail": "迫り来る死と失恋の暗い歌集。友人たちは暗さに困惑した。", "tags": ["loss", "breakthrough"]},
            {"year": 1828, "age": 31, "title": "腸チフスで死去", "detail": "敬愛するベートーヴェンの隣に埋葬された。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "私の終わりが来たとき、私はまだ表現すべきことを半分も表現していなかった。", "source": "日記"}
        ],
        "places": [
            {"name": "シューベルトの生家", "location": "ウィーン9区", "note": "博物館"},
            {"name": "中央墓地", "location": "ウィーン", "note": "ベートーヴェンと並ぶ墓"}
        ],
        "books": [
            {"title": "シューベルト", "author": "クリストファー・H・ギブス", "asin": "4393932285", "description": "短い生涯と豊穣な音楽"}
        ]
    },
    {
        "id": "brahms", "name": "ヨハネス・ブラームス", "nameEn": "Johannes Brahms",
        "birth": 1833, "death": 1897, "country": "ドイツ", "field": "作曲家",
        "summary": "ハンブルクの貧しい家に生まれ、20歳でシューマン夫妻に見出される。師の死後、14歳年上のクララを生涯愛し続けた。独身のまま、シューマンの子供たちを支えた。",
        "events": [
            {"year": 1833, "age": 0, "title": "ハンブルクの下町に誕生", "detail": "父はコントラバス奏者。貧しさから酒場で伴奏をして家計を助けた。", "tags": ["poverty"]},
            {"year": 1853, "age": 20, "title": "シューマン夫妻との出会い", "detail": "ロベルトが『新しい時代の天才』と激賞。以後クララを生涯愛した。", "tags": ["turning_encounter", "approval"]},
            {"year": 1854, "age": 21, "title": "シューマンが自殺未遂", "detail": "ブラームスはクララと子供たちを献身的に支え始める。", "tags": ["loss"]},
            {"year": 1876, "age": 43, "title": "交響曲第1番、21年の苦闘の末完成", "detail": "ベートーヴェンの影に怯えながら書き上げた。『第10交響曲』と評された。", "tags": ["breakthrough", "self_denial"]},
            {"year": 1896, "age": 63, "title": "クララ死去、翌年ブラームスも", "detail": "クララの葬儀に向かう途中で体調を崩す。1年後にクララを追うように没。", "tags": ["loss", "heartbreak"]}
        ],
        "quotes": [
            {"text": "本当の音楽を作るのは、簡単なことではない。", "source": "弟子への助言"}
        ],
        "relations": [
            {"name": "ロベルト・シューマン", "id": "schumann", "relation": "恩師", "note": "20歳で見いだしてくれた"},
            {"name": "クララ・シューマン", "relation": "生涯の想い人", "note": "14歳年上のピアニスト。愛を告げずに支え続けた"}
        ],
        "places": [
            {"name": "ブラームス博物館", "location": "ドイツ・ハンブルク", "note": "生地の記念施設"},
            {"name": "中央墓地", "location": "ウィーン", "note": "ベートーヴェン・シューベルトと並ぶ"}
        ],
        "books": [
            {"title": "ブラームス", "author": "三宅幸夫", "asin": "4393935225", "description": "愛と孤独の生涯"}
        ]
    },
    {
        "id": "wagner", "name": "リヒャルト・ワーグナー", "nameEn": "Richard Wagner",
        "birth": 1813, "death": 1883, "country": "ドイツ", "field": "作曲家",
        "summary": "『指環』『トリスタン』『パルジファル』で歌劇を『楽劇』に変えた革命家。借金と亡命と不倫と政治活動にまみれながら、バイロイト祝祭劇場を建てた。",
        "events": [
            {"year": 1813, "age": 0, "title": "ライプツィヒに誕生、半年で父を失う", "detail": "母は再婚し、俳優の養父のもとで育つ。", "tags": ["loss"]},
            {"year": 1849, "age": 36, "title": "ドレスデン革命に参加、亡命", "detail": "政治活動で指名手配。スイスへ12年の亡命生活。", "tags": ["escape", "self_reinvention"]},
            {"year": 1859, "age": 46, "title": "『トリスタンとイゾルデ』完成", "detail": "後の現代音楽の源流となる和声革命。", "tags": ["breakthrough"]},
            {"year": 1864, "age": 51, "title": "ルートヴィヒ2世の庇護", "detail": "バイエルン若き狂王に救われる。以後、彼の支援で全てが実現。", "tags": ["turning_encounter", "restart"]},
            {"year": 1876, "age": 63, "title": "バイロイト祝祭劇場開場、『指環』全曲初演", "detail": "自分の作品のためだけに劇場を建てた前代未聞の偉業。", "tags": ["breakthrough"]},
            {"year": 1883, "age": 69, "title": "ベネチアで心臓発作", "detail": "最期まで新作を構想していた。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私は時代のはるか先を歩いている。", "source": "書簡"}
        ],
        "relations": [
            {"name": "ルートヴィヒ2世", "relation": "パトロン", "note": "バイエルン若き狂王。ワーグナーに無限の資金を注いだ"},
            {"name": "フリードリヒ・ニーチェ", "id": "nietzsche", "relation": "崇拝者 → 決別", "note": "父代わりと慕ったが、後に破綻"}
        ],
        "places": [
            {"name": "バイロイト祝祭劇場", "location": "ドイツ・バイロイト", "note": "ワーグナー作品専用の劇場"},
            {"name": "ヴィラ・ヴァーンフリート", "location": "ドイツ・バイロイト", "note": "ワーグナーの家・墓"}
        ],
        "books": [
            {"title": "ワーグナー 政治と宗教のパトス", "author": "吉田寛", "asin": "4861824702", "description": "天才と毒を併せ持つ巨人の評伝"}
        ]
    },
    {
        "id": "mahler", "name": "グスタフ・マーラー", "nameEn": "Gustav Mahler",
        "birth": 1860, "death": 1911, "country": "オーストリア", "field": "作曲家・指揮者",
        "summary": "ユダヤ人、ボヘミア人、オーストリア人—『三重に祖国を失った男』。9つの交響曲で巨大な宇宙を描き、愛娘の死と心臓病の末に50歳で没。妻アルマとの複雑な関係も有名。",
        "events": [
            {"year": 1860, "age": 0, "title": "ボヘミアのユダヤ人家庭に誕生", "detail": "14人兄弟のうち8人が夭折。死と隣り合わせの幼少期。", "tags": ["loss"]},
            {"year": 1897, "age": 37, "title": "ウィーン宮廷歌劇場音楽監督", "detail": "指揮者として頂点に。しかしユダヤ人である限界を感じ、形だけカトリックに改宗。", "tags": ["approval", "breakthrough"]},
            {"year": 1902, "age": 41, "title": "アルマ・シントラーと結婚", "detail": "19歳年下の美貌の才媛。以後波乱の夫婦関係。", "tags": ["turning_encounter"]},
            {"year": 1907, "age": 47, "title": "長女マリアが猩紅熱で死去、心臓病と告知", "detail": "1年で全てを失う。『大地の歌』はここから生まれた。", "tags": ["loss", "illness"]},
            {"year": 1911, "age": 50, "title": "細菌性心内膜炎で死去", "detail": "第10交響曲未完のまま。『指揮をする時間がもう少しあれば』", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "交響曲は世界のようでなければならない。それはすべてを包含せねばならない。", "source": "シベリウスとの会話"}
        ],
        "places": [
            {"name": "マーラーの作曲小屋", "location": "オーストリア・マイアーニッヒ", "note": "夏の避暑地。多くの交響曲が生まれた"},
            {"name": "グリンツィング墓地", "location": "ウィーン", "note": "愛娘と並ぶ墓"}
        ],
        "books": [
            {"title": "マーラー", "author": "柴田南雄", "asin": "4000038028", "description": "『世界をまるごと歌う』交響曲の本質"}
        ]
    },
    {
        "id": "ravel", "name": "モーリス・ラヴェル", "nameEn": "Maurice Ravel",
        "birth": 1875, "death": 1937, "country": "フランス", "field": "作曲家",
        "summary": "『ボレロ』『水の戯れ』で精緻な色彩の音楽を書いた完璧主義者。生涯独身で、晩年は脳の障害で書けなくなり62歳で没した。小柄でダンディな孤独の人。",
        "events": [
            {"year": 1875, "age": 0, "title": "バスク地方シブールに誕生", "detail": "母はバスク人、父は発明家。バスクの民謡が生涯の感性に残る。", "tags": ["approval"]},
            {"year": 1905, "age": 30, "title": "ローマ大賞で4年連続落選", "detail": "音楽院アカデミズムとの決定的な亀裂。この事件がフランス音楽界に衝撃を与えた。", "tags": ["setback", "pride_broken"]},
            {"year": 1914, "age": 39, "title": "第一次大戦に志願", "detail": "小柄で兵役不適格だったが、トラック運転手として従軍。", "tags": ["self_reinvention"]},
            {"year": 1928, "age": 53, "title": "『ボレロ』初演", "detail": "17分間同じリズムの繰り返し。『これは傑作だ、ただ音楽は全く入っていないが』（本人）", "tags": ["breakthrough"]},
            {"year": 1932, "age": 57, "title": "タクシー事故、脳の機能障害", "detail": "曲は頭の中にあるのに書けなくなる。5年の苦しみの末没。", "tags": ["illness", "loss"]},
            {"year": 1937, "age": 62, "title": "脳手術の後遺症で死去", "detail": "書けないまま沈黙のうちに。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私の音楽には秘密などない、ただ正直さがあるだけだ。", "source": "インタビュー"}
        ],
        "places": [
            {"name": "ラヴェルの家（ル・ベルヴェデール）", "location": "フランス・モンフォール=ラモリー", "note": "ラヴェルが40歳から死ぬまで暮らした家。内装も本人デザイン"}
        ],
        "books": [
            {"title": "ラヴェル 生涯と作品", "author": "マドレーヌ・グート", "asin": "4276225361", "description": "緻密なラヴェル論"}
        ]
    },
    {
        "id": "satie", "name": "エリック・サティ", "nameEn": "Erik Satie",
        "birth": 1866, "death": 1925, "country": "フランス", "field": "作曲家",
        "summary": "『ジムノペディ』で知られる奇人の作曲家。黒いベルベット服と大量の傘を集め、6キロ離れたモンマルトルから毎日歩いて通った。家具の音楽の発明者。",
        "events": [
            {"year": 1866, "age": 0, "title": "ノルマンディーのオンフルールに誕生", "detail": "音楽家になるも社会に馴染めなかった。", "tags": ["isolation"]},
            {"year": 1888, "age": 22, "title": "『ジムノペディ』作曲", "detail": "静けさと物憂さ。50年後ドビュッシーがオーケストレーションして世に広まった。", "tags": ["breakthrough"]},
            {"year": 1893, "age": 27, "title": "シュザンヌ・ヴァラドンとの6ヶ月の恋", "detail": "唯一の恋愛。別れた日から手紙を書き続けたが送らなかった。", "tags": ["heartbreak", "isolation"]},
            {"year": 1917, "age": 51, "title": "バレエ『パラード』", "detail": "ピカソ衣装、コクトー台本、サティ音楽。前衛の爆発。", "tags": ["breakthrough"]},
            {"year": 1925, "age": 59, "title": "肝硬変で死去", "detail": "死後、27年誰も入れなかった部屋から大量の傘と未発表楽譜が出てきた。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "私は若すぎる世界で生まれるには、あまりにも老人すぎた。", "source": "自伝的断章"}
        ],
        "places": [
            {"name": "サティの家", "location": "フランス・オンフルール", "note": "生家を改装した奇想の博物館"},
            {"name": "アルクイユ", "location": "フランス・パリ南郊", "note": "晩年30年暮らした部屋のあった場所"}
        ],
        "books": [
            {"title": "サティ ありきたりの歓び", "author": "秋山邦晴", "asin": "4393936825", "description": "奇人の音楽と日常"}
        ]
    },
    {
        "id": "stravinsky", "name": "イーゴリ・ストラヴィンスキー", "nameEn": "Igor Stravinsky",
        "birth": 1882, "death": 1971, "country": "ロシア → スイス → フランス → アメリカ", "field": "作曲家",
        "summary": "『春の祭典』で音楽史に衝撃を与え、89年の生涯で古典主義・新古典主義・十二音技法と作風を変え続けた20世紀音楽の巨人。2度の亡命。",
        "events": [
            {"year": 1882, "age": 0, "title": "ペテルブルク郊外に誕生", "detail": "父はマリインスキー劇場のバス歌手。法律を学んだ後音楽へ。", "tags": ["approval"]},
            {"year": 1913, "age": 30, "title": "『春の祭典』パリ初演で大暴動", "detail": "シャンゼリゼ劇場で観客が怒号し殴り合い。音楽史最大のスキャンダル。", "tags": ["breakthrough", "pride_broken"]},
            {"year": 1914, "age": 31, "title": "革命で祖国を失う", "detail": "スイスへ避難、以後二度とロシアに帰らない。", "tags": ["loss", "escape"]},
            {"year": 1939, "age": 57, "title": "アメリカへ亡命", "detail": "ハリウッドに定住。英語を学び直し、最後の作風転換へ。", "tags": ["restart", "self_reinvention"]},
            {"year": 1971, "age": 88, "title": "ニューヨークで死去", "detail": "遺体はベネチアのセルゲイ・ディアギレフの隣に埋葬された。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "良い作曲家は模倣しない。盗む。", "source": "インタビュー"}
        ],
        "places": [
            {"name": "サン・ミケーレ島", "location": "イタリア・ベネチア", "note": "ディアギレフと並ぶ墓"}
        ],
        "books": [
            {"title": "ストラヴィンスキー自伝", "author": "ストラヴィンスキー", "asin": "4560081328", "description": "本人が語る自分の20世紀"}
        ]
    },
    {
        "id": "shostakovich", "name": "ドミトリー・ショスタコーヴィチ", "nameEn": "Dmitri Shostakovich",
        "birth": 1906, "death": 1975, "country": "ソ連", "field": "作曲家",
        "summary": "スターリン独裁下を生き抜いたソ連の作曲家。15曲の交響曲に体制への恐怖と抵抗を暗号のように込めた。公の『人民芸術家』と、私の『皮肉屋』の二重生活。",
        "events": [
            {"year": 1906, "age": 0, "title": "ペテルブルクに誕生", "detail": "父は化学技師、家庭は革命への共感を持っていた。", "tags": []},
            {"year": 1925, "age": 19, "title": "交響曲第1番で国際的デビュー", "detail": "19歳の卒業作品。一躍世界の注目を集める。", "tags": ["breakthrough", "approval"]},
            {"year": 1936, "age": 29, "title": "スターリンの粛清を警告される", "detail": "オペラを批判され、プラウダ紙に『音楽ではなく混乱』と書かれた。寝る時もスーツケースを枕元に置いた。", "tags": ["setback", "self_denial", "isolation"]},
            {"year": 1937, "age": 31, "title": "交響曲第5番で復帰", "detail": "『正当な批判への作曲家の応答』という副題。体制への服従と抵抗の二重の表現。", "tags": ["breakthrough", "self_reinvention"]},
            {"year": 1948, "age": 42, "title": "再び粛清、ジダーノフ批判", "detail": "『形式主義』と糾弾され、公職を失う。以後も創作は続けた。", "tags": ["setback", "pride_broken"]},
            {"year": 1975, "age": 68, "title": "肺癌で死去", "detail": "『真実を語ることができたのは音楽の中だけだった』", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽を書くことは、恐怖の中でも生き続けることだった。", "source": "『ショスタコーヴィチの証言』"}
        ],
        "places": [
            {"name": "ノヴォデヴィチ墓地", "location": "ロシア・モスクワ", "note": "ロシア芸術家が眠る"}
        ],
        "books": [
            {"title": "ショスタコーヴィチの証言", "author": "ソロモン・ヴォルコフ", "asin": "4120028283", "description": "体制下を生きた作曲家の告白"}
        ]
    },
    {
        "id": "takemitsu", "name": "武満徹", "nameEn": "Toru Takemitsu",
        "birth": 1930, "death": 1996, "country": "日本", "field": "作曲家",
        "summary": "独学で20世紀日本を代表する作曲家に。『ノヴェンバー・ステップス』で日本の楽器と西洋オーケストラを融合、映画音楽『乱』『他人の顔』などでも世界的評価を得た。",
        "events": [
            {"year": 1930, "age": 0, "title": "東京に誕生、すぐに満州へ", "detail": "父の仕事で大陸で幼少期を過ごす。", "tags": []},
            {"year": 1945, "age": 15, "title": "敗戦で音楽に目覚める", "detail": "ラジオから流れるシャンソン『パルレ・モワ・ダムール』に衝撃。", "tags": ["turning_encounter"]},
            {"year": 1950, "age": 20, "title": "新作曲派協会で作曲家デビュー", "detail": "独学、正規の音楽教育なし。", "tags": ["breakthrough"]},
            {"year": 1967, "age": 37, "title": "『ノヴェンバー・ステップス』初演", "detail": "琵琶・尺八とオーケストラ。日本音楽の国際デビュー。", "tags": ["breakthrough", "self_reinvention"]},
            {"year": 1996, "age": 65, "title": "膀胱癌で死去", "detail": "映画・現代音楽・ポピュラー全てで足跡を残した。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "音は沈黙の中から生まれ、沈黙の中へ還っていく。", "source": "エッセイ"}
        ],
        "places": [
            {"name": "軽井沢", "location": "長野県北佐久郡", "note": "山荘で多くの作品を書いた"}
        ],
        "books": [
            {"title": "時の園丁", "author": "武満徹", "asin": "4106023202", "description": "音と沈黙についての随筆"}
        ]
    },
]

added = 0
for p in PEOPLE_DATA:
    f = PEOPLE / f"{p['id']}.json"
    if f.exists():
        print(f"SKIP: {p['id']}")
        continue
    f.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
    added += 1
    print(f"OK: {p['id']} {p['name']}")

# manifest更新
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
existing = set(manifest["people"])
for p in PEOPLE_DATA:
    if p["id"] not in existing:
        manifest["people"].append(p["id"])
MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n{added}人追加完了。合計{len(manifest['people'])}人")
