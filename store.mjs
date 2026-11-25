let memoryOnly=false;
const transient=new Map();
export const isTemporary=()=>memoryOnly;
const dbp=new Promise((resolve,reject)=>{
 const req=indexedDB.open('quezhang-journal',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('rounds',{keyPath:'id'});
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
}).catch(()=>{memoryOnly=true;return null});
export async function allRecords(){
 const db=await dbp;if(!db)return [...transient.values()].sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)||b.created-a.created);return new Promise((resolve,reject)=>{
  const request=db.transaction('rounds').objectStore('rounds').getAll();
  request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)||b.created-a.created));request.onerror=()=>reject(request.error);
 });
}
export async function mergeRecords(rows){
 const db=await dbp;if(!db){let added=0;for(const row of rows)if(!transient.has(row.id)){transient.set(row.id,row);added++}return added}return new Promise((resolve,reject)=>{
  const tx=db.transaction('rounds','readwrite'),table=tx.objectStore('rounds');let added=0;
  const unique=new Map(rows.map(r=>[r.id,r]));
  for(const row of unique.values()){
   const req=table.getKey(row.id);req.onsuccess=()=>{if(req.result===undefined){table.add(row);added++}};
  }
  tx.oncomplete=()=>resolve(added);tx.onabort=tx.onerror=()=>reject(tx.error);
 });
}
export async function removeRecord(id){
 const db=await dbp;if(!db){transient.delete(id);return}return new Promise((resolve,reject)=>{const tx=db.transaction('rounds','readwrite');tx.objectStore('rounds').delete(id);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error)});
}
export const marker='--- 雀帳資料 v1 ---';
export function pack(rows){
 const titles={win:'胡牌',self:'自摸',loss:'放槍',pay:'被自摸',draw:'流局',neutral:'未收付',manual:'快速記帳'};
 return '雀帳｜台灣麻將牌局手帳\n'+rows.map(r=>r.date+' '+r.time+'　'+titles[r.mode]+'　'+r.tai+' 台　底 '+r.base+'／台 '+r.unit+'　NT$ '+r.amount+'　點數 '+(r.points??'未記')).join('\n')+'\n\n'+marker+'\n'+JSON.stringify({format:'quezhang',version:1,rounds:rows},null,2);
}
const finite=(n,max=1e13)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=max;
const short=(s,n)=>typeof s==='string'&&s.length<=n;
export function unpack(text){
 const i=text.indexOf('\n'+marker+'\n');if(i===-1)throw Error('找不到雀帳格式標記，請選擇由雀帳匯出的 TXT 檔。');
 let data;try{data=JSON.parse(text.slice(i+marker.length+2))}catch{throw Error('檔案資料不完整，請重新選擇原始備份。')}
 if(data?.format!=='quezhang'||data.version!==1||!Array.isArray(data.rounds))throw Error('這份備份的版本或格式無法辨識。');
 for(const r of data.rounds){
  if(!r||!short(r.id,100)||!r.id||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)||!['win','self','loss','pay','neutral','draw','manual'].includes(r.mode)||![r.amount,r.tai,r.base,r.unit,r.created].every(x=>finite(x,1e15))||[r.tai,r.base,r.unit].some(x=>x<0)||!(r.points===null||finite(r.points))||!short(r.note,1000)||!(r.photo===''||short(r.photo,6000000)&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(r.photo))||!Array.isArray(r.lines)||!r.lines.every(x=>x&&short(x.name,100)&&finite(x.tai))||!Array.isArray(r.notes)||!r.notes.every(x=>x&&short(x.name,100)&&short(x.why,300))||!Array.isArray(r.rows)||!r.rows.every(x=>x&&short(x.label,100)&&[x.n,x.tai,x.each,x.extra].every(y=>finite(y))))throw Error('備份內有無效的牌局資料，這次未匯入任何紀錄。');
 }
 return data.rounds;
}
export function download(rows,name){
 const url=URL.createObjectURL(new Blob(['\uFEFF',pack(rows)],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
export async function preparePhoto(file){
 let source,release=()=>{};
 try{source=await createImageBitmap(file,{imageOrientation:'from-image'});release=()=>source.close()}catch{
  const url=URL.createObjectURL(file);source=new Image();source.src=url;
  try{await source.decode()}catch{throw Error('無法讀取這張照片，請改選 JPEG、PNG 或 WebP 圖片。')}finally{URL.revokeObjectURL(url)}
 }
 try{const w=source.width,h=source.height,ratio=Math.min(1,1280/Math.max(w,h));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.78)}finally{release()}
}
