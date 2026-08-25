import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push('C:'+m.text()); });
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1800);
for (const [scene,file] of [['DronagiriScene','d.png'],['ReturnScene','ret.png'],['MapScene','map.png']]) {
  await p.evaluate((sc)=>{ window.game.scene.getScenes(true).forEach(s=>{if(s.scene.key!==sc)s.scene.stop();}); window.game.registry.set('coinTotal', 137); window.game.scene.start(sc); }, scene);
  await p.waitForTimeout(2400);
  await p.screenshot({ path: 'tools/'+file });
}
// Return victory screen: advance beats
await p.evaluate(()=>{ window.game.scene.getScenes(true).forEach(s=>{if(s.scene.key!=='ReturnScene')s.scene.stop();}); window.game.scene.start('ReturnScene'); });
await p.waitForTimeout(1500);
for (let i=0;i<7;i++){ await p.evaluate(()=>window.game.scene.getScene('ReturnScene').next && window.game.scene.getScene('ReturnScene').next()); await p.waitForTimeout(700); }
await p.screenshot({ path: 'tools/victory.png' });
console.log('errs', errs.length?errs.slice(0,10):'none');
await b.close();
