# -*- coding: utf-8 -*-
"""映画・ドラマ・アニメに Amazon ASIN（DVD/Blu-ray）を追加"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PEOPLE = ROOT / "data" / "people"

# personId -> { title_substring: asin }
ASIN_MAP = {
    "chopin": {
        "愛情物語": "B00D3WJX9W",
        "別れの曲": "B07GRFXRHY",
    },
    "beethoven": {
        "不滅の恋": "B00I6G8NXS",
        "敬愛なるベートーヴェン": "B000VH7NJS",
    },
    "mozart": {
        "アマデウス": "B00006C3SI",
    },
    "bach": {
        "アンナ・マグダレーナ": "B0002ZR9MY",
    },
    "van_gogh": {
        "ゴッホ 最期の手紙": "B07CKWVW8V",
        "永遠の門": "B07P7WF3D5",
        "炎の人ゴッホ": "B000H0M7UU",
    },
    "picasso": {
        "ピカソ 天才の秘密": "B00005UUUD",
        "ミッドナイト・イン・パリ": "B009AKL4VY",
    },
    "einstein": {
        "ジーニアス": "B07K32YNZP",
        "IQ": "B000S5K3R8",
    },
    "curie": {
        "ラジウム・ガールズ": "B0874TT3DR",
        "キュリー夫人": "B0053CX8JM",
    },
    "freud": {
        "危険なメソッド": "B007VXEHMC",
    },
    "nietzsche": {
        "ニーチェの馬": "B006VEVY5M",
    },
    "leonardo": {
        "ダ・ヴィンチ・コード": "B000VVLJVM",
    },
    "soseki": {
        "夏目漱石の妻": "B01N9F8OPZ",
        "わが輩は猫である": "B00KZBT1QO",
    },
    "akutagawa": {
        "羅生門": "B000I60U0C",
    },
    "dazai_osamu": {
        "人間失格": "B07SLY7DGF",
        "ヴィヨンの妻": "B0029NVYBM",
    },
    "mishima_yukio": {
        "MISHIMA": "B07Y6MT9J1",
        "11.25自決": "B008D4TT0M",
    },
    "oda_nobunaga": {
        "麒麟がくる": "B089XB5QKZ",
        "信長協奏曲": "B00SMTFIH8",
        "影武者": "B003AS9IVA",
    },
    "toyotomi_hideyoshi": {
        "太閤記": "B005LWJGPQ",
        "関白秀吉": "B0002ZHGV2",
    },
    "tokugawa_ieyasu": {
        "どうする家康": "B0CCV5KJ62",
        "徳川家康": "B0002YJXLY",
    },
    "sakamoto_ryoma": {
        "龍馬伝": "B003VUO6P2",
        "竜馬がゆく": "B0002OSRGM",
    },
    "hijikata_toshizo": {
        "燃えよ剣": "B09MYWKCJ3",
        "新選組！": "B0002XQLSO",
    },
    "kondo_isami": {
        "新選組！": "B0002XQLSO",
    },
    "saigo_takamori": {
        "西郷どん": "B078TKXLQM",
        "ラスト サムライ": "B00AJGLKBM",
    },
    "sartre": {
        "ハンナ・アーレント": "B00IYT23BY",
    },
    "kant_hannah": {
        "ハンナ・アーレント": "B00IYT23BY",
    },
    "marx": {
        "マルクス・エンゲルス": "B079QBF6NZ",
    },
    "schumann": {
        "愛の調べ": "B00NC3JBTI",
        "ブラームスはお好き": "B0002EUBWM",
    },
    "socrates": {
        "ソクラテス": "B00JQNZNJW",
    },
    "wittgenstein": {
        "ヴィトゲンシュタイン": "B01KV5XL1Y",
    },
    "tchaikovsky": {
        "チャイコフスキーの妻": "B0BRRSL5FJ",
    },
    "rachmaninoff": {
        "ある愛の詩": "B0007VZ84C",
    }
}


def main():
    updated = 0
    total = 0
    for pid, mapping in ASIN_MAP.items():
        fp = PEOPLE / f"{pid}.json"
        if not fp.exists():
            continue
        d = json.loads(fp.read_text(encoding="utf-8"))
        media = d.get("media", [])
        changed = False
        for m in media:
            if m.get("asin"):
                continue
            title = m.get("title", "")
            for key, asin in mapping.items():
                if key in title:
                    m["asin"] = asin
                    total += 1
                    changed = True
                    break
        if changed:
            d["media"] = media
            fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
            updated += 1
            print(f"OK: {pid}")
    print(f"\n{updated}人・{total}件のASINを追加")


if __name__ == "__main__":
    main()
