import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

// SCENE 35 — NEXT CHAPTER MAP
// Instead of dumping the player back to the menu, show the journey as a vertical
// map with the cleared route and a locked "coming soon" continuation — the hook
// to keep going.
export default class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    const bgKey = this.textures.exists('bgdronagiri') ? 'bgdronagiri' : 'bg1';
    this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(-10).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a1020, 0.6).setOrigin(0, 0).setDepth(-9);

    this.add.text(GAME_WIDTH / 2, 90, 'THE JOURNEY', { fontFamily: 'Georgia, serif', fontSize: '44px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 6 }).setOrigin(0.5);

    const nodes = [
      ['LANKA', true], ['ASHOKA VATIKA', true], ['THROUGH THE FOREST', true],
      ['INTO THE SKY', true], ['THE STORM', true], ['THE RIVER', true],
      ['HIMALAYAN PATH', true], ['DRONAGIRI', true], ['RETURN BEFORE DAWN', true],
      ['CHAPTER 2 — COMING SOON', false]
    ];
    const top = 170, gap = 52;
    nodes.forEach(([label, done], i) => {
      const y = top + i * gap;
      const color = done ? 0x6fe06f : 0x7a7a8a;
      this.add.circle(90, y, 12, color).setStrokeStyle(3, 0xffffff, 0.8);
      if (i < nodes.length - 1) this.add.rectangle(90, y + gap / 2, 4, gap - 24, 0xffffff, 0.3).setOrigin(0.5);
      const mark = done ? '✔' : '🔒';
      this.add.text(120, y, `${label}  ${mark}`, { fontFamily: 'Georgia, serif', fontSize: done ? '22px' : '20px', color: done ? '#ffffff' : '#c8c8d8', fontStyle: done ? 'bold' : 'normal', stroke: '#2a1500', strokeThickness: 3 }).setOrigin(0, 0.5);
    });

    const coins = this.registry.get('coinTotal') || 0;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 210, `Total coins:  ${coins}`, { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#ffe9a8', stroke: '#2a1500', strokeThickness: 4 }).setOrigin(0.5);

    const btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 130, 320, 74, 0x000000, 0.4).setStrokeStyle(3, 0xffe9a8, 0.8).setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 130, 'BACK TO MENU', { fontFamily: 'Georgia, serif', fontSize: '28px', color: '#ffe9a8', fontStyle: 'bold' }).setOrigin(0.5);
    const go = () => { this.cameras.main.fadeOut(400, 0, 0, 0); this.time.delayedCall(420, () => this.scene.start('HomeScene')); };
    btn.on('pointerdown', go);
    this.input.keyboard.once('keydown', go);
  }
}
