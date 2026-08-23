// boulder.png ships with a baked, perfectly-neutral grey checkerboard (two
// shades ~118 and ~152, R=G=B) behind a WARM grey rock (R>G>B). The generic
// stripBackground keys any neutral grey and so erased the rock. Here we key
// ONLY neutral checker shades (keeping the warm rock), flood from the border,
// defringe, and overwrite boulder.png with a clean real-alpha version.
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const dataUrl = await p.evaluate(async () => {
  const img = new Image(); img.src = '/assets/game/boulder_orig.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  const idx = (x, y) => (y * W + x) * 4;
  const isChecker = (i) => {
    const r = d[i], g = d[i + 1], bl = d[i + 2];
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    if (mx - mn > 12) return false;                 // warm rock pixel -> keep
    const v = (r + g + bl) / 3;
    return Math.abs(v - 118) <= 16 || Math.abs(v - 152) <= 14;
  };
  // Flood from the border, clearing checker only.
  const vis = new Uint8Array(W * H); const st = [];
  for (let x = 0; x < W; x++) { st.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { st.push(0, y, W - 1, y); }
  while (st.length) {
    const y = st.pop(), x = st.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const pp = y * W + x; if (vis[pp]) continue; vis[pp] = 1;
    const i = pp * 4;
    if (d[i + 3] === 0) { } else if (!isChecker(i)) continue;
    d[i + 3] = 0;
    st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1, x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1);
  }
  // Defringe: trim the antialiased grey rim (neutral-ish) touching transparency.
  const isRim = (i) => { const r = d[i], g = d[i + 1], bl = d[i + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); const v = (r + g + bl) / 3; return (mx - mn) <= 20 && v >= 95 && v <= 170; };
  for (let pass = 0; pass < 2; pass++) {
    const toClear = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); if (d[i + 3] === 0) continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (d[idx(nx, ny) + 3] === 0) { edge = true; break; }
      }
      if (edge && isRim(i)) toClear.push(i);
    }
    if (!toClear.length) break;
    toClear.forEach((i) => { d[i + 3] = 0; });
  }
  // Keep only the largest connected component (the rock); drop stray checker specks.
  {
    const lab = new Int32Array(W * H).fill(-1); let best = -1, bestN = 0; const comps = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[idx(x, y) + 3] <= 20) continue;
      const s0 = y * W + x; if (lab[s0] !== -1) continue;
      const q = [x, y]; lab[s0] = comps.length; let n = 0;
      while (q.length) {
        const cy = q.pop(), cx = q.pop(); n++;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nl = ny * W + nx; if (lab[nl] === -1 && d[nl * 4 + 3] > 20) { lab[nl] = comps.length; q.push(nx, ny); }
        }
      }
      comps.push(n); if (n > bestN) { bestN = n; best = comps.length - 1; }
    }
    for (let s = 0; s < W * H; s++) if (lab[s] !== best) d[s * 4 + 3] = 0;
  }
  // Crop to the rock's bounding box so it isn't a tiny blob in a 1024 canvas.
  let minx = W, miny = H, maxx = -1, maxy = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[idx(x, y) + 3] > 20) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  ctx.putImageData(im, 0, 0);
  const pad = 6, cw = maxx - minx + 1 + pad * 2, ch = maxy - miny + 1 + pad * 2;
  const out = document.createElement('canvas'); out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(c, minx - pad, miny - pad, cw, ch, 0, 0, cw, ch);
  return { url: out.toDataURL('image/png'), cw, ch };
});
const base64 = dataUrl.url.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/boulder.png', Buffer.from(base64, 'base64'));
console.log('wrote clean boulder.png', dataUrl.cw + 'x' + dataUrl.ch, Buffer.from(base64, 'base64').length, 'bytes');
await b.close();
