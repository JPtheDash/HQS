// Several source assets were exported with their background flattened to an
// opaque colour (grey transparency-checker, light grey, or near-black) instead
// of real alpha. This removes that background at load time: it flood-fills
// inward from the image border, clearing every pixel close in colour to the
// sampled border colours, and stops at the (differently coloured) subject.
//
// Best-effort — clean source PNGs with real transparency will always look
// sharper. Cleaned keys are tracked so a scene restart doesn't redo the work.

function alreadyClean(scene, key) {
  let set = scene.game.registry.get('cleanedTextures');
  if (!set) {
    set = new Set();
    scene.game.registry.set('cleanedTextures', set);
  }
  return { set, done: set.has(key) };
}

// Crop a texture down to its opaque bounds (removing transparent padding), so
// an origin-bottom sprite sits on its real base rather than on empty pixels
// (e.g. the fire, whose flames float ~20% above the image bottom). Cached.
export function trimTransparent(scene, key) {
  const flag = '__trim_' + key;
  if (scene.game.registry.get(flag) || !scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  const w = src.width, h = src.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  let top = -1, bot = -1, left = -1, right = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 20) {
        if (top < 0) top = y;
        bot = y;
        if (left < 0 || x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (top < 0) { scene.game.registry.set(flag, true); return; }
  const cw = right - left + 1, ch = bot - top + 1;
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
  scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, cw, ch);
  tex.getContext().drawImage(out, 0, 0);
  tex.refresh();
  scene.game.registry.set(flag, true);
}

// Some AI-exported assets (the storm-level clouds) bake a transparency checker
// as two exact neutral greys (~127 and ~191). A generic strip would eat a white
// cloud (white reads as neutral) or a dark cloud (dark reads as neutral-ish),
// so this targets ONLY those two grey shades: flood-fill inward from the border,
// clearing pixels that are near-neutral AND close to 127 or 191. White (255) and
// coloured cloud pixels fall outside that window, and the cloud's own outline
// blocks the flood from reaching its interior.
export function stripCheckerGrey(scene, key) {
  const { set, done } = alreadyClean(scene, key);
  if (done || !scene.textures.exists(key)) return;

  const src = scene.textures.get(key).getSourceImage();
  const w = src.width, h = src.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Auto-detect the checker's grey shades from the border (works for both the
  // light 127/191 cloud checker and the dark ~58/100 fire checker). We only
  // collect near-neutral border pixels, then take the most common values.
  const hist = {};
  const sampleBorder = (x, y) => {
    const i = (y * w + x) * 4;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (d[i + 3] > 40 && Math.max(r, g, b) - Math.min(r, g, b) <= 12) {
      const v = Math.round((r + g + b) / 3 / 4) * 4;
      hist[v] = (hist[v] || 0) + 1;
    }
  };
  for (let x = 0; x < w; x++) { sampleBorder(x, 0); sampleBorder(x, h - 1); }
  for (let y = 0; y < h; y++) { sampleBorder(0, y); sampleBorder(w - 1, y); }
  const shades = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => +e[0]);
  if (!shades.length) { set.add(key); return; }

  const isChecker = (i) => {
    if (d[i + 3] === 0) return true;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 16) return false; // coloured → keep
    const v = (r + g + b) / 3;
    for (const s of shades) if (Math.abs(v - s) <= 22) return true;
    return false;
  };

  const visited = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, 0, x, h - 1);
  for (let y = 0; y < h; y++) stack.push(0, y, w - 1, y);
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (d[i + 3] !== 0 && !isChecker(i)) continue;
    d[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  // One defringe ring: trim leftover grey halo bordering transparency.
  const toClear = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (d[(ny * w + nx) * 4 + 3] === 0) { edge = true; break; }
        }
      }
      if (edge && isChecker(i)) toClear.push(i);
    }
  }
  for (const i of toClear) d[i + 3] = 0;

  // Despeckle: these assets scatter faint sparkle dots across the (now
  // transparent) background, which read as a dotted rectangle around the art.
  // Clear any pixel whose 9x9 neighbourhood is mostly transparent (an isolated
  // speck); solid regions keep nearly all their neighbours so they survive.
  const speckKill = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      let cnt = 0;
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (d[(ny * w + nx) * 4 + 3] > 30) cnt++;
        }
      }
      if (cnt < 20) speckKill.push(i); // < ~25% of the 81 neighbours opaque
    }
  }
  for (const i of speckKill) d[i + 3] = 0;

  ctx.putImageData(imgData, 0, 0);
  scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  tex.getContext().drawImage(canvas, 0, 0);
  tex.refresh();
  set.add(key);
}

