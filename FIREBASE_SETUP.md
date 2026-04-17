# 🔐 ログイン機能を有効化する（Firebase設定）

未ログインでも全機能使えます。**「登録するとお気に入り等が全端末で同期」**機能を追加したい場合、以下の手順で Firebase プロジェクトを作成してください。

## 手順（無料・5分）

### 1. Firebase プロジェクトを作る
1. https://console.firebase.google.com/ にアクセス（Googleアカウントでログイン）
2. 「プロジェクトを追加」 → プロジェクト名「ijin-to-jibun」
3. Google Analytics は任意（なくてもOK）
4. プロジェクト作成を待つ

### 2. Authentication を有効化
1. 左メニュー「Authentication」→「始める」
2. 「Sign-in method」タブ
3. **メール/パスワード** を有効化
4. **Google** を有効化（任意・推奨）

### 3. Firestore Database を作る
1. 左メニュー「Firestore Database」→「データベースを作成」
2. **本番モード** を選択
3. ロケーション：`asia-northeast1 (東京)`
4. 作成後、「ルール」タブで以下に書き換えて「公開」：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

→ 自分のデータだけ読み書きできる安全なルール

### 4. Web アプリを登録して設定値を取得
1. プロジェクト設定（歯車アイコン）→「全般」タブ
2. 「マイアプリ」→ ウェブアプリアイコン `</>` をクリック
3. ニックネーム：`ijin-web`
4. 「アプリを登録」
5. 表示される `firebaseConfig` をコピー

### 5. ドメインを追加
1. Authentication → Settings → 承認済みドメイン
2. `reokato-jpg.github.io` を追加（既に `localhost` が登録されているはず）

### 6. `app/auth.js` に貼り付け
```js
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "ijin-to-jibun.firebaseapp.com",
  projectId: "ijin-to-jibun",
  storageBucket: "ijin-to-jibun.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 7. push
```bash
git add -A
git commit -m "Firebase設定追加"
git push
```

2分後、サイト右上の「ログイン」ボタンから登録 / ログインが使えるようになります🎉

---

## どんな機能が同期される？
- お気に入り（人物・感情・名言・イベント・作品・ルーティン）
- 推し偉人
- 自分のルーティン（3スロット＋カスタムカテゴリ）
- 本に載せる名前
- 日記・付箋

## 無料枠の範囲
- Authentication: 無料（月間50,000ユーザーまで）
- Firestore: 無料（1日50,000回の読み取り・20,000回の書き込み）
- 個人運営なら十二分に収まります
