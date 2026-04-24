# -*- coding: utf-8 -*-
"""
偉人の個別ページ静的HTMLジェネレータ（SEO / OGP 向け）

- /app/p/{id}.html を生成
- 各ページに独自の og:title / og:description / og:image
- JSON-LD の Person 構造化データで検索エンジンに伝わる
- noscript でテキスト要約（検索エンジンが読める）
- JS 有効時は SPA (/app/?p={id}) にリダイレクト
- 結果: ツイッター・LINE・FBに貼るとカード画像が出る、Googleで検索される
"""
from __future__ import annotations
import json, pathlib, sys, html
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / 'data' / 'people'
OUT = ROOT / 'app' / 'p'
OUT.mkdir(parents=True, exist_ok=True)
SITE = 'https://ijin-to-jibun.com'

def esc(s): return html.escape(str(s) if s is not None else '', quote=True)

def format_year(y):
    if y is None: return '?'
    return f'前{abs(y)}' if y < 0 else f'{y}'

def build_html(p):
    pid = p['id']
    name = p.get('name', '')
    name_en = p.get('nameEn', '')
    summary = p.get('summary') or f'{name}の生涯と偉業を『偉人と自分。』で。'
    country = p.get('country', '')
    field = p.get('field', '')
    birth = p.get('birth')
    death = p.get('death')
    # imageUrl がローカルなら絶対URLに、Wiki URLならそのまま
    img_url = p.get('imageUrl') or ''
    if img_url.startswith('assets/'):
        img_abs = f'{SITE}/app/{img_url}'
    elif img_url.startswith('/'):
        img_abs = f'{SITE}{img_url}'
    elif img_url.startswith('http'):
        img_abs = img_url
    else:
        img_abs = f'{SITE}/app/assets/hero-silhouette.jpg'  # fallback
    life = f'{format_year(birth)}〜{format_year(death)}' if (birth is not None or death is not None) else ''

    title = f'{name} — {field}' if field else name
    desc_short = summary[:140]

    # 代表作・名言を短く
    works = p.get('works') or []
    work_titles = []
    for w in works[:4]:
        if isinstance(w, str): work_titles.append(w)
        elif isinstance(w, dict) and w.get('title'): work_titles.append(w['title'])

    quotes = p.get('quotes') or []
    first_quote = ''
    for q in quotes[:1]:
        if isinstance(q, str): first_quote = q
        elif isinstance(q, dict) and q.get('text'): first_quote = q['text']

    # JSON-LD
    jsonld = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        'name': name,
        'alternateName': name_en,
        'description': desc_short,
        'image': img_abs,
        'nationality': country,
        'url': f'{SITE}/app/p/{pid}.html',
    }
    if birth is not None and birth > 0: jsonld['birthDate'] = str(birth)
    if death is not None and death > 0: jsonld['deathDate'] = str(death)
    if field: jsonld['jobTitle'] = field
    if work_titles: jsonld['knowsAbout'] = work_titles
    jsonld_str = json.dumps(jsonld, ensure_ascii=False)

    spa_url = f'{SITE}/app/?p={pid}'
    return f"""<!DOCTYPE html>
<html lang="ja" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(name)}｜偉人と自分。</title>
<meta name="description" content="{esc(desc_short)}">
<meta name="keywords" content="{esc(name)},{esc(name_en)},{esc(field)},{esc(country)},偉人,名言,歴史">

<!-- OGP -->
<meta property="og:type" content="profile">
<meta property="og:site_name" content="偉人と自分。">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc_short)}">
<meta property="og:image" content="{esc(img_abs)}">
<meta property="og:image:alt" content="{esc(name)}の肖像">
<meta property="og:url" content="{spa_url}">
<meta property="og:locale" content="ja_JP">
<meta property="profile:first_name" content="{esc(name)}">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc_short)}">
<meta name="twitter:image" content="{esc(img_abs)}">

<link rel="canonical" href="{spa_url}">
<link rel="icon" type="image/png" href="/app/assets/favicon-32.png">

<!-- JSON-LD 構造化データ -->
<script type="application/ld+json">{jsonld_str}</script>

<!-- JS対応ブラウザは SPA にリダイレクト -->
<script>location.replace('{spa_url}');</script>
<meta http-equiv="refresh" content="2;url={spa_url}">

<style>
  body {{ font-family: 'Shippori Mincho', 'Noto Serif JP', serif; background: #faf7ef; color: #1a1a1a; margin: 0; padding: 40px 24px; max-width: 680px; margin: 0 auto; line-height: 1.85; }}
  h1 {{ font-size: 30px; margin-bottom: 4px; }}
  .en {{ font-size: 14px; color: #777; font-style: italic; margin-bottom: 8px; }}
  .meta {{ font-size: 13px; color: #555; margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }}
  img.portrait {{ width: 160px; height: 160px; object-fit: cover; border-radius: 50%; float: right; margin: 0 0 16px 16px; }}
  blockquote {{ border-left: 3px solid #c0a060; margin: 12px 0; padding: 6px 16px; color: #444; background: #fff; font-style: italic; }}
  .works {{ margin-top: 14px; font-size: 13px; color: #555; }}
  .cta {{ display: inline-block; margin-top: 20px; padding: 10px 22px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 4px; }}
</style>
</head>
<body>
<noscript>
<h1>{esc(name)}</h1>
{f'<div class="en">{esc(name_en)}</div>' if name_en else ''}
<div class="meta">{esc(life)} ／ {esc(country)} ／ {esc(field)}</div>
{f'<img class="portrait" src="{esc(img_abs)}" alt="{esc(name)}">' if img_abs else ''}
<p>{esc(summary)}</p>
{f'<blockquote>「{esc(first_quote)}」</blockquote>' if first_quote else ''}
{f'<div class="works">代表作: {esc(" / ".join(work_titles))}</div>' if work_titles else ''}
<a class="cta" href="{spa_url}">偉人と自分。で詳しく見る →</a>
</noscript>
<p>Redirecting to <a href="{spa_url}">{esc(name)} の詳細ページ</a>...</p>
</body>
</html>
"""

def build_sitemap(ids):
    urls = '\n'.join(
        f'  <url><loc>{SITE}/app/p/{pid}.html</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>'
        for pid in ids
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{SITE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>{SITE}/app/</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
{urls}
</urlset>
"""

def main():
    files = sorted(BASE.glob('*.json'))
    written = 0
    ids = []
    for fp in files:
        try: p = json.loads(fp.read_text(encoding='utf-8'))
        except Exception as e: print(f'skip {fp.name}: {e}'); continue
        pid = p.get('id')
        if not pid: continue
        out_path = OUT / f'{pid}.html'
        out_path.write_text(build_html(p), encoding='utf-8')
        ids.append(pid)
        written += 1
    # sitemap
    sm = ROOT / 'sitemap.xml'
    sm.write_text(build_sitemap(ids), encoding='utf-8')
    print(f'✓ {written} person pages → app/p/')
    print(f'✓ sitemap.xml with {len(ids)} URLs')

if __name__ == '__main__':
    main()
