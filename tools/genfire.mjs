// Bake a soft, painterly flame sprite -> public/assets/game/fire.png.
// Rendered with layered flame silhouettes and vertical gradients (red -> orange
// -> yellow -> white core) on a transparent canvas, plus a soft ember glow.
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const dataUrl = await p.evaluate(async () => {
  const W = 256, H = 384;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const cx = W / 2, base = H - 24;

  const flame = (halfW, height, colors) => {
    const top = base - height;
    x.beginPath();
    x.moveTo(cx, base);
    x.bezierCurveTo(cx - halfW, base - height * 0.15, cx - halfW * 0.75, base - height * 0.5, cx - halfW * 0.32, base - height * 0.72);
    x.bezierCurveTo(cx - halfW * 0.12, base - height * 0.88, cx - halfW * 0.05, top, cx, top);
    x.bezierCurveTo(cx + halfW * 0.05, top, cx + halfW * 0.12, base - height * 0.88, cx + halfW * 0.32, base - height * 0.72);
    x.bezierCurveTo(cx + halfW * 0.75, base - height * 0.5, cx + halfW, base - height * 0.15, cx, base);
    x.closePath();
    const g = x.createLinearGradient(0, base, 0, top);
    colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), col));
    x.fillStyle = g; x.fill();
  };

  // Soft ember glow at the base.
  const glow = x.createRadialGradient(cx, base - 60, 10, cx, base - 60, 150);
  glow.addColorStop(0, 'rgba(255,150,40,0.55)');
  glow.addColorStop(1, 'rgba(255,120,20,0)');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);

  // Outer red-orange flame.
  flame(96, 320, ['rgba(255,60,0,0)', '#ff3d0e', '#ff6a12', '#ff9a1e']);
  // Mid orange-yellow flame.
  flame(60, 250, ['rgba(255,120,0,0)', '#ff8a12', '#ffc21f', '#ffe680']);
  // Inner yellow-white flame.
  flame(32, 180, ['rgba(255,180,40,0)', '#ffd23b', '#fff1c0', '#ffffff']);
  // Bright core.
  const core = x.createRadialGradient(cx, base - 70, 4, cx, base - 70, 46);
  core.addColorStop(0, 'rgba(255,255,240,0.95)');
  core.addColorStop(1, 'rgba(255,220,120,0)');
  x.fillStyle = core; x.fillRect(0, 0, W, H);

  return c.toDataURL('image/png');
});
const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/fire.png', Buffer.from(base64, 'base64'));
console.log('wrote fire.png', Buffer.from(base64, 'base64').length, 'bytes');
await b.close();
