import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

// A lightweight overlay launched on top of a PAUSED gameplay scene. It offers
// Resume (play), Reset (restart the level) and Home (back to the main menu),
// using the ornate button art (btn-resume / btn-reset / btn-home). The gameplay
// scene is paused while this runs, so its physics/timers freeze; this overlay
// stays interactive because it is its own active scene.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  init(data) {
    this.fromKey = data && data.from;
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x08101e, 0.76)
      .setOrigin(0, 0).setInteractive(); // swallow taps behind the panel

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.30, 'PAUSED', {
      fontFamily: 'Georgia, serif', fontSize: '60px', color: '#ffe9a8', fontStyle: 'bold',
      stroke: '#2a1500', strokeThickness: 8
    }).setOrigin(0.5);

    const y = GAME_HEIGHT * 0.52;
    this.iconButton(GAME_WIDTH / 2 - 205, y, 'btn-resume', 'RESUME', () => this.resumeGame());
    this.iconButton(GAME_WIDTH / 2, y, 'btn-reset', 'RESET', () => this.resetGame());
    this.iconButton(GAME_WIDTH / 2 + 205, y, 'btn-home', 'HOME', () => this.goHome());

    this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
  }

  iconButton(x, y, key, label, cb) {
    const SZ = 150;
    let btn;
    if (this.textures.exists(key)) {
      btn = this.add.image(x, y, key).setDisplaySize(SZ, SZ);
    } else {
      btn = this.add.circle(x, y, SZ / 2, 0x000000, 0.5).setStrokeStyle(4, 0xffe9a8, 0.9);
    }
    btn.setInteractive({ useHandCursor: true });
    this.add.text(x, y + 96, label, {
      fontFamily: 'Georgia, serif', fontSize: '27px', color: '#ffe9a8', fontStyle: 'bold',
      stroke: '#2a1500', strokeThickness: 4
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setDisplaySize(SZ * 1.09, SZ * 1.09));
    btn.on('pointerout', () => btn.setDisplaySize(SZ, SZ));
    btn.on('pointerup', cb);
    return btn;
  }

  resumeGame() {
    if (this.fromKey) this.scene.resume(this.fromKey);
    this.scene.stop();
  }

  resetGame() {
    const k = this.fromKey;
    this.scene.stop();
    if (k) { this.game.scene.stop(k); this.game.scene.start(k); }
  }

  goHome() {
    const k = this.fromKey;
    this.scene.stop();
    if (k) this.game.scene.stop(k);
    this.game.scene.start('HomeScene');
  }
}
