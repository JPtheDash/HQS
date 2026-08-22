// Render the REBUILT in-memory 'hero' spritesheet (after buildHeroSheet) so we
// can see exactly what each frame looks like post-repack.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 820 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600); // let Boot->Preload run buildHeroSheet
await page.evaluate(() => {
  const tex = window.game.textures.get('hero');
  const src = tex.getSourceImage();
  const total = tex.frameTotal - 1; // minus __BASE
  const cols = 8, rows = 4, cw = 110, ch = 146, pad = 6;
  const cv = document.createElement('canvas');
  cv.width = cols * (cw + pad); cv.height = rows * (ch + pad);
  const ctx = cv.getContext('2d');
  for (let i = 0; i < total; i++) {
    const f = tex.get(i);
    const r = Math.floor(i / cols), c = i % cols;
    const dx = c * (cw + pad), dy = r * (ch + pad);
    ctx.fillStyle = '#555'; ctx.fillRect(dx, dy, cw, ch);
    ctx.drawImage(src, f.cutX, f.cutY, f.cutWidth, f.cutHeight, dx, dy, cw, ch);
    ctx.strokeStyle = '#0f0'; ctx.strokeRect(dx + 0.5, dy + 0.5, cw, ch);
  }
  cv.id = 'm'; document.body.style.margin = '0'; document.body.innerHTML = ''; document.body.appendChild(cv);
});
await page.waitForTimeout(200);
const el = await page.$('#m');
await el.screenshot({ path: 'shots/hero_repacked.png' });
console.log('done');
await browser.close();
