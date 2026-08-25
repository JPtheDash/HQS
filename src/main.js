import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config/gameConfig.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import HomeScene from './scenes/HomeScene.js';
import CinematicScene from './scenes/CinematicScene.js';
import PowerUpScene from './scenes/PowerUpScene.js';
import GameScene from './scenes/GameScene.js';
import TreeScene from './scenes/TreeScene.js';
import DangerScene from './scenes/DangerScene.js';
import TiredScene from './scenes/TiredScene.js';
import FruitForestScene from './scenes/FruitForestScene.js';
import SkyScene from './scenes/SkyScene.js';
import StormScene from './scenes/StormScene.js';
import MagicForestScene from './scenes/MagicForestScene.js';
import RakshasaScene from './scenes/RakshasaScene.js';
import MountainScene from './scenes/MountainScene.js';
import RiverScene from './scenes/RiverScene.js';
import RiverBossScene from './scenes/RiverBossScene.js';

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
  render: {
    pixelArt: false,
    antialias: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 2000 },
      debug: false
    }
  },
  scene: [BootScene, PreloadScene, HomeScene, CinematicScene, PowerUpScene, GameScene, TreeScene, DangerScene, TiredScene, FruitForestScene, SkyScene, StormScene, MagicForestScene, RakshasaScene, MountainScene, RiverScene, RiverBossScene]
};

// Exposed so headless preview tooling (tools/shot.mjs) can jump straight to a
// scene, and for quick debugging in the console.
window.game = new Phaser.Game(config);
