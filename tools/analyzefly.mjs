// Analyze the bottom (fly) row of spritesheet2.png: after background removal,
// label connected components and report their bounding boxes + sizes, so we can
// see whether the 6 flying figures are cleanly separable or whether they touch.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const report = await p.evaluate(async () => {
  const img = new Image(); img.src = '/assets/game/spritesheet2.png?' + Date.now(); await img.decode();
  const W = img.width, H = img.height, cols = 6, rows = 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const im = ctx.getImageData(0, 0, W, H); const d = im.data;
  const isBg = (i) => { const r = d[i], g = d[i+1], bl = d[i+2]; const mx = Math.max(r,g,bl), mn = Math.min(r,g,bl); return (mx-mn) <= 40; };
  // flood clear bg
  const vis = new Uint8Array(W*H); const st = [];
  for (let x=0;x<W;x++){st.push(x,0,x,H-1);} for (let y=0;y<H;y++){st.push(0,y,W-1,y);}
  while (st.length){const y=st.pop(),x=st.pop();if(x<0||y<0||x>=W||y>=H)continue;const pp=y*W+x;if(vis[pp])continue;vis[pp]=1;const i=pp*4;if(d[i+3]===0){}else if(!isBg(i))continue;d[i+3]=0;st.push(x+1,y,x-1,y,x,y+1,x,y-1,x+1,y+1,x-1,y-1,x+1,y-1,x-1,y+1);}
  // examine each row: connected components
  const outH = Math.floor(H/rows);
  const results = [];
  for (let r=0;r<rows;r++){
    const y0=r*outH, y1=(r+1)*outH;
    const lab = new Int32Array(W*outH).fill(-1);
    let next=0; const comps=[];
    for (let y=y0;y<y1;y++) for (let x=0;x<W;x++){
      const i=(y*W+x)*4; if(d[i+3]<=20) continue;
      const li=(y-y0)*W+x; if(lab[li]!==-1) continue;
      // BFS
      const q=[x,y]; lab[li]=next; let minx=x,maxx=x,miny=y,maxy=y,cnt=0;
      while(q.length){const cy=q.pop(),cx=q.pop();const ci=(cy*W+cx)*4;if(d[ci+3]<=20)continue;cnt++;if(cx<minx)minx=cx;if(cx>maxx)maxx=cx;if(cy<miny)miny=cy;if(cy>maxy)maxy=cy;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<y0||nx>=W||ny>=y1)continue;const nl=(ny-y0)*W+nx;const ni=(ny*W+nx)*4;if(d[ni+3]>20&&lab[nl]===-1){lab[nl]=next;q.push(nx,ny);}}}
      comps.push({minx,maxx,miny,maxy,cnt,w:maxx-minx+1,h:maxy-miny+1}); next++;
    }
    comps.sort((a,b)=>b.cnt-a.cnt);
    results.push({row:r, big: comps.filter(x=>x.cnt>1500).map(x=>({x:x.minx,X:x.maxx,w:x.w,h:x.h,n:x.cnt}))});
  }
  return {W,H, results};
});
console.log(JSON.stringify(report, null, 1));
await b.close();
