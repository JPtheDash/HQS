// Bake a clean, uniform Hanuman spritesheet PNG from the raw generated sheet.
// Largest-connected-blob per cell (drops cross-cell bleed) + bottom-align to a
// shared baseline. Saves to public/assets/game/hero_clean.png so the game can
// load it as a normal spritesheet (no fragile runtime canvas texture).
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const dataUrl = await p.evaluate(async () => {
  const img = new Image();
  img.src = '/assets/game/spritesheet.png?' + Date.now();
  await img.decode();
  const W = img.width, H = img.height, cols = 8, rows = 4;
  const fw = Math.floor(W / cols), fh = Math.floor(H / rows);
  const sc = document.createElement('canvas'); sc.width = W; sc.height = H;
  const sx = sc.getContext('2d'); sx.drawImage(img, 0, 0);
  const sd = sx.getImageData(0, 0, W, H).data;
  const A = (x, y) => sd[(y * W + x) * 4 + 3];
  const outW = fw, outH = fh;
  const out = document.createElement('canvas'); out.width = cols * outW; out.height = rows * outH;
  const ox = out.getContext('2d');
  const od = ox.createImageData(out.width, out.height); const o = od.data;
  const baseline = outH - 10;
  const visited = new Uint8Array(W * H);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x0 = c * fw, x1 = x0 + fw, y0 = r * fh, y1 = y0 + fh;
    let best = null;
    for (let sy = y0; sy < y1; sy++) for (let sxx = x0; sxx < x1; sxx++) {
      if (visited[sy * W + sxx] || A(sxx, sy) <= 40) continue;
      let minx = sxx, maxx = sxx, miny = sy, maxy = sy; const px = [], py = [];
      const st = [sxx, sy];
      while (st.length) {
        const y = st.pop(), x = st.pop();
        if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
        const pp = y * W + x; if (visited[pp]) continue; visited[pp] = 1;
        if (A(x, y) <= 40) continue;
        px.push(x); py.push(y);
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1, x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1);
      }
      if (!best || px.length > best.px.length) best = { px, py, minx, maxx, miny, maxy };
    }
    if (!best) continue;
    const figW = best.maxx - best.minx + 1, figH = best.maxy - best.miny + 1;
    const cx = c * outW + Math.round((outW - figW) / 2);
    const cy = r * outH + Math.round(baseline - figH);
    for (let k = 0; k < best.px.length; k++) {
      const X = best.px[k], Y = best.py[k];
      const dx = cx + (X - best.minx), dy = cy + (Y - best.miny);
      if (dx < 0 || dy < 0 || dx >= out.width || dy >= out.height) continue;
      const si = (Y * W + X) * 4, di = (dy * out.width + dx) * 4;
      o[di] = sd[si]; o[di + 1] = sd[si + 1]; o[di + 2] = sd[si + 2]; o[di + 3] = sd[si + 3];
    }
  }
  ox.putImageData(od, 0, 0);
  return out.toDataURL('image/png');
});
const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/hero_clean.png', Buffer.from(base64, 'base64'));
console.log('wrote public/assets/game/hero_clean.png', Buffer.from(base64, 'base64').length, 'bytes');
await b.close();
