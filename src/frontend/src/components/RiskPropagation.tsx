import { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { AlertTriangle, Crosshair, Loader2, Maximize2, RotateCcw, Target, Waves, ZoomIn, ZoomOut } from 'lucide-react';
import { useRiskCases } from '../hooks/useApi';
import { getLiveGraph } from '../live/legacyBridge';
import type { GraphData, GraphNode, RiskCase } from '../types';

const safeArray = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];
const num = (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;

export default function RiskPropagation() {
  const { data: allCases = [] } = useRiskCases();
  const safeCases = useMemo(() => safeArray<RiskCase>(allCases), [allCases]);
  const [sourceInput, setSourceInput] = useState('');
  const [graph, setGraph] = useState<GraphData>({nodes:[], edges:[]});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxDepth, setMaxDepth] = useState(3);
  const [decayFactor, setDecayFactor] = useState(0.6);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const run = async (nodeId: string) => {
    const id = nodeId.trim();
    if (!id) return;
    setLoading(true); setError(null); setSelectedNode(null);
    try {
      const live = await getLiveGraph(id, maxDepth);
      const nodes = safeArray<GraphNode>(live?.nodes);
      const edges = safeArray<any>(live?.edges);
      if (!nodes.length) throw new Error('No se encontraron relaciones para este nodo en el registro RSS.');
      setGraph({nodes, edges});
    } catch (e:any) {
      setGraph({nodes:[],edges:[]});
      setError(e?.message || 'No se pudo calcular la propagación.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    cyRef.current?.destroy();
    cyRef.current = null;
    const nodes = safeArray<GraphNode>(graph.nodes);
    const edges = safeArray<any>(graph.edges);
    if (!nodes.length) return;

    const root = sourceInput.replace(/^LIVECASE:/,'');
    const degree = new Map<string,number>();
    edges.forEach(e => { degree.set(e.source,(degree.get(e.source)||0)+1); degree.set(e.target,(degree.get(e.target)||0)+1); });
    const maxDegree = Math.max(1,...Array.from(degree.values()));

    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map(n => {
        const d = degree.get(n.id) || 0;
        const propagatedRisk = Math.max(1, Math.min(10, 10 * Math.pow(decayFactor, Math.max(0, maxDegree - d) / maxDegree)));
        const color = n.type === 'Event' ? '#ef4444' : n.type === 'Person' ? '#a855f7' : n.type === 'Location' ? '#06b6d4' : '#64748b';
        return {data:{id:n.id,label:n.label,type:n.type,risk:propagatedRisk,color,isRoot:n.id.includes(root)}};
      }),
      ...edges.map(e => ({data:{id:e.id,source:e.source,target:e.target,label:e.type}})),
    ];

    const cy = cytoscape({
      container:containerRef.current,
      elements,
      style:[
        {selector:'node',style:{label:'data(label)','background-color':'data(color)',color:'#e2e8f0','font-size':9,width:46,height:46,'text-outline-width':2,'text-outline-color':'#0a0e17'} as any},
        {selector:'node[?isRoot]',style:{'border-width':4,'border-color':'#f8fafc',width:60,height:60} as any},
        {selector:'edge',style:{label:'data(label)','line-color':'#334155','target-arrow-color':'#334155','target-arrow-shape':'triangle','curve-style':'bezier',color:'#64748b','font-size':7,width:1.6} as any},
      ],
      layout:{name:'cose',animate:false,padding:50},
    });
    cy.on('tap','node',evt=>setSelectedNode({id:evt.target.id(),label:String(evt.target.data('label')||''),type:String(evt.target.data('type')||''),properties:evt.target.data()}));
    cyRef.current=cy;
    return()=>cy.destroy();
  },[graph,decayFactor,sourceInput]);

  const typeCounts = useMemo(() => {
    const m = new Map<string,number>();
    safeArray<GraphNode>(graph.nodes).forEach(n=>m.set(n.type,(m.get(n.type)||0)+1));
    return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]);
  },[graph]);

  return <div className="h-full flex flex-col gap-4">
    <div><h2 className="text-xl font-bold text-gray-100">🌊 Risk Propagation</h2><p className="text-xs text-gray-500 mt-1">Live RSS ontology · relationship propagation · heuristic decay</p></div>
    <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-4 flex-1 min-h-0">
      <aside className="space-y-4">
        <div className="aegis-card p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2"><Target className="w-4 h-4 text-red-400"/>Propagation Source</h3>
          <div className="space-y-1.5 max-h-52 overflow-auto">
            {safeCases.slice(0,35).map(c=><button key={c.caseId} onClick={()=>{setSourceInput(c.caseId);run(c.caseId)}} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] text-left text-xs text-gray-400 hover:border-red-500/30"><AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0"/><span className="truncate flex-1">{c.title}</span><span className="text-red-300">{num(c.riskScore).toFixed(1)}</span></button>)}
          </div>
          <div className="flex gap-2"><input value={sourceInput} onChange={e=>setSourceInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&run(sourceInput)} placeholder="Event / actor / location node" className="flex-1 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] px-3 py-2 text-xs text-gray-200"/><button onClick={()=>run(sourceInput)} disabled={loading||!sourceInput.trim()} className="px-3 rounded-lg bg-red-500/20 text-red-400 disabled:opacity-30">{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Crosshair className="w-4 h-4"/>}</button></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-gray-500">MAX DEPTH<input type="number" min={1} max={5} value={maxDepth} onChange={e=>setMaxDepth(num(e.target.value,3))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label><label className="text-[10px] text-gray-500">DECAY<input type="number" min={0.1} max={0.99} step={0.05} value={decayFactor} onChange={e=>setDecayFactor(num(e.target.value,.6))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label></div>
          {error&&<p className="text-xs text-amber-300">{error}</p>}
        </div>
        <div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Affected ontology</h3>{typeCounts.length?<div className="space-y-2">{typeCounts.map(([t,c])=><div key={t} className="flex justify-between text-xs"><span>{t}</span><span className="text-gray-500">{c}</span></div>)}</div>:<p className="text-xs text-gray-600">Selecciona un caso para calcular relaciones.</p>}</div>
      </aside>
      <section className="aegis-card min-h-[580px] relative overflow-hidden">
        <div className="absolute top-3 right-3 z-10 flex gap-1"><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*1.2)} className="p-2 bg-black/40 rounded"><ZoomIn className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*.8)} className="p-2 bg-black/40 rounded"><ZoomOut className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.fit(undefined,40)} className="p-2 bg-black/40 rounded"><Maximize2 className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.layout({name:'cose',animate:false} as any).run()} className="p-2 bg-black/40 rounded"><RotateCcw className="w-4 h-4"/></button></div>
        {!graph.nodes.length&&<div className="absolute inset-0 flex items-center justify-center text-center p-8"><div><Waves className="w-10 h-10 text-gray-700 mx-auto mb-3"/><p className="text-sm text-gray-500">Selecciona un evento de alto interés para ver cómo se propaga por Actor, Location y Source.</p></div></div>}
        <div ref={containerRef} className="w-full h-full min-h-[580px]"/>
        {graph.nodes.length>0&&<div className="absolute bottom-3 left-3 text-xs bg-black/50 rounded px-3 py-2 text-gray-400">{graph.nodes.length} nodes · {graph.edges.length} relationships</div>}
        {selectedNode&&<div className="absolute bottom-3 right-3 max-w-xs bg-[#0a0e17]/95 border border-cyan-500/30 rounded-lg p-3"><b className="text-sm text-cyan-300">{selectedNode.label}</b><p className="text-xs text-gray-500 mt-1">{selectedNode.type} · risk {num((selectedNode.properties as any)?.risk).toFixed(1)}</p></div>}
      </section>
    </div>
  </div>;
}
