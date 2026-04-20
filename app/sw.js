// Service Worker: 2回目以降の訪問を爆速化
// - 静的アセット（HTML/JS/CSS/画像/フォント/BGM）: stale-while-revalidate
// - 偉人データ・お知らせ: network-first（最新を優先、失敗時キャッシュ）
// - Firebase/Firestore API: 素通し（キャッシュしない）

const VERSION = 'v20260425F';
const STATIC_CACHE = `ijin-static-${VERSION}`;
const DATA_CACHE = `ijin-data-${VERSION}`;

// 事前キャッシュ（skipWaiting時の最小プリフェッチ。空でも動作）
const CORE_ASSETS = [
  '/app/',
  '/app/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== DATA_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isDataRequest(url) {
  return /\/data\/(people|eras|updates|tags|articles|manifest|people-bundle)/.test(url.pathname);
}
function isStaticAsset(url) {
  // 同一オリジンの JS/CSS/画像/音声/フォントなど
  return /\.(?:js|css|png|jpg|jpeg|webp|svg|gif|mp3|mp4|webm|woff2?|ttf|ico)$/i.test(url.pathname);
}
function isFirebase(url) {
  return /(firebaseapp\.com|firestore\.googleapis\.com|identitytoolkit|gstatic\.com\/firebasejs|googleapis\.com)/.test(url.host) ||
         /firebasejs|firebaseapp|firestore|identitytoolkit/.test(url.href);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Firebase関連は素通し（認証・DB更新に影響しないように）
  if (isFirebase(url)) return;

  // クロスオリジン画像（Wikipedia等）はキャッシュ試行
  const sameOrigin = url.origin === self.location.origin;

  // データファイル：network-first（最新優先）
  if (sameOrigin && isDataRequest(url)) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(DATA_CACHE).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 静的アセット：stale-while-revalidate（キャッシュ即返却＋裏で更新）
  if (sameOrigin && isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const networkFetch = fetch(req).then(res => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // クロスオリジン画像（Wikipedia等）はキャッシュしつつ素通し
  if (!sameOrigin && /\.(png|jpe?g|webp|gif|svg)(?:\?|$)/i.test(url.pathname + url.search)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(req).then(cached => cached || fetch(req).then(res => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached))
      )
    );
    return;
  }
  // それ以外（HTMLなど）はネットワーク優先、失敗時キャッシュ
  event.respondWith(
    fetch(req).then(res => {
      if (sameOrigin && res && res.status === 200) {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
