import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground, stripCheckerGrey, trimTransparent } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';
import { addFinishGate, enterFinishGate } from '../utils/finishGate.js';

// SCENES 17–18 — RAKSHASA ENCOUNTER & CHASE (Chapter 5)
// The forest turns hostile: rakshasa demons block the path. JUMP over them, or
// SWIPE to hurl the gada (auto-aims at the nearest one ahead) to defeat them.
// A few of them advance toward Hanuman, giving the stretch a chase feel. Dark
// bgdark backdrop with a creeping danger vignette.
const WORLD_W = 3600;
const GROUND_Y = GAME_HEIGHT - 150;

export default class RakshasaScene extends Phaser.Scene {
  constructor() {
    super('RakshasaScene');
  }

  create() {
    ['ground'].forEach((k) => stripBackground(this, k));
    // Prefer the animated demon sheet; fall back to the static art (which ships
    // with a dark checker background, so strip + trim it).
    this.rakAnim = this.bakeRakshasaSheet();
    if (!this.rakAnim && this.textures.exists('rakshasa')) {
      stripCheckerGrey(this, 'rakshasa');
      trimTransparent(this, 'rakshasa');
    }

    this.finished = false;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.invincibleUntil = 0;
    this.timeLeft = 120;
    this.gadaCooldown = 0;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.foes = this.physics.add.group({ allowGravity: false });
    this.gadas = this.physics.add.group({ allowGravity: false });
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildGround();
    this.buildFoes();
    this.buildCollectibles();
    this.buildFinish(3440);

    this.player = new Player(this, 120, GROUND_Y - 220);
    this.spawnX = 120; this.spawnY = GROUND_Y - 220;
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.foes, this.onFoeTouch, (pl, f) => f.alive !== false, this);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    this.physics.add.overlap(this.gadas, this.foes, this.onGadaFoe, null, this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-80, 60);

