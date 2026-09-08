import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { buildOntology } from './ontology';
import type { IntelEvent } from './types';

const colors: Record<string,string> = { Event:'#f59e0b', Actor:'#06b6d4', Location:'#f472b6', Source:'#8b5cf6' };
const safeStrings = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

function normalizeEvent(raw:any, index:number): IntelEvent {
  return {
    id:String(raw?.id || `event-${index}`),
    title:String(raw?.title || 'Evento sin título'),
    description:String(raw?.description || ''),
    link:String(raw?.link || ''),
    source:String(raw?.source || 'Fuente desconocida'),
    publishedAt:String(raw?.publishedAt || new Date().toISOString()),
    image:typeof raw?.image === 'string' ? raw.image : undefined,
    lat:typeof raw?.lat === 'number' ? raw.lat : undefined,
    lng:typeof raw?.lng === 'number' ? raw.lng : undefined,
    country:typeof raw?.country === 'string' ? raw.country : undefined,
    actors:safeStrings(raw?.actors),
    tags:safeStrings(raw?.tags),
    severity:Number.isFinite(Number(raw?.severity)) ? Number(raw.severity) : 1
  };
}

export default function OntologyView(){
  const ref = useRef<HTMLDivElement>(null);
  const [events,setEvents] = useState<IntelEvent[]>([]);
  const [selectedId,setSelectedId] = useState<string>('');
  const [error,setError] = useState('');

  const safeEvents = Array.isArray(events) ? events : [];
  const selected = safeEvents.find(e=>e?.id === selectedId) || safeEvents[0] || null;

  useEffect(()=>{
    fetch('/api/rss', { headers: { accept: 'application/json' } })
      .then(async (r)=>{
        const contentType = r.headers.get('content-type') || '';
        if(!r.ok) throw new Error(`RSS API ${r.status}`);
        if(!contentType.includes('application/json')) throw new Error('RSS API devolvió una respuesta no JSON');
        return r.json();
      })
      .then(d=>{
        const rawEvents = Array.isArray(d?.events) ? d.events : [];
        const normalized = rawEvents.map((item:any,index:number)=>normalizeEvent(item,index));
        setEvents(normalized);
        if(normalized[0]) setSelectedId(normalized[0].id);
      })
      .catch(err=>{
        console.error('Ontology RSS error', err);
        setEvents([]);
        setError(err instanceof Error ? err.message : 'No se pudo cargar RSS');
      });
  },[]);

  useEffect(()=>{
    if(!ref.current) return;
    ref.current.innerHTML = '';
    if(!selected) return;

    const g = buildOntology([selected]);
    const nodes = Array.isArray(g?.nodes) ? g.nodes : [];
    const edges = Array.isArray(g?.edges) ? g.edges : [];
    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...nodes.map(n=>({data:{id:n.id,label:n.label,type:n.type,color:colors[n.type]}})),
        ...edges.map(e=>({data:{id:e.id,source:e.source,target:e.target,label:e.type}}))
      ],
      style:[
        { selector:'node', style:{ 'background-color':'data(color)','label':'data(label)','color':'#e2e8f0','font-size':10,'text-wrap':'wrap','text-max-width':140,'width':38,'height':38 } as any },
        { selector:'node[type = "Event"]', style:{ 'width':58,'height':58,'font-size':11,'border-width':2,'border-color':'#fbbf24' } as any },
        { selector:'edge', style:{ 'line-color':'#334155','target-arrow-color':'#334155','target-arrow-shape':'triangle','curve-style':'bezier','width':1.5,'label':'data(label)','font-size':8,'color':'#64748b','text-background-color':'#0a0e17','text-background-opacity':0.8,'text-background-padding':'2px' } as any }
      ],
      layout:{name:'cose',animate:false,padding:45}
    });
    cy.fit(undefined, 55);
    return ()=>cy.destroy();
  },[selected?.id]);

  return <div className="ontology-live-shell">
    <div className="ontology-live-header">
      <div><h2>Ontology Live</h2><p>La ontología se recalcula según el evento seleccionado.</p></div>
      {selected && <div className="ontology-selected-meta"><b>{selected.source}</b><span>{selected.country || 'Sin geolocalización'} · S{selected.severity}</span></div>}
    </div>

    {error && <div className="aegis-card p-3 text-sm text-amber-300">{error}</div>}

    <div className="ontology-live-grid">
      <aside className="ontology-event-list aegis-card">
        <div className="ontology-list-title">Eventos</div>
        <div className="ontology-list-scroll">
          {safeEvents.slice(0,80).map(e=>{
            const actorCount = safeStrings(e?.actors).length;
            return <button key={e.id} onClick={()=>setSelectedId(e.id)} className={selected?.id === e.id ? 'is-selected' : ''}>
              <small>{e.source}</small>
              <b>{e.title}</b>
              <span>{e.country || 'Sin ubicación'} · {actorCount} actores</span>
            </button>;
          })}
        </div>
      </aside>

      <section className="ontology-graph-panel aegis-card">
        {selected ? <>
          <div className="ontology-event-summary">
            <h3>{selected.title}</h3>
            <p>{selected.description || 'Sin descripción disponible.'}</p>
          </div>
          <div ref={ref} className="ontology-graph-canvas" />
        </> : <div className="live-empty">No hay eventos disponibles.</div>}
      </section>
    </div>
  </div>;
}
