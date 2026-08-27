import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';

// SCENES 23–24 — RIVER GUARDIAN (Chapter 6 boss) + VICTORY
// A single-screen boss arena: the water guardian hurls WATER WAVES (jump them)
// and the occasional ROCK. SWIPE to throw the gada at the boss; whittle its HP to
// zero to win. Keeps the simple jump → dodge → attack loop the doc asks for.
const GROUND_Y = GAME_HEIGHT - 150;
const WORLD_W = 3200; // horizontal arena — Hanuman runs/flies toward the boss
const BOSS_MAX_HP = 6;

export default class RiverBossScene extends Phaser.Scene {
  constructor() {
    super('RiverBossScene');
  }

  create() {
    ['ground'].forEach((k) => stripBackground(this, k));

    this.finished = false;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.invincibleUntil = 0;
    this.bossHP = BOSS_MAX_HP;
    this.gadaCooldown = 0;

    // Horizontal arena.
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.waves = this.physics.add.group({ allowGravity: false });
    this.gadas = this.physics.add.group({ allowGravity: false });

    this.buildGround();
    this.buildBoss();

    this.player = new Player(this, 180, GROUND_Y - 220);
    this.spawnX = 180; this.spawnY = GROUND_Y - 220;
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.waves, this.onWaveHit, null, this);
    this.physics.add.overlap(this.gadas, this.boss, this.onGadaBoss, null, this);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(-80, 60);

