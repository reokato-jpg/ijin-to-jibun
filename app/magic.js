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

    // 表紙のキャンバステクスチャを生成
    function makeCoverTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1536;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, c.width, c.height);
      g.addColorStop(0, '#5c1f2a');
      g.addColorStop(1, '#3a0f18');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      // 革の細かいテクスチャ
      for (let i = 0; i < 6000; i++) {
        ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.04})`;
        ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
      }
      // 金の外枠
      ctx.strokeStyle = '#b8952e';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, c.width - 100, c.height - 100);
      ctx.lineWidth = 2;
      ctx.strokeRect(72, 72, c.width - 144, c.height - 144);
      // 装飾◆
      ctx.fillStyle = '#d4b055';
      ctx.font = 'bold 36px "Shippori Mincho", serif';
      ctx.textAlign = 'center';
      ctx.fillText('◆', c.width / 2, 180);
      ctx.fillText('◆', c.width / 2, c.height - 140);
      // タイトル
      const name = getUserName();
      const title = getCurrentTitle();
      const displayTitle = name ? (title ? `【${title}】${name}の本` : `${name}の本`) : 'わたしの本';
      ctx.fillStyle = '#d4b055';
      ctx.font = 'bold 78px "Shippori Mincho", serif';
      // 縦書き風に収まるように長ければ改行
      const maxWidthPx = 760;
      ctx.textAlign = 'center';
      const lines = splitToLines(ctx, displayTitle, maxWidthPx);
      const lineH = 92;
      const startY = c.height / 2 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((line, i) => ctx.fillText(line, c.width / 2, startY + i * lineH));
      // サブ: My Own Book of Virtue
      ctx.fillStyle = 'rgba(212,176,85,0.55)';
      ctx.font = 'italic 34px "Cormorant Garamond", serif';
      ctx.fillText('— My Own Book of Virtue —', c.width / 2, c.height / 2 + 140);
      // 底部の情報
      ctx.fillStyle = 'rgba(212,176,85,0.75)';
      ctx.font = '28px "Shippori Mincho", serif';
      ctx.fillText(`獲得スタンプ ${getStampTotal()} 個`, c.width / 2, c.height - 220);
      const d = new Date();
      ctx.font = 'italic 26px "Cormorant Garamond", serif';
      ctx.fillText(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`, c.width / 2, c.height - 180);

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
  // 10) 歴史の奥行き — ホームブロック＋4機能への導線
  // ============================================================
  function setupDeepExplore() {
    readyWhenDataOK(() => {
      const insert = () => {
        if (document.getElementById('magicDeepBlock')) return;
        const after = document.getElementById('magicDailyPick') || document.getElementById('todayBirthdayBlock') || document.querySelector('#view-people .home-block');
        if (!after) { setTimeout(insert, 400); return; }
        const block = document.createElement('div');
        block.className = 'home-block magic-deep-block';
        block.id = 'magicDeepBlock';
        block.innerHTML = `
          <div class="magic-deep-title">🕯 歴史の奥行き</div>
          <div class="magic-deep-sub">偉人たちの繋がり・同時代・地理を、ひと繋ぎの物語で。</div>
          <div class="magic-deep-grid">
            <button class="magic-deep-btn" data-deep="graph">
              <span class="magic-deep-btn-ic">🕸</span>
              <span class="magic-deep-btn-ttl">関係グラフ</span>
              <span class="magic-deep-btn-desc">師弟・盟友・論敵の網</span>
            </button>
            <button class="magic-deep-btn" data-deep="simul">
              <span class="magic-deep-btn-ic">📅</span>
              <span class="magic-deep-btn-ttl">同時代</span>
              <span class="magic-deep-btn-desc">ある年、誰が生きていたか</span>
            </button>
            <button class="magic-deep-btn" data-deep="map">
              <span class="magic-deep-btn-ic">🌍</span>
              <span class="magic-deep-btn-ttl">世界マップ</span>
              <span class="magic-deep-btn-desc">歴史が生まれた土地</span>
            </button>
            <button class="magic-deep-btn" data-deep="century">
              <span class="magic-deep-btn-ic">🕰</span>
              <span class="magic-deep-btn-ttl">世紀ごと</span>
              <span class="magic-deep-btn-desc">100年ごとの群像</span>
            </button>
          </div>
        `;
        after.insertAdjacentElement('afterend', block);
        block.querySelector('[data-deep="graph"]').addEventListener('click', openRelationGraph);
        block.querySelector('[data-deep="simul"]').addEventListener('click', () => openSimultaneity());
        block.querySelector('[data-deep="map"]').addEventListener('click', openWorldMap);
        block.querySelector('[data-deep="century"]').addEventListener('click', () => openSimultaneity({ centuryMode: true }));
      };
      insert();
    });
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
       <div class="magic-graph-controls">
         <button class="magic-graph-ctrl active" data-filter="all">すべて</button>
         <button class="magic-graph-ctrl" data-filter="music">音楽</button>
         <button class="magic-graph-ctrl" data-filter="philo">哲学</button>
         <button class="magic-graph-ctrl" data-filter="literature">文学</button>
         <button class="magic-graph-ctrl" data-filter="art">美術</button>
         <button class="magic-graph-ctrl" data-filter="history">歴史</button>
         <button class="magic-graph-ctrl" data-filter="science">科学</button>
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
      mentor: 'rgba(212,176,85,0.35)',
      peer:   'rgba(176,210,180,0.25)',
      rival:  'rgba(220,90,100,0.35)',
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
    nodes.forEach(n => { n.r = Math.min(14, 5 + Math.sqrt(n.degree) * 1.5); });

    let activeFilter = 'all';
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
    function matchesFilter(n) { return activeFilter === 'all' || n.cat === activeFilter; }
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
        ctx.lineWidth = l.kind === 'rival' ? 1.0 : 0.6;
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.lineTo(l.target.x, l.target.y);
        ctx.stroke();
      });
      // ノード
      nodes.forEach(n => {
        const match = matchesFilter(n);
        ctx.globalAlpha = match ? 1 : 0.12;
        ctx.fillStyle = CAT_COLOR[n.cat] || '#999';
        ctx.strokeStyle = 'rgba(20,12,16,0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
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
      if (n) { draggingNode = n; n.vx = 0; n.vy = 0; }
      else { panning = true; lastX = sx; lastY = sy; }
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
          tip.innerHTML = `<div><b>${n.name}</b></div><div style="font-size:10px;opacity:0.75">${n.field || ''} · つながり${n.degree}</div>`;
        } else {
          tip.style.opacity = '0';
        }
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      if (draggingNode) {
        // クリック扱い（ほぼ動いてない）
        const moved = Math.abs(draggingNode.vx) + Math.abs(draggingNode.vy);
        if (moved < 0.5) {
          const id = draggingNode.id;
          closeDeep();
          setTimeout(() => { if (typeof window.showPerson === 'function') window.showPerson(id); }, 300);
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

    // フィルタ
    ov.querySelectorAll('.magic-graph-ctrl').forEach(btn => {
      btn.addEventListener('click', () => {
        ov.querySelectorAll('.magic-graph-ctrl').forEach(b => b.classList.toggle('active', b === btn));
        activeFilter = btn.dataset.filter;
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
  // C) 世界マップ（SVG）
  // ============================================================
  async function openWorldMap() {
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
    try { setupParade(); } catch (e) { console.warn('[magic] parade', e); }
    try { setupBook3D(); } catch (e) { console.warn('[magic] book3d', e); }
    try { setupDeepExplore(); } catch (e) { console.warn('[magic] deep', e); }
    try { setupQuoteContext(); } catch (e) { console.warn('[magic] quotectx', e); }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 600);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(boot, 600));
  }
})();
