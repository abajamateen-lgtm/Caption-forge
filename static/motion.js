/* Motion Studio UI. Drawing lives in motion-engine.js. */
const SNIPS=[
{n:'Pulsing ring',c:`function draw(ctx,t,d,e,api){
  const {W,H,U,colors}=api;
  const r=(140+Math.sin(t*3)*20)*U;
  ctx.save();ctx.globalAlpha=e;
  ctx.lineWidth=14*U;ctx.strokeStyle=colors[0];
  ctx.beginPath();ctx.arc(W/2,H/2,r,0,Math.PI*2);ctx.stroke();
  ctx.restore();
  api.rich(api.text||'Custom *scene*',W/2,H/2,64,e,api.ink,colors[1]);
}`},
{n:'Particle burst',c:`function draw(ctx,t,d,e,api){
  const {W,H,U,colors,rand}=api;
  for(let i=0;i<60;i++){
    const a=rand(i)*6.283,sp=(120+rand(i+99)*380)*U,life=(t*.6+rand(i+7))%1,r=sp*life;
    ctx.save();ctx.globalAlpha=e*(1-life);ctx.fillStyle=colors[i%3];
    ctx.beginPath();ctx.arc(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r,(8+rand(i+3)*10)*U*(1-life*.6),0,6.283);ctx.fill();ctx.restore();
  }
  api.rich(api.text||'Boom',W/2,H/2,90,e,api.ink,colors[1]);
}`},
{n:'Equalizer bars',c:`function draw(ctx,t,d,e,api){
  const {W,H,U,colors}=api,n=24,bw=W*.7/n;
  ctx.save();ctx.globalAlpha=e;
  for(let i=0;i<n;i++){
    const h=(40+Math.abs(Math.sin(t*3+i*.6)*Math.cos(t*1.7+i))*260)*U;
    ctx.fillStyle=colors[i%3];ctx.beginPath();ctx.roundRect(W*.15+i*bw+4,H/2-h/2,bw-8,h,8*U);ctx.fill();
  }
  ctx.restore();
}`},
{n:'Typewriter text',c:`function draw(ctx,t,d,e,api){
  const {W,H,U,colors}=api,txt=(api.text||'Type something great').replace(/\\*/g,''),n=Math.min(txt.length,Math.floor(t*14));
  ctx.save();ctx.globalAlpha=e;ctx.font=api.font(64*U,800);ctx.textAlign='left';ctx.textBaseline='middle';
  const full=ctx.measureText(txt).width,k=Math.min(1,W*.86/full);
  ctx.translate(W/2-full*k/2,H/2);ctx.scale(k,k);
  ctx.fillStyle=api.ink;ctx.fillText(txt.slice(0,n),0,0);
  const cw=ctx.measureText(txt.slice(0,n)).width;
  if(Math.floor(t*2)%2==0){ctx.fillStyle=colors[0];ctx.fillRect(cw+6,-40*U,6*U,80*U)}
  ctx.restore();
}`},
{n:'Countdown',c:`function draw(ctx,t,d,e,api){
  const {W,H,U,colors}=api,n=Math.max(1,Math.floor(d)),i=Math.min(n-1,Math.floor(t)),lt=t-i;
  ctx.save();ctx.globalAlpha=e*(1-lt*.6);ctx.translate(W/2,H/2);
  const s=1+lt*.5;ctx.scale(s,s);
  ctx.fillStyle=colors[i%3];ctx.font=api.font(360*U,900);ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(n-i),0,0);ctx.restore();
}`},
{n:'Loading bar',c:`function draw(ctx,t,d,e,api){
  const {W,H,U,colors}=api,p=api.easeOut(t/Math.max(.5,d-.6)),w=W*.6,h=26*U,x=W/2-w/2,y=H/2;
  ctx.save();ctx.globalAlpha=e;
  ctx.fillStyle=api.ink=='#fff'?'rgba(255,255,255,.12)':'rgba(0,0,0,.12)';
  ctx.beginPath();ctx.roundRect(x,y,w,h,h/2);ctx.fill();
  const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,Math.max(h,w*p),h,h/2);ctx.fill();
  ctx.restore();
  api.rich(Math.round(p*100)+'%',W/2,y-80*U,90,e,api.ink,colors[1]);
}`},
{n:'Icon burst',c:`function draw(ctx,t,d,e,api){
  const {W,H,U}=api,names=['rocket','star','heart','zap','gem','crown','flame','trophy'];
  names.forEach((n,i)=>{
    const x=W/2+((i%4)-1.5)*150*U,y=H/2+(Math.floor(i/4)-.5)*150*U;
    api.iconTile(n,x,y,110*U*api.clamp(api.easeBack(t-.15*i),0,1.2),e,i);
  });
}`}];
/*END_SNIPS*/
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)];
const KEY='motion-studio-project-v2',OLDKEY='motion-studio-project-v1',TPLKEY='motion-studio-my-scenes-v1';
let sel=0,play=true,solo=false,rec=null,lastBlob=null,MUS=null,saveT,lastErr='',afterExport=null,hist=[],hi=-1,lastSnap='';
const cur=()=>P.scenes[sel];
const toast=(m,e)=>{const t=$('toast');t.textContent=m;t.className='show'+(e?' err':'');clearTimeout(t._h);t._h=setTimeout(()=>t.className='',3400)};
const status=m=>{if(rec)return;toast(m)};
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function loadSaved(){for(const k of[KEY,OLDKEY]){try{return normalize(JSON.parse(localStorage.getItem(k)))}catch(e){}}return null}
const typing=()=>{const a=document.activeElement;return!!a&&(a.tagName=='TEXTAREA'||(a.tagName=='INPUT'&&['text','number'].includes(a.type||'text'))||a.tagName=='SELECT')};

