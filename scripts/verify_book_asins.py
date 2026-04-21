# -*- coding: utf-8 -*-
"""
全偉人の books を走査して、
- Amazonの画像URL (m.media-amazon.com) を HEAD して 200バイト未満（1x1透明画像）なら asin を削除
- 削除したASINがあれば代わりに openBD (ISBN-13) でcoverUrlを埋め込めないか試す
- 結果サマリを出力
"""
import json, pathlib, urllib.request, sys, time
sys.stdout.reconfigure(encoding='utf-8')
BASE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'people'

def fetch_size(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        r = urllib.request.urlopen(req, timeout=8)
        return len(r.read())
    except Exception:
        return 0

def isbn10_to_13(isbn10):
    """ASIN=ISBN-10の場合のみ変換。10桁で末尾Xを許容。"""
    if not isbn10 or len(isbn10) != 10: return None
    body = '978' + isbn10[:9]
    total = sum(int(d) * (1 if i%2==0 else 3) for i,d in enumerate(body))
    check = (10 - total % 10) % 10
    return body + str(check)

total_books = 0
removed_asins = 0
valid_asins = 0
added_covers = 0
no_asin = 0
sampled = 0

for fp in sorted(BASE.glob('*.json')):
    d = json.loads(fp.read_text(encoding='utf-8'))
    books = d.get('books') or []
    if not books: continue
    changed = False
    for b in books:
        if not isinstance(b, dict): continue
        total_books += 1
        asin = (b.get('asin') or '').strip()
        if not asin:
            no_asin += 1
            continue
        if not (len(asin) == 10 and (asin[:-1].isdigit() and (asin[-1].isdigit() or asin[-1].upper()=='X'))):
            # ASIN形式が書籍ISBN-10でなさそう → スキップ（Amazon独自ASINは残す）
            continue
        url = f'https://m.media-amazon.com/images/P/{asin}.09._SCLZZZZZZZ_.jpg'
        sz = fetch_size(url)
        sampled += 1
        if sz < 200:
            # 無効ASIN — 削除
            del b['asin']
            removed_asins += 1
            # openBDで代替を試す
            isbn13 = isbn10_to_13(asin)
            if isbn13:
                obd = f'https://cover.openbd.jp/{isbn13}.jpg'
                sz2 = fetch_size(obd)
                if sz2 > 500:
                    b['coverUrl'] = obd
                    added_covers += 1
            changed = True
        else:
            valid_asins += 1
        time.sleep(0.05)
    if changed:
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')

print(f'total books: {total_books}')
print(f'  no asin: {no_asin}')
print(f'  asin sampled: {sampled}')
print(f'  valid (Amazon): {valid_asins}')
print(f'  removed (1x1): {removed_asins}')
print(f'  openbd cover added: {added_covers}')
