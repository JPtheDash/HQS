import Phaser from 'phaser';

// Hanuman player. Uses the clean transparent hanuman.png with code-driven
// animation: Arcade bodies are axis-aligned and ignore rotation, so we can
// wobble/tilt the sprite freely for a lively run/jump without disturbing
// collision. (Swap to a real spritesheet later by replacing the visuals in
// update() with anims.play — the physics/control code stays the same.)
export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hanuman');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const targetHeight = 180;
    this.setScale(targetHeight / this.height);
    this.baseScaleX = this.scaleX;
    this.baseScaleY = this.scaleY;

    // Collision box: narrower/shorter than the artwork's transparent margins.
    const bw = this.width * 0.40;
    const bh = this.height * 0.70;
    this.body.setSize(bw, bh);
    this.body.setOffset((this.width - bw) / 2, this.height - bh - this.height * 0.05);
    this.setCollideWorldBounds(true);

    this.speed = 340;
    this.jumpVelocity = -1000;
    this.facing = 1;
    this.jumpsUsed = 0;
    this.canDoubleJump = false; // enabled in Scene 8
    this.runTime = 0;
    this.alive = true;
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

  tryJump() {
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (onGround) {
      this.setVelocityY(this.jumpVelocity);
      this.jumpsUsed = 1;
      this.squash();
      return true;
    }
    if (this.canDoubleJump && this.jumpsUsed < 2) {
      this.setVelocityY(this.jumpVelocity * 0.92);
      this.jumpsUsed = 2;
      this.squash();
      this.spinFlip();
      return true;
    }
    return false;
  }

  squash() {
    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScaleX * 1.12,
      scaleY: this.baseScaleY * 0.9,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  // A quick flourish on the double jump.
  spinFlip() {
    this.scene.tweens.add({
      targets: this,
      angle: this.facing >= 0 ? 360 : -360,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => this.setAngle(0)
    });
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.alive) return;

    const onGround = this.body.blocked.down;
    if (onGround) this.jumpsUsed = 0;

    // Skip procedural tilt while a spinFlip tween owns the angle.
    const spinning = this.scene.tweens.isTweening(this);

    if (!onGround && !spinning) {
      // Lean forward going up, back coming down.
      const tilt = Phaser.Math.Clamp(this.body.velocity.y / 2000, -0.18, 0.28) * this.facing;
      this.setRotation(tilt);
    } else if (onGround && Math.abs(this.body.velocity.x) > 20) {
      this.runTime += delta;
      this.setRotation(Math.sin(this.runTime * 0.018) * 0.06);
    } else if (!spinning) {
      this.setRotation(0);
    }
  }

  enableDoubleJump() {
    this.canDoubleJump = true;
  }
}
