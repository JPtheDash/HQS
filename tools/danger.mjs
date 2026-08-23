import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.evaluate(() => { window.game.scene.getScenes(true).forEach((s) => { if (s.scene.key !== 'DangerScene') s.scene.stop(); }); window.game.scene.start('DangerScene'); });
await p.waitForTimeout(2000);
// Fire section
await p.evaluate(() => { const s = window.game.scene.getScene('DangerScene'); s.player.x = 2600; s.player.y = 500; });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'tools/danger_fire.png' });
// Boulder section: force spawn a boulder near player
await p.evaluate(() => { const s = window.game.scene.getScene('DangerScene'); s.player.x = 1800; s.player.y = 500; });
await p.waitForTimeout(400);
await p.evaluate(() => { const s = window.game.scene.getScene('DangerScene'); s.spawnBoulder(); });
await p.waitForTimeout(500);
await p.screenshot({ path: 'tools/danger_boulder.png' });
// also report boulder texture size after strip
const info = await p.evaluate(() => { const s = window.game.scene.getScene('DangerScene'); const t = s.textures.get('boulder').getSourceImage(); const c=document.createElement('canvas'); c.width=t.width;c.height=t.height;const cx=c.getContext('2d');cx.drawImage(t,0,0);const d=cx.getImageData(0,0,t.width,t.height).data; let opaque=0; for(let i=3;i<d.length;i+=4) if(d[i]>20) opaque++; return {w:t.width,h:t.height,opaquePct:Math.round(100*opaque/(t.width*t.height))}; });
console.log(JSON.stringify(info));
await b.close();
