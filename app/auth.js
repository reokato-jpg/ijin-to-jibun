// ==================== Firebase認証＋同期 ====================
// 未設定でもアプリは通常動作（localStorageのみ）。
// natsumi の Firebase プロジェクトを設定すると、ログインしたユーザーは
// お気に入り・ルーティン・カスタムカテゴリなどが全端末で同期される。

// Firebase 設定
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBXGVMd29gucHn95sbqaQa6a5AFv4WJ5F4",
  authDomain: "ijin-to-jibun.firebaseapp.com",
  projectId: "ijin-to-jibun",
  storageBucket: "ijin-to-jibun.firebasestorage.app",
  messagingSenderId: "1083129327618",
  appId: "1:1083129327618:web:9fcaf9612e3843fef8f71b",
  measurementId: "G-QR29LVHLGV"
};

const FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";

// 同期対象のlocalStorageキー
const SYNC_KEYS = [
  'ijin_fav_people',
  'ijin_fav_events',
  'ijin_fav_quotes',
  'ijin_fav_routines',
  'ijin_fav_works',
  'ijin_my_routine',
  'ijin_user_name',
  'ijin_oshi_person',
  'ijin_custom_routine_cats',
  'ijin_notes',
  'ijin_diary',
  'ijin_likes',
  'ijin_liked_by_me',
  'ijin_comments',
];

let fbApp = null, fbAuth = null, fbDb = null;
let currentUser = null;
let authListeners = [];

function onAuthChange(cb) {
  authListeners.push(cb);
  // 現在の状態を即時通知
  cb(currentUser);
}
function emitAuth() {
  authListeners.forEach(cb => { try { cb(currentUser); } catch {} });
}

async function initFirebase() {
  if (!FIREBASE_ENABLED) {
    console.log('[auth] Firebase未設定: 端末内ストレージのみで動作します');
    emitAuth();
    return;
  }
  try {
    // Firebase v10 modular SDK (CDN経由で読み込み)
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const { getFirestore, doc, getDoc, setDoc } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    fbApp = initializeApp(FIREBASE_CONFIG);
    fbAuth = getAuth(fbApp);
    fbDb = getFirestore(fbApp);

    // 外から使えるようwindow経由で公開
    window.__fbLib = { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, doc, getDoc, setDoc };

    onAuthStateChanged(fbAuth, async (user) => {
      currentUser = user;
      if (user) {
        await pullFromCloud(user);
      }
      emitAuth();
      updateAccountUI();
    });
  } catch (err) {
    console.error('[auth] Firebase初期化失敗:', err);
    emitAuth();
  }
}

async function pullFromCloud(user) {
  try {
    const { doc, getDoc } = window.__fbLib;
    const snap = await getDoc(doc(fbDb, 'users', user.uid));
    if (snap.exists()) {
      const data = snap.data();
      // ローカルに未ログイン時の変更があればマージ（優先: 件数の多い方）
      SYNC_KEYS.forEach(k => {
        const cloudVal = data[k];
        let localVal = null;
        try { localVal = JSON.parse(localStorage.getItem(k) || 'null'); } catch {}
        if (cloudVal === undefined && localVal !== null) return; // ローカルのみ
        if (localVal === null) {
          if (cloudVal !== undefined) localStorage.setItem(k, JSON.stringify(cloudVal));
          return;
        }
        // 両方ある場合、配列や Set（お気に入り）はマージ
        if (Array.isArray(cloudVal) && Array.isArray(localVal)) {
          const merged = [...new Set([...cloudVal, ...localVal])];
          localStorage.setItem(k, JSON.stringify(merged));
        } else {
          // オブジェクトや他はクラウド優先
          localStorage.setItem(k, JSON.stringify(cloudVal !== undefined ? cloudVal : localVal));
        }
      });
      console.log('[auth] クラウドから同期完了');
      // マージした結果をクラウドへ書き戻し
      await pushToCloud(user);
    } else {
      // 初回ログイン → 端末のlocalStorageをクラウドへ
      await pushToCloud(user);
    }
    // 再描画をトリガー
    if (typeof window.renderHomeBooks === 'function') window.renderHomeBooks();
    if (typeof window.renderFavorites === 'function') window.renderFavorites();
    if (typeof window.renderPeople === 'function') window.renderPeople();
    if (typeof window.renderOshi === 'function') window.renderOshi();
  } catch (e) {
    console.error('[auth] pull失敗:', e);
  }
}

async function pushToCloud(user) {
  if (!user || !FIREBASE_ENABLED) return;
  try {
    const { doc, setDoc } = window.__fbLib;
    const data = {};
    SYNC_KEYS.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw !== null) {
        try { data[k] = JSON.parse(raw); } catch { data[k] = raw; }
      }
    });
    data.__updatedAt = new Date().toISOString();
    await setDoc(doc(fbDb, 'users', user.uid), data, { merge: true });
  } catch (e) {
    console.error('[auth] push失敗:', e);
  }
}

