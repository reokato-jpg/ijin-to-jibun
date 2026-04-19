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
  'ijin_my_traits',
  'ijin_checkins',
  'ijin_quiz_answered',
  'ijin_quiz_ever_stamped',
  'ijin_user_avatar',
  'ijin_user_follows',
  'ijin_phone_pinned_quotes',
  'ijin_forced_follows',
  'ijin_bday_greeted',
  'ijin_known_user_followers',
  'ijin_unfollowed_at',
  'ijin_followed_at',
  'ijin_rabin_voice_played',
  'ijin_power_hint_seen',
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
// auth確定まで待つpromise（シェアURL経由でフォローボタン表示などに使う）
function waitForAuthResolved(timeoutMs = 6000) {
  if (authResolved) return Promise.resolve(currentUser);
  return new Promise(resolve => {
    let done = false;
    const finish = (u) => { if (done) return; done = true; resolve(u); };
    const off = (u) => { if (authResolved) finish(u); };
    authListeners.push(off);
    setTimeout(() => finish(currentUser), timeoutMs);
  });
}
window.waitForAuthResolved = waitForAuthResolved;
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
    const { getFirestore, doc, getDoc, setDoc, collection, getDocs } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    fbApp = initializeApp(FIREBASE_CONFIG);
    fbAuth = getAuth(fbApp);
    fbDb = getFirestore(fbApp);

    // 外から使えるようwindow経由で公開
    window.__fbLib = { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, doc, getDoc, setDoc, collection, getDocs };

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

// 最後に同期したUIDを記録（アカウント切替を検出するため）
const LAST_UID_KEY = '__ijin_last_uid';

