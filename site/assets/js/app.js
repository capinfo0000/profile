/* ============================================================
   画面まわりのつなぎ込み
   - 背景パターンとビューアの起動
   - 作品の色をCSS変数へ流す（ラベル・カーソル・タグが連動する）
   - ページ送り、カーソル追従、詳細、設定
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var works = window.WORKS || [];
  var PREF = 'portfolio.prefs.v1';

  var prefs = { theme: 'auto', motion: 'on' };
  try {
    var saved = JSON.parse(localStorage.getItem(PREF) || '{}');
    if (saved.theme) prefs.theme = saved.theme;
    if (saved.motion) prefs.motion = saved.motion;
  } catch (e) {}
  function savePrefs() { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch (e) {} }

  var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    var dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && darkMQ.matches);
    document.documentElement.classList.toggle('is-dark', dark);
    if (pattern) {
      pattern.toneA = dark ? [26, 26, 26] : [249, 249, 249];
      pattern.toneB = dark ? [16, 16, 16] : [237, 237, 237];
    }
  }

  /* ---- 背景パターン ---- */
  var pattern = null;
  var patternCanvas = $('patternCanvas');
  if (patternCanvas) {
    pattern = new Pattern(patternCanvas, { seed: 11 });
    applyTheme();
    pattern.start();
  }

  /* ---- 作品ビューア（作品ページのみ） ---- */
  var viewer = null;
  var viewerCanvas = $('viewerCanvas');

  function setWorkColor(work) {
    document.documentElement.style.setProperty('--work', work.color);
    if (pattern) pattern.setWorkColor(work.color);
  }

  /* ---- 桁ローラー ---- */
  function buildDigits(el, count) {
    el.innerHTML = '';
    var inners = [];
    for (var d = 0; d < count; d++) {
      var wrap = document.createElement('span');
      wrap.className = 'digit';
      var inner = document.createElement('span');
      inner.className = 'digit__inner';
      // 前後に 9 / 0 を足して 9→0 の繰り上がりを飛ばさない
      [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(function (n) {
        var s = document.createElement('span');
        s.textContent = String(n);
        inner.appendChild(s);
      });
      wrap.appendChild(inner);
      el.appendChild(wrap);
      inners.push(inner);
    }
    return inners;
  }
  function setDigits(inners, value) {
    var s = String(Math.max(0, value)).padStart(inners.length, '0');
    for (var i = 0; i < inners.length; i++) {
      inners[i].style.setProperty('--i', String(Number(s[i]) + 1));
    }
  }

  var numDigits = null, totalDigits = null;

  /* ---- ラベル ---- */
  function placeLabel() {
    if (!viewer) return;
    var r = viewer.rect();
    var label = $('workLabel');
    label.style.transform = 'translate(' + (r.x - 6) + 'px,' + (r.y + r.h - 34) + 'px) rotate(-1.6deg)';
  }
  function setLabel(work) {
    $('labelMain').textContent = work.title;
    $('labelGhost').textContent = work.title;
    $('labelSub').textContent = work.sub;
    placeLabel();
  }

  /* ---- 詳細 ---- */
  var NOTICE = {
    login: 'このサービスの利用にはログインが必要です。画面の内容は取扱説明のページで紹介しています。',
    open:  'ログインなしで使えます。下のリンクから実物をご覧いただけます。',
    closed:'このサイトは既に公開を終了しています。'
  };
  function openDetail(work) {
    $('dTitle').textContent = work.title;
    $('dSub').textContent = work.sub;
    $('dCategory').textContent = work.category;
    $('dRole').textContent = work.role;
    var tech = $('dTech');
    tech.innerHTML = '';
    work.tech.forEach(function (t) {
      var s = document.createElement('span');
      s.className = 'detail__tag'; s.textContent = t;
      tech.appendChild(s);
    });
    $('dNotice').textContent = NOTICE[work.access] || '';
    var link = $('dLink');
    if (work.access === 'open' && work.url) {
      link.hidden = false; link.href = work.url;
    } else {
      link.hidden = true;
    }
    $('detail').classList.add('is-open');
  }
  function closeDetail() { $('detail').classList.remove('is-open'); }

  if (viewerCanvas && works.length) {
    viewer = new Viewer(viewerCanvas, {
      works: works,
      onChange: function (i) {
        var work = works[i];
        setWorkColor(work);
        setLabel(work);
        if (numDigits) setDigits(numDigits, i + 1);
      }
    });

    numDigits = buildDigits($('pagerNum'), 2);
    totalDigits = buildDigits($('pagerTotal'), 2);
    setDigits(totalDigits, works.length);

    window.__viewer = viewer;   // 動作確認用
    viewer.go(0, true);
    setWorkColor(works[0]);
    setLabel(works[0]);
    setDigits(numDigits, 1);
    viewer.start();

    $('prev').addEventListener('click', function () { viewer.go(viewer.index - 1); });
    $('next').addEventListener('click', function () { viewer.go(viewer.index + 1); });

    /* ---- カーソル追従 ---- */
    var cursor = $('cursor');
    var px = innerWidth / 2, py = innerHeight / 2, cx = px, cy = py, over = false;
    addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      var r = viewer.rect();
      var inside = px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
      if (inside !== over) { over = inside; cursor.style.opacity = inside ? '1' : '0'; }
    });
    (function follow() {
      cx += (px - cx) * 0.2; cy += (py - cy) * 0.2;
      cursor.style.transform = 'translate(-50%,-50%) translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
      requestAnimationFrame(follow);
    })();

    viewerCanvas.addEventListener('click', function (e) {
      var r = viewer.rect();
      if (e.clientX >= r.x && e.clientX <= r.x + r.w && e.clientY >= r.y && e.clientY <= r.y + r.h) {
        openDetail(works[viewer.index]);
      }
    });

    /* ---- 送り操作 ---- */
    var busy = false;
    function guard() {
      return $('settings').classList.contains('is-open') || $('detail').classList.contains('is-open');
    }
    addEventListener('wheel', function (e) {
      if (guard() || busy || Math.abs(e.deltaY) < 8) return;
      busy = true;
      viewer.go(viewer.index + (e.deltaY > 0 ? 1 : -1));
      setTimeout(function () { busy = false; }, 520);
    }, { passive: true });

    addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($('detail').classList.contains('is-open')) return closeDetail();
        if ($('settings').classList.contains('is-open')) return closeSettings();
      }
      if (guard()) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); viewer.go(viewer.index + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); viewer.go(viewer.index - 1); }
      if (e.key === 'Enter') openDetail(works[viewer.index]);
    });

    var ty = 0;
    addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchend', function (e) {
      if (guard()) return;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dy) > 45) viewer.go(viewer.index + (dy < 0 ? 1 : -1));
    }, { passive: true });

    Array.prototype.forEach.call(document.querySelectorAll('[data-close-detail]'), function (el) {
      el.addEventListener('click', closeDetail);
    });
  }

  /* ---- 設定 ---- */
  function closeSettings() { $('settings').classList.remove('is-open'); }
  var openBtn = $('openSettings');
  if (openBtn) {
    openBtn.addEventListener('click', function () { $('settings').classList.add('is-open'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-close-settings]'), function (el) {
      el.addEventListener('click', closeSettings);
    });
  }

  var GAP = 8;
  function syncSeg() {
    Array.prototype.forEach.call(document.querySelectorAll('.seg'), function (seg) {
      var key = seg.dataset.key;
      var items = seg.querySelectorAll('.seg__item');
      var n = items.length, idx = 0;
      Array.prototype.forEach.call(items, function (it, i) {
        it.style.width = 'calc((100% - ' + (GAP * (n - 1)) + 'px) / ' + n + ')';
        var on = it.dataset.value === prefs[key];
        it.classList.toggle('is-on', on);
        it.setAttribute('aria-pressed', String(on));
        if (on) idx = i;
      });
      var mark = seg.querySelector('.seg__mark');
      mark.style.width = 'calc(' + (100 / n) + '% - ' + (GAP * (n - 1) / n) + 'px)';
      mark.style.transform = 'translateX(' + (idx * 100) + '%) translateX(' + (idx * GAP) + 'px)';
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.seg__item'), function (it) {
    it.addEventListener('click', function () {
      var key = it.closest('.seg').dataset.key;
      prefs[key] = it.dataset.value;
      savePrefs();
      applyTheme();
      applyMotion();
      syncSeg();
    });
  });

  function applyMotion() {
    var off = prefs.motion === 'off';
    if (pattern) { pattern._reduce = off; }
    if (viewer) { viewer._reduce = off; }
  }

  syncSeg();
  applyTheme();
  applyMotion();
  if (darkMQ.addEventListener) darkMQ.addEventListener('change', applyTheme);

  /* ---- リサイズ ---- */
  var rt = 0;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (pattern) pattern.resize();
      if (viewer) { viewer.resize(); placeLabel(); }
    }, 120);
  });
})();
