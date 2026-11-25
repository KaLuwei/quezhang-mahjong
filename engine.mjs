export const modes = {win:'胡牌', self:'自摸', loss:'放槍', pay:'被自摸', draw:'流局', neutral:'未收付'};
export const defaults = {base:100, unit:20, profile:'common', closedBonus:true, flatSelf:false, lastDiscard:false, declared:false, dealer:true, pull:true, combinePong:true, combineWait:true, eightFlower:false, sevenFlower:false};
export const groups = ['常用台型','組合牌型','字牌風牌','特殊胡法'];
// Values and eligibility follow the table profile saved with each entry.
export const blocks = [
 ['closed','門清',1,0,'沒有吃、碰或明槓，可有暗槓。','door'],
 ['single','獨聽',1,0,'只聽一種牌，含邊張、嵌張及單吊。','one'],
 ['flower','正花',1,0,'對到自己花位的花牌，每張一台，最多兩張。','flower'],
 ['flat','平胡',2,0,'全順子、無字無花，且非獨聽。','run'],
 ['pong','碰碰胡',4,0,'五組刻子或槓，另加一對將。','dots'],
 ['half','混一色',4,0,'一種數牌搭配字牌。','half'],
 ['pure','清一色',8,1,'只有一種花色的數牌。','pure'],
 ['honors','字一色',16,1,'全部由風牌及三元牌組成。','wind'],
 ['three','三暗刻',2,1,'手中有三組暗刻或暗槓。','dots'],
 ['four','四暗刻',5,1,'手中有四組暗刻或暗槓。','dots'],
 ['five','五暗刻',8,1,'五組面子都是暗刻或暗槓。','dots'],
 ['red','紅中刻',1,2,'三張紅中或紅中槓。','red'],
 ['green','青發刻',1,2,'三張青發或青發槓。','green'],
 ['white','白板刻',1,2,'三張白板或白板槓。','white'],
 ['seat','門風',1,2,'與胡牌者座位相符的風刻。','wind'],
 ['round','圈風',1,2,'與當圈相符的風刻，可與門風併計。','wind'],
 ['smallDrag','小三元',4,2,'兩組三元刻，另一種三元牌作將。','red'],
 ['bigDrag','大三元',8,2,'中、發、白各成一組刻子或槓。','green'],
 ['smallWind','小四喜',8,2,'三組風刻，第四種風牌作將。','wind'],
 ['bigWind','大四喜',16,2,'東南西北各成一組刻子或槓。','wind'],
 ['sea','海底撈月',1,3,'自摸最後一張可摸的牌。','wave'],
 ['river','河底撈魚',1,3,'胡最後一張打出的牌，依桌規啟用。','wave'],
 ['kong','槓上開花',1,3,'開槓補牌時自摸。','flower'],
 ['rob','搶槓',1,3,'胡別人加槓的牌，按放槍計。','kong'],
 ['allOpen','全求人',2,3,'五組面子全副露，單吊胡別人。','door'],
 ['eight','八仙過海',8,3,'獨自集齊八花，以自摸方式計八台。','flower'],
 ['seven','七搶一',8,3,'七花搶一花，由被搶花者單獨付一底八台。','flower'],
 ['riichi','報聽',1,3,'依約定宣告聽牌後胡牌。','one'],
 ['early','地聽',4,3,'依桌規在第一巡宣告聽牌。','one'],
 ['first','天聽',8,3,'莊家起手捨牌時即宣告聽牌。','one']
].map(([id,name,tai,group,desc,mark])=>({id,name,tai,group,desc,mark}));
const lookup=Object.fromEntries(blocks.map(b=>[b.id,b]));
export function valueOf(id,r){
 const alternate={four:4,honors:8,smallWind:4,bigWind:8};
 return (r.profile==='north' ? alternate[id] : undefined) ?? lookup[id].tai;
}
export function score(picks,mode,r){
 const selected=blocks.filter(b=>picks[b.id]>0), skipped=new Map(), automatic=[];
 const active=id=>Boolean(picks[id])&&!skipped.has(id);
 const omit=(id,why)=>{if(active(id))skipped.set(id,why)};
 const highest=(ids,reason)=>{const top=ids.find(active);if(top)ids.filter(id=>id!==top).forEach(id=>omit(id,lookup[top].name+reason))};
 const self=mode==='self'||mode==='pay';
 if(mode==='draw'||mode==='neutral')return {tai:0,lines:[],skipped:[],notes:[]};
 if(!r.eightFlower)omit('eight','本桌未啟用八仙過海');
 if(!r.sevenFlower)omit('seven','本桌未啟用七搶一');
 if(!self)omit('eight','八仙過海請選自摸或被自摸，以三家付款結算');
 if(self)omit('seven','七搶一由一人付款，請選胡牌或放槍');
 const flowerWin=['eight','seven'].find(active);
 if(flowerWin){
  selected.filter(b=>b.id!==flowerWin).forEach(b=>omit(b.id,'本桌花胡固定八台，不另計手牌台型'));
  const notes=Array.from(skipped,([id,why])=>({id,name:lookup[id].name,why}));
  return {tai:8,lines:[{name:lookup[flowerWin].name,tai:8}],skipped:[...skipped.keys()],notes};
 }
 if(!r.lastDiscard)omit('river','本桌未啟用河底撈魚');
 if(!r.declared)['riichi','early','first'].forEach(id=>omit(id,'本桌未啟用報聽台'));
 if(self){['rob','river','allOpen'].forEach(id=>omit(id,'此台型限胡別人打出的牌'));if(!r.flatSelf)omit('flat','本桌平胡限胡別人打出的牌');}
 else ['sea','kong'].forEach(id=>omit(id,'此台型限自摸'));
 highest(['bigDrag','smallDrag'],'優先計台');
 highest(['bigWind','smallWind'],'優先計台');
 highest(['five','four','three'],'已涵蓋較低暗刻');
 highest(['first','early','riichi'],'與其他宣告聽牌擇一');
 highest(['honors','pure','half'],'與其他花色牌型互斥');
 if(active('bigDrag')||active('smallDrag'))['red','green','white'].forEach(id=>omit(id,'三元牌型已包含三元刻'));
 if(active('bigWind')||active('smallWind'))['seat','round'].forEach(id=>omit(id,'四喜牌型已包含風刻'));
 if(active('pure'))['red','green','white','seat','round','bigDrag','smallDrag','bigWind','smallWind'].forEach(id=>omit(id,'清一色不能含字牌'));
 if(!r.combinePong&&active('five'))omit('pong','五暗刻已包含碰碰胡');
 if(!r.combinePong&&active('honors'))omit('pong','本桌字一色已包含碰碰胡');
 if(active('allOpen')){if(!r.combineWait)omit('single','全求人已包含單吊');omit('closed','全求人必須全副露');['three','four','five'].forEach(id=>omit(id,'全求人不能有暗刻'))}
 if(active('flat')){
   const bad=['pong','three','four','five','single','flower','half','honors','red','green','white','seat','round','bigDrag','smallDrag','bigWind','smallWind','allOpen','kong'].find(active);
   if(bad)omit('flat',lookup[bad].name+'不符合平胡條件');
 }
 if(self && active('closed') && r.closedBonus){
   omit('closed','已併入門清一摸三');automatic.push({name:'門清一摸三',tai:3});
 }else if(self)automatic.push({name:'自摸',tai:1});
 const lines=[...automatic,...selected.filter(b=>active(b.id)).map(b=>({name:b.name+(picks[b.id]>1?' × '+picks[b.id]:''),tai:valueOf(b.id,r)*picks[b.id]}))];
 const notes=Array.from(skipped,([id,why])=>({id,name:lookup[id].name,why}));
 return {tai:lines.reduce((a,b)=>a+b.tai,0),lines,skipped:[...skipped.keys()],notes};
}
export function settle(tai,mode,role,streak,r){
 if(mode==='draw'||mode==='neutral')return {amount:0,rows:[],dealerTai:0};
 const unit=Number(r.unit), base=Number(r.base);
 const dealerTai=r.dealer?1+Number(streak)*(r.pull?2:1):0;
 const row=(label,n,extra)=>({label,n,tai:tai+extra,each:base+(tai+extra)*unit,extra});
 let rows;
 if(mode==='self'&&role!=='winner')rows=[row('兩位閒家',2,0),row('莊家',1,dealerTai)];
 else if(mode==='self')rows=[row('其餘三家',3,dealerTai)];
 else rows=[row(mode==='pay'?'我付給自摸者':mode==='loss'?'我付給胡牌者':'放槍者',1,role==='none'?0:dealerTai)];
 const total=rows.reduce((s,x)=>s+x.each*x.n,0);
 return {amount:['loss','pay'].includes(mode)?-total:total,rows,dealerTai};
}
export const tileNames=['萬','筒','條'].flatMap(suit=>[...'一二三四五六七八九'].map(n=>n+suit)).concat(['東風','南風','西風','北風','紅中','青發','白板']);
export const counts=tiles=>{const a=Array(34).fill(0);tiles.forEach(t=>a[t]++);return a};
export function wins(c, meldCount=0){
 if(c.reduce((a,b)=>a+b,0)!==17-3*meldCount)return false;
 const a=[...c],memo=new Map();
 function sets(){
  const i=a.findIndex(n=>n>0);if(i<0)return true;
  const k=a.join('');if(memo.has(k))return memo.get(k);
  let ok=false;
  if(a[i]>=3){a[i]-=3;ok=sets();a[i]+=3}
  if(!ok&&i<27&&i%9<7&&a[i+1]&&a[i+2]){a[i]--;a[i+1]--;a[i+2]--;ok=sets();a[i]++;a[i+1]++;a[i+2]++}
  memo.set(k,ok);return ok;
 }
 for(let i=0;i<34;i++)if(a[i]>=2){a[i]-=2;const ok=sets();a[i]+=2;if(ok)return true}
 return false;
}
export function waits(c,visible,meldCount,fixedTiles){
 const out=[];
 for(let t=0;t<34;t++)if(c[t]+(fixedTiles?.[t]||0)<4){c[t]++;if(wins(c,meldCount))out.push({tile:t,left:Math.max(0,4-visible[t])});c[t]--}
 return out;
}
export function analyze(hand,melds,seen){
 const fixed=melds.length, c=counts(hand),visible=counts([...hand,...melds.flat(),...seen]),fixedTiles=counts(melds.flat());
 const target=16-fixed*3;
 if(hand.length===target)return {type:'wait',list:waits(c,visible,fixed,fixedTiles)};
 if(hand.length!==target+1)return {type:'short',need:target-hand.length};
 const list=[];
 for(let t=0;t<34;t++)if(c[t]){c[t]--;const w=waits(c,visible,fixed,fixedTiles);c[t]++;if(w.length)list.push({drop:t,waits:w,total:w.reduce((s,x)=>s+x.left,0)})}
 return {type:'discard',won:wins(c,fixed),list:list.sort((a,b)=>b.total-a.total||b.waits.length-a.waits.length||a.drop-b.drop)};
}
