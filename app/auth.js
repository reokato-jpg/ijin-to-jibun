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
  'ijin_bookmarks',
  'ijin_letters',
  'ijin_self_posts',
  'ijin_stamps',
  'ijin_current_title',
  'ijin_visits',
  'ijin_last_visit_day',
];

let fbApp = null, fbAuth = null, fbDb = null;
let currentUser = null;
let authResolved = false;
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
      authResolved = true;
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
          let merged;
          // オブジェクト配列（id付き）は id でユニーク化、それ以外はSetで
          const sample = cloudVal[0] ?? localVal[0];
          if (sample && typeof sample === 'object' && sample.id !== undefined) {
            const seen = new Set();
            merged = [...cloudVal, ...localVal].filter(item => {
              if (!item || seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
          } else {
            merged = [...new Set([...cloudVal, ...localVal])];
          }
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
        <div class="auth-title">本棚の鍵を受け取る</div>
        <div class="auth-sub">夜、どうしても眠れないとき。<br>朝、どうしても立ち上がれないとき。<br>その記録を、夜明けに消えてしまわないよう<br><b>あなただけの本棚</b>にしまっておきませんか。</div>
      </div>
      <div class="auth-tabs">
        <button class="auth-tab active" data-mode="login">戻ってきた方</button>
        <button class="auth-tab" data-mode="register">はじめての方</button>
      </div>
      <form class="auth-form" id="authForm">
        <label class="auth-label">メールアドレス
          <input type="email" name="email" required autocomplete="email">
        </label>
        <label class="auth-label">パスワード（6文字以上）
          <input type="password" name="password" required minlength="6" autocomplete="current-password">
        </label>
        <button type="submit" class="auth-submit">本棚の鍵を受け取る</button>
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
      submit.textContent = mode === 'login' ? 'おかえりなさい、開く' : '本棚の鍵を受け取る';
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

async function logout(clearLocal = false) {
  if (!FIREBASE_ENABLED || !fbAuth) return;
  try {
    const { signOut } = window.__fbLib;
    await signOut(fbAuth);
  } catch (e) { console.error(e); }
  // 端末のデータもクリア
  if (clearLocal) {
    SYNC_KEYS.forEach(k => localStorage.removeItem(k));
    // 追加の一時データも
    localStorage.removeItem('ijin_mood_pick');
    localStorage.removeItem('ijin_chat_last_slot');
    localStorage.removeItem('ijin_chat_seen');
    localStorage.removeItem('ijin_quick_replies');
    localStorage.removeItem('ijin_login_notice_dismissed');
    // ページ再読込でUI更新
    setTimeout(() => window.location.reload(), 300);
  }
}

function updateAccountUI() {
  const badge = document.getElementById('accountBadge');
  if (!badge) return;
  if (currentUser) {
    const n = currentUser.displayName || currentUser.email?.split('@')[0] || 'ユーザー';
    badge.innerHTML = `<span class="acc-dot"></span><span class="acc-name">${escapeSmall(n)}</span>`;
    badge.classList.add('logged-in');
  } else {
    badge.innerHTML = `<span class="acc-icon">🔑</span><span class="acc-name">本棚の鍵</span>`;
    badge.classList.remove('logged-in');
  }
  updateLoginNotice();
}

// 本棚の鍵ポップアップ（未ログイン時、認証確定後に1度だけ表示）
function updateLoginNotice() {
  const existing = document.getElementById('loginNoticePopup');
  if (currentUser) {
    if (existing) existing.remove();
    return;
  }
  // 認証状態が確定するまで表示しない（ログイン済みユーザーに一瞬出る問題を防止）
  if (FIREBASE_ENABLED && !authResolved) return;
  if (!FIREBASE_ENABLED) return;
  if (existing) return;
  // 「今後表示しない」がチェックされていたら出さない
  if (localStorage.getItem('ijin_login_notice_never') === '1') return;

  const popup = document.createElement('div');
  popup.id = 'loginNoticePopup';
  popup.className = 'key-popup';
  popup.innerHTML = `
    <div class="key-popup-backdrop" data-close="1"></div>
    <div class="key-popup-panel">
      <div class="key-popup-icon"><img class="icon-img icon-img-xl" src="assets/icons/star.png" alt=""></div>
      <div class="key-popup-title">本棚の鍵を受け取りますか？</div>
      <div class="key-popup-sub">
        夜、どうしても眠れないとき。<br>
        朝、どうしても立ち上がれないとき。<br><br>
        その記録を、夜明けに消えてしまわないよう<br>
        <b>あなただけの本棚</b>にしまっておきませんか。
      </div>
      <div class="key-popup-actions">
        <button class="key-popup-no" data-close="1">いいえ</button>
        <button class="key-popup-yes" id="keyPopupYes">鍵を受け取る</button>
      </div>
      <label class="key-popup-never">
        <input type="checkbox" id="keyPopupNever">
        <span>今後表示しない</span>
      </label>
      <div class="key-popup-note">
        登録しなくても全機能使えます。<br>
        登録すると、お気に入り・手紙・ルーティンが端末を変えても残ります。
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add('open'));

  const maybeSetNever = () => {
    const cb = popup.querySelector('#keyPopupNever');
    if (cb && cb.checked) localStorage.setItem('ijin_login_notice_never', '1');
  };
  const close = () => {
    maybeSetNever();
    popup.classList.remove('open');
    setTimeout(() => popup.remove(), 200);
  };
  popup.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  popup.querySelector('#keyPopupYes').addEventListener('click', () => {
    maybeSetNever();
    // 鍵が開く音
    if (typeof playKeyUnlockSound === 'function') playKeyUnlockSound();
    popup.classList.remove('open');
    setTimeout(() => {
      popup.remove();
      openLoginModal();
    }, 800);
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
    const choice = prompt(
      'ログアウト方法を選んでください：\n' +
      '  1 … ログアウトのみ（この端末のお気に入り・手紙・日記は残す）\n' +
      '  2 … ログアウト＋この端末のデータを全て削除\n' +
      '  キャンセルで中止',
      '1'
    );
    if (!choice || (choice !== '1' && choice !== '2')) return;
    const clearLocal = (choice === '2');
    if (clearLocal && !confirm('本当に削除しますか？\nこの端末のお気に入り・手紙・日記・つぶやき等が全て消えます。\n（クラウドには残っているので、再ログインで復元できます）')) return;
    await logout(clearLocal);
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
