# -*- coding: utf-8 -*-
# Add works/demographics/hobbies/delicacies to ERA_LORE entries
import re, os
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
path = os.path.join(BASE, 'app', 'era-lore.js')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# dict of era_id -> extra block
extras = {
    'renaissance_music': {
        'works': [
            {'title':'ミサ曲「教皇マルチェルスのミサ」','creator':'パレストリーナ','year':'1567','desc':'対位法の頂点、ルネサンス宗教音楽の金字塔。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Giovanni_Pierluigi_da_Palestrina.jpg/280px-Giovanni_Pierluigi_da_Palestrina.jpg'},
            {'title':'「汝はペテロなり」','creator':'パレストリーナ','year':'1573','desc':'モテット、バチカンの式典で歌われた。'},
            {'title':'マドリガーレ集','creator':'ジェズアルド','year':'1611','desc':'極端な半音階で知られる貴族作曲家の傑作。'},
            {'title':'シャンソン集','creator':'ジョスカン・デ・プレ','year':'1500頃','desc':'世俗歌曲、印刷楽譜で広く流通した。'},
        ],
        'demographics': 'ヨーロッパの主要都市は教会・修道院・宮廷を中心に音楽家を抱えた。聖歌隊少年から叩き上げの職業音楽家が多く、イタリア・フランドル出身者が欧州各地で活躍した。楽譜印刷の発達（1501年ペトルッチ）で中産階級も音楽を嗜むように。',
        'hobbies': ['リュート演奏','マドリガーレを夕べに歌う','詩作','宮廷舞踏','狩猟'],
        'delicacies': ['ワイン（ボルドー・トスカーナ）','オリーブオイル','香辛料（胡椒・シナモン）','マジパン','野鳥料理'],
    },
    'baroque': {
        'works': [
            {'title':'マタイ受難曲 BWV 244','creator':'J.S.バッハ','year':'1727','desc':'バッハ最大の宗教曲、3時間に及ぶ劇的な物語。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/JS_Bach_%28cropped%29.jpg/280px-JS_Bach_%28cropped%29.jpg'},
            {'title':'平均律クラヴィーア曲集 第1巻','creator':'J.S.バッハ','year':'1722','desc':'全24調で書かれた鍵盤音楽の旧約聖書。'},
            {'title':'メサイア HWV 56','creator':'ヘンデル','year':'1742','desc':'「ハレルヤ・コーラス」を含む不朽のオラトリオ。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Handel_1733.jpg/280px-Handel_1733.jpg'},
            {'title':'四季（協奏曲集）','creator':'ヴィヴァルディ','year':'1725','desc':'四季の情景をヴァイオリンで描く描写音楽の傑作。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Vivaldi.jpg/280px-Vivaldi.jpg'},
            {'title':'オペラ「オルフェオ」','creator':'モンテヴェルディ','year':'1607','desc':'最初期の本格オペラ、音楽と劇の融合の出発点。'},
            {'title':'カノン ニ長調','creator':'パッヘルベル','year':'1680頃','desc':'現代でも結婚式の定番、8小節が繰り返される名品。'},
        ],
        'demographics': '宮廷や教会に抱えられた職業音楽家が中心。バッハは7人の息子のうち4人も作曲家になった音楽家一族。ヘンデルはロンドンで興行主として成功、ヴィヴァルディはヴェネツィアの女子孤児院の音楽教師。身分制のもと、才能ある若者が音楽を武器に社会階層を駆け上がる道も開けた。',
        'hobbies': ['チェンバロ演奏','通奏低音（バス・ソロ）の自作','オペラ観劇','コーヒーハウスでの議論','庭園散策'],
        'delicacies': ['コーヒー（新興の嗜好品）','チョコレート','ワイン','焼き菓子','狩猟肉'],
    },
    'classical': {
        'works': [
            {'title':'交響曲第41番「ジュピター」','creator':'モーツァルト','year':'1788','desc':'古典派交響曲の頂点、フーガ的終楽章の傑作。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Croce-Mozart-Detail.jpg/280px-Croce-Mozart-Detail.jpg'},
            {'title':'交響曲第5番「運命」','creator':'ベートーヴェン','year':'1808','desc':'「ジャジャジャジャーン」の4音動機で全曲を統一。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Beethoven.jpg/280px-Beethoven.jpg'},
            {'title':'交響曲第9番「合唱付」','creator':'ベートーヴェン','year':'1824','desc':'「歓喜の歌」で人類の普遍を謳った交響曲の記念碑。'},
            {'title':'オペラ「フィガロの結婚」','creator':'モーツァルト','year':'1786','desc':'ダ・ポンテ台本のオペラ・ブッファの最高傑作。'},
            {'title':'天地創造','creator':'ハイドン','year':'1798','desc':'聖書に基づく壮大なオラトリオ。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Joseph_Haydn.jpg/280px-Joseph_Haydn.jpg'},
            {'title':'レクイエム K.626','creator':'モーツァルト','year':'1791','desc':'未完のまま作曲者死去、弟子ジュスマイヤーが補筆完成。'},
        ],
        'demographics': '啓蒙主義の影響で市民階級も音楽会を楽しむ時代へ。ウィーン・ロンドン・パリに音楽愛好サロンが花開いた。モーツァルトは貴族の庇護を離れ独立作曲家として活動した先駆け。ベートーヴェンはシンドラーら熱心な信奉者に囲まれつつ、難聴で晩年は孤独を深めた。',
        'hobbies': ['ピアノ演奏','弦楽四重奏の家庭合奏','オペラ観劇','サロンでの談話','散歩（ベートーヴェンの日課）'],
        'delicacies': ['コーヒー（モーツァルトは大の愛飲者）','ウィーン菓子','ワイン（バッハも愛飲）','チョコレート','カフェの新聞読書'],
    },
    'early_romantic': {
        'works': [
            {'title':'歌曲集「冬の旅」 D.911','creator':'シューベルト','year':'1827','desc':'24曲の連作リート、失恋の放浪を綴った傑作。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Franz_Schubert_by_Wilhelm_August_Rieder_1875.jpg/280px-Franz_Schubert_by_Wilhelm_August_Rieder_1875.jpg'},
            {'title':'夜想曲 作品9','creator':'ショパン','year':'1832','desc':'21曲ある夜想曲の原点、サロンで愛された。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Frederic_Chopin_photo.jpeg/280px-Frederic_Chopin_photo.jpeg'},
            {'title':'幻想交響曲','creator':'ベルリオーズ','year':'1830','desc':'失恋の狂気を5楽章に描く標題音楽の金字塔。'},
            {'title':'ピアノ協奏曲第1番','creator':'ショパン','year':'1830','desc':'20歳の作曲者が祖国との別れに書いた青春の協奏曲。'},
            {'title':'クライスレリアーナ','creator':'シューマン','year':'1838','desc':'クララへの愛を8曲の幻想的ピアノ曲に刻んだ。'},
            {'title':'結婚行進曲（夏の夜の夢）','creator':'メンデルスゾーン','year':'1842','desc':'シェイクスピア劇の付随音楽、結婚式の定番に。'},
        ],
        'demographics': 'パリ、ウィーン、ライプツィヒのサロンが音楽家の主戦場。ショパンは貴婦人たちから絶大な人気を得つつ上流階級の家庭教師で生計を立てた。シューベルトは生前ほぼ無名のまま貧困のうちに31歳で没、友人のサークル「シューベルティアーデ」だけが理解者だった。音楽評論（シューマンの新音楽時報）が勃興。',
        'hobbies': ['ピアノ演奏（女性の必須教養）','即興演奏','詩の朗読','サロン夜会','写真撮影（1840年代〜）'],
        'delicacies': ['コーヒー','シャンパン','ウィーン菓子（ザッハトルテの前身）','タバコ（葉巻）','ホットチョコレート'],
    },
    'sengoku': {
        'works': [
            {'title':'洛中洛外図屏風','creator':'狩野永徳','year':'1570年代','desc':'京の景観を金箔地に描いた一級史料。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Rakuchu-Rakugaizu.jpg/500px-Rakuchu-Rakugaizu.jpg'},
            {'title':'唐獅子図屏風','creator':'狩野永徳','year':'1580年代','desc':'豪放な金碧障壁画、桃山美術の代表作。'},
            {'title':'待庵','creator':'千利休','year':'1582','desc':'二畳の小間茶室、侘茶の極致。国宝。'},
            {'title':'信長公記','creator':'太田牛一','year':'1600頃','desc':'信長に仕えた家臣による第一級の伝記。'},
            {'title':'甲陽軍鑑','creator':'小幡景憲 編','year':'1621','desc':'武田家の軍法・信玄の戦術を詳細に記録。'},
            {'title':'安土城天守','creator':'織田信長の指示・狩野永徳装飾','year':'1579','desc':'5層7階の革新的城郭、1582年焼失。'},
        ],
        'demographics': '戦国大名・武将・僧侶・商人・茶人・南蛮商人・キリシタンが入り乱れる激動の世。武士は常在戦場で20代で討死する者も多く、30歳で家督・50歳で隠居が普通だった。商人は堺・博多・京で莫大な富を蓄え、文化人として大名を凌ぐ影響力を持った（千利休・今井宗久ら）。',
        'hobbies': ['茶の湯','連歌','能楽','鷹狩','蹴鞠','囲碁・将棋','鉄砲の稽古'],
        'delicacies': ['ワイン（南蛮渡来・ちんた酒）','カステラ・コンペイトウ（南蛮菓子）','茶（抹茶）','酒（清酒製法の発達）','塩漬け魚','栗・柿'],
    },
    'bakumatsu': {
        'works': [
            {'title':'『留魂録』','creator':'吉田松陰','year':'1859','desc':'処刑前夜に弟子に残した遺書。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Yoshida_Shoin2.jpg/280px-Yoshida_Shoin2.jpg'},
            {'title':'船中八策','creator':'坂本龍馬','year':'1867','desc':'大政奉還を構想した八か条の政治綱領。'},
            {'title':'『解体新書』（蘭学の系譜）','creator':'杉田玄白ほか','year':'1774 →幕末に再評価','desc':'近代医学の扉を開いた翻訳書。'},
            {'title':'写真「坂本龍馬」','creator':'上野彦馬撮影','year':'1867頃','desc':'近代日本の黎明を示す幕末の写真。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Sakamoto_Ryoma.jpg/280px-Sakamoto_Ryoma.jpg'},
            {'title':'錦絵「ペリー来航図」','creator':'不詳','year':'1854','desc':'黒船の来襲を庶民に伝えた瓦版・錦絵群。'},
        ],
        'demographics': '下級武士が時代を動かした。身分を超えて志士・浪士・商人・農民が結集。新選組は近藤勇・土方歳三ら農民・郷士出身者の集まりだった。20〜30代の若者が国政を論じ、40歳で老成と見なされる世界。海外渡航者（勝海舟の咸臨丸・岩倉使節団）も生まれ始めた。',
        'hobbies': ['剣術（北辰一刀流・天然理心流）','蘭学の会読','和歌・漢詩','旅（伊勢参り・湯治）','絵画（狩野派・南画）'],
        'delicacies': ['酒（灘の生一本）','茶','蕎麦・寿司（江戸屋台）','牛鍋（文明開化の走り）','タバコ'],
    },
    'heian_japan': {
        'works': [
            {'title':'源氏物語','creator':'紫式部','year':'1008頃','desc':'世界最古級の長編小説、54帖。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Murasaki_Shikibu_Diary_Emaki_1.jpg/500px-Murasaki_Shikibu_Diary_Emaki_1.jpg'},
            {'title':'枕草子','creator':'清少納言','year':'1000頃','desc':'「春はあけぼの」で始まる最初期の随筆。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Seishonagon.jpg/280px-Seishonagon.jpg'},
            {'title':'古今和歌集','creator':'紀貫之 編','year':'905','desc':'日本最初の勅撰和歌集、仮名序が有名。'},
            {'title':'平等院鳳凰堂','creator':'藤原頼通','year':'1053','desc':'浄土教の結晶、阿弥陀如来坐像を安置。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Byodo-in_Uji01pbs2640.jpg/500px-Byodo-in_Uji01pbs2640.jpg'},
            {'title':'伊勢物語','creator':'不詳（在原業平伝承）','year':'10世紀','desc':'歌物語の代表作、125段の恋と旅。'},
            {'title':'蜻蛉日記','creator':'藤原道綱母','year':'974頃','desc':'女性の内面を綴った最初期の日記文学。'},
        ],
        'demographics': '京の貴族社会が中心で人口は全国で約500万人。公卿・殿上人は約200人程度、その家族・従者を含め貴族社会は1万人規模。女性は12〜13歳で結婚、30歳で老い始めるとされた。地方は受領（国司）が支配し、藤原氏が摂関として朝廷を掌握した。平均寿命は貴族でも30〜40歳。',
        'hobbies': ['和歌の贈答','蹴鞠','雅楽','囲碁','偏継（文字遊び）','貝合わせ','香を聞く'],
        'delicacies': ['唐菓子（揚げ菓子）','蘇（古代のチーズ）','甘葛（天然甘味料）','酒','干魚・干肉','氷（氷室の氷）'],
    },
    'renaissance_art': {
        'works': [
            {'title':'モナ・リザ','creator':'レオナルド・ダ・ヴィンチ','year':'1503-1506','desc':'スフマート技法の頂点、微笑の永遠の謎。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/320px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg'},
            {'title':'最後の晩餐','creator':'レオナルド・ダ・ヴィンチ','year':'1498','desc':'ミラノ・サンタ・マリア・デッレ・グラツィエ教会の壁画。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/%C3%9Altima_Cena_-_Da_Vinci_5.jpg/500px-%C3%9Altima_Cena_-_Da_Vinci_5.jpg'},
            {'title':'ダヴィデ像','creator':'ミケランジェロ','year':'1504','desc':'5mの大理石像、理想化された人体美。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/%27David%27_by_Michelangelo_Fir_JBU005.jpg/280px-%27David%27_by_Michelangelo_Fir_JBU005.jpg'},
            {'title':'システィーナ礼拝堂天井画','creator':'ミケランジェロ','year':'1512','desc':'「アダムの創造」を含む聖書物語の大天井。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Miguel_%C3%81ngel%2C_Creaci%C3%B3n_de_Ad%C3%A1n_%28detalle%29.jpg/500px-Miguel_%C3%81ngel%2C_Creaci%C3%B3n_de_Ad%C3%A1n_%28detalle%29.jpg'},
            {'title':'アテナイの学堂','creator':'ラファエロ','year':'1510頃','desc':'プラトンとアリストテレスを中心に古代哲学者が集う。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg/500px-%22The_School_of_Athens%22_by_Raffaello_Sanzio_da_Urbino.jpg'},
            {'title':'ヴィーナスの誕生','creator':'ボッティチェリ','year':'1485頃','desc':'古代神話を主題にした優美な傑作。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg/500px-Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg'},
        ],
        'demographics': 'フィレンツェはメディチ家を筆頭に商人・銀行家の都市国家で約7万人。ローマは教皇領の中心。画家・彫刻家は「職人」から「芸術家」へ地位が向上した。レオナルドは菜食主義・左利き・同性愛者、ミケランジェロは独身を貫き制作に没頭した。大学（ボローニャ・パドヴァ）で人文主義教育が広まった。',
        'hobbies': ['古典の読書（ギリシャ・ラテン語）','リュート演奏','チェス','狩猟（貴族）','剣術','庭園散策','解剖学研究'],
        'delicacies': ['ワイン（キアンティ等）','オリーブオイル','パルミジャーノ','香辛料（胡椒・サフラン）','砂糖菓子','鹿肉・鳥料理'],
    },
    'impressionism': {
        'works': [
            {'title':'印象・日の出','creator':'モネ','year':'1872','desc':'「印象派」命名の元となった一枚。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Monet_-_Impression%2C_Sunrise.jpg/500px-Monet_-_Impression%2C_Sunrise.jpg'},
            {'title':'草上の昼食','creator':'マネ','year':'1863','desc':'落選展でスキャンダルになった裸婦画。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Edouard_Manet_-_Luncheon_on_the_Grass_-_Google_Art_Project.jpg/500px-Edouard_Manet_-_Luncheon_on_the_Grass_-_Google_Art_Project.jpg'},
            {'title':'ムーラン・ド・ラ・ギャレット','creator':'ルノワール','year':'1876','desc':'モンマルトルの昼下がりの光と人々。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Pierre-Auguste_Renoir%2C_Le_Moulin_de_la_Galette.jpg/500px-Pierre-Auguste_Renoir%2C_Le_Moulin_de_la_Galette.jpg'},
            {'title':'バレエの舞台稽古','creator':'ドガ','year':'1874','desc':'楽屋や稽古場の踊り子を捉えた斬新な構図。'},
            {'title':'睡蓮（連作）','creator':'モネ','year':'1899-1926','desc':'ジヴェルニーの庭の池、30年以上描き続けた。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/500px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg'},
            {'title':'星月夜','creator':'ゴッホ','year':'1889','desc':'サン・レミの精神病院から見た夜空。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/500px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'},
        ],
        'demographics': 'パリはオスマン男爵の大改造で近代都市化し人口約200万。印象派画家は当初サロンから拒絶された「落伍者」で、画商（デュラン=リュエル）や富裕なアメリカ人コレクターが支援した。モンマルトル・モンパルナスにボヘミアン文化が花開き、ゴッホやロートレックら精神病・アルコール中毒の芸術家も多かった。',
        'hobbies': ['カフェ議論','舞踏会','鉄道での小旅行（屋外写生）','日本美術収集','写真','競馬','オペラ観劇'],
        'delicacies': ['アブサン（緑の妖精）','コーヒー（カフェ文化の黄金期）','赤ワイン','バゲット・クロワッサン','オイスター','シャンパン'],
    },
    'scientific_revolution': {
        'works': [
            {'title':'天球の回転について','creator':'コペルニクス','year':'1543','desc':'地動説を体系的に提唱した歴史的名著。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Nikolaus_Kopernikus.jpg/280px-Nikolaus_Kopernikus.jpg'},
            {'title':'星界の報告','creator':'ガリレオ','year':'1610','desc':'望遠鏡観測の記録、木星の衛星発見を報告。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg/280px-Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg'},
            {'title':'新天文学','creator':'ケプラー','year':'1609','desc':'惑星運動の第1・第2法則を発表。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Johannes_Kepler_1610.jpg/280px-Johannes_Kepler_1610.jpg'},
            {'title':'自然哲学の数学的諸原理（プリンキピア）','creator':'ニュートン','year':'1687','desc':'運動の3法則と万有引力を体系化。科学革命の完成。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/GodfreyKneller-IsaacNewton-1689.jpg/280px-GodfreyKneller-IsaacNewton-1689.jpg'},
            {'title':'光学','creator':'ニュートン','year':'1704','desc':'プリズム実験で光のスペクトル分解を示した。'},
            {'title':'チコ・ブラーエの観測記録','creator':'ティコ・ブラーエ','year':'1570-1601','desc':'肉眼時代の最高精度、ケプラーの法則の基礎となる。'},
        ],
        'demographics': '科学者はまだ職業として確立しておらず、貴族のパトロン（ルドルフ2世、メディチ家）や大学（ケンブリッジ・パドヴァ）に依存。多くが聖職者を兼ね、異端審問の恐れの中で書いた。ニュートンは生涯独身、錬金術と聖書研究にも膨大な時間を費やした。王立協会（1660）ら学会が学問のハブとなった。',
        'hobbies': ['天体観測','錬金術','ラテン語での著述','数学競技（問題を出し合う）','望遠鏡・顕微鏡製作','神学論議'],
        'delicacies': ['ワイン','エール（ビール）','コーヒー（17世紀に欧州へ）','チョコレート','狩猟肉','パン・チーズ'],
    },
    'edo_japan': {
        'works': [
            {'title':'冨嶽三十六景「神奈川沖浪裏」','creator':'葛飾北斎','year':'1831','desc':'日本美術の代表作、世界で最も有名な浮世絵。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Tsunami_by_hokusai_19th_century.jpg/500px-Tsunami_by_hokusai_19th_century.jpg'},
            {'title':'東海道五十三次「日本橋」','creator':'歌川広重','year':'1833','desc':'江戸から京へ55枚の風景画連作の冒頭。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Hiroshige_Nihonbashi.jpg/500px-Hiroshige_Nihonbashi.jpg'},
            {'title':'寛政三美人','creator':'喜多川歌麿','year':'1793頃','desc':'富本豊雛・難波屋おきた・高島おひさ、江戸の美人3人。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Kitagawa_Utamaro_-_Three_Beauties_of_the_Present_Day_-_Google_Art_Project.jpg/280px-Kitagawa_Utamaro_-_Three_Beauties_of_the_Present_Day_-_Google_Art_Project.jpg'},
            {'title':'役者大首絵（市川鰕蔵）','creator':'東洲斎写楽','year':'1794','desc':'わずか10ヶ月の活動で140点超、謎の絵師。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Sharaku.jpg/280px-Sharaku.jpg'},
            {'title':'名所江戸百景「大はしあたけの夕立」','creator':'歌川広重','year':'1857','desc':'ゴッホが模写したことで西洋美術史にも登場。'},
        ],
        'demographics': '江戸の人口は100万超、浮世絵は一枚16〜20文（そば一杯相当）で庶民が手に取れる「メディア」だった。絵師・彫師・摺師の分業体制。町人が主な消費者で、吉原の遊女や歌舞伎役者はスター扱い。地方からの参勤交代客も土産に買った。歌麿・写楽・北斎・広重が四大絵師と称される。',
        'hobbies': ['歌舞伎観劇','寄席（落語）','句会','将棋','釣り','園芸（朝顔・菊）','旅（伊勢参り）'],
        'delicacies': ['蕎麦・寿司・天ぷら（江戸三大屋台）','日本酒','茶（煎茶）','羊羹・金平糖','鰻の蒲焼','初鰹'],
    },
    'modern_art': {
        'works': [
            {'title':'アヴィニョンの娘たち','creator':'ピカソ','year':'1907','desc':'キュビスムの始まり、西洋絵画500年の伝統を破壊した。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Les_Demoiselles_d%27Avignon.jpg/320px-Les_Demoiselles_d%27Avignon.jpg'},
            {'title':'ゲルニカ','creator':'ピカソ','year':'1937','desc':'スペイン内戦の空爆に抗議、反戦芸術の永遠の象徴。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/PicassoGuernica.jpg/500px-PicassoGuernica.jpg'},
            {'title':'コンポジション8','creator':'カンディンスキー','year':'1923','desc':'抽象絵画の教典的作品。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Wassily_Kandinsky%2C_1913_-_Color_Study%2C_Squares_with_Concentric_Circles.jpg/400px-Wassily_Kandinsky%2C_1913_-_Color_Study%2C_Squares_with_Concentric_Circles.jpg'},
            {'title':'ダンス','creator':'マティス','year':'1910','desc':'5人の裸体が赤で燃える、フォーヴィスムの頂点。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Matisse-The-Dance.jpg/500px-Matisse-The-Dance.jpg'},
            {'title':'泉','creator':'デュシャン','year':'1917','desc':'便器に署名して美術展に出品、「これは芸術か？」を問う。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Duchamp_Fountaine.jpg/280px-Duchamp_Fountaine.jpg'},
            {'title':'記憶の固執','creator':'ダリ','year':'1931','desc':'溶ける時計、シュルレアリスムの象徴的作品。'},
        ],
        'demographics': 'パリのモンパルナスに世界中の芸術家が集結、「エコール・ド・パリ」を形成。ピカソ、モディリアーニ、シャガール、藤田嗣治らが狭いアトリエで制作した。2度の世界大戦がシュルレアリスムとダダを生み、多くの芸術家がナチスを逃れ米国へ亡命。画商（カーンワイラー、ペギー・グッゲンハイム）が新たな美術市場を築いた。',
        'hobbies': ['カフェでの議論（ドーム、ロトンド）','ジャズダンス','写真','映画鑑賞','舞踏会','アフリカ・ジャポニスム美術収集'],
        'delicacies': ['アブサン→ペルノー','赤ワイン','コーヒー','パステル菓子','オイスター','ハシシ（一部芸術家）'],
    },
    'ancient_greek': {
        'works': [
            {'title':'国家','creator':'プラトン','year':'紀元前380頃','desc':'哲人王・正義論・洞窟の比喩を含む対話篇の最高峰。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Plato_Silanion_Musei_Capitolini_MC1377.jpg/280px-Plato_Silanion_Musei_Capitolini_MC1377.jpg'},
            {'title':'ニコマコス倫理学','creator':'アリストテレス','year':'紀元前340頃','desc':'中庸と幸福を論じた倫理学の古典。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Aristotle_Altemps_Inv8575.jpg/280px-Aristotle_Altemps_Inv8575.jpg'},
            {'title':'饗宴','creator':'プラトン','year':'紀元前385頃','desc':'愛（エロース）を巡る酒宴の哲学対話。'},
            {'title':'オイディプス王','creator':'ソフォクレス','year':'紀元前429頃','desc':'運命と自由の悲劇、ギリシャ演劇の最高峰。'},
            {'title':'イリアス・オデュッセイア','creator':'ホメロス','year':'紀元前8世紀','desc':'西洋文学の源泉となる叙事詩。'},
            {'title':'パルテノン神殿','creator':'イクティノス・カリクラテス設計','year':'紀元前438','desc':'黄金比による建築美の極致。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/The_Parthenon_in_Athens.jpg/500px-The_Parthenon_in_Athens.jpg'},
        ],
        'demographics': 'アテナイのポリスは人口約30万、成年男性市民は約4万人のみで直接民主制に参加。女性・奴隷・外国人は政治参加不可。哲学者は貴族出身も多く（プラトンは名門出）、ソフィスト（職業教師）と対立した。奴隷経済に支えられ、市民は暇（スコレー）の中で思索を深めた。40歳前後で長老入り、60歳以上は陪審員免除。',
        'hobbies': ['体育（パンクラチオン・円盤投）','詩の暗唱','酒宴（シュンポシオン）','戯曲鑑賞（ディオニュソス祭）','哲学対話','彫刻・絵画鑑賞'],
        'delicacies': ['ワイン（水で薄めて飲む）','オリーブ油','蜂蜜','イチジク','羊肉','パン（大麦・小麦）','チーズ'],
    },
    'modern_physics': {
        'works': [
            {'title':'特殊相対性理論の論文','creator':'アインシュタイン','year':'1905','desc':'時間と空間が観測者に相対的であることを示した。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg/280px-Einstein_1921_by_F_Schmutzer_-_restoration.jpg'},
            {'title':'一般相対性理論','creator':'アインシュタイン','year':'1915','desc':'重力は時空の歪みであるという革命的理論。'},
            {'title':'不確定性原理の論文','creator':'ハイゼンベルク','year':'1927','desc':'位置と運動量の同時測定不可能性を示した。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Werner_Heisenberg_cropped.jpg/280px-Werner_Heisenberg_cropped.jpg'},
            {'title':'シュレーディンガー方程式','creator':'シュレーディンガー','year':'1926','desc':'量子力学の基本方程式、波動関数を記述する。'},
            {'title':'中間子論の論文','creator':'湯川秀樹','year':'1935','desc':'核力を媒介する新粒子を予言、1949年ノーベル賞。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Yukawa.jpg/280px-Yukawa.jpg'},
            {'title':'ペイル・ブルー・ドット（写真）','creator':'ボイジャー1号（セーガン提案）','year':'1990','desc':'60億km彼方から撮影された地球の一粒。'},
        ],
        'demographics': 'ゲッティンゲン、コペンハーゲン、プリンストンに量子力学の若き天才たちが集結。ハイゼンベルク・パウリは20代で革命を起こした。ユダヤ系物理学者の多くがナチスから米英へ亡命、マンハッタン計画で原爆を作った。ソルヴェイ会議（1911〜）が思想的ハブ。女性はキュリー夫人ら少数派、リーゼ・マイトナーはナチスから逃れた。',
        'hobbies': ['バイオリン演奏（アインシュタイン）','ピアノ（プランク）','ハイキング・スキー','チェス','ヨット','葉巻','SF・探偵小説読書'],
        'delicacies': ['コーヒー（研究所の必需品）','葉巻・パイプ','ワイン・ビール','ウィーン菓子','魚料理（北欧・英国系）'],
    },
    'industrial_science': {
        'works': [
            {'title':'種の起源','creator':'ダーウィン','year':'1859','desc':'進化論を体系化した書物。『創造論』を覆した。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Charles_Darwin_by_Julia_Margaret_Cameron.jpg/280px-Charles_Darwin_by_Julia_Margaret_Cameron.jpg'},
            {'title':'電磁場の力学的理論','creator':'マクスウェル','year':'1865','desc':'電気・磁気・光を統一した方程式系。'},
            {'title':'周期表','creator':'メンデレーエフ','year':'1869','desc':'未知の元素を予言する強力な分類体系。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Dmitri_Mendeleev_1890s.jpg/280px-Dmitri_Mendeleev_1890s.jpg'},
            {'title':'白熱電球（特許）','creator':'エジソン','year':'1879','desc':'実用化された白熱電球、夜を昼に変えた。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Thomas_Edison2-crop.jpg/280px-Thomas_Edison2-crop.jpg'},
            {'title':'交流誘導電動機','creator':'テスラ','year':'1888','desc':'交流電力システムの中核、現代電力網の基礎。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Tesla_circa_1890.jpeg/280px-Tesla_circa_1890.jpeg'},
            {'title':'ラジウムの発見（論文）','creator':'キュリー夫妻','year':'1898','desc':'放射能研究の扉を開いた。','img':'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Marie_Curie_c1920.jpg/280px-Marie_Curie_c1920.jpg'},
        ],
        'demographics': '産業革命で英国・独・米が科学大国に。科学者は大学教授・民間研究所・独立発明家に分かれた。エジソンはメンロパーク研究所で「発明の工場」を運営。キュリー夫人は女性初のノーベル賞2度受賞。ダーウィンは資産家出身で自宅書斎から研究。帝国主義時代で植民地探検が博物学を発達させた（ウォレス、アガシ）。',
        'hobbies': ['博物学標本収集','写真（乾板）','鉄道旅行','自転車','チェス','園芸','登山（アルピニズム）'],
        'delicacies': ['紅茶（英国の国民飲料に）','コーヒー','ワイン・ブランデー','チョコレート','葉巻（チャーチル好み）','オイスター','缶詰（新発明）'],
    },
}

