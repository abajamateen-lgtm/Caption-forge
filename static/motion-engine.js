/* Motion Studio engine: all drawing, no DOM except canvases. Needs icons.js loaded first. */
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const ss=x=>{x=cl(x);return x*x*(3-2*x)},eo=x=>1-Math.pow(1-cl(x),3),eb=x=>{x=Math.max(0,Math.min(1.5,x));const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const env=(t,a,b,fi=.5,fo=.5)=>ss(Math.min((t-a)/fi,(b-t)/fo));
const seg=s=>window.Intl&&Intl.Segmenter?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s||'')].map(x=>x.segment):Array.from(s||'');
const lines=s=>(s||'').split('\n').map(q=>q.trim()).filter(Boolean);
const hex=h=>{const n=parseInt((h||'#888888').slice(1,7),16)||0;return[n>>16&255,n>>8&255,n&255]};
const lum=h=>{const[r,g,b]=hex(h||'#ffffff');return(.299*r+.587*g+.114*b)/255};
const rgba=(h,a)=>{const[r,g,b]=hex(h);return`rgba(${r},${g},${b},${a})`};
const SANS='Inter,system-ui,-apple-system,"Segoe UI",sans-serif';
const RATIOS={'16:9':[16,9],'9:16':[9,16],'1:1':[1,1],'4:5':[4,5]};
const FONTS=['Inter','Anton','Bebas Neue','Bangers','Luckiest Guy','Permanent Marker'];
const HEAVY=new Set(FONTS.slice(1));
const ICON_STYLES={tile:'White tile',round:'White circle',solid:'Solid gradient',glass:'Glass',glow:'Glow',plain:'Plain'};
const PALETTES={
 Forge:{bg:'#0d0f14',c:['#FFC400','#2563EB','#E5322D']},
 Studio:{bg:'#fafafa',c:['#ff2ec4','#6a5cff','#ffa94d']},
 Mint:{bg:'#f3fbf7',c:['#10b981','#0ea5e9','#f59e0b']},
 Sunset:{bg:'#1a0f1f',c:['#ff6b6b','#feca57','#ff9ff3']},
 Ocean:{bg:'#08121f',c:['#22d3ee','#3b82f6','#a78bfa']},
 Neon:{bg:'#0a0a0f',c:['#39ff14','#ff2ec4','#00e5ff']},
 Mono:{bg:'#ffffff',c:['#111111','#555555','#999999']}};
const DEFIC=['zap','shield-check','rocket','heart','star','globe'];
let W=1280,H=720,U=1,FOCAL=1,cv=null,cx=null,oc=null,ox=null,P=null,T=0,INK='#111',MUT='#888',GUIDES=false,CERR='';
const fnt=(px,w=700)=>`${HEAVY.has(P.font)?400:w} ${px}px "${P.font}",${SANS}`;
const inkRGB=()=>INK=='#fff'?'255,255,255':'0,0,0';
const tot=()=>P.scenes.reduce((a,s)=>a+s.d,0),start=i=>P.scenes.slice(0,i).reduce((a,s)=>a+s.d,0);
function sceneAt(x){let a=0;for(let i=0;i<P.scenes.length;i++){if(x<a+P.scenes[i].d||i==P.scenes.length-1)return[i,a];a+=P.scenes[i].d}return[0,0]}
const imgs={};
function getImg(src){if(!src)return null;if(!imgs[src]){const i=new Image();i.src=src;imgs[src]=i}const i=imgs[src];return i.complete&&i.naturalWidth?i:null}
function attach(canvas){cv=canvas;cx=canvas.getContext('2d');setSize()}
function dims(ratio,q){const[rw,rh]=RATIOS[ratio]||RATIOS['16:9'],area=q==1080?2073600:921600,w=Math.round(Math.sqrt(area*rw/rh)/2)*2;return[w,Math.round(w*rh/rw/2)*2]}
function setSize(){[W,H]=dims(P.ratio,P.q);U=Math.sqrt(W*H/921600)*(H>W?1.12:1);FOCAL=(Math.min(W*9/16,H)/2)/Math.tan(20*Math.PI/180);
 if(cv){cv.width=W;cv.height=H}if(!oc){oc=document.createElement('canvas');ox=oc.getContext('2d')}oc.width=W;oc.height=H;texKey=null}

/* ---------- text: auto-wrap, *accent* words, entry animation from project ---------- */
function wrapPlain(txt,maxW){const out=[];let cur='';String(txt).split(/\s+/).forEach(w=>{const n=cur?cur+' '+w:w;if(cx.measureText(n).width>maxW&&cur){out.push(cur);cur=w}else cur=n});if(cur)out.push(cur);return out}
function rich(s,x,y,size,o,col,acc,dy=30,al=0,maxLines=4){if(o<=.01||!s)return;size*=U;dy*=U;const an=P.anim||'rise';
 cx.save();cx.globalAlpha=cl(o);if(an!='pop'&&o<1)cx.filter=`blur(${(1-o)*10*U}px)`;
 cx.font=fnt(size,800);cx.textBaseline='middle';cx.textAlign='left';
 const toks=[];String(s).split(/\*(.+?)\*/).forEach((p,i)=>p.split(/(\s+)/).forEach(w=>{if(w!=='')toks.push({w,a:i%2,sp:/^\s+$/.test(w),m:cx.measureText(w).width})}));
 const maxW=al?W-x-W*.05:W*.88,L=[];let cur={t:[],w:0};
 toks.forEach(k=>{if(!k.sp&&cur.w+k.m>maxW&&cur.t.length){L.push(cur);cur={t:[],w:0}}if(k.sp&&!cur.t.length)return;cur.t.push(k);cur.w+=k.m});
 if(cur.t.length)L.push(cur);
 L.forEach(l=>{while(l.t.length&&l.t[l.t.length-1].sp)l.w-=l.t.pop().m});
 const nl=Math.min(L.length,maxLines),mw=Math.max(1,...L.map(l=>l.w)),k0=Math.min(1,maxW/mw),lh=size*1.12;
 let sc=(.94+.06*o)*k0;if(an=='pop')sc*=.55+.45*eb(o);
 cx.translate(x,y+(an=='drop'?-(1-o)*dy:an=='fade'?0:(1-o)*dy));cx.scale(sc,sc);
 L.slice(0,nl).forEach((l,i)=>{let px=al?0:-l.w/2;const ly=(i-(nl-1)/2)*lh;l.t.forEach(k=>{cx.fillStyle=k.a?acc:col;cx.fillText(k.w,px,ly);px+=k.m})});
 cx.restore()}

/* ---------- icons (Lucide paths drawn with Path2D) ---------- */
const PATHS={};const path2=n=>PATHS[n]||(PATHS[n]=new Path2D(ICONS[n]||ICONS.sparkles));
function iconRaw(name,x,y,size,col,o={}){cx.save();cx.translate(x-size/2,y-size/2);cx.scale(size/24,size/24);let c=col;
 if(Array.isArray(col)){c=cx.createLinearGradient(0,0,24,24);c.addColorStop(0,col[0]);c.addColorStop(1,col[1])}
 cx.lineWidth=o.w||(P&&P.iw)||2;cx.lineCap='round';cx.lineJoin='round';cx.strokeStyle=c;const p=path2(name);
 if(o.fill){cx.save();cx.globalAlpha*=.92;cx.fillStyle=c;cx.fill(p);cx.restore()}cx.stroke(p);cx.restore()}
function iconTile(name,x,y,size,o,k=0,style){style=style||P.is||'tile';if(o<=.01||size<=0)return;const r=size/2,cols=[P.c[k%3],P.c[(k+1)%3]];
 cx.save();cx.globalAlpha*=cl(o);cx.translate(x,y);
 if(style=='tile'||style=='round'||style=='solid'||style=='glass'){
  cx.beginPath();cx.roundRect(-r,-r,size,size,(style=='round'||style=='glass')?r:size*.3);
  if(style=='solid'){const g=cx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,cols[0]);g.addColorStop(1,cols[1]);cx.fillStyle=g}
  else if(style=='glass')cx.fillStyle=`rgba(${inkRGB()},.08)`;else cx.fillStyle='#fff';
  if(style!='glass'){cx.shadowColor='rgba(20,20,40,.3)';cx.shadowBlur=size*.3;cx.shadowOffsetY=size*.08}
  cx.fill();cx.shadowBlur=0;cx.shadowOffsetY=0;
  if(style=='glass'){cx.strokeStyle=`rgba(${inkRGB()},.22)`;cx.lineWidth=Math.max(1,size*.02);cx.stroke()}}
 if(style=='glow'){cx.shadowColor=cols[0];cx.shadowBlur=size*.4}
 iconRaw(name,0,0,size*(style=='glow'||style=='plain'?.78:.5),style=='solid'?'#fff':style=='plain'?INK:cols);cx.restore()}
