# ADR 0003: Opt-in stateless server analysis

- **Status:** Accepted
- **Decision date:** 2026-10-09

## Context

The core analyzer had already been separated from React and the UI, but the deployed product had no backend. A server API can own request validation and processing while sharing the same deterministic core, report engine timing, and expose an operational health check. Pasted conversations are sensitive, so moving analysis server-side must not happen silently or imply that hosting infrastructure has no logs.

## Decision

- Add same-origin Vercel Functions for `POST /api/analyze` and `GET /api/health`.
- Require explicit per-analysis user consent before the browser sends conversation text.
- Keep the analysis endpoint stateless at the application layer: no database, account system, conversation history, or intentional request-body logging.
- Validate JSON shape, method, origin when supplied, username length, and the existing 100,000-character input limit.
- Return a request ID, analyzer version, and server processing time; mark responses `Cache-Control: no-store`.
- Use the existing Web Worker as a local fallback when the API is unavailable, and identify that path in the briefing.
- Allow same-origin API traffic in the CSP. Do not add cross-origin API access.

## Consequences

- The primary analysis path now sends conversation text to the hosting environment after consent. This is a material privacy trade-off; provider logs and infrastructure retention remain outside the application's control and are unverified.
- The API and browser fallback share the same pure core, reducing behavioral drift between execution environments.
- The app can report server processing time separately from network/cold-start latency.
- Cancelling stops the browser from waiting and aborts its request, but cannot guarantee that an already-started synchronous server invocation stops computing.
- Hosting must support Vercel Functions; a static-only deployment falls back to the local Worker.
- There is still no persisted history, user account, or cross-device sync.
- The heuristic analyzer remains English-only and may misinterpret or miss implicit context.
