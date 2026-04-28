# -*- coding: utf-8 -*-
"""偉人 JSON のスキーマ正規化（バグチェック後の構造統一）

- quotes: 文字列形式 → {text, source} dict 形式へ統一
- events[].tags: 欠落していれば [] を補完
- 必須フィールドが None のときに空配列/空オブジェクトを補う
- events / books / quotes / places / works / media / relations / traits 等は配列/オブジェクトで型固定

実行: python scripts/normalize_people_schema.py
"""
from __future__ import annotations
import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / 'data' / 'people'

ARRAY_FIELDS = ['events','quotes','places','books','media','works','relations','innerConflicts','turningPoints','unknownStories']
OBJECT_FIELDS = ['traits','imageCredit']

def normalize(d: dict) -> tuple[dict, list[str]]:
    changes: list[str] = []
    # quotes: string → {text, source: ''}
    if isinstance(d.get('quotes'), list):
        for i, q in enumerate(d['quotes']):
            if isinstance(q, str):
                d['quotes'][i] = {'text': q, 'source': ''}
                changes.append(f'quotes[{i}]: string→dict')
    # events[].tags: 欠落補完
    if isinstance(d.get('events'), list):
        for i, ev in enumerate(d['events']):
            if isinstance(ev, dict) and 'tags' not in ev:
                ev['tags'] = []
                changes.append(f'events[{i}].tags: missing→[]')
            elif isinstance(ev, dict) and not isinstance(ev.get('tags'), list):
                ev['tags'] = []
                changes.append(f'events[{i}].tags: non-list→[]')
    # 配列フィールド: None / 欠落 → []
    for k in ARRAY_FIELDS:
        v = d.get(k)
        if v is None:
            d[k] = []
            changes.append(f'{k}: None→[]')
        elif k in d and not isinstance(v, list):
            # オブジェクトで来る場合（例: routine が dict のケース）はスキップ
            if k != 'traits':
                pass
    # オブジェクトフィールド
    for k in OBJECT_FIELDS:
        if k in d and d[k] is None:
            d[k] = {}
            changes.append(f'{k}: None→{{}}')
    return d, changes

def main():
    files = sorted(PEOPLE.glob('*.json'))
    total_changed = 0
    total_files = 0
    for fp in files:
        try:
            d = json.loads(fp.read_text(encoding='utf-8'))
        except Exception as e:
            print(f'[skip] {fp.name}: {e}'); continue
        d, ch = normalize(d)
        if ch:
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            total_files += 1
            total_changed += len(ch)
            print(f'  [ok] {fp.stem}: {len(ch)} changes')
    print(f'\nDone: {total_changed} 件の正規化を {total_files} ファイルに適用')

if __name__ == '__main__':
    main()
