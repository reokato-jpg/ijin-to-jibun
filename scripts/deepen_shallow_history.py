# -*- coding: utf-8 -*-
"""薄い偉人（イベント9以下）に、既存と重複しない新しい歴史的転機を追加"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

E = {
    "aristotle": [
        {"year": -367, "age": 17, "title": "アテナイ到着、アカデメイアの最年少学生に", "detail": "17歳で父の遺産を使いプラトンの下へ。20年間『学園の知性』と呼ばれる。", "tags": ["restart", "turning_encounter"]},
        {"year": -345, "age": 39, "title": "レスボス島で海洋生物の観察に没頭", "detail": "後の『動物誌』の元となる500種の観察記録。現地の漁師から学ぶ。", "tags": ["breakthrough"]},
        {"year": -338, "age": 46, "title": "父の死により家政婦ヘルピュリスと内縁関係", "detail": "先妻ピュティアスの死後。息子ニコマコスを得る。『ニコマコス倫理学』の献呈先。", "tags": ["loss", "turning_encounter"]},
        {"year": -335, "age": 49, "title": "アテナイに戻り、リュケイオンに私塾開設", "detail": "プラトンのアカデメイアとは別の形で、朝は高度な講義、午後は一般公開の講義を続けた。", "tags": ["restart"]},
        {"year": -323, "age": 61, "title": "アレクサンドロス急死、アテナイに反マケドニア暴動", "detail": "『ソクラテスの過ち』を繰り返さぬためカルキスへ亡命。『アテナイ人に哲学への二度目の罪を犯させない』。", "tags": ["escape", "isolation"]},
    ],
    "buddha": [
        {"year": -544, "age": 19, "title": "息子ラーフラ誕生、翌朝出家を決意", "detail": "『ラーフラ（束縛）が生まれた』と叫んだとされる。わが子の誕生が逆に出家の引き金となった。", "tags": ["turning_encounter"]},
        {"year": -531, "age": 32, "title": "鹿野苑で最初の5人の弟子（五比丘）に初説法", "detail": "苦行時代の仲間たちを諭し、仏教教団の原点が生まれた瞬間。", "tags": ["breakthrough"]},
        {"year": -520, "age": 43, "title": "郷里カピラヴァストゥ訪問、父浄飯王と再会", "detail": "出家後13年ぶり。父は息子が物乞いをする姿を見て泣いたが、後に仏教に帰依。", "tags": ["turning_encounter"]},
        {"year": -519, "age": 44, "title": "養母マハーパジャーパティの出家願いを拒絶するも受入れ", "detail": "弟子アーナンダの説得で女性の出家を認める。仏教初の比丘尼教団の誕生。", "tags": ["breakthrough"]},
        {"year": -500, "age": 63, "title": "いとこデーヴァダッタの反逆と教団分裂の危機", "detail": "デーヴァダッタが僧団を乗っ取ろうと画策、失敗して分派。仏陀の晩年最大の試練。", "tags": ["pride_broken", "isolation"]},
    ],
    "descartes": [
        {"year": 1606, "age": 10, "title": "ラ・フレーシュ学院入学、イエズス会で学ぶ", "detail": "虚弱のため午前中のベッドでの思索を許された。生涯続く『朝のベッドでの瞑想』の習慣はここから。", "tags": ["turning_encounter"]},
        {"year": 1620, "age": 24, "title": "ウルム近郊で『暖炉部屋の思索』", "detail": "三十年戦争従軍中、ドイツの村で一人暖炉の中に入り終日思索。『明晰判明な知』の方法を構想。", "tags": ["breakthrough"]},
        {"year": 1635, "age": 39, "title": "女中ヘレナとの間に娘フランシーヌ誕生", "detail": "結婚していないため『姪』として育てる。娘への愛は死後まで深く残った。", "tags": ["turning_encounter"]},
        {"year": 1640, "age": 44, "title": "愛娘フランシーヌが5歳で猩紅熱で死去", "detail": "『私の生涯最大の悲しみ』と友人に書いた。以後一年以上哲学を書けなくなる。", "tags": ["loss", "bereavement"]},
        {"year": 1648, "age": 52, "title": "オランダで神学者ボエティウスらと激しい論争", "detail": "『無神論者』と告発され裁判沙汰に。友人たちの支援で切り抜けるが神経をすり減らす。", "tags": ["pride_broken"]},
    ],
    "hijikata_toshizo": [
        {"year": 1835, "age": 0, "title": "武州多摩・石田村の豪農の末子として誕生", "detail": "父・隼人は出生前に死去、母も6歳で失う。兄姉に育てられた。", "tags": ["loss", "poverty"]},
        {"year": 1848, "age": 13, "title": "江戸の大伝馬町『いとう松坂屋』に奉公、追放される", "detail": "商人には向かず。姉の婿の道場で剣術を学ぶことに。", "tags": ["pride_broken", "restart"]},
        {"year": 1853, "age": 18, "title": "家伝の『石田散薬』を行商しながら道場巡り", "detail": "武州多摩の村々を歩き、各道場で試合を重ねた青年期。", "tags": ["restart"]},
        {"year": 1864, "age": 29, "title": "池田屋事件で土方隊が裏口を固め、功を挙げる", "detail": "近藤隊が突入する間、裏口で浪士の脱出を防いだ。新選組の名を全国に知らしめる事件。", "tags": ["breakthrough"]},
        {"year": 1867, "age": 32, "title": "幕府直参『見廻組』格、旗本並に取り立てられる", "detail": "百姓出が旗本格。しかし大政奉還、王政復古で状況は一変する。", "tags": ["approval"]},
        {"year": 1868, "age": 33, "title": "甲州勝沼で敗走、盟友・近藤勇との永別", "detail": "流山で近藤が新政府軍に捕まる直前、土方は脱出し土方一人で戦い続けることに。", "tags": ["loss", "isolation"]},
    ],
    "kant": [
        {"year": 1732, "age": 8, "title": "フリードリヒスコレギウム入学、ラテン語漬けの8年", "detail": "厳格な敬虔主義の学校。後に『青年期の奴隷状態』と呼んだが、古典教養の基礎となる。", "tags": ["pride_broken"]},
        {"year": 1746, "age": 22, "title": "父の死、学業を中断し家庭教師として各地を転々", "detail": "父の死で家計が破綻。9年間、貴族の家庭教師として生活費を稼いだ。", "tags": ["loss", "poverty"]},
        {"year": 1762, "age": 38, "title": "ルソー『エミール』を読み、時計のように正確な散歩を中断", "detail": "毎日の散歩時間を狂わせたのはこの読書だけと言われる。人間観を根本から変えた出会い。", "tags": ["turning_encounter"]},
        {"year": 1770, "age": 46, "title": "10年の『沈黙期』開始、三批判書の構想を練る", "detail": "正教授就任後、11年間ほとんど論文を出さず思索に沈む。『純粋理性批判』の沈黙。", "tags": ["blank_period"]},
        {"year": 1794, "age": 70, "title": "フリードリヒ・ヴィルヘルム2世から宗教論執筆を禁じられる", "detail": "『理性の限界内の宗教』への処分。カントは王への服従を誓うが内心の信念は譲らず。", "tags": ["pride_broken"]},
    ],
    "kant_hannah": [
        {"year": 1929, "age": 23, "title": "ハイデルベルク大学、ヤスパースの下で博士号取得", "detail": "『アウグスティヌスにおける愛の概念』で博士号。現存在分析と宗教哲学の交差点。", "tags": ["breakthrough"]},
        {"year": 1933, "age": 27, "title": "ゲシュタポに拘束、8日で釈放、パリへ亡命", "detail": "シオニスト運動のためのユダヤ人史資料調査で逮捕。釈放後即座にパリへ。", "tags": ["escape"]},
        {"year": 1940, "age": 34, "title": "フランス敗戦でギュルス収容所に抑留、脱走", "detail": "7000人の女性が抑留された中、混乱に乗じて脱走。リスボンから米国へ。", "tags": ["escape"]},
        {"year": 1951, "age": 45, "title": "『全体主義の起源』出版、一躍世界の思想家に", "detail": "ナチズムとスターリニズムを同じ構造で捉えた画期的著作。", "tags": ["breakthrough"]},
        {"year": 1963, "age": 57, "title": "『イェルサレムのアイヒマン』出版、ユダヤ人社会から猛反発", "detail": "『悪の陳腐さ』概念とユダヤ人評議会の責任追及で、旧友たちから絶交される。", "tags": ["pride_broken", "isolation"]},
    ],
    "kierkegaard": [
        {"year": 1830, "age": 17, "title": "コペンハーゲン大学神学部入学、放蕩の3年", "detail": "父の期待を裏切り、酒と劇場通いの日々。『私は酒を飲み、哲学者に会った』。", "tags": ["escape"]},
        {"year": 1841, "age": 28, "title": "レギーネとの婚約を一方的に破棄", "detail": "『私の内なる憂鬱が彼女を不幸にする』と決意し、わざと悪人のように振る舞って彼女を突き放した。", "tags": ["heartbreak"]},
        {"year": 1843, "age": 30, "title": "『あれか、これか』出版、名前を伏せて", "detail": "『ヴィクター・エレミタ』の仮名で出版。実名を伏せた間接伝達の始まり。", "tags": ["breakthrough"]},
        {"year": 1846, "age": 33, "title": "風刺誌『コルサル』から執拗な人格攻撃", "detail": "歩き方・猫背・服装まで揶揄される。『コペンハーゲンの街を歩けなくなった』と書く。", "tags": ["pride_broken", "isolation"]},
        {"year": 1854, "age": 41, "title": "デンマーク国教会との公開論争開始", "detail": "ミュンスター監督の葬儀での賛辞に怒り、国教会批判を連続発表。", "tags": ["pride_broken"]},
    ],
    "laozi": [
        {"year": -530, "age": 41, "title": "周の文書管理官として、古代からの経典を読み尽くす", "detail": "周王室の図書館長格。商・周の興亡の記録を全て読めた唯一の人物と伝わる。", "tags": ["turning_encounter"]},
        {"year": -520, "age": 51, "title": "周王朝の衰退を見て『天下は道を失った』と嘆く", "detail": "王子朝の乱、貴族の私欲化、民の疲弊。官僚として見た現実が『無為自然』思想の原点。", "tags": ["pride_broken"]},
        {"year": -510, "age": 61, "title": "弟子関尹喜と出会う、函谷関の守り役", "detail": "後に老子が関を越えるとき、経を残すよう請うことになる人物との出会い。", "tags": ["turning_encounter"]},
        {"year": -490, "age": 81, "title": "『上善は水の如し』の章を説く", "detail": "水は万物を利して争わず、低きに甘んじる。後に東洋思想全体を貫く美意識となる教え。", "tags": ["breakthrough"]},
    ],
    "leonardo": [
        {"year": 1472, "age": 20, "title": "フィレンツェ画家組合『聖ルカ組合』に登録", "detail": "師ヴェロッキオの工房にとどまったまま独立資格を得る異例の立場。", "tags": ["approval"]},
        {"year": 1476, "age": 24, "title": "同性愛疑惑で告発されるが証拠不十分で却下", "detail": "『匿名の投書』でサルタレッリ事件に連座。生涯この恐れが彼の慎重さを形作った。", "tags": ["pride_broken", "isolation"]},
        {"year": 1490, "age": 38, "title": "10歳の少年サライを弟子に、30年連れ添う", "detail": "『悪魔の化身』と呼ぶほど手癖が悪いが愛した。遺産の一部を残した。", "tags": ["turning_encounter"]},
        {"year": 1499, "age": 47, "title": "フランス軍侵攻でミラノ脱出、17年の庇護者を失う", "detail": "スフォルツァ家滅亡。騎馬像の巨大粘土模型はフランス兵の弓の的にされて破壊された。", "tags": ["loss", "pride_broken"]},
        {"year": 1510, "age": 58, "title": "解剖学ノート、30体以上の人体解剖", "detail": "パヴィアのマルカントニオと共同で。心臓の構造・胎児の姿などを描く。出版叶わず。", "tags": ["breakthrough"]},
    ],
    "freud": [
        {"year": 1886, "age": 30, "title": "マルタ・ベルナイスと結婚、4年の婚約期間を経て", "detail": "財政難で4年待たされた婚約。6人の子をもうけ、特に末子アンナが精神分析を継ぐ。", "tags": ["turning_encounter"]},
        {"year": 1895, "age": 39, "title": "親友ブロイアーと共著『ヒステリー研究』", "detail": "アンナ・O の症例から精神分析誕生。しかし師弟関係はこの数年で破綻する。", "tags": ["breakthrough"]},
        {"year": 1900, "age": 44, "title": "『夢判断』初版は6部しか売れず", "detail": "『科学史上最大の書物』を自負するが8年かけて600部。無名の医師のままだった。", "tags": ["pride_broken"]},
        {"year": 1909, "age": 53, "title": "ユングと共にクラーク大学訪問、米国で講演", "detail": "初の国際的認知。アメリカで精神分析が広まるきっかけ。", "tags": ["approval", "breakthrough"]},
        {"year": 1914, "age": 58, "title": "ユングと決別、『ナルシシズム入門』で反論", "detail": "5年続いた親子のような関係の終わり。『王子の裏切り』として記憶される。", "tags": ["loss", "pride_broken"]},
    ],
    "kawabata": [
        {"year": 1917, "age": 18, "title": "第一高等学校英文科入学、同級に今東光・石濱金作", "detail": "後の文壇交友の基礎。『第六感』と言わしめた直観力を発揮。", "tags": ["turning_encounter"]},
        {"year": 1924, "age": 25, "title": "横光利一・今東光らと『文芸時代』創刊、新感覚派", "detail": "『頭に挿した花』で文壇デビュー。横光は生涯の親友となる。", "tags": ["breakthrough", "turning_encounter"]},
        {"year": 1926, "age": 27, "title": "『伊豆の踊子』発表", "detail": "伊豆の旅で出会った14歳の踊子との淡い恋情を。以後再び孤児感を抱え続ける。", "tags": ["breakthrough"]},
        {"year": 1937, "age": 38, "title": "『雪国』単行本刊行、戦時下でも加筆続ける", "detail": "1935年の雑誌発表から1948年の決定版まで13年かけた愛の結晶。", "tags": ["breakthrough"]},
        {"year": 1968, "age": 69, "title": "日本人初のノーベル文学賞受賞", "detail": "『日本の心の精髄を表現した』と。受賞スピーチ『美しい日本の私』。", "tags": ["approval", "breakthrough"]},
    ],
    "kondo_isami": [
        {"year": 1834, "age": 0, "title": "武州多摩・上石原の豪農宮川家に三男として誕生", "detail": "幼名・勝五郎。生まれは百姓の家、義兄が武士となり、そこから武士の道へ。", "tags": []},
        {"year": 1849, "age": 15, "title": "天然理心流・試衛館の近藤周助に入門", "detail": "15歳で入門、わずか4年で免許皆伝。義兄から百姓で剣を学ぶ道を示された。", "tags": ["restart", "turning_encounter"]},
        {"year": 1860, "age": 26, "title": "養父周助の養子となり試衛館4代目襲名", "detail": "百姓出から剣術道場主へ。土方・沖田・山南らが集う時代が始まる。", "tags": ["approval", "restart"]},
        {"year": 1863, "age": 29, "title": "浪士組として上洛、芹沢一派と袂を分かつ", "detail": "京都で新選組前身が誕生。やがて芹沢鴨粛清で実権を握る。", "tags": ["breakthrough"]},
        {"year": 1868, "age": 34, "title": "流山で投降、板橋で斬首", "detail": "偽名『大久保大和』で投降するも正体が露見。享年35。首は京都三条河原に晒された。", "tags": ["loss", "pride_broken"]},
    ],
    "schopenhauer": [
        {"year": 1809, "age": 21, "title": "父の死で遺産を得、学問の道を選ぶ", "detail": "商人として育てられたが、父の自殺後、母の後押しで哲学の道へ。", "tags": ["loss", "restart"]},
        {"year": 1813, "age": 25, "title": "イェーナ大学で博士号、論文は認められず自費出版", "detail": "『充足理由律の四重の根について』。ゲーテだけが価値を認めた。", "tags": ["pride_broken", "approval"]},
        {"year": 1819, "age": 31, "title": "『意志と表象としての世界』刊行、売れず", "detail": "『人類に贈る書』と自負したが、17年間で初版すら売り切れなかった。", "tags": ["pride_broken"]},
        {"year": 1820, "age": 32, "title": "ベルリン大学でヘーゲルと同時刻に講義、0人", "detail": "わざとヘーゲルと同時間に講義を設定したが学生は誰も来ず。半年で辞職。", "tags": ["pride_broken", "isolation"]},
        {"year": 1851, "age": 63, "title": "『余録と補遺』出版、晩年にして一挙有名に", "detail": "60代半ばで初めて広く読まれる。『人生とは苦である』が流行語となる。", "tags": ["breakthrough", "approval"]},
    ],
    "socrates": [
        {"year": -438, "age": 32, "title": "パルテノン神殿完成、黄金期のアテナイで成年", "detail": "ペリクレス時代、ソクラテスは彫刻家として働きつつ政治・哲学サロンに出入りした。", "tags": []},
        {"year": -423, "age": 47, "title": "アリストファネスの喜劇『雲』で嘲笑の的に", "detail": "観客席で立ち上がり顔を見せたと伝わる。後の告発の下地となった。", "tags": ["pride_broken"]},
        {"year": -416, "age": 54, "title": "アガトンの祝宴、プラトン『饗宴』の舞台に", "detail": "若きアルキビアデスが酔って乱入し、ソクラテスへの愛を語った伝説の夜。", "tags": ["turning_encounter"]},
        {"year": -402, "age": 68, "title": "アルキビアデス暗殺、弟子の死を知る", "detail": "ソクラテス最愛の弟子の一人が追放先で殺害される。哲学と政治の交差点で。", "tags": ["loss"]},
        {"year": -399, "age": 71, "title": "法廷で『君たちは私を殺すが、汝自身を傷つける』と宣言", "detail": "有罪判決直後、弁明の最後に予言。実際、処刑後にアテナイは彼の思想家たちで有名になる。", "tags": ["pride_broken", "breakthrough"]},
    ],
    "walt_disney": [
        {"year": 1906, "age": 4, "title": "ミズーリ州マーセリーンの農場へ移住", "detail": "5年間の田舎暮らし。『メインストリートUSA』のモデルとなる原風景がここに。", "tags": ["turning_encounter"]},
        {"year": 1918, "age": 16, "title": "年齢を偽って赤十字運転手として欧州へ", "detail": "第一次大戦末期、戦争には間に合わなかったが救護員としてフランスで1年過ごす。", "tags": ["escape", "restart"]},
        {"year": 1928, "age": 27, "title": "『蒸気船ウィリー』初の音付きアニメで大ヒット", "detail": "ウサギを盗られた直後、ミッキーマウスを創作。翌年までに全米の子供たちに。", "tags": ["breakthrough"]},
        {"year": 1941, "age": 39, "title": "スタジオのアニメーター大ストライキ", "detail": "5ヶ月続く労働争議。ウォルトは『裏切られた』と感じ、一部の同僚と終生関係修復できず。", "tags": ["pride_broken", "loss"]},
        {"year": 1955, "age": 53, "title": "ディズニーランド開園、失敗の初日", "detail": "予算超過・水不足・アスファルト軟化。『ブラック・サンデー』と呼ばれた初日から立て直した。", "tags": ["pride_broken", "restart", "breakthrough"]},
    ],
}


def normalize(s):
    return re.sub(r"[『』「」\(\)（）、。・\s]", "", (s or "")).lower()


def is_duplicate(existing_events, new_event):
    ne_year = new_event.get("year")
    ne_norm = normalize(new_event.get("title", ""))
    for ev in existing_events:
        if ev.get("year") != ne_year:
            continue
        ev_norm = normalize(ev.get("title", ""))
        if ne_norm == ev_norm or ne_norm in ev_norm or ev_norm in ne_norm:
            return True
        # 共通文字割合が高い場合も重複扱い
        short, long_ = (ne_norm, ev_norm) if len(ne_norm) <= len(ev_norm) else (ev_norm, ne_norm)
        if short and sum(1 for c in short if c in long_) / len(short) >= 0.6:
            return True
    return False


def main():
    total_added = 0
    for pid, new_events in E.items():
        path = PEOPLE / f"{pid}.json"
        if not path.exists():
            print(f"skip: {pid}")
            continue
        p = json.loads(path.read_text(encoding="utf-8"))
        p.setdefault("events", [])
        added = 0
        for ne in new_events:
            if is_duplicate(p["events"], ne):
                continue
            p["events"].append(ne)
            added += 1
        p["events"].sort(key=lambda x: (x.get("year") or 0))
        path.write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{pid}: +{added} (total {len(p['events'])})")
        total_added += added
    print(f"---\nTotal: +{total_added} events")


if __name__ == "__main__":
    main()
