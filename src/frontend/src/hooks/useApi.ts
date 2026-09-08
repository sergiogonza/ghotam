import { useQuery } from '@tanstack/react-query';
import {
  getCombinedDashboardStats,
  getCombinedEvents,
  getCombinedFacilities,
  getCombinedGraph,
  getCombinedPersons,
  getCombinedRiskCases,
  getCombinedTimeline,
  searchCombinedIntel,
} from '../live/offlineAdapters';

export const useDashboardStats = () => useQuery({ queryKey:['dashboard-stats-live'], queryFn:getCombinedDashboardStats, staleTime:5_000 });
export const useFacilities = () => useQuery({ queryKey:['facilities-live'], queryFn:getCombinedFacilities, staleTime:5_000 });
export const useEvents = (params?: { eventType?:string; minSeverity?:number; severity?:number; facilityId?:string; }) => useQuery({ queryKey:['events-live',params], queryFn:()=>getCombinedEvents(params), staleTime:5_000 });
export const usePersons = () => useQuery({ queryKey:['persons-live'], queryFn:getCombinedPersons, staleTime:5_000 });
export const useRiskCases = () => useQuery({ queryKey:['risk-cases-live'], queryFn:getCombinedRiskCases, staleTime:5_000 });
export const useCaseGraph = (caseId:string|null) => useQuery({ queryKey:['case-graph-live',caseId], queryFn:()=>getCombinedGraph(caseId,2), enabled:!!caseId, staleTime:5_000 });
export const useGraphExplore = (nodeId:string|null,depth=2) => useQuery({ queryKey:['graph-explore-live',nodeId,depth], queryFn:()=>getCombinedGraph(nodeId,depth), enabled:!!nodeId, staleTime:5_000 });
export const useTimeline = (from:string,to:string,facilityId?:string) => useQuery({ queryKey:['timeline-live',from,to,facilityId], queryFn:()=>getCombinedTimeline(from,to,facilityId), staleTime:5_000 });
export const useSearch = (query:string) => useQuery({ queryKey:['search-live',query], queryFn:()=>searchCombinedIntel(query), enabled:query.length>=2, staleTime:5_000 });
