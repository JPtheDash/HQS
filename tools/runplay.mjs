import { chromium } from 'playwright';
const scene = process.argv[2] || 'DangerScene';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding'] });
const p = await b.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
await p.bringToFront();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1400);
await p.evaluate((sc) => { window.__NOAUDIO = true; window.game.scene.getScenes(true).forEach(s => window.game.scene.stop(s.scene.key)); window.game.scene.start(sc); }, scene);
await p.waitForTimeout(900);
const st = async () => p.evaluate((sc) => { const g = window.game.scene.getScene(sc); const pl = g.player; return { x: Math.round(pl.x), hp: g.health, en: Math.round((g.energy ?? 1) * 100), fin: g.finished }; }, scene);
console.log('start', JSON.stringify(await st()));
await p.keyboard.down('ArrowRight');
for (let i = 0; i < 12; i++) { await p.waitForTimeout(500); await p.keyboard.press('Space'); console.log('t' + i, JSON.stringify(await st())); }
await p.keyboard.up('ArrowRight');
console.log('errors:', errs.length ? '\n' + errs.join('\n') : 'none');
await b.close();
