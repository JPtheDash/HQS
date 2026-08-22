// Hold-to-fly test: press and HOLD jump, sample how high Hanuman climbs and
// whether fuel drains, then screenshot mid-flight.
import { chromium } from 'playwright';
const out = process.argv[2] || 'fly.png';
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
  return { y: Math.round(p.y), vy: Math.round(p.body.velocity.y), flying: p.flying, fuel: Math.round((p.flyLeft / p.flyMax) * 100) };
});
console.log('ground', JSON.stringify(await pos()));

await page.keyboard.down('Space'); // HOLD
for (let i = 0; i < 5; i++) { await page.waitForTimeout(500); console.log('h' + i, JSON.stringify(await pos())); }
await page.screenshot({ path: out });
await page.keyboard.up('Space');
await page.waitForTimeout(400);
console.log('released', JSON.stringify(await pos()));
console.log('SHOT', out, 'errors:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
