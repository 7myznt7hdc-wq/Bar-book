// Bar Book v16: shopping list, my notes & ratings, practice flashcards. All data stays in localStorage.
Object.assign(ICONS,{list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',star:'<path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.7L12 16.8l-5.2 2.7 1-5.7-4.2-4.1 5.8-.9z"/>',cards:'<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/>',note:'<path d="M5 4h14v10l-6 6H5z"/><path d="M13 20v-6h6M8.5 9h7M8.5 12.5h4"/>',share:'<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',minus:'<path d="M5 12h14"/>'});
const plural=(n,w)=>n+' '+w+(n==1?'':'s');
// resolve a favourites-style key (c:/m:/s:) to a drink object
function drinkByKey(k){const i=k.indexOf(':'),t=k.slice(0,i),v=k.slice(i+1);if(t=='c')return C.find(x=>x.name==v&&!x.mine);if(t=='m')return C.find(x=>x.mine&&x.id==v);if(t=='s'&&typeof SEA!=='undefined'&&SEA){const s=SEA.periods.flatMap(p=>p.specs).find(x=>x.id==v);return s&&{...s,_spec:true}}return null}
const drinkHref=c=>c._spec?'#sspec/'+c.id:link(c);

// ================= 1) SHOPPING LIST =================
const SHK='barbook-shop';
const shopGet=()=>{const o=LSJ(SHK,{})||{};return {items:Array.isArray(o.items)?o.items:[],have:o.have&&typeof o.have=='object'?o.have:{}}};
const shopSave=s=>LSS(SHK,s);
const shopSnap=c=>({k:fkey(c),name:c.name,serves:1,ings:(c.ingredients||[]).map(i=>({item:i.item,ml:i.ml??null,amount:i.amount??''}))});
const onShop=c=>shopGet().items.some(i=>i.k==fkey(c));
function shopAdd(cs){const s=shopGet();let n=0;for(const c of cs){if(c&&!s.items.some(i=>i.k==fkey(c))){s.items.push(shopSnap(c));n++}}shopSave(s);return n}
function shopToggle(c){const s=shopGet(),k=fkey(c);if(s.items.some(i=>i.k==k)){s.items=s.items.filter(i=>i.k!=k);shopSave(s);return false}shopSave(s);shopAdd([c]);return true}
const BOTTLE_G=['Spirits','Liqueurs','Wine, vermouth & beer','Bitters'];
function shopLines(){const s=shopGet(),sh=shelf(),m=new Map();
 for(const it of s.items){const live=drinkByKey(it.k),ings=live?live.ingredients:it.ings||[],name=live?live.name:it.name,mult=Math.max(1,+it.serves||1);
  for(const i of ings){const k=canon(i.item);if(!k)continue;const e=m.get(k)||{k,ml:0,other:[],drinks:new Set()};
   if(i.ml!=null&&isFinite(i.ml))e.ml+=i.ml*mult;else{let a=String(i.amount||'').trim();if(/^\d+(\.\d+)?$/.test(a)&&String(i.item).toLowerCase()!==k.toLowerCase())a+=' '+String(i.item).toLowerCase();if(a)e.other.push(mult>1?a+' ×'+mult:a)}e.drinks.add(name);m.set(k,e)}}
 return [...m.values()].map(e=>{const g=groupOf(e.k);return {...e,drinks:[...e.drinks],bottle:BOTTLE_G.includes(g),inBar:sh.has(e.k),have:e.k in s.have?!!s.have[e.k]:sh.has(e.k)}}).sort((a,b)=>a.have-b.have||a.k.localeCompare(b.k))}
const qtyTxt=e=>[e.ml?fmtMl(e.ml):'',...[...new Set(e.other)].slice(0,3)].filter(Boolean).join(' + ')||'as needed';
function shopText(){const s=shopGet(),L=shopLines(),need=L.filter(x=>!x.have),have=L.filter(x=>x.have);
 const sec=(t,a)=>a.length?`\n${t}\n`+a.map(e=>`- ${e.k} – ${qtyTxt(e)}`).join('\n')+'\n':'';
 return `Bar Book shopping list\nFor: ${s.items.map(i=>{const c=drinkByKey(i.k);return (c?c.name:i.name)+(i.serves>1?' ×'+i.serves:'')}).join(', ')}\n`+sec('Bottles & spirits',need.filter(x=>x.bottle))+sec('Fresh & other',need.filter(x=>!x.bottle))+(have.length?`\nAlready have: ${have.map(x=>x.k).join(', ')}\n`:'')}
function shopView(){const s=shopGet(),L=shopLines(),need=L.filter(x=>!x.have).length;
 const line=e=>`<label class="sl${e.have?' have':''}"><input type=checkbox data-have="${esc(e.k)}" ${e.have?'checked':''} aria-label="I already have ${esc(e.k)}"><span class=sl-n><b>${esc(e.k)}</b><small>${e.inBar?'<span class=inbar>In My Bar</span> · ':''}${esc(e.drinks.slice(0,3).join(', '))}${e.drinks.length>3?' +'+(e.drinks.length-3):''}</small></span><span class=sl-q>${esc(qtyTxt(e))}</span></label>`;
 const grp=(t,a)=>a.length?`<h4 class=eyebrow>${t} <span class=cnt>${a.filter(x=>!x.have).length} to buy</span></h4><div class=slist>${a.map(line).join('')}</div>`:'';
 app.innerHTML=`<a class=backl href="#more">‹ More</a><section class=hero-s><p class=eyebrow>Shopping list</p><h1 class=display>Shopping list</h1><p class=muted>${s.items.length?`${plural(s.items.length,'drink')} · ${need} to buy`:'Nothing on your list yet'}</p></section>
 ${s.items.length?`<h4 class=eyebrow>Drinks</h4><div class=shd>${s.items.map((it,ix)=>{const c=drinkByKey(it.k);return `<div class=shd-r>${c?`<a href="${drinkHref(c)}">${esc(c.name)}</a>`:`<span>${esc(it.name)}</span>`}<div class=step><button type=button class=stp data-sv="${ix}" data-d=-1 aria-label="Fewer serves">${I('minus')}</button><span>${it.serves||1}<small> serve${(it.serves||1)>1?'s':''}</small></span><button type=button class=stp data-sv="${ix}" data-d=1 aria-label="More serves">${I('plus')}</button></div><button type=button class=rm data-rm="${ix}" aria-label="Remove ${esc(it.name)}">${I('x')}</button></div>`}).join('')}</div>
 <p class="muted small">Tick what you already have${shelf().size?' – items in My Bar are ticked for you':''}. Ice and water are left off.</p>
 ${grp('Bottles & spirits',L.filter(x=>x.bottle))}${grp('Fresh & other',L.filter(x=>!x.bottle))}
 <div class=btns>${navigator.share?`<button id=shs class=btn>${I('share')}Share</button>`:''}<button id=shc class="btn ${navigator.share?'ghost':''}">${I('copy')}Copy as text</button><button id=shx class="btn danger">${I('x')}Clear all</button></div><p id=shm class="muted small" role=status></p>`
 :EMP('list','Your list is empty','Tap “Add to list” on any recipe, or use “Add to shopping list” in Saved to pick several drinks at once.')+`<div class=btns><a class=btn href="#recipes">Browse recipes</a><a class="btn ghost" href="#fav">${I('heart')}From Saved</a></div>`}`;
 app.querySelectorAll('[data-have]').forEach(i=>i.onchange=()=>{const s=shopGet();s.have[i.dataset.have]=i.checked;shopSave(s);const y=scrollY;shopView();scrollTo({top:y,left:0,behavior:'instant'})});
 app.querySelectorAll('[data-sv]').forEach(b=>b.onclick=()=>{const s=shopGet(),it=s.items[+b.dataset.sv];if(!it)return;it.serves=Math.min(99,Math.max(1,(+it.serves||1)+ +b.dataset.d));shopSave(s);const y=scrollY;shopView();scrollTo({top:y,left:0,behavior:'instant'})});
 app.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const s=shopGet();s.items.splice(+b.dataset.rm,1);shopSave(s);shopView()});
 const msg=t=>{const m=document.getElementById('shm');if(m)m.textContent=t};
 const cp=async()=>{const t=shopText();try{await navigator.clipboard.writeText(t);msg('Copied – paste it into Notes, WhatsApp or anywhere.')}catch(e){const ta=document.createElement('textarea');ta.value=t;ta.readOnly=true;ta.className='shtxt';document.getElementById('shm').after(ta);ta.select();msg('Select and copy the text below.')}};
 const c_=document.getElementById('shc');if(c_)c_.onclick=cp;
 const s_=document.getElementById('shs');if(s_)s_.onclick=async()=>{try{await navigator.share({title:'Bar Book shopping list',text:shopText()})}catch(e){if(e.name!='AbortError')cp()}};
 const x_=document.getElementById('shx');if(x_)x_.onclick=()=>{if(!confirm('Clear the whole shopping list?'))return;shopSave({items:[],have:{}});shopView()}}
