const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],v=$("#v");
const RAT={"9:16":[1080,1920],"1:1":[1080,1080],"4:5":[1080,1350],"16:9":[1920,1080]};
const DEF={font:"Anton",size:6,y:70,sw:6,sh:0,color:"#FFFFFF",hi:"#FFC400",stroke:"#000000",case:"upper",bold:false,hl:true,pop:true,box:false,boxc:"#000000",boxa:70};
const PRESETS={
 "Bold pop":{},
 "Lime":{font:"Luckiest Guy",size:6.5,sw:7,sh:2,hi:"#39FF14"},
 "Clean":{font:"Bebas Neue",size:7,sw:0,sh:3,pop:false},
 "Box":{font:"Anton",size:5,sw:0,case:"none",box:true,boxa:75,pop:false},
 "Marker":{font:"Permanent Marker",size:5,sw:5,case:"none",hi:"#FF4D4D"},
 "Comic":{font:"Bangers",size:7,sw:8,sh:2,hi:"#00E5FF"}
};
const S={id:null,name:"",dur:0,audio:true,cuts:[],ratio:"9:16",fit:"fill",n:3,cutOn:true,zoom:1,st:{...DEF}};
let G=[],lastKey="",curG=-2,hist=[],peaks=null,scrub=false,drag=null;

const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const rgba=(h,a)=>{const n=parseInt(h.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
const tcase=(t,m)=>m=="upper"?t.toUpperCase():m=="lower"?t.toLowerCase():m=="title"?t.charAt(0).toUpperCase()+t.slice(1).toLowerCase():t;
const gtext=g=>g.words.map(w=>w.t).join(" ");
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const fmt=t=>Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");
const toast=(m,e)=>{const t=$("#toast");t.textContent=m;t.className="show"+(e?" err":"");clearTimeout(t._h);t._h=setTimeout(()=>t.className="",3600)};
const busy=(b,on)=>b.classList.toggle("busy",on);
const api=async(u,b)=>{try{const r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
 const j=await r.json().catch(()=>null);return j||{error:r.status==502||r.status==504?"Server timed out. Try a shorter clip or a smaller model.":"Server error ("+r.status+")"}}
 catch{return{error:"Network error. Check your connection."}}};

/* ---------- upload (XHR so we get a progress bar on a remote server) ---------- */
const drop=$("#drop"),file=$("#file");
file.onchange=()=>{file.files[0]&&load(file.files[0]);file.value=""};
["dragover","dragenter"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add("ov")}));
["dragleave","drop"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove("ov")}));
drop.addEventListener("drop",x=>x.dataTransfer.files[0]&&load(x.dataTransfer.files[0]));
function upload(f,on){return new Promise(res=>{const x=new XMLHttpRequest(),fd=new FormData();fd.append("file",f);x.open("POST","/api/upload");
 x.upload.onprogress=e=>e.lengthComputable&&on(Math.round(e.loaded/e.total*100));
 x.onload=()=>{let j=null;try{j=JSON.parse(x.responseText)}catch{}res(j||{error:x.status==413?"File too large (max 150 MB)":"Upload failed ("+x.status+")"})};
 x.onerror=()=>res({error:"Network error, try again"});x.send(fd)})}
async function load(f){const sp=$("#drop span");
 if(f.size>150*1048576){sp.textContent="File too large (max 150 MB)";return}
 sp.textContent="Uploading… 0%";
 const r=await upload(f,p=>sp.textContent=p<100?`Uploading… ${p}%`:"Processing…");
 if(!r.id){sp.textContent=(r.error||"Upload failed")+" · drop another";return}
 Object.assign(S,{id:r.id,dur:r.dur,audio:r.audio,name:f.name});v.src="/media/"+r.id;decodeWave(f);
 $("#gate").classList.add("out");
 setTimeout(()=>{$("#gate").style.display="none";$("#app").classList.add("in");init()},650);
}