function emojiG(g,x,y,size,o,glow){if(o<=.01)return;cx.save();cx.globalAlpha=o;cx.font=`${size}px ${SANS}`;cx.textAlign='center';cx.textBaseline='middle';if(glow){cx.shadowColor='#ffc933';cx.shadowBlur=32*U}cx.translate(x,y);cx.scale(.5+.5*o,.5+.5*o);cx.fillText(g,0,0);cx.restore()}
function mark(x,y,r,sc=1){cx.save();cx.translate(x,y);cx.scale(sc,sc);cx.shadowColor='rgba(60,40,120,.25)';cx.shadowBlur=30*U;cx.shadowOffsetY=8*U;cx.fillStyle='#fff';cx.beginPath();cx.arc(0,0,r,0,7);cx.fill();cx.shadowBlur=0;cx.shadowOffsetY=0;iconRaw(P.logo||'sparkles',0,0,r*1.15,[P.c[0],P.c[1]],{w:2.2});cx.restore()}
function countText(txt0,p){const m=/^([^\d]*)(\d[\d,.]*)(.*)$/.exec((txt0||'').trim());if(!m)return txt0||'';const raw=m[2].replace(/,/g,''),v=parseFloat(raw)||0,dec=(raw.split('.')[1]||'').length,c=v*p;return m[1]+(m[2].includes(',')?c.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}):c.toFixed(dec))+m[3]}
function pair(q,sep){const i=q.indexOf(sep);return i<0?[q.trim(),'']:[q.slice(0,i).trim(),q.slice(i+1).trim()]}
function backdrop(bg,t){cx.fillStyle=bg;cx.fillRect(0,0,W,H);const m=P.bgs||'solid',L=lum(bg)>.55;
 if(m=='glow')[[.2,.25,0],[.8,.72,1],[.55,.05,2]].forEach(([a,b,i])=>{const x=W*(a+Math.sin(t*.3+i*2)*.06),y=H*(b+Math.cos(t*.25+i)*.05),r=Math.max(W,H)*.5,g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(P.c[i],L?.28:.34));g.addColorStop(1,rgba(P.c[i],0));cx.fillStyle=g;cx.fillRect(0,0,W,H)});
 else if(m=='gradient'){const g=cx.createLinearGradient(0,0,W,H);g.addColorStop(0,rgba(P.c[0],L?.14:.22));g.addColorStop(1,rgba(P.c[1],L?.14:.22));cx.fillStyle=g;cx.fillRect(0,0,W,H)}
 else if(m=='dots'||m=='grid'){cx.save();cx.fillStyle=cx.strokeStyle=`rgba(${L?'0,0,0':'255,255,255'},${m=='dots'?.13:.07})`;const s=48*U,off=(t*6*U)%s;cx.lineWidth=1;
  if(m=='dots'){for(let x=-s+off;x<W+s;x+=s)for(let y=-s;y<H+s;y+=s){cx.beginPath();cx.arc(x,y+off,2*U,0,7);cx.fill()}}
  else{cx.beginPath();for(let x=off;x<W;x+=s){cx.moveTo(x,0);cx.lineTo(x,H)}for(let y=off;y<H;y+=s){cx.moveTo(0,y);cx.lineTo(W,y)}cx.stroke()}cx.restore()}}
/* ================= 3D (built-in mini renderer, no libraries, works offline) ================= */
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]};
const rotX=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return[v[0],v[1]*c-v[2]*s,v[1]*s+v[2]*c]};
const rotY=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return[v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c]};
const rotZ=(v,a)=>{const c=Math.cos(a),s=Math.sin(a);return[v[0]*c-v[1]*s,v[0]*s+v[1]*c,v[2]]};
const LIGHT=nrm([4,6,6]);
// mesh = vertices + triangles whose normals are oriented outward (ref gives an outward hint per triangle)
function mk(V,F,ref,N){const T=F.map(([i,j,k])=>{const a=V[i],b=V[j],c=V[k];let n=nrm(cross(sub(b,a),sub(c,a)));if(dot(n,ref(i,j,k))<0)n=[-n[0],-n[1],-n[2]];
  let sn=n;if(N){const q=[N[i][0]+N[j][0]+N[k][0],N[i][1]+N[j][1]+N[k][1],N[i][2]+N[j][2]+N[k][2]];if(Math.hypot(q[0],q[1],q[2])>1e-6)sn=nrm(q)}return{i,j,k,n,sn}});return{V,T}}
const centreRef=V=>(i,j,k)=>[(V[i][0]+V[j][0]+V[k][0])/3,(V[i][1]+V[j][1]+V[k][1])/3,(V[i][2]+V[j][2]+V[k][2])/3];
function mkGrid(nu,nv,Pf,Nf){const V=[],N=[],F=[],ix=(i,j)=>i*(nv+1)+j;
  for(let i=0;i<=nu;i++)for(let j=0;j<=nv;j++){V.push(Pf(i/nu,j/nv));N.push(Nf(i/nu,j/nv))}
  for(let i=0;i<nu;i++)for(let j=0;j<nv;j++){const a=ix(i,j),b=ix(i+1,j),c=ix(i+1,j+1),d=ix(i,j+1);F.push([a,b,c],[a,c,d])}
  return mk(V,F,(i,j,k)=>[N[i][0]+N[j][0]+N[k][0],N[i][1]+N[j][1]+N[k][1],N[i][2]+N[j][2]+N[k][2]],N)}
const TAU=Math.PI*2;
const mSphere=()=>{const f=(u,v)=>[Math.cos(u*TAU)*Math.sin(v*Math.PI),Math.cos(v*Math.PI),Math.sin(u*TAU)*Math.sin(v*Math.PI)];return mkGrid(24,16,f,f)};
const mTorus=(R,r)=>mkGrid(28,14,(u,v)=>{const a=u*TAU,b=v*TAU;return[(R+r*Math.cos(b))*Math.cos(a),(R+r*Math.cos(b))*Math.sin(a),r*Math.sin(b)]},(u,v)=>{const a=u*TAU,b=v*TAU;return[Math.cos(b)*Math.cos(a),Math.cos(b)*Math.sin(a),Math.sin(b)]});
const mIco=r=>{const t=(1+Math.sqrt(5))/2,V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(v=>nrm(v).map(q=>q*r)),
  F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];return mk(V,F,centreRef(V))};
const mBox=s=>{const h=s/2,V=[];for(let i=0;i<8;i++)V.push([i&1?h:-h,i&2?h:-h,i&4?h:-h]);
  const Q=[[1,3,7,5],[0,4,6,2],[2,6,7,3],[0,1,5,4],[4,5,7,6],[0,2,3,1]],F=[];Q.forEach(([a,b,c,d])=>F.push([a,b,c],[a,c,d]));return mk(V,F,centreRef(V))};
const mCone=(r,h)=>{const n=32,V=[[0,h/2,0],[0,-h/2,0]],F=[];for(let i=0;i<n;i++){const a=i/n*TAU;V.push([r*Math.cos(a),-h/2,r*Math.sin(a)])}
  for(let i=0;i<n;i++){const a=2+i,b=2+(i+1)%n;F.push([0,a,b],[1,b,a])}return mk(V,F,centreRef(V))};
const kp=U=>{const cs=Math.cos(1.5*U);return[.6*(2+cs)*.5*Math.cos(U),.6*(2+cs)*.5*Math.sin(U),.6*Math.sin(1.5*U)*.5]};
const kn=(u,v)=>{const U=u*2*TAU,P1=kp(U),P2=kp(U+.01),T=sub(P2,P1),B=nrm(cross(T,[P2[0]+P1[0],P2[1]+P1[1],P2[2]+P1[2]])),Nn=nrm(cross(B,T)),c=Math.cos(v*TAU),s=Math.sin(v*TAU);return[c*Nn[0]+s*B[0],c*Nn[1]+s*B[1],c*Nn[2]+s*B[2]]};
const mKnot=()=>mkGrid(80,8,(u,v)=>{const P1=kp(u*2*TAU),n=kn(u,v);return[P1[0]+.22*n[0],P1[1]+.22*n[1],P1[2]+.22*n[2]]},kn);

let M3=null,texKey,cardCv=null;
function init3(){if(M3)return;
  M3=[[mTorus(1.1,.45),-3.4,.6,0],[mIco(1.2),-.4,-.9,.5],[mSphere(),2.6,.9,-.5],[mBox(1.5),3.8,-1.3,.8],[mCone(.9,1.8),.8,1.9,-1],[mKnot(),-2.2,-1.8,1]].map(([mesh,x,y,z])=>({mesh,x,y,z}))}

