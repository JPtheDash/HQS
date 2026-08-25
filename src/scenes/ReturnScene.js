import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, GAME_MUSIC } from '../audio/music.js';

// SCENES 30–34 — RETURN, REVIVAL, VICTORY (finale)
// A short cinematic: the dawn return flight, reaching Lanka with the mountain,
// the Sanjeevini reviving Lakshmana, and the MISSION COMPLETE summary with stars
// and the run's coin total. Tap to advance each beat.
export default class ReturnScene extends Phaser.Scene {
  constructor() {
    super('ReturnScene');
  }

  create() {
    this.cameras.main.fadeIn(700, 0, 0, 0);
    playMusic(this, GAME_MUSIC, { volume: 0.45 });

    // [backdrop key, line] beats.
    this.beats = [
      ['bgdawn', 'Night gave way to purple, then to gold…'],
      ['bgdawn', 'Racing the sunrise, Hanuman carried Dronagiri home.'],
      ['bglanka', 'He reached Lanka as the first light touched the field.'],
      ['bglanka', 'The Sanjeevini was brought to Lakshmana.'],
      ['bglanka', 'A golden-green light spread… and Lakshmana lived.']
    ];
    this.idx = -1;

    this.bgImg = this.add.image(0, 0, 'bgdawn').setOrigin(0, 0).setDepth(-10).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.dim = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.25).setOrigin(0, 0).setDepth(-9);
    this.caption = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 200, '', {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#fff2d0', align: 'center',
      stroke: '#2a1500', strokeThickness: 5, wordWrap: { width: GAME_WIDTH - 120 }
    }).setOrigin(0.5).setDepth(20);
    this.hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 90, 'tap to continue', { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ffffff' }).setOrigin(0.5).setDepth(20).setAlpha(0.6);

    this.input.on('pointerdown', () => this.next());
    this.input.keyboard.on('keydown', () => this.next());
    this.next();
  }

  next() {
    if (this._busy) return;
    this.idx += 1;
    if (this.idx >= this.beats.length) { this.showVictory(); return; }
    this._busy = true;
    const [key, line] = this.beats[this.idx];
    const useKey = this.textures.exists(key) ? key : (this.textures.exists('bgdawn') ? 'bgdawn' : 'bg1');
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(320, () => {
      this.bgImg.setTexture(useKey).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      this.caption.setText(line);
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this._busy = false;
    });
  }

  showVictory() {
    if (this._done) return;
    this._done = true;
    this.caption.setText('');
    this.hint.setVisible(false);
    this.dim.setFillStyle(0x000000, 0.55);

    const coins = this.registry.get('coinTotal') || 0;
    this.add.text(GAME_WIDTH / 2, 260, 'MISSION COMPLETE', { fontFamily: 'Georgia, serif', fontSize: '52px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 7 }).setOrigin(0.5).setDepth(30);
    this.add.text(GAME_WIDTH / 2, 340, '⭐ SANJEEVINI FOUND ⭐', { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#fff2d0' }).setOrigin(0.5).setDepth(30);

    // Stars pop in.
    const starY = 470;
    for (let i = 0; i < 3; i++) {
      const s = this.add.star(GAME_WIDTH / 2 + (i - 1) * 120, starY, 5, 26, 56, 0xffd23b).setDepth(30).setScale(0).setStrokeStyle(4, 0xfff2c0);
      this.tweens.add({ targets: s, scale: 1, duration: 400, delay: 300 + i * 260, ease: 'Back.easeOut' });
    }

    this.add.text(GAME_WIDTH / 2, 640, `Coins collected:  ${coins}`, { fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe9a8', stroke: '#2a1500', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
    this.add.text(GAME_WIDTH / 2, 700, 'Lakshmana lived. Chapter 1 complete.', { fontFamily: 'Georgia, serif', fontSize: '22px', color: '#ffffff' }).setOrigin(0.5).setDepth(30);

    const cont = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 160, 'Tap to see the journey', { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#ffffff', stroke: '#2a1500', strokeThickness: 4 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: cont, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    this.input.removeAllListeners('pointerdown');
    this.time.delayedCall(1400, () => {
      this.input.once('pointerdown', () => { this.cameras.main.fadeOut(400, 0, 0, 0); this.time.delayedCall(420, () => this.scene.start('MapScene')); });
    });
  }
}
