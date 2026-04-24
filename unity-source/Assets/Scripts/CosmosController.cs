using UnityEngine;

namespace IjinToJibun.Unity
{
    /// <summary>
    /// 宇宙シーン：
    /// - 太陽 + 8惑星 + 月 + ブラックホール
    /// - URP の Bloom / Lens Flare を効かせる
    /// - three.js 版と同じコンステレーション
    /// </summary>
    public class CosmosController : MonoBehaviour
    {
        [System.Serializable]
        public class Planet
        {
            public string name;
            public Transform pivot;
            public float orbitRadius;
            public float orbitSpeed;
            public float selfSpin;
        }

        public Planet[] planets;
        public Transform sun;

        void Update()
        {
            float t = Time.time;
            foreach (var p in planets)
            {
                if (!p.pivot) continue;
                float a = t * p.orbitSpeed;
                p.pivot.position = new Vector3(Mathf.Cos(a) * p.orbitRadius, 0, Mathf.Sin(a) * p.orbitRadius);
                p.pivot.Rotate(0, p.selfSpin * Time.deltaTime * 60, 0);
            }
            if (sun) sun.Rotate(0, 2 * Time.deltaTime, 0);
        }
    }
}
