# -*- coding: utf-8 -*-
"""第3弾：既存人物の深化（15人）"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    # ==================== サルトル ====================
    "sartre": {
        "events": [
            {"year": 1905, "age": 0, "title": "パリに誕生、1歳で父を失う", "detail": "海軍将校の父をインドシナ熱で失い、母の実家シュヴァイツァー家に引き取られる。祖父は同名の医師・宣教師。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1929, "age": 23, "title": "高等師範学校の教授資格試験で首席、ボーヴォワールは2位", "detail": "この試験が二人の出会いだった。以後51年続く『契約結婚』が始まる。",
             "tags": ["breakthrough", "turning_encounter"]},
            {"year": 1938, "age": 33, "title": "『嘔吐』刊行", "detail": "実存主義小説の嚆矢。『存在は不条理だ』を文学に。",
             "tags": ["breakthrough"]},
            {"year": 1940, "age": 35, "title": "ナチスの捕虜となる", "detail": "9ヶ月の捕虜生活で『存在と無』の構想を練る。",
             "tags": ["isolation", "turning_encounter"]},
            {"year": 1943, "age": 38, "title": "『存在と無』刊行、実存主義の聖典", "detail": "『人間は自由の刑に処されている』。占領下のパリで書かれた900ページ。",
             "tags": ["breakthrough"]},
            {"year": 1945, "age": 40, "title": "『実存主義はヒューマニズムである』講演", "detail": "パリ中から聴衆が詰めかけ、女性が失神するほどの大騒ぎ。一夜で『実存主義』が流行語に。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1952, "age": 47, "title": "カミュと革命暴力をめぐって決別", "detail": "『レ・タン・モデルヌ』誌上で公開絶交状。10年の友情が終わった。",
             "tags": ["heartbreak", "pride_broken"]},
            {"year": 1964, "age": 59, "title": "ノーベル文学賞を辞退", "detail": "『作家は制度化されることを拒まねばならない』と辞退。史上唯一。",
             "tags": ["pride_broken", "approval"]},
            {"year": 1968, "age": 63, "title": "五月革命で若者たちと連帯", "detail": "ソルボンヌ占拠に駆けつけ、ルノー工場でビラを配る63歳。",
             "tags": []},
            {"year": 1980, "age": 74, "title": "パリで死去、葬列5万人", "detail": "ヒッピーと知識人と労働者が送った、20世紀最後の哲学者葬。",
             "tags": ["loss", "approval"]}
        ],
        "quotes": [
            {"text": "人間は自由の刑に処されている。", "source": "『実存主義はヒューマニズムである』"},
            {"text": "実存は本質に先立つ。", "source": "『実存主義はヒューマニズムである』"},
            {"text": "地獄とは他人のことだ。", "source": "戯曲『出口なし』"},
            {"text": "自由とは、与えられた状況で何ができるかである。", "source": "『存在と無』"},
            {"text": "人は、彼が自ら作るところのもの以外の何ものでもない。", "source": "『実存主義はヒューマニズムである』"}
        ]
    },

    # ==================== ハンナ・アーレント ====================
    "kant_hannah": {
        "events": [
            {"year": 1906, "age": 0, "title": "ドイツ・ハノーファーにユダヤ人エンジニアの子として誕生", "detail": "3歳で父を梅毒で失う。『私は三歳でユダヤ人であることを知った』と後に書く。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1924, "age": 18, "title": "マールブルク大学でハイデガーと出会い恋愛", "detail": "18歳のユダヤ人学生と35歳の既婚の師。禁じられた4年間の関係。",
             "tags": ["heartbreak", "turning_encounter"]},
            {"year": 1933, "age": 27, "title": "ナチスに逮捕、8日後釈放してパリへ亡命", "detail": "反ユダヤ宣伝の記録調査中に捕まる。釈放後すぐパリへ。",
             "tags": ["pride_broken", "restart", "isolation"]},
            {"year": 1941, "age": 35, "title": "ピレネーを越え米国ニューヨークへ", "detail": "第二の夫ブリュッヒャーと母を連れ、スペイン経由でリスボン、そしてニューヨークへ。無国籍者としての亡命生活。",
             "tags": ["restart", "isolation"]},
            {"year": 1951, "age": 45, "title": "『全体主義の起原』刊行", "detail": "ナチズムとスターリニズムを同じ『全体主義』として分析した記念碑的大著。",
             "tags": ["breakthrough"]},
            {"year": 1961, "age": 54, "title": "エルサレムのアイヒマン裁判を取材", "detail": "『ザ・ニューヨーカー』特派員として傍聴。『悪の陳腐さ』という概念を生んだ。",
             "tags": ["turning_encounter"]},
            {"year": 1963, "age": 57, "title": "『エルサレムのアイヒマン』で嵐の論争", "detail": "『アイヒマンは怪物ではなく、ただ考えない官僚だった』と書きユダヤ社会から猛烈な反発を受ける。親友のショーレムとも決別。",
             "tags": ["pride_broken", "isolation", "breakthrough"]},
            {"year": 1975, "age": 69, "title": "ニューヨークで心臓発作により急逝", "detail": "『精神の生活』第3巻『判断』を書き始めたばかりだった。タイプライターに『判断』の文字だけが残された。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "悪の陳腐さ。", "source": "『エルサレムのアイヒマン』"},
            {"text": "考えないこと、それこそが人間を可能性のなかの最悪に導く。", "source": "『精神の生活』"},
            {"text": "誰も単独で本当に生きることはできない。", "source": "『人間の条件』"},
            {"text": "活動の予測不可能性と過去の不可逆性。許しと約束が、それを救う。", "source": "『人間の条件』"},
            {"text": "私は亡命者でも追放者でもない。ただ無国籍の人である。", "source": "『私たち難民』"}
        ]
    },

    # ==================== カミュ ====================
    "camus": {
        "events": [
            {"year": 1930, "age": 17, "title": "結核を発症、サッカーを諦める", "detail": "ゴールキーパーとして活躍していた青年が、喀血で挫折。『サッカー場で人生を学んだ』と後に語る。",
             "tags": ["illness", "pride_broken"]},
            {"year": 1934, "age": 21, "title": "最初の結婚、すぐに破綻", "detail": "モルヒネ中毒の妻シモーヌと。不安定な愛の始まり。",
             "tags": ["heartbreak"]},
            {"year": 1940, "age": 27, "title": "フランスに渡りレジスタンス誌『コンバ』で活動", "detail": "占領下のパリで地下出版紙の編集長。逮捕の危険と隣り合わせだった。",
             "tags": ["restart"]},
            {"year": 1947, "age": 34, "title": "『ペスト』刊行、30万部の大成功", "detail": "ナチス占領の比喩としての疫病小説。70年後のコロナ禍で再びベストセラーに。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1951, "age": 37, "title": "『反抗的人間』で共産主義を批判", "detail": "『私は反抗する、ゆえに我らあり』と書いたが、サルトルと左翼知識人から袋叩きに。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1952, "age": 38, "title": "サルトルとの公開決別", "detail": "『レ・タン・モデルヌ』誌上の論争。10年の友情が終わる。",
             "tags": ["heartbreak"]},
            {"year": 1956, "age": 42, "title": "アルジェリア戦争で『双方の暴力停止』を訴え、両方から敵視", "detail": "ピエ・ノワール(フランス系入植者)の息子であり、アラブを愛した作家の宿命。",
             "tags": ["isolation", "pride_broken"]},
            {"year": 1957, "age": 44, "title": "ノーベル文学賞受賞", "detail": "史上2番目に若い受賞者。受賞講演で『芸術とは恐怖と美について語り続けることだ』と。",
             "tags": ["approval"]},
            {"year": 1960, "age": 46, "title": "自動車事故で即死", "detail": "編集者ガリマールの運転でパリへ戻る途中、プラタナスに激突。ポケットに未使用の汽車の切符。ル・モンド紙は『1960年初の不条理』と書いた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私は反抗する、ゆえに我らあり。", "source": "『反抗的人間』"},
            {"text": "冬のさなかに、私は自分の内に、揺るぎない夏があることをついに知った。", "source": "『夏』"},
            {"text": "山頂を目指す闘争ということ自体が、人間の心を満たすのに十分である。", "source": "『シーシュポスの神話』"},
            {"text": "自由とは、より良くなる機会に他ならない。", "source": "『反抗的人間』"},
            {"text": "人生に意味が欠けていることは、それを生きる理由になる。", "source": "『シーシュポスの神話』"}
        ]
    },

    # ==================== マルクス ====================
    "marx": {
        "events": [
            {"year": 1836, "age": 18, "title": "ボン大学入学、決闘で傷を負う", "detail": "飲み歩き決闘する放蕩学生だった。父が激怒してベルリン大学へ転校させる。",
             "tags": ["pride_broken", "parent_conflict"]},
            {"year": 1841, "age": 23, "title": "イェーナ大学で哲学博士号、大学教授になれず", "detail": "反体制的な論文のためプロイセンで教授になる道が閉ざされた。",
             "tags": ["pride_broken"]},
            {"year": 1843, "age": 25, "title": "イェニー・フォン・ヴェストファーレンと結婚", "detail": "子爵令嬢と貧乏青年の身分違いの結婚。7年の婚約の末。",
             "tags": ["turning_encounter"]},
            {"year": 1844, "age": 26, "title": "パリでエンゲルスと出会う", "detail": "パレ・ロワイヤルのカフェで10日間語り明かし、生涯の盟友に。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1845, "age": 27, "title": "『ドイツ・イデオロギー』を書き『ネズミの齧るがままに任せる』", "detail": "出版されずマルクス生前に陽の目を見なかった。",
             "tags": ["blank_period"]},
            {"year": 1850, "age": 32, "title": "ロンドンの屋根裏で極貧、3人の子を失う", "detail": "エドガー、フランツィスカ、ギドー。『子供用の棺を買う金もない』と書く。",
             "tags": ["loss", "poverty"]},
            {"year": 1852, "age": 34, "title": "『ルイ・ボナパルトのブリュメール18日』", "detail": "『歴史は繰り返す、一度目は悲劇として、二度目は茶番として』の冒頭句。",
             "tags": ["breakthrough"]},
            {"year": 1864, "age": 46, "title": "第一インターナショナル結成", "detail": "ロンドンで国際労働者協会を組織。実践家としても歩み始める。",
             "tags": ["breakthrough"]},
            {"year": 1881, "age": 63, "title": "妻イェニー死去、翌年長女ジェニーも急死", "detail": "最愛の妻の葬儀で『彼女なしに私の存在は想像できない』。娘の死が最後の打撃となる。",
             "tags": ["loss", "heartbreak"]}
        ],
        "quotes": [
            {"text": "歴史は繰り返す、一度目は悲劇として、二度目は茶番として。", "source": "『ルイ・ボナパルトのブリュメール18日』"},
            {"text": "宗教は、抑圧された生き物のため息であり、人民のアヘンである。", "source": "『ヘーゲル法哲学批判序説』"},
            {"text": "能力に応じて働き、必要に応じて受け取る。", "source": "『ゴータ綱領批判』"},
            {"text": "哲学者たちは世界をさまざまに解釈してきたにすぎない。大切なのは、それを変えることである。", "source": "『フォイエルバッハに関するテーゼ』"},
            {"text": "万国の労働者よ、団結せよ！", "source": "『共産党宣言』"}
        ]
    },

    # ==================== ワーグナー ====================
    "wagner": {
        "events": [
            {"year": 1813, "age": 0, "title": "ライプツィヒに誕生、6ヶ月で父を失う", "detail": "生物学上の父の実否は今も謎。継父ガイヤーの血を引く可能性。",
             "tags": ["parent_conflict"]},
            {"year": 1849, "age": 36, "title": "ドレスデン五月革命に参加、逮捕状が出る", "detail": "バリケード戦の最中に『革命は失敗した』と悟り、スイスへ亡命。13年の逃亡生活の始まり。",
             "tags": ["restart", "isolation", "pride_broken"]},
            {"year": 1854, "age": 41, "title": "ショーペンハウアーを読み衝撃を受ける", "detail": "『意志と表象としての世界』を4度読み直し、以後の楽劇の哲学的基盤に。",
             "tags": ["turning_encounter"]},
            {"year": 1864, "age": 51, "title": "バイエルン王ルートヴィヒ2世に救われる", "detail": "借金で追われていた時、18歳の新王が全借金を肩代わり。生涯続く異様な崇拝関係。",
             "tags": ["turning_encounter", "restart"]},
            {"year": 1870, "age": 57, "title": "コジマと結婚、友人ビューローから奪う形で", "detail": "リストの娘で親友ビューローの妻だったコジマと。24歳年下の献身的な支え手。",
             "tags": ["turning_encounter", "restart"]},
            {"year": 1874, "age": 61, "title": "『ニーベルングの指環』4部作を26年かけて完成", "detail": "16時間に及ぶ楽劇の大伽藍。世界の音楽劇を塗り替えた。",
             "tags": ["breakthrough"]},
            {"year": 1876, "age": 63, "title": "バイロイト祝祭劇場こけら落とし", "detail": "自作上演のためだけに建てた理想の劇場。今も毎夏『指環』が上演される。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1882, "age": 69, "title": "『パルジファル』初演、ニーチェ決別の象徴", "detail": "キリスト教回帰に幻滅したニーチェは『反キリスト者』を書き始める。",
             "tags": []},
            {"year": 1883, "age": 69, "title": "ヴェネツィアで心臓発作、コジマの腕の中で死去", "detail": "遺体はバイロイトへ運ばれ、自邸ヴァーンフリート荘に葬られた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽は究極の言語である。", "source": "ワーグナーの論文"},
            {"text": "芸術は、時代が真実を語れないとき、真実を語る。", "source": "書簡"},
            {"text": "私は世界に借りを作った。その借りは音楽で返す。", "source": "ワーグナーに帰される言葉"}
        ],
        "works": [
            {"title": "歌劇『ニーベルングの指環』4部作", "year": 1876, "type": "楽劇",
             "description": "16時間に及ぶ壮大な北欧神話の楽劇",
             "youtubeId": "Jh5tL8oc7PQ"},
            {"title": "歌劇『トリスタンとイゾルデ』", "year": 1865, "type": "楽劇",
             "description": "『トリスタン和音』が調性を崩壊させた、愛と死のオペラ",
             "youtubeId": "5i8iftr8SwE"},
            {"title": "歌劇『タンホイザー』序曲", "year": 1845, "type": "楽劇",
             "description": "最も愛される序曲",
             "youtubeId": "GkhCk_QfPXw"},
            {"title": "ワルキューレの騎行（『ワルキューレ』より）", "year": 1870, "type": "楽劇",
             "description": "『地獄の黙示録』で世界中に知られた",
             "youtubeId": "P73Z6291Pt8"},
            {"title": "歌劇『マイスタージンガー』前奏曲", "year": 1868, "type": "楽劇",
             "description": "晴れやかな愛と芸術の讃歌",
             "youtubeId": "lOqlGyzRI0Q"}
        ]
    },

    # ==================== マーラー ====================
    "mahler": {
        "events": [
            {"year": 1860, "age": 0, "title": "ボヘミアのユダヤ人商家に生まれる", "detail": "14人兄弟の2番目。8人が早世した。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1889, "age": 29, "title": "半年で父・母・姉を相次いで失う", "detail": "『三重の喪失』。交響曲第1番『巨人』はこの喪失の年に完成された。",
             "tags": ["loss"]},
            {"year": 1897, "age": 37, "title": "ウィーン宮廷歌劇場音楽監督に就任", "detail": "就任のためユダヤ教からカトリックに改宗。反ユダヤ主義のウィーンで10年君臨した。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1902, "age": 41, "title": "アルマ・シントラーと結婚", "detail": "19歳年下の美貌の才女。作曲も婚約条件で禁じた暴君夫。",
             "tags": ["turning_encounter"]},
            {"year": 1907, "age": 46, "title": "長女マリア・アンナ(プッツル)を失い、心臓病を宣告", "detail": "4歳の愛娘を猩紅熱で。同じ年に自身の心臓病も判明。『3つの打撃』と呼んだ。",
             "tags": ["loss", "illness", "pride_broken"]},
            {"year": 1908, "age": 48, "title": "『大地の歌』作曲、第9番を恐れ番号を付けず", "detail": "『第9を書くと死ぬ』ジンクスを避けるため。しかし翌年第9番も書いた。",
             "tags": ["breakthrough"]},
            {"year": 1910, "age": 50, "title": "アルマの不倫発覚、フロイトの診察を受ける", "detail": "建築家グロピウスとの関係。オランダでフロイトと4時間散歩しながら精神分析を受けた。",
             "tags": ["heartbreak", "pride_broken"]},
            {"year": 1911, "age": 50, "title": "ウィーンで心内膜炎により死去", "detail": "『モーツァルト！』が最期の言葉。未完の第10番を遺した。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "伝統とは火を守ることであり、灰を崇めることではない。", "source": "マーラーの言葉"},
            {"text": "私の時代はまだ来ていない。", "source": "マーラーの予言。70年後のブームで的中した"},
            {"text": "交響曲とは世界を建設することだ。", "source": "シベリウスとの会話"},
            {"text": "私は三重にホームレスである——オーストリアではボヘミア人、ドイツではオーストリア人、世界ではユダヤ人として。", "source": "マーラーの言葉"}
        ],
        "works": [
            {"title": "交響曲第2番『復活』ハ短調", "year": 1894, "type": "交響曲",
             "description": "『お前は蘇る、我が心よ』合唱付きの大伽藍",
             "youtubeId": "Sn6BjipdqpI"},
            {"title": "交響曲第5番 嬰ハ短調", "year": 1902, "type": "交響曲",
             "description": "第4楽章アダージェットは映画『ベニスに死す』で世界に広まった",
             "youtubeId": "i5xT68Yw47U"},
            {"title": "亡き子をしのぶ歌", "year": 1904, "type": "歌曲",
             "description": "リュッケルトの詩に基づく。娘マリアの死を予言したかのような5曲",
             "youtubeId": "5RN0g6Qk2n8"},
            {"title": "大地の歌", "year": 1908, "type": "交響曲",
             "description": "李白・王維らの漢詩による『第9を避けた第9番』",
             "youtubeId": "7bQCzj2SG2w"},
            {"title": "交響曲第9番 ニ長調", "year": 1909, "type": "交響曲",
             "description": "別れの交響曲。第4楽章は消え入るように終わる",
             "youtubeId": "OSyr4rtftM4"}
        ]
    },

    # ==================== リスト ====================
    "liszt": {
        "events": [
            {"year": 1822, "age": 11, "title": "ウィーンでチェルニーの弟子に、ベートーヴェンに接吻される", "detail": "10歳の神童の演奏後、老ベートーヴェンが額に接吻したという逸話。真偽は諸説。",
             "tags": ["approval", "turning_encounter"]},
            {"year": 1832, "age": 20, "title": "パリでパガニーニを聴き衝撃、『ピアノのパガニーニになる』と誓う", "detail": "ヴァイオリンの超絶技巧をピアノに移植する決意。以後6時間の練習を日課に。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1833, "age": 22, "title": "マリー・ダグー伯爵夫人と駆け落ち", "detail": "6歳年上の人妻。3人の子をもうける。次女コジマは後にビューロー→ワーグナーへ。",
             "tags": ["turning_encounter", "heartbreak"]},
            {"year": 1839, "age": 28, "title": "演奏会旅行（リストマニア）開始", "detail": "ハンガリー大洪水の慈善演奏から始まる10年の狂乱。観客は失神し、手袋を奪い合った。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1847, "age": 36, "title": "カロリーネ侯爵夫人と出会い、演奏家を引退", "detail": "最後の演奏会はウクライナ。翌年ヴァイマールに落ち着き、作曲と指揮に専念。",
             "tags": ["turning_encounter", "restart"]},
            {"year": 1861, "age": 50, "title": "カロリーネとの結婚がローマ法皇に阻まれる", "detail": "離婚禁止。結婚式当日の朝、皇帝からの差し止め。生涯正式な結婚は叶わなかった。",
             "tags": ["heartbreak", "loss"]},
            {"year": 1865, "age": 54, "title": "ローマで下級聖職者となる", "detail": "『アベ・リスト』と呼ばれ黒衣を着る。以後の作品は宗教的・実験的。",
             "tags": ["restart"]},
            {"year": 1870, "age": 59, "title": "娘コジマがワーグナーと結婚", "detail": "親友ビューローから妻を奪う形で。一時は激怒したが晩年和解。",
             "tags": ["heartbreak"]},
            {"year": 1886, "age": 74, "title": "バイロイト祝祭劇場で風邪から肺炎、死去", "detail": "娘婿ワーグナーはすでに3年前に他界。『トリスタン！』が最期の言葉と伝わる。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽は心の言語である。", "source": "リストの書簡"},
            {"text": "悲しみとは、私が最も深い歌を書ける素材である。", "source": "日記"},
            {"text": "天才は理解されない義務を持つ。", "source": "リストに帰される言葉"}
        ],
        "works": [
            {"title": "ピアノ・ソナタ ロ短調", "year": 1853, "type": "ピアノ曲",
             "description": "ピアノソナタ史上の最高峰。一続きの30分の大作",
             "youtubeId": "rfXbhYokyNM"},
            {"title": "ハンガリー狂詩曲第2番", "year": 1847, "type": "ピアノ曲",
             "description": "アニメ『トムとジェリー』でも有名な超絶技巧曲",
             "youtubeId": "LdH1hSWGFGU"},
            {"title": "交響詩『前奏曲』", "year": 1854, "type": "管弦楽",
             "description": "『交響詩』というジャンルを創始した代表作",
             "youtubeId": "ULDCwmDBaJA"},
            {"title": "巡礼の年 第2年『イタリア』", "year": 1858, "type": "ピアノ曲",
             "description": "『ダンテ・ソナタ』『ペトラルカのソネット』を含む旅の印象集",
             "youtubeId": "d5d2EQYt6Zc"}
        ]
    },

    # ==================== ヴェルディ ====================
    "verdi": {
        "events": [
            {"year": 1832, "age": 18, "title": "ミラノ音楽院の入学試験に不合格", "detail": "『年齢超過』『手が不十分』という理由で。生涯の屈辱だった。",
             "tags": ["pride_broken"]},
            {"year": 1836, "age": 22, "title": "マルゲリータ・バレッツィと結婚", "detail": "恩人の娘。幸福な時代の始まり。",
             "tags": ["turning_encounter"]},
            {"year": 1838, "age": 25, "title": "長女ヴィルジニア死去、1840年長男イチーリオ死去", "detail": "結婚3年で子供2人を相次いで失う。",
             "tags": ["loss"]},
            {"year": 1840, "age": 26, "title": "妻マルゲリータ死去、2年で家族を全て失う", "detail": "脳炎で急死。26歳で一人になったヴェルディは作曲を断つ決意をする。",
             "tags": ["loss", "heartbreak"]},
            {"year": 1842, "age": 28, "title": "『ナブッコ』大成功、作曲家として復活", "detail": "『行け我が想いよ金色の翼に乗って』はイタリア第二の国歌に。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1853, "age": 39, "title": "『椿姫』初演、初日は大失敗", "detail": "太ったソプラノが結核で死ぬ役は笑いを呼んだ。翌年の改訂版で世界のオペラに。",
             "tags": ["pride_broken", "breakthrough"]},
            {"year": 1859, "age": 45, "title": "『Viva V.E.R.D.I.』が統一運動のスローガンに", "detail": "『ヴィットリオ・エマヌエーレ、イタリアの王』の頭文字。彼自身も国会議員に。",
             "tags": ["approval"]},
            {"year": 1871, "age": 57, "title": "『アイーダ』カイロ初演", "detail": "スエズ運河開通を記念して依頼されたオペラ。",
             "tags": ["breakthrough"]},
            {"year": 1887, "age": 73, "title": "『オテロ』初演、16年ぶりの新作オペラ", "detail": "引退を撤回し74歳で新境地へ。シェイクスピア＋ボーイト台本。",
             "tags": ["restart", "breakthrough"]},
            {"year": 1893, "age": 79, "title": "『ファルスタッフ』、人生最後のオペラ", "detail": "初のコメディ・オペラ。『すべては冗談』と結んで生涯のオペラを閉じた。",
             "tags": ["breakthrough"]},
            {"year": 1901, "age": 87, "title": "ミラノで死去、国葬に30万人", "detail": "トスカニーニ指揮で『行け我が想いよ』を市民が歌った。",
             "tags": ["loss", "approval"]}
        ],
        "quotes": [
            {"text": "古きに還れ、さすれば進歩する。", "source": "ヴェルディの手紙"},
            {"text": "あなたがコピーするなら、芸術は死ぬ。", "source": "弟子への言葉"},
            {"text": "私はいつも作曲家であり続けた。何でもない日など一日もなかった。", "source": "引退表明"}
        ]
    },

    # ==================== ストラヴィンスキー ====================
    "stravinsky": {
        "events": [
            {"year": 1882, "age": 0, "title": "サンクトペテルブルク近郊オラニエンバウムに誕生", "detail": "父はマリインスキー劇場のバス歌手。音楽より法律を学ばされた。",
             "tags": []},
            {"year": 1902, "age": 20, "title": "リムスキー＝コルサコフの弟子に", "detail": "法学部から一転、22歳で本格的に作曲を学ぶ遅いスタート。",
             "tags": ["restart", "turning_encounter"]},
            {"year": 1910, "age": 28, "title": "ディアギレフのバレエ・リュスで『火の鳥』初演", "detail": "パリで一夜にして世界的スターに。以後20年ディアギレフと組む。",
             "tags": ["breakthrough", "turning_encounter"]},
            {"year": 1913, "age": 30, "title": "『春の祭典』初演、音楽史上最大のスキャンダル", "detail": "シャンゼリゼ劇場で殴り合いの大騒動。警察が出動。近代音楽の夜明けとなった。",
             "tags": ["breakthrough", "pride_broken"]},
            {"year": 1917, "age": 35, "title": "ロシア革命で祖国と全財産を失う", "detail": "領地も銀行口座も没収。以後二度と革命ロシアには戻らなかった。",
             "tags": ["loss", "restart", "isolation"]},
            {"year": 1920, "age": 38, "title": "新古典主義へ転回", "detail": "『プルチネッラ』でバロック音楽を現代的に再生。『春の祭典』の革命児が古典へ。",
             "tags": ["restart"]},
            {"year": 1939, "age": 57, "title": "妻と娘、母を結核で相次ぎ失う", "detail": "10年来の愛人ヴェラと結婚、同年アメリカへ移住。",
             "tags": ["loss", "restart"]},
            {"year": 1951, "age": 69, "title": "オペラ『放蕩者のなりゆき』", "detail": "新古典主義の総決算。ホガースの銅版画から。",
             "tags": []},
            {"year": 1952, "age": 70, "title": "12音技法に転向、60代で作風を3度目に刷新", "detail": "シェーンベルクの死後、最も批判していた技法を習得。最後まで実験を止めなかった。",
             "tags": ["restart"]},
            {"year": 1971, "age": 88, "title": "ニューヨークで死去", "detail": "遺言でヴェネツィアのサン・ミケーレ島、ディアギレフの隣に埋葬された。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "優れた作曲家は模倣せず、盗む。", "source": "ストラヴィンスキーの言葉"},
            {"text": "私の音楽は私である。私は音楽以外の何者でもない。", "source": "自伝"},
            {"text": "音楽は何も表現しない。ただ存在するだけだ。", "source": "『音楽詩学』"}
        ],
        "works": [
            {"title": "バレエ『春の祭典』", "year": 1913, "type": "バレエ",
             "description": "近代音楽の夜明け。初演は大暴動",
             "youtubeId": "EkwqPJZe8ms"},
            {"title": "バレエ『火の鳥』", "year": 1910, "type": "バレエ",
             "description": "一夜でパリの寵児となった処女バレエ",
             "youtubeId": "pXMGK8dvMnQ"},
            {"title": "バレエ『ペトルーシュカ』", "year": 1911, "type": "バレエ",
             "description": "謝肉祭を舞台にした人形劇",
             "youtubeId": "6GqJLTeGZI0"},
            {"title": "兵士の物語", "year": 1918, "type": "室内楽劇",
             "description": "悪魔と兵士の寓話。7人の奏者で上演できる小規模舞台作"}
        ]
    },

    # ==================== ピカソ ====================
    "picasso": {
        "events": [
            {"year": 1881, "age": 0, "title": "スペイン・マラガに画家の息子として誕生", "detail": "最初の言葉は『ピス(鉛筆)』だったと伝わる。7歳で父の絵画教室に通い始める。",
             "tags": ["approval"]},
            {"year": 1895, "age": 13, "title": "妹コンチータを病で失い、父が絵筆を折る", "detail": "『もう自分より上手い息子に敵わない』と父ホセが告白。ピカソは父を超えた瞬間を強く覚えていた。",
             "tags": ["loss", "turning_encounter"]},
            {"year": 1900, "age": 19, "title": "最初のパリ訪問、親友カサヘマスが失恋の末に自殺", "detail": "ピサロへの紹介状で訪れたパリ。翌年カサヘマスがレストランで拳銃自殺。『青の時代』の引き金に。",
             "tags": ["loss", "restart", "isolation"]},
            {"year": 1904, "age": 22, "title": "モンマルトルの『洗濯船』に住む", "detail": "ブラック・アポリネールらと貧しく熱狂的な生活。フェルナンド・オリヴィエと最初の恋。",
             "tags": ["restart", "poverty"]},
            {"year": 1907, "age": 25, "title": "『アヴィニョンの娘たち』完成", "detail": "アフリカ彫刻との出会いからキュビスムへ。当時は友人たちにも理解されなかった。",
             "tags": ["breakthrough"]},
            {"year": 1918, "age": 36, "title": "バレエ・リュスの衣装担当でオルガ・コクローヴァと結婚", "detail": "ロシア貴族の踊り子との結婚で新古典主義の時代へ。",
             "tags": ["turning_encounter"]},
            {"year": 1937, "age": 55, "title": "『ゲルニカ』", "detail": "ナチスのバスク爆撃への怒りを、白黒のキャンバスに込めた20世紀美術の象徴。",
             "tags": ["breakthrough"]},
            {"year": 1943, "age": 61, "title": "21歳のフランソワーズ・ジローと出会う", "detail": "以後7年共に過ごし2人の子をもうけるが、フランソワーズは去る。『ピカソとともに生きた私』を書いた唯一の相手。",
             "tags": ["turning_encounter"]},
            {"year": 1961, "age": 79, "title": "ジャクリーヌ・ロックと結婚", "detail": "45歳年下の最後の妻。晩年の11年を共に。",
             "tags": ["turning_encounter"]},
            {"year": 1973, "age": 91, "title": "南仏ムージャンで死去", "detail": "最後の朝食の席で。『もう飲まない。もう食べない。これが本当の幸せだった』と呟いたと伝わる。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "子供は皆、芸術家だ。問題は、大人になっても芸術家でいられるかどうかだ。", "source": "ピカソの言葉"},
            {"text": "私は探さない、見つけるのだ。", "source": "ピカソの言葉"},
            {"text": "絵画は色と形で書かれた詩だ。", "source": "ピカソの言葉"},
            {"text": "できると思えばできる、できないと思えばできない。", "source": "ピカソに帰される言葉"},
            {"text": "他人のように描けるようになるのに4年かかった。子供のように描けるようになるのに生涯かかった。", "source": "ピカソの言葉"}
        ]
    },

    # ==================== モネ ====================
    "monet": {
        "events": [
            {"year": 1840, "age": 0, "title": "パリに商人の子として誕生、5歳でル・アーヴルへ移住", "detail": "海辺の町で少年時代を過ごしたことが生涯の光の感覚を育てた。",
             "tags": []},
            {"year": 1858, "age": 17, "title": "風景画家ブーダンと出会う", "detail": "『戸外制作』を教えられる。『ブーダンが目を開いてくれた』と回想。",
             "tags": ["turning_encounter"]},
            {"year": 1865, "age": 24, "title": "サロン初入選、最初のモデル・カミーユと出会う", "detail": "後の妻。貧困の中でも絵を描き続ける。",
             "tags": ["breakthrough", "turning_encounter"]},
            {"year": 1872, "age": 32, "title": "『印象・日の出』制作", "detail": "ル・アーヴル港を日の出直前に描いた習作。翌々年この絵から『印象派』の名が生まれる。",
             "tags": ["breakthrough"]},
            {"year": 1874, "age": 33, "title": "第1回印象派展で『印象派』の蔑称が定着", "detail": "批評家ルロワが『印象派』と揶揄したのを逆手に。ルノワール、シスレー、ドガらと。",
             "tags": ["pride_broken", "breakthrough"]},
            {"year": 1879, "age": 38, "title": "妻カミーユ死去", "detail": "32歳で逝く。臨終の顔の色の変化を絵に描いたことを後に悔いた。『色を記録してしまう自分への嫌悪』。",
             "tags": ["loss", "heartbreak"]},
            {"year": 1883, "age": 42, "title": "ジヴェルニーに移住", "detail": "セーヌ川支流の小さな村。43年後の死まで、この庭と睡蓮を描き続ける。",
             "tags": ["restart"]},
            {"year": 1892, "age": 51, "title": "再婚、連作『積みわら』『ルーアン大聖堂』", "detail": "同じ対象を時間・光・季節で何枚も描く『連作』の手法を確立。",
             "tags": ["breakthrough"]},
            {"year": 1908, "age": 67, "title": "白内障の症状が進行", "detail": "色が黄色くかすむ視界。それでもアトリエに籠り巨大な睡蓮を描き続けた。",
             "tags": ["illness"]},
            {"year": 1926, "age": 86, "title": "ジヴェルニーの庭で死去", "detail": "『大装飾画』睡蓮連作はオランジュリー美術館に『平和の聖堂』として寄贈された。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私は一つの対象を描くのではない。その対象と自分の間にある空気を描くのだ。", "source": "モネの書簡"},
            {"text": "私にあるのは目しかない——なんと可哀そうなこの目よ、と思うほど。", "source": "晩年の友人への言葉"},
            {"text": "睡蓮は絵画を通して永遠に咲き続けねばならない。", "source": "モネの言葉"},
            {"text": "色彩とは、私の一日の強迫観念であり、喜びであり、苦しみだ。", "source": "書簡"}
        ]
    },

    # ==================== 西郷隆盛 ====================
    "saigo_takamori": {
        "events": [
            {"year": 1854, "age": 26, "title": "島津斉彬に見出され庭方役に", "detail": "下級武士から英明な藩主の側近に大抜擢。生涯の恩人となる。",
             "tags": ["turning_encounter", "approval"]},
            {"year": 1858, "age": 30, "title": "斉彬急死、僧月照と錦江湾で入水", "detail": "主君を失った絶望で月照と共に入水するが西郷だけ蘇生。以後『生きのびてしまった者』として生きる。",
             "tags": ["loss", "pride_broken", "isolation"]},
            {"year": 1862, "age": 34, "title": "久光の怒りを買い徳之島・沖永良部島へ遠島", "detail": "島の牢屋で死を覚悟した日々。この苦難が西郷の人格を練り上げたと後に語られる。",
             "tags": ["isolation", "blank_period"]},
            {"year": 1866, "age": 38, "title": "坂本龍馬の仲介で薩長同盟締結", "detail": "犬猿の仲だった長州の桂小五郎と京都・小松邸で盟約。倒幕の決定的一歩。",
             "tags": ["breakthrough"]},
            {"year": 1868, "age": 40, "title": "江戸無血開城を勝海舟と談判", "detail": "3月13日と14日、田町の屋敷で2日間。江戸100万人の町を戦火から救った。",
             "tags": ["breakthrough"]},
            {"year": 1869, "age": 41, "title": "戊辰戦争終結、帰郷して私学校を開く", "detail": "中央政府に入らず鹿児島に戻り若者を育てる。多くの門弟が慕って集まった。",
             "tags": ["restart"]},
            {"year": 1873, "age": 45, "title": "征韓論で破れ下野（明治六年政変）", "detail": "大久保利通らと対立し辞職。600人以上の薩摩出身者が一斉に辞表。",
             "tags": ["pride_broken", "restart", "isolation"]},
            {"year": 1877, "age": 49, "title": "西南戦争勃発、城山で自刃", "detail": "士族反乱の盟主に担ぎ出される形で挙兵。7ヶ月の戦いの末、鹿児島城山で別府晋介の介錯により自刃。",
             "tags": ["loss", "pride_broken"]}
        ],
        "quotes": [
            {"text": "命もいらず、名もいらず、官位も金もいらぬ人は、始末に困るもの也。", "source": "『南洲翁遺訓』"},
            {"text": "敬天愛人。", "source": "西郷の揮毫"},
            {"text": "児孫のために美田を買わず。", "source": "西郷の詩"},
            {"text": "人を相手にせず、天を相手にせよ。", "source": "『南洲翁遺訓』"},
            {"text": "事の成否を決するものは、其の志の如何にあり。", "source": "西郷の言葉"}
        ]
    },

    # ==================== 土方歳三 ====================
    "hijikata_toshizo": {
        "events": [
            {"year": 1835, "age": 0, "title": "武州多摩・石田村の豪農の末子として誕生", "detail": "父は生前、母は6歳で失う。『バラガキ(茨のような乱暴者)』と呼ばれ育つ。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1859, "age": 24, "title": "天然理心流・近藤勇と盟友に", "detail": "義兄の縁で試衛館道場に通い始める。近藤・沖田・山南らと『兄弟の契り』を結ぶ。",
             "tags": ["turning_encounter"]},
            {"year": 1863, "age": 28, "title": "浪士組に加わり上洛、新選組を結成", "detail": "芹沢鴨派を粛清し、副長として組織の鬼となる。『鬼の副長』の異名。",
             "tags": ["restart"]},
            {"year": 1864, "age": 29, "title": "池田屋事件", "detail": "祇園祭前夜、潜伏中の尊攘派志士を急襲。新選組の名を天下に知らしめた。",
             "tags": ["breakthrough"]},
            {"year": 1867, "age": 32, "title": "幕臣取立て、旗本となる", "detail": "農民から旗本へ。近藤・土方ともに士分に昇格した。",
             "tags": ["approval", "restart"]},
            {"year": 1868, "age": 33, "title": "鳥羽・伏見の戦いで敗北、近藤勇処刑", "detail": "甲州勝沼の敗北に続き近藤が板橋で斬首。慣れぬ西洋式軍装で北へ向かう。",
             "tags": ["loss", "pride_broken", "heartbreak"]},
            {"year": 1869, "age": 34, "title": "函館・五稜郭で戦死", "detail": "5月11日、一本木関門で銃弾を受け落馬。34歳。『我に策あり、すでに足れり』が最後の言葉と伝わる。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "たとえ身は蝦夷の島根に朽ちるとも 魂は東の君やまもらむ", "source": "函館で詠んだ辞世"},
            {"text": "知れば迷い、知らねば迷わず。", "source": "土方の日記"},
            {"text": "我が命、義に捧ぐ。", "source": "土方に帰される言葉"}
        ]
    },

    # ==================== ウィトゲンシュタイン ====================
    "wittgenstein": {
        "events": [
            {"year": 1889, "age": 0, "title": "ウィーンの超富豪カール・ウィトゲンシュタインの末子として誕生", "detail": "父は鉄鋼王、家はブラームス・マーラーがサロンに出入りする欧州屈指の邸宅。兄3人が後に自殺。",
             "tags": ["parent_conflict", "approval"]},
            {"year": 1911, "age": 22, "title": "ケンブリッジのラッセルを訪ねる", "detail": "航空工学から数学、そして哲学へ。ラッセルが『生涯で最も強烈な知的体験』と書いた弟子。",
             "tags": ["turning_encounter"]},
            {"year": 1914, "age": 25, "title": "第一次大戦に志願、東部戦線の最前線へ", "detail": "死を求めて最も危険な監視所を希望。ノートに『論理哲学論考』の草稿を書きながら戦う。",
             "tags": ["isolation"]},
            {"year": 1918, "age": 29, "title": "『論理哲学論考』完成、『哲学の問題は全て解決した』と信じる", "detail": "戦場で完成した78ページの書。『語り得ぬものについては、沈黙せねばならない』。",
             "tags": ["breakthrough"]},
            {"year": 1919, "age": 30, "title": "莫大な遺産を全額放棄、小学校教員に", "detail": "『哲学は終わった』と信じ、オーストリア山村の小学校教師となる。6年続ける。",
             "tags": ["restart", "isolation"]},
            {"year": 1926, "age": 37, "title": "教員を辞め、姉のために邸宅を設計", "detail": "ウィーンのクンドマンガッセ邸。建築にも極限の正確さを求めた。",
             "tags": ["restart"]},
            {"year": 1929, "age": 40, "title": "ケンブリッジに復帰、『論考』で博士号取得", "detail": "『哲学を辞める』と言ってた男の復帰。口頭試問でラッセルとムーアに『君たちは理解できないだろうが、気にするな』と語ったと伝わる。",
             "tags": ["restart"]},
            {"year": 1947, "age": 58, "title": "ケンブリッジ教授職を辞任、アイルランド西岸へ", "detail": "小屋で一人、後の『哲学探究』を書き続ける。",
             "tags": ["restart", "isolation"]},
            {"year": 1951, "age": 62, "title": "ケンブリッジで前立腺癌により死去", "detail": "最後の言葉は『皆に伝えてくれ、私は素晴らしい人生を送ったと』。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "語り得ぬものについては、沈黙せねばならない。", "source": "『論理哲学論考』末尾"},
            {"text": "私の言語の限界が、私の世界の限界を意味する。", "source": "『論理哲学論考』5.6"},
            {"text": "世界がいかにあるかが神秘なのではない。世界があるということが神秘なのだ。", "source": "『論理哲学論考』6.44"},
            {"text": "哲学の仕事は、蠅を蠅取り壺から出してやることである。", "source": "『哲学探究』"},
            {"text": "皆に伝えてくれ、私は素晴らしい人生を送ったと。", "source": "死の床、1951"}
        ]
    },

    # ==================== ソクラテス ====================
    "socrates": {
        "events": [
            {"year": -470, "age": 0, "title": "アテネに石工の子として誕生", "detail": "母は助産婦。『産婆術』と呼ぶ問答法の原点はここから。",
             "tags": ["approval"]},
            {"year": -431, "age": 39, "title": "ペロポネソス戦争に従軍", "detail": "重装歩兵として出征。デリオンの敗走で師アルキビアデスの命を救ったと伝わる。",
             "tags": []},
            {"year": -425, "age": 45, "title": "『知者は私ではない』デルポイの神託", "detail": "友人カイレフォンが神託所で『ソクラテスより賢い者はいない』と聞く。驚いたソクラテスは各界の賢人を訪ね『自分が無知であることを知っている自分』が最も賢いと悟る。",
             "tags": ["turning_encounter"]},
            {"year": -406, "age": 64, "title": "アルギヌサイ海戦の裁判で唯一反対", "detail": "将軍10人を一括で裁くのは違法と主張。群衆に脅されても屈しなかった。",
             "tags": ["pride_broken"]},
            {"year": -404, "age": 66, "title": "三十人政権下、民主派殺害命令を拒む", "detail": "サラミスのレオンの連行を命じられ『私は死ぬかもしれぬが悪はなさぬ』と拒否。",
             "tags": ["isolation"]},
            {"year": -399, "age": 70, "title": "告発・裁判・有罪判決", "detail": "『若者を堕落させた罪』『国家の神を認めなかった罪』。自己弁論を拒否する形の弁明で、投票280対220で死刑。",
             "tags": ["pride_broken"]},
            {"year": -399, "age": 70, "title": "毒杯を仰ぐ", "detail": "クリトンの逃亡の勧めを断り、祭事のため刑執行が遅れた30日、対話を続けた。最期に『クリトン、アスクレピオスに鶏を捧げておいてくれ』と頼んだ。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私が知っていることは、私が何も知らないということだけだ。", "source": "『ソクラテスの弁明』"},
            {"text": "汝自身を知れ。", "source": "デルフォイの神託に由来"},
            {"text": "大事なのは、ただ生きることではなく、善く生きることだ。", "source": "『クリトン』"},
            {"text": "吟味されない生は、生きるに値しない。", "source": "『ソクラテスの弁明』38a"},
            {"text": "クリトン、アスクレピオスに鶏を捧げておいてくれ。", "source": "最期の言葉 『パイドン』"},
            {"text": "結婚しなさい。良妻なら幸福になれる。悪妻なら哲学者になれる。", "source": "ソクラテスに帰される言葉"}
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
