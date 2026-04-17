// ==================== AIに相談 ====================
// 現在の気持ち／悩み／出来事 + カテゴリから、合う偉人を1〜3人おすすめする。
//
// 利用条件：
//  - 未ログイン：使えない（ログイン画面へ誘導）
//  - ログイン済：1日1回まで
//
// バックエンド：
//  - AI_ENDPOINT を設定するとそのAPIに投げる（要バックエンド）
//  - 未設定時はクライアント側のルールベース推薦（感情タグ×カテゴリ）

const AI_ENDPOINT = ''; // 例: 'https://your-vercel-app.vercel.app/api/ai-consult'

const AI_CATEGORIES = [
  { id: 'any',       label: 'なんでも' },
  { id: 'music',     label: '音楽家' },
  { id: 'philo',     label: '哲学者' },
  { id: 'literature',label: '作家' },
  { id: 'art',       label: '画家' },
  { id: 'history',   label: '武将・志士' },
  { id: 'science',   label: '科学者' },
];

// 感情キーワード → 既存のタグIDへのマッピング
const KEYWORD_TAGS = [
  { re: /(逃げ|避け|辞め|やめ|抜け|抜|放棄)/, tag: 'escape' },
  { re: /(挫折|失敗|つまず|諦め|負け|だめ)/, tag: 'setback' },
  { re: /(燃え尽き|疲れ|もう無理|消耗|やる気|バーンアウト)/, tag: 'burnout' },
  { re: /(孤独|ひとり|一人|独り|疎外|寂し|さびし)/, tag: 'isolation' },
  { re: /(失恋|振ら|捨て|別れ|失った愛|片思い)/, tag: 'heartbreak' },
  { re: /(喪失|死|亡く|失う|別れ|ロス)/, tag: 'loss' },
  { re: /(認め|称賛|賞賛|褒め|評価|承認|自信)/, tag: 'approval' },
  { re: /(空白|ブランク|停滞|なにもしたくない|何もない)/, tag: 'blank_period' },
  { re: /(プライド|恥|屈辱|やり直せない)/, tag: 'pride_broken' },
  { re: /(病気|病|体調|入院|体が)/, tag: 'illness' },
  { re: /(再起|やり直|立ち直|リセット|新しい)/, tag: 'restart' },
  { re: /(貧乏|貧困|お金ない|食えない|生活|金欠)/, tag: 'poverty' },
  { re: /(出会い|運命|転機|運命の|救われた)/, tag: 'turning_encounter' },
  { re: /(突破|ブレイク|成功|ついに|達成)/, tag: 'breakthrough' },
  { re: /(親|父|母|家族|兄弟|姉妹)/, tag: 'parent_conflict' },
  { re: /(自己否定|自分なんて|罪悪感|ダメ人間)/, tag: 'self_denial' },
];

function detectTagsFromText(text) {
  const found = [];
  KEYWORD_TAGS.forEach(({re, tag}) => {
    if (re.test(text)) found.push(tag);
  });
  if (found.length === 0) found.push('isolation'); // デフォルト
  return [...new Set(found)];
}

// カテゴリID → データ側の field 判定関数（app.js の CATEGORY_RULES に合わせる）
function matchesCategory(person, catId) {
  if (catId === 'any') return true;
  const f = person.field || '';
  if (catId === 'music') return /作曲家|ピアニスト|演奏家|音楽|指揮者/.test(f);
  if (catId === 'philo') return /哲学/.test(f);
  if (catId === 'literature') return /小説家|作家|詩人|歌人|俳人|劇作家|文学者/.test(f);
  if (catId === 'art') return /画家|彫刻家|美術|浮世絵師/.test(f);
  if (catId === 'history') return /武士|武将|志士|藩士|政治家|軍人|大名|局長|副長|戦国|維新|幕末/.test(f);
  if (catId === 'science') return /科学|数学者|物理学者|生物学者|医師|医学|博物学/.test(f);
  return true;
}

