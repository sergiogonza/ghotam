import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { buildOntology } from './ontology';
import type { IntelEvent } from './types';

const colors: Record<string,string> = { Event:'#f59e0b', Actor:'#06b6d4', Location:'#f472b6', Source:'#8b5cf6' };

export default function OntologyView(){
  const ref = useRef<HTMLDivElement>(null);
  const [events,setEvents] = useState<IntelEvent[]>([]);

  useEffect(()=>{ fetch('/api/rss').then(r=>r.json()).then(d=>setEvents(d.events||[])); },[]);

  useEffect(()=>{
    if(!ref.current) return;
    const g = buildOntology(events);
    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...g.nodes.map(n=>({data:{id:n.id,label:n.label,type:n.type,color:colors[n.type]}})),
        ...g.edges.map(e=>({data:{id:e.id,source:e.source,target:e.target,label:e.type}}))
      ],
      style:[
        { selector:'node', style:{ 'background-color':'data(color)','label':'data(label)','color':'#e2e8f0','font-size':9,'text-wrap':'wrap','text-max-width':110 } as any },
        { selector:'edge', style:{ 'line-color':'#334155','target-arrow-color':'#334155','target-arrow-shape':'triangle','curve-style':'bezier','width':1,'label':'data(label)','font-size':7,'color':'#64748b' } as any }
      ],
      layout:{name:'cose',animate:false,padding:30}
    });
    return ()=>cy.destroy();
  },[events]);

  return <div className="h-full flex flex-col gap-3"><div><h2 className="text-xl font-bold text-gray-100">Ontology Live</h2>
  <p className="text-xs text-gray-500">Event → Actor / Location / Source</p></div><div ref={ref} className="aegis-card flex-1 min-h-[650px]" /></div>;
}