/* ---------- init ---------- */
function init(){
 $("#ratios").innerHTML=Object.keys(RAT).map(r=>`<button data-r="${r}" class="${r==S.ratio?"on":""}">${r}${r=="9:16"?" · Shorts/Reels/TikTok":""}</button>`).join("");
 $$("#ratios button").forEach(b=>b.onclick=()=>{S.ratio=b.dataset.r;$$("#ratios button").forEach(x=>x.classList.toggle("on",x==b));setRatio()});
 $$("#fit button").forEach(b=>b.onclick=()=>{S.fit=b.dataset.f;$$("#fit button").forEach(x=>x.classList.toggle("on",x==b));$("#stage").classList.toggle("blur",S.fit=="blur")});
 $("#presets").innerHTML=Object.keys(PRESETS).map(k=>`<button>${k}</button>`).join("");
 $$("#presets button").forEach(b=>b.onclick=()=>{Object.assign(S.st,{...DEF,y:S.st.y},PRESETS[b.textContent]);syncControls();styleCap()});
 $$("[data-k]").forEach(el=>{const k=el.dataset.k,h=()=>{S.st[k]=el.type=="checkbox"?el.checked:el.type=="range"?+el.value:el.value;outOf(el);styleCap()};el.oninput=h;el.onchange=h});
 $$(".sw3 button").forEach(b=>b.onclick=()=>{S.st.color=b.dataset.c;syncControls();styleCap()});
 $$("#tabs button").forEach(b=>b.onclick=()=>{$$("#tabs button").forEach(x=>x.classList.toggle("on",x==b));$$(".tab").forEach(t=>t.classList.toggle("on",t.id=="t-"+b.dataset.t))});
 $("#tdur").textContent="/ "+fmt(S.dur);
 setRatio();syncControls();styleCap();drawTL();drawWave();renderList();paint();
}
const setRatio=()=>{const[w,h]=RAT[S.ratio];$("#stage").style.setProperty("--ar",w/h)};
function outOf(el){const o=el.parentElement.querySelector("output");if(o)o.textContent=el.value+(el.dataset.u||"")}
function syncControls(){$$("[data-k]").forEach(el=>{const x=S.st[el.dataset.k];if(el.type=="checkbox")el.checked=!!x;else el.value=x;outOf(el)})}
function styleCap(){const s=S.st;
 $("#cap").style.cssText=`top:${s.y}%;font-family:"${s.font}",sans-serif;font-size:${s.size}cqh;font-weight:${s.bold?700:400};color:${s.color};--hi:${s.hl?s.hi:s.color};--sc:${s.pop?1.12:1};`
  +(s.box?`background:${rgba(s.boxc,s.boxa/100)};padding:.12em .3em;border-radius:.18em;`:`-webkit-text-stroke:${2*s.sw/100}em ${s.stroke};`)
  +(s.sh?`text-shadow:${s.sh/100}em ${s.sh/100}em 0 rgba(0,0,0,.55);`:"");
 if(document.fonts)document.fonts.load(`32px "${s.font}"`).then(()=>lastKey="");
 lastKey=""}
$("#safeT").onchange=e=>$("#safe").classList.toggle("on",e.target.checked);

/* drag the caption in the preview to move it */
(()=>{const cap=$("#cap");let d=null;
 cap.addEventListener("pointerdown",e=>{const r=cap.getBoundingClientRect();d={off:e.clientY-(r.top+r.height/2)};cap.setPointerCapture(e.pointerId)});
 cap.addEventListener("pointermove",e=>{if(!d)return;const r=$("#stage").getBoundingClientRect();
  S.st.y=Math.round(clamp((e.clientY-d.off-r.top)/r.height*100,8,92));cap.style.top=S.st.y+"%";
  const el=$('[data-k="y"]');el.value=S.st.y;outOf(el)});
 cap.addEventListener("pointerup",()=>d=null)})();

