import { useEffect,useMemo,useState } from 'react';
import { Activity,AlertTriangle,Globe2,RefreshCcw,ShieldCheck,Radar,Sparkles,Network,TrendingUp,Info } from 'lucide-react';
import { analyzeAll,type Analysis,type IntelRecord,type QuadrantKey,type SignalClass,type Tlp } from '../live/analysisEngine';

const TLP_META:Record<Tlp,{name:string;meaning:string;rule:string}>={
  'TLP:CLEAR':{name:'CLEAR',meaning:'Divulgación pública',rule:'Puede compartirse públicamente.'},
  'TLP:GREEN':{name:'GREEN',meaning:'Comunidad',rule:'Puede circular dentro de la comunidad o sector relevante; no publicación pública.'},
  'TLP:AMBER':{name:'AMBER',meaning:'Necesidad de saber',rule:'Compartir solo con quienes necesiten la información para actuar.'},
  'TLP:AMBER+STRICT':{name:'AMBER+STRICT',meaning:'Solo organización',rule:'Restringido a la organización del receptor.'},
  'TLP:RED':{name:'RED',meaning:'Solo destinatarios',rule:'No redistribuir fuera de los destinatarios directos.'},
};
const tlpStyle:Record<Tlp,string>={
  'TLP:CLEAR':'tlp-clear','TLP:GREEN':'tlp-green','TLP:AMBER':'tlp-amber','TLP:AMBER+STRICT':'tlp-amber-strict','TLP:RED':'tlp-red'
};
const riskStyle:Record<string,string>={LOW:'text-slate-400',GUARDED:'text-cyan-400',ELEVATED:'text-yellow-400',HIGH:'text-orange-400',CRITICAL:'text-red-400'};
const signalLabel:Record<SignalClass,string>={established:'Established pattern','early-warning-plausible':'Early warning · plausible','early-warning-unusual':'Early warning · unusual','black-swan-candidate':'Black Swan candidate',anomalous:'Anomalous signal',speculative:'Speculative'};

