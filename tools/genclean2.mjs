// Clean the new 6x4 Hanuman sheet (spritesheet2.png): its "transparent"
// background is a painted opaque checkerboard, so (1) flood-fill the checker
// away from the borders (preserving the figures' interior highlights), then
// (2) recenter each padded figure into a uniform, integer-sized, bottom-aligned
// cell. Saves public/assets/game/hero6.png as a clean 6x4 spritesheet.
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const dataUrl = await p.evaluate(async () => {
  const img = new Image(); img.src = '/assets/game/spritesheet2.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height, cols = 6, rows = 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  const idx = (x, y) => (y * W + x) * 4;
  // Checker background test: neutral grey, very dark OR fairly light.
  const isBg = (i) => {
    const r = d[i], g = d[i + 1], bl = d[i + 2];
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    return (mx - mn) <= 40;
  };
  // Flood from the border, clearing background.
  const vis = new Uint8Array(W * H); const st = [];
  for (let x = 0; x < W; x++) { st.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { st.push(0, y, W - 1, y); }
  while (st.length) {
    const y = st.pop(), x = st.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const pp = y * W + x; if (vis[pp]) continue; vis[pp] = 1;
    const i = pp * 4;
    if (d[i + 3] === 0) { /* already clear */ } else if (!isBg(i)) continue;
    d[i + 3] = 0;
    st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1, x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1);
  }
  // Defringe: trim leftover checker halo touching transparency.
  const toClear = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y); if (d[i + 3] === 0) continue;
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (d[idx(nx, ny) + 3] === 0) { edge = true; break; }
    }
    if (edge && isBg(i)) toClear.push(i);
  }
  toClear.forEach((i) => { d[i + 3] = 0; });
  ctx.putImageData(im, 0, 0);

  // Recenter each figure into a uniform integer cell, bottom-aligned.
  const outW = Math.floor(W / cols), outH = Math.floor(H / rows); // 341 x 512
  const out = document.createElement('canvas'); out.width = outW * cols; out.height = outH * rows;
  const ox = out.getContext('2d');
  const baseline = outH - 16;
  for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
    const x0 = Math.round(cc * W / cols), x1 = Math.round((cc + 1) * W / cols);
    const y0 = Math.round(r * H / rows), y1 = Math.round((r + 1) * H / rows);
    let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (d[idx(x, y) + 3] > 20) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    }
    if (maxx < 0) continue;
    const fw = maxx - minx + 1, fh = maxy - miny + 1;
    const dx = cc * outW + Math.round((outW - fw) / 2);
    const dy = r * outH + Math.round(baseline - fh);
    ox.drawImage(c, minx, miny, fw, fh, dx, dy, fw, fh);
  }
  return out.toDataURL('image/png');
});
const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/hero6.png', Buffer.from(base64, 'base64'));
console.log('wrote public/assets/game/hero6.png', Buffer.from(base64, 'base64').length, 'bytes');
await b.close();
