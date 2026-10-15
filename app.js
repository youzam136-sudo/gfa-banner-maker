const BUILTIN = {np_orig:"nplus-orig.png", np_black:"nplus-black.png", np_white:"nplus-white.png"};

const DEFAULTS = {
  brandName:'', season:'26 F/W', title:'BRAND DAY', headline:'24H SALE', oneDay:'ONE DAY ONLY',
  percent:'70', dateEn:'10.17', year:'2026', dow:'SAT', dateKo:'17일 오늘 단 하루',
  cta:'단 하루, UP TO 70%', sub:'#최대 70% 할인', showDatePill:true, titleWeight:'600',
  accent:'#B0161C', np:'none', focusX:55, focusY:35, removeBg:true, logoWhiteBg:true,
  layouts:{C:true,E:true,F:true,J:true,H:true}
};
const ACCENTS = ['#B0161C','#6B3A22','#1E1F22','#1F4E8C','#2E6B3A'];
const LAYOUTS = [
  {id:'C', name:'시안 C', sub:'모델 + 제품컷 세로 3~5'},
  {id:'E', name:'시안 E', sub:'모델 2/3 + 제품컷 3칸'},
  {id:'F', name:'시안 F', sub:'9분할 폴라로이드'},
  {id:'J', name:'시안 J', sub:'흩뿌린 사진'},
  {id:'H', name:'24H SALE', sub:'헤드라인 + 모델 + 신발 3'}
];

let S = JSON.parse(JSON.stringify(DEFAULTS));
const IMG = { logo:null, np:{}, models:[], products:[] }; // products: {orig, cut, thumb}

const $ = id => document.getElementById(id);
function loadImg(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
function fileToImg(file){ return loadImg(URL.createObjectURL(file)); }

/* ---------- image processing ---------- */
function toCanvas(img, max=1000){
  const s=Math.min(1, max/Math.max(img.naturalWidth||img.width, img.naturalHeight||img.height));
  const c=document.createElement('canvas'); c.width=Math.round((img.naturalWidth||img.width)*s); c.height=Math.round((img.naturalHeight||img.height)*s);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height); return c;
}
function hasTransparency(c){
  const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  for(let i=3;i<d.length;i+=4*97) if(d[i]<245) return true; return false;
}
function trim(c){
  const ctx=c.getContext('2d'), {width:w,height:h}=c, d=ctx.getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(d[(y*w+x)*4+3]>24){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  if(x1<0) return c;
  const o=document.createElement('canvas'); o.width=x1-x0+1; o.height=y1-y0+1;
  o.getContext('2d').drawImage(c,x0,y0,o.width,o.height,0,0,o.width,o.height); return o;
}
/* flood-fill near-white pixels from the border so white inside the product stays */
function removeWhite(src, tol=30){
  const c=toCanvas(src, 1000); if(hasTransparency(c)) return trim(c);
  const ctx=c.getContext('2d'), w=c.width, h=c.height, im=ctx.getImageData(0,0,w,h), d=im.data;
  const white=new Uint8Array(w*h), bg=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){ const r=d[i*4],g=d[i*4+1],b=d[i*4+2]; white[i] = (255-Math.min(r,g,b))<tol && (Math.max(r,g,b)-Math.min(r,g,b))<26 ? 1:0; }
  const stack=[];
  for(let x=0;x<w;x++){ stack.push(x, (h-1)*w+x); } for(let y=0;y<h;y++){ stack.push(y*w, y*w+w-1); }
  while(stack.length){ const p=stack.pop(); if(bg[p]||!white[p]) continue; bg[p]=1; const x=p%w, y=(p/w)|0;
    if(x>0)stack.push(p-1); if(x<w-1)stack.push(p+1); if(y>0)stack.push(p-w); if(y<h-1)stack.push(p+w); }
  for(let i=0;i<w*h;i++){
    if(bg[i]){ d[i*4+3]=0; continue; }
    const x=i%w,y=(i/w)|0; let n=0;
    if(x>0&&bg[i-1])n++; if(x<w-1&&bg[i+1])n++; if(y>0&&bg[i-w])n++; if(y<h-1&&bg[i+w])n++;
    if(n){ const lum=255-Math.min(d[i*4],d[i*4+1],d[i*4+2]); d[i*4+3]=Math.min(255, Math.max(70, lum*3)); }
  }
  ctx.putImageData(im,0,0); return trim(c);
}
function productCanvas(p){ return S.removeBg ? (p.cut ||= removeWhite(p.orig)) : (p.plain ||= trim(toCanvas(p.orig,1000))); }

