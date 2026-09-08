import { useQuery } from '@tanstack/react-query';
import {
  getLiveDashboardStats,
  getLiveEvents,
  getLiveFacilities,
  getLiveGraph,
  getLivePersons,
  getLiveRiskCases,
  getLiveTimeline,
  searchLiveIntel,
} from '../live/legacyBridge';

export const useDashboardStats = () =>
  useQuery({ queryKey: ['dashboard-stats-live'], queryFn: getLiveDashboardStats, staleTime: 30_000 });

export const useFacilities = () =>
  useQuery({ queryKey: ['facilities-live'], queryFn: getLiveFacilities, staleTime: 30_000 });

export const useEvents = (params?: {
  eventType?: string;
  minSeverity?: number;
  severity?: number;
  facilityId?: string;
}) =>
  useQuery({
    queryKey: ['events-live', params],
    queryFn: () => getLiveEvents(params),
    staleTime: 30_000,
  });

export const usePersons = () =>
  useQuery({ queryKey: ['persons-live'], queryFn: getLivePersons, staleTime: 30_000 });

export const useRiskCases = () =>
  useQuery({ queryKey: ['risk-cases-live'], queryFn: getLiveRiskCases, staleTime: 30_000 });

export const useCaseGraph = (caseId: string | null) =>
  useQuery({
    queryKey: ['case-graph-live', caseId],
    queryFn: () => getLiveGraph(caseId, 2),
    enabled: !!caseId,
    staleTime: 30_000,
  });

export const useGraphExplore = (nodeId: string | null, depth = 2) =>
  useQuery({
    queryKey: ['graph-explore-live', nodeId, depth],
    queryFn: () => getLiveGraph(nodeId, depth),
    enabled: !!nodeId,
    staleTime: 30_000,
  });

export const useTimeline = (from: string, to: string, facilityId?: string) =>
  useQuery({
    queryKey: ['timeline-live', from, to, facilityId],
    queryFn: () => getLiveTimeline(from, to, facilityId),
    staleTime: 30_000,
  });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: ['search-live', query],
    queryFn: () => searchLiveIntel(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
