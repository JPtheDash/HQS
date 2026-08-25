import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';

// SCENE 11 — FRUIT FOREST (Chapter 2, rest area)
// After the danger, a calm breather: no hazards, just a lush grove full of fruit.
// Different fruits restore different amounts of ENERGY (banana < mango < coconut),
// so exploring the branch platforms is worthwhile. Reach the far herb topped up.
// NOTE: backdrop uses bg2 as a placeholder until bg-fruitforest.png is added
// (load it as 'bgfruit' in PreloadScene and it will be picked up automatically).
const WORLD_W = 3200;
const GROUND_Y = GAME_HEIGHT - 150;
const FRUIT_ENERGY = { banana: 0.15, mango: 0.22, coconut: 0.30 };

export default class FruitForestScene extends Phaser.Scene {
  constructor() {
    super('FruitForestScene');
  }

  create() {
    ['ground', 'banana', 'mango', 'coconut'].forEach((k) => stripBackground(this, k));

    this.finished = false;
    this.health = 3;
    this.energy = 0.3;      // arrives tired
    this.coinsCollected = 0;
    this.timeLeft = 140;    // relaxed

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildGround();
    this.buildPlatforms();
    this.buildCollectibles();
    this.buildFinish(3040);
    this.buildAmbience();

    this.player = new Player(this, 120, GROUND_Y - 220);
    this.spawnX = 120; this.spawnY = GROUND_Y - 220;
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-80, 60);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setTime(this.timeLeft);
    this.hud.setEnergy(this.energy);
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.35 });

    // Gentle countdown only (no energy drain — this is the rest area).
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
    const key = this.textures.exists('bgfruit') ? 'bgfruit' : 'bg2';
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get(key).getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xf7fbe8, 0.12)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-98);
  }

  buildGround() {
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(0, GROUND_Y - grassOffset, WORLD_W, displayH, 'ground')
      .setOrigin(0, 0).setDepth(-10);
    ts.setTileScale(tScale, tScale);
    this.add.rectangle(0, GROUND_Y - grassOffset + displayH, WORLD_W, GAME_HEIGHT, 0x3a2a18)
      .setOrigin(0, 0).setDepth(-11);
    const body = this.add.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildPlatforms() {
    // Branch platforms (compact island art) carrying fruit up high.
    [[700, GROUND_Y - 250, 240], [1150, GROUND_Y - 360, 220],
     [1600, GROUND_Y - 280, 240], [2100, GROUND_Y - 380, 220],
     [2550, GROUND_Y - 300, 240]]
      .forEach(([x, y, w]) => this.makePlatform(x, y, w));
  }

  makePlatform(x, y, w) {
    const key = this.textures.exists('ledge-small') ? 'ledge-small' : 'ledge';
    const img = this.add.image(x, y, key).setOrigin(0.5, 0).setDepth(-5);
    img.setScale(w / img.width);
    const surfaceY = y + img.displayHeight * 0.15;
    const plank = this.add.rectangle(x, surfaceY, w * 0.9, 22);
    this.physics.add.existing(plank, true);
    plank.setVisible(false);
    this.solids.add(plank);
    return { img, surfaceY };
  }

  buildCollectibles() {
    // Ground-level fruit + coins.
    const ground = [
      [460, 'banana'], [820, 'mango'], [1350, 'coconut'], [1850, 'banana'],
      [2300, 'mango'], [2750, 'coconut']
    ];
    ground.forEach(([x, key]) => this.addPickup(x, GROUND_Y - 90, key, 66, 'food'));
    // Fruit rewards on top of the branch platforms.
    const onBranch = [
      [700, GROUND_Y - 300, 'mango'], [1150, GROUND_Y - 410, 'coconut'],
      [1600, GROUND_Y - 330, 'banana'], [2100, GROUND_Y - 430, 'coconut'],
      [2550, GROUND_Y - 350, 'mango']
    ];
    onBranch.forEach(([x, y, key]) => this.addPickup(x, y, key, 64, 'food'));
    // A few coin arcs to keep it rewarding.
    [[980, 200], [1780, 220], [2450, 210]].forEach(([cx, h]) => {
      for (let i = -1; i <= 1; i++) this.addPickup(cx + i * 80, GROUND_Y - h - Math.abs(i) * -30, 'coins', 44, 'coin');
    });
  }

  addPickup(x, y, key, size, kind) {
    const p = this.pickups.create(x, y, key);
    p.setScale(size / p.width);
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = kind;
    p.fruit = kind === 'food' ? key : null;
    p.setDepth(-3);
    this.tweens.add({ targets: p, y: y - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  buildFinish(x) {
    this.add.circle(x, GROUND_Y - 120, 60, 0xffe9a8, 0.25).setDepth(-4);
    const herb = this.textures.exists('herb') ? this.add.image(x, GROUND_Y - 120, 'herb').setDepth(-3)
      : this.add.star(x, GROUND_Y - 120, 5, 16, 34, 0x6fe06f).setDepth(-3);
    if (herb.width) herb.setScale(100 / herb.width);
    this.tweens.add({ targets: herb, y: herb.y - 14, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.finishZone = new Phaser.Geom.Rectangle(x - 50, GROUND_Y - 200, 100, 200);
  }

  buildAmbience() {
    // Drifting butterflies for a calm mood (purely cosmetic).
    const colors = [0xffd23b, 0xff8ab0, 0x8ad0ff, 0xffffff];
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(200, WORLD_W - 200);
      const y = Phaser.Math.Between(GROUND_Y - 520, GROUND_Y - 120);
      const b = this.add.circle(x, y, Phaser.Math.Between(4, 7), Phaser.Utils.Array.GetRandom(colors), 0.9).setDepth(-2);
      this.tweens.add({ targets: b, x: x + Phaser.Math.Between(-120, 120), y: y + Phaser.Math.Between(-60, 60), duration: Phaser.Math.Between(2200, 4200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    this.sign(360, GROUND_Y - 300, 'A peaceful grove.\nEat fruit to restore energy!');
    this.sign(1150, GROUND_Y - 470, 'Fruit high in the trees\ngives more energy');
    this.sign(2750, GROUND_Y - 300, 'Rested? Reach the herb\nto continue');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff', align: 'center', stroke: '#1a3a12', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    if (pickup.kind === 'coin') {
      this.coinsCollected += 1;
      this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
      this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
      return;
    }
    const gain = FRUIT_ENERGY[pickup.fruit] || 0.2;
    this.energy = Phaser.Math.Clamp(this.energy + gain, 0, 1);
    this.hud.setEnergy(this.energy);
    this.floatText(pickup.x, pickup.y, `+${Math.round(gain * 100)} energy`, '#9cff9c');
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#1a3a12', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
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

    if (this.player.y > GAME_HEIGHT + 100) fallRespawn(this);
    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) this.winLevel();
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    this.showEndCard('Rested & ready!', 'Tap to fly', '#ffe9a8', false, 'SkyScene');
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '50px', color, fontStyle: 'bold', stroke: '#1a3a12', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#1a3a12', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
