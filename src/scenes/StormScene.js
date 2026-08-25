import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { fallRespawn } from '../utils/respawn.js';

// SCENE 14 — THE STORM (Chapter 4, flying + survival)
// The bright sky turns violent: fly onward through wind gusts, drifting storm
// clouds and TELEGRAPHED lightning strikes (a warning bar flashes, then the bolt
// falls — don't be under it). Platforms are sparse; land to refuel flight. Not
// meant to be brutal — it should feel like fighting nature.
const WORLD_W = 4200;

export default class StormScene extends Phaser.Scene {
  constructor() {
    super('StormScene');
  }

  create() {
    this.finished = false;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.invincibleUntil = 0;
    this.timeLeft = 120;
    this.wind = 0;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.platformDefs = [
      [150, GAME_HEIGHT - 220, 260], [700, GAME_HEIGHT - 340, 200],
      [1250, GAME_HEIGHT - 300, 200], [1850, GAME_HEIGHT - 420, 200],
      [2450, GAME_HEIGHT - 340, 200], [3050, GAME_HEIGHT - 440, 200],
      [3650, GAME_HEIGHT - 320, 260]
    ];
    this.buildPlatforms();
    this.buildStormClouds();
    this.buildCollectibles();
    this.buildFinish(3720, GAME_HEIGHT - 480);

    this.player = new Player(this, 150, GAME_HEIGHT - 320);
    this.spawnX = 150; this.spawnY = GAME_HEIGHT - 320;
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.onHazard, null, this);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(-60, 40);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setTime(this.timeLeft);
    this.hud.setEnergy(this.energy);
    this.buildFlyMeter();
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.45 });

    // Countdown.
    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.finished) return;
        this.timeLeft -= 1;
        this.hud.setTime(this.timeLeft);
        if (this.timeLeft <= 0) this.loseLevel('Out of time!');
      }
    });
    // Lightning strikes near the player, telegraphed.
    this.time.addEvent({ delay: 2400, loop: true, callback: () => { if (!this.finished) this.telegraphLightning(); } });
    // Wind gusts shift direction every few seconds.
    this.time.addEvent({ delay: 3000, loop: true, callback: () => { this.wind = Phaser.Math.Between(-90, 90); } });
    // Periodic thunder flash.
    this.time.addEvent({ delay: 5200, loop: true, callback: () => { if (!this.finished) this.cameras.main.flash(160, 200, 200, 255); } });
  }

  buildBackground() {
    if (this.textures.exists('bgstorm')) {
      const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgstorm').setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
      const tex = this.textures.get('bgstorm').getSourceImage();
      bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
      this.bg = bg;
    } else {
      const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
      sky.fillGradientStyle(0x2a2a44, 0x35354f, 0x1c1c30, 0x24243a, 1);
      sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    // A dark vignette to deepen the mood over any backdrop.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1e, 0.22).setOrigin(0, 0).setScrollFactor(0).setDepth(-97);
  }

  buildPlatforms() {
    this.platformDefs.forEach(([x, y, w], i) => (i % 2 === 0 ? this.makeCloud(x, y, w) : this.makeRock(x, y, w)));
  }

  makeCloud(x, y, w) {
    if (this.textures.exists('cloud')) {
      this.add.image(x, y, 'cloud').setOrigin(0.5, 0).setDepth(-5).setScale(w / this.textures.get('cloud').getSourceImage().width).setTint(0xc9c9dd);
    } else {
      const g = this.add.graphics().setDepth(-5);
      g.fillStyle(0xbfc4d8, 0.98);
      for (let cx = -w / 2; cx <= w / 2; cx += w / 6) g.fillCircle(x + cx, y + 24, 34);
      g.fillRoundedRect(x - w / 2, y + 8, w, 46, 22);
      g.fillStyle(0x9aa0bb, 0.9); g.fillRoundedRect(x - w / 2, y + 34, w, 22, 14);
    }
    this.addPlatformBody(x, y + 14, w * 0.86);
  }

  makeRock(x, y, w) {
    const key = this.textures.exists('floatrock') ? 'floatrock' : (this.textures.exists('ledge-small') ? 'ledge-small' : 'ledge');
    const img = this.add.image(x, y, key).setOrigin(0.5, 0).setDepth(-5);
    img.setScale(w / img.width); img.setTint(0xb9bccc);
    this.addPlatformBody(x, y + img.displayHeight * 0.15, w * 0.86);
  }

  addPlatformBody(x, surfaceY, w) {
    const body = this.add.rectangle(x, surfaceY, w, 22);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildStormClouds() {
    [[450, GAME_HEIGHT - 300], [1000, GAME_HEIGHT - 480], [1600, GAME_HEIGHT - 300],
     [2150, GAME_HEIGHT - 500], [2750, GAME_HEIGHT - 320], [3350, GAME_HEIGHT - 520]]
      .forEach(([x, y]) => this.makeStormCloud(x, y));
  }

  makeStormCloud(x, y) {
    if (this.textures.exists('stormcloud')) {
      const img = this.add.image(x, y, 'stormcloud').setDepth(4).setScale(130 / this.textures.get('stormcloud').getSourceImage().width);
      this.tweens.add({ targets: img, x: x + 60, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(0x39394f, 0.97);
      for (let cx = -60; cx <= 60; cx += 30) g.fillCircle(x + cx, y, 34);
      g.fillRoundedRect(x - 70, y, 140, 40, 18);
      g.fillStyle(0xffe23b, 1); g.fillTriangle(x - 6, y + 34, x + 10, y + 34, x - 2, y + 66);
      this.tweens.add({ targets: g, alpha: 0.55, duration: 500, yoyo: true, repeat: -1 });
    }
    const zone = this.add.zone(x, y + 8, 150, 84);
    this.physics.add.existing(zone, true);
    this.hazards.add(zone);
  }

  telegraphLightning() {
    // Strike a bit ahead of the player, with a warning bar first.
    const x = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-40, 320), 60, WORLD_W - 60);
    const warn = this.add.rectangle(x, GAME_HEIGHT / 2, 14, GAME_HEIGHT, 0xfff2a0, 0.35).setDepth(800);
    this.tweens.add({ targets: warn, alpha: 0.1, duration: 180, yoyo: true, repeat: 2 });
    this.time.delayedCall(720, () => {
      warn.destroy();
      if (this.finished) return;
      // The bolt.
      const bolt = this.add.rectangle(x, GAME_HEIGHT / 2, 22, GAME_HEIGHT, 0xffffff, 0.95).setDepth(801);
      this.add.rectangle(x, GAME_HEIGHT / 2, 46, GAME_HEIGHT, 0x9ad0ff, 0.35).setDepth(800);
      this.cameras.main.shake(160, 0.01);
      // Damage if the player is within the strike column and vulnerable.
      if (Math.abs(this.player.x - x) < 45 && this.time.now >= this.invincibleUntil) this.strikePlayer();
      this.tweens.add({ targets: bolt, alpha: 0, duration: 260, onComplete: () => bolt.destroy() });
    });
  }

  strikePlayer() {
    this.invincibleUntil = this.time.now + 1200;
    this.health -= 1;
    this.hud.setHealth(this.health);
    this.player.setVelocity(this.player.facing * -160, -360);
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 5 });
    this.floatText(this.player.x, this.player.y - 120, '-1', '#ff6b6b');
    if (this.health <= 0) this.loseLevel('The storm won…');
  }

  buildCollectibles() {
    for (let i = 0; i < this.platformDefs.length - 1; i++) {
      const [x1, y1] = this.platformDefs[i];
      const [x2, y2] = this.platformDefs[i + 1];
      for (let t = 0.33; t <= 0.66; t += 0.33) {
        const cx = Phaser.Math.Linear(x1, x2, t);
        const cy = Phaser.Math.Linear(y1, y2, t) - 70;
        this.addPickup(cx, cy, 'coins', 42, 'coin');
      }
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

  buildFinish(x, y) {
    this.add.circle(x, y, 70, 0xffe9a8, 0.25).setDepth(-4);
    const g = this.add.star(x, y, 6, 22, 46, 0xfff2c0).setDepth(-3);
    this.tweens.add({ targets: g, angle: 360, duration: 6000, repeat: -1 });
    this.tweens.add({ targets: g, scale: 1.15, duration: 900, yoyo: true, repeat: -1 });
    this.finishZone = new Phaser.Geom.Rectangle(x - 60, y - 70, 120, 140);
  }

  buildFlyMeter() {
    this.flyMeter = this.add.container(GAME_WIDTH / 2 - 60, 96).setScrollFactor(0).setDepth(1200);
    const bg = this.add.rectangle(0, 0, 124, 16, 0x000000, 0.4).setOrigin(0, 0.5).setStrokeStyle(2, 0xffe9a8, 0.7);
    this.flyFill = this.add.rectangle(4, 0, 116, 8, 0xffd873).setOrigin(0, 0.5);
    const label = this.add.text(62, -18, 'FLIGHT', { fontFamily: 'Arial', fontSize: '14px', color: '#ffe9a8' }).setOrigin(0.5);
    this.flyMeter.add([bg, this.flyFill, label]);
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
    this.sign(360, GAME_HEIGHT - 380, 'A storm! Watch for the\nlightning warning bars');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff', align: 'center', stroke: '#1a1a3a', strokeThickness: 5, backgroundColor: '#00000066', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    this.coinsCollected += 1;
    this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
  }

  onHazard(player, hazard) {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.strikePlayer();
    this.cameras.main.shake(140, 0.007);
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#1a1a3a', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
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
    // Wind nudges Hanuman while airborne.
    if (!this.player.body.blocked.down) this.player.x += this.wind * (this.game.loop.delta / 1000);

    const fuel = Phaser.Math.Clamp(this.player.flyLeft / this.player.flyMax, 0, 1);
    this.flyFill.width = 116 * fuel;
    this.flyFill.fillColor = fuel > 0.35 ? 0xffd873 : 0xff8c5a;

    if (this.player.y > GAME_HEIGHT + 100) fallRespawn(this);
    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) this.winLevel();
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    this.showEndCard('Through the storm!', 'Tap to continue', '#ffe9a8', false, 'MagicForestScene');
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '50px', color, fontStyle: 'bold', stroke: '#1a1a3a', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#1a1a3a', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