/* ---------- caption model: G = [{s,e,words:[{t,s,e}]}] is the source of truth ---------- */
const snap=()=>{hist.push(JSON.stringify(G));if(hist.length>60)hist.shift()};
function undo(){if(!hist.length)return toast("Nothing to undo");G=JSON.parse(hist.pop());refresh()}
function refresh(list=true){lastKey="";drawTL();if(list)renderList()}
function chunk(w){const g=[];for(let i=0;i<w.length;i+=S.n){const ws=w.slice(i,i+S.n);g.push({s:ws[0].s,e:ws.at(-1).e,words:ws})}
 g.forEach((x,i)=>{const nx=g[i+1];x.e=+(nx?Math.min(nx.s,x.e+.4):Math.min(x.e+.4,S.dur||x.e+.4)).toFixed(2)});return g}
function spread(text,s,e){const t=text.split(/\s+/).filter(Boolean);if(!t.length)return[];const L=t.reduce((a,x)=>a+x.length+1,0);let c=s;
 return t.map(x=>{const d=(e-s)*(x.length+1)/L,o={t:x,s:+c.toFixed(2),e:+(c+d).toFixed(2)};c+=d;return o})}

$("#n").oninput=e=>{S.n=+e.target.value;$("#nO").textContent=S.n;if(!G.length)return;snap();G=chunk(G.flatMap(g=>g.words));refresh()};
$("#gen").onclick=async e=>{const b=e.currentTarget;busy(b,1);toast("Transcribing on the server… this can take a minute");
 const r=await api("/api/transcribe",{id:S.id,model:$("#model").value});busy(b,0);
 if(r.error)return toast(r.error,1);if(G.length)snap();G=chunk(r.words);refresh();toast(r.words.length+" words captioned")};
$("#srt").onclick=()=>{if(!G.length)return toast("Generate captions first",1);
 const t=x=>new Date(x*1000).toISOString().slice(11,23).replace(".",",");
 const s=G.map((g,i)=>`${i+1}\n${t(g.s)} --> ${t(g.e)}\n${tcase(gtext(g),S.st.case)}\n`).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([s]));a.download="captions.srt";a.click()};

/* caption list */
function renderList(){const L=$("#list");curG=-2;
 if(!G.length){L.innerHTML='<p class="empty">No captions yet. Hit Auto-caption, or add one at the playhead.</p>';return}
 L.innerHTML=G.map((g,i)=>`<div class="crow" data-i="${i}"><div class="chd"><b>${i+1}</b><input class="ts" type="number" step=".05" min="0" value="${g.s.toFixed(2)}"><i>${ic('arrow-right')}</i><input class="te" type="number" step=".05" min="0" value="${g.e.toFixed(2)}"><span class="sp"></span><button data-a="split" title="Split in two">${ic('scissors')}</button><button data-a="merge" title="Merge with next">${ic('chevrons-down')}</button><button data-a="del" title="Delete">${ic('trash-2')}</button></div><textarea rows="2" spellcheck="false">${esc(gtext(g))}</textarea></div>`).join("")}
const list=$("#list");
list.addEventListener("focusin",e=>{if(e.target.tagName!="TEXTAREA")return;const g=G[+e.target.closest(".crow").dataset.i];if(g&&!(v.currentTime>=g.s&&v.currentTime<g.e))v.currentTime=g.s+.01});
list.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const i=+b.closest(".crow").dataset.i,g=G[i];
 if(b.dataset.a=="del"){snap();G.splice(i,1)}
 else if(b.dataset.a=="merge"){if(!G[i+1])return toast("No caption after this one");snap();g.words=g.words.concat(G[i+1].words);g.e=G[i+1].e;G.splice(i+1,1)}
 else if(b.dataset.a=="split"){if(g.words.length<2)return toast("Needs 2+ words to split");snap();const m=Math.ceil(g.words.length/2),a=g.words.slice(0,m),c=g.words.slice(m);
  const ng={s:c[0].s,e:g.e,words:c};g.words=a;g.e=+Math.max(g.s+.05,Math.min(c[0].s,a.at(-1).e+.4)).toFixed(2);G.splice(i+1,0,ng)}
 refresh()});