const shopBtn=c=>{const on=onShop(c);return `<button type=button class="btn ghost${on?' on':''}" data-shop="${esc(fkey(c))}" aria-pressed="${on}">${on?I('check')+'On list':I('list')+'Add to list'}</button>`};
document.addEventListener('click',e=>{const b=e.target.closest('[data-shop]');if(!b)return;e.preventDefault();const k=b.dataset.shop,c=(window._detail&&fkey(window._detail)==k)?window._detail:drinkByKey(k);if(!c)return;
 const on=shopToggle(c);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.innerHTML=on?I('check')+'On list':I('list')+'Add to list';
 let h=document.getElementById('shopto');if(on){if(!h){b.closest('.btns').insertAdjacentHTML('afterend','<p id=shopto class="muted small">Added. <a href="#shop">View shopping list</a></p>')}}else if(h)h.remove()});
// multi-select from Saved / My Recipes
function selectable(){const g=app.querySelector('#flist')||app.querySelector('.grid');if(!g||!g.querySelector('.tile')||app.querySelector('#shsel'))return;
 g.insertAdjacentHTML('beforebegin',`<div class=selrow><button type=button id=shsel class="btn ghost sm">${I('list')}Add to shopping list</button></div>`);
 const bar=()=>{let b=document.getElementById('selbar');const n=g.querySelectorAll('.tile.sel').length;if(!b){document.body.insertAdjacentHTML('beforeend',`<div id=selbar role=region aria-label="Selection"><span id=selc></span><button type=button id=seladd class="btn sm">Add to list</button><button type=button id=selx class="btn ghost sm">Cancel</button></div>`);b=document.getElementById('selbar');
   document.getElementById('selx').onclick=done;document.getElementById('seladd').onclick=()=>{const cs=[...g.querySelectorAll('.tile.sel')].map(t=>tileDrink(t)).filter(Boolean);const n=shopAdd(cs);done();const r=app.querySelector('.selrow');if(r)r.insertAdjacentHTML('beforeend',`<span class="muted small" id=selmsg>${n?plural(n,'drink')+' added.':'Already on your list.'} <a href="#shop">View list</a></span>`)}}
  document.getElementById('selc').textContent=n?plural(n,'drink')+' selected':'Tap drinks to select';document.getElementById('seladd').disabled=!n};
 const pick=e=>{const t=e.target.closest('.tile');if(!t||!g.classList.contains('selecting'))return;e.preventDefault();e.stopPropagation();t.classList.toggle('sel');t.setAttribute('aria-selected',t.classList.contains('sel'));bar()};
 const done=()=>{g.classList.remove('selecting');g.querySelectorAll('.tile.sel').forEach(t=>t.classList.remove('sel'));const b=document.getElementById('selbar');if(b)b.remove();g.removeEventListener('click',pick,true);document.getElementById('shsel').hidden=false};
 document.getElementById('shsel').onclick=()=>{const m=document.getElementById('selmsg');if(m)m.remove();g.classList.add('selecting');document.getElementById('shsel').hidden=true;g.addEventListener('click',pick,true);bar()}}
