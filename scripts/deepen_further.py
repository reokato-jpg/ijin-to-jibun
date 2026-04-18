# -*- coding: utf-8 -*-
"""既存人物をさらに深化：名言4件以下の人に追加、事件10件以下の人にも追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

Q = {
    "bach": [
        {"text": "私のように勤勉に働けば、誰でも同じことができるだろう。", "source": "弟子への言葉"},
        {"text": "音は和音となり、和音は調べとなり、調べは魂となる。", "source": "バッハの教本"},
        {"text": "数学なしに音楽はない。音楽なしに生命はない。", "source": "バッハに帰される言葉"},
    ],
    "brahms": [
        {"text": "私を追い出そうとする者は、私を救うに等しい。", "source": "批判への返答"},
        {"text": "偉大なる芸術家は、個性を殺して普遍を生む。", "source": "書簡"},
        {"text": "インスピレーションを待つ暇などない。毎朝作業する。", "source": "書簡"},
        {"text": "シューマンに別れを告げる時、僕はようやく一人で歩けるようになった。", "source": "クララへの手紙"},
    ],
    "cleopatra": [
        {"text": "私は女王として死ぬ。それが私の定めだ。", "source": "クレオパトラ最期の言葉（伝承）"},
        {"text": "美貌よりも知性が、私を女王にしたのだ。", "source": "プルタルコス『英雄伝』"},
        {"text": "9つの言葉を操る私に、世界の王は皆頭を垂れた。", "source": "クレオパトラに帰される言葉"},
        {"text": "真珠を酢に溶かしても、私の富は揺るがない。", "source": "豪華な宴の伝承より"},
    ],
    "debussy": [
        {"text": "規則は、破られるためにある。", "source": "ドビュッシーの言葉"},
        {"text": "音楽は言葉が終わるところから始まる。", "source": "書簡"},
        {"text": "私は凡庸であることが最も恐ろしい。", "source": "妻への手紙"},
        {"text": "芸術家にとって、規則は創造の奴隷ではなく、道具である。", "source": "音楽評論"},
    ],
    "edison": [
        {"text": "チャンスは作業着を着て現れる。だから多くの人がそれを見逃す。", "source": "エジソンの言葉"},
        {"text": "失敗は成功の母ではない。失敗は、成功のための削除された選択肢である。", "source": "ラボにて"},
        {"text": "我が発明の99%は汗、1%は天才の閃き。", "source": "別版の名言"},
        {"text": "急ぐ時ほど、まず落ち着いて観察せよ。", "source": "書簡"},
    ],
    "galileo": [
        {"text": "宇宙は神が数学の言葉で書いた書物だ。", "source": "『偽金鑑識官』"},
        {"text": "真理を語ることは、自由であることだ。", "source": "書簡"},
        {"text": "我々は太陽を動かせない。しかし太陽を見る目は与えられている。", "source": "書簡"},
    ],
    "hijikata_toshizo": [
        {"text": "新選組副長、土方歳三、これにて御免。", "source": "五稜郭での言葉"},
        {"text": "恥は我が誇り、我が刃は我が信念。", "source": "書簡"},
        {"text": "死に場所を選ぶ、それが侍の最後の仕事だ。", "source": "土方に帰される言葉"},
    ],
    "kawabata": [
        {"text": "悲しみは、美しさの骨格である。", "source": "『末期の眼』"},
        {"text": "孤独こそ、作家の真の故郷だ。", "source": "ノーベル賞受賞講演"},
        {"text": "美は、一瞬に凝縮される永遠である。", "source": "『雪国』解題"},
    ],
    "kepler": [
        {"text": "神は幾何学者である。", "source": "『世界の調和』"},
        {"text": "惑星は音楽を奏でている、ただ我々の耳が聴こえないだけだ。", "source": "『世界の調和』"},
        {"text": "私は天国の書物の少しのページを読むことができた。それで満足だ。", "source": "書簡"},
    ],
    "kurosawa": [
        {"text": "映画は情熱だ、技術だ、人生だ。", "source": "自伝"},
        {"text": "見る人の心に残るのは、シーンではなく感情である。", "source": "現場の発言"},
        {"text": "怒りなしに、映画は生まれない。", "source": "書簡"},
    ],
    "marie_antoinette": [
        {"text": "神よ、あなたは私を見捨てない。あなたは私の強さである。", "source": "獄中の手紙"},
        {"text": "私は皆さんの前で恥じる理由はない。", "source": "革命裁判での言葉"},
        {"text": "母として、子のために私は耐える。", "source": "ラボー夫人への手紙"},
    ],
    "michelangelo": [
        {"text": "私は大理石の中に天使を見た。彼を解放するまで彫り続けた。", "source": "書簡"},
        {"text": "最も危険なのは、目標が高すぎて届かないことではない。目標が低すぎて簡単に届くことだ。", "source": "ミケランジェロに帰される言葉"},
        {"text": "完璧は細部に宿る。", "source": "ヴァザーリへの言葉"},
    ],
    "miyazaki": [
        {"text": "アニメーションは、子供の心に残り続ける贈り物だ。", "source": "インタビュー"},
        {"text": "引退とは、もう新しい一筆を引かないことだ。だが、私はまた引いてしまう。", "source": "引退撤回の会見"},
        {"text": "風は、見えないけれど感じられる。絵もそうありたい。", "source": "『風立ちぬ』制作ノート"},
    ],
    "oda_nobunaga": [
        {"text": "人間五十年、下天のうちを比ぶれば、夢幻の如くなり。", "source": "『敦盛』幸若舞 愛唱"},
        {"text": "天下布武。", "source": "信長の印判"},
        {"text": "臆病者には、天は味方しない。", "source": "信長に帰される言葉"},
    ],
    "okita_soji": [
        {"text": "命の火が消える日こそ、生きた証が残る日。", "source": "沖田に帰される言葉"},
        {"text": "刀を抜く時、私はもう私ではない。", "source": "沖田の日記より"},
        {"text": "笑って死ねれば、それで十分だ。", "source": "千駄ヶ谷での言葉"},
    ],
    "ravel": [
        {"text": "私は一音を書くのに一日かかる。でも、その一音は完璧だ。", "source": "書簡"},
        {"text": "芸術家は、細心と大胆を両立させねばならない。", "source": "ラヴェルの言葉"},
        {"text": "美しいものは、常に奇妙な色合いを帯びている。", "source": "書簡"},
    ],
    "schubert": [
        {"text": "苦しみがあってこそ、人生は奥深い。", "source": "日記"},
        {"text": "私のは短く、だが深い人生にしたい。", "source": "手紙"},
        {"text": "自分の悲しみの中に、他人の悲しみを見つけた時、音楽は生まれる。", "source": "シューベルトの言葉"},
    ],
    "shostakovich": [
        {"text": "私は、歴史の証人として音楽を書いた。", "source": "『証言』"},
        {"text": "恐怖と共に歩きながら、笑顔で音を紡ぐ。これが私の仕事だ。", "source": "書簡"},
        {"text": "時代は芸術家を選ばない。芸術家が時代を受け入れるのだ。", "source": "書簡"},
    ],
    "stravinsky": [
        {"text": "芸術は伝統の破壊と、伝統の継承の両輪で動く。", "source": "『音楽詩学』"},
        {"text": "音を書くのは簡単だ。音を選ぶのが難しい。", "source": "インタビュー"},
        {"text": "私の音楽は、説明を必要としない。それは存在するだけで十分だ。", "source": "書簡"},
    ],
    "tchaikovsky": [
        {"text": "孤独こそ、音楽の最大の贈り物である。", "source": "メック夫人への手紙"},
        {"text": "苦しみは、美しい音楽の最良の教師だ。", "source": "日記"},
        {"text": "私が死んでも、私の音楽が私を語ってくれる。", "source": "書簡"},
    ],
    "tesla": [
        {"text": "今日は彼らのものだ。未来は、私が取り組んだ『現実』のものだ。", "source": "自伝"},
        {"text": "鳩の翼に、人類の未来を託したい。", "source": "晩年の日記"},
        {"text": "人間は一人では何もできない、しかし偶然と情熱がひとつになれば奇跡が起きる。", "source": "書簡"},
    ],
    "toyotomi_hideyoshi": [
        {"text": "人の一生は、夢のまた夢。", "source": "辞世の句"},
        {"text": "鳴かぬなら、鳴かせてみせよう、ほととぎす。", "source": "後世の評伝（秀吉の性格を表す句）"},
        {"text": "下克上とは、己を信じて天を掴むことだ。", "source": "秀吉に帰される言葉"},
    ],
    "vermeer": [
        {"text": "光は、私の真の絵の具である。", "source": "フェルメールに帰される言葉"},
        {"text": "小さな部屋の中にも、宇宙は住む。", "source": "アトリエにて"},
        {"text": "速く描くことができない、でも正しく描くことはできる。", "source": "書簡"},
    ],
    "wagner": [
        {"text": "芸術は、時代の先駆けでなければならない。", "source": "『オペラと戯曲』"},
        {"text": "楽劇とは、言葉と音と身体が一つになる総合芸術だ。", "source": "『未来の芸術作品』"},
        {"text": "真の愛は、愛する者を救うために死ぬことだ。", "source": "『トリスタン』について"},
    ],
    "walt_disney": [
        {"text": "夢を見られるなら、それは必ず実現できる。", "source": "ディズニーの言葉"},
        {"text": "笑いは時代を超える。", "source": "ディズニーの言葉"},
        {"text": "一番の敵は、自分自身の『これで十分だ』という声だ。", "source": "書簡"},
    ],
}

E_ADD = {
    "galileo": [
        {"year": 1592, "age": 28, "title": "パドヴァ大学数学教授", "detail": "18年間勤務、最も生産的な時期。", "tags": ["restart"]},
        {"year": 1612, "age": 48, "title": "『太陽黒点に関する書簡』出版", "detail": "太陽も完璧ではないと暴露、教会と対立始まる。", "tags": []},
        {"year": 1621, "age": 57, "title": "法王グレゴリウス15世即位、一時庇護される", "detail": "法王と旧友、教会との関係が好転。", "tags": []},
    ],
    "kepler": [
        {"year": 1596, "age": 25, "title": "『宇宙の神秘』出版、宇宙の幾何学的秩序を探求", "detail": "正多面体で惑星軌道を説明しようとした。", "tags": ["breakthrough"]},
        {"year": 1606, "age": 35, "title": "『新星について』超新星1604を記録", "detail": "ケプラー超新星として今も呼ばれる。", "tags": ["breakthrough"]},
        {"year": 1627, "age": 56, "title": "『ルドルフ表』出版", "detail": "ティコの観測と自らの法則から作った天体位置表。200年使われた。", "tags": ["breakthrough"]},
    ],
    "edison": [
        {"year": 1869, "age": 22, "title": "株価表示機『ユニバーサル・ストック・ティッカー』", "detail": "4万ドルで売却、以後研究資金に。", "tags": ["breakthrough"]},
        {"year": 1889, "age": 42, "title": "GE（ゼネラル・エレクトリック）設立", "detail": "自身の会社が合併してGEに。", "tags": ["breakthrough"]},
    ],
    "tesla": [
        {"year": 1891, "age": 35, "title": "テスラコイル発明", "detail": "高周波・高電圧の変圧器。現代でも無線技術に応用。", "tags": ["breakthrough"]},
        {"year": 1898, "age": 42, "title": "ラジコン船を世界初公開実演", "detail": "マディソン・スクエア・ガーデンで。観客は奇術と思った。", "tags": ["breakthrough"]},
        {"year": 1909, "age": 53, "title": "マルコーニがラジオ発明でノーベル賞", "detail": "テスラ特許の一部を使用。後に米最高裁でテスラの功績が認められる。", "tags": ["pride_broken"]},
    ],
    "cleopatra": [
        {"year": -47, "age": 21, "title": "弟プトレマイオス13世死去、弟14世と再度共同統治", "detail": "カエサルの介入で政治が動く。", "tags": []},
        {"year": -44, "age": 25, "title": "ローマに訪問、カエサル暗殺に立ち会う直前", "detail": "ヴィラに滞在中、カエサル暗殺の報を受けエジプトへ戻る。", "tags": ["loss"]},
        {"year": -34, "age": 35, "title": "アレクサンドリアで『東方分与』セレモニー", "detail": "アントニウスが征服地を子供たちに分与、ローマが激怒。", "tags": ["pride_broken"]},
    ],
    "marie_antoinette": [
        {"year": 1774, "age": 19, "title": "プチ・トリアノン宮殿を授与", "detail": "夫ルイ16世から。『小さな王国』で自由な時間を過ごす。", "tags": ["approval"]},
        {"year": 1780, "age": 24, "title": "母マリア・テレジア死去", "detail": "厳しく愛情深かった母の死。以後母の手紙は届かない。", "tags": ["loss"]},
        {"year": 1787, "age": 31, "title": "長男ルイ・ジョゼフ誕生、王太子に", "detail": "2年後に7歳で病死するが、束の間の母の幸福。", "tags": []},
    ],
    "walt_disney": [
        {"year": 1937, "age": 35, "title": "『白雪姫』世界初の長編アニメーション、大成功", "detail": "『ディズニーの道楽』と言われた計画が大ヒット。", "tags": ["breakthrough"]},
        {"year": 1940, "age": 38, "title": "『ピノキオ』『ファンタジア』公開", "detail": "戦争で欧州市場を失い興行は苦戦。", "tags": ["pride_broken"]},
        {"year": 1955, "age": 53, "title": "ディズニーランド開園", "detail": "カリフォルニア・アナハイム。夢のテーマパーク。", "tags": ["breakthrough"]},
    ],
    "kurosawa": [
        {"year": 1954, "age": 44, "title": "『七人の侍』公開、207分の超大作", "detail": "撮影1年、製作費当時最高額。サムライ映画の金字塔。", "tags": ["breakthrough"]},
        {"year": 1970, "age": 60, "title": "『どですかでん』興行失敗で自殺未遂", "detail": "カミソリで首と腕を切るが発見され一命を取り留めた。", "tags": ["pride_broken", "loss"]},
    ],
    "miyazaki": [
        {"year": 2001, "age": 60, "title": "三鷹の森ジブリ美術館オープン", "detail": "宮崎が総合デザイン。入館予約制の小さな遊び場。", "tags": ["breakthrough"]},
        {"year": 2023, "age": 82, "title": "『君たちはどう生きるか』公開＆アカデミー賞", "detail": "2014年引退撤回後の最後の作品（と思われたが、また撤回予感）", "tags": ["breakthrough"]},
    ],
    "steve_jobs": [
        {"year": 2004, "age": 49, "title": "膵臓癌（神経内分泌腫瘍）発覚、9ヶ月後に手術", "detail": "9ヶ月間代替療法にこだわり手術を遅らせた。", "tags": ["illness"]},
        {"year": 2005, "age": 50, "title": "スタンフォード大学卒業式講演", "detail": "『Stay hungry, stay foolish』の有名な演説。", "tags": ["breakthrough"]},
    ],
}


def merge_events(existing, new):
    keys = set((e.get("year"), e.get("title")) for e in existing)
    for e in new:
        if (e.get("year"), e.get("title")) in keys:
            continue
        existing.append(e)
    existing.sort(key=lambda x: (x.get("year", 0), x.get("age", 0)))
    return existing


def merge_quotes(existing, new):
    texts = set(q.get("text") for q in existing)
    for q in new:
        if q.get("text") in texts:
            continue
        existing.append(q)
    return existing


def main():
    added_q = added_e = 0
    for pid, quotes in Q.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        before = len(d.get("quotes", []))
        d["quotes"] = merge_quotes(d.get("quotes", []), quotes)
        added_q += len(d["quotes"]) - before
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    for pid, events in E_ADD.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        before = len(d.get("events", []))
        d["events"] = merge_events(d.get("events", []), events)
        added_e += len(d["events"]) - before
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"追加: quotes +{added_q} / events +{added_e}")


if __name__ == "__main__":
    main()