// ground.png ships as a fully-opaque strip: a flat grey "sky" on top of a grass
// line and a dirt body. The general flood-strip below can't handle it — it
// samples the bottom corners (which are dirt, i.e. the subject) as background
// and eats the whole dirt body. Instead, clear ONLY the grey sky: walk each
// column top-down turning neutral-grey pixels transparent until the (coloured)
// grass stops us, which follows the grass silhouette and leaves grass + dirt
// fully intact. Runs once (cached) — after it, the ground has real alpha so the
// generic stripBackground('ground') calls in scenes auto-skip.
export function cleanGroundSky(scene, key = 'ground') {
  const { set, done } = alreadyClean(scene, key);
  if (done || !scene.textures.exists(key)) return;

  const src = scene.textures.get(key).getSourceImage();
  const w = src.width, h = src.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const isSky = (i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx - mn <= 34 && mx >= 60 && mx <= 185; // flat mid-grey sky
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      if (isSky(i)) d[i + 3] = 0;
      else break; // hit the grass/subject for this column
    }
  }
  ctx.putImageData(imgData, 0, 0);
  scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  tex.getContext().drawImage(canvas, 0, 0);
  tex.refresh();
  set.add(key);
}

export function stripBackground(scene, key, tolerance = 78) {
  const { set, done } = alreadyClean(scene, key);
  if (done || !scene.textures.exists(key)) return;

  const src = scene.textures.get(key).getSourceImage();
  const w = src.width;
  const h = src.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Guard: if the source already has real transparency (a clean PNG export),
  // it does NOT need — and must not get — a flood-fill strip. The flood keys on
  // neutral/dark colours and would eat the subject's own dark, shadowed areas
  // (e.g. the ground's dirt underside or the ledge's roots). Assets exported
  // with a flattened checker/opaque background have ~0% transparency and still
  // fall through to the strip below.
  let clearCount = 0;
  const step = 4 * 37; // sparse sample is plenty to detect real alpha
  for (let i = 3; i < d.length; i += step) if (d[i] < 8) clearCount++;
  if (clearCount / (d.length / step) > 0.06) { set.add(key); return; }

  // Sample the four corners as background reference colours.
  const cornerColors = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1]
  ].map(([x, y]) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  });
  const tol2 = tolerance * tolerance;
  const isBg = (i) => {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // Close to a sampled corner colour?
    for (const c of cornerColors) {
      const dr = r - c[0];
      const dg = g - c[1];
      const db = b - c[2];
      if (dr * dr + dg * dg + db * db <= tol2) return true;
    }
    // A neutral grey (any brightness) — catches both squares of a flattened
    // transparency checker even when they're far apart in value. Bounded to
    // the flood fill from the border, so it won't punch holes inside subjects.
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min <= 26 && max >= 40) return true;
    return false;
  };

  const visited = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) {
    stack.push(x, 0, x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    stack.push(0, y, w - 1, y);
  }

  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const p = y * w + x;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    // Stop at an opaque subject pixel that isn't background.
    if (d[i + 3] !== 0 && !isBg(i)) continue;
    d[i + 3] = 0;
    stack.push(
      x + 1, y, x - 1, y, x, y + 1, x, y - 1,
      x + 1, y + 1, x - 1, y - 1, x + 1, y - 1, x - 1, y + 1
    );
  }

  // Defringe: after the flood fill, edge pixels can keep a pale halo blended
  // from the old background. Trim one ring of edge pixels that are still
  // background-ish under a looser tolerance and border a now-transparent pixel.
  const looseTol2 = (tolerance * 1.6) * (tolerance * 1.6);
  const isBgLoose = (i) => {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    for (const c of cornerColors) {
      const dr = r - c[0], dg = g - c[1], db = b - c[2];
      if (dr * dr + dg * dg + db * db <= looseTol2) return true;
    }
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return max - min <= 34 && max >= 30;
  };
  // Several passes so each cleared ring exposes the next halo pixel underneath,
  // leaving crisp edges instead of a jagged fringe.
  for (let pass = 0; pass < 3; pass++) {
    const toClear = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const i = p * 4;
        if (d[i + 3] === 0) continue;
        // Does it touch transparency?
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (d[(ny * w + nx) * 4 + 3] === 0) { edge = true; break; }
          }
        }
        if (edge && isBgLoose(i)) toClear.push(i);
      }
    }
    if (!toClear.length) break;
    for (const i of toClear) d[i + 3] = 0;
  }

  // Soften remaining hard edges: halve alpha on opaque pixels that still touch
  // transparency, for a 1px anti-aliased rim instead of a stair-stepped cut.
  const soften = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (d[(ny * w + nx) * 4 + 3] === 0) { edge = true; break; }
        }
      }
      if (edge) soften.push(i);
    }
  }
  for (const i of soften) d[i + 3] = Math.min(d[i + 3], 170);

  ctx.putImageData(imgData, 0, 0);
  scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  tex.getContext().drawImage(canvas, 0, 0);
  tex.refresh();
  set.add(key);
}
