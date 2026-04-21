# -*- coding: utf-8 -*-
"""
phase2: 本を追加（ASINは意図的に省略 — 無くても検索URL＋栞風fallback表紙で綺麗に表示される）
phase1で扱ってない偉人に、入門書・伝記・代表作を付与。
"""
import sys, json, pathlib
sys.stdout.reconfigure(encoding='utf-8')

BASE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'people'

ADDITIONS = {
    'bach': [
        {'title': 'バッハ 生涯と作品', 'author': '樋口隆一', 'description': '音楽学者による評伝の決定版。'},
        {'title': 'バッハ=魂のエヴァンゲリスト', 'author': '礒山雅', 'description': '信仰と音楽の深い関係を描く名著。'},
    ],
    'brahms': [
        {'title': 'ブラームス回想録集', 'author': 'フランツ・グラスベルガー', 'description': '友人たちが語る素顔のブラームス。'},
        {'title': 'ブラームス', 'author': 'ヤン・スワフォード', 'description': '決定版と評される大型伝記。'},
    ],
    'debussy': [
        {'title': 'ドビュッシー 想念のエクトプラズム', 'author': '青柳いづみこ', 'description': 'ピアニスト・文筆家による深い論考。'},
        {'title': 'ドビュッシーとの散歩', 'author': '平島正郎', 'description': '生涯と作品世界を辿る入門書。'},
    ],
    'dvorak': [
        {'title': 'ドヴォルジャーク', 'author': 'クルト・ホノルカ', 'description': 'ボヘミアの心を歌った作曲家の評伝。'},
    ],
    'bartok': [
        {'title': 'バルトーク音楽論選', 'author': 'バルトーク・ベーラ', 'description': '民謡研究者としての思考が凝縮された論集。'},
    ],
    'faure': [
        {'title': 'フォーレ', 'author': 'ジャン=ミシェル・ネクトゥー', 'description': 'フランス近代音楽の巨匠を辿る評伝。'},
    ],
    'camus': [
        {'title': '異邦人', 'author': 'カミュ', 'description': '「きょう、ママンが死んだ」—不条理の代表作。'},
        {'title': 'ペスト', 'author': 'カミュ', 'description': '疫病下で問われる連帯と希望の物語。'},
        {'title': 'シーシュポスの神話', 'author': 'カミュ', 'description': '不条理に抗う哲学エッセイ。'},
    ],
    'chekhov': [
        {'title': '桜の園', 'author': 'チェーホフ', 'description': '変わりゆく時代を生きる人々の戯曲。'},
        {'title': 'かもめ', 'author': 'チェーホフ', 'description': '愛と芸術を巡る名作戯曲。'},
    ],
    'akutagawa': [
        {'title': '羅生門・鼻', 'author': '芥川龍之介', 'description': '短編の名手による代表作集。'},
        {'title': '地獄変', 'author': '芥川龍之介', 'description': '芸術と人間の業を描く傑作短編。'},
        {'title': '侏儒の言葉', 'author': '芥川龍之介', 'description': '晩年の鋭い警句集。'},
    ],
    'basho': [
        {'title': 'おくのほそ道', 'author': '松尾芭蕉', 'description': '俳聖の代表的紀行文。'},
        {'title': '芭蕉全句集', 'author': '雲英末雄・佐藤勝明編', 'description': '生涯の俳句を網羅。'},
    ],
    'buddha': [
        {'title': 'ブッダのことば スッタニパータ', 'author': '中村元訳', 'description': '最古層の仏典。原始仏教の言葉。'},
        {'title': 'ブッダ最後の旅', 'author': '中村元訳', 'description': '涅槃へ至る旅を描いた経典。'},
    ],
    'confucius': [
        {'title': '論語', 'author': '孔子（金谷治訳注）', 'description': '2500年読み継がれる人生の書。'},
        {'title': '論語と算盤', 'author': '渋沢栄一', 'description': '論語を近代日本で実践した書。'},
    ],
    'aristotle': [
        {'title': 'ニコマコス倫理学', 'author': 'アリストテレス', 'description': '徳と幸福を論じた倫理学の古典。'},
        {'title': '政治学', 'author': 'アリストテレス', 'description': '人間を「ポリス的動物」と定義した名著。'},
    ],
    'descartes': [
        {'title': '方法序説', 'author': 'デカルト', 'description': '「我思う、ゆえに我あり」—近代哲学の出発点。'},
        {'title': '省察', 'author': 'デカルト', 'description': '徹底的な懐疑から確実な知を求める書。'},
    ],
    'carl_jung': [
        {'title': 'ユング自伝', 'author': 'C.G. ユング', 'description': '『思い出・夢・思想』。心理学者の内面世界。'},
        {'title': '元型論', 'author': 'C.G. ユング', 'description': '集合的無意識とアーキタイプの理論。'},
    ],
    'darwin': [
        {'title': '種の起源', 'author': 'チャールズ・ダーウィン', 'description': '進化論を確立した不朽の書。'},
        {'title': 'ビーグル号航海記', 'author': 'チャールズ・ダーウィン', 'description': '若き日の観察が進化論の礎に。'},
    ],
    'edison': [
        {'title': 'エジソン 発明会社の創業者', 'author': '浜田和幸', 'description': '実業家としてのエジソン像。'},
    ],
    'anne_frank': [
        {'title': 'アンネの日記', 'author': 'アンネ・フランク', 'description': '隠れ家で綴られた少女の魂の記録。'},
    ],
    'audrey_hepburn': [
        {'title': 'オードリーのことば', 'author': 'エレン・エリクソン', 'description': '生涯を彩った美しい言葉。'},
        {'title': 'オードリー・ヘプバーン 自伝', 'author': 'ショーン・H・フェラー', 'description': '息子が語る母の素顔。'},
    ],
    'coco_chanel': [
        {'title': 'シャネル 人生を語る', 'author': 'ポール・モラン', 'description': '本人が友人に語ったシャネル哲学。'},
    ],
    'chaplin': [
        {'title': 'チャップリン自伝', 'author': 'チャーリー・チャップリン', 'description': '20世紀を生きた喜劇王の半生記。'},
    ],
    'bob_marley': [
        {'title': 'ボブ・マーリィ 魂の詩', 'author': 'クリストファー・ジョン・ファーリー', 'description': 'レゲエの伝道師を描く評伝。'},
    ],
    'david_bowie': [
        {'title': 'デヴィッド・ボウイ 変幻するカルト・スター', 'author': 'マーク・スピッツ', 'description': 'ロック史の異端児を辿る決定版。'},
    ],
    'freddie_mercury': [
        {'title': 'フレディ・マーキュリー 孤独な道化', 'author': 'レスリー＝アン・ジョーンズ', 'description': '華やかさと孤独の両面を描く評伝。'},
    ],
    'ella_fitzgerald': [
        {'title': 'エラ・フィッツジェラルド', 'author': 'スチュアート・ニコルソン', 'description': 'ジャズの女王の生涯。'},
    ],
    'billie_holiday': [
        {'title': '奇妙な果実 ビリー・ホリデイ自伝', 'author': 'ビリー・ホリデイ', 'description': 'ジャズの魂を燃やした歌手の告白。'},
    ],
    'cleopatra': [
        {'title': 'クレオパトラ', 'author': 'スタシー・シフ', 'description': '伝説を解体し、実像に迫る伝記。'},
    ],
    'dante': [
        {'title': '神曲', 'author': 'ダンテ・アリギエーリ', 'description': '地獄・煉獄・天国を旅する叙事詩。'},
    ],
    'camus2': [],  # placeholder
}
# Remove empty
ADDITIONS = {k: v for k, v in ADDITIONS.items() if v}

total = 0
missing = []
for slug, books in ADDITIONS.items():
    fp = BASE / f'{slug}.json'
    if not fp.exists():
        missing.append(slug)
        continue
    data = json.loads(fp.read_text(encoding='utf-8'))
    existing = data.get('books') or []
    existing_titles = {(b.get('title') or '').strip() for b in existing if isinstance(b, dict)}
    added = 0
    for b in books:
        if b['title'].strip() in existing_titles:
            continue
        existing.append(b)
        added += 1
    data['books'] = existing
    fp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    total += added
    print(f'OK: {slug} +{added}')

if missing:
    print(f'SKIP (not found): {missing}')
print(f'Total new books added: {total}')
