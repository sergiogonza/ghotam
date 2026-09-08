import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Users, ArrowLeft, Network, Search } from 'lucide-react';
import { usePersons } from '../hooks/useApi';
import Pagination from './Pagination';

export default function PersonsView() {
  const { data: persons = [], isLoading } = usePersons();
  const navigate = useNavigate();
  const [page,setPage] = useState(1);
  const [query,setQuery] = useState('');
  const PAGE_SIZE=16;
  const safePersons=Array.isArray(persons)?persons:[];
  const filtered=useMemo(()=>safePersons.filter(p=>`${p.name} ${p.role} ${p.organizationName||''}`.toLowerCase().includes(query.toLowerCase())),[safePersons,query]);
  const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  if(isLoading)return <div className="flex items-center justify-center h-full"><div className="animate-pulse text-cyan-400">Loading detected actors...</div></div>;

  return <div className="space-y-5 animate-slide-in">
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4"><button onClick={()=>navigate('/')} className="p-2 rounded-lg hover:bg-white/5 text-gray-400"><ArrowLeft className="w-5 h-5"/></button><div><h2 className="text-2xl font-bold text-gray-100">Actors Registry</h2><p className="text-sm text-gray-500 mt-1">{safePersons.length} actors extracted from current public-source events</p></div></div>
      <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-600"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Search actor" className="pl-8 pr-3 py-2 rounded-lg bg-[var(--aegis-surface-2)] border border-[var(--aegis-border)] text-xs text-gray-300"/></div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{visible.map(p=><button key={p.personId} onClick={()=>navigate(`/graph/ACTOR:${encodeURIComponent(p.name)}`)} className="aegis-card aegis-card-hover p-4 text-left">
      <div className="flex items-start justify-between gap-3"><div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><Users className="w-4 h-4 text-purple-300"/></div><span className="text-[9px] text-slate-500 border border-slate-700 rounded px-1.5 py-.5">TLP:CLEAR</span></div>
      <h3 className="text-sm font-semibold text-gray-100 mt-3">{p.name}</h3><p className="text-[10px] text-gray-500 mt-1">{p.role}</p><div className="flex items-center gap-1 mt-3 text-[10px] text-cyan-400"><Network size={10}/>Open ontology relationships</div>
    </button>)}</div>
    {!visible.length&&<div className="aegis-card p-8 text-center text-sm text-gray-500">No actors found.</div>}
    <Pagination currentPage={page} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage}/>
  </div>;
}
