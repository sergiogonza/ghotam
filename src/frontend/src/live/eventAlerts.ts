import { getMemoryValue,setMemoryValue,loadAllIntel } from './offlineStore';
export type NewEventSummary={newEvents:any[];minute:number;hour:number;day:number;lastCheckedAt:string};
const KEY='seen-event-index-v1';
export async function checkForNewEvents(force=true):Promise<NewEventSummary>{
  const events=await loadAllIntel(force);const previous=await getMemoryValue<Record<string,string>>(KEY).catch(()=>undefined)||{};const now=Date.now();
  const current:Record<string,string>={};events.forEach(e=>current[String(e.id||e.link)]=String(e.publishedAt||new Date().toISOString()));
  const newEvents=events.filter(e=>!previous[String(e.id||e.link)]).slice(0,80);
  await setMemoryValue(KEY,current).catch(()=>{});
  const age=(e:any)=>(now-Date.parse(String(e.publishedAt||now)))/60000;
  return{newEvents,minute:newEvents.filter(e=>age(e)<=1).length,hour:newEvents.filter(e=>age(e)<=60).length,day:newEvents.filter(e=>age(e)<=1440).length,lastCheckedAt:new Date().toISOString()};
}
export async function primeEventIndex(){const existing=await getMemoryValue<Record<string,string>>(KEY).catch(()=>undefined);if(existing&&Object.keys(existing).length)return;const events=await loadAllIntel(false);const current:Record<string,string>={};events.forEach(e=>current[String(e.id||e.link)]=String(e.publishedAt||new Date().toISOString()));await setMemoryValue(KEY,current)}
