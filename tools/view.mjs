// Pan the GameScene camera to a world-X and screenshot, to inspect level
// layout without driving the player. Usage: node tools/view.mjs <out> <scrollX>
import { chromium } from 'playwright';
const out = process.argv[2] || 'view.png';
const scrollX = parseInt(process.argv[3] || '0', 10);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => window.game.scene.getScenes(true).forEach((s) => window.game.scene.stop(s.scene.key)));
await page.evaluate(() => window.game.scene.start('GameScene'));
await page.waitForTimeout(1200);
await page.evaluate((sx) => {
  const gs = window.game.scene.getScene('GameScene');
  gs.cameras.main.stopFollow();
  gs.cameras.main.scrollX = sx;
}, scrollX);
await page.waitForTimeout(600);
await page.screenshot({ path: out });
console.log('VIEW:', out, 'scrollX', scrollX, 'errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