/* ---------- drawing helpers ---------- */
const W=1200;
function font(w,size,fam){ return `${w} ${size}px ${fam==='kr'?"'Noto Sans KR'":"'Poppins'"}, sans-serif`; }
function setLS(ctx,px){ if('letterSpacing' in ctx) ctx.letterSpacing = px+'px'; }
function text(ctx,s,x,y,{w=800,size=40,fam='en',color='#1E1F22',align='left',ls=0,maxW=0}={}){
  ctx.save(); let sz=size; ctx.textBaseline='top'; ctx.textAlign=align; ctx.fillStyle=color;
  for(;;){ ctx.font=font(w,sz,fam); setLS(ctx, ls*sz/size); if(!maxW || ctx.measureText(s).width<=maxW || sz<10) break; sz*=0.95; }
  ctx.fillText(s,x,y); const width=ctx.measureText(s).width; ctx.restore(); return {width, size:sz};
}
function measure(ctx,s,w,size,fam='en',ls=0){ ctx.save(); ctx.font=font(w,size,fam); setLS(ctx,ls); const m=ctx.measureText(s).width; ctx.restore(); return m; }
function cover(ctx,img,x,y,w,h,fx=0.5,fy=0.5){
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, s=Math.max(w/iw,h/ih), sw=w/s, sh=h/s;
  const sx=(iw-sw)*fx, sy=(ih-sh)*fy; ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
function shoe(ctx,c,x,y,w,h,{pad=0.08,shadow=true}={}){
  const s=Math.min(w*(1-pad*2)/c.width, h*(1-pad*2)/c.height), dw=c.width*s, dh=c.height*s;
  const dx=x+(w-dw)/2, base=y+h-h*pad, dy=base-dh;
  if(shadow){ ctx.save(); ctx.translate(dx+dw/2, base-2); ctx.scale(dw*0.5, 14); const g=ctx.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,'rgba(20,16,12,0.30)'); g.addColorStop(1,'rgba(20,16,12,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,1,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  ctx.drawImage(c,dx,dy,dw,dh);
}
function rrect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x,y,w,h,r) : ctx.rect(x,y,w,h); }
function lockupWidth(ctx,h){
  const L=IMG.logo; let w=L ? h*(L.width/L.height) : 0;
  const np=IMG.np[S.np]; if(np && S.np!=='none'){ w += h*0.34*2 + measure(ctx,'×',300,h*0.62) + h*0.72*(np.width/np.height); }
  return w;
}
function lockup(ctx,x,y,h,{xColor='#1E1F22',center=false}={}){
  if(center) x = x - lockupWidth(ctx,h)/2;
  const L=IMG.logo; if(L){ const lw=h*(L.width/L.height); ctx.drawImage(L,x,y,lw,h); x+=lw; }
  const np=IMG.np[S.np]; if(np && S.np!=='none'){
    const g=h*0.34; x+=g; const xs=h*0.62; text(ctx,'×',x,y+(h-xs)/2-xs*0.08,{w:300,size:xs,color:xColor}); x+=measure(ctx,'×',300,xs)+g;
    const nh=h*0.72, nw=nh*(np.width/np.height); ctx.drawImage(np,x,y+(h-nh)/2,nw,nh);
  }
}
function upTo(ctx,x,y,size,color,align='left'){ // stacked UP / TO, returns width
  const w=Math.max(measure(ctx,'UP',800,size),measure(ctx,'TO',800,size)); const ax = align==='right'? x-w : x;
  text(ctx,'UP',ax,y,{w:800,size,color}); text(ctx,'TO',ax,y+size*0.92,{w:800,size,color}); return w;
}
function titleLines(){ const t=S.title.trim(); const parts=t.split(/\s+/); return parts.length===2 ? parts : [t]; }
function arrow(ctx,x,y,s,color){ ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=s*0.13; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+s*0.32,y+s*0.32); ctx.lineTo(x,y+s*0.64); ctx.stroke(); ctx.restore(); }
function models(i){ return IMG.models.length ? IMG.models[i % IMG.models.length] : null; }
function prods(){ return IMG.products.map(productCanvas); }
const FX=()=>S.focusX/100, FY=()=>S.focusY/100;

function edgeColor(img){ const c=document.createElement('canvas'); c.width=c.height=8; const x=c.getContext('2d'); const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
  x.drawImage(img,0,0,iw*0.15,ih*0.15,0,0,8,8); const d=x.getImageData(0,0,8,8).data; let r=0,g=0,b=0; for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];} const n=d.length/4; return `rgb(${r/n|0},${g/n|0},${b/n|0})`; }
