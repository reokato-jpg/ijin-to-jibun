#!/bin/sh
# JS/CSS を minify して app/dist/ に出力。
# app/app.js や app/style.css を編集したら、このスクリプトを実行してから commit。
set -e
cd "$(dirname "$0")"
mkdir -p app/dist

# JS
npx -y esbuild app/app.js             --minify --charset=utf8 --sourcemap --target=es2020 --outfile=app/dist/app.min.js
npx -y esbuild app/era-lore.js        --minify --charset=utf8 --target=es2020 --outfile=app/dist/era-lore.min.js
npx -y esbuild app/history-patterns.js --minify --charset=utf8 --target=es2020 --outfile=app/dist/history-patterns.min.js
npx -y esbuild app/ai-consult.js       --minify --charset=utf8 --target=es2020 --outfile=app/dist/ai-consult.min.js

# CSS
npx -y esbuild app/style.css          --minify --outfile=app/dist/style.min.css
npx -y esbuild app/era-theme.css      --minify --outfile=app/dist/era-theme.min.css

# 偉人データのバンドル再生成
python build-people-bundle.py 2>/dev/null || python3 build-people-bundle.py 2>/dev/null || true

echo ""
echo "✓ Build complete. Minified outputs:"
du -h app/dist/*.js app/dist/*.css 2>&1 | sort -h
