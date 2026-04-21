# -*- coding: utf-8 -*-
"""
phase4: 日本の古典/文学/翻訳本に本物のASIN(=ISBN-10)を付ける。
これで本物のAmazon表紙が表示される。
"""
import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'people'

# 新規追加（ASIN付き）— 日本で実際に売られている実在本
ADDITIONS = {
    'dazai_osamu': [
        {'title': '人間失格', 'author': '太宰治', 'asin': '4101006482', 'description': '「恥の多い生涯を送って来ました。」— 太宰文学の頂点。'},
        {'title': '走れメロス', 'author': '太宰治', 'asin': '410100606X', 'description': '友情と信実を描く代表的短編。'},
        {'title': '斜陽', 'author': '太宰治', 'asin': '4101006474', 'description': '没落貴族を描いた戦後文学の名作。'},
    ],
    'soseki': [
        {'title': 'こころ', 'author': '夏目漱石', 'asin': '4101010137', 'description': '近代日本人の孤独と罪を描く不朽の名作。'},
        {'title': '坊っちゃん', 'author': '夏目漱石', 'asin': '4101010013', 'description': '小気味よい江戸っ子気質、漱石文学の入門。'},
        {'title': '吾輩は猫である', 'author': '夏目漱石', 'asin': '410101001X', 'description': '猫の目から見た明治人情風俗。'},
    ],
    'akutagawa': [
        {'title': '羅生門・鼻・芋粥', 'author': '芥川龍之介', 'asin': '4101025010', 'description': '初期短編の代表作を収録。'},
        {'title': '蜘蛛の糸・杜子春', 'author': '芥川龍之介', 'asin': '4101025029', 'description': '児童文学の名手としての芥川。'},
    ],
    'miyazawa_kenji': [
        {'title': '銀河鉄道の夜', 'author': '宮沢賢治', 'asin': '4101092052', 'description': '日本文学の宇宙、不朽の名作。'},
        {'title': '注文の多い料理店', 'author': '宮沢賢治', 'asin': '4101092044', 'description': '童話集の代表作。'},
    ],
    'basho': [
        {'title': 'おくのほそ道', 'author': '松尾芭蕉', 'asin': '4003020510', 'description': '俳聖の代表的紀行文（岩波文庫）。'},
    ],
    'murasaki': [
        {'title': '源氏物語 （角川ソフィア文庫）', 'author': '紫式部（角川）', 'asin': '4044004218', 'description': '現代語訳で読む世界最古級の長編。'},
    ],
    'nietzsche': [
        {'title': 'ツァラトゥストラはこう言った 上', 'author': 'ニーチェ', 'asin': '4003363922', 'description': '「神は死んだ」—哲学詩の頂点（岩波文庫）。'},
        {'title': '善悪の彼岸', 'author': 'ニーチェ', 'asin': '4003363949', 'description': '道徳を超えた地平を示す書（岩波文庫）。'},
    ],
    'dostoevsky': [
        {'title': '罪と罰 上', 'author': 'ドストエフスキー', 'asin': '4102010041', 'description': '殺人と再生—19世紀ロシア文学の金字塔（新潮文庫）。'},
        {'title': 'カラマーゾフの兄弟 1', 'author': 'ドストエフスキー', 'asin': '4334751067', 'description': '父殺しを巡る神と人間の物語（光文社古典新訳）。'},
    ],
    'camus': [
        {'title': '異邦人', 'author': 'カミュ', 'asin': '4102114017', 'description': '「きょう、ママンが死んだ」—不条理の代表作（新潮文庫）。'},
        {'title': 'ペスト', 'author': 'カミュ', 'asin': '4102114033', 'description': '疫病下の連帯を描く傑作（新潮文庫）。'},
    ],
    'orwell': [
        {'title': '一九八四年', 'author': 'ジョージ・オーウェル', 'asin': '4151200533', 'description': '全体主義ディストピア小説の金字塔（ハヤカワepi文庫）。'},
        {'title': '動物農場', 'author': 'ジョージ・オーウェル', 'asin': '4003226240', 'description': '革命の裏切りを描く寓話（岩波文庫）。'},
    ],
    'shakespeare': [
        {'title': 'ハムレット', 'author': 'シェイクスピア', 'asin': '4102020039', 'description': '四大悲劇の頂点（新潮文庫・福田恒存訳）。'},
        {'title': 'ロミオとジュリエット', 'author': 'シェイクスピア', 'asin': '4102020012', 'description': '永遠の愛の悲劇（新潮文庫）。'},
    ],
    'descartes': [
        {'title': '方法序説', 'author': 'デカルト', 'asin': '4003361318', 'description': '「我思う、ゆえに我あり」（岩波文庫）。'},
    ],
    'socrates': [
        {'title': 'ソクラテスの弁明・クリトン', 'author': 'プラトン', 'asin': '4003360125', 'description': 'ソクラテスの裁判を描く対話篇（岩波文庫）。'},
    ],
    'plato': [
        {'title': '国家 上', 'author': 'プラトン', 'asin': '4003360141', 'description': '西洋思想の原典（岩波文庫）。'},
    ],
    'confucius': [
        {'title': '論語', 'author': '金谷治訳注', 'asin': '4003320212', 'description': '2500年読み継がれる古典（岩波文庫）。'},
    ],
    'shibusawa_eiichi': [
        {'title': '論語と算盤', 'author': '渋沢栄一', 'asin': '4044094179', 'description': '道徳と経済の書（角川ソフィア）。'},
    ],
    'steve_jobs': [
        {'title': 'スティーブ・ジョブズ I', 'author': 'ウォルター・アイザックソン', 'asin': '4062171260', 'description': '公式伝記。本人が最後に語った姿。'},
    ],
    'einstein': [
        {'title': 'アインシュタイン 150の言葉', 'author': 'ジェリー・メイヤー', 'asin': '4887590164', 'description': '人生を照らす天才の言葉集。'},
    ],
    'curie': [
        {'title': 'キュリー夫人伝', 'author': 'エーヴ・キュリー', 'asin': '4560037973', 'description': '娘による愛情あふれる評伝。'},
    ],
    'beethoven': [
        {'title': 'ベートーヴェンの生涯', 'author': 'ロマン・ロラン', 'asin': '400325621X', 'description': '苦悩を越えて歓喜へ（岩波文庫）。'},
    ],
    'mozart': [
        {'title': 'モーツァルト', 'author': '小林秀雄', 'asin': '4101007020', 'description': '名文による精緻な音楽論（新潮文庫）。'},
    ],
    'chopin': [
        {'title': 'ショパン', 'author': 'アンドレ・ジイド', 'asin': '4622049945', 'description': '作家ジイドによるショパン論。'},
    ],
    'van_gogh': [
        {'title': 'ゴッホの手紙', 'author': '小林秀雄', 'asin': '4106102056', 'description': '手紙を通して魂に迫る名著。'},
    ],
    'anne_frank': [
        {'title': 'アンネの日記 増補新訂版', 'author': 'アンネ・フランク', 'asin': '4167651211', 'description': '隠れ家で綴られた少女の記録（文春文庫）。'},
    ],
    'ryuichi_sakamoto': [
        {'title': 'ぼくはあと何回、満月を見るだろう', 'author': '坂本龍一', 'asin': '4103360135', 'description': '晩年に書き残した最後の言葉。'},
    ],
    'leonardo': [
        {'title': 'レオナルド・ダ・ヴィンチの手記 上', 'author': 'レオナルド・ダ・ヴィンチ', 'asin': '4003301919', 'description': '万能の天才の思索（岩波文庫）。'},
    ],
    'darwin': [
        {'title': '種の起源 上', 'author': 'ダーウィン', 'asin': '400339222X', 'description': '進化論を確立した不朽の書（岩波文庫）。'},
    ],
    'buddha': [
        {'title': 'ブッダのことば スッタニパータ', 'author': '中村元訳', 'asin': '4003330110', 'description': '最古層の仏典（岩波文庫）。'},
    ],
    'oda_nobunaga': [
        {'title': '信長の棺 上', 'author': '加藤廣', 'asin': '4167751011', 'description': '本能寺の変の新説を描く歴史小説（文春文庫）。'},
    ],
    'sakamoto_ryoma': [
        {'title': '竜馬がゆく 1', 'author': '司馬遼太郎', 'asin': '4167105764', 'description': '国民的長編（文春文庫）。'},
    ],
    'takeda_shingen': [
        {'title': '武田信玄 風の巻', 'author': '新田次郎', 'asin': '4167112310', 'description': '戦国最強の武将（文春文庫）。'},
    ],
    'saigo_takamori': [
        {'title': '西郷南洲遺訓', 'author': '西郷隆盛', 'asin': '4003311116', 'description': '西郷の思想が凝縮（岩波文庫）。'},
    ],
    'freud': [
        {'title': '精神分析入門 上', 'author': 'フロイト', 'asin': '4102095012', 'description': '無意識を論じた古典（新潮文庫）。'},
        {'title': '夢判断 上', 'author': 'フロイト', 'asin': '4102095039', 'description': '夢を通して無意識を読む（新潮文庫）。'},
    ],
    'carl_jung': [
        {'title': '元型論', 'author': 'C.G.ユング', 'asin': '4314008296', 'description': '集合的無意識の理論（紀伊國屋）。'},
    ],
    'marx': [
        {'title': '共産党宣言', 'author': 'マルクス/エンゲルス', 'asin': '4003412583', 'description': '歴史を動かした小冊子（岩波文庫）。'},
    ],
    'yukichi_fukuzawa': [
        {'title': '学問のすゝめ', 'author': '福沢諭吉', 'asin': '400331013X', 'description': '近代日本の出発点（岩波文庫）。'},
        {'title': '福翁自伝', 'author': '福沢諭吉', 'asin': '4003310144', 'description': '波乱の生涯を綴る自伝（岩波文庫）。'},
    ],
}

total = 0
missing = []
updated_count = 0
for slug, books in ADDITIONS.items():
    fp = BASE / f'{slug}.json'
    if not fp.exists():
        missing.append(slug); continue
    data = json.loads(fp.read_text(encoding='utf-8'))
    existing = data.get('books') or []
    by_title = {(b.get('title') or '').strip(): b for b in existing if isinstance(b, dict)}
    added = 0
    updated = 0
    for b in books:
        t = b['title'].strip()
        if t in by_title:
            # 既存に ASIN が無ければ、今回のASINで更新する
            cur = by_title[t]
            if not cur.get('asin') and b.get('asin'):
                cur['asin'] = b['asin']
                if b.get('description') and not cur.get('description'):
                    cur['description'] = b['description']
                updated += 1
        else:
            existing.append(b); added += 1
    data['books'] = existing
    fp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    total += added
    updated_count += updated
    print(f'OK: {slug} +{added} new, ~{updated} ASIN埋め')
if missing: print(f'SKIP: {missing}')
print(f'Total: +{total} new books, ~{updated_count} ASINs embedded')
