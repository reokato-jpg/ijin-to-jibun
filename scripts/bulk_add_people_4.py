# -*- coding: utf-8 -*-
"""第4弾：作曲家を中心に新規偉人15人追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"
MANIFEST = ROOT / "data" / "manifest.json"

PEOPLE_DATA = [
    {
        "id": "grieg", "name": "エドヴァルド・グリーグ", "nameEn": "Edvard Grieg",
        "birth": 1843, "death": 1907, "country": "ノルウェー", "field": "作曲家",
        "summary": "『ペール・ギュント』『ピアノ協奏曲イ短調』で北欧の精神を世界に伝えたノルウェー国民楽派の父。身長152cm、病弱な体で民族音楽を集めながら、フィヨルドの湖畔で孤高の音楽を書き続けた。",
        "events": [
            {"year": 1843, "age": 0, "title": "ベルゲンに誕生", "detail": "母ゲジーネはピアニスト、父はイギリス系商人。5歳からピアノを学ぶ。", "tags": []},
            {"year": 1858, "age": 15, "title": "ライプツィヒ音楽院へ", "detail": "ヴァイオリニスト、オーレ・ブルの勧めで留学。4年間で結核を患う。", "tags": ["turning_encounter", "illness"]},
            {"year": 1864, "age": 21, "title": "作曲家リカルド・ノードロークと出会う", "detail": "ノルウェー国民楽派の路線を決定づけた親友。翌年ノードロークは25歳で結核死。", "tags": ["turning_encounter", "loss"]},
            {"year": 1867, "age": 24, "title": "従妹ニーナと結婚", "detail": "家族の反対を押し切って。生涯の伴侶で最良の歌手解釈者に。", "tags": ["turning_encounter", "parent_conflict"]},
            {"year": 1868, "age": 25, "title": "『ピアノ協奏曲イ短調』完成", "detail": "ロマン派協奏曲の名曲中の名曲。リストから絶賛される。", "tags": ["breakthrough"]},
            {"year": 1869, "age": 26, "title": "一人娘アレクサンドラを肺炎で失う", "detail": "13ヶ月の最愛の娘。二度と子はもうけなかった。", "tags": ["loss", "heartbreak"]},
            {"year": 1876, "age": 32, "title": "『ペール・ギュント』初演", "detail": "イプセンの劇のため書いた付随音楽。『朝』『山の魔王の宮殿にて』など永遠の旋律。", "tags": ["breakthrough"]},
            {"year": 1885, "age": 42, "title": "ベルゲン郊外トロルハウゲンに邸宅建設", "detail": "『妖精の丘』の意。以後死ぬまでここで作曲。", "tags": ["restart"]},
            {"year": 1907, "age": 64, "title": "ベルゲンで死去", "detail": "『時間がないのだ、もっと書きたい』が最後の言葉。妻ニーナが『永遠の別れ』を歌った。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "私の音楽は、フィヨルドの香りがしなければならない。", "source": "グリーグの手紙"},
            {"text": "ショパンから詩を、シューマンから独創性を、ワーグナーから力を、そしてノルウェーから魂を学んだ。", "source": "自伝"},
            {"text": "作曲家は自分を偽れない。その音楽はその人自身だ。", "source": "書簡"}
        ],
        "relations": [
            {"name": "ニーナ・ハーゲルプ", "relation": "妻・従妹", "years": "1867–1907", "note": "生涯の理解者・歌手"},
            {"name": "リカルド・ノードロク", "relation": "親友", "note": "ノルウェー国民楽派の同志。早世で深い喪失を残した"},
            {"name": "フランツ・リスト", "id": "liszt", "relation": "応援者", "note": "ピアノ協奏曲を見て絶賛した"}
        ],
        "places": [
            {"name": "トロルハウゲン", "location": "ノルウェー・ベルゲン", "note": "グリーグが晩年を過ごした家と記念館"}
        ],
        "books": [],
        "works": [
            {"title": "ピアノ協奏曲 イ短調 作品16", "year": 1868, "type": "協奏曲", "description": "ロマン派協奏曲の最高峰", "youtubeId": "-oS76E5zdo8"},
            {"title": "ペール・ギュント 組曲第1番『朝』", "year": 1875, "type": "管弦楽", "description": "世界で最も有名な『朝の音楽』", "youtubeId": "kOrj02vjU88"},
            {"title": "『山の魔王の宮殿にて』", "year": 1875, "type": "管弦楽", "description": "地底を駆け抜ける緊迫のクレッシェンド", "youtubeId": "xkrB6ZNJqrM"},
            {"title": "ホルベルク組曲 作品40", "year": 1884, "type": "管弦楽", "description": "ノルウェーの劇作家への献呈曲", "youtubeId": "7kUH3b1GPw0"},
            {"title": "叙情小品集", "year": 1867, "type": "ピアノ曲", "description": "66曲の小品集。グリーグの日記のような音楽", "youtubeId": "KCnJKwfvAoY"}
        ]
    },
    {
        "id": "dvorak", "name": "アントニン・ドヴォルザーク", "nameEn": "Antonín Dvořák",
        "birth": 1841, "death": 1904, "country": "チェコ", "field": "作曲家",
        "summary": "『新世界より』でチェコの心を世界に運んだ国民楽派。肉屋の息子からプラハ音楽院院長、さらにアメリカで黒人霊歌に出会い新大陸の音楽史を変えた。鉄道と鳩を愛した素朴な人。",
        "events": [
            {"year": 1841, "age": 0, "title": "プラハ近郊ネラホゼヴェスの肉屋に誕生", "detail": "父は宿屋と肉屋を営む。家業を継ぐはずだった。", "tags": []},
            {"year": 1857, "age": 16, "title": "プラハ・オルガン学校入学", "detail": "家業に反対されながらも音楽へ。在学中からオーケストラでヴィオラを弾く。", "tags": ["parent_conflict", "restart"]},
            {"year": 1874, "age": 33, "title": "国家作曲奨励賞を5年連続受賞", "detail": "ブラームスが審査員。その後ブラームスから楽譜出版社ジムロックを紹介され一夜で世界的作曲家に。", "tags": ["turning_encounter", "approval"]},
            {"year": 1877, "age": 36, "title": "3人の子を1年で失う", "detail": "長女・長男・末娘が次々死去。『スターバト・マーテル』を書き始める。", "tags": ["loss"]},
            {"year": 1892, "age": 51, "title": "ニューヨーク音楽院院長として渡米", "detail": "年俸15,000ドル（当時のチェコ首相の25倍）で招聘。", "tags": ["restart"]},
            {"year": 1893, "age": 52, "title": "『新世界より』作曲、カーネギーホール初演", "detail": "黒人霊歌・インディアン旋律に触発。最も愛される交響曲の一つに。", "tags": ["breakthrough"]},
            {"year": 1895, "age": 54, "title": "ホームシックでチェコへ帰国", "detail": "アメリカの喧騒に疲れた。以後プラハでチェコの田舎と鳩と機関車を愛する生活。", "tags": ["restart"]},
            {"year": 1904, "age": 62, "title": "プラハで脳卒中により死去", "detail": "国葬。チェコ各地で汽笛が鳴り響いた。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "黒人霊歌の中にこそ、アメリカ音楽の将来がある。", "source": "ニューヨーク・ヘラルド 1893"},
            {"text": "私は常にチェコの作曲家である。ただ、それだけである。", "source": "書簡"},
            {"text": "神と、愛と、そして作曲のほかに、人生に何があろう。", "source": "ドヴォルザークの言葉"}
        ],
        "relations": [
            {"name": "ヨハネス・ブラームス", "id": "brahms", "relation": "恩人", "note": "ドヴォルザークを世に出した先輩作曲家"},
            {"name": "アンナ・チェルマーコヴァー", "relation": "妻", "years": "1873–1904", "note": "9人の子のうち6人が成人した"}
        ],
        "places": [
            {"name": "ドヴォルザーク記念館", "location": "チェコ・プラハ", "note": "最晩年の住居が博物館に"},
            {"name": "ネラホゼヴェス", "location": "チェコ中部", "note": "生家"}
        ],
        "books": [],
        "works": [
            {"title": "交響曲第9番『新世界より』ホ短調 作品95", "year": 1893, "type": "交響曲", "description": "アメリカでの滞在が生んだチェコ人の交響曲", "youtubeId": "bNMT1-Rn1kQ"},
            {"title": "チェロ協奏曲 ロ短調 作品104", "year": 1895, "type": "協奏曲", "description": "チェロ協奏曲の金字塔。ブラームスが聴いて『自分にも書けたのに』と涙したという", "youtubeId": "Q3zuxTqf0FU"},
            {"title": "弦楽四重奏曲第12番『アメリカ』", "year": 1893, "type": "室内楽", "description": "アイオワ州スピルヴィルで書かれた明るい傑作", "youtubeId": "o2qe10FDTS8"},
            {"title": "スラヴ舞曲集", "year": 1878, "type": "管弦楽", "description": "ブラームスの勧めで書き世界的大ヒット", "youtubeId": "6EKXdYuqqTs"},
            {"title": "ユモレスク 作品101-7", "year": 1894, "type": "ピアノ曲", "description": "最も愛されるサロン小品", "youtubeId": "7Ej4x-W91XU"}
        ]
    },
    {
        "id": "smetana", "name": "ベドルジハ・スメタナ", "nameEn": "Bedřich Smetana",
        "birth": 1824, "death": 1884, "country": "チェコ", "field": "作曲家",
        "summary": "チェコ国民楽派の祖。『我が祖国』で自国の河と伝説を永遠の音楽にした。50歳で突然の聴覚喪失、晩年は精神病院で亡くなった悲劇の音楽家。",
        "events": [
            {"year": 1824, "age": 0, "title": "リトミシュルに醸造所主の息子として誕生", "detail": "18人兄弟の11番目、男子として最初に生き延びた子。", "tags": []},
            {"year": 1848, "age": 24, "title": "プラハ革命（ヨーロッパ1848年革命）に参加", "detail": "バリケードを築きチェコ独立を歌った。以後チェコ民族音楽を志す。", "tags": ["turning_encounter"]},
            {"year": 1866, "age": 42, "title": "『売られた花嫁』初演で大成功", "detail": "チェコ語オペラの金字塔。民族音楽の誇りを取り戻した。", "tags": ["breakthrough"]},
            {"year": 1874, "age": 50, "title": "突然両耳が聞こえなくなる", "detail": "8月に右耳、10月に左耳。ベートーヴェン以来の悲劇。", "tags": ["loss", "illness", "pride_broken"]},
            {"year": 1874, "age": 50, "title": "完全な聴覚喪失の中で『我が祖国』作曲開始", "detail": "ブルタバ（モルダウ）など6曲の交響詩連作。『私の頭の中で聴く』", "tags": ["breakthrough", "restart"]},
            {"year": 1884, "age": 60, "title": "プラハの精神病院で死去", "detail": "梅毒による進行麻痺で錯乱し、入院後3週間で逝った。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "私の耳は死んでも、私の音楽は生き続ける。", "source": "スメタナの言葉"},
            {"text": "ブルタバの流れは、チェコの魂である。", "source": "『我が祖国』序"}
        ],
        "relations": [
            {"name": "フランツ・リスト", "id": "liszt", "relation": "支援者", "note": "若きスメタナを応援した"},
            {"name": "ドヴォルザーク", "id": "dvorak", "relation": "後輩", "note": "スメタナの系譜を継いだチェコの国民楽派"}
        ],
        "places": [
            {"name": "スメタナ博物館", "location": "チェコ・プラハ", "note": "カレル橋の横の博物館"}
        ],
        "books": [],
        "works": [
            {"title": "連作交響詩『我が祖国』", "year": 1879, "type": "管弦楽", "description": "6曲連作の民族叙事詩", "youtubeId": "9-ZFpOoJtSA"},
            {"title": "交響詩『モルダウ（ブルタバ）』", "year": 1874, "type": "管弦楽", "description": "2つの源流から大河へ。連作中の最有名曲", "youtubeId": "lJ-yOZyfacY"},
            {"title": "歌劇『売られた花嫁』序曲", "year": 1866, "type": "オペラ", "description": "チェコ語オペラの金字塔", "youtubeId": "n5IizcwFOoc"},
            {"title": "弦楽四重奏曲第1番『わが生涯より』", "year": 1876, "type": "室内楽", "description": "聴覚喪失の恐怖を音にした自伝的四重奏曲", "youtubeId": "0H-E-SsdAhs"}
        ]
    },
    {
        "id": "mussorgsky", "name": "モデスト・ムソルグスキー", "nameEn": "Modest Mussorgsky",
        "birth": 1839, "death": 1881, "country": "ロシア", "field": "作曲家",
        "summary": "ロシア五人組の異才。音楽院で学ばず独学で『展覧会の絵』『ボリス・ゴドゥノフ』を書いた。アルコール依存で42歳で死去。死後リムスキー＝コルサコフが楽譜を整理し世界へ。",
        "events": [
            {"year": 1839, "age": 0, "title": "カレヴォ村の地主の家に誕生", "detail": "ロシア貴族の4男として。", "tags": []},
            {"year": 1858, "age": 19, "title": "陸軍を退役、音楽家への道", "detail": "バラキレフに師事。ロシア五人組のメンバーに。", "tags": ["restart"]},
            {"year": 1861, "age": 22, "title": "農奴解放令で一家が没落", "detail": "生活苦に陥り下級官吏として働きながら作曲。", "tags": ["poverty"]},
            {"year": 1865, "age": 26, "title": "最愛の母が死去", "detail": "この喪失から『死の歌と踊り』などの暗い傑作が生まれる。アルコール依存の始まり。", "tags": ["loss", "heartbreak"]},
            {"year": 1869, "age": 30, "title": "歌劇『ボリス・ゴドゥノフ』完成", "detail": "民衆の声を主役にした新しい歴史オペラ。当時は奇怪と評された。", "tags": ["breakthrough"]},
            {"year": 1874, "age": 35, "title": "『展覧会の絵』作曲", "detail": "親友・画家ハルトマンの追悼展を巡る音楽的散歩。", "tags": ["breakthrough", "loss"]},
            {"year": 1881, "age": 42, "title": "ペテルブルクの病院でアルコール性せん妄により死去", "detail": "肖像画はレーピンが死の直前に描いた赤い鼻の名作。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "音楽は、魂と魂のあいだの電話である。", "source": "ムソルグスキーの言葉"},
            {"text": "真の芸術とは、人間そのものを描くことである。", "source": "書簡"}
        ],
        "relations": [
            {"name": "ミリイ・バラキレフ", "relation": "師", "note": "ロシア五人組の指導者"},
            {"name": "リムスキー＝コルサコフ", "relation": "同僚", "note": "死後に楽譜を校訂・オーケストレーションした"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "組曲『展覧会の絵』", "year": 1874, "type": "ピアノ曲", "description": "親友の遺作を巡る音楽的散歩。ラヴェル編が有名", "youtubeId": "YOuRA4Wf2HQ"},
            {"title": "歌劇『ボリス・ゴドゥノフ』", "year": 1869, "type": "オペラ", "description": "民衆を主役にしたロシア歴史オペラの傑作", "youtubeId": "zQD8CYtDiqE"},
            {"title": "交響詩『はげ山の一夜』", "year": 1867, "type": "管弦楽", "description": "『ファンタジア』で世界的に有名に", "youtubeId": "R3RF_3wMpF4"}
        ]
    },
    {
        "id": "rimsky_korsakov", "name": "ニコライ・リムスキー＝コルサコフ", "nameEn": "Nikolai Rimsky-Korsakov",
        "birth": 1844, "death": 1908, "country": "ロシア", "field": "作曲家",
        "summary": "海軍士官から作曲家へ転身したロシア五人組の一人。『シェエラザード』の官能的な響き、色彩豊かなオーケストレーションで知られる。ストラヴィンスキー・プロコフィエフを育てた。",
        "events": [
            {"year": 1844, "age": 0, "title": "海軍士官家族の三男として誕生", "detail": "12歳で海軍兵学校へ。", "tags": []},
            {"year": 1862, "age": 18, "title": "海軍練習艦『アルマーズ』で世界一周航海", "detail": "ロンドン・ブラジル・ニューヨーク・セイロンを巡る。海のイメージは以後の作品に。", "tags": ["restart"]},
            {"year": 1865, "age": 21, "title": "バラキレフに師事、ロシア五人組に", "detail": "独学の航海士が一気に作曲家に。", "tags": ["turning_encounter"]},
            {"year": 1871, "age": 27, "title": "ペテルブルク音楽院作曲教授に", "detail": "自分が受けたこともない学問を教えることになり、猛勉強で和声学・対位法をマスター。", "tags": ["restart"]},
            {"year": 1888, "age": 44, "title": "『シェエラザード』作曲", "detail": "千夜一夜物語から着想した色彩的な管弦楽の傑作。", "tags": ["breakthrough"]},
            {"year": 1905, "age": 61, "title": "学生蜂起を擁護し音楽院から解雇", "detail": "同僚が抗議辞職し復職。民主主義者の顔も。", "tags": ["pride_broken"]},
            {"year": 1908, "age": 64, "title": "心臓発作で死去", "detail": "最後のオペラ『金鶏』は検閲で初演できなかった。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "オーケストレーションは作曲である。", "source": "『管弦楽法の原理』"},
            {"text": "真の教師は、生徒に『自分の道を見つけよ』と言う者だ。", "source": "書簡"}
        ],
        "relations": [
            {"name": "イーゴリ・ストラヴィンスキー", "id": "stravinsky", "relation": "弟子", "note": "最愛の弟子。死後も作曲の基礎として感謝した"},
            {"name": "ムソルグスキー", "id": "mussorgsky", "relation": "同僚・親友", "note": "死後に未完作を校訂した"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "交響組曲『シェエラザード』作品35", "year": 1888, "type": "管弦楽", "description": "千夜一夜物語の官能的な色彩", "youtubeId": "QoCqr2bK7OM"},
            {"title": "『熊蜂の飛行』", "year": 1900, "type": "管弦楽", "description": "歌劇『サルタン皇帝の物語』より、超絶技巧の小品", "youtubeId": "S8wuHvVoEQk"},
            {"title": "スペイン奇想曲 作品34", "year": 1887, "type": "管弦楽", "description": "華やかなスペイン情緒", "youtubeId": "LkgZHb5SjbM"}
        ]
    },
    {
        "id": "saint_saens", "name": "カミーユ・サン＝サーンス", "nameEn": "Camille Saint-Saëns",
        "birth": 1835, "death": 1921, "country": "フランス", "field": "作曲家",
        "summary": "3歳でピアノ演奏、5歳で作曲を始めた天才。パリ国立歌劇場で2時間モーツァルトの全協奏曲を暗譜演奏。数学・天文学・考古学も学者並みの博識家。86年の生涯で300曲以上。",
        "events": [
            {"year": 1835, "age": 0, "title": "パリで誕生、生後3ヶ月で父を失う", "detail": "大叔母マソン夫人に育てられる。2歳半でピアノに向かう。", "tags": ["parent_conflict"]},
            {"year": 1846, "age": 10, "title": "パリ公開コンサートデビュー、アンコールでベートーヴェン32曲のソナタ全曲から1曲選択可能を提示", "detail": "演奏会後、異例の反響。", "tags": ["approval"]},
            {"year": 1853, "age": 17, "title": "サン=メリー教会オルガニストに", "detail": "マドレーヌ教会オルガニストを経て20年在職。リストは『世界最高のオルガニスト』と絶賛。", "tags": ["approval"]},
            {"year": 1871, "age": 35, "title": "国民音楽協会設立", "detail": "フランス作曲家の自立を目指す。フランク・フォーレらと。", "tags": ["breakthrough"]},
            {"year": 1878, "age": 42, "title": "長男アンドレを6歳で失う、同年次男も乳幼児死", "detail": "同じ年に2人の息子を失い、結婚生活も崩壊。以後独居。", "tags": ["loss", "heartbreak"]},
            {"year": 1886, "age": 51, "title": "『動物の謝肉祭』作曲（生前は公開禁止）", "detail": "ユーモアが自分の威厳を傷つけると恐れ、『白鳥』以外公開を禁じた。死後大ヒット。", "tags": ["breakthrough"]},
            {"year": 1921, "age": 86, "title": "アルジェで肺炎により死去", "detail": "冬を温かい地で過ごす習慣。最後まで世界を旅した。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽は建築と科学の子供である。", "source": "サン=サーンスの言葉"},
            {"text": "趣味は不滅ではない。流行は滅びる。", "source": "書簡"}
        ],
        "relations": [
            {"name": "ガブリエル・フォーレ", "relation": "弟子", "note": "生涯最愛の弟子"},
            {"name": "フランツ・リスト", "id": "liszt", "relation": "親友", "note": "オルガンを絶賛した先輩"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "交響曲第3番『オルガン付き』ハ短調 作品78", "year": 1886, "type": "交響曲", "description": "オルガン付きの壮大な交響曲", "youtubeId": "HfRQacLN6u0"},
            {"title": "組曲『動物の謝肉祭』", "year": 1886, "type": "管弦楽", "description": "『白鳥』『水族館』で永遠に愛される動物寓話", "youtubeId": "S2Vl_KlM_-Y"},
            {"title": "ヴァイオリン協奏曲第3番 ロ短調 作品61", "year": 1880, "type": "協奏曲", "description": "サラサーテに捧げた名作", "youtubeId": "PW6Bp7QmIAQ"},
            {"title": "『死の舞踏』作品40", "year": 1874, "type": "管弦楽", "description": "真夜中に踊る骸骨の交響詩", "youtubeId": "YyknBTm_YyM"}
        ]
    },
    {
        "id": "faure", "name": "ガブリエル・フォーレ", "nameEn": "Gabriel Fauré",
        "birth": 1845, "death": 1924, "country": "フランス", "field": "作曲家",
        "summary": "『レクイエム』『夢のあとに』で優美な旋律を残したフランス後期ロマン派の象徴。サン=サーンスの弟子、ラヴェルの師。晩年は耳が遠くなりながら静かな内省の音楽を書いた。",
        "events": [
            {"year": 1845, "age": 0, "title": "南仏パミエに小学校長の子として誕生", "detail": "6人兄弟の末っ子。8歳でエコール・ニデルメイエールへ。", "tags": []},
            {"year": 1861, "age": 16, "title": "サン=サーンスに師事", "detail": "25年後まで続く師弟愛。", "tags": ["turning_encounter"]},
            {"year": 1870, "age": 25, "title": "普仏戦争に従軍", "detail": "狙撃兵として戦場へ。パリ・コミューンも目撃。", "tags": ["restart"]},
            {"year": 1888, "age": 43, "title": "『レクイエム』作曲", "detail": "父・母の喪に書いた優美な死の音楽。『子守歌のような』と自ら評した。", "tags": ["breakthrough", "loss"]},
            {"year": 1905, "age": 60, "title": "パリ音楽院院長に", "detail": "ドビュッシー・ラヴェルなどを育てる改革を実行。", "tags": ["breakthrough"]},
            {"year": 1911, "age": 66, "title": "聴覚の衰え進行", "detail": "特に高音と低音が歪んで聴こえる苦しい聴覚障害。それでも作曲は続けた。", "tags": ["illness"]},
            {"year": 1924, "age": 79, "title": "パリで死去", "detail": "国葬でレクイエムが演奏された。", "tags": ["loss", "approval"]}
        ],
        "quotes": [
            {"text": "音楽は、不可能なものへの渇望である。", "source": "フォーレの手紙"},
            {"text": "静けさと微光——それが私の音楽の本質だ。", "source": "弟子への手紙"}
        ],
        "relations": [
            {"name": "サン=サーンス", "id": "saint_saens", "relation": "師", "note": "生涯の師であり友"},
            {"name": "ラヴェル", "id": "ravel", "relation": "弟子", "note": "優秀な門下生"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "レクイエム ニ短調 作品48", "year": 1888, "type": "宗教曲", "description": "優美で慈愛に満ちた『死の子守歌』", "youtubeId": "BbODixvUrLw"},
            {"title": "『夢のあとに』作品7-1", "year": 1877, "type": "歌曲", "description": "最も愛される歌曲", "youtubeId": "Xi_Q9wXJfqs"},
            {"title": "パヴァーヌ 嬰ヘ短調 作品50", "year": 1887, "type": "管弦楽", "description": "優雅な古典舞曲", "youtubeId": "dlbKHhNuBmI"},
            {"title": "シチリアーノ 作品78", "year": 1893, "type": "室内楽", "description": "フルートとピアノのための名品", "youtubeId": "yDKsE9WYX6c"},
            {"title": "ノクターン第6番 変ニ長調 作品63", "year": 1894, "type": "ピアノ曲", "description": "フォーレ中期の傑作ノクターン"}
        ]
    },
    {
        "id": "berlioz", "name": "エクトル・ベルリオーズ", "nameEn": "Hector Berlioz",
        "birth": 1803, "death": 1869, "country": "フランス", "field": "作曲家",
        "summary": "『幻想交響曲』でロマン派管弦楽を革新。アヘンによる陶酔体験を音楽にした革命児。オペラ・交響曲・批評・自伝に才を発揮、評価は死後50年待たねばならなかった。",
        "events": [
            {"year": 1803, "age": 0, "title": "グルノーブル近郊コート・サン・タンドレの医師の家に誕生", "detail": "父は息子を医者にしたがった。", "tags": ["parent_conflict"]},
            {"year": 1821, "age": 18, "title": "パリで医学校に通うが死体解剖に耐えられず音楽へ", "detail": "父の激怒と仕送り停止で極貧に。", "tags": ["parent_conflict", "restart", "poverty"]},
            {"year": 1827, "age": 24, "title": "英国女優ハリエット・スミッソンに恋", "detail": "シェイクスピア劇のオフィーリア役。5年越しの片思いが『幻想交響曲』の種。", "tags": ["heartbreak", "turning_encounter"]},
            {"year": 1830, "age": 26, "title": "『幻想交響曲』初演＆ローマ大賞", "detail": "失恋の苦痛を『芸術家の生涯のエピソード』として音楽化した革命的交響曲。", "tags": ["breakthrough"]},
            {"year": 1833, "age": 30, "title": "ハリエットとついに結婚", "detail": "しかし10年で別居。1854年彼女の死の数ヶ月後に内縁妻と結婚したが2人も先に死んだ。", "tags": ["heartbreak", "turning_encounter"]},
            {"year": 1867, "age": 64, "title": "一人息子ルイを黄熱病で失う", "detail": "息子は海軍軍人だった。死を嘆いたベルリオーズは翌年から急速に衰弱。", "tags": ["loss"]},
            {"year": 1869, "age": 65, "title": "パリで死去", "detail": "『最後に私を理解した』といったロシアの聴衆の思い出だけが慰めだった。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽は愛である。私の愛は音楽である。", "source": "『回想録』"},
            {"text": "時間だけが、真の批評家である。", "source": "書簡"}
        ],
        "relations": [
            {"name": "フランツ・リスト", "id": "liszt", "relation": "親友", "note": "同時代の理解者"},
            {"name": "ハリエット・スミッソン", "relation": "妻（最初）", "note": "幻想交響曲の『永遠の女性』"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "幻想交響曲 作品14", "year": 1830, "type": "交響曲", "description": "失恋の幻覚を音楽化したロマン派の革命", "youtubeId": "sNg6q4uxyuI"},
            {"title": "劇的交響曲『ロメオとジュリエット』作品17", "year": 1839, "type": "交響曲", "description": "シェイクスピアへの音楽的賛歌", "youtubeId": "v4zDaKkrRBw"},
            {"title": "歌劇『ファウストの劫罰』ラコッツィ行進曲", "year": 1846, "type": "管弦楽", "description": "華やかな軍隊行進曲", "youtubeId": "nqCLd1xdDvg"}
        ]
    },
    {
        "id": "scriabin", "name": "アレクサンドル・スクリャービン", "nameEn": "Alexander Scriabin",
        "birth": 1872, "death": 1915, "country": "ロシア", "field": "作曲家",
        "summary": "色と音楽を結合した『神秘和音』の創始者。ショパン的ピアノ曲から神秘主義へ進化し、『人類を変える大宇宙作品』を構想したまま43歳で死去。",
        "events": [
            {"year": 1872, "age": 0, "title": "モスクワに誕生、生後1年で母をピアノ演奏中の結核で失う", "detail": "母は有名なピアニスト。スクリャービンは母の血を引く。", "tags": ["parent_conflict", "loss"]},
            {"year": 1882, "age": 10, "title": "モスクワ音楽院へ、ラフマニノフと同級生", "detail": "ピアノで金メダル、作曲で銀メダル（ラフマニノフは作曲金）。", "tags": ["turning_encounter"]},
            {"year": 1894, "age": 22, "title": "右手を壊しピアニスト生命の危機", "detail": "リスト超絶技巧に挑戦しすぎた代償。左手のための曲で乗り切った。", "tags": ["pride_broken", "illness"]},
            {"year": 1904, "age": 32, "title": "妻子を捨ててタチアナへ", "detail": "熱心なソリプシスト（唯我論者）として神秘主義に傾倒。", "tags": ["heartbreak", "restart"]},
            {"year": 1910, "age": 38, "title": "『プロメテウス』初演、世界初の色光楽器付き", "detail": "音と色を対応させる光楽器『ルーチェ』を楽譜に記載。", "tags": ["breakthrough"]},
            {"year": 1915, "age": 43, "title": "敗血症でモスクワに急死", "detail": "唇のニキビから細菌感染。『神秘劇』構想を残したまま。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "私は神である。", "source": "日記（神秘主義時代）"},
            {"text": "音楽は宇宙を変える力を持つ。", "source": "スクリャービンの言葉"}
        ],
        "relations": [
            {"name": "ラフマニノフ", "id": "rachmaninoff", "relation": "同級生・友", "note": "モスクワ音楽院の同期"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "ピアノソナタ第5番 作品53", "year": 1907, "type": "ピアノ曲", "description": "『法悦の詩』の精神を込めた革新的ソナタ", "youtubeId": "_bCGdLdlFdk"},
            {"title": "法悦の詩 作品54", "year": 1908, "type": "管弦楽", "description": "官能と恍惚の交響詩", "youtubeId": "Ybs4o4L38Do"},
            {"title": "プロメテウス 火の詩 作品60", "year": 1910, "type": "管弦楽", "description": "色光楽器付きの神秘主義の極致", "youtubeId": "4t8jNqKeVK8"},
            {"title": "前奏曲集 作品11", "year": 1896, "type": "ピアノ曲", "description": "ショパン的な24の前奏曲", "youtubeId": "8LCH1UJpNiE"},
            {"title": "エチュード嬰ニ短調 作品8-12", "year": 1894, "type": "ピアノ曲", "description": "悲愴で激しい練習曲", "youtubeId": "qctmUnKU7Mk"}
        ]
    },
    {
        "id": "respighi", "name": "オットリーノ・レスピーギ", "nameEn": "Ottorino Respighi",
        "birth": 1879, "death": 1936, "country": "イタリア", "field": "作曲家",
        "summary": "『ローマの噴水』『ローマの松』『ローマの祭』で母なる古都をオーケストラで描いた色彩の巨匠。リムスキー＝コルサコフに学び、管弦楽法の頂点に達した。",
        "events": [
            {"year": 1879, "age": 0, "title": "ボローニャに誕生", "detail": "父はピアノ教師。", "tags": []},
            {"year": 1900, "age": 21, "title": "ロシアでリムスキー＝コルサコフに師事", "detail": "5ヶ月だけの短い師事だが人生を決めた。", "tags": ["turning_encounter"]},
            {"year": 1917, "age": 38, "title": "『ローマの噴水』初演", "detail": "4つの噴水の4つの時間。色彩の革命。", "tags": ["breakthrough"]},
            {"year": 1924, "age": 45, "title": "『ローマの松』完成", "detail": "アッピア街道の終章は管弦楽法の頂点。", "tags": ["breakthrough"]},
            {"year": 1936, "age": 56, "title": "ローマで感染症により死去", "detail": "歌劇『ルクレツィア』を未完で残した。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "古代は失われたのではない。音楽の中に眠っている。", "source": "レスピーギの言葉"}
        ],
        "relations": [
            {"name": "リムスキー＝コルサコフ", "id": "rimsky_korsakov", "relation": "師", "note": "ペテルブルクで5ヶ月師事"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "交響詩『ローマの松』", "year": 1924, "type": "管弦楽", "description": "『アッピア街道の松』のクライマックスは圧巻", "youtubeId": "7v4nrTfyCUU"},
            {"title": "交響詩『ローマの噴水』", "year": 1917, "type": "管弦楽", "description": "4つの噴水が刻む時間", "youtubeId": "-SQ_LYdFZTQ"},
            {"title": "交響詩『ローマの祭』", "year": 1928, "type": "管弦楽", "description": "ローマ三部作の完結編", "youtubeId": "3L7JlymQZLg"}
        ]
    },
    {
        "id": "copland", "name": "アーロン・コープランド", "nameEn": "Aaron Copland",
        "birth": 1900, "death": 1990, "country": "アメリカ", "field": "作曲家",
        "summary": "『アパラチアの春』『市民のためのファンファーレ』でアメリカ音楽の音を確立した20世紀の巨匠。ゲイであることを秘めながら、開拓者精神の音楽を書き続けた。",
        "events": [
            {"year": 1900, "age": 0, "title": "ニューヨーク・ブルックリンのユダヤ移民家庭に誕生", "detail": "ロシアからの移民5男。", "tags": []},
            {"year": 1921, "age": 21, "title": "パリでナディア・ブーランジェに師事", "detail": "アメリカ人作曲家の黄金世代を育てた名教師。", "tags": ["turning_encounter"]},
            {"year": 1944, "age": 44, "title": "『アパラチアの春』初演", "detail": "ピューリッツァー賞受賞。マーサ・グレアム振付バレエ。", "tags": ["breakthrough"]},
            {"year": 1953, "age": 53, "title": "マッカーシー赤狩りで召喚", "detail": "共産主義疑惑で議会証言。作品演奏がキャンセルされる時期。", "tags": ["pride_broken"]},
            {"year": 1990, "age": 90, "title": "ニューヨークで死去", "detail": "アルツハイマー病の晩年だった。", "tags": ["loss", "illness"]}
        ],
        "quotes": [
            {"text": "すべての偉大な音楽は、愛と死の間で書かれている。", "source": "コープランドの言葉"}
        ],
        "relations": [
            {"name": "レナード・バーンスタイン", "relation": "友・弟子筋", "note": "コープランドを『アメリカ音楽の学長』と呼んだ"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "バレエ『アパラチアの春』組曲", "year": 1944, "type": "バレエ", "description": "ピューリッツァー賞。『シンプル・ギフツ』の変奏", "youtubeId": "T_ON2eXYzzM"},
            {"title": "市民のためのファンファーレ", "year": 1942, "type": "管弦楽", "description": "戦時中の市民を讃える勇壮なファンファーレ", "youtubeId": "6oSeZZtNYEU"},
            {"title": "バレエ『ロデオ』", "year": 1942, "type": "バレエ", "description": "西部カウボーイの音楽", "youtubeId": "MEoJn5cmR80"}
        ]
    },
    {
        "id": "bernstein", "name": "レナード・バーンスタイン", "nameEn": "Leonard Bernstein",
        "birth": 1918, "death": 1990, "country": "アメリカ", "field": "作曲家・指揮者",
        "summary": "『ウェスト・サイド物語』で世界を変えた作曲家＆ニューヨーク・フィル音楽監督。マーラーの復活を推進し、クラシックと現代を架橋した最大のスター。",
        "events": [
            {"year": 1918, "age": 0, "title": "マサチューセッツのウクライナ系ユダヤ人家庭に誕生", "detail": "本名はルイス。", "tags": []},
            {"year": 1943, "age": 25, "title": "ニューヨーク・フィル副指揮者、急な代役で大成功", "detail": "指揮者ブルーノ・ワルターが病気で欠場、前日知らされて振った11月14日の演奏会が全米ラジオ中継で大反響。スター誕生。", "tags": ["breakthrough"]},
            {"year": 1957, "age": 39, "title": "『ウェスト・サイド物語』初演", "detail": "ロメオとジュリエットを50年代NYに置き換えたミュージカル。映画でも大ヒット。", "tags": ["breakthrough"]},
            {"year": 1958, "age": 40, "title": "ニューヨーク・フィル音楽監督（アメリカ人初）", "detail": "11年間の伝説的音楽監督時代。『ヤング・ピープルズ・コンサート』でクラシックを子供たちに。", "tags": ["approval"]},
            {"year": 1989, "age": 71, "title": "ベルリンの壁崩壊で『第九』歓喜", "detail": "『歓喜(Freude)』を『自由(Freiheit)』に変えて指揮。", "tags": []},
            {"year": 1990, "age": 72, "title": "引退5日後に心不全で死去", "detail": "最後まで仕事とタバコを愛した。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "音楽の意味は、言葉の外にある。", "source": "『音楽の喜び』"},
            {"text": "芸術家に何ができるか。芸術家には世界を変える力がある。", "source": "ヒューストン大学の演説"},
            {"text": "これは怒りと復讐を超えて、愛だけを残そうという試みだった。", "source": "ベルリンでの演奏について"}
        ],
        "relations": [
            {"name": "グスタフ・マーラー", "id": "mahler", "relation": "心酔した先人", "note": "バーンスタインがマーラーを世界に再発見させた"},
            {"name": "アーロン・コープランド", "id": "copland", "relation": "師", "note": "アメリカ音楽の師"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "ミュージカル『ウェスト・サイド物語』", "year": 1957, "type": "ミュージカル", "description": "『トゥナイト』『マリア』『アメリカ』など永遠の名曲", "youtubeId": "A5jcZKnvWD8"},
            {"title": "キャンディード 序曲", "year": 1956, "type": "管弦楽", "description": "陽気で機知に富む序曲", "youtubeId": "ZUkpOuuiGVU"},
            {"title": "ミサ曲", "year": 1971, "type": "劇的作品", "description": "ケネディ・センター開幕のための意欲作", "youtubeId": "PtJpC8b_fAQ"}
        ]
    },
    {
        "id": "ryuichi_sakamoto", "name": "坂本龍一", "nameEn": "Ryuichi Sakamoto",
        "birth": 1952, "death": 2023, "country": "日本", "field": "作曲家",
        "summary": "YMOで世界を驚かせたポップ・レジェンドから、『戦場のメリークリスマス』『ラスト・エンペラー』の映画音楽で国際的な賞を獲得した『教授』。晩年は環境活動と自作の最期に向き合った。",
        "events": [
            {"year": 1952, "age": 0, "title": "東京に出版社経営者の子として誕生", "detail": "父・坂本一亀は三島由紀夫らの編集者。", "tags": []},
            {"year": 1978, "age": 26, "title": "YMO結成、高橋幸宏・細野晴臣と", "detail": "テクノポップで世界を変えた。", "tags": ["breakthrough"]},
            {"year": 1983, "age": 31, "title": "『戦場のメリークリスマス』出演＆音楽", "detail": "デヴィッド・ボウイと共演。メインテーマは世界的ヒット。", "tags": ["breakthrough"]},
            {"year": 1987, "age": 35, "title": "『ラスト・エンペラー』でアカデミー作曲賞", "detail": "日本人初のオスカー。ベルトルッチ監督の大作。", "tags": ["approval"]},
            {"year": 2014, "age": 62, "title": "咽頭がん、のち直腸がんと闘病", "detail": "以後の生涯を治療と作曲に捧げる。", "tags": ["illness"]},
            {"year": 2023, "age": 71, "title": "東京で死去", "detail": "最後のアルバム『12』と、オンラインピアノコンサートを残して。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "Ars longa, vita brevis.（芸術は長く、人生は短い）", "source": "坂本龍一が好んだ格言"},
            {"text": "僕たちは地球の使用人だ。", "source": "環境活動について"}
        ],
        "relations": [
            {"name": "デヴィッド・ボウイ", "relation": "共演者・友", "note": "『戦場のメリークリスマス』で共演"}
        ],
        "places": [
            {"name": "東京芸術大学", "location": "東京都台東区", "note": "出身校"}
        ],
        "books": [
            {"title": "音楽は自由にする", "author": "坂本龍一", "asin": "4104751022", "description": "自伝"}
        ],
        "works": [
            {"title": "戦場のメリークリスマス（メインテーマ）", "year": 1983, "type": "映画音楽", "description": "最も有名な日本発の映画音楽", "youtubeId": "gUbwQGj1w5w"},
            {"title": "Energy Flow", "year": 1999, "type": "ピアノ曲", "description": "CMで国民的ヒット", "youtubeId": "k0vXc1OmlPc"},
            {"title": "アクア（Aqua）", "year": 1999, "type": "ピアノ曲", "description": "娘のために書いた優美なピアノ曲", "youtubeId": "HoH3QIFeMkc"}
        ]
    },
    {
        "id": "hisaishi", "name": "久石譲", "nameEn": "Joe Hisaishi",
        "birth": 1950, "death": None, "country": "日本", "field": "作曲家",
        "summary": "スタジオジブリ・北野武作品の音楽で世界を魅了する作曲家。『となりのトトロ』『千と千尋の神隠し』『HANA-BI』。クラシック作曲家としての現代音楽作品も多数。",
        "events": [
            {"year": 1950, "age": 0, "title": "長野県中野市に誕生", "detail": "本名・藤澤守。", "tags": []},
            {"year": 1984, "age": 34, "title": "宮崎駿『風の谷のナウシカ』音楽", "detail": "宮崎作品全作の音楽を担当する始まり。", "tags": ["turning_encounter", "breakthrough"]},
            {"year": 1988, "age": 38, "title": "『となりのトトロ』公開", "detail": "世界中の子供に愛される曲に。", "tags": ["breakthrough"]},
            {"year": 1997, "age": 47, "title": "北野武『HANA-BI』音楽", "detail": "ヴェネツィア金獅子賞。以後北野作品の音楽を担う。", "tags": ["breakthrough", "approval"]},
            {"year": 2001, "age": 51, "title": "『千と千尋の神隠し』アカデミー賞", "detail": "日本のアニメを世界に伝えた記念作。", "tags": ["approval"]}
        ],
        "quotes": [
            {"text": "音楽は映像の感情そのものである。", "source": "久石譲の言葉"},
            {"text": "シンプルで、美しく、心に残ること。", "source": "作曲のモットー"}
        ],
        "relations": [
            {"name": "宮崎駿", "relation": "パートナー", "note": "全ジブリ作品の音楽担当"},
            {"name": "北野武", "relation": "パートナー", "note": "『HANA-BI』以降の北野作品"}
        ],
        "places": [],
        "books": [],
        "works": [
            {"title": "となりのトトロ メインテーマ", "year": 1988, "type": "映画音楽", "description": "世界中の子供に愛される旋律", "youtubeId": "epPpXpu_2VY"},
            {"title": "千と千尋の神隠し『あの夏へ』", "year": 2001, "type": "映画音楽", "description": "ピアノで語る記憶と別れ", "youtubeId": "TL3oq_k0IRQ"},
            {"title": "Summer（菊次郎の夏）", "year": 1999, "type": "映画音楽", "description": "北野武作品の代表曲", "youtubeId": "YWgaf66mq1g"},
            {"title": "Merry-Go-Round（ハウルの動く城）", "year": 2004, "type": "映画音楽", "description": "ワルツ調の永遠の名曲", "youtubeId": "i5J2dBWgFm4"}
        ]
    },
    {
        "id": "palestrina", "name": "ジョヴァンニ・パレストリーナ", "nameEn": "Giovanni Pierluigi da Palestrina",
        "birth": 1525, "death": 1594, "country": "イタリア", "field": "作曲家",
        "summary": "ルネサンス期ポリフォニー（多声部）の頂点。対抗宗教改革の中で、教会音楽の未来を守った『カトリック教会音楽の救世主』。104のミサ曲と250のモテットを残した。",
        "events": [
            {"year": 1525, "age": 0, "title": "ローマ近郊パレストリーナに誕生", "detail": "地名が後の姓になる。", "tags": []},
            {"year": 1551, "age": 26, "title": "バチカン、ジュリア礼拝堂楽長に", "detail": "法王ユリウス3世に抜擢。", "tags": ["approval"]},
            {"year": 1555, "age": 30, "title": "法王パウロ4世により既婚を理由に罷免", "detail": "妻の死、3人の子の死、自身の病まで苦難の時期。", "tags": ["pride_broken", "loss"]},
            {"year": 1567, "age": 42, "title": "『教皇マルケルスのミサ』", "detail": "トリエント公会議の多声音楽禁止論に対して『多声部でも歌詞が聞こえる』証明と伝わる。", "tags": ["breakthrough"]},
            {"year": 1594, "age": 69, "title": "ローマで死去", "detail": "聖ペテロ大聖堂楽長のまま。", "tags": ["loss"]}
        ],
        "quotes": [
            {"text": "すべての声部は、神に捧げる祈りである。", "source": "パレストリーナの言葉"}
        ],
        "relations": [],
        "places": [],
        "books": [],
        "works": [
            {"title": "教皇マルケルスのミサ", "year": 1567, "type": "宗教曲", "description": "パレストリーナ様式の完成", "youtubeId": "CcXHZONL6ck"},
            {"title": "モテット『シカット・ケルブス』", "year": 1580, "type": "宗教曲", "description": "『鹿が谷川を慕うごとく』詩篇42篇", "youtubeId": "M49N1-VDZHo"},
            {"title": "ミゼレーレ", "year": 1580, "type": "宗教曲", "description": "詩篇51篇による荘厳なミサ"}
        ]
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
    print(f"\n{added}人追加完了。合計{len(ids)}人")


if __name__ == "__main__":
    main()
