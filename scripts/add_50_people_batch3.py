# -*- coding: utf-8 -*-
"""偉人 +50 人プロジェクト batch 3（前半 25 人）"""
import json, sys, pathlib
sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / 'data' / 'people'

def make(d):
    return {
        "id": d['id'], "name": d['name'], "nameEn": d.get('nameEn', ''),
        "birth": d.get('birth'), "death": d.get('death'),
        "country": d.get('country', ''), "field": d.get('field', ''),
        "summary": d.get('summary', ''), "wikiTitle": d.get('wikiTitle', d['name']),
        "events": d.get('events', []), "quotes": d.get('quotes', []),
        "places": [], "imageUrl": "",
        "books": d.get('books', []), "media": d.get('media', []), "works": [],
        "lifeDigest": d.get('lifeDigest', d.get('summary', '')),
        "traits": d.get('traits', {}), "relations": d.get('relations', []),
        "innerConflicts": d.get('innerConflicts', []),
        "turningPoints": d.get('turningPoints', []),
        "unknownStories": d.get('unknownStories', []),
    }

PEOPLE_DATA = [
{"id":"bezos","name":"ジェフ・ベゾス","nameEn":"Jeff Bezos","birth":1964,"death":None,"country":"アメリカ","field":"実業家・Amazon 創業者",
 "summary":"プリンストン卒、ヘッジファンドの幹部だった 30 歳でネット書店 Amazon を創業。全 e コマースを再定義し、AWS でクラウド時代を、Blue Origin で宇宙ビジネスを開いた。",
 "wikiTitle":"ジェフ・ベゾス",
 "events":[
  {"year":1964,"age":0,"title":"ニューメキシコ州アルバカーキで生まれる","detail":"母は 17 歳。実父との関係は途絶えたまま。","tags":["loss"]},
  {"year":1986,"age":22,"title":"プリンストン大学電気工学卒","detail":"成績はトップクラス、ベル研究所への誘いを蹴った。","tags":[]},
  {"year":1994,"age":30,"title":"Amazon 創業 — シアトルのガレージで","detail":"D.E.Shaw のヘッジファンド副社長を辞して西海岸へ。「30 年後に振り返って後悔したくない」。","tags":["restart","breakthrough"]},
  {"year":2000,"age":36,"title":"ドットコム崩壊で時価総額 1/10","detail":"Amazon 株が 100 ドル → 10 ドル。倒産寸前。長期戦略で耐え抜いた。","tags":["loss","pride_broken"]},
  {"year":2006,"age":42,"title":"AWS 立ち上げ — クラウド時代の幕開け","detail":"自社インフラを商品化、後に Amazon 利益の柱に。","tags":["breakthrough"]},
  {"year":2021,"age":57,"title":"Amazon CEO 退任、宇宙へ","detail":"Blue Origin で初の有人宇宙飛行に自ら搭乗。","tags":["restart"]}
 ],
 "quotes":[
  {"text":"今日が常に Day 1 である。Day 2 は停滞、衰退、そして死だ。","source":"株主への手紙 2017"},
  {"text":"あなたのブランドとは、あなたが部屋を出た後に他人があなたについて話すことだ。","source":"インタビュー"},
  {"text":"私は 30 年後の自分が、後悔しない選択をしたい。","source":"Amazon 創業時"}
 ],
 "lifeDigest":"Amazon 創業者・元 CEO。30 歳でネット書店を興し、世界最大の e コマース帝国と AWS を築いた。引退後は Blue Origin で宇宙開発と地球温暖化対策に専念。"
},
{"id":"elon_musk","name":"イーロン・マスク","nameEn":"Elon Musk","birth":1971,"death":None,"country":"南アフリカ→アメリカ","field":"実業家・Tesla / SpaceX CEO",
 "summary":"南アフリカで虐待的な父の下で孤独な少年期を過ごし、独学でプログラミングを習得。30 歳で PayPal を売却して得た資金で Tesla（電気自動車）と SpaceX（宇宙ロケット）を起業。両社を世界一に育てた現代最大の起業家。",
 "wikiTitle":"イーロン・マスク",
 "events":[
  {"year":1971,"age":0,"title":"南アフリカ・プレトリアで生まれる","detail":"父はエンジニア、両親は彼が 8 歳のとき離婚。","tags":[]},
  {"year":1983,"age":12,"title":"自作ゲーム『Blastar』を 500 ドルで販売","detail":"BASIC で書いたシューティングゲーム。","tags":["breakthrough"]},
  {"year":1995,"age":24,"title":"Zip2 創業","detail":"スタンフォード博士課程を 2 日でやめて起業。1999 年にコンパックへ 3 億ドルで売却。","tags":["restart"]},
  {"year":2002,"age":31,"title":"PayPal を eBay に売却 — 1.65 億ドル獲得","detail":"その金で SpaceX 創業。","tags":["restart"]},
  {"year":2004,"age":33,"title":"Tesla 投資・会長就任","detail":"2008 年 CEO に。","tags":[]},
  {"year":2008,"age":37,"title":"Tesla / SpaceX 倒産寸前","detail":"金融危機で両社破産直前。最後の現金で SpaceX のロケット 4 回目の打ち上げに賭け、成功。","tags":["loss","breakthrough"]},
  {"year":2022,"age":51,"title":"Twitter（X）買収 440 億ドル","detail":"言論プラットフォームの大規模リストラと再構築。","tags":[]}
 ],
 "quotes":[
  {"text":"失敗は選択肢の一つだ。失敗していないなら、十分にイノベートしていない。","source":"インタビュー"},
  {"text":"私は人類を多惑星種にしたい。地球で何かが起きても、種が絶えないように。","source":"SpaceX 創業時"},
  {"text":"金は手段であって、目的ではない。","source":"インタビュー"}
 ],
 "lifeDigest":"南アフリカ生まれの実業家。Tesla・SpaceX で電気自動車と民間宇宙ロケットを世界一に。X / xAI / Neuralink / Boring Co. と多数の事業を同時並行。賛否両論の現代最大の起業家。"
},
{"id":"son_masayoshi","name":"孫正義","nameEn":"Masayoshi Son","birth":1957,"death":None,"country":"日本（在日韓国系）","field":"実業家・ソフトバンク創業者",
 "summary":"佐賀の在日韓国人家庭に生まれ、16 歳で渡米しカリフォルニア大バークレー校卒。24 歳でソフトバンク創業、ヤフー BB・iPhone 独占販売・スプリント買収・ARM 買収・ビジョンファンドで世界の IT 投資を主導。",
 "wikiTitle":"孫正義",
 "events":[
  {"year":1957,"age":0,"title":"佐賀県鳥栖市の朝鮮人部落で生まれる","detail":"父は密造酒・パチンコ業。在日韓国人として差別を経験。","tags":["pride_broken"]},
  {"year":1973,"age":16,"title":"単身渡米","detail":"高校 1 年で中退してカリフォルニアへ。","tags":["restart"]},
  {"year":1980,"age":23,"title":"カリフォルニア大バークレー校卒、最初の 1 億円","detail":"自動翻訳機を発明しシャープに売却。","tags":["breakthrough"]},
  {"year":1981,"age":24,"title":"ソフトバンク創業","detail":"机 2 つの事務所で「30 年後に売上 1 兆円」を社員 2 人に宣言、2 人が翌日辞めた。","tags":["isolation"]},
  {"year":1995,"age":38,"title":"ヤフー創業出資","detail":"36 億円投資、後に 7000 億円超のリターン。","tags":[]},
  {"year":2006,"age":48,"title":"ボーダフォン日本買収 — iPhone 独占販売へ","detail":"1.7 兆円の借入で日本通信業界に風穴。","tags":["breakthrough"]},
  {"year":2017,"age":60,"title":"ビジョンファンド設立 — 10 兆円規模","detail":"史上最大のテックファンド。Uber・WeWork ほかに大量投資。","tags":["approval"]}
 ],
 "quotes":[
  {"text":"志と野望なくして、何が経営者か。","source":"社員へ"},
  {"text":"金は刀である。志のために抜く。","source":"スピーチ"},
  {"text":"私の強みは、99％ 嫌われても 1％ に届けばいいと思える鈍感力だ。","source":"インタビュー"}
 ],
 "lifeDigest":"日本最大の IT 起業家。在日韓国人の貧しい家庭から、24 歳でソフトバンク創業、世界 IT 投資の頂点まで上り詰めた。AI への巨額投資で 21 世紀後半のテック地図を描く野心家。"
},
{"id":"yanai_tadashi","name":"柳井正","nameEn":"Tadashi Yanai","birth":1949,"death":None,"country":"日本","field":"実業家・ファーストリテイリング会長",
 "summary":"山口県宇部市の小さな紳士服店を継ぎ、ユニクロを世界 26 か国 2400 店舗のグローバルブランドに育てた。「服を変え、常識を変え、世界を変えていく」を企業理念に、日本最大の小売企業を作った。",
 "wikiTitle":"柳井正",
 "events":[
  {"year":1949,"age":0,"title":"山口県宇部市の紳士服店「メンズショップ小郡商事」の長男として生まれる","detail":"","tags":[]},
  {"year":1972,"age":23,"title":"早稲田大学政経学部卒、ジャスコ入社→9 か月で退社","detail":"父の店を継ぐため山口へ戻る。","tags":["restart"]},
  {"year":1984,"age":35,"title":"ユニクロ 1 号店オープン（広島）","detail":"カジュアルウェア専門店。「ユニーク・クロージング・ウェアハウス」。","tags":["restart","breakthrough"]},
  {"year":1998,"age":49,"title":"フリースで全国ブレイク","detail":"原宿 1 号店、フリースが 850 万着販売。","tags":["approval","breakthrough"]},
  {"year":2001,"age":52,"title":"ロンドン進出 — 海外展開開始","detail":"赤字で撤退寸前まで苦戦するも継続。","tags":["loss"]},
  {"year":2010,"age":61,"title":"上海・ユニクロ旗艦店オープン — 海外売上が国内を超える日","detail":"アジア太平洋で爆発的成長。","tags":["breakthrough"]}
 ],
 "quotes":[
  {"text":"成功は捨てよ。失敗からしか学べない。","source":"『一勝九敗』"},
  {"text":"我が社は世界で唯一、本気で世界一を目指す日本企業だ。","source":"社員へ"},
  {"text":"商売は朝令暮改でいい。間違いに気づいたら今すぐ変える。","source":"経営論"}
 ],
 "lifeDigest":"日本最大のアパレル企業ファーストリテイリング会長。山口の紳士服店を継ぎ、ユニクロを世界 26 か国に展開。「服を変え常識を変え世界を変える」を実践した日本の小売王。"
},
{"id":"ibuka_masaru","name":"井深大","nameEn":"Masaru Ibuka","birth":1908,"death":1997,"country":"日本","field":"実業家・ソニー共同創業者",
 "summary":"早稲田大の電気工学青年が戦後焼け跡で東京通信工業（後のソニー）を起業、テープレコーダーから始めウォークマンまで「世界の SONY」を築いた技術者経営者。盛田昭夫との 50 年の二人三脚。",
 "wikiTitle":"井深大",
 "events":[
  {"year":1908,"age":0,"title":"栃木県日光市で生まれる","detail":"鉱山技師の子。","tags":[]},
  {"year":1933,"age":25,"title":"早稲田大学電気工学科卒","detail":"日本光音工業へ。","tags":[]},
  {"year":1946,"age":38,"title":"東京通信工業（後のソニー）創業","detail":"焼け野原の銀座で 7 人、資本金 19 万円。盛田昭夫 25 歳と組む。","tags":["restart"]},
  {"year":1955,"age":47,"title":"日本初のトランジスタラジオ「TR-55」発売","detail":"小型化技術で世界の道を開く。","tags":["breakthrough"]},
  {"year":1968,"age":60,"title":"トリニトロンカラーテレビ発売","detail":"鮮明な発色が世界を席巻。","tags":["approval"]},
  {"year":1979,"age":71,"title":"ウォークマン発売","detail":"音楽を持ち歩く文化を発明。「個人が音楽と一対一になる時代」。","tags":["breakthrough"]},
  {"year":1997,"age":89,"title":"東京で死去","detail":"「子育てと教育」に晩年を捧げた。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"幼児期はすべての始まり。","source":"『幼稚園では遅すぎる』"},
  {"text":"創意工夫で他社のやらないことをやる。それが我々の生きる道だ。","source":"ソニー設立趣意書"},
  {"text":"研究より教育の方が重要だ。","source":"晩年"}
 ],
 "lifeDigest":"ソニー共同創業者。技術者として戦後焼け跡から世界的家電メーカーを作った。ウォークマン・トランジスタラジオ・トリニトロンを生んだ「もの作り」の魂。盛田昭夫との二人三脚は経営史の金字塔。"
},
{"id":"morita_akio","name":"盛田昭夫","nameEn":"Akio Morita","birth":1921,"death":1999,"country":"日本","field":"実業家・ソニー共同創業者",
 "summary":"愛知の代々の造り酒屋の長男に生まれ、海軍技術中尉から戦後ソニーを共同創業。井深大の技術と組む経営側として、世界の SONY ブランドを築いた。「グローバル化」を最初に実践した日本人経営者。",
 "wikiTitle":"盛田昭夫",
 "events":[
  {"year":1921,"age":0,"title":"愛知県名古屋市で生まれる","detail":"15 代続く造り酒屋「盛田家」の長男。","tags":[]},
  {"year":1944,"age":23,"title":"海軍技術中尉として終戦","detail":"井深大と海軍時代に出会う。","tags":[]},
  {"year":1946,"age":25,"title":"井深大とソニーを共同創業","detail":"造り酒屋を継がず東京で起業。","tags":["restart"]},
  {"year":1958,"age":37,"title":"社名を「ソニー」に変更","detail":"日本企業初のカタカナ社名。世界市場を狙ったブランド戦略。","tags":["breakthrough"]},
  {"year":1963,"age":42,"title":"ニューヨーク移住、米国マーケットを開拓","detail":"妻と子供と渡米、現地校に通わせて文化を学ぶ。","tags":["restart"]},
  {"year":1989,"age":68,"title":"コロンビア・ピクチャーズ買収","detail":"日本企業の海外大型買収の象徴。","tags":["approval"]},
  {"year":1999,"age":78,"title":"東京で死去","detail":"「Made in Japan を世界ブランドに」を実現した男。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"先見性はリスクを取る勇気である。","source":"『MADE IN JAPAN』"},
  {"text":"日本の経営の強みは、社員が会社を信頼することだ。","source":"自伝"},
  {"text":"完璧な答えを待つな。今、行動せよ。","source":"社員へ"}
 ],
 "lifeDigest":"ソニー共同創業者・元会長。井深大の技術を世界に売る経営の天才。「Made in Japan」を世界ブランドに変えた日本企業初のグローバル経営者。"
},
{"id":"henry_ford","name":"ヘンリー・フォード","nameEn":"Henry Ford","birth":1863,"death":1947,"country":"アメリカ","field":"実業家・自動車王",
 "summary":"ミシガンの農家の子。「馬車から自動車へ」の革命と、流れ作業（アセンブリライン）による大量生産・大量消費社会の発明者。T 型フォードで車を富裕層の玩具から大衆の道具へ変えた。",
 "wikiTitle":"ヘンリー・フォード",
 "events":[
  {"year":1863,"age":0,"title":"ミシガン州ディアボーンの農場で生まれる","detail":"アイルランド系移民の子。","tags":[]},
  {"year":1879,"age":16,"title":"デトロイトで機械工見習い","detail":"農場を嫌い機械に憧れた少年期。","tags":["restart"]},
  {"year":1903,"age":40,"title":"フォード・モーター創業","detail":"3 度の失敗の後、4 度目で成功。","tags":["restart"]},
  {"year":1908,"age":45,"title":"T 型フォード発売","detail":"850 ドル（後に 260 ドル）で「庶民の車」を実現。","tags":["breakthrough"]},
  {"year":1913,"age":50,"title":"組み立てラインを工場に導入","detail":"1 台の組み立て時間 12 時間 → 1.5 時間。20 世紀の工業を変える。","tags":["breakthrough","approval"]},
  {"year":1914,"age":51,"title":"日給 5 ドル（業界 2 倍）を支給","detail":"労働者を中産階級に押し上げ、自社製品を買える人を増やす自己強化型経済の発明。","tags":[]},
  {"year":1947,"age":83,"title":"ディアボーンで死去","detail":"反ユダヤ主義の影もある複雑な遺産。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"あなたができると思っても、できないと思っても、あなたは正しい。","source":"伝"},
  {"text":"歴史は多かれ少なかれデタラメだ。","source":"インタビュー 1916"},
  {"text":"消費者にどんな色がいいかと聞いたなら、彼らは『今と同じ色』と答えただろう。","source":"T 型フォードについて"}
 ],
 "lifeDigest":"アメリカの自動車王、フォード・モーター創業者。T 型フォードと組み立てラインで自動車を大衆化し、20 世紀の工業生産・消費社会の原型を作った。光と影（反ユダヤ主義）のある巨人。"
},
{"id":"larry_page","name":"ラリー・ペイジ","nameEn":"Larry Page","birth":1973,"death":None,"country":"アメリカ","field":"実業家・Google 共同創業者",
 "summary":"ミシガン大コンピュータ科学の研究室で、博士課程の論文題材として『PageRank』アルゴリズムを発明。同級生セルゲイ・ブリンと組み、世界中の情報を整理する Google を立ち上げ、検索を 21 世紀のインフラに変えた。",
 "wikiTitle":"ラリー・ペイジ",
 "events":[
  {"year":1973,"age":0,"title":"ミシガン州ランシングで生まれる","detail":"父はミシガン州立大コンピュータ科学教授。","tags":[]},
  {"year":1995,"age":22,"title":"スタンフォード博士課程でセルゲイ・ブリンと出会う","detail":"博士論文のテーマでウェブのリンク構造を解析。","tags":["restart"]},
  {"year":1998,"age":25,"title":"Google 創業","detail":"スタンフォードのドミトリーから出発、最初のオフィスはガレージ。","tags":["breakthrough"]},
  {"year":2004,"age":31,"title":"Google IPO","detail":"23 億ドル調達、創業者 2 人が億万長者に。","tags":["approval"]},
  {"year":2015,"age":42,"title":"Alphabet 設立 — Google の親会社","detail":"自動運転・健康・気球ネットなどムーンショットプロジェクトを統合。","tags":["restart"]},
  {"year":2019,"age":46,"title":"Alphabet CEO 退任","detail":"スンダー・ピチャイに譲り、表舞台から退く。","tags":["isolation"]}
 ],
 "quotes":[
  {"text":"野心的すぎることに苦しむ方が、十分でないことに苦しむより楽だ。","source":"スタンフォード講演 2009"},
  {"text":"ユーザーに焦点を合わせれば、他はついてくる。","source":"Google 哲学 10 か条"},
  {"text":"地球上の情報をすべて整理するなんて誰も思いつかない。だから私たちがやる。","source":"創業期"}
 ],
 "lifeDigest":"Google 共同創業者。スタンフォード博士課程で PageRank を発明、世界の情報を整理する企業を作った。Alphabet 設立後は表舞台から退き、自動運転・空飛ぶ車・寿命延長など「ムーンショット」に投資。"
},
{"id":"tanaka_kakuei","name":"田中角栄","nameEn":"Kakuei Tanaka","birth":1918,"death":1993,"country":"日本","field":"政治家・第64代内閣総理大臣",
 "summary":"新潟・雪深い貧家の子に生まれ、高等小学校卒のみで首相まで上り詰めた「庶民宰相」。日中国交正常化、日本列島改造論で戦後日本の地図を変えたが、ロッキード事件で逮捕、晩年は脳梗塞で沈黙のまま死去。",
 "wikiTitle":"田中角栄",
 "events":[
  {"year":1918,"age":0,"title":"新潟県二田村（現柏崎市）の農家に生まれる","detail":"父の事業失敗で借金生活、雪深い貧家。","tags":[]},
  {"year":1933,"age":15,"title":"高等小学校卒で上京","detail":"建築事務所の小僧として働きつつ独学。","tags":["restart"]},
  {"year":1947,"age":29,"title":"衆議院議員初当選（民主党）","detail":"以降 16 期当選。","tags":["restart"]},
  {"year":1972,"age":54,"title":"内閣総理大臣就任","detail":"高等小学校卒の首相は史上初。","tags":["breakthrough","approval"]},
  {"year":1972,"age":54,"title":"日中国交正常化","detail":"周恩来との 4 日間の交渉で実現。","tags":["breakthrough"]},
  {"year":1976,"age":58,"title":"ロッキード事件で逮捕","detail":"5 億円の収賄罪。日本政治史上最大の汚職事件。","tags":["loss","pride_broken"]},
  {"year":1985,"age":67,"title":"脳梗塞で倒れる","detail":"以降 8 年間言葉を発さずに過ごす。","tags":["isolation"]},
  {"year":1993,"age":75,"title":"東京で死去","detail":"葬儀には自民党重鎮 ・支持者数十万人が参列。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"政治は数、数は力、力は金。","source":"政治論（伝）"},
  {"text":"説明する努力をしないと、誰も理解してくれない。","source":"派閥での教え"},
  {"text":"今太閤と呼ばれた私だが、雪国の貧しい子に過ぎない。","source":"自伝"}
 ],
 "lifeDigest":"日本の第 64 代総理大臣。高等小学校卒から首相まで上り詰めた「庶民宰相」。日中国交正常化と日本列島改造論で日本を変えたが、ロッキード事件で逮捕され、晩年は脳梗塞で沈黙のまま死去。光と闇の戦後政治家。"
},
{"id":"kobayashi_ichizo","name":"小林一三","nameEn":"Ichizo Kobayashi","birth":1873,"death":1957,"country":"日本","field":"実業家・阪急電鉄創業者",
 "summary":"山梨の商家の子。三井銀行から私鉄経営に転身し、関西に「電鉄＋住宅地＋デパート＋宝塚歌劇」の都市開発モデルを発明。後の東急・西武など全国の私鉄経営の祖型を作った日本のディズニー。",
 "wikiTitle":"小林一三",
 "events":[
  {"year":1873,"age":0,"title":"山梨県韮崎市の商家に生まれる","detail":"母は出産で死去、父は彼の幼児期に蒸発。","tags":["loss"]},
  {"year":1893,"age":20,"title":"慶應義塾卒、三井銀行入行","detail":"15 年勤務して支店長候補に。","tags":[]},
  {"year":1907,"age":34,"title":"箕面有馬電気軌道（後の阪急）専務","detail":"赤字鉄道の再建に挑む。","tags":["restart"]},
  {"year":1910,"age":37,"title":"宝塚〜梅田開通、沿線住宅地分譲","detail":"電鉄が住宅地を作り客を生み出す自己生成型ビジネス、世界初。","tags":["breakthrough"]},
  {"year":1914,"age":41,"title":"宝塚少女歌劇開幕","detail":"沿線集客のための娯楽として始まり、現在の宝塚歌劇団に。","tags":["breakthrough"]},
  {"year":1929,"age":56,"title":"阪急百貨店オープン（梅田駅 ターミナルデパート）","detail":"ターミナル＋百貨店の世界初モデル。","tags":["approval"]},
  {"year":1957,"age":83,"title":"宝塚で死去","detail":"日本のディズニー（劇場・住宅・デパート統合都市）の発明者。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"乗る人がいないなら、乗る人を作ればいい。","source":"宝塚住宅地分譲時"},
  {"text":"清く正しく美しく。","source":"宝塚歌劇団のモットー"},
  {"text":"人の行く裏に道あり花の山。","source":"経営信条"}
 ],
 "lifeDigest":"阪急電鉄・東宝の創業者。「電鉄＋住宅地＋デパート＋歌劇」の沿線開発モデルを世界に先駆けて発明。宝塚歌劇団の生みの親。後の東急・西武・関東私鉄すべての祖型。"
},
{"id":"niels_bohr","name":"ニールス・ボーア","nameEn":"Niels Bohr","birth":1885,"death":1962,"country":"デンマーク","field":"物理学者",
 "summary":"原子模型で量子の概念を物理学に持ち込んだ 20 世紀物理の巨匠。コペンハーゲン解釈で量子力学を確立、アインシュタインと『神はサイコロを振らない』論争を 30 年続けた。第二次大戦中はユダヤ人として亡命しマンハッタン計画にも参加。",
 "wikiTitle":"ニールス・ボーア",
 "events":[
  {"year":1885,"age":0,"title":"コペンハーゲンの教養家庭に生まれる","detail":"父は生理学者、母はユダヤ系銀行家家系。","tags":[]},
  {"year":1913,"age":28,"title":"ボーア原子模型を発表","detail":"電子が量子化された軌道を持つ。20 世紀物理の出発点。","tags":["breakthrough"]},
  {"year":1922,"age":37,"title":"ノーベル物理学賞","detail":"原子構造と放射の研究。","tags":["approval"]},
  {"year":1927,"age":42,"title":"コペンハーゲン解釈確立","detail":"ハイゼンベルクと共に量子力学の標準解釈を提示。","tags":["breakthrough"]},
  {"year":1943,"age":58,"title":"ナチス占領下のデンマークから決死の脱出","detail":"小舟でスウェーデンへ。後にロンドン・ロスアラモスへ。","tags":["loss","restart"]},
  {"year":1962,"age":77,"title":"コペンハーゲンで死去","detail":"研究所は今も「ボーア研究所」。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"反対は対立、深い真理の反対も真理である。","source":"哲学的省察"},
  {"text":"私たちが量子力学を理解しているなら、量子力学を理解していないことになる。","source":"晩年"},
  {"text":"予測は難しい。特に未来については。","source":"伝"}
 ],
 "lifeDigest":"デンマークの物理学者。原子模型と量子力学コペンハーゲン解釈で 20 世紀物理学の主柱を建てた。アインシュタインとの 30 年論争「神はサイコロを振らない」は科学史の金字塔。"
},
{"id":"dirac","name":"ポール・ディラック","nameEn":"Paul Dirac","birth":1902,"death":1984,"country":"イギリス","field":"理論物理学者",
 "summary":"イギリス・ブリストル生まれ、極端な無口と数学的美意識で量子力学・相対性理論を統合した 20 世紀物理の天才。陽電子の予言、ディラック方程式で 31 歳でノーベル賞。「数学が美しければ物理は正しい」を信念とした。",
 "wikiTitle":"ポール・ディラック",
 "events":[
  {"year":1902,"age":0,"title":"ブリストルで生まれる","detail":"父はスイス人移民の厳格な教師。家庭での会話はフランス語のみ強制された。","tags":["isolation"]},
  {"year":1923,"age":21,"title":"ケンブリッジで博士課程","detail":"電気工学から数学・物理へ転身。","tags":["restart"]},
  {"year":1928,"age":26,"title":"ディラック方程式発表","detail":"電子に対する相対論的量子力学方程式。陽電子（反物質）の存在を予言。","tags":["breakthrough"]},
  {"year":1933,"age":31,"title":"ノーベル物理学賞","detail":"シュレーディンガーと共同。31 歳での受賞は物理学史最年少クラス。","tags":["approval","breakthrough"]},
  {"year":1932,"age":30,"title":"ケンブリッジ大学ルーカス教授就任","detail":"ニュートンの後継。","tags":["approval"]},
  {"year":1984,"age":82,"title":"フロリダ州タラハシーで死去","detail":"フロリダ州立大に晩年所属。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"物理学の方程式は美しくなければならない。","source":"哲学"},
  {"text":"言葉は物理学を曖昧にする。私は方程式で考える。","source":"インタビュー"},
  {"text":"科学は宗教である。違いは、宗教は希望を、科学は知識を与えることだ。","source":"晩年"}
 ],
 "lifeDigest":"イギリスの理論物理学者。極端な無口・数学的美意識で量子力学を一段高みへ引き上げた天才。ディラック方程式で陽電子（反物質）を予言し、31 歳でノーベル賞。アインシュタインが『神聖な狂気の人』と呼んだ。"
},
{"id":"crick","name":"フランシス・クリック","nameEn":"Francis Crick","birth":1916,"death":2004,"country":"イギリス","field":"分子生物学者",
 "summary":"物理学者から生物学に転身、ジェームズ・ワトソンと共に DNA 二重らせん構造を解明。「生命とは情報である」という分子生物学の核心を作った。1962 年ノーベル医学生理学賞。",
 "wikiTitle":"フランシス・クリック",
 "events":[
  {"year":1916,"age":0,"title":"イギリス・ノーサンプトンで生まれる","detail":"靴職人の家。","tags":[]},
  {"year":1949,"age":33,"title":"ケンブリッジ・キャヴェンディッシュ研究所で生物学に転向","detail":"物理学博士課程を中断し、X 線結晶解析で生体分子を研究。","tags":["restart"]},
  {"year":1953,"age":36,"title":"DNA 二重らせん構造の解明","detail":"ジェームズ・ワトソン・ロザリンド・フランクリンの X 線写真をもとに 4 月『Nature』論文。","tags":["breakthrough"]},
  {"year":1962,"age":46,"title":"ノーベル医学生理学賞","detail":"ワトソン・ウィルキンスと共同受賞。","tags":["approval"]},
  {"year":1976,"age":60,"title":"アメリカへ移住、神経科学へ転身","detail":"ソーク研究所で意識・記憶研究。","tags":["restart"]},
  {"year":2004,"age":88,"title":"カリフォルニア・ラホヤで大腸癌で死去","detail":"","tags":["loss"]}
 ],
 "quotes":[
  {"text":"我々は生命の秘密を発見した。","source":"DNA 構造発表時 1953"},
  {"text":"生命は分子である。","source":"分子生物学宣言"},
  {"text":"人間の魂もまた、ニューロンと分子の集まりにすぎない。","source":"『驚くべき仮説』"}
 ],
 "lifeDigest":"イギリスの分子生物学者。物理学から転身し、ジェームズ・ワトソンと DNA 二重らせん構造を解明（1953）。生命の遺伝情報メカニズムを物理化学に還元、「生命とは情報である」という現代生物学の核を作った。"
},
{"id":"watson_dna","name":"ジェームズ・ワトソン","nameEn":"James Watson","birth":1928,"death":None,"country":"アメリカ","field":"分子生物学者",
 "summary":"15 歳でシカゴ大学に入学した神童、25 歳でフランシス・クリックと DNA 二重らせん構造を発表、34 歳でノーベル賞。後年は人種差別発言で公職を失う波乱含みの世紀の科学者。",
 "wikiTitle":"ジェームズ・ワトソン",
 "events":[
  {"year":1928,"age":0,"title":"シカゴで生まれる","detail":"鳥類学を愛する少年。","tags":[]},
  {"year":1943,"age":15,"title":"シカゴ大学入学（飛び級）","detail":"動物学専攻。","tags":[]},
  {"year":1951,"age":23,"title":"ケンブリッジ・キャヴェンディッシュ研究所へ","detail":"クリックと意気投合。","tags":["restart"]},
  {"year":1953,"age":25,"title":"DNA 二重らせん構造発表","detail":"4 月『Nature』論文、ロザリンド・フランクリンの X 線写真がカギ。","tags":["breakthrough"]},
  {"year":1962,"age":34,"title":"ノーベル医学生理学賞","detail":"クリック・ウィルキンスと共同。","tags":["approval"]},
  {"year":1968,"age":40,"title":"『二重らせん』刊行","detail":"科学者の競争・嫉妬・ロザリンド・フランクリンへの不当な扱いを暴露した自伝。","tags":["breakthrough"]},
  {"year":2007,"age":79,"title":"人種差別発言で全公職停止","detail":"「黒人の知能は遺伝的に低い」発言が世界的に非難。コールド・スプリング・ハーバー研究所長を解任。","tags":["loss","pride_broken"]}
 ],
 "quotes":[
  {"text":"運は備えのある精神に味方する（パスツールから）。","source":"『二重らせん』"},
  {"text":"科学は競争である。最初に発見した者だけが残る。","source":"自伝"}
 ],
 "lifeDigest":"アメリカの分子生物学者。25 歳でクリックと DNA 構造を解明、34 歳でノーベル賞。後年は人種差別発言でメダルまで売却する晩節を汚した複雑な人物。生物学を遺伝子の世紀へ押し上げた功績は揺るがない。"
},
{"id":"lovelace","name":"エイダ・ラブレス","nameEn":"Ada Lovelace","birth":1815,"death":1852,"country":"イギリス","field":"数学者・コンピュータの予言者",
 "summary":"詩人バイロン卿の娘。母の指導で数学・科学を学び、19 世紀にチャールズ・バベッジの解析機関のために世界初のコンピュータプログラムを書いた。「コンピュータが詩を書ける」と最初に予言した詩人＝数学者。",
 "wikiTitle":"エイダ・ラブレス",
 "events":[
  {"year":1815,"age":0,"title":"ロンドンで生まれる","detail":"父は詩人バイロン卿、両親は彼女が 1 歳のとき離別、父とは生涯会わず。","tags":["loss"]},
  {"year":1833,"age":17,"title":"チャールズ・バベッジに出会う","detail":"夜会で彼の差分機関を見て夢中に。","tags":["breakthrough"]},
  {"year":1843,"age":27,"title":"解析機関の翻訳・注釈刊行","detail":"イタリア人技師の解析機関論文を翻訳、自分の注釈（ノート G）にベルヌーイ数を計算する世界初のアルゴリズムを記述。","tags":["breakthrough","approval"]},
  {"year":1850,"age":35,"title":"競馬で多額の負債、晩年は孤独","detail":"競馬・社交スキャンダル・夫の冷遇。","tags":["loss","isolation"]},
  {"year":1852,"age":36,"title":"子宮癌で死去","detail":"父バイロンと同じ 36 歳で。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"解析機関は織機が花や葉を織るように、代数的なパターンを織る。","source":"ノート G 1843"},
  {"text":"想像力こそ、新しい世界を発見する力である。","source":"日記"},
  {"text":"私は単なる数学者ではない。詩的科学の使徒である。","source":"母への手紙"}
 ],
 "lifeDigest":"19 世紀イギリスの数学者・詩人バイロン卿の娘。チャールズ・バベッジの解析機関のために世界初のコンピュータプログラム（ベルヌーイ数アルゴリズム）を書いた『最初のプログラマ』。プログラミング言語 Ada は彼女の名から。"
},
{"id":"shannon","name":"クロード・シャノン","nameEn":"Claude Shannon","birth":1916,"death":2001,"country":"アメリカ","field":"数学者・情報理論の父",
 "summary":"ミシガン大学で電気工学・数学を学び、MIT 大学院で『リレー回路でブール代数を実装できる』ことを修士論文で証明、デジタル回路設計の基盤を作った。1948 年『通信の数学的理論』で情報＝ビット概念を確立、20 世紀情報革命の理論的父祖。",
 "wikiTitle":"クロード・シャノン",
 "events":[
  {"year":1916,"age":0,"title":"ミシガン州ペトスキーで生まれる","detail":"父は実業家、母は校長。エジソンの遠縁。","tags":[]},
  {"year":1937,"age":21,"title":"MIT 修士論文 — リレー回路 = ブール代数","detail":"21 歳の論文で全デジタル回路設計の理論的基盤を作る。「20 世紀最も影響力のある修士論文」。","tags":["breakthrough"]},
  {"year":1948,"age":32,"title":"『通信の数学的理論』発表","detail":"情報 = ビット概念、エントロピー定義、誤り訂正符号の理論基盤。情報革命の起点。","tags":["breakthrough","approval"]},
  {"year":1950,"age":34,"title":"チェス・プレイ・コンピュータの論文","detail":"AI と機械学習の理論的種をまく。","tags":[]},
  {"year":1956,"age":40,"title":"MIT 教授就任","detail":"晩年はジャグリング・一輪車・蒸気機関の趣味に没頭。","tags":[]},
  {"year":2001,"age":84,"title":"アルツハイマー病でマサチューセッツで死去","detail":"","tags":["loss"]}
 ],
 "quotes":[
  {"text":"情報とは、不確実性の減少である。","source":"『通信の数学的理論』 1948"},
  {"text":"私は研究のためでなく、面白いから研究する。","source":"インタビュー"},
  {"text":"あなたが何を解こうとしているかを書け。それだけで半分解けている。","source":"研究論"}
 ],
 "lifeDigest":"アメリカの数学者・電気工学者。21 歳の修士論文でデジタル回路設計の基盤を作り、32 歳の論文『通信の数学的理論』で情報＝ビット概念を確立、20 世紀情報革命の理論的父祖となった。"
},
{"id":"planck","name":"マックス・プランク","nameEn":"Max Planck","birth":1858,"death":1947,"country":"ドイツ","field":"理論物理学者",
 "summary":"ドイツのキール出身。黒体放射の問題を解くために『エネルギーが量子化されている』と仮定（1900）、量子論の幕を開けた。本人は『絶望的な行為』と呼んだ仮説が 20 世紀物理学の革命となった。",
 "wikiTitle":"マックス・プランク",
 "events":[
  {"year":1858,"age":0,"title":"ドイツ・キールで生まれる","detail":"代々の法学者・神学者の家系。","tags":[]},
  {"year":1900,"age":42,"title":"黒体放射の量子仮説発表","detail":"12 月 14 日、エネルギーが連続でなく離散的（量子）と仮定。20 世紀物理の起点。","tags":["breakthrough"]},
  {"year":1918,"age":60,"title":"ノーベル物理学賞","detail":"量子論の創始。","tags":["approval"]},
  {"year":1933,"age":75,"title":"ナチス政権下でドイツに残る","detail":"アインシュタインら亡命者と異なり国内残留、しかし反ナチを貫く。","tags":["isolation"]},
  {"year":1945,"age":87,"title":"次男エルヴィンをヒトラー暗殺計画関与で処刑","detail":"4 人の子供のうち最後の希望を失う。","tags":["loss"]},
  {"year":1947,"age":89,"title":"ゲッティンゲンで死去","detail":"研究所は『マックス・プランク研究所』として存続。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"新しい科学的真理は反対者を説得して勝利するのではない。反対者が死んで新世代が真理に慣れ親しむことで勝利する。","source":"自伝 1948"},
  {"text":"私の量子仮説は絶望的な行為であった。","source":"回想"},
  {"text":"科学者にとって、宗教の発見と同じくらい謙虚さが必要である。","source":"晩年"}
 ],
 "lifeDigest":"ドイツの理論物理学者。1900 年のエネルギー量子仮説で 20 世紀物理学を起こした量子論の創始者。子供 4 人を全て失う悲劇に耐え、ナチス時代もドイツに残り反ナチを貫いた科学者倫理の象徴。"
},
{"id":"hopper_grace","name":"グレース・ホッパー","nameEn":"Grace Hopper","birth":1906,"death":1992,"country":"アメリカ","field":"計算機科学者・米海軍少将",
 "summary":"イェール大数学博士、第二次大戦中に海軍予備役入り、Mark I 計算機のプログラマに。世界最初のコンパイラを開発、COBOL 言語の母として商用ソフトウェアの基盤を作った。海軍少将で 80 歳まで現役。",
 "wikiTitle":"グレース・ホッパー",
 "events":[
  {"year":1906,"age":0,"title":"ニューヨークで生まれる","detail":"幼少時から目覚ましの分解修理で機械好き。","tags":[]},
  {"year":1934,"age":28,"title":"イェール大学数学博士","detail":"女性数学博士は当時極めて稀。","tags":[]},
  {"year":1943,"age":37,"title":"海軍予備役入り、Mark I 計算機のプログラマに","detail":"ハーバード大での 5 トン計算機。","tags":["restart"]},
  {"year":1947,"age":41,"title":"「コンピュータバグ」の語源を作る","detail":"Mark II の中に蛾を発見、ログに『First actual case of bug being found』と書いた。","tags":["breakthrough"]},
  {"year":1952,"age":46,"title":"世界初のコンパイラ A-0 を開発","detail":"プログラマが英語に近い命令でコードを書ける道を開く。","tags":["breakthrough"]},
  {"year":1959,"age":53,"title":"COBOL 言語策定","detail":"商用ソフト・銀行・行政システムの 50 年支柱。","tags":["approval"]},
  {"year":1985,"age":79,"title":"米海軍少将に昇進（女性最年長）","detail":"80 歳で退役、退役式に大統領出席。","tags":["approval"]},
  {"year":1992,"age":85,"title":"アーリントンで死去","detail":"国葬。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"許可を求めるより許しを請う方がやさしい。","source":"口癖"},
  {"text":"『これまでそうしてきた』ほど危険な言葉はない。","source":"演説"},
  {"text":"船は港にいる時最も安全だが、それは船の目的ではない。","source":"演説"}
 ],
 "lifeDigest":"アメリカ海軍少将・計算機科学者。世界初のコンパイラ開発と COBOL 策定で商用ソフトの基盤を作った。「許可より許し」を口癖に 80 歳まで現役、退役後も IT 業界に影響を残した『コンピュータの祖母』。"
},
{"id":"misora_hibari","name":"美空ひばり","nameEn":"Hibari Misora","birth":1937,"death":1989,"country":"日本","field":"歌手・女優",
 "summary":"横浜・滝頭の魚屋に生まれ、9 歳でデビュー、12 歳で『悲しき口笛』が大ヒット。歌・映画・人気で戦後昭和を象徴した『歌姫』。1500 曲超を歌い、52 歳で間質性肺炎で逝去、女性初の国民栄誉賞。",
 "wikiTitle":"美空ひばり",
 "events":[
  {"year":1937,"age":0,"title":"横浜・滝頭の魚屋に生まれる","detail":"本名 加藤和枝。","tags":[]},
  {"year":1946,"age":9,"title":"のど自慢で優勝、デビュー","detail":"母の懸命な売り込みで天才少女歌手として全国へ。","tags":["restart"]},
  {"year":1949,"age":12,"title":"『悲しき口笛』大ヒット","detail":"映画主題歌、戦後の混乱の中での希望の歌に。","tags":["breakthrough"]},
  {"year":1957,"age":20,"title":"塩酸事件 — 浅草国際劇場で塩酸を浴びせられる","detail":"嫉妬したファンの女性に襲撃される。顔の傷は薄く回復。","tags":["loss"]},
  {"year":1986,"age":49,"title":"大病から復活、東京ドーム公演","detail":"『不死鳥コンサート』、5 万人を魅了。","tags":["restart","approval"]},
  {"year":1989,"age":52,"title":"間質性肺炎で逝去","detail":"昭和最後の年、昭和そのものを象徴する死。","tags":["loss"]},
  {"year":1989,"age":52,"title":"女性初の国民栄誉賞","detail":"死後追贈。","tags":["approval"]}
 ],
 "quotes":[
  {"text":"歌は私の命です。","source":"晩年のコンサート"},
  {"text":"川の流れのように、ゆるやかに、いくつもの時代は過ぎて。","source":"『川の流れのように』 1989"},
  {"text":"私は歌う機械じゃありません。歌を生きる人間です。","source":"インタビュー"}
 ],
 "lifeDigest":"昭和を代表する歌手・女優。9 歳でデビュー、戦後の希望から昭和最後の象徴まで 1500 曲超を歌い続けた『歌姫』。塩酸事件・大病など波乱を乗り越え、52 歳で世を去る前夜まで歌った。女性初の国民栄誉賞。"
},
{"id":"ichikawa_fusae","name":"市川房枝","nameEn":"Fusae Ichikawa","birth":1893,"death":1981,"country":"日本","field":"婦人運動家・政治家",
 "summary":"愛知の貧農の家に生まれ、教師を経て婦人参政権獲得運動に身を投じた『戦後民主主義の母』。50 歳で参議院議員に当選、87 歳まで議員を勤めながら『金のかからない選挙』を実践した日本フェミニズム史最大の人物。",
 "wikiTitle":"市川房枝",
 "events":[
  {"year":1893,"age":0,"title":"愛知県中島郡明知村の農家に生まれる","detail":"5 歳から農作業手伝い。","tags":[]},
  {"year":1918,"age":25,"title":"労働運動・婦人運動に入る","detail":"友愛会婦人部書記。","tags":["restart"]},
  {"year":1920,"age":27,"title":"新婦人協会を平塚らいてうらと結成","detail":"治安警察法第 5 条改正運動 — 女性の政治集会参加を解禁。","tags":["breakthrough"]},
  {"year":1921,"age":28,"title":"アメリカ留学（2 年半）","detail":"アリス・ポール、ヘレン・ケラーらと交流。","tags":[]},
  {"year":1945,"age":52,"title":"終戦・婦人参政権獲得","detail":"GHQ の指示と運動の長年の蓄積で実現。","tags":["approval","breakthrough"]},
  {"year":1953,"age":60,"title":"参議院議員初当選 — 60 歳の新人議員","detail":"全国区無所属。以降 5 期当選。","tags":["restart"]},
  {"year":1981,"age":87,"title":"参議院議員のまま死去","detail":"葬儀は質素を遺言、選挙運動費 0 円の『金のかからない選挙』が選挙史の伝説。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"金のかからない選挙、汚れた政治の追放。","source":"選挙標語"},
  {"text":"婦人の地位は、婦人自身がつくるもの。","source":"演説"},
  {"text":"私は政党に入らない。私は良心に従う。","source":"無所属の理由"}
 ],
 "lifeDigest":"日本のフェミニスト・参議院議員。婦人参政権獲得運動の中心人物として戦前戦後を通じて活動、60 歳で参議院議員初当選、87 歳まで現役。『金のかからない選挙』を実践した日本政治の良心。"
},
{"id":"hojo_masako","name":"北条政子","nameEn":"Hojo Masako","birth":1157,"death":1225,"country":"日本（鎌倉）","field":"鎌倉幕府初代将軍源頼朝の正室・尼将軍",
 "summary":"伊豆の北条家の娘。流人源頼朝と恋に落ちて結婚、頼朝の挙兵を支え鎌倉幕府成立を導いた。頼朝の死後は『尼将軍』として 3 度の幕府危機を乗り切り、承久の乱では肉声で御家人を結束させた日本史最大の女傑。",
 "wikiTitle":"北条政子",
 "events":[
  {"year":1157,"age":0,"title":"伊豆国の北条時政の長女として生まれる","detail":"","tags":[]},
  {"year":1177,"age":20,"title":"伊豆流人の源頼朝と駆け落ち結婚","detail":"父の反対を押し切って雨の夜に駆け落ち。","tags":["restart"]},
  {"year":1180,"age":23,"title":"頼朝挙兵、鎌倉幕府の事実上の創設","detail":"政子は頼朝の戦略を支える。","tags":["breakthrough"]},
  {"year":1199,"age":42,"title":"頼朝死去、出家して尼将軍に","detail":"以降、北条家による執権政治の中枢に。","tags":["loss","restart"]},
  {"year":1203,"age":46,"title":"長男頼家を出家させて将軍解任、暗殺","detail":"次男実朝を将軍に。母として子を切る決断。","tags":["self_denial","loss"]},
  {"year":1219,"age":62,"title":"次男実朝も暗殺","detail":"3 代目将軍が公暁により暗殺。","tags":["loss"]},
  {"year":1221,"age":64,"title":"承久の乱で御家人を演説で結束","detail":"後鳥羽上皇の挙兵に対し『最後の言葉』演説で御家人を奮起させ幕府勝利。","tags":["breakthrough"]},
  {"year":1225,"age":68,"title":"鎌倉で死去","detail":"日本史最大の女性政治家。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"亡き右大将（頼朝）の御恩は、山より高く海より深い。","source":"承久の乱直前の演説 1221"},
  {"text":"我が子を切るのは、武家の安寧のためなり。","source":"頼家暗殺時"}
 ],
 "lifeDigest":"鎌倉幕府初代将軍源頼朝の正室、尼将軍。頼朝の挙兵を支えて幕府を成立させ、頼朝・頼家・実朝の死後は北条家による執権政治を主導。承久の乱の演説で武家政権を救った日本史最大の女傑。"
},
{"id":"kasuga_no_tsubone","name":"春日局","nameEn":"Kasuga no Tsubone","birth":1579,"death":1643,"country":"日本（戦国〜江戸）","field":"江戸幕府第3代将軍徳川家光の乳母",
 "summary":"明智光秀の重臣斎藤利三の娘として生まれ、本能寺の変で父処刑後苦難を味わう。徳川家康の三男秀忠の乳母選定で家光の乳母となり、家光将軍即位を実現、大奥の制度を確立した江戸初期最大の女性権力者。",
 "wikiTitle":"春日局",
 "events":[
  {"year":1579,"age":0,"title":"丹波で生まれる","detail":"本名 福。父は明智光秀の重臣斎藤利三。","tags":[]},
  {"year":1582,"age":3,"title":"本能寺の変、父斎藤利三処刑","detail":"明智一族として一族郎党失う。","tags":["loss","pride_broken"]},
  {"year":1604,"age":25,"title":"徳川家光（後の 3 代将軍）の乳母に","detail":"将軍家のおもらしを引き受ける。","tags":["restart"]},
  {"year":1623,"age":44,"title":"家光が将軍就任、奥御殿総取締に","detail":"大奥制度を確立、女性の最高権力者として君臨。","tags":["breakthrough","approval"]},
  {"year":1629,"age":50,"title":"後水尾天皇譲位の使者として参内","detail":"無位無官の女性が天皇に拝謁する異例。","tags":["approval"]},
  {"year":1643,"age":64,"title":"江戸城で死去","detail":"麟祥院に葬られる。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"女が政を支えてはならぬというは、男の傲りなり。","source":"伝（春日局逸話集）"},
 ],
 "lifeDigest":"江戸幕府 3 代将軍徳川家光の乳母。本能寺の変で処刑された明智光秀の重臣斎藤利三の娘。家光の将軍即位を画策し、大奥制度を確立した江戸初期最大の女性権力者。"
},
{"id":"tomoe_gozen","name":"巴御前","nameEn":"Tomoe Gozen","birth":1157,"death":1247,"country":"日本（平安末期）","field":"女武者・木曽義仲の側室",
 "summary":"信濃の中原氏の娘、源義仲（木曽義仲）の側室。武勇に優れ義仲の女武者として戦場に立った稀有な存在。義仲滅亡後の動向は伝説化、和田義盛の妻になったとの説も。",
 "wikiTitle":"巴御前",
 "events":[
  {"year":1157,"age":0,"title":"信濃国木曽谷で生まれる（伝）","detail":"中原兼遠の娘。","tags":[]},
  {"year":1180,"age":23,"title":"木曽義仲の挙兵に従軍","detail":"鎌倉武士に伍する女武者として戦場へ。","tags":["restart"]},
  {"year":1183,"age":26,"title":"倶利伽羅峠の戦いで活躍","detail":"平家の大軍を破った義仲軍の中核。","tags":["breakthrough"]},
  {"year":1184,"age":27,"title":"粟津の戦いで義仲戦死","detail":"巴は義仲の命で離脱、最後の戦いで首をひとつ取って退いた『平家物語』の場面。","tags":["loss"]},
  {"year":1247,"age":90,"title":"伝・尼として死去","detail":"史実は不明だが「90 歳で寂した」との伝承。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"巴は色白く髪長く、容顔まことに美麗なり。一方の大将としては悪所を落とし、難所をかけ降ろし、敵に向かいて少しも怯まず。","source":"『平家物語』巻九"}
 ],
 "lifeDigest":"平安末期の女武者。源義仲（木曽義仲）の側室として戦場に立ち、倶利伽羅峠など武勇を残した稀有な日本女性。『平家物語』に「色白く髪長く、容顔美麗、一方の大将」と描かれる伝説的存在。"
},
{"id":"tsuda_umeko","name":"津田梅子","nameEn":"Umeko Tsuda","birth":1864,"death":1929,"country":"日本","field":"教育者・女子英学塾（現津田塾大学）創立者",
 "summary":"6 歳で岩倉使節団と共にアメリカ留学、11 年滞在して帰国するも日本社会に馴染めず再渡米。日本女性の地位向上のため女子英学塾（現津田塾大学）を創立、明治の女子高等教育の母となった。",
 "wikiTitle":"津田梅子",
 "events":[
  {"year":1864,"age":0,"title":"江戸の旗本津田仙の次女として生まれる","detail":"父は近代農業の先駆者。","tags":[]},
  {"year":1871,"age":6,"title":"岩倉使節団に随行、アメリカへ","detail":"日本最初の女子留学生 5 人の最年少。","tags":["restart"]},
  {"year":1882,"age":17,"title":"11 年ぶりに帰国","detail":"日本語を忘れ、漢字も読めず、文化的孤立。","tags":["pride_broken","isolation"]},
  {"year":1889,"age":25,"title":"再渡米、ブリンマー大留学","detail":"生物学を学ぶ。","tags":["restart"]},
  {"year":1900,"age":36,"title":"女子英学塾（現津田塾大学）創立","detail":"麹町区五番町の借家から始まる、日本女子高等教育の起点。","tags":["breakthrough","approval"]},
  {"year":1929,"age":64,"title":"鎌倉で死去","detail":"津田塾大学はその後日本の女子高等教育の中心に。","tags":["loss"]}
 ],
 "quotes":[
  {"text":"All-round women（万能の女性）を作りたい。","source":"女子英学塾創立趣旨"},
  {"text":"教育がなければ自由はない。","source":"演説"},
 ],
 "lifeDigest":"明治の女子教育者。6 歳で岩倉使節団に随行アメリカ留学、11 年滞在後の帰国、再留学を経て女子英学塾（現津田塾大学）を創立。日本女子高等教育の母。2024 年から五千円札の顔。"
},
]

count = 0
for d in PEOPLE_DATA:
    path = PEOPLE / f'{d["id"]}.json'
    if path.exists():
        print(f'  [skip] already exists: {d["id"]}')
        continue
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(make(d), f, ensure_ascii=False, indent=2)
        f.write('\n')
    count += 1
    print('created:', d['id'])

print(f'\nTotal: {count}/{len(PEOPLE_DATA)} 人を作成しました')

# manifest 更新
with open(ROOT / 'data' / 'manifest.json', 'r', encoding='utf-8') as f:
    m = json.load(f)
added = 0
for d in PEOPLE_DATA:
    if d['id'] not in m['people']:
        m['people'].append(d['id'])
        added += 1
with open(ROOT / 'data' / 'manifest.json', 'w', encoding='utf-8') as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
print(f'manifest: total={len(m["people"])}, added={added}')
