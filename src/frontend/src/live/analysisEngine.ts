export type Tlp = 'TLP:CLEAR' | 'TLP:GREEN' | 'TLP:AMBER' | 'TLP:AMBER+STRICT' | 'TLP:RED';
export type RiskLevel = 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
export type SignalClass = 'established' | 'early-warning-plausible' | 'early-warning-unusual' | 'black-swan-candidate' | 'anomalous' | 'speculative';
export type QuadrantKey = 'plausible-probable' | 'plausible-unlikely' | 'weak-probable' | 'weak-unlikely';

export type IntelRecord = {
  id:string; title:string; description:string; source:string; link:string; publishedAt:string;
  country?:string; locationLabel?:string; lat?:number; lng?:number; actors:string[]; tags:string[];
  category:string; patternFamily:string; severity:number; geoConfidence:number; interestScore:number; tlp:Tlp;
};

export type Analysis = {
  plausibility:number; probability:number; novelty:number; momentum:number; impact:number;
  corroboration:number; confidence:number; sourceDiversity:number; recurrence:number;
  riskScore:number; riskLevel:RiskLevel; signalClass:SignalClass; quadrant:QuadrantKey;
  patternFamily:string; patternCount:number;
};

type PatternStat = {
  count:number; sources:Set<string>; recent24:number; prior144:number;
  actors:Set<string>; countries:Set<string>;
};

const clamp = (n:number) => Math.max(0, Math.min(1, n));
const arr = (v:unknown) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(String) : [];
const num = (v:unknown, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const stop = new Set(['the','and','for','with','from','that','this','into','after','over','under','amid','about','says','said','say','new','latest','why','what','how']);

const FAMILY_RULES:[string,string[]][] = [
  ['nuclear',['nuclear','iaea','uranium','atomic']],
  ['conflict-escalation',['attack','strike','war','offensive','missile','drone','troops','military','shelling','invasion']],
  ['diplomacy',['diplomacy','talks','negotiation','summit','ceasefire','peace deal','treaty','recognition']],
  ['elections',['election','vote','poll','campaign','ballot']],
  ['political-reform',['reform','constitution','parliament','bill','legislation','referendum','coalition','cabinet']],
  ['sanctions-trade',['sanction','embargo','tariff','export control','trade war']],
  ['alliance-security',['nato','alliance','defense pact','security agreement']],
  ['territorial-dispute',['border','territorial','disputed','annex','sovereignty','strait','sea claim','essequibo']],
  ['protest-unrest',['protest','demonstration','riot','unrest','strike','coup']],
  ['governance',['government','president','prime minister','minister','governance','opposition']],
  ['energy-geopolitics',['oil','gas','opec','pipeline','energy','hormuz']],
  ['migration',['migration','migrant','refugee','border crossing']],
];

function inferFamily(raw:any,title:string,description:string,category:string){
  if(typeof raw?.patternFamily === 'string' && raw.patternFamily) return raw.patternFamily;
  const text = `${title} ${description}`.toLowerCase();
  for(const [family,keys] of FAMILY_RULES) if(keys.some(k => text.includes(k))) return family;
  if(category === 'political-reform') return 'political-reform';
  if(category === 'geoeconomics') return 'sanctions-trade';
  if(category === 'energy-geopolitics') return 'energy-geopolitics';
  return 'geopolitics-general';
}

export function normalizeIntel(raw:any,index=0):IntelRecord{
  const allowed:Tlp[] = ['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:AMBER+STRICT','TLP:RED'];
  const explicit = String(raw?.tlp || '').toUpperCase() as Tlp;
  const tlp:Tlp = allowed.includes(explicit) ? explicit : 'TLP:CLEAR';
  const primary = Array.isArray(raw?.locations) && raw.locations[0] ? raw.locations[0] : null;
  const title = String(raw?.title || 'Evento sin título');
  const description = String(raw?.description || '');
  const category = String(raw?.category || 'geopolitics');
  const fallbackGeo = raw?.country ? 0.8 : 0;

  return {
    id:String(raw?.id || `event-${index}`),
    title,
    description,
    source:String(raw?.source || raw?.feedId || 'Fuente desconocida'),
    link:String(raw?.link || ''),
    publishedAt:String(raw?.publishedAt || new Date().toISOString()),
    country:typeof raw?.country === 'string' ? raw.country : (typeof primary?.country === 'string' ? primary.country : undefined),
    locationLabel:typeof raw?.locationLabel === 'string' ? raw.locationLabel : (typeof primary?.label === 'string' ? primary.label : undefined),
    lat:Number.isFinite(Number(raw?.lat)) ? Number(raw.lat) : (Number.isFinite(Number(primary?.lat)) ? Number(primary.lat) : undefined),
    lng:Number.isFinite(Number(raw?.lng)) ? Number(raw.lng) : (Number.isFinite(Number(primary?.lng)) ? Number(primary.lng) : undefined),
    actors:arr(raw?.actors),
    tags:arr(raw?.tags),
    category,
    patternFamily:inferFamily(raw,title,description,category),
    severity:num(raw?.severity,1),
    geoConfidence:clamp(num(raw?.geoConfidence,fallbackGeo)),
    interestScore:Math.max(0,Math.min(100,num(raw?.interestScore,num(raw?.severity,1)*10))),
    tlp,
  };
}

function tokens(title:string){
  return title.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g,' ').split(/\s+/).filter(w => w.length > 3 && !stop.has(w)).slice(0,5);
}

