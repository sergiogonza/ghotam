import { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { AlertTriangle, Crosshair, Loader2, Maximize2, RotateCcw, Target, Waves, ZoomIn, ZoomOut } from 'lucide-react';
import { getLiveGraph, loadLiveIntel } from '../live/legacyBridge';
import { analyzeAll, propagatedRisk, riskRelationWeights } from '../live/analysisEngine';
import type { GraphData, GraphNode } from '../types';

const safeArray=<T,>(v:unknown):T[]=>Array.isArray(v)?v as T[]:[];
const num=(v:unknown,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const riskColor=(r:number)=>r>=8?'#dc2626':r>=6.5?'#f97316':r>=4.5?'#eab308':r>=2.5?'#22d3ee':'#64748b';
const evidenceRelations=new Set(['PUBLISHED_BY','SUPPORTED_BY','CONTRADICTED_BY','DERIVED_FROM']);

export default function RiskPropagation(){
  const [sources,setSources]=useState<ReturnType<typeof analyzeAll>>([]);
  const [sourceInput,setSourceInput]=useState('');
  const [sourceRisk,setSourceRisk]=useState(0);
  const [graph,setGraph]=useState<GraphData>({nodes:[],edges:[]});
  const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);
  const [maxDepth,setMaxDepth]=useState(3); const [decayFactor,setDecayFactor]=useState(.68);
  const [selectedNode,setSelectedNode]=useState<GraphNode|null>(null);
  const containerRef=useRef<HTMLDivElement>(null); const cyRef=useRef<cytoscape.Core|null>(null);

  useEffect(()=>{loadLiveIntel().then(raw=>setSources(analyzeAll(raw).sort((a,b)=>b.analysis.riskScore-a.analysis.riskScore).slice(0,60))).catch(()=>setSources([]))},[]);

  const run=async(nodeId:string,explicitRisk?:number)=>{
    const id=nodeId.trim(); if(!id)return; setLoading(true);setError(null);setSelectedNode(null);
    try{
      const live=await getLiveGraph(id,maxDepth); const nodes=safeArray<GraphNode>(live?.nodes); const edges=safeArray<any>(live?.edges);
      if(!nodes.length)throw new Error('No se encontraron relaciones para este nodo en el registro RSS.');
      setGraph({nodes,edges}); setSourceRisk(explicitRisk??sourceRisk||5);
    }catch(e:any){setGraph({nodes:[],edges:[]});setError(e?.message||'No se pudo calcular la propagación.')}finally{setLoading(false)}
  };

  useEffect(()=>{
    if(!containerRef.current)return; cyRef.current?.destroy(); cyRef.current=null;
    const nodes=safeArray<GraphNode>(graph.nodes),edges=safeArray<any>(graph.edges); if(!nodes.length)return;
    const rootToken=sourceInput.replace(/^LIVECASE:/,'');
    const adjacency=new Map<string,{id:string;rel:string}[]>(); edges.forEach(e=>{const rel=String(e.type||'RELATED_TO');if(evidenceRelations.has(rel))return;const a=adjacency.get(e.source)||[];a.push({id:e.target,rel});adjacency.set(e.source,a);const b=adjacency.get(e.target)||[];b.push({id:e.source,rel});adjacency.set(e.target,b)});
    let root=nodes.find(n=>n.id.includes(rootToken)||String((n.properties as any)?.sourceEventId||'')===rootToken)||nodes.find(n=>n.type==='Event')||nodes[0];
    const risks=new Map<string,{risk:number;depth:number;via:string}>([[root.id,{risk:sourceRisk||5,depth:0,via:'SOURCE'}]]); const q=[root.id];
    while(q.length){const current=q.shift()!;const state=risks.get(current)!;if(state.depth>=maxDepth)continue;for(const next of adjacency.get(current)||[]){const r=propagatedRisk(state.risk,next.rel,state.depth+1,decayFactor);const old=risks.get(next.id);if(r>0&&(!old||r>old.risk)){risks.set(next.id,{risk:r,depth:state.depth+1,via:next.rel});q.push(next.id)}}}
    const elements:cytoscape.ElementDefinition[]=[
      ...nodes.map(n=>{const s=risks.get(n.id)||{risk:0,depth:99,via:'EVIDENCE'};const evidence=n.type==='Source';const color=evidence?'#475569':n.type==='Event'?riskColor(s.risk):n.type==='Person'?'#a855f7':n.type==='Location'?'#06b6d4':'#64748b';return{data:{id:n.id,label:n.label,type:n.type,risk:s.risk,depth:s.depth,via:s.via,color,isRoot:n.id===root.id,evidence}}}),
      ...edges.map(e=>{const rel=String(e.type||'RELATED_TO');const evidence=evidenceRelations.has(rel)||riskRelationWeights[rel]===0;return{data:{id:e.id,source:e.source,target:e.target,label:rel,evidence,weight:riskRelationWeights[rel]??.55}}}),
    ];
    const cy=cytoscape({container:containerRef.current,elements,style:[
      {selector:'node',style:{label:'data(label)','background-color':'data(color)',color:'#e2e8f0','font-size':9,width:46,height:46,'text-outline-width':2,'text-outline-color':'#0a0e17'} as any},
      {selector:'node[?isRoot]',style:{'border-width':4,'border-color':'#f8fafc',width:64,height:64} as any},
      {selector:'node[?evidence]',style:{shape:'round-rectangle',opacity:.72,width:58,height:34} as any},
      {selector:'edge',style:{label:'data(label)','line-color':'#475569','target-arrow-color':'#475569','target-arrow-shape':'triangle','curve-style':'bezier',color:'#64748b','font-size':7,width:2} as any},
      {selector:'edge[?evidence]',style:{'line-style':'dashed','line-color':'#334155','target-arrow-color':'#334155',opacity:.55,width:1} as any},
    ],layout:{name:'cose',animate:false,padding:50}});
    cy.on('tap','node',evt=>setSelectedNode({id:evt.target.id(),label:String(evt.target.data('label')||''),type:String(evt.target.data('type')||''),properties:evt.target.data()})); cyRef.current=cy; return()=>cy.destroy();
  },[graph,decayFactor,sourceInput,sourceRisk,maxDepth]);

  const typeCounts=useMemo(()=>{const m=new Map<string,number>();safeArray<GraphNode>(graph.nodes).forEach(n=>m.set(n.type,(m.get(n.type)||0)+1));return[...m.entries()].sort((a,b)=>b[1]-a[1])},[graph]);

  return <div className="h-full flex flex-col gap-4">
    <div><h2 className="text-xl font-bold text-gray-100">🌊 Risk Propagation</h2><p className="text-xs text-gray-500 mt-1">Source risk = impact × probability × confidence × momentum · evidence edges do not propagate risk</p></div>
    <div className="grid grid-cols-[340px_minmax(0,1fr)] gap-4 flex-1 min-h-0">
      <aside className="space-y-4">
        <div className="aegis-card p-4 space-y-4"><h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2"><Target className="w-4 h-4 text-red-400"/>Propagation Source</h3>
          <div className="space-y-1.5 max-h-72 overflow-auto">{sources.map(({event,analysis})=><button key={event.id} onClick={()=>{const id=`LIVECASE:${event.id}`;setSourceInput(id);setSourceRisk(analysis.riskScore);run(id,analysis.riskScore)}} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] text-left text-xs text-gray-400 hover:border-red-500/30"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{color:riskColor(analysis.riskScore)}}/><span className="truncate flex-1">{event.title}</span><span style={{color:riskColor(analysis.riskScore)}}>{analysis.riskScore.toFixed(1)}</span></button>)}</div>
          <div className="flex gap-2"><input value={sourceInput} onChange={e=>setSourceInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run(sourceInput)} placeholder="Event / actor / location node" className="flex-1 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] px-3 py-2 text-xs text-gray-200"/><button onClick={()=>run(sourceInput)} disabled={loading||!sourceInput.trim()} className="px-3 rounded-lg bg-red-500/20 text-red-400 disabled:opacity-30">{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Crosshair className="w-4 h-4"/>}</button></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-gray-500">MAX DEPTH<input type="number" min={1} max={5} value={maxDepth} onChange={e=>setMaxDepth(num(e.target.value,3))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label><label className="text-[10px] text-gray-500">DECAY<input type="number" min={.1} max={.99} step={.05} value={decayFactor} onChange={e=>setDecayFactor(num(e.target.value,.68))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label></div>
          {sourceRisk>0&&<div className="text-xs rounded-lg border border-red-500/20 bg-red-500/5 p-2">Source risk <b style={{color:riskColor(sourceRisk)}}>{sourceRisk.toFixed(1)}/10</b></div>}{error&&<p className="text-xs text-amber-300">{error}</p>}</div>
        <div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Affected ontology</h3>{typeCounts.length?<div className="space-y-2">{typeCounts.map(([t,c])=><div key={t} className="flex justify-between text-xs"><span>{t}</span><span className="text-gray-500">{c}</span></div>)}</div>:<p className="text-xs text-gray-600">Selecciona un evento para calcular relaciones.</p>}</div>
      </aside>
      <section className="aegis-card min-h-[580px] relative overflow-hidden"><div className="absolute top-3 right-3 z-10 flex gap-1"><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*1.2)} className="p-2 bg-black/40 rounded"><ZoomIn className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*.8)} className="p-2 bg-black/40 rounded"><ZoomOut className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.fit(undefined,40)} className="p-2 bg-black/40 rounded"><Maximize2 className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.layout({name:'cose',animate:false} as any).run()} className="p-2 bg-black/40 rounded"><RotateCcw className="w-4 h-4"/></button></div>
        {!graph.nodes.length&&<div className="absolute inset-0 flex items-center justify-center text-center p-8"><div><Waves className="w-10 h-10 text-gray-700 mx-auto mb-3"/><p className="text-sm text-gray-500">Selecciona un evento para propagar riesgo solo por relaciones de impacto; Source queda como evidencia/provenance.</p></div></div>}<div ref={containerRef} className="w-full h-full min-h-[580px]"/>
        {selectedNode&&<div className="absolute bottom-3 right-3 max-w-xs bg-[#0a0e17]/95 border border-cyan-500/30 rounded-lg p-3"><b className="text-sm text-cyan-300">{selectedNode.label}</b><p className="text-xs text-gray-500 mt-1">{selectedNode.type} · risk {num((selectedNode.properties as any)?.risk).toFixed(1)} · via {String((selectedNode.properties as any)?.via||'')}</p></div>}</section>
    </div>
  </div>;
}
