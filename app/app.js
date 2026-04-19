// ====================== Amazon アフィリエイト設定 ======================
// natsumi のAmazonアソシエイトIDをセット。全Amazonリンクに自動付与される。
const AMAZON_TAG = ''; // 例: 'natsumipiano-22'

function amazonUrl(asin) {
  return `https://www.amazon.co.jp/dp/${asin}${AMAZON_TAG ? `?tag=${AMAZON_TAG}` : ''}`;
}
function amazonCover(asin) {
  return `https://images-fe.ssl-images-amazon.com/images/P/${asin}.09.LZZZZZZZ.jpg`;
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
    DATA.tags = tagsData.categories;
    DATA.tagMap = Object.fromEntries(DATA.tags.map(t => [t.id, t]));

    const people = await Promise.all(
      manifest.people.map(id => fetch(`../data/people/${id}.json${bust}`, { cache: 'no-store' }).then(r => r.json()))
    );
    DATA.people = people;
  } catch (e) {
    document.getElementById('peopleList').innerHTML =
      `<div class="empty">データの読み込みに失敗しました。<br><br>この画面は <b>http サーバー経由</b> で開く必要があります。<br><br>PCで <code>run.bat</code> をダブルクリックしてください。</div>`;
    console.error(e);
  }
}

// ====================== カテゴリ分類 ======================
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
  { id: 'science',  name: '科学者',   match: (f) => /科学|数学者|物理学者|生物学者|医師|医学/.test(f) },
  { id: 'history',  name: '歴史',     match: (f) => /武士|武将|志士|藩士|政治家|軍人|大名|局長|副長|戦国|維新|幕末/.test(f) },
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
  return localStorage.getItem(USER_NAME_KEY) || '';
}
function setUserName(name) {
  if (name && name.trim()) localStorage.setItem(USER_NAME_KEY, name.trim());
  else localStorage.removeItem(USER_NAME_KEY);
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
  return `<button class="fav-btn ${on ? 'active' : ''}" data-fav-quote="${quoteKey(personId, quote)}" aria-label="お気に入り">${on ? '★' : '☆'}</button>`;
}

// イベントを識別するキー = personId + year + title
function eventKey(personId, event) {
  return `${personId}::${event.year}::${event.title}`;
}
function isFavPerson(id) { return favPeople.has(id); }
function isFavEvent(personId, event) { return favEvents.has(eventKey(personId, event)); }
function toggleFavPerson(id) {
  if (favPeople.has(id)) favPeople.delete(id); else favPeople.add(id);
  saveSet(FAV_KEY_PEOPLE, favPeople);
}
function toggleFavEvent(personId, event) {
  const k = eventKey(personId, event);
  if (favEvents.has(k)) favEvents.delete(k); else favEvents.add(k);
  saveSet(FAV_KEY_EVENTS, favEvents);
}

// ====================== ビュー切替 ======================
const views = ['people', 'tags', 'routines', 'articles', 'favorites', 'person', 'tag'];
const tabViewNames = ['people', 'tags', 'routines', 'articles', 'favorites'];
const history = [];

function showView(name, pushHistory = true) {
  if (pushHistory && history[history.length - 1] !== name) history.push(name);
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
  // ヘッダーは常に「偉人と自分。」固定
  document.getElementById('appTitle').textContent = '偉人と自分。';
  window.scrollTo(0, 0);
  document.getElementById('main').scrollTo(0, 0);
}

function goBack() {
  if (history.length > 1) {
    history.pop();
    showView(history[history.length - 1], false);
  }
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
}