// ルールベースのおすすめ（バックエンド無しでも動作）
function recommendPeople(text, selectedCats) {
  const tags = detectTagsFromText(text);
  const people = (typeof DATA !== 'undefined') ? DATA.people : [];
  // カテゴリフィルタ
  const cats = selectedCats.length ? selectedCats : ['any'];
  const pool = people.filter(p => cats.some(c => matchesCategory(p, c)));
  // 各人のスコア：タグ一致数
  const scored = pool.map(p => {
    let score = 0;
    const matched = [];
    (p.events || []).forEach(e => {
      (e.tags || []).forEach(t => {
        if (tags.includes(t)) {
          score += 1;
          matched.push({ year: e.year, title: e.title, tag: t });
        }
      });
    });
    return { p, score, matched };
  });
  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return { tags, picks: scored.slice(0, 3).filter(s => s.score > 0 || pool.length < 5) };
}

// ==================== 利用制限 ====================
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getAIUsage() {
  try { return JSON.parse(localStorage.getItem('ijin_ai_usage') || '{}'); }
  catch { return {}; }
}
function incrementAIUsage() {
  const u = getAIUsage();
  const t = todayStr();
  u[t] = (u[t] || 0) + 1;
  localStorage.setItem('ijin_ai_usage', JSON.stringify(u));
}
function canUseAI() {
  const u = getAIUsage();
  return (u[todayStr()] || 0) < 1;
}
function usedCountToday() {
  return getAIUsage()[todayStr()] || 0;
}

// ==================== UI ====================
function openAIConsultModal() {
  const existing = document.getElementById('aiConsultModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'aiConsultModal';
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-backdrop" data-close></div>
    <div class="auth-modal-panel ai-panel">
      <button class="auth-modal-close" data-close>×</button>
      <div class="auth-head">
        <div class="auth-title">💫 いまの気持ちを話す</div>
        <div class="auth-sub">
          あなたにぴったりの偉人を、AIが紹介します。
        </div>
      </div>
      <div id="aiGate" class="ai-gate"></div>
      <div id="aiContent" class="ai-content hidden">
        <label class="auth-label">
          <span class="ai-label-text">いまの気持ち・悩み・起きたこと</span>
          <textarea id="aiText" rows="4" placeholder="例：仕事を辞めて何もしたくない日が続いてる...">${window.__aiInitialText || ''}</textarea>
        </label>
        <div class="ai-label-text" style="margin-bottom:6px">どんな人の話を聞きたい？</div>
        <div class="ai-cats" id="aiCats">
          ${AI_CATEGORIES.map(c => `
            <label class="ai-cat-chip">
              <input type="checkbox" value="${c.id}" ${c.id==='any'?'checked':''}>
              <span>${c.label}</span>
            </label>
          `).join('')}
        </div>
        <button class="auth-submit" id="aiRun">💫 相談する（本日 残り ${canUseAI() ? '1' : '0'} 回）</button>
        <div class="auth-footnote">無料登録で1日1回まで利用できます。より多く使う有料プランは準備中。</div>
      </div>
      <div id="aiResult" class="ai-result hidden"></div>
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

  const gate = modal.querySelector('#aiGate');
  const content = modal.querySelector('#aiContent');
  const result = modal.querySelector('#aiResult');

  // ログインチェック（auth.js が window に公開している）
  const user = window.currentUser || null;
  const firebaseEnabled = !!window.FIREBASE_ENABLED;

  if (!user) {
    gate.innerHTML = `
      <div class="ai-gate-block">
        <div class="ai-gate-icon">🔒</div>
        <div class="ai-gate-title">${firebaseEnabled ? '無料登録が必要です' : 'この機能は準備中です'}</div>
        <p class="ai-gate-text">
          ${firebaseEnabled
            ? 'AI相談は登録ユーザーが対象です。<br>無料で登録すると、1日1回まで利用できます。'
            : 'ログイン機能のセットアップ後にご利用いただけます。<br>運営にお問い合わせください。'}
        </p>
        <button class="auth-submit" id="aiLoginBtn">${firebaseEnabled ? '無料登録・ログインする' : '閉じる'}</button>
      </div>
    `;
    const btn = gate.querySelector('#aiLoginBtn');
    btn.addEventListener('click', () => {
      modal.classList.remove('open');
      setTimeout(() => {
        modal.remove();
        if (firebaseEnabled && typeof window.openLoginModal === 'function') window.openLoginModal();
      }, 200);
    });
    return;
  }

  // 利用回数チェック
  if (!canUseAI()) {
    gate.innerHTML = `
      <div class="ai-gate-block">
        <div class="ai-gate-icon">🌙</div>
        <div class="ai-gate-title">本日の相談は終了しました</div>
        <p class="ai-gate-text">
          AI相談は1日1回までご利用いただけます。<br>
          明日またお会いしましょう。
        </p>
      </div>
    `;
    return;
  }

  // 利用可能
  content.classList.remove('hidden');
  modal.querySelector('#aiRun').addEventListener('click', async () => {
    const text = modal.querySelector('#aiText').value.trim();
    if (!text) {
      alert('いまの気持ちを書いてください。');
      return;
    }
    const selectedCats = Array.from(modal.querySelectorAll('#aiCats input:checked')).map(x => x.value);

    // 使用回数を増やす
    incrementAIUsage();
    // クラウド同期（ログイン中なら）
    if (user && typeof window.pushToCloud === 'function') {
      window.pushToCloud(user);
    }

    content.classList.add('hidden');
    result.classList.remove('hidden');
    result.innerHTML = `<div class="ai-loading">💫 考え中...</div>`;

    let reply;
    if (AI_ENDPOINT) {
      // 実APIを呼ぶ
      try {
        const res = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, categories: selectedCats, userId: user.uid })
        });
        reply = await res.json();
      } catch (e) {
        console.error('AI API error:', e);
        reply = null;
      }
    }
    if (!reply) {
      // ルールベースのフォールバック
      const { tags, picks } = recommendPeople(text, selectedCats);
      reply = { tags, picks: picks.map(s => ({
        id: s.p.id, name: s.p.name, field: s.p.field, imageUrl: s.p.imageUrl, summary: s.p.summary,
        reason: s.matched.slice(0, 2).map(m => `${m.year}年「${m.title}」`).join('、') || '同じ感情を経験している人です',
        score: s.score
      }))};
    }

    renderAIResult(result, reply, text);
  });
}

