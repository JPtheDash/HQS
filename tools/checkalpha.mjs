import { chromium } from 'playwright';
const [file] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const r = await p.evaluate(async (file) => {
  const img = new Image(); img.src='/assets/game/'+file+'?'+Date.now(); await img.decode();
  const W=img.width,H=img.height; const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(img,0,0);
  const d=x.getImageData(0,0,W,H).data;
  let opaque=0, transp=0; for(let i=3;i<d.length;i+=4){ if(d[i]>20)opaque++; else transp++; }
  const px=(X,Y)=>{const i=(Y*W+X)*4;return [d[i],d[i+1],d[i+2],d[i+3]];};
  return {W,H,opaquePct:Math.round(100*opaque/(opaque+transp)), corner:px(3,3), mid:px(W>>2,H>>1), armor:px(Math.round(W*0.5),Math.round(H*0.45))};
}, file);
console.log(JSON.stringify(r));
await b.close();
