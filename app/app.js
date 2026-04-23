// 遅延CSSは style.css に統合済みのため、no-op
function ensureLazyCss(_name) { /* merged back into style.css */ }
window.ensureLazyCss = ensureLazyCss;

// ====================== Amazon アフィリエイト設定 ======================
// natsumi のAmazonアソシエイトIDをセット。全Amazonリンクに自動付与される。
const AMAZON_TAG = 'natsumipiano-22';

function amazonUrl(asin) {
  return `https://www.amazon.co.jp/dp/${asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`;
}
function amazonCover(asin) {
  // 新しい m.media-amazon.com パターンの方が最近のタイトルで表示率が高い
  return `https://m.media-amazon.com/images/P/${asin}.09._SCLZZZZZZZ_.jpg`;
}
// ISBN-10のASINからopenBD（国内本表紙API）URLを生成。Amazonが1x1の時のfallback用。
function openbdCover(asin) {
  if (!asin || !/^[0-9]{9}[0-9X]$/i.test(asin)) return null;
  return `https://cover.openbd.jp/${asin}.jpg`;
}

// ====================== 楽天アフィリエイト設定 ======================
// https://affiliate.rakuten.co.jp/ で登録 → 管理画面の『アフィリエイトID』
const RAKUTEN_AFFILIATE_ID = '530ae619.30b25b17.530ae61a.3c05642f';

// 楽天ブックス検索のアフィリエイトURLを生成
// タイトル（＋著者）で検索 → 楽天ブックスのページへ誘導（自動でIDが埋め込まれる）
function rakutenSearchUrl(title, author) {
  const query = [title, author].filter(Boolean).join(' ').trim();
  const encoded = encodeURIComponent(query);
  const rakutenSearch = `https://books.rakuten.co.jp/search?sitem=${encoded}`;
  if (!RAKUTEN_AFFILIATE_ID) return rakutenSearch;
  // 楽天アフィリエイトのリダイレクタ経由で報酬計上
  const pcUrl = encodeURIComponent(rakutenSearch);
  return `https://hb.afl.rakuten.co.jp/hsc/${RAKUTEN_AFFILIATE_ID}/?pc=${pcUrl}&link_type=hybrid_url`;
}
// 偉人名で楽天全体を検索（本以外のグッズも引っかかる）
function rakutenItemSearchUrl(keyword) {
  const encoded = encodeURIComponent(keyword);
  const rakutenSearch = `https://search.rakuten.co.jp/search/mall/${encoded}/`;
  if (!RAKUTEN_AFFILIATE_ID) return rakutenSearch;
  const pcUrl = encodeURIComponent(rakutenSearch);
  return `https://hb.afl.rakuten.co.jp/hsc/${RAKUTEN_AFFILIATE_ID}/?pc=${pcUrl}&link_type=hybrid_url`;
}

// ====================== データ読み込み ======================
const DATA = { people: [], tags: [], tagMap: {}, articles: [], articleAuthor: {} };

async function loadData() {
  try {
    // キャッシュを回避するためクエリ文字列を付ける
    const bust = `?_=${Date.now()}`;
    const [manifestRes, tagsRes, articlesRes] = await Promise.all([
      fetch('../data/manifest.json' + bust, { cache: 'no-store' }),
      fetch('../data/tags.json' + bust, { cache: 'no-store' }),
      fetch('../data/articles.json' + bust, { cache: 'no-store' }),
    ]);
    const manifest = await manifestRes.json();
    const tagsData = await tagsRes.json();
    const articlesData = await articlesRes.json();
    DATA.articles = articlesData.articles || [];
    DATA.articleAuthor = articlesData.author || {};
    try {
      const updRes = await fetch('../data/updates.json' + bust, { cache: 'no-store' });
      DATA.updates = await updRes.json();
    } catch { DATA.updates = []; }
    try {
      const erasRes = await fetch('../data/eras.json' + bust, { cache: 'no-store' });
      const erasData = await erasRes.json();
      DATA.eraCategories = erasData.categories || [];
    } catch { DATA.eraCategories = []; }
    DATA.tags = tagsData.categories;
    DATA.tagMap = Object.fromEntries(DATA.tags.map(t => [t.id, t]));

    // バンドルを先に試す（163個別fetch→1個に集約で初回ロードが劇的に軽い）
    let people = null;
    try {
      const bundleRes = await fetch(`../data/people-bundle.json${bust}`, { cache: 'no-store' });
      if (bundleRes.ok) {
        const bundle = await bundleRes.json();
        if (Array.isArray(bundle.people) && bundle.people.length) people = bundle.people;
      }
    } catch {}
    // バンドルが無い/壊れている場合は従来の個別fetchにフォールバック
    if (!people) {
      people = await Promise.all(
        manifest.people.map(id => fetch(`../data/people/${id}.json${bust}`, { cache: 'no-store' }).then(r => r.json()))
      );
    }
    DATA.people = people;
  } catch (e) {
    document.getElementById('peopleList').innerHTML =
      `<div class="empty">データの読み込みに失敗しました。<br><br>この画面は <b>http サーバー経由</b> で開く必要があります。<br><br>PCで <code>run.bat</code> をダブルクリックしてください。</div>`;
    console.error(e);
  }
}

// ====================== カテゴリ分類 ======================
// ====================== traitsの自動カテゴリ分類 ======================
// likes/dislikesに含まれる項目を分類。人名は除外（'person'カテゴリに入るが表示側でスキップ）
function classifyTraitItems(items) {
  const cats = { person: [], nature: [], art: [], abstract: [], daily: [], activity: [], other: [] };
  if (!Array.isArray(items)) return cats;

  // 人名パターン（カタカナ連続・日本の姓名・よくある呼び方）
  const isPerson = (s) => {
    const str = String(s).trim();
    if (!str) return false;
    // 既に登録されている偉人の名前と一致（完全一致or部分一致）
    if ((DATA.people || []).some(p => str === p.name || str.includes(p.name) || (p.name && p.name.includes(str) && p.name.length <= str.length + 4))) return true;
    // カタカナだけで構成される短い語（3〜18文字、姓名パターン）— ただし「フランス料理」等は料理として除外
    if (/^[ァ-ヶー・\s]+$/.test(str) && str.length >= 3 && str.length <= 18) {
      if (/料理|音楽|文学|絵画|主義|風|旅行|工芸|舞踊|演劇|哲学|科学/.test(str)) return false;
      return true;
    }
    // 「〜公」「〜卿」「〜伯」「〜夫人」「〜王」「〜将軍」等の敬称
    if (/(公|卿|伯|夫人|王$|女王|皇后|将軍|天皇|殿|家族|奥様|氏$|さん$|様$|先生)/.test(str)) return true;
    // 明らかな人名語（「信長」「家康」等の2-4字の和名）+ 頻出人物語
    if (/ショパン|ブラームス|モーツァルト|ゲーテ|シラー|ソクラテス|プラトン|カント|ニーチェ|ドストエフスキー|ヘーゲル|ヴィーク|サンド|クララ|テレーズ|バイロン|ロルカ/.test(str)) return true;
    return false;
  };

  // 分類パターン
  const NATURE = /自然|花|星|月|海|山|森|空|雲|川|湖|鳥|動物|猫|犬|馬|庭|風|水|緑|光|朝|夜|四季|春|夏|秋|冬|雪|雨|霧|桜|虹|潮|波|太陽|土|大地|森林/;
  const ART = /音楽|芸術|文学|絵|絵画|詩|小説|本|書物|読書|映画|演劇|演奏|ピアノ|バイオリン|オペラ|交響|建築|彫刻|舞台|アート|書|歌|曲|詩/;
  const ABSTRACT = /自由|真理|美|善|正義|平和|愛|希望|未来|夢|信仰|神|魂|孤独|静寂|誠実|尊厳|勇気|調和|永遠|理性|知識|思索|思考|哲学|宗教|価値観/;
  const DAILY = /コーヒー|紅茶|茶|酒|ワイン|ビール|パン|散歩|休日|手紙|日記|睡眠|眠り|朝食|昼食|夕食|おやつ|菓子|甘|食事|暮らし|家|部屋|家庭|匂い|香り/;
  const ACTIVITY = /旅|旅行|登山|釣り|狩り|狩猟|ハイキング|運動|ランニング|ジョギング|水泳|泳|瞑想|ヨガ|スポーツ|ゲーム|チェス|将棋|囲碁|麻雀|カード|談話|会話|集会/;

  items.forEach(raw => {
    const s = String(raw || '').trim();
    if (!s) return;
    if (isPerson(s)) { cats.person.push(s); return; }
    if (NATURE.test(s)) cats.nature.push(s);
    else if (ART.test(s)) cats.art.push(s);
    else if (ABSTRACT.test(s)) cats.abstract.push(s);
    else if (ACTIVITY.test(s)) cats.activity.push(s);
    else if (DAILY.test(s)) cats.daily.push(s);
    else cats.other.push(s);
  });
  return cats;
}

// 紀元前/紀元後の年表記フォーマット
function fmtYear(y) {
  if (y === null || y === undefined || y === '') return '';
  const n = Number(y);
  if (Number.isNaN(n)) return String(y);
  return n < 0 ? `紀元前${Math.abs(n)}` : String(n);
}
function fmtYearRange(birth, death) {
  const b = (birth === null || birth === undefined || birth === '') ? '?' : fmtYear(birth);
  const d = (death === null || death === undefined || death === '') ? '' : fmtYear(death);
  return `${b}–${d}`;
}

const CATEGORY_RULES = [
  { id: 'music',    name: '音楽家',   match: (f) => /作曲家|ピアニスト|演奏家|音楽|指揮者/.test(f) },
  { id: 'philo',    name: '哲学者',   match: (f) => /哲学/.test(f) },
  { id: 'literature', name: '文学者', match: (f) => /小説家|作家|詩人|文学者|歌人|俳人|劇作家/.test(f) },
  { id: 'art',      name: '画家',     match: (f) => /画家|彫刻家|美術/.test(f) },
  { id: 'science',  name: '科学者',   match: (f) => /科学|数学者|物理学者|生物学者|医師|医学|天文/.test(f) },
  { id: 'history',  name: '歴史',     match: (f) => /武士|武将|志士|藩士|政治家|軍人|大名|局長|副長|戦国|維新|幕末/.test(f) },
  { id: 'business', name: '経営者',   match: (f) => /実業家|経営者|起業家|投資家|ビジネス|商人|豪商/.test(f) },
  { id: 'horse_racing', name: '競馬', match: (f) => /騎手|競走馬|ジョッキー/.test(f) },
  { id: 'cooking',  name: '料理人',   match: (f) => /料理人|シェフ|料理家|美食家|料理研究家|chef|Chef/.test(f) },
];
function categoryOf(field) {
  for (const r of CATEGORY_RULES) if (r.match(field || '')) return r.id;
  return 'other';
}
const CAT_NAME = Object.fromEntries(CATEGORY_RULES.map(r => [r.id, r.name]).concat([['other', 'その他']]));

let currentCategory = 'all';
let currentSearch = '';
let currentEra = 'all';
let currentSort = 'birth_asc'; // birth_asc | birth_desc | name

// ====================== 時代（カテゴリ別に異なるセット） ======================
// 各ルールは { id, name, match(birth_year) }
const ERA_RULES = {
  music: [
    { id: 'baroque',  name: 'バロック',   match: (b) => b && b < 1750 },
    { id: 'classical',name: '古典派',     match: (b) => b >= 1730 && b < 1810 },
    { id: 'romantic', name: 'ロマン派',   match: (b) => b >= 1800 && b < 1870 },
    { id: 'late_rom', name: '後期ロマン派',match:(b) => b >= 1860 && b < 1890 },
    { id: 'modern',   name: '近現代',     match: (b) => b >= 1880 },
  ],
  philo: [
    { id: 'ancient',  name: '古代',       match: (b) => b && b < 500 },
    { id: 'medieval', name: '中世',       match: (b) => b >= 500 && b < 1500 },
    { id: 'early_mod',name: '近世',       match: (b) => b >= 1500 && b < 1780 },
    { id: 'modern_p', name: '近代',       match: (b) => b >= 1780 && b < 1900 },
    { id: 'contemp',  name: '現代',       match: (b) => b >= 1900 },
  ],
  literature: [
    { id: 'edo',       name: '江戸以前',  match: (b) => b && b < 1850 },
    { id: 'meiji',     name: '明治・大正',match: (b) => b >= 1850 && b < 1912 },
    { id: 'showa',     name: '昭和',      match: (b) => b >= 1912 && b < 1950 },
    { id: 'heisei',    name: '戦後・現代',match: (b) => b >= 1950 },
  ],
  art: [
    { id: 'renaissance', name: 'ルネサンス',  match: (b) => b && b < 1600 },
    { id: 'classic_art', name: '古典',        match: (b) => b >= 1600 && b < 1800 },
    { id: 'impress',     name: '印象派',      match: (b) => b >= 1800 && b < 1870 },
    { id: 'post_impress',name: '後期印象派〜', match: (b) => b >= 1850 && b < 1900 },
    { id: 'modern_art',  name: '近現代',      match: (b) => b >= 1880 },
  ],
  history: [
    { id: 'sengoku', name: '戦国',         match: (b) => b >= 1500 && b < 1615 },
    { id: 'edo_h',   name: '江戸',         match: (b) => b >= 1600 && b < 1830 },
    { id: 'bakumatsu',name: '幕末',        match: (b) => b >= 1830 && b < 1868 },
    { id: 'meiji_h', name: '明治以降',     match: (b) => b >= 1868 },
  ],
  science: [
    { id: 'pre_modern_s', name: '近代以前', match: (b) => b && b < 1800 },
    { id: 'modern_s',     name: '近代',     match: (b) => b >= 1800 && b < 1900 },
    { id: 'contemp_s',    name: '現代',     match: (b) => b >= 1900 },
  ],
  business: [
    { id: 'edo_merchant',    name: '江戸の豪商',     match: (b) => b && b < 1830 },
    { id: 'meiji_industry',  name: '明治・産業勃興', match: (b) => b >= 1830 && b < 1880 },
    { id: 'postwar_makers',  name: '戦後ものづくり', match: (b) => b >= 1880 && b < 1940 },
    { id: 'tech_era',        name: 'テック時代',     match: (b) => b >= 1940 },
  ],
  cooking: [
    { id: 'pre_modern_cook', name: '近代以前',   match: (b) => b && b < 1850 },
    { id: 'modern_cook',     name: '近代',       match: (b) => b >= 1850 && b < 1920 },
    { id: 'contemp_cook',    name: '現代',       match: (b) => b >= 1920 },
  ],
  horse_racing: [
    { id: 'showa_jockey',   name: '昭和の名騎手', match: (b) => b && b < 1960 },
    { id: 'heisei_jockey',  name: '平成の名騎手', match: (b) => b >= 1960 && b < 1990 },
    { id: 'reiwa_jockey',   name: '令和の新世代', match: (b) => b >= 1990 },
  ],
};
function eraOf(category, birth) {
  const rules = ERA_RULES[category];
  if (!rules) return null;
  for (const r of rules) if (r.match(birth)) return r.id;
  return null;
}

// ====================== お気に入り (localStorage) ======================
const FAV_KEY_PEOPLE = 'ijin_fav_people';
const FAV_KEY_EVENTS = 'ijin_fav_events';
const FAV_KEY_QUOTES = 'ijin_fav_quotes';
const FAV_KEY_ROUTINES = 'ijin_fav_routines';
const FAV_KEY_WORKS = 'ijin_fav_works';
const MY_ROUTINE_KEY = 'ijin_my_routine';
const USER_NAME_KEY = 'ijin_user_name';

function getUserName() {
  let v = localStorage.getItem(USER_NAME_KEY) || '';
  // Firestore同期で二重stringifyされてクオート付きになった値を修復
  while (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try { v = JSON.parse(v); } catch { break; }
  }
  return v;
}
function setUserName(name) {
  if (name && name.trim()) localStorage.setItem(USER_NAME_KEY, name.trim());
  else localStorage.removeItem(USER_NAME_KEY);
  // 即時Firestore同期（リロード時の上書き防止）
  if (typeof window.pushToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
    window.pushToCloud(currentUser).catch(() => {});
  }
}

const MAX_ROUTINE_SLOTS = 3;
const DEFAULT_SLOT_NAMES = ['平日のわたし', '休日のわたし', '理想のわたし'];

function loadRoutineStore() {
  try {
    const raw = localStorage.getItem(MY_ROUTINE_KEY);
    if (!raw) return { active: 0, slots: DEFAULT_SLOT_NAMES.map(name => ({ name, entries: [] })) };
    const parsed = JSON.parse(raw);
    // 旧形式（ただの配列）→ 新形式に移行
    if (Array.isArray(parsed)) {
      return { active: 0, slots: [
        { name: DEFAULT_SLOT_NAMES[0], entries: parsed },
        { name: DEFAULT_SLOT_NAMES[1], entries: [] },
        { name: DEFAULT_SLOT_NAMES[2], entries: [] },
      ]};
    }
    // 不足するスロットを埋める
    while (parsed.slots.length < MAX_ROUTINE_SLOTS) {
      parsed.slots.push({ name: DEFAULT_SLOT_NAMES[parsed.slots.length] || 'わたし', entries: [] });
    }
    return parsed;
  } catch {
    return { active: 0, slots: DEFAULT_SLOT_NAMES.map(name => ({ name, entries: [] })) };
  }
}
function saveRoutineStore(store) {
  localStorage.setItem(MY_ROUTINE_KEY, JSON.stringify(store));
}
// 現在アクティブなルーティン配列を返す（後方互換）
function loadMyRoutine() {
  const store = loadRoutineStore();
  return store.slots[store.active]?.entries || [];
}
function saveMyRoutine(entries) {
  const store = loadRoutineStore();
  store.slots[store.active].entries = entries;
  saveRoutineStore(store);
}
const DIARY_KEY = 'ijin_diary';
const NOTES_KEY = 'ijin_notes';

function loadDiary() {
  try {
    const arr = JSON.parse(localStorage.getItem(DIARY_KEY) || '[]');
    // id重複 or (同一 text+date) 重複を除去（過去の同期バグ対策）
    const seen = new Set();
    const seenKey = new Set();
    const clean = [];
    for (const e of arr) {
      if (!e) continue;
      const key = (e.text || '') + '|' + (e.date || '');
      if (e.id && seen.has(e.id)) continue;
      if (seenKey.has(key)) continue;
      if (e.id) seen.add(e.id);
      seenKey.add(key);
      clean.push(e);
    }
    if (clean.length !== arr.length) {
      localStorage.setItem(DIARY_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch { return []; }
}
function saveDiary(entries) {
  localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
}
function addDiaryEntry(text) {
  if (!text || !text.trim()) return;
  const entries = loadDiary();
  entries.unshift({
    id: 't' + Date.now(),
    text: text.trim(),
    date: new Date().toISOString(),
  });
  saveDiary(entries);
}
function deleteDiaryEntry(id) {
  saveDiary(loadDiary().filter(e => e.id !== id));
}

// 付箋（出来事ごとに貼るメモ）
function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); }
  catch { return {}; }
}
function saveNotes(obj) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(obj));
}
function getNote(key) {
  return loadNotes()[key] || '';
}
function setNote(key, text) {
  const all = loadNotes();
  if (text && text.trim()) all[key] = text.trim();
  else delete all[key];
  saveNotes(all);
}

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
}
function saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}
const favPeople = loadSet(FAV_KEY_PEOPLE);
const favEvents = loadSet(FAV_KEY_EVENTS);
const favQuotes = loadSet(FAV_KEY_QUOTES);
const favRoutines = loadSet(FAV_KEY_ROUTINES);
const favWorks = loadSet(FAV_KEY_WORKS);

function isFavRoutine(id) { return favRoutines.has(id); }
function favRoutineBtn(id) {
  const on = isFavRoutine(id);
  return `<button class="fav-btn ${on ? 'active' : ''}" data-fav-routine="${id}" aria-label="お気に入り">${on ? '★' : '☆'}</button>`;
}
// 作品（本・曲・絵画）のお気に入り
function workKey(personId, work) {
  return `${personId}::${work.title.substring(0,40)}`;
}
function isFavWork(personId, work) { return favWorks.has(workKey(personId, work)); }
function favWorkBtn(personId, work) {
  const on = isFavWork(personId, work);
  return `<button class="fav-btn work-fav-btn ${on ? 'active' : ''}" data-fav-work="${workKey(personId, work)}" aria-label="お気に入り" onclick="event.stopPropagation()">${on ? '🔖' : '📑'}</button>`;
}

function quoteKey(personId, quote) {
  return `${personId}::${quote.text.substring(0, 50)}`;
}
function isFavQuote(personId, quote) { return favQuotes.has(quoteKey(personId, quote)); }
function favQuoteBtn(personId, quote) {
  const on = isFavQuote(personId, quote);
  const person = (DATA.people || []).find(p => p.id === personId);
  const personName = person?.name || '';
  const pin = (typeof phonePinBtn === 'function') ? phonePinBtn(personId, quote, personName) : '';
  return `<span class="quote-actions">
    <button class="fav-btn ${on ? 'active' : ''}" data-fav-quote="${quoteKey(personId, quote)}" aria-label="お気に入り">${on ? '★' : '☆'}</button>
    ${pin}
  </span>`;
}

// イベントを識別するキー = personId + year + title
function eventKey(personId, event) {
  return `${personId}::${event.year}::${event.title}`;
}
function isFavPerson(id) { return favPeople.has(id); }
function isFavEvent(personId, event) { return favEvents.has(eventKey(personId, event)); }
function toggleFavPerson(id) {
  const wasFollowing = favPeople.has(id);
  if (wasFollowing) favPeople.delete(id); else favPeople.add(id);
  saveSet(FAV_KEY_PEOPLE, favPeople);
  // ユーザーが解除した時刻を記録（内部リムーブ判定で使用）
  try {
    const map = JSON.parse(localStorage.getItem('ijin_unfollowed_at') || '{}');
    if (wasFollowing) map[id] = Date.now();
    else delete map[id];
    localStorage.setItem('ijin_unfollowed_at', JSON.stringify(map));
  } catch {}
  // フォロー追加時: フォローバック条件を再評価
  // フォロー解除時: 前提条件（現在フォロー中）が崩れるので forcedFollows からも即除外
  try {
    if (!wasFollowing && typeof checkFollowBackEligibility === 'function') {
      checkFollowBackEligibility(id);
    }
    if (wasFollowing) {
      // 現在フォローしていないユーザーは、他の条件を満たしていてもフォローバック対象外。
      // したがって forcedFollows からも即座に除外する（時間経過を待たない）。
      try {
        const set = loadForcedFollows();
        if (set.has(id)) {
          set.delete(id);
          saveForcedFollows(set);
        }
      } catch {}
      if (typeof runFollowBackRemoval === 'function') runFollowBackRemoval();
    }
  } catch {}
}
function toggleFavEvent(personId, event) {
  const k = eventKey(personId, event);
  if (favEvents.has(k)) favEvents.delete(k); else favEvents.add(k);
  saveSet(FAV_KEY_EVENTS, favEvents);
  // いいね数更新 → フォローバック条件を再評価
  try { if (typeof checkFollowBackEligibility === 'function') checkFollowBackEligibility(personId); } catch {}
}

// ====================== ビュー切替 ======================
const views = ['people', 'tags', 'history', 'routines', 'articles', 'favorites', 'person', 'tag'];
const tabViewNames = ['people', 'tags', 'history', 'routines', 'articles', 'favorites'];
const history = [];

function showView(name, pushHistory = true) {
  if (pushHistory && history[history.length - 1] !== name) {
    history.push(name);
    // 新しい場所へ移動したら forward stack をクリア
    if (typeof forwardStack !== 'undefined') forwardStack.length = 0;
  }
  try { updateNavButtons?.(); } catch {}
  // わたしの本タブは背景画像なし（独自の本デザインを活かす）
  document.documentElement.classList.toggle('view-no-bg', name === 'favorites');
  // スマホが閉じている or 閉じる遷移中ならノイズ停止（安全網）
  try {
    const menu = document.getElementById('phoneMenu');
    if (!menu || !menu.classList.contains('open')) {
      if (typeof stopPhoneAmbience === 'function') stopPhoneAmbience();
    }
  } catch {}
  // レキットはホーム画面のみ表示
  const rabin = document.getElementById('powerHintAnim');
  if (rabin) rabin.hidden = (name !== 'people');
  const intro = document.getElementById('welcomeIntro');
  if (intro && name !== 'people') intro.hidden = true;
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    const isActive = v === name;
    el.classList.toggle('active', isActive);
    if (isActive) {
      el.classList.add('fade-enter');
      setTimeout(() => el.classList.remove('fade-enter'), 500);
    }
  });
  document.getElementById('tabs').classList.toggle('hidden', !tabViewNames.includes(name));
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === name);
  });
  document.getElementById('backBtn').classList.toggle('visible', history.length > 1);
  // ヘッダーは常にロゴ画像を保持（テキスト上書きするとimgが消える）
  window.scrollTo(0, 0);
  document.getElementById('main').scrollTo(0, 0);
  // person/tag 以外に遷移したら URL のparamを整理
  if (name !== 'person' && name !== 'tag') {
    try {
      const url = new URL(location.href);
      let dirty = false;
      ['person','era','cat','tag'].forEach(k => { if (url.searchParams.has(k)) { url.searchParams.delete(k); dirty = true; } });
      if (dirty) history.replaceState(null, '', url.toString());
    } catch {}
  }
  // ビュー別BGMを排他的に切替
  // person / tag 詳細はbook open演出の静寂を優先（showPersonで stopAllBgm されている）
  // ミュート中 or スマホメニューが開いているときは何もしない
  try {
    const phoneOpen = document.getElementById('phoneMenu')?.classList.contains('open');
    if (phoneOpen) return; // スマホ開いてる間はview BGM触らない（ambienceと干渉）
    if (name === 'person' || name === 'tag') return; // 書物の静寂を尊重
    const BGM_BY_VIEW = {
      people: 'homeBgm', tags: 'searchBgm', history: 'historyBgm',
      routines: 'routineBgm', articles: 'blogBgm', favorites: 'favoritesBgm',
    };
    const targetId = BGM_BY_VIEW[name] || 'homeBgm';
    if (typeof playViewBgmExclusive === 'function') playViewBgmExclusive(targetId);
  } catch {}
}

// Forward stack（戻ったビューを保持して進むボタンで再訪）
const forwardStack = [];
function goBack() {
  if (history.length > 1) {
    const cur = history.pop();
    forwardStack.push(cur);
    showView(history[history.length - 1], false);
    updateNavButtons();
  }
}
function goForward() {
  if (forwardStack.length > 0) {
    const next = forwardStack.pop();
    history.push(next);
    showView(next, false);
    updateNavButtons();
  }
}
function updateNavButtons() {
  const back = document.getElementById('floatBackBtn');
  const fwd = document.getElementById('floatForwardBtn');
  if (back) back.classList.toggle('disabled', history.length <= 1);
  if (fwd) fwd.classList.toggle('disabled', forwardStack.length === 0);
}

// ====================== HTML パーツ ======================
function avatarHtml(p, size = 'sm') {
  const cls = size === 'lg' ? 'avatar-lg' : 'person-avatar';
  if (p.imageUrl) {
    return `<div class="${cls} has-image" style="background-image:url('${p.imageUrl}')"></div>`;
  }
  return `<div class="${cls}">${p.name.charAt(0)}</div>`;
}

function favPersonBtn(id) {
  const on = isFavPerson(id);
  return `<button class="fav-btn ${on ? 'active' : ''}" data-fav-person="${id}" aria-label="お気に入り">${on ? '★' : '☆'}</button>`;
}
function favEventBtn(personId, event) {
  const on = isFavEvent(personId, event);
  return `<button class="fav-btn ${on ? 'active' : ''}" data-fav-event="${eventKey(personId, event)}" aria-label="お気に入り">${on ? '★' : '☆'}</button>`;
}

// ====================== ホーム: 今日の言葉 ======================
function pickSeeded(arr, seed) {
  if (arr.length === 0) return null;
  return arr[seed % arr.length];
}
function daySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function renderQuoteOfTheDay() {
  const container = document.getElementById('quoteOfTheDay');
  if (!container) return;
  const all = [];
  DATA.people.forEach(p => {
    (p.quotes || []).forEach(q => all.push({ person: p, quote: q }));
  });
  if (all.length === 0) { container.innerHTML = ''; return; }
  const pick = pickSeeded(all, daySeed());
  const qk = quoteKey(pick.person.id, pick.quote);
  const faved = favQuotes.has(qk);
  const collectedCount = favQuotes.size;
  const avatar = pick.person.imageUrl
    ? `<div class="qod-avatar" style="background-image:url('${pick.person.imageUrl}')"></div>`
    : `<div class="qod-avatar qod-avatar-noimg">${pick.person.name.charAt(0)}</div>`;
  container.innerHTML = `
    <div class="quote-of-the-day">
      <button class="qod-fav ${faved ? 'active' : ''}" data-qod-fav="${qk}" aria-label="お気に入り">${faved ? '★' : '☆'}</button>
      <div class="qod-text">${pick.quote.text}</div>
      <div class="qod-attrib" data-id="${pick.person.id}">
        ${avatar}
        <div class="qod-attrib-text">
          <span class="qod-name">— ${pick.person.name}</span>
          ${pick.quote.source ? `<span class="qod-source">(${pick.quote.source})</span>` : ''}
        </div>
      </div>
      ${collectedCount > 0 ? `
        <button class="qod-collection-link" data-open-quotes="1">
          ☆ 集めた言葉 ${collectedCount} →
        </button>
      ` : ''}
    </div>
  `;
  container.querySelector('.qod-attrib').addEventListener('click', (e) => {
    showPerson(e.currentTarget.dataset.id);
  });
  const fb = container.querySelector('[data-qod-fav]');
  fb.addEventListener('click', (e) => {
    e.stopPropagation();
    const key = fb.dataset.qodFav;
    if (favQuotes.has(key)) { favQuotes.delete(key); fb.classList.remove('active'); fb.textContent = '☆'; }
    else { favQuotes.add(key); fb.classList.add('active'); fb.textContent = '★'; }
    saveSet(FAV_KEY_QUOTES, favQuotes);
    renderQuoteOfTheDay();
  });
  // 集めた言葉へジャンプ
  const col = container.querySelector('[data-open-quotes]');
  if (col) col.addEventListener('click', () => {
    showView('favorites');
    // チャプターへスクロール
    setTimeout(() => {
      const el = document.getElementById('chap-quotes');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  });
}

// ====================== ホーム: 今日の一人 ======================
const OSHI_KEY = 'ijin_oshi_person';

// スマホ上部に表示する好きな言葉（最大3つ、ランダム表示）
const PHONE_PINNED_QUOTES_KEY = 'ijin_phone_pinned_quotes';
const PHONE_PINNED_MAX = 3;
function loadPhonePinnedQuotes() {
  try { return JSON.parse(localStorage.getItem(PHONE_PINNED_QUOTES_KEY) || '[]'); }
  catch { return []; }
}
function savePhonePinnedQuotes(arr) {
  localStorage.setItem(PHONE_PINNED_QUOTES_KEY, JSON.stringify(arr));
  if (typeof window.pushToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
    window.pushToCloud(currentUser).catch(() => {});
  }
}
function isPhonePinned(personId, quoteText) {
  return loadPhonePinnedQuotes().some(q => q.personId === personId && q.text === quoteText);
}
function togglePhonePinQuote(personId, quoteText, personName) {
  let pins = loadPhonePinnedQuotes();
  const idx = pins.findIndex(q => q.personId === personId && q.text === quoteText);
  if (idx >= 0) {
    pins.splice(idx, 1);
    savePhonePinnedQuotes(pins);
    return { removed: true };
  }
  if (pins.length >= PHONE_PINNED_MAX) {
    // 3つ超えたらどれを消すかポップアップ
    openPhonePinRemoveModal(pins, () => {
      // 再度追加を試みる（ポップアップで消したあと）
      const remaining = loadPhonePinnedQuotes();
      if (remaining.length < PHONE_PINNED_MAX) {
        remaining.push({ personId, text: quoteText, personName, at: Date.now() });
        savePhonePinnedQuotes(remaining);
        try { window.renderPhoneQuoteBanner?.(); } catch {}
      }
      // 関連するボタンUIを更新
      document.querySelectorAll(`[data-phone-pin][data-pid="${personId}"]`).forEach(b => {
        const on = isPhonePinned(personId, b.dataset.qtext || quoteText);
        b.classList.toggle('active', on);
        b.textContent = on ? '💎' : '🤍';
      });
    });
    return { deferred: true };
  }
  pins.push({ personId, text: quoteText, personName, at: Date.now() });
  savePhonePinnedQuotes(pins);
  return { added: true };
}
function openPhonePinRemoveModal(pins, onDone) {
  const existing = document.getElementById('phonePinRemoveModal');
  if (existing) existing.remove();
  const m = document.createElement('div');
  m.id = 'phonePinRemoveModal';
  m.className = 'settings-modal open';
  m.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <div class="settings-head">💎 好きな言葉は3つまで</div>
      <div class="settings-sec-hint">どれを外しますか？（外した枠に新しい言葉が入ります）</div>
      <div class="phone-pin-remove-list">
        ${pins.map((q, i) => `
          <button class="phone-pin-remove-item" data-remove-idx="${i}">
            <div class="phone-pin-remove-text">「${escapeHtml(q.text)}」</div>
            <div class="phone-pin-remove-src">— ${escapeHtml(q.personName || '')}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  m.querySelectorAll('[data-remove-idx]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.removeIdx, 10);
      const cur = loadPhonePinnedQuotes();
      cur.splice(idx, 1);
      savePhonePinnedQuotes(cur);
      close();
      onDone?.();
    });
  });
}
// スマホピンボタン用HTML
function phonePinBtn(personId, quote, personName) {
  const on = isPhonePinned(personId, quote.text);
  return `<button class="phone-pin-btn ${on ? 'active' : ''}" data-phone-pin="1" data-pid="${personId}" data-qtext="${escapeHtml(quote.text).replace(/"/g,'&quot;')}" data-pname="${escapeHtml(personName || '')}" title="スマホに表示する言葉に登録（最大3つ）" aria-label="スマホに表示">${on ? '💎' : '🤍'}</button>`;
}
window.phonePinBtn = phonePinBtn;
window.loadPhonePinnedQuotes = loadPhonePinnedQuotes;
const MOOD_PICK_KEY = 'ijin_mood_pick'; // {date, tagId, personId, chatStart}
const CHAT_REPLIES_KEY = 'ijin_chat_replies'; // {personId: [{msgKey, text, date}]}

function loadReplies() {
  try { return JSON.parse(localStorage.getItem(CHAT_REPLIES_KEY) || '{}'); }
  catch { return {}; }
}
function saveReplies(obj) { localStorage.setItem(CHAT_REPLIES_KEY, JSON.stringify(obj)); }
function addReply(personId, msgKey, text) {
  const all = loadReplies();
  if (!all[personId]) all[personId] = [];
  all[personId].push({ msgKey, text: text.trim(), date: new Date().toISOString() });
  saveReplies(all);
}
function getRepliesFor(personId) { return loadReplies()[personId] || []; }

function getOshi() { return localStorage.getItem(OSHI_KEY) || ''; }
function setOshi(id) {
  if (id) localStorage.setItem(OSHI_KEY, id);
  else localStorage.removeItem(OSHI_KEY);
}

function renderPersonCard(pick, label) {
  const img = pick.imageUrl
    ? `<div class="potd-image" style="background-image:url('${pick.imageUrl}')"></div>`
    : `<div class="potd-image no-image">${pick.name.charAt(0)}</div>`;
  return `
    <div class="person-of-the-day" data-id="${pick.id}">
      ${img}
      <div class="potd-content">
        <div class="potd-label-line">${label}</div>
        <div class="potd-name">${pick.name}</div>
        <div class="potd-meta">${fmtYearRange(pick.birth, pick.death)} ／ ${pick.country} ／ ${pick.field}</div>
        <div class="potd-summary">${pick.summary}</div>
      </div>
    </div>
  `;
}

// 日付を数値化（YYYYMMDD → 整数）。日本時間で「今日」を判定
function todaySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ====================== あなたに似た偉人（趣味・好きなもの） ======================
const MY_TRAITS_KEY = 'ijin_my_traits';
function loadMyTraits() {
  try { return JSON.parse(localStorage.getItem(MY_TRAITS_KEY) || '{}'); }
  catch { return {}; }
}
function saveMyTraits(obj) {
  localStorage.setItem(MY_TRAITS_KEY, JSON.stringify(obj));
  if (typeof window.pushToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
    window.pushToCloud(currentUser).catch(() => {});
  }
}

// DBから全traitの選択肢を集計（＋ユーザー向けの普遍的な選択肢を合成）
// カテゴリごとにサブグループを持たせる
const TRAIT_GROUPS = {
  foods: [
    { label: '🍷 飲み物', items: ['コーヒー','紅茶','緑茶','ワイン','ビール','日本酒','ウイスキー','シャンパン','濃いコーヒー','水','牛乳'] },
    { label: '🍚 主食', items: ['パン','ご飯','麺類','寿司','ラーメン','パスタ','ピザ','カレー','黒パン','うどん','そば'] },
    { label: '🍱 料理ジャンル', items: ['和食','洋食','中華','フランス料理','イタリア料理','エスニック','ロシア料理','オランダ料理'] },
    { label: '🍖 食材・食事スタイル', items: ['肉料理','魚料理','野菜','果物','ステーキ','オリーブ','スープ','卵料理','菜食主義','朝食をしっかり','質素な食事','外食','自炊'] },
    { label: '🍰 甘いもの', items: ['チョコレート','スイーツ','アイスクリーム','チーズ','タバコ'] },
  ],
  hobbies: [
    { label: '📖 文化・芸術', items: ['読書','映画鑑賞','音楽鑑賞','楽器演奏','歌う','絵を描く','写真','書道','演劇鑑賞','ライブ・コンサート','美術館・博物館','詩を書く','日記を書く','手紙を書く'] },
    { label: '🏃 運動・アウトドア', items: ['散歩','ランニング','筋トレ','ヨガ','瞑想','登山','サイクリング','水泳','旅行','温泉・銭湯','ハイキング'] },
    { label: '🎨 制作・生活', items: ['料理','お菓子作り','ガーデニング','園芸','ペットと過ごす','カフェ巡り'] },
    { label: '🎲 遊び', items: ['ゲーム','将棋・囲碁','チェス','パズル','カードゲーム','賭博'] },
    { label: '📱 デジタル', items: ['SNS','YouTube','ポッドキャスト'] },
    { label: '☀️ リズム', items: ['早起き','夜更かし','友人と語らう','一人で過ごす'] },
  ],
  likes: [
    { label: '🌿 自然・風景', items: ['自然','海','山','森','川','星空','満月','朝日','夕焼け','雨の音','雪'] },
    { label: '🎵 音楽', items: ['音楽','クラシック音楽','ジャズ','ポップス','ロック','和楽器の音'] },
    { label: '📚 文学・学問', items: ['文学','詩','小説','エッセイ','漫画','古典','哲学','数学','科学','歴史','語学'] },
    { label: '🐾 動植物', items: ['犬','猫','鳥','花','植物','観葉植物'] },
    { label: '👥 人・関係', items: ['家族','友人','恋人','仲間'] },
    { label: '🧘 時間・場所', items: ['静けさ','一人の時間','旅','見知らぬ街','古い建物','図書館','本屋'] },
    { label: '✨ 価値観', items: ['挑戦','創作','学び','自由','美しいもの','シンプルなもの'] },
  ],
  dislikes: [
    { label: '🔊 環境', items: ['騒音','人混み','満員電車','急かされること','ルーティン','暗い場所'] },
    { label: '🗣 人間関係', items: ['嘘','偽善','裏切り','陰口','マウント','詮索','無関心','冷笑'] },
    { label: '💼 仕事・生活', items: ['早起き','夜更かし','残業','会議','書類仕事','見栄','贅沢な浪費'] },
    { label: '😱 恐怖', items: ['虫','爬虫類','高所','閉所'] },
    { label: '⚡ 理不尽', items: ['怒号','威圧','暴力','戦争','差別','理不尽','依存'] },
  ],
};
// フラットアクセス用のエイリアス
const CURATED_TRAIT_OPTIONS = Object.fromEntries(
  Object.entries(TRAIT_GROUPS).map(([cat, groups]) => [cat, groups.flatMap(g => g.items)])
);
function collectAllTraitOptions() {
  const counts = { foods: {}, hobbies: {}, likes: {}, dislikes: {} };
  // 偉人名の集合（選択肢として混入した偉人名を除外するため）
  const personNames = new Set();
  (DATA.people || []).forEach(p => {
    if (p.name) {
      personNames.add(p.name);
      p.name.split(/[・\s]/).filter(s => s && s.length >= 2).forEach(part => personNames.add(part));
    }
    if (p.nameEn) personNames.add(p.nameEn);
  });
  const isPersonNameLike = (s) => {
    for (const nm of personNames) { if (nm && s.includes(nm)) return true; }
    return false;
  };
  (DATA.people || []).forEach(p => {
    const t = p.traits;
    if (!t) return;
    ['foods', 'hobbies', 'likes', 'dislikes'].forEach(cat => {
      (t[cat] || []).forEach(item => {
        if (typeof item !== 'string' || !item.trim()) return;
        if (isPersonNameLike(item)) return; // 偉人名を含む選択肢は除外
        counts[cat][item] = (counts[cat][item] || 0) + 1;
      });
    });
  });
  // 出現1回以上も含めて出現数でソート、上位のみ
  const topFromDb = (obj, n) => Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
  const merge = (cat, dbLimit, curated) => {
    const fromDb = topFromDb(counts[cat], dbLimit);
    const seen = new Set(fromDb);
    // 偉人固有じゃない普遍選択肢を合成
    curated.forEach(c => { if (!seen.has(c) && !isPersonNameLike(c)) { fromDb.push(c); seen.add(c); } });
    return fromDb;
  };
  return {
    foods: merge('foods', 30, CURATED_TRAIT_OPTIONS.foods),
    hobbies: merge('hobbies', 30, CURATED_TRAIT_OPTIONS.hobbies),
    likes: merge('likes', 30, CURATED_TRAIT_OPTIONS.likes),
    dislikes: merge('dislikes', 25, CURATED_TRAIT_OPTIONS.dislikes),
  };
}

// 全偉人の出身国（birthplace候補）を集計
function collectCountryOptions() {
  const counts = {};
  (DATA.people || []).forEach(p => {
    if (p.country) counts[p.country] = (counts[p.country] || 0) + 1;
  });
  return Object.entries(counts).sort((a,b) => b[1] - a[1]).map(([k]) => k);
}

function findMatchingPeople(myTraits, limit = 6) {
  const mine = {
    foods: new Set(myTraits.foods || []),
    hobbies: new Set(myTraits.hobbies || []),
    likes: new Set(myTraits.likes || []),
    dislikes: new Set(myTraits.dislikes || []),
  };
  const myBirthM = parseInt(myTraits.birthMonth, 10) || 0;
  const myBirthD = parseInt(myTraits.birthDay, 10) || 0;
  const myCountry = (myTraits.country || '').trim();
  const totalSelected = mine.foods.size + mine.hobbies.size + mine.likes.size + mine.dislikes.size
    + (myBirthM && myBirthD ? 1 : 0) + (myCountry ? 1 : 0);
  if (totalSelected === 0) return [];
  const scored = (DATA.people || []).map(p => {
    const t = p.traits;
    const matches = [];
    let score = 0;
    if (t) {
      ['foods', 'hobbies', 'likes', 'dislikes'].forEach(cat => {
        (t[cat] || []).forEach(item => {
          if (mine[cat].has(item)) {
            score++;
            matches.push({ cat, item });
          }
        });
      });
    }
    if (myBirthM && myBirthD && p.birthMonth === myBirthM && p.birthDay === myBirthD) {
      score += 3;
      matches.push({ cat: 'birth', item: `同じ誕生日 ${myBirthM}/${myBirthD}` });
    }
    if (myCountry && p.country && p.country === myCountry) {
      score++;
      matches.push({ cat: 'country', item: `同郷 ${myCountry}` });
    }
    return { p, score, matches };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

// 誕生日一致する偉人を返す
function findSameBirthdayPeople(month, day) {
  if (!month || !day) return [];
  return (DATA.people || []).filter(p => p.birthMonth === month && p.birthDay === day);
}

function renderTraitsMatch() {
  const container = document.getElementById('traitsMatchSection');
  if (!container || !DATA.people) return;
  const my = loadMyTraits();
  const chipCount = (my.foods || []).length + (my.hobbies || []).length + (my.likes || []).length + (my.dislikes || []).length;
  const profileCount = (my.birthMonth && my.birthDay ? 1 : 0) + (my.country ? 1 : 0);
  const selectedCount = chipCount + profileCount;
  const isLoggedIn = typeof currentUser !== 'undefined' && currentUser;

  const options = collectAllTraitOptions();
  const countryOptions = collectCountryOptions();
  const makeChips = (cat, catLabel) => {
    const selected = new Set(my[cat] || []);
    const renderChipBtn = (opt) => {
      const on = selected.has(opt);
      return `<button class="match-chip ${on ? 'active' : ''}" data-match-chip data-cat="${cat}" data-opt="${escapeHtml(opt)}">${opt}</button>`;
    };
    // TRAIT_GROUPS でサブカテゴリ分けがあれば使う（プロフィール編集と同じ形式）
    const groups = (typeof TRAIT_GROUPS !== 'undefined') ? TRAIT_GROUPS[cat] : null;
    if (groups && groups.length) {
      const grouped = new Set();
      groups.forEach(g => g.items.forEach(i => grouped.add(i)));
      const others = (options[cat] || []).filter(o => !grouped.has(o));
      return `
        <details class="match-cat match-cat-grouped" ${selected.size > 0 ? 'open' : ''}>
          <summary class="match-cat-summary">
            <span class="match-cat-label">${catLabel}</span>
            <span class="match-cat-count">${selected.size}</span>
            <span class="match-cat-arrow">▾</span>
          </summary>
          <div class="match-subcats">
            ${groups.map(g => `
              <div class="match-subcat">
                <div class="match-subcat-label">${g.label}</div>
                <div class="match-chips">${g.items.map(renderChipBtn).join('')}</div>
              </div>
            `).join('')}
            ${others.length ? `
              <div class="match-subcat">
                <div class="match-subcat-label">📌 その他（偉人の好み）</div>
                <div class="match-chips">${others.map(renderChipBtn).join('')}</div>
              </div>
            ` : ''}
          </div>
        </details>
      `;
    }
    return `
      <div class="match-cat">
        <div class="match-cat-label">${catLabel}</div>
        <div class="match-chips">
          ${(options[cat] || []).map(renderChipBtn).join('')}
        </div>
      </div>
    `;
  };

  // 同じ誕生日の偉人
  const sameBd = (my.birthMonth && my.birthDay)
    ? findSameBirthdayPeople(parseInt(my.birthMonth,10), parseInt(my.birthDay,10))
    : [];
  const sameBdHtml = (my.birthMonth && my.birthDay) ? `
    <div class="match-results match-birthday">
      <div class="match-results-label">🎂 あなたと同じ誕生日（${my.birthMonth}月${my.birthDay}日）の偉人 ${sameBd.length > 0 ? `(${sameBd.length}人)` : ''}</div>
      ${sameBd.length > 0 ? `
        <div class="book-grid">
          ${sameBd.map(p => {
            const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
            return `
              <div class="person-book ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
                <div class="match-score match-score-birth">🎂</div>
                <div class="person-book-overlay"></div>
                ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
                <div class="person-book-info">
                  <div class="person-book-name">${p.name}</div>
                  <div class="person-book-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field || ''}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `<div class="match-empty">同じ誕生日の偉人はまだ登録されていません。</div>`}
    </div>
  ` : '';

  const matches = findMatchingPeople(my, 6);
  const matchesHtml = matches.length > 0 ? `
    <div class="match-results">
      <div class="match-results-label">あなたと共通点のある偉人 (${matches.length}人)</div>
      <div class="book-grid">
        ${matches.map(m => {
          const p = m.p;
          const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
          return `
            <div class="person-book ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
              <div class="match-score">${m.score} 共通</div>
              <div class="person-book-overlay"></div>
              ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
              <div class="person-book-info">
                <div class="person-book-name">${p.name}</div>
                <div class="person-book-meta">${m.matches.slice(0, 2).map(x => x.item).join(' · ')}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : (selectedCount > 0 ? '<div class="match-empty">一致する偉人が見つかりませんでした。別の項目を試してください。</div>' : '');

  // プロフィール入力欄（会員限定）
  const profileHtml = isLoggedIn ? `
    <div class="match-profile">
      <div class="match-cat-label">👤 あなたのプロフィール（無料会員限定）</div>
      <div class="match-profile-row">
        <label class="match-profile-label">誕生日
          <span class="match-profile-inline">
            <select class="match-profile-input" data-profile="birthMonth">
              <option value="">月</option>
              ${Array.from({length:12},(_,i)=>i+1).map(m => `<option value="${m}" ${String(my.birthMonth||'')===String(m)?'selected':''}>${m}月</option>`).join('')}
            </select>
            <select class="match-profile-input" data-profile="birthDay">
              <option value="">日</option>
              ${Array.from({length:31},(_,i)=>i+1).map(d => `<option value="${d}" ${String(my.birthDay||'')===String(d)?'selected':''}>${d}日</option>`).join('')}
            </select>
          </span>
        </label>
        <label class="match-profile-label">出身地
          <input list="matchCountryOptions" class="match-profile-input" data-profile="country" value="${escapeHtml(my.country||'')}" placeholder="例: 日本">
          <datalist id="matchCountryOptions">
            ${countryOptions.map(c => `<option value="${escapeHtml(c)}">`).join('')}
          </datalist>
        </label>
      </div>
    </div>
  ` : `
    <div class="match-profile match-profile-locked">
      <div class="match-profile-lock-head">🔒 誕生日・出身地の登録は無料会員限定です（登録は完全無料）</div>
      <div class="match-profile-lock-sub">登録すると、同じ誕生日の偉人を探せます。</div>
      <button class="match-profile-login-btn" id="matchProfileLoginBtn">🔑 本棚の鍵を受け取る</button>
    </div>
  `;

  container.innerHTML = `
    <div class="match-card match-card-open">
      <div class="match-summary match-summary-static">
        <span class="match-summary-icon">🫖</span>
        <span class="match-summary-text">${selectedCount > 0 ? `あなたの好み ${selectedCount}個登録中` : 'あなたの好み・誕生日を登録して偉人を探す'}</span>
      </div>
      <div class="match-body">
        <div class="match-intro">気になる項目をタップして選択（複数可）。もう一度タップで解除。<br>共通点の多い偉人が下に表示されます。</div>
        ${profileHtml}
        ${makeChips('foods', '🍽 好きな食べ物・飲み物')}
        ${makeChips('hobbies', '🎨 趣味・日課')}
        ${makeChips('likes', '❤ 好きなもの')}
        ${makeChips('dislikes', '✖ 嫌いなもの')}
        ${selectedCount > 0 ? `<button class="match-clear" id="matchClear">選択をクリア</button>` : ''}
      </div>
    </div>
    ${sameBdHtml}
    ${matchesHtml}
  `;

  container.querySelectorAll('[data-match-chip]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cat = btn.dataset.cat;
      const opt = btn.dataset.opt;
      const t = loadMyTraits();
      if (!Array.isArray(t[cat])) t[cat] = [];
      const idx = t[cat].indexOf(opt);
      if (idx >= 0) t[cat].splice(idx, 1);
      else t[cat].push(opt);
      saveMyTraits(t);
      // 即座にビジュアル反映（rerenderを待たなくても）
      btn.classList.toggle('active', idx < 0);
      // 少し遅らせて全体を再描画（マッチ偉人の更新）
      setTimeout(() => renderTraitsMatch(), 50);
    });
  });
  container.querySelectorAll('[data-profile]').forEach(el => {
    el.addEventListener('change', () => {
      const t = loadMyTraits();
      t[el.dataset.profile] = el.value;
      saveMyTraits(t);
      renderTraitsMatch();
    });
  });
  container.querySelector('#matchProfileLoginBtn')?.addEventListener('click', () => {
    if (typeof openLoginModal === 'function') openLoginModal();
  });
  container.querySelector('#matchClear')?.addEventListener('click', () => {
    saveMyTraits({});
    renderTraitsMatch();
  });
  container.querySelectorAll('.person-book').forEach(el => {
    el.addEventListener('click', () => showPerson(el.dataset.id));
  });
}

function renderTodayBirthday() {
  const block = document.getElementById('todayBirthdayBlock');
  const list = document.getElementById('todayBirthdayList');
  if (!block || !list || !DATA.people) return;
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  let births = DATA.people.filter(p => p.birthMonth === m && p.birthDay === d);
  let isUpcoming = false;
  // 今日の誕生日がなければ、近日（±7日以内）の誕生日を表示
  if (births.length === 0) {
    const todayInt = m * 100 + d;
    const withBirthday = DATA.people.filter(p => p.birthMonth && p.birthDay);
    const withDist = withBirthday.map(p => {
      const b = p.birthMonth * 100 + p.birthDay;
      let dist = b - todayInt;
      if (dist < 0) dist += 1231; // 翌年扱い
      return { p, dist };
    }).sort((a, b) => a.dist - b.dist);
    births = withDist.slice(0, 3).map(x => x.p);
    isUpcoming = true;
  }
  if (births.length === 0) {
    block.style.display = 'none';
    return;
  }
  block.style.display = '';
  // ラベルも更新
  const labelEl = block.querySelector('.home-block-label');
  if (labelEl) labelEl.textContent = isUpcoming ? '🎂 近日の誕生日' : '🎂 今日が誕生日の偉人';
  const my = (typeof loadMyTraits === 'function') ? loadMyTraits() : {};
  const sameAsMe = (my.birthMonth && my.birthDay &&
    parseInt(my.birthMonth,10) === m && parseInt(my.birthDay,10) === d);
  list.innerHTML = `
    <div class="today-birthday-date">${isUpcoming ? '今日は該当なし。次の誕生日：' : `${m}月${d}日 生まれ`}${sameAsMe ? '<span class="today-birthday-same">🎉 あなたと同じ誕生日！</span>' : ''}</div>
    <div class="today-birthday-grid">
      ${births.map(p => {
        const avatar = p.imageUrl
          ? `<div class="today-birthday-avatar" style="background-image:url('${p.imageUrl}')"></div>`
          : `<div class="today-birthday-avatar no-img">${p.name.charAt(0)}</div>`;
        const years = p.birth && !isUpcoming ? `${now.getFullYear() - p.birth} 年目` : '';
        const upcomingLabel = isUpcoming ? `${p.birthMonth}/${p.birthDay}` : '';
        return `
          <button class="today-birthday-card" data-person-id="${p.id}">
            ${avatar}
            <div class="today-birthday-info">
              <div class="today-birthday-name">${p.name}${upcomingLabel ? ` <span class="today-birthday-date-label">${upcomingLabel}</span>` : ''}</div>
              <div class="today-birthday-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field || ''}</div>
              ${years ? `<div class="today-birthday-years">🎂 生誕 ${years}</div>` : ''}
            </div>
          </button>
        `;
      }).join('')}
    </div>
  `;
  list.querySelectorAll('[data-person-id]').forEach(el => {
    el.addEventListener('click', () => showPerson(el.dataset.personId));
  });
}

// ====================== マップポップアップ（タイトルタップ） ======================
function openMapPopup() {
  const existing = document.getElementById('mapPopup');
  if (existing) { existing.remove(); return; }
  const modal = document.createElement('div');
  modal.id = 'mapPopup';
  modal.className = 'map-popup';
  const maps = [
    { view: 'people',    title: 'ホーム',        sub: '本棚の扉',       path: 'M 10 80 Q 40 40, 80 60 T 170 30' },
    { view: 'tags',      title: '偉人検索',      sub: '探求の地図',     path: 'M 20 40 Q 60 80, 100 50 Q 140 20, 180 60' },
    { view: 'routines',  title: 'ルーティン',    sub: '偉人の1日',      path: 'M 15 50 Q 50 20, 90 60 Q 130 100, 175 50' },
    { view: 'articles',  title: 'ブログ',        sub: '読み物の庭',     path: 'M 20 60 Q 60 30, 100 70 T 180 40' },
    { view: 'favorites', title: 'わたしの本',    sub: '自分だけの一冊', path: 'M 10 60 Q 50 90, 100 50 Q 150 10, 180 70' },
  ];
  modal.innerHTML = `
    <div class="map-popup-backdrop" data-close="1"></div>
    <div class="map-popup-panel">
      <button class="map-popup-close" data-close="1" aria-label="閉じる">×</button>
      <div class="map-popup-head">📜 案内図</div>
      <div class="map-popup-grid">
        ${maps.map(m => `
          <button class="map-tile" data-go-view="${m.view}">
            <svg class="map-tile-svg" viewBox="0 0 200 100" preserveAspectRatio="none">
              <rect x="2" y="2" width="196" height="96" fill="#fdf8ec" stroke="#7a4f2a" stroke-width="1.5" stroke-dasharray="3 2" rx="2"/>
              <path d="${m.path}" stroke="#4a2f1a" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-dasharray="2 3"/>
              <circle cx="170" cy="30" r="3" fill="#7a2e3a"/>
              <text x="170" y="20" text-anchor="middle" font-size="8" fill="#4a2f1a" font-family="serif">✕</text>
            </svg>
            <div class="map-tile-label">
              <div class="map-tile-title">${m.title}</div>
              <div class="map-tile-sub">${m.sub}</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 200);
  };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  modal.querySelectorAll('[data-go-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.goView;
      close();
      const tab = document.querySelector(`.tab[data-view="${v}"]`);
      if (tab) tab.click();
    });
  });
}

// ====================== 名前変更モーダル ======================
function openNameEditModal() {
  const existing = document.getElementById('nameEditModal');
  if (existing) existing.remove();
  const current = getUserName();
  const modal = document.createElement('div');
  modal.id = 'nameEditModal';
  modal.className = 'settings-modal';
  modal.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel name-edit-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <div class="settings-head">✎ 本に載せる名前</div>
      <div class="name-edit-intro">この名前が『わたしの本』の表紙に書かれます。空欄で『わたしの本』に戻します。</div>
      <input type="text" class="settings-input name-edit-input" id="nameEditInput" maxlength="16" placeholder="あなたの名前" value="${escapeHtml(current || '')}">
      <div class="settings-actions name-edit-actions">
        <button class="name-edit-cancel" data-close="1">キャンセル</button>
        <button class="settings-save" id="nameEditSave">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  const input = modal.querySelector('#nameEditInput');
  setTimeout(() => input?.focus(), 100);

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 200);
  };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));

  const save = () => {
    const name = input.value.trim();
    setUserName(name);
    close();
    renderFavorites();
  };
  modal.querySelector('#nameEditSave').addEventListener('click', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); }
  });
}

// ====================== 会員設定モーダル ======================
const AVATAR_PRESETS = [
  { id: 'dog', name: '犬' }, { id: 'squirrel', name: 'リス' },
  { id: 'sheep', name: '羊' }, { id: 'penguin', name: 'ペンギン' },
  { id: 'raccoon', name: 'ラクーン' },
  { id: 'cat', name: '猫' }, { id: 'fox', name: 'キツネ' },
  { id: 'bear', name: 'クマ' }, { id: 'deer', name: 'シカ' },
  { id: 'tiger', name: 'トラ' }, { id: 'lion', name: 'ライオン' },
  { id: 'panda', name: 'パンダ' }, { id: 'otter', name: 'カワウソ' },
  { id: 'hamster', name: 'ハムスター' },
];
// ====================== 世界観モーダル（レキット＆ラビン） ======================
function openWorldviewModal() {
  ensureLazyCss('worldview');
  const existing = document.getElementById('worldviewModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'worldviewModal';
  modal.className = 'worldview-modal';
  modal.innerHTML = `
    <div class="worldview-backdrop" data-close="1"></div>
    <article class="worldview-panel">
      <button class="worldview-close" data-close="1" aria-label="閉じる">×</button>

      <header class="worldview-hero">
        <div class="worldview-hero-ornament">◆</div>
        <h1 class="worldview-title">この世界について</h1>
        <div class="worldview-subtitle">歴史を守る、二人の物語</div>
      </header>

      <section class="worldview-section worldview-intro">
        <p>歴史は、書き換えることができない。</p>
        <p>過ぎ去った一つひとつの出来事が、今この瞬間の"わたしたち"を形作っている——</p>
        <p>その真実を識ってもらうために、ここには二人の守り手がいる。</p>
      </section>

      <section class="worldview-section worldview-chara worldview-rekitto">
        <div class="worldview-chara-avatar">${(typeof rekittoAvatarHtml === 'function') ? rekittoAvatarHtml() : ''}</div>
        <div class="worldview-chara-body">
          <div class="worldview-chara-role">歴史の管理人</div>
          <h2 class="worldview-chara-name">📜 レキット</h2>
          <p class="worldview-chara-bio">
            現代の側に立ち、歴史が改変されぬよう静かに見張る管理人。
            偉人からの便りや、この世界で起きる出来事を、あなたの手元へ届ける役目を担う。
          </p>
          <div class="worldview-chara-traits">
            <div><span>居場所</span><span>現代——あなたの端末の中</span></div>
            <div><span>役割</span><span>歴史の見張り／偉人との通信</span></div>
            <div><span>語り</span><span>落ち着いた敬語、現代の言葉</span></div>
          </div>
        </div>
      </section>

      <section class="worldview-section worldview-chara worldview-rabin">
        <div class="worldview-chara-avatar">
          <video class="worldview-chara-video" src="assets/guide/rabin.mp4?v=2" muted autoplay loop playsinline preload="metadata" aria-hidden="true"></video>
        </div>
        <div class="worldview-chara-body">
          <div class="worldview-chara-role">歴史の案内人</div>
          <h2 class="worldview-chara-name">🐇 ラビン</h2>
          <p class="worldview-chara-bio">
            歴史の中に閉じ込められた、小さな案内人。
            偉人たちの隣に立ち、彼らの時代を静かに語る。あなたが過去を旅するとき、そっと案内の灯を掲げてくれる。
          </p>
          <div class="worldview-chara-traits">
            <div><span>居場所</span><span>歴史の内側——時代の狭間</span></div>
            <div><span>役割</span><span>偉人たちの案内／歴史の語り部</span></div>
            <div><span>語り</span><span>古めかしい詩的な言葉</span></div>
          </div>
        </div>
      </section>

      <section class="worldview-section worldview-bond">
        <div class="worldview-bond-head">🔗 二人を結ぶもの</div>
        <p>
          レキットとラビンは、決して会うことができない。
          片方が歴史を出れば、歴史そのものが崩れ、片方が歴史に触れれば、改変の可能性が生まれてしまう。
        </p>
        <p>
          それでも二人は、時の境界の両側から同じ世界を守っている。
          ときどきレキットは、ラビンから託された偉人の言葉を、あなたの元へそっと届けにくる。
          —— 会えなくても、想いは確かに繋がっている。
        </p>
      </section>

      <section class="worldview-section worldview-message">
        <p class="worldview-message-lead">「歴史は、書き換えられない。」</p>
        <p class="worldview-message-body">
          過去を知ることは、今の自分を識ること。
          このアプリは、そのための小さな本棚です。
        </p>
        <div class="worldview-signature">—— レキット & ラビン</div>
      </section>

      <footer class="worldview-foot">
        <button class="worldview-back-btn" data-close="1">閉じる</button>
      </footer>
    </article>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 240); };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
}
window.openWorldviewModal = openWorldviewModal;

function openMemberSettings() {
  const existing = document.getElementById('memberSettingsModal');
  if (existing) existing.remove();

  const my = loadMyTraits();
  const options = collectAllTraitOptions();

  const modal = document.createElement('div');
  modal.id = 'memberSettingsModal';
  modal.className = 'settings-modal';

  const renderChips = (cat, catLabel, opts) => {
    const selected = new Set(my[cat] || []);
    const renderChipBtn = (opt) => {
      const on = selected.has(opt);
      return `<button class="match-chip ${on ? 'active' : ''}" data-setting-chip data-cat="${cat}" data-opt="${escapeHtml(opt)}">${opt}</button>`;
    };
    // TRAIT_GROUPS にサブカテゴリがあればそれで階層表示
    const groups = (typeof TRAIT_GROUPS !== 'undefined') ? TRAIT_GROUPS[cat] : null;
    if (groups && groups.length) {
      // 既知のすべてのサブグループ項目
      const grouped = new Set();
      groups.forEach(g => g.items.forEach(i => grouped.add(i)));
      // DB由来で分類外のその他
      const others = opts.filter(o => !grouped.has(o));
      return `
        <details class="settings-section settings-trait-section" open>
          <summary class="settings-sec-label settings-trait-summary">${catLabel} <span class="settings-trait-count">${selected.size}</span></summary>
          <div class="settings-trait-groups">
            ${groups.map(g => `
              <div class="settings-trait-group">
                <div class="settings-trait-sub">${g.label}</div>
                <div class="settings-chips">
                  ${g.items.map(renderChipBtn).join('')}
                </div>
              </div>
            `).join('')}
            ${others.length ? `
              <div class="settings-trait-group">
                <div class="settings-trait-sub">📌 その他（偉人の好み）</div>
                <div class="settings-chips">${others.map(renderChipBtn).join('')}</div>
              </div>
            ` : ''}
          </div>
        </details>
      `;
    }
    return `
      <div class="settings-section">
        <div class="settings-sec-label">${catLabel}</div>
        <div class="settings-chips">
          ${opts.map(renderChipBtn).join('')}
        </div>
      </div>
    `;
  };

  modal.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <div class="settings-head">⚙ プロフィール編集</div>

      <div class="settings-section settings-avatar-section">
        <div class="settings-sec-label">プロフィール画像</div>
        <div class="settings-avatar-row">
          <div class="settings-avatar-preview" id="settingsAvatarPreview" style="${localStorage.getItem('ijin_user_avatar') ? `background-image:url('${localStorage.getItem('ijin_user_avatar')}')` : ''}">
            ${localStorage.getItem('ijin_user_avatar') ? '' : '👤'}
          </div>
          <div class="settings-avatar-actions">
            <label class="settings-avatar-upload">
              <input type="file" id="settingsAvatarInput" accept="image/*" style="display:none">
              画像を選ぶ
            </label>
            ${localStorage.getItem('ijin_user_avatar') ? `<button class="settings-avatar-clear" id="settingsAvatarClear">削除</button>` : ''}
          </div>
        </div>
        <div class="settings-preset-label">または、アイコンを選ぶ</div>
        <div class="settings-preset-grid" id="settingsPresetGrid">
          ${AVATAR_PRESETS.map(p => `
            <button class="settings-preset-item" data-preset="${p.id}" title="${p.name}" type="button" aria-label="${p.name}">
              <img src="assets/avatars/${p.id}.png?v=1" alt="${p.name}" loading="lazy">
            </button>
          `).join('')}
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-sec-label">名前</div>
        <input type="text" class="settings-input" id="settingsUserName" value="${(getUserName() || '').replace(/"/g,'&quot;')}" placeholder="例：さくら" maxlength="20">
      </div>

      <div class="settings-section">
        <div class="settings-sec-label">称号</div>
        <button type="button" class="settings-title-btn" id="settingsTitleBtn">${currentTitle() ? `現在：${currentTitle()}` : '称号を選ぶ（スタンプ獲得数に応じて）'} →</button>
      </div>

      <div class="settings-section">
        <div class="settings-sec-label">誕生日</div>
        <div class="settings-birthday">
          <select id="settingsBirthMonth">
            <option value="">月</option>
            ${Array.from({length: 12}, (_, i) => `<option value="${i+1}" ${my.birthMonth == i+1 ? 'selected' : ''}>${i+1}月</option>`).join('')}
          </select>
          <select id="settingsBirthDay">
            <option value="">日</option>
            ${Array.from({length: 31}, (_, i) => `<option value="${i+1}" ${my.birthDay == i+1 ? 'selected' : ''}>${i+1}日</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-sec-label">出身地（任意）</div>
        <input type="text" class="settings-input" id="settingsHometown" value="${my.hometown || ''}" placeholder="例：東京都">
      </div>

      ${renderChips('foods', '🍽 好きな食べ物・飲み物', options.foods)}
      ${renderChips('hobbies', '🎨 趣味・日課', options.hobbies)}
      ${renderChips('likes', '❤ 好きなもの', options.likes)}
      ${renderChips('dislikes', '🚫 苦手なもの', options.dislikes)}

      <div class="settings-section">
        <div class="settings-sec-label">📖 自己紹介（任意・あなたの物語）</div>
        <textarea class="settings-input settings-textarea" id="settingsBio" placeholder="あなた自身の言葉で。趣味、仕事、今興味があること、生き方、価値観、夢……何でも。">${escapeHtml(localStorage.getItem('ijin_my_bio') || '')}</textarea>
        <div class="settings-sec-hint">いつか偉人として振り返られる、あなた自身の物語を書いてみてください。</div>
      </div>

      <div class="settings-section">
        <div class="settings-sec-label">📜 わたしの歩み（年表・任意）</div>
        <div id="settingsCareerList" class="settings-career-list"></div>
        <button type="button" class="settings-career-add" id="settingsCareerAdd">＋ 節目を追加</button>
        <div class="settings-sec-hint">生まれた年、転機、達成、別れ——あなたの人生の節目を年表にできます。</div>
      </div>

      <div class="settings-section">
        <div class="settings-sec-label">✒ 大切にしている言葉（任意）</div>
        <div id="settingsQuotesList" class="settings-quotes-list"></div>
        <button type="button" class="settings-career-add" id="settingsQuoteAdd">＋ 言葉を追加</button>
      </div>

      <div class="settings-section">
        <div class="settings-sec-label">🔗 SNS・ブログ（任意・会員同士で公開）</div>
        <div class="settings-sns-row"><span class="settings-sns-ic">𝕏</span><input type="url" class="settings-input" id="settingsSnsX" value="${(my.sns?.x || '').replace(/"/g,'&quot;')}" placeholder="https://x.com/..."></div>
        <div class="settings-sns-row"><span class="settings-sns-ic">📸</span><input type="url" class="settings-input" id="settingsSnsIg" value="${(my.sns?.instagram || '').replace(/"/g,'&quot;')}" placeholder="https://instagram.com/..."></div>
        <div class="settings-sns-row"><span class="settings-sns-ic">📝</span><input type="url" class="settings-input" id="settingsSnsNote" value="${(my.sns?.note || '').replace(/"/g,'&quot;')}" placeholder="https://note.com/..."></div>
        <div class="settings-sns-row"><span class="settings-sns-ic">f</span><input type="url" class="settings-input" id="settingsSnsFb" value="${(my.sns?.facebook || '').replace(/"/g,'&quot;')}" placeholder="https://facebook.com/..."></div>
        <div class="settings-sec-hint">連携を解除するには、欄を空にして保存してください。設定した項目のみ他の会員から閲覧できます。</div>
      </div>

      <div class="settings-actions">
        <button class="settings-save" id="settingsSave">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 200);
  };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));

  // チップのトグル＋カテゴリ別カウント更新
  const updateTraitCounts = () => {
    ['foods','hobbies','likes','dislikes'].forEach(cat => {
      const count = modal.querySelectorAll(`[data-setting-chip][data-cat="${cat}"].active`).length;
      const summary = modal.querySelector(`.settings-trait-section:has([data-cat="${cat}"]) .settings-trait-count`);
      if (summary) summary.textContent = count;
    });
  };
  modal.querySelectorAll('[data-setting-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      updateTraitCounts();
    });
  });

  // アバター画像アップロード
  const avatarInput = modal.querySelector('#settingsAvatarInput');
  const avatarPreview = modal.querySelector('#settingsAvatarPreview');
  const avatarClear = modal.querySelector('#settingsAvatarClear');
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert('画像は2MB以下にしてください。');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        // リサイズ（最大 240x240）
        const img = new Image();
        img.onload = () => {
          const size = 240;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          // クロップして正方形に
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          localStorage.setItem('ijin_user_avatar', dataUrl);
          avatarPreview.style.backgroundImage = `url('${dataUrl}')`;
          avatarPreview.textContent = '';
          if (typeof window.updateAccountUI === 'function') window.updateAccountUI();
          // 即時Firestore同期（デバウンスを待たない）
          if (typeof window.pushToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
            window.pushToCloud(currentUser).catch(() => {});
          }
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  if (avatarClear) {
    avatarClear.addEventListener('click', () => {
      localStorage.removeItem('ijin_user_avatar');
      avatarPreview.style.backgroundImage = '';
      avatarPreview.textContent = '👤';
      avatarClear.remove();
      if (typeof window.updateAccountUI === 'function') window.updateAccountUI();
      if (typeof window.pushToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
        window.pushToCloud(currentUser).catch(() => {});
      }
    });
  }
  // プリセットアバター選択
  modal.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.preset;
      const url = `assets/avatars/${id}.png?v=1`;
      localStorage.setItem('ijin_user_avatar', url);
      avatarPreview.style.backgroundImage = `url('${url}')`;
      avatarPreview.textContent = '';
      modal.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('selected', b === btn));
      if (typeof window.updateAccountUI === 'function') window.updateAccountUI();
      if (typeof window.pushToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
        window.pushToCloud(currentUser).catch(() => {});
      }
    });
    // 現在選択中のマーク
    const cur = localStorage.getItem('ijin_user_avatar') || '';
    if (cur.includes(`/avatars/${btn.dataset.preset}.`)) btn.classList.add('selected');
  });

  // 称号ボタン → 称号選択モーダル
  modal.querySelector('#settingsTitleBtn')?.addEventListener('click', () => {
    openTitlePickerModal();
    // モーダル閉じた後にボタン表記を更新
    const update = () => {
      const btn = modal.querySelector('#settingsTitleBtn');
      if (btn) btn.textContent = currentTitle() ? `現在：${currentTitle()} →` : '称号を選ぶ（スタンプ獲得数に応じて） →';
    };
    setTimeout(update, 400);
  });

  // 📜 わたしの歩み（career）エディタ
  const renderCareerList = () => {
    const list = modal.querySelector('#settingsCareerList');
    if (!list) return;
    let career = [];
    try { career = JSON.parse(localStorage.getItem('ijin_my_career') || '[]'); } catch {}
    list.innerHTML = career.map((c, i) => `
      <div class="settings-career-item" data-career-idx="${i}">
        <input type="text" class="settings-input settings-career-year" placeholder="年（例: 1998）" value="${escapeHtml(c.year || '')}">
        <input type="text" class="settings-input settings-career-title" placeholder="出来事（例: 〇〇に就職）" value="${escapeHtml(c.title || '')}">
        <textarea class="settings-input settings-career-detail" placeholder="詳細（任意）">${escapeHtml(c.detail || '')}</textarea>
        <button type="button" class="settings-career-del" data-career-del="${i}">削除</button>
      </div>
    `).join('');
    list.querySelectorAll('[data-career-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.careerDel, 10);
        let c = [];
        try { c = JSON.parse(localStorage.getItem('ijin_my_career') || '[]'); } catch {}
        c.splice(idx, 1);
        localStorage.setItem('ijin_my_career', JSON.stringify(c));
        renderCareerList();
      });
    });
  };
  renderCareerList();
  modal.querySelector('#settingsCareerAdd')?.addEventListener('click', () => {
    let c = [];
    try { c = JSON.parse(localStorage.getItem('ijin_my_career') || '[]'); } catch {}
    c.push({ year: '', title: '', detail: '' });
    localStorage.setItem('ijin_my_career', JSON.stringify(c));
    renderCareerList();
  });

  // ✒ 大切にしている言葉エディタ
  const renderQuotesList = () => {
    const list = modal.querySelector('#settingsQuotesList');
    if (!list) return;
    let quotes = [];
    try { quotes = JSON.parse(localStorage.getItem('ijin_my_quotes') || '[]'); } catch {}
    list.innerHTML = quotes.map((q, i) => `
      <div class="settings-career-item" data-quote-idx="${i}">
        <textarea class="settings-input settings-career-detail" placeholder="言葉">${escapeHtml(q.text || q || '')}</textarea>
        <input type="text" class="settings-input settings-career-title" placeholder="出典・著者（任意）" value="${escapeHtml(q.source || '')}">
        <button type="button" class="settings-career-del" data-quote-del="${i}">削除</button>
      </div>
    `).join('');
    list.querySelectorAll('[data-quote-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.quoteDel, 10);
        let q = [];
        try { q = JSON.parse(localStorage.getItem('ijin_my_quotes') || '[]'); } catch {}
        q.splice(idx, 1);
        localStorage.setItem('ijin_my_quotes', JSON.stringify(q));
        renderQuotesList();
      });
    });
  };
  renderQuotesList();
  modal.querySelector('#settingsQuoteAdd')?.addEventListener('click', () => {
    let q = [];
    try { q = JSON.parse(localStorage.getItem('ijin_my_quotes') || '[]'); } catch {}
    q.push({ text: '', source: '' });
    localStorage.setItem('ijin_my_quotes', JSON.stringify(q));
    renderQuotesList();
  });

  modal.querySelector('#settingsSave').addEventListener('click', () => {
    const t = loadMyTraits();
    // 名前保存
    const nameInp = modal.querySelector('#settingsUserName');
    if (nameInp) setUserName(nameInp.value || '');
    // 自己紹介
    const bio = modal.querySelector('#settingsBio')?.value || '';
    localStorage.setItem('ijin_my_bio', bio);
    // キャリア年表
    const careerItems = Array.from(modal.querySelectorAll('[data-career-idx]')).map(item => ({
      year: item.querySelector('.settings-career-year')?.value.trim() || '',
      title: item.querySelector('.settings-career-title')?.value.trim() || '',
      detail: item.querySelector('.settings-career-detail')?.value.trim() || '',
    })).filter(c => c.year || c.title);
    localStorage.setItem('ijin_my_career', JSON.stringify(careerItems));
    // 言葉
    const quoteItems = Array.from(modal.querySelectorAll('[data-quote-idx]')).map(item => ({
      text: item.querySelector('.settings-career-detail')?.value.trim() || '',
      source: item.querySelector('.settings-career-title')?.value.trim() || '',
    })).filter(q => q.text);
    localStorage.setItem('ijin_my_quotes', JSON.stringify(quoteItems));
    // Firestore同期
    if (typeof window.pushToCloud === 'function' && typeof currentUser !== 'undefined' && currentUser) {
      window.pushToCloud(currentUser).catch(() => {});
    }

    t.birthMonth = parseInt(modal.querySelector('#settingsBirthMonth').value, 10) || null;
    t.birthDay = parseInt(modal.querySelector('#settingsBirthDay').value, 10) || null;
    t.hometown = modal.querySelector('#settingsHometown').value.trim();
    ['foods','hobbies','likes','dislikes'].forEach(cat => {
      t[cat] = Array.from(modal.querySelectorAll(`[data-setting-chip][data-cat="${cat}"].active`)).map(b => b.dataset.opt);
    });
    // SNS連携
    const clean = (v) => {
      const s = (v || '').trim();
      if (!s) return '';
      return /^https?:\/\//i.test(s) ? s : '';
    };
    t.sns = {
      x: clean(modal.querySelector('#settingsSnsX')?.value),
      instagram: clean(modal.querySelector('#settingsSnsIg')?.value),
      note: clean(modal.querySelector('#settingsSnsNote')?.value),
      facebook: clean(modal.querySelector('#settingsSnsFb')?.value),
    };
    saveMyTraits(t);
    close();
    if (typeof renderTraitsMatch === 'function') renderTraitsMatch();
    if (typeof renderFavorites === 'function') renderFavorites();
    if (typeof renderTodayBirthday === 'function') renderTodayBirthday();
  });
}

// ============ 会員同士のフォロー ============
// 🌫 忘却の霧：長期訪問なしの偉人に霧をかける
const MIST_THRESHOLD_DAYS = 14; // 14日以上訪問ゼロで霧発生

// 🧪 デバッグ用：コンソールから testMist(30) / testMist('untouched') / testMist('clear')
window.testMist = function(modeOrDays) {
  if (modeOrDays === 'clear' || modeOrDays == null) {
    try { sessionStorage.removeItem('__mist_test__'); } catch {}
    window.__mistTest__ = null;
    console.log('✅ mistテストをクリアしました。偉人ページを開き直してください。');
    return;
  }
  const v = String(modeOrDays);
  try { sessionStorage.setItem('__mist_test__', v); } catch {}
  window.__mistTest__ = v;
  console.log(`✅ mist = ${v} にセット。偉人ページを開くと霧が出ます。`);
};
function applyMistOfOblivion(personId, lastVisitMs) {
  const container = document.getElementById('personDetail');
  if (!container) return;
  // 既存の霧オーバーレイを削除
  container.querySelectorAll('.mist-overlay, .mist-notice').forEach(el => el.remove());
  // ── テストモード ──（URL?mist= / sessionStorage / window.__mistTest__）
  try {
    let mistMode = null;
    // 1. URL search param
    try { mistMode = new URLSearchParams(location.search).get('mist'); } catch {}
    // 2. URL hash内の ?mist= 部分
    if (!mistMode) {
      try {
        const h = location.hash || '';
        const m = h.match(/[?&]mist=([^&]+)/);
        if (m) mistMode = decodeURIComponent(m[1]);
      } catch {}
    }
    // 3. sessionStorage
    if (!mistMode) { try { mistMode = sessionStorage.getItem('__mist_test__'); } catch {} }
    // 4. グローバル変数
    if (!mistMode) { try { mistMode = window.__mistTest__; } catch {} }

    if (mistMode === 'untouched') {
      lastVisitMs = 0;
    } else if (mistMode && /^\d+$/.test(String(mistMode))) {
      lastVisitMs = Date.now() - parseInt(mistMode, 10) * 24 * 60 * 60 * 1000;
    }
  } catch {}
  if (!lastVisitMs) {
    // 誰も訪れたことがない
    const notice = document.createElement('div');
    notice.className = 'mist-notice mist-untouched';
    notice.innerHTML = `
      <span class="mist-notice-ic">🌫</span>
      <span class="mist-notice-text">最初の訪問者になりました。<br>この本は、あなたの指が触れるまで誰にも読まれていませんでした。</span>
    `;
    const cover = container.querySelector('.profile-cover');
    if (cover) cover.insertAdjacentElement('afterend', notice);
    return;
  }
  const now = Date.now();
  const days = Math.floor((now - lastVisitMs) / (1000 * 60 * 60 * 24));
  if (days < MIST_THRESHOLD_DAYS) return;  // 新鮮な本
  // 霧オーバーレイ
  const cover = container.querySelector('.profile-cover');
  if (cover) {
    const mist = document.createElement('div');
    mist.className = 'mist-overlay';
    mist.innerHTML = `<div class="mist-overlay-inner"><span class="mist-overlay-text">🌫 忘却の霧</span></div>`;
    cover.style.position = cover.style.position || 'relative';
    cover.appendChild(mist);
    // 5秒後に霧が晴れるアニメ
    setTimeout(() => {
      mist.classList.add('mist-fading');
      setTimeout(() => mist.remove(), 2000);
    }, 4000);
  }
  // 通知
  const notice = document.createElement('div');
  notice.className = 'mist-notice';
  notice.innerHTML = `
    <span class="mist-notice-ic">🌫</span>
    <span class="mist-notice-text">最後に訪れられてから <strong>${days}日</strong> が経過していました。<br>あなたの訪問で、霧が晴れます。</span>
  `;
  if (cover) cover.insertAdjacentElement('afterend', notice);
}

// 👣 軌跡：ローカル保存（Firestore未設定でも自分の訪問は残る）
const GUEST_UID_KEY = 'ijin_guest_uid';
function getOrCreateGuestUid() {
  let uid = localStorage.getItem(GUEST_UID_KEY);
  if (!uid) {
    uid = 'guest_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    try { localStorage.setItem(GUEST_UID_KEY, uid); } catch {}
  }
  return uid;
}
function saveLocalVisitor(scope, id, record) {
  try {
    const key = 'ijin_local_visitors_' + scope + '_' + id;
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    // 同じuidは最新に更新
    const idx = arr.findIndex(r => r.uid === record.uid);
    if (idx >= 0) arr[idx] = record;
    else arr.push(record);
    localStorage.setItem(key, JSON.stringify(arr.slice(-20))); // 最大20件
  } catch {}
}
function loadLocalVisitors(scope, id) {
  try {
    const key = 'ijin_local_visitors_' + scope + '_' + id;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}
function mergeVisitors(local, cloud) {
  // uidでマージ、cloudを優先（他者の最新情報）、localで自分を確実に
  const map = new Map();
  (cloud || []).forEach(v => { if (v.uid) map.set(v.uid, v); });
  (local || []).forEach(v => { if (v.uid) map.set(v.uid, v); });
  return Array.from(map.values()).sort((a, b) => (b.visitedAt || '').localeCompare(a.visitedAt || ''));
}

// ユーザーへの「いいね」（ローカルで保持）
const USER_LIKES_KEY = 'ijin_user_likes';
function loadUserLikes() {
  try { return new Set(JSON.parse(localStorage.getItem(USER_LIKES_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveUserLikes(set) {
  localStorage.setItem(USER_LIKES_KEY, JSON.stringify([...set]));
}
function isLikedUser(uid) { return loadUserLikes().has(uid); }
function toggleLikeUser(uid) {
  const s = loadUserLikes();
  if (s.has(uid)) s.delete(uid); else s.add(uid);
  saveUserLikes(s);
  return s.has(uid);
}

const USER_FOLLOWS_KEY = 'ijin_user_follows';
function loadUserFollows() {
  try { return new Set(JSON.parse(localStorage.getItem(USER_FOLLOWS_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveUserFollows(set) {
  localStorage.setItem(USER_FOLLOWS_KEY, JSON.stringify([...set]));
}
function isFollowingUser(uid) {
  return loadUserFollows().has(uid);
}
function toggleFollowUser(uid) {
  // 自分で自分をフォローできないように
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid === uid) {
    return false;
  }
  const s = loadUserFollows();
  if (s.has(uid)) s.delete(uid); else s.add(uid);
  saveUserFollows(s);
  return s.has(uid);
}
window.toggleFollowUser = toggleFollowUser;
window.isFollowingUser = isFollowingUser;

// ============ 会員プロフィールのシェア（ID / URL / QR） ============
function getMyShareInfo() {
  const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : '';
  const origin = location.origin + location.pathname.replace(/[^/]*$/, '');
  const url = uid ? `${origin}?user=${encodeURIComponent(uid)}` : '';
  return { uid, url };
}
function openShareMyProfileModal() {
  const { uid, url } = getMyShareInfo();
  const existing = document.getElementById('shareMyProfileModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'shareMyProfileModal';
  modal.className = 'settings-modal';
  const qrApi = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`
    : '';
  modal.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <div class="settings-head">🔗 マイプロフィールをシェア</div>
      ${uid ? `
        <div class="settings-sec-hint">このIDやURLを相手に送ると、あなたのプロフィールを表示できます。</div>
        <div class="share-qr-wrap">
          <img class="share-qr" src="${qrApi}" alt="QRコード" loading="lazy">
        </div>
        <div class="share-row">
          <div class="share-label">あなたのID</div>
          <div class="share-field">
            <input type="text" readonly id="shareMyId" value="${uid}">
            <button class="share-copy" data-copy="#shareMyId">コピー</button>
          </div>
        </div>
        <div class="share-row">
          <div class="share-label">シェアURL</div>
          <div class="share-field">
            <input type="text" readonly id="shareMyUrl" value="${url}">
            <button class="share-copy" data-copy="#shareMyUrl">コピー</button>
          </div>
        </div>
        ${navigator.share ? `<button class="share-native" id="shareNativeBtn">📤 共有する</button>` : ''}
      ` : `
        <div class="users-dir-empty">無料会員登録後にシェアIDが発行されます。（0円・メールのみ）</div>
      `}
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  modal.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = modal.querySelector(btn.dataset.copy);
      if (!inp) return;
      inp.select(); inp.setSelectionRange(0, inp.value.length);
      try { navigator.clipboard.writeText(inp.value); } catch { document.execCommand('copy'); }
      const orig = btn.textContent; btn.textContent = '✓ コピー済';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });
  modal.querySelector('#shareNativeBtn')?.addEventListener('click', () => {
    navigator.share({ title: '偉人と自分。 マイプロフィール', url }).catch(() => {});
  });
}
window.openShareMyProfileModal = openShareMyProfileModal;

// SNS連携モーダル（X / Instagram / Note / Facebook のURLを保存）
function openSnsLinksModal() {
  const existing = document.getElementById('snsLinksModal');
  if (existing) existing.remove();
  const traits = (typeof loadMyTraits === 'function') ? loadMyTraits() : {};
  const sns = traits.sns || {};
  const m = document.createElement('div');
  m.id = 'snsLinksModal';
  m.className = 'settings-modal';
  m.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <div class="settings-head">🔗 SNS連携</div>
      <div class="settings-sec-hint">プロフィールに表示するSNSリンクを登録できます。空欄にすれば非表示になります。</div>
      <form id="snsLinksForm" class="sns-form">
        <label class="sns-field">
          <span class="sns-label">𝕏 X (Twitter)</span>
          <input name="x" type="url" placeholder="https://x.com/yourname" value="${escapeHtml(sns.x || '')}">
        </label>
        <label class="sns-field">
          <span class="sns-label">📸 Instagram</span>
          <input name="instagram" type="url" placeholder="https://instagram.com/yourname" value="${escapeHtml(sns.instagram || '')}">
        </label>
        <label class="sns-field">
          <span class="sns-label">📝 Note</span>
          <input name="note" type="url" placeholder="https://note.com/yourname" value="${escapeHtml(sns.note || '')}">
        </label>
        <label class="sns-field">
          <span class="sns-label">f Facebook</span>
          <input name="facebook" type="url" placeholder="https://facebook.com/yourname" value="${escapeHtml(sns.facebook || '')}">
        </label>
        <div class="sns-actions">
          <button type="button" class="sns-cancel" data-close="1">キャンセル</button>
          <button type="submit" class="sns-save">保存</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add('open'));
  const close = () => { m.classList.remove('open'); setTimeout(() => m.remove(), 200); };
  m.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  m.querySelector('#snsLinksForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newSns = {
      x: (fd.get('x') || '').toString().trim(),
      instagram: (fd.get('instagram') || '').toString().trim(),
      note: (fd.get('note') || '').toString().trim(),
      facebook: (fd.get('facebook') || '').toString().trim(),
    };
    const t = (typeof loadMyTraits === 'function') ? loadMyTraits() : {};
    t.sns = newSns;
    if (typeof saveMyTraits === 'function') saveMyTraits(t);
    close();
    alert('SNSリンクを保存しました。');
  });
}
window.openSnsLinksModal = openSnsLinksModal;

// プロフィール編集（統一版：openMemberSettings を呼ぶエイリアス）
// アバター・名前・称号・誕生日・出身地・趣味・好きなもの・嫌いなもの・SNS をまとめて編集
function openEditProfileModal() {
  if (typeof openMemberSettings === 'function') return openMemberSettings();
}
window.openEditProfileModal = openEditProfileModal;

// URL検索（?user=<uid>）→ プロフィール直接表示
async function openUserProfileById(uid) {
  if (!uid) return;
  if (typeof window.fetchUserProfileById !== 'function') return;
  // 全ユーザーも並行取得（相互フォロー数の正確な表示のため）
  const [u, all] = await Promise.all([
    window.fetchUserProfileById(uid),
    typeof window.fetchAllUserProfiles === 'function' ? window.fetchAllUserProfiles().catch(() => []) : Promise.resolve([]),
  ]);
  if (!u) { alert('このIDの会員は見つかりませんでした。'); return; }
  // キャッシュに本人情報をマージ（allに既に含まれる可能性があるため重複排除）
  const cache = [u, ...all.filter(x => x.uid !== u.uid)];
  openUserProfileModal(u.uid, cache);
}
window.openUserProfileById = openUserProfileById;

// 自分のプロフィールを偉人と同じ形式で開く
async function openMyProfile() {
  if (typeof currentUser === 'undefined' || !currentUser) {
    alert('会員登録するとプロフィールが持てます');
    if (typeof window.openAccountMenu === 'function') window.openAccountMenu();
    return;
  }
  if (currentUser.isAnonymous) {
    alert('会員登録するとプロフィールが持てます');
    if (typeof window.openAccountMenu === 'function') window.openAccountMenu();
    return;
  }
  await openUserProfileById(currentUser.uid);
}
window.openMyProfile = openMyProfile;

// ============ 会員ディレクトリ（会員同士でつながる） ============
async function openUsersDirectory() {
  const existing = document.getElementById('usersDirModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'usersDirModal';
  modal.className = 'settings-modal';
  modal.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <div class="settings-head">👥 会員を探す</div>
      <div class="settings-sec-hint">『偉人と自分。』に登録している会員の一覧です。名前・誕生日・好きなもの・フォロー偉人・SNSリンクのみ公開されます。</div>
      <div class="users-dir-search-row">
        <input type="text" class="users-dir-search" id="usersDirSearch" placeholder="🔍 名前 or IDで検索">
        <button class="users-dir-id-jump" id="usersDirIdJump" title="IDで開く">IDで開く →</button>
      </div>
      <div id="usersDirBody" class="users-dir-list">読み込み中…</div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));

  const body = modal.querySelector('#usersDirBody');
  if (typeof window.fetchAllUserProfiles !== 'function') {
    body.innerHTML = '<div class="users-dir-empty">会員機能が利用できません。</div>';
    return;
  }
  const users = await window.fetchAllUserProfiles();
  if (!users || users.length === 0) {
    body.innerHTML = '<div class="users-dir-empty">まだ会員がいません。</div>';
    return;
  }
  users.sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0) || b.stampTotal - a.stampTotal);
  const render = (list) => {
    body.innerHTML = list.length === 0
      ? '<div class="users-dir-empty">該当する会員はいませんでした。</div>'
      : list.map(u => renderUserDirCard(u)).join('');
    body.querySelectorAll('[data-user-open]').forEach(el => {
      el.addEventListener('click', () => openUserProfileModal(el.dataset.userOpen, users));
    });
    body.querySelectorAll('[data-user-follow]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const now = toggleFollowUser(btn.dataset.userFollow);
        btn.classList.toggle('active', now);
        btn.textContent = now ? '✓' : '＋ フォロー';
      });
    });
  };
  render(users);
  // 検索（名前 or UID部分一致）
  const search = modal.querySelector('#usersDirSearch');
  search?.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    if (!q) { render(users); return; }
    const filtered = users.filter(u => (u.name || '').toLowerCase().includes(q) || (u.uid || '').toLowerCase().includes(q));
    render(filtered);
  });
  // IDで直接開く（完全一致）
  modal.querySelector('#usersDirIdJump')?.addEventListener('click', async () => {
    const q = (search?.value || '').trim();
    if (!q) { search?.focus(); return; }
    const found = users.find(u => u.uid === q);
    if (found) { openUserProfileModal(found.uid, users); return; }
    // キャッシュになければ単発fetch
    const u = await window.fetchUserProfileById?.(q);
    if (u) openUserProfileModal(u.uid, [u, ...users]);
    else alert('このIDの会員は見つかりませんでした。');
  });
}
function renderUserDirCard(u) {
  const av = u.avatar
    ? `<div class="users-dir-av" style="background-image:url('${u.avatar}')"></div>`
    : `<div class="users-dir-av no-img">${(u.name || '?').charAt(0)}</div>`;
  const snsIcons = [
    u.sns.x && `<a class="users-dir-sns" href="${u.sns.x}" target="_blank" rel="noopener" title="X">𝕏</a>`,
    u.sns.instagram && `<a class="users-dir-sns" href="${u.sns.instagram}" target="_blank" rel="noopener" title="Instagram">📸</a>`,
    u.sns.note && `<a class="users-dir-sns" href="${u.sns.note}" target="_blank" rel="noopener" title="Note">📝</a>`,
    u.sns.facebook && `<a class="users-dir-sns" href="${u.sns.facebook}" target="_blank" rel="noopener" title="Facebook">f</a>`,
  ].filter(Boolean).join('');
  const isLoggedIn = typeof currentUser !== 'undefined' && currentUser;
  const following = isLoggedIn && !u.isMe ? isFollowingUser(u.uid) : false;
  const followBtn = (isLoggedIn && !u.isMe)
    ? `<button class="user-prof-follow sm ${following ? 'active' : ''}" data-user-follow="${u.uid}" onclick="event.stopPropagation()">${following ? '✓' : '＋ フォロー'}</button>`
    : '';
  return `
    <div class="users-dir-card" data-user-open="${u.uid}">
      ${av}
      <div class="users-dir-main">
        <div class="users-dir-name">
          ${u.title ? `<span class="users-dir-title">【${u.title}】</span>` : ''}
          ${escapeHtml(u.name)}${u.isMe ? ' <span class="users-dir-me">(あなた)</span>' : ''}
        </div>
        <div class="users-dir-meta">偉人フォロー ${u.ijinCount}人 · スタンプ ${u.stampTotal}個</div>
        <div class="users-dir-sns-row" onclick="event.stopPropagation()">${snsIcons}</div>
      </div>
      ${followBtn}
    </div>
  `;
}
function openUserProfileModal(uid, usersCache) {
  const u = (usersCache || []).find(x => x.uid === uid);
  if (!u) return;
  const existing = document.getElementById('userProfileModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'userProfileModal';
  modal.className = 'settings-modal';
  const av = u.avatar
    ? `<div class="user-prof-av" style="background-image:url('${u.avatar}')"></div>`
    : `<div class="user-prof-av no-img">${(u.name || '?').charAt(0)}</div>`;
  const chip = (arr) => arr && arr.length ? arr.map(x => `<span class="user-prof-chip">${escapeHtml(x)}</span>`).join('') : '<span class="user-prof-empty">—</span>';
  const sns = [
    u.sns.x && `<a class="user-prof-sns" href="${u.sns.x}" target="_blank" rel="noopener">𝕏 X</a>`,
    u.sns.instagram && `<a class="user-prof-sns" href="${u.sns.instagram}" target="_blank" rel="noopener">📸 Instagram</a>`,
    u.sns.note && `<a class="user-prof-sns" href="${u.sns.note}" target="_blank" rel="noopener">📝 Note</a>`,
    u.sns.facebook && `<a class="user-prof-sns" href="${u.sns.facebook}" target="_blank" rel="noopener">f Facebook</a>`,
  ].filter(Boolean).join('');
  const ijinSample = (u.followingIjin || []).slice(0, 12).map(id => {
    const p = DATA.people.find(x => x.id === id);
    if (!p) return '';
    return `<button class="user-prof-ijin" data-jump-person="${p.id}">${p.name}</button>`;
  }).join('');
  // 会員同士のフォロー状態 & フォロワー数（自分をフォロー中の人数）
  const isLoggedIn = typeof currentUser !== 'undefined' && currentUser;
  const following = isLoggedIn && !u.isMe ? isFollowingUser(u.uid) : false;
  const followersOfThisUser = (usersCache || []).filter(x => (x.userFollows || []).includes(u.uid)).length;
  const myFollowedCount = (u.userFollows || []).length;
  const followBtn = (isLoggedIn && !u.isMe)
    ? `<button class="user-prof-follow ${following ? 'active' : ''}" data-user-follow="${u.uid}">${following ? '✓ フォロー中' : '＋ フォローする'}</button>`
    : '';
  // 偉人と同じ情報カード形式
  const infoItems = [
    u.birthMonth && u.birthDay ? { ic: '🎂', label: '誕生日', val: `${u.birthMonth}/${u.birthDay}` } : null,
    u.hometown ? { ic: '📍', label: '出身', val: escapeHtml(u.hometown) } : null,
    { ic: '📚', label: '偉人', val: `${u.ijinCount}人をフォロー` },
    { ic: '⭐', label: 'スタンプ', val: `${u.stampTotal}個` },
  ].filter(Boolean);

  modal.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel user-prof-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <!-- カバー（偉人ページと同じデザイン） -->
      <div class="user-prof-cover">
        <div class="user-prof-cover-ornament">◆</div>
        <div class="user-prof-cover-name">${escapeHtml(u.name)}</div>
        ${u.title ? `<div class="user-prof-cover-title">【${u.title}】</div>` : ''}
      </div>
      <div class="user-prof-head">
        ${av}
        <div style="flex:1;min-width:0">
          <div class="user-prof-meta">会員フォロー ${myFollowedCount}人 · フォロワー ${followersOfThisUser}人</div>
        </div>
      </div>
      ${followBtn}
      <!-- 情報カード（偉人ページと同じスタイル） -->
      <div class="profile-info-card">
        ${infoItems.map(i => `
          <div class="profile-info-item">
            <span class="profile-info-ic">${i.ic}</span>
            <span class="profile-info-label">${i.label}</span>
            <span class="profile-info-value">${i.val}</span>
          </div>
        `).join('')}
      </div>

      <!-- 好きなもの・趣味・性格まで（ここまでが偉人と同じ） -->
      <div class="user-prof-row"><b>🍽 好きな食べ物・飲み物</b><div class="user-prof-chips">${chip(u.traits.foods)}</div></div>
      <div class="user-prof-row"><b>🎨 趣味・日課</b><div class="user-prof-chips">${chip(u.traits.hobbies)}</div></div>
      <div class="user-prof-row"><b>❤ 好きなもの</b><div class="user-prof-chips">${chip(u.traits.likes)}</div></div>
      <div class="user-prof-row"><b>🚫 嫌いなもの</b><div class="user-prof-chips">${chip(u.traits.dislikes)}</div></div>
      ${u.traits.personality ? `<div class="user-prof-row user-prof-personality"><b>🎭 性格</b><p>${escapeHtml(u.traits.personality)}</p></div>` : ''}

      <!-- 会員だけの特別セクション：連携しているアプリ -->
      ${sns ? `
        <div class="user-prof-row user-prof-apps">
          <b>🔗 連携しているアプリ</b>
          <div class="user-prof-sns-row">${sns}</div>
        </div>
      ` : ''}

      ${ijinSample ? `
        <div class="user-prof-row">
          <b>📚 フォロー中の偉人</b>
          <div class="user-prof-ijin-list">${ijinSample}</div>
        </div>
      ` : ''}

      <!-- 📖 わたしの本（本人のみ表示） -->
      ${u.isMe ? `
        <div class="user-prof-row user-prof-mybook">
          <b>📖 わたしの本 <span class="user-prof-private">（あなた専用）</span></b>
          <button class="user-prof-mybook-btn" id="userProfMyBook">ノート・スタンプ・お気に入りを見る →</button>
        </div>
      ` : ''}

      <!-- 👣 訪問者の軌跡 -->
      <div class="profile-visitors-section user-prof-visitors">
        <div class="profile-visitors-head">
          <span class="profile-visitors-ic">👣</span>
          <span class="profile-visitors-title">${u.isMe ? 'あなたを訪ねた人' : 'この人を訪ねた人'}</span>
        </div>
        <div id="userVisitorsMount" class="person-visitors-mount"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  const close = () => { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  modal.querySelectorAll('[data-jump-person]').forEach(b => {
    b.addEventListener('click', () => { close(); showPerson(b.dataset.jumpPerson); });
  });
  // 自分のプロフィールから『わたしの本』へ
  modal.querySelector('#userProfMyBook')?.addEventListener('click', () => {
    close();
    setTimeout(() => { if (typeof showView === 'function') showView('favorites'); }, 200);
  });
  modal.querySelector('[data-user-follow]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const now = toggleFollowUser(btn.dataset.userFollow);
    btn.classList.toggle('active', now);
    btn.textContent = now ? '✓ フォロー中' : '＋ フォローする';
  });
  // 訪問者として自分を記録＆軌跡を取得表示（自分を見た時も記録）
  // まずローカルに保存して即描画
  try {
    const mount = modal.querySelector('#userVisitorsMount');
    const myUid = (currentUser && currentUser.uid) ? currentUser.uid : getOrCreateGuestUid();
    const isAnon = !currentUser || currentUser.isAnonymous;
    const myName = getUserName() || (currentUser && currentUser.displayName) || (isAnon ? 'ゲスト' : '名無しの読者');
    const myAvatar = localStorage.getItem('ijin_user_avatar') || '';
    saveLocalVisitor('user', u.uid, {
      targetUid: u.uid, uid: myUid, name: myName, avatar: myAvatar, isGuest: isAnon,
      visitedAt: new Date().toISOString(),
    });
    if (mount) renderUserVisitors(mount, loadLocalVisitors('user', u.uid));
  } catch {}
  (async () => {
    try {
      const mount = modal.querySelector('#userVisitorsMount');
      if (!mount) return;
      // Firestore記録（自分も含めて記録）
      if (typeof window.recordVisitorToUser === 'function' && currentUser) {
        const isAnon = currentUser.isAnonymous;
        const myName = getUserName() || currentUser.displayName || (isAnon ? 'ゲスト' : '名無しの読者');
        const myAvatar = localStorage.getItem('ijin_user_avatar') || '';
        window.recordVisitorToUser(u.uid, { name: myName, avatar: myAvatar, isGuest: isAnon });
      }
      let cloudVisitors = [];
      if (typeof window.fetchVisitorsToUser === 'function') {
        cloudVisitors = await window.fetchVisitorsToUser(u.uid);
      }
      renderUserVisitors(mount, mergeVisitors(loadLocalVisitors('user', u.uid), cloudVisitors));
    } catch {}
  })();
}

function renderUserVisitors(mount, visitors) {
  if (!mount) return;
  const myUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : getOrCreateGuestUid();
  // 同一人物の重複を排除：
  // - (name + avatar) が同じエントリは1つにまとめる（最新の訪問時刻を残す）
  // - 非ゲスト版がある場合、ゲスト版は除外（過去ログアウト状態の自分等）
  const seen = new Map();
  (visitors || []).forEach(v => {
    const name = (v.name || '').trim();
    const avatar = (v.avatar || '').trim();
    // 識別キー：名前+アバター（匿名者でも名前で重複判定）
    const key = name + '|' + avatar;
    const existing = seen.get(key);
    if (!existing) { seen.set(key, v); return; }
    // 既存 vs 新しい：非ゲストを優先、同じゲスト性なら最新訪問時刻を残す
    const existingIsGuest = !!existing.isGuest;
    const newIsGuest = !!v.isGuest;
    if (existingIsGuest && !newIsGuest) { seen.set(key, v); return; }
    if (!existingIsGuest && newIsGuest) { return; }
    // 同じゲスト性なら時刻比較
    if ((v.visitedAt || '') > (existing.visitedAt || '')) seen.set(key, v);
  });
  const others = Array.from(seen.values())
    .sort((a, b) => (b.visitedAt || '').localeCompare(a.visitedAt || ''));
  if (others.length === 0) {
    mount.innerHTML = `
      <div class="visitors-empty">
        <div class="visitors-empty-ic">👣</div>
        <div>まだ誰も訪ねてきていません。<br>最初の訪問者が、いつか必ず現れます。</div>
      </div>`;
    return;
  }
  mount.innerHTML = `
    <div class="visitors-hint">あなたのプロフィールを見にきた読者たち</div>
    <div class="visitors-list">
      ${others.map(v => {
        const isSelf = v.uid === myUid;
        const isGuest = !!v.isGuest;
        const following = isFollowingUser(v.uid);
        const liked = isLikedUser(v.uid);
        const bg = v.avatar ? `style="background-image:url('${escapeHtml(v.avatar)}')"` : '';
        const initial = (v.name || '?').charAt(0);
        const dt = v.visitedAt ? new Date(v.visitedAt) : null;
        const when = dt ? `${dt.getMonth()+1}/${dt.getDate()}` : '';
        const dispName = escapeHtml(v.name || (isGuest ? 'ゲスト' : '名無しの読者'));
        const badges = isGuest ? '<span class="visitor-badge-guest">ゲスト</span>' : '';
        return `
          <div class="visitor-card" data-uid="${escapeHtml(v.uid)}">
            <div class="visitor-av" ${bg}>${v.avatar ? '' : initial}</div>
            <div class="visitor-info">
              <div class="visitor-name">${dispName} ${badges}</div>
              <div class="visitor-meta">👣 ${when}</div>
            </div>
            ${isSelf || isGuest ? '' : `
              <div class="visitor-actions">
                <button class="visitor-btn visitor-like ${liked ? 'active' : ''}" data-user-like="${escapeHtml(v.uid)}">${liked ? '❤' : '♡'}</button>
                <button class="visitor-btn visitor-follow ${following ? 'active' : ''}" data-visitor-follow="${escapeHtml(v.uid)}">${following ? '✓' : '＋'}</button>
              </div>
            `}
          </div>
        `;
      }).join('')}
    </div>
  `;
  mount.querySelectorAll('[data-user-like]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const uid = btn.dataset.userLike;
      const on = toggleLikeUser(uid);
      btn.classList.toggle('active', on);
      btn.textContent = on ? '❤' : '♡';
    });
  });
  mount.querySelectorAll('[data-visitor-follow]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const uid = btn.dataset.visitorFollow;
      const on = toggleFollowUser(uid);
      btn.classList.toggle('active', on);
      btn.textContent = on ? '✓' : '＋';
    });
  });
  mount.querySelectorAll('.visitor-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.visitor-btn')) return;
      const uid = card.dataset.uid;
      if (uid && typeof openUserProfileById === 'function') openUserProfileById(uid);
    });
  });
}
window.openUsersDirectory = openUsersDirectory;

function renderCalendarToday() {
  const block = document.getElementById('calendarBlock');
  const container = document.getElementById('calendarToday');
  if (!block || !container || !DATA.people) return;
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const births = DATA.people.filter(p => p.birthMonth === m && p.birthDay === d);
  const deaths = DATA.people.filter(p => p.deathMonth === m && p.deathDay === d);
  // この日に起きた偉人たちの出来事（年月日がeventにあれば）
  const dayEvents = [];
  DATA.people.forEach(p => {
    (p.events || []).forEach(e => {
      if (e.month === m && e.day === d) {
        dayEvents.push({ person: p, event: e });
      }
    });
  });
  if (births.length === 0 && deaths.length === 0 && dayEvents.length === 0) {
    block.style.display = 'none';
    return;
  }
  block.style.display = '';

  const cardHtml = (p, type) => {
    const initial = (p.name || '?').charAt(0);
    const avatar = p.imageUrl
      ? `<div class="cal-avatar" style="background-image:url('${p.imageUrl}')"></div>`
      : `<div class="cal-avatar no-img">${initial}</div>`;
    const years = type === 'birth'
      ? `生誕 ${now.getFullYear() - (p.birth || now.getFullYear())} 年目`
      : `没後 ${now.getFullYear() - (p.death || now.getFullYear())} 年`;
    const label = type === 'birth' ? '🎂 誕生日' : '🕯 命日';
    return `
      <article class="cal-card" data-person-id="${p.id}">
        ${avatar}
        <div class="cal-body">
          <div class="cal-label ${type}">${label}</div>
          <div class="cal-name">${p.name}</div>
          <div class="cal-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field || ''}</div>
          <div class="cal-years">${years}</div>
        </div>
      </article>
    `;
  };
  const eventHtml = (item) => {
    const p = item.person;
    const e = item.event;
    const initial = (p.name || '?').charAt(0);
    const avatar = p.imageUrl
      ? `<div class="cal-avatar" style="background-image:url('${p.imageUrl}')"></div>`
      : `<div class="cal-avatar no-img">${initial}</div>`;
    return `
      <article class="cal-card cal-card-event" data-person-id="${p.id}">
        ${avatar}
        <div class="cal-body">
          <div class="cal-label event">📜 この日の出来事</div>
          <div class="cal-name">${e.year}年 ${p.name}</div>
          <div class="cal-event-title">${e.title}</div>
          ${e.detail ? `<div class="cal-event-detail">${e.detail.slice(0, 80)}${e.detail.length > 80 ? '…' : ''}</div>` : ''}
        </div>
      </article>
    `;
  };

  // 初期表示は最大3件、それ以上は折りたたみ
  const LIMIT = 3;
  const allItems = [
    ...births.map(p => ({ kind: 'birth', p, html: cardHtml(p, 'birth') })),
    ...deaths.map(p => ({ kind: 'death', p, html: cardHtml(p, 'death') })),
    ...dayEvents.map(it => ({ kind: 'event', p: it.person, html: eventHtml(it) })),
  ];
  const visible = allItems.slice(0, LIMIT);
  const hidden = allItems.slice(LIMIT);

  const visibleHtml = visible.map(x => x.html).join('');
  const hiddenHtml = hidden.map(x => x.html).join('');

  container.innerHTML = `
    <div class="cal-date-head">${m}月${d}日（${['日','月','火','水','木','金','土'][now.getDay()]}）</div>
    <div class="cal-list">${visibleHtml}</div>
    ${hidden.length > 0 ? `
      <div class="cal-list cal-list-more hidden" id="calMoreList">${hiddenHtml}</div>
      <button class="cal-more-btn" id="calMoreBtn">もっと見る (${hidden.length}件)</button>
    ` : ''}
  `;
  container.querySelectorAll('.cal-card').forEach(el => {
    el.addEventListener('click', () => showPerson(el.dataset.personId));
  });
  const moreBtn = container.querySelector('#calMoreBtn');
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      const more = container.querySelector('#calMoreList');
      more?.classList.toggle('hidden');
      moreBtn.textContent = more?.classList.contains('hidden')
        ? `もっと見る (${hidden.length}件)`
        : '閉じる';
    });
  }
}

// ====================== 偉人の広場 ======================
const SELF_POSTS_KEY = 'ijin_self_posts';
function loadSelfPosts() {
  try { return JSON.parse(localStorage.getItem(SELF_POSTS_KEY) || '[]'); }
  catch { return []; }
}
function saveSelfPost(text) {
  if (!text || !text.trim()) return null;
  const posts = loadSelfPosts();
  const entry = { id: 'S' + Date.now(), text: text.trim(), date: new Date().toISOString() };
  posts.unshift(entry);
  localStorage.setItem(SELF_POSTS_KEY, JSON.stringify(posts));
  return entry;
}
function deleteSelfPost(id) {
  const posts = loadSelfPosts().filter(p => p.id !== id);
  localStorage.setItem(SELF_POSTS_KEY, JSON.stringify(posts));
}

// コンテンツフィルタ（連絡先・暴言対策）
const FORBIDDEN_PATTERNS = [
  { re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, msg: 'メールアドレスは書けません' },
  { re: /\d{2,4}[-\s]?\d{2,4}[-\s]?\d{3,4}/, msg: '電話番号は書けません' },
  { re: /(https?:\/\/|www\.|\.com|\.jp|\.net)/i, msg: 'URLは書けません' },
  { re: /(LINE|ライン).{0,3}(id|ID|アカウント)/i, msg: 'LINE IDは共有できません' },
  { re: /(Insta|インスタ|@[a-zA-Z0-9_]{3,})/i, msg: 'SNS IDは書けません' },
  { re: /(死ね|殺す|消えろ|クソ|ブス|死ねばいい|ゴミ|バカ野郎|アホ死ね)/, msg: '誹謗中傷は投稿できません' },
];
function validatePost(text) {
  for (const { re, msg } of FORBIDDEN_PATTERNS) {
    if (re.test(text)) return msg;
  }
  return null;
}

// 今日の広場（日替わり偉人名言＋自分の投稿をミックス）
function getSquareQuotes(limit = 20) {
  const d = new Date();
  const daySeed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const pool = [];
  (DATA.people || []).forEach(p => {
    (p.quotes || []).forEach(q => pool.push({ person: p, quote: q }));
  });
  // 決定的シャッフル
  let s = daySeed;
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // 同じ偉人が連続しないように
  const picked = [];
  const usedIds = new Set();
  for (const item of arr) {
    if (picked.length >= limit) break;
    if (picked.length < limit / 2 && usedIds.has(item.person.id)) continue;
    picked.push(item);
    usedIds.add(item.person.id);
  }
  // 各投稿に擬似的な投稿時刻を付ける（今日の朝5時〜現在の範囲）
  const morning = new Date();
  morning.setHours(5, 0, 0, 0);
  const now = Date.now();
  const range = now - morning.getTime();
  return picked.map((item, i) => ({
    ...item,
    // 順番を「古い順」からtimestamp散らす
    ts: morning.getTime() + (range * (i + 1)) / (picked.length + 1),
  }));
}

function renderSquare() {
  const container = document.getElementById('squareSection');
  if (!container) return;
  renderSquareInto(container);
}

// 今日参加する5人の偉人を決定論的に選出
function getTodaysGroupMembers() {
  if (!DATA.people || DATA.people.length === 0) return [];
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const quotable = DATA.people.filter(p => (p.quotes || []).length > 0);
  let s = seed;
  const arr = [...quotable];
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 5);
}

// 今日の流れ：朝5時スタート、30分に1通。メンバーの名言から順番に引く
const CHAT_SLOT_MS = 30 * 60 * 1000; // 30分
const CHAT_START_HOUR = 5;
const CHAT_LAST_READ_KEY = 'ijin_chat_last_slot';

// ルーティンから、特定時刻に合うメッセージを生成
function routineGreeting(person, hour) {
  const r = person.routine;
  if (!r || r.length === 0) return null;
  // この時刻を含むブロック
  const block = r.find(b => {
    if (b.start < b.end) return hour >= b.start && hour < b.end;
    // 日付をまたぐ睡眠
    return hour >= b.start || hour < b.end;
  });
  if (!block) return null;
  const activity = block.activity || '';
  // 起床（sleepが終わる時刻）
  const wakeBlock = r.find(b => b.cat === 'sleep' && b.end === hour);
  if (wakeBlock) {
    const opts = [`おはよう。今日も始まった。`, `目を覚ました。${activity.replace('睡眠', '朝')}の時間だ。`];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  const c = block.cat;
  if (c === 'sleep') return `そろそろ寝る時間だ。${activity}。`;
  if (c === 'meal') return `${activity}の時間。`;
  if (c === 'work') return `今は${activity}。集中する時間だ。`;
  if (c === 'exercise') return `体を動かす。${activity}。`;
  if (c === 'leisure') return `少し休む。${activity}。`;
  if (c === 'social') return `${activity}。人と話す時間。`;
  return null;
}

function getGroupMessages() {
  const members = getTodaysGroupMembers();
  if (members.length === 0) return { messages: [], members };
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const start = new Date();
  start.setHours(CHAT_START_HOUR, 0, 0, 0);
  // 現在時刻が5時より前（深夜）なら前日の5時をスタートとする
  if (start.getTime() > Date.now()) start.setDate(start.getDate() - 1);
  const now = Date.now();
  const elapsed = now - start.getTime();
  // 何スロット経過したか
  const slots = Math.max(0, Math.floor(elapsed / CHAT_SLOT_MS)) + 1;
  // 各スロットでメンバーを順番に、その偉人の名言を順に選ぶ
  const messages = [];
  const perPersonIdx = {};
  let s = seed;
  for (let i = 0; i < slots; i++) {
    // メンバー選出：ラウンドロビンだが決定的にシャッフル
    s = (s * 9301 + 49297) % 233280;
    const memberIdx = (i + (s % members.length)) % members.length;
    const person = members[memberIdx];
    const ts = start.getTime() + i * CHAT_SLOT_MS;
    const slotDate = new Date(ts);
    const slotHour = slotDate.getHours();
    // ルーティンに合うメッセージ（3割）、なければ名言
    const wantRoutine = (i % 3 === 0);
    let routineMsg = null;
    if (wantRoutine) routineMsg = routineGreeting(person, slotHour);
    if (routineMsg) {
      messages.push({ type: 'routine', person, text: routineMsg, ts });
      continue;
    }
    const qs = person.quotes || [];
    if (qs.length === 0) continue;
    perPersonIdx[person.id] = perPersonIdx[person.id] || 0;
    const q = qs[perPersonIdx[person.id] % qs.length];
    perPersonIdx[person.id]++;
    messages.push({ type: 'quote', person, quote: q, ts });
  }
  return { messages, members };
}

function renderSquareInto(container) {
  if (!container || !DATA.people) return;
  // グループチャット
  return renderLineGroup(container);
}

function renderLineGroup(container) {
  const { messages, members } = getGroupMessages();
  const selfPosts = loadSelfPosts();
  const quickReplies = loadQuickReplies();

  // 自分の投稿 + 偉人の即応を時系列に混ぜる
  const quickReplyMsgs = quickReplies.map(qr => {
    const person = DATA.people.find(p => p.id === qr.personId);
    if (!person) return null;
    return {
      type: 'quote',
      person,
      quote: { text: qr.quoteText, source: qr.quoteSource },
      ts: qr.ts,
    };
  }).filter(Boolean);

  const merged = [
    ...messages,
    ...quickReplyMsgs,
    ...selfPosts.map(s => ({ type: 'self', id: s.id, text: s.text, ts: new Date(s.date).getTime() })),
  ].sort((a, b) => a.ts - b.ts);

  const fmtTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  // グループヘッダー：参加メンバーのアバター重ね
  const headerAvatars = members.slice(0, 5).map((p, i) => {
    const img = p.imageUrl ? `style="background-image:url('${p.imageUrl}');margin-left:${i === 0 ? 0 : -8}px"` : `style="margin-left:${i === 0 ? 0 : -8}px"`;
    return p.imageUrl
      ? `<div class="line-avatar-mini" ${img}></div>`
      : `<div class="line-avatar-mini no-img" ${img}>${p.name.charAt(0)}</div>`;
  }).join('');

  // メッセージ表示
  let prevAuthor = null;
  let prevDate = null;
  const bubbles = [];
  merged.forEach(m => {
    const d = new Date(m.ts);
    const dateKey = `${d.getMonth()+1}/${d.getDate()}`;
    // 日付区切り
    if (dateKey !== prevDate) {
      bubbles.push(`<div class="line-date-sep">${d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</div>`);
      prevDate = dateKey;
      prevAuthor = null;
    }
    if (m.type === 'self') {
      // [sticker:xxx] 形式ならスタンプとして画像表示
      const stickerMatch = (m.text || '').match(/^\[sticker:([a-zA-Z0-9_]+)\]$/);
      const body = stickerMatch
        ? `<div class="line-msg-sticker"><img src="assets/stickers/${stickerMatch[1]}.png" alt=""></div>`
        : `<div class="line-msg-bubble-me">${escapeHtml(m.text)}</div>`;
      bubbles.push(`
        <div class="line-msg line-msg-me">
          <div class="line-msg-wrap">
            <div class="line-msg-time-me">${fmtTime(m.ts)}</div>
            ${body}
          </div>
        </div>
      `);
      prevAuthor = 'me';
    } else {
      const p = m.person;
      const showAvatar = prevAuthor !== p.id;
      const avatar = showAvatar
        ? (p.imageUrl
          ? `<div class="line-avatar" style="background-image:url('${p.imageUrl}')" data-person-id="${p.id}"></div>`
          : `<div class="line-avatar no-img" data-person-id="${p.id}">${p.name.charAt(0)}</div>`)
        : `<div class="line-avatar-spacer"></div>`;
      const bodyHtml = m.type === 'routine'
        ? `<div class="line-msg-bubble line-msg-bubble-routine" data-person-id="${p.id}">${escapeHtml(m.text)}</div>`
        : `<div class="line-msg-bubble" data-person-id="${p.id}">${m.quote.text}${m.quote.source ? `<div class="line-msg-src">— ${m.quote.source}</div>` : ''}</div>`;
      bubbles.push(`
        <div class="line-msg line-msg-them">
          ${avatar}
          <div class="line-msg-inner">
            ${showAvatar ? `<div class="line-msg-name">${p.name}</div>` : ''}
            <div class="line-msg-row">
              ${bodyHtml}
              <div class="line-msg-time">${fmtTime(m.ts)}</div>
            </div>
          </div>
        </div>
      `);
      prevAuthor = p.id;
    }
  });

  container.innerHTML = `
    <div class="line-group-header">
      <div class="line-group-avatars">${headerAvatars}</div>
      <div class="line-group-info">
        <div class="line-group-name">IJiN</div>
        <div class="line-group-sub">今日の参加者 ${members.length}人 · 30分ごとにつぶやきます</div>
      </div>
    </div>
    <div class="line-feed">${bubbles.join('')}</div>
  `;

  // スクロール最下部へ
  setTimeout(() => {
    const feed = container.querySelector('.line-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, 50);

  // アバタータップで偉人プロフィール
  container.querySelectorAll('[data-person-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = el.dataset.personId;
      // メッセージバブルタップ時は手紙返信
      if (el.classList.contains('line-msg-bubble')) {
        const person = DATA.people.find(p => p.id === pid);
        if (person) openLetterModal(person);
      } else {
        showPerson(pid);
      }
    });
  });
}

function renderDailyMission() {
  const container = document.getElementById('dailyMission');
  if (!container || !DATA.people || DATA.people.length === 0) return;
  const seed = todaySeed();
  const person = DATA.people[seed % DATA.people.length];
  if (!person) return;

  // ミッション素材を探す（優先: events に tag 付き > quotes > routine > summary）
  let kind = null, text = null, sub = null;
  const events = (person.events || []).filter(e => (e.title || '').length > 3);
  const quotes = person.quotes || [];

  if (events.length > 0) {
    const ev = events[(seed >> 3) % events.length];
    kind = 'episode';
    text = ev.title;
    sub = ev.detail ? String(ev.detail).slice(0, 80) : '';
  } else if (quotes.length > 0) {
    const q = quotes[seed % quotes.length];
    kind = 'quote';
    text = q.text || '';
    sub = q.source || '';
  }

  if (!text) return;

  // その偉人を真似る提案（種別ごとに異なる1行）
  const challenges = {
    episode: `${person.name}が同じ日にしたように、あなたも今日、小さな一歩を選んでみませんか。`,
    quote: `今日はこの言葉を胸に、一つだけ行動してみる日にしませんか。`,
  };

  const initial = (person.name || '?').charAt(0);
  const avatar = person.imageUrl
    ? `<div class="mission-avatar" style="background-image:url('${person.imageUrl}')"></div>`
    : `<div class="mission-avatar no-img">${initial}</div>`;

  container.innerHTML = `
    <article class="mission-card" data-person-id="${person.id}">
      <div class="mission-head">
        ${avatar}
        <div class="mission-head-text">
          <div class="mission-date">${new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
          <div class="mission-person">${person.name}<span class="mission-person-en">${person.nameEn || ''}</span></div>
        </div>
      </div>
      <div class="mission-body">
        <div class="mission-label">${kind === 'quote' ? '今日の一言' : '今日の逸話'}</div>
        <div class="mission-text">${text}</div>
        ${sub ? `<div class="mission-sub">${sub}</div>` : ''}
        <div class="mission-challenge">${challenges[kind]}</div>
      </div>
      <div class="mission-actions">
        <button class="mission-btn mission-open"><img class="icon-img" src="assets/icons/book.png" alt="">${person.name}を読む</button>
      </div>
    </article>
  `;

  container.querySelector('.mission-open')?.addEventListener('click', () => showPerson(person.id));
  container.querySelector('.mission-card')?.addEventListener('click', (e) => {
    if (e.target.closest('.mission-btn')) return;
    showPerson(person.id);
  });
}

function renderPersonOfTheDay() {
  const container = document.getElementById('personOfTheDay');
  if (!container || DATA.people.length === 0) return;
  const todayStr = new Date().toISOString().slice(0,10);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(MOOD_PICK_KEY) || 'null'); } catch {}

  // 今日の気分で既に選んだ人がいれば表示、なければ気分チップ
  if (saved && saved.date === todayStr && saved.personId) {
    const pick = DATA.people.find(p => p.id === saved.personId);
    const tag = DATA.tagMap[saved.tagId];
    if (pick) {
      container.innerHTML = `
        <div class="mood-result-label">「${tag ? tag.name : '今日の気分'}」のあなたに贈る案内人</div>
        ${renderPersonCard(pick, '本日の案内人')}
        <button class="mood-ai-more" id="moodAIMore">
          <span class="mood-ai-icon">💫</span>
          <span class="mood-ai-texts">
            <span class="mood-ai-title">さらにAIで、あなたにより近い偉人を探す</span>
            <span class="mood-ai-sub">無料登録で1日1回まで利用できます</span>
          </span>
          <span class="mood-ai-arrow">→</span>
        </button>
        <button class="mood-reset" id="moodReset">別の気分を選び直す</button>
      `;
      container.querySelector('.person-of-the-day').addEventListener('click', (e) => {
        showPerson(e.currentTarget.dataset.id);
      });
      const aiBtn = container.querySelector('#moodAIMore');
      if (aiBtn) aiBtn.addEventListener('click', () => {
        if (typeof openAIConsultModal === 'function') {
          // 今日の気分を初期テキストに載せる
          window.__aiInitialText = tag ? `いまは「${tag.name}」という気持ち。` : '';
          window.__aiInitialTag = saved.tagId;
          openAIConsultModal();
        }
      });
      container.querySelector('#moodReset').addEventListener('click', () => {
        localStorage.removeItem(MOOD_PICK_KEY);
        renderPersonOfTheDay();
      });
      return;
    }
  }

  // 気分選択UI
  const counts = {};
  DATA.people.forEach(p => {
    (p.events || []).forEach(e => {
      (e.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
  });
  const popularTags = DATA.tags
    .map(t => ({ ...t, count: counts[t.id] || 0 }))
    .filter(t => t.count > 0)
    .sort((a,b) => b.count - a.count);

  const POSITIVE_TAGS = new Set(['joy','hope','love','creation','gratitude','serenity','curiosity','friendship','breakthrough','restart','approval','turning_encounter','self_reinvention']);
  const positive = popularTags.filter(t => POSITIVE_TAGS.has(t.id));
  const negative = popularTags.filter(t => !POSITIVE_TAGS.has(t.id));
  container.innerHTML = `
    <div class="mood-picker">
      <div class="mood-picker-title">今日のあなたの気分は？</div>
      <div class="mood-picker-sub">選ぶと、その感情を経験した偉人が今日の案内人になります</div>
      ${positive.length > 0 ? `
        <div class="mood-section">
          <div class="mood-section-label mood-section-positive">◆ 前向きな気持ち ◆</div>
          <div class="mood-chips">
            ${positive.map(t => `
              <button class="mood-chip" data-mood="${t.id}" style="background:${t.color}">${t.name}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      ${negative.length > 0 ? `
        <div class="mood-section">
          <div class="mood-section-label mood-section-negative">◆ しんどい気持ち ◆</div>
          <div class="mood-chips">
            ${negative.map(t => `
              <button class="mood-chip" data-mood="${t.id}" style="background:${t.color}">${t.name}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  container.querySelectorAll('.mood-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const tagId = btn.dataset.mood;
      const candidates = DATA.people.filter(p =>
        (p.events || []).some(e => (e.tags || []).includes(tagId))
      );
      if (candidates.length === 0) return;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      localStorage.setItem(MOOD_PICK_KEY, JSON.stringify({
        date: todayStr, tagId, personId: pick.id, chatStart: Date.now()
      }));
      // 初回は1通がすぐ届くので未読バッジを立てる
      setSeenCount(pick.id, 0);
      renderPersonOfTheDay();
      updateChatBadge();
    });
  });
}

// 推し偉人セクション
function renderOshi() {
  const container = document.getElementById('oshiSection');
  if (!container) return;
  const oshiId = getOshi();
  if (!oshiId) {
    container.innerHTML = `
      <div class="oshi-empty">
        <div class="oshi-empty-text">
          あなたの<b>推し偉人</b>はまだ決まっていません。<br>
          気になる偉人の詳細ページで「★推しに設定」してください。
        </div>
      </div>
    `;
    return;
  }
  const p = DATA.people.find(x => x.id === oshiId);
  if (!p) { container.innerHTML = ''; return; }
  const seed = daySeed();
  // 日替わり名言
  const quotes = (p.quotes || []).filter(q => q && q.text);
  const todayQuote = quotes.length ? quotes[seed % quotes.length] : null;
  // 日替わりの本
  const books = (p.books || []).filter(b => b && b.title);
  const todayBook = books.length ? books[seed % books.length] : null;
  let bookHtml = '';
  if (todayBook) {
    const q = encodeURIComponent(`${todayBook.title} ${todayBook.author || ''}`);
    const hasAsin = todayBook.asin && /^[A-Z0-9]{10}$/i.test(todayBook.asin);
    const amz = hasAsin
      ? `https://www.amazon.co.jp/dp/${todayBook.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`
      : `https://www.amazon.co.jp/s?k=${q}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
    const rak = rakutenSearchUrl(todayBook.title, todayBook.author);
    const coverInner = hasAsin
      ? `<img src="${amazonCover(todayBook.asin)}" alt="${escapeHtml(todayBook.title)}" loading="lazy" onerror="this.parentElement.classList.add('no-cover');this.remove();" onload="if(this.naturalWidth<50){this.parentElement.classList.add('no-cover');this.remove();}"><div class="oshi-book-fallback"><div class="oshi-book-fallback-orn">✦</div><div class="oshi-book-fallback-title">${escapeHtml(todayBook.title)}</div>${todayBook.author ? `<div class="oshi-book-fallback-author">${escapeHtml(todayBook.author)}</div>` : ''}</div>`
      : `<div class="oshi-book-fallback"><div class="oshi-book-fallback-orn">✦</div><div class="oshi-book-fallback-title">${escapeHtml(todayBook.title)}</div>${todayBook.author ? `<div class="oshi-book-fallback-author">${escapeHtml(todayBook.author)}</div>` : ''}</div>`;
    bookHtml = `
      <div class="oshi-today-book">
        <div class="oshi-today-book-head">📖 きょうの1冊</div>
        <div class="oshi-today-book-card">
          <a class="oshi-book-cover ${hasAsin ? '' : 'no-cover'}" href="${amz}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">${coverInner}</a>
          <div class="oshi-book-info">
            <div class="oshi-book-title">${escapeHtml(todayBook.title)}</div>
            ${todayBook.author ? `<div class="oshi-book-author">${escapeHtml(todayBook.author)}</div>` : ''}
            <div class="oshi-book-stores">
              <a class="oshi-book-store" href="${amz}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">📦 Amazon</a>
              <a class="oshi-book-store" href="${rak}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">🛍 楽天</a>
            </div>
          </div>
        </div>
      </div>`;
  }
  const quoteHtml = todayQuote ? `
    <div class="oshi-today-quote">
      <div class="oshi-today-quote-head">💬 きょうの一言</div>
      <div class="oshi-today-quote-text">「${escapeHtml(todayQuote.text)}」</div>
      ${todayQuote.source ? `<div class="oshi-today-quote-src">— ${escapeHtml(todayQuote.source)}</div>` : ''}
    </div>` : '';
  // 💌 推しからのきょうの手紙（テンプレート＋日替わり）
  const LETTER_TEMPLATES = [
    '今日はどんな一日だった？ 私の時代も、迷うことばかりだったよ。',
    'うまくいかない日があっても、それは歩いている証拠。',
    'きみの心の中に、きっと答えはある。ゆっくりでいい。',
    '焦らなくていい。私も何度も立ち止まったから。',
    '今日の君のその一歩が、未来の誰かを救うかもしれない。',
    '小さな積み重ねを信じて。それが私を支えたものだから。',
    '疲れたら休もう。私もそうしていた。',
    '好きなものを、ちゃんと好きと言える人でいて。',
  ];
  const letterText = LETTER_TEMPLATES[seed % LETTER_TEMPLATES.length];
  const letterHtml = `
    <div class="oshi-today-letter">
      <div class="oshi-today-letter-head">💌 ${escapeHtml(p.name)}からの手紙</div>
      <div class="oshi-today-letter-body">${escapeHtml(letterText)}</div>
      <div class="oshi-today-letter-sign">— ${escapeHtml(p.name)}</div>
    </div>`;
  // 推しの1日ルーティン抜粋（work/exercise/meal 中心に3件）
  const ICON = { sleep:'😴', meal:'☕', work:'✍️', exercise:'🚶', rest:'🛋', social:'🗣', study:'📖', create:'🎨', hobby:'🎼' };
  const routine = Array.isArray(p.routine) ? p.routine : [];
  const pickRoutine = [];
  const priorities = ['work','create','exercise','meal','study'];
  priorities.forEach(cat => {
    if (pickRoutine.length >= 3) return;
    const hit = routine.find(r => r && r.cat === cat && r.activity && !pickRoutine.includes(r));
    if (hit) pickRoutine.push(hit);
  });
  // まだ3件未満なら残りから埋める
  if (pickRoutine.length < 3) {
    routine.forEach(r => {
      if (pickRoutine.length >= 3) return;
      if (!pickRoutine.includes(r) && r && r.activity && r.cat !== 'sleep') pickRoutine.push(r);
    });
  }
  const routineHtml = pickRoutine.length ? `
    <div class="oshi-today-routine">
      <div class="oshi-today-routine-head">🕰 推しの1日から</div>
      <div class="oshi-today-routine-list">
        ${pickRoutine.map(r => `
          <div class="oshi-routine-row">
            <div class="oshi-routine-time">${String(r.start).padStart(2,'0')}:00–${String(r.end).padStart(2,'0')}:00</div>
            <div class="oshi-routine-ic">${ICON[r.cat] || '•'}</div>
            <div class="oshi-routine-act">${escapeHtml(r.activity)}</div>
          </div>`).join('')}
      </div>
    </div>` : '';
  container.innerHTML = `
    <div class="oshi-rich">
      <div class="oshi-card" data-id="${p.id}">
        ${p.imageUrl
          ? `<div class="oshi-image" style="background-image:url('${p.imageUrl}')"></div>`
          : `<div class="oshi-image no-image">${p.name.charAt(0)}</div>`}
        <div class="oshi-info">
          <div class="oshi-label">♡ わたしの推し</div>
          <div class="oshi-name">${p.name}</div>
          <div class="oshi-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field}</div>
        </div>
        <div class="oshi-goto">→</div>
      </div>
      ${letterHtml}
      ${quoteHtml}
      ${routineHtml}
      ${bookHtml}
    </div>
  `;
  container.querySelector('.oshi-card').addEventListener('click', () => showPerson(p.id));
}

// ====================== ホーム: ヒーロー統計 ======================
function renderHeroStats() {
  const container = document.getElementById('heroStats');
  if (!container) return;
  const peopleCount = DATA.people.length;
  const eventCount = DATA.people.reduce((s, p) => s + (p.events || []).length, 0);
  const quoteCount = DATA.people.reduce((s, p) => s + (p.quotes || []).length, 0);
  container.innerHTML = `
    <div><span class="hs-num">${peopleCount}</span><span class="hs-label">偉人</span></div>
    <div class="hs-sep"></div>
    <div><span class="hs-num">${eventCount}</span><span class="hs-label">軌跡</span></div>
    <div class="hs-sep"></div>
    <div><span class="hs-num">${quoteCount}</span><span class="hs-label">言葉</span></div>
  `;
}

// ====================== ホーム: 言葉のコレクション（ランダム5件） ======================
function renderQuoteCarousel() {
  const container = document.getElementById('quoteCarousel');
  if (!container) return;
  const all = [];
  DATA.people.forEach(p => {
    (p.quotes || []).forEach(q => all.push({ person: p, quote: q }));
  });
  // 今日の言葉と同じにならないよう別シードでシャッフル
  const seed = daySeed();
  const shuffled = all.map((v, i) => ({ v, k: ((i + 1) * 2654435761 ^ seed) >>> 0 }))
                      .sort((a, b) => a.k - b.k).map(x => x.v);
  const picks = shuffled.slice(0, Math.min(6, shuffled.length));
  container.innerHTML = picks.map(m => {
    const av = m.person.imageUrl
      ? `<div class="qc-avatar" style="background-image:url('${m.person.imageUrl}')"></div>`
      : `<div class="qc-avatar">${m.person.name.charAt(0)}</div>`;
    const qk = quoteKey(m.person.id, m.quote);
    const faved = favQuotes.has(qk);
    return `
      <div class="qc-card" data-id="${m.person.id}">
        <button class="qc-fav ${faved ? 'active' : ''}" data-qc-fav="${qk}" aria-label="お気に入り" title="お気に入り">${faved ? '★' : '☆'}</button>
        <div class="qc-text">${m.quote.text}</div>
        <div class="qc-attrib">
          ${av}
          <div>
            <div class="qc-meta-name">${m.person.name}</div>
            ${m.quote.source ? `<div class="qc-meta-src">${m.quote.source}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  container.querySelectorAll('.qc-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-qc-fav]')) return;
      showPerson(el.dataset.id);
    });
  });
  container.querySelectorAll('[data-qc-fav]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.qcFav;
      if (favQuotes.has(key)) { favQuotes.delete(key); btn.classList.remove('active'); btn.textContent = '☆'; }
      else { favQuotes.add(key); btn.classList.add('active'); btn.textContent = '★'; }
      saveSet(FAV_KEY_QUOTES, favQuotes);
    });
  });
}

// ====================== ホーム: 注目の感情タイル ======================
const FEATURED_TAG_IDS = ['escape', 'setback', 'blank_period', 'restart'];
function renderFeaturedTags() {
  const container = document.getElementById('featuredTags');
  if (!container) return;
  // 出来事数を集計
  const counts = {};
  DATA.people.forEach(p => {
    (p.events || []).forEach(e => {
      (e.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
  });
  const palette = ['wine', 'green'];
  container.innerHTML = FEATURED_TAG_IDS.map((tid, i) => {
    const t = DATA.tagMap[tid];
    if (!t) return '';
    const cnt = counts[tid] || 0;
    const tone = palette[i % palette.length];
    return `
      <button class="feat-tile feat-tile-${tone}" data-tag="${tid}">
        <div class="ft-name">${t.name}</div>
        <div class="ft-count">${cnt}人の軌跡</div>
        <div class="ft-desc">${t.description}</div>
      </button>
    `;
  }).join('');
  container.querySelectorAll('.feat-tile').forEach(el => {
    el.addEventListener('click', () => showTag(el.dataset.tag));
  });
}

// ====================== TOPページ書籍 ======================
function renderHomeBooks() {
  // 偉人たちの本棚 — 毎日ランダム（日付seed）、ASIN無しでも検索URLでカバー
  const seed = daySeed();
  const picked = [];
  const usedKeys = new Set();

  const bookKey = (b) => b.asin || (b.title + '|' + (b.author || ''));
  const hasValidAsin = (b) => b && b.asin && /^[A-Z0-9]{10}$/i.test(b.asin);

  const pushBookOf = (pid, label) => {
    if (!pid) return;
    const p = DATA.people.find(x => x.id === pid);
    if (!p) return;
    const books = (p.books || []).filter(b => b && b.title);
    if (!books.length) return;
    const b = books[seed % books.length];
    const key = bookKey(b);
    if (usedKeys.has(key)) return;
    usedKeys.add(key);
    picked.push({ ...b, person: p, label });
  };
  pushBookOf(getOshi(), '♡ 推しの一冊');
  try {
    const t = getTodaysCompanion && getTodaysCompanion();
    if (t && t.personId) pushBookOf(t.personId, '本日の案内人');
  } catch (e) {}

  // 残りを日替わりランダムで埋める
  const all = [];
  DATA.people.forEach(p => {
    (p.books || []).forEach(b => {
      if (!b || !b.title) return;
      const key = bookKey(b);
      if (!usedKeys.has(key)) all.push({ ...b, person: p });
    });
  });
  all.sort((a, b) => ((hashStr(bookKey(a)) ^ seed) >>> 0) - ((hashStr(bookKey(b)) ^ seed) >>> 0));
  const bookCount = (typeof window !== 'undefined' && window.innerWidth >= 900) ? 6 : 4;
  while (picked.length < bookCount && all.length) {
    picked.push(all.shift());
  }

  const container = document.getElementById('homeBooks');
  if (!container || picked.length === 0) return;
  container.innerHTML = picked.map(b => {
    const q = encodeURIComponent(`${b.title} ${b.author || ''}`);
    const amazon = hasValidAsin(b)
      ? `https://www.amazon.co.jp/dp/${b.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`
      : `https://www.amazon.co.jp/s?k=${q}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
    const rakuten = rakutenSearchUrl(b.title, b.author);
    const fallbackHtml = `
      <div class="home-book-fallback">
        <div class="home-book-fallback-ornament">✦</div>
        <div class="home-book-fallback-title">${escapeHtml(b.title)}</div>
        ${b.author ? `<div class="home-book-fallback-author">${escapeHtml(b.author)}</div>` : ''}
      </div>`;
    const openbd = hasValidAsin(b) ? openbdCover(b.asin) : null;
    const coverHtml = hasValidAsin(b)
      ? `<img src="${amazonCover(b.asin)}" alt="${escapeHtml(b.title)}" loading="lazy"
             data-openbd="${openbd || ''}"
             onerror="const bd=this.dataset.openbd;if(bd&&this.src!==bd){this.src=bd;}else{this.parentElement.classList.add('no-cover');this.remove();}"
             onload="if(this.naturalWidth<50){const bd=this.dataset.openbd;if(bd&&this.src!==bd){this.src=bd;}else{this.parentElement.classList.add('no-cover');this.remove();}}">${fallbackHtml}`
      : fallbackHtml;
    const coverClass = hasValidAsin(b) ? 'home-book-cover' : 'home-book-cover no-cover';
    return `
      <div class="home-book-card">
        <a class="home-book-cover-wrap" href="${amazon}" target="_blank" rel="noopener sponsored">
          <div class="${coverClass}">${coverHtml}</div>
          ${b.label ? `<div class="home-book-ribbon">${b.label}</div>` : ''}
        </a>
        <div class="home-book-title">${escapeHtml(b.title)}</div>
        <div class="home-book-person">${escapeHtml(b.person.name)}</div>
        <div class="home-book-stores">
          <a class="home-book-store home-book-amazon" href="${amazon}" target="_blank" rel="noopener sponsored">Amazon</a>
          <a class="home-book-store home-book-rakuten" href="${rakuten}" target="_blank" rel="noopener sponsored">楽天</a>
        </div>
      </div>
    `;
  }).join('');
}

// ====================== 今日という日の歴史 ======================
function renderTodayEcho() {
  const block = document.getElementById('todayEchoBlock');
  const dateEl = document.getElementById('todayEchoDate');
  const list = document.getElementById('todayEchoList');
  if (!block || !dateEl || !list) return;
  const now = new Date();
  const m = now.getMonth() + 1, d = now.getDate();
  if (typeof window.findTodayEchoes !== 'function') return;
  const events = window.findTodayEchoes(DATA.people || [], m, d);
  if (events.length === 0) { block.style.display = 'none'; return; }
  block.style.display = '';
  dateEl.textContent = `📜 ${m}月${d}日`;
  const yearNow = now.getFullYear();
  list.innerHTML = events.map(e => {
    const p = DATA.people.find(x => x.id === e.id);
    if (!p) return '';
    const years = yearNow - (e.year || yearNow);
    const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
    const label = e.kind === 'birth' ? '生誕' : '没';
    const kindCls = e.kind === 'birth' ? 'birth' : 'death';
    return `
      <button class="today-echo-item ${kindCls}" data-jump-person="${p.id}">
        <div class="today-echo-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</div>
        <div class="today-echo-info">
          <div class="today-echo-years">${years}年前の今日</div>
          <div class="today-echo-name">${escapeHtml(p.name)} <span class="today-echo-kind">${label}</span></div>
          <div class="today-echo-field">${escapeHtml(p.field || '')}</div>
        </div>
      </button>
    `;
  }).join('');
  list.querySelectorAll('[data-jump-person]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.jumpPerson;
      if (pid && typeof showPerson === 'function') showPerson(pid);
    });
  });
}

// ====================== 歴史の鏡（時代を超えた偉人ペア） ======================
// 📚 今日の一冊 — 日替わりで1冊を紹介（日付seedで決定論的）
function renderBookOfTheDay() {
  const block = document.getElementById('bookOfDayBlock');
  const mount = document.getElementById('bookOfDayContent');
  if (!block || !mount || !DATA.people) return;
  // 本を持っている偉人一覧
  const withBooks = DATA.people.filter(p => Array.isArray(p.books) && p.books.some(b => b && b.title));
  if (withBooks.length === 0) return;
  // 日付seedで決定論的に選択（同じ日は同じ本）
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth()+1) * 100 + now.getDate();
  // 推し偉人が設定されていれば、推しの本から選ぶ（♡ ラベル表示）
  let p = null;
  let isOshiPick = false;
  try {
    const oshiId = (typeof getOshi === 'function') ? getOshi() : null;
    if (oshiId) {
      const oshi = withBooks.find(x => x.id === oshiId);
      if (oshi) { p = oshi; isOshiPick = true; }
    }
  } catch (e) {}
  if (!p) p = withBooks[seed % withBooks.length];
  const candidates = (p.books || []).filter(b => b && b.title);
  const b = candidates[seed % candidates.length];
  if (!b) return;
  const amazonQuery = encodeURIComponent(`${b.title} ${b.author || ''}`);
  const amazonUrl = b.asin
    ? `https://www.amazon.co.jp/dp/${b.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`
    : `https://www.amazon.co.jp/s?k=${amazonQuery}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
  const rakutenUrl = rakutenSearchUrl(b.title, b.author);
  const cover = b.asin
    ? `https://images-fe.ssl-images-amazon.com/images/P/${b.asin}.09.LZZZZZZZ.jpg`
    : '';
  const avatar = p.imageUrl
    ? `<div class="book-day-person-av" style="background-image:url('${p.imageUrl}')"></div>`
    : `<div class="book-day-person-av no-img">${(p.name || '?').charAt(0)}</div>`;
  block.style.display = '';
  mount.innerHTML = `
    <button class="book-day-person" data-book-day-person="${p.id}">
      ${avatar}
      <div class="book-day-person-info">
        ${isOshiPick ? '<div class="book-day-oshi-tag">♡ あなたの推しから</div>' : ''}
        <div class="book-day-person-name">${escapeHtml(p.name)}</div>
        <div class="book-day-person-field">${escapeHtml(p.field || '')}</div>
      </div>
    </button>
    <div class="book-day-card">
      ${cover ? `<div class="book-day-cover" style="background-image:url('${cover}')"></div>` : '<div class="book-day-cover no-img">📖</div>'}
      <div class="book-day-info">
        <div class="book-day-title">${escapeHtml(b.title)}</div>
        ${b.author ? `<div class="book-day-author">${escapeHtml(b.author)}</div>` : ''}
        ${b.description ? `<div class="book-day-desc">${escapeHtml(b.description)}</div>` : ''}
        <div class="book-day-stores">
          <a class="book-day-store book-day-amazon" href="${amazonUrl}" target="_blank" rel="noopener sponsored">📦 Amazon</a>
          <a class="book-day-store book-day-rakuten" href="${rakutenUrl}" target="_blank" rel="noopener sponsored">🛍 楽天</a>
        </div>
      </div>
    </div>
  `;
  mount.querySelector('[data-book-day-person]')?.addEventListener('click', (e) => {
    const pid = e.currentTarget.dataset.bookDayPerson;
    if (pid) showPerson(pid);
  });
}

function renderHistoryMirrors() {
  const list = document.getElementById('historyMirrorList');
  if (!list) return;
  const mirrors = (window.HISTORY_MIRRORS || []).filter(pair => {
    const a = DATA.people.find(p => p.id === pair.a.id);
    const b = DATA.people.find(p => p.id === pair.b.id);
    return a && b;
  });
  if (mirrors.length === 0) { list.innerHTML = ''; return; }
  // 毎日違うペアを3つピック
  const seed = (typeof daySeed === 'function') ? daySeed() : 0;
  const shuffled = [...mirrors].sort((x, y) => ((hashStr(x.theme) ^ seed) >>> 0) - ((hashStr(y.theme) ^ seed) >>> 0));
  const picks = shuffled.slice(0, 3);
  const pairHtml = (pair, i) => {
    const a = DATA.people.find(p => p.id === pair.a.id);
    const b = DATA.people.find(p => p.id === pair.b.id);
    const bgA = a.imageUrl ? `style="background-image:url('${a.imageUrl}')"` : '';
    const bgB = b.imageUrl ? `style="background-image:url('${b.imageUrl}')"` : '';
    const yearDiff = Math.abs((pair.b.year || 0) - (pair.a.year || 0));
    return `
      <article class="mirror-pair" data-pair-idx="${i}">
        <div class="mirror-theme">${escapeHtml(pair.theme)}</div>
        <div class="mirror-figures">
          <button class="mirror-fig" data-jump-person="${a.id}">
            <div class="mirror-fig-av" ${bgA}>${a.imageUrl ? '' : (a.name.charAt(0) || '?')}</div>
            <div class="mirror-fig-name">${escapeHtml(a.name)}</div>
            <div class="mirror-fig-year">${pair.a.year < 0 ? '紀元前' + Math.abs(pair.a.year) : pair.a.year + '年'}</div>
            <div class="mirror-fig-note">${escapeHtml(pair.a.note)}</div>
          </button>
          <div class="mirror-vs">
            <div class="mirror-vs-icon">🪞</div>
            <div class="mirror-vs-years">${yearDiff}年の時を超えて</div>
          </div>
          <button class="mirror-fig" data-jump-person="${b.id}">
            <div class="mirror-fig-av" ${bgB}>${b.imageUrl ? '' : (b.name.charAt(0) || '?')}</div>
            <div class="mirror-fig-name">${escapeHtml(b.name)}</div>
            <div class="mirror-fig-year">${pair.b.year < 0 ? '紀元前' + Math.abs(pair.b.year) : pair.b.year + '年'}</div>
            <div class="mirror-fig-note">${escapeHtml(pair.b.note)}</div>
          </button>
        </div>
        <p class="mirror-body">${escapeHtml(pair.body)}</p>
      </article>
    `;
  };
  const first = picks[0];
  const rest = picks.slice(1);
  list.innerHTML = `
    ${first ? pairHtml(first, 0) : ''}
    ${rest.length ? `
      <details class="mirror-more">
        <summary class="mirror-more-summary">
          <span>さらに ${rest.length} 組の時代を超えた二人を見る</span>
          <span class="mirror-more-arrow">▾</span>
        </summary>
        <div class="mirror-more-body">
          ${rest.map((p, i) => pairHtml(p, i + 1)).join('')}
        </div>
      </details>
    ` : ''}
  `;
  list.querySelectorAll('[data-jump-person]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.dataset.jumpPerson;
      if (pid && typeof showPerson === 'function') showPerson(pid);
    });
  });
}

// ====================== お知らせ（リリースノート） ======================
function renderUpdates() {
  const el = document.getElementById('updatesFeed');
  if (!el) return;
  const list = DATA.updates || [];
  if (list.length === 0) { el.innerHTML = '<div class="updates-empty">更新情報はまだありません。</div>'; return; }
  // 最新3件をデフォルト表示、展開で全部
  const shown = list.slice(0, 3);
  const hidden = list.slice(3);
  el.innerHTML = `
    <div class="updates-list">
      ${shown.map(u => updateItemHtml(u)).join('')}
      ${hidden.length > 0 ? `
        <details class="updates-more">
          <summary>もっと見る (${hidden.length}件)</summary>
          <div class="updates-list-more">${hidden.map(u => updateItemHtml(u)).join('')}</div>
        </details>
      ` : ''}
    </div>
  `;
  // ジャンプボタン
  el.querySelectorAll('.updates-item').forEach(item => {
    const btn = item.querySelector('.updates-jump-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      let target = null;
      try { target = JSON.parse(item.dataset.updateTarget || 'null'); } catch {}
      if (target?.action === 'worldview') {
        if (typeof openWorldviewModal === 'function') openWorldviewModal();
      } else if (target?.action === 'music') {
        const pBtn = document.getElementById('powerBtn');
        if (pBtn) pBtn.click();
        setTimeout(() => {
          const musicIcon = document.querySelector('[data-phone-action="music"]');
          if (musicIcon) musicIcon.click();
        }, 300);
      } else if (target?.view) {
        if (typeof showView === 'function') showView(target.view);
      }
    });
  });
}
function updateItemHtml(u) {
  const tagClass = {
    '新機能': 'updates-tag-new',
    '追加': 'updates-tag-add',
    '改善': 'updates-tag-improve',
    '修正': 'updates-tag-fix',
  }[u.tag] || '';
  const target = (typeof guessUpdateTarget === 'function') ? guessUpdateTarget(u.title + ' ' + (u.body||'')) : null;
  const ds = target ? `data-update-target='${JSON.stringify(target).replace(/'/g,'&#39;')}'` : '';
  return `
    <div class="updates-item" ${ds}>
      <div class="updates-meta">
        <span class="updates-date">${u.date || ''}</span>
        ${u.tag ? `<span class="updates-tag ${tagClass}">${u.tag}</span>` : ''}
      </div>
      <div class="updates-title">${u.title}</div>
      ${u.body ? `<div class="updates-body">${u.body}</div>` : ''}
      ${target ? `<div class="updates-action"><button class="updates-jump-btn">✨ 使ってみる →</button></div>` : ''}
    </div>
  `;
}

// ====================== 楽譜URL生成ヘルパー ======================
// 作品番号（BWV/Op./K./D./HWV/RV）を抽出
function extractCatalog(title) {
  const m = (title || '').match(/(BWV|WoO|Op\.?|作品|K\.|KV|D\.|HWV|RV)\s*\.?\s*([0-9０-９]+(?:[-–]\d+)?)/i);
  if (!m) return null;
  const cat = m[1].replace('作品', 'Op.');
  const num = m[2].replace(/[０-９]/g, d => '０１２３４５６７８９'.indexOf(d));
  return `${cat} ${num}`;
}
// 英語姓を取得
function familyNameEn(person) {
  const nameEn = (person.nameEn || '').trim();
  if (!nameEn) return '';
  const parts = nameEn.split(' ');
  return parts[parts.length - 1];
}
function buildImslpUrl(person, work) {
  const cat = extractCatalog(work && work.title);
  if (cat) {
    return `https://imslp.org/index.php?search=${encodeURIComponent(cat)}&title=Special%3ASearch&go=Go`;
  }
  // 作品番号が無ければ、作曲家のIMSLPカテゴリページへ
  const nameEn = (person.nameEn || '').trim();
  if (nameEn) {
    const parts = nameEn.split(' ');
    const family = parts[parts.length - 1];
    const given = parts.slice(0, -1).join(' ');
    const catP = encodeURIComponent(`Category:${family},_${given}`);
    return `https://imslp.org/wiki/${catP}`;
  }
  return `https://imslp.org/wiki/Main_Page`;
}
function buildMusescoreUrl(person, work) {
  // 英語姓 + 作品番号 で検索（Japaneseタイトルは使わない）
  const family = familyNameEn(person);
  const cat = extractCatalog(work && work.title);
  const q = [family, cat].filter(Boolean).join(' ');
  if (!q) return `https://musescore.com/sheetmusic`;
  return `https://musescore.com/sheetmusic?text=${encodeURIComponent(q)}`;
}

// ====================== 人物一覧 ======================
function renderCategoryFilter() {
  const bar = document.getElementById('categoryFilter');
  if (!bar) return;
  // データに存在するカテゴリだけ数え上げる
  const counts = { all: DATA.people.length };
  DATA.people.forEach(p => {
    const c = categoryOf(p.field);
    counts[c] = (counts[c] || 0) + 1;
  });
  const order = ['all', ...CATEGORY_RULES.map(r => r.id), 'other'];
  const chips = order
    .filter(id => id === 'all' || counts[id])
    .map(id => {
      const name = id === 'all' ? 'すべて' : CAT_NAME[id];
      const active = currentCategory === id ? 'active' : '';
      return `<button class="cat-chip ${active}" data-cat="${id}">${name}<span class="cat-count">${counts[id] || 0}</span></button>`;
    }).join('');
  bar.innerHTML = chips;
  bar.querySelectorAll('.cat-chip').forEach(el => {
    el.addEventListener('click', () => {
      currentCategory = el.dataset.cat;
      currentEra = 'all'; // カテゴリ変えたら時代リセット
      renderCategoryFilter();
      renderEraFilter();
      renderSortFilter();
      renderPeople(currentSearch);
    });
  });
  renderEraFilter();
  renderSortFilter();
}

function renderEraFilter() {
  const bar = document.getElementById('eraFilter');
  if (!bar) return;
  const rules = ERA_RULES[currentCategory];
  if (!rules) { bar.innerHTML = ''; return; }
  // 対象人物群
  const people = DATA.people.filter(p => categoryOf(p.field) === currentCategory);
  const counts = {};
  people.forEach(p => {
    const e = eraOf(currentCategory, p.birth);
    if (e) counts[e] = (counts[e] || 0) + 1;
  });
  const chips = [`<button class="era-chip ${currentEra==='all'?'active':''}" data-era="all">全時代<span class="cat-count">${people.length}</span></button>`]
    .concat(rules.filter(r => counts[r.id]).map(r => {
      const active = currentEra === r.id ? 'active' : '';
      return `<button class="era-chip ${active}" data-era="${r.id}">${r.name}<span class="cat-count">${counts[r.id]}</span></button>`;
    }));
  bar.innerHTML = chips.join('');
  bar.querySelectorAll('.era-chip').forEach(el => {
    el.addEventListener('click', () => {
      currentEra = el.dataset.era;
      renderEraFilter();
      renderPeople(currentSearch);
    });
  });
}

function renderSortFilter() {
  const bar = document.getElementById('sortFilter');
  if (!bar) return;
  const opts = [
    { id: 'birth_asc',  name: '年代順（古い順）' },
    { id: 'birth_desc', name: '年代順（新しい順）' },
    { id: 'name',       name: '名前順' },
  ];
  bar.innerHTML = opts.map(o =>
    `<button class="sort-chip ${currentSort===o.id?'active':''}" data-sort="${o.id}">${o.name}</button>`
  ).join('');
  bar.querySelectorAll('.sort-chip').forEach(el => {
    el.addEventListener('click', () => {
      currentSort = el.dataset.sort;
      renderSortFilter();
      renderPeople(currentSearch);
    });
  });
}

// 画面幅が変わった時に本日のおすすめ・偉人たちの本棚を再描画
if (typeof window !== 'undefined' && !window.__peopleResizeBound) {
  window.__peopleResizeBound = true;
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (typeof renderPeople === 'function' && document.getElementById('peopleList')) {
        renderPeople(currentSearch || '');
      }
      if (typeof renderHomeBooks === 'function' && document.getElementById('homeBooks')) {
        renderHomeBooks();
      }
    }, 200);
  });
}

function renderPeople(filter = '') {
  currentSearch = filter;
  const list = document.getElementById('peopleList');
  const q = (filter || '').trim().toLowerCase();
  let items = DATA.people.filter(p => {
    if (currentCategory !== 'all' && categoryOf(p.field) !== currentCategory) return false;
    if (currentEra !== 'all' && ERA_RULES[currentCategory]) {
      if (eraOf(currentCategory, p.birth) !== currentEra) return false;
    }
    if (!q) return true;
    const nameBlob = (p.name + ' ' + (p.nameEn || '')).toLowerCase();
    const traits = p.traits || {};
    const traitsBlob = []
      .concat(traits.hobbies || [], traits.foods || [], traits.likes || [], traits.dislikes || [])
      .join(' ')
      .toLowerCase();
    return nameBlob.includes(q) || traitsBlob.includes(q);
  });
  // 無条件（ホーム初期表示）のときは表示するたびにランダムに選出
  const isDefault = !q && currentCategory === 'all' && currentEra === 'all';
  if (isDefault) {
    const pickCount = (typeof window !== 'undefined' && window.innerWidth >= 900) ? 6 : 3;
    // 完全ランダムシャッフル（Fisher-Yates）
    const shuffled = items.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    items = shuffled.slice(0, pickCount);
  } else {
    // 並び替え
    items.sort((a, b) => {
      if (currentSort === 'name') return (a.name || '').localeCompare(b.name || '', 'ja');
      const ay = a.birth == null ? 9999 : a.birth;
      const by = b.birth == null ? 9999 : b.birth;
      return currentSort === 'birth_desc' ? by - ay : ay - by;
    });
  }
  if (items.length === 0) {
    list.innerHTML = '<div class="empty">該当する本がありません</div>';
    return;
  }
  list.innerHTML = `<div class="book-grid">${items.map(p => {
    const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
    return `
      <div class="person-book ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
        <button class="person-book-follow ${isFavPerson(p.id) ? 'active' : ''}" data-fav-toggle="${p.id}" aria-label="${isFavPerson(p.id) ? 'フォロー中' : 'フォロー'}">${isFavPerson(p.id) ? '✓ フォロー中' : '＋ フォロー'}</button>
        <div class="person-book-overlay"></div>
        ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
        <div class="person-book-info">
          ${p.nameEn ? `<div class="person-book-en">${p.nameEn}</div>` : ''}
          <div class="person-book-name">${p.name}</div>
          <div class="person-book-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field}</div>
        </div>
      </div>
    `;
  }).join('')}</div>`;
  list.querySelectorAll('.person-book').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-fav-toggle]')) return;
      showPerson(el.dataset.id);
    });
  });
  bindBookmarkToggle(list);
}

// ====================== 本棚の本（背表紙） ======================
const SPINE_COLORS = ['spine-wine', 'spine-green', 'spine-navy', 'spine-brown', 'spine-ink', 'spine-ochre'];
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 131 + s.charCodeAt(i)) >>> 0);
  return h;
}
function spineColor(key) {
  return SPINE_COLORS[hashStr(key) % SPINE_COLORS.length];
}
function spineHeight(key, base = 180, range = 30) {
  return base + (hashStr(key + '_h') % range);
}
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function personSpineHtml(p) {
  const bookmark = isFavPerson(p.id) ? '<div class="spine-bookmark"></div>' : '';
  return `
    <div class="book-spine ${spineColor(p.id)}" data-id="${p.id}" style="height:${spineHeight(p.id)}px">
      ${bookmark}
      <div class="spine-band top"></div>
      <div class="spine-title">${p.name}</div>
      <div class="spine-meta">${p.field}</div>
      <div class="spine-band bottom"></div>
    </div>
  `;
}
function tagSpineHtml(t) {
  return `
    <div class="book-spine tag-book ${spineColor('t_' + t.id)}" data-tag="${t.id}" style="height:${spineHeight(t.id, 165, 26)}px">
      <div class="spine-band top"></div>
      <div class="spine-title">${t.name}</div>
      <div class="spine-meta">${t.count}冊</div>
      <div class="spine-band bottom"></div>
    </div>
  `;
}
function bookshelfHtml(itemsHtml, perRow) {
  const rows = chunk(itemsHtml, perRow);
  return `
    <div class="bookshelf">
      ${rows.map(r => `<div class="shelf-row">${r.join('')}</div>`).join('')}
    </div>
  `;
}

// ====================== 本が開くアニメーション ======================
function playBookFlip({ title, subtitle, imageUrl }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('bookFlip');
    const cover = document.getElementById('bookCover');
    if (!overlay || !cover) { resolve(); return; }
    const nameEn = arguments[0].nameEn || '';
    if (imageUrl) {
      // TOPの表紙カードと同じ構造
      cover.classList.add('cover-with-photo');
      cover.innerHTML = `
        <div class="cover-photo" style="background-image:url('${imageUrl}')"></div>
        <div class="cover-card-overlay"></div>
        <div class="cover-card-frame" style="inset:16px"></div>
        <div class="cover-card-info" style="padding:18px 22px 24px">
          ${nameEn ? `<div class="cover-card-name-en">${nameEn}</div>` : ''}
          <div class="cover-card-name" style="font-size:26px">${title}</div>
          <div class="cover-card-meta">${subtitle || ''}</div>
        </div>
      `;
    } else {
      // タグなど: 文字だけの装丁
      cover.classList.remove('cover-with-photo');
      cover.innerHTML = `
        <div class="book-cover-inner">
          <div class="book-cover-ornament">─── ◆ ───</div>
          <div class="book-cover-name">${title}</div>
          <div class="book-cover-dates">${subtitle || ''}</div>
          <div class="book-cover-ornament">─── ◆ ───</div>
        </div>
      `;
    }
    // 再生のためにアニメーションをリセット
    const flipper = overlay.querySelector('.book-flipper');
    flipper.style.animation = 'none';
    overlay.classList.remove('closing');
    overlay.classList.remove('hidden');
    // 次フレームでアニメーション再開
    requestAnimationFrame(() => {
      flipper.style.animation = '';
    });
    // タイミング: ズーム入(750ms) → 表紙を見せる(400ms) → フェードアウト
    setTimeout(() => {
      resolve(); // 詳細画面を先に表示（フェードイン）
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('closing');
      }, 500);
    }, 1150);
  });
}

// ====================== 人物詳細 ======================
// 聖地巡礼チェックイン
const CHECKINS_KEY = 'ijin_checkins';
function loadCheckins() {
  try { return JSON.parse(localStorage.getItem(CHECKINS_KEY) || '{}'); }
  catch { return {}; }
}
function saveCheckins(obj) {
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(obj));
}
function checkinKey(personId, place) {
  return `${personId}::${(place.name || '').slice(0, 30)}`;
}
function isCheckedIn(personId, place) {
  const k = checkinKey(personId, place);
  return !!loadCheckins()[k];
}
function toggleCheckin(personId, place) {
  const k = checkinKey(personId, place);
  const all = loadCheckins();
  if (all[k]) {
    delete all[k];
    saveCheckins(all);
    return false;
  }
  all[k] = {
    personId,
    name: place.name,
    location: place.location,
    ts: Date.now(),
  };
  saveCheckins(all);
  return true;
}
function totalCheckins() {
  return Object.keys(loadCheckins()).length;
}

// 訪問回数・足跡
const VISITS_KEY = 'ijin_visits';
const LAST_VISIT_KEY = 'ijin_last_visit_day';

function loadVisits() {
  try { return JSON.parse(localStorage.getItem(VISITS_KEY) || '{}'); }
  catch { return {}; }
}
function recordVisit(personId) {
  // 1日1回のみカウント
  const today = new Date().toISOString().slice(0, 10);
  let lastVisit = {};
  try { lastVisit = JSON.parse(localStorage.getItem(LAST_VISIT_KEY) || '{}'); }
  catch {}
  if (lastVisit[personId] === today) return;
  lastVisit[personId] = today;
  localStorage.setItem(LAST_VISIT_KEY, JSON.stringify(lastVisit));
  const visits = loadVisits();
  visits[personId] = (visits[personId] || 0) + 1;
  localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
  // グローバル訪問カウンター（誰が見ても増える・無料会員/ゲストも含む）
  try { if (typeof window.incrementGlobalVisit === 'function') window.incrementGlobalVisit(personId); } catch {}
  // 10回以上訪問でスタンプ
  if ((visits[personId] || 0) >= 10) { try { grantStamp(personId, 'visit_loyal'); } catch {} }
  // 訪問数更新のタイミングでフォローバック条件を再評価
  try { if (typeof checkFollowBackEligibility === 'function') checkFollowBackEligibility(personId); } catch {}
}
function getVisitCount(personId) {
  return loadVisits()[personId] || 0;
}
function totalFootprints() {
  const v = loadVisits();
  return Object.values(v).reduce((a, b) => a + b, 0);
}
// 偉人がユーザーをフォローしているか（内部エリジビリティ判定通過で forcedFollows に追加された偉人のみ）
const FORCED_FOLLOW_KEY = 'ijin_forced_follows';
const USER_UNFOLLOWED_AT_KEY = 'ijin_unfollowed_at';
const USER_FOLLOWED_AT_KEY = 'ijin_followed_at';
const BDAY_GREETED_KEY = 'ijin_bday_greeted';
function loadForcedFollows() {
  try { return new Set(JSON.parse(localStorage.getItem(FORCED_FOLLOW_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveForcedFollows(set) {
  localStorage.setItem(FORCED_FOLLOW_KEY, JSON.stringify([...set]));
}
// ============================================================================
// フォローバック判定ロジック（※内部のみ・UIに露出させない）
// ----------------------------------------------------------------------------
// 【旧ルール撤廃】「クイズ Lv.3 以上で自動フォロー」は廃止済み。
//   → スタンプの数はフォローバック判定に直接は使わない（条件の一つでもない）。
// 【前提条件】ユーザーがその偉人を「現在フォローしている」場合にのみ
//   フォローバックの判定を行う。未フォローなら他の条件を満たしても対象外。
// ============================================================================
function isFollowedByPerson(personId) {
  // 前提: 自分がその偉人を現在フォローしていない → 偉人からもフォローされない
  if (!isFavPerson(personId)) return false;
  // 内部条件（meetsFollowBackCriteria）を満たしたとき forcedFollows に追加され、
  // それに含まれる偉人だけが「フォロー中」と判定される
  return loadForcedFollows().has(personId);
}
// 1日1回ユーザーが「いいね」した偉人の集計（favQuotesから逆算）
function getLikesForPerson(personId) {
  let n = 0;
  favQuotes.forEach(k => { if (k.startsWith(personId + '::')) n++; });
  favEvents.forEach(k => { if (k.startsWith(personId + '::')) n++; });
  return n;
}
// 設定済みのユーザー特性と偉人の共通項チェック
function hasCommonTraitWith(person) {
  const mine = loadMyTraits();
  if (!mine || (!mine.foods?.length && !mine.hobbies?.length && !mine.likes?.length && !mine.dislikes?.length)) return false;
  const pt = person.traits || {};
  for (const cat of ['foods','hobbies','likes','dislikes']) {
    const mineSet = new Set(mine[cat] || []);
    for (const it of (pt[cat] || [])) { if (mineSet.has(it)) return true; }
  }
  return false;
}
// ユーザーが、その偉人がブロックしている人をフォローしていないか
function userNotFollowingPersonBlocks(person) {
  const blocks = (person.rivals || person.blocks || []).map(b => b.id || b);
  if (!blocks.length) return true;
  for (const bid of blocks) { if (favPeople.has(bid)) return false; }
  return true;
}
// フォローバック条件を満たすか（※内部判定。UIに露出しない）
// 前提：ユーザーがこの偉人を現在フォローしていること。
// 次の4条件をすべて満たすと forcedFollows に追加される:
//   1) 訪問回数 >= 10
//   2) いいね（お気に入り名言・出来事）>= 10
//   3) その偉人がブロック（論敵・宿敵等）としている偉人を自分がフォローしていない
//   4) ユーザーの traits とこの偉人の traits に共通項が一つ以上ある
function meetsFollowBackCriteria(person) {
  if (!person) return false;
  // 【大前提】ユーザーが現在この偉人をフォロー中でなければ一切評価しない
  if (!isFavPerson(person.id)) return false;
  if (getVisitCount(person.id) < 10) return false;
  if (getLikesForPerson(person.id) < 10) return false;
  if (!userNotFollowingPersonBlocks(person)) return false;
  if (!hasCommonTraitWith(person)) return false;
  return true;
}
// 既に通知済みのフォロー（重複トースト防止）
const NOTIFIED_FOLLOWS_KEY = 'ijin_notified_follows';
function isFollowNotified(personId) {
  try { return (JSON.parse(localStorage.getItem(NOTIFIED_FOLLOWS_KEY) || '[]')).includes(personId); }
  catch { return false; }
}
function markFollowNotified(personId) {
  try {
    const arr = JSON.parse(localStorage.getItem(NOTIFIED_FOLLOWS_KEY) || '[]');
    if (!arr.includes(personId)) {
      arr.push(personId);
      localStorage.setItem(NOTIFIED_FOLLOWS_KEY, JSON.stringify(arr));
    }
  } catch {}
}

function checkFollowBackEligibility(personId) {
  const person = DATA.people.find(p => p.id === personId);
  if (!person) return;
  if (isFollowedByPerson(personId)) return;
  if (!meetsFollowBackCriteria(person)) return;
  const set = loadForcedFollows();
  if (set.has(personId)) return;
  set.add(personId);
  saveForcedFollows(set);
  // 追加日を記録（誕生日手紙リムーブ判定で使用）
  try {
    const map = JSON.parse(localStorage.getItem(USER_FOLLOWED_AT_KEY) || '{}');
    map[personId] = Date.now();
    localStorage.setItem(USER_FOLLOWED_AT_KEY, JSON.stringify(map));
  } catch {}
  try { if (typeof renderFavorites === 'function') renderFavorites(); } catch {}
  // 通知は初回のみ：トーストとレキットに1回だけ
  if (!isFollowNotified(personId)) {
    showFollowToast(person);
    try { rekittoNotifyFollow(person); } catch {}
    markFollowNotified(personId);
  }
}
// ============ 📜 レキット（歴史管理人）— チャット風お知らせ担当 ============
const REKITTO_MSGS_KEY = 'ijin_rekitto_msgs';
const REKITTO_LAST_READ_KEY = 'ijin_rekitto_last_read';
const REKITTO_SEEN_UPDATES_KEY = 'ijin_rekitto_seen_updates';
const REKITTO_AVATAR = 'assets/guide/rekitto.webp'; // ループ動画のフォールバック静止画
// レキットのアニメ動画アバター（iOS=animated webp、それ以外=video）
function rekittoAvatarHtml(cls = '') {
  if (typeof IS_IOS !== 'undefined' && IS_IOS) {
    return `<img class="rekitto-video-av ${cls}" src="assets/guide/rekitto.webp?v=1" alt="" aria-hidden="true">`;
  }
  return `<video class="rekitto-video-av ${cls}" src="assets/guide/rekitto.mp4?v=1" muted autoplay loop playsinline preload="auto" aria-hidden="true" poster="assets/guide/rekitto.webp"></video>`;
}

function getRekittoMsgs() {
  try {
    const msgs = JSON.parse(localStorage.getItem(REKITTO_MSGS_KEY) || '[]');
    // 既存メッセージの余分な空白・インデントをクリーンアップ
    let cleaned = false;
    msgs.forEach(m => {
      if (m.text) {
        const lines = m.text.split('\n').map(l => l.replace(/^\s+/, ''));
        const t2 = lines.join('\n').replace(/\n{3,}/g, '\n\n');
        if (t2 !== m.text) { m.text = t2; cleaned = true; }
      }
    });
    if (cleaned) try { localStorage.setItem(REKITTO_MSGS_KEY, JSON.stringify(msgs)); } catch {}
    return msgs;
  } catch { return []; }
}
function saveRekittoMsgs(msgs) {
  try { localStorage.setItem(REKITTO_MSGS_KEY, JSON.stringify(msgs)); } catch {}
}
function pushRekittoMsg(msg) {
  const msgs = getRekittoMsgs();
  // 重複通知防止：同じ(kind, personId/userId/updateKey)の過去メッセージがあればスキップ
  if (msg && msg.kind) {
    const dupKey = msg.personId || msg.userId || msg.updateKey || '';
    if (dupKey) {
      const already = msgs.some(m => m.kind === msg.kind && (m.personId || m.userId || m.updateKey || '') === dupKey);
      if (already) return;
    }
  }
  msgs.push({ ts: Date.now(), ...msg });
  saveRekittoMsgs(msgs);
  try { if (typeof window.renderIconBadges === 'function') window.renderIconBadges(); } catch {}
  try { if (typeof window.updatePhoneNotif === 'function') window.updatePhoneNotif(); } catch {}
  try { if (typeof window.renderPlazaTalks === 'function') window.renderPlazaTalks(); } catch {}
}
function getRekittoUnread() {
  const last = parseInt(localStorage.getItem(REKITTO_LAST_READ_KEY) || '0', 10);
  return Math.max(0, getRekittoMsgs().length - last);
}
function markRekittoRead() {
  localStorage.setItem(REKITTO_LAST_READ_KEY, String(getRekittoMsgs().length));
}
// 更新履歴を監視して、新しい項目だけ通知
function syncRekittoUpdates() {
  if (!DATA.updates || !DATA.updates.length) return;
  const isFirstRun = localStorage.getItem(REKITTO_SEEN_UPDATES_KEY) === null;
  const keys = DATA.updates.map(u => u.date + '|' + u.title);
  if (isFirstRun) {
    // 初回は既存の更新を全部既読扱いにする（スパム防止）
    localStorage.setItem(REKITTO_SEEN_UPDATES_KEY, JSON.stringify(keys));
    return;
  }
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(REKITTO_SEEN_UPDATES_KEY) || '[]'); } catch {}
  const seenSet = new Set(seen);
  const newUpdates = DATA.updates.filter(u => !seenSet.has(u.date + '|' + u.title));
  if (!newUpdates.length) return;
  newUpdates.forEach(u => {
    // タイトルからリンク先を推定
    const target = guessUpdateTarget(u.title + ' ' + (u.body||''));
    pushRekittoMsg({
      text: `こちら側で、新しい扉が開きました。\n【${u.tag || 'お知らせ'}】${u.title}\n\n${u.body}`,
      kind: 'update',
      linkLabel: (u.tag === '新機能') ? '✨ 扉を開く' : '詳しく見る',
      target: target,
    });
  });
}
// 更新内容からジャンプ先を推測
function guessUpdateTarget(text) {
  const s = (text || '').toLowerCase();
  if (/年表|時代|歴史の鏡|木霊/.test(text)) return { view: 'history' };
  if (/偉人検索|感情|タグ/.test(text)) return { view: 'tags' };
  if (/ルーティン/.test(text)) return { view: 'routines' };
  if (/ブログ|読み物/.test(text)) return { view: 'articles' };
  if (/わたしの本|favorites/.test(text)) return { view: 'favorites' };
  if (/世界観|レキット|ラビン/.test(text)) return { action: 'worldview' };
  if (/ミュージック|bgm/.test(text)) return { action: 'music' };
  if (/めしる|レシピ|料理人|献立|買い物リスト|シェフ/.test(text)) return { action: 'meshiru' };
  if (/今日|誕生日|ホーム/.test(text)) return { view: 'people' };
  return { view: 'people' };
  localStorage.setItem(REKITTO_SEEN_UPDATES_KEY, JSON.stringify(keys));
}
// 偉人からフォローされたときにレキットが知らせる
function rekittoNotifyFollow(person) {
  if (!person) return;
  pushRekittoMsg({
    text: `✉ 歴史の向こう側から、${person.name}からの便りが届きました。\n\n「あなたのことを、見ていました」——\nラビンがそっと手渡してくれたのを、ここに届けます。\nあなたの本棚に、この方も棲みはじめます。`,
    kind: 'follow',
    personId: person.id,
    linkLabel: `${person.name}のページを開く`,
  });
}
// 会員からフォローされたとき
function rekittoNotifyUserFollow(user) {
  if (!user) return;
  pushRekittoMsg({
    text: `✉ ${user.name || '新しい会員'}さんが、あなたをフォローしました。\n\n同じ時代を生きる人。こちら側での新しい縁を、お伝えしておきます。`,
    kind: 'user_follow',
    userId: user.uid || user.id,
    linkLabel: 'プロフィールを見る',
  });
}

// 全偉人に対してエリジビリティを再評価
function runFollowBackScan() {
  (DATA.people || []).forEach(p => checkFollowBackEligibility(p.id));
}
// 誕生日通知（今日が誕生日の、フォロー中の偉人）
function runBirthdayNotifications() {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
  let greeted = {};
  try { greeted = JSON.parse(localStorage.getItem(BDAY_GREETED_KEY) || '{}'); } catch {}
  (DATA.people || []).forEach(p => {
    if (!favPeople.has(p.id)) return;
    if (p.birthMonth !== (today.getMonth()+1) || p.birthDay !== today.getDate()) return;
    if (greeted[p.id] === todayKey) return;
    greeted[p.id] = todayKey;
    const msg = `今日は${p.name}の誕生日です。お祝いしましょう。`;
    // アプリ外通知
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('🎂 誕生日のお知らせ', { body: msg, icon: p.imageUrl || '/app/assets/icon-192.png', tag: `bday-${p.id}-${todayKey}` }); } catch {}
    }
    // アプリ内トースト
    showFollowToast({ id: p.id, name: '🎂 ' + p.name, imageUrl: p.imageUrl });
  });
  localStorage.setItem(BDAY_GREETED_KEY, JSON.stringify(greeted));
}
// フォローバック解除条件の定期チェック
function runFollowBackRemoval() {
  const set = loadForcedFollows();
  if (set.size === 0) return;
  let unfollowedAt = {};
  let followedAt = {};
  try { unfollowedAt = JSON.parse(localStorage.getItem(USER_UNFOLLOWED_AT_KEY) || '{}'); } catch {}
  try { followedAt = JSON.parse(localStorage.getItem(USER_FOLLOWED_AT_KEY) || '{}'); } catch {}
  const letters = (typeof loadLetters === 'function') ? loadLetters() : [];
  const now = Date.now();
  const DAY = 86400000;
  const today = new Date();
  let changed = false;
  [...set].forEach(pid => {
    const p = DATA.people.find(x => x.id === pid);
    if (!p) return;
    // a) ユーザーが解除済みで15日経過
    if (unfollowedAt[pid] && now - unfollowedAt[pid] > 15 * DAY) {
      set.delete(pid); changed = true; return;
    }
    // b) 誕生日から1ヶ月経過し、その間に「おめでとう」を含む手紙が送られていない
    if (p.birthMonth && p.birthDay) {
      const thisYearBd = new Date(today.getFullYear(), p.birthMonth - 1, p.birthDay).getTime();
      const sinceBd = now - thisYearBd;
      if (sinceBd > 30 * DAY && sinceBd < 365 * DAY) {
        const wrote = letters.some(L => L.personId === pid && L.ts >= thisYearBd && L.ts <= thisYearBd + 30 * DAY && /おめでとう/.test(L.body || L.text || ''));
        if (!wrote) { set.delete(pid); changed = true; }
      }
    }
  });
  if (changed) saveForcedFollows(set);
}

// しおり（最近読んだ偉人）
const BOOKMARK_KEY = 'ijin_bookmarks';
function loadBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]'); }
  catch { return []; }
}
function saveBookmark(personId) {
  if (!personId) return;
  const list = loadBookmarks().filter(b => b.id !== personId);
  list.unshift({ id: personId, at: Date.now() });
  // 最新20人まで保持
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list.slice(0, 20)));
}

// ページめくり効果音（Web Audio API で合成）
let __pageFlipAudioCtx = null;
function playPageFlipSound() {
  if (isMuted()) return;
  // MP3を優先再生、失敗したら合成音にフォールバック
  const el = document.getElementById('sfxPageFlip');
  if (el) {
    try { el.currentTime = 0; el.volume = 0.6; el.play().catch(() => {}); return; } catch {}
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!__pageFlipAudioCtx) __pageFlipAudioCtx = new AC();
    const ctx = __pageFlipAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    // ホワイトノイズで紙がすれる音を合成
    const bufferSize = ctx.sampleRate * 0.35;
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // 前半は弱く、中盤で強く、後半で減衰
      const t = i / bufferSize;
      const envelope = t < 0.5 ? t * 2 : (1 - t) * 2;
      data[i] = (Math.random() * 2 - 1) * envelope * 0.35;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    // ハイパスフィルタで紙の擦れ感
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    // ローパスで上を削って自然に
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 8000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    src.connect(hp).connect(lp).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.4);
  } catch (e) { /* ignore */ }
}

// ポータル遷移：スマホをズームアップしてフルスクリーン動画で偉人の世界へ入り込む
function playPortalTransition(menuEl, onComplete) {
  const portal = document.getElementById('portalTransition');
  const video = portal?.querySelector('.portal-video');
  if (!portal || !video) {
    if (menuEl) menuEl.classList.remove('open');
    setTimeout(() => onComplete?.(), 260);
    return;
  }

  // 0. 先にスマホ関連のノイズ・BGMを停止して、目的ビューのBGM再生を裏で開始させる
  try { stopPhoneAmbience?.(); } catch {}
  try {
    const bgm = document.getElementById('squareBgm');
    if (bgm) { bgm.pause(); bgm.currentTime = 0; }
  } catch {}
  try {
    const plazaEl = document.getElementById('phonePlazaApp');
    if (plazaEl) plazaEl.hidden = true;
  } catch {}

  // 1. スマホをズームアップ（視覚効果のみ、裏ではすでに遷移）
  if (menuEl) {
    menuEl.classList.add('portal-zooming');
  }

  // 2. ポータル動画＆SFX再生
  portal.hidden = false;
  requestAnimationFrame(() => {
    portal.classList.add('active');
    try {
      video.currentTime = 0;
      video.play().catch(() => {});
    } catch {}
    try {
      const sfx = document.getElementById('portalSfx');
      if (sfx && !isMuted()) {
        sfx.currentTime = 0;
        sfx.volume = 0.7;
        sfx.play().catch(() => {});
      }
    } catch {}
  });

  // 3. ポータル表示と同時に裏でビュー切替＆BGM開始（ユーザーには見えないが音は鳴る）
  //    スマホはまだズームアニメ中だが classList.remove('open') で裏側の処理を完了させる
  setTimeout(() => {
    if (menuEl) {
      menuEl.classList.remove('open');
      menuEl.setAttribute('aria-hidden', 'true');
    }
    // 戻る/進む浮遊ナビを再表示、レキットはホーム画面のときだけ
    document.getElementById('floatNav')?.classList.remove('hide-for-phone');
    {
      const el = document.getElementById('powerHintAnim');
      const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
      if (el) el.hidden = (activeView !== 'people');
    }
    onComplete?.();  // → showView(v) がここで走る ⇒ 対象ビューのBGMが鳴り始める
  }, 120);

  // 4. 動画終了後にポータルをフェードアウト（合計約0.9s）
  const TOTAL_MS = 900;
  setTimeout(() => {
    if (menuEl) menuEl.classList.remove('portal-zooming');
    portal.classList.remove('active');
    setTimeout(() => {
      portal.hidden = true;
      try { video.pause(); video.currentTime = 0; } catch {}
      try {
        const sfx = document.getElementById('portalSfx');
        if (sfx) { sfx.pause(); sfx.currentTime = 0; }
      } catch {}
    }, 180);
  }, TOTAL_MS);
}

// スマホ起動中のデジタルアンビエントノイズ（開いている間ループ）
let __phoneAmbience = null;
function startPhoneAmbience() {
  if (isMuted()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!__pageFlipAudioCtx) __pageFlipAudioCtx = new AC();
    const ctx = __pageFlipAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    // 既に再生中なら何もしない
    if (__phoneAmbience) return;

    // 2秒分のホワイトノイズバッファ（グリッチ入り）を作成してループ
    const dur = 2.0;
    const size = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) {
      // 基本：微小なホワイトノイズ
      let s = (Math.random() * 2 - 1) * 0.3;
      // 散発的なグリッチ（2%）
      if (Math.random() < 0.02) s += (Math.random() * 2 - 1) * 0.7;
      data[i] = s;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // バンドパスで高域シュルシュルを抑えた静かなノイズに
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1200;
    bp.Q.value = 0.8;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 300;
    // 微弱なトレモロ（ゆらぎ）で「生きてる」感を出す
    const gain = ctx.createGain();
    gain.gain.value = 0;  // 開始時0→フェードイン
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.01; // 音量を微妙に揺らす
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(hp).connect(bp).connect(gain).connect(ctx.destination);
    // フェードイン
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.5);
    src.start(now);
    lfo.start(now);
    __phoneAmbience = { src, lfo, gain, ctx };
  } catch (e) { /* 無音で継続 */ }
}
function stopPhoneAmbience() {
  if (!__phoneAmbience) return;
  try {
    const { src, lfo, gain, ctx } = __phoneAmbience;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    src.stop(now + 0.35);
    lfo.stop(now + 0.35);
  } catch {}
  __phoneAmbience = null;
}

// スマホ起動のデジタルノイズ（Web Audio APIで合成：グリッチ→ビープ）
function playPhoneBootSound() {
  if (isMuted()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!__pageFlipAudioCtx) __pageFlipAudioCtx = new AC();
    const ctx = __pageFlipAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 1. ホワイトノイズ（ザザッ）
    const noiseDur = 0.25;
    const bufferSize = Math.floor(ctx.sampleRate * noiseDur);
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // グリッチ感：確率的にピークを挟む
      const t = i / bufferSize;
      const glitch = Math.random() < 0.08 ? (Math.random() * 2 - 1) : 0;
      data[i] = (Math.random() * 2 - 1) * (1 - t * 0.6) + glitch * 0.5;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(600, now + noiseDur);
    noiseFilter.Q.value = 2;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noiseSrc.start(now);
    noiseSrc.stop(now + noiseDur + 0.05);

    // 2. 短いデジタルビープ（ピッ、起動音）
    const beepAt = now + 0.22;
    const beep = ctx.createOscillator();
    beep.type = 'square';
    beep.frequency.setValueAtTime(880, beepAt);
    beep.frequency.setValueAtTime(1320, beepAt + 0.05);
    const beepGain = ctx.createGain();
    beepGain.gain.setValueAtTime(0, beepAt);
    beepGain.gain.linearRampToValueAtTime(0.1, beepAt + 0.005);
    beepGain.gain.setValueAtTime(0.1, beepAt + 0.09);
    beepGain.gain.exponentialRampToValueAtTime(0.001, beepAt + 0.13);
    beep.connect(beepGain).connect(ctx.destination);
    beep.start(beepAt);
    beep.stop(beepAt + 0.14);

    // 3. 低音のパッ（起動の重み）
    const thumpAt = now + 0.02;
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, thumpAt);
    thump.frequency.exponentialRampToValueAtTime(40, thumpAt + 0.15);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.25, thumpAt);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, thumpAt + 0.15);
    thump.connect(thumpGain).connect(ctx.destination);
    thump.start(thumpAt);
    thump.stop(thumpAt + 0.16);
  } catch (e) { /* 無音で継続 */ }
}

// 鍵が開く音（Web Audio APIで合成：金属クリック＋回転＋解錠クリック）
function playKeyUnlockSound() {
  if (isMuted()) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!__pageFlipAudioCtx) __pageFlipAudioCtx = new AC();
    const ctx = __pageFlipAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // 1. 最初の金属的なクリック音（鍵を差し込む）
    const makeClick = (t, freq, dur, volume) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = freq;
      hp.Q.value = 8;
      osc.connect(hp).connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    };

    // 鍵カチッ（差し込み）
    makeClick(now, 3000, 0.04, 0.3);
    makeClick(now + 0.02, 2400, 0.05, 0.25);

    // 2. 鍵を回す音（メカニカルな摩擦音）
    const bufSize = ctx.sampleRate * 0.35;
    const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / bufSize;
      // 中央で山になるエンベロープ
      const env = Math.sin(t * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.25;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(800, now + 0.08);
    bp.frequency.linearRampToValueAtTime(1600, now + 0.4);
    bp.Q.value = 4;
    const gTurn = ctx.createGain();
    gTurn.gain.setValueAtTime(0.6, now + 0.08);
    gTurn.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    src.connect(bp).connect(gTurn).connect(ctx.destination);
    src.start(now + 0.08);
    src.stop(now + 0.5);

    // 3. 解錠カチャン（より低い音）
    makeClick(now + 0.45, 1200, 0.08, 0.4);
    makeClick(now + 0.48, 800, 0.12, 0.35);

    // 4. 最後の余韻（鈴のような金属音）
    const bell = ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(2400, now + 0.5);
    const gBell = ctx.createGain();
    gBell.gain.setValueAtTime(0, now + 0.5);
    gBell.gain.linearRampToValueAtTime(0.2, now + 0.51);
    gBell.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    bell.connect(gBell).connect(ctx.destination);
    bell.start(now + 0.5);
    bell.stop(now + 1.05);
  } catch (e) { /* ignore */ }
}

// ミュート状態管理
const MUTE_KEY = 'ijin_muted';
function isMuted() { return localStorage.getItem(MUTE_KEY) === '1'; }
function setMuted(on) {
  if (on) localStorage.setItem(MUTE_KEY, '1');
  else localStorage.removeItem(MUTE_KEY);
}

function applyMuteState() {
  const muted = isMuted();
  // 全BGMをミュート／ミュート解除
  ['homeBgm', 'searchBgm', 'historyBgm', 'routineBgm', 'blogBgm', 'favoritesBgm', 'squareBgm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.muted = muted;
  });
  // ボタン表示更新
  const btn = document.getElementById('muteToggle');
  if (btn) {
    btn.textContent = muted ? '🔇' : '🔊';
    btn.classList.toggle('muted', muted);
  }
}

// 起動時のウェルカムイントロ（アニメ＋ボイス）
// iOS Safari 判定（VP9 alpha 非対応 → アニメーションWebPへ切替）
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function initWelcomeIntro() {
  const intro = document.getElementById('welcomeIntro');
  if (!intro) return;
  // 一度見たウェルカムは表示しない（iOS含む全環境で、タブ遷移で再発しないように）
  const SEEN_KEY = 'ijin_welcome_intro_seen';
  if (localStorage.getItem(SEEN_KEY)) {
    intro.remove();
    return;
  }
  // 共有URL経由でアクセスされた場合はイントロを出さない（偉人/時代/タグへ直接行く人向け）
  // ※SEEN_KEY は書き込まない：後でホーム画面に辿り着いたとき本来のイントロが出るように。
  try {
    const qp = new URLSearchParams(location.search);
    if (qp.get('person') || qp.get('era') || qp.get('tag') || qp.get('user')) {
      intro.remove();
      return;
    }
  } catch {}
  // 見終わったらマーク
  const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch {} };
  let video = intro.querySelector('.welcome-intro-video');
  // iOSはvideo→img(webp)に差し替え（真の透過）
  if (IS_IOS && video) {
    const img = document.createElement('img');
    img.className = 'welcome-intro-video';
    img.src = 'assets/guide/welcome-intro.webp?v=1';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.style.mixBlendMode = 'normal';
    video.replaceWith(img);
    video = null;  // img化後はvideo操作を無効に
  }
  const voice = document.getElementById('welcomeIntroVoice');
  const skip = intro.querySelector('.welcome-intro-skip');
  const rabin = document.getElementById('powerHintAnim');
  intro.hidden = false;
  // 通常のラビンを一時的に隠す（イントロと入れ替わり）
  if (rabin) rabin.style.visibility = 'hidden';
  const close = () => {
    try { voice?.pause(); } catch {}
    try { video?.pause(); } catch {}
    markSeen();
    intro.remove();
    if (rabin) rabin.style.visibility = '';  // 通常のラビンを再表示
  };
  // 動画終了でフェードなし即クローズ、イントロは一回だけ
  video?.addEventListener('ended', () => {
    if ((video.duration || 0) > 1) close();
  });
  skip?.addEventListener('click', close);
  // 音声自動再生を試みる（失敗したら初回タップで再生）
  const tryPlayVoice = () => {
    if (!voice) return;
    voice.play().catch(() => {
      const once = () => { voice.play().catch(()=>{}); document.removeEventListener('click', once); document.removeEventListener('touchstart', once); };
      document.addEventListener('click', once, { once: true });
      document.addEventListener('touchstart', once, { once: true });
    });
  };
  tryPlayVoice();
  // セーフティ: 10秒後に強制クローズ
  setTimeout(close, 10000);
}

function initPhoneMenu() {
  const btn = document.getElementById('powerBtn');
  const menu = document.getElementById('phoneMenu');
  if (!btn || !menu) return;

  // ラビンキャラクター（常設・タップで表情バリアント切替）
  (function initRabinChara() {
    const hint = document.getElementById('powerHintAnim');
    if (!hint) return;
    hint.hidden = false;
    // ウェルカムイントロが走る場合は initWelcomeIntro が visibility:hidden を維持するので、
    // ここでは常に次フレームで表示 → イントロがあれば再度隠す流れで一瞬チラつきを防ぐ
    const welcomeSeen = (() => { try { return !!localStorage.getItem('ijin_welcome_intro_seen'); } catch { return true; } })();
    if (welcomeSeen) {
      requestAnimationFrame(() => { hint.style.visibility = ''; });
    }
    // イントロが走る場合は initWelcomeIntro の close() で visibility を戻す
    let video = hint.querySelector('.power-hint-video');
    const VARIANTS_WEBM = ['rabin.webm','rabin-var1.webm','rabin-var2.webm','rabin-var3.webm'];
    const VARIANTS_WEBP = ['rabin.webp','rabin-var1.webp','rabin-var2.webp','rabin-var3.webp'];
    // iOSはvideo→img(webp)に差し替え（真の透過）
    let imgEl = null;
    if (IS_IOS && video) {
      imgEl = document.createElement('img');
      imgEl.className = 'power-hint-video';
      imgEl.src = 'assets/guide/' + VARIANTS_WEBP[0] + '?v=1';
      imgEl.alt = '';
      imgEl.setAttribute('aria-hidden', 'true');
      imgEl.style.mixBlendMode = 'normal';
      video.replaceWith(imgEl);
      video = null;
    }
    // タップでバリアント切替（あくび・頷きなど別の姿を楽しめる）
    // すべてのバリアントを事前プリロードして一瞬のフラッシュを防ぐ
    try {
      VARIANTS_WEBM.forEach(src => {
        const v = document.createElement('video');
        v.preload = 'auto';
        v.muted = true;
        v.src = 'assets/guide/' + src + '?v=2';
      });
      VARIANTS_WEBP.forEach(src => {
        const i = new Image();
        i.src = 'assets/guide/' + src + '?v=2';
      });
    } catch {}
    let idx = 0;
    hint.addEventListener('click', (e) => {
      e.stopPropagation();
      idx = (idx + 1) % 4;
      if (imgEl) {
        imgEl.src = 'assets/guide/' + VARIANTS_WEBP[idx] + '?v=2';
      } else if (video) {
        // src変更前に現在のフレームをposterとして保持（黒フラッシュ防止）
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 480;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx && video.videoWidth) ctx.drawImage(video, 0, 0);
          video.poster = canvas.toDataURL();
        } catch {}
        video.innerHTML = `<source src="assets/guide/${VARIANTS_WEBM[idx]}?v=2" type="video/webm">`;
        video.load();
        video.play().catch(()=>{});
      }
    });
    // 初回だけボイス
    const VOICE_KEY = 'ijin_rabin_voice_played';
    if (!localStorage.getItem(VOICE_KEY)) {
      const voice = document.getElementById('powerHintVoice');
      const playOnce = () => {
        try { voice?.play().then(() => localStorage.setItem(VOICE_KEY, '1')).catch(()=>{}); } catch {}
      };
      try { voice?.play().then(()=>localStorage.setItem(VOICE_KEY,'1')).catch(() => {
        document.addEventListener('click', playOnce, { once: true });
        document.addEventListener('touchstart', playOnce, { once: true });
      }); } catch {}
    }
  })();
  const clockEl = document.getElementById('phoneClock');
  const battPct = document.getElementById('phoneBatteryPct');
  const battFill = document.getElementById('phoneBatteryFill');
  const battWrap = document.getElementById('phoneBattery');
  const notif = document.getElementById('phoneNotif');
  const notifIc = document.getElementById('phoneNotifIc');
  const notifBadge = document.getElementById('phoneNotifBadge');

  const tick = () => {
    const d = new Date();
    if (clockEl) clockEl.textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const updateBattery = async () => {
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        const pct = Math.round(b.level * 100);
        if (battPct) battPct.textContent = `${pct}%`;
        if (battFill) battFill.style.width = `${pct}%`;
        if (battWrap) battWrap.classList.toggle('low', pct <= 20);
        return;
      }
    } catch {}
    // Fallback: 100%
    if (battPct) battPct.textContent = '100%';
    if (battFill) battFill.style.width = '100%';
  };
  const updateNotif = () => {
    // 実データから算出：グループチャット未読 + レキット未読
    let n = 0;
    try { if (typeof computeUnreadCount === 'function') n += computeUnreadCount(); } catch {}
    try { if (typeof getRekittoUnread === 'function') n += getRekittoUnread(); } catch {}
    if (notif && notifBadge && notifIc) {
      if (n > 0) {
        notif.style.display = 'inline-flex';
        notif.hidden = false;
        // 丸囲み数字（①〜⑳、超えたら●N）
        const circled = (v) => {
          if (v >= 1 && v <= 20) return String.fromCharCode(0x2460 + v - 1);
          if (v >= 21 && v <= 35) return String.fromCharCode(0x3251 + v - 21);
          return '●' + v;
        };
        notifBadge.textContent = circled(n);
        notifIc.textContent = '💬';
      } else {
        notif.style.display = 'none';
        notif.hidden = true;
      }
    }
  };

  const close = () => {
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    // 戻る/進む浮遊ナビを再表示、レキットはホーム画面のときだけ
    document.getElementById('floatNav')?.classList.remove('hide-for-phone');
    {
      const el = document.getElementById('powerHintAnim');
      const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
      if (el) el.hidden = (activeView !== 'people');
    }
    // スマホを閉じるときに内部状態をリセット（全てのツールアプリを閉じる）
    ['phonePlazaApp','phoneMusicApp','phoneMeshiruApp','phoneOtayoriApp','phoneHistoryApp'].forEach(id => {
      const el2 = document.getElementById(id);
      if (el2) el2.hidden = true;
    });
    document.querySelectorAll('.plaza-tab-panel').forEach(p => {
      p.hidden = (p.dataset.plazaPanel !== 'friends');
    });
    document.querySelectorAll('.plaza-app-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.plazaTab === 'friends');
    });
    try { stopMusicApp?.(); } catch {}
    try { stopPhoneAmbience?.(); } catch {}
    // 現在のビューのBGMだけ再生（他は全停止）
    try {
      const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
      const BGM_MAP = { people: 'homeBgm', tags: 'searchBgm', history: 'historyBgm', routines: 'routineBgm', articles: 'blogBgm', favorites: 'favoritesBgm' };
      if (typeof playViewBgmExclusive === 'function') playViewBgmExclusive(BGM_MAP[activeView] || null);
    } catch {}
  };
  const open = () => {
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    // 戻る/進む浮遊ナビとレキットを隠す
    document.getElementById('floatNav')?.classList.add('hide-for-phone');
    const hintEl = document.getElementById('powerHintAnim');
    if (hintEl) hintEl.hidden = true;
    // スマホを開いたら全てのツールアプリを閉じてホーム画面（アイコン一覧）から始める
    ['phonePlazaApp','phoneMusicApp','phoneMeshiruApp','phoneOtayoriApp','phoneHistoryApp'].forEach(id => {
      const el2 = document.getElementById(id);
      if (el2) el2.hidden = true;
    });
    tick();
    updateBattery();
    updateNotif();
    // スマホを開いたら画面のBGMは停止（ノイズだけ聞こえるように）
    try {
      ['homeBgm','searchBgm','historyBgm','routineBgm','blogBgm','favoritesBgm'].forEach(id => {
        const a = document.getElementById(id);
        if (a) a.pause();
      });
    } catch {}
    try { playPhoneBootSound?.(); } catch {}
    // 起動音の後、アンビエントノイズをループ再生
    try { setTimeout(() => startPhoneAmbience?.(), 450); } catch {}
  };
  // 推し偉人スロット描画（ラベルは『推し偉人』固定）
  const renderOshiSlot = () => {
    const slot = document.getElementById('phoneOshiSlot');
    if (!slot) return;
    const oshiId = (typeof getOshi === 'function') ? getOshi() : '';
    if (!oshiId) { slot.hidden = true; slot.innerHTML = ''; return; }
    const p = DATA.people?.find(x => x.id === oshiId);
    if (!p) { slot.hidden = true; slot.innerHTML = ''; return; }
    const bg = p.imageUrl ? `background-image:url('${p.imageUrl}')` : '';
    slot.hidden = false;
    slot.dataset.phonePerson = p.id;
    slot.innerHTML = `
      <span class="phone-oshi-avatar" style="${bg}">${p.imageUrl ? '' : (p.name.charAt(0) || '★')}</span>
      <span>推し偉人</span>
    `;
  };

  // 好きな言葉バナー（3つまで、毎回ランダム表示）
  const renderPhoneQuoteBanner = () => {
    const banner = document.getElementById('phoneQuoteBanner');
    const txtEl = document.getElementById('phoneQuoteText');
    const srcEl = document.getElementById('phoneQuoteSrc');
    if (!banner) return;
    const pins = loadPhonePinnedQuotes();
    if (!pins.length) { banner.hidden = true; return; }
    const pick = pins[Math.floor(Math.random() * pins.length)];
    banner.hidden = false;
    txtEl.textContent = `「${pick.text}」`;
    srcEl.textContent = pick.personName ? `— ${pick.personName}` : '';
  };

  // アプリ内通知バッジ（各アイコン右上）
  const circled = (v) => {
    if (v >= 1 && v <= 20) return String.fromCharCode(0x2460 + v - 1);
    if (v >= 21 && v <= 35) return String.fromCharCode(0x3251 + v - 21);
    return '●' + v;
  };
  const setBadge = (id, n) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (n > 0) { el.textContent = circled(n); el.hidden = false; }
    else { el.hidden = true; }
  };
  const renderIconBadges = () => {
    // 偉人の広場 = グループチャット未読 + レキット未読（実データから直接算出）
    let plaza = 0;
    try { if (typeof computeUnreadCount === 'function') plaza += computeUnreadCount(); } catch {}
    try { plaza += getRekittoUnread(); } catch {}
    setBadge('phoneBadgePlaza', plaza);
    // わたしの本 = 新しいフォロワー（会員＋偉人からの新規フォロー）
    let favs = 0;
    try {
      const known = JSON.parse(localStorage.getItem('ijin_known_user_followers') || '[]');
      // 未読会員フォロワー通知は既読管理してるのでここでは0、代わりに新しい偉人フォロワーを出す
      const ff = (typeof loadForcedFollows === 'function') ? loadForcedFollows() : new Set();
      favs = ff.size; // フォロー中の偉人バッジ
    } catch {}
    // より穏やかに：実際に「新しい」通知だけに絞るため簡易管理
    setBadge('phoneBadgeFavorites', 0); // 一旦0（必要なら後で拡張）
  };

  btn.addEventListener('click', () => {
    // 電源ボタンは常にホームグリッドから開く（前回の画面を引きずらない）
    ['phonePlazaApp','phoneMusicApp','phoneMeshiruApp','phoneOtayoriApp','phoneHistoryApp'].forEach(id => {
      const el2 = document.getElementById(id);
      if (el2) el2.hidden = true;
    });
    // チャットパネルが開いていた場合は友だちタブに戻す
    document.querySelectorAll('.plaza-tab-panel').forEach(p => {
      p.hidden = (p.dataset.plazaPanel !== 'friends');
    });
    document.querySelectorAll('.plaza-app-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.plazaTab === 'friends');
    });
    open(); renderOshiSlot(); renderPhoneQuoteBanner(); renderIconBadges(); applyPhoneIconOrder();
  });
  // 外部からも呼べるように公開（チャット既読→バッジ更新などのため）
  window.renderIconBadges = renderIconBadges;
  window.updatePhoneNotif = updateNotif;

  // =========== スマホアイコンの並び替え（長押し→ドラッグ） ===========
  const PHONE_ICON_ORDER_KEY = 'ijin_phone_icon_order';
  function loadPhoneIconOrder() {
    try { return JSON.parse(localStorage.getItem(PHONE_ICON_ORDER_KEY) || 'null'); } catch { return null; }
  }
  function savePhoneIconOrder(keys) {
    try { localStorage.setItem(PHONE_ICON_ORDER_KEY, JSON.stringify(keys)); } catch {}
  }
  function iconKey(btn) {
    // アクション or ビュー名でユニークに識別
    return btn.dataset.phoneAction || btn.dataset.phoneView || btn.id || '';
  }
  function applyPhoneIconOrder() {
    const grid = document.querySelector('.phone-grid');
    if (!grid) return;
    const order = loadPhoneIconOrder();
    if (!order || !Array.isArray(order)) return;
    const btns = Array.from(grid.querySelectorAll('.phone-icon'));
    const byKey = {};
    btns.forEach(b => { byKey[iconKey(b)] = b; });
    // 保存順で再挿入、保存に無いものは末尾に追加
    order.forEach(k => { if (byKey[k]) grid.appendChild(byKey[k]); });
    btns.forEach(b => { const k = iconKey(b); if (!order.includes(k)) grid.appendChild(b); });
  }
  function initPhoneIconDrag() {
    const grid = document.querySelector('.phone-grid');
    if (!grid) return;
    let longPressTimer = null;
    let dragging = null;
    let startX = 0, startY = 0;
    let ghost = null;
    const LONG_PRESS_MS = 380;
    const endReorder = () => {
      grid.classList.remove('reorder-mode');
      grid.querySelectorAll('.phone-icon').forEach(b => {
        b.classList.remove('dragging', 'drag-target');
        b.style.transform = '';
      });
      if (ghost) { ghost.remove(); ghost = null; }
      dragging = null;
    };
    const onPointerDown = (e) => {
      const btn = e.target.closest('.phone-icon');
      if (!btn || !grid.contains(btn)) return;
      startX = e.clientX; startY = e.clientY;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        // 長押しで並び替えモードに入る
        grid.classList.add('reorder-mode');
        dragging = btn;
        btn.classList.add('dragging');
        // ゴースト（追従する分身）
        const rect = btn.getBoundingClientRect();
        ghost = btn.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.9';
        ghost.style.zIndex = '10001';
        ghost.style.transition = 'none';
        ghost.classList.add('dragging');
        document.body.appendChild(ghost);
        // 軽くバイブレーション
        try { navigator.vibrate?.(12); } catch {}
      }, LONG_PRESS_MS);
    };
    const onPointerMove = (e) => {
      // 長押し成立前にある程度動いたらキャンセル
      if (!dragging) {
        if (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6) {
          clearTimeout(longPressTimer);
        }
        return;
      }
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const startRect = dragging.getBoundingClientRect();
      if (ghost) {
        ghost.style.left = (startRect.left + dx) + 'px';
        ghost.style.top = (startRect.top + dy) + 'px';
      }
      // ポインタ位置の下にあるアイコンを探し、入れ替え先に
      const under = document.elementFromPoint(e.clientX, e.clientY);
      grid.querySelectorAll('.phone-icon').forEach(b => b.classList.remove('drag-target'));
      const target = under?.closest('.phone-icon');
      if (target && target !== dragging && grid.contains(target)) {
        target.classList.add('drag-target');
      }
    };
    const onPointerUp = (e) => {
      clearTimeout(longPressTimer);
      if (!dragging) return;
      // 入れ替え先があれば挿入
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const target = under?.closest('.phone-icon');
      if (target && target !== dragging && grid.contains(target)) {
        const rect = target.getBoundingClientRect();
        const before = e.clientX < rect.left + rect.width / 2;
        grid.insertBefore(dragging, before ? target : target.nextSibling);
        const newOrder = Array.from(grid.querySelectorAll('.phone-icon'))
          .map(iconKey).filter(Boolean);
        savePhoneIconOrder(newOrder);
      }
      endReorder();
    };
    grid.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', () => { clearTimeout(longPressTimer); endReorder(); });
    // iOS/Android/PCの長押し画像保存メニュー・右クリックメニュー・ドラッグ開始を抑止
    grid.addEventListener('contextmenu', (e) => { e.preventDefault(); });
    grid.addEventListener('dragstart', (e) => { e.preventDefault(); });
    // 画像にも念のため draggable=false
    grid.querySelectorAll('.phone-icon img').forEach(img => { img.draggable = false; });
    // クリックと誤爆しないよう：ドラッグ中のアイコンのclickは抑制
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.phone-icon');
      if (btn && btn.classList.contains('dragging')) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
  }
  initPhoneIconDrag();
  // 初期描画時にも適用（menu未openでもDOMに順序を書いておく）
  applyPhoneIconOrder();
  menu.querySelectorAll('[data-phone-close]').forEach(el => el.addEventListener('click', close));
  // ホーム画面ボタン：スマホを閉じずにアイコン一覧へ戻る（ツールアプリを閉じるだけ）
  menu.querySelectorAll('[data-phone-home]').forEach(el => el.addEventListener('click', () => {
    ['phonePlazaApp','phoneMusicApp','phoneMeshiruApp','phoneOtayoriApp','phoneHistoryApp'].forEach(id => {
      const a = document.getElementById(id);
      if (a) a.hidden = true;
    });
    document.querySelectorAll('.plaza-tab-panel').forEach(p => {
      p.hidden = (p.dataset.plazaPanel !== 'friends');
    });
    document.querySelectorAll('.plaza-app-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.plazaTab === 'friends');
    });
    try { stopMusicApp?.(); } catch {}
  }));
  menu.querySelectorAll('[data-phone-view]').forEach(el => {
    el.addEventListener('click', () => {
      const v = el.dataset.phoneView;
      // 偉人検索・年表へはポータル遷移で世界に入り込む
      if (v === 'tags' || v === 'history') {
        const bgmId = v === 'tags' ? 'searchBgm' : 'historyBgm';
        try { if (typeof playViewBgmExclusive === 'function') playViewBgmExclusive(bgmId); } catch {}
        playPortalTransition(menu, () => showView(v));
        return;
      }
      close();
      setTimeout(() => showView(v), 260);
    });
  });
  menu.querySelectorAll('[data-phone-action]').forEach(el => {
    el.addEventListener('click', () => {
      const action = el.dataset.phoneAction;
      if (action === 'plaza') {
        // スマホ内で偉人の広場アプリを開く
        openPhonePlazaApp();
        return;
      }
      if (action === 'music') {
        openPhoneToolApp(action);
        return;
      }
      if (action === 'otayori') {
        openPhoneToolApp(action);
        return;
      }
      close();
      setTimeout(() => {
        if (action === 'settings') {
          // 右上の三本線と同じ画面（アカウントメニュー）を開く
          if (typeof window.openAccountMenu === 'function') window.openAccountMenu();
          else if (typeof openMemberSettings === 'function') openMemberSettings();
        } else if (action === 'oshi') {
          const pid = el.dataset.phonePerson;
          if (pid && typeof showPerson === 'function') showPerson(pid);
        } else if (action === 'me') {
          if (typeof openMyProfile === 'function') openMyProfile();
        }
      }, 260);
    });
  });
  // ============ ツールアプリ共通（電卓・メモ・タイマー） ============
  // ツールアプリの遷移履歴（◁ で前のアプリへ戻る用）
  const __toolStack = [];
  function currentOpenTool() {
    const map = { music: 'phoneMusicApp', meshiru: 'phoneMeshiruApp', otayori: 'phoneOtayoriApp' };
    for (const k of Object.keys(map)) {
      const el = document.getElementById(map[k]);
      if (el && !el.hidden) return k;
    }
    return null;
  }
  function openPhoneToolApp(tool) {
    const map = { music: 'phoneMusicApp', meshiru: 'phoneMeshiruApp', otayori: 'phoneOtayoriApp' };
    const el = document.getElementById(map[tool]);
    if (!el) return;
    // 現在開いているツールがあれば履歴に積む
    const prev = currentOpenTool();
    if (prev && prev !== tool) __toolStack.push(prev);
    ['phoneMusicApp','phoneMeshiruApp','phoneOtayoriApp','phonePlazaApp','phoneHistoryApp'].forEach(id => {
      const a = document.getElementById(id);
      if (a) a.hidden = true;
    });
    el.hidden = false;
    if (tool === 'music') initMusicApp();
    if (tool === 'meshiru') initMeshiruApp();
    if (tool === 'otayori') initOtayoriApp();
  }
  function closePhoneToolApp(tool) {
    const map = { music: 'phoneMusicApp', meshiru: 'phoneMeshiruApp', otayori: 'phoneOtayoriApp' };
    const el = document.getElementById(map[tool]);
    if (el) el.hidden = true;
    if (tool === 'music') stopMusicApp();
    // 履歴に前のツールがあれば復帰、無ければホームグリッド
    const prev = __toolStack.pop();
    if (prev) {
      openPhoneToolApp(prev);
    }
  }
  // 外部から現在のツールアプリを「戻る」方式で閉じる
  window.phoneToolBack = () => {
    const now = currentOpenTool();
    if (now) { closePhoneToolApp(now); return true; }
    return false;
  };
  // 戻るボタン（各アプリ内の ‹）
  menu.querySelectorAll('[data-tool-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePhoneToolApp(btn.dataset.toolClose);
    });
  });
  // ── ミュージック（サイトで使われているBGM一覧） ──
  const MUSIC_TRACKS = [
    { id: 'homeBgm',      title: 'ホーム',         desc: '本棚の扉を開く音楽' },
    { id: 'searchBgm',    title: '偉人検索',       desc: '探求の地図を辿る音楽' },
    { id: 'historyBgm',   title: '年表',           desc: '時代を旅する音楽' },
    { id: 'routineBgm',   title: 'ルーティン',     desc: '偉人の1日の音楽' },
    { id: 'blogBgm',      title: 'ブログ',         desc: '読みものの音楽' },
    { id: 'favoritesBgm', title: 'わたしの本',     desc: '自分を編む音楽' },
    { id: 'squareBgm',    title: 'IJiN',           desc: '交わりの音楽' },
  ];
  let __musicCurrent = null;
  let __musicShuffle = false;
  let __musicLoop = false;
  function pickNextTrack(currentId) {
    if (__musicShuffle) {
      const ids = MUSIC_TRACKS.map(t => t.id).filter(id => id !== currentId);
      return ids[Math.floor(Math.random() * ids.length)];
    }
    const idx = MUSIC_TRACKS.findIndex(t => t.id === currentId);
    return MUSIC_TRACKS[(idx + 1) % MUSIC_TRACKS.length].id;
  }
  function initMusicApp() {
    const list = document.getElementById('musicTracklist');
    if (!list) return;
    list.innerHTML = MUSIC_TRACKS.map(t => {
      const el = document.getElementById(t.id);
      const available = el && el.src;
      return `
        <li class="music-track" data-track-id="${t.id}" ${!available ? 'style="opacity:0.4;pointer-events:none"' : ''}>
          <div class="music-track-info">
            <div class="music-track-title">${t.title}</div>
            <div class="music-track-desc">${t.desc}</div>
          </div>
          <div class="music-track-icon">▶</div>
        </li>
      `;
    }).join('');
    list.querySelectorAll('[data-track-id]').forEach(li => {
      li.addEventListener('click', () => musicPlayTrack(li.dataset.trackId));
    });
  }
  function musicPlayTrack(id) {
    // 他のBGMを止める
    ['homeBgm','searchBgm','historyBgm','routineBgm','blogBgm','favoritesBgm','squareBgm'].forEach(x => {
      const a = document.getElementById(x);
      if (a && x !== id) { a.pause(); a.currentTime = 0; }
    });
    const audio = document.getElementById(id);
    if (!audio) return;
    const vol = parseInt(document.getElementById('musicVolume')?.value || '35', 10);
    audio.volume = vol / 100;
    audio.currentTime = 0;
    audio.loop = false; // プレイリストで次へ進めるため、個別loopはOFF
    audio.play().catch(() => {});
    // 曲が終わったら次へ（ループONなら同じ曲、OFFでも順次・シャッフル）
    audio.onended = () => {
      if (__musicLoop) {
        // 同じ曲をもう一度
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        const next = pickNextTrack(id);
        musicPlayTrack(next);
      }
    };
    __musicCurrent = id;
    const track = MUSIC_TRACKS.find(t => t.id === id);
    document.getElementById('musicNowTitle').textContent = track?.title || '';
    document.getElementById('musicNowDesc').textContent = track?.desc || '';
    document.getElementById('musicPlayBtn').disabled = false;
    document.getElementById('musicStopBtn').disabled = false;
    document.getElementById('musicPlayBtn').textContent = '⏸';
    // .playing クラスを music-app に付与（ビジュアライザー＆ディスク回転高速化）
    document.querySelector('.music-app')?.classList.add('playing');
    // リスト上のアクティブ状態
    menu.querySelectorAll('[data-track-id]').forEach(li => {
      const active = li.dataset.trackId === id;
      li.classList.toggle('playing', active);
      const icon = li.querySelector('.music-track-icon');
      if (icon) icon.textContent = active ? '♪' : '▶';
    });
  }
  function stopMusicApp() {
    if (__musicCurrent) {
      const a = document.getElementById(__musicCurrent);
      if (a) { a.pause(); a.currentTime = 0; }
    }
    __musicCurrent = null;
  }

  // ============ 🍳 めしる（偉人のレシピ＋献立＋買い物リスト） ============
  const MESHIRU_SAVED_KEY = 'ijin_meshiru_saved';
  const MESHIRU_LIKES_KEY = 'ijin_meshiru_likes';
  const MESHIRU_PLAN_KEY = 'ijin_meshiru_plan';       // { 'YYYY-MM-DD:breakfast': recipeId, ... }
  const MESHIRU_CHECK_KEY = 'ijin_meshiru_check';    // { ingredientText: true }
  const MESHIRU_MY_KEY = 'ijin_meshiru_my';          // [{ id, name, url, tagline, ingredients[], steps[], note }]

  function loadMyRecipes() { try { return JSON.parse(localStorage.getItem(MESHIRU_MY_KEY) || '[]'); } catch { return []; } }
  function saveMyRecipes(arr) { try { localStorage.setItem(MESHIRU_MY_KEY, JSON.stringify(arr)); } catch {} }
  function detectRecipeSite(url) {
    if (!url) return '';
    if (/cookpad\.com/i.test(url)) return 'Cookpad';
    if (/kurashiru/i.test(url)) return 'クラシル';
    if (/delishkitchen/i.test(url)) return 'DELISH KITCHEN';
    if (/orangepage/i.test(url)) return 'オレンジページ';
    if (/macaro-ni\.jp/i.test(url)) return 'macaroni';
    if (/nhk.*minna.*kyounoryouri|kyounoryouri/i.test(url)) return 'みんなのきょうの料理';
    if (/instagram\.com/i.test(url)) return 'Instagram';
    if (/tiktok\.com/i.test(url)) return 'TikTok';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Web'; }
  }
  function loadMeshiruSet(k) { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch { return new Set(); } }
  function saveMeshiruSet(k, s) { try { localStorage.setItem(k, JSON.stringify([...s])); } catch {} }
  function loadMeshiruMap(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } }
  function saveMeshiruMap(k, m) { try { localStorage.setItem(k, JSON.stringify(m)); } catch {} }

  function getAllRecipes() {
    const out = [];
    (DATA.people || []).forEach(p => {
      if (Array.isArray(p.recipes) && p.recipes.length) {
        p.recipes.forEach(r => out.push({ ...r, personId: p.id, personName: p.name, personField: p.field, personImage: p.imageUrl }));
      }
    });
    // 自作レシピも含める
    loadMyRecipes().forEach(r => out.push({ ...r, personId: '', personName: r.authorName || 'あなた', personField: 'マイレシピ', personImage: '', isMine: true }));
    return out;
  }

  function renderRecipeCard(r, saved, likes) {
    const liked = likes.has(r.id);
    const isSaved = saved.has(r.id);
    const av = r.personImage
      ? `<div class="meshiru-av" style="background-image:url('${r.personImage}')"></div>`
      : `<div class="meshiru-av no-img">${(r.personName || '?').charAt(0)}</div>`;
    return `
      <article class="meshiru-card" data-recipe-id="${r.id}">
        <header class="meshiru-card-head">
          <button class="meshiru-av-btn" data-goto-person="${r.personId}">${av}</button>
          <div class="meshiru-head-info">
            <button class="meshiru-person-name" data-goto-person="${r.personId}">${escapeHtml(r.personName)}</button>
            <div class="meshiru-person-field">${escapeHtml(r.personField || '')}</div>
          </div>
        </header>
        <div class="meshiru-card-body">
          <h3 class="meshiru-recipe-title">${escapeHtml(r.name)}</h3>
          ${r.tagline ? `<p class="meshiru-tagline-in">${escapeHtml(r.tagline)}</p>` : ''}
          ${r.imageHint ? `<div class="meshiru-image-hint">🖼 ${escapeHtml(r.imageHint)}</div>` : ''}
          <details class="meshiru-details">
            <summary>📋 材料（${(r.ingredients || []).length}点）</summary>
            <ul class="meshiru-ingredients">
              ${(r.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}
            </ul>
          </details>
          <details class="meshiru-details">
            <summary>👨‍🍳 作り方（${(r.steps || []).length}ステップ）</summary>
            <ol class="meshiru-steps">
              ${(r.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ol>
          </details>
          ${r.note ? `<div class="meshiru-note">💡 ${escapeHtml(r.note)}</div>` : ''}
        </div>
        <footer class="meshiru-card-foot">
          <button class="meshiru-btn meshiru-like ${liked ? 'active' : ''}" data-meshiru-like="${r.id}">${liked ? '❤' : '♡'} いいね</button>
          ${r.isMine
            ? ''
            : `<button class="meshiru-btn meshiru-addmine ${isSaved ? 'active' : ''}" data-meshiru-addmine="${r.id}">${isSaved ? '✓ マイレシピ済' : '📝 マイレシピに入れる'}</button>`}
        </footer>
      </article>
    `;
  }

  function initMeshiruApp() {
    ensureLazyCss('meshiru');
    const feed = document.getElementById('meshiruFeed');
    const savedMount = document.getElementById('meshiruSaved');
    if (!feed) return;
    // 会員限定：未ログイン or 匿名ユーザーにはゲートを表示
    const isMember = typeof currentUser !== 'undefined' && currentUser && !currentUser.isAnonymous;
    if (!isMember) {
      // 他のタブパネルを空にして、feedにゲートを表示
      ['meshiruMy','meshiruPlan','meshiruShopping','meshiruSaved'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.innerHTML = '';
      });
      feed.hidden = false;
      feed.innerHTML = `
        <div class="meshiru-gate">
          <div class="meshiru-gate-ic">🍳</div>
          <div class="meshiru-gate-title">めしるは会員限定機能です</div>
          <div class="meshiru-gate-body">
            偉人料理人のレシピ、週間献立、自動買い物リスト、マイレシピ保存——<br>
            全機能をお使いいただくには、無料会員登録が必要です。
          </div>
          <button class="meshiru-gate-btn" id="meshiruGateSignup">✨ 無料で会員登録する（0円）</button>
          <div class="meshiru-gate-note">※ 登録後は全端末で献立・買い物リストが同期されます</div>
        </div>
      `;
      feed.querySelector('#meshiruGateSignup')?.addEventListener('click', () => {
        if (typeof window.openAccountMenu === 'function') window.openAccountMenu();
        else if (typeof openMemberSettings === 'function') openMemberSettings();
      });
      return;
    }
    const recipes = getAllRecipes();
    const saved = loadMeshiruSet(MESHIRU_SAVED_KEY);
    const likes = loadMeshiruSet(MESHIRU_LIKES_KEY);

    function renderFeed() {
      if (recipes.length === 0) {
        feed.innerHTML = `<div class="meshiru-empty">まだレシピがありません。<br>料理人の偉人が増えると、ここに並びます。</div>`;
        return;
      }
      feed.innerHTML = `
        <div class="meshiru-intro">
          <div class="meshiru-intro-title">🍳 偉人たちの台所</div>
          <div class="meshiru-intro-sub">歴史を動かした料理人が実際に使ったレシピ。<br>気に入ったら「🔖 保存」で、あなたの台所にも。</div>
        </div>
        ${recipes.map(r => renderRecipeCard(r, saved, likes)).join('')}
      `;
      bindHandlers(feed);
    }
    function renderSaved() {
      const mine = recipes.filter(r => saved.has(r.id));
      if (mine.length === 0) {
        savedMount.innerHTML = `<div class="meshiru-empty">🔖 まだ保存したレシピはありません。<br>気になる一皿を保存しましょう。</div>`;
        return;
      }
      savedMount.innerHTML = `
        <div class="meshiru-intro">
          <div class="meshiru-intro-title">🔖 保存したレシピ</div>
          <div class="meshiru-intro-sub">あなたの台所に並んだ、偉人たちの一皿。</div>
        </div>
        ${mine.map(r => renderRecipeCard(r, saved, likes)).join('')}
      `;
      bindHandlers(savedMount);
    }
    function bindHandlers(scope) {
      scope.querySelectorAll('[data-meshiru-like]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.meshiruLike;
          if (likes.has(id)) likes.delete(id); else likes.add(id);
          saveMeshiruSet(MESHIRU_LIKES_KEY, likes);
          btn.classList.toggle('active');
          btn.innerHTML = (likes.has(id) ? '❤' : '♡') + ' いいね';
        });
      });
      // 偉人のレシピをマイレシピに取り込む
      scope.querySelectorAll('[data-meshiru-addmine]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.meshiruAddmine;
          const src = recipes.find(x => x.id === id);
          if (!src) return;
          const list = loadMyRecipes();
          const already = list.find(x => x.sourceRecipeId === id);
          if (already) {
            // トグル：既に入ってる場合は取り除く
            if (!confirm('このレシピはすでにマイレシピに入っています。削除しますか？')) return;
            saveMyRecipes(list.filter(x => x.sourceRecipeId !== id));
            saved.delete(id);
            saveMeshiruSet(MESHIRU_SAVED_KEY, saved);
            btn.classList.remove('active');
            btn.innerHTML = '📝 マイレシピに入れる';
          } else {
            // マイレシピとしてコピー（編集可能に）
            const copy = {
              id: 'my_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
              name: src.name,
              url: '',
              sourceSite: `${src.personName}のレシピ`,
              sourceRecipeId: id,
              tagline: src.tagline || '',
              ingredients: [...(src.ingredients || [])],
              steps: [...(src.steps || [])],
              note: src.note || '',
              authorName: src.personName,
              createdAt: new Date().toISOString(),
            };
            list.unshift(copy);
            saveMyRecipes(list);
            saved.add(id);
            saveMeshiruSet(MESHIRU_SAVED_KEY, saved);
            btn.classList.add('active');
            btn.innerHTML = '✓ マイレシピ済';
            // グローバルrecipesに自作として追加して、献立ですぐ使えるように
            recipes.push({ ...copy, personId: '', personName: copy.authorName, personField: 'マイレシピ', personImage: '', isMine: true });
          }
        });
      });
      scope.querySelectorAll('[data-goto-person]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = btn.dataset.gotoPerson;
          closePhoneToolApp('meshiru');
          // スマホを閉じて偉人ページへ
          const menuEl = document.getElementById('phoneMenu');
          if (menuEl && menuEl.classList.contains('open')) {
            menuEl.classList.remove('open');
            menuEl.setAttribute('aria-hidden', 'true');
          }
          setTimeout(() => showPerson(pid), 260);
        });
      });
    }
    // ── マイレシピ（URL取り込み＋手入力） ──
    const myMount = document.getElementById('meshiruMy');
    function renderMy() {
      const mine = loadMyRecipes();
      myMount.innerHTML = `
        <div class="meshiru-intro">
          <div class="meshiru-intro-title">📝 マイレシピ</div>
          <div class="meshiru-intro-sub">Cookpad・クラシル・DELISH KITCHEN・Instagramなどで見つけたレシピのURLを貼り付けて、材料を入力するだけ。<br>買い物リストに自動で反映されます。</div>
        </div>
        <div class="meshiru-import-card">
          <button class="meshiru-import-btn" id="meshiruImportBtn">➕ URLからレシピを追加</button>
          <button class="meshiru-import-btn meshiru-manual-btn" id="meshiruManualBtn">✍ 手入力でレシピを追加</button>
        </div>
        ${mine.length === 0 ? `
          <div class="meshiru-empty">まだマイレシピはありません。<br>URL貼り付け or 手入力で追加しましょう。</div>
        ` : `
          <div class="meshiru-my-list">
            ${mine.map(r => `
              <article class="meshiru-card meshiru-my-card">
                <header class="meshiru-card-head">
                  <div class="meshiru-av no-img">📝</div>
                  <div class="meshiru-head-info">
                    <div class="meshiru-person-field">${escapeHtml(r.sourceSite || 'マイレシピ')}</div>
                    ${r.url ? `<a class="meshiru-source-link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">🔗 元レシピを見る →</a>` : ''}
                  </div>
                  <div class="meshiru-my-actions">
                    <button class="meshiru-my-edit" data-my-edit="${r.id}" aria-label="編集">✎</button>
                    <button class="meshiru-my-del" data-my-del="${r.id}" aria-label="削除">🗑</button>
                  </div>
                </header>
                <div class="meshiru-card-body">
                  <h3 class="meshiru-recipe-title">${escapeHtml(r.name || '（無題のレシピ）')}</h3>
                  ${r.tagline ? `<p class="meshiru-tagline-in">${escapeHtml(r.tagline)}</p>` : ''}
                  <details class="meshiru-details">
                    <summary>📋 材料（${(r.ingredients || []).length}点）</summary>
                    <ul class="meshiru-ingredients">${(r.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
                  </details>
                  ${(r.steps && r.steps.length) ? `
                    <details class="meshiru-details">
                      <summary>👨‍🍳 作り方（${r.steps.length}ステップ）</summary>
                      <ol class="meshiru-steps">${r.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
                    </details>
                  ` : ''}
                  ${r.note ? `<div class="meshiru-note">💡 ${escapeHtml(r.note)}</div>` : ''}
                </div>
              </article>
            `).join('')}
          </div>
        `}
      `;
      myMount.querySelector('#meshiruImportBtn')?.addEventListener('click', () => openMyEditor({ mode: 'url' }));
      myMount.querySelector('#meshiruManualBtn')?.addEventListener('click', () => openMyEditor({ mode: 'manual' }));
      myMount.querySelectorAll('[data-my-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.myEdit;
          const r = loadMyRecipes().find(x => x.id === id);
          if (r) openMyEditor({ mode: 'manual', existing: r });
        });
      });
      myMount.querySelectorAll('[data-my-del]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm('このレシピを削除しますか？')) return;
          const id = btn.dataset.myDel;
          saveMyRecipes(loadMyRecipes().filter(x => x.id !== id));
          renderMy();
          // レシピリスト再生成
          recipes.length = 0;
          getAllRecipes().forEach(r => recipes.push(r));
        });
      });
    }
    function openMyEditor({ mode, existing }) {
      const modal = document.createElement('div');
      modal.id = 'meshiruEditorModal';
      modal.className = 'meshiru-pick-modal meshiru-editor-modal';
      const isEdit = !!existing;
      const r = existing || { id: 'my_' + Date.now(), name: '', url: '', tagline: '', ingredients: [], steps: [], note: '' };
      modal.innerHTML = `
        <div class="meshiru-pick-backdrop"></div>
        <div class="meshiru-pick-panel meshiru-editor-panel">
          <div class="meshiru-pick-head">
            <div class="meshiru-pick-title">${isEdit ? 'レシピを編集' : (mode === 'url' ? 'URLからレシピ追加' : '手入力でレシピ追加')}</div>
            <button class="meshiru-pick-close">×</button>
          </div>
          <div class="meshiru-editor-body">
            ${mode === 'url' && !isEdit ? `
              <div class="meshiru-field">
                <label>🔗 レシピのURL</label>
                <input type="url" id="mrUrl" placeholder="https://cookpad.com/recipe/... など" value="${escapeHtml(r.url || '')}">
                <div class="meshiru-field-hint">Cookpad / クラシル / DELISH KITCHEN / Instagram / TikTok / YouTube など、どこのURLでもOK</div>
                <button class="meshiru-field-open" id="mrOpenUrl" type="button">↗ URLを新しいタブで開く</button>
              </div>
            ` : ''}
            <div class="meshiru-field">
              <label>🍽 レシピ名</label>
              <input type="text" id="mrName" placeholder="例：母の肉じゃが" value="${escapeHtml(r.name || '')}">
            </div>
            ${mode === 'manual' ? `
              <div class="meshiru-field">
                <label>📝 ひとこと（任意）</label>
                <input type="text" id="mrTagline" placeholder="例：寒い夜に、染みる味" value="${escapeHtml(r.tagline || '')}">
              </div>
            ` : `<input type="hidden" id="mrTagline" value="${escapeHtml(r.tagline || '')}">`}
            <div class="meshiru-field">
              <label>📋 材料（1行に1つ、買い物リストに自動反映）</label>
              <textarea id="mrIngredients" rows="6" placeholder="じゃがいも 3個\n玉ねぎ 1個\n牛肉 200g\n醤油 大さじ3\nみりん 大さじ2">${escapeHtml((r.ingredients || []).join('\n'))}</textarea>
            </div>
            ${mode === 'manual' ? `
              <div class="meshiru-field">
                <label>👨‍🍳 作り方（任意・1行1ステップ）</label>
                <textarea id="mrSteps" rows="4" placeholder="じゃがいもを切る\n油で炒める\n調味料と水を加えて煮る">${escapeHtml((r.steps || []).join('\n'))}</textarea>
              </div>
              <div class="meshiru-field">
                <label>💡 メモ（任意）</label>
                <input type="text" id="mrNote" placeholder="例：圧力鍋で15分" value="${escapeHtml(r.note || '')}">
              </div>
            ` : `<input type="hidden" id="mrSteps" value=""><input type="hidden" id="mrNote" value="${escapeHtml(r.note || '')}">`}
            ${mode === 'url' && !isEdit ? `
              <div class="meshiru-field-info">📝 URL先で材料をコピーして、上の『材料』欄に貼り付けてください。</div>
            ` : ''}
          </div>
          <div class="meshiru-editor-foot">
            <button class="meshiru-editor-cancel">キャンセル</button>
            <button class="meshiru-editor-save">${isEdit ? '保存' : '追加'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector('.meshiru-pick-backdrop').addEventListener('click', close);
      modal.querySelector('.meshiru-pick-close').addEventListener('click', close);
      modal.querySelector('.meshiru-editor-cancel').addEventListener('click', close);
      modal.querySelector('#mrOpenUrl')?.addEventListener('click', () => {
        const url = modal.querySelector('#mrUrl').value.trim();
        if (url) window.open(url, '_blank', 'noopener');
      });
      modal.querySelector('.meshiru-editor-save').addEventListener('click', () => {
        const url = modal.querySelector('#mrUrl')?.value.trim() || r.url || '';
        const name = modal.querySelector('#mrName').value.trim();
        const tagline = modal.querySelector('#mrTagline').value.trim();
        const ingredientsRaw = modal.querySelector('#mrIngredients').value;
        const stepsRaw = modal.querySelector('#mrSteps').value;
        const note = modal.querySelector('#mrNote').value.trim();
        if (!name && !url) { alert('レシピ名かURLを入力してください。'); return; }
        const ingredients = ingredientsRaw.split('\n').map(s => s.trim()).filter(Boolean);
        const steps = stepsRaw.split('\n').map(s => s.trim()).filter(Boolean);
        const rec = {
          id: r.id,
          name: name || (url ? `（${detectRecipeSite(url)}から）` : '無題のレシピ'),
          url,
          sourceSite: url ? detectRecipeSite(url) : '',
          tagline,
          ingredients,
          steps,
          note,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const list = loadMyRecipes();
        const idx = list.findIndex(x => x.id === rec.id);
        if (idx >= 0) list[idx] = rec; else list.unshift(rec);
        saveMyRecipes(list);
        // グローバルrecipesにも反映（献立選択で即使えるように）
        recipes.length = 0;
        getAllRecipes().forEach(x => recipes.push(x));
        close();
        renderMy();
      });
    }

    // ── 献立プランナー ──
    const planMount = document.getElementById('meshiruPlan');
    function currentWeekDates() {
      const today = new Date();
      const day = today.getDay(); // 0=Sun
      const monOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + monOffset);
      const out = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        out.push(d);
      }
      return out;
    }
    function fmtDate(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function renderPlan() {
      const plan = loadMeshiruMap(MESHIRU_PLAN_KEY);
      const week = currentWeekDates();
      const mealLabels = [['breakfast','🌅 朝'],['lunch','☀️ 昼'],['dinner','🌙 夜']];
      planMount.innerHTML = `
        <div class="meshiru-intro">
          <div class="meshiru-intro-title">📅 今週の献立</div>
          <div class="meshiru-intro-sub">偉人のレシピをタップして、この一週間の食卓を組み立てましょう。</div>
        </div>
        <div class="meshiru-plan-grid">
          ${week.map(d => {
            const key = fmtDate(d);
            const isToday = key === fmtDate(new Date());
            const dayNames = ['日','月','火','水','木','金','土'];
            return `
              <div class="meshiru-plan-day ${isToday ? 'today' : ''}">
                <div class="meshiru-plan-day-head">
                  <span class="meshiru-plan-day-num">${d.getMonth()+1}/${d.getDate()}</span>
                  <span class="meshiru-plan-day-name">（${dayNames[d.getDay()]}）</span>
                </div>
                ${mealLabels.map(([mk, ml]) => {
                  const rid = plan[`${key}:${mk}`];
                  const r = rid ? recipes.find(x => x.id === rid) : null;
                  return `
                    <div class="meshiru-plan-slot" data-plan-date="${key}" data-plan-meal="${mk}">
                      <div class="meshiru-plan-meal-label">${ml}</div>
                      ${r ? `
                        <div class="meshiru-plan-recipe">
                          <div class="meshiru-plan-recipe-name">${escapeHtml(r.name)}</div>
                          <div class="meshiru-plan-recipe-person">— ${escapeHtml(r.personName)}</div>
                          <button class="meshiru-plan-clear" data-plan-clear="${key}:${mk}">×</button>
                        </div>
                      ` : `
                        <button class="meshiru-plan-add" data-plan-add="${key}:${mk}">＋ レシピを選ぶ</button>
                      `}
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
      `;
      planMount.querySelectorAll('[data-plan-clear]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const plan2 = loadMeshiruMap(MESHIRU_PLAN_KEY);
          delete plan2[btn.dataset.planClear];
          saveMeshiruMap(MESHIRU_PLAN_KEY, plan2);
          renderPlan();
        });
      });
      planMount.querySelectorAll('[data-plan-add]').forEach(btn => {
        btn.addEventListener('click', () => {
          openRecipePicker((rid) => {
            const plan2 = loadMeshiruMap(MESHIRU_PLAN_KEY);
            plan2[btn.dataset.planAdd] = rid;
            saveMeshiruMap(MESHIRU_PLAN_KEY, plan2);
            renderPlan();
          });
        });
      });
    }
    function openRecipePicker(onPick) {
      const existing = document.getElementById('meshiruPickModal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = 'meshiruPickModal';
      modal.className = 'meshiru-pick-modal';
      modal.innerHTML = `
        <div class="meshiru-pick-backdrop"></div>
        <div class="meshiru-pick-panel">
          <div class="meshiru-pick-head">
            <div class="meshiru-pick-title">レシピを選ぶ</div>
            <button class="meshiru-pick-close">×</button>
          </div>
          <div class="meshiru-pick-list">
            ${recipes.map(r => `
              <button class="meshiru-pick-item" data-pick-id="${r.id}">
                <div class="meshiru-pick-item-name">${escapeHtml(r.name)}</div>
                <div class="meshiru-pick-item-person">${escapeHtml(r.personName)}</div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector('.meshiru-pick-backdrop').addEventListener('click', close);
      modal.querySelector('.meshiru-pick-close').addEventListener('click', close);
      modal.querySelectorAll('[data-pick-id]').forEach(b => {
        b.addEventListener('click', () => {
          onPick(b.dataset.pickId);
          close();
        });
      });
    }
    // ── 買い物リスト（今週の献立から自動生成） ──
    const shoppingMount = document.getElementById('meshiruShopping');
    function renderShopping() {
      const plan = loadMeshiruMap(MESHIRU_PLAN_KEY);
      const checks = loadMeshiruMap(MESHIRU_CHECK_KEY);
      // 今週の献立に使う全材料をまとめる
      const ingredientMap = {}; // { 'text': [recipeName...] }
      Object.entries(plan).forEach(([slot, rid]) => {
        const r = recipes.find(x => x.id === rid);
        if (!r) return;
        (r.ingredients || []).forEach(ing => {
          if (!ingredientMap[ing]) ingredientMap[ing] = [];
          ingredientMap[ing].push(r.name);
        });
      });
      const entries = Object.entries(ingredientMap);
      if (entries.length === 0) {
        shoppingMount.innerHTML = `
          <div class="meshiru-intro">
            <div class="meshiru-intro-title">🛒 買い物リスト</div>
            <div class="meshiru-intro-sub">献立タブでレシピを設定すると、<br>必要な材料が自動でここに並びます。</div>
          </div>
          <div class="meshiru-empty">まだ献立が空です。</div>
        `;
        return;
      }
      const checkedCount = entries.filter(([ing]) => checks[ing]).length;
      shoppingMount.innerHTML = `
        <div class="meshiru-intro">
          <div class="meshiru-intro-title">🛒 買い物リスト</div>
          <div class="meshiru-intro-sub">今週の献立に必要な材料 ${entries.length}点（${checkedCount}点購入済）</div>
        </div>
        <ul class="meshiru-shop-list">
          ${entries.map(([ing, recipeNames]) => {
            const checked = !!checks[ing];
            return `
              <li class="meshiru-shop-item ${checked ? 'checked' : ''}" data-shop-ing="${escapeHtml(ing).replace(/"/g,'&quot;')}">
                <label class="meshiru-shop-label">
                  <input type="checkbox" ${checked ? 'checked' : ''} class="meshiru-shop-check">
                  <span class="meshiru-shop-text">${escapeHtml(ing)}</span>
                </label>
                <div class="meshiru-shop-meta">${recipeNames.map(n => escapeHtml(n)).join('・')}</div>
              </li>
            `;
          }).join('')}
        </ul>
        <button class="meshiru-shop-clear" id="meshiruShopReset">🗑 買い物済チェックを全リセット</button>
      `;
      shoppingMount.querySelectorAll('.meshiru-shop-item').forEach(li => {
        const cb = li.querySelector('.meshiru-shop-check');
        cb.addEventListener('change', () => {
          const checks2 = loadMeshiruMap(MESHIRU_CHECK_KEY);
          const ing = li.dataset.shopIng;
          if (cb.checked) checks2[ing] = true; else delete checks2[ing];
          saveMeshiruMap(MESHIRU_CHECK_KEY, checks2);
          li.classList.toggle('checked', cb.checked);
        });
      });
      shoppingMount.querySelector('#meshiruShopReset')?.addEventListener('click', () => {
        if (!confirm('買い物済のチェックを全てリセットしますか？')) return;
        saveMeshiruMap(MESHIRU_CHECK_KEY, {});
        renderShopping();
      });
    }

    // タブ切り替え
    document.querySelectorAll('[data-meshiru-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-meshiru-tab]').forEach(t => t.classList.toggle('active', t === tab));
        const which = tab.dataset.meshiruTab;
        [feed, myMount, planMount, shoppingMount, savedMount].forEach(m => { if (m) m.hidden = true; });
        if (which === 'feed') { feed.hidden = false; renderFeed(); }
        else if (which === 'my') { myMount.hidden = false; renderMy(); }
        else if (which === 'plan') { planMount.hidden = false; renderPlan(); }
        else if (which === 'shopping') { shoppingMount.hidden = false; renderShopping(); }
      });
    });
    renderFeed();
  }

  // ============ ✉ お便り（バグ・改善・機能要望） ============
  const OTAYORI_LOCAL_KEY = 'ijin_otayori_local';
  const CATEGORY_LABELS = {
    bug: '🐛 バグ・不具合',
    improvement: '✨ 改善提案',
    feature: '💡 欲しい機能',
    other: '💬 その他',
  };
  function loadOtayoriLocal() {
    try { return JSON.parse(localStorage.getItem(OTAYORI_LOCAL_KEY) || '[]'); } catch { return []; }
  }
  function saveOtayoriLocal(arr) {
    try { localStorage.setItem(OTAYORI_LOCAL_KEY, JSON.stringify(arr)); } catch {}
  }
  function statusLabel(s) {
    return {
      pending: '📬 受付中',
      reviewing: '🔍 検討中',
      doing: '🛠 対応中',
      done: '✅ 対応済み',
      declined: '🙏 見送り',
    }[s] || '📬 受付中';
  }
  // 管理者モード判定（オーナー専用。URL ?admin=ijin-owner で有効化）
  function isAdminMode() {
    try {
      const urlAdmin = new URLSearchParams(location.search).get('admin');
      if (urlAdmin === 'ijin-owner') {
        localStorage.setItem('ijin_admin_mode', '1');
        return true;
      }
      return localStorage.getItem('ijin_admin_mode') === '1';
    } catch { return false; }
  }
  function initOtayoriApp() {
    ensureLazyCss('otayori');
    const writeMount = document.getElementById('otayoriWrite');
    const mineMount = document.getElementById('otayoriMine');
    if (!writeMount) return;
    const admin = isAdminMode();

    function renderWrite() {
      const prevName = (typeof getUserName === 'function' ? getUserName() : localStorage.getItem('ijin_user_name')) || '';
      writeMount.innerHTML = `
        <div class="otayori-intro">
          <div class="otayori-intro-title">✉ 開発への一言</div>
          <div class="otayori-intro-sub">バグ報告・改善アイデア・欲しい機能——<br>なんでも教えてください。毎日読みに行きます。</div>
        </div>
        <form class="otayori-form" id="otayoriForm">
          <div class="otayori-field">
            <label>種類</label>
            <div class="otayori-cats">
              ${Object.entries(CATEGORY_LABELS).map(([k, v], i) => `
                <label class="otayori-cat-chip">
                  <input type="radio" name="category" value="${k}" ${i === 0 ? 'checked' : ''}>
                  <span>${v}</span>
                </label>
              `).join('')}
            </div>
          </div>
          <div class="otayori-field">
            <label>お名前（任意）</label>
            <input type="text" id="otayoriName" placeholder="${escapeHtml(prevName) || '匿名でもOK'}" value="${escapeHtml(prevName)}">
          </div>
          <div class="otayori-field">
            <label>内容 <span class="otayori-req">*</span></label>
            <textarea id="otayoriText" rows="6" placeholder="例：◯◯ボタンを押すと戻れません／◯◯機能があると嬉しい／など、具体的だと直しやすいです" required></textarea>
          </div>
          <div class="otayori-field">
            <label>連絡先（任意・返信が欲しい方）</label>
            <input type="text" id="otayoriContact" placeholder="メール／X ID／Note URL など">
          </div>
          <button type="submit" class="otayori-submit">📮 送る</button>
        </form>
      `;
      const form = writeMount.querySelector('#otayoriForm');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = form.querySelector('#otayoriText').value.trim();
        if (!text) { alert('内容を入力してください'); return; }
        const category = form.querySelector('input[name="category"]:checked').value;
        const name = form.querySelector('#otayoriName').value.trim();
        const contact = form.querySelector('#otayoriContact').value.trim();
        const submitBtn = form.querySelector('.otayori-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中…';
        let saved = null;
        try {
          if (typeof window.submitFeedback === 'function') {
            saved = await window.submitFeedback({ category, text, name, contact });
          }
        } catch {}
        // 失敗時もローカルに保管（後でオーナーが確認可）
        const local = loadOtayoriLocal();
        local.unshift({
          id: saved?.id || ('local_' + Date.now()),
          category, text, name, contact,
          status: 'pending',
          submittedAt: new Date().toISOString(),
          cloudSaved: !!saved,
        });
        saveOtayoriLocal(local);
        alert('お便り、届きました。\n大切に読ませていただきます。ありがとうございます。');
        submitBtn.disabled = false;
        submitBtn.textContent = '📮 送る';
        form.reset();
      });
    }

    async function renderMine() {
      mineMount.innerHTML = `<div class="otayori-loading">読み込み中…</div>`;
      let cloud = [];
      try {
        if (typeof window.fetchMyFeedback === 'function') cloud = await window.fetchMyFeedback();
      } catch {}
      const local = loadOtayoriLocal();
      // マージ（idベース）
      const map = {};
      [...local, ...cloud].forEach(x => { map[x.id] = { ...map[x.id], ...x }; });
      const list = Object.values(map).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
      if (list.length === 0) {
        mineMount.innerHTML = `
          <div class="otayori-intro">
            <div class="otayori-intro-title">📋 あなたのお便り履歴</div>
            <div class="otayori-intro-sub">まだ送ったお便りはありません。</div>
          </div>
        `;
        return;
      }
      mineMount.innerHTML = `
        <div class="otayori-intro">
          <div class="otayori-intro-title">📋 あなたのお便り履歴</div>
          <div class="otayori-intro-sub">送信した${list.length}件のお便り。開発状況を見守れます。</div>
        </div>
        <div class="otayori-list">
          ${list.map(f => {
            const d = f.submittedAt ? new Date(f.submittedAt) : null;
            const when = d ? `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}` : '';
            return `
              <div class="otayori-card otayori-status-${f.status || 'pending'}">
                <div class="otayori-card-head">
                  <span class="otayori-cat-label">${CATEGORY_LABELS[f.category] || f.category}</span>
                  <span class="otayori-card-status">${statusLabel(f.status)}</span>
                </div>
                <div class="otayori-card-body">${escapeHtml(f.text || '').replace(/\n/g, '<br>')}</div>
                ${f.adminNote ? `<div class="otayori-card-note">📝 ${escapeHtml(f.adminNote)}</div>` : ''}
                <div class="otayori-card-foot">
                  <span>${when}</span>
                  ${f.cloudSaved === false ? `<span class="otayori-card-local">ローカル保存</span>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${admin ? `<button class="otayori-admin-btn" id="otayoriAdminBtn">🔧 管理者モードで全件を見る</button>` : ''}
      `;
      mineMount.querySelector('#otayoriAdminBtn')?.addEventListener('click', openAdminView);
    }

    async function openAdminView() {
      if (!confirm('管理者モードで全ユーザーのお便りを表示します。よろしいですか？')) return;
      mineMount.innerHTML = `<div class="otayori-loading">全件取得中…</div>`;
      let all = [];
      try {
        if (typeof window.fetchAllFeedback === 'function') all = await window.fetchAllFeedback();
      } catch {}
      if (all.length === 0) {
        mineMount.innerHTML = `<div class="otayori-empty">お便りはまだ届いていません。</div>`;
        return;
      }
      const byCat = {};
      all.forEach(f => { (byCat[f.category] = byCat[f.category] || []).push(f); });
      // クリップボードにコピーできる要約テキスト
      const summary = all.map((f, i) => {
        const d = f.submittedAt ? new Date(f.submittedAt) : null;
        const when = d ? `${d.getMonth()+1}/${d.getDate()}` : '';
        return `[${i+1}] [${f.status||'pending'}] ${CATEGORY_LABELS[f.category]||f.category} (${when} ${f.name||'匿名'}): ${f.text}`;
      }).join('\n\n');
      mineMount.innerHTML = `
        <div class="otayori-intro">
          <div class="otayori-intro-title">🔧 管理者ビュー</div>
          <div class="otayori-intro-sub">全${all.length}件。状態をタップで切替可。</div>
        </div>
        <div class="otayori-admin-actions">
          <button class="otayori-admin-copy" id="otayoriCopyAll">📋 全件をClaude相談用にコピー</button>
          <button class="otayori-admin-exit" id="otayoriAdminExit">← 自分の履歴に戻る</button>
        </div>
        <div class="otayori-list">
          ${all.map(f => {
            const d = f.submittedAt ? new Date(f.submittedAt) : null;
            const when = d ? `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}` : '';
            return `
              <div class="otayori-card otayori-admin-card otayori-status-${f.status || 'pending'}" data-fb-id="${escapeHtml(f.id)}">
                <div class="otayori-card-head">
                  <span class="otayori-cat-label">${CATEGORY_LABELS[f.category] || f.category}</span>
                  <select class="otayori-admin-status" data-fb-status="${escapeHtml(f.id)}">
                    ${['pending','reviewing','doing','done','declined'].map(s => `<option value="${s}" ${f.status===s?'selected':''}>${statusLabel(s).replace(/^[^ ]+ /,'')}</option>`).join('')}
                  </select>
                </div>
                <div class="otayori-admin-meta">${escapeHtml(f.name || '匿名')} · ${when} ${f.contact ? '· ' + escapeHtml(f.contact) : ''}</div>
                <div class="otayori-card-body">${escapeHtml(f.text || '').replace(/\n/g, '<br>')}</div>
                ${f.adminNote ? `<div class="otayori-card-note">📝 ${escapeHtml(f.adminNote)}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
      mineMount.querySelector('#otayoriCopyAll')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(summary).then(() => alert('全件をコピーしました！Claudeに貼り付けて相談できます。'));
      });
      mineMount.querySelector('#otayoriAdminExit')?.addEventListener('click', renderMine);
      mineMount.querySelectorAll('[data-fb-status]').forEach(sel => {
        sel.addEventListener('change', async (e) => {
          const id = sel.dataset.fbStatus;
          const status = sel.value;
          if (typeof window.updateFeedbackStatus === 'function') {
            await window.updateFeedbackStatus(id, status, '');
            sel.closest('.otayori-admin-card').className = `otayori-card otayori-admin-card otayori-status-${status}`;
          }
        });
      });
    }

    // タブ切替
    document.querySelectorAll('[data-otayori-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-otayori-tab]').forEach(t => t.classList.toggle('active', t === tab));
        const which = tab.dataset.otayoriTab;
        writeMount.hidden = (which !== 'write');
        mineMount.hidden = (which !== 'mine');
        if (which === 'write') renderWrite();
        else renderMine();
      });
    });
    renderWrite();
  }

  menu.querySelector('#musicPlayBtn')?.addEventListener('click', () => {
    if (!__musicCurrent) return;
    const a = document.getElementById(__musicCurrent);
    if (!a) return;
    const btn = document.getElementById('musicPlayBtn');
    const app = document.querySelector('.music-app');
    if (a.paused) { a.play().catch(() => {}); btn.textContent = '⏸'; app?.classList.add('playing'); }
    else { a.pause(); btn.textContent = '▶'; app?.classList.remove('playing'); }
  });
  menu.querySelector('#musicStopBtn')?.addEventListener('click', () => {
    stopMusicApp();
    document.querySelector('.music-app')?.classList.remove('playing');
    document.getElementById('musicPlayBtn').textContent = '▶';
    document.getElementById('musicPlayBtn').disabled = true;
    document.getElementById('musicStopBtn').disabled = true;
    document.getElementById('musicNowTitle').textContent = '選曲してください';
    document.getElementById('musicNowDesc').textContent = 'このサイトで流れているBGM一覧';
    menu.querySelectorAll('[data-track-id]').forEach(li => {
      li.classList.remove('playing');
      const icon = li.querySelector('.music-track-icon');
      if (icon) icon.textContent = '▶';
    });
  });
  menu.querySelector('#musicShuffleBtn')?.addEventListener('click', () => {
    __musicShuffle = !__musicShuffle;
    const btn = document.getElementById('musicShuffleBtn');
    if (btn) btn.classList.toggle('active', __musicShuffle);
    // シャッフルONなら、今すぐランダムな曲を再生
    if (__musicShuffle) {
      const next = pickNextTrack(__musicCurrent || '');
      if (next) musicPlayTrack(next);
    }
  });
  menu.querySelector('#musicLoopBtn')?.addEventListener('click', () => {
    __musicLoop = !__musicLoop;
    const btn = document.getElementById('musicLoopBtn');
    if (btn) btn.classList.toggle('active', __musicLoop);
  });
  menu.querySelector('#musicVolume')?.addEventListener('input', (e) => {
    if (!__musicCurrent) return;
    const a = document.getElementById(__musicCurrent);
    if (a) a.volume = parseInt(e.target.value, 10) / 100;
  });

  // 偉人の広場アプリ（チャット風なタブ切替）
  function openPhonePlazaApp() {
    ensureLazyCss('plaza');
    const plaza = document.getElementById('phonePlazaApp');
    if (!plaza) return;
    plaza.hidden = false;
    renderPlazaFriends();
    renderPlazaTalks();
    // 広場BGM開始（他は停止）
    try {
      if (typeof stopAllBgm === 'function') stopAllBgm();
      const bgm = document.getElementById('squareBgm');
      if (bgm && !isMuted()) {
        bgm.volume = 0.25;
        bgm.play().catch(() => {});
      }
    } catch {}
  }
  function closePhonePlazaApp() {
    const plaza = document.getElementById('phonePlazaApp');
    if (plaza) plaza.hidden = true;
    // 広場BGMを停止
    try {
      const bgm = document.getElementById('squareBgm');
      if (bgm) { bgm.pause(); bgm.currentTime = 0; }
    } catch {}
  }
  function renderPlazaFriends() {
    const list = document.getElementById('plazaFriendsList');
    if (!list) return;
    // 偉人の広場の今日のメンバー＋フォロー中の偉人を友だち一覧に
    // （レキットはトーク側に集約して、友だちタブには出さない）
    const favIds = (typeof favPeople !== 'undefined') ? [...favPeople] : [];
    const friends = favIds.map(id => DATA.people.find(p => p.id === id)).filter(Boolean);
    const friendsHtml = friends.length === 0
      ? '<div class="plaza-empty">まだ偉人の友だちはいません。<br>偉人をフォローすると、ここに追加されます。</div>'
      : friends.map(p => {
          const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
          return `
            <button class="plaza-friend-item" data-plaza-friend="${p.id}">
              <div class="plaza-friend-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</div>
              <div class="plaza-friend-info">
                <div class="plaza-friend-name">${p.name}</div>
                <div class="plaza-friend-status">${p.field || ''}</div>
              </div>
            </button>
          `;
        }).join('');
    list.innerHTML = `
      <div class="plaza-friend-section-label">偉人の友だち</div>
      ${friendsHtml}
    `;
    list.querySelectorAll('[data-plaza-friend]').forEach(b => {
      b.addEventListener('click', () => {
        const pid = b.dataset.plazaFriend;
        close();
        setTimeout(() => showPerson(pid), 260);
      });
    });
  }
  function renderPlazaTalks() {
    const list = document.getElementById('plazaTalksList');
    if (!list) return;
    const members = (typeof getTodaysGroupMembers === 'function') ? getTodaysGroupMembers() : [];
    const { messages } = (typeof getGroupMessages === 'function') ? getGroupMessages() : { messages: [] };
    const last = messages[messages.length - 1];
    const preview = last ? (last.quote?.text || '').slice(0, 30) : '今日の広場が開いています';
    const now = new Date();
    const dateStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
    // グループアバター：メンバー5人のアバターを重ねて1つのアイコンに
    const avatarStack = members.slice(0, 4).map((p, i) => {
      const bg = p.imageUrl ? `background-image:url('${p.imageUrl}');` : '';
      return `<div class="plaza-group-av-layer" style="${bg}left:${i*11}px;z-index:${4-i};"></div>`;
    }).join('');
    const rkMsgs = getRekittoMsgs();
    const rkLast = rkMsgs[rkMsgs.length - 1];
    const rkPreview = rkLast ? (rkLast.text || '').split('\n')[0].slice(0, 30) : 'ようこそ、偉人と自分へ。';
    const rkUnread = getRekittoUnread();
    const groupUnread = (typeof computeUnreadCount === 'function') ? computeUnreadCount() : 0;
    const rkDate = rkLast ? (() => {
      const d = new Date(rkLast.ts);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    })() : '';
    list.innerHTML = `
      <button class="plaza-talk-item plaza-rekitto-item" data-plaza-rekitto="1">
        <div class="plaza-group-av plaza-rekitto-av">
          ${rekittoAvatarHtml()}
        </div>
        <div class="plaza-talk-info">
          <div class="plaza-talk-head">
            <span class="plaza-talk-name">📜 レキット <span class="plaza-talk-role">歴史管理人</span></span>
            <span class="plaza-talk-date">${rkDate}</span>
          </div>
          <div class="plaza-talk-preview">${escapeHtml(rkPreview)}</div>
        </div>
        ${rkUnread > 0 ? `<span class="plaza-unread-badge">${rkUnread > 99 ? '99+' : rkUnread}</span>` : ''}
      </button>
      <button class="plaza-talk-item plaza-group-item" data-plaza-group="1">
        <div class="plaza-group-av">${avatarStack}</div>
        <div class="plaza-talk-info">
          <div class="plaza-talk-head">
            <span class="plaza-talk-name">偉人の広場 <span class="plaza-group-count">${members.length}</span></span>
            <span class="plaza-talk-date">${dateStr}</span>
          </div>
          <div class="plaza-talk-preview">${escapeHtml(preview)}</div>
        </div>
        ${groupUnread > 0 ? `<span class="plaza-unread-badge">${groupUnread > 99 ? '99+' : groupUnread}</span>` : ''}
      </button>
    `;
    list.querySelector('[data-plaza-group]')?.addEventListener('click', () => {
      openPlazaChatThread('group');
    });
    list.querySelector('[data-plaza-rekitto]')?.addEventListener('click', () => {
      openRekittoChat();
    });
  }
  // グローバル公開（pushRekittoMsgからの再描画で使う）
  window.renderPlazaTalks = renderPlazaTalks;
  window.renderPlazaFriends = renderPlazaFriends;
  window.openRekittoChat = openRekittoChat;

  // レキットのチャットを開く
  function openRekittoChat() {
    const plaza = document.getElementById('phonePlazaApp');
    if (!plaza) return;
    const title = document.getElementById('plazaChatTitle');
    const body = document.getElementById('plazaChatBody');
    if (title) title.textContent = '📜 レキット（歴史管理人）';
    if (body) renderRekittoChat(body);
    plaza.querySelectorAll('.plaza-tab-panel').forEach(p => {
      p.hidden = (p.dataset.plazaPanel !== 'chat');
    });
    markRekittoRead();
    try { if (typeof window.renderIconBadges === 'function') window.renderIconBadges(); } catch {}
    try { if (typeof window.renderPlazaTalks === 'function') window.renderPlazaTalks(); } catch {}
    try { if (typeof window.updatePhoneNotif === 'function') window.updatePhoneNotif(); } catch {}
    requestAnimationFrame(() => { if (body) body.scrollTop = body.scrollHeight; });
  }

  // レキットのチャットを描画
  function renderRekittoChat(body) {
    const msgs = getRekittoMsgs();
    if (msgs.length === 0) {
      body.innerHTML = `<div class="line-chat rekitto-chat"><div class="line-msg-received"><div class="line-avatar rekitto-line-avatar">${rekittoAvatarHtml()}</div><div class="line-msg-col"><div class="line-msg-name">📜 レキット</div><div class="line-msg-bubble rekitto-bubble">はじめまして。私はレキット。\n歴史が書き換えられぬよう、ここから見張っています。\n\n向こう側には、もう一人——ラビン。\n私たちは会うことが叶いません。けれど歴史を知ってもらうため、二人で同じ世界を守っています。\n\n偉人や会員からの便りは、私が必ずここへ届けますね。</div></div></div></div>`;
      return;
    }
    body.innerHTML = `
      <div class="line-chat rekitto-chat">
        ${msgs.map(m => {
          const d = new Date(m.ts || Date.now());
          const tm = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
          const linkBtn = (() => {
            if (m.kind === 'follow' && m.personId) {
              const p = DATA.people.find(x => x.id === m.personId);
              return p ? `<button class="rekitto-link-btn" data-rekitto-person="${p.id}">${escapeHtml(m.linkLabel || p.name + 'を見る')} →</button>` : '';
            }
            if (m.kind === 'user_follow' && m.userId) {
              return `<button class="rekitto-link-btn" data-rekitto-user="${escapeHtml(m.userId)}">${escapeHtml(m.linkLabel || 'プロフィールを見る')} →</button>`;
            }
            if (m.kind === 'update') {
              const t = m.target ? JSON.stringify(m.target) : '';
              return `<button class="rekitto-link-btn" data-rekitto-updates="1" data-rekitto-target='${escapeHtml(t)}'>${escapeHtml(m.linkLabel || '詳しく見る')} →</button>`;
            }
            if (m.kind === 'title_up') {
              return `<button class="rekitto-link-btn" data-rekitto-title="1">${escapeHtml(m.linkLabel || '称号を選ぶ')} →</button>`;
            }
            return '';
          })();
          return `
            <div class="line-msg-received">
              <div class="line-avatar rekitto-line-avatar">${rekittoAvatarHtml()}</div>
              <div class="line-msg-col">
                <div class="line-msg-name">📜 レキット</div>
                <div class="line-msg-bubble rekitto-bubble">
                  ${escapeHtml(m.text || '')}
                  ${linkBtn ? `<div class="rekitto-link-row">${linkBtn}</div>` : ''}
                </div>
                <div class="line-msg-time">${tm}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    // リンクボタンのハンドラ
    body.querySelectorAll('[data-rekitto-person]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = btn.dataset.rekittoPerson;
        // スマホを閉じて偉人ページへ
        const menu = document.getElementById('phoneMenu');
        if (menu) menu.classList.remove('open');
        setTimeout(() => showPerson(pid), 260);
      });
    });
    body.querySelectorAll('[data-rekitto-title]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('phoneMenu');
        if (menu) menu.classList.remove('open');
        setTimeout(() => {
          if (typeof window.openAccountMenu === 'function') window.openAccountMenu();
          else if (typeof openMemberSettings === 'function') openMemberSettings();
        }, 260);
      });
    });
    body.querySelectorAll('[data-rekitto-updates]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        let target = null;
        try { target = JSON.parse(btn.dataset.rekittoTarget || 'null'); } catch {}
        const menu = document.getElementById('phoneMenu');
        if (menu) menu.classList.remove('open');
        setTimeout(() => {
          if (target?.action === 'worldview') {
            if (typeof openWorldviewModal === 'function') openWorldviewModal();
          } else if (target?.action === 'music') {
            // スマホ起動してミュージックを開く
            const btn2 = document.getElementById('powerBtn');
            if (btn2) btn2.click();
            setTimeout(() => {
              const musicIcon = document.querySelector('[data-phone-action="music"]');
              if (musicIcon) musicIcon.click();
            }, 300);
          } else if (target?.view) {
            if (typeof showView === 'function') showView(target.view);
          } else {
            if (typeof showView === 'function') showView('people');
            const updEl = document.getElementById('updatesFeed') || document.querySelector('.updates-feed');
            if (updEl) updEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 260);
      });
    });
    body.querySelectorAll('[data-rekitto-user]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = btn.dataset.rekittoUser;
        const menu = document.getElementById('phoneMenu');
        if (menu) menu.classList.remove('open');
        setTimeout(() => {
          if (typeof openUserProfileById === 'function') openUserProfileById(uid);
          else if (typeof window.openUserProfileById === 'function') window.openUserProfileById(uid);
        }, 260);
      });
    });
  }
  // 偉人の広場のチャット画面をスマホ内に埋め込む
  function openPlazaChatThread(personId) {
    const plaza = document.getElementById('phonePlazaApp');
    if (!plaza) return;
    const title = document.getElementById('plazaChatTitle');
    const body = document.getElementById('plazaChatBody');
    if (title) title.textContent = 'IJiN';
    // 広場のグループチャットをbody内に描画（renderLineGroup 再利用）
    if (body && typeof renderLineGroup === 'function') {
      renderLineGroup(body);
    }
    // パネル切替：talks/friends を隠して chat を表示
    plaza.querySelectorAll('.plaza-tab-panel').forEach(p => {
      p.hidden = (p.dataset.plazaPanel !== 'chat');
    });
    // チャットを既読マークし、未読バッジを消す
    try {
      const { messages } = (typeof getGroupMessages === 'function') ? getGroupMessages() : { messages: [] };
      localStorage.setItem(CHAT_LAST_READ_KEY, String(messages.length));
      if (typeof updateChatBadge === 'function') updateChatBadge();
      if (typeof window.renderIconBadges === 'function') window.renderIconBadges();
      if (typeof window.updatePhoneNotif === 'function') window.updatePhoneNotif();
      if (typeof window.renderPlazaTalks === 'function') window.renderPlazaTalks();
    } catch {}
    // 最新メッセージへスクロール（最後にジャンプ）
    requestAnimationFrame(() => {
      if (body) body.scrollTop = body.scrollHeight;
      // 画像のロード後にもう一度（高さが増える可能性）
      setTimeout(() => { if (body) body.scrollTop = body.scrollHeight; }, 250);
    });
  }
  // タブ切替／戻る／送信のハンドラをまとめて登録
  const plaza = document.getElementById('phonePlazaApp');
  plaza?.querySelector('.plaza-app-back')?.addEventListener('click', () => {
    const chat = plaza.querySelector('[data-plaza-panel="chat"]');
    if (chat && !chat.hidden) {
      // チャット表示中 → トーク一覧へ
      plaza.querySelectorAll('.plaza-tab-panel').forEach(p => {
        p.hidden = (p.dataset.plazaPanel !== 'talks');
      });
      return;
    }
    closePhonePlazaApp();
  });
  // Androidライクなナビバー：◁ 戻る／□ ホーム／≡ 何もしない
  const navBack = document.getElementById('phoneNavBack');
  const navHome = document.getElementById('phoneNavHome');
  const navMenu = document.getElementById('phoneNavMenu');
  navBack?.addEventListener('click', () => {
    if (plaza && !plaza.hidden) {
      // 広場が開いている場合：チャット→トーク一覧→広場を閉じる
      const chat = plaza.querySelector('[data-plaza-panel="chat"]');
      if (chat && !chat.hidden) {
        plaza.querySelectorAll('.plaza-tab-panel').forEach(p => {
          p.hidden = (p.dataset.plazaPanel !== 'talks');
        });
        return;
      }
      closePhonePlazaApp();
      return;
    }
    // ツールアプリ（ミュージック・めしる・お便り）が開いていれば、履歴を辿って戻る
    if (typeof window.phoneToolBack === 'function' && window.phoneToolBack()) return;
    // ホーム画面なら閉じる
    close();
  });
  navHome?.addEventListener('click', () => {
    // スマホ内のホーム（アプリグリッド）に戻す：全ツールアプリを閉じる
    __toolStack.length = 0;
    ['phonePlazaApp','phoneMusicApp','phoneMeshiruApp','phoneOtayoriApp','phoneHistoryApp'].forEach(id => {
      const el2 = document.getElementById(id);
      if (el2) el2.hidden = true;
    });
    document.querySelectorAll('.plaza-tab-panel').forEach(p => {
      p.hidden = (p.dataset.plazaPanel !== 'friends');
    });
    document.querySelectorAll('.plaza-app-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.plazaTab === 'friends');
    });
    try { stopMusicApp?.(); } catch {}
  });
  // ≡ 三本線：今日の軌跡を開く（既に開いていたらホーム画面に戻す）
  navMenu?.addEventListener('click', () => {
    const hist = document.getElementById('phoneHistoryApp');
    if (hist && !hist.hidden) {
      // 履歴が既に開いている → ホーム画面に戻す
      navHome?.click();
      return;
    }
    openTodayHistoryApp();
  });

  function openTodayHistoryApp() {
    // 他のアプリを閉じて履歴画面を表示
    ['phoneMusicApp','phonePlazaApp','phoneHistoryApp'].forEach(id => {
      const a = document.getElementById(id);
      if (a) a.hidden = true;
    });
    let app = document.getElementById('phoneHistoryApp');
    if (!app) {
      app = document.createElement('div');
      app.id = 'phoneHistoryApp';
      app.className = 'phone-tool-app';
      menu.querySelector('.phone-screen')?.appendChild(app);
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    let lastVisit = {};
    try { lastVisit = JSON.parse(localStorage.getItem(LAST_VISIT_KEY) || '{}'); } catch {}
    const todayIds = Object.keys(lastVisit).filter(id => lastVisit[id] === todayStr);
    const todayPeople = todayIds.map(id => DATA.people.find(p => p.id === id)).filter(Boolean);
    app.hidden = false;
    app.innerHTML = `
      <div class="plaza-app-head tool-app-head">
        <button class="plaza-app-back tool-app-back" type="button" data-history-close="1" aria-label="戻る">‹</button>
        <span class="plaza-app-title">今日の軌跡</span>
      </div>
      <div class="history-app">
        <div class="history-head-note">${new Date().getMonth()+1}月${new Date().getDate()}日、今日出会った偉人たち（${todayPeople.length}人）</div>
        ${todayPeople.length === 0 ? `
          <div class="history-empty">
            <div class="history-empty-ic">👣</div>
            <div>今日はまだ誰とも出会っていません。<br>偉人のページを開くと、ここに軌跡が残ります。</div>
          </div>
        ` : `
          <div class="history-list">
            ${todayPeople.map(p => {
              const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
              return `
                <button class="history-item" data-history-person="${p.id}">
                  <div class="history-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</div>
                  <div class="history-info">
                    <div class="history-name">${escapeHtml(p.name)}</div>
                    <div class="history-sub">${fmtYearRange(p.birth, p.death)} · ${escapeHtml(p.field || '')}</div>
                  </div>
                  <div class="history-arrow">›</div>
                </button>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
    app.querySelector('[data-history-close]').addEventListener('click', () => {
      app.hidden = true;
    });
    app.querySelectorAll('[data-history-person]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.historyPerson;
        close();
        setTimeout(() => showPerson(pid), 260);
      });
    });
  }

  plaza?.querySelectorAll('[data-plaza-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const which = tab.dataset.plazaTab;
      plaza.querySelectorAll('.plaza-app-tab').forEach(t => t.classList.toggle('active', t === tab));
      plaza.querySelectorAll('.plaza-tab-panel').forEach(p => {
        p.hidden = (p.dataset.plazaPanel !== which);
      });
    });
  });
  plaza?.querySelector('.plaza-chat-back')?.addEventListener('click', () => {
    plaza.querySelectorAll('.plaza-tab-panel').forEach(p => {
      p.hidden = (p.dataset.plazaPanel !== 'talks');
    });
  });
  plaza?.querySelector('#plazaChatForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('plazaChatInput');
    const text = (input?.value || '').trim();
    if (!text) return;
    if (typeof saveSelfPost === 'function') saveSelfPost(text);
    if (typeof scheduleQuickReply === 'function') scheduleQuickReply(text);
    input.value = '';
    input.style.height = 'auto';
    const body = document.getElementById('plazaChatBody');
    if (body && typeof renderLineGroup === 'function') renderLineGroup(body);
  });
  // 入力欄のチャット風 自動リサイズ＋Enter送信（Shift+Enterで改行）
  const plazaInput = document.getElementById('plazaChatInput');
  plazaInput?.addEventListener('input', (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(100, e.target.scrollHeight) + 'px';
  });
  // Enterは常に改行のみ（送信は送信ボタンのみ）
  // スタンプパネル開閉
  const stickerToggle = document.getElementById('plazaStickerToggle');
  const stickerPanel = document.getElementById('plazaStickerPanel');
  stickerToggle?.addEventListener('click', () => {
    if (!stickerPanel) return;
    stickerPanel.hidden = !stickerPanel.hidden;
  });
  // スタンプ送信
  stickerPanel?.querySelectorAll('[data-sticker]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.sticker;
      if (typeof saveSelfPost === 'function') saveSelfPost(`[sticker:${sid}]`);
      stickerPanel.hidden = true;
      const body = document.getElementById('plazaChatBody');
      if (body && typeof renderLineGroup === 'function') renderLineGroup(body);
    });
  });
  // スタンプカテゴリタブ（ショパン／ベートーヴェン）
  stickerPanel?.querySelectorAll('[data-sticker-set]').forEach(tab => {
    tab.addEventListener('click', () => {
      const which = tab.dataset.stickerSet;
      stickerPanel.querySelectorAll('.plaza-sticker-tab').forEach(t => t.classList.toggle('active', t === tab));
      stickerPanel.querySelectorAll('[data-sticker-grid]').forEach(g => {
        g.hidden = (g.dataset.stickerGrid !== which);
      });
    });
  });
  window.renderOshiSlot = renderOshiSlot;
  window.renderPhoneQuoteBanner = renderPhoneQuoteBanner;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) close();
  });
  // 1分ごとに時計更新
  setInterval(() => { if (menu.classList.contains('open')) tick(); }, 30000);
}

function initMuteToggle() {
  const btn = document.getElementById('muteToggle');
  if (!btn) return;
  applyMuteState();
  btn.addEventListener('click', () => {
    setMuted(!isMuted());
    applyMuteState();
  });
}

// 効果音：送信・受信
function playSfxSend() {
  if (isMuted()) return;
  const el = document.getElementById('sfxSend');
  if (!el) return;
  try { el.currentTime = 0; el.volume = 0.65; el.play().catch(() => {}); } catch {}
}
function playSfxReceive() {
  if (isMuted()) return;
  const el = document.getElementById('sfxReceive');
  if (!el) return;
  try { el.currentTime = 0; el.volume = 0.5; el.play().catch(() => {}); } catch {}
}

// 自分のつぶやきに対する偉人の即応（ローカルのみの演出）
const QUICK_REPLY_KEY = 'ijin_quick_replies';
function loadQuickReplies() {
  try { return JSON.parse(localStorage.getItem(QUICK_REPLY_KEY) || '[]'); }
  catch { return []; }
}
function saveQuickReply(entry) {
  const list = loadQuickReplies();
  list.push(entry);
  // 50件まで保持
  localStorage.setItem(QUICK_REPLY_KEY, JSON.stringify(list.slice(-50)));
}

function scheduleQuickReply(userText) {
  const members = getTodaysGroupMembers();
  if (members.length === 0) return;
  const person = members[Math.floor(Math.random() * members.length)];
  const qs = person.quotes || [];
  if (qs.length === 0) return;
  const q = qs[Math.floor(Math.random() * qs.length)];
  const delay = 5000 + Math.random() * 7000; // 5〜12秒
  setTimeout(() => {
    saveQuickReply({
      personId: person.id,
      quoteText: q.text,
      quoteSource: q.source || '',
      ts: Date.now(),
    });
    playSfxReceive();
    if (!document.getElementById('chatPanel')?.classList.contains('hidden')) {
      renderChatPanel();
    } else {
      // パネルが閉じてたらバッジ更新のみ
      updateChatBadge();
    }
  }, delay);
}

// BGM全停止
function stopAllBgm() {
  ['homeBgm', 'searchBgm', 'historyBgm', 'routineBgm', 'blogBgm', 'favoritesBgm', 'squareBgm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.pause(); try { el.currentTime = 0; } catch {} }
  });
}
// 安全な単一BGM再生（重複防止・必ず他を全停止してから）
function playViewBgmExclusive(targetId) {
  if (isMuted()) return;
  const all = ['homeBgm','searchBgm','historyBgm','routineBgm','blogBgm','favoritesBgm','squareBgm'];
  all.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === targetId) return;
    el.pause();
    try { el.currentTime = 0; } catch {}
  });
  const target = targetId ? document.getElementById(targetId) : null;
  if (target) {
    target.volume = 0.35;
    if (target.paused) target.play().catch(() => {});
  }
}
window.playViewBgmExclusive = playViewBgmExclusive;
// 重複チェック：3秒おきに2つ以上再生中ならexclusive化（保険）
setInterval(() => {
  try {
    const playing = ['homeBgm','searchBgm','historyBgm','routineBgm','blogBgm','favoritesBgm','squareBgm']
      .map(id => ({ id, el: document.getElementById(id) }))
      .filter(x => x.el && !x.el.paused);
    if (playing.length > 1) {
      // スマホ内ならsquareBgm優先、なければ最新で鳴ったもの（=最後のもの）を残す
      const phoneOpen = document.getElementById('phoneMenu')?.classList.contains('open');
      let keep = phoneOpen ? playing.find(x => x.id === 'squareBgm') : null;
      if (!keep) keep = playing[playing.length - 1];
      playing.forEach(x => {
        if (x.id !== keep.id) { x.el.pause(); try { x.el.currentTime = 0; } catch {} }
      });
    }
  } catch {}
}, 3000);

// 本を開いたときの演出：ページめくり音 + BGM停止
function playBookOpenFx() {
  stopAllBgm();
  playPageFlipSound();
}

async function showPerson(id) {
  const p = DATA.people.find(x => x.id === id);
  if (!p) return;
  playBookOpenFx();
  saveBookmark(id);
  recordVisit(id);
  // URLを ?person=<id> に更新（共有可能に）
  try {
    const url = new URL(location.href);
    url.searchParams.set('person', id);
    url.searchParams.delete('era');
    url.searchParams.delete('cat');
    url.searchParams.delete('tag');
    url.searchParams.delete('view');
    history.replaceState(null, '', url.toString());
  } catch {}
  try { checkFollowBackEligibility(id); } catch {}
  // アニメーション再生中に裏で詳細を描画
  const flipPromise = playBookFlip({
    title: p.name,
    nameEn: p.nameEn,
    subtitle: `${fmtYearRange(p.birth, p.death)} ／ ${p.field}`,
    imageUrl: p.imageUrl
  });
  const events = [...p.events].sort((a, b) => a.year - b.year);
  const handle = p.nameEn ? p.nameEn.split(' ').pop().toLowerCase() : p.id;
  const quotesCount = (p.quotes || []).length;
  const tagsUsed = new Set();
  events.forEach(e => (e.tags || []).forEach(t => tagsUsed.add(t)));

  // X（Twitter）風の投稿カードHTML生成
  const handleTxt = p.nameEn ? p.nameEn.split(' ').pop().toLowerCase() : p.id;
  const xAvatar = p.imageUrl
    ? `<div class="x-avatar" style="background-image:url('${p.imageUrl}')"></div>`
    : `<div class="x-avatar x-avatar-fallback">${p.name.charAt(0)}</div>`;

  function xPostCard({ year, age, icon, typeLabel, title, body, tags, image, extra, source, postKey }) {
    const tagChips = (tags || []).map(tid => {
      const t = DATA.tagMap[tid];
      return t ? `<span class="event-tag" data-tag="${t.id}">${t.name}</span>` : '';
    }).join('');
    const when = year ? `${year}年${age ? `・${age}歳` : ''}` : '';
    const key = postKey || `p::${p.id}::${(title || body || '').slice(0, 32)}`;
    const likeCount = getLikeCount(key);
    const liked = isLiked(key);
    const comments = (commentsData || {})[key] || [];
    const shareText = `${title ? title + '\n' : ''}${body || ''}\n— ${p.name} 『偉人と自分。』より\n\n#偉人と自分 #ijin_to_jibun`;
    const shareUrl = location.href.split('#')[0];
    const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    return `
      <article class="x-post" data-post-key="${key}">
        ${xAvatar}
        <div class="x-post-body">
          <div class="x-post-head">
            <span class="x-post-name">${p.name}</span>
            <span class="x-post-verified" title="${p.field}">✓</span>
            <span class="x-post-handle">@${handleTxt}</span>
            <span class="x-post-dot">·</span>
            <span class="x-post-time">${when || '—'}</span>
            ${typeLabel ? `<span class="x-post-type x-post-type-${icon || 'default'}">${typeLabel}</span>` : ''}
          </div>
          ${title ? `<div class="x-post-title">${title}</div>` : ''}
          ${body ? `<div class="x-post-text">${body}</div>` : ''}
          ${source ? `<div class="x-post-source">— ${source}</div>` : ''}
          ${image ? `<div class="x-post-media" style="background-image:url('${image}')"></div>` : ''}
          ${extra || ''}
          ${tagChips ? `<div class="x-post-tags">${tagChips}</div>` : ''}
          <div class="x-post-actions">
            <button class="x-action x-action-comment" data-comment-toggle="${key}" aria-label="コメント">
              💬 <span class="x-action-count">${comments.length || ''}</span>
            </button>
            <a class="x-action x-action-share" href="${shareHref}" target="_blank" rel="noopener" aria-label="Xで共有" onclick="event.stopPropagation()">
              ↗ 共有
            </a>
            <button class="x-action x-action-like ${liked ? 'liked' : ''}" data-like-toggle="${key}" aria-label="いいね">
              ${liked ? '❤️' : '♡'} <span class="x-action-count">${likeCount || ''}</span>
            </button>
          </div>
          <div class="x-post-comments hidden" data-comments-panel="${key}">
            <div class="x-comments-list">
              ${comments.map((c, i) => `
                <div class="x-comment" data-comment-idx="${i}">
                  <div class="x-comment-text">${escapeHtml(c.text)}</div>
                  <div class="x-comment-meta">
                    <span class="x-comment-date">${formatTs(c.ts)}</span>
                    ${c.userId === 'me' || !c.userId ? `<button class="x-comment-delete" data-comment-delete="${key}|${i}">削除</button>` : ''}
                  </div>
                </div>
              `).join('') || '<div class="x-comments-empty">まだコメントはありません</div>'}
            </div>
            <form class="x-comment-form" data-comment-form="${key}">
              <input class="x-comment-input" type="text" placeholder="コメントを書く..." maxlength="500">
              <button type="submit" class="x-comment-send">送信</button>
            </form>
          </div>
        </div>
      </article>
    `;
  }

  // 投稿タブ（年表ベース）
  const feedHtml = [];
  events.forEach(e => {
    feedHtml.push(xPostCard({
      year: e.year, age: e.age, icon: 'event', typeLabel: '出来事',
      title: e.title, body: e.detail, tags: e.tags
    }));
  });
  (p.quotes || []).forEach(q => {
    feedHtml.push(xPostCard({
      year: null, icon: 'quote', typeLabel: '名言',
      title: null, body: `「${q.text}」`, source: q.source || ''
    }));
  });

  // 全部流れてくるタイムライン（出来事・名言・作品・映画・場所・本）
  const stream = [];
  events.forEach(e => stream.push({ sortYear: e.year || 0, sortPri: 1, html: xPostCard({
    year: e.year, age: e.age, icon: 'event', typeLabel: '🪶 出来事',
    title: e.title, body: e.detail, tags: e.tags
  })}));
  (p.quotes || []).forEach(q => stream.push({ sortYear: 99999, sortPri: 2, html: xPostCard({
    icon: 'quote', typeLabel: '✍ 名言',
    body: `「${q.text}」`, source: q.source || ''
  })}));
  (p.works || []).forEach(w => {
    const yt = w.youtubeId ? `https://i.ytimg.com/vi/${w.youtubeId}/mqdefault.jpg` : null;
    const ytLink = w.youtubeId ? `<a class="x-post-embed-link" href="https://www.youtube.com/watch?v=${w.youtubeId}" target="_blank" rel="noopener">▶ YouTubeで聴く</a>` : '';
    stream.push({ sortYear: w.year || 99999, sortPri: 3, html: xPostCard({
      year: w.year, icon: 'work', typeLabel: '🎵 代表作',
      title: w.title, body: w.description || '', image: yt, extra: ytLink
    })});
  });
  (p.media || []).forEach(m => {
    const yt = m.youtubeId ? `https://i.ytimg.com/vi/${m.youtubeId}/mqdefault.jpg` : null;
    const ytLink = m.youtubeId ? `<a class="x-post-embed-link" href="https://www.youtube.com/watch?v=${m.youtubeId}" target="_blank" rel="noopener">▶ 予告編を観る</a>` : '';
    const typeLbl = {movie:'🎬 映画', drama:'📺 ドラマ', anime:'🎞 アニメ', doc:'📹 ドキュメンタリー'}[m.type] || '🎬 映像';
    stream.push({ sortYear: m.year || 99999, sortPri: 4, html: xPostCard({
      year: m.year, icon: 'media', typeLabel: typeLbl,
      title: m.title, body: m.description || (m.cast ? `主演: ${m.cast}` : ''), image: yt, extra: ytLink
    })});
  });
  (p.places || []).forEach(pl => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pl.name + ' ' + pl.location)}`;
    const mapLink = `<a class="x-post-embed-link" href="${mapUrl}" target="_blank" rel="noopener">📍 地図で見る</a>`;
    stream.push({ sortYear: 99998, sortPri: 5, html: xPostCard({
      icon: 'place', typeLabel: '📍 聖地',
      title: pl.name, body: `${pl.location}${pl.note ? `\n${pl.note}` : ''}`, extra: mapLink
    })});
  });
  (p.books || []).forEach(b => {
    const cover = b.asin ? amazonCover(b.asin) : '';
    const amazon = b.asin ? amazonUrl(b.asin) : `https://www.amazon.co.jp/s?k=${encodeURIComponent((b.title || '') + ' ' + (b.author || ''))}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
    const rakuten = rakutenSearchUrl(b.title, b.author);
    const bookExtra = `
      <div class="x-book-card">
        ${cover ? `<a class="x-book-cover" href="${amazon}" target="_blank" rel="noopener sponsored" style="background-image:url('${cover}')" onclick="event.stopPropagation()"></a>` : ''}
        <div class="x-book-info">
          <div class="x-book-title">${b.title}</div>
          <div class="x-book-author">${b.author || ''}</div>
          ${b.description ? `<div class="x-book-desc">${b.description}</div>` : ''}
          <div class="x-book-stores">
            <a class="x-book-store x-book-amazon" href="${amazon}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">📦 Amazon</a>
            <a class="x-book-store x-book-rakuten" href="${rakuten}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">🛍 楽天ブックス</a>
          </div>
        </div>
      </div>
    `;
    stream.push({ sortYear: 99999, sortPri: 6, html: xPostCard({
      icon: 'book', typeLabel: '関連本',
      title: null, body: null, extra: bookExtra
    })});
  });
  // 🎭 内面の葛藤（深掘り偉人のみ）
  (p.innerConflicts || []).forEach(ic => {
    const extra = `
      <div class="x-depth-card x-depth-conflict">
        <div class="x-depth-title">${escapeHtml(ic.title)}</div>
        ${ic.period ? `<div class="x-depth-period">${escapeHtml(ic.period)}</div>` : ''}
        <div class="x-depth-body">${escapeHtml(ic.body)}</div>
      </div>
    `;
    stream.push({ sortYear: 99970, sortPri: 4, html: xPostCard({
      icon: 'note', typeLabel: '🎭 内面の葛藤', title: null, body: null, extra
    })});
  });
  // 🔀 人生の転換点（深掘り偉人のみ）
  (p.turningPoints || []).forEach(tp => {
    const extra = `
      <div class="x-depth-card x-depth-turning">
        ${tp.year ? `<div class="x-depth-year">${escapeHtml(String(tp.year))}</div>` : ''}
        <div class="x-depth-title">${escapeHtml(tp.title)}</div>
        <div class="x-depth-body">${escapeHtml(tp.body)}</div>
      </div>
    `;
    stream.push({ sortYear: 99975, sortPri: 4, html: xPostCard({
      icon: 'note', typeLabel: '🔀 人生の転換点', title: null, body: null, extra
    })});
  });
  // 💎 知られざる逸話（深掘り偉人のみ）
  (p.unknownStories || []).forEach(us => {
    const extra = `
      <div class="x-depth-card x-depth-unknown">
        <div class="x-depth-title">${escapeHtml(us.title)}</div>
        <div class="x-depth-body">${escapeHtml(us.body)}</div>
      </div>
    `;
    stream.push({ sortYear: 99980, sortPri: 5, html: xPostCard({
      icon: 'note', typeLabel: '💎 知られざる逸話', title: null, body: null, extra
    })});
  });
  // 料理人のレシピ（コピーボタン付き）— 料理人偉人のみ
  (p.recipes || []).forEach((r, idx) => {
    const ingredientsText = (r.ingredients || []).map(i => '・' + i).join('\n');
    const stepsText = (r.steps || []).map((s, i) => `${i+1}. ${s}`).join('\n');
    const fullText = `【${r.name}】${r.tagline ? '\n' + r.tagline : ''}\n\n■ 材料\n${ingredientsText}\n\n■ 作り方\n${stepsText}${r.note ? '\n\n■ メモ\n' + r.note : ''}\n\n— ${p.name}のレシピ（偉人と自分。より）`;
    const recipeId = `recipe-${p.id}-${idx}`;
    const recipeExtra = `
      <div class="x-recipe-card">
        <div class="x-recipe-header">
          <div class="x-recipe-title">${escapeHtml(r.name)}</div>
          ${r.tagline ? `<div class="x-recipe-tagline">${escapeHtml(r.tagline)}</div>` : ''}
        </div>
        <details class="x-recipe-section">
          <summary>📋 材料（${(r.ingredients || []).length}点）</summary>
          <ul class="x-recipe-list">${(r.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
        </details>
        ${(r.steps || []).length ? `
          <details class="x-recipe-section">
            <summary>👨‍🍳 作り方（${r.steps.length}ステップ）</summary>
            <ol class="x-recipe-steps">${r.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
          </details>
        ` : ''}
        ${r.note ? `<div class="x-recipe-note">💡 ${escapeHtml(r.note)}</div>` : ''}
        <button class="x-recipe-copy" data-recipe-copy="${recipeId}" data-recipe-text="${escapeHtml(fullText).replace(/"/g,'&quot;')}">📋 レシピをコピー</button>
      </div>
    `;
    stream.push({ sortYear: 99999, sortPri: 7, html: xPostCard({
      icon: 'book', typeLabel: '🍳 レシピ',
      title: null, body: null, extra: recipeExtra
    })});
  });
  // アクセスごとにランダムシャッフル（Fisher-Yates）
  for (let i = stream.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stream[i], stream[j]] = [stream[j], stream[i]];
  }
  const streamHtml = stream.map(s => s.html).join('');

  const html = `
    <!-- カバー：名前を主役にした扉絵風 -->
    <div class="profile-cover profile-cover-typo">
      <div class="profile-cover-frame">
        <div class="profile-cover-orn-top">◆</div>
        <div class="profile-cover-name">${p.name}</div>
        ${p.nameEn ? `<div class="profile-cover-name-en">${p.nameEn}</div>` : ''}
        <div class="profile-cover-dates">${fmtYearRange(p.birth, p.death)}</div>
        <div class="profile-cover-orn-bot">◆</div>
      </div>
    </div>

    <!-- プロフィールヘッダー -->
    <div class="profile-header">
      <div class="profile-avatar ${p.imageUrl ? 'has-image' : ''}" style="${p.imageUrl ? `background-image:url('${p.imageUrl}')` : ''}">${p.imageUrl ? '' : p.name.charAt(0)}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="profile-names">
          <div class="profile-name">${p.name}</div>
          <div class="profile-handle">@${handle}</div>
        </div>
        <div class="profile-action-btns">
          ${(() => {
            const loggedIn = (typeof currentUser !== 'undefined' && currentUser);
            const following = isFavPerson(p.id);
            if (loggedIn) {
              return `<button class="follow-btn follow-btn-compact ${following ? 'active' : ''}" data-follow-toggle="${p.id}" title="${following ? 'フォロー中（タップで解除）' : 'フォローする'}" aria-label="${following ? 'フォロー中' : 'フォロー'}">${following ? '✓' : '＋'}</button>`;
            } else {
              return `<button class="follow-btn follow-btn-compact disabled" data-follow-login="1" title="無料会員登録（0円）すると偉人をフォローできます" aria-label="フォロー（無料会員限定）">＋</button>`;
            }
          })()}
          <button class="oshi-set-btn ${getOshi() === p.id ? 'active' : ''}" data-oshi-set="${p.id}">
            ${getOshi() === p.id ? '♡ 推し中' : '♡ 推しにする'}
          </button>
          <button class="person-share-btn" data-person-share="${p.id}" aria-label="この偉人をシェア" title="この偉人をシェア">🔗</button>
        </div>
      </div>
      <div class="profile-info-card">
        ${p.field ? `
          <div class="profile-info-item">
            <span class="profile-info-ic">🎨</span>
            <span class="profile-info-label">職業</span>
            <span class="profile-info-value">${escapeHtml(p.field)}</span>
          </div>
        ` : ''}
        ${p.country ? `
          <div class="profile-info-item">
            <span class="profile-info-ic">📍</span>
            <span class="profile-info-label">国</span>
            <span class="profile-info-value">${escapeHtml(p.country)}</span>
          </div>
        ` : ''}
        ${(p.birth || (p.birthMonth && p.birthDay)) ? `
          <div class="profile-info-item">
            <span class="profile-info-ic">🎂</span>
            <span class="profile-info-label">生</span>
            <span class="profile-info-value">${p.birth ? fmtYear(p.birth) + '年' : ''}${(p.birthMonth && p.birthDay) ? ` ${p.birthMonth}/${p.birthDay}` : ''}</span>
          </div>
        ` : ''}
        ${(p.death || (p.deathMonth && p.deathDay)) ? `
          <div class="profile-info-item">
            <span class="profile-info-ic">🕯</span>
            <span class="profile-info-label">没</span>
            <span class="profile-info-value">${p.death ? fmtYear(p.death) + '年' : ''}${(p.deathMonth && p.deathDay) ? ` ${p.deathMonth}/${p.deathDay}` : ''}${(p.birth && p.death) ? ` <span class="profile-info-age">（${p.death - p.birth}歳没）</span>` : ''}</span>
          </div>
        ` : ''}
        <div class="profile-info-item profile-info-visit" id="profileVisitItem">
          <span class="profile-info-ic">👣</span>
          <span class="profile-info-value">
            <span id="profileGlobalVisit">累計 —</span>
            <span class="profile-info-visit-sep"> · </span>
            <span>あなた ${getVisitCount(p.id)}回</span>
          </span>
        </div>
      </div>
      <div class="profile-visitors-section">
        <div class="profile-visitors-head">
          <span class="profile-visitors-ic">👣</span>
          <span class="profile-visitors-title">読者の軌跡</span>
        </div>
        <div id="personVisitorsMount" class="person-visitors-mount"></div>
      </div>
      ${(() => {
        // この偉人が属する年表時代を全て検索し、ジャンプボタンを生成
        const eraLinks = [];
        if (DATA.eraCategories) {
          DATA.eraCategories.forEach(cat => {
            (cat.eras || []).forEach(era => {
              if ((era.people || []).includes(p.id)) {
                eraLinks.push({ catId: cat.id, eraId: era.id, name: era.name, catName: cat.name });
              }
            });
          });
        }
        if (!eraLinks.length) return '';
        return `
          <div class="profile-era-jump">
            <span class="profile-era-jump-label">📜 この偉人が生きた時代：</span>
            ${eraLinks.map(e => `<button class="profile-era-jump-btn" data-era-jump-cat="${e.catId}" data-era-jump-era="${e.eraId}">${escapeHtml(e.name)}</button>`).join('')}
          </div>
        `;
      })()}
      <div class="profile-social">
        ${isFollowedByPerson(p.id) ? `
          <div class="profile-follow-badge">✓ ${p.name}があなたをフォローしています</div>
        ` : ''}
        ${(() => {
          const userName = getUserName();
          if (isFollowedByPerson(p.id) && userName) {
            return `
              <div class="profile-followers">
                <div class="profile-followers-label">フォロワー</div>
                <div class="profile-followers-list"><span class="profile-follower-chip">${userName}</span></div>
              </div>
            `;
          }
          return '';
        })()}
      </div>
      <div class="profile-bio">${p.summary}</div>
      ${p.lifeDigest ? `
        <details class="life-digest">
          <summary class="life-digest-summary">
            <img class="icon-img icon-img-lg" src="assets/icons/book.png" alt="">
            <span class="life-digest-label">人生ダイジェスト（もっと読む）</span>
            <span class="life-digest-arrow">▾</span>
          </summary>
          <div class="life-digest-body">${p.lifeDigest}</div>
        </details>
      ` : ''}
      ${p.imageCredit ? `
        <div class="image-credit">
          画像: ${p.imageCredit.artist || '作者不詳'} /
          <a href="${p.imageCredit.sourceUrl}" target="_blank" rel="noopener">${p.imageCredit.license || 'Public domain'}</a>
          <span class="image-credit-source">Wikimedia Commons</span>
        </div>
      ` : ''}
      <div class="profile-stats">
        <div class="profile-stat"><strong>${events.length}</strong>投稿</div>
        <div class="profile-stat"><strong>${quotesCount}</strong>名言</div>
        <div class="profile-stat"><strong>${tagsUsed.size}</strong>感情</div>
      </div>
      ${(() => {
        const BLOCK_KW = ['宿敵','敵','ライバル','対立','裏切','論敵','抗争','競争','暗殺','刺客','暗殺者','抗命','反発','確執','不仲','宗教的対立','批判者','批判'];
        const isBlk = (r) => BLOCK_KW.some(kw => ((r.relation||'')+(r.note||'')).includes(kw));
        const rels = p.relations || [];
        const fol = rels.filter(r => !isBlk(r)).length;
        const blk = rels.filter(r => isBlk(r)).length;
        const userName = getUserName();
        const userFollower = isFollowedByPerson(p.id) && userName ? 1 : 0;
        const followerCount = fol + userFollower;
        return `
          <div class="profile-x-social">
            <button class="profile-x-social-item" data-person-social="following">
              <span class="profile-x-social-num">${fol}</span>
              <span class="profile-x-social-lbl">フォロー中</span>
            </button>
            <button class="profile-x-social-item" data-person-social="followers">
              <span class="profile-x-social-num">${followerCount}</span>
              <span class="profile-x-social-lbl">フォロワー</span>
            </button>
            <button class="profile-x-social-item" data-person-social="blocked">
              <span class="profile-x-social-num">${blk}</span>
              <span class="profile-x-social-lbl">ブロック中</span>
            </button>
          </div>
        `;
      })()}
    </div>

    ${(p.routine && p.routine.length > 0) ? `
      <button class="routine-open-btn" data-routine-open="1">
        <img class="icon-img icon-img-lg" src="assets/icons/clock.png" alt="">
        <span class="routine-open-label">1日のルーティンを見る</span>
        <span class="routine-open-arrow">→</span>
      </button>
    ` : ''}

    ${p.traits ? (() => {
      // likes/dislikesを自動カテゴリ分類
      const classified = classifyTraitItems(p.traits.likes || []);
      const dislikesClassified = classifyTraitItems(p.traits.dislikes || []);
      const categoryLabels = {
        nature: { label: '🌿 自然・風景', order: 1 },
        art: { label: '🎨 芸術・文化', order: 2 },
        abstract: { label: '✨ 思想・価値観', order: 3 },
        daily: { label: '🕯 日常・暮らし', order: 4 },
        activity: { label: '🎯 活動', order: 5 },
        other: { label: '◇ その他', order: 9 },
      };
      const renderCats = (cats, negClass = '') => {
        const entries = Object.entries(cats)
          .filter(([k, v]) => v.length > 0 && k !== 'person')
          .sort(([a], [b]) => (categoryLabels[a]?.order || 9) - (categoryLabels[b]?.order || 9));
        if (entries.length === 0) return '';
        return entries.map(([k, items]) => `
          <div class="traits-cat-row">
            <div class="traits-cat-label">${categoryLabels[k]?.label || k}</div>
            <div class="traits-sec-chips">${items.map(x => `<span class="traits-chip ${negClass}">${x}</span>`).join('')}</div>
          </div>
        `).join('');
      };
      return `
      <details class="traits-card">
        <summary class="traits-summary">
          <span class="traits-icon">🫖</span>
          <span class="traits-label">好きなもの・趣味・性格</span>
          <span class="traits-arrow">▾</span>
        </summary>
        <div class="traits-body">
          ${p.traits.personality ? `
            <div class="traits-section">
              <div class="traits-sec-label">性格</div>
              <div class="traits-sec-text">${p.traits.personality}</div>
            </div>
          ` : ''}
          ${(p.traits.foods || []).length ? `
            <div class="traits-section">
              <div class="traits-sec-label">🍽 好きな食べ物・飲み物</div>
              <div class="traits-sec-chips">${p.traits.foods.map(x => `<span class="traits-chip">${x}</span>`).join('')}</div>
            </div>
          ` : ''}
          ${(p.traits.hobbies || []).length ? `
            <div class="traits-section">
              <div class="traits-sec-label">🎨 趣味・日課</div>
              <div class="traits-sec-chips">${p.traits.hobbies.map(x => `<span class="traits-chip">${x}</span>`).join('')}</div>
            </div>
          ` : ''}
          ${renderCats(classified) ? `
            <div class="traits-section">
              <div class="traits-sec-label">❤ 好きなもの</div>
              <div class="traits-cat-grid">${renderCats(classified)}</div>
            </div>
          ` : ''}
          ${renderCats(dislikesClassified, 'traits-chip-neg') ? `
            <div class="traits-section">
              <div class="traits-sec-label">✖ 苦手なもの</div>
              <div class="traits-cat-grid">${renderCats(dislikesClassified, 'traits-chip-neg')}</div>
            </div>
          ` : ''}
        </div>
      </details>
    `;
    })() : ''}

    <button class="quiz-open-btn" data-quiz-open="1">
      <span class="quiz-open-icon">❓</span>
      <span class="quiz-open-label">私のこと、どこまで知ってる？</span>
      ${getStampLevel(p.id) > 0 ? `<span class="quiz-open-level">Lv.${getStampLevel(p.id)}</span>` : ''}
      <span class="quiz-open-arrow">→</span>
    </button>

    ${(() => {
      const lv = getStampLevel(p.id);
      const bd = getStampBreakdown(p.id);
      const stamps = Array.from({length: lv}, (_, i) => `<div class="stamp-seal">★</div>`).join('');
      const nextGoal = lv < 3 ? 3 : lv < 5 ? 5 : lv < 10 ? 10 : null;
      const bdRows = Object.entries(bd)
        .filter(([,n]) => n > 0)
        .map(([k,n]) => `
          <div class="stamp-breakdown-item">
            <span class="stamp-breakdown-src">${STAMP_SOURCE_LABELS[k] || k}</span>
            <span class="stamp-breakdown-num">${n} 個</span>
          </div>
        `).join('');
      return `
        <div class="profile-stamps">
          <div class="profile-stamps-head">
            <div class="profile-stamps-title">${p.name}のスタンプ</div>
            <div class="profile-stamps-count">Lv.${lv}</div>
          </div>
          ${lv > 0 ? `<div class="profile-stamps-row">${stamps}</div>` : `<div class="profile-stamps-empty">まだスタンプがありません</div>`}
          ${bdRows ? `
            <div class="stamp-breakdown">
              <div class="stamp-breakdown-head">取得内訳</div>
              ${bdRows}
            </div>
          ` : ''}
          <div class="profile-stamps-criteria">
            <div class="stamp-criteria-head">🏷 スタンプの貯め方</div>
            <div class="stamp-criteria-item">・クイズ全問正解で +1</div>
            <div class="stamp-criteria-item">・聖地巡礼チェックインで +1（GPS確認推奨）</div>
            ${nextGoal ? `<div class="stamp-criteria-goal">あと <b>${nextGoal - lv}</b> 個で次の段階</div>` : '<div class="stamp-criteria-goal">✨ マスターレベル達成</div>'}
          </div>
        </div>
      `;
    })()}

    <button class="letter-write-btn ${isFollowedByPerson(p.id) ? 'followed' : ''}" data-letter-write="1">
      <img class="icon-img icon-img-lg" src="assets/icons/quill.png" alt="">
      <span class="letter-write-label">${isFollowedByPerson(p.id) ? `${p.name}と手紙のやりとり` : `${p.name}に手紙を書く`}</span>
      <span class="letter-write-beta">β版</span>
      <span class="letter-write-arrow">→</span>
    </button>

    <!-- ミニタブ -->
    <div class="profile-tabs-wrap">
      <div class="profile-tabs">
        <button class="profile-tab active" data-ptab="stream">タイムライン</button>
        <button class="profile-tab" data-ptab="quotes">名言</button>
        <button class="profile-tab" data-ptab="timeline">年表</button>
        ${(p.works && p.works.length > 0) ? '<button class="profile-tab" data-ptab="works">代表作</button>' : ''}
        ${(p.media && p.media.length > 0) ? '<button class="profile-tab" data-ptab="media">映画・ドラマ</button>' : ''}
        <button class="profile-tab" data-ptab="happenings">イベント</button>
        <button class="profile-tab" data-ptab="goods">グッズ</button>
        ${(p.books && p.books.length > 0) ? '<button class="profile-tab" data-ptab="books">関連本</button>' : ''}
        ${(p.places && p.places.length > 0) ? '<button class="profile-tab" data-ptab="places">聖地巡礼</button>' : ''}
        <button class="profile-tab" data-ptab="letters">手紙</button>
      </div>
    </div>

    <!-- 聖地巡礼タブ -->
    ${(p.places && p.places.length > 0) ? `
      <div class="profile-tab-content" data-ptab="places">
        <p class="places-intro">${p.name}ゆかりの地。タップで地図へ。</p>
        <div class="places-grid">
          ${p.places.map(place => {
            // 固有名詞が曖昧そうな場合（「跡」「碑」「モデル」を含む）は場所優先
            const nameOnly = place.name.replace(/[（(].*?[)）]/g, '').trim();
            const isVague = /(跡|碑|モデル|推定|候補)/.test(nameOnly);
            const primaryQuery = isVague
              ? `${place.location} ${nameOnly}`
              : `${nameOnly} ${place.location}`;
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryQuery)}`;
            const altUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.location)}`;
            const webUrl = `https://www.google.com/search?q=${encodeURIComponent(nameOnly + ' ' + place.location)}`;
            const checkedIn = isCheckedIn(p.id, place);
            const placeIdx = p.places.indexOf(place);
            return `
              <div class="place-card ${checkedIn ? 'checked' : ''}">
                <div class="place-pin">${checkedIn ? '✓' : '📍'}</div>
                <div class="place-info">
                  <div class="place-name">${place.name}${checkedIn ? ' <span class="place-visited">訪問済み</span>' : ''}</div>
                  <div class="place-location">${place.location}</div>
                  ${place.note ? `<div class="place-note">${place.note}</div>` : ''}
                  <div class="place-links">
                    <a class="place-link" href="${mapUrl}" target="_blank" rel="noopener">地図で見る</a>
                    <a class="place-link place-link-sub" href="${altUrl}" target="_blank" rel="noopener">周辺地域</a>
                    <a class="place-link place-link-sub" href="${webUrl}" target="_blank" rel="noopener">詳しく調べる</a>
                    <button class="place-checkin-btn ${checkedIn ? 'done' : ''}" data-checkin-idx="${placeIdx}">
                      ${checkedIn ? '✓ 訪問済み' : '📍 ここに行った'}
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <!-- フォロー・フォロワータブ -->
    ${(p.relations && p.relations.length > 0) ? (() => {
      // 関係を分類
      const BLOCK_KW = ['宿敵','敵', 'ライバル','対立','裏切','論敵','抗争','競争','暗殺','刺客','暗殺者','抗命','反発','確執','不仲','宗教的対立','批判者','批判'];
      const isBlock = (r) => {
        const text = (r.relation || '') + ' ' + (r.note || '');
        return BLOCK_KW.some(kw => text.includes(kw));
      };
      const following = p.relations.filter(r => !isBlock(r));
      const blocked = p.relations.filter(r => isBlock(r));
      const userName = getUserName();
      const userFollower = isFollowedByPerson(p.id) && userName;

      const renderItem = (r, variant) => {
        const linked = r.id ? DATA.people.find(x => x.id === r.id) : null;
        const avatar = linked && linked.imageUrl
          ? `<div class="relation-avatar" style="background-image:url('${linked.imageUrl}')"></div>`
          : `<div class="relation-avatar no-img">${(linked || r).name.charAt(0)}</div>`;
        return `
          <div class="relation-item ${linked ? 'linked' : ''} ${variant}" ${linked ? `data-id="${linked.id}"` : ''}>
            ${avatar}
            <div class="relation-info">
              <div class="relation-name">${(linked ? linked.name : r.name)}${linked ? ' <span class="relation-linked-badge">→</span>' : ''}</div>
              <div class="relation-role">${r.relation}${r.years ? ` · ${r.years}` : ''}</div>
              ${r.note ? `<div class="relation-note">${r.note}</div>` : ''}
            </div>
          </div>
        `;
      };

      return `
        <div class="profile-tab-content" data-ptab="relations">
          <div class="rel-tabs">
            <button class="rel-tab active" data-reltab="following">フォロー中 (${following.length})</button>
            <button class="rel-tab" data-reltab="followers">フォロワー (${following.length}${userFollower ? '+1' : ''})</button>
            ${blocked.length > 0 ? `<button class="rel-tab" data-reltab="blocked">ブロック中 (${blocked.length})</button>` : ''}
          </div>

          <div class="rel-section active" data-relsec="following">
            <div class="rel-section-head">${p.name}がフォローしている人</div>
            <div class="relations-grid">
              ${following.map(r => renderItem(r, 'following')).join('')}
            </div>
          </div>

          <div class="rel-section" data-relsec="followers">
            <div class="rel-section-head">${p.name}をフォローしている人</div>
            ${userFollower ? `
              <div class="rel-subhead">ユーザー</div>
              <div class="relations-grid">
                <div class="relation-item relation-user">
                  ${localStorage.getItem('ijin_user_avatar')
                    ? `<div class="relation-avatar" style="background-image:url('${localStorage.getItem('ijin_user_avatar')}')"></div>`
                    : `<div class="relation-avatar no-img">👤</div>`}
                  <div class="relation-info">
                    <div class="relation-name">${userName}</div>
                    <div class="relation-role">あなた · 相互フォロー</div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="rel-subhead">ユーザー</div>
              <div class="rel-empty-user">
                ${!userName ? '名前を設定してクイズに挑戦しよう' : `まだフォローされていません`}
              </div>
            `}
            <div class="rel-subhead">偉人</div>
            <div class="relations-grid">
              ${following.map(r => renderItem(r, 'following')).join('')}
            </div>
          </div>

          ${blocked.length > 0 ? `
            <div class="rel-section" data-relsec="blocked">
              <div class="rel-section-head rel-section-block">歴史的にブロック関係にある人</div>
              <div class="relations-grid">
                ${blocked.map(r => renderItem(r, 'blocked')).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    })() : ''}

    <!-- 手紙タブ：自分が送ったコメントを残す -->
    <div class="profile-tab-content" data-ptab="letters">
      ${(() => {
        // この偉人への自分のコメントを集める
        const myLetters = [];
        Object.entries(commentsData).forEach(([key, arr]) => {
          if (key.includes(`::${p.id}::`)) {
            arr.forEach(c => {
              if (c.userId === 'me' || !c.userId) myLetters.push({ key, ...c });
            });
          }
        });
        myLetters.sort((a,b) => (b.ts || 0) - (a.ts || 0));
        if (myLetters.length === 0) {
          return `<p class="letters-empty">まだこの人への手紙はありません。<br>つぶやきタブでメッセージにコメントすると、ここに残ります。</p>`;
        }
        return myLetters.map(l => {
          const d = new Date(l.ts || Date.now());
          const dateStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
          const reportKey = `letter::${l.key}::${l.ts || ''}`;
          return `
            <div class="letter-card">
              <div class="letter-date">${dateStr}</div>
              <div class="letter-text">${escapeHtml(l.text)}</div>
              <button class="letter-report-btn" data-report="${reportKey}" aria-label="通報">⚑ 通報</button>
            </div>
          `;
        }).join('');
      })()}
    </div>

    <!-- タイムラインタブ（ぜんぶ流れてくる・アクセス毎にランダム） -->
    <div class="profile-tab-content active" data-ptab="stream">
      <div class="x-feed">
        ${streamHtml}
      </div>
    </div>

    <!-- 名言タブ -->
    <div class="profile-tab-content" data-ptab="quotes">
      ${(p.quotes && p.quotes.length > 0) ? `
        <div class="quotes-section">
          ${p.quotes.map(q => `
            <blockquote class="quote">
              ${favQuoteBtn(p.id, q)}
              <div class="quote-text">${q.text}</div>
              ${q.source ? `<div class="quote-source">— ${q.source}</div>` : ''}
            </blockquote>
          `).join('')}
        </div>
      ` : '<p style="color:var(--ink-4);text-align:center;padding:20px">名言はまだありません</p>'}
    </div>

    <!-- 年表タブ -->
    <div class="profile-tab-content" data-ptab="timeline">
      <div class="timeline">
        ${events.map(e => {
          const ek = eventKey(p.id, e);
          const noteText = getNote(ek);
          return `
          <div class="event">
            ${favEventBtn(p.id, e)}
            <div class="event-year">${e.year}年 ${e.age ? `（${e.age}歳）` : ''}</div>
            <div class="event-title">${e.title}</div>
            <div class="event-detail">${e.detail}</div>
            <div class="event-tags">
              ${(e.tags || []).map(tid => {
                const t = DATA.tagMap[tid];
                if (!t) return '';
                return `<span class="event-tag" data-tag="${t.id}">${t.name}</span>`;
              }).join('')}
            </div>
            ${noteText ? `
              <div class="event-note" data-note-key="${ek}">
                <div class="event-note-text">${noteText.replace(/\n/g, '<br>')}</div>
                <button class="event-note-edit" data-note-edit="${ek}" aria-label="編集">✎</button>
              </div>
            ` : `
              <button class="event-note-add" data-note-edit="${ek}">＋ 付箋を貼る</button>
            `}
          </div>
        `;}).join('')}
      </div>
    </div>

    <!-- 代表作タブ -->
    ${(p.works && p.works.length > 0) ? `
    <div class="profile-tab-content" data-ptab="works">
      <div class="works-intro">代表作をピックアップ。タップで YouTube の検索結果が開きます。</div>
      <div class="works-list">
        ${[...p.works].sort((a, b) => (a.year || 9999) - (b.year || 9999)).map(w => {
          // 作曲家・音楽家：サムネなしのクリーンなカード
          const isMusic = /作曲家|ピアニスト|音楽|指揮者/.test(p.field || '');
          if (w.youtubeId || isMusic) {
            const searchQ = encodeURIComponent(`${p.name} ${w.title}`);
            const ytSearch = w.youtubeSearchUrl || `https://www.youtube.com/results?search_query=${searchQ}`;
            const betterImslp = buildImslpUrl(p, w);
            return `
              <div class="work-card work-music work-music-text" data-open-url="${ytSearch}">
                ${favWorkBtn(p.id, w)}
                <div class="work-info">
                  <div class="work-type">${w.type}${w.year ? ` · ${w.year}` : ''}</div>
                  <div class="work-title">${w.title}</div>
                  <div class="work-desc">${w.description || ''}</div>
                  <div class="work-links">
                    <a class="work-btn work-btn-yt" href="${ytSearch}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><span class="work-btn-icon">▶</span> YouTubeで聴く</a>
                    ${betterImslp ? `<a class="work-btn work-btn-imslp" href="${betterImslp}" target="_blank" rel="noopener" onclick="event.stopPropagation()">♫ 楽譜</a>` : ''}
                    ${isMusic ? `<a class="work-btn work-btn-musescore" href="${buildMusescoreUrl(p, w)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🎼 Musescore</a>` : ''}
                  </div>
                </div>
              </div>
            `;
          }
          if (w.imageUrl) {
            return `
              <div class="work-card work-image" data-img="${w.imageUrl}">
                ${favWorkBtn(p.id, w)}
                <div class="work-thumb" style="background-image:url('${w.imageUrl}'); background-size:cover"></div>
                <div class="work-info">
                  <div class="work-type">${w.type} · ${w.year}</div>
                  <div class="work-title">${w.title}</div>
                  <div class="work-desc">${w.description || ''}</div>
                </div>
              </div>
            `;
          }
          // 哲学・文学・科学などのyoutube解説動画検索カード（サムネなし）
          if (w.youtubeSearchUrl || /哲学|作家|小説家|科学|画家|武士|政治|軍人|戦国|幕末|維新/.test(p.field || '')) {
            const searchQ = encodeURIComponent(`${p.name} ${w.title}`);
            const ytSearch = w.youtubeSearchUrl || `https://www.youtube.com/results?search_query=${searchQ}`;
            return `
              <div class="work-card work-music work-music-text" data-open-url="${ytSearch}">
                ${favWorkBtn(p.id, w)}
                <div class="work-info">
                  <div class="work-type">${w.type}${w.year ? ` · ${w.year}` : ''}</div>
                  <div class="work-title">${w.title}</div>
                  <div class="work-desc">${w.description || ''}</div>
                  <div class="work-links">
                    <a class="work-btn work-btn-yt" href="${ytSearch}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><span class="work-btn-icon">🔎</span> 解説動画を探す</a>
                  </div>
                </div>
              </div>
            `;
          }
          // asin（本）
          const url = w.asin ? `https://www.amazon.co.jp/dp/${w.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}` : '#';
          const cover = w.asin ? `https://images-na.ssl-images-amazon.com/images/P/${w.asin}.09.LZZZZZZZ.jpg` : '';
          return `
            <a class="work-card work-book" href="${url}" target="_blank" rel="noopener">
              ${favWorkBtn(p.id, w)}
              <div class="work-thumb book-thumb" style="background-image:url('${cover}')"></div>
              <div class="work-info">
                <div class="work-type">${w.type} · ${w.year}</div>
                <div class="work-title">${w.title}</div>
                <div class="work-desc">${w.description || ''}</div>
                <div class="work-link">Amazon で見る →</div>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <!-- イベントタブ -->
    <div class="profile-tab-content" data-ptab="happenings">
      ${(() => {
        const events = (p.happenings || []).filter(h => h.type !== 'goods');
        if (events.length === 0) {
          return `
            <div class="happenings-empty">
              <div class="happenings-empty-icon">🎨</div>
              <p class="happenings-empty-title">${p.name}関連のイベント情報</p>
              <p class="happenings-empty-text">登録されているイベントはありません。<br>最新の情報は以下で探せます。</p>
              <div class="happenings-empty-links">
                <a class="happening-btn" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' 展覧会 2026')}" target="_blank" rel="noopener">🎨 展覧会を探す</a>
                <a class="happening-btn" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' イベント')}" target="_blank" rel="noopener">🎭 イベントを探す</a>
                <a class="happening-btn" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' 公演')}" target="_blank" rel="noopener">🎵 公演を探す</a>
              </div>
            </div>
          `;
        }
        return `
          <p class="happenings-intro">${p.name}の展覧会・公演・記念祭など。期間限定のものは公式サイトで要確認。</p>
          <div class="happenings-list">
            ${events.map(h => {
              const typeLabel = { exhibition: '🎨 展覧会', concert: '🎵 公演・演奏会', festival: '🎭 フェス・記念祭', book_fair: '📚 ブックフェア', other: '✨ その他' }[h.type] || '✨ イベント';
              const searchQ = encodeURIComponent(`${p.name} ${h.title}`);
              return `
                <div class="happening-card">
                  <div class="happening-type">${typeLabel}</div>
                  <div class="happening-title">${h.title}</div>
                  ${h.venue ? `<div class="happening-venue">📍 ${h.venue}</div>` : ''}
                  ${h.period ? `<div class="happening-period">📅 ${h.period}</div>` : ''}
                  ${h.description ? `<div class="happening-desc">${h.description}</div>` : ''}
                  <div class="happening-links">
                    ${h.url ? `<a class="happening-btn happening-btn-main" href="${h.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">公式サイト →</a>` : ''}
                    <a class="happening-btn" href="https://www.google.com/search?q=${searchQ}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔎 検索</a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      })()}
    </div>

    <!-- グッズタブ -->
    <div class="profile-tab-content" data-ptab="goods">
      ${(() => {
        const goods = (p.happenings || []).filter(h => h.type === 'goods');
        if (goods.length === 0) {
          return `
            <div class="happenings-empty">
              <div class="happenings-empty-icon">🛍</div>
              <p class="happenings-empty-title">${p.name}関連のグッズ</p>
              <p class="happenings-empty-text">登録されているグッズはありません。<br>Amazon・楽天で探せます。</p>
              <div class="happenings-empty-links">
                <a class="happening-btn happening-btn-main" href="https://www.amazon.co.jp/s?k=${encodeURIComponent(p.name + ' グッズ')}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}" target="_blank" rel="noopener sponsored">📦 Amazonで探す</a>
                <a class="happening-btn" href="${rakutenItemSearchUrl(p.name + ' グッズ')}" target="_blank" rel="noopener sponsored">🛒 楽天で探す</a>
              </div>
            </div>
          `;
        }
        return `
          <p class="happenings-intro">${p.name}関連の商品・グッズ。</p>
          <div class="happenings-list">
            ${goods.map(h => {
              const searchQ = encodeURIComponent(`${p.name} ${h.title}`);
              return `
                <div class="happening-card">
                  <div class="happening-type">🛍 グッズ</div>
                  <div class="happening-title">${h.title}</div>
                  ${h.venue ? `<div class="happening-venue">📍 ${h.venue}</div>` : ''}
                  ${h.description ? `<div class="happening-desc">${h.description}</div>` : ''}
                  <div class="happening-links">
                    ${h.url ? `<a class="happening-btn happening-btn-main" href="${h.url}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">📦 商品を見る</a>` : ''}
                    <a class="happening-btn" href="https://www.amazon.co.jp/s?k=${searchQ}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}" target="_blank" rel="noopener sponsored">📦 Amazon</a>
                    <a class="happening-btn" href="${rakutenItemSearchUrl(p.name + ' ' + h.title)}" target="_blank" rel="noopener sponsored">🛒 楽天</a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      })()}
    </div>

    <!-- 映画・ドラマタブ -->
    ${(p.media && p.media.length > 0) ? `
    <div class="profile-tab-content" data-ptab="media">
      <p class="media-intro">${p.name}の映画・ドラマ・アニメ。購入ページで作品をチェックできます。</p>
      <div class="media-list">
        ${p.media.map(m => {
          const typeLabel = { movie: '🎬 映画', drama: '📺 ドラマ', anime: '🎞 アニメ', doc: '📹 ドキュメンタリー' }[m.type] || '🎬 作品';
          const thumb = m.youtubeId
            ? `https://i.ytimg.com/vi/${m.youtubeId}/mqdefault.jpg`
            : (m.imageUrl || '');
          const amazonUrl = m.asin ? `https://www.amazon.co.jp/dp/${m.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}` : '';
          // Amazon商品画像（パッケージ画像）
          const amazonCoverUrl = m.asin ? `https://images-na.ssl-images-amazon.com/images/P/${m.asin}.09.LZZZZZZZ.jpg` : '';
          const stores = Array.isArray(m.stores) ? m.stores : [];
          if (amazonUrl && !stores.some(s => s.name === 'Amazon')) {
            stores.unshift({ name: 'Amazon', url: amazonUrl });
          }
          // タイトルだけで検索（『映画 DVD』などの余計な語を付けるとヒット率が下がるため）
          const searchQ = encodeURIComponent(m.title);
          const fallbackUrl = `https://www.amazon.co.jp/s?k=${searchQ}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
          return `
            <div class="media-card">
              ${amazonCoverUrl ? `
                <a class="media-cover" href="${amazonUrl || fallbackUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
                  <img src="${amazonCoverUrl}" alt="${m.title}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </a>
              ` : ''}
              <div class="media-info">
                <div class="media-type">${typeLabel}${m.year ? ` · ${m.year}` : ''}${m.country ? ` · ${m.country}` : ''}</div>
                <div class="media-title">${m.title}</div>
                ${m.cast ? `<div class="media-cast">${m.roleLabel || '主演'}: ${m.cast}</div>` : ''}
                ${m.director ? `<div class="media-cast">監督: ${m.director}</div>` : ''}
                ${m.description ? `<div class="media-desc">${m.description}</div>` : ''}
                <div class="media-links">
                  ${stores.length > 0
                    ? stores.map(s => `<a class="media-btn media-btn-${s.name === 'Amazon' ? 'amazon' : s.name === '楽天' ? 'rakuten' : 'store'}" href="${s.url}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">${s.name === 'Amazon' ? '📦' : s.name === '楽天' ? '🛒' : '🎬'} ${s.name}で見る</a>`).join('')
                    : `<a class="media-btn media-btn-amazon" href="${fallbackUrl}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">📦 Amazonで探す</a>`
                  }
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <!-- 本棚タブ -->
    ${(p.books && p.books.length > 0) ? `
    <div class="profile-tab-content" data-ptab="books">
      <p class="books-intro">${p.name}を深く知るための本。タイトル・表紙タップでAmazonへ。</p>
      ${p.books.map(b => {
        const amz = b.asin ? amazonUrl(b.asin) : `https://www.amazon.co.jp/s?k=${encodeURIComponent(b.title + ' ' + (b.author||''))}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
        const cover = b.asin ? amazonCover(b.asin) : '';
        return `
        <div class="book-card">
          <a class="book-card-cover-link" href="${amz}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">
            ${cover
              ? `<img class="book-card-cover-img" src="${cover}" alt="${b.title}" loading="lazy" onerror="this.parentElement.classList.add('no-cover');this.remove()">`
              : `<div class="book-card-cover-placeholder"><img class="icon-img icon-img-xl" src="assets/icons/book.png" alt=""></div>`}
          </a>
          <div class="book-card-info">
            <a class="book-card-title-link" href="${amz}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">${b.title}</a>
            <div class="book-card-author">${b.author || ''}</div>
            ${b.publisher ? `<div class="book-card-meta">${b.publisher}${b.year ? ` · ${b.year}年刊` : ''}${b.pages ? ` · ${b.pages}頁` : ''}</div>` : ''}
            ${b.description ? `<div class="book-card-desc">${b.description}</div>` : ''}
            <div class="book-card-actions">
              <a class="book-card-link book-card-amazon" href="${amz}" target="_blank" rel="noopener sponsored" onclick="event.stopPropagation()">📦 Amazonで見る</a>
              ${b.rakutenUrl ? `<a class="book-card-link book-card-rakuten" href="${b.rakutenUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🛒 楽天</a>` : ''}
              <a class="book-card-link book-card-sub" href="https://www.google.com/search?q=${encodeURIComponent(b.title + ' ' + (b.author||'') + ' 書評')}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔎 書評を探す</a>
            </div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
    ` : ''}
  `;
  const container = document.getElementById('personDetail');
  container.innerHTML = html;

  // まずローカルの軌跡を即座に描画（Firestoreを待たずに自分の訪問を表示）
  try {
    const myUid = (currentUser && currentUser.uid) ? currentUser.uid : getOrCreateGuestUid();
    const isAnon = !currentUser || currentUser.isAnonymous;
    const myName = getUserName() || (currentUser && currentUser.displayName) || (isAnon ? 'ゲスト' : '名無しの読者');
    const myAvatar = localStorage.getItem('ijin_user_avatar') || '';
    saveLocalVisitor('person', p.id, {
      personId: p.id, uid: myUid, name: myName, avatar: myAvatar, isGuest: isAnon,
      visitedAt: new Date().toISOString(),
    });
    renderPersonVisitors(loadLocalVisitors('person', p.id));
  } catch (e) { console.warn('local visitors render', e); }

  // グローバル訪問数＆最終訪問日を取得 → 忘却の霧判定
  (async () => {
    try {
      let lastVisitMs = 0;
      let totalCount = 0;
      if (typeof window.getGlobalVisitInfo === 'function') {
        const info = await window.getGlobalVisitInfo(p.id);
        totalCount = info.count || 0;
        lastVisitMs = info.updatedAt ? new Date(info.updatedAt).getTime() : 0;
      } else if (typeof window.getGlobalVisit === 'function') {
        totalCount = await window.getGlobalVisit(p.id);
      }
      // ローカルの訪問記録も参照（オフライン時のfallback）
      const localVisits = loadLocalVisitors('person', p.id);
      const localLast = localVisits.reduce((max, v) => Math.max(max, new Date(v.visitedAt || 0).getTime()), 0);
      lastVisitMs = Math.max(lastVisitMs, localLast);
      // 自分の今日の訪問も考慮（recordVisitしてるので直近）
      if (getVisitCount(p.id) > 0) {
        try {
          const lastDay = JSON.parse(localStorage.getItem(LAST_VISIT_KEY) || '{}')[p.id];
          if (lastDay) lastVisitMs = Math.max(lastVisitMs, new Date(lastDay).getTime());
        } catch {}
      }
      // 忘却の霧判定＆表示
      const el = document.getElementById('profileGlobalVisit');
      if (el) el.textContent = `累計 ${totalCount}回`;
      applyMistOfOblivion(p.id, lastVisitMs);
    } catch {}
    // 訪問者として自分を記録（ログインでもゲストでも必ず残す）
    try {
      const myUid = (currentUser && currentUser.uid) ? currentUser.uid : getOrCreateGuestUid();
      const isAnon = !currentUser || currentUser.isAnonymous;
      const myName = getUserName() || (currentUser && currentUser.displayName) || (isAnon ? 'ゲスト' : '名無しの読者');
      const myAvatar = localStorage.getItem('ijin_user_avatar') || '';
      const record = {
        personId: p.id,
        uid: myUid,
        name: myName,
        avatar: myAvatar,
        isGuest: isAnon,
        visitedAt: new Date().toISOString(),
      };
      // 1. ローカルストレージに必ず保存（自分の軌跡が常に見える）
      saveLocalVisitor('person', p.id, record);
      // 2. Firestoreにも（可能なら）
      if (typeof window.recordVisitorToPerson === 'function' && currentUser) {
        window.recordVisitorToPerson(p.id, { name: myName, avatar: myAvatar, isGuest: isAnon });
      }
    } catch {}
    // 軌跡（ローカル + Firestore）を取得して表示
    try {
      const localVisitors = loadLocalVisitors('person', p.id);
      let cloudVisitors = [];
      if (typeof window.fetchVisitorsToPerson === 'function') {
        cloudVisitors = await window.fetchVisitorsToPerson(p.id);
      }
      renderPersonVisitors(mergeVisitors(localVisitors, cloudVisitors));
    } catch {}
  })();

  function renderPersonVisitors(visitors) {
    const mount = document.getElementById('personVisitorsMount');
    if (!mount) return;
    // 自分は除外
    const myUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : getOrCreateGuestUid();
    // 自分も含めて全員表示（自分には「(あなた)」マーク）
    const others = (visitors || []);
    if (others.length === 0) {
      mount.innerHTML = `
        <div class="visitors-empty">
          <div class="visitors-empty-ic">👣</div>
          <div>まだ他の読者の軌跡はありません。<br>最初の訪問者があなたかもしれません。</div>
        </div>`;
      return;
    }
    mount.innerHTML = `
      <div class="visitors-hint">この偉人のページを訪れた読者たち</div>
      <div class="visitors-list">
        ${others.map(v => {
          const isSelf = v.uid === myUid;
          const isGuest = !!v.isGuest;
          const following = isFollowingUser(v.uid);
          const liked = isLikedUser(v.uid);
          const bg = v.avatar ? `style="background-image:url('${escapeHtml(v.avatar)}')"` : '';
          const initial = (v.name || '?').charAt(0);
          const dt = v.visitedAt ? new Date(v.visitedAt) : null;
          const when = dt ? `${dt.getMonth()+1}/${dt.getDate()}` : '';
          const dispName = escapeHtml(v.name || (isGuest ? 'ゲスト' : '名無しの読者'));
          const badges = [
            isSelf ? '<span class="visitor-badge-self">あなた</span>' : '',
            isGuest && !isSelf ? '<span class="visitor-badge-guest">ゲスト</span>' : ''
          ].filter(Boolean).join('');
          const actions = isSelf ? '' : `
            <div class="visitor-actions">
              <button class="visitor-btn visitor-like ${liked ? 'active' : ''}" data-user-like="${escapeHtml(v.uid)}" aria-label="いいね">
                ${liked ? '❤' : '♡'}
              </button>
              ${isGuest ? '' : `
                <button class="visitor-btn visitor-follow ${following ? 'active' : ''}" data-visitor-follow="${escapeHtml(v.uid)}">
                  ${following ? '✓' : '＋'}
                </button>
              `}
            </div>
          `;
          return `
            <div class="visitor-card ${isSelf ? 'is-self' : ''}" data-uid="${escapeHtml(v.uid)}">
              <div class="visitor-av" ${bg}>${v.avatar ? '' : initial}</div>
              <div class="visitor-info">
                <div class="visitor-name">${dispName} ${badges}</div>
                <div class="visitor-meta">👣 ${when}</div>
              </div>
              ${actions}
            </div>
          `;
        }).join('')}
      </div>
    `;
    // いいね
    mount.querySelectorAll('[data-user-like]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = btn.dataset.userLike;
        const on = toggleLikeUser(uid);
        btn.classList.toggle('active', on);
        btn.textContent = on ? '❤' : '♡';
      });
    });
    // フォロー
    mount.querySelectorAll('[data-visitor-follow]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = btn.dataset.visitorFollow;
        const on = toggleFollowUser(uid);
        btn.classList.toggle('active', on);
        btn.textContent = on ? '✓' : '＋';
      });
    });
    // カードタップでプロフィール
    mount.querySelectorAll('.visitor-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.visitor-btn')) return;
        const uid = card.dataset.uid;
        if (uid && typeof openUserProfileById === 'function') openUserProfileById(uid);
      });
    });
  }

  // Xポストのいいね・コメント・共有
  container.querySelectorAll('[data-like-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.likeToggle;
      toggleLike(key);
      const liked = isLiked(key);
      btn.classList.toggle('liked', liked);
      btn.querySelector('.x-action-count').textContent = getLikeCount(key) || '';
      btn.firstChild.nodeValue = liked ? '❤️ ' : '♡ ';
    });
  });
  container.querySelectorAll('[data-comment-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.commentToggle;
      const panel = container.querySelector(`[data-comments-panel="${CSS.escape(key)}"]`);
      if (panel) panel.classList.toggle('hidden');
    });
  });
  // コメントパネルの中身だけを書き換えるヘルパー（全体再描画しない）
  function refreshCommentsPanel(key) {
    const panel = container.querySelector(`[data-comments-panel="${CSS.escape(key)}"]`);
    if (!panel) return;
    const list = panel.querySelector('.x-comments-list');
    const comments = (commentsData || {})[key] || [];
    if (list) {
      list.innerHTML = comments.length
        ? comments.map((c, i) => `
            <div class="x-comment" data-comment-idx="${i}">
              <div class="x-comment-text">${escapeHtml(c.text)}</div>
              <div class="x-comment-meta">
                <span class="x-comment-date">${formatTs(c.ts)}</span>
                ${c.userId === 'me' || !c.userId ? `<button class="x-comment-delete" data-comment-delete="${key}|${i}">削除</button>` : ''}
              </div>
            </div>
          `).join('')
        : '<div class="x-comments-empty">まだコメントはありません</div>';
    }
    // 件数バッジも更新
    const btn = container.querySelector(`[data-comment-toggle="${CSS.escape(key)}"] .x-action-count`);
    if (btn) btn.textContent = comments.length || '';
    // 新しい削除ボタンにハンドラを再バインド
    panel.querySelectorAll('[data-comment-delete]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const [k, idxStr] = b.dataset.commentDelete.split('|');
        const idx = Number(idxStr);
        if (!confirm('このコメントを削除しますか？')) return;
        deleteComment(k, idx);
        refreshCommentsPanel(k);
      });
    });
  }

  container.querySelectorAll('[data-comment-form]').forEach(form => {
    const handle = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = form.dataset.commentForm;
      const input = form.querySelector('.x-comment-input');
      const text = (input.value || '').trim();
      if (!text) return;
      await submitComment(key, text);
      input.value = '';
      refreshCommentsPanel(key);
    };
    form.addEventListener('submit', handle);
    // Enterキーでの意図しない送信も確実にキャッチ
    const input = form.querySelector('.x-comment-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing && !e.shiftKey) {
          e.preventDefault();
          handle(e);
        }
      });
    }
  });
  container.querySelectorAll('[data-comment-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [key, idxStr] = btn.dataset.commentDelete.split('|');
      const idx = Number(idxStr);
      if (!confirm('このコメントを削除しますか？')) return;
      deleteComment(key, idx);
      refreshCommentsPanel(key);
    });
  });
  // 手紙の通報ボタン
  container.querySelectorAll('[data-report]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('この手紙を通報しますか？\n不適切な内容を運営に知らせます。')) return;
      reportItem('letter', btn.dataset.report);
    });
  });

  // ルーティンボタン → ポップアップ
  const routineBtn = container.querySelector('[data-routine-open]');
  if (routineBtn) {
    routineBtn.addEventListener('click', () => openRoutineModal(p));
  }

  // 手紙を書くボタン
  const letterBtn = container.querySelector('[data-letter-write]');
  if (letterBtn) {
    letterBtn.addEventListener('click', () => openLetterModal(p));
  }
  // クイズボタン
  const quizBtn = container.querySelector('[data-quiz-open]');
  if (quizBtn) {
    quizBtn.addEventListener('click', () => openQuizModal(p));
  }

  // ミニタブ切り替え
  container.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.ptab;
      container.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.ptab === target));
      container.querySelectorAll('.profile-tab-content').forEach(c => c.classList.toggle('active', c.dataset.ptab === target));
    });
  });

  // プロフィールタブの横スクロールヒント（←→）制御
  const tabsWrap = container.querySelector('.profile-tabs-wrap');
  const tabsInner = tabsWrap?.querySelector('.profile-tabs');
  if (tabsWrap && tabsInner) {
    const updateHint = () => {
      const maxScroll = tabsInner.scrollWidth - tabsInner.clientWidth;
      const isScrollable = maxScroll > 2;
      tabsWrap.classList.toggle('no-scroll', !isScrollable);
      tabsWrap.classList.toggle('scrolled-end', tabsInner.scrollLeft >= maxScroll - 2);
    };
    tabsInner.addEventListener('scroll', updateHint);
    window.addEventListener('resize', updateHint);
    setTimeout(updateHint, 50);
  }

  container.querySelectorAll('.event-tag').forEach(el => {
    el.addEventListener('click', () => showTag(el.dataset.tag));
  });
  bindFavButtons(container, p.id);

  // 作品カード: カード全体のクリックで data-open-url を新しいタブで開く
  container.querySelectorAll('.work-card[data-open-url]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      // ボタン・お気に入りは除外
      if (e.target.closest('.fav-btn')) return;
      if (e.target.closest('.work-btn')) return;
      if (e.target.closest('a')) return;
      window.open(el.dataset.openUrl, '_blank', 'noopener');
    });
  });
  // 映像作品カード：Amazon等の購入ボタンのみなので、カード自体にはハンドラ不要
  container.querySelectorAll('.work-image').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.dataset.img;
      const overlay = document.createElement('div');
      overlay.className = 'image-overlay';
      overlay.innerHTML = `<img src="${url}" alt=""><button class="image-overlay-close">×</button>`;
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });

  // 関連する偉人（リンク付き／全タブ対象）
  container.querySelectorAll('.relation-item[data-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.dataset.id) showPerson(el.dataset.id);
    });
  });

  // フォロー/フォロワー/ブロック タブ内切替
  container.querySelectorAll('[data-reltab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = tab.dataset.reltab;
      container.querySelectorAll('.rel-tab').forEach(t => t.classList.toggle('active', t === tab));
      container.querySelectorAll('.rel-section').forEach(s => s.classList.toggle('active', s.dataset.relsec === target));
    });
  });

  // 聖地巡礼チェックイン
  container.querySelectorAll('[data-checkin-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.checkinIdx, 10);
      const place = p.places[idx];
      if (!place) return;
      if (isCheckedIn(p.id, place)) {
        if (!confirm('この訪問記録を取り消しますか？')) return;
        toggleCheckin(p.id, place);
        showPerson(p.id); // 再描画
        return;
      }
      // GPS確認 or 手動チェックイン
      const doCheckin = (source) => {
        toggleCheckin(p.id, place);
        // スタンプ付与（source: 'checkin_gps' or 'checkin_manual'）
        grantStamp(p.id, source || 'checkin_manual');
        if (typeof playKeyUnlockSound === 'function') playKeyUnlockSound();
        alert(`✓ ${place.name} に訪問記録を追加しました。\n${p.name}のスタンプ+1を獲得！`);
        showPerson(p.id);
      };
      const useGPS = confirm('📍 位置情報を使って本当にそこに居るか確認しますか？\nOK: GPS確認あり（現地でのみスタンプ獲得）／キャンセル: 手動でチェックイン');
      if (useGPS) {
        if (!navigator.geolocation) {
          alert('この端末では位置情報が利用できません。手動チェックインを使う場合はキャンセルして再実行してください。');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // 場所のGPS座標がない場合はGPS判定できないので中止
            if (!place.lat || !place.lng) {
              if (confirm(`この場所の座標データがまだありません。\nGPS判定をせずに手動でチェックインしますか？（スタンプ獲得）`)) {
                doCheckin('checkin_manual');
              }
              return;
            }
            const R = 6371; // 地球半径km
            const dLat = (place.lat - pos.coords.latitude) * Math.PI / 180;
            const dLng = (place.lng - pos.coords.longitude) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(pos.coords.latitude * Math.PI / 180) * Math.cos(place.lat * Math.PI / 180) * Math.sin(dLng/2)**2;
            const dist = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (dist < 1.0) {
              doCheckin('checkin_gps');
            } else {
              alert(`場所から約${dist.toFixed(1)}km離れています。もう少し近づいてから試してください。\n（GPS判定モードではスタンプは付与されません）`);
            }
          },
          (err) => {
            alert('位置情報が取得できませんでした。\n設定で位置情報の使用を許可するか、キャンセル→手動チェックインを選んで再実行してください。\n（GPS判定モードではスタンプは付与されません）');
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        // 手動 — 明示確認
        if (confirm(`手動でチェックインします（実際に訪問したことを前提としてください）。\nスタンプを獲得しますか？`)) {
          doCheckin('checkin_manual');
        }
      }
    });
  });

  // フォロー切替
  const followBtn = container.querySelector('[data-follow-toggle]');
  if (followBtn) {
    followBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = followBtn.dataset.followToggle;
      const wasFollowing = isFavPerson(pid);
      toggleFavPerson(pid);
      const on = isFavPerson(pid);
      followBtn.classList.toggle('active', on);
      // コンパクトモード（＋/✓のみ）か従来表記かを判定して切替
      if (followBtn.classList.contains('follow-btn-compact')) {
        followBtn.textContent = on ? '✓' : '＋';
        followBtn.title = on ? 'フォロー中（タップで解除）' : 'フォローする';
      } else {
        followBtn.textContent = on ? '✓ フォロー中' : '＋ フォロー';
      }
      // 初フォロー時にスタンプ
      if (!wasFollowing && on) { try { grantStamp(pid, 'follow'); } catch {} }
    });
  }
  // 偉人のフォロー中／フォロワー／ブロック中 → ポップアップ
  container.querySelectorAll('[data-person-social]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPersonRelationsModal(p, btn.dataset.personSocial);
    });
  });

  // この偉人が生きた時代へジャンプ
  container.querySelectorAll('[data-era-jump-era]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.dataset.eraJumpCat;
      const eraId = btn.dataset.eraJumpEra;
      if (catId && eraId && typeof openEraModal === 'function') openEraModal(catId, eraId);
      try { grantStamp(p.id, 'era_visit'); } catch {}
    });
  });

  // Amazonで本を開いたらスタンプ
  container.querySelectorAll('.x-book-amazon, .x-book-cover').forEach(btn => {
    btn.addEventListener('click', () => { try { grantStamp(p.id, 'read_book'); } catch {} });
  });
  // YouTube等の作品リンクを踏んだらスタンプ
  container.querySelectorAll('.x-post-embed-link').forEach(btn => {
    btn.addEventListener('click', () => { try { grantStamp(p.id, 'watch_work'); } catch {} });
  });

  // 未ログイン時のフォローボタン → ログイン誘導
  const followLogin = container.querySelector('[data-follow-login]');
  if (followLogin) {
    followLogin.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof openLoginModal === 'function') openLoginModal();
    });
  }
  // 推し設定
  const oshiBtn = container.querySelector('[data-oshi-set]');
  if (oshiBtn) {
    oshiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = oshiBtn.dataset.oshiSet;
      if (getOshi() === pid) {
        setOshi('');
        oshiBtn.classList.remove('active');
        oshiBtn.textContent = '♡ 推しにする';
      } else {
        setOshi(pid);
        oshiBtn.classList.add('active');
        oshiBtn.textContent = '♡ 推し中';
        try { grantStamp(pid, 'oshi'); } catch {}
      }
      renderOshi();
    });
  }
  // 🔗 偉人ページのシェアボタン
  const shareBtn = container.querySelector('[data-person-share]');
  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pid = shareBtn.dataset.personShare;
      const person = DATA.people.find(x => x.id === pid);
      const url = `${location.origin}${location.pathname}?person=${encodeURIComponent(pid)}`;
      const title = `${person?.name || '偉人'} — 偉人と自分。`;
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          alert('リンクをコピーしました！\n' + url);
        } else {
          prompt('このURLをコピーしてください:', url);
        }
      } catch {}
    });
  }

  // 付箋の編集
  container.querySelectorAll('[data-note-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.noteEdit;
      const current = getNote(key);
      const txt = prompt('この瞬間に付箋を貼る', current);
      if (txt === null) return;
      setNote(key, txt);
      // 再描画
      showPerson(p.id);
    });
  });

  // 📋 レシピコピー（料理人偉人のみ）
  container.querySelectorAll('[data-recipe-copy]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = btn.dataset.recipeText || '';
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          const original = btn.textContent;
          btn.textContent = '✓ コピーしました';
          btn.classList.add('copied');
          setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 2000);
        } else {
          prompt('このレシピをコピーしてください:', text);
        }
      } catch {
        prompt('このレシピをコピーしてください:', text);
      }
    });
  });

  await flipPromise;
  showView('person');
}

// ====================== タグ一覧 ======================
let currentSearchFilter = 'all';
let currentSearchQuery = '';
let currentSearchEra = 'all';
let currentSearchSort = 'birth_asc';
let currentSearchCountry = 'all';
let currentSearchRoutine = 'all';

// ルーティンから特徴を抽出
function routineTraits(routine) {
  if (!routine || routine.length === 0) return null;
  let sleepTotal = 0;
  let firstWake = null;
  let lastSleepStart = null;
  routine.forEach(r => {
    if (r.cat === 'sleep') {
      const dur = r.end > r.start ? r.end - r.start : (24 - r.start) + r.end;
      sleepTotal += dur;
      if (firstWake === null || r.end < firstWake) firstWake = r.end;
      if (lastSleepStart === null || r.start > lastSleepStart) lastSleepStart = r.start;
    }
  });
  return { sleepTotal, wake: firstWake, bed: lastSleepStart };
}

function personMatchesRoutineFilter(p, filter) {
  if (filter === 'all') return true;
  const t = routineTraits(p.routine);
  if (!t) return false;
  switch (filter) {
    case 'short_sleep': return t.sleepTotal > 0 && t.sleepTotal < 6;
    case 'long_sleep': return t.sleepTotal >= 9;
    case 'early_riser': return t.wake !== null && t.wake <= 6;
    case 'night_owl': return t.bed !== null && (t.bed >= 24 || t.bed <= 3 || t.bed === 0);
    case 'has_routine': return true;
    default: return true;
  }
}

// 国名を地域に正規化（同国異表記をまとめる）／生まれた国を採用
function normalizeCountry(c) {
  if (!c) return '';
  const s = String(c);
  // スラッシュ・→・などで分割、最初（生まれの国）を採用
  const first = s.split(/→|[→／\/・,、]/)[0].trim();
  const map = {
    '日本（平安）': '日本', '日本（江戸）': '日本',
    'オーストリア＝ハンガリー（現チェコ）': 'オーストリア',
    'コルシカ・フランス': 'フランス',
    'イギリス→スイス': 'イギリス',
    'ドイツ→オランダ': 'ドイツ',
    '北マケドニア→インド': 'インド',
    'オーストリア・フランス': 'オーストリア',
    'ポーランド / フランス': 'ポーランド',
    '古代ギリシャ': 'ギリシャ',
    '古代インド': 'インド',
    '古代中国': '中国'
  };
  return map[first] || first;
}

function renderSearchSubFilters() {
  const eraBar = document.getElementById('searchEraFilter');
  const sortBar = document.getElementById('searchSortFilter');
  const countryBar = document.getElementById('searchCountryFilter');
  const routineBar = document.getElementById('searchRoutineFilter');
  if (!eraBar || !sortBar) return;

  // ルーティンフィルタ
  if (routineBar) {
    const cat = currentSearchFilter;
    const targetPeople = DATA.people.filter(p => {
      if (cat === 'all' || cat === 'emotion') return true;
      return categoryOf(p.field) === cat;
    });
    const options = [
      { id: 'all', name: '指定なし', count: targetPeople.length },
      { id: 'has_routine', name: 'ルーティンあり', count: targetPeople.filter(p => p.routine && p.routine.length > 2).length },
      { id: 'short_sleep', name: 'ショートスリーパー', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'short_sleep')).length },
      { id: 'long_sleep', name: 'ロングスリーパー', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'long_sleep')).length },
      { id: 'early_riser', name: '朝型', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'early_riser')).length },
      { id: 'night_owl', name: '夜型', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'night_owl')).length },
    ];
    routineBar.innerHTML = options.filter(o => o.id === 'all' || o.count > 0).map(o => {
      const active = currentSearchRoutine === o.id ? 'active' : '';
      return `<button class="era-chip ${active}" data-sroutine="${o.id}">${o.name}<span class="cat-count">${o.count}</span></button>`;
    }).join('');
    routineBar.querySelectorAll('[data-sroutine]').forEach(el => {
      el.addEventListener('click', () => {
        currentSearchRoutine = el.dataset.sroutine;
        renderSearchSubFilters();
        renderTags();
      });
    });
  }
  // 国フィルター（対象カテゴリの人物から出現する国を集計）
  if (countryBar) {
    const cat = currentSearchFilter;
    const targetPeople = DATA.people.filter(p => {
      if (cat === 'all' || cat === 'emotion') return true;
      return categoryOf(p.field) === cat;
    });
    const countryCount = {};
    targetPeople.forEach(p => {
      const c = normalizeCountry(p.country);
      if (c) countryCount[c] = (countryCount[c] || 0) + 1;
    });
    // 件数順にソート（件数多い順、同数は名前順）
    const countries = Object.keys(countryCount).sort((a, b) => countryCount[b] - countryCount[a] || a.localeCompare(b, 'ja'));
    const chips = [`<button class="era-chip ${currentSearchCountry==='all'?'active':''}" data-scountry="all">全ての国<span class="cat-count">${targetPeople.length}</span></button>`]
      .concat(countries.map(c => {
        const active = currentSearchCountry === c ? 'active' : '';
        return `<button class="era-chip ${active}" data-scountry="${c}">${c}<span class="cat-count">${countryCount[c]}</span></button>`;
      }));
    countryBar.innerHTML = chips.join('');
    countryBar.querySelectorAll('[data-scountry]').forEach(el => {
      el.addEventListener('click', () => {
        currentSearchCountry = el.dataset.scountry;
        renderSearchSubFilters();
        renderTags();
      });
    });
  }
  const cat = currentSearchFilter;
  const rules = ERA_RULES[cat];
  if (!rules || cat === 'emotion') {
    eraBar.innerHTML = '';
  } else {
    const people = DATA.people.filter(p => categoryOf(p.field) === cat);
    const counts = {};
    people.forEach(p => {
      const e = eraOf(cat, p.birth);
      if (e) counts[e] = (counts[e] || 0) + 1;
    });
    const chips = [`<button class="era-chip ${currentSearchEra==='all'?'active':''}" data-sera="all">全時代<span class="cat-count">${people.length}</span></button>`]
      .concat(rules.filter(r => counts[r.id]).map(r => {
        const active = currentSearchEra === r.id ? 'active' : '';
        return `<button class="era-chip ${active}" data-sera="${r.id}">${r.name}<span class="cat-count">${counts[r.id]}</span></button>`;
      }));
    eraBar.innerHTML = chips.join('');
    eraBar.querySelectorAll('.era-chip').forEach(el => {
      el.addEventListener('click', () => {
        currentSearchEra = el.dataset.sera;
        renderSearchSubFilters();
        renderTags();
      });
    });
  }
  // 並び替え（感情単独以外で表示）
  if (cat === 'emotion') {
    sortBar.innerHTML = '';
  } else {
    const opts = [
      { id: 'birth_asc',  name: '年代順（古い順）' },
      { id: 'birth_desc', name: '年代順（新しい順）' },
      { id: 'name',       name: '名前順' },
    ];
    sortBar.innerHTML = opts.map(o =>
      `<button class="sort-chip ${currentSearchSort===o.id?'active':''}" data-ssort="${o.id}">${o.name}</button>`
    ).join('');
    sortBar.querySelectorAll('.sort-chip').forEach(el => {
      el.addEventListener('click', () => {
        currentSearchSort = el.dataset.ssort;
        renderSearchSubFilters();
        renderTags();
      });
    });
  }
}

const TAG_BG_MAP = {
  'spine-wine': 'linear-gradient(135deg, var(--wine) 0%, var(--wine-dark) 100%)',
  'spine-green': 'linear-gradient(135deg, #3d4e3e 0%, #2a3a2b 100%)',
  'spine-navy': 'linear-gradient(135deg, #253245 0%, #141d2e 100%)',
  'spine-brown': 'linear-gradient(135deg, #4a2f1a 0%, #2e1c0d 100%)',
  'spine-ink': 'linear-gradient(135deg, #1a130c 0%, #0d0905 100%)',
  'spine-ochre': 'linear-gradient(135deg, #6b5020 0%, #483318 100%)',
};

function renderTags() {
  const list = document.getElementById('tagsList');
  const q = (currentSearchQuery || '').trim().toLowerCase();
  const f = currentSearchFilter;

  // 感情件数の集計
  const counts = {};
  DATA.people.forEach(p => {
    (p.events || []).forEach(e => {
      (e.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
  });

  // 感情タグのフィルタ
  let tagItems = [];
  if (f === 'all' || f === 'emotion') {
    tagItems = DATA.tags
      .map(t => ({ ...t, count: counts[t.id] || 0 }))
      .filter(t => {
        if (!q) return true;
        return t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.count - a.count);
  }

  // 人物のフィルタ
  let personItems = [];
  if (f !== 'emotion') {
    personItems = DATA.people.filter(p => {
      // カテゴリ絞り込み
      if (f !== 'all') {
        if (categoryOf(p.field) !== f) return false;
      }
      if (!q) return true;
      // 名前と趣味・好きなもの（食べ物・趣味・好きなもの・嫌いなもの）でのみヒット
      const nameBlob = (p.name + ' ' + (p.nameEn || '')).toLowerCase();
      const traits = p.traits || {};
      const traitsBlob = []
        .concat(traits.hobbies || [], traits.foods || [], traits.likes || [], traits.dislikes || [])
        .join(' ')
        .toLowerCase();
      return nameBlob.includes(q) || traitsBlob.includes(q);
    });
    // 時代絞り込み
    if (currentSearchEra !== 'all' && ERA_RULES[f]) {
      personItems = personItems.filter(p => eraOf(f, p.birth) === currentSearchEra);
    }
    // 国絞り込み
    if (currentSearchCountry !== 'all') {
      personItems = personItems.filter(p => normalizeCountry(p.country) === currentSearchCountry);
    }
    // ルーティン絞り込み
    if (currentSearchRoutine !== 'all') {
      personItems = personItems.filter(p => personMatchesRoutineFilter(p, currentSearchRoutine));
    }
    // 並び替え
    personItems.sort((a, b) => {
      if (currentSearchSort === 'name') return (a.name || '').localeCompare(b.name || '', 'ja');
      const ay = a.birth == null ? 9999 : a.birth;
      const by = b.birth == null ? 9999 : b.birth;
      return currentSearchSort === 'birth_desc' ? by - ay : ay - by;
    });
  }

  if (tagItems.length === 0 && personItems.length === 0) {
    list.innerHTML = '<div class="empty">該当する結果がありません</div>';
    return;
  }

  let html = '';

  // 感情セクション（一時非表示）
  if (false && tagItems.length > 0) {
    html += `<div class="search-section-label">感情の本棚</div>
    <p class="search-section-desc">悲しみ、逃避、燃え尽き…。あなたが今感じている感情を選ぶと、その感情を乗り越えた偉人たちに出会えます。本の帯（背表紙）の数字は、その感情を経験した人数です。</p>`;
    html += `<div class="book-grid">${tagItems.map(t => {
      const color = spineColor('t_' + t.id);
      const bg = TAG_BG_MAP[color] || TAG_BG_MAP['spine-wine'];
      return `
        <a class="article-card tag-book-card" data-tag="${t.id}" style="background:${bg}">
          <div class="article-author-name tag-book-count">${t.count} の軌跡</div>
          <div class="tag-book-center">
            <div class="cover-tag-ornament">◆</div>
            <div class="tag-book-name">${t.name}</div>
            <div class="cover-tag-ornament">◆</div>
          </div>
          <div class="article-card-inner tag-book-inner">
            <div class="tag-book-desc">${t.description}</div>
          </div>
        </a>
      `;
    }).join('')}</div>`;
  }

  // 人物セクション
  if (personItems.length > 0) {
    const labelMap = {
      all: '偉人の本棚',
      music: '音楽家の本棚',
      philo: '哲学者の本棚',
      literature: '文学者の本棚',
      art: '画家の本棚',
      history: '歴史人物の本棚',
      science: '科学者の本棚',
    };
    html += `<div class="search-section-label">${labelMap[f] || '偉人の本棚'}</div>`;
    html += `<div class="book-grid">${personItems.map(p => {
      const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
      return `
        <div class="person-book ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
          <button class="person-book-follow ${isFavPerson(p.id) ? 'active' : ''}" data-fav-toggle="${p.id}" aria-label="${isFavPerson(p.id) ? 'フォロー中' : 'フォロー'}">${isFavPerson(p.id) ? '✓ フォロー中' : '＋ フォロー'}</button>
          <div class="person-book-overlay"></div>
          ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
          <div class="person-book-info">
            ${p.nameEn ? `<div class="person-book-en">${p.nameEn}</div>` : ''}
            <div class="person-book-name">${p.name}</div>
            <div class="person-book-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field}</div>
          </div>
        </div>
      `;
    }).join('')}</div>`;
  }

  list.innerHTML = html;

  list.querySelectorAll('[data-tag]').forEach(el => {
    el.addEventListener('click', () => showTag(el.dataset.tag));
  });
  list.querySelectorAll('.person-book').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-fav-toggle]')) return;
      showPerson(el.dataset.id);
    });
  });
  bindBookmarkToggle(list);
}

// 表紙のブックマークボタン（すべての person-book に共通）
function bindBookmarkToggle(container) {
  container.querySelectorAll('[data-fav-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const id = btn.dataset.favToggle;
      toggleFavPerson(id);
      const on = isFavPerson(id);
      btn.classList.toggle('active', on);
      // フォローボタン形式のみラベル切替（旧リボン型にはテキストなし）
      if (btn.classList.contains('person-book-follow')) {
        btn.textContent = on ? '✓ フォロー中' : '＋ フォロー';
        btn.setAttribute('aria-label', on ? 'フォロー中' : 'フォロー');
      }
    });
  });
}

function bindSearchPanel() {
  const input = document.getElementById('searchBox');
  const filters = document.querySelectorAll('.search-filter');
  if (!input) return;
  input.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderTags();
  });
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      currentSearchFilter = btn.dataset.filter;
      currentSearchEra = 'all';
      currentSearchCountry = 'all';
      currentSearchRoutine = 'all';
      filters.forEach(b => b.classList.toggle('active', b === btn));
      renderSearchSubFilters();
      renderTags();
    });
  });
  // 詳細検索トグル
  const toggle = document.getElementById('advSearchToggle');
  const panel = document.getElementById('advSearchPanel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const open = !panel.classList.contains('hidden');
      if (open) {
        panel.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('open');
      } else {
        panel.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.classList.add('open');
      }
    });
  }
  renderSearchSubFilters();
}

// ====================== タグ詳細 ======================
async function showTag(tagId) {
  const tag = DATA.tagMap[tagId];
  if (!tag) return;
  playBookOpenFx();
  const FAV_TAGS_KEY = 'ijin_fav_tags';
  const favTags = loadSet(FAV_TAGS_KEY);
  const flipPromise = playBookFlip({
    title: tag.name,
    subtitle: '感情の書'
  });
  // 感情詳細内の絞り込み状態（セッション内）
  window.__tagFilter = window.__tagFilter || { cat: 'all', era: 'all', country: 'all', sort: 'birth_asc' };
  const f = window.__tagFilter;

  // 人物ごとに出来事をまとめる
  const byPerson = new Map();
  DATA.people.forEach(p => {
    const events = (p.events || []).filter(e => (e.tags || []).includes(tagId));
    if (events.length > 0) {
      byPerson.set(p.id, {
        person: p,
        events: events.sort((a, b) => a.year - b.year),
      });
    }
  });
  let matches = [...byPerson.values()];
  // カテゴリ
  if (f.cat !== 'all') {
    matches = matches.filter(m => categoryOf(m.person.field) === f.cat);
  }
  // 時代
  if (f.era !== 'all' && ERA_RULES[f.cat]) {
    matches = matches.filter(m => eraOf(f.cat, m.person.birth) === f.era);
  }
  // 国
  if (f.country !== 'all') {
    matches = matches.filter(m => normalizeCountry(m.person.country) === f.country);
  }
  // 並び替え
  matches.sort((a, b) => {
    if (f.sort === 'name') return (a.person.name || '').localeCompare(b.person.name || '', 'ja');
    const ay = a.person.birth == null ? 9999 : a.person.birth;
    const by = b.person.birth == null ? 9999 : b.person.birth;
    return f.sort === 'birth_desc' ? by - ay : ay - by;
  });

  // カテゴリ件数・国件数の集計
  const allMatches = [...byPerson.values()];
  const catCounts = { all: allMatches.length };
  allMatches.forEach(m => {
    const c = categoryOf(m.person.field);
    catCounts[c] = (catCounts[c] || 0) + 1;
  });
  const filteredByCat = f.cat === 'all' ? allMatches : allMatches.filter(m => categoryOf(m.person.field) === f.cat);
  const countryCounts = {};
  filteredByCat.forEach(m => {
    const c = normalizeCountry(m.person.country);
    if (c) countryCounts[c] = (countryCounts[c] || 0) + 1;
  });
  const eraRules = ERA_RULES[f.cat] || null;
  const eraCounts = {};
  if (eraRules) {
    filteredByCat.forEach(m => {
      const e = eraOf(f.cat, m.person.birth);
      if (e) eraCounts[e] = (eraCounts[e] || 0) + 1;
    });
  }
  // 感情タグ詳細 = 本の中身風
  const html = `
    <div class="tag-book-page">
      <div class="tag-book-chapter">
        <div class="tag-book-chapter-label">CHAPTER ／ 感情の書</div>
        <h2 class="tag-book-chapter-title">${tag.name}</h2>
        <div class="tag-book-chapter-line"></div>
        <p class="tag-book-chapter-desc">${tag.description}</p>
        <button class="fav-tag-btn ${favTags.has(tagId) ? 'active' : ''}" data-fav-tag="${tagId}">
          ${favTags.has(tagId) ? '★ 棚に飾り中' : '☆ この感情を棚に飾る'}
        </button>
      </div>

      <div class="tag-book-section-title">
        <span>この感情を経験した人々 <span class="tag-match-count">(${matches.length}人${f.cat === 'all' && f.era === 'all' && f.country === 'all' ? '' : ` / ${allMatches.length}人中`})</span></span>
      </div>

      <!-- 詳細検索 -->
      <button id="tagAdvSearchToggle" class="adv-search-toggle ${f.cat !== 'all' || f.era !== 'all' || f.country !== 'all' ? 'open' : ''}">
        <span class="adv-search-label">🔎 詳細検索（カテゴリ・時代・国・並び替え）${f.cat !== 'all' || f.era !== 'all' || f.country !== 'all' ? '（絞り込み中）' : ''}</span>
        <span class="adv-search-arrow">▾</span>
      </button>
      <div id="tagAdvSearchPanel" class="adv-search-panel ${f.cat !== 'all' || f.era !== 'all' || f.country !== 'all' ? '' : 'hidden'}">
        <div class="adv-search-row">
          <div class="adv-search-row-label">カテゴリ</div>
          <div class="era-filter" id="tagCatFilter">
            ${['all', ...CATEGORY_RULES.map(r => r.id)].filter(id => id === 'all' || catCounts[id]).map(id => {
              const name = id === 'all' ? 'すべて' : CAT_NAME[id];
              const active = f.cat === id ? 'active' : '';
              return `<button class="era-chip ${active}" data-tcat="${id}">${name}<span class="cat-count">${catCounts[id] || 0}</span></button>`;
            }).join('')}
          </div>
        </div>
        ${eraRules ? `
          <div class="adv-search-row">
            <div class="adv-search-row-label">時代</div>
            <div class="era-filter" id="tagEraFilter">
              <button class="era-chip ${f.era === 'all' ? 'active' : ''}" data-tera="all">全時代<span class="cat-count">${filteredByCat.length}</span></button>
              ${eraRules.filter(r => eraCounts[r.id]).map(r => `<button class="era-chip ${f.era === r.id ? 'active' : ''}" data-tera="${r.id}">${r.name}<span class="cat-count">${eraCounts[r.id]}</span></button>`).join('')}
            </div>
          </div>
        ` : ''}
        <div class="adv-search-row">
          <div class="adv-search-row-label">国・地域</div>
          <div class="era-filter" id="tagCountryFilter">
            <button class="era-chip ${f.country === 'all' ? 'active' : ''}" data-tcountry="all">全ての国<span class="cat-count">${filteredByCat.length}</span></button>
            ${Object.keys(countryCounts).sort((a,b) => countryCounts[b] - countryCounts[a] || a.localeCompare(b,'ja')).map(c => `<button class="era-chip ${f.country === c ? 'active' : ''}" data-tcountry="${c}">${c}<span class="cat-count">${countryCounts[c]}</span></button>`).join('')}
          </div>
        </div>
        <div class="adv-search-row">
          <div class="adv-search-row-label">並び替え</div>
          <div class="sort-filter" id="tagSortFilter">
            ${[
              {id:'birth_asc', name:'年代順（古い順）'},
              {id:'birth_desc', name:'年代順（新しい順）'},
              {id:'name', name:'名前順'}
            ].map(o => `<button class="sort-chip ${f.sort===o.id?'active':''}" data-tsort="${o.id}">${o.name}</button>`).join('')}
          </div>
        </div>
      </div>

      ${matches.length === 0
        ? '<div class="empty">まだ登録されていません</div>'
        : `<div class="tag-people-grid">${matches.map(m => {
            const avatar = m.person.imageUrl
              ? `<div class="tpg-avatar" style="background-image:url('${m.person.imageUrl}')"></div>`
              : `<div class="tpg-avatar">${m.person.name.charAt(0)}</div>`;
            const eventsHtml = m.events.map(e => `
              <div class="tpg-event" data-id="${m.person.id}" data-event-key="${eventKey(m.person.id, e)}">
                <div class="tpg-year">${e.year}${e.age ? ` · ${e.age}歳` : ''}</div>
                <div class="tpg-event-title">${e.title}</div>
              </div>
            `).join('');
            return `
              <div class="tpg-item">
                <div class="tpg-person-header" data-id="${m.person.id}">
                  ${avatar}
                  <div class="tpg-name">${m.person.name}</div>
                </div>
                <div class="tpg-events">
                  ${eventsHtml}
                </div>
              </div>
            `;
          }).join('')}</div>`
      }
    </div>
  `;
  const container = document.getElementById('tagDetail');
  container.innerHTML = html;
  // 出来事カードタップ → 該当イベントへ
  container.querySelectorAll('.tpg-event').forEach(el => {
    el.addEventListener('click', () => {
      const pid = el.dataset.id;
      const ekey = el.dataset.eventKey;
      showPerson(pid).then(() => {
        setTimeout(() => {
          const personView = document.getElementById('view-person');
          personView.querySelectorAll('.profile-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.ptab === 'timeline');
          });
          personView.querySelectorAll('.profile-tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.ptab === 'timeline');
          });
          setTimeout(() => {
            const events = personView.querySelectorAll('.event');
            for (const ev of events) {
              const favBtn = ev.querySelector('[data-fav-event]');
              if (favBtn && favBtn.dataset.favEvent === ekey) {
                ev.scrollIntoView({ behavior: 'smooth', block: 'center' });
                ev.classList.add('highlight-flash');
                setTimeout(() => ev.classList.remove('highlight-flash'), 2500);
                break;
              }
            }
          }, 100);
        }, 300);
      });
    });
  });
  // 人物ヘッダータップ → 人物詳細
  container.querySelectorAll('.tpg-person-header').forEach(el => {
    el.addEventListener('click', () => showPerson(el.dataset.id));
  });
  // 詳細検索トグル
  const advToggle = container.querySelector('#tagAdvSearchToggle');
  const advPanel = container.querySelector('#tagAdvSearchPanel');
  if (advToggle && advPanel) {
    advToggle.addEventListener('click', () => {
      advPanel.classList.toggle('hidden');
      advToggle.classList.toggle('open');
    });
  }
  // カテゴリ・時代・国・並びチップ
  container.querySelectorAll('[data-tcat]').forEach(el => {
    el.addEventListener('click', () => {
      window.__tagFilter.cat = el.dataset.tcat;
      window.__tagFilter.era = 'all';  // カテゴリ変えたら時代リセット
      window.__tagFilter.country = 'all';
      showTag(tagId);
    });
  });
  container.querySelectorAll('[data-tera]').forEach(el => {
    el.addEventListener('click', () => {
      window.__tagFilter.era = el.dataset.tera;
      showTag(tagId);
    });
  });
  container.querySelectorAll('[data-tcountry]').forEach(el => {
    el.addEventListener('click', () => {
      window.__tagFilter.country = el.dataset.tcountry;
      showTag(tagId);
    });
  });
  container.querySelectorAll('[data-tsort]').forEach(el => {
    el.addEventListener('click', () => {
      window.__tagFilter.sort = el.dataset.tsort;
      showTag(tagId);
    });
  });
  bindFavButtons(container);
  // 「棚に飾る」ボタン
  const favTagBtn = container.querySelector('.fav-tag-btn');
  if (favTagBtn) {
    favTagBtn.addEventListener('click', () => {
      const FAV_TAGS_KEY = 'ijin_fav_tags';
      const favTags = loadSet(FAV_TAGS_KEY);
      if (favTags.has(tagId)) favTags.delete(tagId); else favTags.add(tagId);
      saveSet(FAV_TAGS_KEY, favTags);
      favTagBtn.classList.toggle('active');
      favTagBtn.textContent = favTags.has(tagId) ? '★ 棚に飾り中' : '☆ この感情を棚に飾る';
    });
  }
  await flipPromise;
  showView('tag');
}

// ====================== ルーティン ======================

// デフォルトカテゴリ（色は落ち着いたトーンで統一）
const DEFAULT_ROUTINE_CATS = {
  sleep:    { label: '睡眠',      color: '#3d3a52' },
  work:     { label: '仕事・創作', color: '#7a2e3a' },
  meal:     { label: '食事',      color: '#b8952e' },
  exercise: { label: '運動',      color: '#5e7254' },
  social:   { label: '交流',      color: '#8a6a8a' },
  rest:     { label: '休息',      color: '#8b7a6a' },
};
const CUSTOM_CATS_KEY = 'ijin_custom_routine_cats';
function loadCustomCats() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) || '{}'); } catch { return {}; }
}
function saveCustomCats(obj) { localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(obj)); }
function allRoutineCats() {
  return { ...DEFAULT_ROUTINE_CATS, ...loadCustomCats() };
}
function addCustomCat(key, label, color) {
  if (!key || !label) return false;
  const cats = loadCustomCats();
  cats[key] = { label, color: color || '#8b7a6a', custom: true };
  saveCustomCats(cats);
  return true;
}
function removeCustomCat(key) {
  const cats = loadCustomCats();
  if (cats[key]) {
    delete cats[key];
    saveCustomCats(cats);
    return true;
  }
  return false;
}
// ROUTINE_CATS は allRoutineCats() を使ってください

// body全体でルーティンカードのタップを拾う（確実に動作させるため）
if (typeof window !== 'undefined' && !window.__routinePeekBound) {
  window.__routinePeekBound = true;
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.routine-card[data-peek-id]');
    if (!card) return;
    if (e.target.closest('.fav-btn')) return;
    if (e.target.closest('.routine-copy-btn')) return;
    if (e.target.closest('[data-goto-person]')) return;
    const pid = card.dataset.peekId;
    const p = (typeof DATA !== 'undefined') && DATA.people.find(x => x.id === pid);
    if (p) openRoutineModal(p);
  });
}

// ====================== 親密度テスト（偉人クイズ） ======================
const STAMPS_KEY = 'ijin_stamps';
const TITLE_KEY = 'ijin_current_title';

function loadStamps() {
  try { return JSON.parse(localStorage.getItem(STAMPS_KEY) || '{}'); }
  catch { return {}; }
}
function saveStamps(obj) {
  localStorage.setItem(STAMPS_KEY, JSON.stringify(obj));
}
// 内訳を取得：{ quiz: N, checkin_gps: N, checkin_manual: N, ... } の形へ正規化
function getStampBreakdown(personId) {
  const raw = loadStamps()[personId];
  if (raw === undefined || raw === null) return {};
  // 旧フォーマット（数値）は quiz として扱う
  if (typeof raw === 'number') return { quiz: raw };
  if (typeof raw === 'object') return { ...raw };
  return {};
}
function grantStamp(personId, source = 'quiz') {
  const stamps = loadStamps();
  const cur = stamps[personId];
  let bd;
  if (typeof cur === 'number') bd = { quiz: cur };
  else if (cur && typeof cur === 'object') bd = { ...cur };
  else bd = {};
  const before = (bd[source] || 0);
  bd[source] = before + 1;
  stamps[personId] = bd;
  saveStamps(stamps);
  // 初回獲得時のみトースト表示
  if (before === 0) {
    try { showStampToast(personId, source); } catch (e) { console.warn(e); }
  }
  try { checkFollowBackEligibility(personId); } catch {}
  // 階位アップチェック
  try { checkTitleLevelUp(); } catch {}
}

// スタンプ獲得のトースト（初回のみ）
function showStampToast(personId, source) {
  const p = (DATA.people || []).find(x => x.id === personId);
  if (!p) return;
  const msg = (STAMP_MILESTONE_MSGS[source] || '新しいスタンプを獲得しました').replace('{name}', p.name);
  const label = STAMP_SOURCE_LABELS[source] || source;
  const toast = document.createElement('div');
  toast.className = 'stamp-toast';
  const av = p.imageUrl
    ? `<div class="stamp-toast-av" style="background-image:url('${p.imageUrl}')"></div>`
    : `<div class="stamp-toast-av no-img">${p.name.charAt(0)}</div>`;
  toast.innerHTML = `
    ${av}
    <div class="stamp-toast-body">
      <div class="stamp-toast-head">
        <span class="stamp-toast-seal">★</span>
        <span class="stamp-toast-kind">${label}</span>
      </div>
      <div class="stamp-toast-msg">${escapeHtml(msg)}</div>
    </div>
    <button class="stamp-toast-close" aria-label="閉じる">×</button>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  const dismiss = () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); };
  toast.querySelector('.stamp-toast-close')?.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
  toast.addEventListener('click', dismiss);
  setTimeout(dismiss, 4500);
}

// チャット風のフォロー通知トースト
const SHOWN_TOAST_KEY = 'ijin_shown_follow_toasts';
function hasShownToast(id) {
  try { return (JSON.parse(localStorage.getItem(SHOWN_TOAST_KEY) || '[]')).includes(id); }
  catch { return false; }
}
function markShownToast(id) {
  try {
    const arr = JSON.parse(localStorage.getItem(SHOWN_TOAST_KEY) || '[]');
    if (!arr.includes(id)) { arr.push(id); localStorage.setItem(SHOWN_TOAST_KEY, JSON.stringify(arr)); }
  } catch {}
}
function showFollowToast(person) {
  if (!person || !person.id) return;
  // 誕生日トースト（id先頭 🎂）は日毎判定済なのでスキップ、それ以外は1回限定
  const isBirthday = /^🎂/.test(person.name || '');
  if (!isBirthday && hasShownToast(person.id)) return;
  if (!isBirthday) markShownToast(person.id);
  // アプリ外でもタブ非アクティブ時はブラウザ通知
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`${person.name} があなたをフォローしました`, {
        body: '『偉人と自分。』であなたのことをもっと知りたがっています。',
        icon: person.imageUrl || '/app/assets/icon-192.png',
        tag: `follow-${person.id}`,
      });
    } catch {}
  }
  // 許可未設定なら静かにリクエスト
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch {}
  }
  // アプリ内トースト（常に表示）
  const toast = document.createElement('div');
  toast.className = 'follow-toast';
  const avatar = person.imageUrl
    ? `<div class="follow-toast-avatar" style="background-image:url('${person.imageUrl}')"></div>`
    : `<div class="follow-toast-avatar no-img">${person.name.charAt(0)}</div>`;
  toast.innerHTML = `
    ${avatar}
    <div class="follow-toast-body">
      <div class="follow-toast-title">${person.name}</div>
      <div class="follow-toast-msg">あなたをフォローしました</div>
    </div>
    <button class="follow-toast-close" aria-label="閉じる">×</button>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  toast.addEventListener('click', (e) => {
    if (e.target.closest('.follow-toast-close')) {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    } else {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        showPerson(person.id);
      }, 300);
    }
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}
function getStampLevel(personId) {
  const bd = getStampBreakdown(personId);
  return Object.values(bd).reduce((a, b) => a + (b || 0), 0);
}
function totalStamps() {
  const all = loadStamps();
  let total = 0;
  Object.values(all).forEach(v => {
    if (typeof v === 'number') total += v;
    else if (v && typeof v === 'object') total += Object.values(v).reduce((a,b) => a + (b||0), 0);
  });
  return total;
}
const STAMP_SOURCE_LABELS = {
  quiz: '📝 親密度クイズ',
  checkin_gps: '📍 聖地巡礼（GPS確認）',
  checkin_manual: '📍 聖地巡礼（手動）',
  follow: '✉ 本棚に並べた',
  oshi: '♡ 推しの座に',
  pin_quote: '💎 言葉を胸に刻んだ',
  read_book: '📚 本を手に取った',
  watch_work: '▶ 作品に触れた',
  comment: '💬 対話した',
  like: '♥ 心を動かされた',
  era_visit: '📜 時代を旅した',
  visit_loyal: '👣 10回訪れた',
};

// スタンプ獲得時のメッセージ（{name}で偉人名に置換）
const STAMP_MILESTONE_MSGS = {
  quiz: '{name}の人生について、深く知ろうとした証。',
  checkin_gps: '{name}の足跡を、実際にその地で辿った。',
  checkin_manual: '{name}ゆかりの地を訪れた記念。',
  follow: '{name}を、あなたの本棚に迎え入れた。',
  oshi: '{name}を推しの座に据えた。心に灯る一つ星。',
  pin_quote: '{name}の言葉を、胸に刻んだ。',
  read_book: '{name}の遺した本を手に取った。知の扉が開く。',
  watch_work: '{name}の作品に、今この瞬間触れた。',
  comment: '{name}の投稿に返事を残した。時を超えた対話。',
  like: '{name}の言葉や出来事に心が動いた証。',
  era_visit: '{name}が生きた時代を訪ねた。歴史の地図が一つ広がる。',
  visit_loyal: '{name}のページを10回以上訪れた。深い縁の証。',
};

// 称号（総スタンプ数に応じた段階）
// 偉人書庫塔の階位システム（物語連動）
const TITLES = [
  { min: 0,   name: '',         label: '' },
  { min: 1,   name: '巡礼者',   label: '巡礼者', story: '塔の入口をくぐり、最初の一歩を踏み出した者。' },
  { min: 5,   name: '読み手',   label: '読み手', story: '偉人の本を開き、その言葉に触れ始めた者。' },
  { min: 15,  name: '灯す者',   label: '灯す者', story: '忘れられかけた魂に、光を差した者。' },
  { min: 30,  name: '継承者',   label: '継承者', story: '偉人の軌跡を、自らの生に重ねはじめた者。' },
  { min: 60,  name: '書き手',   label: '書き手', story: '自身の一章を、塔の書棚に綴じ始めた者。' },
  { min: 120, name: '始まりの書き手', label: '始まりの書き手', story: '塔を創りし者の魂に、再び触れた者。（隠し階位）' },
];
// 階位変化をチェック — 昇進したらレキットが告げる
const LAST_TITLE_LEVEL_KEY = 'ijin_last_title_level';
function checkTitleLevelUp() {
  const total = totalStamps();
  const reached = TITLES.filter(t => t.min <= total && t.name);
  const currentIdx = reached.length - 1;
  let lastIdx = -1;
  try { lastIdx = parseInt(localStorage.getItem(LAST_TITLE_LEVEL_KEY) || '-1', 10); } catch {}
  if (currentIdx > lastIdx && currentIdx >= 0) {
    localStorage.setItem(LAST_TITLE_LEVEL_KEY, String(currentIdx));
    const title = reached[currentIdx];
    // レキットから報告
    try {
      if (typeof pushRekittoMsg === 'function' && title) {
        pushRekittoMsg({
          text: `塔の階が上がりました。\n\nあなたは今、『${title.label}』の階位に到達しました。\n\n— ${title.story}`,
          kind: 'title_up',
          linkLabel: '称号を選ぶ',
        });
      }
    } catch {}
  }
}

function availableTitles() {
  const total = totalStamps();
  return TITLES.filter(t => t.min <= total);
}
function currentTitle() {
  return localStorage.getItem(TITLE_KEY) || '';
}
function setCurrentTitle(name) {
  if (name) localStorage.setItem(TITLE_KEY, name);
  else localStorage.removeItem(TITLE_KEY);
}

// クイズを動的生成（既存データ＋ダミー選択肢）
function shuffleArr(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuizzes(person) {
  const quizzes = [];
  const others = DATA.people.filter(x => x.id !== person.id);

  // Q1: 職業
  if (person.field) {
    const distractors = shuffleArr(others.map(o => o.field).filter(f => f && f !== person.field))
      .filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    if (distractors.length >= 3) {
      quizzes.push({
        id: `field:${person.id}`,
        q: `${person.name}の職業・分野は？`,
        options: shuffleArr([person.field, ...distractors]),
        answer: person.field,
      });
    }
  }
  // Q2: 出身国
  if (person.country) {
    const distractors = shuffleArr(others.map(o => normalizeCountry(o.country)).filter(c => c && c !== normalizeCountry(person.country)))
      .filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    if (distractors.length >= 3) {
      quizzes.push({
        id: `country:${person.id}`,
        q: `${person.name}の出身国は？`,
        options: shuffleArr([normalizeCountry(person.country), ...distractors]),
        answer: normalizeCountry(person.country),
      });
    }
  }
  // Q3: 生年（±20年の範囲で惑わす）
  if (person.birth) {
    const y = person.birth;
    const distractors = shuffleArr([y - 20, y - 10, y + 10, y + 25, y - 30, y + 15])
      .filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    quizzes.push({
      id: `birth:${person.id}`,
      q: `${person.name}は何年に生まれた？`,
      options: shuffleArr([y, ...distractors]).map(String),
      answer: String(y),
    });
  }
  // Q4+: 代表的な出来事から
  const memorableEvents = (person.events || []).filter(e => (e.title || '').length > 5).slice(0, 5);
  memorableEvents.forEach(ev => {
    if (!ev.year || !ev.title) return;
    const distractors = shuffleArr(
      others.flatMap(o => (o.events || []).map(e => e.title))
        .filter(t => t && t.length > 5 && t !== ev.title)
    ).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
    if (distractors.length >= 3) {
      quizzes.push({
        id: `event:${person.id}:${ev.year}:${(ev.title||'').slice(0,20)}`,
        q: `${ev.year}年、${person.name}は何をした？`,
        options: shuffleArr([ev.title, ...distractors]),
        answer: ev.title,
      });
    }
  });
  // Q(N+): 名言（どの偉人の言葉？）
  const quotes = (person.quotes || []).slice(0, 3);
  quotes.forEach(q => {
    if (!q.text || q.text.length > 100) return;
    const distractors = shuffleArr(others.map(o => o.name)).slice(0, 3);
    if (distractors.length >= 3) {
      quizzes.push({
        id: `quote:${person.id}:${(q.text||'').slice(0,30)}`,
        q: `この言葉の主は？\n「${q.text}」`,
        options: shuffleArr([person.name, ...distractors]),
        answer: person.name,
      });
    }
  });
  return shuffleArr(quizzes);
}

// 解答済みクイズ管理（スタンプは別。問題リセットしてもスタンプは減らない）
// ijin_quiz_answered : 出題除外用（リセットで消える）
// ijin_quiz_ever_stamped : スタンプ重複防止用（リセットでも残る）
const QUIZ_ANSWERED_KEY = 'ijin_quiz_answered';
const QUIZ_EVER_STAMPED_KEY = 'ijin_quiz_ever_stamped';
function loadAnsweredQuiz() {
  try { return JSON.parse(localStorage.getItem(QUIZ_ANSWERED_KEY) || '{}'); }
  catch { return {}; }
}
function saveAnsweredQuiz(obj) {
  localStorage.setItem(QUIZ_ANSWERED_KEY, JSON.stringify(obj));
}
function loadEverStamped() {
  try { return JSON.parse(localStorage.getItem(QUIZ_EVER_STAMPED_KEY) || '{}'); }
  catch { return {}; }
}
function saveEverStamped(obj) {
  localStorage.setItem(QUIZ_EVER_STAMPED_KEY, JSON.stringify(obj));
}
function isQuizAnswered(personId, qId) {
  const all = loadAnsweredQuiz();
  return Array.isArray(all[personId]) && all[personId].includes(qId);
}
function isQuizEverStamped(personId, qId) {
  const all = loadEverStamped();
  return Array.isArray(all[personId]) && all[personId].includes(qId);
}
function markQuizAnswered(personId, qId) {
  const all = loadAnsweredQuiz();
  if (!Array.isArray(all[personId])) all[personId] = [];
  if (!all[personId].includes(qId)) all[personId].push(qId);
  saveAnsweredQuiz(all);
}
function markQuizEverStamped(personId, qId) {
  const all = loadEverStamped();
  if (!Array.isArray(all[personId])) all[personId] = [];
  if (!all[personId].includes(qId)) all[personId].push(qId);
  saveEverStamped(all);
}
function resetAnsweredQuiz(personId) {
  const all = loadAnsweredQuiz();
  delete all[personId];
  saveAnsweredQuiz(all);
}

function openQuizModal(person) {
  const existing = document.getElementById('quizModal');
  if (existing) existing.remove();

  const allPool = generateQuizzes(person);
  if (allPool.length === 0) {
    alert('まだこの偉人のクイズが用意できません。');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'quizModal';
  modal.className = 'quiz-modal';

  let gainedThisSession = 0;

  // 未出題プールを取得（解答済みを除外）
  const getRemaining = () => allPool.filter(q => !isQuizAnswered(person.id, q.id));

  // ステップ1: 問題数選択
  const showPicker = () => {
    const remaining = getRemaining();
    const totalPool = allPool.length;
    const answeredCount = totalPool - remaining.length;
    const maxN = remaining.length;

    if (maxN === 0) {
      modal.innerHTML = `
        <div class="quiz-backdrop" data-close="1"></div>
        <div class="quiz-panel">
          <button class="quiz-close" data-close="1" aria-label="閉じる">×</button>
          <div class="quiz-head">
            <div class="quiz-head-title">全問クリア！🏆</div>
            <div class="quiz-head-sub">${person.name} のクイズは全て正解しています（${totalPool}問）</div>
          </div>
          <div class="quiz-note">進捗をリセットすると、もう一度挑戦できます。<br><b>スタンプは減りません</b>が、再び正解してもスタンプは増えません。</div>
          <div class="quiz-picker-actions">
            <button class="quiz-reset-btn" id="quizResetBtn">🔄 進捗をリセット</button>
            <button class="quiz-done" data-close="1">閉じる</button>
          </div>
        </div>
      `;
      modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
      modal.querySelector('#quizResetBtn').addEventListener('click', () => {
        if (confirm('このクイズの進捗をリセットしますか？\n（スタンプはそのまま残ります。再度正解してもスタンプは増えません）')) {
          resetAnsweredQuiz(person.id);
          showPicker();
        }
      });
      return;
    }

    const options = [1, 3, 5, 10].filter(n => n <= maxN);
    if (options.length === 0) options.push(maxN);
    modal.innerHTML = `
      <div class="quiz-backdrop" data-close="1"></div>
      <div class="quiz-panel">
        <button class="quiz-close" data-close="1" aria-label="閉じる">×</button>
        <div class="quiz-head">
          <div class="quiz-head-title">私のこと、どこまで知ってる？</div>
          <div class="quiz-head-sub">${person.name} の世界を、どこまで旅する？</div>
        </div>
        <div class="quiz-progress-info">
          未出題 <b>${maxN}</b> 問 ／ 解答済み ${answeredCount} 問 ／ 全 ${totalPool} 問
        </div>
        <div class="quiz-picker">
          ${options.map(n => `<button class="quiz-pick-btn" data-pick-count="${n}">${n}問 挑戦</button>`).join('')}
        </div>
        <div class="quiz-note">1問正解ごとに${person.name}のスタンプ +1<br><small>※過去に正解した問題は再出題されません</small></div>
        ${answeredCount > 0 ? `
          <button class="quiz-reset-btn-small" id="quizResetBtnSmall">🔄 進捗をリセット（スタンプは残ります）</button>
        ` : ''}
      </div>
    `;
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
    modal.querySelectorAll('[data-pick-count]').forEach(btn => {
      btn.addEventListener('click', () => startQuiz(parseInt(btn.dataset.pickCount, 10)));
    });
    modal.querySelector('#quizResetBtnSmall')?.addEventListener('click', () => {
      if (confirm('このクイズの進捗をリセットしますか？\n（スタンプはそのまま残ります。リセット後の再挑戦ではスタンプは増えません）')) {
        resetAnsweredQuiz(person.id);
        showPicker();
      }
    });
  };

  let currentIdx = 0;
  let correct = 0;
  let selectedPool = [];
  let isAfterReset = false;

  const startQuiz = (count) => {
    const remaining = getRemaining();
    const answeredTotal = allPool.length - remaining.length;
    // リセット直後（過去に正解記録があったがゼロに戻った）はスタンプ付与を無効化
    // 通常は「未出題 = 過去に一度も正解していない」なのでスタンプ付与対象
    // ただしユーザーがリセットしたセッションではスタンプを増やさない必要がある
    isAfterReset = !!modal._quizWasReset;
    selectedPool = remaining.slice(0, count);
    currentIdx = 0;
    correct = 0;
    gainedThisSession = 0;
    showQuestion();
  };

  const showQuestion = () => {
    if (currentIdx >= selectedPool.length) return showResult();
    const q = selectedPool[currentIdx];
    modal.innerHTML = `
      <div class="quiz-backdrop" data-close="1"></div>
      <div class="quiz-panel">
        <button class="quiz-close" data-close="1" aria-label="閉じる">×</button>
        <div class="quiz-progress">
          <span>${currentIdx + 1} / ${selectedPool.length}</span>
          <span class="quiz-progress-bar"><span style="width:${((currentIdx) / selectedPool.length) * 100}%"></span></span>
        </div>
        <div class="quiz-question">${q.q.replace(/\n/g, '<br>')}</div>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `<button class="quiz-option" data-opt-idx="${i}" data-opt="${escapeHtml(opt)}">${opt}</button>`).join('')}
        </div>
      </div>
    `;
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
    modal.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.dataset.opt;
        const isCorrect = selected === q.answer;
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
        modal.querySelectorAll('.quiz-option').forEach(b => {
          if (b.dataset.opt === q.answer) b.classList.add('correct');
          b.disabled = true;
        });
        if (isCorrect) {
          correct++;
          // 過去に一度もスタンプを付与していなければ付与（リセット後の再挑戦では付与しない）
          if (!isQuizEverStamped(person.id, q.id)) {
            grantStamp(person.id, 'quiz');
            markQuizEverStamped(person.id, q.id);
            gainedThisSession++;
            if (typeof playKeyUnlockSound === 'function') playKeyUnlockSound();
          }
          markQuizAnswered(person.id, q.id);
        }
        setTimeout(() => {
          currentIdx++;
          showQuestion();
        }, 1000);
      });
    });
  };

  const showResult = () => {
    const total = selectedPool.length;
    const allCorrect = (correct === total);
    const level = getStampLevel(person.id);
    modal.innerHTML = `
      <div class="quiz-backdrop" data-close="1"></div>
      <div class="quiz-panel">
        <button class="quiz-close" data-close="1" aria-label="閉じる">×</button>
        <div class="quiz-result">
          <div class="quiz-result-score">${correct} / ${total}</div>
          <div class="quiz-result-msg">
            ${allCorrect ? '✨ 全問正解！' : correct >= total * 0.7 ? 'あと少し…！' : 'もう一度読み返してから、再挑戦してみよう。'}
          </div>
          ${gainedThisSession > 0 ? `
            <div class="quiz-stamp">
              <div class="quiz-stamp-visual">🏷</div>
              <div class="quiz-stamp-name">+${gainedThisSession} スタンプ獲得！（${person.name} Lv.${level}）</div>
            </div>
          ` : correct > 0 ? `
            <div class="quiz-stamp quiz-stamp-muted">
              <div class="quiz-stamp-name">過去に正解した問題のためスタンプは加算されません（Lv.${level}）</div>
            </div>
          ` : ''}
          <button class="quiz-retry" id="quizRetry">続けて挑戦</button>
          <button class="quiz-done" data-close="1">閉じる</button>
        </div>
      </div>
    `;
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
    modal.querySelector('#quizRetry').addEventListener('click', () => showPicker());
  };

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 200);
  };

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  showPicker();
}

// ====================== 偉人への手紙 ======================
const LETTERS_KEY = 'ijin_letters';
function loadLetters() {
  try { return JSON.parse(localStorage.getItem(LETTERS_KEY) || '[]'); }
  catch { return []; }
}
// AI返信のエンドポイント（β版では無効化・後日AIと連動予定）
// 有効化時: '/api/letter-reply' を設定。失敗時はルールベース返信にフォールバック
const LETTER_REPLY_ENDPOINT = null;

async function fetchAIReply(person, letterText) {
  if (!LETTER_REPLY_ENDPOINT) return null; // β版では無効
  try {
    const res = await fetch(LETTER_REPLY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personName: person.name,
        personField: person.field,
        personEra: `${fmtYearRange(person.birth, person.death)}`,
        letterText: letterText.slice(0, 1200),
        quotes: (person.quotes || []).slice(0, 5),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.reply || null;
  } catch {
    return null;
  }
}

function saveLetter(personId, text) {
  if (!text || !text.trim()) return null;
  const letters = loadLetters();
  const person = DATA.people.find(p => p.id === personId);
  const replyDelayDays = 2 + Math.floor(Math.random() * 2);
  const replyAt = new Date(Date.now() + replyDelayDays * 24 * 60 * 60 * 1000).toISOString();
  const entry = {
    id: 'L' + Date.now(),
    personId,
    text: text.trim(),
    date: new Date().toISOString(),
    reply: person ? {
      text: generateReply(person, text.trim()), // 即時にルールベース版を保存
      deliverAt: replyAt,
      source: 'rule',
    } : null,
  };
  letters.unshift(entry);
  localStorage.setItem(LETTERS_KEY, JSON.stringify(letters));
  // 裏でAI返信を取得し、成功したら差し替え
  if (person) {
    fetchAIReply(person, text.trim()).then(aiReply => {
      if (!aiReply) return;
      const cur = loadLetters();
      const idx = cur.findIndex(l => l.id === entry.id);
      if (idx === -1) return;
      cur[idx].reply = { text: aiReply, deliverAt: replyAt, source: 'ai' };
      localStorage.setItem(LETTERS_KEY, JSON.stringify(cur));
    });
  }
  return entry;
}

// 偉人の名言と感情判定から返信を組み立てる（ルールベース、将来AIに差し替え可能）
function generateReply(person, letterText) {
  const quote = (person.quotes && person.quotes.length)
    ? person.quotes[Math.floor(Math.random() * person.quotes.length)]
    : null;
  const name = person.name;
  const detectedTag = (typeof detectTagsFromText === 'function')
    ? detectTagsFromText(letterText)[0]
    : 'isolation';

  const openings = {
    escape: `あなたの手紙を読み、逃げたくなる夜のことを思い出しました。`,
    setback: `私も、何度も倒れました。だからこそ、あなたの挫折の重みがわかります。`,
    burnout: `燃え尽きるほど、あなたは燃えた。それはきっと、何かを本気で愛した証です。`,
    isolation: `孤独を知る人にしか、書けない言葉がありますね。`,
    heartbreak: `心が痛むのは、それだけ深く誰かを想ったからです。`,
    loss: `失った人の分まで、あなたが生きる。それもまた愛の続きです。`,
    approval: `誰かに認められたい、という願いは、誰もが抱く祈りのようなものでしょう。`,
    blank_period: `何もできない時期もまた、内側で何かが育つ大切な時間です。`,
    pride_broken: `屈辱は、自分を作り直すための材料です。私もそうでした。`,
    illness: `体が思うようにならない時、心だけが動いていることがあります。`,
    restart: `立ち上がろうとするあなたを、私はもう知っています。`,
    poverty: `持たないことは、時に、最も自由な状態です。`,
    turning_encounter: `人生を変える出会いを求めているなら、それはもう始まっています。`,
    breakthrough: `突き抜ける瞬間の前には、必ず闇があるのです。`,
    parent_conflict: `親との葛藤は、自分を作る最初の戦いです。`,
    self_denial: `あなたが自分を責める理由を、私は受け取りました。`,
  };
  const opening = openings[detectedTag] || openings.isolation;

  const body = quote
    ? `私は生前、こう言ったことがあります。\n\n　「${quote.text}」\n\n${quote.source ? `（${quote.source}）\n\n` : ''}この言葉が、今のあなたに少しだけ届きますように。`
    : `あなたが書いてくれた一字一字を、時を超えて受け取りました。\n\n私が生きた時代と、あなたの時代は違います。けれどきっと、人の心の根のところは、そう変わらないのでしょう。`;

  const closing = `\n\n焦らなくていい。立ち止まっていい。あなたの本棚に、私の席があることを、忘れないでください。\n\n敬具\n${name}`;

  return opening + `\n\n` + body + closing;
}
function deleteLetter(id) {
  const letters = loadLetters().filter(l => l.id !== id);
  localStorage.setItem(LETTERS_KEY, JSON.stringify(letters));
}

function openLetterModal(p) {
  const existing = document.getElementById('letterModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'letterModal';
  modal.className = 'letter-modal';
  modal.innerHTML = `
    <div class="letter-modal-backdrop" data-close="1"></div>
    <div class="letter-modal-panel">
      <button class="letter-modal-close" data-close="1" aria-label="閉じる">×</button>
      <div class="letter-modal-head">
        <div class="letter-modal-to">─── 拝啓 ───</div>
        <div class="letter-modal-name">${p.name} 様</div>
        <div class="letter-modal-sub">${fmtYearRange(p.birth, p.death)} ／ ${p.field}</div>
      </div>
      <div class="letter-modal-body">
        <div class="letter-beta-notice">
          <span class="letter-beta-badge">β版</span>
          現在の返信は固定テンプレート方式です。<br>
          <b>後日、AIと連動予定</b>（偉人ごとの人格・思想を踏まえた返信）。
        </div>
        <textarea class="letter-textarea" id="letterTextarea" rows="10"
          placeholder="${p.name}さんへ、今の自分の気持ちを綴ってください。&#10;&#10;時を超えた誰かに宛てた手紙は、自分自身への手紙でもあります。"></textarea>
        <div class="letter-footer-date">${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="letter-hint">※ この手紙は『わたしの本』に保管されます。登録すると、端末を変えても消えません。</div>
      </div>
      <div class="letter-modal-actions">
        <button class="letter-btn-cancel" data-close="1">閉じる</button>
        <button class="letter-btn-send" id="letterSend">✉ 投函する</button>
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
  modal.querySelector('#letterSend').addEventListener('click', () => {
    const text = modal.querySelector('#letterTextarea').value;
    if (!text.trim()) {
      alert('何か書いてから投函してください。');
      return;
    }
    const entry = saveLetter(p.id, text);
    if (entry) {
      // 投函完了画面に切替
      const panel = modal.querySelector('.letter-modal-panel');
      panel.innerHTML = `
        <button class="letter-modal-close" data-close="1" aria-label="閉じる">×</button>
        <div class="letter-sent">
          <div class="letter-sent-icon">✉</div>
          <div class="letter-sent-title">投函しました</div>
          <div class="letter-sent-sub">
            あなたの手紙は<br>『わたしの本 → 偉人への手紙』に保管されました。
          </div>
          ${typeof currentUser !== 'undefined' && currentUser ? `
            <div class="letter-sent-hint">数日後、${p.name}さんからの返信が届くかもしれません。</div>
          ` : `
            <div class="letter-sent-hint">手紙はこの端末に保管されます。</div>
          `}
          <button class="letter-sent-done" data-close="1">閉じる</button>
        </div>
      `;
      panel.querySelector('[data-close]')?.addEventListener('click', () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 200);
      });
      const loginBtn = panel.querySelector('#letterSentLogin');
      if (loginBtn) loginBtn.addEventListener('click', () => {
        modal.remove();
        if (typeof openLoginModal === 'function') openLoginModal();
      });
      panel.querySelector('.letter-sent-done')?.addEventListener('click', () => {
        modal.classList.remove('open');
        setTimeout(() => modal.remove(), 200);
      });
    }
  });
}

function openRoutineModal(p) {
  const existing = document.getElementById('routineModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'routineModal';
  modal.className = 'routine-modal';
  modal.innerHTML = `
    <div class="routine-modal-backdrop" data-close="1"></div>
    <div class="routine-modal-panel">
      <button class="routine-modal-close" data-close="1" aria-label="閉じる">×</button>
      <div class="routine-modal-head">
        <div class="routine-modal-avatar" ${p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : ''}>${p.imageUrl ? '' : p.name.charAt(0)}</div>
        <div>
          <div class="routine-modal-name">${p.name}</div>
          <div class="routine-modal-sub">1日のルーティン</div>
        </div>
      </div>
      <div class="routine-modal-body">
        ${p.routineStory ? `<div class="routine-story">${p.routineStory}</div>` : ''}
        ${p.routineSource ? `<div class="routine-source">出典：${p.routineSource}</div>` : ''}
        ${routineBarHtml(p.routine, false)}
        ${routineCalendarHtml(p.routine)}
        <div class="routine-adopt-section">
          <div class="routine-adopt-label">このルーティンを『わたしのルーティン』に登録</div>
          <div class="routine-adopt-buttons" id="routineAdoptButtons"></div>
        </div>
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
  // 登録ボタンを動的に生成（各スロット）
  const adoptContainer = modal.querySelector('#routineAdoptButtons');
  if (adoptContainer) {
    const store = loadRoutineStore();
    store.slots.forEach((slot, i) => {
      const btn = document.createElement('button');
      btn.className = 'routine-adopt-btn';
      btn.innerHTML = `<span class="routine-adopt-icon">＋</span><span>${slot.name}</span>`;
      btn.addEventListener('click', () => {
        const hasExisting = slot.entries && slot.entries.length > 0;
        if (hasExisting && !confirm(`『${slot.name}』には既にルーティンがあります。${p.name}のルーティンで上書きしますか？`)) return;
        // 偉人のルーティンをコピー（activity末尾に注釈）
        const store2 = loadRoutineStore();
        store2.slots[i].entries = p.routine.map(e => ({ ...e }));
        saveRoutineStore(store2);
        btn.classList.add('done');
        btn.innerHTML = `<span class="routine-adopt-icon">✓</span><span>${slot.name}に登録</span>`;
        setTimeout(() => {
          btn.classList.remove('done');
          btn.innerHTML = `<span class="routine-adopt-icon">＋</span><span>${slot.name}</span>`;
        }, 2000);
      });
      adoptContainer.appendChild(btn);
    });
  }
}

function routineBarHtml(routine, showLabels) {
  if (!routine || !routine.length) return '';
  const sorted = [...routine].sort((a, b) => a.start - b.start);
  const segs = sorted.map(r => {
    const pct = ((r.end - r.start) / 24 * 100).toFixed(2);
    const cat = r.cat || 'rest';
    const label = showLabels && (r.end - r.start) >= 3 ? r.activity : '';
    return `<div class="routine-bar-seg routine-cat-${cat}" style="width:${pct}%" title="${r.activity}（${r.start}:00–${r.end}:00）">
      ${label ? `<span class="routine-bar-seg-label">${label}</span>` : ''}
    </div>`;
  }).join('');
  return `<div class="routine-bar">${segs}</div>`;
}

// Googleカレンダー風の縦タイムライン表示
function routineCalendarHtml(routine) {
  if (!routine || !routine.length) return '';
  const HOUR_HEIGHT = 44;
  const sorted = [...routine].sort((a,b) => a.start - b.start);
  let ruler = '';
  for (let h = 0; h <= 24; h++) {
    ruler += `<div class="rcal-hour-line" style="top:${h * HOUR_HEIGHT}px">
      <span class="rcal-hour-label">${String(h).padStart(2,'0')}:00</span>
    </div>`;
  }
  let blocks = '';
  sorted.forEach(r => {
    const top = r.start * HOUR_HEIGHT;
    const height = Math.max(18, (r.end - r.start) * HOUR_HEIGHT - 2);
    const cats_ = allRoutineCats();
    const cat = cats_[r.cat] || cats_.rest;
    const durHours = r.end - r.start;
    const compact = durHours < 1.2 ? 'rcal-event-compact' : '';
    blocks += `<div class="rcal-event ${compact}" style="top:${top + 1}px; height:${height}px; background:${cat.color}">
      <div class="rcal-event-time">${String(r.start).padStart(2,'0')}:00 – ${String(r.end).padStart(2,'0')}:00</div>
      <div class="rcal-event-title">${r.activity}</div>
    </div>`;
  });
  return `<div class="rcal-wrap"><div class="rcal" style="height:${24 * HOUR_HEIGHT}px">
    <div class="rcal-ruler">${ruler}</div>
    <div class="rcal-events">${blocks}</div>
  </div></div>`;
}

function routineDetailListHtml(routine) {
  if (!routine || !routine.length) return '';
  const sorted = [...routine].sort((a, b) => a.start - b.start);
  return `<div class="routine-detail-list">${sorted.map(r => {
    const cats_ = allRoutineCats();
    const cat = cats_[r.cat] || cats_.rest;
    const sh = String(r.start).padStart(2, '0');
    const eh = String(r.end).padStart(2, '0');
    return `<div class="routine-detail-item">
      <span class="routine-detail-time">${sh}:00 – ${eh}:00</span>
      <span class="routine-detail-dot" style="background:${cat.color}"></span>
      <span>${r.activity}</span>
    </div>`;
  }).join('')}</div>`;
}

// フォロー偉人の relations から論敵・宿敵を集約（ブロックリスト扱い）
function collectBlockedFromFollowed() {
  const BLOCK_KW = ['宿敵','敵','ライバル','対立','裏切','論敵','抗争','競争','暗殺','刺客','暗殺者','抗命','反発','確執','不仲','宗教的対立','批判者','批判'];
  const isBlock = (r) => {
    const text = (r.relation || '') + ' ' + (r.note || '');
    return BLOCK_KW.some(kw => text.includes(kw));
  };
  const seen = new Map(); // key: linked id or name → {name, linkedId, via:[{personId, relation, note}]}
  DATA.people.filter(p => favPeople.has(p.id)).forEach(p => {
    (p.relations || []).filter(isBlock).forEach(r => {
      const key = r.id || `name:${r.name}`;
      if (!seen.has(key)) {
        seen.set(key, { name: r.name, linkedId: r.id || null, via: [] });
      }
      seen.get(key).via.push({ personId: p.id, personName: p.name, relation: r.relation, note: r.note });
    });
  });
  return [...seen.values()];
}

// フォロー中／フォロワー／ブロック 一覧ポップアップ（X風タブ）
function openSocialListModal(initialTab) {
  const tab = (['following','followers','blocked'].includes(initialTab)) ? initialTab : 'following';

  const followingPeople = DATA.people.filter(p => favPeople.has(p.id));
  const followerPeople = DATA.people.filter(p => isFollowedByPerson(p.id));
  const blockedItems = collectBlockedFromFollowed();
  const followingUsers = [...loadUserFollows()];
  // 会員情報は非同期で後から埋める
  let userFollowList = [];   // 自分がフォロー中の会員
  let userFollowerList = []; // 自分をフォローしている会員
  const loadAndRenderUsers = async () => {
    if (typeof window.fetchAllUserProfiles !== 'function') return;
    const all = await window.fetchAllUserProfiles();
    const myUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
    userFollowList = all.filter(u => followingUsers.includes(u.uid));
    userFollowerList = myUid ? all.filter(u => (u.userFollows || []).includes(myUid)) : [];
    // バッジ数の更新
    const tabFollowing = overlay.querySelector('[data-stab="following"] .social-list-tab-num');
    if (tabFollowing) tabFollowing.textContent = String(followingPeople.length + userFollowList.length);
    const tabFollower = overlay.querySelector('[data-stab="followers"] .social-list-tab-num');
    if (tabFollower) tabFollower.textContent = String(followerPeople.length + userFollowerList.length);
    // 現在タブを再描画
    const cur = overlay.querySelector('.social-list-tab.active')?.dataset.stab || 'following';
    showTab(cur);
  };

  const overlay = document.createElement('div');
  overlay.className = 'routine-edit-overlay social-list-overlay';
  overlay.innerHTML = `
    <div class="routine-edit-modal social-list-modal">
      <div class="social-list-tabs">
        <button class="social-list-tab" data-stab="following">
          <span class="social-list-tab-num">${followingPeople.length}</span>
          <span class="social-list-tab-lbl">フォロー中</span>
        </button>
        <button class="social-list-tab" data-stab="followers">
          <span class="social-list-tab-num">${followerPeople.length}</span>
          <span class="social-list-tab-lbl">フォロワー</span>
        </button>
        <button class="social-list-tab" data-stab="blocked">
          <span class="social-list-tab-num">${blockedItems.length}</span>
          <span class="social-list-tab-lbl">ブロック中</span>
        </button>
        <button class="social-list-close" aria-label="閉じる">×</button>
      </div>
      <div class="social-list-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const body = overlay.querySelector('.social-list-body');

  function renderPersonList(people, subFn, emptyMsg) {
    if (people.length === 0) {
      return `<div class="social-list-empty">${emptyMsg}</div>`;
    }
    return `<div class="social-list-grid">${people.map(p => {
      const av = p.imageUrl
        ? `<div class="social-list-avatar" style="background-image:url('${p.imageUrl}')"></div>`
        : `<div class="social-list-avatar no-img">${p.name.charAt(0)}</div>`;
      return `
        <button class="social-list-item" data-person="${p.id}">
          ${av}
          <div class="social-list-meta">
            <div class="social-list-name">${p.name}</div>
            <div class="social-list-sub">${subFn(p)}</div>
          </div>
        </button>
      `;
    }).join('')}</div>`;
  }

  function renderBlocked(items) {
    if (items.length === 0) {
      return `<div class="social-list-empty">フォロー中の偉人に、歴史的な敵・ライバル・論敵はいません。</div>`;
    }
    return `<div class="social-list-grid">${items.map(it => {
      const linked = it.linkedId ? DATA.people.find(x => x.id === it.linkedId) : null;
      const av = linked && linked.imageUrl
        ? `<div class="social-list-avatar" style="background-image:url('${linked.imageUrl}')"></div>`
        : `<div class="social-list-avatar no-img">${it.name.charAt(0)}</div>`;
      const viaList = it.via.map(v => `${v.personName}の${v.relation}`).join('・');
      return `
        <button class="social-list-item ${linked ? '' : 'no-link'}" ${linked ? `data-person="${linked.id}"` : 'disabled'}>
          ${av}
          <div class="social-list-meta">
            <div class="social-list-name">${it.name}</div>
            <div class="social-list-sub">${viaList}</div>
          </div>
        </button>
      `;
    }).join('')}</div>`;
  }

  function showTab(t) {
    overlay.querySelectorAll('.social-list-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.stab === t);
    });
    const renderUserChunk = (users, emptyMsg) => {
      if (!users.length) return '';
      return `<div class="social-list-subhead">👥 会員</div><div class="social-list-grid">${users.map(u => {
        const av = u.avatar
          ? `<div class="social-list-avatar" style="background-image:url('${u.avatar}')"></div>`
          : `<div class="social-list-avatar no-img">${(u.name||'?').charAt(0)}</div>`;
        return `<button class="social-list-item" data-user="${u.uid}">
          ${av}
          <div class="social-list-meta">
            <div class="social-list-name">${u.title ? `【${u.title}】` : ''}${escapeHtml(u.name)}</div>
            <div class="social-list-sub">偉人フォロー ${u.ijinCount}人</div>
          </div>
        </button>`;
      }).join('')}</div>`;
    };
    if (t === 'following') {
      const ijinHtml = renderPersonList(
        followingPeople,
        p => isFollowedByPerson(p.id) ? '相互フォロー' : (p.field || ''),
        ''
      );
      const usersHtml = renderUserChunk(userFollowList);
      body.innerHTML = (followingPeople.length + userFollowList.length) === 0
        ? '<div class="social-list-empty">まだ誰もフォローしていません。</div>'
        : `${followingPeople.length ? '<div class="social-list-subhead">📚 偉人</div>' : ''}${ijinHtml}${usersHtml}`;
    } else if (t === 'followers') {
      const ijinHtml = renderPersonList(
        followerPeople,
        p => `スタンプ ${getStampLevel(p.id)} 個`,
        ''
      );
      const usersHtml = renderUserChunk(userFollowerList);
      body.innerHTML = (followerPeople.length + userFollowerList.length) === 0
        ? '<div class="social-list-empty">まだフォロワーはいません。</div>'
        : `${followerPeople.length ? '<div class="social-list-subhead">📚 偉人</div>' : ''}${ijinHtml}${usersHtml}`;
    } else {
      body.innerHTML = renderBlocked(blockedItems);
    }
    body.querySelectorAll('[data-person]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.person;
        close();
        showPerson(id);
      });
    });
    body.querySelectorAll('[data-user]').forEach(el => {
      el.addEventListener('click', () => {
        const uid = el.dataset.user;
        const all = [...userFollowList, ...userFollowerList];
        const u = all.find(x => x.uid === uid);
        close();
        if (u) openUserProfileModal(u.uid, all);
      });
    });
  }

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.social-list-close').addEventListener('click', close);
  overlay.querySelectorAll('.social-list-tab').forEach(el => {
    el.addEventListener('click', () => showTab(el.dataset.stab));
  });

  showTab(tab);
  // 会員フォロー情報を非同期ロード（利用可能なら）
  loadAndRenderUsers().catch(()=>{});
}

// ============ 会員からフォローされた通知 ============
const KNOWN_USER_FOLLOWERS_KEY = 'ijin_known_user_followers';
async function runUserFollowerNotifications() {
  if (typeof window.fetchAllUserProfiles !== 'function') return;
  const me = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
  if (!me) return;
  try {
    const all = await window.fetchAllUserProfiles();
    const currentFollowers = all.filter(u => (u.userFollows || []).includes(me.uid));
    let known = [];
    try { known = JSON.parse(localStorage.getItem(KNOWN_USER_FOLLOWERS_KEY) || '[]'); } catch {}
    const knownSet = new Set(known);
    const newOnes = currentFollowers.filter(u => !knownSet.has(u.uid));
    if (newOnes.length > 0) {
      newOnes.forEach(u => {
        showFollowToast({ id: 'user_' + u.uid, name: u.name, imageUrl: u.avatar });
        try { rekittoNotifyUserFollow(u); } catch {}
      });
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('👥 新しいフォロワー', {
            body: newOnes.map(u => `${u.name}さんがあなたをフォローしました`).join('\n'),
            icon: (newOnes[0] && newOnes[0].avatar) || '/app/assets/icon-192.png',
            tag: 'user-follower-' + Date.now(),
          });
        } catch {}
      }
    }
    localStorage.setItem(KNOWN_USER_FOLLOWERS_KEY, JSON.stringify(currentFollowers.map(u => u.uid)));
  } catch (e) {
    console.warn('user follower notify', e);
  }
}
window.runUserFollowerNotifications = runUserFollowerNotifications;

// わたしの本のフォロー数バッジを非同期で更新
async function refreshTitlePageUserCounts() {
  if (typeof window.fetchAllUserProfiles !== 'function') return;
  const me = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
  if (!me) return;
  try {
    const all = await window.fetchAllUserProfiles();
    const userFollowerCount = all.filter(u => (u.userFollows || []).includes(me.uid)).length;
    const followerNumEl = document.getElementById('tpFollowerNum');
    if (followerNumEl) {
      const ijinFollowers = DATA.people.filter(p => isFollowedByPerson(p.id)).length;
      followerNumEl.textContent = String(ijinFollowers + userFollowerCount);
    }
    const followingNumEl = document.getElementById('tpFollowingNum');
    if (followingNumEl) {
      followingNumEl.textContent = String(favPeople.size + loadUserFollows().size);
    }
  } catch {}
}
window.refreshTitlePageUserCounts = refreshTitlePageUserCounts;

// 称号選択モーダル（上品なデザイン）
function openTitlePickerModal() {
  const all = TITLES.filter(t => t.name);
  const total = totalStamps();
  const cur = currentTitle();
  const overlay = document.createElement('div');
  overlay.className = 'routine-edit-overlay title-picker-overlay';
  overlay.innerHTML = `
    <div class="routine-edit-modal title-picker-modal">
      <div class="title-picker-head">
        <div class="title-picker-head-ornament">─── ◆ ───</div>
        <h3 class="title-picker-title">称号を選ぶ</h3>
        <div class="title-picker-sub">獲得スタンプ <strong>${total}</strong> 個</div>
        <button class="routine-edit-close title-picker-close" aria-label="閉じる">×</button>
      </div>
      <div class="title-picker-list">
        <button class="title-picker-item ${!cur ? 'selected' : ''}" data-title-pick="">
          <div class="title-picker-item-name">なし</div>
          <div class="title-picker-item-desc">称号を表示しない</div>
          ${!cur ? '<div class="title-picker-item-check">✓</div>' : ''}
        </button>
        ${all.map(t => {
          const unlocked = total >= t.min;
          const selected = cur === t.name;
          return `
            <button class="title-picker-item ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}" data-title-pick="${escapeHtml(t.name)}" ${unlocked ? '' : 'disabled'}>
              <div class="title-picker-item-name">${unlocked ? '🏆' : '🔒'} ${t.name}</div>
              <div class="title-picker-item-desc">総スタンプ ${t.min} 以上${unlocked ? '' : `（あと ${t.min - total} 個）`}</div>
              ${selected ? '<div class="title-picker-item-check">✓</div>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div class="title-picker-foot">段階: 読者 → 弟子 → 同志 → 継承者 → 賢者 → 書斎の主</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.title-picker-close').addEventListener('click', close);
  overlay.querySelectorAll('[data-title-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentTitle(btn.dataset.titlePick);
      close();
      if (typeof renderFavorites === 'function') renderFavorites();
    });
  });
}

// 偉人のフォロー中／フォロワー／ブロック中 ポップアップ（X風タブ）
function openPersonRelationsModal(p, initialTab) {
  const tab = (['following','followers','blocked'].includes(initialTab)) ? initialTab : 'following';
  const BLOCK_KW = ['宿敵','敵','ライバル','対立','裏切','論敵','抗争','競争','暗殺','刺客','暗殺者','抗命','反発','確執','不仲','宗教的対立','批判者','批判'];
  const isBlk = (r) => BLOCK_KW.some(kw => ((r.relation||'')+(r.note||'')).includes(kw));
  const rels = p.relations || [];
  const following = rels.filter(r => !isBlk(r));
  const blocked = rels.filter(r => isBlk(r));
  const userName = getUserName();
  const userFollower = isFollowedByPerson(p.id) && userName;
  const followerCount = following.length + (userFollower ? 1 : 0);

  const overlay = document.createElement('div');
  overlay.className = 'routine-edit-overlay social-list-overlay';
  overlay.innerHTML = `
    <div class="routine-edit-modal social-list-modal">
      <div class="social-list-head-name">${p.name}</div>
      <div class="social-list-tabs">
        <button class="social-list-tab" data-stab="following">
          <span class="social-list-tab-num">${following.length}</span>
          <span class="social-list-tab-lbl">フォロー中</span>
        </button>
        <button class="social-list-tab" data-stab="followers">
          <span class="social-list-tab-num">${followerCount}</span>
          <span class="social-list-tab-lbl">フォロワー</span>
        </button>
        <button class="social-list-tab" data-stab="blocked">
          <span class="social-list-tab-num">${blocked.length}</span>
          <span class="social-list-tab-lbl">ブロック中</span>
        </button>
        <button class="social-list-close" aria-label="閉じる">×</button>
      </div>
      <div class="social-list-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const body = overlay.querySelector('.social-list-body');

  function renderRelItem(r) {
    const linked = r.id ? DATA.people.find(x => x.id === r.id) : null;
    const av = linked && linked.imageUrl
      ? `<div class="social-list-avatar" style="background-image:url('${linked.imageUrl}')"></div>`
      : `<div class="social-list-avatar no-img">${(linked || r).name.charAt(0)}</div>`;
    const sub = `${r.relation || ''}${r.years ? ` · ${r.years}` : ''}${r.note ? `｜${r.note}` : ''}`;
    return `
      <button class="social-list-item ${linked ? '' : 'no-link'}" ${linked ? `data-person="${linked.id}"` : 'disabled'}>
        ${av}
        <div class="social-list-meta">
          <div class="social-list-name">${linked ? linked.name : r.name}</div>
          <div class="social-list-sub">${sub}</div>
        </div>
      </button>
    `;
  }
  function renderUserChip() {
    return `
      <div class="social-list-item social-list-item-user">
        <div class="social-list-avatar no-img">👤</div>
        <div class="social-list-meta">
          <div class="social-list-name">${userName}（あなた）</div>
          <div class="social-list-sub">相互フォロー</div>
        </div>
      </div>
    `;
  }
  function renderUserFollower(u) {
    const title = u.title ? `【${u.title}】` : '';
    return `
      <div class="social-list-item social-list-item-realuser">
        <div class="social-list-avatar no-img">👤</div>
        <div class="social-list-meta">
          <div class="social-list-name">${title}${u.name || '名無しの読者'}</div>
          <div class="social-list-sub">スタンプ ${u.stampCount} 個</div>
        </div>
      </div>
    `;
  }
  async function loadAndRenderUserFollowers() {
    const userFollowersWrap = overlay.querySelector('.social-list-userfollowers');
    if (!userFollowersWrap) return;
    const fbReady = (typeof window.fetchUserFollowersOfPerson === 'function');
    if (fbReady) {
      userFollowersWrap.innerHTML = `<div class="social-list-loading">読者を読み込み中…</div>`;
    }
    const users = fbReady ? await window.fetchUserFollowersOfPerson(p.id) : [];
    const totalUsers = users.length + (userFollower ? 1 : 0);
    const countBadge = overlay.querySelector('.social-list-tab[data-stab="followers"] .social-list-tab-num');
    if (countBadge) countBadge.textContent = (following.length + totalUsers);
    if (users.length === 0 && !userFollower) {
      userFollowersWrap.innerHTML = '';
      return;
    }
    userFollowersWrap.innerHTML = `
      <div class="social-list-subhead">👤 ユーザー（${totalUsers}）</div>
      <div class="social-list-grid">
        ${userFollower ? renderUserChip() : ''}
        ${users.map(renderUserFollower).join('')}
      </div>
    `;
  }

  function showTab(t) {
    overlay.querySelectorAll('.social-list-tab').forEach(el => el.classList.toggle('active', el.dataset.stab === t));
    if (t === 'following') {
      body.innerHTML = following.length === 0
        ? `<div class="social-list-empty">${p.name}が歴史的にフォローしていた人は登録されていません。</div>`
        : `<div class="social-list-grid">${following.map(renderRelItem).join('')}</div>`;
    } else if (t === 'followers') {
      const peopleSection = following.length > 0 ? `
        <div class="social-list-subhead">🏛 偉人（${following.length}）</div>
        <div class="social-list-grid">${following.map(renderRelItem).join('')}</div>
      ` : '';
      body.innerHTML = `
        <div class="social-list-userfollowers"></div>
        ${peopleSection}
        ${following.length === 0 ? `<div class="social-list-empty" data-fallback-empty>${p.name}のフォロワーはまだいません。</div>` : ''}
      `;
      loadAndRenderUserFollowers().then(() => {
        // 読者が見つかった場合はフォールバック空メッセージを隠す
        const fe = body.querySelector('[data-fallback-empty]');
        const hasUsers = body.querySelector('.social-list-userfollowers')?.children.length > 0;
        if (fe && hasUsers) fe.remove();
      });
    } else {
      body.innerHTML = blocked.length === 0
        ? `<div class="social-list-empty">${p.name}の歴史的な敵・ライバル・論敵は登録されていません。</div>`
        : `<div class="social-list-grid">${blocked.map(renderRelItem).join('')}</div>`;
    }
    body.querySelectorAll('[data-person]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.person;
        close();
        showPerson(id);
      });
    });
  }
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.social-list-close').addEventListener('click', close);
  overlay.querySelectorAll('.social-list-tab').forEach(el => {
    el.addEventListener('click', () => showTab(el.dataset.stab));
  });
  showTab(tab);
}

// ルーティン編集モーダル
function openMyRoutineEditor() {
  const existing = loadMyRoutine();
  const overlay = document.createElement('div');
  overlay.className = 'routine-edit-overlay';
  overlay.innerHTML = `
    <div class="routine-edit-modal">
      <div class="routine-edit-head">
        <h3>わたしのルーティンを編集</h3>
        <button class="routine-edit-close">×</button>
      </div>
      <div class="routine-edit-desc">
        時間帯ごとに行動を入れていきます。24時間分を埋めてください（空白の時間は自動で休息になります）。
      </div>
      <div class="routine-edit-list" id="routineEditList"></div>
      <div class="routine-edit-btn-row">
        <button class="routine-edit-add" id="routineEditAdd">＋ 時間帯を追加</button>
        <button class="routine-edit-add routine-edit-addcat" id="routineEditAddCat">＋ カテゴリを追加</button>
      </div>
      <div class="routine-edit-actions">
        <button class="routine-edit-cancel">キャンセル</button>
        <button class="routine-edit-save">保存</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  let state = existing.length ? [...existing] : [
    { start: 0, end: 7, activity: '睡眠', cat: 'sleep' },
    { start: 7, end: 8, activity: '朝食', cat: 'meal' },
    { start: 9, end: 12, activity: '仕事・創作', cat: 'work' },
    { start: 12, end: 13, activity: '昼食', cat: 'meal' },
    { start: 13, end: 18, activity: '仕事・学習', cat: 'work' },
    { start: 18, end: 19, activity: '夕食', cat: 'meal' },
    { start: 19, end: 23, activity: '休息・読書', cat: 'rest' },
    { start: 23, end: 24, activity: '睡眠', cat: 'sleep' },
  ];

  function render() {
    const listEl = overlay.querySelector('#routineEditList');
    state.sort((a,b) => a.start - b.start);
    listEl.innerHTML = state.map((r, i) => `
      <div class="re-row" data-idx="${i}">
        <input class="re-start" type="number" min="0" max="23" value="${r.start}">
        <span>:00 〜</span>
        <input class="re-end" type="number" min="1" max="24" value="${r.end}">
        <span>:00</span>
        <select class="re-cat">
          ${Object.entries(allRoutineCats()).map(([k,v]) =>
            `<option value="${k}" ${r.cat===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
        <input class="re-activity" type="text" value="${r.activity || ''}" placeholder="活動内容">
        <button class="re-del" aria-label="削除">×</button>
      </div>
    `).join('');
    listEl.querySelectorAll('.re-row').forEach(row => {
      const idx = parseInt(row.dataset.idx);
      row.querySelector('.re-start').addEventListener('change', e => { state[idx].start = parseInt(e.target.value) || 0; });
      row.querySelector('.re-end').addEventListener('change', e => { state[idx].end = parseInt(e.target.value) || 0; });
      row.querySelector('.re-cat').addEventListener('change', e => { state[idx].cat = e.target.value; });
      row.querySelector('.re-activity').addEventListener('change', e => { state[idx].activity = e.target.value; });
      row.querySelector('.re-del').addEventListener('click', () => { state.splice(idx, 1); render(); });
    });
  }
  render();

  overlay.querySelector('#routineEditAdd').addEventListener('click', () => {
    state.push({ start: 12, end: 13, activity: '', cat: 'rest' });
    render();
  });
  overlay.querySelector('#routineEditAddCat').addEventListener('click', () => {
    const label = prompt('新しいカテゴリの名前を入力してください\n（例：執筆、瞑想、ピアノ練習、家事、育児）');
    if (!label || !label.trim()) return;
    const colors = ['#7a2e3a', '#3d3a52', '#5e7254', '#b8952e', '#8a6a8a', '#8b5a7a', '#4a6b7a', '#c9633a'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const key = 'custom_' + Date.now();
    addCustomCat(key, label.trim(), color);
    render(); // プルダウンに即反映
  });
  const close = () => overlay.remove();
  overlay.querySelector('.routine-edit-close').addEventListener('click', close);
  overlay.querySelector('.routine-edit-cancel').addEventListener('click', close);
  overlay.querySelector('.routine-edit-save').addEventListener('click', () => {
    saveMyRoutine(state);
    close();
    renderRoutines();
  });
}

function openAddCatDialog() {
  const label = prompt('カテゴリ名を入力（例：執筆、瞑想、散歩、家事）');
  if (!label || !label.trim()) return;
  const colors = ['#7a2e3a', '#3d3a52', '#5e7254', '#b8952e', '#8a6a8a', '#8b5a7a', '#4a6b7a', '#c9633a'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const key = 'custom_' + Date.now();
  addCustomCat(key, label.trim(), color);
  renderRoutines();
}

// ====================== 歴史年表（時代別／ジャンル別／全体） ======================
// 全ジャンル共通の大きな時代区分
const ERA_GLOBAL = [
  { id: 'g_ancient',   name: '古代',        yStart: -9999, yEnd: 500,   desc: '文明の黎明〜古代ローマ・ギリシャ・日本古代' },
  { id: 'g_medieval',  name: '中世',        yStart: 500,   yEnd: 1500,  desc: '平安〜戦国前夜、ルネサンス以前' },
  { id: 'g_early_mod', name: '近世',        yStart: 1500,  yEnd: 1780,  desc: 'ルネサンス・バロック・江戸初期' },
  { id: 'g_modern',    name: '近代',        yStart: 1780,  yEnd: 1900,  desc: '革命・産業化・明治維新' },
  { id: 'g_contemp',   name: '現代',        yStart: 1900,  yEnd: 9999,  desc: '20世紀〜現在' },
];
function globalEraOf(birth) {
  if (birth == null) return null;
  return (ERA_GLOBAL.find(e => birth >= e.yStart && birth < e.yEnd) || {}).id;
}
// 時代×ジャンルの「中心となる偉人」（手動定義）
const TIMELINE_CENTRAL = {
  'g_ancient':   { philo: ['plato', 'aristotle', 'socrates'], literature: ['murasaki'], history: [], music: [], art: [], science: [], other: ['confucius','laozi','buddha','cleopatra','jeanne_darc'] },
  'g_medieval':  { philo: ['dante'], literature: ['dante','basho'], music: [], art: ['leonardo','michelangelo'], science: ['galileo'], history: ['oda_nobunaga','tokugawa_ieyasu'] },
  'g_early_mod': { music: ['bach','handel','mozart','haydn'], philo: ['descartes','spinoza','kant','john_locke','rousseau'], art: ['vermeer','rembrandt'], science: ['newton','kepler'], literature: ['shakespeare','voltaire'], history: ['toyotomi_hideyoshi'] },
  'g_modern':    { music: ['beethoven','schubert','chopin','schumann','brahms','wagner','tchaikovsky'], philo: ['nietzsche','schopenhauer','hegel','kierkegaard','marx'], art: ['monet','van_gogh','rodin','klimt'], literature: ['dostoevsky','tolstoy','soseki','akutagawa','goethe','dickens','oscar_wilde'], science: ['darwin','curie'], history: ['napoleon','sakamoto_ryoma','saigo_takamori','hijikata_toshizo','kondo_isami','okita_soji'] },
  'g_contemp':   { music: ['stravinsky','shostakovich','bernstein','takemitsu','hisaishi','ryuichi_sakamoto'], philo: ['sartre','camus','heidegger','foucault','wittgenstein','bertrand_russell','nishida'], art: ['picasso','matisse','miyazaki'], literature: ['kafka','hemingway','dazai_osamu','kawabata','mishima_yukio','miyazawa_kenji'], science: ['einstein','tesla','edison','turing','yukawa_hideki','seaborg','freud'], history: ['gandhi','mother_teresa','anne_frank','chaplin','walt_disney','steve_jobs','kurosawa'] },
};
// 年表カテゴリの手描きPNGマップ（グローバル利用）
const ERA_CAT_PNG_MAP = {
  music: 'era-music', philosophy: 'era-philo', art: 'era-art',
  japan_history: 'era-history', literature: 'era-literature', science: 'era-science',
  business: 'era-business', horse_racing: 'era-horse', cooking: 'era-cooking',
};
const ERA_CAT_SVG_MAP = {
  music: 'music', philosophy: 'philosophy', art: 'art',
  japan_history: 'japan', literature: 'literature', science: 'science',
};
function eraCatIconHtml(catId, cls = 'era-cat-icon-png', fallbackEmoji = '📖') {
  const pngName = ERA_CAT_PNG_MAP[catId];
  const svgName = ERA_CAT_SVG_MAP[catId];
  if (pngName) {
    const onerr = svgName
      ? `this.onerror=null; this.src='assets/era-icons/${svgName}.svg'; this.className='era-cat-icon era-cat-icon-svg';`
      : `this.onerror=null; this.outerHTML='<span class=&quot;era-cat-icon&quot;>${fallbackEmoji}</span>';`;
    return `<img class="era-cat-icon ${cls}" src="assets/era/${pngName}.png?v=1" alt="" onerror="${onerr}">`;
  }
  if (svgName) return `<img class="era-cat-icon era-cat-icon-svg" src="assets/era-icons/${svgName}.svg" alt="">`;
  return `<span class="era-cat-icon">${fallbackEmoji}</span>`;
}
// era-lore.js を必要になった瞬間に1回だけ読み込む（年表の210KB遅延読み込み）
let __eraLorePromise = null;
function ensureEraLoreLoaded() {
  if (typeof window.ERA_LORE !== 'undefined') return Promise.resolve();
  if (__eraLorePromise) return __eraLorePromise;
  __eraLorePromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'dist/era-lore.min.js?v=20260425H';
    s.onload = () => resolve();
    s.onerror = () => { __eraLorePromise = null; resolve(); };
    document.head.appendChild(s);
  });
  return __eraLorePromise;
}
function renderHistoryTimeline() {
  const container = document.getElementById('eraCategories');
  if (!container || !DATA.eraCategories) return;
  // era-lore.js が未ロードなら、先に読み込んでから描画し直す
  if (typeof window.ERA_LORE === 'undefined') {
    ensureEraLoreLoaded().then(() => renderHistoryTimeline());
  }
  container.innerHTML = DATA.eraCategories.map(cat => {
    const iconHtml = eraCatIconHtml(cat.id, 'era-cat-icon-png', cat.icon || '📖');
    return `
    <details class="era-cat" data-cat="${cat.id}">
      <summary class="era-cat-head">
        ${iconHtml}
        <span class="era-cat-name">${cat.name}</span>
        <span class="era-cat-sub">${cat.sub || ''}</span>
        <span class="era-cat-arrow">▾</span>
      </summary>
      <div class="era-cat-body">
        <div class="era-timeline">
          ${(cat.eras || []).map(era => `
            <button class="era-card" data-era="${era.id}" data-cat-id="${cat.id}">
              <div class="era-card-period">${era.period || ''}</div>
              <div class="era-card-name">${era.name}</div>
              <div class="era-card-desc">${era.description || ''}</div>
              <div class="era-card-people-count">${(era.people || []).length}名の偉人 →</div>
            </button>
          `).join('')}
        </div>
      </div>
    </details>
  `;
  }).join('');
  // クリック → モーダル
  container.querySelectorAll('[data-era]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openEraModal(btn.dataset.catId, btn.dataset.era);
    });
  });
}

// ====================== 🎎 歴女向けテーマまとめページ ======================
const THEME_DEFS = {
  shinsengumi: {
    emoji: '⚔️',
    name: '新選組',
    tagline: '誠の一字に、すべてを懸けた。',
    intro: '幕末の京を駆けた剣客集団。局長・近藤勇、副長・土方歳三、一番隊・沖田総司、二番隊・永倉新八、三番隊・斎藤一——彼らは時代に逆らい、それぞれの最期まで誠を貫いた。',
    order: ['kondo_isami','hijikata_toshizo','okita_soji','nagakura_shinpachi','saito_hajime','yamanami_keisuke','harada_sanosuke','ito_kashitaro']
  },
  bakumatsu: {
    emoji: '🏯',
    name: '幕末',
    tagline: '時代が裂け、志士たちが駆けた14年。',
    intro: '黒船来航から明治維新まで、日本が震えた動乱の時代。吉田松陰の松下村塾から始まり、新選組、志士たち、海を渡った男たち——それぞれの正義が交差した。最後の将軍・徳川慶喜は自ら幕府を終わらせ、維新三傑が明治を創った。',
    order: ['yoshida_shoin','sakamoto_ryoma','takasugi_shinsaku','saigo_takamori','okubo_toshimichi','kido_takayoshi','katsu_kaishu','tokugawa_yoshinobu','kondo_isami','hijikata_toshizo','okita_soji','nagakura_shinpachi','saito_hajime','yamanami_keisuke','harada_sanosuke','ito_kashitaro','niijima_yae','atsuhime','kazunomiya']
  },
  sengoku: {
    emoji: '🏹',
    name: '戦国武将',
    tagline: '乱世を生き抜いた、男たちの生き様。',
    intro: '戦国時代——武力と知略、忠義と裏切りが渦巻いた時代。天下人、智将、赤備えの英雄——それぞれの生き様が、いまも胸を打つ。',
    order: ['oda_nobunaga','takeda_shingen','date_masamune','sanada_yukimura']
  },
  ishin_sanketsu: {
    emoji: '🌸',
    name: '維新三傑',
    tagline: '明治を創り、時代に引き裂かれた三人。',
    intro: '西郷隆盛・大久保利通・木戸孝允。倒幕の同志として手を取り合い、新政府を築き、そして袂を分かった。',
    order: ['saigo_takamori','okubo_toshimichi','kido_takayoshi']
  },
  rekijo_women: {
    emoji: '🎀',
    name: '歴史の女たち',
    tagline: '時代に抗い、愛に生き、誇りを貫いた。',
    intro: '幕末の八重・篤姫・和宮、戦国のお市・淀殿・ガラシャ——政略の駒として歴史に巻き込まれながらも、それぞれの信念と愛を貫いた女性たち。',
    order: ['oichi','yodo_dono','hosokawa_gracia','atsuhime','kazunomiya','niijima_yae']
  }
};

function showThemePage(themeId) {
  const def = THEME_DEFS[themeId];
  if (!def) return;
  const people = (DATA.people || []).filter(p => (p.themes || []).includes(themeId));
  if (!people.length) return;
  // 順序指定があれば優先
  const orderIdx = (p) => {
    const idx = (def.order || []).indexOf(p.id);
    return idx === -1 ? 999 : idx;
  };
  people.sort((a,b) => {
    const ai = orderIdx(a), bi = orderIdx(b);
    if (ai !== bi) return ai - bi;
    return (a.birth || 9999) - (b.birth || 9999);
  });
  // URL更新
  try {
    const url = new URL(location.href);
    url.searchParams.set('theme', themeId);
    ['person','era','cat','tag','view'].forEach(k => url.searchParams.delete(k));
    history.pushState({ theme: themeId }, '', url.toString());
  } catch {}

  const existing = document.getElementById('themePageModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'themePageModal';
  modal.className = 'era-page-modal theme-page-modal';
  modal.innerHTML = `
    <div class="era-page-backdrop" data-close="1"></div>
    <article class="era-page">
      <button class="era-page-close" data-close="1" aria-label="閉じる">×</button>
      <button class="era-page-share" data-theme-share="${themeId}" aria-label="このページをシェア" title="シェア">🔗</button>
      <header class="era-page-hero">
        <div class="era-page-hero-bg" aria-hidden="true"></div>
        <div class="era-page-hero-inner">
          <div class="era-page-cat"><span style="font-size:18px">${def.emoji}</span> <span>歴女まとめ</span></div>
          <h1 class="era-page-title">
            <span style="font-size:24px">${def.emoji}</span>
            <span>#${escapeHtml(def.name)}</span>
          </h1>
          <div class="era-page-tagline">${escapeHtml(def.tagline)}</div>
        </div>
      </header>
      <section class="era-page-section era-page-intro">
        <p>${escapeHtml(def.intro)}</p>
      </section>
      <section class="era-page-section">
        <h2 class="era-page-h2">${escapeHtml(def.name)}の偉人たち（${people.length}名）</h2>
        <div class="theme-people-grid">
          ${people.map(p => {
            const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
            const mainQuote = (p.quotes && p.quotes[0]?.text) || '';
            return `
              <button class="theme-person-card" data-jump-person="${p.id}">
                <div class="theme-person-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</div>
                <div class="theme-person-info">
                  <div class="theme-person-name">${escapeHtml(p.name)}</div>
                  <div class="theme-person-meta">${fmtYearRange(p.birth, p.death)} / ${escapeHtml(p.field || '')}</div>
                  ${mainQuote ? `<div class="theme-person-quote">「${escapeHtml(mainQuote.slice(0, 40))}${mainQuote.length > 40 ? '…' : ''}」</div>` : ''}
                </div>
                <div class="theme-person-go">→</div>
              </button>`;
          }).join('')}
        </div>
      </section>
    </article>
  `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  // .open を付けないと opacity:0 のまま透明で表示されない
  requestAnimationFrame(() => modal.classList.add('open'));
  modal.querySelectorAll('[data-close="1"]').forEach(el => {
    el.addEventListener('click', () => closeThemePage());
  });
  modal.querySelectorAll('[data-jump-person]').forEach(el => {
    el.addEventListener('click', () => {
      const pid = el.dataset.jumpPerson;
      closeThemePage();
      if (pid) setTimeout(() => showPerson(pid), 100);
    });
  });
  modal.querySelector('[data-theme-share]')?.addEventListener('click', async () => {
    const shareUrl = `${location.origin}${location.pathname}?theme=${themeId}`;
    const shareText = `${def.emoji} #${def.name} まとめ — 偉人と自分。`;
    try {
      if (navigator.share) await navigator.share({ title: shareText, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); alert('URLをコピーしました'); }
    } catch {}
  });
}
function closeThemePage() {
  const m = document.getElementById('themePageModal');
  if (m) m.remove();
  document.body.classList.remove('modal-open');
  // URL戻す
  try {
    const url = new URL(location.href);
    url.searchParams.delete('theme');
    history.pushState({}, '', url.toString());
  } catch {}
}
window.showThemePage = showThemePage;

// 🌸 歴女初心者ガイド
function showBeginnerGuide() {
  const existing = document.getElementById('beginnerGuideModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'beginnerGuideModal';
  modal.className = 'era-page-modal beginner-guide-modal';
  modal.innerHTML = `
    <div class="era-page-backdrop" data-close="1"></div>
    <article class="era-page">
      <button class="era-page-close" data-close="1" aria-label="閉じる">×</button>
      <header class="era-page-hero">
        <div class="era-page-hero-bg" aria-hidden="true"></div>
        <div class="era-page-hero-inner">
          <div class="era-page-cat"><span style="font-size:18px">🌸</span> <span>歴女入門</span></div>
          <h1 class="era-page-title"><span style="font-size:24px">🌸</span> <span>はじめての歴女</span></h1>
          <div class="era-page-tagline">推しが見つかる、3つの入口。</div>
        </div>
      </header>
      <section class="era-page-section era-page-intro">
        <p>歴史って難しそう？ ぜんぜん大丈夫。<br>ここは<b>『推し偉人に出会う』</b>ための入口です。最初の3つから、興味のある方向に飛んでみて。</p>
      </section>
      <section class="era-page-section">
        <h2 class="era-page-h2">🎯 まずはここから</h2>
        <div class="beginner-route-list">
          <button class="beginner-route" data-goto-theme="shinsengumi">
            <div class="beginner-route-emoji">⚔️</div>
            <div class="beginner-route-body">
              <div class="beginner-route-title">新選組から入る</div>
              <div class="beginner-route-desc">短い青春・熱い友情・悲しい最期。『燃えよ剣』のような世界が好きならここ。まずは副長・土方歳三から。</div>
            </div>
          </button>
          <button class="beginner-route" data-goto-theme="bakumatsu">
            <div class="beginner-route-emoji">🏯</div>
            <div class="beginner-route-body">
              <div class="beginner-route-title">幕末の志士たちから入る</div>
              <div class="beginner-route-desc">時代を変えた若者たち。坂本龍馬・高杉晋作・吉田松陰——彼らの手紙や名言を辿ると、10代後半〜20代の熱量に心が震える。</div>
            </div>
          </button>
          <button class="beginner-route" data-goto-theme="sengoku">
            <div class="beginner-route-emoji">🏹</div>
            <div class="beginner-route-body">
              <div class="beginner-route-title">戦国武将から入る</div>
              <div class="beginner-route-desc">信長・政宗・真田幸村——乱世を生き抜いた男たちの物語。大河ドラマが好きならこちら。</div>
            </div>
          </button>
        </div>
      </section>
      <details class="era-page-section beginner-collapsible">
        <summary class="era-page-h2">📚 読みやすい入門書 <span class="pr-tag">PR</span> <span class="beginner-coll-arrow">▾</span></summary>
        <div class="beginner-books">
          ${[
            {title:'燃えよ剣 上', author:'司馬遼太郎', asin:'4167105764', desc:'土方歳三の生涯。新選組入門の鉄板。'},
            {title:'竜馬がゆく 1 (新装版)', author:'司馬遼太郎', asin:'4167663015', desc:'坂本龍馬の物語。幕末全体が見える大河小説。'},
            {title:'世に棲む日日 1', author:'司馬遼太郎', asin:'4167105780', desc:'吉田松陰と高杉晋作、長州の青春。'},
            {title:'壬生義士伝 上', author:'浅田次郎', asin:'4167646064', desc:'新選組の知られざる一面。泣けます。'},
            {title:'真田太平記 1', author:'池波正太郎', asin:'4101156794', desc:'真田一族の12巻大河。'}
          ].map(b => {
            const amz = `https://www.amazon.co.jp/dp/${b.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`;
            const rak = rakutenSearchUrl(b.title, b.author);
            const cover = amazonCover(b.asin);
            return `
              <div class="beginner-book">
                <a class="beginner-book-cover" href="${amz}" target="_blank" rel="noopener sponsored">
                  <img src="${cover}" alt="${escapeHtml(b.title)}" loading="lazy"
                    onerror="this.parentElement.classList.add('no-cover');this.remove();"
                    onload="if(this.naturalWidth<50){this.parentElement.classList.add('no-cover');this.remove();}">
                  <div class="beginner-book-fallback"><div>✦</div><div class="beginner-book-fb-title">${escapeHtml(b.title)}</div></div>
                </a>
                <div class="beginner-book-info">
                  <div class="beginner-book-title">${escapeHtml(b.title)}</div>
                  <div class="beginner-book-author">${escapeHtml(b.author)}</div>
                  <div class="beginner-book-desc">${escapeHtml(b.desc)}</div>
                  <div class="beginner-book-stores">
                    <a class="beginner-book-store amz" href="${amz}" target="_blank" rel="noopener sponsored">Amazon</a>
                    <a class="beginner-book-store rak" href="${rak}" target="_blank" rel="noopener sponsored">楽天</a>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </details>
      <details class="era-page-section beginner-collapsible">
        <summary class="era-page-h2">📻 耳で聴く入門 — Audible <span class="pr-tag">PR</span> <span class="beginner-coll-arrow">▾</span></summary>
        <p style="font-size:12px;color:var(--ink-3);margin-bottom:10px">司馬遼太郎の長編も、通勤や家事しながら「耳で読める」。活字が重い日にも最強。</p>
        <a class="audible-hero-banner" href="https://px.a8.net/svt/ejp?a8mat=4B1QDV+6MQUCY+5TB0+5ZU29" rel="noopener sponsored nofollow" target="_blank">
          <img class="audible-hero-img" src="https://www29.a8.net/svt/bgt?aid=260421331401&wid=001&eno=01&mid=s00000027126001007000&mc=1" width="120" height="60" alt="Audible">
          <div class="audible-hero-text">
            <div class="audible-hero-title">📻 Audible 30日間無料</div>
            <div class="audible-hero-sub">『竜馬がゆく』『燃えよ剣』ほか、プロ声優が朗読する歴史大河。12万冊聴き放題。</div>
          </div>
          <span class="audible-hero-cta">▶</span>
        </a>
        <img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=4B1QDV+6MQUCY+5TB0+5ZU29" alt="" style="position:absolute;opacity:0">
      </details>
      <details class="era-page-section beginner-collapsible">
        <summary class="era-page-h2">🎬 漫画・小説・ドラマから入る <span class="pr-tag">PR</span> <span class="beginner-coll-arrow">▾</span></summary>
        <p style="font-size:12px;color:var(--ink-3);margin-bottom:8px">硬い歴史書より、まずは物語から。歴女の多くがここから沼に落ちた名作たち。</p>
        <div class="beginner-books">
          ${[
            // ASIN確定済（Wikipedia検証 + Amazon画像51KB+）
            {title:'るろうに剣心 完全版 1', author:'和月伸宏', asin:'4088741501', emoji:'🗡', desc:'幕末を生き抜いた抜刀斎・緋村剣心。斎藤一も登場！アニメ・映画・舞台で人気爆発の入門作品。'},
            {title:'銀魂 1', author:'空知英秋', asin:'4088736230', emoji:'🎪', desc:'新選組モデルの真選組＆攘夷志士モデルのキャラたちが織りなすSF時代劇。キャラで沼る王道。'},
            {title:'PEACE MAKER 鐵 1', author:'黒乃奈々絵', asin:'490192611X', emoji:'🌸', desc:'少年の視点から描かれる新選組。登場人物の心情描写が深い名作。'},
            {title:'信長協奏曲 1', author:'石井あゆみ', asin:'4091221009', emoji:'👘', desc:'現代高校生が信長に入れ替わる戦国タイムスリップ漫画。実写化・アニメ化。'},
            // ASIN確定追加分（NDLサーチ+Amazon画像検証済）
            {title:'風光る 1', author:'渡辺多恵子', asin:'4091373518', emoji:'🎐', desc:'新選組に身を投じた少女の物語。少女漫画の金字塔。'},
            {title:'おーい!竜馬 1', author:'武田鉄矢・小山ゆう', asin:'4091095208', emoji:'🌊', desc:'坂本龍馬の青春を熱く描く歴史漫画の名作。'},
            {title:'花の慶次 1', author:'原哲夫・隆慶一郎', asin:'4088714210', emoji:'🍃', desc:'前田慶次の生き様。「傾奇者」の美学。男も惚れる歴史漫画。'},
            {title:'センゴク 1', author:'宮下英樹', asin:'4063748103', emoji:'⚔️', desc:'仙石秀久を主人公に戦国を描く硬派漫画。信長・秀吉・家康のリアル。'},
            // ASIN未確定 → 検索URLで安全に
            {title:'薄桜鬼', author:'アイディアファクトリー', emoji:'💕', desc:'新選組×女性主人公の乙女ゲー。アニメ・舞台化もされ、歴女増産の元凶。'}
          ].map(b => {
            const qAll = encodeURIComponent(`${b.title} ${b.author}`);
            const q1 = encodeURIComponent(`${b.title} 1巻 ${b.author}`);
            const qComplete = encodeURIComponent(`${b.title} 全巻 ${b.author}`);
            const hasAsin = b.asin && /^[A-Z0-9]{10}$/i.test(b.asin);
            // 確定ASINがあれば 1巻リンクはその商品に直接、無ければ検索
            const amz1 = hasAsin
              ? `https://www.amazon.co.jp/dp/${b.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`
              : `https://www.amazon.co.jp/s?k=${q1}&i=stripbooks${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
            const amzFull = `https://www.amazon.co.jp/s?k=${qComplete}&i=stripbooks${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
            const amzCover = hasAsin ? amz1 : `https://www.amazon.co.jp/s?k=${qAll}&i=stripbooks${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
            const rak1 = rakutenSearchUrl(`${b.title} 1`, b.author);
            const rakFull = rakutenSearchUrl(`${b.title} 全巻`, b.author);
            const coverImg = hasAsin
              ? `<img src="${amazonCover(b.asin)}" alt="${escapeHtml(b.title)}" loading="lazy"
                   onerror="this.parentElement.classList.add('no-cover');this.remove();"
                   onload="if(this.naturalWidth<50){this.parentElement.classList.add('no-cover');this.remove();}">`
              : '';
            return `
              <div class="beginner-book">
                <a class="beginner-book-cover ${hasAsin ? '' : 'no-cover'}" href="${amzCover}" target="_blank" rel="noopener sponsored">
                  ${coverImg}
                  <div class="beginner-book-fallback"><div style="font-size:26px">${b.emoji}</div><div class="beginner-book-fb-title">${escapeHtml(b.title)}</div></div>
                </a>
                <div class="beginner-book-info">
                  <div class="beginner-book-title">${escapeHtml(b.title)}</div>
                  <div class="beginner-book-author">${escapeHtml(b.author)}</div>
                  <div class="beginner-book-desc">${escapeHtml(b.desc)}</div>
                  <div class="beginner-book-stores beginner-manga-stores">
                    <span class="beginner-manga-label">📦 Amazon</span>
                    <a class="beginner-book-store amz" href="${amz1}" target="_blank" rel="noopener sponsored">1巻</a>
                    <a class="beginner-book-store amz" href="${amzFull}" target="_blank" rel="noopener sponsored">全巻</a>
                    <span class="beginner-manga-label">🛍 楽天</span>
                    <a class="beginner-book-store rak" href="${rak1}" target="_blank" rel="noopener sponsored">1巻</a>
                    <a class="beginner-book-store rak" href="${rakFull}" target="_blank" rel="noopener sponsored">全巻</a>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </details>
      <details class="era-page-section beginner-collapsible">
        <summary class="era-page-h2">📺 映像で観る（DVD・Blu-ray） <span class="pr-tag">PR</span> <span class="beginner-coll-arrow">▾</span></summary>
        <p style="font-size:12px;color:var(--ink-3);margin-bottom:8px">大河ドラマや映画なら、キャストの顔で推しが決まる。週末イッキ見のお供に。</p>
        <div class="beginner-books">
          ${[
            {title:'大河ドラマ 新選組! 完全版 Blu-ray BOX', author:'三谷幸喜脚本／香取慎吾主演', desc:'近藤勇を主役に新選組を描いた大河。山本耕史の土方歳三が伝説。'},
            {title:'大河ドラマ 龍馬伝 完全版 Blu-ray BOX', author:'福山雅治主演', desc:'岩崎弥太郎視点で龍馬を描く異色作。映像美と重厚感。'},
            {title:'大河ドラマ 八重の桜 完全版 Blu-ray BOX', author:'綾瀬はるか主演', desc:'幕末会津の新島八重。鶴ヶ城籠城の迫力。歴女の涙腺崩壊。'},
            {title:'大河ドラマ 篤姫 完全版 Blu-ray BOX', author:'宮﨑あおい主演', desc:'薩摩から将軍御台所となった篤姫。歴代大河屈指の人気作。'},
            {title:'大河ドラマ 真田丸 完全版 Blu-ray BOX', author:'三谷幸喜脚本／堺雅人主演', desc:'真田信繁（幸村）の生涯。大河ドラマ史上屈指の脚本と評される。'},
            {title:'映画 燃えよ剣 豪華版 Blu-ray', author:'原田眞人監督／岡田准一主演', desc:'司馬遼太郎の原作を実写化。岡田准一の土方歳三は圧倒的。'},
            {title:'るろうに剣心 伝説の最期編 通常版 Blu-ray', author:'大友啓史監督／佐藤健主演', desc:'アクション映画として世界的に評価された実写化シリーズの集大成。'},
            {title:'大河ドラマ どうする家康 完全版 Blu-ray BOX', author:'古沢良太脚本／松本潤主演', desc:'徳川家康の生涯。信長・秀吉との関係を新解釈で描く。'}
          ].map(m => {
            const q = encodeURIComponent(`${m.title} ${m.author || ''}`);
            const amz = `https://www.amazon.co.jp/s?k=${q}&i=dvd${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
            const rak = rakutenSearchUrl(m.title, '');
            return `
              <div class="beginner-book">
                <a class="beginner-book-cover no-cover" href="${amz}" target="_blank" rel="noopener sponsored">
                  <div class="beginner-book-fallback"><div>📺</div><div class="beginner-book-fb-title">${escapeHtml(m.title.split(' ')[0] + (m.title.includes('大河') ? ' 大河' : ''))}</div></div>
                </a>
                <div class="beginner-book-info">
                  <div class="beginner-book-title">${escapeHtml(m.title)}</div>
                  <div class="beginner-book-author">${escapeHtml(m.author)}</div>
                  <div class="beginner-book-desc">${escapeHtml(m.desc)}</div>
                  <div class="beginner-book-stores">
                    <a class="beginner-book-store amz" href="${amz}" target="_blank" rel="noopener sponsored">Amazon</a>
                    <a class="beginner-book-store rak" href="${rak}" target="_blank" rel="noopener sponsored">楽天</a>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </details>
      <details class="era-page-section beginner-collapsible">
        <summary class="era-page-h2">🏨 聖地巡礼に出かける <span class="pr-tag">PR</span> <span class="beginner-coll-arrow">▾</span></summary>
        <p style="font-size:12px;color:var(--ink-3);margin-bottom:10px">推しが歩いた場所へ行く。歴女の究極の楽しみ方。</p>
        <ul class="pilgrimage-list">
          <li><b>⚔️ 新選組</b> → 京都（壬生・池田屋）・日野（土方資料館）・函館（五稜郭）</li>
          <li><b>🏯 幕末志士</b> → 萩（松下村塾）・下関（功山寺）・高知（龍馬生誕地）</li>
          <li><b>🏹 戦国武将</b> → 安土・大坂・米沢・上田・仙台</li>
          <li><b>🎀 歴女女性</b> → 会津（八重の鶴ヶ城）・京都（ガラシャ）・大坂（淀殿）</li>
        </ul>
        <!-- 楽天トラベル もしもアフィリエイト -->
        <a class="travel-hero-banner" href="//af.moshimo.com/af/c/click?a_id=5501667&p_id=55&pc_id=55&pl_id=630" rel="noopener sponsored nofollow" target="_blank" referrerpolicy="no-referrer-when-downgrade">
          <img class="travel-hero-img" src="//image.moshimo.com/af-img/0032/000000000630.jpg" width="468" height="60" alt="楽天トラベル">
          <div class="travel-hero-text">
            <div class="travel-hero-title">🏨 楽天トラベルで宿を探す</div>
            <div class="travel-hero-sub">ポイントが貯まる・使える。お得なプランで歴史の地へ。</div>
          </div>
          <span class="travel-hero-cta">→</span>
        </a>
        <!-- じゃらん A8アフィリエイト -->
        <a class="travel-hero-banner jalan-banner" href="https://px.a8.net/svt/ejp?a8mat=4B1QDV+76ZKXE+5R8A+5Z6WX" rel="noopener sponsored nofollow" target="_blank">
          <img class="travel-hero-img" src="https://www24.a8.net/svt/bgt?aid=260421331435&wid=001&eno=01&mid=s00000026857001004000&mc=1" width="120" height="60" alt="じゃらんnet">
          <div class="travel-hero-text">
            <div class="travel-hero-title">🏯 じゃらんnetでも探す</div>
            <div class="travel-hero-sub">リクルート系。ご当地グルメ・体験プランが充実。</div>
          </div>
          <span class="travel-hero-cta">→</span>
        </a>
        <!-- OTTOCAST Amazon/楽天検索 -->
        <a class="travel-hero-banner ottocast-banner" href="https://www.amazon.co.jp/s?k=OTTOCAST+%E3%82%AA%E3%83%83%E3%83%88%E3%82%AD%E3%83%A3%E3%82%B9%E3%83%88${AMAZON_TAG ? '&tag=' + AMAZON_TAG : ''}" rel="noopener sponsored nofollow" target="_blank">
          <div class="travel-hero-text">
            <div class="travel-hero-title">🚗 OTTOCAST（オットキャスト）</div>
            <div class="travel-hero-sub">車で『燃えよ剣』『薄桜鬼』『銀魂』を観ながら聖地へ。長距離ドライブが映画館に。</div>
          </div>
          <span class="travel-hero-cta">→</span>
        </a>
        <div class="ottocast-store-row">
          <a class="ottocast-store amz" href="https://www.amazon.co.jp/s?k=OTTOCAST+%E3%82%AA%E3%83%83%E3%83%88%E3%82%AD%E3%83%A3%E3%82%B9%E3%83%88${AMAZON_TAG ? '&tag=' + AMAZON_TAG : ''}" target="_blank" rel="noopener sponsored nofollow">📦 Amazonで探す</a>
          <a class="ottocast-store rak" href="${rakutenSearchUrl('OTTOCAST オットキャスト', '')}" target="_blank" rel="noopener sponsored nofollow">🛍 楽天で探す</a>
        </div>
        <img src="//i.moshimo.com/af/i/impression?a_id=5501667&p_id=55&pc_id=55&pl_id=630" width="1" height="1" style="position:absolute;border:0;opacity:0" loading="lazy" alt="">
        <img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=4B1QDV+76ZKXE+5R8A+5Z6WX" alt="" style="position:absolute;opacity:0">
      </details>
      <details class="era-page-section beginner-collapsible">
        <summary class="era-page-h2">🎁 歴女におすすめのグッズ・ツール <span class="pr-tag">PR</span> <span class="beginner-coll-arrow">▾</span></summary>
        <p style="font-size:12px;color:var(--ink-3);margin-bottom:10px">聖地巡礼・推し活・日常使いまで。歴女の毎日を彩る実用品を厳選。</p>
        <div class="rekijo-goods-list">
          ${[
            {emoji:'📓', title:'御朱印帳', q:'御朱印帳 蛇腹', desc:'聖地巡礼の必需品。神社仏閣で集めた御朱印を一冊に。推しの関連寺社（京都霊山護国神社／松陰神社など）で集めよう。'},
            {emoji:'🗡', title:'刀剣乱舞 グッズ', q:'刀剣乱舞 グッズ フィギュア', desc:'歴女の推し活定番。三日月宗近・和泉守兼定（土方の刀）などキャラモチーフ多数。'},
            {emoji:'👘', title:'着物・浴衣レンタル（京都用）', q:'着物 浴衣 レディース 和柄', desc:'京都で着物レンタルして新選組の屯所を歩くのが王道ムーブ。自前の浴衣があれば宿泊先でも楽しめる。'},
            {emoji:'🎨', title:'和柄マスキングテープ', q:'和柄 マスキングテープ セット', desc:'御朱印帳の装飾・手帳デコに。歴史系SNS映え必須アイテム。'},
            {emoji:'📷', title:'ミニ三脚・スマホジンバル', q:'スマホ 三脚 ジンバル 軽量', desc:'聖地で推しと一緒に自撮り。城・神社の広角撮影にも。長距離の聖地巡礼ブロガー必携。'},
            {emoji:'🔋', title:'モバイルバッテリー', q:'モバイルバッテリー 大容量 軽量', desc:'聖地で一日中歩き回るなら必須。地図・撮影・SNS投稿で電池は一瞬で溶ける。'},
            {emoji:'🧳', title:'ミニトランク・機内持込', q:'キャリーケース 機内持込 軽量 40L', desc:'会津・萩・高知など遠征用。2泊3日の聖地巡礼にちょうど良いサイズ。'},
            {emoji:'🎟', title:'新選組・戦国武将グッズ', q:'新選組 誠 手ぬぐい', desc:'屯所や資料館で入手できる公式グッズ、家用のインテリアにも。「誠」の手ぬぐい／戦国武将の家紋マグカップなど。'},
            {emoji:'📚', title:'歴史雑誌「歴史街道」「歴史人」', q:'歴史街道 雑誌', desc:'月刊の歴史雑誌。特集で新選組・幕末・戦国がローテーション。毎月買うと推しの情報が蓄積。'},
            {emoji:'🎧', title:'ワイヤレスイヤホン', q:'ワイヤレスイヤホン bluetooth', desc:'Audibleで偉人伝を聴きながら通勤／聖地での自撮りムービーの音楽再生に。'}
          ].map(g => {
            const q = encodeURIComponent(g.q);
            const amz = `https://www.amazon.co.jp/s?k=${q}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
            const rak = rakutenSearchUrl(g.q, '');
            return `
              <div class="rekijo-good">
                <div class="rekijo-good-emoji">${g.emoji}</div>
                <div class="rekijo-good-body">
                  <div class="rekijo-good-title">${escapeHtml(g.title)}</div>
                  <div class="rekijo-good-desc">${escapeHtml(g.desc)}</div>
                  <div class="rekijo-good-stores">
                    <a class="rekijo-good-store amz" href="${amz}" target="_blank" rel="noopener sponsored nofollow">📦 Amazonで探す</a>
                    <a class="rekijo-good-store rak" href="${rak}" target="_blank" rel="noopener sponsored nofollow">🛍 楽天で探す</a>
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </details>
      <section class="era-page-section">
        <h2 class="era-page-h2">✨ 推し偉人の見つけかた</h2>
        <p style="line-height:1.9">プロフィールページの<b>『♡ 推しに設定』</b>ボタンをタップすると、ホームに「推しのきょう」が毎日表示されます。<br>その日の手紙・名言・本・ルーティンが届く、ミニ手帳みたいな機能です。</p>
      </section>
    </article>
  `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => modal.classList.add('open'));
  modal.querySelectorAll('[data-close="1"]').forEach(el => el.addEventListener('click', () => {
    modal.remove(); document.body.classList.remove('modal-open');
  }));
  modal.querySelectorAll('[data-goto-theme]').forEach(el => el.addEventListener('click', () => {
    const t = el.dataset.gotoTheme;
    modal.remove(); document.body.classList.remove('modal-open');
    setTimeout(() => showThemePage(t), 50);
  }));
}
window.showBeginnerGuide = showBeginnerGuide;

// ホームに「歴女の入り口」セクション描画
function renderThemeTiles() {
  // ホームと年表の両方にレンダリング
  const containers = [document.getElementById('themeTiles'), document.getElementById('themeTilesHist')].filter(Boolean);
  if (!containers.length) return;
  const beginnerTile = `
    <button type="button" class="theme-tile theme-tile-beginner" data-beginner="1" onclick="window.showBeginnerGuide && window.showBeginnerGuide()">
      <div class="theme-tile-emoji">🌸</div>
      <div class="theme-tile-info">
        <div class="theme-tile-name">はじめての歴女</div>
        <div class="theme-tile-tag">何から読めばいい？ 3つの入口から選ぼう。</div>
        <div class="theme-tile-count">入門ガイド</div>
      </div>
    </button>`;
  const html = beginnerTile + Object.entries(THEME_DEFS).map(([id, def]) => {
    const count = (DATA.people || []).filter(p => (p.themes || []).includes(id)).length;
    if (!count) return '';
    return `
      <button type="button" class="theme-tile" data-theme-open="${id}" onclick="window.showThemePage && window.showThemePage('${id}')">
        <div class="theme-tile-emoji">${def.emoji}</div>
        <div class="theme-tile-info">
          <div class="theme-tile-name">#${escapeHtml(def.name)}</div>
          <div class="theme-tile-tag">${escapeHtml(def.tagline)}</div>
          <div class="theme-tile-count">${count}名の偉人</div>
        </div>
      </button>`;
  }).join('');
  containers.forEach(container => {
    container.innerHTML = html;
    if (!container.dataset.bound) {
      container.dataset.bound = '1';
      container.addEventListener('click', (e) => {
        const themeBtn = e.target.closest('[data-theme-open]');
        if (themeBtn) { e.preventDefault(); showThemePage(themeBtn.dataset.themeOpen); return; }
        const beginnerBtn = e.target.closest('[data-beginner]');
        if (beginnerBtn) { e.preventDefault(); showBeginnerGuide(); return; }
      });
    }
  });
}
window.renderThemeTiles = renderThemeTiles;

// ====================== 📑 ホーム目次（フローティング） ======================
function renderHomeTOC() {
  const mount = document.getElementById('homeTOC');
  if (!mount) return;
  // 他viewでは非表示
  const homeActive = document.getElementById('view-people')?.classList.contains('active');
  if (!homeActive) { mount.innerHTML = ''; return; }
  const view = document.getElementById('view-people');
  if (!view) return;
  const blocks = Array.from(view.querySelectorAll('.home-block'));
  const entries = [];
  blocks.forEach((blk, idx) => {
    if (blk.offsetParent === null) return; // display:none のブロック除外
    const labelEl = blk.querySelector('.home-block-label');
    if (!labelEl) return;
    const txt = (labelEl.textContent || '').trim();
    if (!txt) return;
    let anchorId = blk.id;
    if (!anchorId) { anchorId = `home-blk-${idx}`; blk.id = anchorId; }
    entries.push({ id: anchorId, label: txt.replace(/\s*PR\s*$/, '').trim() });
  });
  if (!entries.length) { mount.innerHTML = ''; return; }
  mount.innerHTML = `
    <details class="home-toc" id="homeTOCDetails">
      <summary class="home-toc-summary" aria-label="目次を開く" title="目次">📑</summary>
      <div class="home-toc-list">
        ${entries.map(e => `<button class="home-toc-item" data-toc="${e.id}">${escapeHtml(e.label)}</button>`).join('')}
      </div>
    </details>`;
  mount.querySelectorAll('[data-toc]').forEach(b => {
    b.addEventListener('click', () => {
      const tgt = document.getElementById(b.dataset.toc);
      if (tgt) {
        tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const det = document.getElementById('homeTOCDetails');
        if (det) det.open = false;
      }
    });
  });
}
window.renderHomeTOC = renderHomeTOC;
function openEraModal(catId, eraId) {
  // era-lore が未読込なら先に読み込む
  if (typeof window.ERA_LORE === 'undefined') {
    ensureEraLoreLoaded().then(() => openEraModal(catId, eraId));
    return;
  }
  const cat = DATA.eraCategories.find(c => c.id === catId);
  const era = cat?.eras?.find(e => e.id === eraId);
  if (!era) return;
  const existing = document.getElementById('eraModal');
  if (existing) existing.remove();
  const people = (era.people || []).map(id => DATA.people.find(p => p.id === id)).filter(Boolean);
  const lore = (window.ERA_LORE || {})[era.id] || null;
  const themeClass = lore ? `era-theme-${lore.theme}` : '';
  const modal = document.createElement('div');
  modal.id = 'eraModal';
  modal.className = `era-page-modal ${themeClass}`;
  modal.innerHTML = `
    <div class="era-page-backdrop" data-close="1"></div>
    <article class="era-page">
      <button class="era-page-close" data-close="1" aria-label="閉じる">×</button>
      <button class="era-page-share" data-era-share-btn="1" aria-label="このページをシェア" title="この時代をシェア">🔗</button>
      <header class="era-page-hero">
        <div class="era-page-hero-bg" aria-hidden="true"></div>
        <div class="era-page-hero-inner">
          <div class="era-page-cat">${eraCatIconHtml(cat.id, 'era-page-cat-icon', cat.icon || '')} <span>${cat.name}</span></div>
          <h1 class="era-page-title">
            ${eraCatIconHtml(cat.id, 'era-page-title-icon', lore?.emoji || '')}
            <span>${era.name}</span>
          </h1>
          <div class="era-page-period">${era.period || ''}</div>
          ${lore?.tagline ? `<div class="era-page-tagline">${lore.tagline}</div>` : ''}
        </div>
      </header>

      <section class="era-page-section era-page-intro">
        <p>${lore?.intro || era.description || ''}</p>
      </section>

      ${(era.keywords || []).length || lore?.highlights?.length ? `
        <section class="era-page-section era-page-keywords-sec">
          <h2 class="era-page-h2">キーワード</h2>
          <div class="era-page-keywords">
            ${(lore?.highlights || era.keywords || []).map(k => `<span class="era-page-chip">${escapeHtml(String(k))}</span>`).join('')}
          </div>
        </section>
      ` : ''}

      ${(lore?.sections || []).length ? `
        <section class="era-page-section era-page-themes-sec">
          <h2 class="era-page-h2">テーマで読む</h2>
          ${lore.sections.map(s => {
            const sPpl = (s.people || []).map(id => DATA.people.find(x => x.id === id)).filter(Boolean);
            return `
            <div class="era-theme-card">
              <div class="era-theme-card-head">
                <span class="era-theme-card-title">${escapeHtml(s.title)}</span>
                ${s.period ? `<span class="era-theme-card-period">${escapeHtml(s.period)}</span>` : ''}
              </div>
              <p class="era-theme-card-body">${escapeHtml(s.body)}</p>
              ${sPpl.length ? `
                <div class="era-theme-card-people">
                  <span class="era-timeline-people-label">関わった人物：</span>
                  ${sPpl.map(p => {
                    const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
                    return `<button class="era-timeline-person" data-jump-person="${p.id}"><span class="era-tl-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</span><span>${escapeHtml(p.name)}</span></button>`;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `;}).join('')}
        </section>
      ` : ''}


      ${lore?.timeline?.length ? `
        <section class="era-page-section era-page-timeline-sec">
          <h2 class="era-page-h2">時系列でたどる</h2>
          <ol class="era-timeline-list">
            ${lore.timeline.map(t => {
              const relatedPpl = (t.people || []).map(id => DATA.people.find(x => x.id === id)).filter(Boolean);
              return `
                <li class="era-timeline-item">
                  <div class="era-timeline-year">${escapeHtml(t.year || '')}</div>
                  <div class="era-timeline-body">
                    ${t.img ? `<div class="era-timeline-img"><img src="${t.img}" alt="${escapeHtml(t.title||'')}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : ''}
                    <div class="era-timeline-text">
                      <div class="era-timeline-title">${escapeHtml(t.title || '')}</div>
                      <p class="era-timeline-desc">${escapeHtml(t.body || '')}</p>
                      ${relatedPpl.length ? `
                        <div class="era-timeline-people">
                          <span class="era-timeline-people-label">関わった人物：</span>
                          ${relatedPpl.map(p => {
                            const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
                            return `<button class="era-timeline-person" data-jump-person="${p.id}" title="${escapeHtml(p.name)}"><span class="era-tl-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</span><span>${escapeHtml(p.name)}</span></button>`;
                          }).join('')}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </li>
              `;
            }).join('')}
          </ol>
        </section>
      ` : ''}

      ${lore?.culture?.length ? `
        <section class="era-page-section era-page-culture-sec">
          <h2 class="era-page-h2">この時代の文化</h2>
          <div class="era-page-culture">
            ${lore.culture.map(c => `<span class="era-page-culture-chip">${escapeHtml(c)}</span>`).join('')}
          </div>
        </section>
      ` : ''}

      ${lore?.works?.length ? `
        <section class="era-page-section era-page-works-sec">
          <h2 class="era-page-h2">代表作・名品</h2>
          <div class="era-works-grid">
            ${lore.works.map(w => {
              const q = encodeURIComponent(((w.creator ? w.creator + ' ' : '') + (w.title || '')).trim());
              const ytUrl = `https://www.youtube.com/results?search_query=${q}`;
              const ggUrl = `https://www.google.com/search?q=${q}`;
              // 作者を人物リンクとしてマッチ（名前の一部でDATA.peopleを検索）
              let creatorPerson = null;
              if (w.creator && DATA.people) {
                creatorPerson = DATA.people.find(p => w.creator.includes(p.name) || (p.name && w.creator === p.name));
              }
              return `
              <div class="era-work-card">
                ${w.img ? `<div class="era-work-img"><img src="${w.img}" alt="${escapeHtml(w.title||'')}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : ''}
                <div class="era-work-body">
                  <div class="era-work-title">${escapeHtml(w.title || '')}</div>
                  <div class="era-work-meta">
                    ${creatorPerson
                      ? `<button class="era-work-creator-link" data-jump-person="${creatorPerson.id}" title="${escapeHtml(creatorPerson.name)}のページへ">${escapeHtml(w.creator)}</button>`
                      : (w.creator ? escapeHtml(w.creator) : '')}
                    ${w.year ? `<span class="era-work-year"> · ${escapeHtml(String(w.year))}</span>` : ''}
                  </div>
                  ${w.desc ? `<div class="era-work-desc">${escapeHtml(w.desc)}</div>` : ''}
                  <div class="era-work-actions">
                    <a class="era-work-btn era-work-btn-yt" href="${ytUrl}" target="_blank" rel="noopener" title="YouTubeで検索"><span class="era-work-btn-ic">▶</span>YouTube</a>
                    <a class="era-work-btn era-work-btn-gg" href="${ggUrl}" target="_blank" rel="noopener" title="Googleで検索"><span class="era-work-btn-ic">🔍</span>Google</a>
                  </div>
                </div>
              </div>
            `;}).join('')}
          </div>
        </section>
      ` : ''}

      ${(lore?.demographics || lore?.hobbies?.length || lore?.delicacies?.length) ? `
        <section class="era-page-section era-page-daily-sec">
          <h2 class="era-page-h2">この時代を生きた人々</h2>
          ${lore.demographics ? `<p class="era-demographics">${escapeHtml(lore.demographics)}</p>` : ''}
          ${lore.hobbies?.length ? `
            <div class="era-daily-row">
              <div class="era-daily-label">🎯 好まれた趣味・嗜み</div>
              <div class="era-daily-chips">${lore.hobbies.map(h => `<span class="era-daily-chip">${escapeHtml(h)}</span>`).join('')}</div>
            </div>
          ` : ''}
          ${lore.delicacies?.length ? `
            <div class="era-daily-row">
              <div class="era-daily-label">🍷 嗜好品・ご馳走</div>
              <div class="era-daily-chips">${lore.delicacies.map(d => `<span class="era-daily-chip">${escapeHtml(d)}</span>`).join('')}</div>
            </div>
          ` : ''}
        </section>
      ` : ''}

      ${lore?.echoes?.length ? `
        <section class="era-page-section era-page-echoes-sec">
          <h2 class="era-page-h2">時代を超えた木霊（こだま）</h2>
          <p class="era-echoes-lead">この時代の出来事は、後にこんな形で繰り返された——</p>
          <div class="era-echoes-list">
            ${lore.echoes.map(e => `
              <div class="era-echo-card">
                <div class="era-echo-chain">${escapeHtml(e.chain || '')}</div>
                <div class="era-echo-pattern">${escapeHtml(e.pattern || '')}</div>
                ${e.body ? `<p class="era-echo-body">${escapeHtml(e.body)}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <section class="era-page-section era-page-people-sec">
        <h2 class="era-page-h2">この時代を生きた偉人 <span class="era-page-people-count">${people.length}名</span></h2>
        <div class="era-page-people">
          ${people.length === 0 ? '<div class="era-page-empty">この時代の偉人は準備中です。</div>' :
            people.map(p => {
              const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
              return `
                <button class="era-page-person" data-jump-person="${p.id}">
                  <div class="era-page-person-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</div>
                  <div class="era-page-person-meta">
                    <div class="era-page-person-name">${p.name}</div>
                    <div class="era-page-person-sub">${fmtYearRange(p.birth, p.death)} · ${p.field || ''}</div>
                  </div>
                </button>
              `;
            }).join('')}
        </div>
      </section>

      ${(() => {
        // 📖 この時代を読み解く本（この時代の偉人たちのbookを集約、重複排除）
        const books = [];
        const seen = new Set();
        people.forEach(pp => {
          (pp.books || []).forEach(b => {
            if (!b || !b.title) return;
            const key = b.asin || (b.title + '|' + (b.author || ''));
            if (seen.has(key)) return;
            seen.add(key);
            books.push({ ...b, personName: pp.name, personId: pp.id });
          });
        });
        if (books.length === 0) return '';
        return `
        <section class="era-page-section era-page-books-sec">
          <h2 class="era-page-h2">📖 この時代を読み解く本</h2>
          <p class="era-page-books-sub">この時代を生きた偉人たちと出会うための本。</p>
          <div class="era-page-books">
            ${books.slice(0, 12).map(b => {
              const amazonQ = encodeURIComponent(`${b.title} ${b.author || ''}`);
              const amazon = b.asin
                ? `https://www.amazon.co.jp/dp/${b.asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`
                : `https://www.amazon.co.jp/s?k=${amazonQ}${AMAZON_TAG ? `&tag=${AMAZON_TAG}` : ''}`;
              const rakuten = rakutenSearchUrl(b.title, b.author);
              const cover = b.asin ? `https://images-fe.ssl-images-amazon.com/images/P/${b.asin}.09.LZZZZZZZ.jpg` : '';
              return `
                <div class="era-page-book">
                  ${cover
                    ? `<a class="era-page-book-cover" href="${amazon}" target="_blank" rel="noopener sponsored" style="background-image:url('${cover}')"></a>`
                    : `<a class="era-page-book-cover no-img" href="${amazon}" target="_blank" rel="noopener sponsored">📖</a>`}
                  <div class="era-page-book-info">
                    <div class="era-page-book-title">${escapeHtml(b.title)}</div>
                    ${b.author ? `<div class="era-page-book-author">${escapeHtml(b.author)}</div>` : ''}
                    <div class="era-page-book-person">— ${escapeHtml(b.personName)}</div>
                    <div class="era-page-book-stores">
                      <a class="era-page-book-store era-page-book-amazon" href="${amazon}" target="_blank" rel="noopener sponsored">📦 Amazon</a>
                      <a class="era-page-book-store era-page-book-rakuten" href="${rakuten}" target="_blank" rel="noopener sponsored">🛍 楽天</a>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>`;
      })()}

      <section class="era-page-section era-page-visitors-sec">
        <h2 class="era-page-h2">読者の軌跡</h2>
        <div id="eraVisitorsMount" class="era-visitors-mount"></div>
      </section>

      <footer class="era-page-foot">
        <button class="era-page-back-btn" data-close="1">← 年表に戻る</button>
      </footer>
    </article>
  `;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));
  // URLを ?era=<eraId>&cat=<catId> に更新（共有可能に）
  try {
    const url = new URL(location.href);
    url.searchParams.set('era', eraId);
    url.searchParams.set('cat', catId);
    url.searchParams.delete('person');
    url.searchParams.delete('tag');
    history.replaceState(null, '', url.toString());
  } catch {}
  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 240);
    // URLからera/catを除去
    try {
      const url = new URL(location.href);
      url.searchParams.delete('era');
      url.searchParams.delete('cat');
      history.replaceState(null, '', url.toString());
    } catch {}
  };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  // 🔗 シェアボタン
  modal.querySelector('[data-era-share-btn]')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const url = `${location.origin}${location.pathname}?era=${encodeURIComponent(eraId)}&cat=${encodeURIComponent(catId)}`;
    const title = `${era.name} — 偉人と自分。`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert('リンクをコピーしました！\n' + url);
      } else {
        prompt('このURLをコピーしてください:', url);
      }
    } catch {}
  });
  modal.querySelectorAll('[data-jump-person]').forEach(el => {
    el.addEventListener('click', () => {
      close();
      setTimeout(() => showPerson(el.dataset.jumpPerson), 260);
    });
  });

  // 軌跡：訪問を記録して一覧取得（ローカル＋Firestore）
  const eraKey = catId + '_' + eraId;
  (async () => {
    try {
      const myUid = (currentUser && currentUser.uid) ? currentUser.uid : getOrCreateGuestUid();
      const isAnon = !currentUser || currentUser.isAnonymous;
      const myName = getUserName() || (currentUser && currentUser.displayName) || (isAnon ? 'ゲスト' : '名無しの読者');
      const myAvatar = localStorage.getItem('ijin_user_avatar') || '';
      const record = {
        eraKey, uid: myUid, name: myName, avatar: myAvatar, isGuest: isAnon,
        visitedAt: new Date().toISOString(),
      };
      saveLocalVisitor('era', eraKey, record);
      if (typeof window.recordVisitorToEra === 'function' && currentUser) {
        window.recordVisitorToEra(eraKey, { name: myName, avatar: myAvatar, isGuest: isAnon });
      }
      let cloudVisitors = [];
      if (typeof window.fetchVisitorsToEra === 'function') {
        cloudVisitors = await window.fetchVisitorsToEra(eraKey);
      }
      renderEraVisitors(mergeVisitors(loadLocalVisitors('era', eraKey), cloudVisitors));
    } catch {}
  })();

  function renderEraVisitors(visitors) {
    const mount = modal.querySelector('#eraVisitorsMount');
    if (!mount) return;
    const myUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : getOrCreateGuestUid();
    // 自分も含めて全員表示（自分には「(あなた)」マーク）
    const others = (visitors || []);
    if (others.length === 0) {
      mount.innerHTML = `
        <div class="visitors-empty">
          <div class="visitors-empty-ic">👣</div>
          <div>まだ他の読者の軌跡はありません。<br>この時代を最初に訪れたのは、あなたかもしれません。</div>
        </div>`;
      return;
    }
    mount.innerHTML = `
      <div class="visitors-hint">この時代を訪れた読者たち</div>
      <div class="visitors-list">
        ${others.map(v => {
          const following = isFollowingUser(v.uid);
          const liked = isLikedUser(v.uid);
          const bg = v.avatar ? `style="background-image:url('${escapeHtml(v.avatar)}')"` : '';
          const initial = (v.name || '?').charAt(0);
          const dt = v.visitedAt ? new Date(v.visitedAt) : null;
          const when = dt ? `${dt.getMonth()+1}/${dt.getDate()}` : '';
          return `
            <div class="visitor-card" data-uid="${escapeHtml(v.uid)}">
              <div class="visitor-av" ${bg}>${v.avatar ? '' : initial}</div>
              <div class="visitor-info">
                <div class="visitor-name">${escapeHtml(v.name || '名無しの読者')}</div>
                <div class="visitor-meta">👣 ${when}</div>
              </div>
              <div class="visitor-actions">
                <button class="visitor-btn visitor-like ${liked ? 'active' : ''}" data-user-like="${escapeHtml(v.uid)}">
                  ${liked ? '❤' : '♡'}
                </button>
                <button class="visitor-btn visitor-follow ${following ? 'active' : ''}" data-visitor-follow="${escapeHtml(v.uid)}">
                  ${following ? '✓' : '＋'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    mount.querySelectorAll('[data-user-like]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = btn.dataset.userLike;
        const on = toggleLikeUser(uid);
        btn.classList.toggle('active', on);
        btn.textContent = on ? '❤' : '♡';
      });
    });
    mount.querySelectorAll('[data-visitor-follow]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uid = btn.dataset.visitorFollow;
        const on = toggleFollowUser(uid);
        btn.classList.toggle('active', on);
        btn.textContent = on ? '✓' : '＋';
      });
    });
    mount.querySelectorAll('.visitor-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.visitor-btn')) return;
        const uid = card.dataset.uid;
        if (uid && typeof openUserProfileById === 'function') openUserProfileById(uid);
      });
    });
  }
}
window.openEraModal = openEraModal;
function tlPersonCard(p, opts = {}) {
  const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
  const central = opts.central ? 'tl-person-central' : '';
  return `
    <button class="tl-person ${central} ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
      ${central ? '<span class="tl-person-crown">★</span>' : ''}
      ${!p.imageUrl ? `<span class="tl-person-ph">${p.name.charAt(0)}</span>` : ''}
      <span class="tl-person-shade"></span>
      <span class="tl-person-name">${p.name}</span>
      <span class="tl-person-year">${fmtYearRange(p.birth, p.death)}</span>
    </button>
  `;
}
function renderHistoryEra(body) {
  // 大時代ごとに、各ジャンルの偉人を整理
  const html = ERA_GLOBAL.map(era => {
    const all = DATA.people.filter(p => p.birth != null && globalEraOf(p.birth) === era.id);
    if (all.length === 0) return '';
    const byCat = {};
    all.forEach(p => {
      const c = categoryOf(p.field);
      (byCat[c] = byCat[c] || []).push(p);
    });
    const centrals = new Set();
    Object.values(TIMELINE_CENTRAL[era.id] || {}).forEach(arr => arr.forEach(id => centrals.add(id)));
    const catOrder = ['philo','music','art','literature','science','history','other'];
    const catLabel = { philo:'哲学', music:'音楽', art:'美術', literature:'文学', science:'科学', history:'日本史', other:'その他' };
    return `
      <div class="tl-era" id="tl-era-${era.id}">
        <div class="tl-era-head">
          <h3 class="tl-era-name">${era.name}</h3>
          <div class="tl-era-years">${fmtYear(era.yStart === -9999 ? '' : era.yStart) || '古代'} 〜 ${era.yEnd === 9999 ? '現在' : fmtYear(era.yEnd)}</div>
          <div class="tl-era-desc">${era.desc}</div>
          <div class="tl-era-count">${all.length} 名</div>
        </div>
        ${catOrder.filter(c => byCat[c] && byCat[c].length).map(c => {
          const sorted = byCat[c].sort((a,b) => (a.birth||0) - (b.birth||0));
          return `
            <div class="tl-cat">
              <div class="tl-cat-head">${catLabel[c] || c} <span class="tl-cat-count">${sorted.length}</span></div>
              <div class="tl-person-grid">
                ${sorted.map(p => tlPersonCard(p, { central: centrals.has(p.id) })).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
  body.innerHTML = `
    <div class="tl-era-jump" id="tlEraJump">
      ${ERA_GLOBAL.map(e => `<button class="tl-jump-btn" data-jump="tl-era-${e.id}">${e.name}</button>`).join('')}
    </div>
    <div class="tl-intro">★ は各時代・ジャンルの<strong>中心となった偉人</strong>（編集部選定）</div>
    ${html}
  `;
  bindTimelineEvents(body);
}
function renderHistoryGenre(body) {
  const cats = [
    { id: 'music',      name: '音楽' },
    { id: 'philo',      name: '哲学' },
    { id: 'literature', name: '文学' },
    { id: 'art',        name: '美術' },
    { id: 'science',    name: '科学' },
    { id: 'history',    name: '日本史' },
  ];
  const html = cats.map(cat => {
    const people = DATA.people.filter(p => categoryOf(p.field) === cat.id && p.birth != null)
      .sort((a, b) => a.birth - b.birth);
    if (people.length === 0) return '';
    const eraRules = ERA_RULES[cat.id] || [];
    const eraOfPerson = (p) => {
      for (const r of eraRules) if (r.match(p.birth)) return r;
      return null;
    };
    // 時代セクションに分ける
    const byEra = {};
    const uncat = [];
    people.forEach(p => {
      const e = eraOfPerson(p);
      if (e) (byEra[e.id] = byEra[e.id] || { era: e, people: [] }).people.push(p);
      else uncat.push(p);
    });
    const centrals = new Set();
    Object.values(TIMELINE_CENTRAL).forEach(era => (era[cat.id] || []).forEach(id => centrals.add(id)));
    return `
      <div class="tl-genre" id="tl-genre-${cat.id}">
        <div class="tl-genre-head">
          <h3 class="tl-genre-name">${cat.name}</h3>
          <div class="tl-genre-count">${people.length} 名 ／ ${fmtYear(people[0].birth)} 〜 ${fmtYear(people[people.length-1].birth)}</div>
        </div>
        ${eraRules.map(r => {
          const bucket = byEra[r.id];
          if (!bucket) return '';
          return `
            <div class="tl-gera">
              <div class="tl-gera-head">${r.name}</div>
              <div class="tl-person-grid">
                ${bucket.people.map(p => tlPersonCard(p, { central: centrals.has(p.id) })).join('')}
              </div>
            </div>
          `;
        }).join('')}
        ${uncat.length ? `
          <div class="tl-gera">
            <div class="tl-gera-head">その他</div>
            <div class="tl-person-grid">${uncat.map(p => tlPersonCard(p, { central: centrals.has(p.id) })).join('')}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  body.innerHTML = `
    <div class="tl-era-jump">
      ${cats.map(c => `<button class="tl-jump-btn" data-jump="tl-genre-${c.id}">${c.name}</button>`).join('')}
    </div>
    ${html}
  `;
  bindTimelineEvents(body);
}
function renderHistoryAll(body) {
  // 生年順の一本スクロール年表
  const people = DATA.people.filter(p => p.birth != null).sort((a, b) => a.birth - b.birth);
  const centrals = new Set();
  Object.values(TIMELINE_CENTRAL).forEach(era => {
    Object.values(era).forEach(arr => arr.forEach(id => centrals.add(id)));
  });
  // 100年ごとにグルーピング
  const byCentury = {};
  people.forEach(p => {
    const c = Math.floor(p.birth / 100) * 100;
    (byCentury[c] = byCentury[c] || []).push(p);
  });
  const keys = Object.keys(byCentury).map(k => parseInt(k, 10)).sort((a, b) => a - b);
  const fmtCentury = (c) => {
    if (c < 0) return `紀元前${Math.abs(c)}年台`;
    return `${c}年台`;
  };
  const html = keys.map(c => {
    const arr = byCentury[c];
    return `
      <div class="tl-century">
        <div class="tl-century-label">${fmtCentury(c)} <span class="tl-century-count">${arr.length}名</span></div>
        <div class="tl-person-grid">
          ${arr.map(p => tlPersonCard(p, { central: centrals.has(p.id) })).join('')}
        </div>
      </div>
    `;
  }).join('');
  body.innerHTML = `
    <div class="tl-intro">全 ${people.length} 名を生年順に。★ は時代・ジャンルの代表格。</div>
    ${html}
  `;
  bindTimelineEvents(body);
}
function bindTimelineEvents(body) {
  body.querySelectorAll('.tl-person').forEach(b => {
    b.addEventListener('click', () => showPerson(b.dataset.id));
  });
  body.querySelectorAll('[data-jump]').forEach(b => {
    b.addEventListener('click', () => {
      const el = document.getElementById(b.dataset.jump);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
function bindHistoryTabs() {
  document.querySelectorAll('.hist-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hist-mode').forEach(b => b.classList.toggle('active', b === btn));
      renderHistoryTimeline();
    });
  });
}

function renderRoutines() {
  // 凡例
  const legend = document.getElementById('routineLegend');
  const cats = allRoutineCats();
  legend.innerHTML = Object.entries(cats).map(([k, v]) =>
    `<div class="routine-legend-item" data-cat-key="${k}">
      <span class="routine-legend-color" style="background:${v.color}"></span>
      <span class="routine-legend-label">${v.label}</span>
      ${v.custom ? `<button class="routine-legend-del" data-remove-cat="${k}" aria-label="削除">×</button>` : ''}
    </div>`
  ).join('') +
    `<button class="routine-legend-add" id="addCustomCatBtn" type="button">＋ カテゴリを追加</button>`;
  const addBtn = legend.querySelector('#addCustomCatBtn');
  if (addBtn) addBtn.addEventListener('click', openAddCatDialog);
  legend.querySelectorAll('[data-remove-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.removeCat;
      if (!confirm(`「${cats[key].label}」を削除しますか？`)) return;
      removeCustomCat(key);
      renderRoutines();
    });
  });

  const list = document.getElementById('routinesList');
  const store = loadRoutineStore();
  const activeSlot = store.slots[store.active];
  const myRoutine = activeSlot.entries;

  // 自分のルーティンセクション
  let html = `
    <div class="my-routine-section">
      <h3 class="my-routine-heading">わたしのルーティン</h3>
      <div class="routine-slots">
        ${store.slots.map((s, i) => `
          <button class="routine-slot ${i === store.active ? 'active' : ''}" data-slot="${i}">
            <span class="routine-slot-name">${s.name}</span>
            <span class="routine-slot-hint">${s.entries.length ? '設定済' : '未設定'}</span>
          </button>
        `).join('')}
      </div>
      <button class="routine-slot-rename" id="routineSlotRename">✎ この枠の名前を変える</button>
      ${myRoutine.length === 0 ? `
        <div class="my-routine-empty">
          この枠はまだ設定されていません。偉人のルーティンを参考に作ってみましょう。
        </div>
      ` : `
        <div class="routine-card my-routine-card">
          <div class="routine-card-header">
            <div class="routine-avatar my-avatar">★</div>
            <div class="routine-card-info">
              <div class="routine-person-name">${activeSlot.name}</div>
              <div class="routine-person-sub">自分のペース</div>
            </div>
          </div>
          ${routineBarHtml(myRoutine, false)}
          ${routineCalendarHtml(myRoutine)}
        </div>
      `}
      <button class="my-routine-edit-btn" id="myRoutineEdit">
        ${myRoutine.length === 0 ? '＋ この枠のルーティンを作る' : '✎ この枠のルーティンを編集'}
      </button>
    </div>

    <h3 class="routines-section-heading">偉人のルーティン</h3>
    <p class="routines-section-sub">気に入ったルーティンは「真似する」ボタンで現在の枠に取り込めます。</p>
    <div class="routine-search-wrap">
      <input id="routineSearchInput" class="routine-search-input" type="search" placeholder="🔍 名前・分野・国で検索（例：画家 / 日本 / バッハ）" value="${(window.__routineSearch || '').replace(/"/g,'&quot;')}">
      <div class="routine-search-chips" id="routineSearchChips">
        ${['all', ...CATEGORY_RULES.map(r => r.id)].map(id => {
          const name = id === 'all' ? 'すべて' : CAT_NAME[id];
          const active = (window.__routineCat || 'all') === id ? 'active' : '';
          return `<button class="routine-chip ${active}" data-routine-cat="${id}">${name}</button>`;
        }).join('')}
      </div>
    </div>
  `;

  const routineQuery = (window.__routineSearch || '').trim().toLowerCase();
  const routineCat = window.__routineCat || 'all';
  const filteredRoutinePeople = DATA.people.filter(p => p.routine && p.routine.length)
    .filter(p => routineCat === 'all' || categoryOf(p.field) === routineCat)
    .filter(p => {
      if (!routineQuery) return true;
      const hay = `${p.name} ${p.nameEn || ''} ${p.field || ''} ${p.country || ''}`.toLowerCase();
      return hay.includes(routineQuery);
    });

  if (filteredRoutinePeople.length === 0 && (routineQuery || routineCat !== 'all')) {
    html += `<div class="routine-empty-filter">🔍 条件に合う偉人のルーティンが見つかりませんでした。</div>`;
  }

  html += filteredRoutinePeople.map(p => {
    const avatar = p.imageUrl
      ? `<button class="routine-avatar routine-avatar-link" data-goto-person="${p.id}" style="background-image:url('${p.imageUrl}')" aria-label="${p.name}のプロフィール"></button>`
      : `<button class="routine-avatar routine-avatar-link" data-goto-person="${p.id}" aria-label="${p.name}のプロフィール">${p.name.charAt(0)}</button>`;
    return `
      <div class="routine-card" data-id="${p.id}">
        ${favRoutineBtn(p.id)}
        <div class="routine-card-header">
          ${avatar}
          <div class="routine-card-info">
            <button class="routine-person-name routine-person-name-link" data-goto-person="${p.id}">${p.name}</button>
            <div class="routine-person-sub">${p.field} / ${p.country}</div>
          </div>
        </div>
        ${routineBarHtml(p.routine, false)}
        <div class="routine-card-actions">
          <button class="routine-peek-btn" data-peek-id="${p.id}">🕐 詳しく見る</button>
          <button class="routine-copy-btn" data-copy-id="${p.id}">真似する →</button>
        </div>
      </div>
    `;
  }).join('');

  list.innerHTML = html;

  // 偉人のルーティンカード → 詳しく見る（ポップアップ）
  list.querySelectorAll('.routine-card[data-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.fav-btn')) return;
      if (e.target.closest('.routine-copy-btn')) return;
      if (e.target.closest('.routine-peek-btn')) return;
      if (e.target.closest('[data-goto-person]')) return;
      const p = DATA.people.find(x => x.id === el.dataset.id);
      if (p) openRoutineModal(p);
    });
  });
  list.querySelectorAll('[data-peek-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = DATA.people.find(x => x.id === btn.dataset.peekId);
      if (p) openRoutineModal(p);
    });
  });
  // アバター・名前タップ → 人物プロフィールへ
  list.querySelectorAll('[data-goto-person]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPerson(btn.dataset.gotoPerson);
    });
  });

  // 「真似する」ボタン
  list.querySelectorAll('[data-copy-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.dataset.copyId;
      const src = DATA.people.find(x => x.id === pid);
      if (!src || !src.routine) return;
      if (!confirm(`${src.name}のルーティンをあなたのものとしてコピーしますか？（既存の設定は上書きされます）`)) return;
      // ディープコピー
      saveMyRoutine(JSON.parse(JSON.stringify(src.routine)));
      renderRoutines();
    });
  });

  // 自分のルーティン編集
  const editBtn = list.querySelector('#myRoutineEdit');
  if (editBtn) {
    editBtn.addEventListener('click', () => openMyRoutineEditor());
  }

  // スロット切り替え
  list.querySelectorAll('[data-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      const store = loadRoutineStore();
      store.active = parseInt(btn.dataset.slot);
      saveRoutineStore(store);
      renderRoutines();
    });
  });

  // スロット名変更
  const renameBtn = list.querySelector('#routineSlotRename');
  if (renameBtn) {
    renameBtn.addEventListener('click', () => {
      const store = loadRoutineStore();
      const current = store.slots[store.active].name;
      const next = prompt('この枠の名前を変更', current);
      if (next === null || !next.trim()) return;
      store.slots[store.active].name = next.trim();
      saveRoutineStore(store);
      renderRoutines();
    });
  }
  // ルーティンの★トグル
  list.querySelectorAll('[data-fav-routine]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.favRoutine;
      if (favRoutines.has(id)) favRoutines.delete(id); else favRoutines.add(id);
      saveSet(FAV_KEY_ROUTINES, favRoutines);
      btn.classList.toggle('active');
      btn.textContent = favRoutines.has(id) ? '★' : '☆';
    });
  });

  // ルーティン検索
  const searchInput = list.querySelector('#routineSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      window.__routineSearch = e.target.value;
      // フォーカスを保ったまま部分再描画
      clearTimeout(window.__routineSearchT);
      window.__routineSearchT = setTimeout(() => {
        renderRoutines();
        const again = document.getElementById('routineSearchInput');
        if (again) {
          again.focus();
          const len = again.value.length;
          again.setSelectionRange(len, len);
        }
      }, 180);
    });
  }
  list.querySelectorAll('[data-routine-cat]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.__routineCat = btn.dataset.routineCat;
      renderRoutines();
    });
  });
}

// ====================== いいね機能 ======================
const LIKES_KEY = 'ijin_likes';
const LIKED_BY_ME_KEY = 'ijin_liked_by_me';
function loadLikes() {
  try { return JSON.parse(localStorage.getItem(LIKES_KEY) || '{}'); } catch { return {}; }
}
function saveLikes(obj) { localStorage.setItem(LIKES_KEY, JSON.stringify(obj)); }
function loadLikedByMe() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_BY_ME_KEY) || '[]')); } catch { return new Set(); }
}
function saveLikedByMe(s) { localStorage.setItem(LIKED_BY_ME_KEY, JSON.stringify([...s])); }
function getLikeCount(key) {
  const all = loadLikes();
  // 疑似グローバル件数（keyのハッシュから 0〜10 の固定オフセット + ユーザー分）
  const baseline = (hashStr(key) % 11);
  return baseline + (all[key] || 0);
}
function isLiked(key) { return loadLikedByMe().has(key); }
function toggleLike(key) {
  const likes = loadLikes();
  const me = loadLikedByMe();
  if (me.has(key)) {
    me.delete(key);
    likes[key] = Math.max(0, (likes[key] || 0) - 1);
  } else {
    me.add(key);
    likes[key] = (likes[key] || 0) + 1;
  }
  saveLikes(likes);
  saveLikedByMe(me);
  return me.has(key);
}

function formatTs(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function deleteComment(key, idx) {
  // commentsDataから削除（自分のコメントのみ）
  const arr = commentsData[key] || [];
  if (idx < 0 || idx >= arr.length) return;
  const c = arr[idx];
  if (c.userId && c.userId !== 'me') return;
  arr.splice(idx, 1);
  commentsData[key] = arr;
  // localStorageへ反映
  try {
    const local = JSON.parse(localStorage.getItem('ijin_comments') || '{}');
    if (local[key]) {
      local[key] = local[key].filter(x => !(x.ts === c.ts && x.text === c.text));
      if (local[key].length === 0) delete local[key];
      localStorage.setItem('ijin_comments', JSON.stringify(local));
    }
  } catch {}
}

function reportItem(kind, key) {
  const reports = (() => {
    try { return JSON.parse(localStorage.getItem('ijin_reports') || '[]'); } catch { return []; }
  })();
  reports.push({ kind, key, ts: new Date().toISOString() });
  localStorage.setItem('ijin_reports', JSON.stringify(reports));
  alert('通報を受け付けました。ありがとうございます。確認のうえ対応します。');
}

// ====================== つぶやきタイムライン（チャット風） ======================

// コメントデータ（サーバーから読み込み）
let commentsData = {};

async function loadComments() {
  try {
    const res = await fetch('/api/comments');
    if (res.ok) commentsData = await res.json();
  } catch (_) { /* サーバー未対応ならスキップ */ }
  // localStorageから追加で読み込み
  try {
    const local = JSON.parse(localStorage.getItem('ijin_comments') || '{}');
    Object.keys(local).forEach(k => {
      if (!commentsData[k]) commentsData[k] = [];
      local[k].forEach(c => {
        if (!commentsData[k].some(x => x.ts === c.ts && x.text === c.text)) {
          commentsData[k].push(c);
        }
      });
    });
  } catch {}
}

function postKey(post) {
  if (post.type === 'quote') return `quote::${post.person.id}::${post.body.slice(0, 40)}`;
  return `event::${post.person.id}::${post.year}::${post.title}`;
}

function renderTimeline() {
  const list = document.getElementById('timelineList');

  // 今日選ばれた偉人を取得
  const todayStr = new Date().toISOString().slice(0,10);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(MOOD_PICK_KEY) || 'null'); } catch {}

  if (!saved || saved.date !== todayStr || !saved.personId) {
    list.innerHTML = `
      <div class="chat-empty">
        <div class="chat-empty-title">今日の話し相手はまだ決まっていません</div>
        <p class="chat-empty-text">
          ホームの「今日の気分は？」で感情を選ぶと、<br>
          その感情を経験した偉人がここに現れて話しかけてくれます。
        </p>
        <button class="chat-empty-btn" id="chatGoHome">ホームへ戻る</button>
      </div>
    `;
    const btn = list.querySelector('#chatGoHome');
    if (btn) btn.addEventListener('click', () => {
      history.length = 0;
      showView('people');
    });
    return;
  }

  const p = DATA.people.find(x => x.id === saved.personId);
  if (!p) { list.innerHTML = '<div class="empty">相手が見つかりません</div>'; return; }

  // この偉人のメッセージ（出来事＋名言）をすべて集める
  const allPosts = [];
  (p.events || []).forEach(e => {
    allPosts.push({
      type: 'event', person: p, year: e.year, age: e.age,
      title: e.title, body: e.detail, tags: e.tags || [], event: e,
    });
  });
  (p.quotes || []).forEach(q => {
    allPosts.push({
      type: 'quote', person: p, year: null, age: null,
      title: null, body: q.text, source: q.source, tags: [], event: null,
    });
  });
  // 年代順で、名言は出来事の間に散りばめる
  allPosts.sort((a, b) => (a.year || p.birth || 0) - (b.year || p.birth || 0));

  // 時間経過で段階的にメッセージを解放
  // chatStart から X分ごとに 1メッセージずつ増える（デフォルト 1分 = 開発中は早め）
  const INTERVAL_MS = 60 * 1000; // 1分ごとに1メッセージ
  const elapsed = Date.now() - (saved.chatStart || Date.now());
  const unlockCount = Math.min(allPosts.length, Math.floor(elapsed / INTERVAL_MS) + 1);
  const posts = allPosts.slice(0, unlockCount);
  const remaining = allPosts.length - unlockCount;

  // チャットヘッダー
  const html = [];
  const headerAvatar = p.imageUrl
    ? `<div class="chat-head-avatar" style="background-image:url('${p.imageUrl}')"></div>`
    : `<div class="chat-head-avatar">${p.name.charAt(0)}</div>`;
  html.push(`
    <div class="chat-header" data-id="${p.id}">
      ${headerAvatar}
      <div class="chat-head-info">
        <div class="chat-head-name">${p.name}</div>
        <div class="chat-head-sub">${p.field} · オンライン</div>
      </div>
    </div>
  `);

  // 年ごとに日付ラベルを挿入
  let lastYear = null;
  posts.forEach((post, idx) => {
    const yr = post.year || post.person.birth || null;
    if (yr && yr !== lastYear) {
      html.push(`<div class="line-date">${yr}年</div>`);
      lastYear = yr;
    }

    const p = post.person;
    const key = postKey(post);
    const comments = commentsData[key] || [];
    const avatar = p.imageUrl
      ? `<div class="line-msg-avatar" style="background-image:url('${p.imageUrl}')"></div>`
      : `<div class="line-msg-avatar">${p.name.charAt(0)}</div>`;
    const timestamp = post.year ? `${post.year}${post.age ? `(${post.age})` : ''}` : '';
    const isQuote = post.type === 'quote';

    const tagChips = post.tags.map(tid => {
      const t = DATA.tagMap[tid];
      return t ? `<span class="event-tag" data-tag="${t.id}">${t.name}</span>` : '';
    }).join('');

    // 偉人の吹き出し（左）
    html.push(`
      <div class="line-msg" data-id="${p.id}" data-key="${key}" data-idx="${idx}">
        ${avatar}
        <div class="line-msg-content">
          <div class="line-msg-name">${p.name}</div>
          <div class="line-bubble">
            ${!isQuote && post.title ? `<div class="line-bubble-title">${post.title}</div>` : ''}
            ${isQuote
              ? `<div class="line-bubble-quote">${post.body}</div>${post.source ? `<div class="line-bubble-source">— ${post.source}</div>` : ''}`
              : `<div>${post.body}</div>`}
            ${tagChips ? `<div class="line-bubble-tags">${tagChips}</div>` : ''}
          </div>
        </div>
        <div class="line-msg-meta">
          <button class="line-comment-btn ${comments.length ? 'has-comments' : ''}" title="コメント">💬${comments.length || ''}</button>
          <span class="line-msg-time">${timestamp}</span>
        </div>
      </div>
    `);

    // 既存コメント（右・緑吹き出し）
    comments.forEach(c => {
      const t = new Date(c.ts);
      const timeStr = `${t.getMonth()+1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
      html.push(`
        <div class="line-msg-right">
          <span class="line-comment-time">${timeStr}</span>
          <div class="line-bubble-green">${escapeHtml(c.text)}</div>
        </div>
      `);
    });

    // コメント入力欄（非表示）
    html.push(`
      <div class="line-comment-input-area" data-key="${key}">
        <input class="line-comment-input" type="text" placeholder="解釈・感想を書く…">
        <button class="line-comment-send">▶</button>
      </div>
    `);
  });

  if (remaining > 0) {
    const nextIn = INTERVAL_MS - (elapsed % INTERVAL_MS);
    const nextMin = Math.ceil(nextIn / 60000);
    html.push(`
      <div class="chat-waiting">
        <div class="chat-typing">
          <span></span><span></span><span></span>
        </div>
        <div class="chat-waiting-text">${p.name}さんは今考えています…（あと${remaining}通、次まで${nextMin}分）</div>
      </div>
    `);
  }

  list.innerHTML = html.join('');

  // 次の時刻で自動更新
  if (remaining > 0) {
    const nextIn = INTERVAL_MS - (elapsed % INTERVAL_MS);
    if (window._chatRefreshTimer) clearTimeout(window._chatRefreshTimer);
    window._chatRefreshTimer = setTimeout(() => {
      if (document.getElementById('view-timeline')?.classList.contains('active')) {
        renderTimeline();
      }
    }, nextIn + 500);
  }

  // チャットヘッダータップで偉人詳細へ
  const chatHead = list.querySelector('.chat-header');
  if (chatHead) chatHead.addEventListener('click', () => showPerson(p.id));

  // イベントリスナー
  list.addEventListener('click', (e) => {
    // タグチップ
    if (e.target.classList.contains('event-tag')) {
      e.stopPropagation();
      showTag(e.target.dataset.tag);
      return;
    }
    // コメントボタン
    const commentBtn = e.target.closest('.line-comment-btn');
    if (commentBtn) {
      e.stopPropagation();
      const msg = commentBtn.closest('.line-msg');
      const key = msg.dataset.key;
      const inputArea = list.querySelector(`.line-comment-input-area[data-key="${CSS.escape(key)}"]`);
      if (inputArea) {
        inputArea.classList.toggle('open');
        if (inputArea.classList.contains('open')) {
          inputArea.querySelector('.line-comment-input').focus();
        }
      }
      return;
    }
    // コメント送信
    const sendBtn = e.target.closest('.line-comment-send');
    if (sendBtn) {
      e.stopPropagation();
      const area = sendBtn.closest('.line-comment-input-area');
      const input = area.querySelector('.line-comment-input');
      const text = input.value.trim();
      if (!text) return;
      submitComment(area.dataset.key, text);
      input.value = '';
      return;
    }
    // 吹き出しクリックでは遷移しない（アバタークリックのみ人物詳細へ）
    const avatarClick = e.target.closest('.line-msg-avatar');
    if (avatarClick) {
      const msg = avatarClick.closest('.line-msg');
      if (msg && msg.dataset.id) showPerson(msg.dataset.id);
    }
  });

  // Enterで送信
  list.querySelectorAll('.line-comment-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        submitComment(input.closest('.line-comment-input-area').dataset.key, text);
        input.value = '';
      }
    });
  });
}

// ====================== 浮遊チャットウィジェット ======================
const CHAT_INTERVAL_MS = 60 * 1000; // 1分ごとに偉人が1通送る
const CHAT_SEEN_KEY = 'ijin_chat_seen';

function getSeenCount(personId) {
  try {
    const all = JSON.parse(localStorage.getItem(CHAT_SEEN_KEY) || '{}');
    return all[personId] || 0;
  } catch { return 0; }
}
function setSeenCount(personId, n) {
  try {
    const all = JSON.parse(localStorage.getItem(CHAT_SEEN_KEY) || '{}');
    all[personId] = n;
    localStorage.setItem(CHAT_SEEN_KEY, JSON.stringify(all));
  } catch {}
}

// IJiN（偉人の広場）は時間経過で自動生成される名言チャット。
// ページロード時に一度だけ『現在のスロット数まで既読扱い』にすることで、
// 『読んだのに通知が戻ってくる』現象を防ぐ（セッション中の新着だけ未読カウント）。
let __chatReadBootstrapped = false;
function bootstrapChatRead() {
  if (__chatReadBootstrapped) return;
  __chatReadBootstrapped = true;
  try {
    if (typeof DATA === 'undefined' || !DATA.people) return;
    const { messages } = getGroupMessages();
    localStorage.setItem(CHAT_LAST_READ_KEY, String(messages.length));
  } catch {}
}
function computeUnreadCount() {
  try {
    if (typeof DATA === 'undefined' || !DATA.people) return 0;
    bootstrapChatRead();
    const { messages } = getGroupMessages();
    const lastRead = parseInt(localStorage.getItem(CHAT_LAST_READ_KEY) || '0', 10);
    return Math.max(0, messages.length - lastRead);
  } catch { return 0; }
}

function updateChatBadge() {
  const badge = document.getElementById('chatFabBadge');
  if (!badge) return;
  const n = computeUnreadCount();
  if (n > 0) {
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// 1分ごとに未読数を再計算
setInterval(() => {
  if (document.getElementById('chatPanel')?.classList.contains('hidden')) {
    updateChatBadge();
  }
}, 30000);

function getTodaysCompanion() {
  const todayStr = new Date().toISOString().slice(0,10);
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(MOOD_PICK_KEY) || 'null'); } catch {}
  if (!saved || saved.date !== todayStr || !saved.personId) return null;
  const p = DATA.people.find(x => x.id === saved.personId);
  return p ? { person: p, chatStart: saved.chatStart || Date.now() } : null;
}

function getCompanionPosts(person) {
  const all = [];
  (person.events || []).forEach(e => {
    all.push({ type: 'event', year: e.year, age: e.age, title: e.title, body: e.detail, event: e });
  });
  (person.quotes || []).forEach(q => {
    all.push({ type: 'quote', year: null, title: null, body: q.text, source: q.source });
  });
  all.sort((a, b) => (a.year || person.birth || 0) - (b.year || person.birth || 0));
  return all;
}

// ユーザー送信時に chatStart を過去に戻して 1通多くアンロック
function advanceChatUnlock() {
  try {
    const saved = JSON.parse(localStorage.getItem(MOOD_PICK_KEY) || 'null');
    if (!saved) return;
    saved.chatStart = (saved.chatStart || Date.now()) - CHAT_INTERVAL_MS;
    localStorage.setItem(MOOD_PICK_KEY, JSON.stringify(saved));
  } catch {}
}

function renderChatPanel() {
  const body = document.getElementById('chatPanelBody');
  const head = document.getElementById('chatPanelHead');
  const form = document.getElementById('chatPanelForm');
  if (!body || !head) return;

  // 偉人の広場モード
  head.innerHTML = `
    <div class="chat-panel-head-info">
      <div class="chat-panel-head-name">IJiN</div>
      <div class="chat-panel-head-status">名言をつぶやき合う場所</div>
    </div>
  `;
  head.style.cursor = 'default';
  head.onclick = null;
  if (form) form.style.display = '';
  // 入力欄のプレースホルダー
  const input = document.getElementById('chatPanelInput');
  if (input) input.placeholder = '今の気持ちをつぶやく（280字まで・連絡先/暴言NG）';
  // 広場の中身を描画
  renderSquareInto(body);
  return;

  // （以下は以前の「今日の話し相手」ロジック。disabled）
  // eslint-disable-next-line no-unreachable
  const companion = getTodaysCompanion();
  if (!companion) {
    head.innerHTML = `<div class="chat-panel-head-name">今日の話し相手</div>`;
    body.innerHTML = `
      <div class="chat-panel-empty">
        ホームの「今日の気分は？」で<br>
        感情を選ぶと、偉人が話しかけに来ます。
      </div>
    `;
    if (form) form.style.display = 'none';
    return;
  }
  if (form) form.style.display = '';
  const p = companion.person;
  const avatar = p.imageUrl
    ? `<div class="chat-panel-head-avatar" style="background-image:url('${p.imageUrl}')"></div>`
    : `<div class="chat-panel-head-avatar">${p.name.charAt(0)}</div>`;
  head.innerHTML = `
    ${avatar}
    <div class="chat-panel-head-info">
      <div class="chat-panel-head-name">${p.name}</div>
      <div class="chat-panel-head-status">${p.field} · オンライン</div>
    </div>
  `;
  head.style.cursor = 'pointer';
  head.onclick = () => {
    closeChatPanel();
    showPerson(p.id);
  };

  // メッセージ（時間経過で解放）
  const allPosts = getCompanionPosts(p);
  const elapsed = Date.now() - companion.chatStart;
  const unlock = Math.min(allPosts.length, Math.floor(elapsed / CHAT_INTERVAL_MS) + 1);
  const posts = allPosts.slice(0, unlock);
  const remaining = allPosts.length - unlock;

  // チャット表示：メッセージ + その直後に自分のコメント
  const html = [];
  posts.forEach(post => {
    const key = post.type === 'quote'
      ? `quote::${p.id}::${post.body.slice(0,40)}`
      : `event::${p.id}::${post.year}::${post.title}`;
    const comments = (commentsData[key] || []);
    const timestamp = post.year ? `${post.year}年` : '';
    // お気に入り状態
    let isFav = false;
    if (post.type === 'quote') {
      isFav = favQuotes.has(quoteKey(p.id, { text: post.body }));
    } else if (post.event) {
      isFav = favEvents.has(eventKey(p.id, post.event));
    }
    html.push(`
      <div class="chat-msg chat-msg-them">
        <div class="chat-msg-avatar-sm" ${p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : ''}>${p.imageUrl ? '' : p.name.charAt(0)}</div>
        <div class="chat-msg-bubble" data-msg-key="${key}">
          ${post.title ? `<div class="chat-msg-title">${post.title}</div>` : ''}
          <div class="chat-msg-body">${post.body}</div>
          ${post.source ? `<div class="chat-msg-src">— ${post.source}</div>` : ''}
          <div class="chat-msg-footer">
            ${timestamp ? `<span class="chat-msg-time">${timestamp}</span>` : '<span></span>'}
            <button class="chat-msg-fav ${isFav ? 'active' : ''}" data-msg-key="${key}" aria-label="お気に入り">${isFav ? '★' : '☆'}</button>
          </div>
        </div>
      </div>
    `);
    comments.forEach(c => {
      const d = new Date(c.ts || Date.now());
      const ts = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
      html.push(`
        <div class="chat-msg chat-msg-me">
          <div class="chat-msg-bubble-me">
            <div>${escapeHtml(c.text)}</div>
            <div class="chat-msg-time-me">${ts}</div>
          </div>
        </div>
      `);
    });
  });

  // 呼びかけ（event/quoteに紐づかない単独メッセージ）も表示
  const callKey = `call::${p.id}`;
  const callMsgs = commentsData[callKey] || [];
  callMsgs.forEach(c => {
    const d = new Date(c.ts || Date.now());
    const ts = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    html.push(`
      <div class="chat-msg chat-msg-me">
        <div class="chat-msg-bubble-me">
          <div>${escapeHtml(c.text)}</div>
          <div class="chat-msg-time-me">${ts} · 呼びかけ</div>
        </div>
      </div>
    `);
  });

  if (remaining > 0) {
    const nextMin = Math.ceil((CHAT_INTERVAL_MS - (elapsed % CHAT_INTERVAL_MS)) / 60000);
    html.push(`
      <div class="chat-waiting-mini">
        <span class="chat-typing"><span></span><span></span><span></span></span>
        <span>あと${remaining}通 · 次まで${nextMin}分（呼びかけると早まる）</span>
      </div>
    `);
  }
  // 現在最新のメッセージキー（送信時に紐付ける）— innerHTML前に設定
  const latest = posts[posts.length - 1];
  if (latest) {
    const key = latest.type === 'quote'
      ? `quote::${p.id}::${latest.body.slice(0,40)}`
      : `event::${p.id}::${latest.year}::${latest.title}`;
    body.dataset.latestKey = key;
  } else {
    delete body.dataset.latestKey;
  }

  body.innerHTML = html.join('');
  body.scrollTop = body.scrollHeight;

  // お気に入りボタン
  body.querySelectorAll('.chat-msg-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.msgKey;
      // キーから post を特定
      const isQuote = key.startsWith('quote::');
      if (isQuote) {
        // quote key → 最初の40文字から quotes を検索
        const sliced = key.split('::').slice(2).join('::');
        const q = p.quotes.find(x => x.text.slice(0,40) === sliced);
        if (!q) return;
        const qk = quoteKey(p.id, q);
        if (favQuotes.has(qk)) favQuotes.delete(qk); else favQuotes.add(qk);
        saveSet(FAV_KEY_QUOTES, favQuotes);
        btn.classList.toggle('active');
        btn.textContent = favQuotes.has(qk) ? '★' : '☆';
      } else {
        // event key → year + title で検索
        const parts = key.split('::');
        const year = parseInt(parts[2]);
        const title = parts.slice(3).join('::');
        const ev = p.events.find(x => x.year === year && x.title === title);
        if (!ev) return;
        const ek = eventKey(p.id, ev);
        if (favEvents.has(ek)) favEvents.delete(ek); else favEvents.add(ek);
        saveSet(FAV_KEY_EVENTS, favEvents);
        btn.classList.toggle('active');
        btn.textContent = favEvents.has(ek) ? '★' : '☆';
      }
    });
  });

  // 表示時は既読扱いにする
  setSeenCount(p.id, unlock);
  updateChatBadge();

  // 保留中の自動更新タイマー
  if (window._chatRefreshTimer) clearTimeout(window._chatRefreshTimer);
  if (remaining > 0) {
    const nextIn = CHAT_INTERVAL_MS - (elapsed % CHAT_INTERVAL_MS);
    window._chatRefreshTimer = setTimeout(() => {
      if (!document.getElementById('chatPanel').classList.contains('hidden')) {
        renderChatPanel();
      }
    }, nextIn + 500);
  }
}

let __chatPanelTimer = null;
function openChatPanel() {
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('chatFab').classList.add('hidden');
  renderChatPanel();
  // 広場の最新スロットを既読に
  const { messages } = getGroupMessages();
  localStorage.setItem(CHAT_LAST_READ_KEY, String(messages.length));
  updateChatBadge();
  // 広場BGMを流す（他のBGMは停止）
  stopAllBgm();
  const bgm = document.getElementById('squareBgm');
  if (bgm && !isMuted()) {
    bgm.volume = 0.35;
    bgm.play().catch(() => {});
  }
  // 60秒ごとに自動再描画（新しいつぶやきを反映）
  if (__chatPanelTimer) clearInterval(__chatPanelTimer);
  __chatPanelTimer = setInterval(() => {
    if (!document.getElementById('chatPanel')?.classList.contains('hidden')) {
      const before = getGroupMessages().messages.length;
      renderChatPanel();
      const after = getGroupMessages().messages.length;
      if (after > before) {
        // 新着があれば既読を更新
        localStorage.setItem(CHAT_LAST_READ_KEY, String(after));
      }
    }
  }, 60 * 1000);
}
function closeChatPanel() {
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('chatFab').classList.remove('hidden');
  const bgm = document.getElementById('squareBgm');
  if (bgm) bgm.pause();
  if (__chatPanelTimer) { clearInterval(__chatPanelTimer); __chatPanelTimer = null; }
  updateChatBadge();
}

function initChatWidget() {
  const fab = document.getElementById('chatFab');
  const closeBtn = document.getElementById('chatPanelClose');
  const form = document.getElementById('chatPanelForm');
  const input = document.getElementById('chatPanelInput');
  const sendBtn = form ? form.querySelector('.chat-panel-send') : null;
  if (!fab) return;
  // チャット吹き出し → スマホを起動して偉人の広場まで遷移
  fab.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('powerBtn')?.click();
    setTimeout(() => {
      document.querySelector('[data-phone-action="plaza"]')?.click();
      setTimeout(() => {
        // トークタブに切替＋ grouptalk を開く
        document.querySelector('[data-plaza-tab="talks"]')?.click();
        setTimeout(() => {
          document.querySelector('[data-plaza-group]')?.click();
        }, 150);
      }, 200);
    }, 300);
  });
  closeBtn.addEventListener('click', closeChatPanel);

  async function doSend() {
    const text = input.value.trim();
    if (!text) return;
    // 広場に自分のつぶやきを投稿（コンテンツフィルタ適用）
    const err = validatePost(text);
    if (err) { alert(err); return; }
    saveSelfPost(text);
    playSfxSend();
    input.value = '';
    renderChatPanel();
    // 偉人がすぐに応答（5〜12秒後にランダムな今日のメンバーから）
    scheduleQuickReply(text);
  }
  // フォーム送信・ボタンクリック・Enter全部拾う
  form.addEventListener('submit', (e) => { e.preventDefault(); doSend(); });
  if (sendBtn) sendBtn.addEventListener('click', (e) => { e.preventDefault(); doSend(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  });

  // 起動時にバッジ更新
  updateChatBadge();
  // 呼びかけバブルを定期的に表示
  setTimeout(showChatCall, 4000);
  setInterval(showChatCall, 90000); // 1分30秒ごとに表示検討
}

// 「おーい」と呼びかけるバブル
const CHAT_CALL_LAST_KEY = 'ijin_chat_call_last';
function showChatCall() {
  const panel = document.getElementById('chatPanel');
  if (!panel || !panel.classList.contains('hidden')) return; // パネル開いてる時は出さない
  const bubble = document.getElementById('chatCallBubble');
  if (!bubble) return;
  const companion = getTodaysCompanion();
  if (!companion) return;
  // 未読があるときだけ呼びかける
  const unread = computeUnreadCount();
  if (unread === 0) return;
  // 頻度抑制（60秒以内に出したら次はスキップ）
  const last = Number(localStorage.getItem(CHAT_CALL_LAST_KEY) || 0);
  if (Date.now() - last < 60000) return;
  localStorage.setItem(CHAT_CALL_LAST_KEY, String(Date.now()));

  const name = getUserName();
  const p = companion.person;
  const hour = new Date().getHours();
  const timeOfDay = hour < 5 ? 'night' : hour < 11 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
  const N = name || 'きみ';

  // 時間帯別の挨拶
  const timeVariants = {
    morning: [
      `おはよう、${N}。`,
      `朝の光は好きか？`,
      `目が覚めたばかり？`,
      `今日はどんな一日になるだろうな。`,
      `朝のうちに、少し話していかないか。`,
    ],
    afternoon: [
      `${N}、昼間に少し時間はあるか？`,
      `午後の一息、一緒にどうだ。`,
      `何か退屈してないか？`,
      `今ちょうど、君のことを考えていた。`,
    ],
    evening: [
      `${N}、夕方だな。`,
      `今日はお疲れ。`,
      `日が沈む頃、話したくなる。`,
      `一日を振り返ってみるか？`,
      `静かな時間に、少しだけ。`,
    ],
    night: [
      `${N}、眠れないのか？`,
      `夜は長い。話し相手はいるか？`,
      `僕も夜型なんだ。`,
      `こんな時間まで起きているのか。`,
      `月は見たか？`,
      `静寂の中でこそ、言葉が届く気がする。`,
    ],
  };

  // 汎用のバリエーション
  const generalVariants = [
    `おーい、${N}。`,
    `ねえ、聞いて。`,
    `${N}、ちょっといいか？`,
    `そこにいるか？`,
    `${N}さん、話がある。`,
    `聞いてほしいことがある。`,
    `ひとつだけ伝えたいことがあるんだ。`,
    `${N}、手が空いたら読んでくれ。`,
    `ふと、君のことを思い出した。`,
    `時代は違えど、僕たちは似ている気がする。`,
    `${N}、最近どう？`,
    `僕の話、聞いてくれるか？`,
    `なあ、${N}。`,
    `${N}、少しだけ付き合ってくれないか。`,
    `こんにちは、${N}。僕だ。`,
    `返事はいらない。ただ、聞いてほしい。`,
    `${N}、ここに来てくれたんだな。`,
    `僕の言葉、届いているか？`,
    `一緒に考えてほしいことがある。`,
    `${N}、迷ってるのか？`,
    `君の悩み、僕にも覚えがある。`,
    `時を越えて、ひとつ教えてやろうか。`,
    `${N}、ちょっとだけ話さないか。`,
    `やあ、${N}。また会えたな。`,
    `${N}、どうして今日はここに来た？`,
    `何か言いたいことがありそうな顔だ。`,
    `${N}、忘れないでくれ。`,
    `僕はここにいる、いつでも。`,
    `${N}、今日も生きてるか。`,
    `静かな瞬間こそ、大事にしたい。`,
    `${N}、僕の時代にも同じことで悩む奴がいた。`,
  ];

  const pool = [...(timeVariants[timeOfDay] || []), ...generalVariants];
  const msg = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById('chatCallText').textContent = msg;
  document.getElementById('chatCallWho').textContent = `— ${p.name}`;
  bubble.classList.remove('hidden');
  bubble.classList.add('pop');
  // クリックでチャットを開く
  bubble.onclick = () => {
    bubble.classList.add('hidden');
    openChatPanel();
  };
  // 8秒後に自動で消す
  clearTimeout(showChatCall._t);
  showChatCall._t = setTimeout(() => {
    bubble.classList.remove('pop');
    bubble.classList.add('hidden');
  }, 8000);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function submitComment(key, text) {
  const comment = { text, ts: new Date().toISOString(), userId: 'me' };
  // ローカルデータに追加
  if (!commentsData[key]) commentsData[key] = [];
  commentsData[key].push(comment);
  // localStorageにも保存
  try { localStorage.setItem('ijin_comments', JSON.stringify(commentsData)); } catch {}
  // サーバーに保存（ある場合）
  try {
    await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, comment }),
    });
  } catch (_) { /* オフライン時はローカルのみ */ }
  // チャットウィジェットが開いていれば再描画
  if (!document.getElementById('chatPanel')?.classList.contains('hidden')) {
    renderChatPanel();
  }
}

// ====================== 読みもの ======================
// ============== 📝 サイト内ブログ記事（SEO×アフィリエイト） ==============
const BLOG_POSTS = [
  {
    id: 'shinsengumi-beginner',
    title: '【完全版】新選組 初心者ガイド — 推しが見つかる5つの入口',
    emoji: '⚔️',
    category: '新選組',
    date: '2026年4月',
    lead: '大河ドラマで興味持ったけど名前が多すぎてわからない…そんなあなたへ。新選組の核メンバー5人を、キャラ別の「沼の入口」として紹介します。',
    coverGradient: 'linear-gradient(135deg, #8c1d2f, #2d0a13)',
    sections: [
      {h: '1. 近藤勇 — 局長にして家族想い', people:['kondo_isami'], body:'試衛館時代から仲間を「家族」と呼んだ男。百姓の出ながら誰よりも武士らしくあろうとした生き方が刺さる。'},
      {h: '2. 土方歳三 — 「鬼の副長」の素顔', people:['hijikata_toshizo'], body:'俳人でもあった繊細な内面と、隊規を徹底した非情さ。洋装姿の写真は「日本一セクシーな武士」とも。'},
      {h: '3. 沖田総司 — 25歳で逝った天才剣士', people:['okita_soji'], body:'朗らかで子ども好き、それでいて無敵の剣。病と戦いながらも最後まで笑った青年の姿。'},
      {h: '4. 斎藤一 — 謎の三番隊組長', people:['saito_hajime'], body:'無口で私情を語らない剣士。明治まで生き、女学校の守衛として穏やかな晩年を送った。るろ剣モデル。'},
      {h: '5. 永倉新八 — 真実を伝えた最後の証人', people:['nagakura_shinpachi'], body:'明治維新後、北海道で『新選組顛末記』を書き残した。彼の記録がなければ多くの真実は埋もれていた。'}
    ],
    cta: {kind:'beginner'},
    affiliateBooks: ['燃えよ剣 上|司馬遼太郎|4167105764', '壬生義士伝 上|浅田次郎|4167646064', '新選組顛末記|永倉新八|4101387168'],
    relatedTheme: 'shinsengumi'
  },
  {
    id: 'bakumatsu-ranking',
    title: '幕末志士ランキング — 歴女が選ぶ「推したい男」ベスト5',
    emoji: '🏯',
    category: '幕末',
    date: '2026年4月',
    lead: '短く激しく生きた幕末の男たち。時代に選ばれ、時代に散った5人の生き様を「推しポイント」付きで紹介。',
    coverGradient: 'linear-gradient(135deg, #6b4e2e, #2a1a0e)',
    sections: [
      {h: '1位. 坂本龍馬 — 時代を越えた自由人', people:['sakamoto_ryoma'], body:'脱藩浪人が薩長同盟を結び、大政奉還を導いた。海援隊、新婚旅行、暗殺——物語として完璧すぎる生涯。'},
      {h: '2位. 高杉晋作 — 29歳の風雲児', people:['takasugi_shinsaku'], body:'「おもしろきこともなき世をおもしろく」。奇兵隊創設、功山寺挙兵、肺結核で早世。短いほど美しい。'},
      {h: '3位. 吉田松陰 — 松下村塾の魂の教師', people:['yoshida_shoin'], body:'「諸君、狂いたまえ」。1年半で維新の志士を育て、29歳で処刑。教育者としての伝説。'},
      {h: '4位. 勝海舟 — 江戸を救った皮肉屋', people:['katsu_kaishu'], body:'咸臨丸、江戸無血開城、「コレデオシマイ」。龍馬の師にして100万人の江戸を守った男。'},
      {h: '5位. 木戸孝允（桂小五郎） — 逃げの小五郎', people:['kido_takayoshi'], body:'池田屋事件で生き延び、薩長同盟を結び、幾松と結ばれる。生存力と愛、両方揃った存在。'}
    ],
    cta: {kind:'theme', theme:'bakumatsu'},
    affiliateBooks: ['竜馬がゆく 1|司馬遼太郎|4167663015', '世に棲む日日 1|司馬遼太郎|4167105780', '氷川清話|勝海舟|4061594931'],
    relatedTheme: 'bakumatsu'
  },
  {
    id: 'seichi-junrei-guide',
    title: '新選組・幕末の聖地巡礼スポット8選 — 京都から函館まで',
    emoji: '🏨',
    category: '聖地巡礼',
    date: '2026年4月',
    lead: '推しの足跡を追う旅。京都の壬生・池田屋から、萩の松下村塾、函館の五稜郭まで。一度は行きたい歴史の聖地を厳選。',
    coverGradient: 'linear-gradient(135deg, #2a3d4f, #0f1820)',
    sections: [
      {h: '🏯 京都・壬生屯所', body:'新選組が本拠地とした八木家・前川家。近藤・土方・沖田が実際に住んだ場所。現在も公開中、ガイドツアー有。'},
      {h: '⚔️ 京都・池田屋址（三条）', body:'池田屋事件の現場。現在は居酒屋「池田屋はなの舞」として営業。階段の吹き抜けが当時の屋敷構造を残す。'},
      {h: '🌸 京都・霊山護国神社', body:'龍馬・中岡慎太郎・木戸孝允らの墓所。幕末志士の聖地。京都東山の霊山歴史館も併設。'},
      {h: '🏔 会津若松・鶴ヶ城', body:'新島八重が籠城戦を戦った天守。会津の覚悟を今に伝える。白虎隊の飯盛山と共に巡礼必須。'},
      {h: '📚 萩・松下村塾', body:'吉田松陰が高杉・伊藤・山縣を育てた塾。わずか8畳の講義室がそのまま残る。萩の城下町散策もセット。'},
      {h: '🎐 下関・東行庵', body:'高杉晋作の墓所。愛人おうのが庵主として守り続けた庭。梅雨時が最も美しい。'},
      {h: '🌊 高知・坂本龍馬生誕地', body:'桂浜の龍馬像と合わせて訪れたい。龍馬記念館は近代的でデートにも最適。'},
      {h: '⚓ 函館・五稜郭', body:'土方歳三最期の地。星形要塞と函館の街並み。春の桜と夏の夜景が格別。'}
    ],
    cta: {kind:'travel'},
    affiliateBooks: [],
    relatedTheme: 'bakumatsu'
  }
];

function renderBlogPostsBlock() {
  const list = document.getElementById('articlesList');
  if (!list) return;
  const blogHtml = `
    <div class="blog-posts-block">
      <div class="blog-posts-head">
        <h2 class="blog-posts-title">📝 読みもの — 偉人と自分の編集部</h2>
        <p class="blog-posts-sub">歴女向けの入門・推しの見つけ方・聖地巡礼ガイドを連載中。</p>
      </div>
      <div class="blog-posts-grid">
        ${BLOG_POSTS.map(p => `
          <button type="button" class="blog-post-card" data-blog-open="${p.id}" onclick="window.showBlogPost && window.showBlogPost('${p.id}')" style="background:${p.coverGradient}">
            <div class="blog-post-badge">${escapeHtml(p.category)}</div>
            <div class="blog-post-emoji">${p.emoji}</div>
            <div class="blog-post-card-title">${escapeHtml(p.title)}</div>
            <div class="blog-post-lead">${escapeHtml(p.lead)}</div>
            <div class="blog-post-meta">${escapeHtml(p.date)} ・ 続きを読む →</div>
          </button>`).join('')}
      </div>
    </div>`;
  // 既存の list の先頭に挿入
  list.insertAdjacentHTML('afterbegin', blogHtml);
}

function showBlogPost(postId) {
  const post = BLOG_POSTS.find(p => p.id === postId);
  if (!post) return;
  // URL更新
  try {
    const url = new URL(location.href);
    url.searchParams.set('post', postId);
    history.pushState({post: postId}, '', url.toString());
  } catch {}
  const existing = document.getElementById('blogPostModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'blogPostModal';
  modal.className = 'era-page-modal blog-post-modal';
  const relatedPeopleHtml = (ids) => (ids || []).map(pid => {
    const p = DATA.people.find(x => x.id === pid);
    if (!p) return '';
    const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
    return `<button class="blog-person-chip" data-jump-person="${pid}"><span class="blog-person-av" ${bg}>${p.imageUrl ? '' : (p.name?.charAt(0) || '?')}</span><span>${escapeHtml(p.name)}</span></button>`;
  }).join('');
  const sectionsHtml = post.sections.map(s => `
    <section class="blog-section">
      <h2 class="blog-h2">${escapeHtml(s.h)}</h2>
      ${s.people ? `<div class="blog-person-chips">${relatedPeopleHtml(s.people)}</div>` : ''}
      <p class="blog-body">${escapeHtml(s.body)}</p>
    </section>`).join('');
  // アフィリ本
  const affHtml = (post.affiliateBooks || []).length ? `
    <section class="blog-section">
      <h2 class="blog-h2">📚 あわせて読みたい本 <span class="pr-tag">PR</span></h2>
      <div class="beginner-books">
        ${post.affiliateBooks.map(s => {
          const [t, a, asin] = s.split('|');
          const amz = `https://www.amazon.co.jp/dp/${asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`;
          const rak = rakutenSearchUrl(t, a);
          return `
            <div class="beginner-book">
              <a class="beginner-book-cover" href="${amz}" target="_blank" rel="noopener sponsored">
                <img src="${amazonCover(asin)}" alt="${escapeHtml(t)}" loading="lazy"
                  onerror="this.parentElement.classList.add('no-cover');this.remove();"
                  onload="if(this.naturalWidth<50){this.parentElement.classList.add('no-cover');this.remove();}">
                <div class="beginner-book-fallback"><div>✦</div><div class="beginner-book-fb-title">${escapeHtml(t)}</div></div>
              </a>
              <div class="beginner-book-info">
                <div class="beginner-book-title">${escapeHtml(t)}</div>
                <div class="beginner-book-author">${escapeHtml(a)}</div>
                <div class="beginner-book-stores">
                  <a class="beginner-book-store amz" href="${amz}" target="_blank" rel="noopener sponsored">Amazon</a>
                  <a class="beginner-book-store rak" href="${rak}" target="_blank" rel="noopener sponsored">楽天</a>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </section>` : '';
  // CTA
  const ctaHtml = post.cta?.kind === 'beginner' ? `
    <section class="blog-section blog-cta">
      <h2 class="blog-h2">🌸 もっと深く知るには</h2>
      <button type="button" class="blog-cta-btn" onclick="document.getElementById('blogPostModal')?.remove();document.body.classList.remove('modal-open');setTimeout(()=>window.showBeginnerGuide && window.showBeginnerGuide(),50)">🌸 歴女入門ガイドを開く →</button>
    </section>` : post.cta?.kind === 'theme' ? `
    <section class="blog-section blog-cta">
      <h2 class="blog-h2">👥 関連テーマ</h2>
      <button type="button" class="blog-cta-btn" onclick="document.getElementById('blogPostModal')?.remove();document.body.classList.remove('modal-open');setTimeout(()=>window.showThemePage && window.showThemePage('${post.cta.theme}'),50)">このテーマを開く →</button>
    </section>` : '';

  modal.innerHTML = `
    <div class="era-page-backdrop" data-close="1"></div>
    <article class="era-page">
      <button class="era-page-close" data-close="1" aria-label="閉じる">×</button>
      <header class="era-page-hero" style="background:${post.coverGradient}">
        <div class="era-page-hero-inner">
          <div class="blog-category-badge">${post.emoji} ${escapeHtml(post.category)}</div>
          <h1 class="era-page-title" style="font-size:22px;line-height:1.4">${escapeHtml(post.title)}</h1>
          <div class="blog-post-date">${escapeHtml(post.date)}</div>
        </div>
      </header>
      <section class="era-page-section">
        <p class="blog-lead">${escapeHtml(post.lead)}</p>
      </section>
      ${sectionsHtml}
      ${affHtml}
      ${ctaHtml}
    </article>
  `;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => modal.classList.add('open'));
  modal.querySelectorAll('[data-close="1"]').forEach(el => el.addEventListener('click', () => {
    modal.remove(); document.body.classList.remove('modal-open');
    try { const url = new URL(location.href); url.searchParams.delete('post'); history.pushState({}, '', url.toString()); } catch {}
  }));
  modal.querySelectorAll('[data-jump-person]').forEach(el => el.addEventListener('click', () => {
    const pid = el.dataset.jumpPerson;
    modal.remove(); document.body.classList.remove('modal-open');
    setTimeout(() => showPerson(pid), 50);
  }));
}
window.showBlogPost = showBlogPost;

function renderArticles() {
  const header = document.getElementById('articlesHeader');
  const list = document.getElementById('articlesList');
  if (!header || !list) return;
  const a = DATA.articleAuthor;
  header.innerHTML = `
    <div class="articles-author">
      <div class="articles-author-name">${a.name || ''}</div>
      <div class="articles-author-bio">${a.bio || ''}</div>
      <a class="articles-author-link" href="${a.noteUrl || '#'}" target="_blank" rel="noopener">
        Note をフォローする →
      </a>
    </div>
    <div class="articles-coming-soon">
      <div class="articles-coming-soon-badge">Coming Soon</div>
      <div class="articles-coming-soon-title">✍ 有料会員の方は、ご自身のNoteやブログをここに埋め込めるようになります</div>
      <div class="articles-coming-soon-sub">近日実装予定。あなたの書いた記事を、偉人たちの物語と並べて本棚に並べられるようになります。</div>
    </div>
  `;
  // 内部ブログ記事をまず表示
  list.innerHTML = '';
  renderBlogPostsBlock();
  if (DATA.articles.length === 0) {
    return; // ブログだけ表示して終了
  }
  const articlesHtml = DATA.articles.map(art => {
    const tagChips = (art.relatedTags || []).map(tid => {
      const t = DATA.tagMap[tid];
      return t ? `<span class="article-tag">${t.name}</span>` : '';
    }).join('');
    const personLinks = (art.relatedPeople || []).map(pid => {
      const p = DATA.people.find(x => x.id === pid);
      return p ? `<span class="article-person" data-id="${pid}">${p.name}</span>` : '';
    }).join('');
    const authorName = (DATA.articleAuthor && DATA.articleAuthor.name) || '';
    return `
      <a class="article-card" href="${art.url}" target="_blank" rel="noopener">
        ${authorName ? `<div class="article-author-name">${authorName}</div>` : ''}
        ${art.thumbnail ? `<div class="article-thumb" style="background-image:url('${art.thumbnail}')"></div>` : ''}
        <div class="article-card-inner">
          <div class="article-badges">
            <span class="article-source">${art.source || 'web'}</span>
            ${art.category ? `<span class="article-category">${art.category}</span>` : ''}
          </div>
          <h3 class="article-title">${art.title}</h3>
          <p class="article-desc">${art.description || ''}</p>
          <div class="article-meta">
            <span class="article-date">${art.date || ''}</span>
          </div>
          ${(tagChips || personLinks) ? `
            <div class="article-relations">
              ${tagChips}${personLinks}
            </div>
          ` : ''}
        </div>
      </a>
    `;
  });
  // 3の倍数に満たない場合、空の本で埋める
  const remainder = articlesHtml.length % 3;
  const fillCount = remainder === 0 ? 0 : 3 - remainder;
  const placeholders = Array(fillCount).fill(0).map(() => `
    <div class="article-card article-card-empty">
      <div class="article-card-empty-inner">
        <div class="article-card-empty-text">Coming soon</div>
      </div>
    </div>
  `);
  list.innerHTML = `<div class="article-grid">${articlesHtml.join('')}${placeholders.join('')}</div>`;
  // ブログカードクリックでページめくり音＋BGM停止
  list.querySelectorAll('a.article-card').forEach(a => {
    a.addEventListener('click', () => playBookOpenFx());
  });
}

// ====================== お気に入り ======================
function renderFavorites() {
  const list = document.getElementById('favoritesList');
  const favPeopleItems = DATA.people.filter(p => favPeople.has(p.id));
  const favEventItems = [];
  const favQuoteItems = [];
  DATA.people.forEach(p => {
    (p.events || []).forEach(e => {
      if (favEvents.has(eventKey(p.id, e))) favEventItems.push({ person: p, event: e });
    });
    (p.quotes || []).forEach(q => {
      if (favQuotes.has(quoteKey(p.id, q))) favQuoteItems.push({ person: p, quote: q });
    });
  });
  favEventItems.sort((a, b) => a.event.year - b.event.year);

  const favRoutineItems = DATA.people.filter(p => favRoutines.has(p.id) && p.routine && p.routine.length);
  // 代表作
  const favWorkItems = [];
  DATA.people.forEach(p => {
    (p.works || []).forEach(w => {
      if (favWorks.has(workKey(p.id, w))) favWorkItems.push({ person: p, work: w });
    });
  });
  const FAV_TAGS_KEY = 'ijin_fav_tags';
  const favTagSet = loadSet(FAV_TAGS_KEY);
  const favTagItems = DATA.tags.filter(t => favTagSet.has(t.id));
  const diaryEntries = loadDiary();
  const letterEntries = loadLetters();
  const selfPostEntries = loadSelfPosts();
  // しおり（最近読んだ、お気に入り登録済みは除外、最大6人）
  const bookmarks = loadBookmarks();
  const favPeopleSetForBm = new Set(favPeopleItems.map(p => p.id));
  const recentlyReadItems = bookmarks
    .filter(b => !favPeopleSetForBm.has(b.id))
    .map(b => DATA.people.find(p => p.id === b.id))
    .filter(Boolean)
    .slice(0, 6);
  const totalCollections = favPeopleItems.length + favEventItems.length + favQuoteItems.length + favRoutineItems.length + favTagItems.length + recentlyReadItems.length + favWorkItems.length;
  const totalItems = totalCollections + diaryEntries.length + letterEntries.length + selfPostEntries.length;

  if (totalItems === 0) {
    const isLoggedIn = typeof currentUser !== 'undefined' && currentUser;
    list.innerHTML = `
      <div class="my-book-empty">
        <div class="my-book-empty-cover">
          <div class="my-book-empty-inner">
            <div class="my-book-empty-ornament">◆</div>
            <div class="my-book-empty-title">あなたの本</div>
            <div class="my-book-empty-sub">まだ白紙です</div>
            <div class="my-book-empty-ornament">◆</div>
          </div>
        </div>
        <div class="my-book-empty-text">
          <p class="my-book-empty-hero">
            夜、どうしても眠れないとき。<br>
            朝、どうしても立ち上がれないとき。
          </p>
          <p class="my-book-empty-body">
            偉人の言葉・出来事・ルーティンの <b>☆</b> をタップすると<br>
            ここに集まって、<br>
            <b>あなただけの一冊</b>ができあがります。
          </p>
          <p class="my-book-empty-body my-book-empty-poem">
            夜明けには消えてしまう、<br>
            その心細い夜の記録を。
          </p>
          ${renderGuideChara({ pose: 'welcome', copyKey: 'mybookEmpty', size: 'md', layout: 'below' })}
        </div>
      </div>
    `;
    return;
  }

  // 「私の本」スタイルの装丁
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;

  // 目次を先に組み立てる
  const kanjiNum = ['一','二','三','四','五','六','七','八','九','十'];
  const tocItems = [];
  const stampsMap = loadStamps();
  const stampedPeople = Object.keys(stampsMap).filter(k => stampsMap[k] > 0).map(id => DATA.people.find(p => p.id === id)).filter(Boolean);
  if (stampedPeople.length > 0) tocItems.push({ id: 'chap-stamps', title: 'スタンプ帳', count: stampedPeople.length });
  if (recentlyReadItems.length > 0) tocItems.push({ id: 'chap-recent', title: '続きから読む', count: recentlyReadItems.length });
  if (favPeopleItems.length > 0) tocItems.push({ id: 'chap-people', title: 'お手本にしたい人', count: favPeopleItems.length });
  if (favQuoteItems.length > 0) tocItems.push({ id: 'chap-quotes', title: '心に留める言葉', count: favQuoteItems.length });
  if (favTagItems.length > 0) tocItems.push({ id: 'chap-tags', title: '向き合いたい感情', count: favTagItems.length });
  if (favRoutineItems.length > 0) tocItems.push({ id: 'chap-routines', title: '取り入れたいルーティン', count: favRoutineItems.length });
  if (favWorkItems.length > 0) tocItems.push({ id: 'chap-works', title: '心に残る代表作', count: favWorkItems.length });
  if (favEventItems.length > 0) tocItems.push({ id: 'chap-events', title: 'なぞりたい瞬間', count: favEventItems.length });
  if (letterEntries.length > 0) tocItems.push({ id: 'chap-letters', title: '偉人への手紙', count: letterEntries.length });
  if (selfPostEntries.length > 0) tocItems.push({ id: 'chap-tweets', title: 'わたしのつぶやき', count: selfPostEntries.length });
  tocItems.push({ id: 'chap-diary', title: 'わたしの日記', count: diaryEntries.length });

  const userName = getUserName();
  const title = currentTitle();
  // 称号は上段・名前は下段の2行表示（文字詰まり防止）
  const bookTitle = userName
    ? (title
        ? `<span class="book-title-badge">【${title}】</span><br><span class="book-title-name">${userName}の本</span>`
        : `${userName}の本`)
    : 'わたしの本';

  let html = `
    <div class="open-book">
      <!-- 左ページ: 扉絵（タイトルページ） -->
      <div class="open-page open-page-left">
        <div class="title-page">
          <div class="title-page-top">◆</div>
          <div class="title-page-title">${bookTitle}</div>
          <div class="title-page-sub">My Own Book of Virtue</div>
          <div class="title-page-divider"><span></span></div>
          <div class="title-page-meta">
            <div class="title-page-meta-item"><strong>${totalItems}</strong><span>編</span></div>
          </div>
          <div class="title-page-date">更新 ${dateStr}</div>
          <div class="title-page-social">
            <button class="title-page-social-item" data-open-social="following">
              <div class="title-page-social-num" id="tpFollowingNum">${favPeople.size + loadUserFollows().size}</div>
              <div class="title-page-social-lbl">フォロー中</div>
            </button>
            <button class="title-page-social-item" data-open-social="followers">
              <div class="title-page-social-num" id="tpFollowerNum">${DATA.people.filter(p => isFollowedByPerson(p.id)).length}</div>
              <div class="title-page-social-lbl">フォロワー</div>
            </button>
            <button class="title-page-social-item" data-open-social="blocked">
              <div class="title-page-social-num">${collectBlockedFromFollowed().length}</div>
              <div class="title-page-social-lbl">ブロック中</div>
            </button>
          </div>
          ${(typeof currentUser !== 'undefined' && currentUser) ? `
            <button class="title-page-edit-name" id="openUsersDirBtn">👥 会員を探す</button>
            <button class="title-page-edit-name" id="shareMyProfileBtn">🔗 マイIDをシェア</button>
          ` : ''}
          <div class="title-page-stamp-count">
            獲得スタンプ <strong>${totalStamps()}</strong> 個 ／ 足跡 <strong>${totalFootprints()}</strong> ／ 聖地巡礼 <strong>${totalCheckins()}</strong>
          </div>
          <div class="title-page-bottom">◆</div>
        </div>
      </div>
      <!-- 右ページ: 目次 -->
      <div class="open-page open-page-right">
        <div class="my-book-toc">
          <div class="my-book-toc-head">目次</div>
          <div class="my-book-toc-line"></div>
          <ol class="my-book-toc-list">
            ${tocItems.map((t, i) => `
              <li>
                <a class="my-book-toc-link" data-scroll="${t.id}">
                  <span class="toc-num">第${kanjiNum[i] || (i+1)}章</span>
                  <span class="toc-title">${t.title}</span>
                  <span class="toc-count">${t.count}</span>
                </a>
              </li>
            `).join('')}
          </ol>
        </div>
      </div>
    </div>
  `;

  // 章番号を自動で降る
  let chapIdx = 0;
  const nextChap = () => kanjiNum[chapIdx++] || (chapIdx);

  // スタンプ帳
  if (stampedPeople.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-stamps">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">スタンプ帳</div>
        <div class="my-book-chapter-line"></div>
        <div class="my-book-chapter-intro">親密度クイズで集めたスタンプ一覧。称号は総スタンプ数で決まります。</div>
      </div>
      <div class="stamp-criteria-box">
        <div class="stamp-criteria-title">🏷 称号の段階</div>
        <div class="stamp-criteria-list">
          ${TITLES.filter(t => t.name).map(t => {
            const met = totalStamps() >= t.min;
            return `<div class="stamp-criteria-row ${met ? 'met' : ''}"><span class="stamp-criteria-min">${t.min}+</span><span class="stamp-criteria-name">${met ? '✓ ' : ''}${t.name}</span></div>`;
          }).join('')}
        </div>
      </div>
      <div class="stamp-book-grid">
        ${stampedPeople.map(p => {
          const lv = stampsMap[p.id];
          const avatar = p.imageUrl
            ? `<div class="stamp-book-avatar" style="background-image:url('${p.imageUrl}')"></div>`
            : `<div class="stamp-book-avatar noimg">${p.name.charAt(0)}</div>`;
          return `
            <div class="stamp-book-card" data-id="${p.id}">
              ${avatar}
              <div class="stamp-book-name">${p.name}</div>
              <div class="stamp-book-level">Lv.${lv}</div>
              <div class="stamp-book-seals">${'★'.repeat(lv)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 続きから読む（しおり）
  if (recentlyReadItems.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-recent">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">続きから読む</div>
        <div class="my-book-chapter-line"></div>
        <div class="my-book-chapter-intro">最近しおりを挟んだ偉人たち。</div>
      </div>
      <div class="book-grid" style="margin-bottom:20px">
    `;
    html += recentlyReadItems.map(p => {
      const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
      const following = isFavPerson(p.id);
      return `
        <div class="person-book ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
          <button class="person-book-follow ${following ? 'active' : ''}" data-follow-toggle="${p.id}">${following ? '✓ フォロー中' : '＋ フォロー'}</button>
          <div class="person-book-overlay"></div>
          ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
          <div class="person-book-info">
            ${p.nameEn ? `<div class="person-book-en">${p.nameEn}</div>` : ''}
            <div class="person-book-name">${p.name}</div>
            <div class="person-book-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field}</div>
          </div>
        </div>
      `;
    }).join('');
    html += `</div>`;
  }

  // 第一章: お手本にしたい人
  if (favPeopleItems.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-people">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">お手本にしたい人</div>
        <div class="my-book-chapter-line"></div>
      </div>
      <div class="book-grid" style="margin-bottom:20px">
    `;
    html += favPeopleItems.map(p => {
      const bg = p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : '';
      return `
        <div class="person-book ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
          <div class="person-book-overlay"></div>
          ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
          <div class="person-book-info">
            ${p.nameEn ? `<div class="person-book-en">${p.nameEn}</div>` : ''}
            <div class="person-book-name">${p.name}</div>
            <div class="person-book-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field}</div>
          </div>
        </div>
      `;
    }).join('');
    html += `</div>`;
  }

  // 心に留める言葉
  if (favQuoteItems.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-quotes">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">心に留める言葉</div>
        <div class="my-book-chapter-line"></div>
      </div>
    `;
    html += favQuoteItems.map(m => `
      <blockquote class="quote my-book-quote" data-id="${m.person.id}">
        ${favQuoteBtn(m.person.id, m.quote)}
        <div class="quote-text">${m.quote.text}</div>
        <div class="quote-source">— ${m.person.name}${m.quote.source ? ` / ${m.quote.source}` : ''}</div>
      </blockquote>
    `).join('');
  }

  // 向き合いたい感情（お気に入りタグ）
  if (favTagItems.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-tags">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">向き合いたい感情</div>
        <div class="my-book-chapter-line"></div>
      </div>
    `;
    const tagBgMap = {
      'spine-wine': 'linear-gradient(135deg, var(--wine) 0%, var(--wine-dark) 100%)',
      'spine-green': 'linear-gradient(135deg, #3d4e3e 0%, #2a3a2b 100%)',
      'spine-navy': 'linear-gradient(135deg, #253245 0%, #141d2e 100%)',
      'spine-brown': 'linear-gradient(135deg, #4a2f1a 0%, #2e1c0d 100%)',
      'spine-ink': 'linear-gradient(135deg, #1a130c 0%, #0d0905 100%)',
      'spine-ochre': 'linear-gradient(135deg, #6b5020 0%, #483318 100%)',
    };
    html += `<div class="book-grid" style="margin-bottom:20px">`;
    html += favTagItems.map(t => {
      const bg = tagBgMap[spineColor('t_' + t.id)] || tagBgMap['spine-wine'];
      // 感情タグ件数を集計
      let count = 0;
      DATA.people.forEach(p => {
        (p.events || []).forEach(e => {
          if ((e.tags || []).includes(t.id)) count++;
        });
      });
      return `
        <a class="article-card tag-book-card" data-tag="${t.id}" style="background:${bg}">
          <div class="article-author-name tag-book-count">${count} の軌跡</div>
          <div class="tag-book-center">
            <div class="cover-tag-ornament">◆</div>
            <div class="tag-book-name">${t.name}</div>
            <div class="cover-tag-ornament">◆</div>
          </div>
          <div class="article-card-inner tag-book-inner">
            <div class="tag-book-desc">${t.description}</div>
          </div>
        </a>
      `;
    }).join('');
    html += `</div>`;
  }

  // 取り入れたいルーティン
  if (favRoutineItems.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-routines">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">取り入れたいルーティン</div>
        <div class="my-book-chapter-line"></div>
      </div>
    `;
    html += favRoutineItems.map(p => {
      const avatar = p.imageUrl
        ? `<div class="routine-avatar" style="background-image:url('${p.imageUrl}')"></div>`
        : `<div class="routine-avatar">${p.name.charAt(0)}</div>`;
      return `
        <div class="routine-card" data-id="${p.id}" data-peek-id="${p.id}">
          ${favRoutineBtn(p.id)}
          <div class="routine-card-header">
            ${avatar}
            <div class="routine-card-info">
              <div class="routine-person-name">${p.name}</div>
              <div class="routine-person-sub">${p.field}</div>
            </div>
          </div>
          ${routineBarHtml(p.routine, false)}
          <div class="routine-card-hint">タップで詳しく見る</div>
        </div>
      `;
    }).join('');
  }

  // 心に残る代表作
  if (favWorkItems.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-works">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">心に残る代表作</div>
        <div class="my-book-chapter-line"></div>
      </div>
    `;
    html += favWorkItems.map(m => {
      const searchQ = encodeURIComponent(`${m.person.name} ${m.work.title}`);
      return `
        <div class="fav-work-card" data-id="${m.person.id}">
          ${favWorkBtn(m.person.id, m.work)}
          <div class="fav-work-person">${m.person.name}</div>
          <div class="fav-work-type">${m.work.type || ''}${m.work.year ? ` · ${m.work.year}` : ''}</div>
          <div class="fav-work-title">${m.work.title}</div>
          ${m.work.description ? `<div class="fav-work-desc">${m.work.description}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // なぞりたい瞬間
  if (favEventItems.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-events">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">なぞりたい瞬間</div>
        <div class="my-book-chapter-line"></div>
      </div>
    `;
    html += favEventItems.map(m => `
      <div class="tag-event" data-id="${m.person.id}">
        ${favEventBtn(m.person.id, m.event)}
        <div class="tag-event-person">${m.person.name}</div>
        <div class="event-year">${m.event.year}年 ${m.event.age ? `（${m.event.age}歳）` : ''}</div>
        <div class="event-title">${m.event.title}</div>
        <div class="event-detail">${m.event.detail}</div>
      </div>
    `).join('');
  }

  // 偉人への手紙
  if (letterEntries.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-letters">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">偉人への手紙</div>
        <div class="my-book-chapter-line"></div>
      </div>
    `;
    html += letterEntries.map(l => {
      const person = DATA.people.find(p => p.id === l.personId);
      if (!person) return '';
      const date = new Date(l.date);
      const dateStr = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
      // 返信の配達状況
      let replyHtml = '';
      if (l.reply) {
        const deliverTime = new Date(l.reply.deliverAt).getTime();
        const now = Date.now();
        if (now >= deliverTime) {
          const replyDateStr = new Date(l.reply.deliverAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
          const isAI = l.reply.source === 'ai';
          replyHtml = `
            <div class="letter-reply">
              <div class="letter-reply-head">
                <span class="letter-reply-badge">✉ 返信が届きました</span>
                <span class="letter-reply-from">— ${person.name}より</span>
                ${!isAI ? '<span class="letter-reply-beta" title="後日AIと連動予定">β版</span>' : ''}
              </div>
              <div class="letter-reply-text">${l.reply.text.replace(/\n/g, '<br>')}</div>
              <div class="letter-reply-date">${replyDateStr} 着</div>
            </div>
          `;
        } else {
          const waitDays = Math.ceil((deliverTime - now) / (24 * 60 * 60 * 1000));
          replyHtml = `
            <div class="letter-reply-pending">
              <span class="letter-reply-pending-icon">✈</span>
              <span class="letter-reply-pending-text">
                ${person.name}への手紙を配達中… あと${waitDays}日で返信が届きます。
              </span>
            </div>
          `;
        }
      }
      return `
        <article class="letter-entry" data-letter-id="${l.id}">
          <div class="letter-entry-head">
            <div class="letter-entry-to">${person.name} 様</div>
            <button class="letter-entry-delete" data-del-letter="${l.id}" aria-label="削除">×</button>
          </div>
          <div class="letter-entry-text">${l.text.replace(/\n/g, '<br>')}</div>
          <div class="letter-entry-date">${dateStr} 投函</div>
          ${replyHtml}
        </article>
      `;
    }).join('');
  }

  // わたしのつぶやき
  if (selfPostEntries.length > 0) {
    html += `
      <div class="my-book-chapter" id="chap-tweets">
        <div class="my-book-chapter-label">第${nextChap()}章</div>
        <div class="my-book-chapter-title">わたしのつぶやき</div>
        <div class="my-book-chapter-line"></div>
        <div class="my-book-chapter-intro">IJiNに投げかけた、あなた自身の言葉。</div>
      </div>
    `;
    html += selfPostEntries.map(s => {
      const d = new Date(s.date);
      const dateStr = d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
      const timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      return `
        <article class="tweet-entry" data-tweet-id="${s.id}">
          <div class="tweet-entry-head">
            <span class="tweet-entry-date">${dateStr} ${timeStr}</span>
            <button class="tweet-entry-delete" data-del-tweet="${s.id}" aria-label="削除">×</button>
          </div>
          <div class="tweet-entry-text">${escapeHtml(s.text)}</div>
        </article>
      `;
    }).join('');
  }

  // 日記章（常に表示）
  html += `
    <div class="my-book-chapter" id="chap-diary">
      <div class="my-book-chapter-label">第${nextChap()}章</div>
      <div class="my-book-chapter-title">わたしの日記</div>
      <div class="my-book-chapter-line"></div>
    </div>
    <div class="diary-section">
      <form class="diary-form" id="diaryForm">
        <textarea class="diary-input" id="diaryInput" placeholder="今日のこと、思ったこと、偉人たちから受け取ったものを、書き留めてみよう。"></textarea>
        <button type="submit" class="diary-submit">本に書き加える</button>
      </form>
      <div class="diary-entries">
        ${diaryEntries.length === 0
          ? '<div class="diary-empty">まだ白紙です。</div>'
          : diaryEntries.map(e => {
              const d = new Date(e.date);
              const dateStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
              return `
                <div class="diary-entry">
                  <div class="diary-entry-header">
                    <span class="diary-date">${dateStr}</span>
                    <button class="diary-delete" data-diary-id="${e.id}" aria-label="削除">×</button>
                  </div>
                  <div class="diary-text">${e.text.replace(/\n/g, '<br>')}</div>
                </div>
              `;
            }).join('')
        }
      </div>
    </div>
  `;

  // 奥付
  html += `
    <div class="my-book-colophon">
      <div class="colophon-line"></div>
      <div class="colophon-text">
        この本は、<b>あなた</b>のために、あなた自身が編んだ一冊です。<br>
        迷った時、立ち止まった時に、開いてみてください。
      </div>
      <div class="colophon-line"></div>
    </div>
  `;

  list.innerHTML = html;

  list.querySelectorAll('.book-cover-card, .person-book').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-follow-toggle]')) return;
      if (el.dataset.id) showPerson(el.dataset.id);
      else if (el.dataset.tag) showTag(el.dataset.tag);
    });
  });
  // 続きから読むのフォローボタン
  list.querySelectorAll('[data-follow-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = btn.dataset.followToggle;
      toggleFavPerson(pid);
      const on = isFavPerson(pid);
      btn.classList.toggle('active', on);
      btn.textContent = on ? '✓ フォロー中' : '＋ フォロー';
    });
  });
  list.querySelectorAll('.tag-event, .my-book-quote').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.fav-btn')) return;
      showPerson(el.dataset.id);
    });
  });
  // わたしの本内のルーティンカード → ポップアップ
  list.querySelectorAll('.routine-card[data-peek-id]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.fav-btn')) return;
      const p = DATA.people.find(x => x.id === el.dataset.peekId);
      if (p) openRoutineModal(p);
    });
  });
  bindFavButtons(list);

  // フォロー中／フォロワー ポップアップ
  list.querySelectorAll('[data-open-social]').forEach(btn => {
    btn.addEventListener('click', () => {
      openSocialListModal(btn.dataset.openSocial);
    });
  });

  // 会員ディレクトリ
  const dirBtn = list.querySelector('#openUsersDirBtn');
  if (dirBtn) {
    dirBtn.addEventListener('click', () => openUsersDirectory());
  }
  const shareBtn = list.querySelector('#shareMyProfileBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => openShareMyProfileModal());
  }

  // 目次クリック → スクロール
  list.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(el.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('highlight-flash');
        setTimeout(() => target.classList.remove('highlight-flash'), 2000);
      }
    });
  });

  // 日記フォーム
  const form = list.querySelector('#diaryForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = list.querySelector('#diaryInput');
      const txt = input.value;
      if (!txt.trim()) return;
      addDiaryEntry(txt);
      input.value = '';
      renderFavorites();
    });
    list.querySelectorAll('.diary-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('この記録を削除しますか？')) {
          deleteDiaryEntry(btn.dataset.diaryId);
          renderFavorites();
        }
      });
    });
  }
  // 手紙の削除
  list.querySelectorAll('[data-del-letter]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('この手紙を削除しますか？')) {
        deleteLetter(btn.dataset.delLetter);
        renderFavorites();
      }
    });
  });
  // スタンプカード → 偉人プロフィールへ
  list.querySelectorAll('.stamp-book-card').forEach(el => {
    el.addEventListener('click', () => showPerson(el.dataset.id));
  });
  // つぶやきの削除
  list.querySelectorAll('[data-del-tweet]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('このつぶやきを削除しますか？')) {
        deleteSelfPost(btn.dataset.delTweet);
        renderFavorites();
      }
    });
  });
  // 会員フォロー数の非同期更新
  try { refreshTitlePageUserCounts?.(); } catch {}
}
// auth.js の onAuthChange から再描画できるよう公開（関数宣言後にエイリアス）
window.renderTraitsMatch = renderTraitsMatch;
window.renderFavorites = renderFavorites;

// ====================== お気に入りボタンのバインド ======================
function bindFavButtons(container, contextPersonId = null) {
  container.querySelectorAll('[data-fav-person]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.favPerson;
      toggleFavPerson(id);
      btn.classList.toggle('active');
      btn.textContent = isFavPerson(id) ? '★' : '☆';
    });
  });
  container.querySelectorAll('[data-fav-event]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = btn.dataset.favEvent;
      if (favEvents.has(k)) favEvents.delete(k); else favEvents.add(k);
      saveSet(FAV_KEY_EVENTS, favEvents);
      btn.classList.toggle('active');
      btn.textContent = favEvents.has(k) ? '★' : '☆';
    });
  });
  container.querySelectorAll('[data-fav-quote]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = btn.dataset.favQuote;
      if (favQuotes.has(k)) favQuotes.delete(k); else favQuotes.add(k);
      saveSet(FAV_KEY_QUOTES, favQuotes);
      btn.classList.toggle('active');
      btn.textContent = favQuotes.has(k) ? '★' : '☆';
    });
  });
  container.querySelectorAll('[data-fav-work]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const k = btn.dataset.favWork;
      if (favWorks.has(k)) favWorks.delete(k); else favWorks.add(k);
      saveSet(FAV_KEY_WORKS, favWorks);
      btn.classList.toggle('active');
      btn.textContent = favWorks.has(k) ? '🔖' : '📑';
    });
  });
}

// ====================== イベント登録 ======================
function bindEvents() {
  // グローバル: スマホピンボタン（💎）のクリック
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-phone-pin]');
    if (!btn) return;
    e.stopPropagation();
    e.preventDefault();
    const pid = btn.dataset.pid;
    const qtext = btn.dataset.qtext;
    const pname = btn.dataset.pname || '';
    const res = togglePhonePinQuote(pid, qtext, pname);
    if (!res.deferred) {
      const on = isPhonePinned(pid, qtext);
      btn.classList.toggle('active', on);
      btn.textContent = on ? '💎' : '🤍';
    }
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const v = tab.dataset.view;
      history.length = 0;
      showView(v);
      if (v === 'people') renderPeople();
      if (v === 'tags') renderTags();
      if (v === 'history') renderHistoryTimeline();
      if (v === 'routines') renderRoutines();
      if (v === 'articles') renderArticles();
      if (v === 'favorites') renderFavorites();
      // タブごとのBGM（排他的・重複防止）
      const BGM_BY_VIEW = { people: 'homeBgm', tags: 'searchBgm', history: 'historyBgm', routines: 'routineBgm', articles: 'blogBgm', favorites: 'favoritesBgm' };
      const targetId = BGM_BY_VIEW[v];
      if (typeof playViewBgmExclusive === 'function') playViewBgmExclusive(targetId);
    });
  });
  // 最初のユーザー操作で、現在のビューのBGMをアンロック（ブラウザ自動再生制限対策）
  let __bgmUnlocked = false;
  const unlockBgm = () => {
    if (__bgmUnlocked) return;
    __bgmUnlocked = true;
    // iOS等で自動再生できなかった動画を全て再生開始
    try {
      document.querySelectorAll('video').forEach(v => {
        try {
          v.muted = true;
          v.setAttribute('playsinline', '');
          if (v.paused) v.play().catch(() => {});
        } catch {}
      });
    } catch {}
    try {
      if (isMuted()) return;
      // 現在アクティブなビューを取得してBGMを鳴らす
      const activeView = document.querySelector('.view.active')?.id?.replace('view-', '');
      const BGM_MAP = { people: 'homeBgm', tags: 'searchBgm', history: 'historyBgm', routines: 'routineBgm', articles: 'blogBgm', favorites: 'favoritesBgm' };
      const bgmId = BGM_MAP[activeView];
      if (bgmId) {
        const bgm = document.getElementById(bgmId);
        if (bgm) {
          bgm.volume = 0.35;
          bgm.play().catch(() => {});
        }
      }
    } catch {}
  };
  document.addEventListener('click', unlockBgm, { once: true, capture: true });
  document.addEventListener('touchstart', unlockBgm, { once: true, capture: true });
  document.addEventListener('keydown', unlockBgm, { once: true, capture: true });

  // iOS向け：ビデオが停止していたら都度再開（ページ表示時・スクロール時など）
  const resumeAllVideos = () => {
    document.querySelectorAll('video').forEach(v => {
      try {
        if (v.paused && v.autoplay !== false) v.play().catch(() => {});
      } catch {}
    });
  };
  // visibility変化で再開
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(resumeAllVideos, 100);
  });
  // 任意のタップで再開（BGMアンロックとは別、iOSのvideoが停止する対策）
  let __videoTapResume = 0;
  document.addEventListener('touchstart', () => {
    const now = Date.now();
    if (now - __videoTapResume > 2000) {
      __videoTapResume = now;
      resumeAllVideos();
    }
  }, { capture: true, passive: true });

  // モーダルが開いていたら閉じる → いなければ履歴を戻る、にスマート化
  function smartBack() {
    // 開いているモーダルを優先的に閉じる
    const modalSelectors = [
      '#userProfileModal', '#meshiruPickModal', '#meshiruEditorModal',
      '.settings-modal.open', '.settings-modal:not([hidden])',
      '.era-modal.open', '.worldview-modal.open', '.person-modal.open',
    ];
    for (const sel of modalSelectors) {
      const m = document.querySelector(sel);
      if (m && (m.offsetParent !== null || m.classList.contains('open'))) {
        // モーダルに data-close ボタンがあればそれをクリック、なければ remove
        const closeBtn = m.querySelector('[data-close]') || m.querySelector('.settings-close') || m.querySelector('.meshiru-pick-close');
        if (closeBtn) { closeBtn.click(); return; }
        m.remove();
        return;
      }
    }
    goBack();
  }
  document.getElementById('backBtn').addEventListener('click', smartBack);
  document.getElementById('floatBackBtn')?.addEventListener('click', smartBack);
  document.getElementById('floatForwardBtn')?.addEventListener('click', goForward);
  updateNavButtons();
  // ヘッダーのタイトルロゴ → マップポップアップ
  document.getElementById('appTitle')?.addEventListener('click', () => showView('people'));
  // ヒーローの「この世界について」ボタン
  document.getElementById('heroToWorldview')?.addEventListener('click', () => {
    if (typeof openWorldviewModal === 'function') openWorldviewModal();
  });
  // ヒーロー下のショートカットボタン（偉人検索 / 年表）
  document.querySelectorAll('[data-hero-shortcut]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.heroShortcut;
      if (['tags','history'].includes(view)) {
        showView(view);
        if (view === 'tags') { try { renderTags(); } catch {} }
        if (view === 'history') { try { renderHistoryTimeline(); } catch {} }
      }
    });
  });
  // このサイトの使い方ポップアップ（5枚スライド）
  document.getElementById('howtoOpenBtn')?.addEventListener('click', () => openHowtoSlides());
  document.getElementById('openWorldviewBtn')?.addEventListener('click', () => openWorldviewModal());
  const searchBtnEl = document.getElementById('searchBtn');
  if (searchBtnEl) searchBtnEl.addEventListener('click', () => {
    const bar = document.getElementById('searchBar');
    bar.classList.toggle('hidden');
    if (!bar.classList.contains('hidden')) {
      document.getElementById('searchInput').focus();
    }
  });
  document.getElementById('searchClose').addEventListener('click', () => {
    document.getElementById('searchBar').classList.add('hidden');
    document.getElementById('searchInput').value = '';
    renderPeople();
  });
  document.getElementById('searchInput').addEventListener('input', (e) => {
    history.length = 0;
    showView('people', false);
    history.push('people');
    renderPeople(e.target.value);
  });
}

// ====================== サイトの使い方スライドモーダル ======================
const HOWTO_SEEN_KEY = 'ijin_howto_seen';
const HOWTO_PAGES = 5;

function openHowtoSlides(startIndex = 0) {
  const existing = document.getElementById('howtoSlidesModal');
  if (existing) existing.remove();
  const m = document.createElement('div');
  m.id = 'howtoSlidesModal';
  m.className = 'howto-slides';
  const slides = Array.from({ length: HOWTO_PAGES }, (_, i) => `
    <div class="howto-slide" data-idx="${i}">
      <img src="assets/howto/page${i + 1}.jpg" alt="サイトの使い方 ${i + 1}/${HOWTO_PAGES}" loading="${i === 0 ? 'eager' : 'lazy'}">
    </div>
  `).join('');
  const dots = Array.from({ length: HOWTO_PAGES }, (_, i) => `<button class="howto-dot" data-goto="${i}" aria-label="${i + 1}ページ目"></button>`).join('');
  m.innerHTML = `
    <div class="howto-slides-backdrop" data-close="1"></div>
    <div class="howto-slides-panel">
      <button class="howto-slides-close" data-close="1" aria-label="閉じる">×</button>
      <div class="howto-slides-viewport">
        <div class="howto-slides-track">${slides}</div>
      </div>
      <button class="howto-nav howto-nav-prev" aria-label="前のページ">‹</button>
      <button class="howto-nav howto-nav-next" aria-label="次のページ">›</button>
      <div class="howto-dots">${dots}</div>
      <div class="howto-counter"><span id="howtoCurrent">1</span> / ${HOWTO_PAGES}</div>
    </div>
  `;
  document.body.appendChild(m);
  localStorage.setItem(HOWTO_SEEN_KEY, '1');
  requestAnimationFrame(() => m.classList.add('open'));

  const track = m.querySelector('.howto-slides-track');
  const dotsEls = m.querySelectorAll('.howto-dot');
  const counterEl = m.querySelector('#howtoCurrent');
  let current = Math.max(0, Math.min(HOWTO_PAGES - 1, startIndex));
  const update = () => {
    track.style.transform = `translateX(${-current * 100}%)`;
    dotsEls.forEach((d, i) => d.classList.toggle('active', i === current));
    if (counterEl) counterEl.textContent = String(current + 1);
    m.querySelector('.howto-nav-prev').style.visibility = current === 0 ? 'hidden' : '';
    m.querySelector('.howto-nav-next').style.visibility = current === HOWTO_PAGES - 1 ? 'hidden' : '';
  };
  update();
  m.querySelector('.howto-nav-prev').addEventListener('click', () => { if (current > 0) { current--; update(); } });
  m.querySelector('.howto-nav-next').addEventListener('click', () => { if (current < HOWTO_PAGES - 1) { current++; update(); } });
  dotsEls.forEach(d => d.addEventListener('click', () => { current = parseInt(d.dataset.goto, 10); update(); }));

  // スワイプ対応
  let startX = null;
  const viewport = m.querySelector('.howto-slides-viewport');
  viewport.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  viewport.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && current < HOWTO_PAGES - 1) current++;
      else if (dx > 0 && current > 0) current--;
      update();
    }
    startX = null;
  });

  // キーボード
  const onKey = (e) => {
    if (e.key === 'ArrowRight' && current < HOWTO_PAGES - 1) { current++; update(); }
    else if (e.key === 'ArrowLeft' && current > 0) { current--; update(); }
    else if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey);

  const close = () => {
    m.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => m.remove(), 240);
  };
  m.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
}
window.openHowtoSlides = openHowtoSlides;

// ====================== 歴史の案内人 ラビン ======================
// 文言パターン（1箇所あたり3案。表示ごとにランダム選択）
const GUIDE_NAME = 'ラビン';
const GUIDE_COPY = {
  hero: [
    'ようこそ、本棚へ。わたしはラビン。この時代の隅で、そなたを待っておった。',
    'おお、また一人。歴史の案内人、ラビンと申す。',
    'さあ、時を越えに参りましょう——偉人たちが、向こうに坐しておる。',
  ],
  howto: [
    'はじめて訪れた方は、まずこちらに目を通されるとよい。',
    '本棚の歩き方、手短にお伝えいたしましょう。',
    'ここを開けば、案内の栞が一枚現れます。',
  ],
  match: [
    '気になる一つを選ばれるだけで、十分でございます。',
    '好きなもの、生まれた日——そこから縁は辿れます。',
    'そなたに似た一冊、必ずここに眠っております。',
  ],
  tags: [
    '時代・国・日々の型で、偉人たちは探せます。',
    '朝の人、夜の人——同じ刻を生きた者を探しましょう。',
    '似た呼吸の偉人を、ここで見つけられます。',
  ],
  routines: [
    '偉人たちの一日を、覗いてみませぬか。',
    'バッハの朝、漱石の夜——時が流れてゆきます。',
    '時で辿ると、また違うた本となりますぞ。',
  ],
  articles: [
    'この章は、ここから始まります。',
    '静かに読み進めてくだされ。',
    '読み終えたら、そっと栞を挟まれるとよい。',
  ],
  mybookEmpty: [
    '最初の一枚は、気になる言葉ひとつでようございます。',
    'まだ白紙。焦らず編んでゆきましょう。',
    '☆や♡を押せば、ここへ綴じてゆけます。',
  ],
  login: [
    '本棚の鍵を受け取れば、この一冊は残したままにできます。',
    '端末が変わろうと、本は消えませぬ。',
    'いつでも外せて、またここへ戻ってこられます。',
  ],
};

// ガイドキャラのHTML生成（inline / corner / below / solo）
// opts: { pose, copyKey, size('sm'|'md'|'lg'), layout('inline'|'below'), copyIndex, once }
function renderGuideChara(opts) {
  const { pose = 'welcome', copyKey, copyText, size = 'sm', layout = 'inline', copyIndex } = opts;
  const pool = copyText ? [copyText] : (GUIDE_COPY[copyKey] || []);
  if (pool.length === 0) return '';
  const text = copyIndex !== undefined
    ? pool[copyIndex % pool.length]
    : pool[Math.floor(Math.random() * pool.length)];
  return `
    <aside class="guide-chara guide-size-${size} guide-layout-${layout}" data-pose="${pose}">
      <div class="guide-chara-video-wrap">
        <video class="guide-chara-video" autoplay loop muted playsinline preload="auto" disablePictureInPicture controlslist="nodownload noremoteplayback nofullscreen" aria-hidden="true">
          <source src="assets/guide/${pose}.mp4" type="video/mp4">
        </video>
      </div>
      <div class="guide-chara-bubble">
        <div class="guide-chara-bubble-tail" aria-hidden="true"></div>
        <div class="guide-chara-name">${GUIDE_NAME}</div>
        <div class="guide-chara-text">${text}</div>
      </div>
    </aside>
  `;
}

// 挿入補助: 指定セレクタの直下に1回だけ挿入
function injectGuideBefore(selector, html) {
  const target = document.querySelector(selector);
  if (!target) return;
  if (target.previousElementSibling?.classList?.contains('guide-chara')) return;
  const tmpl = document.createElement('template');
  tmpl.innerHTML = html.trim();
  target.parentNode.insertBefore(tmpl.content.firstElementChild, target);
}
function injectGuideInto(selector, html, position = 'afterbegin') {
  const target = document.querySelector(selector);
  if (!target) return;
  if (position === 'afterbegin' && target.firstElementChild?.classList?.contains('guide-chara')) return;
  if (position === 'beforeend' && target.lastElementChild?.classList?.contains('guide-chara')) return;
  target.insertAdjacentHTML(position, html);
}

// IntersectionObserverで画面外の動画を一時停止（CPU節約）
function initGuideCharaObserver() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(ent => {
      const v = ent.target.querySelector('video');
      if (!v) return;
      if (ent.isIntersecting) { v.play().catch(() => {}); }
      else { v.pause(); }
    });
  }, { threshold: 0.15 });
  const scan = () => {
    document.querySelectorAll('.guide-chara').forEach(el => {
      if (el.dataset.guideObserved) return;
      el.dataset.guideObserved = '1';
      io.observe(el);
    });
  };
  scan();
  // 動的に追加されたガイドも監視対象に
  const mo = new MutationObserver(scan);
  mo.observe(document.body, { childList: true, subtree: true });
}

// 各配置箇所にガイドキャラを配置
function renderBookshelfGuides() {
  // 1. 初回訪問時のみポップアップで挨拶（2回目以降は出さない）
  const HERO_KEY = 'ijin_guide_hero_seen';
  if (!localStorage.getItem(HERO_KEY) && !document.querySelector('.guide-hello-modal')) {
    const modal = document.createElement('div');
    modal.className = 'guide-hello-modal';
    modal.innerHTML = `
      <div class="guide-hello-backdrop"></div>
      <div class="guide-hello-card" role="dialog" aria-label="歴史の案内人 ラビンからの挨拶">
        <button class="guide-hello-close" aria-label="閉じる">×</button>
        ${renderGuideChara({ pose: 'welcome', copyText: 'ようこそ。歴史の案内人、ラビンにございます。', size: 'lg', layout: 'below' })}
        <button class="guide-hello-ok">はじめる</button>
      </div>
    `;
    document.body.appendChild(modal);
    const close = (opts = {}) => {
      localStorage.setItem(HERO_KEY, '1');
      modal.classList.add('closing');
      setTimeout(() => {
        modal.remove();
        // 閉じた後、初めての方にはサイトの使い方スライドを自動表示
        if (!localStorage.getItem(HOWTO_SEEN_KEY)) {
          setTimeout(() => {
            if (typeof openHowtoSlides === 'function') openHowtoSlides(0);
          }, 300);
        }
      }, 260);
    };
    modal.querySelector('.guide-hello-close').addEventListener('click', () => close());
    modal.querySelector('.guide-hello-ok').addEventListener('click', () => close());
    modal.querySelector('.guide-hello-backdrop').addEventListener('click', () => close());
    requestAnimationFrame(() => modal.classList.add('show'));
  }

  // 1-b. ホーム上部：ヒーローの直下にラビンを大きめに配置
  const hero = document.querySelector('#view-people .hero-silhouette');
  if (hero && !document.querySelector('.home-rabin-greet')) {
    const wrap = document.createElement('div');
    wrap.className = 'home-rabin-greet';
    wrap.innerHTML = renderGuideChara({ pose: 'welcome', copyKey: 'hero', size: 'md', layout: 'inline' });
    hero.insertAdjacentElement('afterend', wrap);
  }

  // 2. はじめての方へ: 見出しの横
  const howtoLabel = [...document.querySelectorAll('.home-block-label')].find(e => e.textContent.trim() === 'はじめての方へ');
  if (howtoLabel && !howtoLabel.parentNode.querySelector('.guide-chara')) {
    howtoLabel.parentNode.insertAdjacentHTML('beforeend',
      renderGuideChara({ pose: 'welcome', copyKey: 'howto', size: 'sm', layout: 'inline' }));
  }

  // 3. あなたに似た偉人を探す: セクション内先頭
  const matchSec = document.getElementById('traitsMatchSection');
  if (matchSec && !matchSec.querySelector('.guide-chara')) {
    matchSec.insertAdjacentHTML('afterbegin',
      renderGuideChara({ pose: 'pointing', copyKey: 'match', size: 'sm', layout: 'inline' }));
  }

  // 3-b. 年表の先頭にラビン（歴史の案内人なので年表との相性◎）
  const historyView = document.getElementById('view-history');
  if (historyView && !historyView.querySelector('.home-rabin-greet')) {
    const wrap = document.createElement('div');
    wrap.className = 'home-rabin-greet history-rabin-greet';
    wrap.innerHTML = renderGuideChara({
      pose: 'reading',
      copyText: 'ここは歴史の地図。時代を辿り、そなたの今に繋がる物語を見つけられよ。',
      size: 'md',
      layout: 'inline'
    });
    historyView.insertAdjacentElement('afterbegin', wrap);
  }

  // 4. 感情の本棚（検索タブの感情一覧）: #tagsList の上
  const tagsContainer = document.getElementById('tagsList');
  if (tagsContainer && !tagsContainer.parentNode.querySelector('.guide-tags-chara')) {
    const html = `<div class="guide-tags-chara">${renderGuideChara({ pose: 'reading', copyKey: 'tags', size: 'sm', layout: 'inline' })}</div>`;
    tagsContainer.insertAdjacentHTML('beforebegin', html);
  }

  // 5. ルーティンから探す: #routinesList の上
  const routinesContainer = document.getElementById('routinesList');
  if (routinesContainer && !routinesContainer.parentNode.querySelector('.guide-routines-chara')) {
    const html = `<div class="guide-routines-chara">${renderGuideChara({ pose: 'reading', copyKey: 'routines', size: 'sm', layout: 'inline' })}</div>`;
    routinesContainer.insertAdjacentHTML('beforebegin', html);
  }

  // 6. 記事タブ: 著者ヘッダー直後、Coming Soonの下
  const articlesComing = document.querySelector('.articles-coming-soon');
  if (articlesComing && !articlesComing.nextElementSibling?.classList?.contains('guide-chara')) {
    articlesComing.insertAdjacentHTML('afterend',
      renderGuideChara({ pose: 'reading', copyKey: 'articles', size: 'sm', layout: 'inline' }));
  }

  // 7. わたしの本 空状態 はrenderFavoritesで挿入されるのでそこでフック
  // 8. ログインモーダルは openLoginModal 内で挿入
}
window.renderBookshelfGuides = renderBookshelfGuides;

// ====================== 起動 ======================
(async () => {
  await loadData();
  await loadComments();
  bindEvents();
  initMuteToggle();
  initPhoneMenu();
  initWelcomeIntro();
  renderHeroStats();
  renderUpdates();
  renderOshi();
  renderTraitsMatch();
  renderTodayBirthday();
  try { renderTodayEcho(); } catch (e) { console.warn(e); }
  try { renderBookOfTheDay(); } catch (e) { console.warn(e); }
  try { renderHistoryMirrors(); } catch (e) { console.warn(e); }
  renderCalendarToday();
  renderPersonOfTheDay();
  renderQuoteOfTheDay();
  renderQuoteCarousel();
  renderFeaturedTags();
  renderThemeTiles();
  renderHomeBooks();
  // TOCは他ブロックが描画された後に
  setTimeout(() => { try { renderHomeTOC(); } catch (e) { console.warn('toc', e); } }, 400);
  renderArticles();
  renderCategoryFilter();
  renderPeople();
  renderTags();
  bindSearchPanel();
  await loadComments();
  initChatWidget();
  renderRoutines();
  renderFavorites();
  bindHistoryTabs();
  renderHistoryTimeline();
  renderBookshelfGuides();
  initGuideCharaObserver();
  // 内部判定：フォローバック＋誕生日通知＋リムーブ条件
  try {
    runFollowBackRemoval();
    runFollowBackScan();
    runBirthdayNotifications();
    // レキット：新機能・更新お知らせ
    syncRekittoUpdates();
  } catch (e) { console.warn('followback/bday', e); }
  // ?user=<uid> でシェアURL経由の会員プロフィールを開く
  try {
    const qp = new URLSearchParams(location.search);
    const sharedUid = qp.get('user');
    if (sharedUid) {
      // Firebase認証が確定するまで待ってから開く（未確定だとフォローボタンが出ない）
      const openAfterAuth = async () => {
        if (typeof window.waitForAuthResolved === 'function') {
          await window.waitForAuthResolved();
        }
        openUserProfileById(sharedUid);
      };
      openAfterAuth();
    }
  } catch {}

  // =========== ディープリンク：シェアされたURLから特定画面を直接開く ===========
  // ?era=<eraId>&cat=<catId> — 年表の時代モーダル
  // ?person=<personId> — 偉人ページ
  // ?tag=<tagId> — タグページ
  // ?view=<viewName> — メインビュー（people/tags/history/routines/articles/favorites）
  try {
    const qp = new URLSearchParams(location.search);
    const viewParam = qp.get('view');
    const personId = qp.get('person');
    const eraId = qp.get('era');
    const catParam = qp.get('cat');
    const tagId = qp.get('tag');
    if (viewParam && ['people','tags','history','routines','articles','favorites'].includes(viewParam)) {
      showView(viewParam);
    }
    if (personId && DATA.people && DATA.people.find(p => p.id === personId)) {
      setTimeout(() => { try { showPerson(personId); } catch {} }, 200);
    } else if (eraId && DATA.eraCategories) {
      // cat が指定されていれば直接、されていなければ era からカテゴリを逆引き
      let catId = catParam;
      if (!catId) {
        const found = DATA.eraCategories.find(c => (c.eras || []).some(e => e.id === eraId));
        if (found) catId = found.id;
      }
      if (catId) {
        // 年表ビューに移動してから era-lore を読み込み、モーダルを開く
        showView('history');
        setTimeout(() => {
          try { if (typeof openEraModal === 'function') openEraModal(catId, eraId); } catch {}
        }, 300);
      }
    } else if (tagId) {
      setTimeout(() => {
        try { if (typeof showTag === 'function') showTag(tagId); } catch {}
      }, 200);
    }
    const themeId = qp.get('theme');
    if (themeId) {
      setTimeout(() => {
        try { if (typeof showThemePage === 'function') showThemePage(themeId); } catch {}
      }, 200);
    }
    const postId = qp.get('post');
    if (postId) {
      setTimeout(() => {
        try { if (typeof showBlogPost === 'function') showBlogPost(postId); } catch {}
      }, 200);
    }
  } catch (e) { console.warn('deeplink', e); }

  history.push('people');
})();
