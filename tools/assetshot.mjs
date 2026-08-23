import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
const shots = [
  ['GameScene', 'a_game.png', 1720],
  ['TreeScene', 'a_tree.png', 900],
  ['DangerScene', 'a_danger.png', 2600],
  ['TiredScene', 'a_tired.png', 500],
];
for (const [scene, file, x] of shots) {
  await p.evaluate((sc) => { window.game.scene.getScenes(true).forEach((s) => { if (s.scene.key !== sc) s.scene.stop(); }); window.game.scene.start(sc); }, scene);
  await p.waitForTimeout(1600);
  await p.evaluate((xx) => { const s = window.game.scene.getScenes(true)[0]; if (s.player) { s.player.x = xx; s.player.y = 500; if (s.fires) s.fires.forEach((f)=>{f.zone.active=true; f.draw();}); } }, x);
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'tools/' + file });
}
console.log('errs', errs.length ? errs.slice(0, 6) : 'none');
await b.close();
