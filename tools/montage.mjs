import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 820 } });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.evaluate(async () => {
  const img = new Image();
  img.src = '/assets/game/spritesheet.png?' + Date.now();
  await img.decode();
  const fw = 192, fh = 256, cols = 8, rows = 4, pad = 6, cw = 110, ch = 146;
  const cv = document.createElement('canvas');
  cv.width = cols * (cw + pad);
  cv.height = rows * (ch + pad);
  const ctx = cv.getContext('2d');
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const dx = c * (cw + pad), dy = r * (ch + pad);
    ctx.fillStyle = '#555'; ctx.fillRect(dx, dy, cw, ch);
    ctx.drawImage(img, c * fw, r * fh, fw, fh, dx, dy, cw, ch);
    ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1; ctx.strokeRect(dx + 0.5, dy + 0.5, cw, ch);
  }
  cv.id = 'montage';
  document.body.style.margin = '0';
  document.body.innerHTML = '';
  document.body.appendChild(cv);
});
await p.waitForTimeout(300);
const el = await p.$('#montage');
await el.screenshot({ path: 'shots/montage.png' });
console.log('done');
await b.close();
