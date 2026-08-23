import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const r = await p.evaluate(async () => {
  const img = new Image(); img.src='/assets/game/bat_src.png?'+Date.now(); await img.decode();
  const W=img.width,H=img.height; const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(img,0,0);
  const d=x.getImageData(0,0,W,H).data; const px=(X,Y)=>{const i=(Y*W+X)*4;return [d[i],d[i+1],d[i+2],d[i+3]];};
  // checker corner, a mid-cell checker, grid-line (at cell boundary), bat body (cell0 center row0)
  const cellW=W/6, cellH=H/3;
  return {
    corner: px(3,3),
    checkerMid: px(Math.round(cellW*0.5), 6),
    gridV: px(Math.round(cellW), Math.round(cellH*0.5)),
    batBody: px(Math.round(cellW*0.42), Math.round(cellH*0.42)),
    batBody2: px(Math.round(cellW*0.5), Math.round(cellH*0.55))
  };
});
console.log(JSON.stringify(r));
await b.close();
