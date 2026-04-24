using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace IjinToJibun.Unity
{
    /// <summary>
    /// 絵画Prefabに貼って使う。Init(artwork) で Wikimedia から画像をロード。
    /// </summary>
    [RequireComponent(typeof(MeshRenderer))]
    public class PaintingLoader : MonoBehaviour
    {
        public MeshRenderer targetRenderer; // 絵のplane
        public Transform frameRoot;
        ArtworkData _data;

        public void Init(ArtworkData data)
        {
            _data = data;
            StartCoroutine(LoadImage());
        }

        IEnumerator LoadImage()
        {
            if (_data == null || string.IsNullOrEmpty(_data.imageUrl)) yield break;

            // Wikimedia API 経由で直リンク解決
            string resolvedUrl = _data.imageUrl;
            string fn = ExtractFilename(_data.imageUrl);
            if (fn != null)
            {
                string api = $"https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1024&titles=File:{UnityWebRequest.EscapeURL(fn)}&origin=*";
                using (var apiReq = UnityWebRequest.Get(api))
                {
                    yield return apiReq.SendWebRequest();
                    if (apiReq.result == UnityWebRequest.Result.Success)
                    {
                        string json = apiReq.downloadHandler.text;
                        int thumbIdx = json.IndexOf("\"thumburl\":\"");
                        if (thumbIdx > 0)
                        {
                            int start = thumbIdx + 12;
                            int end = json.IndexOf("\"", start);
                            if (end > start)
                            {
                                string url = json.Substring(start, end - start).Replace("\\/", "/");
                                resolvedUrl = url;
                            }
                        }
                    }
                }
            }

            // 画像ダウンロード
            using (var req = UnityWebRequestTexture.GetTexture(resolvedUrl))
            {
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    var tex = DownloadHandlerTexture.GetContent(req);
                    if (targetRenderer && targetRenderer.material)
                    {
                        targetRenderer.material.mainTexture = tex;
                        // アスペクト比に合わせてplaneをスケール
                        float ar = (float)tex.width / tex.height;
                        var s = targetRenderer.transform.localScale;
                        if (ar > 1) s.y = s.x / ar;
                        else s.x = s.y * ar;
                        targetRenderer.transform.localScale = s;
                    }
                }
                else
                {
                    Debug.LogWarning($"Painting load failed: {_data.title} - {req.error}");
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