list.addEventListener("change",e=>{const row=e.target.closest(".crow");if(!row)return;const i=+row.dataset.i,g=G[i],el=e.target,pv=G[i-1],nx=G[i+1];snap();
 if(el.tagName=="TEXTAREA"){const t=el.value.trim().split(/\s+/).filter(Boolean);
  if(!t.length){G.splice(i,1);return refresh()}
  if(t.length==g.words.length)t.forEach((x,j)=>g.words[j].t=x);else g.words=spread(t.join(" "),g.s,g.e)}
 else if(el.classList.contains("ts")){g.s=+clamp(+el.value||0,pv?pv.e:0,g.e-.05).toFixed(2);el.value=g.s.toFixed(2)}
 else if(el.classList.contains("te")){g.e=+clamp(+el.value||0,g.s+.05,nx?nx.s:S.dur).toFixed(2);el.value=g.e.toFixed(2)}
 refresh(false)});

$("#undo").onclick=undo;
$("#addcap").onclick=()=>{if(!S.dur)return;const t=v.currentTime,ins=G.find(g=>t>=g.s&&t<g.e),s=ins?ins.e:t;
 let pos=G.findIndex(g=>g.s>s);if(pos<0)pos=G.length;const nx=G[pos],e=Math.min(s+1.5,nx?nx.s:S.dur,S.dur);
 if(e-s<.2)return toast("No room for a caption here. Move the playhead.",1);
 snap();G.splice(pos,0,{s:+s.toFixed(2),e:+e.toFixed(2),words:spread("New caption",s,e)});refresh();
 const ta=$(`.crow[data-i="${pos}"] textarea`);if(ta){ta.focus();ta.select()}};
$("#fill").onclick=()=>{if(!G.length)return;const rx=/^(um+|uh+|uhm+|erm+|hm+|mm+)[.,!?…]*$/i;let n=0;snap();
 G.forEach(g=>{const k=g.words.filter(w=>!rx.test(w.t));n+=g.words.length-k.length;g.words=k});G=G.filter(g=>g.words.length);
 n?(refresh(),toast(n+" filler word"+(n>1?"s":"")+" removed")):(hist.pop(),toast("No filler words found"))};
const shift=d=>{if(!G.length)return;snap();const f=x=>+Math.max(0,x+d).toFixed(2);G.forEach(g=>{g.s=f(g.s);g.e=f(g.e);g.words.forEach(w=>{w.s=f(w.s);w.e=f(w.e)})});refresh()};
$("#shm").onclick=()=>shift(-.1);$("#shp").onclick=()=>shift(.1);
$("#rep").onclick=()=>{const f=$("#fi").value.trim();if(!f||!G.length)return;const rx=new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),r=$("#re").value;let n=0;snap();
 G.forEach(g=>g.words.forEach(w=>{const t=w.t.replace(rx,r);if(t!==w.t){w.t=t;n++}}));
 n?(refresh(),toast(n+" replaced")):(hist.pop(),toast("No match",1))};

/* ---------- silence ---------- */
$("#db").oninput=e=>$("#dbO").textContent=e.target.value+" dB";
$("#mn").oninput=e=>$("#mnO").textContent=(e.target.value/10)+" s";
$("#cutT").onchange=e=>{S.cutOn=e.target.checked;drawTL()};
$("#sil").onclick=async e=>{const b=e.currentTarget;busy(b,1);
 const r=await api("/api/silence",{id:S.id,db:$("#db").value,min:$("#mn").value/10});busy(b,0);
 if(r.error)return toast(r.error,1);S.cuts=r.cuts.map(([s,e])=>({s,e,on:true}));drawTL();toast(S.cuts.length+" silences found")};
function cutInfo(){const t=S.cuts.filter(c=>c.on).reduce((a,c)=>a+c.e-c.s,0);$("#silInfo").textContent=S.cuts.length?`Removing ${t.toFixed(1)}s of ${S.dur.toFixed(1)}s. Click a red block on the timeline to keep or remove it.`:"Click a red block on the timeline to keep or remove it."}

