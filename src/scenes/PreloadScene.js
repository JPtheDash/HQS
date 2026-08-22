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

    // ---- Main menu ---------------------------------------------------
    this.load.image('menu-bg', 'assets/menu/mainbackground.png');
    this.load.image('menu-play', 'assets/menu/play.png');
    this.load.image('menu-settings', 'assets/menu/setting.png');
    this.load.image('menu-sound', 'assets/menu/sound.png');
    this.load.image('menu-story', 'assets/menu/story.png');
    this.load.image('menu-coinpanel', 'assets/menu/coinpanel.png');
    this.load.image('coin', 'assets/menu/coin.png');
    this.load.image('glow', 'assets/menu/glow.png');

    // ---- Prologue cinematic (Scenes 2-5) ----------------------------
    this.load.image('cine-battlefield', 'assets/cinematic/cine-1-battlefield.png');
    this.load.image('cine-fall', 'assets/cinematic/cine-2-lakshmana-falls.png');
    this.load.image('cine-grief', 'assets/cinematic/cine-3-grief.png');
    this.load.image('cine-dronagiri', 'assets/cinematic/cine-4-dronagiri.png');
    this.load.image('cine-dawn', 'assets/cinematic/cine-5-bows-to-rama.png');

    // ---- Music ------------------------------------------------------
    this.load.audio('story-music', 'assets/audio/hanumanstory.mp3');
    this.load.audio('game-music', 'assets/audio/game.mp3');
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
