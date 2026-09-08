const CACHE='ghotam-shell-v3';
const MAP_CACHE='ghotam-map-v1';
const CORE=['/','/index.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>![CACHE,MAP_CACHE].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if(['/api/rss','/api/telegram','/api/lm','/api/geocode'].includes(url.pathname))return;
  if(url.hostname.endsWith('tile.openstreetmap.org')){event.respondWith(caches.open(MAP_CACHE).then(cache=>cache.match(req).then(hit=>hit||fetch(req).then(res=>{cache.put(req,res.clone());return res}))));return;}
  if(req.mode==='navigate'){event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('/index.html',copy));return res}).catch(()=>caches.match('/index.html').then(r=>r||caches.match('/'))));return;}
  if(url.origin===self.location.origin){event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));}
});
