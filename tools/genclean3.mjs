// Clean latest_src.png -> public/assets/game/hero6.png (uniform 8x4 grid).
//
// The source rows hold different frame counts (idle=8, run/jump/fly=6) and the
// figures are not grid-aligned, so we detect each row's figures as connected
// components (largest blobs), then place them left-aligned into a uniform 8-col
// grid: idle 0-7, run 8-13, jump 16-21, fly 24-29 (trailing cells left empty).
import { chromium } from 'playwright';
import fs from 'fs';
const COLS = 8, ROWS = 4, OUTW = 224, OUTH = 208, BASE = OUTH - 12;
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const dataUrl = await p.evaluate(async ({ COLS, ROWS, OUTW, OUTH, BASE }) => {
  const img = new Image(); img.src = '/assets/game/latest_src.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  const idx = (x, y) => (y * W + x) * 4;
  const isBg = (i) => { const r = d[i], g = d[i + 1], bl = d[i + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); return (mx - mn) <= 40; };
  // Flood-clear the checker background from the borders.
  const vis = new Uint8Array(W * H); const st = [];
  for (let x = 0; x < W; x++) { st.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { st.push(0, y, W - 1, y); }
  while (st.length) {
    const y = st.pop(), x = st.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const pp = y * W + x; if (vis[pp]) continue; vis[pp] = 1;
    const i = pp * 4;
    if (d[i + 3] === 0) { } else if (!isBg(i)) continue;
    d[i + 3] = 0;
    st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1, x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1);
  }
  // Defringe the checker halo at figure edges (several passes, looser test).
  const isHalo = (i) => { const r = d[i], g = d[i + 1], bl = d[i + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); return (mx - mn) <= 60; };
  for (let pass = 0; pass < 3; pass++) {
    const toClear = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); if (d[i + 3] === 0) continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (d[idx(nx, ny) + 3] === 0) { edge = true; break; }
      }
      if (edge && isHalo(i)) toClear.push(i);
    }
    if (!toClear.length) break;
    toClear.forEach((i) => { d[i + 3] = 0; });
  }
  ctx.putImageData(im, 0, 0);

  const rowH = Math.floor(H / ROWS);
  const alpha = (x, y) => d[idx(x, y) + 3];
  const out = document.createElement('canvas'); out.width = OUTW * COLS; out.height = OUTH * ROWS;
  const ox = out.getContext('2d');
  const perRow = [];
  for (let r = 0; r < ROWS; r++) {
    const y0 = r * rowH, y1 = (r + 1) * rowH;
    const lab = new Int32Array(W * rowH).fill(-1); const comps = [];
    for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
      if (alpha(x, y) <= 20) continue;
      const li = (y - y0) * W + x; if (lab[li] !== -1) continue;
      const q = [x, y]; lab[li] = comps.length; let minx = x, maxx = x, miny = y, maxy = y, cnt = 0;
      while (q.length) {
        const cy = q.pop(), cx = q.pop(); cnt++;
        if (cx < minx) minx = cx; if (cx > maxx) maxx = cx; if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < y0 || nx >= W || ny >= y1) continue;
          const nl = (ny - y0) * W + nx; if (lab[nl] === -1 && alpha(nx, ny) > 20) { lab[nl] = comps.length; q.push(nx, ny); }
        }
      }
      comps.push({ minx, maxx, miny, maxy, cnt });
    }
    // Keep real figures (large blobs), ordered left-to-right.
    const figs = comps.filter((f) => f.cnt > 1500).sort((a, b) => a.minx - b.minx);
    perRow.push(figs.length);
    figs.forEach((f, cc) => {
      if (cc >= COLS) return;
      const fw = f.maxx - f.minx + 1, fh = f.maxy - f.miny + 1;
      const dx = cc * OUTW + Math.round((OUTW - fw) / 2);
      const dy = r * OUTH + Math.round(BASE - fh);
      ox.drawImage(c, f.minx, f.miny, fw, fh, dx, dy, fw, fh);
    });
  }
  return { url: out.toDataURL('image/png'), perRow };
}, { COLS, ROWS, OUTW, OUTH, BASE });
const base64 = dataUrl.url.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/hero6.png', Buffer.from(base64, 'base64'));
console.log('wrote hero6.png', Buffer.from(base64, 'base64').length, 'bytes; figures per row:', dataUrl.perRow, 'cell', OUTW + 'x' + OUTH);
await b.close();
