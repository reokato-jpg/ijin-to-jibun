using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;

namespace IjinToJibun.Unity
{
    /// <summary>
    /// 美術館シーン（神話 / 戦国 共通）：
    /// - 多角形ホールを自動生成
    /// - 壁に絵画 Prefab を配置
    /// - Wikimedia Commons API で画像を実行時ロード
    /// </summary>
    [System.Serializable]
    public class ArtworkData
    {
        public string title;
        public string origin;
        public string imageUrl; // Wikimedia Special:FilePath URL
    }

    public class MuseumController : MonoBehaviour
    {
        [Header("Config")]
        public ArtworkData[] artworks;
        public GameObject paintingPrefab; // Painting.prefab
        public Material frameMaterial;
        public float radius = 16f;
        public float wallHeight = 6f;

        [Header("Sengoku tweaks")]
        public bool sengokuMode = false;
        public Material wallMaterialWa;    // 漆喰+縦格子
        public Material wallMaterialClassic;
        public GameObject lanternPrefab;   // 赤提灯

        void Start()
        {
            BuildHall();
            StartCoroutine(LoadAllPaintings());
        }

        void BuildHall()
        {
            int N = artworks.Length;
            float angleStep = (Mathf.PI * 2) / N;
            for (int i = 0; i < N; i++)
            {
                float a = i * angleStep;
                float nextA = (i + 1) * angleStep;
                float mx = (Mathf.Cos(a) + Mathf.Cos(nextA)) * 0.5f * radius;
                float mz = (Mathf.Sin(a) + Mathf.Sin(nextA)) * 0.5f * radius;

                // 壁
                var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
                wall.transform.parent = transform;
                wall.transform.position = new Vector3(mx, wallHeight / 2, mz);
                wall.transform.LookAt(new Vector3(0, wallHeight / 2, 0));
                float segLen = Vector3.Distance(
                    new Vector3(Mathf.Cos(a) * radius, 0, Mathf.Sin(a) * radius),
                    new Vector3(Mathf.Cos(nextA) * radius, 0, Mathf.Sin(nextA) * radius));
                wall.transform.localScale = new Vector3(segLen, wallHeight, 0.1f);
                wall.GetComponent<Renderer>().material =
                    sengokuMode ? wallMaterialWa : wallMaterialClassic;

                // 絵画
                if (paintingPrefab)
                {
                    var p = Instantiate(paintingPrefab, transform);
                    Vector3 inward = new Vector3(-(Mathf.Cos(a) + Mathf.Cos(nextA)) * 0.5f, 0, -(Mathf.Sin(a) + Mathf.Sin(nextA)) * 0.5f).normalized;
                    p.transform.position = new Vector3(mx, wallHeight * 0.5f + 0.3f, mz) + inward * 0.08f;
                    p.transform.LookAt(new Vector3(0, p.transform.position.y, 0));
                    p.GetComponent<PaintingLoader>()?.Init(artworks[i]);
                }

                // 和風の場合、壁に提灯
                if (sengokuMode && lanternPrefab && i % 2 == 0)
                {
                    var lt = Instantiate(lanternPrefab, transform);
                    lt.transform.position = new Vector3(mx * 0.9f, wallHeight - 1.3f, mz * 0.9f);
                }
            }

            // 床
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            floor.transform.parent = transform;
            floor.transform.position = Vector3.zero;
            floor.transform.localScale = new Vector3(radius * 2, 0.1f, radius * 2);
        }

        IEnumerator LoadAllPaintings()
        {
            // Wikimedia API 経由で thumburl 一括取得
            List<string> filenames = new List<string>();
            foreach (var a in artworks)
            {
                var fn = ExtractFilename(a.imageUrl);
                if (fn != null) filenames.Add("File:" + fn);
            }
            if (filenames.Count == 0) yield break;
            string titles = string.Join("|", filenames);
            string api = $"https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1024&titles={UnityWebRequest.EscapeURL(titles)}&origin=*";
            using (var req = UnityWebRequest.Get(api))
            {
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    // JSONパース（簡易: SimpleJSON推奨。ここでは Unity標準JsonUtilityが弱いのでString扱い省略）
                    Debug.Log("Commons API response: " + req.downloadHandler.text);
                    // PaintingLoader 側で個別にロードさせる（簡易）
                }
            }
        }

        string ExtractFilename(string url)
        {
            const string marker = "Special:FilePath/";
            int idx = url.IndexOf(marker);
            if (idx < 0) return null;
            string s = url.Substring(idx + marker.Length);
            int q = s.IndexOf('?');
            if (q > 0) s = s.Substring(0, q);
            return UnityWebRequest.UnEscapeURL(s).Replace('_', ' ');
        }
    }
}
