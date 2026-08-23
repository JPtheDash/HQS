import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const r = await p.evaluate(async () => {
  const img = new Image(); img.src = '/assets/game/spritesheet2.png?' + Date.now(); await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const g = (X, Y) => { const d = x.getImageData(X, Y, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
  return { size: [img.width, img.height], corner: g(5, 5), between: g(1024, 20), gap: g(180, 470), fig: g(180, 300) };
});
console.log(JSON.stringify(r));
await b.close();
