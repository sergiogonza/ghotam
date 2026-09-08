import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Globe2, Network, RefreshCcw, ShieldCheck, TrendingUp } from 'lucide-react';

type LiveEvent = {
  id: string; title: string; description: string; source: string; publishedAt: string;
  country?: string; lat?: number; lng?: number; actors: string[]; severity: number;
  geoConfidence: number; interestScore: number; tlp: 'TLP:CLEAR'|'TLP:GREEN'|'TLP:AMBER'|'TLP:RED';
};

type QuadrantKey = 'plausible-probable'|'plausible-unlikely'|'weak-probable'|'weak-unlikely';

const clamp = (n:number) => Math.max(0, Math.min(1, n));
const safeArray = <T,>(v:unknown):T[] => Array.isArray(v) ? v as T[] : [];

function normalizeEvent(raw:any, index:number):LiveEvent {
  const tlpRaw = String(raw?.tlp || 'TLP:CLEAR').toUpperCase();
  const tlp = ['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:RED'].includes(tlpRaw) ? tlpRaw as LiveEvent['tlp'] : 'TLP:CLEAR';
  return {
    id:String(raw?.id || `event-${index}`), title:String(raw?.title || 'Evento sin título'), description:String(raw?.description || ''),
    source:String(raw?.source || 'Fuente desconocida'), publishedAt:String(raw?.publishedAt || new Date().toISOString()),
    country:typeof raw?.country === 'string' ? raw.country : undefined,
    lat:Number.isFinite(Number(raw?.lat)) ? Number(raw.lat) : undefined, lng:Number.isFinite(Number(raw?.lng)) ? Number(raw.lng) : undefined,
    actors:safeArray<string>(raw?.actors).filter(a=>typeof a==='string'), severity:Number.isFinite(Number(raw?.severity)) ? Number(raw.severity) : 1,
    geoConfidence:Number.isFinite(Number(raw?.geoConfidence)) ? clamp(Number(raw.geoConfidence)) : (raw?.country ? .72 : 0),
    interestScore:Number.isFinite(Number(raw?.interestScore)) ? Number(raw.interestScore) : Number(raw?.severity || 1), tlp,
  };
}

function scores(e:LiveEvent) {
  const ageHours = Math.max(0,(Date.now()-new Date(e.publishedAt).getTime())/36e5);
  const recency = clamp(1-ageHours/72);
  const plausibility = clamp(.2 + e.geoConfidence*.35 + Math.min(e.actors.length/4,1)*.2 + (e.source? .15:0) + (e.description.length>80?.1:0));
  const probability = clamp(.12 + clamp(e.severity/10)*.34 + clamp(e.interestScore/20)*.32 + recency*.22);
  return { plausibility, probability };
}

function quadrant(e:LiveEvent):QuadrantKey {
  const s=scores(e); const plausible=s.plausibility>=.55; const probable=s.probability>=.55;
  if(plausible&&probable) return 'plausible-probable';
  if(plausible&&!probable) return 'plausible-unlikely';
  if(!plausible&&probable) return 'weak-probable';
  return 'weak-unlikely';
}

const tlpStyles:Record<LiveEvent['tlp'],string>={
  'TLP:CLEAR':'border-gray-500/30 text-gray-300 bg-gray-500/10',
  'TLP:GREEN':'border-green-500/30 text-green-300 bg-green-500/10',
  'TLP:AMBER':'border-amber-500/30 text-amber-300 bg-amber-500/10',
  'TLP:RED':'border-red-500/30 text-red-300 bg-red-500/10',
};

