# -*- coding: utf-8 -*-
"""phase3: さらに本を追加。ASIN無しでも栞fallbackで綺麗に表示される前提。"""
import sys, json, pathlib
sys.stdout.reconfigure(encoding='utf-8')
BASE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'people'

ADDITIONS = {
    'plato': [
        {'title': '国家', 'author': 'プラトン', 'description': '正義とは何か。西洋思想の原典。'},
        {'title': 'ソクラテスの弁明・クリトン', 'author': 'プラトン', 'description': '師ソクラテスの裁判を描く対話篇。'},
        {'title': '饗宴', 'author': 'プラトン', 'description': '愛（エロース）をめぐる対話篇。'},
    ],
    'napoleon': [
        {'title': 'ナポレオン言行録', 'author': 'オクターヴ・オブリ編', 'description': '皇帝自身の言葉で辿る生涯。'},
        {'title': 'ナポレオン', 'author': 'ジャン・チュラール', 'description': '第一級のフランス史家による定評ある伝記。'},
    ],
    'newton': [
        {'title': 'プリンキピア 自然哲学の数学的諸原理', 'author': 'アイザック・ニュートン', 'description': '近代科学の出発点。'},
        {'title': 'ニュートン 宇宙の法則を解き明かした天才科学者', 'author': 'ジェイムズ・グリック', 'description': '決定版評伝。'},
    ],
    'mother_teresa': [
        {'title': 'マザー・テレサ 愛と祈りのことば', 'author': 'ホセ・ルイス・ゴンザレス＝バラド編', 'description': '日々を照らす短い言葉集。'},
        {'title': 'マザー・テレサ 来、わが光よ', 'author': 'ブライアン・コロディエチェック編', 'description': '晩年の霊的苦悩を明かす書簡集。'},
    ],
    'shakespeare': [
        {'title': 'ハムレット', 'author': 'シェイクスピア', 'description': '「生きるべきか、死ぬべきか」—悲劇の頂点。'},
        {'title': 'マクベス', 'author': 'シェイクスピア', 'description': '野心と破滅を描く四大悲劇。'},
        {'title': 'ロミオとジュリエット', 'author': 'シェイクスピア', 'description': '愛の悲劇の原型。'},
    ],
    'oscar_wilde': [
        {'title': 'ドリアン・グレイの肖像', 'author': 'オスカー・ワイルド', 'description': '美と退廃の唯美主義の頂点。'},
        {'title': '獄中記 De Profundis', 'author': 'オスカー・ワイルド', 'description': '監獄から書かれた愛と悔恨の手紙。'},
    ],
    'orwell': [
        {'title': '1984', 'author': 'ジョージ・オーウェル', 'description': '全体主義の恐怖を描いた20世紀の預言書。'},
        {'title': '動物農場', 'author': 'ジョージ・オーウェル', 'description': '革命の裏切りを描く寓話。'},
    ],
    'poe': [
        {'title': 'ポー短編集', 'author': 'エドガー・アラン・ポー', 'description': '「黒猫」「アッシャー家の崩壊」等。'},
        {'title': '大鴉', 'author': 'エドガー・アラン・ポー', 'description': '詩の極点「Nevermore」。'},
    ],
    'sartre': [
        {'title': '嘔吐', 'author': 'ジャン＝ポール・サルトル', 'description': '実存主義文学の出発点。'},
        {'title': '実存主義とは何か', 'author': 'ジャン＝ポール・サルトル', 'description': '「実存は本質に先立つ」—講演録。'},
    ],
    'sagan': [
        {'title': 'COSMOS', 'author': 'カール・セーガン', 'description': '宇宙と人類を壮大なスケールで描くベストセラー。'},
        {'title': '人はなぜエセ科学に騙されるのか', 'author': 'カール・セーガン', 'description': '科学的思考の入門書。'},
    ],
    'schopenhauer': [
        {'title': '意志と表象としての世界', 'author': 'ショーペンハウアー', 'description': '主著。ニーチェもワグナーも影響された。'},
        {'title': '幸福について―人生論―', 'author': 'ショーペンハウアー', 'description': '辛辣だが不思議と慰めを与える人生指南。'},
    ],
    'seneca': [
        {'title': '人生の短さについて', 'author': 'セネカ', 'description': '時間とどう向き合うか。ストア派の名著。'},
        {'title': 'ルキリウスへの手紙', 'author': 'セネカ', 'description': '哲学書簡集。日々の迷いに効く。'},
    ],
    'spinoza': [
        {'title': 'エチカ', 'author': 'スピノザ', 'description': '幾何学的順序で書かれた倫理学の古典。'},
    ],
    'steve_jobs': [
        {'title': 'スティーブ・ジョブズ I・II', 'author': 'ウォルター・アイザックソン', 'description': '公式伝記。本人が最後に語った姿。'},
        {'title': 'Think Different スティーブ・ジョブズのことば', 'author': 'スティーブ・ジョブズ', 'description': 'スタンフォード演説を含む名言集。'},
    ],
    'saigo_takamori': [
        {'title': '南洲翁遺訓', 'author': '西郷隆盛', 'description': '西郷の思想が凝縮された語録。'},
    ],
    'sakamoto_ryoma': [
        {'title': '竜馬がゆく', 'author': '司馬遼太郎', 'description': '国民的小説、龍馬像を決定づけた大河。'},
    ],
    'nightingale': [
        {'title': '看護覚え書', 'author': 'フローレンス・ナイチンゲール', 'description': '近代看護の礎を築いた古典。'},
    ],
    'monet': [
        {'title': 'モネ 「印象・日の出」新印象派の誕生', 'author': 'ダニエル・ウィルデンスタイン', 'description': '評伝の決定版。'},
    ],
    'rodin': [
        {'title': 'ロダンの言葉抄', 'author': 'オーギュスト・ロダン', 'description': '彫刻家が語る芸術論。'},
    ],
    'rembrandt': [
        {'title': 'レンブラント伝', 'author': 'ガリー・シュヴァルツ', 'description': '自画像と人生を辿る評伝。'},
    ],
    'picasso': [
        {'title': 'ピカソ 天才とその世紀', 'author': 'ジェラルディン・アポストリデス', 'description': '20世紀最大の画家を多角的に描く。'},
    ],
    'raphael': [
        {'title': 'ラファエロ 静かなる革命の画家', 'author': 'アントニオ・パオルッチ', 'description': 'ルネサンス三巨匠の評伝。'},
    ],
    'salvador_dali': [
        {'title': 'ダリの私生活', 'author': 'サルバドール・ダリ', 'description': '奇想の画家による自伝。'},
    ],
    'schubert': [
        {'title': 'シューベルト 友人たちの回想', 'author': 'ヴィットール・ドイチュ編', 'description': '素顔のシューベルト。'},
    ],
    'schumann': [
        {'title': 'シューマンの自叙伝', 'author': 'ローベルト・シューマン', 'description': '音楽と人生を語る手記。'},
    ],
    'ravel': [
        {'title': 'ラヴェル', 'author': 'マニュエル・ロザンタール', 'description': '弟子による精密な評伝。'},
    ],
    'satie': [
        {'title': 'エリック・サティ覚え書', 'author': 'オルネラ・ヴォルタ編', 'description': '奇才サティの素描。'},
    ],
    'sibelius': [
        {'title': 'シベリウス', 'author': 'エリック・タワストシェルナ', 'description': '北欧の大作曲家の決定版評伝。'},
    ],
    'stravinsky': [
        {'title': 'ストラヴィンスキー自伝', 'author': 'イーゴリ・ストラヴィンスキー', 'description': '20世紀音楽の革命児、自ら語る。'},
    ],
    'prokofiev': [
        {'title': 'プロコフィエフ自伝', 'author': 'セルゲイ・プロコフィエフ', 'description': '少年期からの豊かな音楽人生。'},
    ],
    'shostakovich': [
        {'title': 'ショスタコーヴィチの証言', 'author': 'ソロモン・ヴォルコフ', 'description': 'ソ連時代を生きた作曲家の真実。'},
    ],
    'rachmaninoff': [
        {'title': 'ラフマニノフの想い出', 'author': 'オスカー・フォン・リーゼマン', 'description': '亡命前後の肉声に迫る。'},
    ],
    'ryuichi_sakamoto': [
        {'title': '音楽は自由にする', 'author': '坂本龍一', 'description': '生涯を率直に語り下ろした自伝。'},
        {'title': 'ぼくはあと何回、満月を見るだろう', 'author': '坂本龍一', 'description': '晩年に書き残した最後の言葉。'},
    ],
    'miyazawa_kenji': [
        {'title': '銀河鉄道の夜', 'author': '宮沢賢治', 'description': '日本文学の宇宙。'},
        {'title': '注文の多い料理店', 'author': '宮沢賢治', 'description': '童話集の代表作。'},
        {'title': '雨ニモマケズ', 'author': '宮沢賢治', 'description': '手帳に記された祈りのことば。'},
    ],
    'murasaki': [
        {'title': '源氏物語', 'author': '紫式部', 'description': '千年読み継がれる世界最古級の長編小説。'},
        {'title': '紫式部日記', 'author': '紫式部', 'description': '宮廷生活を透徹した筆致で記録。'},
    ],
    'okita_soji': [
        {'title': '壬生義士伝', 'author': '浅田次郎', 'description': '新選組を描いた名作小説。'},
    ],
    'saint_saens': [
        {'title': 'サン＝サーンス', 'author': 'ブライアン・レイズ', 'description': 'フランス音楽の巨匠の評伝。'},
    ],
    'scriabin': [
        {'title': 'スクリャービン', 'author': 'ファウビオン・バワーズ', 'description': '神秘主義の作曲家の決定版評伝。'},
    ],
    'shibusawa_eiichi': [
        {'title': '論語と算盤', 'author': '渋沢栄一', 'description': '日本資本主義の父が残した道徳と経済の書。'},
    ],
    'takeda_shingen': [
        {'title': '武田信玄', 'author': '新田次郎', 'description': '戦国最強の武将を描く代表作。'},
    ],
    'date_masamune': [
        {'title': '伊達政宗', 'author': '山岡荘八', 'description': '独眼竜の生涯を描く長編。'},
    ],
    'nishida': [
        {'title': '善の研究', 'author': '西田幾多郎', 'description': '日本哲学の出発点。'},
    ],
    'chaplin': [
        {'title': 'チャップリン自伝 若き日々', 'author': 'チャーリー・チャップリン', 'description': '貧民窟から世界のスターへ。'},
    ],
}

total = 0
missing = []
for slug, books in ADDITIONS.items():
    fp = BASE / f'{slug}.json'
    if not fp.exists():
        missing.append(slug); continue
    data = json.loads(fp.read_text(encoding='utf-8'))
    existing = data.get('books') or []
    existing_titles = {(b.get('title') or '').strip() for b in existing if isinstance(b, dict)}
    added = 0
    for b in books:
        if b['title'].strip() in existing_titles: continue
        existing.append(b); added += 1
    data['books'] = existing
    fp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    total += added
    print(f'OK: {slug} +{added}')
if missing: print(f'SKIP: {missing}')
print(f'Total: {total}')