export default function Dashboard(){
  const [raw,setRaw]=useState<any[]>([]);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const r=await fetch('/api/rss',{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`RSS API ${r.status}`);const d=await r.json();setRaw(Array.isArray(d?.events)?d.events:[])}catch(e){setRaw([]);setError(e instanceof Error?e.message:'RSS unavailable')}finally{setLoading(false)}};
  useEffect(()=>{load();const id=setInterval(load,300000);return()=>clearInterval(id)},[]);
  const analyzed=useMemo(()=>analyzeAll(raw),[raw]);
  const events=analyzed.map(x=>x.event);const mapped=events.filter(e=>typeof e.lat==='number'&&typeof e.lng==='number');
  const actors=useMemo(()=>{const m=new Map<string,number>();events.forEach(e=>e.actors.forEach(a=>m.set(a,(m.get(a)||0)+1)));return[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)},[raw]);
  const quadrants=useMemo(()=>Object.fromEntries((['plausible-probable','plausible-unlikely','weak-probable','weak-unlikely'] as QuadrantKey[]).map(k=>[k,analyzed.filter(x=>x.analysis.quadrant===k)])) as Record<QuadrantKey,typeof analyzed>,[analyzed]);
  const signals=useMemo(()=>({established:analyzed.filter(x=>x.analysis.signalClass==='established'),plausible:analyzed.filter(x=>x.analysis.signalClass==='early-warning-plausible'),unusual:analyzed.filter(x=>x.analysis.signalClass==='early-warning-unusual'),black:analyzed.filter(x=>x.analysis.signalClass==='black-swan-candidate'),anomalous:analyzed.filter(x=>x.analysis.signalClass==='anomalous')}),[analyzed]);
  const tlps=useMemo(()=>Object.fromEntries((Object.keys(TLP_META) as Tlp[]).map(t=>[t,events.filter(e=>e.tlp===t).length])) as Record<Tlp,number>,[events]);
  const highRisk=useMemo(()=>[...analyzed].sort((a,b)=>b.analysis.riskScore-a.analysis.riskScore).slice(0,12),[analyzed]);
  const cards=[{label:'Live Events',value:events.length,icon:Activity},{label:'Geolocated',value:mapped.length,icon:Globe2},{label:'High / Critical',value:analyzed.filter(x=>x.analysis.riskScore>=6.5).length,icon:AlertTriangle},{label:'Early Warnings',value:signals.plausible.length+signals.unusual.length,icon:Radar},{label:'Black Swan',value:signals.black.length,icon:Sparkles}];

  const Q=({title,subtitle,items}:{title:string;subtitle:string;items:{event:IntelRecord;analysis:Analysis}[]})=><div className="intel-quadrant"><div className="flex justify-between gap-3"><div><b className="text-xs text-gray-200">{title}</b><p className="text-[10px] text-gray-600 mt-1">{subtitle}</p></div><span className="text-xl font-bold text-slate-300">{items.length}</span></div><div className="mt-3 space-y-2">{items.slice(0,4).map(({event,analysis})=><div key={event.id} className="intel-row"><p className="text-[11px] text-gray-300 line-clamp-2">{event.title}</p><div className="metric-strip"><span>PLS {Math.round(analysis.plausibility*100)}</span><span>PRB {Math.round(analysis.probability*100)}</span><span>NOV {Math.round(analysis.novelty*100)}</span><span className={riskStyle[analysis.riskLevel]}>RISK {analysis.riskScore.toFixed(1)}</span></div><span className="text-[9px] text-cyan-500/80">{signalLabel[analysis.signalClass]}</span></div>)}</div></div>;

  return <div className="intel-dashboard animate-slide-in">
    <div className="intel-page-head"><div><div className="eyebrow">GHOTAM / STRATEGIC OVERVIEW</div><h2>Geopolitical Intelligence</h2><p>Unified scoring · prospective analysis · risk · provenance</p></div><button onClick={load} className="intel-action"><RefreshCcw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>REFRESH</button></div>{error&&<div className="aegis-card p-3 text-xs text-amber-300">{error}</div>}
    <div className="intel-kpi-grid">{cards.map(c=><div key={c.label} className="intel-kpi"><div className="flex justify-between"><span>{c.label}</span><c.icon className="w-4 h-4"/></div><strong>{c.value}</strong></div>)}</div>

    <section className="intel-panel"><div className="intel-section-head"><div><div className="eyebrow">INFORMATION HANDLING</div><h3>Traffic Light Protocol · TLP 2.0</h3><p>TLP indica <b>hasta dónde puede redistribuirse</b> información sensible. No mide veracidad, riesgo, severidad ni clasificación de seguridad.</p></div><ShieldCheck className="w-5 h-5 text-cyan-400"/></div>
      <div className="tlp-definition-grid">{(Object.keys(TLP_META) as Tlp[]).map(t=>{const m=TLP_META[t];return <div key={t} className={`tlp-definition ${tlpStyle[t]}`}><div className="tlp-top"><span>{t}</span><strong>{tlps[t]}</strong></div><b>{m.meaning}</b><p>{m.rule}</p></div>})}</div>
      <div className="intel-note"><Info className="w-4 h-4"/><span><b>Por qué aquí todos son TLP:CLEAR:</b> GHOTAM está ingiriendo RSS y páginas públicas. El sistema no debe inventar GREEN/AMBER/RED a partir del contenido. Solo conserva otro TLP cuando la fuente o un analista autorizado lo asigna explícitamente.</span></div>
    </section>

    <div className="intel-two-col"><section className="intel-panel"><div className="eyebrow">THREAT MODEL</div><h3>Risk Classification</h3><p className="intel-sub">Independiente de TLP: combina impacto, probabilidad, confianza, momentum y severidad.</p><div className="risk-scale">{(['LOW','GUARDED','ELEVATED','HIGH','CRITICAL'] as const).map(r=><div key={r}><span className={riskStyle[r]}>{r}</span><strong>{analyzed.filter(x=>x.analysis.riskLevel===r).length}</strong></div>)}</div></section>
      <section className="intel-panel"><div className="eyebrow">SIGNAL STATUS</div><h3>Analytic Signals</h3><p className="intel-sub">Separa patrones establecidos, advertencias tempranas y anomalías.</p><div className="signal-mini-grid">{[{label:'Established',v:signals.established.length},{label:'EW Plausible',v:signals.plausible.length},{label:'EW Unusual',v:signals.unusual.length},{label:'Anomalous',v:signals.anomalous.length},{label:'Black Swan',v:signals.black.length}].map(x=><div key={x.label}><span>{x.label}</span><strong>{x.v}</strong></div>)}</div></section></div>

    <section className="intel-panel"><div className="eyebrow">PROSPECTIVE ANALYSIS</div><h3>Pattern Matrix</h3><p className="intel-sub">Plausibility = pattern establishment. Probability = current activation. Novelty and impact surface anomalous warnings and Black Swan candidates.</p><div className="pattern-matrix"><div></div><div className="axis-label">POCO PROBABLE</div><div className="axis-label">PROBABLE</div><div className="axis-label">PLAUSIBLE</div><Q title="Plausible / Poco probable" subtitle="Early warning plausible" items={quadrants['plausible-unlikely']}/><Q title="Plausible / Probable" subtitle="Established / active pattern" items={quadrants['plausible-probable']}/><div className="axis-label">POCO PLAUSIBLE</div><Q title="Poco plausible / Poco probable" subtitle="Speculative / anomalous / Black Swan" items={quadrants['weak-unlikely']}/><Q title="Poco plausible / Probable" subtitle="Early warning unusual" items={quadrants['weak-probable']}/></div></section>

    <div className="intel-two-col"><section className="intel-panel"><div className="eyebrow">ENTITY FREQUENCY</div><h3>Top Actors</h3><div className="rank-list">{actors.map(([name,count],i)=><div key={name}><span className="rank">{String(i+1).padStart(2,'0')}</span><span>{name}</span><strong>{count}</strong></div>)}</div></section><section className="intel-panel"><div className="eyebrow">PRIORITY QUEUE</div><h3>Highest Risk Events</h3><div className="risk-event-list">{highRisk.map(({event,analysis})=><div key={event.id}><div className="flex justify-between gap-3"><p>{event.title}</p><strong className={riskStyle[analysis.riskLevel]}>{analysis.riskScore.toFixed(1)}</strong></div><div className="metric-strip"><span>{analysis.riskLevel}</span><span>PLS {Math.round(analysis.plausibility*100)}</span><span>PRB {Math.round(analysis.probability*100)}</span><span>MOM {Math.round(analysis.momentum*100)}</span><span>IMP {Math.round(analysis.impact*100)}</span><span className={tlpStyle[event.tlp]}>{event.tlp}</span></div></div>)}</div></section></div>
  </div>;
}
