export type ManualIntelEvent = {
  id:string;title:string;description:string;source:string;link:string;publishedAt:string;image?:string;country?:string;city?:string;zone?:string;locationLabel?:string;lat?:number;lng?:number;actors:string[];tags:string[];category:string;severity:number;interestScore:number;geoConfidence:number;tlp:'TLP:CLEAR'|'TLP:GREEN'|'TLP:AMBER'|'TLP:AMBER+STRICT'|'TLP:RED';origin:'manual';status:'published'|'draft';createdAt:string;updatedAt:string;
};

const DB='ghotam-offline',VERSION=1,EVENTS='manual-events',KV='kv';
export const OFFLINE_CHANGED='ghotam:offline-events-changed';
const nativeFetch=typeof window!=='undefined'?window.fetch.bind(window):fetch;

function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(EVENTS))db.createObjectStore(EVENTS,{keyPath:'id'});if(!db.objectStoreNames.contains(KV))db.createObjectStore(KV,{keyPath:'key'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function done(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
export async function listManualEvents():Promise<ManualIntelEvent[]>{const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(EVENTS,'readonly').objectStore(EVENTS).getAll();req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)));req.onerror=()=>reject(req.error)})}
export async function saveManualEvent(event:ManualIntelEvent){const db=await openDb();const tx=db.transaction(EVENTS,'readwrite');tx.objectStore(EVENTS).put(event);await done(tx);window.dispatchEvent(new Event(OFFLINE_CHANGED));return event}
export async function deleteManualEvent(id:string){const db=await openDb();const tx=db.transaction(EVENTS,'readwrite');tx.objectStore(EVENTS).delete(id);await done(tx);window.dispatchEvent(new Event(OFFLINE_CHANGED))}
export async function replaceManualEvents(events:ManualIntelEvent[]){const db=await openDb();const tx=db.transaction(EVENTS,'readwrite');const store=tx.objectStore(EVENTS);store.clear();events.forEach(e=>store.put(e));await done(tx);window.dispatchEvent(new Event(OFFLINE_CHANGED))}
async function getKv<T>(key:string):Promise<T|undefined>{const db=await openDb();return new Promise((resolve,reject)=>{const req=db.transaction(KV,'readonly').objectStore(KV).get(key);req.onsuccess=()=>resolve(req.result?.value as T|undefined);req.onerror=()=>reject(req.error)})}
async function setKv(key:string,value:any){const db=await openDb();const tx=db.transaction(KV,'readwrite');tx.objectStore(KV).put({key,value,at:new Date().toISOString()});await done(tx)}
function mergeEvents(remote:any[],manual:ManualIntelEvent[]){const byId=new Map<string,any>();remote.forEach((e,i)=>byId.set(String(e?.id||`rss-${i}`),e));manual.filter(e=>e.status==='published').forEach(e=>byId.set(e.id,{...e,feedId:'manual',source:e.source||'GHOTAM Admin',locations:typeof e.lat==='number'&&typeof e.lng==='number'?[{label:e.locationLabel||e.city||e.zone||e.country||'Manual location',country:e.country,lat:e.lat,lng:e.lng,confidence:e.geoConfidence}]:[]}));return[...byId.values()].sort((a,b)=>Date.parse(String(b.publishedAt||0))-Date.parse(String(a.publishedAt||0)))}

async function loadRemote(force=false){const r=await nativeFetch('/api/rss',{headers:{accept:'application/json'},cache:force?'no-store':'default'});const ct=r.headers.get('content-type')||'';if(!r.ok||!ct.includes('application/json'))throw new Error(`RSS ${r.status}`);const d=await r.json();const remote=Array.isArray(d?.events)?d.events:[];await setKv('rss-cache',remote).catch(()=>{});return remote}
export async function loadCombinedIntel(force=false):Promise<any[]>{const manual=await listManualEvents().catch(()=>[]);if(force||navigator.onLine){try{return mergeEvents(await loadRemote(force),manual)}catch{}}const cached=await getKv<any[]>('rss-cache').catch(()=>undefined);return mergeEvents(Array.isArray(cached)?cached:[],manual)}

let interceptorInstalled=false;
export function installIntelFetchInterceptor(){
  if(typeof window==='undefined'||interceptorInstalled)return;interceptorInstalled=true;
  window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
    let parsed:URL;try{parsed=new URL(url,window.location.href)}catch{return nativeFetch(input as any,init)}
    if(parsed.origin===window.location.origin&&parsed.pathname==='/api/rss'&&(!init?.method||init.method.toUpperCase()==='GET')){
      const events=await loadCombinedIntel(Boolean(init?.cache==='no-store'));
      return new Response(JSON.stringify({updatedAt:new Date().toISOString(),offlineAware:true,events}),{status:200,headers:{'content-type':'application/json','cache-control':'no-store'}});
    }
    return nativeFetch(input as any,init);
  }) as typeof window.fetch;
}

export function fileToDataUrl(file:File):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
export function makeManualId(){return `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
