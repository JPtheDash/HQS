// Bake hero_throw_src.png -> public/assets/game/hero6.png as a uniform 8x5 grid.
// Rows: idle(8) run(6) jump(6) fly(6) throw(6). Figures are detected as
// connected components (not grid-aligned), background checker flood-cleared and
// defringed, each figure centered + bottom-aligned in its cell.
import { chromium } from 'playwright';
import fs from 'fs';
const COLS = 8, ROWS = 5, OUTW = 430, OUTH = 372, BASE = OUTH - 12;
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const res = await p.evaluate(async ({ COLS, ROWS, OUTW, OUTH, BASE }) => {
  const img = new Image(); img.src = '/assets/game/hero_throw_src.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  const idx = (x, y) => (y * W + x) * 4;
  const isBg = (i) => { const r = d[i], g = d[i + 1], bl = d[i + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); return (mx - mn) <= 40; };
  const vis = new Uint8Array(W * H); const st = [];
  for (let x = 0; x < W; x++) { st.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { st.push(0, y, W - 1, y); }
  while (st.length) { const y = st.pop(), x = st.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const pp = y * W + x; if (vis[pp]) continue; vis[pp] = 1; const i = pp * 4; if (d[i + 3] === 0) { } else if (!isBg(i)) continue; d[i + 3] = 0; st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1, x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1); }
  const isHalo = (i) => { const r = d[i], g = d[i + 1], bl = d[i + 2]; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); return (mx - mn) <= 60; };
  for (let pass = 0; pass < 3; pass++) { const clr = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); if (d[i + 3] === 0) continue; let e = false; for (let dy = -1; dy <= 1 && !e; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (d[idx(nx, ny) + 3] === 0) { e = true; break; } } if (e && isHalo(i)) clr.push(i); } if (!clr.length) break; clr.forEach((i) => { d[i + 3] = 0; }); }
  ctx.putImageData(im, 0, 0);
  const rowH = Math.floor(H / ROWS);
  const alpha = (x, y) => d[idx(x, y) + 3];
  const out = document.createElement('canvas'); out.width = OUTW * COLS; out.height = OUTH * ROWS;
  const ox = out.getContext('2d'); const perRow = [];
  for (let r = 0; r < ROWS; r++) {
    const y0 = r * rowH, y1 = (r + 1) * rowH;
    const lab = new Int32Array(W * rowH).fill(-1); const comps = [];
    for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
      if (alpha(x, y) <= 20) continue; const li = (y - y0) * W + x; if (lab[li] !== -1) continue;
      const q = [x, y]; lab[li] = comps.length; let minx = x, maxx = x, miny = y, maxy = y, cnt = 0;
      while (q.length) { const cy = q.pop(), cx = q.pop(); cnt++; if (cx < minx) minx = cx; if (cx > maxx) maxx = cx; if (cy < miny) miny = cy; if (cy > maxy) maxy = cy; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < y0 || nx >= W || ny >= y1) continue; const nl = (ny - y0) * W + nx; if (lab[nl] === -1 && alpha(nx, ny) > 20) { lab[nl] = comps.length; q.push(nx, ny); } } }
      comps.push({ minx, maxx, miny, maxy, cnt });
    }
    const figs = comps.filter((f) => f.cnt > 1500).sort((a, b) => a.minx - b.minx);
    perRow.push(figs.length);
    figs.forEach((f, cc) => {
      if (cc >= COLS) return;
      const fw = f.maxx - f.minx + 1, fh = f.maxy - f.miny + 1;
      let anchorCol; // source x that should land at the cell centre
      if (r === 4) {
        // Throw row: anchor by the FEET (mean x of the bottom band) so the body
        // stays planted while the arm/gada swings forward — no sideways drift.
        const bandTop = f.maxy - Math.round(fh * 0.28);
        let sum = 0, n = 0;
        for (let y = bandTop; y <= f.maxy; y++) for (let x = f.minx; x <= f.maxx; x++) if (alpha(x, y) > 20) { sum += x; n++; }
        anchorCol = n ? sum / n : (f.minx + fw / 2);
      } else {
        anchorCol = f.minx + fw / 2; // centre the bounding box
      }
      const dx = cc * OUTW + Math.round(OUTW / 2 - (anchorCol - f.minx));
      const dy = r * OUTH + Math.round(BASE - fh);
      ox.drawImage(c, f.minx, f.miny, fw, fh, dx, dy, fw, fh);
    });
  }
  return { url: out.toDataURL('image/png'), perRow };
}, { COLS, ROWS, OUTW, OUTH, BASE });
const base64 = res.url.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/hero6.png', Buffer.from(base64, 'base64'));
console.log('wrote hero6.png (8x5)', Buffer.from(base64, 'base64').length, 'bytes; perRow', res.perRow, 'cell', OUTW + 'x' + OUTH);
await b.close();
