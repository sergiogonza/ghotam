import { useEffect,useMemo,useRef,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';
import cytoscape from 'cytoscape';
import { ExternalLink,Filter,Maximize2,Network,RefreshCcw,Search,Sparkles,Target,ZoomIn,ZoomOut } from 'lucide-react';
import { getLiveGraph,loadLiveIntel } from '../live/legacyBridge';
import { analyzeAll,semanticSimilarity,type Analysis,type IntelRecord } from '../live/analysisEngine';
import type { GraphData,GraphNode } from '../types';

const arr=<T,>(v:unknown):T[]=>Array.isArray(v)?v as T[]:[];
const nodeColor=(t:string)=>t==='Event'?'#f59e0b':t==='Person'?'#a855f7':t==='Location'?'#06b6d4':t==='Source'?'#64748b':'#3b82f6';
const riskColor=(r:number)=>r>=8?'text-red-400':r>=6.5?'text-orange-400':r>=4.5?'text-yellow-400':r>=2.5?'text-cyan-400':'text-slate-400';

export default function GraphExplorer(){
  const {nodeId}=useParams<{nodeId:string}>(); const navigate=useNavigate(); const ref=useRef<HTMLDivElement>(null); const cyRef=useRef<cytoscape.Core|null>(null);
  const [raw,setRaw]=useState<any[]>([]); const [graph,setGraph]=useState<GraphData>({nodes:[],edges:[]}); const [selected,setSelected]=useState<GraphNode|null>(null);
  const [query,setQuery]=useState(''); const [exploreId,setExploreId]=useState(nodeId||''); const [loading,setLoading]=useState(false); const [showSources,setShowSources]=useState(true);

  const analyzed=useMemo(()=>analyzeAll(raw),[raw]);
  const selectedEvent=useMemo(()=>{if(!selected)return null;const id=selected.id.replace(/^EVENT:/,'').replace(/^LIVECASE:/,'');return analyzed.find(x=>x.event.id===id)||analyzed.find(x=>selected.label&&x.event.title.includes(selected.label.slice(0,40)))||null},[selected,analyzed]);
  const semanticResults=useMemo(()=>{
    const q=query.trim().toLowerCase(); if(!q)return[];
    const seed:IntelRecord={id:'q',title:q,description:q,source:'',link:'',publishedAt:new Date().toISOString(),actors:[],tags:[],category:'world',severity:1,geoConfidence:0,interestScore:0,tlp:'TLP:CLEAR'};
    return analyzed.map(x=>({...x,score:semanticSimilarity(seed,x.event)+((x.event.title+' '+x.event.description+' '+x.event.actors.join(' ')).toLowerCase().includes(q)?.35:0)})).filter(x=>x.score>.08).sort((a,b)=>b.score-a.score).slice(0,30);
  },[query,analyzed]);
  const related=useMemo(()=>selectedEvent?[...analyzed].filter(x=>x.event.id!==selectedEvent.event.id).map(x=>({...x,score:semanticSimilarity(selectedEvent.event,x.event)})).filter(x=>x.score>.12).sort((a,b)=>b.score-a.score).slice(0,15):[],[selectedEvent,analyzed]);
  const sources=useMemo(()=>{const m=new Map<string,{count:number;links:string[]}>();related.forEach(x=>{const s=m.get(x.event.source)||{count:0,links:[]};s.count++;if(x.event.link)s.links.push(x.event.link);m.set(x.event.source,s)});if(selectedEvent){const s=m.get(selectedEvent.event.source)||{count:0,links:[]};s.count++;if(selectedEvent.event.link)s.links.push(selectedEvent.event.link);m.set(selectedEvent.event.source,s)}return[...m.entries()].sort((a,b)=>b[1].count-a[1].count)},[related,selectedEvent]);

  async function openGraph(id:string){if(!id)return;setLoading(true);try{const g=await getLiveGraph(id,3);setGraph({nodes:arr(g.nodes),edges:arr(g.edges)});setExploreId(id)}finally{setLoading(false)}}
  useEffect(()=>{loadLiveIntel().then(r=>{setRaw(r);if(nodeId)openGraph(nodeId);else if(r[0])openGraph(`LIVECASE:${String(r[0].id)}`)}).catch(()=>setRaw([]))},[]);
  useEffect(()=>{if(nodeId&&nodeId!==exploreId)openGraph(nodeId)},[nodeId]);

  useEffect(()=>{
    if(!ref.current)return;cyRef.current?.destroy();cyRef.current=null;const nodes=arr<GraphNode>(graph.nodes),edges=arr<any>(graph.edges);if(!nodes.length)return;
    const elements:cytoscape.ElementDefinition[]=[...nodes.map(n=>({data:{id:n.id,label:n.label,type:n.type,color:nodeColor(n.type),...n.properties}})),...edges.map(e=>({data:{id:e.id,source:e.source,target:e.target,label:String(e.type||'RELATED_TO')}}))];
    const cy=cytoscape({container:ref.current,elements,style:[
      {selector:'node',style:{label:'data(label)','background-color':'data(color)',color:'#e2e8f0','font-size':9,width:48,height:48,'text-outline-width':2,'text-outline-color':'#0a0e17'} as any},
      {selector:'node[type="Source"]',style:{shape:'round-rectangle',width:70,height:34,opacity:.75} as any},
      {selector:'node:selected',style:{'border-width':4,'border-color':'#22d3ee',width:60,height:60} as any},
      {selector:'edge',style:{label:'data(label)','line-color':'#334155','target-arrow-color':'#334155','target-arrow-shape':'triangle','curve-style':'bezier',color:'#64748b','font-size':7,width:1.5} as any},
    ],layout:{name:'cose',animate:false,padding:45}});
    cy.on('tap','node',e=>setSelected({id:e.target.id(),label:String(e.target.data('label')||''),type:String(e.target.data('type')||''),properties:e.target.data()}));cyRef.current=cy;return()=>cy.destroy();
  },[graph]);

  const investigate=(event:IntelRecord)=>{const id=`LIVECASE:${event.id}`;openGraph(id);navigate(`/graph/${encodeURIComponent(id)}`,{replace:true});setSelected({id:`EVENT:${event.id}`,label:event.title,type:'Event',properties:{}})};

  return <div className="h-full flex flex-col gap-4">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-100 flex items-center gap-2"><Network className="w-5 h-5 text-cyan-400"/>Investigation Workspace</h2><p className="text-xs text-gray-500 mt-1">Ontology graph · semantic source discovery · provenance · related events</p></div><button onClick={()=>openGraph(exploreId)} className="flex items-center gap-2 px-3 py-2 text-xs border border-[var(--aegis-border)] rounded-lg text-gray-400"><RefreshCcw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh</button></div>

    <div className="aegis-card p-3 flex items-center gap-3"><Search className="w-4 h-4 text-gray-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar semánticamente: actor, país, crisis, nuclear, cyber, Taiwan..." className="flex-1 bg-transparent outline-none text-sm text-gray-200"/><Filter className="w-4 h-4 text-gray-600"/><button onClick={()=>setShowSources(v=>!v)} className="text-xs text-cyan-400">{showSources?'Hide':'Show'} sources</button></div>

    {query&&<div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Semantic results · {semanticResults.length}</h3><div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto">{semanticResults.map(({event,analysis,score})=><button key={event.id} onClick={()=>investigate(event)} className="text-left p-3 rounded-lg border border-white/5 hover:border-cyan-500/30 bg-white/[.02]"><p className="text-xs text-gray-200 line-clamp-2">{event.title}</p><p className="text-[9px] text-gray-600 mt-1">{event.source} · semantic {Math.round(score*100)} · <span className={riskColor(analysis.riskScore)}>risk {analysis.riskScore.toFixed(1)}</span></p></button>)}</div></div>}

    <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-4 flex-1 min-h-0"><section className="aegis-card relative min-h-[620px] overflow-hidden"><div className="absolute top-3 right-3 z-10 flex gap-1"><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*1.2)} className="p-2 bg-black/40 rounded"><ZoomIn className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*.8)} className="p-2 bg-black/40 rounded"><ZoomOut className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.fit(undefined,40)} className="p-2 bg-black/40 rounded"><Maximize2 className="w-4 h-4"/></button></div><div ref={ref} className="w-full h-full min-h-[620px]"/></section>

      <aside className="space-y-4 overflow-auto max-h-[calc(100vh-180px)]">
        <div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Selected Entity</h3>{selected?<><p className="text-sm font-semibold text-gray-200">{selected.label}</p><p className="text-xs text-cyan-500 mt-1">{selected.type}</p>{selectedEvent&&<div className="mt-3 space-y-1 text-[10px] text-gray-500"><p>RISK <span className={riskColor(selectedEvent.analysis.riskScore)}>{selectedEvent.analysis.riskScore.toFixed(1)} · {selectedEvent.analysis.riskLevel}</span></p><p>PLS {Math.round(selectedEvent.analysis.plausibility*100)} · PRB {Math.round(selectedEvent.analysis.probability*100)}</p><p>NOV {Math.round(selectedEvent.analysis.novelty*100)} · MOM {Math.round(selectedEvent.analysis.momentum*100)} · IMP {Math.round(selectedEvent.analysis.impact*100)}</p><p>{selectedEvent.event.tlp} · {selectedEvent.analysis.signalClass}</p><button onClick={()=>navigate('/risk-propagation')} className="mt-2 flex items-center gap-1 text-cyan-400"><Target className="w-3 h-3"/>Open Risk Propagation</button></div>}</>:<p className="text-xs text-gray-600">Selecciona un nodo del grafo.</p>}</div>

        {selectedEvent&&<div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5"/>Related Open Sources</h3><div className="space-y-3">{related.slice(0,8).map(({event,analysis,score})=><div key={event.id} className="border-b border-white/5 pb-2"><button onClick={()=>investigate(event)} className="text-left text-xs text-gray-300 hover:text-cyan-300 line-clamp-2">{event.title}</button><p className="text-[9px] text-gray-600 mt-1">{event.source} · related {Math.round(score*100)} · risk {analysis.riskScore.toFixed(1)}</p>{event.link&&<a href={event.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[9px] text-cyan-500 mt-1">Source <ExternalLink className="w-3 h-3"/></a>}</div>)}</div></div>}

        {showSources&&<div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Provenance / Source Diversity</h3>{sources.length?<div className="space-y-2">{sources.map(([name,info])=><div key={name} className="flex items-center justify-between text-xs"><span className="text-gray-300 truncate mr-2">{name}</span><span className="text-gray-600">{info.count}</span></div>)}</div>:<p className="text-xs text-gray-600">Selecciona un Event para comparar fuentes.</p>}</div>}
      </aside></div>
  </div>;
}
