# -*- coding: utf-8 -*-
"""第5弾（最終）：既存人物の深化（16人）"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    # ==================== 老子 ====================
    "laozi": {
        "events": [
            {"year": -571, "age": 0, "title": "楚の国・苦県（現在の河南省鹿邑）で誕生（伝承）", "detail": "母の胎内に81年いたという伝説。生まれたときすでに白髪で老いていた、ゆえに『老子』と名付けられたとも。",
             "tags": []},
            {"year": -521, "age": 50, "title": "周王朝の守蔵室の史（図書館長）", "detail": "天下の典籍を守る官職。知の中心にいた。",
             "tags": ["approval"]},
            {"year": -517, "age": 54, "title": "若き孔子の訪問を受ける", "detail": "魯の国から礼について問いに来た孔子に『驕気と多欲を去れ』と諭した。孔子は帰って『老子はまるで龍のようだ、捉えられぬ』と弟子に語ったと伝わる。",
             "tags": ["turning_encounter"]},
            {"year": -500, "age": 71, "title": "周王朝の衰退を悟り、官を辞す", "detail": "『隠れるに如かず』と判断。すべてを捨てる決意。",
             "tags": ["restart", "isolation"]},
            {"year": -480, "age": 91, "title": "水牛に乗って関を越え、西へ去って消える", "detail": "函谷関で関守・尹喜に『あなたは隠遁する前に、道を書き残してください』と求められ、5000字の『道徳経』を書いて西へ去った。以後、行方知れず。",
             "tags": ["restart", "isolation", "breakthrough"]}
        ],
        "quotes": [
            {"text": "上善は水の如し。", "source": "『道徳経』第八章"},
            {"text": "大道廃れて仁義あり。", "source": "『道徳経』第十八章"},
            {"text": "知る者は言わず、言う者は知らず。", "source": "『道徳経』第五十六章"},
            {"text": "道の道とすべきは、常の道にあらず。", "source": "『道徳経』第一章 冒頭"},
            {"text": "足るを知る者は富み、強めて行う者は志あり。", "source": "『道徳経』第三十三章"},
            {"text": "千里の行も、足下より始まる。", "source": "『道徳経』第六十四章"},
            {"text": "柔よく剛を制し、弱よく強を制す。", "source": "『道徳経』第三十六章"}
        ]
    },

    # ==================== フーコー ====================
    "foucault": {
        "events": [
            {"year": 1948, "age": 22, "title": "高等師範学校入学、すぐに自殺未遂", "detail": "同性愛への自己嫌悪と父との確執で重度の鬱。父はパリの名医に診せた。",
             "tags": ["pride_broken", "parent_conflict", "isolation"]},
            {"year": 1955, "age": 29, "title": "スウェーデン、ポーランド、ドイツを転々", "detail": "フランスを離れ、ウプサラ大学の仏文講師などとして5年の『亡命』生活。",
             "tags": ["restart", "isolation"]},
            {"year": 1961, "age": 35, "title": "『狂気の歴史』博士論文、出版", "detail": "理性の側から『狂気』を排除してきた歴史を暴く。937ページの大著。",
             "tags": ["breakthrough"]},
            {"year": 1963, "age": 37, "title": "ダニエル・デフェールと出会い、生涯の伴侶に", "detail": "23年続いたパートナー。フーコーの全著作を看取った相手。",
             "tags": ["turning_encounter"]},
            {"year": 1966, "age": 40, "title": "『言葉と物』ベストセラー", "detail": "『人間は海辺の砂に描かれた顔のように消え去る』というラストで知識人の必読書に。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1970, "age": 44, "title": "コレージュ・ド・フランス教授に就任", "detail": "フランス最高学府の教授職。毎年公開講義で新しい主題を語った。",
             "tags": ["approval"]},
            {"year": 1975, "age": 49, "title": "『監獄の誕生』刊行", "detail": "パノプティコンと規律権力の分析。近代社会批判の到達点。",
             "tags": ["breakthrough"]},
            {"year": 1976, "age": 50, "title": "『性の歴史 第1巻』刊行、以後8年間沈黙", "detail": "構想の全面見直し。自らのセクシュアリティとの格闘。",
             "tags": ["blank_period"]},
            {"year": 1984, "age": 57, "title": "パリでエイズにより死去", "detail": "『性の歴史』第2・3巻は病床で校正。死の直前に『これで最後の仕事が出来た』と伝わる。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間はたぶん、海辺の砂に描かれた顔のように消え去るであろう。", "source": "『言葉と物』"},
            {"text": "権力は常に下から来る。", "source": "『性の歴史 第1巻』"},
            {"text": "知とは、それで考える武器である。", "source": "講義録"},
            {"text": "私は誰か？ などと問うな。私が変わらずに同じであれと求めるな。", "source": "『知の考古学』"},
            {"text": "どこにでも権力はある、なぜならどこからでも発するからだ。", "source": "『性の歴史 第1巻』"}
        ]
    },

    # ==================== ボーヴォワール ====================
    "beauvoir": {
        "events": [
            {"year": 1908, "age": 0, "title": "パリ・モンパルナスのブルジョワ家庭に誕生", "detail": "父は弁護士、母は敬虔なカトリック。早熟で本を貪り読む少女だった。",
             "tags": []},
            {"year": 1929, "age": 21, "title": "高等教員資格試験で女性最年少合格、2位", "detail": "1位はサルトル。審査員が長く議論した末のわずかな差。この試験が生涯の出会いに。",
             "tags": ["breakthrough", "turning_encounter"]},
            {"year": 1929, "age": 21, "title": "サルトルと『契約結婚』", "detail": "2年ごとに更新する『必然的な愛』と『偶然の愛』を互いに許す関係。以後51年続いた。",
             "tags": ["turning_encounter"]},
            {"year": 1943, "age": 35, "title": "『招かれた女』で作家デビュー", "detail": "サルトル・ボーヴォワール・オルガ(生徒)の三角関係を自伝的に描く。",
             "tags": ["breakthrough"]},
            {"year": 1945, "age": 37, "title": "雑誌『レ・タン・モデルヌ』創刊メンバーに", "detail": "サルトル・メルロ＝ポンティと共に戦後フランス知識人界の中心へ。",
             "tags": ["breakthrough"]},
            {"year": 1949, "age": 41, "title": "『第二の性』刊行、『人は女に生まれるのではない、女になるのだ』", "detail": "2週間で2万部売れる。ヴァチカンは禁書指定、同時にフェミニズムの聖典となった。",
             "tags": ["breakthrough", "approval", "pride_broken"]},
            {"year": 1947, "age": 39, "title": "米国の作家ネルソン・オルグレンとの激しい恋", "detail": "シカゴで出会った『偶然の愛』が本当の恋となる。サルトルとの関係を壊さなかったのは奇跡。",
             "tags": ["turning_encounter", "heartbreak"]},
            {"year": 1958, "age": 50, "title": "『娘時代』以降の自伝4部作執筆開始", "detail": "『女ざかり』『或る戦後』『決算のとき』。20世紀女性知識人の精神史。",
             "tags": []},
            {"year": 1964, "age": 56, "title": "母フランソワーズを癌で見送り『おだやかな死』を書く", "detail": "『おだやかな死』は自伝ではない唯一の会心作。",
             "tags": ["loss"]},
            {"year": 1980, "age": 72, "title": "サルトルの死去", "detail": "最後は病床で添い遂げた。『サルトルの死は彼の側で眠れる幸福を私から奪った』",
             "tags": ["loss", "heartbreak"]},
            {"year": 1986, "age": 78, "title": "パリで死去", "detail": "サルトルと同じモンパルナス墓地の隣に埋葬された。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人は女に生まれるのではない、女になるのだ。", "source": "『第二の性』第2巻冒頭"},
            {"text": "自由とは選び続けることであり、選ばないという選びも選ぶことだ。", "source": "『曖昧さの倫理のために』"},
            {"text": "この世でいちばん重要なのは、自分の人生を選ぶ自由である。", "source": "『自伝』"},
            {"text": "老いは自覚よりも先に、他人の眼差しにやってくる。", "source": "『老い』"},
            {"text": "結婚することは、必ずしも愛することの証ではない。", "source": "『第二の性』"}
        ]
    },

    # ==================== ルソー ====================
    "rousseau": {
        "events": [
            {"year": 1712, "age": 0, "title": "ジュネーヴで誕生、母は産後9日で死去", "detail": "時計職人の父に育てられる。『私の不幸な誕生とともに、母が命を落とした』。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1722, "age": 10, "title": "父が決闘で追放、叔父に預けられる", "detail": "父子は別離。十代の孤独が始まる。",
             "tags": ["parent_conflict"]},
            {"year": 1728, "age": 16, "title": "ジュネーヴを出奔、放浪の旅", "detail": "日没後に街の門に遅れて到着し『もう戻らない』と決意。以後アンシーのヴァランス夫人のもとへ。",
             "tags": ["restart"]},
            {"year": 1731, "age": 19, "title": "ヴァランス夫人と同居、知性の開花", "detail": "13歳年上の保護者であり愛人。『ママン』と呼んだ。『私の青春の真の誕生地』。",
             "tags": ["turning_encounter"]},
            {"year": 1745, "age": 33, "title": "テレーズ・ルヴァスールと事実婚", "detail": "宿屋の女中だった文盲の女性。5人の子をもうけるが、全員孤児院に送った。",
             "tags": ["turning_encounter", "pride_broken"]},
            {"year": 1749, "age": 37, "title": "『学問芸術論』でディジョン・アカデミー懸賞に入選", "detail": "『学問の進歩は道徳を堕落させた』という逆説。無名のルソーを一夜で有名にした。",
             "tags": ["breakthrough"]},
            {"year": 1761, "age": 49, "title": "『新エロイーズ』大ヒット", "detail": "書簡体恋愛小説。18世紀最大のベストセラー。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1762, "age": 50, "title": "『社会契約論』『エミール』刊行、両書とも発禁", "detail": "パリとジュネーヴ両方で禁書・逮捕状。亡命生活へ。",
             "tags": ["breakthrough", "isolation"]},
            {"year": 1766, "age": 54, "title": "ヒュームに招かれ英国へ、すぐに決裂", "detail": "被害妄想的になり、恩人ヒュームを敵と決めつけた。晩年の精神の歪みが表面化。",
             "tags": ["heartbreak", "pride_broken"]},
            {"year": 1770, "age": 58, "title": "『告白』原稿朗読会", "detail": "14時間連続で自伝を朗読。衝撃的な自己開示で聴衆は言葉を失った。",
             "tags": []},
            {"year": 1778, "age": 66, "title": "エルムノンヴィルの隠棲地で客死", "detail": "散歩中に倒れて。『告白』は死後刊行。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間は自由なものとして生まれたが、いたるところで鎖につながれている。", "source": "『社会契約論』第1編冒頭"},
            {"text": "自然に帰れ。", "source": "ルソー思想を要約する言葉"},
            {"text": "私は自分を、他のどの人間とも同じではないと感じる。", "source": "『告白』冒頭"},
            {"text": "子供を不幸にする最も確実な方法は何か？ それは彼に常に何でも与えてやることだ。", "source": "『エミール』"},
            {"text": "忍耐は苦いが、その実は甘い。", "source": "『エミール』"},
            {"text": "服従し忍耐することを学ばぬ者は、命令する資格がない。", "source": "『社会契約論』"}
        ]
    },

    # ==================== プッチーニ ====================
    "puccini": {
        "events": [
            {"year": 1858, "age": 0, "title": "ルッカの音楽家一族に誕生", "detail": "4代続く教会音楽家の家系。父は早世し母に育てられた。",
             "tags": ["parent_conflict"]},
            {"year": 1876, "age": 18, "title": "ピサまで20km歩きヴェルディ『アイーダ』を観劇", "detail": "これが生涯を決めた。『オペラ作曲家になる』と誓う。",
             "tags": ["turning_encounter"]},
            {"year": 1884, "age": 26, "title": "人妻エルヴィーラと駆け落ち", "detail": "スキャンダルだが生涯の伴侶となる。夫の死を経て1904年に正式に結婚。",
             "tags": ["restart", "heartbreak"]},
            {"year": 1893, "age": 35, "title": "『マノン・レスコー』成功で出版社リコルディと専属契約", "detail": "ヴェルディの後継者として世に認められる。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1896, "age": 38, "title": "『ラ・ボエーム』初演、トスカニーニ指揮", "detail": "批評は割れたが観客が熱狂。クラシックの最も愛される悲恋物語に。",
             "tags": ["breakthrough"]},
            {"year": 1900, "age": 41, "title": "『トスカ』初演", "detail": "ローマ・コンスタンツィ劇場で。爆弾脅迫の中での初日だった。",
             "tags": ["breakthrough"]},
            {"year": 1903, "age": 44, "title": "自動車事故で大怪我、糖尿病発覚", "detail": "8ヶ月の療養。治療中に『蝶々夫人』を書き続けた。",
             "tags": ["illness", "pride_broken"]},
            {"year": 1904, "age": 45, "title": "『蝶々夫人』初演、初日は大失敗", "detail": "ミラノ・スカラ座で動物の声で野次られる歴史的失敗。4ヶ月で改訂し成功に変えた。",
             "tags": ["pride_broken", "breakthrough"]},
            {"year": 1909, "age": 50, "title": "女中ドーリア自殺事件", "detail": "妻の嫉妬妄想で疑いをかけられた女中が服毒自殺。検死で潔白が証明され、プッチーニ家は慰謝料を支払った。深い傷となる。",
             "tags": ["loss", "pride_broken"]},
            {"year": 1923, "age": 64, "title": "喉頭癌と診断", "detail": "愛煙家の代償。ブリュッセルで実験的放射線治療を受ける決意。",
             "tags": ["illness"]},
            {"year": 1924, "age": 65, "title": "ブリュッセルで手術中に心臓麻痺で死去", "detail": "『トゥーランドット』第3幕途中で絶筆。翌年トスカニーニ初演時、ペンが止まった場所で指揮を中断した。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "偉大な愛だけが、偉大な痛みを与えてくれる。", "source": "プッチーニの手紙"},
            {"text": "私はただ小さな物語を書きたいのだ。そこで泣き、愛し、死ぬ人々の物語を。", "source": "書簡"},
            {"text": "最も美しい歌は、いつも歌われないまま終わる。", "source": "プッチーニに帰される言葉"}
        ],
        "works": [
            {"title": "歌劇『ラ・ボエーム』", "year": 1896, "type": "オペラ",
             "description": "貧しい芸術家とお針子の4幕の悲恋。『私の名はミミ』の名アリア",
             "youtubeId": "UYfhPDXLeDg"},
            {"title": "歌劇『トスカ』", "year": 1900, "type": "オペラ",
             "description": "ローマを舞台にした政治的サスペンス・オペラ。『歌に生き、愛に生き』",
             "youtubeId": "_QT-SqeOu5Y"},
            {"title": "歌劇『蝶々夫人』", "year": 1904, "type": "オペラ",
             "description": "長崎を舞台にしたアメリカ人将校との悲恋",
             "youtubeId": "xpsZzZ6P5gI"},
            {"title": "歌劇『トゥーランドット』より『誰も寝てはならぬ』", "year": 1924, "type": "オペラ",
             "description": "絶筆オペラの最高のアリア",
             "youtubeId": "cWc7vYjgnTs"}
        ]
    },

    # ==================== シベリウス ====================
    "sibelius": {
        "events": [
            {"year": 1865, "age": 0, "title": "ハメーンリンナに軍医の子として誕生", "detail": "2歳で父をチフスで失う。母と祖母の家で育つ。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1885, "age": 20, "title": "ヘルシンキで法学部から音楽院へ転身", "detail": "法学を諦め作曲家を目指す。ヴァイオリニスト志望だったが遅すぎた。",
             "tags": ["restart"]},
            {"year": 1892, "age": 27, "title": "アイノ・ヤルネフェルトと結婚", "detail": "将軍の娘で教養深い女性。生涯の理解者となる。",
             "tags": ["turning_encounter"]},
            {"year": 1899, "age": 33, "title": "『フィンランディア』作曲", "detail": "ロシア支配下、愛国劇の付随音楽として。上演禁止にもかかわらず民衆の愛国歌となる。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1904, "age": 38, "title": "ヤルヴェンパーに『アイノラ』邸完成", "detail": "妻の名を取った森の中の家。以後53年ここで暮らす。",
             "tags": ["restart"]},
            {"year": 1908, "age": 42, "title": "咽頭癌と誤診され手術", "detail": "その後禁煙禁酒を10年続ける。深い精神的危機から交響曲第4番が生まれた。",
             "tags": ["illness", "turning_encounter"]},
            {"year": 1915, "age": 49, "title": "交響曲第5番初演、50歳の誕生日", "detail": "国民的祝日として初演された。白鳥の飛翔から着想を得た終楽章。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1924, "age": 58, "title": "交響曲第7番完成、最後の交響曲", "detail": "単楽章20分の革新的構造。以後交響曲を書かなかった。",
             "tags": ["breakthrough"]},
            {"year": 1926, "age": 60, "title": "交響詩『タピオラ』作曲、以後大作の筆が止まる", "detail": "北欧の森の神タピオの音楽。これが最後の大作となった。",
             "tags": ["blank_period"]},
            {"year": 1945, "age": 79, "title": "第8番交響曲の原稿を暖炉で焼く", "detail": "長年待ち続けた新作を自らの手で燃やす。『シベリウスの沈黙』の完結。",
             "tags": ["pride_broken", "blank_period"]},
            {"year": 1957, "age": 91, "title": "アイノラ荘で脳出血により死去", "detail": "ベルグルンド指揮の第5番がラジオで流れた2日後に逝った。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "批評家の言葉に耳を貸すな。彼らのために像が建てられたことは一度もない。", "source": "シベリウスの言葉"},
            {"text": "音楽は言葉の始まるところで始まる。", "source": "シベリウスの日記"},
            {"text": "他人は私を越えることができる。しかし私自身を越えられるのは、私だけだ。", "source": "日記"}
        ],
        "works": [
            {"title": "交響詩『フィンランディア』作品26", "year": 1899, "type": "管弦楽",
             "description": "独立運動の魂",
             "youtubeId": "F5zg_af9b8c"},
            {"title": "ヴァイオリン協奏曲 ニ短調 作品47", "year": 1905, "type": "協奏曲",
             "description": "20世紀最高のヴァイオリン協奏曲のひとつ",
             "youtubeId": "OPfTx8Jok1s"},
            {"title": "交響曲第2番 ニ長調 作品43", "year": 1902, "type": "交響曲",
             "description": "最も愛されるシベリウス交響曲",
             "youtubeId": "CDZS-Uv0NpI"},
            {"title": "交響曲第5番 変ホ長調 作品82", "year": 1915, "type": "交響曲",
             "description": "白鳥の飛翔から生まれた終楽章",
             "youtubeId": "5W5lpyr4Jgg"},
            {"title": "交響詩『タピオラ』作品112", "year": 1926, "type": "管弦楽",
             "description": "最後の大作。北欧の森の霊",
             "youtubeId": "W0nf48vsIyQ"}
        ]
    },

    # ==================== プロコフィエフ ====================
    "prokofiev": {
        "events": [
            {"year": 1891, "age": 0, "title": "ウクライナ東部の農場主の子に", "detail": "5歳でピアノを弾き始める神童。母に育てられ、9歳で最初のオペラを書いた。",
             "tags": ["approval"]},
            {"year": 1914, "age": 23, "title": "ペテルブルク音楽院の卒業試験で一位", "detail": "自作のピアノ協奏曲第1番を自ら弾いて優勝。伝統派を蹴散らした。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1918, "age": 27, "title": "革命を避けて日本経由でアメリカへ", "detail": "シベリア鉄道で敦賀から東京・横浜へ。日本で3ヶ月過ごしながらサンフランシスコへ。",
             "tags": ["restart", "isolation"]},
            {"year": 1923, "age": 32, "title": "リーナ・リュベラと結婚", "detail": "スペイン系の歌手との国際結婚。2人の息子をもうける。",
             "tags": ["turning_encounter"]},
            {"year": 1932, "age": 41, "title": "ソ連帰国を決意", "detail": "亡命15年。『西欧では最初の一枚しか売れない』と判断。故国の豊かな伝統への渇望。",
             "tags": []},
            {"year": 1936, "age": 45, "title": "ソ連に完全帰国", "detail": "以後『形式主義』批判と栄光を往復する苦難の後半生。",
             "tags": ["restart"]},
            {"year": 1936, "age": 45, "title": "『ピーターと狼』初演", "detail": "モスクワ少年音楽院のための教育作品。世界中の子供たちの最愛の曲に。",
             "tags": ["breakthrough"]},
            {"year": 1941, "age": 50, "title": "リーナと別れ、25歳年下ミラと暮らす", "detail": "正式離婚せずに同居。後にリーナはスパイ容疑でシベリア送りにされる。",
             "tags": ["heartbreak"]},
            {"year": 1948, "age": 57, "title": "ジダーノフ批判、『形式主義者』として名指し", "detail": "ショスタコーヴィチと並び糾弾される。この年の脳溢血で体力も失う。",
             "tags": ["pride_broken", "illness"]},
            {"year": 1953, "age": 61, "title": "スターリンと同日死去（3月5日）", "detail": "独裁者の葬儀のため花すら手に入らず、新聞の死亡記事は数日後に小さく。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "自らを陳腐さから守る唯一の手段は、より良い作品を書き続けることだ。", "source": "プロコフィエフの言葉"},
            {"text": "私は常に新しいもの、独自のものを望んできた。", "source": "自伝"},
            {"text": "作曲家の義務は、自分の時代の人間について真実を語ることだ。", "source": "プロコフィエフの言葉"}
        ],
        "works": [
            {"title": "ピーターと狼 作品67", "year": 1936, "type": "管弦楽",
             "description": "ナレーションと管弦楽の子供向け物語",
             "youtubeId": "t7-CLA5zXT0"},
            {"title": "ピアノ協奏曲第3番 ハ長調 作品26", "year": 1921, "type": "協奏曲",
             "description": "機械的なリズムと歌心",
             "youtubeId": "gdLqA6GXa1U"},
            {"title": "バレエ『ロメオとジュリエット』作品64", "year": 1935, "type": "バレエ",
             "description": "『騎士たちの踊り』は最も有名な悲劇音楽",
             "youtubeId": "h0KnIhlOvYM"},
            {"title": "交響曲第1番『古典』ニ長調 作品25", "year": 1917, "type": "交響曲",
             "description": "ハイドン風の新古典主義的傑作",
             "youtubeId": "3tsI00uPs2s"},
            {"title": "ピアノソナタ第7番『戦争ソナタ』作品83", "year": 1942, "type": "ピアノ曲",
             "description": "戦時中の激しいソナタ。リヒテルが初演",
             "youtubeId": "hohV2zyTUg0"}
        ]
    },

    # ==================== ガーシュウィン ====================
    "gershwin": {
        "events": [
            {"year": 1898, "age": 0, "title": "ニューヨーク・ブルックリンに誕生", "detail": "ロシア系ユダヤ人移民の家庭。兄アイラとの名コンビは後に生涯の作詞家に。",
             "tags": []},
            {"year": 1912, "age": 14, "title": "両親が買ってくれたピアノに夢中に", "detail": "兄のために買ったピアノを弟が独占。音楽教育もろくにないのに耳で弾いた。",
             "tags": ["turning_encounter"]},
            {"year": 1914, "age": 15, "title": "ティン・パン・アレーの出版社でピアノ・プラッガーに", "detail": "15歳で中学をやめ週15ドルで楽譜を客に聴かせる仕事。当時最年少。",
             "tags": ["restart"]},
            {"year": 1919, "age": 21, "title": "『スワニー』大ヒット", "detail": "アル・ジョルソンが歌い100万枚売れた。印税で初めて大金を手にする。",
             "tags": ["breakthrough"]},
            {"year": 1924, "age": 25, "title": "『ラプソディ・イン・ブルー』初演", "detail": "ポール・ホワイトマン楽団の依頼で2週間で書き上げた。ジャズ交響楽の誕生。",
             "tags": ["breakthrough"]},
            {"year": 1928, "age": 30, "title": "ヨーロッパ旅行、ラヴェルに弟子入り志願", "detail": "『あなたは一流のガーシュウィンで、二流のラヴェルにはなるな』と断られた。",
             "tags": ["turning_encounter", "pride_broken"]},
            {"year": 1935, "age": 36, "title": "『ポーギーとベス』初演", "detail": "全黒人キャストによるアメリカン・フォーク・オペラ。初演は興行的に失敗、死後に名作と認められた。",
             "tags": ["breakthrough", "pride_broken"]},
            {"year": 1936, "age": 37, "title": "ハリウッドへ", "detail": "『レッツ・ダンス』『シャル・ウィ・ダンス』など映画音楽へ。フレッド・アステアと組む。",
             "tags": ["restart"]},
            {"year": 1937, "age": 38, "title": "演奏中に頭痛発作、脳腫瘍と判明", "detail": "6月11日、ピアノを弾いていて崩れ落ちた。原因不明の激痛に数ヶ月苦しむ。",
             "tags": ["illness"]},
            {"year": 1937, "age": 38, "title": "ビバリーヒルズで手術後死去", "detail": "7月11日早朝、膠芽腫の緊急手術後に意識を取り戻さず。『ガーシュウィンは死なない。ガーシュウィン作品が生きている限り』とシェーンベルクが追悼。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人生はジャズとよく似ている。即興で弾くときが一番いい。", "source": "ガーシュウィンに帰される言葉"},
            {"text": "真の音楽は、人が心の底で自然に感じるものから生まれる。", "source": "ガーシュウィンの言葉"},
            {"text": "ジャズは民衆の音楽だ。だから永遠に生きる。", "source": "ガーシュウィンの言葉"}
        ],
        "works": [
            {"title": "ラプソディ・イン・ブルー", "year": 1924, "type": "協奏曲",
             "description": "ジャズとクラシックの融合",
             "youtubeId": "ynEOo28lsbc"},
            {"title": "パリのアメリカ人", "year": 1928, "type": "管弦楽",
             "description": "タクシーのクラクションが登場する陽気な交響詩",
             "youtubeId": "2_lVylvm_w4"},
            {"title": "歌劇『ポーギーとベス』より『サマータイム』", "year": 1935, "type": "オペラ",
             "description": "20世紀最も歌われた子守歌",
             "youtubeId": "t6aiJlOZ1-A"},
            {"title": "ピアノ協奏曲 ヘ調", "year": 1925, "type": "協奏曲",
             "description": "『ラプソディ』の次に書いた本格的協奏曲",
             "youtubeId": "ZtCPIOl6VDE"}
        ]
    },

    # ==================== バルトーク ====================
    "bartok": {
        "events": [
            {"year": 1881, "age": 0, "title": "ハンガリー・ナジセントミクローシュに誕生", "detail": "父は農学校校長、7歳で死別。母は教師として子を育てた。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1899, "age": 18, "title": "ブダペスト音楽院でドホナーニと学ぶ", "detail": "演奏家として出発、シュトラウス『英雄の生涯』ピアノ版に衝撃を受ける。",
             "tags": ["turning_encounter"]},
            {"year": 1905, "age": 24, "title": "田舎娘の歌に民俗音楽への覚醒", "detail": "汽車の中で偶然聞いた農民の歌。当時『ジプシー音楽=ハンガリー』と信じられていた通念が崩れる。",
             "tags": ["turning_encounter"]},
            {"year": 1906, "age": 25, "title": "コダーイと民謡採集を開始", "detail": "エジソンの蝋管を担いで東欧の村々を歩く。農民の歌を録音する民族音楽学の祖。",
             "tags": ["breakthrough"]},
            {"year": 1911, "age": 30, "title": "オペラ『青ひげ公の城』完成", "detail": "コンクールで落選、15年間初演されなかった唯一のオペラ。",
             "tags": ["pride_broken"]},
            {"year": 1923, "age": 42, "title": "前妻と離婚、弟子ディッタと再婚", "detail": "20歳年下のピアニスト。以後の協奏曲は彼女と二重奏で初演した。",
             "tags": ["turning_encounter"]},
            {"year": 1936, "age": 55, "title": "『弦チェレ』完成", "detail": "弦楽器・打楽器・チェレスタのための音楽。20世紀音楽の金字塔。",
             "tags": ["breakthrough"]},
            {"year": 1940, "age": 59, "title": "ナチスの迫害を避け米国へ亡命", "detail": "母の葬儀を待ってから渡航。コロンビア大学で民謡研究員となるが、研究費打ち切りで生活苦。",
             "tags": ["restart", "isolation"]},
            {"year": 1943, "age": 62, "title": "『管弦楽のための協奏曲』完成", "detail": "クーセヴィツキーの依頼で、病床の栄養失調状態で書いた最後の傑作。",
             "tags": ["breakthrough"]},
            {"year": 1945, "age": 64, "title": "ニューヨークで白血病により死去", "detail": "『もっと書きたいことがあったのに』が最期の言葉。故国の解放を知らずに逝った。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "芸術家の真の仕事は、時代の『正しい音』を探し出すことだ。", "source": "バルトーク書簡"},
            {"text": "民謡という泉から汲み上げぬ者は、枯れる。", "source": "バルトークの論文"},
            {"text": "もっと書きたいことがあったのに。", "source": "最期の言葉 1945"}
        ],
        "works": [
            {"title": "弦楽器、打楽器とチェレスタのための音楽", "year": 1936, "type": "管弦楽",
             "description": "20世紀音楽の金字塔",
             "youtubeId": "0f8g56VbjHg"},
            {"title": "管弦楽のための協奏曲", "year": 1943, "type": "管弦楽",
             "description": "亡命先ニューヨークで書いた最後の傑作",
             "youtubeId": "I0jtt58DYxA"},
            {"title": "ミクロコスモス", "year": 1939, "type": "ピアノ曲",
             "description": "初心者から上級者まで育てる153曲のピアノ学習曲集",
             "youtubeId": "V4V6iwOgMdE"},
            {"title": "ルーマニア民俗舞曲", "year": 1915, "type": "ピアノ曲",
             "description": "民謡採集の成果をまとめた6つの舞曲",
             "youtubeId": "0MhMGBTDqEE"}
        ]
    },

    # ==================== メンデルスゾーン ====================
    "mendelssohn": {
        "events": [
            {"year": 1809, "age": 0, "title": "ハンブルクに誕生", "detail": "哲学者モーゼス・メンデルスゾーンの孫。一家はユダヤ教からプロテスタントに改宗。",
             "tags": ["approval"]},
            {"year": 1816, "age": 7, "title": "パリでピアノ公開デビュー", "detail": "神童として欧州中に知られる。ゲーテも7歳の彼に魅了された。",
             "tags": ["approval"]},
            {"year": 1826, "age": 17, "title": "『真夏の夜の夢』序曲作曲", "detail": "17歳で書いた管弦楽の傑作。16年後に劇付随音楽として完成。",
             "tags": ["breakthrough"]},
            {"year": 1829, "age": 20, "title": "バッハ『マタイ受難曲』を百年ぶりに蘇演", "detail": "ベルリンジングアカデミーで指揮。バッハ再評価の決定的瞬間。",
             "tags": ["breakthrough"]},
            {"year": 1835, "age": 26, "title": "ライプツィヒ・ゲヴァントハウス音楽監督", "detail": "以後12年、ヨーロッパ最高の楽壇を築く。シューマン・ショパンとも交流。",
             "tags": ["breakthrough"]},
            {"year": 1837, "age": 28, "title": "セシール・ジャンルノーと結婚", "detail": "フランス系ユグノーの美しい牧師の娘と。5人の子をもうけた幸福な結婚。",
             "tags": ["turning_encounter"]},
            {"year": 1843, "age": 34, "title": "ライプツィヒ音楽院創設", "detail": "シューマンを同僚に招いた欧州屈指の音楽学校。現存する。",
             "tags": ["breakthrough"]},
            {"year": 1844, "age": 35, "title": "ヴァイオリン協奏曲ホ短調完成", "detail": "親友ヴァイオリニストのダヴィッドに捧げた、三大協奏曲のひとつ。",
             "tags": ["breakthrough"]},
            {"year": 1847, "age": 38, "title": "姉ファニー急死の半年後、自身も急逝", "detail": "最愛の姉の訃報で倒れ、半年間で3度の脳卒中。11月4日に死去。『姉のもとへ行く』が最後の言葉。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "言葉では言い表せないものこそ、音楽で表現されるのだ。", "source": "メンデルスゾーンの手紙"},
            {"text": "音楽は一つの言語であり、国境を超えた人類共通の言葉である。", "source": "書簡"},
            {"text": "私は音楽でしか、自分の感情を正確に語れない。", "source": "書簡"}
        ],
        "works": [
            {"title": "ヴァイオリン協奏曲 ホ短調 作品64", "year": 1844, "type": "協奏曲",
             "description": "三大ヴァイオリン協奏曲のひとつ",
             "youtubeId": "o1dBg__wsuo"},
            {"title": "交響曲第4番『イタリア』イ長調 作品90", "year": 1833, "type": "交響曲",
             "description": "イタリア旅行の印象を描く陽光の交響曲",
             "youtubeId": "j4ib3uQ0fiQ"},
            {"title": "劇付随音楽『真夏の夜の夢』作品61", "year": 1842, "type": "劇付随音楽",
             "description": "『結婚行進曲』で最も有名",
             "youtubeId": "4sHWJfnUKn8"},
            {"title": "無言歌集", "year": 1845, "type": "ピアノ曲",
             "description": "歌詞のない歌。全48曲のピアノ小品",
             "youtubeId": "sG7uT4sSxWY"},
            {"title": "オラトリオ『エリヤ』作品70", "year": 1846, "type": "宗教曲",
             "description": "ヘンデル以来のイギリス・オラトリオの傑作",
             "youtubeId": "yp8VmPDMXMw"}
        ]
    },

    # ==================== ヴィヴァルディ ====================
    "vivaldi": {
        "events": [
            {"year": 1678, "age": 0, "title": "ヴェネツィアで誕生", "detail": "父はサン・マルコのヴァイオリン奏者ジョヴァンニ・バティスタ。喘息持ちの未熟児として早急に洗礼を受けた。",
             "tags": ["illness"]},
            {"year": 1703, "age": 25, "title": "司祭に叙階、同年ピエタ院のヴァイオリン教師に", "detail": "『赤毛の司祭(il Prete Rosso)』。喘息のためミサを執り行えず、作曲に専念。",
             "tags": ["restart", "illness"]},
            {"year": 1716, "age": 38, "title": "ピエタ慈善院音楽監督に昇格", "detail": "孤児の少女たちの合奏団をヨーロッパ有数の楽団に育てた。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1725, "age": 47, "title": "『和声と創意への試み』12曲（『四季』含む）出版", "detail": "アムステルダムで刊行。『四季』は各曲に自作のソネットが添えられた『標題音楽』の嚆矢。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1727, "age": 49, "title": "歌姫アンナ・ジローとの関係が評判に", "detail": "聖職者としての評判を落とす。ジローは生涯付き従い看病した。",
             "tags": ["heartbreak", "pride_broken"]},
            {"year": 1737, "age": 59, "title": "フェラーラ興行失敗、枢機卿に上演を禁止される", "detail": "『女と同居する司祭』として上演禁止。経済的にも精神的にも追い詰められる。",
             "tags": ["pride_broken", "poverty"]},
            {"year": 1741, "age": 63, "title": "ウィーンで貧窮のうちに客死", "detail": "新しい皇帝カール6世の後援を求めて渡墺したが皇帝も直後に死去。葬儀は最も簡素な『無印の葬礼』だった。",
             "tags": ["loss", "isolation"]}
        ],
        "quotes": [
            {"text": "音楽は感情の速記法である。", "source": "ヴィヴァルディに帰される言葉"},
            {"text": "春は来たり。喜びに満ちて鳥たちは歌う。", "source": "『四季・春』のソネット"}
        ],
        "works": [
            {"title": "ヴァイオリン協奏曲集『四季』作品8", "year": 1725, "type": "協奏曲",
             "description": "春・夏・秋・冬の4つのヴァイオリン協奏曲",
             "youtubeId": "mFWQgxXM_b8"},
            {"title": "グローリア ニ長調 RV589", "year": 1715, "type": "宗教曲",
             "description": "孤児院の少女たちのために書かれた、最も愛される宗教曲",
             "youtubeId": "m2IcBsg-mNg"},
            {"title": "調和の霊感 作品3", "year": 1711, "type": "協奏曲",
             "description": "バッハが多数編曲した12の協奏曲集",
             "youtubeId": "ZbI71vdRYm4"},
            {"title": "マンドリン協奏曲 ハ長調 RV425", "year": 1725, "type": "協奏曲",
             "description": "マンドリンの最も有名な独奏曲",
             "youtubeId": "8suqgHFC8cM"}
        ]
    },

    # ==================== ショスタコーヴィチ ====================
    "shostakovich": {
        "events": [
            {"year": 1906, "age": 0, "title": "サンクトペテルブルクに誕生", "detail": "父は化学者、母はピアニスト。1917年革命を11歳で目撃した世代。",
             "tags": []},
            {"year": 1925, "age": 19, "title": "交響曲第1番卒業作品、一夜で世界の作曲家に", "detail": "19歳の試験作品が世界中で演奏され、若きソ連を代表する作曲家に。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1936, "age": 29, "title": "プラウダ紙『音楽のかわりに荒唐無稽』でオペラ批判", "detail": "スターリンが『ムツェンスクのマクベス夫人』を鑑賞中に退席し、2日後の社説で糾弾。枕元に逮捕用のカバンを置いて眠る日々が始まる。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1937, "age": 31, "title": "交響曲第5番で当局に『和解』", "detail": "『正当な批判への実際的な創造的回答』と副題。恭順を装った二重の音楽。歴史的傑作となった。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1941, "age": 35, "title": "包囲下のレニングラードで交響曲第7番『レニングラード』", "detail": "消防団員として屋根で焼夷弾を消しながら作曲。ファシズムへの抵抗の象徴に。",
             "tags": ["breakthrough"]},
            {"year": 1948, "age": 42, "title": "ジダーノフ批判、二度目の糾弾", "detail": "プロコフィエフらと共に『形式主義者』として公職剥奪。教授も解任される。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1953, "age": 46, "title": "スターリン死後、交響曲第10番で自由を謳歌", "detail": "10年封印していた交響曲。スターリン描写と言われる第2楽章の爆発的怒り。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1960, "age": 54, "title": "党に入党、生涯の後悔", "detail": "圧力に屈して入党。弦楽四重奏曲第8番は『自らの記念に』捧げた絶望の音楽。",
             "tags": ["pride_broken"]},
            {"year": 1975, "age": 68, "title": "モスクワで肺癌により死去", "detail": "『証言』とされる回想録が西側で出版され、彼の『二重の音楽』の真意が議論される。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "悲劇を描くことを恐れるな。それが音楽の義務だ。", "source": "ショスタコーヴィチの言葉"},
            {"text": "誰もが自分のラム酒を持っている。私のラム酒は音楽だ。", "source": "書簡"},
            {"text": "音楽は、独裁者の耳にも忍び込み、彼らを裁く。", "source": "『証言』"}
        ],
        "works": [
            {"title": "交響曲第5番 ニ短調 作品47", "year": 1937, "type": "交響曲",
             "description": "『当局への実際的な創造的回答』の二重の傑作",
             "youtubeId": "Pa7vdLHZUlo"},
            {"title": "交響曲第7番『レニングラード』作品60", "year": 1941, "type": "交響曲",
             "description": "包囲下の都市で書かれた、ファシズム抵抗の象徴",
             "youtubeId": "bTVlhYfdjFg"},
            {"title": "ジャズ組曲第2番よりワルツ第2番", "year": 1938, "type": "管弦楽",
             "description": "映画『アイズ ワイド シャット』で使用された哀愁のワルツ",
             "youtubeId": "fJE9DoTu1WQ"},
            {"title": "弦楽四重奏曲第8番 ハ短調 作品110", "year": 1960, "type": "室内楽",
             "description": "『自らの記念に』捧げた絶望の音楽",
             "youtubeId": "_P7FN4cQaf8"},
            {"title": "ピアノ五重奏曲 ト短調 作品57", "year": 1940, "type": "室内楽",
             "description": "スターリン賞を受賞した美しい室内楽"}
        ]
    },

    # ==================== 武満徹 ====================
    "takemitsu": {
        "events": [
            {"year": 1930, "age": 0, "title": "東京に誕生、満州で幼年時代", "detail": "父の仕事で中国東北部で過ごす。7歳で帰国。",
             "tags": []},
            {"year": 1944, "age": 14, "title": "勤労動員先の食堂で、禁断のシャンソン『聞かせてよ愛の言葉を』を聴く", "detail": "下士官が持ち込んだ蓄音機。『これが音楽だ』と衝撃を受け作曲家を志す。戦時下の日本で初めて西洋音楽に出会った。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1950, "age": 20, "title": "独学で作曲を始める", "detail": "音楽大学には行かず、雑誌や楽譜を頼りに独学。結核の療養中に書き進めた。",
             "tags": ["restart", "illness"]},
            {"year": 1951, "age": 21, "title": "『実験工房』結成", "detail": "瀧口修造を精神的支柱に、現代音楽・美術・映像の学際的実験集団。",
             "tags": ["turning_encounter"]},
            {"year": 1957, "age": 27, "title": "『弦楽のためのレクイエム』", "detail": "早坂文雄の死を悼む。ストラヴィンスキーが来日時に激賞したことで世界に知られた。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1967, "age": 37, "title": "『ノヴェンバー・ステップス』ニューヨーク・フィル初演", "detail": "小澤征爾指揮、琵琶・尺八・オーケストラ。東西の伝統が対峙する記念碑的作品。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1970, "age": 40, "title": "大阪万博・鉄鋼館で『ユニバーサル・ステージ』構成", "detail": "日本の現代音楽が万博の晴れ舞台に。",
             "tags": []},
            {"year": 1980, "age": 50, "title": "『遠い呼び声の彼方へ！』完成", "detail": "海外の委嘱作が増え、世界的作曲家としての地位を確立。",
             "tags": []},
            {"year": 1996, "age": 65, "title": "東京で膀胱癌により死去", "detail": "『夢の引用』未完のまま。約100本の映画音楽、200以上のコンサート作品を残した。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音は本来、ただ美しく、ただそこにあるだけだ。", "source": "武満の文集"},
            {"text": "私は、沈黙とひとつひとつの音との対話を大切にしたい。", "source": "『音、沈黙と測りあえるほどに』"},
            {"text": "一つの木から一つの音が生まれるように、一つの音もまた宇宙を持っている。", "source": "武満の言葉"},
            {"text": "音楽とは、聴くものではなく、生きるものだ。", "source": "文集"}
        ],
        "works": [
            {"title": "ノヴェンバー・ステップス", "year": 1967, "type": "管弦楽",
             "description": "琵琶・尺八・オーケストラの対話",
             "youtubeId": "SFBT8uXkGtI"},
            {"title": "弦楽のためのレクイエム", "year": 1957, "type": "管弦楽",
             "description": "ストラヴィンスキーが激賞した出発点",
             "youtubeId": "nDnS-gd9PPY"},
            {"title": "How Slow the Wind", "year": 1991, "type": "管弦楽",
             "description": "ディキンソンの詩から。晩年の静謐"},
            {"title": "『乱』メインテーマ", "year": 1985, "type": "映画音楽",
             "description": "黒澤明監督『乱』のために書かれた壮大な音楽",
             "youtubeId": "cIRmMKqWDl0"},
            {"title": "系図（ファミリー・ツリー）", "year": 1992, "type": "管弦楽",
             "description": "谷川俊太郎の詩を若い女性が朗読する温かい作品"}
        ]
    },

    # ==================== デュティユー ====================
    "dutilleux": {
        "events": [
            {"year": 1916, "age": 0, "title": "フランス北部ドゥーエに誕生", "detail": "一族に画家（デルフトのフェルメールとの遠縁説あり）や音楽家が多い文化的家系。",
             "tags": []},
            {"year": 1938, "age": 22, "title": "ローマ大賞を受賞", "detail": "『バビロンの環』で音楽院最高の栄誉。しかし戦争でローマ滞在は叶わなかった。",
             "tags": ["approval"]},
            {"year": 1940, "age": 24, "title": "第二次大戦で捕虜、脱走", "detail": "ドイツに捕虜として送られるがフランスへ脱出。占領下のパリで音楽を続ける。",
             "tags": ["isolation", "restart"]},
            {"year": 1951, "age": 35, "title": "交響曲第1番、自作への厳しい態度", "detail": "若書きを次々破棄し、自作番号を振り直し続けた。完璧主義の化身。",
             "tags": ["breakthrough", "pride_broken"]},
            {"year": 1954, "age": 38, "title": "ピアニストのジュヌヴィエーヴ・ジョワと結婚", "detail": "生涯の芸術的パートナー。彼女のために多くのピアノ曲を書いた。",
             "tags": ["turning_encounter"]},
            {"year": 1964, "age": 47, "title": "チェロ協奏曲『遙かなる遠い世界』", "detail": "ロストロポーヴィチの委嘱。ボードレールの『悪の華』に着想。現代チェロ曲の最高峰。",
             "tags": ["breakthrough"]},
            {"year": 1970, "age": 54, "title": "パリ国立高等音楽院教授を辞退", "detail": "作曲に専念するため。『教えることは素晴らしいが、私には時間がない』",
             "tags": []},
            {"year": 2008, "age": 92, "title": "妻ジュヌヴィエーヴを失う", "detail": "60年寄り添った妻。以後一人で暮らした。",
             "tags": ["loss", "heartbreak"]},
            {"year": 2013, "age": 97, "title": "パリで死去", "detail": "生涯で残した作品は少ない（約80曲）が全てが珠玉。現代フランス音楽の最後の巨匠。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私は急がない。急げば、時間が私の音楽を奪う。", "source": "デュティユーのインタビュー"},
            {"text": "一つの音は、すでに沈黙を含んでいる。", "source": "書簡"},
            {"text": "完璧を求めるのは贅沢ではない。作曲家の義務だ。", "source": "晩年のインタビュー"}
        ],
        "works": [
            {"title": "交響曲第2番『ル・ドゥーブル』", "year": 1959, "type": "交響曲",
             "description": "室内管弦楽と大管弦楽が対峙する二重構造",
             "youtubeId": "g4tHQqJv8Ao"},
            {"title": "チェロ協奏曲『遥かなる遠い世界』", "year": 1970, "type": "協奏曲",
             "description": "ロストロポーヴィチのために書かれた現代チェロ曲の最高峰",
             "youtubeId": "p0Jc2Hke-QY"},
            {"title": "ピアノ・ソナタ", "year": 1948, "type": "ピアノ曲",
             "description": "妻ジュヌヴィエーヴに捧げた出発点の傑作"},
            {"title": "ヴァイオリン協奏曲『夢の樹』", "year": 1985, "type": "協奏曲",
             "description": "アイザック・スターンのために"},
            {"title": "弦楽四重奏曲『夜はかくの如し』", "year": 1976, "type": "室内楽",
             "description": "ジュヴァン・ヴァン・ゴッホに献呈"}
        ]
    },

    # ==================== 沖田総司 ====================
    "okita_soji": {
        "events": [
            {"year": 1842, "age": 0, "title": "江戸・白河藩上屋敷で誕生", "detail": "白河藩士の子。幼くして父を失い、姉の嫁ぎ先で育つ。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1851, "age": 9, "title": "天然理心流・近藤周助の道場に入門", "detail": "9歳で内弟子として住み込み。近藤勇（6歳年上）と兄弟のように育つ。",
             "tags": ["turning_encounter"]},
            {"year": 1861, "age": 19, "title": "天然理心流塾頭、近藤勇の後継者に", "detail": "『天才』と呼ばれた剣の腕。『無心・無形の斬撃』を極めた。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1863, "age": 21, "title": "浪士組として京都へ、新選組一番隊組長", "detail": "壬生浪士組から新選組へ。最年少ながら最強の剣士。",
             "tags": ["restart"]},
            {"year": 1863, "age": 21, "title": "芹沢鴨暗殺に関与", "detail": "9月18日、新選組内紛の粛清。沖田は見張り役と伝わる。",
             "tags": []},
            {"year": 1864, "age": 22, "title": "池田屋事件、激闘の中で喀血", "detail": "祇園祭宵山の夜の急襲。20数人を相手に大立ち回りを演じながら血を吐いて倒れた。結核の発症。",
             "tags": ["breakthrough", "illness"]},
            {"year": 1867, "age": 25, "title": "病状悪化で戦列離脱", "detail": "近藤勇との剣技試合中に喀血。以後表舞台から退く。",
             "tags": ["illness", "pride_broken"]},
            {"year": 1868, "age": 26, "title": "鳥羽伏見敗戦を病床で聞く", "detail": "江戸へ戻り、千駄ヶ谷の医師・松本良順宅で療養。",
             "tags": ["loss", "illness"]},
            {"year": 1868, "age": 26, "title": "江戸・千駄ヶ谷で死去", "detail": "5月30日。親友近藤勇が板橋で処刑された2ヶ月後。享年26。庭先に来る黒猫を斬ることもできず『刀が届かない』と涙したという逸話。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "動かねば闇にへだつや花と水。", "source": "沖田の句"},
            {"text": "剣は心なり。心正しからざれば剣もまた正しからず。", "source": "沖田の言葉として伝わる"},
            {"text": "命の火が消えるまで、ただ剣を振るのみ。", "source": "沖田に帰される言葉"}
        ]
    },

    # ==================== 近藤勇 ====================
    "kondo_isami": {
        "events": [
            {"year": 1834, "age": 0, "title": "武州多摩・上石原の農家に生まれる", "detail": "宮川久次郎の三男。幼名勝五郎。百姓の出ながら剣に秀でた。",
             "tags": []},
            {"year": 1848, "age": 14, "title": "天然理心流・近藤周助の弟子となる", "detail": "3代目宗家の養子となり近藤家を継ぐ。",
             "tags": ["turning_encounter", "restart"]},
            {"year": 1858, "age": 24, "title": "天然理心流4代目宗家を継ぐ、市谷・試衛館道場主", "detail": "土方・沖田・井上・山南ら生涯の仲間が集まる。",
             "tags": ["breakthrough"]},
            {"year": 1863, "age": 29, "title": "浪士組に応募、京都へ", "detail": "14代将軍徳川家茂上洛の警護。清河八郎の策略で決裂し、会津藩の預かりとなって壬生に残った。",
             "tags": ["restart"]},
            {"year": 1863, "age": 29, "title": "新選組局長に就任", "detail": "芹沢鴨の粛清後、最高責任者に。武士でない百姓が武士を率いた。",
             "tags": ["breakthrough"]},
            {"year": 1864, "age": 30, "title": "池田屋事件の先陣", "detail": "わずか4人で池田屋に突入。新選組の名を天下に轟かせた。",
             "tags": ["breakthrough"]},
            {"year": 1867, "age": 33, "title": "幕臣取立て、旗本身分に", "detail": "長年の望み『武士になる』を果たす。",
             "tags": ["approval", "restart"]},
            {"year": 1868, "age": 34, "title": "甲州勝沼の戦いで敗走", "detail": "大久保大和と改名し出陣するも新政府軍に敗北。",
             "tags": ["pride_broken"]},
            {"year": 1868, "age": 34, "title": "板橋で斬首", "detail": "4月25日、流山で投降し東海道板橋宿で斬首。武士の切腹ではなく百姓の斬首。首は京都三条河原に晒された。",
             "tags": ["loss", "pride_broken"]}
        ],
        "quotes": [
            {"text": "誠の一字、これを貫く。", "source": "新選組の旗印『誠』"},
            {"text": "人は死すべき時に死なねばならぬ。", "source": "近藤の言葉"},
            {"text": "孤軍奮闘すれども、白刃紅を染む。", "source": "獄中の辞世の漢詩"},
            {"text": "靡かじな 我が額の傷 刀傷 誠を貫き ここに死すとも", "source": "辞世の和歌とされる"}
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
