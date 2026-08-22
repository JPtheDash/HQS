import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { stripBackground } from '../utils/cleanTexture.js';

// SCENE 7 — ASHOKA VATIKA (Chapter 1 tutorial)
// A gentle side-scrolling platformer that teaches Move → Jump → Collect one
// step at a time: a small gap, a thorn bush, a low platform, then fruit, and a
// finish gate. Hills are a procedural parallax backdrop; thorns are drawn in
// code (no thorn asset yet).
const WORLD_W = 3400;
const GROUND_Y = GAME_HEIGHT - 150; // top surface of the ground

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.chapter = data && data.chapter ? data.chapter : 1;
  }

  create() {
    // Several props shipped with opaque/checker backgrounds — strip them so
    // they render cleanly over the world.
    ['ground', 'ledge', 'banana', 'mango', 'coconut', 'boulder', 'finish-gate'].forEach(
      (k) => stripBackground(this, k)
    );

    this.finished = false;
    this.invincibleUntil = 0;
    this.health = 3;
    this.energy = 1;
    this.coinsCollected = 0;
    this.timeLeft = 90;

    this.physics.world.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.solids = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    this.buildGround();
    this.buildLedge(1720, GROUND_Y - 210, 360);
    this.buildThornBush(1360);
    this.buildCollectibles();
    this.buildFinishGate(3180);

    // Player
    this.player = new Player(this, 150, GROUND_Y - 220);
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.overlap(this.player, this.pickups, this.onCollect, null, this);
    this.physics.add.overlap(this.player, this.hazards, this.onHazard, null, this);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-80, 60);

    this.hud = new Hud(this, { maxHealth: 3 });
    this.buildControls();
    this.buildTutorialSigns();

    playMusic(this, GAME_MUSIC, { volume: 0.4 });

    // Countdown timer.
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
    this.hud.setTime(this.timeLeft);
  }

  // --- Parallax hills backdrop (procedural) ------------------------------
  buildBackground() {
    // Full-screen vertical sky gradient, pinned to the camera. Graphics
    // fillGradientStyle guarantees full coverage (no transparent gaps).
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
    sky.fillGradientStyle(0x8fd3ff, 0x8fd3ff, 0xeaf7d8, 0xcdeaa8, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Soft sun.
    this.add.circle(GAME_WIDTH * 0.75, 180, 70, 0xffffff, 0.85).setScrollFactor(0.1).setDepth(-99);

    // Far + near hills as wavy filled shapes across the world, at different
    // scroll factors for parallax depth.
    this.drawHills(GROUND_Y + 40, 0x7fb56a, 150, 320, 0.35, -90);
    this.drawHills(GROUND_Y + 90, 0x5c9a4f, 120, 210, 0.6, -80);
  }

  drawHills(baseY, color, amplitude, wavelength, scrollFactor, depth) {
    const g = this.add.graphics().setScrollFactor(scrollFactor).setDepth(depth);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, GAME_HEIGHT);
    const span = WORLD_W + GAME_WIDTH;
    for (let x = 0; x <= span; x += 20) {
      const y = baseY - Math.abs(Math.sin(x / wavelength)) * amplitude;
      g.lineTo(x, y);
    }
    g.lineTo(span, GAME_HEIGHT);
    g.closePath();
    g.fillPath();
  }

  // --- Ground with a gap -------------------------------------------------
  buildGround() {
    // Two spans of ground with a jumpable gap between them.
    this.addGroundSpan(0, 1000);
    this.addGroundSpan(1180, WORLD_W);
  }

  addGroundSpan(x0, x1) {
    const w = x1 - x0;
    // tileSprite tiles the texture at native size, so scale it down (via
    // tileScale) to fit the whole 768px-tall ground image into displayH and
    // tile it horizontally across the span.
    const texH = this.textures.get('ground').getSourceImage().height; // 768
    const tScale = 0.42;
    const displayH = texH * tScale;
    const grassOffset = displayH * 0.55; // grass surface within ground.png

    const ts = this.add
      .tileSprite(x0, GROUND_Y - grassOffset, w, displayH, 'ground')
      .setOrigin(0, 0)
      .setDepth(-10);
    ts.setTileScale(tScale, tScale);

    // Fill below the art down to the screen bottom so no sky peeks through.
    this.add
      .rectangle(x0, GROUND_Y - grassOffset + displayH, w, GAME_HEIGHT, 0x5a3218)
      .setOrigin(0, 0)
      .setDepth(-11);

    // Collision body along the surface.
    const body = this.add.rectangle(x0 + w / 2, GROUND_Y + 40, w, 80);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  // --- Floating grass ledge ---------------------------------------------
  buildLedge(cx, topY, width) {
    // Anchor the image by its TOP so `topY` is exactly the visible surface,
    // then put the collision strip right on that surface — no floating gap
    // between where Hanuman stands and the grass he stands on.
    const img = this.add.image(cx, topY, 'ledge').setOrigin(0.5, 0).setDepth(-5);
    img.setScale(width / img.width);
    const surfaceY = topY + 14; // a hair into the grass so feet sit on it
    const body = this.add.rectangle(cx, surfaceY, width * 0.82, 24);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
    return img;
  }

  // --- Thorn bush hazard (drawn) ----------------------------------------
  buildThornBush(x) {
    const y = GROUND_Y;
    const g = this.add.graphics().setDepth(-4);
    // Green mound.
    g.fillStyle(0x2f6b2a, 1);
    g.fillEllipse(x, y - 12, 130, 60);
    g.fillStyle(0x3c8a34, 1);
    g.fillEllipse(x, y - 22, 110, 46);
    // Thorn spikes.
    g.fillStyle(0x274d1f, 1);
    for (let i = -3; i <= 3; i++) {
      const sx = x + i * 18;
      g.fillTriangle(sx - 7, y - 20, sx + 7, y - 20, sx, y - 68 - Math.abs(i) * -2);
    }
    // Small red thorn tips.
    g.fillStyle(0x8a2b2b, 1);
    for (let i = -3; i <= 3; i++) {
      const sx = x + i * 18;
      g.fillCircle(sx, y - 66, 3);
    }

    const zone = this.add.zone(x, y - 34, 120, 60);
    this.physics.add.existing(zone, true);
    this.hazards.add(zone);
  }

  // --- Collectibles ------------------------------------------------------
  buildCollectibles() {
    // A couple of early coins (teach Collect gently).
    this.addPickup(430, GROUND_Y - 90, 'coins', 46, 'coin');
    this.addPickup(560, GROUND_Y - 90, 'coins', 46, 'coin');
    this.addPickup(690, GROUND_Y - 90, 'coins', 46, 'coin');

    // Arc of coins over the gap.
    const arc = [
      [1010, GROUND_Y - 190],
      [1090, GROUND_Y - 230],
      [1170, GROUND_Y - 190]
    ];
    arc.forEach(([x, y]) => this.addPickup(x, y, 'coins', 42, 'coin'));

    // Banana reward on the ledge.
    this.addPickup(1720, GROUND_Y - 250, 'banana', 70, 'food');

    // Fruit + coins on the run to the gate.
    this.addPickup(2050, GROUND_Y - 90, 'mango', 64, 'food');
    this.addPickup(2300, GROUND_Y - 90, 'coins', 46, 'coin');
    this.addPickup(2450, GROUND_Y - 90, 'coins', 46, 'coin');
    this.addPickup(2700, GROUND_Y - 100, 'coconut', 64, 'food');
    this.addPickup(2900, GROUND_Y - 90, 'coins', 46, 'coin');
  }

  addPickup(x, y, key, size, kind) {
    const p = this.pickups.create(x, y, key);
    p.setScale(size / p.width);
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = kind;
    p.setDepth(-3);
    // Gentle floating bob + spin-ish shimmer.
    this.tweens.add({ targets: p, y: y - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return p;
  }

  buildFinishGate(x) {
    const gate = this.add.image(x, GROUND_Y, 'finish-gate').setOrigin(0.5, 1).setDepth(-6);
    gate.setScale(340 / gate.width);
    // Finish is checked geometrically in update() (player is created later).
    const zone = this.add.zone(x, GROUND_Y - 120, 80, 240);
    this.finishZone = zone;
  }

  // --- Controls: on-screen buttons + keyboard ----------------------------
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

    // Jump button: press = jump, hold = keep flying.
    const jumpDown = () => { this.player.tryJump(); this.player.setWantFly(true); };
    const jumpUp = () => this.player.setWantFly(false);
    this.jumpBtn.on('pointerdown', jumpDown);
    this.jumpBtn.on('pointerup', jumpUp);
    this.jumpBtn.on('pointerout', jumpUp);

    // Keyboard for desktop testing (hold to fly, same as the button).
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,SPACE');
    ['keydown-SPACE', 'keydown-UP', 'keydown-W'].forEach((e) =>
      this.input.keyboard.on(e, (ev) => { if (!ev.repeat) jumpDown(); })
    );
    ['keyup-SPACE', 'keyup-UP', 'keyup-W'].forEach((e) =>
      this.input.keyboard.on(e, jumpUp)
    );

    this.buildFlyMeter();
  }

  // Small flight-fuel bar above the jump button; only visible mid-flight.
  buildFlyMeter() {
    const x = GAME_WIDTH - 100;
    const y = GAME_HEIGHT - 180;
    this.flyMeter = this.add.container(x, y).setScrollFactor(0).setDepth(1003);
    const bg = this.add.rectangle(0, 0, 120, 14, 0x000000, 0.45).setStrokeStyle(2, 0xffe9a8, 0.7);
    this.flyFill = this.add.rectangle(-58, 0, 116, 8, 0xffd873).setOrigin(0, 0.5);
    const label = this.add.text(0, -20, 'FLY', {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffe9a8', fontStyle: 'bold'
    }).setOrigin(0.5);
    this.flyMeter.add([bg, this.flyFill, label]);
    this.flyMeter.setAlpha(0);
  }

  makeButton(x, y, label, radius = 62) {
    const circle = this.add.circle(x, y, radius, 0x000000, 0.35).setScrollFactor(0).setDepth(1001).setStrokeStyle(3, 0xffe9a8, 0.7);
    circle.setInteractive({ useHandCursor: true });
    const t = this.add
      .text(x, y, label, { fontFamily: 'Arial', fontSize: `${radius}px`, color: '#ffe9a8' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);
    circle.on('pointerdown', () => circle.setFillStyle(0xffe9a8, 0.35));
    circle.on('pointerup', () => circle.setFillStyle(0x000000, 0.35));
    circle.on('pointerout', () => circle.setFillStyle(0x000000, 0.35));
    circle._label = t;
    return circle;
  }

  // --- Contextual tutorial signposts ------------------------------------
  buildTutorialSigns() {
    this.sign(220, GROUND_Y - 300, 'Use ◀ ▶ to MOVE');
    this.sign(760, GROUND_Y - 330, 'TAP ▲ = JUMP\nHOLD ▲ = FLY!');
    this.sign(1050, GROUND_Y - 300, 'Hold ▲ to glide the gap');
    this.sign(1720, GROUND_Y - 340, 'Land on the ledge');
    this.sign(1360, GROUND_Y - 220, 'Avoid thorns!');
    this.sign(2050, GROUND_Y - 240, 'COLLECT fruit & coins');
  }

  sign(x, y, text) {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#ffffff',
        align: 'center',
        stroke: '#2a1500',
        strokeThickness: 5,
        backgroundColor: '#00000055',
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // --- Collision handlers ------------------------------------------------
  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({
      targets: pickup,
      y: pickup.y - 60,
      alpha: 0,
      scale: pickup.scale * 1.3,
      duration: 350,
      onComplete: () => pickup.destroy()
    });

    if (pickup.kind === 'coin') {
      this.coinsCollected += 1;
    } else {
      // Food restores energy.
      this.energy = Phaser.Math.Clamp(this.energy + 0.2, 0, 1);
      this.hud.setEnergy(this.energy);
    }
    this.floatText(pickup.x, pickup.y, pickup.kind === 'coin' ? '+1' : '+ENERGY', '#ffe9a8');
  }

  onHazard(player) {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.invincibleUntil = this.time.now + 1200;
    this.health -= 1;
    this.hud.setHealth(this.health);

    // Knockback + flash.
    this.player.setVelocity(this.player.facing * -260, -420);
    this.cameras.main.shake(180, 0.008);
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 5 });
    this.floatText(this.player.x, this.player.y - 120, '-1', '#ff6b6b');

    if (this.health <= 0) this.loseLevel('Hanuman fell...');
  }

  floatText(x, y, msg, color) {
    const t = this.add
      .text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  update(time, delta) {
    if (this.finished || !this.player.alive) return;

    // Movement from buttons or keyboard.
    const left = this.ctrl.left || this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.ctrl.right || this.cursors.right.isDown || this.keys.D.isDown;
    if (left && !right) this.player.moveLeft();
    else if (right && !left) this.player.moveRight();
    else this.player.stopMoving();

    // Flight-fuel bar: show while airborne or not full, hide when topped up.
    const fuel = Phaser.Math.Clamp(this.player.flyLeft / this.player.flyMax, 0, 1);
    this.flyFill.width = 116 * fuel;
    this.flyFill.fillColor = fuel > 0.35 ? 0xffd873 : 0xff8c5a;
    const showMeter = this.player.flying || fuel < 0.999;
    this.flyMeter.setAlpha(Phaser.Math.Linear(this.flyMeter.alpha, showMeter ? 1 : 0, 0.15));

    // Fell into the gap / off the world.
    if (this.player.y > GAME_HEIGHT + 100) this.loseLevel('Hanuman fell...');

    // Reached the finish gate.
    if (this.finishZone && !this.finished) {
      if (Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), this.finishZone.getBounds())) {
        this.winLevel();
      }
    }
  }

  winLevel() {
    if (this.finished) return;
    this.finished = true;
    this.player.stopMoving();
    this.showEndCard('Ashoka Vatika cleared!', 'Tap to continue', '#ffe9a8', false, 'TreeScene');
  }

  loseLevel(reason) {
    if (this.finished) return;
    this.finished = true;
    this.player.alive = false;
    this.player.stopMoving();
    this.showEndCard(reason, 'Tap to try again', '#ff8c8c', true);
  }

  showEndCard(title, subtitle, color, retry = false, nextScene = 'HomeScene') {
    const cam = this.cameras.main;
    const cx = cam.midPoint.x;
    const cy = cam.midPoint.y;

    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setScrollFactor(0).setDepth(2000);
    dim.setScrollFactor(0);
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 400 });

    const t1 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, {
      fontFamily: 'Georgia, serif', fontSize: '54px', color, fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#2a1500', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    this.tweens.add({ targets: t2, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => {
      cam.fadeOut(400, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => {
        if (retry) this.scene.restart({ chapter: this.chapter });
        else this.scene.start(nextScene);
      });
    });
  }
}
