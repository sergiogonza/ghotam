import type { IntelEvent, OntologyNode, OntologyEdge } from './types';

export function buildOntology(events: IntelEvent[] | undefined | null) {
  const nodes = new Map<string, OntologyNode>();
  const edges: OntologyEdge[] = [];

  for (const e of Array.isArray(events) ? events : []) {
    if (!e || !e.id) continue;

    nodes.set(e.id, { id: e.id, type: 'Event', label: e.title || 'Untitled event' });

    if (e.source) {
      const sourceId = 'source:' + e.source;
      nodes.set(sourceId, { id: sourceId, type: 'Source', label: e.source });
      edges.push({ id: e.id + ':source', source: e.id, target: sourceId, type: 'PUBLISHED_BY' });
    }

    if (e.country) {
      const locId = 'location:' + e.country.toLowerCase();
      nodes.set(locId, { id: locId, type: 'Location', label: e.country });
      edges.push({ id: e.id + ':loc', source: e.id, target: locId, type: 'OCCURRED_AT' });
    }

    for (const actor of Array.isArray(e.actors) ? e.actors : []) {
      if (!actor) continue;
      const actorId = 'actor:' + actor.toLowerCase().replace(/\s+/g, '-');
      nodes.set(actorId, { id: actorId, type: 'Actor', label: actor });
      edges.push({ id: e.id + ':actor:' + actorId, source: e.id, target: actorId, type: 'MENTIONS' });
    }
  }

  return { nodes: [...nodes.values()], edges };
}