/* model anchored to the bottom of an area, edges faded into a matching backdrop so copy above stays clear */
function placeModel(ctx,img,x,y,w,h,fx){
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, s=h/ih, dw=iw*s, dh=h;
  const dx = x + (w-dw)*fx, o=document.createElement('canvas'); o.width=Math.ceil(dw); o.height=Math.ceil(dh); const oc=o.getContext('2d');
  oc.drawImage(img,0,0,dw,dh); oc.globalCompositeOperation='destination-in';
  const f=60; let g=oc.createLinearGradient(0,0,0,f*2); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'#000'); oc.fillStyle=g; oc.fillRect(0,0,dw,dh);
  g=oc.createLinearGradient(0,0,f,0); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'#000'); oc.fillStyle=g; oc.fillRect(0,0,f,dh);
  g=oc.createLinearGradient(dw-f,0,dw,0); g.addColorStop(0,'#000'); g.addColorStop(1,'rgba(0,0,0,0)'); oc.fillStyle=g; oc.fillRect(dw-f,0,f,dh);
  ctx.drawImage(o,dx,y);
}
/* ---------- layouts ---------- */
const DRAW = {
  C(ctx){
    const m=models(0); ctx.fillStyle=m?edgeColor(m):'#F4F4F6'; ctx.fillRect(0,0,W,W);
    if(m) placeModel(ctx,m,0,330,830,870,FX());
    lockup(ctx,60,40,42);
    text(ctx,S.season,60,96,{w:900,size:50,fam:'kr',color:S.accent});
    text(ctx,S.title,60,150,{w:+S.titleWeight,size:96,ls:-3,color:'#1E1F22',maxW:740});
    ctx.font=font(900,34,'kr'); setLS(ctx,-1); const tw=ctx.measureText(S.cta).width; setLS(ctx,0);
    const bw=tw+30*2+38; ctx.fillStyle=S.accent; ctx.fillRect(60,250,bw,66);
    text(ctx,S.cta,90,266,{w:900,size:34,fam:'kr',color:'#FFFFFF',ls:-1}); arrow(ctx,90+tw+16,272,26,'#FFFFFF');
    const P=prods().slice(0,5); const n=Math.max(P.length,1), gap=n>3?16:22, colH=1120, ch=(colH-gap*(n-1))/n;
    P.forEach((p,i)=>{ const y=40+i*(ch+gap); ctx.save(); ctx.shadowColor='rgba(30,31,34,0.12)'; ctx.shadowBlur=18; ctx.shadowOffsetY=6;
      ctx.fillStyle='#FFFFFF'; ctx.fillRect(840,y,300,ch); ctx.restore(); shoe(ctx,p,840,y,300,ch,{pad:0.1}); });
  },
  E(ctx){
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,W);
    const m=models(0); if(m) cover(ctx,m,0,0,800,W,FX(),FY());
    lockup(ctx,44,40,40);
    text(ctx,S.season,44,104,{w:800,size:26,color:S.accent});
    const L=titleLines(); let y=136; L.forEach(l=>{ text(ctx,l,44,y,{w:+S.titleWeight,size:86,ls:-3,color:'#1E1F22',maxW:700}); y+=79; });
    y+=26; text(ctx,S.dateKo,44,y,{w:700,size:26,fam:'kr',color:'#1E1F22'}); y+=40;
    text(ctx,S.sub,44,y,{w:900,size:36,fam:'kr',color:S.accent});
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(800,0,400,W);
    const P=prods().slice(0,3); const ch=(W-6)/3;
    for(let i=0;i<3;i++){ const y0=i*(ch+3); ctx.fillStyle='#E6E6E8'; ctx.fillRect(800,y0,400,ch); if(P[i]) shoe(ctx,P[i],820,y0,360,ch,{pad:0.12}); }
  },
  F(ctx){
    ctx.fillStyle='#E7E2DA'; ctx.fillRect(0,0,W,W);
    const pad=46,gap=26,cs=(W-pad*2-gap*2)/3, P=prods(); let mi=0, pi=0;
    const order=['m','p','m','p','t','p','m','p','m'];
    order.forEach((k,i)=>{ const x=pad+(i%3)*(cs+gap), y=pad+Math.floor(i/3)*(cs+gap);
      ctx.save(); ctx.shadowColor='rgba(60,45,30,0.16)'; ctx.shadowBlur=18; ctx.shadowOffsetY=10; ctx.fillStyle='#FFFFFF'; ctx.fillRect(x,y,cs,cs); ctx.restore();
      if(k==='m'){ const m=models(mi++); if(m){ cover(ctx,m,x+12,y+12,cs-24,cs-46, mi===1?FX():0.5, mi===1?FY():0.35); } }
      else if(k==='p'){ ctx.fillStyle='#F2F0EC'; ctx.fillRect(x+12,y+12,cs-24,cs-46); const p=P.length?P[pi++%P.length]:null; if(p) shoe(ctx,p,x+12,y+12,cs-24,cs-46,{pad:0.12}); }
      else { const cx=x+cs/2; const L=titleLines(); const lh=65; const blockH=34+18+lh*L.length+12+86; let yy=y+(cs-blockH)/2;
        lockup(ctx,cx,yy,34,{center:true}); yy+=34+18;
        L.forEach(l=>{ text(ctx,l,cx,yy,{w:+S.titleWeight,size:72,ls:-2,color:'#2A1D14',align:'center',maxW:cs-30}); yy+=lh; });
        yy+=12; const pw=measure(ctx,S.percent+'%',800,86,'en',-3), uw=Math.max(measure(ctx,'UP',800,24),measure(ctx,'TO',800,24)), tot=uw+8+pw, sx=cx-tot/2;
        upTo(ctx,sx,yy+22,24,S.accent); text(ctx,S.percent+'%',sx+uw+8,yy,{w:800,size:86,ls:-3,color:S.accent}); }
      ctx.fillStyle='#A8A39C'; ctx.beginPath(); ctx.arc(x+cs/2,y,9,0,Math.PI*2); ctx.fill();
    });
  },
  J(ctx){
    ctx.fillStyle='#E3E3E4'; ctx.fillRect(0,0,W,W);
    lockup(ctx,56,40,40);
    text(ctx,S.oneDay,600,112,{w:600,size:28,ls:10,align:'center',color:'#1E1F22'});
    text(ctx,S.title,600,150,{w:+S.titleWeight,size:118,ls:-4,align:'center',color:'#1E1F22',maxW:1100});
    const ds=`${S.year}.${S.dateEn}`; const dw=measure(ctx,ds+' ',800,46), pw=measure(ctx,`(${S.dow})`,800,30), sx=600-(dw+pw)/2;
    text(ctx,ds,sx,284,{w:800,size:46,color:S.accent}); text(ctx,`(${S.dow})`,sx+dw,298,{w:800,size:30,color:S.accent});
    const spots=[[52,384,-4],[330,404,3],[610,380,-2],[890,400,5],[66,668,4],[344,682,-3],[620,664,2],[896,684,-5]];
    const P=prods(); const pool=[]; for(let i=0;i<8;i++){ pool.push(i%2===0 && P.length ? {p:P[(i/2|0)%P.length]} : (IMG.models.length? {m:models(i)} : (P.length?{p:P[i%P.length]}:null))); }
    spots.forEach(([x,y,r],i)=>{ ctx.save(); ctx.translate(x+126,y+126); ctx.rotate(r*Math.PI/180);
      ctx.shadowColor='rgba(30,31,34,0.18)'; ctx.shadowBlur=16; ctx.shadowOffsetY=8; ctx.fillStyle='#FFFFFF'; ctx.fillRect(-126,-126,252,252); ctx.shadowColor='transparent';
      const it=pool[i]; if(it&&it.m) cover(ctx,it.m,-116,-116,232,232,0.5,0.6); else { ctx.fillStyle='#F2F0EC'; ctx.fillRect(-116,-116,232,232); if(it&&it.p) shoe(ctx,it.p,-116,-116,232,232,{pad:0.1}); }
      ctx.restore(); });
    const big=170, pw2=measure(ctx,S.percent+'%',800,big,'en',-6), ow=measure(ctx,'OFF',800,big,'en',-4), uw=Math.max(measure(ctx,'UP',800,52),measure(ctx,'TO',800,52));
    const tot=uw+18+pw2+18+ow, x0=600-tot/2;
    upTo(ctx,x0,968+46,52,'#1E1F22'); text(ctx,S.percent+'%',x0+uw+18,968,{w:800,size:big,ls:-6,color:S.accent}); text(ctx,'OFF',x0+uw+18+pw2+18,968,{w:800,size:big,ls:-4,color:'#1E1F22'});
  },
  H(ctx){
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,W);
    lockup(ctx,60,40,33); let x=60+lockupWidth(ctx,33)+18; ctx.fillStyle='#1E1F22'; ctx.fillRect(x,41,2,30); x+=20;
    text(ctx,S.title,x,40,{w:600,size:34,ls:8,color:'#1E1F22',maxW:S.showDatePill?440:760});
    if(S.showDatePill){ const t=`${S.dateEn} ONLY`, tw=measure(ctx,t,800,38); const pw=tw+52; ctx.fillStyle='#1E1F22'; rrect(ctx,1140-pw,25,pw,62,31); ctx.fill(); text(ctx,t,1140-pw+26,37,{w:800,size:38,color:'#FFFFFF'}); }
    const pw=measure(ctx,S.percent+'%',800,124,'en',-4); text(ctx,S.percent+'%',1140-pw,114,{w:800,size:124,ls:-4,color:S.accent});
    const uw=upTo(ctx,1140-pw-10,146,34,S.accent,'right');
    text(ctx,S.headline,60,114,{w:800,size:124,ls:-4,color:'#1E1F22',maxW:1080-pw-uw-40});
    const m=models(0); if(m) cover(ctx,m,0,262,W,712,FX(),FY());
    const P=prods().slice(0,3), cw=(W-48-32)/3; P.forEach((p,i)=>shoe(ctx,p,24+i*(cw+16),984,cw,210,{pad:0.06}));
  }
};

