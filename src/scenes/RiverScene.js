import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { addFinishGate, enterFinishGate } from '../utils/finishGate.js';

// SCENES 21–22 — RIVER CROSSING (Chapter 5/6)
// A wide misty river: cross by hopping rock-and-log stepping stones. The WATER is
// the hazard — fall in and Hanuman loses a heart and is set back to the last safe
// stone. Some stones bob. bgriver backdrop with a shimmering water band.
const WORLD_W = 3600;
const GROUND_Y = GAME_HEIGHT - 150;
const WATER_Y = GROUND_Y + 10; // surface; below this = in the water

export default class RiverScene extends Phaser.Scene {
  constructor() {
    super('RiverScene');
  }

  create() {
    ['ground'].forEach((k) => stripBackground(this, k));

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
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildBanks();
    this.buildStones();
    this.buildCollectibles();
    this.buildFinish(3460);

    this.player = new Player(this, 120, GROUND_Y - 220);
    this.spawnX = 120; this.spawnY = GROUND_Y - 220;
    this.safeX = 120; this.safeY = GROUND_Y - 220;
    this.physics.add.collider(this.player, this.solids, () => this.markSafe());
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-80, 60);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setTime(this.timeLeft);
    this.hud.setEnergy(this.energy);
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.4 });

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
    const key = this.textures.exists('bgriver') ? 'bgriver' : 'bg2';
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get(key).getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    // Shimmering water band across the bottom.
    this.water = this.add.rectangle(0, WATER_Y, WORLD_W, GAME_HEIGHT - WATER_Y + 40, 0x2a86a8, 0.5).setOrigin(0, 0).setDepth(-9);
    this.add.rectangle(0, WATER_Y, WORLD_W, 8, 0xbfeaff, 0.6).setOrigin(0, 0).setDepth(-8);
    this.tweens.add({ targets: this.water, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1 });
  }

  buildBanks() {
    this.addBank(0, 620);
    this.addBank(3080, WORLD_W);
  }

  addBank(x0, x1) {
    const w = x1 - x0;
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(x0, GROUND_Y - grassOffset, w, displayH, 'ground').setOrigin(0, 0).setDepth(-7);
    ts.setTileScale(tScale, tScale);
    this.add.rectangle(x0, GROUND_Y - grassOffset + displayH, w, GAME_HEIGHT, 0x3a2a18).setOrigin(0, 0).setDepth(-7);
    const body = this.add.rectangle(x0 + w / 2, GROUND_Y + 40, w, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildStones() {
    // [x, y, width, bob?] — stepping stones/logs across the river.
    this.stoneDefs = [
      [780, GROUND_Y - 40, 150, false], [1050, GROUND_Y - 60, 140, true],
      [1330, GROUND_Y - 40, 150, false], [1600, GROUND_Y - 70, 140, true],
      [1880, GROUND_Y - 40, 150, false], [2160, GROUND_Y - 70, 140, true],
      [2440, GROUND_Y - 40, 150, false], [2740, GROUND_Y - 50, 160, false]
    ];
    this.stoneDefs.forEach(([x, y, w, bob]) => this.makeStone(x, y, w, bob));
  }

  makeStone(x, y, w, bob) {
    const key = this.textures.exists('ledge-small') ? 'ledge-small' : 'ledge';
    const img = this.add.image(x, y, key).setOrigin(0.5, 0).setDepth(-5).setTint(0x9fb0a0);
    img.setScale(w / img.width);
    const surfaceY = y + img.displayHeight * 0.15;
    const plank = this.add.rectangle(x, surfaceY, w * 0.9, 20);
    this.physics.add.existing(plank, true);
    plank.setVisible(false);
    this.solids.add(plank);
    if (bob) {
      this.tweens.add({ targets: [img], y: y + 16, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: () => { plank.y = img.y + img.displayHeight * 0.15; plank.body.updateFromGameObject(); } });
    }
  }

  buildCollectibles() {
    this.stoneDefs.forEach(([x, y]) => this.addPickup(x, y - 90, 'coins', 44, 'coin'));
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

  markSafe() {
    // Remember the last solid we stood on so a dunk resets us nearby, not to start.
    if (this.player.body.blocked.down) { this.safeX = this.player.x; this.safeY = this.player.y - 40; }
  }

  dunk() {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.invincibleUntil = this.time.now + 1000;
    this.health -= 1;
    this.hud.setHealth(this.health);
    this.floatText(this.player.x, this.player.y - 60, 'Splash! -1', '#8fd0ff');
    this.cameras.main.flash(160, 40, 120, 160);
    if (this.health <= 0) { this.loseLevel('Swept away!'); return; }
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.safeX, this.safeY - 120);
    this.player.alpha = 0.5;
    this.tweens.add({ targets: this.player, alpha: 1, duration: 400 });
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
    this.sign(360, GROUND_Y - 300, 'Cross the river —\nhop the stones, don’t fall in!');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '23px', color: '#ffffff', align: 'center', stroke: '#0e2a3a', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    this.coinsCollected += 1;
    this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#0e2a3a', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
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

    // In the water?
    if (this.player.y > WATER_Y + 60) this.dunk();
    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) this.winLevel();
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    enterFinishGate(this, () => this.showEndCard('Midway across…', 'Tap to continue', '#ffe9a8', false, 'RiverBossScene'));
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '48px', color, fontStyle: 'bold', stroke: '#0e2a3a', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#0e2a3a', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
