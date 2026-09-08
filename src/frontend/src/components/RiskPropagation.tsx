import { useEffect,useMemo,useRef,useState } from 'react';
import cytoscape from 'cytoscape';
import { AlertTriangle,Crosshair,Loader2,Maximize2,RotateCcw,Target,Waves,ZoomIn,ZoomOut } from 'lucide-react';
import { getLiveGraph,loadLiveIntel } from '../live/legacyBridge';
import { analyzeAll,propagatedRisk,riskRelationWeights } from '../live/analysisEngine';
import type { GraphData,GraphNode } from '../types';

const arr=<T,>(v:unknown):T[]=>Array.isArray(v)?v as T[]:[];
const num=(v:unknown,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const color=(r:number)=>r>=8?'#dc2626':r>=6.5?'#f97316':r>=4.5?'#eab308':r>=2.5?'#22d3ee':'#64748b';
const evidence=new Set(['PUBLISHED_BY','SUPPORTED_BY','CONTRADICTED_BY','DERIVED_FROM']);

export default function RiskPropagation(){
  const [sources,setSources]=useState<ReturnType<typeof analyzeAll>>([]);
  const [sourceInput,setSourceInput]=useState(''); const [sourceRisk,setSourceRisk]=useState(0);
  const [graph,setGraph]=useState<GraphData>({nodes:[],edges:[]}); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const [maxDepth,setMaxDepth]=useState(3); const [decay,setDecay]=useState(.68); const [selected,setSelected]=useState<GraphNode|null>(null);
  const ref=useRef<HTMLDivElement>(null); const cyRef=useRef<cytoscape.Core|null>(null);

  useEffect(()=>{loadLiveIntel().then(raw=>setSources(analyzeAll(raw).sort((a,b)=>b.analysis.riskScore-a.analysis.riskScore).slice(0,60))).catch(()=>setSources([]))},[]);

  async function run(id:string,risk?:number){
    const nodeId=id.trim(); if(!nodeId)return; setLoading(true);setError('');setSelected(null);
    try{const live=await getLiveGraph(nodeId,maxDepth);const nodes=arr<GraphNode>(live?.nodes),edges=arr<any>(live?.edges);if(!nodes.length)throw new Error('No se encontraron relaciones para este nodo.');setGraph({nodes,edges});setSourceRisk(risk ?? sourceRisk || 5)}
    catch(e:any){setGraph({nodes:[],edges:[]});setError(e?.message||'No se pudo calcular la propagación.')}finally{setLoading(false)}
  }

  useEffect(()=>{
    if(!ref.current)return; cyRef.current?.destroy();cyRef.current=null;const nodes=arr<GraphNode>(graph.nodes),edges=arr<any>(graph.edges);if(!nodes.length)return;
    const token=sourceInput.replace(/^LIVECASE:/,''); const root=nodes.find(n=>n.id.includes(token))||nodes.find(n=>n.type==='Event')||nodes[0];
    const adjacency=new Map<string,{id:string;rel:string}[]>();
    edges.forEach(e=>{const rel=String(e.type||'RELATED_TO');if(evidence.has(rel)||riskRelationWeights[rel]===0)return;for(const [a,b] of [[e.source,e.target],[e.target,e.source]]){const list=adjacency.get(a)||[];list.push({id:b,rel});adjacency.set(a,list)}});
    const risks=new Map<string,{risk:number;depth:number;via:string}>([[root.id,{risk:sourceRisk||5,depth:0,via:'SOURCE'}]]);const q=[root.id];
    while(q.length){const id=q.shift()!;const s=risks.get(id)!;if(s.depth>=maxDepth)continue;for(const next of adjacency.get(id)||[]){const r=propagatedRisk(s.risk,next.rel,s.depth+1,decay);const old=risks.get(next.id);if(r>0&&(!old||r>old.risk)){risks.set(next.id,{risk:r,depth:s.depth+1,via:next.rel});q.push(next.id)}}}
    const elements:cytoscape.ElementDefinition[]=[
      ...nodes.map(n=>{const s=risks.get(n.id)||{risk:0,depth:99,via:'EVIDENCE'};const isEvidence=n.type==='Source';return{data:{id:n.id,label:n.label,type:n.type,risk:s.risk,depth:s.depth,via:s.via,isRoot:n.id===root.id,evidence:isEvidence,color:isEvidence?'#475569':n.type==='Event'?color(s.risk):n.type==='Person'?'#a855f7':n.type==='Location'?'#06b6d4':'#64748b'}}}),
      ...edges.map(e=>{const rel=String(e.type||'RELATED_TO');return{data:{id:e.id,source:e.source,target:e.target,label:rel,evidence:evidence.has(rel)||riskRelationWeights[rel]===0}}}),
    ];
    const cy=cytoscape({container:ref.current,elements,style:[
      {selector:'node',style:{label:'data(label)','background-color':'data(color)',color:'#e2e8f0','font-size':9,width:46,height:46,'text-outline-width':2,'text-outline-color':'#0a0e17'} as any},
      {selector:'node[?isRoot]',style:{'border-width':4,'border-color':'#f8fafc',width:64,height:64} as any},
      {selector:'node[?evidence]',style:{shape:'round-rectangle',opacity:.72,width:62,height:34} as any},
      {selector:'edge',style:{label:'data(label)','line-color':'#475569','target-arrow-color':'#475569','target-arrow-shape':'triangle','curve-style':'bezier',color:'#64748b','font-size':7,width:2} as any},
      {selector:'edge[?evidence]',style:{'line-style':'dashed','line-color':'#334155','target-arrow-color':'#334155',opacity:.5,width:1} as any},
    ],layout:{name:'cose',animate:false,padding:50}});
    cy.on('tap','node',evt=>setSelected({id:evt.target.id(),label:String(evt.target.data('label')||''),type:String(evt.target.data('type')||''),properties:evt.target.data()}));cyRef.current=cy;return()=>cy.destroy();
  },[graph,decay,maxDepth,sourceInput,sourceRisk]);

  const counts=useMemo(()=>{const m=new Map<string,number>();arr<GraphNode>(graph.nodes).forEach(n=>m.set(n.type,(m.get(n.type)||0)+1));return[...m.entries()].sort((a,b)=>b[1]-a[1])},[graph]);

  return <div className="h-full flex flex-col gap-4"><div><h2 className="text-xl font-bold text-gray-100">🌊 Risk Propagation</h2><p className="text-xs text-gray-500 mt-1">Risk = impact + probability + confidence + momentum · Sources are evidence, not risk carriers</p></div>
    <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-4 flex-1 min-h-0"><aside className="space-y-4"><div className="aegis-card p-4 space-y-4"><h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2"><Target className="w-4 h-4 text-red-400"/>Propagation Source</h3>
      <div className="space-y-1.5 max-h-72 overflow-auto">{sources.map(({event,analysis})=><button key={event.id} onClick={()=>{const id=`LIVECASE:${event.id}`;setSourceInput(id);setSourceRisk(analysis.riskScore);run(id,analysis.riskScore)}} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] text-left text-xs text-gray-400 hover:border-red-500/30"><AlertTriangle className="w-3.5 h-3.5" style={{color:color(analysis.riskScore)}}/><span className="truncate flex-1">{event.title}</span><span style={{color:color(analysis.riskScore)}}>{analysis.riskScore.toFixed(1)}</span></button>)}</div>
      <div className="flex gap-2"><input value={sourceInput} onChange={e=>setSourceInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run(sourceInput)} placeholder="Event / actor / location" className="flex-1 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] px-3 py-2 text-xs text-gray-200"/><button onClick={()=>run(sourceInput)} disabled={loading||!sourceInput.trim()} className="px-3 rounded-lg bg-red-500/20 text-red-400 disabled:opacity-30">{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Crosshair className="w-4 h-4"/>}</button></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-gray-500">MAX DEPTH<input type="number" min={1} max={5} value={maxDepth} onChange={e=>setMaxDepth(num(e.target.value,3))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label><label className="text-[10px] text-gray-500">DECAY<input type="number" min={.1} max={.99} step={.05} value={decay} onChange={e=>setDecay(num(e.target.value,.68))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label></div>
      {sourceRisk>0&&<div className="text-xs rounded-lg border border-red-500/20 bg-red-500/5 p-2">Source risk <b style={{color:color(sourceRisk)}}>{sourceRisk.toFixed(1)}/10</b></div>}{error&&<p className="text-xs text-amber-300">{error}</p>}</div>
      <div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Affected ontology</h3>{counts.length?<div className="space-y-2">{counts.map(([t,c])=><div key={t} className="flex justify-between text-xs"><span>{t}</span><span className="text-gray-500">{c}</span></div>)}</div>:<p className="text-xs text-gray-600">Selecciona un evento.</p>}</div></aside>
      <section className="aegis-card min-h-[580px] relative overflow-hidden"><div className="absolute top-3 right-3 z-10 flex gap-1"><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*1.2)} className="p-2 bg-black/40 rounded"><ZoomIn className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*.8)} className="p-2 bg-black/40 rounded"><ZoomOut className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.fit(undefined,40)} className="p-2 bg-black/40 rounded"><Maximize2 className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.layout({name:'cose',animate:false} as any).run()} className="p-2 bg-black/40 rounded"><RotateCcw className="w-4 h-4"/></button></div>
      {!graph.nodes.length&&<div className="absolute inset-0 flex items-center justify-center text-center p-8"><div><Waves className="w-10 h-10 text-gray-700 mx-auto mb-3"/><p className="text-sm text-gray-500">Selecciona un evento. El riesgo se propaga por Actor/Location/Event; Source queda como provenance.</p></div></div>}<div ref={ref} className="w-full h-full min-h-[580px]"/>{selected&&<div className="absolute bottom-3 right-3 max-w-xs bg-[#0a0e17]/95 border border-cyan-500/30 rounded-lg p-3"><b className="text-sm text-cyan-300">{selected.label}</b><p className="text-xs text-gray-500 mt-1">{selected.type} · risk {num((selected.properties as any)?.risk).toFixed(1)} · via {String((selected.properties as any)?.via||'')}</p></div>}</section></div></div>;
}