// DBから全traitの選択肢を集計
function collectAllTraitOptions() {
  const counts = { foods: {}, hobbies: {}, likes: {}, dislikes: {} };
  (DATA.people || []).forEach(p => {
    const t = p.traits;
    if (!t) return;
    ['foods', 'hobbies', 'likes', 'dislikes'].forEach(cat => {
      (t[cat] || []).forEach(item => {
        counts[cat][item] = (counts[cat][item] || 0) + 1;
      });
    });
  });
  // 出現数でソート（最低2件の偉人に共通するものだけ）
  const topN = (obj, n) => Object.entries(obj).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  return {
    foods: topN(counts.foods, 20),
    hobbies: topN(counts.hobbies, 20),
    likes: topN(counts.likes, 20),
    dislikes: topN(counts.dislikes, 20),
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
    return `
      <div class="match-cat">
        <div class="match-cat-label">${catLabel}</div>
        <div class="match-chips">
          ${options[cat].map(opt => {
            const on = selected.has(opt);
            return `<button class="match-chip ${on ? 'active' : ''}" data-match-chip data-cat="${cat}" data-opt="${escapeHtml(opt)}">${opt}</button>`;
          }).join('')}
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
      <div class="match-cat-label">👤 あなたのプロフィール（会員限定）</div>
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
      <div class="match-profile-lock-head">🔒 誕生日・出身地の登録は会員限定です</div>
      <div class="match-profile-lock-sub">登録すると、同じ誕生日の偉人を探せます。</div>
      <button class="match-profile-login-btn" id="matchProfileLoginBtn">🔑 本棚の鍵を受け取る</button>
    </div>
  `;

  container.innerHTML = `
    <details class="match-card" ${selectedCount === 0 ? 'open' : ''}>
      <summary class="match-summary">
        <span class="match-summary-icon">🫖</span>
        <span class="match-summary-text">${selectedCount > 0 ? `あなたの好み ${selectedCount}個登録中` : 'あなたの好み・誕生日を登録して偉人を探す'}</span>
        <span class="match-summary-arrow">▾</span>
      </summary>
      <div class="match-body">
        <div class="match-intro">気になる項目をタップして選択（複数可）。<br>共通点の多い偉人が下に表示されます。</div>
        ${profileHtml}
        ${makeChips('foods', '🍽 好きな食べ物・飲み物')}
        ${makeChips('hobbies', '🎨 趣味・日課')}
        ${makeChips('likes', '❤ 好きなもの')}
        ${makeChips('dislikes', '✖ 嫌いなもの')}
        ${selectedCount > 0 ? `<button class="match-clear" id="matchClear">選択をクリア</button>` : ''}
      </div>
    </details>
    ${sameBdHtml}
    ${matchesHtml}
  `;

  container.querySelectorAll('[data-match-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const opt = btn.dataset.opt;
      const t = loadMyTraits();
      t[cat] = t[cat] || [];
      const idx = t[cat].indexOf(opt);
      if (idx >= 0) t[cat].splice(idx, 1);
      else t[cat].push(opt);
      saveMyTraits(t);
      renderTraitsMatch();
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
    return `
      <div class="settings-section">
        <div class="settings-sec-label">${catLabel}</div>
        <div class="settings-chips">
          ${opts.map(opt => {
            const on = selected.has(opt);
            return `<button class="match-chip ${on ? 'active' : ''}" data-setting-chip data-cat="${cat}" data-opt="${escapeHtml(opt)}">${opt}</button>`;
          }).join('')}
        </div>
      </div>
    `;
  };

  modal.innerHTML = `
    <div class="settings-backdrop" data-close="1"></div>
    <div class="settings-panel">
      <button class="settings-close" data-close="1" aria-label="閉じる">×</button>
      <div class="settings-head">⚙ 自分のことを設定</div>

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
      ${renderChips('dislikes', '🚫 苦手なもの', options.likes)}

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

  // チップのトグル
  modal.querySelectorAll('[data-setting-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
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
    });
  }

  modal.querySelector('#settingsSave').addEventListener('click', () => {
    const t = loadMyTraits();
    t.birthMonth = parseInt(modal.querySelector('#settingsBirthMonth').value, 10) || null;
    t.birthDay = parseInt(modal.querySelector('#settingsBirthDay').value, 10) || null;
    t.hometown = modal.querySelector('#settingsHometown').value.trim();
    ['foods','hobbies','likes','dislikes'].forEach(cat => {
      t[cat] = Array.from(modal.querySelectorAll(`[data-setting-chip][data-cat="${cat}"].active`)).map(b => b.dataset.opt);
    });
    saveMyTraits(t);
    close();
    if (typeof renderTraitsMatch === 'function') renderTraitsMatch();
    if (typeof renderFavorites === 'function') renderFavorites();
    if (typeof renderTodayBirthday === 'function') renderTodayBirthday();
  });
}

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
  // LINE風グループチャット
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
      bubbles.push(`
        <div class="line-msg line-msg-me">
          <div class="line-msg-wrap">
            <div class="line-msg-time-me">${fmtTime(m.ts)}</div>
            <div class="line-msg-bubble-me">${escapeHtml(m.text)}</div>
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
        <div class="line-group-name">偉人の広場</div>
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
  container.innerHTML = `
    <div class="oshi-card" data-id="${p.id}">
      ${p.imageUrl
        ? `<div class="oshi-image" style="background-image:url('${p.imageUrl}')"></div>`
        : `<div class="oshi-image no-image">${p.name.charAt(0)}</div>`}
      <div class="oshi-info">
        <div class="oshi-label">♡ わたしの推し</div>
        <div class="oshi-name">${p.name}</div>
        <div class="oshi-meta">${fmtYearRange(p.birth, p.death)} ／ ${p.field}</div>
      </div>
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
  // 推しと本日の案内人の本を優先、残り1枠をランダム
  const seed = daySeed();
  const picked = [];
  const usedAsins = new Set();

  // ASINがある本だけピックする
  const hasValidAsin = (b) => b && b.asin && /^[A-Z0-9]{10}$/i.test(b.asin);

  const pushBookOf = (pid, label) => {
    if (!pid) return;
    const p = DATA.people.find(x => x.id === pid);
    if (!p) return;
    const validBooks = (p.books || []).filter(hasValidAsin);
    if (!validBooks.length) return;
    const b = validBooks[seed % validBooks.length];
    if (usedAsins.has(b.asin)) return;
    usedAsins.add(b.asin);
    picked.push({ ...b, person: p, label });
  };
  pushBookOf(getOshi(), '♡ 推しの一冊');
  try {
    const t = getTodaysCompanion && getTodaysCompanion();
    if (t && t.personId) pushBookOf(t.personId, '本日の案内人');
  } catch (e) {}

  // 残りをランダム（日替わり）で埋める — ASIN必須
  const all = [];
  DATA.people.forEach(p => {
    (p.books || []).forEach(b => { if (hasValidAsin(b) && !usedAsins.has(b.asin)) all.push({ ...b, person: p }); });
  });
  all.sort((a, b) => ((hashStr(a.asin) ^ seed) >>> 0) - ((hashStr(b.asin) ^ seed) >>> 0));
  // HP版は6冊、スマホは3冊
  const bookCount = (typeof window !== 'undefined' && window.innerWidth >= 900) ? 6 : 3;
  while (picked.length < bookCount && all.length) {
    picked.push(all.shift());
  }

  const container = document.getElementById('homeBooks');
  if (!container || picked.length === 0) return;
  container.innerHTML = picked.map(b => `
    <a class="home-book-card" href="${amazonUrl(b.asin)}" target="_blank" rel="noopener" data-asin="${b.asin}">
      <div class="home-book-cover-wrap">
        <div class="home-book-cover">
          <img src="${amazonCover(b.asin)}" alt="${b.title}" loading="lazy"
               onload="if(this.naturalWidth<50){this.closest('.home-book-card').style.display='none';}"
               onerror="this.closest('.home-book-card').style.display='none';">
        </div>
        ${b.label ? `<div class="home-book-ribbon">${b.label}</div>` : ''}
      </div>
      <div class="home-book-title">${b.title}</div>
      <div class="home-book-person">${b.person.name}</div>
    </a>
  `).join('');
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
}
function updateItemHtml(u) {
  const tagClass = {
    '新機能': 'updates-tag-new',
    '追加': 'updates-tag-add',
    '改善': 'updates-tag-improve',
    '修正': 'updates-tag-fix',
  }[u.tag] || '';
  return `
    <div class="updates-item">
      <div class="updates-meta">
        <span class="updates-date">${u.date || ''}</span>
        ${u.tag ? `<span class="updates-tag ${tagClass}">${u.tag}</span>` : ''}
      </div>
      <div class="updates-title">${u.title}</div>
      ${u.body ? `<div class="updates-body">${u.body}</div>` : ''}
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
}
function getVisitCount(personId) {
  return loadVisits()[personId] || 0;
}
function totalFootprints() {
  const v = loadVisits();
  return Object.values(v).reduce((a, b) => a + b, 0);
}
// 偉人がユーザーをフォローしているか（スタンプ3以上で相互フォロー）
function isFollowedByPerson(personId) {
  return getStampLevel(personId) >= 3;
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
  ['homeBgm', 'searchBgm', 'routineBgm', 'blogBgm', 'favoritesBgm', 'squareBgm'].forEach(id => {
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
  ['homeBgm', 'searchBgm', 'routineBgm', 'blogBgm', 'favoritesBgm', 'squareBgm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.pause();
  });
}

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
    const amazon = b.asin ? amazonUrl(b.asin) : '';
    const bookExtra = `
      <div class="x-book-card">
        ${cover ? `<a class="x-book-cover" href="${amazon}" target="_blank" rel="noopener" style="background-image:url('${cover}')" onclick="event.stopPropagation()"></a>` : ''}
        <div class="x-book-info">
          <div class="x-book-title">${b.title}</div>
          <div class="x-book-author">${b.author || ''}</div>
          ${b.description ? `<div class="x-book-desc">${b.description}</div>` : ''}
          ${amazon ? `<a class="x-book-amazon" href="${amazon}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Amazonで見る</a>` : ''}
        </div>
      </div>
    `;
    stream.push({ sortYear: 99999, sortPri: 6, html: xPostCard({
      icon: 'book', typeLabel: '関連本',
      title: null, body: null, extra: bookExtra
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
              return `<button class="follow-btn ${following ? 'active' : ''}" data-follow-toggle="${p.id}">${following ? '✓ フォロー中' : '＋ フォロー'}</button>`;
            } else {
              return `<button class="follow-btn disabled" data-follow-login="1" title="会員登録すると偉人をフォローできます">＋ フォロー（会員のみ）</button>`;
            }
          })()}
          <button class="oshi-set-btn ${getOshi() === p.id ? 'active' : ''}" data-oshi-set="${p.id}">
            ${getOshi() === p.id ? '♡ 推し中' : '♡ 推しにする'}
          </button>
        </div>
      </div>
      <div class="profile-meta">
        <span>${p.field}</span>
        <span>${p.country}</span>
        <span>${fmtYearRange(p.birth, p.death)}</span>
      </div>
      <div class="profile-xmeta">
        ${(p.birthMonth && p.birthDay) ? `<span class="profile-xmeta-item">🎂 ${p.birthMonth}/${p.birthDay}${p.birth ? `（${fmtYear(p.birth)}年生）` : ''}</span>` : ''}
        ${(p.deathMonth && p.deathDay) ? `<span class="profile-xmeta-item">🕯 ${p.deathMonth}/${p.deathDay}${p.death ? `（${fmtYear(p.death)}年没）` : ''}</span>` : ''}
        ${p.country ? `<span class="profile-xmeta-item">📍 ${p.country}</span>` : ''}
        <span class="profile-xmeta-item">👣 ${getVisitCount(p.id)}回訪問</span>
      </div>
      <div class="profile-social">
        ${isFollowedByPerson(p.id) ? `
          <div class="profile-follow-badge">✓ ${p.name}があなたをフォローしています</div>
        ` : `
          <div class="profile-follow-hint">Lv.3以上で${p.name}があなたをフォローします</div>
        `}
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

    ${p.traits ? `
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
              <div class="traits-sec-label">好きな食べ物・飲み物</div>
              <div class="traits-sec-chips">${p.traits.foods.map(x => `<span class="traits-chip">${x}</span>`).join('')}</div>
            </div>
          ` : ''}
          ${(p.traits.hobbies || []).length ? `
            <div class="traits-section">
              <div class="traits-sec-label">趣味・日課</div>
              <div class="traits-sec-chips">${p.traits.hobbies.map(x => `<span class="traits-chip">${x}</span>`).join('')}</div>
            </div>
          ` : ''}
          ${(p.traits.likes || []).length ? `
            <div class="traits-section">
              <div class="traits-sec-label">好きなもの</div>
              <div class="traits-sec-chips">${p.traits.likes.map(x => `<span class="traits-chip">${x}</span>`).join('')}</div>
            </div>
          ` : ''}
          ${(p.traits.dislikes || []).length ? `
            <div class="traits-section">
              <div class="traits-sec-label">苦手なもの</div>
              <div class="traits-sec-chips">${p.traits.dislikes.map(x => `<span class="traits-chip traits-chip-neg">${x}</span>`).join('')}</div>
            </div>
          ` : ''}
        </div>
      </details>
    ` : ''}

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
            <div class="stamp-criteria-item">・Lv.3 で${p.name}があなたをフォロー</div>
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
                    <div class="relation-role">あなた（Lv.${getStampLevel(p.id)}達成）</div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="rel-subhead">ユーザー</div>
              <div class="rel-empty-user">
                ${!userName ? '名前を設定してクイズに挑戦しよう' : `クイズでLv.3以上になると${p.name}にフォローされます（現在Lv.${getStampLevel(p.id)}）`}
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
          const url = w.asin ? `https://www.amazon.co.jp/dp/${w.asin}` : '#';
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
                <a class="happening-btn" href="https://search.rakuten.co.jp/search/mall/${encodeURIComponent(p.name)}/" target="_blank" rel="noopener">🛒 楽天で探す</a>
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
                    <a class="happening-btn" href="https://search.rakuten.co.jp/search/mall/${encodeURIComponent(p.name + ' ' + h.title)}/" target="_blank" rel="noopener">🛒 楽天</a>
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
        const amz = b.asin ? amazonUrl(b.asin) : `https://www.amazon.co.jp/s?k=${encodeURIComponent(b.title + ' ' + (b.author||''))}`;
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
      toggleFavPerson(pid);
      const on = isFavPerson(pid);
      followBtn.classList.toggle('active', on);
      followBtn.textContent = on ? '✓ フォロー中' : '＋ フォロー';
    });
  }
  // 偉人のフォロー中／フォロワー／ブロック中 → ポップアップ
  container.querySelectorAll('[data-person-social]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPersonRelationsModal(p, btn.dataset.personSocial);
    });
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
      }
      renderOshi();
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
      { id: 'short_sleep', name: 'ショートスリーパー(<6h)', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'short_sleep')).length },
      { id: 'long_sleep', name: 'ロングスリーパー(≥9h)', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'long_sleep')).length },
      { id: 'early_riser', name: '朝型(6時前起床)', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'early_riser')).length },
      { id: 'night_owl', name: '夜型(深夜就寝)', count: targetPeople.filter(p => personMatchesRoutineFilter(p, 'night_owl')).length },
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
  const before = Object.values(bd).reduce((a,b) => a + (b || 0), 0);
  bd[source] = (bd[source] || 0) + 1;
  stamps[personId] = bd;
  saveStamps(stamps);
  const after = before + 1;
  // Lv.3到達時に『偉人からフォロー』を反映＋通知
  if (before < 3 && after >= 3) {
    try { if (typeof renderFavorites === 'function') renderFavorites(); } catch {}
    const person = DATA.people.find(p => p.id === personId);
    if (person) showFollowToast(person);
  }
}

