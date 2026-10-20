const V='barbook-v13',IMG='barbook-img-v1',MAXIMG=250;
const F=['./','index.html','style.css','app.js','features.js','seasonal.js','favs.js','more.js','manifest.json','icon-192.png','icon-512.png','data/cocktails.json','data/bars.json','data/classics.json','data/seasonal.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=V&&x!=IMG).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
async function trim(c){const k=await c.keys();for(let i=0;i<k.length-MAXIMG;i++)await c.delete(k[i])}
self.addEventListener('fetch',e=>{if(e.request.method!='GET')return;const u=new URL(e.request.url);
 if(u.hostname.endsWith('thecocktaildb.com')&&u.pathname.includes('/images/')){ // runtime image cache, cache-first, capped
  e.respondWith(caches.open(IMG).then(async c=>{const hit=await c.match(e.request);if(hit)return hit;try{const r=await fetch(e.request);if(r.ok||r.type=='opaque'){await c.put(e.request,r.clone());trim(c)}return r}catch(err){return Response.error()}}));return}
 if(u.origin!=location.origin)return;
 if(u.pathname.includes('/data/'))e.respondWith(fetch(e.request).then(r=>{const cl=r.clone();caches.open(V).then(c=>c.put(e.request,cl));return r}).catch(()=>caches.match(e.request)));
 else e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
