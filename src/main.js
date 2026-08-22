import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/gameConfig.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import HomeScene from './scenes/HomeScene.js';
import CinematicScene from './scenes/CinematicScene.js';
import PowerUpScene from './scenes/PowerUpScene.js';

// One game config, kept small on purpose. New scenes get added to the
// `scene` array below in the order they should be registered (the first
// one is started automatically).
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: COLORS.bg,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  // FIT keeps the whole design visible and letterboxes the rest; CENTER_BOTH
  // pins that letterboxed view to the middle of the screen.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // Physics is off until a scene needs it — we'll switch this on when we
  // build the flying/gameplay screen.
  render: {
    pixelArt: false,
    antialias: true
  },
  scene: [BootScene, PreloadScene, HomeScene, CinematicScene, PowerUpScene]
};

// Exposed so headless preview tooling (tools/shot.mjs) can jump straight to a
// scene, and for quick debugging in the console.
window.game = new Phaser.Game(config);