// LINE風のフォロー通知トースト
function showFollowToast(person) {
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
};

// 称号（総スタンプ数に応じた段階）
const TITLES = [
  { min: 0, name: '', label: '' },
  { min: 1, name: '読者', label: '読者' },
  { min: 3, name: '弟子', label: '弟子' },
  { min: 7, name: '同志', label: '同志' },
  { min: 15, name: '継承者', label: '継承者' },
  { min: 30, name: '賢者', label: '賢者' },
  { min: 60, name: '書斎の主', label: '書斎の主' },
];
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
            <div class="letter-sent-hint">登録すると、端末を変えても消えずに残ります。<br>将来、${p.name}さんからの返信も届きます。</div>
            <button class="letter-sent-login-btn" id="letterSentLogin">🔑 本棚の鍵を受け取る</button>
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
    if (t === 'following') {
      body.innerHTML = renderPersonList(
        followingPeople,
        p => isFollowedByPerson(p.id) ? '相互フォロー' : (p.field || ''),
        'まだ誰もフォローしていません。気になる偉人のページで「＋ フォロー」を押してください。'
      );
    } else if (t === 'followers') {
      body.innerHTML = renderPersonList(
        followerPeople,
        p => `スタンプ ${getStampLevel(p.id)} 個`,
        'まだ偉人からフォローされていません。親密度クイズでスタンプを3つ以上集めると、その偉人があなたをフォローし返します。'
      );
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
  }

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.social-list-close').addEventListener('click', close);
  overlay.querySelectorAll('.social-list-tab').forEach(el => {
    el.addEventListener('click', () => showTab(el.dataset.stab));
  });

  showTab(tab);
}

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
          <div class="social-list-sub">Lv.${getStampLevel(p.id)}達成 · 相互フォロー</div>
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
        ${following.length === 0 ? `<div class="social-list-empty" data-fallback-empty>${p.name}のフォロワーはまだいません。クイズでLv.3以上になるとあなたがフォロワーに加わります（現在Lv.${getStampLevel(p.id)}）。</div>` : ''}
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
  `;

  html += DATA.people.filter(p => p.routine && p.routine.length).map(p => {
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

// ====================== つぶやきタイムライン（LINE風） ======================

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

function computeUnreadCount() {
  // 偉人の広場の未読（現在のスロット数 - 最後に読んだスロット数）
  try {
    if (typeof DATA === 'undefined' || !DATA.people) return 0;
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
      <div class="chat-panel-head-name">偉人の広場</div>
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
  fab.addEventListener('click', openChatPanel);
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
  if (DATA.articles.length === 0) {
    list.innerHTML = '<div class="empty">まだ記事がありません</div>';
    return;
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
            その心細い夜の記録を、<br>
            夜明けに消えてしまわないように。
          </p>
          ${renderGuideChara({ pose: 'welcome', copyKey: 'mybookEmpty', size: 'md', layout: 'below' })}
          ${!isLoggedIn ? `
            <button class="my-book-empty-btn" id="myBookLoginBtn">🔑 本棚の鍵を受け取る</button>
            <p class="my-book-empty-note">登録すると、端末を変えても消えずに残ります。</p>
          ` : ''}
        </div>
      </div>
    `;
    const loginBtn = list.querySelector('#myBookLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
      if (typeof openLoginModal === 'function') openLoginModal();
    });
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
  const displayName = userName ? `${title ? `【${title}】` : ''}${userName}` : '';
  const bookTitle = displayName ? `${displayName}の本` : 'わたしの本';

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
          <button class="title-page-edit-name" id="editNameBtn">
            ${userName ? '✎ 名前を変更' : '✎ 名前を設定'}
          </button>
          ${(typeof currentUser !== 'undefined' && currentUser) ? `
            <button class="title-page-edit-name" id="openSettingsBtn">
              ⚙ 自分のことを設定
            </button>
          ` : `
            <button class="title-page-edit-name" id="openSettingsBtn" data-locked="1">
              🔒 自分のことを設定（会員登録後）
            </button>
          `}
          <button class="title-page-edit-name" id="editTitleBtn">
            ${title ? `✎ 称号を変更（現在：${title}）` : '🏆 称号を選ぶ'}
          </button>
          <div class="title-page-social">
            <button class="title-page-social-item" data-open-social="following">
              <div class="title-page-social-num">${favPeople.size}</div>
              <div class="title-page-social-lbl">フォロー中</div>
            </button>
            <button class="title-page-social-item" data-open-social="followers">
              <div class="title-page-social-num">${DATA.people.filter(p => isFollowedByPerson(p.id)).length}</div>
              <div class="title-page-social-lbl">フォロワー</div>
            </button>
            <button class="title-page-social-item" data-open-social="blocked">
              <div class="title-page-social-num">${collectBlockedFromFollowed().length}</div>
              <div class="title-page-social-lbl">ブロック中</div>
            </button>
          </div>
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
      return `
        <div class="person-book ${p.imageUrl ? '' : 'no-img'}" data-id="${p.id}" ${bg}>
          <div class="cover-bookmark"></div>
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
          <div class="cover-bookmark"></div>
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
        <div class="my-book-chapter-intro">偉人の広場に投げかけた、あなた自身の言葉。</div>
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
    el.addEventListener('click', () => {
      if (el.dataset.id) showPerson(el.dataset.id);
      else if (el.dataset.tag) showTag(el.dataset.tag);
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

  // 会員設定ボタン
  const settingsBtn = list.querySelector('#openSettingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsBtn.dataset.locked) {
        if (typeof openLoginModal === 'function') openLoginModal();
      } else {
        openMemberSettings();
      }
    });
  }
  // 名前変更
  const editName = list.querySelector('#editNameBtn');
  if (editName) {
    editName.addEventListener('click', () => openNameEditModal());
  }
  // 称号選択
  const editTitle = list.querySelector('#editTitleBtn');
  if (editTitle) {
    editTitle.addEventListener('click', () => openTitlePickerModal());
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
}

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
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const v = tab.dataset.view;
      history.length = 0;
      showView(v);
      if (v === 'people') renderPeople();
      if (v === 'tags') renderTags();
      if (v === 'routines') renderRoutines();
      if (v === 'articles') renderArticles();
      if (v === 'favorites') renderFavorites();
      // タブごとのBGM
      const homeBgm = document.getElementById('homeBgm');
      const searchBgm = document.getElementById('searchBgm');
      const routineBgm = document.getElementById('routineBgm');
      const blogBgm = document.getElementById('blogBgm');
      const favoritesBgm = document.getElementById('favoritesBgm');
      [homeBgm, searchBgm, routineBgm, blogBgm, favoritesBgm].forEach(b => b && b.pause());
      let target = null;
      if (v === 'people') target = homeBgm;
      else if (v === 'tags') target = searchBgm;
      else if (v === 'routines') target = routineBgm;
      else if (v === 'articles') target = blogBgm;
      else if (v === 'favorites') target = favoritesBgm;
      if (target && !isMuted()) {
        target.volume = 0.35;
        target.play().catch(() => {});
      }
    });
  });
  document.getElementById('backBtn').addEventListener('click', goBack);
  // ヒーローの「わたしの本を開く」ボタン
  document.getElementById('heroToMyBook')?.addEventListener('click', () => {
    const favTab = document.querySelector('.tab[data-view="favorites"]');
    if (favTab) favTab.click();
  });
  // このサイトの使い方ポップアップ
  document.getElementById('howtoOpenBtn')?.addEventListener('click', () => {
    const src = document.getElementById('howtoCard');
    const body = src?.querySelector('.howto-body');
    if (!body) return;
    const modal = document.createElement('div');
    modal.className = 'howto-modal';
    modal.innerHTML = `
      <div class="howto-modal-backdrop" data-close="1"></div>
      <div class="howto-modal-panel">
        <button class="howto-modal-close" data-close="1" aria-label="閉じる">×</button>
        <div class="howto-modal-head">このサイトの使い方</div>
        <div class="howto-modal-body">${body.innerHTML}</div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 200);
    }));
  });
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

