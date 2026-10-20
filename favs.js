// Favourites: keys c:<library name> | m:<my recipe id> | s:<seasonal house spec id>
const FK='barbook-favs';
const favs=()=>{try{return JSON.parse(localStorage.getItem(FK)||'[]')}catch(e){return[]}};
const saveFavs=a=>localStorage.setItem(FK,JSON.stringify([...new Set(a)]));
const fkey=c=>c.mine?'m:'+c.id:(c._spec||c.label=='Bar Book recipe')?'s:'+c.id:'c:'+c.name;
const isFav=c=>favs().includes(fkey(c));
const heart=(c,big)=>`<button type=button class="heart${big?' big':''}${isFav(c)?' on':''}" data-k="${esc(fkey(c))}" aria-label="Favourite" aria-pressed="${isFav(c)}"><svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.4A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/></svg></button>`;
document.addEventListener('click',e=>{const h=e.target.closest('.heart');if(!h)return;e.preventDefault();e.stopPropagation();
 const k=h.dataset.k,a=favs(),on=!a.includes(k);saveFavs(on?[...a,k]:a.filter(x=>x!=k));
 document.querySelectorAll(`.heart[data-k="${CSS.escape(k)}"]`).forEach(b=>{b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
 if(!on&&location.hash.startsWith('#fav')){const t=h.closest('.tile');if(t)t.remove();favCount()}},true);
const savedToggle=w=>`<div class=seg><a href="#fav" class="${w=='fav'?'on':''}">${I('heart')}Favourites</a><a href="#mine" class="${w=='mine'?'on':''}">My recipes</a></div>`;
function favCount(){const el=document.getElementById('fcnt');if(el)el.textContent=document.querySelectorAll('#flist .tile').length+' saved'}
async function favList(){if(typeof SEA!=='undefined'&&!SEA)SEA=await fetch('data/seasonal.json').then(r=>r.json()).catch(()=>null);if(!location.hash.startsWith('#fav'))return;
 const specs=SEA?SEA.periods.flatMap(p=>p.specs):[];
 const items=favs().map(k=>{const [t,...r]=k.split(':'),v=r.join(':');return t=='c'?C.find(c=>c.name==v&&!c.mine):t=='m'?C.find(c=>c.mine&&c.id==v):t=='s'?(s=>s&&{...s,_spec:true})(specs.find(s=>s.id==v)):null}).filter(Boolean);
 app.innerHTML=`${savedToggle('fav')}<section class=hero-s><h1 class=display>Favourites</h1><p class=muted id=fcnt></p></section>${items.length?`<div class="controls"><input id=fq type=search placeholder="Search favourites…"></div>`:''}<div id=flist class=grid></div>
 ${items.length?'':`<div class="sig empty"><div class=empty-h>${heart({name:'_'},true)}</div><h3>No favourites yet</h3><p class=muted>Tap the heart on any drink – library, seasonal or your own – and it'll appear here, even offline.</p><a class=btn href="#recipes">Browse recipes</a></div>`}`;
 const draw=()=>{const q=(document.getElementById('fq')||{value:''}).value.toLowerCase().trim();document.getElementById('flist').innerHTML=items.filter(c=>!q||(c.name+' '+c.ingredients.map(i=>i.item).join(' ')).toLowerCase().includes(q)).map(c=>`<a class=tile href="${c._spec?'#sspec/'+c.id:link(c)}">${heart(c)}${pic(c,true)}<div class=tile-b><h3>${esc(c.name)}</h3><div class=tags>${c._spec?'<span class="tag house">Bar Book recipe</span>':c.mine?'<span class="tag mine">Mine</span>':`<span class=tag>${esc(c.spirit)}</span>`}</div></div></a>`).join('');favCount()};
 const fq=document.getElementById('fq');if(fq)fq.oninput=draw;draw()}
