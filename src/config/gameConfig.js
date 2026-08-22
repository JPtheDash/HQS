// Central place for the game's design resolution and shared tuning values.
// Every scene lays out against GAME_WIDTH x GAME_HEIGHT; Phaser's Scale.FIT
// then letterboxes that design size onto whatever screen it runs on, so the
// same coordinates work on a phone, a tablet, and the desktop preview.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Handy shortcuts for centering things.
export const CENTER_X = GAME_WIDTH / 2;
export const CENTER_Y = GAME_HEIGHT / 2;

// Palette — placeholder brand colours, easy to retune once art arrives.
export const COLORS = {
  bg: 0x1a2a4a,
  accent: 0xffb703,
  text: '#ffffff',
  textMuted: '#c9d4e8'
};