/* ---------- timeline ---------- */
const tin=$("#tin"),tsc=$("#tscroll"),pct=x=>(x/S.dur*100)+"%";
const cutsHTML=()=>S.cuts.map((c,i)=>`<div class="cut ${c.on&&S.cutOn?"":"off"}" data-i="${i}" style="left:${pct(c.s)};width:${pct(c.e-c.s)}"></div>`).join("");
function drawTL(){if(!S.dur)return;tin.style.width=S.zoom*100+"%";
 const pps=Math.max(tsc.clientWidth,300)*S.zoom/S.dur,step=[1,2,5,10,15,30,60,120].find(x=>x*pps>=64)||120;
 let r="";for(let t=0;t<=S.dur;t+=step)r+=`<i style="left:${pct(t)}">${fmt(t)}</i>`;$("#ruler").innerHTML=r;
 $("#tV").innerHTML=`<div class="clip">${esc(S.name)} · ${fmt(S.dur)}</div>`+cutsHTML();
 $("#tAc").innerHTML=cutsHTML();
 $("#tC").innerHTML=G.map((g,i)=>`<div class="blk${i==curG?" sel":""}" data-i="${i}" style="left:${pct(g.s)};width:${pct(g.e-g.s)}"><b class="hd" data-e="s"></b><span>${esc(gtext(g))}</span><b class="hd" data-e="e"></b></div>`).join("");
 $$(".cut").forEach(el=>el.onclick=ev=>{ev.stopPropagation();const c=S.cuts[el.dataset.i];c.on=!c.on;drawTL()});
 cutInfo()}
$("#zoom").oninput=e=>{S.zoom=+e.target.value;drawTL();tsc.scrollLeft=v.currentTime/S.dur*tin.offsetWidth-tsc.clientWidth/2};
$("#tlmin").onclick=()=>$("#tl").classList.toggle("min");
addEventListener("resize",()=>S.dur&&drawTL());

const tAt=x=>{const r=tin.getBoundingClientRect();return clamp((x-r.left)/r.width,0,1)*S.dur};
tin.addEventListener("pointerdown",e=>{if(e.target.closest(".cut"))return;
 const h=e.target.closest(".hd");tin.setPointerCapture(e.pointerId);
 if(h){const blk=h.closest(".blk");drag={i:+blk.dataset.i,edge:h.dataset.e,el:blk,moved:false}}
 else{scrub=true;v.currentTime=tAt(e.clientX)}});
tin.addEventListener("pointermove",e=>{
 if(drag){if(!drag.moved){snap();drag.moved=true}
  const g=G[drag.i],pv=G[drag.i-1],nx=G[drag.i+1],t=tAt(e.clientX);
  if(drag.edge=="s")g.s=+clamp(t,pv?pv.e:0,g.e-.05).toFixed(2);else g.e=+clamp(t,g.s+.05,nx?nx.s:S.dur).toFixed(2);
  drag.el.style.left=pct(g.s);drag.el.style.width=pct(g.e-g.s);
  const row=$(`.crow[data-i="${drag.i}"]`);if(row){row.querySelector(".ts").value=g.s.toFixed(2);row.querySelector(".te").value=g.e.toFixed(2)}}
 else if(scrub)v.currentTime=tAt(e.clientX)});
tin.addEventListener("pointerup",()=>{if(drag&&drag.moved)lastKey="";drag=null;scrub=false});

/* waveform (decoded in the browser from the file you picked; no server work) */
async function decodeWave(f){try{if(f.size>120e6)return;const AC=window.AudioContext||window.webkitAudioContext,ac=new AC();
 const buf=await ac.decodeAudioData(await f.arrayBuffer());ac.close();
 const d=buf.getChannelData(0),N=2400,bl=Math.floor(d.length/N)||1,st=Math.max(1,bl>>4);peaks=new Float32Array(N);let mx=0;
 for(let i=0;i<N;i++){let m=0;for(let j=i*bl;j<(i+1)*bl&&j<d.length;j+=st){const a=Math.abs(d[j]);if(a>m)m=a}peaks[i]=m;if(m>mx)mx=m}
 if(mx)for(let i=0;i<N;i++)peaks[i]=Math.sqrt(peaks[i]/mx);drawWave()}catch{}}