export default function Dashboard(){
  const [events,setEvents]=useState<LiveEvent[]>([]); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/rss',{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`RSS API ${r.status}`);const d=await r.json();setEvents(safeArray<any>(d?.events).map(normalizeEvent));}catch(e){setEvents([]);setError(e instanceof Error?e.message:'RSS unavailable');}finally{setLoading(false);}};
  useEffect(()=>{load();const id=setInterval(load,300000);return()=>clearInterval(id);},[]);

  const mapped=useMemo(()=>events.filter(e=>typeof e.lat==='number'&&typeof e.lng==='number'),[events]);
  const critical=useMemo(()=>events.filter(e=>e.severity>=7),[events]);
  const highInterest=useMemo(()=>[...events].sort((a,b)=>b.interestScore-a.interestScore).slice(0,12),[events]);
  const actors=useMemo(()=>{const m=new Map<string,number>();events.forEach(e=>e.actors.forEach(a=>m.set(a,(m.get(a)||0)+1)));return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);},[events]);
  const quadrants=useMemo(()=>({
    'plausible-probable':events.filter(e=>quadrant(e)==='plausible-probable'),
    'plausible-unlikely':events.filter(e=>quadrant(e)==='plausible-unlikely'),
    'weak-probable':events.filter(e=>quadrant(e)==='weak-probable'),
    'weak-unlikely':events.filter(e=>quadrant(e)==='weak-unlikely'),
  }),[events]);
  const tlpCounts=useMemo(()=>({
    'TLP:CLEAR':events.filter(e=>e.tlp==='TLP:CLEAR').length,
    'TLP:GREEN':events.filter(e=>e.tlp==='TLP:GREEN').length,
    'TLP:AMBER':events.filter(e=>e.tlp==='TLP:AMBER').length,
    'TLP:RED':events.filter(e=>e.tlp==='TLP:RED').length,
  }),[events]);

  const cards=[
    {label:'Live Events',value:events.length,icon:Activity},{label:'Geolocated',value:mapped.length,icon:Globe2},{label:'Critical',value:critical.length,icon:AlertTriangle},{label:'Actors',value:actors.length,icon:Network},{label:'High Interest',value:events.filter(e=>e.interestScore>=10).length,icon:TrendingUp},
  ];

  const Q=({title,subtitle,items,accent}:{title:string;subtitle:string;items:LiveEvent[];accent:string})=><div className={`rounded-xl border ${accent} p-3 min-h-[180px]`}><div className="flex items-center justify-between"><div><b className="text-xs text-gray-200">{title}</b><p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p></div><span className="text-lg font-bold text-gray-200">{items.length}</span></div><div className="mt-3 space-y-2">{items.slice(0,3).map(e=><div key={e.id} className="text-[11px] text-gray-400 border-t border-white/5 pt-2"><span className="text-gray-200 line-clamp-1">{e.title}</span><span className="text-[9px] text-gray-600">{e.country||'Sin ubicación'} · S{e.severity} · {e.source}</span></div>)}</div></div>;

  return <div className="space-y-6 animate-slide-in">
    <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-gray-100">Geopolitical Intelligence Dashboard</h2><p className="text-sm text-gray-500 mt-1">RSS live · TLP handling · prospective signal matrix · ontology-ready</p></div><button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--aegis-border)] text-xs text-gray-400"><RefreshCcw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh</button></div>
    {error&&<div className="aegis-card p-3 text-xs text-amber-300">{error}</div>}

    <div className="grid grid-cols-5 gap-4">{cards.map(c=><div key={c.label} className="aegis-card p-4"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-gray-500">{c.label}</span><c.icon className="w-4 h-4 text-cyan-400"/></div><p className="text-3xl font-bold text-gray-100 mt-3">{c.value}</p></div>)}</div>

    <div className="aegis-card p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-gray-200">Traffic Light Protocol · TLP 2.0</h3><p className="text-xs text-gray-600 mt-1">Handling/distribution label, not severity. Public RSS enters as TLP:CLEAR unless a source explicitly provides another valid label.</p></div><ShieldCheck className="w-5 h-5 text-cyan-400"/></div><div className="grid grid-cols-4 gap-3 mt-4">{(['TLP:CLEAR','TLP:GREEN','TLP:AMBER','TLP:RED'] as LiveEvent['tlp'][]).map(t=><div key={t} className={`rounded-lg border p-3 ${tlpStyles[t]}`}><p className="text-[10px] font-mono">{t}</p><p className="text-2xl font-bold mt-1">{tlpCounts[t]}</p></div>)}</div></div>

    <div className="aegis-card p-5"><div className="mb-4"><h3 className="text-sm font-semibold text-gray-200">Prospective Quadrants</h3><p className="text-xs text-gray-600 mt-1">Heuristic signal only — plausibility uses evidence quality; probability uses severity, interest and recency. It is not a factual forecast.</p></div><div className="grid grid-cols-[82px_1fr_1fr] gap-3 items-stretch"><div></div><div className="text-center text-[10px] text-gray-500 uppercase">Poco probable</div><div className="text-center text-[10px] text-gray-500 uppercase">Probable</div><div className="flex items-center justify-center text-[10px] text-gray-500 uppercase [writing-mode:vertical-rl] rotate-180">Plausible</div><Q title="Plausible / Poco probable" subtitle="Buena evidencia, baja señal de ocurrencia" items={quadrants['plausible-unlikely']} accent="border-cyan-500/20 bg-cyan-500/5"/><Q title="Plausible / Probable" subtitle="Alta prioridad analítica" items={quadrants['plausible-probable']} accent="border-red-500/30 bg-red-500/5"/><div className="flex items-center justify-center text-[10px] text-gray-500 uppercase [writing-mode:vertical-rl] rotate-180">Poco plausible</div><Q title="Poco plausible / Poco probable" subtitle="Señal débil / baja evidencia" items={quadrants['weak-unlikely']} accent="border-gray-500/20 bg-gray-500/5"/><Q title="Poco plausible / Probable" subtitle="Señal alta pero evidencia insuficiente" items={quadrants['weak-probable']} accent="border-amber-500/30 bg-amber-500/5"/></div></div>

    <div className="grid grid-cols-2 gap-6"><div className="aegis-card p-5"><h3 className="text-sm font-semibold text-gray-200 mb-3">Top Actors</h3><div className="space-y-2">{actors.map(([name,count],i)=><div key={name} className="flex items-center gap-3"><span className="text-[10px] text-gray-600 w-5">{i+1}</span><div className="flex-1 h-1.5 bg-white/5 rounded overflow-hidden"><div className="h-full bg-cyan-500/50" style={{width:`${Math.max(8,(count/(actors[0]?.[1]||1))*100)}%`}}/></div><span className="text-xs text-gray-300 w-28 truncate">{name}</span><span className="text-xs text-gray-600">{count}</span></div>)}</div></div><div className="aegis-card p-5"><h3 className="text-sm font-semibold text-gray-200 mb-3">High-interest Events</h3><div className="space-y-2 max-h-72 overflow-auto">{highInterest.map(e=>{const s=scores(e);return <div key={e.id} className="border-b border-white/5 pb-2"><div className="flex items-start justify-between gap-3"><p className="text-xs text-gray-300">{e.title}</p><span className={`text-[9px] px-1.5 py-0.5 rounded border ${tlpStyles[e.tlp]}`}>{e.tlp}</span></div><p className="text-[10px] text-gray-600 mt-1">{e.country||'Sin ubicación'} · S{e.severity} · plaus. {Math.round(s.plausibility*100)}% · prob. {Math.round(s.probability*100)}%</p></div>})}</div></div></div>
  </div>;
}
