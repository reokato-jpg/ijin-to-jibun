// ====================== Amazon アフィリエイト設定 ======================
const AMAZON_TAG = 'placeholder-22'; // ← ここを自分のAmazonアソシエイトタグに変更

function amazonUrl(asin) {
  return `https://www.amazon.co.jp/dp/${asin}?tag=${AMAZON_TAG}`;
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
  try { return JSON.parse(localStorage.getItem(DIARY_KEY) || '[]'); }
  catch { return []; }
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
  container.innerHTML = `
    <div class="quote-of-the-day">
      <button class="qod-fav ${faved ? 'active' : ''}" data-qod-fav="${qk}" aria-label="お気に入り">${faved ? '★' : '☆'}</button>
      <div class="qod-text">${pick.quote.text}</div>
      <div class="qod-attrib" data-id="${pick.person.id}">
        <span class="qod-name">— ${pick.person.name}</span>
        ${pick.quote.source ? `(${pick.quote.source})` : ''}
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
        <div class="potd-meta">${pick.birth || '?'}-${pick.death || ''} ／ ${pick.country} ／ ${pick.field}</div>
        <div class="potd-summary">${pick.summary}</div>
      </div>
    </div>
  `;
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

  container.innerHTML = `
    <div class="mood-picker">
      <div class="mood-picker-title">今日のあなたの気分は？</div>
      <div class="mood-picker-sub">選ぶと、その感情を経験した偉人が今日の案内人になります</div>
      <div class="mood-chips">
        ${popularTags.map(t => `
          <button class="mood-chip" data-mood="${t.id}" style="background:${t.color}">${t.name}</button>
        `).join('')}
      </div>
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
        <div class="oshi-meta">${p.birth || '?'}-${p.death || ''} ／ ${p.field}</div>
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

  const pushBookOf = (pid, label) => {
    if (!pid) return;
    const p = DATA.people.find(x => x.id === pid);
    if (!p || !(p.books || []).length) return;
    const b = p.books[seed % p.books.length];
    if (!b.asin || usedAsins.has(b.asin)) return;
    usedAsins.add(b.asin);
    picked.push({ ...b, person: p, label });
  };
  pushBookOf(getOshi(), '♡ 推しの一冊');
  try {
    const t = getTodaysCompanion && getTodaysCompanion();
    if (t && t.personId) pushBookOf(t.personId, '本日の案内人');
  } catch (e) {}

  // 残りをランダム（日替わり）で埋める
  const all = [];
  DATA.people.forEach(p => {
    (p.books || []).forEach(b => { if (b.asin && !usedAsins.has(b.asin)) all.push({ ...b, person: p }); });
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
    <a class="home-book-card" href="${amazonUrl(b.asin)}" target="_blank" rel="noopener">
      <div class="home-book-cover-wrap">
        <div class="home-book-cover" style="background-image:url('${amazonCover(b.asin)}')"></div>
        ${b.label ? `<div class="home-book-ribbon">${b.label}</div>` : ''}
      </div>
      <div class="home-book-title">${b.title}</div>
      <div class="home-book-person">${b.person.name}</div>
    </a>
  `).join('');
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
    return (p.name + (p.nameEn || '') + p.field + p.country + p.summary).toLowerCase().includes(q);
  });
  // 無条件（ホーム初期表示）のときは日替わりでピック
  // HP版（900px以上）なら6人、スマホなら3人
  const isDefault = !q && currentCategory === 'all' && currentEra === 'all';
  if (isDefault) {
    const seed = daySeed();
    const pickCount = (typeof window !== 'undefined' && window.innerWidth >= 900) ? 6 : 3;
    items = items.slice().sort((a, b) => ((hashStr(a.id) ^ seed) >>> 0) - ((hashStr(b.id) ^ seed) >>> 0)).slice(0, pickCount);
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
        <button class="person-book-bookmark ${isFavPerson(p.id) ? 'active' : ''}" data-fav-toggle="${p.id}" aria-label="お気に入り"></button>
        <div class="person-book-overlay"></div>
        ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
        <div class="person-book-info">
          ${p.nameEn ? `<div class="person-book-en">${p.nameEn}</div>` : ''}
          <div class="person-book-name">${p.name}</div>
          <div class="person-book-meta">${p.birth || '?'}–${p.death || ''} ／ ${p.field}</div>
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
          <div class="book-cover-ornament">❦ ─── ◆ ─── ❦</div>
          <div class="book-cover-name">${title}</div>
          <div class="book-cover-dates">${subtitle || ''}</div>
          <div class="book-cover-ornament">❦ ─── ◆ ─── ❦</div>
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
async function showPerson(id) {
  const p = DATA.people.find(x => x.id === id);
  if (!p) return;
  // アニメーション再生中に裏で詳細を描画
  const flipPromise = playBookFlip({
    title: p.name,
    nameEn: p.nameEn,
    subtitle: `${p.birth || '?'}–${p.death || ''} ／ ${p.field}`,
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
    const shareText = `${title ? title + '\n' : ''}${body || ''}\n— ${p.name} 『偉人と自分。』より`;
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
      icon: 'book', typeLabel: '📘 関連本',
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
        <div class="profile-cover-orn-top">❦ ── ◆ ── ❦</div>
        <div class="profile-cover-name">${p.name}</div>
        ${p.nameEn ? `<div class="profile-cover-name-en">${p.nameEn}</div>` : ''}
        <div class="profile-cover-dates">${p.birth || '?'} — ${p.death || ''}</div>
        <div class="profile-cover-orn-bot">❦ ── ◆ ── ❦</div>
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
          ${favPersonBtn(p.id)}
          <button class="oshi-set-btn ${getOshi() === p.id ? 'active' : ''}" data-oshi-set="${p.id}">
            ${getOshi() === p.id ? '♡ 推し中' : '♡ 推しにする'}
          </button>
        </div>
      </div>
      <div class="profile-meta">
        <span>${p.field}</span>
        <span>${p.country}</span>
        <span>${p.birth}–${p.death || ''}</span>
      </div>
      <div class="profile-bio">${p.summary}</div>
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
    </div>

    ${(p.routine && p.routine.length > 0) ? `
      <button class="routine-open-btn" data-routine-open="1">
        <span class="routine-open-icon">🕐</span>
        <span class="routine-open-label">1日のルーティンを見る</span>
        <span class="routine-open-arrow">→</span>
      </button>
    ` : ''}

    <!-- ミニタブ -->
    <div class="profile-tabs">
      <button class="profile-tab active" data-ptab="stream">タイムライン</button>
      <button class="profile-tab" data-ptab="quotes">名言</button>
      <button class="profile-tab" data-ptab="timeline">年表</button>
      ${(p.relations && p.relations.length > 0) ? '<button class="profile-tab" data-ptab="relations">人間関係</button>' : ''}
      ${(p.works && p.works.length > 0) ? '<button class="profile-tab" data-ptab="works">代表作</button>' : ''}
      ${(p.media && p.media.length > 0) ? '<button class="profile-tab" data-ptab="media">映画・ドラマ</button>' : ''}
      <button class="profile-tab" data-ptab="happenings">イベント・グッズ</button>
      ${(p.books && p.books.length > 0) ? '<button class="profile-tab" data-ptab="books">関連本</button>' : ''}
      ${(p.places && p.places.length > 0) ? '<button class="profile-tab" data-ptab="places">聖地巡礼</button>' : ''}
      <button class="profile-tab" data-ptab="letters">手紙</button>
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
            return `
              <div class="place-card">
                <div class="place-pin">📍</div>
                <div class="place-info">
                  <div class="place-name">${place.name}</div>
                  <div class="place-location">${place.location}</div>
                  ${place.note ? `<div class="place-note">${place.note}</div>` : ''}
                  <div class="place-links">
                    <a class="place-link" href="${mapUrl}" target="_blank" rel="noopener">地図で見る</a>
                    <a class="place-link place-link-sub" href="${altUrl}" target="_blank" rel="noopener">周辺地域</a>
                    <a class="place-link place-link-sub" href="${webUrl}" target="_blank" rel="noopener">詳しく調べる</a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <!-- 人間関係タブ -->
    ${(p.relations && p.relations.length > 0) ? `
      <div class="profile-tab-content" data-ptab="relations">
        <div class="relations-grid">
          ${p.relations.map(r => {
            const linked = r.id ? DATA.people.find(x => x.id === r.id) : null;
            const avatar = linked && linked.imageUrl
              ? `<div class="relation-avatar" style="background-image:url('${linked.imageUrl}')"></div>`
              : `<div class="relation-avatar no-img">${(linked || r).name.charAt(0)}</div>`;
            return `
              <div class="relation-item ${linked ? 'linked' : ''}" ${linked ? `data-id="${linked.id}"` : ''}>
                ${avatar}
                <div class="relation-info">
                  <div class="relation-name">${(linked ? linked.name : r.name)}${linked ? ' <span class="relation-linked-badge">→</span>' : ''}</div>
                  <div class="relation-role">${r.relation}${r.years ? ` · ${r.years}` : ''}</div>
                  ${r.note ? `<div class="relation-note">${r.note}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

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
          // 作曲家・音楽家：サムネは使わずクリーンなカード
          const isMusic = /作曲家|ピアニスト|音楽|指揮者/.test(p.field || '');
          if (w.youtubeId || isMusic) {
            const searchQ = encodeURIComponent(`${p.name} ${w.title}`);
            const ytSearch = w.youtubeSearchUrl || `https://www.youtube.com/results?search_query=${searchQ}`;
            const betterImslp = buildImslpUrl(p, w);
            return `
              <div class="work-card work-music work-music-search" data-open-url="${ytSearch}">
                ${favWorkBtn(p.id, w)}
                <div class="work-thumb work-thumb-placeholder">
                  <div class="work-play">▶</div>
                  <div class="work-thumb-label">YouTube で聴く</div>
                </div>
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
          // 哲学・文学・科学などのyoutube解説動画検索カード
          if (w.youtubeSearchUrl || /哲学|作家|小説家|科学|画家|武士|政治|軍人|戦国|幕末|維新/.test(p.field || '')) {
            const searchQ = encodeURIComponent(`${p.name} ${w.title}`);
            const ytSearch = w.youtubeSearchUrl || `https://www.youtube.com/results?search_query=${searchQ}`;
            return `
              <div class="work-card work-music work-music-search" data-open-url="${ytSearch}">
                ${favWorkBtn(p.id, w)}
                <div class="work-thumb work-thumb-placeholder">
                  <div class="work-play">🔎</div>
                  <div class="work-thumb-label">YouTube で調べる</div>
                </div>
                <div class="work-info">
                  <div class="work-type">${w.type}${w.year ? ` · ${w.year}` : ''}</div>
                  <div class="work-title">${w.title}</div>
                  <div class="work-desc">${w.description || ''}</div>
                  <div class="work-links">
                    <a class="work-btn work-btn-yt" href="${ytSearch}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><span class="work-btn-icon">▶</span> 解説動画を探す</a>
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

    <!-- イベント・グッズタブ -->
    <div class="profile-tab-content" data-ptab="happenings">
      ${(p.happenings && p.happenings.length > 0) ? `
        <p class="happenings-intro">${p.name}の展覧会・イベント・商品など。期間限定のものもあるので公式サイトでご確認を。</p>
        <div class="happenings-list">
          ${p.happenings.map(h => {
            const typeLabel = { exhibition: '🎨 展覧会', concert: '🎵 公演・演奏会', festival: '🎭 フェス・記念祭', goods: '🛍 グッズ', book_fair: '📚 ブックフェア', other: '✨ その他' }[h.type] || '✨ イベント';
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
      ` : `
        <div class="happenings-empty">
          <div class="happenings-empty-icon">🎨</div>
          <p class="happenings-empty-title">${p.name}関連のイベント情報</p>
          <p class="happenings-empty-text">
            現在登録されているイベント情報はありません。<br>
            最新の展覧会・公演・グッズ情報は、以下で探せます。
          </p>
          <div class="happenings-empty-links">
            <a class="happening-btn" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' 展覧会 2026')}" target="_blank" rel="noopener">🎨 展覧会を探す</a>
            <a class="happening-btn" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' イベント')}" target="_blank" rel="noopener">🎭 イベントを探す</a>
            <a class="happening-btn" href="https://www.google.com/search?q=${encodeURIComponent(p.name + ' グッズ')}" target="_blank" rel="noopener">🛍 グッズを探す</a>
          </div>
          <div class="happenings-ad-slot">
            <div class="ad-slot-badge">AD</div>
            <div class="ad-slot-main">
              <div class="ad-slot-title">${p.name}関連の告知募集中</div>
              <div class="ad-slot-sub">展示会・公演・書籍出版など、この枠でお知らせできます</div>
              <a class="ad-slot-cta" href="mailto:natsumi.by.piano@gmail.com?subject=『偉人と自分。』${p.name}ページの広告掲載について">お問い合わせ →</a>
            </div>
          </div>
        </div>
      `}
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
          const amazonUrl = m.asin ? `https://www.amazon.co.jp/dp/${m.asin}` : '';
          const amazonCoverUrl = m.asin ? `https://images-na.ssl-images-amazon.com/images/P/${m.asin}.09.LZZZZZZZ.jpg` : '';
          const thumbFinal = amazonCoverUrl || thumb;
          // 将来の拡張用：stores配列があればそこから、なければAmazon単独
          // 例: m.stores = [{name:'楽天', url:'https://...'}, {name:'Amazon', url:'...'}]
          const stores = Array.isArray(m.stores) ? m.stores : [];
          if (amazonUrl && !stores.some(s => s.name === 'Amazon')) {
            stores.unshift({ name: 'Amazon', url: amazonUrl });
          }
          // 購入先が無い場合は検索フォールバック
          const searchQ = encodeURIComponent(`${m.title} ${m.type === 'drama' ? 'ドラマ' : m.type === 'anime' ? 'アニメ' : '映画'} DVD`);
          const fallbackUrl = `https://www.amazon.co.jp/s?k=${searchQ}`;
          return `
            <div class="media-card">
              <div class="media-thumb" ${thumbFinal ? `style="background-image:url('${thumbFinal}')"` : ''}>
                ${!thumbFinal ? '<div class="media-thumb-fallback">🎬</div>' : ''}
              </div>
              <div class="media-info">
                <div class="media-type">${typeLabel}${m.year ? ` · ${m.year}` : ''}${m.country ? ` · ${m.country}` : ''}</div>
                <div class="media-title">${m.title}</div>
                ${m.cast ? `<div class="media-cast">${m.roleLabel || '主演'}: ${m.cast}</div>` : ''}
                ${m.director ? `<div class="media-cast">監督: ${m.director}</div>` : ''}
                ${m.description ? `<div class="media-desc">${m.description}</div>` : ''}
                <div class="media-links">
                  ${stores.length > 0
                    ? stores.map(s => `<a class="media-btn media-btn-${s.name === 'Amazon' ? 'amazon' : s.name === '楽天' ? 'rakuten' : 'store'}" href="${s.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${s.name === 'Amazon' ? '📦' : s.name === '楽天' ? '🛒' : '🎬'} ${s.name}で見る</a>`).join('')
                    : `<a class="media-btn media-btn-amazon" href="${fallbackUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">📦 Amazonで探す</a>`
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
      ${p.books.map(b => `
        <div class="book-card">
          <div class="book-card-cover" style="background-image:url('${amazonCover(b.asin)}')"></div>
          <div class="book-card-info">
            <div class="book-card-title">${b.title}</div>
            <div class="book-card-author">${b.author}</div>
            <div class="book-card-desc">${b.description}</div>
            <a class="book-card-link" href="${amazonUrl(b.asin)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Amazonで見る</a>
          </div>
        </div>
      `).join('')}
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

  // ミニタブ切り替え
  container.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.ptab;
      container.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t.dataset.ptab === target));
      container.querySelectorAll('.profile-tab-content').forEach(c => c.classList.toggle('active', c.dataset.ptab === target));
    });
  });

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

  // 関連する偉人（リンク付き）
  container.querySelectorAll('.relation-item.linked').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.id) showPerson(el.dataset.id);
    });
  });

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