/* ---------- history + autosave ---------- */
function snap(){const s=JSON.stringify(P);if(s===lastSnap)return;lastSnap=s;hist=hist.slice(0,hi+1);hist.push(s);if(hist.length>80)hist.shift();hi=hist.length-1}
function restore(s){const t=T;setProject(JSON.parse(s));T=Math.min(t,tot()-.01);lastSnap=s;sel=cl(sel,0,P.scenes.length-1);refreshAll(true)}
const undo=()=>{if(hi>0){hi--;restore(hist[hi])}else toast('Nothing to undo')};
const redo=()=>{if(hi<hist.length-1){hi++;restore(hist[hi])}else toast('Nothing to redo')};
function touch(){lastBlob=null;clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(P))}catch(e){status('Autosave failed (project too big). Use Save.')}snap();if($('t-lib').classList.contains('on'))renderThumbs()},350)}
const on=(id,ev,fn)=>$(id).addEventListener(ev,e=>{fn(e);touch()});
const fit=()=>$('stage').style.setProperty('--ar',W/H);
function loadFont(){[400,700,800,900].forEach(w=>{try{document.fonts.load(`${w} 32px "${P.font}"`).catch(()=>{})}catch(e){}})}

/* ---------- modal ---------- */
function modal(title,body,actions){const ov=document.createElement('div');ov.className='ovl';
 ov.innerHTML=`<div class="glass mdl" role="dialog" aria-label="${esc(title)}"><div class="mh"><b>${esc(title)}</b><button class="btn gl sq mx" data-ic="x" aria-label="Close"></button></div><div class="mbody">${body}</div><div class="mf"></div></div>`;
 document.body.appendChild(ov);hydrateIcons(ov);const close=()=>ov.remove();ov.querySelector('.mx').onclick=close;ov.addEventListener('mousedown',e=>{if(e.target===ov)close()});
 const f=ov.querySelector('.mf');(actions||[]).forEach(a=>{const b=document.createElement('button');b.className='btn '+(a.cls||'gl');b.textContent=a.label;b.onclick=()=>a.fn(close,ov);f.appendChild(b)});return{ov,close,body:ov.querySelector('.mbody')}}

