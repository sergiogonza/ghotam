import { useQuery } from '@tanstack/react-query';
import { dashboardApi, eventsApi, facilitiesApi, graphApi, personsApi, riskCasesApi, searchApi, timelineApi } from '../services/api';
import type { DashboardStats, Event, Facility, GraphData, Person, RiskCase, SearchResult, TimelineEvent } from '../types';

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const asGraph = (value: unknown): GraphData => {
  const v = value && typeof value === 'object' ? value as any : {};
  return { nodes: asArray(v.nodes), edges: asArray(v.edges) };
};
const asStats = (value: unknown): DashboardStats => {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as any : {};
  return {
    totalFacilities: Number(v.totalFacilities) || 0,
    totalEvents: Number(v.totalEvents) || 0,
    openCases: Number(v.openCases) || 0,
    criticalAlerts: Number(v.criticalAlerts) || 0,
    totalPersons: Number(v.totalPersons) || 0,
    eventsByType: asArray(v.eventsByType),
    eventsBySeverity: asArray(v.eventsBySeverity),
  };
};
const asSearch = (value: unknown): SearchResult => {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as any : {};
  return { totalCount: Number(v.totalCount) || 0, hits: asArray(v.hits) };
};

export const useDashboardStats = () => useQuery({ queryKey:['dashboard-stats'], queryFn: async()=>asStats(await dashboardApi.getStats()) });
export const useFacilities = () => useQuery({ queryKey:['facilities'], queryFn: async()=>asArray<Facility>(await facilitiesApi.getAll()) });
export const useEvents = (params?: { eventType?: string; minSeverity?: number; severity?: number; facilityId?: string; }) =>
  useQuery({ queryKey:['events',params], queryFn: async()=>asArray<Event>(await eventsApi.getAll(params)) });
export const usePersons = () => useQuery({ queryKey:['persons'], queryFn: async()=>asArray<Person>(await personsApi.getAll()) });
export const useRiskCases = () => useQuery({ queryKey:['risk-cases'], queryFn: async()=>asArray<RiskCase>(await riskCasesApi.getAll()) });
export const useCaseGraph = (caseId:string|null) => useQuery({ queryKey:['case-graph',caseId], queryFn:async()=>asGraph(await riskCasesApi.getCaseGraph(caseId!)), enabled:!!caseId });
export const useGraphExplore = (nodeId:string|null, depth=2) => useQuery({ queryKey:['graph-explore',nodeId,depth], queryFn:async()=>asGraph(await graphApi.explore(nodeId!,depth)), enabled:!!nodeId });
export const useTimeline = (from:string,to:string,facilityId?:string) => useQuery({ queryKey:['timeline',from,to,facilityId], queryFn:async()=>asArray<TimelineEvent>(await timelineApi.get(from,to,facilityId)) });
export const useSearch = (query:string) => useQuery({ queryKey:['search',query], queryFn:async()=>asSearch(await searchApi.search(query)), enabled:query.length>=2 });
