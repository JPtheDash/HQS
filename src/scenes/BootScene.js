import Phaser from 'phaser';
import Player from '../objects/Player.js';

// BootScene runs first. It only loads the handful of assets the loading
// screen itself needs (e.g. a logo or progress-bar art), then hands off to
// PreloadScene which loads the bulk of the game. Right now there's nothing
// to load, so it passes straight through.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Load the animated Hanuman up front so the PreloadScene loading screen can
    // show him running. hero6.png is the cleaned, cell-aligned 8x5 sheet baked
    // by tools/genhero5.mjs from the user's padded spritesheet (adds a throw row).
    this.load.spritesheet('hero', 'assets/game/hero6.png', { frameWidth: 430, frameHeight: 372 });
    // The user's newer hero art (already transparent). Row 1 is a clean 8-frame
    // run cycle; we bake it into a uniform strip below for the loading screen.
    this.load.image('hero-src-new', 'assets/game/hero-src-new.png');
  }

  create() {
    this.makeGlowTexture();
    this.bakeHeroSheet();     // rebuild the in-game 'hero' from the new sheet
    this.bakeLoadingRunner(); // build 'hero-load-run' from the new sheet's run row
    Player.createAnims(this); // register idle/run/jump/fly globally
    // Start muted (user preference). The SOUND button on the main menu toggles
    // it back on; the setting persists across all scenes via the sound manager.
    this.sound.mute = true;
    this.scene.start('PreloadScene');
  }

  // Rebuild the in-game 'hero' spritesheet from the user's new sheet
  // (assets/game/hero-src-new.png, already transparent). The sheet's six rows
  // are, top to bottom: walk-with-gada, run, fly, throw, gada-swing, crouch/jump.
  // We extract each figure as a connected component (filtering out the small
  // thrown-gada cells in the throw row), then redraw them feet-aligned into a
  // uniform 8-col × 5-row grid:  idle | run | jump | fly | throw.
  // Player.createAnims() reads registry 'heroBaked' to pick the frame ranges.
  bakeHeroSheet() {
    if (!this.textures.exists('hero-src-new')) return; // keep hero6 fallback
    const src = this.textures.get('hero-src-new').getSourceImage();
    const w = src.width, h = src.height;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    cx.drawImage(src, 0, 0);
    const d = cx.getImageData(0, 0, w, h).data;
    const A = (px, py) => d[(py * w + px) * 4 + 3];

    // Extract connected components whose pixels sit inside [y0,y1), taller than
    // minH (drops the flying-gada cells), sorted left→right, capped at `count`.
    const extract = (y0, y1, minH, count) => {
      const bw = w, bh = y1 - y0;
      const lab = new Uint8Array(bw * bh);
      const out = [];
      for (let yy = 0; yy < bh; yy++) {
        for (let xx = 0; xx < bw; xx++) {
          if (lab[yy * bw + xx] || A(xx, y0 + yy) <= 60) continue;
          let minx = xx, maxx = xx, miny = yy, maxy = yy, cnt = 0;
          const st = [xx, yy]; lab[yy * bw + xx] = 1;
          while (st.length) {
            const py = st.pop(), px = st.pop(); cnt++;
            if (px < minx) minx = px; if (px > maxx) maxx = px;
            if (py < miny) miny = py; if (py > maxy) maxy = py;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nx = px + dx, ny = py + dy;
              if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
              const p = ny * bw + nx;
              if (!lab[p] && A(nx, y0 + ny) > 60) { lab[p] = 1; st.push(nx, ny); }
            }
          }
          if (cnt > 1500 && (maxy - miny + 1) >= minH) {
            out.push({ x: minx, y: y0 + miny, w: maxx - minx + 1, h: maxy - miny + 1 });
          }
        }
      }
      out.sort((a, b) => a.x - b.x);
      return out.slice(0, count);
    };

    // [output grid row, sheet band y0, y1, min figure height, frame count]
    const ROWS = [
      ['idle', 0, 182, 120, 8],
      ['run', 182, 352, 120, 8],
      ['jump', 843, 1018, 100, 8],
      ['fly', 350, 502, 100, 8],
      ['throw', 505, 678, 100, 6]
    ];
    const banks = ROWS.map((r) => extract(r[1], r[2], r[3], r[4]));
    // Bail (keep hero6) if any core row came up short.
    if (banks[0].length < 6 || banks[1].length < 6 || banks[3].length < 6) return;

    const CW = 224, CH = 188, PAD = 8;
    const out = document.createElement('canvas');
    out.width = CW * 8; out.height = CH * 5;
    const ox = out.getContext('2d');
    banks.forEach((bank, row) => {
      bank.forEach((c, col) => {
        const dx = col * CW + (CW - c.w) / 2;      // centred horizontally
        const dy = row * CH + (CH - PAD - c.h);    // feet on a shared baseline
        ox.drawImage(cv, c.x, c.y, c.w, c.h, dx, dy, c.w, c.h);
      });
    });

    if (this.textures.exists('hero')) this.textures.remove('hero');
    const tex = this.textures.createCanvas('hero', out.width, out.height);
    tex.getContext().drawImage(out, 0, 0);
    tex.refresh();
    for (let r = 0; r < 5; r++) for (let cIdx = 0; cIdx < 8; cIdx++) {
      tex.add(r * 8 + cIdx, 0, cIdx * CW, r * CH, CW, CH);
    }
    this.game.registry.set('heroBaked', true);
    this.game.registry.set('heroCell', { w: CW, h: CH, pad: PAD });
  }

  // Bake the loading-screen run cycle from the user's new hero sheet
  // (assets/game/hero-src-new.png). That sheet already has real alpha; its
  // second row is a clean 8-frame side run. We find each figure as a connected
  // component in the run band, then redraw all eight into a uniform, bottom-
  // aligned strip so the runner animates without hopping around.
  bakeLoadingRunner() {
    if (this.textures.exists('hero-load-run') || !this.textures.exists('hero-src-new')) return;
    const src = this.textures.get('hero-src-new').getSourceImage();
    const w = src.width, h = src.height;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d');
    cx.drawImage(src, 0, 0);
    const d = cx.getImageData(0, 0, w, h).data;
    const A = (px, py) => d[(py * w + px) * 4 + 3];

    // Connected components within the run-row band (measured for this sheet).
    const y0 = 180, y1 = 345, TH = 60, bw = w, bh = y1 - y0;
    const lab = new Uint8Array(bw * bh);
    const comps = [];
    for (let yy = 0; yy < bh; yy++) {
      for (let xx = 0; xx < bw; xx++) {
        if (lab[yy * bw + xx] || A(xx, y0 + yy) <= TH) continue;
        let minx = xx, maxx = xx, miny = yy, maxy = yy, cnt = 0;
        const st = [xx, yy]; lab[yy * bw + xx] = 1;
        while (st.length) {
          const py = st.pop(), px = st.pop(); cnt++;
          if (px < minx) minx = px; if (px > maxx) maxx = px;
          if (py < miny) miny = py; if (py > maxy) maxy = py;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
            const p = ny * bw + nx;
            if (!lab[p] && A(nx, y0 + ny) > TH) { lab[p] = 1; st.push(nx, ny); }
          }
        }
        if (cnt > 1500) comps.push({ x: minx, y: y0 + miny, w: maxx - minx + 1, h: maxy - miny + 1 });
      }
    }
    comps.sort((a, b) => a.x - b.x);
    if (comps.length < 4) return; // fall back to hero6 runner if extraction fails

    // Uniform cell sized to the widest/tallest frame, feet on a shared baseline.
    const pad = 12;
    const cellW = Math.max(...comps.map((c) => c.w)) + pad * 2;
    const cellH = Math.max(...comps.map((c) => c.h)) + pad * 2;
    const n = comps.length;
    const out = document.createElement('canvas');
    out.width = cellW * n; out.height = cellH;
    const ox = out.getContext('2d');
    comps.forEach((c, i) => {
      const dx = i * cellW + (cellW - c.w) / 2;      // horizontally centred
      const dy = cellH - pad - c.h;                  // bottom-aligned
      ox.drawImage(cv, c.x, c.y, c.w, c.h, dx, dy, c.w, c.h);
    });

    const tex = this.textures.createCanvas('hero-load-run', out.width, out.height);
    tex.getContext().drawImage(out, 0, 0);
    tex.refresh();
    for (let i = 0; i < n; i++) tex.add(i, 0, i * cellW, 0, cellW, cellH);

    this.anims.create({
      key: 'load-run',
      frames: Array.from({ length: n }, (_, i) => ({ key: 'hero-load-run', frame: i })),
      frameRate: 12, repeat: -1
    });
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
