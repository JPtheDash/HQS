// Capture the player's animation over time (standing idle by default) into a
// filmstrip so we can spot any bad/back-turned frames the animation cycles to.
import { chromium } from 'playwright';
const state = process.argv[2] || 'idle'; // idle | run
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 300, height: 420 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
await page.evaluate(() => { window.__NOAUDIO = true; window.game.scene.getScenes(true).forEach((s) => window.game.scene.stop(s.scene.key)); window.game.scene.start('GameScene'); });
await page.waitForTimeout(800);
await page.evaluate((st) => {
  const gs = window.game.scene.getScene('GameScene');
  if (st === 'run') gs.player.moveRight();
}, state);

// Read the player's on-screen position and clip a box around him each shot.
const shots = [];
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(130);
  const info = await page.evaluate(() => {
    const gs = window.game.scene.getScene('GameScene');
    const p = gs.player;
    const cam = gs.cameras.main;
    const sx = (p.x - cam.scrollX) * cam.zoom;
    const sy = (p.y - cam.scrollY) * cam.zoom;
    return { frame: p.frame.name, anim: p.anims.currentAnim && p.anims.currentAnim.key, sx: Math.round(sx), sy: Math.round(sy) };
  });
  const cx = Math.max(0, Math.min(info.sx - 70, 300 - 140));
  const cy = Math.max(0, Math.min(info.sy - 110, 420 - 200));
  const path = `shots/strip_${state}_${i}.png`;
  await page.screenshot({ path, clip: { x: cx, y: cy, width: 140, height: 200 } });
  shots.push(path + ' ' + JSON.stringify(info));
}
console.log(shots.join('\n'));
await browser.close();
