import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';
import { fallRespawn } from '../utils/respawn.js';
import { addFinishGate, enterFinishGate } from '../utils/finishGate.js';

// SCENE 8 — TREE JUMPING (Chapter 1, part 2)
// Hanuman climbs through the forest canopy on branch platforms — some of them
// drifting side to side — to reach the high path out. This is where DOUBLE JUMP
// is introduced ("Tap again in the air!"): the branches are spaced so a single
// jump won't always reach, teaching the second tap.
const WORLD_W = 3000;
const GROUND_Y = GAME_HEIGHT - 150;

export default class TreeScene extends Phaser.Scene {
  constructor() {
    super('TreeScene');
  }

  create() {
    // Fruit pickups ship with opaque backgrounds — strip them (no-op if a
    // previous scene already cleaned them this session).
    // 'ledge' has real alpha already — stripping erases its dirt underside, so
    // it's excluded (see GameScene note).
    ['ground', 'banana', 'mango', 'coconut'].forEach((k) => stripBackground(this, k));

    this.finished = false;
    this.invincibleUntil = 0;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.timeLeft = 100;
    this.movers = [];
    this.doubleHintShown = false;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildFloor();
    this.buildBranches();
    this.buildVines();
    this.buildCollectibles();
    this.buildFinish(2820, GROUND_Y - 470);

    // Player — double jump unlocked for this chapter.
    this.player = new Player(this, 120, GROUND_Y - 220);
    this.spawnX = 120; this.spawnY = GROUND_Y - 220;
    this.player.enableDoubleJump();
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-60, 40);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.hud.setTime(this.timeLeft);
    this.buildControls();
    this.buildSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.4 });

    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.finished) return;
        this.timeLeft -= 1;
        this.hud.setTime(this.timeLeft);
        if (this.timeLeft <= 0) this.loseLevel('Out of time!');
      }
    });
  }

  // --- Forest backdrop (procedural) --------------------------------------
  buildBackground() {
    // The temple-garden painting (bg2) fills the portrait viewport and scrolls
    // slowly as a parallax layer.
    const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg2')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
    const tex = this.textures.get('bg2').getSourceImage();
    bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
    this.bg = bg;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xf7fbe8, 0.12)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-98);
  }

  // --- Ground floor at the start -----------------------------------------
  buildFloor() {
    const w = 620;
    const texH = this.textures.get('ground').getSourceImage().height;
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55;
    const ts = this.add.tileSprite(0, GROUND_Y - grassOffset, w, displayH, 'ground')
      .setOrigin(0, 0).setDepth(-8);
    ts.setTileScale(tScale, tScale);
    this.add.rectangle(0, GROUND_Y - grassOffset + displayH, w, GAME_HEIGHT, 0x3a2a18)
      .setOrigin(0, 0).setDepth(-9);
    const body = this.add.rectangle(w / 2, GROUND_Y + 40, w, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  // --- Branch platforms (some moving) ------------------------------------
  buildBranches() {
    // [x, y, width, moveRange] — moveRange > 0 makes it drift horizontally.
    const layout = [
      [780, GROUND_Y - 150, 200, 0],
      [1080, GROUND_Y - 300, 190, 150],
      [1420, GROUND_Y - 250, 200, 0],
      [1720, GROUND_Y - 410, 190, 160],
      [2080, GROUND_Y - 350, 200, 0],
      [2380, GROUND_Y - 500, 190, 150],
      [2760, GROUND_Y - 430, 260, 0]
    ];
    layout.forEach(([x, y, w, range]) => this.makeBranch(x, y, w, range));
  }

  makeBranch(x, y, w, range) {
    // A floating grass-island platform (platform-ledge.png). The cropped art has
    // its grass surface at the very top, so anchor origin (0.5, 0) at y and put
    // the collision strip just inside the grass.
    const img = this.add.image(x, y, 'ledge-small').setOrigin(0.5, 0).setDepth(-5);
    img.setScale(w / img.width);
    const surfaceY = y + img.displayHeight * 0.15;
    const plank = this.add.rectangle(x, surfaceY, w * 0.9, 22);
    this.physics.add.existing(plank, true);
    plank.setVisible(false);
    this.solids.add(plank);

    if (range > 0) {
      // Drift the visual; the static body is re-synced each frame in update().
      this.tweens.add({
        targets: img,
        x: `+=${range}`,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.movers.push({ img, plank, prevX: img.x });
    }
  }

  // --- Climbable vines ---------------------------------------------------
  // Hanging vines between the branches. Overlap one and hold ▲ to climb it.
  buildVines() {
    this.vines = [];
    // [x, topY, bottomY]
    const defs = [
      [470, GROUND_Y - 340, GROUND_Y - 10],
      [1270, GROUND_Y - 470, GROUND_Y - 150],
      [1920, GROUND_Y - 560, GROUND_Y - 240],
      [2560, GROUND_Y - 640, GROUND_Y - 340]
    ];
    defs.forEach(([x, topY, botY]) => {
      this.drawVine(x, topY, botY);
      this.vines.push({ x, topY, bottomY: botY, grabW: 46 });
    });
  }

  drawVine(x, topY, botY) {
    const g = this.add.graphics().setDepth(-6);
    const wob = (y) => Math.sin(y / 42) * 11;
    // Anchor knot at the top.
    g.fillStyle(0x3a5f24, 1); g.fillCircle(x + wob(topY), topY, 9);
    // Rope.
    g.lineStyle(11, 0x3c6e2a, 1); g.beginPath();
    for (let y = topY; y <= botY; y += 6) (y === topY ? g.moveTo(x + wob(y), y) : g.lineTo(x + wob(y), y));
    g.strokePath();
    g.lineStyle(4, 0x6bb345, 0.9); g.beginPath();
    for (let y = topY; y <= botY; y += 6) (y === topY ? g.moveTo(x + wob(y) - 2, y) : g.lineTo(x + wob(y) - 2, y));
    g.strokePath();
    // Leaves.
    g.fillStyle(0x4c8a30, 1);
    for (let y = topY + 34; y < botY; y += 58) {
      g.fillEllipse(x + wob(y) + 16, y, 30, 13);
      g.fillEllipse(x + wob(y) - 16, y + 22, 30, 13);
    }
  }

  // --- Collectibles ------------------------------------------------------
  buildCollectibles() {
    const spots = [
      [780, GROUND_Y - 220, 'coins', 46, 'coin'],
      [1080, GROUND_Y - 380, 'banana', 66, 'food'],
      [1420, GROUND_Y - 320, 'coins', 46, 'coin'],
      [1720, GROUND_Y - 490, 'coins', 46, 'coin'],
      [2080, GROUND_Y - 420, 'mango', 62, 'food'],
      [2380, GROUND_Y - 580, 'coins', 46, 'coin'],
      [400, GROUND_Y - 90, 'coins', 46, 'coin']
    ];
    spots.forEach(([x, y, key, size, kind]) => this.addPickup(x, y, key, size, kind));
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
    addFinishGate(this, x, y + 40, { bottomOrigin: false, height: 300 });
    // A glowing herb marker to reach.
    this.add.circle(x, y, 46, 0xffe9a8, 0.25).setDepth(-4);
    const herb = this.textures.exists('herb')
      ? this.add.image(x, y, 'herb').setDepth(-3)
      : this.add.star(x, y, 5, 14, 30, 0x6fe06f).setDepth(-3);
    if (herb.width) herb.setScale(90 / herb.width);
    this.tweens.add({ targets: herb, y: y - 14, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: herb, angle: 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.finishZone = new Phaser.Geom.Rectangle(x - 50, y - 70, 100, 150);
  }

  // --- Controls (buttons + keyboard, tap=jump / hold=fly) ----------------
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

    const jumpDown = () => { this.player.tryJump(); this.player.setWantFly(true); };
    const jumpUp = () => this.player.setWantFly(false);
    this.jumpBtn.on('pointerdown', jumpDown);
    this.jumpBtn.on('pointerup', jumpUp);
    this.jumpBtn.on('pointerout', jumpUp);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE');
    ['keydown-SPACE', 'keydown-UP', 'keydown-W'].forEach((e) =>
      this.input.keyboard.on(e, (ev) => { if (!ev.repeat) jumpDown(); }));
    ['keyup-SPACE', 'keyup-UP', 'keyup-W'].forEach((e) =>
      this.input.keyboard.on(e, jumpUp));
  }

  makeButton(x, y, label, radius = 62) {
    const circle = this.add.circle(x, y, radius, 0x000000, 0.35).setScrollFactor(0).setDepth(1001).setStrokeStyle(3, 0xffe9a8, 0.7);
    circle.setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { fontFamily: 'Arial', fontSize: `${radius}px`, color: '#ffe9a8' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(1002);
    circle.on('pointerdown', () => circle.setFillStyle(0xffe9a8, 0.35));
    circle.on('pointerup', () => circle.setFillStyle(0x000000, 0.35));
    circle.on('pointerout', () => circle.setFillStyle(0x000000, 0.35));
    return circle;
  }

  buildSigns() {
    this.sign(300, GROUND_Y - 260, 'Grab a vine &\nHOLD ▲ to climb!');
    this.sign(1080, GROUND_Y - 470, 'Some branches move —\ntime your jump');
    this.sign(2760, GROUND_Y - 560, 'Reach the herb');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff', align: 'center',
      stroke: '#2a1500', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    if (pickup.kind === 'coin') {
      this.coinsCollected += 1;
      this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    } else {
      this.energy = Phaser.Math.Clamp(this.energy + 0.2, 0, 1);
      this.hud.setEnergy(this.energy);
    }
    this.floatText(pickup.x, pickup.y, pickup.kind === 'coin' ? '+1' : '+ENERGY', '#ffe9a8');
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  // Big centred popup for the double-jump lesson.
  popup(msg) {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.32, msg, {
      fontFamily: 'Georgia, serif', fontSize: '40px', color: '#ffe9a8', fontStyle: 'bold',
      align: 'center', stroke: '#2a1500', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1500).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 250, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
  }

  update(time, delta) {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.25 / this.bg.tileScaleX;

    if (this.finished || !this.player.alive) return;

    // Re-sync moving branch bodies to their drifting visuals, and carry a rider.
    for (const m of this.movers) {
      m.plank.x = m.img.x;
      m.plank.body.updateFromGameObject();
      const dx = m.img.x - m.prevX;
      if (dx !== 0 && this.isRiding(m.plank)) this.player.x += dx;
      m.prevX = m.img.x;
    }

    // Grab a vine when overlapping its vertical column.
    let onVine = false;
    if (this.vines) {
      const p = this.player;
      for (const v of this.vines) {
        if (Math.abs(p.x - v.x) < v.grabW && p.y > v.topY - 24 && p.y < v.bottomY + 30) { onVine = true; break; }
      }
    }
    this.player.onVine = onVine;

    const left = this.ctrl.left || this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.ctrl.right || this.cursors.right.isDown || this.keys.D.isDown;
    if (left && !right) this.player.moveLeft();
    else if (right && !left) this.player.moveRight();
    else this.player.stopMoving();

    // Teach double jump the first time Hanuman is airborne from a jump.
    if (!this.doubleHintShown && !this.player.body.blocked.down && this.player.jumpsUsed === 1) {
      this.doubleHintShown = true;
      this.popup('Tap again in the air\nto DOUBLE JUMP!');
    }

    if (this.player.y > GAME_HEIGHT + 100) fallRespawn(this);

    if (this.finishZone && Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone)) {
      this.winLevel();
    }
  }

  isRiding(plank) {
    const pb = this.player.body;
    return pb.blocked.down &&
      Math.abs(pb.bottom - plank.body.top) < 10 &&
      pb.right > plank.body.left && pb.left < plank.body.right;
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    enterFinishGate(this, () => this.showEndCard('Canopy cleared!', 'Tap to continue', '#ffe9a8', false, 'DangerScene'));
  }

  loseLevel(reason) {
    if (this.finished) return;
    this.finished = true;
    this.player.alive = false;
    this.player.stopMoving();
    this.showEndCard(reason, 'Tap to try again', '#ff8c8c', true);
  }

  showEndCard(title, subtitle, color, retry = false, nextScene = 'HomeScene') {
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setScrollFactor(0).setDepth(2000).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 400 });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, {
      fontFamily: 'Georgia, serif', fontSize: '54px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#2a1500', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    this.tweens.add({ targets: t2, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    const go = () => {
      if (this._advancing) return;
      this._advancing = true;
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.time.delayedCall(380, () => {
        if (retry) this.scene.restart();
        else this.scene.start(nextScene);
      });
    };
    this.input.once('pointerdown', go);
    this.input.keyboard.once('keydown', go);
  }
}
