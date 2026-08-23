// Generic cleaner for warm-colored sprites on a neutral checker background.
// Usage: node gensimple.mjs <srcFile> <outFile> <cols>
// Flood-clears the neutral checker from the border, then slices into `cols`
// equal cells, finds each cell's content bbox, and places it centered in a
// uniform output cell sized to the largest bbox. cols=1 => tight crop.
import { chromium } from 'playwright';
import fs from 'fs';
const [srcFile, outFile, colsArg] = process.argv.slice(2);
const COLS = parseInt(colsArg, 10);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const res = await p.evaluate(async ({ srcFile, COLS }) => {
  const img = new Image(); img.src = '/assets/game/' + srcFile + '?' + Date.now(); await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  const idx = (x, y) => (y * W + x) * 4;
  const isBg = (i) => { const R = d[i], G = d[i + 1], B = d[i + 2]; const mx = Math.max(R, G, B), mn = Math.min(R, G, B); return (mx - mn) <= 40; };
  const vis = new Uint8Array(W * H); const st = [];
  for (let x = 0; x < W; x++) { st.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { st.push(0, y, W - 1, y); }
  while (st.length) { const y = st.pop(), x = st.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const pp = y * W + x; if (vis[pp]) continue; vis[pp] = 1; const i = pp * 4; if (d[i + 3] === 0) { } else if (!isBg(i)) continue; d[i + 3] = 0; st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1, x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1); }
  const isHalo = (i) => { const R = d[i], G = d[i + 1], B = d[i + 2]; const mx = Math.max(R, G, B), mn = Math.min(R, G, B); return (mx - mn) <= 55; };
  for (let pass = 0; pass < 2; pass++) { const clr = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); if (d[i + 3] === 0) continue; let e = false; for (let dy = -1; dy <= 1 && !e; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (d[idx(nx, ny) + 3] === 0) { e = true; break; } } if (e && isHalo(i)) clr.push(i); } if (!clr.length) break; clr.forEach((i) => { d[i + 3] = 0; }); }
  ctx.putImageData(im, 0, 0);
  // Per-cell bbox.
  const boxes = [];
  for (let cc = 0; cc < COLS; cc++) {
    const x0 = Math.round(cc * W / COLS), x1 = Math.round((cc + 1) * W / COLS);
    let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) if (d[idx(x, y) + 3] > 20) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    if (maxx < 0) { boxes.push(null); continue; }
    boxes.push({ minx, miny, w: maxx - minx + 1, h: maxy - miny + 1 });
  }
  const pad = 8;
  const outW = Math.max(...boxes.filter(Boolean).map((b) => b.w)) + pad * 2;
  const outH = Math.max(...boxes.filter(Boolean).map((b) => b.h)) + pad * 2;
  const out = document.createElement('canvas'); out.width = outW * COLS; out.height = outH;
  const ox = out.getContext('2d');
  boxes.forEach((b, cc) => { if (!b) return; const dx = cc * outW + Math.round((outW - b.w) / 2); const dy = Math.round((outH - b.h) / 2); ox.drawImage(c, b.minx, b.miny, b.w, b.h, dx, dy, b.w, b.h); });
  return { url: out.toDataURL('image/png'), outW, outH };
}, { srcFile, COLS });
const base64 = res.url.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/' + outFile, Buffer.from(base64, 'base64'));
console.log('wrote', outFile, res.outW + 'x' + res.outH, 'cells x' + COLS);
await b.close();
