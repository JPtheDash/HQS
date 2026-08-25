import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';
import Player from '../objects/Player.js';
import Hud from '../ui/Hud.js';
import { fallRespawn } from '../utils/respawn.js';

// SCENES 12–13 — SKY JOURNEY (Chapter 3, flying)
// The traversal flips from running to flying: hop between cloud and floating-rock
// platforms by TAP-AND-HOLD to fly (short fuel, refuels on landing). Collect
// coins and lotuses, dodge dark storm clouds. Fall off the bottom = lose a heart
// and respawn at the start.
// NOTE: procedural clouds/rocks/sky are placeholders until bg-sky.png / cloud.png
// / floatrock.png land (auto-picked up as 'bgsky' / 'cloud' / 'floatrock').
const WORLD_W = 4200;
const FLOOR_Y = GAME_HEIGHT - 80; // an invisible lowest safety line is below this

export default class SkyScene extends Phaser.Scene {
  constructor() {
    super('SkyScene');
  }

  create() {
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
    this.hazards = this.physics.add.staticGroup();
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });

    // Platform layout: [x, y, width]. Start low-left, weave up and along.
    this.platformDefs = [
      [140, GAME_HEIGHT - 200, 260], [620, GAME_HEIGHT - 300, 200],
      [1050, GAME_HEIGHT - 430, 200], [1480, GAME_HEIGHT - 330, 200],
      [1950, GAME_HEIGHT - 460, 200], [2400, GAME_HEIGHT - 360, 200],
      [2850, GAME_HEIGHT - 500, 200], [3300, GAME_HEIGHT - 380, 220],
      [3780, GAME_HEIGHT - 300, 280]
    ];
    this.buildPlatforms();
    this.buildHazards();
    this.buildCollectibles();
    this.buildFinish(3860, GAME_HEIGHT - 460);

    this.player = new Player(this, 140, GAME_HEIGHT - 300);
    this.spawnX = 140; this.spawnY = GAME_HEIGHT - 300;
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
    if (this.textures.exists('bgsky')) {
      const bg = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bgsky').setOrigin(0, 0).setScrollFactor(0).setDepth(-100);
      const tex = this.textures.get('bgsky').getSourceImage();
      bg.tileScaleX = bg.tileScaleY = GAME_HEIGHT / tex.height;
      this.bg = bg;
    } else {
      const sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
      sky.fillGradientStyle(0x6fc0ff, 0x8fd0ff, 0xffe6a8, 0xffd070, 1);
      sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      this.add.circle(GAME_WIDTH * 0.7, 160, 90, 0xfff6d8, 0.9).setScrollFactor(0.05).setDepth(-99);
      // Parallax background cloud puffs.
      for (let i = 0; i < 22; i++) {
        const x = Phaser.Math.Between(0, WORLD_W), y = Phaser.Math.Between(60, GAME_HEIGHT - 250);
        const g = this.add.graphics().setScrollFactor(0.4).setDepth(-90);
        g.fillStyle(0xffffff, 0.5);
        const s = Phaser.Math.Between(40, 90);
        g.fillCircle(x * 0.4, y, s); g.fillCircle(x * 0.4 + s * 0.8, y + 10, s * 0.7); g.fillCircle(x * 0.4 - s * 0.8, y + 12, s * 0.7);
      }
    }
  }

  buildPlatforms() {
    this.platformDefs.forEach(([x, y, w], i) => {
      // Alternate cloud / floating-rock look for variety.
      if (i % 2 === 0) this.makeCloud(x, y, w);
      else this.makeRock(x, y, w);
    });
  }

  makeCloud(x, y, w) {
    if (this.textures.exists('cloud')) {
      const img = this.add.image(x, y, 'cloud').setOrigin(0.5, 0).setDepth(-5);
      img.setScale(w / img.width);
    } else {
      const g = this.add.graphics().setDepth(-5);
      g.fillStyle(0xffffff, 0.98);
      const h = 46;
      for (let cx = -w / 2; cx <= w / 2; cx += w / 6) g.fillCircle(x + cx, y + 24, 34);
      g.fillRoundedRect(x - w / 2, y + 8, w, h, 22);
      g.fillStyle(0xdfeaf5, 0.9); g.fillRoundedRect(x - w / 2, y + 34, w, 22, 14);
    }
    this.addPlatformBody(x, y + 14, w * 0.86);
  }

  makeRock(x, y, w) {
    const key = this.textures.exists('floatrock') ? 'floatrock' : (this.textures.exists('ledge-small') ? 'ledge-small' : 'ledge');
    const img = this.add.image(x, y, key).setOrigin(0.5, 0).setDepth(-5);
    img.setScale(w / img.width);
    this.addPlatformBody(x, y + img.displayHeight * 0.15, w * 0.86);
  }

  addPlatformBody(x, surfaceY, w) {
    const body = this.add.rectangle(x, surfaceY, w, 22);
    this.physics.add.existing(body, true);
    body.setVisible(false);
    this.solids.add(body);
  }

  buildHazards() {
    // Dark storm clouds hovering in a few gaps (contact = damage).
    [[860, GAME_HEIGHT - 380], [1720, GAME_HEIGHT - 300], [2650, GAME_HEIGHT - 440], [3550, GAME_HEIGHT - 470]]
      .forEach(([x, y]) => this.makeStormCloud(x, y));
  }

  makeStormCloud(x, y) {
    let display;
    if (this.textures.exists('stormcloud')) {
      display = this.add.image(x, y, 'stormcloud').setDepth(4);
      display.setScale(120 / display.width);
    } else {
      const g = this.add.graphics().setDepth(4);
      g.fillStyle(0x4a4a6a, 0.96);
      for (let cx = -60; cx <= 60; cx += 30) g.fillCircle(x + cx, y, 34);
      g.fillRoundedRect(x - 70, y, 140, 40, 18);
      g.fillStyle(0xffe23b, 1); g.fillTriangle(x - 6, y + 34, x + 10, y + 34, x - 2, y + 70); // bolt
      display = g;
      this.tweens.add({ targets: g, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });
    }
    const zone = this.add.zone(x, y + 10, 150, 90);
    this.physics.add.existing(zone, true);
    this.hazards.add(zone);
  }

  buildCollectibles() {
    // Coin arcs bridging the platform gaps + a few lotuses on high platforms.
    for (let i = 0; i < this.platformDefs.length - 1; i++) {
      const [x1, y1] = this.platformDefs[i];
      const [x2, y2] = this.platformDefs[i + 1];
      for (let t = 0.25; t <= 0.75; t += 0.25) {
        const cx = Phaser.Math.Linear(x1, x2, t);
        const cy = Phaser.Math.Linear(y1, y2, t) - 70 - Math.sin(t * Math.PI) * 40;
        this.addPickup(cx, cy, 'coins', 42, 'coin');
      }
    }
    [[1050, GAME_HEIGHT - 500], [2850, GAME_HEIGHT - 570]].forEach(([x, y]) => this.addLotus(x, y));
  }

  addPickup(x, y, key, size, kind) {
    const p = this.pickups.create(x, y, key);
    p.setScale(size / p.width);
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = kind;
    p.setDepth(-3);
    this.tweens.add({ targets: p, y: y - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  addLotus(x, y) {
    let p;
    if (this.textures.exists('lotus')) {
      p = this.pickups.create(x, y, 'lotus');
      p.setScale(72 / p.width);
    } else {
      // Procedural pink lotus placeholder using a coin sprite tinted + glow ring.
      this.add.circle(x, y, 26, 0xff8ab0, 0.3).setDepth(-4);
      p = this.pickups.create(x, y, 'coins');
      p.setScale(60 / p.width);
      p.setTint(0xff9ad0);
    }
    p.body.setSize(p.width * 0.7, p.height * 0.7);
    p.kind = 'lotus';
    p.setDepth(-3);
    this.tweens.add({ targets: p, y: y - 14, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    this.sign(360, GAME_HEIGHT - 360, 'HOLD ▲ to fly\nbetween the clouds');
    this.sign(1720, GAME_HEIGHT - 470, 'Avoid the storm clouds!');
  }

  sign(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff', align: 'center', stroke: '#1a2a4a', strokeThickness: 5, backgroundColor: '#00000055', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: t, y: y - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(player, pickup) {
    pickup.disableBody(true, false);
    this.tweens.add({ targets: pickup, y: pickup.y - 60, alpha: 0, scale: pickup.scale * 1.3, duration: 350, onComplete: () => pickup.destroy() });
    if (pickup.kind === 'lotus') {
      this.coinsCollected += 5;
      this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 5);
      this.floatText(pickup.x, pickup.y, 'Divine lotus! +5', '#ff9ad0');
      return;
    }
    this.coinsCollected += 1;
    this.registry.set('coinTotal', (this.registry.get('coinTotal') || 0) + 1);
    this.floatText(pickup.x, pickup.y, '+1', '#ffe9a8');
  }

  onHazard(player, hazard) {
    if (this.time.now < this.invincibleUntil || this.finished) return;
    this.invincibleUntil = this.time.now + 1200;
    this.health -= 1;
    this.hud.setHealth(this.health);
    this.player.setVelocity(this.player.facing * -220, -360);
    this.cameras.main.shake(160, 0.008);
    this.cameras.main.flash(120, 120, 120, 0);
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 100, yoyo: true, repeat: 5 });
    this.floatText(this.player.x, this.player.y - 120, '-1', '#ff6b6b');
    if (this.health <= 0) this.loseLevel('Struck down!');
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, { fontFamily: 'Georgia, serif', fontSize: '28px', color, fontStyle: 'bold', stroke: '#1a2a4a', strokeThickness: 4 }).setOrigin(0.5).setDepth(60);
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

    // Flight-fuel meter.
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
    // TODO: chain to Scene 14 (Storm) once built.
    this.showEndCard('Across the sky!', 'Tap to continue', '#ffe9a8', false, 'HomeScene');
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
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, title, { fontFamily: 'Georgia, serif', fontSize: '50px', color, fontStyle: 'bold', stroke: '#1a2a4a', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, subtitle, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffffff', stroke: '#1a2a4a', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
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
