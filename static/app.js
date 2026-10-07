const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],v=$("#v");
const RAT={"9:16":[1080,1920],"1:1":[1080,1080],"4:5":[1080,1350],"16:9":[1920,1080]};
const S={id:null,dur:0,audio:true,words:[],cuts:[],ratio:"9:16",fit:"fill",n:3,cutOn:true,
 st:{font:"Arial Black",size:6,y:70,sw:8,color:"#FFFFFF",hi:"#FFC400",stroke:"#000000",upper:true}};
let G=[],lastKey="";
const api=(u,b)=>fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json());
const toast=(m,e)=>{const t=$("#toast");t.textContent=m;t.className="show"+(e?" err":"");clearTimeout(t._h);t._h=setTimeout(()=>t.className="",3200)};
const fmt=t=>Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");
const esc=s=>s.replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const busy=(b,on)=>b.classList.toggle("busy",on);

const drop=$("#drop"),file=$("#file");
file.onchange=()=>file.files[0]&&load(file.files[0]);
["dragover","dragenter"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.add("ov")}));
["dragleave","drop"].forEach(e=>drop.addEventListener(e,x=>{x.preventDefault();drop.classList.remove("ov")}));
drop.addEventListener("drop",x=>x.dataTransfer.files[0]&&load(x.dataTransfer.files[0]));
async function load(f){
 $("#drop span").textContent="Uploading…";
 const fd=new FormData();fd.append("file",f);
 const r=await fetch("/api/upload",{method:"POST",body:fd}).then(r=>r.json()).catch(()=>null);
 if(!r||!r.id){$("#drop span").textContent="Upload failed, try again";return}
 Object.assign(S,{id:r.id,dur:r.dur,audio:r.audio});v.src="/media/"+r.id;
 $("#gate").classList.add("out");
 setTimeout(()=>{$("#gate").style.display="none";$("#app").classList.add("in");init()},650);
}

function init(){
 $("#ratios").innerHTML=Object.keys(RAT).map(r=>`<button data-r="${r}" class="${r==S.ratio?"on":""}">${r}${r=="9:16"?" · Shorts/Reels/TikTok":""}</button>`).join("");
 $$("#ratios button").forEach(b=>b.onclick=()=>{S.ratio=b.dataset.r;$$("#ratios button").forEach(x=>x.classList.toggle("on",x==b));setRatio()});
 $$("#fit button").forEach(b=>b.onclick=()=>{S.fit=b.dataset.f;$$("#fit button").forEach(x=>x.classList.toggle("on",x==b));$("#stage").classList.toggle("blur",S.fit=="blur")});
 for(const k of["size","y","sw"]){const el=$("#"+k);el.value=S.st[k];el.oninput=()=>{S.st[k]=+el.value;styleCap()}}
 for(const k of["color","hi","stroke"]){const el=$("#"+k);el.value=S.st[k];el.oninput=()=>{S.st[k]=el.value;styleCap()}}
 $("#font").onchange=e=>{S.st.font=e.target.value;styleCap()};
 $("#upper").checked=S.st.upper;$("#upper").onchange=e=>{S.st.upper=e.target.checked;lastKey=""};
 $$(".sw3 button").forEach(b=>b.onclick=()=>{S.st.color=b.dataset.c;$("#color").value=b.dataset.c;styleCap()});
 setRatio();styleCap();drawTL();paint();
}
const setRatio=()=>{const[w,h]=RAT[S.ratio];$("#stage").style.aspectRatio=w+"/"+h};
function styleCap(){const c=$("#cap"),s=S.st;c.style.cssText=`top:${s.y}%;font-family:"${s.font}",sans-serif;font-size:${s.size}cqh;color:${s.color};-webkit-text-stroke:${2*s.sw/100}em ${s.stroke};--hi:${s.hi}`;
 $$("details:nth-of-type(3) output").forEach((o,i)=>o.textContent=[s.size,s.y+"%",s.sw][i]);lastKey=""}
$("#safeT").onchange=e=>$("#safe").classList.toggle("on",e.target.checked);

function groups(){const w=S.words,g=[];for(let i=0;i<w.length;i+=S.n){const ws=w.slice(i,i+S.n);g.push({s:ws[0].s,e:ws.at(-1).e,words:ws})}
 g.forEach((x,i)=>{const nx=g[i+1];x.e=nx?Math.min(nx.s,x.e+.4):x.e+.4});return g}
const regroup=()=>{G=groups();lastKey="";drawTL()};
$("#n").oninput=e=>{S.n=+e.target.value;$("#nO").textContent=S.n;regroup()};
$("#txt").oninput=e=>{const t=e.target.value.trim().split(/\s+/).filter(Boolean);if(t.length==S.words.length){t.forEach((x,i)=>S.words[i].t=x);regroup()}};
$("#gen").onclick=async e=>{const b=e.target;busy(b,1);toast("Transcribing locally… first run downloads the model");
 const r=await api("/api/transcribe",{id:S.id,model:$("#model").value}).catch(()=>({error:"Server error"}));busy(b,0);
 if(r.error)return toast(r.error,1);S.words=r.words;$("#txt").value=S.words.map(w=>w.t).join(" ");regroup();toast(S.words.length+" words captioned")};
