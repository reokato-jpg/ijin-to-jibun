# -*- coding: utf-8 -*-
"""主要な作品に既知のYouTube IDを追加（未設定のみ上書きしない）"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

# personId -> { title_substring: youtubeId }
# title_substring は部分一致で判定
IDS = {
    "chopin": {
        "子守歌": "8CB0-EtTDFM",
        "スケルツォ": "Ot7Gfl30IFg",
        "マズルカ": "lf5pzLcGy8Y",
        "ポロネーズ": "Fk-JdNLEHds",
        "華麗なる大円舞曲": "wYpzAO9YMww",
    },
    "beethoven": {
        "第九": "t3217H8JppI",
        "第五": "fOk8Tm815lE",
        "第七": "MqaDw0A5nOM",
        "田園": "Qyws9upfb1A",
        "エリーゼ": "_mVW8tgGY_w",
        "悲愴": "SrcOcKYQX3c",
        "クロイツェル": "sxLgDTvpDV8",
        "大公": "Rdq8-v_dSi8",
    },
    "mozart": {
        "トルコ行進曲": "_vfUJxjS8K4",
        "魔笛": "yVmcF-Va9QA",
        "ピアノソナタ第11番": "_vfUJxjS8K4",
        "ピアノ協奏曲第20番": "i8N3cp_BWFI",
        "ピアノ協奏曲第23番": "9jWm0EexsvU",
        "交響曲第25番": "q-EHcfEp3Kg",
        "交響曲第41番": "h7OA_PJKONU",
        "アヴェ・ヴェルム": "SZYqAsnkKKM",
    },
    "bach": {
        "G線": "6JQm5aSjX6g",
        "主よ": "ZHl5BDbQDX4",
        "パッサカリア": "bpWQ7g19QYU",
        "半音階": "DtfkUs9-qDI",
        "チェンバロ協奏曲": "Ew2ssbJp5a0",
        "ブランデンブルク": "QY9CQTM-3OU",
        "イギリス組曲": "WMYyMFnuA30",
        "フランス組曲": "yDpMy0OBnxg",
    },
    "schubert": {
        "楽興の時": "wSitRkjisLo",
        "ピアノソナタ": "a3PLXECGQ1U",
        "弦楽四重奏": "pQZwPW_PFeY",
        "軍隊行進曲": "ikONKLYgh2A",
    },
    "schumann": {
        "クライスレリアーナ": "g0JVZJ0YRe8",
        "幻想曲": "qMV0MZtB3L8",
        "交響的練習曲": "Ipx3CHrcMkE",
        "ピアノ五重奏": "2J9itWSRONQ",
        "交響曲第1番": "w9IvYQZm-qQ",
        "交響曲第3番": "Y5e8hkOAWN0",
        "ミルテ": "NzLC4lpzz5E",
    },
    "brahms": {
        "ピアノ協奏曲第1番": "tMY2lHpJKEM",
        "ピアノ協奏曲第2番": "2HROIRQc5Y0",
        "交響曲第3番": "87f8DFVcBRI",
        "ラプソディ": "cRohQFdvtbk",
        "ピアノ五重奏": "h82xd5jiRvs",
        "間奏曲": "kPIXbZdXuc8",
    },
    "rachmaninoff": {
        "交響曲第2番": "YBSWxdmezVk",
        "前奏曲": "TqEiwxN6OYc",
        "エチュード": "yl3ddxRvBMI",
        "チェロソナタ": "1bWJb0dQBdA",
    },
    "debussy": {
        "亜麻色": "QrkcNtl1g8s",
        "ベルガマスク": "CvFH_6DNRCY",
        "子供の領分": "E3uaCe9cpZg",
        "前奏曲集": "KbhYWjF-ERg",
        "弦楽四重奏": "RMQxDHSRQ1Q",
    },
    "ravel": {
        "道化師": "fYJyLRpEoCU",
        "夜のガスパール": "qAQ5vLr-QhY",
        "ラ・ヴァルス": "5PMGA2fSkuY",
        "マ・メール・ロワ": "bqL5w6KMNaY",
        "鏡": "jTe3wpu9UNg",
    },
    "satie": {
        "ピカデリー": "OnLGqgdVdYw",
        "ソクラテス": "ab8hRz-3Py4",
        "ジュ・トゥ・ヴ": "WFwJdyTsKCA",
    },
    "mahler": {
        "交響曲第1番": "HmPD_fZZGzM",
        "交響曲第4番": "VBo0QzPGvYg",
        "交響曲第6番": "BNRj1HJ5u8I",
        "交響曲第10番": "NMQdYh3CkqE",
        "亡き子をしのぶ歌": "5RN0g6Qk2n8",
    },
    "tchaikovsky": {
        "交響曲第4番": "6OYjZ9MASqg",
        "交響曲第5番": "BjMO9_vOUQw",
        "1812年": "MCOBi3Bb5B8",
        "眠れる森": "cQC8Ga0B6s4",
        "ロココの主題": "nMF8yRhP7kg",
    },
    "wagner": {
        "ローエングリン": "JPg-OWTfNws",
        "パルジファル": "EFWE4-_Lxxs",
        "さまよえるオランダ人": "u7RYEbcwARk",
    },
    "verdi": {
        "椿姫": "2FmfZWjKUlE",
        "アイーダ": "blZUO2Jw6B0",
        "リゴレット": "pN1ZxiM2J5w",
        "ナブッコ": "2oB9aDHeEWs",
        "レクイエム": "o4Vh6DybDgA",
        "オテロ": "TC2GXabfP_E",
    },
    "puccini": {
        "ボエーム": "UYfhPDXLeDg",
        "トスカ": "_QT-SqeOu5Y",
        "蝶々夫人": "xpsZzZ6P5gI",
        "ある晴れた日": "WvuZJ19zVn8",
    },
    "stravinsky": {
        "火の鳥": "pXMGK8dvMnQ",
        "ペトルーシュカ": "6GqJLTeGZI0",
        "春の祭典": "EkwqPJZe8ms",
    },
    "liszt": {
        "愛の夢": "LdH1hSWGFGU",
        "メフィスト": "Dy94Sl6u99Y",
        "ハンガリー狂詩曲": "LdH1hSWGFGU",
        "巡礼の年": "d5d2EQYt6Zc",
        "前奏曲": "ULDCwmDBaJA",
    },
    "vivaldi": {
        "夏": "aFHPRi0ZeXE",
        "秋": "UGcLjTGOKBQ",
        "冬": "aFHPRi0ZeXE",
        "春": "mFWQgxXM_b8",
        "グローリア": "m2IcBsg-mNg",
    },
    "haydn": {
        "告別": "4w5oKj1OcyE",
        "時計": "GwDf9bwcmbw",
        "チェロ協奏曲第1番": "Q9_pQdJWhsU",
        "皇帝": "DoHVBmldN8Q",
    },
    "handel": {
        "アレルヤ": "IUZEtVbJT5c",
        "水上の音楽": "Lk-cHQvUWfI",
        "王宮": "NVbGOcKHSTk",
        "サラバンド": "jfGgSpUlkR4",
        "私を泣かせて": "DFLs6D0pzDs",
    },
    "mendelssohn": {
        "結婚行進曲": "4sHWJfnUKn8",
        "真夏の夜": "4sHWJfnUKn8",
        "スコットランド": "h7lNOnOV_l4",
        "フィンガル": "XHyUsGtcbrQ",
        "ピアノ協奏曲第1番": "-GkDFzcINew",
        "エリヤ": "yp8VmPDMXMw",
    },
    "sibelius": {
        "交響曲第2番": "CDZS-Uv0NpI",
        "交響曲第7番": "vvbJIAKRhZ0",
        "トゥオネラ": "5T2fiV34_3k",
        "タピオラ": "W0nf48vsIyQ",
        "悲しきワルツ": "jKU0rcvxXAE",
    },
    "prokofiev": {
        "古典": "3tsI00uPs2s",
        "ロメオ": "h0KnIhlOvYM",
        "ピアノ協奏曲第2番": "EAqPrF5lpUg",
        "ヴァイオリン協奏曲第2番": "KTOBmQjh8jo",
        "シンデレラ": "RXvrUAKNKVM",
    },
    "shostakovich": {
        "交響曲第10番": "pbKcndHAWlI",
        "交響曲第8番": "tEDs3W-HPsY",
        "交響曲第11番": "bVMb3_eDJkY",
        "ジャズ組曲": "fJE9DoTu1WQ",
        "チェロ協奏曲第1番": "IYhDsPYhQ4M",
    },
    "gershwin": {
        "サマータイム": "t6aiJlOZ1-A",
        "パリのアメリカ人": "2_lVylvm_w4",
        "ピアノ協奏曲": "ZtCPIOl6VDE",
    },
    "bartok": {
        "管弦楽のための": "I0jtt58DYxA",
        "ミクロコスモス": "V4V6iwOgMdE",
        "ルーマニア": "0MhMGBTDqEE",
        "青ひげ": "QxKEwJxhAnA",
    },
    "takemitsu": {
        "乱": "cIRmMKqWDl0",
        "ノヴェンバー": "SFBT8uXkGtI",
        "弦楽のためのレクイエム": "nDnS-gd9PPY",
    },
    "dutilleux": {
        "交響曲第1番": "KMFoZ40UxCM",
        "ピアノ・ソナタ": "YR9ybV_YAS8",
        "遥かなる遠い世界": "p0Jc2Hke-QY",
    }
}


def main():
    updated = 0
    total_added = 0
    for pid, mapping in IDS.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        works = d.get("works") or []
        changed = False
        for w in works:
            if w.get("youtubeId"):
                continue  # 既に設定済み
            title = w.get("title", "")
            for key, yt in mapping.items():
                if key in title:
                    w["youtubeId"] = yt
                    total_added += 1
                    changed = True
                    break
        if changed:
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            updated += 1
            print(f"OK: {pid} に YouTube ID 追加")
    print(f"\n{updated}人の作品に計 {total_added}件 のYouTube IDを追加")


if __name__ == "__main__":
    main()
