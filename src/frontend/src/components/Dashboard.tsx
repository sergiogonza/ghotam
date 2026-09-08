import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Globe2, Network, RefreshCcw, ShieldCheck, TrendingUp, Radar, Sparkles } from 'lucide-react';

type Tlp = 'TLP:CLEAR'|'TLP:GREEN'|'TLP:AMBER'|'TLP:AMBER+STRICT'|'TLP:RED';
type LiveEvent = {
  id: string; title: string; description: string; source: string; publishedAt: string;
  country?: string; lat?: number; lng?: number; actors: string[]; severity: number;
  geoConfidence: number; interestScore: number; category: string; tlp: Tlp;
};
type QuadrantKey = 'plausible-probable'|'plausible-unlikely'|'weak-probable'|'weak-unlikely';
type SignalClass = 'established'|'early-warning-plausible'|'early-warning-unusual'|'black-swan-candidate'|'speculative';
type PatternStat = { count:number; sources:Set<string>; recent24:number; prior72:number };

type Analysis = {
  plausibility:number;
  probability:number;
  novelty:number;
  momentum:number;
  impact:number;
  corroboration:number;
  signalClass:SignalClass;
};

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const safeArray=<T,>(v:unknown):T[]=>Array.isArray(v)?v as T[]:[];
const stop=new Set(['the','and','for','with','from','that','this','into','after','over','under','amid','about','says','say','new','latest']);

function normalizeEvent(raw:any,index:number):LiveEvent{
  const allowed:Tlp[]=['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:AMBER+STRICT','TLP:RED'];
  const explicit=String(raw?.tlp||'').toUpperCase();
  const tlp=allowed.includes(explicit as Tlp)?explicit as Tlp:'TLP:CLEAR';
  return {
    id:String(raw?.id||`event-${index}`),title:String(raw?.title||'Evento sin título'),description:String(raw?.description||''),
    source:String(raw?.source||raw?.feedId||'Fuente desconocida'),publishedAt:String(raw?.publishedAt||new Date().toISOString()),
    country:typeof raw?.country==='string'?raw.country:undefined,
    lat:Number.isFinite(Number(raw?.lat))?Number(raw.lat):undefined,lng:Number.isFinite(Number(raw?.lng))?Number(raw.lng):undefined,
    actors:safeArray<string>(raw?.actors).filter(a=>typeof a==='string'),severity:Number.isFinite(Number(raw?.severity))?Number(raw.severity):1,
    geoConfidence:Number.isFinite(Number(raw?.geoConfidence))?clamp(Number(raw.geoConfidence)):(raw?.country?.8:0),
    interestScore:Number.isFinite(Number(raw?.interestScore))?Number(raw.interestScore):Number(raw?.severity||1)*10,
    category:String(raw?.category||'world'),tlp,
  };
}

