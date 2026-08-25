import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';

// SCENES 26–29 — DRONAGIRI / SANJEEVINI SEARCH / LIFT THE MOUNTAIN (Chapter 8-9)
// The sacred glowing peak. Explore its ledges and gather the THREE Sanjeevini
// clues (glowing herbs). Unable to tell the true herb apart, Hanuman lifts the
// entire mountain — a big cinematic beat — then the return begins.
const WORLD_W = 3600;
const GROUND_Y = GAME_HEIGHT - 150;

export default class DronagiriScene extends Phaser.Scene {
  constructor() {
    super('DronagiriScene');
  }

  create() {
    ['ground', 'herb'].forEach((k) => stripBackground(this, k));

    this.finished = false;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.clues = 0;
    this.totalClues = 3;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(700, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildGround();
    this.buildLedges();
    this.buildHerbs();
    this.buildCoins();
    this.buildAmbience();

    this.player = new Player(this, 120, GROUND_Y - 220);
    this.spawnX = 120; this.spawnY = GROUND_Y - 220;
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-80, 60);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setEnergy(this.energy);
    this.buildClueUI();
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.4 });
  }

  buildBackground() {
    const key = this.textures.exists('bgdronagiri') ? 'bgdronagiri' : 'bg1';
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get(key).getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a2a4a, 0.12).setOrigin(0, 0).setScrollFactor(0).setDepth(-98);
  }

  buildGround() {
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(0, GROUND_Y - grassOffset, WORLD_W, displayH, 'ground').setOrigin(0, 0).setDepth(-10);
    ts.setTileScale(tScale, tScale);
    ts.setTint(0xcfe0e6);
    this.add.rectangle(0, GROUND_Y - grassOffset + displayH, WORLD_W, GAME_HEIGHT, 0x2a3a52).setOrigin(0, 0).setDepth(-11);
    const body = this.add.rectangle(WORLD_W / 2, GROUND_Y + 40, WORLD_W, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildLedges() {
    [[650, GROUND_Y - 240, 200], [1050, GROUND_Y - 360, 180], [1450, GROUND_Y - 280, 200],
     [1900, GROUND_Y - 380, 180], [2350, GROUND_Y - 300, 200], [2800, GROUND_Y - 400, 180]]
      .forEach(([x, y, w]) => this.makeLedge(x, y, w));
  }

  makeLedge(x, y, w) {
    const key = this.textures.exists('ledge-small') ? 'ledge-small' : 'ledge';
    const img = this.add.image(x, y, key).setOrigin(0.5, 0).setDepth(-5).setTint(0xdfeaf0);
    img.setScale(w / img.width);
    const surfaceY = y + img.displayHeight * 0.15;
    const plank = this.add.rectangle(x, surfaceY, w * 0.9, 20);
    this.physics.add.existing(plank, true);
    plank.setVisible(false);
    this.solids.add(plank);
  }

  buildHerbs() {
    // Several herbs — three of them are the true Sanjeevini clues (glow gold).
    const spots = [
      [650, GROUND_Y - 300, true], [1050, GROUND_Y - 420, false], [1450, GROUND_Y - 340, true],
      [1900, GROUND_Y - 440, false], [2350, GROUND_Y - 360, true], [2800, GROUND_Y - 460, false]
    ];
    spots.forEach(([x, y, clue]) => this.addHerb(x, y, clue));
  }

  addHerb(x, y, clue) {
    const glow = this.add.circle(x, y, 34, clue ? 0xffe07a : 0x8affc0, 0.28).setDepth(-4);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.12, duration: 1100, yoyo: true, repeat: -1 });
    const p = this.pickups.create(x, y, this.textures.exists('herb') ? 'herb' : 'coins');
    p.setScale(84 / p.width);
    if (clue) p.setTint(0xfff0b0);
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = clue ? 'clue' : 'herb';
    p.setDepth(-3);
    this.tweens.add({ targets: p, y: y - 12, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  buildCoins() {
    for (let x = 400; x < 3200; x += 360) for (let i = -1; i <= 1; i++) this.addCoin(x + i * 70, GROUND_Y - 120 - Math.abs(i) * -20);
  }

  addCoin(x, y) {
    const p = this.pickups.create(x, y, 'coins');
    p.setScale(44 / p.width);
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = 'coin';
    p.setDepth(-3);
    this.tweens.add({ targets: p, y: y - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  buildAmbience() {
    for (let i = 0; i < 30; i++) {
      const f = this.add.circle(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), Phaser.Math.Between(1, 3), 0xffffff, 0.9).setScrollFactor(0.3).setDepth(-90);
      this.tweens.add({ targets: f, alpha: 0.2, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1 });
    }
  }

  buildClueUI() {
    this.clueText = this.add.text(GAME_WIDTH / 2, 40, 'Sanjeevini clues  0 / 3', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffe07a', fontStyle: 'bold', stroke: '#1a2a4a', strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0).setDepth(1200);
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
    this.sign(360, GROUND_Y - 300, 'Dronagiri at last.\nFind the 3 glowing Sanjeevini herbs');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '23px', color: '#ffffff', align: 'center', stroke: '#1a2a4a', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    const kind = pickup.kind;
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.4, duration: 380, onComplete: () => pickup.destroy() });
    if (kind === 'coin') {
      this.coinsCollected += 1;
      this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
      this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
    } else if (kind === 'clue') {
      this.clues += 1;
      this.clueText.setText(`Sanjeevini clues  ${this.clues} / ${this.totalClues}`);
      this.floatText(pickup.x, pickup.y, 'Sanjeevini clue!', '#ffe07a');
      this.cameras.main.flash(160, 255, 230, 150);
      if (this.clues >= this.totalClues) this.time.delayedCall(600, () => this.liftMountain());
    } else {
      this.floatText(pickup.x, pickup.y, '…not the one', '#bfffe0');
    }
  }

  liftMountain() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    this.player.setVelocity(0, 0);
    // Cinematic beat: message, golden surge, the whole view rises.
    this.banner('The true herb cannot be told apart…\nHanuman lifts the entire mountain!');
    const surge = this.add.circle(this.player.x, this.player.y, 20, 0xffe07a, 0.6).setDepth(20);
    this.tweens.add({ targets: surge, scale: 40, alpha: 0, duration: 1400 });
    this.cameras.main.shake(1400, 0.006);
    // Rise: scroll the camera / world downward feel by moving everything down.
    this.time.delayedCall(1600, () => {
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.time.delayedCall(750, () => this.scene.start('ReturnScene'));
    });
  }

  banner(msg) {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.32, msg, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe07a', fontStyle: 'bold', align: 'center', stroke: '#1a2a4a', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(1500).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 400, yoyo: true, hold: 1800, onComplete: () => t.destroy() });
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '26px', color, fontStyle: 'bold', stroke: '#1a2a4a', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 800, onComplete: () => t.destroy() });
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
  }

  loseLevel(reason) {
    if (this.finished) return;
    this.finished = true;
    this.player.alive = false;
    this.player.stopMoving();
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setScrollFactor(0).setDepth(2000).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 400 });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, reason + '\nTap to try again', { fontFamily: 'Georgia, serif', fontSize: '34px', color: '#ff8c8c', align: 'center', stroke: '#1a2a4a', strokeThickness: 5 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    this.input.once('pointerdown', () => this.scene.restart());
  }
}
