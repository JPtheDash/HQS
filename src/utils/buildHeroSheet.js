// The generated Hanuman sheet looks like a tidy 8x4 grid, but the AI packed the
// figures at slightly irregular spacing and let poses bleed across the cell
// borders (a stray fist, a neighbour's mace/cape). A naive uniform slice
// therefore catches fragments of adjacent frames.
//
// This rebuilds the sheet cleanly at load time. For each nominal cell we find
// every connected blob of opaque pixels (bounded to the cell) and keep only the
// LARGEST one — that's the main figure; small detached bleed from neighbours is
// dropped. The figure is then re-drawn centred horizontally and bottom-aligned
// to a shared baseline in a fresh uniform cell, so generateFrameNumbers() lines
// up perfectly and every frame shares a ground line.

export function buildHeroSheet(scene, key = 'hero', cols = 8, rows = 4, outW = 192, outH = 256) {
  const reg = scene.game.registry;
  if (reg.get('heroSheetBuilt') || !scene.textures.exists(key)) return;

  const src = scene.textures.get(key).getSourceImage();
  const W = src.width;
  const H = src.height;
  const fw = Math.floor(W / cols);
  const fh = Math.floor(H / rows);

  const sc = document.createElement('canvas');
  sc.width = W;
  sc.height = H;
  const sctx = sc.getContext('2d');
  sctx.drawImage(src, 0, 0);
  const sdata = sctx.getImageData(0, 0, W, H).data;
  const A = (x, y) => sdata[(y * W + x) * 4 + 3];

  const out = document.createElement('canvas');
  out.width = cols * outW;
  out.height = rows * outH;
  const octx = out.getContext('2d');
  const odata = octx.createImageData(out.width, out.height);
  const od = odata.data;
  const baseline = outH - 10; // feet line inside each output cell

  const visited = new Uint8Array(W * H);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = c * fw, x1 = x0 + fw, y0 = r * fh, y1 = y0 + fh;

      // Keep the largest connected blob in the cell (= the real figure).
      let best = null; // { px, py, minx, maxx, miny, maxy }
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          if (visited[sy * W + sx] || A(sx, sy) <= 40) continue;
          // Flood this blob, clamped to the cell.
          let minx = sx, maxx = sx, miny = sy, maxy = sy;
          const px = [], py = [];
          const stack = [sx, sy];
          while (stack.length) {
            const y = stack.pop();
            const x = stack.pop();
            if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
            const p = y * W + x;
            if (visited[p]) continue;
            visited[p] = 1;
            if (A(x, y) <= 40) continue;
            px.push(x); py.push(y);
            if (x < minx) minx = x; if (x > maxx) maxx = x;
            if (y < miny) miny = y; if (y > maxy) maxy = y;
            stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1,
              x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1);
          }
          if (!best || px.length > best.px.length) best = { px, py, minx, maxx, miny, maxy };
        }
      }
      if (!best) continue;

      // Place: centre horizontally, bottom-align to the baseline.
      const figW = best.maxx - best.minx + 1;
      const figH = best.maxy - best.miny + 1;
      const cellX = c * outW + Math.round((outW - figW) / 2);
      const cellY = r * outH + Math.round(baseline - figH);
      for (let k = 0; k < best.px.length; k++) {
        const sx = best.px[k], sy = best.py[k];
        const dx = cellX + (sx - best.minx);
        const dy = cellY + (sy - best.miny);
        if (dx < 0 || dy < 0 || dx >= out.width || dy >= out.height) continue;
        const si = (sy * W + sx) * 4;
        const di = (dy * out.width + dx) * 4;
        od[di] = sdata[si];
        od[di + 1] = sdata[si + 1];
        od[di + 2] = sdata[si + 2];
        od[di + 3] = sdata[si + 3];
      }
    }
  }

  octx.putImageData(odata, 0, 0);
  scene.textures.remove(key);
  scene.textures.addSpriteSheet(key, out, { frameWidth: outW, frameHeight: outH });
  reg.set('heroSheetBuilt', true);
}