export function patternKey(e:IntelRecord){
  return `${String(e.country || 'global').toLowerCase()}|${e.patternFamily}`;
}

export function buildPatternStats(events:IntelRecord[]){
  const map = new Map<string,PatternStat>();
  const now = Date.now();
  for(const e of events){
    const keys = [patternKey(e), `global|${e.patternFamily}`];
    for(const key of keys){
      const stat = map.get(key) || {count:0,sources:new Set<string>(),recent24:0,prior144:0,actors:new Set<string>(),countries:new Set<string>()};
      stat.count++;
      stat.sources.add(e.source);
      e.actors.forEach(a => stat.actors.add(a));
      if(e.country) stat.countries.add(e.country);
      const age = (now - Date.parse(e.publishedAt)) / 36e5;
      if(age <= 24) stat.recent24++;
      else if(age <= 168) stat.prior144++;
      map.set(key,stat);
    }
  }
  return map;
}

export function analyzeIntel(e:IntelRecord,stats:Map<string,PatternStat>):Analysis{
  const local = stats.get(patternKey(e));
  const global = stats.get(`global|${e.patternFamily}`);
  const p:PatternStat = local && local.count >= 2 ? local : (global || {
    count:1,sources:new Set([e.source]),recent24:1,prior144:0,
    actors:new Set(e.actors),countries:new Set(e.country ? [e.country] : []),
  });

  const recurrence = clamp((p.count - 1) / 8);
  const sourceDiversity = clamp((p.sources.size - 1) / 5);
  const corroboration = clamp(sourceDiversity * .7 + Math.min(p.count,8) / 8 * .3);
  const actorSupport = clamp(Math.max(e.actors.length / 4, p.actors.size / 10));
  const geographicSpread = clamp((p.countries.size - 1) / 6);
  const ageHours = Math.max(0,(Date.now() - Date.parse(e.publishedAt)) / 36e5);
  const recency = clamp(1 - ageHours / 168);
  const baseline = Math.max(1,p.prior144 / 6);
  const momentum = clamp((p.recent24 + .5) / (baseline + 1.25));
  const severity = clamp(e.severity / 10);
  const interest = clamp(e.interestScore / 100);
  const evidenceCompleteness = clamp(
    (e.source ? .18 : 0) +
    (e.description.length > 80 ? .18 : 0) +
    e.geoConfidence * .2 +
    actorSupport * .24 +
    (e.patternFamily !== 'geopolitics-general' ? .2 : 0)
  );

  const plausibility = clamp(.12 + recurrence*.30 + sourceDiversity*.24 + corroboration*.13 + e.geoConfidence*.08 + actorSupport*.08 + evidenceCompleteness*.05);
  const probability = clamp(.08 + recency*.18 + momentum*.24 + corroboration*.20 + severity*.12 + interest*.12 + geographicSpread*.06);
  const novelty = clamp(1 - (recurrence*.42 + sourceDiversity*.28 + corroboration*.16 + actorSupport*.09 + geographicSpread*.05));
  const strategicFamilyBoost = (e.patternFamily === 'nuclear' || e.patternFamily === 'conflict-escalation') ? .10 : 0;
  const impact = clamp(severity*.48 + interest*.32 + (e.actors.length >= 2 ? .10 : 0) + strategicFamilyBoost);
  const confidence = clamp(evidenceCompleteness*.35 + sourceDiversity*.30 + corroboration*.20 + e.geoConfidence*.15);
  const risk = clamp(impact*.35 + probability*.25 + confidence*.15 + momentum*.15 + severity*.10);
  const riskScore = risk * 10;
  const riskLevel:RiskLevel = riskScore >= 8 ? 'CRITICAL' : riskScore >= 6.5 ? 'HIGH' : riskScore >= 4.5 ? 'ELEVATED' : riskScore >= 2.5 ? 'GUARDED' : 'LOW';
  const plausible = plausibility >= .52;
  const probable = probability >= .55;
  const quadrant:QuadrantKey = plausible ? (probable ? 'plausible-probable' : 'plausible-unlikely') : (probable ? 'weak-probable' : 'weak-unlikely');

  let signalClass:SignalClass = 'speculative';
  if(novelty >= .76 && impact >= .72 && plausibility < .48 && probability < .48) signalClass = 'black-swan-candidate';
  else if(plausibility >= .58 && probability >= .58) signalClass = 'established';
  else if(plausibility >= .55 && probability < .58 && momentum >= .28) signalClass = 'early-warning-plausible';
  else if(plausibility < .58 && probability >= .50 && novelty >= .48) signalClass = 'early-warning-unusual';
  else if(novelty >= .62 && plausibility < .50) signalClass = 'anomalous';

  return {plausibility,probability,novelty,momentum,impact,corroboration,confidence,sourceDiversity,recurrence,riskScore,riskLevel,signalClass,quadrant,patternFamily:e.patternFamily,patternCount:p.count};
}

