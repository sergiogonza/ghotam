const FEED='https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts';
const QUERIES=[
 'geopolitics OR diplomacy OR ceasefire OR sanctions OR war',
 'election OR parliament OR bill OR referendum OR government reform',
 'NATO OR Ukraine OR Russia OR Israel OR Iran OR Taiwan OR China',
 'border dispute OR coup OR protest OR mobilization OR treaty',
 'nuclear OR IAEA OR missile OR drone OR military'
];
const GEO=[
 ['ukraine','Ukraine',48.3794,31.1656],['kyiv','Ukraine',50.4501,30.5234],['russia','Russia',61.5240,105.3188],['moscow','Russia',55.7558,37.6173],
 ['israel','Israel',31.0461,34.8516],['gaza','Palestine',31.5017,34.4668],['iran','Iran',32.4279,53.6880],['tehran','Iran',35.6892,51.3890],
 ['taiwan','Taiwan',23.6978,120.9605],['china','China',35.8617,104.1954],['beijing','China',39.9042,116.4074],['lebanon','Lebanon',33.8547,35.8623],
 ['syria','Syria',34.8021,38.9968],['yemen','Yemen',15.5527,48.5164],['sudan','Sudan',12.8628,30.2176],['venezuela','Venezuela',6.4238,-66.5897],
 ['guyana','Guyana',4.8604,-58.9302],['poland','Poland',51.9194,19.1451],['india','India',20.5937,78.9629],['pakistan','Pakistan',30.3753,69.3451],
 ['north korea','North Korea',40.3399,127.5101],['south korea','South Korea',35.9078,127.7669],['japan','Japan',36.2048,138.2529],['colombia','Colombia',4.5709,-74.2973]
];
const ACTORS={NATO:['nato'],Ukraine:['ukraine','kyiv'],Russia:['russia','moscow','kremlin'],Israel:['israel','idf'],Iran:['iran','tehran','irgc'],China:['china','beijing','pla'],Taiwan:['taiwan'],USA:['united states','white house','pentagon','washington'],EU:['european union','brussels'],UN:['united nations','un '],India:['india'],Pakistan:['pakistan']};
function strip(s=''){return String(s).replace(/\s+/g,' ').trim()}
function family(t){t=t.toLowerCase();if(/ceasefire|peace|talks|summit|treaty|diplomac/.test(t))return'diplomacy';if(/election|vote|referendum|parliament|bill|legislation|reform/.test(t))return'political-reform';if(/sanction|tariff|embargo|trade/.test(t))return'sanctions-trade';if(/war|attack|strike|missile|drone|military|mobilization|invasion/.test(t))return'conflict-escalation';if(/protest|riot|coup|unrest/.test(t))return'protest-unrest';if(/nuclear|iaea|uranium/.test(t))return'nuclear';return'geopolitics-general'}
function geo(text){const t=text.toLowerCase();for(const [k,c,lat,lng] of GEO)if(t.includes(k))return{country:c,locationLabel:k.replace(/\b\w/g,x=>x.toUpperCase()),lat,lng,geoConfidence:.72};return{}}
function actors(text){const t=text.toLowerCase();return Object.entries(ACTORS).filter(([,ks])=>ks.some(k=>t.includes(k))).map(([a])=>a)}
function severity(t){t=t.toLowerCase();let s=2;if(/war|attack|strike|missile|drone|invasion/.test(t))s+=4;if(/nuclear|coup|mobilization/.test(t))s+=2;if(/sanction|ceasefire|treaty|referendum/.test(t))s+=1;return Math.min(10,s)}
async function search(q){const u=new URL(FEED);u.searchParams.set('q',q);u.searchParams.set('limit','35');u.searchParams.set('sort','latest');const r=await fetch(u,{headers:{accept:'application/json','user-agent':'GHOTAM/1.0'}});if(!r.ok)throw new Error(`Bluesky ${r.status}`);return r.json()}
export async function handler(){try{const settled=await Promise.allSettled(QUERIES.map(search));const out=[];const seen=new Set();for(const s of settled){if(s.status!=='fulfilled')continue;for(const p of s.value.posts||[]){const rec=p.record||{},text=strip(rec.text||'');if(!text)continue;const uri=String(p.uri||'');if(seen.has(uri))continue;seen.add(uri);const g=geo(text),f=family(text),sev=severity(text),who=actors(text);const rkey=String(p.author?.handle||p.author?.displayName||'Bluesky');out.push({id:`BSKY:${uri||Math.random()}`,title:text.slice(0,160),description:text,source:`Bluesky · ${rkey}`,feedId:'bluesky',sourceClass:'social',origin:'bluesky',link:p.author?.handle&&uri?`https://bsky.app/profile/${p.author.handle}/post/${uri.split('/').pop()}`:'',publishedAt:String(rec.createdAt||p.indexedAt||new Date().toISOString()),actors:who,tags:['bluesky','social-signal',f],category:'geopolitics',patternFamily:f,severity:sev,interestScore:Math.min(100,sev*10+(who.length*5)+(Number(p.likeCount||0)+Number(p.repostCount||0)>20?10:0)),tlp:'TLP:CLEAR',socialMetrics:{likes:Number(p.likeCount||0),reposts:Number(p.repostCount||0),replies:Number(p.replyCount||0)},...g});}}
 out.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));return{statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({updatedAt:new Date().toISOString(),source:'Bluesky public search',count:out.length,events:out.slice(0,180)})};}catch(e){return{statusCode:500,headers:{'content-type':'application/json'},body:JSON.stringify({error:e instanceof Error?e.message:'Bluesky ingest failed',events:[]})}}
}
