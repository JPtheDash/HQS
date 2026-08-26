import Phaser from 'phaser';
import { CENTER_X, CENTER_Y, COLORS } from '../config/gameConfig.js';
import { cleanGroundSky } from '../utils/cleanTexture.js';

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
    this.load.image('ledge-small', 'assets/game/ledge-small.png'); // compact island for narrow branches
    this.load.image('banana', 'assets/game/banana.png');
    this.load.image('mango', 'assets/game/Mango.png');
    this.load.image('coconut', 'assets/game/coconut.png');
    this.load.image('boulder', 'assets/game/boulder.png');
    this.load.image('finish-gate', 'assets/game/finish-gate.png');
    this.load.image('herb', 'assets/game/herb.png');
    this.load.image('thorns', 'assets/game/thorns.png');   // ornate thorn-vine hazard
    this.load.image('fire-new', 'assets/game/fire-new.png'); // wide flame hazard
    this.load.image('bg1', 'assets/game/bg1.png');   // Ashoka Vatika garden backdrop
    this.load.image('bg2', 'assets/game/bg2.png');   // temple-garden backdrop
    this.load.image('fire', 'assets/game/fire.png'); // flame hazard sprite
    // ---- Chapter 2+ biome backdrops (2:1 parallax paintings) ---------
    this.load.image('bgfruit', 'assets/game/bg-fruitforest.png');
    this.load.image('bgsky', 'assets/game/bg-sky.png');
    this.load.image('bgstorm', 'assets/game/bg-storm.png');
    this.load.image('bgmagic', 'assets/game/bg-magicforest.png');
    this.load.image('bgdark', 'assets/game/bg-darkforest.png');
    this.load.image('bgriver', 'assets/game/bg-river.png');
    this.load.image('bgriverboss', 'assets/game/bg-riverboss.png');
    this.load.image('bgmountain', 'assets/game/bg-mountain.png');
    this.load.image('bgdronagiri', 'assets/game/bg-dronagiri.png');
    this.load.image('bgdawn', 'assets/game/bg-dawnsky.png');
    this.load.image('bglanka', 'assets/cinematic/scene2.png'); // Lanka battlefield (finale)
    this.load.spritesheet('bat', 'assets/game/bat.png', { frameWidth: 453, frameHeight: 448 });
    this.load.spritesheet('fireball', 'assets/game/fireball.png', { frameWidth: 559, frameHeight: 401 });
    this.load.image('gada', 'assets/game/gada.png'); // thrown mace projectile
    this.load.image('rakshasa', 'assets/game/rakshasa.png'); // demon enemy
    this.load.image('boss', 'assets/game/boss.png'); // river guardian boss
    // ---- Ornate UI buttons (pause / resume / reset / home) ------------
    this.load.image('btn-pause', 'assets/game/btn-pause.png');
    this.load.image('btn-resume', 'assets/game/btn-resume.png');
    this.load.image('btn-reset', 'assets/game/btn-reset.png');
    this.load.image('btn-home', 'assets/game/btn-home.png');
    // ---- Storm level art (cloud platforms, hazard clouds, lightning) ---
    this.load.image('whitecloud', 'assets/game/whitecloud.png'); // landable cloud platform
    this.load.image('stormcloud', 'assets/game/stormcloud.png'); // dark hazard cloud
    this.load.image('thunder', 'assets/game/thunder.png');       // lightning strike
    // ---- Ornate HUD gauge art (icon + full/empty bar combos) ----------
    this.load.image('hud-heart', 'assets/game/hud-heart.png');
    this.load.image('hud-energy', 'assets/game/hud-energy.png');
    this.load.image('hud-timer', 'assets/game/hud-timer.png');

    // ---- Music ------------------------------------------------------
    this.load.audio('story-music', 'assets/audio/hanumanstory.mp3');
    this.load.audio('game-music', 'assets/audio/game.mp3');
    // ------------------------------------------------------------------
  }

  create() {
    // ground.png is an opaque strip (grey sky + grass + dirt); clear just the
    // sky once here so every scene's tiled ground shows the parallax behind it
    // without eating the dirt. After this it has real alpha and the generic
    // stripBackground('ground') calls in scenes auto-skip it.
    cleanGroundSky(this);
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

    // Hanuman runs above the bar while assets load. Prefer the run cycle baked
    // from the user's newer hero sheet ('load-run'); fall back to hero6.
    let runner = null;
    if (this.textures.exists('hero-load-run') && this.anims.exists('load-run')) {
      runner = this.add.sprite(CENTER_X, y - 120, 'hero-load-run', 0).setOrigin(0.5, 1);
      runner.setScale(300 / runner.height);
      runner.play('load-run');
    } else if (this.textures.exists('hero')) {
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
