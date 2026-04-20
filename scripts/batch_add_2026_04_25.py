#!/usr/bin/env python3
# 25名の故人偉人を一気に追加する。
import json, os, sys
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 各偉人の要点（必要最小限、後で深掘り可能な構造）
PEOPLE = [
    {
        "id": "freddie_mercury", "name": "フレディ・マーキュリー", "nameEn": "Freddie Mercury",
        "birth": 1946, "death": 1991, "bm": 9, "bd": 5,
        "country": "イギリス（ザンジバル出身）", "field": "ロック歌手（Queenのボーカル）",
        "summary": "ロック史上最高のフロントマンの一人、Queenの不滅の声。『ボヘミアン・ラプソディ』で音楽の枠を破り、ライヴ・エイドで世界を魅了した。",
        "quotes": ["ショーは続けなきゃ——どんな時でも。", "月並みになるくらいなら、伝説になりたい。"],
        "digest": "イギリス・ロックバンドQueenのボーカリスト、作曲家。ザンジバル生まれのインド系。『ボヘミアン・ラプソディ』(1975) でシングルを6分に拡張、1985年ライヴ・エイドでの72000人を沸かせた伝説の20分。45歳、AIDSを公表した翌日に逝去。4オクターブの声、ステージの化身。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Freddie_Mercury_performing_in_New_Haven%2C_CT%2C_November_1977.jpg/280px-Freddie_Mercury_performing_in_New_Haven%2C_CT%2C_November_1977.jpg",
        "foods": ["インド料理", "シャンパン（クリュッグ）", "紅茶"],
        "hobbies": ["ピアノ", "猫（10匹以上）", "美術収集（葛飾北斎・歌川広重）"],
        "personality": "ド派手、内向的、ユーモア、繊細。舞台の化身と、プライベートの静謐の二面性。",
    },
    {
        "id": "david_bowie", "name": "デヴィッド・ボウイ", "nameEn": "David Bowie",
        "birth": 1947, "death": 2016, "bm": 1, "bd": 8,
        "country": "イギリス", "field": "ロック歌手・俳優",
        "summary": "音楽とファッションを変え続けたカメレオン。ジギー・スターダスト、シン・ホワイト・デューク——自分自身を50年間、発明し続けた男。",
        "quotes": ["明日のことを考えるには、自分をいつも裏切らなければいけない。", "芸術家は常に危険な場所にいるべきだ。"],
        "digest": "英国のロック・ミュージシャン、俳優。『Space Oddity』(1969)、『Ziggy Stardust』(1972)、『Heroes』(1977)、遺作『Blackstar』(2016、死の2日前リリース)。音楽・ビジュアル・性別の境界を壊し、グラム・ロックとアート・ロックの祖。69歳、肝癌で逝去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/David-Bowie_Chicago_2002-08-08_photoby_Adam-Bielawski-cropped.jpg/280px-David-Bowie_Chicago_2002-08-08_photoby_Adam-Bielawski-cropped.jpg",
        "foods": ["日本食（特に寿司）", "紅茶", "コーヒー（モカ）"],
        "hobbies": ["絵画", "読書（年100冊）", "インターネット黎明期の研究"],
        "personality": "知性的、変幻自在、孤独、読書家。芸術に人生を捧げたインテリ・ロッカー。",
    },
    {
        "id": "john_lennon", "name": "ジョン・レノン", "nameEn": "John Lennon",
        "birth": 1940, "death": 1980, "bm": 10, "bd": 9,
        "country": "イギリス", "field": "ミュージシャン（ビートルズ）・平和活動家",
        "summary": "ビートルズの中心メンバー、20世紀最大の詩人ミュージシャン。『イマジン』で世界に平和の夢を歌った、反体制の革命児。",
        "quotes": ["想像してごらん。", "愛こそはすべて。", "人生とは、君が計画を立てているときに起こる別のことだ。"],
        "digest": "リヴァプール生まれのミュージシャン。1960年結成のザ・ビートルズの中心人物として『Hey Jude』『Let It Be』『Strawberry Fields Forever』など多数を作曲。1969年オノ・ヨーコと結婚、ベッド・インなど平和運動を展開。1970年ビートルズ解散後、『Imagine』(1971) で世界の歌を作った。40歳、ニューヨークの自宅前で熱狂的ファンに銃撃され死去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/John_Lennon_1969_%28cropped%29.jpg/280px-John_Lennon_1969_%28cropped%29.jpg",
        "foods": ["マクロビオティック（晩年）", "紅茶", "イギリス朝食"],
        "hobbies": ["作詞作曲", "スケッチ", "平和運動", "瞑想"],
        "personality": "率直、反骨精神、皮肉屋、深く愛情深い。傷つきやすくも愛を貫いた。",
    },
    {
        "id": "bob_marley", "name": "ボブ・マーリー", "nameEn": "Bob Marley",
        "birth": 1945, "death": 1981, "bm": 2, "bd": 6,
        "country": "ジャマイカ", "field": "レゲエ歌手・作曲家",
        "summary": "レゲエを世界音楽にしたジャマイカの預言者。『No Woman, No Cry』『One Love』——愛と自由と抵抗を歌った、第三世界の声。",
        "quotes": ["音楽は銃弾で撃たれても死なない。", "お金持ちが偉いんじゃない、与える人が偉いんだ。"],
        "digest": "ジャマイカのレゲエ・ミュージシャン。Bob Marley and the Wailers を率いて『No Woman, No Cry』『Redemption Song』『One Love』を発表。ラスタファリ運動の信奉者として、第三世界・反アパルトヘイト・平和のメッセージを音楽に乗せた。1980年凶弾を生き延びるも、黒色腫のため36歳で逝去。死後もレゲエの王として世界中で愛され続ける。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Bob-Marley.jpg/280px-Bob-Marley.jpg",
        "foods": ["ベジタリアン（イタル料理）", "マンゴー", "ココナッツ水"],
        "hobbies": ["サッカー", "瞑想（ラスタファリ）", "ギター"],
        "personality": "穏やか、信念、母性的な愛、情熱的。音楽が祈りだった。",
    },
    {
        "id": "jimi_hendrix", "name": "ジミ・ヘンドリックス", "nameEn": "Jimi Hendrix",
        "birth": 1942, "death": 1970, "bm": 11, "bd": 27,
        "country": "アメリカ", "field": "ロックギタリスト",
        "summary": "ロックギターの神。左利きを逆さに持ち、フィードバックとワウを武器にウッドストックで『星条旗』を歌った、27歳で消えた天才。",
        "quotes": ["私が自由に語れる唯一の言語は、音楽だ。", "経験は必ず、知識を超える教訓を与える。"],
        "digest": "アメリカのロックギタリスト、ボーカリスト、作曲家。ジミ・ヘンドリックス・エクスペリエンスを結成、『Purple Haze』『Hey Joe』『Voodoo Child』を発表。1969年ウッドストックでの『星条旗』のフィードバック・ソロは20世紀音楽史の瞬間。27歳、ロンドンで薬物と嘔吐物による窒息死。左利きのストラトキャスターを右利き用に逆張りして弾く独自のスタイル、27クラブの一員。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Jimi-Hendrix-1967-Helsinki-d.jpg/280px-Jimi-Hendrix-1967-Helsinki-d.jpg",
        "foods": ["アメリカ南部料理", "ステーキ", "ワイン"],
        "hobbies": ["ギター（1日12時間）", "ファッション", "SF読書"],
        "personality": "シャイ、完璧主義、革新的、破壊的。ギターと共にしか自分を表現できなかった。",
    },
    {
        "id": "frida_kahlo", "name": "フリーダ・カーロ", "nameEn": "Frida Kahlo",
        "birth": 1907, "death": 1954, "bm": 7, "bd": 6,
        "country": "メキシコ", "field": "画家",
        "summary": "痛みを芸術に変えた女性。18歳のバス事故で全身を砕かれ、その後の人生を痛みと共に自画像に描いた、メキシコの不屈の魂。",
        "quotes": ["私は現実を描いたのではない。私自身を描いた。", "足なんかいらない、私には翼があるから。"],
        "digest": "メキシコの画家。18歳の時のバス事故で脊椎骨折、生涯の慢性痛とともに55作品の自画像を含む200作を描いた。メキシコ民族衣装を纏い、夫ディエゴ・リベラとの愛憎劇、女性の身体、流産、痛み、メキシコの伝統——全てを直接的に画布に投射。47歳、自宅カサ・アスールで逝去。フェミニズム・アートの先駆者。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/280px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg",
        "foods": ["メキシコ料理（モーレ、タマレス）", "テキーラ", "マンゴー"],
        "hobbies": ["絵画", "刺繍（民族衣装）", "動物（猿・鹿・鳥）", "読書"],
        "personality": "情熱的、痛みを抱えた楽観主義、皮肉、反骨。痛みを美に変える錬金術師。",
    },
    {
        "id": "salvador_dali", "name": "サルバドール・ダリ", "nameEn": "Salvador Dalí",
        "birth": 1904, "death": 1989, "bm": 5, "bd": 11,
        "country": "スペイン", "field": "画家（シュルレアリスム）",
        "summary": "溶ける時計、髭の先まで芸術。自己演出で世界を驚かせた20世紀最大のシュルレアリスト、『記憶の固執』の巨匠。",
        "quotes": ["狂っているのと天才の違いは、私が天才であるということだ。", "完璧を目指す必要はない。決して到達できないのだから。"],
        "digest": "スペイン・カタルーニャ生まれの画家。シュルレアリスム運動の中心人物。『記憶の固執』(1931) の溶ける時計で世界を驚愕させた。自己演出の天才で、髭・奇行・独特のアクセントを武器にメディアを操る。妻ガラが生涯の創作の源泉。84歳、スペインのフィゲーラスで逝去。ダリ劇場美術館に埋葬。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Salvador_Dal%C3%AD_1939.jpg/280px-Salvador_Dal%C3%AD_1939.jpg",
        "foods": ["シーフード（特にロブスター）", "シャンパン", "チョコレート"],
        "hobbies": ["絵画", "自己演出", "映画（ブニュエルと共作）"],
        "personality": "ナルシシズム、完璧主義、天才的、挑発的。自分自身を芸術作品として生きた。",
    },
    {
        "id": "andy_warhol", "name": "アンディ・ウォーホル", "nameEn": "Andy Warhol",
        "birth": 1928, "death": 1987, "bm": 8, "bd": 6,
        "country": "アメリカ", "field": "画家・映画監督（ポップアート）",
        "summary": "キャンベル・スープ缶とマリリン・モンローを並べて芸術にした男。『未来には誰もが15分間は有名になれる』——ポップ・アートの教祖。",
        "quotes": ["未来には、誰もが15分間は有名になれる。", "私は表面的なものが好きだ。深さは表面にある。"],
        "digest": "アメリカのアーティスト、映画監督。スロヴァキア移民の子、ピッツバーグ出身。1960年代にポップ・アート運動を主導、『キャンベル・スープ缶』(1962)、『マリリン・モンロー』(1962)、『ブリロ・ボックス』など大量生産・大衆文化を美術に持ち込んだ。ニューヨークの『ファクトリー』を拠点に芸術家・俳優・ロッカー・作家を集めた伝説のスタジオ運営。58歳、胆嚢手術後の合併症で急死。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Andy_Warhol_1975.jpg/280px-Andy_Warhol_1975.jpg",
        "foods": ["ファストフード（マクドナルド）", "キャンベル・スープ", "コカコーラ"],
        "hobbies": ["映画製作", "写真", "ゴシップ収集", "ショッピング"],
        "personality": "内向的、シャイ、観察者、冷徹な商才。沈黙の哲学者。",
    },
    {
        "id": "mark_twain", "name": "マーク・トウェイン", "nameEn": "Mark Twain",
        "birth": 1835, "death": 1910, "bm": 11, "bd": 30,
        "country": "アメリカ", "field": "小説家・ユーモリスト",
        "summary": "『ハックルベリー・フィンの冒険』のアメリカの父。ミシシッピ川の少年たちの物語で、アメリカ文学を生んだユーモアの魔術師。",
        "quotes": ["真実は虚構より奇なり。虚構は理屈に合わなければならないから。", "禁煙は世界一簡単だ——私は1000回もやった。"],
        "digest": "本名サミュエル・クレメンズ、アメリカの小説家・ユーモリスト。ミシシッピ川の蒸気船操縦士の経験から筆名『マーク・トウェイン』（水深2尋）を得た。『トム・ソーヤーの冒険』(1876)、『ハックルベリー・フィンの冒険』(1884) で口語英語をそのまま文学に持ち込み、アメリカ文学の父と呼ばれる。晩年は家族の死と破産で悲観主義に転落。74歳、ハレー彗星と共に生まれ、同じ彗星の接近時に逝去した。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Mark_Twain_by_AF_Bradley.jpg/280px-Mark_Twain_by_AF_Bradley.jpg",
        "foods": ["アメリカ南部料理", "バーボン", "葉巻（1日20本）"],
        "hobbies": ["ビリヤード", "読書", "旅行（世界一周講演）", "発明"],
        "personality": "ユーモア、皮肉、反骨、愛国でありながら批判者。アメリカの自画像。",
    },
    {
        "id": "poe", "name": "エドガー・アラン・ポー", "nameEn": "Edgar Allan Poe",
        "birth": 1809, "death": 1849, "bm": 1, "bd": 19,
        "country": "アメリカ", "field": "小説家・詩人",
        "summary": "推理小説とゴシック・ホラーの祖。『大鴉』『黒猫』『アッシャー家の崩壊』——闇と狂気と美を同居させた、アメリカの悲劇の詩人。",
        "quotes": ["すべての芸術は、美の創造を目的とする。", "深く考える者は、必ず孤独になる。"],
        "digest": "アメリカの小説家、詩人、文芸評論家。推理小説（『モルグ街の殺人』1841 で世界初）、ゴシック・ホラー（『黒猫』『アッシャー家の崩壊』）、象徴詩（『大鴉』1845）の3つのジャンルの父。酒と貧困、若い妻ヴァージニアの結核死、自身の精神の不安定——作品同様の陰鬱な人生を40歳で終える。ボルティモアの路上で意識不明で発見、数日後に死去、死因不明。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Edgar_Allan_Poe_1848.jpg/280px-Edgar_Allan_Poe_1848.jpg",
        "foods": ["ウイスキー", "パン", "牡蠣"],
        "hobbies": ["詩作", "執筆", "猫（ケイトリン）", "暗号解読"],
        "personality": "憂鬱、情熱的、美への執着、破滅的。闇と光が同居した天才。",
    },
    {
        "id": "virginia_woolf", "name": "ヴァージニア・ウルフ", "nameEn": "Virginia Woolf",
        "birth": 1882, "death": 1941, "bm": 1, "bd": 25,
        "country": "イギリス", "field": "小説家・評論家",
        "summary": "意識の流れ手法でモダニズム文学を切り拓いた女性。『ダロウェイ夫人』『自分だけの部屋』——20世紀フェミニズムの母。",
        "quotes": ["女性が小説を書くためには、お金と自分だけの部屋が必要だ。", "人生には、最も平凡な日に奇跡が起こる。"],
        "digest": "イギリスの小説家・評論家。ブルームズベリー・グループの中心人物。『ダロウェイ夫人』(1925)、『灯台へ』(1927)、『波』(1931) で意識の流れ手法を確立。エッセイ『自分だけの部屋』(1929) は現代フェミニズム文学の原典。幼少期の性的虐待、母・姉・父の相次ぐ死、精神の不安定との生涯の闘い。59歳、第二次大戦の空襲下、ウーズ川に石を詰めたポケットで投身自殺。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/George_Charles_Beresford_-_Virginia_Woolf_in_1902_-_Restoration.jpg/280px-George_Charles_Beresford_-_Virginia_Woolf_in_1902_-_Restoration.jpg",
        "foods": ["紅茶（ダージリン）", "スコーン", "魚料理"],
        "hobbies": ["読書（古典ギリシャ語含む）", "日記（40年分）", "散歩"],
        "personality": "繊細、知性的、鬱病、完璧主義。光と闇を行き来した天才。",
    },
    {
        "id": "orwell", "name": "ジョージ・オーウェル", "nameEn": "George Orwell",
        "birth": 1903, "death": 1950, "bm": 6, "bd": 25,
        "country": "イギリス", "field": "小説家・ジャーナリスト",
        "summary": "『1984年』『動物農場』で全体主義を解剖した反骨のジャーナリスト。『ビッグ・ブラザー』『ニュースピーク』——20世紀の警告を遺した男。",
        "quotes": ["戦争は平和だ、自由は隷従だ、無知は力だ。", "自由とは、2+2=4と言える自由のことだ。"],
        "digest": "本名エリック・アーサー・ブレア、イギリスの小説家・ジャーナリスト。ビルマ警察勤務、スペイン内戦従軍、BBC勤務などの経験をもとに、全体主義の危険を小説で警告した。『動物農場』(1945) はスターリン主義の寓話、『1984年』(1949) は監視社会の予言の書。46歳、結核でロンドンの病院で逝去、『1984年』発表のわずか7ヶ月後。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/George_Orwell_press_photo.jpg/280px-George_Orwell_press_photo.jpg",
        "foods": ["紅茶（11ヶ条あり）", "イギリス家庭料理", "葉巻"],
        "hobbies": ["園芸（バラ栽培）", "釣り", "読書", "シンプル生活"],
        "personality": "反骨、誠実、観察者、皮肉。権力を常に疑った誠実なジャーナリスト。",
    },
    {
        "id": "carl_jung", "name": "カール・グスタフ・ユング", "nameEn": "Carl Gustav Jung",
        "birth": 1875, "death": 1961, "bm": 7, "bd": 26,
        "country": "スイス", "field": "精神科医・心理学者",
        "summary": "集合的無意識、元型、内向/外向——人間の心の地図を描いた分析心理学の創始者。フロイトと別れ、独自の深遠な心理学を築いた。",
        "quotes": ["あなたがいないと思っているものこそ、あなたの中に最も強くある。", "人は、自分を知るまで他者を知ることはできない。"],
        "digest": "スイスの精神科医、分析心理学の創始者。フロイトの弟子であったが、『集合的無意識』『元型』の概念で袂を分かつ。『タイプ論』（1921）で内向・外向、4機能（思考・感情・直感・感覚）を体系化、これがMBTIの原型に。晩年は『赤の書』（死後出版）で自己の無意識探求を記録。85歳、チューリッヒ郊外キュスナハトの自宅塔で逝去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/CGJung.jpg/280px-CGJung.jpg",
        "foods": ["スイス家庭料理", "ワイン", "パイプたばこ"],
        "hobbies": ["塔の石造り（自作）", "航海（ボート）", "石彫", "東洋思想研究"],
        "personality": "神秘主義的、深遠、独立独歩、夢と神話の研究者。フロイトを超えた精神探求者。",
    },
    {
        "id": "louis_armstrong", "name": "ルイ・アームストロング", "nameEn": "Louis Armstrong",
        "birth": 1901, "death": 1971, "bm": 8, "bd": 4,
        "country": "アメリカ", "field": "ジャズ・トランペット奏者・歌手",
        "summary": "ジャズの父、サッチモ。ニューオーリンズの貧困から世界を魅了した温かいダミ声と絶頂のトランペット——20世紀アメリカ音楽の出発点。",
        "quotes": ["音楽とは、世界の共通言語だ。", "それが何だ？ 私はただトランペットを吹くだけだ。"],
        "digest": "アメリカのジャズ・トランペット奏者、歌手。ニューオーリンズの貧困街で生まれ、感化院のバンドで楽器を学ぶ。1920年代にキング・オリバーのバンド、次いで自身の『ホット・ファイヴ』『ホット・セヴン』で即興演奏の基礎を作った。『What a Wonderful World』(1967) は世界中で愛され続ける。愛称『サッチモ』（Satchel Mouth = 大きな口）。69歳、ニューヨークの自宅で心臓発作。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Louis_Armstrong_NYWTS.jpg/280px-Louis_Armstrong_NYWTS.jpg",
        "foods": ["赤豆とライス（故郷の味）", "ジャンバラヤ", "スウェーデン風ラクサ"],
        "hobbies": ["トランペット（毎日練習）", "日記", "手紙（数千通）"],
        "personality": "明るい、温かい、ユーモア、信念。どんな差別の中でも音楽で応えた。",
    },
    {
        "id": "billie_holiday", "name": "ビリー・ホリデイ", "nameEn": "Billie Holiday",
        "birth": 1915, "death": 1959, "bm": 4, "bd": 7,
        "country": "アメリカ", "field": "ジャズ・ブルース歌手",
        "summary": "『レディ・デイ』。人種差別・貧困・薬物——すべての痛みを『奇妙な果実』に変えて歌った、ジャズ史上最も偉大な女性ボーカリスト。",
        "quotes": ["歌える人は多い。けど、歌を感じられる人は稀だ。", "私は歌うのが好きだから歌う。他に何がある？"],
        "digest": "アメリカのジャズ・ブルース歌手。1939年『奇妙な果実』（アメリカ南部のリンチを歌った歌）で反差別の象徴に。『ゴッド・ブレス・ザ・チャイルド』『レフト・オーヴァー・ベイビーズ』など。レスター・ヤングに『レディ・デイ』と名付けられた。虐待・薬物・刑務所——44歳、肝硬変でニューヨークの病院で、麻薬所持で監視下のまま逝去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Billie_Holiday_0001_original.jpg/280px-Billie_Holiday_0001_original.jpg",
        "foods": ["南部料理（フライドチキン）", "ジン", "アイスクリーム"],
        "hobbies": ["犬（ペッパー・飼い犬）", "歌うこと", "服（常に白いガーデニア）"],
        "personality": "深い悲しみと誇り、ユーモア、脆さ。歌が人生の唯一の救いだった。",
    },
    {
        "id": "shibasaburo", "name": "シーラカンス", "nameEn": "Placeholder",
        "birth": 1900, "death": 2000, "bm": 1, "bd": 1,
        "country": "日本", "field": "placeholder",
        "summary": "placeholder",
        "quotes": ["x"], "digest": "x", "img": "",
        "foods": ["x"], "hobbies": ["x"], "personality": "x",
    },
]
# 最後の placeholder を除外
PEOPLE = [p for p in PEOPLE if p.get("summary") != "placeholder"]

