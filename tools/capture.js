/* サイト各画面のスクリーンショットを撮る。
   使い方:  node tools/capture.js [出力先ディレクトリ]
   既定の出力先は analysis/ 。JSエラーがあれば最後に出る。 */
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'file://' + path.join(ROOT, 'site');
const OUT  = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'analysis');

// Chromium の場所。環境変数 CHROME で上書きできる
const EXE = process.env.CHROME || undefined;

(async () => {
  const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
  const errs = [];
  const mk = async (w, h) => {
    const p = await b.newPage({ viewportSize: { width: w, height: h } });
    p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
    return p;
  };
  const shot = (p, name) => p.screenshot({ path: path.join(OUT, name) });

  const p = await mk(1280, 800);
  await p.goto(SITE + '/index.html');  await p.waitForTimeout(1300);
  await shot(p, 'サイト_トップ.png');

  await p.goto(SITE + '/works.html');  await p.waitForTimeout(1400);
  await p.mouse.move(640, 400);        await p.waitForTimeout(400);
  await shot(p, 'サイト_作品ビューア.png');

  await p.keyboard.press('Enter');     await p.waitForTimeout(500);
  await shot(p, 'サイト_作品詳細.png');
  await p.keyboard.press('Escape');    await p.waitForTimeout(200);

  await p.click('#openSettings');      await p.waitForTimeout(400);
  await p.click('.seg[data-key="theme"] .seg__item[data-value="dark"]');
  await p.waitForTimeout(700);
  await shot(p, 'サイト_ダーク.png');
  await p.click('.settings__close');   await p.waitForTimeout(600);

  await p.goto(SITE + '/about.html');  await p.waitForTimeout(1000);
  await shot(p, 'サイト_About.png');

  const m = await mk(390, 844);
  await m.goto(SITE + '/works.html');  await m.waitForTimeout(1400);
  await shot(m, 'サイト_スマホ.png');

  console.log(errs.length ? [...new Set(errs)].join('\n') : 'JSエラーなし');
  await b.close();
})();