// localStorage.setItem を上書きして同期
function hookLocalStorage() {
  const origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    origSet.call(this, key, value);
    if (currentUser && FIREBASE_ENABLED && SYNC_KEYS.includes(key)) {
      // デバウンスして5秒以内の変更はまとめてpush
      clearTimeout(hookLocalStorage._t);
      hookLocalStorage._t = setTimeout(() => pushToCloud(currentUser), 2000);
    }
  };
}
hookLocalStorage();

// ==================== UI ====================
async function openLoginModal() {
  if (!FIREBASE_ENABLED) {
    alert('ログイン機能を使うには、Firebaseプロジェクトの設定が必要です。\n運営にお問い合わせください。');
    return;
  }
  const existing = document.getElementById('authModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-backdrop" data-close></div>
    <div class="auth-modal-panel">
      <button class="auth-modal-close" data-close>×</button>
      <div class="auth-head">
        <div class="auth-title">アカウント</div>
        <div class="auth-sub">登録すると、お気に入り・推し・ルーティンが<br>全ての端末で同期されます。</div>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab active" data-mode="login">ログイン</button>
        <button class="auth-tab" data-mode="register">新規登録</button>
      </div>
      <form class="auth-form" id="authForm">
        <label class="auth-label">メールアドレス
          <input type="email" name="email" required autocomplete="email">
        </label>
        <label class="auth-label">パスワード（6文字以上）
          <input type="password" name="password" required minlength="6" autocomplete="current-password">
        </label>
        <button type="submit" class="auth-submit">ログイン</button>
        <div class="auth-divider"><span>または</span></div>
        <button type="button" class="auth-google" id="authGoogle">
          <span class="auth-google-icon">G</span> Googleで続ける
        </button>
        <div class="auth-error" id="authError"></div>
        <div class="auth-footnote">登録せずに閉じても全機能使えます。登録するとそれらが保存されます。</div>
        <div class="auth-legal">
          登録は <a href="terms.html" target="_blank">利用規約</a> と <a href="privacy.html" target="_blank">プライバシーポリシー</a> に同意したものとみなします。
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  let mode = 'login';
  const form = modal.querySelector('#authForm');
  const err = modal.querySelector('#authError');
  const submit = modal.querySelector('.auth-submit');
  modal.querySelectorAll('.auth-tab').forEach(t => {
    t.addEventListener('click', () => {
      mode = t.dataset.mode;
      modal.querySelectorAll('.auth-tab').forEach(x => x.classList.toggle('active', x === t));
      submit.textContent = mode === 'login' ? 'ログイン' : '新規登録する';
    });
  });
  modal.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 200);
    });
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    const email = fd.get('email');
    const pw = fd.get('password');
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = window.__fbLib;
      if (mode === 'login') {
        await signInWithEmailAndPassword(fbAuth, email, pw);
      } else {
        await createUserWithEmailAndPassword(fbAuth, email, pw);
        // 新規ユーザーは現在のlocalStorageをクラウドにアップ
        setTimeout(() => currentUser && pushToCloud(currentUser), 500);
      }
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 200);
    } catch (ex) {
      err.textContent = humanizeAuthError(ex);
    }
  });
  modal.querySelector('#authGoogle').addEventListener('click', async () => {
    try {
      const { GoogleAuthProvider, signInWithPopup } = window.__fbLib;
      const provider = new GoogleAuthProvider();
      await signInWithPopup(fbAuth, provider);
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 200);
    } catch (ex) {
      err.textContent = humanizeAuthError(ex);
    }
  });
}

function humanizeAuthError(ex) {
  const code = ex?.code || '';
  const map = {
    'auth/invalid-email': 'メールアドレスの形式が正しくありません',
    'auth/email-already-in-use': 'このメールアドレスは既に使われています（ログインしてください）',
    'auth/weak-password': 'パスワードが弱すぎます（6文字以上）',
    'auth/wrong-password': 'パスワードが違います',
    'auth/user-not-found': 'このメールアドレスは登録されていません（新規登録してください）',
    'auth/too-many-requests': 'お試しが多すぎます。しばらくしてから再度お試しください',
    'auth/popup-closed-by-user': 'Googleログインがキャンセルされました',
  };
  return map[code] || `ログインできませんでした (${code || ex.message})`;
}

async function logout() {
  if (!FIREBASE_ENABLED || !fbAuth) return;
  try {
    const { signOut } = window.__fbLib;
    await signOut(fbAuth);
  } catch (e) { console.error(e); }
}

