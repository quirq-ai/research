// Renders the deck with Playwright's Chromium at 1920x1080.
// usage: node gen/render.js <deck dir> check            overflow check of every slide (positive "over" = overflow)
//        node gen/render.js <deck dir> shot <out dir>   one PNG per slide
//        node gen/render.js <deck dir> pdf <out.pdf>    one slide per page
// Fonts: Inter, Poppins and JetBrains Mono from Google Fonts. If gen/fonts.css exists (the Google
// Fonts CSS with the font files inlined as data: URLs) it is used; otherwise the page links Google Fonts.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('playwright-core'); } })();
const fs = require('fs'), path = require('path');
const [deck, mode, outArg, ...only] = process.argv.slice(2);
const local = path.join(__dirname, 'fonts.css');
const GOOGLE = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600&family=JetBrains+Mono:wght@400;600&display=swap';
const fontsCss = fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : '';
const fontsLink = fontsCss ? '' : `<link href="${GOOGLE}" rel="stylesheet">`;
const meta = JSON.parse(fs.readFileSync(path.join(deck, 'deck.json'), 'utf8'));
const order = meta.order;
const ids = only.length ? only : order;
const wrap = body => `<!doctype html><html><head><meta charset="utf-8"><title>${meta.title}</title>${fontsLink}<style>${fontsCss}\n@page{size:1920px 1080px;margin:0}html,body{margin:0;padding:0;background:#100f14}section{break-after:page;page-break-after:always;overflow:hidden}</style></head><body>${body}</body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  if (mode === 'pdf') {
    const body = order.map(id => fs.readFileSync(path.join(deck, 'slides', id + '.html'), 'utf8')).join('\n');
    await p.setContent(wrap(body), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    console.log('fonts ok:', await p.evaluate(() => ['Inter','Poppins','JetBrains Mono'].map(f => f + '=' + document.fonts.check(`600 16px "${f}"`)).join(' ')));
    await p.pdf({ path: outArg, width: '1920px', height: '1080px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    console.log('pages:', order.length);
  } else {
    for (const id of ids) {
      await p.setContent(wrap(fs.readFileSync(path.join(deck, 'slides', id + '.html'), 'utf8')), { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      const r = await p.evaluate(() => {
        const s = document.querySelector('section'); const box = s.getBoundingClientRect();
        let worst = -9999;
        for (const el of s.querySelectorAll('*')) { const rr = el.getBoundingClientRect(); worst = Math.max(worst, rr.bottom - (box.bottom - 128), rr.right - (box.right - 128)); if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow !== 'visible') worst = Math.max(worst, 999); }
        return { over: Math.round(worst), font: document.fonts.check('600 16px "Poppins"') && document.fonts.check('16px "Inter"') && document.fonts.check('16px "JetBrains Mono"') };
      });
      console.log(id, JSON.stringify(r), r.over > 0 ? 'OVERFLOW' : 'ok');
      if (mode === 'shot') await p.screenshot({ path: path.join(outArg, id + '.png') });
    }
  }
  await b.close();
})();
