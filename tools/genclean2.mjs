// Clean the 6x4 Hanuman sheet (spritesheet2.png) into public/assets/game/hero6.png.
//
// The source "transparent" background is a painted opaque checkerboard, and the
// figures are NOT aligned to a rigid grid: the flying poses (bottom row) are wide
// and horizontal and drift across the nominal 341px cell borders. Slicing on
// fixed cell rectangles therefore chopped those figures into fragments.
//
// Instead we (1) flood-fill the checker away from the borders, (2) defringe the
// figure edges, then (3) find each row's figures as connected components and
// place the six largest, ordered left-to-right, into uniform bottom-aligned cells.
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
  // Checker background test: neutral grey (dark or light square of the checker).
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
  // Defringe: several passes trim the pale/grey checker halo left at figure
  // edges. Edge pixels use a looser neutral test (anti-aliased checker blends
  // slightly toward the figure colour), and each pass exposes the next ring.
  const isHalo = (i) => {
    const r = d[i], g = d[i + 1], bl = d[i + 2];
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    return (mx - mn) <= 60;
  };
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

  // Find figures per row as connected components (the source is not grid-aligned).
  const outW = Math.floor(W / cols), outH = Math.floor(H / rows); // 341 x 512
  const rowH = Math.floor(H / rows);
  const out = document.createElement('canvas'); out.width = outW * cols; out.height = outH * rows;
  const ox = out.getContext('2d');
  const baseline = outH - 16;

  const alpha = (x, y) => d[idx(x, y) + 3];
  for (let r = 0; r < rows; r++) {
    const y0 = r * rowH, y1 = (r + 1) * rowH;
    const lab = new Int32Array(W * rowH).fill(-1);
    const comps = [];
    for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
      if (alpha(x, y) <= 20) continue;
      const li = (y - y0) * W + x; if (lab[li] !== -1) continue;
      const q = [x, y]; lab[li] = comps.length;
      let minx = x, maxx = x, miny = y, maxy = y, cnt = 0;
      while (q.length) {
        const cy = q.pop(), cx = q.pop();
        cnt++;
        if (cx < minx) minx = cx; if (cx > maxx) maxx = cx;
        if (cy < miny) miny = cy; if (cy > maxy) maxy = cy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < y0 || nx >= W || ny >= y1) continue;
          const nl = (ny - y0) * W + nx;
          if (lab[nl] === -1 && alpha(nx, ny) > 20) { lab[nl] = comps.length; q.push(nx, ny); }
        }
      }
      comps.push({ minx, maxx, miny, maxy, cnt });
    }
    // The six real figures are by far the largest blobs; take them and order L->R.
    comps.sort((a, b) => b.cnt - a.cnt);
    const figs = comps.slice(0, cols).sort((a, b) => a.minx - b.minx);
    figs.forEach((f, cc) => {
      const fw = f.maxx - f.minx + 1, fh = f.maxy - f.miny + 1;
      const dx = cc * outW + Math.round((outW - fw) / 2);
      const dy = r * outH + Math.round(baseline - fh);
      ox.drawImage(c, f.minx, f.miny, fw, fh, dx, dy, fw, fh);
    });
  }
  return out.toDataURL('image/png');
});
const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/hero6.png', Buffer.from(base64, 'base64'));
console.log('wrote public/assets/game/hero6.png', Buffer.from(base64, 'base64').length, 'bytes');
await b.close();
