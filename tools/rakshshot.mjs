import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('C:'+m.text()); });
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
await p.evaluate(() => { window.game.scene.getScenes(true).forEach(s=>{if(s.scene.key!=='RakshasaScene')s.scene.stop();}); window.game.scene.start('RakshasaScene'); });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => { const s=window.game.scene.getScene('RakshasaScene'); return {foes:s.foes.countActive(true), pickups:s.pickups.countActive(true)}; });
// position near a foe and view
await p.evaluate(() => { const s=window.game.scene.getScene('RakshasaScene'); s.player.x=760; s.player.body.reset(760, s.player.y); s.cameras.main.scrollX=760-360; });
await p.waitForTimeout(700);
await p.screenshot({ path: 'tools/raksh_a.png' });
// test gada defeats a foe
await p.evaluate(() => { const s=window.game.scene.getScene('RakshasaScene'); s.gadaCooldown=0; s.throwGadaSwipe(); });
await p.waitForTimeout(2500);
const st = await p.evaluate(() => { const s=window.game.scene.getScene('RakshasaScene'); return {foes:s.foes.countActive(true), coins:s.coinsCollected}; });
console.log('info', JSON.stringify(info));
console.log('after gada', JSON.stringify(st), '(foes down or coins up => defeated)');
console.log('errs', errs.length?errs.slice(0,8):'none');
await b.close();
