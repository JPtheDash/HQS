// Crop the wide clean ledge into a compact ~2:1 island for narrow branch
// platforms (the full 4.6:1 ledge becomes a thin sliver when scaled to ~200px).
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const out = await p.evaluate(async () => {
  const img = new Image(); img.src='/assets/game/platform-ledge.png?'+Date.now(); await img.decode();
  const W=img.width,H=img.height;
  const cropW = Math.round(H*2.0);           // ~2:1 aspect
  const x0 = Math.round((W-cropW)/2);
  const c=document.createElement('canvas'); c.width=cropW; c.height=H;
  c.getContext('2d').drawImage(img, x0, 0, cropW, H, 0, 0, cropW, H);
  return { url:c.toDataURL('image/png'), cropW, H };
});
const base64=out.url.replace(/^data:image\/png;base64,/,'');
fs.writeFileSync('public/assets/game/ledge-small.png', Buffer.from(base64,'base64'));
console.log('wrote ledge-small.png', out.cropW+'x'+out.H);
await b.close();
