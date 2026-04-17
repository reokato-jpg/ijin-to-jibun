# -*- coding: utf-8 -*-
"""より多くの作品にYouTube IDを追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

IDS = {
    # 既存（追加のみ）
    "chopin": {
        "ノクターン": "9E6b3swbnWg",
        "幻想ポロネーズ": "qNUNEJgrR9w",
        "舟歌": "3yRzBYQvrYQ",
        "子守歌": "UwmDkGNm5Yw",
        "ピアノソナタ第2番": "j0x_20Ah-lY",
        "ピアノソナタ第3番": "mALrxZoTTnw",
    },
    "beethoven": {
        "交響曲第3番": "O16c5uIuoQM",
        "交響曲第6番": "Qyws9upfb1A",
        "交響曲第7番": "MqaDw0A5nOM",
        "ピアノ協奏曲第5番": "ZiPZ6REGQNQ",
        "ヴァイオリン協奏曲": "QkN1fi3WVro",
        "ラズモフスキー": "wWJpRfnqRH8",
        "大フーガ": "IvYSkNTn0Jo",
    },
    "mozart": {
        "レクイエム": "pSFBxOWrMNk",
        "ピアノソナタ第8番": "AeatUQgRMbY",
        "交響曲第40番": "JTc1mDieQI8",
        "交響曲第41番": "h7OA_PJKONU",
        "ドン・ジョヴァンニ": "3m1pF9UI_2E",
        "コジ・ファン・トゥッテ": "e13XxCv9SUQ",
    },
    "bach": {
        "ヨハネ受難曲": "pFTq_VA5o5U",
        "クリスマス・オラトリオ": "n-DMCdPX1Is",
        "無伴奏ヴァイオリン・ソナタ第1番": "ixwgolffNCg",
        "無伴奏ヴァイオリン・パルティータ第3番": "Z6m0R2hF-q0",
        "コーヒー・カンタータ": "4GOCOkPahnY",
    },
    "liszt": {
        "愛の夢第3番": "AZ1XajBCUxE",
        "超絶技巧練習曲第4番": "GPfYiN17nuU",
        "ハンガリー狂詩曲第6番": "gyjxmpBdRJc",
        "ピアノ協奏曲第1番": "Ew52IRbWFSA",
        "ダンテを読んで": "qI-lrZwNTUc",
    },
    "schubert": {
        "アヴェ・マリア": "2H7FM4Uwliw",
        "冬の旅": "CfRSt0lvpTo",
        "未完成": "4Gnh4eE-ghs",
        "ます": "gu-HnzRQeWc",
        "即興曲D899": "hfFtuvYSPM8",
        "さすらい人幻想曲": "0JlvkXfIwXY",
        "ピアノソナタ第21番": "i9fL_VUKVzQ",
    },
    "tchaikovsky": {
        "くるみ割り人形": "9cNQFB0TDfY",
        "白鳥の湖": "9cNQFB0TDfY",
        "ピアノ協奏曲第1番": "FlIBytuRw2A",
        "ヴァイオリン協奏曲": "2A_hNC98Iho",
        "悲愴": "zNpaOLFJj9s",
        "弦楽セレナーデ": "CogTSdhK8uE",
    },
    "debussy": {
        "月の光": "CvFH_6DNRCY",
        "牧神の午後": "wWWWgwAkaeo",
        "海": "1Os5PFkdFyE",
        "アラベスク": "ORzmDc7KcY0",
        "喜びの島": "QqZJwqAmVOs",
        "子供の領分": "E3uaCe9cpZg",
        "沈める寺": "c7xuqVOLbC0",
    },
    "brahms": {
        "交響曲第1番": "_YTIVqTc9YM",
        "交響曲第4番": "hYwNRx_G_aA",
        "ドイツ・レクイエム": "T7-GRG64bwY",
        "ヴァイオリン協奏曲": "KprLpfvu-8o",
        "ピアノ協奏曲第2番": "2HROIRQc5Y0",
        "ハンガリー舞曲": "Nzo3atXtm54",
        "間奏曲118": "kPIXbZdXuc8",
    },
    "rachmaninoff": {
        "ピアノ協奏曲第2番": "rEGOihjqO9w",
        "ピアノ協奏曲第3番": "XzC5oimCzrw",
        "パガニーニ": "Pt9RcpLvJOo",
        "前奏曲 嬰ハ短調": "TqEiwxN6OYc",
        "ヴォカリーズ": "ncktJGLfDbw",
        "交響曲第2番": "YBSWxdmezVk",
    },
    "debussy": {
        "月の光": "CvFH_6DNRCY",
        "ベルガマスク": "CvFH_6DNRCY",
    },
    "stravinsky": {
        "春の祭典": "EkwqPJZe8ms",
        "火の鳥": "pXMGK8dvMnQ",
        "ペトルーシュカ": "6GqJLTeGZI0",
        "プルチネッラ": "P_iOdtGDrw0",
    },
    "mahler": {
        "復活": "Sn6BjipdqpI",
        "第5番": "i5xT68Yw47U",
        "亡き子": "5RN0g6Qk2n8",
        "大地の歌": "7bQCzj2SG2w",
        "第9番": "OSyr4rtftM4",
        "第1番": "HmPD_fZZGzM",
        "第2番": "Sn6BjipdqpI",
        "第8番": "I38HxMx-o5g",
    },
    "satie": {
        "ジムノペディ": "S-Xm7s9eGxU",
        "グノシエンヌ": "2g5xkL4JEjc",
        "ジュ・トゥ・ヴ": "WFwJdyTsKCA",
        "ヴェクサシオン": "GeZKrDw7EZQ",
    },
    "ravel": {
        "ボレロ": "mBe6v_4g3xc",
        "亡き王女": "LKEbT9Z2uv0",
        "ピアノ協奏曲": "bLuE3OStE3c",
        "ダフニス": "BkPtaTQN_z4",
        "クープラン": "d_JsYnUb8lg",
        "水の戯れ": "1QWKoonvDnU",
    },
    "shostakovich": {
        "第5番": "Pa7vdLHZUlo",
        "第7番": "bTVlhYfdjFg",
        "ワルツ第2番": "fJE9DoTu1WQ",
        "弦楽四重奏第8番": "_P7FN4cQaf8",
    },
    "wagner": {
        "ワルキューレ": "P73Z6291Pt8",
        "トリスタン": "5i8iftr8SwE",
        "タンホイザー": "GkhCk_QfPXw",
        "マイスタージンガー": "lOqlGyzRI0Q",
    },
    "mendelssohn": {
        "ヴァイオリン協奏曲": "o1dBg__wsuo",
        "イタリア": "j4ib3uQ0fiQ",
        "真夏の夜": "4sHWJfnUKn8",
        "無言歌": "sG7uT4sSxWY",
        "エリヤ": "yp8VmPDMXMw",
    },
    "vivaldi": {
        "四季": "mFWQgxXM_b8",
        "グローリア": "m2IcBsg-mNg",
        "調和の霊感": "ZbI71vdRYm4",
    },
    "haydn": {
        "驚愕": "_t1dWJ5Vxlk",
        "告別": "4w5oKj1OcyE",
        "天地創造": "2jGy0pXc0PY",
        "トランペット": "cAwKWz5IcMY",
    },
    "handel": {
        "メサイア": "IUZEtVbJT5c",
        "水上": "Lk-cHQvUWfI",
        "王宮": "NVbGOcKHSTk",
        "リナルド": "DFLs6D0pzDs",
    },
    "scriabin": {
        "法悦": "Ybs4o4L38Do",
        "プロメテウス": "4t8jNqKeVK8",
        "ソナタ第5番": "_bCGdLdlFdk",
        "前奏曲": "8LCH1UJpNiE",
    },
    # 新規作曲家
    "grieg": {
        "ピアノ協奏曲": "-oS76E5zdo8",
        "ペール・ギュント": "kOrj02vjU88",
        "山の魔王": "xkrB6ZNJqrM",
        "ホルベルク": "7kUH3b1GPw0",
        "叙情小品集": "KCnJKwfvAoY",
    },
    "dvorak": {
        "新世界": "bNMT1-Rn1kQ",
        "チェロ協奏曲": "Q3zuxTqf0FU",
        "アメリカ": "o2qe10FDTS8",
        "スラヴ舞曲": "6EKXdYuqqTs",
        "ユモレスク": "7Ej4x-W91XU",
    },
    "smetana": {
        "モルダウ": "lJ-yOZyfacY",
        "我が祖国": "9-ZFpOoJtSA",
        "売られた花嫁": "n5IizcwFOoc",
        "わが生涯": "0H-E-SsdAhs",
    },
    "mussorgsky": {
        "展覧会の絵": "YOuRA4Wf2HQ",
        "ボリス": "zQD8CYtDiqE",
        "はげ山": "R3RF_3wMpF4",
    },
    "rimsky_korsakov": {
        "シェエラザード": "QoCqr2bK7OM",
        "熊蜂": "S8wuHvVoEQk",
        "スペイン": "LkgZHb5SjbM",
    },
    "saint_saens": {
        "オルガン付き": "HfRQacLN6u0",
        "動物の謝肉祭": "S2Vl_KlM_-Y",
        "死の舞踏": "YyknBTm_YyM",
        "ヴァイオリン協奏曲第3番": "PW6Bp7QmIAQ",
    },
    "faure": {
        "レクイエム": "BbODixvUrLw",
        "夢のあとに": "Xi_Q9wXJfqs",
        "パヴァーヌ": "dlbKHhNuBmI",
        "シチリアーノ": "yDKsE9WYX6c",
    },
    "berlioz": {
        "幻想": "sNg6q4uxyuI",
        "ロメオ": "v4zDaKkrRBw",
        "ラコッツィ": "nqCLd1xdDvg",
    },
    "respighi": {
        "ローマの松": "7v4nrTfyCUU",
        "ローマの噴水": "-SQ_LYdFZTQ",
        "ローマの祭": "3L7JlymQZLg",
    },
    "copland": {
        "アパラチア": "T_ON2eXYzzM",
        "ファンファーレ": "6oSeZZtNYEU",
        "ロデオ": "MEoJn5cmR80",
    },
    "bernstein": {
        "ウェスト・サイド": "A5jcZKnvWD8",
        "キャンディード": "ZUkpOuuiGVU",
        "ミサ曲": "PtJpC8b_fAQ",
    },
    "ryuichi_sakamoto": {
        "戦場": "gUbwQGj1w5w",
        "Energy Flow": "k0vXc1OmlPc",
        "アクア": "HoH3QIFeMkc",
    },
    "hisaishi": {
        "トトロ": "epPpXpu_2VY",
        "あの夏": "TL3oq_k0IRQ",
        "Summer": "YWgaf66mq1g",
        "ハウル": "i5J2dBWgFm4",
    },
    "palestrina": {
        "マルケルス": "CcXHZONL6ck",
        "シカット": "M49N1-VDZHo",
    }
}


def main():
    total = 0
    for pid, mapping in IDS.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        works = d.get("works") or []
        changed = False
        for w in works:
            if w.get("youtubeId"):
                continue
            title = w.get("title", "")
            for k, yt in mapping.items():
                if k in title:
                    w["youtubeId"] = yt
                    total += 1
                    changed = True
                    break
        if changed:
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"OK: {pid}")
    print(f"\n{total}件のYouTube IDを追加")


if __name__ == "__main__":
    main()
