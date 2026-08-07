/* ============================================================
   作品ビューア（canvas 2D）
   ------------------------------------------------------------
   1. 布のようにたわませて描く（縦の短冊に切って上下にずらす）
   2. 切り替えは横の短冊に千切ってRGBをずらす

   参考サイトはこれをWebGL（GLSL）でやっているが、
   2Dコンテキストの drawImage を細かく分けるだけでも近い絵になる。
   外部ライブラリなし。
   ============================================================ */
(function (global) {
  'use strict';

  function hash(i, seed) {
    var h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(seed | 0, 0x9e3779b1);
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function Viewer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.works = opts.works || [];
    this.artRatio = opts.artRatio || 0.62;      // 画像の高さ / 幅
    this.warpAmp = opts.warpAmp != null ? opts.warpAmp : 14;
    this.duration = opts.duration || 720;       // 切り替えの長さ(ms)
    this.onChange = opts.onChange || function () {};

    this._art = {};            // id -> {canvas,r,g,b}
    this._scratch = document.createElement('canvas');
    this._sctx = this._scratch.getContext('2d');

    this.index = 0;
    this.prevIndex = 0;
    this._transStart = -1;
    this._t = 0;
    this._raf = 0;
    this._reduce = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    this.resize();
  }

  /* ---- 寸法 ---- */
  Viewer.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    this.w = rect.width || global.innerWidth;
    this.h = rect.height || global.innerHeight;
    this.dpr = Math.min(global.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 画像を置く矩形。画面の中央に、上下左右に余白を残して収める
    var maxW = Math.min(this.w * 0.60, 860);
    var maxH = this.h * 0.60;
    var aw = maxW, ah = aw * this.artRatio;
    if (ah > maxH) { ah = maxH; aw = ah / this.artRatio; }
    this.aw = Math.round(aw);
    this.ah = Math.round(ah);
    this.ax = Math.round((this.w - aw) / 2);
    this.ay = Math.round((this.h - ah) / 2);

    this._scratch.width = Math.round((this.aw + 400) * this.dpr);
    this._scratch.height = Math.round((this.ah + 220) * this.dpr);
    this._sctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this._art = {};   // サイズが変わったので作り直す
  };

  Viewer.prototype.rect = function () {
    return { x: this.ax, y: this.ay, w: this.aw, h: this.ah };
  };

  Viewer.prototype._getArt = function (i) {
    var work = this.works[i];
    if (!work) return null;
    if (!this._art[work.id]) {
      this._art[work.id] = global.makeArtwork(work, Math.round(this.aw), Math.round(this.ah));
    }
    return this._art[work.id];
  };

  /* ---- たわみ：縦の短冊に切って上下にずらす ---- */
  Viewer.prototype._drawWarped = function (ctx, src, x0, y0, w, h, t, alpha) {
    var step = 4;
    var amp = this.warpAmp * (this._reduce ? 0.35 : 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var i = 0; i < w; i += step) {
      var u = i / w;
      var wave = Math.sin(u * Math.PI * 1.7 + t * 0.75) * amp
               + Math.sin(u * Math.PI * 3.3 - t * 0.42) * amp * 0.34;
      var sc = 1 + Math.sin(u * Math.PI * 2.1 + t * 0.55) * 0.030;
      var dh = h * sc;
      var sw = Math.max(1, step * src.width / w);
      ctx.drawImage(
        src,
        i * src.width / w, 0, sw, src.height,
        x0 + i, y0 + wave + (h - dh) / 2, step + 1, dh
      );
    }
    ctx.restore();
  };

  /* ---- 渦：画素を極座標で回してRGBをずらす ------------------
     参考サイトはシェーダーで同じことをしている。
     ここでは ImageData を直接書き換える。等倍だと重いので
     半分の解像度で作ってから引き伸ばす（にじみは演出になる）。
     ------------------------------------------------------------ */
  Viewer.prototype._getLo = function (art) {
    if (art._lo) return art._lo;
    var lw = Math.max(8, Math.round(art.canvas.width / 2));
    var lh = Math.max(8, Math.round(art.canvas.height / 2));
    var c = document.createElement('canvas');
    c.width = lw; c.height = lh;
    var x = c.getContext('2d');
    x.drawImage(art.canvas, 0, 0, lw, lh);
    art._lo = { w: lw, h: lh, data: x.getImageData(0, 0, lw, lh).data };
    return art._lo;
  };

  Viewer.prototype._drawSwirl = function (art, env, alpha, seed) {
    var lo = this._getLo(art);
    var lw = lo.w, lh = lo.h, src = lo.data;

    if (!this._dst || this._dst.width !== lw || this._dst.height !== lh) {
      this._dstCanvas = document.createElement('canvas');
      this._dstCanvas.width = lw; this._dstCanvas.height = lh;
      this._dstCtx = this._dstCanvas.getContext('2d');
      this._dst = this._dstCtx.createImageData(lw, lh);
    }
    var dst = this._dst.data;

    var cx = lw / 2, cy = lh / 2;
    var rmax = Math.sqrt(cx * cx + cy * cy);
    var twist = env * 5.2;                 // 中心の回転量（ラジアン）
    var zoom = 1 + env * 0.55;             // 縮んで見えるように外側を引く
    var chSplit = env * 0.09;              // RGBの角度ずれ
    var noise = env * 0.30;

    for (var y = 0; y < lh; y++) {
      var dy = y - cy;
      for (var x = 0; x < lw; x++) {
        var dx = x - cx;
        var r = Math.sqrt(dx * dx + dy * dy);
        var i4 = (y * lw + x) * 4;

        var f = 1 - r / rmax; if (f < 0) f = 0;
        var a0 = Math.atan2(dy, dx) + twist * f * f;
        var rr = r * zoom * (1 + noise * Math.sin(r * 0.22 + seed) * f);

        // 渦が進むほど帯状に裂けていく
        if (env > 0.08) {
          var strand = Math.sin(a0 * 6.5 + rr * 0.26 + seed) * 0.5 + 0.5;
          if (strand < env * 0.62) { dst[i4 + 3] = 0; continue; }
        }

        // 3回サンプル（R/G/B を少しずつ違う角度から拾う）
        var got = 0;
        for (var ch = 0; ch < 3; ch++) {
          var a = a0 + (ch - 1) * chSplit;
          var sx = (cx + Math.cos(a) * rr) | 0;
          var sy = (cy + Math.sin(a) * rr) | 0;
          if (sx < 0 || sy < 0 || sx >= lw || sy >= lh) { dst[i4 + ch] = 255; continue; }
          dst[i4 + ch] = src[(sy * lw + sx) * 4 + ch];
          got++;
        }
        dst[i4 + 3] = got ? 255 : 0;
      }
    }

    this._dstCtx.putImageData(this._dst, 0, 0);

    var ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(this._dstCanvas, this.ax, this.ay, this.aw, this.ah);
    ctx.restore();
  };

  /* ---- 影 ---- */
  Viewer.prototype._shadow = function (alpha) {
    var ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.10 * alpha;
    ctx.fillStyle = '#000';
    ctx.filter = 'blur(24px)';
    ctx.fillRect(this.ax + 14, this.ay + 26, this.aw - 28, this.ah - 20);
    ctx.restore();
    ctx.filter = 'none';
  };

  /* ---- 描画 ---- */
  Viewer.prototype.draw = function (now) {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    var inTrans = this._transStart >= 0;
    var p = inTrans ? clamp01((now - this._transStart) / this.duration) : 1;

    if (!inTrans) {
      var art = this._getArt(this.index);
      if (!art) return;
      this._shadow(1);
      this._drawWarped(ctx, art.canvas, this.ax, this.ay, this.aw, this.ah, this._t, 1);
      return;
    }

    var outArt = this._getArt(this.prevIndex);
    var inArt = this._getArt(this.index);

    // 出ていく側：0→0.55 で壊れて消える
    var op = clamp01(p / 0.55);
    if (outArt && op < 1) {
      this._drawSwirl(outArt, easeOut(op), 1 - Math.pow(op, 3.5), this.prevIndex * 31 + 7);
    }
    // 入ってくる側：0.42→1 で組み上がる
    var ip = clamp01((p - 0.42) / 0.58);
    if (inArt && ip > 0) {
      var env = 1 - easeOut(ip);
      this._drawSwirl(inArt, env, Math.pow(ip, 0.5), this.index * 31 + 7);
      if (ip > 0.82) {
        // 渦は低解像度なので、最後だけ本来の描画へ重ねてすり替える
        var k = (ip - 0.82) / 0.18;
        this._shadow(k);
        this._drawWarped(ctx, inArt.canvas, this.ax, this.ay, this.aw, this.ah, this._t, k);
      }
    }

    if (p >= 1) this._transStart = -1;
  };

  /* ---- 操作 ---- */
  Viewer.prototype.go = function (index, immediate) {
    var n = this.works.length;
    if (!n) return;
    var next = ((index % n) + n) % n;
    if (next === this.index && !immediate) return;
    this.prevIndex = this.index;
    this.index = next;
    this._transStart = immediate || this._reduce ? -1 : performance.now();
    this.onChange(next, this.prevIndex);
  };

  Viewer.prototype.start = function () {
    var self = this;
    if (self._raf) return;
    (function loop(now) {
      self._raf = global.requestAnimationFrame(loop);
      if (!self._reduce) self._t += 0.016;
      self.draw(now || performance.now());
    })();
  };
  Viewer.prototype.stop = function () {
    if (this._raf) { global.cancelAnimationFrame(this._raf); this._raf = 0; }
  };

  global.Viewer = Viewer;
})(window);
