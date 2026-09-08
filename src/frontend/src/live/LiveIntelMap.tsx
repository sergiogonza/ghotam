import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { X, ExternalLink, RefreshCcw, MapPin, Newspaper } from 'lucide-react';
import type { IntelEvent } from './types';

const severityColor = (s:number) => s >= 8 ? '#ef4444' : s >= 5 ? '#f59e0b' : '#22c55e';

function normalizeEvent(raw: any, index: number): IntelEvent {
  return {
    id: String(raw?.id || `event-${index}`),
    title: String(raw?.title || 'Evento sin título'),
    description: String(raw?.description || ''),
    link: String(raw?.link || ''),
    source: String(raw?.source || 'Fuente desconocida'),
    publishedAt: String(raw?.publishedAt || new Date().toISOString()),
    image: typeof raw?.image === 'string' ? raw.image : undefined,
    lat: typeof raw?.lat === 'number' ? raw.lat : undefined,
    lng: typeof raw?.lng === 'number' ? raw.lng : undefined,
    country: typeof raw?.country === 'string' ? raw.country : undefined,
    actors: Array.isArray(raw?.actors) ? raw.actors.filter((a:any)=>typeof a === 'string') : [],
    tags: Array.isArray(raw?.tags) ? raw.tags.filter((t:any)=>typeof t === 'string') : [],
    severity: Number.isFinite(Number(raw?.severity)) ? Number(raw.severity) : 1
  };
}

export default function LiveIntelMap() {
  const [events, setEvents] = useState<IntelEvent[]>([]);
  const [selected, setSelected] = useState<IntelEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rss', { headers: { accept: 'application/json' } });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) throw new Error(`RSS API ${res.status}`);
      if (!contentType.includes('application/json')) throw new Error('RSS API devolvió una respuesta no JSON');
      const data = await res.json();
      const normalized = Array.isArray(data?.events) ? data.events.map(normalizeEvent) : [];
      setEvents(normalized);
    } catch (err) {
      console.error('Live RSS error', err);
      setEvents([]);
      setError(err instanceof Error ? err.message : 'No se pudo cargar RSS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 300000);
    return () => clearInterval(id);
  }, []);

  const mapped = useMemo(() => events.filter(e => typeof e.lat === 'number' && typeof e.lng === 'number'), [events]);

  const inspector = selected && typeof document !== 'undefined' ? createPortal(
    <div className="floating-intel-window" role="dialog" aria-modal="true">
      <div className="floating-window-header">
        <b>EVENT / {selected.source}</b>
        <button onClick={()=>setSelected(null)} aria-label="Cerrar"><X size={15}/></button>
      </div>
      {selected.image && <img src={selected.image} className="floating-window-image" alt="" />}
      <div className="floating-window-body">
        <div className="event-meta-row">
          {selected.country && <span><MapPin size={12}/>{selected.country}</span>}
          <span>Severidad {selected.severity}/10</span>
        </div>
        <h3>{selected.title}</h3>
        <p>{selected.description || 'Sin descripción disponible.'}</p>
        <div className="tag-row">{selected.actors.map(a=><span key={a}>{a}</span>)}</div>
        {selected.link && <a href={selected.link} target="_blank" rel="noreferrer">Abrir fuente <ExternalLink size={13}/></a>}
      </div>
    </div>,
    document.body
  ) : null;

  return <div className="live-intel-shell">
    <div className="live-intel-toolbar">
      <div>
        <h2>Live Intelligence Map</h2>
        <p>{events.length} eventos · {mapped.length} con geolocalización verificable</p>
      </div>
      <button onClick={load}><RefreshCcw className={loading ? 'spin' : ''} size={16}/>Actualizar</button>
    </div>

    {error && <div className="aegis-card p-3 text-sm text-amber-300">{error}</div>}

    <div className="live-intel-grid">
      <div className="aegis-card live-map-card">
        <MapContainer center={[20,0]} zoom={2} className="w-full h-full min-h-[580px]">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
          {mapped.map(e => <CircleMarker
            key={e.id}
            center={[e.lat!, e.lng!]}
            radius={7 + Math.min(e.severity,10)/2}
            pathOptions={{ color: severityColor(e.severity), fillColor: severityColor(e.severity), fillOpacity:.68, weight:2 }}
            eventHandlers={{ click:()=>setSelected(e) }}>
            <Tooltip direction="top" opacity={0.96}>
              <div><b>{e.title}</b><br/>{e.source}{e.country ? ` · ${e.country}` : ''}</div>
            </Tooltip>
          </CircleMarker>)}
        </MapContainer>
      </div>

      <aside className="live-feed-panel aegis-card">
        <div className="live-feed-header"><Newspaper size={15}/><div><b>Eventos en vivo</b><span>{events.length} resultados</span></div></div>
        <div className="live-feed-list">
          {events.length === 0 && !loading && <div className="live-empty">No hay eventos disponibles.</div>}
          {events.slice(0,60).map(e => <article
            key={e.id}
            className={`live-event-card ${selected?.id === e.id ? 'is-selected' : ''}`}
            onClick={()=>setSelected(e)}>
            {e.image && <img src={e.image} alt="" />}
            <div className="live-event-copy">
              <small>{e.source} · {new Date(e.publishedAt).toLocaleString()}</small>
              <h3>{e.title}</h3>
              <p>{e.description || 'Sin descripción disponible.'}</p>
              <div className="live-event-footer">
                {e.country && <span className="event-country"><MapPin size={10}/>{e.country}</span>}
                <span className="event-severity">S{e.severity}</span>
              </div>
              {e.actors.length > 0 && <div className="tag-row">{e.actors.map(a=><span key={a}>{a}</span>)}</div>}
            </div>
          </article>)}
        </div>
      </aside>
    </div>

    {inspector}
  </div>;
}
