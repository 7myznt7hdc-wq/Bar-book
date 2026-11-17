// Bar Book v18: Trends (YouTube) + Bar News from public RSS, no API keys.
let TRENDS={updated:null,items:[]},NEWS={updated:null,items:[]},FEEDS_OFFLINE=false;
const FLK='barbook-follow';
const follows=()=>{try{return JSON.parse(localStorage.getItem(FLK)||'[]')}catch(e){return[]}};
const isFollow=n=>follows().includes(n);
const toggleFollow=n=>{const a=follows(),i=a.indexOf(n);if(i<0)a.push(n);else a.splice(i,1);localStorage.setItem(FLK,JSON.stringify(a));return i<0};
const TOPICS=['openings','awards','menus','guest shifts','techniques'];
let NF={topic:'',who:'all'},TF={topic:'',who:'all'};

async function loadFeeds(){
  FEEDS_OFFLINE=!navigator.onLine;
  const get=async p=>{try{const r=await fetch(p);if(!r.ok)throw 0;return r.json()}catch(e){FEEDS_OFFLINE=true;return null}};
  const [t,n]=await Promise.all([get('data/trends.json'),get('data/news.json')]);
  if(t&&Array.isArray(t.items))TRENDS=t;
  if(n&&Array.isArray(n.items))NEWS=n;
}
function ukParts(d){
  const s=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(d));
  return Object.fromEntries(s.map(p=>[p.type,p.value]));
}
function ukFmt(iso,withTime){
  if(!iso)return '';
  const p=ukParts(iso);
  const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p.month-1];
  return withTime?`${+p.day} ${mon} ${p.year}, ${p.hour}:${p.minute} UK`:`${+p.day} ${mon} ${p.year}`;
}
function ukDayKey(iso){
  const p=ukParts(iso||Date.now());
  return `${p.year}-${p.month}-${p.day}`;
}
function startOfUkWeek(d=new Date()){
  const p=ukParts(d);
  const offset={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6}[p.weekday]||0;
  const dt=new Date(Date.UTC(+p.year,+p.month-1,+p.day));
  dt.setUTCDate(dt.getUTCDate()-offset);
  const y=dt.getUTCFullYear(),m=String(dt.getUTCMonth()+1).padStart(2,'0'),day=String(dt.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function inThisWeek(iso){
  if(!iso)return false;
  const p=ukParts(iso);
  const key=`${p.year}-${p.month}-${p.day}`;
  return key>=startOfUkWeek();
}
const barsSeg=on=>`<div class=seg3><a href="#bars" class="${on=='list'?'on':''}">The list</a><a href="#trends" class="${on=='trends'?'on':''}">Trends</a><a href="#news" class="${on=='news'?'on':''}">Bar News</a></div>`;
function feedsMeta(src){
  const upd=src&&src.updated;
  return `${FEEDS_OFFLINE?`<p class=offnote>You’re offline — showing the last saved feed.</p>`:''}${upd?`<p class="muted small updated">Last updated ${esc(ukFmt(upd,true))}</p>`:''}`;
}
function itemTags(it){
  const bits=[];
  if(it.bar){const b=(B.bars||[]).find(x=>x.name==it.bar);bits.push(b?`<a class="tag tbar" href="#bar/${b.rank}">${esc(it.bar)}</a>`:`<span class="tag tbar">${esc(it.bar)}</span>`)}
  (it.tags||[]).forEach(t=>bits.push(`<span class=tag>${esc(t)}</span>`));
  return bits.length?`<div class=ntags>${bits.join('')}</div>`:'';
}
function filterItems(items,f){
  const visited=V(),fol=follows();
  return items.filter(it=>{
    if(f.topic&&!(it.tags||[]).includes(f.topic))return false;
    if(f.who=='been'){
      const names=it.bars||(it.bar?[it.bar]:[]);
      return names.some(n=>visited[n]);
    }
    if(f.who=='follow'){
      const names=it.bars||(it.bar?[it.bar]:[]);
      return names.some(n=>fol.includes(n));
    }
    return true;
  });
}
function filterBar(f,prefix){
  return `<div class=tfilters>
    <div class=chips>${['', ...TOPICS].map(t=>`<a href="#" class="chip${f.topic==t?' on':''}" data-f="topic" data-v="${esc(t)}">${t||'All topics'}</a>`).join('')}</div>
    <div class="seg mini"><a href="#" class="${f.who=='all'?'on':''}" data-f="who" data-v="all">All</a><a href="#" class="${f.who=='been'?'on':''}" data-f="who" data-v="been">Been to</a><a href="#" class="${f.who=='follow'?'on':''}" data-f="who" data-v="follow">Following</a></div>
  </div>`;
}
function bindFilters(f,redraw){
  document.querySelectorAll('.tfilters [data-f]').forEach(a=>a.onclick=e=>{e.preventDefault();f[a.dataset.f]=a.dataset.v;redraw()});
}
const isBarVid=it=>/bars?\b|cocktail/i.test(it.title||'')||!!it.bar;
function videoCard(it){
  const thumb=it.thumb?`<img class=tthumb src="${esc(it.thumb)}" alt="" loading=lazy onerror="this.style.display='none'">`:`<div class="tthumb ph">${I('play')}</div>`;
  return `<a class=tcard href="${esc(it.link)}" target=_blank rel=noopener>${thumb}<div class=tcard-b><p class="eyebrow src">${esc(it.source)}</p><h3>${esc(it.title)}</h3><p class="muted small">${it.date?esc(ukFmt(it.date)):''} · YouTube ${I('ext','xs')}</p>${itemTags(it)}</div></a>`;
}
function newsCard(it){
  return `<a class=nitem href="${esc(it.link)}" target=_blank rel=noopener><p class="eyebrow src">${esc(it.source)}</p><h3>${esc(it.title)}</h3>${it.excerpt?`<p class="muted small nexcerpt">${esc(it.excerpt)}</p>`:''}<p class="muted small">${it.date?esc(ukFmt(it.date)):''} ${I('ext','xs')}</p>${itemTags(it)}</a>`;
}
function itemsForBar(name){
  const v=(TRENDS.items||[]).filter(it=>(it.bar==name||(it.bars||[]).includes(name)));
  const n=(NEWS.items||[]).filter(it=>(it.bar==name||(it.bars||[]).includes(name)));
  return {videos:v.slice(0,4),news:n.slice(0,4),total:v.length+n.length};
}
function barFeed(b){
  if(!b)return '';
  const {videos,news,total}=itemsForBar(b.name);
  const fol=isFollow(b.name);
  const followBtn=`<button type=button class="btn ghost wide" id=bfol>${I('follow')}${fol?'Following':'Follow'} this bar</button>`;
  if(!total)return `<div class=barfeed>${followBtn}<p class="muted small">Follow to see this bar in Bar News and Trends filters. No recent official videos or articles are in the saved feed.</p></div>`;
  return `<div class=barfeed><h4 class=eyebrow>Latest videos &amp; news</h4>
    ${videos.length?`<div class=tgrid>${videos.map(videoCard).join('')}</div>`:''}
    ${news.length?`<div class=nlist>${news.map(newsCard).join('')}</div>`:''}
    <p class=small><a href="#news">Bar News</a> · <a href="#trends">Trends</a></p>
    ${followBtn}</div>`;
}
function bindFollow(name){
  const b=document.getElementById('bfol');
  if(!b)return;
  b.onclick=()=>{const on=toggleFollow(name);b.innerHTML=`${I('follow')}${on?'Following':'Follow'} this bar`};
}
function trendsView(){
  const raw=[...(TRENDS.items||[])].sort((a,b)=>((isBarVid(b)?1:0)-(isBarVid(a)?1:0))||(b.date||'').localeCompare(a.date||''));
  const items=filterItems(raw,TF);
  const empty=TF.who=='follow'?(!follows().length?EMP('follow','Not following any bars yet','Open a 50 Best bar and tap Follow, or pick All.'):EMP('follow','No videos for bars you follow','When a saved film mentions one, it will show up here.')):
    TF.who=='been'?EMP('check','No matching videos','Mark bars you’ve been to, or pick All.'):
    EMP('play','No videos just now','The next scheduled fetch may add some. Pull to refresh when you’re online.');
  app.innerHTML=`<a class=backl href="#bars">‹ 50 Best</a><section class=hero-s><p class=eyebrow>50 Best · ${B.year||''}</p><h1 class=display>Trends</h1><p class=muted>Recent films from official YouTube channels of The 50 and listed bars. Videos open on YouTube.</p>${feedsMeta(TRENDS)}</section>
    ${barsSeg('trends')}${filterBar(TF)}
    <div id=tv>${items.length?`<div class=tgrid>${items.map(videoCard).join('')}</div>`:empty}</div>`;
  bindFilters(TF,trendsView);
}
function newsView(){
  const raw=NEWS.items||[];
  const items=filterItems(raw,NF);
  const week=items.filter(it=>inThisWeek(it.date));
  const older=items.filter(it=>!inThisWeek(it.date));
  const empty=NF.who=='follow'?(!follows().length?EMP('follow','Not following any bars yet','Open a 50 Best bar and tap Follow, or pick All.'):EMP('follow','No articles for bars you follow','When a saved story mentions one, it will show up here.')):
    NF.who=='been'?EMP('check','No matching articles','Mark bars you’ve been to, or pick All.'):
    EMP('news','No articles just now','The next scheduled fetch may add some.');
  const block=(title,list)=>list.length?`<h2 class="eyebrow weekh">${title}<span class=cnt>${list.length}</span></h2><div class=nlist>${list.map(newsCard).join('')}</div>`:'';
  app.innerHTML=`<a class=backl href="#bars">‹ 50 Best</a><section class=hero-s><p class=eyebrow>This week’s digest</p><h1 class=display>Bar News</h1><p class=muted>Headlines from official bar sites and trusted drinks media. Each piece credits its source and opens on their site.</p>${feedsMeta(NEWS)}</section>
    ${barsSeg('news')}${filterBar(NF)}
    <div id=nv>${items.length?`${block('This week',week)}${block('Earlier',older)}`:empty}</div>`;
  bindFilters(NF,newsView);
}
Object.assign(ICONS,{
  play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  news:'<path d="M5 7h11a2 2 0 0 1 2 2v10H7a2 2 0 0 1-2-2V7z"/><path d="M16 7V5H7a2 2 0 0 0-2 2"/><path d="M8 11h8M8 15h5"/>',
  follow:'<path d="M7 4h10v16l-5-3.2L7 20z"/>'
});