    this.hud = new Hud(this, { maxHealth: 3 });
    // No energy or countdown in the boss arena — hide them so the boss HP bar
    // owns the center-top slot (otherwise the ENERGY bar overlaps it).
    this.hud.hideEnergy();
    this.hud.hideTime();
    this.buildBossBar();
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.5 });

    // Boss attack loop.
    this.attackEvent = this.time.addEvent({ delay: 2200, loop: true, callback: () => { if (!this.finished) this.bossAttack(); } });
  }

  buildBackground() {
    const key = this.textures.exists('bgriverboss') ? 'bgriverboss' : 'bg2';
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get(key).getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a1a2a, 0.18).setOrigin(0, 0).setScrollFactor(0).setDepth(-98);
  }

  buildGround() {
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(0, GROUND_Y - grassOffset, WORLD_W, displayH, 'ground').setOrigin(0, 0).setDepth(-10);
    ts.setTileScale(tScale, tScale);
    ts.setTint(0x8fa0a0);
    this.add.rectangle(0, GROUND_Y - grassOffset + displayH, WORLD_W, GAME_HEIGHT, 0x24303a).setOrigin(0, 0).setDepth(-11);
    const body = this.add.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildBoss() {
    this.bossAnim = this.bakeBossSheet();
    const dispH = 440;
    if (this.bossAnim) {
      this.boss = this.physics.add.staticSprite(WORLD_W - 240, GROUND_Y - 10, 'boss-anim', 0).setOrigin(0.5, this.bossFeetFrac);
      this.boss.setScale(dispH / this.bossCellH);
      this.boss.play('boss-idle');
    } else {
      const key = this.textures.exists('boss') ? 'boss' : 'boulder';
      this.boss = this.physics.add.staticImage(WORLD_W - 240, GROUND_Y - 10, key).setOrigin(0.5, 1);
      this.boss.setScale(dispH / this.boss.height);
    }
    this.boss.setFlipX(true); // face left, toward Hanuman (art faces right by default)
    this.boss.body.setSize(this.boss.width * 0.42, this.boss.height * 0.6);
    this.boss.body.setOffset((this.boss.width - this.boss.width * 0.42) / 2, this.boss.height * 0.25);
    this.boss.refreshBody();
    this.boss.setDepth(4);
    this.boss.alive = true;
    // Menacing idle sway.
    this.tweens.add({ targets: this.boss, y: this.boss.y - 12, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Bake the animated guardian sheet's idle row into 'boss-anim' + 'boss-idle'.
  bakeBossSheet() {
    const stored = this.game.registry.get('bossCell');
    if (this.anims.exists('boss-idle') && stored) { this.bossCellH = stored.h; this.bossFeetFrac = stored.feetFrac; return true; }
    if (!this.textures.exists('boss-sheet')) return false;
    const src = this.textures.get('boss-sheet').getSourceImage();
    const w = src.width, h = src.height;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d'); cx.drawImage(src, 0, 0);
    const d = cx.getImageData(0, 0, w, h).data;
    const A = (px, py) => d[(py * w + px) * 4 + 3];
    // Idle row (measured band). Connected components, left→right.
    const y0 = 8, y1 = 258, bw = w, bh = y1 - y0, lab = new Uint8Array(bw * bh), comps = [];
    for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) {
      if (lab[yy * bw + xx] || A(xx, y0 + yy) <= 70) continue;
      let minx = xx, maxx = xx, miny = yy, maxy = yy, cnt = 0; const st = [xx, yy]; lab[yy * bw + xx] = 1;
      while (st.length) { const py = st.pop(), px = st.pop(); cnt++;
        if (px < minx) minx = px; if (px > maxx) maxx = px; if (py < miny) miny = py; if (py > maxy) maxy = py;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue; const p = ny * bw + nx; if (!lab[p] && A(nx, y0 + ny) > 70) { lab[p] = 1; st.push(nx, ny); } } }
      if (cnt > 3000 && (maxy - miny) >= 130) comps.push({ x: minx, y: y0 + miny, w: maxx - minx + 1, h: maxy - miny + 1 });
    }
    comps.sort((a, b) => a.x - b.x);
    if (comps.length < 4) return false;
    const n = comps.length, CW = 210, PAD = 8;
    const CH = Math.max(...comps.map((c) => c.h)) + PAD * 2;
    const out = document.createElement('canvas'); out.width = CW * n; out.height = CH;
    const ox = out.getContext('2d');
    comps.forEach((c, i) => ox.drawImage(cv, c.x, c.y, c.w, c.h, i * CW + (CW - c.w) / 2, CH - PAD - c.h, c.w, c.h));
    const tex = this.textures.createCanvas('boss-anim', out.width, out.height);
    tex.getContext().drawImage(out, 0, 0); tex.refresh();
    for (let i = 0; i < n; i++) tex.add(i, 0, i * CW, 0, CW, CH);
    this.anims.create({ key: 'boss-idle', frames: Array.from({ length: n }, (_, i) => ({ key: 'boss-anim', frame: i })), frameRate: 7, repeat: -1 });
    this.bossCellH = CH;
    this.bossFeetFrac = (CH - PAD) / CH;
    this.game.registry.set('bossCell', { h: CH, feetFrac: this.bossFeetFrac });
    return true;
  }

  buildBossBar() {
    // Sits between the top-left health gauge and the top-right pause button.
    const w = 344;
    const cx = 448;
    this.add.rectangle(cx, 60, w + 8, 26, 0x000000, 0.5).setScrollFactor(0).setDepth(1200).setStrokeStyle(2, 0x9ad0ff, 0.8);
    this.bossFill = this.add.rectangle(cx - w / 2, 60, w, 18, 0x3fb0d8).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1201);
    this.bossBarW = w;
    this.add.text(cx, 36, 'RIVER GUARDIAN', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#bfeaff', fontStyle: 'bold', stroke: '#0a2030', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(1201);
  }

  bossAttack() {
    if (!this.boss.alive) return;
    // Only attack once Hanuman is in range (it's a wide arena he runs across).
    if (Math.abs(this.player.x - this.boss.x) > 1050) return;
    // Mostly water waves, sometimes a lobbed rock.
    if (Phaser.Math.Between(0, 3) === 0) this.throwRock();
    else this.spawnWave();
    if (this.bossAnim) { this.boss.play('boss-idle', true); }
    this.tweens.add({ targets: this.boss, x: this.boss.x - 20, duration: 140, yoyo: true });
  }

  spawnWave() {
    const y = GROUND_Y - Phaser.Math.Between(30, 70);
    const wv = this.waves.create(this.boss.x - 120, y, 'glow');
    wv.setTint(0x4fc8ff);
    wv.setScale(2.2, 1.4);
    wv.body.setSize(wv.width * 0.7, wv.height * 0.6);
    wv.setDepth(3);
    wv.setVelocityX(-Phaser.Math.Between(240, 320));
    wv.kind = 'wave';
    this.tweens.add({ targets: wv, scaleX: 2.6, duration: 400, yoyo: true, repeat: -1 });
  }

  throwRock() {
    const key = this.textures.exists('boulder') ? 'boulder' : 'glow';
    const r = this.waves.create(this.boss.x - 120, GROUND_Y - 240, key);
    r.setScale(70 / r.width);
    r.body.setSize(r.width * 0.7, r.height * 0.7);
    r.setDepth(3);
    r.setVelocity(-260, -260);
    r.body.setAllowGravity(true);
    r.setAngularVelocity(-200);
    r.kind = 'rock';
  }

  onWaveHit(player, wv) {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.invincibleUntil = this.time.now + 1200;
    this.health -= 1;
    this.hud.setHealth(this.health);
    wv.destroy();
    this.player.setVelocity(this.player.facing * -200, -340);
    this.cameras.main.shake(160, 0.008);
    this.cameras.main.flash(120, 40, 120, 160);
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 5 });
    this.floatText(this.player.x, this.player.y - 120, '-1', '#ff6b6b');
    if (this.health <= 0) this.loseLevel('Overwhelmed by the river!');
  }

  // --- Gada throw (swipe, auto-aims at the boss) -------------------------
  throwGadaSwipe() {
    if (this.finished || !this.player.alive || this.player.throwing) return;
    if (this.time.now < this.gadaCooldown) return;
    this.gadaCooldown = this.time.now + 450;
    this.player.throwGada(() => this.spawnGada(this.boss.x, this.boss.y - 200));
  }

  spawnGada(tx, ty) {
    if (this.finished) return;
    const px = this.player.x + 30, py = this.player.y - 20;
    const g = this.gadas.create(px, py, 'gada');
    g.setScale(64 / g.height);
    g.body.setSize(g.width * 0.6, g.height * 0.6);
    g.setDepth(8);
    const ang = Math.atan2(ty - py, tx - px);
    g.setVelocity(Math.cos(ang) * 640, Math.sin(ang) * 640);
    g.setAngularVelocity(720);
    this.time.delayedCall(1500, () => { if (g.active) g.destroy(); });
  }

  onGadaBoss(a, b) {
    // Phaser calls the overlap handler for a (group, sprite) pair as
    // (sprite, groupChild) — i.e. (boss, gada) — so identify each by identity
    // rather than trusting positional order.
    const boss = a === this.boss ? a : b;
    const gada = a === this.boss ? b : a;
    if (!boss.alive || gada._hit) return;
    gada._hit = true;
    gada.destroy();
    this.bossHP -= 1;
    this.bossFill.width = this.bossBarW * Phaser.Math.Clamp(this.bossHP / BOSS_MAX_HP, 0, 1);
    this.boss.setTintFill(0xffffff);
    this.time.delayedCall(90, () => this.boss.clearTint());
    this.cameras.main.shake(120, 0.006);
    this.puffAt(boss.x, boss.y - 200, 0x9ad0ff);
    if (this.bossHP <= 0) this.defeatBoss();
  }

  defeatBoss() {
    this.boss.alive = false;
    if (this.attackEvent) this.attackEvent.remove();
    this.waves.clear(true, true);
    this.tweens.killTweensOf(this.boss);
    this.tweens.add({ targets: this.boss, y: this.boss.y + 120, alpha: 0, angle: 8, duration: 1200, ease: 'Quad.easeIn' });
    this.time.delayedCall(1300, () => this.winLevel());
  }

  puffAt(x, y, color = 0xffd23b) {
    const p = this.add.circle(x, y, 16, color, 0.9).setDepth(9);
    this.tweens.add({ targets: p, scale: 3, alpha: 0, duration: 300, onComplete: () => p.destroy() });
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
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.32, 'The River Guardian rises!\nSWIPE to hurl the gada — JUMP the waves', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff', align: 'center', stroke: '#0a2030', strokeThickness: 5, backgroundColor: '#00000066', padding: { x: 12, y: 8 } }).setOrigin(0.5).setScrollFactor(0).setDepth(1300);
    this.tweens.add({ targets: t, alpha: 0, delay: 3200, duration: 600, onComplete: () => t.destroy() });
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#0a2030', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
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

    const leftEdge = this.cameras.main.scrollX - 120;
    this.waves.children.iterate((w) => { if (w && (w.x < leftEdge || w.y > GAME_HEIGHT + 80)) w.destroy(); });
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    this.showEndCard('The path opens!', 'Tap to continue', '#bfeaff', false, 'DronagiriScene');
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '46px', color, fontStyle: 'bold', stroke: '#0a2030', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#0a2030', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
