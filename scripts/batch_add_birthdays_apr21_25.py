#!/usr/bin/env python3
# 4/21〜4/25生まれの偉人6名を追加
import json, os, sys
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PEOPLE = [
    {
        "id": "max_weber", "name": "マックス・ウェーバー", "nameEn": "Max Weber",
        "birth": 1864, "death": 1920, "bm": 4, "bd": 21,
        "country": "ドイツ", "field": "社会学者・経済学者",
        "summary": "近代社会学の父。『プロテスタンティズムの倫理と資本主義の精神』で宗教と経済の関係を解き明かし、官僚制・カリスマ・合理化の概念で20世紀の社会科学を築いた。",
        "quotes": ["学問を職業とする者は、誰しも情熱と自己批判を必要とする。", "世界は合理化の鉄の檻へと向かっている。"],
        "digest": "ドイツの社会学者・経済学者、近代社会学の創始者の一人。『プロテスタンティズムの倫理と資本主義の精神』(1905) で禁欲的プロテスタンティズムが近代資本主義を生んだと論じた。『支配の3類型』（カリスマ的・伝統的・合法的）や『官僚制』『合理化』の概念を確立。第一次大戦敗戦後のドイツで政治にも関与。スペイン風邪と肺炎のため1920年、56歳で逝去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Max_Weber_1894.jpg/280px-Max_Weber_1894.jpg",
        "foods": ["ドイツ家庭料理", "ビール", "コーヒー"],
        "hobbies": ["読書（古典・宗教書）", "散歩", "書簡"],
        "personality": "知的、情熱的、鬱傾向、禁欲的。学問と行動を統合しようと苦しんだ思想家。",
    },
    {
        "id": "charlotte_bronte", "name": "シャーロット・ブロンテ", "nameEn": "Charlotte Brontë",
        "birth": 1816, "death": 1855, "bm": 4, "bd": 21,
        "country": "イギリス", "field": "小説家",
        "summary": "『ジェイン・エア』で女性の自立と情熱を描いたヴィクトリア朝の作家。5人姉妹兄弟のうち3人の姉妹（シャーロット・エミリー・アン）で文学史を作った。",
        "quotes": ["私は鳥でもなければ、網にかかる身でもない。私は自由な意志を持つ自由な人間だ。", "人生は短いのに、恨みで時を満たすほど長くはない。"],
        "digest": "イギリスの小説家、ブロンテ三姉妹の長姉。仮名『カラー・ベル』で発表した『ジェイン・エア』(1847) が大成功。孤児の家庭教師が盲目の雇い主ロチェスターと結ばれるゴシック・ロマンスは女性の自立と情熱を同居させた画期作。姉妹エミリー（嵐が丘）とアン（ワイルドフェル・ホールの住人）を相次いで失い、自身も38歳で妊娠合併症のため死去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Charlotte_Bront%C3%AB_coloured_drawing.png/280px-Charlotte_Bront%C3%AB_coloured_drawing.png",
        "foods": ["紅茶（濃いめ）", "スコーン", "ポリッジ（オートミール）"],
        "hobbies": ["執筆", "スケッチ", "読書（シェイクスピア、バイロン）", "散歩（ヨークシャーの荒野）"],
        "personality": "内向的、情熱的、意志の強さ、孤独。家族を相次いで失いながら書き続けた。",
    },
    {
        "id": "lenin", "name": "ウラジーミル・レーニン", "nameEn": "Vladimir Lenin",
        "birth": 1870, "death": 1924, "bm": 4, "bd": 22,
        "country": "ロシア／ソ連", "field": "革命家・政治家",
        "summary": "ロシア革命の指導者、ソビエト連邦の創設者。1917年十月革命で帝政ロシアを倒し、世界初の共産主義国家を樹立した20世紀最大の革命家。",
        "quotes": ["学べ、学べ、そしてまた学べ。", "自由はあまりに貴重だから、配給制にしなければならない。"],
        "digest": "ロシアの革命家、マルクス主義者、ソ連の初代国家元首。本名ウラジーミル・イリイチ・ウリヤノフ。兄の処刑を機に革命運動へ。ロシア社会民主労働党ボリシェヴィキ派の指導者として1917年四月テーゼを発表、十月革命で権力を掌握。ブレスト講和でドイツと単独講和、内戦に勝利し、1922年ソ連樹立。複数の脳卒中の末、53歳でモスクワ郊外で逝去。レーニン廟に防腐処理された遺体が今も安置。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Bundesarchiv_Bild_183-71043-0003%2C_Wladimir_Iljitsch_Lenin.jpg/280px-Bundesarchiv_Bild_183-71043-0003%2C_Wladimir_Iljitsch_Lenin.jpg",
        "foods": ["質素なロシア料理", "紅茶（サモワール）", "黒パン"],
        "hobbies": ["読書（マルクス・トルストイ）", "チェス", "狩猟（亡命中）"],
        "personality": "冷徹、戦略的、禁欲的、カリスマ。理論と行動を一体化させた革命家。",
    },
    {
        "id": "jmw_turner", "name": "ジョゼフ・ターナー", "nameEn": "J.M.W. Turner",
        "birth": 1775, "death": 1851, "bm": 4, "bd": 23,
        "country": "イギリス", "field": "画家（ロマン主義・風景画）",
        "summary": "光と大気を描いた英国ロマン主義の巨匠、印象派の先駆者。『戦艦テメレール号』『吹雪、ハンニバルと彼の軍隊のアルプス越え』——風景画を感情の表現に変えた。",
        "quotes": ["太陽こそ、神の目である。", "絵画は、詩を超えた真実を示す。"],
        "digest": "イギリスのロマン主義画家、水彩・油彩の両方で風景を革命した。ロンドンの床屋の息子として生まれ、14歳で王立美術アカデミーに入学。『戦艦テメレール号、解体のため最後の停泊地へ曳航される』(1839)、『吹雪——港の沖合の蒸気船』(1842) など光と大気の劇的表現で知られ、晩年の抽象的な作品はモネら印象派に直接影響。生涯独身、偏屈で秘密主義。76歳、チェルシーの愛人の家で『太陽は神だ』と呟いて逝去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Turner_selfportrait.jpg/280px-Turner_selfportrait.jpg",
        "foods": ["質素な英国料理", "紅茶", "シェリー酒"],
        "hobbies": ["旅行（アルプス・ヴェネツィア）", "スケッチ", "釣り"],
        "personality": "内向的、偏屈、完璧主義、独立独歩。社交を嫌い、アトリエに籠った天才。",
    },
    {
        "id": "ella_fitzgerald", "name": "エラ・フィッツジェラルド", "nameEn": "Ella Fitzgerald",
        "birth": 1917, "death": 1996, "bm": 4, "bd": 25,
        "country": "アメリカ", "field": "ジャズ歌手（ファースト・レディ・オブ・ソング）",
        "summary": "ジャズの女王、『ファースト・レディ・オブ・ソング』。3オクターブを軽々と渡る声とスキャットで、アメリカ・ソングブックを世界の遺産に変えた20世紀最大の歌姫。",
        "quotes": ["私は難しいことは考えない——ただ、歌うだけ。", "歌は人生の複雑さを、シンプルな美に変える。"],
        "digest": "アメリカのジャズ歌手。ヴァージニア州の貧困家庭に生まれ、15歳で孤児院へ。1934年アポロ劇場のアマチュア・ナイトに出場して転機。チック・ウェブ楽団で頭角を現し、1938年『A-Tisket, A-Tasket』が大ヒット。その後『アメリカン・ソングブック』シリーズでガーシュウィン・ポーター・エリントンなどの作品を決定版として録音。スキャット（即興の声楽器）の最高峰。糖尿病で両足を失ってなお歌い続け、79歳でビバリーヒルズの自宅で静かに逝去。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Ella_Fitzgerald_1968.jpg/280px-Ella_Fitzgerald_1968.jpg",
        "foods": ["アメリカ南部料理（フライドチキン）", "アイスクリーム（大好物）", "レモネード"],
        "hobbies": ["歌（1日数時間の練習）", "料理", "家族との時間", "植物の世話"],
        "personality": "シャイ、謙虚、温かい、舞台では堂々。私生活では静かな人柄。",
    },
    {
        "id": "marconi", "name": "グリエルモ・マルコーニ", "nameEn": "Guglielmo Marconi",
        "birth": 1874, "death": 1937, "bm": 4, "bd": 25,
        "country": "イタリア", "field": "発明家・電気技術者（無線通信の父）",
        "summary": "無線通信の父、ラジオを発明した電気技術の革命児。1901年大西洋横断無線通信に成功、世界を電波でつないだ1909年ノーベル物理学賞受賞者。",
        "quotes": ["発明とは、不可能を可能に変える長い忍耐だ。", "失敗は成功の材料である。"],
        "digest": "イタリアの発明家、無線通信の実用化で知られる。ボローニャ郊外の自邸の屋根裏で1894年から実験を開始、1897年イギリスで世界初の無線通信会社を設立。1901年ニューファンドランドからイギリスまでの大西洋横断無線通信に成功し世界を驚愕させた。1909年、カール・フェルディナント・ブラウンと共にノーベル物理学賞。タイタニック号の救難信号（1912）もマルコーニの無線技術。63歳、ローマで心臓発作のため逝去。イタリア国葬、世界中のラジオ局が2分間の沈黙で追悼した。",
        "img": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Guglielmo_Marconi.jpg/280px-Guglielmo_Marconi.jpg",
        "foods": ["イタリア料理", "エスプレッソ", "ワイン（キャンティ）"],
        "hobbies": ["電気工学実験", "航海（自家ヨット『エレットラ号』）", "写真"],
        "personality": "情熱的、実務的、社交家、愛国的。発明を実用化しビジネスにした経営者肌の科学者。",
    },
]

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
        'relations': [], 'places': [], 'books': [],
        'imageUrl': p['img'], 'wikiTitle': p['name'],
        'birthMonth': p['bm'], 'birthDay': p['bd'],
        'lifeDigest': p['digest'],
        'traits': {'foods': p['foods'], 'hobbies': p['hobbies'], 'personality': p['personality'], 'likes': [], 'dislikes': []},
    }
    path = os.path.join(ROOT, 'data', 'people', f'{p["id"]}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    added.append(p['id'])
    print(f'OK: {p["id"]}')

manifest['people'].extend(added)
with open(manifest_path, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print(f'\n{len(added)} new people added. Total: {len(manifest["people"])}')