/* ---------- UI ---------- */
const canvases={};
function buildGrid(){
  const g=$('grid'); g.textContent='';
  LAYOUTS.filter(l=>S.layouts[l.id]).forEach(l=>{
    const card=document.createElement('article'); card.className='card';
    const c=document.createElement('canvas'); c.width=W; c.height=W; c.setAttribute('role','img'); c.setAttribute('aria-label',`${l.name} 미리보기`);
    const meta=document.createElement('div'); meta.className='meta';
    const t=document.createElement('div'); const n=document.createElement('div'); n.className='name'; n.textContent=l.name; const s=document.createElement('div'); s.className='sub'; s.textContent=l.sub; t.append(n,s);
    const b=document.createElement('button'); b.className='btn saveOne'; b.type='button'; b.textContent='PNG 저장'; b.addEventListener('click',()=>saveOne(l.id));
    meta.append(t,b); card.append(c,meta); g.append(card); canvases[l.id]=c;
  });
}
let raf=0;
function render(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{
  LAYOUTS.forEach(l=>{ const c=canvases[l.id]; if(!c||!S.layouts[l.id]) return; const ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,W,W);
    try{ DRAW[l.id](ctx); }catch(e){ console.error(e); } });
  const n=LAYOUTS.filter(l=>S.layouts[l.id]).length;
  $('status').textContent = (!IMG.models.length && !IMG.products.length) ? `시안 ${n}개 · 모델컷과 제품컷을 올리면 미리보기가 채워져요` : `시안 ${n}개 · 모델컷 ${IMG.models.length}장 · 제품컷 ${IMG.products.length}개`;
}); }