    this.dark = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0512, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(900);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setTime(this.timeLeft);
    this.hud.setEnergy(this.energy);
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.45 });

    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.finished) return;
        this.timeLeft -= 1;
        this.hud.setTime(this.timeLeft);
        if (this.timeLeft <= 0) this.loseLevel('Out of time!');
      }
    });
  }

  buildBackground() {
    const key = this.textures.exists('bgdark') ? 'bgdark' : 'bg2';
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get(key).getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x120a1e, 0.2).setOrigin(0, 0).setScrollFactor(0).setDepth(-98);
  }

  buildGround() {
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(0, GROUND_Y - grassOffset, WORLD_W, displayH, 'ground').setOrigin(0, 0).setDepth(-10);
    ts.setTileScale(tScale, tScale);
    ts.setTint(0x6a6a74);
    this.add.rectangle(0, GROUND_Y - grassOffset + displayH, WORLD_W, GAME_HEIGHT, 0x14100c).setOrigin(0, 0).setDepth(-11);
    const body = this.add.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildFoes() {
    // [x, chases?] — blockers stand; chasers creep toward Hanuman.
    [[900, false], [1450, true], [1950, false], [2450, true], [2950, false]]
      .forEach(([x, chase]) => this.spawnFoe(x, chase));
  }

  spawnFoe(x, chase) {
    const anim = this.rakAnim;
    const key = anim ? 'rak-anim' : (this.textures.exists('rakshasa') ? 'rakshasa' : 'boulder');
    const dispH = 280; // taller than Hanuman so the demons loom over him
    // Origin at the feet so the demon plants on the ground at any scale.
    const f = this.foes.create(x, GROUND_Y, key, anim ? 0 : undefined);
    f.setOrigin(0.5, anim ? this.rakFeetFrac : 1);
    f.setScale(dispH / (anim ? this.rakCellH : f.height));
    if (!anim) f.y = GROUND_Y - f.displayHeight / 2; // static art: centre origin
    const bw = f.width * 0.28, bh = f.height * (anim ? 0.62 : 0.82);
    f.body.setSize(bw, bh);
    f.body.setOffset((f.width - bw) / 2, (anim ? this.rakFeetFrac * f.height - bh : (f.height - bh) / 2));
    f.setDepth(5);
    f.alive = true;
    f.baseY = f.y;
    f.lunging = false;
    if (anim) f.play('rak-walk');
    // A stationary "sooner" lunge for the ones that used to just block, so the
    // first ones Hanuman meets already feel aggressive.
    f.nextLunge = this.time.now + (chase ? 900 : 1600);
  }

  // The demon rears back, plays its attack swing, then snaps forward to swipe at
  // Hanuman. The player/foe overlap does the actual damage.
  foeLunge(f, dir) {
    if (!f.active || !f.alive) return;
    f.lunging = true;
    if (this.rakAnim) { f.play('rak-attack'); f.once('animationcomplete-rak-attack', () => { if (f.active && f.alive) f.play('rak-walk'); }); }
    else f.setTint(0xffb0b0);
    f.setVelocityX(-dir * 55);                       // wind-up
    this.time.delayedCall(150, () => {
      if (!f.active || !f.alive) { f.lunging = false; return; }
      f.setVelocityX(dir * 360);                     // lunge forward
      this.time.delayedCall(190, () => {
        if (f.active) { f.setVelocityX(0); if (!this.rakAnim) f.clearTint(); }
        f.lunging = false;
      });
    });
  }

  // Bake the animated demon sheet into a 'rak-anim' texture with walk + attack
  // rows, and register 'rak-walk' / 'rak-attack'. Returns true on success.
  bakeRakshasaSheet() {
    const stored = this.game.registry.get('rakCell');
    if (this.anims.exists('rak-walk') && stored) { this.rakCellH = stored.h; this.rakFeetFrac = stored.feetFrac; return true; }
    if (!this.textures.exists('rakshasa-sheet')) return false;
    const src = this.textures.get('rakshasa-sheet').getSourceImage();
    const w = src.width, h = src.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); cx.drawImage(src, 0, 0);
    const d = cx.getImageData(0, 0, w, h).data;
    const A = (px, py) => d[(py * w + px) * 4 + 3];
    const extract = (y0, y1, minH, count) => {
      const bw = w, bh = y1 - y0, lab = new Uint8Array(bw * bh), out = [];
      for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) {
        if (lab[yy * bw + xx] || A(xx, y0 + yy) <= 60) continue;
        let minx = xx, maxx = xx, miny = yy, maxy = yy, cnt = 0; const st = [xx, yy]; lab[yy * bw + xx] = 1;
        while (st.length) { const py = st.pop(), px = st.pop(); cnt++;
          if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue; const p = ny * bw + nx; if (!lab[p] && A(nx, y0 + ny) > 60) { lab[p] = 1; st.push(nx, ny); } } }
        if (cnt > 2000 && (maxy - miny) >= minH) out.push({ x: minx, y: y0 + miny, w: maxx - minx + 1, h: maxy - miny + 1 });
      }
      out.sort((a, b) => a.x - b.x); return out.slice(0, count);
    };
    const walk = extract(289, 510, 110, 6);  // run row
    const atk = extract(756, 1007, 110, 6);  // attack row
    if (walk.length < 3 || atk.length < 2) return false;
    const cols = 6, CW = 320, PAD = 8;
    const CH = Math.max(...walk.concat(atk).map((c) => c.h)) + PAD * 2;
    const out = document.createElement('canvas'); out.width = CW * cols; out.height = CH * 2;
    const ox = out.getContext('2d');
    const place = (bank, row) => bank.forEach((c, col) => { ox.drawImage(cv, c.x, c.y, c.w, c.h, col * CW + (CW - c.w) / 2, row * CH + (CH - PAD - c.h), c.w, c.h); });
    place(walk, 0); place(atk, 1);
    const tex = this.textures.createCanvas('rak-anim', out.width, out.height);
    tex.getContext().drawImage(out, 0, 0); tex.refresh();
    for (let r = 0; r < 2; r++) for (let cc = 0; cc < cols; cc++) tex.add(r * cols + cc, 0, cc * CW, r * CH, CW, CH);
    this.anims.create({ key: 'rak-walk', frames: walk.map((_, i) => ({ key: 'rak-anim', frame: i })), frameRate: 9, repeat: -1 });
    this.anims.create({ key: 'rak-attack', frames: atk.map((_, i) => ({ key: 'rak-anim', frame: cols + i })), frameRate: 12, repeat: 0 });
    this.rakCellH = CH;
    this.rakFeetFrac = (CH - PAD) / CH;
    this.game.registry.set('rakCell', { h: CH, feetFrac: this.rakFeetFrac });
    return true;
  }

  buildCollectibles() {
    for (let x = 500; x < 3300; x += 380) {
      for (let i = -1; i <= 1; i++) this.addPickup(x + i * 70, GROUND_Y - 120 - Math.abs(i) * -20, 'coins', 44, 'coin');
    }
  }

  addPickup(x, y, key, size, kind) {
    const p = this.pickups.create(x, y, key);
    p.setScale(size / p.width);
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = kind;
    p.setDepth(-3);
    this.tweens.add({ targets: p, y: y - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  buildFinish(x) {
    addFinishGate(this, x, GROUND_Y);
    this.add.circle(x, GROUND_Y - 120, 60, 0xffe9a8, 0.25).setDepth(-4);
    const g = this.add.star(x, GROUND_Y - 120, 5, 16, 34, 0xffe9a8).setDepth(-3);
    this.tweens.add({ targets: g, angle: 360, duration: 6000, repeat: -1 });
    this.finishZone = new Phaser.Geom.Rectangle(x - 50, GROUND_Y - 200, 100, 200);
  }

  // --- Gada throw (swipe, auto-aim) --------------------------------------
  throwGadaSwipe() {
    if (this.finished || !this.player.alive || this.player.throwing) return;
    if (this.time.now < this.gadaCooldown) return;
    const facing = this.player.facing || 1; // throw the way Hanuman is facing
    let target = null, best = 820 * 820;
    this.foes.children.iterate((f) => {
      if (!f || !f.active || f.alive === false) return;
      const dx = f.x - this.player.x;
      if (dx * facing < -40) return; // only foes in the facing direction
      const dy = f.y - this.player.y, d2 = dx * dx + dy * dy;
      if (d2 < best) { best = d2; target = f; }
    });
    this.gadaCooldown = this.time.now + 450;
    const tx = target ? target.x : this.player.x + facing * 460;
    const ty = target ? target.y - 60 : this.player.y - 20;
    this.player.throwGada(() => this.spawnGada(tx, ty));
  }

  spawnGada(tx, ty) {
    if (this.finished) return;
    const px = this.player.x + 30, py = this.player.y - 20;
    const g = this.gadas.create(px, py, 'gada');
    g.setScale(64 / g.height);
    g.body.setSize(g.width * 0.6, g.height * 0.6);
    g.setDepth(8);
    const ang = Math.atan2(ty - py, tx - px);
    g.setVelocity(Math.cos(ang) * 620, Math.sin(ang) * 620);
    g.setAngularVelocity(720);
    this.time.delayedCall(1400, () => { if (g.active) g.destroy(); });
  }

  onGadaFoe(gada, foe) {
    if (foe.alive === false) return;
    this.defeatFoe(foe);
    this.cameras.main.shake(120, 0.006);
  }

  defeatFoe(foe) {
    foe.alive = false;
    foe.setVelocity(0, 0);
    if (foe.body) foe.body.enable = false;
    this.tweens.killTweensOf(foe);
    this.tweens.add({ targets: foe, angle: 80, alpha: 0, y: foe.y + 30, duration: 400, onComplete: () => foe.destroy() });
    this.puffAt(foe.x, foe.y - 60);
    this.coinsCollected += 3;
    this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 3);
    this.floatText(foe.x, foe.y - 120, '+3', '#ffe9a8');
  }

  puffAt(x, y) {
    const p = this.add.circle(x, y, 12, 0xffd23b, 0.9).setDepth(9);
    this.tweens.add({ targets: p, scale: 3, alpha: 0, duration: 260, onComplete: () => p.destroy() });
  }

  onFoeTouch(player, foe) {
    if (this.time.now < this.invincibleUntil || this.finished || foe.alive === false) return;
    this.invincibleUntil = this.time.now + 1200;
    this.health -= 1;
    this.hud.setHealth(this.health);
    this.player.setVelocity(this.player.facing * -260, -420);
    this.cameras.main.shake(180, 0.008);
    this.cameras.main.flash(120, 120, 0, 0);
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 5 });
    this.floatText(this.player.x, this.player.y - 120, '-1', '#ff6b6b');
    if (this.health <= 0) this.loseLevel('Overwhelmed!');
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    this.coinsCollected += 1;
    this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
  }

  buildControls() {
    this.ctrl = { left: false, right: false };
    this.leftBtn = this.makeButton(90, GAME_HEIGHT - 90, '◀');
    this.rightBtn = this.makeButton(230, GAME_HEIGHT - 90, '▶');
    this.jumpBtn = this.makeButton(GAME_WIDTH - 100, GAME_HEIGHT - 90, '▲', 78);
    this.leftBtn.on('pointerdown', () => (this.ctrl.left = true));
    this.leftBtn.on('pointerup', () => (this.ctrl.left = false));
    this.leftBtn.on('pointerout', () => (this.ctrl.left = false));
    this.rightBtn.on('pointerdown', () => (this.ctrl.right = true));
    this.rightBtn.on('pointerup', () => (this.ctrl.right = false));
    this.rightBtn.on('pointerout', () => (this.ctrl.right = false));
    const jd = () => { this.player.tryJump(); this.player.setWantFly(true); };
    const ju = () => this.player.setWantFly(false);
    this.jumpBtn.on('pointerdown', jd);
    this.jumpBtn.on('pointerup', ju);
    this.jumpBtn.on('pointerout', ju);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE');
    ['keydown-SPACE', 'keydown-UP', 'keydown-W'].forEach((e) => this.input.keyboard.on(e, (ev) => { if (!ev.repeat) jd(); }));
    ['keyup-SPACE', 'keyup-UP', 'keyup-W'].forEach((e) => this.input.keyboard.on(e, ju));
    // Swipe-to-throw + F key.
    this.input.on('pointerdown', (ptr) => { this._swipe = { x: ptr.x, y: ptr.y, ok: ptr.y < GAME_HEIGHT - 170 }; });
    this.input.on('pointerup', (ptr) => { const s = this._swipe; if (!s || !s.ok) return; const dx = ptr.x - s.x, dy = ptr.y - s.y; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.1) this.throwGadaSwipe(); });
    this.input.keyboard.on('keydown-F', () => this.throwGadaSwipe());
  }

  makeButton(x, y, label, radius = 62) {
    const c = this.add.circle(x, y, radius, 0x000000, 0.35).setScrollFactor(0).setDepth(1001).setStrokeStyle(3, 0xffe9a8, 0.7).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: 'Arial', fontSize: `${radius}px`, color: '#ffe9a8' }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
    c.on('pointerdown', () => c.setFillStyle(0xffe9a8, 0.35));
    c.on('pointerup', () => c.setFillStyle(0x000000, 0.35));
    c.on('pointerout', () => c.setFillStyle(0x000000, 0.35));
    return c;
  }

  buildSigns() {
    this.sign(360, GROUND_Y - 300, 'Rakshasas block the path!\nSWIPE to throw the gada,\nor JUMP over them');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '23px', color: '#ffffff', align: 'center', stroke: '#2a0a12', strokeThickness: 5, backgroundColor: '#00000066', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#2a0a12', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  update() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.25 / this.bg.tileScaleX;
    if (this.finished || !this.player.alive) return;

    const left = this.ctrl.left || this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.ctrl.right || this.cursors.right.isDown || this.keys.D.isDown;
    if (left && !right) this.player.moveLeft();
    else if (right && !left) this.player.moveRight();
    else this.player.stopMoving();

    // Rakshasas stalk toward Hanuman and lunge to attack when close.
    const px = this.player.x;
    this.foes.children.iterate((f) => {
      if (!f || !f.alive) return;
      f.y = f.baseY;                       // stay on the ground
      const dx = px - f.x;
      const dir = dx < 0 ? -1 : 1;
      // Face Hanuman. The animated sheet faces right by default, the static art left.
      f.setFlipX(this.rakAnim ? dir < 0 : dir > 0);
      if (f.lunging) return;
      if (Math.abs(dx) > 95) {
        f.setVelocityX(dir * 85);          // creep toward him
      } else {
        f.setVelocityX(0);
        if (this.time.now > (f.nextLunge || 0)) { f.nextLunge = this.time.now + 1300; this.foeLunge(f, dir); }
      }
    });

    this.dark.alpha = Phaser.Math.Clamp((this.player.x - 700) / (WORLD_W - 700), 0, 1) * 0.35;

    if (this.player.y > GAME_HEIGHT + 100) fallRespawn(this);
    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) this.winLevel();
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    enterFinishGate(this, () => this.showEndCard('Escaped the demons!', 'Tap to continue', '#ffe9a8', false, 'MountainScene'));
  }

  loseLevel(reason) {
    if (this.finished) return;
    this.finished = true;
    this.player.alive = false;
    this.player.stopMoving();
    this.showEndCard(reason, 'Tap to try again', '#ff8c8c', true);
  }

  showEndCard(title, subtitle, color, retry = false, nextScene = 'HomeScene') {
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setScrollFactor(0).setDepth(2000).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 400 });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '46px', color, fontStyle: 'bold', stroke: '#2a0a12', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#2a0a12', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    this.tweens.add({ targets: t2, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
    const go = () => {
      if (this._advancing) return;
      this._advancing = true;
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(380, () => { if (retry) this.scene.restart(); else this.scene.start(nextScene); });
    };
    this.input.once('pointerdown', go);
    this.input.keyboard.once('keydown', go);
  }
}
