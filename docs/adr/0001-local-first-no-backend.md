# ADR 0001: Local-first analysis without a backend

- **Status:** Superseded by [ADR 0003](./0003-stateless-server-analysis.md)
- **Decision date:** 2026-10-09

## Context

Hushline analyzes pasted group-chat text. A server-side analysis service would require sending that text to a backend and operating a service, while this app can run its deterministic heuristic analyzer in the browser.

## Decision at the time

Keep parsing and analysis client-side in a Web Worker. Do not add an application backend, API routes, storage, or network requests for analysis. The source makes no network requests for conversation analysis.

## Consequences at the time

- Pasted text is analyzed in the browser and is not intentionally sent to an application analysis server.
- There is no backend service to host or pay for.
- Analysis can work offline when the app and worker assets are already available locally; offline availability across reloads is not guaranteed.
- There is no cross-device synchronization or server-side conversation recovery.
- Hosting-provider infrastructure and logs are outside the application source and have not been verified.
- Heuristic extraction is English-only, can miss implicit context, and may produce incorrect interpretations that users should review against the source evidence.

This decision was superseded when an opt-in, stateless Vercel Function was introduced. The current processing model is documented in ADR 0003.