function renderAIResult(container, reply, originalText) {
  if (!reply.picks || reply.picks.length === 0) {
    container.innerHTML = `
      <div class="ai-result-empty">
        該当する偉人が見つかりませんでした。カテゴリを変えて再試行してみてください。
      </div>
    `;
    return;
  }
  const tagNames = (reply.tags || []).map(t => {
    const T = (typeof DATA !== 'undefined') ? DATA.tagMap[t] : null;
    return T ? T.name : t;
  });
  container.innerHTML = `
    <div class="ai-result-intro">
      あなたの言葉から感じ取った感情：
      <div class="ai-result-tags">${tagNames.map(n => `<span class="ai-result-tag">${n}</span>`).join('')}</div>
    </div>
    <div class="ai-result-message">
      この感情を抱えたことのある偉人を紹介します。
    </div>
    <div class="ai-result-list">
      ${reply.picks.map(p => `
        <div class="ai-result-card" data-id="${p.id}">
          <div class="ai-result-avatar" ${p.imageUrl ? `style="background-image:url('${p.imageUrl}')"` : ''}>${p.imageUrl ? '' : (p.name || '').charAt(0)}</div>
          <div class="ai-result-body">
            <div class="ai-result-name">${p.name}</div>
            <div class="ai-result-field">${p.field}</div>
            <div class="ai-result-reason">${p.reason}</div>
            <button class="ai-result-open" data-id="${p.id}">この人の話を聞く →</button>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="ai-result-footnote">
      ※この提案はあなたの言葉から感情の手がかりを抽出したものです。1日1回、また明日もお話ししましょう。
    </div>
  `;
  container.querySelectorAll('.ai-result-open').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('aiConsultModal');
      if (modal) { modal.classList.remove('open'); setTimeout(() => modal.remove(), 200); }
      if (typeof showPerson === 'function') showPerson(btn.dataset.id);
    });
  });
}

// グローバル公開
window.openAIConsultModal = openAIConsultModal;

// 初期化
function initAIConsult() {
  const btn = document.getElementById('aiConsultOpen');
  if (btn) btn.addEventListener('click', openAIConsultModal);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAIConsult);
} else {
  initAIConsult();
}