function titleTokens(title:string){
  return title.toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w)).slice(0,3);
}
function patternKey(e:LiveEvent){
  const actorKey=[...e.actors].sort().slice(0,2).join('+');
  const lexical=titleTokens(e.title).join('+');
  return [e.country||'global',e.category,actorKey||lexical||'generic'].join('|').toLowerCase();
}
function buildPatternStats(events:LiveEvent[]){
  const map=new Map<string,PatternStat>();
  const now=Date.now();
  events.forEach(e=>{
    const key=patternKey(e);
    const s=map.get(key)||{count:0,sources:new Set<string>(),recent24:0,prior72:0};
    s.count+=1;s.sources.add(e.source);
    const age=(now-Date.parse(e.publishedAt))/36e5;
    if(age<=24)s.recent24+=1;else if(age<=96)s.prior72+=1;
    map.set(key,s);
  });
  return map;
}
function analyze(e:LiveEvent,stats:Map<string,PatternStat>):Analysis{
  const p=stats.get(patternKey(e))||{count:1,sources:new Set([e.source]),recent24:1,prior72:0};
  const recurrence=clamp((p.count-1)/5);
  const corroboration=clamp((p.sources.size-1)/3);
  const actorSupport=clamp(e.actors.length/3);
  const ageHours=Math.max(0,(Date.now()-Date.parse(e.publishedAt))/36e5);
  const recency=clamp(1-ageHours/96);
  const momentum=clamp(p.recent24/Math.max(1,p.prior72+1));
  const severity=clamp(e.severity/10);
  const interest=clamp(e.interestScore/100);

  // Plausibility = how established/coherent the pattern is.
  const plausibility=clamp(.10+recurrence*.35+corroboration*.25+e.geoConfidence*.15+actorSupport*.15);
  // Probability = current chance/activation signal, distinct from pattern establishment.
  const probability=clamp(.08+recency*.18+momentum*.30+corroboration*.20+severity*.12+interest*.12);
  const novelty=clamp(1-(recurrence*.55+corroboration*.25+actorSupport*.20));
  const impact=clamp(severity*.60+interest*.40);

  let signalClass:SignalClass='speculative';
  if(novelty>=.72&&impact>=.72&&plausibility<.50&&probability<.50) signalClass='black-swan-candidate';
  else if(plausibility>=.58&&probability>=.58) signalClass='established';
  else if(plausibility>=.58&&probability<.58&&momentum>=.30) signalClass='early-warning-plausible';
  else if(plausibility<.58&&probability>=.48&&novelty>=.52) signalClass='early-warning-unusual';

  return {plausibility,probability,novelty,momentum,impact,corroboration,signalClass};
}
function quadrantFrom(a:Analysis):QuadrantKey{
  const plausible=a.plausibility>=.55,probable=a.probability>=.55;
  if(plausible&&probable)return'plausible-probable';
  if(plausible&&!probable)return'plausible-unlikely';
  if(!plausible&&probable)return'weak-probable';
  return'weak-unlikely';
}

const tlpStyles:Record<Tlp,string>={
  'TLP:CLEAR':'border-gray-500/30 text-gray-300 bg-gray-500/10','TLP:GREEN':'border-green-500/30 text-green-300 bg-green-500/10',
  'TLP:AMBER':'border-amber-500/30 text-amber-300 bg-amber-500/10','TLP:AMBER+STRICT':'border-orange-500/30 text-orange-300 bg-orange-500/10',
  'TLP:RED':'border-red-500/30 text-red-300 bg-red-500/10',
};
const signalStyle:Record<SignalClass,string>={
  established:'border-red-500/30 bg-red-500/10 text-red-300',
  'early-warning-plausible':'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  'early-warning-unusual':'border-amber-500/30 bg-amber-500/10 text-amber-300',
  'black-swan-candidate':'border-violet-500/40 bg-violet-500/10 text-violet-300',
  speculative:'border-gray-500/20 bg-gray-500/5 text-gray-500',
};
const signalLabel:Record<SignalClass,string>={
  established:'Established pattern','early-warning-plausible':'Early warning · plausible',
  'early-warning-unusual':'Early warning · unusual','black-swan-candidate':'Black Swan candidate',speculative:'Speculative',
};

