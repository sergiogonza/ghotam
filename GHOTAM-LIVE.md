# Ghotam Live Intelligence

This fork extends the original AEGIS ontology-driven platform with a public-source RSS intelligence layer designed to run both on localhost and Netlify.

## New routes

- `/` and `/live` — live RSS intelligence map
- `/ontology` — ontology graph generated from live RSS
- `/dashboard` — original AEGIS dashboard
- original graph, cases, facilities, timeline and command-center routes remain available

## Live ontology

Object types:
- Event
- Actor
- Location
- Source

Link types:
- Event -> MENTIONS -> Actor
- Event -> OCCURRED_AT -> Location
- Event -> PUBLISHED_BY -> Source

## RSS ingestion

Netlify:
- Function: `netlify/functions/rss.mjs`
- API: `/api/rss`

Local:
```bash
node tools/rss-server.mjs
cd src/frontend
npm install
npm run dev
```

The Vite server proxies `/api/rss` to the local RSS bridge on port 8788, and the existing `/api` backend continues to proxy to .NET on port 5000.

## Netlify

The included `netlify.toml` builds `src/frontend`, publishes `dist`, and exposes the RSS Function.

## Location confidence

The previous browser-only RSS proof of concept used random coordinates when no actor/location was detected. This implementation does **not** fabricate a hotspot. Unlocated events remain in the live event stream but do not appear on the map until a supported location is resolved.

## Images

The RSS connector reads media enclosure / media content / thumbnail URLs when present and displays them in event cards and event windows.

## Production roadmap

1. Expand deterministic location resolver with GeoNames/Nominatim cache or a local gazetteer.
2. Persist normalized RSS events into Neo4j as Event/Actor/Location/Source objects.
3. Add deduplication by canonical URL + title similarity.
4. Add provenance and source confidence.
5. Add draggable/resizable desktop window manager.
6. Add scheduled Netlify ingestion or external durable event storage.
7. Add a local LLM extraction pipeline for entity resolution and summaries with explicit citations.
