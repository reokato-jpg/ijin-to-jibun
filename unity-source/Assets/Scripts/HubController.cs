using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace IjinToJibun.Unity
{
    /// <summary>
    /// ハブシーン：各世界（エデン・バベル・宇宙・美術館）への入り口。
    /// UI の各ボタンに OnClick → LoadScene(sceneName) を紐付ける。
    /// </summary>
    public class HubController : MonoBehaviour
    {
        [Header("シーン名")]
        public string cosmosScene = "01_Cosmos";
        public string edenScene = "02_Eden";
        public string babelScene = "03_Babel";
        public string museumMythScene = "04_Museum_Myth";
        public string museumSengokuScene = "05_Museum_Sengoku";

        [Header("UI Buttons (Inspector で紐付け)")]
        public Button btnCosmos;
        public Button btnEden;
        public Button btnBabel;
        public Button btnMuseumMyth;
        public Button btnMuseumSengoku;

        void Start()
        {
            btnCosmos?.onClick.AddListener(() => Load(cosmosScene));
            btnEden?.onClick.AddListener(() => Load(edenScene));
            btnBabel?.onClick.AddListener(() => Load(babelScene));
            btnMuseumMyth?.onClick.AddListener(() => Load(museumMythScene));
            btnMuseumSengoku?.onClick.AddListener(() => Load(museumSengokuScene));
        }

        void Load(string scene)
        {
            if (!string.IsNullOrEmpty(scene)) SceneManager.LoadScene(scene);
        }

        public void ReturnToWeb()
        {
            // WebGL ビルド時は親ウィンドウ（ijin-to-jibun.com）に戻す
#if UNITY_WEBGL && !UNITY_EDITOR
            Application.ExternalEval("window.parent.location.href = '/'");
#else
            SceneManager.LoadScene("00_Hub");
#endif
        }
    }
}