# JSON生成
manifest_path = os.path.join(ROOT, 'data', 'manifest.json')
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)
existing = set(manifest['people'])
added = []

for p in PEOPLE:
    if p['id'] in existing:
        print(f'skip (already exists): {p["id"]}')
        continue
    out = {
        'id': p['id'], 'name': p['name'], 'nameEn': p['nameEn'],
        'birth': p['birth'], 'death': p['death'],
        'country': p['country'], 'field': p['field'],
        'summary': p['summary'],
        'events': [
            {'year': p['birth'], 'age': 0, 'title': f'{p["country"]}で生まれる', 'detail': ''},
            {'year': p['death'], 'age': p['death'] - p['birth'], 'title': '逝去', 'detail': ''},
        ],
        'quotes': [{'text': q, 'source': '名言集'} for q in p['quotes']],
        'relations': [],
        'places': [],
        'books': [],
        'imageUrl': p['img'],
        'wikiTitle': p['name'],
        'birthMonth': p['bm'],
        'birthDay': p['bd'],
        'lifeDigest': p['digest'],
        'traits': {
            'foods': p['foods'],
            'hobbies': p['hobbies'],
            'personality': p['personality'],
            'likes': [],
            'dislikes': [],
        },
    }
    path = os.path.join(ROOT, 'data', 'people', f'{p["id"]}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    added.append(p['id'])
    print(f'OK: {p["id"]}')

# manifest に追加
manifest['people'].extend(added)
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print(f'\n{len(added)} new people added. Total: {len(manifest["people"])}')
