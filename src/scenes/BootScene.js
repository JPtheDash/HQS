import Phaser from 'phaser';

// BootScene runs first. It only loads the handful of assets the loading
// screen itself needs (e.g. a logo or progress-bar art), then hands off to
// PreloadScene which loads the bulk of the game. Right now there's nothing
// to load, so it passes straight through.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Boot-screen assets go here later (logo, progress bar frame, etc.).
  }

  create() {
    this.makeGlowTexture();
    // Start muted (user preference). The SOUND button on the main menu toggles
    // it back on; the setting persists across all scenes via the sound manager.
    this.sound.mute = true;
    this.scene.start('PreloadScene');
  }

  // Generate a soft radial-glow texture procedurally instead of relying on a
  // glow image. Guarantees clean transparency (white-hot centre fading to
  // fully transparent edges), so particles and button halos read as light
  // rather than as boxes. Tinted per-use by whoever draws it.
  makeGlowTexture() {
    if (this.textures.exists('glow')) return;
    const size = 128;
    const tex = this.textures.createCanvas('glow', size, size);
    const ctx = tex.getContext();
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0.0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,240,200,0.85)');
    grad.addColorStop(0.55, 'rgba(255,225,150,0.35)');
    grad.addColorStop(1.0, 'rgba(255,220,150,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }
}
