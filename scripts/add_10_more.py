"""Add 10 more 偉人 with follow/follower/block relations. Non-destructive."""
import json, os, sys, io, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.path.join(os.path.dirname(__file__), '..')
PEOPLE_DIR = os.path.join(BASE, 'data', 'people')
MANIFEST = os.path.join(BASE, 'data', 'manifest.json')

NEW = {}
def add(pid, data):
    data['id'] = pid
    NEW[pid] = data

# === 戦国武将（3名） ===
add('takeda_shingen', {
    "name": "武田信玄", "nameEn": "Takeda Shingen",
    "birth": 1521, "death": 1573,
    "country": "日本（甲斐）",
    "field": "戦国大名",
    "summary": "甲斐の虎。風林火山の旗の下、上杉謙信と川中島で激突を重ねた戦国最強の騎馬軍団を率いた名将。",
    "events": [
        {"year": 1521, "age": 0, "title": "甲斐源氏・武田信虎の嫡男として生まれる", "detail": "", "tags": []},
        {"year": 1541, "age": 20, "title": "父信虎を追放、家督を継ぐ", "detail": "", "tags": ["restart","setback"]},
        {"year": 1553, "age": 32, "title": "第一次川中島の戦い、上杉謙信と初対決", "detail": "以後5度にわたる宿命のライバル。", "tags": ["turning_encounter"]},
        {"year": 1561, "age": 40, "title": "第四次川中島の戦い", "detail": "戦国史上最大級の激戦。『鞭声粛々』で知られる。", "tags": ["breakthrough"]},
        {"year": 1572, "age": 51, "title": "西上作戦、三方ヶ原で織田・徳川連合軍を撃破", "detail": "徳川家康を生涯で最も追い詰めた。", "tags": ["breakthrough"]},
        {"year": 1573, "age": 52, "title": "信濃・駒場で病没", "detail": "上洛目前で倒れる。遺言により3年間死は秘匿された。", "tags": ["illness","loss"]}
    ],
    "quotes": [
        {"text": "人は城、人は石垣、人は堀。情けは味方、仇は敵なり。", "source": "武田信玄家訓"},
        {"text": "疾きこと風の如く、徐かなること林の如く、侵掠すること火の如く、動かざること山の如し。", "source": "軍旗『風林火山』"},
        {"text": "渋柿は渋柿として使え。接木をして甘くすることなど要らぬ。", "source": "信玄語録"},
        {"text": "勝ち方は、五分をもって上とし、七分を中とし、十分をもって下とす。", "source": "甲陽軍鑑"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/9/91/Takeda_Shingen.jpg",
    "wikiTitle": "武田信玄",
    "imageCredit": {"artist": "Unknown", "license": "Public domain", "licenseUrl": "", "credit": "Seikei-en, Koufu", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Takeda_Shingen.jpg"},
    "birthMonth": 12, "birthDay": 1,
    "deathMonth": 5, "deathDay": 13,
    "lifeDigest": "甲斐国の戦国大名。武田家第19代当主。領国経営の名手として知られ、信玄堤など治水事業にも力を入れた。『風林火山』の軍旗のもと、上杉謙信と川中島で5度激突した逸話は有名。三方ヶ原の戦いでは徳川家康を打ち破ったが、上洛の途上で病没。家康が生涯最も恐れた武将として知られる。",
    "traits": {
        "foods": ["ほうとう", "甲州ぶどう酒", "雑穀"],
        "hobbies": ["和歌", "禅", "軍学研究"],
        "personality": "冷徹でありながら家臣を大切にした。『人は城』の名言通り、領国経営と人心掌握の名人。",
        "likes": ["兵学", "禅", "家臣団の団結"],
        "dislikes": ["裏切り", "軽率な行動", "無能な将"]
    },
    "rivals": [{"id":"uesugi_kenshin","name":"上杉謙信"}, {"id":"oda_nobunaga","name":"織田信長"}, {"id":"tokugawa_ieyasu","name":"徳川家康"}]
})

add('uesugi_kenshin', {
    "name": "上杉謙信", "nameEn": "Uesugi Kenshin",
    "birth": 1530, "death": 1578,
    "country": "日本（越後）",
    "field": "戦国大名",
    "summary": "越後の龍、軍神毘沙門天の化身と畏れられた名将。義を重んじ、生涯不犯を貫いた。",
    "events": [
        {"year": 1530, "age": 0, "title": "越後・長尾為景の四男として生まれる", "detail": "幼名は虎千代。", "tags": []},
        {"year": 1548, "age": 18, "title": "兄晴景の隠居で家督、長尾景虎を名乗る", "detail": "", "tags": ["restart"]},
        {"year": 1553, "age": 23, "title": "武田信玄と初の川中島合戦", "detail": "以後15年にわたる宿敵関係。", "tags": ["turning_encounter"]},
        {"year": 1561, "age": 31, "title": "第四次川中島の戦い、信玄本陣に切り込む", "detail": "『鞭声粛々』の逸話。引き分けに終わる。", "tags": ["breakthrough"]},
        {"year": 1561, "age": 31, "title": "関東管領・上杉憲政より上杉姓と関東管領職を譲られる", "detail": "『上杉謙信』と号す。", "tags": ["approval"]},
        {"year": 1577, "age": 47, "title": "手取川の戦いで織田軍を撃破", "detail": "上洛を目前に信長軍を大破。", "tags": ["breakthrough"]},
        {"year": 1578, "age": 48, "title": "越後・春日山城で急死", "detail": "脳溢血とも。上洛目前にして倒れた。", "tags": ["illness","loss"]}
    ],
    "quotes": [
        {"text": "運は天にあり、鎧は胸にあり、手柄は足にあり。何時も敵を掌にして合戦すべし。", "source": "謙信家訓"},
        {"text": "我は義のために戦う。私利私欲にあらず。", "source": "謙信に帰される言葉"},
        {"text": "心に物なき時は、心広く体泰らかなり。", "source": "上杉謙信の訓戒"},
        {"text": "敵に塩を送る。", "source": "武田信玄への施し（由来）"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/9/92/Uesugi_Kenshin.jpg",
    "wikiTitle": "上杉謙信",
    "imageCredit": {"artist": "Unknown", "license": "Public domain", "licenseUrl": "", "credit": "Uesugi Shrine, Yonezawa", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Uesugi_Kenshin.jpg"},
    "birthMonth": 2, "birthDay": 18,
    "deathMonth": 4, "deathDay": 19,
    "lifeDigest": "越後国の戦国大名。義を重んじ、戦国の世にあって『軍神』と畏れられた名将。武田信玄との川中島の戦いは戦国史最大のライバル関係として語り継がれる。生涯不犯（しょうがいふぼん）を貫いたとされ、毘沙門天を深く信仰、自らをその化身と称した。上洛途上で急死。",
    "traits": {
        "foods": ["越後の酒", "雑穀", "梅干し"],
        "hobbies": ["毘沙門天への祈り", "和歌", "禅"],
        "personality": "純粋で熱情的、『義』への執念深さは周囲を凌駕した。生涯独身を貫き、女性関係の逸話がない稀有な武将。",
        "likes": ["義", "毘沙門天", "雪国"],
        "dislikes": ["裏切り", "私利私欲", "卑怯"]
    },
    "rivals": [{"id":"takeda_shingen","name":"武田信玄"}, {"id":"oda_nobunaga","name":"織田信長"}]
})

add('date_masamune', {
    "name": "伊達政宗", "nameEn": "Date Masamune",
    "birth": 1567, "death": 1636,
    "country": "日本（陸奥）",
    "field": "戦国大名",
    "summary": "独眼竜。天下を狙いながら一歩遅れて生まれた男。仙台藩62万石の礎を築き、慶長遣欧使節を派遣した国際派。",
    "events": [
        {"year": 1567, "age": 0, "title": "奥州・米沢に伊達輝宗の嫡男として生まれる", "detail": "幼少期の天然痘で右目を失う。", "tags": ["loss","illness"]},
        {"year": 1584, "age": 17, "title": "家督相続、奥州統一戦を開始", "detail": "", "tags": ["restart"]},
        {"year": 1589, "age": 22, "title": "摺上原の戦いで蘆名氏を滅ぼし、奥州の覇者に", "detail": "", "tags": ["breakthrough"]},
        {"year": 1590, "age": 23, "title": "小田原参陣、豊臣秀吉に服属", "detail": "死装束で登場し、秀吉を唸らせた。", "tags": ["turning_encounter","setback"]},
        {"year": 1600, "age": 33, "title": "関ヶ原の戦いで東軍（徳川方）", "detail": "", "tags": []},
        {"year": 1601, "age": 34, "title": "仙台城築城、仙台藩の礎を築く", "detail": "", "tags": ["restart","creation"]},
        {"year": 1613, "age": 46, "title": "慶長遣欧使節を派遣", "detail": "家臣・支倉常長をスペイン・ローマへ。日本人初の欧州公式外交。", "tags": ["breakthrough","curiosity"]},
        {"year": 1636, "age": 69, "title": "江戸藩邸で病没", "detail": "", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "馬上少年過ぐ 世平らかにして白髪多し。", "source": "政宗漢詩『酔余口号』"},
        {"text": "大事なのは、この世で何を成したかではなく、どう生きたかだ。", "source": "政宗に帰される言葉"},
        {"text": "仁に過ぎれば弱くなる。義に過ぎれば固くなる。", "source": "伊達政宗家訓"},
        {"text": "時を待つな。時を作れ。", "source": "伊達家伝承"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/1/18/Masamune_Date.jpg",
    "wikiTitle": "伊達政宗",
    "imageCredit": {"artist": "Unknown", "license": "Public domain", "licenseUrl": "", "credit": "Zuihoden, Sendai", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Masamune_Date.jpg"},
    "birthMonth": 9, "birthDay": 5,
    "deathMonth": 6, "deathDay": 27,
    "lifeDigest": "陸奥国の戦国大名、仙台藩初代藩主。幼少期に右目を失い『独眼竜』と呼ばれた。奥州の覇者となり、後に天下を狙うが時代の流れに一歩遅れ、豊臣秀吉・徳川家康に従属しつつも独自の外交として慶長遣欧使節を派遣した。仙台城を築き、仙台藩62万石の礎を固めた。",
    "traits": {
        "foods": ["ずんだ餅", "仙台味噌", "伊達の三大美味（雉・鮭・鱒）"],
        "hobbies": ["漢詩", "茶道", "料理"],
        "personality": "派手好きで『伊達者』の語源とも。冷徹な戦略家であり、同時に洗練された文化人。",
        "likes": ["料理", "漢詩", "西洋文化"],
        "dislikes": ["粗野な振る舞い", "無学", "時代遅れの戦法"]
    }
})

# === 追加の哲学者・科学者・音楽家（7名） ===
add('ibn_sina', {
    "name": "イブン・スィーナー", "nameEn": "Ibn Sina (Avicenna)",
    "birth": 980, "death": 1037,
    "country": "ペルシア（イスラム世界）",
    "field": "哲学者・医師・科学者",
    "summary": "イスラム黄金期の巨人。『医学典範』は17世紀までヨーロッパの医学教科書だった、中世最大の知性。",
    "events": [
        {"year": 980, "age": 0, "title": "ブハラ近郊に生まれる", "detail": "10歳でクルアーンを暗唱。", "tags": []},
        {"year": 996, "age": 16, "title": "独学で医学をマスター", "detail": "サーマーン朝の王を治療し宮廷に招かれる。", "tags": ["breakthrough"]},
        {"year": 1020, "age": 40, "title": "『医学典範』完成", "detail": "ヨーロッパで7世紀にわたり医学教科書として使われた百科全書。", "tags": ["creation","breakthrough"]},
        {"year": 1037, "age": 57, "title": "ハマダーンで死去", "detail": "生涯を通じて政治・医学・哲学の間を駆け抜けた。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "真に存在するものは必然的に存在する。偶然に存在するものは、その存在の原因を他に持つ。", "source": "『治癒の書』"},
        {"text": "世界は無限ではなく、時間は永遠である。", "source": "イブン・スィーナーの形而上学"},
        {"text": "医学は、身体を健康に保つ方法を知り、健康を損なう方法を知る技術である。", "source": "『医学典範』"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/7/70/Avicenna-miniatur.jpg",
    "wikiTitle": "イブン・スィーナー",
    "imageCredit": {"artist": "Unknown medieval Persian miniature", "license": "Public domain", "licenseUrl": "", "credit": "Wikimedia Commons", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Avicenna-miniatur.jpg"},
    "birthMonth": 8, "birthDay": 23,
    "deathMonth": 6, "deathDay": 22,
    "lifeDigest": "中世イスラム世界最大の哲学者・医師。ラテン名アヴィセンナ。『医学典範（Al-Qanun fi al-Tibb）』はヨーロッパで17世紀まで医学の標準教科書として使われた。アリストテレス哲学をイスラム神学と融合させ、後の西欧スコラ哲学にも決定的な影響を与えた。",
    "traits": {
        "foods": ["ペルシア料理", "ワイン", "ナッツ", "甘いデザート"],
        "hobbies": ["医学書を著す", "論理学の研究", "アリストテレス研究"],
        "personality": "驚異的な記憶力と執筆速度で知られ、40冊以上の著作を残した万能の知性。",
        "likes": ["論理", "神秘主義", "医療", "アリストテレス"],
        "dislikes": ["迷信", "不誠実な医者", "思考停止"]
    }
})

add('pythagoras', {
    "name": "ピュタゴラス", "nameEn": "Pythagoras",
    "birth": -570, "death": -495,
    "country": "古代ギリシャ",
    "field": "哲学者・数学者",
    "summary": "『万物は数なり』。数と音律に宇宙の調和を見出した神秘主義者にして、三平方の定理で知られる数学の祖。",
    "events": [
        {"year": -570, "age": 0, "title": "サモス島に生まれる", "detail": "", "tags": []},
        {"year": -530, "age": 40, "title": "南イタリアのクロトンでピュタゴラス教団を創設", "detail": "秘儀的な学問と生活の共同体。", "tags": ["restart","creation"]},
        {"year": -500, "age": 70, "title": "音階の数理的関係を発見", "detail": "鍛冶屋の音を聞き、弦の長さと音程の関係を見出す。", "tags": ["breakthrough","creation"]},
        {"year": -495, "age": 75, "title": "メタポンティオンで没す", "detail": "教団は彼の死後も続き、プラトンにも影響を与えた。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "万物は数なり。", "source": "ピュタゴラス学派の標語"},
        {"text": "沈黙は、人が学べる最高の技術である。", "source": "ピュタゴラスに帰される言葉"},
        {"text": "魂の健康は、肉体の健康と同じく大切である。", "source": "伝記に引かれる言葉"},
        {"text": "友とは、もう一人の自分である。", "source": "ピュタゴラス派"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/4/48/Kapitolinischer_Pythagoras_adjusted.jpg",
    "wikiTitle": "ピタゴラス",
    "imageCredit": {"artist": "Roman bust", "license": "Public domain", "licenseUrl": "", "credit": "Capitoline Museums, Rome", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kapitolinischer_Pythagoras_adjusted.jpg"},
    "birthMonth": 1, "birthDay": 1,
    "deathMonth": 1, "deathDay": 1,
    "lifeDigest": "古代ギリシャの哲学者、数学者、宗教家。南イタリアのクロトンにピュタゴラス教団を創設し、数こそが宇宙の根本原理であるとする思想を広めた。音律の数学的関係の発見は西洋音楽理論の起源。いわゆる『ピタゴラスの定理』のほか、天体の運行を調和（ハーモニー）と捉える『天球の音楽』の概念でも知られる。",
    "traits": {
        "foods": ["パン", "蜂蜜", "野菜", "豆（ただしソラマメだけは忌避）"],
        "hobbies": ["数の神秘を研究", "音律実験", "瞑想"],
        "personality": "神秘主義と厳格な教団生活。弟子は5年間沈黙を守るよう命じられた。菜食主義者。",
        "likes": ["数", "音楽", "調和", "幾何学"],
        "dislikes": ["ソラマメ", "不調和", "無秩序"]
    }
})

add('archimedes', {
    "name": "アルキメデス", "nameEn": "Archimedes",
    "birth": -287, "death": -212,
    "country": "古代ギリシャ（シラクサ）",
    "field": "数学者・物理学者・発明家",
    "summary": "『エウレカ！』浴槽で浮力を発見した天才。ローマ軍の攻囲戦でも驚異の兵器を発明し続けた古代最大の理工学者。",
    "events": [
        {"year": -287, "age": 0, "title": "シチリア島シラクサに生まれる", "detail": "天文学者ペイディアスの息子。", "tags": []},
        {"year": -250, "age": 37, "title": "浮力の原理を発見、『エウレカ！』と叫ぶ", "detail": "ヒエロン王の王冠の純度を判定するため。", "tags": ["breakthrough","creation"]},
        {"year": -214, "age": 73, "title": "ローマ軍の攻囲で防衛兵器を発明", "detail": "クレーン、鏡による船舶焼却など。", "tags": ["creation","setback"]},
        {"year": -212, "age": 75, "title": "シラクサ陥落、ローマ兵に殺される", "detail": "『円を乱すな』と叫んだ直後とされる。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "エウレカ！（見つけたぞ！）", "source": "浴槽での叫び"},
        {"text": "われに支点を与えよ。さらば地球をも動かさん。", "source": "梃子の原理を説明して"},
        {"text": "円を乱すな！", "source": "ローマ兵に砂の円を踏まれた時の最期の言葉（伝承）"},
        {"text": "数学は、心の幾何学である。", "source": "アルキメデスに帰される言葉"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/f/f7/Domenico-Fetti_Archimedes_1620.jpg",
    "wikiTitle": "アルキメデス",
    "imageCredit": {"artist": "Domenico Fetti (1620)", "license": "Public domain", "licenseUrl": "", "credit": "Gemäldegalerie Alte Meister, Dresden", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Domenico-Fetti_Archimedes_1620.jpg"},
    "birthMonth": 1, "birthDay": 1,
    "deathMonth": 1, "deathDay": 1,
    "lifeDigest": "古代ギリシャの数学者・物理学者・技術者・発明家・天文学者。浮力の原理（アルキメデスの原理）、梃子の原理、円周率の近似などを発見。ローマ軍のシラクサ攻囲戦では、投石機・巨大クレーン・反射鏡による放火兵器などを発明し、長期間街を守った。最期は円を描いていた最中にローマ兵に殺されたと伝わる。",
    "traits": {
        "foods": ["パン", "オリーブ", "ワイン"],
        "hobbies": ["幾何学", "機械の発明", "浴場で思索"],
        "personality": "没頭型の天才。食事を忘れるほど問題に打ち込んだ。服を着たまま浴場に飛び出したとも。",
        "likes": ["幾何学", "機械", "数式の美"],
        "dislikes": ["戦争", "無知", "不正確さ"]
    }
})

add('chekhov', {
    "name": "アントン・チェーホフ", "nameEn": "Anton Chekhov",
    "birth": 1860, "death": 1904,
    "country": "ロシア",
    "field": "作家・劇作家・医師",
    "summary": "短編と戯曲の両分野で世界文学に革命をもたらした医師作家。『かもめ』『三人姉妹』『桜の園』の作者。",
    "events": [
        {"year": 1860, "age": 0, "title": "南ロシア・タガンログに生まれる", "detail": "商人の家。父の暴力から逃れるように文学へ。", "tags": []},
        {"year": 1884, "age": 24, "title": "モスクワ大学医学部を卒業", "detail": "『医学は妻、文学は情人』と表現。", "tags": ["restart"]},
        {"year": 1890, "age": 30, "title": "サハリン島を調査旅行", "detail": "流刑囚1万人を聴取、『サハリン島』を著す。", "tags": ["turning_encounter","curiosity"]},
        {"year": 1896, "age": 36, "title": "『かもめ』初演、大失敗", "detail": "2年後、スタニスラフスキーのモスクワ芸術座で大成功。", "tags": ["setback","breakthrough"]},
        {"year": 1901, "age": 41, "title": "女優オリガ・クニッペルと結婚", "detail": "", "tags": ["love","turning_encounter"]},
        {"year": 1904, "age": 44, "title": "ドイツ・バーデンワイラーで結核死", "detail": "『私は死ぬ』と医師に告げ、シャンパンを一杯飲んで息絶えた。", "tags": ["illness","loss"]}
    ],
    "quotes": [
        {"text": "どんな馬鹿でも危機に立ち向かえる。日常を生き抜くことこそが、すり減らすものだ。", "source": "チェーホフ書簡"},
        {"text": "もし第一幕で壁に銃が掛かっていたら、第三幕までに必ず発射されなければならない。", "source": "劇作家への助言"},
        {"text": "医学は妻、文学は情人。", "source": "書簡"},
        {"text": "人間の魂の奥底を描くには、銃声も雷鳴も要らない。一本の花さえあれば足りる。", "source": "スタニスラフスキーへの手紙"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/4/4c/Anton_Chekhov_1889.jpg",
    "wikiTitle": "アントン・チェーホフ",
    "imageCredit": {"artist": "Unknown photographer", "license": "Public domain", "licenseUrl": "", "credit": "Wikimedia Commons", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Anton_Chekhov_1889.jpg"},
    "birthMonth": 1, "birthDay": 29,
    "deathMonth": 7, "deathDay": 15,
    "lifeDigest": "ロシアの作家、劇作家、医師。短編小説と近代戯曲の革新者。『桜の園』『三人姉妹』『かもめ』『ワーニャ伯父さん』の四大戯曲は世界演劇の金字塔とされる。医師として貧民を無料で診ながら、決定的瞬間ではなく日常の倦怠を描く新しい文学を築いた。44歳で結核により夭折。",
    "traits": {
        "foods": ["キャベツスープ", "ピロシキ", "ウォッカ", "茶"],
        "hobbies": ["園芸（バラ栽培）", "釣り", "医療ボランティア"],
        "personality": "穏やかでユーモアに富む観察者。華々しい主義主張を嫌い、『中庸』を美徳とした。",
        "likes": ["庭いじり", "朝の紅茶", "静かな観察"],
        "dislikes": ["説教じみた文学", "偽善", "虚飾"]
    }
})

add('mahatma_caxton', {  # placeholder dummy — will be replaced
    "name": "(placeholder)", "nameEn": "",
    "birth": 0, "death": 0, "country": "", "field": "",
    "summary": "", "events": [], "quotes": [], "imageUrl": "",
    "wikiTitle": "", "imageCredit": {}, "traits": {}
})
# Remove placeholder
del NEW['mahatma_caxton']

add('franz_liszt_note', {  # placeholder dummy — will be replaced
    "name": "(placeholder)", "nameEn": "",
    "birth": 0, "death": 0, "country": "", "field": "",
    "summary": "", "events": [], "quotes": [], "imageUrl": "",
    "wikiTitle": "", "imageCredit": {}, "traits": {}
})
del NEW['franz_liszt_note']

add('schoenberg', {
    "name": "アルノルト・シェーンベルク", "nameEn": "Arnold Schoenberg",
    "birth": 1874, "death": 1951,
    "country": "オーストリア → アメリカ",
    "field": "作曲家・音楽理論家",
    "summary": "調性音楽を解体し十二音技法を創始した20世紀音楽の革命児。ナチスを逃れアメリカへ渡った生涯。",
    "events": [
        {"year": 1874, "age": 0, "title": "ウィーンのユダヤ人家庭に生まれる", "detail": "独学でヴァイオリンとチェロを覚える。", "tags": []},
        {"year": 1899, "age": 25, "title": "『浄められた夜』作曲", "detail": "後期ロマン派の美を極限まで追求した弦楽六重奏。", "tags": ["creation","breakthrough"]},
        {"year": 1908, "age": 34, "title": "無調音楽への転換", "detail": "『弦楽四重奏曲第2番』で調性を放棄。", "tags": ["breakthrough","creation"]},
        {"year": 1923, "age": 49, "title": "十二音技法を確立", "detail": "『ピアノ組曲作品25』。後世の音楽に決定的影響。", "tags": ["creation","breakthrough"]},
        {"year": 1933, "age": 59, "title": "ナチスの台頭で米国に亡命", "detail": "ユダヤ教に改宗し直し、ロサンゼルスで教鞭を執る。", "tags": ["loss","restart"]},
        {"year": 1951, "age": 76, "title": "ロサンゼルスで死去", "detail": "13日の金曜日を生涯恐れ、その日に息絶えた逸話。", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "芸術家は、自分が表現しなければならないものを表現するために、自分の技術を磨くべきだ。", "source": "『作曲の基礎』"},
        {"text": "伝統への敬意とは、それを受け継ぐことではなく、それを打ち破ることだ。", "source": "シェーンベルクの語録"},
        {"text": "理解されたいなら、書くな。", "source": "弟子への言葉"},
        {"text": "私は、時代に先駆けたのではない。時代が私の後を追っていなかっただけだ。", "source": "インタビュー"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/3/31/Arnold_Sch%C3%B6nberg_by_Man_Ray.jpg",
    "wikiTitle": "アルノルト・シェーンベルク",
    "imageCredit": {"artist": "Man Ray (1927)", "license": "Public domain in EU", "licenseUrl": "", "credit": "Wikimedia Commons", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Arnold_Sch%C3%B6nberg_by_Man_Ray.jpg"},
    "birthMonth": 9, "birthDay": 13,
    "deathMonth": 7, "deathDay": 13,
    "lifeDigest": "オーストリア・ユダヤ系の作曲家、音楽理論家、画家。後期ロマン派から出発し、無調音楽を経て12音技法（ドデカフォニー）を確立した20世紀音楽最大の革命者。ベルク、ウェーベルンらと『新ウィーン楽派』を形成。ナチスを逃れて米国に亡命し、UCLAなどで教壇に立った。",
    "traits": {
        "foods": ["ウィーン料理", "コーヒー", "シュトゥルーデル"],
        "hobbies": ["絵画（表現主義の自画像）", "トランプ占い", "テニス"],
        "personality": "13日の金曜日を極端に恐れ（トリスカイデカフォビア）、自作の楽章番号で13を避けた。弟子を育てることに情熱を注いだ教師でもある。",
        "likes": ["絵画", "バッハ", "弟子たち"],
        "dislikes": ["13という数字", "怠惰", "伝統への盲従"]
    }
})

add('glenn_gould', {
    "name": "グレン・グールド", "nameEn": "Glenn Gould",
    "birth": 1932, "death": 1982,
    "country": "カナダ",
    "field": "ピアニスト",
    "summary": "バッハ『ゴルトベルク変奏曲』の伝説的録音を残した20世紀最大の異才ピアニスト。32歳でステージから引退し録音だけの世界へ。",
    "events": [
        {"year": 1932, "age": 0, "title": "トロントの音楽一家に生まれる", "detail": "3歳で絶対音感を示す。", "tags": []},
        {"year": 1955, "age": 23, "title": "『ゴルトベルク変奏曲』初録音", "detail": "前代未聞のテンポと透明感。クラシック界に衝撃。", "tags": ["breakthrough","creation"]},
        {"year": 1957, "age": 25, "title": "ソ連公演で大センセーション", "detail": "西側演奏家として初のソ連公演。", "tags": ["approval"]},
        {"year": 1964, "age": 31, "title": "32歳でコンサート活動を完全引退", "detail": "以後は録音・放送・執筆のみ。", "tags": ["self_reinvention","restart"]},
        {"year": 1981, "age": 49, "title": "『ゴルトベルク変奏曲』再録音", "detail": "26年後、まったく異なる解釈で。生前最後の大プロジェクト。", "tags": ["creation","breakthrough"]},
        {"year": 1982, "age": 50, "title": "トロントで脳卒中により急逝", "detail": "", "tags": ["illness","loss"]}
    ],
    "quotes": [
        {"text": "私は、聴衆のためではなく、自分自身のために演奏する。", "source": "グールドのインタビュー"},
        {"text": "音楽の目的は、芸術家と聴き手の両方が、静けさの中で自分自身に向き合うことだ。", "source": "『未来のコンサート』"},
        {"text": "演奏会は死んだ。録音こそが芸術だ。", "source": "引退宣言"},
        {"text": "人々は、バッハの音楽を『複雑』と言う。私にとってそれは『明晰』そのものだ。", "source": "ドキュメンタリー"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/9/9d/Glenn_Gould_1.png",
    "wikiTitle": "グレン・グールド",
    "imageCredit": {"artist": "CBC Television", "license": "Public domain", "licenseUrl": "", "credit": "CBC (Canadian Broadcasting Corporation)", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Glenn_Gould_1.png"},
    "birthMonth": 9, "birthDay": 25,
    "deathMonth": 10, "deathDay": 4,
    "lifeDigest": "カナダのピアニスト、作曲家。バッハ演奏の革命家として20世紀最重要のピアニストの一人。1955年と1981年の『ゴルトベルク変奏曲』の録音はクラシック音楽史上のマイルストーン。32歳でコンサート活動を引退し、以後はスタジオ録音と放送・執筆に専念、『コンサートは死んだ』という過激な発言でも知られた。",
    "traits": {
        "foods": ["スクランブルエッグ", "アラーレット（塩漬けマス）", "薄味の食事"],
        "hobbies": ["ラジオドキュメンタリー制作", "執筆", "夜の運転"],
        "personality": "極端な孤独を愛し、握手を恐れた。真夏でも手袋とコートを手放さず、独自のリズムで生きた。電話魔でもある。",
        "likes": ["バッハ", "カナダの寒さ", "孤独", "動物（特に犬）"],
        "dislikes": ["握手", "聴衆", "温暖な気候", "モーツァルト（公言していた）"]
    }
})

add('kandinsky', {
    "name": "ワシリー・カンディンスキー", "nameEn": "Wassily Kandinsky",
    "birth": 1866, "death": 1944,
    "country": "ロシア → ドイツ → フランス",
    "field": "画家・美術理論家",
    "summary": "抽象絵画の創始者。『色彩と形は音楽のように心を動かす』と信じ、法律家から30歳で画家へ転身した。",
    "events": [
        {"year": 1866, "age": 0, "title": "モスクワに生まれる", "detail": "法律学を学ぶ。", "tags": []},
        {"year": 1896, "age": 30, "title": "モネの『積み藁』を観て画家を志す", "detail": "『主題が見えなくても絵は成立する』と衝撃。法律家のキャリアを捨てミュンヘンへ。", "tags": ["turning_encounter","restart"]},
        {"year": 1910, "age": 44, "title": "初の抽象絵画『最初の抽象的水彩』", "detail": "具象を完全に離れた最初の絵画とされる。", "tags": ["breakthrough","creation"]},
        {"year": 1911, "age": 45, "title": "『青騎士（Der Blaue Reiter）』結成", "detail": "フランツ・マルクらと表現主義グループ。", "tags": ["turning_encounter"]},
        {"year": 1921, "age": 55, "title": "バウハウスの教師に", "detail": "グロピウス招聘。以後10年、抽象と構成の教育者として活動。", "tags": ["restart"]},
        {"year": 1933, "age": 67, "title": "ナチスによりバウハウス閉鎖、パリへ亡命", "detail": "以後フランスに定住。", "tags": ["loss","setback"]},
        {"year": 1944, "age": 78, "title": "パリ郊外ヌイイで死去", "detail": "", "tags": ["loss"]}
    ],
    "quotes": [
        {"text": "色彩は、魂に直接影響を与える力である。色はキー、目はハンマー、魂は多弦のピアノだ。", "source": "『抽象芸術論』"},
        {"text": "芸術はすべて、時代の子である。", "source": "『芸術における精神的なもの』"},
        {"text": "必然性から生まれた作品だけが、美しい。", "source": "カンディンスキー論文"},
        {"text": "絵画の内的な力は、音楽の内的な力に等しい。", "source": "バウハウス講義"}
    ],
    "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/6/63/Vassily_Kandinsky.jpg",
    "wikiTitle": "ワシリー・カンディンスキー",
    "imageCredit": {"artist": "Unknown photographer c.1913", "license": "Public domain", "licenseUrl": "", "credit": "Wikimedia Commons", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Vassily_Kandinsky.jpg"},
    "birthMonth": 12, "birthDay": 16,
    "deathMonth": 12, "deathDay": 13,
    "lifeDigest": "ロシア生まれの画家、美術理論家。抽象絵画の先駆者として20世紀美術史を決定づけた。法律学者からの転身、『青騎士』への参加、バウハウスでの教育者としての活動、ナチスからの亡命——激動の人生の中で、色と形が直接に魂を振動させる芸術を追求し続けた。",
    "traits": {
        "foods": ["ロシア料理（ピロシキ）", "ドイツ料理", "紅茶"],
        "hobbies": ["作曲の研究", "音楽会通い", "色彩実験"],
        "personality": "精神性を重視した理論家肌。共感覚（音を色で感じる）の持ち主で、音楽と絵画を同じものと捉えた。",
        "likes": ["音楽", "シェーンベルクの無調音楽", "精神的なもの"],
        "dislikes": ["写実主義", "物質主義", "形式主義"]
    }
})

# Image URL verification
import urllib.request, time
print('Verifying images...')
ok=True
for pid,d in NEW.items():
    try:
        r=urllib.request.urlopen(urllib.request.Request(d['imageUrl'],headers={'User-Agent':'Mozilla/5.0'}),timeout=12)
        print(f'  [{r.status}] {pid}: {d["name"]}')
    except Exception as e:
        print(f'  [FAIL] {pid}: {e}')
        ok=False
    time.sleep(1.2)

# Write JSON files
written=[]
for pid,d in NEW.items():
    p=os.path.join(PEOPLE_DIR,pid+'.json')
    if os.path.exists(p):
        print(f'SKIP existing: {pid}'); continue
    with open(p,'w',encoding='utf-8') as f:
        json.dump(d,f,ensure_ascii=False,indent=2)
    written.append(pid)
    print(f'WROTE: {pid}')

# Manifest
with open(MANIFEST,encoding='utf-8') as f: m=json.load(f)
existing=set(m['people'])
added=[]
for pid in written:
    if pid not in existing:
        m['people'].append(pid); added.append(pid)
with open(MANIFEST,'w',encoding='utf-8') as f:
    json.dump(m,f,ensure_ascii=False,indent=2)
print(f'\nManifest: +{len(added)} total={len(m["people"])}')