function tileDrink(t){const h=decodeURIComponent((t.getAttribute('href')||'').slice(1)),i=h.indexOf('/'),p=h.slice(0,i),a=h.slice(i+1);return p=='cocktail'?drinkByKey('c:'+a):p=='my'?drinkByKey('m:'+a):p=='sspec'?drinkByKey('s:'+a):null}
addEventListener('hashchange',()=>{const b=document.getElementById('selbar');if(b)b.remove()});
{const _fav=favList,_mine=mineList;favList=async function(){await _fav();if(location.hash.startsWith('#fav'))selectable()};mineList=function(){_mine();selectable()}}

// ================= 2) MY NOTES & RATINGS =================
const NK='barbook-notes';const notesGet=()=>LSJ(NK,{})||{};
const noteOf=k=>notesGet()[k]||null;
const barKey=(b,s)=>'b:'+b.name+'|'+s.name;
function noteMark(k){const n=noteOf(k);if(!n||!((n.t||'').trim()||n.r))return '';return `<span class=ndot title="${n.r?n.r+'/5':''}${(n.t||'').trim()?' · has a note':''}">${(n.t||'').trim()?I('note','xs'):''}${n.r?`<i>${n.r}</i>${I('star','xs st')}`:''}</span>`}
const noteDot=c=>noteMark(fkey(c));
function noteBlock(k){const n=noteOf(k)||{},r=n.r||0;return `<section class=mynote data-nk="${esc(k)}"><div class=mn-h><h4 class=eyebrow>My notes</h4><div class=stars role=group aria-label="My rating">${[1,2,3,4,5].map(i=>`<button type=button class="star${i<=r?' on':''}" data-star=${i} aria-label="Rate ${i} of 5" aria-pressed="${i<=r}">${I('star')}</button>`).join('')}</div></div><textarea class=ntext rows=3 placeholder="Your notes – tweaks, where you had it, who loved it…" aria-label="My notes">${esc(n.t||'')}</textarea><p class="muted small nst">${n.u?'Saved '+new Date(n.u).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Private – saved on this device'}</p></section>`}
function noteSave(k,patch){const N=notesGet(),n={...(N[k]||{}),...patch,u:new Date().toISOString()};if(!(n.t||'').trim()&&!n.r)delete N[k];else N[k]=n;LSS(NK,N);return n}
const noteStatus=(box,t)=>{const p=box.querySelector('.nst');if(p)p.textContent=t};
document.addEventListener('click',e=>{const s=e.target.closest('.mynote .star');if(!s)return;e.preventDefault();const box=s.closest('.mynote'),k=box.dataset.nk,cur=(noteOf(k)||{}).r||0,v=+s.dataset.star,r=cur==v?0:v;noteSave(k,{r});
 box.querySelectorAll('.star').forEach(b=>{const on=+b.dataset.star<=r;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});noteStatus(box,r?`Rated ${r}/5 – saved`:'Rating cleared');barNoteSum(box)});
