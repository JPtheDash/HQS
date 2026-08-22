import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await p.evaluate(() => { window.__NOAUDIO = true; window.game.scene.getScenes(true).forEach(s => window.game.scene.stop(s.scene.key)); window.game.scene.start('GameScene'); });
await p.waitForTimeout(900);
const r = await p.evaluate(() => new Promise((resolve) => {
  const gs = window.game.scene.getScene('GameScene');
  const cam = gs.cameras.main;
  let done = false;
  cam.once('camerafadeoutcomplete', () => { done = true; });
  cam.fadeOut(400, 0, 0, 0);
  setTimeout(() => resolve({ done, effIsRunning: cam.fadeEffect && cam.fadeEffect.isRunning, alpha: cam.fadeEffect && cam.fadeEffect.progress }), 1000);
}));
console.log('fadeOut result:', JSON.stringify(r));
await b.close();
