import Phaser from 'phaser';
import { CENTER_X, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

// SCENE 1 — MAIN MENU
// Cinematic title screen. The backdrop (Hanuman on the cliff at sunrise) is a
// single baked image; we layer the UI, some floating light motes, and a very
// slow "breathing" zoom on the background so the screen feels alive rather
// than static — the goal is "I'm about to experience a story", not a button
// menu.
export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    this.buildBackground();
    this.buildParticles();
    this.buildTitle();
    this.buildCoinPanel(90);
    this.buildQuote();
    this.buildPlayButton();
    this.buildIconButtons();

    // Gentle fade-in from black on first entry.
    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  // --- Background: cover the screen, then breathe slowly ------------------
  buildBackground() {
    const bg = this.add.image(CENTER_X, GAME_HEIGHT / 2, 'menu-bg').setOrigin(0.5);
    const cover = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(cover);

    // Slow Ken-Burns zoom to imply drifting clouds / a living scene.
    this.tweens.add({
      targets: bg,
      scale: cover * 1.06,
      duration: 12000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  // --- Floating golden light motes ---------------------------------------
  buildParticles() {
    this.add.particles(0, 0, 'glow', {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 20,
      lifespan: 9000,
      speedY: { min: -40, max: -80 },
      speedX: { min: -12, max: 12 },
      scale: { start: 0.06, end: 0.14 },
      alpha: { start: 0, end: 0.5, ease: 'Sine.easeIn' },
      quantity: 1,
      frequency: 600,
      blendMode: 'ADD'
    });
  }

  // --- Ornate gold title -------------------------------------------------
  buildTitle() {
    const title = this.add
      .text(CENTER_X, 175, 'HANUMAN', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '110px',
        fontStyle: 'bold',
        color: '#f5c542',
        stroke: '#3a1d00',
        strokeThickness: 10,
        shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 12, fill: true }
      })
      .setOrigin(0.5);
    this.applyGoldGradient(title);

    // Divider + subtitle on a dark ribbon for readability against bright sky.
    const subY = 250;
    this.add
      .rectangle(CENTER_X, subY, 520, 52, 0x1a0d00, 0.55)
      .setOrigin(0.5);
    this.add
      .text(CENTER_X, subY, 'QUEST FOR SANJEEVINI', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '34px',
        color: '#ffe9a8',
        letterSpacing: 2,
        stroke: '#3a1d00',
        strokeThickness: 4
      })
      .setOrigin(0.5);
  }

  // Paints a vertical gold gradient onto a Text object's fill.
  applyGoldGradient(textObj) {
    const grad = textObj.context.createLinearGradient(0, 0, 0, textObj.height);
    grad.addColorStop(0, '#fff6c9');
    grad.addColorStop(0.45, '#f6c945');
    grad.addColorStop(0.6, '#e0a021');
    grad.addColorStop(1, '#a86a12');
    textObj.setFill(grad);
  }

  // --- Coin counter (top-right) ------------------------------------------
  buildCoinPanel(amount) {
    const panel = this.add.image(GAME_WIDTH - 150, 70, 'menu-coinpanel').setOrigin(0.5);
    panel.setScale(240 / panel.width);
    const b = panel.getBounds();

    this.add.image(b.left + 34, b.centerY, 'coin').setScale(48 / 1024).setOrigin(0.5);
    this.add
      .text(b.left + 70, b.centerY, String(amount), {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#ffe9a8',
        fontStyle: 'bold'
      })
      .setOrigin(0, 0.5);
  }

  // --- Tagline quote -----------------------------------------------------
  buildQuote() {
    this.add
      .text(
        CENTER_X,
        GAME_HEIGHT - 430,
        '"A devotee\'s strength.\nA hero\'s journey.\nA legend forever."',
        {
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          color: '#ffe9a8',
          align: 'center',
          fontStyle: 'italic',
          lineSpacing: 8,
          stroke: '#2a1500',
          strokeThickness: 4
        }
      )
      .setOrigin(0.5);
  }

  // --- PLAY button -------------------------------------------------------
  buildPlayButton() {
    const y = GAME_HEIGHT - 300;
    const play = this.add
      .image(CENTER_X, y, 'menu-play')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    play.setScale(520 / play.width);
    const baseScale = play.scale;

    // Soft pulsing glow behind the button.
    const halo = this.add
      .image(CENTER_X, y, 'glow')
      .setScale(1.6)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    halo.setDepth(play.depth - 1);
    this.tweens.add({
      targets: halo,
      alpha: 0.6,
      scale: 1.9,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.addButtonFeedback(play, baseScale, () => this.startGame());
  }

  // --- Settings / Sound / Story icon row ---------------------------------
  buildIconButtons() {
    const y = GAME_HEIGHT - 130;
    const spacing = 200;
    this.makeIconButton(CENTER_X - spacing, y, 'menu-settings', 'SETTINGS');
    this.makeIconButton(CENTER_X, y, 'menu-sound', 'SOUND');
    this.makeIconButton(CENTER_X + spacing, y, 'menu-story', 'STORY');
  }

  makeIconButton(x, y, key, label) {
    const icon = this.add
      .image(x, y - 18, key)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    icon.setScale(120 / icon.width);
    const baseScale = icon.scale;

    this.add
      .text(x, y + 52, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        stroke: '#2a1500',
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.addButtonFeedback(icon, baseScale, () => this.onIcon(label));
  }

  // Shared hover/press animation + click handler for any button image.
  addButtonFeedback(obj, baseScale, onClick) {
    obj.on('pointerover', () =>
      this.tweens.add({ targets: obj, scale: baseScale * 1.06, duration: 120 })
    );
    obj.on('pointerout', () =>
      this.tweens.add({ targets: obj, scale: baseScale, duration: 120 })
    );
    obj.on('pointerdown', () =>
      this.tweens.add({ targets: obj, scale: baseScale * 0.94, duration: 80 })
    );
    obj.on('pointerup', () => {
      this.tweens.add({ targets: obj, scale: baseScale * 1.06, duration: 80 });
      onClick();
    });
  }

  onIcon(label) {
    // Placeholder — Settings/Sound/Story panels come later. Flash for feedback.
    this.cameras.main.flash(150, 255, 220, 120);
  }

  startGame() {
    // PLAY → the Ramayana cinematic (Scenes 2–5).
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CinematicScene');
    });
  }
}
