"""Add 10 more 偉人. Non-destructive. All image URLs verified via Wikipedia."""
import json, os, sys, io, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.path.join(os.path.dirname(__file__), '..')
PEOPLE_DIR = os.path.join(BASE, 'data', 'people')
MANIFEST = os.path.join(BASE, 'data', 'manifest.json')

NEW = {}

def add(pid, data):
    data['id'] = pid
    NEW[pid] = data

add('goethe', {
    "name": "ヨハン・ヴォルフガング・フォン・ゲーテ", "nameEn": "Johann Wolfgang von Goethe",
    "birth": 1749, "death": 1832, "country": "ドイツ", "field": "詩人・作家・科学者・政治家",
    "summary": "『ファウスト』『若きウェルテルの悩み』の大詩人。ドイツ古典主義文学の最高峰にして博物学者でもあった巨人。",
    "events": [
        {"year": 1749, "age": 0, "title": "フランクフルトの富裕な法律家の家に生まれる", "detail": "", "tags": []},
        {"year": 1774, "age": 25, "title": "『若きウェルテルの悩み』刊行、全欧で大ブーム", "detail": "自殺が流行するほどの熱狂。ナポレオンも愛読。", "tags": ["breakthrough", "creation"]},
        {"year": 1775, "age": 26, "title": "ワイマール公国宮廷に招かれる", "detail": "公爵カール・アウグストの親友・顧問となり、以後生涯ワイマールを拠点に。", "tags": ["turning_encounter", "restart"]},
        {"year": 1786, "age": 37, "title": "イタリア旅行（〜1788）", "detail": "古代ローマ芸術に圧倒され人生観が一変。", "tags": ["turning_encounter"]},
        {"year": 1808, "age": 59, "title": "『ファウスト 第一部』完成", "detail": "魂を悪魔メフィストフェレスに売る学者の物語。", "tags": ["creation", "breakthrough"]},
        {"year": 1832, "age": 82, "title": "ワイマールで死去。『もっと光を！』と遺言", "detail": "『ファウスト第二部』は死の前年に完成。", "tags": ["loss", "creation"]}
    ],
    "quotes": [
        {"text": "人間は努力するかぎり、迷うものだ。", "source": "『ファウスト』"},
        {"text": "一日を終えれば、その日は終わったのだ。", "source": "ゲーテ箴言"},
        {"text": "時間が欲しければ、時間を作り出しなさい。", "source": "書簡より"},
        {"text": "何事も、できると信じて始めよ。", "source": "ゲーテに帰される言葉"},
        {"text": "もっと光を！", "source": "最期の言葉"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/0/0e/Goethe_%28Stieler_1828%29.jpg",
    "wikiTitle": "ヨハン・ヴォルフガング・フォン・ゲーテ",
    "imageCredit": {"artist": "Joseph Karl Stieler (1828)", "license": "Public domain", "licenseUrl": "", "credit": "Neue Pinakothek, Munich", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Goethe_(Stieler_1828).jpg"},
    "birthMonth": 8, "birthDay": 28, "deathMonth": 3, "deathDay": 22,
    "lifeDigest": "18世紀末から19世紀前半を代表するドイツの詩人・劇作家・小説家・自然科学者・政治家。ワイマール公国の宰相を務めるかたわら、『若きウェルテルの悩み』『ファウスト』『ヴィルヘルム・マイスター』などを執筆し、ドイツ古典主義文学の頂点とされる。色彩論や植物形態学など自然科学にも深く傾倒した万能の知性。",
    "traits": {
        "foods": ["ワイン", "ソーセージ", "フランクフルト料理", "コーヒー"],
        "hobbies": ["植物採集", "スケッチ", "光学実験", "イタリア旅行"],
        "personality": "好奇心旺盛、情熱と理性のバランス。82歳まで創作を続けた情熱家で、73歳で19歳のウルリケに求婚した逸話も。",
        "likes": ["古代ローマ彫刻", "色彩", "自然", "イタリア"],
        "dislikes": ["偏狭な宗教", "感傷過多", "ナポレオンへの盲従（最初は尊敬したが）"]
    }
})

add('shakespeare', {
    "name": "ウィリアム・シェイクスピア", "nameEn": "William Shakespeare",
    "birth": 1564, "death": 1616, "country": "イギリス", "field": "劇作家・詩人",
    "summary": "『ハムレット』『マクベス』『ロミオとジュリエット』——人類文学の頂点とされる英国の劇作家。",
    "events": [
        {"year": 1564, "age": 0, "title": "ストラトフォード・アポン・エイヴォンに生まれる", "detail": "手袋商人の息子。洗礼日4月26日、誕生日は4月23日と推定（聖ゲオルギオスの日）。", "tags": []},
        {"year": 1582, "age": 18, "title": "8歳年上のアン・ハサウェイと結婚", "detail": "3人の子をもうける。", "tags": ["turning_encounter"]},
        {"year": 1594, "age": 30, "title": "ロンドンで劇団『宮内大臣一座』の主要作家に", "detail": "グローブ座の共同経営者。", "tags": ["restart", "breakthrough"]},
        {"year": 1600, "age": 36, "title": "『ハムレット』初演", "detail": "『生きるか、死ぬか——』の独白。", "tags": ["creation", "breakthrough"]},
        {"year": 1606, "age": 42, "title": "『マクベス』『リア王』相次いで発表", "detail": "四大悲劇の中核。", "tags": ["creation"]},
        {"year": 1616, "age": 52, "title": "故郷ストラトフォードで死去", "detail": "墓碑に『我が骨を動かすものは呪われよ』。洗礼日と同じ4月23日に没したとされる。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "生きるべきか、死ぬべきか、それが問題だ。", "source": "『ハムレット』第3幕第1場"},
        {"text": "人生は歩く影にすぎぬ。舞台の上で小一時間わめきちらして消えてゆく下手な役者だ。", "source": "『マクベス』第5幕第5場"},
        {"text": "恋は盲目で、恋人たちは自分の愚行を見ない。", "source": "『ヴェニスの商人』"},
        {"text": "名前ってなんなの？ バラをほかの名で呼んでも、同じように香るはず。", "source": "『ロミオとジュリエット』"},
        {"text": "全世界は舞台、すべての男も女もただの役者に過ぎない。", "source": "『お気に召すまま』"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/2/21/William_Shakespeare_by_John_Taylor%2C_edited.jpg",
    "wikiTitle": "ウィリアム・シェイクスピア",
    "imageCredit": {"artist": "John Taylor (attributed)", "license": "Public domain", "licenseUrl": "", "credit": "National Portrait Gallery, London", "sourceUrl": "https://commons.wikimedia.org/wiki/File:William_Shakespeare_by_John_Taylor,_edited.jpg"},
    "birthMonth": 4, "birthDay": 23, "deathMonth": 4, "deathDay": 23,
    "lifeDigest": "イングランド・ルネサンス演劇を代表する劇作家・詩人。『ハムレット』『マクベス』『リア王』『オセロー』の四大悲劇、『夏の夜の夢』などの喜劇、歴史劇あわせて約37編の戯曲と154のソネットを遺した。英語圏文学の最重要人物とされ、英語そのものの語彙や比喩表現に計り知れない影響を与えた。",
    "traits": {
        "foods": ["エール（ビール）", "マトン", "パン", "チーズ"],
        "hobbies": ["劇作", "俳優としての出演", "ソネット（14行詩）の執筆"],
        "personality": "謎めいた私生活。故郷では裕福な商人として振る舞い、ロンドンでは劇壇の中核。人間のあらゆる感情を見抜く観察眼。",
        "likes": ["演劇", "言葉遊び", "詩"],
        "dislikes": ["清教徒の劇場閉鎖運動", "偽善"]
    }
})

add('oscar_wilde', {
    "name": "オスカー・ワイルド", "nameEn": "Oscar Wilde",
    "birth": 1854, "death": 1900, "country": "アイルランド", "field": "作家・劇作家・詩人",
    "summary": "『サロメ』『ドリアン・グレイの肖像』。機知と美を愛したダンディズムの頂点。同性愛で投獄され、パリで客死。",
    "events": [
        {"year": 1854, "age": 0, "title": "ダブリンの医師の家に生まれる", "detail": "", "tags": []},
        {"year": 1878, "age": 24, "title": "オックスフォード大学で詩『ラヴェンナ』がニューディゲート賞", "detail": "", "tags": ["approval"]},
        {"year": 1890, "age": 36, "title": "『ドリアン・グレイの肖像』刊行", "detail": "肖像画だけが歳を取る耽美小説。『不道徳』と非難を浴びる。", "tags": ["creation", "setback"]},
        {"year": 1895, "age": 40, "title": "『真面目が肝心』ロンドン初演、空前の成功", "detail": "", "tags": ["breakthrough", "approval"]},
        {"year": 1895, "age": 40, "title": "同性愛で起訴、2年の重労働の刑", "detail": "恋人アルフレッド・ダグラス卿の父クィーンズベリー侯爵との訴訟に敗れる。", "tags": ["loss", "setback"]},
        {"year": 1900, "age": 46, "title": "パリの安ホテルで客死", "detail": "『この壁紙と私、どちらかが消えねばならぬ』が最期の言葉。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "誘惑に打ち勝つ唯一の方法は、それに屈することだ。", "source": "『ドリアン・グレイの肖像』"},
        {"text": "私はシンプルな趣味の持ち主だ——最高のもので満足する。", "source": "ワイルドに帰される格言"},
        {"text": "成功には敵が必要だ。", "source": "『ドリアン・グレイの肖像』"},
        {"text": "どぶの中で寝ころんでいても、星を見つめている者もいる。", "source": "『ウィンダミア卿夫人の扇』"},
        {"text": "自分自身でいなさい。他の役はもう埋まっている。", "source": "ワイルドの言葉"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/4/44/Oscar_Wilde_by_Napoleon_Sarony._Three-quarter-length_photograph%2C_seated.jpg",
    "wikiTitle": "オスカー・ワイルド",
    "imageCredit": {"artist": "Napoleon Sarony (1882)", "license": "Public domain", "licenseUrl": "", "credit": "Library of Congress", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Oscar_Wilde_by_Napoleon_Sarony._Three-quarter-length_photograph,_seated.jpg"},
    "birthMonth": 10, "birthDay": 16, "deathMonth": 11, "deathDay": 30,
    "lifeDigest": "アイルランド出身の劇作家・小説家・詩人。『ドリアン・グレイの肖像』や『サロメ』、社会喜劇『真面目が肝心』などで機知に富んだ会話と耽美的世界を描いた。同性愛をめぐる裁判で有罪となり2年間レディング監獄に収監、その体験は『獄中記（De Profundis）』として残された。出獄後はパリに亡命し46歳で客死。",
    "traits": {
        "foods": ["シャンパン", "ランチ重視", "ゴルマン食堂の定食"],
        "hobbies": ["機知に富んだ会話", "流行の先端を行く服装", "社交界"],
        "personality": "才気煥発でダンディズムの権化、機知の即興は相手を選ばない。獄中で自己の深みに至ったが、出獄後は精神も身体も消耗しきっていた。",
        "likes": ["美", "詩", "緑のカーネーション", "機知", "パリ"],
        "dislikes": ["偽善", "凡庸", "ヴィクトリア朝道徳"]
    }
})

add('voltaire', {
    "name": "ヴォルテール", "nameEn": "Voltaire",
    "birth": 1694, "death": 1778, "country": "フランス", "field": "哲学者・作家",
    "summary": "啓蒙思想の象徴。『カンディード』で独断論を一刀両断した風刺の巨匠。『私はあなたの意見に反対だが、あなたがそれを言う権利は命がけで守る』の精神。",
    "events": [
        {"year": 1694, "age": 0, "title": "パリの公証人の家に生まれる", "detail": "本名フランソワ＝マリー・アルエ。", "tags": []},
        {"year": 1717, "age": 22, "title": "風刺詩で告発され、バスティーユに11ヶ月投獄", "detail": "獄中で『ヴォルテール』の筆名を創出。", "tags": ["setback"]},
        {"year": 1726, "age": 31, "title": "イギリス亡命（〜1729）", "detail": "ニュートン、ロックに感化され思想が一変。", "tags": ["turning_encounter"]},
        {"year": 1755, "age": 60, "title": "リスボン大地震に衝撃", "detail": "楽観論（『この世は神が作った最善の世界』）への疑念が深まる。", "tags": ["loss"]},
        {"year": 1759, "age": 64, "title": "『カンディード』刊行", "detail": "ライプニッツの『最善説』を風刺。『我が庭を耕さねばならぬ』で終わる名作。", "tags": ["creation", "breakthrough"]},
        {"year": 1778, "age": 83, "title": "28年ぶりにパリに凱旋、熱狂的歓迎の中で死去", "detail": "教会は埋葬を拒否、甥が遺体を修道院に運び埋葬。", "tags": ["approval", "loss"]}
    ],
    "quotes": [
        {"text": "我が庭を耕さねばならぬ。", "source": "『カンディード』最後の言葉"},
        {"text": "常識は、それほど一般的ではない。", "source": "『哲学辞典』"},
        {"text": "神がいなかったら、発明する必要があるだろう。", "source": "『三人の偽善者』への書簡"},
        {"text": "完璧は善の敵である。", "source": "『哲学辞典』"},
        {"text": "分別とは、言うことを見つけるより、言わぬことを見つけることだ。", "source": "ヴォルテールの手紙"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/f/f2/Atelier_de_Nicolas_de_Largilli%C3%A8re%2C_portrait_de_Voltaire%2C_d%C3%A9tail_%28mus%C3%A9e_Carnavalet%29_-002.jpg",
    "wikiTitle": "ヴォルテール",
    "imageCredit": {"artist": "Atelier de Nicolas de Largillière", "license": "Public domain", "licenseUrl": "", "credit": "Musée Carnavalet, Paris", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Atelier_de_Nicolas_de_Largilli%C3%A8re,_portrait_de_Voltaire,_d%C3%A9tail_(mus%C3%A9e_Carnavalet)_-002.jpg"},
    "birthMonth": 11, "birthDay": 21, "deathMonth": 5, "deathDay": 30,
    "lifeDigest": "フランス啓蒙思想を代表する哲学者・作家・歴史家。本名はフランソワ＝マリー・アルエ。小説『カンディード』、戯曲、詩、歴史書、書簡集など膨大な著作を通じて宗教的狂信・専制政治・不寛容を厳しく批判した。『私はあなたの意見に反対だが、あなたがそれを言う権利は命がけで守る』という言葉は後世の創作だが、彼の精神を象徴する。フランス革命の思想的前駆。",
    "traits": {
        "foods": ["コーヒー（日に40杯とも）", "パン", "フランス料理"],
        "hobbies": ["風刺詩を書く", "膨大な書簡交換", "時計製造（晩年フェルネ）"],
        "personality": "機知・皮肉・論争好き。生涯に20000通を超える手紙を残した。敵が多い一方、ヨーロッパ中の王侯知識人と文通。",
        "likes": ["理性", "寛容", "イギリスの議会制度", "ニュートン物理学"],
        "dislikes": ["狂信", "カトリック教会の権威主義", "偽善", "奴隷制"]
    }
})

add('john_locke', {
    "name": "ジョン・ロック", "nameEn": "John Locke",
    "birth": 1632, "death": 1704, "country": "イギリス", "field": "哲学者",
    "summary": "経験論の父。『人間知性論』で人の心は生まれたときは白紙（タブラ・ラサ）と説き、『統治二論』で自由と所有権を擁護、アメリカ独立宣言・フランス人権宣言の礎となった。",
    "events": [
        {"year": 1632, "age": 0, "title": "サマセット州リントンで生まれる", "detail": "父はピューリタンの弁護士。", "tags": []},
        {"year": 1667, "age": 35, "title": "シャフツベリ伯爵の侍医・秘書に", "detail": "以後政治的パトロンとなる。", "tags": ["turning_encounter"]},
        {"year": 1683, "age": 51, "title": "オランダへ亡命", "detail": "反国王派疑惑で身の危険。", "tags": ["setback"]},
        {"year": 1689, "age": 57, "title": "名誉革命後にイギリス帰国", "detail": "", "tags": ["restart"]},
        {"year": 1689, "age": 57, "title": "『統治二論』刊行", "detail": "社会契約論・抵抗権・所有権の古典。", "tags": ["creation", "breakthrough"]},
        {"year": 1690, "age": 58, "title": "『人間知性論』刊行", "detail": "生得観念を否定、経験論の基礎を確立。", "tags": ["creation", "breakthrough"]},
        {"year": 1704, "age": 72, "title": "エセックスの友人宅で死去", "detail": "", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "心は生まれたときは、何も書かれていない白い紙のようなものだ。", "source": "『人間知性論』第2巻"},
        {"text": "人は、何ぴとにもその生命、健康、自由、所有物を害する権利を持たない。", "source": "『統治二論』"},
        {"text": "新しい意見は常に疑われ、しばしば反対される。それは共通のものではないという理由だけで。", "source": "『人間知性論』序"},
        {"text": "読書は単に知識を供給するに過ぎない。それを自分のものにするのは思考である。", "source": "ロックの随筆"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/d/db/Godfrey_Kneller_-_Portrait_of_John_Locke_%28Hermitage%29.jpg",
    "wikiTitle": "ジョン・ロック",
    "imageCredit": {"artist": "Godfrey Kneller (1697)", "license": "Public domain", "licenseUrl": "", "credit": "Hermitage Museum", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Godfrey_Kneller_-_Portrait_of_John_Locke_(Hermitage).jpg"},
    "birthMonth": 8, "birthDay": 29, "deathMonth": 10, "deathDay": 28,
    "lifeDigest": "イギリスの哲学者、『イギリス経験論の父』。『人間知性論』で人間の知識はすべて経験から得られると主張し、生得観念を否定した。『統治二論』では自然権としての生命・自由・所有権を説き、抵抗権を擁護。その政治思想はアメリカ独立宣言、フランス人権宣言、立憲民主主義の思想的基礎となった。",
    "traits": {
        "foods": ["紅茶", "質素な朝食", "野菜中心の食事"],
        "hobbies": ["植物学", "医学", "庭園設計"],
        "personality": "穏やかで慎重、生涯独身。友人ニュートンとは親交があり、晩年は隠棲して著述に専念。",
        "likes": ["経験・観察", "寛容", "立憲君主制", "庭"],
        "dislikes": ["生得観念", "絶対王政", "宗教的不寛容"]
    }
})

add('rembrandt', {
    "name": "レンブラント・ファン・レイン", "nameEn": "Rembrandt van Rijn",
    "birth": 1606, "death": 1669, "country": "オランダ", "field": "画家・版画家",
    "summary": "オランダ黄金時代の巨匠。光と影で魂を描いた『夜警』『テュルプ博士の解剖学講義』。約80点に及ぶ自画像で己の人生を描き尽くした。",
    "events": [
        {"year": 1606, "age": 0, "title": "レイデンの製粉業者の家に生まれる", "detail": "", "tags": []},
        {"year": 1631, "age": 25, "title": "アムステルダムに移住、肖像画家として成功", "detail": "", "tags": ["restart", "breakthrough"]},
        {"year": 1634, "age": 28, "title": "サスキアと結婚", "detail": "富裕な市長の姪、幸福な結婚生活。", "tags": ["turning_encounter", "love"]},
        {"year": 1642, "age": 36, "title": "『夜警』完成、サスキア死去", "detail": "名作と最愛の喪失が同年。", "tags": ["creation", "breakthrough", "loss"]},
        {"year": 1656, "age": 50, "title": "破産", "detail": "美術品コレクションも豪邸も失う。", "tags": ["setback", "loss"]},
        {"year": 1663, "age": 57, "title": "内縁の妻ヘンドリッキェ死去", "detail": "", "tags": ["loss"]},
        {"year": 1668, "age": 62, "title": "息子ティトゥスも死去", "detail": "老いた画家は完全に独りになる。", "tags": ["loss"]},
        {"year": 1669, "age": 63, "title": "貧困のうちにアムステルダムで死去", "detail": "晩年の自画像はこの世で最も深い眼差しを残した。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "芸術を選ぶことは、平和な生活を捨てることだ。", "source": "レンブラントの手紙"},
        {"text": "光を描こうとするな。暗闇を描け。そこに光は現れる。", "source": "弟子への言葉"},
        {"text": "作品は完成しない。ただ放棄されるだけだ。", "source": "レンブラントに帰される言葉"},
        {"text": "人生で最も大切なのは、自分の道を見失わぬことだ。", "source": "伝承"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/b/bd/Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg",
    "wikiTitle": "レンブラント・ファン・レイン",
    "imageCredit": {"artist": "Rembrandt van Rijn (Self-Portrait)", "license": "Public domain", "licenseUrl": "", "credit": "Google Art Project / National Gallery of Art, Washington", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg"},
    "birthMonth": 7, "birthDay": 15, "deathMonth": 10, "deathDay": 4,
    "lifeDigest": "オランダ黄金時代を代表する画家・版画家・銅版画家。ドラマチックな光と影（キアロスクーロ）の扱いと心理描写の深さで、西洋絵画史上最高の巨匠の一人とされる。『夜警』『テュルプ博士の解剖学講義』『放蕩息子の帰還』などの傑作を遺した。生涯で約80点の自画像を描き、その変遷は人生そのもの。",
    "traits": {
        "foods": ["オランダ料理", "ニシンの酢漬け", "ビール", "パン"],
        "hobbies": ["美術品収集", "エッチング", "自画像を描く", "聖書研究"],
        "personality": "情熱的で頑固、流行に迎合せず自己の表現を貫いた。浪費癖があり破産するが、晩年の困窮の中でこそ至高の作品を残した。",
        "likes": ["光と影", "肖像画", "聖書の物語", "東方趣味"],
        "dislikes": ["平板な画", "顧客の注文への妥協"]
    }
})

add('raphael', {
    "name": "ラファエロ・サンツィオ", "nameEn": "Raphael",
    "birth": 1483, "death": 1520, "country": "イタリア", "field": "画家・建築家",
    "summary": "ルネサンス三大巨匠の一人。優美と調和の体現者。37歳で夭折したが、バチカン『アテネの学堂』など天才の完璧を遺した。",
    "events": [
        {"year": 1483, "age": 0, "title": "ウルビーノの宮廷画家の家に生まれる", "detail": "11歳で母、17歳で父を失う。", "tags": ["loss"]},
        {"year": 1500, "age": 17, "title": "ペルジーノのもとで修業", "detail": "", "tags": ["restart"]},
        {"year": 1504, "age": 21, "title": "フィレンツェに移りレオナルドとミケランジェロから学ぶ", "detail": "", "tags": ["turning_encounter"]},
        {"year": 1508, "age": 25, "title": "ローマに招かれ、バチカン宮殿『署名の間』を依頼される", "detail": "", "tags": ["breakthrough"]},
        {"year": 1511, "age": 28, "title": "『アテネの学堂』完成", "detail": "古代の賢人たちを一堂に集めた西洋絵画の最高傑作の一つ。", "tags": ["creation", "breakthrough"]},
        {"year": 1514, "age": 31, "title": "サン・ピエトロ大聖堂の主任建築家に", "detail": "ブラマンテの後任。", "tags": ["approval"]},
        {"year": 1520, "age": 37, "title": "高熱で急逝（聖金曜日）", "detail": "『キリストの変容』を未完成のまま残す。『ラファエロが死んだとき、自然も死にたいと思った』——墓碑銘。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "絵を描くとは、見る方法を学ぶことだ。", "source": "ラファエロの手紙"},
        {"text": "美は、諸元素の完全な調和から生まれる。", "source": "カスティリオーネへの手紙"},
        {"text": "私は、自分の理想を描く。見たままの自然ではなく。", "source": "ラファエロに帰される言葉"},
        {"text": "天才は、借り物を完成させる者だ。", "source": "伝承"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Raffaello_Sanzio.jpg",
    "wikiTitle": "ラファエロ・サンティ",
    "imageCredit": {"artist": "Raphael (Self-portrait)", "license": "Public domain", "licenseUrl": "", "credit": "Uffizi Gallery, Florence", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Raffaello_Sanzio.jpg"},
    "birthMonth": 4, "birthDay": 6, "deathMonth": 4, "deathDay": 6,
    "lifeDigest": "イタリア盛期ルネサンスを代表する画家・建築家。レオナルド・ダ・ヴィンチ、ミケランジェロと並び『三大巨匠』と称される。優美な聖母子像、バチカン宮殿署名の間の壁画『アテネの学堂』『聖体の論議』、サン・ピエトロ大聖堂設計などの大作を残した。37歳の若さで夭折。",
    "traits": {
        "foods": ["イタリア料理", "ワイン", "パン", "オリーブオイル"],
        "hobbies": ["古典研究", "建築設計", "女性肖像画を描く"],
        "personality": "温和で社交的、弟子や協力者に深く愛された。工房を効率的に運営し大量の依頼をこなした組織運営の才も。",
        "likes": ["古代彫刻", "調和", "恋人フォルナリーナ", "宮廷の華やかさ"],
        "dislikes": ["ミケランジェロとの競争に巻き込まれること", "粗野な振る舞い"]
    }
})

add('matisse', {
    "name": "アンリ・マティス", "nameEn": "Henri Matisse",
    "birth": 1869, "death": 1954, "country": "フランス", "field": "画家・彫刻家",
    "summary": "フォーヴィスム（野獣派）の父。色彩の喜びを生涯追い続けた20世紀美術の巨人。晩年、病床で始めた『切り絵』は新たな頂点となった。",
    "events": [
        {"year": 1869, "age": 0, "title": "北フランスの穀物商の家に生まれる", "detail": "", "tags": []},
        {"year": 1890, "age": 21, "title": "盲腸の療養中に絵画と出会う", "detail": "母親が絵具セットを贈ってくれた。『別の次元に運ばれた』。", "tags": ["turning_encounter", "restart"]},
        {"year": 1905, "age": 36, "title": "サロン・ドートンヌで『野獣派』の名を得る", "detail": "原色の大胆な使用で『野獣の檻』と評される。", "tags": ["breakthrough"]},
        {"year": 1910, "age": 41, "title": "『ダンス』『音楽』完成", "detail": "ロシア人実業家シチューキンの依頼。", "tags": ["creation", "breakthrough"]},
        {"year": 1941, "age": 72, "title": "腸癌の大手術、余命を宣告される", "detail": "しかし奇跡的に生還。『新しい人生』が始まる。", "tags": ["illness", "restart"]},
        {"year": 1947, "age": 78, "title": "ヴァンス・ロザリオ礼拝堂の設計開始", "detail": "『生涯の傑作』と自ら語る総合芸術。", "tags": ["creation"]},
        {"year": 1948, "age": 79, "title": "『切り絵』の時代", "detail": "ベッドから起き上がれなくなり、色紙をハサミで切り抜く新技法を創造。", "tags": ["creation", "breakthrough"]},
        {"year": 1954, "age": 84, "title": "ニースで死去", "detail": "", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "芸術家は、毎朝新しく生まれたように世界を見なければならない。", "source": "『画家ノート』"},
        {"text": "正確さは真実ではない。", "source": "マティスの言葉"},
        {"text": "色は、心を打つエネルギーである。", "source": "インタビュー"},
        {"text": "絵画の役目は装飾ではなく、扉を開くことだ。", "source": "『画家ノート』"},
        {"text": "花を咲かせ続けたければ、小さなハサミを大切にしなさい。", "source": "晩年の言葉"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/7/76/Henri_Matisse%2C_1913%2C_photograph_by_Alvin_Langdon_Coburn.jpg",
    "wikiTitle": "アンリ・マティス",
    "imageCredit": {"artist": "Alvin Langdon Coburn (1913)", "license": "Public domain", "licenseUrl": "", "credit": "George Eastman Museum", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Henri_Matisse,_1913,_photograph_by_Alvin_Langdon_Coburn.jpg"},
    "birthMonth": 12, "birthDay": 31, "deathMonth": 11, "deathDay": 3,
    "lifeDigest": "20世紀を代表するフランスの画家。ピカソと並ぶモダンアートの二大巨頭。原色を大胆に用いた初期のフォーヴィスム、装飾的な中期作品、病床で始めた晩年の『切り絵（paper cuts）』まで、一生を通じて色彩の喜びを追求した。南仏ニースのロザリオ礼拝堂は総合芸術の傑作として知られる。",
    "traits": {
        "foods": ["南仏料理", "ワイン", "フルーツ", "シーフード"],
        "hobbies": ["音楽（ヴァイオリン演奏）", "旅行", "金魚・鳥を飼う"],
        "personality": "几帳面で真面目、病床でもアシスタントに指示して創作を続けた。生涯を通じて『色彩の歓び』を信じ抜いた。",
        "likes": ["南仏の光", "金魚", "アラベスク模様", "ニース"],
        "dislikes": ["暗い色調", "理論ばかりの批評", "同時代の悲観主義"]
    }
})

add('rodin', {
    "name": "オーギュスト・ロダン", "nameEn": "Auguste Rodin",
    "birth": 1840, "death": 1917, "country": "フランス", "field": "彫刻家",
    "summary": "『考える人』『接吻』『地獄の門』——近代彫刻の父。アカデミズムを打ち砕き、粘土に魂を吹き込んだ。",
    "events": [
        {"year": 1840, "age": 0, "title": "パリの下層中産階級の家に生まれる", "detail": "", "tags": []},
        {"year": 1857, "age": 17, "title": "国立美術学校（エコール・デ・ボザール）の入試に3度落ちる", "detail": "公式な芸術教育から排除される。", "tags": ["setback"]},
        {"year": 1864, "age": 24, "title": "生涯のパートナー、ローズ・ブーレを見つける", "detail": "53年後に正式結婚。", "tags": ["turning_encounter"]},
        {"year": 1876, "age": 36, "title": "イタリア旅行、ミケランジェロに衝撃", "detail": "『自由になった』と後年語る。", "tags": ["turning_encounter"]},
        {"year": 1880, "age": 40, "title": "『地獄の門』委嘱", "detail": "ダンテ『神曲』をテーマ。37年かけても未完のまま死去。この大作から『考える人』『接吻』などが派生。", "tags": ["creation", "breakthrough"]},
        {"year": 1884, "age": 44, "title": "愛弟子カミーユ・クローデルと出会う", "detail": "激しい愛と芸術的共鳴、そして破局（カミーユは精神病院で晩年を過ごす）。", "tags": ["turning_encounter", "loss"]},
        {"year": 1900, "age": 60, "title": "パリ万博で個展、国際的名声", "detail": "", "tags": ["approval"]},
        {"year": 1917, "age": 77, "title": "ムードンで死去、ローズも直前に逝く", "detail": "", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "真の芸術家は、大理石の中にすでに像を見る。彼はそれを解放するだけだ。", "source": "ロダンに帰される言葉（ミケランジェロの教えを継承）"},
        {"text": "忍耐も、一種の天才である。", "source": "『芸術について』"},
        {"text": "彫刻とは、余分なものを取り除く芸術だ。", "source": "ロダンの語録"},
        {"text": "自然の中には、醜いものは何もない。", "source": "『芸術について』"},
        {"text": "遅い者はしばしば最善の者である。", "source": "弟子への言葉"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/9/94/Auguste_Rodin_by_George_Charles_Beresford_%28NPG_x6573%29.jpg",
    "wikiTitle": "オーギュスト・ロダン",
    "imageCredit": {"artist": "George Charles Beresford (1902)", "license": "Public domain", "licenseUrl": "", "credit": "National Portrait Gallery", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Auguste_Rodin_by_George_Charles_Beresford_(NPG_x6573).jpg"},
    "birthMonth": 11, "birthDay": 12, "deathMonth": 11, "deathDay": 17,
    "lifeDigest": "フランスの彫刻家、近代彫刻の父。アカデミズム彫刻を打破し、荒々しい表面処理と未完成の美、運動感のある人体表現で新時代を切り開いた。『考える人』『カレーの市民』『接吻』『バルザック像』など代表作多数。弟子に愛人カミーユ・クローデル、詩人リルケ（秘書）。",
    "traits": {
        "foods": ["フランス家庭料理", "ワイン", "チーズ"],
        "hobbies": ["デッサン（1日に何枚も）", "古代彫刻の収集", "読書（ダンテ・ボードレール）"],
        "personality": "情熱的で仕事中毒、同時に優柔不断で恋多き人生。弟子・助手たちを大事にしつつ、カミーユを捨てたことで生涯の負い目も。",
        "likes": ["運動する人体", "ゴシック建築", "ダンテ『神曲』", "日本の浮世絵"],
        "dislikes": ["アカデミズムの型", "仕上げすぎた彫刻", "批評家"]
    }
})

add('dante', {
    "name": "ダンテ・アリギエーリ", "nameEn": "Dante Alighieri",
    "birth": 1265, "death": 1321, "country": "イタリア", "field": "詩人・政治家",
    "summary": "『神曲』——地獄・煉獄・天国を旅する叙事詩で、西洋文学の頂点を極めた中世最大の詩人。",
    "events": [
        {"year": 1265, "age": 0, "title": "フィレンツェの中流家庭に生まれる", "detail": "", "tags": []},
        {"year": 1274, "age": 9, "title": "ベアトリーチェ・ポルティナーリに出会う", "detail": "生涯変わらぬ心の恋人、彼女を主題に『新生』『神曲』を書く。", "tags": ["turning_encounter", "love"]},
        {"year": 1290, "age": 25, "title": "ベアトリーチェが若くして死去", "detail": "", "tags": ["loss"]},
        {"year": 1300, "age": 35, "title": "フィレンツェ共和国の最高行政官プリオーレに選出", "detail": "", "tags": ["approval"]},
        {"year": 1302, "age": 37, "title": "政争に敗れ永久追放、財産没収", "detail": "フィレンツェには二度と帰れなかった。", "tags": ["setback", "loss"]},
        {"year": 1308, "age": 43, "title": "『神曲』を書き始める", "detail": "亡命生活の孤独の中で。『地獄篇』『煉獄篇』『天国篇』の三部作。", "tags": ["creation"]},
        {"year": 1320, "age": 55, "title": "『神曲』完成", "detail": "", "tags": ["creation", "breakthrough"]},
        {"year": 1321, "age": 56, "title": "マラリアでラヴェンナにて死去", "detail": "フィレンツェは700年後の2008年にダンテの追放を撤回した。", "tags": ["loss", "illness"]}
    ],
    "quotes": [
        {"text": "ここを過ぎれば憂愁の都。ここを過ぎれば永遠の苦しみ。一切の望みを捨てよ、ここを入る者よ。", "source": "『神曲 地獄篇』第3歌"},
        {"text": "我が人生の道の半ばで、正道を踏み外した私は、暗い森の中にいた。", "source": "『神曲 地獄篇』第1歌 冒頭"},
        {"text": "最も大きな悲しみは、幸福だったときを思い出すことだ。", "source": "『神曲 地獄篇』第5歌"},
        {"text": "愛は、太陽とすべての星を動かす。", "source": "『神曲 天国篇』最後の行"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/e/ea/Bargello_-_Kapelle_Fresko_2a.jpg",
    "wikiTitle": "ダンテ・アリギエーリ",
    "imageCredit": {"artist": "Attributed to Giotto (c.1336)", "license": "Public domain", "licenseUrl": "", "credit": "Bargello Palace, Florence", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bargello_-_Kapelle_Fresko_2a.jpg"},
    "birthMonth": 5, "birthDay": 21, "deathMonth": 9, "deathDay": 14,
    "lifeDigest": "イタリア・ルネサンスの先駆となった詩人。フィレンツェ共和国の政治家でもあったが党派抗争に敗れ、生涯のほとんどを亡命生活で過ごした。その困苦の中で書かれた叙事詩『神曲』（La Divina Commedia）は、地獄・煉獄・天国の三界を旅する壮大な構想のもと、トスカーナ方言をイタリア文学の共通語に引き上げた。『イタリア語の父』。",
    "traits": {
        "foods": ["パン", "ワイン", "オリーブ", "質素な亡命中の食事"],
        "hobbies": ["神学研究", "古典ラテン文学の読書", "ベアトリーチェを詩に詠む"],
        "personality": "誇り高く頑固、政治的信念を曲げず追放されても撤回を拒否。内省的で神秘主義的、同時に鋭い政治批判の目を持つ。",
        "likes": ["ベアトリーチェ", "古代ローマ（ウェルギリウス）", "スコラ哲学（アクィナス）", "星々"],
        "dislikes": ["教皇庁の世俗的権力", "フィレンツェの党派争い", "堕落した聖職者"]
    }
})

# Verify image URLs
print('Verifying image URLs...')
all_ok = True
for pid, d in NEW.items():
    try:
        req = urllib.request.Request(d['imageUrl'], headers={'User-Agent': 'Mozilla/5.0'})
        r = urllib.request.urlopen(req, timeout=10)
        print(f'  [{r.status}] {pid}')
    except Exception as e:
        print(f'  [FAIL] {pid}: {str(e)[:80]}')
        d['__skip__'] = True
        all_ok = False

# Write
written = []
for pid, d in NEW.items():
    if d.get('__skip__'): continue
    path = os.path.join(PEOPLE_DIR, pid + '.json')
    if os.path.exists(path):
        print(f'SKIP existing: {pid}'); continue
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    written.append(pid)
    print(f'WROTE: {pid}')

# Manifest
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
print(f'\nManifest: +{len(added)} total={len(m["people"])}')