$("#srt").onclick=()=>{if(!G.length)return toast("Generate captions first",1);
 const t=x=>new Date(x*1000).toISOString().slice(11,23).replace(".",",");
 const s=G.map((g,i)=>`${i+1}\n${t(g.s)} --> ${t(g.e)}\n${g.words.map(w=>w.t).join(" ")}\n`).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([s]));a.download="captions.srt";a.click()};

$("#db").oninput=e=>$("#dbO").textContent=e.target.value+" dB";
$("#mn").oninput=e=>$("#mnO").textContent=(e.target.value/10)+" s";
$("#cutT").onchange=e=>{S.cutOn=e.target.checked;drawTL()};
$("#sil").onclick=async e=>{const b=e.target;busy(b,1);
 const r=await api("/api/silence",{id:S.id,db:$("#db").value,min:$("#mn").value/10}).catch(()=>({error:"Server error"}));busy(b,0);
 if(r.error)return toast(r.error,1);S.cuts=r.cuts.map(([s,e])=>({s,e,on:true}));drawTL();toast(S.cuts.length+" silences found")};
function cutInfo(){const t=S.cuts.filter(c=>c.on).reduce((a,c)=>a+c.e-c.s,0);$("#silInfo").textContent=S.cuts.length?`Removing ${t.toFixed(1)}s of ${S.dur.toFixed(1)}s. Click a red block to keep or remove it.`:"Click a red block on the timeline to keep or remove it."}

function drawTL(){const p=x=>(x/S.dur*100)+"%";
 $("#tA").innerHTML=S.cuts.map((c,i)=>`<div class="cut ${c.on&&S.cutOn?"":"off"}" data-i="${i}" style="left:${p(c.s)};width:${p(c.e-c.s)}"></div>`).join("");
 $("#tC").innerHTML=G.map(g=>`<div class="blk" style="left:${p(g.s)};width:${p(g.e-g.s)}">${esc(g.words.map(w=>w.t).join(" "))}</div>`).join("");
 $$(".cut").forEach(el=>el.onclick=ev=>{ev.stopPropagation();const c=S.cuts[el.dataset.i];c.on=!c.on;drawTL()});cutInfo()}
$$(".trk").forEach(t=>t.addEventListener("click",e=>{const r=t.getBoundingClientRect();v.currentTime=(e.clientX-r.left)/r.width*S.dur}));

const toggle=()=>v.paused?v.play():v.pause();$("#play").onclick=toggle;
$("#seek").oninput=e=>v.currentTime=e.target.value/1000*S.dur;
addEventListener("keydown",e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&e.target.type!="range")return;
 if(e.code=="Space"){e.preventDefault();toggle()}if(e.code=="ArrowRight")v.currentTime+=1;if(e.code=="ArrowLeft")v.currentTime-=1;
 if(e.key=="s"){const c=$("#safeT");c.checked=!c.checked;c.onchange({target:c})}});
function paint(){const t=v.currentTime;
 if(S.cutOn){const c=S.cuts.find(c=>c.on&&t>=c.s&&t<c.e-.03);if(c)v.currentTime=c.e}
 const g=G.find(g=>t>=g.s&&t<g.e),k=g?G.indexOf(g)+":"+g.words.map(w=>t>=w.s&&t<w.e?1:0).join(""):"";
 if(k!=lastKey){lastKey=k;$("#cap").innerHTML=g?g.words.map(w=>`<span class="${t>=w.s&&t<w.e?"on":""}">${esc(S.st.upper?w.t.toUpperCase():w.t)}</span>`).join(" "):""}
 $("#head").style.left=`calc(84px + (100% - 98px) * ${t/S.dur})`;$("#seek").value=t/S.dur*1000;$("#tc").textContent=fmt(t);
 $("#pp").setAttribute("d",v.paused?"M7 5v14l12-7z":"M6 5h4v14H6zM14 5h4v14h-4z");requestAnimationFrame(paint)}

$("#export").onclick=async e=>{const b=e.target;if(!G.length)return toast("Generate captions first",1);
 const[W,H]=RAT[S.ratio];busy(b,1);toast("Rendering… this can take a minute");
 const r=await api("/api/export",{id:S.id,dur:S.dur,audio:S.audio,W,H,fit:S.fit,style:S.st,groups:G,
  cuts:S.cutOn?S.cuts.filter(c=>c.on).map(c=>[c.s,c.e]):[]}).catch(()=>({error:"Server error"}));busy(b,0);
 if(r.error)return toast("Export failed: "+r.error.slice(-120),1);
 const a=document.createElement("a");a.href=r.url;a.download="captionforge_"+S.ratio.replace(":","x")+".mp4";a.click();toast("Exported")};
