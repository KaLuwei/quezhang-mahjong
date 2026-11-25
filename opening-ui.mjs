import {winds,relations,validDice,playerAt,breakWall,diceEffects} from './opening.mjs';
import {icon,esc} from './visuals.mjs?v=opening1';

const diceLabels=['第一顆','第二顆','第三顆'];
const pips=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
function die(n) {
  return `<span class="real-die ${n===1||n===4?'red-pips':''}" aria-hidden="true">${n?Array.from({length:9},(_,i)=>`<i class="${pips[n].includes(i)?'pip':''}"></i>`).join(''):'<b>?</b>'}</span>`;
}
const roleAt=(o,s)=>relations[(s-o.dealer+4)%4];
const wallName=(o,s)=>`${roleAt(o,s)}（${playerAt(o,s)}）`;

function openingText(o) {
  const w=breakWall(o.dice,o.dealer);
  if(!w)return '';
  return `${o.dice.join('＋')}＝${w.sum} 點，${wallName(o,w.wall)}開門；從${wallName(o,w.first.seat)}右起第 ${w.first.stack} 墩抓。`;
}
function effectsView(o,r) {
  if(!validDice(o.dice))return '填好三顆開門骰後，依本桌啟用的規則自動計台。';
  const fx=diceEffects(o.dice,r);
  const pieces=fx.lines.map(x=>`${x.name} +${x.tai} 台`);
  if(fx.factor>1)pieces.push(`豹子：各家應付台數 ×${fx.factor}，底金照原額`);
  if(!pieces.length)pieces.push(r.diceRed||r.diceRun||r.diceTriple?'本次沒有符合已啟用的骰規。':'本桌尚未啟用骰子加台。');
  return [...pieces,...fx.notes.map(n=>n.name+'：'+n.why)].map(esc).join(' · ');
}
function diagram(o){
 const w=breakWall(o.dice,o.dealer);
 return `<div class="felt-map" aria-label="牌桌座位，由下方起逆時針為抓位東、南、西、北席">${o.seats.map((_,i)=>`<div class="seat seat-${i} ${i===w?.wall?'wall-seat':''}"><small>${winds[i]}席 · ${roleAt(o,i)}</small><b>${esc(playerAt(o,i))}</b>${i===w?.wall?'<em>開門牆</em>':''}</div>`).join('')}<div class="felt-center"><small>開門骰</small><strong>${w?w.sum:'—'}<small> 點</small></strong></div></div>`;
}
function drawView(o){
 const w=breakWall(o.dice,o.dealer);
 if(!w)return '<p class="draw-note">擲開門骰或填入實體骰點後，這裡會標出哪面牌牆、從第幾墩抓。</p>';
 const strip=seat=>{
   const label=esc(wallName(o,seat));
   return `<div class="wall-strip"><small>${label}的視角</small><div class="stack-row" aria-hidden="true">${Array.from({length:18},(_,i)=>{
    const k=18-i,first=w.first.seat===seat&&w.first.stack===k, second=w.second.seat===seat&&w.second.stack===k;
    return `<i class="${first?'first-stack':second?'second-stack':''}">${k}</i>`;
   }).join('')}</div><div class="wall-key"><span>左手</span><span>右手起數</span></div></div>`;
 };
 const walls=[...new Set([w.wall,w.first.seat,w.second.seat])];
 return `<div class="opening-result"><h3>${esc(wallName(o,w.wall))}開門</h3><p>面向該家牌牆，從該家右手邊往左留 ${w.sum} 墩。</p><p><b>第一墩</b>　${esc(wallName(o,w.first.seat))}右起第 ${w.first.stack} 墩<br><b>第二墩</b>　${esc(wallName(o,w.second.seat))}右起第 ${w.second.stack} 墩</p>${walls.map(strip).join('')}<div class="wall-legend"><i></i>第一墩<i></i>第二墩（合計四張）</div></div>`;
}
function drawOrder(o){
 if(!validDice(o.seatDice))return '';
 const sum=o.seatDice.reduce((a,b)=>a+b,0);
 const labels=Array.from({length:4},(_,i)=>{const id=(sum-1+i)%4;return esc(o.names[id].trim()||'玩家'+(id+1))});
 return `抓位骰 ${o.seatDice.join('、')}，共 ${sum} 點。抽牌順序：${labels.join('、')}。`;
}
function physicalSeats(o){
 return `<details id="physical-seats" class="physical-seats"><summary>使用桌上的實體風牌抓位</summary><p class="tiny-help">按原座逆時針填入玩家 1 至 4。從玩家 1 算一，骰點指定誰先抽風牌，再依序抽取。按實際抽到的風牌選座。</p><button data-action="roll-seats" class="outline sm">擲抓位骰</button><p id="seat-order" class="tiny-help" aria-live="polite">${drawOrder(o)}</p><div class="player-fields">${winds.map((w,seat)=>`<label class="field"><span>${w}席</span><select data-set-seat="${seat}">${o.names.map((n,id)=>`<option value="${id}" ${o.seats[seat]===id?'selected':''}>${esc(n.trim()||'玩家'+(id+1))}</option>`).join('')}</select></label>`).join('')}</div></details>`;
}
function openingView(o,r){
 return `<div class="wrap inner-page"><div class="page-heading"><div><div class="eyebrow"><b></b> TABLE SETUP</div><h1>開局助手</h1><p>抓風入座、定莊，照骰點找出第一手牌。</p></div><button class="outline" data-action="rules">${icon('sliders',16)} 桌規設定</button></div><div class="opening-grid"><section class="panel"><div class="section-title"><span class="heading-icon">${icon('tiles')}</span><h2>開局抓位</h2></div><p class="subcopy">填入四位牌友後抽風。以東席為基準，右手是南席，對面是西席，左手是北席。</p><div class="player-fields">${o.names.map((n,i)=>`<label class="field"><span>玩家 ${i+1}</span><input maxlength="24" data-player="${i}" placeholder="玩家${i+1}" value="${esc(n)}"></label>`).join('')}</div><button class="outline wide seat-draw" data-action="draw-seats">${icon('tiles',17)} 四人抽風抓位</button>${physicalSeats(o)}<div id="seat-map">${diagram(o)}</div><label class="field"><span>本局莊家</span><select id="openingDealer">${o.seats.map((_,i)=>`<option value="${i}" ${i===o.dealer?'selected':''}>${winds[i]}席 · ${esc(playerAt(o,i))}</option>`).join('')}</select></label><div class="rack-foot"><small>可約定東席起莊，或由東席擲骰定莊。</small><button class="text-btn" data-action="roll-dealer">擲骰定莊</button></div><p id="dealer-report" class="tiny-help">${validDice(o.dealerDice)?`定莊骰 ${o.dealerDice.join('、')}，${esc(playerAt(o,o.dealer))} 坐莊。`:''}</p></section><section class="panel"><div class="section-title"><span class="heading-icon">${icon('dice')}</span><h2>擲骰開門</h2></div><p class="subcopy">由本局莊家擲三顆骰。用畫面擲骰，或點骰面填入桌上的實際點數。</p><div class="dice-entry">${o.dice.map((n,i)=>`<label><span>${diceLabels[i]}</span>${die(n)}<select data-die="${i}" aria-label="${diceLabels[i]}開門骰"><option value="0">未填</option>${[1,2,3,4,5,6].map(v=>`<option value="${v}" ${v===n?'selected':''}>${v} 點</option>`).join('')}</select></label>`).join('')}</div><div class="dice-actions"><button class="primary" data-action="roll-opening">${icon('dice',18)} 擲開門骰</button><button class="outline" data-action="clear-dice" ${o.dice.some(Boolean)?'':'disabled'}>清除骰點</button></div><div id="wall-result" aria-live="polite">${drawView(o)}</div><div class="dice-effects"><b>本局骰規</b><p>${effectsView(o,r)}</p><button class="text-btn" data-action="dice-rules">設定骰子特別玩法</button></div><a href="#table" class="primary wide">回牌桌計台</a></section></div><details class="dealer opening-ref"><summary>抓牌順序與規則來源</summary><p>本工具採含花牌的 144 張玩法，每面 18 墩，每墩兩張。莊家先拿兩墩，其他人逆時針輪流。每人拿四次共 16 張，莊家再拿一張。只有開門骰會影響本局骰規。</p><a href="https://madestudio.com.tw/zh/games/mahjong-rules/" target="_blank" rel="noopener">Made Studio｜抓位、定莊與開門</a></details></div>`;
}
function diceRuleFields(r) {
 const toggle=(key,label,help)=>`<label class="toggle"><span><b>${label}</b><small>${help}</small></span><input name="${key}" type="checkbox" ${r[key]?'checked':''}><i></i></label>`;
 const number=(key,label)=>`<label class="field"><span>${label}</span><input name="${key}" type="number" ${key==='tripleTai'&&r.tripleMode!=='fixed'?'disabled':''} required min="1" max="99" step="1" value="${r[key]}"></label>`;
 return `<fieldset class="dice-rule-set" id="dice-rule-set"><legend>骰子特別玩法</legend><p class="tiny-help">只看本局的開門骰。流局、未收付及固定八台花胡不套用骰規。</p>${toggle('diceRun','順子','三顆排序後連號，例如 2、4、3。')}${number('runTai','順子加幾台')}${toggle('diceRed','全紅','三顆全為 1 或 4，例如 1、4、1。')}${number('redTai','全紅加幾台')}${toggle('diceTriple','豹子','三顆同點。可選擇台數翻倍或固定加台。')}<label class="field"><span>豹子算法</span><select name="tripleMode">${[['double','台數 ×2'],['treble','台數 ×3'],['fixed','固定加台']].map(([v,n])=>`<option value="${v}" ${v===r.tripleMode?'selected':''}>${n}</option>`).join('')}</select></label><div id="fixed-triple" ${r.tripleMode==='fixed'?'':'hidden'}>${number('tripleTai','豹子固定加幾台')}</div><p class="tiny-help">翻倍涵蓋胡牌、已計骰台與各家自己的莊家台；底金維持原額。</p>${toggle('diceStack','全紅與豹子可併計','關閉時豹子優先。開啟時先加全紅，再套用豹子。')}<a href="https://yuen13.github.io/台灣麻將.html" target="_blank" rel="noopener">參考桌規｜台灣麻將特殊玩法</a></fieldset>`;
}

export {openingText, effectsView, openingView, diceRuleFields, diagram, drawView, drawOrder};
