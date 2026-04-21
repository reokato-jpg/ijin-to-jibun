#!/usr/bin/env python3
# 動画用のテロップ画像を生成する
import os, sys
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1920, 1080
OUT = os.path.dirname(os.path.abspath(__file__))

FONT_SERIF = 'C:/Windows/Fonts/YuMin.ttc'
FONT_SANS = 'C:/Windows/Fonts/YuGothB.ttc'
FONT_SANS_M = 'C:/Windows/Fonts/YuGothM.ttc'

# フォールバック
if not os.path.exists(FONT_SERIF):
    FONT_SERIF = 'C:/Windows/Fonts/msmincho.ttc'
if not os.path.exists(FONT_SANS):
    FONT_SANS = 'C:/Windows/Fonts/meiryo.ttc'

def make_slide(filename, lines, bg=(26, 20, 15), text_color=(245, 232, 200), font=FONT_SERIF,
               subtitle=None, subtitle_color=(217, 186, 123), accent=None):
    img = Image.new('RGB', (W, H), bg)
    # 古紙テクスチャ風に軽くグラデーション
    overlay = Image.new('RGB', (W, H), (0,0,0))
    draw_ov = ImageDraw.Draw(overlay)
    for y in range(H):
        gray = int(15 + (y / H) * 8)
        draw_ov.line([(0, y), (W, y)], fill=(gray, gray-2, gray-4))
    img = Image.blend(img, overlay, 0.4)

    draw = ImageDraw.Draw(img)

    # メインテキスト
    total_h = 0
    line_heights = []
    rendered = []
    max_size = 78 if len(lines) > 1 else 96
    for line in lines:
        f = ImageFont.truetype(font, max_size)
        bbox = draw.textbbox((0, 0), line, font=f)
        lh = bbox[3] - bbox[1]
        rendered.append((line, f, bbox))
        line_heights.append(lh + 30)
        total_h += lh + 30
    total_h -= 30

    y = (H - total_h) // 2
    if subtitle:
        y -= 50

    for (line, f, bbox) in rendered:
        w = bbox[2] - bbox[0]
        x = (W - w) // 2
        # 影
        for dx, dy in [(-2,0),(2,0),(0,-2),(0,2)]:
            draw.text((x+dx, y+dy), line, font=f, fill=(0,0,0))
        draw.text((x, y), line, font=f, fill=text_color)
        y += (bbox[3] - bbox[1]) + 30

    if subtitle:
        f2 = ImageFont.truetype(FONT_SANS_M, 36)
        bb = draw.textbbox((0, 0), subtitle, font=f2)
        w = bb[2] - bb[0]
        x = (W - w) // 2
        y += 40
        draw.text((x, y), subtitle, font=f2, fill=subtitle_color)

    if accent:
        f3 = ImageFont.truetype(FONT_SANS, 28)
        bb = draw.textbbox((0, 0), accent, font=f3)
        w = bb[2] - bb[0]
        x = (W - w) // 2
        draw.text((x, H - 120), accent, font=f3, fill=(217, 186, 123))

    # 外側に柔らかいビネット
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([0, 0, W, H], fill=0)
    for i in range(80):
        alpha = int(i * 1.8)
        md.rectangle([i*3, i*3, W - i*3, H - i*3], fill=min(255, alpha))
    mask = mask.filter(ImageFilter.GaussianBlur(30))
    dark = Image.new('RGB', (W, H), (0, 0, 0))
    img = Image.composite(img, dark, mask)

    img.save(os.path.join(OUT, filename), 'JPEG', quality=92)
    print(f'  ✓ {filename}')

print('Creating slides...')
make_slide('s1-title.jpg', ['人は、同じ感情の流れの中で生きている。'],
           subtitle='偉人と自分。')
make_slide('s2-quote-chopin.jpg', ['「僕の心はもうここにない。', '私の半分はどこか遠くにある。」'],
           accent='— フレデリック・ショパン 1848', subtitle_color=(217,186,123))
make_slide('s3-quote-dazai.jpg', ['「生まれて、すみません。」'],
           accent='— 太宰治 1948', subtitle_color=(217,186,123))
make_slide('s4-quote-beethoven.jpg', ['「苦悩をつき抜けて', '歓喜に至れ。」'],
           accent='— ルートヴィヒ・ヴァン・ベートーヴェン', subtitle_color=(217,186,123))
make_slide('s5-intro.jpg', ['迷った時、逃げたくなった時、', '立ち止まった時。'],
           subtitle='偉人たちも、同じ場所を歩いた。')
make_slide('s6-brand.jpg', ['偉人と自分。'],
           subtitle='190人の偉人が、あなたの夜に寄り添う本棚')
make_slide('s7-feature1.jpg', ['190人の偉人', 'それぞれに映画一本分の物語'],
           subtitle='生涯 / 名言 / 内面の葛藤 / 知られざる逸話')
make_slide('s8-feature2.jpg', ['今日のあなたの気持ちで、', '偉人が見つかる'],
           subtitle='孤独 / 喪失 / 挑戦 / 愛 — 感情で辿る本棚')
make_slide('s9-feature3.jpg', ['偉人の1日を、', 'あなたの日常に重ねる'],
           subtitle='何時に起き、何を食べ、何時に書いたのか')
make_slide('s10-closing.jpg', ['あなたは独りじゃない。'],
           subtitle='彼らも、同じ場所を歩いた。')
make_slide('s11-cta.jpg', ['偉人と自分。'],
           subtitle='ijin-to-jibun.com',
           accent='完全無料・登録不要で試せます')
print('Done.')