let _nt;document.addEventListener('input',e=>{const t=e.target.closest('.mynote .ntext');if(!t)return;const box=t.closest('.mynote');noteStatus(box,'Saving…');clearTimeout(_nt);_nt=setTimeout(()=>{noteSave(box.dataset.nk,{t:t.value});noteStatus(box,'Saved');barNoteSum(box)},400)});
document.addEventListener('change',e=>{const t=e.target.closest('.mynote .ntext');if(!t)return;clearTimeout(_nt);const box=t.closest('.mynote');noteSave(box.dataset.nk,{t:t.value});noteStatus(box,'Saved');barNoteSum(box)});
function barNoteSum(box){const d=box.closest('details.bnote');if(!d)return;const m=d.querySelector('summary .ndw');if(m)m.innerHTML=noteMark(box.dataset.nk)}
const barNote=(b,s)=>`<details class=bnote><summary>${I('note','xs')}My notes<span class=ndw>${noteMark(barKey(b,s))}</span></summary>${noteBlock(barKey(b,s))}</details>`;

// ================= 3) PRACTICE =================
const PK='barbook-practice';
function prGet(){const o=LSJ(PK,{})||{};return {cards:o.cards||{},stats:{streak:0,best:0,last:'',reviews:0,got:0,mcRight:0,mcTotal:0,sessions:0,...(o.stats||{})},opt:{src:'all',mode:'flash',...(o.opt||{})}}}
const prSave=p=>LSS(PK,p);
const DAYMS=864e5,INT=[0,1,3,7,14,30];
let CLASSIC_N=null;
async function classicNames(){if(CLASSIC_N)return CLASSIC_N;let n=[];try{n=(await fetch('data/classics.json').then(r=>r.json())).cocktails.map(c=>c.name)}catch(e){}return CLASSIC_N=new Set(n)}
const prSrcs=[['all','Library'],['fav','Favourites'],['classic','Classics'],['mine','My Recipes']];
function prPool(src){const ok=c=>c&&c.ingredients&&c.ingredients.length;let a;
 if(src=='fav')a=favs().map(drinkByKey);else if(src=='mine')a=C.filter(c=>c.mine);else if(src=='classic')a=C.filter(c=>!c.mine&&((CLASSIC_N&&CLASSIC_N.has(c.name))||/^(Classic|Modern Classic)$/.test(c.category)||histOf(c.name)));else a=C.filter(c=>!c.mine);
 return a.filter(ok)}
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let PS=null; // current session
function prQueue(pool,n=10){const P=prGet(),now=Date.now(),due=[],fresh=[],later=[];for(const c of pool){const s=P.cards[fkey(c)];if(!s)fresh.push(c);else if(s.due<=now)due.push(c);else later.push(c)}
 due.sort((a,b)=>P.cards[fkey(a)].due-P.cards[fkey(b)].due);later.sort((a,b)=>P.cards[fkey(a)].due-P.cards[fkey(b)].due);return [...due,...shuffle(fresh),...later].slice(0,n)}
