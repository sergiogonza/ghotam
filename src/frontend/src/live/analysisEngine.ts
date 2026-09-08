export type Tlp = 'TLP:CLEAR'|'TLP:GREEN'|'TLP:AMBER'|'TLP:AMBER+STRICT'|'TLP:RED';
export type RiskLevel = 'LOW'|'GUARDED'|'ELEVATED'|'HIGH'|'CRITICAL';
export type SignalClass = 'established'|'early-warning-plausible'|'early-warning-unusual'|'black-swan-candidate'|'anomalous'|'speculative';
export type QuadrantKey = 'plausible-probable'|'plausible-unlikely'|'weak-probable'|'weak-unlikely';

export type IntelRecord = {
  id:string; title:string; description:string; source:string; link:string; publishedAt:string;
  country?:string; locationLabel?:string; lat?:number; lng?:number; actors:string[]; tags:string[];
  category:string; severity:number; geoConfidence:number; interestScore:number; tlp:Tlp;
};

export type Analysis = {
  plausibility:number; probability:number; novelty:number; momentum:number; impact:number;
  corroboration:number; confidence:number; sourceDiversity:number; recurrence:number;
  riskScore:number; riskLevel:RiskLevel; signalClass:SignalClass; quadrant:QuadrantKey;
};

type PatternStat={count:number;sources:Set<string>;recent24:number;prior72:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const arr=(v:unknown)=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.trim()).map(String):[];
const num=(v:unknown,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const stop=new Set(['the','and','for','with','from','that','this','into','after','over','under','amid','about','says','said','say','new','latest','why','what','how']);

export function normalizeIntel(raw:any,index=0):IntelRecord{
  const allowed:Tlp[]=['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:AMBER+STRICT','TLP:RED'];
  const explicit=String(raw?.tlp||'').toUpperCase() as Tlp;
  const tlp=allowed.includes(explicit)?explicit:'TLP:CLEAR';
  const primary=Array.isArray(raw?.locations)&&raw.locations[0]?raw.locations[0]:null;
  return {
    id:String(raw?.id||`event-${index}`), title:String(raw?.title||'Evento sin título'), description:String(raw?.description||''),
    source:String(raw?.source||raw?.feedId||'Fuente desconocida'), link:String(raw?.link||''), publishedAt:String(raw?.publishedAt||new Date().toISOString()),
    country:typeof raw?.country==='string'?raw.country:(typeof primary?.country==='string'?primary.country:undefined),
    locationLabel:typeof raw?.locationLabel==='string'?raw.locationLabel:(typeof primary?.label==='string'?primary.label:undefined),
    lat:Number.isFinite(Number(raw?.lat))?Number(raw.lat):(Number.isFinite(Number(primary?.lat))?Number(primary.lat):undefined),
    lng:Number.isFinite(Number(raw?.lng))?Number(raw.lng):(Number.isFinite(Number(primary?.lng))?Number(primary.lng):undefined),
    actors:arr(raw?.actors), tags:arr(raw?.tags), category:String(raw?.category||'world'), severity:num(raw?.severity,1),
    geoConfidence:clamp(num(raw?.geoConfidence, raw?.country?.8:0)), interestScore:Math.max(0,Math.min(100,num(raw?.interestScore,num(raw?.severity,1)*10))), tlp,
  };
}

function tokens(title:string){return title.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w)).slice(0,4)}
export function patternKey(e:IntelRecord){const actor=[...e.actors].sort().slice(0,2).join('+');return [e.country||e.locationLabel||'global',e.category,actor||tokens(e.title).join('+')||'generic'].join('|').toLowerCase()}

export function buildPatternStats(events:IntelRecord[]){
  const map=new Map<string,PatternStat>(); const now=Date.now();
  events.forEach(e=>{const k=patternKey(e);const s=map.get(k)||{count:0,sources:new Set<string>(),recent24:0,prior72:0};s.count++;s.sources.add(e.source);const age=(now-Date.parse(e.publishedAt))/36e5;if(age<=24)s.recent24++;else if(age<=96)s.prior72++;map.set(k,s)});
  return map;
}

