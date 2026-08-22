import Phaser from 'phaser';

// Hanuman player. Uses the single clean transparent hanuman.png with
// code-driven liveliness (idle breathing, run wobble, jump squash, flight
// lean). Arcade bodies are axis-aligned and ignore rotation, so we can tilt/
// scale the sprite freely without disturbing collision.
//
// NOTE: the generated spritesheet.png can't be grid-sliced — its poses overlap
// and bleed across cell borders, so every slice produced broken/fragmented
// frames. Swap to real frame animation once a properly *spaced* sheet exists
// (each pose fully inside its own padded cell); the physics/controls below stay.
//
// Controls: a quick TAP jumps; TAP-AND-HOLD keeps thrusting upward (a short
// flight) for up to FLY_MAX ms of held time, refuelled on landing.
const FLY_MAX = 2500; // ms of flight available per takeoff
const FLY_RISE = -260; // steady rise speed while flying (px/s)

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hanuman');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const targetHeight = 185;
    this.setScale(targetHeight / this.height);
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;

    // Collision box: narrower/shorter than the artwork's transparent margins,
    // reaching the bottom so the feet rest on the ground.
    const bw = this.width * 0.40;
    const bh = this.height * 0.72;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, this.height - bh - this.height * 0.02);
    this.setCollideWorldBounds(true);
    this.setDepth(6); // above dust (4) and thrust trail (3)
    this.halfH = (bh * this.scaleY) / 2;

    this.speed = 340;
    this.jumpVelocity = -1000;
    this.facing = 1;
    this.jumpsUsed = 0;
    this.canDoubleJump = false; // enabled in Scene 8
    this.runTime = 0;
    this.alive = true;

    // Flight state.
    this.flyMax = FLY_MAX;
    this.flyLeft = FLY_MAX;
    this.wantFly = false;
    this.flying = false;
    this.wasOnGround = true;

    // Visual-lock flags so procedural tilt/scale don't fight active tweens.
    this.spinning = false;
    this.squashing = false;

    this.buildFx(scene);
  }

  // Dust puffs (takeoff/land) and a golden flight trail.
  buildFx(scene) {
    this.dust = scene.add.particles(0, 0, 'glow', {
      lifespan: 420,
      speed: { min: 30, max: 110 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.75, end: 0 },
      tint: 0xe8d7ad,
      emitting: false
    });
    this.dust.setDepth(4);

    this.trail = scene.add.particles(0, 0, 'glow', {
      lifespan: 420,
      speed: 20,
      scale: { start: 0.32, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: 0xffd873,
      frequency: 30,
      follow: this,
      followOffset: { x: 0, y: this.halfH * 0.85 },
      emitting: false
    });
    this.trail.setDepth(3);
  }

  puffDust(n = 12) {
    this.dust.emitParticleAt(this.x, this.y + this.halfH, n);
  }

  moveLeft() {
    this.setVelocityX(-this.speed);
    this.setFlipX(true);
    this.facing = -1;
  }

  moveRight() {
    this.setVelocityX(this.speed);
    this.setFlipX(false);
    this.facing = 1;
  }

  stopMoving() {
    this.setVelocityX(0);
  }

  // Called on button/key press. Jumps from the ground (or double-jumps when
  // unlocked). Holding is handled separately via setWantFly().
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

  setWantFly(on) {
    this.wantFly = on;
  }

  squash() {
    this.squashing = true;
    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScaleX * 1.12,
      scaleY: this.baseScaleY * 0.9,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => { this.setScale(this.baseScaleX, this.baseScaleY); this.squashing = false; }
    });
  }

  // A quick flourish on the double jump.
  spinFlip() {
    this.spinning = true;
    this.scene.tweens.add({
      targets: this,
      angle: this.facing >= 0 ? 360 : -360,
      duration: 380,
      ease: 'Cubic.easeOut',
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
      this.flyLeft = this.flyMax; // refuel on the ground
      if (!this.wasOnGround && this.body.velocity.y >= 0) this.puffDust(12);
    }
    this.wasOnGround = onGround;

    // Flight: steady climb while the button is held and fuel remains.
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

    // --- Procedural liveliness (skipped while a tween owns angle/scale) ---
    if (this.spinning) return;

    if (this.flying) {
      this.setRotation(this.facing * 0.7); // forward "flying" lean
      if (!this.squashing) this.setScale(this.baseScaleX, this.baseScaleY);
    } else if (!onGround) {
      // Lean forward going up, back coming down.
      const tilt = Phaser.Math.Clamp(this.body.velocity.y / 2000, -0.18, 0.28) * this.facing;
      this.setRotation(tilt);
      if (!this.squashing) this.setScale(this.baseScaleX, this.baseScaleY);
    } else if (Math.abs(this.body.velocity.x) > 20) {
      // Running: a little rhythmic wobble.
      this.setRotation(Math.sin(this.runTime * 0.02) * 0.07);
      if (!this.squashing) this.setScale(this.baseScaleX, this.baseScaleY);
    } else {
      // Idle: upright, with a gentle breathing pulse.
      this.setRotation(0);
      if (!this.squashing) {
        const breathe = 1 + Math.sin(this.runTime * 0.004) * 0.02;
        this.setScale(this.baseScaleX, this.baseScaleY * breathe);
      }
    }
  }

  enableDoubleJump() {
    this.canDoubleJump = true;
  }
}
