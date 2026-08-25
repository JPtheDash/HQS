import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('C:'+m.text()); });
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
for (const [scene,file] of [['MountainScene','m.png'],['RiverScene','r.png'],['RiverBossScene','rb.png']]) {
  await p.evaluate((sc)=>{ window.game.scene.getScenes(true).forEach(s=>{if(s.scene.key!==sc)s.scene.stop();}); window.game.scene.start(sc); }, scene);
  await p.waitForTimeout(2200);
  const info = await p.evaluate((sc)=>{ const s=window.game.scene.getScene(sc); return {solids:s.solids&&s.solids.getLength(), boss: s.bossHP}; }, scene);
  await p.screenshot({ path: 'tools/'+file });
  console.log(scene, JSON.stringify(info));
}
console.log('errs', errs.length?errs.slice(0,10):'none');
await b.close();
