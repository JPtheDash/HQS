// platform-ledge.png ships with a baked neutral-grey checker background. Strip
// it (neutral flood from border), keep the largest component, and crop tight so
// the grass surface sits at the very TOP of the image — makes positioning the
// platform (grass at y, collision just below) exact. Overwrites the file; keeps
// platform-ledge_orig.png as the source.
import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const out = await p.evaluate(async () => {
  const img = new Image(); img.src = '/assets/game/platform-ledge_orig.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  const idx = (x, y) => (y * W + x) * 4;
  const isBg = (i) => { const r = d[i], g = d[i+1], bl = d[i+2]; const mx = Math.max(r,g,bl), mn = Math.min(r,g,bl); return (mx - mn) <= 26 && mx >= 40; };
  const vis = new Uint8Array(W*H); const st = [];
  for (let x=0;x<W;x++){st.push(x,0,x,H-1);} for (let y=0;y<H;y++){st.push(0,y,W-1,y);}
  while (st.length){const y=st.pop(),x=st.pop();if(x<0||y<0||x>=W||y>=H)continue;const pp=y*W+x;if(vis[pp])continue;vis[pp]=1;const i=pp*4;if(d[i+3]===0){}else if(!isBg(i))continue;d[i+3]=0;st.push(x+1,y,x-1,y,x,y+1,x,y-1,x+1,y+1,x-1,y-1,x+1,y-1,x-1,y+1);}
  // defringe neutral halo
  const isRim = (i)=>{const r=d[i],g=d[i+1],bl=d[i+2];const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl);return (mx-mn)<=34 && mx>=40;};
  for (let pass=0;pass<2;pass++){const clr=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=idx(x,y);if(d[i+3]===0)continue;let e=false;for(let dy=-1;dy<=1&&!e;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;if(d[idx(nx,ny)+3]===0){e=true;break;}}if(e&&isRim(i))clr.push(i);}if(!clr.length)break;clr.forEach(i=>d[i+3]=0);}
  // keep largest component
  {const lab=new Int32Array(W*H).fill(-1);let best=-1,bestN=0;const comps=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(d[idx(x,y)+3]<=20)continue;const s0=y*W+x;if(lab[s0]!==-1)continue;const q=[x,y];lab[s0]=comps.length;let n=0;while(q.length){const cy=q.pop(),cx=q.pop();n++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const nl=ny*W+nx;if(lab[nl]===-1&&d[nl*4+3]>20){lab[nl]=comps.length;q.push(nx,ny);}}}comps.push(n);if(n>bestN){bestN=n;best=comps.length-1;}}for(let s=0;s<W*H;s++)if(lab[s]!==best)d[s*4+3]=0;}
  let minx=W,miny=H,maxx=-1,maxy=-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[idx(x,y)+3]>20){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}
  ctx.putImageData(im,0,0);
  const cw=maxx-minx+1, ch=maxy-miny+1;
  const o=document.createElement('canvas'); o.width=cw; o.height=ch;
  o.getContext('2d').drawImage(c, minx, miny, cw, ch, 0, 0, cw, ch);
  return { url:o.toDataURL('image/png'), cw, ch };
});
const base64 = out.url.replace(/^data:image\/png;base64,/, '');
fs.writeFileSync('public/assets/game/platform-ledge.png', Buffer.from(base64, 'base64'));
console.log('wrote clean platform-ledge.png', out.cw+'x'+out.ch, Buffer.from(base64,'base64').length,'bytes');
await b.close();
