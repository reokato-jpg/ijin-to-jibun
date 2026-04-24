using System.Collections;
using UnityEngine;

namespace IjinToJibun.Unity
{
    /// <summary>
    /// バベルシーン：
    /// - 塔 Prefab（Assets/Prefabs/Tower_Babel.prefab）9段のziggurat
    /// - 螺旋スロープ沿いに歩ける（PlayerWalker）
    /// - 混乱ボタンで雷フラッシュ・言葉の文字が飛散
    /// </summary>
    public class BabelController : MonoBehaviour
    {
        [Header("Refs")]
        public Light flashLight;
        public Transform[] lightningBolts; // 3本のLineRenderer
        public Transform[] wordSprites;    // 周回する文字
        public GameObject confusionPanel;
        public Transform tower;

        [Header("Tuning")]
        public float wordOrbitSpeed = 0.15f;
        public float chaosPush = 0.4f;

        float[] _wordPhase;
        Vector3[] _wordBase;
        float[] _wordR;
        bool _chaos = false;
        Vector3[] _wordVel;

        void Start()
        {
            if (confusionPanel) confusionPanel.SetActive(false);
            _wordPhase = new float[wordSprites.Length];
            _wordBase = new Vector3[wordSprites.Length];
            _wordR = new float[wordSprites.Length];
            _wordVel = new Vector3[wordSprites.Length];
            for (int i = 0; i < wordSprites.Length; i++)
            {
                _wordPhase[i] = Random.value * Mathf.PI * 2;
                _wordBase[i] = wordSprites[i].position;
                _wordR[i] = new Vector2(wordSprites[i].position.x, wordSprites[i].position.z).magnitude;
            }
            if (flashLight) flashLight.intensity = 0;
        }

        void Update()
        {
            float t = Time.time;
            for (int i = 0; i < wordSprites.Length; i++)
            {
                if (_chaos)
                {
                    wordSprites[i].position += _wordVel[i] * Time.deltaTime;
                    _wordVel[i].y -= 0.5f * Time.deltaTime;
                }
                else
                {
                    float a = Mathf.Atan2(_wordBase[i].z, _wordBase[i].x) + t * wordOrbitSpeed;
                    Vector3 p = new Vector3(
                        Mathf.Cos(a) * _wordR[i],
                        _wordBase[i].y + Mathf.Sin(_wordPhase[i] + t * 2) * 0.3f,
                        Mathf.Sin(a) * _wordR[i]);
                    wordSprites[i].position = p;
                    wordSprites[i].LookAt(Camera.main.transform);
                }
            }
        }

        public void OnConfusionClick()
        {
            StartCoroutine(ConfusionSequence());
        }

        IEnumerator ConfusionSequence()
        {
            // 雷フラッシュ×3
            for (int k = 0; k < 3; k++)
            {
                if (flashLight) flashLight.intensity = 4;
                ShowBolts(true);
                yield return new WaitForSeconds(0.1f);
                if (flashLight) flashLight.intensity = 0;
                ShowBolts(false);
                yield return new WaitForSeconds(0.15f);
            }

            // 言葉を飛散
            _chaos = true;
            for (int i = 0; i < _wordVel.Length; i++)
                _wordVel[i] = new Vector3(Random.Range(-1f, 1f), Random.Range(-0.5f, 1f), Random.Range(-1f, 1f)) * chaosPush * 3;

            // メッセージ
            if (confusionPanel) confusionPanel.SetActive(true);
            yield return new WaitForSeconds(5f);
            if (confusionPanel) confusionPanel.SetActive(false);
        }

        void ShowBolts(bool on)
        {
            foreach (var b in lightningBolts)
                if (b) b.gameObject.SetActive(on);
        }
    }
}
