import { listManualEvents, saveManualEvent, makeManualId, type ManualIntelEvent } from './offlineStore';

type ImportResult={total:number;inserted:number;updated:number;skipped:number;errors:string[]};

const arr=(v:any)=>Array.isArray(v)?v:[];
const str=(v:any)=>typeof v==='string'?v.trim():'';
const num=(v:any,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const strings=(v:any)=>Array.isArray(v)?v.map(String).map(x=>x.trim()).filter(Boolean):typeof v==='string'?v.split(',').map(x=>x.trim()).filter(Boolean):[];
const validTlp=(v:any):ManualIntelEvent['tlp']=>['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:AMBER+STRICT','TLP:RED'].includes(String(v).toUpperCase())?String(v).toUpperCase() as ManualIntelEvent['tlp']:'TLP:CLEAR';

export function extractJsonEvents(parsed:any):any[]{
  if(Array.isArray(parsed))return parsed;
  if(parsed?.schema==='GHOTAM_CORPUS_V1'&&Array.isArray(parsed.documents))return parsed.documents;
  if(Array.isArray(parsed?.events))return parsed.events;
  if(Array.isArray(parsed?.documents))return parsed.documents;
  if(parsed&&typeof parsed==='object')return [parsed];
  throw new Error('El JSON no contiene eventos reconocibles.');
}

function stableKey(e:any){
  const id=str(e?.id||e?.eventId);if(id)return `id:${id}`;
  const url=str(e?.link||e?.url||e?.sourceUrl);if(url)return `url:${url}`;
  return `sig:${str(e?.title).toLowerCase()}|${str(e?.publishedAt||e?.date)}`;
}

export function normalizeImportedEvent(raw:any,index=0):ManualIntelEvent{
  const now=new Date().toISOString();
  const sourceObj=raw?.source&&typeof raw.source==='object'?raw.source:null;
  const locationObj=raw?.location&&typeof raw.location==='object'?raw.location:null;
  const analytics=raw?.analytics&&typeof raw.analytics==='object'?raw.analytics:null;
  const title=str(raw?.title||raw?.name)||`Imported event ${index+1}`;
  const description=str(raw?.description)||str(raw?.text)||'';
  const publishedRaw=raw?.publishedAt||raw?.timestamp||raw?.date||now;
  const date=new Date(publishedRaw);const publishedAt=Number.isNaN(date.getTime())?now:date.toISOString();
  const country=str(raw?.country)||str(locationObj?.country)||undefined;
  const city=str(raw?.city)||str(locationObj?.city)||undefined;
  const zone=str(raw?.zone)||str(locationObj?.zone)||undefined;
  const locationLabel=str(raw?.locationLabel)||str(locationObj?.label)||str(locationObj?.name)||[zone,city,country].filter(Boolean).join(', ')||undefined;
  const latCandidate=raw?.lat??locationObj?.lat;const lngCandidate=raw?.lng??raw?.lon??locationObj?.lng??locationObj?.lon;
  const lat=Number.isFinite(Number(latCandidate))?Number(latCandidate):undefined;const lng=Number.isFinite(Number(lngCandidate))?Number(lngCandidate):undefined;
  const source=str(sourceObj?.name)||str(raw?.source)||str(raw?.feedId)||'JSON Import';
  const link=str(raw?.link)||str(raw?.url)||str(sourceObj?.url)||'';
  const severity=clamp(num(raw?.severity,analytics?.riskScore?num(analytics.riskScore):5),0,10);
  const interestScore=clamp(num(raw?.interestScore,50),0,100);
  const geoConfidence=clamp(num(raw?.geoConfidence,lat!==undefined&&lng!==undefined?0.9:0),0,1);
  return{
    id:str(raw?.id||raw?.eventId)||makeManualId(),title,description,source,link,publishedAt,
    image:str(raw?.image)||undefined,country,city,zone,locationLabel,lat,lng,
    actors:strings(raw?.actors),tags:[...new Set([...strings(raw?.tags),str(raw?.patternFamily||analytics?.patternFamily),str(analytics?.signalClass),str(analytics?.riskLevel)].filter(Boolean))],
    category:str(raw?.category)||str(raw?.patternFamily)||'geopolitics',severity,interestScore,geoConfidence,
    tlp:validTlp(raw?.tlp),origin:'manual',status:raw?.status==='draft'?'draft':'published',createdAt:str(raw?.createdAt)||now,updatedAt:now,
  };
}

export async function importJsonEvents(parsed:any):Promise<ImportResult>{
  const rows=extractJsonEvents(parsed);const current=await listManualEvents();const byKey=new Map(current.map(e=>[stableKey(e),e]));
  let inserted=0,updated=0,skipped=0;const errors:string[]=[];
  for(let i=0;i<rows.length;i++){
    try{
      const normalized=normalizeImportedEvent(rows[i],i);if(!normalized.title.trim()){skipped++;continue}
      const key=stableKey(normalized);const existing=byKey.get(key);
      if(existing){normalized.id=existing.id;normalized.createdAt=existing.createdAt;updated++;}else inserted++;
      await saveManualEvent(normalized);byKey.set(key,normalized);
    }catch(e){skipped++;errors.push(`Fila ${i+1}: ${e instanceof Error?e.message:'error'}`)}
  }
  return{total:rows.length,inserted,updated,skipped,errors};
}
