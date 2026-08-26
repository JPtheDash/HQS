import { stripBackground } from './cleanTexture.js';

// The finish-gate PNG ships with a flattened background AND a lot of empty
// padding around the artwork (≈9% transparent below the pillars). If we anchor
// the raw image's bottom to the ground the visible gate hovers in mid-air, so
// on first use we strip the background and TRIM the texture to its opaque
// bounds. After that, origin-bottom sits exactly on the pillar bases.
function ensureGateTexture(scene) {
  const KEY = 'finish-gate';
  if (scene.game.registry.get('__gateTrimmed')) return KEY;
  if (!scene.textures.exists(KEY)) return KEY;

  stripBackground(scene, KEY); // drop any checker/white background first

  const src = scene.textures.get(KEY).getSourceImage();
  const w = src.width, h = src.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;

  let top = -1, bot = -1, left = -1, right = -1;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (d[(py * w + px) * 4 + 3] > 20) {
        if (top < 0) top = py;
        bot = py;
        if (left < 0 || px < left) left = px;
        if (px > right) right = px;
      }
    }
  }
  if (top < 0) { scene.game.registry.set('__gateTrimmed', true); return KEY; }

  const cw = right - left + 1, ch = bot - top + 1;
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
  scene.textures.remove(KEY);
  const tex = scene.textures.createCanvas(KEY, cw, ch);
  tex.getContext().drawImage(out, 0, 0);
  tex.refresh();
  scene.game.registry.set('__gateTrimmed', true);
  return KEY;
}

// Places the ornate finish-gate at the level's finish. Ground levels stand it
// on the surface (origin bottom, so the pillar bases meet the ground); aerial
// levels centre it on the floating finish point.
//
// Used by every traversal level's buildFinish(). The Dronagiri herb-collection
// scene is intentionally excluded, and the boss arena ends on the boss defeat.
export function addFinishGate(scene, x, baseY, { height = 400, bottomOrigin = true, depth = -6 } = {}) {
  if (!scene.textures.exists('finish-gate')) return null;
  const key = ensureGateTexture(scene);
  const gate = scene.add.image(x, baseY, key)
    .setOrigin(0.5, bottomOrigin ? 1 : 0.5)
    .setDepth(depth);
  gate.setScale(height / gate.height);
  scene._finishGate = gate; // remembered so enterFinishGate() can absorb Hanuman
  return gate;
}

// Plays the "Hanuman steps through the gate and vanishes" beat, then calls
// onComplete (which the scene uses to show its end card). If there's no gate or
// player it just runs onComplete immediately, so callers are always safe.
export function enterFinishGate(scene, onComplete) {
  const gate = scene._finishGate;
  const p = scene.player;
  const done = () => { if (onComplete) onComplete(); };
  if (!gate || !p || !p.active) { done(); return; }

  scene.tweens.killTweensOf(p);
  if (p.body) { p.body.stop && p.body.stop(); p.body.enable = false; }
  if (p.setVelocity) p.setVelocity(0, 0);
  // Slip behind the arch so he reads as going *into* the gate.
  p.setDepth((gate.depth || -6) - 1);

  // A warm glow blooms at the archway as he crosses through.
  const cy = gate.y - gate.displayHeight * (gate.originY === 1 ? 0.55 : 0);
  if (scene.textures.exists('glow')) {
    const glow = scene.add.image(gate.x, cy, 'glow')
      .setDepth((gate.depth || -6) + 1)
      .setScale(0.6).setTint(0xfff2c0).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: glow, scale: 3.2, alpha: 0, duration: 720, ease: 'Quad.easeOut', onComplete: () => glow.destroy() });
  }

  scene.tweens.add({
    targets: p,
    x: gate.x,
    y: p.y - 26,          // a small step up into the doorway
    scaleX: 0.14, scaleY: 0.14,
    alpha: 0,
    duration: 640,
    ease: 'Quad.easeIn',
    onComplete: done
  });
}
