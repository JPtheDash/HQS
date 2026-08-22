import Phaser from 'phaser';

// Hanuman player, animated from the pre-baked, cell-aligned 'hero' spritesheet
// (tools/genclean.mjs bakes it to public/assets/game/hero_clean.png). Each
// animation uses only the sheet's clean, front-facing frames:
//   idle 0-1 · run 10-15 · jump 16-17 · fly 25/26/29/31
// A small state machine in preUpdate() picks the animation from the physics
// state. Arcade bodies ignore rotation, so tilts don't affect collision.
//
// Controls: a quick TAP jumps; TAP-AND-HOLD keeps thrusting upward (a short
// flight) for up to FLY_MAX ms of held time, refuelled on landing.
const FLY_MAX = 2500; // ms of flight available per takeoff
const FLY_RISE = -260; // steady rise speed while flying (px/s)

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hero', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    Player.createAnims(scene);

    const targetHeight = 200;
    this.setScale(targetHeight / this.height);
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;

    // Collision box: a slim column reaching the baked baseline (feet ~ y246 of
    // the 256px cell), so Hanuman's feet rest on the ground.
    const bw = this.width * 0.34;
    const bh = this.height * 0.60;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, 246 - bh);
    this.setCollideWorldBounds(true);
    this.setDepth(6); // above dust (4) and thrust trail (3)
    this.halfH = (bh * this.scaleY) / 2;

    this.speed = 340;
    this.jumpVelocity = -1000;
    this.facing = 1;
    this.jumpsUsed = 0;
    this.canDoubleJump = false; // enabled in Scene 8
    this.alive = true;

    // Flight state.
    this.flyMax = FLY_MAX;
    this.flyLeft = FLY_MAX;
    this.wantFly = false;
    this.flying = false;
    this.wasOnGround = true;
    this.spinning = false;
    this.currentAnim = '';

    this.buildFx(scene);
    this.play('hero-idle');
  }

  static createAnims(scene) {
    const a = scene.anims;
    if (a.exists('hero-idle')) return;
    a.create({ key: 'hero-idle', frames: a.generateFrameNumbers('hero', { frames: [0, 1] }), frameRate: 3, repeat: -1 });
    a.create({ key: 'hero-run', frames: a.generateFrameNumbers('hero', { frames: [10, 11, 12, 13, 14, 15] }), frameRate: 14, repeat: -1 });
    a.create({ key: 'hero-jump', frames: a.generateFrameNumbers('hero', { frames: [16, 17] }), frameRate: 8, repeat: 0 });
    a.create({ key: 'hero-fly', frames: a.generateFrameNumbers('hero', { frames: [26, 29, 31] }), frameRate: 8, repeat: -1 });
  }

  buildFx(scene) {
    this.dust = scene.add.particles(0, 0, 'glow', {
      lifespan: 420, speed: { min: 30, max: 110 }, angle: { min: 200, max: 340 },
      scale: { start: 0.45, end: 0 }, alpha: { start: 0.75, end: 0 }, tint: 0xe8d7ad, emitting: false
    });
    this.dust.setDepth(4);

    this.trail = scene.add.particles(0, 0, 'glow', {
      lifespan: 420, speed: 20, scale: { start: 0.32, end: 0 }, alpha: { start: 0.6, end: 0 },
      tint: 0xffd873, frequency: 30, follow: this, followOffset: { x: 0, y: this.halfH * 0.7 }, emitting: false
    });
    this.trail.setDepth(3);
  }

  puffDust(n = 12) {
    this.dust.emitParticleAt(this.x, this.y + this.halfH, n);
  }

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

    if (this.spinning) return; // spin flourish owns the sprite

    if (this.flying) this.setAnim('hero-fly');
    else if (!onGround) this.setAnim('hero-jump');
    else if (Math.abs(this.body.velocity.x) > 20) this.setAnim('hero-run');
    else this.setAnim('hero-idle');
  }

  enableDoubleJump() { this.canDoubleJump = true; }
}
