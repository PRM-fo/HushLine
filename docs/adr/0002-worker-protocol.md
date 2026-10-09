# ADR 0002: Typed protocol for worker analysis

- **Status:** Accepted
- **Decision date:** 2026-10-09

## Context

Conversation parsing and heuristic extraction can take noticeable time on large pastes. Running the analyzer on the main thread would compete with UI work. A long-lived worker also needs a reliable way to associate responses with requests and discard results after cancellation or timeout.

## Decision

Keep analysis in a Web Worker and communicate through a discriminated TypeScript protocol. An `{ type: 'analyze', requestId, raw, userName }` request receives either a `{ type: 'result', requestId, result }` response or a `{ type: 'error', requestId, message }` response.

`AnalyzerClient` lazily creates and reuses one worker. It tags requests with IDs, ignores responses that no longer match the active request, supports cancellation and the existing 30-second timeout, and recreates the worker after failures. Worker construction is injectable for deterministic client tests.

## Consequences

- The browser UI remains separate from the synchronous analysis core.
- Request IDs make stale replies distinguishable from the current analysis.
- Worker exceptions become explicit error responses rather than success-shaped fallback results.
- Cancellation ignores a request's eventual response; it does not interrupt synchronous JavaScript already executing inside the worker.
- Worker communication stays local to the browser and introduces no backend or network dependency.
