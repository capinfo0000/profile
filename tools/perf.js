/* 1フレームあたりの描画コストを測る。
   使い方:  node tools/perf.js [幅] [高さ]      既定 1920x1080 */
const path = require('path');
const { chromium } = require('playwright-core');

const SITE = 'file://' + path.join(path.resolve(__dirname, '..'), 'site');
const W = Number(process.argv[2]) || 1920;
const H = Number(process.argv[3]) || 1080;
const EXE = process.env.CHROME || undefined;

(async () => {
  const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const p = await b.newPage({ viewportSize: { width: W, height: H } });
  await p.goto(SITE + '/works.html');
  await p.waitForTimeout(1500);

  const r = await p.evaluate(() => {
    const pat = window.__pattern, v = window.__viewer;
    let t0 = performance.now();
    for (let i = 0; i < 30; i++) pat.draw();
    const bg = (performance.now() - t0) / 30;

    const art = v._getArt(0);
    t0 = performance.now();
    for (let i = 0; i < 20; i++) v._drawSwirl(art, 0.5, 1, 7);
    const swirl = (performance.now() - t0) / 20;

    t0 = performance.now();
    for (let i = 0; i < 30; i++) v.draw(performance.now());
    const view = (performance.now() - t0) / 30;
    return { bg, swirl, view };
  });

  console.log(`${W}x${H} 1フレームあたり`);
  console.log(`  背景の幾何学模様 : ${r.bg.toFixed(1)} ms`);
  console.log(`  作品（通常時）   : ${r.view.toFixed(1)} ms`);
  console.log(`  渦（切替中のみ） : ${r.swirl.toFixed(1)} ms`);
  await b.close();
})();
