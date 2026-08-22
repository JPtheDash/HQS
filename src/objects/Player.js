import Phaser from 'phaser';

// Hanuman player — the single clean transparent hanuman.png with code-driven
// motion. This is deliberate: the generated multi-pose spritesheet cannot be
// sliced into stable frames (its poses overlap/vary and jitter in motion), so
// we use the one clean image and bring it to life with tilt/squash/bob. Arcade
// bodies ignore rotation, so none of this affects collision.
//
// Controls: a quick TAP jumps; TAP-AND-HOLD keeps thrusting upward (a short
// flight) for up to FLY_MAX ms of held time, refuelled on landing.
const FLY_MAX = 2500;
const FLY_RISE = -260;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hanuman');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const targetHeight = 185;
    this.setScale(targetHeight / this.height);
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;

    const bw = this.width * 0.40;
    const bh = this.height * 0.72;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, this.height - bh - this.height * 0.02);
    this.setCollideWorldBounds(true);
    this.setDepth(6);
    this.halfH = (bh * this.scaleY) / 2;

    this.speed = 340;
    this.jumpVelocity = -1000;
    this.facing = 1;
    this.jumpsUsed = 0;
    this.canDoubleJump = false;
    this.runTime = 0;
    this.alive = true;

    this.flyMax = FLY_MAX;
    this.flyLeft = FLY_MAX;
    this.wantFly = false;
    this.flying = false;
    this.wasOnGround = true;
    this.spinning = false;
    this.squashing = false;
    this.runDustAccum = 0;

    this.buildFx(scene);
  }

  // A single static-image "lively idle/run" helper other screens can reuse
  // (e.g. the loading screen), so the look stays consistent.
  static animateStanding(sprite, scene) {
    scene.tweens.add({ targets: sprite, angle: { from: -4, to: 4 }, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: sprite, y: sprite.y - 10, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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

  // Little kicks of dust behind the feet to sell forward running.
  puffRunDust() { this.dust.emitParticleAt(this.x - this.facing * 24, this.y + this.halfH, 3); }

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
    this.squashing = true;
    this.scene.tweens.add({
      targets: this, scaleX: this.baseScaleX * 1.12, scaleY: this.baseScaleY * 0.9,
      duration: 110, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { this.setScale(this.baseScaleX, this.baseScaleY); this.squashing = false; }
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
    this.runTime += delta;

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

    if (this.spinning) return;

    if (this.flying) {
      this.setRotation(this.facing * 0.5);
      if (!this.squashing) this.setScale(this.baseScaleX, this.baseScaleY);
    } else if (!onGround) {
      const tilt = Phaser.Math.Clamp(this.body.velocity.y / 2000, -0.18, 0.28) * this.facing;
      this.setRotation(tilt);
      if (!this.squashing) this.setScale(this.baseScaleX, this.baseScaleY);
    } else if (Math.abs(this.body.velocity.x) > 20) {
      // Running: forward lean + a springy stride bob (stretch up, squash down),
      // plus periodic dust kicks behind the feet so it clearly reads as motion.
      const phase = this.runTime * 0.024;
      this.setRotation(this.facing * 0.06 + Math.sin(phase) * 0.05);
      if (!this.squashing) {
        const s = Math.sin(phase * 2);
        this.setScale(this.baseScaleX * (1 - s * 0.03), this.baseScaleY * (1 + s * 0.05));
      }
      this.runDustAccum += delta;
      if (this.runDustAccum > 180) { this.runDustAccum = 0; this.puffRunDust(); }
    } else {
      this.setRotation(0);
      if (!this.squashing) {
        const breathe = 1 + Math.sin(this.runTime * 0.004) * 0.02;
        this.setScale(this.baseScaleX, this.baseScaleY * breathe);
      }
    }
  }

  enableDoubleJump() { this.canDoubleJump = true; }
}