// draw lit, depth-sorted triangles of several meshes. items: {m,rgb,p,rx,ry,sc}
function render3(items,camZ,gry){ox.setTransform(1,0,0,1,0,0);ox.clearRect(0,0,W,H);const out=[];
  for(const it of items){const V=it.m.V.map(v=>{let q=[v[0]*it.sc,v[1]*it.sc,v[2]*it.sc];q=rotX(rotY(q,it.ry),it.rx);return rotY([q[0]+it.p[0],q[1]+it.p[1],q[2]+it.p[2]],gry)}),
    pj=V.map(v=>{const dp=camZ-v[2];return dp>.1?[W/2+v[0]*FOCAL/dp,H/2-v[1]*FOCAL/dp]:null});
    for(const t of it.m.T){const a=V[t.i],b=V[t.j],c=V[t.k],A=pj[t.i],B=pj[t.j],C=pj[t.k];if(!A||!B||!C)continue;
      const n=rotY(rotX(rotY(t.n,it.ry),it.rx),gry);if(!n[0]&&!n[1]&&!n[2])continue;
      const cx0=(a[0]+b[0]+c[0])/3,cy0=(a[1]+b[1]+c[1])/3,cz0=(a[2]+b[2]+c[2])/3;
      if(dot(n,[-cx0,-cy0,camZ-cz0])<=0)continue;
      const sn=rotY(rotX(rotY(t.sn,it.ry),it.rx),gry),l=Math.min(1.15,.5+.65*Math.max(0,dot(sn,LIGHT)));
      out.push({d:camZ-cz0,A,B,C,c:`rgb(${Math.min(255,it.rgb[0]*l)|0},${Math.min(255,it.rgb[1]*l)|0},${Math.min(255,it.rgb[2]*l)|0})`})}}
  out.sort((p,q)=>q.d-p.d);ox.lineWidth=.8;ox.lineJoin='round';
  for(const o of out){ox.fillStyle=o.c;ox.strokeStyle=o.c;ox.beginPath();ox.moveTo(o.A[0],o.A[1]);ox.lineTo(o.B[0],o.B[1]);ox.lineTo(o.C[0],o.C[1]);ox.closePath();ox.fill();ox.stroke()}}

// draw an image-textured tilted plane (16 x 9 units) using many small affine triangles
function texTri(img,s0,s1,s2,t0,t1,t2){const du1=t1[0]-t0[0],dv1=t1[1]-t0[1],du2=t2[0]-t0[0],dv2=t2[1]-t0[1],det=du1*dv2-du2*dv1;if(!det)return;
  const dx1=s1[0]-s0[0],dy1=s1[1]-s0[1],dx2=s2[0]-s0[0],dy2=s2[1]-s0[1],
    a=(dx1*dv2-dx2*dv1)/det,c=(du1*dx2-du2*dx1)/det,b=(dy1*dv2-dy2*dv1)/det,d=(du1*dy2-du2*dy1)/det,e=s0[0]-a*t0[0]-c*t0[1],f=s0[1]-b*t0[0]-d*t0[1],
    mx=(s0[0]+s1[0]+s2[0])/3,my=(s0[1]+s1[1]+s2[1]*1)/3,g=p=>{const x=p[0]-mx,y=p[1]-my,l=Math.hypot(x,y)||1;return[p[0]+x/l*.9,p[1]+y/l*.9]},P0=g(s0),P1=g(s1),P2=g(s2);
  ox.save();ox.beginPath();ox.moveTo(P0[0],P0[1]);ox.lineTo(P1[0],P1[1]);ox.lineTo(P2[0],P2[1]);ox.closePath();ox.clip();ox.setTransform(a,b,c,d,e,f);ox.drawImage(img,0,0);ox.restore()}
function drawCard(pos,rx,rz,camZ){ox.setTransform(1,0,0,1,0,0);ox.clearRect(0,0,W,H);if(!cardCv)return;const NX=18,NY=10,G=[];
  for(let j=0;j<=NY;j++){G.push([]);for(let i=0;i<=NX;i++){const q=rotZ(rotX([(i/NX-.5)*16,(.5-j/NY)*9,0],rx),rz),dp=camZ-(q[2]+pos[2]);G[j].push({s:[W/2+(q[0]+pos[0])*FOCAL/dp,H/2-(q[1]+pos[1])*FOCAL/dp],t:[i/NX*cardCv.width,j/NY*cardCv.height]})}}
  for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=G[j][i],b=G[j][i+1],c=G[j+1][i+1],d=G[j+1][i];texTri(cardCv,a.s,b.s,c.s,a.t,b.t,c.t);texTri(cardCv,a.s,c.s,d.s,a.t,c.t,d.t)}}
function cardTex(title){const k=title+P.brand+P.c.join();if(k==texKey)return;texKey=k;const c=document.createElement('canvas');c.width=1600;c.height=900;const g=c.getContext('2d'),gr=g.createLinearGradient(150,110,1450,790);P.c.forEach((q,i)=>gr.addColorStop(i/2,q));g.shadowColor=P.c[1];g.shadowBlur=90;g.fillStyle=gr;g.beginPath();g.roundRect(150,110,1300,680,44);g.fill();g.shadowBlur=0;g.fillStyle='#fff';g.beginPath();g.roundRect(160,120,1280,660,38);g.fill();
g.fillStyle='#111';g.font=`800 40px ${SANS}`;g.fillText(P.brand,210,200);g.font=`500 30px ${SANS}`;['Home','Notifications','Goals','Spaces'].forEach((q,i)=>{g.fillStyle=i?'#666':P.c[1];g.fillText(q,210,280+i*62)});
g.fillStyle='#111';g.font=`700 64px ${SANS}`;g.fillText(title,560,210);['Plan for next year','How to manage…','Refresh company…'].forEach((q,i)=>{g.strokeStyle='#e4e4e4';g.lineWidth=3;g.beginPath();g.roundRect(560+i*290,250,270,70,16);g.stroke();g.fillStyle='#444';g.font=`500 26px ${SANS}`;g.fillText(q,578+i*290,293)});
g.fillStyle='#111';g.font=`700 44px ${SANS}`;g.fillText('My Work',560,420);['#ffb020','#ff4d6d','#4d7cff'].forEach((q,i)=>{g.fillStyle=q;g.fillRect(560,470+i*85,28,28);g.fillStyle='#e8e8e8';g.fillRect(610,474+i*85,300+i*120,20);g.fillStyle='#f0f0f0';g.fillRect(960,474+i*85,200,20)});
cardCv=c}
function blit(e,blur){cx.save();cx.globalAlpha=e;if(blur>.3)cx.filter=`blur(${blur}px)`;cx.drawImage(oc,0,0,W,H);cx.restore()}



/* ================= scene catalogue ================= */
const TYPES={text:'Text',emoji:'Emoji',card:'3D card',orbit:'Orbit icons',logo:'Logo',shapes:'3D shapes',list:'Bullet list',counter:'Counter',quote:'Quote',bars:'Bar chart',image:'Image',big:'Big statement',
 features:'Feature grid',steps:'Steps',cta:'Call to action',ring:'Progress ring',kinetic:'Kinetic words',hero:'Icon hero',stats:'Stat cards',chat:'Chat bubbles',compare:'Before / after',marquee:'Marquee',testimonial:'Testimonial',custom:'Custom code'};
// [group, ui icon, description]
const TMETA={text:['Basics','type','Animated headline with accent words'],big:['Basics','maximize','Full-bleed gradient statement'],kinetic:['Basics','zap','One huge word at a time, on beat'],marquee:['Basics','repeat-2','Scrolling rows of giant text'],quote:['Basics','quote','Large pull quote with attribution'],
 emoji:['Basics','smile','Emoji orbit around a headline'],logo:['Brand','gem','Brand mark, name and tagline'],hero:['Brand','rocket','Big icon tile with pulse rings'],cta:['Brand','mouse-pointer-click','Button, cursor click and handle'],testimonial:['Brand','message-square-quote','Stars, quote and name'],
 list:['Lists','list','Rows that slide in, optional icons'],features:['Lists','layout-grid','Icon grid with labels'],steps:['Lists','list-ordered','Connected numbered steps'],compare:['Lists','columns-2','Two cards with crosses and ticks'],
 counter:['Data','hash','Count-up number with label'],ring:['Data','loader-circle','Animated percentage ring'],stats:['Data','gauge','Up to four stat cards'],bars:['Data','chart-column','Growing bar chart'],
 orbit:['Visual','orbit','Icons orbiting a brand mark'],card:['Visual','app-window','3D app window sweeping in'],shapes:['Visual','box','Floating lit 3D shapes'],image:['Visual','image','Your photo with slow zoom'],chat:['Visual','message-circle','Messaging conversation'],custom:['Code','code','Your own JavaScript drawing code']};