function drawWave(){const c=$("#wave"),W=c.width=2400,H=c.height=60,x=c.getContext("2d");x.clearRect(0,0,W,H);x.fillStyle="rgba(255,196,0,.8)";
 if(!peaks){x.fillRect(0,H/2-1,W,2);return}
 for(let i=0;i<W;i++){const h=Math.max(2,peaks[i]*H*.92);x.fillRect(i,(H-h)/2,1,h)}}

/* ---------- playback ---------- */
const toggle=()=>v.paused?v.play():v.pause();$("#play").onclick=toggle;
addEventListener("keydown",e=>{
 if((e.ctrlKey||e.metaKey)&&e.key=="z"&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){e.preventDefault();return undo()}
 if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&e.target.type!="range")return;
 if(e.code=="Space"){e.preventDefault();toggle()}if(e.code=="ArrowRight")v.currentTime+=1;if(e.code=="ArrowLeft")v.currentTime-=1;
 if(e.key=="s"){const c=$("#safeT");c.checked=!c.checked;c.onchange({target:c})}});
function paint(){const t=v.currentTime;
 if(S.cutOn&&!v.paused){const c=S.cuts.find(c=>c.on&&t>=c.s&&t<c.e-.03);if(c)v.currentTime=c.e}
 const gi=G.findIndex(g=>t>=g.s&&t<g.e);let ai=-1;
 if(gi>=0){const w=G[gi].words;ai=0;for(let j=w.length-1;j>0;j--)if(t>=w[j].s){ai=j;break}}
 const k=gi+":"+ai;
 if(k!=lastKey){lastKey=k;const s=S.st;$("#cap").innerHTML=gi<0?"":G[gi].words.map((w,j)=>`<span class="${s.hl&&j==ai?"on":""}">${esc(tcase(w.t,s.case))}</span>`).join(" ")}
 if(gi!=curG){curG=gi;$$("#tC .blk").forEach((b,i)=>b.classList.toggle("sel",i==gi));
  $$(".crow").forEach((r,i)=>r.classList.toggle("cur",i==gi));
  if(gi>=0&&!v.paused&&document.activeElement.tagName!="TEXTAREA"){const r=$(`.crow[data-i="${gi}"]`);r&&r.scrollIntoView({block:"nearest"})}}
 if(S.dur){$("#head").style.left=(t/S.dur*100)+"%";
  if(S.zoom>1&&!v.paused&&!scrub){const x=t/S.dur*tin.offsetWidth;if(x<tsc.scrollLeft+20||x>tsc.scrollLeft+tsc.clientWidth-40)tsc.scrollLeft=x-tsc.clientWidth*.3}}
 $("#tc").textContent=fmt(t);
 $("#pp").setAttribute("d",v.paused?"M7 5v14l12-7z":"M6 5h4v14H6zM14 5h4v14h-4z");requestAnimationFrame(paint)}

/* ---------- export ---------- */
$("#export").onclick=async e=>{const b=e.currentTarget;if(!G.length)return toast("Generate captions first",1);
 const[W,H]=RAT[S.ratio];busy(b,1);toast("Rendering on the server… this can take a minute");
 const r=await api("/api/export",{id:S.id,dur:S.dur,audio:S.audio,W,H,fit:S.fit,style:S.st,groups:G,
  cuts:S.cutOn?S.cuts.filter(c=>c.on).map(c=>[c.s,c.e]):[]});busy(b,0);
 if(r.error)return toast("Export failed: "+r.error.slice(-140),1);
 const a=document.createElement("a");a.href=r.url;a.download="captionforge_"+S.ratio.replace(":","x")+".mp4";a.click();toast("Exported")};

/* arriving from Motion Studio: pick up the exported video and load it */
(()=>{const q=new URLSearchParams(location.search);if(q.get("from")!=="motion"||!window.Handoff)return;history.replaceState(null,"","/");
 $("#drop span").textContent="Loading your motion video…";
 Handoff.take().then(f=>f?load(f):($("#drop span").textContent="No motion video found. Export one in Motion Studio first.")).catch(()=>{$("#drop span").textContent="Could not read the motion video. Drop it here instead."})})();
