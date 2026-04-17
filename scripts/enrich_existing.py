# -*- coding: utf-8 -*-
"""既存の主要人物のevents/quotes/works/relationsを深化させる。
既存データは消さず追加のみ。year+title または text の重複はスキップ。
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    # ==================== ショパン ====================
    "chopin": {
        "events": [
            {"year": 1829, "age": 19, "title": "初恋コンスタンツィア・グワトコフスカ", "detail": "音楽院の声楽科の同級生。打ち明けられず『ピアノ協奏曲第2番 ヘ短調』の第2楽章に想いを込めた。『僕の理想の人を見つけた』と友人ティトゥスへの手紙に書くが、一度も言葉にできなかった。",
             "tags": ["heartbreak", "self_denial"]},
            {"year": 1837, "age": 27, "title": "プレイエル社のピアノに出会う", "detail": "『元気な時はエラール、具合が悪い時はプレイエル』。繊細な音色で知られるプレイエルを生涯愛用。『このピアノは私そのものだ』と語った。",
             "tags": ["turning_encounter"]},
            {"year": 1842, "age": 32, "title": "父ニコラの死の報せ", "detail": "ワルシャワの父が亡くなるが、帰ることは叶わなかった。『葬儀にも行けず、墓も見たことがない』。ポロネーズ第5番嬰ヘ短調の暗い厳粛さはこの時期の作品。",
             "tags": ["loss", "parent_conflict"]},
            {"year": 1844, "age": 34, "title": "『ピアノソナタ第3番』完成", "detail": "ノアンの最後の穏やかな夏。サンドとの関係の終わりを予感させる、長大で内省的な最後のソナタ。",
             "tags": []}
        ],
        "quotes": [
            {"text": "バッハは天文学者だ。彼は星々を発見し、我々はそれを研究する。", "source": "弟子への言葉"},
            {"text": "音楽は言葉では言い表せないものを、沈黙してはいられないものに対して語るものだ。", "source": "ショパンに帰される言葉"},
            {"text": "悲しみの中にも美しさを見つけよ。そうでなければ、我々は生きていけない。", "source": "手紙"},
            {"text": "僕の心はもうここにない。私の半分はどこか遠くにある。", "source": "亡命後、家族への手紙"}
        ],
        "works": [
            {"title": "英雄ポロネーズ 変イ長調 作品53", "year": 1842, "type": "ピアノ曲",
             "description": "祖国ポーランドへの誇りと祈り。最も力強いポロネーズ",
             "youtubeId": "Fk-JdNLEHds",
             "imslpUrl": "https://imslp.org/wiki/Polonaise_in_A-flat_major%2C_Op.53_(Chopin%2C_Fr%C3%A9d%C3%A9ric)"},
            {"title": "別れの曲（練習曲 作品10-3）", "year": 1832, "type": "ピアノ曲",
             "description": "ショパン自身が『こんな美しい旋律はもう書けない』と漏らした歌",
             "youtubeId": "xesd1Z1Cbxk",
             "imslpUrl": "https://imslp.org/wiki/%C3%89tudes%2C_Op.10_(Chopin%2C_Fr%C3%A9d%C3%A9ric)"},
            {"title": "ピアノ協奏曲第1番 ホ短調 作品11", "year": 1830, "type": "協奏曲",
             "description": "ポーランドを去る直前、20歳の作品。初恋と祖国喪失の予感が交錯",
             "youtubeId": "M03FnIiIlWI",
             "imslpUrl": "https://imslp.org/wiki/Piano_Concerto_No.1%2C_Op.11_(Chopin%2C_Fr%C3%A9d%C3%A9ric)"},
            {"title": "ワルツ第7番 嬰ハ短調 作品64-2", "year": 1847, "type": "ピアノ曲",
             "description": "晩年のワルツ。憂いを含んだ最も愛される三拍子",
             "youtubeId": "s_Q9uKuy8L8",
             "imslpUrl": "https://imslp.org/wiki/Waltzes%2C_Op.64_(Chopin%2C_Fr%C3%A9d%C3%A9ric)"},
            {"title": "子犬のワルツ 変ニ長調 作品64-1", "year": 1847, "type": "ピアノ曲",
             "description": "サンドの子犬が自分の尻尾を追って回る様子から生まれた小品",
             "youtubeId": "nzPs7xO4mns",
             "imslpUrl": "https://imslp.org/wiki/Waltzes%2C_Op.64_(Chopin%2C_Fr%C3%A9d%C3%A9ric)"}
        ]
    },

    # ==================== ベートーヴェン ====================
    "beethoven": {
        "events": [
            {"year": 1787, "age": 16, "title": "母の死、父のアルコール依存の中で一家を支える", "detail": "17歳で長男として二人の弟を養う。音楽家としての父はすでに崩れており、母を結核で失う。『私の最良の友を失った』と手紙に書いた。",
             "tags": ["parent_conflict", "loss", "poverty"]},
            {"year": 1802, "age": 31, "title": "ハイリゲンシュタットの遺書", "detail": "聴力を失いつつあることを弟たちへの手紙にしたため、自殺を考えたが『芸術がそれを思いとどまらせた。まだ書くべきものがある』と決意。死後に発見される。",
             "tags": ["pride_broken", "restart", "illness"]},
            {"year": 1808, "age": 37, "title": "交響曲第5番『運命』・第6番『田園』同日初演", "detail": "4時間に及ぶ地獄のような寒さのコンサート。聴衆は凍え、リハーサルは足りず、演奏は散々だったと伝わる。それでも歴史を変えた。",
             "tags": ["breakthrough"]},
            {"year": 1812, "age": 41, "title": "『不滅の恋人』への手紙", "detail": "宛先不明の熱烈な恋文3通が死後発見される。『私の天使、私のすべて、私自身』。相手は今も特定されない。ベートーヴェン最大の謎。",
             "tags": ["heartbreak", "isolation"]},
            {"year": 1824, "age": 53, "title": "交響曲第9番初演、聴衆の拍手に気づかず", "detail": "指揮台で自分の楽譜を見ていた彼に、歌手が振り向かせると、満場の喝采が目に入った。音は聞こえなかった。",
             "tags": ["breakthrough", "approval", "illness"]},
            {"year": 1827, "age": 56, "title": "ウィーンで死去、『喜劇は終わった』", "detail": "雷鳴とともに意識を取り戻し、拳を天に突き上げて息絶えたと伝わる。葬列には2万人が集まり、シューベルトも松明を持って歩いた。",
             "tags": ["loss", "approval"]}
        ],
        "quotes": [
            {"text": "運命は私の喉元を掴んだ。しかし私は決して屈服しない。", "source": "書簡"},
            {"text": "苦悩を通して歓喜へ。", "source": "エルデーディ伯爵夫人への手紙"},
            {"text": "真に偉大な人間に、不幸はふさわしい。", "source": "日記"},
            {"text": "ムジークは人類にとって、いかなる知恵や哲学より高い啓示である。", "source": "ベッティーナ・ブレンターノへの手紙"}
        ],
        "works": [
            {"title": "交響曲第5番 ハ短調『運命』作品67", "year": 1808, "type": "交響曲",
             "description": "『ダダダダーン』四つの音から宇宙が開ける",
             "youtubeId": "fOk8Tm815lE"},
            {"title": "交響曲第9番 ニ短調『合唱付き』作品125", "year": 1824, "type": "交響曲",
             "description": "『歓喜の歌』。聾者が到達した最後の光",
             "youtubeId": "t3217H8JppI"},
            {"title": "ピアノソナタ第14番『月光』作品27-2", "year": 1801, "type": "ピアノ曲",
             "description": "ジュリエッタに捧げられた幻想曲風ソナタ",
             "youtubeId": "4591dCHe_sE",
             "imslpUrl": "https://imslp.org/wiki/Piano_Sonata_No.14%2C_Op.27_No.2_(Beethoven%2C_Ludwig_van)"},
            {"title": "ピアノソナタ第23番『熱情』作品57", "year": 1805, "type": "ピアノ曲",
             "description": "ベートーヴェン自身『最も激しい曲』と呼んだ",
             "youtubeId": "NydqXDF6aAM",
             "imslpUrl": "https://imslp.org/wiki/Piano_Sonata_No.23%2C_Op.57_(Beethoven%2C_Ludwig_van)"},
            {"title": "ヴァイオリン・ソナタ第9番『クロイツェル』作品47", "year": 1803, "type": "室内楽",
             "description": "トルストイが同名小説を書いた、激情の二重奏",
             "youtubeId": "xL_4tvvQuJg"},
            {"title": "弦楽四重奏曲第14番 嬰ハ短調 作品131", "year": 1826, "type": "室内楽",
             "description": "晩年の最も内省的な7楽章。シューベルトが死の床で聴きたがった",
             "youtubeId": "mu4Nn8k5p0I"}
        ]
    },

    # ==================== モーツァルト ====================
    "mozart": {
        "events": [
            {"year": 1762, "age": 6, "title": "父レオポルトと欧州演奏旅行開始", "detail": "マリア・テレジア、ルイ15世、ジョージ3世の前で演奏。6歳の天才児として欧州中を回る。父は家計と名声のため子供を酷使した。",
             "tags": ["approval", "parent_conflict"]},
            {"year": 1778, "age": 22, "title": "パリで母を失う", "detail": "就職活動のためのパリ滞在中、同行した母が病死。父への報告書で一足飛びに真実を告げる勇気が持てず、まず『母は重病です』と書いた。",
             "tags": ["loss"]},
            {"year": 1781, "age": 25, "title": "ザルツブルク大司教と決別、ウィーンへ", "detail": "『尻を蹴飛ばされて』放逐された。フリーランス音楽家として生きる決意。当時としては異例の独立。",
             "tags": ["restart", "pride_broken"]},
            {"year": 1782, "age": 26, "title": "コンスタンツェ・ウェーバーと父の反対を押し切り結婚", "detail": "ウェーバー家の次女と結婚。父レオポルトは最後まで祝福しなかった。",
             "tags": ["parent_conflict", "restart"]},
            {"year": 1787, "age": 31, "title": "父レオポルト死去", "detail": "長年確執のあった父が亡くなる。直前の手紙に『死は人生の最後の目的地ではなく、本当の親友です』と書いた。同年『ドン・ジョヴァンニ』を書く。",
             "tags": ["loss", "parent_conflict"]},
            {"year": 1791, "age": 35, "title": "謎の依頼主からの『レクイエム』、未完のまま死去", "detail": "黒衣の使者が匿名で依頼した鎮魂曲。モーツァルト自身『これは私のレクイエムだ』と予感しながら書き続け、『ラクリモサ』の8小節目で絶筆。12月5日没。貧民墓地に埋葬され、どこに眠るかもわからない。",
             "tags": ["loss", "poverty"]}
        ],
        "quotes": [
            {"text": "メロディは音楽の神髄である。", "source": "書簡"},
            {"text": "死は人生の真の最終目的である。そして死こそ人間の最良の友である。", "source": "父への手紙 1787"},
            {"text": "私は早く書く訳ではない。ただ、書く前に、もう全部頭の中で出来上がっているのだ。", "source": "モーツァルトに帰される言葉"}
        ],
        "works": [
            {"title": "歌劇『フィガロの結婚』K.492", "year": 1786, "type": "オペラ",
             "description": "ダ・ポンテとの黄金コンビ第一作。身分を越えた愛と赦し",
             "youtubeId": "7NAOmgRGuHs"},
            {"title": "歌劇『ドン・ジョヴァンニ』K.527", "year": 1787, "type": "オペラ",
             "description": "父レオポルトの死の年に書かれた、死と笑いのオペラ",
             "youtubeId": "3m1pF9UI_2E"},
            {"title": "歌劇『魔笛』K.620", "year": 1791, "type": "オペラ",
             "description": "死の2ヶ月前の初演。フリーメイスンの理想を描く",
             "youtubeId": "yVmcF-Va9QA"},
            {"title": "レクイエム ニ短調 K.626", "year": 1791, "type": "宗教曲",
             "description": "『ラクリモサ』8小節目で絶筆。弟子ジュスマイヤーが補筆",
             "youtubeId": "pSFBxOWrMNk"},
            {"title": "ピアノ協奏曲第21番 ハ長調 K.467", "year": 1785, "type": "協奏曲",
             "description": "第2楽章『エルヴィラ・マディガン』の永遠の旋律",
             "youtubeId": "df-eLzao63I"},
            {"title": "交響曲第40番 ト短調 K.550", "year": 1788, "type": "交響曲",
             "description": "モーツァルト最後の夏に書かれた、最も憂いに満ちた交響曲",
             "youtubeId": "JTc1mDieQI8"},
            {"title": "アイネ・クライネ・ナハトムジーク K.525", "year": 1787, "type": "室内楽",
             "description": "最も親しまれるセレナーデ",
             "youtubeId": "o1dBg__wsuo"}
        ]
    },

    # ==================== バッハ ====================
    "bach": {
        "events": [
            {"year": 1695, "age": 9, "title": "両親を相次いで失い、兄のもとへ", "detail": "父ヨハン・アンブロシウスが死去、9歳で孤児に。兄ヨハン・クリストフのもとで育てられ、月光の下で禁じられた楽譜を書き写したと伝わる。",
             "tags": ["parent_conflict", "loss", "poverty"]},
            {"year": 1705, "age": 20, "title": "リューベックへ400km徒歩の旅、ブクステフーデに会う", "detail": "名オルガニスト、ブクステフーデのオルガン演奏を聴くため、職務を放棄して徒歩の旅。無許可の長期欠勤で帰任後に叱責された。",
             "tags": ["turning_encounter", "restart"]},
            {"year": 1720, "age": 35, "title": "妻マリア・バルバラが突然死", "detail": "出張から戻ると、妻は既に埋葬された後だった。20人の子を産んだうち半数以上が早世。バッハの生涯は死に満ちている。",
             "tags": ["loss"]},
            {"year": 1723, "age": 38, "title": "ライプツィヒ・トーマス教会のカントルに就任", "detail": "テレマンに断られての3番目の候補だった。以後27年、毎週日曜のカンタータを書き続ける。",
             "tags": ["restart"]},
            {"year": 1747, "age": 62, "title": "フリードリヒ大王の宮廷でテーマを与えられ『音楽の捧げもの』", "detail": "ポツダムで王の主題に即興でフーガを作り驚嘆させた。帰宅後に6声のフーガを含む曲集として完成。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1750, "age": 65, "title": "失明の中『フーガの技法』を書き続け死去", "detail": "ロンドンから来た眼科医タイラーの手術に失敗し完全に失明。最後のフーガの『B-A-C-H』の署名で絶筆。死後100年近く忘れられた。",
             "tags": ["loss", "isolation"]}
        ],
        "quotes": [
            {"text": "音楽の目的は神の栄光と心の慰めに他ならない。", "source": "バッハの言葉"},
            {"text": "私のように勤勉に働けば、誰でも同じことができるだろう。", "source": "バッハに帰される言葉"},
            {"text": "すべての和音は神を讃えるためにある。", "source": "弟子への言葉"}
        ],
        "works": [
            {"title": "マタイ受難曲 BWV244", "year": 1727, "type": "宗教曲",
             "description": "キリスト受難の物語を3時間の大音楽劇に",
             "youtubeId": "a4dftpAmswc"},
            {"title": "無伴奏ヴァイオリン・パルティータ第2番 ニ短調 BWV1004", "year": 1720, "type": "器楽曲",
             "description": "妻の死の年に書かれたとされる。『シャコンヌ』は絶品",
             "youtubeId": "QV0WchBP9xk"},
            {"title": "無伴奏チェロ組曲第1番 ト長調 BWV1007", "year": 1720, "type": "器楽曲",
             "description": "カザルスが13歳の時に古本屋で発見し世に蘇らせた",
             "youtubeId": "mGQLXRTl3Z0"},
            {"title": "平均律クラヴィーア曲集 第1巻 BWV846-869", "year": 1722, "type": "鍵盤曲",
             "description": "すべての調性を巡る『音楽の旧約聖書』",
             "youtubeId": "YumoHGmKpRk",
             "imslpUrl": "https://imslp.org/wiki/The_Well-Tempered_Clavier%2C_Book_I%2C_BWV_846-869_(Bach%2C_Johann_Sebastian)"},
            {"title": "ゴルトベルク変奏曲 BWV988", "year": 1741, "type": "鍵盤曲",
             "description": "不眠症の伯爵のために書かれた静かな宇宙",
             "youtubeId": "Ahp2aw3TfnU"},
            {"title": "ミサ曲 ロ短調 BWV232", "year": 1749, "type": "宗教曲",
             "description": "プロテスタントのバッハが書いたカトリック・ミサの最高峰",
             "youtubeId": "HhnZGKsZkhk"},
            {"title": "トッカータとフーガ ニ短調 BWV565", "year": 1710, "type": "オルガン曲",
             "description": "最も有名なオルガン曲",
             "youtubeId": "ho9rZjlsyYY"}
        ]
    },

    # ==================== ニーチェ ====================
    "nietzsche": {
        "events": [
            {"year": 1849, "age": 4, "title": "牧師の父を脳軟化症で失う", "detail": "死の恐怖と神の不在が生涯の問いの原点に。翌年には弟も死んだ。母と妹と祖母、女ばかりの家で育つ。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1869, "age": 24, "title": "バーゼル大学の古典文献学教授に異例の若さで就任", "detail": "博士号取得前の抜擢。最年少教授として未来を嘱望される。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1872, "age": 27, "title": "『悲劇の誕生』で学界から黙殺", "detail": "師リッチュルからも批判され、学生が半減。ワーグナーだけが絶賛。",
             "tags": ["pride_broken"]},
            {"year": 1876, "age": 32, "title": "ワーグナーとバイロイトで決裂", "detail": "『パルジファル』の宗教性に幻滅。英雄への憧れが崩れ落ちた。",
             "tags": ["loss", "heartbreak"]},
            {"year": 1879, "age": 34, "title": "健康悪化で教授を辞職、放浪の哲学者となる", "detail": "以後10年、スイス・イタリア・南仏を『病気と闘いながら』移り住む。書き続ける。",
             "tags": ["restart", "isolation", "illness"]},
            {"year": 1882, "age": 37, "title": "ルー・サロメにプロポーズ二度、二度拒絶", "detail": "妹エリーザベトの妨害もあり、唯一の『魂の伴侶』を失う。『ツァラトゥストラ』はこの失恋の後に書かれた。",
             "tags": ["heartbreak", "isolation"]},
            {"year": 1889, "age": 44, "title": "トリノで馬の首に抱きついて発狂", "detail": "御者に鞭打たれる馬を見て泣きながら首に抱きつき、その場で倒れる。以後11年、意識を取り戻さず母と妹に看取られた。",
             "tags": ["loss", "pride_broken"]},
            {"year": 1900, "age": 55, "title": "ヴァイマールで死去", "detail": "妹エリーザベトが遺稿を改竄し、後にナチスに利用させる。ニーチェ自身は反ユダヤ主義を激しく嫌っていた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "神は死んだ。", "source": "『悦ばしき知識』125"},
            {"text": "深淵を覗き込むとき、深淵もまたあなたを覗き込んでいる。", "source": "『善悪の彼岸』146"},
            {"text": "人生をやり直せるとしても、私はまったく同じ人生を繰り返し選ぶだろう。", "source": "永劫回帰の思想"},
            {"text": "これが人生だったのか。よし、もう一度！", "source": "『ツァラトゥストラ』"},
            {"text": "人間にとって偉大なのは、彼が橋であって目的ではないということだ。", "source": "『ツァラトゥストラ』序説"}
        ]
    },

    # ==================== 夏目漱石 ====================
    "soseki": {
        "events": [
            {"year": 1874, "age": 7, "title": "養家から実家へ戻される", "detail": "生後すぐ里子、次に養子、9歳で養父母の離縁で実家へ。自分が誰の子かわからないまま育つ。『坊っちゃん』の疎外感の原点。",
             "tags": ["parent_conflict", "isolation"]},
            {"year": 1895, "age": 28, "title": "松山中学教師に、『坊っちゃん』の舞台へ", "detail": "東大卒業後、松山の中学へ。この時の経験が後の『坊っちゃん』となる。",
             "tags": ["restart"]},
            {"year": 1900, "age": 33, "title": "文部省留学でロンドンへ、神経衰弱の泥沼", "detail": "下宿を転々と5回。日本人留学生の中で最も孤独だった。『ロンドンに発狂した漱石がいる』という噂が流れた。",
             "tags": ["isolation", "pride_broken", "illness"]},
            {"year": 1903, "age": 36, "title": "帰国、第一高等学校・東京帝大講師", "detail": "ラフカディオ・ハーンの後任。学生からは人気があったが本人は苦痛だった。",
             "tags": ["restart"]},
            {"year": 1905, "age": 38, "title": "『吾輩は猫である』連載開始、作家誕生", "detail": "神経衰弱の気晴らしに書いた随想が『ホトトギス』に載り大評判。高浜虚子のすすめで小説家の道へ。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1907, "age": 40, "title": "朝日新聞社入社、職業作家に", "detail": "東大教授の地位を捨て新聞専属小説家に。当時としては異例の決断。月給200円の引き抜き。",
             "tags": ["restart"]},
            {"year": 1910, "age": 43, "title": "修善寺の大患、30分間の臨死体験", "detail": "胃潰瘍で大量吐血。30分間心停止。以後『則天去私』の境地へ向かう。",
             "tags": ["illness", "turning_encounter"]},
            {"year": 1916, "age": 49, "title": "『明暗』執筆中に胃潰瘍で死去", "detail": "未完の最後の小説を書きながら、12月9日死去。門下生たちが枕元で絶筆を書き取った。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間は、好い加減な顔をして、好い加減な事を云ってゐる方が楽なんだよ。", "source": "『硝子戸の中』"},
            {"text": "とかくに人の世は住みにくい。", "source": "『草枕』冒頭"},
            {"text": "智に働けば角が立つ。情に棹させば流される。意地を通せば窮屈だ。", "source": "『草枕』冒頭"},
            {"text": "自分はこれから先何度この正月を迎える事かしらん。", "source": "『硝子戸の中』"},
            {"text": "月が綺麗ですね。", "source": "漱石が I love you をこう訳したという伝承"}
        ],
        "works": [
            {"title": "吾輩は猫である", "year": 1905, "type": "小説",
             "description": "神経衰弱の気晴らしに書かれた風刺小説",
             "amazonAsin": "4101010013"},
            {"title": "坊っちゃん", "year": 1906, "type": "小説",
             "description": "松山中学教師時代の体験を下敷きにした青春小説",
             "amazonAsin": "410101002X"},
            {"title": "三四郎", "year": 1908, "type": "小説",
             "description": "熊本から東京に出た青年の成長と失恋",
             "amazonAsin": "4101010056"},
            {"title": "それから", "year": 1909, "type": "小説",
             "description": "友の妻を愛してしまった男の苦悩",
             "amazonAsin": "4101010072"},
            {"title": "こころ", "year": 1914, "type": "小説",
             "description": "『精神的に向上心のないものは、馬鹿だ』",
             "amazonAsin": "4101010137"}
        ]
    },

    # ==================== ゴッホ ====================
    "van_gogh": {
        "events": [
            {"year": 1869, "age": 16, "title": "グーピル画廊に就職、美術商の道へ", "detail": "叔父の紹介でロンドン・パリ支店も経験。当初は真面目で将来有望な青年だった。",
             "tags": ["restart"]},
            {"year": 1876, "age": 23, "title": "伝道師を志しベルギーの炭鉱村ボリナージュへ", "detail": "炭鉱労働者と同じ粗末な小屋で暮らし、食料も与えた。しかし『過激すぎる』として教会から解任される。",
             "tags": ["isolation", "pride_broken", "restart"]},
            {"year": 1880, "age": 27, "title": "27歳で画家になる決意", "detail": "ブリュッセルで弟テオに『画家になる』と宣言。以後テオの仕送りで生きる。",
             "tags": ["restart"]},
            {"year": 1886, "age": 33, "title": "パリで印象派に出会い色彩が爆発", "detail": "弟テオのアパートに住み、印象派・浮世絵に開眼。暗いオランダ絵画から一気に光と色の世界へ。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1888, "age": 35, "title": "アルルへ、『黄色い家』でゴーギャンと共同生活", "detail": "理想の『画家の共同体』を夢見て準備。60日後に破綻、耳切り事件へ。",
             "tags": ["restart", "isolation"]},
            {"year": 1888, "age": 35, "title": "12月、耳を切り落とす", "detail": "ゴーギャンと激しい口論の後、左耳を剃刀で切り落とし娼婦に手渡す。ゴーギャンは翌朝パリへ去った。",
             "tags": ["pride_broken", "illness", "heartbreak"]},
            {"year": 1889, "age": 36, "title": "サン=レミの精神療養院に自ら入院", "detail": "1年間で150点以上の傑作。『星月夜』『糸杉』はここで生まれた。",
             "tags": ["illness", "breakthrough"]},
            {"year": 1890, "age": 37, "title": "オーヴェルの麦畑で拳銃自殺", "detail": "7月27日、麦畑で自らの腹を撃つ。テオの腕の中で『悲しみは永遠に続く(La tristesse durera toujours)』と呟き、2日後に死去。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "星を見るたびに夢を見る。", "source": "テオへの手紙"},
            {"text": "偉大なことは衝動からではなく、小さなことの積み重ねから生まれる。", "source": "テオへの手紙"},
            {"text": "私は自分の心で絵を描きたい。", "source": "テオへの手紙"},
            {"text": "悲しみは永遠に続く。", "source": "最期の言葉 1890"},
            {"text": "絵を描くとき、私は自分が何者か、何をすべきかを忘れる。", "source": "手紙"}
        ]
    },

    # ==================== 太宰治 ====================
    "dazai_osamu": {
        "events": [
            {"year": 1923, "age": 14, "title": "父・源右衛門の死", "detail": "青森の貴族院議員だった父が死去。本人は『怖くて悲しくなかった』と後に書く。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1929, "age": 20, "title": "最初の自殺未遂（カルモチン自殺）", "detail": "旧制弘前高校時代。以後、生涯に5回の自殺未遂を重ねる。",
             "tags": ["pride_broken"]},
            {"year": 1930, "age": 21, "title": "田部あつみと鎌倉・江ノ島で心中未遂", "detail": "銀座のカフェ女給と心中。相手は死に、太宰だけ助かった。自殺幇助罪で起訴されるが起訴猶予。",
             "tags": ["heartbreak", "loss"]},
            {"year": 1935, "age": 26, "title": "芥川賞最終選考で落選、川端康成を激怒", "detail": "『刺す。さう思った。大悪党だと思った』と川端を罵る公開状を書いた。",
             "tags": ["pride_broken", "approval"]},
            {"year": 1939, "age": 30, "title": "石原美知子と結婚、最も安定した時期", "detail": "井伏鱒二の仲介で結婚。三鷹に転居。『富嶽百景』『走れメロス』『津軽』など充実期の作品群。",
             "tags": ["restart", "turning_encounter"]},
            {"year": 1947, "age": 38, "title": "『斜陽』大ベストセラー、『斜陽族』流行語に", "detail": "愛人太田静子の日記をもとにした没落貴族の物語。戦後の混乱の中で時代の象徴になった。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1948, "age": 38, "title": "『人間失格』完成直後、山崎富栄と玉川上水で入水", "detail": "6月13日。発見は誕生日の6月19日。『恥の多い生涯を送って来ました』が辞世となった。",
             "tags": ["loss", "heartbreak"]}
        ],
        "quotes": [
            {"text": "恥の多い生涯を送って来ました。", "source": "『人間失格』冒頭"},
            {"text": "生まれて、すみません。", "source": "『二十世紀旗手』副題"},
            {"text": "笑われて、笑われて、つよくなる。", "source": "『正義と微笑』"},
            {"text": "人は、愛そうとしても、愛せない。人は、愛されようとしても、愛されない。", "source": "『斜陽』"},
            {"text": "信頼に報いるとは、その信頼を裏切らないことだ。", "source": "『走れメロス』"},
            {"text": "太宰の文学は恥の文学である。", "source": "太宰が自身について語った言葉"}
        ],
        "works": [
            {"title": "人間失格", "year": 1948, "type": "小説",
             "description": "絶筆となった自伝的告白小説",
             "amazonAsin": "4101006059"},
            {"title": "走れメロス", "year": 1940, "type": "小説",
             "description": "最も愛される友情の物語",
             "amazonAsin": "4101006059"},
            {"title": "斜陽", "year": 1947, "type": "小説",
             "description": "没落貴族の母と娘。戦後の象徴",
             "amazonAsin": "4101006067"},
            {"title": "津軽", "year": 1944, "type": "小説",
             "description": "故郷青森を旅する自伝的紀行",
             "amazonAsin": "4101006121"}
        ]
    },

    # ==================== 坂本龍馬 ====================
    "sakamoto_ryoma": {
        "events": [
            {"year": 1846, "age": 11, "title": "姉乙女に剣術と学問を仕込まれる", "detail": "泣き虫で塾を辞めさせられた弟を、姉が徹底的に鍛え上げた。乙女は身長5尺8寸(175cm)の大女で、『男勝り』の典型。",
             "tags": ["parent_conflict", "turning_encounter"]},
            {"year": 1853, "age": 18, "title": "江戸剣術修行、ペリー来航を目撃", "detail": "千葉道場で北辰一刀流を学びながら黒船を見た。『攘夷』思想を胸に刻む。",
             "tags": ["turning_encounter"]},
            {"year": 1862, "age": 27, "title": "土佐を脱藩", "detail": "脱藩は死罪。姉乙女に『日本を今一度せんたくいたし申候』と手紙を書き、江戸へ。",
             "tags": ["restart", "isolation"]},
            {"year": 1862, "age": 27, "title": "勝海舟に弟子入り", "detail": "暗殺するつもりで会いに行ったが、勝の開明的な話に心酔し弟子入り。『大口をあいた龍馬』",
             "tags": ["turning_encounter"]},
            {"year": 1866, "age": 31, "title": "薩長同盟を成立させる", "detail": "犬猿の仲だった西郷（薩摩）と桂（長州）を結ばせた。倒幕の決定的な一歩。",
             "tags": ["breakthrough"]},
            {"year": 1866, "age": 31, "title": "寺田屋事件、お龍が裸で知らせに走る", "detail": "伏見・寺田屋で幕吏に襲撃されるが、風呂場にいたお龍が裸のまま2階に駆け上がって知らせた。龍馬は銃で応戦し脱出。",
             "tags": ["pride_broken", "turning_encounter"]},
            {"year": 1866, "age": 31, "title": "日本初の新婚旅行で鹿児島の霧島へ", "detail": "お龍との傷の療養を兼ねた温泉旅行。天逆鉾を引き抜いたと姉に書いた。",
             "tags": ["restart"]},
            {"year": 1867, "age": 32, "title": "大政奉還を実現", "detail": "船中八策を後藤象二郎に示し、将軍慶喜に奉還を決意させる。無血革命。",
             "tags": ["breakthrough"]},
            {"year": 1867, "age": 32, "title": "京都・近江屋で中岡慎太郎と共に暗殺される", "detail": "11月15日の夜、何者かに斬殺される。犯人は長く不明。享年32。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "日本を今一度せんたくいたし申候。", "source": "姉乙女への手紙 1863"},
            {"text": "世の人は我を何とも言わば言え。我が成すことは我のみぞ知る。", "source": "龍馬の愛唱句"},
            {"text": "俺は議院の役人になるのはいやじゃ。世界の海援隊でもやろうかな。", "source": "西郷隆盛への言葉"},
            {"text": "何の志もなきところに、ぐずぐずして日を送るは、実に大馬鹿者なり。", "source": "権平・乙女への手紙"}
        ]
    },

    # ==================== シューマン ====================
    "schumann": {
        "events": [
            {"year": 1826, "age": 16, "title": "父と姉を相次いで失う", "detail": "父は突然死、姉エミーリエは精神を病み入水自殺。母はロベルトを法律家にしようとした。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1830, "age": 20, "title": "ヴィーク門下で指を壊し、ピアニストの道を断つ", "detail": "指を鍛える器具で中指を傷め、演奏家としての道を失う。作曲家に賭けるしかなくなった。",
             "tags": ["pride_broken", "restart", "illness"]},
            {"year": 1834, "age": 23, "title": "『新音楽時報』創刊", "detail": "音楽批評誌を創刊、ショパン・ブラームスを『新しい道』と世に紹介した。『フロレスタン』『オイゼビウス』の筆名。",
             "tags": ["breakthrough"]},
            {"year": 1840, "age": 29, "title": "『歌の年』—師ヴィークを裁判で破りクララと結婚", "detail": "クララの父は猛反対し裁判に。勝訴後の歓喜の中で140曲以上の歌曲を作った。『詩人の恋』もこの年。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1854, "age": 43, "title": "ライン川に投身、以後精神病院へ", "detail": "幻聴に苦しみライン川に飛び込むが漁師に救われる。自らの望みでエンデニッヒの療養院に入る。",
             "tags": ["illness", "pride_broken"]},
            {"year": 1856, "age": 46, "title": "療養院で死去、ブラームスとクララが看取る", "detail": "2年半の療養の末、妻クララはほとんど面会を許されなかった。最期の数日だけ再会できた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽は心の普遍的な言語である。", "source": "書簡"},
            {"text": "若い芸術家は、自分の心の命じるままに書くべきだ。", "source": "『音楽家のための家訓と人生訓』"},
            {"text": "帽子を取れ、諸君、天才だ！", "source": "ショパン作品を最初に評した有名な一文"}
        ],
        "works": [
            {"title": "ピアノ協奏曲 イ短調 作品54", "year": 1845, "type": "協奏曲",
             "description": "クララのために書いた唯一のピアノ協奏曲",
             "youtubeId": "gLnEjwkLN2Y"},
            {"title": "子供の情景 作品15（『トロイメライ』含む）", "year": 1838, "type": "ピアノ曲",
             "description": "大人が子供の頃を振り返る13の小品",
             "youtubeId": "wAbLbeLu2OI",
             "imslpUrl": "https://imslp.org/wiki/Kinderszenen%2C_Op.15_(Schumann%2C_Robert)"},
            {"title": "謝肉祭 作品9", "year": 1835, "type": "ピアノ曲",
             "description": "ダヴィッド同盟の仲間たちが次々登場する仮装舞踏会",
             "youtubeId": "eVA8Lf3PnpA",
             "imslpUrl": "https://imslp.org/wiki/Carnaval%2C_Op.9_(Schumann%2C_Robert)"},
            {"title": "歌曲集『詩人の恋』作品48", "year": 1840, "type": "歌曲",
             "description": "ハイネの詩による16の恋の歌",
             "youtubeId": "K5M-WLTnnmI"}
        ]
    }
}


def merge_events(existing, new):
    keys = set((e.get("year"), e.get("title")) for e in existing)
    for e in new:
        if (e.get("year"), e.get("title")) in keys:
            continue
        existing.append(e)
    # sort by year
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
