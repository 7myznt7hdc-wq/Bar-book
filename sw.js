const V='barbook-v4',F=['./','index.html','style.css','app.js','manifest.json','icon-192.png','icon-512.png','data/cocktails.json','data/bars.json','data/classics.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// network-first for data (stay updated), cache-first otherwise
self.addEventListener('fetch',e=>{if(e.request.method!='GET')return;const u=new URL(e.request.url);
 if(u.pathname.includes('/data/'))e.respondWith(fetch(e.request).then(r=>{caches.open(V).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request)));
 else e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