// which editor fields each scene uses, and what to call them
const USES={text:'x',emoji:'x e',card:'x',orbit:'ic e',logo:'x',shapes:'',list:'x l ic',counter:'x n ic',quote:'x l',bars:'x l',image:'x img',big:'x',features:'x l ic',steps:'x l ic',cta:'x l ic',ring:'x n',kinetic:'x',hero:'x l ic',stats:'x l',chat:'x l',compare:'x l',marquee:'x',testimonial:'x l',custom:'js'};
const HINT={features:{x:'Title',l:'Items (one per line)'},steps:{x:'Title',l:'Steps (one per line)'},cta:{x:'Button label',l:'Line 1: headline, line 2: handle or link'},ring:{x:'Label',n:'Percent (e.g. 85%)'},kinetic:{x:'Words (one flashes at a time)'},hero:{x:'Headline',l:'Line 1: subtitle'},
 stats:{x:'Title',l:'One per line: 12K: Users'},chat:{x:'Title (optional)',l:'One message per line, start with > for the right side'},compare:{x:'Headings: Old way | New way',l:'One row per line: left | right'},marquee:{x:'Text to repeat'},testimonial:{x:'Quote',l:'Line 1: person name'},
 list:{x:'Title',l:'Items (one per line)'},bars:{x:'Title',l:'One per line: Label: 40'},counter:{x:'Label',n:'Number (12,000+ or $4.5M)'},quote:{x:'Quote',l:'Attribution'},orbit:{e:'Emoji (used only when no icons are picked)'}};
const DEF={
 text:{d:2.5,x:'Your *words* here'},emoji:{d:3.5,x:'Feeling',e:'😀🎉✨'},card:{d:5,x:'LineUp'},orbit:{d:5,ic:['calendar','layers','clock','pencil','circle-check'],e:'📅🗂️🕐📝✅'},logo:{d:3,x:'your tagline here'},shapes:{d:6},
 list:{d:5,x:'Why *us*',l:'Fast\nSimple\nBeautiful'},counter:{d:3.5,x:'happy users',n:'12,000+'},quote:{d:4.5,x:'Simplicity is the *ultimate* sophistication',l:'Someone wise'},bars:{d:5,x:'Growth',l:'Jan: 20\nFeb: 45\nMar: 70\nApr: 95'},image:{d:4,x:'Caption here'},big:{d:3,x:'Big *statement*'},
 features:{d:5,x:'Everything you *need*',l:'Lightning fast\nSecure by default\nBuilt to scale\nLoved by teams',ic:['zap','shield-check','rocket','heart']},
 steps:{d:6,x:'How it *works*',l:'Sign up\nCreate\nShare',ic:['user-plus','pencil','send']},
 cta:{d:4,x:'Follow for more',l:'Enjoyed this?\n@yourhandle',ic:['arrow-right']},
 ring:{d:4,x:'customer satisfaction',n:'92%'},kinetic:{d:4,x:'Make it move make it matter'},hero:{d:4,x:'Launch *day*',l:'Built for creators',ic:['rocket']},
 stats:{d:5,x:'By the *numbers*',l:'12K: Users\n98%: Happy\n4.9: Rating'},
 chat:{d:7,x:'',l:'Did you see the new update?\n> Not yet, what changed?\nEverything. It is so fast now\n> Sending me the link right now'},
 compare:{d:6,x:'Old way | *New way*',l:'Slow exports | Instant exports\nManual work | Automated\nMessy files | Organized'},
 marquee:{d:4,x:'Keep it moving'},testimonial:{d:5,x:'This tool changed how we make videos. I cannot go back.',l:'Alex Morgan'},
 custom:{d:4,js:'// Paste your own drawing code. This one is a pulsing ring.\nfunction draw(ctx,t,d,e,api){\n  const {W,H,U,colors}=api;\n  const r=(140+Math.sin(t*3)*20)*U;\n  ctx.save();ctx.globalAlpha=e;\n  ctx.lineWidth=14*U;ctx.strokeStyle=colors[0];\n  ctx.beginPath();ctx.arc(W/2,H/2,r,0,Math.PI*2);ctx.stroke();\n  ctx.restore();\n  api.rich(scene_text(api),W/2,H/2,64,e,api.ink,colors[1]);\n}\nfunction scene_text(api){return api.text||"Custom *scene*"}\n'}};

/* ================= scene drawers: (scene, localTime, duration, fadeEnvelope) ================= */
const D={
text:(s,t,d,e)=>rich(s.x,W/2,H/2,92,e,INK,P.c[1]),
emoji(s,t,d,e){rich(s.x,W/2,H/2,92,e,INK,P.c[1]);const R=Math.min(230*U,Math.min(W,H)*.4),sy=H>W?1.1:.6;seg(s.e).forEach((g,k)=>{const a=k*2.1-2.5+Math.sin(t*1.5+k)*.3,r=R+(k%2)*30*U;emojiG(g,W/2+Math.cos(a)*r,H/2+Math.sin(a)*r*sy,64*U,env(t,.3+k*.2,d,.5,.5),1)});const c=ss(t/1.6);emojiG('👆',W/2+(190-130*c)*U,H/2+(135-110*c)*U,70*U,env(t,.5,d,.3,.3),0)},
card(s,t,d,e){init3();cardTex(s.x||'LineUp');const p=ss(t/d);drawCard([3-5*p,-1+p,-4+5*p],-1.1+.55*p,-.35+.25*p,10);blit(e,7*(1-eo(t/1.2))+7*cl(t-(d-1)))},
shapes(s,t,d,e){init3();const cz=11-3*ss(t/d),gry=Math.sin(t*.5)*.5,ys=H>W?1.9:1,col=[P.c[0],P.c[1],'#3bceac','#ffb020',P.c[2],'#2d9cff'];render3(M3.map((m,i)=>({m:m.mesh,rgb:hex(col[i]),p:[m.x,m.y*ys+Math.sin(t*1.2+i)*.3,m.z],rx:t*.5+i,ry:t*.6,sc:Math.max(.001,eb(t-.15*i))})),cz,gry);blit(e,0)},
orbit(s,t,d,e){const dr=eo(t/1.4),R1=Math.min(300*U,Math.min(W,H)*.44),R2=R1*.68,nm=s.ic&&s.ic.length?s.ic:null,em=seg(s.e||''),n=nm?nm.length:em.length;
 cx.save();cx.globalAlpha=e;cx.translate(W/2,H/2);[[R1,.7,-.35],[R2,.55,.55]].forEach(([r,len,sp],i)=>{const g=cx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,P.c[0]);g.addColorStop(.6,P.c[1]);g.addColorStop(1,P.c[2]);cx.strokeStyle=g;cx.lineWidth=6*U;cx.lineCap='round';cx.shadowColor=P.c[1];cx.shadowBlur=28*U;cx.beginPath();const a0=t*sp*1.6+i;cx.arc(0,0,r,a0,a0+6.283*len*dr);cx.stroke()});cx.restore();
 mark(W/2,H/2,58*U,eb(t-.2)*e);
 for(let k=0;k<n;k++){const o=k%2,a=k*6.283/n+t*(o?.9:-.6),r=o?R2:R1,x=W/2+Math.cos(a)*r,y=H/2+Math.sin(a)*r,sc=cl(eb(t-.4-k*.15),0,1.3);
  if(nm)iconTile(nm[k],x,y,92*U*sc,e,k);
  else{cx.save();cx.globalAlpha=e;cx.translate(x,y);cx.scale(sc,sc);cx.shadowColor='rgba(60,40,120,.25)';cx.shadowBlur=24*U;cx.shadowOffsetY=6*U;cx.fillStyle='#fff';cx.beginPath();cx.arc(0,0,44*U,0,7);cx.fill();cx.shadowBlur=0;cx.font=`${46*U}px ${SANS}`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(em[k],0,3);cx.restore()}}},