export default function Dashboard(){
  const [events,setEvents]=useState<LiveEvent[]>([]);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/rss',{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`RSS API ${r.status}`);const d=await r.json();setEvents(safeArray<any>(d?.events).map(normalizeEvent));}catch(e){setEvents([]);setError(e instanceof Error?e.message:'RSS unavailable');}finally{setLoading(false);}};
  useEffect(()=>{load();const id=setInterval(load,300000);return()=>clearInterval(id);},[]);

  const stats=useMemo(()=>buildPatternStats(events),[events]);
  const analyzed=useMemo(()=>events.map(e=>({e,a:analyze(e,stats)})),[events,stats]);
  const mapped=useMemo(()=>events.filter(e=>typeof e.lat==='number'&&typeof e.lng==='number'),[events]);
  const critical=useMemo(()=>events.filter(e=>e.severity>=7),[events]);
  const actors=useMemo(()=>{const m=new Map<string,number>();events.forEach(e=>e.actors.forEach(a=>m.set(a,(m.get(a)||0)+1)));return[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);},[events]);
  const highInterest=useMemo(()=>[...analyzed].sort((x,y)=>y.e.interestScore-x.e.interestScore).slice(0,12),[analyzed]);
  const quadrants=useMemo(()=>({
    'plausible-probable':analyzed.filter(x=>quadrantFrom(x.a)==='plausible-probable'),
    'plausible-unlikely':analyzed.filter(x=>quadrantFrom(x.a)==='plausible-unlikely'),
    'weak-probable':analyzed.filter(x=>quadrantFrom(x.a)==='weak-probable'),
    'weak-unlikely':analyzed.filter(x=>quadrantFrom(x.a)==='weak-unlikely'),
  }),[analyzed]);
  const signals=useMemo(()=>({
    established:analyzed.filter(x=>x.a.signalClass==='established'),
    plausible:analyzed.filter(x=>x.a.signalClass==='early-warning-plausible'),
    unusual:analyzed.filter(x=>x.a.signalClass==='early-warning-unusual'),
    blackSwan:analyzed.filter(x=>x.a.signalClass==='black-swan-candidate'),
  }),[analyzed]);
  const tlpCounts=useMemo(()=>Object.fromEntries((['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:AMBER+STRICT','TLP:RED'] as Tlp[]).map(t=>[t,events.filter(e=>e.tlp===t).length])) as Record<Tlp,number>,[events]);

  const cards=[
    {label:'Live Events',value:events.length,icon:Activity},{label:'Geolocated',value:mapped.length,icon:Globe2},{label:'Critical',value:critical.length,icon:AlertTriangle},
    {label:'Early Warnings',value:signals.plausible.length+signals.unusual.length,icon:Radar},{label:'Black Swan candidates',value:signals.blackSwan.length,icon:Sparkles},
  ];

  const Q=({title,subtitle,items,accent}:{title:string;subtitle:string;items:{e:LiveEvent;a:Analysis}[];accent:string})=><div className={`rounded-xl border ${accent} p-3 min-h-[205px]`}><div className="flex items-center justify-between"><div><b className="text-xs text-gray-200">{title}</b><p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p></div><span className="text-lg font-bold text-gray-200">{items.length}</span></div><div className="mt-3 space-y-2">{items.slice(0,3).map(({e,a},i)=><div key={`${e.id}-${i}`} className="text-[11px] text-gray-400 border-t border-white/5 pt-2"><span className="text-gray-200 line-clamp-1">{e.title}</span><div className="flex flex-wrap gap-1 mt-1"><span className={`text-[8px] px-1.5 py-0.5 rounded border ${signalStyle[a.signalClass]}`}>{signalLabel[a.signalClass]}</span></div><span className="text-[9px] text-gray-600">{e.country||'Sin ubicación'} · PLS {Math.round(a.plausibility*100)} · PRB {Math.round(a.probability*100)} · NOV {Math.round(a.novelty*100)}</span></div>)}</div></div>;

  return <div className="space-y-6 animate-slide-in">
    <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-gray-100">Geopolitical Intelligence Dashboard</h2><p className="text-sm text-gray-500 mt-1">Pattern strength · occurrence probability · novelty · impact · early warning</p></div><button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--aegis-border)] text-xs text-gray-400"><RefreshCcw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh</button></div>
    {error&&<div className="aegis-card p-3 text-xs text-amber-300">{error}</div>}

    <div className="grid grid-cols-5 gap-4">{cards.map(c=><div key={c.label} className="aegis-card p-4"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-gray-500">{c.label}</span><c.icon className="w-4 h-4 text-cyan-400"/></div><p className="text-3xl font-bold text-gray-100 mt-3">{c.value}</p></div>)}</div>

    <div className="aegis-card p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-gray-200">Traffic Light Protocol · TLP 2.0</h3><p className="text-xs text-gray-600 mt-1">TLP controls redistribution. It does not measure severity, plausibility or probability. Public RSS is TLP:CLEAR unless the source explicitly supplies a different valid TLP label.</p></div><ShieldCheck className="w-5 h-5 text-cyan-400"/></div><div className="grid grid-cols-5 gap-3 mt-4">{(['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:AMBER+STRICT','TLP:RED'] as Tlp[]).map(t=><div key={t} className={`rounded-lg border p-3 ${tlpStyles[t]}`}><p className="text-[9px] font-mono">{t}</p><p className="text-2xl font-bold mt-1">{tlpCounts[t]}</p></div>)}</div></div>

    <div className="aegis-card p-5"><div className="mb-4"><h3 className="text-sm font-semibold text-gray-200">Prospective Pattern Matrix</h3><p className="text-xs text-gray-600 mt-1">Plausibility = strength/establishment of the pattern. Probability = present activation/likelihood signal. Novelty and impact are used to surface unusual early warnings and Black Swan candidates.</p></div><div className="grid grid-cols-[82px_1fr_1fr] gap-3 items-stretch"><div></div><div className="text-center text-[10px] text-gray-500 uppercase">Poco probable</div><div className="text-center text-[10px] text-gray-500 uppercase">Probable</div><div className="flex items-center justify-center text-[10px] text-gray-500 uppercase [writing-mode:vertical-rl] rotate-180">Plausible</div><Q title="Plausible / Poco probable" subtitle="Patrón establecido, activación todavía baja · early warning plausible" items={quadrants['plausible-unlikely']} accent="border-cyan-500/20 bg-cyan-500/5"/><Q title="Plausible / Probable" subtitle="Patrón establecido + señales actuales fuertes" items={quadrants['plausible-probable']} accent="border-red-500/30 bg-red-500/5"/><div className="flex items-center justify-center text-[10px] text-gray-500 uppercase [writing-mode:vertical-rl] rotate-180">Poco plausible</div><Q title="Poco plausible / Poco probable" subtitle="Señal especulativa; alto impacto + alta novedad ⇒ Black Swan candidate" items={quadrants['weak-unlikely']} accent="border-violet-500/20 bg-violet-500/5"/><Q title="Poco plausible / Probable" subtitle="Patrón inusual con activación creciente · early warning anómalo" items={quadrants['weak-probable']} accent="border-amber-500/30 bg-amber-500/5"/></div></div>

    <div className="grid grid-cols-4 gap-4">
      {[
        ['Established',signals.established.length,'Patrón reconocido + alta activación','border-red-500/20'],
        ['Early warning · plausible',signals.plausible.length,'Patrón reconocido antes de alta probabilidad','border-cyan-500/20'],
        ['Early warning · unusual',signals.unusual.length,'Patrón raro con señales crecientes','border-amber-500/20'],
        ['Black Swan candidates',signals.blackSwan.length,'Alta novedad + alto impacto + baja expectativa','border-violet-500/20'],
      ].map(([label,value,desc,border])=><div key={String(label)} className={`aegis-card p-4 border ${border}`}><p className="text-xs text-gray-300">{label}</p><p className="text-2xl font-bold text-gray-100 mt-1">{value}</p><p className="text-[10px] text-gray-600 mt-1">{desc}</p></div>)}
    </div>

    <div className="grid grid-cols-2 gap-6"><div className="aegis-card p-5"><h3 className="text-sm font-semibold text-gray-200 mb-3">Top Actors</h3><div className="space-y-2">{actors.map(([name,count],i)=><div key={name} className="flex items-center gap-3"><span className="text-[10px] text-gray-600 w-5">{i+1}</span><div className="flex-1 h-1.5 bg-white/5 rounded overflow-hidden"><div className="h-full bg-cyan-500/50" style={{width:`${Math.max(8,(count/(actors[0]?.[1]||1))*100)}%`}}/></div><span className="text-xs text-gray-300 w-28 truncate">{name}</span><span className="text-xs text-gray-600">{count}</span></div>)}</div></div><div className="aegis-card p-5"><h3 className="text-sm font-semibold text-gray-200 mb-3">High-interest Events</h3><div className="space-y-2 max-h-80 overflow-auto">{highInterest.map(({e,a},i)=><div key={`${e.id}-${i}`} className="border-b border-white/5 pb-2"><div className="flex items-start justify-between gap-3"><p className="text-xs text-gray-300">{e.title}</p><span className={`text-[9px] px-1.5 py-0.5 rounded border ${tlpStyles[e.tlp]}`}>{e.tlp}</span></div><div className="flex flex-wrap gap-1 mt-1"><span className={`text-[8px] px-1.5 py-0.5 rounded border ${signalStyle[a.signalClass]}`}>{signalLabel[a.signalClass]}</span></div><p className="text-[10px] text-gray-600 mt-1">{e.country||'Sin ubicación'} · S{e.severity} · plaus. {Math.round(a.plausibility*100)}% · prob. {Math.round(a.probability*100)}% · novelty {Math.round(a.novelty*100)}% · impact {Math.round(a.impact*100)}%</p></div>)}</div></div></div>
  </div>;
}
