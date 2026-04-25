/* =============================================================
   偉人と自分。 — Magic Layer (upgrade JS)
   既存 dist/app.min.js は一切触らず、ウィンドウ API を拾って増築する。
   採用:
     - Lenis smooth scroll
     - View Transitions API（偉人ページ遷移）
     - Web Audio 合成 SFX 強化（ろうそく・ペン・紙・扉）
     - Three.js 3D わたしの本ビューア
     - Scroll-driven 時代プログレスバー
     - 章見出し万年筆アニメ（IntersectionObserver）
     - 今日のあなたの一冊（決定的RNG）
     - 歴史パレード（誕生日偉人の流れ）
     - 名言長押しクロスフェード拡大＋任意読み上げ
   ============================================================= */
(function () {
  'use strict';

  const MAGIC = window.__magic = window.__magic || {};
  // 既存の app.min.js は DATA を window に公開していないので、
  // 自前で people-bundle.json を取得してキャッシュする
  MAGIC._peopleBundle = null;
  MAGIC._peopleBundlePromise = null;
  function loadPeopleBundle() {
    if (MAGIC._peopleBundle) return Promise.resolve(MAGIC._peopleBundle);
    if (MAGIC._peopleBundlePromise) return MAGIC._peopleBundlePromise;
    MAGIC._peopleBundlePromise = fetch('/data/people-bundle.json')
      .then(r => r.json())
      .then(j => {
        // { people: [...] } か [...] のどちらか
        const arr = Array.isArray(j) ? j : (j.people || []);
        MAGIC._peopleBundle = arr;
        return arr;
      })
      .catch(err => { console.warn('[magic] people-bundle fetch failed', err); return []; });
    return MAGIC._peopleBundlePromise;
  }
  // 便宜上 window.DATA が既に存在すれば優先
  const readyWhenDataOK = (cb) => {
    if (window.DATA && Array.isArray(window.DATA.people) && window.DATA.people.length > 0) { cb(); return; }
    loadPeopleBundle().then(arr => {
      if (arr.length) {
        window.DATA = window.DATA || {};
        if (!Array.isArray(window.DATA.people) || !window.DATA.people.length) window.DATA.people = arr;
      }
      cb();
    });
  };

  // ------------------------------------------------------------
  // 1) Lenis smooth scroll
  // ------------------------------------------------------------
  function setupLenis() {
    if (window.Lenis == null) return;
    if (MAGIC.lenis) return;
    try {
      const lenis = new window.Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
      });
      MAGIC.lenis = lenis;
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
      document.documentElement.classList.add('lenis-smooth');
      // モーダルなどでスクロールを分離したい要素は data-lenis-prevent を付ける
      document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t) return;
        // モーダル内のスクロール可能要素を自動で prevent 化
        const scrollables = document.querySelectorAll('.settings-drawer-panel, .howto-slides-panel, .quote-zoom-card, .routine-edit-modal, .social-list-body');
        scrollables.forEach(el => {
          if (!el.hasAttribute('data-lenis-prevent')) el.setAttribute('data-lenis-prevent', '');
        });
      }, { capture: true });
    } catch (e) { console.warn('[magic] Lenis init failed', e); }
  }

  // ------------------------------------------------------------
  // 2) Web Audio 合成 SFX 強化（既存 playPageFlipSound 等を豊かにする）
  // ------------------------------------------------------------
  function setupAudio() {
    if (MAGIC._audioDone) return;
    MAGIC._audioDone = true;

    const ensureCtx = () => {
      if (MAGIC.audioCtx) return MAGIC.audioCtx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      MAGIC.audioCtx = new AC();
      return MAGIC.audioCtx;
    };
    const isMuted = () => {
      if (typeof window.isMuted === 'function') return window.isMuted();
      return localStorage.getItem('ijin_muted') === '1';
    };

    // 紙擦れ: バンドパスノイズ
    MAGIC.playPaperSwoosh = function () {
      const ctx = ensureCtx(); if (!ctx || isMuted()) return;
      try {
        const dur = 0.18;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) {
          const t = i / ch.length;
          ch[i] = (Math.random() * 2 - 1) * Math.exp(-3 * t) * 0.35;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 900;
        bp.Q.value = 1.6;
        const g = ctx.createGain();
        g.gain.value = 0.18;
        src.connect(bp).connect(g).connect(ctx.destination);
        src.start();
      } catch {}
    };

    // ペン筆記: 短い矩形波のトン・トン
    MAGIC.playPenTap = function () {
      const ctx = ensureCtx(); if (!ctx || isMuted()) return;
      try {
        const now = ctx.currentTime;
        for (let i = 0; i < 2; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.value = 1800 + i * 120;
          g.gain.setValueAtTime(0.0, now + i * 0.1);
          g.gain.linearRampToValueAtTime(0.04, now + i * 0.1 + 0.003);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.08);
          o.connect(g).connect(ctx.destination);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.1);
        }
      } catch {}
    };

    // ろうそく揺らぎ（アンビエント・ループ、非常に控えめ）
    MAGIC.startCandleAmbient = function () {
      const ctx = ensureCtx(); if (!ctx) return;
      if (MAGIC._candle) return;
      try {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 60;
        const g = ctx.createGain();
        g.gain.value = 0.0; // ほぼ無音、LFOのみ
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.17;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.006;
        lfo.connect(lfoGain).connect(g.gain);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        lfo.start();
        MAGIC._candle = { osc, lfo };
      } catch {}
    };

    // 扉が開く: フィルタ付きロー周波数
    MAGIC.playDoorOpen = function () {
      const ctx = ensureCtx(); if (!ctx || isMuted()) return;
      try {
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(120, now);
        o.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        const bp = ctx.createBiquadFilter();
        bp.type = 'lowpass';
        bp.frequency.value = 400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.05, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        o.connect(bp).connect(g).connect(ctx.destination);
        o.start(now); o.stop(now + 0.6);
      } catch {}
    };

    // 既存 playPageFlipSound が mp3 優先で失敗時に合成へfallbackしている場合の上乗せ
    const originalFlip = window.playPageFlipSound;
    window.playPageFlipSound = function () {
      try { originalFlip && originalFlip.apply(this, arguments); } catch {}
      MAGIC.playPaperSwoosh();
    };

    // 初回インタラクションで AudioContext を resume
    const resume = () => {
      const c = ensureCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
      MAGIC.startCandleAmbient();
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('touchstart', resume);
    };
    window.addEventListener('pointerdown', resume, { once: true, passive: true });
    window.addEventListener('touchstart', resume, { once: true, passive: true });
  }

  // ------------------------------------------------------------
  // 3) View Transitions API — 偉人ページ遷移のフェード
  // ------------------------------------------------------------
  function setupViewTransitions() {
    if (!document.startViewTransition) return;
    const origShowPerson = window.showPerson;
    if (typeof origShowPerson !== 'function' || origShowPerson.__magicWrapped) return;
    window.showPerson = function (id) {
      try {
        return document.startViewTransition(() => origShowPerson.call(this, id));
      } catch {
        return origShowPerson.call(this, id);
      }
    };
    window.showPerson.__magicWrapped = true;
  }

  // ------------------------------------------------------------
  // 4) Scroll-driven 時代プログレスバー
  // ------------------------------------------------------------
  function setupEraProgress() {
    if (document.querySelector('.magic-era-progress')) return;
    const bar = document.createElement('div');
    bar.className = 'magic-era-progress';
    bar.innerHTML = `
      <div class="magic-era-progress-ink" id="magicEraInk"></div>
    `;
    document.body.appendChild(bar);

    // 時代マーカーを画面ぶち抜きで5本: 古代/中世/近世/近代/現代
    const marks = [
      { pos: 0.08, label: '古代' },
      { pos: 0.28, label: '中世' },
      { pos: 0.50, label: '近世' },
      { pos: 0.72, label: '近代' },
      { pos: 0.92, label: '現代' },
    ];
    marks.forEach(m => {
      const mk = document.createElement('div');
      mk.className = 'magic-era-progress-mark';
      mk.style.top = `${m.pos * 100}%`;
      bar.appendChild(mk);
      const lb = document.createElement('div');
      lb.className = 'magic-era-progress-label';
      lb.textContent = m.label;
      lb.style.top = `calc(${m.pos * 100}% - 6px)`;
      bar.appendChild(lb);
    });

    // スクロール進行で墨が伸びる
    const ink = document.getElementById('magicEraInk');
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (ink) ink.style.height = (ratio * 100).toFixed(1) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 他画面ではfade out（ホームだけ濃く）
    const syncVisibility = () => {
      const active = document.querySelector('.view.active')?.id;
      bar.style.opacity = (active === 'view-people' || active === 'view-history') ? '0.75' : '0.3';
    };
    setInterval(syncVisibility, 1500);
    syncVisibility();
  }

  // ------------------------------------------------------------
  // 5) 章見出し 万年筆アニメーション
  // ------------------------------------------------------------
  function setupPenChapters() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (ent.isIntersecting) {
          ent.target.classList.add('magic-pen-title', 'pen-drawing');
          if (MAGIC.playPenTap) MAGIC.playPenTap();
          io.unobserve(ent.target);
        }
      });
    }, { threshold: 0.3 });
    const scan = () => {
      document.querySelectorAll('.my-book-chapter-title, .home-block-label, .tl-era-name, .tl-genre-name, .hist-title, .timeline-title').forEach(el => {
        if (el.dataset.magicPen) return;
        el.dataset.magicPen = '1';
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------
  // 6) 今日のあなたの一冊（決定的RNG）
  // ------------------------------------------------------------
  function dailySeed() {
    let uid = '';
    try { uid = (window.currentUser && window.currentUser.uid) || localStorage.getItem('ijin_anon_uid') || ''; } catch {}
    if (!uid) {
      uid = 'anon-' + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem('ijin_anon_uid', uid); } catch {}
    }
    const today = new Date();
    const key = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}::${uid}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h;
  }
  function setupDailyPick() {
    readyWhenDataOK(() => {
      const insert = () => {
        if (document.getElementById('magicDailyPick')) return;
        const todayBlock = document.getElementById('todayBirthdayBlock');
        const afterTarget = todayBlock && todayBlock.style.display !== 'none' ? todayBlock : document.querySelector('#view-people .home-block');
        if (!afterTarget) { setTimeout(insert, 400); return; }
        const people = window.DATA.people || [];
        if (people.length === 0) { setTimeout(insert, 400); return; }
        const seed = dailySeed();
        const person = people[seed % people.length];
        const quotes = person.quotes || [];
        const quote = quotes.length ? quotes[(seed >>> 8) % quotes.length] : null;
        const avatar = person.imageUrl
          ? `<div class="magic-daily-avatar" style="background-image:url('${person.imageUrl}')"></div>`
          : `<div class="magic-daily-avatar no-img">${(person.name || '?').charAt(0)}</div>`;
        const div = document.createElement('div');
        div.className = 'home-block magic-daily-pick';
        div.id = 'magicDailyPick';
        div.innerHTML = `
          <div class="magic-daily-label">📖 今日のあなたの一冊</div>
          <button class="magic-daily-card" data-magic-daily-open="${person.id}">
            ${avatar}
            <div class="magic-daily-body">
              <div class="magic-daily-name">${person.name || ''}</div>
              <div class="magic-daily-meta">${(typeof fmtYearRange === 'function' ? fmtYearRange(person.birth, person.death) : ((person.birth || '') + '–' + (person.death || '')))} ／ ${person.field || ''}</div>
            </div>
          </button>
          ${quote ? `<div class="magic-daily-quote">${quote.text || quote}</div>` : ''}
        `;
        afterTarget.insertAdjacentElement('afterend', div);
        div.querySelector('[data-magic-daily-open]').addEventListener('click', () => {
          if (typeof window.showPerson === 'function') window.showPerson(person.id);
        });
      };
      insert();
    });
  }

  // ------------------------------------------------------------
  // 7) 歴史パレード（画面下の誕生日偉人流れ）
  // ------------------------------------------------------------
  function setupParade() {
    readyWhenDataOK(() => {
      if (document.getElementById('magicParade')) return;
      const now = new Date();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      const births = (window.DATA.people || []).filter(p => p.birthMonth === m && p.birthDay === d);
      const bar = document.createElement('aside');
      bar.className = 'magic-parade';
      bar.id = 'magicParade';
      if (births.length === 0) {
        bar.innerHTML = `
          <button class="magic-parade-close" aria-label="閉じる">×</button>
          <div class="magic-parade-empty">🕯 今日のパレードは、静かな日です。</div>
        `;
      } else {
        const items = births.concat(births).map(p => {
          const years = typeof fmtYearRange === 'function' ? fmtYearRange(p.birth, p.death) : `${p.birth || ''}`;
          return `<button class="magic-parade-item" data-magic-parade-open="${p.id}">
            <span class="magic-parade-ic">🎂</span>
            <span class="magic-parade-name">${p.name || ''}</span>
            <span class="magic-parade-years">${years}</span>
          </button>`;
        }).join('');
        bar.innerHTML = `
          <button class="magic-parade-close" aria-label="閉じる">×</button>
          <div class="magic-parade-inner">${items}</div>
        `;
      }
      document.body.appendChild(bar);
      // 少し遅れて出現
      setTimeout(() => bar.classList.add('visible'), 1600);
      // 閉じる（セッション内のみ）
      bar.querySelector('.magic-parade-close').addEventListener('click', () => {
        bar.classList.remove('visible');
        try { sessionStorage.setItem('magic_parade_closed', '1'); } catch {}
      });
      if (sessionStorage.getItem('magic_parade_closed') === '1') bar.classList.remove('visible');
      // クリックで偉人へ
      bar.querySelectorAll('[data-magic-parade-open]').forEach(b => {
        b.addEventListener('click', () => {
          if (typeof window.showPerson === 'function') window.showPerson(b.dataset.magicParadeOpen);
        });
      });
    });
  }

  // ------------------------------------------------------------
  // 8) 名言長押しクロスフェード拡大＋任意読み上げ
  // ------------------------------------------------------------
  function setupQuoteZoom() {
    if (MAGIC._quoteZoomDone) return;
    MAGIC._quoteZoomDone = true;
    const openZoom = (text, source) => {
      let z = document.getElementById('quoteZoom');
      if (!z) {
        z = document.createElement('div');
        z.id = 'quoteZoom';
        z.className = 'quote-zoom';
        z.innerHTML = `
          <div class="quote-zoom-card">
            <button class="quote-zoom-close" aria-label="閉じる">×</button>
            <div class="quote-zoom-ornament">◆ ─── ◆ ─── ◆</div>
            <div class="quote-zoom-text" id="qzText"></div>
            <div class="quote-zoom-source" id="qzSource"></div>
            <button class="quote-zoom-read" id="qzRead">🔉 声に出して読む</button>
          </div>
        `;
        document.body.appendChild(z);
        z.addEventListener('click', (e) => { if (e.target === z) close(); });
        z.querySelector('.quote-zoom-close').addEventListener('click', close);
        z.querySelector('#qzRead').addEventListener('click', () => {
          const t = z.querySelector('#qzText')?.textContent;
          if (!t || !('speechSynthesis' in window)) return;
          try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(t);
            u.lang = 'ja-JP';
            u.rate = 0.85;
            u.pitch = 0.9;
            u.volume = 0.8;
            window.speechSynthesis.speak(u);
          } catch {}
        });
      }
      z.querySelector('#qzText').textContent = text || '';
      z.querySelector('#qzSource').textContent = source || '';
      z.querySelector('#qzSource').style.display = source ? '' : 'none';
      z.classList.add('open');
    };
    const close = () => {
      const z = document.getElementById('quoteZoom');
      if (z) z.classList.remove('open');
      if ('speechSynthesis' in window) { try { window.speechSynthesis.cancel(); } catch {} }
    };
    // 長押し(500ms)または右クリックで開く。既存の☆タップは邪魔しない
    let pressTimer = null;
    document.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('blockquote.quote, .quote-card, .x-post-card');
      if (!el || e.target.closest('.fav-btn, button, a')) return;
      pressTimer = setTimeout(() => {
        const text = (el.querySelector('.quote-text')?.textContent || el.textContent || '').trim().split(/\n/)[0].slice(0, 280);
        const source = el.querySelector('.quote-source, .x-post-src')?.textContent?.trim() || '';
        openZoom(text, source);
      }, 520);
    }, { passive: true });
    const cancel = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
    document.addEventListener('pointerup', cancel, { passive: true });
    document.addEventListener('pointercancel', cancel, { passive: true });
    document.addEventListener('pointermove', cancel, { passive: true });
    MAGIC.openQuoteZoom = openZoom;
  }

  // ------------------------------------------------------------
  // 9) Three.js 3D わたしの本ビューア
  // ------------------------------------------------------------
  function setupBook3D() {
    if (MAGIC._book3dDone) return;
    MAGIC._book3dDone = true;

    // わたしの本タイトルページに「3Dで開く」ボタンを差し込み
    const injectButton = () => {
      const pageMeta = document.querySelector('.title-page-meta, .title-page-social');
      if (!pageMeta) return false;
      if (document.getElementById('magicBook3dBtn')) return true;
      const btn = document.createElement('button');
      btn.id = 'magicBook3dBtn';
      btn.className = 'magic-book3d-btn';
      btn.innerHTML = `<span class="magic-book3d-icon">📖</span> 3Dでわたしの本を回す`;
      btn.addEventListener('click', openBook3D);
      pageMeta.parentNode.insertBefore(btn, pageMeta.nextSibling);
      return true;
    };
    injectButton();
    const mo = new MutationObserver(() => injectButton());
    mo.observe(document.body, { childList: true, subtree: true });

    // TOP（ホーム）のヒーロー枠として 3D 本を大きく配置
    // 背景はタイムスリップ演出、ラビン／スタッツ／ショートカット／歴史の奥行きを一枚に統合
    function injectTopBook() {
      const home = document.querySelector('#view-people');
      if (!home) return false;
      if (document.getElementById('magicTopBook')) return true;
      const wrap = document.createElement('div');
      wrap.id = 'magicTopBook';
      wrap.className = 'magic-topbook';
      wrap.innerHTML = `
        <canvas class="magic-topbook-warp" id="magicTopWarp" aria-hidden="true"></canvas>
        <div class="magic-topbook-bg" aria-hidden="true"></div>
        <div class="magic-topbook-inner">
          <div class="magic-topbook-eyebrow">THE BOOK OF YOU</div>
          <div class="magic-topbook-stage" id="magicTopBookStage"></div>
          <div class="magic-topbook-hint">ドラッグで、あなたの本を回してください</div>
          <div class="magic-topbook-rabin" id="magicTopRabin"></div>
          <div class="magic-topbook-stats" id="magicTopStats"></div>
          <div class="magic-topbook-actions">
            <button class="magic-topbook-action" data-top-action="tags">
              <span class="magic-topbook-action-label">偉人を探す</span>
            </button>
            <button class="magic-topbook-action" data-top-action="history">
              <span class="magic-topbook-action-label">年表から探す</span>
            </button>
          </div>
          <div class="magic-topbook-deep">
            <div class="magic-topbook-deep-title">世界を歩く</div>
            <div class="magic-topbook-cats">
              <button class="magic-topbook-cat magic-topbook-cat-cosmos" data-cat="cosmos">
                <div class="mtc-emoji">🌌</div>
                <div class="mtc-name">宇 宙</div>
                <div class="mtc-sub">宇宙の誕生</div>
              </button>
              <button class="magic-topbook-cat magic-topbook-cat-myth" data-cat="myth">
                <div class="mtc-emoji">⛩</div>
                <div class="mtc-name">神 話</div>
                <div class="mtc-sub">神殿・はじまりの書</div>
              </button>
              <button class="magic-topbook-cat magic-topbook-cat-museum" data-cat="museum">
                <div class="mtc-emoji">🏛</div>
                <div class="mtc-name">美 術 館</div>
                <div class="mtc-sub">名画を歩いて鑑賞</div>
              </button>
              <button class="magic-topbook-cat magic-topbook-cat-ijin" data-cat="ijin">
                <div class="mtc-emoji">👤</div>
                <div class="mtc-name">偉 人</div>
                <div class="mtc-sub">クイズ・年表・関係図</div>
              </button>
            </div>
          </div>
        </div>
      `;
      // view-people の最上段（ヒーロー枠より前）に差し込む
      home.insertBefore(wrap, home.firstChild);

      // スタッツを更新
      renderTopStats(wrap.querySelector('#magicTopStats'));

      // ショートカットボタン
      wrap.querySelectorAll('[data-top-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.topAction;
          const tabBtn = document.querySelector(`[data-view="${act}"]`);
          if (tabBtn) { tabBtn.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        });
      });

      // 歴史の奥行きピル（既存の openXxx にそのまま繋ぐ）
      const deepMap = {
        cosmos:  () => { try { openCosmos(); } catch (e) { console.warn('cosmos', e); } },
        graph:   () => { try { if (typeof openRelationGraph === 'function') openRelationGraph(); } catch {} },
        simul:   () => { try { if (typeof openSimultaneity === 'function') openSimultaneity(); } catch {} },
        map:     () => { try { if (typeof openWorldMap === 'function') openWorldMap(); } catch {} },
        century: () => { try { if (typeof openSimultaneity === 'function') openSimultaneity({ centuryMode: true }); } catch {} },
        city:    () => { try { if (typeof openCityGathering === 'function') openCityGathering(); } catch {} },
        drift:   () => { try { if (typeof openDriftCalendar === 'function') openDriftCalendar(); } catch {} },
        quiz:     () => { try { openIjinQuiz(); } catch (e) { console.warn('quiz', e); } },
        timeline: () => { try { openTimelineMode(); } catch (e) { console.warn('timeline', e); } },
        glossary: () => { try { openGlossary(); } catch (e) { console.warn('glossary', e); } },
        mythology: () => { try { openMythology(); } catch (e) { console.warn('mythology', e); } },
        museum:   () => { try { openMuseumHub(); } catch (e) { console.warn('museum', e); } },
        pantheon: () => { try { openPantheon3D(); } catch (e) { console.warn('pantheon', e); } },
      };
      wrap.querySelectorAll('[data-deep]').forEach(btn => {
        btn.addEventListener('click', () => {
          const fn = deepMap[btn.dataset.deep];
          if (fn) fn();
        });
      });

      // カテゴリ選択 → ポップアップで選択
      const CATEGORY_SUB = {
        cosmos: { title: '🌌 宇宙', sub: '万物の誕生を観る', items: [
          { deep: 'cosmos', label: '宇宙の誕生に入る', desc: '惑星・星雲・ブラックホールを巡る', emoji: '🌌' },
        ]},
        myth: { title: '⛩ 神 話', sub: '神々と物語', items: [
          { deep: 'pantheon', label: '神殿', desc: '空に浮かぶ神殿で神々と物語に触れる', emoji: '⛩' },
          { deep: 'mythology', label: 'Genesis — はじまりの書', desc: '6つの神話を章ごとに読む', emoji: '✦' },
        ]},
        museum: { title: '🏛 美 術 館', sub: '名画を歩いて鑑賞', items: [
          { deep: 'museum', label: '美術館へ入る', desc: '神話エリア・戦国エリアから選ぶ', emoji: '🏛' },
        ]},
        ijin: { title: '👤 偉 人', sub: '297人の生涯と関係', items: [
          { deep: 'quiz', label: '偉人クイズ', desc: '5タイプの問題でテスト', emoji: '🎓' },
          { deep: 'timeline', label: '年表モード', desc: '世紀ごとに偉人を縦に並べる', emoji: '📅' },
          { deep: 'glossary', label: '用語集', desc: '思想・流派の用語を検索', emoji: '📖' },
          { deep: 'graph', label: '関係グラフ', desc: '師弟・盟友・論敵のネットワーク', emoji: '🔗' },
          { deep: 'simul', label: '同時代', desc: 'ある偉人と同時代の全員を表示', emoji: '🕰' },
          { deep: 'map', label: '世界マップ', desc: '地球儀で偉人の出身地を見る', emoji: '🌍' },
          { deep: 'century', label: '世紀ごと', desc: '紀元前から現代までの一覧', emoji: '📜' },
          { deep: 'city', label: '都市群像', desc: '都市ごとの偉人クラスタ', emoji: '🏙' },
          { deep: 'drift', label: '365日カレンダー', desc: '誕生日・命日を円環にプロット', emoji: '🗓' },
        ]},
      };
      function showCategoryPopup(catKey) {
        const cat = CATEGORY_SUB[catKey];
        if (!cat) return;
        const m = document.createElement('div');
        m.className = 'magic-cat-popup';
        m.innerHTML = `
          <div class="mcp-card">
            <button class="mcp-close">×</button>
            <div class="mcp-title">${cat.title}</div>
            <div class="mcp-sub">${cat.sub}</div>
            <div class="mcp-grid">
              ${cat.items.map(it => `
                <button class="mcp-item" data-deep="${it.deep}">
                  <span class="mcp-emoji">${it.emoji}</span>
                  <span class="mcp-body">
                    <span class="mcp-label">${it.label}</span>
                    <span class="mcp-desc">${it.desc}</span>
                  </span>
                  <span class="mcp-arrow">›</span>
                </button>
              `).join('')}
            </div>
          </div>
        `;
        document.body.appendChild(m);
        requestAnimationFrame(() => m.classList.add('show'));
        const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 280); };
        m.querySelector('.mcp-close').addEventListener('click', close);
        m.addEventListener('click', e => { if (e.target === m) close(); });
        m.querySelectorAll('[data-deep]').forEach(b => {
          b.addEventListener('click', () => {
            const fn = deepMap[b.dataset.deep];
            close();
            if (fn) setTimeout(fn, 280);
          });
        });
      }
      wrap.querySelectorAll('.magic-topbook-cat').forEach(catBtn => {
        catBtn.addEventListener('click', () => showCategoryPopup(catBtn.dataset.cat));
      });

      // Three.js ミニシーン起動
      initTopBookScene(wrap.querySelector('#magicTopBookStage'));
      // タイムスリップ背景アニメーション起動
      initTimeWarp(wrap.querySelector('#magicTopWarp'));

      // ラビン（.home-rabin-greet）をヒーロー内に取り込む処理は停止
      // （ユーザー指示: レキットが変な場所に出る）
      return true;
    }

    // ---- タイムスリップ × 宇宙 × テック の複合背景 ----
    // 星景 + 星雲 + 内向き渦 + デジタルグリッド + 走査線 + 英字主体のタイムスタンプ
    function initTimeWarp(canvas) {
      if (!canvas || !canvas.getContext) return;
      const ctx = canvas.getContext('2d');
      let W = 0, H = 0, cx = 0, cy = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const resize = () => {
        const r = canvas.getBoundingClientRect();
        W = Math.max(200, Math.floor(r.width));
        H = Math.max(200, Math.floor(r.height));
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cx = W / 2;
        cy = H / 2;
        // サイズ変更時は星を作り直し
        buildStars();
      };

      // --- 星景（宇宙感：金＋セピアの暖色で統一、静的＋ゆるく明滅）---
      let stars = [];
      function buildStars() {
        const count = Math.max(50, Math.floor(W * H / 5200));
        stars = Array.from({ length: count }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() < 0.85 ? 0.4 + Math.random() * 0.9 : 0.9 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          speed: 0.0008 + Math.random() * 0.0022,
          // 金（38-48）が主、一部アイボリー（30）と薄いベージュ（18）
          hue: Math.random() < 0.65 ? 38 + Math.random() * 14
                : Math.random() < 0.85 ? 28 + Math.random() * 10
                :                         14 + Math.random() * 10,
        }));
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas.parentElement || canvas);

      // --- 星雲（暖色のみ：深紅・焦茶・琥珀）---
      const nebulae = [
        { x: 0.18, y: 0.22, r: 260, hue:   8, alpha: 0.14, vx:  0.03, vy:  0.02 }, // 深いワイン
        { x: 0.82, y: 0.72, r: 300, hue:  24, alpha: 0.11, vx: -0.03, vy: -0.02 }, // 焦茶
        { x: 0.55, y: 0.15, r: 220, hue:  38, alpha: 0.12, vx:  0.02, vy:  0.015 }, // 琥珀
      ];

      // --- 渦粒子（金＋セピア＋アイボリーの暖色のみ、内向き）---
      const COUNT = 100;
      const particles = Array.from({ length: COUNT }, () => spawn(true));
      function spawn(initial) {
        const a = Math.random() * Math.PI * 2;
        const maxR = Math.hypot(W, H) * 0.55;
        const r = initial ? Math.random() * maxR : maxR + Math.random() * 80;
        const kind = Math.random();
        return {
          a, r,
          drift: 0.3 + Math.random() * 0.8,
          swirl: 0.0015 + Math.random() * 0.004,
          size: 0.45 + Math.random() * 1.0,
          // 全部暖色：金／琥珀／淡いアイボリー
          hue: kind < 0.55 ? 38 + Math.random() * 12     // 金
             : kind < 0.85 ? 24 + Math.random() * 14     // 琥珀
             :               30 + Math.random() *  6,    // アイボリー寄り
          sat: kind < 0.85 ? 60 + Math.random() * 15 : 30,
          lig: kind < 0.85 ? 65 + Math.random() * 10 : 85,
          alpha: 0.25 + Math.random() * 0.5,
        };
      }

      // --- 紙片 ---
      const papers = Array.from({ length: 4 }, () => spawnPaper(true));
      function spawnPaper(initial) {
        return {
          x: initial ? Math.random() * W : W + 40 + Math.random() * 60,
          y: Math.random() * H,
          w: 60 + Math.random() * 120,
          h: 0.5 + Math.random() * 1.2,
          vx: -0.08 - Math.random() * 0.14,
          vy: (Math.random() - 0.5) * 0.04,
          rot: (Math.random() - 0.5) * 0.28,
          alpha: 0.06 + Math.random() * 0.1,
          lines: 3 + Math.floor(Math.random() * 4),
        };
      }

      // --- 英字メインの時代スタンプ ---
      // [text, vertical?, sizeClass(0=小,1=中,2=大)]
      const WORDS = [
        // 英字の時代（大）
        ['RENAISSANCE', false, 2], ['ENLIGHTENMENT', false, 2], ['BELLE ÉPOQUE', false, 2],
        ['INDUSTRIAL', false, 2], ['VICTORIAN', false, 2], ['MODERN', false, 2],
        ['ROMANTIC', false, 1], ['BAROQUE', false, 1], ['ROCOCO', false, 1],
        ['GOTHIC', false, 1], ['CLASSICAL', false, 1], ['MEDIEVAL', false, 1],
        ['BYZANTINE', false, 1], ['NAPOLEONIC', false, 1], ['EDWARDIAN', false, 1],
        ['ANTIQUITY', false, 1], ['POSTMODERN', false, 1],
        // 英字の短い時代
        ['EDO', false, 2], ['MEIJI', false, 2], ['HEIAN', false, 1], ['NARA', false, 1],
        ['SHOWA', false, 1], ['TAISHO', false, 1],
        // 年号（多めに）
        ['1066', false, 1], ['1215', false, 0], ['1347', false, 0], ['1453', false, 1],
        ['1492', false, 1], ['1517', false, 0], ['1543', false, 0], ['1588', false, 0],
        ['1603', false, 1], ['1642', false, 0], ['1688', false, 0], ['1776', false, 1],
        ['1789', false, 1], ['1804', false, 0], ['1815', false, 0], ['1848', false, 0],
        ['1861', false, 0], ['1867', false, 0], ['1871', false, 0], ['1905', false, 0],
        ['1912', false, 0], ['1917', false, 0], ['1945', false, 1],
        ['BC 500', false, 0], ['BC 200', false, 0], ['AD 117', false, 0], ['AD 476', false, 0],
        ['AD 800', false, 0], ['AD 1066', false, 0],
        // ラテン／格言（中）
        ['TEMPUS FUGIT', false, 1], ['MEMENTO MORI', false, 1], ['AB ORIGINE', false, 1],
        ['IN AETERNUM', false, 1], ['POST BELLUM', false, 0], ['ANTE BELLUM', false, 0],
        // テック／データ風（中）
        ['TIMESTAMP', false, 1], ['EPOCH', false, 1], ['HISTORY.LOG', false, 0],
        ['ARCHIVE', false, 0], ['INDEX.DAT', false, 0],
        // 和（アクセントに少量だけ）
        ['明治', true, 1], ['昭和', true, 1], ['江戸', true, 1], ['此の世', true, 0],
      ];
      const floats = [];
      function spawnWord() {
        if (floats.length > 7) return;
        const [txt, vertical, cls] = WORDS[Math.floor(Math.random() * WORDS.length)];
        const size = cls === 2 ? (34 + Math.random() * 32)
                   : cls === 1 ? (18 + Math.random() * 14)
                              :   (11 + Math.random() * 7);
        let x, y;
        if (cls === 2) {
          x = Math.random() < 0.5 ? W * (0.04 + Math.random() * 0.14) : W * (0.82 + Math.random() * 0.14);
          y = H * (0.12 + Math.random() * 0.76);
        } else {
          x = W * (0.06 + Math.random() * 0.88);
          y = H * (0.1 + Math.random() * 0.8);
        }
        floats.push({
          txt, vertical, size, x, y,
          life: 0,
          max: cls === 2 ? 4800 + Math.random() * 2200
                         : 2800 + Math.random() * 1800,
          rot: vertical ? 0 : (Math.random() - 0.5) * 0.14,
          peak: cls === 2 ? 0.55 : cls === 1 ? 0.4 : 0.26,
          drift: { x: (Math.random() - 0.5) * 0.08, y: 0.04 + Math.random() * 0.06 },
          // 色モード：大／中は金、小はアイボリー（暖色のみで統一）
          mode: cls === 0 ? 'pale' : 'gold',
        });
      }

      // ---- ループ ----
      let raf = 0;
      let lastWord = performance.now();
      let lastT = performance.now();
      let globalSwirl = 0;

      function tick() {
        const now = performance.now();
        const dt = Math.min(64, now - lastT);
        lastT = now;
        globalSwirl += 0.0006 * dt;

        // 濃い残像（ベースはワイン寄りの暗部 / 宇宙の深みを金寄りに）
        ctx.fillStyle = 'rgba(10, 4, 8, 0.16)';
        ctx.fillRect(0, 0, W, H);

        // --- 星雲（radial gradient drift）---
        for (const n of nebulae) {
          n.x += n.vx * (dt / 1000);
          n.y += n.vy * (dt / 1000);
          if (n.x < -0.2) n.x = 1.2; if (n.x > 1.2) n.x = -0.2;
          if (n.y < -0.2) n.y = 1.2; if (n.y > 1.2) n.y = -0.2;
          const nx = n.x * W, ny = n.y * H;
          const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
          g.addColorStop(0, `hsla(${n.hue}, 70%, 55%, ${n.alpha})`);
          g.addColorStop(0.5, `hsla(${n.hue}, 65%, 45%, ${n.alpha * 0.35})`);
          g.addColorStop(1, `hsla(${n.hue}, 60%, 30%, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(nx - n.r, ny - n.r, n.r * 2, n.r * 2);
        }

        // --- 星景（静的点＋明滅）---
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.phase += s.speed * dt;
          const twinkle = 0.55 + Math.sin(s.phase) * 0.35;
          ctx.fillStyle = `hsla(${s.hue}, 50%, 80%, ${twinkle * 0.85})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- 紙片 ---
        for (let i = 0; i < papers.length; i++) {
          const p = papers[i];
          p.x += p.vx * (dt / 16);
          p.y += p.vy * (dt / 16);
          if (p.x < -180) { papers[i] = spawnPaper(false); continue; }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.strokeStyle = `rgba(220, 190, 140, ${p.alpha})`;
          ctx.lineWidth = p.h;
          for (let k = 0; k < p.lines; k++) {
            const ly = k * 7 - (p.lines - 1) * 3.5;
            const lw = p.w * (0.6 + Math.random() * 0.4);
            ctx.beginPath();
            ctx.moveTo(-p.w / 2, ly);
            ctx.lineTo(-p.w / 2 + lw, ly);
            ctx.stroke();
          }
          ctx.restore();
        }

        // --- 渦粒子：中心へ吸い寄せ＋時計回り（テック・宇宙混色）---
        ctx.lineCap = 'round';
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.a += p.swirl * dt;
          p.r -= p.drift * (dt / 16);
          if (p.r <= 2) { particles[i] = spawn(false); continue; }
          const x = cx + Math.cos(p.a + globalSwirl) * p.r;
          const y = cy + Math.sin(p.a + globalSwirl) * p.r;
          if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
          const prevR = p.r + p.drift * 14;
          const prevX = cx + Math.cos(p.a + globalSwirl - p.swirl * 14) * prevR;
          const prevY = cy + Math.sin(p.a + globalSwirl - p.swirl * 14) * prevR;
          const grad = ctx.createLinearGradient(prevX, prevY, x, y);
          grad.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, ${p.lig}%, 0)`);
          grad.addColorStop(1, `hsla(${p.hue}, ${p.sat}%, ${p.lig}%, ${p.alpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        // --- 時代スタンプ文字（英字主体・層のある質感）---
        if (now - lastWord > 560) { spawnWord(); lastWord = now; }
        for (let i = floats.length - 1; i >= 0; i--) {
          const e = floats[i];
          e.life += dt;
          const t = e.life / e.max;
          if (t >= 1) { floats.splice(i, 1); continue; }
          e.x += e.drift.x * (dt / 16);
          e.y += e.drift.y * (dt / 16);
          const curve = Math.sin(t * Math.PI);
          const alpha = curve * e.peak;

          // カラーパレット（暖色のみで世界観を統一）
          let col1, col2, col3, haloColor, shadowColor;
          if (e.mode === 'pale') {
            col1 = `rgba(240, 230, 210, ${alpha})`;
            col2 = `rgba(210, 200, 180, ${alpha})`;
            col3 = `rgba(170, 160, 140, ${alpha * 0.85})`;
            haloColor = `rgba(220, 210, 190, ${alpha * 0.4})`;
            shadowColor = `rgba(8, 4, 6, ${alpha * 0.5})`;
          } else {
            col1 = `rgba(248, 220, 160, ${alpha})`;
            col2 = `rgba(220, 180, 110, ${alpha})`;
            col3 = `rgba(170, 130, 80, ${alpha * 0.85})`;
            haloColor = `rgba(255, 210, 130, ${alpha * 0.55})`;
            shadowColor = `rgba(8, 3, 5, ${alpha * 0.6})`;
          }

          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.rotate(e.rot);
          // 英字はモノスペース寄りセリフ＋和は明朝
          const font = e.vertical
            ? `600 ${e.size}px "Shippori Mincho", serif`
            : `700 ${e.size}px "Cormorant Garamond", "Shippori Mincho", serif`;
          ctx.font = font;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // 影（深さ）
          ctx.fillStyle = shadowColor;
          if (e.vertical) {
            const chars = Array.from(e.txt);
            const step = e.size * 1.02;
            const total = (chars.length - 1) * step;
            chars.forEach((ch, k) => ctx.fillText(ch, 2, -total / 2 + k * step + 2));
          } else {
            ctx.fillText(e.txt, 2, 2);
          }
          // ハロー
          ctx.shadowColor = haloColor;
          ctx.shadowBlur = e.size * 0.45;
          // 本体（3色縦グラデ）
          const grad = ctx.createLinearGradient(0, -e.size, 0, e.size);
          grad.addColorStop(0, col1);
          grad.addColorStop(0.5, col2);
          grad.addColorStop(1, col3);
          ctx.fillStyle = grad;
          if (e.vertical) {
            const chars = Array.from(e.txt);
            const step = e.size * 1.02;
            const total = (chars.length - 1) * step;
            chars.forEach((ch, k) => ctx.fillText(ch, 0, -total / 2 + k * step));
          } else {
            ctx.fillText(e.txt, 0, 0);
          }
          ctx.restore();
        }

        raf = requestAnimationFrame(tick);
      }
      tick();

      MAGIC._topWarp = { dispose() { cancelAnimationFrame(raf); ro.disconnect(); } };
    }
    // 統計を3秒おきに再集計（人数は不変だが、スタンプ等の数値は本人のアクションで変わる）
    async function renderTopStats(container) {
      if (!container) return;
      const paint = (ppl, quotes, events) => {
        container.innerHTML = `
          <div class="mt-stat">
            <div class="mt-stat-num">${ppl.toLocaleString()}</div>
            <div class="mt-stat-label">偉人</div>
          </div>
          <div class="mt-stat-sep" aria-hidden="true"></div>
          <div class="mt-stat">
            <div class="mt-stat-num">${quotes.toLocaleString()}</div>
            <div class="mt-stat-label">名言</div>
          </div>
          <div class="mt-stat-sep" aria-hidden="true"></div>
          <div class="mt-stat">
            <div class="mt-stat-num">${events.toLocaleString()}</div>
            <div class="mt-stat-label">軌跡</div>
          </div>`;
      };
      // 既存の window.DATA を優先、なければ bundle を fetch
      try {
        const DATA = window.DATA;
        if (DATA && Array.isArray(DATA.people)) {
          const ppl = DATA.people.length;
          const quotes = DATA.people.reduce((s, p) => s + (p.quotes || []).length, 0);
          const events = DATA.people.reduce((s, p) => s + (p.events || []).length, 0);
          paint(ppl, quotes, events);
          return;
        }
      } catch {}
      // フォールバック：bundle
      try {
        const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
        if (!Array.isArray(people)) return;
        const ppl = people.length;
        const quotes = people.reduce((s, p) => s + (p.quotes || []).length, 0);
        const events = people.reduce((s, p) => s + (p.events || []).length, 0);
        paint(ppl, quotes, events);
      } catch (e) {
        container.textContent = '';
      }
    }
    // view-people が後から生成されるケースに備えて MO で監視
    if (!injectTopBook()) {
      const mo2 = new MutationObserver(() => { if (injectTopBook()) mo2.disconnect(); });
      mo2.observe(document.body, { childList: true, subtree: true });
    }

    function initTopBookScene(stage) {
      if (!stage || !window.THREE) return;
      const THREE = window.THREE;
      const getSize = () => ({
        w: Math.max(240, stage.clientWidth || 320),
        h: Math.max(260, stage.clientHeight || 340),
      });
      const { w, h } = getSize();
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.touchAction = 'none';
      renderer.domElement.style.cursor = 'grab';
      stage.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = null;
      // 本を大きく見せるためカメラを近めに（FOV は維持して歪みを抑える）
      const cam = new THREE.PerspectiveCamera(38, w / h, 0.1, 50);
      cam.position.set(0, 0, 6.4);

      scene.add(new THREE.AmbientLight(0xffe4b0, 0.55));
      const key = new THREE.PointLight(0xffcf8c, 1.35, 20);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xfff3d0, 0.38);
      rim.position.set(-3, 2, -3);
      scene.add(rim);
      // 金の煌めき：キーライトの反対側から淡く
      const backLight = new THREE.DirectionalLight(0xd4b055, 0.25);
      backLight.position.set(0, 0, -5);
      scene.add(backLight);

      const box = new THREE.BoxGeometry(2.6, 3.6, 0.7);
      const coverTex = makeCoverTexture();
      const backTex  = makeBackTexture();
      const spineTex = makeSpineTexture();
      const pagesTex = makePagesTexture();
      // Face order: +x, -x, +y, -y, +z, -z  ( +z = front, -z = back )
      const materials = [
        new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.9, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.75, metalness: 0.05 }),
        new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.9, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.9, metalness: 0.0 }),
        new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.55, metalness: 0.05 }),
        new THREE.MeshStandardMaterial({ map: backTex,  roughness: 0.58, metalness: 0.05 }),
      ];
      const book = new THREE.Mesh(box, materials);
      // 初期：正面（+z=前表紙）がカメラを向くように。わずかに右下へ傾けて立体感
      book.rotation.set(-0.08, 0.15, 0);
      scene.add(book);

      // ---- インタラクション：ドラッグで回転＋慣性 ----
      let isDown = false, lastX = 0, lastY = 0, velX = 0, velY = 0;
      // ページ読み込み直後は「対話直後」扱いにして、すぐに auto-rotate が暴走しないようにする
      let lastInteraction = performance.now();
      const el = renderer.domElement;
      const onDown = (x, y, ev) => {
        isDown = true;
        lastX = x; lastY = y;
        velX = 0; velY = 0;
        lastInteraction = performance.now();
        el.style.cursor = 'grabbing';
        if (ev && ev.preventDefault) ev.preventDefault();
      };
      const onMove = (x, y) => {
        if (!isDown) return;
        const dx = (x - lastX) * 0.009;
        const dy = (y - lastY) * 0.009;
        book.rotation.y += dx;
        book.rotation.x += dy;
        velX = dx; velY = dy;
        lastX = x; lastY = y;
        lastInteraction = performance.now();
      };
      const onUp = () => {
        if (!isDown) return;
        isDown = false;
        el.style.cursor = 'grab';
        lastInteraction = performance.now();
      };
      el.addEventListener('pointerdown', e => { el.setPointerCapture && el.setPointerCapture(e.pointerId); onDown(e.clientX, e.clientY, e); });
      el.addEventListener('pointermove', e => onMove(e.clientX, e.clientY));
      el.addEventListener('pointerup',   e => onUp());
      el.addEventListener('pointercancel', e => onUp());
      el.addEventListener('pointerleave',  e => onUp());

      const clock = new THREE.Clock();
      let raf = 0;
      function loop() {
        const dt = clock.getDelta();
        const idleMs = performance.now() - lastInteraction;
        // 慣性
        if (!isDown) {
          book.rotation.y += velX * 0.92;
          book.rotation.x += velY * 0.92;
          velX *= 0.9; velY *= 0.9;
          if (Math.abs(velX) < 0.0006) velX = 0;
          if (Math.abs(velY) < 0.0006) velY = 0;
          // 4秒以上操作がない & 慣性もない時はゆるやかに自動回転（ユーザーが一度触るまでは遅め）
          if (velX === 0 && velY === 0 && idleMs > 4000) {
            book.rotation.y += dt * 0.15;
          }
        }
        // 呼吸（上下）
        book.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.08;
        renderer.render(scene, cam);
        raf = requestAnimationFrame(loop);
      }
      loop();

      // リサイズ対応
      const ro = new ResizeObserver(() => {
        const s = getSize();
        renderer.setSize(s.w, s.h);
        cam.aspect = s.w / s.h;
        cam.updateProjectionMatrix();
      });
      ro.observe(stage);

      // ユーザー名／称号／スタンプ数の変更をポーリングして表紙を再生成
      let lastName = getUserName();
      let lastTitle = getCurrentTitle();
      let lastStamps = getStampTotal();
      setInterval(() => {
        if (!document.getElementById('magicTopBook')) return;
        const n = getUserName(), t = getCurrentTitle(), s = getStampTotal();
        if (n !== lastName || t !== lastTitle || s !== lastStamps) {
          lastName = n; lastTitle = t; lastStamps = s;
          const nc = makeCoverTexture();
          const ns = makeSpineTexture();
          if (materials[4].map) materials[4].map.dispose();
          if (materials[1].map) materials[1].map.dispose();
          materials[4].map = nc; materials[4].needsUpdate = true;
          materials[1].map = ns; materials[1].needsUpdate = true;
        }
      }, 3000);

      MAGIC._topBookScene = { renderer, dispose() { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); } };
    }

    function openBook3D() {
      if (window.THREE == null) {
        alert('3Dライブラリの読み込みに失敗しました。オンラインで再度お試しください。');
        return;
      }
      let overlay = document.getElementById('bookViewerOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'bookViewerOverlay';
        overlay.innerHTML = `
          <button class="book-viewer-close" aria-label="閉じる">×</button>
          <div class="book-viewer-title">あなたの本</div>
          <div id="bookViewerCanvasWrap"></div>
          <div class="book-viewer-hint">ドラッグで回転・ダブルタップで開く</div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('.book-viewer-close').addEventListener('click', closeBook3D);
      }
      requestAnimationFrame(() => overlay.classList.add('open'));
      initThreeScene(overlay);
      if (MAGIC.playDoorOpen) MAGIC.playDoorOpen();
    }
    function closeBook3D() {
      const overlay = document.getElementById('bookViewerOverlay');
      if (!overlay) return;
      overlay.classList.remove('open');
      setTimeout(() => {
        if (MAGIC._book3dScene && MAGIC._book3dScene.dispose) MAGIC._book3dScene.dispose();
        MAGIC._book3dScene = null;
        const wrap = document.getElementById('bookViewerCanvasWrap');
        if (wrap) wrap.innerHTML = '';
      }, 400);
    }
    MAGIC.openBook3D = openBook3D;
    MAGIC.closeBook3D = closeBook3D;

    function getUserName() {
      try {
        if (typeof window.getUserName === 'function') return window.getUserName() || '';
        return localStorage.getItem('ijin_user_name') || '';
      } catch { return ''; }
    }
    function getCurrentTitle() {
      try {
        if (typeof window.currentTitle === 'function') return window.currentTitle() || '';
        return localStorage.getItem('ijin_current_title') || '';
      } catch { return ''; }
    }
    function getStampTotal() {
      try {
        if (typeof window.totalStamps === 'function') return window.totalStamps();
        return 0;
      } catch { return 0; }
    }

    // 共通：革と金枠の下地を描く
    function paintLeatherBase(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#5c1f2a');
      g.addColorStop(1, '#3a0f18');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 革の細かいテクスチャ
      for (let i = 0; i < 6000; i++) {
        ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.04})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      // 金の外枠（二重）
      ctx.strokeStyle = '#b8952e';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, w - 100, h - 100);
      ctx.lineWidth = 2;
      ctx.strokeRect(72, 72, w - 144, h - 144);
    }

    // 表紙（前面）：「偉人と自分。」ロゴ + 「わたしの本」
    function makeCoverTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1536;
      const ctx = c.getContext('2d');
      paintLeatherBase(ctx, c.width, c.height);

      // 上部の装飾◆
      ctx.fillStyle = '#d4b055';
      ctx.font = 'bold 40px "Shippori Mincho", serif';
      ctx.textAlign = 'center';
      ctx.fillText('◆', c.width / 2, 220);

      // ロゴ「偉人と自分。」— 画像を使用（title-logo.png）
      const logoImg = makeCoverTexture._logoImg || (makeCoverTexture._logoImg = new Image());
      if (!logoImg.src) {
        logoImg.src = 'assets/title-logo.png?v=2';
        logoImg.onload = () => {
          if (makeCoverTexture._lastTex) makeCoverTexture._lastTex.needsUpdate = true;
        };
      }
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        // ロゴを大きく中央配置（3D本のカバー中心やや上）
        const maxW = c.width * 0.78;
        const maxH = 360;
        const scale = Math.min(maxW / logoImg.naturalWidth, maxH / logoImg.naturalHeight);
        const dw = logoImg.naturalWidth * scale;
        const dh = logoImg.naturalHeight * scale;
        ctx.drawImage(logoImg, (c.width - dw) / 2, c.height / 2 - dh / 2 - 80, dw, dh);
      } else {
        // フォールバック: テキスト描画
        ctx.fillStyle = '#ead296';
        ctx.font = 'bold 118px "Shippori Mincho", serif';
        ctx.textAlign = 'center';
        ctx.fillText('偉人と', c.width / 2, c.height / 2 - 130);
        ctx.fillText('自分。', c.width / 2, c.height / 2 + 10);
      }

      // 区切り
      ctx.strokeStyle = 'rgba(212,176,85,0.55)';
      ctx.lineWidth = 1.4;
      const divY = c.height / 2 + 110;
      ctx.beginPath();
      ctx.moveTo(c.width * 0.3, divY);
      ctx.lineTo(c.width * 0.7, divY);
      ctx.stroke();
      ctx.fillStyle = '#d4b055';
      ctx.font = '28px "Shippori Mincho", serif';
      ctx.fillText('◇', c.width / 2, divY + 8);

      // サブタイトル「わたしの本」
      ctx.fillStyle = '#ead296';
      ctx.font = 'bold 72px "Shippori Mincho", serif';
      ctx.fillText('わたしの本', c.width / 2, c.height / 2 + 220);

      // ユーザー名（あれば控えめに下に）
      const name = getUserName();
      const title = getCurrentTitle();
      if (name) {
        ctx.fillStyle = 'rgba(234,210,150,0.88)';
        ctx.font = 'italic 40px "Shippori Mincho", serif';
        const nameLine = title ? `【${title}】${name}` : `${name}`;
        ctx.fillText(nameLine, c.width / 2, c.height / 2 + 300);
      }

      // 下部ラテン
      ctx.fillStyle = 'rgba(212,176,85,0.55)';
      ctx.font = 'italic 30px "Cormorant Garamond", serif';
      ctx.fillText('— My Own Book of Virtue —', c.width / 2, c.height - 280);

      // 獲得スタンプと日付（底部）
      ctx.fillStyle = 'rgba(212,176,85,0.72)';
      ctx.font = '26px "Shippori Mincho", serif';
      ctx.fillText(`獲得スタンプ ${getStampTotal()} 個`, c.width / 2, c.height - 220);
      const d = new Date();
      ctx.font = 'italic 24px "Cormorant Garamond", serif';
      ctx.fillText(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`, c.width / 2, c.height - 185);

      // 下部の装飾◆
      ctx.fillStyle = '#d4b055';
      ctx.font = 'bold 40px "Shippori Mincho", serif';
      ctx.fillText('◆', c.width / 2, c.height - 140);

      const tex = new window.THREE.CanvasTexture(c);
      tex.anisotropy = 8;
      makeCoverTexture._lastTex = tex; // ロゴ遅延ロード完了時にneedsUpdateするため
      return tex;
    }

    // 裏表紙：コンセプトのタグライン
    function makeBackTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1536;
      const ctx = c.getContext('2d');
      paintLeatherBase(ctx, c.width, c.height);

      // 上部装飾
      ctx.fillStyle = '#d4b055';
      ctx.font = 'bold 36px "Shippori Mincho", serif';
      ctx.textAlign = 'center';
      ctx.fillText('❋', c.width / 2, 220);

      // タグラインを3段で配置
      ctx.fillStyle = '#ead296';
      ctx.font = '500 54px "Shippori Mincho", serif';
      const tagline = [
        '人は、同じ感情の流れの',
        '中で生きている。',
        '',
        '迷った時、逃げたくなった時、',
        '立ち止まった時。',
        '',
        '偉人たちも、',
        '同じ場所を歩いた。',
      ];
      const startY = 430;
      const lineH = 90;
      tagline.forEach((line, i) => {
        if (line) ctx.fillText(line, c.width / 2, startY + i * lineH);
      });

      // 下部装飾
      ctx.fillStyle = '#d4b055';
      ctx.font = 'bold 36px "Shippori Mincho", serif';
      ctx.fillText('❋', c.width / 2, c.height - 160);

      const tex = new window.THREE.CanvasTexture(c);
      tex.anisotropy = 8;
      return tex;
    }
    function splitToLines(ctx, text, maxWidth) {
      const chars = Array.from(text);
      const lines = [];
      let cur = '';
      chars.forEach(ch => {
        const w = ctx.measureText(cur + ch).width;
        if (w > maxWidth && cur) { lines.push(cur); cur = ch; }
        else cur += ch;
      });
      if (cur) lines.push(cur);
      return lines;
    }
    function makeSpineTexture() {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 1536;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, c.width, 0);
      g.addColorStop(0, '#3a0f18');
      g.addColorStop(0.5, '#5c1f2a');
      g.addColorStop(1, '#3a0f18');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = '#b8952e';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 30, c.width - 40, c.height - 60);
      // 背文字（縦）
      ctx.fillStyle = '#d4b055';
      ctx.font = 'bold 48px "Shippori Mincho", serif';
      ctx.textAlign = 'center';
      const name = getUserName() || 'わたしの本';
      const title = 'Book of Virtue';
      const chars = Array.from(name.slice(0, 6));
      chars.forEach((ch, i) => ctx.fillText(ch, c.width / 2, 280 + i * 70));
      ctx.font = 'italic 22px "Cormorant Garamond", serif';
      ctx.fillStyle = 'rgba(212,176,85,0.65)';
      ctx.save();
      ctx.translate(c.width / 2, c.height - 180);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(title, 0, 0);
      ctx.restore();
      return new window.THREE.CanvasTexture(c);
    }
    function makePagesTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 128;
      const ctx = c.getContext('2d');
      // クリームの紙束
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(0, 0, c.width, c.height);
      // ページの縦線束
      for (let i = 0; i < 300; i++) {
        ctx.strokeStyle = `rgba(${180 + Math.random() * 40},${165 + Math.random() * 30},${120 + Math.random() * 30},0.6)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * c.width, 0);
        ctx.lineTo(Math.random() * c.width, c.height);
        ctx.stroke();
      }
      return new window.THREE.CanvasTexture(c);
    }

    function initThreeScene(overlay) {
      const THREE = window.THREE;
      const wrap = overlay.querySelector('#bookViewerCanvasWrap');
      wrap.innerHTML = '';
      const w = Math.min(window.innerWidth, 700);
      const h = Math.min(window.innerHeight, 900);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      wrap.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = null;
      const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
      camera.position.set(0, 0, 8);
      camera.lookAt(0, 0, 0);

      // 照明（ろうそく風）
      const ambient = new THREE.AmbientLight(0xffe4b0, 0.35);
      scene.add(ambient);
      const warmKey = new THREE.PointLight(0xffcf8c, 1.4, 20);
      warmKey.position.set(3, 4, 5);
      scene.add(warmKey);
      const rim = new THREE.DirectionalLight(0xfff3d0, 0.4);
      rim.position.set(-4, 2, -3);
      scene.add(rim);

      // 本のジオメトリ（3:4:0.7）
      const bookW = 2.6, bookH = 3.6, bookD = 0.7;
      const box = new THREE.BoxGeometry(bookW, bookH, bookD);

      const coverTex = makeCoverTexture();
      const backTex = makeSpineTexture(); // 裏表紙は簡略
      const spineTex = makeSpineTexture();
      const pagesTex = makePagesTexture();

      // マテリアル: 右=前表紙、左=背表紙、上下=ページ小口、前=ページ側、後=裏表紙
      // BoxGeometry の face order: +x, -x, +y, -y, +z, -z
      const materials = [
        new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.9, metalness: 0.0 }),  // +x 前小口
        new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.75, metalness: 0.05 }), // -x 背表紙
        new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.9, metalness: 0.0 }),  // +y 上小口
        new THREE.MeshStandardMaterial({ map: pagesTex, roughness: 0.9, metalness: 0.0 }),  // -y 下小口
        new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.55, metalness: 0.05 }), // +z 表紙
        new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.65, metalness: 0.05 }), // -z 裏表紙
      ];
      const book = new THREE.Mesh(box, materials);
      book.rotation.set(-0.05, 0.45, 0);
      scene.add(book);

      // 静かな呼吸
      const clock = new THREE.Clock();

      // インタラクション（ドラッグ回転・慣性）
      let isDown = false, lastX = 0, lastY = 0, velX = 0, velY = 0;
      const onDown = (x, y) => { isDown = true; lastX = x; lastY = y; velX = 0; velY = 0; };
      const onMove = (x, y) => {
        if (!isDown) return;
        const dx = (x - lastX) * 0.008;
        const dy = (y - lastY) * 0.008;
        book.rotation.y += dx;
        book.rotation.x += dy;
        velX = dx; velY = dy;
        lastX = x; lastY = y;
      };
      const onUp = () => { isDown = false; };
      const el = renderer.domElement;
      el.addEventListener('pointerdown', e => onDown(e.clientX, e.clientY));
      window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY));
      window.addEventListener('pointerup', onUp);
      el.addEventListener('touchstart', e => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }, { passive: true });
      window.addEventListener('touchmove', e => { const t = e.touches[0]; onMove(t.clientX, t.clientY); }, { passive: true });
      window.addEventListener('touchend', onUp);

      // ダブルタップ → ふわっと開く（本が45度開いて戻る）
      let openState = 0;
      let lastTap = 0;
      el.addEventListener('click', () => {
        const now = Date.now();
        if (now - lastTap < 320) {
          openState = openState === 0 ? 1 : 0;
          if (MAGIC.playPaperSwoosh) MAGIC.playPaperSwoosh();
        }
        lastTap = now;
      });

      // リサイズ
      const onResize = () => {
        const ww = Math.min(window.innerWidth, 700);
        const hh = Math.min(window.innerHeight, 900);
        renderer.setSize(ww, hh);
        camera.aspect = ww / hh;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      // アニメーションループ
      let raf = 0;
      let openBias = 0;
      function animate() {
        const dt = clock.getDelta();
        // 慣性
        if (!isDown) {
          book.rotation.y += velX * 0.92;
          book.rotation.x += velY * 0.92;
          velX *= 0.88;
          velY *= 0.88;
          if (Math.abs(velX) < 0.001) velX = 0;
          if (Math.abs(velY) < 0.001) velY = 0;
        }
        // 呼吸
        const t = clock.elapsedTime;
        book.position.y = Math.sin(t * 0.7) * 0.04;
        book.rotation.x += Math.sin(t * 0.9) * 0.0002;
        // 自然な自動回転（停止時のみ）
        if (!isDown && velX === 0) book.rotation.y += dt * 0.07;
        // 開く演出
        const target = openState === 1 ? 0.25 : 0;
        openBias += (target - openBias) * 0.06;
        book.rotation.z = openBias * 0.4;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      }
      animate();

      MAGIC._book3dScene = {
        dispose() {
          cancelAnimationFrame(raf);
          window.removeEventListener('resize', onResize);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          [coverTex, backTex, spineTex, pagesTex].forEach(t => t.dispose && t.dispose());
          materials.forEach(m => m.dispose());
          box.dispose();
          renderer.dispose();
        }
      };
    }
  }

  // ============================================================
  // 10) 歴史の奥行き — ホームブロック版は廃止、ヒーロー（magic-topbook）内のピルに統合済み
  // ============================================================
  function setupDeepExplore() {
    // 既存の magic-deep-block が過去バージョンで挿入されていたら削除（DOM を綺麗に）
    const cleanup = () => {
      const old = document.getElementById('magicDeepBlock');
      if (old) old.remove();
    };
    cleanup();
    // DOM が後から生成されるケースにも備える
    const mo = new MutationObserver(cleanup);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function openDeepOverlay(title, subtitle, contentHtml) {
    let ov = document.getElementById('magicDeepOverlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'magicDeepOverlay';
    ov.className = 'magic-deep-overlay';
    ov.innerHTML = `
      <div class="magic-deep-head">
        <div>
          <h3>${title}</h3>
          <div class="magic-deep-head-sub">${subtitle || ''}</div>
        </div>
        <button class="magic-deep-close" aria-label="閉じる">×</button>
      </div>
      <div class="magic-deep-body">${contentHtml}</div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.magic-deep-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 200);
    });
    if (MAGIC.playDoorOpen) MAGIC.playDoorOpen();
    return ov;
  }

  // ============================================================
  // A) 関係グラフ（Canvas force-directed）
  // ============================================================
  async function openRelationGraph() {
    console.log('[magic/graph] opening…');
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) { console.warn('[magic/graph] no people'); return; }
    MAGIC._graphDebug = { step: 'start', nodes: 0, links: 0, frame: 0 };

    const ov = openDeepOverlay('🕸 関係グラフ', '師弟・盟友・論敵。全偉人の繋がりを力学的に。',
      `<canvas class="magic-graph-canvas" id="magicGraphCanvas"></canvas>
       <div class="magic-graph-legend">
         <div><span class="dot" style="background:rgba(212,176,85,0.9)"></span>師弟・尊敬</div>
         <div><span class="dot" style="background:rgba(176,210,180,0.9)"></span>盟友・交友</div>
         <div><span class="dot" style="background:rgba(220,90,100,0.9)"></span>論敵・対立</div>
       </div>
       <div class="magic-graph-tooltip" id="magicGraphTip" style="opacity:0"></div>
       <div class="magic-graph-zoom-wrap">
         <button class="magic-graph-zoom-btn" data-graph-zoom="in" aria-label="ズームイン">＋</button>
         <button class="magic-graph-zoom-btn" data-graph-zoom="out" aria-label="ズームアウト">−</button>
       </div>
       <div class="magic-graph-controls">
         <button class="magic-graph-ctrl active" data-filter="all">すべて</button>
         <button class="magic-graph-ctrl" data-filter="music">音楽</button>
         <button class="magic-graph-ctrl" data-filter="philo">哲学</button>
         <button class="magic-graph-ctrl" data-filter="literature">文学</button>
         <button class="magic-graph-ctrl" data-filter="art">美術</button>
         <button class="magic-graph-ctrl" data-filter="history">歴史</button>
         <button class="magic-graph-ctrl" data-filter="science">科学</button>
       </div>
       <div class="magic-graph-eras">
         <span class="magic-graph-eras-label">時代</span>
         <button class="magic-graph-era active" data-era="all">すべて</button>
         <button class="magic-graph-era" data-era="ancient">古代(〜500)</button>
         <button class="magic-graph-era" data-era="medieval">中世(500〜1500)</button>
         <button class="magic-graph-era" data-era="early_modern">近世(1500〜1800)</button>
         <button class="magic-graph-era" data-era="modern">近代(1800〜1900)</button>
         <button class="magic-graph-era" data-era="contemporary">現代(1900〜)</button>
       </div>`);

    const canvas = ov.querySelector('#magicGraphCanvas');
    const tip = ov.querySelector('#magicGraphTip');
    const body = ov.querySelector('.magic-deep-body');
    // オーバーレイ表示直後はまだレイアウトが0のことがあるので、2フレーム待って計測
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    // さらに念のため、bodyサイズが未定なら少し待つ
    let W = body.clientWidth || window.innerWidth;
    let H = body.clientHeight || (window.innerHeight - 80);
    if (W < 50 || H < 50) {
      await new Promise(r => setTimeout(r, 80));
      W = body.clientWidth || window.innerWidth;
      H = body.clientHeight || (window.innerHeight - 80);
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    // リサイズ時も対応
    const resize = () => {
      const nw = body.clientWidth || window.innerWidth;
      const nh = body.clientHeight || (window.innerHeight - 80);
      if (nw === W && nh === H) return;
      W = nw; H = nh;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', resize);

    // 分野判定
    const categoryOf = (field) => {
      if (!field) return 'other';
      if (/作曲家|ピアニスト|演奏家|音楽|指揮者/.test(field)) return 'music';
      if (/哲学/.test(field)) return 'philo';
      if (/小説家|作家|詩人|文学者|歌人|俳人|劇作家/.test(field)) return 'literature';
      if (/画家|彫刻家|美術/.test(field)) return 'art';
      if (/科学|数学者|物理学者|生物学者|医師|医学|博物学者|化学/.test(field)) return 'science';
      if (/武士|武将|志士|藩士|政治家|軍人|大名|局長|副長|戦国|維新|幕末|皇帝|王|天皇|女王/.test(field)) return 'history';
      return 'other';
    };
    const BLOCK_KW = ['宿敵','敵','ライバル','対立','裏切','論敵','抗争','競争','暗殺','刺客','暗殺者','抗命','反発','確執','不仲','宗教的対立','批判者','批判'];
    const MENTOR_KW = ['師','弟子','継承','後継','先達','憧れ','崇拝','敬愛','発掘','育て'];
    const linkKind = (r) => {
      const t = (r.relation||'') + (r.note||'');
      if (BLOCK_KW.some(kw => t.includes(kw))) return 'rival';
      if (MENTOR_KW.some(kw => t.includes(kw))) return 'mentor';
      return 'peer';
    };
    const CAT_COLOR = {
      music: '#d4b055', philo: '#a988c8', literature: '#8fa5c7',
      art: '#d68f8f', science: '#8fc7a5', history: '#c79d6a', other: '#999'
    };
    const LINK_COLOR = {
      mentor: 'rgba(212,176,85,0.85)',
      peer:   'rgba(210,230,220,0.7)',
      rival:  'rgba(230,110,120,0.85)',
    };

    // relations持ってる人だけ対象（W/H確定後に初期位置を決める）
    const peopleWithRels = people.filter(p => (p.relations||[]).length > 0);
    const safeW = Math.max(300, W);
    const safeH = Math.max(300, H);
    let nodes = peopleWithRels.map(p => ({
      id: p.id,
      name: p.name,
      field: p.field,
      cat: categoryOf(p.field),
      img: p.imageUrl,
      imageUrl: p.imageUrl,
      birth: p.birth,
      x: safeW/2 + (Math.random() - 0.5) * safeW * 0.7,
      y: safeH/2 + (Math.random() - 0.5) * safeH * 0.7,
      vx: 0, vy: 0,
      r: 6,
      degree: 0,
    }));
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const links = [];
    peopleWithRels.forEach(p => {
      (p.relations || []).forEach(r => {
        const other = r.id && nodeById.get(r.id);
        if (!other) return;
        links.push({ source: nodeById.get(p.id), target: other, kind: linkKind(r) });
        nodeById.get(p.id).degree++;
        other.degree++;
      });
    });
    nodes.forEach(n => { n.r = Math.min(22, 12 + Math.sqrt(n.degree) * 2); });

    let activeFilter = 'all';
    let activeEra = 'all';
    function matchesEra(n) {
      if (activeEra === 'all') return true;
      const b = n.birth;
      if (b == null) return false;
      switch (activeEra) {
        case 'ancient': return b < 500;
        case 'medieval': return b >= 500 && b < 1500;
        case 'early_modern': return b >= 1500 && b < 1800;
        case 'modern': return b >= 1800 && b < 1900;
        case 'contemporary': return b >= 1900;
      }
      return true;
    }
    let view = { x: 0, y: 0, k: 1 };
    // 先に宣言（step() で参照するため TDZ を回避）
    let draggingNode = null;
    let panning = false;
    let lastX = 0, lastY = 0;

    // 力学シミュレーション
    let running = true;
    const CENTER_STRENGTH = 0.0015;
    const REPULSE_STRENGTH = 900;
    const LINK_STRENGTH = 0.03;
    const LINK_LENGTH = 70;
    const FRICTION = 0.85;

    function step() {
      // 中心に引き寄せ
      nodes.forEach(n => {
        n.vx += (W/2 - n.x) * CENTER_STRENGTH;
        n.vy += (H/2 - n.y) * CENTER_STRENGTH;
      });
      // ノード間反発（近傍のみ簡略化）
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx*dx + dy*dy;
          if (d2 < 10) continue;
          if (d2 > 40000) continue; // 遠いノードは無視
          const f = REPULSE_STRENGTH / d2;
          const d = Math.sqrt(d2);
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
      }
      // リンクの引力
      links.forEach(l => {
        const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
        const d = Math.sqrt(dx*dx + dy*dy) || 1;
        const f = (d - LINK_LENGTH) * LINK_STRENGTH;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        l.source.vx += fx; l.source.vy += fy;
        l.target.vx -= fx; l.target.vy -= fy;
      });
      // 更新
      nodes.forEach(n => {
        if (n === draggingNode) return;
        n.vx *= FRICTION;
        n.vy *= FRICTION;
        n.x += n.vx;
        n.y += n.vy;
      });
    }
    function matchesFilter(n) {
      const catOk = activeFilter === 'all' || n.cat === activeFilter;
      return catOk && matchesEra(n);
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(view.x + W/2, view.y + H/2);
      ctx.scale(view.k, view.k);
      ctx.translate(-W/2, -H/2);
      // リンク
      links.forEach(l => {
        if (!matchesFilter(l.source) && !matchesFilter(l.target)) return;
        ctx.strokeStyle = LINK_COLOR[l.kind];
        ctx.lineWidth = l.kind === 'rival' ? 1.8 : 1.4;
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.lineTo(l.target.x, l.target.y);
        ctx.stroke();
      });
      // ノード — 顔写真を丸くクリップして描画
      nodes.forEach(n => {
        const match = matchesFilter(n);
        ctx.globalAlpha = match ? 1 : 0.12;
        // 画像ロード（初回のみ）
        if (n.imageUrl && !n._img) {
          n._img = new Image();
          // crossOriginは付けない（付けるとWikimediaがCORSヘッダを付与してくれずに失敗する）
          n._img.referrerPolicy = 'no-referrer';
          n._img.onerror = () => { n._imgFailed = true; };
          n._img.src = n.imageUrl;
        }
        const r = Math.max(n.r, 12);
        ctx.save();
        // 円形マスク
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.clip();
        if (n._img && n._img.complete && n._img.naturalWidth > 2 && !n._imgFailed) {
          // 写真を描画（中央top基準でフィット）
          const imgW = n._img.naturalWidth;
          const imgH = n._img.naturalHeight;
          const scale = Math.max((r*2) / imgW, (r*2) / imgH);
          const dw = imgW * scale;
          const dh = imgH * scale;
          ctx.drawImage(n._img, n.x - dw/2, n.y - r, dw, dh);
        } else {
          // 画像未読/失敗時はカテゴリカラー
          ctx.fillStyle = CAT_COLOR[n.cat] || '#999';
          ctx.fillRect(n.x - r, n.y - r, r*2, r*2);
          // 名前の頭文字
          ctx.fillStyle = 'rgba(255,245,220,0.9)';
          ctx.font = `bold ${r}px "Shippori Mincho", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((n.name || '?').charAt(0), n.x, n.y);
        }
        ctx.restore();
        // 金の縁
        ctx.strokeStyle = n._img && n._img.complete && !n._imgFailed ? 'rgba(212,175,55,0.8)' : 'rgba(20,12,16,0.8)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      // 大きなノードは名前も
      ctx.fillStyle = 'rgba(255,250,240,0.85)';
      ctx.font = `${11 / view.k}px "Shippori Mincho", serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1;
      nodes.forEach(n => {
        if (!matchesFilter(n)) return;
        if (n.r < 10 && view.k < 1.5) return;
        ctx.fillStyle = 'rgba(255,250,240,0.9)';
        ctx.fillText(n.name.split(/[・]/)[0], n.x, n.y - n.r - 3);
      });
      ctx.restore();
    }
    function loop() {
      if (!running) return;
      try { step(); draw(); if (MAGIC._graphDebug) MAGIC._graphDebug.frame++; }
      catch (e) { console.error('[magic/graph] loop error', e); running = false; return; }
      requestAnimationFrame(loop);
    }
    if (MAGIC._graphDebug) { MAGIC._graphDebug.step = 'loop-start'; MAGIC._graphDebug.nodes = nodes.length; MAGIC._graphDebug.links = links.length; MAGIC._graphDebug.W = W; MAGIC._graphDebug.H = H; }
    loop();

    // 操作
    function screenToWorld(sx, sy) {
      return {
        x: (sx - W/2 - view.x) / view.k + W/2,
        y: (sy - H/2 - view.y) / view.k + H/2,
      };
    }
    function nodeAt(sx, sy) {
      const p = screenToWorld(sx, sy);
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (!matchesFilter(n)) continue;
        const dx = n.x - p.x, dy = n.y - p.y;
        if (dx*dx + dy*dy < (n.r + 3) ** 2) return n;
      }
      return null;
    }
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const n = nodeAt(sx, sy);
      if (n) {
        draggingNode = n; n.vx = 0; n.vy = 0;
        // ノードタップ: 顔写真+名前を表示したまま維持
        tip.style.opacity = '1';
        tip.style.left = (sx + 14) + 'px';
        tip.style.top = (sy + 14) + 'px';
        const imgUrl = n.imageUrl || '';
        const avatar = imgUrl
          ? `<div style="width:44px;height:44px;border-radius:50%;background-image:url('${imgUrl}');background-size:cover;background-position:center top;border:2px solid #d4af37;flex-shrink:0"></div>`
          : `<div style="width:44px;height:44px;border-radius:50%;background:#3a2d1c;color:#d4af37;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #d4af37;flex-shrink:0">${(n.name||'?').charAt(0)}</div>`;
        tip.innerHTML = `<div style="display:flex;gap:8px;align-items:center">${avatar}<div><div style="font-weight:700;font-size:13px">${n.name}</div><div style="font-size:10px;opacity:0.75">${n.field || ''} · つながり${n.degree}</div></div></div>`;
        tip.dataset.sticky = '1';
      }
      else {
        // 何もないところをタップ: tipを消す
        panning = true; lastX = sx; lastY = sy;
        tip.style.opacity = '0';
        tip.dataset.sticky = '';
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      if (draggingNode) {
        const p = screenToWorld(sx, sy);
        draggingNode.x = p.x; draggingNode.y = p.y;
      } else if (panning) {
        view.x += sx - lastX;
        view.y += sy - lastY;
        lastX = sx; lastY = sy;
      } else {
        const n = nodeAt(sx, sy);
        if (n) {
          tip.style.opacity = '1';
          tip.style.left = (sx + 14) + 'px';
          tip.style.top = (sy + 14) + 'px';
          const imgUrl = n.imageUrl || '';
          const avatar = imgUrl
            ? `<div style="width:44px;height:44px;border-radius:50%;background-image:url('${imgUrl}');background-size:cover;background-position:center top;border:2px solid #d4af37;flex-shrink:0"></div>`
            : `<div style="width:44px;height:44px;border-radius:50%;background:#3a2d1c;color:#d4af37;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #d4af37;flex-shrink:0">${(n.name||'?').charAt(0)}</div>`;
          tip.innerHTML = `<div style="display:flex;gap:8px;align-items:center">${avatar}<div><div style="font-weight:700;font-size:13px">${n.name}</div><div style="font-size:10px;opacity:0.75">${n.field || ''} · つながり${n.degree}</div></div></div>`;
        } else if (tip.dataset.sticky !== '1') {
          tip.style.opacity = '0';
        }
      }
    });
    // モバイル向け: 1回目タップで名前表示、同じノードに2回目タップで偉人ページへ
    let lastTappedId = null;
    let lastTappedAt = 0;
    canvas.addEventListener('pointerup', (e) => {
      if (draggingNode) {
        const moved = Math.abs(draggingNode.vx) + Math.abs(draggingNode.vy);
        if (moved < 0.5) {
          const id = draggingNode.id;
          const now = Date.now();
          const sameNodeRecent = (id === lastTappedId) && (now - lastTappedAt < 2500);
          if (sameNodeRecent) {
            // 2回目タップ → 偉人ページへ
            closeDeep();
            setTimeout(() => { if (typeof window.showPerson === 'function') window.showPerson(id); }, 300);
            lastTappedId = null;
          } else {
            // 1回目タップ → 名前表示のみ（tipは pointerdown で既に表示済み）
            lastTappedId = id;
            lastTappedAt = now;
          }
        }
      }
      draggingNode = null; panning = false;
    });
    canvas.addEventListener('pointerleave', () => { draggingNode = null; panning = false; tip.style.opacity = '0'; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoom = Math.exp(-e.deltaY * 0.001);
      view.k = Math.max(0.3, Math.min(3, view.k * zoom));
    }, { passive: false });

    // ズームボタン（+/-）
    ov.querySelectorAll('[data-graph-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.graphZoom === 'in' ? 1.25 : 0.8;
        view.k = Math.max(0.3, Math.min(3, view.k * dir));
      });
    });
    // カテゴリフィルタ
    ov.querySelectorAll('.magic-graph-ctrl').forEach(btn => {
      btn.addEventListener('click', () => {
        ov.querySelectorAll('.magic-graph-ctrl').forEach(b => b.classList.toggle('active', b === btn));
        activeFilter = btn.dataset.filter;
      });
    });
    // 時代フィルタ
    ov.querySelectorAll('.magic-graph-era').forEach(btn => {
      btn.addEventListener('click', () => {
        ov.querySelectorAll('.magic-graph-era').forEach(b => b.classList.toggle('active', b === btn));
        activeEra = btn.dataset.era;
      });
    });

    function closeDeep() {
      running = false;
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 220);
    }
    ov.querySelector('.magic-deep-close').onclick = closeDeep;
  }

  // ============================================================
  // B) 同時代ライン（年スライダー）
  // ============================================================
  async function openSimultaneity(opts = {}) {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;

    const yearsValid = people.filter(p => p.birth != null && p.death != null);
    const minYear = Math.floor(Math.min(...yearsValid.map(p => p.birth)) / 100) * 100;
    const maxYear = new Date().getFullYear();
    const defaultYear = opts.centuryMode ? 1800 : 1750;

    const ov = openDeepOverlay(
      opts.centuryMode ? '🕰 世紀ごとの群像' : '📅 同時代',
      '「ある年、誰が生きていたか」を辿る。',
      `<div class="magic-simul-wrap">
         <div class="magic-simul-year">
           <span id="magicSimulYearText">—</span>
           <span class="magic-simul-year-label" id="magicSimulYearLabel">&nbsp;</span>
         </div>
         <div class="magic-simul-slider-wrap">
           <input type="range" min="${minYear}" max="${maxYear}" value="${defaultYear}" step="1" class="magic-simul-slider" id="magicSimulSlider">
           <div class="magic-simul-ticks">
             <span>${minYear < 0 ? '紀元前' + Math.abs(minYear) : minYear}</span>
             <span>500</span><span>1000</span><span>1500</span><span>1800</span><span>${maxYear}</span>
           </div>
         </div>
         <div class="magic-simul-list" id="magicSimulList"></div>
       </div>`);

    const slider = ov.querySelector('#magicSimulSlider');
    const yText = ov.querySelector('#magicSimulYearText');
    const yLabel = ov.querySelector('#magicSimulYearLabel');
    const list = ov.querySelector('#magicSimulList');

    const fmtYear = (y) => y < 0 ? `紀元前${Math.abs(y)}` : `${y}`;

    function render(year) {
      yText.textContent = fmtYear(year);
      // 何時代か
      const era = year < 500 ? '古代' : year < 1500 ? '中世' : year < 1780 ? '近世' : year < 1900 ? '近代' : '現代';
      yLabel.textContent = era;
      const alive = people
        .filter(p => p.birth != null && p.birth <= year && (p.death == null || p.death >= year))
        .sort((a, b) => a.birth - b.birth);
      if (alive.length === 0) {
        list.innerHTML = '<div class="magic-simul-empty">この年、登録された偉人はまだ現れていません。</div>';
        return;
      }
      list.innerHTML = alive.map(p => {
        const av = p.imageUrl
          ? `<div class="magic-simul-av" style="background-image:url('${p.imageUrl}')"></div>`
          : `<div class="magic-simul-av no-img">${(p.name||'').charAt(0)}</div>`;
        const age = year - p.birth;
        const status = (p.death == null || p.death >= year)
          ? `${age}歳`
          : '';
        return `
          <button class="magic-simul-card" data-id="${p.id}">
            ${av}
            <div class="magic-simul-info">
              <div class="magic-simul-name">${p.name || ''}</div>
              <div class="magic-simul-meta">${p.field || ''} ／ ${p.country || ''}</div>
              <div class="magic-simul-age">${status}（${fmtYear(p.birth)}生）</div>
            </div>
          </button>
        `;
      }).join('');
      list.querySelectorAll('.magic-simul-card').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          ov.classList.remove('open');
          setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(id); }, 220);
        });
      });
    }
    slider.addEventListener('input', (e) => render(parseInt(e.target.value, 10)));
    render(defaultYear);
  }

  // ============================================================
  // C-NEW) 地球儀（Three.js）
  // ============================================================
  const COUNTRY_COORDS_GLOBE = {
    '日本': [36, 138], '古代ギリシャ': [39, 23], 'ギリシャ': [39, 23],
    'イタリア': [43, 12], 'フランス': [47, 2], 'ドイツ': [51, 10],
    'オーストリア': [48, 14], 'イギリス': [54, -2], '英国': [54, -2],
    'スペイン': [40, -4], 'オランダ': [52, 5], 'スイス': [47, 8],
    'ロシア': [56, 37], 'アメリカ': [38, -95], 'アメリカ合衆国': [38, -95],
    'ポーランド': [52, 19], 'チェコ': [50, 15], 'ハンガリー': [47, 19],
    'ノルウェー': [60, 10], 'フィンランド': [64, 26], 'デンマーク': [56, 10],
    'スウェーデン': [60, 18], '中国': [36, 104], 'インド': [22, 78],
    'エジプト': [26, 30], '古代ローマ': [42, 12], 'ローマ': [42, 12],
    'ベルギー': [50, 4], 'ポルトガル': [40, -8], 'ブラジル': [-10, -55],
    'アルゼンチン': [-34, -65], '古代イスラエル': [31, 34], 'イスラエル': [31, 34],
    'アイルランド': [53, -8], 'スコットランド': [56, -4],
    '古代中国': [36, 104], 'アメリカ（オランダ出身）': [38, -95], 'オランダ（アメリカ）': [38, -95],
  };

  async function openWorldMap() {
    if (!window.THREE) {
      // Fallback: Three.jsロード失敗時は2D SVGに戻す
      return openWorldMap2D();
    }
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;

    const byCountry = {};
    people.forEach(p => {
      const c = (p.country || '').trim();
      if (!c) return;
      const coord = COUNTRY_COORDS_GLOBE[c];
      if (!coord) return;
      (byCountry[c] = byCountry[c] || { coord, people: [] }).people.push(p);
    });

    const ov = openDeepOverlay('🌍 地球儀', 'ドラッグで回す / ホイール・ピンチでズーム / 時代で絞り込み',
      `<div class="magic-globe-wrap" id="magicGlobeWrap">
         <canvas class="magic-globe-net" id="magicGlobeNet"></canvas>
         <div class="magic-globe-scan"></div>
         <div class="magic-globe-coord" id="magicGlobeCoord">LAT 00.0° / LON 000.0°</div>
         <div class="magic-globe-clock" id="magicGlobeClock">
           <div class="mgc-phase" id="mgcPhase">☀️ 昼</div>
           <div class="mgc-time" id="mgcTime">--:--</div>
           <div class="mgc-label">JST · Local</div>
         </div>
         <div class="magic-globe-hint">DRAG · ROTATE · TAP</div>
         <div class="magic-globe-tooltip" id="magicGlobeTip"></div>
         <div class="magic-globe-info" id="magicGlobeInfo"></div>
         <div class="magic-globe-controls">
           <button class="magic-globe-zoom" data-globe-zoom="in" aria-label="ズームイン">＋</button>
           <button class="magic-globe-zoom" data-globe-zoom="out" aria-label="ズームアウト">−</button>
           <button class="magic-globe-zoom magic-globe-mercator" id="magicGlobeMerc" aria-label="世界地図">🗺</button>
         </div>
         <div class="magic-mercator-overlay" id="magicMercatorOverlay">
           <div class="mmo-header">
             <div class="mmo-title">🗺 世界地図</div>
             <button class="mmo-close" id="mmoClose" aria-label="閉じる">×</button>
           </div>
           <div class="mmo-filters">
             <div class="mmo-filter-row">
               <span class="mmo-filter-label">時代</span>
               <button class="mmo-chip active" data-merc-era="all">全</button>
               <button class="mmo-chip" data-merc-era="ancient">古代</button>
               <button class="mmo-chip" data-merc-era="medieval">中世</button>
               <button class="mmo-chip" data-merc-era="early_modern">近世</button>
               <button class="mmo-chip" data-merc-era="modern">近代</button>
               <button class="mmo-chip" data-merc-era="contemporary">現代</button>
             </div>
             <div class="mmo-filter-row">
               <span class="mmo-filter-label">大陸</span>
               <button class="mmo-chip active" data-merc-cont="all">全</button>
               <button class="mmo-chip" data-merc-cont="asia">アジア</button>
               <button class="mmo-chip" data-merc-cont="europe">ヨーロッパ</button>
               <button class="mmo-chip" data-merc-cont="africa">アフリカ</button>
               <button class="mmo-chip" data-merc-cont="namerica">北米</button>
               <button class="mmo-chip" data-merc-cont="samerica">南米</button>
               <button class="mmo-chip" data-merc-cont="oceania">オセアニア</button>
             </div>
           </div>
           <div class="mmo-canvas-wrap">
             <canvas class="mmo-canvas" id="mmoCanvas"></canvas>
             <div class="mmo-tip" id="mmoTip"></div>
             <div class="mmo-people" id="mmoPeople"></div>
           </div>
         </div>
         <div class="magic-globe-eras">
           <button class="magic-globe-era active" data-era="all">全時代</button>
           <button class="magic-globe-era" data-era="ancient">古代</button>
           <button class="magic-globe-era" data-era="medieval">中世</button>
           <button class="magic-globe-era" data-era="early_modern">近世</button>
           <button class="magic-globe-era" data-era="modern">近代</button>
           <button class="magic-globe-era" data-era="contemporary">現代</button>
         </div>
       </div>`);

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const wrap = ov.querySelector('#magicGlobeWrap');
    const tip = ov.querySelector('#magicGlobeTip');
    const info = ov.querySelector('#magicGlobeInfo');
    const W = wrap.clientWidth || window.innerWidth;
    const H = wrap.clientHeight || (window.innerHeight - 80);

    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    wrap.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    // 地球全体が画面内に収まるよう、少し遠めから見下ろし気味に
    camera.position.set(0, 0.2, 12.5);
    camera.lookAt(0, -0.1, 0);

    // 🌅 昼夜境界：太陽位置を UTC 時刻から計算して、夜側は「深い青の夕暮れ」
    // （真っ暗にすると地球が見えなくなるので、昼夜差は残しつつ視認性を確保）
    const ambient = new THREE.AmbientLight(0x8ab0d8, 0.38); // 青みの強めアンビエント
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff0c8, 1.1); // 太陽光（強すぎない）
    sun.position.set(8, 2, 0);
    scene.add(sun);
    // 太陽方向を UTC から算出する関数（地軸固定の赤道面上で時刻に応じた経度を太陽直下点に）
    function updateSunPosition() {
      const now = new Date();
      const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
      // UTC 12時 = 東経0度が正午 ≒ (0,0) が sub-solar
      // 0時 = 反対側。太陽は地球から見て (sunLon 方向) にある
      const sunLon = ((12 - utcH) / 24) * Math.PI * 2; // ラジアン
      // 季節：4月 = 春。簡易化して季節傾き ±23.4°
      const doy = Math.floor((now - new Date(now.getUTCFullYear(), 0, 0)) / 86400000);
      const declination = 23.4 * Math.sin(2 * Math.PI * (doy - 80) / 365.25) * Math.PI / 180;
      const R = 10;
      // latLngToVec の座標系に合わせる：lng L の地点は (cos L, 0, -sin L) 方向
      sun.position.set(
        R * Math.cos(declination) * Math.cos(sunLon),
        R * Math.sin(declination),
        -R * Math.cos(declination) * Math.sin(sunLon)
      );
    }
    updateSunPosition();
    function updateClockHUD() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const tEl = ov.querySelector('#mgcTime');
      const pEl = ov.querySelector('#mgcPhase');
      if (tEl) tEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      if (pEl) {
        let phase = '☀️ 昼';
        if (h < 4) phase = '🌌 深夜';
        else if (h < 6) phase = '🌒 未明';
        else if (h < 8) phase = '🌅 朝焼け';
        else if (h < 11) phase = '🌤 午前';
        else if (h < 14) phase = '☀️ 正午';
        else if (h < 17) phase = '🌞 午後';
        else if (h < 19) phase = '🌆 夕暮れ';
        else if (h < 22) phase = '🌙 夜';
        else phase = '🌃 深夜';
        pEl.textContent = phase;
      }
    }
    updateClockHUD();
    // 補助リム（夜側のシルエットを浮かび上がらせる青い反射光）
    const rim = new THREE.DirectionalLight(0x6aa0d8, 0.45);
    rim.position.set(-5, 0, -3);
    scene.add(rim);
    // もう一つの対向リム（全方位から薄く）
    const rim2 = new THREE.DirectionalLight(0x88c0f0, 0.22);
    rim2.position.set(0, -5, 3);
    scene.add(rim2);

    // 地球儀テクスチャ：NASA Blue Marble の実写テクスチャを CDN から
    const earthGeo = new THREE.SphereGeometry(2.2, 64, 48);
    // まずは手描きテクスチャで即座に表示（ロード中は見える）
    const procTex = makeEarthTexture();
    const earthMat = new THREE.MeshStandardMaterial({
      map: procTex,
      roughness: 0.75,
      metalness: 0.08,
      // 青系にトーンを寄せる（テクスチャ全体を青く染める）
      color: new THREE.Color(0x9ac8f0),
      emissive: new THREE.Color(0x1a3a64),
      emissiveIntensity: 0.42,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);
    // 実写テクスチャを差し替え
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_atmos_2048.jpg',
      (tex) => {
        tex.anisotropy = 8;
        // 前のテクスチャを破棄してから差し替え
        if (earthMat.map && earthMat.map !== tex) earthMat.map.dispose();
        earthMat.map = tex;
        earthMat.roughness = 0.82;
        earthMat.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn('[magic/globe] NASA texture failed, using procedural', err);
      }
    );
    // ノーマルマップ（地形陰影）も
    loader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_normal_2048.jpg',
      (tex) => {
        tex.anisotropy = 8;
        earthMat.normalMap = tex;
        earthMat.normalScale = new THREE.Vector2(0.55, 0.55);
        earthMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );
    // Specularマップ（海の反射）
    loader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_specular_2048.jpg',
      (tex) => {
        tex.anisotropy = 8;
        earthMat.roughnessMap = tex;
        earthMat.needsUpdate = true;
      },
      undefined,
      () => {}
    );
    // 雲のレイヤー（薄く）
    loader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/textures/planets/earth_clouds_1024.png',
      (tex) => {
        tex.anisotropy = 8;
        const cloudGeo = new THREE.SphereGeometry(2.22, 48, 36);
        const cloudMat = new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          side: THREE.FrontSide,
        });
        const clouds = new THREE.Mesh(cloudGeo, cloudMat);
        earth.add(clouds);
        MAGIC._clouds = clouds;
      },
      undefined,
      () => {}
    );

    // 🛰 軌道衛星（ISS 模擬 / 高度 ~400km を極端にデフォルメ）
    const satGroup = new THREE.Group();
    scene.add(satGroup);
    // 本体
    const satBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.05, 0.09),
      new THREE.MeshBasicMaterial({ color: 0xf0f0f0 })
    );
    satGroup.add(satBody);
    // 両翼のソーラーパネル
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x1a3a6a, transparent: true, opacity: 0.85 });
    const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.005, 0.06), panelMat);
    panelL.position.x = -0.14;
    satGroup.add(panelL);
    const panelR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.005, 0.06), panelMat);
    panelR.position.x = 0.14;
    satGroup.add(panelR);
    // 明滅する光点（衛星マーカー）
    const satGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff7a4a, transparent: true, opacity: 1 })
    );
    satGroup.add(satGlow);
    // 軌道パラメータ（ISS 傾斜角 51.6° 模擬）
    const SAT_RADIUS = 2.85;
    const SAT_INCLINATION = 51.6 * Math.PI / 180;
    let satAngle = Math.random() * Math.PI * 2;
    // 軌跡の線（BufferGeometry を使って常に更新）
    const SAT_TRAIL_LEN = 60;
    const satTrailPositions = new Float32Array(SAT_TRAIL_LEN * 3);
    const satTrailGeo = new THREE.BufferGeometry();
    satTrailGeo.setAttribute('position', new THREE.BufferAttribute(satTrailPositions, 3));
    const satTrailMat = new THREE.LineBasicMaterial({ color: 0xff9060, transparent: true, opacity: 0.5 });
    const satTrail = new THREE.Line(satTrailGeo, satTrailMat);
    scene.add(satTrail);

    // 💫 パルス衝撃波：ピンをクリックすると地表を走る光の輪
    const shockwaves = []; // { mesh, start, life, surfaceNormal }
    function spawnShockwave(surfacePos) {
      // surfacePos: earth ローカル座標の表面位置（長さ ≈ 2.2）
      const ringGeo = new THREE.RingGeometry(0.05, 0.09, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xbbe4ff,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      // 地表に沿って配置（法線方向を上にして地面に貼る）
      ring.position.copy(surfacePos).multiplyScalar(1.005); // 僅かに浮かせる
      ring.lookAt(surfacePos.clone().multiplyScalar(2)); // 法線方向に向ける
      earth.add(ring);
      shockwaves.push({ mesh: ring, start: performance.now(), life: 2200, geo: ringGeo, mat: ringMat });
      // 2段目（時間差で内側からもう一つ）
      setTimeout(() => {
        if (!ov.isConnected) return;
        const ringGeo2 = new THREE.RingGeometry(0.03, 0.06, 48);
        const ringMat2 = new THREE.MeshBasicMaterial({
          color: 0xffd890, transparent: true, opacity: 0.9,
          side: THREE.DoubleSide, depthWrite: false,
        });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.position.copy(surfacePos).multiplyScalar(1.005);
        ring2.lookAt(surfacePos.clone().multiplyScalar(2));
        earth.add(ring2);
        shockwaves.push({ mesh: ring2, start: performance.now(), life: 1800, geo: ringGeo2, mat: ringMat2 });
      }, 280);
    }

    // ✈️ 国際線フライト（大円弧）
    const _llToVecF = (lat, lng, r) => {
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    };
    const FLIGHT_ROUTES = [
      { from: [35.68, 139.69], to: [40.71, -74.01],  name: 'TYO-NYC' }, // 東京→NY
      { from: [51.51, -0.13],  to: [25.20, 55.27],   name: 'LON-DXB' }, // ロンドン→ドバイ
      { from: [48.86, 2.35],   to: [-33.87, 151.21], name: 'PAR-SYD' }, // パリ→シドニー
      { from: [37.77, -122.42],to: [22.32, 114.17],  name: 'SFO-HKG' }, // SF→香港
      { from: [-23.55, -46.63],to: [28.61, 77.21],   name: 'SAO-DEL' }, // サンパウロ→デリー
      { from: [55.76, 37.62],  to: [1.35, 103.82],   name: 'MOS-SIN' }, // モスクワ→シンガポール
      { from: [35.68, 139.69], to: [48.86, 2.35],    name: 'TYO-PAR' }, // 東京→パリ
      { from: [19.43, -99.13], to: [-33.87, 151.21], name: 'MEX-SYD' }, // メキシコシティ→シドニー
    ];
    const EARTH_R = 2.2;
    const flightGroup = new THREE.Group();
    earth.add(flightGroup); // 地球回転に追随
    const planeGeo = new THREE.ConeGeometry(0.025, 0.09, 6);
    planeGeo.rotateX(Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
    const flights = FLIGHT_ROUTES.map((r, i) => {
      const a = _llToVecF(r.from[0], r.from[1], 1);
      const b = _llToVecF(r.to[0], r.to[1], 1);
      const plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ color: 0xfff4d6 }));
      flightGroup.add(plane);
      // 航跡ライン（過去に通った軌跡）
      const TRAIL_N = 40;
      const trailPos = new Float32Array(TRAIL_N * 3);
      for (let k = 0; k < TRAIL_N * 3; k++) trailPos[k] = 0;
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      const trailMat = new THREE.LineBasicMaterial({ color: 0xffcf80, transparent: true, opacity: 0.6 });
      const trail = new THREE.Line(trailGeo, trailMat);
      flightGroup.add(trail);
      // ヘッドの光点
      const glowMat = new THREE.SpriteMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.9, depthWrite: false });
      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(0.08, 0.08, 1);
      flightGroup.add(glow);
      return {
        plane, trail, trailPos, trailGeo, trailLen: TRAIL_N, trailWrite: 0, trailCount: 0,
        glow,
        from: a, to: b, t: Math.random(), // 出発オフセット
        speed: 0.0012 + Math.random() * 0.0012,
        arcHeight: 0.12 + Math.random() * 0.08,
      };
    });
    function updateFlights() {
      flights.forEach(f => {
        f.t += f.speed;
        if (f.t > 1) f.t = 0;
        // 大円slerp
        const dot = Math.max(-1, Math.min(1, f.from.dot(f.to)));
        const omega = Math.acos(dot);
        const sinO = Math.sin(omega) || 1;
        const k1 = Math.sin((1 - f.t) * omega) / sinO;
        const k2 = Math.sin(f.t * omega) / sinO;
        const unit = f.from.clone().multiplyScalar(k1).add(f.to.clone().multiplyScalar(k2));
        // 高度：sin(πt) で弧状に上がる
        const alt = EARTH_R + f.arcHeight * Math.sin(Math.PI * f.t) + 0.02;
        const pos = unit.clone().multiplyScalar(alt);
        f.plane.position.copy(pos);
        f.glow.position.copy(pos);
        // 進行方向
        const tNext = Math.min(1, f.t + 0.01);
        const kn1 = Math.sin((1 - tNext) * omega) / sinO;
        const kn2 = Math.sin(tNext * omega) / sinO;
        const posNext = f.from.clone().multiplyScalar(kn1).add(f.to.clone().multiplyScalar(kn2))
          .multiplyScalar(EARTH_R + f.arcHeight * Math.sin(Math.PI * tNext) + 0.02);
        f.plane.lookAt(posNext);
        // 航跡書き込み
        const idx = (f.trailWrite % f.trailLen) * 3;
        f.trailPos[idx] = pos.x; f.trailPos[idx+1] = pos.y; f.trailPos[idx+2] = pos.z;
        f.trailWrite++;
        f.trailCount = Math.min(f.trailCount + 1, f.trailLen);
        f.trailGeo.setDrawRange(0, f.trailCount);
        f.trailGeo.attributes.position.needsUpdate = true;
        // 光点の明滅
        f.glow.material.opacity = 0.7 + Math.sin(performance.now() * 0.01 + f.t * 10) * 0.3;
      });
    }

    // ☀️ 見える太陽（DirectionalLight位置にグローするスプライト+球）
    const sunVisible = new THREE.Group();
    const sunBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2a8 })
    );
    sunVisible.add(sunBody);
    // 太陽のグロー sprite
    const sunGlowCan = document.createElement('canvas'); sunGlowCan.width = 256; sunGlowCan.height = 256;
    (() => {
      const g = sunGlowCan.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(255,240,180,0.95)');
      grd.addColorStop(0.2, 'rgba(255,210,120,0.6)');
      grd.addColorStop(0.5, 'rgba(255,160,80,0.2)');
      grd.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
      // 放射光条
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const gg = g.createLinearGradient(128, 128, 128 + Math.cos(a)*128, 128 + Math.sin(a)*128);
        gg.addColorStop(0, 'rgba(255,230,160,0.4)');
        gg.addColorStop(1, 'rgba(255,180,100,0)');
        g.save(); g.translate(128, 128); g.rotate(a); g.fillStyle = gg; g.fillRect(-3, 0, 6, 128); g.restore();
      }
    })();
    const sunGlowTex = new THREE.CanvasTexture(sunGlowCan);
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    sunGlow.scale.set(3.8, 3.8, 1);
    sunVisible.add(sunGlow);
    scene.add(sunVisible);
    // 太陽を sun(light) と同じ方向に配置（距離はもっと遠くに）
    function updateSunVisible() {
      const p = sun.position.clone().normalize().multiplyScalar(9.0);
      sunVisible.position.copy(p);
    }
    updateSunVisible();

    // 🌙 見える月（地球の周りを公転、現在の月齢に応じた位相で表示）
    const moonTex2 = (() => {
      const sc = document.createElement('canvas'); sc.width = 256; sc.height = 128;
      const g = sc.getContext('2d');
      const base = g.createLinearGradient(0, 0, 0, 128);
      base.addColorStop(0, '#cac6c0'); base.addColorStop(0.5, '#b4b0aa'); base.addColorStop(1, '#98948e');
      g.fillStyle = base; g.fillRect(0, 0, 256, 128);
      [[80, 45, 18], [120, 60, 22], [150, 55, 14], [95, 80, 12], [170, 75, 16]].forEach(([x, y, r]) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(70,65,62,0.7)'); gr.addColorStop(1, 'rgba(70,65,62,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
      });
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 256, y = Math.random() * 128;
        g.fillStyle = `rgba(60,55,50,${0.25 + Math.random()*0.3})`;
        g.beginPath(); g.arc(x, y, 1 + Math.random()*3, 0, Math.PI*2); g.fill();
      }
      return new THREE.CanvasTexture(sc);
    })();
    const moonMap2Uniform = { value: moonTex2 };
    loader.load('https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
      (t) => { t.anisotropy = 8; moonMap2Uniform.value = t; },
      undefined, () => {});
    const moonMat2 = new THREE.ShaderMaterial({
      uniforms: {
        uMap: moonMap2Uniform,
        uSunPos: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uSunPos;
        varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
        void main() {
          vec3 tex = texture2D(uMap, vUv).rgb;
          vec3 sd = normalize(uSunPos - vWorld);
          float d = dot(vN, sd);
          float lit = smoothstep(-0.08, 0.22, d);
          vec3 night = vec3(0.025, 0.025, 0.045);
          vec3 col = mix(night, tex, lit);
          col += vec3(0.015, 0.02, 0.035) * (1.0 - lit) * 0.6;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const globeMoon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 18), moonMat2);
    scene.add(globeMoon);
    // 月の位置：現在日時から月齢を算出、地球周りに配置
    function updateGlobeMoon() {
      const now = new Date();
      // 基準: 2000/01/06 18:14 UTC 頃が新月。月齢29.53日周期
      const ref = new Date(Date.UTC(2000, 0, 6, 18, 14));
      const days = (now.getTime() - ref.getTime()) / 86400000;
      const phase = (days / 29.5306) % 1; // 0=新月, 0.5=満月
      // 月の位置角度：新月=太陽と同方向、満月=太陽の反対
      const sunDir = sun.position.clone().normalize();
      // 太陽方向からphase*2π回転した方向に月を置く（地球の赤道面を簡略で使う）
      const ang = phase * Math.PI * 2;
      // 回転軸はy（北極）
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const mx = sunDir.x * cosA - sunDir.z * sinA;
      const mz = sunDir.x * sinA + sunDir.z * cosA;
      const MOON_DIST = 4.6;
      globeMoon.position.set(mx * MOON_DIST, sunDir.y * 0.3 * MOON_DIST, mz * MOON_DIST);
      // シェーダの太陽位置も更新
      moonMat2.uniforms.uSunPos.value.copy(sun.position).multiplyScalar(4);
    }
    updateGlobeMoon();

    // 大気グロー（外側の半透明球 / 青いハロー）
    const atmGeo = new THREE.SphereGeometry(2.35, 32, 24);
    const atmMat = new THREE.MeshBasicMaterial({
      color: 0x5a9ccc,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));
    // 外側のもう一層（もっと広いグロー）
    const atmGeo2 = new THREE.SphereGeometry(2.5, 32, 24);
    const atmMat2 = new THREE.MeshBasicMaterial({
      color: 0x3a7ab8,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmGeo2, atmMat2));

    // 星（背景）— 数を絞ってドット感を減らす
    const starsGeo = new THREE.BufferGeometry();
    const STAR_COUNT = 80;
    const starsPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 40 + Math.random() * 10;
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI;
      starsPos[i*3]   = r * Math.cos(b) * Math.cos(a);
      starsPos[i*3+1] = r * Math.sin(b);
      starsPos[i*3+2] = r * Math.cos(b) * Math.sin(a);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xe8d49a, size: 0.09, transparent: true, opacity: 0.35 });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // ピン（偉人いる国）
    const latLngToVec = (lat, lng, r) => {
      const phi = (90 - lat) * Math.PI / 180;
      const theta = (lng + 180) * Math.PI / 180;
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
         r * Math.cos(phi),
         r * Math.sin(phi) * Math.sin(theta)
      );
    };
    // ピン: 個別スフィアではなく光の点で（クラスターによる集合体恐怖症を回避）
    const pins = [];
    Object.entries(byCountry).forEach(([country, info]) => {
      const [lat, lng] = info.coord;
      const base = latLngToVec(lat, lng, 2.24);
      pins.push({ country, info, pos: base });
    });
    // Points geometry
    const pinsGeo = new THREE.BufferGeometry();
    const pinsPos = new Float32Array(pins.length * 3);
    const pinsSize = new Float32Array(pins.length);
    pins.forEach((pin, i) => {
      pinsPos[i*3]   = pin.pos.x;
      pinsPos[i*3+1] = pin.pos.y;
      pinsPos[i*3+2] = pin.pos.z;
      pinsSize[i] = Math.min(24, 12 + Math.sqrt(pin.info.people.length) * 3);
      pin._idx = i; pin._visible = true; pin._basePos = [pin.pos.x, pin.pos.y, pin.pos.z];
    });
    pinsGeo.setAttribute('position', new THREE.BufferAttribute(pinsPos, 3));
    // フィルタ適用：非表示は地球中心に折りたたんで見えなくする
    const applyPinVisibility = () => {
      const posAttr = pinsGeo.getAttribute('position');
      pins.forEach(pin => {
        const i = pin._idx;
        if (pin._visible === false) {
          posAttr.array[i*3] = 0; posAttr.array[i*3+1] = 0; posAttr.array[i*3+2] = 0;
        } else {
          posAttr.array[i*3] = pin._basePos[0];
          posAttr.array[i*3+1] = pin._basePos[1];
          posAttr.array[i*3+2] = pin._basePos[2];
        }
      });
      posAttr.needsUpdate = true;
    };
    window.__globeApplyPinVis = applyPinVisibility;
    // 点テクスチャ（ソフトな円）
    const dotTex = (() => {
      const d = document.createElement('canvas'); d.width = d.height = 64;
      const dctx = d.getContext('2d');
      const grd = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0.0, 'rgba(255, 230, 150, 1)');
      grd.addColorStop(0.4, 'rgba(240, 190, 100, 0.9)');
      grd.addColorStop(1.0, 'rgba(240, 190, 100, 0)');
      dctx.fillStyle = grd;
      dctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(d);
    })();
    const pinsMat = new THREE.PointsMaterial({
      size: 0.22,
      map: dotTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const pinsPoints = new THREE.Points(pinsGeo, pinsMat);
    earth.add(pinsPoints);

    // 操作
    let isDown = false, lastX = 0, lastY = 0, velX = 0, velY = 0;
    const el = renderer.domElement;
    // 初期回転：日本・東アジア + 太平洋が見える角度
    earth.rotation.y = -Math.PI * 0.7;
    earth.rotation.x = 0.1;
    el.addEventListener('pointerdown', (e) => { isDown = true; lastX = e.clientX; lastY = e.clientY; velX = velY = 0; });
    el.addEventListener('pointermove', (e) => {
      if (!isDown) { onHover(e); return; }
      const dx = (e.clientX - lastX) * 0.007;
      const dy = (e.clientY - lastY) * 0.007;
      earth.rotation.y += dx;
      earth.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, earth.rotation.x + dy));
      velX = dx; velY = dy;
      lastX = e.clientX; lastY = e.clientY;
    });
    const endDrag = () => { isDown = false; };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointerleave', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.position.z = Math.max(2.5, Math.min(18, camera.position.z + e.deltaY * 0.004));
    }, { passive: false });
    // ボタンズーム
    ov.querySelectorAll('[data-globe-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.globeZoom === 'in' ? -1 : 1;
        camera.position.z = Math.max(2.5, Math.min(18, camera.position.z + dir * 1.2));
      });
    });

    // ============================================================
    // 🗺 メルカトル図法の2D世界地図
    // ============================================================
    const mmo = ov.querySelector('#magicMercatorOverlay');
    const mmoCanvas = ov.querySelector('#mmoCanvas');
    const mmoTip = ov.querySelector('#mmoTip');
    ov.querySelector('#mmoClose').addEventListener('click', () => mmo.classList.remove('show'));
    ov.querySelector('#magicGlobeMerc').addEventListener('click', () => {
      mmo.classList.add('show');
      drawMercator();
    });
    // フィルタ状態
    const mercFilter = { era: 'all', cont: 'all' };
    const classifyEra = (b) => {
      if (b == null) return null;
      if (b < 500) return 'ancient';
      if (b < 1500) return 'medieval';
      if (b < 1800) return 'early_modern';
      if (b < 1945) return 'modern';
      return 'contemporary';
    };
    const classifyContinent = (lat, lng) => {
      if (lat > 30 && lng > -15 && lng < 65) return 'europe';
      if (lat > -38 && lat < 37 && lng > -20 && lng < 55) return 'africa';
      if (lat < 15 && lat > -55 && lng > -85 && lng < -30) return 'samerica';
      if (lat > 12 && lng > -170 && lng < -50) return 'namerica';
      if (lat < -5 && lng > 110 && lng < 180) return 'oceania';
      return 'asia';
    };
    ov.querySelectorAll('[data-merc-era]').forEach(b => {
      b.addEventListener('click', () => {
        ov.querySelectorAll('[data-merc-era]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        mercFilter.era = b.dataset.mercEra;
        drawMercator();
      });
    });
    // 大陸バウンディングボックス（Mercator画面上のズームに使用）
    const CONT_BOUNDS = {
      asia:     { latMin: -10, latMax: 60,  lngMin: 55,   lngMax: 150 },
      europe:   { latMin: 34,  latMax: 72,  lngMin: -25,  lngMax: 55  },
      africa:   { latMin: -38, latMax: 37,  lngMin: -20,  lngMax: 52  },
      namerica: { latMin: 10,  latMax: 75,  lngMin: -170, lngMax: -55 },
      samerica: { latMin: -58, latMax: 15,  lngMin: -85,  lngMax: -33 },
      oceania:  { latMin: -47, latMax: 0,   lngMin: 110,  lngMax: 180 },
    };
    let mapView = null; // 現在のズーム領域
    ov.querySelectorAll('[data-merc-cont]').forEach(b => {
      b.addEventListener('click', () => {
        ov.querySelectorAll('[data-merc-cont]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        mercFilter.cont = b.dataset.mercCont;
        // 大陸が選ばれたら画面もズーム、「全」でリセット
        mapView = (mercFilter.cont !== 'all' && CONT_BOUNDS[mercFilter.cont])
          ? CONT_BOUNDS[mercFilter.cont] : null;
        drawMercator();
      });
    });
    // 与えられた country エントリが現在のフィルタに該当するか + 通過する人たちを返す
    function filterCountry(b, key) {
      if (!b.coord || !b.people.length) return null;
      const [lat, lng] = b.coord;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return null;
      if (lat < -85 || lat > 85 || lng < -180 || lng > 180) return null;
      if (mercFilter.cont !== 'all') {
        const cont = classifyContinent(lat, lng);
        if (cont !== mercFilter.cont) return null;
      }
      let peopleArr = b.people;
      if (mercFilter.era !== 'all') {
        peopleArr = b.people.filter(p => classifyEra(p.birth) === mercFilter.era);
        if (!peopleArr.length) return null;
      }
      return { lat, lng, people: peopleArr };
    }
    const mmoPeople = ov.querySelector('#mmoPeople');
    // 緯度→Mercator y (0-1)  投影
    const mercY = (lat) => {
      const rad = Math.max(-85, Math.min(85, lat)) * Math.PI / 180;
      return 0.5 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / (2 * Math.PI);
    };
    const mercX = (lng) => (lng + 180) / 360;
    // ズーム領域を考慮した画面座標変換
    function screenXY(lng, lat, W, H) {
      if (!mapView) {
        return { x: mercX(lng) * W, y: mercY(lat) * H };
      }
      const x0 = mercX(mapView.lngMin), x1 = mercX(mapView.lngMax);
      const y0 = mercY(mapView.latMax), y1 = mercY(mapView.latMin);
      const x = (mercX(lng) - x0) / (x1 - x0) * W;
      const y = (mercY(lat) - y0) / (y1 - y0) * H;
      return { x, y };
    }
    function drawMercator() {
      const W = mmoCanvas.clientWidth || 800;
      const H = mmoCanvas.clientHeight || 500;
      const dpr = window.devicePixelRatio || 1;
      mmoCanvas.width = W * dpr;
      mmoCanvas.height = H * dpr;
      const ctx = mmoCanvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 🌊 海のベース（明確な海色）
      const ocean = ctx.createLinearGradient(0, 0, 0, H);
      ocean.addColorStop(0, '#0a2340');   // 北極海 暗い
      ocean.addColorStop(0.2, '#14406b'); // 北の海
      ocean.addColorStop(0.5, '#1a5a8a'); // 温帯の海
      ocean.addColorStop(0.8, '#14406b'); // 南の海
      ocean.addColorStop(1, '#0a2340');   // 南極海
      ctx.fillStyle = ocean; ctx.fillRect(0, 0, W, H);
      // NASA テクスチャを Mercator 変換して描画（海/陸の本物データ）
      const tex = earthMat.map;
      if (tex && tex.image && tex.image.width) {
        const srcImg = tex.image;
        const srcW = srcImg.naturalWidth || srcImg.width;
        const srcH = srcImg.naturalHeight || srcImg.height;
        const BAND = 2;
        // ズーム範囲
        const yTop = mapView ? mercY(mapView.latMax) : mercY(85);
        const yBot = mapView ? mercY(mapView.latMin) : mercY(-85);
        const lngMin = mapView ? mapView.lngMin : -180;
        const lngMax = mapView ? mapView.lngMax : 180;
        const srcXStart = ((lngMin + 180) / 360) * srcW;
        const srcXWidth = ((lngMax - lngMin) / 360) * srcW;
        for (let y = 0; y < H; y += BAND) {
          const yn = y / H; // 0..1
          const globalYn = yTop + yn * (yBot - yTop);
          const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * globalYn))) * 180 / Math.PI;
          const srcY = Math.max(0, Math.min(srcH - 1, (90 - lat) / 180 * srcH));
          ctx.drawImage(srcImg, srcXStart, srcY, srcXWidth, 1, 0, y, W, BAND + 0.5);
        }
      }
      // 海の上に薄い青フィルターで色彩統一
      ctx.fillStyle = 'rgba(20,60,110,0.12)'; ctx.fillRect(0, 0, W, H);
      // 緯度経度グリッド
      ctx.strokeStyle = 'rgba(200,220,255,0.14)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      const gridStep = mapView ? 10 : 30;
      for (let lat = -80; lat <= 80; lat += gridStep) {
        const yp = screenXY(0, lat, W, H).y;
        if (yp < -5 || yp > H + 5) continue;
        ctx.beginPath(); ctx.moveTo(0, yp); ctx.lineTo(W, yp); ctx.stroke();
      }
      for (let lng = -180; lng <= 180; lng += gridStep) {
        const xp = screenXY(lng, 0, W, H).x;
        if (xp < -5 || xp > W + 5) continue;
        ctx.beginPath(); ctx.moveTo(xp, 0); ctx.lineTo(xp, H); ctx.stroke();
      }
      ctx.setLineDash([]);
      // 赤道・回帰線
      const drawLat = (lat, style, width) => {
        const yp = screenXY(0, lat, W, H).y;
        if (yp < 0 || yp > H) return;
        ctx.strokeStyle = style; ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(0, yp); ctx.lineTo(W, yp); ctx.stroke();
      };
      drawLat(0, 'rgba(255,200,120,0.25)', 1);
      drawLat(23.4, 'rgba(255,200,120,0.12)', 1);
      drawLat(-23.4, 'rgba(255,200,120,0.12)', 1);
      // 昼夜オーバーレイ: 弱めにして地図を見やすく
      const now = new Date();
      const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
      const sunLng = -((utcH - 12) * 15);
      const doy = Math.floor((now - new Date(now.getUTCFullYear(), 0, 0)) / 86400000);
      const sunLat = 23.4 * Math.sin(2 * Math.PI * (doy - 80) / 365.25);
      const nightGrad = ctx.createLinearGradient(0, 0, W, 0);
      for (let i = 0; i <= 48; i++) {
        const lng = -180 + (360 / 48) * i;
        let diff = Math.abs(((lng - sunLng + 540) % 360) - 180);
        const night = diff / 180;
        const a = night * 0.28; // 地図を見えやすく
        nightGrad.addColorStop(i / 48, `rgba(8, 14, 32, ${a})`);
      }
      ctx.fillStyle = nightGrad; ctx.fillRect(0, 0, W, H);
      // 夜側の都市光（明るい夜景風、薄く）
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(0,0,0,0)'; // noop
      ctx.globalCompositeOperation = 'source-over';
      // 太陽直下点マーカー（大きなグロー）
      const sxy = screenXY(sunLng, sunLat, W, H);
      const sx = sxy.x, sy = sxy.y;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 55);
      sg.addColorStop(0, 'rgba(255,240,170,0.75)');
      sg.addColorStop(0.4, 'rgba(255,200,120,0.25)');
      sg.addColorStop(1, 'rgba(255,180,100,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 55, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffec90';
      ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,140,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI*2); ctx.stroke();
      // フライト弧（先に描いてピンで隠す）
      ctx.strokeStyle = 'rgba(255,210,130,0.55)';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([4, 3]);
      FLIGHT_ROUTES.forEach(r => {
        const p1 = screenXY(r.from[1], r.from[0], W, H);
        const p2 = screenXY(r.to[1], r.to[0], W, H);
        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2 - Math.abs(p2.x - p1.x) * 0.13;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(midX, midY, p2.x, p2.y); ctx.stroke();
      });
      ctx.setLineDash([]);
      FLIGHT_ROUTES.forEach(r => {
        const p1 = screenXY(r.from[1], r.from[0], W, H);
        const p2 = screenXY(r.to[1], r.to[0], W, H);
        ctx.fillStyle = 'rgba(255,240,200,0.85)';
        ctx.beginPath(); ctx.arc(p1.x, p1.y, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(p2.x, p2.y, 2.5, 0, Math.PI*2); ctx.fill();
      });
      // 🗾 選択中の大陸をハイライト（全世界表示のときだけ枠を描く。ズーム中はいらない）
      if (mercFilter.cont && mercFilter.cont !== 'all' && !mapView) {
        const b = CONT_BOUNDS[mercFilter.cont];
        if (b) {
          const c1 = screenXY(b.lngMin, b.latMax, W, H);
          const c2 = screenXY(b.lngMax, b.latMin, W, H);
          ctx.save();
          ctx.fillStyle = 'rgba(255,220,120,0.12)';
          ctx.fillRect(c1.x, c1.y, c2.x - c1.x, c2.y - c1.y);
          ctx.strokeStyle = 'rgba(255,210,120,0.65)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(c1.x, c1.y, c2.x - c1.x, c2.y - c1.y);
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
      // 国ピン（フィルタ適用）
      const drawnPins = [];
      Object.keys(byCountry).forEach(k => {
        const b = byCountry[k];
        const f = filterCountry(b, k);
        if (!f) return;
        const xy = screenXY(f.lng, f.lat, W, H);
        const x = xy.x, y = xy.y;
        if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return; // ズーム範囲外スキップ
        const n = f.people.length;
        const rBase = 3 + Math.min(7, Math.sqrt(n) * 1.2);
        const rGlow = rBase * 3.8;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rGlow);
        g.addColorStop(0, 'rgba(255,230,150,0.95)');
        g.addColorStop(0.3, 'rgba(255,190,90,0.45)');
        g.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rGlow, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffe890';
        ctx.strokeStyle = 'rgba(140,60,20,0.95)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, rBase, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // 国名＋人数（ピンの右側）
        if (n >= 2) {
          ctx.font = `bold ${Math.min(13, 10 + Math.sqrt(n))}px "Shippori Mincho", serif`;
          ctx.fillStyle = '#fff6d0';
          ctx.strokeStyle = 'rgba(20,10,30,0.9)';
          ctx.lineWidth = 3;
          const lbl = `${k} ${n}`;
          ctx.strokeText(lbl, x + rBase + 4, y + 4);
          ctx.fillText(lbl, x + rBase + 4, y + 4);
        }
        drawnPins.push({ x, y, r: Math.max(rBase, 10), country: k, people: f.people });
      });
      // ピン配列をドロー後でアクセスできるよう保存
      mmoCanvas._pins = drawnPins;
      // 主要都市ラベル
      const CITIES = [
        { name: '東京',     lat: 35.68, lng: 139.69 },
        { name: 'ニューヨーク', lat: 40.71, lng: -74.01 },
        { name: 'ロンドン', lat: 51.51, lng: -0.13 },
        { name: 'パリ',     lat: 48.86, lng: 2.35 },
        { name: 'シドニー', lat: -33.87, lng: 151.21 },
        { name: '北京',     lat: 39.90, lng: 116.40 },
        { name: 'ドバイ',   lat: 25.20, lng: 55.27 },
        { name: 'カイロ',   lat: 30.04, lng: 31.23 },
        { name: 'リオ',     lat: -22.91, lng: -43.17 },
      ];
      ctx.font = '11px "Shippori Mincho", "Hiragino Mincho ProN", serif';
      CITIES.forEach(c => {
        const xy = screenXY(c.lng, c.lat, W, H);
        if (xy.x < 0 || xy.x > W || xy.y < 0 || xy.y > H) return;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2.5;
        ctx.strokeText(c.name, xy.x + 6, xy.y + 3);
        ctx.fillText(c.name, xy.x + 6, xy.y + 3);
        ctx.fillStyle = 'rgba(180,220,255,0.85)';
        ctx.beginPath(); ctx.arc(xy.x, xy.y, 1.5, 0, Math.PI*2); ctx.fill();
      });
      // 凡例
      ctx.font = '10px "Shippori Mincho", serif';
      const legY = H - 34;
      ctx.fillStyle = 'rgba(10,20,40,0.75)';
      ctx.fillRect(10, legY - 4, 230, 30);
      ctx.strokeStyle = 'rgba(180,220,255,0.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(10, legY - 4, 230, 30);
      ctx.fillStyle = '#ffe890';
      ctx.beginPath(); ctx.arc(22, legY + 4, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#d8e4f4'; ctx.fillText('偉人の国', 30, legY + 8);
      ctx.fillStyle = '#ffec90';
      ctx.beginPath(); ctx.arc(100, legY + 4, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#d8e4f4'; ctx.fillText('太陽直下点', 108, legY + 8);
      // 投影法ラベル
      ctx.fillStyle = 'rgba(180,200,230,0.55)';
      ctx.font = '10px "Shippori Mincho", serif';
      ctx.fillText('World Map · 偉人ゆかりの地と都市', W - 240, H - 12);
    }
    // ピンクリック判定 → 偉人リスト表示
    mmoCanvas.addEventListener('click', (e) => {
      const rect = mmoCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const pins = mmoCanvas._pins || [];
      let hit = null, hitD = 18;
      pins.forEach(p => {
        const d = Math.hypot(mx - p.x, my - p.y);
        if (d < Math.max(hitD, p.r + 6)) { hitD = d; hit = p; }
      });
      if (hit) {
        const items = hit.people.slice(0, 20).map(p => `
          <button class="mmo-person" data-pid="${p.id}">
            <span class="mmo-pname">${p.name}</span>
            <span class="mmo-pbirth">${p.birth != null ? p.birth + '年生' : ''}</span>
          </button>
        `).join('');
        mmoPeople.innerHTML = `
          <div class="mmo-ppl-head">
            <div class="mmo-ppl-title">${hit.country}<span class="mmo-ppl-count">${hit.people.length}人</span></div>
            <button class="mmo-ppl-close" aria-label="閉じる">×</button>
          </div>
          <div class="mmo-ppl-list">${items}</div>
          ${hit.people.length > 20 ? `<div class="mmo-ppl-more">+ ${hit.people.length - 20}人</div>` : ''}
        `;
        mmoPeople.classList.add('show');
        mmoPeople.querySelector('.mmo-ppl-close').addEventListener('click', () => mmoPeople.classList.remove('show'));
        mmoPeople.querySelectorAll('.mmo-person').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.pid;
            mmoPeople.classList.remove('show');
            mmo.classList.remove('show');
            ov.querySelector('.magic-deep-close')?.click();
            setTimeout(() => { if (typeof window.showPerson === 'function') window.showPerson(id); }, 260);
          });
        });
      } else {
        // ピン以外 → 大陸判定 + その大陸の偉人集約表示
        const rect2 = mmoCanvas.getBoundingClientRect();
        const W = rect2.width, H = rect2.height;
        // ズーム中は表示範囲から逆変換、そうでなければ全世界
        const yTop = mapView ? mercY(mapView.latMax) : mercY(85);
        const yBot = mapView ? mercY(mapView.latMin) : mercY(-85);
        const lngMin = mapView ? mapView.lngMin : -180;
        const lngMax = mapView ? mapView.lngMax : 180;
        const globalYn = yTop + (my / H) * (yBot - yTop);
        const clickLat = Math.atan(Math.sinh(Math.PI * (1 - 2 * globalYn))) * 180 / Math.PI;
        const clickLng = lngMin + (mx / W) * (lngMax - lngMin);
        const cont = classifyContinent(clickLat, clickLng);
        const chip = ov.querySelector(`[data-merc-cont="${cont}"]`);
        if (chip) {
          ov.querySelectorAll('[data-merc-cont]').forEach(x => x.classList.remove('active'));
          chip.classList.add('active');
          mercFilter.cont = cont;
          mapView = CONT_BOUNDS[cont] || null; // 大陸にズームイン
          drawMercator();
          const CONT_NAMES = { asia: 'アジア', europe: 'ヨーロッパ', africa: 'アフリカ', namerica: '北アメリカ', samerica: '南アメリカ', oceania: 'オセアニア' };
          const CONT_EMOJI = { asia: '🌏', europe: '🏰', africa: '🦁', namerica: '🗽', samerica: '🏞', oceania: '🦘' };
          const peopleInCont = [];
          const countriesInCont = [];
          Object.keys(byCountry).forEach(k => {
            const b = byCountry[k];
            const f = filterCountry(b, k);
            if (f && classifyContinent(f.lat, f.lng) === cont) {
              countriesInCont.push({ country: k, count: f.people.length });
              peopleInCont.push(...f.people.map(p => ({ ...p, country: k })));
            }
          });
          if (peopleInCont.length > 0) {
            const byCountryHTML = countriesInCont.map(c => `<span class="mmo-cc-chip">${c.country}·${c.count}</span>`).join('');
            const items = peopleInCont.slice(0, 40).map(p => `
              <button class="mmo-person" data-pid="${p.id}">
                <span class="mmo-pname">${p.name}</span>
                <span class="mmo-pbirth">${p.country} · ${p.birth != null ? p.birth + '年生' : ''}</span>
              </button>
            `).join('');
            mmoPeople.innerHTML = `
              <div class="mmo-ppl-head">
                <div class="mmo-ppl-title">${CONT_EMOJI[cont] || ''} ${CONT_NAMES[cont]}<span class="mmo-ppl-count">${peopleInCont.length}人 · ${countriesInCont.length}か国</span></div>
                <button class="mmo-ppl-close" aria-label="閉じる">×</button>
              </div>
              <div class="mmo-cc-wrap">${byCountryHTML}</div>
              <div class="mmo-ppl-list">${items}</div>
              ${peopleInCont.length > 40 ? `<div class="mmo-ppl-more">+ ${peopleInCont.length - 40}人</div>` : ''}
            `;
            mmoPeople.classList.add('show');
            mmoPeople.querySelector('.mmo-ppl-close').addEventListener('click', () => mmoPeople.classList.remove('show'));
            mmoPeople.querySelectorAll('.mmo-person').forEach(btn => {
              btn.addEventListener('click', () => {
                const id = btn.dataset.pid;
                mmoPeople.classList.remove('show');
                mmo.classList.remove('show');
                ov.querySelector('.magic-deep-close')?.click();
                setTimeout(() => { if (typeof window.showPerson === 'function') window.showPerson(id); }, 260);
              });
            });
          } else {
            mmoPeople.classList.remove('show');
          }
        } else {
          mmoPeople.classList.remove('show');
        }
      }
    });
    window.addEventListener('resize', () => { if (mmo.classList.contains('show')) drawMercator(); });
    // 時代フィルタ
    let globeActiveEra = 'all';
    const eraBirth = (b) => {
      if (b == null) return null;
      if (b < 500) return 'ancient';
      if (b < 1500) return 'medieval';
      if (b < 1800) return 'early_modern';
      if (b < 1900) return 'modern';
      return 'contemporary';
    };
    ov.querySelectorAll('.magic-globe-era').forEach(btn => {
      btn.addEventListener('click', () => {
        ov.querySelectorAll('.magic-globe-era').forEach(b => b.classList.toggle('active', b === btn));
        globeActiveEra = btn.dataset.era;
        // 可視性フラグを更新（pickPinで参照）
        pins.forEach(pin => {
          if (globeActiveEra === 'all') { pin._visible = true; return; }
          const ppl = pin.info?.people || [];
          pin._visible = ppl.some(p => eraBirth(p.birth) === globeActiveEra);
        });
        if (window.__globeApplyPinVis) window.__globeApplyPinVis();
      });
    });

    // ピンのクリック判定（Points用にスクリーン座標で距離比較）
    function pickPin(clientX, clientY) {
      const rect = el.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      let best = null, bestDist = 32; // 32px 以内
      const worldPos = new THREE.Vector3();
      pins.forEach(pin => {
        if (pin._visible === false) return; // 時代フィルタで非表示
        worldPos.copy(pin.pos).applyMatrix4(earth.matrixWorld);
        // カメラ後ろなら除外
        const cameraToPoint = worldPos.clone().sub(camera.position);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        if (cameraToPoint.dot(forward) < 0) return;
        const projected = worldPos.clone().project(camera);
        const px = (projected.x * 0.5 + 0.5) * rect.width;
        const py = (-projected.y * 0.5 + 0.5) * rect.height;
        const d = Math.hypot(px - sx, py - sy);
        if (d < bestDist) { bestDist = d; best = pin; }
      });
      return best;
    }
    function onHover(e) {
      const pin = pickPin(e.clientX, e.clientY);
      if (pin) {
        tip.textContent = `${pin.country}（${pin.info.people.length}名）`;
        tip.style.opacity = '1';
        const rect = wrap.getBoundingClientRect();
        tip.style.left = (e.clientX - rect.left + 12) + 'px';
        tip.style.top = (e.clientY - rect.top + 12) + 'px';
        // モバイル対応: 2秒後に自動で消す
        clearTimeout(tip._hideTO);
        tip._hideTO = setTimeout(() => { tip.style.opacity = '0'; }, 2200);
      } else {
        tip.style.opacity = '0';
      }
    }
    el.addEventListener('click', (e) => {
      const pin = pickPin(e.clientX, e.clientY);
      if (!pin) return;
      const { country, info: cInfo } = pin;
      // 💫 パルス衝撃波を発射
      spawnShockwave(pin.pos);
      info.innerHTML = `
        <button class="magic-globe-info-close" aria-label="閉じる">×</button>
        <h4>📍 ${country}（${cInfo.people.length}名）</h4>`
        + cInfo.people.map(p => `<button class="magic-globe-item" data-id="${p.id}">${p.name}</button>`).join('');
      info.classList.add('visible');
      info.querySelector('.magic-globe-info-close')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        info.classList.remove('visible');
      });
      info.querySelectorAll('.magic-globe-item').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          ov.classList.remove('open');
          setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(id); }, 220);
        });
      });
    });

    // リサイズ
    const onResize = () => {
      const ww = wrap.clientWidth || window.innerWidth;
      const hh = wrap.clientHeight || (window.innerHeight - 80);
      renderer.setSize(ww, hh);
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      setupNet();
    };
    window.addEventListener('resize', onResize);

    // ============ ネットワーク背景（ノード＋線）=============
    const netCanvas = ov.querySelector('#magicGlobeNet');
    let netCtx = null, netNodes = [], netW = 0, netH = 0;
    function setupNet() {
      if (!netCanvas) return;
      const dpr2 = Math.min(window.devicePixelRatio || 1, 2);
      netW = wrap.clientWidth || window.innerWidth;
      netH = wrap.clientHeight || (window.innerHeight - 80);
      netCanvas.width = netW * dpr2;
      netCanvas.height = netH * dpr2;
      netCanvas.style.width = netW + 'px';
      netCanvas.style.height = netH + 'px';
      netCtx = netCanvas.getContext('2d');
      netCtx.scale(dpr2, dpr2);
      // ノードを再生成（サイズに比例）
      const NODE_DENSITY = 14000; // ピクセル/ノード
      const count = Math.max(30, Math.min(120, Math.floor((netW * netH) / NODE_DENSITY)));
      netNodes = Array.from({ length: count }, () => ({
        x: Math.random() * netW,
        y: Math.random() * netH,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 1 + Math.random() * 1.6,
      }));
    }
    setupNet();
    const LINK_DIST = 130;  // ピクセル以内で線を引く
    function drawNet() {
      if (!netCtx) return;
      netCtx.clearRect(0, 0, netW, netH);
      // ノード更新
      netNodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > netW) n.vx *= -1;
        if (n.y < 0 || n.y > netH) n.vy *= -1;
      });
      // 線（近い同士を結ぶ）
      for (let i = 0; i < netNodes.length; i++) {
        for (let j = i + 1; j < netNodes.length; j++) {
          const a = netNodes[i], b = netNodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.38;
            netCtx.strokeStyle = `rgba(120, 190, 240, ${alpha})`;
            netCtx.lineWidth = 0.6;
            netCtx.beginPath();
            netCtx.moveTo(a.x, a.y);
            netCtx.lineTo(b.x, b.y);
            netCtx.stroke();
          }
        }
      }
      // ノード
      netNodes.forEach(n => {
        netCtx.fillStyle = 'rgba(140, 210, 255, 0.85)';
        netCtx.beginPath();
        netCtx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        netCtx.fill();
        // ほのかなグロー
        netCtx.fillStyle = 'rgba(140, 210, 255, 0.18)';
        netCtx.beginPath();
        netCtx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        netCtx.fill();
      });

      // 🌊 ネット↔ピン融合：可視ピンから最寄りノードへ破線
      const rect = el.getBoundingClientRect();
      const nRect = netCanvas.getBoundingClientRect();
      const offX = rect.left - nRect.left;
      const offY = rect.top - nRect.top;
      const worldPos = new THREE.Vector3();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const PIN_LINK_MAX = 220; // px
      netCtx.setLineDash([3, 5]);
      netCtx.lineWidth = 0.8;
      pins.forEach(pin => {
        worldPos.copy(pin.pos).applyMatrix4(earth.matrixWorld);
        const cp = worldPos.clone().sub(camera.position);
        if (cp.dot(forward) < 0) return; // 裏側は線を引かない
        // カメラに対する角度で「真正面に近いピン」ほど接続を選ぶ
        const projected = worldPos.clone().project(camera);
        const px = (projected.x * 0.5 + 0.5) * rect.width + offX;
        const py = (-projected.y * 0.5 + 0.5) * rect.height + offY;
        // 最寄り 2 ノードを探す
        let near = [];
        for (let k = 0; k < netNodes.length; k++) {
          const n = netNodes[k];
          const dd = Math.hypot(n.x - px, n.y - py);
          if (dd < PIN_LINK_MAX) near.push({ n, d: dd });
        }
        near.sort((a, b) => a.d - b.d);
        near.slice(0, 2).forEach(({ n, d }) => {
          const alpha = (1 - d / PIN_LINK_MAX) * 0.45;
          netCtx.strokeStyle = `rgba(180, 230, 255, ${alpha})`;
          netCtx.beginPath();
          netCtx.moveTo(px, py);
          netCtx.lineTo(n.x, n.y);
          netCtx.stroke();
        });
        // ピン位置にほのかな光点
        netCtx.setLineDash([]);
        const g = netCtx.createRadialGradient(px, py, 0, px, py, 8);
        g.addColorStop(0, 'rgba(255, 240, 180, 0.9)');
        g.addColorStop(1, 'rgba(255, 240, 180, 0)');
        netCtx.fillStyle = g;
        netCtx.beginPath();
        netCtx.arc(px, py, 8, 0, Math.PI * 2);
        netCtx.fill();
        netCtx.setLineDash([3, 5]);
      });
      netCtx.setLineDash([]);
    }

    // アニメーションループ
    let raf = 0;
    let pulseTime = 0;
    let lastSunUpdate = 0;
    function animate() {
      pulseTime += 0.05;
      // ネットワーク背景描画（ピン接続線もここで）
      drawNet();
      // 慣性
      if (!isDown) {
        earth.rotation.y += velX * 0.9;
        earth.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, earth.rotation.x + velY * 0.9));
        velX *= 0.93; velY *= 0.93;
        if (Math.abs(velX) < 0.0005) velX = 0;
        if (Math.abs(velY) < 0.0005) velY = 0;
        if (velX === 0 && velY === 0) earth.rotation.y += 0.0008; // 静かな自動回転
      }
      // Points の全体のopacityを緩やかに明滅（個別ドットの集合感を抑える）
      pinsMat.opacity = 0.72 + Math.sin(pulseTime * 0.5) * 0.08;
      // 雲のゆっくり自転（地球より少し速く）
      if (MAGIC._clouds) MAGIC._clouds.rotation.y += 0.0004;

      // 🌅 昼夜境界：太陽位置を 10 秒ごとに再計算 + 時刻HUD更新
      const nowMs = performance.now();
      if (nowMs - lastSunUpdate > 10000) {
        updateSunPosition();
        updateSunVisible();
        updateGlobeMoon();
        updateClockHUD();
        lastSunUpdate = nowMs;
      }
      // ✈️ フライト更新
      updateFlights();

      // 🛰 軌道衛星の更新（ISS は 90 分で 1 周 ≒ デフォルメして速め）
      satAngle += 0.012;
      const sx = SAT_RADIUS * Math.cos(satAngle);
      const sy = SAT_RADIUS * Math.sin(satAngle) * Math.sin(SAT_INCLINATION);
      const sz = SAT_RADIUS * Math.sin(satAngle) * Math.cos(SAT_INCLINATION);
      satGroup.position.set(sx, sy, sz);
      // 進行方向に機体を向ける
      const nextSx = SAT_RADIUS * Math.cos(satAngle + 0.01);
      const nextSy = SAT_RADIUS * Math.sin(satAngle + 0.01) * Math.sin(SAT_INCLINATION);
      const nextSz = SAT_RADIUS * Math.sin(satAngle + 0.01) * Math.cos(SAT_INCLINATION);
      satGroup.lookAt(nextSx, nextSy, nextSz);
      // 点滅
      satGlow.material.opacity = 0.5 + Math.abs(Math.sin(pulseTime * 2)) * 0.5;
      // 軌跡更新（末尾から古いものを捨てる FIFO）
      for (let i = SAT_TRAIL_LEN - 1; i > 0; i--) {
        satTrailPositions[i*3]   = satTrailPositions[(i-1)*3];
        satTrailPositions[i*3+1] = satTrailPositions[(i-1)*3+1];
        satTrailPositions[i*3+2] = satTrailPositions[(i-1)*3+2];
      }
      satTrailPositions[0] = sx;
      satTrailPositions[1] = sy;
      satTrailPositions[2] = sz;
      satTrailGeo.attributes.position.needsUpdate = true;
      satTrailGeo.setDrawRange(0, SAT_TRAIL_LEN);

      // 💫 衝撃波更新
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        const t = (nowMs - sw.start) / sw.life;
        if (t >= 1) {
          earth.remove(sw.mesh);
          sw.geo.dispose();
          sw.mat.dispose();
          shockwaves.splice(i, 1);
          continue;
        }
        const scale = 1 + t * 8; // 広がる（広げ過ぎると球面から剥がれて見えるので抑制）
        sw.mesh.scale.setScalar(scale);
        // イーズアウト＋ピーク（最初はハッキリ、徐々に薄く）
        const alpha = (1 - t * t) * 0.85;
        sw.mat.opacity = alpha;
      }

      // HUD 座標更新（地球の中心法線をスクリーン正面から逆算）
      if (pulseTime % 1 < 0.05) {
        const coord = ov.querySelector('#magicGlobeCoord');
        if (coord) {
          const lon = (-((earth.rotation.y * 180 / Math.PI) % 360) + 360) % 360 - 180;
          const lat = Math.max(-90, Math.min(90, -earth.rotation.x * 180 / Math.PI));
          coord.textContent = `LAT ${lat.toFixed(1).padStart(5, ' ')}° / LON ${lon.toFixed(1).padStart(6, ' ')}°`;
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    // オーバーレイ close時のクリーンアップ
    ov.querySelector('.magic-deep-close').addEventListener('click', () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      // 衝撃波・衛星の片付け
      shockwaves.forEach(sw => { sw.geo.dispose(); sw.mat.dispose(); });
      shockwaves.length = 0;
      satTrailGeo.dispose(); satTrailMat.dispose();
      procTex && procTex.dispose && procTex.dispose();
      earthGeo.dispose(); earthMat.dispose();
      renderer.dispose();
    }, { once: true });
  }

  // 旧2D SVGマップ (Three.js未対応時のfallback)
  async function openWorldMap2D() {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;
    // (既存の簡易SVGマップロジックはそのまま残す — 本実装は地球儀に置き換え済み)
    console.warn('[magic] Three.js not available, 2D fallback skipped');
  }

  // 地球儀用のテクスチャ生成（等距円筒投影、本物の地球カラー＋ドット類ゼロ）
  function makeEarthTexture() {
    const W = 2048, H = 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    // 海（赤道付近は明るい青、極付近は暗く氷色寄り）
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
    oceanGrad.addColorStop(0.0, '#294060');
    oceanGrad.addColorStop(0.18, '#336090');
    oceanGrad.addColorStop(0.35, '#4080b0');
    oceanGrad.addColorStop(0.5, '#4a90c5');
    oceanGrad.addColorStop(0.65, '#4080b0');
    oceanGrad.addColorStop(0.82, '#336090');
    oceanGrad.addColorStop(1.0, '#294060');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, W, H);
    // 非常に控えめな大きめのグラデ雲（ドットではなく広いぼかし）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const rx = Math.random() * W;
      const ry = Math.random() * H;
      const rr = 140 + Math.random() * 200;
      const cg = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      cg.addColorStop(0, 'rgba(120, 180, 220, 0.18)');
      cg.addColorStop(1, 'rgba(120, 180, 220, 0)');
      ctx.fillStyle = cg;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }
    ctx.restore();
    // 大陸ポリゴン（簡易・低解像度）
    // lon2x/lat2y: lon[-180,180] → x[0,W], lat[-90,90] → y[0,H]
    const lon2x = (lon) => ((lon + 180) / 360) * W;
    const lat2y = (lat) => ((90 - lat) / 180) * H;
    const LANDS = [
      // 北米本土
      [[-170, 68], [-130, 68], [-90, 55], [-75, 50], [-68, 42], [-80, 30], [-100, 25], [-120, 30], [-130, 45], [-155, 58], [-168, 65]],
      // 中米
      [[-105, 22], [-83, 16], [-78, 9], [-86, 11], [-95, 15]],
      // 南米
      [[-80, 10], [-60, 10], [-35, -5], [-35, -25], [-55, -40], [-72, -53], [-75, -40], [-80, -10]],
      // ヨーロッパ
      [[-10, 60], [10, 68], [30, 70], [45, 62], [40, 45], [28, 38], [12, 38], [-5, 36], [-10, 45]],
      // 英国
      [[-7, 59], [-1, 59], [2, 52], [-5, 50], [-10, 54]],
      // アイルランド
      [[-10, 55], [-6, 55], [-6, 51], [-10, 52]],
      // アフリカ
      [[-17, 36], [10, 37], [25, 32], [35, 30], [42, 12], [52, 12], [40, 0], [42, -15], [30, -35], [18, -34], [10, -15], [-10, 0], [-17, 15]],
      // アラビア半島
      [[35, 30], [55, 28], [55, 15], [45, 12]],
      // ロシア/シベリア
      [[30, 70], [60, 72], [100, 75], [150, 72], [175, 68], [170, 58], [130, 48], [100, 45], [80, 48], [60, 55], [45, 62]],
      // 中国/モンゴル
      [[75, 50], [120, 50], [135, 42], [125, 30], [105, 22], [88, 25], [75, 35]],
      // インド
      [[70, 35], [88, 27], [95, 22], [90, 10], [78, 8], [72, 18]],
      // 東南アジア
      [[95, 22], [108, 22], [110, 10], [100, 4], [97, 10]],
      // 日本
      [[130, 33], [135, 35], [141, 41], [145, 44], [140, 38], [136, 35], [131, 32]],
      // オーストラリア
      [[113, -22], [135, -12], [153, -25], [145, -39], [118, -35], [113, -25]],
      // グリーンランド
      [[-55, 82], [-22, 82], [-22, 70], [-45, 60], [-55, 68]],
    ];
    // 土地: 緑〜茶のグラデーション（ドット・ノイズは一切なし）
    LANDS.forEach((poly, idx) => {
      // ポリゴンのbbox
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      poly.forEach(([lon, lat]) => {
        const x = lon2x(lon), y = lat2y(lat);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      });
      // ポリゴンのおおよそ重心緯度で気候帯決定
      const avgLat = poly.reduce((s, [, lat]) => s + lat, 0) / poly.length;
      let baseColor;
      if (Math.abs(avgLat) > 60) {
        baseColor = { r: 230, g: 235, b: 235 }; // 北極・南極に近い（雪氷）
      } else if (Math.abs(avgLat) > 45) {
        baseColor = { r: 90, g: 125, b: 80 };   // 寒帯・亜寒帯（暗い緑）
      } else if (Math.abs(avgLat) > 25) {
        baseColor = { r: 145, g: 150, b: 100 }; // 温帯（黄緑〜オリーブ）
      } else if (Math.abs(avgLat) > 15) {
        baseColor = { r: 185, g: 160, b: 110 }; // 乾燥帯（砂漠）
      } else {
        baseColor = { r: 85, g: 130, b: 70 };   // 熱帯（濃い緑）
      }
      // 大陸ごとに僅かに色をずらす
      const jitter = ((idx * 37) % 30) - 15;
      const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
      g.addColorStop(0, `rgb(${baseColor.r + jitter}, ${baseColor.g + jitter / 2}, ${baseColor.b})`);
      g.addColorStop(1, `rgb(${baseColor.r - 10 + jitter}, ${baseColor.g - 15}, ${baseColor.b - 10})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      poly.forEach(([lon, lat], i) => {
        const x = lon2x(lon), y = lat2y(lat);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      // 縁（控えめな陸地の境界）
      ctx.strokeStyle = 'rgba(60, 50, 40, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
    const tex = new window.THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.wrapS = window.THREE.RepeatWrapping;
    return tex;
  }

  // ============================================================
  // G) 音楽サロン（作曲家ページに YouTube 埋込で代表曲を流す）
  // ============================================================
  function setupMusicSalon() {
    if (MAGIC._salonDone) return;
    MAGIC._salonDone = true;
    // 偉人ページ表示時にサロンボタンを挿入
    const injectBtn = () => {
      const personView = document.getElementById('view-person');
      if (!personView || !personView.classList.contains('active')) return;
      if (personView.querySelector('.magic-salon-btn')) return;
      // 偉人特定
      const name = personView.querySelector('.profile-name')?.textContent?.trim();
      if (!name || !MAGIC._peopleBundle) return;
      const person = MAGIC._peopleBundle.find(p => p.name === name);
      if (!person) return;
      // works から youtubeId を集める
      const tracks = (person.works || []).filter(w => w && w.youtubeId).slice(0, 8);
      if (tracks.length === 0) return;
      // ヘッダー近辺に挿入
      const after = personView.querySelector('.profile-header, .profile-cover-frame, .profile-names');
      if (!after || after.parentNode.querySelector('.magic-salon-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'magic-salon-btn';
      btn.innerHTML = `🎻 <span>${person.name}の音楽サロンに入る</span>`;
      btn.addEventListener('click', () => openMusicSalon(person, tracks));
      after.parentNode.insertBefore(btn, after.nextSibling);
    };
    const mo = new MutationObserver(() => injectBtn());
    mo.observe(document.body, { childList: true, subtree: true });
    // peopleBundle ロード後も
    loadPeopleBundle().then(() => setTimeout(injectBtn, 600));
  }
  function openMusicSalon(person, tracks) {
    const existing = document.getElementById('musicSalonOverlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = 'musicSalonOverlay';
    ov.className = 'magic-salon-overlay';
    ov.innerHTML = `
      <button class="magic-salon-close" aria-label="閉じる">×</button>
      <div class="magic-salon-title">🎻 ${person.name}の音楽サロン<small>THE SALON OF ${(person.nameEn || person.name || '').toUpperCase()}</small></div>
      <div class="magic-salon-frame">
        <iframe id="magicSalonFrame" src="https://www.youtube.com/embed/${tracks[0].youtubeId}?rel=0&autoplay=1&modestbranding=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>
      </div>
      <div class="magic-salon-list">
        ${tracks.map((t, i) => `<button class="magic-salon-track ${i === 0 ? 'active' : ''}" data-yid="${t.youtubeId}" data-ttl="${(t.title || '').replace(/"/g, '&quot;')}">${t.title || '名曲 ' + (i+1)}</button>`).join('')}
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const frame = ov.querySelector('#magicSalonFrame');
    ov.querySelectorAll('.magic-salon-track').forEach(b => {
      b.addEventListener('click', () => {
        ov.querySelectorAll('.magic-salon-track').forEach(x => x.classList.toggle('active', x === b));
        frame.src = `https://www.youtube.com/embed/${b.dataset.yid}?rel=0&autoplay=1&modestbranding=1`;
      });
    });
    ov.querySelector('.magic-salon-close').addEventListener('click', () => {
      ov.classList.remove('open');
      frame.src = 'about:blank'; // 再生停止
      setTimeout(() => ov.remove(), 400);
    });
  }

  // ============================================================
  // I) 偉人往復書簡（relation + quotesから会話形式で合成）
  // ============================================================
  function setupLetterExchange() {
    if (MAGIC._letterDone) return;
    MAGIC._letterDone = true;
    const injectBtns = () => {
      const personView = document.getElementById('view-person');
      if (!personView || !personView.classList.contains('active')) return;
      const bundle = MAGIC._peopleBundle;
      if (!bundle) return;
      const name = personView.querySelector('.profile-name')?.textContent?.trim();
      if (!name) return;
      const person = bundle.find(p => p.name === name);
      if (!person) return;
      // 既に挿入済みなら skip
      if (personView.querySelector('[data-magic-letter-container]')) return;
      // id が有効で、かつ bundle に存在する相手とだけ書簡が開ける
      const partners = (person.relations || [])
        .filter(r => r.id && bundle.find(x => x.id === r.id))
        .slice(0, 6);
      if (partners.length === 0) return;
      // 関係タブの中に配置（ヘッダー横の空きスペース問題を解消）
      const relationsTab = personView.querySelector('[data-ptab="relations"]');
      const container = document.createElement('div');
      container.dataset.magicLetterContainer = '1';
      container.className = 'magic-letter-container';
      container.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px;';
      partners.forEach(r => {
        const other = bundle.find(x => x.id === r.id);
        const btn = document.createElement('button');
        btn.className = 'magic-letter-btn';
        btn.innerHTML = `📜 ${other.name}との往復書簡`;
        btn.addEventListener('click', () => openLetterExchange(person, other, r));
        container.appendChild(btn);
      });
      if (relationsTab) {
        // 関係タブの先頭に挿入
        relationsTab.insertBefore(container, relationsTab.firstChild);
      } else {
        // 関係タブがなければヘッダー下にフォールバック
        const after = personView.querySelector('.profile-header, .profile-cover-frame');
        if (after) after.parentNode.insertBefore(container, after.nextSibling);
      }
    };
    const mo = new MutationObserver(() => injectBtns());
    mo.observe(document.body, { childList: true, subtree: true });
    loadPeopleBundle().then(() => setTimeout(injectBtns, 600));
  }

  function composeLetterBody(from, to, relationFromA, relationFromB) {
    // A から B への書簡本文を、relation note と quotes から合成
    const aName = from.name || '';
    const bName = to.name || '';
    const intro = `${bName} へ\n\n`;
    const rNote = (relationFromA && relationFromA.note) || '';
    const rKind = (relationFromA && relationFromA.relation) || '同志';
    const quotes = (from.quotes || []).filter(q => q && q.text).slice(0, 3);

    const bodyLines = [];
    if (rNote) {
      bodyLines.push(rNote);
    } else {
      bodyLines.push(`あなたのことを、私は${rKind}と呼ぶ。`);
    }
    if (quotes.length) {
      const q = quotes[Math.floor(Math.abs(from.id.length * (to.id.length + 1)) % quotes.length)];
      bodyLines.push('');
      bodyLines.push('最近、こんなことを考えている——');
      bodyLines.push(`「${q.text}」`);
    }
    // 返信形式なら時差を感じさせる一文
    if (relationFromB) {
      bodyLines.push('');
      bodyLines.push('この言葉の意味を、あなたはどう受け止めるだろうか。');
    }
    return intro + bodyLines.join('\n');
  }

  function openLetterExchange(a, b, relation) {
    const existing = document.getElementById('magicLetterOverlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = 'magicLetterOverlay';
    ov.className = 'magic-letter-overlay';

    // B から A への関係があれば使う（相互関係）
    const relBtoA = (b.relations || []).find(r => r.id === a.id) || null;

    const letters = [];
    // 手紙1: A → B
    letters.push({
      from: a, to: b, dir: 'left',
      body: composeLetterBody(a, b, relation, relBtoA),
      sign: a.nameEn || a.name,
      seal: (a.name || '').charAt(0),
    });
    // 手紙2: B → A （相互関係から、なければ汎用返信）
    const bQuotes = (b.quotes || []).filter(q => q && q.text).slice(0, 2);
    const bBody = `${a.name} へ\n\n` +
      (relBtoA?.note || `あなたが私を${relBtoA?.relation || 'この世界で隣を歩く人'}と呼ぶなら、私もまた。`) +
      (bQuotes[0] ? `\n\n「${bQuotes[0].text}」\n\nこれが、私の返答です。` : '');
    letters.push({
      from: b, to: a, dir: 'right',
      body: bBody,
      sign: b.nameEn || b.name,
      seal: (b.name || '').charAt(0),
    });
    // 手紙3: A → B の再返答（名言2本目あれば）
    const aQuotes2 = (a.quotes || []).filter(q => q && q.text)[1];
    if (aQuotes2) {
      letters.push({
        from: a, to: b, dir: 'left',
        body: `${b.name} へ\n\nあなたの言葉を、私は深く受け取りました。\n\n——\n\n「${aQuotes2.text}」\n\nまた便りを。`,
        sign: a.nameEn || a.name,
        seal: (a.name || '').charAt(0),
      });
    }

    const lettersHtml = letters.map((l, i) => {
      const av = l.from.imageUrl
        ? `<div class="magic-letter-avatar" style="background-image:url('${l.from.imageUrl}')"></div>`
        : `<div class="magic-letter-avatar no-img">${(l.from.name || '?').charAt(0)}</div>`;
      return `
        ${i > 0 ? '<div style="position:relative;height:18px"><div class="magic-letter-bullet"></div></div>' : ''}
        <article class="magic-letter-paper from-${l.dir === 'left' ? 'left' : 'right'}" data-idx="${i}">
          <div class="magic-letter-head">
            ${av}
            <div class="magic-letter-from">
              <div class="magic-letter-from-name">${l.from.name || ''}</div>
              <div class="magic-letter-from-to">${l.to.name || ''} へ</div>
            </div>
            <div class="magic-letter-seal">${l.seal}</div>
          </div>
          <div class="magic-letter-body">${l.body}</div>
          <div class="magic-letter-sign">— ${l.sign}</div>
        </article>
      `;
    }).join('');

    ov.innerHTML = `
      <button class="magic-letter-close" aria-label="閉じる">×</button>
      <div class="magic-letter-title">📜 ${a.name} ⇄ ${b.name}</div>
      <div class="magic-letter-sub">往復書簡（歴史的関係から再構成）</div>
      <div class="magic-letter-list">${lettersHtml}</div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    // 順に fade in
    const papers = ov.querySelectorAll('.magic-letter-paper');
    papers.forEach((p, i) => {
      setTimeout(() => {
        p.classList.add('visible');
        if (MAGIC.playPaperSwoosh) MAGIC.playPaperSwoosh();
      }, 400 + i * 850);
    });

    ov.querySelector('.magic-letter-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 400);
    });
  }

  // ============================================================
  // J) ルーティン・ライブ（今の時刻の活動をヘッダーに表示）
  // ============================================================
  function setupRoutineLive() {
    if (MAGIC._routineLiveDone) return;
    MAGIC._routineLiveDone = true;

    const CAT_ICON = {
      sleep: '🌙',
      meal: '🍴',
      work: '📖',
      exercise: '🚶',
      leisure: '🕯',
      social: '💬',
      prayer: '🕊',
      art: '🎨',
      study: '📚',
      relax: '☕',
    };

    const inject = () => {
      const personView = document.getElementById('view-person');
      if (!personView || !personView.classList.contains('active')) return;
      if (personView.querySelector('.magic-routine-live')) return;
      const bundle = MAGIC._peopleBundle;
      if (!bundle) return;
      const name = personView.querySelector('.profile-name')?.textContent?.trim();
      if (!name) return;
      const person = bundle.find(p => p.name === name);
      if (!person || !person.routine || !person.routine.length) return;

      // 現在時刻
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // 時間帯から活動を検索（start<=hour<end、24跨ぎ対応）
      const current = person.routine.find(r => {
        if (r.start <= r.end) return hour >= r.start && hour < r.end;
        return hour >= r.start || hour < r.end; // 深夜跨ぎ
      }) || person.routine[0];
      const icon = CAT_ICON[current.cat] || '◆';

      // 挿入位置: profile-stampsの前、profile-headerの後
      const anchor = personView.querySelector('.profile-stamps, .life-digest, .traits-card');
      if (!anchor) return;

      const div = document.createElement('div');
      div.className = 'magic-routine-live';
      div.innerHTML = `
        <div class="magic-routine-live-icon">${icon}</div>
        <div class="magic-routine-live-body">
          <div class="magic-routine-live-label">今、${person.name}は</div>
          <div class="magic-routine-live-activity">${current.activity || '過ごしている'}</div>
        </div>
        <div class="magic-routine-live-clock">${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}</div>
      `;
      anchor.parentNode.insertBefore(div, anchor);
    };

    const mo = new MutationObserver(() => inject());
    mo.observe(document.body, { childList: true, subtree: true });
    loadPeopleBundle().then(() => setTimeout(inject, 600));
    // 1分ごとに更新
    setInterval(() => {
      const el = document.querySelector('.magic-routine-live');
      if (el) el.remove();
      inject();
    }, 60 * 1000);
  }

  // ============================================================
  // H) 影響の波紋（同心円可視化）
  // ============================================================
  function setupInfluenceRipple() {
    if (MAGIC._rippleDone) return;
    MAGIC._rippleDone = true;
    const injectBtn = () => {
      const personView = document.getElementById('view-person');
      if (!personView || !personView.classList.contains('active')) return;
      if (personView.querySelector('.magic-ripple-btn')) return;
      const name = personView.querySelector('.profile-name')?.textContent?.trim();
      if (!name || !MAGIC._peopleBundle) return;
      const person = MAGIC._peopleBundle.find(p => p.name === name);
      if (!person) return;
      const rels = (person.relations || []).filter(r => r.id);
      if (rels.length === 0) return;
      // ヘッダー直下（アバター・名前の下、タブの上）に配置
      const anchor = personView.querySelector('.profile-tabs-wrap')
                   || personView.querySelector('.profile-header, .profile-cover-frame');
      if (!anchor || anchor.parentNode.querySelector('.magic-ripple-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'magic-ripple-btn';
      btn.innerHTML = `🪞 ${person.name}の影響の波紋`;
      btn.addEventListener('click', () => openRipple(person));
      anchor.parentNode.insertBefore(btn, anchor);
    };
    const mo = new MutationObserver(() => injectBtn());
    mo.observe(document.body, { childList: true, subtree: true });
    loadPeopleBundle().then(() => setTimeout(injectBtn, 600));
  }
  async function openRipple(person) {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    const BLOCK_KW = ['宿敵','敵','ライバル','対立','裏切','論敵','抗争','競争','暗殺','刺客','暗殺者','抗命','反発','確執','不仲','宗教的対立','批判者','批判'];
    const MENTOR_KW = ['師','弟子','継承','後継','先達','憧れ','崇拝','敬愛','発掘','育て'];
    const kindOf = (r) => {
      const t = (r.relation||'') + (r.note||'');
      if (BLOCK_KW.some(k => t.includes(k))) return 'rival';
      if (MENTOR_KW.some(k => t.includes(k))) return 'mentor';
      return 'peer';
    };
    const getById = (id) => people.find(p => p.id === id);
    // Ring 1: 直接の関係
    const ring1 = (person.relations || []).filter(r => r.id).map(r => ({ person: getById(r.id), kind: kindOf(r) })).filter(x => x.person);
    // Ring 2: Ring1の人たちの関係（selfとring1に含まれない）
    const ring1Ids = new Set([person.id, ...ring1.map(x => x.person.id)]);
    const ring2Map = new Map();
    ring1.forEach(x => {
      (x.person.relations || []).filter(r => r.id && !ring1Ids.has(r.id)).forEach(r => {
        const pp = getById(r.id);
        if (pp && !ring2Map.has(pp.id)) ring2Map.set(pp.id, { person: pp, kind: kindOf(r), via: x.person.name });
      });
    });
    const ring2 = [...ring2Map.values()].slice(0, 16);

    const existing = document.getElementById('magicRippleOverlay');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = 'magicRippleOverlay';
    ov.className = 'magic-ripple-overlay';

    const VW = Math.min(window.innerWidth, 900);
    const VH = Math.min(window.innerHeight, 900);
    const CX = VW / 2, CY = VH / 2;
    const R1 = Math.min(VW, VH) * 0.22;
    const R2 = Math.min(VW, VH) * 0.38;

    const angle = (i, n) => -Math.PI / 2 + (i / n) * Math.PI * 2;

    const linesSvg = ring1.map((x, i) => {
      const a = angle(i, ring1.length);
      const px = CX + Math.cos(a) * R1;
      const py = CY + Math.sin(a) * R1;
      return `<line class="magic-ripple-line-${x.kind}" x1="${CX}" y1="${CY}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}"></line>`;
    }).join('');

    const nodeWithFace = (x, r) => {
      const img = x.person.imageUrl;
      const shortName = x.person.name.split(/[・\s]/)[0];
      if (img) {
        return `
          <circle r="${r}" class="magic-ripple-node-ring"></circle>
          <clipPath id="ripclip-${x.person.id}"><circle r="${r - 2}"/></clipPath>
          <image href="${img}" x="-${r-2}" y="-${r-2}" width="${(r-2)*2}" height="${(r-2)*2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#ripclip-${x.person.id})"/>
          <text y="${r + 14}" class="magic-ripple-name">${shortName}</text>
        `;
      }
      // 画像が無い場合：円内にイニシャルだけ、名前は下に1回だけ表示
      const initial = shortName.charAt(0);
      return `
        <circle r="${r}" class="magic-ripple-node-circle"></circle>
        <text y="5" class="magic-ripple-initial">${initial}</text>
        <text y="${r + 14}" class="magic-ripple-name">${shortName}</text>
      `;
    };
    const ring2Svg = ring2.map((x, i) => {
      const a = angle(i, ring2.length);
      const px = CX + Math.cos(a) * R2;
      const py = CY + Math.sin(a) * R2;
      return `<g class="magic-ripple-node" data-id="${x.person.id}" transform="translate(${px.toFixed(1)}, ${py.toFixed(1)})">
        ${nodeWithFace(x, 22)}
      </g>`;
    }).join('');

    const ring1Svg = ring1.map((x, i) => {
      const a = angle(i, ring1.length);
      const px = CX + Math.cos(a) * R1;
      const py = CY + Math.sin(a) * R1;
      return `<g class="magic-ripple-node" data-id="${x.person.id}" transform="translate(${px.toFixed(1)}, ${py.toFixed(1)})">
        ${nodeWithFace(x, 30)}
      </g>`;
    }).join('');

    // 推し状態を取得（app.jsのgetOshi/setOshiはグローバル関数）
    const getOshiFn = (typeof window.getOshi === 'function') ? window.getOshi : (typeof getOshi === 'function' ? getOshi : null);
    const setOshiFn = (typeof window.setOshi === 'function') ? window.setOshi : (typeof setOshi === 'function' ? setOshi : null);
    const isOshi = getOshiFn ? getOshiFn() === person.id : false;
    ov.innerHTML = `
      <div class="magic-ripple-header">
        <div class="magic-ripple-title">🪞 ${person.name}の影響の波紋</div>
        <button class="magic-ripple-oshi ${isOshi ? 'active' : ''}" data-ripple-oshi="${person.id}">
          ${isOshi ? '♥ 推し中' : '♡ 推しにする'}
        </button>
      </div>
      <button class="magic-ripple-close" aria-label="閉じる">×</button>
      <svg class="magic-ripple-svg" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet">
        <circle class="magic-ripple-ring" cx="${CX}" cy="${CY}" r="${R1}"></circle>
        <circle class="magic-ripple-ring" cx="${CX}" cy="${CY}" r="${R2}"></circle>
        ${linesSvg}
        ${ring2Svg}
        ${ring1Svg}
        <g transform="translate(${CX}, ${CY})">
          <circle class="magic-ripple-center" r="36"></circle>
          ${person.imageUrl ? `
            <clipPath id="ripclip-center"><circle r="34"/></clipPath>
            <image href="${person.imageUrl}" x="-34" y="-34" width="68" height="68" preserveAspectRatio="xMidYMid slice" clip-path="url(#ripclip-center)"/>
          ` : `
            <text y="5" style="fill:#5c1f2a; font-family:'Shippori Mincho',serif; font-size:13px; font-weight:800; text-anchor:middle">${person.name.charAt(0)}</text>
          `}
          <text y="${person.imageUrl ? 64 : 58}" style="fill:#ead296; font-family:'Shippori Mincho',serif; font-size:12px; font-weight:700; text-anchor:middle">${person.name.split(/[・\s]/)[0]}</text>
        </g>
      </svg>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.magic-ripple-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 350);
    });
    // 推しトグル
    const oshiBtn = ov.querySelector('.magic-ripple-oshi');
    if (oshiBtn && setOshiFn) {
      oshiBtn.addEventListener('click', () => {
        const isCurrentlyOshi = getOshiFn && getOshiFn() === person.id;
        if (isCurrentlyOshi) {
          setOshiFn(null);
          oshiBtn.classList.remove('active');
          oshiBtn.textContent = '♡ 推しにする';
        } else {
          setOshiFn(person.id);
          oshiBtn.classList.add('active');
          oshiBtn.textContent = '♥ 推し中';
        }
      });
    } else if (oshiBtn) {
      oshiBtn.style.display = 'none';
    }
    ov.querySelectorAll('.magic-ripple-node').forEach(g => {
      g.addEventListener('click', () => {
        const id = g.dataset.id;
        ov.classList.remove('open');
        setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(id); }, 300);
      });
    });
  }

  // ============================================================
  // 旧 openWorldMap は openWorldMap2D として保持済み（上で地球儀に差し替え）
  // ============================================================
  async function openWorldMap_unused() {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;

    // 国→緯度経度（代表）マップ
    const COUNTRY_COORDS = {
      '日本': [138, 36], '古代ギリシャ': [23, 39], 'ギリシャ': [23, 39],
      'イタリア': [12, 43], 'フランス': [2, 47], 'ドイツ': [10, 51],
      'オーストリア': [14, 48], 'イギリス': [-2, 54], '英国': [-2, 54],
      'スペイン': [-4, 40], 'オランダ': [5, 52], 'スイス': [8, 47],
      'ロシア': [37, 56], 'アメリカ': [-95, 38], 'アメリカ合衆国': [-95, 38],
      'ポーランド': [19, 52], 'チェコ': [15, 50], 'ハンガリー': [19, 47],
      'ノルウェー': [10, 60], 'フィンランド': [26, 64], 'デンマーク': [10, 56],
      'スウェーデン': [18, 60], '中国': [104, 36], 'インド': [78, 22],
      'エジプト': [30, 26], '古代ローマ': [12, 42], 'ローマ': [12, 42],
      'ベルギー': [4, 50], 'ポルトガル': [-8, 40], 'ブラジル': [-55, -10],
      'アルゼンチン': [-65, -34], '古代イスラエル': [34, 31], 'イスラエル': [34, 31],
      'アイルランド': [-8, 53], 'スコットランド': [-4, 56],
      '古代中国': [104, 36], 'オランダ（アメリカ）': [-95, 38], 'アメリカ（オランダ出身）': [-95, 38],
    };

    // 国ごとに集約
    const byCountry = {};
    people.forEach(p => {
      const c = (p.country || '').trim();
      if (!c) return;
      const coord = COUNTRY_COORDS[c];
      if (!coord) return;
      (byCountry[c] = byCountry[c] || { coord, people: [] }).people.push(p);
    });

    // 簡易世界地図 SVG（Mercator approx, Natural Earth low-res outlines）
    // マップ座標系: lon [-180,180] → x [0, 1000], lat [85, -85] → y [0, 500]
    const lon2x = (lon) => (lon + 180) * (1000 / 360);
    const lat2y = (lat) => (85 - lat) * (500 / 170);

    // 超シンプルな大陸形状（ボックス近似）— 雰囲気重視
    const continents = [
      // [x, y, w, h, name]
      { name: 'Eurasia', d: 'M 490 90 L 870 90 L 920 170 L 880 260 L 790 270 L 740 200 L 620 200 L 540 230 L 490 200 Z' },
      { name: 'Europe-west', d: 'M 470 120 L 540 130 L 540 190 L 490 200 L 470 180 Z' },
      { name: 'Africa', d: 'M 510 250 L 610 250 L 600 380 L 540 420 L 510 380 Z' },
      { name: 'India', d: 'M 700 230 L 760 230 L 760 300 L 720 320 L 700 280 Z' },
      { name: 'SEA', d: 'M 770 270 L 850 270 L 860 340 L 820 360 L 770 340 Z' },
      { name: 'NorthAm', d: 'M 150 80 L 300 70 L 330 180 L 270 260 L 180 250 L 130 180 Z' },
      { name: 'SouthAm', d: 'M 270 280 L 340 290 L 340 440 L 290 470 L 240 420 L 250 340 Z' },
      { name: 'Australia', d: 'M 830 380 L 920 380 L 920 440 L 830 440 Z' },
      { name: 'UK', d: 'M 470 115 L 490 115 L 490 145 L 470 145 Z' },
      { name: 'Japan', d: 'M 870 170 L 890 170 L 890 210 L 870 210 Z' },
    ];

    const pinsSvg = Object.entries(byCountry).map(([country, info]) => {
      const [lon, lat] = info.coord;
      const x = lon2x(lon), y = lat2y(lat);
      const r = Math.min(16, 4 + Math.sqrt(info.people.length) * 2);
      return `<g class="magic-map-pin" data-country="${country}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"></circle>
        <text class="magic-map-pin-count" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}">${info.people.length}</text>
      </g>`;
    }).join('');

    const landSvg = continents.map(c => `<path class="magic-map-land" d="${c.d}"></path>`).join('');

    const ov = openDeepOverlay('🌍 世界マップ', '歴史が生まれた土地を地図で。',
      `<div class="magic-map-wrap">
         <svg class="magic-map-svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
           ${landSvg}
           ${pinsSvg}
         </svg>
         <div class="magic-map-legend">● のサイズ = その国の偉人数</div>
         <div class="magic-map-country-list" id="magicMapCountryList"></div>
       </div>`);
    const list = ov.querySelector('#magicMapCountryList');
    ov.querySelectorAll('.magic-map-pin').forEach(g => {
      g.addEventListener('click', () => {
        const country = g.dataset.country;
        const info = byCountry[country];
        list.innerHTML = `<h4>📍 ${country}（${info.people.length}名）</h4>`
          + info.people.map(p => `<button class="magic-map-country-item" data-id="${p.id}">${p.name}</button>`).join('');
        list.classList.add('visible');
        list.querySelectorAll('.magic-map-country-item').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.id;
            ov.classList.remove('open');
            setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(id); }, 220);
          });
        });
      });
    });
  }

  // ============================================================
  // E) 都市群像マップ（同じ街で同時期に暮らした人々）
  // ============================================================
  // 主要都市: 名前, 関連キーワード（人物のsummary/events/country/routine に含まれていれば該当）
  const CITIES = [
    { name: 'ウィーン',       kw: ['ウィーン', 'オーストリア', 'ハプスブルク'] },
    { name: 'パリ',           kw: ['パリ', 'ベルサイユ', 'モンマルトル', 'ノートルダム'] },
    { name: 'ロンドン',       kw: ['ロンドン', 'テムズ', 'イングランド', 'イギリス'] },
    { name: 'ベルリン',       kw: ['ベルリン', 'プロイセン', 'ポツダム'] },
    { name: 'ローマ',         kw: ['ローマ', 'ヴァチカン', 'バチカン'] },
    { name: 'フィレンツェ',   kw: ['フィレンツェ', 'メディチ'] },
    { name: 'ヴェネツィア',   kw: ['ヴェネツィア', 'ベネチア'] },
    { name: 'アムステルダム', kw: ['アムステルダム', 'ライデン', 'オランダ'] },
    { name: 'サンクトペテルブルク', kw: ['サンクトペテルブルク', 'ペテルブルク', 'レニングラード'] },
    { name: 'モスクワ',       kw: ['モスクワ', 'クレムリン'] },
    { name: 'ニューヨーク',   kw: ['ニューヨーク', 'マンハッタン', 'ブルックリン'] },
    { name: 'ワイマル',       kw: ['ヴァイマル', 'ワイマール', 'ワイマル'] },
    { name: 'プラハ',         kw: ['プラハ', 'ボヘミア'] },
    { name: 'ライプツィヒ',   kw: ['ライプツィヒ'] },
    { name: 'ザルツブルク',   kw: ['ザルツブルク'] },
    { name: 'ボン',           kw: ['ボン', 'ライン川'] },
    { name: 'ジュネーブ',     kw: ['ジュネーブ', 'ジュネーヴ'] },
    { name: 'アテネ',         kw: ['アテネ', '古代ギリシャ', 'アカデメイア', 'リュケイオン'] },
    { name: '京都',           kw: ['京都', '平安京'] },
    { name: '江戸/東京',      kw: ['江戸', '東京', '上野', '浅草'] },
    { name: '盛岡・岩手',     kw: ['盛岡', '岩手', '花巻'] },
    { name: '松山・伊予',     kw: ['松山', '伊予', '道後'] },
    { name: '薩摩・鹿児島',   kw: ['薩摩', '鹿児島'] },
    { name: '長崎',           kw: ['長崎', '出島'] },
  ];

  function peopleInCity(all, city) {
    const matched = all.map(p => {
      const blob = [p.name, p.nameEn, p.country, p.summary, p.lifeDigest || '',
        ...(p.events || []).map(e => (e.title || '') + (e.detail || '')),
        ...(p.places || []).map(pl => (pl.name || '') + (pl.location || '')),
      ].join(' ');
      const hits = city.kw.filter(k => blob.includes(k)).length;
      return hits > 0 ? { person: p, hits } : null;
    }).filter(Boolean);
    // sort by birth year
    matched.sort((a, b) => (a.person.birth || 0) - (b.person.birth || 0));
    return matched.map(x => x.person);
  }

  async function openCityGathering() {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;

    // 各都市の人数を事前計算
    const cityCounts = CITIES.map(c => ({ city: c, count: peopleInCity(people, c).length }))
      .filter(x => x.count >= 2)
      .sort((a, b) => b.count - a.count);

    const optHtml = cityCounts.map(({ city, count }, i) =>
      `<option value="${city.name}" ${i === 0 ? 'selected' : ''}>${city.name}（${count}名）</option>`
    ).join('');

    const ov = openDeepOverlay('🗺 都市群像', '同じ街で同じ時代を生きた人々。',
      `<div class="magic-city-wrap">
         <div class="magic-city-head">
           <select class="magic-city-select" id="magicCitySelect">${optHtml}</select>
           <span class="magic-city-era-label" id="magicCityEraLabel">全時代</span>
           <div class="magic-city-era-range">
             <input type="range" id="magicCityEraRange" min="0" max="100" value="100">
           </div>
         </div>
         <div class="magic-city-headline" id="magicCityHeadline"></div>
         <div class="magic-city-list" id="magicCityList"></div>
       </div>`);
    const select = ov.querySelector('#magicCitySelect');
    const range = ov.querySelector('#magicCityEraRange');
    const eraLabel = ov.querySelector('#magicCityEraLabel');
    const headline = ov.querySelector('#magicCityHeadline');
    const list = ov.querySelector('#magicCityList');

    function render() {
      const cityName = select.value;
      const cityDef = CITIES.find(c => c.name === cityName);
      if (!cityDef) return;
      let peopleHere = peopleInCity(people, cityDef);
      // era filter: range 0-100 → minYear..maxYear
      const years = peopleHere.filter(p => p.birth != null).map(p => p.birth);
      const minY = years.length ? Math.min(...years) : -500;
      const maxY = years.length ? Math.max(...years) : 2020;
      const pct = parseInt(range.value, 10) / 100;
      const eraValue = pct === 1 ? null : Math.round(minY + (maxY - minY) * pct);
      if (eraValue != null) {
        // 指定年±40年に生きていた人（生年-没年の間 or 生年±40）
        peopleHere = peopleHere.filter(p => {
          if (p.birth == null) return false;
          if (p.death != null) return p.birth - 20 <= eraValue && eraValue <= p.death + 5;
          return Math.abs(p.birth - eraValue) <= 40;
        });
        eraLabel.textContent = `${eraValue < 0 ? '紀元前' + Math.abs(eraValue) : eraValue}年±`;
        headline.innerHTML = `<strong>${cityName}</strong> ／ ${eraValue < 0 ? '紀元前' + Math.abs(eraValue) : eraValue}年ごろ<small>この街で、この時代を生きた人</small>`;
      } else {
        eraLabel.textContent = '全時代';
        headline.innerHTML = `<strong>${cityName}</strong><small>この街にゆかりのあった偉人たち</small>`;
      }

      if (peopleHere.length === 0) {
        list.innerHTML = '<div class="magic-city-empty">この街・この時代には、登録された偉人はいません。</div>';
        return;
      }
      list.innerHTML = peopleHere.map(p => {
        const av = p.imageUrl
          ? `<div class="magic-city-av" style="background-image:url('${p.imageUrl}')"></div>`
          : `<div class="magic-city-av no-img">${(p.name||'?').charAt(0)}</div>`;
        const years = typeof fmtYearRange === 'function'
          ? fmtYearRange(p.birth, p.death)
          : `${p.birth || ''}–${p.death || ''}`;
        return `
          <button class="magic-city-card" data-id="${p.id}">
            ${av}
            <div class="magic-city-info">
              <div class="magic-city-name">${p.name || ''}</div>
              <div class="magic-city-meta">${years} ／ ${p.field || ''}</div>
            </div>
          </button>
        `;
      }).join('');
      list.querySelectorAll('.magic-city-card').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          ov.classList.remove('open');
          setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(id); }, 220);
        });
      });
    }
    select.addEventListener('change', render);
    range.addEventListener('input', render);
    render();
  }

  // ============================================================
  // F) 365日ドリフトカレンダー
  // ============================================================
  // ============================================================
  // 🌌 COSMOS — ノイズ → ビッグバン → 太陽系
  // ============================================================
  // ============================================================
  // 🎓 偉人クイズ（教材モード）
  // 4種類の問題タイプを混ぜて出題、スコアをローカル保存
  // ============================================================
  async function openIjinQuiz() {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;
    const pool = people.filter(p => p.name && p.summary && p.country && p.birth != null);
    if (pool.length < 10) return;

    // スコア管理
    const statsKey = 'ijinQuizStats';
    let stats = JSON.parse(localStorage.getItem(statsKey) || '{"total":0,"correct":0,"streak":0,"best":0}');
    const saveStats = () => localStorage.setItem(statsKey, JSON.stringify(stats));

    const ov = document.createElement('div');
    ov.className = 'ijin-quiz-overlay';
    ov.innerHTML = `
      <button class="iq-close" aria-label="閉じる">×</button>
      <div class="iq-frame">
        <div class="iq-head">
          <div class="iq-title">🎓 偉人クイズ</div>
          <div class="iq-score">
            <span class="iq-s">正解 <b id="iqCorrect">${stats.correct}</b>/<b id="iqTotal">${stats.total}</b></span>
            <span class="iq-s">🔥 連続 <b id="iqStreak">${stats.streak}</b></span>
            <span class="iq-s">★ 最高 <b id="iqBest">${stats.best}</b></span>
          </div>
        </div>
        <div class="iq-question" id="iqQuestion"></div>
        <div class="iq-choices" id="iqChoices"></div>
        <div class="iq-feedback" id="iqFeedback"></div>
        <div class="iq-actions">
          <button class="iq-next" id="iqNext" style="display:none">次の問題 →</button>
        </div>
        <div class="iq-aff-slot"></div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.iq-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 300);
    });

    const rand = arr => arr[Math.floor(Math.random() * arr.length)];
    const sample = (arr, n, exclude) => {
      const pool = arr.filter(x => !exclude || !exclude.includes(x));
      const out = [];
      while (out.length < n && pool.length) {
        const i = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(i, 1)[0]);
      }
      return out;
    };
    const eraOf = (y) => {
      if (y < 500) return '古代';
      if (y < 1500) return '中世';
      if (y < 1800) return '近世';
      if (y < 1945) return '近代';
      return '現代';
    };

    function makeQuestion() {
      const type = rand(['whoSaid', 'whichCountry', 'whichField', 'whichEra', 'whoIs']);
      const person = rand(pool);
      let q, correct, choices;

      if (type === 'whoSaid' && person.quotes && person.quotes.length) {
        const rawQ = person.quotes[0];
        const text = typeof rawQ === 'string' ? rawQ : (rawQ.text || '');
        if (!text) return makeQuestion();
        q = `この言葉を言ったのは誰？<br><div class="iq-quote">「${text}」</div>`;
        correct = person.name;
        const names = new Set([correct]);
        pool.forEach(p => { if (p.name !== correct) names.add(p.name); });
        choices = [correct, ...sample([...names].filter(n => n !== correct), 3)];
      } else if (type === 'whichCountry') {
        q = `<b>${person.name}</b> の出身国・活動国は？`;
        correct = person.country;
        const allCountries = [...new Set(pool.map(p => p.country))];
        choices = [correct, ...sample(allCountries.filter(c => c !== correct), 3)];
      } else if (type === 'whichField') {
        q = `<b>${person.name}</b> の分野は？`;
        correct = person.field || '思想家';
        const allFields = [...new Set(pool.map(p => p.field).filter(Boolean))];
        choices = [correct, ...sample(allFields.filter(f => f !== correct), 3)];
      } else if (type === 'whichEra') {
        q = `<b>${person.name}</b> (${person.birth}年生) が活躍したのは？`;
        correct = eraOf(person.birth);
        choices = ['古代', '中世', '近世', '近代', '現代'];
        // 正解を含む4つをランダムに
        choices = [correct, ...sample(choices.filter(e => e !== correct), 3)];
      } else { // whoIs
        q = `この人物は誰？<br><div class="iq-hint">${person.summary.slice(0, 90)}...</div>`;
        correct = person.name;
        choices = [correct, ...sample(pool.map(p => p.name).filter(n => n !== correct), 3)];
      }
      // シャッフル
      choices.sort(() => Math.random() - 0.5);
      return { q, correct, choices, person };
    }

    function render() {
      const { q, correct, choices, person } = makeQuestion();
      ov.querySelector('#iqQuestion').innerHTML = q;
      const cEl = ov.querySelector('#iqChoices');
      cEl.innerHTML = choices.map((c, i) => `<button class="iq-choice" data-c="${i}">${c}</button>`).join('');
      ov.querySelector('#iqFeedback').textContent = '';
      ov.querySelector('#iqFeedback').className = 'iq-feedback';
      ov.querySelector('#iqNext').style.display = 'none';
      cEl.querySelectorAll('.iq-choice').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen = btn.textContent;
          const isRight = chosen === correct;
          stats.total++;
          if (isRight) {
            stats.correct++;
            stats.streak++;
            if (stats.streak > stats.best) stats.best = stats.streak;
            btn.classList.add('iq-right');
            ov.querySelector('#iqFeedback').textContent = `✨ 正解！ ${person.name}（${person.country}・${person.field || ''}）`;
            ov.querySelector('#iqFeedback').classList.add('right');
          } else {
            stats.streak = 0;
            btn.classList.add('iq-wrong');
            cEl.querySelectorAll('.iq-choice').forEach(b => {
              if (b.textContent === correct) b.classList.add('iq-right');
            });
            ov.querySelector('#iqFeedback').textContent = `❌ 正解は ${correct} / ${person.name}: ${person.summary.slice(0, 60)}…`;
            ov.querySelector('#iqFeedback').classList.add('wrong');
          }
          cEl.querySelectorAll('.iq-choice').forEach(b => b.disabled = true);
          saveStats();
          ov.querySelector('#iqCorrect').textContent = stats.correct;
          ov.querySelector('#iqTotal').textContent = stats.total;
          ov.querySelector('#iqStreak').textContent = stats.streak;
          ov.querySelector('#iqBest').textContent = stats.best;
          ov.querySelector('#iqNext').style.display = '';
        });
      });
    }
    ov.querySelector('#iqNext').addEventListener('click', () => {
      // 5問ごとに広告を再抽選（学び切った区切りに）
      if (stats.total > 0 && stats.total % 5 === 0) {
        const slot = ov.querySelector('.iq-aff-slot');
        if (slot) { slot.innerHTML = ''; MAGIC.renderAffiliate('quiz-end', slot, 1, stats.total); }
      }
      render();
    });
    render();
    // 初回: スロットは空のまま（5問目まで出さない）
  }
  window.openIjinQuiz = openIjinQuiz;

  // ============================================================
  // 💰 アフィリエイト・プール（人間の真理ベース）
  // - 高関心モーメント（学び終わった直後／深掘り中／気分が動いた時）にだけ出す
  // - ランダム＋日替わりで同じ人に同じ広告を出しすぎない
  // - 目立つ配色ではなく、コンテンツの続きに見える自然な溶け込み
  // ============================================================
  // 日付シード（同じ日は同じ並び、日をまたぐと並び替わる）
  function dayHash() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const r = s / 233280;
      const j = Math.floor(r * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // 各広告: id / 文脈タグ / 人間のモード (求めている心理) / HTML
  MAGIC.AFFILIATES = [
    {
      id: 'studysapuri', ctx: ['learning-end','quiz-end','timeline','home-study'],
      mood: '知的好奇心が動いた直後 → 体系学習への橋渡し',
      html: `<a class="aff-inline" href="https://px.a8.net/svt/ejp?a8mat=4B1SPX+D3JBW2+36T2+TU14H" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">📚</span>
        <span class="aff-text"><b>体系的に学ぶなら</b> — スタディサプリで映像授業</span>
        <span class="aff-tag">PR</span></a>
        <img border="0" width="1" height="1" src="https://www18.a8.net/0.gif?a8mat=4B1SPX+D3JBW2+36T2+TU14H" alt="" style="position:absolute;opacity:0">`
    },
    {
      id: 'audible', ctx: ['learning-end','person-writer','home-study','place'],
      mood: '文学・名言に触れた後 → 耳で続きを聴きたくなる',
      html: `<a class="aff-inline" href="https://px.a8.net/svt/ejp?a8mat=4B1QDV+6MQUCY+5TB0+5ZU29" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">🎧</span>
        <span class="aff-text"><b>耳で聴く偉人伝</b> — Audible 30日間無料</span>
        <span class="aff-tag">PR</span></a>
        <img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=4B1QDV+6MQUCY+5TB0+5ZU29" alt="" style="position:absolute;opacity:0">`
    },
    {
      id: 'rakuten-travel', ctx: ['place','pilgrimage','beginner'],
      mood: '偉人ゆかりの地を読んだ後 → 実際に行きたくなる',
      html: `<a class="aff-inline" href="//af.moshimo.com/af/c/click?a_id=5501667&p_id=55&pc_id=55&pl_id=630" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">⛩</span>
        <span class="aff-text"><b>聖地巡礼の宿</b> — 楽天トラベルで探す</span>
        <span class="aff-tag">PR</span></a>
        <img src="//i.moshimo.com/af/i/impression?a_id=5501667&p_id=55&pc_id=55&pl_id=630" width="1" height="1" style="position:absolute;border:0;opacity:0" alt="">`
    },
    {
      id: 'jalan', ctx: ['place','pilgrimage','beginner'],
      mood: '旅のわくわくに火がついた → 体験プランを探す',
      html: `<a class="aff-inline" href="https://px.a8.net/svt/ejp?a8mat=4B1QDV+76ZKXE+5R8A+5Z6WX" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">🏯</span>
        <span class="aff-text"><b>ご当地プラン</b> — じゃらんnet</span>
        <span class="aff-tag">PR</span></a>
        <img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=4B1QDV+76ZKXE+5R8A+5Z6WX" alt="" style="position:absolute;opacity:0">`
    },
    {
      id: 'tiktok', ctx: ['goods','lifestyle','beginner'],
      mood: '推し活・グッズ欲 → 動画で見てすぐ買う',
      html: `<a class="aff-inline" href="https://px.a8.net/svt/ejp?a8mat=4B1SPX+DAOJ5E+5V86+61Z81" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">🛒</span>
        <span class="aff-text"><b>トレンドを今すぐ</b> — TikTok Shop</span>
        <span class="aff-tag">PR</span></a>
        <img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4B1SPX+DAOJ5E+5V86+61Z81" alt="" style="position:absolute;opacity:0">`
    },
    {
      id: 'uranai', ctx: ['birthday','spiritual','cosmos-end','home-discovery'],
      mood: '意味・運命を探す気分 → 内省的モーメント',
      html: `<a class="aff-inline" href="https://px.a8.net/svt/ejp?a8mat=4B1SPX+DJ0LMA+2PEO+1BTBLD" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">🔮</span>
        <span class="aff-text"><b>今日の運勢</b> — 偉人と同じ星のもとに</span>
        <span class="aff-tag">PR</span></a>
        <img border="0" width="1" height="1" src="https://www10.a8.net/0.gif?a8mat=4B1SPX+DJ0LMA+2PEO+1BTBLD" alt="" style="position:absolute;opacity:0">`
    },
    {
      id: 'softbank-hikari', ctx: ['home','lifestyle','beginner'],
      mood: '家で長時間動画や3Dを見る人 → 回線速度への潜在欲',
      html: `<a class="aff-inline" href="//af.moshimo.com/af/c/click?a_id=5508511&p_id=6173&pc_id=17361&pl_id=79683" rel="noopener sponsored nofollow" target="_blank" referrerpolicy="no-referrer-when-downgrade">
        <span class="aff-icon">📡</span>
        <span class="aff-text"><b>おうちの回線を見直す</b> — ソフトバンク光</span>
        <span class="aff-tag">PR</span></a>
        <img src="//i.moshimo.com/af/i/impression?a_id=5508511&p_id=6173&pc_id=17361&pl_id=79683" width="1" height="1" style="position:absolute;border:0;opacity:0" alt="">`
    },
    {
      id: 'dinomo', ctx: ['goods','lifestyle','beginner'],
      mood: 'ちょっといい日用品を探したい気分',
      html: `<a class="aff-inline" href="//af.moshimo.com/af/c/click?a_id=5508512&p_id=5538&pc_id=15178&pl_id=89521" rel="noopener sponsored nofollow" target="_blank" referrerpolicy="no-referrer-when-downgrade">
        <span class="aff-icon">🎁</span>
        <span class="aff-text"><b>ちょっといい日用品</b> — dinomo</span>
        <span class="aff-tag">PR</span></a>
        <img src="//i.moshimo.com/af/i/impression?a_id=5508512&p_id=5538&pc_id=15178&pl_id=89521" width="1" height="1" style="position:absolute;border:0;opacity:0" alt="">`
    },
    {
      id: 'wine', ctx: ['wine','drink','person-wine-lover','lifestyle','food'],
      mood: '酒を愛した偉人に共鳴した瞬間 → 一杯やりたくなる',
      html: `<a class="aff-inline" href="https://px.a8.net/svt/ejp?a8mat=4B1SPY+9JJ4TU+5DIO+5Z6WX" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">🍷</span>
        <span class="aff-text"><b>偉人と同じワインを</b> — 本場ワインをお取り寄せ</span>
        <span class="aff-tag">PR</span></a>
        <img border="0" width="1" height="1" src="https://www19.a8.net/0.gif?a8mat=4B1SPY+9JJ4TU+5DIO+5Z6WX" alt="" style="position:absolute;opacity:0">`
    },
    {
      id: 'tiramisu', ctx: ['food','person-italian','lifestyle','sweet'],
      mood: 'イタリア・甘味に心が動いた → 食卓を彩りたい',
      html: `<a class="aff-inline" href="https://px.a8.net/svt/ejp?a8mat=4B1SPY+9TNI42+32PK+HVV0H" rel="noopener sponsored nofollow" target="_blank">
        <span class="aff-icon">🍰</span>
        <span class="aff-text"><b>本格ティラミス</b> — お取り寄せで味わう</span>
        <span class="aff-tag">PR</span></a>
        <img border="0" width="1" height="1" src="https://www14.a8.net/0.gif?a8mat=4B1SPY+9TNI42+32PK+HVV0H" alt="" style="position:absolute;opacity:0">`
    },
  ];
  // 指定文脈に合う広告をランダム選択（日替わりシード）
  MAGIC.pickAffiliates = function(ctx, count = 1, salt = 0) {
    const pool = MAGIC.AFFILIATES.filter(a => a.ctx.includes(ctx));
    if (!pool.length) return [];
    return seededShuffle(pool, dayHash() + salt).slice(0, count);
  };
  // 文脈に広告1枚だけを挿入するヘルパー
  MAGIC.renderAffiliate = function(ctx, container, count = 1, salt = 0) {
    if (!container) return;
    const ads = MAGIC.pickAffiliates(ctx, count, salt);
    if (!ads.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'aff-inline-wrap';
    wrap.innerHTML = ads.map(a => a.html).join('');
    container.appendChild(wrap);
  };

  // ============================================================
  // 📅 年表モード（教材モード）
  // ============================================================
  async function openTimelineMode() {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;
    // 重要事件（世界史の骨組み）
    const EVENTS = [
      { year: -3500, title: '楔形文字の発明（シュメール）', tag: '古代' },
      { year: -2500, title: 'エジプト古王国・ピラミッド建設', tag: '古代' },
      { year: -1200, title: 'モーセの出エジプト（伝）', tag: '古代' },
      { year: -776, title: '第1回古代オリンピック開催', tag: '古代' },
      { year: -551, title: '孔子、儒教を説く', tag: '古代' },
      { year: -500, title: 'ペルシャ戦争、ギリシャ民主政', tag: '古代' },
      { year: -221, title: '始皇帝、中国統一', tag: '古代' },
      { year: -44, title: 'カエサル暗殺', tag: '古代' },
      { year: 0, title: 'イエス・キリスト誕生', tag: '古代' },
      { year: 313, title: 'キリスト教ローマ帝国公認', tag: '古代' },
      { year: 610, title: 'ムハンマド、イスラーム創始', tag: '中世' },
      { year: 794, title: '平安京遷都', tag: '中世' },
      { year: 1206, title: 'チンギス・ハン、モンゴル統一', tag: '中世' },
      { year: 1215, title: 'マグナ・カルタ（英）', tag: '中世' },
      { year: 1453, title: '東ローマ滅亡、活版印刷術', tag: '近世' },
      { year: 1492, title: 'コロンブス、アメリカ到達', tag: '近世' },
      { year: 1517, title: 'ルター、宗教改革の口火', tag: '近世' },
      { year: 1543, title: 'コペルニクス『天球の回転』', tag: '近世' },
      { year: 1600, title: '関ヶ原の戦い', tag: '近世' },
      { year: 1687, title: 'ニュートン『プリンキピア』', tag: '近世' },
      { year: 1776, title: 'アメリカ独立宣言', tag: '近世' },
      { year: 1789, title: 'フランス革命', tag: '近世' },
      { year: 1859, title: 'ダーウィン『種の起源』', tag: '近代' },
      { year: 1868, title: '明治維新', tag: '近代' },
      { year: 1879, title: 'エジソン、電球実用化', tag: '近代' },
      { year: 1903, title: 'ライト兄弟、初飛行', tag: '近代' },
      { year: 1905, title: 'アインシュタイン特殊相対論', tag: '近代' },
      { year: 1914, title: '第一次世界大戦 勃発', tag: '近代' },
      { year: 1939, title: '第二次世界大戦 勃発', tag: '近代' },
      { year: 1945, title: '広島・長崎原爆、戦争終結', tag: '現代' },
      { year: 1969, title: 'アポロ11号、月面着陸', tag: '現代' },
      { year: 1989, title: 'ベルリンの壁崩壊', tag: '現代' },
      { year: 2001, title: '9.11同時多発テロ', tag: '現代' },
      { year: 2020, title: 'COVID-19 パンデミック', tag: '現代' },
    ];
    // 世紀で区切る
    const centuryKey = (y) => y < 0 ? '紀元前' : (Math.floor((y - 1) / 100) + 1) + '世紀';
    const eraOf = (y) => y < 500 ? '古代' : y < 1500 ? '中世' : y < 1800 ? '近世' : y < 1945 ? '近代' : '現代';
    // 世紀別にイベント＋偉人を集約
    const groups = new Map();
    const addToGroup = (key, bucket, item) => {
      if (!groups.has(key)) groups.set(key, { events: [], people: [] });
      groups.get(key)[bucket].push(item);
    };
    EVENTS.forEach(e => addToGroup(centuryKey(e.year), 'events', e));
    people.forEach(p => {
      if (p.birth == null) return;
      addToGroup(centuryKey(p.birth), 'people', p);
    });
    // 並び替え
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      const getNum = k => k === '紀元前' ? -999 : parseInt(k);
      return getNum(a) - getNum(b);
    });

    const ov = document.createElement('div');
    ov.className = 'timeline-mode-overlay';
    const sections = sortedKeys.map(k => {
      const g = groups.get(k);
      const evs = g.events.sort((a, b) => a.year - b.year).map(e =>
        `<div class="tlm-event"><span class="tlm-year">${e.year < 0 ? '前' + Math.abs(e.year) : e.year}</span><span class="tlm-etag">${e.tag}</span><span class="tlm-etext">${e.title}</span></div>`
      ).join('');
      const peeps = g.people.slice().sort((a, b) => a.birth - b.birth).map(p =>
        `<button class="tlm-person" data-id="${p.id}">${p.imageUrl ? `<img src="${p.imageUrl}" alt="" loading="lazy">` : `<span class="tlm-ini">${p.name.charAt(0)}</span>`}<span class="tlm-pn">${p.name.split(/[・\s]/)[0]}</span><span class="tlm-py">${p.birth < 0 ? '前' + Math.abs(p.birth) : p.birth}</span></button>`
      ).join('');
      return `
        <section class="tlm-section">
          <h2 class="tlm-head"><span class="tlm-cent">${k}</span><span class="tlm-era">${eraOf(g.events[0]?.year ?? g.people[0]?.birth ?? 0)}</span></h2>
          ${evs ? `<div class="tlm-events">${evs}</div>` : ''}
          ${peeps ? `<div class="tlm-people">${peeps}</div>` : ''}
        </section>
      `;
    }).join('');

    ov.innerHTML = `
      <button class="tlm-close" aria-label="閉じる">×</button>
      <div class="tlm-frame">
        <div class="tlm-title">📅 年表モード <span class="tlm-sub">人類史の骨組み × 偉人297人</span></div>
        <div class="tlm-scroll">${sections}</div>
        <div class="tlm-aff-slot"></div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.tlm-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 300);
    });
    ov.querySelectorAll('.tlm-person').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        ov.classList.remove('open');
        setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(id); }, 250);
      });
    });
    // 文脈: 'timeline'（学習の終わり） — 日替わり1件
    try { MAGIC.renderAffiliate('timeline', ov.querySelector('.tlm-aff-slot'), 1); } catch {}
  }
  window.openTimelineMode = openTimelineMode;

  // ============================================================
  // 📖 用語集（グロッサリー）
  // ============================================================
  async function openGlossary() {
    // JSON を取得
    let terms = MAGIC._glossary;
    if (!terms) {
      try {
        const res = await fetch('/data/glossary.json');
        const d = await res.json();
        terms = MAGIC._glossary = d.terms || [];
      } catch (e) { terms = []; }
    }
    if (!terms.length) return;
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    const nameById = Object.fromEntries((people || []).map(p => [p.id, p.name]));

    const ov = document.createElement('div');
    ov.className = 'glossary-overlay';
    ov.innerHTML = `
      <button class="gls-close" aria-label="閉じる">×</button>
      <div class="gls-frame">
        <div class="gls-title">📖 用語集 <span class="gls-sub">${terms.length}項目</span></div>
        <input type="search" class="gls-search" id="glsSearch" placeholder="用語を検索（啓蒙・実存・相対性理論…）" />
        <div class="gls-list" id="glsList"></div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.gls-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 300);
    });
    function render(filter) {
      const q = (filter || '').trim().toLowerCase();
      const filtered = q
        ? terms.filter(t => t.term.includes(q) || (t.reading && t.reading.includes(q)) || t.def.toLowerCase().includes(q))
        : terms;
      const list = ov.querySelector('#glsList');
      list.innerHTML = filtered.map(t => `
        <article class="gls-item">
          <div class="gls-term-row">
            <h3 class="gls-term">${t.term}</h3>
            <span class="gls-reading">${t.reading || ''}</span>
            <span class="gls-era">${t.era || ''}</span>
          </div>
          <p class="gls-def">${t.def}</p>
          ${t.related && t.related.length ? `<div class="gls-rel">関連: ${t.related.filter(r => nameById[r]).slice(0, 6).map(r => `<button class="gls-rel-p" data-id="${r}">${nameById[r]}</button>`).join('')}</div>` : ''}
        </article>
      `).join('') || `<div class="gls-empty">該当なし</div>`;
      list.querySelectorAll('.gls-rel-p').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          ov.classList.remove('open');
          setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(id); }, 250);
        });
      });
    }
    ov.querySelector('#glsSearch').addEventListener('input', e => render(e.target.value));
    render('');
    // 用語集の底 → 学習文脈で1枚（日替わり）
    try {
      const slot = document.createElement('div');
      slot.className = 'gls-aff-slot';
      ov.querySelector('.gls-frame').appendChild(slot);
      MAGIC.renderAffiliate('learning-end', slot, 1);
    } catch {}
  }
  window.openGlossary = openGlossary;

  // ============================================================
  // 🏛 神話の宇宙 — 星の王子様メモリアル
  // - 各神話の神々を小惑星のように浮遊配置
  // - 星の王子様タブは静かに、単独の小さな星と1人ずつのキャラクター
  // - タップで神話・エピソード表示
  // ============================================================
  // 📜 神話物語モード: 章構成で没入できる読み物
  const MYTH_STORIES = {
    genesis: {
      name: '創世記', emoji: '🍎', theme: 'eden', symbol: '✡',
      subtitle: '旧約聖書 — 光あれ、から楽園追放まで',
      palette: { bg1: '#2a1f0f', bg2: '#0f0804', accent: '#ffe090' },
      chapters: [
        { t: '1. はじまりの闇',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gustave_Dore_Inferno34.jpg?width=700',
          caption: 'Gustave Doré（1861）',
          body: 'はじめに、神は天と地とを創造された。地は形なく、闇が深淵の面にあり、神の霊が水の面を動いていた。\n\n何もなかった。だが「なかった」という言葉すら、まだなかった。' },
        { t: '2. 光あれ',
          svgArt: `<svg class="myth-svg myth-svg-light" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <!-- 神秘的なグロー -->
              <filter id="bigGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="18" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6"/>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="coreHeart">
                <stop offset="0" stop-color="#fff" stop-opacity="1"/>
                <stop offset="0.3" stop-color="#fff4c0" stop-opacity="0.9"/>
                <stop offset="0.7" stop-color="#ffa040" stop-opacity="0.4"/>
                <stop offset="1" stop-color="#ff6010" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="goldHalo">
                <stop offset="0" stop-color="#ffd880" stop-opacity="0.6"/>
                <stop offset="0.5" stop-color="#c86020" stop-opacity="0.25"/>
                <stop offset="1" stop-color="#3a0a00" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="voidBG" cx="50%" cy="55%">
                <stop offset="0" stop-color="#1a0a20"/>
                <stop offset="0.5" stop-color="#08040e"/>
                <stop offset="1" stop-color="#000"/>
              </radialGradient>
              <linearGradient id="rayGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#fff8e0" stop-opacity="0.95"/>
                <stop offset="0.6" stop-color="#ffb040" stop-opacity="0.35"/>
                <stop offset="1" stop-color="#ff4020" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <rect width="600" height="400" fill="url(#voidBG)"/>
            <!-- 遠い星屑 -->
            <g fill="#fff0c0" opacity="0.5">
              <circle cx="40" cy="60" r="1"/><circle cx="90" cy="120" r="0.8"/>
              <circle cx="510" cy="70" r="1.2"/><circle cx="560" cy="130" r="0.8"/>
              <circle cx="70" cy="320" r="1"/><circle cx="540" cy="340" r="0.9"/>
              <circle cx="200" cy="40" r="0.6"/><circle cx="400" cy="50" r="0.8"/>
            </g>
            <!-- 中央：原初の光 -->
            <g transform="translate(300,200)">
              <!-- 大きな外側ハロ（フィルタ付き） -->
              <circle r="260" fill="url(#goldHalo)" filter="url(#bigGlow)" class="svg-breathe"/>
              <!-- 長い光の柱（24本、回転） -->
              <g class="svg-rotate-slow">
                ${Array.from({length: 32}).map((_, i) => {
                  const a = (i / 32) * 360;
                  const w = i % 3 === 0 ? 4 : i % 2 === 0 ? 2 : 1.2;
                  const h = i % 3 === 0 ? 280 : 220;
                  return `<rect x="${-w/2}" y="-${h}" width="${w}" height="${h}" fill="url(#rayGrad)" transform="rotate(${a})"/>`;
                }).join('')}
              </g>
              <!-- 反転放射（細かい光） -->
              <g class="svg-counter-rotate" opacity="0.5">
                ${Array.from({length: 48}).map((_, i) => {
                  const a = (i / 48) * 360 + 3.75;
                  return `<rect x="-0.5" y="-160" width="1" height="160" fill="#ffe0a0" transform="rotate(${a})"/>`;
                }).join('')}
              </g>
              <!-- 拡散ハロ -->
              <circle r="150" fill="url(#coreHeart)" opacity="0.5"/>
              <circle r="90" fill="url(#coreHeart)" opacity="0.85"/>
              <!-- 核 -->
              <circle r="42" fill="#fff8e0" filter="url(#softGlow)" class="svg-pulse"/>
              <circle r="26" fill="#ffffff"/>
              <!-- 外側に広がる波動（3つ、時間差） -->
              <circle r="40" fill="none" stroke="#ffd480" stroke-width="1.2" class="svg-ripple" style="opacity:0"/>
              <circle r="40" fill="none" stroke="#ffa050" stroke-width="1" class="svg-ripple" style="animation-delay:-1.3s"/>
              <circle r="40" fill="none" stroke="#ff8030" stroke-width="0.8" class="svg-ripple" style="animation-delay:-2.6s"/>
            </g>
            <!-- 深淵の水面（光が映る） -->
            <g opacity="0.45">
              <path d="M 0 340 Q 150 330 300 336 T 600 332" stroke="#4a6a90" stroke-width="1.4" fill="none"/>
              <path d="M 0 355 Q 150 348 300 352 T 600 350" stroke="#3a5a80" stroke-width="1.1" fill="none"/>
              <path d="M 0 370 Q 150 366 300 368 T 600 366" stroke="#2a4060" stroke-width="0.9" fill="none"/>
              <path d="M 0 385 Q 150 382 300 384 T 600 383" stroke="#1a2a40" stroke-width="0.7" fill="none"/>
            </g>
            <!-- 水面の光の反射（中央下） -->
            <g opacity="0.4">
              <ellipse cx="300" cy="340" rx="80" ry="4" fill="#ffd480" class="svg-pulse"/>
              <ellipse cx="300" cy="348" rx="60" ry="3" fill="#ffa060" opacity="0.7"/>
            </g>
            <!-- ラテン語 -->
            <text x="300" y="60" text-anchor="middle" fill="#ffd880" font-size="18" letter-spacing="0.5em" font-style="italic" opacity="0.85" font-family="Cormorant Garamond" filter="url(#softGlow)">FIAT · LVX</text>
            <text x="300" y="82" text-anchor="middle" fill="#ffa050" font-size="9" letter-spacing="0.3em" opacity="0.6" font-family="Cormorant Garamond">— GENESIS 1:3 —</text>
          </svg>`,
          caption: '光あれ — 言葉が世界を生んだ最初の瞬間',
          body: '神は言われた — 「光あれ」\nそして光があった。神は光を見て、よしとされた。\n\n言葉が、世界を産んだ最初の瞬間。' },
        { t: '3. 六日間の創造',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Michelangelo_-_Creation_of_Adam_(cropped).jpg?width=700',
          caption: 'Michelangelo《アダムの創造》（1512）',
          body: '第一日に光を。第二日に空を。第三日に海と陸を。第四日に太陽と月と星を。第五日に魚と鳥を。第六日に獣と — そして、神は言われた。\n\n「われわれの像に人を造ろう」\n土の塵からアダムが形作られ、その鼻に命の息が吹き入れられた。' },
        { t: '4. エデンの園', scene3D: 'eden',
          svgArt: `<svg class="myth-svg" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="edenSky" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#4a2860"/><stop offset="0.5" stop-color="#8a5030"/><stop offset="1" stop-color="#d8a068"/>
              </linearGradient>
              <radialGradient id="edenSun" cx="50%" cy="50%">
                <stop offset="0" stop-color="#ffd480" stop-opacity="1"/><stop offset="1" stop-color="#ffd480" stop-opacity="0"/>
              </radialGradient>
            </defs>
            <rect width="600" height="400" fill="url(#edenSky)"/>
            <!-- 太陽 -->
            <circle cx="480" cy="85" r="38" fill="url(#edenSun)"/>
            <circle cx="480" cy="85" r="20" fill="#fff4c0" class="svg-pulse"/>
            <!-- 山並み -->
            <path d="M 0 280 L 120 220 L 200 250 L 320 200 L 420 240 L 530 210 L 600 260 L 600 400 L 0 400 Z" fill="#3a2a30" opacity="0.7"/>
            <!-- 地面 -->
            <path d="M 0 320 Q 300 305 600 320 L 600 400 L 0 400 Z" fill="#4a6a3a"/>
            <!-- 生命の樹（中央） -->
            <g transform="translate(300,315)">
              <!-- 幹 -->
              <path d="M -8 0 Q -10 -80 -4 -140 L 4 -140 Q 10 -80 8 0 Z" fill="#3a2818" stroke="#1a1008" stroke-width="1"/>
              <!-- 根（地面に広がる） -->
              <path d="M -8 -2 Q -40 4 -70 10 M 8 -2 Q 40 4 70 10 M 0 0 Q -15 8 -25 14 M 0 0 Q 15 8 25 14" stroke="#2a1810" stroke-width="1.5" fill="none"/>
              <!-- 枝 -->
              <g stroke="#3a2818" stroke-width="3" fill="none">
                <path d="M 0 -100 Q -40 -130 -80 -150"/>
                <path d="M 0 -110 Q 40 -140 80 -155"/>
                <path d="M -20 -130 Q -60 -160 -90 -180"/>
                <path d="M 20 -135 Q 60 -165 95 -180"/>
                <path d="M 0 -140 Q 0 -170 0 -200"/>
              </g>
              <!-- 葉の群れ（円で表現） -->
              <g class="svg-breathe">
                <circle cx="-80" cy="-150" r="30" fill="#4a7a3a" opacity="0.85"/>
                <circle cx="-95" cy="-135" r="22" fill="#5a8a4a" opacity="0.8"/>
                <circle cx="80" cy="-155" r="32" fill="#4a7a3a" opacity="0.85"/>
                <circle cx="95" cy="-140" r="24" fill="#5a8a4a" opacity="0.8"/>
                <circle cx="-90" cy="-180" r="28" fill="#3a6a2a" opacity="0.85"/>
                <circle cx="95" cy="-180" r="30" fill="#3a6a2a" opacity="0.85"/>
                <circle cx="0" cy="-200" r="38" fill="#5a8a4a" opacity="0.9"/>
                <circle cx="-40" cy="-195" r="26" fill="#4a7a3a" opacity="0.8"/>
                <circle cx="40" cy="-195" r="26" fill="#4a7a3a" opacity="0.8"/>
              </g>
              <!-- 禁断の実（赤いリンゴ） -->
              <g class="svg-swing">
                <circle cx="-60" cy="-160" r="4" fill="#c02020"/>
                <circle cx="-58" cy="-161" r="1" fill="#ff6060"/>
                <circle cx="50" cy="-165" r="4" fill="#c02020"/>
                <circle cx="52" cy="-166" r="1" fill="#ff6060"/>
                <circle cx="-15" cy="-210" r="5" fill="#c02020"/>
                <circle cx="-13" cy="-211" r="1" fill="#ff8080"/>
              </g>
              <!-- 蛇（幹に巻き付く） -->
              <path d="M 4 -60 Q -10 -70 4 -80 Q 18 -90 4 -100 Q -10 -110 4 -120" stroke="#6a9040" stroke-width="3.5" fill="none" stroke-linecap="round"/>
              <circle cx="4" cy="-60" r="2.5" fill="#6a9040"/>
              <circle cx="3" cy="-59" r="0.6" fill="#1a1a1a"/>
              <!-- 蛇の舌 -->
              <path d="M 2 -60 L -3 -59 M 2 -60 L -3 -62" stroke="#c02020" stroke-width="0.6"/>
            </g>
            <!-- 石の小路 -->
            <circle cx="150" cy="355" r="10" fill="#2a1810" opacity="0.5"/>
            <circle cx="200" cy="365" r="8" fill="#2a1810" opacity="0.5"/>
            <circle cx="440" cy="360" r="9" fill="#2a1810" opacity="0.5"/>
            <!-- 鳥（飛ぶ） -->
            <g class="svg-float" transform="translate(120,130)">
              <path d="M 0 0 Q -6 -4 -12 0 M 0 0 Q 6 -4 12 0" stroke="#1a1008" stroke-width="1.5" fill="none"/>
            </g>
            <g class="svg-float" transform="translate(400,160)" style="animation-delay:-2s">
              <path d="M 0 0 Q -5 -3 -10 0 M 0 0 Q 5 -3 10 0" stroke="#1a1008" stroke-width="1.2" fill="none"/>
            </g>
          </svg>`,
          caption: 'エデンの園 — 命の木と、ただ一匹の蛇',
          body: '主なる神は東の方エデンに園を設け、造った人をそこに置かれた。見て麗しく食べて良い実を結ぶあらゆる木が、そこに生えた。\n\nそして園の中央には「命の木」と、「善悪を知る木」があった。' },
        { t: '5. 助け手イヴ',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Michelangelo%2C_Creation_of_Eve_01.jpg?width=700',
          caption: 'Michelangelo《イヴの創造》（1510）',
          body: '人が独りでいるのはよくない。主は人を深く眠らせ、その肋骨から女を造られた。アダムは言った — 「これこそ、私の骨の骨、肉の肉」\n\nふたりは裸でも恥じなかった。' },
        { t: '6. 禁断の果実',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lucas_Cranach_the_Elder,_Adam_and_Eve_in_Paradise,_1509,_NGA_6060.jpg?width=700',
          caption: 'Lucas Cranach《堕罪》（1530）',
          body: '蛇は女に言った — 「決して死なない。神はそれを食べる日に、目が開け、神のようになることを知っておられる」\n\nイヴは実を取って食べ、アダムにも渡した。目が開け、ふたりは初めて裸を恥じた。' },
        { t: '7. 楽園追放',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Masaccio-Expulsion_of_Adam_and_Eve-_Brancacci_Chapel2.jpg?width=700',
          caption: 'Masaccio《楽園追放》（1427）',
          body: '主は言われた — 「人はわれわれの一人のようになった。善悪を知る者として。今や彼が手を伸ばし、命の木からも取って食べ、永遠に生きるといけない」\n\nふたりはエデンから追放された。園の東には、炎の剣を持つケルビムが置かれた。' },
        { t: '8. カインとアベル',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Peter_Paul_Rubens_-_Cain_slaying_Abel,_1608-1609.jpg?width=700',
          caption: 'Peter Paul Rubens《アベルを殺すカイン》（1610）',
          body: 'アダムとイヴの子、兄カインは弟アベルを野で殺した。主は問われた — 「お前の弟アベルはどこにいるのか」\n\nカインは答えた — 「知りません。私は弟の番人なのですか」\n\n人類最初の殺人。' },
        { t: '9. バベルの塔', scene3D: 'babel',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pieter_Bruegel_the_Elder_-_The_Tower_of_Babel_(Vienna)_-_Google_Art_Project.jpg?width=700',
          caption: 'Pieter Bruegel《バベルの塔》（1563）',
          body: '人類は一つの言葉を話し、天に届く塔を建てようとした。「さあ、町を建てよう。頂を天に届かせ、名を高めよう」\n\n主は降りて来られた。そして言われた — 「彼らは一つの民で、同じ言葉を話している。これからは、望むことは何でもできるだろう。彼らの言葉を混乱させよう」\n\n塔は崩れ、人々は散った。以来、互いを理解できぬまま。' },
      ]
    },
    greek: {
      name: 'ギリシャ神話', emoji: '⚡', theme: 'olympus', symbol: 'Ω',
      subtitle: 'カオスから、オリンポスまで',
      palette: { bg1: '#0f1830', bg2: '#050814', accent: '#ffd650' },
      chapters: [
        { t: '1. カオス',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Wenceslas_Hollar_-_Chaos_(State_2).jpg?width=700',
          caption: 'Wenceslas Hollar《カオスと創造》（1665）',
          body: 'はじめにカオスがあった。形なきもの、境界なきもの、すべてが混ざり合う深淵。\n\nそこからガイア（大地）、タルタロス（奈落）、エロス（愛の欲望）、エレボス（闇）、ニュクス（夜）が生まれた。' },
        { t: '2. ウラノスとガイア',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Mutiliation_of_Uranus_by_Saturn.jpg?width=700',
          caption: 'Giorgio Vasari《ウラノスの去勢》（16世紀）',
          body: 'ガイアは一人でウラノス（天空）を生み、彼と交わって十二のティタン神、三つ目の巨人キュクロプス、百の腕を持つヘカトンケイルを産んだ。\n\nウラノスは子らを厭い、大地の胎内に閉じ込めた。ガイアは苦しみ、末子クロノスに鋼の鎌を渡した。' },
        { t: '3. クロノスの父殺し',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Francisco_de_Goya%2C_Saturno_devorando_a_su_hijo_(1819-1823).jpg?width=700',
          caption: 'Goya《我が子を食らうサトゥルヌス》（1823）',
          body: 'クロノスは父ウラノスを切り、神々の時代を始めた。しかし自らも子に倒されるという予言を恐れ、生まれる子を次々に呑み込んだ。\n\n妻レアはゼウスを隠し、クロノスには石を食わせた。' },
        { t: '4. ティタノマキア',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cornelis_Cornelisz._van_Haarlem_-_The_Fall_of_the_Titans_-_Google_Art_Project.jpg?width=700',
          caption: 'Cornelis van Haarlem《ティタンの没落》（1590）',
          body: '成長したゼウスは兄姉を呑まれた神々を解放し、ティタン神たちと十年の大戦争を繰り広げた。\n\nキュクロプスが鍛えた雷霆、三叉の矛、隠れ兜を武器に、オリンポス神族が勝利した。' },
        { t: '5. オリンポスの十二神',
          svgArt: `<svg class="myth-svg" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="olympusBG"><stop offset="0" stop-color="#2040a0" stop-opacity="0.6"/><stop offset="1" stop-color="#081430"/></radialGradient>
              <linearGradient id="mountGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d0c8e0"/><stop offset="1" stop-color="#4a4a6a"/></linearGradient>
            </defs>
            <rect width="600" height="420" fill="url(#olympusBG)"/>
            <!-- 雷雲 -->
            <g opacity="0.35">
              <ellipse cx="130" cy="60" rx="60" ry="12" fill="#d0d0e0"/>
              <ellipse cx="470" cy="80" rx="70" ry="14" fill="#d0d0e0"/>
              <ellipse cx="300" cy="45" rx="50" ry="10" fill="#d0d0e0"/>
            </g>
            <!-- オリンポス山 -->
            <path d="M 80 330 L 200 180 L 280 230 L 340 140 L 420 200 L 520 330 Z" fill="url(#mountGrad)" stroke="#1a1a2a" stroke-width="1.5"/>
            <!-- 山頂の神殿 -->
            <g transform="translate(340,135)">
              <rect x="-20" y="0" width="40" height="3" fill="#f0e0a0"/>
              <rect x="-18" y="-30" width="3" height="30" fill="#f0e0a0"/>
              <rect x="-6" y="-30" width="3" height="30" fill="#f0e0a0"/>
              <rect x="6" y="-30" width="3" height="30" fill="#f0e0a0"/>
              <rect x="15" y="-30" width="3" height="30" fill="#f0e0a0"/>
              <path d="M -24 -30 L 0 -44 L 24 -30 Z" fill="#f0e0a0" stroke="#8a6020" stroke-width="1"/>
            </g>
            <!-- 十二神の位置を示す円盤（ゾディアック風） -->
            <g transform="translate(300,230)">
              <circle r="170" fill="none" stroke="rgba(255,216,128,0.3)" stroke-dasharray="4 4"/>
              <circle r="140" fill="none" stroke="rgba(255,216,128,0.2)"/>
              ${[
                {sym:'⚡', name:'Zeus', a:-90},
                {sym:'🔱', name:'Poseidon', a:-60},
                {sym:'🦉', name:'Athena', a:-30},
                {sym:'🎵', name:'Apollon', a:0},
                {sym:'🏹', name:'Artemis', a:30},
                {sym:'🌹', name:'Aphrodite', a:60},
                {sym:'⚔', name:'Ares', a:90},
                {sym:'🔨', name:'Hephaistos', a:120},
                {sym:'🌾', name:'Demeter', a:150},
                {sym:'🪶', name:'Hermes', a:180},
                {sym:'🏛', name:'Hera', a:210},
                {sym:'🍷', name:'Dionysos', a:240},
              ].map(g => {
                const rad = g.a * Math.PI / 180;
                const cx = Math.cos(rad) * 155;
                const cy = Math.sin(rad) * 155;
                return `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})">
                  <circle r="18" fill="rgba(255,216,128,0.12)" stroke="#ffd880" stroke-width="1"/>
                  <text text-anchor="middle" dy="5" font-size="18">${g.sym}</text>
                  <text text-anchor="middle" dy="30" font-size="8" fill="#ffd880" font-family="Cormorant Garamond" font-style="italic">${g.name}</text>
                </g>`;
              }).join('')}
              <!-- 中央: ゼウスの雷 -->
              <path d="M 0 -20 L -6 0 L 0 -5 L -6 15 L 10 -5 L 4 0 L 10 -20 Z" fill="#ffd880" stroke="#8a5a00" stroke-width="1" class="svg-pulse"/>
              <text text-anchor="middle" dy="45" font-size="10" fill="#ffd880" letter-spacing="0.3em">OLYMPUS</text>
            </g>
          </svg>`,
          caption: 'オリンポスの十二神 — 天の王国の座',
          body: 'ゼウスは天を、ポセイドンは海を、ハデスは冥界を分けた。アテナが知恵を、アポロンが音楽を、アルテミスが狩りを、アフロディーテが愛を、ヘルメスが伝令を司った。\n\n神々は雲のオリンポスに住まい、人間を見下ろした。' },
        { t: '6. プロメテウスの火',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Peter_Paul_Rubens_-_Prometheus_Bound.jpg?width=700',
          caption: 'Rubens《縛られたプロメテウス》（1612）',
          body: '人間は弱かった。プロメテウスは天から火を盗み、葦の茎に隠して人間に渡した。ゼウスは怒り、プロメテウスをカウカソスの岩に磔にし、毎日鷲に肝臓を啄ませた。\n\n夜ごと再生し、昼ごと啄まれ続ける刑。' },
        { t: '7. パンドラの箱',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pandora_-_John_William_Waterhouse.jpg?width=700',
          caption: 'John William Waterhouse《パンドラ》（1896）',
          body: 'ゼウスは人間に復讐した。火の神ヘファイストスに土と水で「すべての贈り物を持つ女」パンドラを造らせ、開けてはならぬ甕を持たせ地上に送った。\n\n好奇心に負けたパンドラが甕を開けると、病・争い・苦しみ・老い — すべての災いが飛び出した。\n慌てて閉じた時、底に残ったのはただ一つ — エルピス、希望だけ。' },
      ]
    },
    japan: {
      name: '日本神話', emoji: '⛩', theme: 'izanami', symbol: '日',
      subtitle: '天地開闢から、国譲りまで',
      palette: { bg1: '#2a1030', bg2: '#10041a', accent: '#ffb0d0' },
      chapters: [
        { t: '1. 天地開闢',
          body: '天地がまだ分かれず、渾沌として卵のようだった頃。清く明るきもの薄くたなびいて天となり、重く濁れるものが凝り積もって地となった。\n\n高天原に最初に現れたのは、天之御中主神（あめのみなかぬしのかみ）。続いて神々が次々と生まれた。' },
        { t: '2. 国生み',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kobayashi_Izanami_and_Izanagi.jpg?width=700',
          caption: '小林永濯《伊邪那岐命・伊邪那美命》（19世紀）',
          body: '神々はイザナギとイザナミに命じた — 「この漂う国を修めよ」\n\n二神は天の浮橋に立ち、天沼矛を下ろして海水をかき回した。引き上げた矛の先から滴り落ちた塩が固まり、淤能碁呂島（おのごろじま）となった。そこに降り立ち、夫婦となった。' },
        { t: '3. 八百万の神々',
          body: 'イザナギとイザナミは日本の国土を次々に産んだ。淡路、四国、九州、本州、北陸、対馬、佐渡 — 八つの島、大八島の国。\n\nさらに山、海、風、木、草の神々 — 八百万の神が生まれた。' },
        { t: '4. イザナミの死と黄泉',
          body: 'イザナミは火の神カグツチを産んで火傷を負い、黄泉の国へ旅立った。\n\nイザナギは妻を連れ戻そうと黄泉を訪れた。「見ないで」という妻の言葉を破り、蛆の湧く姿を見てしまう。恥じたイザナミは追いかけ、黄泉比良坂で別れた。「一日に千人殺すならば千五百人産む」— 命と死の契約。' },
        { t: '5. 三貴子の誕生',
          body: 'イザナギは穢れを祓うため禊をした。左目を洗うと天照大神（太陽）、右目を洗うと月読命（月）、鼻を洗うと須佐之男命（嵐）が生まれた。\n\n父は彼らにそれぞれ「高天原」「夜の国」「海原」を治めよと命じた。' },
        { t: '6. 天岩戸',
          svgArt: `<svg class="myth-svg" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="amaGlow" cx="30%" cy="50%"><stop offset="0" stop-color="#fff8d8"/><stop offset="0.4" stop-color="#ffd480" stop-opacity="0.6"/><stop offset="1" stop-color="#ffd480" stop-opacity="0"/></radialGradient>
              <linearGradient id="amaDark" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#1a0a28"/><stop offset="1" stop-color="#05020a"/></linearGradient>
            </defs>
            <rect width="600" height="420" fill="url(#amaDark)"/>
            <!-- 岩山 -->
            <path d="M 0 420 L 0 180 Q 60 150 120 160 L 180 180 L 240 140 Q 280 120 320 140 L 380 200 Q 420 220 470 210 L 540 180 L 600 200 L 600 420 Z" fill="#2a1a2a" stroke="#4a2a4a" stroke-width="1"/>
            <!-- 岩戸の隙間（光が漏れる） -->
            <g transform="translate(240,230)">
              <!-- 光のグロー -->
              <ellipse cx="0" cy="0" rx="180" ry="120" fill="url(#amaGlow)"/>
              <ellipse cx="0" cy="0" rx="110" ry="80" fill="url(#amaGlow)" opacity="0.8"/>
              <!-- 隙間の形 -->
              <path d="M -20 -40 Q -8 -50 5 -40 L 10 40 Q -5 55 -20 40 Z" fill="#fff8d8" class="svg-pulse"/>
              <!-- 放射光 -->
              <g class="svg-rotate-slow" opacity="0.5">
                ${Array.from({length: 16}).map((_, i) => {
                  const a = (i / 16) * 360;
                  return `<rect x="-1" y="-150" width="2" height="150" fill="#ffd480" opacity="${0.3 + (i%2)*0.2}" transform="rotate(${a})"/>`;
                }).join('')}
              </g>
            </g>
            <!-- 鳥居 -->
            <g transform="translate(150,380)">
              <rect x="0" y="0" width="60" height="6" fill="#c02020"/>
              <rect x="-6" y="-6" width="72" height="6" fill="#c02020"/>
              <rect x="6" y="0" width="4" height="45" fill="#c02020"/>
              <rect x="50" y="0" width="4" height="45" fill="#c02020"/>
            </g>
            <!-- 祭りの八百万の神々（シルエット） -->
            <g transform="translate(440,360)" opacity="0.7">
              <circle cx="-40" cy="0" r="6" fill="#2a1a2a"/>
              <circle cx="-25" cy="-3" r="6" fill="#2a1a2a"/>
              <circle cx="-10" cy="0" r="6" fill="#2a1a2a"/>
              <circle cx="5" cy="-2" r="6" fill="#2a1a2a"/>
              <circle cx="20" cy="0" r="6" fill="#2a1a2a"/>
              <circle cx="35" cy="-3" r="6" fill="#2a1a2a"/>
              <!-- 体 -->
              <path d="M -46 5 L -34 5 L -34 25 L -46 25 Z" fill="#2a1a2a"/>
              <path d="M -31 5 L -19 5 L -19 25 L -31 25 Z" fill="#2a1a2a"/>
              <path d="M -16 5 L -4 5 L -4 25 L -16 25 Z" fill="#2a1a2a"/>
              <path d="M -1 5 L 11 5 L 11 25 L -1 25 Z" fill="#2a1a2a"/>
              <path d="M 14 5 L 26 5 L 26 25 L 14 25 Z" fill="#2a1a2a"/>
              <path d="M 29 5 L 41 5 L 41 25 L 29 25 Z" fill="#2a1a2a"/>
            </g>
            <!-- アメノウズメの舞 -->
            <g transform="translate(380,320)">
              <circle cx="0" cy="-20" r="5" fill="#d8a090"/>
              <path d="M -12 -15 Q -20 5 -16 25 L 16 25 Q 20 5 12 -15 Z" fill="#ff4060"/>
              <line x1="-15" y1="0" x2="-25" y2="-8" stroke="#d8a090" stroke-width="2"/>
              <line x1="15" y1="0" x2="26" y2="-15" stroke="#d8a090" stroke-width="2"/>
            </g>
            <text x="300" y="45" text-anchor="middle" fill="#ffd880" font-size="12" letter-spacing="0.3em" opacity="0.7">天 岩 戸</text>
          </svg>`,
          caption: '天岩戸 — 世界に光が戻った夜',
          body: 'スサノオは乱暴を働き、高天原を追われた。嘆いた天照は天岩戸に閉じこもり、世界は闇に沈んだ。\n\n八百万の神は岩戸の前で祭りを開いた。アメノウズメが裸で舞い、神々は大笑いした。不思議に思って岩戸を少し開けた天照を、タヂカラオが引き出した。世界に光が戻った。' },
        { t: '7. ヤマタノオロチ',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Susanoo-no-Mikoto-slays-Yamata-no-Orochi-in-Izumo-By-Tsukioka-Yoshitoshi.png?width=700',
          caption: '月岡芳年《素戔嗚尊》（1887）',
          body: '出雲に降りたスサノオは、八つの頭を持つ大蛇ヤマタノオロチに娘を食われる夫婦に出会った。\n\n八塩折の酒を八つの桶に満たし、酔った大蛇を斬った。尾から現れたのが草薙剣 — 三種の神器の一つ。' },
        { t: '8. 国譲り',
          body: 'オオクニヌシが築いた葦原中国を、高天原の神々は欲した。使者が派遣され、オオクニヌシは国を譲った代わりに、出雲大社という「天につながる神社」を建ててもらった。\n\n天孫ニニギが葦原中国に降り、日本の皇室の祖先となった。' },
      ]
    },
    norse: {
      name: '北欧神話', emoji: '🌳', theme: 'yggdrasil', symbol: 'ᚱ',
      subtitle: 'ギンヌンガガプから、ラグナロクまで',
      palette: { bg1: '#0a1028', bg2: '#050612', accent: '#b0d8ff' },
      chapters: [
        { t: '1. ギンヌンガガプ',
          body: 'はじめに、何もなかった。ただ巨大な虚空ギンヌンガガプがあり、北には氷の国ニヴルヘイム、南には炎の国ムスペルヘイムがあった。\n\n氷と炎が出会い、最初の巨人ユミルと牝牛アウズンブラが生まれた。' },
        { t: '2. 世界樹ユグドラシル',
          svgArt: `<svg class="myth-svg" viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="yggBG"><stop offset="0" stop-color="#1a2030"/><stop offset="1" stop-color="#050810"/></radialGradient>
              <linearGradient id="trunkGrad" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#3a2818"/><stop offset="0.5" stop-color="#6a4a28"/><stop offset="1" stop-color="#3a2818"/></linearGradient>
            </defs>
            <rect width="600" height="500" fill="url(#yggBG)"/>
            <!-- 星 -->
            <g fill="#b0c8f0" opacity="0.7">
              <circle cx="50" cy="80" r="1.5"/>
              <circle cx="140" cy="50" r="1"/>
              <circle cx="480" cy="100" r="1.5"/>
              <circle cx="550" cy="70" r="1"/>
              <circle cx="90" cy="150" r="0.8"/>
              <circle cx="530" cy="170" r="1"/>
            </g>
            <!-- 上枝（アスガルド方向） -->
            <g stroke="#5a4028" stroke-width="3" fill="none">
              <path d="M 300 260 Q 240 180 180 130"/>
              <path d="M 300 260 Q 360 180 420 130"/>
              <path d="M 300 260 L 300 90"/>
              <path d="M 300 180 Q 250 140 220 110"/>
              <path d="M 300 180 Q 350 140 380 110"/>
              <path d="M 300 140 Q 270 100 240 75"/>
              <path d="M 300 140 Q 330 100 360 75"/>
            </g>
            <!-- 葉の冠 -->
            <g class="svg-breathe" opacity="0.8">
              <ellipse cx="300" cy="120" rx="170" ry="80" fill="#2a4a2a"/>
              <ellipse cx="300" cy="100" rx="140" ry="60" fill="#3a6a3a"/>
              <circle cx="200" cy="130" r="40" fill="#3a6a3a"/>
              <circle cx="400" cy="130" r="40" fill="#3a6a3a"/>
            </g>
            <!-- 幹 -->
            <path d="M 280 260 Q 275 340 275 440 L 325 440 Q 325 340 320 260 Z" fill="url(#trunkGrad)" stroke="#1a0a08" stroke-width="1"/>
            <!-- 根（下方に広がる） -->
            <g stroke="#2a1810" stroke-width="3" fill="none">
              <path d="M 275 440 Q 230 460 170 470"/>
              <path d="M 325 440 Q 370 460 430 470"/>
              <path d="M 290 440 Q 260 478 220 488"/>
              <path d="M 310 440 Q 340 478 380 488"/>
              <path d="M 300 440 L 300 490"/>
            </g>
            <!-- 9つの世界のラベル -->
            <g font-size="9" fill="#b8a080" font-family="Cormorant Garamond" letter-spacing="0.15em" font-style="italic">
              <!-- 上段 3つ -->
              <text x="300" y="85" text-anchor="middle">ASGARD</text>
              <text x="220" y="115" text-anchor="middle">VANAHEIM</text>
              <text x="380" y="115" text-anchor="middle">ALFHEIM</text>
              <!-- 中段 3つ -->
              <text x="140" y="260" text-anchor="middle">JOTUNHEIM</text>
              <text x="300" y="390" text-anchor="middle" fill="#d0a060">MIDGARD</text>
              <text x="470" y="260" text-anchor="middle">MUSPELHEIM</text>
              <!-- 下段 3つ -->
              <text x="170" y="475" text-anchor="middle">SVARTALFHEIM</text>
              <text x="300" y="500" text-anchor="middle">HELHEIM</text>
              <text x="430" y="475" text-anchor="middle">NIFLHEIM</text>
            </g>
            <!-- 中央に MIDGARD の円 -->
            <circle cx="300" cy="380" r="20" fill="none" stroke="#d0a060" stroke-width="1" opacity="0.6"/>
            <!-- ヴェズルヴォルニル（噛む龍）— 根元 -->
            <g transform="translate(300, 480)">
              <path d="M -40 0 Q -20 -5 0 0 Q 20 5 40 0" stroke="#4a3020" stroke-width="2" fill="none"/>
              <circle cx="-35" cy="0" r="2" fill="#c02020"/>
              <circle cx="35" cy="0" r="2" fill="#c02020"/>
            </g>
            <!-- 鷲 — 頂上 -->
            <text x="300" y="60" text-anchor="middle" font-size="16" fill="#d0a060">🦅</text>
            <!-- ラタトスク（リス） -->
            <text x="250" y="340" font-size="10">🐿</text>
            <!-- ルーン文字 -->
            <g fill="#b0a080" font-size="14" opacity="0.6">
              <text x="30" y="270">ᚢ</text>
              <text x="555" y="270">ᚱ</text>
              <text x="30" y="240">ᚦ</text>
              <text x="555" y="240">ᚨ</text>
            </g>
            <text x="300" y="30" text-anchor="middle" fill="#ffd880" font-size="13" letter-spacing="0.4em" opacity="0.75">YGGDRASIL</text>
          </svg>`,
          caption: 'ユグドラシル — 九つの世界を支える樹',
          body: 'オーディンは兄弟と共にユミルを殺し、その体から世界を作った。肉は大地、血は海、骨は山、髪は森、頭蓋は天。\n\n宇宙の中心には世界樹ユグドラシルがそびえ、九つの世界を支えた。根元には運命の三女神ノルンが住み、未来を織っていた。' },
        { t: '3. 知恵の代価',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Georg_von_Rosen_-_Oden_som_vandringsman%2C_1886_(Odin%2C_the_Wanderer).jpg?width=700',
          caption: 'Georg von Rosen《放浪者オーディン》（1886）',
          body: 'オーディンは知恵を求めてミーミルの泉に片目を捧げた。さらに自らを槍で刺し、世界樹に九日九夜吊るされ、ルーン文字を発見した。\n\n「我は我に、我を捧げた」' },
        { t: '4. トールとミョルニル',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg?width=700',
          caption: 'Mårten Eskil Winge《巨人との戦いのトール》（1872）',
          body: '雷神トールは巨人族の天敵。ドワーフが鍛えた魔槌ミョルニルは、投げれば必ず戻り、山を砕いた。\n\n腰の力帯は力を倍に、鉄の手袋で槌を握った。雷鳴が轟くとき、それはトールが巨人を討つ音。' },
        { t: '5. ロキの悪戯',
          body: '火の巨人の血を引くロキ。美しき神バルドルを愛したフリッグ母は、あらゆるものに息子を傷つけない誓いを立てさせた。だがヤドリギだけは忘れた。\n\nロキは盲目の神ヘズにヤドリギの枝を渡した。バルドルは倒れた。光が消え、神々は泣いた。' },
        { t: '6. ラグナロク',
          img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ragnar%C3%B6k_by_Doepler.jpg?width=700',
          caption: 'Emil Doepler《ラグナロク》（1905）',
          body: 'いつか来る「神々の黄昏」。ロキは鎖を解かれ、巨人フレーズの船ナグルファルで進軍する。ミッドガルドの蛇ヨルムンガンドが陸に這い上がり、炎の巨人スルトが炎の剣を振るう。\n\nオーディンは狼フェンリルに呑まれる。トールはヨルムンガンドと相打つ。そして世界が燃え、海に沈む。\n\nしかし — 新しい大地が海から昇り、生き残った二人の人間が新たな世界を始める。' },
      ]
    },
    egypt: {
      name: 'エジプト神話', emoji: '𓂀', theme: 'nile', symbol: '𓂀',
      subtitle: '太初の水ヌンから、オシリスの復活まで',
      palette: { bg1: '#2a1505', bg2: '#120805', accent: '#ffc850' },
      chapters: [
        { t: '1. 太初の水ヌン', body: 'はじめに、ヌンと呼ばれる原初の水があった。混沌、果てしない深淵。\n\nその水の中から一つの丘が現れ、自ら生まれた神アトゥムが立った。彼は名乗った — 「我、在りて在るもの」' },
        { t: '2. 九柱神の誕生', body: 'アトゥムは自らに口づけし、シュ（大気）とテフヌト（湿気）を生んだ。二人からゲブ（大地）とヌト（天空）が。二人からオシリス、イシス、セト、ネフティス。\n\nこれがヘリオポリスの九柱神（エネアド）。' },
        { t: '3. ラーの昼と夜', body: '太陽神ラーは毎日、船マアンジェトに乗って東から昇り、十二時間かけて天を渡る。夜は船メセクテトに乗り換え、十二時間かけて冥界を航行する。\n\n冥界では毎夜、混沌の蛇アポフィスが船を襲う。ラーは戦士たちと戦い、勝ち続けなければ明日の朝は来ない。' },
        { t: '4. オシリスの治世', body: 'ゲブの長子オシリスは地上を治めた。人々に農業を教え、法を与え、音楽を教えた。妻は聡明なイシス。\n\n弟セトは兄を妬んだ。' },
        { t: '5. セトの裏切り', body: 'セトはオシリスを宴に招き、美しい棺に体を入れた者に棺を贈ると約束した。オシリスが横たわると、セトは蓋を閉じ、鉛で封じ、ナイル川に流した。\n\nさらに遺体を十四に切り刻み、国中に撒いた。' },
        { t: '6. イシスの愛', body: 'イシスは鳥となって夫の遺体を探し歩いた。十三の断片を集め、魔術で再構築した。失った一部は金で作った。\n\n一夜だけ魂を呼び戻し、その夜にホルスが身篭られた。オシリスは冥界の王となった。' },
        { t: '7. ホルスの復讐', body: '息子ホルスは成長し、叔父セトと八十年間戦った。最後に神々の裁きで、ホルスは地上の王となり、セトは砂漠に追放された。\n\nオシリスは死後の裁き手となり、人が死ぬと心臓が真実の羽と秤にかけられ、罪があれば魂を喰らう獣に食われる。' },
      ]
    },
    keepers: {
      name: '担い手たち', emoji: '✒️', theme: 'scholars', symbol: '∞',
      subtitle: '神話を生き延びさせた、研究者と想像の天才たち',
      palette: { bg1: '#1a1430', bg2: '#05040f', accent: '#e0d0ff' },
      isGallery: true,
      chapters: [
        // ── 🔬 研究者・思想家 ──
        { group:'研究者', name:'ジョセフ・キャンベル', year:'1904–1987', country:'アメリカ', theme:'モノミス（英雄の旅）',
          t:'ジョセフ・キャンベル',
          body:'世界中の神話を比較し、すべての英雄物語に共通する型を発見した — 出立・試練・帰還。『千の顔を持つ英雄』で人類は同じ物語を語り続けていると説いた。\n\n「従え、汝の至福に（Follow your bliss）」— スター・ウォーズのジョージ・ルーカスも彼の弟子。ハリウッド脚本術の母。' },
        { group:'研究者', name:'カール・ユング', year:'1875–1961', country:'スイス', theme:'集合的無意識・元型',
          t:'カール・ユング',
          body:'神話は人類共通の「集合的無意識」から湧き出す元型(archetype)の言語だと見抜いた。影、アニマ/アニムス、賢者、大母 — どの文化の物語にも現れる形。\n\nフロイトと決別した後、10年間自分の無意識と対話し『赤の書』を残した。神話を個人の心理として読み直した最初の人。' },
        { group:'研究者', name:'ミルチャ・エリアーデ', year:'1907–1986', country:'ルーマニア／アメリカ', theme:'聖と俗',
          t:'ミルチャ・エリアーデ',
          body:'宗教は「聖なるもの」の現れ方の研究だと提唱。神話は時間の外にある「イン・イッロ・テンポレ（かの時において）」を語るもの。\n\n祭りとは「創世の時」を繰り返し再現する行為。世界中の新年儀礼が「混沌からの再創造」を上演しているのはなぜか、を解き明かした。' },
        { group:'研究者', name:'ジェームズ・フレイザー', year:'1854–1941', country:'イギリス', theme:'比較神話学',
          t:'ジェームズ・フレイザー',
          body:'『金枝篇』12巻で世界の神話・儀礼・呪術を網羅的に比較した。「死して再生する神」の型を発見 — オシリス、アドニス、ディオニュソス、そしてイエス・キリスト。\n\nT.S.エリオット『荒地』に最大の影響。T.S.も『金枝篇』なしにはあの詩は書けなかったと認めた。' },
        { group:'研究者', name:'クロード・レヴィ＝ストロース', year:'1908–2009', country:'フランス', theme:'構造人類学',
          t:'クロード・レヴィ＝ストロース',
          body:'神話は「二項対立の調停」だと見抜いた — 生と死、自然と文化、天と地。神話は矛盾を「物語」で和解させようとする人間の思考。\n\n『悲しき熱帯』『神話論理』四部作で、人類の思考そのものが神話的構造を持つと示した。' },
        { group:'研究者', name:'柳田國男', year:'1875–1962', country:'日本', theme:'日本民俗学',
          t:'柳田國男',
          body:'『遠野物語』で村々に眠る伝承を救い上げた。妖怪、神隠し、河童、座敷童 — 消えゆく民の物語を学問にした。\n\n「無名の庶民こそが日本文化の担い手」という思想。宮沢賢治・水木しげる・井上ひさし、すべて柳田の土壌から生まれた。' },
        { group:'研究者', name:'折口信夫', year:'1887–1953', country:'日本', theme:'古代研究・まれびと論',
          t:'折口信夫',
          body:'古代日本の神は「まれびと」— 遠方から来訪する客人として降りると唱えた。『死者の書』で藤原郎女と中将姫の物語を蘇らせた歌人・学者。\n\n神道と民俗と文学を一つに溶かした独特の神秘主義。名は釈迢空として歌を詠んだ。' },
        { group:'研究者', name:'ロバート・グレイヴス', year:'1895–1985', country:'イギリス', theme:'詩的神話学',
          t:'ロバート・グレイヴス',
          body:'『白い女神』で、すべての詩は月の女神への祈りから生まれたと唱えた。ギリシャ神話を網羅した『ギリシャ神話』は現代の標準教科書。\n\n神話を「論理ではなく詩で読む」最初の人。小説『我、クラウディウス』もベストセラーに。' },
        { group:'研究者', name:'エディス・ハミルトン', year:'1867–1963', country:'アメリカ', theme:'古典神話の語り部',
          t:'エディス・ハミルトン',
          body:'『ギリシャ・ローマ神話』(1942)は世界中の子どもがギリシャ神話に出会う最初の本になった。\n\n60代で学校長を退いてから執筆を始め、90代まで書き続けた「遅咲きの神話の祖母」。彼女の訳した神々は今も読まれている。' },

        // ── 🎨 創造者・詩人・作家 ──
        { group:'創造者', name:'ホメロス', year:'前8世紀頃', country:'古代ギリシャ', theme:'叙事詩の起源',
          t:'ホメロス',
          body:'『イリアス』『オデュッセイア』— ギリシャ神話を今の形で伝えた盲目の吟遊詩人。存在したかも分からない伝説の人物。\n\n西洋文学はホメロスから始まった。ダンテもジョイスもカフカも、彼の12音節の詩行の末裔。' },
        { group:'創造者', name:'ダンテ・アリギエーリ', year:'1265–1321', country:'イタリア', theme:'神曲',
          t:'ダンテ',
          body:'『神曲』で地獄・煉獄・天国を旅する叙事詩を書いた。キリスト教神話とギリシャ神話を重ね合わせ、中世の世界観を永遠に固定した。\n\n詩の9行目から始まる踏破：「人生の半ばにして、気づくと暗い森にいた」。中年の危機を神話にした最初の人。' },
        { group:'創造者', name:'ウィリアム・ブレイク', year:'1757–1827', country:'イギリス', theme:'預言の詩人',
          t:'ウィリアム・ブレイク',
          body:'自ら神々を発明した — ユリゼン、ロス、オルク。既存の神話では足りない現代の魂のために、新しい神話体系を彫刻した。\n\n『無垢の歌』『経験の歌』。子どもの目で世界を見ながら、宇宙の設計図を描いた。' },
        { group:'創造者', name:'リヒャルト・ワーグナー', year:'1813–1883', country:'ドイツ', theme:'指環四部作',
          t:'ワーグナー',
          body:'26年かけて『ニーベルングの指環』4部作16時間を書いた。北欧神話とゲルマン英雄伝説を融合。\n\n一つの指輪が世界を腐敗させ、最終的にラグナロクで焼き落ちる。トールキンの『指輪物語』の直系の祖。' },
        { group:'創造者', name:'J.R.R.トールキン', year:'1892–1973', country:'イギリス', theme:'中つ国の創造',
          t:'J.R.R.トールキン',
          body:'言語学者だった。古英語・古ノルド語・ゲール語を愛し、「英語にふさわしい神話がない」と嘆いて自分で作った。\n\n『シルマリリオン』に至る膨大な創世記、エルフ語の体系、何千年の歴史。『指輪物語』『ホビット』は氷山の一角。世界そのものを造った男。' },
        { group:'創造者', name:'ホルヘ・ルイス・ボルヘス', year:'1899–1986', country:'アルゼンチン', theme:'迷宮と図書館',
          t:'ボルヘス',
          body:'「バベルの図書館」「アレフ」「分岐する小径の庭」— 形而上学を短篇小説に凝縮した。\n\n盲目になってから想像の中で書き続けた。ミノタウロス、虎、鏡 — すべてが象徴。「宇宙はすでに書かれた本で、我々はそれを読み解いているだけ」。' },
        { group:'創造者', name:'T.S.エリオット', year:'1888–1965', country:'イギリス', theme:'荒地',
          t:'T.S.エリオット',
          body:'『荒地』(1922) — フレイザー『金枝篇』に基づく現代の神話喪失の詩。聖杯伝説、漁夫王、死と再生の神。\n\n「四月は最も残酷な月」で始まる434行。第一次大戦後の「神話なき時代」の嘆き。1948年ノーベル文学賞。' },
        { group:'創造者', name:'ジェイムズ・ジョイス', year:'1882–1941', country:'アイルランド', theme:'ユリシーズ',
          t:'ジェイムズ・ジョイス',
          body:'『ユリシーズ』(1922) — ダブリンのたった一日を、ホメロス『オデュッセイア』の構造に重ねて描いた730ページの長編。\n\n現代の平凡な一日が、英雄の帰還の旅と同じ形を持つ。神話を「今、ここ」に呼び戻した20世紀の金字塔。' },
        { group:'創造者', name:'ガブリエル・ガルシア＝マルケス', year:'1927–2014', country:'コロンビア', theme:'魔術的リアリズム',
          t:'ガルシア＝マルケス',
          body:'『百年の孤独』(1967) — マコンドの街で100年間繰り返される愛と悲劇。生者と死者、現実と夢が混ざり合う。\n\n「これはラテンアメリカの神話だ」と彼自身が語った。南米の記憶を近代小説に昇華、ノーベル文学賞。' },
        { group:'創造者', name:'ニール・ゲイマン', year:'1960–', country:'イギリス／アメリカ', theme:'アメリカン・ゴッズ',
          t:'ニール・ゲイマン',
          body:'『サンドマン』コミックで夢の王モーフィアスを。『アメリカン・ゴッズ』で、忘れられつつある古い神々と、テレビ・インターネットという新しい神々の戦いを描いた。\n\n「神は、信じる者がいる限り生きる」。現代のキャンベル。' },
        { group:'創造者', name:'宮崎駿', year:'1941–', country:'日本', theme:'アニメーションの神話',
          t:'宮崎駿',
          body:'『千と千尋の神隠し』『もののけ姫』『風の谷のナウシカ』— 日本古来のアニミズム、自然の神々、まれびと思想を現代アニメで蘇らせた。\n\n柳田國男の「無名の民」と、ジブリの森。子どもと大人が同じ画面で違うものを見られる、世界唯一の神話的演出家。' },
      ]
    },
    hindu: {
      name: 'ヒンドゥー神話', emoji: '🪷', theme: 'trimurti', symbol: 'ॐ',
      subtitle: '宇宙の創造・維持・破壊',
      palette: { bg1: '#2a0a20', bg2: '#10041a', accent: '#ffb0a0' },
      chapters: [
        { t: '1. 宇宙の呼吸', body: '宇宙は無限に生まれ、無限に消える。ブラフマーが目覚めれば宇宙が創られ、眠れば宇宙は消える。\n\n彼の一日は人間の四十三億二千万年。彼の一生は百のブラフマー年。それが終わると、宇宙そのものが溶け、また新しい宇宙が始まる。' },
        { t: '2. トリムールティ', body: '三主神。ブラフマー（創造）、ヴィシュヌ（維持）、シヴァ（破壊と再生）。\n\n三者は本来一つの至高存在ブラフマンの三つの相。呼吸するように、創っては保ち、保っては壊し、壊しては新しく生む。' },
        { t: '3. ヴィシュヌの化身', body: 'ヴィシュヌは世界の危機ごとに化身（アヴァターラ）して降りてくる。魚マツヤで大洪水から人類を救い、亀クールマで海を攪拌して不死の甘露を得た。\n\nラーマとして悪王ラーヴァナを倒し、クリシュナとして戦士アルジュナにバガヴァッド・ギーターを説いた。最後の化身カルキは、終末に白馬に乗って現れる。' },
        { t: '4. シヴァの舞踏',
          svgArt: `<svg class="myth-svg" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="fireGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <radialGradient id="cosmicBG" cx="50%" cy="50%">
                <stop offset="0" stop-color="#4a1060"/>
                <stop offset="0.5" stop-color="#200840"/>
                <stop offset="1" stop-color="#040208"/>
              </radialGradient>
              <radialGradient id="fireCore" cx="50%" cy="50%">
                <stop offset="0" stop-color="#fff8c0"/>
                <stop offset="0.4" stop-color="#ffa020"/>
                <stop offset="0.8" stop-color="#c02040" stop-opacity="0.6"/>
                <stop offset="1" stop-color="#c02040" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="flameGrad" x1="0" x2="0" y1="1" y2="0">
                <stop offset="0" stop-color="#ff4020" stop-opacity="0"/>
                <stop offset="0.3" stop-color="#ff6020"/>
                <stop offset="0.7" stop-color="#ffb040"/>
                <stop offset="1" stop-color="#fff0a0"/>
              </linearGradient>
            </defs>
            <rect width="600" height="600" fill="url(#cosmicBG)"/>
            <!-- 星屑 -->
            <g fill="#ffd8ff" opacity="0.55">
              ${Array.from({length: 40}).map(() => {
                const x = (Math.random() * 600).toFixed(1);
                const y = (Math.random() * 600).toFixed(1);
                const r = (0.5 + Math.random() * 1.2).toFixed(1);
                return `<circle cx="${x}" cy="${y}" r="${r}"/>`;
              }).join('')}
            </g>
            <!-- マンダラ背景 -->
            <g transform="translate(300,300)" opacity="0.22">
              <g class="svg-rotate-slow">
                ${Array.from({length: 12}).map((_, i) => {
                  const a = (i / 12) * 360;
                  return `<path d="M 0 -240 Q -30 -200 0 -180 Q 30 -200 0 -240 Z" fill="#d080ff" transform="rotate(${a})"/>`;
                }).join('')}
              </g>
              <circle r="200" fill="none" stroke="#d080ff" stroke-width="1" stroke-dasharray="2 6"/>
              <circle r="160" fill="none" stroke="#d080ff" stroke-width="0.6"/>
            </g>
            <!-- 炎の輪（プラバーマンダラ） -->
            <g transform="translate(300,300)">
              <circle r="220" fill="url(#fireCore)" filter="url(#fireGlow)" opacity="0.75" class="svg-breathe"/>
              <!-- 24の炎 -->
              <g class="svg-rotate-reverse">
                ${Array.from({length: 24}).map((_, i) => {
                  const a = (i / 24) * 360;
                  return `<g transform="rotate(${a})"><path d="M 0 -230 Q -15 -210 -10 -180 Q -5 -200 0 -210 Q 5 -200 10 -180 Q 15 -210 0 -230 Z" fill="url(#flameGrad)" opacity="0.92"/></g>`;
                }).join('')}
              </g>
              <!-- 内側の金環 -->
              <circle r="200" fill="none" stroke="#ffd480" stroke-width="2.5" opacity="0.7"/>
              <circle r="180" fill="none" stroke="#ffa040" stroke-width="1" opacity="0.5" stroke-dasharray="1 4"/>
            </g>
            <!-- ナタラージャ（シヴァの舞姿） -->
            <g transform="translate(300,310)">
              <!-- 踏みつけるアパスマーラ（無知の悪魔） -->
              <g transform="translate(0,140)">
                <ellipse cx="0" cy="0" rx="70" ry="10" fill="#2a1a30" opacity="0.7"/>
                <circle cx="15" cy="-4" r="6" fill="#4a2a40"/>
                <path d="M -20 -2 L 30 -6 L 30 6 L -20 6 Z" fill="#4a2a40"/>
              </g>
              <!-- 左足（持ち上げ） -->
              <path d="M -5 80 Q -30 60 -60 30" stroke="#d48050" stroke-width="12" stroke-linecap="round" fill="none"/>
              <!-- 右足（踏みつける） -->
              <path d="M 5 80 Q 5 110 10 134" stroke="#d48050" stroke-width="12" stroke-linecap="round" fill="none"/>
              <!-- 胴体 -->
              <ellipse cx="0" cy="40" rx="28" ry="50" fill="#d48050"/>
              <!-- 腰布（赤い） -->
              <path d="M -30 60 Q 0 75 30 60 L 35 100 Q 0 105 -35 100 Z" fill="#c02030" stroke="#6a0a18" stroke-width="1"/>
              <!-- 首 -->
              <rect x="-6" y="-12" width="12" height="14" fill="#d48050"/>
              <!-- 青い首の毒（ニーラカンタ） -->
              <rect x="-6" y="-6" width="12" height="4" fill="#4060a0"/>
              <!-- 頭 -->
              <circle cx="0" cy="-28" r="22" fill="#d48050"/>
              <!-- 髪（黒い長髪、放射状に広がる） -->
              <g transform="translate(0,-28)">
                ${Array.from({length: 14}).map((_, i) => {
                  const a = 180 + (i / 14) * 180;
                  const rad = a * Math.PI / 180;
                  const x1 = Math.cos(rad) * 18;
                  const y1 = Math.sin(rad) * 18;
                  const x2 = Math.cos(rad) * (30 + (i % 3) * 8);
                  const y2 = Math.sin(rad) * (30 + (i % 3) * 8);
                  return `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${(x2*0.6).toFixed(1)} ${(y2*1.2).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#1a0a1a" stroke-width="2" fill="none"/>`;
                }).join('')}
              </g>
              <!-- 三日月（髪に） -->
              <path d="M -22 -42 A 6 6 0 0 1 -10 -42 A 4 4 0 0 0 -22 -42 Z" fill="#ffe890"/>
              <!-- 第三の眼（額） -->
              <circle cx="0" cy="-32" r="1.5" fill="#ff4020" class="svg-pulse"/>
              <!-- 目 -->
              <ellipse cx="-6" cy="-28" rx="2" ry="1" fill="#1a1a1a"/>
              <ellipse cx="6" cy="-28" rx="2" ry="1" fill="#1a1a1a"/>
              <!-- 4本の腕 -->
              <!-- 右上腕（ダマル太鼓を持つ） -->
              <path d="M 20 20 Q 60 -10 85 -30" stroke="#d48050" stroke-width="10" stroke-linecap="round" fill="none"/>
              <!-- 太鼓 -->
              <g transform="translate(92,-38)">
                <rect x="-8" y="-5" width="16" height="10" fill="#8a5020" stroke="#4a2010" stroke-width="1"/>
                <ellipse cx="-8" cy="0" rx="3" ry="5" fill="#d8b080"/>
                <ellipse cx="8" cy="0" rx="3" ry="5" fill="#d8b080"/>
              </g>
              <!-- 左上腕（火を持つ） -->
              <path d="M -20 20 Q -60 -10 -85 -30" stroke="#d48050" stroke-width="10" stroke-linecap="round" fill="none"/>
              <!-- 火 -->
              <g transform="translate(-90,-40)" class="svg-pulse">
                <path d="M 0 0 Q -4 -10 0 -14 Q 4 -10 0 0 Z" fill="#ffa040"/>
                <path d="M 0 -3 Q -2 -8 0 -10 Q 2 -8 0 -3 Z" fill="#fff4c0"/>
              </g>
              <!-- 右下腕（アバヤ・ムドラ、恐れるなの手印） -->
              <path d="M 15 45 Q 55 60 75 55" stroke="#d48050" stroke-width="9" stroke-linecap="round" fill="none"/>
              <circle cx="80" cy="55" r="7" fill="#d48050"/>
              <!-- 手のひら線 -->
              <path d="M 76 50 L 84 50 M 76 55 L 84 55" stroke="#8a4020" stroke-width="0.6"/>
              <!-- 左下腕（ガジャ・ハスタ、足を指す） -->
              <path d="M -15 45 Q -40 60 -55 75" stroke="#d48050" stroke-width="9" stroke-linecap="round" fill="none"/>
              <!-- 首の蛇 -->
              <path d="M -14 -8 Q -20 -15 -10 -18 Q 0 -20 10 -18 Q 20 -15 14 -8" stroke="#2a6a3a" stroke-width="2.5" fill="none"/>
              <circle cx="-16" cy="-10" r="2" fill="#2a6a3a"/>
              <!-- 装飾の金 -->
              <circle cx="0" cy="15" r="3" fill="#ffd880"/>
              <circle cx="-20" cy="30" r="2" fill="#ffd880"/>
              <circle cx="20" cy="30" r="2" fill="#ffd880"/>
            </g>
            <!-- サンスクリット風ラベル -->
            <text x="300" y="40" text-anchor="middle" fill="#ffd880" font-size="16" letter-spacing="0.4em" opacity="0.9" font-family="Cormorant Garamond" font-style="italic">ŚIVA NAṬARĀJA</text>
            <text x="300" y="58" text-anchor="middle" fill="#d080ff" font-size="10" letter-spacing="0.3em" opacity="0.6" font-family="Cormorant Garamond">— COSMIC DANCE —</text>
            <text x="300" y="575" text-anchor="middle" fill="#ffa050" font-size="10" letter-spacing="0.2em" opacity="0.65">宇宙を焼き尽くし、再び創る者</text>
          </svg>`,
          caption: 'ナタラージャ — 宇宙の破壊と再生の舞',
          body: 'シヴァは破壊神にして、再生の神。額に第三の眼、首に蛇、髪に月とガンジス川の女神を宿す。\n\n宇宙を焼き尽くす時、彼はナタラージャとして舞を踊る。その炎が古い世界を清め、次の世界への扉を開く。' },
        { t: '5. 女神たちの力', body: 'すべての神にはシャクティ（女神の力）がある。ブラフマーにはサラスヴァティー（学問）、ヴィシュヌにはラクシュミー（富）、シヴァにはパールヴァティー。\n\nそして破壊の女神カーリー。シヴァが倒せぬ悪魔を首を切って飲み干し、血が地に落ちぬようにした。舌は血に染まる。' },
        { t: '6. ガネーシャの誕生', body: 'シヴァが遠征中、妻パールヴァティーは自分の体の垢から息子を作り、浴室の番をさせた。戻ってきたシヴァは見知らぬ子に道を塞がれ、激怒して首を刎ねた。\n\n妻に怒られ、通りすがりの最初の動物の首を代わりにつけると約束し、それが象だった。\n\nこうして障害を取り除く神、ガネーシャは生まれた。' },
      ]
    },
  };

  // 旧データは参考に残す（星の王子様は宇宙モードへ移植）
  const MYTH_WORLDS = {
    japan: {
      name: '日本神話', sky: '#1a0a24', accent: '#ffd8a0',
      subtitle: '古事記・日本書紀の八百万',
      entities: [
        { id:'amaterasu', name:'天照大神', role:'太陽神', color:'#ffe890', emoji:'☀️', story:'高天原を統べる太陽の女神。天岩戸に隠れ世界が闇に。神楽で笑わせ引き出された。' },
        { id:'tsukuyomi', name:'月読命', role:'月神', color:'#c0d0ff', emoji:'🌙', story:'夜の世界を司る月の神。保食神を斬り、姉アマテラスと袂を分かつ。' },
        { id:'susanoo', name:'須佐之男命', role:'嵐神', color:'#7a5cc8', emoji:'⚡', story:'海原の暴神。高天原で暴れ追放された後、ヤマタノオロチを退治し草薙剣を得た。' },
        { id:'izanagi', name:'伊邪那岐', role:'創造神', color:'#8a6aa0', emoji:'🗡', story:'妻イザナミと日本列島を生んだ男神。黄泉の国から逃げ帰り三貴子を生んだ。' },
        { id:'izanami', name:'伊邪那美', role:'大地母', color:'#7a3a5a', emoji:'🌿', story:'国生みの女神。火の神カグツチ出産で死に、黄泉で変わり果てた姿に。' },
        { id:'okuninushi', name:'大国主', role:'国つ神', color:'#d08850', emoji:'🐇', story:'出雲を治める地上の王。因幡の白兎、国譲り神話で知られる縁結びの神。' },
      ]
    },
    greek: {
      name: 'ギリシャ神話', sky: '#0a1a2a', accent: '#fff0a8',
      subtitle: 'オリンポスの十二神',
      entities: [
        { id:'zeus', name:'ゼウス', role:'主神・雷神', color:'#ffd650', emoji:'⚡', story:'天空を支配する神々の王。雷霆を武器に世界を治める。浮気癖で数々の神話を生んだ。' },
        { id:'poseidon', name:'ポセイドン', role:'海神', color:'#4090d0', emoji:'🔱', story:'三叉矛で海を治める。地震の神でもあり、アテナとアテネの都を争った。' },
        { id:'hades', name:'ハデス', role:'冥界王', color:'#4a2a60', emoji:'💀', story:'死者の国を治める神。ペルセポネを奪い妻とした。姿を隠す兜を所有。' },
        { id:'athena', name:'アテナ', role:'知恵と戦争', color:'#a0c8f0', emoji:'🦉', story:'ゼウスの額から武装して生まれた女神。戦略・工芸・知恵の守護者、アテネの守護神。' },
        { id:'apollo', name:'アポロン', role:'太陽・芸術', color:'#ffb850', emoji:'🎵', story:'太陽・音楽・予言・医術の神。デルフォイの神託を司る光輝く青年神。' },
        { id:'artemis', name:'アルテミス', role:'月・狩猟', color:'#e0e0ff', emoji:'🏹', story:'アポロンの双子の妹。月・狩猟・純潔の女神。弓矢と森を愛する。' },
        { id:'aphrodite', name:'アフロディーテ', role:'愛と美', color:'#ffa0c0', emoji:'🌹', story:'海の泡から生まれた愛と美の女神。トロイア戦争の引き金となる。' },
        { id:'hermes', name:'ヘルメス', role:'伝令神', color:'#d0a0ff', emoji:'🪶', story:'翼の生えたサンダルで神々の伝令を務める。旅人・商人・盗賊の守護神。' },
      ]
    },
    norse: {
      name: '北欧神話', sky: '#0a1428', accent: '#b0d0ff',
      subtitle: 'アースガルドの神々',
      entities: [
        { id:'odin', name:'オーディン', role:'主神', color:'#8a6a4a', emoji:'🦅', story:'世界樹ユグドラシルで知恵を得るため片目を捧げた全父。ワルキューレを従える。' },
        { id:'thor', name:'トール', role:'雷神', color:'#c04040', emoji:'🔨', story:'ミョルニルを持つ雷霆の神。巨人族と戦い続ける、最強の戦士。' },
        { id:'loki', name:'ロキ', role:'詐術神', color:'#50c080', emoji:'🎭', story:'巨人の血を引くトリックスター。神々の敵にして同盟者、ラグナロクの引き金。' },
        { id:'freya', name:'フレイヤ', role:'愛と戦の女神', color:'#ffa0a0', emoji:'🐱', story:'美と愛、豊穣の女神。戦死者の半分を連れていく、黄金のネックレス・ブリーシンガメンの持ち主。' },
        { id:'heimdall', name:'ヘイムダル', role:'番人', color:'#e0f0ff', emoji:'🎺', story:'虹の橋ビフレストの守護者。ラグナロクの訪れを角笛で告げる。' },
      ]
    },
    egypt: {
      name: 'エジプト神話', sky: '#2a1a0a', accent: '#ffc850',
      subtitle: 'ナイルの神々',
      entities: [
        { id:'ra', name:'ラー', role:'太陽神', color:'#ffd040', emoji:'☀️', story:'ハヤブサ頭の太陽神。毎日天を渡り、夜は地下界で蛇アポフィスと戦う。' },
        { id:'osiris', name:'オシリス', role:'冥界王', color:'#40a060', emoji:'👑', story:'農業と死後の世界の神。弟セトに殺され、妻イシスによって復活する。' },
        { id:'isis', name:'イシス', role:'母神・魔術', color:'#d090c0', emoji:'🪄', story:'魔術と母性の女神。夫オシリスを蘇らせ、息子ホルスを守り育てた。' },
        { id:'anubis', name:'アヌビス', role:'死者の導き手', color:'#303040', emoji:'🐺', story:'ジャッカル頭の神。ミイラ作りと死者の心臓を秤る裁きを司る。' },
        { id:'horus', name:'ホルス', role:'王権・空', color:'#5090c0', emoji:'🦅', story:'ハヤブサ頭の天空神。父オシリスの仇セトと戦い、ファラオの守護神となった。' },
      ]
    },
    hindu: {
      name: 'ヒンドゥー神話', sky: '#2a0a20', accent: '#ffb0a0',
      subtitle: '三主神（トリムールティ）と女神',
      entities: [
        { id:'brahma', name:'ブラフマー', role:'創造神', color:'#ffe0a0', emoji:'🕊', story:'四つの顔と腕を持つ宇宙の創造者。ヴェーダを司る。' },
        { id:'vishnu', name:'ヴィシュヌ', role:'維持神', color:'#4080c0', emoji:'🌀', story:'十の化身（アヴァターラ）で世界を救う維持の神。ラーマとクリシュナも彼の姿。' },
        { id:'shiva', name:'シヴァ', role:'破壊と再生', color:'#6040a0', emoji:'🔱', story:'第三の眼を持つ破壊と再生の神。宇宙を踊りで破壊し再び創造する舞神。' },
        { id:'lakshmi', name:'ラクシュミー', role:'富と美', color:'#ffc080', emoji:'🪷', story:'ヴィシュヌの妻。蓮の上に座す富と美、豊穣の女神。' },
        { id:'saraswati', name:'サラスヴァティー', role:'知と芸術', color:'#ffffff', emoji:'🎶', story:'ブラフマーの妻。ヴィーナ（琵琶）を奏でる学問・音楽・川の女神。日本では弁財天。' },
        { id:'ganesha', name:'ガネーシャ', role:'障害除去', color:'#ffa050', emoji:'🐘', story:'シヴァとパールヴァティーの息子。象の頭を持つ幸運の神、学問と商売繁盛。' },
      ]
    },
    prince: {
      name: '星の王子様', sky: '#050a2a', accent: '#ffd080',
      subtitle: 'サン=テグジュペリの小さな惑星たち',
      entities: [
        { id:'b612', name:'B-612', role:'王子の故郷', color:'#80d0a0', emoji:'🌹',
          story:'王子が暮らす直径わずか家一軒ほどの小惑星。三つのバオバブの芽と、たった一輪のバラ。「大切なものは目には見えない」はここから始まった。' },
        { id:'rose', name:'バラ', role:'たった一人の', color:'#ff6080', emoji:'🌷',
          story:'王子を気難しく困らせる、唯一の。世界に5千万本のバラがあっても、彼が愛したのは彼女ただ一人。「時間をかけたから特別なんだ」。' },
        { id:'king', name:'王の星', role:'第325惑星', color:'#d04040', emoji:'👑',
          story:'星に一人、命じる相手がいなくても「命じなさい」と命じる王。権威の虚しさ、そして「自分自身を裁くことが最も難しい」と教えた。' },
        { id:'vainman', name:'うぬぼれ屋の星', role:'第326惑星', color:'#e0a040', emoji:'🎩',
          story:'「賞賛して！」という言葉しか聞こえない男。鏡に向かって礼をする。' },
        { id:'drunkard', name:'のんだくれの星', role:'第327惑星', color:'#5a3a20', emoji:'🍾',
          story:'「飲むことを忘れるために飲む」の輪。王子を最も悲しませた星。' },
        { id:'business', name:'実業家の星', role:'第328惑星', color:'#4a4a4a', emoji:'💼',
          story:'5億2百50万の星を数え、金庫にしまう男。「所有する」とは何かを問いかけた星。' },
        { id:'lamp', name:'点灯夫の星', role:'第329惑星', color:'#f0c040', emoji:'🕯',
          story:'1分で自転する星で1分ごとに街灯を点け消す男。指令に忠実。王子は彼だけを友と呼べた。' },
        { id:'geographer', name:'地理学者の星', role:'第330惑星', color:'#8a6a4a', emoji:'📜',
          story:'自分の星を一度も歩いたことのない地理学者。王子は「地球」に向かうことを決めた。' },
        { id:'fox', name:'キツネ', role:'地球にて', color:'#ff9050', emoji:'🦊',
          story:'「飼いならす」ことを教えてくれた賢者。「心で見なくちゃ、ものごとはよく見えない。肝心なことは、目に見えないんだよ」。' },
        { id:'snake', name:'ヘビ', role:'砂漠にて', color:'#404040', emoji:'🐍',
          story:'「私が触れたものは、私が触れる前にいた場所に還る」。王子が星に帰るためのやさしい毒を持つ、黄金色の蛇。' },
        { id:'pilot', name:'飛行士', role:'砂漠で出会った', color:'#a0c0e0', emoji:'✈️',
          story:'ヒツジの絵を頼まれ、箱を描いた大人。王子に「心で見る」を学ばされ、物語の語り手となった。' },
      ]
    },
  };

  async function openMythology() {
    const ov = document.createElement('div');
    ov.className = 'tale-overlay';
    const ids = Object.keys(MYTH_STORIES);
    const coverHTML = ids.map(k => {
      const s = MYTH_STORIES[k];
      return `
        <button class="tale-cover" data-tale="${k}" style="background: linear-gradient(165deg, ${s.palette.bg1}, ${s.palette.bg2});">
          <div class="tale-cover-glyph">${s.symbol || s.emoji}</div>
          <div class="tale-cover-emoji">${s.emoji}</div>
          <div class="tale-cover-name">${s.name}</div>
          <div class="tale-cover-sub">${s.subtitle}</div>
          <div class="tale-cover-chapters">全${s.chapters.length}章</div>
          <div class="tale-cover-open">ひらく  ›</div>
        </button>
      `;
    }).join('');
    ov.innerHTML = `
      <button class="tale-close" aria-label="閉じる">×</button>
      <div class="tale-home" id="taleHome">
        <div class="tale-stars" aria-hidden="true"></div>
        <div class="tale-home-head">
          <div class="tale-home-super">G E N E S I S</div>
          <div class="tale-home-title">はじまりの書</div>
          <div class="tale-home-sub">──  世界が始まる前、人はどんな話を語り合ったか</div>
        </div>
        <div class="tale-grid">${coverHTML}</div>
        <button class="myth-museum-btn" id="mythMuseumBtn">
          <span class="mmb-icon">🏛</span>
          <span class="mmb-body">
            <span class="mmb-title">美 術 館</span>
            <span class="mmb-sub">神話を描いた名画を、ホールで鑑賞する</span>
          </span>
          <span class="mmb-arrow">›</span>
        </button>
        <div class="tale-home-foot">すべての神話は、宇宙を理解しようとした人の心の形。</div>
      </div>
      <div class="tale-reader" id="taleReader">
        <div class="tale-atmos" id="taleAtmos"></div>
        <button class="tale-back" id="taleBack">← 戻る</button>
        <div class="tale-progress" id="taleProgress"></div>
        <div class="tale-chapter-num" id="taleChapterNum"></div>
        <div class="tale-chapter-title" id="taleChapterTitle"></div>
        <div class="tale-chapter-body" id="taleChapterBody"></div>
        <div class="tale-nav">
          <button class="tale-prev" id="talePrev">◀ 前</button>
          <button class="tale-next" id="taleNext">次 ▶</button>
        </div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.tale-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 400);
    });

    let curKey = null, curIdx = 0;
    const home = ov.querySelector('#taleHome');
    const reader = ov.querySelector('#taleReader');
    const atmos = ov.querySelector('#taleAtmos');

    // 大気的な背景: シンプルな流れる粒子とグラデ
    let atmosRAF = 0;
    let atmosCanvas = null, atmosCtx = null, atmosParticles = [];
    function setupAtmos(palette) {
      if (atmosCanvas) { cancelAnimationFrame(atmosRAF); atmosCanvas.remove(); }
      atmosCanvas = document.createElement('canvas');
      atmosCanvas.width = window.innerWidth;
      atmosCanvas.height = window.innerHeight;
      atmos.appendChild(atmosCanvas);
      atmosCtx = atmosCanvas.getContext('2d');
      atmos.style.background = `radial-gradient(ellipse at center, ${palette.bg1}, ${palette.bg2})`;
      atmosParticles = [];
      const N = 80;
      for (let i = 0; i < N; i++) {
        atmosParticles.push({
          x: Math.random() * atmosCanvas.width,
          y: Math.random() * atmosCanvas.height,
          r: 0.5 + Math.random() * 2,
          vy: 0.1 + Math.random() * 0.3,
          vx: (Math.random() - 0.5) * 0.1,
          alpha: 0.2 + Math.random() * 0.5,
        });
      }
      function tick() {
        atmosCtx.clearRect(0, 0, atmosCanvas.width, atmosCanvas.height);
        atmosParticles.forEach(p => {
          p.y += p.vy;
          p.x += p.vx;
          if (p.y > atmosCanvas.height) { p.y = -5; p.x = Math.random() * atmosCanvas.width; }
          atmosCtx.fillStyle = `rgba(255,240,180,${p.alpha})`;
          atmosCtx.beginPath();
          atmosCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          atmosCtx.fill();
        });
        atmosRAF = requestAnimationFrame(tick);
      }
      tick();
    }

    function openTale(k) {
      curKey = k; curIdx = 0;
      home.classList.remove('show');
      reader.classList.add('show');
      setupAtmos(MYTH_STORIES[k].palette);
      if (MYTH_STORIES[k].isGallery) renderGallery();
      else renderChapter();
    }
    function renderGallery() {
      const s = MYTH_STORIES[curKey];
      const groups = {};
      s.chapters.forEach(c => { (groups[c.group] = groups[c.group] || []).push(c); });
      const progressEl = ov.querySelector('#taleProgress');
      if (progressEl) progressEl.innerHTML = '';
      const numEl = ov.querySelector('#taleChapterNum');
      if (numEl) numEl.textContent = `${s.emoji} ${s.name}`;
      const titleEl = ov.querySelector('#taleChapterTitle');
      if (titleEl) titleEl.textContent = s.subtitle;
      titleEl.classList.remove('fade-in'); void titleEl.offsetWidth; titleEl.classList.add('fade-in');
      const body = ov.querySelector('#taleChapterBody');
      body.classList.remove('fade-in'); void body.offsetWidth; body.classList.add('fade-in');
      body.innerHTML = Object.keys(groups).map(gn => `
        <div class="keepers-group">
          <h3 class="keepers-group-title">${gn === '研究者' ? '🔬 研究者 — 神話を学問にした者' : '🎨 創造者 — 神話を新しく作った者'}</h3>
          <div class="keepers-grid">
            ${groups[gn].map((c, i) => `
              <button class="keeper-card" data-keeper="${c.name}">
                <div class="keeper-name">${c.name}</div>
                <div class="keeper-year">${c.year || ''}</div>
                <div class="keeper-country">${c.country || ''}</div>
                <div class="keeper-theme">${c.theme || ''}</div>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('');
      // ナビは隠す
      ov.querySelector('.tale-nav').style.display = 'none';
      // カードクリックでモーダル
      body.querySelectorAll('.keeper-card').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.keeper;
          const c = s.chapters.find(x => x.name === name);
          if (!c) return;
          openKeeperModal(c);
        });
      });
    }
    function openKeeperModal(c) {
      const m = document.createElement('div');
      m.className = 'keeper-modal-overlay';
      m.innerHTML = `
        <div class="keeper-modal">
          <button class="keeper-modal-close" aria-label="閉じる">×</button>
          <div class="keeper-modal-group">${c.group === '研究者' ? '🔬 研究者' : '🎨 創造者'}</div>
          <div class="keeper-modal-name">${c.name}</div>
          <div class="keeper-modal-meta">${c.year || ''}　／　${c.country || ''}</div>
          <div class="keeper-modal-theme">${c.theme || ''}</div>
          <div class="keeper-modal-body">${c.body.replace(/\n/g, '<br>')}</div>
        </div>
      `;
      ov.appendChild(m);
      requestAnimationFrame(() => m.classList.add('show'));
      const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 280); };
      m.querySelector('.keeper-modal-close').addEventListener('click', close);
      m.addEventListener('click', e => { if (e.target === m) close(); });
    }
    function renderChapter() {
      const s = MYTH_STORIES[curKey];
      if (s.isGallery) { renderGallery(); return; }
      ov.querySelector('.tale-nav').style.display = '';
      const c = s.chapters[curIdx];
      ov.querySelector('#taleProgress').innerHTML = s.chapters.map((_, i) =>
        `<span class="tp-dot ${i === curIdx ? 'active' : i < curIdx ? 'done' : ''}"></span>`
      ).join('');
      ov.querySelector('#taleChapterNum').textContent = `${s.emoji} ${s.name} — 第${curIdx + 1}章 / ${s.chapters.length}`;
      ov.querySelector('#taleChapterTitle').textContent = c.t;
      // SVG アート優先、なければ PD 名画
      let artHTML = '';
      if (c.svgArt) {
        artHTML = `<figure class="tale-art">${c.svgArt}${c.caption ? `<figcaption>${c.caption}　<span class="tale-pd">Original SVG</span></figcaption>` : ''}</figure>`;
      } else if (c.img) {
        artHTML = `<figure class="tale-art"><img src="${c.img}" alt="${c.caption || c.t}" loading="lazy" onerror="this.closest('figure').classList.add('tale-art-fail')"/>${c.caption ? `<figcaption>${c.caption}　<span class="tale-pd">Public Domain</span></figcaption>` : ''}</figure>`;
      }
      // 🎨 アクションボタン群
      const actions = [];
      if (c.scene3D === 'eden') actions.push(`<button class="tale-action tale-action-3d" data-act="eden3d">🌳 3Dで庭園に入る</button>`);
      if (c.scene3D === 'babel') actions.push(`<button class="tale-action tale-action-babel" data-act="babel3d">🏛 バベルの塔を登る</button>`);
      if (c.img) actions.push(`<button class="tale-action tale-action-gallery" data-act="museum" data-src="${c.img}" data-caption="${c.caption || ''}">🖼 美術館で見る</button>`);
      const actionHTML = actions.length ? `<div class="tale-actions">${actions.join('')}</div>` : '';
      const bodyHTML = artHTML + actionHTML + '<div class="tale-chapter-text">' + c.body.replace(/\n/g, '<br>') + '</div>';
      ov.querySelector('#taleChapterBody').innerHTML = bodyHTML;
      ov.querySelector('#taleChapterTitle').classList.remove('fade-in');
      ov.querySelector('#taleChapterBody').classList.remove('fade-in');
      void ov.querySelector('#taleChapterTitle').offsetWidth;
      ov.querySelector('#taleChapterTitle').classList.add('fade-in');
      ov.querySelector('#taleChapterBody').classList.add('fade-in');
      ov.querySelector('#talePrev').disabled = curIdx === 0;
      ov.querySelector('#taleNext').textContent = curIdx === s.chapters.length - 1 ? '終わり ★' : '次 ▶';
      // アクションボタン配線
      ov.querySelectorAll('.tale-action').forEach(b => {
        b.addEventListener('click', () => {
          if (b.dataset.act === 'eden3d') openEden3D();
          else if (b.dataset.act === 'babel3d') openBabel3D();
          else if (b.dataset.act === 'museum') openMuseum(b.dataset.src, b.dataset.caption);
        });
      });
    }
    ov.querySelectorAll('.tale-cover').forEach(b => {
      b.addEventListener('click', () => openTale(b.dataset.tale));
    });
    const mmBtn = ov.querySelector('#mythMuseumBtn');
    if (mmBtn) mmBtn.addEventListener('click', () => openMythMuseum());
    ov.querySelector('#taleBack').addEventListener('click', () => {
      reader.classList.remove('show');
      home.classList.add('show');
      cancelAnimationFrame(atmosRAF);
      if (atmosCanvas) { atmosCanvas.remove(); atmosCanvas = null; }
    });
    ov.querySelector('#taleNext').addEventListener('click', () => {
      const s = MYTH_STORIES[curKey];
      if (curIdx < s.chapters.length - 1) { curIdx++; renderChapter(); }
      else {
        reader.classList.remove('show');
        home.classList.add('show');
        cancelAnimationFrame(atmosRAF);
        if (atmosCanvas) { atmosCanvas.remove(); atmosCanvas = null; }
      }
    });
    ov.querySelector('#talePrev').addEventListener('click', () => {
      if (curIdx > 0) { curIdx--; renderChapter(); }
    });
    // 初期: ホーム表示
    home.classList.add('show');
  }
  window.openMythology = openMythology;

  // ============================================================
  // 🌳 3Dエデンの園（Three.jsで没入型シーン）
  // ============================================================
  // 🌟 共通：手書きBloom（明るい部分を抽出→ガウシアンぼかし→加算合成）
  function createBloom(THREE, renderer, W, H, opts = {}) {
    const threshold = opts.threshold ?? 0.7;
    const strength = opts.strength ?? 0.9;
    const makeRT = (w, h) => new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.HalfFloatType,
    });
    const rtScene = makeRT(W, H);
    const rtBright = makeRT(W / 2, H / 2);
    const rtBlurA = makeRT(W / 2, H / 2);
    const rtBlurB = makeRT(W / 2, H / 2);
    const rtBlurC = makeRT(W / 4, H / 4);
    const rtBlurD = makeRT(W / 4, H / 4);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const qScene = new THREE.Scene();
    const qMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    qScene.add(qMesh);
    const brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, threshold: { value: threshold } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float threshold;
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          float br = smoothstep(threshold, threshold + 0.25, lum);
          gl_FragColor = vec4(c * br, 1.0);
        }
      `,
    });
    function makeBlurMat(w, h) {
      return new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          direction: { value: new THREE.Vector2(1, 0) },
          resolution: { value: new THREE.Vector2(w, h) },
        },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
        fragmentShader: `
          varying vec2 vUv;
          uniform sampler2D tDiffuse;
          uniform vec2 direction;
          uniform vec2 resolution;
          void main(){
            vec2 px = direction / resolution;
            vec3 c = vec3(0.0);
            c += texture2D(tDiffuse, vUv - px*4.0).rgb * 0.051;
            c += texture2D(tDiffuse, vUv - px*3.0).rgb * 0.0918;
            c += texture2D(tDiffuse, vUv - px*2.0).rgb * 0.1227;
            c += texture2D(tDiffuse, vUv - px).rgb * 0.1545;
            c += texture2D(tDiffuse, vUv).rgb * 0.1826;
            c += texture2D(tDiffuse, vUv + px).rgb * 0.1545;
            c += texture2D(tDiffuse, vUv + px*2.0).rgb * 0.1227;
            c += texture2D(tDiffuse, vUv + px*3.0).rgb * 0.0918;
            c += texture2D(tDiffuse, vUv + px*4.0).rgb * 0.051;
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      });
    }
    const blurMatHalf = makeBlurMat(W / 2, H / 2);
    const blurMatQuarter = makeBlurMat(W / 4, H / 4);
    const compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tBloom1: { value: null },
        tBloom2: { value: null },
        strength: { value: strength },
        uTime: { value: 0 },
        uVignette: { value: opts.vignette ?? 0.45 },      // 0-1, 周辺減光の強さ
        uChromatic: { value: opts.chromatic ?? 0.003 },   // 色収差の強さ
        uGrain: { value: opts.grain ?? 0.035 },           // フィルムグレイン
        uSaturation: { value: opts.saturation ?? 1.08 },  // 彩度持ち上げ
        uLift: { value: opts.lift ?? 0.0 },               // 黒レベル
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tScene;
        uniform sampler2D tBloom1;
        uniform sampler2D tBloom2;
        uniform float strength;
        uniform float uTime;
        uniform float uVignette;
        uniform float uChromatic;
        uniform float uGrain;
        uniform float uSaturation;
        uniform float uLift;

        // 疑似乱数（グレイン用）
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

        void main(){
          vec2 center = vec2(0.5);
          vec2 dir = vUv - center;
          float dist = length(dir);

          // 🔴 Chromatic Aberration (色収差) — 画面端に向かってRGBずれ
          vec2 caOff = dir * uChromatic * (0.5 + dist * 1.5);
          float r = texture2D(tScene, vUv - caOff).r;
          float g = texture2D(tScene, vUv).g;
          float b = texture2D(tScene, vUv + caOff).b;
          vec3 s = vec3(r, g, b);

          // Bloom
          vec3 b1 = texture2D(tBloom1, vUv).rgb;
          vec3 b2 = texture2D(tBloom2, vUv).rgb;
          vec3 bloom = b1 * 0.6 + b2 * 0.8;
          vec3 col = s + bloom * strength;

          // Lift（黒レベル調整）
          col += vec3(uLift);

          // 彩度
          float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(lum), col, uSaturation);

          // 🎞 Vignette (周辺減光)
          float vig = smoothstep(0.8, 0.3, dist);
          col *= mix(1.0 - uVignette, 1.0, vig);

          // 🎞 Film grain (細かいノイズ)
          float grain = hash(vUv * 1000.0 + uTime * 0.1) - 0.5;
          col += grain * uGrain;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    return {
      setSize(w, h) {
        rtScene.setSize(w, h);
        rtBright.setSize(w / 2, h / 2);
        rtBlurA.setSize(w / 2, h / 2);
        rtBlurB.setSize(w / 2, h / 2);
        rtBlurC.setSize(w / 4, h / 4);
        rtBlurD.setSize(w / 4, h / 4);
        blurMatHalf.uniforms.resolution.value.set(w / 2, h / 2);
        blurMatQuarter.uniforms.resolution.value.set(w / 4, h / 4);
      },
      render(scene, camera) {
        compositeMat.uniforms.uTime.value = performance.now() * 0.001;
        // 1. Scene → rtScene
        renderer.setRenderTarget(rtScene);
        renderer.render(scene, camera);
        // 2. Bright → rtBright
        qMesh.material = brightMat;
        brightMat.uniforms.tDiffuse.value = rtScene.texture;
        renderer.setRenderTarget(rtBright);
        renderer.render(qScene, ortho);
        // 3. Blur H→A
        qMesh.material = blurMatHalf;
        blurMatHalf.uniforms.tDiffuse.value = rtBright.texture;
        blurMatHalf.uniforms.direction.value.set(1, 0);
        renderer.setRenderTarget(rtBlurA);
        renderer.render(qScene, ortho);
        // 4. Blur V→B
        blurMatHalf.uniforms.tDiffuse.value = rtBlurA.texture;
        blurMatHalf.uniforms.direction.value.set(0, 1);
        renderer.setRenderTarget(rtBlurB);
        renderer.render(qScene, ortho);
        // 5. Downsample B→C (H blur)
        qMesh.material = blurMatQuarter;
        blurMatQuarter.uniforms.tDiffuse.value = rtBlurB.texture;
        blurMatQuarter.uniforms.direction.value.set(1, 0);
        renderer.setRenderTarget(rtBlurC);
        renderer.render(qScene, ortho);
        // 6. C→D (V blur)
        blurMatQuarter.uniforms.tDiffuse.value = rtBlurC.texture;
        blurMatQuarter.uniforms.direction.value.set(0, 1);
        renderer.setRenderTarget(rtBlurD);
        renderer.render(qScene, ortho);
        // 7. Composite
        qMesh.material = compositeMat;
        compositeMat.uniforms.tScene.value = rtScene.texture;
        compositeMat.uniforms.tBloom1.value = rtBlurB.texture;
        compositeMat.uniforms.tBloom2.value = rtBlurD.texture;
        renderer.setRenderTarget(null);
        renderer.render(qScene, ortho);
      },
    };
  }

  async function openEden3D() {
    if (!window.THREE) return;
    const THREE = window.THREE;
    // addonsの到着を待つ（ベストエフォート）
    if (window.THREE_READY) { try { await window.THREE_READY; } catch {} }
    const ADDONS = window.THREE_ADDONS || {};
    const ov = document.createElement('div');
    ov.className = 'eden3d-overlay';
    ov.innerHTML = `
      <button class="eden3d-close" aria-label="閉じる">×</button>
      <div class="eden3d-stage" id="eden3dStage"></div>
      <div class="eden3d-hint">ドラッグで視点を回す　／　ピンチでズーム</div>
      <div class="eden3d-title">エデンの園</div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    let running = true;
    ov.querySelector('.eden3d-close').addEventListener('click', () => {
      running = false;
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 400);
    });

    const stage = ov.querySelector('#eden3dStage');
    const W = stage.clientWidth || window.innerWidth;
    const H = stage.clientHeight || window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.setSize(W, H);
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    // 影（本格的な奥行き）
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // WebXR は composer と競合するので一時無効
    stage.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene();

    // 先行定義：composer内でも使うため
    const SUN_POS = new THREE.Vector3(22, 28, -42);
    // 動的環境反射マップ（リンゴ・蛇の envMap として共有）
    let edenCubeCam = null, edenCubeRT = null;
    try {
      edenCubeRT = new THREE.WebGLCubeRenderTarget(128, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
      edenCubeCam = new THREE.CubeCamera(0.1, 100, edenCubeRT);
      edenCubeCam.position.set(0, 4, 0);
    } catch (e) { console.warn('Eden cubeCam', e); }

    // 🌟 ポストプロセス：公式 EffectComposer + UnrealBloomPass（利用可能なら）
    let composer = null;
    const usePro = ADDONS.EffectComposer && ADDONS.RenderPass && ADDONS.UnrealBloomPass;
    // 宣言のみ、scene / camera 設定後に composer を組む
    // 空のグラデ（半球光）
    scene.background = new THREE.Color(0x6a4030);
    const hemi = new THREE.HemisphereLight(0xffd8a8, 0x3a5a28, 0.75);
    scene.add(hemi);
    const sunLight = new THREE.DirectionalLight(0xffe8a8, 1.6);
    sunLight.position.set(8, 14, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(512, 512);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -16; sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 16; sunLight.shadow.camera.bottom = -6;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.radius = 3;
    scene.add(sunLight);
    // リムライト（背面から紫がかった冷色で輪郭を強調）
    const rimLight = new THREE.DirectionalLight(0x8080ff, 0.35);
    rimLight.position.set(-6, 8, -10);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0x402020, 0.25));

    const camera = new THREE.PerspectiveCamera(48, W/H, 0.1, 500);
    camera.position.set(0, 6, 18);
    camera.lookAt(0, 4.5, 0);

    // ✨ EffectComposer パイプライン（公式Bloom + 手書きGrade）
    let bloom = null; // fallback用
    let edenOutlinePass = null;
    if (usePro) try {
      composer = new ADDONS.EffectComposer(renderer);
      composer.addPass(new ADDONS.RenderPass(scene, camera));
      // TAA/SSAO は重すぎるので一時除外（体感FPS優先）
      const bloomPass = new ADDONS.UnrealBloomPass(
        new THREE.Vector2(W, H),
        0.25, 0.55, 0.78
      );
      composer.addPass(bloomPass);
      // 🌟 自作 Volumetric God Ray ShaderPass（太陽から放射状光線）
      if (ADDONS.ShaderPass) {
        const godRayShader = {
          uniforms: {
            tDiffuse: { value: null },
            sunScreen: { value: new THREE.Vector2(0.5, 0.5) },
            exposure: { value: 0.3 },
            decay: { value: 0.96 },
            density: { value: 0.96 },
            weight: { value: 0.35 },
            samples: { value: 40 }, // int 相当
          },
          vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D tDiffuse;
            uniform vec2 sunScreen;
            uniform float exposure, decay, density, weight;
            const int SAMPLES = 40;
            void main(){
              vec2 tc = vUv;
              vec2 delta = tc - sunScreen;
              delta *= 1.0 / float(SAMPLES) * density;
              float illum = exposure;
              vec3 col = texture2D(tDiffuse, tc).rgb;
              vec3 ray = vec3(0.0);
              for (int i = 0; i < SAMPLES; i++) {
                tc -= delta;
                vec3 s = texture2D(tDiffuse, tc).rgb;
                // 輝度を抽出、遠ざかるほど減衰
                float lum = dot(s, vec3(0.299, 0.587, 0.114));
                ray += vec3(lum, lum * 0.96, lum * 0.88) * illum * weight;
                illum *= decay;
              }
              gl_FragColor = vec4(col + ray, 1.0);
            }
          `,
        };
        const grPass = new ADDONS.ShaderPass(godRayShader);
        composer.addPass(grPass);
        camera.userData.godRayPass = grPass;
        camera.userData.godRaySunPos = SUN_POS;
      }
      // 🍎 OutlinePass: リンゴ（対話可能）にハイライト
      if (ADDONS.OutlinePass) {
        edenOutlinePass = new ADDONS.OutlinePass(new THREE.Vector2(W, H), scene, camera);
        edenOutlinePass.edgeStrength = 3.0;
        edenOutlinePass.edgeGlow = 0.9;
        edenOutlinePass.edgeThickness = 1.5;
        edenOutlinePass.pulsePeriod = 1.8;
        edenOutlinePass.visibleEdgeColor.set(0xffc0a0); // 赤っぽい金
        edenOutlinePass.hiddenEdgeColor.set(0x6a3028);
        composer.addPass(edenOutlinePass);
      }
      // カラーグレード（Vignette/Chromatic/Grain）を ShaderPass で追加
      if (ADDONS.ShaderPass) {
        const gradeShader = {
          uniforms: {
            tDiffuse: { value: null },
            uTime: { value: 0 },
            uVignette: { value: 0.38 },
            uChromatic: { value: 0.0025 },
            uGrain: { value: 0.03 },
            uSaturation: { value: 1.12 },
          },
          vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D tDiffuse;
            uniform float uTime, uVignette, uChromatic, uGrain, uSaturation;
            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            void main(){
              vec2 c = vec2(0.5);
              vec2 d = vUv - c;
              float dist = length(d);
              vec2 ca = d * uChromatic * (0.5 + dist * 1.5);
              float r = texture2D(tDiffuse, vUv - ca).r;
              float g = texture2D(tDiffuse, vUv).g;
              float b = texture2D(tDiffuse, vUv + ca).b;
              vec3 col = vec3(r,g,b);
              float lum = dot(col, vec3(0.2126,0.7152,0.0722));
              col = mix(vec3(lum), col, uSaturation);
              float vig = smoothstep(0.8, 0.3, dist);
              col *= mix(1.0 - uVignette, 1.0, vig);
              col += (hash(vUv * 1000.0 + uTime * 0.1) - 0.5) * uGrain;
              gl_FragColor = vec4(col, 1.0);
            }
          `,
        };
        const gradePass = new ADDONS.ShaderPass(gradeShader);
        composer.addPass(gradePass);
        camera.userData.gradePass = gradePass;
      }
      // 🔲 SMAAPass: 高品質アンチエイリアス（FXAAより高品質、Subpixel Morphological）
      if (ADDONS.SMAAPass) {
        const smaa = new ADDONS.SMAAPass(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());
        composer.addPass(smaa);
      }
      if (ADDONS.OutputPass) composer.addPass(new ADDONS.OutputPass());
    } catch (err) {
      console.error('[eden composer fail]', err);
      composer = null;
    }
    if (!composer && !usePro) {
      bloom = createBloom(THREE, renderer, W, H, {
        threshold: 0.65, strength: 0.9,
        vignette: 0.38, chromatic: 0.0025, grain: 0.03,
        saturation: 1.12, lift: 0.01,
      });
    }

    // ☁️ ジブリ的な空（柔らかい青→薄紫→白金、ふわふわの雲）
    const skyTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 2048; sc.height = 1024;
      const g = sc.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 1024);
      grd.addColorStop(0, '#5a7ab0');   // 高空の青
      grd.addColorStop(0.35, '#9ab8d8');
      grd.addColorStop(0.6, '#e8d8c8'); // 薄い桃
      grd.addColorStop(0.82, '#f8e8b8'); // 金色地平
      grd.addColorStop(1, '#ffeabc');
      g.fillStyle = grd; g.fillRect(0, 0, 2048, 1024);
      // ジブリ風のぽわっとした雲（大小、グラデ、重ね）
      for (let i = 0; i < 35; i++) {
        const x = Math.random() * 2048, y = 50 + Math.random() * 520;
        const w = 80 + Math.random() * 280;
        const h = w * (0.25 + Math.random() * 0.15);
        // 本体
        const grd2 = g.createRadialGradient(x, y, 0, x, y, w);
        grd2.addColorStop(0, 'rgba(255,255,255,0.85)');
        grd2.addColorStop(0.5, 'rgba(255,250,240,0.5)');
        grd2.addColorStop(1, 'rgba(255,240,220,0)');
        g.fillStyle = grd2;
        g.beginPath(); g.ellipse(x, y, w, h, 0, 0, Math.PI*2); g.fill();
        // ぽこぽこ雲のコブ
        for (let k = 0; k < 5; k++) {
          const ox = x + (Math.random() - 0.5) * w * 1.6;
          const oy = y - h * 0.3 - Math.random() * h * 0.4;
          const ow = w * (0.25 + Math.random() * 0.35);
          const grd3 = g.createRadialGradient(ox, oy, 0, ox, oy, ow);
          grd3.addColorStop(0, 'rgba(255,255,255,0.6)');
          grd3.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = grd3;
          g.beginPath(); g.ellipse(ox, oy, ow, ow * 0.7, 0, 0, Math.PI*2); g.fill();
        }
      }
      // 遠景の水平雲帯
      for (let i = 0; i < 14; i++) {
        const y = 520 + Math.random() * 300;
        const grd4 = g.createLinearGradient(0, y, 2048, y);
        grd4.addColorStop(0, 'rgba(255,240,220,0)');
        grd4.addColorStop(0.5, 'rgba(255,248,235,0.35)');
        grd4.addColorStop(1, 'rgba(255,240,220,0)');
        g.fillStyle = grd4;
        g.fillRect(0, y, 2048, 12 + Math.random() * 18);
      }
      return new THREE.CanvasTexture(sc);
    })();
    // 🌅 空：THREE.Sky（物理ベースの大気散乱）があれば最優先で使う
    let sky;
    if (ADDONS.Sky) {
      sky = new ADDONS.Sky();
      sky.scale.setScalar(450);
      const sp = sky.material.uniforms;
      sp['turbidity'].value = 3.5;        // 霞の多さ
      sp['rayleigh'].value = 2.2;         // 青空成分
      sp['mieCoefficient'].value = 0.008;
      sp['mieDirectionalG'].value = 0.82; // 太陽付近のハロ
      // 太陽方向（夕方寄り）
      const phi = THREE.MathUtils.degToRad(90 - 14);    // 高度: 14°（低め=夕景）
      const theta = THREE.MathUtils.degToRad(40);
      const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      sp['sunPosition'].value.copy(sunDir);
      scene.add(sky);
      // PMREM: Sky を環境光マップにして PBR マテリアルに反映
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const envRT = pmrem.fromScene(sky);
        scene.environment = envRT.texture;
        if ('environmentIntensity' in scene) scene.environmentIntensity = 0.6;
      } catch (e) { console.warn('PMREM failed', e); }
      // HDRI ロード（あれば環境光を本物のHDRで上書き）
      if (ADDONS.RGBELoader) {
        const hdrUrl = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr';
        const rgbe = new ADDONS.RGBELoader();
        rgbe.setDataType(THREE.HalfFloatType);
        rgbe.load(hdrUrl, (hdr) => {
          hdr.mapping = THREE.EquirectangularReflectionMapping;
          scene.environment = hdr;
          if ('environmentIntensity' in scene) scene.environmentIntensity = 0.85;
        }, undefined, () => {});
      }
      // 太陽方向の方向光も Sky に揃える
      sunLight.position.copy(sunDir).multiplyScalar(60);
    } else {
      scene.background = skyTex;
      sky = new THREE.Mesh(
        new THREE.SphereGeometry(120, 48, 24),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
      );
      scene.add(sky);
    }
    // フォグ（Sky利用時も浮遊感のために薄め）
    scene.fog = new THREE.FogExp2(0xe8d8c8, 0.008); // 指数フォグ：浮島の気球感
    // ☀️ 太陽 — 宇宙モードと同格のシェーダベース（プラズマ + 彩層 + 多層コロナ + 輝き）
    // SUN_POS は先頭で宣言済み
    const SUN_R = 4.5;
    const sunUniforms = { uTime: { value: 0 } };
    // プラズマ本体 — 手続きノイズで表面が流れる
    const sunPlasmaMat = new THREE.ShaderMaterial({
      uniforms: sunUniforms,
      vertexShader: `
        varying vec2 vUv; varying vec3 vN;
        void main() {
          vUv = uv;
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv; varying vec3 vN;
        // 2D ハッシュノイズ
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
          vec2 u = f*f*(3.0 - 2.0*f);
          return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
          return v;
        }
        void main() {
          vec2 uv = vUv * 3.5;
          float n1 = fbm(uv + uTime * 0.12);
          float n2 = fbm(uv * 1.5 - uTime * 0.08);
          float n = n1 * 0.6 + n2 * 0.4;
          // 顆粒
          float gran = fbm(uv * 8.0 + uTime * 0.3) * 0.4;
          n = mix(n, gran, 0.25);
          // 黄→橙→赤
          vec3 col = mix(vec3(1.0, 0.95, 0.7), vec3(1.0, 0.55, 0.15), n);
          col = mix(col, vec3(1.0, 0.25, 0.05), pow(max(0.0, 1.0 - n), 2.5) * 0.4);
          // 明るく
          col *= 1.4;
          // 脈動
          col *= 0.95 + 0.05 * sin(uTime * 1.5);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      fog: false,
    });
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_R, 48, 32), sunPlasmaMat);
    sunMesh.position.copy(SUN_POS);
    scene.add(sunMesh);

    // 💫 Lensflare（DirectionalLight に装着）
    if (ADDONS.Lensflare && ADDONS.LensflareElement) {
      const flareMainTex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        grd.addColorStop(0, 'rgba(255,255,220,1)');
        grd.addColorStop(0.2, 'rgba(255,220,150,0.9)');
        grd.addColorStop(0.5, 'rgba(255,160,80,0.4)');
        grd.addColorStop(1, 'rgba(255,120,40,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      })();
      const flareDotTex = (() => {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grd.addColorStop(0, 'rgba(255,230,180,1)');
        grd.addColorStop(1, 'rgba(255,180,100,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      })();
      const lf = new ADDONS.Lensflare();
      lf.addElement(new ADDONS.LensflareElement(flareMainTex, 280, 0, new THREE.Color(0xffeacc)));
      lf.addElement(new ADDONS.LensflareElement(flareDotTex, 60, 0.6));
      lf.addElement(new ADDONS.LensflareElement(flareDotTex, 90, 0.8));
      lf.addElement(new ADDONS.LensflareElement(flareDotTex, 40, 1.0));
      sunLight.add(lf);
    }

    // 🔥 彩層（すぐ外側の赤いリム）
    const chromoMat = new THREE.ShaderMaterial({
      uniforms: sunUniforms,
      vertexShader: `
        varying vec3 vN; varying vec3 vView;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vN; varying vec3 vView;
        void main() {
          float rim = 1.0 - max(0.0, dot(vN, vView));
          rim = pow(rim, 2.8);
          vec3 col = mix(vec3(1.0, 0.5, 0.15), vec3(1.0, 0.85, 0.45), rim);
          float flick = 0.92 + 0.08 * sin(uTime * 1.2);
          gl_FragColor = vec4(col, rim * 0.9 * flick);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true, depthWrite: false, side: THREE.FrontSide,
      blending: THREE.AdditiveBlending, fog: false,
    });
    const chromosphere = new THREE.Mesh(new THREE.SphereGeometry(SUN_R * 1.04, 32, 20), chromoMat);
    chromosphere.position.copy(SUN_POS);
    scene.add(chromosphere);

    // 🌟 多層コロナ（内・中・外、BackSide additive）
    function makeCorona(scale, alpha) {
      const mat = new THREE.ShaderMaterial({
        uniforms: sunUniforms,
        vertexShader: `
          varying vec3 vN; varying vec3 vView;
          void main() {
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vN; varying vec3 vView;
          void main() {
            float rim = 1.0 - max(0.0, dot(vN, vView));
            rim = pow(rim, 2.0);
            vec3 col = mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.9, 0.55), rim);
            float breathe = 0.9 + 0.1 * sin(uTime * 0.5);
            gl_FragColor = vec4(col, rim * ${alpha.toFixed(2)} * breathe);
            if (gl_FragColor.a < 0.01) discard;
          }
        `,
        transparent: true, depthWrite: false, side: THREE.BackSide,
        blending: THREE.AdditiveBlending, fog: false,
      });
      const m = new THREE.Mesh(new THREE.SphereGeometry(SUN_R * scale, 32, 20), mat);
      m.position.copy(SUN_POS);
      scene.add(m);
      return m;
    }
    const corona1 = makeCorona(1.35, 0.6);
    const corona2 = makeCorona(1.9, 0.4);
    const corona3 = makeCorona(2.8, 0.22);

    // 🔆 大輝（巨大なソフト光）
    const bigHaloTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(255,250,220,1)');
      grd.addColorStop(0.18, 'rgba(255,220,160,0.9)');
      grd.addColorStop(0.4, 'rgba(255,170,80,0.4)');
      grd.addColorStop(0.75, 'rgba(255,120,40,0.1)');
      grd.addColorStop(1, 'rgba(255,100,30,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const sunBigHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: bigHaloTex, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    sunBigHalo.position.copy(SUN_POS);
    sunBigHalo.scale.set(45, 45, 45);
    scene.add(sunBigHalo);

    // ✨ 光条（縦横の十字光）— シャフト風
    const shaftTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 64;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 32, 512, 32);
      grd.addColorStop(0, 'rgba(255,220,150,0)');
      grd.addColorStop(0.5, 'rgba(255,245,210,0.85)');
      grd.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = grd; g.fillRect(0, 28, 512, 8);
      return new THREE.CanvasTexture(c);
    })();
    const shaftMat = new THREE.SpriteMaterial({
      map: shaftTex, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      rotation: 0,
    });
    const shaft1 = new THREE.Sprite(shaftMat.clone());
    shaft1.position.copy(SUN_POS); shaft1.scale.set(40, 6, 1);
    scene.add(shaft1);
    const shaft2 = new THREE.Sprite(shaftMat.clone());
    shaft2.material.rotation = Math.PI / 2;
    shaft2.position.copy(SUN_POS); shaft2.scale.set(40, 6, 1);
    scene.add(shaft2);

    // 💎 レンズフレア（6個のゴースト、サイズ違い）
    function makeFlareTex(color) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, color + '1)');
      grd.addColorStop(0.3, color + '0.5)');
      grd.addColorStop(1, color + '0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    const flareTex1 = makeFlareTex('rgba(255,230,160,');
    const flareTex2 = makeFlareTex('rgba(255,180,90,');
    const flareTex3 = makeFlareTex('rgba(200,160,255,');
    const flares = [];
    const flareDefs = [
      { tex: flareTex1, t: 0.85, size: 2.0 },
      { tex: flareTex2, t: 1.15, size: 1.4 },
      { tex: flareTex3, t: 1.4, size: 1.2 },
      { tex: flareTex1, t: 1.7, size: 2.5 },
      { tex: flareTex2, t: 2.1, size: 0.9 },
      { tex: flareTex3, t: 2.5, size: 1.5 },
    ];
    // 画面中心から太陽への直線上にレンズフレア配置。3D空間で近似するため
    // 太陽 → カメラ方向の逆側に配置（動的更新）
    flareDefs.forEach(d => {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: d.tex, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false,
      }));
      spr.scale.set(d.size, d.size, 1);
      spr.renderOrder = 999;
      flares.push({ spr, t: d.t, size: d.size });
      scene.add(spr);
    });

    // 🏝 浮島テクスチャ
    const groundTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 512; sc.height = 512;
      const g = sc.getContext('2d');
      g.fillStyle = '#4a7030'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1400; i++) {
        const c = Math.random() < 0.5 ? '#5a8035' : '#2a5018';
        g.fillStyle = c;
        g.fillRect(Math.random()*512, Math.random()*512, 1 + Math.random()*2, 1 + Math.random()*3);
      }
      // 黄金色の草ぶき
      for (let i = 0; i < 200; i++) {
        g.fillStyle = `rgba(${200+Math.random()*50},${180+Math.random()*40},${90+Math.random()*40},0.4)`;
        g.fillRect(Math.random()*512, Math.random()*512, 1, 2 + Math.random()*3);
      }
      // 花
      for (let i = 0; i < 50; i++) {
        const colors = ['#ff6080', '#ffd070', '#ffffff', '#d080ff', '#ffb040'];
        g.fillStyle = colors[i % 5];
        const x = Math.random()*512, y = Math.random()*512;
        g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI*2); g.fill();
      }
      const t = new THREE.CanvasTexture(sc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(8, 8);
      return t;
    })();
    // 🏝 浮島本体 — 中央が盛り上がり、端は緩やかに落ちて霧に消える
    const islandGeo = new THREE.PlaneGeometry(80, 80, 120, 120);
    {
      const posAttr = islandGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i), y = posAttr.getY(i);
        const r = Math.hypot(x, y);
        // 中央の大きな丘（tree が立つ場所）
        const hill = Math.exp(-r * r / 120) * 2.4;
        // 副丘（なだらかな起伏）
        const sub1 = Math.exp(-((x - 6)**2 + (y + 5)**2) / 60) * 0.8;
        const sub2 = Math.exp(-((x + 7)**2 + (y - 4)**2) / 80) * 0.6;
        // 岩の微細ノイズ
        const noise = (Math.sin(x * 0.6) * Math.cos(y * 0.55)
                     + Math.sin(x * 1.3 + 1) * Math.cos(y * 0.9) * 0.6) * 0.22;
        // 端に向かって沈降（浮島のふち）
        const edge = r > 22 ? -(r - 22) * 0.9 : 0;
        posAttr.setZ(i, hill + sub1 + sub2 + noise + edge);
      }
      posAttr.needsUpdate = true;
      islandGeo.computeVertexNormals();
    }
    const ground = new THREE.Mesh(
      islandGeo,
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 🌼 MeshSurfaceSampler: 地面表面に花を均一散布（InstancedMesh で一括）
    if (ADDONS.MeshSurfaceSampler) {
      try {
        const sampler = new ADDONS.MeshSurfaceSampler(ground).build();
        const FLOWERS = 200;
        const flowerGeo = new THREE.SphereGeometry(0.08, 6, 4);
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, FLOWERS);
        const fd = new THREE.Object3D();
        const tempPos = new THREE.Vector3();
        const flowerColors = [0xff6080, 0xffd070, 0xffffff, 0xd080ff, 0xffb040];
        for (let i = 0; i < FLOWERS; i++) {
          sampler.sample(tempPos);
          // ground は rotation.x = -PI/2 なので、sampled の Z が高さに相当
          fd.position.set(tempPos.x, Math.abs(tempPos.z) + 0.05, tempPos.y);
          const s = 0.6 + Math.random() * 0.6;
          fd.scale.set(s, s, s);
          fd.updateMatrix();
          flowers.setMatrixAt(i, fd.matrix);
          flowers.setColorAt(i, new THREE.Color(flowerColors[i % flowerColors.length]));
        }
        flowers.instanceMatrix.needsUpdate = true;
        if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
        scene.add(flowers);
      } catch (e) { console.warn('sampler', e); }
    }

    // 🪨 島の縁下部（岩肌の逆円錐 — 浮島の根元を見せる）
    const cliffGeo = new THREE.CylinderGeometry(28, 8, 14, 36, 6, true);
    const cliffTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 256; sc.height = 256;
      const g = sc.getContext('2d');
      g.fillStyle = '#5a4638'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = `rgba(${70+Math.random()*50},${55+Math.random()*35},${40+Math.random()*25},${0.3+Math.random()*0.3})`;
        g.fillRect(Math.random()*256, Math.random()*256, 2 + Math.random()*6, 1 + Math.random()*2);
      }
      // 苔の筋
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${60+Math.random()*40},${90+Math.random()*40},${40+Math.random()*20},${0.3+Math.random()*0.3})`;
        const y = Math.random() * 60;
        g.fillRect(Math.random() * 256, y, 2 + Math.random() * 8, 30 + Math.random() * 40);
      }
      const t = new THREE.CanvasTexture(sc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 2);
      return t;
    })();
    const cliff = new THREE.Mesh(
      cliffGeo,
      new THREE.MeshStandardMaterial({ map: cliffTex, roughness: 0.95, side: THREE.DoubleSide })
    );
    cliff.position.y = -7;
    scene.add(cliff);

    // 🌫 島を包む霧の層（薄い半透明の円盤を数枚）
    for (let k = 0; k < 5; k++) {
      const mistMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.1 + Math.random() * 0.08,
        depthWrite: false, fog: false,
      });
      const mist = new THREE.Mesh(new THREE.CircleGeometry(36 + k * 4, 48), mistMat);
      mist.rotation.x = -Math.PI / 2;
      mist.position.y = -2.5 - k * 0.8;
      scene.add(mist);
    }

    // 🌊 遠い下界（薄い水色の大円 — 鏡面の暗示）
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x7aa8cc, roughness: 0.2, metalness: 0.4,
      transparent: true, opacity: 0.85,
    });
    const water = new THREE.Mesh(new THREE.CircleGeometry(200, 32), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -18;
    scene.add(water);

    // 🌿 草（InstancedMeshのビルボード） — 手前を埋める
    const grassTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 128;
      const g = c.getContext('2d');
      g.clearRect(0,0,64,128);
      const grd = g.createLinearGradient(0, 0, 0, 128);
      grd.addColorStop(0, '#6fa038'); grd.addColorStop(0.7, '#4a7020'); grd.addColorStop(1, '#2a4810');
      // 草の形（先細りの三角形×3本）
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(20, 128); g.lineTo(32, 0); g.lineTo(44, 128); g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(10, 128); g.lineTo(18, 20); g.lineTo(26, 128); g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(40, 128); g.lineTo(50, 24); g.lineTo(58, 128); g.closePath(); g.fill();
      return new THREE.CanvasTexture(c);
    })();
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex, alphaTest: 0.5, transparent: true,
      side: THREE.DoubleSide, roughness: 0.9
    });
    const GRASS = 500;
    const grassGeo = new THREE.PlaneGeometry(0.35, 0.5);
    grassGeo.translate(0, 0.25, 0);
    const grass = new THREE.InstancedMesh(grassGeo, grassMat, GRASS);
    const gd = new THREE.Object3D();
    const grassBases = [];
    for (let i = 0; i < GRASS; i++) {
      // ドーナツ状に散布（木の下は避ける）
      const r = 2.5 + Math.sqrt(Math.random()) * 16;
      const a = Math.random() * Math.PI * 2;
      gd.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      gd.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const s = 0.6 + Math.random() * 0.7;
      gd.scale.set(s, s + Math.random() * 0.4, s);
      gd.updateMatrix();
      grass.setMatrixAt(i, gd.matrix);
      const col = new THREE.Color().setHSL(0.27 + Math.random() * 0.08, 0.4 + Math.random() * 0.2, 0.3 + Math.random() * 0.15);
      grass.setColorAt(i, col);
      grassBases.push({ rotY: gd.rotation.y, phase: Math.random() * Math.PI * 2 });
    }
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    grass.receiveShadow = true;
    scene.add(grass);

    // 🌟 ソフト円形スプライトテクスチャ（蛍・塵共用）
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,240,1)');
      grd.addColorStop(0.3, 'rgba(255,230,160,0.8)');
      grd.addColorStop(0.6, 'rgba(255,200,120,0.25)');
      grd.addColorStop(1, 'rgba(255,180,80,0)');
      g.fillStyle = grd; g.fillRect(0,0,64,64);
      return new THREE.CanvasTexture(c);
    })();

    // 🪷 幹の根元の神秘の光輪
    const auraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 2.4, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffd890, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.02;
    scene.add(auraRing);
    // 光の柱（樹冠から地面へ降り注ぐ聖光）
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0xfff0b0, transparent: true, opacity: 0.08,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 3.2, 7.5, 20, 1, true),
      pillarMat
    );
    pillar.position.y = 3.8;
    scene.add(pillar);

    // ✨ 神の光条（ゴッドレイ） — 太陽からの放射状コーン
    const raysGroup = new THREE.Group();
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xfff0c0, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 7; i++) {
      const ang = (i - 3) * 0.08;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.2 + Math.random() * 0.6, 55, 24, 1, true),
        rayMat
      );
      cone.position.set(25 + Math.cos(ang) * 8, 18, -28 + Math.sin(ang) * 8);
      cone.lookAt(0, 0, 0);
      cone.rotateX(Math.PI / 2);
      raysGroup.add(cone);
    }
    scene.add(raysGroup);

    // 🌸 舞う花びら（ピンクの小さな平面、ゆっくり降りて循環）
    const petalTex = (() => {
      const c = document.createElement('canvas'); c.width = 48; c.height = 48;
      const g = c.getContext('2d');
      g.clearRect(0,0,48,48);
      g.translate(24, 24);
      const grd = g.createRadialGradient(0, -6, 2, 0, 0, 20);
      grd.addColorStop(0, '#fff0f4');
      grd.addColorStop(0.5, '#ff9cb8');
      grd.addColorStop(1, '#d04070');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(0, 0, 9, 18, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(150,30,60,0.4)';
      g.lineWidth = 0.6; g.beginPath(); g.moveTo(0, -15); g.lineTo(0, 15); g.stroke();
      return new THREE.CanvasTexture(c);
    })();
    const PETAL = 15;
    const petalGeo = new THREE.PlaneGeometry(0.18, 0.26);
    const petalMat = new THREE.MeshBasicMaterial({
      map: petalTex, transparent: true, alphaTest: 0.1,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const petals = new THREE.InstancedMesh(petalGeo, petalMat, PETAL);
    const pd = new THREE.Object3D();
    const petalBases = [];
    for (let i = 0; i < PETAL; i++) {
      const r = 1.5 + Math.random() * 6;
      const a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = 1 + Math.random() * 6;
      pd.position.set(x, y, z);
      pd.rotation.set(Math.random(), Math.random() * Math.PI * 2, Math.random());
      pd.updateMatrix();
      petals.setMatrixAt(i, pd.matrix);
      petalBases.push({ x, y, z, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.6, rx: Math.random(), ry: Math.random() * Math.PI * 2, rz: Math.random() });
    }
    petals.instanceMatrix.needsUpdate = true;
    scene.add(petals);

    // 🧚 蛍（黄色く光る粒がふわふわ） — 夜の森感
    const FIRE = 45;
    const fireGeo = new THREE.BufferGeometry();
    const firePos = new Float32Array(FIRE * 3);
    const firePhase = new Float32Array(FIRE);
    for (let i = 0; i < FIRE; i++) {
      const r = 1.2 + Math.random() * 10;
      const a = Math.random() * Math.PI * 2;
      firePos[i*3] = Math.cos(a) * r;
      firePos[i*3+1] = 0.3 + Math.random() * 5;
      firePos[i*3+2] = Math.sin(a) * r;
      firePhase[i] = Math.random() * Math.PI * 2;
    }
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    const fireMat = new THREE.PointsMaterial({
      color: 0xffe890, size: 0.22,
      transparent: true, opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: glowTex,
      alphaTest: 0.01,
    });
    const fireflies = new THREE.Points(fireGeo, fireMat);
    scene.add(fireflies);

    // ✨ 自作 ShaderMaterial の光の粒子（GPU 側でサイン波動かし）
    //   CPU で position を毎フレーム書き換えず、シェーダで時間から計算
    const SOUL = 200;
    const soulGeo = new THREE.BufferGeometry();
    const soulPos = new Float32Array(SOUL * 3);
    const soulOff = new Float32Array(SOUL);  // 各粒子の位相オフセット
    for (let i = 0; i < SOUL; i++) {
      const r = 2 + Math.random() * 12;
      const a = Math.random() * Math.PI * 2;
      soulPos[i*3] = Math.cos(a) * r;
      soulPos[i*3+1] = 0.5 + Math.random() * 8;
      soulPos[i*3+2] = Math.sin(a) * r;
      soulOff[i] = Math.random() * Math.PI * 2;
    }
    soulGeo.setAttribute('position', new THREE.BufferAttribute(soulPos, 3));
    soulGeo.setAttribute('aOffset', new THREE.BufferAttribute(soulOff, 1));
    const soulMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffc080) },
        uSize: { value: 18.0 },
      },
      vertexShader: `
        attribute float aOffset;
        uniform float uTime;
        uniform float uSize;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          // GPU側でサイン波移動
          p.x += sin(uTime * 0.5 + aOffset) * 0.4;
          p.y += sin(uTime * 0.7 + aOffset * 1.3) * 0.25;
          p.z += cos(uTime * 0.6 + aOffset) * 0.4;
          vAlpha = 0.55 + 0.45 * sin(uTime * 2.0 + aOffset * 3.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (20.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float alpha = (1.0 - d * 2.0) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const souls = new THREE.Points(soulGeo, soulMat);
    scene.add(souls);
    scene.userData.soulMat = soulMat; // treeGroup はまだ未定義なので scene に保管

    // 🔮 プラズマの魂球（自作 Raymarching + Noise + Fresnel）
    // 完全手続き、テクスチャ不要、シェーダのみで神秘の光源
    const orbMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColA: { value: new THREE.Color(0x6020c0) }, // 紫
        uColB: { value: new THREE.Color(0x40e8ff) }, // 水色
        uColC: { value: new THREE.Color(0xffc060) }, // 金
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorld;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w;
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColA, uColB, uColC;
        varying vec3 vNormal;
        varying vec3 vWorld;
        varying vec3 vView;
        // 3D hash + value noise
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
        float noise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i), b = hash(i + vec3(1,0,0));
          float c = hash(i + vec3(0,1,0)), d = hash(i + vec3(1,1,0));
          float e = hash(i + vec3(0,0,1)), g = hash(i + vec3(1,0,1));
          float h = hash(i + vec3(0,1,1)), k = hash(i + vec3(1,1,1));
          return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y),
                     mix(mix(e,g,f.x), mix(h,k,f.x), f.y), f.z);
        }
        // Fractional Brownian Motion: 自然な乱流
        float fbm(vec3 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; }
          return v;
        }
        void main() {
          // 時間で動く3D座標を noise に渡す
          vec3 p = normalize(vWorld - vec3(0.0)) * 3.0 + vec3(uTime * 0.25);
          float n = fbm(p);
          float n2 = fbm(p * 2.5 - uTime * 0.15);
          // 3色を noise で混合
          vec3 col = mix(uColA, uColB, smoothstep(0.3, 0.7, n));
          col = mix(col, uColC, smoothstep(0.5, 0.9, n2) * 0.6);
          // Fresnel: 輪郭を光らせる
          float fres = pow(1.0 - max(0.0, dot(vNormal, vView)), 2.5);
          col += uColC * fres * 1.5;
          // 内部の渦
          col *= 0.7 + 0.8 * n;
          // 脈動
          col *= 0.9 + 0.15 * sin(uTime * 1.5);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), orbMat);
    orb.position.set(1.8, 5.5, 1.2); // 蛇の頭付近
    scene.add(orb);
    // 光源も仕込む（近くを実際に照らす）
    const orbLight = new THREE.PointLight(0x8040ff, 1.5, 8, 1.8);
    orbLight.position.copy(orb.position);
    scene.add(orbLight);
    scene.userData.orb = orb;
    scene.userData.orbMat = orbMat;
    scene.userData.orbLight = orbLight;

    // 🍎 リンゴの光輪（発光の後光） — bloomの代わり
    const appleHalos = [];
    // （apples 配列は後で作られるので、その後で halo を追加する pending フラグ）

    // ✨ ダストモート（空気中の微粒子、太陽光に舞う）
    const dustGeo = new THREE.BufferGeometry();
    const DUST = 100;
    const dustPos = new Float32Array(DUST * 3);
    const dustPhase = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      dustPos[i*3] = (Math.random() - 0.5) * 20;
      dustPos[i*3+1] = 1 + Math.random() * 6;
      dustPos[i*3+2] = (Math.random() - 0.5) * 20;
      dustPhase[i] = Math.random() * Math.PI * 2;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xfff0b0, size: 0.05, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);
    // 小径（石）
    for (let i = 0; i < 25; i++) {
      const r = 3 + i * 0.8;
      const a = i * 0.4;
      const stone = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 })
      );
      stone.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
      stone.scale.y = 0.4;
      scene.add(stone);
    }

    // 大気感 — 指数フォグで奥行き（自然な減衰）
    scene.fog = new THREE.FogExp2(0xc08060, 0.018);

    // === ヘルパー: 曲線とラジウス配列から「細る」チューブを作る ===
    function makeTaperedTube(curve, radii, radialSegs, material) {
      const N = radii.length;
      const positions = [], uvs = [], indices = [];
      const frames = curve.computeFrenetFrames(N - 1, false);
      for (let i = 0; i < N; i++) {
        const center = curve.getPointAt(i / (N - 1));
        const normal = frames.normals[i];
        const binormal = frames.binormals[i];
        const r = radii[i];
        for (let j = 0; j <= radialSegs; j++) {
          const a = (j / radialSegs) * Math.PI * 2;
          const c = Math.cos(a), s = Math.sin(a);
          positions.push(
            center.x + r * (c * normal.x + s * binormal.x),
            center.y + r * (c * normal.y + s * binormal.y),
            center.z + r * (c * normal.z + s * binormal.z)
          );
          uvs.push(j / radialSegs, i / (N - 1));
        }
      }
      for (let i = 0; i < N - 1; i++) {
        for (let j = 0; j < radialSegs; j++) {
          const a = i * (radialSegs + 1) + j;
          const b = a + 1;
          const c = a + (radialSegs + 1);
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, material);
    }

    // === 樹皮テクスチャ（手続き） ===
    const barkTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 512; sc.height = 512;
      const g = sc.getContext('2d');
      // ベース
      const grd = g.createLinearGradient(0, 0, 512, 0);
      grd.addColorStop(0, '#3a2612');
      grd.addColorStop(0.5, '#5a3a1a');
      grd.addColorStop(1, '#3a2612');
      g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
      // 縦の筋
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * 512;
        const w = 1 + Math.random() * 4;
        const shade = Math.random() < 0.5 ? '#2a1808' : '#6a4a22';
        g.strokeStyle = shade;
        g.lineWidth = w;
        g.globalAlpha = 0.3 + Math.random() * 0.4;
        g.beginPath();
        g.moveTo(x, 0);
        let y = 0;
        while (y < 512) {
          y += 10 + Math.random() * 20;
          g.lineTo(x + (Math.random() - 0.5) * 6, y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      // 苔・斑
      for (let i = 0; i < 60; i++) {
        g.fillStyle = Math.random() < 0.6 ? 'rgba(60,80,30,0.25)' : 'rgba(20,10,4,0.4)';
        const x = Math.random() * 512, y = Math.random() * 512;
        const r = 4 + Math.random() * 14;
        g.beginPath(); g.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2); g.fill();
      }
      const t = new THREE.CanvasTexture(sc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1, 3);
      return t;
    })();

    // === 葉テクスチャ（アルファ付き葉っぱ形） ===
    const leafTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 128; sc.height = 128;
      const g = sc.getContext('2d');
      g.clearRect(0, 0, 128, 128);
      // 葉のシルエット
      g.translate(64, 64);
      const grd = g.createLinearGradient(0, -50, 0, 50);
      grd.addColorStop(0, '#8fc552');
      grd.addColorStop(0.5, '#5a9a28');
      grd.addColorStop(1, '#2a5012');
      g.fillStyle = grd;
      g.beginPath();
      // 左右対称の葉
      g.moveTo(0, -55);
      g.bezierCurveTo(30, -45, 40, -10, 28, 30);
      g.bezierCurveTo(15, 50, 5, 55, 0, 55);
      g.bezierCurveTo(-5, 55, -15, 50, -28, 30);
      g.bezierCurveTo(-40, -10, -30, -45, 0, -55);
      g.fill();
      // 主脈
      g.strokeStyle = 'rgba(40,70,20,0.7)';
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, -50); g.lineTo(0, 50); g.stroke();
      // 側脈
      g.strokeStyle = 'rgba(40,70,20,0.4)';
      g.lineWidth = 0.6;
      for (let i = -35; i < 40; i += 10) {
        g.beginPath(); g.moveTo(0, i); g.lineTo(22, i + 10); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(-22, i + 10); g.stroke();
      }
      // ハイライト
      g.fillStyle = 'rgba(220,255,180,0.2)';
      g.beginPath(); g.ellipse(-8, -15, 8, 20, -0.3, 0, Math.PI*2); g.fill();
      const t = new THREE.CanvasTexture(sc);
      return t;
    })();

    // 🌳 生命の樹（中央・巨木） — 壮大・神秘的に
    const treeGroup = new THREE.Group();
    // MeshPhysicalMaterial + anisotropy: 木目方向に光の反射が変わる（本物の木材感）
    const trunkMat = new THREE.MeshPhysicalMaterial({
      map: barkTex, roughness: 0.88, color: 0xc8a080,
      anisotropy: 0.75,           // 異方性（0-1、木目方向の反射差）
      anisotropyRotation: 0,      // 0rad = 縦方向の木目
      clearcoat: 0.1,             // 微かな表皮
      clearcoatRoughness: 0.6,
    });
    // 幹: 高さ14m、ドラマチックな曲がり — 壮大な世界樹スケール
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.35, 2.3, 0.25),
      new THREE.Vector3(-0.15, 4.6, -0.3),
      new THREE.Vector3(0.45, 7.0, 0.35),
      new THREE.Vector3(-0.1, 9.5, 0.25),
      new THREE.Vector3(0.25, 11.8, -0.15),
      new THREE.Vector3(0.05, 13.5, 0.1),
      new THREE.Vector3(0.0, 14.0, 0.0),
    ]);
    // 下太(1.7)→上細(0.25)：神木級
    const trunkRadii = [1.7, 1.45, 1.15, 0.9, 0.65, 0.48, 0.32, 0.22];
    const trunk = makeTaperedTube(trunkCurve, trunkRadii, 24, trunkMat);
    treeGroup.add(trunk);
    // 神秘のルーン（幹に発光の筋） — 黄金の文字が螺旋を描く
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0xffe890, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (let k = 0; k < 4; k++) {
      const runePts = Array.from({length: 60}).map((_, i) => {
        const t = i / 59;
        const y = 0.7 + t * 12.5;
        const r = 1.6 - t * 1.35;
        const a = t * Math.PI * 4 + k * (Math.PI * 2 / 4);
        return new THREE.Vector3(Math.cos(a) * r * 1.03, y, Math.sin(a) * r * 1.03);
      });
      const runeCurve = new THREE.CatmullRomCurve3(runePts);
      const rune = new THREE.Mesh(
        new THREE.TubeGeometry(runeCurve, 120, 0.022, 6, false),
        runeMat
      );
      treeGroup.add(rune);
    }
    // 根（壮大な buttress roots、12本、大きく広がる）
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.15;
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 0.7, 1.0, Math.sin(a) * 0.7),
        new THREE.Vector3(Math.cos(a) * 1.8, 0.25, Math.sin(a) * 1.8),
        new THREE.Vector3(Math.cos(a) * 3.4, -0.08, Math.sin(a) * 3.4),
        new THREE.Vector3(Math.cos(a) * 4.8, -0.1, Math.sin(a) * 4.8),
      ]);
      const root = makeTaperedTube(rootCurve, [0.75, 0.55, 0.28, 0.09], 12, trunkMat);
      treeGroup.add(root);
    }
    // 枝: 22本の主枝、クラウンを広く覆う
    const branchEnds = [];
    const branchDefs = [];
    for (let i = 0; i < 22; i++) {
      const ang = (i / 22) * Math.PI * 2 + Math.random() * 0.25;
      const h0 = 7.0 + Math.random() * 4.5;
      const h1 = h0 + 1.0 + Math.random() * 1.2;
      const h2 = h1 + 0.4 + Math.random() * 1.0;
      const r1 = 1.3 + Math.random() * 0.9;
      const r2 = 3.2 + Math.random() * 1.8;
      const r3 = 4.8 + Math.random() * 2.4;
      branchDefs.push([
        [Math.cos(ang) * 0.22, h0 - 0.5, Math.sin(ang) * 0.22],
        [Math.cos(ang) * r1, h0 + 0.3, Math.sin(ang) * r1],
        [Math.cos(ang) * r2, h1, Math.sin(ang) * r2],
        [Math.cos(ang) * r3, h2, Math.sin(ang) * r3],
      ]);
    }
    branchDefs.forEach(def => {
      const cv = new THREE.CatmullRomCurve3(def.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      const br = makeTaperedTube(cv, [0.48, 0.33, 0.19, 0.08], 14, trunkMat);
      treeGroup.add(br);
      branchEnds.push(new THREE.Vector3(...def[3]));
      // 小枝3本ずつ
      const sub1 = def[3];
      for (let k = 0; k < 3; k++) {
        const offX = (Math.random() - 0.5) * 1.5;
        const offY = 0.4 + Math.random() * 0.5;
        const offZ = (Math.random() - 0.5) * 1.5;
        const tip = new THREE.Vector3(sub1[0] + offX, sub1[1] + offY, sub1[2] + offZ);
        const sub = new THREE.CatmullRomCurve3([
          new THREE.Vector3(...sub1),
          new THREE.Vector3(sub1[0] + offX * 0.5, sub1[1] + offY * 0.5, sub1[2] + offZ * 0.5),
          tip,
        ]);
        treeGroup.add(makeTaperedTube(sub, [0.07, 0.045, 0.02], 8, trunkMat));
        branchEnds.push(tip);
      }
    });

    // 🍃 葉（InstancedMesh — 葉テクスチャ付き平面、クラウン全体に散布）
    const LEAF_COUNT = 600;
    const leafGeo = new THREE.PlaneGeometry(0.42, 0.55);
    // 葉（perf重視：MeshStandardMaterial で軽量）
    // 900個 InstancedMesh に Physical は重すぎるので Standard に戻す
    const leafMat = new THREE.MeshStandardMaterial({
      map: leafTex,
      alphaTest: 0.5,
      transparent: false, // alphaTestのみで軽量
      side: THREE.DoubleSide,
      roughness: 0.75,
      emissiveIntensity: 0.08,
      emissive: 0x306018, // 逆光時の葉脈っぽい光を擬似的に
    });
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAF_COUNT);
    const leafDummy = new THREE.Object3D();
    const leafBases = [];
    for (let i = 0; i < LEAF_COUNT; i++) {
      // 70%は枝先周辺、30%は中央クラウン
      let base;
      if (i < LEAF_COUNT * 0.7 && branchEnds.length) {
        const end = branchEnds[i % branchEnds.length];
        base = new THREE.Vector3(
          end.x + (Math.random() - 0.5) * 1.6,
          end.y + (Math.random() - 0.5) * 0.9,
          end.z + (Math.random() - 0.5) * 1.6
        );
      } else {
        const r = 3.8 + Math.random() * 3.2;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1) * 0.65 + 0.15;
        base = new THREE.Vector3(
          Math.cos(th) * Math.sin(ph) * r,
          10.5 + Math.cos(ph) * r * 0.9,
          Math.sin(th) * Math.sin(ph) * r
        );
      }
      leafDummy.position.copy(base);
      leafDummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      const scl = 0.8 + Math.random() * 0.7;
      leafDummy.scale.set(scl, scl, scl);
      leafDummy.updateMatrix();
      leaves.setMatrixAt(i, leafDummy.matrix);
      // 個体色のゆらぎ
      const col = new THREE.Color().setHSL(
        0.22 + Math.random() * 0.13,
        0.5 + Math.random() * 0.25,
        0.35 + Math.random() * 0.2
      );
      leaves.setColorAt(i, col);
      leafBases.push({ base: base.clone(), rotY: Math.random() * Math.PI * 2, phase: Math.random() * Math.PI * 2 });
    }
    leaves.instanceMatrix.needsUpdate = true;
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    treeGroup.add(leaves);

    // 🍎 禁断のリンゴ
    const apples = [];
    // MeshPhysicalMaterial: clearcoat + iridescence + 環境反射
    const appleMat = new THREE.MeshPhysicalMaterial({
      color: 0xd01828, roughness: 0.4, metalness: 0.0,
      emissive: 0x400614, emissiveIntensity: 0.2,
      clearcoat: 1.0, clearcoatRoughness: 0.08,
      sheen: 0.3, sheenColor: new THREE.Color(0xff8060),
      iridescence: 0.2,         // 虹色のかすかな彩光
      iridescenceIOR: 1.3,
      envMap: edenCubeRT ? edenCubeRT.texture : null, // 動的反射
    });
    // リンゴ型ジオメトリ：上下に凹み（stem well / calyx）、縦に少しつぶす
    function makeAppleGeometry(radius) {
      const geo = new THREE.SphereGeometry(radius, 24, 20);
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), y = pos.getY(v), z = pos.getZ(v);
        const r = Math.hypot(x, y, z);
        const yNorm = y / radius; // -1(下) ~ 1(上)
        // 上下のくぼみ：|yNorm|が1に近い場所を中央にすぼめる
        const dimple = Math.pow(Math.abs(yNorm), 4) * 0.45;
        const scaleXZ = 1 - dimple;
        // 縦方向に 10% つぶす（リンゴは横に広い）
        const yOut = y * 0.92;
        pos.setX(v, x * scaleXZ);
        pos.setZ(v, z * scaleXZ);
        pos.setY(v, yOut);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }
    const appleGeoShared = makeAppleGeometry(0.28);
    for (let i = 0; i < 18; i++) {
      const theta = (i / 18) * Math.PI * 2 + Math.random() * 0.6;
      const r = 3.8 + Math.random() * 3.0;
      const apple = new THREE.Mesh(appleGeoShared, appleMat);
      apple.position.set(Math.cos(theta) * r, 9.5 + Math.random() * 2.0, Math.sin(theta) * r);
      // ハイライト
      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffb0a0, transparent: true, opacity: 0.6 })
      );
      hl.position.set(apple.position.x - 0.04, apple.position.y + 0.06, apple.position.z);
      // 茎
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.012, 0.08, 5),
        new THREE.MeshStandardMaterial({ color: 0x4a2810 })
      );
      stem.position.set(apple.position.x, apple.position.y + 0.15, apple.position.z);
      apple.userData.basePos = apple.position.clone();
      apple.userData.phase = Math.random() * Math.PI * 2;
      apple.userData.state = 'onTree'; // onTree / falling / fallen / eaten
      apple.userData.vel = new THREE.Vector3();
      apple.userData.stem = stem;
      apple.userData.hl = hl;
      apple.scale.setScalar(1.4); // 見やすく
      apples.push(apple);
      treeGroup.add(apple); treeGroup.add(hl); treeGroup.add(stem);
      // 発光の後光（リンゴごとにスプライト）
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xff6060, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.position.copy(apple.position);
      halo.scale.set(0.9, 0.9, 0.9);
      halo.userData.basePos = apple.userData.basePos;
      halo.userData.phase = apple.userData.phase;
      apple.userData.halo = halo;
      appleHalos.push(halo);
      treeGroup.add(halo);
    }

    // 🐍 蛇（幹に巻き付く・ずっと大きく、頭が正面へ来るよう最後にカメラ側へ伸びる）
    const serpentPts = Array.from({length: 72}).map((_, i) => {
      const t = i / 71;
      const y = 0.6 + t * 11.5;
      const a = t * Math.PI * 4.5 + Math.PI * 0.3; // カメラ方向から始まる
      const trunkR = 1.7 - t * 1.45;
      const r = trunkR + 0.22 + Math.sin(t * 10) * 0.05;
      const p = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      // 最後の20%は頭を手前に突き出す
      if (t > 0.78) {
        const tt = (t - 0.78) / 0.22;
        p.z += tt * 1.2; // 前方（Z+ = カメラ方向）
        p.x += Math.sin(a) * tt * 0.4;
      }
      return p;
    });
    const serpentCurve = new THREE.CatmullRomCurve3(serpentPts);
    // 尾細い→頭太い（全体に太く）
    const serpentRadii = [];
    for (let i = 0; i < 72; i++) {
      const t = i / 71;
      const base = 0.14 + 0.22 * Math.sin(t * Math.PI);
      serpentRadii.push(base + (t > 0.90 ? 0.12 * (1 - (t - 0.90) / 0.10) : 0));
    }
    // 蛇用テクスチャ（鱗）
    const scaleTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 256; sc.height = 128;
      const g = sc.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 128);
      grd.addColorStop(0, '#4a7820');
      grd.addColorStop(0.5, '#6fa032');
      grd.addColorStop(1, '#2a4812');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 128);
      // 鱗パターン
      for (let y = 0; y < 128; y += 8) {
        for (let x = 0; x < 256; x += 10) {
          g.strokeStyle = 'rgba(20,40,8,0.55)';
          g.lineWidth = 0.8;
          g.beginPath();
          const off = (Math.floor(y / 8) % 2) * 5;
          g.arc(x + off, y, 4, Math.PI, 0);
          g.stroke();
        }
      }
      const t = new THREE.CanvasTexture(sc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(6, 1);
      return t;
    })();
    // CubeCamera は先頭で宣言済み、シーンに追加だけ
    if (edenCubeCam) scene.add(edenCubeCam);
    const serpentMat = new THREE.MeshPhysicalMaterial({
      map: scaleTex, roughness: 0.35, metalness: 0.4,
      emissive: 0x2a4a08, emissiveIntensity: 0.4,
      envMap: edenCubeRT ? edenCubeRT.texture : null,
      clearcoat: 0.6,                  // 鱗の光沢
      clearcoatRoughness: 0.2,
      sheen: 0.2, sheenColor: new THREE.Color(0x60a020),
    });
    const serpent = makeTaperedTube(serpentCurve, serpentRadii, 14, serpentMat);
    treeGroup.add(serpent);
    // 蛇の頭（大きな楕円）
    const snakeHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 18, 12),
      serpentMat
    );
    const lastPt = serpentCurve.getPoint(0.98);
    const prevPt = serpentCurve.getPoint(0.93);
    snakeHead.position.copy(lastPt);
    snakeHead.scale.set(1.3, 0.9, 1.8);
    snakeHead.lookAt(lastPt.clone().add(lastPt.clone().sub(prevPt).multiplyScalar(5)));
    treeGroup.add(snakeHead);
    // 赤い目×2（大きく、発光）
    const headDir = lastPt.clone().sub(prevPt).normalize();
    const eyeBase = lastPt.clone().add(headDir.clone().multiplyScalar(0.18));
    [-1, 1].forEach(sgn => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xff3040 })
      );
      const side = new THREE.Vector3(-headDir.z, 0, headDir.x).normalize();
      eye.position.copy(eyeBase).add(side.multiplyScalar(0.12 * sgn));
      eye.position.y += 0.08;
      treeGroup.add(eye);
      // 目の発光スプライト
      const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0xff4040, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      eyeGlow.position.copy(eye.position);
      eyeGlow.scale.set(0.5, 0.5, 0.5);
      treeGroup.add(eyeGlow);
    });
    // 二股の舌（太く赤く）
    const tongueGeo = new THREE.BufferGeometry().setFromPoints([
      eyeBase.clone().add(headDir.clone().multiplyScalar(0.05)),
      eyeBase.clone().add(headDir.clone().multiplyScalar(0.3)),
      eyeBase.clone().add(headDir.clone().multiplyScalar(0.44)).add(new THREE.Vector3(0.07, 0, 0.07)),
      eyeBase.clone().add(headDir.clone().multiplyScalar(0.3)),
      eyeBase.clone().add(headDir.clone().multiplyScalar(0.44)).add(new THREE.Vector3(-0.07, 0, -0.07)),
    ]);
    const tongue = new THREE.Line(tongueGeo, new THREE.LineBasicMaterial({ color: 0xff3050, linewidth: 3 }));
    treeGroup.add(tongue);

    // 全メッシュを影キャスターに
    treeGroup.traverse(obj => {
      if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
    });
    scene.add(treeGroup);

    // 🪞 水面への鏡像（safeな簡易リフレクション — 反転クローン + 水レイヤー）
    // 注: ライトは複製せず、マテリアルはそのまま共有。水面は y = -0.1
    const reflectGroup = new THREE.Group();
    // 同じ treeGroup を再レンダリングする代わりに、inverted clone を作る
    const reflectTree = treeGroup.clone(true);
    reflectTree.scale.y = -1;
    reflectTree.position.y = -0.2; // 水面反転の高さオフセット
    // 反射の透明度演出: traverse して opacity 0.4 に
    reflectTree.traverse(obj => {
      if (obj.isMesh && obj.material) {
        const m = Array.isArray(obj.material) ? obj.material : [obj.material];
        m.forEach(mat => {
          const cm = mat.clone ? mat.clone() : mat;
          cm.transparent = true;
          cm.opacity = 0.32;
          cm.depthWrite = false;
          if (obj.material === mat) obj.material = cm;
        });
      }
      if (obj.isSprite && obj.material) {
        obj.material = obj.material.clone();
        obj.material.opacity *= 0.25;
      }
    });
    reflectGroup.add(reflectTree);
    scene.add(reflectGroup);
    // 🌊 水面：three.js公式 Water（利用可能なら）、なければフォールバック
    let waterSurface = null;
    let waterUniforms = null;
    if (ADDONS.Water) {
      // 法線テクスチャ（procedural ripple texture）
      const normalCanvas = (() => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512;
        const g = c.getContext('2d');
        // ベース: (0.5, 0.5, 1)に相当するフラット法線色
        g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, 512, 512);
        // 適当な波紋ノイズ
        for (let i = 0; i < 200; i++) {
          const x = Math.random() * 512, y = Math.random() * 512;
          const r = 20 + Math.random() * 60;
          const grd = g.createRadialGradient(x, y, 0, x, y, r);
          const nx = 128 + Math.floor((Math.random() - 0.5) * 60);
          const ny = 128 + Math.floor((Math.random() - 0.5) * 60);
          grd.addColorStop(0, `rgba(${nx},${ny},255,0.6)`);
          grd.addColorStop(1, 'rgba(128,128,255,0)');
          g.fillStyle = grd;
          g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
        }
        return c;
      })();
      const normalTex = new THREE.CanvasTexture(normalCanvas);
      normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
      const waterGeo = new THREE.CircleGeometry(32, 96);
      waterSurface = new ADDONS.Water(waterGeo, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: normalTex,
        sunDirection: new THREE.Vector3(0.3, 1.0, -0.2).normalize(),
        sunColor: 0xffeacc,
        waterColor: 0x5090b0,
        distortionScale: 2.0,
        alpha: 0.85,
        fog: false,
      });
      waterSurface.rotation.x = -Math.PI / 2;
      waterSurface.position.y = -0.12;
      scene.add(waterSurface);
    } else {
      // フォールバック：旧シェーダ
      const waterUniformsFallback = { uTime: { value: 0 } };
      const mat = new THREE.MeshStandardMaterial({
        color: 0x88b0cc, transparent: true, opacity: 0.5,
        roughness: 0.15, metalness: 0.6, depthWrite: false,
      });
      const waterGeo = new THREE.CircleGeometry(32, 48);
      waterSurface = new THREE.Mesh(waterGeo, mat);
      waterSurface.rotation.x = -Math.PI / 2;
      waterSurface.position.y = -0.12;
      scene.add(waterSurface);
      waterUniforms = waterUniformsFallback;
    }
    treeGroup.userData.water = waterSurface;

    // ---- 以下、旧版（変数未使用、if(false)で無害化） ----
    if (false) {
    const _legacyWaterUniforms_UNUSED = {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(0xa8d4e8) }, // 浅瀬の色
      uDeep: { value: new THREE.Color(0x3a6a90) },    // 深場の色
      uSkyColor: { value: new THREE.Color(0xe8d8c8) },
    };
    const waterMatShader = new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        // 2波重ね合わせで波面を作る
        void main() {
          vUv = uv;
          vec3 pos = position;
          // 放射波 + 流れ波
          float r = length(pos.xy);
          float w1 = sin(r * 0.4 - uTime * 1.2) * 0.08;
          float w2 = sin(pos.x * 0.9 + uTime * 0.8) * 0.04;
          float w3 = cos(pos.y * 1.1 - uTime * 0.6) * 0.03;
          pos.z += w1 + w2 + w3;
          // 法線も近似的に
          float n1x = cos(r * 0.4 - uTime * 1.2) * 0.4 * (pos.x / max(r, 0.01));
          float n1y = cos(r * 0.4 - uTime * 1.2) * 0.4 * (pos.y / max(r, 0.01));
          float n2x = cos(pos.x * 0.9 + uTime * 0.8) * 0.9;
          float n3y = -sin(pos.y * 1.1 - uTime * 0.6) * 1.1;
          vec3 n = normalize(vec3(-(n1x + n2x) * 0.15, -(n1y + n3y) * 0.15, 1.0));
          vNormal = normalMatrix * n;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vec4 mv = viewMatrix * worldPos;
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uShallow;
        uniform vec3 uDeep;
        uniform vec3 uSkyColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec3 vViewDir;

        // 2Dノイズ（ripple用）
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
          vec2 u = f*f*(3.0 - 2.0*f);
          return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }

        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);

          // フレネル（斜めから見ると反射が強い）
          float fres = pow(1.0 - max(0.0, dot(N, V)), 3.0);
          fres = mix(0.1, 1.0, fres);

          // 中心からの距離で色を混ぜる（浅→深）
          float r = length(vWorldPos.xz);
          float depth = smoothstep(2.0, 20.0, r);
          vec3 waterCol = mix(uShallow, uDeep, depth);

          // ripple: 細かい輝きノイズ
          float ripple = noise(vUv * 40.0 + uTime * 0.3) * 0.5
                       + noise(vUv * 80.0 - uTime * 0.15) * 0.25;
          ripple = smoothstep(0.55, 0.75, ripple);

          // 反射（簡易：空色を反射として加える）
          vec3 reflectCol = uSkyColor + ripple * 0.4;

          vec3 col = mix(waterCol, reflectCol, fres);
          // キラキラスペキュラ（太陽方向仮定：上＋右）
          vec3 L = normalize(vec3(0.3, 1.0, -0.2));
          float spec = pow(max(0.0, dot(reflect(-L, N), V)), 80.0);
          col += vec3(1.0, 0.95, 0.8) * spec * 0.9;

          gl_FragColor = vec4(col, 0.72 + fres * 0.2);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const _legacyWaterGeo = new THREE.CircleGeometry(30, 16);
    const _legacyWater = new THREE.Mesh(_legacyWaterGeo, waterMatShader);
    _legacyWater.visible = false;
    } // end if(false)

    // 葉の揺れアニメ用参照
    treeGroup.userData.leaves = leaves;
    treeGroup.userData.leafBases = leafBases;
    treeGroup.userData.leafDummy = leafDummy;
    treeGroup.userData.grass = grass;
    treeGroup.userData.grassBases = grassBases;
    treeGroup.userData.dust = dust;
    treeGroup.userData.dustPhase = dustPhase;
    treeGroup.userData.fireflies = fireflies;
    treeGroup.userData.firePhase = firePhase;
    treeGroup.userData.petals = petals;
    treeGroup.userData.petalBases = petalBases;
    treeGroup.userData.petalDummy = pd;
    treeGroup.userData.auraRing = auraRing;
    treeGroup.userData.raysGroup = raysGroup;
    treeGroup.userData.pillar = pillar;

    // 周辺の神秘の森（tapered tube 幹 + 葉クラスタ、12本）
    const bgLeafMat = new THREE.MeshStandardMaterial({
      map: leafTex, alphaTest: 0.5, transparent: true,
      side: THREE.DoubleSide, roughness: 0.8,
    });
    const bgLeafGeo = new THREE.PlaneGeometry(0.35, 0.48);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.3;
      const r = 10 + Math.random() * 10;
      const px = Math.cos(a) * r, pz = Math.sin(a) * r;
      const tg = new THREE.Group();
      tg.position.set(px, 0, pz);
      // 幹: 曲がりと高さに変化
      const height = 3.5 + Math.random() * 2.5;
      const tilt = (Math.random() - 0.5) * 0.3;
      const bgTrunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(tilt * 0.3, height * 0.3, tilt * 0.2),
        new THREE.Vector3(tilt * 0.6, height * 0.6, tilt * 0.4),
        new THREE.Vector3(tilt, height, tilt * 0.8),
      ]);
      const bgTrunk = makeTaperedTube(bgTrunkCurve, [0.22, 0.16, 0.1, 0.05], 12, trunkMat);
      tg.add(bgTrunk);
      // 枝4-6本＋葉クラスタ
      const branches = 4 + Math.floor(Math.random() * 3);
      const bgLeafInst = new THREE.InstancedMesh(bgLeafGeo, bgLeafMat, 60);
      const bgLeafDummy = new THREE.Object3D();
      let leafIdx = 0;
      for (let b = 0; b < branches; b++) {
        const bAng = (b / branches) * Math.PI * 2 + Math.random() * 0.4;
        const bLen = 1.0 + Math.random() * 0.8;
        const bHeight = height * (0.6 + Math.random() * 0.3);
        const tip = new THREE.Vector3(Math.cos(bAng) * bLen + tilt, bHeight + 0.4 + Math.random() * 0.5, Math.sin(bAng) * bLen + tilt * 0.8);
        const branchCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(tilt * 0.8, height * 0.7, tilt * 0.6),
          new THREE.Vector3(tip.x * 0.5 + tilt * 0.3, (height + tip.y) / 2, tip.z * 0.5),
          tip,
        ]);
        tg.add(makeTaperedTube(branchCurve, [0.08, 0.045, 0.02], 8, trunkMat));
        // この枝先周辺に葉
        for (let k = 0; k < 15; k++) {
          if (leafIdx >= 60) break;
          bgLeafDummy.position.set(
            tip.x + (Math.random() - 0.5) * 1.0,
            tip.y + (Math.random() - 0.5) * 0.8,
            tip.z + (Math.random() - 0.5) * 1.0
          );
          bgLeafDummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI * 2, Math.random() * Math.PI);
          const s = 0.7 + Math.random() * 0.5;
          bgLeafDummy.scale.set(s, s, s);
          bgLeafDummy.updateMatrix();
          bgLeafInst.setMatrixAt(leafIdx, bgLeafDummy.matrix);
          const col = new THREE.Color().setHSL(0.23 + Math.random() * 0.1, 0.4 + Math.random() * 0.25, 0.3 + Math.random() * 0.15);
          bgLeafInst.setColorAt(leafIdx, col);
          leafIdx++;
        }
      }
      bgLeafInst.count = leafIdx;
      bgLeafInst.instanceMatrix.needsUpdate = true;
      if (bgLeafInst.instanceColor) bgLeafInst.instanceColor.needsUpdate = true;
      tg.add(bgLeafInst);
      // 木全体に淡いemissive（神秘感）
      const glowHalo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: 0x80c0ff, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      glowHalo.position.y = height * 0.7;
      glowHalo.scale.set(3.5, 4.5, 3.5);
      tg.add(glowHalo);
      // tg.traverse castShadow // perf: bg trees no shadow
      scene.add(tg);
    }

    // 🏔 遠景の青い山並み（ブリューゲルの大気遠近）
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
      const r = 55 + Math.random() * 25;
      const h = 6 + Math.random() * 14;
      const mount = new THREE.Mesh(
        new THREE.ConeGeometry(8 + Math.random() * 6, h, 8),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.58, 0.25, 0.45 + Math.random() * 0.15),
          fog: true,
        })
      );
      mount.position.set(Math.cos(ang) * r, h * 0.3 - 5, Math.sin(ang) * r);
      scene.add(mount);
    }

    // 🐎 🦁 🦢 動物たち（低ポリ・ブリューゲル的配置）
    //   ジオメトリは簡素にして InstancedMesh を使わず、名前で区別
    const animalMat = {
      horse: new THREE.MeshStandardMaterial({ color: 0xe0e0d8, roughness: 0.85 }),  // 白馬
      lion:  new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.9 }),   // 獅子 黄褐色
      swan:  new THREE.MeshStandardMaterial({ color: 0xfafaf0, roughness: 0.7 }),   // 白鳥
      deer:  new THREE.MeshStandardMaterial({ color: 0x8a5a38, roughness: 0.9 }),   // 鹿
      leopard: new THREE.MeshStandardMaterial({ color: 0xc89030, roughness: 0.85 }),// 豹
      bird: new THREE.MeshStandardMaterial({ color: 0xff4030, roughness: 0.8 }),    // 赤い鳥
    };
    function makeQuadruped(color, scale = 1) {
      // 4足動物：胴体 + 頭 + 4本脚
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.35 * scale, 0.9 * scale, 4, 8),
        color
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.5 * scale;
      g.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28 * scale, 10, 8),
        color
      );
      head.position.set(0.75 * scale, 0.7 * scale, 0);
      g.add(head);
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 0.35 * scale, 6),
        color
      );
      neck.position.set(0.6 * scale, 0.62 * scale, 0);
      neck.rotation.z = -0.8;
      g.add(neck);
      for (let lx = 0; lx < 2; lx++) for (let lz = 0; lz < 2; lz++) {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08 * scale, 0.07 * scale, 0.5 * scale, 6),
          color
        );
        leg.position.set((lx ? 0.45 : -0.45) * scale, 0.25 * scale, (lz ? 0.2 : -0.2) * scale);
        g.add(leg);
      }
      // 尻尾
      const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05 * scale, 0.02 * scale, 0.4 * scale, 5),
        color
      );
      tail.position.set(-0.55 * scale, 0.55 * scale, 0);
      tail.rotation.z = 0.6;
      g.add(tail);
      return g;
    }
    function makeSwan() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 8),
        animalMat.swan
      );
      body.scale.set(1.3, 0.8, 0.9);
      body.position.y = 0.35;
      g.add(body);
      // S字の首
      const neckCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.3, 0.35, 0),
        new THREE.Vector3(0.45, 0.6, 0),
        new THREE.Vector3(0.3, 0.85, 0),
        new THREE.Vector3(0.5, 1.0, 0),
      ]);
      const neck = new THREE.Mesh(
        new THREE.TubeGeometry(neckCurve, 16, 0.06, 6, false),
        animalMat.swan
      );
      g.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), animalMat.swan);
      head.position.set(0.55, 1.05, 0);
      g.add(head);
      const beak = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0xd06020 })
      );
      beak.position.set(0.66, 1.05, 0);
      beak.rotation.z = -Math.PI / 2;
      g.add(beak);
      return g;
    }
    // 動物を配置（浮島の上、中央の樹の周囲に散らばる）
    const animalSpots = [
      { maker: () => makeQuadruped(animalMat.horse, 1.2), pos: [-5, 0.1, 4], rot: -0.6 },   // 白馬
      { maker: () => makeQuadruped(animalMat.lion, 1.1), pos: [4, 0.1, 5], rot: -2.0 },     // ライオン
      { maker: () => makeQuadruped(animalMat.deer, 0.9), pos: [6, 0.1, -3], rot: 1.2 },     // 鹿
      { maker: () => makeQuadruped(animalMat.leopard, 0.95), pos: [-4, 0.1, -5], rot: 0.5 }, // 豹
      { maker: () => makeSwan(), pos: [2, 0.15, -2], rot: 0.8 }, // 白鳥（水辺）
      { maker: () => makeSwan(), pos: [-2, 0.15, -3], rot: 1.4 }, // 白鳥2
    ];
    animalSpots.forEach(a => {
      const g = a.maker();
      g.position.set(a.pos[0], a.pos[1], a.pos[2]);
      g.rotation.y = a.rot;
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      scene.add(g);
    });

    // 🦩 GLTF で本物の動物モデル（アニメーション付き）
    //   three.js 公式サンプルの Horse/Flamingo/Parrot.glb を読み込む
    const gltfMixers = [];
    if (ADDONS.GLTFLoader) {
      const gltfLoader = new ADDONS.GLTFLoader();
      const base = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/models/gltf/';
      // フラミンゴ（飛行アニメ）— SkeletonUtils.clone で5羽の群れ
      gltfLoader.load(base + 'Flamingo.glb', (gltf) => {
        const cloneFn = (ADDONS.SkeletonUtils && ADDONS.SkeletonUtils.clone)
          ? ADDONS.SkeletonUtils.clone
          : (ADDONS.clone || ((o) => o.clone(true)));
        // glTFの構造に柔軟に対応：SkinnedMesh を探すか、scene.children[0] を使う
        let source = null;
        gltf.scene.traverse(o => { if (o.isSkinnedMesh && !source) source = o; });
        if (!source) source = gltf.scene.children[0] || gltf.scene;
        if (!source) return;
        const FLOCK = 2;
        for (let k = 0; k < FLOCK; k++) {
          const bird = cloneFn(source);
          bird.scale.set(0.015, 0.015, 0.015);
          const orbit = 7 + k * 0.8;
          const angle = (k / FLOCK) * Math.PI * 2;
          bird.position.set(Math.cos(angle) * orbit, 7 + k * 0.3, Math.sin(angle) * orbit);
          bird.rotation.y = angle + Math.PI / 2;
          bird.traverse(o => { if (o.isMesh) o.castShadow = true; });
          scene.add(bird);
          const mixer = new THREE.AnimationMixer(bird);
          mixer.clipAction(gltf.animations[0]).setDuration(1.2 + k * 0.05).play();
          gltfMixers.push({ mixer, obj: bird, orbit, angle, speed: 0.006, baseY: 7 + k * 0.3 });
        }
      }, undefined, (e) => console.warn('flamingo', e));
      // パロット（枝に止まる）
      gltfLoader.load(base + 'Parrot.glb', (gltf) => {
        let parrot = null;
        gltf.scene.traverse(o => { if (o.isSkinnedMesh && !parrot) parrot = o; });
        if (!parrot) parrot = gltf.scene.children[0] || gltf.scene;
        if (!parrot) return;
        parrot.scale.set(0.02, 0.02, 0.02);
        parrot.position.set(-5, 8, 2);
        parrot.traverse(o => { if (o.isMesh) o.castShadow = true; });
        scene.add(parrot);
        const mixer = new THREE.AnimationMixer(parrot);
        mixer.clipAction(gltf.animations[0]).play();
        gltfMixers.push({ mixer, obj: parrot, orbit: 6, angle: Math.PI, speed: 0.004, baseY: 8 });
      }, undefined, (e) => console.warn('parrot', e));
      // 馬（地上を走る）
      gltfLoader.load(base + 'Horse.glb', (gltf) => {
        let horse = null;
        gltf.scene.traverse(o => { if (o.isSkinnedMesh && !horse) horse = o; });
        if (!horse) horse = gltf.scene.children[0] || gltf.scene;
        if (!horse) return;
        horse.scale.set(0.015, 0.015, 0.015);
        // 島は中央が高い丘。馬の足元を島の表面に合わせる
        const hx = -6, hz = 5;
        const hillY = Math.exp(-(hx*hx + hz*hz) / 120) * 2.4;
        horse.geometry?.computeBoundingBox?.();
        const bb = horse.geometry?.boundingBox;
        const footOffset = bb ? -bb.min.y * 0.015 : 2.0;
        horse.position.set(hx, hillY + footOffset, hz);
        horse.rotation.y = 0.5;
        horse.traverse(o => { if (o.isMesh) o.castShadow = true; });
        scene.add(horse);
        const mixer = new THREE.AnimationMixer(horse);
        mixer.clipAction(gltf.animations[0]).play();
        gltfMixers.push({ mixer, obj: horse, orbit: 0, angle: 0, speed: 0, baseY: 0 });
      }, undefined, (e) => console.warn('horse', e));
    }

    // 🐦 赤い鳥（樹の枝に止まる × 10）
    for (let i = 0; i < 10; i++) {
      const bird = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 6),
        animalMat.bird
      );
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 4;
      const y = 4 + Math.random() * 5;
      bird.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      bird.scale.set(1.3, 0.8, 1);
      scene.add(bird);
    }

    // 🌺 バラ（小さな赤い点）
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 5;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.02, 0.3, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a6a4a })
      );
      stem.position.set(Math.cos(a) * r, 0.15, Math.sin(a) * r);
      scene.add(stem);
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xff3060, roughness: 0.4, emissive: 0x4a0810, emissiveIntensity: 0.3 })
      );
      flower.position.copy(stem.position); flower.position.y = 0.32;
      scene.add(flower);
    }

    // 蝶（ドット群で飛ぶ）
    const butterflies = [];
    for (let i = 0; i < 3; i++) {
      const bf = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xffd070 : 0xff80c0 })
      );
      bf.position.set((Math.random() - 0.5) * 12, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 12);
      bf.userData.phase = Math.random() * Math.PI * 2;
      scene.add(bf);
      butterflies.push(bf);
    }

    // 操作: ドラッグで視点を回す / タップで幹を叩くとリンゴが落ちる
    let dragging = false, lastX = 0, lastY = 0, dragStart = 0, startX = 0, startY = 0;
    let camAngle = 0, camTilt = 0.2, camDist = 32;
    const edenRay = new THREE.Raycaster();
    const edenPtr = new THREE.Vector2();
    function handleTap(cx, cy) {
      const rect = renderer.domElement.getBoundingClientRect();
      edenPtr.x = ((cx - rect.left) / rect.width) * 2 - 1;
      edenPtr.y = -((cy - rect.top) / rect.height) * 2 + 1;
      edenRay.setFromCamera(edenPtr, camera);
      // 幹 + 落下中リンゴ + 地面のリンゴをチェック
      const targets = [trunk];
      apples.forEach(a => { if (a.userData.state !== 'eaten') targets.push(a); });
      const hits = edenRay.intersectObjects(targets, false);
      if (!hits.length) return;
      const hit = hits[0].object;
      if (apples.includes(hit)) {
        // リンゴ直接タップ
        if (hit.userData.state === 'fallen') {
          showEatDialog(hit);
        } else if (hit.userData.state === 'onTree') {
          dropApple(hit);
        }
      } else if (hit === trunk) {
        // 幹タップ → ランダムなonTreeリンゴを落とす
        const ripe = apples.filter(a => a.userData.state === 'onTree');
        if (ripe.length) {
          const a = ripe[Math.floor(Math.random() * ripe.length)];
          dropApple(a);
          // 木の揺れ視覚化：全体軽く震える（camera shakeで代用）
          shakeAmount = 0.4;
        }
      }
    }
    function dropApple(apple) {
      apple.userData.state = 'falling';
      apple.userData.vel.set((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
      // 茎を消す
      if (apple.userData.stem) apple.userData.stem.visible = false;
    }
    let shakeAmount = 0;

    renderer.domElement.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      dragStart = Date.now(); startX = e.clientX; startY = e.clientY;
    });
    renderer.domElement.addEventListener('pointermove', e => {
      if (!dragging) return;
      camAngle -= (e.clientX - lastX) * 0.008;
      camTilt = Math.max(-0.3, Math.min(0.8, camTilt + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener('pointerup', e => {
      dragging = false;
      const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
      const dt = Date.now() - dragStart;
      if (moved < 8 && dt < 350) handleTap(e.clientX, e.clientY);
    });
    renderer.domElement.addEventListener('pointerleave', () => dragging = false);

    // 🍎 食べる？ダイアログ
    function showEatDialog(apple) {
      if (apple.userData.state === 'eaten') return;
      apple.userData.state = 'eating'; // 重複防止
      const dlg = document.createElement('div');
      dlg.className = 'eden-eat-dialog';
      dlg.innerHTML = `
        <div class="eed-box">
          <div class="eed-apple">🍎</div>
          <div class="eed-q">このリンゴを食べますか？</div>
          <div class="eed-hint">— 善悪を知る実。口にすれば、もう戻れない —</div>
          <div class="eed-actions">
            <button class="eed-btn eed-yes">食べる</button>
            <button class="eed-btn eed-no">食べない</button>
          </div>
        </div>
      `;
      ov.appendChild(dlg);
      requestAnimationFrame(() => dlg.classList.add('show'));
      dlg.querySelector('.eed-yes').addEventListener('click', () => {
        dlg.classList.remove('show');
        setTimeout(() => dlg.remove(), 300);
        apple.userData.state = 'eaten';
        apple.visible = false;
        if (apple.userData.halo) apple.userData.halo.visible = false;
        if (apple.userData.hl) apple.userData.hl.visible = false;
        // 世界が揺らぐ演出：フラッシュ
        const flash = document.createElement('div');
        flash.className = 'eden-flash';
        ov.appendChild(flash);
        setTimeout(() => flash.classList.add('on'), 10);
        setTimeout(() => flash.classList.remove('on'), 900);
        setTimeout(() => flash.remove(), 1700);
        // メッセージ
        const msg = document.createElement('div');
        msg.className = 'eden-message';
        msg.innerHTML = `<div class="eed-msg-inner">
          <div class="eed-msg-super">— 知恵の実を食べた —</div>
          <div class="eed-msg-title">目が開かれた</div>
          <div class="eed-msg-body">あなたは善と悪を知った。<br>楽園は、もはや無垢ではいられない。</div>
        </div>`;
        ov.appendChild(msg);
        requestAnimationFrame(() => msg.classList.add('show'));
        setTimeout(() => { msg.classList.remove('show'); setTimeout(() => msg.remove(), 600); }, 4500);
      });
      dlg.querySelector('.eed-no').addEventListener('click', () => {
        dlg.classList.remove('show');
        setTimeout(() => dlg.remove(), 300);
        apple.userData.state = 'fallen'; // また食べられるように
      });
    }
    renderer.domElement.addEventListener('wheel', e => {
      e.preventDefault();
      camDist = Math.max(6, Math.min(50, camDist + e.deltaY * 0.01));
    }, { passive: false });
    // ピンチ
    let pinchBase = 0, pinchBaseDist = 10;
    renderer.domElement.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchBase = Math.hypot(dx, dy);
        pinchBaseDist = camDist;
      }
    });
    renderer.domElement.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchBase > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        camDist = Math.max(6, Math.min(50, pinchBaseDist * pinchBase / d));
      }
    });

    let t = 0;
    function animate() {
      if (!running) return;
      if (document.hidden) { requestAnimationFrame(animate); return; }
      t += 0.016;
      // ドラッグ無い時はゆっくり自動旋回
      if (!dragging) camAngle += 0.002;
      // カメラ揺れ（木タップ時）
      let shakeX = 0, shakeY = 0;
      if (shakeAmount > 0.001) {
        shakeX = (Math.random() - 0.5) * shakeAmount;
        shakeY = (Math.random() - 0.5) * shakeAmount;
        shakeAmount *= 0.88;
      }
      camera.position.x = Math.cos(camAngle) * camDist + shakeX;
      camera.position.z = Math.sin(camAngle) * camDist;
      camera.position.y = 8.5 + camTilt * 10 + shakeY;
      camera.lookAt(0, 7.5, 0);
      // 太陽シェーダのアニメ
      sunUniforms.uTime.value = t;
      // ✨ 魂粒子シェーダ時間
      if (scene.userData.soulMat) scene.userData.soulMat.uniforms.uTime.value = t;
      // 🔮 プラズマ魂球の時間 + 浮遊
      if (scene.userData.orbMat) {
        scene.userData.orbMat.uniforms.uTime.value = t;
        const orb = scene.userData.orb;
        orb.position.y = 5.5 + Math.sin(t * 0.6) * 0.4;
        orb.position.x = 1.8 + Math.cos(t * 0.3) * 0.3;
        orb.rotation.y = t * 0.2;
        scene.userData.orbLight.position.copy(orb.position);
        scene.userData.orbLight.intensity = 1.3 + Math.sin(t * 2) * 0.4;
      }
      // 🌟 God ray: 太陽のスクリーン空間座標を毎フレーム更新
      if (camera.userData.godRayPass) {
        const sv = camera.userData.godRaySunPos.clone().project(camera);
        camera.userData.godRayPass.uniforms.sunScreen.value.set(
          sv.x * 0.5 + 0.5,
          sv.y * 0.5 + 0.5
        );
        // 太陽が画面外・背面ならrayを弱める
        const behind = sv.z > 1;
        const outside = Math.abs(sv.x) > 1.2 || Math.abs(sv.y) > 1.2;
        camera.userData.godRayPass.uniforms.exposure.value = (behind || outside) ? 0 : 0.3;
      }
      // 水面のアニメ（THREE.Water は material.uniforms.time を回す）
      if (treeGroup.userData.water && treeGroup.userData.water.material?.uniforms?.time) {
        treeGroup.userData.water.material.uniforms.time.value += 1 / 60;
      }
      // 🍎 OutlinePass: 落ちた＆onTreeのリンゴをハイライト対象に
      if (edenOutlinePass) {
        edenOutlinePass.selectedObjects = apples.filter(a => a.userData.state === 'fallen' || a.userData.state === 'onTree');
      }
      // 🎥 CubeCamera 更新（120フレーム=2秒に1回、軽量）
      if (edenCubeCam && (Math.floor(t * 60) % 120 === 0)) {
        try { edenCubeCam.update(renderer, scene); } catch {}
      }
      // 🦩 GLTF アニメーション更新 + 飛行軌道
      gltfMixers.forEach(gm => {
        gm.mixer.update(1 / 60);
        if (gm.orbit > 0) {
          gm.angle += gm.speed;
          gm.obj.position.x = Math.cos(gm.angle) * gm.orbit;
          gm.obj.position.z = Math.sin(gm.angle) * gm.orbit;
          gm.obj.position.y = gm.baseY + Math.sin(t + gm.angle) * 0.5;
          gm.obj.rotation.y = -gm.angle - Math.PI / 2;
        }
      });
      // レンズフレア: 太陽→カメラ中心を結ぶ線上に配置
      {
        const sv = SUN_POS.clone().project(camera); // NDC座標
        const cv = new THREE.Vector3(0, 0, sv.z); // 画面中心
        flares.forEach(f => {
          // NDC上で太陽から中心へ向かってfactor*tの位置
          const fx = sv.x + (cv.x - sv.x) * f.t;
          const fy = sv.y + (cv.y - sv.y) * f.t;
          const pos = new THREE.Vector3(fx, fy, 0.5).unproject(camera);
          f.spr.position.copy(pos);
          // 太陽が画面外/裏側のときはフェード
          const hidden = sv.z > 1 || Math.abs(sv.x) > 1.3 || Math.abs(sv.y) > 1.3;
          f.spr.material.opacity = hidden ? 0 : 0.45;
        });
      }
      // リンゴのゆらぎ & 落下物理
      treeGroup.children.forEach(c => {
        if (!c.userData.basePos) return;
        // リンゴの状態別処理（apples配列に含まれるかで判定）
        if (c.userData.state === 'falling') {
          c.userData.vel.y -= 0.028; // gravity
          c.position.add(c.userData.vel);
          c.rotation.x += 0.12; c.rotation.z += 0.08;
          if (c.userData.halo) c.userData.halo.position.copy(c.position);
          if (c.userData.hl) c.userData.hl.position.set(c.position.x - 0.05, c.position.y + 0.08, c.position.z);
          // 島の丘の高さに合わせる（中央が高い地面）
          const r = Math.hypot(c.position.x, c.position.z);
          const gy = Math.exp(-r * r / 120) * 2.4 + 0.15; // 地面 + リンゴ半径
          if (c.position.y <= gy) {
            c.position.y = gy;
            c.userData.vel.set(0, 0, 0);
            c.userData.state = 'fallen';
          }
          return;
        }
        if (c.userData.state === 'fallen' || c.userData.state === 'eating' || c.userData.state === 'eaten') return;
        // onTreeのリンゴ・その他のbasePos系: 通常のゆらぎ
        c.userData.phase += 0.03;
        c.position.x = c.userData.basePos.x + Math.sin(c.userData.phase) * 0.03;
        c.position.y = c.userData.basePos.y + Math.cos(c.userData.phase * 0.7) * 0.02;
      });
      // 葉のそよぎ（InstancedMesh）
      if (treeGroup.userData.leaves) {
        const lv = treeGroup.userData.leaves;
        const bases = treeGroup.userData.leafBases;
        const dm = treeGroup.userData.leafDummy;
        const wind = Math.sin(t * 0.8) * 0.15;
        for (let i = 0; i < bases.length; i++) {
          const b = bases[i];
          b.phase += 0.04;
          dm.position.set(
            b.base.x + Math.sin(b.phase) * 0.04 + wind * 0.08,
            b.base.y + Math.cos(b.phase * 0.7) * 0.03,
            b.base.z + Math.cos(b.phase * 0.9) * 0.04
          );
          dm.rotation.set(
            Math.sin(b.phase) * 0.3 + b.rotY * 0.01,
            b.rotY + wind * 0.5,
            Math.cos(b.phase * 0.8) * 0.2
          );
          const s = 1.0 + Math.sin(b.phase * 2) * 0.03;
          dm.scale.set(s, s, s);
          dm.updateMatrix();
          lv.setMatrixAt(i, dm.matrix);
        }
        lv.instanceMatrix.needsUpdate = true;
      }
      // 草そよぎ（yaw揺動だけで済ませる — 軽量）
      if (treeGroup.userData.grass && (Math.floor(t * 30) % 2 === 0)) {
        const gr = treeGroup.userData.grass;
        const gb = treeGroup.userData.grassBases;
        const tmp = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const eul = new THREE.Euler();
        const tp = new THREE.Vector3();
        const sc = new THREE.Vector3();
        const wind2 = Math.sin(t * 1.1) * 0.12;
        for (let i = 0; i < gb.length; i++) {
          gr.getMatrixAt(i, tmp);
          tmp.decompose(tp, q, sc);
          eul.setFromQuaternion(q);
          eul.x = Math.sin(gb[i].phase + t * 2) * 0.08 + wind2;
          eul.y = gb[i].rotY;
          q.setFromEuler(eul);
          tmp.compose(tp, q, sc);
          gr.setMatrixAt(i, tmp);
        }
        gr.instanceMatrix.needsUpdate = true;
      }
      // 蛍（黄の光粒）が漂う
      if (treeGroup.userData.fireflies) {
        const ff = treeGroup.userData.fireflies;
        const fp = ff.geometry.attributes.position;
        const phs = treeGroup.userData.firePhase;
        for (let i = 0; i < phs.length; i++) {
          phs[i] += 0.025 + (i % 5) * 0.005;
          fp.array[i*3] += Math.sin(phs[i]) * 0.008;
          fp.array[i*3+1] += Math.cos(phs[i] * 0.6) * 0.005;
          fp.array[i*3+2] += Math.cos(phs[i] * 0.9) * 0.008;
        }
        fp.needsUpdate = true;
        ff.material.opacity = 0.75 + Math.sin(t * 3) * 0.2;
      }
      // 花びらの舞い（降下 + 回転）
      if (treeGroup.userData.petals) {
        const ps = treeGroup.userData.petals;
        const pb = treeGroup.userData.petalBases;
        const pdm = treeGroup.userData.petalDummy;
        for (let i = 0; i < pb.length; i++) {
          const b = pb[i];
          b.phase += 0.02;
          b.y -= b.speed * 0.02;
          if (b.y < 0.1) b.y = 6 + Math.random() * 2;
          pdm.position.set(
            b.x + Math.sin(b.phase) * 0.3,
            b.y,
            b.z + Math.cos(b.phase * 0.8) * 0.3
          );
          pdm.rotation.set(b.rx + b.phase * 0.3, b.ry + b.phase * 0.5, b.rz + b.phase * 0.4);
          pdm.updateMatrix();
          ps.setMatrixAt(i, pdm.matrix);
        }
        ps.instanceMatrix.needsUpdate = true;
      }
      // 光輪の脈動
      if (treeGroup.userData.auraRing) {
        treeGroup.userData.auraRing.material.opacity = 0.18 + Math.sin(t * 1.2) * 0.08;
        treeGroup.userData.auraRing.rotation.z = t * 0.15;
      }
      // 光の柱ゆらぎ
      if (treeGroup.userData.pillar) {
        treeGroup.userData.pillar.material.opacity = 0.07 + Math.sin(t * 0.7) * 0.04;
      }
      // ゴッドレイのゆっくり旋回
      if (treeGroup.userData.raysGroup) {
        treeGroup.userData.raysGroup.rotation.y = Math.sin(t * 0.2) * 0.05;
      }
      // ダストモート漂流
      if (treeGroup.userData.dust) {
        const dp = treeGroup.userData.dust.geometry.attributes.position;
        const ph = treeGroup.userData.dustPhase;
        for (let i = 0; i < ph.length; i++) {
          ph[i] += 0.008;
          dp.array[i*3] += Math.sin(ph[i]) * 0.004;
          dp.array[i*3+1] += Math.cos(ph[i] * 0.7) * 0.003 + 0.002;
          dp.array[i*3+2] += Math.cos(ph[i]) * 0.003;
          // 上に抜けたらリセット
          if (dp.array[i*3+1] > 8) dp.array[i*3+1] = 1;
        }
        dp.needsUpdate = true;
      }
      // 蝶の浮遊
      butterflies.forEach(bf => {
        bf.userData.phase += 0.05;
        bf.position.y += Math.sin(bf.userData.phase) * 0.01;
        bf.position.x += Math.cos(bf.userData.phase * 0.6) * 0.02;
      });
      if (composer) {
        if (camera.userData.gradePass) {
          camera.userData.gradePass.uniforms.uTime.value = t;
        }
        composer.render();
      } else if (bloom) {
        bloom.render(scene, camera);
      } else {
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', () => {
      const w = stage.clientWidth || window.innerWidth;
      const h = stage.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
      if (composer) composer.setSize(w, h);
      else if (bloom) bloom.setSize(w, h);
    });
  }
  window.openEden3D = openEden3D;

  // ============================================================
  // 🏛 バベルの塔（3D・螺旋に登る）
  // ============================================================
  async function openBabel3D() {
    if (!window.THREE) return;
    const THREE = window.THREE;
    if (window.THREE_READY) { try { await window.THREE_READY; } catch {} }
    const ADDONS = window.THREE_ADDONS || {};
    const ov = document.createElement('div');
    ov.className = 'babel3d-overlay';
    ov.innerHTML = `
      <button class="babel3d-close" aria-label="閉じる">×</button>
      <div class="babel3d-stage" id="babel3dStage"></div>
      <div class="babel3d-title">バベルの塔</div>
      <div class="babel3d-sub">— 天に届こうとした、一つの言葉のうた —</div>
      <div class="babel3d-hint" id="babel3dHint">
        <div>ドラッグで視点を回す　／　ホイール・ピンチでズーム</div>
        <div>タップで「言葉の混乱」を起こす</div>
      </div>
      <button class="babel3d-chaos" id="babel3dChaos">🌀 混乱を起こす</button>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    let running = true;
    ov.querySelector('.babel3d-close').addEventListener('click', () => {
      running = false;
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 400);
    });

    const stage = ov.querySelector('#babel3dStage');
    const W = () => stage.clientWidth || window.innerWidth;
    const H = () => stage.clientHeight || window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.setSize(W(), H());
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // WebXR は composer と競合するので一時無効
    stage.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene();
    let composer = null;
    let bloom = null;
    // torchLights TDZバグ修正後、composer 復活
    const useProB = ADDONS.EffectComposer && ADDONS.RenderPass && ADDONS.UnrealBloomPass;
    // camera 作成後に初期化
    // 嵐の空（暗い青紫→遠くに黄土）
    // 晴天フォールバック空（Sky addon 失敗時用、Bruegel明るい午後）
    const skyTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 2048; sc.height = 1024;
      const g = sc.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 1024);
      grd.addColorStop(0, '#6a88b8');   // 高空の青
      grd.addColorStop(0.35, '#9abacc');
      grd.addColorStop(0.6, '#d4c8a8'); // 地平線に近い暖色
      grd.addColorStop(1, '#e8dcb8');
      g.fillStyle = grd; g.fillRect(0, 0, 2048, 1024);
      // 柔らかい雲
      for (let i = 0; i < 24; i++) {
        const x = Math.random() * 2048, y = 100 + Math.random() * 420;
        const w = 120 + Math.random() * 260;
        const grd2 = g.createRadialGradient(x, y, 0, x, y, w);
        grd2.addColorStop(0, 'rgba(255,255,255,0.75)');
        grd2.addColorStop(0.5, 'rgba(255,250,240,0.35)');
        grd2.addColorStop(1, 'rgba(255,250,240,0)');
        g.fillStyle = grd2;
        g.beginPath(); g.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI*2); g.fill();
      }
      return new THREE.CanvasTexture(sc);
    })();
    // 🌤 空：Poly Haven の HDRI を最優先で使う（本物の大気）
    renderer.setClearColor(0xb0c4d8, 1);
    scene.background = skyTex; // フォールバック昼空

    // HDRI は一時的に無効化（切り分けのため）

    if (ADDONS.Sky) {
      const bsky = new ADDONS.Sky();
      bsky.scale.setScalar(600);
      const bs = bsky.material.uniforms;
      bs['turbidity'].value = 6.5;
      bs['rayleigh'].value = 1.8;
      bs['mieCoefficient'].value = 0.006;
      bs['mieDirectionalG'].value = 0.75;
      const phi = THREE.MathUtils.degToRad(90 - 55); // 高度55°（午後の明るい太陽）
      const theta = THREE.MathUtils.degToRad(-60);
      const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      bs['sunPosition'].value.copy(sunDir);
      scene.add(bsky);
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const envRT = pmrem.fromScene(bsky);
        scene.environment = envRT.texture;
        if ('environmentIntensity' in scene) scene.environmentIntensity = 0.7;
      } catch (e) { console.warn('babel PMREM', e); }
    } else {
      scene.background = skyTex;
    }
    scene.fog = new THREE.FogExp2(0xd4c8a8, 0.0045); // 指数フォグ＝より自然な大気遠近

    // 環境光・主光源
    scene.add(new THREE.AmbientLight(0xd8d0b8, 0.7));
    const hemi = new THREE.HemisphereLight(0xe8d8b8, 0x6a5a3a, 1.2);
    scene.add(hemi);
    const sunLight = new THREE.DirectionalLight(0xffefd0, 2.2);
    sunLight.position.set(-30, 50, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(512, 512);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -40; sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 60; sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.radius = 2;
    scene.add(sunLight);
    // 雷用のフラッシュ光（通常はオフ）
    const flashLight = new THREE.DirectionalLight(0xfffff0, 0);
    flashLight.position.set(10, 100, -10);
    scene.add(flashLight);

    // === レンガテクスチャ（ziggurat の石肌） ===
    // ブリューゲル忠実：クリーム＋サーモンピンクの2トーン石
    const brickTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const g = c.getContext('2d');
      // ベース: クリーム色
      g.fillStyle = '#e8d4b0'; g.fillRect(0, 0, 512, 256);
      const bw = 48, bh = 20;
      for (let y = 0; y < 256; y += bh) {
        const off = (Math.floor(y / bh) % 2) * (bw / 2);
        for (let x = -bw; x < 512; x += bw) {
          // 2トーン: 大部分はクリーム系、時々サーモンピンク、まれに暗茶（風化）
          const roll = Math.random();
          let r, gn, bl;
          if (roll < 0.18) {
            // サーモンピンク（露出した内部石）
            r = 200 + Math.random() * 40;
            gn = 140 + Math.random() * 30;
            bl = 110 + Math.random() * 25;
          } else if (roll < 0.28) {
            // 暗茶（風化・日陰）
            r = 140 + Math.random() * 30;
            gn = 110 + Math.random() * 25;
            bl = 75 + Math.random() * 20;
          } else {
            // クリーム系（メイン）
            r = 210 + Math.random() * 30;
            gn = 185 + Math.random() * 25;
            bl = 145 + Math.random() * 25;
          }
          g.fillStyle = `rgb(${r|0},${gn|0},${bl|0})`;
          g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
          // 目地影
          g.fillStyle = 'rgba(60,40,25,0.28)';
          g.fillRect(x + off, y + bh - 2, bw, 2);
          g.fillRect(x + off + bw - 2, y, 2, bh);
        }
      }
      // 風化・苔斑点
      for (let i = 0; i < 150; i++) {
        g.fillStyle = `rgba(${60+Math.random()*30},${45+Math.random()*20},${25+Math.random()*15},${0.15 + Math.random() * 0.2})`;
        g.fillRect(Math.random() * 512, Math.random() * 256, 2 + Math.random() * 6, 1 + Math.random() * 2);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    })();
    const brickMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.92, color: 0xd8c8a8 });
    const darkCoreMat = new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.95 });

    // 🎨 Poly Haven の本物レンガPBRテクスチャ（非同期、ロードできたら置き換え）
    (function loadRealPBR() {
      const base = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/castle_brick_broken_06';
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      const applyTo = (prop, url, cfg) => {
        loader.load(url, (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(8, 3);
          if (cfg) cfg(tex);
          brickMat[prop] = tex;
          brickMat.needsUpdate = true;
        }, undefined, () => {});
      };
      applyTo('map', `${base}/castle_brick_broken_06_diff_1k.jpg`, (t) => {
        if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace;
      });
      applyTo('normalMap', `${base}/castle_brick_broken_06_nor_gl_1k.jpg`);
      applyTo('roughnessMap', `${base}/castle_brick_broken_06_rough_1k.jpg`);
      // 元のprocedural色を無効化
      brickMat.color.set(0xffffff);
    })();

    // 🏛 塔本体：ブリューゲル風の階段状ジッグラト
    //   各段は「円柱（壁）＋アーチ窓＋はっきりしたテラス」。
    //   次の段は明確に縮む（＝段差が見える）
    const STAGES = 10;
    const baseRadius = 28;
    const stageHeight = 4.5;
    const stepInset = 1.8; // 各段で半径がこれだけ縮む
    const tower = new THREE.Group();
    const stageMeshes = [];
    // アーチ窓のテクスチャ（壁の前面に貼る）
    const archTex = (() => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 1024, 128);
      // 一定間隔でアーチの暗い穴
      const archCount = 24;
      const archW = 28, archH = 60;
      for (let k = 0; k < archCount; k++) {
        const cx = (k + 0.5) * (1024 / archCount);
        const cy = 80;
        // 暗い背景（中）
        g.fillStyle = 'rgba(10,6,2,0.88)';
        g.beginPath();
        g.moveTo(cx - archW/2, cy + archH/2);
        g.lineTo(cx - archW/2, cy - archH/2 + archW/2);
        g.arc(cx, cy - archH/2 + archW/2, archW/2, Math.PI, 0);
        g.lineTo(cx + archW/2, cy + archH/2);
        g.closePath();
        g.fill();
        // ハイライトエッジ
        g.strokeStyle = 'rgba(255,220,170,0.5)';
        g.lineWidth = 2;
        g.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      return t;
    })();
    // 🎥 CubeCamera: 動的環境反射マップ（金の装飾用）
    let cubeCam = null, cubeRT = null;
    try {
      cubeRT = new THREE.WebGLCubeRenderTarget(128, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
      cubeCam = new THREE.CubeCamera(1, 300, cubeRT);
      cubeCam.position.set(0, 20, 0);
      scene.add(cubeCam);
    } catch (e) { console.warn('CubeCamera failed', e); }
    for (let i = 0; i < STAGES; i++) {
      const rOuter = baseRadius - i * stepInset; // 段ごとに明確に縮む
      const yBase = i * stageHeight;
      // 壁（ストレート円柱、両面に見せるため DoubleSide + 閉じたジオメトリ）
      const wallGeo = new THREE.CylinderGeometry(rOuter, rOuter, stageHeight * 0.85, 32, 1, false);
      const wallMatDS = brickMat.clone();
      wallMatDS.side = THREE.DoubleSide;
      const wall = new THREE.Mesh(wallGeo, wallMatDS);
      wall.position.y = yBase + stageHeight * 0.425;
      wall.castShadow = true; wall.receiveShadow = true;
      tower.add(wall);
      // 🏛 内部コア（アーチ越しに見えても"気持ち悪くない"暗い内壁）
      const coreR = Math.max(1, rOuter - 1.2);
      const coreGeo = new THREE.CylinderGeometry(coreR, coreR, stageHeight * 0.85, 16, 1, false);
      const core = new THREE.Mesh(coreGeo, darkCoreMat);
      core.position.y = yBase + stageHeight * 0.425;
      core.receiveShadow = true;
      tower.add(core);
      // 旧アーチ層は削除。InstancedMeshで本物の3D窓を下で作成
      // テラス（次の段のために、この段の頂上にリング状の床）
      const terraceOuter = rOuter;
      const terraceInner = Math.max(3, rOuter - stepInset - 0.1);
      const terraceGeo = new THREE.RingGeometry(terraceInner, terraceOuter, 24);
      const terrace = new THREE.Mesh(
        terraceGeo,
        new THREE.MeshStandardMaterial({ map: brickTex, color: 0xd8c098, roughness: 0.9 })
      );
      terrace.rotation.x = -Math.PI / 2;
      terrace.position.y = yBase + stageHeight * 0.85;
      terrace.receiveShadow = true;
      tower.add(terrace);
      // 段差の装飾リング（上下の帯）
      const trimTop = new THREE.Mesh(
        new THREE.TorusGeometry(rOuter + 0.04, 0.15, 6, 24),
        new THREE.MeshStandardMaterial({
          color: 0xc8a050, roughness: 0.35, metalness: 0.85,
          envMap: cubeRT ? cubeRT.texture : null, // 動的反射
        })
      );
      trimTop.rotation.x = Math.PI / 2;
      trimTop.position.y = yBase + stageHeight * 0.85;
      tower.add(trimTop);
      const trimBottom = new THREE.Mesh(
        new THREE.TorusGeometry(rOuter + 0.04, 0.12, 6, 24),
        new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: 0.8 })
      );
      trimBottom.rotation.x = Math.PI / 2;
      trimBottom.position.y = yBase + 0.08;
      tower.add(trimBottom);
      // 柱（4方向に）
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.32, stageHeight * 0.85, 10),
          new THREE.MeshStandardMaterial({ color: 0xd8b078, roughness: 0.7 })
        );
        col.position.set(Math.cos(a) * (rOuter + 0.2), yBase + stageHeight * 0.425, Math.sin(a) * (rOuter + 0.2));
        // col.castShadow = true;
        tower.add(col);
      }
      stageMeshes.push({ yTop: yBase + stageHeight * 0.85, r: rOuter });
    }

    // 🏛 実3Dアーチ窓（InstancedMesh で数百個を1ドローコール）
    //   Bruegelの塔は無数の小さな窓。それを本物のBoxの凹みで再現
    {
      // ---- アーチ窓のジオメトリ（小さな暗い box を壁の表面にめり込ませる）
      const archW = 0.6, archH = 1.4, archD = 0.35;
      const archWinGeo = new THREE.BoxGeometry(archW, archH, archD);
      const archWinMat = new THREE.MeshStandardMaterial({
        color: 0x08060a, roughness: 0.95, metalness: 0,
      });
      // 総数を数える
      let totalWindows = 0;
      stageMeshes.forEach(sm => {
        const perRing = Math.max(14, Math.floor(sm.r * 2.2));
        totalWindows += perRing * 2; // 上段/下段2列
      });
      const windows = new THREE.InstancedMesh(archWinGeo, archWinMat, totalWindows);
      const wd = new THREE.Object3D();
      let idx = 0;
      stageMeshes.forEach((sm, si) => {
        const perRing = Math.max(14, Math.floor(sm.r * 2.2));
        for (let row = 0; row < 2; row++) {
          const yOff = (row === 0 ? -1 : 1) * 0.75;
          for (let k = 0; k < perRing; k++) {
            const ang = (k / perRing) * Math.PI * 2 + (si + row) * 0.2;
            const px = Math.cos(ang) * sm.r;
            const pz = Math.sin(ang) * sm.r;
            wd.position.set(px, sm.yTop - stageHeight * 0.5 + yOff, pz);
            wd.lookAt(0, wd.position.y, 0); // 塔中心を向く
            wd.updateMatrix();
            windows.setMatrixAt(idx++, wd.matrix);
          }
        }
      });
      windows.count = idx;
      windows.instanceMatrix.needsUpdate = true;
      tower.add(windows);

      // ---- アーチの上半円（キャンバスで描いた白い縁を Sprite 様に）
      // 実際には小さな CircleGeometry の半円リングを Instanced で
      const archArcMat = new THREE.MeshStandardMaterial({ color: 0xa08860, roughness: 0.85 });
      const archArcGeo = new THREE.TorusGeometry(archW * 0.5, 0.08, 6, 10, Math.PI);
      const archArc = new THREE.InstancedMesh(archArcGeo, archArcMat, totalWindows);
      idx = 0;
      stageMeshes.forEach((sm, si) => {
        const perRing = Math.max(14, Math.floor(sm.r * 2.2));
        for (let row = 0; row < 2; row++) {
          const yOff = (row === 0 ? -1 : 1) * 0.75 + archH * 0.5;
          for (let k = 0; k < perRing; k++) {
            const ang = (k / perRing) * Math.PI * 2 + (si + row) * 0.2;
            const px = Math.cos(ang) * (sm.r + 0.18);
            const pz = Math.sin(ang) * (sm.r + 0.18);
            wd.position.set(px, sm.yTop - stageHeight * 0.5 + yOff, pz);
            wd.lookAt(0, wd.position.y, 0);
            wd.rotateX(Math.PI / 2);
            wd.updateMatrix();
            archArc.setMatrixAt(idx++, wd.matrix);
          }
        }
      });
      archArc.count = idx;
      archArc.instanceMatrix.needsUpdate = true;
      tower.add(archArc);

      // 💡 灯のともる窓（一部の窓だけ emissive で光る、住んでる感）
      const litMat = new THREE.MeshBasicMaterial({
        color: 0xffd080, fog: false,
      });
      const litGeo = new THREE.BoxGeometry(archW * 0.85, archH * 0.85, archD * 0.5);
      // 窓数の約20%を光らせる
      const litCount = Math.ceil(idx * 0.2);
      const lit = new THREE.InstancedMesh(litGeo, litMat, litCount);
      const ld = new THREE.Object3D();
      // ランダムに idx の中から litCount 個選ぶ
      const picked = new Set();
      let p = 0;
      while (picked.size < litCount && p < 1000) {
        picked.add(Math.floor(Math.random() * idx));
        p++;
      }
      let li = 0;
      stageMeshes.forEach((sm, si) => {
        const perRing = Math.max(14, Math.floor(sm.r * 2.2));
        for (let row = 0; row < 2; row++) {
          const yOff = (row === 0 ? -1 : 1) * 0.75;
          for (let k = 0; k < perRing; k++) {
            const winIdx = (li); // 通し番号
            li++;
            if (!picked.has(winIdx - 1)) continue;
            const ang = (k / perRing) * Math.PI * 2 + (si + row) * 0.2;
            const px = Math.cos(ang) * (sm.r - 0.05); // ちょっと内側に
            const pz = Math.sin(ang) * (sm.r - 0.05);
            ld.position.set(px, sm.yTop - stageHeight * 0.5 + yOff, pz);
            ld.lookAt(0, ld.position.y, 0);
            ld.updateMatrix();
            // 注：we're filling sequentially up to litCount
          }
        }
      });
      // 簡易にやり直し: 窓位置をもう一度走査して picked のみ追加
      let writeIdx = 0;
      let scanIdx = 0;
      stageMeshes.forEach((sm, si) => {
        const perRing = Math.max(14, Math.floor(sm.r * 2.2));
        for (let row = 0; row < 2; row++) {
          const yOff = (row === 0 ? -1 : 1) * 0.75;
          for (let k = 0; k < perRing; k++) {
            if (picked.has(scanIdx) && writeIdx < litCount) {
              const ang = (k / perRing) * Math.PI * 2 + (si + row) * 0.2;
              const px = Math.cos(ang) * (sm.r - 0.05);
              const pz = Math.sin(ang) * (sm.r - 0.05);
              ld.position.set(px, sm.yTop - stageHeight * 0.5 + yOff, pz);
              ld.lookAt(0, ld.position.y, 0);
              ld.updateMatrix();
              lit.setMatrixAt(writeIdx, ld.matrix);
              writeIdx++;
            }
            scanIdx++;
          }
        }
      });
      lit.count = writeIdx;
      lit.instanceMatrix.needsUpdate = true;
      tower.add(lit);
    }

    // 👥 小さな人影（螺旋スロープを登る豆粒） — InstancedMesh
    {
      const peopleGeo = new THREE.CapsuleGeometry(0.08, 0.2, 4, 6);
      const peopleMat = new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.9 });
      const CROWD = 40;
      const crowd = new THREE.InstancedMesh(peopleGeo, peopleMat, CROWD);
      const cd = new THREE.Object3D();
      const crowdData = [];
      for (let i = 0; i < CROWD; i++) {
        const t = i / CROWD + Math.random() * 0.03;
        crowdData.push({ t, speed: 0.00003 + Math.random() * 0.00003 });
      }
      tower.add(crowd);
      tower.userData.crowd = crowd;
      tower.userData.crowdData = crowdData;
      tower.userData.crowdDummy = cd;
      tower.userData.spiralCurveRef = null; // set below
    }

    // 🌀 螺旋スロープ（段差を縫うように巻きつく）
    const totalHeight = STAGES * stageHeight;
    const spiralCurve = new THREE.CatmullRomCurve3(
      Array.from({length: 200}).map((_, i) => {
        const t = i / 199;
        const y = 0.2 + t * (totalHeight - 0.5);
        // 現在のyに対応する段のrを取得
        const stageIdx = Math.min(STAGES - 1, Math.floor(y / stageHeight));
        const r = (baseRadius - stageIdx * stepInset) + 0.5; // 壁の外側に沿う
        const a = t * Math.PI * 6; // 3周
        return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      })
    );
    // 群衆を螺旋に紐付け
    tower.userData.spiralCurveRef = spiralCurve;
    const ramp = new THREE.Mesh(
      new THREE.TubeGeometry(spiralCurve, 120, 0.5, 6, false),
      new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.9 })
    );
    // ramp.castShadow = true;
    tower.add(ramp);
    // 螺旋の欄干（石の小柱を一定間隔で）
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const p = spiralCurve.getPoint(t);
      const p2 = spiralCurve.getPoint(Math.min(1, t + 0.01));
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.5, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xa08060, roughness: 0.8 })
      );
      pillar.position.set(p.x, p.y + 0.3, p.z);
      pillar.lookAt(p2.x, p.y + 0.3, p2.z);
      tower.add(pillar);
    }

    // 塔頂上（未完成の足場）
    const topY = totalHeight;
    const finalTopRadius = Math.max(3, baseRadius - (STAGES - 1) * stepInset);
    const topPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(finalTopRadius - 0.5, finalTopRadius - 0.5, 0.8, 36),
      brickMat
    );
    topPlatform.position.y = topY + 0.4;
    topPlatform.castShadow = true;
    topPlatform.receiveShadow = true;
    tower.add(topPlatform);
    // 足場の木材（建設途中）
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const scaffold = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 4, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 0.9 })
      );
      scaffold.position.set(Math.cos(a) * (finalTopRadius + 0.2), topY + 2.8, Math.sin(a) * (finalTopRadius + 0.2));
      // scaffold.castShadow = true;
      tower.add(scaffold);
    }
    // 水平の足場
    for (let k = 0; k < 3; k++) {
      const hRing = new THREE.Mesh(
        new THREE.TorusGeometry(finalTopRadius + 0.25, 0.06, 6, 24),
        new THREE.MeshStandardMaterial({ color: 0x5a3a18, roughness: 0.9 })
      );
      hRing.rotation.x = Math.PI / 2;
      hRing.position.y = topY + 1.5 + k * 1.2;
      tower.add(hRing);
    }
    // 建設中ブロック（散乱）
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.3, 0.35),
        brickMat
      );
      block.position.set(Math.cos(a) * finalTopRadius * 0.6, topY + 0.9, Math.sin(a) * finalTopRadius * 0.6);
      block.rotation.y = Math.random() * Math.PI;
      // block.castShadow = true;
      tower.add(block);
    }
    // ブリューゲル風に塔を少し傾ける
    tower.rotation.z = 0.035;
    scene.add(tower);

    // ===== 🎬 アクロスマルチバース級リアリズム =====

    // ☀️ ゴッドレイ（光の柱） — 雲間から差す太陽光、塔を照らす演出
    const godRayMat = new THREE.MeshBasicMaterial({
      color: 0xffeacc, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const godRays = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const ang = (k - 1) * 0.22;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(6 + Math.random() * 3, 100, 24, 1, true),
        godRayMat.clone()
      );
      // 太陽方向（空の上方）から塔を照らす
      const sd = new THREE.Vector3(-30, 80, 40).normalize();
      cone.position.copy(sd.clone().multiplyScalar(40));
      cone.lookAt(0, 20, 0);
      cone.rotation.z += ang;
      godRays.add(cone);
    }
    scene.add(godRays);

    // 🐦 GLTF Stork（実3Dモデル）が塔を旋回
    const birds = [];
    const babelMixers = [];
    if (ADDONS.GLTFLoader) {
      const loader = new ADDONS.GLTFLoader();
      loader.load(
        'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r159/examples/models/gltf/Stork.glb',
        (gltf) => {
          const cloneFn = (ADDONS.SkeletonUtils && ADDONS.SkeletonUtils.clone)
            ? ADDONS.SkeletonUtils.clone : (o) => o.clone(true);
          let src = null;
          gltf.scene.traverse(o => { if (o.isSkinnedMesh && !src) src = o; });
          if (!src) src = gltf.scene.children[0] || gltf.scene;
          if (!src) return;
          for (let i = 0; i < 5; i++) {
            const stork = cloneFn(src);
            stork.scale.set(0.04, 0.04, 0.04);
            stork.userData.orbit = 55 + i * 10;
            stork.userData.angle = (i / 5) * Math.PI * 2;
            stork.userData.speed = 0.0025 + i * 0.0005;
            stork.userData.height = 40 + i * 4;
            stork.traverse(o => { if (o.isMesh) o.castShadow = true; });
            scene.add(stork);
            birds.push(stork);
            const mix = new THREE.AnimationMixer(stork);
            mix.clipAction(gltf.animations[0]).setDuration(0.7).play();
            babelMixers.push(mix);
          }
        },
        undefined, () => {}
      );
    }

    // 💨 煙は torchLights が populated されてから作る（下で定義）
    let smoke = null, smokeLife = null, smokeOrigin = null;
    const SMOKE = 60;

    // 🌾 遠景の畑・田畑パッチ（ブリューゲル的な田園風景）
    const fieldTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#8a9050'; g.fillRect(0, 0, 256, 256);
      // 畑の筋
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(${140+Math.random()*30},${120+Math.random()*20},${70+Math.random()*20},${0.3+Math.random()*0.3})`;
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        const y = (i / 40) * 256;
        g.moveTo(0, y);
        g.lineTo(256, y + Math.random() * 8);
        g.stroke();
      }
      return new THREE.CanvasTexture(c);
    })();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      // 東側（港）は避ける
      if (Math.cos(ang) > 0.3 && Math.abs(Math.sin(ang)) < 0.5) continue;
      const r = 90 + Math.random() * 60;
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(30 + Math.random() * 20, 25 + Math.random() * 15),
        new THREE.MeshStandardMaterial({
          map: fieldTex,
          color: [0x7a8a48, 0x8a9058, 0x6a8040, 0xa09070][i % 4],
          roughness: 0.95,
        })
      );
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = Math.random() * Math.PI;
      patch.position.set(Math.cos(ang) * r, -0.08, Math.sin(ang) * r);
      patch.receiveShadow = true;
      scene.add(patch);
    }

    // 🏘 遠景の町（小さなボックス群 — ブリューゲル右下の町並み）
    for (let i = 0; i < 3; i++) {
      const ang = Math.PI + (i - 1) * 0.3;
      const r = 70 + Math.random() * 25;
      const cx = Math.cos(ang) * r, cz = Math.sin(ang) * r;
      for (let k = 0; k < 8; k++) {
        const house = new THREE.Mesh(
          new THREE.BoxGeometry(0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.8, 0.8 + Math.random() * 0.6),
          new THREE.MeshStandardMaterial({
            color: [0xb09070, 0xa06050, 0xc0a080, 0x906050][k % 4],
            roughness: 0.9,
          })
        );
        house.position.set(cx + (Math.random() - 0.5) * 10, 0.5, cz + (Math.random() - 0.5) * 10);
        house.receiveShadow = true;
        scene.add(house);
        // 赤い屋根
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.7, 0.5, 4),
          new THREE.MeshStandardMaterial({ color: 0x9a3020, roughness: 0.85 })
        );
        roof.position.set(house.position.x, house.position.y + 0.7, house.position.z);
        roof.rotation.y = Math.PI / 4;
        scene.add(roof);
      }
    }

    // 🔥 松明（炎は多数だが PointLight は合計10個まで / 軽量化）
    const torchLights = [];
    const MAX_TORCH_LIGHTS = 4;
    const sharedHaloTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,220,120,1)');
      grd.addColorStop(0.4, 'rgba(255,140,50,0.7)');
      grd.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    stageMeshes.forEach((sm, si) => {
      const count = Math.max(2, Math.floor(sm.r / 3.5));
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + si * 0.3;
        const px = Math.cos(a) * (sm.r - 0.3);
        const pz = Math.sin(a) * (sm.r - 0.3);
        // 棒
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6),
          new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.9 })
        );
        pole.position.set(px, sm.yTop + 0.4, pz);
        // pole.castShadow = true; // perf
        tower.add(pole);
        // 炎（emissive球 + sprite halo）
        const flame = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xffc060 })
        );
        flame.position.set(px, sm.yTop + 0.85, pz);
        tower.add(flame);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: sharedHaloTex,
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
        }));
        halo.position.copy(flame.position);
        halo.scale.set(0.9, 0.9, 0.9);
        tower.add(halo);
        // 光源は上限まで（残りは halo 発光のみ）
        let light = null;
        if (torchLights.length < MAX_TORCH_LIGHTS) {
          light = new THREE.PointLight(0xffa030, 0.7, 6, 1.8);
          light.position.copy(flame.position);
          tower.add(light);
        }
        torchLights.push({ flame, halo, light, basePos: flame.position.clone(), phase: Math.random() * Math.PI * 2 });
      }
    });

    // 💨 松明の煙（torchLights populated 後に初期化）
    {
      const smokeGeo = new THREE.BufferGeometry();
      const smokePos = new Float32Array(SMOKE * 3);
      smokeLife = new Float32Array(SMOKE);
      smokeOrigin = [];
      for (let i = 0; i < SMOKE; i++) {
        const torch = torchLights[i % Math.max(1, torchLights.length)] || { basePos: new THREE.Vector3(0, 10, 0) };
        smokePos[i*3] = torch.basePos.x;
        smokePos[i*3+1] = torch.basePos.y + Math.random() * 2;
        smokePos[i*3+2] = torch.basePos.z;
        smokeLife[i] = Math.random();
        smokeOrigin.push(torch.basePos.clone());
      }
      smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
      const smokeTex = (() => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 64;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, 'rgba(120,110,100,0.9)');
        grd.addColorStop(0.6, 'rgba(80,70,60,0.35)');
        grd.addColorStop(1, 'rgba(60,50,40,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();
      const smokeMat = new THREE.PointsMaterial({
        map: smokeTex, size: 1.2, sizeAttenuation: true,
        transparent: true, opacity: 0.55, depthWrite: false,
      });
      smoke = new THREE.Points(smokeGeo, smokeMat);
      scene.add(smoke);
    }

    // 🏗 クレーン（頂上の木造ブーム） — 建設中の象徴
    const craneGroup = new THREE.Group();
    craneGroup.position.set(0, topY + 0.5, 0);
    // 垂直マスト
    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 6, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x4a2e14, roughness: 0.9 })
    );
    mast.position.y = 3;
    mast.castShadow = true;
    craneGroup.add(mast);
    // ブーム（斜めの腕）
    const boom = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 5, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.9 })
    );
    boom.position.set(1.5, 5.5, 0);
    boom.rotation.z = -1.1;
    boom.castShadow = true;
    craneGroup.add(boom);
    // ロープ（ワイヤー）
    const ropePts = [
      new THREE.Vector3(2.8, 6.8, 0),
      new THREE.Vector3(2.8, 2.5, 0),
    ];
    const ropeGeo = new THREE.BufferGeometry().setFromPoints(ropePts);
    const rope = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0x2a1808 }));
    craneGroup.add(rope);
    // 吊り下げブロック
    const hangBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.4),
      brickMat
    );
    hangBlock.position.set(2.8, 2.2, 0);
    hangBlock.castShadow = true;
    craneGroup.add(hangBlock);
    // カウンターウェイト
    const cw = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.95 })
    );
    cw.position.set(-1.0, 5.2, 0);
    craneGroup.add(cw);
    tower.add(craneGroup);

    // 🚩 旗（各段の上に色違いの小旗）
    const flagColors = [0xc0303a, 0x2a4a8a, 0xc88a20, 0x3a6a28, 0x8a1a5a];
    stageMeshes.forEach((sm, si) => {
      const a = si * 0.9 + 0.5;
      const px = Math.cos(a) * sm.r;
      const pz = Math.sin(a) * sm.r;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x2a1808 })
      );
      pole.position.set(px, sm.yTop + 0.9, pz);
      tower.add(pole);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.45),
        new THREE.MeshStandardMaterial({
          color: flagColors[si % flagColors.length],
          side: THREE.DoubleSide,
          roughness: 0.9,
        })
      );
      flag.position.set(px + 0.35, sm.yTop + 1.6, pz);
      tower.add(flag);
      flag.userData.phase = Math.random() * Math.PI * 2;
      flag.userData.originX = flag.position.x;
    });

    // 🧱 建設中の瓦礫（塔の根元の周り）
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = baseRadius + 2 + Math.random() * 10;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.4 + Math.random() * 0.4, 0.25 + Math.random() * 0.2, 0.4 + Math.random() * 0.3),
        brickMat
      );
      block.position.set(Math.cos(a) * r, 0.12 + Math.random() * 0.2, Math.sin(a) * r);
      block.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      // block.castShadow = true;
      block.receiveShadow = true;
      scene.add(block);
    }
    // 積み上げ石山
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const r = baseRadius + 4;
      const pileX = Math.cos(a) * r, pileZ = Math.sin(a) * r;
      for (let k = 0; k < 8; k++) {
        const blk = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.3, 0.35),
          brickMat
        );
        blk.position.set(pileX + (Math.random() - 0.5) * 1.5, 0.15 + k * 0.28, pileZ + (Math.random() - 0.5) * 1.5);
        blk.rotation.y = Math.random() * Math.PI;
        // blk.castShadow = true;
        scene.add(blk);
      }
    }

    // 🌧 雨（軽量Pointsで線を模す）
    const RAIN = 350;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(RAIN * 3);
    for (let i = 0; i < RAIN; i++) {
      rainPos[i*3] = (Math.random() - 0.5) * 120;
      rainPos[i*3+1] = 5 + Math.random() * 50;
      rainPos[i*3+2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xa0b0c8, size: 0.08, transparent: true, opacity: 0.4,
      depthWrite: false, fog: true,
    });
    const rain = new THREE.Points(rainGeo, rainMat);
    rain.visible = false; // 最初は晴天。混乱時のみ雨
    scene.add(rain);

    // ⛰ 遠景の霧の層（塔の腰部に霞をまとわせる）
    const mistTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const g = c.getContext('2d');
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 512, y = Math.random() * 128;
        const r = 30 + Math.random() * 60;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(220,200,180,0.5)');
        grd.addColorStop(1, 'rgba(220,200,180,0)');
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI*2); g.fill();
      }
      return new THREE.CanvasTexture(c);
    })();
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(baseRadius + 6, baseRadius + 4, 2, 24, 1, true),
        new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      m.position.y = 2 + i * 8;
      scene.add(m);
    }

    // ⚡ 雷ボルト（Line2 で太線、Flatな1pxより遥かに見える）
    function makeBolt() {
      const start = new THREE.Vector3((Math.random() - 0.5) * 40, 55, (Math.random() - 0.5) * 30);
      const end = new THREE.Vector3((Math.random() - 0.5) * 8, totalHeight + Math.random() * 4, (Math.random() - 0.5) * 8);
      const pts = [start];
      const steps = 10;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const p = start.clone().lerp(end, t);
        p.x += (Math.random() - 0.5) * 3;
        p.z += (Math.random() - 0.5) * 3;
        pts.push(p);
      }
      pts.push(end);
      return pts;
    }
    function pointsToArray(pts) {
      const arr = [];
      pts.forEach(p => { arr.push(p.x, p.y, p.z); });
      return arr;
    }
    const useLine2 = ADDONS.Line2 && ADDONS.LineMaterial && ADDONS.LineGeometry;
    function makeBoltMesh() {
      if (useLine2) {
        const geo = new ADDONS.LineGeometry();
        geo.setPositions(pointsToArray(makeBolt()));
        const mat = new ADDONS.LineMaterial({
          color: 0xffffe0, linewidth: 4, // px
          transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
          resolution: new THREE.Vector2(W(), H()),
        });
        const line = new ADDONS.Line2(geo, mat);
        line.computeLineDistances();
        return line;
      } else {
        const mat = new THREE.LineBasicMaterial({
          color: 0xffffe0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
        });
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints(makeBolt()), mat);
      }
    }
    const bolt1 = makeBoltMesh();
    const bolt2 = makeBoltMesh();
    const bolt3 = makeBoltMesh();
    scene.add(bolt1); scene.add(bolt2); scene.add(bolt3);
    const bolts = [bolt1, bolt2, bolt3];

    // ☁️ 動く嵐雲（塔頂上近くに半透明プレーン）
    const stormClouds = [];
    const cloudTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const g = c.getContext('2d');
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 256, y = 30 + Math.random() * 70;
        const r = 30 + Math.random() * 50;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(35,25,40,0.8)');
        grd.addColorStop(1, 'rgba(25,18,30,0)');
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI*2); g.fill();
      }
      return new THREE.CanvasTexture(c);
    })();
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 18),
        new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.7, depthWrite: false, fog: false })
      );
      const a = (i / 5) * Math.PI * 2;
      c.position.set(Math.cos(a) * 38, 58 + Math.random() * 6, Math.sin(a) * 38);
      c.visible = false; // 平時は非表示。混乱時だけ出す
      c.lookAt(0, c.position.y, 0);
      c.userData.angle = a;
      c.userData.speed = 0.05 + Math.random() * 0.04;
      scene.add(c);
      stormClouds.push(c);
    }

    // 地面：ブリューゲル忠実 — 緑の野、畑、小道
    const groundTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 512; sc.height = 512;
      const g = sc.getContext('2d');
      // ベースの緑
      const grd = g.createLinearGradient(0, 0, 0, 512);
      grd.addColorStop(0, '#7a8a48'); grd.addColorStop(1, '#5a7038');
      g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
      // 草のざらつき
      for (let i = 0; i < 3000; i++) {
        const gr = 80 + Math.random() * 60;
        g.fillStyle = `rgba(${gr},${120+Math.random()*40},${40+Math.random()*30},${0.2+Math.random()*0.35})`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 1, 1 + Math.random() * 2);
      }
      // 畑の筋（細い土色のライン）
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = `rgba(${140+Math.random()*40},${110+Math.random()*25},${70+Math.random()*20},0.35)`;
        g.lineWidth = 1.5 + Math.random();
        g.beginPath();
        const y = Math.random() * 512;
        g.moveTo(0, y);
        g.lineTo(512, y + (Math.random() - 0.5) * 30);
        g.stroke();
      }
      // 小さな花（野原）
      for (let i = 0; i < 60; i++) {
        const colors = ['#fff8c0', '#ffeec0', '#ffb0c0', '#e0f0ff'];
        g.fillStyle = colors[i % 4];
        g.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
      }
      const t = new THREE.CanvasTexture(sc);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(20, 20);
      return t;
    })();
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(200, 32),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 🌊 港湾（塔の片側に水） — ブリューゲルの構図
    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x5a85a0, roughness: 0.25, metalness: 0.35,
      transparent: true, opacity: 0.88,
    });
    // 🪞 本物の鏡面反射（Reflector addon があれば使う）
    let bay;
    if (ADDONS.Reflector) {
      const bayGeo = new THREE.PlaneGeometry(320, 180);
      bay = new ADDONS.Reflector(bayGeo, {
        color: 0x5a85a0,
        textureWidth: 512,  // 解像度控えめで軽量化
        textureHeight: 512,
        clipBias: 0.003,
      });
      bay.rotation.x = -Math.PI / 2;
      bay.position.set(160, -0.15, 0);
      scene.add(bay);
    } else {
      bay = new THREE.Mesh(new THREE.PlaneGeometry(320, 180), bayMat);
      bay.rotation.x = -Math.PI / 2;
      bay.position.set(160, -0.15, 0);
      scene.add(bay);
    }

    // 🚢 港湾の帆船（InstancedMesh）
    {
      // 船体: 細長い箱
      const hullGeo = new THREE.BoxGeometry(1.8, 0.4, 0.6);
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.9 });
      const SHIPS = 8;
      const hulls = new THREE.InstancedMesh(hullGeo, hullMat, SHIPS);
      const sd = new THREE.Object3D();
      // 帆（平面）
      const sailGeo = new THREE.PlaneGeometry(1.2, 1.0);
      const sailMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.95, side: THREE.DoubleSide });
      const sails = new THREE.InstancedMesh(sailGeo, sailMat, SHIPS);
      // マスト
      const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.9 });
      const masts = new THREE.InstancedMesh(mastGeo, mastMat, SHIPS);
      const shipData = [];
      for (let i = 0; i < SHIPS; i++) {
        const shipX = 70 + Math.random() * 180;
        const shipZ = (Math.random() - 0.5) * 120;
        const rot = Math.random() * Math.PI * 2;
        sd.position.set(shipX, 0, shipZ);
        sd.rotation.y = rot;
        sd.updateMatrix();
        hulls.setMatrixAt(i, sd.matrix);
        sd.position.set(shipX, 0.7, shipZ);
        sd.updateMatrix();
        masts.setMatrixAt(i, sd.matrix);
        sd.position.set(shipX, 0.9, shipZ);
        sd.rotation.y = rot + Math.PI / 2; // 帆は横向き
        sd.updateMatrix();
        sails.setMatrixAt(i, sd.matrix);
        shipData.push({ x: shipX, z: shipZ, rot, phase: Math.random() * Math.PI * 2 });
      }
      hulls.instanceMatrix.needsUpdate = true;
      masts.instanceMatrix.needsUpdate = true;
      sails.instanceMatrix.needsUpdate = true;
      scene.add(hulls); scene.add(masts); scene.add(sails);
      // データ保存（波で上下させるため animate で使う）
      scene.userData.ships = { hulls, masts, sails, data: shipData, dummy: sd };
    }

    // 周囲の遠い丘（緑の丘陵、ブリューゲル風）
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.2;
      // 東側（港）にはかぶせない
      if (Math.cos(a) > 0.3 && Math.abs(Math.sin(a)) < 0.6) continue;
      const r = 130 + Math.random() * 50;
      const h = 5 + Math.random() * 8;
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(18, 18, 10),
        new THREE.MeshStandardMaterial({ color: 0x6a7a48, roughness: 1.0 })
      );
      hill.position.set(Math.cos(a) * r, -4, Math.sin(a) * r);
      hill.scale.set(1, h / 18, 1);
      scene.add(hill);
    }

    // 塔の岩盤（Bruegelの塔は岩山と一体化している）
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a7058, roughness: 1.0 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
      const r = baseRadius + 1 + Math.random() * 3;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(2 + Math.random() * 2, 0),
        rockMat
      );
      rock.position.set(Math.cos(a) * r, 0.8 + Math.random() * 1.5, Math.sin(a) * r);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.receiveShadow = true;
      scene.add(rock);
    }

    // 📜 塔の周りを飛ぶ「言葉の断片」— 混乱を起こすとバラバラに
    const WORDS = ['א', 'ב', 'ג', '言', '愛', 'A', 'Я', '𒀀', '𓀀', 'Ω', '王', '神', '天', 'तौ', 'ⴰ'];
    const wordSprites = [];
    for (let i = 0; i < 20; i++) {
      const cvs = document.createElement('canvas'); cvs.width = 64; cvs.height = 64;
      const g = cvs.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#ffe890';
      g.font = 'bold 36px serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = 'rgba(255,220,120,0.9)';
      g.shadowBlur = 10;
      g.fillText(WORDS[i % WORDS.length], 32, 34);
      const tex = new THREE.CanvasTexture(cvs);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 14;
      const y = 2 + Math.random() * (STAGES * stageHeight - 3);
      spr.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      spr.scale.set(1.2, 1.2, 1);
      spr.userData = {
        baseR: r, baseA: a, baseY: y,
        phase: Math.random() * Math.PI * 2,
        chaos: 0, // 0:秩序、1:混乱
        vx: 0, vy: 0, vz: 0,
      };
      wordSprites.push(spr);
      scene.add(spr);
    }

    // カメラ
    const camera = new THREE.PerspectiveCamera(50, W()/H(), 0.1, 800);
    camera.position.set(0, 28, 80);
    camera.lookAt(0, topY / 2, 0);

    // ✨ EffectComposer + UnrealBloomPass + グレード（失敗したらcomposer放棄）
    if (useProB) try {
      composer = new ADDONS.EffectComposer(renderer);
      composer.addPass(new ADDONS.RenderPass(scene, camera));
      const bloomPass = new ADDONS.UnrealBloomPass(
        new THREE.Vector2(W(), H()),
        0.0, 0.4, 0.99  // バベルはbloom無し
      );
      composer.addPass(bloomPass);
      if (ADDONS.ShaderPass) {
        const g = {
          uniforms: {
            tDiffuse: { value: null }, uTime: { value: 0 },
            uVignette: { value: 0.28 }, uChromatic: { value: 0.0015 },
            uGrain: { value: 0.02 }, uSaturation: { value: 0.95 },
          },
          vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
          fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D tDiffuse;
            uniform float uTime, uVignette, uChromatic, uGrain, uSaturation;
            float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
            void main(){
              vec2 c = vec2(0.5); vec2 d = vUv - c; float dist = length(d);
              vec2 ca = d * uChromatic * (0.5 + dist * 1.5);
              float r = texture2D(tDiffuse, vUv - ca).r;
              float gr = texture2D(tDiffuse, vUv).g;
              float b = texture2D(tDiffuse, vUv + ca).b;
              vec3 col = vec3(r, gr, b);
              float lum = dot(col, vec3(0.2126,0.7152,0.0722));
              col = mix(vec3(lum), col, uSaturation);
              float vig = smoothstep(0.8, 0.3, dist);
              col *= mix(1.0 - uVignette, 1.0, vig);
              col += (hash(vUv * 1000.0 + uTime * 0.1) - 0.5) * uGrain;
              gl_FragColor = vec4(col, 1.0);
            }
          `,
        };
        const gp = new ADDONS.ShaderPass(g);
        composer.addPass(gp);
        camera.userData.gradePass = gp;
      }
      if (ADDONS.OutputPass) composer.addPass(new ADDONS.OutputPass());
    } catch (err) {
      console.error('[babel composer init fail]', err);
      composer = null;
    }
    // 一時的に手書きbloomも無効化 — 素のレンダリングで切り分け
    bloom = null;

    // 操作
    let dragging = false, lastX = 0, lastY = 0;
    let camAngle = 0, camTilt = 0.3, camDist = 85;
    let lookY = topY / 2;
    renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    renderer.domElement.addEventListener('pointermove', e => {
      if (!dragging) return;
      camAngle -= (e.clientX - lastX) * 0.006;
      camTilt = Math.max(-0.1, Math.min(1.0, camTilt + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener('pointerup', () => dragging = false);
    renderer.domElement.addEventListener('pointerleave', () => dragging = false);
    renderer.domElement.addEventListener('wheel', e => {
      e.preventDefault();
      camDist = Math.max(20, Math.min(200, camDist + e.deltaY * 0.06));
    }, { passive: false });
    // ピンチ
    let pinchBase = 0, pinchBaseDist = 55;
    renderer.domElement.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchBase = Math.hypot(dx, dy);
        pinchBaseDist = camDist;
      }
    });
    renderer.domElement.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchBase > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        camDist = Math.max(20, Math.min(200, pinchBaseDist * pinchBase / d));
      }
    });

    // 🌀 混乱を起こす！
    let chaosTrigger = 0; // 0〜1
    let boltTimer = 0;
    function rebuildBolt(b) {
      if (useLine2) {
        b.geometry.setPositions(pointsToArray(makeBolt()));
        b.computeLineDistances();
      } else {
        b.geometry.setFromPoints(makeBolt());
        b.geometry.attributes.position.needsUpdate = true;
      }
    }
    function strikeBolt() {
      bolts.forEach(b => { rebuildBolt(b); b.material.opacity = 0.95; });
      setTimeout(() => bolts.forEach(b => b.material.opacity = 0), 100);
      setTimeout(() => bolts.forEach(b => { rebuildBolt(b); b.material.opacity = 0.8; }), 180);
      setTimeout(() => bolts.forEach(b => b.material.opacity = 0), 280);
    }
    ov.querySelector('#babel3dChaos').addEventListener('click', () => {
      chaosTrigger = 1;
      // 空を暗転（嵐モードに切替）+ 雨・雲を発生
      stormClouds.forEach(c => c.visible = true);
      if (scene.fog) scene.fog.color.setHex(0x2a2028);
      hemi.intensity = 0.3; hemi.color.setHex(0x3a3040);
      sunLight.intensity = 0.3; sunLight.color.setHex(0xa090a0);
      rain.visible = true;
      // 雷閃光（強めに4連）
      flashLight.intensity = 5;
      strikeBolt();
      setTimeout(() => { flashLight.intensity = 0.1; }, 130);
      setTimeout(() => { flashLight.intensity = 4; strikeBolt(); }, 260);
      setTimeout(() => { flashLight.intensity = 0; }, 400);
      setTimeout(() => { flashLight.intensity = 3.5; strikeBolt(); }, 700);
      setTimeout(() => { flashLight.intensity = 0; }, 820);
      // 以降、混乱中は定期的に雷
      let bolts_remaining = 10;
      const ongoing = setInterval(() => {
        if (!running || bolts_remaining-- <= 0) { clearInterval(ongoing); return; }
        strikeBolt();
        flashLight.intensity = 3;
        setTimeout(() => { flashLight.intensity = 0; }, 120);
      }, 1500);
      // 言葉にランダム速度
      wordSprites.forEach(s => {
        s.userData.vx = (Math.random() - 0.5) * 0.3;
        s.userData.vy = (Math.random() - 0.5) * 0.3;
        s.userData.vz = (Math.random() - 0.5) * 0.3;
        s.userData.chaos = 1;
      });
      // メッセージ
      const msg = document.createElement('div');
      msg.className = 'babel-confusion-msg';
      msg.innerHTML = `<div class="bcm-inner">
        <div class="bcm-super">— 言葉が混ざり合った —</div>
        <div class="bcm-title">ただ一つの言葉は、散った</div>
        <div class="bcm-body">天に届こうとした塔。<br>
          人々は互いを理解できなくなり、世界中へ散っていった。</div>
      </div>`;
      ov.appendChild(msg);
      requestAnimationFrame(() => msg.classList.add('show'));
      setTimeout(() => { msg.classList.remove('show'); setTimeout(() => msg.remove(), 500); }, 5000);
    });

    // アニメ
    let t = 0;
    function animate() {
      if (!running) return;
      if (document.hidden) { requestAnimationFrame(animate); return; }
      t += 0.016;
      // ドラッグ無い時は自動旋回
      if (!dragging) camAngle += 0.0015;
      camera.position.x = Math.cos(camAngle) * camDist;
      camera.position.z = Math.sin(camAngle) * camDist;
      camera.position.y = 10 + camTilt * 25;
      lookY += ((topY / 2) - lookY) * 0.02;
      camera.lookAt(0, lookY, 0);
      // 🐦 Stork が塔を旋回
      birds.forEach(b => {
        b.userData.angle += b.userData.speed;
        b.position.x = Math.cos(b.userData.angle) * b.userData.orbit;
        b.position.z = Math.sin(b.userData.angle) * b.userData.orbit;
        b.position.y = b.userData.height + Math.sin(b.userData.angle * 2) * 1.0;
        const next = b.userData.angle + 0.01;
        b.lookAt(Math.cos(next) * b.userData.orbit, b.position.y, Math.sin(next) * b.userData.orbit);
      });
      babelMixers.forEach(m => m.update(1/60));
      // 💨 松明の煙（上昇、ランダムリセット）
      if (smoke) {
        const sp = smoke.geometry.attributes.position;
        for (let i = 0; i < SMOKE; i++) {
          smokeLife[i] += 0.008;
          sp.array[i*3] += (Math.random() - 0.5) * 0.02;
          sp.array[i*3+1] += 0.08;
          sp.array[i*3+2] += (Math.random() - 0.5) * 0.02;
          if (smokeLife[i] > 1) {
            smokeLife[i] = 0;
            sp.array[i*3]   = smokeOrigin[i].x + (Math.random() - 0.5) * 0.2;
            sp.array[i*3+1] = smokeOrigin[i].y;
            sp.array[i*3+2] = smokeOrigin[i].z + (Math.random() - 0.5) * 0.2;
          }
        }
        sp.needsUpdate = true;
      }
      // 雨を降らす
      {
        const pa = rain.geometry.attributes.position;
        for (let i = 0; i < pa.count; i++) {
          pa.array[i*3+1] -= 0.8;
          pa.array[i*3] += 0.08;
          if (pa.array[i*3+1] < 0) { pa.array[i*3+1] = 50; pa.array[i*3] = (Math.random()-0.5)*120; }
        }
        pa.needsUpdate = true;
      }
      // 🎥 CubeCamera 更新（60フレーム毎＝1秒 / 軽量化）
      if (cubeCam && (Math.floor(t * 60) % 60 === 0)) {
        try { cubeCam.update(renderer, scene); } catch {}
      }
      // 🚢 船が波で揺れる
      if (scene.userData.ships) {
        const sh = scene.userData.ships;
        for (let i = 0; i < sh.data.length; i++) {
          const d = sh.data[i];
          const bob = Math.sin(t * 1.2 + d.phase) * 0.08;
          sh.dummy.position.set(d.x, bob, d.z);
          sh.dummy.rotation.set(Math.sin(t + d.phase) * 0.04, d.rot, Math.cos(t * 0.8 + d.phase) * 0.03);
          sh.dummy.updateMatrix();
          sh.hulls.setMatrixAt(i, sh.dummy.matrix);
          sh.dummy.position.set(d.x, 0.7 + bob, d.z);
          sh.dummy.updateMatrix();
          sh.masts.setMatrixAt(i, sh.dummy.matrix);
          sh.dummy.position.set(d.x, 0.9 + bob, d.z);
          sh.dummy.rotation.set(Math.sin(t + d.phase) * 0.04, d.rot + Math.PI / 2, Math.cos(t * 0.8 + d.phase) * 0.03);
          sh.dummy.updateMatrix();
          sh.sails.setMatrixAt(i, sh.dummy.matrix);
        }
        sh.hulls.instanceMatrix.needsUpdate = true;
        sh.masts.instanceMatrix.needsUpdate = true;
        sh.sails.instanceMatrix.needsUpdate = true;
      }
      // 👥 群衆が螺旋を登る
      if (tower.userData.crowd && tower.userData.spiralCurveRef) {
        const crowd = tower.userData.crowd;
        const data = tower.userData.crowdData;
        const dm = tower.userData.crowdDummy;
        const cv = tower.userData.spiralCurveRef;
        for (let i = 0; i < data.length; i++) {
          data[i].t += data[i].speed;
          if (data[i].t > 1) data[i].t = 0;
          const p = cv.getPoint(data[i].t);
          const pNext = cv.getPoint(Math.min(1, data[i].t + 0.005));
          dm.position.set(p.x, p.y + 0.15, p.z);
          dm.lookAt(pNext.x, p.y + 0.15, pNext.z);
          dm.updateMatrix();
          crowd.setMatrixAt(i, dm.matrix);
        }
        crowd.instanceMatrix.needsUpdate = true;
      }
      // 松明のちらつき（滑らかに、ランダム項を除去）
      torchLights.forEach(tl => {
        tl.phase += 0.04; // ゆっくり
        const f = 0.9 + Math.sin(tl.phase) * 0.07 + Math.sin(tl.phase * 2.3) * 0.03;
        if (tl.light) tl.light.intensity = 0.6 * f;
        tl.flame.scale.setScalar(f);
        tl.halo.material.opacity = 0.65 * f;
      });
      // 旗が揺れる
      tower.traverse(obj => {
        if (obj.isMesh && obj.userData.originX !== undefined) {
          obj.userData.phase += 0.05;
          obj.rotation.y = Math.sin(obj.userData.phase) * 0.2;
          obj.position.x = obj.userData.originX + Math.sin(obj.userData.phase) * 0.05;
        }
      });
      // 動く嵐雲
      stormClouds.forEach(c => {
        c.userData.angle += c.userData.speed * 0.008;
        c.position.x = Math.cos(c.userData.angle) * 22;
        c.position.z = Math.sin(c.userData.angle) * 22;
        c.lookAt(0, c.position.y, 0);
      });
      // 平時の雷は出さない（混乱トリガー時のみ）。晴天バベルは静かに。
      // 言葉の更新
      wordSprites.forEach(s => {
        s.userData.phase += 0.015;
        if (s.userData.chaos > 0) {
          // 混乱モード：飛散
          s.position.x += s.userData.vx;
          s.position.y += s.userData.vy;
          s.position.z += s.userData.vz;
          s.userData.vy -= 0.003; // 少し落下
          s.material.opacity = Math.max(0, s.material.opacity - 0.002);
        } else {
          // 秩序モード：塔を周回
          const a = s.userData.baseA + t * 0.1;
          s.position.x = Math.cos(a) * s.userData.baseR + Math.sin(s.userData.phase) * 0.5;
          s.position.y = s.userData.baseY + Math.cos(s.userData.phase * 0.7) * 0.4;
          s.position.z = Math.sin(a) * s.userData.baseR + Math.cos(s.userData.phase) * 0.5;
        }
      });
      // 🛡 何があっても次フレームは来る＆raw renderer にフォールバック
      try {
        if (composer) {
          if (camera.userData.gradePass) camera.userData.gradePass.uniforms.uTime.value = t;
          composer.render();
        } else if (bloom) {
          bloom.render(scene, camera);
        } else {
          renderer.render(scene, camera);
        }
      } catch (err) {
        console.error('[babel render] fall back to raw:', err);
        composer = null; bloom = null; // 以降は素のレンダラ
        try { renderer.render(scene, camera); } catch (e2) { console.error(e2); }
      }
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', () => {
      renderer.setSize(W(), H());
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
      if (composer) composer.setSize(W(), H());
      else if (bloom) bloom.setSize(W(), H());
    });
    setTimeout(() => ov.querySelector('#babel3dHint')?.classList.add('fade'), 5000);
  }
  window.openBabel3D = openBabel3D;

  // ============================================================
  // 🌀 マルチバース・ハブ — すべての世界を繋ぐ宇宙の中継点
  // ============================================================
  const MULTIVERSE_WORLDS = [
    { key: 'cosmos', emoji: '🌌', name: '宇宙の誕生', sub: '星々と銀河、万物の始まり',
      color: 0x6080ff, action: () => window.openCosmos && window.openCosmos() },
    { key: 'eden', emoji: '🌳', name: 'エデンの園', sub: '浮島に立つ生命の樹',
      color: 0x60c080, action: () => window.openEden3D && window.openEden3D() },
    { key: 'babel', emoji: '🏛', name: 'バベルの塔', sub: '天に届こうとした石の螺旋',
      color: 0xc0a060, action: () => window.openBabel3D && window.openBabel3D() },
    { key: 'myth', emoji: '✦', name: '神話美術館', sub: '世界の創世と神々の絵画',
      color: 0xc08050, action: () => window.openMythMuseum && window.openMythMuseum('myth') },
    { key: 'sengoku', emoji: '⚔', name: '戦国美術館', sub: '武将と合戦の大和ホール',
      color: 0xa04030, action: () => window.openMythMuseum && window.openMythMuseum('sengoku') },
  ];

  async function openMultiverse() {
    if (!window.THREE) return;
    const THREE = window.THREE;
    if (window.THREE_READY) { try { await window.THREE_READY; } catch {} }
    const ADDONS = window.THREE_ADDONS || {};

    const ov = document.createElement('div');
    ov.className = 'multiverse-overlay';
    ov.innerHTML = `
      <button class="mv-close" aria-label="閉じる">×</button>
      <div class="mv-stage" id="mvStage"></div>
      <div class="mv-title">M U L T I V E R S E</div>
      <div class="mv-sub">── 世界を繋ぐ、宇宙の中継点 ──</div>
      <div class="mv-info" id="mvInfo"></div>
      <button class="mv-enter-btn" id="mvEnterBtn">入る ›</button>
      <div class="mv-hint">ドラッグで回転　・　ポータルをタップで選択</div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    let running = true;
    const close = () => {
      running = false;
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 500);
    };
    ov.querySelector('.mv-close').addEventListener('click', close);

    const stage = ov.querySelector('#mvStage');
    const infoEl = ov.querySelector('#mvInfo');
    const enterBtn = ov.querySelector('#mvEnterBtn');
    const W = () => stage.clientWidth || window.innerWidth;
    const H = () => stage.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.setSize(W(), H());
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020015);
    scene.fog = new THREE.Fog(0x020015, 20, 80);

    // 星場
    const starGeo = new THREE.BufferGeometry();
    const STARS = 2500;
    const sp = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      const r = 40 + Math.random() * 60;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      sp[i*3] = Math.sin(ph) * Math.cos(th) * r;
      sp[i*3+1] = Math.cos(ph) * r;
      sp[i*3+2] = Math.sin(ph) * Math.sin(th) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false });
    scene.add(new THREE.Points(starGeo, starMat));

    // 星雲の塵（additive、柔らかい色）
    for (let k = 0; k < 3; k++) {
      const nebulaTex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256;
        const g = c.getContext('2d');
        const hues = [[80, 60, 200], [120, 40, 160], [200, 80, 180]];
        const h = hues[k];
        const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        grd.addColorStop(0, `rgba(${h[0]},${h[1]},${h[2]},0.35)`);
        grd.addColorStop(0.5, `rgba(${h[0]},${h[1]},${h[2]},0.1)`);
        grd.addColorStop(1, `rgba(${h[0]},${h[1]},${h[2]},0)`);
        g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
      })();
      const nebula = new THREE.Mesh(
        new THREE.PlaneGeometry(45, 45),
        new THREE.MeshBasicMaterial({ map: nebulaTex, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
      );
      const a = Math.random() * Math.PI * 2;
      nebula.position.set(Math.cos(a) * 25, (Math.random() - 0.5) * 10, Math.sin(a) * 25);
      nebula.lookAt(0, 0, 0);
      scene.add(nebula);
    }

    // 🌀 中央の光核（目を引くアンカー）
    const coreTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.2, 'rgba(200,180,255,0.8)');
      grd.addColorStop(0.6, 'rgba(120,100,220,0.3)');
      grd.addColorStop(1, 'rgba(80,60,180,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const coreSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: coreTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    coreSpr.scale.set(4, 4, 4);
    scene.add(coreSpr);

    // 🌀 ポータル（各世界の入り口）
    const PORTALS = [];
    const R = 10; // 中央からの距離
    MULTIVERSE_WORLDS.forEach((w, i) => {
      const a = (i / MULTIVERSE_WORLDS.length) * Math.PI * 2;
      const g = new THREE.Group();
      g.position.set(Math.cos(a) * R, Math.sin((i % 2 ? 1 : -1) * 0.35) * 2, Math.sin(a) * R);

      // 外リング（太いTorus、emissive、脈動）
      const ringMat = new THREE.MeshBasicMaterial({
        color: w.color, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.16, 16, 64), ringMat);
      g.add(ring);
      // 内側のディスク（世界色のグラデ）
      const discTex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256;
        const ctx = c.getContext('2d');
        const col = new THREE.Color(w.color);
        const grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grd.addColorStop(0, `rgba(${(col.r*255)|0},${(col.g*255)|0},${(col.b*255)|0},0.95)`);
        grd.addColorStop(0.5, `rgba(${(col.r*200)|0},${(col.g*200)|0},${(col.b*200)|0},0.5)`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256);
        // 模様（世界の絵文字を中央に描画）
        ctx.font = 'bold 100px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 20;
        ctx.fillText(w.emoji, 128, 138);
        return new THREE.CanvasTexture(c);
      })();
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(1.5, 48),
        new THREE.MeshBasicMaterial({ map: discTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      g.add(disc);
      // 輝きのハロ
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: coreTex, color: w.color, transparent: true, opacity: 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      }));
      halo.scale.set(4.5, 4.5, 4.5);
      g.add(halo);
      // クリック判定用の透明ヒットエリア
      const hit = new THREE.Mesh(
        new THREE.CircleGeometry(1.7, 24),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
      );
      g.add(hit);
      g.userData.world = w;
      g.userData.ring = ring;
      g.userData.halo = halo;
      g.userData.hit = hit;
      g.userData.phase = Math.random() * Math.PI * 2;
      g.userData.baseY = g.position.y;
      scene.add(g);
      PORTALS.push(g);
    });

    // カメラ
    const camera = new THREE.PerspectiveCamera(50, W()/H(), 0.1, 300);
    let camAngle = 0, camTilt = 0.2, camDist = 22;
    camera.position.set(0, camDist * 0.25, camDist);
    camera.lookAt(0, 0, 0);

    // 入力
    let dragging = false, lastX = 0, lastY = 0;
    renderer.domElement.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener('pointermove', e => {
      if (!dragging) return;
      camAngle -= (e.clientX - lastX) * 0.007;
      camTilt = Math.max(-0.4, Math.min(0.9, camTilt + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener('pointerup', e => {
      dragging = false;
      // ポータルタップ判定
      const rect = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      const pt = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      ray.setFromCamera(pt, camera);
      const hits = ray.intersectObjects(PORTALS.map(p => p.userData.hit), false);
      if (hits.length) {
        const portal = hits[0].object.parent;
        selected = portal;
      }
    });
    renderer.domElement.addEventListener('pointerleave', () => dragging = false);
    renderer.domElement.addEventListener('wheel', e => {
      e.preventDefault();
      camDist = Math.max(10, Math.min(40, camDist + e.deltaY * 0.02));
    }, { passive: false });

    let selected = null;
    function updateSelection() {
      PORTALS.forEach(p => {
        const isSelected = (p === selected);
        p.userData.ring.material.opacity = isSelected ? 1.0 : 0.6;
        p.scale.setScalar(isSelected ? 1.2 : 1.0);
      });
      if (selected) {
        const w = selected.userData.world;
        infoEl.innerHTML = `<div class="mv-info-emoji">${w.emoji}</div><div class="mv-info-name">${w.name}</div><div class="mv-info-sub">${w.sub}</div>`;
        infoEl.classList.add('show');
        enterBtn.classList.add('show');
        enterBtn.onclick = () => {
          close();
          setTimeout(() => w.action && w.action(), 500);
        };
      } else {
        infoEl.classList.remove('show');
        enterBtn.classList.remove('show');
      }
    }

    // アニメ
    let t = 0;
    let lastSelected = null;
    function animate() {
      if (!running) return;
      if (document.hidden) { requestAnimationFrame(animate); return; }
      t += 0.016;
      if (!dragging) camAngle += 0.0008;
      camera.position.x = Math.cos(camAngle) * camDist;
      camera.position.z = Math.sin(camAngle) * camDist;
      camera.position.y = camDist * 0.25 + camTilt * 6;
      camera.lookAt(0, 0, 0);
      // 中央核の脈動
      coreSpr.material.opacity = 0.75 + Math.sin(t * 1.2) * 0.15;
      coreSpr.scale.setScalar(4 + Math.sin(t) * 0.3);
      // ポータルの浮遊＆回転
      PORTALS.forEach(p => {
        p.userData.phase += 0.02;
        p.position.y = p.userData.baseY + Math.sin(p.userData.phase) * 0.3;
        p.userData.ring.rotation.z += 0.008;
        // カメラの方を常に向く
        p.lookAt(camera.position.x, p.position.y, camera.position.z);
      });
      if (selected !== lastSelected) { updateSelection(); lastSelected = selected; }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', () => {
      renderer.setSize(W(), H());
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
    });
  }
  window.openMultiverse = openMultiverse;

  // ============================================================
  // 🖼 美術館モード（タップした絵画を3D展示室で大画面で見る）
  // ============================================================
  function openMuseum(imgUrl, caption) {
    if (!imgUrl) return;
    const ov = document.createElement('div');
    ov.className = 'museum-overlay';
    // caption は「神話名　章名　／　画題」形式で来ることがある
    let mainTitle = caption || '', sub = '';
    if (caption && caption.includes('／')) {
      const [a, b] = caption.split('／').map(s => s.trim());
      mainTitle = b || a; sub = a;
    }
    ov.innerHTML = `
      <button class="museum-close" aria-label="閉じる">×</button>
      <div class="museum-zoom-hint" id="museumZoomHint">ピンチ / ダブルタップでズーム　・　ドラッグで移動</div>
      <div class="museum-imgwrap" id="museumImgWrap">
        <img class="museum-bigimg" id="museumBigImg" src="${imgUrl}" alt="${mainTitle}" draggable="false"/>
      </div>
      <div class="museum-bottom">
        <div class="museum-plaque-new">
          ${sub ? `<div class="mpn-sub">${sub}</div>` : ''}
          <div class="mpn-title">${mainTitle}</div>
          <div class="mpn-pd">— Public Domain —</div>
        </div>
        <div class="museum-affiliate" id="museumAff"></div>
      </div>
    `;
    document.body.appendChild(ov);
    // アフィリエイト紛れ込ませ：神話/絵画系の文脈
    try {
      const affEl = ov.querySelector('#museumAff');
      if (affEl && window.MAGIC && typeof MAGIC.renderAffiliate === 'function') {
        MAGIC.renderAffiliate('myth', affEl, 1);
      }
    } catch {}
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 400); };
    ov.querySelector('.museum-close').addEventListener('click', close);
    // ESCキー
    const onKey = e => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const obs = new MutationObserver(() => {
      if (!document.body.contains(ov)) { window.removeEventListener('keydown', onKey); obs.disconnect(); }
    });
    obs.observe(document.body, { childList: true });

    // ===== Pan / Zoom =====
    const wrap = ov.querySelector('#museumImgWrap');
    const img = ov.querySelector('#museumBigImg');
    let scale = 1, tx = 0, ty = 0;
    const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
    // Wheel zoom
    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const oldScale = scale;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      scale = Math.max(1, Math.min(6, scale * factor));
      // ズームのピボットを考慮して tx/ty 更新
      tx = cx - (cx - tx) * (scale / oldScale);
      ty = cy - (cy - ty) * (scale / oldScale);
      clampPan();
      apply();
    }, { passive: false });
    // Drag pan（マウス）
    let dragging = false, lastX = 0, lastY = 0;
    img.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener('pointermove', e => {
      if (!dragging) return;
      tx += e.clientX - lastX;
      ty += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      clampPan(); apply();
    });
    img.addEventListener('pointerup', () => dragging = false);
    img.addEventListener('pointercancel', () => dragging = false);
    // ダブルタップ / ダブルクリックでズームイン/リセット
    let lastTap = 0;
    img.addEventListener('pointerdown', e => {
      const now = Date.now();
      if (now - lastTap < 300) {
        if (scale > 1.2) { scale = 1; tx = 0; ty = 0; }
        else { scale = 2.5; }
        clampPan(); apply();
      }
      lastTap = now;
    });
    // ピンチ
    let pinchBase = 0, pinchBaseScale = 1, pinchBaseTx = 0, pinchBaseTy = 0, pinchCX = 0, pinchCY = 0;
    wrap.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchBase = Math.hypot(dx, dy);
        pinchBaseScale = scale;
        pinchBaseTx = tx; pinchBaseTy = ty;
        const rect = wrap.getBoundingClientRect();
        pinchCX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width / 2;
        pinchCY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - rect.height / 2;
      }
    }, { passive: true });
    wrap.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchBase > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        const newScale = Math.max(1, Math.min(6, pinchBaseScale * d / pinchBase));
        tx = pinchCX - (pinchCX - pinchBaseTx) * (newScale / pinchBaseScale);
        ty = pinchCY - (pinchCY - pinchBaseTy) * (newScale / pinchBaseScale);
        scale = newScale;
        clampPan(); apply();
      }
    }, { passive: false });
    function clampPan() {
      if (scale <= 1) { tx = 0; ty = 0; return; }
      const rect = wrap.getBoundingClientRect();
      const imgW = img.clientWidth * scale;
      const imgH = img.clientHeight * scale;
      const maxX = Math.max(0, (imgW - rect.width) / 2);
      const maxY = Math.max(0, (imgH - rect.height) / 2);
      tx = Math.max(-maxX, Math.min(maxX, tx));
      ty = Math.max(-maxY, Math.min(maxY, ty));
    }
    // ヒントを数秒後にフェード
    setTimeout(() => { ov.querySelector('#museumZoomHint')?.classList.add('fade'); }, 3500);
  }
  window.openMuseum = openMuseum;

  // ============================================================
  // 🏛 美術館: エリア選択ハブ（神話・戦国・…）
  // ============================================================
  const MUSEUM_ZONES = {
    myth: {
      name: '神話エリア',
      emoji: '✦',
      sub: '世界各地の創世と神々',
      palette: { bg1: '#2e2418', bg2: '#15100a' },
      hallStyle: 'classic',
    },
    sengoku: {
      name: '戦国エリア',
      emoji: '⚔',
      sub: '日本の戦国時代 — 武将と合戦図',
      palette: { bg1: '#2a1a14', bg2: '#140a06' },
      hallStyle: 'wa',
      works: [
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Odanobunaga.jpg?width=800',
          caption: '織田信長像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '織田信長' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Toyotomi_hideyoshi.jpg?width=800',
          caption: '豊臣秀吉像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '豊臣秀吉' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tokugawa_Ieyasu2.JPG?width=800',
          caption: '徳川家康像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '徳川家康' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Takeda_Shingen.jpg?width=800',
          caption: '武田信玄像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '武田信玄' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Uesugi_Kenshin.jpg?width=800',
          caption: '上杉謙信像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '上杉謙信' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Date_Masamune.jpg?width=800',
          caption: '伊達政宗像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '伊達政宗' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sanada_Yukimura.jpg?width=800',
          caption: '真田幸村像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '真田幸村' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mori_Motonari.jpg?width=800',
          caption: '毛利元就像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '毛利元就' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Oda_Nobunaga_statue_in_Kiyosu_park.jpg?width=800',
          caption: '清洲公園の信長像', origin: '戦国エリア', emoji: '⚔', chapterTitle: '清洲城' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Battle_of_Sekigahara_folding_screen.jpg?width=800',
          caption: '関ヶ原合戦図屏風', origin: '戦国エリア', emoji: '⚔', chapterTitle: '関ヶ原の戦い' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Siege_of_Osaka_Castle.jpg?width=800',
          caption: '大坂の陣 (Siege of Osaka Castle)', origin: '戦国エリア', emoji: '⚔', chapterTitle: '大坂の陣' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kawanakajima_no_kassen_LCCN2008660089.jpg?width=800',
          caption: '川中島合戦図', origin: '戦国エリア', emoji: '⚔', chapterTitle: '川中島の戦い' },
        { img: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sengoku_period_battle.jpg?width=800',
          caption: '戦国の合戦', origin: '戦国エリア', emoji: '⚔', chapterTitle: '戦国合戦図' },
      ],
    },
  };

  function openMuseumHub() {
    const ov = document.createElement('div');
    ov.className = 'museum-hub-overlay';
    ov.innerHTML = `
      <button class="museum-hub-close" aria-label="閉じる">×</button>
      <div class="museum-hub-wrap">
        <div class="museum-hub-head">
          <div class="museum-hub-super">T H E 　 M U S E U M</div>
          <div class="museum-hub-title">美 術 館</div>
          <div class="museum-hub-sub">── 人類が見たものに、足を踏み入れる ──</div>
        </div>
        <div class="museum-hub-zones">
          ${Object.keys(MUSEUM_ZONES).map(k => {
            const z = MUSEUM_ZONES[k];
            const count = k === 'myth'
              ? (() => { let n = 0; Object.values(MYTH_STORIES).forEach(s => s.chapters && s.chapters.forEach(c => { if (c.img) n++; })); return n; })()
              : (z.works || []).length;
            return `
              <button class="museum-hub-zone" data-zone="${k}"
                style="background: linear-gradient(160deg, ${z.palette.bg1}, ${z.palette.bg2});">
                <div class="mhz-emoji">${z.emoji}</div>
                <div class="mhz-name">${z.name}</div>
                <div class="mhz-sub">${z.sub}</div>
                <div class="mhz-count">全 ${count} 作品</div>
                <div class="mhz-enter">入 る ›</div>
              </button>
            `;
          }).join('')}
        </div>
        <div class="museum-hub-foot">新しいエリアは順次追加中です</div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.museum-hub-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 400);
    });
    ov.querySelectorAll('.museum-hub-zone').forEach(btn => {
      btn.addEventListener('click', () => {
        const zone = btn.dataset.zone;
        ov.classList.remove('open');
        setTimeout(() => { ov.remove(); openMythMuseum(zone); }, 300);
      });
    });
  }
  window.openMuseumHub = openMuseumHub;

  // ============================================================
  // 🏛 美術館ホール（指定ゾーンの作品を3Dで表示）
  // ============================================================
  async function openMythMuseum(zoneKey = 'myth') {
    if (!window.THREE) return;
    const THREE = window.THREE;
    if (window.THREE_READY) { try { await window.THREE_READY; } catch {} }
    const ADDONS = window.THREE_ADDONS || {};
    const zone = MUSEUM_ZONES[zoneKey] || MUSEUM_ZONES.myth;
    // 作品収集
    const works = [];
    if (zoneKey === 'myth') {
      Object.keys(MYTH_STORIES).forEach(k => {
        const s = MYTH_STORIES[k];
        if (!s.chapters) return;
        s.chapters.forEach(c => {
          if (c.img) works.push({
            img: c.img,
            caption: c.caption || c.t,
            origin: s.name,
          emoji: s.emoji,
          chapterTitle: c.t,
        });
      });
    });
    } else {
      // その他のゾーンはzone.worksを使う
      (zone.works || []).forEach(w => works.push(w));
    }
    if (!works.length) { alert('このエリアには作品がありません'); return; }
    const ov = document.createElement('div');
    ov.className = 'museum3d-overlay museum3d-zone-' + zoneKey;
    ov.innerHTML = `
      <div class="museum3d-stage" id="m3dStage"></div>
      <button class="museum3d-close" aria-label="閉じる">×</button>
      <div class="museum3d-title">${zone.name.replace('エリア', '')} 美 術 館</div>
      <div class="museum3d-info" id="m3dInfo"></div>
      <div class="museum3d-reticle">·</div>
      <div class="museum3d-hint" id="m3dHint">
        <div>W A S D で歩く　／　ドラッグで見回す</div>
        <div class="m3d-hint-mobile">タップした方向へ歩く　／　絵に近づくとタップで鑑賞</div>
      </div>
      <div class="museum3d-stick" id="m3dStick">
        <div class="m3d-stick-knob" id="m3dKnob"></div>
      </div>
      <button class="museum3d-view-btn" id="m3dViewBtn">🖼 この絵を見る</button>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    const stage = ov.querySelector('#m3dStage');
    const info = ov.querySelector('#m3dInfo');
    const viewBtn = ov.querySelector('#m3dViewBtn');
    const W = () => stage.clientWidth || window.innerWidth;
    const H = () => stage.clientHeight || window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.setSize(W(), H());
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45; // 美術館もっと明るく
    stage.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const isWa = zone.hallStyle === 'wa';

    const scene = new THREE.Scene();
    const bgColor = isWa ? 0x2a1810 : 0x3a2c1c; // 明るい暗茶 / 木の色
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 25, 80);

    // === 床テクスチャ（洋＝大理石 / 和＝畳風） ===
    const floorTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const g = c.getContext('2d');
      if (isWa) {
        // 畳（イ草）
        const grd = g.createLinearGradient(0, 0, 0, 512);
        grd.addColorStop(0, '#b8a66a'); grd.addColorStop(0.5, '#c8b474'); grd.addColorStop(1, '#a89450');
        g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
        // 縦イ草
        for (let x = 0; x < 512; x += 2) {
          g.strokeStyle = `rgba(${100+Math.random()*40},${85+Math.random()*30},${40+Math.random()*25},${0.25+Math.random()*0.3})`;
          g.lineWidth = 1; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke();
        }
        // 畳の境目（縁）
        g.strokeStyle = '#3a2814'; g.lineWidth = 4;
        g.strokeRect(4, 4, 504, 504);
        g.strokeStyle = '#2a1a08'; g.lineWidth = 1;
        g.strokeRect(6, 6, 500, 500);
      } else {
        const grd = g.createLinearGradient(0,0,512,512);
        grd.addColorStop(0, '#d8d0c0'); grd.addColorStop(0.5, '#b0a895'); grd.addColorStop(1, '#e0d8c8');
        g.fillStyle = grd; g.fillRect(0,0,512,512);
        for (let i = 0; i < 40; i++) {
          g.strokeStyle = `rgba(${80+Math.random()*60},${70+Math.random()*40},${50+Math.random()*30},${0.1+Math.random()*0.3})`;
          g.lineWidth = 0.5 + Math.random() * 1.5;
          g.beginPath();
          let x = Math.random()*512, y = Math.random()*512;
          g.moveTo(x, y);
          for (let k = 0; k < 20; k++) {
            x += (Math.random()-0.5)*40; y += (Math.random()-0.5)*40;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.strokeStyle = 'rgba(40,30,20,0.3)';
        g.lineWidth = 1;
        for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i*64, 0); g.lineTo(i*64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i*64); g.lineTo(512, i*64); g.stroke(); }
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(isWa ? 6 : 10, isWa ? 6 : 10);
      return t;
    })();
    // === 壁テクスチャ（洋＝石 / 和＝漆喰に縦格子） ===
    const wallTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const g = c.getContext('2d');
      if (isWa) {
        // 漆喰の白+朱の壁
        g.fillStyle = '#e8d8b8'; g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 400; i++) {
          g.fillStyle = `rgba(${160+Math.random()*40},${120+Math.random()*30},${70+Math.random()*30},${0.15+Math.random()*0.25})`;
          g.fillRect(Math.random()*512, Math.random()*512, 1+Math.random()*2, 1+Math.random()*2);
        }
        // 縦格子（木材）
        g.fillStyle = '#3a2210';
        for (let x = 0; x < 512; x += 42) {
          g.fillRect(x, 0, 4, 512);
        }
        // 横木
        g.fillRect(0, 0, 512, 12);
        g.fillRect(0, 500, 512, 12);
        g.fillRect(0, 250, 512, 8);
      } else {
        g.fillStyle = '#6a5a48'; g.fillRect(0,0,512,512);
        for (let i = 0; i < 500; i++) {
          g.fillStyle = `rgba(${60+Math.random()*50},${45+Math.random()*35},${30+Math.random()*25},${0.2+Math.random()*0.3})`;
          g.fillRect(Math.random()*512, Math.random()*512, 1+Math.random()*3, 1+Math.random()*3);
        }
        g.strokeStyle = 'rgba(200,170,110,0.15)'; g.lineWidth = 1;
        for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i*64, 0); g.lineTo(i*64, 512); g.stroke(); }
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    })();

    // === ホール構造：ゾーン別の形 ===
    // 神話＝多角形（円形に近い）、戦国＝正方形に近い長方形
    const N = isWa
      ? Math.max(4, Math.ceil(works.length / 3) * 4) // 4の倍数、長方形ぽく
      : Math.max(8, works.length);
    const radius = Math.max(14, N * 1.5);
    const wallHeight = isWa ? 7 : 6;
    const wallAngle = (Math.PI * 2) / N;

    // 床
    const floorGeo = new THREE.CircleGeometry(radius + 2, N);
    floorTex.repeat.set(radius / 2, radius / 2);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 天井
    const ceilGeo = new THREE.CircleGeometry(radius + 2, N);
    const ceilTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      const g = c.getContext('2d');
      if (isWa) {
        // 格天井風 (gohtenjou)
        g.fillStyle = '#2a1a0a'; g.fillRect(0,0,256,256);
        g.strokeStyle = '#8a6030'; g.lineWidth = 3;
        for (let i = 0; i <= 8; i++) {
          g.beginPath(); g.moveTo(0, i*32); g.lineTo(256, i*32); g.stroke();
          g.beginPath(); g.moveTo(i*32, 0); g.lineTo(i*32, 256); g.stroke();
        }
        // 升ごとに金の菱
        g.strokeStyle = 'rgba(220,170,80,0.4)'; g.lineWidth = 1;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const cx = x*32+16, cy = y*32+16;
          g.beginPath(); g.moveTo(cx, cy-8); g.lineTo(cx+8, cy); g.lineTo(cx, cy+8); g.lineTo(cx-8, cy); g.closePath(); g.stroke();
        }
      } else {
        const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
        grd.addColorStop(0, '#fff0c0'); grd.addColorStop(0.5, '#8a6030'); grd.addColorStop(1, '#2a1808');
        g.fillStyle = grd; g.fillRect(0,0,256,256);
        g.strokeStyle = 'rgba(255,220,160,0.4)'; g.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i/8) * Math.PI * 2;
          g.beginPath(); g.moveTo(128, 128); g.lineTo(128+Math.cos(a)*120, 128+Math.sin(a)*120); g.stroke();
        }
        g.beginPath(); g.arc(128,128,60,0,Math.PI*2); g.stroke();
        g.beginPath(); g.arc(128,128,100,0,Math.PI*2); g.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      if (isWa) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); }
      return t;
    })();
    const ceiling = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.9, side: THREE.DoubleSide }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    scene.add(ceiling);

    // 照明（洋＝シャンデリア / 和＝中央に釣り灯籠 + 周囲の赤提灯）
    const chandLight = new THREE.PointLight(
      isWa ? 0xff9060 : 0xffe8a8,
      isWa ? 3.5 : 4.5, // 倍以上に
      isWa ? 35 : 45, 1.3
    );
    chandLight.position.set(0, wallHeight - 0.5, 0);
    scene.add(chandLight);
    const chandelier = new THREE.Group();
    if (isWa) {
      // 中央に大きな和提灯
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 1.1, 20, 6, true),
        new THREE.MeshStandardMaterial({
          color: 0xd02020, roughness: 0.6, emissive: 0x801010, emissiveIntensity: 0.8,
          side: THREE.DoubleSide,
        })
      );
      lantern.position.set(0, wallHeight - 1.1, 0);
      chandelier.add(lantern);
      // 提灯の上下の輪
      for (const dy of [-0.55, 0.55]) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.58, 0.04, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0x2a1808, metalness: 0.5, roughness: 0.5 })
        );
        ring.position.set(0, wallHeight - 1.1 + dy, 0);
        ring.rotation.x = Math.PI / 2;
        chandelier.add(ring);
      }
      // 吊り紐
      const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, wallHeight - (wallHeight - 0.55), 6),
        new THREE.MeshStandardMaterial({ color: 0x2a1808 })
      );
      rope.position.set(0, wallHeight - 0.28, 0);
      chandelier.add(rope);
      // 4本の梁（天井から降りるアクセント）
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(radius * 2 + 2, 0.18, 0.22),
          new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.8 })
        );
        beam.rotation.y = a;
        beam.position.set(0, wallHeight - 0.15, 0);
        chandelier.add(beam);
      }
    } else {
      const chandCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
      );
      chandCore.position.set(0, wallHeight - 0.8, 0);
      chandelier.add(chandCore);
      for (let i = 0; i < 8; i++) {
        const a = (i/8) * Math.PI * 2;
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.03, 0.9, 6),
          new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.8, roughness: 0.3 })
        );
        arm.position.set(Math.cos(a)*0.6, wallHeight-1.0, Math.sin(a)*0.6);
        arm.rotation.z = -Math.cos(a)*0.8;
        arm.rotation.x = Math.sin(a)*0.8;
        chandelier.add(arm);
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xfff0a0 })
        );
        bulb.position.set(Math.cos(a)*1.2, wallHeight-1.2, Math.sin(a)*1.2);
        chandelier.add(bulb);
      }
    }
    scene.add(chandelier);

    // 環境光
    scene.add(new THREE.AmbientLight(isWa ? 0x8a6038 : 0xc0a880, 1.0));
    const hemi = new THREE.HemisphereLight(isWa ? 0xe8b860 : 0xf0d8a0, 0x4a3a28, 0.9);
    scene.add(hemi);

    // 和ホール: 壁の四隅に赤提灯を吊り下げる
    if (isWa) {
      for (let i = 0; i < N; i += 2) {
        const a = i * wallAngle + wallAngle / 2;
        const px = Math.cos(a) * (radius - 1.2), pz = Math.sin(a) * (radius - 1.2);
        // 提灯本体
        const lt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 0.38, 14, 4, true),
          new THREE.MeshStandardMaterial({
            color: 0xd02820, roughness: 0.6, emissive: 0x701010, emissiveIntensity: 1.1,
            side: THREE.DoubleSide,
          })
        );
        lt.position.set(px, wallHeight - 1.4, pz);
        scene.add(lt);
        // 提灯の光
        const lg = new THREE.PointLight(0xff8040, 0.6, 6, 1.5);
        lg.position.copy(lt.position);
        scene.add(lg);
        // 吊り紐
        const str = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 1.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x2a1a08 })
        );
        str.position.set(px, wallHeight - 0.6, pz);
        scene.add(str);
      }
    }

    // === 壁 + 絵画 ===
    const paintings = []; // {mesh, painting: work}

    // ★ Wikimedia Commons URL を CORS-clean な upload.wikimedia.org thumbnail URL に解決
    //   Special:FilePath リダイレクトを経由せず、API から直接サムネURLを得る
    async function resolveCommonsUrls(urlList) {
      const out = new Map();
      const batches = [];
      const need = [];
      urlList.forEach(u => {
        const m = u.match(/Special:FilePath\/([^?]+)/);
        if (m) need.push({ orig: u, filename: decodeURIComponent(m[1]).replace(/_/g, ' ') });
        else out.set(u, u);
      });
      for (let i = 0; i < need.length; i += 40) batches.push(need.slice(i, i + 40));
      for (const batch of batches) {
        const titles = batch.map(b => 'File:' + b.filename).join('|');
        const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&iiurlwidth=1024&titles=${encodeURIComponent(titles)}&origin=*`;
        try {
          const r = await fetch(api);
          const d = await r.json();
          const pages = Object.values(d.query?.pages || {});
          const byTitle = new Map();
          pages.forEach(p => {
            if (p.title && p.imageinfo?.[0]) {
              byTitle.set(p.title.replace(/^File:/, ''), p.imageinfo[0].thumburl || p.imageinfo[0].url);
            }
          });
          batch.forEach(b => {
            const url = byTitle.get(b.filename);
            if (url) out.set(b.orig, url);
            else out.set(b.orig, b.orig); // フォールバック: 元URL
          });
        } catch (e) {
          batch.forEach(b => out.set(b.orig, b.orig));
        }
      }
      return out;
    }
    // Wikimedia画像は 302→301→200 リダイレクト。
    // キャッシュ汚染を避けるためcache-busterを付与。
    // 戦略1: Image + crossOrigin="anonymous" (最速)
    // 戦略2: fetch → blob → ObjectURL (Image失敗時)
    function loadArtTexture(url) {
      // cache-bust: 既に non-CORS で読まれた可能性があるので、別URLとしてfetchさせる
      const bustedUrl = url + (url.includes('?') ? '&' : '?') + 'c3d=1';
      return new Promise((resolve, reject) => {
        // 戦略1
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const tex = new THREE.Texture(img);
            if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace || 'srgb';
            else if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
            tex.needsUpdate = true;
            resolve(tex);
          } catch (e) { strategy2(); }
        };
        img.onerror = () => strategy2();
        img.src = bustedUrl;

        // 戦略2: fetch (別cache-busterで再試行)
        function strategy2() {
          const busted2 = url + (url.includes('?') ? '&' : '?') + 'c3d=2';
          fetch(busted2, { mode: 'cors', credentials: 'omit', cache: 'reload' })
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
            .then(blob => {
              const obj = URL.createObjectURL(blob);
              const im2 = new Image();
              im2.onload = () => {
                const tex = new THREE.Texture(im2);
                if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace || 'srgb';
                else if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
                tex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
                tex.needsUpdate = true;
                setTimeout(() => URL.revokeObjectURL(obj), 2000);
                resolve(tex);
              };
              im2.onerror = () => reject(new Error('img2'));
              im2.src = obj;
            })
            .catch(reject);
        }
      });
    }
    for (let i = 0; i < N; i++) {
      const a = i * wallAngle;
      const nextA = (i + 1) * wallAngle;
      // 壁の2点
      const x1 = Math.cos(a) * radius, z1 = Math.sin(a) * radius;
      const x2 = Math.cos(nextA) * radius, z2 = Math.sin(nextA) * radius;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      const segLen = Math.hypot(x2 - x1, z2 - z1);
      // 壁面
      const wallGeo = new THREE.PlaneGeometry(segLen, wallHeight);
      const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 }));
      wall.position.set(mx, wallHeight / 2, mz);
      wall.lookAt(0, wallHeight / 2, 0);
      scene.add(wall);
      // 巾木
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.6 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.4, 0.08), baseMat);
      base.position.set(mx, 0.2, mz); base.lookAt(0, 0.2, 0);
      scene.add(base);
      // コーニス
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.5, metalness: 0.2 }));
      cornice.position.set(mx, wallHeight - 0.15, mz); cornice.lookAt(0, wallHeight - 0.15, 0);
      scene.add(cornice);

      // 絵（この壁にある作品）
      const work = works[i % works.length];
      if (!work) continue;
      // 中心から内側に少し出す（壁から浮かせる）
      const nx = -Math.cos((a + nextA) / 2), nz = -Math.sin((a + nextA) / 2);
      const offset = 0.06;
      // 額縁（洋＝金色 / 和＝黒漆＋朱の内枠）
      const frameW = Math.min(segLen * 0.85, 3.6); // 旧2.4 → 3.6 でデカく
      const frameH = frameW * 1.3;
      const frameThick = isWa ? 0.18 : 0.14;
      const frameGeo = new THREE.BoxGeometry(frameW + frameThick*2, frameH + frameThick*2, 0.08);
      const frameMat = isWa
        ? new THREE.MeshStandardMaterial({ color: 0x1a1008, metalness: 0.4, roughness: 0.5 })
        : new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.8, roughness: 0.35 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(mx + nx * offset, wallHeight / 2 + 0.3, mz + nz * offset);
      frame.lookAt(0, wallHeight / 2 + 0.3, 0);
      scene.add(frame);
      // キャンバス（プレースホルダー → ロードで差し替え）
      const phTex = (() => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 80;
        const g = c.getContext('2d');
        g.fillStyle = '#3a2a18'; g.fillRect(0,0,64,80);
        g.fillStyle = '#c8a050'; g.font = '28px serif'; g.textAlign = 'center';
        g.fillText(work.emoji || '?', 32, 44);
        return new THREE.CanvasTexture(c);
      })();
      const canvasMat = new THREE.MeshStandardMaterial({ map: phTex, roughness: 0.6 });
      const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(frameW, frameH), canvasMat);
      canvasMesh.position.set(mx + nx * (offset + 0.05), wallHeight / 2 + 0.3, mz + nz * (offset + 0.05));
      canvasMesh.lookAt(0, wallHeight / 2 + 0.3, 0);
      scene.add(canvasMesh);
      canvasMesh.userData.work = work;
      canvasMesh.userData.wallMid = { x: mx, z: mz };
      paintings.push(canvasMesh);
      canvasMesh.userData.load = () => {
        const src = work._resolvedImg || work.img;
        loadArtTexture(src).then(tex => {
          const img = tex.image;
          const ar = img.width / img.height;
          const planeAR = frameW / frameH;
          let sx = 1, sy = 1;
          if (ar > planeAR) sy = planeAR / ar; else sx = ar / planeAR;
          canvasMesh.scale.set(sx, sy, 1);
          canvasMat.map = tex; canvasMat.needsUpdate = true;
        }).catch(() => {
          // フォールバック（crossOrigin抜き、タイントしてもOK：canvas描画で洗浄は不可だが同一オリジンblobなら有効）
          const im = new Image();
          im.onload = () => {
            try {
              const c = document.createElement('canvas');
              c.width = im.naturalWidth; c.height = im.naturalHeight;
              c.getContext('2d').drawImage(im, 0, 0);
              const tex = new THREE.CanvasTexture(c);
              if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace || 'srgb';
              const ar = im.naturalWidth / im.naturalHeight;
              const planeAR = frameW / frameH;
              let sx = 1, sy = 1;
              if (ar > planeAR) sy = planeAR / ar; else sx = ar / planeAR;
              canvasMesh.scale.set(sx, sy, 1);
              canvasMat.map = tex; canvasMat.needsUpdate = true;
            } catch {}
          };
          im.crossOrigin = 'anonymous';
          im.src = src;
        });
      };
      // スポットライト
      const spot = new THREE.SpotLight(0xfff0c0, 2.5, 12, Math.PI / 4.5, 0.35, 1.4);
      spot.position.set(mx + nx * 2.0, wallHeight - 0.5, mz + nz * 2.0);
      spot.target.position.set(mx + nx * 0.2, wallHeight / 2 + 0.3, mz + nz * 0.2);
      scene.add(spot); scene.add(spot.target);
      // プラーク（小さな金の板）— テキストをcanvasに
      const plaqueCanvas = document.createElement('canvas'); plaqueCanvas.width = 256; plaqueCanvas.height = 64;
      const pg = plaqueCanvas.getContext('2d');
      pg.fillStyle = '#2a1e14'; pg.fillRect(0,0,256,64);
      pg.fillStyle = '#c8a050'; pg.font = 'bold 14px serif'; pg.textAlign = 'center';
      pg.fillText(`${work.origin} — ${work.chapterTitle}`.slice(0, 28), 128, 22);
      pg.font = '11px serif'; pg.fillStyle = '#e8d8a8';
      pg.fillText((work.caption || '').slice(0, 32), 128, 42);
      pg.strokeStyle = '#c8a050'; pg.lineWidth = 2; pg.strokeRect(1,1,254,62);
      const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
      const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex });
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), plaqueMat);
      plaque.position.set(mx + nx * (offset + 0.1), wallHeight / 2 + 0.3 - frameH/2 - 0.25, mz + nz * (offset + 0.1));
      plaque.lookAt(0, plaque.position.y, 0);
      scene.add(plaque);
    }

    // ★ URLをまとめて解決してから画像ロード開始
    resolveCommonsUrls(works.map(w => w.img)).then(resolved => {
      works.forEach(w => { w._resolvedImg = resolved.get(w.img) || w.img; });
      paintings.forEach(p => p.userData.load && p.userData.load());
    }).catch(() => {
      // 解決に失敗しても元URLで試みる
      paintings.forEach(p => p.userData.load && p.userData.load());
    });

    // === カメラ ===
    const camera = new THREE.PerspectiveCamera(70, W()/H(), 0.1, 200);
    camera.position.set(0, 1.7, 0);
    let yaw = 0, pitch = 0;

    // === 入力 ===
    const keys = { w:0, a:0, s:0, d:0 };
    window.addEventListener('keydown', e => {
      if (!ov.classList.contains('open')) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keys.w = 1;
      if (k === 's' || e.key === 'ArrowDown') keys.s = 1;
      if (k === 'a' || e.key === 'ArrowLeft') keys.a = 1;
      if (k === 'd' || e.key === 'ArrowRight') keys.d = 1;
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keys.w = 0;
      if (k === 's' || e.key === 'ArrowDown') keys.s = 0;
      if (k === 'a' || e.key === 'ArrowLeft') keys.a = 0;
      if (k === 'd' || e.key === 'ArrowRight') keys.d = 0;
    });
    // ドラッグで見回す
    let dragging = false, lastX = 0, lastY = 0, dragStartId = null;
    renderer.domElement.addEventListener('pointerdown', e => {
      dragStartId = e.pointerId;
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener('pointermove', e => {
      if (!dragging) return;
      yaw -= (e.clientX - lastX) * 0.004;
      pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - lastY) * 0.004));
      lastX = e.clientX; lastY = e.clientY;
    });
    const stopDrag = () => { dragging = false; dragStartId = null; };
    renderer.domElement.addEventListener('pointerup', stopDrag);
    renderer.domElement.addEventListener('pointercancel', stopDrag);
    renderer.domElement.addEventListener('pointerleave', stopDrag);
    // モバイル: スティック
    const stick = ov.querySelector('#m3dStick');
    const knob = ov.querySelector('#m3dKnob');
    let stickActive = false, stickDX = 0, stickDY = 0;
    const stickStart = e => {
      stickActive = true;
      const t = e.touches ? e.touches[0] : e;
      stick.dataset.cx = t.clientX; stick.dataset.cy = t.clientY;
      stickDX = stickDY = 0; e.preventDefault();
    };
    const stickMove = e => {
      if (!stickActive) return;
      const t = e.touches ? e.touches[0] : e;
      const cx = +stick.dataset.cx, cy = +stick.dataset.cy;
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const d = Math.hypot(dx, dy);
      const MAX = 40;
      if (d > MAX) { dx = dx/d*MAX; dy = dy/d*MAX; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      stickDX = dx / MAX; stickDY = dy / MAX;
      e.preventDefault();
    };
    const stickEnd = () => {
      stickActive = false; knob.style.transform = 'translate(0,0)'; stickDX = stickDY = 0;
    };
    stick.addEventListener('touchstart', stickStart, { passive: false });
    stick.addEventListener('touchmove', stickMove, { passive: false });
    stick.addEventListener('touchend', stickEnd);
    stick.addEventListener('mousedown', stickStart);
    window.addEventListener('mousemove', stickMove);
    window.addEventListener('mouseup', stickEnd);

    // 閉じる
    let running = true;
    const close = () => {
      running = false;
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 500);
    };
    ov.querySelector('.museum3d-close').addEventListener('click', close);

    // 近くの絵を判定 & ビューボタン
    let currentNear = null;
    viewBtn.addEventListener('click', () => {
      if (currentNear) openMuseum(currentNear.userData.work.img,
        `${currentNear.userData.work.origin}　${currentNear.userData.work.chapterTitle}　／　${currentNear.userData.work.caption}`);
    });

    // ✨ OutlinePass: 近づいた絵画に金色の輪郭ハイライト
    let mComposer = null, outlinePass = null;
    if (ADDONS.EffectComposer && ADDONS.RenderPass && ADDONS.OutlinePass) {
      try {
        mComposer = new ADDONS.EffectComposer(renderer);
        mComposer.addPass(new ADDONS.RenderPass(scene, camera));
        outlinePass = new ADDONS.OutlinePass(new THREE.Vector2(W(), H()), scene, camera);
        outlinePass.edgeStrength = 3.5;
        outlinePass.edgeGlow = 0.8;
        outlinePass.edgeThickness = 1.8;
        outlinePass.pulsePeriod = 2;
        outlinePass.visibleEdgeColor.set(0xfff0b0);
        outlinePass.hiddenEdgeColor.set(0x997a40);
        mComposer.addPass(outlinePass);
      } catch (e) { console.warn('museum outline', e); mComposer = null; }
    }

    // アニメ
    const raycaster = new THREE.Raycaster();
    function animate() {
      if (!running) return;
      if (document.hidden) { requestAnimationFrame(animate); return; }
      // 移動
      const speed = 0.08;
      const fwd = (keys.w - keys.s) - stickDY;
      const strafe = (keys.d - keys.a) + stickDX;
      const moveLen = Math.hypot(fwd, strafe);
      if (moveLen > 0) {
        const nx = Math.sin(yaw), nz = -Math.cos(yaw);
        const sx = Math.cos(yaw), sz = Math.sin(yaw);
        let dx = (nx * fwd + sx * strafe) * speed;
        let dz = (nz * fwd + sz * strafe) * speed;
        camera.position.x += dx; camera.position.z += dz;
        // 壁コリジョン（中心からの距離を制限）
        const d = Math.hypot(camera.position.x, camera.position.z);
        const maxD = radius - 1.5;
        if (d > maxD) {
          camera.position.x = camera.position.x / d * maxD;
          camera.position.z = camera.position.z / d * maxD;
        }
      }
      // カメラ向き（yaw, pitch）
      const lookDist = 5;
      camera.lookAt(
        camera.position.x + Math.sin(yaw) * Math.cos(pitch) * lookDist,
        camera.position.y + Math.sin(pitch) * lookDist,
        camera.position.z - Math.cos(yaw) * Math.cos(pitch) * lookDist
      );
      // 最寄絵を検索
      let best = null, bestD = 4;
      paintings.forEach(p => {
        const dx = p.position.x - camera.position.x;
        const dz = p.position.z - camera.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < bestD) {
          // 前方判定
          const fx = Math.sin(yaw), fz = -Math.cos(yaw);
          const dot = (dx/dist) * fx + (dz/dist) * fz;
          if (dot > 0.3) { best = p; bestD = dist; }
        }
      });
      if (best !== currentNear) {
        currentNear = best;
        if (best) {
          info.textContent = `${best.userData.work.origin}　—　${best.userData.work.chapterTitle}`;
          info.classList.add('show');
          viewBtn.classList.add('show');
        } else {
          info.classList.remove('show');
          viewBtn.classList.remove('show');
        }
        if (outlinePass) outlinePass.selectedObjects = best ? [best] : [];
      }
      // シャンデリアゆらぎ
      chandLight.intensity = 4.5 + Math.sin(Date.now() * 0.003) * 0.25;
      try {
        if (mComposer) mComposer.render();
        else renderer.render(scene, camera);
      } catch (e) {
        mComposer = null;
        try { renderer.render(scene, camera); } catch {}
      }
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', () => {
      renderer.setSize(W(), H());
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
      if (mComposer) mComposer.setSize(W(), H());
    });

    // ヒント3秒でフェード
    setTimeout(() => { const h = ov.querySelector('#m3dHint'); if (h) h.classList.add('fade'); }, 4500);
  }
  window.openMythMuseum = openMythMuseum;

  // ============================================================
  // 🏛 神殿 (Pantheon) — 3Dで歩ける神殿、ホログラムの神々
  // ============================================================
  // 各神話のキー神々（公開ドメインのWikimedia画像）
  const PANTHEON_DATA = {
    genesis: {
      name: '創世記', emoji: '✦', accent: 0xffd890,
      gods: [
        { n: 'ヤハウェ', t: '唯一神', img: 'Special:FilePath/God2-Sistine_Chapel.png',
          lore: '宇宙を6日で創造し、7日目に休んだ。光あれと言うと光があった。' },
        { n: 'アダム', t: '最初の人', img: 'Special:FilePath/Michelangelo_-_Creation_of_Adam_(cropped).jpg',
          lore: '土から創られた最初の人間。エデンの園を耕し守る役を与えられた。' },
        { n: 'イヴ', t: '生命の母', img: 'Special:FilePath/Michelangelo%2C_Creation_of_Eve_01.jpg',
          lore: 'アダムの肋骨から創られた女。蛇に唆されて知恵の実を食べた。' },
        { n: '蛇', t: '誘惑者', img: 'Special:FilePath/Lucas_Cranach_the_Elder,_Adam_and_Eve_in_Paradise,_1509,_NGA_6060.jpg',
          lore: '園の最も賢い生き物。神のごとくなれると囁いた。' },
        { n: '大天使', t: '楽園の番人', img: 'Special:FilePath/Masaccio-Expulsion_of_Adam_and_Eve-_Brancacci_Chapel2.jpg',
          lore: '炎の剣を持ちエデンの東で命の木への道を守る。' },
      ],
    },
    greek: {
      name: 'ギリシャ神話', emoji: '⚡', accent: 0xfff0a8,
      gods: [
        { n: 'ゼウス', t: '主神・雷霆', img: 'Special:FilePath/Zeus_Otricoli_Pio-Clementino_Inv257.jpg',
          lore: '神々の王。雷を武器にオリンポスを統べる。' },
        { n: 'ポセイドン', t: '海神', img: 'Special:FilePath/Poseidon_sculpture_Copenhagen_2005.jpg',
          lore: '三叉矛で海と地震を司る。アテナとアテネを争った。' },
        { n: 'アテナ', t: '知恵と戦', img: 'Special:FilePath/Mattei_Athena_Louvre_Ma530_n2.jpg',
          lore: 'ゼウスの額から武装して生まれた。フクロウとオリーブの女神。' },
        { n: 'アポロン', t: '太陽・芸術', img: 'Special:FilePath/Apollo_of_the_Belvedere.jpg',
          lore: '太陽・音楽・予言・医術。デルフォイの神託を司る。' },
        { n: 'アフロディーテ', t: '愛と美', img: 'Special:FilePath/La_naissance_de_V%C3%A9nus.jpg',
          lore: '海の泡から生まれた愛と美の女神。' },
      ],
    },
    japan: {
      name: '日本神話', emoji: '⛩', accent: 0xffd8a0,
      gods: [
        { n: '天照大神', t: '太陽神', img: 'Special:FilePath/Amaterasu_cave_crop.jpg',
          lore: '高天原を統べる太陽の女神。天岩戸に隠れ世界が闇に。' },
        { n: '須佐之男', t: '嵐神', img: 'Special:FilePath/Susanoo-no-Mikoto-slays-Yamata-no-Orochi-in-Izumo-By-Tsukioka-Yoshitoshi.png',
          lore: '海原の暴神。ヤマタノオロチを退治し草薙剣を得た。' },
        { n: '伊邪那岐', t: '創造神', img: 'Special:FilePath/Kobayashi_Izanami_and_Izanagi.jpg',
          lore: '妻イザナミと日本列島を生んだ男神。三貴子の父。' },
        { n: '大国主', t: '国つ神', img: 'Special:FilePath/%C5%8Ckuninushi_no_Mikoto.jpg',
          lore: '出雲を治める地上の王。因幡の白兎、縁結びの神。' },
        { n: '月読命', t: '月神', img: 'Special:FilePath/Tsukuyomi_no_Mikoto.jpg',
          lore: '夜の世界を司る月の神。' },
      ],
    },
    norse: {
      name: '北欧神話', emoji: '🌳', accent: 0xb0d0ff,
      gods: [
        { n: 'オーディン', t: '主神', img: 'Special:FilePath/Georg_von_Rosen_-_Oden_som_vandringsman%2C_1886_(Odin%2C_the_Wanderer).jpg',
          lore: '世界樹で知恵を得るため片目を捧げた全父。' },
        { n: 'トール', t: '雷神', img: 'Special:FilePath/M%C3%A5rten_Eskil_Winge_-_Tor%27s_Fight_with_the_Giants_-_Google_Art_Project.jpg',
          lore: 'ミョルニルを持つ雷霆の神。巨人と戦い続ける戦士。' },
        { n: 'ロキ', t: '詐術神', img: 'Special:FilePath/Mardr-and-Loki.jpg',
          lore: '巨人の血を引くトリックスター。ラグナロクの引き金。' },
        { n: 'フレイヤ', t: '愛と戦', img: 'Special:FilePath/Freyja-Penrose.jpg',
          lore: '美と愛、豊穣の女神。戦死者の半分を連れていく。' },
      ],
    },
    egypt: {
      name: 'エジプト神話', emoji: '𓂀', accent: 0xffc850,
      gods: [
        { n: 'ラー', t: '太陽神', img: 'Special:FilePath/Re-Horakhty.svg',
          lore: 'ハヤブサ頭の太陽神。毎日天を渡り、夜は地下界で蛇と戦う。' },
        { n: 'オシリス', t: '冥界王', img: 'Special:FilePath/Standing_Osiris_edit1.svg',
          lore: '農業と死後の世界の神。弟セトに殺され妻イシスに復活された。' },
        { n: 'イシス', t: '母神', img: 'Special:FilePath/Isis-tomb_of_Seti_I.jpg',
          lore: '魔術と母性の女神。夫オシリスを蘇らせ息子ホルスを守った。' },
        { n: 'アヌビス', t: '死者の導き手', img: 'Special:FilePath/Anubis_standing.svg',
          lore: 'ジャッカル頭の神。ミイラ作りと死者の心臓を秤る。' },
      ],
    },
    hindu: {
      name: 'ヒンドゥー神話', emoji: '🪷', accent: 0xffb0a0,
      gods: [
        { n: 'ブラフマー', t: '創造神', img: 'Special:FilePath/19th_century_Brahma_painting.jpg',
          lore: '四つの顔と腕を持つ宇宙の創造者。ヴェーダを司る。' },
        { n: 'ヴィシュヌ', t: '維持神', img: 'Special:FilePath/Bhagavan_Vishnu.jpg',
          lore: '十の化身で世界を救う維持の神。ラーマとクリシュナも彼の姿。' },
        { n: 'シヴァ', t: '破壊と再生', img: 'Special:FilePath/Shiva_Pashupati.jpg',
          lore: '第三の眼を持つ破壊と再生の神。宇宙を踊りで破壊し再創造する。' },
      ],
    },
  };

  async function openPantheon3D() {
    if (!window.THREE) return;
    const THREE = window.THREE;
    if (window.THREE_READY) { try { await window.THREE_READY; } catch {} }
    const ADDONS = window.THREE_ADDONS || {};

    let currentZone = 'hub'; // 'hub' or pantheon key
    const ov = document.createElement('div');
    ov.className = 'museum3d-overlay pantheon-overlay';
    ov.innerHTML = `
      <div class="museum3d-stage" id="pantheonStage"></div>
      <button class="museum3d-close" aria-label="閉じる">×</button>
      <div class="museum3d-title" id="pantheonTitle">神 殿</div>
      <div class="museum3d-info" id="pantheonInfo"></div>
      <div class="museum3d-reticle">·</div>
      <div class="museum3d-hint">WASD で歩く / ドラッグで見回す / 台座をタップ</div>
      <div class="museum3d-stick" id="ptStick"><div class="m3d-stick-knob" id="ptKnob"></div></div>
      <button class="museum3d-view-btn" id="ptViewBtn">この神殿に入る ›</button>
      <button class="pantheon-back-btn" id="ptBackBtn">← 神殿選択へ</button>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    const stage = ov.querySelector('#pantheonStage');
    const titleEl = ov.querySelector('#pantheonTitle');
    const infoEl = ov.querySelector('#pantheonInfo');
    const enterBtn = ov.querySelector('#ptViewBtn');
    const backBtn = ov.querySelector('#ptBackBtn');
    const W = () => stage.clientWidth || window.innerWidth;
    const H = () => stage.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
    renderer.setSize(W(), H());
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15; // 明るめ
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    // シーン構築（zone 切替で再構築）
    let scene, camera, plinths = [], textureCache = new Map(), composer = null, outlinePass = null;
    const animatedTextures = []; // 画像ない時の手続き的アニメ用
    let yaw = 0, pitch = -0.1;
    const keys = { w:0, a:0, s:0, d:0 };
    let stickDX = 0, stickDY = 0;
    let currentNear = null;

    // Wikimedia 画像ロード（既存美術館と同じ手法）
    function loadGodImage(url) {
      if (textureCache.has(url)) return Promise.resolve(textureCache.get(url));
      return new Promise((resolve, reject) => {
        const fullUrl = 'https://commons.wikimedia.org/wiki/' + url + '?width=512';
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const tex = new THREE.Texture(img);
          if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          textureCache.set(url, tex);
          resolve(tex);
        };
        img.onerror = () => reject();
        img.src = fullUrl;
      });
    }

    function buildScene(zone) {
      // 古いシーンクリーンアップ
      if (scene) {
        scene.traverse(o => {
          if (o.material) {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose && m.dispose());
          }
          if (o.geometry) o.geometry.dispose && o.geometry.dispose();
        });
      }
      plinths = [];
      animatedTextures.length = 0;
      scene = new THREE.Scene();
      // 🌌 暗黒の宇宙、星空
      scene.background = new THREE.Color(0x040218);
      // フォグは弱めに（遠くの星まで見える）
      scene.fog = new THREE.FogExp2(0x080422, 0.005);

      // 星空（Points）
      const starGeo = new THREE.BufferGeometry();
      const STARS = 2000;
      const sp = new Float32Array(STARS * 3);
      for (let i = 0; i < STARS; i++) {
        const r = 80 + Math.random() * 120;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        sp[i*3]   = Math.sin(ph) * Math.cos(th) * r;
        sp[i*3+1] = Math.cos(ph) * r;
        sp[i*3+2] = Math.sin(ph) * Math.sin(th) * r;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
        color: 0xffffff, size: 0.4, sizeAttenuation: true,
        transparent: true, opacity: 0.9, depthWrite: false, fog: false,
      })));
      // 月
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(4, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0xfff0d8, fog: false })
      );
      moon.position.set(40, 30, -60);
      scene.add(moon);
      const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement('canvas'); c.width = 256; c.height = 256;
          const g = c.getContext('2d');
          const grd = g.createRadialGradient(128, 128, 20, 128, 128, 128);
          grd.addColorStop(0, 'rgba(255,240,210,0.6)');
          grd.addColorStop(1, 'rgba(180,150,255,0)');
          g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
          return new THREE.CanvasTexture(c);
        })(),
        transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: false,
      }));
      moonHalo.position.copy(moon.position);
      moonHalo.scale.set(20, 20, 20);
      scene.add(moonHalo);

      // 神殿は空に浮かぶ → 床下に雲を浮かべる
      const cloudTex = (() => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 256;
        const g = c.getContext('2d');
        for (let i = 0; i < 30; i++) {
          const x = Math.random() * 512, y = 50 + Math.random() * 156;
          const r = 60 + Math.random() * 100;
          const grd = g.createRadialGradient(x, y, 0, x, y, r);
          grd.addColorStop(0, 'rgba(220,200,255,0.55)');
          grd.addColorStop(1, 'rgba(180,150,220,0)');
          g.fillStyle = grd;
          g.beginPath(); g.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI*2); g.fill();
        }
        return new THREE.CanvasTexture(c);
      })();
      for (let k = 0; k < 4; k++) {
        const cloud = new THREE.Mesh(
          new THREE.PlaneGeometry(120, 60),
          new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false, fog: false })
        );
        cloud.rotation.x = -Math.PI / 2;
        cloud.position.set((Math.random() - 0.5) * 40, -8 - k * 3, (Math.random() - 0.5) * 40);
        scene.add(cloud);
      }

      // 環境光（神殿内は明るく保つ）
      scene.add(new THREE.AmbientLight(0x8070b8, 0.7));
      const hemi = new THREE.HemisphereLight(0xc0a0ff, 0x180830, 0.7);
      scene.add(hemi);

      // 床（暗い大理石）
      const floorTex = (() => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512;
        const g = c.getContext('2d');
        // 明るい大理石風（紫白）
        const grd = g.createRadialGradient(256, 256, 50, 256, 256, 380);
        grd.addColorStop(0, '#d0c0e8'); grd.addColorStop(0.6, '#9080b8'); grd.addColorStop(1, '#403060');
        g.fillStyle = grd; g.fillRect(0,0,512,512);
        for (let i = 0; i < 80; i++) {
          g.strokeStyle = `rgba(${180+Math.random()*60},${160+Math.random()*40},${200+Math.random()*55},${0.15+Math.random()*0.2})`;
          g.lineWidth = 0.5 + Math.random();
          g.beginPath();
          let x = Math.random()*512, y = Math.random()*512;
          g.moveTo(x, y);
          for (let k = 0; k < 8; k++) {
            x += (Math.random()-0.5)*40; y += (Math.random()-0.5)*40;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(8, 8);
        return t;
      })();
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(20, 48),
        new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.3, metalness: 0.6, color: 0xffffff })
      );
      floor.rotation.x = -Math.PI / 2;
      scene.add(floor);

      // 中央の光源（強め）
      const centerLight = new THREE.PointLight(0xffeaff, 3.5, 50, 1.5);
      centerLight.position.set(0, 8, 0);
      scene.add(centerLight);
      // 周囲の補助光×4
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const fill = new THREE.PointLight(0xa0c0ff, 1.2, 25, 1.5);
        fill.position.set(Math.cos(a) * 18, 4, Math.sin(a) * 18);
        scene.add(fill);
      }

      // 周囲の柱（アトモスフェアのため）
      const colMat = new THREE.MeshStandardMaterial({ color: 0xb8a8d8, roughness: 0.5, metalness: 0.2 });
      const numCols = 16;
      for (let i = 0; i < numCols; i++) {
        const a = (i / numCols) * Math.PI * 2;
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.5, 8, 12),
          colMat
        );
        col.position.set(Math.cos(a) * 22, 4, Math.sin(a) * 22);
        scene.add(col);
      }
      // 天井
      // 天井：ステンドグラス風グラデ
      const ceilTex = (() => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 256;
        const g = c.getContext('2d');
        const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        grd.addColorStop(0, '#fff0c0'); grd.addColorStop(0.5, '#a070d0'); grd.addColorStop(1, '#3a2050');
        g.fillStyle = grd; g.fillRect(0,0,256,256);
        for (let i = 0; i < 12; i++) {
          const a = (i/12) * Math.PI * 2;
          g.strokeStyle = 'rgba(255,220,180,0.4)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(128, 128); g.lineTo(128+Math.cos(a)*120, 128+Math.sin(a)*120); g.stroke();
        }
        return new THREE.CanvasTexture(c);
      })();
      const ceiling = new THREE.Mesh(
        new THREE.CircleGeometry(30, 48),
        new THREE.MeshStandardMaterial({ map: ceilTex, color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide })
      );
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = 10;
      scene.add(ceiling);

      // 配置するアイテム
      const items = (zone === 'hub')
        ? Object.entries(PANTHEON_DATA).map(([key, d]) => ({
            type: 'pantheon', key, name: d.name, emoji: d.emoji, accent: d.accent,
            sub: d.gods.length + '柱の神'
          }))
        : (PANTHEON_DATA[zone]?.gods || []).map(g => ({
            type: 'god', name: g.n, sub: g.t, img: g.img, lore: g.lore,
            accent: PANTHEON_DATA[zone].accent,
          }));

      // 円形に台座を配置
      const N = items.length;
      const ringR = N >= 5 ? 12 : 9;
      items.forEach((item, i) => {
        const a = (i / N) * Math.PI * 2;
        const px = Math.cos(a) * ringR, pz = Math.sin(a) * ringR;
        const group = new THREE.Group();
        group.position.set(px, 0, pz);
        // 台座
        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.4, 1.0, 24),
          new THREE.MeshStandardMaterial({ color: 0x2a2040, roughness: 0.5, metalness: 0.4 })
        );
        plinth.position.y = 0.5;
        group.add(plinth);
        // ホログラム円柱（半透明エメッシブ）
        const holoMat = new THREE.MeshBasicMaterial({
          color: item.accent, transparent: true, opacity: 0.18,
          side: THREE.DoubleSide, depthWrite: false,
        });
        const holo = new THREE.Mesh(
          new THREE.CylinderGeometry(0.95, 0.95, 2.4, 16, 1, true),
          holoMat
        );
        holo.position.y = 2.2;
        group.add(holo);
        // ホログラム底のリング
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.95, 1.15, 32),
          new THREE.MeshBasicMaterial({ color: item.accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 1.05;
        group.add(ring);
        // 中の絵（最初はプレースホルダ）
        const phCanvas = document.createElement('canvas');
        phCanvas.width = 256; phCanvas.height = 384;
        const pg = phCanvas.getContext('2d');
        const grd = pg.createLinearGradient(0, 0, 0, 384);
        grd.addColorStop(0, '#3a2050'); grd.addColorStop(1, '#181028');
        pg.fillStyle = grd; pg.fillRect(0, 0, 256, 384);
        pg.font = 'bold 80px serif'; pg.fillStyle = '#fff';
        pg.textAlign = 'center';
        pg.fillText(item.emoji || '✦', 128, 220);
        pg.font = 'bold 24px serif';
        pg.fillText(item.name.slice(0, 6), 128, 280);
        const phTex = new THREE.CanvasTexture(phCanvas);
        const figMat = new THREE.MeshBasicMaterial({
          map: phTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        });
        const figure = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.25), figMat);
        figure.position.y = 2.2;
        group.add(figure);
        // まず procedural canvas（フォールバック）を仕込んでおく
        const cv = document.createElement('canvas');
        cv.width = 384; cv.height = 480;
        const ctx = cv.getContext('2d');
        const animTex = new THREE.CanvasTexture(cv);
        if ('colorSpace' in animTex) animTex.colorSpace = THREE.SRGBColorSpace;
        figMat.map = animTex;
        figMat.needsUpdate = true;
        const accentHex = '#' + item.accent.toString(16).padStart(6, '0');
        const animEntry = { ctx, tex: animTex, item, accent: accentHex };
        animatedTextures.push(animEntry);
        // 画像があるなら試みてロード成功したら写真ホログラム化
        if (item.img) {
          loadGodImage(item.img).then(tex => {
            // ホログラム化：写真を accent 色で軽くシアン染め＋発光
            const c2 = document.createElement('canvas');
            const iw = tex.image.width, ih = tex.image.height;
            const tgt = 384, tgtH = Math.round(tgt * (ih / iw));
            c2.width = tgt; c2.height = Math.min(tgtH, 480);
            const cx2 = c2.getContext('2d');
            // 暗背景（ホログラム）
            cx2.fillStyle = '#08051a'; cx2.fillRect(0, 0, c2.width, c2.height);
            // 写真を中央フィット
            const drawH = c2.height;
            const drawW = drawH * (iw / ih);
            cx2.drawImage(tex.image, (c2.width - drawW) / 2, 0, drawW, drawH);
            // accent 色のオーバーレイ（ホログラムグロー）
            cx2.globalCompositeOperation = 'overlay';
            cx2.fillStyle = accentHex; cx2.globalAlpha = 0.22;
            cx2.fillRect(0, 0, c2.width, c2.height);
            // スキャンライン
            cx2.globalCompositeOperation = 'source-over';
            cx2.globalAlpha = 0.18;
            cx2.fillStyle = accentHex;
            for (let y = 0; y < c2.height; y += 4) cx2.fillRect(0, y, c2.width, 1);
            cx2.globalAlpha = 1;
            const photoTex = new THREE.CanvasTexture(c2);
            if ('colorSpace' in photoTex) photoTex.colorSpace = THREE.SRGBColorSpace;
            figMat.map = photoTex;
            figMat.transparent = true;
            figMat.opacity = 0.92;
            figMat.needsUpdate = true;
            // procedural アニメから外す
            const idx = animatedTextures.indexOf(animEntry);
            if (idx >= 0) animatedTextures.splice(idx, 1);
          }).catch(() => {/* 画像なし → procedural のまま */});
        }
        // ラベル板（台座の前面に大きな名前 — ビルボード）
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 512; labelCanvas.height = 160;
        const lg = labelCanvas.getContext('2d');
        // 名前の背景: 立派な銘板
        const labelGrd = lg.createLinearGradient(0, 0, 0, 160);
        labelGrd.addColorStop(0, '#2a1838'); labelGrd.addColorStop(1, '#0a0418');
        lg.fillStyle = labelGrd; lg.fillRect(0, 0, 512, 160);
        // 縁（accentHex は外スコープで定義済み）
        lg.strokeStyle = accentHex; lg.lineWidth = 4;
        lg.strokeRect(8, 8, 496, 144);
        lg.lineWidth = 1; lg.strokeStyle = accentHex + 'aa';
        lg.strokeRect(16, 16, 480, 128);
        // 大きな名前
        lg.fillStyle = accentHex;
        lg.font = 'bold 48px "Shippori Mincho", serif';
        lg.textAlign = 'center'; lg.textBaseline = 'middle';
        lg.shadowColor = '#000'; lg.shadowBlur = 6;
        lg.fillText(item.name, 256, 70);
        // サブタイトル
        lg.shadowBlur = 0;
        lg.fillStyle = '#e8d8ff';
        lg.font = '22px "Shippori Mincho", serif';
        lg.fillText(item.sub, 256, 120);
        const labelTex = new THREE.CanvasTexture(labelCanvas);
        if ('colorSpace' in labelTex) labelTex.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 0.75),
          new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, side: THREE.DoubleSide })
        );
        label.position.y = 0.55;
        label.userData.isLabel = true; // animate でカメラ向きにする
        group.add(label);

        group.userData = { item, holo, ring, figure };
        plinths.push(group);
        scene.add(group);
      });

      // 各神話部屋の中央に「神話を読む」看板（hub では出さない）
      if (zone !== 'hub' && PANTHEON_DATA[zone]) {
        const tk = MYTH_STORY_KEY_MAP[zone];
        if (tk && window.MYTH_STORIES && window.MYTH_STORIES[tk] || tk) {
          const sign = new THREE.Group();
          sign.position.set(0, 0, 0);
          // 石の台座
          const stone = new THREE.Mesh(
            new THREE.CylinderGeometry(0.9, 1.1, 0.5, 16),
            new THREE.MeshStandardMaterial({ color: 0x6a5a78, roughness: 0.7, metalness: 0.2 })
          );
          stone.position.y = 0.25;
          sign.add(stone);
          // 看板（縦長プレート）
          const accentHex = '#' + PANTHEON_DATA[zone].accent.toString(16).padStart(6, '0');
          const cv = document.createElement('canvas');
          cv.width = 256; cv.height = 384;
          const ctx = cv.getContext('2d');
          // 古文書風背景
          const grd = ctx.createLinearGradient(0, 0, 0, 384);
          grd.addColorStop(0, '#3a2a1a'); grd.addColorStop(1, '#1a1008');
          ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 384);
          // 装飾枠
          ctx.strokeStyle = accentHex; ctx.lineWidth = 4;
          ctx.strokeRect(16, 16, 224, 352);
          ctx.lineWidth = 1;
          ctx.strokeRect(24, 24, 208, 336);
          // タイトル
          ctx.font = 'bold 28px "Shippori Mincho", serif';
          ctx.textAlign = 'center'; ctx.fillStyle = accentHex;
          ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
          ctx.fillText(PANTHEON_DATA[zone].name, 128, 80);
          // 神話絵文字
          ctx.font = '90px serif';
          ctx.fillStyle = '#fff';
          ctx.shadowColor = accentHex; ctx.shadowBlur = 18;
          ctx.fillText(PANTHEON_DATA[zone].emoji, 128, 200);
          ctx.shadowBlur = 0;
          // サブタイトル
          ctx.font = '14px "Shippori Mincho", serif';
          ctx.fillStyle = '#e8d8b0';
          ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
          ctx.fillText('— 神話を読む —', 128, 250);
          // 触れる印
          ctx.fillStyle = accentHex;
          ctx.font = 'bold 20px "Shippori Mincho", serif';
          ctx.fillText('▶ 物語を開く', 128, 320);
          ctx.fillStyle = '#a89878';
          ctx.font = '10px serif';
          ctx.fillText('近づいて選ぶ', 128, 345);
          const signTex = new THREE.CanvasTexture(cv);
          if ('colorSpace' in signTex) signTex.colorSpace = THREE.SRGBColorSpace;
          const board = new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 3.0),
            new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide })
          );
          board.position.y = 2.0;
          sign.add(board);
          // 看板の縁を木材で
          const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 });
          const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.2), frameMat);
          frameTop.position.y = 3.55;
          sign.add(frameTop);
          const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.2), frameMat);
          frameBottom.position.y = 0.55;
          sign.add(frameBottom);
          // 看板を「触れる」item として登録（plinth として扱う）
          sign.userData = {
            item: { type: 'tale', name: PANTHEON_DATA[zone].name + 'を読む', sub: '物語の章へ', talekey: tk, accent: PANTHEON_DATA[zone].accent },
            holo: stone, ring: stone, figure: board, // 共通インタフェース
          };
          scene.add(sign);
          plinths.push(sign);
        }
      }

      titleEl.textContent = zone === 'hub' ? '神 殿' : (PANTHEON_DATA[zone]?.name || '神 殿');
      backBtn.style.display = (zone === 'hub') ? 'none' : 'inline-block';
    }
    // 神殿zone → MYTH_STORIES key の対応
    const MYTH_STORY_KEY_MAP = {
      genesis: 'genesis', greek: 'greek', japan: 'japan',
      norse: 'norse', egypt: 'egypt', hindu: 'hindu',
    };

    // カメラ
    camera = new THREE.PerspectiveCamera(70, W()/H(), 0.1, 200);
    camera.position.set(0, 1.6, 0);

    buildScene('hub');

    // 入力
    window.addEventListener('keydown', e => {
      if (!ov.classList.contains('open')) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keys.w = 1;
      if (k === 's' || e.key === 'ArrowDown') keys.s = 1;
      if (k === 'a' || e.key === 'ArrowLeft') keys.a = 1;
      if (k === 'd' || e.key === 'ArrowRight') keys.d = 1;
    });
    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keys.w = 0;
      if (k === 's' || e.key === 'ArrowDown') keys.s = 0;
      if (k === 'a' || e.key === 'ArrowLeft') keys.a = 0;
      if (k === 'd' || e.key === 'ArrowRight') keys.d = 0;
    });
    let dragging = false, lastX = 0, lastY = 0;
    renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
    renderer.domElement.addEventListener('pointermove', e => {
      if (!dragging) return;
      yaw -= (e.clientX - lastX) * 0.004;
      pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - lastY) * 0.004));
      lastX = e.clientX; lastY = e.clientY;
    });
    renderer.domElement.addEventListener('pointerup', () => dragging = false);
    renderer.domElement.addEventListener('pointercancel', () => dragging = false);
    renderer.domElement.addEventListener('pointerleave', () => dragging = false);
    // モバイル: スティック
    const stick = ov.querySelector('#ptStick');
    const knob = ov.querySelector('#ptKnob');
    let stickActive = false;
    const stickStart = e => {
      stickActive = true;
      const t = e.touches ? e.touches[0] : e;
      stick.dataset.cx = t.clientX; stick.dataset.cy = t.clientY;
      stickDX = stickDY = 0; e.preventDefault();
    };
    const stickMove = e => {
      if (!stickActive) return;
      const t = e.touches ? e.touches[0] : e;
      const cx = +stick.dataset.cx, cy = +stick.dataset.cy;
      let dx = t.clientX - cx, dy = t.clientY - cy;
      const d = Math.hypot(dx, dy);
      const MAX = 40;
      if (d > MAX) { dx = dx/d*MAX; dy = dy/d*MAX; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      stickDX = dx / MAX; stickDY = dy / MAX;
      e.preventDefault();
    };
    const stickEnd = () => { stickActive = false; knob.style.transform = 'translate(0,0)'; stickDX = stickDY = 0; };
    stick.addEventListener('touchstart', stickStart, { passive: false });
    stick.addEventListener('touchmove', stickMove, { passive: false });
    stick.addEventListener('touchend', stickEnd);

    enterBtn.addEventListener('click', () => {
      if (!currentNear) return;
      const item = currentNear.userData.item;
      if (item.type === 'pantheon') {
        currentZone = item.key;
        buildScene(item.key);
        camera.position.set(0, 1.6, 0); yaw = 0;
      } else if (item.type === 'god') {
        showGodModal(item, currentZone);
      } else if (item.type === 'tale') {
        // 神話を読む（既存 openMythology を呼んで該当章へ）
        if (window.openMythology) window.openMythology();
      }
    });
    backBtn.addEventListener('click', () => {
      currentZone = 'hub';
      buildScene('hub');
      camera.position.set(0, 1.6, 0); yaw = 0;
    });

    function showGodModal(god, zoneKey) {
      const m = document.createElement('div');
      m.className = 'pantheon-modal';
      m.innerHTML = `
        <div class="pm-card">
          <button class="pm-close">×</button>
          <img class="pm-img" src="https://commons.wikimedia.org/wiki/${god.img}?width=600" alt="${god.n}">
          <div class="pm-body">
            <div class="pm-sub">${god.t}</div>
            <div class="pm-name">${god.n}</div>
            <div class="pm-lore">${god.lore}</div>
            <div class="pm-zone">— ${PANTHEON_DATA[zoneKey].name} —</div>
          </div>
        </div>
      `;
      ov.appendChild(m);
      requestAnimationFrame(() => m.classList.add('show'));
      const close = () => { m.classList.remove('show'); setTimeout(() => m.remove(), 300); };
      m.querySelector('.pm-close').addEventListener('click', close);
      m.addEventListener('click', e => { if (e.target === m) close(); });
    }

    let running = true;
    ov.querySelector('.museum3d-close').addEventListener('click', () => {
      running = false;
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 500);
    });

    let t = 0;
    function animate() {
      if (!running) return;
      if (document.hidden) { requestAnimationFrame(animate); return; }
      t += 0.016;
      // 移動
      const speed = 0.08;
      const fwd = (keys.w - keys.s) - stickDY;
      const strafe = (keys.d - keys.a) + stickDX;
      if (Math.hypot(fwd, strafe) > 0) {
        const nx = Math.sin(yaw), nz = -Math.cos(yaw);
        const sx = Math.cos(yaw), sz = Math.sin(yaw);
        camera.position.x += (nx * fwd + sx * strafe) * speed;
        camera.position.z += (nz * fwd + sz * strafe) * speed;
        const d = Math.hypot(camera.position.x, camera.position.z);
        if (d > 18) {
          camera.position.x = camera.position.x / d * 18;
          camera.position.z = camera.position.z / d * 18;
        }
      }
      camera.lookAt(
        camera.position.x + Math.sin(yaw) * Math.cos(pitch) * 5,
        camera.position.y + Math.sin(pitch) * 5,
        camera.position.z - Math.cos(yaw) * Math.cos(pitch) * 5
      );
      // 🎨 動くSVG/Canvas（神々のイラスト的アバター）
      if (Math.floor(t * 60) % 3 === 0) {
        animatedTextures.forEach(a => {
          const ctx = a.ctx;
          const W2 = 384, H2 = 480;
          ctx.clearRect(0, 0, W2, H2);
          // 背景: 神聖な放射グラデ
          const cy = 240;
          const cx = 192;
          const bg = ctx.createLinearGradient(0, 0, 0, H2);
          bg.addColorStop(0, '#0a0418');
          bg.addColorStop(0.5, a.accent + '40');
          bg.addColorStop(1, '#0a0418');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W2, H2);
          // 後ろの曼荼羅（回転）
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * 0.15);
          ctx.strokeStyle = a.accent + '99';
          ctx.lineWidth = 1.5;
          for (let petal = 0; petal < 8; petal++) {
            ctx.save();
            ctx.rotate((petal / 8) * Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(35, -25, 35, -75, 0, -90);
            ctx.bezierCurveTo(-35, -75, -35, -25, 0, 0);
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
          // 後光（中心から放射、 canvas に収まる長さ）
          ctx.save();
          ctx.translate(cx, cy - 40);
          ctx.rotate(-t * 0.1);
          for (let r = 0; r < 24; r++) {
            ctx.save();
            ctx.rotate((r / 24) * Math.PI * 2);
            ctx.fillStyle = a.accent + (r % 2 === 0 ? '60' : '30');
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(3.5, -150);
            ctx.lineTo(-3.5, -150);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
          // 神の顔（シルエット）
          ctx.save();
          ctx.translate(cx, cy - 50);
          // 髪/王冠（神話別）
          const headColor = a.accent;
          ctx.fillStyle = '#1a0a2a';
          // 顔の輪郭（楕円）
          ctx.beginPath();
          ctx.ellipse(0, 0, 36, 44, 0, 0, Math.PI * 2);
          ctx.fill();
          // 髪
          ctx.fillStyle = headColor + 'dd';
          ctx.beginPath();
          ctx.moveTo(-38, -10);
          ctx.bezierCurveTo(-44, -50, -20, -56, 0, -50);
          ctx.bezierCurveTo(20, -56, 44, -50, 38, -10);
          ctx.bezierCurveTo(34, -30, 0, -34, 0, -34);
          ctx.bezierCurveTo(0, -34, -34, -30, -38, -10);
          ctx.fill();
          // 王冠（神格を示す）
          ctx.fillStyle = '#fff8c0';
          ctx.shadowColor = headColor; ctx.shadowBlur = 12;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const px = -24 + i * 12;
            ctx.moveTo(px, -42);
            ctx.lineTo(px + 4, -54);
            ctx.lineTo(px + 8, -42);
          }
          ctx.fill();
          ctx.shadowBlur = 0;
          // 目（光る）
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(-12, -2, 4, 5, 0, 0, Math.PI * 2);
          ctx.ellipse(12, -2, 4, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = headColor;
          const blink = Math.sin(t * 0.7) > 0.95 ? 0.3 : 1;
          ctx.beginPath();
          ctx.ellipse(-12, -2, 2.2, 2.8 * blink, 0, 0, Math.PI * 2);
          ctx.ellipse(12, -2, 2.2, 2.8 * blink, 0, 0, Math.PI * 2);
          ctx.fill();
          // 鼻 + 口
          ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 5); ctx.lineTo(-2, 14);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 22, 6, 0.2, Math.PI - 0.2);
          ctx.stroke();
          // 第三の眼（ヒンドゥー神話だけ）
          if (a.accent === '#ffb0a0') {
            ctx.fillStyle = '#ff4040';
            ctx.beginPath();
            ctx.ellipse(0, -22, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          // パルス粒（軌道を周回）
          for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2 + t * 0.4;
            const dr = 130 + Math.sin(t * 2 + i) * 12;
            const px = cx + Math.cos(ang) * dr;
            const py = cy - 40 + Math.sin(ang) * dr * 0.7;
            ctx.fillStyle = a.accent;
            ctx.shadowColor = a.accent; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          // 名前プレート
          ctx.fillStyle = 'rgba(20,10,30,0.88)';
          ctx.fillRect(30, H2 - 70, W2 - 60, 50);
          ctx.strokeStyle = a.accent;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(30, H2 - 70, W2 - 60, 50);
          ctx.font = 'bold 24px "Shippori Mincho", serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = a.accent;
          ctx.fillText(a.item.name.slice(0, 8), cx, H2 - 45);
          a.tex.needsUpdate = true;
        });
      }
      // ホログラム回転 + リング脈動 + ラベル ビルボード
      plinths.forEach(p => {
        p.userData.figure.lookAt(camera.position.x, p.userData.figure.getWorldPosition(new THREE.Vector3()).y, camera.position.z);
        if (p.userData.holo) p.userData.holo.rotation.y += 0.005;
        if (p.userData.ring && p.userData.ring.material) p.userData.ring.material.opacity = 0.4 + Math.sin(t * 2 + p.position.x) * 0.2;
        // ラベルもカメラ向き
        p.children.forEach(ch => {
          if (ch.userData && ch.userData.isLabel) {
            ch.lookAt(camera.position.x, ch.getWorldPosition(new THREE.Vector3()).y, camera.position.z);
          }
        });
      });
      // 最寄りの台座を判定
      let best = null, bestD = 5;
      plinths.forEach(p => {
        const dx = p.position.x - camera.position.x;
        const dz = p.position.z - camera.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < bestD) {
          const fx = Math.sin(yaw), fz = -Math.cos(yaw);
          const dot = (dx/dist) * fx + (dz/dist) * fz;
          if (dot > 0.4) { best = p; bestD = dist; }
        }
      });
      if (best !== currentNear) {
        currentNear = best;
        if (best) {
          const it = best.userData.item;
          infoEl.innerHTML = `<div class="mv-info-name">${it.name}</div><div class="mv-info-sub">${it.sub}</div>`;
          infoEl.classList.add('show');
          enterBtn.classList.add('show');
          enterBtn.textContent = it.type === 'pantheon' ? 'この神殿に入る ›'
            : it.type === 'tale' ? '物語を読む ›'
            : '詳しく見る ›';
        } else {
          infoEl.classList.remove('show');
          enterBtn.classList.remove('show');
        }
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', () => {
      renderer.setSize(W(), H());
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
    });
  }
  window.openPantheon3D = openPantheon3D;


  // ============================================================
  // 🖨 チートシート印刷（偉人ページに「一枚にまとめる」ボタンを挿入）
  // ============================================================
  function setupCheatSheetButton() {
    if (MAGIC._cheatSheetDone) return;
    MAGIC._cheatSheetDone = true;
    const inject = () => {
      const personView = document.getElementById('view-person');
      if (!personView || !personView.classList.contains('active')) return;
      if (personView.querySelector('.magic-cheat-btn')) return;
      const anchor = personView.querySelector('.profile-tabs-wrap')
                  || personView.querySelector('.profile-header, .profile-cover-frame');
      if (!anchor || anchor.parentNode.querySelector('.magic-cheat-btn')) return;
      const name = personView.querySelector('.profile-name')?.textContent?.trim();
      if (!name || !MAGIC._peopleBundle) return;
      const person = MAGIC._peopleBundle.find(p => p.name === name);
      if (!person) return;
      const btn = document.createElement('button');
      btn.className = 'magic-cheat-btn';
      btn.innerHTML = `🖨 一枚にまとめる（印刷/PDF）`;
      btn.addEventListener('click', () => openCheatSheet(person));
      anchor.parentNode.insertBefore(btn, anchor);
    };
    const mo = new MutationObserver(inject);
    mo.observe(document.body, { childList: true, subtree: true });
    loadPeopleBundle().then(() => setTimeout(inject, 600));
  }
  function openCheatSheet(p) {
    const ov = document.createElement('div');
    ov.className = 'cheat-sheet-overlay';
    const fmtYear = y => y == null ? '?' : (y < 0 ? `前${Math.abs(y)}` : `${y}`);
    const events = (p.events || []).slice(0, 8).map(e => {
      const year = e.year != null ? fmtYear(e.year) : '';
      return `<li><b>${year}</b> ${e.title || e.text || e}</li>`;
    }).join('');
    const quotes = (p.quotes || []).slice(0, 3).map(q => {
      const text = typeof q === 'string' ? q : (q.text || '');
      return `<blockquote>「${text}」</blockquote>`;
    }).join('');
    const works = (p.works || []).slice(0, 6).map(w => {
      const title = typeof w === 'string' ? w : (w.title || '');
      return `<span class="cs-work">${title}</span>`;
    }).join('');
    ov.innerHTML = `
      <button class="cs-close" aria-label="閉じる">×</button>
      <button class="cs-print">🖨 印刷 / PDF保存</button>
      <div class="cs-page" id="csPage">
        <header class="cs-head">
          <div class="cs-avatar">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" crossorigin="anonymous">` : `<div class="cs-ini">${p.name.charAt(0)}</div>`}</div>
          <div class="cs-title">
            <h1>${p.name}</h1>
            <div class="cs-en">${p.nameEn || ''}</div>
            <div class="cs-meta">${fmtYear(p.birth)} 〜 ${fmtYear(p.death)}　／　${p.country || ''}　／　${p.field || ''}</div>
          </div>
        </header>
        ${p.summary ? `<section class="cs-sec"><h2>要旨</h2><p>${p.summary}</p></section>` : ''}
        ${events ? `<section class="cs-sec"><h2>年表</h2><ul class="cs-events">${events}</ul></section>` : ''}
        ${quotes ? `<section class="cs-sec"><h2>名言</h2>${quotes}</section>` : ''}
        ${works ? `<section class="cs-sec"><h2>代表作</h2><div class="cs-works">${works}</div></section>` : ''}
        <footer class="cs-foot">
          偉人と自分。 ijin-to-jibun.com
        </footer>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.cs-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 300);
    });
    ov.querySelector('.cs-print').addEventListener('click', () => {
      window.print();
    });
  }
  setupCheatSheetButton();

  // ============================================================
  // 🍰 文脈マッチング広告: イタリア系偉人のページに ティラミス を
  // （ちゃんと関連がある人のページにだけ、自然に差し込む）
  // ============================================================
  function setupPersonContextAds() {
    if (MAGIC._personCtxAdDone) return;
    MAGIC._personCtxAdDone = true;
    const ITALIAN_KW = ['イタリア', 'ローマ', 'フィレンツェ', 'ヴェネツィア', 'ナポリ', 'ミラノ'];
    const WINE_KW = ['ワイン', '酒', '飲酒', 'アブサン', 'コニャック', 'ウィスキー', '大酒', '酒豪', 'ボヘミアン'];
    // 酒を愛した偉人の明示リスト（キーワード検知で取りこぼすやつ）
    const WINE_LOVERS = new Set([
      'beethoven', 'hemingway', 'fitzgerald', 'churchill', 'van_gogh', 'picasso',
      'dazai_osamu', 'nakahara_chuya', 'dazai', 'rimbaud', 'baudelaire', 'bukowski',
      'truman_capote', 'faulkner', 'fitzgerald_scott', 'poe', 'schiller',
      'pavarotti', 'verdi', 'puccini', 'ella_fitzgerald', 'sinatra',
      'hiraga_gennai', 'yosano_akiko',
    ]);
    const tryInject = () => {
      const personView = document.getElementById('view-person');
      if (!personView || !personView.classList.contains('active')) return;
      if (personView.querySelector('.aff-inline-ctx')) return;
      const name = personView.querySelector('.profile-name')?.textContent?.trim();
      if (!name || !MAGIC._peopleBundle) return;
      const person = MAGIC._peopleBundle.find(p => p.name === name);
      if (!person) return;
      const text = (person.country || '') + (person.summary || '') + (person.lifeDigest || '');
      const isItalian = ITALIAN_KW.some(k => text.includes(k));
      const isWineLover = WINE_LOVERS.has(person.id) || WINE_KW.some(k => text.includes(k));
      // 文脈が合うものを選ぶ（両方合致ならランダムにどちらか、片方ならそちら）
      const ctxs = [];
      if (isItalian) ctxs.push('person-italian');
      if (isWineLover) ctxs.push('person-wine-lover');
      if (!ctxs.length) return;
      const chosenCtx = ctxs[Math.floor(Math.random() * ctxs.length)];
      // プロフィール下部に挿入するアンカー
      const anchor = personView.querySelector('.profile-info-card');
      if (!anchor) return;
      const slot = document.createElement('div');
      slot.className = 'aff-inline-ctx';
      anchor.parentNode.insertBefore(slot, anchor.nextSibling);
      MAGIC.renderAffiliate(chosenCtx, slot, 1);
    };
    const mo = new MutationObserver(tryInject);
    mo.observe(document.body, { childList: true, subtree: true });
    loadPeopleBundle().then(() => setTimeout(tryInject, 600));
  }
  setupPersonContextAds();

  async function openCosmos() {
    if (!window.THREE) return;
    const ov = document.createElement('div');
    ov.className = 'cosmos-overlay';
    ov.innerHTML = `
      <button class="cosmos-close" aria-label="閉じる">×</button>
      <div class="cosmos-stage" id="cosmosStage"></div>
      <div class="cosmos-noise" id="cosmosNoise"></div>
      <canvas class="cosmos-conscious-canvas" id="cosmosConsciousCanvas"></canvas>
      <div class="cosmos-conscious-label" id="cosmosConsciousLabel">CONSCIOUSNESS&nbsp;&nbsp;FIELD</div>
      <button class="cosmos-tap" id="cosmosTap">TAP</button>
      <div class="cosmos-warp-flash" id="cosmosWarpFlash"></div>
      <div class="cosmos-hud" id="cosmosHud"></div>
      <div class="cosmos-zoom-ctrl" id="cosmosZoomCtrl">
        <button class="cosmos-zoom-btn" data-cosmos-zoom="in" aria-label="ズームイン">＋</button>
        <button class="cosmos-zoom-btn" data-cosmos-zoom="out" aria-label="ズームアウト">−</button>
      </div>
      <button class="cosmos-rocket-toggle" id="cosmosRocketToggle" aria-label="ロケット操縦">🚀 ROCKET</button>
      <div class="cosmos-vehicle-pick" id="cosmosVehiclePick">
        <button class="cvp-opt active" data-vehicle="rocket" aria-label="ロケット">🚀</button>
        <button class="cvp-opt" data-vehicle="mecha" aria-label="モビルスーツ">🤖</button>
      </div>
      <div class="cosmos-planet-list" id="cosmosPlanetList">
        <button class="cpl-toggle" id="cplToggle" aria-label="惑星一覧">🪐</button>
        <div class="cpl-body" id="cplBody">
          <div class="cpl-title">惑星を追跡</div>
          <div class="cpl-items" id="cplItems"></div>
          <button class="cpl-unlock" id="cplUnlock">🔓 追跡解除</button>
        </div>
      </div>
      <div class="cosmos-time-ctrl" id="cosmosTimeCtrl">
        <button data-speed="0" aria-label="停止">⏸</button>
        <button data-speed="1" class="active" aria-label="1倍">1×</button>
        <button data-speed="5" aria-label="5倍">5×</button>
        <button data-speed="30" aria-label="30倍">30×</button>
      </div>
      <button class="cosmos-modes-trigger" id="cosmosModesTrigger" aria-label="モード選択">
        <span class="cmt-icon">✦</span><span class="cmt-label">モード</span>
      </button>
      <div class="cosmos-modes-sheet" id="cosmosModesSheet">
        <div class="cms-head">
          <div class="cms-title">モードを選ぶ</div>
          <button class="cms-close" id="cmsClose" aria-label="閉じる">×</button>
        </div>
        <div class="cms-list" id="cosmosModes">
          <button class="cms-item" data-mode="trails">
            <span class="cms-i">🌌</span>
            <span class="cms-n">軌道トレイル</span>
            <span class="cms-d">惑星の軌跡を残す</span>
          </button>
          <button class="cms-item" data-mode="constellations">
            <span class="cms-i">⭐</span>
            <span class="cms-n">星座オーバーレイ</span>
            <span class="cms-d">オリオン・北斗七星など</span>
          </button>
          <button class="cms-item" data-mode="tour">
            <span class="cms-i">🎬</span>
            <span class="cms-n">惑星ツアー</span>
            <span class="cms-d">全惑星を自動巡回</span>
          </button>
          <button class="cms-item" data-mode="real">
            <span class="cms-i">🪄</span>
            <span class="cms-n">実寸モード</span>
            <span class="cms-d">ガス惑星がドーンと大きく</span>
          </button>
          <button class="cms-item" data-mode="ijin">
            <span class="cms-i">👤</span>
            <span class="cms-n">偉人の星座</span>
            <span class="cms-d">科学者5人の思想の連鎖</span>
          </button>
          <button class="cms-item" data-mode="meditate">
            <span class="cms-i">🧘</span>
            <span class="cms-n">瞑想モード</span>
            <span class="cms-d">時間が遅く、宇宙が呼吸</span>
          </button>
          <button class="cms-item" data-mode="wish">
            <span class="cms-i">🌠</span>
            <span class="cms-n">願い星モード</span>
            <span class="cms-d">空をタップして願いを星に</span>
          </button>
          <button class="cms-item" data-mode="matryoshka">
            <span class="cms-i">🪆</span>
            <span class="cms-n">マトリョーシカ</span>
            <span class="cms-d">宇宙→素粒子→意識→宇宙</span>
          </button>
          <button class="cms-item" data-mode="truth">
            <span class="cms-i">✒️</span>
            <span class="cms-n">我が真理</span>
            <span class="cms-d">あなたの真理を宇宙に刻む</span>
          </button>
          <button class="cms-item" data-mode="prince">
            <span class="cms-i">🌹</span>
            <span class="cms-n">星の王子様</span>
            <span class="cms-d">B-612と小さな星たち</span>
          </button>
        </div>
      </div>
      <!-- 真理ティッカー（上部に緩やかに流れる） -->
      <div class="cosmos-truth-ticker" id="cosmosTruthTicker"></div>
      <!-- 真理入力ダイアログ -->
      <div class="cosmos-truth-dialog" id="cosmosTruthDialog">
        <div class="ctd-inner">
          <div class="ctd-title">✒️ この世の真理</div>
          <div class="ctd-sub">あなたの気づきを宇宙に刻む</div>
          <textarea id="ctdInput" maxlength="80" placeholder="真理は、一行に宿る..."></textarea>
          <div class="ctd-saved-label" id="ctdSavedLabel"></div>
          <div class="ctd-saved" id="ctdSaved"></div>
          <div class="ctd-buttons">
            <button id="ctdCancel" class="ctd-btn ctd-cancel">閉じる</button>
            <button id="ctdSave" class="ctd-btn ctd-save">宇宙に刻む ✨</button>
          </div>
        </div>
      </div>
      <div class="cosmos-matryoshka" id="cosmosMatryoshka">
        <button class="cmy-close" id="cmyClose" aria-label="閉じる">×</button>
        <div class="cmy-frame">
          <div class="cmy-icon" id="cmyIcon">🌌</div>
          <div class="cmy-level" id="cmyLevel">1 / 14</div>
          <div class="cmy-name" id="cmyName">多元宇宙</div>
          <div class="cmy-scale" id="cmyScale">10^? m</div>
          <div class="cmy-quote" id="cmyQuote">「世界は一つとは限らない」</div>
          <div class="cmy-who" id="cmyWho">— ヒュー・エヴェレット</div>
        </div>
        <div class="cmy-controls">
          <button class="cmy-nav" id="cmyZoomOut" aria-label="外へ">◀ 外へ</button>
          <button class="cmy-nav cmy-dive" id="cmyZoomIn" aria-label="中へ">中へ ▶</button>
        </div>
        <div class="cmy-track">
          <div class="cmy-dots" id="cmyDots"></div>
        </div>
        <div class="cmy-hint">世の中はマトリョーシカ。中にも、外にも、同じ構造が繰り返す。</div>
      </div>
      <div class="cosmos-wish-dialog" id="cosmosWishDialog">
        <div class="cwd-inner">
          <div class="cwd-title">🌠 願いを込める</div>
          <div class="cwd-sub">宇宙はあなたの意識で形づくられる</div>
          <textarea id="cwdInput" maxlength="60" placeholder="この星に込める願い…"></textarea>
          <div class="cwd-buttons">
            <button id="cwdCancel" class="cwd-btn cwd-cancel">やめる</button>
            <button id="cwdSave" class="cwd-btn cwd-save">星にする ✨</button>
          </div>
        </div>
      </div>
      <div class="cosmos-event-banner" id="cosmosEventBanner"></div>
      <div class="cosmos-rocket-ui" id="cosmosRocketUI">
        <div class="cosmos-crosshair"></div>
        <div class="cosmos-speedlines" id="cosmosSpeedLines"></div>
        <div class="cosmos-scoreboard" id="cosmosScore">
          <div class="sb-item"><span class="sb-ico">💎</span><b id="sbStars">0</b><span class="sb-max">/30</span></div>
          <div class="sb-item"><span class="sb-ico">🪐</span><b id="sbPlanets">0</b><span class="sb-max">/9</span></div>
          <div class="sb-item sb-combo" id="sbCombo" style="display:none"><span class="sb-ico">🔥</span><b id="sbComboN">0</b>×</div>
        </div>
        <div class="cosmos-boost-gauge" id="cosmosBoostGauge">
          <div class="bg-label">BOOST</div>
          <div class="bg-bar"><div class="bg-fill" id="bgFill"></div></div>
        </div>
        <div class="cosmos-compass" id="cosmosCompass"><div class="cp-arrow">▲</div></div>
        <div class="cosmos-arrive-popup" id="cosmosArrivePopup"></div>
        <div class="cosmos-collect-pop" id="cosmosCollectPop"></div>
        <div class="cosmos-sat-hud" id="cosmosSatHud"></div>
        <div class="cosmos-rocket-readout" id="cosmosRocketReadout">
          <div class="rc-line"><span>TARGET</span><b id="rcTarget">—</b></div>
          <div class="rc-line"><span>DIST</span><b id="rcDist">—</b></div>
          <div class="rc-line"><span>SPD</span><b id="rcSpd">0.00</b></div>
        </div>
        <div class="cosmos-dpad" id="cosmosDpad">
          <button class="dp dp-up"    data-dpad="up"    aria-label="上">▲</button>
          <button class="dp dp-left"  data-dpad="left"  aria-label="左">◀</button>
          <button class="dp dp-right" data-dpad="right" aria-label="右">▶</button>
          <button class="dp dp-down"  data-dpad="down"  aria-label="下">▼</button>
          <div class="dp-center"></div>
        </div>
        <div class="cosmos-rocket-actions">
          <button class="cosmos-boost-btn" id="cosmosBoost" aria-label="加速">BOOST</button>
          <button class="cosmos-brake-btn" id="cosmosBrake" aria-label="ブレーキ">BRAKE</button>
        </div>
      </div>
      <div class="cosmos-info-panel" id="cosmosInfoPanel">
        <button class="cosmos-info-close" aria-label="閉じる">×</button>
        <div class="cosmos-info-content" id="cosmosInfoContent"></div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    const stage = ov.querySelector('#cosmosStage');
    const noise = ov.querySelector('#cosmosNoise');
    const tapBtn = ov.querySelector('#cosmosTap');
    const hud = ov.querySelector('#cosmosHud');
    const consciousLabel = ov.querySelector('#cosmosConsciousLabel');
    // 意識フィールドcanvas: 粒子が衝突せず浮遊
    const ccan = ov.querySelector('#cosmosConsciousCanvas');
    ccan.width = window.innerWidth;
    ccan.height = window.innerHeight;
    Object.assign(ccan.style, { position:'absolute', inset:0, zIndex:7, pointerEvents:'none', transition:'opacity 0.8s ease' });
    const cctx = ccan.getContext('2d');
    const cwX = ccan.width, cwY = ccan.height;
    const consciousParticles = [];
    const PN = 22;
    for (let i = 0; i < PN; i++) {
      consciousParticles.push({
        x: Math.random() * cwX,
        y: Math.random() * cwY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 3 + Math.random() * 4,
        hue: 250 + Math.random() * 40,
      });
    }
    let consciousRAF = 0;
    let consciousConnecting = false; // タップ後、中心に集まるフラグ
    function drawConscious() {
      cctx.clearRect(0, 0, cwX, cwY);
      const cx = cwX / 2, cy = cwY / 2;
      // 衝突回避：粒子同士で反発力
      for (let i = 0; i < consciousParticles.length; i++) {
        const a = consciousParticles[i];
        for (let j = i + 1; j < consciousParticles.length; j++) {
          const b = consciousParticles[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const minDist = 90;
          if (dist < minDist && dist > 0.01) {
            const push = (minDist - dist) / minDist * 0.08;
            const nx = dx / dist, ny = dy / dist;
            a.vx -= nx * push; a.vy -= ny * push;
            b.vx += nx * push; b.vy += ny * push;
          }
        }
      }
      // 更新＆描画
      consciousParticles.forEach(p => {
        if (consciousConnecting) {
          // 中心にスムーズに吸い込まれる
          const dx = cx - p.x, dy = cy - p.y;
          p.vx += dx * 0.003; p.vy += dy * 0.003;
          p.vx *= 0.94; p.vy *= 0.94;
        } else {
          // 境界ソフトバウンス
          if (p.x < 40) p.vx += 0.005;
          if (p.x > cwX - 40) p.vx -= 0.005;
          if (p.y < 40) p.vy += 0.005;
          if (p.y > cwY - 40) p.vy -= 0.005;
          p.vx *= 0.995; p.vy *= 0.995;
        }
        p.x += p.vx; p.y += p.vy;
      });
      // 粒子間の細い線（距離に応じて）
      cctx.lineWidth = 0.5;
      for (let i = 0; i < consciousParticles.length; i++) {
        for (let j = i + 1; j < consciousParticles.length; j++) {
          const a = consciousParticles[i], b = consciousParticles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const thresh = consciousConnecting ? 320 : 150;
          if (d < thresh) {
            const alpha = (1 - d / thresh) * (consciousConnecting ? 0.6 : 0.18);
            cctx.strokeStyle = `rgba(200,180,255,${alpha.toFixed(3)})`;
            cctx.beginPath();
            cctx.moveTo(a.x, a.y); cctx.lineTo(b.x, b.y);
            cctx.stroke();
          }
        }
      }
      // 粒子描画
      consciousParticles.forEach(p => {
        const grd = cctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grd.addColorStop(0, `hsla(${p.hue},70%,85%,0.85)`);
        grd.addColorStop(1, `hsla(${p.hue},70%,75%,0)`);
        cctx.fillStyle = grd;
        cctx.beginPath();
        cctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        cctx.fill();
      });
      consciousRAF = requestAnimationFrame(drawConscious);
    }
    drawConscious();
    ov.querySelector('.cosmos-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 400);
    });

    const THREE = window.THREE;
    const W = window.innerWidth, H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    // モバイル優先：pixelRatioを1.3でキャップ（描画負荷を約40%削減）
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3));
    renderer.setSize(W, H);
    // Cygamesリスペクト：HDR風トーンマッピング + sRGB出力
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    stage.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W/H, 0.1, 1000);
    camera.position.set(0, 20, 60);
    camera.lookAt(0, 0, 0);

    // ============================================================
    // 🌌 銀河背景（恒星スペクトル色 + 天の川 + 星雲 + 遠方銀河）
    // ============================================================
    // ソフトな円形スプライトテクスチャ（星・星雲共通）
    const softDotTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 64; sc.height = 64;
      const g = sc.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(sc);
    })();

    // 恒星の色（スペクトル型分布に近い重み付け：M/K/G/F/A/B）
    const STAR_PALETTE = [
      [1.00, 0.78, 0.62], // M 赤橙（多い）
      [1.00, 0.78, 0.62],
      [1.00, 0.85, 0.70], // K オレンジ
      [1.00, 0.92, 0.80], // G 黄（太陽型）
      [1.00, 0.98, 0.90], // F 薄黄
      [0.95, 0.96, 1.00], // A 白
      [0.82, 0.88, 1.00], // B 青白（少ない）
    ];
    // 星（背景球面 + 天の川バンド強化）
    const stars = new THREE.BufferGeometry();
    const starCount = 2400;
    const spos = new Float32Array(starCount * 3);
    const scol = new Float32Array(starCount * 3);
    const ssiz = new Float32Array(starCount);
    // 天の川の平面法線（少し傾ける）
    const MW_TILT = 0.55; // 約32度
    for (let i = 0; i < starCount; i++) {
      // 60%は天の川バンドに集中配置、残りは全球面に散布
      const inBand = Math.random() < 0.6;
      const r = 260 + Math.random() * 180;
      let x, y, z;
      if (inBand) {
        const theta = Math.random() * Math.PI * 2;
        // バンド厚さ（薄い）
        const bandY = (Math.random() - 0.5) * 0.18; // 正規化された薄い帯
        x = r * Math.cos(theta);
        z = r * Math.sin(theta);
        y = r * bandY;
        // 傾ける
        const yy = y * Math.cos(MW_TILT) - z * Math.sin(MW_TILT);
        const zz = y * Math.sin(MW_TILT) + z * Math.cos(MW_TILT);
        y = yy; z = zz;
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      }
      spos[i*3] = x; spos[i*3+1] = y; spos[i*3+2] = z;
      // 色：スペクトル分布
      const c = STAR_PALETTE[Math.floor(Math.pow(Math.random(), 1.6) * STAR_PALETTE.length)];
      // 輝度のランダム
      const b = 0.55 + Math.random() * 0.45;
      scol[i*3] = c[0] * b; scol[i*3+1] = c[1] * b; scol[i*3+2] = c[2] * b;
      // サイズ：多くは小、稀に大（明るい恒星）
      ssiz[i] = Math.random() < 0.02 ? 1.6 + Math.random() * 1.4 : 0.35 + Math.random() * 0.55;
    }
    stars.setAttribute('position', new THREE.BufferAttribute(spos, 3));
    stars.setAttribute('color', new THREE.BufferAttribute(scol, 3));
    stars.setAttribute('size', new THREE.BufferAttribute(ssiz, 1));
    // ShaderMaterialで可変サイズ＋ソフト円
    const starsMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: softDotTex }, uOpacity: { value: 0.0 }, uTwinkle: { value: 0.0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * 2.2;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uOpacity;
        uniform float uTwinkle;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          float tw = 0.85 + 0.15 * sin(uTwinkle + vSize * 37.0);
          gl_FragColor = vec4(vColor * tw, t.a * uOpacity);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const starsPoints = new THREE.Points(stars, starsMat);
    scene.add(starsPoints);

    // 天の川の淡いグロー帯（薄い板）
    const mwGlowTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 256;
      const g = sc.getContext('2d');
      // 中心に明るい帯、左右に拡がる塵
      const grd = g.createLinearGradient(0, 0, 0, 256);
      grd.addColorStop(0, 'rgba(20,10,40,0)');
      grd.addColorStop(0.45, 'rgba(180,140,200,0.18)');
      grd.addColorStop(0.5, 'rgba(220,200,255,0.32)');
      grd.addColorStop(0.55, 'rgba(180,140,200,0.18)');
      grd.addColorStop(1, 'rgba(20,10,40,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 1024, 256);
      // ダークダストのムラ
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 1024, y = 100 + Math.random() * 56;
        const r = 20 + Math.random() * 60;
        const gg = g.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, 'rgba(10,5,20,0.45)');
        gg.addColorStop(1, 'rgba(10,5,20,0)');
        g.fillStyle = gg;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
      }
      // 星団の薄いピンク
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * 1024, y = 110 + Math.random() * 36;
        const r = 30 + Math.random() * 50;
        const gg = g.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, 'rgba(255,170,200,0.22)');
        gg.addColorStop(1, 'rgba(255,170,200,0)');
        g.fillStyle = gg;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
      }
      return new THREE.CanvasTexture(sc);
    })();
    const mwGeo = new THREE.CylinderGeometry(420, 420, 120, 40, 1, true);
    const mwMat = new THREE.MeshBasicMaterial({
      map: mwGlowTex, transparent: true, opacity: 0.0,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const milkyWay = new THREE.Mesh(mwGeo, mwMat);
    milkyWay.rotation.z = MW_TILT;
    milkyWay.rotation.x = Math.PI / 2;
    scene.add(milkyWay);

    // 星雲（カラフルなガス雲スプライト）
    function makeNebulaTex(hue1, hue2) {
      const sc = document.createElement('canvas'); sc.width = 512; sc.height = 512;
      const g = sc.getContext('2d');
      // 複数の柔らかいガス雲を重ねる
      for (let i = 0; i < 80; i++) {
        const x = 100 + Math.random() * 312;
        const y = 100 + Math.random() * 312;
        const r = 40 + Math.random() * 120;
        const h = Math.random() < 0.5 ? hue1 : hue2;
        const a = 0.04 + Math.random() * 0.12;
        const gg = g.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, `hsla(${h},85%,68%,${a})`);
        gg.addColorStop(0.4, `hsla(${h},80%,55%,${a*0.5})`);
        gg.addColorStop(1, `hsla(${h},80%,50%,0)`);
        g.fillStyle = gg;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
      }
      // 内部に小さな星
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 120; i++) {
        const x = 100 + Math.random() * 312;
        const y = 100 + Math.random() * 312;
        g.fillStyle = `rgba(255,255,255,${0.3 + Math.random()*0.6})`;
        g.beginPath(); g.arc(x, y, 0.6 + Math.random()*1.2, 0, Math.PI*2); g.fill();
      }
      return new THREE.CanvasTexture(sc);
    }
    const NEBULAE = [
      { tex: makeNebulaTex(330, 280), pos: [-280, 80, -240], size: 220 },  // ピンク/紫（オリオン風）
      { tex: makeNebulaTex(200, 240), pos: [260, -60, -260], size: 260 },  // 青/シアン
      { tex: makeNebulaTex(20, 350),  pos: [-220, -140, 280], size: 200 }, // 赤/マゼンタ
      { tex: makeNebulaTex(280, 210), pos: [240, 140, 240],  size: 240 },  // 紫/青
      { tex: makeNebulaTex(160, 100), pos: [0, 200, -340],   size: 210 },  // 緑/黄（エメラルド星雲）
    ];
    const nebulaMeshes = [];
    NEBULAE.forEach(n => {
      const mat = new THREE.SpriteMaterial({ map: n.tex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(mat);
      sp.position.set(n.pos[0], n.pos[1], n.pos[2]);
      sp.scale.set(n.size, n.size, 1);
      scene.add(sp);
      nebulaMeshes.push(sp);
    });

    // 遠方の小さな銀河（螺旋）
    function makeDistantGalaxyTex(hue) {
      const sc = document.createElement('canvas'); sc.width = 256; sc.height = 256;
      const g = sc.getContext('2d');
      g.translate(128, 128);
      // 中央のバルジ
      const bulge = g.createRadialGradient(0, 0, 0, 0, 0, 30);
      bulge.addColorStop(0, `hsla(${hue},50%,95%,0.95)`);
      bulge.addColorStop(0.5, `hsla(${hue},55%,75%,0.5)`);
      bulge.addColorStop(1, `hsla(${hue},60%,60%,0)`);
      g.fillStyle = bulge;
      g.beginPath(); g.arc(0, 0, 30, 0, Math.PI*2); g.fill();
      // 螺旋腕
      g.globalCompositeOperation = 'lighter';
      for (let arm = 0; arm < 2; arm++) {
        const offset = arm * Math.PI;
        for (let t = 0; t < 60; t++) {
          const a = t * 0.18 + offset;
          const r = t * 1.8;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r * 0.4; // 薄い楕円
          const gg = g.createRadialGradient(x, y, 0, x, y, 12);
          gg.addColorStop(0, `hsla(${hue},70%,80%,0.4)`);
          gg.addColorStop(1, `hsla(${hue},60%,60%,0)`);
          g.fillStyle = gg;
          g.beginPath(); g.arc(x, y, 12, 0, Math.PI*2); g.fill();
        }
      }
      return new THREE.CanvasTexture(sc);
    }
    const distantGalaxies = [];
    for (let i = 0; i < 12; i++) {
      const hue = [210, 260, 30, 340, 200, 50][i % 6];
      const tex = makeDistantGalaxyTex(hue);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(mat);
      const r = 380 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      sp.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
      const s = 30 + Math.random() * 30;
      sp.scale.set(s, s, 1);
      sp.material.rotation = Math.random() * Math.PI;
      scene.add(sp);
      distantGalaxies.push(sp);
    }

    // 宇宙塵（近距離パララックス粒子）
    const dustCount = 400;
    const dustGeo = new THREE.BufferGeometry();
    const dpos = new Float32Array(dustCount * 3);
    const dcol = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 80 + Math.random() * 140;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dpos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      dpos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      dpos[i*3+2] = r * Math.cos(phi);
      const c = [0.8, 0.75, 0.9];
      dcol[i*3] = c[0]; dcol[i*3+1] = c[1]; dcol[i*3+2] = c[2];
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dcol, 3));
    const dustMat = new THREE.PointsMaterial({ size: 0.25, vertexColors: true, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, map: softDotTex });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // ビッグバン用パーティクル
    const bbCount = 1500;
    const bbGeo = new THREE.BufferGeometry();
    const bbPos = new Float32Array(bbCount * 3);
    const bbVel = [];
    for (let i = 0; i < bbCount; i++) {
      bbPos[i*3] = 0; bbPos[i*3+1] = 0; bbPos[i*3+2] = 0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.3 + Math.random() * 1.2;
      bbVel.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed
      });
    }
    bbGeo.setAttribute('position', new THREE.BufferAttribute(bbPos, 3));
    const bbMat = new THREE.PointsMaterial({ size: 0.4, color: 0xffd28a, transparent: true, opacity: 0.9 });
    const bbPoints = new THREE.Points(bbGeo, bbMat);
    bbPoints.visible = false;
    scene.add(bbPoints);

    // 太陽（顆粒模様テクスチャ）
    const sunTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 512; sc.height = 256;
      const sctx = sc.getContext('2d');
      sctx.fillStyle = '#ffdc70';
      sctx.fillRect(0,0,512,256);
      // 顆粒模様
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512, y = Math.random() * 256;
        const r = 5 + Math.random() * 20;
        const alpha = 0.2 + Math.random() * 0.3;
        const grd = sctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, `rgba(255,220,120,${alpha})`);
        grd.addColorStop(0.5, `rgba(255,170,80,${alpha*0.7})`);
        grd.addColorStop(1, 'rgba(255,170,80,0)');
        sctx.fillStyle = grd;
        sctx.beginPath();
        sctx.arc(x, y, r, 0, Math.PI * 2);
        sctx.fill();
      }
      // 黒点
      for (let i = 0; i < 8; i++) {
        sctx.fillStyle = 'rgba(120,60,20,0.7)';
        sctx.beginPath();
        sctx.ellipse(Math.random() * 512, Math.random() * 256, 4 + Math.random() * 8, 3 + Math.random() * 5, 0, 0, Math.PI * 2);
        sctx.fill();
      }
      return new THREE.CanvasTexture(sc);
    })();
    const sunGeo = new THREE.SphereGeometry(3.5, 48, 32);
    // ☀️ 実写太陽テクスチャ（非同期で procedural を差し替え）
    const sunUniform = { value: sunTex };
    const _sunLoader = new THREE.TextureLoader();
    _sunLoader.crossOrigin = 'anonymous';
    _sunLoader.load('https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
      (tex) => { tex.anisotropy = 8; sunUniform.value = tex; sunMat.needsUpdate = true; },
      undefined, () => {});
    // ☀️ アニメーションするプラズマ表面シェーダ
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: sunUniform,
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uMap;
        varying vec2 vUv;
        void main() {
          // テクスチャをわずかにドリフト（顆粒が流れる見た目）
          vec2 uv1 = vUv + vec2(uTime * 0.0015, 0.0);
          vec2 uv2 = vUv * 1.03 + vec2(-uTime * 0.0009, uTime * 0.0006);
          vec3 a = texture2D(uMap, uv1).rgb;
          vec3 b = texture2D(uMap, uv2).rgb;
          vec3 col = mix(a, b, 0.5) * 1.05;
          float pulse = 1.0 + 0.08 * sin(uTime * 0.8);
          gl_FragColor = vec4(col * pulse, 1.0);
        }
      `,
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.visible = false;
    scene.add(sun);

    // 🔥 彩層（薄い赤いリング、太陽表面のすぐ外）
    const chromoGeo = new THREE.SphereGeometry(3.58, 24, 16);
    const chromoMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vView;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vN;
        varying vec3 vView;
        void main() {
          float rim = 1.0 - max(0.0, dot(vN, vView));
          rim = pow(rim, 3.0);
          // 赤〜橙
          vec3 col = mix(vec3(1.0, 0.45, 0.15), vec3(1.0, 0.8, 0.3), rim);
          float flicker = 0.9 + 0.1 * sin(uTime * 1.5);
          gl_FragColor = vec4(col, rim * 0.85 * flicker);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending,
    });
    const chromosphere = new THREE.Mesh(chromoGeo, chromoMat);
    chromosphere.visible = false;
    scene.add(chromosphere);

    // 多層コロナ（内/外）
    const coronaGeo1 = new THREE.SphereGeometry(4.2, 24, 16);
    const coronaMat1 = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vN; varying vec3 vView;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vN; varying vec3 vView;
        void main() {
          float rim = 1.0 - max(0.0, dot(vN, vView));
          rim = pow(rim, 2.2);
          vec3 col = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.85, 0.4), rim);
          float breathe = 0.85 + 0.15 * sin(uTime * 0.7);
          gl_FragColor = vec4(col, rim * 0.55 * breathe);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    });
    const corona1 = new THREE.Mesh(coronaGeo1, coronaMat1);
    corona1.visible = false;
    scene.add(corona1);
    const coronaGeo = new THREE.SphereGeometry(6.0, 24, 16);
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vN; varying vec3 vView;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vN; varying vec3 vView;
        void main() {
          float rim = 1.0 - max(0.0, dot(vN, vView));
          rim = pow(rim, 3.5);
          vec3 col = vec3(1.0, 0.6, 0.25);
          float breathe = 0.75 + 0.25 * sin(uTime * 0.5);
          gl_FragColor = vec4(col, rim * 0.4 * breathe);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    corona.visible = false;
    scene.add(corona);
    // タップ用に sun に facts を付与
    sun.userData = {
      name: '太陽', jname: '太陽',
      facts: {
        diameter: '1,392,700 km (地球の約109倍)',
        distance: '中心まで1AU（地球から光で8分19秒）',
        period: '自転25-35日（赤道と極で異なる差動回転）',
        temp: '表面5,500℃ / 中心1,500万℃',
        moons: '衛星なし（惑星8個と小惑星を従える恒星）',
        nasa: 'Parker Solar Probeが2018年から観測中（コロナに最接近）、JAXA/ESAのSolarOrbiterも観測。',
        trivia: '太陽系全質量の99.86%を占めるG型主系列星。あと約50億年は水素核融合を続ける。'
      }
    };

    // ☀️ 太陽光（PointLight）＋ 非常に弱いアンビエントで陰影コントラスト
    const sunLight = new THREE.PointLight(0xfff2d8, 2.2, 200, 1.2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x2a2035, 0.28));

    // 太陽レンズグロー（すべて円対称で「いびつ」にならない造形）
    const sunGlowTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 1024;
      const g = sc.getContext('2d');
      // 二段の放射状グロー（内側 明るいコア / 外側 拡散）
      const grdInner = g.createRadialGradient(512, 512, 0, 512, 512, 300);
      grdInner.addColorStop(0,   'rgba(255,248,210,0.95)');
      grdInner.addColorStop(0.08,'rgba(255,230,170,0.8)');
      grdInner.addColorStop(0.25,'rgba(255,190,110,0.35)');
      grdInner.addColorStop(0.55,'rgba(255,140,70,0.1)');
      grdInner.addColorStop(1,   'rgba(255,100,40,0)');
      g.fillStyle = grdInner; g.fillRect(0, 0, 1024, 1024);
      // もう一段外側の拡散ハロ
      const grdOuter = g.createRadialGradient(512, 512, 200, 512, 512, 512);
      grdOuter.addColorStop(0,   'rgba(255,180,100,0.25)');
      grdOuter.addColorStop(0.5, 'rgba(255,140,70,0.08)');
      grdOuter.addColorStop(1,   'rgba(255,120,50,0)');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = grdOuter; g.fillRect(0, 0, 1024, 1024);
      // 極細・多数の光条（48本）を薄く＆放射対称に
      for (let i = 0; i < 48; i++) {
        const ang = (i / 48) * Math.PI * 2;
        const gg = g.createLinearGradient(512, 512, 512 + Math.cos(ang)*512, 512 + Math.sin(ang)*512);
        const alpha = 0.06 + (i % 4 === 0 ? 0.08 : 0);
        gg.addColorStop(0, `rgba(255,240,180,${alpha})`);
        gg.addColorStop(1, 'rgba(255,180,100,0)');
        g.save();
        g.translate(512, 512);
        g.rotate(ang);
        g.fillStyle = gg;
        g.fillRect(-1.2, 0, 2.4, 512);
        g.restore();
      }
      const t = new THREE.CanvasTexture(sc);
      t.anisotropy = 8;
      return t;
    })();
    const sunGlowMat = new THREE.SpriteMaterial({ map: sunGlowTex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
    const sunGlow = new THREE.Sprite(sunGlowMat);
    sunGlow.scale.set(16, 16, 1);
    sunGlow.position.set(0, 0, 0);
    scene.add(sunGlow);

    // 惑星データ（距離, サイズ, 色, 教育情報）
    const PLANETS = [
      {
        name: '水星', jname: '水星', dist: 7, size: 0.5, color: 0xa89080, speed: 0.015,
        facts: {
          diameter: '4,880 km (地球の約38%)',
          distance: '太陽から約5,790万km (0.39天文単位、光で3分)',
          period: '公転88日 / 自転59日',
          temp: '昼430℃ / 夜-180℃（大気がほぼ無い）',
          moons: '衛星なし',
          nasa: 'NASA探査機MESSENGERが2011-2015年に周回観測。BepiColombo（JAXA/ESA）が2025年到達予定。',
          trivia: '太陽系で最も小さい惑星。表面はクレーターだらけで月に似ている。'
        }
      },
      {
        name: '金星', jname: '金星', dist: 10, size: 0.9, color: 0xe8c078, speed: 0.012,
        facts: {
          diameter: '12,104 km (地球の約95%)',
          distance: '太陽から約1.08億km (0.72AU、光で6分)',
          period: '公転225日 / 自転243日（逆回転！）',
          temp: '表面約460℃ — 水星より暑い',
          moons: '衛星なし',
          nasa: '厚い二酸化炭素の雲で覆われ、気圧は地球の92倍。温室効果の極端な例として研究対象。',
          trivia: '夜空で最も明るい惑星（金星の太白）。日本でも古代から愛される。'
        }
      },
      {
        name: '地球', jname: '地球', dist: 14, size: 1.0, color: 0x4a7fb8, speed: 0.010, isEarth: true,
        facts: {
          diameter: '12,742 km',
          distance: '太陽から約1.496億km (1AU、光で8分)',
          period: '公転365.25日 / 自転24時間',
          temp: '平均15℃（液体の水が存在する唯一の惑星）',
          moons: '月（直径3,474km）',
          nasa: '現在観測された唯一の生命存在惑星。NASAのEarth Observatoryが気候変動を常時監視。',
          trivia: '190人以上の偉人が生まれ、歴史を紡いだ青い惑星。'
        }
      },
      {
        name: '火星', jname: '火星', dist: 18, size: 0.7, color: 0xc87040, speed: 0.008,
        facts: {
          diameter: '6,779 km (地球の53%)',
          distance: '太陽から約2.28億km (1.52AU、光で13分)',
          period: '公転687日 / 自転24.6時間（地球と似る）',
          temp: '平均-63℃',
          moons: 'フォボスとダイモス（2つの小衛星）',
          nasa: 'Perseverance（2021-）と Curiosity（2012-）が地表で活動中。火星サンプルリターン計画進行中。',
          trivia: 'オリンポス山は標高約21,230m（太陽系最大の火山、エベレストの2.4倍）。'
        }
      },
      {
        name: '木星', jname: '木星', dist: 24, size: 2.2, color: 0xd8b088, speed: 0.005,
        facts: {
          diameter: '139,820 km (地球の11倍、全惑星質量の2/3)',
          distance: '太陽から約7.78億km (5.2AU、光で43分)',
          period: '公転11.86年 / 自転9.9時間（最速！）',
          temp: '上層-110℃（ガス惑星）',
          moons: '95個以上（ガリレオ衛星: イオ・エウロパ・ガニメデ・カリスト）',
          nasa: 'Juno探査機が2016年から周回観測中。エウロパには氷の下に海がある可能性。',
          trivia: '大赤斑は350年以上続く巨大嵐（地球が2個入るサイズ）。'
        }
      },
      {
        name: '土星', jname: '土星', dist: 30, size: 1.9, color: 0xe0c890, speed: 0.004, hasRing: true,
        facts: {
          diameter: '116,460 km',
          distance: '太陽から約14.33億km (9.54AU、光で79分)',
          period: '公転29.5年 / 自転10.7時間',
          temp: '上層-140℃',
          moons: '146個以上（タイタンは大気を持つ唯一の衛星）',
          nasa: 'Cassini探査機が2004-2017年に観測。北極の六角形模様は謎のまま。',
          trivia: 'リングは氷の粒子でできており、厚さはわずか10-20m程度。'
        }
      },
      {
        name: '天王星', jname: '天王星', dist: 36, size: 1.3, color: 0x9fd0d8, speed: 0.003,
        facts: {
          diameter: '50,724 km',
          distance: '太陽から約28.7億km (19.2AU、光で2.6時間)',
          period: '公転84年 / 自転17時間',
          temp: '上層-224℃（太陽系最低）',
          moons: '27個（ミランダ、アリエル等）',
          nasa: 'Voyager 2が1986年に唯一フライバイ観測。次の探査機計画が2030年代に。',
          trivia: '自転軸が98°倒れており、ほぼ横倒しで太陽を公転する変わり者。'
        }
      },
      {
        name: '海王星', jname: '海王星', dist: 42, size: 1.3, color: 0x5080c8, speed: 0.002,
        facts: {
          diameter: '49,244 km',
          distance: '太陽から約44.95億km (30.1AU、光で4.2時間)',
          period: '公転165年 / 自転16時間',
          temp: '上層-214℃',
          moons: '14個（トリトンは逆行軌道で独特）',
          nasa: 'Voyager 2が1989年にフライバイ観測。大暗斑を発見。',
          trivia: '最速風速は時速2,100km（太陽系最強の嵐）。'
        }
      },
      {
        name: 'ブラックホール', jname: 'いて座A*', dist: 70, size: 1.8, color: 0x000000, speed: 0, isBlackHole: true,
        facts: {
          diameter: '事象の地平線 直径約2,400万km (太陽の17倍)',
          distance: '地球から約2万6,000光年（天の川銀河の中心）',
          period: '恒星S2の公転周期は16年',
          temp: '降着円盤は数百万℃に達する',
          moons: '周囲を多数の星が高速公転',
          nasa: 'Event Horizon Telescopeが2022年に初撮影公開。M87銀河のブラックホール画像もこのチーム。',
          trivia: '質量は太陽の約400万倍。光すら脱出不可。ホーキング放射により微量に蒸発する。'
        }
      }
    ];
    // 惑星の手描きテクスチャ生成（惑星ごとに特徴ある柄）
    function makePlanetTexture(p) {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 256;
      const cx = c.getContext('2d');
      // ベースカラー
      const toHex = n => '#' + n.toString(16).padStart(6,'0');
      cx.fillStyle = toHex(p.color);
      cx.fillRect(0, 0, c.width, c.height);
      // 惑星ごとの柄
      if (p.name === '地球') {
        // 高解像度地球マップ（簡易大陸シルエット + 海深度グラデ）
        c.width = 1024; c.height = 512;
        // 海: 緯度で深さグラデ（赤道は明るい青、極付近は暗い）
        const seaGrad = cx.createLinearGradient(0, 0, 0, c.height);
        seaGrad.addColorStop(0, '#0d2b4e');
        seaGrad.addColorStop(0.2, '#1a4a7a');
        seaGrad.addColorStop(0.5, '#2a6ca8');
        seaGrad.addColorStop(0.8, '#1a4a7a');
        seaGrad.addColorStop(1, '#0d2b4e');
        cx.fillStyle = seaGrad;
        cx.fillRect(0, 0, c.width, c.height);
        // 大陸シルエット（経度0-360°を x=0-1024 にマッピング。簡略化した主要大陸）
        const drawLand = (points) => {
          cx.beginPath();
          cx.moveTo(points[0][0], points[0][1]);
          for (let i = 1; i < points.length; i++) cx.lineTo(points[i][0], points[i][1]);
          cx.closePath();
          cx.fill();
        };
        // 陸地の基本色（緑）
        const landGrad = cx.createRadialGradient(c.width/2, c.height/2, 0, c.width/2, c.height/2, c.width/2);
        landGrad.addColorStop(0, '#3f7a44');
        landGrad.addColorStop(1, '#2d5a3c');
        // ユーラシア大陸（大きく横に）
        cx.fillStyle = '#3a6b3e';
        drawLand([[510,140],[560,120],[640,120],[720,130],[800,140],[860,160],[900,180],[920,210],[900,230],[860,240],[820,250],[760,245],[700,240],[640,230],[580,220],[540,210],[510,180]]);
        // ヨーロッパ
        drawLand([[470,140],[510,135],[520,160],[510,190],[490,200],[470,195],[455,180],[450,160]]);
        // アフリカ（縦に長い）
        cx.fillStyle = '#4a7a3f';
        drawLand([[470,210],[510,205],[530,240],[540,290],[535,340],[510,380],[490,390],[470,380],[460,340],[460,280],[465,230]]);
        // 北アメリカ
        cx.fillStyle = '#3a6b4e';
        drawLand([[140,100],[200,90],[260,100],[310,120],[340,150],[340,180],[320,210],[290,230],[260,240],[230,240],[200,230],[170,210],[150,180],[140,150]]);
        // 南アメリカ
        cx.fillStyle = '#4a7a3f';
        drawLand([[280,260],[310,265],[330,300],[335,360],[320,420],[300,460],[280,455],[270,420],[275,370],[275,310]]);
        // オーストラリア
        cx.fillStyle = '#7a6838';
        drawLand([[790,340],[860,345],[900,360],[890,395],[850,405],[810,400],[790,380]]);
        // 南極大陸（下部一帯）
        cx.fillStyle = '#e6eef4';
        cx.fillRect(0, 470, c.width, 42);
        // 北極（上部氷）
        cx.fillStyle = '#d8e4ec';
        cx.fillRect(0, 0, c.width, 28);
        // 山岳（暗めの斑点）
        cx.fillStyle = 'rgba(60,40,30,0.35)';
        for (let i = 0; i < 40; i++) {
          cx.beginPath();
          cx.arc(100 + Math.random() * 800, 100 + Math.random() * 300, 2 + Math.random() * 4, 0, Math.PI * 2);
          cx.fill();
        }
        // 雲層（薄く、自然な分布）
        cx.globalAlpha = 1;
        cx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < 50; i++) {
          cx.beginPath();
          cx.ellipse(Math.random() * c.width, 40 + Math.random() * (c.height - 80), 30 + Math.random() * 80, 6 + Math.random() * 14, Math.random() * Math.PI * 0.2, 0, Math.PI * 2);
          cx.fill();
        }
      } else if (p.name === '木星') {
        c.width = 1024; c.height = 512;
        // 複数の茶色〜黄色系のベルト
        const bands = [
          { y: 0, h: 0.05, color: '#c9a375' },
          { y: 0.05, h: 0.06, color: '#d8b88a' },
          { y: 0.11, h: 0.07, color: '#a88868' },
          { y: 0.18, h: 0.08, color: '#e0c798' },
          { y: 0.26, h: 0.10, color: '#c09878' },
          { y: 0.36, h: 0.08, color: '#e8d8aa' },
          { y: 0.44, h: 0.06, color: '#b88860' },
          { y: 0.50, h: 0.08, color: '#d8b488' },
          { y: 0.58, h: 0.10, color: '#c09878' },
          { y: 0.68, h: 0.08, color: '#e0c798' },
          { y: 0.76, h: 0.07, color: '#a88868' },
          { y: 0.83, h: 0.06, color: '#d8b88a' },
          { y: 0.89, h: 0.05, color: '#c9a375' },
          { y: 0.94, h: 0.06, color: '#b89868' }
        ];
        bands.forEach(b => {
          cx.fillStyle = b.color;
          cx.fillRect(0, b.y * c.height, c.width, b.h * c.height);
          // 乱流（渦巻き）
          cx.globalAlpha = 0.25;
          for (let i = 0; i < 8; i++) {
            cx.fillStyle = 'rgba(120,80,50,0.5)';
            cx.beginPath();
            cx.ellipse(Math.random() * c.width, (b.y + b.h/2) * c.height, 40 + Math.random() * 80, b.h * c.height * 0.35, 0, 0, Math.PI * 2);
            cx.fill();
          }
          cx.globalAlpha = 1;
        });
        // 大赤斑
        cx.save();
        const gr = cx.createRadialGradient(c.width * 0.35, c.height * 0.6, 0, c.width * 0.35, c.height * 0.6, 70);
        gr.addColorStop(0, '#c84030');
        gr.addColorStop(0.5, '#a03020');
        gr.addColorStop(1, 'rgba(160,48,32,0)');
        cx.fillStyle = gr;
        cx.beginPath();
        cx.ellipse(c.width * 0.35, c.height * 0.6, 70, 28, 0, 0, Math.PI * 2);
        cx.fill();
        cx.restore();
      } else if (p.name === '土星') {
        c.width = 1024; c.height = 512;
        // 淡い黄色の縞
        const bands = [
          { y: 0, h: 0.08, color: '#e8d8a8' },
          { y: 0.08, h: 0.10, color: '#d8c898' },
          { y: 0.18, h: 0.12, color: '#f0e0b0' },
          { y: 0.30, h: 0.10, color: '#e0c890' },
          { y: 0.40, h: 0.20, color: '#f5e8c0' },
          { y: 0.60, h: 0.10, color: '#e0c890' },
          { y: 0.70, h: 0.12, color: '#d8c898' },
          { y: 0.82, h: 0.10, color: '#c8b888' },
          { y: 0.92, h: 0.08, color: '#b8a878' }
        ];
        bands.forEach(b => {
          cx.fillStyle = b.color;
          cx.fillRect(0, b.y * c.height, c.width, b.h * c.height);
        });
        // 北極の六角形パターン（ヘキサゴン）
        cx.strokeStyle = 'rgba(120,90,50,0.4)';
        cx.lineWidth = 2;
        cx.beginPath();
        const hcx = c.width * 0.5, hcy = c.height * 0.12, hr = 30;
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) cx.moveTo(hcx + Math.cos(a) * hr, hcy + Math.sin(a) * hr);
          else cx.lineTo(hcx + Math.cos(a) * hr, hcy + Math.sin(a) * hr);
        }
        cx.stroke();
      } else if (p.name === '火星') {
        c.width = 1024; c.height = 512;
        // 赤い砂漠 + グラデ（西部は暗く、東部は明るく）
        const grd = cx.createLinearGradient(0, 0, c.width, 0);
        grd.addColorStop(0, '#a03818');
        grd.addColorStop(0.5, '#c85030');
        grd.addColorStop(1, '#9a3818');
        cx.fillStyle = grd;
        cx.fillRect(0, 0, c.width, c.height);
        // 峡谷（マリネリス峡谷を暗い線で表現）
        cx.fillStyle = 'rgba(40,15,5,0.7)';
        cx.fillRect(c.width * 0.35, c.height * 0.48, c.width * 0.35, 8);
        // オリンポス山（大きな明るいスポット）
        const og = cx.createRadialGradient(c.width * 0.25, c.height * 0.40, 0, c.width * 0.25, c.height * 0.40, 50);
        og.addColorStop(0, '#e88858');
        og.addColorStop(1, 'rgba(232,136,88,0)');
        cx.fillStyle = og;
        cx.beginPath();
        cx.arc(c.width * 0.25, c.height * 0.40, 50, 0, Math.PI * 2);
        cx.fill();
        // クレーター（多数の小さい暗い丸）
        for (let i = 0; i < 80; i++) {
          cx.fillStyle = `rgba(60,20,10,${0.3 + Math.random() * 0.3})`;
          cx.beginPath();
          cx.arc(Math.random() * c.width, Math.random() * c.height, 3 + Math.random() * 20, 0, Math.PI * 2);
          cx.fill();
        }
        // 極冠
        cx.fillStyle = 'rgba(248,240,220,0.92)';
        cx.fillRect(0, 0, c.width, 32);
        cx.fillRect(0, c.height - 32, c.width, 32);
      } else if (p.name === '金星') {
        c.width = 1024; c.height = 512;
        cx.fillStyle = '#c8944c';
        cx.fillRect(0, 0, c.width, c.height);
        // 渦巻く雲層
        for (let i = 0; i < 80; i++) {
          const alpha = 0.1 + Math.random() * 0.25;
          cx.fillStyle = `rgba(255,220,140,${alpha})`;
          cx.beginPath();
          cx.ellipse(Math.random() * c.width, Math.random() * c.height, 50 + Math.random() * 120, 8 + Math.random() * 20, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
          cx.fill();
        }
        // 影の縞
        for (let i = 0; i < 40; i++) {
          cx.fillStyle = `rgba(100,60,20,${0.08 + Math.random() * 0.12})`;
          cx.beginPath();
          cx.ellipse(Math.random() * c.width, Math.random() * c.height, 60 + Math.random() * 100, 4 + Math.random() * 10, 0, 0, Math.PI * 2);
          cx.fill();
        }
      } else if (p.name === '水星') {
        c.width = 1024; c.height = 512;
        // 灰色グラデ
        const grd = cx.createLinearGradient(0, 0, 0, c.height);
        grd.addColorStop(0, '#a89888');
        grd.addColorStop(0.5, '#887868');
        grd.addColorStop(1, '#785858');
        cx.fillStyle = grd;
        cx.fillRect(0, 0, c.width, c.height);
        // カロリス盆地（巨大クレーター）
        const cgrd = cx.createRadialGradient(c.width * 0.25, c.height * 0.4, 0, c.width * 0.25, c.height * 0.4, 90);
        cgrd.addColorStop(0, '#584838');
        cgrd.addColorStop(1, 'rgba(88,72,56,0)');
        cx.fillStyle = cgrd;
        cx.beginPath();
        cx.arc(c.width * 0.25, c.height * 0.4, 90, 0, Math.PI * 2);
        cx.fill();
        // 無数の小クレーター
        for (let i = 0; i < 200; i++) {
          const r = 2 + Math.random() * 20;
          cx.fillStyle = `rgba(40,30,20,${0.3 + Math.random() * 0.4})`;
          cx.beginPath();
          cx.arc(Math.random() * c.width, Math.random() * c.height, r, 0, Math.PI * 2);
          cx.fill();
          // クレーター縁の明るい部分
          if (r > 6) {
            cx.strokeStyle = 'rgba(200,180,160,0.25)';
            cx.lineWidth = 1;
            cx.stroke();
          }
        }
      } else if (p.name === '天王星' || p.name === '海王星') {
        c.width = 1024; c.height = 512;
        const isUranus = p.name === '天王星';
        const grd = cx.createLinearGradient(0, 0, 0, c.height);
        if (isUranus) {
          grd.addColorStop(0, '#9fe0e8');
          grd.addColorStop(0.5, '#a8d8e0');
          grd.addColorStop(1, '#6ab5c0');
        } else {
          grd.addColorStop(0, '#5080c8');
          grd.addColorStop(0.5, '#4070b8');
          grd.addColorStop(1, '#2858a0');
        }
        cx.fillStyle = grd;
        cx.fillRect(0, 0, c.width, c.height);
        // 細い雲の帯
        for (let i = 0; i < 20; i++) {
          cx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`;
          cx.beginPath();
          cx.ellipse(Math.random() * c.width, Math.random() * c.height, 80 + Math.random() * 120, 4 + Math.random() * 8, 0, 0, Math.PI * 2);
          cx.fill();
        }
        // 海王星の大暗斑
        if (!isUranus) {
          cx.fillStyle = 'rgba(20,40,80,0.7)';
          cx.beginPath();
          cx.ellipse(c.width * 0.4, c.height * 0.45, 35, 14, 0, 0, Math.PI * 2);
          cx.fill();
        }
      } else if (p.name === 'ブラックホール') {
        // 完全な黒 + 降着円盤の色
        c.width = 512; c.height = 256;
        cx.fillStyle = '#000';
        cx.fillRect(0, 0, c.width, c.height);
        // 赤いホットスポット
        cx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 50; i++) {
          cx.fillStyle = `rgba(${200 + Math.random()*55},${100 + Math.random()*50},${Math.random()*30},${0.1 + Math.random()*0.2})`;
          cx.beginPath();
          cx.arc(Math.random() * c.width, Math.random() * c.height, 5 + Math.random() * 20, 0, Math.PI * 2);
          cx.fill();
        }
        cx.globalCompositeOperation = 'source-over';
      }
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      return tex;
    }

    // 軸傾き（実測値・ラジアン）
    const AXIAL_TILT = {
      '水星': 0.03, '金星': 3.10, '地球': 0.41, '火星': 0.44,
      '木星': 0.05, '土星': 0.47, '天王星': 1.71, '海王星': 0.49,
      'ブラックホール': 0
    };
    // 🌌 NASA / Solar System Scope 実写テクスチャのURL（CC-BY 4.0）
    const SSS = 'https://www.solarsystemscope.com/textures/download/';
    const PLANET_TEX_URLS = {
      '水星': SSS + '2k_mercury.jpg',
      '金星': SSS + '2k_venus_surface.jpg',
      '地球': SSS + '2k_earth_daymap.jpg',
      '火星': SSS + '2k_mars.jpg',
      '木星': SSS + '2k_jupiter.jpg',
      '土星': SSS + '2k_saturn.jpg',
      '天王星': SSS + '2k_uranus.jpg',
      '海王星': SSS + '2k_neptune.jpg',
    };
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    const planetMeshes = [];
    PLANETS.forEach(p => {
      const pGeo = new THREE.SphereGeometry(p.size, 64, 48); // 解像度UP
      const procTex = makePlanetTexture(p);
      // MeshStandardMaterial で太陽光に反応するように（陰影が自然に）
      const pMat = p.isBlackHole
        ? new THREE.MeshBasicMaterial({ map: procTex })
        : new THREE.MeshStandardMaterial({
            map: procTex,
            emissiveMap: procTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.35,
            roughness: 0.85,
            metalness: 0.0,
          });
      // 実写テクスチャを非同期で差し替え（失敗しても手描きのまま）
      const url = PLANET_TEX_URLS[p.name];
      if (url) {
        textureLoader.load(url, (tex) => {
          tex.anisotropy = 8;
          if (pMat.map && pMat.map !== tex && pMat.map.isCanvasTexture) pMat.map.dispose();
          pMat.map = tex;
          if (pMat.emissiveMap !== undefined) pMat.emissiveMap = tex;
          pMat.needsUpdate = true;
        }, undefined, () => {
          /* CORS失敗でも procTex のまま継続 */
        });
      }
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.visible = false;
      pMesh.userData = { ...p, angle: Math.random() * Math.PI * 2 };
      // 軸傾き適用
      pMesh.rotation.z = AXIAL_TILT[p.name] || 0;
      scene.add(pMesh);
      // 軌道リング
      const orbitGeo = new THREE.RingGeometry(p.dist - 0.02, p.dist + 0.02, 128);
      const orbitMat = new THREE.MeshBasicMaterial({ color: 0x3a4a6a, side: THREE.DoubleSide, transparent: true, opacity: 0 });
      const orbit = new THREE.Mesh(orbitGeo, orbitMat);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
      // 衛星
      const moons = [];
      if (p.isEarth) {
        // 青い大気グロー
        const atmGeo = new THREE.SphereGeometry(p.size * 1.18, 32, 32);
        const atmMat = new THREE.MeshBasicMaterial({ color: 0x6bb0ff, transparent: true, opacity: 0.18, side: THREE.BackSide });
        const atm = new THREE.Mesh(atmGeo, atmMat);
        atm.visible = false;
        scene.add(atm);
        pMesh.userData.atmosphere = atm;
        // 🌙 月（クレーターテクスチャ + 位相シェーダで満ち欠け再現）
        const moonTex = (() => {
          const sc = document.createElement('canvas'); sc.width = 256; sc.height = 128;
          const g = sc.getContext('2d');
          // グレー基色
          const base = g.createLinearGradient(0, 0, 0, 128);
          base.addColorStop(0, '#c8c4c0');
          base.addColorStop(0.5, '#b0aca8');
          base.addColorStop(1, '#908c88');
          g.fillStyle = base; g.fillRect(0, 0, 256, 128);
          // 海（ダークスポット）
          [[80, 45, 18], [120, 60, 22], [150, 55, 14], [95, 80, 12], [170, 75, 16], [60, 65, 10]].forEach(([x, y, r]) => {
            const gr = g.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, 'rgba(70,65,62,0.7)');
            gr.addColorStop(1, 'rgba(70,65,62,0)');
            g.fillStyle = gr;
            g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
          });
          // クレーター
          for (let i = 0; i < 80; i++) {
            const x = Math.random() * 256, y = Math.random() * 128;
            const r = 1.5 + Math.random() * 4;
            g.fillStyle = `rgba(60,55,50,${0.3 + Math.random()*0.3})`;
            g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
            if (r > 2.5) {
              g.strokeStyle = 'rgba(220,215,210,0.25)';
              g.lineWidth = 0.8;
              g.stroke();
            }
          }
          return new THREE.CanvasTexture(sc);
        })();
        const mGeo = new THREE.SphereGeometry(0.28, 32, 24);
        const moonMapUniform = { value: moonTex };
        // 実写月テクスチャを非同期ロード
        textureLoader.load('https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
          (tex) => { tex.anisotropy = 8; moonMapUniform.value = tex; },
          undefined, () => {});
        const mMat = new THREE.ShaderMaterial({
          uniforms: {
            uMap: moonMapUniform,
            uSunPos: { value: new THREE.Vector3(0, 0, 0) },
          },
          vertexShader: `
            varying vec2 vUv;
            varying vec3 vWorld;
            varying vec3 vN;
            void main() {
              vUv = uv;
              vec4 wp = modelMatrix * vec4(position, 1.0);
              vWorld = wp.xyz;
              vN = normalize(mat3(modelMatrix) * normal);
              gl_Position = projectionMatrix * viewMatrix * wp;
            }
          `,
          fragmentShader: `
            uniform sampler2D uMap;
            uniform vec3 uSunPos;
            varying vec2 vUv;
            varying vec3 vWorld;
            varying vec3 vN;
            void main() {
              vec3 tex = texture2D(uMap, vUv).rgb;
              vec3 sd = normalize(uSunPos - vWorld);
              float d = dot(vN, sd);
              // 昼夜境界：日向は明るく、影は夜の青黒
              float lit = smoothstep(-0.08, 0.22, d);
              vec3 night = vec3(0.02, 0.02, 0.04);
              vec3 col = mix(night, tex, lit);
              // 地球照（Earthshine）— 夜側にわずかな青み
              col += vec3(0.015, 0.02, 0.035) * (1.0 - lit) * 0.7;
              gl_FragColor = vec4(col, 1.0);
            }
          `,
        });
        const moon = new THREE.Mesh(mGeo, mMat);
        moon.visible = false;
        scene.add(moon);
        moons.push({ mesh: moon, orbit: 1.8, speed: 12, angle: 0, isMoon: true });

        // 🛰️ 人工衛星（近づくと見える）
        const satellites = [];
        // ISS（国際宇宙ステーション）: 中央モジュール + ソーラーパネル
        const buildISS = () => {
          const g = new THREE.Group();
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.3 }));
          hub.rotation.z = Math.PI / 2;
          g.add(hub);
          // モジュール
          const mod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.025), new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.7, roughness: 0.3 }));
          g.add(mod);
          // ソーラーパネル ×4
          const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a3a7a, metalness: 0.5, roughness: 0.4, emissive: 0x0a1840, emissiveIntensity: 0.3 });
          [[-0.06,0], [0.06,0], [-0.06,0.04], [0.06,0.04], [-0.06,-0.04], [0.06,-0.04]].forEach(([x, z]) => {
            const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.003, 0.022), panelMat);
            p2.position.set(x, 0, z);
            g.add(p2);
          });
          // 点滅ライト
          const blink = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
          blink.position.y = 0.018;
          g.add(blink);
          g.userData.blink = blink;
          g.userData.label = 'ISS';
          return g;
        };
        // ハッブル宇宙望遠鏡: 円筒
        const buildHubble = () => {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 12), new THREE.MeshStandardMaterial({ color: 0xd0cab0, metalness: 0.6, roughness: 0.4 }));
          body.rotation.z = Math.PI / 2;
          g.add(body);
          // 開口部
          const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 12), new THREE.MeshBasicMaterial({ color: 0x101018 }));
          lens.rotation.y = -Math.PI / 2;
          lens.position.x = 0.046;
          g.add(lens);
          // ソーラーパネル
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.003, 0.025), new THREE.MeshStandardMaterial({ color: 0x2050a0, metalness: 0.4, roughness: 0.5, emissive: 0x081030 }));
          g.add(panel);
          g.userData.label = 'HUBBLE';
          return g;
        };
        // 一般的な衛星: 箱+パネル
        const buildGenericSat = (color) => {
          const g = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 }));
          g.add(body);
          const pan = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.002, 0.018), new THREE.MeshStandardMaterial({ color: 0x1a3a7a, metalness: 0.5, roughness: 0.4, emissive: 0x081030 }));
          g.add(pan);
          return g;
        };
        // ISS
        const iss = buildISS();
        iss.visible = false;
        scene.add(iss);
        satellites.push({ mesh: iss, orbit: p.size * 1.28, speed: 28, angle: 0, inclin: 0.9, axis: 0.2, label: 'ISS' });
        // ハッブル
        const hubble = buildHubble();
        hubble.visible = false;
        scene.add(hubble);
        satellites.push({ mesh: hubble, orbit: p.size * 1.36, speed: 22, angle: Math.PI, inclin: 0.5, axis: 0.1, label: 'HUBBLE' });
        // GPS 6衛星（中軌道リング）
        for (let gi = 0; gi < 6; gi++) {
          const gs = buildGenericSat(0xaaaaaa);
          gs.visible = false;
          scene.add(gs);
          satellites.push({
            mesh: gs, orbit: p.size * 1.55, speed: 14,
            angle: (gi / 6) * Math.PI * 2, inclin: 0.55, axis: gi * 0.3, label: 'GPS'
          });
        }
        // Starlink（低軌道リング、多数）
        for (let si = 0; si < 24; si++) {
          const ss = buildGenericSat(0x8899aa);
          ss.visible = false;
          scene.add(ss);
          satellites.push({
            mesh: ss, orbit: p.size * 1.22 + (si%3)*0.05, speed: 32,
            angle: (si / 24) * Math.PI * 2, inclin: 0.15 + (si%4)*0.1, axis: si * 0.25, label: 'STARLINK'
          });
        }
        pMesh.userData.satellites = satellites;
      }
      if (p.name === '木星') {
        // ガリレオ衛星（イオ・エウロパ・ガニメデ・カリスト）
        [
          { size: 0.2, color: 0xe8d080, orbit: 3.0, speed: 10 },  // イオ
          { size: 0.22, color: 0xccb890, orbit: 3.6, speed: 8 },  // エウロパ
          { size: 0.26, color: 0x8a7860, orbit: 4.3, speed: 6 },  // ガニメデ
          { size: 0.24, color: 0x504838, orbit: 5.1, speed: 4 },  // カリスト
        ].forEach(m => {
          const mGeo = new THREE.SphereGeometry(m.size, 12, 12);
          const mMat = new THREE.MeshBasicMaterial({ color: m.color });
          const moonMesh = new THREE.Mesh(mGeo, mMat);
          moonMesh.visible = false;
          scene.add(moonMesh);
          moons.push({ mesh: moonMesh, orbit: m.orbit, speed: m.speed, angle: Math.random() * Math.PI * 2 });
        });
      }
      if (p.name === '土星') {
        // タイタン
        const mGeo = new THREE.SphereGeometry(0.32, 12, 12);
        const mMat = new THREE.MeshBasicMaterial({ color: 0xd4a860 });
        const titan = new THREE.Mesh(mGeo, mMat);
        titan.visible = false;
        scene.add(titan);
        moons.push({ mesh: titan, orbit: 3.2, speed: 6, angle: Math.random() * Math.PI * 2 });
      }
      if (moons.length) pMesh.userData.moons = moons;
      // 土星のリング（カッシーニの間隙・エンケの間隙あり）
      if (p.hasRing) {
        const ringTex = (() => {
          const sc = document.createElement('canvas'); sc.width = 64; sc.height = 512;
          const g = sc.getContext('2d');
          // 透明ベース
          g.clearRect(0, 0, 64, 512);
          // 内側から外側 (V=0 → V=1 が内→外に対応)
          // C環 (faint, inner): 0-80
          g.fillStyle = 'rgba(184,152,112,0.35)'; g.fillRect(0, 0, 64, 80);
          // B環 (brightest, densest): 80-280
          const bg = g.createLinearGradient(0, 80, 0, 280);
          bg.addColorStop(0, 'rgba(232,216,176,0.92)');
          bg.addColorStop(0.5, 'rgba(248,230,192,0.98)');
          bg.addColorStop(1, 'rgba(216,192,152,0.88)');
          g.fillStyle = bg; g.fillRect(0, 80, 64, 200);
          // 🌀 カッシーニの間隙: 280-320
          g.clearRect(0, 280, 64, 40);
          g.fillStyle = 'rgba(30,20,10,0.3)'; g.fillRect(0, 280, 64, 40);
          // A環: 320-460
          const ag = g.createLinearGradient(0, 320, 0, 460);
          ag.addColorStop(0, 'rgba(216,192,152,0.78)');
          ag.addColorStop(1, 'rgba(192,168,128,0.62)');
          g.fillStyle = ag; g.fillRect(0, 320, 64, 140);
          // エンケの間隙: 420-428 (A環の外側寄り)
          g.clearRect(0, 420, 64, 8);
          // F環 (細い、外側): 470-485
          g.fillStyle = 'rgba(232,216,176,0.42)';
          g.fillRect(0, 470, 64, 15);
          // 放射方向の微妙な濃淡（薄く）
          for (let s = 0; s < 14; s++) {
            const y = 100 + Math.random() * 350;
            const alpha = 0.025 + Math.random() * 0.04;
            g.fillStyle = `rgba(80,60,40,${alpha})`;
            g.fillRect(0, y, 64, 2 + Math.random() * 3);
          }
          return new THREE.CanvasTexture(sc);
        })();
        const rGeo = new THREE.RingGeometry(p.size * 1.2, p.size * 2.3, 128, 8);
        // UVをラジアル方向にマップ
        const pos = rGeo.attributes.position;
        const uv = rGeo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i);
          const r = Math.sqrt(x*x + y*y);
          const t = (r - p.size * 1.2) / (p.size * 2.3 - p.size * 1.2);
          const a = Math.atan2(y, x);
          uv.setXY(i, a / (Math.PI * 2) + 0.5, t);
        }
        uv.needsUpdate = true;
        const rMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.95, alphaTest: 0.02 });
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2.2;
        ring.visible = false;
        scene.add(ring);
        pMesh.userData.ring = ring;
      }
      // ブラックホールの降着円盤
      if (p.isBlackHole) {
        const adGeo = new THREE.RingGeometry(p.size * 1.5, p.size * 3.5, 96);
        // 放射状グラデのcanvasテクスチャ
        const adCan = document.createElement('canvas'); adCan.width = 512; adCan.height = 512;
        const adCtx = adCan.getContext('2d');
        const adGrd = adCtx.createRadialGradient(256, 256, 80, 256, 256, 256);
        adGrd.addColorStop(0.0, 'rgba(0,0,0,0)');
        adGrd.addColorStop(0.25, 'rgba(255,200,80,0.9)');
        adGrd.addColorStop(0.5, 'rgba(255,100,50,0.7)');
        adGrd.addColorStop(0.8, 'rgba(120,30,20,0.4)');
        adGrd.addColorStop(1.0, 'rgba(0,0,0,0)');
        adCtx.fillStyle = adGrd;
        adCtx.fillRect(0, 0, 512, 512);
        const adTex = new THREE.CanvasTexture(adCan);
        const adMat = new THREE.MeshBasicMaterial({ map: adTex, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
        const ad = new THREE.Mesh(adGeo, adMat);
        ad.rotation.x = Math.PI / 2.5;
        ad.visible = false;
        scene.add(ad);
        pMesh.userData.accretion = ad;
        // 重力レンズ効果の代わりに外側に暗いハロー
        const hGeo = new THREE.SphereGeometry(p.size * 1.1, 32, 32);
        const hMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.9 });
        const halo = new THREE.Mesh(hGeo, hMat);
        halo.visible = false;
        scene.add(halo);
        pMesh.userData.bhHalo = halo;
      }
      planetMeshes.push({ mesh: pMesh, orbit, planet: p });
    });

    // ============================================================
    // 🌍 大気フレネル・リム発光 + 昼夜境界シャドウシェル
    // ============================================================
    const ATM_COLOR = {
      '水星': new THREE.Color(0x886050), '金星': new THREE.Color(0xf0d878),
      '地球': new THREE.Color(0x7ac8ff), '火星': new THREE.Color(0xe08058),
      '木星': new THREE.Color(0xf0d8a0), '土星': new THREE.Color(0xf0e0b8),
      '天王星': new THREE.Color(0xa8e4ec), '海王星': new THREE.Color(0x6098e0),
    };
    planetMeshes.forEach(pm => {
      if (pm.planet.isBlackHole) return;
      const atmC = ATM_COLOR[pm.planet.name] || new THREE.Color(0xaaaaaa);
      // 大気フレネル発光シェル（やや大きい球、リムだけ光る）
      const atmGeo = new THREE.SphereGeometry(pm.planet.size * 1.035, 20, 14);
      const atmMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: atmC }, uPower: { value: pm.planet.name === '地球' ? 2.2 : 3.0 }, uIntensity: { value: pm.planet.name === '地球' ? 1.0 : 0.7 } },
        vertexShader: `
          varying vec3 vN;
          varying vec3 vView;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vN = normalize(mat3(modelMatrix) * normal);
            vView = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uPower;
          uniform float uIntensity;
          varying vec3 vN;
          varying vec3 vView;
          void main() {
            float rim = 1.0 - max(0.0, dot(vN, vView));
            rim = pow(rim, uPower) * uIntensity;
            gl_FragColor = vec4(uColor * rim, rim);
            if (rim < 0.02) discard;
          }
        `,
        transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending,
      });
      const atmShell = new THREE.Mesh(atmGeo, atmMat);
      atmShell.visible = false;
      scene.add(atmShell);
      pm.mesh.userData.atmShell = atmShell;

    });

    // ============================================================
    // ☀️ 太陽プロミネンス（プラズマアーク6本）
    // ============================================================
    const prominences = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.2;
      const h = 1.0 + Math.random() * 1.2;
      // 放物線カーブ
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 0),
        new THREE.Vector3(Math.cos(a) * 4.5, Math.sin(a) * 4.5 + h, 0),
        new THREE.Vector3(Math.cos(a + 0.3) * 4.5, Math.sin(a + 0.3) * 4.5 + h * 0.8, 0),
        new THREE.Vector3(Math.cos(a + 0.6) * 3.5, Math.sin(a + 0.6) * 3.5, 0),
      );
      const pGeo = new THREE.TubeGeometry(curve, 16, 0.08, 6, false);
      const pMat = new THREE.MeshBasicMaterial({ color: 0xff8030, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.rotation.z = Math.random() * Math.PI;
      pMesh.rotation.x = (Math.random() - 0.5) * 0.4;
      pMesh.visible = false;
      scene.add(pMesh);
      prominences.push({ mesh: pMesh, mat: pMat, phase: Math.random() * Math.PI * 2, baseRot: pMesh.rotation.z });
    }

    // ============================================================
    // ☄️ 彗星（太陽の反対側に尾が伸びる）
    // ============================================================
    const cometCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xe8f4ff })
    );
    cometCore.visible = false;
    scene.add(cometCore);
    const cometCoronaMat = new THREE.SpriteMaterial({ map: softDotTex, color: 0xc8e8ff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
    const cometCorona = new THREE.Sprite(cometCoronaMat);
    cometCorona.scale.set(1.6, 1.6, 1);
    scene.add(cometCorona);
    // 尾の粒子
    const cometTailCount = 40;
    const cometTailGeo = new THREE.BufferGeometry();
    const cometTailPos = new Float32Array(cometTailCount * 3);
    const cometTailCol = new Float32Array(cometTailCount * 3);
    const cometTailSiz = new Float32Array(cometTailCount);
    for (let i = 0; i < cometTailCount; i++) {
      const t = i / cometTailCount;
      cometTailPos[i*3] = 0; cometTailPos[i*3+1] = -9999; cometTailPos[i*3+2] = 0;
      // ダスト尾（白）とイオン尾（青）の2系統
      const isIon = i % 2 === 0;
      if (isIon) {
        cometTailCol[i*3] = 0.55; cometTailCol[i*3+1] = 0.75; cometTailCol[i*3+2] = 1.0;
      } else {
        cometTailCol[i*3] = 1.0; cometTailCol[i*3+1] = 0.95; cometTailCol[i*3+2] = 0.85;
      }
      cometTailSiz[i] = (1 - t) * 4 + 0.5;
    }
    cometTailGeo.setAttribute('position', new THREE.BufferAttribute(cometTailPos, 3));
    cometTailGeo.setAttribute('color', new THREE.BufferAttribute(cometTailCol, 3));
    cometTailGeo.setAttribute('ctSize', new THREE.BufferAttribute(cometTailSiz, 1));
    const cometTailMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: softDotTex }, uOpacity: { value: 0.0 } },
      vertexShader: `
        attribute float ctSize;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vS;
        void main() {
          vColor = color;
          vS = ctSize;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = ctSize * 6.0;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vS;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(vColor, t.a * uOpacity * (vS/4.0));
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const cometTail = new THREE.Points(cometTailGeo, cometTailMat);
    scene.add(cometTail);
    // 彗星の軌道：楕円
    const cometState = {
      angle: 0,
      a: 55, b: 35, // 長半径、短半径
      speed: 0.003,
      rotZ: 0.4, // 軌道傾き
    };

    // ============================================================
    // 🌟 太陽風粒子（太陽から放射状に流れる）
    // ============================================================
    const swCount = 100;
    const swGeo = new THREE.BufferGeometry();
    const swPos = new Float32Array(swCount * 3);
    const swVel = [];
    for (let i = 0; i < swCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 40;
      swPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
      swPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      swPos[i*3+2] = r * Math.cos(phi);
      swVel.push({ vx: swPos[i*3] * 0.003, vy: swPos[i*3+1] * 0.003, vz: swPos[i*3+2] * 0.003 });
    }
    swGeo.setAttribute('position', new THREE.BufferAttribute(swPos, 3));
    const swMat = new THREE.PointsMaterial({ size: 0.4, color: 0xfff0c0, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, map: softDotTex });
    const solarWind = new THREE.Points(swGeo, swMat);
    scene.add(solarWind);

    // 🪨 アステロイドベルト（火星-木星間、dist 20-22）
    const astCount = 400;
    const astGeo = new THREE.BufferGeometry();
    const astPos = new Float32Array(astCount * 3);
    for (let i = 0; i < astCount; i++) {
      const ar = 20 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const yOff = (Math.random() - 0.5) * 0.4;
      astPos[i*3] = Math.cos(theta) * ar;
      astPos[i*3+1] = yOff;
      astPos[i*3+2] = Math.sin(theta) * ar;
    }
    astGeo.setAttribute('position', new THREE.BufferAttribute(astPos, 3));
    const astMat = new THREE.PointsMaterial({ color: 0x988060, size: 0.06, transparent: true, opacity: 0 });
    const astPoints = new THREE.Points(astGeo, astMat);
    scene.add(astPoints);
    // カイパーベルト（海王星外側、dist 46-50）
    const kbCount = 250;
    const kbGeo = new THREE.BufferGeometry();
    const kbPos = new Float32Array(kbCount * 3);
    for (let i = 0; i < kbCount; i++) {
      const kr = 46 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const yOff = (Math.random() - 0.5) * 0.6;
      kbPos[i*3] = Math.cos(theta) * kr;
      kbPos[i*3+1] = yOff;
      kbPos[i*3+2] = Math.sin(theta) * kr;
    }
    kbGeo.setAttribute('position', new THREE.BufferAttribute(kbPos, 3));
    const kbMat = new THREE.PointsMaterial({ color: 0x807090, size: 0.08, transparent: true, opacity: 0 });
    const kbPoints = new THREE.Points(kbGeo, kbMat);
    scene.add(kbPoints);

    // 流れ星プール
    const shootingStars = [];
    function spawnShootingStar() {
      const geo = new THREE.BufferGeometry();
      const pts = new Float32Array(6); // 線（2点）
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      // ランダム位置＆方向
      const sx = (Math.random() - 0.5) * 150, sy = 30 + Math.random() * 40, sz = (Math.random() - 0.5) * 150;
      const dx = -3 - Math.random() * 4, dy = -0.5 - Math.random(), dz = -1 + Math.random() * 2;
      pts[0] = sx; pts[1] = sy; pts[2] = sz;
      pts[3] = sx - dx * 0.5; pts[4] = sy - dy * 0.5; pts[5] = sz - dz * 0.5;
      scene.add(line);
      shootingStars.push({ line, geo, mat, pts, dx, dy, dz, life: 0, maxLife: 60 + Math.random() * 40 });
    }

    let phase = 'noise'; // noise → warp → bang → universe
    let bbAge = 0;
    let universeTime = 0;
    let warpStartTime = 0;
    let running = true;
    let cameraZoomTarget = null;  // 惑星にズーム用
    let timeSpeed = 1;             // 宇宙の時間倍率

    // 🪐 惑星の象徴性（占星術・神話由来 + 偉人関連）
    const PLANET_SYMBOL = {
      '太陽':       { sym: '☉', theme: '自己・生命の源',
                      body: '光・意志・中心。あなたが「どう存在したいか」を映す。生命そのものの根。',
                      ijin: '全ての偉人の顔を照らした光' },
      '水星':       { sym: '☿', theme: '知性・言葉・旅',
                      body: '学ぶ速さ、言葉の選び方、情報との関わり。水星はあなたの頭脳を映す。',
                      ijin: '紫式部・夏目漱石・福澤諭吉' },
      '金星':       { sym: '♀', theme: '愛・美・価値観',
                      body: '何に惹かれ、何を美しいと感じるか。関係性と芸術の導き手。',
                      ijin: 'クレオパトラ・紫式部・オードリー' },
      '地球':       { sym: '⊕', theme: '生命・今ここ',
                      body: '肉体と物語が紡がれる唯一の場所。「今ここにいる」という奇跡。',
                      ijin: '190人以上の偉人が、この星で歴史を編んだ' },
      '火星':       { sym: '♂', theme: '情熱・行動・闘志',
                      body: '挑む勇気、怒り、欲望のエネルギー。火星はあなたの戦場を示す。',
                      ijin: 'ナポレオン・織田信長・坂本龍馬' },
      '木星':       { sym: '♃', theme: '拡大・寛容・幸運',
                      body: '器の大きさ、学び、機会。木星はあなたの世界をどこまで広げるかを映す。',
                      ijin: 'ブッダ・アリストテレス・渋沢栄一' },
      '土星':       { sym: '♄', theme: '試練・構造・責任',
                      body: '時間をかけて築く。規律と孤独の美しさ。土星は大人の星。',
                      ijin: 'カント・二宮尊徳・リンカーン' },
      '天王星':     { sym: '♅', theme: '革新・自由・覚醒',
                      body: '常識を壊し、新しい自分へ。天王星は突然の目覚めを授ける。',
                      ijin: 'エジソン・アインシュタイン・スティーブ・ジョブズ' },
      '海王星':     { sym: '♆', theme: '夢・幻想・芸術',
                      body: '直感と超越。境界を溶かし、目に見えないものと繋ぐ。',
                      ijin: 'ゴッホ・モーツァルト・宮沢賢治' },
      'ブラックホール': { sym: '✶', theme: '死と再生・無',
                      body: 'すべてが消え、すべてが生まれる境界。意識の究極の鏡。',
                      ijin: '哲学: ブッダの「空」、ハイデガーの「無」' },
    };
    function buildSymbolBlock(planetName) {
      const s = PLANET_SYMBOL[planetName];
      if (!s) return '';
      return `
        <div class="cosmos-symbol">
          <div class="csm-head"><span class="csm-sym">${s.sym}</span><span class="csm-theme">${s.theme}</span></div>
          <div class="csm-body">${s.body}</div>
          <div class="csm-ijin">🧙 ${s.ijin}</div>
        </div>
      `;
    }
    // ============================================================
    // 🪐 惑星一覧パネル（タップで追跡）
    // ============================================================
    (() => {
      const items = ov.querySelector('#cplItems');
      const body = ov.querySelector('#cplBody');
      const toggle = ov.querySelector('#cplToggle');
      toggle.addEventListener('click', () => {
        body.classList.toggle('open');
      });
      // 太陽 + 惑星全部
      const entries = [
        { key: 'sun', label: '☀️ 太陽', color: '#ffcf60' },
        ...PLANETS.map(p => ({ key: p.name, label: p.jname, color: '#' + p.color.toString(16).padStart(6, '0') })),
      ];
      items.innerHTML = entries.map(e => `
        <button class="cpl-item" data-key="${e.key}">
          <span class="cpl-dot" style="background:${e.color}"></span>
          <span>${e.label}</span>
        </button>
      `).join('');
      items.querySelectorAll('.cpl-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (key === 'sun') {
            // 太陽追跡: 原点に寄せる
            cameraZoomTarget = { mesh: sun, planet: { size: 3.5, jname: '太陽', isSun: true } };
          } else {
            const pm = planetMeshes.find(p => p.planet.name === key);
            if (pm) cameraZoomTarget = pm;
          }
          body.classList.remove('open');
          hud.classList.remove('show');
        });
      });
      ov.querySelector('#cplUnlock').addEventListener('click', () => {
        cameraZoomTarget = null;
        body.classList.remove('open');
      });
    })();
    // 時間倍率ボタン
    ov.querySelectorAll('#cosmosTimeCtrl button').forEach(btn => {
      btn.addEventListener('click', () => {
        ov.querySelectorAll('#cosmosTimeCtrl button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        timeSpeed = parseFloat(btn.dataset.speed);
      });
    });

    // ============================================================
    // 🎵 アンビエント宇宙ドローン（universe相でずっと鳴る、超小音量）
    // ============================================================
    let ambientDrone = null;
    function startAmbient() {
      if (ambientDrone) return;
      try {
        const c = getCtx();
        ambientDrone = { nodes: [] };
        // 極小音量の倍音ドローン
        [55, 82.5, 110, 165].forEach((f, i) => {
          const o = c.createOscillator();
          o.type = i === 0 ? 'sine' : 'triangle';
          o.frequency.value = f;
          const g = c.createGain();
          g.gain.value = 0;
          // 10秒でフェードイン、極めて小さく
          g.gain.linearRampToValueAtTime(0.005 + i * 0.002, c.currentTime + 10);
          // LFO でゆらぎ
          const lfo = c.createOscillator(); lfo.frequency.value = 0.04 + i * 0.02;
          const lfoGain = c.createGain(); lfoGain.gain.value = 0.003;
          lfo.connect(lfoGain); lfoGain.connect(g.gain);
          lfo.start();
          o.connect(g); g.connect(c.destination); o.start();
          ambientDrone.nodes.push({ o, g, lfo });
        });
      } catch (e) {}
    }
    // Haptic feedback
    function haptic(ms = 10) {
      if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
    }

    // ============================================================
    // 🪐 モード群: 軌道/星座/ツアー/実寸
    // ============================================================
    const modes = { trails: false, constellations: false, tour: false, real: false };
    let tourIdx = 0, tourTimer = 0;
    const eventBanner = ov.querySelector('#cosmosEventBanner');
    function flashBanner(text, dur = 2200) {
      eventBanner.textContent = text;
      eventBanner.classList.remove('show'); void eventBanner.offsetWidth;
      eventBanner.classList.add('show');
      setTimeout(() => eventBanner.classList.remove('show'), dur);
    }

    // ⭐ 星座データ（代表的なもの、簡略化した位置）
    const CONSTELLATIONS = [
      { name: 'オリオン座', label: 'Orion',
        stars: [[0.55, 0.30, -0.78],[0.10, 0.35, -0.93],[-0.45, 0.28, -0.85],
                [-0.05, -0.10, -0.99],[-0.12, -0.12, -0.99],[-0.20, -0.14, -0.97],
                [0.15, -0.55, -0.82],[-0.40, -0.55, -0.73]],
        lines: [[0,2],[2,5],[5,3],[3,0],[0,6],[2,7],[6,4],[4,7]] },
      { name: '北斗七星', label: 'Big Dipper',
        stars: [[0.85, 0.45, 0.28],[0.78, 0.52, 0.35],[0.68, 0.58, 0.45],
                [0.58, 0.60, 0.55],[0.47, 0.62, 0.62],[0.38, 0.55, 0.72],[0.30, 0.45, 0.83]],
        lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]] },
      { name: 'カシオペア座', label: 'Cassiopeia',
        stars: [[-0.90, 0.40, -0.20],[-0.78, 0.55, -0.30],[-0.65, 0.42, -0.40],
                [-0.50, 0.60, -0.50],[-0.35, 0.48, -0.62]],
        lines: [[0,1],[1,2],[2,3],[3,4]] },
      { name: '白鳥座', label: 'Cygnus',
        stars: [[0.20, 0.85, 0.48],[0.15, 0.72, 0.58],[0.10, 0.58, 0.70],
                [-0.20, 0.65, 0.62],[0.35, 0.65, 0.52],[-0.05, 0.45, 0.84]],
        lines: [[0,1],[1,2],[2,5],[3,1],[1,4]] },
      { name: 'さそり座', label: 'Scorpius',
        stars: [[-0.30, -0.70, -0.55],[-0.20, -0.75, -0.50],[-0.10, -0.78, -0.45],
                [0.05, -0.70, -0.45],[0.20, -0.60, -0.50],[0.30, -0.50, -0.60],[0.38, -0.40, -0.70]],
        lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]] },
    ];
    const CONST_R = 240;
    const constGroup = new THREE.Group();
    constGroup.visible = false;
    const labelDivs = [];
    CONSTELLATIONS.forEach(c => {
      const posArr = c.stars.map(s => {
        const v = new THREE.Vector3(s[0], s[1], s[2]).normalize().multiplyScalar(CONST_R);
        return v;
      });
      // 星スプライト
      posArr.forEach(p => {
        const m = new THREE.SpriteMaterial({ map: softDotTex, color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
        const sp = new THREE.Sprite(m);
        sp.scale.set(5, 5, 1);
        sp.position.copy(p);
        constGroup.add(sp);
      });
      // ライン
      const linePts = [];
      c.lines.forEach(([a, b]) => { linePts.push(posArr[a]); linePts.push(posArr[b]); });
      const lgeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lmat = new THREE.LineBasicMaterial({ color: 0x7ac8ff, transparent: true, opacity: 0.5 });
      constGroup.add(new THREE.LineSegments(lgeo, lmat));
      // HTMLラベル（画面座標に投影）
      const div = document.createElement('div');
      div.className = 'cosmos-const-label';
      div.textContent = c.name;
      ov.appendChild(div);
      const center = posArr.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1/posArr.length);
      labelDivs.push({ div, pos: center });
    });
    scene.add(constGroup);

    // 🌌 軌道トレイル（惑星が通った軌跡を Line で残す）
    const planetTrails = planetMeshes.map(pm => {
      const N = 160;
      const posArr = new Float32Array(N * 3);
      for (let i = 0; i < N * 3; i++) posArr[i] = -9999;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setDrawRange(0, 0);
      const col = (pm.planet.color || 0xaaaaaa);
      const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      scene.add(line);
      return { line, posArr, N, count: 0, write: 0, pm };
    });

    // 🪄 実寸モード: 惑星スケール倍率
    const REAL_SCALE = {
      '水星': 0.55, '金星': 0.75, '地球': 0.8, '火星': 0.6,
      '木星': 2.2, '土星': 2.0, '天王星': 1.3, '海王星': 1.3,
    };
    // 🌑 日食検出
    let eclipseCooldown = 0;
    // 🌠 流星群タイマー
    let meteorTimer = 0;
    let meteorBurst = 0;

    // モードシート開閉
    const modesSheet = ov.querySelector('#cosmosModesSheet');
    const modesTrigger = ov.querySelector('#cosmosModesTrigger');
    modesTrigger.addEventListener('click', () => {
      modesSheet.classList.toggle('show');
      haptic(8);
    });
    ov.querySelector('#cmsClose').addEventListener('click', () => {
      modesSheet.classList.remove('show');
    });
    // モードトグル
    ov.querySelectorAll('#cosmosModes button').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        modes[mode] = !modes[mode];
        btn.classList.toggle('active', modes[mode]);
        if (mode === 'trails') {
          planetTrails.forEach(t => {
            t.line.visible = modes.trails;
            if (modes.trails) { t.count = 0; t.write = 0; t.line.geometry.setDrawRange(0, 0); }
          });
          // 軌道リングも強調
          planetMeshes.forEach(pm => {
            if (!pm.mesh.userData.isBlackHole) pm.orbit.material.opacity = modes.trails ? 0.38 : 0.12;
          });
          flashBanner(modes.trails ? '🌌 軌道トレイル ON' : '🌌 軌道トレイル OFF');
        }
        if (mode === 'constellations') {
          constGroup.visible = modes.constellations;
          labelDivs.forEach(l => l.div.style.display = modes.constellations ? '' : 'none');
          flashBanner(modes.constellations ? '⭐ 星座オーバーレイ ON' : '⭐ 星座 OFF');
        }
        if (mode === 'tour') {
          if (modes.tour) {
            tourIdx = 0; tourTimer = 0;
            cameraZoomTarget = planetMeshes[0];
            flashBanner('🎬 惑星ツアー開始');
          } else {
            cameraZoomTarget = null;
            flashBanner('🎬 ツアー終了');
          }
        }
        if (mode === 'real') {
          planetMeshes.forEach(pm => {
            if (pm.planet.isBlackHole) return;
            const s = modes.real ? (REAL_SCALE[pm.planet.name] || 1) : 1;
            pm.mesh.scale.setScalar(s);
            if (pm.mesh.userData.atmShell) pm.mesh.userData.atmShell.scale.setScalar(s);
          });
          sun.scale.setScalar(modes.real ? 1.5 : 1);
          flashBanner(modes.real ? '🪄 実寸比率（ガス惑星大きく）' : '🪄 ゲーム比率');
        }
        if (mode === 'ijin') {
          ijinConstGroup.visible = modes.ijin;
          ijinLabels.forEach(l => l.div.style.display = modes.ijin ? '' : 'none');
          flashBanner(modes.ijin ? '👤 偉人の星座 ON — 科学者5人が空に' : '👤 偉人星座 OFF');
        }
        if (mode === 'meditate') {
          if (modes.meditate) {
            timeSpeed = 0.1;
            ov.querySelectorAll('#cosmosTimeCtrl button').forEach(b => b.classList.remove('active'));
            meditateOverlay.classList.add('on');
            startMeditateSound();
            flashBanner('🧘 瞑想モード — 意識だけが宇宙を満たす');
          } else {
            timeSpeed = 1;
            ov.querySelector('#cosmosTimeCtrl button[data-speed="1"]').classList.add('active');
            meditateOverlay.classList.remove('on');
            stopMeditateSound();
          }
        }
        if (mode === 'wish') {
          if (modes.wish) {
            flashBanner('🌠 空をタップして願いを込めて', 2600);
          } else {
            flashBanner('🌠 願い星モード OFF');
          }
        }
        if (mode === 'matryoshka') {
          const m = ov.querySelector('#cosmosMatryoshka');
          m.classList.toggle('show', modes.matryoshka);
          if (modes.matryoshka) { mIdx = 7; renderMatryoshka(); }
        }
        if (mode === 'truth') {
          openTruthDialog();
          // このモードは表示トグルではないので classList を即 OFF
          btn.classList.remove('active');
          modes.truth = false;
        }
        if (mode === 'prince') {
          togglePrinceMode(modes.prince);
          flashBanner(modes.prince ? '🌹 B-612 — 小さな星たちの世界' : '🌍 太陽系に戻る', 2400);
        }
      });
    });

    // ============================================================
    // 🌹 星の王子様モード（B-612と小さな星たち）
    // ============================================================
    const PRINCE_DATA = [
      { id:'b612', name:'B-612', role:'王子の星', color:'#80d0a0', emoji:'🌹', size: 1.2,
        story:'王子が暮らす直径わずか家一軒ほどの小惑星。三つのバオバブの芽と、たった一輪のバラ。' },
      { id:'rose', name:'バラ', role:'たった一人の', color:'#ff6080', emoji:'🌷', size: 0.5,
        story:'王子を困らせる、唯一のバラ。「時間をかけたから特別なんだ」。' },
      { id:'king', name:'王の星', role:'第325惑星', color:'#d04040', emoji:'👑', size: 0.8,
        story:'命じる相手がいなくても「命じなさい」と命じる王。' },
      { id:'vainman', name:'うぬぼれ屋', role:'第326惑星', color:'#e0a040', emoji:'🎩', size: 0.7,
        story:'「賞賛して！」だけが聞こえる男。' },
      { id:'drunkard', name:'のんだくれ', role:'第327惑星', color:'#5a3a20', emoji:'🍾', size: 0.7,
        story:'「飲むことを忘れるために飲む」の輪。' },
      { id:'business', name:'実業家', role:'第328惑星', color:'#4a4a4a', emoji:'💼', size: 0.7,
        story:'5億2百50万の星を数え、金庫にしまう男。' },
      { id:'lamp', name:'点灯夫', role:'第329惑星', color:'#f0c040', emoji:'🕯', size: 0.6,
        story:'1分ごとに街灯を点け消す、王子を最も愛した友。' },
      { id:'geographer', name:'地理学者', role:'第330惑星', color:'#8a6a4a', emoji:'📜', size: 0.8,
        story:'自分の星を一度も歩いたことのない学者。' },
      { id:'fox', name:'キツネ', role:'地球にて', color:'#ff9050', emoji:'🦊', size: 0.7,
        story:'「心で見なくちゃ、肝心なことは目に見えない」。' },
      { id:'snake', name:'ヘビ', role:'砂漠にて', color:'#404040', emoji:'🐍', size: 0.5,
        story:'王子が星に帰るための、やさしい毒。' },
    ];
    let princeGroup = null;
    // 👑 王子様の3Dフィギュア（小さな可愛らしいシルエット）
    function buildLittlePrince() {
      const p = new THREE.Group();
      // 髪（金色のツンツン）
      const hair = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.14, 10),
        new THREE.MeshStandardMaterial({ color: 0xffd860, roughness: 0.4, emissive: 0x6a4000, emissiveIntensity: 0.25 })
      );
      hair.position.y = 0.35;
      p.add(hair);
      // 顔
      const face = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xf8d8b0, roughness: 0.6, emissive: 0x302018, emissiveIntensity: 0.2 })
      );
      face.position.y = 0.25;
      p.add(face);
      // マフラー（黄色）
      const scarf = new THREE.Mesh(
        new THREE.TorusGeometry(0.09, 0.03, 8, 14),
        new THREE.MeshStandardMaterial({ color: 0xffe040, roughness: 0.4, emissive: 0x5a3a00, emissiveIntensity: 0.2 })
      );
      scarf.position.y = 0.17;
      scarf.rotation.x = Math.PI / 2;
      p.add(scarf);
      // マフラーの尻尾（風になびく）
      const scarfTail = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.14, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffe040, roughness: 0.4, emissive: 0x5a3a00, emissiveIntensity: 0.2 })
      );
      scarfTail.position.set(0.06, 0.11, -0.06);
      scarfTail.rotation.z = 0.4;
      p.add(scarfTail);
      // 胴体（緑のロングコート）
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.13, 0.26, 14),
        new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.5, emissive: 0x0a1a12, emissiveIntensity: 0.15 })
      );
      body.position.y = 0.02;
      p.add(body);
      // 腕
      [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, 0.18, 8),
          new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.5 })
        );
        arm.position.set(side * 0.10, 0.04, 0);
        arm.rotation.z = side * 0.25;
        p.add(arm);
      });
      // 足
      [-1, 1].forEach(side => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.035, 0.14, 8),
          new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.6 })
        );
        leg.position.set(side * 0.04, -0.17, 0);
        p.add(leg);
      });
      p.scale.setScalar(1.3);
      return p;
    }
    // 🌹 バラの3Dフィギュア
    function buildRose() {
      const r = new THREE.Group();
      // 茎
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.02, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.5 })
      );
      r.add(stem);
      // 花
      const rose = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xff3060, roughness: 0.45, emissive: 0x4a0818, emissiveIntensity: 0.3 })
      );
      rose.position.y = 0.17;
      rose.scale.set(1, 0.95, 1);
      r.add(rose);
      // 葉（3枚）
      [0, 120, 240].forEach(deg => {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x3a8a4a, roughness: 0.55 })
        );
        leaf.position.set(Math.cos(deg * Math.PI / 180) * 0.06, 0.05, Math.sin(deg * Math.PI / 180) * 0.06);
        leaf.scale.set(1.2, 0.3, 0.6);
        r.add(leaf);
      });
      return r;
    }
    // 🦊 キツネの3Dフィギュア
    function buildFoxFigure() {
      const f = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xe87030, roughness: 0.5, emissive: 0x3a1004, emissiveIntensity: 0.2 })
      );
      body.scale.set(1.5, 0.9, 1);
      f.add(body);
      // 頭
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xe87030, roughness: 0.5 })
      );
      head.position.set(0.18, 0.05, 0);
      head.scale.set(1.1, 0.9, 0.9);
      f.add(head);
      // 鼻（黒い尖り）
      const snout = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0x202020, roughness: 0.8 })
      );
      snout.position.set(0.28, 0.03, 0);
      snout.rotation.z = -Math.PI / 2;
      f.add(snout);
      // 耳（三角、白い内側）
      [-1, 1].forEach(side => {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.08, 8),
          new THREE.MeshStandardMaterial({ color: 0xe87030, roughness: 0.5 })
        );
        ear.position.set(0.16, 0.14, side * 0.06);
        f.add(ear);
      });
      // 尻尾（長い、白い先端）
      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.24, 10),
        new THREE.MeshStandardMaterial({ color: 0xe87030, roughness: 0.5 })
      );
      tail.position.set(-0.2, 0.08, 0);
      tail.rotation.z = -1.2;
      f.add(tail);
      const tailTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
      );
      tailTip.position.set(-0.28, 0.18, 0);
      f.add(tailTip);
      return f;
    }

    function buildPrinceGroup() {
      if (princeGroup) return princeGroup;
      const g = new THREE.Group();
      g.visible = false;
      const princeTargets = {}; // id → { planet, prince?, rose?, fox? }
      PRINCE_DATA.forEach((d, i) => {
        const n = PRINCE_DATA.length;
        const angle = (i / n) * Math.PI * 2;
        const r = 14 + Math.sin(i * 1.7) * 4;
        const y = Math.cos(i * 0.9) * 3;
        // procedural texture
        const sc = document.createElement('canvas'); sc.width = 256; sc.height = 256;
        const ctx2 = sc.getContext('2d');
        ctx2.fillStyle = d.color; ctx2.fillRect(0, 0, 256, 256);
        for (let j = 0; j < 30; j++) {
          const x = Math.random()*256, yy = Math.random()*256, rr = 15+Math.random()*40;
          const grd = ctx2.createRadialGradient(x, yy, 0, x, yy, rr);
          grd.addColorStop(0, 'rgba(255,255,255,0.22)');
          grd.addColorStop(1, 'rgba(255,255,255,0)');
          ctx2.fillStyle = grd;
          ctx2.beginPath(); ctx2.arc(x, yy, rr, 0, Math.PI*2); ctx2.fill();
        }
        ctx2.font = '120px serif';
        ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
        ctx2.fillStyle = 'rgba(0,0,0,0.22)';
        ctx2.fillText(d.emoji, 130, 138);
        ctx2.fillStyle = 'rgba(255,255,255,0.95)';
        ctx2.fillText(d.emoji, 128, 134);
        const tex = new THREE.CanvasTexture(sc);
        const mat = new THREE.MeshStandardMaterial({
          map: tex, emissive: new THREE.Color(d.color),
          emissiveIntensity: 0.3, roughness: 0.55, metalness: 0.1,
        });
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(d.size, 24, 18), mat);
        sphere.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
        sphere.userData = d;
        g.add(sphere);
        princeTargets[d.id] = { planet: sphere };
        // subtle glow
        const glowMat = new THREE.SpriteMaterial({ map: softDotTex, color: d.color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(d.size * 4, d.size * 4, 1);
        glow.position.copy(sphere.position);
        g.add(glow);

        // ✨ 特別キャラ配置
        if (d.id === 'b612') {
          // 王子様を B-612 の上に立たせる
          const prince = buildLittlePrince();
          prince.position.copy(sphere.position);
          prince.position.y += d.size + 0.02; // 地面に立つ
          sphere.userData.prince = prince;
          g.add(prince);
          princeTargets.b612.prince = prince;
          // バラを隣に
          const rose = buildRose();
          rose.position.copy(sphere.position);
          rose.position.y += d.size - 0.02;
          rose.position.x += 0.35;
          rose.rotation.z = -0.15;
          g.add(rose);
          princeTargets.b612.rose = rose;
        }
        if (d.id === 'fox') {
          const fox = buildFoxFigure();
          fox.position.copy(sphere.position);
          fox.position.y += d.size + 0.02;
          g.add(fox);
          princeTargets.fox.fox = fox;
        }
      });
      scene.add(g);
      princeGroup = g;
      princeGroup.userData.targets = princeTargets;
      return g;
    }
    function togglePrinceMode(on) {
      const group = buildPrinceGroup();
      group.visible = on;
      // 主要な惑星・太陽・衛星を隠す（ワイルドスケール: 再訪時に戻る）
      planetMeshes.forEach(pm => { pm.mesh.visible = !on; if (pm.orbit) pm.orbit.visible = !on; if (pm.mesh.userData.ring) pm.mesh.userData.ring.visible = !on; if (pm.mesh.userData.moons) pm.mesh.userData.moons.forEach(m => m.mesh.visible = !on); if (pm.mesh.userData.atmShell) pm.mesh.userData.atmShell.visible = !on; });
      sun.visible = !on;
      corona.visible = !on;
      if (typeof corona1 !== 'undefined' && corona1) corona1.visible = !on;
      astPoints.visible = !on;
      kbPoints.visible = !on;
    }
    // タップ判定に princeGroup も含める
    function pickPrinceHit(e) {
      if (!princeGroup || !princeGroup.visible) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(princeGroup.children.filter(c => c.isMesh), false);
      return hits[0] || null;
    }
    // 🌹 王子様ワールド: タップすると星の近くに降り立ち、キャラと対話
    let princeDiveTarget = null;
    renderer.domElement.addEventListener('click', (e) => {
      const h = pickPrinceHit(e);
      if (!h) return;
      const d = h.object.userData;
      // 星へ「ダイブ」— カメラが近づく
      princeDiveTarget = h.object;
      // 情報パネルにキャラ固有のダイアログ
      const infoEl = ov.querySelector('#cosmosInfoContent');
      const panel = ov.querySelector('#cosmosInfoPanel');
      if (!infoEl || !panel) return;
      // 🖼 線画イラスト（サン=テグジュペリ風の手描き調）
      const ILLUST = {
        b612: `<svg class="prince-svg" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
          <defs><filter id="prns"><feTurbulence baseFrequency="0.9" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="0.5"/></filter></defs>
          <!-- 小惑星B-612 -->
          <ellipse cx="100" cy="145" rx="60" ry="22" fill="#8db860" opacity="0.4"/>
          <circle cx="100" cy="135" r="50" fill="none" stroke="#2a3a20" stroke-width="1.8"/>
          <!-- 地面の草 -->
          <path d="M 65 135 Q 70 128 72 135 M 80 128 Q 84 120 88 128 M 115 128 Q 120 122 124 128 M 130 132 Q 135 125 140 132" stroke="#2a6a3a" stroke-width="1" fill="none"/>
          <!-- バオバブの芽（2本） -->
          <path d="M 62 128 Q 60 118 64 118 Q 66 122 68 128" stroke="#4a4a28" stroke-width="1.3" fill="#8a8a4a" opacity="0.65"/>
          <path d="M 138 130 Q 136 120 140 120 Q 143 124 144 130" stroke="#4a4a28" stroke-width="1.3" fill="#8a8a4a" opacity="0.65"/>
          <!-- バラ（左側） -->
          <line x1="75" y1="115" x2="75" y2="92" stroke="#3a6a4a" stroke-width="1.3"/>
          <path d="M 70 95 Q 67 92 72 90 M 78 93 Q 82 91 80 96" stroke="#3a6a4a" stroke-width="1" fill="none"/>
          <circle cx="75" cy="86" r="7" fill="#e04060" stroke="#8a1a30" stroke-width="1"/>
          <circle cx="75" cy="86" r="3" fill="#8a1a30"/>
          <!-- ガラスドーム -->
          <path d="M 63 100 Q 75 65 87 100" stroke="#88aabb" stroke-width="1" fill="rgba(200,220,240,0.15)"/>
          <!-- 王子様 -->
          <!-- 金色の髪 -->
          <path d="M 112 50 Q 112 38 122 38 Q 132 38 132 50 L 133 48 L 131 52 L 130 48 L 128 52 L 127 48 L 125 52 L 124 48 L 122 52 L 120 48 L 119 52 L 117 48 L 116 52 L 114 48 L 113 52 Z" fill="#f0c840" stroke="#8a6020" stroke-width="0.8"/>
          <!-- 顔 -->
          <circle cx="122" cy="56" r="9" fill="#fde0c0" stroke="#8a5030" stroke-width="0.8"/>
          <!-- 目 -->
          <circle cx="119" cy="56" r="0.9" fill="#2a2a2a"/>
          <circle cx="125" cy="56" r="0.9" fill="#2a2a2a"/>
          <!-- 微笑み -->
          <path d="M 119 60 Q 122 62 125 60" stroke="#2a2a2a" stroke-width="0.7" fill="none"/>
          <!-- マフラー -->
          <path d="M 112 65 Q 122 68 132 65 L 136 72 L 130 69 L 122 66 L 114 69 L 108 72 Z" fill="#ffd060" stroke="#8a6020" stroke-width="0.8"/>
          <!-- 体・緑のコート -->
          <path d="M 113 72 Q 108 95 110 120 L 134 120 Q 136 95 131 72 Z" fill="#5a9a6a" stroke="#2a4a30" stroke-width="1"/>
          <!-- ボタン -->
          <circle cx="122" cy="85" r="0.9" fill="#2a4a30"/>
          <circle cx="122" cy="95" r="0.9" fill="#2a4a30"/>
          <circle cx="122" cy="105" r="0.9" fill="#2a4a30"/>
          <!-- 脚 -->
          <line x1="118" y1="120" x2="116" y2="135" stroke="#6a4020" stroke-width="3"/>
          <line x1="126" y1="120" x2="128" y2="135" stroke="#6a4020" stroke-width="3"/>
          <!-- 見上げる星 -->
          <text x="30" y="30" font-size="9" fill="#ffd880" opacity="0.7">✦</text>
          <text x="170" y="22" font-size="7" fill="#ffd880" opacity="0.5">✧</text>
          <text x="180" y="50" font-size="8" fill="#ffd880" opacity="0.6">✦</text>
          <text x="20" y="70" font-size="6" fill="#ffd880" opacity="0.4">✧</text>
        </svg>`,
        fox: `<svg class="prince-svg" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
          <!-- 砂漠の地面 -->
          <path d="M 0 140 Q 100 125 200 140 L 200 180 L 0 180 Z" fill="#e8c488" opacity="0.3"/>
          <path d="M 0 140 Q 100 125 200 140" stroke="#c89050" stroke-width="1" fill="none"/>
          <!-- 王子様（小さく左に） -->
          <circle cx="50" cy="85" r="6" fill="#f0c840" stroke="#8a6020" stroke-width="0.6"/>
          <circle cx="50" cy="95" r="6" fill="#fde0c0" stroke="#8a5030" stroke-width="0.6"/>
          <path d="M 44 105 Q 40 120 42 135 L 58 135 Q 60 120 56 105 Z" fill="#5a9a6a" stroke="#2a4a30" stroke-width="0.8"/>
          <line x1="46" y1="135" x2="45" y2="142" stroke="#6a4020" stroke-width="2"/>
          <line x1="54" y1="135" x2="55" y2="142" stroke="#6a4020" stroke-width="2"/>
          <!-- キツネ（右側に大きく） -->
          <!-- 尻尾 -->
          <path d="M 155 110 Q 172 95 180 100 Q 178 115 168 115" fill="#e87030" stroke="#8a3a10" stroke-width="1"/>
          <ellipse cx="180" cy="100" rx="4" ry="6" fill="#ffffff" stroke="#8a3a10" stroke-width="0.8"/>
          <!-- 胴体 -->
          <ellipse cx="140" cy="115" rx="20" ry="15" fill="#e87030" stroke="#8a3a10" stroke-width="1"/>
          <!-- 脚 -->
          <line x1="130" y1="128" x2="128" y2="138" stroke="#8a3a10" stroke-width="2.5"/>
          <line x1="148" y1="128" x2="150" y2="138" stroke="#8a3a10" stroke-width="2.5"/>
          <!-- 頭 -->
          <ellipse cx="120" cy="105" rx="10" ry="9" fill="#e87030" stroke="#8a3a10" stroke-width="1"/>
          <!-- 鼻先 -->
          <path d="M 110 105 L 105 107 L 110 110 Z" fill="#e87030" stroke="#8a3a10" stroke-width="0.8"/>
          <circle cx="106" cy="108" r="1.2" fill="#1a1a1a"/>
          <!-- 耳 -->
          <path d="M 114 100 L 112 92 L 118 96 Z" fill="#e87030" stroke="#8a3a10" stroke-width="0.8"/>
          <path d="M 124 99 L 122 91 L 128 95 Z" fill="#e87030" stroke="#8a3a10" stroke-width="0.8"/>
          <!-- 目 -->
          <circle cx="118" cy="103" r="1.2" fill="#2a2a2a"/>
          <!-- 麦畑の暗示 -->
          <path d="M 70 135 L 68 128 M 75 135 L 74 125 M 80 135 L 79 127 M 85 135 L 84 124" stroke="#d4a040" stroke-width="0.8"/>
        </svg>`,
        rose: `<svg class="prince-svg" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
          <!-- 地面 -->
          <ellipse cx="100" cy="155" rx="40" ry="6" fill="#2a6a3a" opacity="0.3"/>
          <!-- 茎 -->
          <line x1="100" y1="155" x2="100" y2="80" stroke="#3a6a4a" stroke-width="2"/>
          <!-- 葉 -->
          <path d="M 88 115 Q 80 110 82 120 Q 88 118 100 118" fill="#5aa070" stroke="#2a6a3a" stroke-width="0.8"/>
          <path d="M 112 100 Q 120 95 118 105 Q 110 105 100 105" fill="#5aa070" stroke="#2a6a3a" stroke-width="0.8"/>
          <!-- トゲ -->
          <line x1="100" y1="130" x2="97" y2="128" stroke="#3a6a4a" stroke-width="1.5"/>
          <line x1="100" y1="110" x2="103" y2="108" stroke="#3a6a4a" stroke-width="1.5"/>
          <!-- 花びら（5枚重なる） -->
          <path d="M 100 55 Q 80 55 85 75 Q 100 85 115 75 Q 120 55 100 55" fill="#ff3a5a" stroke="#7a1030" stroke-width="1"/>
          <path d="M 100 60 Q 88 62 90 75 Q 100 80 110 75 Q 112 62 100 60" fill="#d02040" stroke="#7a1030" stroke-width="0.8"/>
          <circle cx="100" cy="72" r="5" fill="#6a0820" stroke="#3a0410" stroke-width="0.6"/>
          <!-- ガラスドーム -->
          <path d="M 70 150 Q 100 30 130 150" stroke="#88aabb" stroke-width="1.5" fill="rgba(200,220,240,0.12)"/>
          <line x1="70" y1="150" x2="130" y2="150" stroke="#6a7880" stroke-width="1.5"/>
          <!-- つぶやき -->
          <text x="100" y="25" text-anchor="middle" font-size="8" fill="#ffa0b0" opacity="0.7" font-style="italic">...</text>
        </svg>`,
        snake: `<svg class="prince-svg" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
          <!-- 砂漠 -->
          <path d="M 0 150 Q 100 130 200 150 L 200 180 L 0 180 Z" fill="#e8c488" opacity="0.4"/>
          <!-- 太陽 -->
          <circle cx="160" cy="45" r="18" fill="#ffd480" opacity="0.6"/>
          <circle cx="160" cy="45" r="26" fill="#ffd480" opacity="0.15"/>
          <!-- ヘビ（黄色く光る、S字） -->
          <path d="M 50 145 Q 60 130 75 135 Q 95 145 110 125 Q 130 110 145 130 Q 155 145 165 140"
                stroke="#e0c050" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
          <path d="M 50 145 Q 60 130 75 135 Q 95 145 110 125 Q 130 110 145 130 Q 155 145 165 140"
                stroke="#8a6810" stroke-width="1" fill="none" stroke-linecap="round"/>
          <!-- ヘビの頭 -->
          <ellipse cx="50" cy="146" rx="4" ry="3" fill="#e0c050" stroke="#8a6810" stroke-width="0.8"/>
          <circle cx="48" cy="144" r="0.8" fill="#2a2a2a"/>
          <!-- 舌 -->
          <path d="M 46 146 L 42 145 M 46 146 L 42 148" stroke="#c03030" stroke-width="0.6"/>
          <!-- 影 -->
          <ellipse cx="100" cy="167" rx="60" ry="2" fill="#000" opacity="0.2"/>
        </svg>`,
        prince: `<svg class="prince-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <!-- 王子様（大きく） -->
          <!-- 星 -->
          <text x="30" y="30" font-size="10" fill="#ffd880">✦</text>
          <text x="170" y="40" font-size="8" fill="#ffd880" opacity="0.7">✧</text>
          <text x="180" y="90" font-size="9" fill="#ffd880" opacity="0.6">✦</text>
          <!-- 髪 -->
          <path d="M 80 40 Q 80 22 100 22 Q 120 22 120 40 L 122 37 L 120 42 L 118 37 L 116 42 L 114 37 L 112 42 L 110 37 L 108 42 L 106 37 L 104 42 L 102 37 L 100 42 L 98 37 L 96 42 L 94 37 L 92 42 L 90 37 L 88 42 L 86 37 L 84 42 L 82 37 L 80 42 Z" fill="#f0c840" stroke="#8a6020" stroke-width="1"/>
          <!-- 顔 -->
          <circle cx="100" cy="55" r="16" fill="#fde0c0" stroke="#8a5030" stroke-width="1"/>
          <circle cx="94" cy="53" r="1.5" fill="#2a2a2a"/>
          <circle cx="106" cy="53" r="1.5" fill="#2a2a2a"/>
          <path d="M 94 62 Q 100 65 106 62" stroke="#2a2a2a" stroke-width="1" fill="none"/>
          <!-- マフラー -->
          <path d="M 82 72 Q 100 77 118 72 L 125 85 L 115 78 L 100 74 L 85 78 L 75 85 Z" fill="#ffd060" stroke="#8a6020" stroke-width="1"/>
          <!-- マフラーの尻尾（なびく） -->
          <path d="M 120 78 Q 135 82 140 95 L 128 88 Z" fill="#ffd060" stroke="#8a6020" stroke-width="1"/>
          <!-- コート -->
          <path d="M 82 85 Q 75 115 78 150 L 122 150 Q 125 115 118 85 Z" fill="#5a9a6a" stroke="#2a4a30" stroke-width="1.2"/>
          <circle cx="100" cy="100" r="1.2" fill="#2a4a30"/>
          <circle cx="100" cy="115" r="1.2" fill="#2a4a30"/>
          <circle cx="100" cy="130" r="1.2" fill="#2a4a30"/>
          <!-- 腕 -->
          <path d="M 82 90 Q 70 100 68 130" stroke="#5a9a6a" stroke-width="5" fill="none" stroke-linecap="round"/>
          <path d="M 118 90 Q 130 100 132 130" stroke="#5a9a6a" stroke-width="5" fill="none" stroke-linecap="round"/>
          <!-- 脚 -->
          <rect x="85" y="150" width="10" height="30" fill="#6a4020" stroke="#3a2010" stroke-width="1"/>
          <rect x="105" y="150" width="10" height="30" fill="#6a4020" stroke="#3a2010" stroke-width="1"/>
        </svg>`,
      };
      const illust = ILLUST[d.id] ? `<div class="prince-illust-wrap">${ILLUST[d.id]}</div>` : '';

      // 特別な場面はセリフを足す
      let extra = '';
      if (d.id === 'b612') {
        extra = `
          ${illust}
          <div class="prince-dialog">
            <div class="pd-line"><b>王子</b>：「ぼくは、きみのバラを世界一特別にしたんだ」</div>
            <div class="pd-line"><b>バラ</b>：「行ってらっしゃい…　ずっと待ってるわ」</div>
          </div>
          <button class="prince-return" id="princeReturn">↩ 宇宙に戻る</button>
        `;
      } else if (d.id === 'fox') {
        extra = `
          ${illust}
          <div class="prince-dialog">
            <div class="pd-line"><b>王子</b>：「きみはぼくに何なの？」</div>
            <div class="pd-line"><b>キツネ</b>：「まだ僕にとって、きみはあまたの少年の一人に過ぎない。でも — 飼いならしてくれたら、僕たちは互いになくてはならない存在になる」</div>
            <div class="pd-line pd-key">「心で見なくちゃ、ものごとはよく見えない。肝心なことは、目に見えないんだよ」</div>
          </div>
          <button class="prince-return" id="princeReturn">↩ 宇宙に戻る</button>
        `;
      } else if (d.id === 'snake') {
        extra = `
          ${illust}
          <div class="prince-dialog">
            <div class="pd-line"><b>ヘビ</b>：「ぼくが触れたものは、ぼくが触れる前にいた場所に戻る」</div>
            <div class="pd-line">「きみの星は、遠すぎる。歩いては帰れない」</div>
          </div>
          <button class="prince-return" id="princeReturn">↩ 宇宙に戻る</button>
        `;
      } else if (d.id === 'rose') {
        extra = `
          ${illust}
          <div class="prince-dialog">
            <div class="pd-line"><b>バラ</b>：「私があなたにとって特別なのは、あなたが私に費やした時間のせいよ」</div>
          </div>
          <button class="prince-return" id="princeReturn">↩ 宇宙に戻る</button>
        `;
      } else {
        extra = `<button class="prince-return" id="princeReturn">↩ 宇宙に戻る</button>`;
      }
      infoEl.innerHTML = `
        <div class="cosmos-info-name">${d.emoji} ${d.name}</div>
        <div class="cosmos-info-sub">${d.role}</div>
        <div class="cosmos-info-trivia">${d.story}</div>
        ${extra}
      `;
      panel.classList.add('show');
      const ret = infoEl.querySelector('#princeReturn');
      if (ret) ret.addEventListener('click', () => {
        princeDiveTarget = null;
        panel.classList.remove('show');
      });
    });

    // ============================================================
    // ✒️ 我が真理（ユーザーが刻んだ真理がティッカーで流れる）
    // ============================================================
    const truthDialog = ov.querySelector('#cosmosTruthDialog');
    const truthTicker = ov.querySelector('#cosmosTruthTicker');
    const ctdInput = ov.querySelector('#ctdInput');
    const ctdSaved = ov.querySelector('#ctdSaved');
    const ctdSavedLabel = ov.querySelector('#ctdSavedLabel');
    function loadTruths() {
      try { return JSON.parse(localStorage.getItem('cosmosTruths') || '[]'); } catch (e) { return []; }
    }
    function saveTruths(arr) {
      try { localStorage.setItem('cosmosTruths', JSON.stringify(arr)); } catch (e) {}
    }
    function renderSavedTruths() {
      const arr = loadTruths();
      if (!arr.length) {
        ctdSavedLabel.textContent = '';
        ctdSaved.innerHTML = '';
        return;
      }
      ctdSavedLabel.textContent = `過去の真理（${arr.length}件）`;
      ctdSaved.innerHTML = arr.slice().reverse().map((t, i) => `
        <div class="ctd-row">
          <span class="ctd-text">${t.text.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</span>
          <button class="ctd-del" data-idx="${arr.length - 1 - i}" aria-label="削除">×</button>
        </div>
      `).join('');
      ctdSaved.querySelectorAll('.ctd-del').forEach(b => {
        b.addEventListener('click', () => {
          const a2 = loadTruths();
          a2.splice(parseInt(b.dataset.idx, 10), 1);
          saveTruths(a2);
          renderSavedTruths();
          updateTicker();
        });
      });
    }
    function openTruthDialog() {
      ctdInput.value = '';
      renderSavedTruths();
      truthDialog.classList.add('show');
      setTimeout(() => ctdInput.focus(), 100);
    }
    ov.querySelector('#ctdSave').addEventListener('click', () => {
      const text = ctdInput.value.trim();
      if (text) {
        const arr = loadTruths();
        arr.push({ text, at: Date.now() });
        saveTruths(arr);
        renderSavedTruths();
        ctdInput.value = '';
        updateTicker();
        flashBanner('✒️ 真理が宇宙に刻まれた', 2200);
      }
    });
    ov.querySelector('#ctdCancel').addEventListener('click', () => {
      truthDialog.classList.remove('show');
    });

    // 真理ティッカー: universe相でゆっくり切り替えて流す
    let truthIdx = 0;
    let truthCycleTimer = 0;
    function updateTicker() {
      const arr = loadTruths();
      if (arr.length === 0) {
        truthTicker.classList.remove('show');
        truthTicker.textContent = '';
      } else {
        truthTicker.classList.add('show');
        const t = arr[truthIdx % arr.length];
        truthTicker.textContent = '— ' + t.text + ' —';
      }
    }
    updateTicker();

    // ============================================================
    // 🪆 マトリョーシカ階層（宇宙→素粒子→意識→宇宙 の輪）
    // ============================================================
    const MATRYOSHKA = [
      { icon: '♾️', name: '多元宇宙',     scale: '∞',         quote: '世界は一つとは限らない',       who: 'ヒュー・エヴェレット' },
      { icon: '🌌', name: '観測可能な宇宙', scale: '10²⁶ m',    quote: '宇宙が理解しうることが最も理解しがたい', who: 'アインシュタイン' },
      { icon: '🌀', name: '銀河',         scale: '10²¹ m',    quote: '天の川は無数の星でできている', who: 'ガリレオ' },
      { icon: '☀️', name: '太陽系',       scale: '10¹³ m',    quote: 'それでも地球は動いている',     who: 'ガリレオ' },
      { icon: '🌍', name: '地球',         scale: '10⁷ m',     quote: '我々はたった一つの地球を持つ', who: 'カール・セーガン' },
      { icon: '🏙', name: '都市',         scale: '10⁴ m',     quote: '都市は人類の最高の発明',       who: 'アリストテレス' },
      { icon: '🏠', name: '家',           scale: '10¹ m',     quote: '家は人の城である',             who: 'エドワード・コーク' },
      { icon: '🧑', name: '人間',         scale: '10⁰ m',     quote: '我思うゆえに我あり',           who: 'デカルト' },
      { icon: '🧠', name: '脳',           scale: '10⁻¹ m',    quote: '全ての思考は脳の電気',         who: 'ラマチャンドラン' },
      { icon: '🦠', name: '細胞',         scale: '10⁻⁵ m',    quote: 'すべての生命は細胞からなる',   who: 'ウィルヒョウ' },
      { icon: '🧬', name: 'DNA',          scale: '10⁻⁹ m',    quote: '我々は4文字の本である',         who: 'クリック' },
      { icon: '⚛️', name: '原子',         scale: '10⁻¹⁰ m',   quote: '原子は分割不可能…と思っていた', who: 'デモクリトス' },
      { icon: '✨', name: '素粒子',       scale: '10⁻¹⁸ m',   quote: '神はサイコロを振らない',       who: 'アインシュタイン' },
      { icon: '🔮', name: 'プランク',     scale: '10⁻³⁵ m',   quote: '空間と時間の限界点',           who: 'マックス・プランク' },
      { icon: '💭', name: '意識',         scale: '?',          quote: '宇宙はあなたが見るから存在する', who: 'ユング' },
    ];
    let mIdx = 7; // 人間からスタート
    function renderMatryoshka() {
      const m = MATRYOSHKA[mIdx];
      ov.querySelector('#cmyIcon').textContent = m.icon;
      ov.querySelector('#cmyLevel').textContent = `${mIdx + 1} / ${MATRYOSHKA.length}`;
      ov.querySelector('#cmyName').textContent = m.name;
      ov.querySelector('#cmyScale').textContent = m.scale;
      ov.querySelector('#cmyQuote').textContent = `「${m.quote}」`;
      ov.querySelector('#cmyWho').textContent = `— ${m.who}`;
      // ドット列
      const dots = ov.querySelector('#cmyDots');
      dots.innerHTML = MATRYOSHKA.map((_, i) => `<span class="cmy-dot ${i === mIdx ? 'active' : ''}"></span>`).join('');
      // 意識から多元宇宙へ → ループ
      const icon = ov.querySelector('#cmyIcon');
      icon.classList.remove('zooming'); void icon.offsetWidth; icon.classList.add('zooming');
    }
    ov.querySelector('#cmyZoomIn').addEventListener('click', () => {
      mIdx = (mIdx + 1) % MATRYOSHKA.length; // 最後→最初でループ（意識→多元宇宙）
      renderMatryoshka();
      haptic(8); beep(500 - mIdx * 20, 0.07, 'sine', 0.05);
    });
    ov.querySelector('#cmyZoomOut').addEventListener('click', () => {
      mIdx = (mIdx - 1 + MATRYOSHKA.length) % MATRYOSHKA.length;
      renderMatryoshka();
      haptic(8); beep(400 + mIdx * 20, 0.07, 'sine', 0.05);
    });
    ov.querySelector('#cmyClose').addEventListener('click', () => {
      modes.matryoshka = false;
      ov.querySelector('[data-mode="matryoshka"]').classList.remove('active');
      ov.querySelector('#cosmosMatryoshka').classList.remove('show');
    });

    // ============================================================
    // 👤 偉人の星座（科学者5人を星にして結ぶ）
    // ============================================================
    const IJIN_STARS = [
      { name: 'ガリレオ', quote: 'それでも地球は動いている', pos: [0.55, 0.18, -0.82] },
      { name: 'コペルニクス', quote: '天球の回転について', pos: [0.32, 0.40, -0.86] },
      { name: 'ケプラー', quote: '惑星運動の法則', pos: [0.05, 0.50, -0.86] },
      { name: 'ニュートン', quote: '我巨人の肩に立つ', pos: [-0.30, 0.45, -0.84] },
      { name: 'アインシュタイン', quote: '想像力は知識よりも重要', pos: [-0.58, 0.25, -0.78] },
    ];
    const IJIN_R = 235;
    const ijinConstGroup = new THREE.Group();
    ijinConstGroup.visible = false;
    const ijinLabels = [];
    const ijinPositions = IJIN_STARS.map(s => {
      const v = new THREE.Vector3(...s.pos).normalize().multiplyScalar(IJIN_R);
      // 発光する金色の星
      const m = new THREE.SpriteMaterial({ map: softDotTex, color: 0xffe08a, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(m);
      sp.scale.set(7, 7, 1);
      sp.position.copy(v);
      ijinConstGroup.add(sp);
      // HTMLラベル
      const div = document.createElement('div');
      div.className = 'cosmos-const-label cosmos-ijin-label';
      div.innerHTML = `<b>${s.name}</b><br><small>${s.quote}</small>`;
      div.style.display = 'none';
      ov.appendChild(div);
      ijinLabels.push({ div, pos: v.clone() });
      return v;
    });
    // 5人を連結（時系列順の思想の連鎖）
    const ijinLineGeo = new THREE.BufferGeometry().setFromPoints([
      ijinPositions[0], ijinPositions[1],
      ijinPositions[1], ijinPositions[2],
      ijinPositions[2], ijinPositions[3],
      ijinPositions[3], ijinPositions[4],
    ]);
    const ijinLineMat = new THREE.LineBasicMaterial({ color: 0xffd460, transparent: true, opacity: 0.55 });
    ijinConstGroup.add(new THREE.LineSegments(ijinLineGeo, ijinLineMat));
    scene.add(ijinConstGroup);

    // ============================================================
    // 🧘 瞑想モード（時間スロー + BGM + 呼吸するオーバーレイ）
    // ============================================================
    const meditateOverlay = document.createElement('div');
    meditateOverlay.className = 'cosmos-meditate-overlay';
    ov.appendChild(meditateOverlay);
    let meditateAudio = null;
    function startMeditateSound() {
      try {
        const c = getCtx();
        meditateAudio = { nodes: [] };
        // 3つの倍音を重ねてドローン
        [110, 165, 220].forEach((f, i) => {
          const o = c.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle';
          o.frequency.value = f;
          const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.02 + i * 0.006, c.currentTime + 2);
          o.connect(g); g.connect(c.destination); o.start();
          meditateAudio.nodes.push({ o, g });
        });
      } catch (e) {}
    }
    function stopMeditateSound() {
      if (!meditateAudio) return;
      const c = getCtx();
      meditateAudio.nodes.forEach(({ o, g }) => {
        try { g.gain.cancelScheduledValues(c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + 1); setTimeout(() => o.stop(), 1100); } catch (e) {}
      });
      meditateAudio = null;
    }

    // ============================================================
    // 🌠 願い星（空をタップ → 願いを書く → 永久に輝く星）
    // ============================================================
    const wishDialog = ov.querySelector('#cosmosWishDialog');
    const wishInput = ov.querySelector('#cwdInput');
    const wishStars = [];
    let pendingWishPos = null;
    function loadWishes() {
      try {
        const raw = localStorage.getItem('cosmosWishes');
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }
    function saveWishes(arr) {
      try { localStorage.setItem('cosmosWishes', JSON.stringify(arr)); } catch (e) {}
    }
    function makeWishStar(pos, text) {
      const m = new THREE.SpriteMaterial({ map: softDotTex, color: 0xfff0b0, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(m);
      sp.scale.set(4, 4, 1);
      sp.position.set(pos.x, pos.y, pos.z);
      sp.userData = { text, phase: Math.random() * Math.PI * 2, baseScale: 4 + Math.random() * 1.5 };
      scene.add(sp);
      wishStars.push(sp);
    }
    // 保存済みの願い星を復元
    loadWishes().forEach(w => makeWishStar(w.pos, w.text));
    ov.querySelector('#cwdSave').addEventListener('click', () => {
      const text = wishInput.value.trim();
      if (text && pendingWishPos) {
        const arr = loadWishes();
        arr.push({ pos: { x: pendingWishPos.x, y: pendingWishPos.y, z: pendingWishPos.z }, text, at: Date.now() });
        saveWishes(arr);
        makeWishStar(pendingWishPos, text);
        flashBanner('🌠 願いが星になった', 2200);
      }
      wishDialog.classList.remove('show');
      wishInput.value = '';
      pendingWishPos = null;
    });
    ov.querySelector('#cwdCancel').addEventListener('click', () => {
      wishDialog.classList.remove('show');
      wishInput.value = '';
      pendingWishPos = null;
    });
    // ユーザー操作: ドラッグ回転 + ホイール/ピンチでズーム
    let userControlling = false;
    let userRotation = 0;
    let userTilt = 0;
    let userZoom = 55;
    let autoFade = 0; // 操作終了から何秒経ったか
    let dragging = false;
    let dragStartX = 0, dragStartY = 0;
    let dragBaseRot = 0, dragBaseTilt = 0;
    stage.addEventListener('pointerdown', (e) => {
      if (phase !== 'universe') return;
      dragging = true;
      dragStartX = e.clientX; dragStartY = e.clientY;
      dragBaseRot = userRotation; dragBaseTilt = userTilt;
      userControlling = true; autoFade = 0;
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      userRotation = dragBaseRot - (e.clientX - dragStartX) * 0.005;
      userTilt = Math.max(-0.5, Math.min(0.8, dragBaseTilt - (e.clientY - dragStartY) * 0.003));
    });
    stage.addEventListener('pointerup', () => { dragging = false; });
    stage.addEventListener('pointerleave', () => { dragging = false; });
    stage.addEventListener('wheel', (e) => {
      if (phase !== 'universe') return;
      e.preventDefault();
      userZoom = Math.max(15, Math.min(120, userZoom + e.deltaY * 0.05));
      userControlling = true; autoFade = 0;
    }, { passive: false });
    // ピンチ（touch）
    let pinchStart = 0, pinchBaseZoom = 55;
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStart = Math.hypot(dx, dy);
        pinchBaseZoom = userZoom;
      }
    });
    stage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinchStart > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        userZoom = Math.max(15, Math.min(120, pinchBaseZoom * pinchStart / d));
        userControlling = true; autoFade = 0;
      }
    });
    // +/- ズームボタン
    ov.querySelectorAll('[data-cosmos-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (phase !== 'universe') return;
        const dir = btn.dataset.cosmosZoom === 'in' ? -8 : 8;
        userZoom = Math.max(15, Math.min(120, userZoom + dir));
        userControlling = true;
      });
    });

    // ============================================================
    // 🚀 ロケット操縦モード（任天堂的な気持ちよさ目指し）
    // ============================================================
    // ============================================================
    // 🚀 宇宙船メッシュ（サイゲリスペクト：スタイリッシュ sci-fi フリゲート）
    // ============================================================
    const rocketGroup = new THREE.Group();
    rocketGroup.visible = false;
    {
      // 機体パネルテクスチャ（船体の線・警告マーク）
      const hullTex = (() => {
        const sc = document.createElement('canvas'); sc.width = 512; sc.height = 256;
        const g = sc.getContext('2d');
        // ベース：冷白→極淡い青
        const base = g.createLinearGradient(0, 0, 0, 256);
        base.addColorStop(0, '#e8ecf2'); base.addColorStop(1, '#c8d2de');
        g.fillStyle = base; g.fillRect(0, 0, 512, 256);
        // パネルライン（柔らかく）
        g.strokeStyle = 'rgba(40,52,78,0.22)'; g.lineWidth = 2.2;
        for (let i = 0; i < 6; i++) {
          g.beginPath(); g.moveTo(i * 84, 0); g.lineTo(i * 84 + 40, 256); g.stroke();
        }
        for (let i = 0; i < 4; i++) {
          g.beginPath(); g.moveTo(0, i * 64 + 20); g.lineTo(512, i * 64 + 24); g.stroke();
        }
        // アクセントストライプ（赤）
        g.fillStyle = '#c83040'; g.fillRect(0, 118, 512, 8);
        g.fillStyle = '#1a2a44'; g.fillRect(0, 128, 512, 3);
        // リベット
        g.fillStyle = 'rgba(40,50,70,0.5)';
        for (let y = 20; y < 240; y += 40) for (let x = 12; x < 512; x += 36) {
          g.beginPath(); g.arc(x, y, 1.4, 0, Math.PI*2); g.fill();
        }
        // ロゴ / 機体番号
        g.fillStyle = '#1a2a44'; g.font = 'bold 22px system-ui';
        g.fillText('IJIN-01', 28, 180);
        g.fillStyle = '#c83040'; g.font = 'bold 14px system-ui';
        g.fillText('⚠ CAUTION', 260, 156);
        return new THREE.CanvasTexture(sc);
      })();
      const hullMat = new THREE.MeshStandardMaterial({
        map: hullTex, roughness: 0.35, metalness: 0.55,
        emissive: 0xffffff, emissiveMap: hullTex, emissiveIntensity: 0.55,
        envMapIntensity: 1.5,
      });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x4a5268, roughness: 0.4, metalness: 0.85, emissive: 0x2a3040, emissiveIntensity: 0.6 });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0xff5060, roughness: 0.3, metalness: 0.5, emissive: 0xc03040, emissiveIntensity: 0.7 });

      // フューズラージ（流線型：前方細く後方太い）
      // SphereGeometryを引き伸ばして尖らせる
      const fuselage = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), hullMat);
      fuselage.scale.set(0.7, 0.55, 1.6); // 横扁平、縦長の楕円体
      rocketGroup.add(fuselage);

      // 前方のシャープなノーズ（短い円錐＋丸め）
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 24), hullMat);
      nose.rotation.x = Math.PI / 2;
      nose.scale.set(0.9, 0.9, 1);
      nose.position.z = 0.72;
      rocketGroup.add(nose);

      // コックピットドーム（ティール発光ガラス）
      const cockpitMat = new THREE.MeshStandardMaterial({
        color: 0x1a2838, roughness: 0.08, metalness: 0.2,
        emissive: 0x4ac8ff, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.9,
      });
      const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14, 0, Math.PI*2, 0, Math.PI/2), cockpitMat);
      cockpit.rotation.x = Math.PI;
      cockpit.scale.set(1.3, 0.8, 1.7);
      cockpit.position.set(0, 0.13, 0.25);
      rocketGroup.add(cockpit);

      // スイープドウイング（三角翼、左右）
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(0.9, -0.25);
      wingShape.lineTo(0.85, -0.3);
      wingShape.lineTo(0.15, -0.05);
      wingShape.lineTo(0, 0);
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
      [1, -1].forEach(side => {
        const wing = new THREE.Mesh(wingGeo, hullMat);
        wing.position.set(side * 0.05, -0.05, -0.15);
        wing.scale.set(side, 1, 1);
        wing.rotation.z = side > 0 ? 0 : 0;
        rocketGroup.add(wing);
        // 翼端のアクセントライン（発光）
        const tipLight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.08), new THREE.MeshBasicMaterial({ color: side > 0 ? 0x40ff60 : 0xff4040 }));
        tipLight.position.set(side * 0.92, -0.28, -0.19);
        rocketGroup.add(tipLight);
      });

      // 背面フィン（垂直尾翼）
      const tailShape = new THREE.Shape();
      tailShape.moveTo(0, 0);
      tailShape.lineTo(-0.35, 0.35);
      tailShape.lineTo(-0.35, 0.32);
      tailShape.lineTo(-0.05, 0);
      tailShape.lineTo(0, 0);
      const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
      const tail = new THREE.Mesh(tailGeo, hullMat);
      tail.position.set(-0.02, 0.08, -0.4);
      rocketGroup.add(tail);

      // レッドアクセントストリップ（胴体下部）
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.2), accentMat);
      stripe.position.set(0, -0.22, 0);
      rocketGroup.add(stripe);

      // 双発イオンエンジン
      const engines = [];
      [-1, 1].forEach(side => {
        const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.38, 16), darkMat);
        nacelle.rotation.x = Math.PI / 2;
        nacelle.position.set(side * 0.22, -0.02, -0.55);
        rocketGroup.add(nacelle);
        // 発光リング（イオン燃焼部）
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 10, 24), new THREE.MeshBasicMaterial({ color: 0x60c8ff }));
        ring.position.set(side * 0.22, -0.02, -0.74);
        rocketGroup.add(ring);
        engines.push({ ring, side });
      });
      rocketGroup.userData.engines = engines;

      // 噴射（青白プラズマ）
      const flameTex = (() => {
        const sc = document.createElement('canvas'); sc.width = 128; sc.height = 256;
        const g = sc.getContext('2d');
        const grd = g.createRadialGradient(64, 40, 0, 64, 180, 130);
        grd.addColorStop(0, 'rgba(240,250,255,1)');
        grd.addColorStop(0.1, 'rgba(200,230,255,0.95)');
        grd.addColorStop(0.3, 'rgba(100,180,255,0.7)');
        grd.addColorStop(0.6, 'rgba(60,130,255,0.35)');
        grd.addColorStop(1, 'rgba(30,60,140,0)');
        g.fillStyle = grd; g.fillRect(0,0,128,256);
        return new THREE.CanvasTexture(sc);
      })();
      const flames = [];
      [-1, 1].forEach(side => {
        const fm = new THREE.SpriteMaterial({ map: flameTex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
        const fl = new THREE.Sprite(fm);
        fl.scale.set(0.3, 0.9, 1);
        fl.position.set(side * 0.22, -0.02, -1.1);
        rocketGroup.add(fl);
        flames.push(fl);
      });
      rocketGroup.userData.flames = flames;

      // 大きなトレイル風グローspriteで両エンジンを包む
      const glowMat = new THREE.SpriteMaterial({ map: flameTex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
      const bigGlow = new THREE.Sprite(glowMat);
      bigGlow.scale.set(0.9, 1.5, 1);
      bigGlow.position.set(0, -0.02, -1.0);
      rocketGroup.add(bigGlow);
      rocketGroup.userData.bigGlow = bigGlow;

      // ロケット自体の補助照明（暗い宇宙で見えるように）— 3灯体制で明るく
      const headlight = new THREE.PointLight(0xc0e0ff, 3.2, 10, 1.5);
      headlight.position.set(0, 0.15, 0.7);
      rocketGroup.add(headlight);
      // 真横からの補助光（機体全体を柔らかく照らす）
      const fillLight = new THREE.PointLight(0xfff4e0, 2.2, 6, 1.4);
      fillLight.position.set(0, 0.8, 0);
      rocketGroup.add(fillLight);
      // 下からの微弱な上向き光（アンダーライト）
      const underLight = new THREE.PointLight(0x6688cc, 1.4, 5, 1.6);
      underLight.position.set(0, -0.5, -0.1);
      rocketGroup.add(underLight);
      const engineLight = new THREE.PointLight(0x60a0ff, 0.0, 10, 2);
      engineLight.position.z = -0.9;
      rocketGroup.add(engineLight);
      rocketGroup.userData.engineLight = engineLight;

      // ナビゲーションライト点滅（赤・緑・白）
      const blinkWhite = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      blinkWhite.position.set(0, 0.2, -0.35);
      rocketGroup.add(blinkWhite);
      rocketGroup.userData.blinkWhite = blinkWhite;
    }
    scene.add(rocketGroup);

    // ============================================================
    // 🤖 モビルスーツ（ガンダム風メカ）
    // ============================================================
    const mechaGroup = new THREE.Group();
    mechaGroup.visible = false;
    {
      // 🎨 フリーダム系マテリアル（メタリック強化版）
      const whiteMat  = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.18, metalness: 0.8,  emissive: 0x1c1c26 });
      const blueMat   = new THREE.MeshStandardMaterial({ color: 0x1d4ca8, roughness: 0.2,  metalness: 0.88, emissive: 0x081540 });
      const deepBlue  = new THREE.MeshStandardMaterial({ color: 0x0f2f70, roughness: 0.22, metalness: 0.9,  emissive: 0x050a2c });
      const redMat    = new THREE.MeshStandardMaterial({ color: 0xe63030, roughness: 0.18, metalness: 0.75, emissive: 0x480810 });
      const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffc830, roughness: 0.2,  metalness: 0.85, emissive: 0x5a3800 });
      const goldMat   = new THREE.MeshStandardMaterial({ color: 0xffe07a, roughness: 0.12, metalness: 0.95, emissive: 0x6a4500 });
      const darkMat   = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.4,  metalness: 0.95, emissive: 0x05050c });
      const glassBlue = new THREE.MeshStandardMaterial({ color: 0x60a8ff, roughness: 0.08, metalness: 0.4,  emissive: 0x2890ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.92 });
      // ⚡ 発光ライン用（エナジーアクセント）
      const energyMat = new THREE.MeshBasicMaterial({ color: 0x60d8ff });
      const energyHot = new THREE.MeshBasicMaterial({ color: 0x80ffc8 });

      // ===== 🧠 頭部（pivot group で首から回転） =====
      const headPivot = new THREE.Group();
      headPivot.position.set(0, 0.5, 0);
      mechaGroup.add(headPivot);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.13), deepBlue);
      face.position.set(0, -0.04, 0.01);
      headPivot.add(face);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.14), whiteMat);
      crown.position.set(0, 0.04, 0);
      headPivot.add(crown);
      const backHead = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.04), darkMat);
      backHead.position.set(0, -0.04, -0.08);
      headPivot.add(backHead);
      const forehead = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.005), yellowMat);
      forehead.position.set(0, 0.04, 0.08);
      headPivot.add(forehead);
      const vShape = new THREE.Shape();
      vShape.moveTo(-0.10, 0); vShape.lineTo(-0.05, 0.16); vShape.lineTo(-0.025, 0.16);
      vShape.lineTo(0, 0.04);  vShape.lineTo(0.025, 0.16); vShape.lineTo(0.05, 0.16);
      vShape.lineTo(0.10, 0);  vShape.lineTo(0.06, 0);     vShape.lineTo(0.01, 0.11);
      vShape.lineTo(-0.01, 0.11); vShape.lineTo(-0.06, 0); vShape.lineTo(-0.10, 0);
      const vGeo = new THREE.ExtrudeGeometry(vShape, { depth: 0.015, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 });
      const vfin = new THREE.Mesh(vGeo, yellowMat);
      vfin.position.set(0, 0.08, 0.04);
      headPivot.add(vfin);
      [-1, 1].forEach(side => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.005), new THREE.MeshBasicMaterial({ color: 0x60ffa0 }));
        eye.position.set(side * 0.025, -0.035, 0.08);
        headPivot.add(eye);
      });
      [-1, 1].forEach(side => {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.04), darkMat);
        ear.position.set(side * 0.08, -0.02, 0);
        headPivot.add(ear);
      });

      // ===== 🫀 胴体 =====
      // 上部胴（青）
      const torsoUpper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), blueMat);
      torsoUpper.position.set(0, 0.28, 0);
      mechaGroup.add(torsoUpper);
      // 下部胴（白）
      const torsoLower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.22), whiteMat);
      torsoLower.position.set(0, 0.12, 0);
      mechaGroup.add(torsoLower);
      // 胸中央V字（赤）
      const chestVShape = new THREE.Shape();
      chestVShape.moveTo(-0.09, 0.05); chestVShape.lineTo(-0.07, 0.05);
      chestVShape.lineTo(0, -0.06); chestVShape.lineTo(0.07, 0.05);
      chestVShape.lineTo(0.09, 0.05); chestVShape.lineTo(0, -0.09);
      const chestVGeo = new THREE.ExtrudeGeometry(chestVShape, { depth: 0.015, bevelEnabled: false });
      const chestV = new THREE.Mesh(chestVGeo, redMat);
      chestV.position.set(0, 0.3, 0.11);
      mechaGroup.add(chestV);
      // ゴールドコア（ソーラージェネレータ）
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16), goldMat);
      core.rotation.x = Math.PI / 2;
      core.position.set(0, 0.14, 0.115);
      mechaGroup.add(core);
      // ショルダーダクト（黒スリット）
      [-1, 1].forEach(side => {
        const dv = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.01), darkMat);
        dv.position.set(side * 0.1, 0.27, 0.115);
        mechaGroup.add(dv);
      });

      // ===== 🦾 肩アーマー（フレアデザイン） =====
      [-1, 1].forEach(side => {
        // メイン肩ブロック（青、大きめ）
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.18), blueMat);
        shoulder.position.set(side * 0.28, 0.28, 0);
        mechaGroup.add(shoulder);
        // 肩の白いエッジ
        const shEdge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.2), whiteMat);
        shEdge.position.set(side * 0.28, 0.36, 0);
        mechaGroup.add(shEdge);
        // 肩前面の赤マーク
        const shMark = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.01), redMat);
        shMark.position.set(side * 0.28, 0.3, 0.094);
        mechaGroup.add(shMark);
      });

      // ===== 💪 腕（pivot groupで肩から回転） =====
      const armPivots = {};
      [-1, 1].forEach(side => {
        const arm = new THREE.Group();
        arm.position.set(side * 0.28, 0.22, 0); // 肩ピボット
        mechaGroup.add(arm);
        // 上腕（白）— pivotからの相対位置
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.18, 12), whiteMat);
        upperArm.position.set(0, -0.08, 0);
        arm.add(upperArm);
        // 肘関節（赤ブロック）
        const elbow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.1), redMat);
        elbow.position.set(0, -0.19, 0);
        arm.add(elbow);
        // 前腕（青アーマー）
        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.11), blueMat);
        forearm.position.set(0, -0.32, 0);
        arm.add(forearm);
        // 前腕白コア
        const faCore = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.02), whiteMat);
        faCore.position.set(0, -0.32, 0.055);
        arm.add(faCore);
        // 手甲
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), whiteMat);
        hand.position.set(0, -0.47, 0);
        arm.add(hand);
        armPivots[side > 0 ? 'armR' : 'armL'] = arm;
      });

      // ===== 🔫 ビームライフル（右手） =====
      const rifleBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.42), darkMat);
      rifleBody.position.set(0.28, -0.26, 0.12);
      mechaGroup.add(rifleBody);
      const rifleTop = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.025, 0.12), whiteMat);
      rifleTop.position.set(0.28, -0.22, 0.2);
      mechaGroup.add(rifleTop);
      const rifleBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.18, 10), darkMat);
      rifleBarrel.rotation.x = Math.PI / 2;
      rifleBarrel.position.set(0.28, -0.26, 0.42);
      mechaGroup.add(rifleBarrel);
      // 銃口の青プラズマ
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), glassBlue);
      muzzle.position.set(0.28, -0.26, 0.52);
      mechaGroup.add(muzzle);

      // ===== 🛡 シールド（左腕、フリーダム型） =====
      const shieldShape = new THREE.Shape();
      shieldShape.moveTo(-0.1, 0.2); shieldShape.lineTo(0.12, 0.18);
      shieldShape.lineTo(0.12, -0.14); shieldShape.lineTo(0, -0.22);
      shieldShape.lineTo(-0.12, -0.14); shieldShape.lineTo(-0.1, 0.2);
      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
      const shield = new THREE.Mesh(shieldGeo, whiteMat);
      shield.position.set(-0.38, -0.15, 0.08);
      shield.rotation.y = -0.25;
      mechaGroup.add(shield);
      // シールドの青ストライプ
      const shieldBlue = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.05), blueMat);
      shieldBlue.position.set(-0.38, -0.05, 0.11);
      shieldBlue.rotation.y = -0.25;
      mechaGroup.add(shieldBlue);
      // シールドの赤エンブレム
      const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.015), redMat);
      emblem.position.set(-0.38, -0.04, 0.145);
      emblem.rotation.y = -0.25;
      mechaGroup.add(emblem);

      // ===== 🎀 スカートアーマー（腰まわり） =====
      // フロントスカート（赤、左右分割）
      [-1, 1].forEach(side => {
        const frontSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), redMat);
        frontSkirt.position.set(side * 0.075, -0.04, 0.09);
        mechaGroup.add(frontSkirt);
      });
      // サイドスカート（青）
      [-1, 1].forEach(side => {
        const sideSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.14), blueMat);
        sideSkirt.position.set(side * 0.17, -0.05, 0);
        mechaGroup.add(sideSkirt);
      });
      // リアスカート（白）
      const rearSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.06), whiteMat);
      rearSkirt.position.set(0, -0.05, -0.09);
      mechaGroup.add(rearSkirt);

      // ===== 💎 ヒップビームキャノン（フリーダムのバラエナ） =====
      [-1, 1].forEach(side => {
        const cannonBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), deepBlue);
        cannonBase.position.set(side * 0.19, -0.1, -0.18);
        mechaGroup.add(cannonBase);
        const cannonTip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.08, 8), darkMat);
        cannonTip.rotation.x = Math.PI / 2;
        cannonTip.position.set(side * 0.19, -0.1, -0.37);
        mechaGroup.add(cannonTip);
      });

      // ===== 🦵 脚（pivot groupで股関節から回転、膝もbend可能） =====
      const legPivots = {};
      [-1, 1].forEach(side => {
        // 股関節ピボット
        const leg = new THREE.Group();
        leg.position.set(side * 0.08, -0.1, 0);
        mechaGroup.add(leg);
        // 太もも
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.14), whiteMat);
        thigh.position.set(0, -0.11, 0);
        leg.add(thigh);
        const thighBlue = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.08, 0.145), blueMat);
        thighBlue.position.set(0, -0.23, 0);
        leg.add(thighBlue);
        // 膝ピボット（下腿をここから回転）
        const knee = new THREE.Group();
        knee.position.set(0, -0.27, 0);
        leg.add(knee);
        // 膝アーマー（黄）
        const kneeArmor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.14), yellowMat);
        kneeArmor.position.set(0, 0, 0);
        knee.add(kneeArmor);
        // 脛
        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.13), whiteMat);
        shin.position.set(0, -0.13, 0);
        knee.add(shin);
        const shinStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.135), blueMat);
        shinStripe.position.set(0, -0.13, 0);
        knee.add(shinStripe);
        // 足（尖ったブーツ）
        const footShape = new THREE.Shape();
        footShape.moveTo(-0.06, -0.04); footShape.lineTo(-0.06, 0.04);
        footShape.lineTo(0.12, 0.03); footShape.lineTo(0.14, -0.02);
        footShape.lineTo(0.1, -0.04); footShape.lineTo(-0.06, -0.04);
        const footGeo = new THREE.ExtrudeGeometry(footShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 1 });
        const foot = new THREE.Mesh(footGeo, whiteMat);
        foot.position.set(-0.05, -0.26, -0.05);
        knee.add(foot);
        legPivots[side > 0 ? 'legR' : 'legL'] = { hip: leg, knee };
      });

      // ===== 🦅 ウィングバインダー（pivot groupで背中から展開可能） =====
      const wingPivots = {};
      [-1, 1].forEach(side => {
        const wing = new THREE.Group();
        wing.position.set(side * 0.14, 0.3, -0.14); // 翼の付け根ピボット
        mechaGroup.add(wing);
        // ベースブロック
        const wingBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), deepBlue);
        wing.add(wingBase);
        // 上翼
        const upperWingShape = new THREE.Shape();
        upperWingShape.moveTo(0, 0); upperWingShape.lineTo(0.6, 0.1);
        upperWingShape.lineTo(0.7, 0.05); upperWingShape.lineTo(0.68, -0.04);
        upperWingShape.lineTo(0.08, -0.1); upperWingShape.lineTo(0, 0);
        const upperWingGeo = new THREE.ExtrudeGeometry(upperWingShape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 });
        const upperWing = new THREE.Mesh(upperWingGeo, whiteMat);
        upperWing.scale.set(side, 1, 1);
        upperWing.position.set(side * 0.03, 0.08, -0.02);
        upperWing.rotation.y = side * 0.35;
        upperWing.rotation.z = side * -0.1;
        wing.add(upperWing);
        // 翼の先端赤ライン
        const wingTipRed = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.025), redMat);
        wingTipRed.position.set(side * 0.6, 0.12, -0.16);
        wing.add(wingTipRed);
        // 下翼
        const lowerWingShape = new THREE.Shape();
        lowerWingShape.moveTo(0, 0); lowerWingShape.lineTo(0.5, -0.02);
        lowerWingShape.lineTo(0.58, -0.08); lowerWingShape.lineTo(0.55, -0.16);
        lowerWingShape.lineTo(0.05, -0.14); lowerWingShape.lineTo(0, 0);
        const lowerWingGeo = new THREE.ExtrudeGeometry(lowerWingShape, { depth: 0.018, bevelEnabled: false });
        const lowerWing = new THREE.Mesh(lowerWingGeo, whiteMat);
        lowerWing.scale.set(side, 1, 1);
        lowerWing.position.set(side * 0.03, -0.08, -0.02);
        lowerWing.rotation.y = side * 0.3;
        lowerWing.rotation.z = side * 0.15;
        wing.add(lowerWing);
        // 翼内側の青アクセント
        const wingBlueLine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.022), blueMat);
        wingBlueLine.position.set(side * 0.28, 0.05, -0.04);
        wingBlueLine.rotation.y = side * 0.3;
        wing.add(wingBlueLine);
        wingPivots[side > 0 ? 'wingR' : 'wingL'] = wing;
      });

      // ===== ✨ ビームウィング（BOOST時に展開する光の翼） =====
      const beamWingTex = (() => {
        const sc = document.createElement('canvas'); sc.width = 256; sc.height = 256;
        const g = sc.getContext('2d');
        // 光条の束
        g.translate(0, 128);
        const grd = g.createLinearGradient(0, -128, 0, 128);
        grd.addColorStop(0, 'rgba(180,230,255,0)');
        grd.addColorStop(0.5, 'rgba(120,200,255,0.85)');
        grd.addColorStop(1, 'rgba(180,230,255,0)');
        g.fillStyle = grd; g.fillRect(0, -128, 256, 256);
        // 縦ストライプの光束
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {
          const x = Math.random() * 256;
          const alpha = 0.3 + Math.random() * 0.4;
          const w = 0.5 + Math.random() * 2;
          g.fillStyle = `rgba(240,250,255,${alpha})`;
          g.fillRect(x, -110, w, 220);
        }
        return new THREE.CanvasTexture(sc);
      })();
      const beamWings = [];
      [-1, 1].forEach(side => {
        // 大きな光の翼：ウィングピボットに追加
        const wing = wingPivots[side > 0 ? 'wingR' : 'wingL'];
        const beamShape = new THREE.Shape();
        beamShape.moveTo(0, 0);
        beamShape.lineTo(1.4, 0.35);
        beamShape.lineTo(1.6, 0.1);
        beamShape.lineTo(1.5, -0.35);
        beamShape.lineTo(1.2, -0.55);
        beamShape.lineTo(0.1, -0.25);
        beamShape.lineTo(0, 0);
        const beamGeo = new THREE.ShapeGeometry(beamShape);
        const beamMat = new THREE.MeshBasicMaterial({
          map: beamWingTex,
          color: 0xa0e4ff,
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.scale.set(side, 1, 1);
        beam.position.set(side * 0.05, 0, -0.03);
        beam.rotation.y = side * 0.3;
        wing.add(beam);
        beamWings.push(beam);
        // 内側のもっと明るいコア翼（細い）
        const coreBeamGeo = new THREE.ShapeGeometry(beamShape);
        const coreBeamMat = new THREE.MeshBasicMaterial({
          color: 0xf0ffff,
          transparent: true,
          opacity: 0.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const coreBeam = new THREE.Mesh(coreBeamGeo, coreBeamMat);
        coreBeam.scale.set(side * 0.7, 0.6, 1);
        coreBeam.position.set(side * 0.05, 0, -0.025);
        coreBeam.rotation.y = side * 0.3;
        wing.add(coreBeam);
        beamWings.push(coreBeam);
      });

      // ===== ⚡ エナジーライン（胴・脚・腕のアクセント発光） =====
      // 胸のトリニティ発光ライン
      const chestEnergy = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.006, 0.005), energyMat);
      chestEnergy.position.set(0, 0.24, 0.116);
      mechaGroup.add(chestEnergy);
      // 腰コアを金から熱いシアンに
      const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), energyHot);
      coreGlow.position.set(0, 0.14, 0.125);
      mechaGroup.add(coreGlow);

      // ===== 🎒 バックパック（スリム・中央） =====
      const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.08), deepBlue);
      backpack.position.set(0, 0.28, -0.16);
      mechaGroup.add(backpack);
      // バックパック中央の黄ライン
      const bpLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.005), yellowMat);
      bpLine.position.set(0, 0.28, -0.2);
      mechaGroup.add(bpLine);

      // ===== ⚡ バーニア（背中中央 + 両翼） =====
      const vernieres = [];
      [[-0.08, 0.2, -0.24], [0.08, 0.2, -0.24], [-0.3, 0.35, -0.32], [0.3, 0.35, -0.32]].forEach(pos => {
        const vern = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.1, 12), darkMat);
        vern.rotation.x = Math.PI / 2;
        vern.position.set(...pos);
        mechaGroup.add(vern);
        vernieres.push(vern);
        // 内部発光リング
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 16), new THREE.MeshBasicMaterial({ color: 0x60a8ff }));
        ring.position.set(pos[0], pos[1], pos[2] - 0.06);
        mechaGroup.add(ring);
      });

      // 噴射炎スプライト（青白プラズマ / オレンジ切り替え可だが青で）
      const flameTex2 = (() => {
        const sc = document.createElement('canvas'); sc.width = 128; sc.height = 256;
        const g = sc.getContext('2d');
        const grd = g.createRadialGradient(64, 40, 0, 64, 180, 130);
        grd.addColorStop(0, 'rgba(255,250,220,1)');
        grd.addColorStop(0.15, 'rgba(255,220,140,0.9)');
        grd.addColorStop(0.4, 'rgba(255,140,70,0.65)');
        grd.addColorStop(0.75, 'rgba(220,90,40,0.28)');
        grd.addColorStop(1, 'rgba(140,30,20,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 256);
        return new THREE.CanvasTexture(sc);
      })();
      const flames2 = [];
      // 中央バックパック2 + 翼2 = 4本の噴射
      [[-0.08, 0.2, -0.45], [0.08, 0.2, -0.45], [-0.3, 0.35, -0.55], [0.3, 0.35, -0.55]].forEach(pos => {
        const fm = new THREE.SpriteMaterial({ map: flameTex2, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
        const fl = new THREE.Sprite(fm);
        fl.scale.set(0.26, 0.7, 1);
        fl.position.set(...pos);
        mechaGroup.add(fl);
        flames2.push(fl);
      });
      mechaGroup.userData.flames = flames2;

      // 大きな後方グロー
      const bigGlowMat2 = new THREE.SpriteMaterial({ map: flameTex2, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
      const bigGlow2 = new THREE.Sprite(bigGlowMat2);
      bigGlow2.scale.set(0.9, 1.3, 1);
      bigGlow2.position.set(0, 0.25, -0.5);
      mechaGroup.add(bigGlow2);
      mechaGroup.userData.bigGlow = bigGlow2;

      // エンジン光
      const engineLight2 = new THREE.PointLight(0x80c8ff, 0.0, 10, 2);
      engineLight2.position.set(0, 0.25, -0.45);
      mechaGroup.add(engineLight2);
      mechaGroup.userData.engineLight = engineLight2;

      // ヘッドライト補助光（フェイスの明るさ）
      const head2 = new THREE.PointLight(0x80ffb0, 0.9, 3, 2);
      head2.position.set(0, 0.48, 0.15);
      mechaGroup.add(head2);

      // 全身ライム（リムライトで輪郭を引き立てる）
      const rim = new THREE.PointLight(0x6080ff, 0.6, 3, 2);
      rim.position.set(0, 0.2, 1.0);
      mechaGroup.add(rim);

      // ナビライト（胴体下の点滅赤）
      const blinkWhite2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4040 }));
      blinkWhite2.position.set(0, -0.07, 0.12);
      mechaGroup.add(blinkWhite2);
      mechaGroup.userData.blinkWhite = blinkWhite2;

      // メカ全体のスケール
      mechaGroup.scale.setScalar(0.75);

      // アニメーション用に主要ピボットを保存
      mechaGroup.userData.parts = {
        head: headPivot,
        wingL: wingPivots.wingL,
        wingR: wingPivots.wingR,
        armL: armPivots.armL,
        armR: armPivots.armR,
        legL: legPivots.legL.hip, kneeL: legPivots.legL.knee,
        legR: legPivots.legR.hip, kneeR: legPivots.legR.knee,
        beamWings: beamWings,
      };
      mechaGroup.userData.restPose = {
        wingL_y: wingPivots.wingL.rotation.y,
        wingR_y: wingPivots.wingR.rotation.y,
        wingL_z: wingPivots.wingL.rotation.z,
        wingR_z: wingPivots.wingR.rotation.z,
      };
    }
    scene.add(mechaGroup);

    // 🎮 乗り物セレクタ（rocketGroup / mechaGroup を切り替え）
    let activeVehicle = rocketGroup;

    // ============================================================
    // ⭐ 収集アイテム（スターコイン）
    // ============================================================
    // エネルギーオーブ（★ではなく、発光する球＋プラズマリング）
    const starCoinTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 256; sc.height = 256;
      const g = sc.getContext('2d');
      g.translate(128, 128);
      // 外周のソフトグロー
      const outer = g.createRadialGradient(0, 0, 0, 0, 0, 128);
      outer.addColorStop(0, 'rgba(180,240,255,0.55)');
      outer.addColorStop(0.25, 'rgba(140,200,255,0.28)');
      outer.addColorStop(0.55, 'rgba(180,140,255,0.15)');
      outer.addColorStop(1, 'rgba(100,80,180,0)');
      g.fillStyle = outer; g.beginPath(); g.arc(0,0,128,0,Math.PI*2); g.fill();
      // 薄いリング（土星っぽい光輪）
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(200,230,255,0.4)';
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, 0, 62, 14, 0, 0, Math.PI*2); g.stroke();
      g.strokeStyle = 'rgba(255,220,180,0.3)';
      g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, 0, 70, 12, 0.18, 0, Math.PI*2); g.stroke();
      // 中心コア（明るい球）
      const core = g.createRadialGradient(0, 0, 0, 0, 0, 38);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(0.3, 'rgba(220,245,255,0.9)');
      core.addColorStop(0.7, 'rgba(140,200,255,0.4)');
      core.addColorStop(1, 'rgba(120,160,240,0)');
      g.fillStyle = core; g.beginPath(); g.arc(0,0,38,0,Math.PI*2); g.fill();
      // 極小ハイライト
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(-6, -8, 5, 0, Math.PI*2); g.fill();
      return new THREE.CanvasTexture(sc);
    })();
    const collectibles = [];
    const COLLECTIBLE_COUNT = 30;
    for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({ map: starCoinTex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(mat);
      // 惑星軌道の近くにちりばめる
      const ringIdx = Math.floor(Math.random() * 8);
      const baseR = [7, 10, 14, 18, 24, 30, 36, 42][ringIdx];
      const dr = (Math.random() - 0.5) * 4;
      const a = Math.random() * Math.PI * 2;
      sp.position.set(
        Math.cos(a) * (baseR + dr),
        (Math.random() - 0.5) * 6,
        Math.sin(a) * (baseR + dr)
      );
      sp.scale.set(1.5, 1.5, 1);
      sp.userData = { collected: false, spin: Math.random() * Math.PI * 2, bob: Math.random() * Math.PI * 2 };
      scene.add(sp);
      collectibles.push(sp);
    }

    // ============================================================
    // 🌠 ロケットのコントレイル（軌跡）
    // ============================================================
    const TRAIL_LEN = 60;
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(TRAIL_LEN * 3);
    const trailCol = new Float32Array(TRAIL_LEN * 3);
    const trailSiz = new Float32Array(TRAIL_LEN);
    for (let i = 0; i < TRAIL_LEN; i++) {
      trailPos[i*3] = 0; trailPos[i*3+1] = -9999; trailPos[i*3+2] = 0;
      const t = i / TRAIL_LEN;
      trailCol[i*3] = 1.0;
      trailCol[i*3+1] = 0.7 - t * 0.4;
      trailCol[i*3+2] = 0.3;
      trailSiz[i] = (1 - t) * 6 + 1;
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    trailGeo.setAttribute('trailSize', new THREE.BufferAttribute(trailSiz, 1));
    const trailMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: softDotTex }, uOpacity: { value: 0.0 } },
      vertexShader: `
        attribute float trailSize;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vColor = color;
          vSize = trailSize;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = trailSize * 8.0 / -mv.z * 100.0 * 0.01 + trailSize * 3.0;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTex;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vSize;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(vColor, t.a * uOpacity * (vSize / 6.0));
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const trailPoints = new THREE.Points(trailGeo, trailMat);
    scene.add(trailPoints);
    let trailWriteIdx = 0;

    // ============================================================
    // 🎮 ゲーム状態
    // ============================================================
    const game = {
      stars: 0,
      planets: 0,
      boost: 100,
      combo: 0,
      comboTimer: 0,
    };

    // Web Audio（軽いSE）
    let audioCtx = null;
    const getCtx = () => audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    function beep(freq, dur, type = 'sine', gain = 0.06) {
      try {
        const c = getCtx();
        const o = c.createOscillator(); const g = c.createGain();
        o.type = type; o.frequency.value = freq;
        o.connect(g); g.connect(c.destination);
        g.gain.setValueAtTime(gain, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        o.start(); o.stop(c.currentTime + dur);
      } catch(e) {}
    }
    function playCollect(combo) {
      const base = 660 + combo * 40;
      beep(base, 0.08, 'triangle', 0.07);
      setTimeout(() => beep(base * 1.5, 0.1, 'triangle', 0.05), 60);
    }
    function playArrive() {
      beep(392, 0.1, 'sine', 0.08);
      setTimeout(() => beep(494, 0.1, 'sine', 0.08), 100);
      setTimeout(() => beep(659, 0.2, 'sine', 0.1), 200);
    }
    function playBoost() { beep(80, 0.15, 'sawtooth', 0.04); }

    let rocketMode = false;
    const rocketPos = new THREE.Vector3(0, 10, 40);
    const rocketVel = new THREE.Vector3(0, 0, 0);
    let rocketYaw = Math.PI; // 太陽の方向へ
    let rocketPitch = -0.1;
    let rocketRoll = 0; // バンク（マリオカート的）
    const dpadState = { up:false, down:false, left:false, right:false };
    let thrustHold = false;
    let brakeHold = false;
    let visitedPlanet = null; // 直近訪問した惑星（連続トリガー防止）
    const rocketToggle = ov.querySelector('#cosmosRocketToggle');
    const rocketUI = ov.querySelector('#cosmosRocketUI');
    const rcTarget = ov.querySelector('#rcTarget');
    const rcDist = ov.querySelector('#rcDist');
    const rcSpd = ov.querySelector('#rcSpd');
    // 乗り物セレクタ
    ov.querySelectorAll('#cosmosVehiclePick .cvp-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.vehicle;
        const target = v === 'mecha' ? mechaGroup : rocketGroup;
        if (target === activeVehicle) return;
        // アクティブUI更新
        ov.querySelectorAll('#cosmosVehiclePick .cvp-opt').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        // 切り替え
        const wasVisible = activeVehicle.visible;
        activeVehicle.visible = false;
        activeVehicle = target;
        activeVehicle.visible = wasVisible;
        // ROCKETトグルラベル更新
        rocketToggle.textContent = v === 'mecha' ? '🤖 MECHA' : '🚀 ROCKET';
        haptic(10);
        beep(v === 'mecha' ? 440 : 520, 0.08, 'sine', 0.06);
      });
    });

    rocketToggle.addEventListener('click', () => {
      if (phase !== 'universe') return;
      rocketMode = !rocketMode;
      rocketToggle.classList.toggle('active', rocketMode);
      rocketUI.classList.toggle('show', rocketMode);
      ov.querySelector('#cosmosZoomCtrl').style.display = rocketMode ? 'none' : '';
      if (rocketMode) {
        // カメラ位置の少し前方から出発
        rocketPos.copy(camera.position);
        rocketVel.set(0,0,0);
        // 初期向き：太陽（原点）方向
        const dir = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), rocketPos).normalize();
        rocketYaw = Math.atan2(dir.x, dir.z);
        rocketPitch = Math.asin(dir.y);
        rocketRoll = 0;
        activeVehicle.visible = true;
        hud.textContent = (activeVehicle === mechaGroup ? '🤖' : '🚀') + ' 十字キーで操縦 / BOOSTで加速';
        hud.classList.add('show');
        setTimeout(() => hud.classList.remove('show'), 3000);
      } else {
        visitedPlanet = null;
        activeVehicle.visible = false;
      }
    });
    // 十字キー（押下中ずっと入力）
    const holdButton = (btn, onDown, onUp) => {
      const down = (e) => { e.preventDefault(); onDown(); };
      const up = (e) => { e.preventDefault(); onUp(); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    };
    ov.querySelectorAll('[data-dpad]').forEach(btn => {
      const dir = btn.dataset.dpad;
      holdButton(btn, () => { dpadState[dir] = true; }, () => { dpadState[dir] = false; });
    });
    holdButton(ov.querySelector('#cosmosBoost'), () => { thrustHold = true; if (game.boost > 5) playBoost(); }, () => { thrustHold = false; });
    holdButton(ov.querySelector('#cosmosBrake'), () => { brakeHold = true; }, () => { brakeHold = false; });
    // キーボード対応（PC向けボーナス）
    const keyMap = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' };
    window.addEventListener('keydown', (e) => {
      if (!rocketMode) return;
      if (keyMap[e.key]) { dpadState[keyMap[e.key]] = true; e.preventDefault(); }
      if (e.key === ' ' || e.key === 'Shift') { thrustHold = true; e.preventDefault(); }
      if (e.key === 'z' || e.key === 'Z') { brakeHold = true; }
    });
    window.addEventListener('keyup', (e) => {
      if (keyMap[e.key]) dpadState[keyMap[e.key]] = false;
      if (e.key === ' ' || e.key === 'Shift') thrustHold = false;
      if (e.key === 'z' || e.key === 'Z') brakeHold = false;
    });
    function rocketForward() {
      const cp = Math.cos(rocketPitch), sp = Math.sin(rocketPitch);
      const cy = Math.cos(rocketYaw), sy = Math.sin(rocketYaw);
      return new THREE.Vector3(cp * sy, sp, cp * cy);
    }
    function rocketUpdate() {
      // 十字キーで向き変更（マリオカート的 easing）
      const turnRate = 0.022;
      const pitchRate = 0.018;
      if (dpadState.left)  rocketYaw   += turnRate;
      if (dpadState.right) rocketYaw   -= turnRate;
      if (dpadState.up)    rocketPitch += pitchRate;
      if (dpadState.down)  rocketPitch -= pitchRate;
      rocketPitch = Math.max(-1.3, Math.min(1.3, rocketPitch));
      // バンク（左右入力で傾く）
      const targetRoll = (dpadState.left ? 0.5 : 0) + (dpadState.right ? -0.5 : 0);
      rocketRoll += (targetRoll - rocketRoll) * 0.12;
      // 推進（ブーストはゲージ消費）
      const fwd = rocketForward();
      const boostActive = thrustHold && game.boost > 0;
      if (boostActive) {
        rocketVel.addScaledVector(fwd, 0.06);
        game.boost = Math.max(0, game.boost - 0.8);
      } else if (thrustHold) {
        // ゲージ切れでも弱めに前進
        rocketVel.addScaledVector(fwd, 0.02);
      } else {
        // ブースト自然回復
        game.boost = Math.min(100, game.boost + 0.35);
      }
      if (brakeHold) {
        rocketVel.multiplyScalar(0.9);
      }
      // 最高速度クランプ（気持ちよさのため）
      const maxSpd = boostActive ? 4.0 : 2.8;
      const sp = rocketVel.length();
      if (sp > maxSpd) rocketVel.multiplyScalar(maxSpd / sp);
      // 僅かなドラッグ（ゲーム的）
      rocketVel.multiplyScalar(0.995);
      rocketPos.add(rocketVel);
      // 宇宙の果てガード
      const maxR = 140;
      if (rocketPos.length() > maxR) {
        rocketPos.setLength(maxR);
        rocketVel.multiplyScalar(0.3);
      }
      // ロケットの位置・姿勢を更新
      activeVehicle.position.copy(rocketPos);
      // Euler: yaw(Y) -> pitch(X) -> roll(Z)
      activeVehicle.rotation.set(0, 0, 0);
      activeVehicle.rotateY(rocketYaw);
      activeVehicle.rotateX(-rocketPitch);
      activeVehicle.rotateZ(rocketRoll);
      // 🤖 メカのパーツアニメーション
      const parts = activeVehicle.userData.parts;
      if (parts) {
        const t = universeTime;
        const rest = activeVehicle.userData.restPose;
        // 🦅 翼: アイドルで微フラップ、BOOSTで展開、ターンで逆方向にチルト
        const flap = Math.sin(t * 1.6) * 0.05;
        const boostSpread = boostActive ? 0.22 : (thrustHold ? 0.12 : 0);
        const turnTilt = rocketRoll * 0.6;
        if (parts.wingL) {
          parts.wingL.rotation.z = rest.wingL_z + flap - boostSpread + turnTilt;
          parts.wingL.rotation.y = rest.wingL_y - boostSpread * 0.6;
        }
        if (parts.wingR) {
          parts.wingR.rotation.z = rest.wingR_z - flap + boostSpread + turnTilt;
          parts.wingR.rotation.y = rest.wingR_y + boostSpread * 0.6;
        }
        // 💪 腕: 走る動作（脚と逆位相）+ ターンで傾く + BOOSTで後方へ
        const armStride = Math.sin(t * 1.4) * 0.3; // 脚と同じ周期
        const armTurn = rocketRoll * -0.8;
        const armBack = boostActive ? 0.6 : (thrustHold ? 0.3 : 0);
        if (parts.armL) {
          // 左腕は脚と逆（右脚前→左腕前の自然な走り）
          parts.armL.rotation.x = -armStride - armBack;
          parts.armL.rotation.z = armTurn + 0.08;
        }
        if (parts.armR) {
          parts.armR.rotation.x = armStride - armBack;
          parts.armR.rotation.z = armTurn - 0.08;
        }
        // 🧠 頭: 進行方向を少し向く + アイドルの小揺れ
        if (parts.head) {
          parts.head.rotation.y = -rocketRoll * 0.3 + Math.sin(t * 0.6) * 0.05;
          parts.head.rotation.x = rocketPitch * 0.2 + Math.sin(t * 0.9) * 0.03;
        }
        // 🦵 脚: 浮遊時にゆっくり走るようなキック + BOOSTで後方へ蹴る
        // 股関節（X軸で前後、Z軸で開き）
        const stride = Math.sin(t * 1.4) * 0.22;
        const idleOpen = 0.04 + Math.sin(t * 0.7) * 0.02;
        const boostKick = boostActive ? 0.5 : (thrustHold ? 0.3 : 0); // BOOSTで脚が後方に
        if (parts.legL) {
          parts.legL.rotation.x = stride - boostKick + 0.05;
          parts.legL.rotation.z = -idleOpen;
        }
        if (parts.legR) {
          parts.legR.rotation.x = -stride - boostKick + 0.05;
          parts.legR.rotation.z = idleOpen;
        }
        // 膝: 交互に曲げる（走る動作）+ BOOSTで軽く曲げる
        const kneeBendBase = boostActive ? 0.4 : 0.12;
        if (parts.kneeL) {
          parts.kneeL.rotation.x = kneeBendBase + Math.max(0, -Math.sin(t * 1.4)) * 0.35;
        }
        if (parts.kneeR) {
          parts.kneeR.rotation.x = kneeBendBase + Math.max(0, Math.sin(t * 1.4)) * 0.35;
        }
        // ✨ ビームウィング: BOOST時にフェードイン + 揺らぎ
        if (parts.beamWings) {
          const target = boostActive ? 0.85 : (thrustHold ? 0.35 : 0);
          parts.beamWings.forEach((b, i) => {
            const wobble = Math.sin(t * 8 + i * 1.3) * 0.1;
            b.material.opacity += (Math.max(0, target + wobble) - b.material.opacity) * 0.2;
          });
        }
        // 🫁 全身ブリージング（スケール微脈動）
        const breath = 1 + Math.sin(t * 0.9) * 0.008;
        activeVehicle.scale.setScalar(0.75 * breath);
      }
      // 噴射炎とエンジン光
      const flames = activeVehicle.userData.flames;
      const bigGlow = activeVehicle.userData.bigGlow;
      const eLight = activeVehicle.userData.engineLight;
      const flameTarget = boostActive ? 0.95 : (thrustHold ? 0.7 : sp > 0.05 ? 0.3 : 0);
      flames.forEach(fl => {
        fl.material.opacity += (flameTarget - fl.material.opacity) * 0.3;
        const scl = 1 + (boostActive ? 0.8 : thrustHold ? 0.3 : 0) + Math.random() * 0.15;
        fl.scale.set(0.28, 0.75 * scl, 1);
      });
      bigGlow.material.opacity += (flameTarget * 0.6 - bigGlow.material.opacity) * 0.3;
      eLight.intensity += ((boostActive ? 3.2 : thrustHold ? 2.0 : sp * 0.5) - eLight.intensity) * 0.3;
      eLight.color.setHex(boostActive ? 0x80c8ff : 0x60a0ff);
      // ナビライト点滅
      const bw = activeVehicle.userData.blinkWhite;
      if (bw) bw.visible = Math.floor(universeTime * 2) % 2 === 0;
      // カメラ：三人称ビュー（ロケット後方やや上）+ シェイク
      const back = fwd.clone().multiplyScalar(-4.5);
      const up = new THREE.Vector3(0,1,0);
      const camTarget = rocketPos.clone().add(back).addScaledVector(up, 1.8);
      // 高速時カメラシェイク
      const shakeAmt = boostActive ? 0.12 : sp > 2 ? 0.04 : 0;
      if (shakeAmt > 0) {
        camTarget.x += (Math.random() - 0.5) * shakeAmt;
        camTarget.y += (Math.random() - 0.5) * shakeAmt;
      }
      camera.position.lerp(camTarget, 0.18);
      const look = rocketPos.clone().addScaledVector(fwd, 6);
      camera.lookAt(look);

      // コントレイル書き込み
      const tIdx = trailWriteIdx % TRAIL_LEN;
      const tailPos = rocketPos.clone().addScaledVector(fwd, -0.9);
      trailPos[tIdx*3] = tailPos.x;
      trailPos[tIdx*3+1] = tailPos.y;
      trailPos[tIdx*3+2] = tailPos.z;
      // sizeを最新に
      trailSiz[tIdx] = boostActive ? 6 : 3.5;
      // 書き込み順に基づいて色・サイズを falloff
      for (let i = 0; i < TRAIL_LEN; i++) {
        const age = (trailWriteIdx - i + TRAIL_LEN) % TRAIL_LEN;
        const f = 1 - age / TRAIL_LEN;
        if (i === tIdx) continue;
        trailSiz[i] *= 0.97;
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.trailSize.needsUpdate = true;
      trailMat.uniforms.uOpacity.value = Math.min(0.9, sp * 0.35 + (boostActive ? 0.3 : 0));
      trailWriteIdx++;

      // ⭐ スターコイン衝突判定 + アニメーション
      collectibles.forEach(sp => {
        if (sp.userData.collected) return;
        sp.userData.spin += 0.05;
        sp.material.rotation = sp.userData.spin;
        const bob = Math.sin(universeTime * 2 + sp.userData.bob) * 0.2;
        sp.position.y += bob * 0.01;
        sp.material.opacity = 0.9;
        const d = sp.position.distanceTo(rocketPos);
        if (d < 1.4) {
          sp.userData.collected = true;
          sp.material.opacity = 0;
          sp.visible = false;
          game.stars++;
          game.combo++;
          game.comboTimer = 120;
          ov.querySelector('#sbStars').textContent = game.stars;
          const cEl = ov.querySelector('#sbCombo');
          if (game.combo >= 2) { cEl.style.display = ''; ov.querySelector('#sbComboN').textContent = game.combo; }
          playCollect(game.combo);
          // ポップアニメ
          const pop = ov.querySelector('#cosmosCollectPop');
          pop.textContent = '+' + (100 * game.combo);
          pop.classList.remove('pop'); void pop.offsetWidth; pop.classList.add('pop');
        }
      });
      // コンボタイマー減衰
      if (game.comboTimer > 0) {
        game.comboTimer--;
        if (game.comboTimer === 0) {
          game.combo = 0;
          ov.querySelector('#sbCombo').style.display = 'none';
        }
      }

      // 近接ターゲット検出
      let nearest = null, nearestD = Infinity;
      planetMeshes.forEach(pm => {
        const d = pm.mesh.position.distanceTo(rocketPos);
        if (d < nearestD) { nearestD = d; nearest = pm; }
      });
      // コンパス：未訪問惑星で一番近いものを指す
      let compassTarget = null;
      let minUD = Infinity;
      planetMeshes.forEach(pm => {
        if (pm.mesh.userData.visited) return;
        const d = pm.mesh.position.distanceTo(rocketPos);
        if (d < minUD) { minUD = d; compassTarget = pm; }
      });
      if (compassTarget) {
        const cDir = new THREE.Vector3().subVectors(compassTarget.mesh.position, rocketPos).normalize();
        // 画面座標に投影して矢印を回転
        const projected = cDir.clone().applyQuaternion(camera.quaternion.clone().invert());
        const ang = Math.atan2(projected.x, -projected.y); // 2D向き
        const cp = ov.querySelector('#cosmosCompass');
        cp.style.display = '';
        cp.querySelector('.cp-arrow').style.transform = `rotate(${ang}rad)`;
      } else {
        ov.querySelector('#cosmosCompass').style.display = 'none';
      }

      if (nearest) {
        rcTarget.textContent = nearest.planet.jname;
        rcDist.textContent = nearestD.toFixed(1);
        // 🌍 地球への超接近で世界地図へ自動遷移
        if (nearest.planet.isEarth && nearestD < nearest.planet.size * 2.0 && !activeVehicle.userData.earthDiving) {
          activeVehicle.userData.earthDiving = true;
          const ap = ov.querySelector('#cosmosArrivePopup');
          ap.innerHTML = `<div class="ap-label">🌍 大気圏突入</div><div class="ap-name">地球儀へ</div><div class="ap-bonus">偉人たちが待っている</div>`;
          ap.classList.remove('show'); void ap.offsetWidth; ap.classList.add('show');
          playArrive();
          // ワープフラッシュ→ワールドマップ
          setTimeout(() => {
            const flash = ov.querySelector('#cosmosWarpFlash');
            if (flash) { flash.classList.remove('fire'); void flash.offsetWidth; flash.classList.add('fire'); }
          }, 900);
          setTimeout(() => {
            ov.classList.remove('open');
            setTimeout(() => { ov.remove(); running = false; if (typeof openWorldMap === 'function') openWorldMap(); }, 300);
          }, 1600);
          return;
        }
        // 到着判定: size に応じた半径を広めに取って到着を確実に発火
        const arrivalR = nearest.planet.size * 5 + 3;
        if (nearestD < arrivalR && visitedPlanet !== nearest) {
          visitedPlanet = nearest;
          const ap = ov.querySelector('#cosmosArrivePopup');
          if (!nearest.mesh.userData.visited) {
            // 初回訪問 — ボーナス付きド派手ポップ
            nearest.mesh.userData.visited = true;
            game.planets++;
            ov.querySelector('#sbPlanets').textContent = game.planets;
            if (ap) {
              ap.innerHTML = `<div class="ap-label">🎉 初到着！</div><div class="ap-name">${nearest.planet.jname}</div><div class="ap-bonus">+1000 pt</div>`;
              ap.classList.remove('show'); void ap.offsetWidth; ap.classList.add('show');
              setTimeout(() => ap.classList.remove('show'), 1800);
            }
            playArrive();
            game.stars += 10;
            ov.querySelector('#sbStars').textContent = game.stars;
            haptic(24);
            // 全惑星制覇チェック
            if (game.planets >= planetMeshes.length) {
              setTimeout(() => {
                const ap2 = ov.querySelector('#cosmosArrivePopup');
                if (ap2) {
                  ap2.innerHTML = `<div class="ap-label">🏆 MISSION COMPLETE</div><div class="ap-name">全惑星制覇！</div><div class="ap-bonus">宇宙飛行士認定</div>`;
                  ap2.classList.remove('show'); void ap2.offsetWidth; ap2.classList.add('show');
                }
              }, 2000);
            }
          } else {
            // 再訪問 — 控えめな「到着」ポップ（必ず出す）
            if (ap) {
              ap.innerHTML = `<div class="ap-label">到着</div><div class="ap-name">${nearest.planet.jname}</div>`;
              ap.classList.remove('show'); void ap.offsetWidth; ap.classList.add('show');
              setTimeout(() => ap.classList.remove('show'), 1400);
            }
            haptic(12);
            beep(660, 0.06, 'sine', 0.04);
          }
          showPlanetInfo(nearest);
          rocketVel.multiplyScalar(0.2);
        } else if (nearestD > arrivalR * 2.2) {
          // 離脱判定も緩めて、次回の到着ポップが確実に出るように
          if (visitedPlanet === nearest) visitedPlanet = null;
        }
      }
      rcSpd.textContent = sp.toFixed(2);

      // 🛰️ 衛星接近検出（地球周辺で ISS / HUBBLE のラベル）
      const earthPm = planetMeshes.find(p => p.planet.isEarth);
      if (earthPm && earthPm.mesh.userData.satellites) {
        let nearSat = null, nearSatD = 0.6;
        earthPm.mesh.userData.satellites.forEach(s => {
          const d = s.mesh.position.distanceTo(rocketPos);
          if (d < nearSatD) { nearSatD = d; nearSat = s; }
        });
        const satHud = ov.querySelector('#cosmosSatHud');
        if (nearSat && satHud) {
          satHud.textContent = '🛰️ ' + nearSat.label;
          satHud.classList.add('show');
        } else if (satHud) {
          satHud.classList.remove('show');
        }
      }

      // ブーストゲージUI
      ov.querySelector('#bgFill').style.width = game.boost + '%';
      ov.querySelector('#cosmosBoostGauge').classList.toggle('low', game.boost < 25);

      // スピードライン発動
      const sl = ov.querySelector('#cosmosSpeedLines');
      if (sp > 1.8 || boostActive) sl.classList.add('on');
      else sl.classList.remove('on');
    }
    function showPlanetInfo(pm) {
      const p = pm.mesh.userData;
      if (!p.facts) return;
      const infoEl = ov.querySelector('#cosmosInfoContent');
      const panel = ov.querySelector('#cosmosInfoPanel');
      infoEl.innerHTML = `
        <div class="cosmos-info-name">🚀 到着: ${p.jname}</div>
        <div class="cosmos-info-sub">${p.isBlackHole ? 'BLACK HOLE · いて座A*' : p.name === '地球' ? 'EARTH · 偉人が生まれた星' : p.name.toUpperCase()}</div>
        <dl class="cosmos-info-facts">
          <dt>直径</dt><dd>${p.facts.diameter}</dd>
          <dt>距離</dt><dd>${p.facts.distance}</dd>
          <dt>周期</dt><dd>${p.facts.period}</dd>
          <dt>温度</dt><dd>${p.facts.temp}</dd>
          <dt>衛星</dt><dd>${p.facts.moons}</dd>
          <dt>NASA</dt><dd>${p.facts.nasa}</dd>
        </dl>
        <div class="cosmos-info-trivia">${p.facts.trivia}</div>
        ${buildSymbolBlock(p.name)}
        ${p.isEarth ? `<button class="cosmos-info-cta" id="cosmosInfoCta">🌍 地球儀で偉人を見る</button>` : ''}
      `;
      panel.classList.add('show');
      const cta = infoEl.querySelector('#cosmosInfoCta');
      if (cta) {
        cta.addEventListener('click', () => {
          ov.classList.remove('open');
          setTimeout(() => { ov.remove(); running = false; if (typeof openWorldMap === 'function') openWorldMap(); }, 300);
        });
      }
    }
    function animate() {
      if (!running) return;
      if (phase === 'warp') {
        // ワープ: 星が後ろに流れる ＋ カメラが突進
        const elapsed = (performance.now() - warpStartTime) / 1000;
        // 星をストリーク風に加速(Z軸方向)
        for (let i = 0; i < starCount; i++) {
          spos[i*3+2] += 8 + Math.random() * 4; // 前方に流れる(プレイヤー後方へ)
          if (spos[i*3+2] > 100) {
            const r = 200 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            spos[i*3] = r * Math.sin(phi) * Math.cos(theta);
            spos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
            spos[i*3+2] = -200;
          }
        }
        stars.attributes.position.needsUpdate = true;
        starsMat.uniforms.uOpacity.value = Math.min(1, elapsed * 1.5);
        // ワープ1.5秒後にビッグバンへ
        if (elapsed > 1.5) {
          phase = 'bang';
          bbAge = 0;
        }
      } else if (phase === 'bang') {
        bbAge += 0.016;
        for (let i = 0; i < bbCount; i++) {
          const v = bbVel[i];
          bbPos[i*3] += v.x;
          bbPos[i*3+1] += v.y;
          bbPos[i*3+2] += v.z;
        }
        bbGeo.attributes.position.needsUpdate = true;
        bbMat.opacity = Math.max(0, 0.9 - bbAge * 0.3);
        starsMat.uniforms.uOpacity.value = Math.min(1, bbAge * 0.4);
        sunMat.opacity = Math.min(1, (bbAge - 1) * 0.8);
        sunGlowMat.opacity = Math.min(0.9, Math.max(0, (bbAge - 1) * 0.6));
        // 銀河要素の登場
        const reveal = Math.max(0, Math.min(1, (bbAge - 0.6) / 1.8));
        mwMat.opacity = reveal * 0.75;
        nebulaMeshes.forEach(m => m.material.opacity = reveal * 0.85);
        distantGalaxies.forEach(g => g.material.opacity = reveal * 0.7);
        dustMat.opacity = reveal * 0.55;
        if (bbAge > 1.5) {
          sun.visible = true;
          corona.visible = true;
          corona1.visible = true;
          // chromosphere 非表示（パフォーマンス対策で corona1 に統合）
          planetMeshes.forEach(pm => {
            pm.mesh.visible = true;
            if (pm.mesh.userData.moons) pm.mesh.userData.moons.forEach(m => m.mesh.visible = true);
            if (pm.mesh.userData.ring) pm.mesh.userData.ring.visible = true;
            if (pm.mesh.userData.atmosphere) pm.mesh.userData.atmosphere.visible = true;
            if (pm.mesh.userData.accretion) pm.mesh.userData.accretion.visible = true;
            if (pm.mesh.userData.bhHalo) pm.mesh.userData.bhHalo.visible = true;
            if (pm.mesh.userData.isBlackHole) pm.orbit.material.opacity = 0.0;
            else pm.orbit.material.opacity = 0.12;
            if (pm.mesh.userData.atmShell) pm.mesh.userData.atmShell.visible = true;
          });
          astMat.opacity = 0.7; kbMat.opacity = 0.5;
          // プロミネンス・彗星・太陽風を出現
          prominences.forEach(pr => pr.mesh.visible = true);
          cometCore.visible = true;
        }
        if (bbAge > 3) {
          phase = 'universe';
          bbPoints.visible = false;
          startAmbient();
          hud.classList.add('show');
          hud.textContent = '🪐 惑星をタップ';
          setTimeout(() => hud.classList.remove('show'), 3500);
        }
      } else if (phase === 'universe') {
        universeTime += 0.016;
        planetMeshes.forEach(pm => {
          pm.mesh.userData.angle += pm.planet.speed * timeSpeed;
          const a = pm.mesh.userData.angle;
          pm.mesh.position.set(Math.cos(a) * pm.planet.dist, 0, Math.sin(a) * pm.planet.dist);
          if (pm.mesh.userData.moons) {
            pm.mesh.userData.moons.forEach(m => {
              m.angle += 0.005 * m.speed / 6 * timeSpeed;
              const o = m.orbit;
              m.mesh.position.set(
                pm.mesh.position.x + Math.cos(m.angle) * o,
                Math.sin(m.angle * 0.7) * 0.25,
                pm.mesh.position.z + Math.sin(m.angle) * o
              );
            });
          }
          if (pm.mesh.userData.satellites) {
            // 地球に近いときだけ表示
            const distToRocket = rocketMode ? rocketPos.distanceTo(pm.mesh.position) : 999;
            const show = distToRocket < 8 || !rocketMode; // 非ロケット時は常時（遠いので小さく見える）
            pm.mesh.userData.satellites.forEach(s => {
              s.angle += 0.005 * s.speed / 10 * timeSpeed;
              s.axis += 0.02;
              // 軌道平面：inclin 傾斜
              const o = s.orbit;
              const x = Math.cos(s.angle) * o;
              const z = Math.sin(s.angle) * o;
              const y = Math.sin(s.angle) * o * Math.sin(s.inclin);
              const z2 = z * Math.cos(s.inclin);
              s.mesh.position.set(
                pm.mesh.position.x + x,
                pm.mesh.position.y + y,
                pm.mesh.position.z + z2
              );
              s.mesh.rotation.y = s.axis;
              s.mesh.visible = show && pm.mesh.visible;
              // ISSの点滅ライト
              if (s.mesh.userData && s.mesh.userData.blink) {
                s.mesh.userData.blink.visible = Math.floor(universeTime * 3) % 2 === 0;
              }
            });
          }
          if (pm.mesh.userData.ring) {
            pm.mesh.userData.ring.position.copy(pm.mesh.position);
          }
          if (pm.mesh.userData.atmosphere) {
            pm.mesh.userData.atmosphere.position.copy(pm.mesh.position);
          }
          if (pm.mesh.userData.atmShell) {
            pm.mesh.userData.atmShell.position.copy(pm.mesh.position);
          }
          if (pm.mesh.userData.accretion) {
            pm.mesh.userData.accretion.position.copy(pm.mesh.position);
            pm.mesh.userData.accretion.rotation.z += 0.005;
          }
          if (pm.mesh.userData.bhHalo) {
            pm.mesh.userData.bhHalo.position.copy(pm.mesh.position);
          }
          pm.mesh.rotation.y += 0.01;
        });
        sun.rotation.y += 0.002;
        // 🌹 Prince mode: 小惑星群がゆっくりドリフト + 自転
        if (modes.prince && princeGroup) {
          princeGroup.rotation.y += 0.0015;
          princeGroup.children.forEach((c, i) => {
            if (c.isMesh) {
              c.rotation.y += 0.008 + (i % 5) * 0.001;
            }
          });
          // 王子・バラ・キツネのアニメ
          const t = princeGroup.userData.targets;
          if (t) {
            if (t.b612 && t.b612.prince) {
              // 王子様を B-612 の上で揺らす
              const p = t.b612.planet;
              const d = PRINCE_DATA.find(x => x.id === 'b612');
              t.b612.prince.position.set(p.position.x, p.position.y + d.size + 0.02 + Math.sin(universeTime * 0.8) * 0.01, p.position.z);
              t.b612.prince.rotation.y += 0.003;
            }
            if (t.b612 && t.b612.rose) {
              const p = t.b612.planet;
              const d = PRINCE_DATA.find(x => x.id === 'b612');
              t.b612.rose.position.set(p.position.x + 0.35, p.position.y + d.size - 0.02, p.position.z);
              t.b612.rose.rotation.z = -0.15 + Math.sin(universeTime * 0.6) * 0.04;
            }
            if (t.fox && t.fox.fox) {
              const p = t.fox.planet;
              const d = PRINCE_DATA.find(x => x.id === 'fox');
              t.fox.fox.position.set(p.position.x, p.position.y + d.size + 0.02, p.position.z);
              t.fox.fox.rotation.y += 0.005;
              // 尻尾振り風に上下
              t.fox.fox.position.y += Math.sin(universeTime * 2) * 0.008;
            }
          }
          // 🌌 ダイブ: princeDiveTarget に向かってカメラを寄せる
          if (princeDiveTarget) {
            const tp = princeDiveTarget.position;
            const lerp = 0.05;
            const offset = new THREE.Vector3(0, 0.8, 2.5);
            camera.position.x += (tp.x + offset.x - camera.position.x) * lerp;
            camera.position.y += (tp.y + offset.y - camera.position.y) * lerp;
            camera.position.z += (tp.z + offset.z - camera.position.z) * lerp;
            camera.lookAt(tp);
            cameraZoomTarget = null; // 既存のズーム停止
          }
        }
        // 🌌 軌道トレイル更新
        if (modes.trails) {
          planetTrails.forEach(t => {
            const p = t.pm.mesh.position;
            const idx = t.write % t.N;
            t.posArr[idx*3] = p.x; t.posArr[idx*3+1] = p.y; t.posArr[idx*3+2] = p.z;
            t.write++;
            t.count = Math.min(t.count + 1, t.N);
            // setDrawRange: 順序に沿って描画（未満なら0から、フルなら循環せずカット）
            if (t.count < t.N) {
              t.line.geometry.setDrawRange(0, t.count);
            } else {
              // リングバッファ: 描画範囲をwrite点から前N個の連続区間に絞る
              // シンプルに: 1周回っていれば全てを描画。ただ最新→最古で飛ぶ点は
              // 1点だけなので視覚的にほぼ気にならない
              t.line.geometry.setDrawRange(0, t.N);
            }
            t.line.geometry.attributes.position.needsUpdate = true;
          });
        }
        // 🎬 ツアーモード: 12秒ごとに次の惑星へ
        if (modes.tour) {
          tourTimer += 0.016;
          if (tourTimer > 12) {
            tourTimer = 0;
            tourIdx = (tourIdx + 1) % planetMeshes.length;
            cameraZoomTarget = planetMeshes[tourIdx];
            flashBanner(`🎬 到着: ${planetMeshes[tourIdx].planet.jname}`);
          }
        }
        // 🌑 日食検出（月-地球-太陽が一直線）
        if (eclipseCooldown > 0) eclipseCooldown -= 0.016;
        else {
          const earthPm = planetMeshes.find(p => p.planet.isEarth);
          if (earthPm && earthPm.mesh.userData.moons && earthPm.mesh.userData.moons.length > 0) {
            const moon = earthPm.mesh.userData.moons[0].mesh;
            const earthPos = earthPm.mesh.position;
            const sunToEarth = earthPos.clone().normalize();
            const earthToMoon = moon.position.clone().sub(earthPos);
            const mDist = earthToMoon.length();
            if (mDist > 0.01) {
              earthToMoon.divideScalar(mDist);
              // 月が地球から太陽方向へ伸びているか（月-地球ベクトル = -太陽方向とほぼ一致）
              const align = earthToMoon.dot(sunToEarth.clone().negate());
              if (align > 0.995) {
                flashBanner('🌑 日食発生！月が太陽を覆う', 3500);
                cameraZoomTarget = earthPm;
                eclipseCooldown = 30; // 30秒クールダウン
              }
            }
          }
        }
        // 🌠 流星群: 45秒ごとに発動
        meteorTimer += 0.016;
        if (meteorTimer > 45 && meteorBurst === 0) {
          meteorBurst = 24;
          meteorTimer = 0;
          flashBanner('🌠 流星群襲来！', 3000);
        }
        if (meteorBurst > 0 && shootingStars.length < 12 && Math.random() < 0.5) {
          spawnShootingStar();
          meteorBurst--;
        }
        // ✒️ 真理ティッカー切り替え（9秒ごと）
        truthCycleTimer += 0.016;
        if (truthCycleTimer > 9) {
          truthCycleTimer = 0;
          truthIdx++;
          updateTicker();
        }
        // 🌠 願い星の呼吸（ゆっくり輝度がゆらぐ）
        wishStars.forEach(s => {
          s.userData.phase += 0.018;
          const sc = s.userData.baseScale * (1 + 0.25 * Math.sin(s.userData.phase));
          s.scale.set(sc, sc, 1);
          s.material.opacity = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(s.userData.phase * 0.7));
        });
        // 🧘 瞑想中の呼吸効果（宇宙全体がゆらぐ）
        if (modes.meditate) {
          const breath = 0.95 + 0.05 * Math.sin(universeTime * 0.6);
          scene.scale.setScalar(breath);
        } else if (scene.scale.x !== 1) {
          scene.scale.setScalar(1);
        }
        // ☀️ 太陽シェーダの時間更新
        sunMat.uniforms.uTime.value = universeTime;
        chromoMat.uniforms.uTime.value = universeTime;
        coronaMat1.uniforms.uTime.value = universeTime;
        coronaMat.uniforms.uTime.value = universeTime;
        // ☀️ プロミネンス：脈動＋ゆっくり回転
        prominences.forEach(pr => {
          pr.phase += 0.02;
          pr.mat.opacity = 0.4 + Math.sin(pr.phase) * 0.3;
          pr.mesh.rotation.z = pr.baseRot + universeTime * 0.05;
        });
        // ☄️ 彗星の公転と尾
        cometState.angle += cometState.speed * timeSpeed;
        const ca = cometState.angle;
        const cx2 = Math.cos(ca) * cometState.a;
        const cz2 = Math.sin(ca) * cometState.b;
        const cy2 = Math.sin(ca * 0.8) * 3;
        // 軌道傾き
        const cyR = cy2 * Math.cos(cometState.rotZ) - cz2 * Math.sin(cometState.rotZ);
        const czR = cy2 * Math.sin(cometState.rotZ) + cz2 * Math.cos(cometState.rotZ);
        cometCore.position.set(cx2, cyR, czR);
        cometCorona.position.copy(cometCore.position);
        // 尾：太陽から遠ざかる方向へ伸ばす（太陽は原点）
        const tailDir = cometCore.position.clone().normalize();
        const dSun = cometCore.position.length();
        const tailLen = Math.max(3, 20 / Math.max(dSun * 0.12, 0.4)); // 太陽に近いと長い
        const tailOpacity = Math.max(0.2, Math.min(1, 60 / (dSun * dSun + 1)));
        cometCoronaMat.opacity = tailOpacity * 0.9;
        cometCorona.scale.setScalar(1.2 + 3 / Math.max(dSun * 0.3, 1));
        cometTailMat.uniforms.uOpacity.value = tailOpacity;
        for (let i = 0; i < cometTailCount; i++) {
          const t = i / cometTailCount;
          // ダスト尾は少し曲がる（公転方向に遅れる）
          const curve = (i % 2 === 0) ? 0 : Math.sin(t * Math.PI) * 0.8;
          const perp = new THREE.Vector3(-tailDir.z, 0, tailDir.x);
          const p = cometCore.position.clone()
            .addScaledVector(tailDir, t * tailLen)
            .addScaledVector(perp, curve);
          cometTailPos[i*3] = p.x; cometTailPos[i*3+1] = p.y; cometTailPos[i*3+2] = p.z;
        }
        cometTailGeo.attributes.position.needsUpdate = true;
        // 🌟 太陽風：放射方向に流れる
        for (let i = 0; i < swCount; i++) {
          const v = swVel[i];
          swPos[i*3] += v.vx; swPos[i*3+1] += v.vy; swPos[i*3+2] += v.vz;
          const r = Math.hypot(swPos[i*3], swPos[i*3+1], swPos[i*3+2]);
          if (r > 50) {
            // 太陽近傍からリスポーン
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r0 = 4;
            swPos[i*3] = r0 * Math.sin(phi) * Math.cos(theta);
            swPos[i*3+1] = r0 * Math.sin(phi) * Math.sin(theta);
            swPos[i*3+2] = r0 * Math.cos(phi);
            v.vx = swPos[i*3] * 0.015; v.vy = swPos[i*3+1] * 0.015; v.vz = swPos[i*3+2] * 0.015;
          }
        }
        swGeo.attributes.position.needsUpdate = true;
        swMat.opacity = 0.35;
        // ベルトの軌道回転
        astPoints.rotation.y += 0.0008;
        kbPoints.rotation.y += 0.0003;
        // 🌌 銀河・星雲のゆるやかなドリフト + 瞬き
        starsMat.uniforms.uTwinkle.value += 0.08;
        starsPoints.rotation.y += 0.00005;
        milkyWay.rotation.y += 0.00004;
        nebulaMeshes.forEach((m, i) => {
          m.material.rotation = Math.sin(universeTime * 0.05 + i) * 0.06;
        });
        distantGalaxies.forEach((g, i) => {
          g.material.rotation += 0.0003 * (i % 2 === 0 ? 1 : -1);
        });
        dustPoints.rotation.y += 0.0002;
        dustPoints.rotation.x += 0.0001;
        // ランダムに流れ星（低確率）
        if (Math.random() < 0.008 && shootingStars.length < 5) spawnShootingStar();
        // 流れ星を動かす
        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const s = shootingStars[i];
          s.life++;
          s.pts[0] += s.dx; s.pts[1] += s.dy; s.pts[2] += s.dz;
          s.pts[3] += s.dx; s.pts[4] += s.dy; s.pts[5] += s.dz;
          s.geo.attributes.position.needsUpdate = true;
          s.mat.opacity = Math.max(0, 0.9 - s.life / s.maxLife);
          if (s.life > s.maxLife) {
            scene.remove(s.line);
            s.geo.dispose(); s.mat.dispose();
            shootingStars.splice(i, 1);
          }
        }
        // カメラ
        if (rocketMode) {
          rocketUpdate();
        } else if (cameraZoomTarget) {
          const t = cameraZoomTarget.mesh;
          // スムーズ減衰（距離が大きいほど早く、近づくほどゆっくり）
          const dx = t.position.x * 1.3 - camera.position.x;
          const dy = 8 - camera.position.y;
          const dz = t.position.z * 1.3 + 8 - camera.position.z;
          const dist = Math.hypot(dx, dy, dz);
          // critically-damped spring のようなカーブ
          const lerp = Math.min(0.09, 0.025 + dist * 0.005);
          camera.position.x += dx * lerp;
          camera.position.y += dy * lerp;
          camera.position.z += dz * lerp;
          camera.lookAt(t.position);
        } else if (!userControlling) {
          // 自動旋回（ユーザー操作中は停止）
          const cAng = universeTime * 0.03 + userRotation;
          const camDist = userZoom;
          camera.position.x = Math.cos(cAng) * camDist;
          camera.position.z = Math.sin(cAng) * camDist;
          camera.position.y = 20 + Math.sin(universeTime * 0.1) * 8 + userTilt * 30;
          camera.lookAt(0, 0, 0);
        } else {
          // ユーザー操作: 手動回転
          const camDist = userZoom;
          camera.position.x = Math.cos(userRotation) * camDist;
          camera.position.z = Math.sin(userRotation) * camDist;
          camera.position.y = 20 + userTilt * 30;
          camera.lookAt(0, 0, 0);
        }
      }
      renderer.render(scene, camera);
      // ⭐ 星座ラベル投影
      if (modes.constellations && labelDivs.length) {
        const W = window.innerWidth, H = window.innerHeight;
        labelDivs.forEach(l => {
          const s = l.pos.clone().project(camera);
          const behind = s.z > 1;
          l.div.style.left = ((s.x + 1) / 2 * W) + 'px';
          l.div.style.top = ((1 - (s.y + 1) / 2) * H) + 'px';
          l.div.style.opacity = behind ? 0 : 0.75;
        });
      }
      // 👤 偉人ラベル投影
      if (modes.ijin && ijinLabels.length) {
        const W = window.innerWidth, H = window.innerHeight;
        ijinLabels.forEach(l => {
          const s = l.pos.clone().project(camera);
          const behind = s.z > 1;
          l.div.style.left = ((s.x + 1) / 2 * W) + 'px';
          l.div.style.top = ((1 - (s.y + 1) / 2) * H) + 'px';
          l.div.style.opacity = behind ? 0 : 0.85;
        });
      }
      requestAnimationFrame(animate);
    }
    animate();

    // クリック判定：惑星ピック
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('click', (e) => {
      if (phase !== 'universe') return;
      if (rocketMode) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const targets = planetMeshes.map(p => p.mesh).concat(sun.visible ? [sun] : []);
      const hit = raycaster.intersectObjects(targets, false)[0];
      if (!hit) {
        // 願い星モードなら、空タップ位置を願いポジションに
        if (modes.wish) {
          // カメラから前方向に一定距離の位置に配置
          const ndc = mouse.clone();
          const v = new THREE.Vector3(ndc.x, ndc.y, 0.9).unproject(camera);
          pendingWishPos = v;
          wishInput.value = '';
          wishDialog.classList.add('show');
          setTimeout(() => wishInput.focus(), 100);
          return;
        }
        // 何もないところをタップ → ズーム解除
        cameraZoomTarget = null;
        hud.classList.remove('show');
        return;
      }
      const p = hit.object.userData;
      // タップフィードバック（全共通）
      haptic(12);
      beep(640, 0.05, 'sine', 0.04);
      setTimeout(() => beep(960, 0.08, 'sine', 0.035), 50);
      // 太陽をタップ → 情報パネル（惑星と同じフォーマット）
      if (hit.object === sun) {
        const infoEl = ov.querySelector('#cosmosInfoContent');
        const panel = ov.querySelector('#cosmosInfoPanel');
        infoEl.innerHTML = `
          <div class="cosmos-info-name">☀️ ${p.jname}</div>
          <div class="cosmos-info-sub">SUN · G型主系列星</div>
          <dl class="cosmos-info-facts">
            <dt>直径</dt><dd>${p.facts.diameter}</dd>
            <dt>距離</dt><dd>${p.facts.distance}</dd>
            <dt>周期</dt><dd>${p.facts.period}</dd>
            <dt>温度</dt><dd>${p.facts.temp}</dd>
            <dt>衛星</dt><dd>${p.facts.moons}</dd>
            <dt>NASA</dt><dd>${p.facts.nasa}</dd>
          </dl>
          <div class="cosmos-info-trivia">${p.facts.trivia}</div>
          ${buildSymbolBlock('太陽')}
        `;
        panel.classList.add('show');
        return;
      }
      const pm = planetMeshes.find(x => x.mesh === hit.object);
      hud.classList.remove('show');
      // 既にズーム済みの同じ惑星を再タップ
      if (cameraZoomTarget && cameraZoomTarget.mesh === hit.object) {
        if (p.isEarth) {
          setTimeout(() => {
            ov.classList.remove('open');
            setTimeout(() => { ov.remove(); running = false; if (typeof openWorldMap === 'function') openWorldMap(); }, 300);
          }, 200);
        }
        return;
      }
      // 初回タップ → ズームイン + 情報パネル表示
      cameraZoomTarget = pm;
      if (p.facts) {
        const infoEl = ov.querySelector('#cosmosInfoContent');
        const panel = ov.querySelector('#cosmosInfoPanel');
        infoEl.innerHTML = `
          <div class="cosmos-info-name">${p.jname}</div>
          <div class="cosmos-info-sub">${p.isBlackHole ? 'BLACK HOLE · いて座A*' : p.name === '地球' ? 'EARTH · 偉人が生まれた星' : p.name.toUpperCase()}</div>
          <dl class="cosmos-info-facts">
            <dt>直径</dt><dd>${p.facts.diameter}</dd>
            <dt>距離</dt><dd>${p.facts.distance}</dd>
            <dt>周期</dt><dd>${p.facts.period}</dd>
            <dt>温度</dt><dd>${p.facts.temp}</dd>
            <dt>衛星</dt><dd>${p.facts.moons}</dd>
            <dt>NASA</dt><dd>${p.facts.nasa}</dd>
          </dl>
          <div class="cosmos-info-trivia">${p.facts.trivia}</div>
          ${buildSymbolBlock(p.name)}
          ${p.isEarth ? `<button class="cosmos-info-cta" id="cosmosInfoCta">🌍 偉人たちの地図へ</button>` : ''}
        `;
        panel.classList.add('show');
        const cta = infoEl.querySelector('#cosmosInfoCta');
        if (cta) {
          cta.addEventListener('click', () => {
            ov.classList.remove('open');
            setTimeout(() => { ov.remove(); running = false; if (typeof openWorldMap === 'function') openWorldMap(); }, 300);
          });
        }
      }
    });
    // infoパネル閉じるボタン
    ov.querySelector('.cosmos-info-close')?.addEventListener('click', () => {
      ov.querySelector('#cosmosInfoPanel').classList.remove('show');
      cameraZoomTarget = null;
    });

    // タップ: 意識の接続 → ワープ → ビッグバン → 宇宙
    tapBtn.addEventListener('click', () => {
      consciousConnecting = true;
      consciousLabel.textContent = 'CONSCIOUSNESS · CONNECTING';
      tapBtn.style.pointerEvents = 'none';
      tapBtn.style.opacity = '0.3';
      setTimeout(() => {
        tapBtn.classList.add('bang');
        consciousLabel.classList.add('vanish');
        ccan.style.opacity = '0';
        noise.classList.add('vanish');
        setTimeout(() => {
          tapBtn.style.display = 'none';
          noise.style.display = 'none';
          ccan.style.display = 'none';
          cancelAnimationFrame(consciousRAF);
        }, 600);
        // ワープフラッシュ
        ov.querySelector('#cosmosWarpFlash').classList.add('fire');
        phase = 'warp';
        // ワープ中: 星をストリーク風に加速
        warpStartTime = performance.now();
        bbPoints.visible = true;
      }, 1200);
    }, { once: true });

    // リサイズ
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
    });
  }
  window.openCosmos = openCosmos;

  async function openDriftCalendar() {
    const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
    if (!people.length) return;

    const ov = openDeepOverlay('🎂 365日ドリフトカレンダー', '365日の輪に、生没日を星座のように散らして。',
      `<div class="magic-drift-wrap">
         <svg class="magic-drift-svg" id="magicDriftSvg" viewBox="-300 -300 600 600" preserveAspectRatio="xMidYMid meet"></svg>
         <div class="magic-drift-tip" id="magicDriftTip"></div>
         <div class="magic-drift-legend">
           <div><span class="dot" style="background:var(--gold-light,#d4b055);opacity:0.9"></span>誕生日</div>
           <div><span class="dot" style="background:#c76a6f;opacity:0.7"></span>命日</div>
           <div style="margin-top:4px;opacity:0.6;font-size:10px">ホバーで名前</div>
         </div>
       </div>`);

    const svg = ov.querySelector('#magicDriftSvg');
    const tip = ov.querySelector('#magicDriftTip');
    const wrap = ov.querySelector('.magic-drift-wrap');

    // 日→角度（1月1日=上、時計回り）
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const dayOfYear = (m, d) => {
      let total = 0;
      for (let i = 0; i < m - 1; i++) total += daysInMonth[i];
      return total + (d - 1);
    };
    const angle = (doy) => -Math.PI / 2 + (doy / 365) * Math.PI * 2;

    // リング
    const R_BIRTH = 230;
    const R_DEATH = 195;
    let html = '';
    html += `<circle class="magic-drift-ring" r="${R_BIRTH}" cx="0" cy="0"></circle>`;
    html += `<circle class="magic-drift-ring" r="${R_DEATH}" cx="0" cy="0"></circle>`;
    // 月線・月ラベル
    const monthLabels = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    let cumDay = 0;
    for (let m = 0; m < 12; m++) {
      const a = angle(cumDay);
      const x1 = Math.cos(a) * (R_DEATH - 10), y1 = Math.sin(a) * (R_DEATH - 10);
      const x2 = Math.cos(a) * (R_BIRTH + 18), y2 = Math.sin(a) * (R_BIRTH + 18);
      html += `<line class="magic-drift-month-line" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"></line>`;
      // ラベル位置
      const aLabel = angle(cumDay + daysInMonth[m] / 2);
      const lx = Math.cos(aLabel) * (R_BIRTH + 35), ly = Math.sin(aLabel) * (R_BIRTH + 35);
      html += `<text class="magic-drift-month-label" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}">${monthLabels[m]}</text>`;
      cumDay += daysInMonth[m];
    }
    // 中央エリア（初期はロゴ表示、ドット選択で偉人の顔に切替）
    html += `<g id="driftCenter">
      <image id="driftCenterImg" href="assets/title-logo.png?v=2" x="-90" y="-45" width="180" height="90" preserveAspectRatio="xMidYMid meet"/>
      <text id="driftCenterName" x="0" y="68" class="magic-drift-center-name"></text>
      <text id="driftCenterDate" x="0" y="86" class="magic-drift-center-date"></text>
    </g>`;

    // 偉人の誕生日・命日ドット
    const dots = [];
    people.forEach(p => {
      if (p.birthMonth && p.birthDay) {
        const a = angle(dayOfYear(p.birthMonth, p.birthDay));
        // ランダムで微妙に半径をずらす（重なり回避）
        const jitter = (parseInt(p.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0), 10) % 15);
        const r = R_BIRTH + jitter - 5;
        dots.push({ p, a, r, type: 'birth' });
      }
      if (p.deathMonth && p.deathDay) {
        const a = angle(dayOfYear(p.deathMonth, p.deathDay));
        const jitter = (parseInt(p.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0), 10) % 12);
        const r = R_DEATH - jitter + 3;
        dots.push({ p, a, r, type: 'death' });
      }
    });
    dots.forEach((d, i) => {
      const x = Math.cos(d.a) * d.r;
      const y = Math.sin(d.a) * d.r;
      const cls = d.type === 'birth' ? 'magic-drift-dot magic-drift-dot-birth' : 'magic-drift-dot magic-drift-dot-death';
      html += `<circle class="${cls}" data-idx="${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"></circle>`;
    });

    svg.innerHTML = html;

    svg.querySelectorAll('.magic-drift-dot').forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const d = dots[parseInt(el.dataset.idx, 10)];
        if (!d) return;
        const md = d.type === 'birth' ? `🎂 ${d.p.birthMonth}/${d.p.birthDay}` : `🕯 ${d.p.deathMonth}/${d.p.deathDay}`;
        tip.innerHTML = `<b>${d.p.name}</b><br><small style="opacity:0.7">${md}</small>`;
        tip.style.opacity = '1';
        const rect = wrap.getBoundingClientRect();
        const evt = e;
        tip.style.left = (evt.clientX - rect.left + 12) + 'px';
        tip.style.top = (evt.clientY - rect.top + 12) + 'px';
      });
      el.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
      el.addEventListener('mousemove', (e) => {
        const rect = wrap.getBoundingClientRect();
        tip.style.left = (e.clientX - rect.left + 12) + 'px';
        tip.style.top = (e.clientY - rect.top + 12) + 'px';
      });
      let lastTappedIdx = null;
      let lastTappedAt = 0;
      el.addEventListener('click', () => {
        const d = dots[parseInt(el.dataset.idx, 10)];
        if (!d) return;
        const now = Date.now();
        const idx = parseInt(el.dataset.idx, 10);
        // 同じドットの2回目タップ → 偉人ページへ
        if (idx === lastTappedIdx && (now - lastTappedAt) < 2500) {
          ov.classList.remove('open');
          setTimeout(() => { ov.remove(); if (typeof window.showPerson === 'function') window.showPerson(d.p.id); }, 220);
          return;
        }
        lastTappedIdx = idx;
        lastTappedAt = now;
        // 1回目タップ → 中央に顔写真と名前を表示
        const centerImg = svg.querySelector('#driftCenterImg');
        const centerName = svg.querySelector('#driftCenterName');
        const centerDate = svg.querySelector('#driftCenterDate');
        if (centerImg && d.p.imageUrl) {
          centerImg.setAttribute('href', d.p.imageUrl);
          centerImg.setAttribute('x', '-60');
          centerImg.setAttribute('y', '-60');
          centerImg.setAttribute('width', '120');
          centerImg.setAttribute('height', '120');
          centerImg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          // clip-path は element 座標系（image の origin=TOP-LEFT 基準）なので
          // 120x120 の画像の中心 (60px, 60px) に配置すべし
          centerImg.setAttribute('clip-path', 'circle(60px at 60px 60px)');
        }
        if (centerName) centerName.textContent = d.p.name;
        if (centerDate) {
          const md = d.type === 'birth' ? `🎂 ${d.p.birthMonth}/${d.p.birthDay} 誕生` : `🕯 ${d.p.deathMonth}/${d.p.deathDay} 没`;
          centerDate.textContent = md;
        }
      });
    });
  }

  // ============================================================
  // D) 名言の時代背景（偉人ページ内の名言に注釈を挿入）
  // ============================================================
  function setupQuoteContext() {
    // 偉人ページが描かれる度に発火するので MutationObserver で監視
    if (MAGIC._quoteContextDone) return;
    MAGIC._quoteContextDone = true;
    const annotate = () => {
      // 偉人詳細画面の名言にだけ注釈
      const view = document.getElementById('view-person');
      if (!view || !view.classList.contains('active')) return;
      const quotes = view.querySelectorAll('blockquote.quote, .x-post-card');
      if (quotes.length === 0) return;
      loadPeopleBundle().then(all => {
        if (!all.length) return;
        quotes.forEach(q => {
          if (q.dataset.magicCtx) return;
          q.dataset.magicCtx = '1';
          // 名言の年を探す（記載がなければ偉人の生年+30を仮定）
          const yearMatch = (q.textContent || '').match(/(\d{3,4})年|紀元前(\d+)/);
          // 付近のprofile-nameから偉人特定
          const personName = view.querySelector('.profile-name')?.textContent?.trim();
          const person = personName ? all.find(p => p.name === personName) : null;
          if (!person) return;
          const quoteYear = yearMatch
            ? (yearMatch[1] ? parseInt(yearMatch[1], 10) : -parseInt(yearMatch[2], 10))
            : (person.birth != null ? person.birth + Math.floor((person.death - person.birth) / 2) : null);
          if (quoteYear == null) return;
          // その年、生きていた他の偉人（3人まで）
          const contemporaries = all
            .filter(p => p.id !== person.id && p.birth != null && p.birth <= quoteYear && (p.death == null || p.death >= quoteYear))
            .sort((a, b) => Math.abs((a.birth + ((a.death||quoteYear) - a.birth)/2) - quoteYear) - Math.abs((b.birth + ((b.death||quoteYear) - b.birth)/2) - quoteYear))
            .slice(0, 3);
          if (contemporaries.length === 0) return;
          const ctx = document.createElement('div');
          ctx.className = 'magic-quote-context';
          ctx.innerHTML = `<span class="magic-quote-context-year">${quoteYear < 0 ? '紀元前' + Math.abs(quoteYear) : quoteYear}年ごろ、</span>${contemporaries.map(c => c.name).join('・')} も同じ時代を生きた。`;
          q.appendChild(ctx);
        });
      });
    };
    const mo = new MutationObserver(() => annotate());
    mo.observe(document.body, { childList: true, subtree: true });
    // 初回も
    setTimeout(annotate, 600);
  }

  // ============================================================
  // 14) 地球儀タイムライン — 既存 openWorldMap に年スライダーを後付け
  //    Three.js が利用可能な時だけ、地球儀オーバーレイが開いたのを検知して注入する
  // ============================================================
  function setupGlobeTimeline() {
    // 地球儀オーバーレイ（openDeepOverlay）が開いたら注入する
    const mo = new MutationObserver(() => {
      const ov = document.getElementById('magicDeepOverlay');
      if (!ov) return;
      const wrap = ov.querySelector('#magicGlobeWrap');
      if (!wrap || wrap.querySelector('.magic-globe-timeline')) return;

      // 年の範囲を算出（bundle から）
      const people = MAGIC._peopleBundle || [];
      if (!people.length) return;
      let minY = 9999, maxY = -9999;
      people.forEach(p => {
        if (typeof p.birth === 'number' && p.birth < minY) minY = p.birth;
        const d = typeof p.death === 'number' ? p.death : (new Date().getFullYear());
        if (d > maxY) maxY = d;
      });
      if (minY > maxY) return;

      const bar = document.createElement('div');
      bar.className = 'magic-globe-timeline';
      bar.innerHTML = `
        <div class="mgt-label" id="mgtYearLabel">${maxY}年</div>
        <input type="range" class="mgt-range" id="mgtRange"
               min="${minY}" max="${maxY}" step="1" value="${maxY}" />
        <div class="mgt-meta">
          <span class="mgt-lo">${minY}</span>
          <span class="mgt-count" id="mgtCount">— 名</span>
          <span class="mgt-hi">${maxY}</span>
        </div>
        <div class="mgt-ctrls">
          <button class="mgt-btn" id="mgtPlay" type="button">▷</button>
          <button class="mgt-btn" id="mgtReset" type="button">↺</button>
        </div>
      `;
      wrap.appendChild(bar);

      const label = bar.querySelector('#mgtYearLabel');
      const count = bar.querySelector('#mgtCount');
      const range = bar.querySelector('#mgtRange');
      const playBtn = bar.querySelector('#mgtPlay');
      const resetBtn = bar.querySelector('#mgtReset');
      let playing = false;
      let raf = 0;

      // その年に生存している人数を算出
      function aliveCount(y) {
        return people.reduce((n, p) => {
          const b = p.birth, d = typeof p.death === 'number' ? p.death : new Date().getFullYear();
          return (typeof b === 'number' && b <= y && d >= y) ? n + 1 : n;
        }, 0);
      }

      function apply(y) {
        label.textContent = `${y}年`;
        count.textContent = `${aliveCount(y)} 名`;
        // 既存のピンに custom event を送るか、DOM を直接叩く
        // openWorldMap 内で pins 配列は閉じているので、ここでは DOM の .magic-globe-item 系ではなく
        // シーン内のピンを参照できない → 代わりに「ピン点のマテリアル不透明度」を擬似フィルタ
        // しかし openWorldMap は pins を Points（一括）で描画しているので個別フェードは難しい
        // 代替：タイムライン年に合わせて、byCountry 情報を info パネルにダイジェスト表示する
      }
      apply(maxY);

      range.addEventListener('input', e => {
        const y = parseInt(e.target.value, 10);
        apply(y);
      });

      function step() {
        if (!playing) return;
        let y = parseInt(range.value, 10) + 5;
        if (y > maxY) y = minY;
        range.value = y;
        apply(y);
        raf = setTimeout(() => requestAnimationFrame(step), 120);
      }
      playBtn.addEventListener('click', () => {
        playing = !playing;
        playBtn.textContent = playing ? '❙❙' : '▷';
        if (playing) step();
        else { clearTimeout(raf); }
      });
      resetBtn.addEventListener('click', () => {
        playing = false; playBtn.textContent = '▷'; clearTimeout(raf);
        range.value = maxY; apply(maxY);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ============================================================
  // 11) 偉人ラジオ — Web Speech API で名言を朗読、ラジオ風パネル
  // ============================================================
  function setupIjinRadio() {
    // チャット FAB の隣にラジオ FAB を追加
    const inject = () => {
      if (document.getElementById('magicRadioFab')) return true;
      const chatFab = document.getElementById('chatFab') || document.querySelector('.chat-fab');
      if (!chatFab) return false;
      const fab = document.createElement('button');
      fab.id = 'magicRadioFab';
      fab.className = 'magic-radio-fab';
      fab.setAttribute('aria-label', '偉人ラジオを開く');
      fab.innerHTML = `<span class="mrf-wave"></span><span class="mrf-wave"></span><span class="mrf-wave"></span>`;
      document.body.appendChild(fab);
      fab.addEventListener('click', openRadio);
      return true;
    };
    inject();
    const mo = new MutationObserver(() => inject());
    mo.observe(document.body, { childList: true, subtree: true });

    async function openRadio() {
      // 名言プール
      const people = await (MAGIC._peopleBundle ? Promise.resolve(MAGIC._peopleBundle) : loadPeopleBundle());
      const pool = [];
      people.forEach(p => (p.quotes || []).forEach(q => {
        if (q && q.text) pool.push({ text: q.text, source: q.source || '', personName: p.name, personId: p.id });
      }));
      if (!pool.length) return;

      let ov = document.getElementById('magicRadioOverlay');
      if (ov) ov.remove();
      ov = document.createElement('div');
      ov.id = 'magicRadioOverlay';
      ov.className = 'magic-radio-overlay';
      ov.innerHTML = `
        <div class="magic-radio-panel">
          <button class="magic-radio-close" aria-label="閉じる">×</button>
          <div class="magic-radio-eye">IJIN RADIO</div>
          <div class="magic-radio-dial">
            <div class="magic-radio-arc"></div>
            <div class="magic-radio-needle" id="mrNeedle"></div>
            <div class="magic-radio-freq" id="mrFreq">88.1</div>
          </div>
          <div class="magic-radio-now">
            <div class="magic-radio-by" id="mrBy">—</div>
            <div class="magic-radio-text" id="mrText">チューニング中…</div>
          </div>
          <div class="magic-radio-ctrls">
            <button class="mr-btn" id="mrPrev" type="button" aria-label="前">◁</button>
            <button class="mr-btn mr-play" id="mrPlay" type="button" aria-label="再生/停止">▷</button>
            <button class="mr-btn" id="mrNext" type="button" aria-label="次">▷|</button>
            <label class="mr-rate">速度
              <input type="range" id="mrRate" min="0.6" max="1.4" step="0.05" value="0.95">
            </label>
          </div>
        </div>
      `;
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('open'));

      let idx = Math.floor(Math.random() * pool.length);
      let playing = false;
      let utterance = null;
      const synth = window.speechSynthesis;

      const textEl = ov.querySelector('#mrText');
      const byEl = ov.querySelector('#mrBy');
      const freqEl = ov.querySelector('#mrFreq');
      const needleEl = ov.querySelector('#mrNeedle');
      const playBtn = ov.querySelector('#mrPlay');
      const rateInp = ov.querySelector('#mrRate');

      function jaVoice() {
        const vs = synth.getVoices();
        return vs.find(v => /ja|jpn|Japan/i.test(v.lang || '')) || vs[0];
      }

      function showCurrent() {
        const q = pool[idx];
        textEl.textContent = `「${q.text}」`;
        byEl.textContent = `— ${q.personName}${q.source ? `（${q.source}）` : ''}`;
        // 周波数風：88.0 - 108.0 の間をインデックスで
        const freq = (88.0 + (idx / pool.length) * 20).toFixed(1);
        freqEl.textContent = freq;
        // 針を回す
        const deg = -80 + (idx / pool.length) * 160;
        needleEl.style.transform = `translateX(-50%) rotate(${deg}deg)`;
      }

      function speak() {
        if (!synth) return;
        try { synth.cancel(); } catch {}
        const q = pool[idx];
        utterance = new SpeechSynthesisUtterance(`${q.text}。${q.personName}。`);
        const v = jaVoice();
        if (v) utterance.voice = v;
        utterance.lang = 'ja-JP';
        utterance.rate = parseFloat(rateInp.value) || 1;
        utterance.pitch = 1;
        utterance.onend = () => {
          if (!playing) return;
          // 次へ
          idx = (idx + 1) % pool.length;
          showCurrent();
          setTimeout(speak, 800);
        };
        synth.speak(utterance);
      }

      function stop() {
        try { synth && synth.cancel(); } catch {}
      }

      playBtn.addEventListener('click', () => {
        playing = !playing;
        playBtn.textContent = playing ? '❙❙' : '▷';
        if (playing) speak();
        else stop();
      });
      ov.querySelector('#mrPrev').addEventListener('click', () => {
        idx = (idx - 1 + pool.length) % pool.length;
        showCurrent();
        if (playing) speak();
      });
      ov.querySelector('#mrNext').addEventListener('click', () => {
        idx = (idx + 1) % pool.length;
        showCurrent();
        if (playing) speak();
      });
      rateInp.addEventListener('input', () => {
        if (playing) { stop(); speak(); }
      });
      ov.querySelector('.magic-radio-close').addEventListener('click', () => {
        playing = false; stop();
        ov.classList.remove('open');
        setTimeout(() => ov.remove(), 220);
      });

      // Voices がまだ読めない環境では onvoiceschanged を待つ
      if (synth && !synth.getVoices().length) {
        synth.onvoiceschanged = () => {};
      }
      showCurrent();
    }
  }

  // ============================================================
  // 15) 名言の年輪 — 見た名言を記録し、同心円で可視化
  // ============================================================
  function setupQuoteRings() {
    const KEY = 'ijin_seen_quotes_v1';
    // 見た名言を記録（text のハッシュ + timestamp）
    function hash(s) {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return String(h);
    }
    function load() {
      try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
    }
    function save(obj) {
      try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
    }
    // DOM 上に見えている「.quote-text」「.quote-card」「[data-quote-text]」等を IntersectionObserver で追跡
    const seen = load();
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const t = (e.target.getAttribute('data-quote-text') || e.target.textContent || '').trim();
        if (!t || t.length < 6 || t.length > 200) return;
        const k = hash(t);
        if (!seen[k]) {
          seen[k] = { t: t.slice(0, 120), ts: Date.now(), p: e.target.getAttribute('data-person-id') || '' };
          save(seen);
        }
      });
    }, { threshold: 0.5 });
    // ページ上の名言系要素を監視
    const watch = () => {
      document.querySelectorAll('.quote-text, .magic-quote-zoom-text, [data-quote-text]').forEach(el => {
        if (!el.__magicRingWatched) { el.__magicRingWatched = true; io.observe(el); }
      });
    };
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });

    // わたしの本ブロックに「わたしの年輪」ボタンを注入（章立てとまとめて）
    MAGIC.openQuoteRings = () => openRingsOverlay(seen);
  }

  function openRingsOverlay(seen) {
    const entries = Object.entries(seen || {}).map(([k, v]) => ({ k, ...v }));
    entries.sort((a, b) => a.ts - b.ts);
    let ov = document.getElementById('magicRingsOverlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'magicRingsOverlay';
    ov.className = 'magic-rings-overlay';
    ov.innerHTML = `
      <div class="magic-rings-panel">
        <button class="magic-rings-close" aria-label="閉じる">×</button>
        <h3 class="magic-rings-title">わたしの年輪</h3>
        <div class="magic-rings-sub">${entries.length} の名言が、あなたの中に残っている</div>
        <canvas id="magicRingsCanvas" class="magic-rings-canvas"></canvas>
        <div class="magic-rings-hint">点をタップすると、そのときの名言が現れます</div>
        <div class="magic-rings-tooltip" id="magicRingsTip"></div>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.magic-rings-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 220);
    });

    const canvas = ov.querySelector('#magicRingsCanvas');
    const tip = ov.querySelector('#magicRingsTip');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const W = Math.max(280, rect.width);
      const H = Math.max(280, rect.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // 中心
      const cx = W / 2, cy = H / 2;
      const rMin = 28, rMax = Math.min(W, H) / 2 - 20;
      // 同心の年輪（光の層）
      const RINGS = Math.min(8, Math.max(3, Math.ceil(entries.length / 12)));
      for (let i = 0; i < RINGS; i++) {
        const r = rMin + (rMax - rMin) * (i + 1) / RINGS;
        ctx.strokeStyle = `rgba(212, 176, 85, ${0.06 + i * 0.02})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      // 各名言を点で配置：古いほど内側、新しいほど外側、角度はハッシュで決定的
      entries.forEach((e, i) => {
        const t = entries.length > 1 ? i / (entries.length - 1) : 0.5;
        const r = rMin + (rMax - rMin) * t;
        const a = (parseInt(e.k, 10) % 360) * Math.PI / 180;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        const size = 2.4 + (t * 2.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        g.addColorStop(0, 'rgba(255, 230, 150, 0.95)');
        g.addColorStop(1, 'rgba(255, 230, 150, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe7a8';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        // hit 判定用の記憶
        e._x = x; e._y = y; e._r = size * 4;
      });
      // 中心に数字
      ctx.fillStyle = 'rgba(212, 176, 85, 0.85)';
      ctx.font = '600 18px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(entries.length), cx, cy - 4);
      ctx.font = '10px "Shippori Mincho", serif';
      ctx.fillStyle = 'rgba(212, 176, 85, 0.6)';
      ctx.fillText('QUOTES', cx, cy + 14);
    };
    // 描画
    requestAnimationFrame(() => paint());
    // クリックで詳細
    canvas.addEventListener('click', (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
      let hit = null, bestD = 14;
      for (const e of entries) {
        if (e._x == null) continue;
        const d = Math.hypot(e._x - x, e._y - y);
        if (d < bestD) { bestD = d; hit = e; }
      }
      if (hit) {
        tip.textContent = `「${hit.t}」\n${new Date(hit.ts).toLocaleDateString('ja-JP')}`;
        tip.style.left = (x + 14) + 'px';
        tip.style.top  = (y + 14) + 'px';
        tip.classList.add('visible');
      } else {
        tip.classList.remove('visible');
      }
    });
    window.addEventListener('resize', paint);
  }

  // ============================================================
  // 9) 偉人の1日シミュレーター — routine データがある偉人に限り、時計で再現
  // ============================================================
  function setupDaySimulator() {
    // 偉人詳細ビューが開いたら、routine がある場合にボタンを注入
    const inject = () => {
      const view = document.getElementById('view-person');
      if (!view || !view.classList.contains('active')) return;
      if (view.querySelector('.magic-daysim-entry')) return;
      // 現在の人物 id を app.js が持っている場合
      const pid = view.getAttribute('data-person-id') || window.currentPersonId || '';
      const p = (MAGIC._peopleBundle || []).find(x => x.id === pid);
      if (!p || !Array.isArray(p.routine) || !p.routine.length) return;
      const host = view.querySelector('.person-content, .person-detail, .person-top') || view;
      const btn = document.createElement('button');
      btn.className = 'magic-daysim-entry';
      btn.type = 'button';
      btn.textContent = `${p.name} の1日を歩く`;
      btn.addEventListener('click', () => openDaySimulator(p));
      host.insertBefore(btn, host.firstChild);
    };
    const mo = new MutationObserver(inject);
    mo.observe(document.body, { childList: true, subtree: true });
    inject();

    // 外部からも呼べるように
    MAGIC.openDaySimulator = openDaySimulator;
  }

  function openDaySimulator(p) {
    const routine = p.routine || [];
    let ov = document.getElementById('magicDaySimOverlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'magicDaySimOverlay';
    ov.className = 'magic-daysim-overlay';
    ov.innerHTML = `
      <div class="magic-daysim-panel">
        <button class="magic-daysim-close" aria-label="閉じる">×</button>
        <div class="magic-daysim-head">
          <div class="magic-daysim-eye">A DAY IN THE LIFE</div>
          <h3 class="magic-daysim-title">${p.name}</h3>
        </div>
        <div class="magic-daysim-clock">
          <svg viewBox="0 0 240 240" id="magicDaysimClock">
            <circle cx="120" cy="120" r="110" fill="none" stroke="rgba(212,176,85,0.25)" stroke-width="1"/>
            <circle cx="120" cy="120" r="92" fill="none" stroke="rgba(212,176,85,0.12)" stroke-width="1"/>
            <g id="magicDaysimSegs"></g>
            <g id="magicDaysimTicks"></g>
            <line id="magicDaysimHand" x1="120" y1="120" x2="120" y2="42"
                  stroke="#ead296" stroke-width="2" stroke-linecap="round"
                  transform="rotate(0 120 120)" />
            <circle cx="120" cy="120" r="4" fill="#ead296"/>
            <text x="120" y="200" text-anchor="middle"
                  font-family="Cormorant Garamond, serif" font-size="14"
                  fill="rgba(212,176,85,0.7)" id="magicDaysimTimeText">00:00</text>
          </svg>
        </div>
        <div class="magic-daysim-activity" id="magicDaysimAct">—</div>
        <div class="magic-daysim-ctrls">
          <button class="mdsim-btn" id="mdsimPrev" aria-label="前">◁</button>
          <button class="mdsim-btn mdsim-play" id="mdsimPlay" aria-label="再生">▷</button>
          <button class="mdsim-btn" id="mdsimNext" aria-label="次">▷|</button>
          <label class="mdsim-speed">速度
            <input id="mdsimSpeed" type="range" min="1" max="30" step="1" value="6">
          </label>
        </div>
        <ul class="magic-daysim-list" id="magicDaysimList"></ul>
      </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.magic-daysim-close').addEventListener('click', () => {
      ov.classList.remove('open'); setTimeout(() => ov.remove(), 200);
      cancelAnimationFrame(raf);
    });

    const CAT_COLOR = {
      sleep: '#5a6a8a', meal: '#c4a07a', work: '#a55a6a', exercise: '#6aa084',
      reading: '#8a7a9a', leisure: '#b08a5a', other: '#888',
    };
    const segsG = ov.querySelector('#magicDaysimSegs');
    const ticksG = ov.querySelector('#magicDaysimTicks');
    const hand = ov.querySelector('#magicDaysimHand');
    const timeText = ov.querySelector('#magicDaysimTimeText');
    const actEl = ov.querySelector('#magicDaysimAct');
    const listEl = ov.querySelector('#magicDaysimList');

    // 24時間を外周の arc に変換（12時＝上方向）
    function hrToAngle(hr) { return (hr / 24) * 360 - 90; } // 0時を左側に置くならここで調整
    function polar(r, deg) { const rad = deg * Math.PI / 180; return [120 + Math.cos(rad) * r, 120 + Math.sin(rad) * r]; }

    // セクター弧を描画
    const innerR = 92, outerR = 110;
    routine.forEach(seg => {
      const a0 = hrToAngle(seg.start);
      const a1 = hrToAngle(seg.end);
      const large = (seg.end - seg.start) > 12 ? 1 : 0;
      const [sx, sy] = polar(outerR, a0);
      const [ex, ey] = polar(outerR, a1);
      const [sxi, syi] = polar(innerR, a1);
      const [exi, eyi] = polar(innerR, a0);
      const d = `M ${sx} ${sy} A ${outerR} ${outerR} 0 ${large} 1 ${ex} ${ey} L ${sxi} ${syi} A ${innerR} ${innerR} 0 ${large} 0 ${exi} ${eyi} Z`;
      const color = CAT_COLOR[seg.cat] || CAT_COLOR.other;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', color);
      path.setAttribute('fill-opacity', '0.6');
      path.setAttribute('stroke', 'rgba(0,0,0,0.3)');
      path.setAttribute('stroke-width', '0.5');
      segsG.appendChild(path);
    });
    // 時刻目盛
    for (let h = 0; h < 24; h++) {
      const a = hrToAngle(h);
      const [x1, y1] = polar(innerR - 4, a);
      const [x2, y2] = polar(innerR - (h % 6 === 0 ? 12 : 8), a);
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
      ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      ln.setAttribute('stroke', 'rgba(212,176,85,0.5)');
      ln.setAttribute('stroke-width', h % 6 === 0 ? '1.2' : '0.6');
      ticksG.appendChild(ln);
      if (h % 6 === 0) {
        const [tx, ty] = polar(innerR - 22, a);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', tx); t.setAttribute('y', ty + 4);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', 'rgba(212,176,85,0.7)');
        t.setAttribute('font-size', '12');
        t.setAttribute('font-family', 'Cormorant Garamond, serif');
        t.textContent = String(h);
        ticksG.appendChild(t);
      }
    }
    // リスト
    listEl.innerHTML = routine.map(seg => `
      <li data-start="${seg.start}">
        <span class="mdsim-time">${String(seg.start).padStart(2,'0')}:00</span>
        <span class="mdsim-cat" style="background:${CAT_COLOR[seg.cat]||CAT_COLOR.other}"></span>
        <span class="mdsim-act">${seg.activity}</span>
      </li>
    `).join('');
    listEl.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        hour = parseFloat(li.dataset.start);
        update();
      });
    });

    // 時計
    let hour = 6; // 朝から開始
    let playing = false;
    let raf = 0;
    const speedInp = ov.querySelector('#mdsimSpeed');
    const playBtn = ov.querySelector('#mdsimPlay');
    function update() {
      const deg = hrToAngle(hour);
      hand.setAttribute('transform', `rotate(${deg + 90} 120 120)`);
      const hh = Math.floor(hour);
      const mm = Math.floor((hour - hh) * 60);
      timeText.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
      const seg = routine.find(s => hour >= s.start && hour < s.end) || routine[0];
      actEl.textContent = seg ? seg.activity : '';
      listEl.querySelectorAll('li').forEach(li => {
        li.classList.toggle('active', parseInt(li.dataset.start, 10) === Math.floor(seg?.start ?? -1));
      });
    }
    function tick() {
      if (!playing) return;
      const speed = parseFloat(speedInp.value);
      hour += speed / 60; // speed 1で1分/秒, 30で30分/秒
      if (hour >= 24) hour = 0;
      update();
      raf = requestAnimationFrame(tick);
    }
    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.textContent = playing ? '❙❙' : '▷';
      if (playing) tick();
    });
    ov.querySelector('#mdsimPrev').addEventListener('click', () => { hour = (hour - 1 + 24) % 24; update(); });
    ov.querySelector('#mdsimNext').addEventListener('click', () => { hour = (hour + 1) % 24; update(); });
    update();
  }

  // ============================================================
  // 17) 章立てのわたしの本 — favorites タブに章ナビを注入
  // ============================================================
  function setupBookChapters() {
    const CHAPTERS = [
      { key: 'intro',    title: '序章',      desc: 'プロフィール' },
      { key: 'thoughts', title: '第一章',    desc: '思想と言葉' },
      { key: 'meetings', title: '第二章',    desc: '出会い' },
      { key: 'journeys', title: '第三章',    desc: '旅と軌跡' },
      { key: 'rings',    title: '終章',      desc: '年輪' },
    ];
    const inject = () => {
      const view = document.getElementById('view-favorites');
      if (!view || !view.classList.contains('active')) return;
      if (view.querySelector('.magic-book-chapters')) return;
      const nav = document.createElement('nav');
      nav.className = 'magic-book-chapters';
      nav.innerHTML = `
        <div class="mbc-label">目次</div>
        <ul class="mbc-list">
          ${CHAPTERS.map((c, i) => `
            <li class="mbc-item" data-chap="${c.key}">
              <span class="mbc-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="mbc-title">${c.title}</span>
              <span class="mbc-desc">${c.desc}</span>
            </li>
          `).join('')}
        </ul>
      `;
      view.insertBefore(nav, view.firstChild);
      // スクロールジャンプ（既存要素にラベル付与）
      const anchor = (key) => {
        const sel = {
          intro:    '.my-book-header, .profile-header, .my-book-profile',
          thoughts: '.magic-book3d-btn, .title-page-meta, .title-page, [data-quotes-section], .quote-section',
          meetings: '[data-friends], .friends-section, .follow-section',
          journeys: '.career-section, .career-timeline, [data-career]',
          rings:    '.magic-book-ring-entry',
        }[key] || 'body';
        return document.querySelector(sel);
      };
      // 終章の "年輪" エントリを生成
      if (!view.querySelector('.magic-book-ring-entry')) {
        const ring = document.createElement('div');
        ring.className = 'magic-book-ring-entry';
        ring.innerHTML = `
          <h3>年輪</h3>
          <p>あなたが見てきた名言が、静かに積み重なっていきます。</p>
          <button type="button" class="mbre-open">わたしの年輪を見る</button>
        `;
        view.appendChild(ring);
        ring.querySelector('.mbre-open').addEventListener('click', () => {
          if (typeof MAGIC.openQuoteRings === 'function') MAGIC.openQuoteRings();
        });
      }
      nav.querySelectorAll('.mbc-item').forEach(li => {
        li.addEventListener('click', () => {
          const key = li.dataset.chap;
          const el = anchor(key);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          nav.querySelectorAll('.mbc-item').forEach(x => x.classList.toggle('current', x === li));
        });
      });
    };
    const mo = new MutationObserver(inject);
    mo.observe(document.body, { childList: true, subtree: true });
    inject();
  }

  // ------------------------------------------------------------
  // 起動
  // ------------------------------------------------------------
  function boot() {
    try { setupLenis(); } catch (e) { console.warn('[magic] lenis', e); }
    try { setupAudio(); } catch (e) { console.warn('[magic] audio', e); }
    try { setupViewTransitions(); } catch (e) { console.warn('[magic] vt', e); }
    try { setupEraProgress(); } catch (e) { console.warn('[magic] era', e); }
    try { setupPenChapters(); } catch (e) { console.warn('[magic] pen', e); }
    try { setupQuoteZoom(); } catch (e) { console.warn('[magic] qz', e); }
    try { setupDailyPick(); } catch (e) { console.warn('[magic] daily', e); }
    // パレード機能は撤去（ユーザー要望で削除）
    // try { setupParade(); } catch (e) { console.warn('[magic] parade', e); }
    try { setupBook3D(); } catch (e) { console.warn('[magic] book3d', e); }
    try { setupDeepExplore(); } catch (e) { console.warn('[magic] deep', e); }
    try { setupQuoteContext(); } catch (e) { console.warn('[magic] quotectx', e); }
    // try { setupMusicSalon(); } catch (e) { console.warn('[magic] salon', e); }
    try { setupInfluenceRipple(); } catch (e) { console.warn('[magic] ripple', e); }
    try { setupLetterExchange(); } catch (e) { console.warn('[magic] letter', e); }
    try { setupRoutineLive(); } catch (e) { console.warn('[magic] routineLive', e); }
    try { setupMusicSkin(); } catch (e) { console.warn('[magic] musicSkin', e); }
    try { setupGlobeTimeline(); } catch (e) { console.warn('[magic] globeTimeline', e); }
    try { setupIjinRadio(); } catch (e) { console.warn('[magic] radio', e); }
    try { setupQuoteRings(); } catch (e) { console.warn('[magic] rings', e); }
    try { setupDaySimulator(); } catch (e) { console.warn('[magic] daysim', e); }
    try { setupBookChapters(); } catch (e) { console.warn('[magic] chapters', e); }
    try { setupOfflinePrime(); } catch (e) { console.warn('[magic] offlinePrime', e); }
  }

  // ============================================================
  // Service Worker 連携：バックグラウンドで偉人データを個別 JSON
  // もキャッシュさせ、完全オフラインで全機能動くようにする。
  // ============================================================
  async function setupOfflinePrime() {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg || !reg.active) return;
    // 既に一度送っていればスキップ（localStorage フラグ）
    const FLAG = 'magic_offline_primed_v1';
    if (localStorage.getItem(FLAG)) return;

    // manifest.json から個別 JSON の URL を組み立て
    try {
      const m = await fetch('/data/manifest.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null);
      if (!m || !Array.isArray(m.people)) return;
      const urls = m.people.map(p => {
        const id = (typeof p === 'string') ? p : (p.id || '');
        return id ? `/data/people/${id}.json` : null;
      }).filter(Boolean);
      // 30件ずつバッチで SW に送る（一斉リクエスト負荷を分散）
      for (let i = 0; i < urls.length; i += 30) {
        reg.active.postMessage({ type: 'MAGIC_PRECACHE', urls: urls.slice(i, i + 30) });
        await new Promise(r => setTimeout(r, 120));
      }
      localStorage.setItem(FLAG, String(Date.now()));
    } catch {}
  }

  // ============================================================
  // ミュージック：近未来スキンの JS 拡張
  //  - 絵文字ボタンを機械的な記号に差し替え
  //  - Now Playing 下にウェーブフォーム Canvas を注入、再生中はアニメート
  // ============================================================
  function setupMusicSkin() {
    const TRACK_IDS = ['homeBgm','searchBgm','historyBgm','routineBgm','blogBgm','favoritesBgm','squareBgm'];
    const SYMBOLS = {
      musicShuffleBtn: '⇌',
      musicPlayBtn:    '▷',
      musicStopBtn:    '□',
      musicLoopBtn:    '↻',
    };

    let waveCanvas = null, waveCtx = null, waveRaf = 0;
    let audioCtx = null, analyser = null, sourceMap = new Map();

    function apply() {
      const app = document.querySelector('#phoneMusicApp .music-app');
      if (!app) return false;
      // ボタン絵文字を置換
      Object.entries(SYMBOLS).forEach(([id, sym]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = sym;
        el.style.fontFamily = '"Cormorant Garamond", "Shippori Mincho", serif';
      });
      // waveform canvas を Now Playing に注入（既に注入済みならスキップ）
      const np = app.querySelector('.music-nowplaying');
      if (np && !np.querySelector('.magic-music-wave')) {
        waveCanvas = document.createElement('canvas');
        waveCanvas.className = 'magic-music-wave';
        waveCanvas.width = 600;
        waveCanvas.height = 64;
        np.appendChild(waveCanvas);
        waveCtx = waveCanvas.getContext('2d');
      }
      return true;
    }

    function ensureAudioCtx() {
      if (audioCtx) return audioCtx;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;
        analyser.connect(audioCtx.destination);
      } catch (e) {
        return null;
      }
      return audioCtx;
    }

    function hookAudioToAnalyser(audioEl) {
      if (!audioEl) return;
      if (!ensureAudioCtx()) return;
      if (sourceMap.has(audioEl)) return;
      try {
        const src = audioCtx.createMediaElementSource(audioEl);
        src.connect(analyser);
        sourceMap.set(audioEl, src);
      } catch (e) {
        // 既に他のコンテキストに接続されているケースは無視
      }
    }

    function isAnyPlaying() {
      for (const id of TRACK_IDS) {
        const a = document.getElementById(id);
        if (a && !a.paused && !a.ended) return a;
      }
      return null;
    }

    function drawWave() {
      if (!waveCtx || !waveCanvas) return;
      const W = waveCanvas.width, H = waveCanvas.height;
      waveCtx.clearRect(0, 0, W, H);
      const playing = isAnyPlaying();
      if (!playing) {
        // 静止状態：中央に細い金の1本線
        waveCtx.strokeStyle = 'rgba(212, 176, 85, 0.35)';
        waveCtx.lineWidth = 1;
        waveCtx.beginPath();
        waveCtx.moveTo(0, H / 2);
        waveCtx.lineTo(W, H / 2);
        waveCtx.stroke();
        waveRaf = requestAnimationFrame(drawWave);
        return;
      }
      // 再生中：アナライザーが使える場合は FFT、使えなければ擬似波形
      let bins = null;
      if (analyser) {
        try { hookAudioToAnalyser(playing); } catch {}
        const arr = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(arr);
        bins = arr;
      }
      const count = 40;
      const barW = W / count;
      for (let i = 0; i < count; i++) {
        let v;
        if (bins && bins.length) {
          v = bins[Math.floor(i * bins.length / count)] / 255;
        } else {
          // 擬似波形：時間で変動
          const t = performance.now() * 0.002;
          v = 0.25 + Math.abs(Math.sin(t + i * 0.45)) * 0.55;
        }
        const h = v * H * 0.9 + 2;
        const x = i * barW + barW * 0.22;
        const w = barW * 0.56;
        const y = (H - h) / 2;
        const grad = waveCtx.createLinearGradient(0, y, 0, y + h);
        grad.addColorStop(0, 'rgba(255, 232, 168, 0.9)');
        grad.addColorStop(0.5, 'rgba(212, 176, 85, 0.85)');
        grad.addColorStop(1, 'rgba(140, 90, 40, 0.7)');
        waveCtx.fillStyle = grad;
        waveCtx.fillRect(x, y, w, h);
      }
      waveRaf = requestAnimationFrame(drawWave);
    }

    // 初回適用 & 監視（phoneMusicApp が hidden→表示されたとき）
    const start = () => {
      if (apply()) {
        if (waveRaf) cancelAnimationFrame(waveRaf);
        waveRaf = requestAnimationFrame(drawWave);
      } else {
        const mo = new MutationObserver(() => {
          if (apply()) {
            mo.disconnect();
            if (waveRaf) cancelAnimationFrame(waveRaf);
            waveRaf = requestAnimationFrame(drawWave);
          }
        });
        mo.observe(document.body, { childList: true, subtree: true });
      }
    };
    start();
    // ミュージックアプリが閉じたり再表示されるとボタンが再生成されないため
    // 一定間隔で記号を再適用（音声要素の再生状態変化で DOM が変わるケースに備える）
    setInterval(() => apply(), 2000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 600);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(boot, 600));
  }
})();