logo(s,t,d,e){mark(W/2,H/2-60*U,58*U,eb(t/.8)*1.3*(e>.02?1:0));rich(P.brand,W/2,H/2+60*U,80,env(t,.4,d,.6,.5),INK,INK,10);rich(s.x,W/2,H/2+135*U,30,env(t,1,d,.6,.5),MUT,MUT,10)},
list(s,t,d,e){const V=H>W,lx=V?W*.1:W*.26;rich(s.x,W/2,H*(V?.14:.18),72,env(t,0,d,.5,.5),INK,P.c[1]);
 const L=lines(s.l).slice(0,6),y0=H*(V?.3:.38),step=Math.min(96*U,H*(V?.6:.55)/Math.max(1,L.length));
 L.forEach((q,i)=>{const o=env(t,.5+i*.35,d,.45,.5);if(o<=.01)return;const y=y0+i*step,hi=s.ic&&s.ic[i];cx.save();cx.globalAlpha=o;cx.translate((1-o)*-50*U,0);
  if(hi)iconTile(hi,lx,y,Math.min(64*U,step*.82),1,i);else{cx.fillStyle=P.c[i%3];cx.beginPath();cx.arc(lx,y,14*U,0,7);cx.fill()}cx.restore();
  rich(q,lx+(hi?52*U:30*U),y,52,o,INK,P.c[1],20,1,2)})},
counter(s,t,d,e){const hi=s.ic&&s.ic[0],dy=hi?40*U:0;if(hi)iconTile(hi,W/2,H/2-200*U,96*U*cl(eb(t/.7),0,1.2),e,0);
 rich('*'+countText(s.n,eo(t/1.8)).replace(/\*/g,'')+'*',W/2,H/2-20*U+dy,200,e,INK,P.c[1]);rich(s.x,W/2,H/2+120*U+dy,48,env(t,.5,d,.5,.5),MUT,MUT,20)},
quote(s,t,d,e){const V=H>W;cx.save();cx.globalAlpha=e*.9;cx.fillStyle=P.c[0];cx.font=`900 ${240*U}px Georgia,serif`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText('\u201C',W/2,H/2-(V?250:150)*U+(1-e)*30*U);cx.restore();
 rich(s.x,W/2,H/2+10*U,64,e,INK,P.c[1]);rich(s.l,W/2,H/2+(V?230:130)*U,36,env(t,.6,d,.5,.5),MUT,MUT,15)},
bars(s,t,d,e){const V=H>W;rich(s.x,W/2,H*(V?.13:.15),68,env(t,0,d,.5,.5),INK,P.c[1]);
 const rows=lines(s.l).slice(0,6).map(q=>{const i=q.lastIndexOf(':');return{lab:i<0?q:q.slice(0,i).trim(),v:i<0?0:parseFloat(q.slice(i+1))||0}}),mx=Math.max(1,...rows.map(r=>r.v)),step=Math.min(96*U,H*(V?.58:.64)/Math.max(1,rows.length)),lx=W*(V?.3:.26),bwMax=W*(V?.5:.55),y0=H*(V?.3:.32);
 rows.forEach((r,i)=>{const o=env(t,.3+i*.2,d,.4,.5),g=eo((t-.5-i*.2)/1.1);if(o<=.01)return;const y=y0+i*step,bw=bwMax*r.v/mx*g;cx.save();cx.globalAlpha=o;cx.font=fnt(34*U,600);cx.textBaseline='middle';cx.textAlign='right';cx.fillStyle=INK;cx.fillText(r.lab,lx,y);cx.fillStyle=P.c[i%3];cx.beginPath();cx.roundRect(lx+30*U,y-22*U,Math.max(1,bw),44*U,12*U);cx.fill();cx.textAlign='left';cx.fillStyle=MUT;cx.fillText(String(Number((r.v*g).toFixed(1))),lx+30*U+bw+16*U,y);cx.restore()})},
