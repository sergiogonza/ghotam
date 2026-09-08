# Live RSS + Ontology

This extension turns public RSS items into normalized ontology objects.

## Object types
- Event
- Actor
- Location
- Source

## Links
- Event -[MENTIONS]-> Actor
- Event -[OCCURRED_AT]-> Location
- Event -[PUBLISHED_BY]-> Source

## Geolocation
No random coordinates are generated. If the deterministic location resolver cannot identify a known location, the event remains unlocated and stays visible in the feed but not as a false hotspot.

## Netlify
Netlify Function: `netlify/functions/rss.mjs`
Route: `/api/rss`

## Localhost
Run the frontend with Vite and the RSS bridge with:
`node tools/rss-server.mjs`

Vite proxies `/api/rss` to port 8788.

## Security
Third-party API keys belong in server-side environment variables, never in frontend source.
