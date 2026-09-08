import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Building2, MapPin, Radio, Package, ArrowLeft, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useFacilities } from '../hooks/useApi';
import type { Facility } from '../types';
import EntityActionModal from './EntityActionModal';
import Pagination from './Pagination';

const criticalityColors: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  MEDIUM: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  LOW: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
};

const statusIcon = (status: unknown) => {
  const value = String(status || '').toLowerCase();
  if (value === 'operational') return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (value === 'maintenance') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
};

const typeLabels: Record<string, string> = {
  WaterTreatmentPlant: 'Water Treatment Plant',
  PumpStation: 'Pump Station',
  Reservoir: 'Reservoir',
  DistributionNode: 'Distribution Node',
};

function normalizeFacility(raw: any, index: number): Facility {
  return {
    facilityId: String(raw?.facilityId || `FAC-${index + 1}`),
    name: String(raw?.name || 'Unnamed facility'),
    type: String(raw?.type || 'Unknown'),
    status: String(raw?.status || 'Unknown'),
    criticality: String(raw?.criticality || 'LOW').toUpperCase(),
    latitude: Number.isFinite(Number(raw?.latitude)) ? Number(raw.latitude) : 0,
    longitude: Number.isFinite(Number(raw?.longitude)) ? Number(raw.longitude) : 0,
    sensorCount: Number.isFinite(Number(raw?.sensorCount)) ? Number(raw.sensorCount) : 0,
    assetCount: Number.isFinite(Number(raw?.assetCount)) ? Number(raw.assetCount) : 0,
  };
}

export default function FacilitiesView() {
  const { data: facilities, isLoading } = useFacilities();
  const safeFacilities = Array.isArray(facilities) ? facilities.map(normalizeFacility) : [];
  const navigate = useNavigate();
  const [modalEntity, setModalEntity] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-cyan-400">Loading facilities...</div></div>;

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
        <div><h2 className="text-2xl font-bold text-gray-100">Facilities</h2><p className="text-sm text-gray-500 mt-1">{safeFacilities.length} monitored facilities</p></div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {['CRITICAL','HIGH','MEDIUM','LOW'].map((level) => {
          const count = safeFacilities.filter((f) => f.criticality === level).length;
          const colors = criticalityColors[level];
          return <div key={level} className={`aegis-card p-4 border ${colors.border}`}><p className="text-xs text-gray-500 uppercase tracking-wider">{level}</p><p className={`text-2xl font-bold mt-1 ${colors.text}`}>{count}</p></div>;
        })}
      </div>

      {safeFacilities.length === 0 ? (
        <div className="aegis-card p-8 text-center"><Building2 className="w-8 h-8 text-gray-600 mx-auto mb-3"/><p className="text-sm text-gray-400">Facilities backend not connected in this Netlify deployment.</p><p className="text-xs text-gray-600 mt-1">The page remains available without crashing.</p></div>
      ) : (
        <div className="aegis-card overflow-auto">
          <table className="w-full"><thead><tr className="border-b border-[var(--aegis-border)]">{['Facility','Type','Status','Criticality','Sensors','Assets','Location'].map(h=><th key={h} className="text-left text-xs text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead>
            <tbody>{safeFacilities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((f) => {
              const colors = criticalityColors[f.criticality] ?? criticalityColors.LOW;
              return <tr key={f.facilityId} onClick={() => setModalEntity({ id:f.facilityId, name:f.name })} className="border-b border-[var(--aegis-border)] hover:bg-white/5 cursor-pointer">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><Building2 className="w-4 h-4 text-blue-400"/><div><p className="text-sm text-gray-200">{f.name}</p><p className="text-xs text-gray-600 font-mono">{f.facilityId}</p></div></div></td>
                <td className="px-5 py-4 text-sm text-gray-400">{typeLabels[f.type] ?? f.type}</td>
                <td className="px-5 py-4"><div className="flex items-center gap-2">{statusIcon(f.status)}<span className="text-sm text-gray-300">{f.status}</span></div></td>
                <td className="px-5 py-4"><span className={`inline-flex px-2 py-1 rounded text-xs ${colors.bg} ${colors.text}`}>{f.criticality}</span></td>
                <td className="px-5 py-4"><div className="flex items-center gap-1 text-sm text-gray-400"><Radio className="w-3.5 h-3.5 text-cyan-500"/>{f.sensorCount}</div></td>
                <td className="px-5 py-4"><div className="flex items-center gap-1 text-sm text-gray-400"><Package className="w-3.5 h-3.5 text-purple-500"/>{f.assetCount}</div></td>
                <td className="px-5 py-4"><div className="flex items-center gap-1 text-xs text-gray-500 font-mono"><MapPin className="w-3.5 h-3.5"/>{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={page} totalItems={safeFacilities.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      {modalEntity && <EntityActionModal entityId={modalEntity.id} entityType="facility" entityName={modalEntity.name} onClose={() => setModalEntity(null)} />}
    </div>
  );
}
