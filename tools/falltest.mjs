import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding'] });
const p = await b.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
await p.bringToFront();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await p.evaluate(() => { window.__NOAUDIO = true; window.game.scene.getScenes(true).forEach(s => window.game.scene.stop(s.scene.key)); window.game.scene.start('GameScene'); });
await p.waitForTimeout(900);
const st = async () => p.evaluate(() => { const g = window.game.scene.getScene('GameScene'); const pl = g.player; return { x: Math.round(pl.x), y: Math.round(pl.y), hp: g.health }; });
console.log('start', JSON.stringify(await st()));
// Run right into the gap (no jumping) to force a fall.
await p.keyboard.down('ArrowRight');
for (let i = 0; i < 18; i++) { await p.waitForTimeout(400); console.log('t' + i, JSON.stringify(await st())); }
await p.keyboard.up('ArrowRight');
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
