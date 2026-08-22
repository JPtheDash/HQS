// Scripted playthrough smoke test: drive the player right with a few jumps and
// report position + errors, capturing a frame mid-level.
import { chromium } from 'playwright';
const out = process.argv[2] || 'play.png';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => { window.__NOAUDIO = true; window.game.scene.getScenes(true).forEach((s) => window.game.scene.stop(s.scene.key)); window.game.scene.start('GameScene'); });
await page.waitForTimeout(1000);

const pos = async () => page.evaluate(() => {
  const p = window.game.scene.getScene('GameScene').player;
  return { x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.body.velocity.x), onGround: p.body.blocked.down };
});
console.log('start', JSON.stringify(await pos()));

await page.keyboard.down('ArrowRight');
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(700);
  await page.keyboard.press('Space'); // jump periodically
  console.log('t' + i, JSON.stringify(await pos()));
}
await page.keyboard.up('ArrowRight');
await page.screenshot({ path: out });
console.log('SHOT', out, 'errors:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
