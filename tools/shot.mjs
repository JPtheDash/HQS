// Headless screenshot helper for previewing scenes without the editor's
// browser pane. Usage:
//   node tools/shot.mjs <outFile> [waitMs] [sceneKey]
// If sceneKey is given, the game is told to jump to that scene after load.
import { chromium } from 'playwright';

const out = process.argv[2] || 'shot.png';
const waitMs = parseInt(process.argv[3] || '3500', 10);
const sceneKey = process.argv[4] || '';
const URL = 'http://localhost:5173/';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({
  viewport: { width: 450, height: 800 },
  deviceScaleFactor: 2
});

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
// Let the boot/preload finish and the first scene settle.
await page.waitForTimeout(1500);

if (sceneKey) {
  const started = await page.evaluate((key) => {
    // eslint-disable-next-line no-undef
    const game = window.game;
    if (!game) return 'no window.game';
    // Stop every running scene, then start the requested one, so we don't
    // render the target on top of the menu.
    game.scene.getScenes(true).forEach((s) => game.scene.stop(s.scene.key));
    game.scene.start(key);
    return 'started ' + key;
  }, sceneKey);
  console.log('SCENE:', started);
}

await page.waitForTimeout(waitMs);
await page.screenshot({ path: out });

console.log('SHOT:', out);
console.log('CONSOLE ERRORS:', errors.length ? '\n' + errors.join('\n') : 'none');
await browser.close();
