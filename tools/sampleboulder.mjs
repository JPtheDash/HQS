import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const out = await p.evaluate(async () => {
  const img = new Image(); img.src = '/assets/game/boulder.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
  // sample a grid of border-ish points and center points
  const corners = [px(2,2), px(W-3,2), px(2,H-3), px(W-3,H-3), px(60,60), px(W-60,60)];
  const centers = [px(W>>1,H>>1), px((W>>1)-100,H>>1), px((W>>1)+100,H>>1), px(W>>1,(H>>1)-120)];
  // histogram of neutral-ish bg candidate values along top rows
  const shades = {};
  for (let y = 0; y < 40; y++) for (let x = 0; x < W; x += 3) { const [r,g,bl] = px(x,y); if (Math.max(r,g,bl)-Math.min(r,g,bl) <= 30) { const k = Math.round(r/8)*8; shades[k]=(shades[k]||0)+1; } }
  const topShades = Object.entries(shades).sort((a,b)=>b[1]-a[1]).slice(0,6);
  return { W, H, corners, centers, topShades };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
