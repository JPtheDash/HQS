import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';
import { addFinishGate, enterFinishGate } from '../utils/finishGate.js';

// SCENES 19–20 — HIMALAYAN MOUNTAIN PASS / DANGEROUS CLIFFS (Chapter 7)
// Cold precision platforming across narrow snow ledges with jumpable gaps, under
// a new hazard: FALLING ROCKS that drop from above (a shadow warns first). Drift
// snow and a chilly tint over the bgmountain backdrop.
const WORLD_W = 3600;
const GROUND_Y = GAME_HEIGHT - 150;

export default class MountainScene extends Phaser.Scene {
  constructor() {
    super('MountainScene');
  }

  create() {
    // ground.png has real alpha (transparent sky) — stripping erases its dirt,
    // so it is never stripped (see the ledge/ground note in GameScene).

    this.finished = false;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.invincibleUntil = 0;
    this.timeLeft = 130;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.rocks = this.physics.add.group();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildGround();
    this.buildLedges();
    this.buildCollectibles();
    this.buildFinish(3440);

    this.player = new Player(this, 120, GROUND_Y - 220);
    this.spawnX = 120; this.spawnY = GROUND_Y - 220;
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.rocks, this.solids, (r) => this.shatterRock(r));
    this.physics.add.overlap(this.player, this.rocks, this.onRockHit, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-80, 60);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setTime(this.timeLeft);
    this.hud.setEnergy(this.energy);
    this.buildControls();
    this.buildSigns();
    this.buildSnow();

    playMusic(this, GAME_MUSIC, { volume: 0.4 });

    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.finished) return;
        this.timeLeft -= 1;
        this.hud.setTime(this.timeLeft);
        if (this.timeLeft <= 0) this.loseLevel('Out of time!');
      }
    });
    // Falling rocks in the cliff section.
    this.time.addEvent({ delay: 1600, loop: true, callback: () => { if (!this.finished && this.player.x > 900 && this.player.x < 3300) this.dropRock(); } });
  }

  buildBackground() {
    const key = this.textures.exists('bgmountain') ? 'bgmountain' : 'bg1';
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get(key).getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xbfe0ff, 0.1).setOrigin(0, 0).setScrollFactor(0).setDepth(-98);
  }

  buildGround() {
    // Ground with several jumpable gaps (precision).
    [[0, 900], [1100, 1700], [1900, 2500], [2700, WORLD_W]].forEach(([a, b]) => this.addSpan(a, b));
  }

  addSpan(x0, x1) {
    const w = x1 - x0;
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(x0, GROUND_Y - grassOffset, w, displayH, 'ground').setOrigin(0, 0).setDepth(-10);
    ts.setTileScale(tScale, tScale);
    ts.setTint(0xd8e6f0); // snowy
    this.add.rectangle(x0, GROUND_Y - grassOffset + displayH, w, GAME_HEIGHT, 0x5a6472).setOrigin(0, 0).setDepth(-11);
    const body = this.add.rectangle(x0 + w / 2, GROUND_Y + 40, w, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildLedges() {
    // Narrow snow ledges bridging some gaps / adding height.
    [[1000, GROUND_Y - 210, 150], [1800, GROUND_Y - 230, 150],
     [2100, GROUND_Y - 360, 150], [2600, GROUND_Y - 240, 150], [2350, GROUND_Y - 470, 140]]
      .forEach(([x, y, w]) => this.makeLedge(x, y, w));
  }

  makeLedge(x, y, w) {
    const key = this.textures.exists('snowledge') ? 'snowledge' : (this.textures.exists('ledge-small') ? 'ledge-small' : 'ledge');
    const img = this.add.image(x, y, key).setOrigin(0.5, 0).setDepth(-5).setTint(0xdfeaf5);
    img.setScale(w / img.width);
    const surfaceY = y + img.displayHeight * 0.15;
    const plank = this.add.rectangle(x, surfaceY, w * 0.9, 20);
    this.physics.add.existing(plank, true);
    plank.setVisible(false);
    this.solids.add(plank);
  }

  dropRock() {
    const x = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-60, 260), 60, WORLD_W - 60);
    // Warning shadow on the ground below.
    const warn = this.add.ellipse(x, GROUND_Y - 8, 60, 20, 0x000000, 0.35).setDepth(-4);
    this.tweens.add({ targets: warn, alpha: 0.1, duration: 200, yoyo: true, repeat: 2, onComplete: () => warn.destroy() });
    this.time.delayedCall(700, () => {
      if (this.finished) return;
      const key = this.textures.exists('fallrock') ? 'fallrock' : 'boulder';
      const r = this.rocks.create(x, this.cameras.main.scrollY - 40, key);
      r.setScale(64 / r.width);
      r.body.setCircle(r.width * 0.44);
      r.setTint(0x9fb0c0);
      r.setDepth(3);
      r.setVelocityY(60);
      r.setAngularVelocity(120);
    });
  }

  shatterRock(r) {
    if (!r.active) return;
    this.puffAt(r.x, r.y, 0xcfd8e0);
    r.destroy();
  }

  buildCollectibles() {
    for (let x = 400; x < 3300; x += 340) {
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

  buildSnow() {
    for (let i = 0; i < 40; i++) {
      const f = this.add.circle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), Phaser.Math.Between(2, 4), 0xffffff, 0.8).setScrollFactor(0).setDepth(950);
      this.tweens.add({ targets: f, y: '+=' + GAME_HEIGHT, x: '+=' + Phaser.Math.Between(-40, 40), duration: Phaser.Math.Between(4000, 8000), repeat: -1, onRepeat: () => { f.y = -10; f.x = Phaser.Math.Between(0, GAME_WIDTH); } });
    }
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
    this.sign(360, GROUND_Y - 300, 'The cold Himalayan pass —\nmind the gaps and falling rocks!');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '23px', color: '#ffffff', align: 'center', stroke: '#24384a', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onRockHit(player, rock) {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.invincibleUntil = this.time.now + 1200;
    this.health -= 1;
    this.hud.setHealth(this.health);
    this.shatterRock(rock);
    this.player.setVelocity(this.player.facing * -220, -360);
    this.cameras.main.shake(180, 0.008);
    this.cameras.main.flash(120, 120, 120, 120);
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 5 });
    this.floatText(this.player.x, this.player.y - 120, '-1', '#ff6b6b');
    if (this.health <= 0) this.loseLevel('Crushed by rocks!');
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    this.coinsCollected += 1;
    this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
  }

  puffAt(x, y, color = 0xffd23b) {
    const p = this.add.circle(x, y, 12, color, 0.9).setDepth(9);
    this.tweens.add({ targets: p, scale: 2.6, alpha: 0, duration: 260, onComplete: () => p.destroy() });
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#24384a', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
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

    this.rocks.children.iterate((r) => { if (r && r.y > GAME_HEIGHT + 60) r.destroy(); });

    if (this.player.y > GAME_HEIGHT + 100) fallRespawn(this);
    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) this.winLevel();
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    enterFinishGate(this, () => this.showEndCard('Over the pass!', 'Tap to continue', '#ffe9a8', false, 'RiverScene'));
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '48px', color, fontStyle: 'bold', stroke: '#24384a', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#24384a', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
