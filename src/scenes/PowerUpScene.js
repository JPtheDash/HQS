import Phaser from 'phaser';
import { CENTER_X, CENTER_Y, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, STORY_MUSIC } from '../audio/music.js';

// SCENE 6 — HANUMAN POWERS UP
// scene6.png already shows Hanuman wreathed in golden energy. We add a slow
// upward camera move, swirling golden motes, and a brightening aura, then
// present the mission and a TAP TO JUMP prompt that begins gameplay.
export default class PowerUpScene extends Phaser.Scene {
  constructor() {
    super('PowerUpScene');
  }

  create() {
    playMusic(this, STORY_MUSIC, { volume: 0.5 });
    this.cameras.main.fadeIn(700, 0, 0, 0);

    // Background: cover, then rise slowly while zooming in a touch.
    const bg = this.add.image(CENTER_X, CENTER_Y + 80, 'scene-powerup').setOrigin(0.5);
    const cover = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(cover * 1.12);
    this.tweens.add({
      targets: bg,
      y: CENTER_Y - 60,
      scale: cover * 1.2,
      duration: 6000,
      ease: 'Sine.easeInOut'
    });

    // Swirling golden energy rising around the figure.
    this.add.particles(0, 0, 'glow', {
      x: { min: GAME_WIDTH * 0.3, max: GAME_WIDTH * 0.7 },
      y: { min: GAME_HEIGHT * 0.55, max: GAME_HEIGHT },
      lifespan: 2200,
      speedY: { min: -180, max: -320 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.12, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xffcf5a,
      frequency: 40,
      blendMode: 'ADD'
    });

    // A brightening golden aura wash as the power builds.
    const aura = this.add
      .rectangle(CENTER_X, CENTER_Y, GAME_WIDTH, GAME_HEIGHT, 0xffb437, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: aura, fillAlpha: 0.22, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // After the build-up, present the mission.
    this.time.delayedCall(2200, () => this.showMission());
  }

  showMission() {
    const panelW = 560;
    const panelH = 320;
    const panelY = CENTER_Y - 40;

    const g = this.add.graphics().setAlpha(0);
    g.fillStyle(0x120a02, 0.82);
    g.fillRoundedRect(CENTER_X - panelW / 2, panelY - panelH / 2, panelW, panelH, 24);
    g.lineStyle(3, 0xf5c542, 0.9);
    g.strokeRoundedRect(CENTER_X - panelW / 2, panelY - panelH / 2, panelW, panelH, 24);

    const title = this.add
      .text(CENTER_X, panelY - panelH / 2 + 52, 'MISSION', {
        fontFamily: 'Georgia, serif',
        fontSize: '46px',
        color: '#f5c542',
        fontStyle: 'bold',
        letterSpacing: 3
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const objectives = this.add
      .text(
        CENTER_X,
        panelY + 30,
        'Reach Gandha Mardana\nFind Sanjeevini\nReturn before sunrise',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '30px',
          color: '#ffe9a8',
          align: 'center',
          lineSpacing: 18
        }
      )
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: [g, title, objectives],
      alpha: 1,
      duration: 700,
      onComplete: () => this.time.delayedCall(2600, () => this.showTapPrompt())
    });
  }

  showTapPrompt() {
    const prompt = this.add
      .text(CENTER_X, GAME_HEIGHT - 150, 'TAP TO JUMP', {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#3a1d00',
        strokeThickness: 6
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.35,
      scale: 1.08,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.input.once('pointerdown', () => this.startGameplay());
  }

  startGameplay() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Scene 7 — Chapter 1 gameplay (Ashoka Vatika tutorial).
      this.scene.start('GameScene', { chapter: 1 });
    });
  }
}