count = 0
for era_id, data in extras.items():
    # Build the JS fragment
    parts = []
    if 'works' in data:
        works_js = '[\n      ' + ',\n      '.join(
            '{ title: \'' + w['title'].replace("'", "\\'") + '\'' +
            (', creator: \'' + w['creator'].replace("'", "\\'") + '\'' if w.get('creator') else '') +
            (', year: \'' + str(w['year']) + '\'' if w.get('year') else '') +
            (', desc: \'' + w['desc'].replace("'", "\\'") + '\'' if w.get('desc') else '') +
            (', img: \'' + w['img'] + '\'' if w.get('img') else '') +
            ' }' for w in data['works']
        ) + ',\n    ]'
        parts.append('works: ' + works_js)
    if 'demographics' in data:
        parts.append("demographics: '" + data['demographics'].replace("'", "\\'") + "'")
    if 'hobbies' in data:
        parts.append('hobbies: [' + ', '.join("'" + h.replace("'", "\\'") + "'" for h in data['hobbies']) + ']')
    if 'delicacies' in data:
        parts.append('delicacies: [' + ', '.join("'" + d.replace("'", "\\'") + "'" for d in data['delicacies']) + ']')
    new_block = ',\n    '.join(parts)

    # Insert before the "timeline:" of the era (or before the closing brace if no timeline)
    # Find the era entry: era_id: { ... }
    # We look for "    era_id: {" and insert before first "timeline:" or "}"
    pattern = r"(\s*)(" + re.escape(era_id) + r"):\s*\{"
    m = re.search(pattern, content)
    if not m:
        print('ERA NOT FOUND:', era_id)
        continue
    # Find matching closing brace by counting braces from m.end()
    depth = 1
    i = m.end()
    while i < len(content) and depth > 0:
        if content[i] == '{':
            depth += 1
        elif content[i] == '}':
            depth -= 1
        i += 1
    era_end = i  # position after closing brace

    # Insert new_block inside the era, before the final "}"
    # Find position just before the closing brace
    close_brace = era_end - 1  # position of '}'
    # Walk back over whitespace/newlines to find insertion point
    insert_pos = close_brace
    # Content already ends with ", timeline: [...],\n  }" or similar
    # Insert right before "  }"
    # Safely: insert with leading ",\n    " and trailing ","
    insertion = '\n    ' + new_block + ','
    content = content[:insert_pos] + insertion + content[insert_pos:]
    count += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Added details to {count} eras')
