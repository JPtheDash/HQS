import Phaser from 'phaser';

// BootScene runs first. It only loads the handful of assets the loading
// screen itself needs (e.g. a logo or progress-bar art), then hands off to
// PreloadScene which loads the bulk of the game. Right now there's nothing
// to load, so it passes straight through.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Boot-screen assets go here later (logo, progress bar frame, etc.).
  }

  create() {
    this.scene.start('PreloadScene');
  }
}
