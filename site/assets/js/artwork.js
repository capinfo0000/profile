/* ============================================================
   作品画像の仮生成
   ------------------------------------------------------------
   本番は各プロダクトのスクリーンショット（ダミーデータで撮影）に
   差し替える。それまでの place holder として、作品の色から
   抽象的な1枚をその場で描く。

   makeArtwork(work, w, h) -> { canvas, r, g, b }
   r/g/b は RGBずらし演出のためのチャンネル分解済みキャンバス。
   ============================================================ */
(function (global) {
  'use strict';

  function rng(seedStr) {
    var s = 0;
    for (var i = 0; i < seedStr.length; i++) s = (Math.imul(s, 31) + seedStr.charCodeAt(i)) | 0;
    s = s >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shade(hex, amt) {
    var h = hex.replace('#', '');
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, k = Math.abs(amt);
    return 'rgb(' + Math.round(r + (t - r) * k) + ',' +
                    Math.round(g + (t - g) * k) + ',' +
                    Math.round(b + (t - b) * k) + ')';
  }

  function channel(src, color) {
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    var x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function makeArtwork(work, w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var rand = rng(work.id);

    // 地：作品の色の濃淡でグラデーション
    var g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, shade(work.color, -0.35));
    g.addColorStop(0.55, work.color);
    g.addColorStop(1, shade(work.color, -0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 大きな図形を数枚。半透明で重ねる
    var shapes = 5 + Math.floor(rand() * 4);
    for (var i = 0; i < shapes; i++) {
      var cx = rand() * w, cy = rand() * h;
      var s = (0.18 + rand() * 0.42) * Math.min(w, h);
      ctx.save();
      ctx.globalAlpha = 0.10 + rand() * 0.22;
      ctx.fillStyle = rand() < 0.5 ? '#ffffff' : shade(work.color, -0.7);
      ctx.translate(cx, cy);
      ctx.rotate(rand() * Math.PI);
      var kind = rand();
      if (kind < 0.34) {
        ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill();
      } else if (kind < 0.67) {
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // 走査線。写真の代わりに質感を足す
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000';
    for (var y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.restore();

    // 作品名を中央に置く（本番は写真になるので消える）
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(Math.min(w, h) * 0.085) + 'px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(work.title, w / 2, h / 2 - Math.min(w, h) * 0.03);
    ctx.globalAlpha = 0.7;
    ctx.font = Math.round(Math.min(w, h) * 0.042) + 'px "Hiragino Sans", "Noto Sans JP", sans-serif';
    ctx.fillText(work.sub, w / 2, h / 2 + Math.min(w, h) * 0.055);
    ctx.restore();

    return {
      canvas: c,
      r: channel(c, '#ff0000'),
      g: channel(c, '#00ff00'),
      b: channel(c, '#0000ff')
    };
  }

  global.makeArtwork = makeArtwork;
})(window);
