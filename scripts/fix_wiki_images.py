# -*- coding: utf-8 -*-
"""
Wikipedia画像の 429 Too Many Requests 対策。
upload.wikimedia.org の thumb URL は hotlink 制限があるため、
commons.wikimedia.org/wiki/Special:FilePath/<filename>?width=N に書き換える（公式リダイレクト）。
"""
import json, pathlib, re, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'people'

# 例：
# https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Max_Weber_1894.jpg/280px-Max_Weber_1894.jpg
# → https://commons.wikimedia.org/wiki/Special:FilePath/Max_Weber_1894.jpg?width=280
THUMB_RE = re.compile(r'https?://upload\.wikimedia\.org/wikipedia/(commons|[a-z]+)/thumb/[0-9a-f]/[0-9a-f]{2}/([^/]+)/(\d+)px-[^/?]+(?:\?[^"\']*)?$')
# 非thumb（原寸）:
# https://upload.wikimedia.org/wikipedia/commons/7/7e/Max_Weber_1894.jpg
FULL_RE = re.compile(r'https?://upload\.wikimedia\.org/wikipedia/(commons|[a-z]+)/[0-9a-f]/[0-9a-f]{2}/([^/?]+)(?:\?[^"\']*)?$')

def rewrite(url):
    if not url: return url
    m = THUMB_RE.match(url)
    if m:
        fname = m.group(2)
        width = m.group(3)
        return f'https://commons.wikimedia.org/wiki/Special:FilePath/{fname}?width={width}'
    m = FULL_RE.match(url)
    if m:
        fname = m.group(2)
        return f'https://commons.wikimedia.org/wiki/Special:FilePath/{fname}?width=400'
    return url

changed = 0
unchanged = 0
failed_samples = []
for fp in sorted(BASE.glob('*.json')):
    d = json.loads(fp.read_text(encoding='utf-8'))
    old = d.get('imageUrl')
    if not old: continue
    new = rewrite(old)
    if new != old:
        d['imageUrl'] = new
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')
        changed += 1
    else:
        unchanged += 1
        if 'upload.wikimedia.org' in old and len(failed_samples) < 5:
            failed_samples.append((fp.stem, old))

print(f'Changed: {changed}')
print(f'Unchanged: {unchanged}')
if failed_samples:
    print('Could not match (samples):')
    for s,u in failed_samples: print(f'  {s}: {u}')
