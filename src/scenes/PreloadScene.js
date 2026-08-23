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
    this.load.image('coins', 'assets/menu/coins.png');
    // NOTE: 'glow' is generated procedurally in BootScene (not loaded).

    // ---- Prologue cinematic (Scenes 2-6) ----------------------------
    this.load.image('scene-battle', 'assets/cinematic/scene2.png');    // Battle of Lanka
    this.load.image('scene-fall', 'assets/cinematic/scene3.png');      // Lakshmana falls
    this.load.image('scene-grief', 'assets/cinematic/scene4.png');     // Rama's despair
    this.load.image('scene-dronagiri', 'assets/cinematic/scene26.png');// Dronagiri vista
    this.load.image('scene-accept', 'assets/cinematic/scene5.png');    // Hanuman accepts
    this.load.image('scene-powerup', 'assets/cinematic/scene6.png');   // Hanuman powers up

    // ---- Chapter 1 gameplay (Scene 7+) ------------------------------
    // (Animated 'hero' spritesheet is loaded in BootScene so the loading
    // screen here can already show Hanuman running.)
    this.load.image('ground', 'assets/game/ground.png');
    this.load.image('ledge', 'assets/game/platform-ledge.png');
    this.load.image('banana', 'assets/game/banana.png');
    this.load.image('mango', 'assets/game/Mango.png');
    this.load.image('coconut', 'assets/game/coconut.png');
    this.load.image('boulder', 'assets/game/boulder.png');
    this.load.image('finish-gate', 'assets/game/finish-gate.png');
    this.load.image('herb', 'assets/game/herb.png');
    this.load.image('bg1', 'assets/game/bg1.png');   // Ashoka Vatika garden backdrop
    this.load.image('bg2', 'assets/game/bg2.png');   // temple-garden backdrop
    this.load.image('fire', 'assets/game/fire.png'); // flame hazard sprite

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

    // Hanuman runs above the bar while assets load.
    let runner = null;
    if (this.textures.exists('hero')) {
      runner = this.add.sprite(CENTER_X, y - 130, 'hero').setOrigin(0.5, 1);
      runner.setScale(260 / runner.height);
      if (this.anims.exists('hero-run')) runner.play('hero-run');
    }

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
      if (runner) runner.destroy();
    });
  }
}
