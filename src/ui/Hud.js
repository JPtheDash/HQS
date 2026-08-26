import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig.js';

// Heads-up display built from the ornate gauge art (hud-heart / hud-energy /
// hud-timer). Each source sheet is 1774x887 and holds a big icon on the left
// and two "badge + bar" combos on the right: a lit FULL combo (top) and a dark
// EMPTY combo (bottom). We bake those two combos into their own textures, stack
// the FULL over the EMPTY, and reveal the FULL left-to-right with setCrop to
// show the current value — the badge stays lit, the channel fills/drains.
//
// Public API is unchanged from the old drawn HUD (setHealth / setEnergy /
// setTime / hideEnergy / hideTime) so every scene keeps working as-is.
//
// GAUGES geometry was measured once from the art (see the crop boxes + the
// fillable-channel fractions barL..barR within each combo).
const GAUGES = {
  heart:  { key: 'hud-heart',  comboL: 810, comboR: 1735, topY: 163, botY: 481, h: 268, barL: 0.29, barR: 0.865 },
  energy: { key: 'hud-energy', comboL: 810, comboR: 1733, topY: 188, botY: 479, h: 242, barL: 0.30, barR: 0.885 },
  timer:  { key: 'hud-timer',  comboL: 810, comboR: 1742, topY: 220, botY: 495, h: 240, barL: 0.41, barR: 0.889, checker: true }
};

const GAUGE_W = 244;   // on-screen width of each gauge
const GAUGE_X = 16;    // left margin
const GAUGE_TOP = 20;  // top of the stack
const GAUGE_GAP = 4;   // vertical gap between stacked gauges

export default class Hud {
  constructor(scene, { maxHealth = 3 } = {}) {
    this.scene = scene;
    this.maxHealth = maxHealth;
    this.maxTime = 0;

    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    this.gauges = {};
    let y = GAUGE_TOP;
    ['heart', 'energy', 'timer'].forEach((name) => {
      const g = this.buildGauge(name, GAUGE_X, y, GAUGE_W);
      this.gauges[name] = g;
      y += g.hpx + GAUGE_GAP;
    });

    this.setHealth(maxHealth);
    this.setEnergy(1);
    this.buildPauseButton();
  }

  // Top-right pause button. Pauses the gameplay scene and opens the PauseScene
  // overlay (Resume / Reset / Home).
  buildPauseButton() {
    const s = this.scene;
    const x = GAME_WIDTH - 52, y = 52;
    let btn;
    if (s.textures.exists('btn-pause')) {
      btn = s.add.image(x, y, 'btn-pause').setScrollFactor(0).setDepth(1003);
      btn.setDisplaySize(74, 74);
    } else {
      btn = s.add.circle(x, y, 30, 0x000000, 0.42).setScrollFactor(0).setDepth(1003).setStrokeStyle(3, 0xffe9a8, 0.85);
    }
    btn.setInteractive({ useHandCursor: true });
    this.layer.add(btn);
    btn.on('pointerover', () => btn.setScale(btn.scale * 1.08));
    btn.on('pointerout', () => btn.setDisplaySize(74, 74));
    btn.on('pointerup', () => {
      if (s.scene.isActive('PauseScene')) return;
      s.scene.launch('PauseScene', { from: s.scene.key });
      s.scene.pause();
    });
  }

  buildGauge(name, gx, gy, W) {
    const g = GAUGES[name];
    const comboW = g.comboR - g.comboL;
    const scale = W / comboW;
    const hpx = g.h * scale;

    const fullKey = g.key + '-full';
    const emptyKey = g.key + '-empty';
    this.bakeCombo(g, fullKey, g.topY);
    this.bakeCombo(g, emptyKey, g.botY);

    // EMPTY track underneath, FULL lit art on top (revealed via setCrop).
    const base = this.scene.add.image(gx, gy, emptyKey).setOrigin(0, 0).setScrollFactor(0).setScale(scale);
    const fill = this.scene.add.image(gx, gy, fullKey).setOrigin(0, 0).setScrollFactor(0).setScale(scale);
    this.layer.add(base);
    this.layer.add(fill);

    const gauge = {
      name, base, fill, hpx,
      comboW, texH: g.h,
      barL: g.barL, barR: g.barR
    };

    if (name === 'timer') {
      // Countdown text sits over the timer bar channel.
      gauge.text = this.scene.add.text(gx + W * 0.63, gy + hpx * 0.5, '', {
        fontFamily: 'Georgia, serif', fontSize: '19px', color: '#eaf6ff', fontStyle: 'bold',
        stroke: '#0a2030', strokeThickness: 4
      }).setOrigin(0.5).setScrollFactor(0);
      this.layer.add(gauge.text);
    }

    this.setGaugeValue(gauge, 1);
    return gauge;
  }

  // Crop one combo out of the source sheet into its own texture. For the timer
  // sheet (baked transparency-checker background) the checker is flood-cleared.
  bakeCombo(g, key, topY) {
    if (this.scene.textures.exists(key)) return;
    const src = this.scene.textures.get(g.key).getSourceImage();
    const comboW = g.comboR - g.comboL;
    const H = g.h;
    const canvas = document.createElement('canvas');
    canvas.width = comboW;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(src, g.comboL, topY, comboW, H, 0, 0, comboW, H);
    if (g.checker) this.stripChecker(ctx, comboW, H);
    const tex = this.scene.textures.createCanvas(key, comboW, H);
    tex.getContext().drawImage(canvas, 0, 0);
    tex.refresh();
  }

  // Flood-fill inward from the border, clearing neutral-grey checker pixels and
  // stopping at the coloured (gold / blue / dark) gauge art.
  stripChecker(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const isBg = (i) => {
      if (d[i + 3] === 0) return true;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return mx - mn <= 24 && mx >= 120; // light/mid neutral grey checker
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
      if (d[i + 3] !== 0 && !isBg(i)) continue;
      d[i + 3] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    ctx.putImageData(img, 0, 0);
  }

  setGaugeValue(gauge, v) {
    v = Phaser.Math.Clamp(v, 0, 1);
    // Reveal the lit combo from its left edge up to (badge + channel * v), in
    // the texture's own pixels so it's immune to camera scroll.
    const cropW = gauge.comboW * (gauge.barL + (gauge.barR - gauge.barL) * v);
    gauge.fill.setCrop(0, 0, cropW, gauge.texH);
  }

  setHealth(n) {
    this.setGaugeValue(this.gauges.heart, this.maxHealth ? n / this.maxHealth : 0);
  }

  // value 0..1
  setEnergy(value) {
    if (this.gauges.energy) this.setGaugeValue(this.gauges.energy, value);
  }

  setTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    if (!this.maxTime || s > this.maxTime) this.maxTime = s; // first call = full
    const g = this.gauges.timer;
    if (!g) return;
    this.setGaugeValue(g, this.maxTime ? s / this.maxTime : 0);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    g.text.setText(`${mm}:${ss}`);
    g.text.setColor(s <= 10 ? '#ff6b6b' : '#eaf6ff');
  }

  // Some scenes (boss arena, exploration) have no energy or countdown.
  hideEnergy() { this.hideGauge('energy'); }
  hideTime() { this.hideGauge('timer'); }

  hideGauge(name) {
    const g = this.gauges[name];
    if (!g) return;
    g.base.setVisible(false);
    g.fill.setVisible(false);
    if (g.text) g.text.setVisible(false);
  }
}
