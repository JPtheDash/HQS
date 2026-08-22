import Phaser from 'phaser';

// One background track plays at a time and persists across scene changes.
// hanumanstory.mp3 is the "story" track (menu + cinematics + non-gameplay
// screens); game.mp3 is the gameplay track. Scenes just declare which track
// they want via playMusic() and this module handles switching + browser
// autoplay unlocking.

const REG_KEY = 'bgm.key';
const REG_SND = 'bgm.sound';

export function playMusic(scene, key, { volume = 0.5, fade = 600 } = {}) {
  const reg = scene.game.registry;
  const currentKey = reg.get(REG_KEY);
  const currentSnd = reg.get(REG_SND);

  // Already playing the requested track — leave it running.
  if (currentKey === key && currentSnd && currentSnd.isPlaying) return currentSnd;

  // Fade out and dispose whatever was playing.
  if (currentSnd) {
    scene.tweens.add({
      targets: currentSnd,
      volume: 0,
      duration: fade,
      onComplete: () => currentSnd.destroy()
    });
  }

  const music = scene.sound.add(key, { loop: true, volume: 0 });
  const start = () => {
    if (!music.isPlaying) music.play();
    scene.tweens.add({ targets: music, volume, duration: fade });
  };

  // Browsers block audio until the first user gesture; Phaser fires UNLOCKED
  // once that happens, so queue the start if we're still locked.
  if (scene.sound.locked) {
    scene.sound.once(Phaser.Sound.Events.UNLOCKED, start);
  } else {
    start();
  }

  reg.set(REG_KEY, key);
  reg.set(REG_SND, music);
  return music;
}

export const STORY_MUSIC = 'story-music';
export const GAME_MUSIC = 'game-music';
