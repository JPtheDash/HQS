import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage({ viewport: { width: 420, height: 740 } });
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
await p.evaluate(() => { window.game.scene.getScenes(true).forEach(s=>{if(s.scene.key!=='TreeScene')s.scene.stop();}); window.game.scene.start('TreeScene'); });
await p.waitForTimeout(2200);
await p.screenshot({ path: 'tools/tree_a.png' });
// move to see later platforms
await p.evaluate(() => { const s=window.game.scene.getScene('TreeScene'); s.player.x=1400; s.player.body.reset(1400, 400); s.cameras.main.scrollX=1400-360; });
await p.waitForTimeout(900);
await p.screenshot({ path: 'tools/tree_b.png' });
await b.close(); console.log('ok');