export function analyzeIntel(e:IntelRecord,stats:Map<string,PatternStat>):Analysis{
  const p=stats.get(patternKey(e))||{count:1,sources:new Set([e.source]),recent24:1,prior72:0};
  const recurrence=clamp((p.count-1)/5); const sourceDiversity=clamp((p.sources.size-1)/4); const corroboration=sourceDiversity;
  const actorSupport=clamp(e.actors.length/3); const ageHours=Math.max(0,(Date.now()-Date.parse(e.publishedAt))/36e5); const recency=clamp(1-ageHours/96);
  const momentum=clamp((p.recent24+0.5)/Math.max(1,p.prior72+1)); const severity=clamp(e.severity/10); const interest=clamp(e.interestScore/100);
  const evidenceCompleteness=clamp((e.source?0.25:0)+(e.description.length>80?0.2:0)+(e.geoConfidence*.25)+(actorSupport*.3));
  const plausibility=clamp(.08+recurrence*.34+sourceDiversity*.26+e.geoConfidence*.14+actorSupport*.12+evidenceCompleteness*.06);
  const probability=clamp(.06+recency*.16+momentum*.28+sourceDiversity*.22+severity*.14+interest*.14);
  const novelty=clamp(1-(recurrence*.50+sourceDiversity*.28+actorSupport*.22));
  const impact=clamp(severity*.58+interest*.32+(e.actors.length>=2?.10:0));
  const confidence=clamp(evidenceCompleteness*.45+sourceDiversity*.35+e.geoConfidence*.20);
  const risk=clamp(impact*.35+probability*.25+confidence*.15+momentum*.15+severity*.10);
  const riskScore=risk*10;
  const riskLevel:RiskLevel=riskScore>=8?'CRITICAL':riskScore>=6.5?'HIGH':riskScore>=4.5?'ELEVATED':riskScore>=2.5?'GUARDED':'LOW';
  const plausible=plausibility>=.55, probable=probability>=.55;
  const quadrant:QuadrantKey=plausible?(probable?'plausible-probable':'plausible-unlikely'):(probable?'weak-probable':'weak-unlikely');
  let signalClass:SignalClass='speculative';
  if(novelty>=.72&&impact>=.72&&plausibility<.50&&probability<.50) signalClass='black-swan-candidate';
  else if(plausibility>=.58&&probability>=.58) signalClass='established';
  else if(plausibility>=.58&&probability<.58&&momentum>=.30) signalClass='early-warning-plausible';
  else if(plausibility<.58&&probability>=.48&&novelty>=.52) signalClass='early-warning-unusual';
  else if(novelty>=.60&&plausibility<.50) signalClass='anomalous';
  return {plausibility,probability,novelty,momentum,impact,corroboration,confidence,sourceDiversity,recurrence,riskScore,riskLevel,signalClass,quadrant};
}

export function analyzeAll(raw:any[]){const events=raw.map(normalizeIntel);const stats=buildPatternStats(events);return events.map(event=>({event,analysis:analyzeIntel(event,stats)}))}

export function semanticSimilarity(a:IntelRecord,b:IntelRecord){
  const sa=new Set([...tokens(a.title),...a.actors.map(x=>x.toLowerCase()),String(a.country||'').toLowerCase(),a.category.toLowerCase()].filter(Boolean));
  const sb=new Set([...tokens(b.title),...b.actors.map(x=>x.toLowerCase()),String(b.country||'').toLowerCase(),b.category.toLowerCase()].filter(Boolean));
  const inter=[...sa].filter(x=>sb.has(x)).length; const union=new Set([...sa,...sb]).size;
  const lexical=union?inter/union:0; const actor=a.actors.some(x=>b.actors.includes(x))?.22:0; const location=(a.country&&a.country===b.country)?.18:0;
  return clamp(lexical*.6+actor+location);
}

export const riskRelationWeights:Record<string,number>={
  INVOLVES:.86, MENTIONS:.62, OCCURRED_AT:.78, LOCATED_AT:.72, AFFECTS:.90, THREATENS:.92,
  ENABLES:.88, INCREASES_RISK_OF:.95, RELATED_TO:.66, linkedEvent:.72, linkedPerson:.68, linkedFacility:.72,
  PUBLISHED_BY:0, SUPPORTED_BY:0, CONTRADICTED_BY:0, DERIVED_FROM:0,
};

export function propagatedRisk(sourceRisk:number,relationship:string,depth:number,decay=.68){
  const weight=riskRelationWeights[relationship]??.55; if(weight<=0)return 0;
  return Math.max(0,Math.min(10,sourceRisk*weight*Math.pow(decay,Math.max(0,depth-1))));
}
