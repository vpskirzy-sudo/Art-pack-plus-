const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await b.newContext({ viewport:{ width:1440, height:800 } });
  await ctx.route('**', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  const p = await ctx.newPage();
  // Страницы подгрупп продукции генерируются из tools/products_data.py,
  // поэтому подхватываем их с диска — список не придётся править руками.
  const root = path.resolve(__dirname, '../..');
  const detail = fs.readdirSync(root)
    .filter(f => /^produkciya-.+\.html$/.test(f))
    .map(f => f.replace(/\.html$/, ''));
  const pages = ['index','o-kompanii','produkciya','uslugi','oborudovanie','kontakty', ...detail];
  const widths = [1600,1440,1366,1280,1200,1100,1024,900,768,600,480,390,360];
  let bad = 0;
  for (const name of pages) {
    await p.goto(`file://${path.resolve(__dirname, '../..')}/${name}.html`, { waitUntil:'domcontentloaded' });
    for (const w of widths) {
      await p.setViewportSize({ width:w, height:800 });
      await p.waitForTimeout(60);
      const r = await p.evaluate(() => ({ vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
      if (r.sw > r.vw + 1) { console.log(`OVERFLOW ${name}.html @${w}px: ${r.sw} > ${r.vw}`); bad++; }
    }
  }
  console.log(bad === 0 ? 'OK: горизонтального переполнения нет ни на одной ширине' : `Проблем: ${bad}`);
  await b.close();
})();
