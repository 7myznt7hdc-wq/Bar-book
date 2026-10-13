// My Recipes + Pre-batch tool
const MK='barbook-mine';
const mine=()=>{try{return JSON.parse(localStorage.getItem(MK)||'[]')}catch(e){return[]}};
const saveMine=a=>{localStorage.setItem(MK,JSON.stringify(a));rebuild()};
function rebuild(){C=[...BASE,...mine().map(m=>({...m,mine:true,category:m.category||'Other',spirit:m.spirit||'Other/Liqueur'}))];C.forEach(x=>x._s=(x.name+' '+x.ingredients.map(i=>i.item).join(' ')).toLowerCase())}
const SPIRITS=['Gin','Vodka','Rum','Tequila','Whisky','Brandy','Aperitif','Wine/Sparkling','Other/Liqueur','None (mocktail)'];
const CATS=['Classic','Modern Classic','Sour','Highball','Spritz','Tiki','Sparkling','Mocktail','Shot','Punch / Party Drink','Other'];
function mineList(){const m=mine();app.innerHTML=`<h2>My Recipes (${m.length})</h2><div class=btns><a class=btn href="#edit/new">➕ New recipe</a><button id=exp>⬇️ Export JSON</button><label class=btn>⬆️ Import JSON<input type=file id=imp accept="application/json,.json" hidden></label></div><p id=msg class=muted></p>
${m.map(c=>`<a class=card href="#my/${c.id}"><h3>${esc(c.name)} <span class="tag mine">Mine</span> <span class=tag>${esc(c.spirit)}</span></h3><div class=muted>${c.ingredients.map(i=>esc(i.item)).join(' · ')}</div></a>`).join('')||'<p class=muted>No recipes yet. Tap “New recipe” to add your own.</p>'}`;
exp.onclick=()=>{const b=new Blob([JSON.stringify({app:'Bar Book',type:'my-recipes',version:1,exported:new Date().toISOString(),recipes:mine()},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='bar-book-my-recipes-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
imp.onchange=async()=>{const f=imp.files[0];if(!f)return;try{const d=JSON.parse(await f.text());const r=Array.isArray(d)?d:d.recipes;if(!Array.isArray(r))throw Error('No recipes array');const cur=mine(),ids=new Set(cur.map(x=>x.id));let n=0;
for(const x of r){if(!x||!x.name||!Array.isArray(x.ingredients))continue;const c={id:x.id&&!ids.has(x.id)?x.id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:String(x.name),spirit:String(x.spirit||'Other/Liqueur'),category:String(x.category||'Other'),glass:String(x.glass||''),garnish:String(x.garnish||''),method:String(x.method||''),notes:String(x.notes||''),ingredients:x.ingredients.filter(i=>i&&i.item).map(i=>({item:String(i.item),...(isFinite(+i.ml)&&i.ml!==''&&i.ml!=null?{ml:+i.ml}:{amount:String(i.amount||'')})}))};ids.add(c.id);cur.push(c);n++}
saveMine(cur);mineList();document.getElementById('msg').textContent=`Imported ${n} recipe(s).`}catch(e){document.getElementById('msg').textContent='Import failed: '+e.message}}}
const ingRow=(i={})=>`<div class=ing><input class=ii placeholder="Ingredient" value="${esc(i.item||'')}"><input class=im type=number inputmode=decimal step=any min=0 placeholder="ml" value="${i.ml??''}"><input class=ia placeholder="or e.g. 2 dashes" value="${esc(i.amount||'')}"><button type=button class=x onclick="this.parentNode.remove()">✕</button></div>`;
function editMine(id){const c=id=='new'?{ingredients:[{},{},{}]}:mine().find(x=>x.id==id);if(!c)return mineList();const opt=(l,v)=>l.map(o=>`<option ${o==v?'selected':''}>${esc(o)}</option>`).join('');
app.innerHTML=`<a href="#mine">← My Recipes</a><h2>${id=='new'?'New recipe':'Edit recipe'}</h2><form id=f class=form>
<input id=fn required placeholder="Name" value="${esc(c.name||'')}"><div class=controls><select id=fs>${opt(SPIRITS,c.spirit)}</select><select id=fc>${opt(CATS,c.category)}</select></div>
<h4>Ingredients</h4><div id=ings>${c.ingredients.map(ingRow).join('')}</div><button type=button id=addi>+ Ingredient</button>
<textarea id=fm placeholder="Method">${esc(c.method||'')}</textarea><input id=fg placeholder="Glass" value="${esc(c.glass||'')}"><input id=fga placeholder="Garnish" value="${esc(c.garnish||'')}"><textarea id=fno placeholder="Notes">${esc(c.notes||'')}</textarea>
<p id=err class=unknown></p><button>💾 Save</button></form>`;
addi.onclick=()=>ings.insertAdjacentHTML('beforeend',ingRow());
f.onsubmit=e=>{e.preventDefault();const ing=[...ings.querySelectorAll('.ing')].map(r=>{const it=r.querySelector('.ii').value.trim(),ml=r.querySelector('.im').value,a=r.querySelector('.ia').value.trim();return it?(ml!==''?{item:it,ml:+ml}:{item:it,amount:a}):null}).filter(Boolean);
if(!fn.value.trim()||!ing.length){err.textContent='Add a name and at least one ingredient.';return}
const r={id:c.id||'m'+Date.now().toString(36),name:fn.value.trim(),spirit:fs.value,category:fc.value,ingredients:ing,method:fm.value.trim(),glass:fg.value.trim(),garnish:fga.value.trim(),notes:fno.value.trim()};
const a=mine().filter(x=>x.id!=r.id);a.push(r);saveMine(a);location.hash='#my/'+r.id}}
function delMine(id){if(!confirm('Delete this recipe?'))return;saveMine(mine().filter(x=>x.id!=id));location.hash='#mine'}
// ---- Pre-batch ----
const r1=x=>Math.round(x*10)/10;
function batch(a){let c=null;if(a){c=a.startsWith('my:')?C.find(x=>x.mine&&x.id==a.slice(3)):C.find(x=>x.name==a&&!x.mine)}
const ing=c?c.ingredients:[{},{},{}];const stirred=c?/stir/i.test(c.method||''):true;
app.innerHTML=`${c?`<a href="${c.mine?'#my/'+c.id:'#cocktail/'+encodeURIComponent(c.name)}">← ${esc(c.name)}</a>`:''}<h2>⚗️ Pre-batch${c?': '+esc(c.name):''}</h2>
<p class=muted>${c?'Edit amounts if needed.':'Enter a recipe for ONE serve.'} Non-ml items (dashes etc.) are shown as “× serves”, not counted in volume.</p>
<div id=ings>${ing.map(ingRow).join('')}</div><button type=button id=addi>+ Ingredient</button>
<div class=card><label><input type=radio name=mode value=serves checked> Number of serves</label> <input id=bs type=number min=1 step=1 value=10 inputmode=numeric>
<label><input type=radio name=mode value=vol> Target volume (ml)</label> <div class=controls><input id=bv type=number min=1 step=any value=700 inputmode=decimal><select id=bp><option value="">Preset…</option><option>500</option><option selected>700</option><option>750</option><option>1000</option><option>1500</option></select></div>
<label>Dilution water %</label><input id=bd type=number min=0 max=60 step=1 value="${stirred?20:0}" inputmode=numeric>
<p class=muted>~20% is typical for stirred drinks served straight from the freezer; use 0% if you'll still stir/shake over ice.</p></div>
<div id=out></div>
<p class="card warn">⚠️ Citrus juice, dairy, egg and fresh purées lose quality within hours – don't batch them long-term. Batch the spirits/liqueurs/syrups and add fresh juice when serving. Keep batches refrigerated and labelled.</p>`;
addi.onclick=()=>{ings.insertAdjacentHTML('beforeend',ingRow());bind()};
const calc=()=>{const rows=[...ings.querySelectorAll('.ing')].map(r=>({item:r.querySelector('.ii').value.trim(),ml:parseFloat(r.querySelector('.im').value),amount:r.querySelector('.ia').value.trim()})).filter(r=>r.item);
const per=rows.reduce((s,r)=>s+(isFinite(r.ml)?r.ml:0),0),d=Math.max(0,parseFloat(bd.value)||0)/100,perD=per*(1+d);
if(!per){out.innerHTML='<p class=muted>Add ml amounts to calculate.</p>';return}
const vol=document.querySelector('[name=mode]:checked').value=='vol';let n=vol?(parseFloat(bv.value)||0)/perD:Math.max(0,parseFloat(bs.value)||0);
const water=per*d*n,total=perD*n;
out.innerHTML=`<table><tr><th>Ingredient</th><th>Per serve</th><th>Batch</th></tr>${rows.map(r=>`<tr><td>${esc(r.item)}</td><td>${isFinite(r.ml)?r1(r.ml)+' ml':esc(r.amount||'–')}</td><td><b>${isFinite(r.ml)?r1(r.ml*n)+' ml':'×'+r1(n)+' '+esc(r.amount||'')}</b></td></tr>`).join('')}
${d?`<tr><td>Water (dilution ${r1(d*100)}%)</td><td>${r1(per*d)} ml</td><td><b>${r1(water)} ml</b></td></tr>`:''}
<tr class=tot><td>Total</td><td>${r1(perD)} ml</td><td><b>${r1(total)} ml</b></td></tr></table>
<p class=big>${vol?`Makes <b>${r1(n)}</b> serves`:`<b>${r1(n)}</b> serves`} · Pour <b>${r1(perD)} ml</b> per serve</p>`};
const bind=()=>app.querySelectorAll('input,select').forEach(e=>{e.oninput=e.onchange=calc});
bp.onchange=()=>{if(bp.value){bv.value=bp.value;document.querySelector('[value=vol]').checked=true}calc()};
bind();bp.onchange=()=>{if(bp.value){bv.value=bp.value;document.querySelector('[value=vol]').checked=true}calc()};bv.addEventListener('input',()=>document.querySelector('[value=vol]').checked=true);bs.addEventListener('input',()=>document.querySelector('[value=serves]').checked=true);calc()}
