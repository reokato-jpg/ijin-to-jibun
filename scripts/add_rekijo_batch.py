# -*- coding: utf-8 -*-
"""歴女向け9偉人バッチ追加（幕末女性3 + 新選組補強3 + 戦国女性3）"""
import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'people'

PEOPLE = [
  # 幕末女性3
  {
    'id':'niijima_yae','name':'新島八重','nameEn':'Niijima Yae','birth':1845,'death':1932,'country':'日本',
    'field':'志士・教育者','summary':'会津藩砲術師範の娘。戊辰戦争で鶴ヶ城に籠城し、男装しスペンサー銃で戦った「幕末のジャンヌ・ダルク」。維新後は新島襄と結婚し同志社の礎を築き、晩年は日本赤十字の篤志看護婦として86歳まで活動。「ハンサム・ウーマン」と呼ばれた。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Niijima_Yae.jpg?width=280',
    'wikiTitle':'新島八重','birthMonth':12,'birthDay':1,'deathMonth':6,'deathDay':14,
    'events':[
      {'year':1845,'age':0,'title':'会津藩・山本家に生まれる','detail':'父は砲術師範・山本権八。兄は後の京都府顧問・山本覚馬。','tags':['origin']},
      {'year':1868,'age':23,'title':'会津戦争・鶴ヶ城籠城','detail':'男装しスペンサー銃を手に一ヶ月間籠城戦を戦った。','tags':['courage','conflict']},
      {'year':1876,'age':31,'title':'新島襄と結婚','detail':'同志社英学校の創立者と京都で出会い結婚。キリスト教に入信。','tags':['love','turning_encounter']},
      {'year':1890,'age':45,'title':'新島襄の死','detail':'夫を見送り、その遺志を継ぐ。','tags':['loss']},
      {'year':1894,'age':49,'title':'日清戦争で篤志看護婦','detail':'日本赤十字社の看護婦として従軍。','tags':['restart','service']},
      {'year':1932,'age':86,'title':'死去','detail':'京都で死去。会津の誇り高き女として生涯を貫いた。','tags':['death']}
    ],
    'quotes':[
      {'text':'明日の夜はいづくの誰かながむらん なれし御城にのこす月かげ','source':'会津落城時に詠んだ歌'},
      {'text':'ならぬことはならぬのです。','source':'会津の什の掟（八重の信条）'},
      {'text':'私は自分を生涯、武士の娘だと思っている。','source':'伝'},
      {'text':'女に学問は要らぬと言う人は、女を知らぬ人。','source':'伝'}
    ],
    'books':[
      {'title':'八重の桜 1','author':'山本むつみ','asin':'4140057599','description':'NHK大河ドラマの原作小説。'},
      {'title':'新島八重','author':'福本武久','description':'詳細な伝記。'}
    ],
    'places':[],'tags':['courage','love','restart','service'],'themes':['bakumatsu','rekijo_women'],
    'traits':{'personality':'芯が強い・活発・信念の人','strength':'射撃・看護・学問','weakness':'頑固','quirks':['男装して戦った','キリスト教徒','晩年は茶道師範']},
    'relations':[]
  },
  {
    'id':'atsuhime','name':'篤姫','nameEn':'Atsuhime','birth':1836,'death':1883,'country':'日本',
    'field':'武家女性・御台所','summary':'薩摩藩島津家分家の娘として生まれ、島津斉彬の養女を経て第13代将軍・徳川家定の正室（御台所）となる。家定の死後、天璋院と号して大奥を統率。戊辰戦争では徳川家を守るため西郷に嘆願、江戸無血開城に貢献した。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Atsuhime.jpg?width=280',
    'wikiTitle':'天璋院','birthMonth':2,'birthDay':5,'deathMonth':11,'deathDay':20,
    'events':[
      {'year':1836,'age':0,'title':'薩摩の分家島津家に生まれる','detail':'幼名は一子。','tags':['origin']},
      {'year':1853,'age':17,'title':'島津斉彬の養女となり江戸へ','detail':'将軍家輿入れのため。人生の大転換。','tags':['turning_encounter']},
      {'year':1856,'age':20,'title':'第13代将軍・徳川家定と結婚','detail':'御台所として大奥の頂点に立つ。','tags':['love']},
      {'year':1858,'age':22,'title':'家定の急逝','detail':'結婚からわずか1年9ヶ月で夫を失う。','tags':['loss']},
      {'year':1858,'age':22,'title':'天璋院と号す','detail':'出家せず、御台所として大奥を統率し続ける。','tags':['identity']},
      {'year':1868,'age':32,'title':'江戸無血開城に尽力','detail':'西郷隆盛に嘆願書を送り、徳川家の存続を訴える。','tags':['peace','courage']},
      {'year':1883,'age':47,'title':'脳溢血で急死','detail':'手元にあったのはわずかな所持金のみ。家臣への情をすべて尽くした生涯。','tags':['death']}
    ],
    'quotes':[
      {'text':'徳川の家を滅ぼすなかれ。','source':'西郷への嘆願書'},
      {'text':'私は島津の娘ではない、徳川の妻である。','source':'伝'},
      {'text':'人は、名ではなく生き方で語られる。','source':'伝'}
    ],
    'books':[
      {'title':'篤姫','author':'宮尾登美子','asin':'410136020X','description':'NHK大河の原作（新潮文庫・全2巻）。'},
      {'title':'天璋院篤姫','author':'橋本博文','description':'史実に基づく評伝。'}
    ],
    'places':[],'tags':['love','loss','peace','identity'],'themes':['bakumatsu','rekijo_women'],
    'traits':{'personality':'気品・芯の強さ・情の厚さ','strength':'教養・政治感覚','weakness':'愛する者を早く失い続けた','quirks':['猫好き','お茶とお菓子を好んだ','徳川家を最後まで守った']},
    'relations':[{'id':'saigo_takamori','label':'嘆願の相手','relation':'交渉'},{'id':'tokugawa_yoshinobu','label':'将軍家の縁者','relation':'徳川家'}]
  },
  {
    'id':'kazunomiya','name':'和宮','nameEn':'Kazunomiya','birth':1846,'death':1877,'country':'日本',
    'field':'皇女・御台所','summary':'仁孝天皇の第8皇女にして孝明天皇の妹。政略結婚で江戸に下向し、第14代将軍・徳川家茂の御台所となる。夫家茂との愛情は深く、家茂の死後も徳川の家を守り抜き、篤姫と共に江戸城明け渡しを成し遂げた悲しき皇女。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Kazunomiya.jpg?width=280',
    'wikiTitle':'和宮親子内親王','birthMonth':7,'birthDay':3,'deathMonth':9,'deathDay':2,
    'events':[
      {'year':1846,'age':0,'title':'京都で生まれる','detail':'父は仁孝天皇、母は典侍・橋本経子。','tags':['origin']},
      {'year':1851,'age':5,'title':'有栖川宮熾仁親王と婚約','detail':'幼い頃から婚約者がいた。','tags':['love']},
      {'year':1861,'age':15,'title':'政略結婚を受け入れ江戸へ下向','detail':'有栖川宮との婚約を破棄し、徳川家茂と結婚するため江戸へ。','tags':['setback','setback']},
      {'year':1862,'age':16,'title':'徳川家茂と結婚','detail':'公武合体の象徴。当初は冷ややかだったが次第に深い愛情が芽生える。','tags':['love']},
      {'year':1866,'age':20,'title':'夫・家茂の死','detail':'大坂城で急死。最愛の夫を失う。','tags':['loss']},
      {'year':1867,'age':21,'title':'静寛院宮と号す','detail':'若くして落飾。徳川の嫁として生きる決意。','tags':['identity']},
      {'year':1868,'age':22,'title':'江戸無血開城','detail':'篤姫と共に朝廷に嘆願。徳川家の存続に貢献。','tags':['peace','courage']},
      {'year':1877,'age':31,'title':'脚気を患い箱根で療養中に死去','detail':'遺体は家茂の眠る増上寺に葬られた。','tags':['death']}
    ],
    'quotes':[
      {'text':'惜しまじな 君と民とのためならば 身は武蔵野の露と消ゆとも','source':'政略結婚を受け入れるときの歌'},
      {'text':'徳川の家に嫁いだ以上、私は徳川の妻です。','source':'伝'},
      {'text':'私の心は、あの方と共に逝きました。','source':'家茂の死後'}
    ],
    'books':[
      {'title':'和宮様御留','author':'有吉佐和子','asin':'4062755963','description':'和宮を題材にした名小説（講談社文庫）。'},
      {'title':'皇女和宮','author':'武部敏夫','description':'史実に基づく評伝。'}
    ],
    'places':[],'tags':['love','loss','setback','peace'],'themes':['bakumatsu','rekijo_women'],
    'traits':{'personality':'気品・純情・芯の強さ','strength':'歌道・書・信念','weakness':'体が弱い','quirks':['家茂の肖像を大切にした','最期は家茂の隣に埋葬']},
    'relations':[{'id':'atsuhime','label':'大奥の義母','relation':'家族'}]
  },
  # 新選組補強3
  {
    'id':'yamanami_keisuke','name':'山南敬助','nameEn':'Yamanami Keisuke','birth':1833,'death':1865,'country':'日本',
    'field':'武士・剣客','summary':'新選組総長。江戸で北辰一刀流を修めた仙台浪人。温厚な人柄と学識で隊士から慕われたが、近藤・土方との確執から脱走を試み、沖田総司に連れ戻されて切腹。わずか31歳。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Yamanami_Keisuke.jpg?width=280',
    'wikiTitle':'山南敬助','birthMonth':0,'birthDay':0,'deathMonth':3,'deathDay':20,
    'events':[
      {'year':1833,'age':0,'title':'仙台藩士の子として生まれる','detail':'北辰一刀流を学ぶ。','tags':['origin']},
      {'year':1859,'age':26,'title':'試衛館に現れ、近藤勇と試合','detail':'負けた後、近藤に魅せられ試衛館に居着く。','tags':['turning_encounter']},
      {'year':1863,'age':30,'title':'新選組副長→総長','detail':'温厚な人格で隊士の信望を集める。','tags':['identity']},
      {'year':1865,'age':32,'title':'新選組を脱走','detail':'隊規違反として追われ、大津で自ら引き返す。','tags':['conflict','setback']},
      {'year':1865,'age':32,'title':'切腹、介錯は沖田総司','detail':'親しかった沖田の手で人生を終える。','tags':['death']}
    ],
    'quotes':[
      {'text':'わたしは、隊を愛していた。','source':'伝'},
      {'text':'沖田君、介錯を頼む。','source':'最期の言葉'},
      {'text':'誠とは、人を殺すことではない。','source':'伝'}
    ],
    'books':[
      {'title':'新選組異聞録','author':'子母澤寛','description':'山南の切腹を含む新選組秘話。'}
    ],
    'places':[],'tags':['loyalty','conflict','loss','short_life'],'themes':['shinsengumi','bakumatsu'],
    'traits':{'personality':'温厚・学識・繊細','strength':'剣術・人格','weakness':'理想と現実の板挟み','quirks':['島原の明里という遊女を愛した','遊女明里との別れは新選組屈指の悲話']},
    'relations':[{'id':'kondo_isami','label':'局長','relation':'上官'},{'id':'hijikata_toshizo','label':'副長、確執の相手','relation':'対立'},{'id':'okita_soji','label':'介錯人','relation':'友人'}]
  },
  {
    'id':'harada_sanosuke','name':'原田左之助','nameEn':'Harada Sanosuke','birth':1840,'death':1868,'country':'日本',
    'field':'武士・槍術','summary':'新選組十番隊組長。伊予松山藩の中間出身。種田流槍術の名手で、豪快な性格と怪力で隊の兵士たちをまとめた。池田屋事件で最前列に立ち、鳥羽伏見後は彰義隊に参加、上野戦争で負傷し28歳で死去。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Harada_Sanosuke.jpg?width=280',
    'wikiTitle':'原田左之助','birthMonth':0,'birthDay':0,'deathMonth':7,'deathDay':6,
    'events':[
      {'year':1840,'age':0,'title':'伊予松山藩の中間の家に生まれる','detail':'身分は低かったが豪胆な性格で知られた。','tags':['origin']},
      {'year':1863,'age':23,'title':'新選組結成に参加','detail':'十番隊組長、槍術師範に。','tags':['turning_encounter']},
      {'year':1864,'age':24,'title':'池田屋事件の最前列で突入','detail':'槍を手に暴れまわる。','tags':['courage','battle']},
      {'year':1867,'age':27,'title':'新選組を離脱、靖共隊を結成','detail':'永倉新八らと新選組を出る。','tags':['conflict']},
      {'year':1868,'age':28,'title':'上野戦争（彰義隊）で負傷','detail':'数日後、息を引き取る。','tags':['setback','death']}
    ],
    'quotes':[
      {'text':'俺の腹の傷は、嘘じゃねえ。','source':'自分の切腹未遂の傷を自慢して'},
      {'text':'槍があれば、何とかなる。','source':'伝'},
      {'text':'生き死にに、格好なんか要るか。','source':'伝'}
    ],
    'books':[
      {'title':'新選組血風録','author':'司馬遼太郎','asin':'4041263328','description':'原田左之助も登場する連作短編集。'}
    ],
    'places':[],'tags':['courage','short_life','loyalty'],'themes':['shinsengumi','bakumatsu'],
    'traits':{'personality':'豪快・短気・義理堅い','strength':'種田流槍術・怪力','weakness':'無鉄砲','quirks':['自分で腹を切ったが死ねず、その傷を自慢','馬賊になって大陸に渡った伝説']},
    'relations':[{'id':'kondo_isami','label':'局長','relation':'上官'},{'id':'hijikata_toshizo','label':'副長','relation':'同志'},{'id':'nagakura_shinpachi','label':'二番隊組長・盟友','relation':'友人'}]
  },
  {
    'id':'ito_kashitaro','name':'伊東甲子太郎','nameEn':'Ito Kashitaro','birth':1835,'death':1867,'country':'日本',
    'field':'武士・思想家','summary':'新選組参謀。学識豊かな尊王思想家で、北辰一刀流の剣豪。新選組に参謀として招かれるが、思想の違いから御陵衛士を結成して袂を分かつ。油小路事件で土方歳三の策により暗殺された。新選組内部の最大の悲劇。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Ito_Kashitaro.jpg?width=280',
    'wikiTitle':'伊東甲子太郎','birthMonth':0,'birthDay':0,'deathMonth':11,'deathDay':18,
    'events':[
      {'year':1835,'age':0,'title':'常陸国の藩士の家に生まれる','detail':'鈴木大蔵が本名。','tags':['origin']},
      {'year':1864,'age':29,'title':'新選組に参謀として加盟','detail':'近藤勇が学識と剣技を見込んで招く。','tags':['turning_encounter']},
      {'year':1867,'age':32,'title':'御陵衛士を結成して分派','detail':'尊王思想を表明、新選組と決別。','tags':['rebellion','conflict']},
      {'year':1867,'age':32,'title':'油小路事件で暗殺','detail':'酒席を装って呼び出され、帰路を襲われ死去。享年32。','tags':['death']}
    ],
    'quotes':[
      {'text':'吾が身は国のためにあり、一己のためにあらず。','source':'御陵衛士結成時'},
      {'text':'尊王の志、変わることなし。','source':'伝'},
      {'text':'私の死は、私の思想を証明する。','source':'伝'}
    ],
    'books':[
      {'title':'燃えよ剣','author':'司馬遼太郎','asin':'4167105764','description':'伊東の思想と新選組の対立が鮮烈に描かれる。'}
    ],
    'places':[],'tags':['identity','conflict','rebellion','loss'],'themes':['shinsengumi','bakumatsu'],
    'traits':{'personality':'知的・雄弁・理想主義','strength':'学問・剣術','weakness':'新選組の現場主義と合わなかった','quirks':['女性に人気があった','和歌の名手']},
    'relations':[{'id':'kondo_isami','label':'局長、最後の敵','relation':'対立'},{'id':'hijikata_toshizo','label':'副長、暗殺の首謀者','relation':'対立'},{'id':'saito_hajime','label':'暗殺実行者','relation':'対立'}]
  },
  # 戦国女性3
  {
    'id':'oichi','name':'お市の方','nameEn':'Oichi','birth':1547,'death':1583,'country':'日本',
    'field':'武家女性','summary':'織田信長の妹。戦国一の美女と謳われた。浅井長政に嫁ぎ3人の娘（茶々・初・江）を産むが、兄・信長と夫・長政の対立で小谷城落城、娘と共に脱出。のち柴田勝家と再婚するも賤ヶ岳の戦いで勝家と共に自害した。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Oichi-no-kata.jpg?width=280',
    'wikiTitle':'お市の方','birthMonth':0,'birthDay':0,'deathMonth':4,'deathDay':24,
    'events':[
      {'year':1547,'age':0,'title':'織田信秀の娘として生まれる','detail':'信長の妹、戦国一の美女と謳われた。','tags':['origin']},
      {'year':1567,'age':20,'title':'浅井長政と結婚','detail':'織田と浅井の同盟の象徴。娘3人（茶々・初・江）を授かる。','tags':['love','turning_encounter']},
      {'year':1570,'age':23,'title':'兄と夫の対立勃発','detail':'信長に小豆袋を送って夫の挟撃の危機を知らせた伝説。','tags':['conflict']},
      {'year':1573,'age':26,'title':'小谷城落城・長政自害','detail':'三姉妹と共に脱出。','tags':['setback','loss']},
      {'year':1582,'age':35,'title':'柴田勝家と再婚','detail':'信長の死後、秀吉と対立する勝家に嫁ぐ。','tags':['restart']},
      {'year':1583,'age':36,'title':'賤ヶ岳の戦い、勝家と共に自害','detail':'娘たちを脱出させ、夫と運命を共にした。','tags':['death']}
    ],
    'quotes':[
      {'text':'さらぬだに 打ちぬる程も 夏の夜の 夢路をさそふ 時鳥かな','source':'辞世の歌'},
      {'text':'娘たちよ、生きよ。','source':'北ノ庄城最期の夜'},
      {'text':'女の道は、愛する者と共にあること。','source':'伝'}
    ],
    'books':[
      {'title':'お市御寮人','author':'山本兼一','description':'お市を主人公にした歴史小説。'},
      {'title':'江〜姫たちの戦国〜','author':'田渕久美子','description':'お市とその娘たちを描く大河ドラマ原作。'}
    ],
    'places':[],'tags':['love','loss','beauty','courage'],'themes':['sengoku','rekijo_women'],
    'traits':{'personality':'気品・強さ・愛に生きる','strength':'美貌と気概','weakness':'二度とも夫を戦で失った','quirks':['戦国一の美女と謳われた','小豆袋の逸話','三人の娘全員が歴史を動かす']},
    'relations':[{'id':'oda_nobunaga','label':'兄','relation':'兄妹'}]
  },
  {
    'id':'yodo_dono','name':'淀殿','nameEn':'Yodo-dono','birth':1569,'death':1615,'country':'日本',
    'field':'武家女性','summary':'浅井長政とお市の方の長女・茶々。父と祖父、母を相次いで戦で失い、豊臣秀吉の側室となり秀頼を産む。秀吉死後は豊臣家の実質的な当主として大坂城に立ち、大坂の陣で秀頼と共に自害。戦国最大の悲劇を生きた女性。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Yodo-dono.jpg?width=280',
    'wikiTitle':'淀殿','birthMonth':0,'birthDay':0,'deathMonth':6,'deathDay':4,
    'events':[
      {'year':1569,'age':0,'title':'浅井長政の長女として生まれる','detail':'幼名は茶々。','tags':['origin']},
      {'year':1573,'age':4,'title':'小谷城落城・父の死','detail':'母と妹たちと脱出。','tags':['loss']},
      {'year':1583,'age':14,'title':'北ノ庄城で母を失う','detail':'母お市と義父・柴田勝家が自害。妹たちと共に秀吉に保護される。','tags':['loss','turning_encounter']},
      {'year':1588,'age':19,'title':'豊臣秀吉の側室に','detail':'父の仇、母の仇とも言える男の妻となる。','tags':['love','identity']},
      {'year':1593,'age':24,'title':'秀頼を出産','detail':'豊臣家待望の後継者。','tags':['create']},
      {'year':1598,'age':29,'title':'秀吉の死','detail':'実質的な豊臣家の当主となる。','tags':['loss','identity']},
      {'year':1615,'age':46,'title':'大坂夏の陣、秀頼と共に自害','detail':'大坂城炎上。戦国の女の運命を全うした。','tags':['death']}
    ],
    'quotes':[
      {'text':'豊臣の家は、我が子秀頼と共にあります。','source':'伝'},
      {'text':'私の人生は、愛する人を失い続ける旅であった。','source':'伝'},
      {'text':'太閤の妻として、母として、私は生きた。','source':'伝'}
    ],
    'books':[
      {'title':'淀君','author':'堀和久','description':'淀殿の内面に迫る歴史小説。'},
      {'title':'茶々〜戦国三姉妹物語〜','author':'ねねみつる','description':'茶々を描く連作。'}
    ],
    'places':[],'tags':['loss','love','identity','courage'],'themes':['sengoku','rekijo_women'],
    'traits':{'personality':'誇り高き・情熱的・孤独','strength':'美貌と血筋','weakness':'過剰な誇り','quirks':['父母を失い続けた人生','大坂城で自害']},
    'relations':[{'id':'oichi','label':'母','relation':'母子'},{'id':'oda_nobunaga','label':'伯父','relation':'親戚'}]
  },
  {
    'id':'hosokawa_gracia','name':'細川ガラシャ','nameEn':'Hosokawa Gracia','birth':1563,'death':1600,'country':'日本',
    'field':'武家女性・キリシタン','summary':'明智光秀の娘・玉。細川忠興の妻。父が本能寺の変で主君を討ったため、幽閉された後キリスト教に入信し洗礼名ガラシャとなる。関ヶ原の直前、石田三成に人質を取られるのを拒み、家臣に胸を突かせて自死。「散りぬべき時知りてこそ」と辞世を詠んだ。',
    'imageUrl':'https://commons.wikimedia.org/wiki/Special:FilePath/Hosokawa_Gracia.jpg?width=280',
    'wikiTitle':'細川ガラシャ','birthMonth':0,'birthDay':0,'deathMonth':7,'deathDay':17,
    'events':[
      {'year':1563,'age':0,'title':'明智光秀の娘として生まれる','detail':'幼名は玉。才色兼備と謳われた。','tags':['origin']},
      {'year':1578,'age':15,'title':'細川忠興と結婚','detail':'信長の意向で政略結婚。当初は夫婦仲睦まじかった。','tags':['love']},
      {'year':1582,'age':19,'title':'本能寺の変・父が謀反','detail':'父光秀が信長を討ち、数日後敗死。玉は味土野に幽閉される。','tags':['setback','loss']},
      {'year':1585,'age':22,'title':'大坂で侍女から洗礼を受ける','detail':'夫の目を盗みキリスト教徒に。洗礼名ガラシャ。','tags':['awakening','identity']},
      {'year':1600,'age':37,'title':'関ヶ原直前・石田三成の人質要求を拒否','detail':'家臣・小笠原少斎に胸を突かせ自害。屋敷に火を放たせた。','tags':['courage','death']}
    ],
    'quotes':[
      {'text':'散りぬべき 時知りてこそ 世の中の 花も花なれ 人も人なれ','source':'辞世の歌'},
      {'text':'わたしの信仰は、わたしの命よりも重い。','source':'伝'},
      {'text':'人質にはなりませぬ。神の御許へ参ります。','source':'自害直前'}
    ],
    'books':[
      {'title':'細川ガラシャ','author':'三浦綾子','asin':'4062748320','description':'キリスト教作家・三浦綾子の遺作（講談社文庫）。'},
      {'title':'ガラシャ夫人','author':'田渕久美子','description':'新たな視点から描くガラシャ像。'}
    ],
    'places':[],'tags':['love','identity','courage','awakening','death'],'themes':['sengoku','rekijo_women'],
    'traits':{'personality':'聡明・誇り高き・敬虔','strength':'知性と信仰','weakness':'夫の愛が歪んでいた','quirks':['当代随一の美女','夫の忠興は彼女の死後も後妻を娶らなかった時期がある']},
    'relations':[{'id':'oda_nobunaga','label':'父の主君','relation':'歴史上'}]
  },
]

# 書き込み
existing_slugs = {fp.stem for fp in BASE.glob('*.json')}
created = []
for p in PEOPLE:
  fp = BASE / f"{p['id']}.json"
  if fp.exists():
    print(f"SKIP (exists): {p['id']}")
    continue
  fp.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding='utf-8')
  created.append(p['id'])
  print(f"OK: {p['id']}")

# manifest 更新
manifest_fp = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'manifest.json'
m = json.loads(manifest_fp.read_text(encoding='utf-8'))
for slug in created:
  if slug not in m['people']: m['people'].append(slug)
manifest_fp.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"Total created: {len(created)} / manifest size: {len(m['people'])}")
