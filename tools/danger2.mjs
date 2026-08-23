import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.evaluate(() => { window.game.scene.getScenes(true).forEach((s) => { if (s.scene.key !== 'DangerScene') s.scene.stop(); }); window.game.scene.start('DangerScene'); });
await p.waitForTimeout(2000);
// Fire section
await p.evaluate(() => { const s = window.game.scene.getScene('DangerScene'); s.player.x = 2600; s.player.y = 500; s.fires.forEach((f)=>{f.zone.active=true; f.draw();}); });
await p.waitForTimeout(1200);
await p.screenshot({ path: 'tools/d_fire.png' });
// Boulder on-screen
await p.evaluate(() => { const s = window.game.scene.getScene('DangerScene'); s.player.x = 1800; s.player.y = 500; });
await p.waitForTimeout(500);
await p.evaluate(() => { const s = window.game.scene.getScene('DangerScene'); const bb = s.boulders.create(s.player.x + 170, 900, 'boulder'); bb.setScale(90/bb.width); bb.body.setCircle(bb.width*0.42, bb.width*0.08, bb.height*0.08); bb.setDepth(2); });
await p.waitForTimeout(300);
await p.screenshot({ path: 'tools/d_boulder.png' });
console.log('errs', errs.length ? errs.slice(0,5) : 'none');
await b.close();
