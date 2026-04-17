# -*- coding: utf-8 -*-
"""各偉人に映画・ドラマ・アニメ情報を追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

MEDIA = {
    "chopin": [
        {"title": "愛情物語（A Song to Remember）", "year": 1945, "type": "movie", "country": "アメリカ",
         "director": "チャールズ・ヴィダー", "cast": "コーネル・ワイルド（ショパン役）",
         "description": "ハリウッド製のショパン伝記。『英雄ポロネーズ』を弾く手から血が滴る名シーンで知られる古典。"},
        {"title": "別れの曲", "year": 1934, "type": "movie", "country": "ドイツ・フランス",
         "director": "ジェザ・フォン・ボルヴァリ", "cast": "ヴォルフガング・リーバーナイナー",
         "description": "練習曲『別れの曲』の名がこの映画から広まった、最も愛されるショパン映画。"},
        {"title": "La note bleue", "year": 1991, "type": "movie", "country": "フランス",
         "director": "アンジェイ・ジュワウスキ", "cast": "ヤヌシュ・オレイニチャク",
         "description": "ノアン時代のショパンとサンドを描いた、耽美で濃密な芸術映画。"}
    ],
    "beethoven": [
        {"title": "不滅の恋／ベートーヴェン", "year": 1994, "type": "movie", "country": "アメリカ",
         "director": "バーナード・ローズ", "cast": "ゲイリー・オールドマン",
         "description": "死後発見された『不滅の恋人への手紙』の宛先を追う伝記映画。", "youtubeId": "9JcVBj_xNzQ"},
        {"title": "敬愛なるベートーヴェン", "year": 2006, "type": "movie", "country": "アメリカ",
         "director": "アニエスカ・ホランド", "cast": "エド・ハリス／ダイアン・クルーガー",
         "description": "第九初演を前に写譜係として働く若き女性とベートーヴェンの物語。"},
        {"title": "運命の恋人", "year": 2003, "type": "drama", "country": "イギリス",
         "director": "アンドリュー・グリーヴ", "cast": "ポール・リース",
         "description": "BBC制作の伝記ドラマ。耳が聞こえなくなる過程を丁寧に描く。"}
    ],
    "mozart": [
        {"title": "アマデウス", "year": 1984, "type": "movie", "country": "アメリカ",
         "director": "ミロス・フォアマン", "cast": "トム・ハルス／F.マーリー・エイブラハム",
         "description": "アカデミー賞8部門受賞。天才モーツァルトと凡才サリエリの、嫉妬と畏怖の物語。", "youtubeId": "7VZ-Pg_-I_M"},
        {"title": "魔笛", "year": 2006, "type": "movie", "country": "イギリス",
         "director": "ケネス・ブラナー",
         "description": "モーツァルトのオペラを第一次大戦の塹壕を舞台にブラナー監督が映像化。"}
    ],
    "bach": [
        {"title": "アンナ・マグダレーナ・バッハの年代記", "year": 1968, "type": "movie", "country": "西独・伊",
         "director": "ストローブ＝ユイレ", "cast": "グスタフ・レオンハルト",
         "description": "妻アンナの視点でバッハの日常を淡々と綴る、音楽学の名作映画。"}
    ],
    "van_gogh": [
        {"title": "ゴッホ 最期の手紙", "year": 2017, "type": "movie", "country": "英・ポーランド",
         "director": "ドロタ・コビエラ／ヒュー・ウェルチマン",
         "description": "全編を125人の画家が油絵で描いた世界初の長編油絵アニメーション。", "youtubeId": "CGzKnyhYDQI"},
        {"title": "永遠の門 ゴッホの見た未来", "year": 2018, "type": "movie", "country": "アメリカ・フランス",
         "director": "ジュリアン・シュナーベル", "cast": "ウィレム・デフォー",
         "description": "デフォーが65歳でゴッホを演じた、晩年のアルル〜サン＝レミを描く。", "youtubeId": "L-8nqVXy1Uw"},
        {"title": "炎の人ゴッホ", "year": 1956, "type": "movie", "country": "アメリカ",
         "director": "ヴィンセント・ミネリ", "cast": "カーク・ダグラス",
         "description": "クラシックなゴッホ伝記映画の金字塔。"}
    ],
    "picasso": [
        {"title": "ピカソ 天才の秘密", "year": 1956, "type": "doc", "country": "フランス",
         "director": "アンリ＝ジョルジュ・クルーゾー",
         "description": "ピカソが画面の裏側からガラスに描く様子を撮影した、世紀の映像記録。"},
        {"title": "ミッドナイト・イン・パリ", "year": 2011, "type": "movie", "country": "アメリカ",
         "director": "ウディ・アレン",
         "description": "1920年代パリにタイムスリップした主人公がピカソ・ヘミングウェイらに出会う。"}
    ],
    "einstein": [
        {"title": "ジーニアス：アインシュタイン", "year": 2017, "type": "drama", "country": "アメリカ",
         "cast": "ジェフリー・ラッシュ／ジョニー・フリン",
         "description": "ナショジオ製作。青年期から晩年まで全10話で描く伝記ドラマ。"},
        {"title": "IQ たったひとりの恋人", "year": 1994, "type": "movie", "country": "アメリカ",
         "director": "フレッド・スケピシ", "cast": "メグ・ライアン／ウォルター・マッソー",
         "description": "アインシュタインの姪と自動車整備工のロマンチック・コメディ。"}
    ],
    "curie": [
        {"title": "ラジウム・ガールズ マリー・キュリーの挑戦", "year": 2019, "type": "movie", "country": "イギリス",
         "director": "マルジャン・サトラピ", "cast": "ロザムンド・パイク",
         "description": "原題『Radioactive』。科学の光と影を芸術的映像で描いた評伝。", "youtubeId": "J9NQFACZYEU"},
        {"title": "キュリー夫人", "year": 1943, "type": "movie", "country": "アメリカ",
         "director": "マーヴィン・ルロイ", "cast": "グリア・ガーソン",
         "description": "アカデミー賞7部門ノミネートの古典的伝記映画。"}
    ],
    "freud": [
        {"title": "危険なメソッド", "year": 2011, "type": "movie", "country": "英・独・カナダ",
         "director": "デヴィッド・クローネンバーグ", "cast": "ヴィゴ・モーテンセン／マイケル・ファスベンダー",
         "description": "フロイト・ユング・ザビーナの三角関係を描く。精神分析誕生の瞬間。"}
    ],
    "nietzsche": [
        {"title": "ニーチェの馬", "year": 2011, "type": "movie", "country": "ハンガリー",
         "director": "タル・ベーラ",
         "description": "ニーチェ発狂のきっかけとなった『鞭打たれた馬』のその後を描く実験作。"},
        {"title": "ニーチェ・プロジェクト", "year": 2007, "type": "movie", "country": "イタリア",
         "director": "ピノ・サルシ",
         "description": "晩年のニーチェとルー・サロメの関係を描く。"}
    ],
    "leonardo": [
        {"title": "ダ・ヴィンチ・コード", "year": 2006, "type": "movie", "country": "アメリカ",
         "director": "ロン・ハワード", "cast": "トム・ハンクス",
         "description": "ルーヴル美術館を舞台に、ダ・ヴィンチの絵画に隠された秘密を追う。"},
        {"title": "レオナルド・ダ・ヴィンチ", "year": 2024, "type": "doc", "country": "アメリカ",
         "director": "ケン・バーンズ",
         "description": "PBS制作の4時間ドキュメンタリー。最新研究で解き明かす万能人。"}
    ],
    "soseki": [
        {"title": "夏目漱石の妻", "year": 2016, "type": "drama", "country": "日本",
         "cast": "尾野真千子／長谷川博己",
         "description": "NHK土曜ドラマ。妻・鏡子の視点から漱石の神経衰弱とその愛を描く。"},
        {"title": "わが輩は猫である", "year": 1975, "type": "movie", "country": "日本",
         "director": "市川崑", "cast": "仲代達矢",
         "description": "市川崑監督による漱石の名作映画化。"}
    ],
    "akutagawa": [
        {"title": "羅生門", "year": 1950, "type": "movie", "country": "日本",
         "director": "黒澤明", "cast": "三船敏郎／京マチ子",
         "description": "芥川『藪の中』『羅生門』を原作とする世界の名作。ヴェネツィア金獅子賞。"},
        {"title": "地獄変", "year": 1969, "type": "movie", "country": "日本",
         "director": "豊田四郎", "cast": "中村錦之助",
         "description": "芥川の代表短編『地獄変』を映画化。"}
    ],
    "dazai_osamu": [
        {"title": "人間失格 太宰治と3人の女たち", "year": 2019, "type": "movie", "country": "日本",
         "director": "蜷川実花", "cast": "小栗旬／宮沢りえ／沢尻エリカ／二階堂ふみ",
         "description": "三人の女性に翻弄される晩年の太宰。蜷川実花の極彩色映像。", "youtubeId": "TTGDoMQAh98"},
        {"title": "ヴィヨンの妻〜桜桃とタンポポ〜", "year": 2009, "type": "movie", "country": "日本",
         "director": "根岸吉太郎", "cast": "松たか子／浅野忠信",
         "description": "太宰原作。モントリオール国際映画祭最優秀監督賞。"},
        {"title": "文豪ストレイドッグス", "year": 2016, "type": "anime", "country": "日本",
         "description": "太宰治・芥川龍之介・中原中也らが異能力を持って登場する人気アニメ。"}
    ],
    "mishima_yukio": [
        {"title": "MISHIMA: A Life in Four Chapters", "year": 1985, "type": "movie", "country": "アメリカ",
         "director": "ポール・シュレイダー", "cast": "緒形拳",
         "description": "スコセッシ・コッポラ製作総指揮。三島の生涯を4つの章で描く。日本では長く未公開だった伝説の映画。"},
        {"title": "11.25自決の日 三島由紀夫と若者たち", "year": 2012, "type": "movie", "country": "日本",
         "director": "若松孝二", "cast": "井浦新",
         "description": "三島と楯の会の青年たちの最後の3ヶ月。"}
    ],
    "miyazawa_kenji": [
        {"title": "イーハトーブの幻想", "year": 1996, "type": "anime", "country": "日本",
         "description": "杉井ギサブロー監督のアニメ『銀河鉄道の夜』は世界的評価。"},
        {"title": "宮沢賢治 その愛", "year": 1996, "type": "movie", "country": "日本",
         "cast": "三上博史",
         "description": "妹トシとの絆を軸に、賢治の短い生涯を描く。"}
    ],
    "oda_nobunaga": [
        {"title": "麒麟がくる", "year": 2020, "type": "drama", "country": "日本",
         "cast": "染谷将太（信長役）／長谷川博己",
         "description": "NHK大河ドラマ。明智光秀を主役に据え、信長を革新的に描いた。"},
        {"title": "信長協奏曲", "year": 2014, "type": "drama", "country": "日本",
         "cast": "小栗旬",
         "description": "高校生が戦国時代にタイムスリップして信長になる漫画原作ドラマ。"},
        {"title": "影武者", "year": 1980, "type": "movie", "country": "日本",
         "director": "黒澤明",
         "description": "武田信玄影武者の物語だが、信長も重要人物として登場。カンヌ・パルムドール。"}
    ],
    "toyotomi_hideyoshi": [
        {"title": "太閤記", "year": 1965, "type": "drama", "country": "日本",
         "description": "NHK大河ドラマ第3作。最も有名な秀吉像を確立。"},
        {"title": "関白秀吉", "year": 1993, "type": "movie", "country": "日本",
         "cast": "仲代達矢",
         "description": "司馬遼太郎『新史 太閤記』を映像化。"}
    ],
    "tokugawa_ieyasu": [
        {"title": "どうする家康", "year": 2023, "type": "drama", "country": "日本",
         "cast": "松本潤",
         "description": "NHK大河ドラマ。若き弱腰の家康が試練を重ねて天下人になるまで。"},
        {"title": "徳川家康", "year": 1983, "type": "drama", "country": "日本",
         "cast": "滝田栄",
         "description": "山岡荘八原作。50話にわたり家康75年の生涯を描いた大河。"}
    ],
    "sakamoto_ryoma": [
        {"title": "龍馬伝", "year": 2010, "type": "drama", "country": "日本",
         "cast": "福山雅治",
         "description": "NHK大河ドラマ。岩崎弥太郎の視点から龍馬の破天荒な生涯を描く。"},
        {"title": "竜馬がゆく", "year": 1968, "type": "drama", "country": "日本",
         "description": "司馬遼太郎原作。龍馬ブームの原点となった初の大河ドラマ化。"},
        {"title": "幕末純情伝", "year": 1991, "type": "movie", "country": "日本",
         "cast": "牧瀬里穂",
         "description": "沖田総司が女性だったらという奇想天外な設定の幕末映画。"}
    ],
    "hijikata_toshizo": [
        {"title": "燃えよ剣", "year": 2021, "type": "movie", "country": "日本",
         "director": "原田眞人", "cast": "岡田准一",
         "description": "司馬遼太郎原作の新選組小説を完全映画化。"},
        {"title": "新選組！", "year": 2004, "type": "drama", "country": "日本",
         "cast": "香取慎吾（近藤勇）／山本耕史（土方）",
         "description": "三谷幸喜脚本のNHK大河ドラマ。翌年『新選組！！土方歳三最期の一日』も放送。"}
    ],
    "kondo_isami": [
        {"title": "新選組！", "year": 2004, "type": "drama", "country": "日本",
         "cast": "香取慎吾",
         "description": "三谷幸喜脚本の大河ドラマ。近藤勇を主役に新選組の青春群像を描いた。"}
    ],
    "okita_soji": [
        {"title": "沖田総司", "year": 1974, "type": "movie", "country": "日本",
         "cast": "草刈正雄",
         "description": "若き天才剣士の短い生涯を描く。"},
        {"title": "るろうに剣心", "year": 2012, "type": "movie", "country": "日本",
         "cast": "佐藤健",
         "description": "沖田本人ではないが、幕末剣客の系譜を描く人気シリーズ。"}
    ],
    "saigo_takamori": [
        {"title": "西郷どん", "year": 2018, "type": "drama", "country": "日本",
         "cast": "鈴木亮平",
         "description": "林真理子原作のNHK大河ドラマ。西南戦争までを描く。"},
        {"title": "ラスト サムライ", "year": 2003, "type": "movie", "country": "アメリカ",
         "director": "エドワード・ズウィック", "cast": "渡辺謙／トム・クルーズ",
         "description": "西郷をモデルにした勝元のキャラクターで、武士道精神を世界に伝えた。", "youtubeId": "hdd9OgXaKpg"}
    ],
    "socrates": [
        {"title": "ソクラテス", "year": 1971, "type": "movie", "country": "イタリア",
         "director": "ロベルト・ロッセリーニ",
         "description": "ロッセリーニ晩年の哲学者シリーズの傑作。裁判と最期までを淡々と描く。"}
    ],
    "marx": [
        {"title": "マルクス・エンゲルス", "year": 2017, "type": "movie", "country": "仏・独・ベルギー",
         "director": "ラウル・ペック",
         "description": "若き日のマルクスとエンゲルスの出会いから『共産党宣言』まで。", "youtubeId": "Sv_DxC9-5RM"}
    ],
    "kant_hannah": [
        {"title": "ハンナ・アーレント", "year": 2012, "type": "movie", "country": "独・仏・ルクセンブルク",
         "director": "マルガレーテ・フォン・トロッタ", "cast": "バルバラ・スコヴァ",
         "description": "アイヒマン裁判と『悪の陳腐さ』論争を描く傑作。", "youtubeId": "zP7Yw1TXciM"}
    ],
    "wittgenstein": [
        {"title": "ヴィトゲンシュタイン", "year": 1993, "type": "movie", "country": "イギリス",
         "director": "デレク・ジャーマン",
         "description": "極限まで様式化された実験的伝記映画。"}
    ],
    "schumann": [
        {"title": "愛の調べ", "year": 1947, "type": "movie", "country": "アメリカ",
         "director": "クラレンス・ブラウン", "cast": "キャサリン・ヘプバーン（クララ役）",
         "description": "クララ・ヴィーク視点で描くシューマン夫妻の物語。"},
        {"title": "ブラームスはお好き", "year": 1961, "type": "movie", "country": "アメリカ",
         "description": "三角関係と芸術を描くサガン原作。シューマンとブラームスの関係を連想させる古典。"}
    ],
    "tchaikovsky": [
        {"title": "チャイコフスキーの妻", "year": 2022, "type": "movie", "country": "ロシア・仏",
         "director": "キリル・セレブレンニコフ",
         "description": "チャイコフスキーの苦悩に満ちた結婚を妻アントニーナの視点から描く。"}
    ],
    "rachmaninoff": [
        {"title": "ある愛の詩（Shine）", "year": 1996, "type": "movie", "country": "オーストラリア",
         "description": "ラフマニノフ『ピアノ協奏曲第3番』を軸にしたピアニスト伝記映画。"}
    ]
}


def main():
    added = 0
    for pid, media_list in MEDIA.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            print(f"SKIP (no file): {pid}")
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        existing = d.get("media", [])
        titles = set(m.get("title") for m in existing)
        new_count = 0
        for m in media_list:
            if m["title"] in titles:
                continue
            existing.append(m)
            new_count += 1
        d["media"] = existing
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        added += 1
        print(f"OK: {pid}  +{new_count}本 (合計{len(existing)})")
    print(f"\n{added}人に映画・ドラマを追加")


if __name__ == "__main__":
    main()
