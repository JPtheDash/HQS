import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';

// SCENE 10 — HANUMAN GETS TIRED (Chapter 1 finale)
// The long journey wears him down: ENERGY drains steadily, and as it falls his
// movement and jump weaken. Food (banana / mango / coconut) restores it, so the
// lesson is to keep eating to keep going. Reach the end before he gives out.
const WORLD_W = 3400;
const GROUND_Y = GAME_HEIGHT - 150;
const BASE_SPEED = 340;
const BASE_JUMP = -1000;

export default class TiredScene extends Phaser.Scene {
  constructor() {
    super('TiredScene');
  }

  create() {
    ['banana', 'mango', 'coconut'].forEach((k) => stripBackground(this, k));

    this.finished = false;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.timeLeft = 120;
    this.lastTiredMsg = 0;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildGround();
    this.buildCollectibles();
    this.buildFinish(3240);

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

    playMusic(this, GAME_MUSIC, { volume: 0.4 });

    // Energy drains each second; movement/jump scale with what's left.
    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        if (this.finished) return;
        this.timeLeft -= 1;
        this.hud.setTime(this.timeLeft);
        this.energy = Phaser.Math.Clamp(this.energy - 0.045, 0, 1);
        this.hud.setEnergy(this.energy);
        if (this.timeLeft <= 0) this.loseLevel('Out of time!');
      }
    });
  }

  buildBackground() {
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
    sky.fillGradientStyle(0xf3b76b, 0xf3b76b, 0xf7d9a8, 0xd9b784, 1); // late-afternoon
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.circle(GAME_WIDTH * 0.28, 230, 80, 0xfff2cf, 0.9).setScrollFactor(0.1).setDepth(-99);
    this.drawHills(GROUND_Y + 40, 0x9a7f4a, 150, 320, 0.35, -90);
    this.drawHills(GROUND_Y + 90, 0x7a6236, 120, 210, 0.6, -80);
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
    // Ground with two jumpable gaps (harder to clear when tired/slow).
    this.addSpan(0, 1150);
    this.addSpan(1330, 2250);
    this.addSpan(2430, WORLD_W);
  }

  addSpan(x0, x1) {
    const w = x1 - x0;
    this.add.rectangle(x0, GROUND_Y, w, GAME_HEIGHT - GROUND_Y + 40, 0x5a3a1c).setOrigin(0, 0).setDepth(-11);
    this.add.rectangle(x0, GROUND_Y, w, 16, 0xc08a3a).setOrigin(0, 0).setDepth(-10);
    const body = this.add.rectangle(x0 + w / 2, GROUND_Y + 30, w, 60);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildCollectibles() {
    // Plenty of food, spaced so you must eat to keep energy up.
    [[500, 'banana', 'food'], [900, 'coins', 'coin'], [1500, 'mango', 'food'],
     [1900, 'coins', 'coin'], [2100, 'banana', 'food'], [2600, 'coconut', 'food'],
     [3000, 'mango', 'food']]
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
    this.add.circle(x, GROUND_Y - 120, 60, 0xffe9a8, 0.25).setDepth(-4);
    const herb = this.textures.exists('herb') ? this.add.image(x, GROUND_Y - 120, 'herb').setDepth(-3)
      : this.add.star(x, GROUND_Y - 120, 5, 16, 34, 0x6fe06f).setDepth(-3);
    if (herb.width) herb.setScale(100 / herb.width);
    this.tweens.add({ targets: herb, y: herb.y - 14, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.finishZone = new Phaser.Geom.Rectangle(x - 50, GROUND_Y - 200, 100, 200);
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
    this.sign(360, GROUND_Y - 300, 'The long road tires him…\nEat food to keep going');
    this.sign(2600, GROUND_Y - 300, 'Almost there —\nreach the herb!');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff', align: 'center', stroke: '#2a1500', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    if (pickup.kind === 'coin') {
      this.coinsCollected += 1;
      this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    } else {
      this.energy = Phaser.Math.Clamp(this.energy + 0.3, 0, 1);
      this.hud.setEnergy(this.energy);
      this.floatText(pickup.x, pickup.y, 'Yum! +ENERGY', '#9cff9c');
      return;
    }
    this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  banner(msg) {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, msg, { fontFamily: 'Georgia, serif', fontSize: '34px', color: '#ffd0d0', fontStyle: 'bold', align: 'center', stroke: '#2a1500', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(1500).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 300, yoyo: true, hold: 1200, onComplete: () => t.destroy() });
  }

  update() {
    if (this.finished || !this.player.alive) return;

    // Tiredness scales movement + jump with remaining energy.
    const factor = 0.4 + 0.6 * this.energy;
    this.player.speed = BASE_SPEED * factor;
    this.player.jumpVelocity = BASE_JUMP * (0.7 + 0.3 * this.energy);
    this.player.setAlpha(this.energy < 0.3 ? 0.8 : 1);

    const left = this.ctrl.left || this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.ctrl.right || this.cursors.right.isDown || this.keys.D.isDown;
    if (left && !right) this.player.moveLeft();
    else if (right && !left) this.player.moveRight();
    else this.player.stopMoving();

    // "Hanuman is tired" reminder when energy is low.
    if (this.energy < 0.3 && this.time.now - this.lastTiredMsg > 4000) {
      this.lastTiredMsg = this.time.now;
      this.banner('Hanuman is tired.\nFind food to restore energy!');
    }

    if (this.player.y > GAME_HEIGHT + 100) fallRespawn(this);
    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) this.winLevel();
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    this.showEndCard('Chapter 1 Complete!', 'Tap to return', '#ffe9a8', false, 'HomeScene');
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '50px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