function updateAccountUI() {
  const badge = document.getElementById('accountBadge');
  if (!badge) return;
  if (currentUser) {
    const n = currentUser.displayName || currentUser.email?.split('@')[0] || 'ユーザー';
    badge.innerHTML = `<span class="acc-dot"></span><span class="acc-name">${escapeSmall(n)}</span>`;
    badge.classList.add('logged-in');
  } else {
    badge.innerHTML = `<span class="acc-icon">👤</span><span class="acc-name">ログイン</span>`;
    badge.classList.remove('logged-in');
  }
  updateLoginNotice();
}

// ログインしていない時だけ、ホームの上部に注意バナーを表示
function updateLoginNotice() {
  const existing = document.getElementById('loginNotice');
  if (currentUser) {
    if (existing) existing.remove();
    return;
  }
  if (!FIREBASE_ENABLED) return;
  if (existing) return;
  const home = document.querySelector('#view-people');
  if (!home) return;
  // 既に閉じた履歴があればスキップ
  if (localStorage.getItem('ijin_login_notice_dismissed') === '1') return;
  const banner = document.createElement('div');
  banner.id = 'loginNotice';
  banner.className = 'login-notice';
  banner.innerHTML = `
    <div class="login-notice-icon">💾</div>
    <div class="login-notice-text">
      <div class="login-notice-title">未ログインです</div>
      <div class="login-notice-sub">お気に入り・推し・ルーティンはこの端末にのみ保存されます。<br>登録すると、<b>端末を変えても・データを消しても残る</b>ように。</div>
    </div>
    <button class="login-notice-btn" id="loginNoticeBtn">登録する</button>
    <button class="login-notice-close" id="loginNoticeClose" aria-label="閉じる">×</button>
  `;
  home.insertBefore(banner, home.firstChild);
  banner.querySelector('#loginNoticeBtn').addEventListener('click', openLoginModal);
  banner.querySelector('#loginNoticeClose').addEventListener('click', () => {
    localStorage.setItem('ijin_login_notice_dismissed', '1');
    banner.remove();
  });
}

function escapeSmall(s) { return (s || '').replace(/[<>&]/g, ''); }

// アカウントボタン挿入（初回）
function insertAccountButton() {
  // ヘッダー右側のコンテナに追加（なければ作る）
  let headerRight = document.querySelector('.app-header .header-right');
  if (!headerRight) {
    const header = document.querySelector('.app-header') || document.querySelector('header');
    if (!header) return;
    headerRight = document.createElement('div');
    headerRight.className = 'header-right';
    // 既存の検索ボタン等を移動
    const existingBtn = header.querySelector('.icon-btn');
    if (existingBtn) headerRight.appendChild(existingBtn);
    header.appendChild(headerRight);
  }
  if (document.getElementById('accountBadge')) return;
  const btn = document.createElement('button');
  btn.id = 'accountBadge';
  btn.className = 'account-badge';
  btn.innerHTML = `<span class="acc-icon">👤</span><span class="acc-name">ログイン</span>`;
  btn.addEventListener('click', () => {
    if (currentUser) {
      openAccountMenu();
    } else {
      openLoginModal();
    }
  });
  headerRight.appendChild(btn);
  updateAccountUI();
}

function openAccountMenu() {
  if (!currentUser) return;
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-backdrop" data-close></div>
    <div class="auth-modal-panel auth-modal-menu">
      <button class="auth-modal-close" data-close>×</button>
      <div class="auth-head">
        <div class="auth-title">${escapeSmall(currentUser.displayName || currentUser.email || '')}</div>
        <div class="auth-sub">全端末でお気に入り・ルーティンが同期されています</div>
      </div>
      <div class="auth-menu">
        <button class="auth-menu-btn" id="authSync">☁ クラウドに今すぐ同期</button>
        <button class="auth-menu-btn auth-menu-danger" id="authLogout">ログアウト</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  modal.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 200);
    });
  });
  modal.querySelector('#authSync').addEventListener('click', async () => {
    await pushToCloud(currentUser);
    alert('同期しました。');
  });
  modal.querySelector('#authLogout').addEventListener('click', async () => {
    if (!confirm('ログアウトしますか？この端末のお気に入りはそのまま残ります。')) return;
    await logout();
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 200);
  });
}

// ai-consult.js 等からアクセスできるようにwindowにも公開
window.FIREBASE_ENABLED = FIREBASE_ENABLED;
window.openLoginModal = openLoginModal;
window.pushToCloud = pushToCloud;
onAuthChange((u) => { window.currentUser = u; });

// 初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initFirebase(); insertAccountButton(); });
} else {
  initFirebase();
  insertAccountButton();
}
