#!/usr/bin/env python3
# style.css から、遅延読み込みして良いUI別のCSSルールを抜き出して
# app/style-lazy-*.css を生成する。元 style.css は変更しない。
#
# 抽出対象のセレクタ接頭辞（この接頭辞で始まるトップレベルルールを移動）:
#   meshiru-*      → style-lazy-meshiru.css
#   otayori-*      → style-lazy-otayori.css
#   worldview-*    → style-lazy-worldview.css
#   music-*        → style-lazy-music.css
#   plaza-*, phone-plaza-app → style-lazy-plaza.css
#
# @media ブロック内のルールは判定がややこしいのでここでは対象外。
import re, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'app', 'style.css')
with open(SRC, 'r', encoding='utf-8') as f:
    css = f.read()

GROUPS = {
    'meshiru':   [r'\.meshiru[-\w]*', r'\.phone-icon-meshiru\b', r'\.phone-tool-app#phoneMeshiruApp', r'#phoneMeshiruApp'],
    'otayori':   [r'\.otayori[-\w]*', r'\.phone-icon-otayori[-\w]*', r'\.phone-otayori[-\w]*', r'#phoneOtayoriApp'],
    'worldview': [r'\.worldview[-\w]*'],
    'plaza':     [r'\.plaza[-\w]*', r'\.phone-plaza-app\b', r'#phonePlazaApp'],
}

def pattern_for(prefixes):
    return re.compile(r'^\s*(?:' + '|'.join(prefixes) + r')\b')

# トップレベルのルールを粗く分割：{ の深さを見ながらブロックごとに取り出す
rules = []
i = 0
n = len(css)
while i < n:
    # @media, @supports などのネストは丸ごと1つとして扱う
    m = re.match(r'\s*@[a-z-]+[^{]*\{', css[i:])
    if m:
        start = i
        depth = 0
        j = i + m.end() - 1  # '{' の位置
        depth = 1
        j += 1
        while j < n and depth > 0:
            if css[j] == '{': depth += 1
            elif css[j] == '}': depth -= 1
            j += 1
        rules.append(('at', css[start:j]))
        i = j
        continue
    # 通常ルール: セレクタ ... { ... }
    brace = css.find('{', i)
    if brace == -1:
        tail = css[i:]
        if tail.strip(): rules.append(('misc', tail))
        break
    # コメントや改行混じりのセレクタも含めて取る
    selector = css[i:brace]
    depth = 1
    j = brace + 1
    while j < n and depth > 0:
        if css[j] == '{': depth += 1
        elif css[j] == '}': depth -= 1
        j += 1
    rules.append(('rule', selector + css[brace:j]))
    i = j

# 各グループに振り分け
bucket = {k: [] for k in GROUPS}
remaining = []
patterns = {k: pattern_for(v) for k, v in GROUPS.items()}
for kind, text in rules:
    if kind != 'rule':
        remaining.append(text)
        continue
    # セレクタ部分（{ の前）の各セレクタトークンごとに判定
    sel = text.split('{', 1)[0]
    # コメントを除去してから判定
    sel_clean = re.sub(r'/\*[\s\S]*?\*/', '', sel)
    matched = None
    for key, pat in patterns.items():
        # カンマ区切りの複数セレクタ、どれかが接頭辞一致すれば対象
        tokens = [t.strip() for t in sel_clean.split(',')]
        if any(pat.match(t) for t in tokens):
            matched = key
            break
    if matched:
        bucket[matched].append(text)
    else:
        remaining.append(text)

# 書き出し
os.makedirs(os.path.join(ROOT, 'app'), exist_ok=True)
for key, chunks in bucket.items():
    out_path = os.path.join(ROOT, 'app', f'style-lazy-{key}.css')
    if not chunks:
        continue
    header = f'/* 自動生成: style.css から {key}-* ルールを抽出 */\n'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(header)
        f.write(''.join(chunks))
    size_kb = os.path.getsize(out_path) / 1024
    print(f'  {key:10s} → app/style-lazy-{key}.css ({len(chunks)} rules, {size_kb:.1f} KB)')

# 本体 style.css から該当ルールを除去したものを書き戻す
new_style = ''.join(remaining)
new_path = os.path.join(ROOT, 'app', 'style.css')
with open(new_path, 'w', encoding='utf-8') as f:
    f.write(new_style)
before = len(css) / 1024
after = len(new_style) / 1024
print(f'\nstyle.css: {before:.1f} KB → {after:.1f} KB (core のみ)')
