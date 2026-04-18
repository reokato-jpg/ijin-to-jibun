# -*- coding: utf-8 -*-
"""音楽家の年表をさらに深化（浅い12-13イベント層を重点的に）"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

E = {
    "vivaldi": [
        {"year": 1703, "age": 25, "title": "ピエタ慈善院の音楽教師に就任", "detail": "孤児・捨て子の少女たちに弦楽を教える。以後30年以上関わる。", "tags": ["restart"]},
        {"year": 1711, "age": 33, "title": "『調和の霊感』アムステルダムで出版", "detail": "ヨーロッパ中で評判に。バッハもこの譜面を筆写して学んだ。", "tags": ["breakthrough", "approval"]},
        {"year": 1718, "age": 40, "title": "マントヴァ候の楽長として3年間滞在", "detail": "オペラ作曲に専念。ピエタと休職契約。", "tags": ["restart"]},
        {"year": 1725, "age": 47, "title": "『四季』を含む『和声と創意への試み』出版", "detail": "季節を描写する革新的なプログラム音楽。", "tags": ["breakthrough"]},
        {"year": 1737, "age": 59, "title": "枢機卿ルッフォに『赤毛の司祭』として追放される", "detail": "女性歌手アンナ・ジローとの関係を理由にフェラーラ公演を禁じられた。", "tags": ["pride_broken"]},
        {"year": 1741, "age": 63, "title": "ウィーンで貧しく客死、共同墓地に埋葬", "detail": "庇護者カール6世の急死で後ろ盾を失い、誰にも看取られず。", "tags": ["poverty", "loss"]},
    ],
    "mendelssohn": [
        {"year": 1821, "age": 12, "title": "72歳のゲーテに初対面、以後生涯の庇護者に", "detail": "ワイマールで2週間滞在。ゲーテは『モーツァルトの再来』と評した。", "tags": ["turning_encounter"]},
        {"year": 1829, "age": 20, "title": "バッハ『マタイ受難曲』100年ぶり蘇演指揮", "detail": "ベルリン・ジングアカデミーにて。バッハ再評価の決定的一歩。", "tags": ["breakthrough"]},
        {"year": 1835, "age": 26, "title": "ライプツィヒ・ゲヴァントハウス管の指揮者に", "detail": "当時ヨーロッパ最高峰のオーケストラを率いることに。", "tags": ["approval"]},
        {"year": 1837, "age": 28, "title": "セシル・ジャンルノーと結婚、幸福な家庭", "detail": "最も私生活が安定した時期。5人の子をもうける。", "tags": ["turning_encounter"]},
        {"year": 1843, "age": 34, "title": "ライプツィヒ音楽院創設、初代院長", "detail": "シューマン等を教授に招聘。", "tags": ["restart"]},
        {"year": 1847, "age": 38, "title": "姉ファニー急死の6ヶ月後に自身も死去", "detail": "姉の死に打ちのめされ、『最愛の姉』の喪失から立ち直れず。", "tags": ["loss"]},
    ],
    "smetana": [
        {"year": 1856, "age": 32, "title": "スウェーデン・イェーテボリへ移住", "detail": "プラハで芽が出ず北欧へ。リストに背中を押された決断。", "tags": ["restart"]},
        {"year": 1859, "age": 35, "title": "妻カテジナを結核で失う", "detail": "北欧の寒気に耐えられなかった。深い喪失。", "tags": ["loss", "bereavement"]},
        {"year": 1866, "age": 42, "title": "オペラ『売られた花嫁』プラハ初演", "detail": "チェコ国民オペラの金字塔となる。", "tags": ["breakthrough"]},
        {"year": 1874, "age": 50, "title": "完全失聴、指揮者辞任", "detail": "梅毒による。しかしその後も作曲を続ける。", "tags": ["illness"]},
        {"year": 1875, "age": 51, "title": "失聴の中で『わが祖国』作曲開始", "detail": "『モルダウ』を含む交響詩集。6曲を10年かけ完成。", "tags": ["breakthrough"]},
        {"year": 1884, "age": 60, "title": "精神を病み、精神病院で死去", "detail": "晩年は幻聴に苦しみ、高い音が鳴り止まなかった。", "tags": ["illness", "isolation"]},
    ],
    "mussorgsky": [
        {"year": 1858, "age": 19, "title": "陸軍士官を辞め音楽家になる決意", "detail": "貴族階級の将校キャリアを捨てる。バラキレフに師事。", "tags": ["restart", "parent_conflict"]},
        {"year": 1861, "age": 22, "title": "農奴解放令で実家が没落", "detail": "代々の農奴所有地を失い、小官吏として生活。以後貧困。", "tags": ["poverty"]},
        {"year": 1869, "age": 30, "title": "オペラ『ボリス・ゴドゥノフ』完成", "detail": "帝室劇場に4度提出し4度拒絶される屈辱。", "tags": ["pride_broken"]},
        {"year": 1874, "age": 35, "title": "『展覧会の絵』作曲", "detail": "親友画家ガルトマンの急逝への追悼。ピアノ組曲。", "tags": ["loss", "breakthrough"]},
        {"year": 1879, "age": 40, "title": "アルコール依存症で発作・入院", "detail": "友人の歌手プラトノーヴァの支援で演奏旅行するが体は既にぼろぼろ。", "tags": ["illness"]},
        {"year": 1881, "age": 42, "title": "42歳で死去、レーピン最後の肖像画", "detail": "入院中にレーピンが描いた『赤い服の男』肖像は最晩年の記録。", "tags": ["loss"]},
    ],
    "rimsky_korsakov": [
        {"year": 1861, "age": 17, "title": "海軍兵学校卒業と同時にバラキレフに出会う", "detail": "アマチュア作曲家のまま世界周遊航海に出される。", "tags": ["turning_encounter"]},
        {"year": 1865, "age": 21, "title": "3年の航海から戻り『交響曲第1番』初演", "detail": "ロシア人作曲家による最初の交響曲として注目される。", "tags": ["approval"]},
        {"year": 1871, "age": 27, "title": "海軍士官のまま音楽院教授に招聘", "detail": "和声を独学中に教授になる矛盾。慌てて勉強し直した。", "tags": ["approval"]},
        {"year": 1888, "age": 44, "title": "『シェヘラザード』『スペイン奇想曲』の年", "detail": "オーケストレーションの頂点を極めた。", "tags": ["breakthrough"]},
        {"year": 1905, "age": 61, "title": "血の日曜日事件で学生支持、音楽院を解雇", "detail": "学生たちの弾圧抗議に立ち、政治的理由で解雇される。世論の反発で復職。", "tags": ["pride_broken"]},
        {"year": 1908, "age": 64, "title": "最後のオペラ『金鶏』上演禁止の中で死去", "detail": "皇帝批判と読まれ、初演を見ずに去る。", "tags": ["loss"]},
    ],
    "respighi": [
        {"year": 1913, "age": 34, "title": "ローマのサンタ・チェチーリア音楽院教授に", "detail": "以後ローマに定住。ローマ三部作の土壌。", "tags": ["restart"]},
        {"year": 1916, "age": 37, "title": "『ローマの噴水』初演で一夜にして有名に", "detail": "トスカニーニが再演し国際的評価を得る。", "tags": ["breakthrough", "approval"]},
        {"year": 1919, "age": 40, "title": "弟子エルザ・オリヴィエーリと結婚", "detail": "17歳下。後に彼女が遺作の編曲・完成を担う。", "tags": ["turning_encounter"]},
        {"year": 1924, "age": 45, "title": "『ローマの松』初演", "detail": "鳥の声の蓄音機録音をスコアに指定した革新。", "tags": ["breakthrough"]},
        {"year": 1926, "age": 47, "title": "アメリカ演奏旅行で熱狂的歓迎", "detail": "カーネギーホールで自作指揮。", "tags": ["approval"]},
        {"year": 1936, "age": 56, "title": "心内膜炎で急死", "detail": "遺作『ルクレツィア』は妻エルザが完成。", "tags": ["loss", "illness"]},
    ],
    "copland": [
        {"year": 1921, "age": 21, "title": "パリでナディア・ブーランジェに師事", "detail": "20世紀米国音楽を形作った師弟関係の始まり。", "tags": ["turning_encounter"]},
        {"year": 1925, "age": 25, "title": "ニューヨーク帰国、作曲家として自立", "detail": "グッゲンハイム奨学金を獲得。", "tags": ["restart", "approval"]},
        {"year": 1938, "age": 38, "title": "バレエ『ビリー・ザ・キッド』初演", "detail": "アメリカ西部の音を確立。アメリカニズムの樹立。", "tags": ["breakthrough"]},
        {"year": 1944, "age": 44, "title": "『アパラチアの春』でピュリツァー賞", "detail": "マーサ・グラハムのためのバレエ。", "tags": ["approval"]},
        {"year": 1953, "age": 53, "title": "マッカーシズムで議会に召喚される", "detail": "左翼活動歴を疑われ音楽活動に支障。名誉は数年後回復。", "tags": ["pride_broken"]},
        {"year": 1990, "age": 90, "title": "長寿を全うし永眠", "detail": "晩年は自作指揮に徹し、アメリカ音楽の長老として敬愛された。", "tags": ["loss"]},
    ],
    "bernstein": [
        {"year": 1943, "age": 25, "title": "代役でニューヨーク・フィル指揮デビュー", "detail": "病気のワルターの代役で、無名ながら一夜にして大スターに。", "tags": ["breakthrough"]},
        {"year": 1951, "age": 33, "title": "フェリシア・モンテアレグレと結婚", "detail": "女優。彼の同性愛志向を知りながら結婚し3児をもうけた。", "tags": ["turning_encounter"]},
        {"year": 1957, "age": 39, "title": "『ウエスト・サイド物語』ブロードウェイ初演", "detail": "ミュージカルを芸術へ昇華させた金字塔。", "tags": ["breakthrough"]},
        {"year": 1958, "age": 40, "title": "ニューヨーク・フィル音楽監督に", "detail": "米国人初。テレビ『ヤング・ピープルズ・コンサート』で音楽を大衆へ。", "tags": ["approval"]},
        {"year": 1978, "age": 60, "title": "妻フェリシアを癌で失う", "detail": "離婚直後に彼女が癌宣告。和解し看取った。生涯最大の喪失。", "tags": ["loss", "bereavement"]},
        {"year": 1989, "age": 71, "title": "ベルリンの壁崩壊記念コンサート指揮", "detail": "ベートーヴェン第9の『歓喜』を『自由』に変えて演奏。", "tags": ["breakthrough"]},
    ],
    "ryuichi_sakamoto": [
        {"year": 1978, "age": 26, "title": "YMO結成、細野晴臣・高橋幸宏と", "detail": "テクノポップで世界市場を開拓。東京から世界へ。", "tags": ["turning_encounter", "breakthrough"]},
        {"year": 1983, "age": 31, "title": "『戦場のメリークリスマス』出演・音楽", "detail": "デヴィッド・ボウイと共演。映画音楽への本格進出。", "tags": ["breakthrough"]},
        {"year": 1988, "age": 36, "title": "『ラストエンペラー』でアカデミー賞作曲賞", "detail": "日本人初のアカデミー賞音楽部門受賞。", "tags": ["approval"]},
        {"year": 2014, "age": 62, "title": "中咽頭癌を公表、休養", "detail": "『人生の残りを考える時間になった』と発言。", "tags": ["illness"]},
        {"year": 2017, "age": 65, "title": "アルバム『async』発表、復帰", "detail": "死と向き合った静謐な作品群。", "tags": ["restart"]},
        {"year": 2023, "age": 71, "title": "闘病の末、永眠", "detail": "最後までピアノに向かった。『Ars longa, vita brevis』を座右の銘に。", "tags": ["loss"]},
    ],
    "hisaishi": [
        {"year": 1981, "age": 31, "title": "『MKWAJU』でミニマル・ミュージック発表", "detail": "インスト音楽家として出発。『久石譲』名乗り始める。", "tags": ["restart"]},
        {"year": 1984, "age": 34, "title": "『風の谷のナウシカ』で宮崎駿と初タッグ", "detail": "以後全作品の音楽を担当。40年続く黄金コンビの始まり。", "tags": ["turning_encounter", "breakthrough"]},
        {"year": 1988, "age": 38, "title": "『となりのトトロ』『火垂るの墓』同時公開", "detail": "主題歌『さんぽ』は日本の保育園で歌い継がれる。", "tags": ["approval"]},
        {"year": 2001, "age": 51, "title": "『千と千尋の神隠し』でアカデミー賞受賞", "detail": "映画は日本映画初のベルリン金熊賞も。", "tags": ["approval"]},
        {"year": 2008, "age": 58, "title": "日本アカデミー賞最優秀音楽賞（『崖の上のポニョ』）", "detail": "以後も受賞を重ね、日本映画音楽の代名詞に。", "tags": ["approval"]},
        {"year": 2023, "age": 73, "title": "『君たちはどう生きるか』音楽担当", "detail": "宮崎駿の引退撤回作。40年の集大成。", "tags": ["breakthrough"]},
    ],
    "haydn": [
        {"year": 1749, "age": 17, "title": "変声期で聖歌隊追放、路頭に迷う", "detail": "ウィーンの屋根裏で音楽教師しながら独学。", "tags": ["pride_broken", "poverty"]},
        {"year": 1761, "age": 29, "title": "エステルハージ家の副楽長に", "detail": "以後30年、この貴族家の音楽家として孤島のような宮廷で過ごす。", "tags": ["restart"]},
        {"year": 1781, "age": 49, "title": "モーツァルトと初対面、生涯の友情", "detail": "ウィーンで。モーツァルトは6つの弦楽四重奏曲を捧げた。", "tags": ["turning_encounter"]},
        {"year": 1790, "age": 58, "title": "エステルハージ家の楽団解散、自由の身に", "detail": "新当主の方針で楽団廃止。年金付きで解放され、ロンドン行きへ。", "tags": ["restart"]},
        {"year": 1791, "age": 59, "title": "ロンドン公演で熱狂的歓迎、オックスフォード名誉博士", "detail": "『驚愕』『軍隊』交響曲を作曲。収入は生涯の総額に匹敵。", "tags": ["approval"]},
        {"year": 1798, "age": 66, "title": "オラトリオ『天地創造』初演", "detail": "ロンドンで聴いたヘンデルの影響。晩年の大作。", "tags": ["breakthrough"]},
    ],
    "gershwin": [
        {"year": 1914, "age": 16, "title": "高校を辞めティン・パン・アレーでピアニストに", "detail": "出版社の楽譜売りピアニストとして週給15ドル。", "tags": ["restart"]},
        {"year": 1919, "age": 21, "title": "『スワニー』が100万枚売れるヒット", "detail": "アル・ジョルソンの歌唱で大ヒット。作曲家として独立。", "tags": ["breakthrough"]},
        {"year": 1924, "age": 26, "title": "『ラプソディ・イン・ブルー』初演", "detail": "ポール・ホワイトマン楽団がカーネギーホールで。ジャズとクラシックの橋渡し。", "tags": ["breakthrough"]},
        {"year": 1928, "age": 30, "title": "ラヴェルに弟子入り志願、断られる", "detail": "『一流のラヴェルでいるほうが、二流のガーシュウィンより良い』と断られる。", "tags": ["pride_broken"]},
        {"year": 1935, "age": 37, "title": "オペラ『ポーギーとベス』初演", "detail": "全黒人キャスト。『Summertime』を含む。", "tags": ["breakthrough"]},
        {"year": 1937, "age": 38, "title": "脳腫瘍で急死、ハリウッドで活躍の最中", "detail": "頭痛の原因が腫瘍と判明した時は手遅れ。38歳で早世。", "tags": ["loss", "illness"]},
    ],
    "bartok": [
        {"year": 1904, "age": 23, "title": "民謡採集の旅始める、ハンガリー農村へ", "detail": "コダーイと協力して蝋管に数千曲を録音。生涯の研究テーマ。", "tags": ["restart"]},
        {"year": 1909, "age": 28, "title": "マルタ・ツィーグラーと最初の結婚", "detail": "教え子。二人の息子をもうけた。", "tags": ["turning_encounter"]},
        {"year": 1923, "age": 42, "title": "2度目の妻ディッタ・パーストリと結婚", "detail": "教え子。ピアニストとして共演するパートナー。", "tags": ["turning_encounter"]},
        {"year": 1936, "age": 55, "title": "『弦楽器・打楽器・チェレスタのための音楽』", "detail": "20世紀器楽曲の金字塔。", "tags": ["breakthrough"]},
        {"year": 1940, "age": 59, "title": "ナチス・ハンガリー同盟を拒みアメリカ亡命", "detail": "最愛の母の死を待って出国。以後帰国叶わず。", "tags": ["pride_broken", "bereavement"]},
        {"year": 1945, "age": 64, "title": "ニューヨークで白血病のため客死", "detail": "米国では名声を得られず、貧しいまま。遺作『ピアノ協奏曲第3番』は17小節を残して絶筆。", "tags": ["loss", "poverty"]},
    ],
    "scriabin": [
        {"year": 1894, "age": 22, "title": "右手腱鞘炎でピアニストとしてのキャリアに挫折", "detail": "リスト超絶技巧を無理に練習し故障。左手のための作品を書くきっかけに。", "tags": ["pride_broken", "illness"]},
        {"year": 1898, "age": 26, "title": "モスクワ音楽院教授就任、作曲家として歩む", "detail": "演奏家断念の代わりに作曲と教育へ。", "tags": ["restart"]},
        {"year": 1904, "age": 32, "title": "神智学に傾倒、スイスに移住", "detail": "ブラヴァツキー夫人の著作で精神革命志向へ。", "tags": ["turning_encounter"]},
        {"year": 1908, "age": 36, "title": "『法悦の詩』完成、陶酔の音楽へ", "detail": "色と音の共感覚を作品化する試み。", "tags": ["breakthrough"]},
        {"year": 1910, "age": 38, "title": "『プロメテウス』で色光ピアノを使用", "detail": "音に色を割り当てる世界初の試み。", "tags": ["breakthrough"]},
        {"year": 1915, "age": 43, "title": "上唇の膿瘍で敗血症、急死", "detail": "最後の作品『神秘劇』構想は未完。", "tags": ["loss", "illness"]},
    ],
    "palestrina": [
        {"year": 1551, "age": 26, "title": "ユリウス3世の計らいでシスティーナ礼拝堂楽長に", "detail": "教会音楽の頂点に若くして抜擢。", "tags": ["approval"]},
        {"year": 1555, "age": 30, "title": "パウルス4世により既婚を理由に解雇", "detail": "礼拝堂員は独身が必須だった。失業し病を得る。", "tags": ["pride_broken"]},
        {"year": 1564, "age": 39, "title": "『マルチェルス教皇のミサ』発表", "detail": "トレント公会議でポリフォニーを救ったとされる伝説の作品。", "tags": ["breakthrough"]},
        {"year": 1580, "age": 55, "title": "疫病で妻ルクレツィアと2人の息子を失う", "detail": "聖職者になる決意を一時するも、翌年再婚。", "tags": ["loss", "bereavement"]},
        {"year": 1581, "age": 56, "title": "裕福な毛皮商の寡婦と再婚", "detail": "経済的に安定、作曲出版に専念できるように。", "tags": ["restart"]},
        {"year": 1594, "age": 69, "title": "『教会音楽の救済者』として永眠", "detail": "サン・ピエトロ大聖堂に葬られる。約105のミサ曲を残した。", "tags": ["loss", "approval"]},
    ],
}


def merge_events(existing, new_events):
    """年で重複チェック、なければ追加"""
    existing_keys = set()
    for e in existing:
        key = (e.get("year"), (e.get("title") or "")[:15])
        existing_keys.add(key)
    added = 0
    for ne in new_events:
        key = (ne.get("year"), (ne.get("title") or "")[:15])
        if key in existing_keys:
            continue
        existing.append(ne)
        existing_keys.add(key)
        added += 1
    existing.sort(key=lambda x: (x.get("year") or 0))
    return added


def main():
    total_added = 0
    for pid, events in E.items():
        path = PEOPLE / f"{pid}.json"
        if not path.exists():
            print(f"skip: {pid} (no file)")
            continue
        p = json.loads(path.read_text(encoding="utf-8"))
        p.setdefault("events", [])
        added = merge_events(p["events"], events)
        path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{pid}: +{added} events (now {len(p['events'])})")
        total_added += added
    print(f"---\nTotal: +{total_added} events")


if __name__ == "__main__":
    main()