function prMark(c,ok){const P=prGet(),k=fkey(c),s=P.cards[k]||{box:0,due:0},again=PS&&PS.missed.has(k);
 if(ok){s.box=again?1:Math.min(5,(s.box||0)+1);s.due=Date.now()+INT[s.box]*DAYMS}else{s.box=0;s.due=Date.now()+10*60e3}P.cards[k]=s;
 const t=ukDate(),st=P.stats;if(st.last!=t){st.streak=st.last==ymdAdd(t,-1)?st.streak+1:1;st.last=t;st.best=Math.max(st.best,st.streak)}st.reviews++;if(ok)st.got++;
 if(PS&&PS.mode=='mc'){st.mcTotal++;if(ok)st.mcRight++}prSave(P)}
const SPL={'None (mocktail)':'No alcohol (mocktail)','Wine/Sparkling':'Wine / sparkling','Other/Liqueur':'Liqueur / other','Whisky':'Whisky / whiskey'};
const GLS=[[/flute|champagne/,'Champagne flute'],[/hurricane/,'Hurricane glass'],[/margarita/,'Margarita glass'],[/copper/,'Copper mug'],[/irish coffee/,'Irish coffee glass'],[/punch bowl|pitcher/,'Punch bowl / jug'],[/mug|cup/,'Mug'],[/snifter|balloon/,'Brandy snifter'],[/wine|goblet/,'Wine glass'],[/shot|shooter|cordial|pousse/,'Shot glass'],[/beer|pint|pilsner|stein/,'Beer glass'],[/sour glass/,'Sour glass'],[/highball|collins/,'Highball / Collins glass'],[/old[- ]?fashioned|rocks|lowball|tumbler/,'Rocks / old fashioned glass'],[/coupe|cocktail|martini|nick/,'Cocktail glass / coupe']];
function glassCat(g){g=(g||'').toLowerCase();if(!g)return null;const hits=[...new Set(GLS.filter(([re])=>re.test(g)).map(x=>x[1]))];if(g.includes(' or ')&&hits.length!=1)return null;return hits[0]||null}
function mcQ(c){const types=[];const sp=[...new Set(C.map(x=>x.spirit))];
 if(c.spirit&&c.spirit!='Other/Liqueur')types.push('spirit');if(glassCat(c.glass))types.push('glass');const ns=needs(c);if(ns.length)types.push('ing');
 const t=types[Math.floor(Math.random()*types.length)];
 if(t=='spirit'){const opts=shuffle([c.spirit,...shuffle(sp.filter(x=>x!=c.spirit)).slice(0,3)]);return {q:`What's the base spirit in a ${c.name}?`,opts:opts.map(o=>SPL[o]||o),ans:SPL[c.spirit]||c.spirit}}
 if(t=='glass'){const g=glassCat(c.glass),all=[...new Set(GLS.map(x=>x[1]))].filter(x=>x!=g);return {q:`Which glass is a ${c.name} served in?`,opts:shuffle([g,...shuffle(all).slice(0,3)]),ans:g}}
 const right=ns[Math.floor(Math.random()*ns.length)],grp=groupOf(right),freq=[...allIngredients()].filter(([n])=>!ns.includes(n)).sort((a,b)=>b[1]-a[1]).slice(0,80).map(x=>x[0]);
 const same=shuffle(freq.filter(n=>groupOf(n)==grp)),others=shuffle(freq.filter(n=>groupOf(n)!=grp));const d=[...same,...others].slice(0,3);
 return {q:`Which of these goes into a ${c.name}?`,opts:shuffle([right,...d]),ans:right}}