/* ---------- icon picker ---------- */
function openPicker(o){let chosen=[...(o.sel||[])],cat='All',q='';
 const m=modal(o.title,`<input type="text" class="pq" placeholder="Search icons"><div class="pcats"></div><div class="psel"></div><div class="pgrid"></div>`,
  [o.multi?{label:'Clear',fn:()=>{chosen=[];draw2()}}:null,{label:o.multi?'Done':'Cancel',cls:o.multi?'y':'gl',fn:(c)=>{if(o.multi)o.onDone(chosen);c()}}].filter(Boolean));
 const qEl=m.body.querySelector('.pq'),catEl=m.body.querySelector('.pcats'),selEl=m.body.querySelector('.psel'),grid=m.body.querySelector('.pgrid');
 const cats=['All',...Object.keys(ICON_GROUPS)];catEl.innerHTML=cats.map(c=>`<button data-c="${c}" class="${c==cat?'on':''}">${c}</button>`).join('');
 catEl.onclick=e=>{const b=e.target.closest('button');if(!b)return;cat=b.dataset.c;$$('.pcats button').forEach(x=>x.classList.toggle('on',x==b));draw2()};
 qEl.oninput=()=>{q=qEl.value.trim().toLowerCase();draw2()};
 function draw2(){const names=[...new Set(cat=='All'?Object.values(ICON_GROUPS).flat():ICON_GROUPS[cat])].filter(n=>!q||n.includes(q));
  grid.innerHTML=names.map(n=>{const i=chosen.indexOf(n);return`<button data-n="${n}" title="${n}" class="${i>=0?'on':''}">${ic(n)}${o.multi&&i>=0?`<sup>${i+1}</sup>`:''}</button>`}).join('')||'<div class="pempty">No icons match.</div>';
  selEl.hidden=!o.multi;selEl.innerHTML=o.multi?(chosen.length?chosen.map((n,i)=>`<span class="chip" data-r="${i}" title="Remove">${ic(n)}${i+1}</span>`).join(''):'<span class="pempty">Pick icons in the order you want them used.</span>'):''}
 grid.onclick=e=>{const b=e.target.closest('button');if(!b)return;const n=b.dataset.n;if(!o.multi){o.onDone(n);m.close();return}const i=chosen.indexOf(n);if(i>=0)chosen.splice(i,1);else if(chosen.length<12)chosen.push(n);draw2()};
 selEl.onclick=e=>{const c=e.target.closest('[data-r]');if(!c)return;chosen.splice(+c.dataset.r,1);draw2()};
 draw2();setTimeout(()=>qEl.focus(),50)}

/* ---------- timeline strip ---------- */
const tlTypeOpts=()=>{const g={};Object.entries(TYPES).forEach(([k,v])=>{(g[TMETA[k][0]]=g[TMETA[k][0]]||[]).push(`<option value="${k}">${v}</option>`)});return Object.entries(g).map(([n,o])=>`<optgroup label="${n}">${o.join('')}</optgroup>`).join('')};
function tlui(){const B=$('blocks');B.innerHTML='';P.scenes.forEach((s,i)=>{const b=document.createElement('button');b.className='mb'+(i==sel?' on':'');b.style.flexGrow=s.d;b.draggable=true;
  b.innerHTML=ic(TMETA[s.t][1])+`<span>${i+1} ${TYPES[s.t]}</span>`;b.title=(s.x||'').replace(/\*/g,'')+' ('+s.d+'s)';b.onclick=()=>select(i);
  b.ondragstart=e=>{e.dataTransfer.setData('text/plain',String(i));e.dataTransfer.effectAllowed='move'};b.ondragover=e=>{e.preventDefault();b.classList.add('dragover')};b.ondragleave=()=>b.classList.remove('dragover');
  b.ondrop=e=>{e.preventDefault();b.classList.remove('dragover');const f=+e.dataTransfer.getData('text/plain');if(f!==i&&!isNaN(f)){const[m]=P.scenes.splice(f,1);P.scenes.splice(i,0,m);select(i);touch()}};B.appendChild(b)});$('scrub').max=Math.round(tot()*100)}
function fields(){const s=cur();if(!s)return;$('ft').value=s.t;$('fd').value=s.d;$('fx').value=s.x||'';$('fe').value=s.e||'';$('fn').value=s.n||'';$('fl').value=s.l||'';$('fbo').checked=!!s.bg;$('fb').value=s.bg||P.bg;$('sn').textContent='#'+(sel+1)+' of '+P.scenes.length;
 const u=(USES[s.t]||'').split(' '),h=HINT[s.t]||{},dl={x:'Text',e:'Emoji',n:'Number',l:'Lines (one per line)'};
 $$('#t-scene [data-f]').forEach(el=>{el.hidden=!u.includes(el.dataset.f);const lt=el.querySelector('.lt');if(lt)lt.textContent=h[el.dataset.f]||dl[el.dataset.f]});renderIc();syncCode()}
