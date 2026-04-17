# 偉人と自分

偉人・哲学者・作曲家たちの人生を「感情の流れ」から横断的に見るアプリ。

## 使い方（起動）

1. `run.bat` をダブルクリック
2. 自動でブラウザが開きます（`http://localhost:8000/app/`）
3. スマホで見たい場合は、PCと同じWi-Fiに繋いだスマホのブラウザで、PCのIPアドレス経由で同じURLを開く

## 画面

- **人物**: 登録された偉人の一覧。タップで詳細・年表表示
- **感情で探す**: 「逃避」「挫折」「親との葛藤」など感情タグから、該当する人物・出来事を時代を越えて表示（コアの機能）
- **年表**: 全員の出来事を西暦順にまとめて表示
- **検索**（🔍アイコン）: 名前・国・分野で絞り込み

## 人物を追加する

### A. Wikipediaから下書き生成

```bash
python scripts/fetch_wikipedia.py <id> <Wikipediaタイトル>
```

例:
```bash
python scripts/fetch_wikipedia.py debussy クロード・ドビュッシー
python scripts/fetch_wikipedia.py kant イマヌエル・カント
```

- `data/people/<id>.json` のひな形が作られ、`manifest.json` に自動登録される
- **events（出来事）の配列は空なので、手動 or AI で埋める**

### B. 直接手書き

`data/people/<id>.json` を作り、`data/manifest.json` の `people` 配列に `<id>` を追加。

## ファイル構造

```
偉人と自分。/
├── run.bat               ← これをダブルクリックで起動
├── README.md
├── app/                  ← アプリ本体（HTML/CSS/JS）
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/
│   ├── manifest.json     ← 登録されている人物IDのリスト
│   ├── tags.json         ← 感情タグの定義
│   └── people/           ← 人物ごとのJSON
│       ├── dutilleux.json
│       ├── chopin.json
│       └── ...
└── scripts/
    └── fetch_wikipedia.py  ← Wikipedia下書き生成
```

## 人物データのフォーマット

```json
{
  "id": "dutilleux",
  "name": "アンリ・デュティユー",
  "nameEn": "Henri Dutilleux",
  "birth": 1916,
  "death": 2013,
  "country": "フランス",
  "field": "作曲家",
  "summary": "20世紀フランスを代表する作曲家...",
  "events": [
    {
      "year": 1940,
      "age": 24,
      "title": "第二次大戦で兵役、音楽を中断",
      "detail": "これからという時期に戦争で...",
      "tags": ["blank_period", "setback"]
    }
  ]
}
```

### 利用できる感情タグ（ID）

`data/tags.json` 参照。現在の初期セット:

`escape`（逃避） / `setback`（挫折） / `burnout`（燃え尽き） / `heartbreak`（失恋） / `parent_conflict`（親との葛藤） / `self_denial`（自己否定） / `pride_broken`（プライド崩壊） / `blank_period`（空白の時期） / `turning_encounter`（転機となる出会い） / `restart`（再起） / `jealousy`（嫉妬） / `approval`（承認欲求） / `poverty`（経済的困窮） / `illness`（病） / `loss`（死別） / `self_reinvention`（自己再構築） / `isolation`（孤独） / `breakthrough`（ブレイクスルー）

タグは `data/tags.json` に追記して増やせます。

## 初期登録されている人物（8人）

1. アンリ・デュティユー（作曲家 / フランス）
2. フレデリック・ショパン（作曲家 / ポーランド）
3. ロベルト・シューマン（作曲家 / ドイツ）
4. セルゲイ・ラフマニノフ（作曲家 / ロシア）
5. フリードリヒ・ニーチェ（哲学者 / ドイツ）
6. 夏目漱石（小説家 / 日本）
7. フィンセント・ファン・ゴッホ（画家 / オランダ）
8. ルートヴィヒ・ウィトゲンシュタイン（哲学者 / オーストリア）

## 今後のロードマップ

- [x] Webプロトタイプ（スマホブラウザ対応）
- [x] Wikipedia下書きスクリプト
- [ ] AIによるevents自動生成（Claude API連携）
- [ ] 人物データを画面から追加・編集するUI
- [ ] React Nativeでネイティブアプリ化（iOS/Android配布用）
- [ ] 人物の関係図（同時代の人々が誰と誰と出会ったか）
