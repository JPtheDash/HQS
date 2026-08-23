import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';

// SCENE 9 — FIRST DANGER (Chapter 1, part 3)
// The forest turns hostile. Three hazard types are introduced one at a time so
// each is readable: THORNS, then ROLLING BOULDERS, then FIRE. The screen slowly
// darkens as Hanuman presses deeper in.
const WORLD_W = 3600;
const GROUND_Y = GAME_HEIGHT - 150;

export default class DangerScene extends Phaser.Scene {
  constructor() {
    super('DangerScene');
  }

  create() {
    // NB: boulder.png already ships with real alpha — never strip it (its grey
    // rock would be flood-filled away as "neutral background").
    ['ground', 'banana', 'mango'].forEach((k) => stripBackground(this, k));

    this.finished = false;
    this.invincibleUntil = 0;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.timeLeft = 110;
    this.fires = [];

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.boulders = this.physics.add.group();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    // Combat groups: fire-bats, their fireballs, and Hanuman's thrown gadas.
    this.registerCombatAnims();
    this.bats = this.physics.add.group({ allowGravity: false });
    this.fireballs = this.physics.add.group({ allowGravity: false });
    this.gadas = this.physics.add.group({ allowGravity: false });
    this.gadaCooldown = 0;

    this.buildGround();
    this.buildThorns([760, 880, 1000]);
    this.buildFires([2500, 2760, 3020]);
    this.buildCollectibles();
    this.buildFinish(3440);

    this.player = new Player(this, 120, GROUND_Y - 220);
    this.spawnX = 120; this.spawnY = GROUND_Y - 220;
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.boulders, this.solids);
    this.physics.add.overlap(this.player, this.hazards, this.onHazard, (pl, hz) => hz.active !== false, this);
    this.physics.add.overlap(this.player, this.boulders, this.onHazard, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    // Fireball hits Hanuman; gada kills bats and neutralizes fireballs.
    this.physics.add.overlap(this.player, this.fireballs, this.onFireballHit, null, this);
    this.physics.add.overlap(this.gadas, this.bats, this.onGadaBat, null, this);
    this.physics.add.overlap(this.gadas, this.fireballs, this.onGadaFireball, null, this);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-80, 60);