image(s,t,d,e){const im=getImg(s.img);if(!im){rich(s.img?'Loading image...':'Choose an image in the panel',W/2,H/2,56,e,MUT,MUT);return}
 cx.save();cx.globalAlpha=e;const sc=Math.max(W/im.width,H/im.height)*(1.04+.08*t/d);cx.translate(W/2,H/2);cx.scale(sc,sc);cx.drawImage(im,-im.width/2,-im.height/2);cx.restore();
 if(s.x){cx.save();cx.globalAlpha=e*.75;const g=cx.createLinearGradient(0,H-260*U,0,H);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.8)');cx.fillStyle=g;cx.fillRect(0,H-260*U,W,260*U);cx.restore();rich(s.x,W/2,H-90*U,70,env(t,.4,d,.5,.5),'#fff','#ffd24d')}},
big(s,t,d,e){const g=cx.createLinearGradient(0,0,W,H);P.c.forEach((c,i)=>g.addColorStop(i/2,c));cx.save();cx.globalAlpha=e;cx.fillStyle=g;cx.fillRect(0,0,W,H);cx.restore();rich(s.x,W/2,H/2,110,e,'#fff','#111')},

features(s,t,d,e){const V=H>W,it=lines(s.l).slice(0,6),n=Math.max(1,it.length),cols=V?2:Math.min(3,n),rows=Math.ceil(n/cols);
 rich(s.x,W/2,H*(V?.13:.17),70,env(t,0,d,.5,.5),INK,P.c[1]);
 const top=H*(V?.25:.3),ah=H*(V?.66:.62),cw=W*(V?.84:.8)/cols,ch=Math.min(ah/rows,250*U),isz=Math.min(110*U,ch*.5);
 it.forEach((q,i)=>{const r=Math.floor(i/cols),c=i%cols,cnt=r==rows-1?n-r*cols:cols,x=W/2-cw*cnt/2+cw/2+c*cw,y=top+ch*r+ch/2,o=env(t,.4+i*.18,d,.4,.5),sc=cl(eb(t-.4-i*.18),0,1.2);if(o<=.01)return;
  iconTile((s.ic&&s.ic[i])||DEFIC[i%DEFIC.length],x,y-ch*.12,isz*sc,o,i);rich(q,x,y+isz*.55+6*U,32,o,INK,P.c[1],14,0,2)})},
steps(s,t,d,e){const V=H>W,it=lines(s.l).slice(0,5),n=Math.max(1,it.length);rich(s.x,W/2,H*(V?.12:.17),70,env(t,0,d,.5,.5),INK,P.c[1]);
 const pos=it.map((_,i)=>V?[W*.2,H*.27+(n>1?H*.58*i/(n-1):0)]:[n>1?W*.14+W*.72*i/(n-1):W/2,H*.52]);
 if(n>1){const a=pos[0],b=pos[n-1],lp=eo((t-.3)/Math.max(.6,(n-1)*.5));cx.save();cx.globalAlpha=e;cx.lineCap='round';cx.lineWidth=8*U;cx.strokeStyle=`rgba(${inkRGB()},.1)`;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.stroke();
  const g=cx.createLinearGradient(a[0],a[1],b[0],b[1]);g.addColorStop(0,P.c[0]);g.addColorStop(1,P.c[1]);cx.strokeStyle=g;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(a[0]+(b[0]-a[0])*lp,a[1]+(b[1]-a[1])*lp);cx.stroke();cx.restore()}
 it.forEach((q,i)=>{const o=env(t,.4+i*.5,d,.4,.5),sc=cl(eb(t-.4-i*.5),0,1.2);if(o<=.01)return;const[x,y]=pos[i];
  iconTile((s.ic&&s.ic[i])||DEFIC[i%DEFIC.length],x,y,96*U*sc,o,i);
  cx.save();cx.globalAlpha=o;cx.fillStyle=P.c[i%3];cx.beginPath();cx.arc(x+46*U,y-46*U,20*U,0,7);cx.fill();cx.fillStyle='#fff';cx.font=fnt(22*U,800);cx.textAlign='center';cx.textBaseline='middle';cx.fillText(String(i+1),x+46*U,y-45*U);cx.restore();
  if(V)rich(q,x+90*U,y,40,o,INK,P.c[1],14,1,2);else rich(q,x,y+108*U,36,o,INK,P.c[1],14,0,2)})},
cta(s,t,d,e){const V=H>W,L=lines(s.l),bw=Math.min(W*.82,620*U),bh=124*U,x=W/2,y=H/2+30*U,pop=cl(eb((t-.3)/.6),0,1.15),ck=ss((t-1.2)/.6),pr=(t*1.1)%1;
 rich(L[0],x,y-190*U,66,env(t,0,d,.5,.5),INK,P.c[1]);
 cx.save();cx.globalAlpha=e*(1-pr)*.6;cx.strokeStyle=P.c[0];cx.lineWidth=5*U;cx.beginPath();cx.roundRect(x-bw/2-pr*40*U,y-bh/2-pr*40*U,bw+pr*80*U,bh+pr*80*U,(bh+pr*80*U)/2);cx.stroke();cx.restore();
 cx.save();cx.globalAlpha=e;cx.translate(x,y);cx.scale(pop*(1-.05*Math.sin(Math.PI*cl((t-1.7)/.35))),pop*(1-.05*Math.sin(Math.PI*cl((t-1.7)/.35))));
 const g=cx.createLinearGradient(-bw/2,0,bw/2,0);g.addColorStop(0,P.c[0]);g.addColorStop(1,P.c[1]);cx.shadowColor=rgba(P.c[1],.5);cx.shadowBlur=36*U;cx.shadowOffsetY=10*U;cx.fillStyle=g;cx.beginPath();cx.roundRect(-bw/2,-bh/2,bw,bh,bh/2);cx.fill();cx.shadowBlur=0;cx.shadowOffsetY=0;
 const ico=(s.ic&&s.ic[0])||'arrow-right';cx.font=fnt(46*U,800);const tw=cx.measureText(s.x||'').width,k=Math.min(1,(bw-190*U)/Math.max(1,tw)),lead=lum(P.c[0])>.6?'#111':'#fff';
 cx.fillStyle=lead;cx.textAlign='left';cx.textBaseline='middle';cx.save();cx.scale(k,k);const tx=-(tw*k+70*U)/2/k;cx.fillText(s.x||'',tx,2);cx.restore();iconRaw(ico,(tw*k+70*U)/2-24*U,0,46*U,lead,{w:2.6});cx.restore();
 rich(L[1],x,y+bh/2+90*U,44,env(t,1,d,.5,.5),MUT,P.c[1],14);
 const cp=ss((t-.8)/.9);if(cp>0){const sx=x+bw*.55-(bw*.55-bw*.3)*cp+120*(1-cp)*U,sy=y+bh*.3+(220*(1-cp))*U;cx.save();cx.globalAlpha=e*cl(t/.6);cx.shadowColor='rgba(0,0,0,.35)';cx.shadowBlur=14*U;iconRaw('mouse-pointer-2',sx,sy,70*U,'#111',{w:2,fill:true});cx.restore();iconRaw('mouse-pointer-2',sx,sy,70*U,'#fff',{w:2});
  if(ck>0&&ck<1){cx.save();cx.globalAlpha=e*(1-ck);cx.strokeStyle='#fff';cx.lineWidth=4*U;cx.beginPath();cx.arc(sx-20*U,sy-20*U,10*U+ck*70*U,0,7);cx.stroke();cx.restore()}}},
ring(s,t,d,e){const V=H>W,v=cl((parseFloat((/(\d+(?:\.\d+)?)/.exec(s.n||'')||[0,0])[1])||0)/100),R=Math.min(W,H)*.26,x=W/2,y=H/2-(V?60:10)*U,p=eo(t/1.8);
 cx.save();cx.globalAlpha=e;cx.lineWidth=R*.18;cx.lineCap='round';cx.strokeStyle=`rgba(${inkRGB()},.1)`;cx.beginPath();cx.arc(x,y,R,0,7);cx.stroke();
 const g=cx.createLinearGradient(x-R,y-R,x+R,y+R);g.addColorStop(0,P.c[0]);g.addColorStop(1,P.c[1]);cx.strokeStyle=g;cx.shadowColor=P.c[1];cx.shadowBlur=24*U;cx.beginPath();cx.arc(x,y,R,-Math.PI/2,-Math.PI/2+6.283*v*p+.001);cx.stroke();cx.restore();
 rich('*'+countText(s.n,p).replace(/\*/g,'')+'*',x,y,R*.62/U,e,INK,P.c[1]);rich(s.x,x,y+R+80*U,46,env(t,.5,d,.5,.5),MUT,MUT,20)},
kinetic(s,t,d,e){const w=(s.x||'').replace(/\*/g,'').split(/\s+/).filter(Boolean);if(!w.length)return;const n=w.length,slot=Math.max(.3,(d-.3)/n),i=Math.min(n-1,Math.floor(t/slot)),lt=t-i*slot,sc=cl(.6+.4*eb(lt/.22),.4,1.3);
 const wd=w[i].toUpperCase();cx.save();cx.globalAlpha=e*cl(lt/.08);cx.font=fnt(100,900);const base=cx.measureText(wd).width/100,size=Math.min(260*U,W*.88/Math.max(.5,base));
 cx.font=fnt(size,900);cx.textAlign='center';cx.textBaseline='middle';cx.translate(W/2,H/2);cx.scale(sc,sc);cx.fillStyle=P.c[i%3];cx.shadowColor=rgba(P.c[i%3],.45);cx.shadowBlur=40*U;cx.fillText(wd,0,0);cx.shadowBlur=0;
 cx.fillStyle=INK;cx.globalAlpha*=.9;cx.fillRect(-base*size/2,size*.55,base*size*eo(lt/.3),8*U);cx.restore();
 for(let k=0;k<n;k++){cx.save();cx.globalAlpha=e*(k==i?1:.25);cx.fillStyle=k==i?P.c[0]:INK;cx.beginPath();cx.arc(W/2+(k-(n-1)/2)*22*U,H-70*U,6*U,0,7);cx.fill();cx.restore()}},
hero(s,t,d,e){const sz=Math.min(240*U,Math.min(W,H)*.34),cy=H/2-(H>W?90:60)*U,sub=lines(s.l)[0];
 [0,1,2].forEach(i=>{const p=(t*.6+i/3)%1;cx.save();cx.globalAlpha=e*(1-p)*.5;cx.strokeStyle=P.c[i%3];cx.lineWidth=4*U;cx.beginPath();cx.arc(W/2,cy,sz*.55+p*sz*.75,0,7);cx.stroke();cx.restore()});
 iconTile((s.ic&&s.ic[0])||'rocket',W/2,cy,sz*cl(eb(t/.8),0,1.15),e,0);rich(s.x,W/2,cy+sz*.86,84,env(t,.4,d,.6,.5),INK,P.c[1]);rich(sub,W/2,cy+sz*.86+112*U,38,env(t,.9,d,.6,.5),MUT,MUT,12)},
stats(s,t,d,e){const V=H>W,rows=lines(s.l).slice(0,4).map(q=>pair(q,':')),n=Math.max(1,rows.length);rich(s.x,W/2,H*(V?.13:.17),70,env(t,0,d,.5,.5),INK,P.c[1]);
 const gap=22*U,cw=V?W*.8:(W*.86-gap*(n-1))/n,ch=V?Math.min(210*U,(H*.62-gap*(n-1))/n):300*U;
 rows.forEach((r,i)=>{const o=env(t,.3+i*.25,d,.4,.5);if(o<=.01)return;const x=V?W/2:W/2-(cw*n+gap*(n-1))/2+cw/2+i*(cw+gap),y=V?H*.27+ch/2+i*(ch+gap):H*.56;
  cx.save();cx.globalAlpha=o;cx.translate(x,y+(1-o)*40*U);cx.shadowColor='rgba(20,20,40,.25)';cx.shadowBlur=30*U;cx.shadowOffsetY=10*U;cx.fillStyle=INK=='#fff'?'rgba(255,255,255,.08)':'#fff';cx.beginPath();cx.roundRect(-cw/2,-ch/2,cw,ch,28*U);cx.fill();cx.shadowBlur=0;cx.shadowOffsetY=0;
  cx.fillStyle=P.c[i%3];cx.beginPath();cx.roundRect(-cw/2+28*U,-ch/2+24*U,64*U,8*U,4*U);cx.fill();cx.restore();
  rich('*'+countText(r[0],eo((t-.4-i*.25)/1.5)).replace(/\*/g,'')+'*',x,y-8*U+(1-o)*40*U,Math.min(120,ch/U*.4),o,INK,P.c[i%3]);rich(r[1],x,y+ch*.28+(1-o)*40*U,34,o,MUT,MUT,0)})},
chat(s,t,d,e){const V=H>W,msgs=lines(s.l).slice(0,6),fs=34*U,mw=W*(V?.74:.5),padX=26*U,padY=18*U;cx.save();cx.font=fnt(fs,600);
 const B=msgs.map(q=>{const right=/^>/.test(q),tx=q.replace(/^>\s*/,''),ls=wrapPlain(tx,mw-padX*2).slice(0,3),w=Math.max(...ls.map(l=>cx.measureText(l).width),60*U)+padX*2,h=ls.length*fs*1.25+padY*2-fs*.25;return{right,ls,w,h}});
 const gap=18*U,total=B.reduce((a,b)=>a+b.h+gap,-gap),top=H/2-total/2+(s.x?30*U:0);cx.restore();rich(s.x,W/2,H*.09,56,env(t,0,d,.5,.5),INK,P.c[1]);
 let y=top;B.forEach((b,i)=>{const ta=.3+i*.95,ty=cl((t-ta)/.5),show=t>=ta+.5,o=cl((t-ta)/.2)*e,x=b.right?W/2+(V?W*.43:W*.27)-b.w:W/2-(V?W*.43:W*.27);
  if(o>0){cx.save();cx.globalAlpha=o;if(!show){const bw=110*U,bx=b.right?W/2+(V?W*.43:W*.27)-bw:x;cx.fillStyle=INK=='#fff'?'rgba(255,255,255,.12)':'#e9e9ef';cx.beginPath();cx.roundRect(bx,y,bw,64*U,32*U);cx.fill();cx.fillStyle=MUT;[0,1,2].forEach(k=>{cx.beginPath();cx.arc(bx+bw/2+(k-1)*24*U,y+32*U-Math.abs(Math.sin(t*7+k))*8*U,7*U,0,7);cx.fill()})}
   else{const p=cl(eb((t-ta-.5)/.25),0,1.1);cx.translate(b.right?x+b.w:x,y+b.h);cx.scale(p,p);cx.translate(-(b.right?x+b.w:x),-(y+b.h));
    if(b.right){const g=cx.createLinearGradient(x,y,x+b.w,y+b.h);g.addColorStop(0,P.c[0]);g.addColorStop(1,P.c[1]);cx.fillStyle=g}else cx.fillStyle=INK=='#fff'?'rgba(255,255,255,.12)':'#e9e9ef';
    cx.beginPath();cx.roundRect(x,y,b.w,b.h,30*U);cx.fill();cx.font=fnt(fs,600);cx.textAlign='left';cx.textBaseline='middle';cx.fillStyle=b.right?(lum(P.c[0])>.6?'#111':'#fff'):INK;b.ls.forEach((l,k)=>cx.fillText(l,x+padX,y+padY+fs*.5+k*fs*1.25))}
   cx.restore()}y+=b.h+gap})},
compare(s,t,d,e){const V=H>W,hd=(s.x||'Before | After').split('|').map(q=>q.trim()),rows=lines(s.l).slice(0,5).map(q=>pair(q,'|')),n=Math.max(1,rows.length),gap=26*U,cw=V?W*.86:W*.42,chh=V?(H*.8-gap)/2:Math.min(H*.72,(190+Math.min(5,n)*80)*U);
 [0,1].forEach(c=>{const good=c==1,x=V?W/2:W/2+(c?1:-1)*(cw/2+gap/2),y=V?H*.1+chh/2+c*(chh+gap):H/2,o=env(t,.2+c*.5,d,.5,.5),col=good?'#30A46C':'#E5484D';if(o<=.01)return;
  cx.save();cx.globalAlpha=o;cx.translate(x,y+(1-o)*40*U);cx.shadowColor='rgba(20,20,40,.25)';cx.shadowBlur=30*U;cx.shadowOffsetY=10*U;cx.fillStyle=INK=='#fff'?'rgba(255,255,255,.07)':'#fff';cx.beginPath();cx.roundRect(-cw/2,-chh/2,cw,chh,30*U);cx.fill();cx.shadowBlur=0;cx.shadowOffsetY=0;
  cx.fillStyle=col;cx.beginPath();cx.roundRect(-cw/2,-chh/2,cw,8*U,[30*U,30*U,0,0]);cx.fill();cx.restore();
  rich(hd[c]||'',x-cw/2+40*U,y-chh/2+60*U+(1-o)*40*U,50,o,INK,col,0,1,1);
  const step=Math.min(80*U,(chh-150*U)/n);rows.forEach((r,i)=>{const ro=env(t,.9+c*.3+i*.3,d,.4,.5);if(ro<=.01)return;const ry=y-chh/2+130*U+step*i+step/2;cx.save();cx.globalAlpha=ro;cx.translate((1-ro)*(c?40:-40)*U,0);
   iconRaw(good?'circle-check':'x',x-cw/2+58*U,ry,40*U,col,{w:2.6});cx.restore();rich(r[c],x-cw/2+96*U,ry,34,ro,INK,col,0,1,1)})})},
marquee(s,t,d,e){const V=H>W,txt=((s.x||'').replace(/\*/g,'').toUpperCase().trim()||' ')+'   ',rows=V?6:4,rh=H/rows,size=rh*.82;cx.save();cx.globalAlpha=e;cx.font=fnt(size,900);cx.textBaseline='middle';cx.textAlign='left';const w=cx.measureText(txt).width;
 for(let i=0;i<rows;i++){const y=rh*(i+.5),sp=(70+i*14)*U*(i%2?-1:1),off=(((t*sp)%w)+w)%w,mid=i==Math.floor(rows/2);cx.lineWidth=Math.max(2,size*.03);cx.strokeStyle=P.c[i%3];cx.fillStyle=mid?INK:'transparent';
  for(let x=-off-w;x<W+w;x+=w){if(mid)cx.fillText(txt,x,y);else cx.strokeText(txt,x,y)}}cx.restore()},
testimonial(s,t,d,e){const nm=lines(s.l)[0]||'',V=H>W;
 for(let i=0;i<5;i++){const sc=cl(eb(t-.2-i*.12),0,1.2),o=env(t,.2+i*.12,d,.3,.5);if(o>.01){cx.save();cx.globalAlpha=o*e;iconRaw('star',W/2+(i-2)*72*U,H*(V?.24:.22),60*U*sc,'#FFB020',{w:1.6,fill:true});cx.restore()}}
 rich(s.x,W/2,H/2,58,env(t,.4,d,.5,.5),INK,P.c[1],24);
 if(nm){const o=env(t,1,d,.5,.5);if(o>.01){cx.save();cx.font=fnt(40*U,800);const nw=cx.measureText(nm).width,ax=W/2-(nw+84*U)/2+34*U,ay=H*(V?.78:.8);cx.globalAlpha=o;const g=cx.createLinearGradient(ax-34*U,ay-34*U,ax+34*U,ay+34*U);g.addColorStop(0,P.c[0]);g.addColorStop(1,P.c[1]);cx.fillStyle=g;cx.beginPath();cx.arc(ax,ay,34*U,0,7);cx.fill();
   cx.fillStyle='#fff';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(nm[0].toUpperCase(),ax,ay+2*U);cx.fillStyle=INK;cx.textAlign='left';cx.fillText(nm,ax+54*U,ay+2*U);cx.restore()}}},
custom(s,t,d,e){const c=compileCustom(s.js);if(c.err){CERR=c.err;errPanel(c.err);return}try{c.fn(cx,t,d,e,apiFor(s),s)}catch(er){CERR=String(er&&er.message||er);errPanel(CERR)}}};