function renderIc(){const s=cur(),a=s.ic||[];$('icchips').innerHTML=a.length?a.map((n,i)=>`<span class="chip" data-i="${i}" title="Remove">${ic(n)}${i+1}</span>`).join(''):'<small>Default icons are used. Pick your own below.</small>'}
function proj(){$('pb').value=P.brand;$('pbg').value=P.bg;P.c.forEach((c,i)=>$('c'+i).value=c);$('cap').value=P.cap;$('capOn').checked=P.capOn;$('pfont').value=P.font;$('pbgs').value=P.bgs;$('ptr').value=P.tr;$('panim').value=P.anim;$('iw').value=P.iw;$('iwO').textContent=P.iw;$('vol').value=P.vol;$('volO').textContent=Math.round(P.vol*100)+'%';
 $('logochip').innerHTML=ic(P.logo);$$('#ratios button').forEach(b=>b.classList.toggle('on',b.dataset.r==P.ratio));$$('#qual button').forEach(b=>b.classList.toggle('on',+b.dataset.q==P.q));$$('#istyles button').forEach(b=>b.classList.toggle('on',b.dataset.s==P.is));
 $$('.pal').forEach(b=>{const p=PALETTES[b.dataset.p];b.classList.toggle('on',p.bg==P.bg&&p.c.every((c,i)=>c.toLowerCase()==String(P.c[i]).toLowerCase()))})}
function refreshAll(keep){if(!keep){sel=0;T=0}fit();loadFont();tlui();fields();proj();hydrateIcons();libDirty=true}
let libDirty=true;
const setPlay=v=>{play=v;$('pp').setAttribute('d',v?'M6 5h4v14H6zM14 5h4v14h-4z':'M7 5v14l12-7z')};
function select(i){sel=cl(i,0,P.scenes.length-1);T=start(sel)+(play?0:Math.min(cur().d/2,2));tlui();fields()}

/* ---------- scene editing ---------- */
$('ft').innerHTML=tlTypeOpts();$('nt').innerHTML=tlTypeOpts();$('nt').value='features';
function ensureCustom(){const s=cur();if(s.t!=='custom'){s.t='custom';s.js=s.js||DEF.custom.js;fields();tlui();touch()}}
on('ft','change',e=>{const s=cur();s.t=e.target.value;const df=DEF[s.t]||{};for(const k in df)if(k!='d'&&!s[k])s[k]=clone(df[k]);fields();tlui()});
on('fd','input',e=>{cur().d=Math.max(1,+e.target.value||1);tlui()});
on('fx','input',e=>{cur().x=e.target.value});on('fe','input',e=>{cur().e=e.target.value});on('fn','input',e=>{cur().n=e.target.value});on('fl','input',e=>{cur().l=e.target.value});
on('fbo','change',e=>{const s=cur();if(e.target.checked)s.bg=$('fb').value;else delete s.bg});on('fb','input',e=>{$('fbo').checked=true;cur().bg=e.target.value});
$('imgb').onclick=()=>$('imgf').click();
$('imgf').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const s=cur(),u=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{const k=Math.min(1,1600/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);s.img=c.toDataURL('image/jpeg',.85);URL.revokeObjectURL(u);touch()};
 im.onerror=()=>status('Could not read that image');im.src=u};
on('imgc','click',()=>{delete cur().img});
$('icpick').onclick=()=>openPicker({multi:true,title:'Pick icons',sel:cur().ic||[],onDone:a=>{cur().ic=a;renderIc();touch()}});
$('icchips').onclick=e=>{const c=e.target.closest('[data-i]');if(!c)return;cur().ic.splice(+c.dataset.i,1);renderIc();touch()};
$('gocode').onclick=()=>showTab('code');
function addScene(o){P.scenes.splice(sel+1,0,o);setPlay(false);select(sel+1);touch()}
on('add','click',()=>{const t=$('nt').value;addScene({t,...clone(DEF[t]||{d:3})})});
on('dup','click',()=>addScene(clone(cur())));
on('del','click',()=>{if(P.scenes.length<2)return status('Keep at least one scene');P.scenes.splice(sel,1);select(Math.min(sel,P.scenes.length-1))});
on('up','click',()=>{if(sel>0){[P.scenes[sel-1],P.scenes[sel]]=[P.scenes[sel],P.scenes[sel-1]];select(sel-1)}});
on('dn','click',()=>{if(sel<P.scenes.length-1){[P.scenes[sel+1],P.scenes[sel]]=[P.scenes[sel],P.scenes[sel+1]];select(sel+1)}});
$('undo').onclick=undo;$('redo').onclick=redo;

