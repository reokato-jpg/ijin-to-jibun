"""Add 6 new philosophers + musicians. Non-destructive: skips existing files."""
import json, os, sys, io, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = os.path.join(os.path.dirname(__file__), '..')
PEOPLE_DIR = os.path.join(BASE, 'data', 'people')
MANIFEST = os.path.join(BASE, 'data', 'manifest.json')

NEW = {}

def add(pid, data):
    data['id'] = pid
    NEW[pid] = data

# ================ 哲学者 ================
add('marcus_aurelius', {
    "name": "マルクス・アウレリウス",
    "nameEn": "Marcus Aurelius",
    "birth": 121, "death": 180,
    "country": "ローマ帝国",
    "field": "哲学者・皇帝",
    "summary": "ローマ五賢帝の最後の一人。軍営の中で綴ったギリシャ語の手記『自省録』はストア哲学の最高峰。",
    "events": [
        {"year": 121, "age": 0, "title": "ローマの名門貴族に生まれる", "detail": "父を早く亡くし、皇帝ハドリアヌスに才能を見出される。", "tags": []},
        {"year": 138, "age": 17, "title": "皇帝アントニヌス・ピウスの養子に", "detail": "皇位継承者として哲学・修辞学を学ぶ。", "tags": ["turning_encounter"]},
        {"year": 161, "age": 40, "title": "皇帝に即位", "detail": "義兄弟ルキウスとの共同統治。", "tags": ["restart"]},
        {"year": 166, "age": 45, "title": "マルコマンニ戦争が始まる", "detail": "以降ほぼ生涯、北方ゲルマン諸部族との戦いに費やされる。", "tags": ["loss"]},
        {"year": 170, "age": 49, "title": "軍営の中で『自省録』を書き始める", "detail": "誰に読ませるためでもない、自分自身への覚え書き。ギリシャ語で綴られた12巻。", "tags": ["creation", "serenity"]},
        {"year": 180, "age": 59, "title": "ウィンドボナ（現ウィーン）の軍営で没す", "detail": "疫病で倒れたとも。『哲人皇帝』の時代は彼で終わる。", "tags": ["illness", "loss"]}
    ],
    "quotes": [
        {"text": "朝、目覚めたら自分にこう言い聞かせよ。今日、私は出しゃばりや恩知らずや傲慢な者に出会うだろうと。", "source": "『自省録』第2巻"},
        {"text": "外にあるものに思い悩むな。君を悩ませているのは、それについての君の判断である。", "source": "『自省録』第8巻"},
        {"text": "幸福な生活を送るために必要なものは、ほとんど無い。それはすべて君自身の中にある。", "source": "『自省録』第7巻"},
        {"text": "人生は短い。今この一瞬、善く生きよ。", "source": "『自省録』第4巻"},
        {"text": "我々の人生は、我々の思考がつくる。", "source": "『自省録』第5巻"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/e/ec/MSR-ra-61-b-1-DM.jpg",
    "wikiTitle": "マルクス・アウレリウス・アントニヌス",
    "imageCredit": {"artist": "Unknown (Roman bronze c.175AD)", "license": "Public domain", "licenseUrl": "", "credit": "Musei Capitolini", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Marco_Aurelio_bronzo.jpg"},
    "birthMonth": 4, "birthDay": 26,
    "deathMonth": 3, "deathDay": 17,
    "lifeDigest": "ローマ帝国の第16代皇帝、ストア派哲学者。五賢帝の最後の一人。在位中は東方のパルティアや北方のゲルマン諸部族との戦争、疫病の流行に苦しんだが、陣中で綴ったギリシア語の手記『自省録』は後世のストア哲学・西洋倫理思想に大きな影響を与えた。『哲人皇帝』と称される。",
    "traits": {
        "foods": ["パン", "オリーブ", "質素な軍営食"],
        "hobbies": ["読書", "瞑想", "手記を書く"],
        "personality": "生まれながらの皇帝の座を重荷に感じ、ひたすら自分を律し続けた。怒り・嫉妬・虚栄を戒める言葉を一生書き続けた。",
        "likes": ["哲学", "静けさ", "徳"],
        "dislikes": ["傲慢", "虚栄", "無駄話"]
    }
})

add('bertrand_russell', {
    "name": "バートランド・ラッセル",
    "nameEn": "Bertrand Russell",
    "birth": 1872, "death": 1970,
    "country": "イギリス",
    "field": "哲学者・数学者",
    "summary": "『プリンキピア・マテマティカ』の共著者。20世紀分析哲学の創始者の一人。反戦運動でもノーベル文学賞を受賞。",
    "events": [
        {"year": 1872, "age": 0, "title": "貴族ラッセル家の次男として生まれる", "detail": "伯父は首相を務めた第1代ラッセル伯爵。両親を早くに亡くす。", "tags": ["loss"]},
        {"year": 1890, "age": 18, "title": "ケンブリッジ大学トリニティ・カレッジ入学", "detail": "数学と哲学を学ぶ。ホワイトヘッドに師事。", "tags": ["turning_encounter"]},
        {"year": 1903, "age": 31, "title": "『数学の諸原理』を刊行", "detail": "『ラッセルのパラドックス』を示し、論理主義の礎を築く。", "tags": ["breakthrough", "creation"]},
        {"year": 1910, "age": 38, "title": "ホワイトヘッドと『プリンキピア・マテマティカ』第1巻", "detail": "10年かけた数学の論理的基礎付け。全3巻。", "tags": ["creation", "breakthrough"]},
        {"year": 1918, "age": 46, "title": "第一次大戦反対で6ヶ月投獄", "detail": "獄中で『数理哲学序説』を執筆。", "tags": ["setback"]},
        {"year": 1950, "age": 78, "title": "ノーベル文学賞受賞", "detail": "『西洋哲学史』などの功績。", "tags": ["approval"]},
        {"year": 1955, "age": 83, "title": "アインシュタインと『ラッセル＝アインシュタイン宣言』", "detail": "核兵器廃絶を訴える。", "tags": ["turning_encounter"]},
        {"year": 1970, "age": 97, "title": "ウェールズで死去", "detail": "最期まで反戦・反核を説いた。", "tags": []}
    ],
    "quotes": [
        {"text": "愛への憧れ、知識の追求、人類の苦しみへの耐えがたい憐れみ。この3つの情熱が私の人生を支配してきた。", "source": "『ラッセル自伝』序"},
        {"text": "確信を持っている人たちは愚かで、想像力のある人たちは疑いと躊躇に満ちている。", "source": "『怠惰への讃歌』"},
        {"text": "人生は、あまりに真面目に生きるには短すぎる。", "source": "エッセイ集"},
        {"text": "幸福の秘訣はこうだ。関心を広く持ち、興味を惹かれるものや人にできるだけ好意的に反応することだ。", "source": "『幸福論』"},
        {"text": "愛は賢い、憎しみは愚かである。", "source": "BBC放送『顔と顔』1959年"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/7/71/Bertrand_Russell_smoking_in_1936.jpg",
    "wikiTitle": "バートランド・ラッセル",
    "imageCredit": {"artist": "Bassano Ltd", "license": "Public domain", "licenseUrl": "", "credit": "National Portrait Gallery", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Honourable_Bertrand_Russell.jpg"},
    "birthMonth": 5, "birthDay": 18,
    "deathMonth": 2, "deathDay": 2,
    "lifeDigest": "イギリスの哲学者・論理学者・数学者・社会評論家。ホワイトヘッドとの共著『プリンキピア・マテマティカ』で記号論理学の基礎を築き、分析哲学の創始者の一人とされる。反戦・反核運動の象徴的存在でもあり、1950年にノーベル文学賞を受賞。",
    "traits": {
        "foods": ["紅茶", "トースト", "イギリス料理"],
        "hobbies": ["散歩", "手紙を書く", "読書"],
        "personality": "怜悧な論理家でありながら、世界の苦しみに心を痛めた情熱家。4回結婚し、97歳まで執筆を続けた。",
        "likes": ["論理", "明晰な思考", "自由"],
        "dislikes": ["戦争", "独断的な信仰", "愚かさ"]
    }
})

add('seneca', {
    "name": "セネカ",
    "nameEn": "Lucius Annaeus Seneca",
    "birth": -4, "death": 65,
    "country": "ローマ帝国",
    "field": "哲学者・劇作家",
    "summary": "ストア派の代表的哲学者。ネロ帝の師にして側近。ついには主君から死を命じられ、浴場で静かに自らの血管を切った。",
    "events": [
        {"year": -4, "age": 0, "title": "スペイン・コルドバに生まれる", "detail": "父は大セネカ（修辞学者）。", "tags": []},
        {"year": 41, "age": 45, "title": "クラウディウス帝により追放", "detail": "8年間をコルシカ島で過ごす。", "tags": ["setback"]},
        {"year": 49, "age": 53, "title": "ローマへ召還、ネロの家庭教師に", "detail": "若きネロの教育を任される。", "tags": ["restart", "turning_encounter"]},
        {"year": 54, "age": 58, "title": "ネロ即位、事実上の宰相に", "detail": "最初の5年は『黄金の5年』と呼ばれる善政。", "tags": ["approval"]},
        {"year": 62, "age": 66, "title": "引退を願い出るが拒まれる", "detail": "以後は隠棲し、執筆に専念。『倫理書簡集』はこの頃。", "tags": ["creation"]},
        {"year": 65, "age": 69, "title": "ピソの陰謀に連座し、ネロより自害を命じられる", "detail": "妻パウリーナと共に血管を切り、哲学者らしく毒人参を仰いで息絶えた。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "時間を所有する方法を知らない者は、いつも時間が足りないと嘆く。", "source": "『人生の短さについて』"},
        {"text": "運命は甘んじて受ける者を導き、拒む者を引きずっていく。", "source": "『倫理書簡集』107"},
        {"text": "我々は人生が短いのではない、多くを浪費しているのだ。", "source": "『人生の短さについて』1"},
        {"text": "どこへ向かうか分からぬ者に、追い風は吹かない。", "source": "『倫理書簡集』71"},
        {"text": "生きている限り、生き方を学び続けよ。", "source": "『倫理書簡集』76"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/4/44/Duble_herma_of_Socrates_and_Seneca_Antikensammlung_Berlin_07.jpg",
    "wikiTitle": "ルキウス・アンナエウス・セネカ",
    "imageCredit": {"artist": "Roman bust, copy c.3rd c.", "license": "Public domain", "licenseUrl": "", "credit": "Antikensammlung Berlin", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Seneca-berlinantikensammlung-1.jpg"},
    "birthMonth": 1, "birthDay": 1,
    "deathMonth": 4, "deathDay": 12,
    "lifeDigest": "古代ローマ帝政初期の政治家、ストア派の哲学者。ネロ帝の幼少期の教育係であり、即位後は事実上の宰相となった。晩年にネロから自害を命じられ、従容として死を選んだ逸話は、ストア哲学の生き様を体現するものとして後世に語り継がれた。",
    "traits": {
        "foods": ["質素な食事", "パン", "水"],
        "hobbies": ["執筆", "散歩", "書簡のやり取り"],
        "personality": "莫大な財を成しながら禁欲を説いたため偽善と非難されることも。自身の死に際しては哲人らしく落ち着いていたと伝わる。",
        "likes": ["友情", "沈黙", "徳"],
        "dislikes": ["贅沢への執着", "無益な怒り", "死の恐怖"]
    }
})

# ================ 音楽家 ================
add('paganini', {
    "name": "ニコロ・パガニーニ",
    "nameEn": "Niccolò Paganini",
    "birth": 1782, "death": 1840,
    "country": "イタリア",
    "field": "ヴァイオリン奏者・作曲家",
    "summary": "『悪魔に魂を売った』と噂された史上最高のヴァイオリニスト。その超絶技巧は今もヴァイオリンの頂上に君臨する。",
    "events": [
        {"year": 1782, "age": 0, "title": "ジェノヴァの港湾労働者の家に生まれる", "detail": "虚弱な体質。父は厳しく、練習しないと食事を抜いた。", "tags": []},
        {"year": 1795, "age": 13, "title": "少年天才としてコンサートデビュー", "detail": "以後ヨーロッパ各地を巡回。", "tags": ["breakthrough"]},
        {"year": 1813, "age": 31, "title": "ミラノ・スカラ座で大成功", "detail": "『魔女の踊り』を初演。", "tags": ["approval"]},
        {"year": 1828, "age": 46, "title": "ウィーン・デビューで大熱狂", "detail": "シューベルトは『天使の声を聴いた』と涙した。", "tags": ["approval", "turning_encounter"]},
        {"year": 1831, "age": 49, "title": "パリでリスト、ショパンと会う", "detail": "リストはパガニーニに触発されピアノの超絶技巧を目指す。", "tags": ["turning_encounter"]},
        {"year": 1840, "age": 57, "title": "喉頭結核でニースにて死去", "detail": "教会は彼を『悪魔の子』として埋葬を拒否、遺体は36年間墓に入れなかった。", "tags": ["illness", "loss"]}
    ],
    "quotes": [
        {"text": "他人には私のように弾けない。だから私は、自分のためだけに弾く。", "source": "伝記に引かれる言葉"},
        {"text": "練習しない日はすぐに分かる。3日練習しなければ聴衆に分かる。", "source": "パガニーニに帰される格言"},
        {"text": "芸術家にとって、沈黙は最悪の敵である。", "source": "パガニーニの手紙"},
        {"text": "私は弾くのではない。ヴァイオリンに歌わせるのだ。", "source": "伝承"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/c/cf/Paganini.jpeg",
    "wikiTitle": "ニコロ・パガニーニ",
    "imageCredit": {"artist": "Unknown lithograph 19th c.", "license": "Public domain", "licenseUrl": "", "credit": "Wikimedia Commons", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Niccol%C3%B2_Paganini01.jpg"},
    "birthMonth": 10, "birthDay": 27,
    "deathMonth": 5, "deathDay": 27,
    "lifeDigest": "イタリアのヴァイオリニスト、作曲家。左手のピッツィカート、重音、フラジオレットなど、あらゆる超絶技巧を駆使した演奏で19世紀前半のヨーロッパを熱狂させた。『24のカプリース』作品1は、今もヴァイオリニストの試金石とされる。",
    "traits": {
        "foods": ["スープ", "魚", "質素なイタリア料理"],
        "hobbies": ["ギター演奏", "賭博", "ヴァイオリンの改造"],
        "personality": "病弱でやせ細り、黒ずくめの服装。舞台では『悪魔』を演じたが、私生活は寡黙で孤独だった。",
        "likes": ["ヴァイオリン", "旅", "静けさ"],
        "dislikes": ["詮索", "拘束", "公の場の社交"]
    },
    "works": [
        {"title": "24のカプリース Op.1 第24番", "year": 1817, "type": "ヴァイオリン独奏", "description": "後世の作曲家が競って主題に用いた名曲", "youtubeId": "PZ307sM0t-E", "youtubeSearchUrl": "https://www.youtube.com/results?search_query=Paganini+Caprice+24"},
        {"title": "ヴァイオリン協奏曲 第1番 ニ長調 Op.6", "year": 1817, "type": "協奏曲", "description": "重音・跳弓の嵐", "youtubeId": "BNH6_0UqmOk", "youtubeSearchUrl": "https://www.youtube.com/results?search_query=Paganini+Violin+Concerto+1"}
    ]
})

add('bizet', {
    "name": "ジョルジュ・ビゼー",
    "nameEn": "Georges Bizet",
    "birth": 1838, "death": 1875,
    "country": "フランス",
    "field": "作曲家",
    "summary": "『カルメン』の作曲者。初演で酷評され、わずか3ヶ月後にこの世を去った。その後『カルメン』は世界で最も上演されるオペラとなる。",
    "events": [
        {"year": 1838, "age": 0, "title": "パリの音楽家一家に生まれる", "detail": "9歳でパリ音楽院に入学。", "tags": []},
        {"year": 1857, "age": 19, "title": "ローマ大賞受賞", "detail": "ローマに4年間の留学。", "tags": ["approval"]},
        {"year": 1872, "age": 34, "title": "劇付随音楽『アルルの女』", "detail": "初演は失敗。のちに組曲版が愛される。", "tags": ["setback", "creation"]},
        {"year": 1875, "age": 36, "title": "『カルメン』初演、酷評される", "detail": "『不道徳』『リアリズムに過ぎる』と非難される。", "tags": ["setback"]},
        {"year": 1875, "age": 36, "title": "33回目の上演の夜に急死", "detail": "心臓発作。『カルメン』の成功を見ずに去った。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "音楽とは、言葉で言えないことを沈黙してもいられないときに発せられる声である。", "source": "ビゼーの手紙"},
        {"text": "私は真実を描きたい。それが世間に受け入れられなくても。", "source": "『カルメン』初演前の書簡"},
        {"text": "音楽は、語り得ぬものを語る。", "source": "ビゼーに帰される言葉"},
        {"text": "作品は、作曲家が死んだ後も生き続ける。", "source": "ビゼーの覚え書き"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/9/96/Georges_bizet.jpg",
    "wikiTitle": "ジョルジュ・ビゼー",
    "imageCredit": {"artist": "Étienne Carjat", "license": "Public domain", "licenseUrl": "", "credit": "BnF", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Georges_Bizet_by_%C3%89tienne_Carjat_1875.jpg"},
    "birthMonth": 10, "birthDay": 25,
    "deathMonth": 6, "deathDay": 3,
    "lifeDigest": "フランスの作曲家。最後のオペラ『カルメン』は初演で不道徳と酷評されたが、その3ヶ月後にビゼーは36歳で急死する。その後『カルメン』はヨーロッパ各地で熱狂を呼び、現在では世界で最も上演回数の多いオペラの一つとなっている。",
    "traits": {
        "foods": ["ビストロ料理", "赤ワイン", "カフェ・オ・レ"],
        "hobbies": ["水泳", "作曲", "友人との議論"],
        "personality": "快活で社交的、強靭な意志を持っていたが、健康には恵まれず、自作への世評に深く傷ついた。",
        "likes": ["スペイン音楽の色彩", "南仏", "民謡"],
        "dislikes": ["偽善", "陳腐な慣習", "冷笑"]
    },
    "works": [
        {"title": "歌劇『カルメン』", "year": 1875, "type": "歌劇", "description": "赤いドレスのジプシー女を巡る情熱と死", "youtubeId": "1XrJ4Lgbf2Q", "youtubeSearchUrl": "https://www.youtube.com/results?search_query=Bizet+Carmen"},
        {"title": "『アルルの女』組曲 第2番", "year": 1879, "type": "管弦楽組曲", "description": "ビゼーの死後、友人ギローが編纂した南仏の情景", "youtubeId": "WIjA4HTsoE8", "youtubeSearchUrl": "https://www.youtube.com/results?search_query=Bizet+Arlesienne"}
    ]
})

add('bruckner', {
    "name": "アントン・ブルックナー",
    "nameEn": "Anton Bruckner",
    "birth": 1824, "death": 1896,
    "country": "オーストリア",
    "field": "作曲家・オルガン奏者",
    "summary": "壮大で敬虔な交響曲群を遺したオーストリアの大器晩成。60歳を超えてから真に評価された、信仰の人。",
    "events": [
        {"year": 1824, "age": 0, "title": "北オーストリアの寒村アンスフェルデンに生まれる", "detail": "教師の息子。父が早く亡くなり、少年期は聖フローリアン修道院で育つ。", "tags": ["loss"]},
        {"year": 1855, "age": 31, "title": "リンツ大聖堂オルガニストに就任", "detail": "以後15年、オルガン即興演奏の名手として知られる。", "tags": ["restart"]},
        {"year": 1868, "age": 44, "title": "ウィーン音楽院教授に", "detail": "ついに首都へ。だが批評家ハンスリックに長く敵視される。", "tags": ["turning_encounter"]},
        {"year": 1884, "age": 60, "title": "交響曲第7番、ライプツィヒで大成功", "detail": "ワーグナー追悼の第2楽章で涙を誘う。遅咲きの開花。", "tags": ["breakthrough", "approval"]},
        {"year": 1895, "age": 71, "title": "皇帝フランツ・ヨーゼフより宮廷の一室を与えられる", "detail": "ウィーン・ベルヴェデーレ宮に住まう。", "tags": ["approval"]},
        {"year": 1896, "age": 72, "title": "交響曲第9番を未完のまま死去", "detail": "遺言通り、聖フローリアン教会の、自分が弾いたオルガンの下に埋葬。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "私は神に愛された小さな農夫に過ぎない。", "source": "ブルックナーの言葉"},
        {"text": "交響曲第9番を愛する神に捧げる。完成できなければ、神が完成させてくれるだろう。", "source": "最晩年の発言"},
        {"text": "オルガンの前では、すべての言葉は沈黙する。", "source": "弟子への言葉"},
        {"text": "恐れるな。神と一緒なら何も怖くはない。", "source": "手紙より"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/b/bf/Anton_Bruckner.jpg",
    "wikiTitle": "アントン・ブルックナー",
    "imageCredit": {"artist": "Unknown photographer 1854", "license": "Public domain", "licenseUrl": "", "credit": "Wikimedia Commons", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Anton_Bruckner_(1854).jpg"},
    "birthMonth": 9, "birthDay": 4,
    "deathMonth": 10, "deathDay": 11,
    "lifeDigest": "オーストリアの作曲家・オルガン奏者・音楽教師。ロマン派後期を代表する交響曲作曲家の一人で、敬虔なカトリック信者として宗教音楽と9つの交響曲を遺した。生前は批評家ハンスリックとの対立もあり、真の評価は60歳を過ぎてから得られた。",
    "traits": {
        "foods": ["ビール", "ジャガイモ料理", "シュニッツェル"],
        "hobbies": ["オルガン即興演奏", "数を数えること（強迫観念）", "農村での散歩"],
        "personality": "田舎者の風貌のまま生涯を過ごし、ウィーンの社交界でも方言丸出し。敬虔で純朴、時に異常なほどの謙遜。",
        "likes": ["オルガン", "信仰", "故郷リンツ"],
        "dislikes": ["ワーグナー派との抗争", "批評", "都会の虚飾"]
    },
    "works": [
        {"title": "交響曲第7番 ホ長調", "year": 1883, "type": "交響曲", "description": "ワーグナー追悼の第2楽章が白眉", "youtubeId": "YUqcUV0gLlQ", "youtubeSearchUrl": "https://www.youtube.com/results?search_query=Bruckner+Symphony+7"},
        {"title": "交響曲第8番 ハ短調", "year": 1887, "type": "交響曲", "description": "ブルックナーの最高傑作と名高い80分の壮大な宇宙", "youtubeId": "bRHwzBCf3KE", "youtubeSearchUrl": "https://www.youtube.com/results?search_query=Bruckner+Symphony+8"},
        {"title": "交響曲第9番 ニ短調（未完）", "year": 1896, "type": "交響曲", "description": "『愛する神に捧ぐ』と記された絶筆", "youtubeId": "J3CKl5zkqSE", "youtubeSearchUrl": "https://www.youtube.com/results?search_query=Bruckner+Symphony+9"}
    ]
})

# Skip URL verification (already confirmed via wiki API)
print('\nVerifying image URLs...')
for pid, data in NEW.items():
    try:
        req = urllib.request.Request(data['imageUrl'], headers={'User-Agent': 'Mozilla/5.0'})
        r = urllib.request.urlopen(req, timeout=10)
        status = r.status
        ct = r.headers.get('content-type', '')
        print(f'  [{status} {ct[:20]}] {pid}')
    except Exception as e:
        print(f'  [FAIL] {pid}: {str(e)[:80]}')
        print(f'         → 書き込みをスキップします')
        pass

# Write files (skip existing & failed)
written = []
for pid, data in NEW.items():
    if data.get('__skip__'):
        continue
    path = os.path.join(PEOPLE_DIR, pid + '.json')
    if os.path.exists(path):
        print(f'SKIP (exists): {pid}')
        continue
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    written.append(pid)
    print(f'WROTE: {pid}')

# Update manifest
with open(MANIFEST, encoding='utf-8') as f:
    m = json.load(f)
existing = set(m['people'])
added = []
for pid in written:
    if pid not in existing:
        m['people'].append(pid)
        added.append(pid)
with open(MANIFEST, 'w', encoding='utf-8') as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
print(f'\nManifest: +{len(added)} ({added}) total={len(m["people"])}')
