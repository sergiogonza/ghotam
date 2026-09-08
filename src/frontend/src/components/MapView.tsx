import { useState } from 'react';
import { useFacilities } from '../hooks/useApi';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { MapPin, X, Network, Radio, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Facility } from '../types';
import 'leaflet/dist/leaflet.css';

const CRITICALITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

export default function MapView() {
  const { data: facilities = [], isLoading } = useFacilities();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Facility | null>(null);
  const safeFacilities = Array.isArray(facilities) ? facilities : [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-cyan-400">Loading live geospatial data...</div></div>;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Geospatial Intelligence</h2>
          <p className="text-xs text-gray-500 mt-1">{safeFacilities.length} locations derived from public-source events · click a hotspot to inspect</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(CRITICALITY_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:color}}/><span className="text-[10px] text-gray-400">{level}</span></div>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[minmax(0,1fr)_340px] gap-4 min-h-0">
        <div className="aegis-card overflow-hidden rounded-xl min-h-[560px]">
          <MapContainer center={[20,0]} zoom={2} className="w-full h-full min-h-[560px]" style={{background:'#0d1117'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution=""/>
            {safeFacilities.map(f => {
              if (!Number.isFinite(Number(f.latitude)) || !Number.isFinite(Number(f.longitude))) return null;
              const color = CRITICALITY_COLORS[f.criticality] || '#64748b';
              const isSelected = selected?.facilityId === f.facilityId;
              return (
                <CircleMarker
                  key={f.facilityId}
                  center={[Number(f.latitude), Number(f.longitude)]}
                  radius={isSelected ? 14 : f.criticality === 'CRITICAL' || f.criticality === 'HIGH' ? 11 : 8}
                  pathOptions={{color:isSelected ? '#06b6d4' : color,fillColor:color,fillOpacity:isSelected ? .62 : .38,weight:isSelected ? 3 : 2}}
                  eventHandlers={{click:()=>setSelected(f)}}
                >
                  <Tooltip direction="top" opacity={.96}><b>{f.name}</b><br/>{f.criticality} · {f.sensorCount} sources · {f.assetCount} actors</Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        <aside className="aegis-card p-4 overflow-auto min-h-[560px]">
          {selected ? <>
            <div className="flex items-start justify-between gap-3">
              <div><span className="text-[9px] text-cyan-400 uppercase tracking-widest">Live location node</span><h3 className="text-lg font-bold text-gray-100 mt-1">{selected.name}</h3></div>
              <button onClick={()=>setSelected(null)} className="text-gray-500 hover:text-gray-200"><X size={16}/></button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-gray-300"><MapPin size={14} className="text-cyan-400"/><span>{Number(selected.latitude).toFixed(4)}, {Number(selected.longitude).toFixed(4)}</span></div>
              <div className="flex items-center gap-2 text-gray-300"><Radio size={14} className="text-cyan-400"/><span>{selected.sensorCount} fuentes relacionadas</span></div>
              <div className="flex items-center gap-2 text-gray-300"><Users size={14} className="text-purple-400"/><span>{selected.assetCount} actores detectados</span></div>
              <div className="pt-3 border-t border-[var(--aegis-border)]"><span className="inline-flex px-2 py-1 rounded border border-slate-600 text-slate-300 text-[10px]">TLP:CLEAR</span><span className="ml-2 text-[10px] text-gray-500">{selected.criticality}</span></div>
            </div>
            <button onClick={()=>navigate(`/graph/LOC:${encodeURIComponent(selected.name)}`)} className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs"><Network size={14}/>Abrir relaciones en Graph</button>
          </> : <div className="h-full flex flex-col items-center justify-center text-center text-gray-500"><MapPin size={28} className="mb-3 text-gray-600"/><p className="text-sm text-gray-300">Selecciona una ubicación</p><p className="text-xs mt-1">Verás sus coordenadas, fuentes y actores asociados.</p></div>}
        </aside>
      </div>
    </div>
  );
}
