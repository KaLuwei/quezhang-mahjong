import {blocks,groups,score,settle,defaults,valueOf,modes,analyze,counts,tileNames} from './engine.mjs';
import {icon,esc,face,motif} from './visuals.mjs';
import {allRecords,mergeRecords,removeRecord,isTemporary,download,unpack,preparePhoto} from './store.mjs';

const $=s=>document.querySelector(s),main=$('#main'),dlg=$('#dialog'),modal=$('#modal');
const navigation=[['table','牌桌總覽','dashboard'],['history','牌局紀錄','book'],['hand','聽牌助手','tiles']];
const cash=n=>new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(n);
const signed=n=>(n>0?'+':n<0?'−':'')+cash(Math.abs(n));
const nowParts=()=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
const today=()=>{const d=nowParts();return `${d.year}-${d.month}-${d.day}`};
function prefLoad(){try{return {...defaults,...JSON.parse(localStorage.getItem('quezhang-settings')||'{}')}}catch{return {...defaults}}}
let pref=prefLoad(),records=[],page='',mode='win',picks={},group=0,role='none',streak=0,filter='all',historyDate='',modalType='',attachment='',busy=false,storageBroken=false,backupName='',detailId='',photoLoading=false,photoToken=0;
let hand=[],melds=[],seen=[],entry='hand',suit=0;
let channel=null;
try{if(typeof BroadcastChannel==='function')channel=new BroadcastChannel('quezhang-updates')}catch{}
const toast=(t)=>{const el=$('#toast');(dlg.open?dlg:document.body).append(el);el.textContent=t;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3600)};
const persist=()=>{try{localStorage.setItem('quezhang-settings',JSON.stringify(pref))}catch{toast('瀏覽器無法保存桌規，目前設定仍可使用。')}};
const action=(id,label,ic,cls='plain',extra='')=>`<button type="button" class="${cls}" data-action="${id}" ${extra}>${ic?icon(ic,17):''}${label}</button>`;
const heading=(name,ic)=>`<div class="section-title"><span class="heading-icon">${icon(ic,22)}</span><h2>${name}</h2></div>`;
const field=(label,id,value,attrs='',type='number')=>`<label class="field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
const modeName=r=>r.mode==='manual'?'快速記帳':modes[r.mode];
const modeButtons=()=>Object.entries(modes).map(([id,n])=>`<button type="button" class="${mode===id?'selected':''}" aria-pressed="${mode===id}" data-mode="${id}">${n}</button>`).join('');
const sums=rows=>({amount:rows.reduce((a,b)=>a+b.amount,0),points:rows.reduce((a,b)=>a+(b.points||0),0),win:rows.filter(r=>['win','self'].includes(r.mode)||r.mode==='manual'&&r.amount>0).length,loss:rows.filter(r=>['loss','pay'].includes(r.mode)||r.mode==='manual'&&r.amount<0).length});
function nav(){
 const links=navigation.map(([id,n,ic])=>`<a href="#${id}"${id===page?' class="active" aria-current="page"':''}>${icon(ic,17)}<span>${n}</span></a>`).join('');
 $('.topnav').innerHTML=links;$('.mobile-nav').innerHTML=links+action('files','存檔管理','folder');
}
function statBar(rows,range){
 const t=sums(rows);return `<section class="stats" aria-label="${range}統計">${[
 ['net',range+'淨勝負',`<small>NT$</small> ${signed(t.amount)}`],
 ['layers',range+'局數',`${rows.length} <em>局</em>`],
 ['medal','勝場 / 敗場',`${t.win} <em>/</em> ${t.loss}`],
 ['coin',range+'淨點數',`${signed(t.points)} <em>點</em>`]
 ].map(([ic,n,v])=>`<div class="stat"><span class="stat-ic">${icon(ic,21)}</span><div><div class="stat-name">${n}</div><div class="stat-value">${v}</div></div></div>`).join('')}</section>`;
}
function table(){
 const date=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date());
 main.innerHTML=`<section class="hero"><div class="hero-inner wrap"><div class="hero-copy"><div class="eyebrow"><b></b> TAIWAN MAHJONG</div><h1>牌桌手帳<span class="seal" aria-label="十六張">十六<br>張</span></h1><p>算台、記帳，收好每一局的輸贏。</p><div class="hero-date">${icon('calendar',16)}${date}</div></div><div class="hero-art"><img src="hero.webp" alt="版畫風的紅中、青發、三筒和一枚紅骰子"></div></div></section><div class="wrap body-wrap">${statBar(records.filter(r=>r.date===today()),'今日')}<div class="workspace"><section class="panel calc"><div class="panel-head">${heading('台數積木','layers')}${action('rules','桌規設定','sliders','outline sm')}</div><p class="subcopy">點選本局成立的台型，立即試算台數與金額。</p><div class="field-name">本局結果</div><div class="segments mode-select">${modeButtons()}</div><div class="category-tabs" role="group" aria-label="台型分類">${groups.map((n,i)=>`<button data-group="${i}" class="${group===i?'on':''}" aria-pressed="${group===i}">${n}</button>`).join('')}</div><div id="blocks"></div><div id="pick-detail"></div><details class="dealer"><summary>${icon('sliders',16)} 莊家與連莊設定</summary><div class="two-fields"><label class="field"><span>莊家關係</span><select id="dealerRole"></select></label>${field('連莊次數','streak',streak,'min="0" max="99" step="1" inputmode="numeric"')}</div></details></section><aside class="panel summary"><div class="panel-head">${heading('本局結算','receipt')}</div><div id="amount"></div><div class="two-fields rates">${field('底金（元）','base',pref.base,'min="0" max="1000000" step="1" inputmode="numeric"')}${field('每台（元）','unit',pref.unit,'min="0" max="1000000" step="1" inputmode="numeric"')}</div><div id="settle-detail"></div><div class="save-actions">${action('record','記錄本局','plus','primary wide')}${action('quick','快速輸入金額','edit','text-btn')}</div></aside></div><section class="recent"><div class="row-title"><h2>最近牌局</h2><a href="#history">全部紀錄 ${icon('right',14)}</a></div>${recordList(records.slice(0,3))}</section></div>`;
 syncCalc();
}
function roleOptions(){
 const opts=mode==='self'?[['payer','閒家自摸，莊家付一份'],['winner','莊家自摸']]:[['none',mode==='pay'?'我與自摸者皆為閒家':'閒家對閒家'],['winner','胡牌者坐莊'],['payer',mode==='win'?'放槍者坐莊':'我坐莊付款']];
 if(!opts.some(x=>x[0]===role))role=opts[0][0];
 $('#dealerRole').innerHTML=opts.map(([v,n])=>`<option value="${v}" ${v===role?'selected':''}>${n}</option>`).join('');
}
const getResult=()=>{const s=score(picks,mode,pref);return {...s,...settle(s.tai,mode,role,streak,pref)}};
function syncCalc(){
 if(page!=='table')return;roleOptions();
 const res=getResult(), zero=['draw','neutral'].includes(mode);
 const blocksIn=blocks.filter(b=>b.group===group);
 $('#blocks').innerHTML=zero?`<div class="note-box">${icon('info',17)}${mode==='draw'?'流局':'未參與收付'}以 0 元記入局數，可附照片與備註。</div>`:`<div class="block-grid">${blocksIn.map(b=>{
 const hit=Boolean(picks[b.id]),skipped=res.skipped.includes(b.id),disabled=b.id==='eight'&&!pref.eightFlower||b.id==='seven'&&!pref.sevenFlower||b.id==='river'&&!pref.lastDiscard||['riichi','early','first'].includes(b.id)&&!pref.declared;
 return `<button class="block ${hit?'picked':''} ${skipped?'covered':''}" data-pick="${b.id}" aria-pressed="${hit}" title="${esc(b.desc)}" ${disabled?'disabled':''}>${motif(b.mark)}<span class="block-text"><strong>${b.name}</strong><small>${disabled?'桌規未啟用':skipped?'不另計':valueOf(b.id,pref)+' 台'+(b.id==='flower'?' / 張':'')}</small></span>${hit?`<span class="tick">${b.id==='flower'?'×'+picks.flower:icon('check',11)}</span>`:''}</button>`}).join('')}</div>`;
 $('#pick-detail').innerHTML=(Object.keys(picks).length&&!zero?`<div class="pick-info"><span>已選 ${Object.keys(picks).length} 種台型</span>${action('reset-picks','清除選取','reset','text-btn')}</div>`:'')+
 res.notes.map(n=>`<div class="rule-note">${icon('info',15)}<span><b>${n.name}</b> · ${n.why}</span></div>`).join('');
 const commonExtra=res.rows.length===1?res.rows[0].extra:0;
 $('#amount').innerHTML=`<div class="total-box"><div class="total-line"><span>預估淨勝負</span><span class="count-tag">${res.tai+commonExtra} 台${res.rows.length>1?'起':''}</span></div><div class="money ${res.amount<0?'negative':''}"><small>NT$</small> ${signed(res.amount)}</div></div>`;
 $('#settle-detail').innerHTML=`<div class="breakdown"><div class="mini-header">計台明細</div>${res.lines.length?res.lines.map(x=>`<div><span>${x.name}</span><b>${x.tai} 台</b></div>`).join(''):`<div><span>${zero?'本局無收付':'基本胡牌'}</span><b>0 台</b></div>`}${res.rows.some(x=>x.extra)?`<div><span>莊家${streak?'及連莊':''}加台${res.rows.length>1?'（一份）':''}</span><b>${res.dealerTai} 台</b></div>`:''}</div>${res.rows.length?`<div class="formula">${res.rows.map(x=>`${x.label}　(${cash(pref.base)} + ${x.tai} × ${cash(pref.unit)})${x.n>1?' × '+x.n:''} = ${cash(x.each*x.n)}`).join('<br>')}</div>`:''}`;
 $('.dealer').hidden=zero||!pref.dealer;$('#streak').disabled=role==='none';
}
function recordList(rows){
 return rows.length?`<div class="record-list">${rows.map(r=>`<button data-detail="${esc(r.id)}" class="record-row"><span class="round-ic ${r.amount<0?'loss':''}">${icon(r.photo?'image':'receipt',19)}</span><span class="record-text"><strong>${esc(modeName(r))} <small>${r.tai} 台</small></strong><span>${esc(r.date)}　${esc(r.time)}${r.note?' · '+esc(r.note):''}</span></span><b class="${r.amount<0?'negative':''}">NT$ ${signed(r.amount)}</b>${icon('right',15)}</button>`).join('')}</div>`:`<div class="empty"><span>${icon('book',26)}</span><div><b>還沒有牌局紀錄</b><p>記下第一局後，就能在這裡查看輸贏與牌面照片。</p></div></div>`;
}
function history(){
 const selected=records.filter(r=>(!historyDate||r.date===historyDate)&&(filter==='all'||filter==='win'&&r.amount>0||filter==='loss'&&r.amount<0||filter==='even'&&r.amount===0));
 main.innerHTML=`<div class="wrap inner-page"><div class="page-heading"><div><div class="eyebrow"><b></b> ROUND HISTORY</div><h1>牌局紀錄</h1><p>依日期翻閱牌面照片、台數與收付明細。</p></div>${action('quick','快速記帳','plus','primary')}</div>${statBar(selected,historyDate||filter!=='all'?'篩選':'累計')}<section class="panel history-panel"><div class="row-title">${heading('收支明細','book')}<span class="muted">${selected.length} 筆</span></div><div class="filter-bar"><div class="chips">${[['all','全部'],['win','贏錢'],['loss','輸錢'],['even','零收付']].map(([k,l])=>`<button class="${filter===k?'active':''}" data-filter="${k}">${l}</button>`).join('')}</div><label>日期 <input type="date" id="historyDate" value="${esc(historyDate)}"></label>${historyDate?action('all-dates','全部日期','','text-btn'):''}</div>${selected.length||!records.length?recordList(selected):'<div class="empty">這個條件下沒有紀錄，請調整日期或收付篩選。</div>'}</section></div>`;
}
function render(){
 const hash=location.hash.slice(1);page=navigation.some(n=>n[0]===hash)?hash:'table';nav();if(page==='table')table();else if(page==='history')history();else renderHand();
 if(isTemporary())main.insertAdjacentHTML('afterbegin','<div class="errorbar">目前使用暫存模式，關閉前請到「存檔管理」匯出文字檔以保留紀錄。</div>');
 if(storageBroken)main.insertAdjacentHTML('afterbegin','<div class="errorbar">此瀏覽器無法開啟本機資料庫，請允許網站儲存資料後重新整理。</div>');
}
async function refresh(){records=await allRecords();render()}
window.addEventListener('hashchange',()=>{if(dlg.open)dlg.close();window.scrollTo({top:0});render()});
channel?.addEventListener('message',()=>{refresh().catch(()=>toast('更新紀錄失敗，請重新整理。'))});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!dlg.open)refresh().catch(()=>{})});
function show(title,body,type,ic){
 modalType=type;modal.innerHTML=`<div class="modal-head">${heading(title,ic)}${action('close','','close','icon-button','aria-label="關閉"')}</div>${body}`;
 if(!dlg.open)dlg.showModal();dlg.scrollTop=0;
}
dlg.addEventListener('click',e=>{if(e.target===dlg&&!busy)dlg.close()});
dlg.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
dlg.addEventListener('close',()=>{photoToken++;photoLoading=false;attachment='';modalType=''});
const ruleToggles=[['eightFlower','八仙過海','集齊八花，以 8 台自摸結算，莊家台依本桌設定。'],['sevenFlower','七搶一','七花搶一花，按一人付一底八台。莊家台依本桌設定。'],['combinePong','字一色、五暗刻可另計碰碰胡','開啟後，另選碰碰胡積木可加 4 台。'],['combineWait','全求人可另計獨聽','開啟後，另選獨聽積木可加 1 台。'],['closedBonus','門清一摸三','門清自摸合計 3 台。關閉時門清與自摸各 1 台。'],['flatSelf','平胡可自摸','允許符合平胡牌型的自摸另計平胡。'],['dealer','莊家台','只有與莊家有關的付款加計莊家及連莊台。'],['pull','連莊加拉莊','每連一次加 2 台。關閉時每次加 1 台。'],['lastDiscard','河底撈魚','胡最後一張捨牌可加 1 台。'],['declared','報聽、地聽與天聽','開啟宣告聽牌台，三種以最高一項計算。']];
function showRules(){
 show('桌規設定',`<form id="rulesForm"><p class="modal-intro">依開桌約定選擇算法，設定會套用到之後記錄的牌局。</p><label class="field"><span>台數基準</span><select id="profile"><option value="common">常用台數（逗陣打麻將）</option><option value="north">台北台數（土撥鼠）</option></select></label><p class="tiny-help">四暗刻／小四喜／大四喜／字一色：常用為 5／8／16／16 台，台北為 4／4／8／8 台。</p><div class="toggle-list">${ruleToggles.map(([id,n,d])=>`<label class="toggle"><span><b>${n}</b><small>${d}</small></span><input type="checkbox" name="${id}" ${pref[id]?'checked':''}><i></i></label>`).join('')}</div><details class="ref"><summary>台型說明與規則來源</summary><p>選取本局成立的台型。重疊台型依上述開關計算。正花每張 1 台，點選可在 0、1、2 張間切換。</p><ul>${blocks.map(b=>`<li><b>${b.name}</b>　${b.desc}</li>`).join('')}</ul><a href="https://letsmj.com/tai" target="_blank" rel="noopener">逗陣打麻將｜十六張算台教學</a><a href="https://www.gogogame.com.tw/htm/rule_3000.html" target="_blank" rel="noopener">土撥鼠｜十六張麻將台北台</a><a href="https://www.itaiwanmj.app/itwmj16/?story=482" target="_blank" rel="noopener">愛台灣打麻將｜花胡規則</a></details><button class="primary wide">${icon('check',17)}套用桌規</button></form>`,'rules','sliders');$('#profile').value=pref.profile;
}
function recordForm(quick=false){
 if(!quick&&!validRates())return;
 attachment='';photoToken++;photoLoading=false;
 const res=getResult(),d=nowParts(),n=quick?'快速記帳':'記錄本局';
 show(n,`<form id="recordForm"><div class="recap">${quick?'直接記下這局的收付金額與台數。':`<span>${modes[mode]} · ${res.tai+(res.rows.length===1?res.rows[0].extra:0)} 台${res.rows.length>1?'起':''}</span><strong>NT$ ${signed(res.amount)}</strong>`}</div>${quick?`<div class="two-fields"><label class="field"><span>收付方向</span><select id="direction"><option value="1">贏錢</option><option value="-1">輸錢</option><option value="0">零收付</option></select></label>${field('實際金額（元）','manualAmount','','min="0" max="1000000000" step="1" required inputmode="numeric"')}</div><div class="two-fields">${field('本局台數','manualTai',0,'min="0" max="999" step="1" required')}${field('每台（元）','manualUnit',pref.unit,'min="0" max="1000000" step="1" required')}</div>${field('底金（元）','manualBase',pref.base,'min="0" max="1000000" required')}`:''}<div class="two-fields">${field('牌局日期','recordDate',today(),'required','date')}${field('時間','recordTime',d.hour+':'+d.minute,'required','time')}</div>${field('另記點數（選填，可填負數）','points','','min="-1000000000" max="1000000000" step="1" placeholder="例如 −20"')}<label class="field"><span>備註（選填）</span><input id="note" maxlength="1000" placeholder="牌友、地點或本局特別之處"></label><div class="field-name">牌面照片</div><div id="attach"></div><div class="photo-actions"><label class="outline">${icon('camera',17)} 拍照<input type="file" id="capture" accept="image/*" capture="environment" class="file-input"></label><label class="outline">${icon('image',17)} 選擇照片<input type="file" id="gallery" accept="image/*" class="file-input"></label></div><button id="saveRecord" class="primary wide">${icon('save',17)}儲存這一局</button></form>`,quick?'quick':'record','book');
}
function validRates(){
 for(const id of ['base','unit','streak']){const el=$('#'+id);if(el&&!el.disabled&&(el.value===''||!el.checkValidity())){el.setCustomValidity('請輸入範圍內的整數');el.reportValidity();el.setCustomValidity('');return false}}
 return true;
}
async function saveRecord(){
 if(busy||photoLoading)return;const quick=modalType==='quick',res=getResult(),points=$('#points').value;
 const row={id:typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('-'),created:Date.now(),date:$('#recordDate').value,time:$('#recordTime').value,note:$('#note').value.trim(),points:points===''?null:Number(points),photo:attachment,mode:quick?'manual':mode,amount:quick?Number($('#manualAmount').value)*Number($('#direction').value):res.amount,tai:quick?Number($('#manualTai').value):res.tai+(res.rows.length===1?res.rows[0].extra:0),base:quick?Number($('#manualBase').value):pref.base,unit:quick?Number($('#manualUnit').value):pref.unit,lines:quick?[]:res.lines,notes:quick?[]:res.notes,rows:quick?[]:res.rows,rules:{...pref},selections:quick?{}:{...picks},role:quick?'':role,streak:quick?0:streak};
 busy=true;$('#saveRecord').disabled=true;
 try{await mergeRecords([row]);if(!quick){picks={};mode='win';group=0;role='none'}await refresh();channel?.postMessage('update');dlg.close();toast(isTemporary()?'已暫存這一局，請匯出文字檔備份':'已儲存這一局')}catch{toast('沒有存入紀錄。請確認瀏覽器儲存空間後重試。');$('#saveRecord').disabled=false}finally{busy=false}
}
function showFiles(){
 show('存檔管理',`<p class="modal-intro">本機目前有 <b>${records.length}</b> 筆紀錄。文字備份包含勝負、台數、底台、點數、備註及照片。</p><div class="file-options"><div>${icon('download',22)}<span><b>匯出文字檔</b><small>下載全部牌局，可在其他裝置繼續使用。</small></span>${action('export','匯出','','outline sm')}</div><div>${icon('upload',22)}<span><b>讀取舊檔</b><small>將舊紀錄加入本機，相同牌局只保留一筆。</small></span><label class="outline sm">讀檔<input type="file" id="importFile" accept=".txt,text/plain" class="file-input"></label></div><div>${icon('folder',22)}<span><b>續存到舊紀錄</b><small>選擇舊檔，合併本機紀錄後下載完整新版。</small></span><label class="outline sm">合併<input type="file" id="appendFile" accept=".txt,text/plain" class="file-input"></label></div></div><p class="tiny-help">紀錄保存在目前瀏覽器。更換裝置或清除瀏覽資料前，請先匯出 TXT。</p><div id="importStatus" role="status"></div>`,'files','folder');
}
function detail(id){
 const r=records.find(x=>x.id===id);if(!r)return;detailId=id;
 show('牌局明細',`<div class="recap"><b>${modeName(r)}</b><strong>NT$ ${signed(r.amount)}</strong></div><dl class="details-grid">${[['時間',r.date+' '+r.time],['胡牌台數',r.tai+' 台'+(r.rows.length>1?'起':'')],['底金 / 每台','NT$ '+cash(r.base)+' / '+cash(r.unit)],['另記點數',r.points===null?'未填寫':signed(r.points)]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${r.lines.length?`<div class="detail-section"><b>計台明細</b><p>${r.lines.map(x=>esc(x.name)+' '+x.tai+' 台').join('、')}</p></div>`:''}${r.notes.map(x=>`<div class="rule-note">${icon('info',15)}${esc(x.name)} · ${esc(x.why)}</div>`).join('')}${r.rows.length?`<div class="detail-section"><b>付款明細</b>${r.rows.map(x=>`<p>${esc(x.label)} · ${x.tai} 台 · NT$ ${cash(x.each)} × ${x.n}</p>`).join('')}</div>`:''}${r.note?`<div class="detail-section"><b>備註</b><p>${esc(r.note)}</p></div>`:''}${r.photo?`<img class="round-photo" src="${r.photo}" alt="這一局的牌面照片">`:''}<div class="modal-footer">${action('ask-delete','刪除紀錄','trash','text-btn danger')}${action('close','完成','','outline')}</div>`,'detail','receipt');
}


const entryNames={hand:'手牌',chi:'吃',pon:'碰',kan:'槓',seen:'已知明牌'};
function tileButton(t,data,extra='',disabled=false){
 return `<button type="button" class="mahjong ${extra}" ${data} aria-label="${esc(tileNames[t])}" title="${esc(tileNames[t])}" ${disabled?'disabled':''}>${face(t)}</button>`;
}
function handAnalysis(){
 const result=analyze(hand,melds,seen);
 const waitLine=list=>list.map(x=>`<span class="wait-chip">${face(x.tile)}<span>${tileNames[x.tile]}<small>${x.left} 張</small></span></span>`).join('');
 if(result.type==='short')return `<div class="hand-empty">${icon('tiles',33)}<b>再加入 ${result.need} 張手牌</b><p>滿 16 張分析聽牌，滿 17 張列出可聽牌的捨牌。</p></div>`;
 if(result.type==='wait'){
 const num=result.list.reduce((s,x)=>s+x.left,0);
 return result.list.length?`<div class="analysis-title">已聽 ${result.list.length} 種牌 <span>最多 ${num} 張</span></div><div class="waits">${waitLine(result.list)}</div>`:'<div class="hand-empty"><b>這副手牌尚未聽牌</b><p>加入下一張摸牌，可查看有哪些捨牌能進聽。</p></div>';
 }
 return `${result.won?'<div class="win-status">可以胡牌 · 五組面子、一對將</div>':''}${result.list.length?`<p class="subcopy">依可胡的剩餘張數排序，點選「打出」可查看捨牌後的手牌。</p>${result.list.map(x=>`<div class="discard-row"><div>${tileButton(x.drop,`data-drop="${x.drop}"`)}<b>打${tileNames[x.drop]}</b><small>${x.waits.length} 種 · 最多 ${x.total} 張</small>${action('play','打出','','outline sm',`data-value="${x.drop}"`)}</div><div class="waits">${waitLine(x.waits)}</div></div>`).join('')}`:'<div class="hand-empty"><b>目前沒有一打即聽的選擇</b><p>點手中的牌可移除它，再加入其他牌分析。</p></div>'}`;
}
function renderHand(){
 const n=hand.length+3*melds.length,available=counts([...hand,...seen,...melds.flat()]),ids=Array.from({length:suit===3?7:9},(_,i)=>suit*9+i);
 main.innerHTML=`<div class="wrap inner-page"><div class="page-heading"><div><div class="eyebrow"><b></b> HAND ANALYZER</div><h1>聽牌助手</h1><p>點牌輸入十六張手牌，查看胡哪張、還有幾張。</p></div>${action('example','載入牌例','tiles','outline')}</div><div class="hand-layout"><section class="panel hand-panel"><div class="panel-head">${heading('我的手牌','tiles')}<span class="count-tag">${n} / 17 張</span></div><div class="hand-rack">${hand.length?[...hand].sort((a,b)=>a-b).map(t=>tileButton(t,`data-remove="${t}"`)).join(''):'<span>從下方牌庫點選你的手牌</span>'}</div>${melds.length?`<div class="tile-groups"><b>副露</b>${melds.map((m,i)=>`<button data-meld="${i}" title="移除此組副露">${m.map(t=>face(t)).join('')}</button>`).join('')}</div>`:''}${seen.length?`<div class="tile-groups"><b>已知明牌</b>${seen.map(t=>tileButton(t,`data-unsee="${t}"`)).join('')}</div>`:''}<div class="rack-foot"><small>點選已加入的牌可移除</small>${action('clear-hand','清空','reset','text-btn')}</div><div class="field-name">輸入位置</div><div class="segments">${Object.entries(entryNames).map(([k,l])=>`<button data-entry="${k}" class="${entry===k?'selected':''}">${l}</button>`).join('')}</div><div class="category-tabs">${['萬子','筒子','條子','字牌'].map((n,i)=>`<button data-suit="${i}" class="${i===suit?'on':''}">${n}</button>`).join('')}</div><div class="palette">${ids.map(t=>{
 const adding=entry==='chi'?[t,t+1,t+2]:entry==='pon'?[t,t,t]:entry==='kan'?[t,t,t,t]:[t];
 const a=counts(adding),bad=(entry==='chi'&&(t>=27||t%9>6))||a.some((v,i)=>v+available[i]>4)||(entry==='hand'&&n>=17)||(['chi','pon','kan'].includes(entry)&&(n+3>17||melds.length>=5));
 return `<div>${tileButton(t,`data-add="${t}"`,'',bad)}<small>${tileNames[t]}</small></div>`}).join('')}</div><p class="tiny-help">${entry==='chi'?'點選順子的第一張牌，一次加入連續三張。':entry==='pon'||entry==='kan'?'點選牌面，一次加入整組。每組槓在手牌張數中視為三張。':entry==='seen'?'加入牌河或別家的明牌，系統會從可胡張數中扣除。':'花牌請先補牌，僅輸入補牌後的手牌。'}</p></section><section class="panel analysis"><div class="panel-head">${heading('聽牌分析','layers')}</div>${handAnalysis()}<p class="analysis-note">${icon('info',16)}<span>以五組面子加一對將判斷。剩餘張數已扣除手牌、副露與輸入的明牌，實際牌牆可能更少。</span></p></section></div></div>`;
}
function addTile(t){
 if(entry==='hand')hand.push(t);
 else if(entry==='seen')seen.push(t);
 else melds.push(entry==='chi'?[t,t+1,t+2]:Array(entry==='pon'?3:4).fill(t));
 renderHand();
}
function play(t){hand.splice(hand.indexOf(t),1);seen.push(t);renderHand()}
function loadExample(){hand=[0,1,2,3,4,5,11,12,13,19,20,21,31,31,6,7];melds=[];seen=[];entry='hand';suit=0;renderHand();toast('已載入 16 張三面聽牌例')}
function fileName(){return backupName||'雀帳-'+today()+'.txt'}
async function importBackup(file,append){
 if(!file)return;if(busy)return;busy=true;const status=$('#importStatus');status.textContent='正在讀取備份…';
 try{
 const rows=unpack(await file.text());const added=await mergeRecords(rows);backupName=file.name.replace(/\.txt$/i,'')+'.txt';await refresh();channel?.postMessage('update');
 if(append)download(records,backupName);
 status.textContent=`已加入 ${added} 筆，略過 ${rows.length-added} 筆重複紀錄。${append?'已下載合併後的完整文字檔。':''}`;toast(append?'已合併並匯出新版':'已完成讀檔');
 }catch(e){status.textContent=e.message||'讀取失敗，請再試一次。'}finally{busy=false}
}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
 if(d.mode){if(mode!==d.mode)role=d.mode==='self'?'payer':'none';mode=d.mode;$('.mode-select').innerHTML=modeButtons();syncCalc();return}
 if(d.group!==undefined){group=Number(d.group);$('.calc .category-tabs').querySelectorAll('button').forEach((x,i)=>{x.classList.toggle('on',i===group);x.setAttribute('aria-pressed',i===group)});syncCalc();return}
 if(d.pick){const k=d.pick;if(k==='flower'){picks[k]=((picks[k]||0)+1)%3;if(!picks[k])delete picks[k]}else if(picks[k])delete picks[k];else picks[k]=1;syncCalc();return}
 if(d.filter){filter=d.filter;history();return}
 if(d.detail){detail(d.detail);return}
 if(d.add!==undefined){addTile(+d.add);return}
 if(d.remove!==undefined){hand.splice(hand.indexOf(+d.remove),1);renderHand();return}
 if(d.unsee!==undefined){seen.splice(seen.indexOf(+d.unsee),1);renderHand();return}
 if(d.meld!==undefined){melds.splice(+d.meld,1);renderHand();return}
 if(d.suit!==undefined){suit=+d.suit;renderHand();return}
 if(d.entry){entry=d.entry;renderHand();return}
 if(d.drop!==undefined){play(+d.drop);return}
 switch(d.action){
 case 'rules':showRules();break;
 case 'reset-picks':picks={};syncCalc();break;
 case 'record':recordForm();break;
 case 'quick':recordForm(true);break;
 case 'close':if(!busy)dlg.close();break;
 case 'files':showFiles();break;
 case 'export':download(records,fileName());toast('已匯出文字備份');break;
 case 'all-dates':historyDate='';history();break;
 case 'remove-photo':photoToken++;photoLoading=false;attachment='';$('#attach').innerHTML='';$('#saveRecord').disabled=false;break;
 case 'ask-delete':show('刪除這筆紀錄？',`<p>這一局的收付與照片將從本機移除。</p><div class="modal-footer">${action('back-detail','保留紀錄','','outline')}${action('delete','刪除這一局','trash','destructive')}</div>`,'delete','trash');break;
 case 'back-detail':detail(detailId);break;
 case 'delete':
  if(busy)break;busy=true;
  try{await removeRecord(detailId);await refresh();channel?.postMessage('update');dlg.close();toast('已刪除紀錄')}catch{toast('刪除失敗，請再試一次')}finally{busy=false}break;
 case 'clear-hand':hand=[];melds=[];seen=[];renderHand();break;
 case 'example':if(hand.length||seen.length||melds.length)show('載入示範牌例？',`<p>目前輸入的手牌將替換為一副十六張聽牌範例。</p><div class="modal-footer">${action('close','保留手牌','','outline')}${action('confirm-example','載入牌例','','primary')}</div>`,'example','tiles');else loadExample();break;
 case 'confirm-example':dlg.close();loadExample();break;
 case 'play':play(+d.value);break;
 }
});
document.addEventListener('input',e=>{
 const el=e.target;if(['base','unit','streak'].includes(el.id)&&el.value!==''&&el.validity.valid){
  if(el.id==='streak')streak=+el.value;else {pref[el.id]=+el.value;persist()}syncCalc();
 }
});
document.addEventListener('change',async e=>{
 const el=e.target;
 if(el.id==='dealerRole'){role=el.value;syncCalc();return}
 if(el.id==='historyDate'){historyDate=el.value;history();return}
 if(el.id==='direction'){const zero=el.value==='0';$('#manualAmount').disabled=zero;if(zero)$('#manualAmount').value=0;return}
 if(el.id==='importFile'||el.id==='appendFile'){await importBackup(el.files[0],el.id==='appendFile');el.value='';return}
 if(el.id==='capture'||el.id==='gallery'){
  const file=el.files[0];if(!file)return;const token=++photoToken;photoLoading=true;$('#saveRecord').disabled=true;$('#attach').textContent='照片處理中…';
  try{const img=await preparePhoto(file);if(token!==photoToken)return;attachment=img}
  catch(err){if(token===photoToken)toast(err.message)}
  finally{if(token===photoToken){photoLoading=false;$('#saveRecord').disabled=false;$('#attach').innerHTML=attachment?`<img src="${attachment}" class="attach-preview" alt="待儲存的牌面照片">${action('remove-photo','移除照片','','text-btn')}`:''}el.value=''}
 }
});
document.addEventListener('submit',async e=>{
 e.preventDefault();if(e.target.id==='rulesForm'){pref.profile=$('#profile').value;for(const [id] of ruleToggles)pref[id]=e.target.elements[id].checked;persist();dlg.close();render();toast('已套用桌規');return}
 if(e.target.id==='recordForm')await saveRecord();
});
document.querySelectorAll('[data-icon]').forEach(el=>el.outerHTML=icon(el.dataset.icon,18));
render();refresh().catch(()=>{storageBroken=true;render()});
let day=today();setInterval(()=>{if(today()!==day){day=today();render()}},60000);

