// Falling into a pit shouldn't be an instant game over — it costs one heart and
// sends Hanuman back to the start of the level. Only when hearts run out is it a
// real loss. Scenes must set `spawnX`/`spawnY` and expose `health`, `hud`,
// `player`, and `loseLevel`.
export function fallRespawn(scene) {
  if (scene.finished) return;
  scene.health -= 1;
  scene.hud.setHealth(scene.health);
  if (scene.health <= 0) {
    scene.loseLevel('Hanuman fell...');
    return;
  }
  const p = scene.player;
  p.setVelocity(0, 0);
  p.setPosition(scene.spawnX, scene.spawnY);
  p.setAlpha(1);
  scene.tweens.add({ targets: p, alpha: 0.35, duration: 100, yoyo: true, repeat: 4 });
  scene.cameras.main.flash(160, 0, 0, 0);
  if (scene.floatText) scene.floatText(scene.spawnX, scene.spawnY - 120, '-1 ❤', '#ff6b6b');
}
