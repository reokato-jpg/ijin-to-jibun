# -*- coding: utf-8 -*-
"""第5弾：発明家・映画監督・現代のアイコン10人追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"
MANIFEST = ROOT / "data" / "manifest.json"

PEOPLE_DATA = [
    {
        "id": "galileo", "name": "ガリレオ・ガリレイ", "nameEn": "Galileo Galilei",
        "birth": 1564, "death": 1642, "country": "イタリア", "field": "天文学者・物理学者",
        "summary": "望遠鏡で木星の衛星と月の凹凸を観測し、地動説を証明。ローマ教会の異端審問で生涯幽閉となりながら『それでも地球は回っている』と呟いたと伝わる近代科学の父。",
        "events": [
            {"year": 1564, "age": 0, "title": "ピサに音楽家の子として誕生", "detail": "シェイクスピアと同い年。", "tags": []},
            {"year": 1583, "age": 19, "title": "ピサの大聖堂で振り子の等時性発見", "detail": "吊り下げられたランプの揺れを自分の脈拍で測り気づいた。", "tags": ["breakthrough"]},
            {"year": 1589, "age": 25, "title": "ピサ大学数学教授", "detail": "落体の法則を実験で証明。", "tags": ["approval"]},
            {"year": 1609, "age": 45, "title": "望遠鏡を自作し空へ向ける", "detail": "月のクレーター、木星の4衛星、金星の満ち欠けを発見。", "tags": ["breakthrough"]},
            {"year": 1610, "age": 46, "title": "『星界の報告』出版", "detail": "地動説を強く示唆する観測記録。世界的ベストセラー。", "tags": ["breakthrough"]},
            {"year": 1616, "age": 52, "title": "第1回異端審問、地動説主張を禁止される", "detail": "ベラルミーノ枢機卿から警告。", "tags": ["pride_broken"]},
            {"year": 1632, "age": 68, "title": "『天文対話』出版、激怒を買う", "detail": "地動説を擁護した3人の対話体。", "tags": ["breakthrough"]},
            {"year": 1633, "age": 69, "title": "異端審問で有罪、自宅幽閉へ", "detail": "地動説撤回を強要された。『それでも地球は回っている』と呟いたとされる。", "tags": ["pride_broken", "isolation"]},
            {"year": 1638, "age": 74, "title": "『新科学対話』ライデンで出版", "detail": "幽閉中に書いた力学の古典。", "tags": ["breakthrough"]},
            {"year": 1642, "age": 77, "title": "アルチェトリで死去", "detail": "目は失明していた。同年ニュートン誕生。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "それでも地球は回っている。", "source": "異端審問後の伝承"},
            {"text": "自然の書物は数学の言語で書かれている。", "source": "『偽金鑑識官』"},
            {"text": "真理を語る勇気をもて、たとえ世界がそれに反対しても。", "source": "書簡"},
            {"text": "私は太陽が回っているなどと言ったことはない。", "source": "裁判記録"}
        ],
        "relations": [
            {"name": "ヨハネス・ケプラー", "id": "kepler", "relation": "同時代の支持者", "note": "手紙で相互に励ました"}
        ],
        "places": [
            {"name": "ピサの斜塔", "location": "イタリア・ピサ", "note": "落体実験の伝承の地"},
            {"name": "ヴィラ・イル・ジョイエッロ", "location": "フィレンツェ近郊アルチェトリ", "note": "晩年の幽閉先"}
        ],
        "books": [
            {"title": "星界の報告", "author": "ガリレオ", "asin": "4006001657", "description": "望遠鏡による宇宙観測の記録"}
        ]
    },
    {
        "id": "kepler", "name": "ヨハネス・ケプラー", "nameEn": "Johannes Kepler",
        "birth": 1571, "death": 1630, "country": "ドイツ", "field": "天文学者",
        "summary": "惑星運動の3法則を発見した近代天文学の父。母は魔女として告発され救出、7人の子のうち4人が乳幼児死。神秘主義的な宇宙の調和を求め続けた。",
        "events": [
            {"year": 1571, "age": 0, "title": "ドイツ・ヴァイル・デア・シュタットで未熟児として誕生", "detail": "家系は没落、父は傭兵でいなくなった。", "tags": ["poverty", "parent_conflict"]},
            {"year": 1600, "age": 28, "title": "プラハのティコ・ブラーエの助手に", "detail": "超精密観測データへのアクセス。", "tags": ["turning_encounter"]},
            {"year": 1601, "age": 29, "title": "ティコの死、観測データ継承", "detail": "皇帝数学官を継ぐ。", "tags": ["loss", "restart"]},
            {"year": 1609, "age": 37, "title": "『新天文学』で第1・第2法則発表", "detail": "楕円軌道と面積速度一定。", "tags": ["breakthrough"]},
            {"year": 1611, "age": 39, "title": "妻と息子を天然痘で失う", "detail": "同時期にプラハの庇護者ルドルフ2世も退位。", "tags": ["loss"]},
            {"year": 1615, "age": 43, "title": "母カタリーナが魔女として告発", "detail": "6年の裁判を戦い救出。自ら弁護に立った。", "tags": ["parent_conflict", "pride_broken"]},
            {"year": 1619, "age": 47, "title": "第3法則発表、『世界の調和』", "detail": "惑星の公転周期と距離の関係。", "tags": ["breakthrough"]},
            {"year": 1630, "age": 58, "title": "レーゲンスブルクで病没", "detail": "未払い給与の請求のため移動中だった。墓は戦争で失われた。", "tags": ["loss", "poverty"]}
        ],
        "quotes": [
            {"text": "幾何学こそ神の言語である。", "source": "『宇宙の神秘』"},
            {"text": "人は忘れる。しかし音楽と数学は忘れない。", "source": "ケプラーの手記"},
            {"text": "私はあなた方に貸しがある。未来の世代に支払ってもらおう。", "source": "死の床"}
        ],
        "relations": [
            {"name": "ガリレオ", "id": "galileo", "relation": "文通した同志", "note": "二人で地動説を支えた"}
        ],
        "places": [
            {"name": "ケプラー博物館", "location": "ドイツ・ヴァイル・デア・シュタット", "note": "生家が博物館に"}
        ],
        "books": []
    },
    {
        "id": "edison", "name": "トーマス・エジソン", "nameEn": "Thomas Edison",
        "birth": 1847, "death": 1931, "country": "アメリカ", "field": "発明家",
        "summary": "電球・蓄音機・映写機を発明し、近代生活を一変させたメンロパークの魔術師。1093の特許、人生の93%をラボで過ごした。『天才は1%のひらめきと99%の汗』。",
        "events": [
            {"year": 1847, "age": 0, "title": "オハイオ州ミランに誕生", "detail": "7番目の子。幼少期に猩紅熱で難聴に。", "tags": ["illness"]},
            {"year": 1854, "age": 7, "title": "小学校を3ヶ月で退学", "detail": "教師に『頭が混乱している』と言われた。母が家庭教育を引き受け、以後家で学ぶ。", "tags": ["pride_broken", "parent_conflict"]},
            {"year": 1862, "age": 15, "title": "駅長の息子を救い、電信技術を学ぶ", "detail": "感謝した駅長が電信の技を伝授。放浪の電信技師時代へ。", "tags": ["turning_encounter"]},
            {"year": 1876, "age": 29, "title": "メンロパーク研究所設立", "detail": "『発明工場』の世界初のモデル。", "tags": ["breakthrough", "restart"]},
            {"year": 1877, "age": 30, "title": "蓄音機発明", "detail": "『メリーさんの羊』で自分の声を録音。世界を驚愕させた。", "tags": ["breakthrough"]},
            {"year": 1879, "age": 32, "title": "白熱電球を実用化", "detail": "6000種類の素材を試した末、竹の繊維で1200時間点灯成功。", "tags": ["breakthrough"]},
            {"year": 1884, "age": 37, "title": "最初の妻メアリーが26歳で死去", "detail": "残された3人の子と会話できず悩む。", "tags": ["loss"]},
            {"year": 1891, "age": 44, "title": "映写機キネトスコープ発明", "detail": "動画の時代の幕開け。", "tags": ["breakthrough"]},
            {"year": 1900, "age": 53, "title": "エジソン＝テスラの電流戦争に敗北", "detail": "直流を押したエジソンに対し、交流のテスラが勝利。", "tags": ["pride_broken"]},
            {"year": 1931, "age": 84, "title": "ニュージャージーで死去", "detail": "『向こうはとても美しい』が最期の言葉。全米が1分間電気を止めて追悼した。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "天才とは1%のひらめきと99%の汗である。", "source": "1903年のインタビュー"},
            {"text": "私は失敗していない。うまくいかない方法を1万通り見つけただけだ。", "source": "エジソンに帰される言葉"},
            {"text": "何かより良い方法があるはずだ。探してくれ。", "source": "ラボのモットー"},
            {"text": "人生で後悔するのは、やらなかったことだ。", "source": "書簡"}
        ],
        "relations": [
            {"name": "ニコラ・テスラ", "id": "tesla", "relation": "元部下・最大のライバル", "note": "交流vs直流の電流戦争"},
            {"name": "ヘンリー・フォード", "relation": "親友", "note": "自動車王とは生涯の友"}
        ],
        "places": [
            {"name": "エジソン国立歴史公園", "location": "米ニュージャージー州ウェストオレンジ", "note": "ラボと邸宅"}
        ],
        "books": [
            {"title": "エジソンの生涯", "author": "ランドール・ストロス", "asin": "4894515075", "description": "決定版伝記"}
        ]
    },
    {
        "id": "tesla", "name": "ニコラ・テスラ", "nameEn": "Nikola Tesla",
        "birth": 1856, "death": 1943, "country": "クロアチア→アメリカ", "field": "発明家",
        "summary": "交流電気、ラジオ、無線送電の父。エジソンのライバルとして『電流戦争』を戦い勝利したが、晩年は鳩を愛するホテル住まいの奇人に。死後その業績は神話化した。",
        "events": [
            {"year": 1856, "age": 0, "title": "クロアチアに正教会司祭の子として誕生", "detail": "雷鳴の夜、助産婦が『闇の子』と呟いた。母は『いや光の子よ』と返した。", "tags": []},
            {"year": 1884, "age": 27, "title": "アメリカ渡航、エジソンの会社で働く", "detail": "4ドルと詩集だけでニューヨークに到着。", "tags": ["restart"]},
            {"year": 1887, "age": 30, "title": "交流モーター発明", "detail": "幾度も夢で見た回転磁界の原理を実現。", "tags": ["breakthrough"]},
            {"year": 1893, "age": 37, "title": "シカゴ万博で交流電力システムを公開", "detail": "エジソンの直流に勝利し、ナイアガラの発電所契約へ。", "tags": ["breakthrough", "approval"]},
            {"year": 1895, "age": 39, "title": "ニューヨークの研究所が火災で全焼", "detail": "全ての記録と発明品を失う。立ち直るまで数年を要した。", "tags": ["loss", "pride_broken"]},
            {"year": 1899, "age": 43, "title": "コロラドの実験所で無線送電実験", "detail": "人工雷で30km先の電球を点灯。", "tags": ["breakthrough"]},
            {"year": 1901, "age": 45, "title": "ウォーデンクリフ・タワー建設", "detail": "無線で世界に電力を送る夢の塔。資金難で中止、解体された。", "tags": ["pride_broken"]},
            {"year": 1943, "age": 86, "title": "ニューヨークのホテルで独居死", "detail": "鳩を愛した晩年。遺体は発見まで2日かかった。", "tags": ["loss", "isolation"]}
        ],
        "quotes": [
            {"text": "現在は彼らのものだ。しかし未来は私のものだ。", "source": "書簡"},
            {"text": "3と6と9の秘密を解けば、宇宙への鍵を持つことになる。", "source": "テスラに帰される言葉"},
            {"text": "私は鳩を愛している。鳩は私を愛している。", "source": "晩年のインタビュー"}
        ],
        "relations": [
            {"name": "トーマス・エジソン", "id": "edison", "relation": "元上司・ライバル", "note": "電流戦争の相手"},
            {"name": "ジョージ・ウェスティングハウス", "relation": "パートナー", "note": "交流電力事業を共にした"}
        ],
        "places": [
            {"name": "ニコラ・テスラ博物館", "location": "セルビア・ベオグラード", "note": "遺灰と資料を保管"}
        ],
        "books": []
    },
    {
        "id": "walt_disney", "name": "ウォルト・ディズニー", "nameEn": "Walt Disney",
        "birth": 1901, "death": 1966, "country": "アメリカ", "field": "アニメーター・起業家",
        "summary": "ミッキーマウスの生みの親、世界初の長編アニメ『白雪姫』、そしてディズニーランド。破産寸前を何度も乗り越え、22のアカデミー賞を獲得した夢の王国の建築家。",
        "events": [
            {"year": 1901, "age": 0, "title": "シカゴで誕生、幼少期はミズーリ州マーセリン", "detail": "この田舎町がメインストリートUSAのモデル。", "tags": []},
            {"year": 1923, "age": 21, "title": "最初の会社倒産、ハリウッドへ", "detail": "カンザスシティのラフォグラム社破産。40ドルだけ持ってカリフォルニアへ。", "tags": ["pride_broken", "restart"]},
            {"year": 1927, "age": 25, "title": "配給会社にキャラ『オズワルド』を奪われる", "detail": "大阪の商人のように権利を騙し取られた。列車で帰る途中ミッキーを考案。", "tags": ["pride_broken", "turning_encounter"]},
            {"year": 1928, "age": 26, "title": "『蒸気船ウィリー』でミッキー・マウスデビュー", "detail": "世界初の同期音声アニメ。ウォルトが自ら声を当てた。", "tags": ["breakthrough"]},
            {"year": 1937, "age": 35, "title": "『白雪姫』世界初の長編アニメ", "detail": "『ディズニーの愚行』と呼ばれたが、大成功。ディズニー黄金時代の幕開け。", "tags": ["breakthrough"]},
            {"year": 1941, "age": 39, "title": "スタジオでアニメーター・ストライキ", "detail": "生涯の傷。以後、組合を嫌った。", "tags": ["pride_broken"]},
            {"year": 1955, "age": 53, "title": "ディズニーランド開園", "detail": "カリフォルニア・アナハイム。初日は大混乱だったが3ヶ月で100万人来場。", "tags": ["breakthrough"]},
            {"year": 1966, "age": 65, "title": "肺がんで死去", "detail": "フロリダのディズニー・ワールド建設途中。兄ロイが完成させた。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "夢を見ることができれば、それは実現できる。", "source": "ウォルト・ディズニーの言葉"},
            {"text": "最も困難なことは、始めることだ。", "source": "ディズニーの言葉"},
            {"text": "笑いが生まれない作品は作らない。", "source": "スタジオで"},
            {"text": "ディズニーランドは決して完成しない。世界に想像力がある限り、成長し続ける。", "source": "開園式典"}
        ],
        "relations": [
            {"name": "ロイ・ディズニー", "relation": "兄・事業パートナー", "note": "経営を担った兄"}
        ],
        "places": [
            {"name": "ディズニーランド", "location": "米カリフォルニア州アナハイム", "note": "世界初のテーマパーク"}
        ],
        "books": []
    },
    {
        "id": "kurosawa", "name": "黒澤明", "nameEn": "Akira Kurosawa",
        "birth": 1910, "death": 1998, "country": "日本", "field": "映画監督",
        "summary": "『羅生門』『七人の侍』『用心棒』で世界の映画史を塗り替えた『世界のクロサワ』。30本の長編、スピルバーグ・ルーカスの師匠。ヴェネツィア金獅子、アカデミー名誉賞。",
        "events": [
            {"year": 1910, "age": 0, "title": "東京・大森に陸軍軍医の8番目の子として誕生", "detail": "父は剣道指南役、姉兄が多い伸び伸びした少年時代。", "tags": []},
            {"year": 1933, "age": 23, "title": "兄須田貞明が自殺", "detail": "映画弁士の兄が28歳で自死。黒澤映画の暗い影の源流。", "tags": ["loss"]},
            {"year": 1936, "age": 26, "title": "PCL映画（現・東宝）助監督", "detail": "山本嘉次郎に師事。", "tags": ["restart"]},
            {"year": 1943, "age": 33, "title": "監督デビュー『姿三四郎』", "detail": "戦時中のデビュー。当時の軍部から『英米風すぎる』と批判されたが大ヒット。", "tags": ["breakthrough"]},
            {"year": 1950, "age": 40, "title": "『羅生門』ヴェネツィア金獅子賞", "detail": "東洋の映画が世界に認められた記念碑。", "tags": ["breakthrough", "approval"]},
            {"year": 1954, "age": 44, "title": "『七人の侍』公開", "detail": "207分の大作。世界中でリメイク・引用される。", "tags": ["breakthrough"]},
            {"year": 1971, "age": 61, "title": "『どですかでん』不振で自殺未遂", "detail": "カミソリで首と腕を21箇所切った。家族に発見され救命。", "tags": ["pride_broken"]},
            {"year": 1975, "age": 65, "title": "ソ連で『デルス・ウザーラ』でアカデミー外国語映画賞", "detail": "日本で撮れなくなりソ連で撮った復活作。", "tags": ["restart"]},
            {"year": 1985, "age": 75, "title": "『乱』公開", "detail": "シェイクスピア『リア王』を戦国日本に。武満徹音楽。", "tags": ["breakthrough"]},
            {"year": 1998, "age": 88, "title": "東京で死去", "detail": "最後まで『まあだだよ』を超える映画を撮ろうと準備していた。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "創造するということは、記憶すること。", "source": "黒澤の言葉"},
            {"text": "世界を映画に、映画を世界に。", "source": "書簡"},
            {"text": "自分を超えるものを作ろうとした日にだけ、本物の作品ができる。", "source": "インタビュー"},
            {"text": "いま生きていることが素晴らしい。", "source": "『まあだだよ』"}
        ],
        "relations": [
            {"name": "三船敏郎", "relation": "盟友俳優", "note": "16本の映画を共に。1965年に決裂"},
            {"name": "武満徹", "id": "takemitsu", "relation": "晩年の音楽担当", "note": "『乱』の音楽"}
        ],
        "places": [
            {"name": "黒澤明記念サテライトスタジオ", "location": "兵庫県豊岡市", "note": "記念館"}
        ],
        "books": [
            {"title": "蝦蟇の油", "author": "黒澤明", "asin": "4003311019", "description": "自伝"}
        ]
    },
    {
        "id": "miyazaki", "name": "宮崎駿", "nameEn": "Hayao Miyazaki",
        "birth": 1941, "death": None, "country": "日本", "field": "映画監督・アニメーター",
        "summary": "スタジオジブリの魂。『となりのトトロ』『千と千尋の神隠し』『もののけ姫』で世界中の子供たちに魔法をかけた。引退宣言と撤回を繰り返し、83歳で『君たちはどう生きるか』を発表。",
        "events": [
            {"year": 1941, "age": 0, "title": "東京・文京区に誕生", "detail": "4人兄弟の次男。父は飛行機部品会社経営、少年時代を疎開で栃木で過ごす。", "tags": []},
            {"year": 1963, "age": 22, "title": "東映動画入社", "detail": "学習院大学卒業後、アニメーターに。初任給1万9500円。", "tags": ["restart"]},
            {"year": 1964, "age": 23, "title": "東映動画でストライキ、高畑勲と出会う", "detail": "労働組合活動で5歳年上の高畑と生涯の盟友となる。", "tags": ["turning_encounter"]},
            {"year": 1978, "age": 37, "title": "『未来少年コナン』TV監督デビュー", "detail": "NHKの名作。", "tags": ["breakthrough"]},
            {"year": 1984, "age": 43, "title": "『風の谷のナウシカ』公開", "detail": "徳間書店の支援で独立。ジブリの原型。", "tags": ["breakthrough"]},
            {"year": 1985, "age": 44, "title": "スタジオジブリ設立", "detail": "高畑勲・鈴木敏夫と。", "tags": ["restart"]},
            {"year": 1988, "age": 47, "title": "『となりのトトロ』公開", "detail": "興行は苦戦したが、世界中で愛される作品に。", "tags": ["breakthrough"]},
            {"year": 1997, "age": 56, "title": "『もののけ姫』邦画史上最高興収", "detail": "193億円。ジブリ最大のヒット。", "tags": ["breakthrough"]},
            {"year": 2002, "age": 61, "title": "『千と千尋』アカデミー長編アニメ賞", "detail": "日本アニメ初のオスカー。ベルリン金熊賞も同時受賞。", "tags": ["approval"]},
            {"year": 2013, "age": 72, "title": "『風立ちぬ』公開後に引退宣言", "detail": "7回目の引退宣言。以後も撤回。", "tags": []},
            {"year": 2023, "age": 82, "title": "『君たちはどう生きるか』公開", "detail": "10年ぶりの新作。アカデミー賞受賞。", "tags": ["breakthrough"]}
        ],
        "quotes": [
            {"text": "世の中は糞みたいなもんですが、僕はそれでも、世界は生きる価値があると思って作ってきた。", "source": "引退会見 2013"},
            {"text": "大切なものは目に見えない。", "source": "『風立ちぬ』"},
            {"text": "アニメーションの仕事は、一生懸命生きている人を描くことだ。", "source": "NHKインタビュー"},
            {"text": "もう大人になってしまった自分に、子供の時を思い出させたい。", "source": "インタビュー"}
        ],
        "relations": [
            {"name": "高畑勲", "relation": "盟友・師", "note": "ジブリ共同創業者、先に逝った"},
            {"name": "久石譲", "id": "hisaishi", "relation": "音楽", "note": "全作品の音楽担当"}
        ],
        "places": [
            {"name": "三鷹の森ジブリ美術館", "location": "東京都三鷹市", "note": "宮崎駿が全てを監修した美術館"}
        ],
        "books": [
            {"title": "風の帰る場所", "author": "宮崎駿", "asin": "4167679272", "description": "対談集"}
        ]
    },
    {
        "id": "steve_jobs", "name": "スティーブ・ジョブズ", "nameEn": "Steve Jobs",
        "birth": 1955, "death": 2011, "country": "アメリカ", "field": "起業家",
        "summary": "Apple を創業、自社から追放されながらも再起しiPod・iPhone で世界を変えた。56歳で膵臓癌で死去するまで、シンプルさと美への執着を貫いた。",
        "events": [
            {"year": 1955, "age": 0, "title": "カリフォルニアで未婚の母に誕生、すぐに養子に", "detail": "生みの親はシリア系学生と米国人。養父母は労働者階級。", "tags": ["parent_conflict"]},
            {"year": 1973, "age": 18, "title": "リード大学退学、カリグラフィー受講", "detail": "正規カリキュラムを捨て好きな授業だけ受けた。このカリグラフィーが後のMacフォントに。", "tags": ["restart"]},
            {"year": 1976, "age": 21, "title": "アップル創業、自宅ガレージで", "detail": "スティーブ・ウォズニアックと共にApple I発売。", "tags": ["breakthrough"]},
            {"year": 1984, "age": 29, "title": "Macintosh発表", "detail": "スーパーボウル中のCM『1984』と共に世界を震撼。", "tags": ["breakthrough"]},
            {"year": 1985, "age": 30, "title": "アップルから追放", "detail": "CEOジョン・スカリーに負けた。『とても公的で痛い失敗』。", "tags": ["pride_broken"]},
            {"year": 1986, "age": 31, "title": "ピクサー買収", "detail": "ジョージ・ルーカスから1000万ドルで。後の『トイ・ストーリー』の礎。", "tags": ["restart"]},
            {"year": 1997, "age": 42, "title": "アップル復帰、CEO就任", "detail": "倒産寸前だった会社を救うため。『iThink different』キャンペーン。", "tags": ["restart", "breakthrough"]},
            {"year": 2001, "age": 46, "title": "iPod発表", "detail": "『1000曲をポケットに』音楽の消費を一変させた。", "tags": ["breakthrough"]},
            {"year": 2003, "age": 48, "title": "膵臓癌と診断", "detail": "9ヶ月間、手術を拒み代替療法に。取返しのつかない決断と後に認めた。", "tags": ["illness", "pride_broken"]},
            {"year": 2005, "age": 50, "title": "スタンフォード大学卒業式演説", "detail": "『Stay hungry, stay foolish』の有名な演説。", "tags": ["breakthrough"]},
            {"year": 2007, "age": 52, "title": "iPhone発表", "detail": "電話・音楽・インターネットを1台に。現代生活を一変。", "tags": ["breakthrough"]},
            {"year": 2011, "age": 56, "title": "自宅で死去", "detail": "家族に囲まれ『Oh wow. Oh wow. Oh wow.』と呟き息を引き取った。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "Stay hungry, stay foolish.", "source": "スタンフォード演説 2005"},
            {"text": "今日が人生最後の日だとしたら、今日やろうとしていることを本当にやりたいだろうか？", "source": "スタンフォード演説"},
            {"text": "デザインとは、どう見えるかどう感じるかだけではない。どう機能するかだ。", "source": "ニューヨーク・タイムズ"},
            {"text": "品質より量を重視する人がいる。私たちは品質だけを重視する。", "source": "書簡"},
            {"text": "点と点は、振り返ってみて初めてつながる。", "source": "スタンフォード演説"}
        ],
        "relations": [
            {"name": "スティーブ・ウォズニアック", "relation": "共同創業者", "note": "Apple の技術の心"},
            {"name": "ジョナサン・アイブ", "relation": "デザイン長官", "note": "iMac/iPod/iPhone のデザイナー"}
        ],
        "places": [
            {"name": "Apple Park", "location": "米カリフォルニア州クパチーノ", "note": "ジョブズが最後に設計を見届けた本社"}
        ],
        "books": [
            {"title": "スティーブ・ジョブズ", "author": "ウォルター・アイザックソン", "asin": "4062171252", "description": "公認伝記"}
        ]
    },
    {
        "id": "marie_antoinette", "name": "マリー・アントワネット", "nameEn": "Marie Antoinette",
        "birth": 1755, "death": 1793, "country": "オーストリア→フランス", "field": "王妃",
        "summary": "ハプスブルクの末娘、14歳でフランスに嫁ぎ王妃に。『パンがなければお菓子を食べればいい』（実際は言っていない）の悪名と共に37歳でギロチンに散った時代の象徴。",
        "events": [
            {"year": 1755, "age": 0, "title": "ウィーン・シェーンブルン宮殿で誕生", "detail": "神聖ローマ皇后マリア・テレジアの15番目の子。同日にリスボン大地震。", "tags": []},
            {"year": 1770, "age": 14, "title": "フランス皇太子ルイと政略結婚", "detail": "7年戦争後の同盟のため。新婚初夜は気まずく、結婚は7年間完成しなかった。", "tags": ["heartbreak", "restart"]},
            {"year": 1774, "age": 18, "title": "ルイ16世即位、フランス王妃に", "detail": "19歳の王と18歳の王妃。政治経験ゼロ。", "tags": ["approval"]},
            {"year": 1778, "age": 22, "title": "長女マリー・テレーズ誕生、結婚8年目", "detail": "義兄ヨーゼフ2世の調停で夫婦仲改善。", "tags": ["turning_encounter"]},
            {"year": 1785, "age": 29, "title": "首飾り事件、無実ながら評判失墜", "detail": "偽造された書簡で詐欺に利用され、民衆は王妃が浪費家と確信した。", "tags": ["pride_broken"]},
            {"year": 1789, "age": 33, "title": "フランス革命勃発", "detail": "7月14日のバスチーユ襲撃。秋にヴェルサイユから強制連行、パリへ。", "tags": ["pride_broken", "restart"]},
            {"year": 1791, "age": 35, "title": "ヴァレンヌ逃亡事件", "detail": "家族でオーストリアへ亡命を試みるが国境手前で捕らえられる。", "tags": ["pride_broken"]},
            {"year": 1793, "age": 37, "title": "夫ルイ16世処刑", "detail": "1月21日。マリーは独房で8ヶ月耐える。", "tags": ["loss"]},
            {"year": 1793, "age": 37, "title": "10月16日、ギロチンで処刑", "detail": "死刑執行人の足を踏み『失礼。わざとではありません』と最期の言葉。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "許します、私を死に追いやった者たちを。", "source": "遺書"},
            {"text": "失礼。わざとではありません。", "source": "ギロチンの足下で執行人の足を踏み"},
            {"text": "私は王妃であり、人質ではない。", "source": "逃亡捕縛時"}
        ],
        "relations": [
            {"name": "ルイ16世", "relation": "夫", "note": "気弱な名君で、共に断頭台へ"},
            {"name": "アクセル・フォン・フェルセン", "relation": "生涯の愛人", "note": "スウェーデン伯爵。逃亡計画を立てた"}
        ],
        "places": [
            {"name": "ヴェルサイユ宮殿", "location": "フランス・ヴェルサイユ", "note": "王妃時代の栄華"},
            {"name": "プチ・トリアノン", "location": "ヴェルサイユ内", "note": "マリーが自由を求めた田舎風離宮"},
            {"name": "コンシェルジュリー", "location": "パリ", "note": "処刑前の牢獄、いまも独房が残る"}
        ],
        "books": [
            {"title": "マリー・アントワネット", "author": "ツヴァイク", "asin": "4047931977", "description": "名作伝記"}
        ]
    },
    {
        "id": "cleopatra", "name": "クレオパトラ", "nameEn": "Cleopatra VII",
        "birth": -69, "death": -30, "country": "プトレマイオス朝エジプト", "field": "女王",
        "summary": "プトレマイオス朝最後の女王。カエサル、アントニウスという2人のローマ最強の男と愛と政治を絡ませ、エジプトを守ろうとした才女。9ヶ国語を操り、毒蛇で39歳の生涯を閉じた。",
        "events": [
            {"year": -69, "age": 0, "title": "アレクサンドリア王家に誕生", "detail": "プトレマイオス12世の娘。ギリシャ系王家だが初めてエジプト語を話した女王。", "tags": []},
            {"year": -51, "age": 18, "title": "弟プトレマイオス13世と共同統治開始", "detail": "父の遺言で兄妹婚。すぐに権力闘争に。", "tags": ["restart"]},
            {"year": -48, "age": 21, "title": "カエサルとの出会い", "detail": "絨毯に巻かれて密会。52歳のローマ独裁官との恋と政治協定。", "tags": ["turning_encounter"]},
            {"year": -47, "age": 22, "title": "息子カエサリオン誕生", "detail": "カエサルとの息子と公表。ローマとエジプトの架け橋。", "tags": []},
            {"year": -44, "age": 25, "title": "カエサル暗殺", "detail": "ローマで目撃、直ちにエジプトへ帰還。", "tags": ["loss"]},
            {"year": -41, "age": 28, "title": "タルソスでアントニウスと会見", "detail": "黄金の船・愛の女神の装束でアントニウスを魅了。", "tags": ["turning_encounter"]},
            {"year": -31, "age": 38, "title": "アクティウムの海戦で敗北", "detail": "オクタヴィアヌスに敗れる。", "tags": ["pride_broken"]},
            {"year": -30, "age": 39, "title": "アレクサンドリアで自殺", "detail": "アントニウス自殺の数日後、毒蛇に噛ませたとも毒薬とも。ローマの凱旋に辱められる前に。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私はエジプトそのものだ。", "source": "クレオパトラに帰される言葉"},
            {"text": "男を愛するのは女の戦いである。", "source": "伝承"},
            {"text": "私の唇は絶対に別の者の前には開かない。", "source": "オクタヴィアヌスへの手紙"}
        ],
        "relations": [
            {"name": "ユリウス・カエサル", "relation": "愛人・保護者", "note": "21歳差の愛と政治"},
            {"name": "マルクス・アントニウス", "relation": "愛人・夫", "note": "最期まで共に"},
            {"name": "オクタヴィアヌス（アウグストゥス）", "relation": "最大の敵", "note": "初代ローマ皇帝"}
        ],
        "places": [
            {"name": "アレクサンドリア", "location": "エジプト", "note": "王都。灯台・図書館の都"}
        ],
        "books": []
    }
]


def main():
    if not PEOPLE.exists():
        PEOPLE.mkdir(parents=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
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
    print(f"\n{added}人追加。合計{len(ids)}人")


if __name__ == "__main__":
    main()
