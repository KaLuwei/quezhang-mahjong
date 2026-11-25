import {tileNames} from './engine.mjs';
const paths={
 dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
 book:'<path d="M5 4h14a1 1 0 0 1 1 1v16H6a3 3 0 0 1-3-3V7a3 3 0 0 1 2-3Z"/><path d="M3 18c0-2 2-3 4-3h13M8 4v11m3-7h5"/>',
 tiles:'<rect x="9" y="3" width="11" height="16" rx="2" transform="rotate(8 14 11)"/><path d="m6 7-2 1-1 11 2 2 9 1 2-2m-2-13v7m-2-5h4v3h-4z"/>',
 folder:'<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/><path d="M3 9h18"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 10h18m-13 4h2m4 0h2"/>',
 net:'<path d="M3 17 9 11l4 4 8-9m-6 0h6v6"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 medal:'<circle cx="12" cy="9" r="6"/><path d="m8 14-2 7 6-3 6 3-2-7"/>',
 coin:'<ellipse cx="10" cy="7" rx="7" ry="3"/><path d="M3 7v4c0 2 3 3 7 3m-7-3v4c0 2 3 3 7 3"/><ellipse cx="16" cy="14" rx="5" ry="2.5"/><path d="M11 14v4c0 3.5 10 3.5 10 0v-4"/>',
 sliders:'<path d="M3 7h5m4 0h9M3 17h9m4 0h5"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/>',
 receipt:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM8 8h8m-8 4h8"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>', check:'<path d="m4 12 5 5L20 6"/>',
 save:'<path d="M4 3h13l4 4v14H3V4zM7 3v6h9V3m-9 18v-8h10v8"/>',camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v1"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',edit:'<path d="m4 17-1 4 5-1L20 8l-4-4zM14 6l4 4"/>',
 right:'<path d="m9 5 7 7-7 7"/>', reset:'<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',trash:'<path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15m-8 4v7m4-7v7"/>', image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 18 5-5 3 2 4-6 6 8"/>',
};
export const icon=(name,size=20)=>'<svg class="icon" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||'')+'</svg>';
export const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const red='#ac4333',green='#246246',navy='#2f4349';
export function face(id){
 const suit=Math.floor(id/9),n=id%9+1;
 const text=(v,y,color,size)=>'<text x="18" y="'+y+'" text-anchor="middle" fill="'+color+'" font-family="Songti TC,Noto Serif CJK TC,serif" font-weight="bold" font-size="'+size+'">'+v+'</text>';
 let art='';
 if(id>=27){const vals=['東','南','西','北','中','發',''];art=id===33?'<rect x="8" y="7" width="20" height="28" rx="1" fill="none" stroke="#436a87" stroke-width="2.5"/>'+ '<rect x="10" y="9" width="16" height="24" fill="none" stroke="#436a87"/>':text(vals[id-27],31,id===31?red:id===32?green:navy,29)}
 else if(suit===0)art=text('一二三四五六七八九'[n-1],18,navy,17)+text('萬',36,red,19);
 else {
  const pos=[[],[[18,21]],[[13,13],[23,29]],[[10,10],[18,21],[26,32]],[[11,12],[25,12],[11,30],[25,30]],[[9,9],[27,9],[18,21],[9,33],[27,33]],[[11,9],[25,9],[11,21],[25,21],[11,33],[25,33]],[[9,8],[18,12],[27,16],[11,23],[25,23],[11,34],[25,34]],[[10,7],[26,7],[10,16],[26,16],[10,26],[26,26],[10,35],[26,35]],[[8,9],[18,9],[28,9],[8,21],[18,21],[28,21],[8,33],[18,33],[28,33]]][n];
  if(suit===2&&n===1){art='<path d="M5 34q7-1 10-16 2-8 8-7 7 1 8 5l-5 1q-1 15-13 14l-6 6 4-8z" fill="'+green+'"/><path d="m10 28 11-10-4 9z" fill="#d9b85f"/><circle cx="24" cy="14" r="1.3" fill="#fff"/><path d="m29 15 4 2-4 1" fill="'+red+'"/>'}
  else pos.forEach(([x,y],i)=>{const color=(n===1||n===5&&i===2||n===3&&i===1)?red:(n===2&&i===1||n>5&&i>3)?navy:green;
   art+=suit===1?'<circle cx="'+x+'" cy="'+y+'" r="'+(n===1?11:n>6?3.8:5.2)+'" fill="none" stroke="'+color+'" stroke-width="2.4"/><circle cx="'+x+'" cy="'+y+'" r="'+(n===1?5:n>6?1.6:2.1)+'" fill="'+color+'"/>':'<path d="M'+(x-1)+' '+(y-4)+'q3 3 0 8" fill="none" stroke="'+color+'" stroke-width="3.4"/><path d="M'+(x-3)+' '+(y-4)+'h5m-5 4h5m-5 4h5" stroke="'+color+'" stroke-width="1.3"/>';
  });
 }
 return '<svg viewBox="0 0 36 42" class="tile-face" aria-label="'+esc(tileNames[id])+'" role="img">'+art+'</svg>';
}
export function motif(type){
 const glyph={door:'門',one:'聽',pure:'清',half:'混',kong:'槓'};
 if(glyph[type])return '<span class="motif gly '+type+'">'+glyph[type]+'</span>';
 if(type==='flower')return '<span class="motif floral"><svg viewBox="0 0 32 36" aria-hidden="true"><path d="M15 31q5-11 4-20M14 27q-8-2-9-9 9 1 10 7m1-4q3-10 11-10-1 8-10 11" fill="#386448" stroke="#386448"/><g fill="#ab5545"><circle cx="17" cy="8" r="3.6"/><circle cx="21" cy="6" r="3.6"/><circle cx="24" cy="10" r="3.6"/><circle cx="21" cy="13" r="3.6"/><circle cx="17" cy="12" r="3.6"/></g><circle cx="20" cy="10" r="2" fill="#dec574"/></svg></span>';
 const tile={dots:13,run:19,red:31,green:32,white:33,wind:27,wave:10}[type]??20;
 return '<span class="motif">'+face(tile)+'</span>';
}
