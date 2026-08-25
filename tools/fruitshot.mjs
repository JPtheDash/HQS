import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('C:'+m.text()); });
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.evaluate(() => { window.game.scene.getScenes(true).forEach(s=>{if(s.scene.key!=='FruitForestScene')s.scene.stop();}); window.game.scene.start('FruitForestScene'); });
await p.waitForTimeout(2500);
await p.screenshot({ path: 'tools/fruit_a.png' });
const info = await p.evaluate(() => { const s=window.game.scene.getScene('FruitForestScene'); return {pickups:s.pickups.countActive(true), energy:s.energy, hasPlayer:!!s.player}; });
// move forward to see platforms
await p.evaluate(() => { const s=window.game.scene.getScene('FruitForestScene'); s.player.x=1150; s.player.body.reset(1150, s.player.y); s.cameras.main.scrollX=1150-360; });
await p.waitForTimeout(900);
await p.screenshot({ path: 'tools/fruit_b.png' });
console.log('info', JSON.stringify(info));
console.log('errs', errs.length?errs.slice(0,8):'none');
await b.close();
