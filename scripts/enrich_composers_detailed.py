# -*- coding: utf-8 -*-
"""作曲家の年表をもっと細かく（微小イベント追加）"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

E = {
    "chopin": [
        {"year": 1817, "age": 7, "title": "最初の作品『ポロネーズ変ロ短調』", "detail": "7歳で作曲、新聞で『本物のモーツァルト的天才』と評された。", "tags": ["approval"]},
        {"year": 1825, "age": 15, "title": "ロシア皇帝アレクサンドル1世の前で演奏", "detail": "皇帝から褒章『ダイヤモンドの指輪』を贈られる。", "tags": ["approval"]},
        {"year": 1833, "age": 23, "title": "『エチュード 作品10』出版、リストに献呈", "detail": "リストは『我々よりも先を行く者だ』と評した。", "tags": ["approval"]},
        {"year": 1841, "age": 31, "title": "ショパンとサンドの『ノアンの夏』最高潮", "detail": "3ヶ月で『第2ポロネーズ』『バラード第3番』『ファンタジー』を書く。", "tags": ["breakthrough"]},
        {"year": 1848, "age": 38, "title": "パリ2月革命直前に最後のコンサート", "detail": "プレイエルホールで。客席は極少数、終演後友人に抱えられてホテルへ。", "tags": ["pride_broken", "illness"]},
    ],
    "beethoven": [
        {"year": 1770, "age": 0, "title": "ボンに父ヨハンとマリアの次男として誕生", "detail": "正確な誕生日は不明、12月17日に洗礼。", "tags": []},
        {"year": 1792, "age": 21, "title": "ウィーンに定住、ハイドンに入門", "detail": "以後ウィーンを離れず。ハイドンとの師弟関係は緊張含み。", "tags": ["turning_encounter", "restart"]},
        {"year": 1796, "age": 25, "title": "耳鳴りの初症状を自覚", "detail": "『音楽家にとって最も恐るべきもの』と日記に書く。", "tags": ["illness"]},
        {"year": 1805, "age": 34, "title": "『レオノーレ』（のち『フィデリオ』）初演失敗", "detail": "ナポレオン軍占領下のウィーンで。3度の改訂を経る。", "tags": ["pride_broken"]},
        {"year": 1814, "age": 43, "title": "ウィーン会議で全欧州の代表に演奏", "detail": "最後の輝かしい演奏家デビュー。", "tags": ["approval"]},
        {"year": 1819, "age": 48, "title": "完全失聴、会話帳で筆談始める", "detail": "以後の会話帳138冊が記録として残る。", "tags": ["illness", "isolation"]},
    ],
    "mozart": [
        {"year": 1764, "age": 8, "title": "ロンドンでJ.C.バッハに学ぶ", "detail": "『ロンドンのバッハ』から交響曲・オペラ技法を学ぶ。", "tags": ["turning_encounter"]},
        {"year": 1772, "age": 16, "title": "ザルツブルク宮廷楽師に", "detail": "月給わずか150グルデン。父の計らいで正式職。", "tags": ["approval"]},
        {"year": 1777, "age": 21, "title": "マンハイムでアロイジア・ウェーバーに恋", "detail": "後の妻コンスタンツェの姉。叶わぬ初恋。", "tags": ["heartbreak"]},
        {"year": 1784, "age": 28, "title": "フリーメイスン入会", "detail": "以後『魔笛』等に思想が反映される。", "tags": ["turning_encounter"]},
        {"year": 1789, "age": 33, "title": "ベルリンへ演奏旅行、金銭問題の始まり", "detail": "フリードリヒ・ヴィルヘルム2世の前で演奏するが収入は少なく、以後借金に苦しむ。", "tags": ["poverty"]},
    ],
    "bach": [
        {"year": 1703, "age": 18, "title": "アルンシュタットのオルガニストに", "detail": "初めての定職、月給50グルデン。", "tags": ["restart"]},
        {"year": 1707, "age": 22, "title": "マリア・バルバラと結婚", "detail": "20歳のはとこ。7人の子をもうけた最初の妻。", "tags": ["turning_encounter"]},
        {"year": 1717, "age": 32, "title": "ケーテン宮廷楽長に、最も幸福な時期", "detail": "『平均律』『ブランデンブルク協奏曲』の地。", "tags": ["restart", "breakthrough"]},
        {"year": 1721, "age": 36, "title": "アンナ・マグダレーナと再婚", "detail": "16歳下の宮廷ソプラノ歌手。13人の子をもうける。", "tags": ["turning_encounter"]},
        {"year": 1729, "age": 44, "title": "ライプツィヒで『コレギウム・ムジクム』指揮", "detail": "カフェ・ツィンマーマンで学生たちと演奏会。世俗的な交流の場。", "tags": []},
    ],
    "schubert": [
        {"year": 1808, "age": 11, "title": "帝国王立宮廷礼拝堂少年合唱団入団", "detail": "ウィーン市立コンヴィクト（国立寄宿学校）で学ぶ。", "tags": ["approval"]},
        {"year": 1816, "age": 19, "title": "学校教師を辞めて作曲家専業に", "detail": "父と対立し、友人ショーバーの家に身を寄せる。", "tags": ["parent_conflict", "restart"]},
        {"year": 1821, "age": 24, "title": "『魔王』出版、初の商業的成功", "detail": "作品番号1、オーナーのペンニンガー社と契約。", "tags": ["breakthrough"]},
        {"year": 1825, "age": 28, "title": "オーストリア夏の旅、生涯最高の幸せな季節", "detail": "フォーグルとオーストリア南部を旅行。のち『大ハ長調交響曲』構想。", "tags": []},
        {"year": 1828, "age": 31, "title": "唯一の公開演奏会で成功、しかし体力限界", "detail": "自作曲のみのコンサート。チケット売上で生涯初めての大金を得た直後に死去。", "tags": ["breakthrough", "loss"]},
    ],
    "liszt": [
        {"year": 1824, "age": 12, "title": "パリ音楽院入学を外国人で初めて拒否される", "detail": "院長ケルビーニに拒絶された屈辱、独学で戦う決意に。", "tags": ["pride_broken"]},
        {"year": 1827, "age": 15, "title": "父アダムの死", "detail": "父のマネージメントから解放される。『結婚は人を卑しくする』の遺言。", "tags": ["loss"]},
        {"year": 1847, "age": 35, "title": "最後の公開演奏会（エリザヴェトグラード）", "detail": "10年の演奏家時代の終止符を自ら打った。", "tags": ["restart"]},
        {"year": 1857, "age": 45, "title": "ヴァイマールでワーグナー『タンホイザー』初演指揮", "detail": "ワーグナーの理解者として彼の音楽を世に送り出した。", "tags": []},
        {"year": 1875, "age": 63, "title": "ブダペスト音楽院（後のリスト音楽院）初代院長", "detail": "ハンガリー民族音楽の振興。", "tags": ["approval"]},
    ],
    "brahms": [
        {"year": 1853, "age": 20, "title": "ヨアヒムの紹介状でシューマンを訪ねる", "detail": "10月1日、デュッセルドルフ到着。その日からシューマン家に3週間滞在。", "tags": ["turning_encounter"]},
        {"year": 1859, "age": 26, "title": "ピアノ協奏曲第1番初演失敗", "detail": "ハノーファーで拍手なく、3公演目で『3人の敵意ある聴衆から3度のヒス』。", "tags": ["pride_broken"]},
        {"year": 1868, "age": 35, "title": "『ドイツ・レクイエム』初演、作曲家として確立", "detail": "ブレーメン大聖堂。母の死を契機に書いた作品。", "tags": ["breakthrough"]},
        {"year": 1879, "age": 46, "title": "ブレスラウ大学名誉博士号", "detail": "答礼に『大学祝典序曲』を書く。", "tags": ["approval"]},
        {"year": 1890, "age": 57, "title": "引退宣言、しかし翌年に名曲量産", "detail": "『クラリネット三重奏曲』以降、晩年の傑作群が生まれた。", "tags": ["restart"]},
    ],
    "tchaikovsky": [
        {"year": 1875, "age": 35, "title": "ピアノ協奏曲第1番、ルビンシテインに『弾けない』と酷評", "detail": "ニコライ・ルビンシテインの前で演奏し『下品で演奏不可能』と言われる。献呈先変更。", "tags": ["pride_broken"]},
        {"year": 1881, "age": 40, "title": "『1812年』序曲初演、モスクワ", "detail": "大砲の使用で有名。当初は『雑多な曲』と自ら評した。", "tags": ["breakthrough"]},
        {"year": 1884, "age": 43, "title": "皇帝アレクサンドル3世から聖ウラジーミル勲章", "detail": "国家公認の作曲家に。", "tags": ["approval"]},
        {"year": 1891, "age": 50, "title": "ニューヨーク・カーネギー・ホール開幕式で指揮", "detail": "アメリカ楽旅の頂点。", "tags": ["approval"]},
    ],
    "debussy": [
        {"year": 1880, "age": 17, "title": "メック夫人（チャイコフスキーの後援者）の家庭教師", "detail": "夏にスイス・フランス・ロシアを巡る。", "tags": []},
        {"year": 1890, "age": 27, "title": "『版画』『月の光』初期稿", "detail": "象徴主義詩人たちとの交流が創作に影響。", "tags": []},
        {"year": 1908, "age": 45, "title": "娘シュシュのための『子供の領分』作曲", "detail": "3歳の娘クロードに捧げた6曲の組曲。『ゴリウォーグのケークウォーク』で有名。", "tags": ["turning_encounter"]},
        {"year": 1915, "age": 52, "title": "直腸癌のコバルト治療開始", "detail": "治療中も『12の練習曲』『チェロ・ソナタ』を書く。", "tags": ["illness"]},
    ],
    "ravel": [
        {"year": 1898, "age": 23, "title": "パリ音楽院でフォーレ門下に", "detail": "最も影響を受けた師。", "tags": ["turning_encounter"]},
        {"year": 1902, "age": 27, "title": "『亡き王女のためのパヴァーヌ』出版", "detail": "音楽院の友人・貴族夫人のために書いた小品が世界的ヒット。", "tags": ["breakthrough"]},
        {"year": 1908, "age": 33, "title": "『夜のガスパール』完成", "detail": "ベルトラン詩集から。『スカルボ』は演奏至難。", "tags": ["breakthrough"]},
        {"year": 1922, "age": 47, "title": "ムソルグスキー『展覧会の絵』管弦楽編曲", "detail": "クーセヴィツキー委嘱。最も有名な編曲版に。", "tags": []},
        {"year": 1929, "age": 54, "title": "左手のためのピアノ協奏曲委嘱", "detail": "第一次大戦で右手を失ったヴィトゲンシュタイン（哲学者の兄）のため。", "tags": []},
    ],
    "mahler": [
        {"year": 1879, "age": 19, "title": "ブルックナーに師事", "detail": "ウィーン大学の講義に通い、交響曲観に大きな影響。", "tags": ["turning_encounter"]},
        {"year": 1888, "age": 28, "title": "ブダペスト王立歌劇場音楽監督", "detail": "29歳の若さで。ブラームスが絶賛。", "tags": ["breakthrough"]},
        {"year": 1897, "age": 37, "title": "ウィーン宮廷歌劇場就任直前に反ユダヤ主義で批判", "detail": "改宗はこの任命のための事実上の条件。", "tags": ["pride_broken"]},
        {"year": 1903, "age": 43, "title": "マイエルニヒに夏の別荘を建てる", "detail": "以後、作曲はこの湖畔の小屋で行う習慣に。", "tags": []},
        {"year": 1909, "age": 49, "title": "ニューヨーク・フィル音楽監督", "detail": "メトロポリタン歌劇場に続く新大陸での職。", "tags": ["restart"]},
    ],
    "stravinsky": [
        {"year": 1907, "age": 25, "title": "リムスキー＝コルサコフに正式に師事", "detail": "5年間、音楽院外で個人指導。作曲家としての基礎。", "tags": ["turning_encounter"]},
        {"year": 1914, "age": 32, "title": "スイス・クラランに亡命", "detail": "第一次大戦でロシアから。『結婚』『兵士の物語』を書く。", "tags": ["restart", "isolation"]},
        {"year": 1934, "age": 52, "title": "フランス国籍取得", "detail": "アメリカ移住までの14年をフランスで。", "tags": ["restart"]},
        {"year": 1945, "age": 63, "title": "アメリカ国籍取得", "detail": "ロサンゼルスに定住。ハリウッドの音楽家たちと交流。", "tags": ["restart"]},
    ],
    "wagner": [
        {"year": 1832, "age": 19, "title": "ライプツィヒ大学で音楽を志す", "detail": "法律から音楽へ。ベートーヴェン第九に夢中。", "tags": ["restart"]},
        {"year": 1840, "age": 27, "title": "パリで困窮、一時投獄", "detail": "借金刑で短期間投獄。『さまよえるオランダ人』の着想はこの頃。", "tags": ["pride_broken", "poverty"]},
        {"year": 1842, "age": 29, "title": "ドレスデン宮廷指揮者に", "detail": "『リエンツィ』成功で故郷ザクセンに戻る。", "tags": ["restart", "approval"]},
        {"year": 1861, "age": 47, "title": "パリ『タンホイザー』大失敗", "detail": "貴族クラブの『ジョッキー・クラブ』が妨害。3回で上演中止。", "tags": ["pride_broken"]},
        {"year": 1876, "age": 63, "title": "バイロイト音楽祭開幕、皇帝ヴィルヘルム1世観劇", "detail": "壮大な借金を抱えたが世界的大成功。", "tags": ["breakthrough", "approval"]},
    ],
    "verdi": [
        {"year": 1836, "age": 22, "title": "マルゲリータ・バレッツィと結婚", "detail": "パトロンの娘。9歳から知っていた幼馴染。", "tags": ["turning_encounter"]},
        {"year": 1859, "age": 45, "title": "ジュゼッピーナ・ストレッポーニと再婚", "detail": "10年同棲の後、信仰上の理由で避けていた結婚を決断。", "tags": ["turning_encounter"]},
        {"year": 1861, "age": 47, "title": "イタリア統一王国議会議員", "detail": "カヴールの強い要請で引き受けた政治的責務。", "tags": []},
        {"year": 1899, "age": 85, "title": "音楽家のための引退者の家『カーサ・ヴェルディ』建設", "detail": "『私の全ての作品よりも誇れる』と遺言で書いた。", "tags": ["breakthrough"]},
    ],
    "puccini": [
        {"year": 1880, "age": 22, "title": "ミラノ音楽院入学、ポンキエッリに師事", "detail": "『ジョコンダ』の作曲家から直接教えを受ける。", "tags": ["turning_encounter"]},
        {"year": 1884, "age": 26, "title": "『妖精ヴィッリ』初演で注目", "detail": "リコルディ社が若き才能を発掘、以後専属契約。", "tags": ["breakthrough"]},
        {"year": 1893, "age": 35, "title": "『マノン・レスコー』ミラノ初演大成功", "detail": "ヴェルディの後継者と認められた瞬間。", "tags": ["breakthrough", "approval"]},
        {"year": 1908, "age": 50, "title": "メトロポリタン歌劇場で『西部の娘』世界初演", "detail": "トスカニーニ指揮、エンリコ・カルーソー主役。", "tags": ["approval"]},
    ],
    "sibelius": [
        {"year": 1889, "age": 24, "title": "ベルリン・ウィーン留学", "detail": "ベッカー・フックス・ゴルトマルクに学ぶ。", "tags": ["restart"]},
        {"year": 1892, "age": 27, "title": "フィンランド初の交響詩『クレルヴォ』初演", "detail": "カレワラ叙事詩から。以後カレワラ系作品の連作。", "tags": ["breakthrough"]},
        {"year": 1897, "age": 32, "title": "フィンランド政府から終身年金", "detail": "若くして国民的作曲家の公式地位。", "tags": ["approval"]},
    ],
    "dvorak": [
        {"year": 1871, "age": 30, "title": "無名のまま『Hymnus』作曲", "detail": "愛国詩に基づくチェコ語合唱曲。後に作品20として出版。", "tags": []},
        {"year": 1875, "age": 34, "title": "国家奨励賞を連続受賞", "detail": "5年連続受賞で審査員ブラームスが注目。", "tags": ["approval"]},
        {"year": 1892, "age": 51, "title": "アイオワ州スピルヴィルの夏", "detail": "ニューヨークからチェコ系移民の村へ。『アメリカ』四重奏曲はここで書かれた。", "tags": []},
    ],
    "grieg": [
        {"year": 1866, "age": 22, "title": "ノルウェー国民歌『国に寄せて』作曲", "detail": "ノルウェー独立運動の象徴歌に。", "tags": []},
        {"year": 1892, "age": 49, "title": "銀婚式を祝う演奏会", "detail": "ニーナと25年の結婚記念。", "tags": []},
        {"year": 1906, "age": 63, "title": "イギリス王ジョージ5世の前で演奏", "detail": "ロンドン最後の演奏旅行、オックスフォード大学名誉博士号。", "tags": ["approval"]},
    ],
    "saint_saens": [
        {"year": 1848, "age": 13, "title": "パリ音楽院にオルガン科で入学", "detail": "13歳でのオルガン科入学は史上最年少。", "tags": ["approval"]},
        {"year": 1867, "age": 32, "title": "万国博覧会カンタータでパリ大賞", "detail": "『プロメテの結婚』。", "tags": ["approval"]},
        {"year": 1871, "age": 36, "title": "妻マリー・ロールと結婚（19歳）", "detail": "17歳年下。2人の息子をもうけるが悲劇が待つ。", "tags": ["turning_encounter"]},
    ],
    "faure": [
        {"year": 1854, "age": 9, "title": "パリのエコール・ニデルメイエール入学", "detail": "教会音楽のための学校。11年間在籍。", "tags": ["restart"]},
        {"year": 1892, "age": 47, "title": "パリ音楽院作曲科教授", "detail": "ラヴェル・エネスコ・ブーランジェ姉妹らを育てる。", "tags": ["breakthrough"]},
        {"year": 1920, "age": 75, "title": "パリ音楽院院長辞任", "detail": "15年の院長職を終え、作曲に専念。", "tags": ["restart"]},
    ],
    "berlioz": [
        {"year": 1821, "age": 18, "title": "パリの医学校に進学", "detail": "父の強い希望で医学部、しかし音楽会に通い詰める。", "tags": ["parent_conflict"]},
        {"year": 1828, "age": 24, "title": "ベートーヴェンの交響曲を初めて聴く", "detail": "『交響曲第3番英雄』パリ初演。以後ベートーヴェン信奉者に。", "tags": ["turning_encounter"]},
        {"year": 1842, "age": 39, "title": "ドイツ楽旅、ワーグナー・メンデルスゾーンに会う", "detail": "フランス国内では無視される彼を、ドイツが発見。", "tags": ["approval"]},
        {"year": 1856, "age": 53, "title": "アカデミー・フランセーズ会員", "detail": "5回落選の末、ようやく選出。", "tags": ["approval"]},
    ],
    "scriabin": [
        {"year": 1892, "age": 20, "title": "モスクワ音楽院を自由作曲でなくピアノ科で卒業", "detail": "作曲金メダルはラフマニノフに。金メダル独占できず悔しい思い出。", "tags": ["pride_broken"]},
        {"year": 1898, "age": 26, "title": "モスクワ音楽院ピアノ科教授", "detail": "若くして母校の教授に。5年間教える。", "tags": ["approval"]},
        {"year": 1903, "age": 31, "title": "教授辞任、作曲専念", "detail": "神智学に傾倒し、宗教的大作を構想。", "tags": ["restart"]},
    ],
    "rimsky_korsakov": [
        {"year": 1871, "age": 27, "title": "ペテルブルク音楽院作曲・管弦楽法教授", "detail": "海軍士官のまま音楽教授。独学だった彼が教える側に。", "tags": ["approval"]},
        {"year": 1883, "age": 39, "title": "皇帝礼拝堂次席指揮者", "detail": "宮廷の宗教音楽を指揮する名誉職。", "tags": ["approval"]},
    ],
    "mussorgsky": [
        {"year": 1868, "age": 29, "title": "『結婚』未完オペラ制作", "detail": "ゴーゴリ原作の会話体オペラ、実験的作品。", "tags": []},
        {"year": 1874, "age": 35, "title": "親友ハルトマンの追悼展", "detail": "2月、ペテルブルクで開催、ムソルグスキーは深く打ちのめされる。", "tags": ["loss"]},
    ],
    "smetana": [
        {"year": 1860, "age": 36, "title": "スウェーデンから帰国、プラハでチェコ音楽運動", "detail": "チェコ独立を音楽で支える決意。", "tags": ["restart"]},
        {"year": 1863, "age": 39, "title": "プラハ臨時劇場の指揮者", "detail": "チェコ語オペラのために設立された劇場。", "tags": ["restart"]},
    ],
    "prokofiev": [
        {"year": 1914, "age": 23, "title": "ペテルブルク音楽院ピアノ科首席", "detail": "ルビンシテイン賞を自作ピアノ協奏曲第1番の演奏で獲得。", "tags": ["breakthrough"]},
        {"year": 1921, "age": 30, "title": "『3つのオレンジへの恋』シカゴ初演", "detail": "亡命中のアメリカでの成功。", "tags": ["breakthrough"]},
        {"year": 1927, "age": 36, "title": "ソ連へ最初の凱旋演奏旅行", "detail": "まだ完全帰国前の試験的訪問。", "tags": []},
    ],
    "shostakovich": [
        {"year": 1919, "age": 13, "title": "ペトログラード音楽院入学", "detail": "革命後の混乱の中、父が飢餓で死亡。母が働きながら学ばせた。", "tags": ["loss", "poverty"]},
        {"year": 1927, "age": 21, "title": "ワルシャワのショパン国際ピアノコンクール", "detail": "入賞はならなかったが国際的注目。作曲家に専念する決意。", "tags": ["pride_broken", "restart"]},
        {"year": 1934, "age": 28, "title": "歌劇『ムツェンスク郡のマクベス夫人』成功", "detail": "2年で100回以上上演、世界中で上演、しかしスターリン注目の前奏。", "tags": ["breakthrough"]},
    ],
    "haydn": [
        {"year": 1759, "age": 27, "title": "モルツィン伯爵家に楽長として就職", "detail": "初めての定職。室内楽と交響曲第1番をここで作曲。", "tags": ["restart"]},
        {"year": 1760, "age": 28, "title": "マリア・アンナ・ケラーと結婚", "detail": "本命の妹に振られ姉と結婚。不幸な結婚生活。", "tags": ["heartbreak"]},
        {"year": 1762, "age": 29, "title": "エステルハージ侯爵家副楽長に", "detail": "以後30年の長期雇用の始まり。", "tags": ["restart"]},
    ],
    "handel": [
        {"year": 1704, "age": 19, "title": "ハンブルク歌劇場でヴァイオリン奏者", "detail": "プロ音楽家としての最初の職。", "tags": ["restart"]},
        {"year": 1720, "age": 35, "title": "王立音楽アカデミー設立", "detail": "ロンドンで自作オペラ上演のための会社。", "tags": ["breakthrough"]},
        {"year": 1728, "age": 43, "title": "イタリア人オペラのブームに危機", "detail": "『乞食オペラ』の流行でイタリア式が廃れる。", "tags": ["pride_broken"]},
    ],
    "vivaldi": [
        {"year": 1711, "age": 33, "title": "『調和の霊感』作品3出版", "detail": "アムステルダムで出版、ヨーロッパ中で大ヒット。バッハが多数編曲。", "tags": ["breakthrough"]},
        {"year": 1735, "age": 57, "title": "ピエタ慈善院楽長に復帰", "detail": "数度の解任と再雇用を繰り返す不安定な関係。", "tags": []},
    ],
    "mendelssohn": [
        {"year": 1826, "age": 17, "title": "『真夏の夜の夢』序曲作曲", "detail": "自宅の庭で姉ファニーとの連弾から生まれた。", "tags": ["breakthrough"]},
        {"year": 1842, "age": 33, "title": "ヴィクトリア女王の招きで王宮へ", "detail": "女王夫妻に『スコットランド』を献呈。イギリスでの絶大な人気。", "tags": ["approval"]},
    ],
    "satie": [
        {"year": 1905, "age": 39, "title": "スコラ・カントルム入学", "detail": "39歳で再び学生に。3年間、対位法を学び直す。", "tags": ["restart"]},
        {"year": 1915, "age": 49, "title": "コクトー・サティ・ピカソ連合結成", "detail": "バレエ『パラード』プロジェクト始動。", "tags": ["turning_encounter"]},
    ],
    "copland": [
        {"year": 1925, "age": 25, "title": "ガッゲンハイム奨学金でヨーロッパ留学", "detail": "ナディア・ブーランジェから米国帰国後もアドバイスを受ける。", "tags": ["restart"]},
        {"year": 1937, "age": 37, "title": "『コープランド・セッションズ・スコア』", "detail": "ニューヨークの若手作曲家ための出版社を共同設立。", "tags": []},
    ],
    "bernstein": [
        {"year": 1940, "age": 22, "title": "タングルウッド音楽祭でクーセヴィツキーに師事", "detail": "生涯の師、メンター。", "tags": ["turning_encounter"]},
        {"year": 1951, "age": 33, "title": "フェリシア・モンテアレグレと結婚", "detail": "チリ出身の女優。3人の子をもうけるが、彼の同性愛で複雑な関係。", "tags": ["turning_encounter"]},
    ],
    "rachmaninoff": [
        {"year": 1904, "age": 31, "title": "モスクワのボリショイ劇場常任指揮者", "detail": "オペラ指揮者としても才能発揮。", "tags": ["breakthrough"]},
        {"year": 1919, "age": 46, "title": "最初のアメリカ演奏旅行", "detail": "25回のコンサート、以後アメリカを主活動地に。", "tags": ["approval"]},
    ],
    "respighi": [
        {"year": 1913, "age": 34, "title": "サンタ・チェチリア音楽院教授", "detail": "以後ローマの音楽界の中心人物。", "tags": ["restart"]},
        {"year": 1919, "age": 40, "title": "エルサ・オリヴィエリ＝サンジャコミと結婚", "detail": "教え子のソプラノ歌手。生涯のパートナー。", "tags": ["turning_encounter"]},
    ],
    "palestrina": [
        {"year": 1547, "age": 22, "title": "ルクレツィアと結婚", "detail": "家族のため、教会楽長の職を取るため結婚。", "tags": ["turning_encounter"]},
        {"year": 1571, "age": 46, "title": "サン・ピエトロ大聖堂の楽長に就任", "detail": "ジュリア礼拝堂から昇格。カトリック音楽の最高職。", "tags": ["breakthrough"]},
    ],
    "bartok": [
        {"year": 1907, "age": 26, "title": "ブダペスト音楽院ピアノ科教授", "detail": "45年の教職。ただし作曲は教えなかった。", "tags": ["restart"]},
        {"year": 1909, "age": 28, "title": "マールタと結婚（16歳）", "detail": "教え子。9歳の息子ベーラを残して1923年に離婚。", "tags": ["turning_encounter"]},
        {"year": 1923, "age": 42, "title": "ディッタと再婚（19歳）", "detail": "新しい教え子。彼女とのピアノ・デュオで演奏。", "tags": ["turning_encounter"]},
    ],
    "gershwin": [
        {"year": 1916, "age": 18, "title": "最初の歌『When You Want 'Em, You Can't Get 'Em』", "detail": "5ドルで売った最初の出版作品。", "tags": ["restart"]},
        {"year": 1919, "age": 21, "title": "ミュージカル『ラ・ラ・ルシル』", "detail": "初のブロードウェイ・ミュージカル全曲担当。", "tags": ["breakthrough"]},
    ],
    "sakamoto_ryoma": [],  # Already enough events
    "ryuichi_sakamoto": [
        {"year": 1988, "age": 36, "title": "『ラスト・エンペラー』アカデミー作曲賞", "detail": "日本人初のアカデミー作曲賞。デヴィッド・バーンとコン・スーと共同。", "tags": ["approval"]},
        {"year": 1996, "age": 44, "title": "『スムーチー』ソロアルバム", "detail": "自宅録音のピアノ・ソロ集。以後ミニマルピアノ期。", "tags": []},
    ],
    "hisaishi": [
        {"year": 1982, "age": 32, "title": "アルバム『MKWAJU』でソロデビュー", "detail": "ミニマル音楽の実験作。前衛時代の代表。", "tags": []},
        {"year": 2001, "age": 51, "title": "『千と千尋の神隠し』アカデミー長編アニメ賞", "detail": "日本のアニメを世界に伝えた記念作の音楽。", "tags": ["approval"]},
    ],
    "takemitsu": [
        {"year": 1952, "age": 22, "title": "『実験工房』第1回公演", "detail": "瀧口修造中心の前衛芸術集団、以後音楽・美術・映像の融合。", "tags": ["restart"]},
        {"year": 1959, "age": 29, "title": "『弦楽のためのレクイエム』ストラヴィンスキーに激賞", "detail": "来日したストラヴィンスキーが絶賛、NHKで放送。", "tags": ["approval"]},
        {"year": 1973, "age": 43, "title": "『ノヴェンバー・ステップス』世界各地で演奏", "detail": "琵琶・尺八・オーケストラの日本発の現代音楽。", "tags": []},
    ],
    "dutilleux": [
        {"year": 1961, "age": 45, "title": "エコール・ノルマル音楽院教授", "detail": "以後の次世代作曲家を育成。", "tags": []},
    ],
}


def merge_events(existing, new):
    keys = set((e.get("year"), e.get("title")) for e in existing)
    for e in new:
        if (e.get("year"), e.get("title")) in keys:
            continue
        existing.append(e)
    existing.sort(key=lambda x: (x.get("year", 0), x.get("age", 0)))
    return existing


def main():
    added_total = 0
    for pid, events in E.items():
        if not events:
            continue
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        before = len(d.get("events", []))
        d["events"] = merge_events(d.get("events", []), events)
        after = len(d.get("events", []))
        delta = after - before
        added_total += delta
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"OK: {pid}  {before} -> {after} (+{delta})")
    print(f"\n計 {added_total}件 の微小イベント追加")


if __name__ == "__main__":
    main()
