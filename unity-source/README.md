# 偉人と自分。— Unity版

Unity 2022.3 LTS 以上推奨。WebGL ビルドターゲット。

## 構成（実装予定のシーン）

```
Assets/
  Scenes/
    00_Hub.unity          # シーン選択メインメニュー
    01_Cosmos.unity       # 宇宙の誕生（惑星・恒星・ブラックホール）
    02_Eden.unity         # エデンの園（浮島・生命の樹・蛇）
    03_Babel.unity        # バベルの塔（階段状ziggurat・雷・言葉の混乱）
    04_Museum_Myth.unity  # 神話美術館（歩行）
    05_Museum_Sengoku.unity # 戦国美術館
  Scripts/
    HubController.cs
    EdenController.cs
    BabelController.cs
    MuseumController.cs
    CosmosController.cs
    PlayerWalker.cs       # 共通 FPS コントローラ
    PaintingLoader.cs     # Wikimedia画像を実行時ロード
  Art/
    (Probuilder/Terrain/Textures)
  Prefabs/
    Tree_Eden.prefab
    Tower_Babel.prefab
    Painting.prefab
  URP/
    Settings.asset        # URP (Universal Render Pipeline)
    GlobalVolume.asset    # Bloom/ToneMapping/DoF 設定
```

## WebGL ビルド手順

1. Unity Hub から Unity 2022.3.x を起動、この `/unity-source/` フォルダを開く
2. Edit → Project Settings → Player → Resolution and Presentation:
   - Default Canvas Width: 1920
   - Default Canvas Height: 1080
   - Run In Background: ON
3. Edit → Project Settings → Player → Publishing Settings:
   - Compression Format: Brotli
   - Decompression Fallback: ON
4. File → Build Settings:
   - Platform: **WebGL** に切り替え（Switch Platform）
   - Scenes In Build に 00_Hub を先頭に追加
5. Build ボタン → 出力先を `/app/unity/build/` に指定
6. 完了後、`/app/unity/index.html` の `<iframe>` コメント解除

## URP 設定（推奨）

Bloom・Vignette・Color Grading・Depth of Field を GlobalVolume に追加すると、
three.js版との見た目の差が一気に埋まる（Unity の強み）。

## パフォーマンス目標

- モバイル（iPhone Safari）で 30fps 以上
- 初回ロード: 圧縮後 25MB 以下
- Bloom + SSAO + Motion Blur を URP で有効

## 今後

- AR Foundation 対応（スマホでARエデン）
- XR 対応（Quest ブラウザ）
