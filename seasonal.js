// Seasonal rotation: deterministic fortnights from a fixed epoch, works offline.
let SEA=null;const DAY=864e5;
const dayNum=d=>Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY);
const mmdd=n=>new Date(n*DAY).toISOString().slice(5,10);
function fortnight(f){const ep=Math.floor(Date.parse(SEA.epoch+'T00:00:00Z')/DAY),start=ep+f*14,mid=start+7,md=mmdd(mid),m=+md.slice(0,2);
 const P=SEA.periods;let p=P.find(x=>x.start&&md>=x.start&&md<=x.end);
 if(!p){const s=m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter';p=P.find(x=>x.season==s)}
 const lib=p.library.map(n=>C.find(c=>c.name==n&&!c.mine)).filter(Boolean),k=Math.max(0,SEA.perFortnight-p.specs.length),off=lib.length?((f*3)%lib.length+lib.length)%lib.length:0;
 const picks=[...p.specs.map(s=>({...s,_spec:true})),...Array.from({length:Math.min(k,lib.length)},(_,i)=>lib[(off+i)%lib.length])];
 return {f,start,end:start+13,period:p.id,title:p.titles[((f%p.titles.length)+p.titles.length)%p.titles.length],picks}}
const fmt=n=>new Date(n*DAY).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
async function seasonal(dateArg){if(!SEA)SEA=await fetch('data/seasonal.json').then(r=>r.json());
 const today=dateArg&&/^\d{4}-\d{2}-\d{2}$/.test(dateArg)?Math.floor(Date.parse(dateArg+'T00:00:00Z')/DAY):dayNum(new Date());
 const ep=Math.floor(Date.parse(SEA.epoch+'T00:00:00Z')/DAY),f=Math.floor((today-ep)/14),cur=fortnight(f),nx=fortnight(f+1),left=cur.end+1-today;
 if(!location.hash.startsWith('#seasonal'))return;
 const tile=c=>c._spec?`<a class=tile href="#sspec/${c.id}">${heart(c)}${pic(c,true)}<div class=tile-b><h3>${esc(c.name)}</h3><div class=tags><span class="tag house">Bar Book recipe</span></div></div></a>`:`<a class=tile href="${link(c)}">${heart(c)}${pic(c,true)}<div class=tile-b><h3>${esc(c.name)}</h3><div class=tags><span class=tag>${esc(c.spirit)}</span></div></div></a>`;
 app.innerHTML=`<section class=hero-s><p class=eyebrow>Seasonal · ${fmt(cur.start)} – ${fmt(cur.end)}</p><h1 class=display>${esc(cur.title)}</h1>
 <p class=countdown><span>Changes in <b>${left} day${left==1?'':'s'}</b></span></p></section>
 <div class=grid>${cur.picks.map(tile).join('')}</div>
 <h4 class=eyebrow>Next up · from ${fmt(nx.start)}</h4><div class="sig peek"><h3>${esc(nx.title)}</h3><p class=muted>${nx.picks.slice(0,4).map(c=>esc(c.name)).join(' · ')}${nx.picks.length>4?' …':''}</p></div>
 <p class="muted small">Rotates automatically every two weeks (UK seasons + Burns Night, Valentine's, Halloween, Bonfire Night, Christmas). “Bar Book recipe” = our own house spec.</p>`}
async function sspec(id){if(!SEA)SEA=await fetch('data/seasonal.json').then(r=>r.json());const s=SEA.periods.flatMap(p=>p.specs).find(x=>x.id==id);if(!s)return seasonal();
 cocktail(null,{...s,_spec:true,notes:'Bar Book recipe – a house seasonal spec, not taken from any bar or database.'});const b=app.querySelector('.back');if(b){b.href='#seasonal';b.textContent='‹ Seasonal'}}
