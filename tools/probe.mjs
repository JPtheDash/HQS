import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const files = ['ground', 'platform-ledge', 'banana', 'boulder', 'finish-gate', 'Mango', 'coconut', 'hanuman'];
const res = await page.evaluate(async (files) => {
  const load = (u) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = u; });
  const out = {};
  for (const f of files) {
    const img = await load('/assets/game/' + f + '.png');
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    // corner alpha tells us if the "transparent" area is really opaque checker
    out[f] = { size: [img.width, img.height], corner: px(6, 6), cornerAlpha: px(6, 6)[3] };
  }
  return out;
}, files);
console.log(JSON.stringify(res, null, 2));
await browser.close();
