import Phaser from 'phaser';
import { CENTER_X, CENTER_Y, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig.js';

// HomeScene is the title screen — the first thing the player sees. This is a
// placeholder that confirms the foundation runs; we'll rebuild it properly
// once you send the home-screen art and describe the layout you want.
export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    // Simple gradient-ish backdrop until the real background art lands.
    this.add.rectangle(CENTER_X, CENTER_Y, GAME_WIDTH, GAME_HEIGHT, COLORS.bg);

    this.add
      .text(CENTER_X, CENTER_Y - 60, 'Hanuman', {
        fontFamily: 'Georgia, serif',
        fontSize: '84px',
        color: COLORS.text,
        fontStyle: 'bold'
      })
      .setOrigin(0.5);

    this.add
      .text(CENTER_X, CENTER_Y + 20, 'Quest for Sanjeevini', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#ffb703'
      })
      .setOrigin(0.5);

    this.add
      .text(CENTER_X, GAME_HEIGHT - 80, 'foundation ready — send assets to begin', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: COLORS.textMuted
      })
      .setOrigin(0.5);
  }
}
