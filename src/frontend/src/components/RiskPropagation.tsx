import { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { AlertTriangle, Crosshair, Loader2, Maximize2, RotateCcw, Target, Waves, ZoomIn, ZoomOut } from 'lucide-react';
import { riskPropagationApi } from '../services/api';
import { useRiskCases } from '../hooks/useApi';
import type { GraphNode, RiskCase, RiskPropagationResult } from '../types';

function safeArray<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function num(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

function normalizeResult(raw: any): RiskPropagationResult | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const graph = raw.affectedGraph && typeof raw.affectedGraph === 'object' ? raw.affectedGraph : {};
  return {
    ...raw,
    sourceNodeId: String(raw.sourceNodeId || ''),
    waves: safeArray<any>(raw.waves).map((w, i) => ({
      ...w,
      depth: num(w?.depth, i),
      nodes: safeArray<any>(w?.nodes),
    })),
    affectedGraph: {
      ...graph,
      nodes: safeArray<any>(graph.nodes),
      edges: safeArray<any>(graph.edges),
    },
  } as RiskPropagationResult;
}

export default function RiskPropagation() {
  const { data: allCases } = useRiskCases();
  const safeCases = useMemo(() => safeArray<RiskCase>(allCases), [allCases]);
  const [sourceInput, setSourceInput] = useState('');
  const [result, setResult] = useState<RiskPropagationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxDepth, setMaxDepth] = useState(5);
  const [decayFactor, setDecayFactor] = useState(0.6);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const propagate = async (nodeId: string) => {
    const id = nodeId.trim();
    if (!id) return;
    setLoading(true); setError(null); setResult(null); setSelectedNode(null);
    try {
      const raw = await riskPropagationApi.propagate({ sourceNodeId: id, maxDepth, decayFactor });
      const normalized = normalizeResult(raw);
      if (!normalized) throw new Error('Risk Propagation backend not connected in this deployment.');
      setResult(normalized);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Risk propagation unavailable');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    cyRef.current?.destroy();
    cyRef.current = null;
    if (!result) return;

    const nodes = safeArray<any>((result as any)?.affectedGraph?.nodes);
    const edges = safeArray<any>((result as any)?.affectedGraph?.edges);
    if (!nodes.length) return;

    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map((n: any) => ({ data: {
        id: String(n?.id || ''),
        label: String(n?.label || n?.id || 'Node'),
        type: String(n?.type || 'Entity'),
        risk: num(n?.properties?.propagatedRisk),
      }})).filter((n: any) => n.data.id),
      ...edges.map((e: any) => ({ data: {
        id: String(e?.id || `${e?.source}-${e?.target}`),
        source: String(e?.source || ''), target: String(e?.target || ''), label: String(e?.type || ''),
      }})).filter((e: any) => e.data.source && e.data.target),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        { selector: 'node', style: { label:'data(label)', 'background-color':'#f59e0b', color:'#e2e8f0', 'font-size':9, width:42, height:42, 'text-outline-width':2, 'text-outline-color':'#0a0e17' } as any },
        { selector: 'edge', style: { label:'data(label)', 'line-color':'#334155', 'target-arrow-color':'#334155', 'target-arrow-shape':'triangle', 'curve-style':'bezier', color:'#64748b', 'font-size':7, width:1.5 } as any },
      ],
      layout: { name:'cose', animate:false, padding:50 },
    });
    cy.on('tap','node',(evt) => setSelectedNode({ id:evt.target.id(), label:String(evt.target.data('label')||''), type:String(evt.target.data('type')||''), properties:evt.target.data() }));
    cyRef.current = cy;
    return () => cy.destroy();
  }, [result]);

  const waves = safeArray<any>((result as any)?.waves);
  const affectedNodes = safeArray<any>((result as any)?.affectedGraph?.nodes);

  return <div className="h-full flex flex-col gap-4">
    <div><h2 className="text-xl font-bold text-gray-100">🌊 Risk Propagation</h2><p className="text-xs text-gray-500 mt-1">Impact graph · decay model · backend-safe mode</p></div>

    <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-4 flex-1 min-h-0">
      <aside className="space-y-4">
        <div className="aegis-card p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2"><Target className="w-4 h-4 text-red-400"/>Propagation Source</h3>
          {safeCases.length > 0 && <div className="space-y-1.5 max-h-36 overflow-auto">{safeCases.map((c) => <button key={c.caseId} onClick={() => { setSourceInput(c.caseId); propagate(c.caseId); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] text-left text-xs text-gray-400"><AlertTriangle className="w-3.5 h-3.5 text-red-400"/><span className="truncate flex-1">{c.title}</span><span>{num(c.riskScore).toFixed(1)}</span></button>)}</div>}
          <div className="flex gap-2"><input value={sourceInput} onChange={e=>setSourceInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&propagate(sourceInput)} placeholder="Node ID" className="flex-1 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] px-3 py-2 text-xs text-gray-200"/><button onClick={()=>propagate(sourceInput)} disabled={loading||!sourceInput.trim()} className="px-3 rounded-lg bg-red-500/20 text-red-400 disabled:opacity-30">{loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Crosshair className="w-4 h-4"/>}</button></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-[10px] text-gray-500">MAX DEPTH<input type="number" min={1} max={10} value={maxDepth} onChange={e=>setMaxDepth(num(e.target.value,5))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label><label className="text-[10px] text-gray-500">DECAY<input type="number" min={0.1} max={0.99} step={0.05} value={decayFactor} onChange={e=>setDecayFactor(num(e.target.value,.6))} className="w-full mt-1 rounded bg-[var(--aegis-surface-2)] px-2 py-1.5 text-xs"/></label></div>
          {safeCases.length === 0 && <p className="text-xs text-gray-600">No risk cases from the legacy .NET backend. You can still enter a Node ID when running locally with the backend connected.</p>}
          {error && <p className="text-xs text-amber-300">{error}</p>}
        </div>

        <div className="aegis-card p-4"><h3 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Waves</h3>{waves.length ? <div className="space-y-2">{waves.map((w,i)=><div key={i} className="flex justify-between text-xs"><span>Wave {num(w.depth,i)}</span><span className="text-gray-500">{safeArray(w.nodes).length} nodes</span></div>)}</div> : <p className="text-xs text-gray-600">No propagation result.</p>}</div>
      </aside>

      <section className="aegis-card min-h-[580px] relative overflow-hidden">
        <div className="absolute top-3 right-3 z-10 flex gap-1"><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*1.2)} className="p-2 bg-black/40 rounded"><ZoomIn className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.zoom(cyRef.current.zoom()*.8)} className="p-2 bg-black/40 rounded"><ZoomOut className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.fit(undefined,40)} className="p-2 bg-black/40 rounded"><Maximize2 className="w-4 h-4"/></button><button onClick={()=>cyRef.current?.layout({name:'cose',animate:false} as any).run()} className="p-2 bg-black/40 rounded"><RotateCcw className="w-4 h-4"/></button></div>
        {!result && <div className="absolute inset-0 flex items-center justify-center text-center p-8"><div><Waves className="w-10 h-10 text-gray-700 mx-auto mb-3"/><p className="text-sm text-gray-500">Run a propagation analysis to render the graph.</p></div></div>}
        <div ref={containerRef} className="w-full h-full min-h-[580px]"/>
        {result && <div className="absolute bottom-3 left-3 text-xs bg-black/50 rounded px-3 py-2 text-gray-400">{affectedNodes.length} affected nodes · {waves.length} waves</div>}
        {selectedNode && <div className="absolute bottom-3 right-3 max-w-xs bg-[#0a0e17]/95 border border-cyan-500/30 rounded-lg p-3"><b className="text-sm text-cyan-300">{selectedNode.label}</b><p className="text-xs text-gray-500 mt-1">{selectedNode.type}</p></div>}
      </section>
    </div>
  </div>;
}
