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
            <div class="magic-topbook-deep-title">歴史の奥行き</div>
            <div class="magic-topbook-deep-pills">
              <button class="magic-topbook-pill" data-deep="graph">関係グラフ</button>
              <button class="magic-topbook-pill" data-deep="simul">同時代</button>
              <button class="magic-topbook-pill" data-deep="map">世界マップ</button>
              <button class="magic-topbook-pill" data-deep="century">世紀ごと</button>
              <button class="magic-topbook-pill" data-deep="city">都市群像</button>
              <button class="magic-topbook-pill" data-deep="drift">365日カレンダー</button>
              <button class="magic-topbook-pill magic-topbook-pill-cosmos" data-deep="cosmos">🌌 宇宙の誕生</button>
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
      };
      wrap.querySelectorAll('[data-deep]').forEach(btn => {
        btn.addEventListener('click', () => {
          const fn = deepMap[btn.dataset.deep];
          if (fn) fn();
        });
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
    // 地球を画面中央に、少し近めから初期表示
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

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
    const moonMat2 = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: moonTex2 },
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
    ov.querySelectorAll('[data-merc-cont]').forEach(b => {
      b.addEventListener('click', () => {
        ov.querySelectorAll('[data-merc-cont]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        mercFilter.cont = b.dataset.mercCont;
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
        // 行バッファ作成（40行ごとにまとめてブロック描画）
        const BAND = 2; // 2pxごと
        for (let y = 0; y < H; y += BAND) {
          const yn = y / H;
          const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * yn))) * 180 / Math.PI;
          const srcY = Math.max(0, Math.min(srcH - 1, (90 - lat) / 180 * srcH));
          ctx.drawImage(srcImg, 0, srcY, srcW, 1, 0, y, W, BAND + 0.5);
        }
      }
      // 海の上に薄い青フィルターで色彩統一
      ctx.fillStyle = 'rgba(20,60,110,0.12)'; ctx.fillRect(0, 0, W, H);
      // 緯度経度グリッド
      ctx.strokeStyle = 'rgba(200,220,255,0.14)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = mercY(lat) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let lng = -150; lng <= 150; lng += 30) {
        const x = mercX(lng) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.setLineDash([]);
      // 赤道・回帰線を少し強調
      ctx.strokeStyle = 'rgba(255,200,120,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, mercY(0) * H); ctx.lineTo(W, mercY(0) * H); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,120,0.12)';
      ctx.beginPath(); ctx.moveTo(0, mercY(23.4) * H); ctx.lineTo(W, mercY(23.4) * H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, mercY(-23.4) * H); ctx.lineTo(W, mercY(-23.4) * H); ctx.stroke();
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
      const sx = mercX(sunLng) * W;
      const sy = mercY(sunLat) * H;
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
        const x1 = mercX(r.from[1]) * W, y1 = mercY(r.from[0]) * H;
        const x2 = mercX(r.to[1]) * W,   y2 = mercY(r.to[0]) * H;
        const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.13;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(midX, midY, x2, y2); ctx.stroke();
      });
      ctx.setLineDash([]);
      FLIGHT_ROUTES.forEach(r => {
        const x1 = mercX(r.from[1]) * W, y1 = mercY(r.from[0]) * H;
        const x2 = mercX(r.to[1]) * W,   y2 = mercY(r.to[0]) * H;
        ctx.fillStyle = 'rgba(255,240,200,0.85)';
        ctx.beginPath(); ctx.arc(x1, y1, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y2, 2.5, 0, Math.PI*2); ctx.fill();
      });
      // 国ピン（フィルタ適用）
      const drawnPins = [];
      Object.keys(byCountry).forEach(k => {
        const b = byCountry[k];
        const f = filterCountry(b, k);
        if (!f) return;
        const x = mercX(f.lng) * W;
        const y = mercY(f.lat) * H;
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
        const x = mercX(c.lng) * W, y = mercY(c.lat) * H;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2.5;
        ctx.strokeText(c.name, x + 6, y + 3);
        ctx.fillText(c.name, x + 6, y + 3);
        ctx.fillStyle = 'rgba(180,220,255,0.85)';
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
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
        mmoPeople.classList.remove('show');
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
      return `
        <circle r="${r}"></circle>
        <text y="4">${shortName}</text>
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

    ov.innerHTML = `
      <button class="magic-ripple-close" aria-label="閉じる">×</button>
      <div class="magic-ripple-title">🪞 ${person.name}の影響の波紋</div>
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
            <text y="5" style="fill:#5c1f2a; font-family:'Shippori Mincho',serif; font-size:12px; font-weight:800; text-anchor:middle">${person.name.split(/[・\s]/)[0]}</text>
          `}
          <text y="54" style="fill:#ead296; font-family:'Shippori Mincho',serif; font-size:11px; font-weight:700; text-anchor:middle">${person.name.split(/[・\s]/)[0]}</text>
        </g>
      </svg>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.querySelector('.magic-ripple-close').addEventListener('click', () => {
      ov.classList.remove('open');
      setTimeout(() => ov.remove(), 350);
    });
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
    const sunGeo = new THREE.SphereGeometry(3.5, 32, 24);
    // ☀️ アニメーションするプラズマ表面シェーダ
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: sunTex },
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

    // 太陽レンズグロー（spriteで放射状の光）
    const sunGlowTex = (() => {
      const sc = document.createElement('canvas'); sc.width = 512; sc.height = 512;
      const g = sc.getContext('2d');
      const grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
      grd.addColorStop(0, 'rgba(255,240,180,0.9)');
      grd.addColorStop(0.15, 'rgba(255,200,120,0.55)');
      grd.addColorStop(0.4, 'rgba(255,140,80,0.18)');
      grd.addColorStop(1, 'rgba(255,100,40,0)');
      g.fillStyle = grd; g.fillRect(0,0,512,512);
      // 放射の光条
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const gg = g.createLinearGradient(256, 256, 256 + Math.cos(ang)*256, 256 + Math.sin(ang)*256);
        gg.addColorStop(0, 'rgba(255,230,160,0.35)');
        gg.addColorStop(1, 'rgba(255,180,100,0)');
        g.save();
        g.translate(256, 256);
        g.rotate(ang);
        g.fillStyle = gg;
        g.fillRect(-4, 0, 8, 256);
        g.restore();
      }
      return new THREE.CanvasTexture(sc);
    })();
    const sunGlowMat = new THREE.SpriteMaterial({ map: sunGlowTex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending });
    const sunGlow = new THREE.Sprite(sunGlowMat);
    sunGlow.scale.set(18, 18, 1);
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
    const planetMeshes = [];
    PLANETS.forEach(p => {
      const pGeo = new THREE.SphereGeometry(p.size, 48, 32); // 高解像度
      const pMat = new THREE.MeshBasicMaterial({ map: makePlanetTexture(p) });
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
        const mGeo = new THREE.SphereGeometry(0.28, 24, 18);
        const mMat = new THREE.ShaderMaterial({
          uniforms: {
            uMap: { value: moonTex },
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
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const h = 1.2 + Math.random() * 1.4;
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
      });
    });

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
        const arrivalR = nearest.planet.size * 3.5 + 2;
        if (nearestD < arrivalR && visitedPlanet !== nearest) {
          visitedPlanet = nearest;
          // 初回訪問
          if (!nearest.mesh.userData.visited) {
            nearest.mesh.userData.visited = true;
            game.planets++;
            ov.querySelector('#sbPlanets').textContent = game.planets;
            // 到着ポップ
            const ap = ov.querySelector('#cosmosArrivePopup');
            ap.innerHTML = `<div class="ap-label">到着！</div><div class="ap-name">${nearest.planet.jname}</div><div class="ap-bonus">+1000</div>`;
            ap.classList.remove('show'); void ap.offsetWidth; ap.classList.add('show');
            setTimeout(() => ap.classList.remove('show'), 1800);
            playArrive();
            game.stars += 10; // ボーナス
            ov.querySelector('#sbStars').textContent = game.stars;
            // 全惑星制覇チェック
            if (game.planets >= planetMeshes.length) {
              setTimeout(() => {
                const ap2 = ov.querySelector('#cosmosArrivePopup');
                ap2.innerHTML = `<div class="ap-label">🏆 MISSION COMPLETE</div><div class="ap-name">全惑星制覇！</div><div class="ap-bonus">宇宙飛行士認定</div>`;
                ap2.classList.remove('show'); void ap2.offsetWidth; ap2.classList.add('show');
              }, 2000);
            }
          }
          showPlanetInfo(nearest);
          // 到着時は減速
          rocketVel.multiplyScalar(0.2);
        } else if (nearestD > arrivalR * 2.5) {
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
          centerImg.setAttribute('clip-path', 'circle(60px at 0 0)');
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
