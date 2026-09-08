import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { MapPin, Radio, Users, ArrowLeft, Network, Search } from 'lucide-react';
import { useFacilities } from '../hooks/useApi';
import Pagination from './Pagination';

const criticalityColors: Record<string,{bg:string;text:string;border:string}> = {
  CRITICAL:{bg:'bg-red-500/10',text:'text-red-400',border:'border-red-500/30'},
  HIGH:{bg:'bg-orange-500/10',text:'text-orange-400',border:'border-orange-500/30'},
  MEDIUM:{bg:'bg-yellow-500/10',text:'text-yellow-400',border:'border-yellow-500/30'},
  LOW:{bg:'bg-green-500/10',text:'text-green-400',border:'border-green-500/30'},
};

export default function FacilitiesView(){
  const {data:facilities=[],isLoading}=useFacilities();
  const navigate=useNavigate();
  const [page,setPage]=useState(1);
  const [query,setQuery]=useState('');
  const PAGE_SIZE=14;
  const safe=Array.isArray(facilities)?facilities:[];
  const filtered=useMemo(()=>safe.filter(f=>`${f.name} ${f.criticality}`.toLowerCase().includes(query.toLowerCase())),[safe,query]);
  const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  if(isLoading)return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-cyan-400">Loading observed locations...</div></div>;

  return <div className="space-y-5 animate-slide-in">
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4"><button onClick={()=>navigate('/')} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><ArrowLeft className="w-5 h-5"/></button><div><h2 className="text-2xl font-bold text-gray-100">Observed Locations</h2><p className="text-sm text-gray-500 mt-1">{safe.length} geolocated nodes extracted from current RSS events</p></div></div>
      <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-600"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search location" className="pl-8 pr-3 py-2 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] text-xs text-gray-300"/></div>
    </div>

    <div className="grid grid-cols-4 gap-3">{['CRITICAL','HIGH','MEDIUM','LOW'].map(level=>{const c=criticalityColors[level];const count=safe.filter(f=>f.criticality===level).length;return <div key={level} className={`aegis-card p-4 border ${c.border}`}><p className="text-[10px] text-gray-500 uppercase tracking-wider">{level}</p><p className={`text-2xl font-bold mt-1 ${c.text}`}>{count}</p></div>})}</div>

    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
      {visible.map(f=>{const c=criticalityColors[f.criticality]||criticalityColors.LOW;return <button key={f.facilityId} onClick={()=>navigate(`/graph/LOC:${encodeURIComponent(f.name)}`)} className="aegis-card aegis-card-hover p-4 text-left">
        <div className="flex items-start justify-between gap-3"><div><span className="text-[9px] uppercase tracking-wider text-gray-600">Geospatial node</span><h3 className="text-base font-semibold text-gray-100 mt-1">{f.name}</h3></div><span className={`px-2 py-1 rounded text-[9px] border ${c.bg} ${c.text} ${c.border}`}>{f.criticality}</span></div>
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400"><MapPin size={12}/>{Number(f.latitude).toFixed(4)}, {Number(f.longitude).toFixed(4)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded bg-[var(--aegis-surface-2)] p-2"><div className="flex items-center gap-1 text-[9px] text-gray-600 uppercase"><Radio size={10}/>Sources</div><b className="text-sm text-cyan-300">{f.sensorCount}</b></div><div className="rounded bg-[var(--aegis-surface-2)] p-2"><div className="flex items-center gap-1 text-[9px] text-gray-600 uppercase"><Users size={10}/>Actors</div><b className="text-sm text-purple-300">{f.assetCount}</b></div></div>
        <div className="flex items-center gap-1 mt-3 text-[10px] text-cyan-400"><Network size={10}/>Open ontology relationships</div>
      </button>})}
    </div>
    {!visible.length&&<div className="aegis-card p-8 text-center text-sm text-gray-500">No geolocated nodes found.</div>}
    <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage}/>
  </div>;
}
