import Phaser from 'phaser';
import { CENTER_X, CENTER_Y, COLORS } from '../config/gameConfig.js';

// PreloadScene loads every asset the game uses up front and shows a simple
// progress bar while it does. As you send assets, they get queued in
// preload() and the bar reflects real load progress.
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.drawProgressBar();

    // ---- Asset queue -------------------------------------------------
    // Assets go here as they arrive, e.g.:
    //   this.load.image('hanuman', 'assets/characters/hanuman.png');
    //   this.load.audio('theme', 'assets/audio/theme.mp3');
    // ------------------------------------------------------------------
  }

  create() {
    this.scene.start('HomeScene');
  }

  // A minimal loading bar so the boot never looks frozen once real assets
  // start streaming in.
  drawProgressBar() {
    const barWidth = 420;
    const barHeight = 28;
    const x = CENTER_X - barWidth / 2;
    const y = CENTER_Y - barHeight / 2;

    const label = this.add
      .text(CENTER_X, y - 40, 'Loading…', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: COLORS.text
      })
      .setOrigin(0.5);

    const frame = this.add.graphics();
    frame.lineStyle(2, COLORS.accent, 1);
    frame.strokeRect(x, y, barWidth, barHeight);

    const fill = this.add.graphics();

    this.load.on('progress', (value) => {
      fill.clear();
      fill.fillStyle(COLORS.accent, 1);
      fill.fillRect(x + 3, y + 3, (barWidth - 6) * value, barHeight - 6);
    });

    this.load.on('complete', () => {
      label.destroy();
      frame.destroy();
      fill.destroy();
    });
  }
}
