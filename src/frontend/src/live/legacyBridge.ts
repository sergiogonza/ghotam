import type {
  DashboardStats,
  Event,
  Facility,
  GraphData,
  Person,
  RiskCase,
  SearchResult,
  TimelineEvent,
} from '../types';

type RawIntel = Record<string, any>;

type RssEnvelope = {
  updatedAt?: string;
  events?: RawIntel[];
};

let cache: { at: number; events: RawIntel[] } | null = null;
const CACHE_MS = 30_000;

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : [];

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const text = (v: unknown, fallback = '') => typeof v === 'string' && v.trim() ? v.trim() : fallback;

export async function loadLiveIntel(force = false): Promise<RawIntel[]> {
  const now = Date.now();
  if (!force && cache && now - cache.at < CACHE_MS) return cache.events;

  try {
    const res = await fetch('/api/rss', { headers: { accept: 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) return cache?.events ?? [];
    const data = await res.json() as RssEnvelope;
    const events = Array.isArray(data?.events) ? data.events.filter(Boolean) : [];
    cache = { at: now, events };
    return events;
  } catch {
    return cache?.events ?? [];
  }
}

export function legacySeverity(rawSeverity: unknown): number {
  const s = Math.max(0, Math.min(10, num(rawSeverity, 1)));
  return Math.max(0, Math.min(5, Math.ceil(s / 2)));
}

function eventTypeOf(e: RawIntel): string {
  const category = text(e.category).toLowerCase();
  if (category === 'cyber') return 'CyberAlert';
  if (category === 'economics') return 'Economic';
  if (category === 'policy' || category === 'institutions') return 'Policy';
  if (category === 'geopolitics') return 'Geopolitical';
  if (category === 'world') return 'World';
  return text(e.feedId, 'OpenSourceIntel');
}

function locationOf(e: RawIntel) {
  const primary = Array.isArray(e.locations) && e.locations[0] ? e.locations[0] : null;
  const lat = typeof e.lat === 'number' ? e.lat : typeof primary?.lat === 'number' ? primary.lat : undefined;
  const lng = typeof e.lng === 'number' ? e.lng : typeof primary?.lng === 'number' ? primary.lng : undefined;
  const label = text(e.locationLabel, text(primary?.label, text(e.country, '')));
  const country = text(e.country, text(primary?.country, ''));
  return { lat, lng, label, country };
}

export function toLegacyEvents(raw: RawIntel[]): Event[] {
  return raw.map((e, i) => {
    const loc = locationOf(e);
    const actors = asStrings(e.actors);
    return {
      eventId: text(e.id, `LIVE-${i}`),
      eventType: eventTypeOf(e),
      description: text(e.title, text(e.description, 'Evento de inteligencia de fuente abierta')),
      severity: legacySeverity(e.severity),
      timestamp: text(e.publishedAt, new Date().toISOString()),
      facilityId: loc.label ? `LOC:${loc.label}` : undefined,
      facilityName: loc.label || loc.country || undefined,
      personId: actors[0] ? `ACTOR:${actors[0]}` : undefined,
      personName: actors[0],
      metadata: {
        source: text(e.source, text(e.feedId, 'RSS')),
        sourceUrl: text(e.link),
        image: text(e.image),
        country: loc.country,
        actors,
        tags: asStrings(e.tags),
        interestScore: num(e.interestScore),
        geoConfidence: num(e.geoConfidence),
        tlp: 'TLP:CLEAR',
        raw: e,
      },
    };
  });
}

export async function getLiveEvents(params?: {
  eventType?: string;
  minSeverity?: number;
  severity?: number;
  facilityId?: string;
}): Promise<Event[]> {
  let events = toLegacyEvents(await loadLiveIntel());
  if (params?.eventType) events = events.filter(e => e.eventType === params.eventType);
  if (typeof params?.minSeverity === 'number') events = events.filter(e => e.severity >= params.minSeverity!);
  if (typeof params?.severity === 'number') events = events.filter(e => e.severity === params.severity);
  if (params?.facilityId) events = events.filter(e => e.facilityId === params.facilityId);
  return events;
}

export async function getLiveFacilities(): Promise<Facility[]> {
  const raw = await loadLiveIntel();
  const byLocation = new Map<string, { label: string; lat: number; lng: number; severities: number[]; actors: Set<string>; sources: Set<string> }>();

  for (const e of raw) {
    const loc = locationOf(e);
    if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') continue;
    const key = `${loc.label || loc.country || 'Unknown'}|${loc.lat.toFixed(4)}|${loc.lng.toFixed(4)}`;
    const entry = byLocation.get(key) || {
      label: loc.label || loc.country || 'Location', lat: loc.lat, lng: loc.lng,
      severities: [], actors: new Set<string>(), sources: new Set<string>(),
    };
    entry.severities.push(num(e.severity, 1));
    asStrings(e.actors).forEach(a => entry.actors.add(a));
    entry.sources.add(text(e.source, text(e.feedId, 'RSS')));
    byLocation.set(key, entry);
  }

  return Array.from(byLocation.values()).map((v, i) => {
    const max = Math.max(1, ...v.severities);
    const criticality = max >= 8 ? 'CRITICAL' : max >= 6 ? 'HIGH' : max >= 4 ? 'MEDIUM' : 'LOW';
    return {
      facilityId: `LOC-${i + 1}`,
      name: v.label,
      type: 'OpenSourceLocation',
      status: 'Observed',
      criticality,
      latitude: v.lat,
      longitude: v.lng,
      sensorCount: v.sources.size,
      assetCount: v.actors.size,
    };
  });
}

export async function getLivePersons(): Promise<Person[]> {
  const raw = await loadLiveIntel();
  const actors = new Map<string, { count: number; org?: string }>();
  raw.forEach(e => asStrings(e.actors).forEach(a => {
    const prev = actors.get(a) || { count: 0 };
    prev.count += 1;
    actors.set(a, prev);
  }));
  return Array.from(actors.entries()).map(([name, info], i) => ({
    personId: `ACTOR-${i + 1}`,
    name,
    role: `Mentioned in ${info.count} live event${info.count === 1 ? '' : 's'}`,
    clearance: 'PUBLIC',
    personType: 'Actor',
    organizationId: undefined,
    organizationName: undefined,
  }));
}

export async function getLiveRiskCases(): Promise<RiskCase[]> {
  const raw = await loadLiveIntel();
  return raw
    .filter(e => num(e.interestScore) >= 55 || num(e.severity) >= 6)
    .slice(0, 100)
    .map((e, i) => {
      const loc = locationOf(e);
      const actors = asStrings(e.actors);
      const confidence = Math.max(num(e.geoConfidence, 0), actors.length ? 0.65 : 0.35);
      return {
        caseId: `LIVECASE:${text(e.id, String(i))}`,
        title: text(e.title, 'Live intelligence case'),
        status: num(e.severity) >= 8 ? 'Open' : 'Monitoring',
        confidence,
        riskScore: Math.max(1, Math.min(10, num(e.interestScore, num(e.severity) * 10) / 10)),
        description: text(e.description, `${text(e.source, 'RSS')} · ${loc.label || loc.country || 'sin ubicación'}`),
        createdAt: text(e.publishedAt, new Date().toISOString()),
        facilityName: loc.label || loc.country || undefined,
        linkedEventsCount: 1,
        linkedPersonNames: actors,
      };
    });
}

export async function getLiveDashboardStats(): Promise<DashboardStats> {
  const raw = await loadLiveIntel();
  const events = toLegacyEvents(raw);
  const facilities = await getLiveFacilities();
  const persons = await getLivePersons();
  const cases = await getLiveRiskCases();

  const typeMap = new Map<string, number>();
  const sevMap = new Map<number, number>();
  events.forEach(e => {
    typeMap.set(e.eventType, (typeMap.get(e.eventType) || 0) + 1);
    sevMap.set(e.severity, (sevMap.get(e.severity) || 0) + 1);
  });

  return {
    totalFacilities: facilities.length,
    totalEvents: events.length,
    openCases: cases.length,
    criticalAlerts: events.filter(e => e.severity >= 4).length,
    totalPersons: persons.length,
    eventsByType: Array.from(typeMap, ([type, count]) => ({ type, count })).sort((a,b) => b.count - a.count),
    eventsBySeverity: Array.from(sevMap, ([severity, count]) => ({ severity, count })).sort((a,b) => a.severity - b.severity),
  };
}

function addNode(nodes: GraphData['nodes'], id: string, label: string, type: string, properties: Record<string, unknown> = {}) {
  if (!nodes.some(n => n.id === id)) nodes.push({ id, label, type, properties });
}

function addEdge(edges: GraphData['edges'], source: string, target: string, type: string) {
  const id = `${source}|${type}|${target}`;
  if (!edges.some(e => e.id === id)) edges.push({ id, source, target, type, properties: {} });
}

export async function getLiveGraph(nodeId: string | null, depth = 2): Promise<GraphData> {
  const raw = await loadLiveIntel();
  const nodes: GraphData['nodes'] = [];
  const edges: GraphData['edges'] = [];
  const wanted = (nodeId || '').replace(/^LIVECASE:/, '');

  let matches = raw.filter(e => text(e.id) === wanted || `EVENT:${text(e.id)}` === nodeId);
  if (!matches.length && nodeId?.startsWith('ACTOR:')) {
    const actor = nodeId.slice(6);
    matches = raw.filter(e => asStrings(e.actors).includes(actor));
  }
  if (!matches.length && nodeId?.startsWith('LOC:')) {
    const loc = nodeId.slice(4);
    matches = raw.filter(e => {
      const l = locationOf(e);
      return l.label === loc || l.country === loc;
    });
  }
  if (!matches.length) matches = raw.slice(0, Math.min(depth > 1 ? 30 : 12, raw.length));

  matches.slice(0, 40).forEach((e, i) => {
    const eid = `EVENT:${text(e.id, String(i))}`;
    const source = text(e.source, text(e.feedId, 'RSS'));
    const sid = `SOURCE:${source}`;
    const loc = locationOf(e);
    addNode(nodes, eid, text(e.title, 'Event').slice(0, 120), 'Event', { severity: num(e.severity), publishedAt: e.publishedAt, link: e.link });
    addNode(nodes, sid, source, 'Source', {});
    addEdge(edges, eid, sid, 'PUBLISHED_BY');

    asStrings(e.actors).slice(0, 8).forEach(actor => {
      const aid = `ACTOR:${actor}`;
      addNode(nodes, aid, actor, 'Person', { actor: true });
      addEdge(edges, eid, aid, 'MENTIONS');
    });

    if (loc.label || loc.country) {
      const label = loc.label || loc.country;
      const lid = `LOC:${label}`;
      addNode(nodes, lid, label, 'Location', { latitude: loc.lat, longitude: loc.lng, country: loc.country });
      addEdge(edges, eid, lid, 'OCCURRED_AT');
    }
  });

  return { nodes, edges };
}

export async function getLiveTimeline(from?: string, to?: string, facilityId?: string): Promise<TimelineEvent[]> {
  let events = await getLiveEvents({ facilityId });
  const fromMs = from ? Date.parse(from) : NaN;
  const toMs = to ? Date.parse(to) : NaN;
  if (Number.isFinite(fromMs)) events = events.filter(e => Date.parse(e.timestamp) >= fromMs);
  if (Number.isFinite(toMs)) events = events.filter(e => Date.parse(e.timestamp) <= toMs);
  return events.map(e => ({
    eventId: e.eventId,
    eventType: e.eventType,
    description: e.description,
    severity: e.severity,
    timestamp: e.timestamp,
    facilityName: e.facilityName,
    personName: e.personName,
  }));
}

export async function searchLiveIntel(q: string, page = 1): Promise<SearchResult> {
  const raw = await loadLiveIntel();
  const needle = q.trim().toLowerCase();
  const matched = raw.filter(e => {
    const hay = [e.title, e.description, e.source, e.country, e.locationLabel, ...asStrings(e.actors)].join(' ').toLowerCase();
    return !needle || hay.includes(needle);
  });
  const pageSize = 20;
  const slice = matched.slice((page - 1) * pageSize, page * pageSize);
  return {
    totalCount: matched.length,
    hits: slice.map((e, i) => ({
      id: text(e.id, String(i)),
      type: eventTypeOf(e),
      description: text(e.title, text(e.description, 'Event')),
      score: Math.max(0.1, Math.min(1, num(e.interestScore, 50) / 100)),
      sourceType: 'event',
      facilityName: locationOf(e).label || locationOf(e).country || undefined,
      personName: asStrings(e.actors)[0],
      sourceFile: text(e.source, text(e.feedId, 'RSS')),
      classification: 'TLP:CLEAR',
      timestamp: text(e.publishedAt),
    })),
  };
}