/* ---------- custom JavaScript scenes ---------- */
const CODE=new Map();
function compileCustom(src){src=src||'';if(CODE.has(src))return CODE.get(src);let r;
 try{const code=src.replace(/^\s*export\s+default\s+/m,'').replace(/^\s*export\s+/gm,''),scene=undefined;
  const mod=new Function('api','scene',code+'\n;return typeof draw==="function"?draw:undefined;');const fn=mod(apiFor({}),{});
  r=fn?{fn:(c,t,d,e,a,sc)=>fn(c,t,d,e,a,sc)}:{fn:new Function('ctx','t','d','e','api','scene',code)}}catch(er){r={err:String(er&&er.message||er)}}
 if(CODE.size>40)CODE.clear();CODE.set(src,r);return r}
function apiFor(s){return{W,H,U,colors:P.c,bg:P.bg,ink:INK,muted:MUT,brand:P.brand,font:fnt,scene:s,text:s.x||'',lines:lines(s.l),clamp:cl,smooth:ss,easeOut:eo,easeBack:eb,env,rich,icon:iconRaw,iconTile,emoji:emojiG,rgba,hex,
 rand:n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)},ICONS:Object.keys(ICONS)}}
function errPanel(m){cx.save();cx.fillStyle='rgba(229,50,45,.12)';cx.fillRect(0,0,W,H);cx.fillStyle='#E5322D';cx.font=`600 ${24*U}px ${SANS}`;cx.textAlign='center';cx.textBaseline='middle';wrapPlain('Custom scene error: '+m,W*.8).slice(0,4).forEach((l,i)=>cx.fillText(l,W/2,H/2+i*32*U));cx.restore()}

function caption(){const w=P.cap.trim().split(/\s+/);if(!w[0])return;const n=Math.min(w.length-1,Math.floor(T/tot()*w.length)),st=Math.floor(n/6)*6,win=w.slice(st,st+6);cx.save();cx.font=fnt(46*U,800);cx.textBaseline='middle';cx.textAlign='left';const sp=14*U,ws=win.map(q=>cx.measureText(q).width),n2=ws.reduce((a,b)=>a+b,0)+sp*(win.length-1);let x=(W-n2)/2;const y=H>W?H*.8:H-80*U;
 cx.fillStyle='rgba(0,0,0,.6)';cx.beginPath();cx.roundRect(x-28*U,y-44*U,n2+56*U,88*U,22*U);cx.fill();win.forEach((q,i)=>{cx.fillStyle=i==n-st?P.c[2]:'#fff';cx.fillText(q,x,y);x+=ws[i]+sp});cx.restore()}
