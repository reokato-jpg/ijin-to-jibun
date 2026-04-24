# -*- coding: utf-8 -*-
"""
Wiki画像パイプライン — 偉人の顔写真を自前ホスト化。

- 現在の imageUrl (commons.wikimedia.org/Special:FilePath/...) から画像を DL
- Pillow で 400x400 の正方形 WebP に変換（中央クロップ）
- app/assets/portraits/{id}.webp に保存
- 偉人 JSON の imageUrl をローカルパスに書き換え
- 元URLは imageUrlSource として保持（クレジット表示・再取得用）

効果:
- 初回ロード爆速（Wikipedia リダイレクト待ちゼロ）
- CORS 不要
- ファイルサイズ大幅減（例: 2MB JPEG → 20-30KB WebP）
- オフライン対応（SW でキャッシュ済み）

使い方:
  pip install Pillow requests
  python scripts/resize_portraits.py            # 未処理分のみ
  python scripts/resize_portraits.py --force    # 全部再生成
  python scripts/resize_portraits.py --ids a,b  # 特定IDのみ
"""
from __future__ import annotations
import json, pathlib, sys, io, os, argparse, time, urllib.request, urllib.error
import concurrent.futures as cf
try:
    from PIL import Image
except ImportError:
    print('❌ Pillow が入っていません: pip install Pillow')
    sys.exit(1)

sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / 'data' / 'people'
OUT_DIR = ROOT / 'app' / 'assets' / 'portraits'
OUT_DIR.mkdir(parents=True, exist_ok=True)

UA = 'IjinToJibun/1.0 (https://ijin-to-jibun.com)'
TARGET_SIZE = 400
QUALITY = 82

def download(url: str, timeout: int = 30, retries: int = 4) -> bytes:
    """429時は指数バックオフで再試行"""
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code == 429:
                wait = min(60, 5 * (2 ** attempt))  # 5, 10, 20, 40 秒
                time.sleep(wait)
                continue
            raise
        except Exception as e:
            last_err = e
            time.sleep(2)
    raise last_err or Exception('download failed')

def smart_crop(img: Image.Image, target: int = TARGET_SIZE) -> Image.Image:
    """中央クロップで正方形化 → target×target にリサイズ"""
    w, h = img.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    img = img.crop((left, top, left + s, top + s))
    return img.resize((target, target), Image.LANCZOS)

def process_one(fp: pathlib.Path, force: bool) -> tuple[str, str]:
    """(status, msg) を返す"""
    try:
        d = json.loads(fp.read_text(encoding='utf-8'))
    except Exception as e:
        return ('error', f'{fp.name}: load error {e}')
    pid = d.get('id') or fp.stem
    url = d.get('imageUrl') or ''
    src = d.get('imageUrlSource') or url  # 元URLが保持されていればそれを使う
    out_path = OUT_DIR / f'{pid}.webp'

    if not src or not src.startswith('http'):
        return ('skip', f'{pid}: no source URL')
    if out_path.exists() and not force:
        # すでにローカルパスに書き換え済みなら完了
        if d.get('imageUrl', '').startswith('assets/portraits/'):
            return ('skip', f'{pid}: already processed')
    try:
        raw = download(src)
    except Exception as e:
        return ('error', f'{pid}: download failed {e}')
    try:
        img = Image.open(io.BytesIO(raw))
        # RGBA や P を RGB に変換（WebP はアルファ対応だがサイズ削減のため RGB）
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        img = smart_crop(img)
        img.save(out_path, 'webp', quality=QUALITY, method=6)
    except Exception as e:
        return ('error', f'{pid}: process failed {e}')

    # 新URLを相対パスに
    d['imageUrlSource'] = src
    d['imageUrl'] = f'assets/portraits/{pid}.webp'
    fp.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    size_kb = out_path.stat().st_size / 1024
    return ('ok', f'{pid}: {size_kb:.1f} KB')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', '-f', action='store_true', help='既に処理済みでも再ダウンロード')
    ap.add_argument('--ids', type=str, default='', help='カンマ区切りIDだけ処理')
    ap.add_argument('--workers', type=int, default=3, help='並列ダウンロード数（Wiki 429 対策で少なめ）')
    args = ap.parse_args()

    files = sorted(BASE.glob('*.json'))
    if args.ids:
        want = set(s.strip() for s in args.ids.split(',') if s.strip())
        files = [f for f in files if f.stem in want]
    print(f'Processing {len(files)} people → {TARGET_SIZE}x{TARGET_SIZE} WebP (quality {QUALITY})')
    print(f'Output dir: {OUT_DIR.relative_to(ROOT)}')
    t0 = time.time()
    ok, skip, err = [], [], []
    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one, f, args.force): f for f in files}
        for i, fut in enumerate(cf.as_completed(futs), 1):
            status, msg = fut.result()
            if status == 'ok':    ok.append(msg);   prefix = '✓'
            elif status == 'skip': skip.append(msg); prefix = '–'
            else:                  err.append(msg);  prefix = '✗'
            print(f'  [{i:3d}/{len(files)}] {prefix} {msg}')
    elapsed = time.time() - t0
    # 集計
    total_kb = sum((OUT_DIR / (pathlib.Path(fp).stem + '.webp')).stat().st_size
                   for fp in files if (OUT_DIR / (pathlib.Path(fp).stem + '.webp')).exists()) / 1024
    print(f'\n================================')
    print(f'✓ OK     : {len(ok)}人')
    print(f'– SKIP   : {len(skip)}人')
    print(f'✗ ERROR  : {len(err)}人')
    print(f'⏱ 時間   : {elapsed:.1f}秒')
    print(f'💾 合計   : {total_kb/1024:.1f} MB ({total_kb:.0f} KB in {OUT_DIR.relative_to(ROOT)})')
    if err:
        print('\nErrors:')
        for e in err[:20]:
            print(f'  {e}')

if __name__ == '__main__':
    main()
