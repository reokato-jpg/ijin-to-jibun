# -*- coding: utf-8 -*-
"""第2弾：既存人物の深化（15人追加）"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

ENRICH = {
    # ==================== アインシュタイン ====================
    "einstein": {
        "events": [
            {"year": 1895, "age": 16, "title": "ギムナジウムを中退、ミュンヘンを離れる", "detail": "軍隊式教育に馴染めず退学。父の事業失敗で一家がイタリアへ。以後、国籍を一度も持たない『無国籍』の時期を経る。",
             "tags": ["pride_broken", "parent_conflict", "restart"]},
            {"year": 1902, "age": 23, "title": "スイス特許庁の三級審査官に", "detail": "大学の職に就けず、友人の父のコネで就職。この『偉大なる暇つぶし』の時間が奇跡の年を生む。",
             "tags": ["restart", "isolation"]},
            {"year": 1905, "age": 26, "title": "『奇跡の年』— 4本の論文で物理学を塗り替える", "detail": "特殊相対性理論・光量子仮説・ブラウン運動・質量エネルギー等価。特許庁の机で、一人で書いた。",
             "tags": ["breakthrough"]},
            {"year": 1915, "age": 36, "title": "一般相対性理論を完成", "detail": "10年の苦闘の末、重力を『時空の歪み』として定式化。翌年の日食観測で的中。",
             "tags": ["breakthrough"]},
            {"year": 1919, "age": 40, "title": "日食観測で一般相対論が証明され世界的スターに", "detail": "エディントンの遠征で星の光の曲がりが確認。翌日から『ニュートンを超えた男』として世界中の新聞1面に。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1921, "age": 42, "title": "ノーベル物理学賞（光電効果による）", "detail": "相対論ではなく光量子仮説で受賞。賞金はすべて最初の妻ミレヴァに送った。",
             "tags": ["approval"]},
            {"year": 1933, "age": 54, "title": "ナチスから逃れ米国プリンストンへ", "detail": "ドイツに二度と戻らなかった。『私の祖国は人類だ』と語る。",
             "tags": ["restart", "isolation"]},
            {"year": 1939, "age": 60, "title": "ルーズベルト大統領に核開発を促す書簡", "detail": "シラードと連名。後に『人生最大の過ち』と悔いた。",
             "tags": ["pride_broken"]},
            {"year": 1955, "age": 76, "title": "プリンストンで死去", "detail": "ラッセル＝アインシュタイン宣言の署名2週間後。『私はいつ行くべきか知っている』",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "想像力は知識よりも重要である。知識には限界があるが、想像力は世界を包みこむ。", "source": "『サタデー・イブニング・ポスト』1929"},
            {"text": "神はサイコロを振らない。", "source": "マックス・ボルンへの手紙 1926"},
            {"text": "人生には二つの生き方しかない。奇跡などないかのように生きるか、すべてが奇跡であるかのように生きるか。", "source": "アインシュタインに帰される言葉"},
            {"text": "同じことを繰り返しながら違う結果を望むこと、それを狂気と呼ぶ。", "source": "アインシュタインに帰される言葉"},
            {"text": "学校で学んだことをすべて忘れたとき、残るものが教育である。", "source": "1936年の講演"},
            {"text": "私には特別な才能はありません。ただ情熱的に好奇心が旺盛なだけです。", "source": "カール・ゼーリヒへの手紙 1952"}
        ]
    },

    # ==================== キュリー夫人 ====================
    "curie": {
        "events": [
            {"year": 1867, "age": 0, "title": "ポーランド・ワルシャワに教師の家の五女として誕生", "detail": "本名マリア・スクウォドフスカ。ロシア帝国支配下のポーランド。",
             "tags": ["poverty"]},
            {"year": 1876, "age": 9, "title": "長姉ゾフィアがチフスで死去、11歳で母も結核で死去", "detail": "相次ぐ家族の死でマリーは無神論者に。",
             "tags": ["loss", "parent_conflict"]},
            {"year": 1891, "age": 24, "title": "姉を頼ってパリへ、ソルボンヌで物理を学ぶ", "detail": "屋根裏部屋で飢えながら学ぶ。失神することもあった。",
             "tags": ["poverty", "restart", "isolation"]},
            {"year": 1895, "age": 28, "title": "ピエール・キュリーと結婚", "detail": "白いウェディングドレスではなく、実験でも着られる濃紺の服で式を挙げた。",
             "tags": ["turning_encounter"]},
            {"year": 1898, "age": 31, "title": "ポロニウム・ラジウムを発見", "detail": "祖国ポーランドに因んで『ポロニウム』と命名。掘立小屋の研究室で、何トンもの鉱石から取り出した。",
             "tags": ["breakthrough"]},
            {"year": 1903, "age": 36, "title": "女性初のノーベル物理学賞", "detail": "ピエール・ベクレルと共同受賞。授賞式には体調不良で出席できなかった。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1906, "age": 38, "title": "夫ピエールが馬車事故で即死", "detail": "雨のパリの街で。マリーはソルボンヌ史上初の女性教授として夫の後任に就く。",
             "tags": ["loss"]},
            {"year": 1911, "age": 44, "title": "ノーベル化学賞、同門ランジュヴァンとの不倫報道", "detail": "史上初の2度のノーベル賞受賞と同時に、家庭のある物理学者との関係をスキャンダルに。マスコミに家を囲まれた。",
             "tags": ["pride_broken", "heartbreak", "approval"]},
            {"year": 1914, "age": 47, "title": "第一次大戦、移動レントゲン車『プチ・キュリー』", "detail": "自らハンドルを握り最前線へ。約100万人の負傷兵を診断した。",
             "tags": ["breakthrough"]},
            {"year": 1934, "age": 66, "title": "再生不良性貧血で死去", "detail": "長年の放射線被曝が原因。彼女のノートは今も防護下でしか読めない。",
             "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "人生には恐れるべきものなど何もない。理解すべきものがあるだけだ。", "source": "娘エーヴへの言葉"},
            {"text": "科学者の仕事において、物事そのものを見るべきであって、人を見てはいけない。", "source": "自叙伝"},
            {"text": "私はよく『なぜ女性は科学の仕事ができないのか』と問われる。本当の疑問は、なぜそう問われるのかだ。", "source": "講演"},
            {"text": "ひとつのことを達成するまで、私は決して諦めない。", "source": "夫ピエールへの手紙"}
        ]
    },

    # ==================== ダ・ヴィンチ ====================
    "leonardo": {
        "events": [
            {"year": 1452, "age": 0, "title": "トスカーナ・ヴィンチ村で私生児として誕生", "detail": "父は公証人セル・ピエロ、母は農婦カテリーナ。結婚することはなかった。",
             "tags": ["parent_conflict"]},
            {"year": 1466, "age": 14, "title": "フィレンツェのヴェロッキオ工房へ弟子入り", "detail": "師ヴェロッキオは、レオナルドが描いた天使を見て以後絵筆を折ったと伝わる。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1482, "age": 30, "title": "ミラノのスフォルツァ公に仕える", "detail": "自薦状には『戦争機械・橋・大砲を作れる』を10項目、最後に『絵も描けます』と書いた。",
             "tags": ["restart"]},
            {"year": 1495, "age": 43, "title": "『最後の晩餐』を描く", "detail": "サンタ・マリア・デッレ・グラツィエ教会の食堂。実験的技法のため、彼の生前から剥がれ始めた。",
             "tags": ["breakthrough"]},
            {"year": 1503, "age": 51, "title": "『モナ・リザ』制作開始、生涯手放さなかった", "detail": "依頼主に渡さず、フランスまで持って行った。なぜ彼女が微笑むかは今も謎。",
             "tags": ["breakthrough"]},
            {"year": 1513, "age": 61, "title": "ローマへ、しかしミケランジェロ・ラファエロの影に", "detail": "若き天才たちの時代。最も創造的な仕事は背後に回された。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1516, "age": 64, "title": "フランス王フランソワ1世に招かれる", "detail": "クルー城の隣、クロ・リュセ館に『王の第一画家・建築家・機械技師』として迎えられた。",
             "tags": ["restart", "approval"]},
            {"year": 1519, "age": 67, "title": "クロ・リュセで死去、王の腕の中で", "detail": "フランソワ1世が『私は今日、真の人間を一人失った』と嘆いたと伝わる。7000ページの手稿を遺す。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "経験は決して誤らない。誤るのは、経験しないで判断を下すあなたたちの理性だ。", "source": "アトランティコ手稿"},
            {"text": "単純さは究極の洗練である。", "source": "レオナルドに帰される言葉"},
            {"text": "一度飛ぶ味を知ってしまった者は、地上を歩くときも目を天に向ける。そこに行ったことがあり、また行きたいから。", "source": "手稿"},
            {"text": "学習とは心を決して疲れさせず、決して後悔させず、決して失望させない唯一のものだ。", "source": "手稿"},
            {"text": "鉄は使わなければ錆びる。水は腐れば澱む。寒ければ凍る。そして、才能は使わなければ衰える。", "source": "手稿"}
        ]
    },

    # ==================== フロイト ====================
    "freud": {
        "events": [
            {"year": 1856, "age": 0, "title": "モラビア・フライベルクにユダヤ商人の子として誕生", "detail": "兄弟の中で最も愛され、母アマリアは彼を『黄金のジギ』と呼んだ。",
             "tags": ["approval"]},
            {"year": 1885, "age": 29, "title": "パリのシャルコーのもとでヒステリー研究", "detail": "催眠療法に衝撃を受け、精神の領域へ転向を決意。",
             "tags": ["turning_encounter", "restart"]},
            {"year": 1896, "age": 40, "title": "父ヤーコプの死", "detail": "『父の死は、人生で最も重要な出来事だ』と書く。自己分析と『夢判断』の出発点。",
             "tags": ["loss", "parent_conflict"]},
            {"year": 1900, "age": 44, "title": "『夢判断』刊行、最初は無視される", "detail": "6年で初版600部がやっと売れた。後に精神分析の『創世記』となる。",
             "tags": ["breakthrough", "pride_broken"]},
            {"year": 1910, "age": 54, "title": "ユングを後継者に指名、のち決別", "detail": "『息子』と呼んだユングが1913年に無意識論の相違で離反。最も深い傷となった。",
             "tags": ["heartbreak", "pride_broken"]},
            {"year": 1923, "age": 67, "title": "口蓋癌の手術、以後33回の手術", "detail": "葉巻を愛し続けた代償。それでも書き続けた。",
             "tags": ["illness"]},
            {"year": 1938, "age": 82, "title": "ナチスから逃れロンドンへ亡命", "detail": "娘アンナの同行とマリー・ボナパルトの金銭的支援で脱出。妹たち4人は強制収容所で死んだ。",
             "tags": ["restart", "loss", "isolation"]},
            {"year": 1939, "age": 83, "title": "ロンドンで医師による安楽死（モルヒネ投与）", "detail": "激痛の果てに自ら望んだ最期。主治医に事前の約束を果たしてもらった。",
             "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "どこにエスがあったか、そこに自我があるべきだ。", "source": "『続精神分析入門講義』"},
            {"text": "愛することと働くこと。これが健康のしるしだ。", "source": "フロイトに帰される言葉"},
            {"text": "無意識は意識の上に立ち、意識は無意識に働きかける。", "source": "『精神分析入門』"},
            {"text": "夢は無意識への王道である。", "source": "『夢判断』"},
            {"text": "私たちが自分について知っていることは、私たちを実際に動かしているものに比べれば微々たるものだ。", "source": "『精神分析入門』"}
        ]
    },

    # ==================== 織田信長 ====================
    "oda_nobunaga": {
        "events": [
            {"year": 1534, "age": 0, "title": "尾張・勝幡城で誕生", "detail": "父は織田信秀、母は土田御前。幼名『吉法師』。",
             "tags": []},
            {"year": 1546, "age": 12, "title": "元服、『うつけ者』と呼ばれる", "detail": "奇抜な格好で町を闊歩。湯漬けを立ったまま食い、柿を丸ごとかじった。家臣たちは『家が滅ぶ』と嘆いた。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1551, "age": 17, "title": "父信秀の葬儀で抹香を投げつける", "detail": "正装もせず現れ、位牌に抹香を投げた。『うつけぶり』の頂点。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1553, "age": 19, "title": "傅役・平手政秀が諫死", "detail": "信長の奇行を諫めるため腹を切った。信長は涙し、政秀寺を建立。",
             "tags": ["loss", "pride_broken"]},
            {"year": 1560, "age": 26, "title": "桶狭間の戦い — 2万の今川義元を奇襲で討つ", "detail": "豪雨の中、わずか3千で本陣を突いた。『人間五十年、下天のうちを比ぶれば夢幻の如くなり』を舞って出陣。",
             "tags": ["breakthrough"]},
            {"year": 1568, "age": 34, "title": "足利義昭を奉じて上洛", "detail": "天皇・将軍を擁し、京を制す。『天下布武』の印を使い始める。",
             "tags": ["breakthrough"]},
            {"year": 1571, "age": 37, "title": "比叡山焼き討ち", "detail": "女子供含め数千人を殺戮。神も仏も恐れなかった革命家の極致。",
             "tags": []},
            {"year": 1575, "age": 41, "title": "長篠の戦い、鉄砲三千挺で武田騎馬軍団を粉砕", "detail": "日本初の本格的銃撃戦。戦国の戦術が根本から変わった。",
             "tags": ["breakthrough"]},
            {"year": 1576, "age": 42, "title": "安土城築城", "detail": "5層7階の天守、黄金の茶室、キリスト教布教容認。世界を見据えた新都の構想。",
             "tags": ["breakthrough"]},
            {"year": 1582, "age": 48, "title": "本能寺の変 — 明智光秀の謀反で自刃", "detail": "6月2日未明。『是非に及ばず』と呟いて、燃える本能寺で自害した。遺体は見つからなかった。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人間五十年、下天のうちを比ぶれば、夢幻の如くなり。", "source": "『敦盛』を舞った際の歌詞"},
            {"text": "是非に及ばず。", "source": "本能寺、最期の言葉"},
            {"text": "鳴かぬなら殺してしまえホトトギス。", "source": "信長を評する伝承の句"},
            {"text": "必死に生きてこそ、その生涯は光を放つ。", "source": "信長に帰される言葉"}
        ]
    },

    # ==================== 豊臣秀吉 ====================
    "toyotomi_hideyoshi": {
        "events": [
            {"year": 1554, "age": 17, "title": "針売りをしながら今川家を経て信長に仕える", "detail": "木下藤吉郎として草履取りから。寒い朝、信長の草履を懐で温めて差し出した逸話が有名。",
             "tags": ["poverty", "restart"]},
            {"year": 1566, "age": 29, "title": "墨俣一夜城を築く（伝承）", "detail": "敵地の川筋に一晩で城を築いたという伝説。真偽は諸説あり。",
             "tags": ["breakthrough"]},
            {"year": 1573, "age": 36, "title": "浅井攻め、姉川の戦いで武功", "detail": "近江長浜城主となり、羽柴姓を名乗る。一気に譜代の上に躍り出る。",
             "tags": ["breakthrough"]},
            {"year": 1577, "age": 40, "title": "中国攻め（毛利征伐）開始", "detail": "播磨・備前・備中を転戦。清水宗治を水攻めにして備中高松城を落とす寸前だった。",
             "tags": []},
            {"year": 1583, "age": 46, "title": "賤ヶ岳の戦いで柴田勝家を破る", "detail": "信長の後継者争いを制す。『賤ヶ岳七本槍』で若い武将を大抜擢。",
             "tags": ["breakthrough"]},
            {"year": 1585, "age": 48, "title": "関白に任ぜられる", "detail": "武士出身で初。藤原姓を賜り、翌年『豊臣』の姓を創る。百姓の子が貴族の頂点へ。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1588, "age": 51, "title": "刀狩令、身分制度の固定化", "detail": "農民から武器を取り上げ、士農工商の区別を定着させた。自らの出世の道を閉ざす皮肉な政策。",
             "tags": []},
            {"year": 1591, "age": 54, "title": "実弟秀長の死", "detail": "補佐役を失い判断力が崩れる。この年に千利休を切腹させ、甥の関白秀次も翌々年処刑する。",
             "tags": ["loss"]},
            {"year": 1592, "age": 55, "title": "文禄の役 — 朝鮮出兵", "detail": "15万の大軍で朝鮮を攻めるが泥沼化。国力を疲弊させ民を苦しめた。",
             "tags": ["pride_broken"]},
            {"year": 1593, "age": 56, "title": "待望の嫡男・秀頼誕生", "detail": "57歳で授かった息子を溺愛。翌年、秀次一族を根絶やしにする原因となる。",
             "tags": ["turning_encounter"]},
            {"year": 1598, "age": 61, "title": "慶長の役の最中、伏見城で死去", "detail": "『秀頼のこと頼み申す』と五大老に遺言。露のごとく消えた天下人。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "露と落ち露と消えにし我が身かな 難波のことも夢のまた夢", "source": "辞世の句"},
            {"text": "鳴かぬなら鳴かせてみせようホトトギス。", "source": "性格を評する伝承の句"},
            {"text": "主より大なるは不忠なり。", "source": "秀吉の処世訓"},
            {"text": "我、天下を取らんと欲するに非ず。太閤の道を極めんと欲するのみ。", "source": "秀吉に帰される言葉"}
        ]
    },

    # ==================== 徳川家康 ====================
    "tokugawa_ieyasu": {
        "events": [
            {"year": 1555, "age": 12, "title": "今川義元のもとで元服、『元信』を名乗る", "detail": "駿府での人質生活は14歳まで続き、厳しい師・太原雪斎に学んだ。",
             "tags": ["restart", "approval"]},
            {"year": 1562, "age": 19, "title": "信長と清洲同盟", "detail": "20年以上続く、戦国きっての強固な同盟。裏切らなかったことが家康の信用を作った。",
             "tags": ["turning_encounter"]},
            {"year": 1570, "age": 27, "title": "姉川の戦いで信長を助ける", "detail": "浅井・朝倉連合軍を破る。信長の信任をさらに深めた。",
             "tags": []},
            {"year": 1572, "age": 29, "title": "三方ヶ原の戦いで武田信玄に惨敗", "detail": "恐怖のあまり馬上で脱糞したと伝わる。自分の『しかめ面』を絵師に描かせ、生涯手元に置いた。",
             "tags": ["pride_broken"]},
            {"year": 1579, "age": 36, "title": "嫡男・松平信康を自害させる", "detail": "信長の命により、武田との内通を疑われた息子を切腹させた。妻・築山殿も殺害。一生消えない傷。",
             "tags": ["loss", "parent_conflict", "pride_broken"]},
            {"year": 1582, "age": 39, "title": "本能寺の変、堺から『神君伊賀越え』", "detail": "わずかな供と堺にいたところへ信長横死の報。服部半蔵の手引きで決死の逃避行を成功させた。",
             "tags": ["loss", "restart"]},
            {"year": 1584, "age": 41, "title": "小牧・長久手で秀吉と戦い局地戦で勝つ", "detail": "直接戦えば勝てる。しかし政治力では及ばず、翌年臣従。",
             "tags": ["breakthrough", "pride_broken"]},
            {"year": 1590, "age": 47, "title": "関東移封 — 江戸への国替え", "detail": "秀吉により先祖伝来の三河から関東へ。この湿地帯を200万石の大都市に育てる。",
             "tags": ["restart"]},
            {"year": 1600, "age": 57, "title": "関ヶ原の戦い", "detail": "天下分け目の戦いに勝利。『三河の弱小』から天下人へ。",
             "tags": ["breakthrough"]},
            {"year": 1603, "age": 60, "title": "征夷大将軍、江戸幕府開府", "detail": "260年続く平和の時代の基礎を築く。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1605, "age": 62, "title": "わずか2年で将軍職を秀忠に譲る", "detail": "徳川が世襲することを天下に示し、豊臣との決別を明確化。",
             "tags": []},
            {"year": 1615, "age": 72, "title": "大坂夏の陣、豊臣家滅亡", "detail": "秀吉の遺児秀頼・淀殿を滅ぼす。約束された恩を最後の最後で裏切った。",
             "tags": []},
            {"year": 1616, "age": 73, "title": "駿府で死去", "detail": "『人の一生は重荷を負うて遠き道を行くが如し』の遺訓を残す。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人の一生は重荷を負うて遠き道を行くが如し。急ぐべからず。", "source": "東照宮御遺訓"},
            {"text": "不自由を常と思えば不足なし。", "source": "東照宮御遺訓"},
            {"text": "鳴かぬなら鳴くまで待とうホトトギス。", "source": "徳川家康を評する伝承の句"},
            {"text": "怒りは敵と思え。", "source": "東照宮御遺訓"},
            {"text": "勝つことばかり知りて、負くることを知らざれば、害その身に至る。", "source": "東照宮御遺訓"}
        ]
    },

    # ==================== 芥川龍之介 ====================
    "akutagawa": {
        "events": [
            {"year": 1892, "age": 0, "title": "東京・京橋に誕生、生後7ヶ月で母が発狂", "detail": "母の実家・芥川家に引き取られる。『私の母は狂人だった』と後に書く。",
             "tags": ["parent_conflict", "loss"]},
            {"year": 1913, "age": 21, "title": "東京帝国大学英文科入学、漱石山房に出入り", "detail": "夏目漱石の門下生となり、絶賛されて文壇へ。",
             "tags": ["turning_encounter", "approval"]},
            {"year": 1915, "age": 23, "title": "『羅生門』発表", "detail": "学生時代の処女作。後の世界文学となる出発点。",
             "tags": ["breakthrough"]},
            {"year": 1916, "age": 24, "title": "『鼻』で漱石に激賞される", "detail": "『ただ一筆に独自の見所を出している』と手紙で絶賛された。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1918, "age": 26, "title": "塚本文と結婚", "detail": "大阪毎日新聞社の海軍機関学校教授として安定した生活へ。",
             "tags": ["restart"]},
            {"year": 1921, "age": 29, "title": "中国特派員として上海・北京へ", "detail": "体調を崩し帰国。以後、神経衰弱が深まる。",
             "tags": ["illness"]},
            {"year": 1922, "age": 30, "title": "『藪の中』発表", "detail": "後に黒澤明『羅生門』の原作に。真実の相対性を問う。",
             "tags": ["breakthrough"]},
            {"year": 1927, "age": 35, "title": "自宅で服毒自殺", "detail": "7月24日未明、致死量の睡眠薬で。『ぼんやりした不安』を書き遺した。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "人生は一箱のマッチに似ている。重大に扱うのはばかばかしい。重大に扱わなければ危険である。", "source": "『侏儒の言葉』"},
            {"text": "天才とは、僅かに我々と一歩を隔てたる狂人の謂である。", "source": "『侏儒の言葉』"},
            {"text": "僕は将来に対する唯ぼんやりした不安である。", "source": "『或旧友へ送る手記』遺書"},
            {"text": "人生は地獄よりも地獄的である。", "source": "『侏儒の言葉』"}
        ]
    },

    # ==================== 三島由紀夫 ====================
    "mishima_yukio": {
        "events": [
            {"year": 1925, "age": 0, "title": "東京・四谷に誕生、祖母夏子のもとで育つ", "detail": "両親から引き離され、病弱な祖母の病室で12年間過ごす。異常に繊細な少年時代。",
             "tags": ["parent_conflict", "isolation"]},
            {"year": 1944, "age": 19, "title": "学習院を首席で卒業、天皇から銀時計を賜る", "detail": "昭和天皇に直接謁見。",
             "tags": ["approval"]},
            {"year": 1945, "age": 20, "title": "徴兵検査で不合格、敗戦を体験", "detail": "生涯『死に損なった世代』という意識を抱える。",
             "tags": ["pride_broken", "isolation"]},
            {"year": 1949, "age": 24, "title": "『仮面の告白』刊行、衝撃デビュー", "detail": "同性愛・異常性欲を告白体で描いた自伝的小説。",
             "tags": ["breakthrough"]},
            {"year": 1956, "age": 31, "title": "『金閣寺』刊行、読売文学賞", "detail": "放火僧の内面を描いた代表作。ノーベル賞候補に。",
             "tags": ["breakthrough", "approval"]},
            {"year": 1958, "age": 33, "title": "杉山瑤子と結婚", "detail": "川端康成の紹介。結婚しても肉体改造・武道への情熱は続く。",
             "tags": ["restart"]},
            {"year": 1965, "age": 40, "title": "『豊饒の海』四部作の執筆開始", "detail": "生涯の総決算。輪廻転生を貫く4冊を5年で書き上げる。",
             "tags": []},
            {"year": 1968, "age": 43, "title": "楯の会結成", "detail": "民族派の民兵組織。自衛隊での軍事訓練も行う。",
             "tags": []},
            {"year": 1970, "age": 45, "title": "市ヶ谷自衛隊駐屯地で割腹自殺", "detail": "11月25日、『豊饒の海』第4巻を編集者に届けた直後、楯の会4人と総監室を占拠、バルコニーで演説後に割腹。介錯は介錯人に頼んだ。",
             "tags": ["loss", "pride_broken"]}
        ],
        "quotes": [
            {"text": "人生に意味はない。しかし生きるに値する。", "source": "『葉隠入門』"},
            {"text": "精神と肉体を、同時に満たすことが人生の理想であった。", "source": "『太陽と鉄』"},
            {"text": "死は常に同時並行した生の一面として存在している。", "source": "『仮面の告白』"},
            {"text": "美は私にとって、怨敵なのだ。", "source": "『金閣寺』"},
            {"text": "七たび人間に生れて、国難に赴かん。", "source": "楯の会、辞世"}
        ]
    },

    # ==================== ラフマニノフ ====================
    "rachmaninoff": {
        "events": [
            {"year": 1873, "age": 0, "title": "ロシア・ノヴゴロド県で貴族の子として誕生", "detail": "家は裕福だったが、父の浪費で没落していく。",
             "tags": []},
            {"year": 1882, "age": 9, "title": "父の放蕩で家族離散", "detail": "姉エレーナは16歳で病死。ペテルブルク音楽院に入るがサボり癖で進級できず。",
             "tags": ["parent_conflict", "loss", "poverty"]},
            {"year": 1897, "age": 24, "title": "交響曲第1番大失敗、3年の鬱", "detail": "初演は大酒飲みのグラズノフの指揮で散々な出来。批評家に『地獄の音楽院が作らせた』と酷評され、ピアノの前に座れなくなる。",
             "tags": ["pride_broken", "blank_period"]},
            {"year": 1900, "age": 27, "title": "ダール博士の催眠療法で復活", "detail": "『あなたは協奏曲を書き上げる。それは素晴らしい出来になる』と暗示をかけ続けられ、『ピアノ協奏曲第2番』を完成。ダール博士に献呈された。",
             "tags": ["restart", "turning_encounter", "breakthrough"]},
            {"year": 1902, "age": 29, "title": "従妹ナターリアと結婚", "detail": "教会法では結婚できない関係だったが、特別許可を得て結婚。生涯の伴侶。",
             "tags": ["turning_encounter"]},
            {"year": 1909, "age": 36, "title": "『ピアノ協奏曲第3番』、アメリカデビュー", "detail": "自ら初演。最も難しい協奏曲の一つ。",
             "tags": ["breakthrough"]},
            {"year": 1917, "age": 44, "title": "ロシア革命で祖国を離れる", "detail": "家族と橇でフィンランドへ逃れ、以後二度と故国に戻らなかった。『私の中のロシアは去った』",
             "tags": ["restart", "loss", "isolation"]},
            {"year": 1918, "age": 45, "title": "アメリカへ、演奏家として生計を立てる", "detail": "作曲家から超一流ピアニストへ。以後20年間、年50回以上のコンサート。",
             "tags": ["restart"]},
            {"year": 1934, "age": 61, "title": "『パガニーニの主題による狂詩曲』完成", "detail": "晩年の最大の傑作。第18変奏の甘美な旋律は映画で何度も使われる。",
             "tags": ["breakthrough"]},
            {"year": 1943, "age": 69, "title": "ビバリーヒルズで肺癌により死去", "detail": "最期まで故国の土を踏むことはなかった。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽は心の中にある。そして心を揺さぶらなければ、それは音楽ではない。", "source": "書簡"},
            {"text": "一曲の中で、ただひとつの美しい瞬間があればよい。", "source": "ラフマニノフの言葉"}
        ],
        "works": [
            {"title": "ピアノ協奏曲第2番 ハ短調 作品18", "year": 1901, "type": "協奏曲",
             "description": "鬱からの復活を告げる傑作。映画『逢びき』で世界に広まった",
             "youtubeId": "rEGOihjqO9w"},
            {"title": "ピアノ協奏曲第3番 ニ短調 作品30", "year": 1909, "type": "協奏曲",
             "description": "『ラフ3』。最も難しいピアノ協奏曲のひとつ",
             "youtubeId": "XzC5oimCzrw"},
            {"title": "パガニーニの主題による狂詩曲 作品43", "year": 1934, "type": "協奏曲",
             "description": "第18変奏の甘美さは多くの映画で使われる",
             "youtubeId": "Pt9RcpLvJOo"},
            {"title": "ヴォカリーズ 作品34-14", "year": 1912, "type": "歌曲",
             "description": "歌詞のない歌。最も愛される小品"},
            {"title": "前奏曲 嬰ハ短調 作品3-2『鐘』", "year": 1892, "type": "ピアノ曲",
             "description": "19歳で書いた出世作。演奏会で『あの曲を』とリクエストされ続けた",
             "youtubeId": "TqEiwxN6OYc"}
        ]
    },

    # ==================== 宮沢賢治 ====================
    "miyazawa_kenji": {
        "events": [
            {"year": 1896, "age": 0, "title": "岩手・花巻、質屋の長男として誕生", "detail": "奥州大地震と三陸大津波の年。『三陸の津波』が生涯のトラウマに。",
             "tags": ["parent_conflict"]},
            {"year": 1909, "age": 13, "title": "盛岡中学入学、石集めに没頭", "detail": "『石っこ賢さん』と呼ばれる。鉱物・植物・昆虫への愛は生涯続く。",
             "tags": []},
            {"year": 1918, "age": 22, "title": "盛岡高等農林学校を首席で卒業", "detail": "農家の貧困を目の当たりにし、農民のために生きると決意。",
             "tags": ["turning_encounter"]},
            {"year": 1921, "age": 25, "title": "家出して東京へ、国柱会入会", "detail": "日蓮宗の熱心な信者に。父の浄土真宗と決別する宗教上の対立が続く。",
             "tags": ["parent_conflict", "restart"]},
            {"year": 1922, "age": 26, "title": "妹トシ死去、『永訣の朝』を書く", "detail": "24歳の妹トシが結核で他界。『あめゆじゅ とてちて けんじゃ』(雪を取ってきて)と頼んだ妹の臨終。賢治文学の原点。",
             "tags": ["loss"]},
            {"year": 1924, "age": 28, "title": "『注文の多い料理店』『春と修羅』自費出版", "detail": "どちらも売れなかった。200部以下。生前の評価はほぼゼロ。",
             "tags": ["pride_broken"]},
            {"year": 1926, "age": 30, "title": "羅須地人協会設立、農民のために活動", "detail": "肥料設計を無料で行い、チェロを弾き、農民に芸術を教えた。自らの体を削って働いた。",
             "tags": ["restart", "breakthrough"]},
            {"year": 1928, "age": 32, "title": "急性肺炎で倒れる、闘病生活へ", "detail": "以後病床。『農民芸術概論綱要』の理想を生きた代償。",
             "tags": ["illness"]},
            {"year": 1933, "age": 37, "title": "花巻で急死", "detail": "前夜に父と宗教談義。翌朝、肺結核のため逝く。『雨ニモマケズ』は手帳に書かれた遺作だった。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "雨ニモマケズ 風ニモマケズ", "source": "手帳に書かれた詩（1931）"},
            {"text": "世界がぜんたい幸福にならないうちは個人の幸福はあり得ない。", "source": "『農民芸術概論綱要』"},
            {"text": "わたくしという現象は 仮定された有機交流電燈の ひとつの青い照明です。", "source": "『春と修羅』序"},
            {"text": "どうか、あらゆるものをいかしてください。", "source": "『銀河鉄道の夜』"},
            {"text": "ほんたうのさいはひは一体何だらう。", "source": "『銀河鉄道の夜』"}
        ]
    },

    # ==================== 川端康成 ====================
    "kawabata": {
        "events": [
            {"year": 1899, "age": 0, "title": "大阪に誕生、2歳で父・3歳で母を失う", "detail": "祖父母に引き取られ、7歳で祖母・15歳で祖父も失い天涯孤独に。",
             "tags": ["parent_conflict", "loss", "isolation"]},
            {"year": 1924, "age": 25, "title": "横光利一らと『文藝時代』創刊", "detail": "新感覚派運動の旗手となる。",
             "tags": ["breakthrough"]},
            {"year": 1926, "age": 27, "title": "『伊豆の踊子』", "detail": "高等学校時代の一人旅を小説化。川端の出発点。",
             "tags": ["breakthrough"]},
            {"year": 1935, "age": 36, "title": "『雪国』連載開始（1948年完成）", "detail": "『国境の長いトンネルを抜けると雪国であった』の書き出しで知られる代表作。",
             "tags": ["breakthrough"]},
            {"year": 1948, "age": 49, "title": "日本ペンクラブ会長就任", "detail": "戦後の日本文学界を代表する地位へ。",
             "tags": ["approval"]},
            {"year": 1968, "age": 69, "title": "日本人初のノーベル文学賞", "detail": "『美しい日本の私』と題した受賞講演。三島はこの受賞を『あれは川端の賞だ、私のじゃない』と涙した。",
             "tags": ["approval", "breakthrough"]},
            {"year": 1972, "age": 72, "title": "逗子の仕事場でガス自殺", "detail": "遺書はなかった。親友三島の自決から1年5ヶ月後。『不意の死は死ではない』が口癖だった。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "国境の長いトンネルを抜けると雪国であった。", "source": "『雪国』冒頭"},
            {"text": "美しい日本の私。", "source": "ノーベル賞受賞講演 1968"},
            {"text": "自殺者はいかに悟達の境に入ろうとも、聖人の域には遠い。", "source": "川端の随筆"},
            {"text": "生きているということ、それはすなはち死に向いつつあるということである。", "source": "『末期の眼』"}
        ]
    },

    # ==================== カント ====================
    "kant": {
        "events": [
            {"year": 1724, "age": 0, "title": "ケーニヒスベルクに馬具職人の子として誕生", "detail": "敬虔派プロテスタントの母の影響は生涯続いた。",
             "tags": []},
            {"year": 1737, "age": 13, "title": "母アンナの死", "detail": "『私の母は、偉大な母だった』と後に弟子に語る。",
             "tags": ["loss", "parent_conflict"]},
            {"year": 1755, "age": 31, "title": "ケーニヒスベルク大学の私講師に", "detail": "以後15年、貧しい暮らしの中で論理学・地理学など多彩な講義。",
             "tags": ["restart"]},
            {"year": 1770, "age": 46, "title": "ケーニヒスベルク大学正教授に就任", "detail": "15年待ってようやく安定した職に。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1781, "age": 57, "title": "『純粋理性批判』刊行", "detail": "11年の沈黙の後に現れた大著。『コペルニクス的転回』と後世呼ばれる。初版は理解されなかった。",
             "tags": ["breakthrough"]},
            {"year": 1788, "age": 64, "title": "『実践理性批判』刊行", "detail": "道徳法則の絶対性を打ち立てる。",
             "tags": ["breakthrough"]},
            {"year": 1790, "age": 66, "title": "『判断力批判』で三批判書を完成", "detail": "美と目的性を論じ、批判哲学の体系を閉じた。",
             "tags": ["breakthrough"]},
            {"year": 1804, "age": 79, "title": "ケーニヒスベルクで死去", "detail": "生涯故郷から一度も遠くへ出なかった。最期の言葉は『これでよろしい』(Es ist gut)。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "我が上なる星空と、我が内なる道徳法則。", "source": "『実践理性批判』結語"},
            {"text": "人格は、他人の目的のための手段としてではなく、常に同時に目的として扱われなければならない。", "source": "『人倫の形而上学の基礎づけ』"},
            {"text": "あえて賢くあれ。(Sapere aude!)", "source": "『啓蒙とは何か』"},
            {"text": "内容なき思惟は空虚であり、概念なき直観は盲目である。", "source": "『純粋理性批判』"}
        ]
    },

    # ==================== チャイコフスキー ====================
    "tchaikovsky": {
        "events": [
            {"year": 1840, "age": 0, "title": "ウラル地方ヴォトキンスクの鉱山技師の子に", "detail": "姉ファニーによると『信じられないほど繊細な子』だった。",
             "tags": []},
            {"year": 1854, "age": 14, "title": "母アレクサンドラがコレラで死去", "detail": "『私の人生で最も恐ろしい出来事』。生涯、母への深い愛着と喪失が音楽に現れた。",
             "tags": ["loss", "parent_conflict"]},
            {"year": 1859, "age": 19, "title": "法律学校卒業、法務省書記官に", "detail": "父の望みで官僚の道へ。",
             "tags": []},
            {"year": 1863, "age": 23, "title": "官職を辞めペテルブルク音楽院へ", "detail": "遅いスタート。ルビンシテインに学ぶ。",
             "tags": ["restart"]},
            {"year": 1866, "age": 26, "title": "モスクワ音楽院教授に", "detail": "『交響曲第1番・冬の日の幻想』を作曲するが心労で神経衰弱。",
             "tags": ["illness"]},
            {"year": 1877, "age": 37, "title": "アントニーナと悲惨な結婚、2ヶ月で別居", "detail": "弟子からの熱烈な手紙に断りきれず結婚。同性愛者の苦悩と相まって川へ投身自殺未遂。弟に救われる。",
             "tags": ["heartbreak", "pride_broken", "restart"]},
            {"year": 1877, "age": 37, "title": "メック夫人との14年の文通開始", "detail": "『決して会わない』約束で、夫人から生活費援助。1200通以上の手紙を交わす。",
             "tags": ["turning_encounter"]},
            {"year": 1890, "age": 50, "title": "メック夫人から突然の絶縁", "detail": "経済的にも精神的にも最大の支えを失う。『人生で最も冷酷な打撃』。",
             "tags": ["heartbreak", "loss"]},
            {"year": 1893, "age": 53, "title": "『交響曲第6番 悲愴』初演9日後に死去", "detail": "コレラの生水を飲み急死。自殺説・毒殺説もあり謎に包まれている。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽とは、言葉では表せない感情を表現するために与えられた言語である。", "source": "メック夫人への手紙"},
            {"text": "霊感は、客人ではなく友人である。呼んでも来ず、呼ばなくても来る。", "source": "日記"},
            {"text": "もしあなたが運命と戦うなら、戦いそのものが、人生を価値あるものにするだろう。", "source": "書簡"}
        ],
        "works": [
            {"title": "ピアノ協奏曲第1番 変ロ短調 作品23", "year": 1875, "type": "協奏曲",
             "description": "壮大な序奏で始まる、最も有名な協奏曲のひとつ",
             "youtubeId": "FlIBytuRw2A"},
            {"title": "バレエ『白鳥の湖』作品20", "year": 1877, "type": "バレエ",
             "description": "世界で最も愛されるバレエ音楽",
             "youtubeId": "9cNQFB0TDfY"},
            {"title": "バレエ『くるみ割り人形』作品71", "year": 1892, "type": "バレエ",
             "description": "『花のワルツ』『金平糖の踊り』などクリスマスの定番"},
            {"title": "交響曲第6番 ロ短調『悲愴』作品74", "year": 1893, "type": "交響曲",
             "description": "死の9日前に自身が初演。第4楽章の消え入るような終結",
             "youtubeId": "zNpaOLFJj9s"},
            {"title": "ヴァイオリン協奏曲 ニ長調 作品35", "year": 1878, "type": "協奏曲",
             "description": "三大ヴァイオリン協奏曲のひとつ",
             "youtubeId": "2A_hNC98Iho"}
        ]
    },

    # ==================== ドビュッシー ====================
    "debussy": {
        "events": [
            {"year": 1862, "age": 0, "title": "サン＝ジェルマン＝アン＝レーの陶器店の子に誕生", "detail": "父は後に逮捕されるほどの無頼派。幼少期は不安定だった。",
             "tags": ["parent_conflict", "poverty"]},
            {"year": 1872, "age": 10, "title": "パリ音楽院入学", "detail": "既存の和声法を無視する『規則破りの学生』として有名。",
             "tags": ["approval"]},
            {"year": 1884, "age": 22, "title": "ローマ大賞を受賞", "detail": "カンタータ『放蕩息子』で受賞。しかしローマ留学には馴染めなかった。",
             "tags": ["approval"]},
            {"year": 1889, "age": 27, "title": "パリ万博でガムラン音楽に出会う", "detail": "ジャワの5音音階と打楽器群の響きに衝撃。以後の音楽観を決定的に変えた。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1894, "age": 32, "title": "『牧神の午後への前奏曲』初演", "detail": "マラルメの詩に触発された夢幻的な管弦楽。『近代音楽はここから始まる』と後にブーレーズが評した。",
             "tags": ["breakthrough"]},
            {"year": 1902, "age": 40, "title": "オペラ『ペレアスとメリザンド』初演", "detail": "10年かけて書き上げた唯一のオペラ。従来のオペラの語法を完全に刷新した。",
             "tags": ["breakthrough"]},
            {"year": 1904, "age": 42, "title": "妻リリーを捨て、エマと出奔", "detail": "リリーは拳銃自殺未遂。スキャンダルでパリ社交界から締め出される。",
             "tags": ["heartbreak", "pride_broken"]},
            {"year": 1905, "age": 43, "title": "『海』完成、娘シュシュ誕生", "detail": "日本の葛飾北斎『神奈川沖浪裏』の楽譜表紙は本人の指定。",
             "tags": ["breakthrough", "restart"]},
            {"year": 1909, "age": 47, "title": "直腸癌と診断", "detail": "以後9年の闘病。それでも作曲を止めなかった。",
             "tags": ["illness"]},
            {"year": 1918, "age": 55, "title": "ドイツ軍のパリ砲撃の中、死去", "detail": "葬列は砲弾を避けながら墓地へ向かった。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽は、音符と音符のあいだの、沈黙でできている。", "source": "ドビュッシーに帰される言葉"},
            {"text": "芸術は最も美しい嘘である。", "source": "ドビュッシーの言葉"},
            {"text": "音楽の規則はあなた自身である。", "source": "弟子への言葉"}
        ],
        "works": [
            {"title": "月の光（ベルガマスク組曲より）", "year": 1905, "type": "ピアノ曲",
             "description": "最も愛されるピアノ小品。ヴェルレーヌの詩から",
             "youtubeId": "CvFH_6DNRCY",
             "imslpUrl": "https://imslp.org/wiki/Suite_bergamasque_(Debussy%2C_Claude)"},
            {"title": "牧神の午後への前奏曲", "year": 1894, "type": "管弦楽",
             "description": "近代音楽の夜明け。ニジンスキーのバレエでも有名",
             "youtubeId": "wWWWgwAkaeo"},
            {"title": "交響詩『海』", "year": 1905, "type": "管弦楽",
             "description": "北斎の浪を楽譜表紙に添えた海の三部作",
             "youtubeId": "1Os5PFkdFyE"},
            {"title": "アラベスク第1番", "year": 1891, "type": "ピアノ曲",
             "description": "初期の優美な代表作",
             "youtubeId": "ORzmDc7KcY0"},
            {"title": "喜びの島", "year": 1904, "type": "ピアノ曲",
             "description": "ヴァトーの絵画に着想を得た光あふれるピアノ曲",
             "youtubeId": "QqZJwqAmVOs"}
        ]
    },

    # ==================== シューベルト ====================
    "schubert": {
        "events": [
            {"year": 1797, "age": 0, "title": "ウィーン近郊の教師の家に誕生", "detail": "14人兄弟の12番目。貧困の中で育った。",
             "tags": ["poverty"]},
            {"year": 1808, "age": 11, "title": "宮廷礼拝堂少年合唱団に入団", "detail": "サリエリに作曲を学ぶ特待生となる。",
             "tags": ["approval"]},
            {"year": 1814, "age": 17, "title": "『糸を紡ぐグレートヒェン』作曲、歌曲史の幕開け", "detail": "ゲーテの詩に17歳で付けた完璧な歌曲。ドイツ・リートの誕生。",
             "tags": ["breakthrough"]},
            {"year": 1815, "age": 18, "title": "1年で150曲以上の歌曲を量産", "detail": "『魔王』もこの年。『神に取り憑かれた』ような創作の爆発。",
             "tags": ["breakthrough"]},
            {"year": 1818, "age": 21, "title": "教師を辞めて作曲に専念", "detail": "『シューベルティアーデ』と呼ばれる友人たちの集いで自作を披露。貧しくとも愛された。",
             "tags": ["restart", "approval"]},
            {"year": 1822, "age": 25, "title": "交響曲第7番『未完成』作曲、梅毒発症", "detail": "2楽章で筆を置いた謎。同時に発症した梅毒が彼の晩年を蝕む。",
             "tags": ["illness", "breakthrough"]},
            {"year": 1827, "age": 30, "title": "歌曲集『冬の旅』作曲", "detail": "ミュラーの詩による24曲。絶望と孤独の旅路。『こんなに暗い歌を書いたことは我ながら驚く』と友人に漏らした。",
             "tags": ["breakthrough", "isolation"]},
            {"year": 1827, "age": 30, "title": "敬愛するベートーヴェンの葬儀で松明を持つ", "detail": "生涯憧れた巨匠の棺に最も近い位置にいた。",
             "tags": ["loss"]},
            {"year": 1828, "age": 31, "title": "腸チフスで死去", "detail": "最晩年に傑作を連発しながら31歳で逝く。『ここにベートーヴェンの隣に眠りたい』が叶えられた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私は自分の悲しみを歌うために生まれてきた。", "source": "日記 1824"},
            {"text": "私の音楽を知りたければ、私の人生を知る必要はない。ただ聴いてくれればよい。", "source": "シューベルトに帰される言葉"},
            {"text": "自分の境遇に満足している人はない。皆、互いに羨み合う。世はそうしたものだ。", "source": "書簡"}
        ],
        "works": [
            {"title": "魔王 D.328", "year": 1815, "type": "歌曲",
             "description": "ゲーテの詩による、嵐の夜の馬上の物語",
             "youtubeId": "JS91p-vmSf0"},
            {"title": "アヴェ・マリア D.839", "year": 1825, "type": "歌曲",
             "description": "『エレンの歌』として作曲された、祈りの旋律",
             "youtubeId": "2H7FM4Uwliw"},
            {"title": "交響曲第8番（旧7番）ロ短調『未完成』D.759", "year": 1822, "type": "交響曲",
             "description": "2楽章しかない不滅の謎",
             "youtubeId": "4Gnh4eE-ghs"},
            {"title": "歌曲集『冬の旅』D.911", "year": 1827, "type": "歌曲",
             "description": "24曲で綴る、失恋の旅",
             "youtubeId": "CfRSt0lvpTo"},
            {"title": "ピアノ五重奏曲 イ長調『ます』D.667", "year": 1819, "type": "室内楽",
             "description": "同名歌曲を第4楽章に組み込んだ陽光の室内楽",
             "youtubeId": "gu-HnzRQeWc"},
            {"title": "即興曲 D.899 / D.935", "year": 1827, "type": "ピアノ曲",
             "description": "晩年の内省的なピアノ小品集",
             "youtubeId": "hfFtuvYSPM8"}
        ]
    },

    # ==================== ブラームス ====================
    "brahms": {
        "events": [
            {"year": 1833, "age": 0, "title": "ハンブルクの貧しい音楽家の家に誕生", "detail": "父はコントラバス奏者、母は20歳年上の裁縫婦。場末の酒場で少年時代からピアノを弾いて家計を支えた。",
             "tags": ["poverty", "parent_conflict"]},
            {"year": 1853, "age": 20, "title": "シューマンを訪ね、『新しい道』の論文で絶賛される", "detail": "シューマンは無名の青年を『救世主』として雑誌に発表。ブラームスの名を一夜で有名にした。",
             "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1854, "age": 21, "title": "シューマンがライン川に投身、クララへの愛", "detail": "療養院のシューマンに代わり、14歳年上の妻クララを支える。生涯続く秘めた愛の始まり。",
             "tags": ["heartbreak", "turning_encounter"]},
            {"year": 1868, "age": 35, "title": "『ドイツ・レクイエム』初演、作曲家として確立", "detail": "母の死をきっかけに書かれた、プロテスタント流のレクイエム。",
             "tags": ["breakthrough"]},
            {"year": 1876, "age": 43, "title": "交響曲第1番完成、21年の苦闘", "detail": "『ベートーヴェンの足音が背後から聞こえる』と言い続け21年。『ベートーヴェンの第10』と呼ばれた。",
             "tags": ["breakthrough"]},
            {"year": 1896, "age": 63, "title": "クララ・シューマン死去", "detail": "訃報の電車に飛び乗り間に合わず。『4つの厳粛な歌』を遺作として書く。",
             "tags": ["loss", "heartbreak"]},
            {"year": 1897, "age": 63, "title": "肝臓癌のためウィーンで死去", "detail": "クララの死の11ヶ月後。生涯独身を貫いた。",
             "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "誰もが知っている曲を書くのは難しくない。誰にも書けない曲を書くのが難しいのだ。", "source": "ブラームスの言葉"},
            {"text": "偶然は存在しない。あらゆる偶然に見えるものの背後には、意味がある。", "source": "書簡"},
            {"text": "作曲は容易だ。難しいのは、余計な音符を机の下に落とすことだ。", "source": "ブラームスに帰される言葉"}
        ],
        "works": [
            {"title": "交響曲第1番 ハ短調 作品68", "year": 1876, "type": "交響曲",
             "description": "21年の苦闘。『ベートーヴェンの第10』",
             "youtubeId": "_YTIVqTc9YM"},
            {"title": "交響曲第4番 ホ短調 作品98", "year": 1885, "type": "交響曲",
             "description": "パッサカリアで締めくくられる、最も晩秋の交響曲",
             "youtubeId": "hYwNRx_G_aA"},
            {"title": "ハンガリー舞曲第5番", "year": 1869, "type": "管弦楽",
             "description": "最も有名な舞曲",
             "youtubeId": "Nzo3atXtm54"},
            {"title": "ドイツ・レクイエム 作品45", "year": 1868, "type": "宗教曲",
             "description": "『葬送ではなく、慰めのレクイエム』",
             "youtubeId": "T7-GRG64bwY"},
            {"title": "ヴァイオリン協奏曲 ニ長調 作品77", "year": 1878, "type": "協奏曲",
             "description": "親友ヨアヒムに捧げた、三大ヴァイオリン協奏曲のひとつ",
             "youtubeId": "KprLpfvu-8o"},
            {"title": "子守歌 作品49-4", "year": 1868, "type": "歌曲",
             "description": "世界で最も歌われる子守歌"}
        ]
    },
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