// ====================== 歴史の案内人 ラビン ======================
// 文言パターン（1箇所あたり3案。表示ごとにランダム選択）
const GUIDE_NAME = 'ラビン';
const GUIDE_COPY = {
  hero: [
    'ようこそ、本棚へ。ぼく、ラビン。120人の偉人が待ってるよ。',
    'はじめまして。歴史の案内人、ラビンです。',
    '僕と一緒に、歴史の旅に出よう。',
  ],
  howto: [
    '初めての方は、まずこれを読んでね。',
    '使い方を3分で案内するよ。タップして開こう。',
    '本棚の歩き方、ここで手短にお伝えします。',
  ],
  match: [
    '気になるものをひとつ選べば大丈夫。',
    '好きなもの・誕生日——共通点を辿ってみて。',
    'あなたに似た一冊が、きっと見つかる。',
  ],
  tags: [
    '時代・国・ルーティンで、偉人を探せるよ。',
    '朝型？夜型？共通点から偉人を見つけよう。',
    '似たリズムの偉人を、ここで探してみて。',
  ],
  routines: [
    '偉人たちの1日を、覗いてみる？',
    'バッハの朝、漱石の夜——見てみよう。',
    '時間で見ると、また違う本になるよ。',
  ],
  articles: [
    'この章は、ここから始まります。',
    '静かに読んでいってね。',
    '読み終えたら、そっと栞を挟もう。',
  ],
  mybookEmpty: [
    '最初の一枚は、気になる言葉ひとつでいいよ。',
    'まだ白紙。ゆっくり編んでいこう。',
    '☆や♡を押すと、ここに綴じていくよ。',
  ],
  login: [
    '本棚の鍵を受け取ると、この一冊を残しておけるよ。',
    '端末が変わっても、本は消えない。',
    'いつでも外せるし、戻ってこれる。',
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
        <video class="guide-chara-video" autoplay loop muted playsinline preload="metadata" aria-hidden="true">
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
  // 1. ヒーロー直下: 初回訪問時のみ（localStorageで制御）
  const HERO_KEY = 'ijin_guide_hero_seen';
  const heroSeen = localStorage.getItem(HERO_KEY);
  if (!heroSeen) {
    const heroSection = document.querySelector('.hero-silhouette');
    if (heroSection && !heroSection.parentNode.querySelector('.guide-hero-wrap')) {
      const html = `
        <div class="guide-hero-wrap">
          ${renderGuideChara({ pose: 'welcome', copyKey: 'hero', size: 'lg', layout: 'below' })}
          <button class="guide-hero-dismiss" aria-label="閉じる">閉じる ×</button>
        </div>
      `;
      heroSection.insertAdjacentHTML('afterend', html);
      const wrap = heroSection.parentNode.querySelector('.guide-hero-wrap');
      wrap?.querySelector('.guide-hero-dismiss')?.addEventListener('click', () => {
        localStorage.setItem(HERO_KEY, '1');
        wrap.remove();
      });
    }
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
  renderHeroStats();
  renderUpdates();
  renderOshi();
  renderTraitsMatch();
  renderTodayBirthday();
  renderCalendarToday();
  renderPersonOfTheDay();
  renderQuoteOfTheDay();
  renderQuoteCarousel();
  renderFeaturedTags();
  renderHomeBooks();
  renderArticles();
  renderCategoryFilter();
  renderPeople();
  renderTags();
  bindSearchPanel();
  await loadComments();
  initChatWidget();
  renderRoutines();
  renderFavorites();
  renderBookshelfGuides();
  initGuideCharaObserver();
  history.push('people');
})();