export function analyzeAll(raw:any[]){
  const events = raw.map(normalizeIntel);
  const stats = buildPatternStats(events);
  return events.map(event => ({event,analysis:analyzeIntel(event,stats)}));
}

export function semanticSimilarity(a:IntelRecord,b:IntelRecord){
  const sa = new Set([...tokens(a.title),...a.actors.map(x=>x.toLowerCase()),String(a.country||'').toLowerCase(),a.category.toLowerCase(),a.patternFamily].filter(Boolean));
  const sb = new Set([...tokens(b.title),...b.actors.map(x=>x.toLowerCase()),String(b.country||'').toLowerCase(),b.category.toLowerCase(),b.patternFamily].filter(Boolean));
  const inter = [...sa].filter(x=>sb.has(x)).length;
  const union = new Set([...sa,...sb]).size;
  const lexical = union ? inter/union : 0;
  const actor = a.actors.some(x=>b.actors.includes(x)) ? .20 : 0;
  const location = a.country && a.country === b.country ? .16 : 0;
  const family = a.patternFamily === b.patternFamily ? .22 : 0;
  return clamp(lexical*.42 + actor + location + family);
}

export const riskRelationWeights:Record<string,number>={
  INVOLVES:.86,MENTIONS:.62,OCCURRED_AT:.78,LOCATED_AT:.72,AFFECTS:.90,THREATENS:.92,
  ENABLES:.88,INCREASES_RISK_OF:.95,RELATED_TO:.66,linkedEvent:.72,linkedPerson:.68,linkedFacility:.72,
  PUBLISHED_BY:0,SUPPORTED_BY:0,CONTRADICTED_BY:0,DERIVED_FROM:0,
};

export function propagatedRisk(sourceRisk:number,relationship:string,depth:number,decay=.68){
  const weight = riskRelationWeights[relationship] ?? .55;
  if(weight <= 0) return 0;
  return Math.max(0,Math.min(10,sourceRisk*weight*Math.pow(decay,Math.max(0,depth-1))));
}
