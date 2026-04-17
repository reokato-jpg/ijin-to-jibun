# HP版として公開する方法

このアプリは純粋な HTML/CSS/JS の静的サイトなので、
**ファイルをそのままアップロードするだけで Web に公開できます**。

URL を知ってる人がスマホ・PC のブラウザで開けば、アプリと全く同じ画面が見えます。
（お気に入り等は端末の localStorage に保存されるので、各自の端末ごとに独立）

---

## 方法A：GitHub Pages（無料・おすすめ）

### 手順
1. GitHub アカウントを作る（無料）
2. 新しいリポジトリを作る（例：`ijin-to-jibun`、Public 推奨）
3. このフォルダの中身を全部アップロード
4. リポジトリの Settings → Pages で、
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
   を選んで Save
5. 数分後、`https://<ユーザー名>.github.io/ijin-to-jibun/app/` で公開される

### メリット
- 完全無料
- 独自ドメインも設定可能
- Noteの記事に貼るURL先として最適

---

## 方法B：Netlify（ドラッグ&ドロップで5秒）

1. [netlify.com](https://www.netlify.com/) にアクセス（無料）
2. ログイン後、画面にこのフォルダを**ドラッグ&ドロップするだけ**
3. `https://〇〇-〇〇-〇〇.netlify.app/app/` で即公開
4. カスタムURLも設定可能（例：`natsumi-ijin.netlify.app`）

---

## 方法C：natsumi.com 等の独自ドメイン

既にレンタルサーバーを持っているなら、FTPで `public_html/` 配下に丸ごとアップロード。
例：`https://natsumi-piano.com/ijin/app/`

---

## ⚠️ 公開前に確認

### Note記事のサムネ等
`data/articles.json` に書かれている Note の URL やサムネ画像 URL は外部（note.com）を参照するので、公開しても壊れません。

### Wikipedia 画像
`data/people/*.json` の `imageUrl` も Wikimedia Commons のサーバーから読み込むので公開OK。
クレジット情報（imageCredit）は自動的に画面に表示されます。

### YouTube / IMSLP / Amazon のリンク
すべて外部サイトへのリンクボタンなので公開OK。

---

## トップURLを `/` に変更したい場合

現状は `/app/index.html` にアプリ本体があります。
サイトのトップを直接アプリにしたい場合：

1. `app/` フォルダの中身を全部 ルート（一番外側）に移動
2. アプリの中のパスを `../data/` → `./data/` に書き換え
   （`app/app.js` の fetch 部分）

または、トップに「自動で /app/ にリダイレクトする index.html」を置くだけでもOK：

```html
<!DOCTYPE html>
<meta http-equiv="refresh" content="0; url=app/">
```

これを最外側に `index.html` として保存すれば、サイトのトップに来た人は自動で `/app/` に飛ぶ。

---

## Note記事との連携

Noteに投稿する時、記事の末尾に：

> 📖 偉人たちの年表・名言を見る → [サイトURL]

のように貼れば、ブログから直接アプリへ誘導できます。
