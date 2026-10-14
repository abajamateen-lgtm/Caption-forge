/* Passes an exported video from Motion Studio to the caption editor (same origin, via IndexedDB). */
const Handoff=(()=>{const DB='cf-handoff',ST='files';
 const open=()=>new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 return{
  async put(blob,name){const db=await open();return new Promise((res,rej)=>{const tx=db.transaction(ST,'readwrite');tx.objectStore(ST).put({blob,name,t:Date.now()},'last');tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})},
  async take(){const db=await open();const rec=await new Promise((res,rej)=>{const tx=db.transaction(ST,'readwrite'),os=tx.objectStore(ST),g=os.get('last');g.onsuccess=()=>{os.delete('last');res(g.result)};g.onerror=()=>rej(g.error)});
   return rec&&rec.blob?new File([rec.blob],rec.name||'motion.webm',{type:rec.blob.type||'video/webm'}):null}}})();
