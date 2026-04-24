# magic.js 構造ガイド

1万行超の単一ファイルだが、論理的に以下のセクションに分かれている。
今後分割する場合の目安。

## セクション一覧（先頭コメントで見つけられる）

### コア
- `loadPeopleBundle()` — 全偉人データを取得してキャッシュ
- `openDeepOverlay(title, sub, html)` — 共通モーダル

### A) 関係グラフ (`openRelationGraph`)
- Canvas ベースの力学シミュレーション
- 師弟・盟友・論敵のネットワーク

### B) 世界マップ / 地球儀 (`openWorldMap`, `openWorldMap2D`)
- Three.js 地球儀
- フライト・太陽・月・雲・ISS・大気
- メルカトル図法ビュー（`drawMercator`）
- 大陸ズーム

### C) 同時代 (`openSimultaneity`)
- ある偉人と時代を共有した全員を並べる

### D) 365日ドリフトカレンダー (`openDriftCalendar`)
- SVG 円環上に誕生日・命日をプロット

### E) 都市群像 (`openCityGathering`)
- 都市ごとの偉人クラスタ

### F) 関連ブック (3Dブック)
- `initTopBookScene` — ヒーローの3D書籍

### G) 影響の波紋 (`openRipple`)
- 同心円で影響関係可視化
- 推しボタン連携

### H) 宇宙モード (`openCosmos`)  ※最大のセクション
- THREE.js シーン構築
- 恒星・銀河・天の川・星雲
- 太陽プラズマシェーダ・プロミネンス・コロナ
- 8惑星 + 月 + リング + 衛星（ISS・ハッブル等）
- ブラックホール・降着円盤
- ロケット / モビルスーツ（切替可）
- 光の翼・ハプティック・3人称カメラ
- マトリョーシカ・願い星・瞑想・真理・偉人星座
- 惑星追跡 / 時間倍率 / 流星群 / 日食検出

### I) 365日カレンダー中央画像 (driftCenter) — バグ修正済み

### J) 用語説明・偉人ページ装飾
- `setupQuoteContext` — 名言に時代背景を挿入
- `setupInfluenceRipple` — 波紋ボタン差し込み
- `setupCheatSheetButton` — 印刷ボタン差し込み

### K) 教材モード
- `openIjinQuiz` — 5タイプのクイズ + スコア管理
- `openTimelineMode` — 世紀別年表
- `openGlossary` — 用語集＋検索

### L) アフィリエイト
- `MAGIC.AFFILIATES` — 広告プール（文脈×mood）
- `MAGIC.pickAffiliates(ctx, count, salt)`
- `MAGIC.renderAffiliate(ctx, container, count)`

## 分割する場合の推奨ファイル構成

```
app/
  magic.js          — エントリー + 共通ユーティリティのみ（500行）
  magic/
    core.js         — loadPeopleBundle, openDeepOverlay
    graph.js        — 関係グラフ (A)
    globe.js        — 世界マップ・地球儀 (B)
    simultaneity.js — 同時代・都市群像 (C, E)
    drift.js        — 365日カレンダー (D, I)
    book.js         — 3Dブック (F)
    ripple.js       — 影響の波紋 (G)
    cosmos.js       — 宇宙モード (H) ※最大。さらに分割余地あり
    decorators.js   — 偉人ページ装飾 (J)
    quiz.js         — クイズ (K の一部)
    timeline.js     — 年表 (K の一部)
    glossary.js     — 用語集 (K の一部)
    affiliates.js   — 広告プール (L)
```

### 分割手順（安全にやる場合）

1. **エクスポート方式を統一**: 現在は `window.openXxx = ...` で露出。
   - 各モジュールを IIFE で `window.MAGIC.modules.xxx` に集約
2. **順序依存を解消**: 定数・ヘルパーを先頭の `core.js` に移す
3. **動的 import**: 初回表示で使わないモード（クイズ・マトリョーシカ）は動的 import で遅延ロード可能
4. **ビルド**: esbuild に bundle モードを追加、一つの `magic.bundle.js` を出力

### 今すぐやらない理由

- 現状シングルファイルでもパフォーマンス上の問題はない
- 分割は構造変更のリスクが大きい（動的依存の発見が地獄）
- 1万行でも gzip 後は 150KB 程度で配信に問題なし
- **将来、機能追加のペースが落ちたタイミングで分割するのがベスト**
