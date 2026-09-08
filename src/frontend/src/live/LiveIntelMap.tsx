import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { X, ExternalLink, RefreshCcw } from 'lucide-react';
import type { IntelEvent } from './types';

const severityColor = (s:number) => s >= 8 ? '#ef4444' : s >= 5 ? '#f59e0b' : '#22c55e';

export default function LiveIntelMap() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [selected, setSelected] = useState<IntelEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rss');
      const data = await res.json();
      setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); const id = setInterval(load, 300000); return () => clearInterval(id); }, []);

  const mapped = useMemo(() => events.filter(e => typeof e.lat === 'number' && typeof e.lng === 'number'), [events]);

  return <div className="live-intel-shell">
    <div className="live-intel-toolbar">
      <div><h2>Live Intelligence Map</h2><p>RSS normalizados a objetos Event · Actor · Location · Source</p></div>
      <button onClick={load}><RefreshCcw className={loading ? 'spin' : ''} size={16}/>Actualizar</button>
    </div>

    <div className="live-intel-grid">
      <div className="aegis-card live-map-card">
        <MapContainer center={[20,0]} zoom={2} className="w-full h-full min-h-[580px]">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
          {mapped.map(e => <CircleMarker key={e.id} center={[e.lat!, e.lng!]} radius={6 + Math.min(e.severity,10)/2}
            pathOptions={{ color: severityColor(e.severity), fillColor: severityColor(e.severity), fillOpacity:.55, weight:1.5 }}
            eventHandlers={{ click:()=>setSelected(e) }}>
            <Tooltip><div><b>{e.title}</b><br/>{e.source}</div></Tooltip>
          </CircleMarker>)}
        </MapContainer>
      </div>

      <div className="live-feed-list">
        {events.slice(0,40).map(e => <article key={e.id} className="aegis-card live-event-card" onClick={()=>setSelected(e)}>
          {e.image && <img src={e.image} alt="" />}
          <div><small>{e.source} · {new Date(e.publishedAt).toLocaleString()}</small><h3>{e.title}</h3>
          <p>{e.description}</p><div className="tag-row">{e.actors.map(a=><span key={a}>{a}</span>)}</div></div>
        </article>)}
      </div>
    </div>

    {selected && <div className="floating-intel-window draggable-window">
      <div className="floating-window-header"><b>EVENT / {selected.source}</b><button onClick={()=>setSelected(null)}><X size={15}/></button></div>
      {selected.image && <img src={selected.image} className="floating-window-image" alt="" />}
      <div className="floating-window-body"><h3>{selected.title}</h3><p>{selected.description}</p>
      <div className="tag-row">{selected.actors.map(a=><span key={a}>{a}</span>)}</div>
      <a href={selected.link} target="_blank" rel="noreferrer">Abrir fuente <ExternalLink size={13}/></a></div>
    </div>}
  </div>;
}
