export type IntelEvent = {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  publishedAt: string;
  image?: string;
  lat?: number;
  lng?: number;
  country?: string;
  actors: string[];
  tags: string[];
  severity: number;
};

export type OntologyNode = {
  id: string;
  type: 'Event' | 'Actor' | 'Location' | 'Source';
  label: string;
};

export type OntologyEdge = {
  id: string;
  source: string;
  target: string;
  type: 'MENTIONS' | 'OCCURRED_AT' | 'PUBLISHED_BY';
};