async function pullFromCloud(user) {
  try {
    const { doc, getDoc } = window.__fbLib;
    const snap = await getDoc(doc(fbDb, 'users', user.uid));
    const prevUid = localStorage.getItem(LAST_UID_KEY) || '';
    const isAccountSwitch = prevUid && prevUid !== user.uid;

    if (snap.exists()) {
      const data = snap.data();
      if (isAccountSwitch) {
        // アカウント切替: 前のアカウントのデータが残っているので、
        // クラウドの値で完全に上書き（マージしない）。クラウドに無いキーはローカルからも削除。
        SYNC_KEYS.forEach(k => {
          if (data[k] !== undefined) {
            localStorage.setItem(k, JSON.stringify(data[k]));
          } else {
            localStorage.removeItem(k);
          }
        });
        console.log('[auth] アカウント切替: クラウドデータで上書き');
      } else {
        // 同じアカウント or 初回: マージ動作を維持
        SYNC_KEYS.forEach(k => {
          const cloudVal = data[k];
          let localVal = null;
          const rawLocal = localStorage.getItem(k);
          if (rawLocal !== null) {
            try { localVal = JSON.parse(rawLocal); }
            catch { localVal = rawLocal; /* 生文字列（dataURL等）もローカル値として扱う */ }
          }
          if (cloudVal === undefined && localVal !== null) return; // ローカルのみ
          if (localVal === null) {
            if (cloudVal !== undefined) localStorage.setItem(k, JSON.stringify(cloudVal));
            return;
          }
          if (Array.isArray(cloudVal) && Array.isArray(localVal)) {
            let merged;
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
            // 文字列/非配列：ローカルに値があればそれを優先（未同期の最新入力を尊重）
            // ローカルが空でクラウドに値があればクラウド採用、両方あればローカル優先
            const localEmpty = (localVal === null || localVal === '' ||
              (typeof localVal === 'object' && localVal && Object.keys(localVal).length === 0));
            if (localEmpty && cloudVal !== undefined) {
              localStorage.setItem(k, JSON.stringify(cloudVal));
            }
            // ローカルに既に値があるときは上書きしない（ここで何もしない）
          }
        });
        console.log('[auth] クラウドから同期完了');
        await pushToCloud(user);
      }
    } else {
      // クラウドにデータなし
      if (isAccountSwitch) {
        // アカウント切替で新規ユーザー → ローカルを全消し
        SYNC_KEYS.forEach(k => localStorage.removeItem(k));
        console.log('[auth] アカウント切替（新規）: ローカルクリア');
      } else {
        // 初回ログイン → 端末のlocalStorageをクラウドへ
        await pushToCloud(user);
      }
    }
    // 今回のUIDを記録
    localStorage.setItem(LAST_UID_KEY, user.uid);

    // 再描画をトリガー
    if (typeof window.renderHomeBooks === 'function') window.renderHomeBooks();
    if (typeof window.renderFavorites === 'function') window.renderFavorites();
    if (typeof window.renderPeople === 'function') window.renderPeople();
    if (typeof window.renderOshi === 'function') window.renderOshi();
    if (typeof window.updateAccountUI === 'function') window.updateAccountUI();
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

// 指定偉人をフォローしているユーザーを全取得
async function fetchUserFollowersOfPerson(personId) {
  if (!FIREBASE_ENABLED || !fbDb || !window.__fbLib) return [];
  try {
    const { collection, getDocs } = window.__fbLib;
    const snap = await getDocs(collection(fbDb, 'users'));
    const followers = [];
    snap.forEach(docSnap => {
      const uid = docSnap.id;
      if (currentUser && uid === currentUser.uid) return; // 自分は除外（別表記）
      const data = docSnap.data();
      const favs = data.ijin_fav_people;
      if (!Array.isArray(favs)) return;
      if (!favs.includes(personId)) return;
      const name = data.ijin_user_name || '';
      const title = data.ijin_current_title || '';
      const stamps = data.ijin_stamps || {};
      const raw = stamps[personId];
      let stampCount = 0;
      if (typeof raw === 'number') stampCount = raw;
      else if (raw && typeof raw === 'object') stampCount = Object.values(raw).reduce((a,b) => a + (b || 0), 0);
      followers.push({ uid, name, title, stampCount });
    });
    return followers;
  } catch (e) {
    console.error('[auth] user followers 取得失敗:', e);
    return [];
  }
}
window.fetchUserFollowersOfPerson = fetchUserFollowersOfPerson;

// 全会員の公開プロフィール（名前・称号・アバター・trait・SNS・フォロー偉人一覧）を取得
async function fetchAllUserProfiles() {
  if (!FIREBASE_ENABLED || !fbDb || !window.__fbLib) return [];
  try {
    const { collection, getDocs } = window.__fbLib;
    const snap = await getDocs(collection(fbDb, 'users'));
    const users = [];
    snap.forEach(docSnap => {
      const uid = docSnap.id;
      const d = docSnap.data();
      const name = d.ijin_user_name || '';
      if (!name) return; // 名前未設定は非表示
      const traits = d.ijin_my_traits || {};
      const sns = traits.sns || {};
      const hasSns = sns.x || sns.instagram || sns.note || sns.facebook;
      const followingIjin = Array.isArray(d.ijin_fav_people) ? d.ijin_fav_people : [];
      const stamps = d.ijin_stamps || {};
      let stampTotal = 0;
      Object.values(stamps).forEach(v => {
        if (typeof v === 'number') stampTotal += v;
        else if (v && typeof v === 'object') stampTotal += Object.values(v).reduce((a,b)=>a+(b||0),0);
      });
      const userFollows = Array.isArray(d.ijin_user_follows) ? d.ijin_user_follows : [];
      users.push({
        uid,
        name,
        title: d.ijin_current_title || '',
        avatar: d.ijin_user_avatar || '',
        birthMonth: traits.birthMonth || null,
        birthDay: traits.birthDay || null,
        hometown: traits.hometown || '',
        traits: {
          foods: traits.foods || [],
          hobbies: traits.hobbies || [],
          likes: traits.likes || [],
          dislikes: traits.dislikes || [],
        },
        sns: {
          x: sns.x || '',
          instagram: sns.instagram || '',
          note: sns.note || '',
          facebook: sns.facebook || '',
        },
        hasSns: !!hasSns,
        followingIjin,
        ijinCount: followingIjin.length,
        stampTotal,
        userFollows,
        isMe: currentUser && uid === currentUser.uid,
      });
    });
    return users;
  } catch (e) {
    console.error('[auth] user list 取得失敗:', e);
    return [];
  }
}
window.fetchAllUserProfiles = fetchAllUserProfiles;

// 指定uidの会員プロフィールを取得（URL/ID検索用）
async function fetchUserProfileById(uid) {
  if (!FIREBASE_ENABLED || !fbDb || !window.__fbLib || !uid) return null;
  try {
    const { doc, getDoc } = window.__fbLib;
    const snap = await getDoc(doc(fbDb, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    const name = d.ijin_user_name || '';
    if (!name) return null;
    const traits = d.ijin_my_traits || {};
    const sns = traits.sns || {};
    const followingIjin = Array.isArray(d.ijin_fav_people) ? d.ijin_fav_people : [];
    const stamps = d.ijin_stamps || {};
    let stampTotal = 0;
    Object.values(stamps).forEach(v => {
      if (typeof v === 'number') stampTotal += v;
      else if (v && typeof v === 'object') stampTotal += Object.values(v).reduce((a,b)=>a+(b||0),0);
    });
    return {
      uid, name,
      title: d.ijin_current_title || '',
      avatar: d.ijin_user_avatar || '',
      birthMonth: traits.birthMonth || null,
      birthDay: traits.birthDay || null,
      hometown: traits.hometown || '',
      traits: {
        foods: traits.foods || [], hobbies: traits.hobbies || [],
        likes: traits.likes || [], dislikes: traits.dislikes || [],
      },
      sns: {
        x: sns.x || '', instagram: sns.instagram || '',
        note: sns.note || '', facebook: sns.facebook || '',
      },
      hasSns: !!(sns.x || sns.instagram || sns.note || sns.facebook),
      followingIjin,
      ijinCount: followingIjin.length,
      stampTotal,
      userFollows: Array.isArray(d.ijin_user_follows) ? d.ijin_user_follows : [],
      isMe: currentUser && uid === currentUser.uid,
    };
  } catch (e) {
    console.error('[auth] user profile 取得失敗:', e);
    return null;
  }
}
window.fetchUserProfileById = fetchUserProfileById;

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
        <div class="auth-sub">夜、どうしても眠れないとき。<br>朝、どうしても立ち上がれないとき。<br>夜明けには消えてしまう、その記録を<br><b>あなただけの本棚</b>にしまっておきませんか。</div>
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
  // 最後のUID記録はクリア（次ログインで別アカウントでも「切替」と判断できる）
  localStorage.removeItem(LAST_UID_KEY);
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
  } else {
    // clearLocal=falseでもアカウント切替を確実にするため、次回ログイン時に
    // pullFromCloud で「切替検出」が効くよう LAST_UID_KEY を消すだけに留める
    setTimeout(() => window.location.reload(), 300);
  }
}

function updateAccountUI() {
  const badge = document.getElementById('accountBadge');
  if (!badge) return;
  const dot = badge.querySelector('#burgerDot');
  if (currentUser) {
    badge.classList.add('logged-in');
    if (dot) dot.hidden = true;
  } else {
    badge.classList.remove('logged-in');
    if (dot) dot.hidden = false; // 未ログイン時は赤い「鍵を受け取って」ドットを出す
  }
  updateLoginNotice();
}
// グローバル公開（app.jsから再描画できるように）
window.updateAccountUI = updateAccountUI;

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
      <aside class="guide-chara guide-size-sm guide-layout-inline" data-pose="pointing">
        <div class="guide-chara-video-wrap">
          <video class="guide-chara-video" autoplay loop muted playsinline preload="metadata" aria-hidden="true">
            <source src="assets/guide/pointing.mp4" type="video/mp4">
          </video>
        </div>
        <div class="guide-chara-bubble">
          <div class="guide-chara-bubble-tail" aria-hidden="true"></div>
          <div class="guide-chara-name">ラビン</div>
          <div class="guide-chara-text">本棚の鍵を受け取ると、この一冊を残しておけるよ。</div>
        </div>
      </aside>
      <div class="key-popup-sub">
        夜、どうしても眠れないとき。<br>
        朝、どうしても立ち上がれないとき。<br><br>
        夜明けには消えてしまう、その記録を<br>
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
  btn.className = 'account-badge menu-burger';
  btn.setAttribute('aria-label', 'メニュー');
  btn.innerHTML = `
    <span class="burger-lines" aria-hidden="true">
      <span></span><span></span><span></span>
    </span>
    <span class="burger-dot" id="burgerDot" hidden></span>
  `;
  btn.addEventListener('click', () => {
    openAccountMenu();
  });
  headerRight.appendChild(btn);
  updateAccountUI();
}

function openAccountMenu() {
  const existing = document.getElementById('authModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'auth-modal settings-drawer';
  const loggedIn = !!currentUser;
  const displayName = loggedIn ? escapeSmall(currentUser.displayName || currentUser.email?.split('@')[0] || 'ユーザー') : '';
  const avatar = loggedIn ? localStorage.getItem('ijin_user_avatar') : '';
  const avatarHtml = avatar
    ? `<div class="settings-user-av" style="background-image:url('${avatar}')"></div>`
    : `<div class="settings-user-av no-img">${loggedIn ? (displayName[0] || '?') : '🔑'}</div>`;
  modal.innerHTML = `
    <div class="auth-modal-backdrop" data-close></div>
    <aside class="settings-drawer-panel">
      <button class="settings-drawer-close" data-close aria-label="閉じる">×</button>
      <div class="settings-user">
        ${avatarHtml}
        <div class="settings-user-info">
          ${loggedIn
            ? `<div class="settings-user-name">${displayName}</div><div class="settings-user-sub">全端末で同期中</div>`
            : `<div class="settings-user-name">ゲスト</div><div class="settings-user-sub">本棚の鍵を受け取ると、端末を変えても残せます</div>`}
        </div>
      </div>

      ${!loggedIn ? `
        <button class="settings-login-btn" id="settingsLogin">🔑 本棚の鍵を受け取る／ログイン</button>
      ` : ''}

      <div class="settings-sec-title">👤 プロフィール</div>
      <div class="settings-list">
        ${loggedIn ? `
          <button class="settings-item" data-act="share">
            <span class="settings-item-icon">🔗</span>
            <span class="settings-item-body"><b>マイID／シェア</b><small>IDとURLで自分の本棚を共有</small></span>
            <span class="settings-item-arrow">›</span>
          </button>
          <button class="settings-item" data-act="edit-profile">
            <span class="settings-item-icon">✎</span>
            <span class="settings-item-body"><b>プロフィール編集</b><small>名前・称号・誕生日・出身地・SNS</small></span>
            <span class="settings-item-arrow">›</span>
          </button>
        ` : `
          <div class="settings-item disabled">
            <span class="settings-item-icon">🔒</span>
            <span class="settings-item-body"><b>会員限定</b><small>ログインすると各機能が使えます</small></span>
          </div>
        `}
        <button class="settings-item" data-act="directory">
          <span class="settings-item-icon">👥</span>
          <span class="settings-item-body"><b>会員ディレクトリ</b><small>他の読者を見つける</small></span>
          <span class="settings-item-arrow">›</span>
        </button>
      </div>

      <div class="settings-sec-title">🔔 通知</div>
      <div class="settings-list">
        <label class="settings-item settings-item-toggle">
          <span class="settings-item-icon">🎂</span>
          <span class="settings-item-body"><b>誕生日通知</b><small>フォロー偉人の誕生日に知らせる</small></span>
          <input type="checkbox" class="settings-toggle" id="togNotifyBirthday">
        </label>
        <label class="settings-item settings-item-toggle">
          <span class="settings-item-icon">📪</span>
          <span class="settings-item-body"><b>偉人からの手紙返信</b><small>手紙を送った偉人から返事が来た時</small></span>
          <input type="checkbox" class="settings-toggle" id="togNotifyLetter">
        </label>
        <label class="settings-item settings-item-toggle">
          <span class="settings-item-icon">👥</span>
          <span class="settings-item-body"><b>会員からのフォロー</b><small>他の読者があなたをフォローした時</small></span>
          <input type="checkbox" class="settings-toggle" id="togNotifyUserFollow">
        </label>
        <label class="settings-item settings-item-toggle">
          <span class="settings-item-icon">🏛</span>
          <span class="settings-item-body"><b>偉人からのフォロー</b><small>偉人があなたをフォローした時</small></span>
          <input type="checkbox" class="settings-toggle" id="togNotifyIjinFollow">
        </label>
      </div>

      <div class="settings-sec-title">🔗 SNS連携</div>
      <div class="settings-list">
        <button class="settings-item" data-act="sns">
          <span class="settings-item-icon">🌐</span>
          <span class="settings-item-body"><b>X / Instagram / Note / Facebook</b><small>プロフィールにリンクを表示</small></span>
          <span class="settings-item-arrow">›</span>
        </button>
      </div>

      <div class="settings-sec-title">⚙️ その他</div>
      <div class="settings-list">
        ${loggedIn ? `
          <button class="settings-item" data-act="sync">
            <span class="settings-item-icon">☁</span>
            <span class="settings-item-body"><b>今すぐ同期</b><small>クラウドに手動でアップロード</small></span>
            <span class="settings-item-arrow">›</span>
          </button>
        ` : ''}
        <button class="settings-item" data-act="mute">
          <span class="settings-item-icon">🔇</span>
          <span class="settings-item-body"><b>サイト音を切り替え</b><small>BGM・効果音のON/OFF</small></span>
          <span class="settings-item-arrow">›</span>
        </button>
        <button class="settings-item" data-act="terms">
          <span class="settings-item-icon">📄</span>
          <span class="settings-item-body"><b>利用規約・プライバシー</b></span>
          <span class="settings-item-arrow">›</span>
        </button>
        ${loggedIn ? `
          <button class="settings-item settings-item-danger" data-act="logout">
            <span class="settings-item-icon">🚪</span>
            <span class="settings-item-body"><b>ログアウト</b></span>
            <span class="settings-item-arrow">›</span>
          </button>
        ` : ''}
      </div>
    </aside>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 220);
  };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));

  // 通知トグルの現在値
  const togBd = modal.querySelector('#togNotifyBirthday');
  const togLt = modal.querySelector('#togNotifyLetter');
  const togUf = modal.querySelector('#togNotifyUserFollow');
  const togIf = modal.querySelector('#togNotifyIjinFollow');
  if (togBd) togBd.checked = localStorage.getItem('ijin_notify_birthday') !== '0';
  if (togLt) togLt.checked = localStorage.getItem('ijin_notify_letter') !== '0';
  if (togUf) togUf.checked = localStorage.getItem('ijin_notify_user_follow') !== '0';
  if (togIf) togIf.checked = localStorage.getItem('ijin_notify_ijin_follow') !== '0';
  togBd?.addEventListener('change', () => localStorage.setItem('ijin_notify_birthday', togBd.checked ? '1' : '0'));
  togLt?.addEventListener('change', () => localStorage.setItem('ijin_notify_letter', togLt.checked ? '1' : '0'));
  togUf?.addEventListener('change', () => localStorage.setItem('ijin_notify_user_follow', togUf.checked ? '1' : '0'));
  togIf?.addEventListener('change', () => localStorage.setItem('ijin_notify_ijin_follow', togIf.checked ? '1' : '0'));

  // 各アクション
  modal.querySelector('#settingsLogin')?.addEventListener('click', () => { close(); openLoginModal(); });
  modal.querySelectorAll('[data-act]').forEach(el => {
    el.addEventListener('click', () => {
      const act = el.dataset.act;
      if (act === 'share' && typeof window.openShareMyProfileModal === 'function') { close(); window.openShareMyProfileModal(); }
      else if (act === 'edit-profile' && typeof window.openEditProfileModal === 'function') { close(); window.openEditProfileModal(); }
      else if (act === 'directory' && typeof window.openUsersDirectory === 'function') { close(); window.openUsersDirectory(); }
      else if (act === 'sns' && typeof window.openSnsLinksModal === 'function') { close(); window.openSnsLinksModal(); }
      else if (act === 'sync') { pushToCloud(currentUser).then(() => alert('同期しました。')); }
      else if (act === 'mute') {
        const cur = localStorage.getItem('ijin_muted') === '1';
        localStorage.setItem('ijin_muted', cur ? '0' : '1');
        alert(cur ? '🔊 音をONにしました' : '🔇 音をOFFにしました');
      }
      else if (act === 'terms') { window.open('terms.html', '_blank'); }
      else if (act === 'logout') {
        openLogoutConfirmModal(async (clearLocal) => {
          await logout(clearLocal);
          close();
        });
      }
    });
  });
}

// ログアウト確認モーダル（上品なUI）
window.openLogoutConfirmModal = openLogoutConfirmModal;
function openLogoutConfirmModal(onConfirm) {
  const existing = document.getElementById('logoutConfirmModal');
  if (existing) existing.remove();
  const m = document.createElement('div');
  m.id = 'logoutConfirmModal';
  m.className = 'auth-modal logout-modal';
  m.innerHTML = `
    <div class="auth-modal-backdrop" data-close></div>
    <div class="auth-modal-panel logout-panel">
      <button class="auth-modal-close" data-close>×</button>
      <div class="logout-head">
        <div class="logout-ornament">◆</div>
        <h3 class="logout-title">ログアウト</h3>
        <div class="logout-sub">また、いつでも戻ってこれるように。</div>
      </div>
      <div class="logout-choices">
        <button class="logout-choice" data-choice="1">
          <div class="logout-choice-icon">🔒</div>
          <div class="logout-choice-body">
            <div class="logout-choice-title">ログアウトのみ</div>
            <div class="logout-choice-desc">この端末のお気に入り・手紙・日記はそのまま残します（おすすめ）</div>
          </div>
        </button>
        <button class="logout-choice logout-choice-danger" data-choice="2">
          <div class="logout-choice-icon">🗑</div>
          <div class="logout-choice-body">
            <div class="logout-choice-title">データを削除してログアウト</div>
            <div class="logout-choice-desc">この端末のデータを全て消します。クラウドには残っているので再ログインで復元できます</div>
          </div>
        </button>
      </div>
      <button class="logout-cancel" data-close>キャンセル</button>
    </div>
  `;
  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add('open'));
  const close = () => { m.classList.remove('open'); setTimeout(() => m.remove(), 200); };
  m.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  m.querySelectorAll('[data-choice]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const clearLocal = btn.dataset.choice === '2';
      if (clearLocal && !confirm('本当に削除しますか？\nこの端末のお気に入り・手紙・日記・つぶやき等が全て消えます。\n（クラウドには残っているので、再ログインで復元できます）')) return;
      close();
      if (onConfirm) await onConfirm(clearLocal);
    });
  });
}

// ai-consult.js 等からアクセスできるようにwindowにも公開
window.FIREBASE_ENABLED = FIREBASE_ENABLED;
window.openLoginModal = openLoginModal;
window.pushToCloud = pushToCloud;
onAuthChange((u) => {
  window.currentUser = u;
  // ログイン状態に依存するUIを再描画
  try { if (typeof window.renderTraitsMatch === 'function') window.renderTraitsMatch(); } catch {}
  try { if (typeof window.renderFavorites === 'function') window.renderFavorites(); } catch {}
  // 会員フォロワー通知（ログイン直後 & 以降1分おき）
  if (u) {
    setTimeout(() => {
      try { window.runUserFollowerNotifications?.(); } catch {}
    }, 1500);
    if (!window.__userFollowerTimer) {
      window.__userFollowerTimer = setInterval(() => {
        if (window.currentUser) { try { window.runUserFollowerNotifications?.(); } catch {} }
      }, 60000);
    }
  }
});

// 初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initFirebase(); insertAccountButton(); });
} else {
  initFirebase();
  insertAccountButton();
}