/* ---------- project settings ---------- */
$('pfont').innerHTML=FONTS.map(f=>`<option>${f}</option>`).join('');
$('ratios').innerHTML=Object.keys(RATIOS).map(r=>`<button data-r="${r}">${r}${r=='9:16'?' Shorts / Reels':r=='16:9'?' YouTube':r=='1:1'?' Square':' Feed'}</button>`).join('');
$$('#ratios button').forEach(b=>b.onclick=()=>{P.ratio=b.dataset.r;setSize();fit();proj();touch()});
$$('#qual button').forEach(b=>b.onclick=()=>{P.q=+b.dataset.q;setSize();fit();proj();touch()});
$('istyles').innerHTML=Object.entries(ICON_STYLES).map(([k,v])=>`<button data-s="${k}">${v}</button>`).join('');
$$('#istyles button').forEach(b=>b.onclick=()=>{P.is=b.dataset.s;proj();touch()});
$('pals').innerHTML=Object.entries(PALETTES).map(([k,p])=>`<button class="pal" data-p="${k}" title="${k}"><b style="background:${p.bg}"></b>${p.c.map(c=>`<i style="background:${c}"></i>`).join('')}</button>`).join('');
$$('.pal').forEach(b=>b.onclick=()=>{const p=PALETTES[b.dataset.p];P.bg=p.bg;P.c=[...p.c];proj();fields();touch()});
$('logopick').onclick=()=>openPicker({multi:false,title:'Brand icon',onDone:n=>{P.logo=n;proj();touch()}});
on('pb','input',e=>{P.brand=e.target.value||'Brand'});on('pbg','input',e=>{P.bg=e.target.value;proj()});[0,1,2].forEach(i=>on('c'+i,'input',e=>{P.c[i]=e.target.value;proj()}));
on('pfont','change',e=>{P.font=e.target.value;loadFont()});on('pbgs','change',e=>{P.bgs=e.target.value});on('ptr','change',e=>{P.tr=e.target.value});on('panim','change',e=>{P.anim=e.target.value});
on('iw','input',e=>{P.iw=+e.target.value;$('iwO').textContent=P.iw});
on('cap','input',e=>{P.cap=e.target.value});on('capOn','change',e=>{P.capOn=e.target.checked});
on('vol','input',e=>{P.vol=+e.target.value;$('volO').textContent=Math.round(P.vol*100)+'%'});
$('musb').onclick=()=>$('musf').click();
$('musf').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;f.arrayBuffer().then(b=>{MUS={name:f.name,buf:b};$('musn').textContent=f.name;$('musc').hidden=false;status('Music added. It is mixed into the next export.')})};
$('musc').onclick=()=>{MUS=null;$('musn').textContent='';$('musc').hidden=true};
$('guides').onchange=e=>{GUIDES=e.target.checked};
$('tlmin').onclick=()=>$('tl').classList.toggle('min');

