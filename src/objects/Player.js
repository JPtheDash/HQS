import Phaser from 'phaser';

// Hanuman player, animated from the cleaned 8x5 'hero' spritesheet
// (tools/genhero5.mjs bakes it to public/assets/game/hero6.png: checker
// background stripped, each figure detected as a connected component and
// recentred into a uniform 430x372 cell, bottom-aligned to a shared baseline).
// All frames are side-profile facing right. Frames are indexed row*8 + col:
//   idle 0-7 · run 8-13 · jump 16-21 · fly 24-29 · throw 32-37  (rest empty)
// A small state machine in preUpdate() picks the animation from the physics
// state. Arcade bodies ignore rotation, so squash/tilt don't affect collision.
//
// Controls: a quick TAP jumps; TAP-AND-HOLD keeps thrusting upward (a short
// flight) for up to FLY_MAX ms of held time, refuelled on landing.
const FLY_MAX = 2500;
const FLY_RISE = -260;
const BASELINE = 360; // baked feet line inside each 372px cell

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hero', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    Player.createAnims(scene);

    const targetHeight = 230;
    this.setScale(targetHeight / this.height);
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;

    // Slim body reaching the baked baseline so the feet sit on the ground.
    const bw = this.width * 0.30;
    const bh = this.height * 0.58;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, BASELINE - bh);
    this.setCollideWorldBounds(true);
    this.setDepth(6);
    this.halfH = (bh * this.scaleY) / 2;

    this.speed = 340;
    this.jumpVelocity = -1000;
    this.facing = 1;
    this.jumpsUsed = 0;
    this.canDoubleJump = false;
    this.alive = true;

    this.flyMax = FLY_MAX;
    this.flyLeft = FLY_MAX;
    this.wantFly = false;
    this.flying = false;
    this.wasOnGround = true;
    this.spinning = false;
    this.throwing = false;
    this.currentAnim = '';

    this.buildFx(scene);
    this.play('hero-idle');
  }

  // Play the throw animation once. `onRelease` fires at the release frame so the
  // scene can spawn the gada projectile in sync; returns false if already busy.
  throwGada(onRelease) {
    if (this.throwing) return false;
    this.throwing = true;
    this.currentAnim = 'hero-throw';
    this.play('hero-throw', true);
    this.scene.time.delayedCall(180, () => { if (this.throwing && onRelease) onRelease(); });
    this.once('animationcomplete-hero-throw', () => { this.throwing = false; });
    return true;
  }

  static createAnims(scene) {
    const a = scene.anims;
    if (a.exists('hero-idle')) return;
    a.create({ key: 'hero-idle', frames: a.generateFrameNumbers('hero', { frames: [0, 1, 2, 3, 4, 5, 6, 7] }), frameRate: 8, repeat: -1 });
    a.create({ key: 'hero-run', frames: a.generateFrameNumbers('hero', { frames: [8, 9, 10, 11, 12, 13] }), frameRate: 13, repeat: -1 });
    a.create({ key: 'hero-jump', frames: a.generateFrameNumbers('hero', { frames: [16, 17, 18, 19, 20, 21] }), frameRate: 12, repeat: 0 });
    a.create({ key: 'hero-fly', frames: a.generateFrameNumbers('hero', { frames: [24, 25, 26, 27, 28, 29] }), frameRate: 9, repeat: -1 });
    a.create({ key: 'hero-throw', frames: a.generateFrameNumbers('hero', { frames: [32, 33, 34, 35, 36, 37] }), frameRate: 18, repeat: 0 });
  }

  buildFx(scene) {
    this.dust = scene.add.particles(0, 0, 'glow', {
      lifespan: 420, speed: { min: 30, max: 110 }, angle: { min: 200, max: 340 },
      scale: { start: 0.45, end: 0 }, alpha: { start: 0.75, end: 0 }, tint: 0xe8d7ad, emitting: false
    });
    this.dust.setDepth(4);
    this.trail = scene.add.particles(0, 0, 'glow', {
      lifespan: 420, speed: 20, scale: { start: 0.32, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint: 0xffd873, frequency: 30, follow: this, followOffset: { x: 0, y: this.halfH * 0.85 }, emitting: false
    });
    this.trail.setDepth(3);
  }

  puffDust(n = 12) { this.dust.emitParticleAt(this.x, this.y + this.halfH, n); }

  setAnim(key) {
    if (this.currentAnim === key) return;
    this.currentAnim = key;
    this.play(key, true);
  }

  moveLeft() { this.setVelocityX(-this.speed); this.setFlipX(true); this.facing = -1; }
  moveRight() { this.setVelocityX(this.speed); this.setFlipX(false); this.facing = 1; }
  stopMoving() { this.setVelocityX(0); }

  tryJump() {
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (onGround) {
      this.setVelocityY(this.jumpVelocity);
      this.jumpsUsed = 1;
      this.squash();
      this.puffDust(14);
      return true;
    }
    if (this.canDoubleJump && this.jumpsUsed < 2) {
      this.setVelocityY(this.jumpVelocity * 0.92);
      this.jumpsUsed = 2;
      this.squash();
      this.spinFlip();
      this.puffDust(8);
      return true;
    }
    return false;
  }

  setWantFly(on) { this.wantFly = on; }

  squash() {
    this.scene.tweens.add({
      targets: this, scaleX: this.baseScaleX * 1.12, scaleY: this.baseScaleY * 0.9,
      duration: 110, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => this.setScale(this.baseScaleX, this.baseScaleY)
    });
  }

  spinFlip() {
    this.spinning = true;
    this.scene.tweens.add({
      targets: this, angle: this.facing >= 0 ? 360 : -360, duration: 380, ease: 'Cubic.easeOut',
      onComplete: () => { this.setAngle(0); this.spinning = false; }
    });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.alive) return;

    const onGround = this.body.blocked.down;
    if (onGround) {
      this.jumpsUsed = 0;
      this.flyLeft = this.flyMax;
      if (!this.wasOnGround && this.body.velocity.y >= 0) this.puffDust(12);
    }
    this.wasOnGround = onGround;

    const canFly = this.wantFly && !onGround && this.flyLeft > 0;
    if (canFly) {
      this.flyLeft -= delta;
      this.setVelocityY(FLY_RISE);
      if (!this.flying) { this.flying = true; this.trail.start(); }
    } else if (this.flying) {
      this.flying = false;
      this.trail.stop();
      if (this.flyLeft <= 0 && !onGround) this.puffDust(6);
    }

    if (this.spinning || this.throwing) return;

    if (this.flying) this.setAnim('hero-fly');
    else if (!onGround) this.setAnim('hero-jump');
    else if (Math.abs(this.body.velocity.x) > 20) this.setAnim('hero-run');
    else this.setAnim('hero-idle');
  }

  enableDoubleJump() { this.canDoubleJump = true; }
}
