// Service Worker: 完全オフライン対応
// - 起動時にコアアセット（HTML/CSS/JS/主要画像/BGM/データ）を先行キャッシュ
// - 静的アセット: cache-first（オフライン耐性最優先）+ 裏で更新
// - 偉人データ: cache-first で即返却、裏でネット再取得
// - HTML: network-first（更新優先）→ 失敗時にキャッシュへフォールバック
// - Firebase/Firestore: 素通し（認証や書き込みは素のネット通信）
// - クロスオリジン画像（Wikipedia 等）: cache-first（一度見た肖像画はオフラインでも表示）

const VERSION = 'v20260502HQ';
const STATIC_CACHE = `ijin-static-${VERSION}`;
const DATA_CACHE   = `ijin-data-${VERSION}`;
const AUDIO_CACHE  = `ijin-audio-${VERSION}`;
const IMAGE_CACHE  = `ijin-image-${VERSION}`;

// 起動時にプリキャッシュする必須アセット（アプリシェル）
const PRECACHE_SHELL = [
  '/app/',
  '/app/index.html',
  '/app/magic.css',
  '/app/magic.js',
  '/app/dist/style.min.css',
  '/app/dist/app.min.js',
  '/app/dist/era-theme.min.css',
  '/app/dist/ai-consult.min.js',
  '/app/dist/history-patterns.min.js',
  '/app/dist/era-lore.min.js',
  '/app/manifest.json',
  // フォント（Google 以外）やアイコンは後述の fetch ハンドラで随時キャッシュ
];

// プリキャッシュしたいデータ（起動時にバックグラウンドで取得を試みる）
const PRECACHE_DATA = [
  '/data/manifest.json',
  '/data/people-lite.json',   // 軽量版（初回ロード用）
  '/data/people-bundle.json', // 詳細版（バックグラウンド）
  '/data/eras.json',
  '/data/updates.json',
  '/data/tags.json',
  '/data/articles.json',
];

// プリキャッシュする BGM（サイズ大きめなのでエラー許容）
const PRECACHE_AUDIO = [
  '/app/assets/home-bgm.mp3',
  '/app/assets/search-bgm.mp3',
  '/app/assets/history-bgm.mp3',
  '/app/assets/routine-bgm.mp3',
  '/app/assets/blog-bgm.mp3',
  '/app/assets/favorites-bgm.mp3',
  '/app/assets/square-bgm.mp3',
  '/app/assets/page-flip.mp3',
  '/app/assets/send.mp3',
  '/app/assets/receive.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticC = await caches.open(STATIC_CACHE);
    // 必須シェルはエラーを許容して1つずつキャッシュ（1つ失敗で全体が死なないように）
    await Promise.allSettled(PRECACHE_SHELL.map(u => staticC.add(u).catch(() => null)));

    const dataC = await caches.open(DATA_CACHE);
    // データは並列で取得しつつ、失敗してもインストールは成功させる
    Promise.allSettled(PRECACHE_DATA.map(u =>
      fetch(u).then(res => res.ok ? dataC.put(u, res.clone()) : null).catch(() => null)
    ));

    const audioC = await caches.open(AUDIO_CACHE);
    Promise.allSettled(PRECACHE_AUDIO.map(u =>
      fetch(u).then(res => res.ok ? audioC.put(u, res.clone()) : null).catch(() => null)
    ));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // 古いキャッシュを削除
    await Promise.all(keys
      .filter(k => ![STATIC_CACHE, DATA_CACHE, AUDIO_CACHE, IMAGE_CACHE].includes(k))
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// ---- ユーティリティ ----
function isDataRequest(url) {
  return /\/data\/(people|eras|updates|tags|articles|manifest|people-bundle|people-lite)/.test(url.pathname);
}
function isStaticAsset(url) {
  return /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|woff2?|ttf|ico|json)$/i.test(url.pathname);
}
function isAudio(url) {
  return /\.(?:mp3|ogg|wav|m4a)$/i.test(url.pathname);
}
function isImage(url) {
  return /\.(?:png|jpe?g|webp|gif|svg)(?:\?|$)/i.test(url.pathname + url.search);
}
function isFirebase(url) {
  return /(firebaseapp\.com|firestore\.googleapis\.com|identitytoolkit|gstatic\.com\/firebasejs|googleapis\.com)/.test(url.host) ||
         /firebasejs|firebaseapp|firestore|identitytoolkit/.test(url.href);
}
function isHtmlRequest(req, url) {
  return req.mode === 'navigate'
    || (req.destination === 'document')
    || (url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('.html'));
}

// ---- 戦略：cache-first ＋ 裏で更新（stale-while-revalidate） ----
async function cacheFirstSWR(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkFetch = fetch(req).then(res => {
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  }).catch(() => cached); // ネット失敗時はキャッシュ
  return cached || networkFetch;
}

// ---- 戦略：network-first ＋ 失敗時キャッシュ ----
async function networkFirstFallback(req, cacheName, cacheKey) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.status === 200) cache.put(cacheKey || req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(cacheKey || req);
    if (cached) return cached;
    // HTML 要求でキャッシュもない場合はシェルを返す
    if (isHtmlRequest(req, new URL(req.url))) {
      const shell = await cache.match('/app/index.html') || await cache.match('/app/');
      if (shell) return shell;
    }
    throw new Error('offline and no cache');
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Firebase は素通し
  if (isFirebase(url)) return;

  const sameOrigin = url.origin === self.location.origin;

  // 同一オリジンのデータ：cache-first で即返却＋裏で更新（オフライン耐性最優先）
  if (sameOrigin && isDataRequest(url)) {
    event.respondWith(cacheFirstSWR(req, DATA_CACHE));
    return;
  }

  // 同一オリジンの音声：cache-first
  if (sameOrigin && isAudio(url)) {
    event.respondWith(cacheFirstSWR(req, AUDIO_CACHE));
    return;
  }

  // 同一オリジンの静的アセット：cache-first
  if (sameOrigin && isStaticAsset(url)) {
    event.respondWith(cacheFirstSWR(req, STATIC_CACHE));
    return;
  }

  // クロスオリジン画像（Wikipedia の肖像画など）：cache-first
  if (!sameOrigin && isImage(url)) {
    event.respondWith(cacheFirstSWR(req, IMAGE_CACHE));
    return;
  }

  // HTML ナビゲーション：network-first ＋ 失敗時にキャッシュ＆シェルへ
  if (sameOrigin && isHtmlRequest(req, url)) {
    // クエリパラメータは同一HTMLとしてキャッシュキーを統一
    const cacheKey = new Request(url.origin + url.pathname, { method: 'GET' });
    event.respondWith(networkFirstFallback(req, STATIC_CACHE, cacheKey));
    return;
  }

  // その他：network-first で取ってキャッシュへ、失敗時はキャッシュ
  event.respondWith(
    fetch(req)
      .then(res => {
        if (sameOrigin && res && res.status === 200) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});

// アプリ側から「このURLもキャッシュして」と依頼できる（people/*.json など動的URLに対応）
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'MAGIC_PRECACHE' && Array.isArray(data.urls)) {
    caches.open(DATA_CACHE).then(cache => {
      data.urls.forEach(u => {
        fetch(u).then(res => res.ok && cache.put(u, res.clone())).catch(() => {});
      });
    });
  }
  if (data.type === 'MAGIC_CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