function drawScene(s,lt,tt){const bg=s.bg||P.bg,light=lum(bg)>.55;INK=light?'#111':'#fff';MUT=light?'#888':'#bbb';backdrop(bg,tt);
 const d=s.d,f=Math.min(.5,d/2),e0=env(lt,0,d,f,f),tr=P.tr||'fade',e=tr=='cut'?1:e0,enter=lt<d/2;cx.save();
 if(tr=='slide')cx.translate((1-e0)*W*.08*(enter?1:-1),0);else if(tr=='zoom'){const k=1+(1-e0)*(enter?.1:-.06);cx.translate(W/2,H/2);cx.scale(k,k);cx.translate(-W/2,-H/2)}
 (D[s.t]||D.text)(s,lt,d,e);cx.restore()}
function guides(){cx.save();cx.strokeStyle='rgba(229,50,45,.9)';cx.lineWidth=2*U;cx.setLineDash([10*U,8*U]);const m=H>W?[.06*W,.12*H,.94*W,.82*H]:[.05*W,.08*H,.95*W,.92*H];cx.strokeRect(m[0],m[1],m[2]-m[0],m[3]-m[1]);cx.restore()}
function draw(){cx.setTransform(1,0,0,1,0,0);cx.globalAlpha=1;cx.filter='none';cx.shadowBlur=0;cx.shadowOffsetY=0;CERR='';
 const[i,a]=sceneAt(T);drawScene(P.scenes[i],T-a,T);if(P.capOn)caption();if(GUIDES)guides()}
// render one scene into a small 2D context (for the template gallery); restores nothing, the main loop redraws next frame
function thumb(g2,s,lt){const w=g2.canvas.width,h=g2.canvas.height;cx.setTransform(1,0,0,1,0,0);cx.globalAlpha=1;cx.filter='none';cx.shadowBlur=0;
 try{drawScene(s,lt==null?Math.max(1.2,Math.min(s.d*.62,s.d-.6)):lt,lt==null?s.d*.5:lt)}catch(er){cx.fillStyle='#888';cx.fillRect(0,0,W,H)}g2.drawImage(cv,0,0,w,h)}

/* ================= project defaults, templates ================= */
const SAMPLE=()=>({brand:'Acme',...PALETTES.Studio,c:[...PALETTES.Studio.c],cap:'Make anything move. Pick a scene, add your words, and the captions pop in on beat.',capOn:false,ratio:'16:9',scenes:[
 {t:'emoji',d:3.5,x:'Messy',e:'😕🤔😞'},{t:'text',d:2,x:'Ideas.'},{t:'text',d:2.6,x:'Everywhere at *once.*'},{t:'card',d:5,x:'LineUp'},{t:'text',d:2.5,x:'Quick *thoughts*'},{t:'orbit',...DEF.orbit},{t:'logo',d:3,x:'your work, organized.'},{t:'shapes',d:6},
 {t:'list',...DEF.list},{t:'counter',...DEF.counter},{t:'bars',...DEF.bars},{t:'quote',...DEF.quote},{t:'big',d:3,x:'Try it *today*'}]});
const mkP=(o)=>({brand:'Brand',...o,c:[...o.c],scenes:o.scenes.map(s=>({...s}))});
const TEMPLATES=[
 {name:'Product launch',desc:'16:9 / logo, features, stats, call to action',make:()=>mkP({brand:'Acme',...PALETTES.Forge,ratio:'16:9',bgs:'glow',font:'Inter',scenes:[{t:'logo',d:3,x:'something new is coming'},{t:'big',d:2.6,x:'Meet the *future*'},{t:'features',...DEF.features},{t:'stats',...DEF.stats},{t:'cta',d:4,x:'Get early access',l:'Launching soon\nacme.com',ic:['arrow-right']}]})},
 {name:'Short-form hook',desc:'9:16 / kinetic words, icon hero, steps, call to action',make:()=>mkP({brand:'Brand',...PALETTES.Neon,ratio:'9:16',bgs:'grid',font:'Anton',anim:'pop',is:'glow',scenes:[{t:'kinetic',d:3.6,x:'Stop scrolling this will help'},{t:'hero',d:3.5,x:'The *one* trick',l:'Nobody tells you',ic:['lightbulb']},{t:'steps',d:6,x:'Do *this*',l:'Record it\nCaption it\nPost it',ic:['video','captions','send']},{t:'cta',d:4,x:'Follow for more',l:'Like this?\n@yourhandle',ic:['arrow-right']}]})},
 {name:'Explainer',desc:'16:9 / problem, steps, compare, data, quote',make:()=>mkP({brand:'Acme',...PALETTES.Studio,ratio:'16:9',bgs:'dots',scenes:[{t:'text',d:2.6,x:'Work is *messy*'},{t:'steps',...DEF.steps},{t:'compare',...DEF.compare},{t:'bars',...DEF.bars},{t:'quote',...DEF.quote},{t:'cta',d:3.6,x:'Try it free',l:'Ready when you are\nacme.com',ic:['arrow-right']}]})},
 {name:'Stats recap',desc:'1:1 / counter, ring, stat cards, bars',make:()=>mkP({brand:'Acme',...PALETTES.Ocean,ratio:'1:1',bgs:'gradient',scenes:[{t:'text',d:2.4,x:'This year in *numbers*'},{t:'counter',d:3.6,x:'new customers',n:'48,200+',ic:['users']},{t:'ring',...DEF.ring},{t:'stats',...DEF.stats},{t:'bars',...DEF.bars},{t:'big',d:3,x:'Thank *you*'}]})},
 {name:'Chat story',desc:'9:16 / conversation bubbles with a kinetic closer',make:()=>mkP({brand:'Brand',...PALETTES.Sunset,ratio:'9:16',bgs:'glow',font:'Inter',scenes:[{t:'chat',...DEF.chat,d:8},{t:'kinetic',d:3.2,x:'Wait for the ending'},{t:'cta',d:3.6,x:'Follow for part two',l:'Want more?\n@yourhandle',ic:['arrow-right']}]})},
 {name:'Hype intro',desc:'16:9 / marquee, 3D shapes, logo sting',make:()=>mkP({brand:'Brand',...PALETTES.Forge,ratio:'16:9',bgs:'grid',font:'Bebas Neue',scenes:[{t:'marquee',d:3,x:'Welcome back'},{t:'shapes',d:4},{t:'logo',d:3,x:'new episode every week'}]})},
 {name:'Testimonial',desc:'4:5 / stars, quote and name',make:()=>mkP({brand:'Acme',...PALETTES.Mint,ratio:'4:5',bgs:'glow',scenes:[{t:'testimonial',...DEF.testimonial},{t:'stats',d:4,x:'Loved by teams',l:'4.9: Rating\n12K: Users'},{t:'cta',d:3.6,x:'Join them',l:'Start today\nacme.com',ic:['arrow-right']}]})},
 {name:'Studio sample',desc:'The original demo reel with 13 scenes',make:()=>SAMPLE()},
 {name:'Blank',desc:'One empty text scene',make:()=>mkP({brand:'Brand',...PALETTES.Forge,ratio:'16:9',scenes:[{t:'text',d:2.5,x:'Your *words* here'}]})}];
function normalize(p){if(!p||!Array.isArray(p.scenes)||!p.scenes.length)throw new Error('Not a project');
 const d={brand:'Brand',bg:'#fafafa',cap:'',capOn:false,ratio:'16:9',q:720,font:'Inter',bgs:'solid',tr:'fade',anim:'rise',is:'tile',iw:2,logo:'sparkles',vol:.8};
 for(const k in d)if(p[k]==null)p[k]=d[k];p.c=Array.isArray(p.c)&&p.c.length>=3?p.c.slice(0,3):['#ff2ec4','#6a5cff','#ffa94d'];
 if(!RATIOS[p.ratio])p.ratio='16:9';if(!FONTS.includes(p.font))p.font='Inter';if(!ICONS[p.logo])p.logo='sparkles';
 p.scenes.forEach(s=>{if(!TYPES[s.t])s.t='text';s.d=Math.max(1,+s.d||2.5);if(s.ic&&!Array.isArray(s.ic))s.ic=[]});return p}
function setProject(p){P=normalize(p);setSize();CODE.clear();T=0}
