using UnityEngine;

namespace IjinToJibun.Unity
{
    /// <summary>
    /// 美術館・バベル共通のシンプルFPSコントローラ。
    /// - WASD/矢印 で移動
    /// - マウスドラッグ または タッチドラッグで視点
    /// - モバイル：左下の仮想スティックPrefabと連動
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerWalker : MonoBehaviour
    {
        public float walkSpeed = 3.5f;
        public float mouseSensitivity = 2f;
        public float gravity = -9.8f;
        public Transform cameraPivot;

        CharacterController _cc;
        float _pitch = 0;
        Vector2 _dragLast;
        bool _dragging = false;
        Vector3 _velocity;

        public Vector2 VirtualStick = Vector2.zero; // モバイル用外部入力

        void Start()
        {
            _cc = GetComponent<CharacterController>();
        }

        void Update()
        {
            // 視点
            if (Input.GetMouseButtonDown(0))
            {
                _dragging = true;
                _dragLast = Input.mousePosition;
            }
            if (Input.GetMouseButton(0) && _dragging)
            {
                Vector2 cur = Input.mousePosition;
                float dx = (cur.x - _dragLast.x) * mouseSensitivity * Time.deltaTime;
                float dy = (cur.y - _dragLast.y) * mouseSensitivity * Time.deltaTime;
                transform.Rotate(0, dx * 50, 0);
                _pitch = Mathf.Clamp(_pitch - dy * 50, -70, 70);
                if (cameraPivot) cameraPivot.localEulerAngles = new Vector3(_pitch, 0, 0);
                _dragLast = cur;
            }
            if (Input.GetMouseButtonUp(0)) _dragging = false;

            // 移動
            float fwd = Input.GetAxis("Vertical") + VirtualStick.y;
            float str = Input.GetAxis("Horizontal") + VirtualStick.x;
            Vector3 move = (transform.forward * fwd + transform.right * str) * walkSpeed;
            _velocity.y += gravity * Time.deltaTime;
            if (_cc.isGrounded && _velocity.y < 0) _velocity.y = -0.5f;
            move.y = _velocity.y;
            _cc.Move(move * Time.deltaTime);
        }
    }
}
