// Bar Book v15: Cocktail of the Day + drink histories (data/history.json).
let HIST=null;
const histOf=n=>{if(!HIST||!n)return null;const E=HIST.entries;return E[n]||E[(HIST.aliases||{})[n]]||null};
// UK local calendar date (Europe/London) as YYYY-MM-DD
const ukDate=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const COTD_EPOCH=Date.UTC(2026,0,1);
const ymdOk=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!isNaN(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10)))&&new Date(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))).toISOString().slice(0,10)==s;
const dayNo=s=>Math.round((Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))-COTD_EPOCH)/864e5);
const ymdAdd=(s,k)=>new Date(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))+k*864e5).toISOString().slice(0,10);
// deterministic PRNG (mulberry32) for the per-cycle shuffle
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const _cyc={};
function cotdPool(){return HIST?Object.keys(HIST.entries).filter(n=>C.some(c=>c.name==n&&!c.mine)).sort():[]}
function cotdOrder(cyc,pool){const k=cyc+':'+pool.length;if(_cyc[k])return _cyc[k];const a=pool.slice(),r=rng(cyc*2654435761+15);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return _cyc[k]=a}
// one drink per UK day; every drink with a history appears once per cycle before any repeat
function cotdName(ymd){const pool=cotdPool(),N=pool.length;if(!N)return null;const d=dayNo(ymd),cyc=Math.floor(d/N),i=((d%N)+N)%N;return cotdOrder(cyc,pool)[i]}
const fmtDay=(s,o={weekday:'short',day:'numeric',month:'short'})=>new Date(s+'T12:00:00Z').toLocaleDateString('en-GB',{...o,timeZone:'UTC'});
function cotdCard(){const n=cotdName(ukDate()),c=n&&C.find(x=>x.name==n&&!x.mine),h=histOf(n);if(!c||!h)return '';
 return `<a class=cotd href="#cotd">${pic(c,true,'cotd-img')}<div class=cotd-b><p class=cotd-k>${I('glass','xs')}Cocktail of the Day</p><h2>${esc(c.name)}</h2><p class=cotd-t>${esc(h.teaser)}</p><p class=cotd-m>History & recipe · changes at midnight</p></div>${I('chev','cotd-chev')}</a>`}
function histBlock(h){return h?`<section class=hist><h4 class=eyebrow>History</h4><p>${esc(h.history)}</p><p class="muted small srcs">Sources: ${h.sources.map(s=>`<a href="${esc(s.url)}" target=_blank rel=noopener>${esc(s.title)} ${I('ext','xs')}</a>`).join(' · ')}</p></section>`:''}
function cotdView(arg){const today=ukDate();if(arg!=null&&!ymdOk(arg))return notFound({kind:'date',id:arg});const d=arg||today;const n=cotdName(d);if(!n)return notFound({kind:'cocktail of the day',id:d});
 cocktail(n,null,{cotd:true});const b=app.querySelector('.back');if(b){b.href='#recipes';b.textContent='‹ Recipes'}
 const isT=d==today,u=SET().unit;
 app.insertAdjacentHTML('afterbegin',`<section class="cotd-head"><p class=eyebrow>${isT?'Cocktail of the Day':'Pick for '+esc(fmtDay(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</p><p class="muted small">${isT?esc(fmtDay(d,{weekday:'long',day:'numeric',month:'long'}))+' · a new drink at midnight (UK time)':'<a href="#cotd">See today’s pick</a>'}</p></section>`);
 const ing=app.querySelector('.panel h4.eyebrow.ing-h');if(ing)ing.insertAdjacentHTML('afterend',`<div class="seg mini" role=group aria-label=Units><a href="#" data-cu=ml class="${u=='ml'?'on':''}">ml</a><a href="#" data-cu=oz class="${u=='oz'?'on':''}">oz</a></div>`);
 app.querySelectorAll('[data-cu]').forEach(a=>a.onclick=e=>{e.preventDefault();LSS('barbook-settings',{...SET(),unit:a.dataset.cu});const y=scrollY;cotdView(arg);window.scrollTo({top:y,left:0,behavior:'instant'})});
 const past=[];for(let k=1;k<=7;k++){const pd=ymdAdd(d,-k),pn=cotdName(pd),pc=C.find(x=>x.name==pn&&!x.mine);if(pc)past.push([pd,pc])}
 app.querySelector('.panel').insertAdjacentHTML('beforeend',`<h4 class=eyebrow>Past picks</h4><div class=past>${past.map(([pd,pc])=>`<a class=prow href="#cotd/${pd}">${pic(pc,true)}<div><small>${esc(fmtDay(pd))}</small><b>${esc(pc.name)}</b></div>${I('chev','xs')}</a>`).join('')}</div>`)}
// refresh the pick if the app is reopened after UK midnight
let _cotdDay=ukDate();const _cotdTick=()=>{const t=ukDate();if(t!=_cotdDay){_cotdDay=t;const h=location.hash;if(!h||h=='#'||h.startsWith('#recipes')||h=='#cotd')route()}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)_cotdTick()});setInterval(_cotdTick,60000);
