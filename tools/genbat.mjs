// Bake bat_src.png -> public/assets/game/bat.png (clean 6x3 grid).
// The bat's dark-purple body is near-neutral, so the generic flood-fill eats it.
// Instead: slice each cell slightly INSIDE the drawn grid lines, then flood-clear
// only the BRIGHT neutral checker (brightness-keyed) from the cell borders — this
// keeps the dark bat, its black outline, interior brights (eyes/fangs), the warm
// fireballs, and the death smoke. Positions are preserved (no recenter) so fly
// frames stay steady and the death smoke doesn't jump around.
import { chromium } from 'playwright';
import fs from 'fs';
const COLS = 6, ROWS = 3, INSET = 16;
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const res = await p.evaluate(async ({ COLS, ROWS, INSET }) => {
  const img = new Image(); img.src = '/assets/game/bat_src.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height;
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  src.getContext('2d').drawImage(img, 0, 0);
  const cellW = Math.floor(W / COLS), cellH = Math.floor(H / ROWS);
  const outW = cellW - INSET * 2, outH = cellH - INSET * 2;
  const out = document.createElement('canvas'); out.width = outW * COLS; out.height = outH * ROWS;
  const octx = out.getContext('2d');

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const sx = c * cellW + INSET, sy = r * cellH + INSET;
    // Pull the cell interior into its own canvas.
    const cell = document.createElement('canvas'); cell.width = outW; cell.height = outH;
    const cx = cell.getContext('2d');
    cx.drawImage(src, sx, sy, outW, outH, 0, 0, outW, outH);
    const im = cx.getImageData(0, 0, outW, outH); const d = im.data;
    const idx = (x, y) => (y * outW + x) * 4;
    const isChecker = (i) => { const R = d[i], G = d[i + 1], B = d[i + 2]; const mx = Math.max(R, G, B), mn = Math.min(R, G, B); return (mx - mn) <= 30 && (R + G + B) / 3 >= 95; };
    // Flood from the cell border, clearing bright neutral checker only.
    const vis = new Uint8Array(outW * outH); const st = [];
    for (let x = 0; x < outW; x++) { st.push(x, 0, x, outH - 1); }
    for (let y = 0; y < outH; y++) { st.push(0, y, outW - 1, y); }
    while (st.length) { const y = st.pop(), x = st.pop(); if (x < 0 || y < 0 || x >= outW || y >= outH) continue; const pp = y * outW + x; if (vis[pp]) continue; vis[pp] = 1; const i = pp * 4; if (d[i + 3] === 0) { } else if (!isChecker(i)) continue; d[i + 3] = 0; st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1, x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1); }
    // Defringe: trim bright neutral halo pixels touching transparency.
    const isHalo = (i) => { const R = d[i], G = d[i + 1], B = d[i + 2]; const mx = Math.max(R, G, B), mn = Math.min(R, G, B); return (mx - mn) <= 40 && (R + G + B) / 3 >= 110; };
    for (let pass = 0; pass < 2; pass++) { const clr = []; for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) { const i = idx(x, y); if (d[i + 3] === 0) continue; let e = false; for (let dy = -1; dy <= 1 && !e; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= outW || ny >= outH) continue; if (d[idx(nx, ny) + 3] === 0) { e = true; break; } } if (e && isHalo(i)) clr.push(i); } if (!clr.length) break; clr.forEach((i) => { d[i + 3] = 0; }); }
    cx.putImageData(im, 0, 0);
    octx.drawImage(cell, c * outW, r * outH);
  }
  return { url: out.toDataURL('image/png'), outW, outH };
}, { COLS, ROWS, INSET });
const base64 = res.url.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/bat.png', Buffer.from(base64, 'base64'));
console.log('wrote bat.png', res.outW + 'x' + res.outH, 'cells; total', (res.outW * COLS) + 'x' + (res.outH * ROWS), Buffer.from(base64, 'base64').length, 'bytes');
await b.close();
