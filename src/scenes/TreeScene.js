import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';

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
    ['banana', 'mango', 'coconut'].forEach((k) => stripBackground(this, k));

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
    this.buildCollectibles();
    this.buildFinish(2820, GROUND_Y - 470);

    // Player — double jump unlocked for this chapter.
    this.player = new Player(this, 120, GROUND_Y - 220);
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
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
    sky.fillGradientStyle(0x9fd8e8, 0x9fd8e8, 0xcfeecb, 0xa9d98a, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.add.circle(GAME_WIDTH * 0.7, 200, 70, 0xffffff, 0.7).setScrollFactor(0.1).setDepth(-99);

    // Distant tree trunks + canopy bands for depth.
    this.drawForest(0x8bc17a, 0.3, -92, 120);
    this.drawForest(0x5f9e50, 0.55, -85, 90);
  }

  drawForest(color, scrollFactor, depth, trunkH) {
    const g = this.add.graphics().setScrollFactor(scrollFactor).setDepth(depth);
    const span = WORLD_W + GAME_WIDTH;
    for (let x = 0; x <= span; x += 220) {
      g.fillStyle(0x6b4a2a, 0.5);
      g.fillRect(x, GROUND_Y - trunkH, 34, trunkH + 200);
      g.fillStyle(color, 1);
      g.fillCircle(x + 17, GROUND_Y - trunkH, 120);
      g.fillCircle(x + 90, GROUND_Y - trunkH + 30, 90);
    }
  }

  // --- Ground floor at the start -----------------------------------------
  buildFloor() {
    const w = 620;
    this.add.rectangle(0, GROUND_Y, w, GAME_HEIGHT - GROUND_Y + 40, 0x4a7a34).setOrigin(0, 0).setDepth(-10);
    this.add.rectangle(0, GROUND_Y, w, 16, 0x6fae4c).setOrigin(0, 0).setDepth(-9);
    const body = this.add.rectangle(w / 2, GROUND_Y + 30, w, 60);
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
    const h = 30;
    const leaf = this.add.ellipse(x, y - 6, w * 1.15, 54, 0x4f9a3f).setDepth(-6);
    const limb = this.add.rectangle(x, y, w, h, 0x7a4a24).setStrokeStyle(3, 0x5a3418).setDepth(-5);
    const plank = this.add.rectangle(x, y - h / 2 + 6, w * 0.94, 20);
    this.physics.add.existing(plank, true);
    plank.setVisible(false);
    this.solids.add(plank);

    if (range > 0) {
      const mover = { limb, leaf, plank, baseX: x };
      // Drift the visuals; the static body is re-synced each frame in update().
      this.tweens.add({
        targets: [limb, leaf],
        x: `+=${range}`,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      mover.prevX = limb.x;
      this.movers.push(mover);
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
    this.sign(340, GROUND_Y - 260, 'Climb the branches!');
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
    if (this.finished || !this.player.alive) return;

    // Re-sync moving branch bodies to their drifting visuals, and carry a rider.
    for (const m of this.movers) {
      m.plank.x = m.limb.x;
      m.leaf.x = m.limb.x;
      m.plank.body.updateFromGameObject();
      const dx = m.limb.x - m.prevX;
      if (dx !== 0 && this.isRiding(m.plank)) this.player.x += dx;
      m.prevX = m.limb.x;
    }

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

    if (this.player.y > GAME_HEIGHT + 100) this.loseLevel('Hanuman fell...');

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
    this.showEndCard('Canopy cleared!', 'Tap to continue', '#ffe9a8', false, 'DangerScene');
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
