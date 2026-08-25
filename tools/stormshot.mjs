import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('C:'+m.text()); });
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.evaluate(() => { window.game.scene.getScenes(true).forEach(s=>{if(s.scene.key!=='StormScene')s.scene.stop();}); window.game.scene.start('StormScene'); });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => { const s=window.game.scene.getScene('StormScene'); return {solids:s.solids.getLength(), hazards:s.hazards.getLength(), pickups:s.pickups.countActive(true)}; });
// force a lightning telegraph to capture
await p.evaluate(() => { const s=window.game.scene.getScene('StormScene'); s.telegraphLightning(); });
await p.waitForTimeout(300);
await p.screenshot({ path: 'tools/storm_a.png' });
await p.waitForTimeout(700);
await p.screenshot({ path: 'tools/storm_b.png' });
console.log('info', JSON.stringify(info));
console.log('errs', errs.length?errs.slice(0,8):'none');
await b.close();
