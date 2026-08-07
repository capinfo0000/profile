/* ============================================================
   幾何学模様の背景
   ------------------------------------------------------------
   四分木（quadtree）で画面を再帰的に割り、葉になったマスに
   モチーフを1つ描く。これで大小のサイズが混ざった密度になる。

   マスの模様はグリッド座標のハッシュから決めているので、
   全体をゆっくり流しても模様が飛ばず、無限に続く。

   色は2トーンだけ。作品ごとの色をどちらにも少量だけ混ぜる。
   ============================================================ */
(function (global) {
  'use strict';

  /* ---- 乱数：座標から決まる（毎フレーム同じ値が出る） ---- */
  function hash2(x, y, seed) {
    var h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  function rngFrom(x, y, seed) {
    var s = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- 色 ---- */
  function parseHex(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }
  function css(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }

  /* 作品の色は「色みだけ」を借りて、明るさは元のトーンのまま使う。
     そのまま混ぜると濃い色のときに背景まで暗くなってしまうため。 */
  function hueOf(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return { h: 0, s: 0 };
    var h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
    var l = (max + min) / 2;
    return { h: h, s: d / (1 - Math.abs(2 * l - 1) || 1) };
  }
  function hsl(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r, g, b;
    if (h < 60)       { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function tinted(tone, work, sat) {
    var hs = hueOf(work);
    if (hs.s < 0.05) return tone;                 // 無彩色の作品はそのまま
    var l = (Math.max.apply(null, tone) + Math.min.apply(null, tone)) / 2 / 255;
    return hsl(hs.h, sat, l);
  }

  /* ---- モチーフ ----------------------------------------------
     どれも「1マスの中心 (cx,cy) と一辺 s」で描く。
     線幅はマスに対する比で決めるので、どのサイズでも同じ太さ感になる。
     ------------------------------------------------------------ */
  var MOTIFS = {
    ring: function (ctx, cx, cy, s) {
      ctx.lineWidth = s * 0.17;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.30, 0, Math.PI * 2); ctx.stroke();
    },
    ring2: function (ctx, cx, cy, s) {
      ctx.lineWidth = s * 0.10;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.33, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.17, 0, Math.PI * 2); ctx.stroke();
    },
    ringDot: function (ctx, cx, cy, s) {
      ctx.lineWidth = s * 0.11;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.31, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.11, 0, Math.PI * 2); ctx.fill();
    },
    disc: function (ctx, cx, cy, s) {
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.30, 0, Math.PI * 2); ctx.fill();
    },
    square: function (ctx, cx, cy, s) {
      var a = s * 0.60;
      ctx.lineWidth = s * 0.15;
      ctx.strokeRect(cx - a / 2, cy - a / 2, a, a);
    },
    square2: function (ctx, cx, cy, s) {
      ctx.lineWidth = s * 0.09;
      var a = s * 0.64, b = s * 0.32;
      ctx.strokeRect(cx - a / 2, cy - a / 2, a, a);
      ctx.strokeRect(cx - b / 2, cy - b / 2, b, b);
    },
    squareDot: function (ctx, cx, cy, s) {
      ctx.lineWidth = s * 0.10;
      var a = s * 0.62, b = s * 0.22;
      ctx.strokeRect(cx - a / 2, cy - a / 2, a, a);
      ctx.fillRect(cx - b / 2, cy - b / 2, b, b);
    },
    squareFill: function (ctx, cx, cy, s) {
      var a = s * 0.54;
      ctx.fillRect(cx - a / 2, cy - a / 2, a, a);
    },
    diamond: function (ctx, cx, cy, s) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      var a = s * 0.46;
      ctx.lineWidth = s * 0.14;
      ctx.strokeRect(-a / 2, -a / 2, a, a);
      ctx.restore();
    },
    diamond2: function (ctx, cx, cy, s) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      ctx.lineWidth = s * 0.085;
      var a = s * 0.48, b = s * 0.24;
      ctx.strokeRect(-a / 2, -a / 2, a, a);
      ctx.strokeRect(-b / 2, -b / 2, b, b);
      ctx.restore();
    },
    diamondFill: function (ctx, cx, cy, s) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4);
      var a = s * 0.44;
      ctx.fillRect(-a / 2, -a / 2, a, a);
      ctx.restore();
    },
    triangle: function (ctx, cx, cy, s, rng) {
      var rot = Math.floor(rng() * 4) * (Math.PI / 2);
      var a = s * 0.62;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(-a / 2, -a / 2); ctx.lineTo(a / 2, -a / 2); ctx.lineTo(-a / 2, a / 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    bars: function (ctx, cx, cy, s, rng) {
      var n = 2 + Math.floor(rng() * 3);
      var vertical = rng() < 0.5;
      var len = s * 0.62, w = s * 0.085, gap = s * 0.135;
      ctx.save(); ctx.translate(cx, cy); if (vertical) ctx.rotate(Math.PI / 2);
      var y0 = -((n - 1) * gap) / 2;
      for (var i = 0; i < n; i++) ctx.fillRect(-len / 2, y0 + i * gap - w / 2, len, w);
      ctx.restore();
    },
    halfDisc: function (ctx, cx, cy, s, rng) {
      var rot = Math.floor(rng() * 4) * (Math.PI / 2);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.34, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    arc: function (ctx, cx, cy, s, rng) {
      var rot = Math.floor(rng() * 4) * (Math.PI / 2);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      ctx.lineWidth = s * 0.16;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.31, Math.PI, Math.PI * 1.5); ctx.stroke();
      ctx.restore();
    },
    cross: function (ctx, cx, cy, s) {
      var len = s * 0.60, w = s * 0.13;
      ctx.fillRect(cx - len / 2, cy - w / 2, len, w);
      ctx.fillRect(cx - w / 2, cy - len / 2, w, len);
    },
    blank: function () {}
  };

  // 出現比。丸・四角・菱形を主役にして、残りを散らす
  var BAG = [
    'ring', 'ring', 'ring', 'ring2', 'ring2', 'ringDot', 'disc',
    'square', 'square', 'square2', 'square2', 'squareDot', 'squareFill',
    'diamond', 'diamond', 'diamond2', 'diamond2', 'diamondFill',
    'triangle', 'bars', 'bars', 'halfDisc', 'arc', 'cross',
    'blank', 'blank', 'blank', 'blank', 'blank', 'blank'
  ];

  /* ---- 本体 ---- */
  function Pattern(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.base = opts.base || 260;        // 一番大きいマスの一辺
    this.maxDepth = opts.maxDepth != null ? opts.maxDepth : 3;
    this.splitProb = opts.splitProb || [0.62, 0.55, 0.38];
    this.seed = opts.seed || 1;
    this.speed = opts.speed != null ? opts.speed : 0.10;  // px / frame
    this.breath = opts.breath != null ? opts.breath : 0.02;

    this.toneA = parseHex(opts.toneA || '#f9f9f9');   // 明るいほう
    this.toneB = parseHex(opts.toneB || '#ededed');   // 地のほう
    this.workColor = parseHex(opts.workColor || '#ededed');
    this.tintA = opts.tintA != null ? opts.tintA : 0.09;  // 彩度（明るさは変えない）
    this.tintB = opts.tintB != null ? opts.tintB : 0.12;

    this._curColor = this.workColor.slice();
    this._t = 0;
    this._off = 0;
    this._raf = 0;
    this._reduce = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    this.resize();
  }

  Pattern.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var w = rect.width || global.innerWidth;
    var h = rect.height || global.innerHeight;
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  Pattern.prototype.setWorkColor = function (hex) {
    this.workColor = parseHex(hex);
  };

  /* 1マスを再帰的に割って、葉になったところで描く
     模様はグリッド座標 (gx,gy) と四分木の経路 path から決める。
     画素位置ではないので、流しても模様が入れ替わらない。 */
  Pattern.prototype._cell = function (gx, gy, path, x, y, s, depth, colA, colB) {
    var ctx = this.ctx;
    var p = depth < this.splitProb.length ? this.splitProb[depth] : 0;

    if (depth < this.maxDepth && hash2(gx * 4096 + path, gy, this.seed + depth * 101) < p) {
      var h = s / 2;
      this._cell(gx, gy, path * 4 + 1, x,     y,     h, depth + 1, colA, colB);
      this._cell(gx, gy, path * 4 + 2, x + h, y,     h, depth + 1, colA, colB);
      this._cell(gx, gy, path * 4 + 3, x,     y + h, h, depth + 1, colA, colB);
      this._cell(gx, gy, path * 4 + 4, x + h, y + h, h, depth + 1, colA, colB);
      return;
    }

    // 画面の外は描かない
    if (x > this.w || y > this.h || x + s < 0 || y + s < 0) return;

    var rng = rngFrom(gx * 4096 + path, gy, this.seed);
    var flip = rng() < 0.45;
    var bg = flip ? colB : colA;
    var fg = flip ? colA : colB;

    ctx.fillStyle = bg;
    ctx.fillRect(x - 0.5, y - 0.5, s + 1, s + 1);

    var name = BAG[Math.floor(rng() * BAG.length)];
    if (name === 'blank') return;

    // ゆっくり息をする。位相はマスごとにずらす
    var phase = rng() * Math.PI * 2;
    var k = this._reduce ? 1 : 1 + Math.sin(this._t * 0.5 + phase) * this.breath;

    ctx.fillStyle = fg;
    ctx.strokeStyle = fg;
    MOTIFS[name](ctx, x + s / 2, y + s / 2, s * k, rng);
  };

  Pattern.prototype.draw = function () {
    var ctx = this.ctx;
    var base = this.base;

    // 作品の色へゆっくり寄せる
    this._curColor = mix(this._curColor, this.workColor, 0.04);
    var colA = css(tinted(this.toneA, this._curColor, this.tintA));
    var colB = css(tinted(this.toneB, this._curColor, this.tintB));

    ctx.fillStyle = colA;
    ctx.fillRect(0, 0, this.w, this.h);

    // 斜めにゆっくり流す
    var ox = -(this._off % base);
    var oy = -((this._off * 0.6) % base);
    var cols = Math.ceil(this.w / base) + 2;
    var rows = Math.ceil(this.h / base) + 2;
    var gx0 = Math.floor(this._off / base);
    var gy0 = Math.floor((this._off * 0.6) / base);

    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        this._cell(gx0 + i, gy0 + j, 0, ox + i * base, oy + j * base, base, 0, colA, colB);
      }
    }
  };

  Pattern.prototype._loop = function () {
    var self = this;
    this._raf = global.requestAnimationFrame(function () {
      if (!self._reduce) { self._t += 0.016; self._off += self.speed; }
      self.draw();
      self._loop();
    });
  };

  Pattern.prototype.start = function () { if (!this._raf) this._loop(); };
  Pattern.prototype.stop = function () {
    if (this._raf) { global.cancelAnimationFrame(this._raf); this._raf = 0; }
  };

  global.Pattern = Pattern;
})(window);