function recipeHtml(c){return `<ul class=ings>${c.ingredients.map(i=>`<li><span>${esc(i.item)}</span><b>${esc(amt(i))}</b></li>`).join('')}</ul><p class=fc-m><small>Method</small>${esc(c.method)||'—'}</p><div class=facts>${c.glass?`<div><small>Glass</small>${esc(c.glass)}</div>`:''}${c.garnish?`<div><small>Garnish</small>${esc(c.garnish)}</div>`:''}</div>`}
async function practiceView(a){await classicNames();if(!location.hash.startsWith('#practice'))return;if(a=='go'&&PS)return prCard();PS=null;const P=prGet(),o=P.opt,st=P.stats,pool=prPool(o.src),now=Date.now();
 const due=pool.filter(c=>{const s=P.cards[fkey(c)];return s&&s.due<=now}).length,learned=Object.values(P.cards).filter(s=>s.box>=3).length,today=ukDate(),live=st.last==today||st.last==ymdAdd(today,-1);
 app.innerHTML=`<a class=backl href="#more">‹ More</a><section class=hero-s><p class=eyebrow>Practice</p><h1 class=display>Learn the specs</h1><p class=muted>Flashcards and quick quizzes. Cards you miss come back sooner.</p></section>
 <div class=prstats><div><b>${live?st.streak:0}</b><small>day streak</small></div><div><b>${st.best}</b><small>best</small></div><div><b>${learned}</b><small>learned</small></div><div><b>${st.mcTotal?Math.round(st.mcRight/st.mcTotal*100)+'%':'–'}</b><small>quiz score</small></div></div>
 <h4 class=eyebrow>Mode</h4><div class=seg><a href="#" data-pm=flash class="${o.mode=='flash'?'on':''}">${I('cards')}Flashcards</a><a href="#" data-pm=mc class="${o.mode=='mc'?'on':''}">${I('check')}Multiple choice</a></div>
 <h4 class=eyebrow>Drinks</h4><div class="seg4">${prSrcs.map(([k,l])=>`<a href="#" data-ps=${k} class="${o.src==k?'on':''}">${l}</a>`).join('')}</div>
 <p class="muted small">${plural(pool.length,'drink')}${due?` · ${due} due for review`:''}</p>
 ${pool.length?`<button id=prgo class="btn wide">Start ${Math.min(10,pool.length)} cards</button>`:EMP(o.src=='fav'?'heart':'edit',o.src=='fav'?'No favourites yet':'No recipes yet',o.src=='fav'?'Tap the heart on drinks to practise just those.':'Add your own specs in Saved › My recipes.')}`;
 app.querySelectorAll('[data-pm]').forEach(x=>x.onclick=e=>{e.preventDefault();const P=prGet();P.opt.mode=x.dataset.pm;prSave(P);practiceView()});
 app.querySelectorAll('[data-ps]').forEach(x=>x.onclick=e=>{e.preventDefault();const P=prGet();P.opt.src=x.dataset.ps;prSave(P);practiceView()});
 const g=document.getElementById('prgo');if(g)g.onclick=()=>{PS={mode:o.mode,q:prQueue(pool),i:0,right:0,done:0,missed:new Set(),rev:false,mc:null,picked:null};location.hash='#practice/go'}}