    // Darkening overlay (grows as Hanuman goes deeper).
    this.dark = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(900);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setTime(this.timeLeft);
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.4 });

    // Boulder spawner — only active in the boulder section.
    this.time.addEvent({
      delay: 1500, loop: true, callback: () => {
        if (this.finished) return;
        if (this.player.x > 1350 && this.player.x < 2350) this.spawnBoulder();
      }
    });
    // Fire flicker toggle.
    this.time.addEvent({ delay: 1100, loop: true, callback: () => this.toggleFires() });
    // Fire-bats swoop in through the middle+late stretch and lob fireballs.
    this.time.addEvent({
      delay: 1900, loop: true, callback: () => {
        if (this.finished) return;
        if (this.player.x > 1200 && this.player.x < 3200 && this.bats.countActive(true) < 4) this.spawnBat();
      }
    });
    // Countdown.
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
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
    sky.fillGradientStyle(0x6f9fb0, 0x6f9fb0, 0x9ab97e, 0x6f8a4a, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.drawHills(GROUND_Y + 40, 0x4a6f3a, 150, 320, 0.35, -90);
    this.drawHills(GROUND_Y + 90, 0x33502a, 120, 210, 0.6, -80);
  }

  drawHills(baseY, color, amplitude, wavelength, scrollFactor, depth) {
    const g = this.add.graphics().setScrollFactor(scrollFactor).setDepth(depth);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, GAME_HEIGHT);
    const span = WORLD_W + GAME_WIDTH;
    for (let x = 0; x <= span; x += 20) g.lineTo(x, baseY - Math.abs(Math.sin(x / wavelength)) * amplitude);
    g.lineTo(span, GAME_HEIGHT);
    g.closePath();
    g.fillPath();
  }

  buildGround() {
    // ground.png tiled along the world; tinted a touch darker for the mood.
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(0, GROUND_Y - grassOffset, WORLD_W, displayH, 'ground')
      .setOrigin(0, 0).setDepth(-10);
    ts.setTileScale(tScale, tScale);
    ts.setTint(0xb9c2ac);
    this.add.rectangle(0, GROUND_Y - grassOffset + displayH, WORLD_W, GAME_HEIGHT, 0x2a1e12)
      .setOrigin(0, 0).setDepth(-11);
    const body = this.add.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildThorns(xs) {
    xs.forEach((x) => {
      const y = GROUND_Y;
      const g = this.add.graphics().setDepth(-4);
      g.fillStyle(0x2f6b2a, 1); g.fillEllipse(x, y - 12, 120, 54);
      g.fillStyle(0x274d1f, 1);
      for (let i = -3; i <= 3; i++) g.fillTriangle(x + i * 16 - 6, y - 18, x + i * 16 + 6, y - 18, x + i * 16, y - 62);
      g.fillStyle(0x8a2b2b, 1);
      for (let i = -3; i <= 3; i++) g.fillCircle(x + i * 16, y - 60, 3);
      const zone = this.add.zone(x, y - 34, 110, 60);
      this.physics.add.existing(zone, true);
      this.hazards.add(zone);
    });
  }

  buildFires(xs) {
    xs.forEach((x) => {
      const zone = this.add.zone(x, GROUND_Y - 70, 100, 130);
      this.physics.add.existing(zone, true);
      zone.active = true;
      this.hazards.add(zone);
      // The baked flame sprite, anchored at its base on the ground. Depth 5
      // keeps it in front of the ground but behind Hanuman (depth 6).
      const img = this.add.image(x, GROUND_Y + 8, 'fire').setOrigin(0.5, 1).setDepth(5);
      img.setScale(165 / img.height);
      img.baseScaleX = img.scaleX; img.baseScaleY = img.scaleY;
      const draw = () => img.setVisible(zone.active);
      draw();
      this.fires.push({ zone, g: img, draw });
      // Flicker: gentle height/width wobble plus a brightness pulse.
      this.tweens.add({ targets: img, scaleY: img.baseScaleY * 1.16, scaleX: img.baseScaleX * 0.9, duration: 230, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: img, alpha: 0.8, duration: 140, yoyo: true, repeat: -1 });
    });
  }

  toggleFires() {
    if (this.finished) return;
    this.fires.forEach((f) => { f.zone.active = !f.zone.active; f.g.setVisible(f.zone.active); f.draw(); });
  }

  spawnBoulder() {
    const startX = Math.min(this.player.x + 900, WORLD_W - 40);
    const b = this.boulders.create(startX, GROUND_Y - 80, 'boulder');
    b.setScale(90 / b.width);
    b.body.setCircle(b.width * 0.42, b.width * 0.08, b.height * 0.08);
    b.setVelocityX(-300);
    b.setAngularVelocity(-240);
    b.setBounce(0.2);
    b.setDepth(2);
  }

  // --- Fire-bats, fireballs, thrown gada --------------------------------
  registerCombatAnims() {
    const a = this.anims;
    if (!a.exists('bat-fly')) a.create({ key: 'bat-fly', frames: a.generateFrameNumbers('bat', { frames: [0, 1, 2, 3, 4, 5] }), frameRate: 12, repeat: -1 });
    if (!a.exists('bat-throw')) a.create({ key: 'bat-throw', frames: a.generateFrameNumbers('bat', { frames: [6, 7, 8, 9, 10, 11] }), frameRate: 12, repeat: 0 });
    if (!a.exists('bat-death')) a.create({ key: 'bat-death', frames: a.generateFrameNumbers('bat', { frames: [12, 13, 14, 15, 16, 17] }), frameRate: 12, repeat: 0 });
    if (!a.exists('fireball-spin')) a.create({ key: 'fireball-spin', frames: a.generateFrameNumbers('fireball', { frames: [0, 1, 2, 3] }), frameRate: 14, repeat: -1 });
  }

  spawnBat() {
    const x = this.cameras.main.scrollX + GAME_WIDTH + 80;
    const y = Phaser.Math.Between(GROUND_Y - 560, GROUND_Y - 260);
    const bat = this.bats.create(x, y, 'bat');
    bat.setScale(120 / bat.height);
    bat.body.setSize(bat.width * 0.5, bat.height * 0.5);
    bat.setDepth(7);
    bat.alive = true;
    bat.baseY = y;
    bat.play('bat-fly');
    bat.setVelocityX(Phaser.Math.Between(-70, -40));
    // Gentle vertical bob.
    this.tweens.add({ targets: bat, y: y + 40, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Periodically hurl a fireball at Hanuman while on screen and ahead of him.
    bat.throwTimer = this.time.addEvent({
      delay: Phaser.Math.Between(1400, 2200), loop: true, callback: () => {
        if (this.finished || !bat.active || !bat.alive) return;
        if (bat.x > this.player.x + 40 && bat.x < this.cameras.main.scrollX + GAME_WIDTH) this.batThrow(bat);
      }
    });
  }

  batThrow(bat) {
    bat.play('bat-throw');
    bat.once('animationcomplete-bat-throw', () => { if (bat.active && bat.alive) bat.play('bat-fly'); });
    this.time.delayedCall(280, () => {
      if (!bat.active || !bat.alive || this.finished) return;
      this.spawnFireball(bat.x - bat.displayWidth * 0.35, bat.y, this.player.x, this.player.y - 40);
    });
  }

  spawnFireball(x, y, tx, ty) {
    const fb = this.fireballs.create(x, y, 'fireball');
    fb.setScale(70 / fb.height);
    fb.body.setSize(fb.width * 0.5, fb.height * 0.5);
    fb.setDepth(6);
    fb.play('fireball-spin');
    const ang = Math.atan2(ty - y, tx - x);
    const speed = 320;
    fb.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    fb.setFlipX(Math.cos(ang) < 0); // art travels right by default; flip for leftward
    fb.rotation = ang + (Math.cos(ang) < 0 ? Math.PI : 0);
  }

  autoThrowGada() {
    if (this.finished || !this.player.alive || this.player.throwing) return;
    if (this.time.now < this.gadaCooldown) return;
    // Nearest live bat that is ahead of Hanuman and within range.
    let target = null, best = 720 * 720;
    this.bats.children.iterate((b) => {
      if (!b || !b.active || !b.alive) return;
      if (b.x < this.player.x - 20) return;
      const dx = b.x - this.player.x, dy = b.y - this.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) { best = d2; target = b; }
    });
    if (!target) return;
    this.gadaCooldown = this.time.now + 850;
    const tx = target.x, ty = target.y;
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
    const speed = 620;
    g.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    g.setAngularVelocity(720);
    // Despawn after its flight so one throw can clear a bat and a fireball en route.
    this.time.delayedCall(1400, () => { if (g.active) g.destroy(); });
  }

  onFireballHit(player, fb) {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.puffAt(fb.x, fb.y);
    fb.destroy();
    this.onHazard(player, null);
  }

  onGadaBat(gada, bat) {
    if (!bat.alive) return;
    this.killBat(bat);
    this.cameras.main.shake(120, 0.006);
  }

  onGadaFireball(gada, fb) {
    this.puffAt(fb.x, fb.y);
    fb.destroy();
  }

  killBat(bat) {
    bat.alive = false;
    bat.setVelocity(0, 0);
    if (bat.body) bat.body.enable = false;
    if (bat.throwTimer) bat.throwTimer.remove();
    this.tweens.killTweensOf(bat);
    bat.play('bat-death');
    bat.once('animationcomplete-bat-death', () => bat.destroy());
    // Reward.
    this.coinsCollected += 2;
    this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 2);
    this.floatText(bat.x, bat.y - 40, '+2', '#ffe9a8');
  }

  puffAt(x, y) {
    const p = this.add.circle(x, y, 10, 0xffd23b, 0.9).setDepth(9);
    this.tweens.add({ targets: p, scale: 3, alpha: 0, duration: 260, onComplete: () => p.destroy() });
  }

  buildCollectibles() {
    [[500, 'coins', 'coin'], [1200, 'banana', 'food'], [2200, 'coins', 'coin'], [3200, 'mango', 'food']]
      .forEach(([x, key, kind]) => this.addPickup(x, GROUND_Y - 210, key, kind === 'coin' ? 46 : 64, kind));
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
    this.add.circle(x, GROUND_Y - 120, 60, 0xffe9a8, 0.2).setDepth(-4);
    const gate = this.textures.exists('finish-gate')
      ? this.add.image(x, GROUND_Y, 'finish-gate').setOrigin(0.5, 1).setDepth(-6)
      : this.add.rectangle(x, GROUND_Y, 60, 240, 0xffe9a8).setOrigin(0.5, 1);
    if (gate.width) { stripBackground(this, 'finish-gate'); gate.setTexture('finish-gate'); gate.setScale(340 / gate.width); }
    this.finishZone = new Phaser.Geom.Rectangle(x - 40, GROUND_Y - 240, 80, 240);
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
    this.sign(500, GROUND_Y - 300, 'Danger ahead —\navoid the thorns!');
    this.sign(1500, GROUND_Y - 320, 'Rolling boulders!\nJUMP over them');
    this.sign(1950, GROUND_Y - 360, 'Fire-bats! Hanuman\nhurls his gada at them');
    this.sign(2500, GROUND_Y - 300, 'Fire! Cross when\nthe flames die down');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff', align: 'center', stroke: '#2a1500', strokeThickness: 5, backgroundColor: '#00000066', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onHazard(player, hazard) {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.invincibleUntil = this.time.now + 1200;
    this.health -= 1;
    this.hud.setHealth(this.health);
    this.player.setVelocity(this.player.facing * -260, -420);
    this.cameras.main.shake(180, 0.008);
    this.cameras.main.flash(120, 120, 0, 0);
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 5 });
    this.floatText(this.player.x, this.player.y - 120, '-1', '#ff6b6b');
    if (this.health <= 0) this.loseLevel('Hanuman fell...');
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    if (pickup.kind === 'coin') {
      this.coinsCollected += 1;
      this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    } else {
      this.energy = Phaser.Math.Clamp(this.energy + 0.25, 0, 1);
      this.hud.setEnergy(this.energy);
    }
    this.floatText(pickup.x, pickup.y, pickup.kind === 'coin' ? '+1' : '+ENERGY', '#ffe9a8');
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  update() {
    if (this.finished || !this.player.alive) return;

    const left = this.ctrl.left || this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.ctrl.right || this.cursors.right.isDown || this.keys.D.isDown;
    if (left && !right) this.player.moveLeft();
    else if (right && !left) this.player.moveRight();
    else this.player.stopMoving();

    // Deepen the darkness with progress.
    this.dark.alpha = Phaser.Math.Clamp((this.player.x - 900) / (WORLD_W - 900), 0, 1) * 0.35;

    // Clean up boulders that rolled past.
    this.boulders.children.iterate((b) => {
      if (b && b.x < this.cameras.main.scrollX - 120) b.destroy();
    });

    // Combat: auto-throw the gada at the nearest bat, keep fireballs oriented,
    // and cull anything that has drifted off the world.
    this.autoThrowGada();
    const leftEdge = this.cameras.main.scrollX - 200;
    this.bats.children.iterate((b) => { if (b && b.alive && b.x < leftEdge) { if (b.throwTimer) b.throwTimer.remove(); b.destroy(); } });
    this.fireballs.children.iterate((f) => {
      if (!f) return;
      if (f.x < leftEdge || f.x > this.cameras.main.scrollX + GAME_WIDTH + 200 || f.y > GAME_HEIGHT + 100 || f.y < -100) f.destroy();
    });

    if (this.player.y > GAME_HEIGHT + 100) fallRespawn(this);
    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) this.winLevel();
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    this.showEndCard('Danger survived!', 'Tap to continue', '#ffe9a8', false, 'TiredScene');
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '52px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#2a1500', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
