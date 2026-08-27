import Phaser from 'phaser';
import { CENTER_X, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, STORY_MUSIC } from '../audio/music.js';

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
    this.buildCoinPanel(this.registry.get('coinTotal') || 0);
    this.buildPlayButton();
    this.buildIconButtons();

    // Story track for the menu (and all non-gameplay screens). Music defaults ON
    // (audible) unless the player has turned it off; apply that choice cleanly.
    playMusic(this, STORY_MUSIC, { volume: 0.45 });
    if (this.registry.get('musicOn') === undefined) this.registry.set('musicOn', true);
    this.setMusicOn(this.registry.get('musicOn'));

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

  // --- Coin counter (top-right): coins.png medallion + amount on a pill ---
  buildCoinPanel(amount) {
    const coinSize = 62;
    const cx = GAME_WIDTH - 44;
    const cy = 60;

    // Dark rounded pill behind the number for readability over bright sky.
    const pillW = 120;
    const pill = this.add.graphics();
    pill.fillStyle(0x1a0d00, 0.55);
    pill.fillRoundedRect(cx - coinSize / 2 - pillW, cy - 26, pillW + coinSize / 2, 52, 26);

    this.add
      .text(cx - coinSize / 2 - 14, cy, String(amount), {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#ffe9a8',
        fontStyle: 'bold',
        stroke: '#2a1500',
        strokeThickness: 3
      })
      .setOrigin(1, 0.5);

    // Ornate Hanuman medallion sits on the right end of the pill.
    const coin = this.add.image(cx, cy, 'coins').setOrigin(0.5);
    coin.setScale(coinSize / coin.width);
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
    if (this.modal) return; // one panel at a time
    if (label === 'SOUND') {
      const on = this.setMusicOn(!this.isMusicOn());
      this.cameras.main.flash(150, on ? 255 : 120, 220, 120);
      this.floatHint(on ? '🔊 Music ON' : '🔇 Music OFF');
      return;
    }
    if (label === 'SETTINGS') this.openSettings();
    else if (label === 'STORY') this.openStory();
  }

  // Whether the background music is currently playing (audible).
  isMusicOn() {
    const v = this.registry.get('musicOn');
    return v === undefined ? !this.sound.mute : v;
  }

  // Turn the music on/off by actually pausing/resuming the track (and matching
  // the mute flag). Setting mute alone is unreliable — Phaser's mute gain never
  // takes effect if it was set while the audio context was still locked — so we
  // control the track directly here. Persists across scenes via the registry.
  setMusicOn(on) {
    this.registry.set('musicOn', on);
    this.sound.mute = !on;
    const bgm = this.registry.get('bgm.sound');
    if (bgm) {
      try {
        if (on) { if (bgm.isPaused) bgm.resume(); }   // music.js starts it on unlock
        else if (bgm.isPlaying) bgm.pause();
      } catch (e) { /* ignore audio hiccups */ }
    }
    return on;
  }

  // --- Modal panel scaffold ---------------------------------------------
  openModal(title) {
    const dim = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.62)
      .setDepth(3000).setInteractive();
    const panelW = GAME_WIDTH * 0.82;
    const panelH = GAME_HEIGHT * 0.5;
    const panel = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, panelW, panelH, 0x2a1608, 0.98)
      .setStrokeStyle(4, 0xffd873).setDepth(3001);
    const top = GAME_HEIGHT / 2 - panelH / 2;
    const titleT = this.add.text(CENTER_X, top + 46, title, {
      fontFamily: 'Georgia, serif', fontSize: '44px', color: '#ffd873',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(3002);

    // Close (✕) button.
    const close = this.add.text(CENTER_X + panelW / 2 - 40, top + 40, '✕', {
      fontFamily: 'Arial', fontSize: '40px', color: '#ffd873', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3002).setInteractive({ useHandCursor: true });

    this.modal = this.add.container(0, 0, [dim, panel, titleT, close]).setDepth(3000);
    const doClose = () => this.closeModal();
    close.on('pointerup', doClose);
    dim.on('pointerup', doClose);
    return { top, panelW, panelH, addToModal: (o) => this.modal.add(o) };
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.destroy();
    this.modal = null;
  }

  panelButton(x, y, label, onClick, w = 360) {
    const bg = this.add.rectangle(x, y, w, 66, 0x4a2a12, 1).setStrokeStyle(3, 0xffd873)
      .setDepth(3002).setInteractive({ useHandCursor: true });
    const t = this.add.text(x, y, label, {
      fontFamily: 'Georgia, serif', fontSize: '30px', color: '#ffe9a8', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(3003);
    bg.on('pointerover', () => bg.setFillStyle(0x6a3c1a, 1));
    bg.on('pointerout', () => bg.setFillStyle(0x4a2a12, 1));
    bg.on('pointerup', () => onClick(t, bg));
    this.modal.add([bg, t]);
    return { bg, t };
  }

  // Show a pre-rendered panel image (buttons baked into the art) dimmed over the
  // menu, returning its on-screen rect so callers can drop invisible clickable
  // hit-zones onto the baked buttons.
  showPanelImage(key) {
    const dim = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.66)
      .setDepth(3000).setInteractive();
    const img = this.add.image(CENTER_X, GAME_HEIGHT / 2, key).setDepth(3001).setInteractive(); // swallow taps on the panel body
    const src = this.textures.get(key).getSourceImage();
    const panelW = Math.min(GAME_WIDTH * 0.98, src.width);
    const scale = panelW / src.width;
    img.setScale(scale);
    const panelH = src.height * scale;
    this.modal = this.add.container(0, 0, [dim, img]).setDepth(3000);
    dim.on('pointerup', () => this.closeModal()); // tapping outside the panel closes it
    return { left: CENTER_X - panelW / 2, top: GAME_HEIGHT / 2 - panelH / 2, w: panelW, h: panelH };
  }

  // Invisible clickable rectangle over a baked button, positioned by fractions
  // (top-left fx,fy and size fw,fh) of the panel rect. Flashes on press.
  hitZone(p, fx, fy, fw, fh, onClick) {
    const z = this.add.rectangle(
      p.left + (fx + fw / 2) * p.w, p.top + (fy + fh / 2) * p.h, fw * p.w, fh * p.h, 0xffffff, 0
    ).setDepth(3003).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => z.setFillStyle(0xffffff, 0.16));
    z.on('pointerout', () => z.setFillStyle(0xffffff, 0));
    z.on('pointerup', () => { z.setFillStyle(0xffffff, 0); onClick(); });
    this.modal.add(z);
    return z;
  }

  openSettings() {
    if (this.modal) this.closeModal();
    const p = this.showPanelImage('settings-panel');
    // Music ON/OFF indicator over the right of the baked Music button.
    const stateT = this.add.text(p.left + 0.71 * p.w, p.top + 0.345 * p.h,
      this.isMusicOn() ? 'ON' : 'OFF', {
        fontFamily: 'Georgia, serif', fontSize: '26px', color: '#3a1c00', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(3004);
    this.modal.add(stateT);

    this.hitZone(p, 0.19, 0.305, 0.62, 0.078, () => {
      const on = this.setMusicOn(!this.isMusicOn());
      stateT.setText(on ? 'ON' : 'OFF');
    });
    this.hitZone(p, 0.19, 0.430, 0.62, 0.078, () => {});               // Language (English only)
    this.hitZone(p, 0.19, 0.555, 0.62, 0.078, () => this.openAbout()); // About
    this.hitZone(p, 0.30, 0.795, 0.40, 0.066, () => this.closeModal()); // CLOSE
    this.hitZone(p, 0.74, 0.125, 0.15, 0.075, () => this.closeModal()); // ✕
  }

  openAbout() {
    if (this.modal) this.closeModal();
    const p = this.showPanelImage('about-panel');
    this.hitZone(p, 0.24, 0.790, 0.52, 0.072, () => this.openSettings()); // BACK → Settings
    this.hitZone(p, 0.75, 0.130, 0.15, 0.075, () => this.closeModal());   // ✕
  }

  openStory() {
    if (this.modal) this.closeModal();
    const p = this.showPanelImage('story-panel');
    this.hitZone(p, 0.22, 0.795, 0.56, 0.105, () => { this.closeModal(); this.playIntro(); }); // Watch Intro
    this.hitZone(p, 0.84, 0.095, 0.13, 0.09, () => this.closeModal());                          // ✕
  }

  modalBottomOffset() {
    return GAME_HEIGHT * 0.5 - 70; // near the bottom edge of the panel
  }

  floatHint(msg) {
    const t = this.add
      .text(CENTER_X, GAME_HEIGHT - 210, msg, {
        fontFamily: 'Georgia, serif', fontSize: '28px', color: '#ffe9a8',
        fontStyle: 'bold', stroke: '#2a1500', strokeThickness: 5
      })
      .setOrigin(0.5)
      .setDepth(500);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  startGame() {
    // PLAY → resume from the furthest level reached, else play the intro fresh.
    const saved = this.getSavedLevel();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(620, () => this.scene.start(saved || 'CinematicScene'));
  }

  // Always play the opening cinematic (used by "Watch Intro").
  playIntro() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(620, () => this.scene.start('CinematicScene'));
  }

  // The furthest gameplay level the player has reached (saved by the HUD),
  // or null for a brand-new game. Persists across sessions via localStorage.
  getSavedLevel() {
    const LEVELS = ['GameScene', 'TreeScene', 'DangerScene', 'TiredScene',
      'FruitForestScene', 'SkyScene', 'StormScene', 'MagicForestScene',
      'RakshasaScene', 'MountainScene', 'RiverScene', 'RiverBossScene', 'DronagiriScene'];
    try {
      const k = localStorage.getItem('hqs.level');
      return LEVELS.includes(k) ? k : null;
    } catch (e) { return null; }
  }
}
