import { useEffect,useMemo,useState } from 'react';
import { Activity,AlertTriangle,BookOpen,MapPin,Radio,RefreshCcw,Search,Send,ShieldCheck,Target,Terminal,UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import LiveIntelMap from '../live/LiveIntelMap';
import { analyzeAll } from '../live/analysisEngine';
import { loadCombinedIntel,OFFLINE_CHANGED } from '../live/offlineStore';

const stateLabel=(a:any)=>a?.signalClass==='established'?'ESTABLISHED':a?.signalClass==='black-swan-candidate'?'BLACK SWAN':a?.signalClass?.includes('early-warning')?'EARLY WARNING':a?.signalClass==='anomalous'?'ANOMALOUS':'SIGNAL';

export default function IntelligenceWorkbench(){
 const[raw,setRaw]=useState<any[]>([]);const[query,setQuery]=useState('');const[selectedId,setSelectedId]=useState('');const[loading,setLoading]=useState(false);
 const load=async(force=false)=>{setLoading(true);try{setRaw(await loadCombinedIntel(force))}finally{setLoading(false)}};
 useEffect(()=>{load();const h=()=>load(false);window.addEventListener(OFFLINE_CHANGED,h);const id=setInterval(()=>load(false),60000);return()=>{window.removeEventListener(OFFLINE_CHANGED,h);clearInterval(id)}},[]);
 const analyzed=useMemo(()=>analyzeAll(raw),[raw]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return analyzed;return analyzed.filter(({event,analysis})=>[event.title,event.description,event.source,event.country,event.locationLabel,event.patternFamily,analysis.signalClass,analysis.riskLevel,event.actors.join(' ')].join(' ').toLowerCase().includes(q))},[query,analyzed]);
 const selected=filtered.find(x=>x.event.id===selectedId)||filtered[0]||null;
 const newHour=filtered.filter(x=>Date.now()-Date.parse(x.event.publishedAt)<=3600000).length;
 const warnings=filtered.filter(x=>x.analysis.signalClass.includes('early-warning')).length;
 const established=filtered.filter(x=>x.analysis.signalClass==='established').length;
 const highRisk=filtered.filter(x=>x.analysis.riskScore>=6.5).length;
 return <div className="workbench-shell animate-slide-in">
  <div className="workbench-topline"><div><div className="eyebrow">GHOTAM / INTELLIGENCE WORKBENCH</div><h2>Operational Foresight Terminal</h2></div><div className="workbench-actions"><button className="intel-action" onClick={()=>load(true)}><RefreshCcw size={13} className={loading?'animate-spin':''}/>SYNC</button><Link className="intel-action" to="/admin"><UploadCloud size={13}/>REPORT LIVE EVENT</Link></div></div>
  <div className="workbench-kpis"><div><span>LAST HOUR</span><b>{newHour}</b></div><div><span>EARLY WARNING</span><b>{warnings}</b></div><div><span>ESTABLISHED</span><b>{established}</b></div><div><span>HIGH / CRITICAL</span><b>{highRisk}</b></div></div>
  <div className="workbench-grid">
   <aside className="workbench-object-panel"><div className="workbench-panel-title"><Target size={13}/>OBJECTS</div><div className="workbench-search"><Search size={12}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="actor, place, pattern, risk..."/></div><div className="workbench-object-list">{filtered.slice(0,80).map(({event,analysis})=><button key={event.id} onClick={()=>setSelectedId(event.id)} className={selected?.event.id===event.id?'active':''}><small>{event.country||'GLOBAL'} · {event.patternFamily}</small><strong>{event.title}</strong><span>{stateLabel(analysis)} · RISK {analysis.riskScore.toFixed(1)}</span></button>)}</div></aside>
   <section className="workbench-map"><LiveIntelMap/></section>
   <aside className="workbench-terminal"><div className="workbench-panel-title"><Terminal size={13}/>INTEL TERMINAL</div>{selected?<div className="terminal-body"><div className="terminal-state"><Radio size={12}/>{stateLabel(selected.analysis)}</div><h3>{selected.event.title}</h3><p>{selected.event.description||'No description available.'}</p><div className="terminal-metrics"><span>RISK <b>{selected.analysis.riskScore.toFixed(1)}</b></span><span>PLS <b>{Math.round(selected.analysis.plausibility*100)}</b></span><span>PRB <b>{Math.round(selected.analysis.probability*100)}</b></span><span>NOV <b>{Math.round(selected.analysis.novelty*100)}</b></span><span>MOM <b>{Math.round(selected.analysis.momentum*100)}</b></span><span>CONF <b>{Math.round(selected.analysis.confidence*100)}</b></span></div><div className="terminal-section"><b>LOCATION</b><span>{selected.event.locationLabel||selected.event.country||'Unknown'}</span></div><div className="terminal-section"><b>ACTORS</b><span>{selected.event.actors.join(', ')||'—'}</span></div><div className="terminal-section"><b>PROVENANCE</b><span>{selected.event.source} · {selected.event.tlp}</span></div><div className="terminal-actions"><Link to={`/graph/${encodeURIComponent('LIVECASE:'+selected.event.id)}`}><Activity size={12}/>GRAPH</Link><Link to="/risk-propagation"><AlertTriangle size={12}/>RISK</Link><Link to="/watchlists"><ShieldCheck size={12}/>WATCHLIST</Link><Link to="/corpus"><BookOpen size={12}/>CORPUS</Link></div></div>:<div className="terminal-empty">No event selected.</div>}</aside>
  </div>
  <div className="workbench-stream"><div className="workbench-panel-title"><Send size={12}/>LIVE SIGNAL STREAM</div><div className="signal-ticker">{filtered.slice(0,20).map(({event,analysis})=><div key={event.id}><time>{new Date(event.publishedAt).toLocaleTimeString()}</time><span>{event.source}</span><span>{event.country||'GLOBAL'}</span><b>{stateLabel(analysis)}</b><p>{event.title}</p>{event.locationLabel&&<em><MapPin size={10}/>{event.locationLabel}</em>}</div>)}</div></div>
 </div>;
}