/* ---------- tabs ---------- */
function showTab(n){$$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==n));$$('.tab').forEach(t=>t.classList.toggle('on',t.id=='t-'+n));if(n=='lib')renderThumbs();if(n=='code')syncCode()}
$$('#tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.t));

/* ---------- library: scene types, project templates, my templates ---------- */
const getMine=()=>{try{return JSON.parse(localStorage.getItem(TPLKEY))||[]}catch(e){return[]}};
const setMine=a=>{try{localStorage.setItem(TPLKEY,JSON.stringify(a))}catch(e){status('Could not save template (storage full)')}};
function buildLibrary(){const groups={};Object.keys(TYPES).forEach(k=>{(groups[TMETA[k][0]]=groups[TMETA[k][0]]||[]).push(k)});
 let h=`<div class="lgroup"><h4>Project templates</h4><div class="lgrid">${TEMPLATES.map((t,i)=>`<div class="lcard" role="button" tabindex="0" data-tpl="${i}"><div class="thc"><canvas data-tpl="${i}"></canvas></div><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></div>`).join('')}</div></div>`;
 const mine=getMine();if(mine.length)h+=`<div class="lgroup"><h4>My scene templates</h4><div class="lgrid">${mine.map((m,i)=>`<div class="lcard" role="button" tabindex="0" data-mine="${i}"><button class="rm" data-rm="${i}" title="Delete" aria-label="Delete">${ic('x')}</button><div class="thc"><canvas data-mine="${i}"></canvas></div><b>${esc(m.name)}</b><small>${TYPES[m.scene.t]}</small></div>`).join('')}</div></div>`;
 Object.entries(groups).forEach(([g,ks])=>{h+=`<div class="lgroup"><h4>${g} scenes</h4><div class="lgrid">${ks.map(k=>`<div class="lcard" role="button" tabindex="0" data-type="${k}"><div class="thc"><canvas data-type="${k}"></canvas></div><b>${ic(TMETA[k][1])}${TYPES[k]}</b><small>${TMETA[k][2]}</small></div>`).join('')}</div></div>`});
 $('lib').innerHTML=h}
function sizeThumb(c,w,h){let tw=150,th=Math.round(150*h/w);if(th>104){th=104;tw=Math.round(104*w/h)}c.width=tw*2;c.height=th*2;c.style.width=tw+'px';c.style.height=th+'px'}
function renderThumbs(){if(rec)return;buildLibrary();hydrateIcons($('lib'));const keep=P,keepT=T;
 try{
  $$('#lib canvas[data-type]').forEach(c=>{const[w,h]=dims(P.ratio,720);sizeThumb(c,w,h);thumb(c.getContext('2d'),{t:c.dataset.type,...clone(DEF[c.dataset.type]||{d:3})})});
  $$('#lib canvas[data-mine]').forEach(c=>{const m=getMine()[+c.dataset.mine];if(!m)return;const[w,h]=dims(P.ratio,720);sizeThumb(c,w,h);thumb(c.getContext('2d'),clone(m.scene))});
  $$('#lib canvas[data-tpl]').forEach(c=>{const tp=TEMPLATES[+c.dataset.tpl].make();P=normalize(tp);setSize();const[w,h]=dims(P.ratio,720);sizeThumb(c,w,h);thumb(c.getContext('2d'),P.scenes[Math.min(1,P.scenes.length-1)]);P=keep;setSize()})
 }finally{P=keep;setSize();T=keepT}}
$('lib').addEventListener('click',e=>{const rm=e.target.closest('[data-rm]');
 if(rm){e.stopPropagation();const a=getMine();a.splice(+rm.dataset.rm,1);setMine(a);renderThumbs();return}
 const c=e.target.closest('.lcard');if(!c)return;
 if(c.dataset.type){const t=c.dataset.type;addScene({t,...clone(DEF[t]||{d:3})});toast(TYPES[t]+' scene added')}
 else if(c.dataset.mine!=null){const m=getMine()[+c.dataset.mine];if(m){addScene(clone(m.scene));toast('Template added')}}
 else if(c.dataset.tpl!=null){const t=TEMPLATES[+c.dataset.tpl];modal('Use "'+t.name+'"?','<p style="color:var(--m);font-size:13px">This replaces the current project. You can undo it with Ctrl+Z.</p>',[{label:'Cancel',fn:cl2=>cl2()},{label:'Replace project',cls:'y',fn:cl2=>{setProject(t.make());refreshAll();touch();cl2();showTab('scene');toast(t.name+' loaded')}}])}});
$('lib').addEventListener('keydown',e=>{if((e.key=='Enter'||e.key==' ')&&e.target.classList.contains('lcard')){e.preventDefault();e.target.click()}});
$('mytplb').onclick=()=>{const m=modal('Save scene as template','<input type="text" class="tn" placeholder="Template name" maxlength="40">',[{label:'Cancel',fn:c=>c()},{label:'Save',cls:'y',fn:c=>{const n=m.ov.querySelector('.tn').value.trim();if(!n)return;const a=getMine();a.push({name:n,scene:clone(cur())});setMine(a);c();renderThumbs();toast('Saved to My scene templates')}}]);setTimeout(()=>m.ov.querySelector('.tn').focus(),50)};

/* ---------- code tab ---------- */
$('snip').innerHTML=SNIPS.map((s,i)=>`<option value="${i}">${s.n}</option>`).join('');
function syncCode(){const s=cur();if(!s)return;const c=s.t=='custom';$('codeconv').hidden=c;$('code').disabled=!c;if(document.activeElement!==$('code'))$('code').value=c?(s.js||''):''}
$('code').addEventListener('input',()=>{const s=cur();if(s.t!='custom')return;s.js=$('code').value;touch()});
$('code').addEventListener('keydown',e=>{if(e.key=='Tab'){e.preventDefault();const a=e.target,p=a.selectionStart;a.setRangeText('  ',p,a.selectionEnd,'end');a.dispatchEvent(new Event('input'))}});
$('codemk').onclick=()=>{ensureCustom();syncCode()};
$('snipb').onclick=()=>{ensureCustom();cur().js=SNIPS[+$('snip').value].c;$('code').value=cur().js;touch();toast('Snippet inserted')};
$('codecp').onclick=()=>{navigator.clipboard.writeText($('code').value).then(()=>toast('Code copied'),()=>toast('Copy failed, select the code and press Ctrl+C',1))};
$('codepa').onclick=async()=>{try{const t=await navigator.clipboard.readText();if(!t.trim())return toast('Clipboard is empty',1);ensureCustom();cur().js=t;$('code').value=t;touch();toast('Code pasted')}catch(e){ensureCustom();$('code').focus();toast('Press Ctrl+V to paste into the editor')}};

/* ---------- import / save / png ---------- */
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
$('save').onclick=()=>save(new Blob([JSON.stringify(P,null,2)],{type:'application/json'}),'project.json');
function importText(txt,close){let j;try{j=JSON.parse(txt)}catch(e){return toast('That is not valid JSON',1)}
 try{if(j&&Array.isArray(j.scenes)){setProject(j);refreshAll();toast('Project imported')}
  else{const arr=(Array.isArray(j)?j:[j]).filter(o=>o&&typeof o=='object'&&o.t);if(!arr.length)throw 0;normalize({scenes:arr});P.scenes.splice(sel+1,0,...arr.map(a=>normalize({scenes:[a]}).scenes[0]));select(sel+1);toast(arr.length+' scene'+(arr.length>1?'s':'')+' added')}
  touch();close&&close()}catch(e){toast('Could not read that as a project or scene',1)}}
$('imp').onclick=()=>{const m=modal('Import','<small style="color:var(--m)">Paste a project JSON, a single scene, or a list of scenes. Or choose a file.</small><textarea class="it" placeholder=\'{"scenes":[...]} or {"t":"text","d":3,"x":"Hello"}\'></textarea><input type="file" class="if" accept=".json,application/json">',
  [{label:'Cancel',fn:c=>c()},{label:'Import',cls:'y',fn:c=>importText(m.ov.querySelector('.it').value,c)}]);
 m.ov.querySelector('.if').onchange=e=>{const f=e.target.files[0];if(f)f.text().then(t=>m.ov.querySelector('.it').value=t)}};
$('png').onclick=()=>{draw();cv.toBlob(b=>save(b,'frame.png'))};

/* ---------- export ---------- */
async function doExport(){if(rec)return;if(!window.MediaRecorder||!cv.captureStream)return status('Export needs Chrome or Edge');
 const mt=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mt)return status('WebM is not supported in this browser');
 solo=false;$('solo').checked=false;const ch=[],stream=cv.captureStream(30);let AC=null,src=null;
 if(MUS){try{AC=new(window.AudioContext||window.webkitAudioContext)();const ab=await AC.decodeAudioData(MUS.buf.slice(0));src=AC.createBufferSource();src.buffer=ab;const gn=AC.createGain(),dst=AC.createMediaStreamDestination(),tt=tot(),n0=AC.currentTime;
  gn.gain.setValueAtTime(P.vol,n0);gn.gain.setValueAtTime(P.vol,n0+Math.max(0,tt-1.2));gn.gain.linearRampToValueAtTime(0,n0+tt);src.connect(gn);gn.connect(dst);dst.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(er){toast('Could not use that audio file. Exporting without music.',1);AC=null;src=null}}
 rec=new MediaRecorder(stream,{mimeType:mt,videoBitsPerSecond:8e6});rec.ondataavailable=e=>e.data.size&&ch.push(e.data);
 rec.onstop=async()=>{const b=new Blob(ch,{type:'video/webm'});lastBlob=b;rec=null;if(src)try{src.stop()}catch(e){}if(AC)AC.close();$('exp').classList.remove('busy');$('exp').querySelector('.lb').textContent='Export WebM';$('st').textContent='';
  if(afterExport=='cap'){afterExport=null;try{await Handoff.put(b,'motion.webm');location.href='/?from=motion'}catch(e){save(b,'motion.webm');toast('Could not hand off automatically. The file was downloaded, upload it in Captions.',1)}}
  else{save(b,'motion.webm');toast('Exported. Use Add captions to caption it.')}};
 T=0;setPlay(true);rec.start();if(src)src.start();$('exp').classList.add('busy');$('exp').querySelector('.lb').textContent='Recording';toast('Recording in real time. Keep this tab visible.')}
$('exp').onclick=()=>{afterExport=null;doExport()};
$('tocap').onclick=async()=>{if(rec)return;if(lastBlob){try{await Handoff.put(lastBlob,'motion.webm');location.href='/?from=motion'}catch(e){toast('Could not hand off. Download it and upload in Captions.',1)}return}afterExport='cap';doExport()};

/* ---------- transport ---------- */
$('play').onclick=()=>{if(!play){const lo=solo?start(sel):0,hi2=solo?lo+cur().d:tot();if(T>=hi2-.05)T=lo}setPlay(!play)};
$('solo').onchange=e=>{solo=e.target.checked;if(solo&&play)T=start(sel)};
$('scrub').oninput=e=>{T=e.target.value/100};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.closest('.ovl')&&b.id!=='code')b.blur()});
addEventListener('keydown',e=>{if(e.key=='Escape'){const o=document.querySelector('.ovl');if(o){o.remove();return}}
 if((e.ctrlKey||e.metaKey)&&!typing()){const k=e.key.toLowerCase();if(k=='z'){e.preventDefault();e.shiftKey?redo():undo();return}if(k=='y'){e.preventDefault();redo();return}if(k=='d'){e.preventDefault();$('dup').click();return}}
 if(typing()||document.querySelector('.ovl'))return;
 if(e.code=='Space'){e.preventDefault();$('play').click()}else if(e.code=='ArrowRight'){e.preventDefault();select(sel+1)}else if(e.code=='ArrowLeft'){e.preventDefault();select(sel-1)}
 else if(e.code=='Delete'||e.code=='Backspace'){e.preventDefault();$('del').click()}else if(e.key=='g'){const g=$('guides');g.checked=!g.checked;GUIDES=g.checked}});

