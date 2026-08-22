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

  ctx.putImageData(imgData, 0, 0);
  scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  tex.getContext().drawImage(canvas, 0, 0);
  tex.refresh();
  set.add(key);
}
