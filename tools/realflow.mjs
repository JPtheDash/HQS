// Reproduce the REAL player flow (click PLAY, skip the cinematic, tap through
// the power-up) and capture the character in gameplay at high zoom, exactly as
// the user experiences it.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Helper: current scene keys.
const scenes = () => page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key));
console.log('after boot:', await scenes());

// Click PLAY (center-ish). We just click where the PLAY button is.
await page.mouse.click(180, 415);
await page.waitForTimeout(800);
console.log('after PLAY:', await scenes());

// Skip the cinematic quickly by starting PowerUpScene, then GameScene via taps.
// (Cinematic has a SKIP button; simplest is to advance through scenes as the
// game allows by tapping.)
for (let i = 0; i < 8; i++) {
  await page.mouse.click(180, 320);
  await page.waitForTimeout(500);
  const sc = await scenes();
  if (sc.includes('GameScene')) break;
}
await page.waitForTimeout(800);
console.log('scenes now:', await scenes());

// If we reached gameplay, zoom on the player and shoot.
const ok = await page.evaluate(() => {
  const gs = window.game.scene.getScene('GameScene');
  if (!gs || !gs.player) return false;
  const p = gs.player;
  gs.cameras.main.stopFollow();
  gs.cameras.main.centerOn(p.x, p.y - 30);
  gs.cameras.main.setZoom(3);
  return true;
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/real_char.png' });
console.log('reached gameplay:', ok, '| errors:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
