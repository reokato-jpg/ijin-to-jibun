# -*- coding: utf-8 -*-
"""
全偉人の顔写真を Wikipedia 日本語版から一気にバッチ取得。
- pageimages APIで1リクエストあたり最大50件を取得
- 429対策で3秒スリープ + リトライ3回
- 日本語版で取れなかったものは英語版にフォールバック
- ALWAYS モードで強制更新／CHECK モードで既存と違うもののみ更新
速度: 210人 → 5-7バッチ ≈ 20-40秒
"""
from __future__ import annotations
import json, pathlib, sys, time, urllib.parse, urllib.request, urllib.error
sys.stdout.reconfigure(encoding='utf-8')

BASE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'people'
UA = 'IjinToJibun/1.0 (https://ijin-to-jibun.com; contact@ijin-to-jibun.com)'
FORCE = '--force' in sys.argv or '-f' in sys.argv

def http_get_json(url: str, timeout=20, retries=3):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:
                # 指数バックオフ
                wait = 5 * (attempt + 1)
                print(f'    429 rate limit, wait {wait}s...')
                time.sleep(wait)
            else:
                break
        except Exception as e:
            last = e
            time.sleep(2)
    raise last

def batch_fetch_images(titles: list[str], lang='ja') -> dict[str, str]:
    result: dict[str, str] = {}
    if not titles: return result
    BATCH = 50
    for i in range(0, len(titles), BATCH):
        batch = titles[i:i+BATCH]
        params = {
            'action': 'query',
            'format': 'json',
            'titles': '|'.join(batch),
            'prop': 'pageimages',
            'piprop': 'original',
            'pilimit': 'max',
            'redirects': '1',
        }
        url = f'https://{lang}.wikipedia.org/w/api.php?' + urllib.parse.urlencode(params)
        print(f'  [{lang}] batch {i//BATCH + 1}: {len(batch)} titles')
        try:
            data = http_get_json(url)
        except Exception as e:
            print(f'    failed: {e}')
            time.sleep(3); continue
        q = data.get('query', {})
        # 逆マップ: 正規化後タイトル → 元タイトル
        normalized = {n['to']: n['from'] for n in q.get('normalized', [])}
        redirects  = {r['to']: r['from'] for r in q.get('redirects', [])}
        for pid, page in q.get('pages', {}).items():
            t = page.get('title')
            src = (page.get('original') or {}).get('source')
            if not (t and src): continue
            # 元のtitlesにあったリクエスト名に戻す
            orig = t
            seen = set()
            while orig not in batch and orig not in seen:
                seen.add(orig)
                if orig in redirects: orig = redirects[orig]
                elif orig in normalized: orig = normalized[orig]
                else: break
            key = orig if orig in batch else t
            result[key] = src
        time.sleep(3)  # 429対策: 各バッチの後に3秒待つ
    return result

def commons_special(url: str, width=500) -> str:
    """upload.wikimedia.org のURLを commons.wikimedia.org/Special:FilePath に書き換え（hotlink対策）
    ⚠ ファイル名はすでに URL エンコードされた状態で来るので、
       unquote で生の文字列に戻してから 1 回だけ quote し直す（二重エンコード防止）
    """
    import re
    if 'upload.wikimedia.org/wikipedia/' in url:
        m = re.search(r'/wikipedia/(?:commons|[a-z]+)/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/?]+)', url)
        if m:
            fname = m.group(1)
            # 一旦完全にデコード（%252C などの二重エンコードにも対応）、その後 1 回だけエンコード
            raw = urllib.parse.unquote(urllib.parse.unquote(fname))
            encoded = urllib.parse.quote(raw, safe='/')
            return f'https://commons.wikimedia.org/wiki/Special:FilePath/{encoded}?width={width}'
    return url

def main():
    files = sorted(BASE.glob('*.json'))
    docs = []
    for fp in files:
        try:
            d = json.loads(fp.read_text(encoding='utf-8'))
            docs.append((fp, d))
        except Exception as e:
            print(f'  [err] {fp.name}: {e}')
    print(f'Loaded {len(docs)} people. FORCE={FORCE}')

    # 全員をja批問い合わせ
    ja_titles = [d['wikiTitle'] for fp, d in docs if d.get('wikiTitle')]
    ja_titles = list(dict.fromkeys(ja_titles))
    print(f'\n[1/2] ja.wikipedia.org で {len(ja_titles)}人分の画像を一気取得...')
    ja_map = batch_fetch_images(ja_titles, lang='ja')
    print(f'  -> 取得成功: {len(ja_map)}人')

    # 英語版フォールバック（名前en）
    missing_ja = [(fp, d) for fp, d in docs if d.get('wikiTitle') not in ja_map]
    en_titles = [d['nameEn'] for fp, d in missing_ja if d.get('nameEn')]
    en_titles = list(dict.fromkeys(en_titles))
    en_map: dict[str, str] = {}
    if en_titles:
        print(f'\n[2/2] en.wikipedia.org で残り {len(en_titles)}人分を試行...')
        en_map = batch_fetch_images(en_titles, lang='en')
        print(f'  -> 英語版取得: {len(en_map)}人')

    # 適用
    updated, skipped, missing = 0, 0, []
    for fp, d in docs:
        t = d.get('wikiTitle')
        en = d.get('nameEn')
        src = ja_map.get(t) or en_map.get(en)
        if not src:
            missing.append((d.get('id'), d.get('name')))
            continue
        new_url = commons_special(src, 500)
        old_url = d.get('imageUrl') or ''
        if FORCE or new_url != old_url:
            d['imageUrl'] = new_url
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            updated += 1
        else:
            skipped += 1

    print(f'\n{"="*50}')
    print(f'更新: {updated}人  / 変更なし: {skipped}人  / 写真なし: {len(missing)}人')
    if missing:
        print('\n写真取得できず:')
        for mid, mname in missing[:30]:
            print(f'  {mid:25s} {mname}')

if __name__ == '__main__':
    main()
