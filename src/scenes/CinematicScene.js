import Phaser from 'phaser';
import { CENTER_X, CENTER_Y, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { playMusic, STORY_MUSIC } from '../audio/music.js';

// SCENES 2-5 — PROLOGUE CINEMATIC
// A sequence of atmospheric "beats". Each beat shows one scene plate with a
// slow camera move + effect, and fades narrative lines in and out over it.
// The plates are used as-is; all life comes from camera work, lighting, and
// text (per the "keep scenes as-is, add zoom/effects" direction).

const BEATS = [
  {
    key: 'scene-battle',
    cam: { fromScale: 1.02, toScale: 1.16, fromY: 0, toY: 30 }, // slow push-in
    lines: [
      'The battle of Lanka had reached\nits final and fiercest hour.',
      'But darkness had one final weapon.'
    ]
  },
  {
    key: 'scene-fall',
    cam: { fromScale: 1.25, toScale: 1.12, fromY: 0, toY: 0 }, // punch-in easing out
    effect: 'strike',
    lines: ['Lakshmana had fallen.', 'His life was fading.']
  },
  {
    key: 'scene-grief',
    cam: { fromScale: 1.04, toScale: 1.14, fromY: -20, toY: 20 },
    effect: 'embers',
    lines: ['Only the Sanjeevini herb\ncould save Lakshmana.']
  },
  {
    key: 'scene-dronagiri',
    cam: { fromScale: 1.18, toScale: 1.06, fromY: 60, toY: -40 }, // pan up the peak
    effect: 'herbGlow',
    lines: ['But the herb grew far away,\nupon the sacred mountain of Gandha Mardana.']
  },
  {
    key: 'scene-accept',
    cam: { fromScale: 1.14, toScale: 1.04, fromY: 20, toY: -10 },
    effect: 'dawn',
    lines: ['"Leave it to me."', '"I will bring the Sanjeevini before sunrise."']
  }
];

const LINE_IN = 600;
const LINE_HOLD = 2400;
const LINE_OUT = 600;
const BEAT_FADE = 600;

export default class CinematicScene extends Phaser.Scene {
  constructor() {
    super('CinematicScene');
  }

  create() {
    playMusic(this, STORY_MUSIC, { volume: 0.45 });

    this.finished = false;
    this.beatIndex = 0;
    this.beatLayer = this.add.container(0, 0); // holds per-beat objects

    // Persistent caption band + text at the bottom.
    this.captionBand = this.add
      .rectangle(CENTER_X, GAME_HEIGHT - 150, GAME_WIDTH, 200, 0x000000, 0.55)
      .setOrigin(0.5)
      .setAlpha(0);
    this.caption = this.add
      .text(CENTER_X, GAME_HEIGHT - 150, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#ffe9a8',
        align: 'center',
        lineSpacing: 10,
        stroke: '#000000',
        strokeThickness: 4,
        wordWrap: { width: GAME_WIDTH - 120 }
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.buildSkipButton();

    this.cameras.main.fadeIn(BEAT_FADE, 0, 0, 0);
    this.playBeat();
  }

  buildSkipButton() {
    const skip = this.add
      .text(GAME_WIDTH - 30, 40, 'SKIP  ▶', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#ffe9a8',
        stroke: '#000000',
        strokeThickness: 4
      })
      .setOrigin(1, 0.5)
      .setAlpha(0.85)
      .setInteractive({ useHandCursor: true });
    skip.on('pointerover', () => skip.setAlpha(1));
    skip.on('pointerout', () => skip.setAlpha(0.85));
    skip.on('pointerup', () => this.finish());
  }

  playBeat() {
    if (this.finished) return;
    const beat = BEATS[this.beatIndex];

    // Cover-scale the plate and centre it.
    const img = this.add.image(CENTER_X, CENTER_Y, beat.key).setOrigin(0.5);
    const cover = Math.max(GAME_WIDTH / img.width, GAME_HEIGHT / img.height);
    img.setScale(cover * beat.cam.fromScale);
    img.y = CENTER_Y + beat.cam.fromY;
    this.beatLayer.add(img);
    this.currentImg = img;

    // The slow camera move: whole-beat duration covers all its lines.
    const beatDuration = beat.lines.length * (LINE_IN + LINE_HOLD + LINE_OUT) + 400;
    this.tweens.add({
      targets: img,
      scale: cover * beat.cam.toScale,
      y: CENTER_Y + beat.cam.toY,
      duration: beatDuration,
      ease: 'Sine.easeInOut'
    });

    this.applyEffect(beat.effect, img, cover);

    this.lineIndex = 0;
    this.showLine();
  }

  showLine() {
    if (this.finished) return;
    const beat = BEATS[this.beatIndex];
    this.caption.setText(beat.lines[this.lineIndex]);
    this.caption.y = this.captionBand.y;

    this.tweens.add({
      targets: [this.caption, this.captionBand],
      alpha: { from: 0, to: 1 },
      duration: LINE_IN,
      onComplete: () => {
        this.time.delayedCall(LINE_HOLD, () => {
          if (this.finished) return;
          this.tweens.add({
            targets: [this.caption, this.captionBand],
            alpha: 0,
            duration: LINE_OUT,
            onComplete: () => this.nextLine()
          });
        });
      }
    });
  }

  nextLine() {
    if (this.finished) return;
    this.lineIndex += 1;
    if (this.lineIndex < BEATS[this.beatIndex].lines.length) {
      this.showLine();
    } else {
      this.endBeat();
    }
  }

  endBeat() {
    this.cameras.main.fadeOut(BEAT_FADE, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.finished) return;
      this.beatLayer.removeAll(true); // destroy this beat's objects
      if (this.effectTween) this.effectTween.stop();
      this.beatIndex += 1;
      if (this.beatIndex < BEATS.length) {
        this.cameras.main.fadeIn(BEAT_FADE, 0, 0, 0);
        this.playBeat();
      } else {
        this.finish();
      }
    });
  }

  // --- Per-beat effects --------------------------------------------------
  applyEffect(effect, img, cover) {
    switch (effect) {
      case 'strike': {
        // The "final weapon" lands: red flash + shake + slow-motion hold.
        this.cameras.main.flash(400, 120, 0, 0);
        this.cameras.main.shake(500, 0.012);
        break;
      }
      case 'embers': {
        this.beatLayer.add(
          this.add.particles(0, 0, 'glow', {
            x: { min: 0, max: GAME_WIDTH },
            y: GAME_HEIGHT,
            lifespan: 6000,
            speedY: { min: -30, max: -70 },
            scale: { start: 0.04, end: 0.1 },
            alpha: { start: 0, end: 0.4 },
            tint: 0xff8c3b,
            frequency: 500,
            blendMode: 'ADD'
          })
        );
        break;
      }
      case 'herbGlow': {
        // Pulsing green glow over the Sanjeevini herb on the mountainside
        // (roughly 47% across, 47% down in the plate).
        const gx = GAME_WIDTH * 0.47;
        const gy = GAME_HEIGHT * 0.47;
        const herb = this.add
          .image(gx, gy, 'glow')
          .setScale(0.6)
          .setTint(0x59ff8a)
          .setAlpha(0.5)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.beatLayer.add(herb);
        this.effectTween = this.tweens.add({
          targets: herb,
          alpha: 0.9,
          scale: 1.0,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        break;
      }
      case 'dawn': {
        // Warm hopeful wash fading in + soft golden motes.
        const wash = this.add
          .rectangle(CENTER_X, CENTER_Y, GAME_WIDTH, GAME_HEIGHT, 0xffb347, 0)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.beatLayer.add(wash);
        this.tweens.add({ targets: wash, fillAlpha: 0.18, duration: 2500, ease: 'Sine.easeIn' });
        this.beatLayer.add(
          this.add.particles(0, 0, 'glow', {
            x: { min: 0, max: GAME_WIDTH },
            y: { min: 0, max: GAME_HEIGHT },
            lifespan: 7000,
            speedY: { min: -10, max: -30 },
            scale: { start: 0.03, end: 0.08 },
            alpha: { start: 0, end: 0.35 },
            frequency: 700,
            blendMode: 'ADD'
          })
        );
        break;
      }
      default:
        break;
    }
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.cameras.main.fadeOut(BEAT_FADE, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Scene 6 — Hanuman powers up, then gameplay begins.
      this.scene.start('PowerUpScene');
    });
  }
}
