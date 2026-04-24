#!/usr/bin/env python3
# 全偉人JSONを1つの data/people-bundle.json にまとめる。
# 新しい偉人を追加したら `python build-people-bundle.py` を実行してコミット。
# ブラウザは個別fetch の代わりにこれ1つを取得するので初回ロードが速い。
import json, os, sys
# Windows (cp932) でも日本語が print できるように stdout を UTF-8 に差し替え
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ROOT, 'data', 'manifest.json'), 'r', encoding='utf-8') as f:
    manifest = json.load(f)

people = []
missing = []
for pid in manifest['people']:
    path = os.path.join(ROOT, 'data', 'people', f'{pid}.json')
    if not os.path.exists(path):
        missing.append(pid); continue
    with open(path, 'r', encoding='utf-8') as f:
        people.append(json.load(f))

out_path = os.path.join(ROOT, 'data', 'people-bundle.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump({'people': people}, f, ensure_ascii=False, separators=(',', ':'))

size_kb = os.path.getsize(out_path) / 1024
print(f'OK: Full bundle -> data/people-bundle.json ({len(people)} people, {size_kb:.1f} KB)')

# 🪶 Lite バンドル: 一覧・ホーム用に軽量版を生成（初回ロード高速化）
#    コア情報のみ。詳細は per-person で lazy hydrate する。
LITE_KEYS = (
    'id', 'name', 'nameEn', 'birth', 'death', 'country', 'field',
    'imageUrl', 'summary', 'tags',
    'birthMonth', 'birthDay', 'deathMonth', 'deathDay',
)
lite_people = []
for p in people:
    lp = {k: p[k] for k in LITE_KEYS if k in p and p[k] not in (None, '', [], {})}
    # 最初の言葉だけティザー用に添える（あれば）
    if p.get('quotes') and len(p['quotes']):
        q = p['quotes'][0]
        if isinstance(q, str): lp['firstQuote'] = q[:80]
        elif isinstance(q, dict) and q.get('text'): lp['firstQuote'] = q['text'][:80]
    lite_people.append(lp)

lite_path = os.path.join(ROOT, 'data', 'people-lite.json')
with open(lite_path, 'w', encoding='utf-8') as f:
    json.dump({'people': lite_people}, f, ensure_ascii=False, separators=(',', ':'))
lite_kb = os.path.getsize(lite_path) / 1024
print(f'OK: Lite bundle -> data/people-lite.json ({len(lite_people)} people, {lite_kb:.1f} KB)  [初回ロード用]')
print(f'    軽量化率: {(1 - lite_kb/size_kb)*100:.0f}% 削減')

if missing:
    print(f'WARN: Missing JSON files for: {missing}', file=sys.stderr)