// 国名を地域に正規化（同国異表記をまとめる）
function normalizeCountry(c) {
  if (!c) return '';
  const s = String(c);
  // スラッシュや読点で分割された最初の国を採用
  const first = s.split(/[／\/・,、]/)[0].trim();
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
  if (!eraBar || !sortBar) return;
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
      const blob = (p.name + (p.nameEn || '') + p.field + p.country + p.summary).toLowerCase();
      const tagMatch = (p.events || []).some(e => (e.tags || []).some(tid => {
        const t = DATA.tagMap[tid];
        return t && t.name.toLowerCase().includes(q);
      }));
      return blob.includes(q) || tagMatch;
    });
    // 時代絞り込み
    if (currentSearchEra !== 'all' && ERA_RULES[f]) {
      personItems = personItems.filter(p => eraOf(f, p.birth) === currentSearchEra);
    }
    // 国絞り込み
    if (currentSearchCountry !== 'all') {
      personItems = personItems.filter(p => normalizeCountry(p.country) === currentSearchCountry);
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

  // 感情セクション
  if (tagItems.length > 0) {
    html += `<div class="search-section-label">感情の本棚</div>
    <p class="search-section-desc">悲しみ、逃避、燃え尽き…。あなたが今感じている感情を選ぶと、その感情を乗り越えた偉人たちに出会えます。本の帯（背表紙）の数字は、その感情を経験した人数です。</p>`;
    html += `<div class="book-grid">${tagItems.map(t => {
      const color = spineColor('t_' + t.id);
      const bg = TAG_BG_MAP[color] || TAG_BG_MAP['spine-wine'];
      return `
        <a class="article-card tag-book-card" data-tag="${t.id}" style="background:${bg}">
          <div class="article-author-name tag-book-count">${t.count} の軌跡</div>
          <div class="tag-book-center">
            <div class="cover-tag-ornament">❦</div>
            <div class="tag-book-name">${t.name}</div>
            <div class="cover-tag-ornament">❦</div>
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
          <button class="person-book-bookmark ${isFavPerson(p.id) ? 'active' : ''}" data-fav-toggle="${p.id}" aria-label="お気に入り"></button>
          <div class="person-book-overlay"></div>
          ${!p.imageUrl ? `<div class="person-book-placeholder">${p.name.charAt(0)}</div>` : ''}
          <div class="person-book-info">
            ${p.nameEn ? `<div class="person-book-en">${p.nameEn}</div>` : ''}
            <div class="person-book-name">${p.name}</div>
            <div class="person-book-meta">${p.birth || '?'}–${p.death || ''} ／ ${p.field}</div>
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
      const id = btn.dataset.favToggle;
      toggleFavPerson(id);
      btn.classList.toggle('active');
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
  const FAV_TAGS_KEY = 'ijin_fav_tags';
  const favTags = loadSet(FAV_TAGS_KEY);
  const flipPromise = playBookFlip({
    title: tag.name,
    subtitle: '感情の書'
  });
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
  const matches = [...byPerson.values()]
    .sort((a, b) => (a.person.birth || 0) - (b.person.birth || 0));
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
        <span>この感情を経験した人々</span>
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
  const companion = getTodaysCompanion();
  if (!companion) return 0;
  const all = getCompanionPosts(companion.person);
  const elapsed = Date.now() - companion.chatStart;
  const unlock = Math.min(all.length, Math.floor(elapsed / CHAT_INTERVAL_MS) + 1);
  const seen = getSeenCount(companion.person.id);
  return Math.max(0, unlock - seen);
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

function openChatPanel() {
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('chatFab').classList.add('hidden');
  renderChatPanel();
  // 既読にする
  const companion = getTodaysCompanion();
  if (companion) {
    const all = getCompanionPosts(companion.person);
    const elapsed = Date.now() - companion.chatStart;
    const unlock = Math.min(all.length, Math.floor(elapsed / CHAT_INTERVAL_MS) + 1);
    setSeenCount(companion.person.id, unlock);
  }
  updateChatBadge();
}
function closeChatPanel() {
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('chatFab').classList.remove('hidden');
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
    const companion = getTodaysCompanion();
    if (!companion) {
      alert('まずホームで今日の気分を選んでください。');
      return;
    }
    const body = document.getElementById('chatPanelBody');
    // メッセージが未送信でも呼びかけ可能。その場合は "call" キー
    const key = (body && body.dataset.latestKey) || `call::${companion.person.id}`;
    await submitComment(key, text);
    input.value = '';
    // 呼びかけると偉人が次の言葉で応える（1通アンロック）
    advanceChatUnlock();
    renderChatPanel();
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
      <div class="article-card-wrap">
        <a class="article-card" href="${art.url}" target="_blank" rel="noopener">
          ${authorName ? `<div class="article-author-name">${authorName}</div>` : ''}
          ${art.thumbnail ? `<div class="article-thumb" style="background-image:url('${art.thumbnail}')"></div>` : ''}
        </a>
        <a class="article-caption" href="${art.url}" target="_blank" rel="noopener">
          <div class="article-badges">
            <span class="article-source">${art.source || 'web'}</span>
            ${art.category ? `<span class="article-category">${art.category}</span>` : ''}
          </div>
          <div class="article-title">${art.title}</div>
          ${art.description ? `<div class="article-desc">${art.description}</div>` : ''}
          ${art.date ? `<div class="article-date">${art.date}</div>` : ''}
        </a>
      </div>
    `;
  });
  // 3の倍数に満たない場合、空の本で埋める
  const remainder = articlesHtml.length % 3;
  const fillCount = remainder === 0 ? 0 : 3 - remainder;
  const placeholders = Array(fillCount).fill(0).map(() => `
    <div class="article-card-wrap">
      <div class="article-card article-card-empty">
        <div class="article-card-empty-inner">
          <div class="article-card-empty-ornament">❦</div>
          <div class="article-card-empty-text">Coming soon</div>
        </div>
      </div>
    </div>
  `);
  list.innerHTML = `<div class="article-grid">${articlesHtml.join('')}${placeholders.join('')}</div>`;
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
  const FAV_TAGS_KEY = 'ijin_fav_tags';
  const favTagSet = loadSet(FAV_TAGS_KEY);
  const favTagItems = DATA.tags.filter(t => favTagSet.has(t.id));
  const diaryEntries = loadDiary();
  const totalCollections = favPeopleItems.length + favEventItems.length + favQuoteItems.length + favRoutineItems.length + favTagItems.length;
  const totalItems = totalCollections + diaryEntries.length;

  if (totalItems === 0) {
    list.innerHTML = `
      <div class="my-book-empty">
        <div class="my-book-empty-cover">
          <div class="my-book-empty-inner">
            <div class="my-book-empty-ornament">❦</div>
            <div class="my-book-empty-title">あなたの本</div>
            <div class="my-book-empty-sub">まだ白紙です</div>
            <div class="my-book-empty-ornament">❦</div>
          </div>
        </div>
        <div class="my-book-empty-text">
          お気に入りの人物・出来事・名言の <b>☆</b> をタップすると<br>
          ここに集まって、<br>
          <b>あなただけの一冊</b>ができあがります。
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
  if (favPeopleItems.length > 0) tocItems.push({ id: 'chap-people', title: 'お手本にしたい人', count: favPeopleItems.length });
  if (favQuoteItems.length > 0) tocItems.push({ id: 'chap-quotes', title: '心に留める言葉', count: favQuoteItems.length });
  if (favTagItems.length > 0) tocItems.push({ id: 'chap-tags', title: '向き合いたい感情', count: favTagItems.length });
  if (favRoutineItems.length > 0) tocItems.push({ id: 'chap-routines', title: '取り入れたいルーティン', count: favRoutineItems.length });
  if (favEventItems.length > 0) tocItems.push({ id: 'chap-events', title: 'なぞりたい瞬間', count: favEventItems.length });
  tocItems.push({ id: 'chap-diary', title: 'わたしの日記', count: diaryEntries.length });

  const userName = getUserName();
  const bookTitle = userName ? `${userName}の本` : 'わたしの本';

  let html = `
    <div class="open-book">
      <!-- 左ページ: 扉絵（タイトルページ） -->
      <div class="open-page open-page-left">
        <div class="title-page">
          <div class="title-page-top">❦ ── ◆ ── ❦</div>
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
          <div class="title-page-bottom">❦ ── ◆ ── ❦</div>
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
            <div class="person-book-meta">${p.birth || '?'}–${p.death || ''} ／ ${p.field}</div>
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
            <div class="cover-tag-ornament">❦</div>
            <div class="tag-book-name">${t.name}</div>
            <div class="cover-tag-ornament">❦</div>
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

  // 名前変更
  const editName = list.querySelector('#editNameBtn');
  if (editName) {
    editName.addEventListener('click', () => {
      const current = getUserName();
      const name = prompt('本に載せる名前を入力してください（空欄で「わたしの本」に戻ります）', current);
      if (name === null) return;
      setUserName(name);
      renderFavorites();
    });
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
    });
  });
  document.getElementById('backBtn').addEventListener('click', goBack);
  document.getElementById('searchBtn').addEventListener('click', () => {
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

// ====================== 起動 ======================
(async () => {
  await loadData();
  await loadComments();
  bindEvents();
  renderHeroStats();
  renderOshi();
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
  history.push('people');
})();
