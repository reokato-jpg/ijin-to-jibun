using UnityEngine;

namespace IjinToJibun.Unity
{
    /// <summary>
    /// エデンシーン：
    /// - 浮島 Terrain / 生命の樹 Prefab（Assets/Prefabs/Tree_Eden.prefab）
    /// - 蛇が幹に巻き付く（SerpentWrap コンポーネント）
    /// - リンゴをタップすると「食べる？」ダイアログ
    /// - 蛍 / 花びら Particle System
    /// </summary>
    public class EdenController : MonoBehaviour
    {
        [Header("Refs")]
        public Transform tree;
        public Transform[] apples;
        public GameObject eatDialogPanel;
        public ParticleSystem fireflies;
        public ParticleSystem petals;

        [Header("Tuning")]
        public float appleDropGravity = -9.8f;
        public float appleShakeStrength = 0.2f;

        GameObject _focusedApple;
        Vector3[] _appleOrigins;
        Vector3[] _appleVel;
        bool[] _appleFallen;

        void Start()
        {
            if (eatDialogPanel) eatDialogPanel.SetActive(false);
            _appleOrigins = new Vector3[apples.Length];
            _appleVel = new Vector3[apples.Length];
            _appleFallen = new bool[apples.Length];
            for (int i = 0; i < apples.Length; i++)
                _appleOrigins[i] = apples[i].position;
        }

        void Update()
        {
            // 物理: 落下リンゴ
            for (int i = 0; i < apples.Length; i++)
            {
                if (_appleFallen[i]) continue;
                if (apples[i].position.y > _appleOrigins[i].y - 0.01f) continue; // まだ落ちていない
                _appleVel[i].y += appleDropGravity * Time.deltaTime;
                apples[i].position += _appleVel[i] * Time.deltaTime;
                apples[i].Rotate(Random.insideUnitSphere * 180f * Time.deltaTime);
                if (apples[i].position.y <= 0.3f)
                {
                    _appleFallen[i] = true;
                    var p = apples[i].position;
                    p.y = 0.3f;
                    apples[i].position = p;
                    _appleVel[i] = Vector3.zero;
                }
            }

            // タップ判定: カメラから Ray
            if (Input.GetMouseButtonDown(0))
            {
                var ray = Camera.main.ScreenPointToRay(Input.mousePosition);
                if (Physics.Raycast(ray, out var hit, 100f))
                {
                    if (hit.collider.CompareTag("Apple"))
                    {
                        int idx = System.Array.FindIndex(apples, a => a == hit.collider.transform);
                        if (idx >= 0 && _appleFallen[idx]) ShowEatDialog(idx);
                        else if (idx >= 0) DropApple(idx);
                    }
                    else if (hit.collider.CompareTag("Trunk"))
                    {
                        // 未落下のリンゴから1つ選んで落とす
                        for (int i = 0; i < apples.Length; i++)
                            if (!_appleFallen[i] && _appleVel[i] == Vector3.zero)
                            {
                                DropApple(i);
                                break;
                            }
                        if (tree) tree.localPosition += Random.insideUnitSphere * appleShakeStrength;
                    }
                }
            }
        }

        void DropApple(int i)
        {
            _appleVel[i] = new Vector3(Random.Range(-0.2f, 0.2f), 0, Random.Range(-0.2f, 0.2f));
            apples[i].position -= Vector3.up * 0.02f; // 初速キック
        }

        void ShowEatDialog(int i)
        {
            _focusedApple = apples[i].gameObject;
            if (eatDialogPanel) eatDialogPanel.SetActive(true);
        }

        public void OnEatYes()
        {
            if (_focusedApple) _focusedApple.SetActive(false);
            if (eatDialogPanel) eatDialogPanel.SetActive(false);
            // TODO: 世界フラッシュ + メッセージ
        }

        public void OnEatNo()
        {
            if (eatDialogPanel) eatDialogPanel.SetActive(false);
        }
    }
}