function thumbs(){
  const mk=(box,list,kind)=>{ box.textContent=''; list.forEach((it,i)=>{ const d=document.createElement('div'); d.className='thumb';
      d.style.backgroundImage=`url("${kind==='m'? it.src : productCanvas(it).toDataURL('image/png')}")`;
      const x=document.createElement('button'); x.type='button'; x.textContent='×'; x.setAttribute('aria-label', (kind==='m'?'모델컷 ':'제품컷 ')+(i+1)+' 빼기');
      x.addEventListener('click',()=>{ list.splice(i,1); thumbs(); render(); }); d.append(x); box.append(d); }); };
  mk($('modelThumbs'),IMG.models,'m'); mk($('productThumbs'),IMG.products,'p');
  $('modelCount').textContent=IMG.models.length+'장'; $('productCount').textContent=IMG.products.length+'개';
  $('logoThumb').style.backgroundImage = IMG.logo ? `url("${IMG.logo.toDataURL()}")` : 'none';
  const np=S.np!=='none' && IMG.np[S.np]; $('partnerThumb').style.backgroundImage = np ? `url("${(np.toDataURL? np.toDataURL() : np.src)}")` : 'none';
}

const TEXT_FIELDS=['brandName','season','title','headline','oneDay','percent','dateEn','year','dow','dateKo','cta','sub'];
function syncForm(){
  TEXT_FIELDS.forEach(k=>$(k).value=S[k]); $('showDatePill').checked=S.showDatePill; $('titleWeight').value=S.titleWeight;
  $('npVariant').value=S.np; $('partnerRow').hidden=S.np!=='custom'; $('focusX').value=S.focusX; $('focusY').value=S.focusY; $('removeBg').checked=S.removeBg; $('logoWhiteBg').checked=S.logoWhiteBg;
  document.querySelectorAll('.sw').forEach(b=>b.setAttribute('aria-pressed', b.dataset.c===S.accent));
  $('accentPick').value=S.accent;
  document.querySelectorAll('#layoutChips input').forEach(i=>i.checked=!!S.layouts[i.value]);
}
function initForm(){
  TEXT_FIELDS.forEach(k=>$(k).addEventListener('input',e=>{ S[k]=e.target.value; render(); }));
  $('showDatePill').addEventListener('change',e=>{S.showDatePill=e.target.checked; render();});
  $('titleWeight').addEventListener('change',e=>{S.titleWeight=e.target.value; render();});
  $('npVariant').addEventListener('change',e=>{S.np=e.target.value; $('partnerRow').hidden=S.np!=='custom'; thumbs(); render();});
  $('partnerFile').addEventListener('change',async e=>{ const f=e.target.files[0]; if(!f) return; const img=await fileToImg(f);
    IMG.np.custom = S.logoWhiteBg ? removeWhite(img,24) : trim(toCanvas(img,800)); thumbs(); render(); e.target.value=''; });
  $('logoClear').addEventListener('click',()=>{ IMG.logo=null; thumbs(); render(); });
  $('focusX').addEventListener('input',e=>{S.focusX=+e.target.value; render();});
  $('focusY').addEventListener('input',e=>{S.focusY=+e.target.value; render();});
  $('removeBg').addEventListener('change',e=>{S.removeBg=e.target.checked; thumbs(); render();});
  $('logoWhiteBg').addEventListener('change',e=>{S.logoWhiteBg=e.target.checked;});
  const sw=$('accentSwatches'); ACCENTS.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.className='sw'; b.dataset.c=c; b.style.background=c; b.setAttribute('aria-label','포인트 컬러 '+c);
    b.addEventListener('click',()=>{ S.accent=c; syncForm(); render(); }); sw.append(b); });
  const pick=document.createElement('input'); pick.type='color'; pick.id='accentPick'; pick.setAttribute('aria-label','포인트 컬러 직접 고르기');
  pick.addEventListener('input',e=>{ S.accent=e.target.value; document.querySelectorAll('.sw').forEach(b=>b.setAttribute('aria-pressed','false')); render(); }); sw.append(pick);
  const chips=$('layoutChips'); LAYOUTS.forEach(l=>{ const lab=document.createElement('label'); const i=document.createElement('input'); i.type='checkbox'; i.value=l.id; i.id='lay'+l.id;
    i.addEventListener('change',()=>{ S.layouts[l.id]=i.checked; buildGrid(); render(); }); lab.htmlFor=i.id; lab.append(i,document.createTextNode(l.name)); chips.append(lab); });
  $('logoFile').addEventListener('change',async e=>{ const f=e.target.files[0]; if(!f) return; const img=await fileToImg(f);
    IMG.logo = S.logoWhiteBg ? removeWhite(img,24) : trim(toCanvas(img,800)); thumbs(); render(); e.target.value=''; });
  $('modelFile').addEventListener('change',async e=>{ for(const f of e.target.files){ IMG.models.push(await fileToImg(f)); } thumbs(); render(); e.target.value=''; });
  $('productFile').addEventListener('change',async e=>{ for(const f of e.target.files){ IMG.products.push({orig:await fileToImg(f)}); } thumbs(); render(); e.target.value=''; });
  initPresets();
}

