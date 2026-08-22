import { chromium } from 'playwright';
const out = process.argv[2] || 'shots/treeplay.png';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await p.evaluate(() => { window.__NOAUDIO = true; window.game.scene.getScenes(true).forEach(s => window.game.scene.stop(s.scene.key)); window.game.scene.start('TreeScene'); });
await p.waitForTimeout(900);
const st = async () => p.evaluate(() => { const g = window.game.scene.getScene('TreeScene'); const pl = g.player; return { x: Math.round(pl.x), y: Math.round(pl.y), onG: pl.body.blocked.down, jumps: pl.jumpsUsed, hp: g.health, fin: g.finished, hint: g.doubleHintShown }; });
console.log('start', JSON.stringify(await st()));
await p.keyboard.down('ArrowRight');
for (let i = 0; i < 10; i++) {
  await p.waitForTimeout(450);
  // double-tap jump to test double jump
  await p.keyboard.press('Space');
  await p.waitForTimeout(180);
  await p.keyboard.press('Space');
  console.log('t' + i, JSON.stringify(await st()));
}
await p.keyboard.up('ArrowRight');
await p.screenshot({ path: out });
console.log('SHOT', out, 'errors:', errs.length ? '\n' + errs.join('\n') : 'none');
await b.close();
