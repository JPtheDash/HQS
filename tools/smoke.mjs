import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--disable-background-timer-throttling'] });
const p = await b.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
await p.addInitScript(() => { window.__NOAUDIO = true; });
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const info = await p.evaluate(() => {
  const g = window.game; if (!g) return { err: 'no game' };
  const tex = g.textures.get('hero');
  const frameNames = tex ? tex.getFrameNames() : [];
  const anims = ['hero-idle', 'hero-run', 'hero-jump', 'hero-fly'].map((k) => {
    const a = g.anims.get(k);
    return { k, exists: !!a, frames: a ? a.frames.map((f) => f.frame.name) : null };
  });
  const src = tex ? tex.getSourceImage() : null;
  return { heroFrameCount: frameNames.length, sheetW: src && src.width, sheetH: src && src.height, anims };
});
console.log(JSON.stringify(info, null, 1));
console.log('ERRORS:', errors.length ? errors.slice(0, 8) : 'none');
await b.close();