async function loadBuiltins(){
  const [o,b,w]=await Promise.all([BUILTIN.np_orig,BUILTIN.np_black,BUILTIN.np_white].map(src=>loadImg(src).catch(()=>null)));
  Object.assign(IMG.np,{orig:o,black:b,white:w});
}

/* ---------- brand presets: IndexedDB in this browser + JSON file export/import ---------- */
const PRESET_APP='gfa-banner-maker', PRESET_V=1;
const store={ mem:new Map(), db:null,
  async open(){ if(this.db!==null) return this.db; try{ this.db=await new Promise((res,rej)=>{ const r=indexedDB.open('gfa-banner-maker',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('presets',{keyPath:'id'}); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
    catch(e){ this.db=false; } return this.db; },
  async tx(mode,fn){ const db=await this.open(); if(!db) return fn(null);
    return new Promise((res,rej)=>{ const t=db.transaction('presets',mode); const os=t.objectStore('presets'); let out; Promise.resolve(fn(os)).then(v=>out=v);
      t.oncomplete=()=>res(out); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error); }); },
  async all(){ const db=await this.open(); if(!db) return [...this.mem.values()];
    return new Promise((res,rej)=>{ const r=db.transaction('presets').objectStore('presets').getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); },
  async put(p){ const db=await this.open(); if(!db){ this.mem.set(p.id,p); return; } await this.tx('readwrite',os=>{ os.put(p); }); },
  async del(id){ const db=await this.open(); if(!db){ this.mem.delete(id); return; } await this.tx('readwrite',os=>{ os.delete(id); }); }
};
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ v==null ? localStorage.removeItem(k) : localStorage.setItem(k,v); }catch(e){} }
function say(t,tone){ const m=$('presetMsg'); m.textContent=t; if(tone) m.dataset.tone=tone; else delete m.dataset.tone; }

function imgToDataURL(img,{max=1400,keepAlpha=false}={}){
  const c=toCanvas(img,max); if(keepAlpha || hasTransparency(c)) return c.toDataURL('image/png');
  return c.toDataURL('image/jpeg',0.86);
}
async function snapshot(name,withPhotos){
  const settings=JSON.parse(JSON.stringify(S));
  const images={ logo: IMG.logo ? IMG.logo.toDataURL('image/png') : null,
                 partner: IMG.np.custom ? imgToDataURL(IMG.np.custom,{max:800,keepAlpha:true}) : null };
  if(withPhotos){ images.models=IMG.models.map(m=>imgToDataURL(m,{max:1400})); images.products=IMG.products.map(p=>imgToDataURL(p.orig,{max:1200})); }
  return { app:PRESET_APP, v:PRESET_V, name, savedAt:new Date().toISOString(), settings, images };
}
async function applyPreset(p){
  S=Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), p.settings||{}); S.layouts=Object.assign({},DEFAULTS.layouts,(p.settings||{}).layouts||{});
  const im=p.images||{};
  IMG.logo = im.logo ? trim(toCanvas(await loadImg(im.logo),800)) : null;
  IMG.np.custom = im.partner ? trim(toCanvas(await loadImg(im.partner),800)) : null;
  IMG.models = Array.isArray(im.models) ? await Promise.all(im.models.map(loadImg)) : [];
  IMG.products = Array.isArray(im.products) ? (await Promise.all(im.products.map(loadImg))).map(orig=>({orig})) : [];
  $('presetName').value=p.name||''; $('presetPhotos').checked=Array.isArray(im.models)||Array.isArray(im.products);
  syncForm(); buildGrid(); thumbs(); render();
}
function validPreset(p){ return p && p.app===PRESET_APP && typeof p.settings==='object' && p.settings; }
async function refreshPresetList(selectId){
  let list=[]; try{ list=await store.all(); }catch(e){}
  list.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));
  const sel=$('presetSel'); sel.textContent='';
  const first=document.createElement('option'); first.value=''; first.textContent = list.length ? '프리셋 고르기' : '저장된 프리셋 없음'; sel.append(first);
  list.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name||'이름 없음'; sel.append(o); });
  sel.value = selectId && list.some(p=>p.id===selectId) ? selectId : '';
  return list;
}
function slug(s){ return (s||'preset').trim().replace(/[\\/:*?"<>|\s]+/g,'_').slice(0,60) || 'preset'; }
function downloadBlob(blob,name){ saveBlob(blob,name); }
function initPresets(){
  $('presetSel').addEventListener('change',async e=>{ const id=e.target.value; if(!id) return;
    try{ const p=(await store.all()).find(x=>x.id===id); if(!p) return; await applyPreset(p); lsSet('gfa-last-preset',id); say(`'${p.name}' 프리셋을 불러왔어요.`,'ok'); }
    catch(err){ console.error(err); say('프리셋을 불러오지 못했어요.','err'); } });
  $('presetSave').addEventListener('click',async()=>{
    const name=$('presetName').value.trim() || S.brandName.trim(); if(!name){ say('프리셋 이름이나 브랜드명을 먼저 적어 주세요.','err'); $('presetName').focus(); return; }
    try{ const list=await store.all(); const same=list.find(p=>p.name===name);
      const p=await snapshot(name,$('presetPhotos').checked); p.id = same ? same.id : 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      await store.put(p); await refreshPresetList(p.id); lsSet('gfa-last-preset',p.id);
      say(same ? `'${name}' 프리셋을 덮어썼어요.` : `'${name}' 프리셋을 저장했어요.`,'ok'); }
    catch(err){ console.error(err); say('이 브라우저에 저장하지 못했어요. 사진을 빼고 저장하거나 파일로 내보내 주세요.','err'); } });
  $('presetDel').addEventListener('click',async()=>{ const id=$('presetSel').value; if(!id){ say('삭제할 프리셋을 먼저 골라 주세요.','err'); return; }
    const name=$('presetSel').selectedOptions[0].textContent; if(!confirm(`'${name}' 프리셋을 삭제할까요?`)) return;
    try{ await store.del(id); if(lsGet('gfa-last-preset')===id) lsSet('gfa-last-preset',null); await refreshPresetList(); say(`'${name}' 프리셋을 삭제했어요.`); }
    catch(err){ say('삭제하지 못했어요.','err'); } });
  $('newBrand').addEventListener('click',()=>{ S=JSON.parse(JSON.stringify(DEFAULTS)); IMG.logo=null; IMG.np.custom=null; IMG.models=[]; IMG.products=[];
    $('presetName').value=''; $('presetSel').value=''; lsSet('gfa-last-preset',null); syncForm(); buildGrid(); thumbs(); render(); say('빈 설정으로 시작해요. 로고와 사진을 올려 주세요.'); });
  $('presetExport').addEventListener('click',async()=>{ const name=$('presetName').value.trim() || S.brandName.trim() || '브랜드';
    try{ const p=await snapshot(name,$('presetPhotos').checked); downloadBlob(new Blob([JSON.stringify(p)],{type:'application/json'}), `${slug(name)}.gfa.json`); say('프리셋 파일을 저장했어요. 다른 PC에서 [파일 가져오기]로 불러오면 돼요.','ok'); }
    catch(err){ say('파일을 만들지 못했어요.','err'); } });
  $('presetImport').addEventListener('change',async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    try{ const p=JSON.parse(await f.text()); if(!validPreset(p)) throw new Error('bad');
      await applyPreset(p); const list=await store.all(); const same=list.find(x=>x.name===p.name);
      p.id = same ? same.id : 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      try{ await store.put(p); await refreshPresetList(p.id); lsSet('gfa-last-preset',p.id); say(`'${p.name}' 프리셋을 가져와서 저장했어요.`,'ok'); }
      catch(err){ say(`'${p.name}' 프리셋을 불러왔어요. (이 브라우저에는 저장하지 못했어요)`,'ok'); } }
    catch(err){ say('GFA 배너 메이커 프리셋 파일이 아니에요.','err'); } });
}
async function restoreLast(){
  const list=await refreshPresetList(); const id=lsGet('gfa-last-preset'); const p=id && list.find(x=>x.id===id);
  if(p){ await applyPreset(p); $('presetSel').value=p.id; say(`지난번에 쓴 '${p.name}' 프리셋을 불러왔어요.`); }
}

/* ---------- saving ---------- */
function fileName(id){ const l=LAYOUTS.find(x=>x.id===id); return `${(S.brandName||'banner').replace(/[\\/:*?"<>|]/g,'')}_${(S.title||'').replace(/\s+/g,'')}_${l.name.replace(/\s+/g,'')}_1200.png`; }
function blobOf(id){ return new Promise(r=>canvases[id].toBlob(r,'image/png')); }
function saveBlob(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.append(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1500); }
async function saveOne(id){ saveBlob(await blobOf(id), fileName(id)); $('status').textContent='저장했어요: '+fileName(id); }
async function saveAll(){
  if(!window.JSZip) return; const st=$('status'); const btn=$('saveAll'); btn.disabled=true; st.textContent='ZIP 만드는 중…';
  try{ const zip=new JSZip(); for(const l of LAYOUTS){ if(S.layouts[l.id]) zip.file(fileName(l.id), await blobOf(l.id)); }
    saveBlob(await zip.generateAsync({type:'blob'}), `${S.brandName||'banner'}_GFA_1200.zip`); st.textContent='ZIP을 저장했어요.'; }
  catch(e){ st.textContent='저장하지 못했어요. 다시 눌러 주세요.'; }
  finally{ btn.disabled=false; }
}
$('saveAll').addEventListener('click',saveAll);

/* ---------- boot ---------- */
(async function(){
  initForm(); syncForm(); buildGrid();
  try{ await loadBuiltins(); }catch(e){ console.error(e); }
  try{ await restoreLast(); }catch(e){ console.error(e); }
  thumbs(); render();
  try{ await Promise.all(['300 20px Poppins','600 20px Poppins','800 20px Poppins','700 20px "Noto Sans KR"','900 20px "Noto Sans KR"'].map(f=>document.fonts.load(f,'가A'))); }catch(e){}
  render(); document.fonts && document.fonts.ready.then(render);
})();
