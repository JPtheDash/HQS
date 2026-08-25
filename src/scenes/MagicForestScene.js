import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';

// SCENES 15–16 — LANDING / MAGICAL FOREST (Chapter 4→5 breather)
// After the storm Hanuman sets down in an enchanted grove. Two resource systems
// meet here: FOOD restores ENERGY, and HERBS restore HEALTH. Fireflies, glowing
// plants and golden motes set the mood over the bgmagic backdrop.
const WORLD_W = 3200;
const GROUND_Y = GAME_HEIGHT - 150;

export default class MagicForestScene extends Phaser.Scene {
  constructor() {
    super('MagicForestScene');
  }

  create() {
    ['ground', 'banana', 'mango', 'coconut', 'herb'].forEach((k) => stripBackground(this, k));

    this.finished = false;
    this.health = 2;      // arrives a little battered from the storm
    this.energy = 0.5;
    this.coinsCollected = 0;
    this.timeLeft = 140;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(600, 0, 0, 0);

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
    this.hud.setHealth(this.health);
    this.hud.setEnergy(this.energy);
    this.hud.setTime(this.timeLeft);
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.32 });

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
    const key = this.textures.exists('bgmagic') ? 'bgmagic' : 'bg2';
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get(key).getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    // A gentle teal magical wash.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1b3a4a, 0.12).setOrigin(0, 0).setScrollFactor(0).setDepth(-98);
  }

  buildGround() {
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(0, GROUND_Y - grassOffset, WORLD_W, displayH, 'ground').setOrigin(0, 0).setDepth(-10);
    ts.setTileScale(tScale, tScale);
    ts.setTint(0x9fc0b0); // cool magical tint
    this.add.rectangle(0, GROUND_Y - grassOffset + displayH, WORLD_W, GAME_HEIGHT, 0x1e2a24).setOrigin(0, 0).setDepth(-11);
    const body = this.add.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildPlatforms() {
    [[720, GROUND_Y - 250, 230], [1180, GROUND_Y - 350, 210],
     [1680, GROUND_Y - 280, 230], [2180, GROUND_Y - 360, 210], [2600, GROUND_Y - 260, 230]]
      .forEach(([x, y, w]) => this.makePlatform(x, y, w));
  }

  makePlatform(x, y, w) {
    const key = this.textures.exists('ledge-small') ? 'ledge-small' : 'ledge';
    const img = this.add.image(x, y, key).setOrigin(0.5, 0).setDepth(-5).setTint(0xbfe0d0);
    img.setScale(w / img.width);
    const surfaceY = y + img.displayHeight * 0.15;
    const plank = this.add.rectangle(x, surfaceY, w * 0.9, 22);
    this.physics.add.existing(plank, true);
    plank.setVisible(false);
    this.solids.add(plank);
  }

  buildCollectibles() {
    // Herbs (health) on platforms + ground; food (energy) scattered; coins.
    const herbs = [[720, GROUND_Y - 300], [1680, GROUND_Y - 330], [2600, GROUND_Y - 310], [1180, GROUND_Y - 400]];
    herbs.forEach(([x, y]) => this.addPickup(x, y, 'herb', 80, 'herb'));
    const food = [[460, 'banana'], [980, 'mango'], [1450, 'coconut'], [2000, 'banana'], [2380, 'mango']];
    food.forEach(([x, key]) => this.addPickup(x, GROUND_Y - 90, key, 64, 'food'));
    [[1350, 190], [2250, 210]].forEach(([cx, h]) => { for (let i = -1; i <= 1; i++) this.addPickup(cx + i * 78, GROUND_Y - h, 'coins', 44, 'coin'); });
  }

  addPickup(x, y, key, size, kind) {
    const p = this.pickups.create(x, y, key);
    p.setScale(size / p.width);
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = kind;
    p.fruit = kind === 'food' ? key : null;
    p.setDepth(-3);
    if (kind === 'herb') this.add.circle(x, y, 30, 0x8affc0, 0.22).setDepth(-4); // glow
    this.tweens.add({ targets: p, y: y - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  buildFinish(x) {
    this.add.circle(x, GROUND_Y - 120, 64, 0xbfffe0, 0.3).setDepth(-4);
    const g = this.add.star(x, GROUND_Y - 120, 6, 18, 40, 0xdfffe0).setDepth(-3);
    this.tweens.add({ targets: g, angle: 360, duration: 7000, repeat: -1 });
    this.finishZone = new Phaser.Geom.Rectangle(x - 50, GROUND_Y - 200, 100, 200);
  }

  buildAmbience() {
    // Fireflies + drifting golden motes.
    for (let i = 0; i < 16; i++) {
      const x = Phaser.Math.Between(150, WORLD_W - 150);
      const y = Phaser.Math.Between(GROUND_Y - 520, GROUND_Y - 60);
      const c = Phaser.Math.RND.pick([0x9affc0, 0xffe28a, 0x8ad0ff]);
      const f = this.add.circle(x, y, Phaser.Math.Between(3, 6), c, 0.9).setDepth(-2);
      this.tweens.add({ targets: f, alpha: 0.2, duration: Phaser.Math.Between(700, 1600), yoyo: true, repeat: -1 });
      this.tweens.add({ targets: f, x: x + Phaser.Math.Between(-90, 90), y: y + Phaser.Math.Between(-50, 50), duration: Phaser.Math.Between(2600, 4600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    this.sign(360, GROUND_Y - 300, 'A magical grove.\nHerbs restore HEALTH,\nfruit restores ENERGY');
    this.sign(2750, GROUND_Y - 300, 'Restored? Reach the\nlight to continue');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '23px', color: '#ffffff', align: 'center', stroke: '#0e2a24', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    if (pickup.kind === 'coin') {
      this.coinsCollected += 1;
      this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
      this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
    } else if (pickup.kind === 'herb') {
      this.health = Math.min(this.health + 1, 3);
      this.hud.setHealth(this.health);
      this.floatText(pickup.x, pickup.y, 'Herb! +1 ❤', '#9affc0');
    } else {
      this.energy = Phaser.Math.Clamp(this.energy + 0.25, 0, 1);
      this.hud.setEnergy(this.energy);
      this.floatText(pickup.x, pickup.y, '+energy', '#ffe28a');
    }
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '26px', color, fontStyle: 'bold', stroke: '#0e2a24', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
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
    // TODO: chain to Scene 17-18 (Rakshasa) once built.
    this.showEndCard('Rested in the grove', 'Tap to continue', '#bfffe0', false, 'HomeScene');
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '46px', color, fontStyle: 'bold', stroke: '#0e2a24', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#0e2a24', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
