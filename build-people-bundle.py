#!/usr/bin/env python3
# 全偉人JSONを1つの data/people-bundle.json にまとめる。
# 新しい偉人を追加したら `python build-people-bundle.py` を実行してコミット。
# ブラウザは 163 個別fetch の代わりにこれ1つを取得するので初回ロードが速い。
import json, os, sys

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
print(f'✓ Bundled {len(people)} people → data/people-bundle.json ({size_kb:.1f} KB)')
if missing:
    print(f'⚠ Missing JSON files for: {missing}', file=sys.stderr)