function prCard(){const S=PS;if(S.i>=S.q.length)return prDone();const c=S.q[S.i],total=S.q.length;
 const top=`<div class=prtop><a class=backl href="#practice">‹ End</a><span class="muted small">${S.i+1} / ${total}</span><span class="muted small">${S.right} right</span></div><div class=prbar><i style="width:${S.i/total*100}%"></i></div>`;
 const head=`<div class=fc-h>${pic(c,true,'fc-img')}<div><div class=tags>${c.mine?'<span class="tag mine">Mine</span>':''}${S.missed.has(fkey(c))?'<span class="tag again">Again</span>':''}</div><h2 class=fc-n>${esc(c.name)}</h2></div></div>`;
 if(S.mode=='mc'){if(!S.mc)S.mc=mcQ(c);const M=S.mc,ans=S.picked!=null;
  app.innerHTML=`${top}<div class=fc>${head}<p class=mcq>${esc(M.q)}</p><div class=mco>${M.opts.map((x,j)=>`<button type=button class="mc${ans?(x==M.ans?' ok':j==S.picked?' bad':''):''}" data-o=${j} ${ans?'disabled':''}>${esc(x)}</button>`).join('')}</div>${ans?`<p class="mcr ${M.opts[S.picked]==M.ans?'ok':'bad'}">${M.opts[S.picked]==M.ans?'Correct':'Not quite – it’s '+esc(M.ans)}</p>${recipeHtml(c)}`:''}</div>${ans?`<button id=prn class="btn wide">${S.i+1<total?'Next':'Finish'}</button>`:''}`;
  app.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{S.picked=+b.dataset.o;const ok=M.opts[S.picked]==M.ans;prMark(c,ok);if(ok)S.right++;else prAgain(c);S.done++;prCard()});
  const n=document.getElementById('prn');if(n)n.onclick=()=>{S.i++;S.mc=null;S.picked=null;prCard();scrollTo({top:0,left:0,behavior:'instant'})};return}
 app.innerHTML=`${top}<div class=fc>${head}${S.rev?recipeHtml(c):`<p class="muted fc-hint">Say the spec out loud – ingredients and ml, method and glass – then check.</p>`}</div>
 ${S.rev?`<div class=btns><button id=pra class="btn ghost">${I('x')}Again</button><button id=prk class=btn>${I('check')}Got it</button></div>`:`<button id=prr class="btn wide">Show recipe</button>`}`;
 const r=document.getElementById('prr');if(r)r.onclick=()=>{S.rev=true;prCard()};
 const nx=()=>{S.i++;S.rev=false;S.done++;prCard();scrollTo({top:0,left:0,behavior:'instant'})};
 const k=document.getElementById('prk');if(k)k.onclick=()=>{prMark(c,true);S.right++;nx()};
 const ag=document.getElementById('pra');if(ag)ag.onclick=()=>{prMark(c,false);prAgain(c);nx()}}
// "Again" cards come back later in this session (once), and in 10 minutes next time
function prAgain(c){const S=PS,k=fkey(c);if(S.missed.has(k))return;S.missed.add(k);S.q.splice(Math.min(S.q.length,S.i+4),0,c)}
function prDone(){const S=PS,P=prGet();P.stats.sessions++;prSave(P);const miss=[...S.missed].map(drinkByKey).filter(Boolean);
 app.innerHTML=`<section class=hero-s><p class=eyebrow>Session complete</p><h1 class=display>${S.right} of ${S.done} right</h1><p class=muted>${P.stats.streak}-day streak · best ${P.stats.best}</p></section>
 ${miss.length?`<h4 class=eyebrow>To review</h4><div class=past>${miss.map(c=>`<a class=prow href="${drinkHref(c)}">${pic(c,true)}<div><b>${esc(c.name)}</b><small>Comes back in your next session</small></div>${I('chev','xs')}</a>`).join('')}</div>`:EMP('check','Clean sweep','Every card right. They’ll come back in a few days to keep them fresh.')}
 <div class=btns><button id=pragain class=btn>Practise again</button><a class="btn ghost" href="#more">Done</a></div>`;PS=null;
 document.getElementById('pragain').onclick=()=>{location.hash='#practice'}}
