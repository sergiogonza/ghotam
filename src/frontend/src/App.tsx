import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LiveIntelMap from './live/LiveIntelMap';
import OntologyView from './live/OntologyView';

const Dashboard=lazy(()=>import('./components/Dashboard'));
const GraphExplorer=lazy(()=>import('./components/GraphExplorer'));
const MapView=lazy(()=>import('./components/MapView'));
const CasesView=lazy(()=>import('./components/CasesView'));
const EventsView=lazy(()=>import('./components/EventsView'));
const TimelineView=lazy(()=>import('./components/TimelineView'));
const FacilitiesView=lazy(()=>import('./components/FacilitiesView'));
const PersonsView=lazy(()=>import('./components/PersonsView'));
const EntityInvestigation=lazy(()=>import('./components/EntityInvestigation'));
const CommandCenter=lazy(()=>import('./components/CommandCenter'));
const RiskPropagation=lazy(()=>import('./components/RiskPropagation'));
const AdminEvents=lazy(()=>import('./components/AdminEvents'));
const CorpusLab=lazy(()=>import('./components/CorpusLab'));
const legacy=(node:ReactNode)=><Suspense fallback={<div className="aegis-card p-4 text-sm text-gray-400">Cargando módulo…</div>}>{node}</Suspense>;
export default function App(){return <Routes><Route path="/" element={<Layout/>}>
<Route index element={<LiveIntelMap/>}/><Route path="live" element={<LiveIntelMap/>}/><Route path="ontology" element={<OntologyView/>}/><Route path="dashboard" element={legacy(<Dashboard/>)}/><Route path="admin" element={legacy(<AdminEvents/>)}/><Route path="corpus" element={legacy(<CorpusLab/>)}/><Route path="graph" element={legacy(<GraphExplorer/>)}/><Route path="graph/:nodeId" element={legacy(<GraphExplorer/>)}/><Route path="map" element={legacy(<MapView/>)}/><Route path="cases" element={legacy(<CasesView/>)}/><Route path="events" element={legacy(<EventsView/>)}/><Route path="facilities" element={legacy(<FacilitiesView/>)}/><Route path="persons" element={legacy(<PersonsView/>)}/><Route path="timeline" element={legacy(<TimelineView/>)}/><Route path="investigate/:entityType/:entityId" element={legacy(<EntityInvestigation/>)}/><Route path="command-center" element={legacy(<CommandCenter/>)}/><Route path="risk-propagation" element={legacy(<RiskPropagation/>)}/>
</Route></Routes>}