/* ---------- main loop ---------- */
let last=performance.now();
function frame(n){const dt=Math.min(.1,(n-last)/1000);last=n;
 if(play){T+=dt;const lo=solo&&!rec?start(sel):0,hi2=solo&&!rec?lo+cur().d:tot();if(T<lo)T=lo;
  if(T>=hi2){if(rec){T=tot()-.01;draw();setTimeout(()=>rec&&rec.stop(),120);setPlay(false)}else if(solo||$('loop').checked)T=lo;else{T=hi2-.01;setPlay(false)}}
  $('scrub').value=T*100}
 if(!solo&&!(typing()&&document.activeElement.id!='ft')){const i=sceneAt(T)[0];if(i!=sel){sel=i;tlui();fields()}}
 draw();$('time').textContent=T.toFixed(1)+' / '+tot().toFixed(1)+'s';
 if(rec)$('st').textContent='Recording '+Math.min(100,Math.round(T/tot()*100))+'%';
 const er=CERR||(cur().t=='custom'?(compileCustom(cur().js).err||''):'');if(er!==lastErr){lastErr=er;const b=$('cerr');b.hidden=!er;b.textContent=er}
 requestAnimationFrame(frame)}

/* ---------- boot ---------- */
setProject(loadSaved()||SAMPLE());attach($('cv'));fit();loadFont();tlui();fields();proj();hydrateIcons();snap();requestAnimationFrame(frame);
