import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig.js';

// Heads-up display: ❤ health (top-left), ENERGY bar (top-center), ⏱ time
// (top-right). Everything is pinned to the camera via scrollFactor 0 and lives
// in one container so it always sits above the world.
export default class Hud {
  constructor(scene, { maxHealth = 3 } = {}) {
    this.scene = scene;
    this.maxHealth = maxHealth;

    this.layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    this.buildHealth();
    this.buildEnergy();
    this.buildTimer();
  }

  buildHealth() {
    this.hearts = [];
    const startX = 30;
    const y = 44;
    for (let i = 0; i < this.maxHealth; i++) {
      const h = this.scene.add
        .text(startX + i * 46, y, '♥', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '44px',
          color: '#ff3b3b',
          stroke: '#5a0000',
          strokeThickness: 5
        })
        .setOrigin(0, 0.5);
      this.hearts.push(h);
      this.layer.add(h);
    }
  }

  buildEnergy() {
    const w = 300;
    const h = 26;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = 34;

    const label = this.scene.add
      .text(GAME_WIDTH / 2, y - 20, 'ENERGY', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        stroke: '#2a1500',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const frame = this.scene.add.graphics();
    frame.fillStyle(0x000000, 0.45);
    frame.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 8);
    frame.lineStyle(2, 0xffe9a8, 0.8);
    frame.strokeRoundedRect(x - 3, y - 3, w + 6, h + 6, 8);

    this.energyFill = this.scene.add.graphics();
    this.energyX = x;
    this.energyY = y;
    this.energyW = w;
    this.energyH = h;

    this.layer.add([label, frame, this.energyFill]);
    this.setEnergy(1);
  }

  buildTimer() {
    this.timerText = this.scene.add
      .text(GAME_WIDTH - 30, 44, '⏱ 00:60', {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#2a1500',
        strokeThickness: 5
      })
      .setOrigin(1, 0.5);
    this.layer.add(this.timerText);
  }

  setHealth(n) {
    this.hearts.forEach((h, i) => h.setColor(i < n ? '#ff3b3b' : '#4a4a4a'));
  }

  // value 0..1
  setEnergy(value) {
    const v = Phaser.Math.Clamp(value, 0, 1);
    // Colour shifts green → yellow → red as it drains.
    let color = 0x4caf50;
    if (v < 0.25) color = 0xe53935;
    else if (v < 0.5) color = 0xffb300;

    this.energyFill.clear();
    this.energyFill.fillStyle(color, 1);
    this.energyFill.fillRoundedRect(
      this.energyX,
      this.energyY,
      Math.max(0, this.energyW * v),
      this.energyH,
      6
    );
  }

  setTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    this.timerText.setText(`⏱ ${mm}:${ss}`);
    this.timerText.setColor(s <= 10 ? '#ff6b6b' : '#ffffff');
  }
}
