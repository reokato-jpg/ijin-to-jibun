#!/usr/bin/env python3
# 深掘り済み偉人に追加の書籍を登録する（楽天/Amazon検索リンクでカバー）
import json, os, sys
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ADDITIONS = {
    'beethoven': [
        {"title": "ベートーヴェン 苦悩と闘い", "author": "属 啓成", "description": "音楽学者による決定版の評伝。苦悩と歓喜の生涯を丁寧に追う。"},
        {"title": "ベートーヴェンの生涯", "author": "ロマン・ロラン", "description": "ノーベル文学賞作家による詩的な評伝。英雄的生涯の原典。"},
        {"title": "ベートーヴェン 音楽と生涯", "author": "平野昭", "description": "最新の研究に基づく決定的入門書。"},
    ],
    'chopin': [
        {"title": "ショパン 愛と悲しみの音", "author": "加藤一郎", "description": "マヨルカ島からパリまで、ショパンの恋愛と音楽を辿る。"},
        {"title": "ショパン 人と芸術", "author": "小坂裕子", "description": "ピアニストによる読み解き。楽譜と人生が交錯する。"},
    ],
    'mozart': [
        {"title": "モーツァルト", "author": "海老澤敏", "description": "日本のモーツァルト研究の第一人者による決定版評伝。"},
        {"title": "モーツァルト書簡全集", "author": "モーツァルト", "description": "本人の肉声。父・姉・妻への手紙から見える天才の人間像。"},
        {"title": "アマデウス（ピーター・シェーファー戯曲）", "author": "ピーター・シェーファー", "description": "映画の原作戯曲。サリエリ視点から描かれる神童の物語。"},
    ],
    'van_gogh': [
        {"title": "ゴッホの手紙", "author": "フィンセント・ファン・ゴッホ", "description": "弟テオへの650通。絵画と同じ深さで彼の魂を記録した不朽の手紙集。"},
        {"title": "ゴッホ 伝記", "author": "スティーヴン・ネイフ", "description": "ピューリッツァー賞作家による決定版（1000ページ超）。"},
        {"title": "ゴッホの生涯と精神", "author": "アンリ・ペリュショ", "description": "フランスの伝記作家による情熱的な評伝。"},
    ],
    'socrates': [
        {"title": "ソクラテスの弁明・クリトン", "author": "プラトン", "description": "弟子プラトンが記録した、裁判と獄中の対話。"},
        {"title": "饗宴", "author": "プラトン", "description": "愛についてのソクラテスの対話。古代哲学の傑作。"},
        {"title": "ソクラテスの思い出", "author": "クセノフォン", "description": "もう一人の弟子による回想。プラトンと違う角度から。"},
    ],
    'einstein': [
        {"title": "アインシュタイン選集", "author": "アインシュタイン", "description": "本人による相対論の解説、エッセイ、書簡を集成。"},
        {"title": "アインシュタイン その生涯と宇宙", "author": "ウォルター・アイザックソン", "description": "Appleジョブズの伝記作家による決定版評伝。"},
    ],
    'dazai_osamu': [
        {"title": "人間失格", "author": "太宰治", "description": "死の直前に書いた自伝的遺書。『生まれて、すみません』の源泉。"},
        {"title": "斜陽", "author": "太宰治", "description": "戦後没落貴族の日記を原典にした代表作。"},
        {"title": "走れメロス", "author": "太宰治", "description": "友情と信頼の短編。教科書で多くの日本人が最初に出会う太宰。"},
    ],
    'nietzsche': [
        {"title": "ツァラトゥストラはかく語りき", "author": "ニーチェ", "description": "『神は死んだ』『超人』『永遠回帰』が込められた主著。"},
        {"title": "善悪の彼岸", "author": "ニーチェ", "description": "従来の道徳観を根底から問い直す哲学の劇薬。"},
        {"title": "この人を見よ", "author": "ニーチェ", "description": "発狂直前に書いた自己分析の書。鬼気迫る文体。"},
    ],
    'dostoevsky': [
        {"title": "罪と罰", "author": "ドストエフスキー", "description": "超人思想の予見的批判。ラスコーリニコフの魂の記録。"},
        {"title": "カラマーゾフの兄弟", "author": "ドストエフスキー", "description": "最後の大作。『神がいないなら全ては許される』の問い。"},
        {"title": "白痴", "author": "ドストエフスキー", "description": "ムイシュキン公爵の処刑直前の独白は、本人の体験そのもの。"},
    ],
    'curie': [
        {"title": "キュリー夫人伝", "author": "エーヴ・キュリー", "description": "次女エーヴが書いた、最も親密な母の肖像。"},
        {"title": "放射線とラジウム", "author": "マリー・キュリー", "description": "本人による放射能研究の総論。科学史の原典。"},
    ],
    'leonardo': [
        {"title": "レオナルド・ダ・ヴィンチ", "author": "ウォルター・アイザックソン", "description": "手稿7000ページを徹底分析した決定版評伝。"},
        {"title": "レオナルドの手記", "author": "ダ・ヴィンチ", "description": "鏡文字ノートの日本語訳。哲学・機械・解剖の横断。"},
    ],
    'soseki': [
        {"title": "こころ", "author": "夏目漱石", "description": "『私』と『先生』の書簡で描く、エゴと愛の物語。日本近代文学の金字塔。"},
        {"title": "三四郎", "author": "夏目漱石", "description": "地方から上京した青年の迷いを描く青春小説。"},
        {"title": "坊っちゃん", "author": "夏目漱石", "description": "松山中学時代を下敷きにした痛快小説。"},
    ],
    'oda_nobunaga': [
        {"title": "信長公記", "author": "太田牛一", "description": "信長の側近が残した一次史料。桶狭間から本能寺までの実記。"},
        {"title": "織田信長 天下布武の実像", "author": "金子拓", "description": "最新の研究に基づく信長像の再構築。"},
    ],
}

manifest_path = os.path.join(ROOT, 'data', 'manifest.json')
added_count = 0

for pid, new_books in ADDITIONS.items():
    path = os.path.join(ROOT, 'data', 'people', f'{pid}.json')
    if not os.path.exists(path):
        print(f'skip (not found): {pid}')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    existing_books = data.get('books', [])
    existing_titles = set(b.get('title', '') for b in existing_books if b)
    for nb in new_books:
        if nb['title'] in existing_titles:
            continue
        existing_books.append(nb)
        added_count += 1
    data['books'] = existing_books
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'OK: {pid} ({len(new_books)} considered)')

print(f'\nTotal new books added: {added_count}')
