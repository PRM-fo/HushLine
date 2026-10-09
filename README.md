# Hushline

> **Silence the noise. Keep the signal.**

Hushline is a web app that helps you catch up on group-chat conversations. After you opt in, a stateless API analyzes supported chat exports or messages in `Name: message` format and returns heuristic summaries, urgent items, tasks, decisions, dates, mentions, and announcements.

Built for the hackathon challenge **"The Unread Problem — What Did I Miss?"**

---

## Problem Statement

Group chats generate hundreds of messages daily. Most are casual noise, but critical information — deadlines, schedule changes, decisions, task assignments — gets buried in the stream. Scrolling back to find what matters is tedious and error-prone. Hushline solves this by extracting the signal from the noise.

## Solution & Key Features

- **Conversation Input**: Paste supported `Name: message` lines or WhatsApp Android timestamp-first and iOS bracketed exports. Optional username helps identify tasks assigned to you. Other chat-export formats are not claimed as supported.
- **Language and formats**: Extraction rules are English-only. Telegram, Slack, Discord, iMessage, and other untested exports are unsupported.
- **Large pastes**: Inputs over 100,000 characters are preserved and can be analyzed one line-aware chunk at a time.
- **The Briefing**: A structured dashboard with:
  - **The Signal** — message, participant, and extracted-item counts
  - **Urgent** — time-sensitive messages with priority explanations
  - **Your Actions** — tasks assigned to you, with deadlines where available
  - **Decisions** — agreements and conclusions reached by the group
  - **Important Dates** — upcoming events, deadlines, and meetings
  - **Mentions** — messages that tag you or others
  - **What You Missed** — buried announcements easy to scroll past
- **Source Evidence**: Extracted items include a message snippet, sender, and message index for review.
- **Priority & Category Filtering**: Filter results by category and priority level.
- **Copy to Clipboard**: Copy the full briefing or just your action items.
- **Explicit server consent**: Analysis is disabled until you agree to send the current conversation for one-time server processing. If the API is unavailable, a Web Worker can analyze it locally and the result identifies that fallback.
- **Request-scoped processing**: The API validates each request, applies the 100,000-character cap, analyzes in memory, and does not intentionally persist or log conversation text. Hosting-provider logs and infrastructure behavior are outside the app's control and have not been verified.
- **No Fake Data**: The app starts with a genuinely empty state. All results are derived from the actual conversation you paste — no pre-populated content, no fabricated statistics.

## Tech Stack

- **React 18** + **TypeScript** — UI framework with full type safety
- **Vite** — build tool and dev server
- **Tailwind CSS** — styling with the Midnight Aurora palette
- **Lucide React** — icons
- **Vitest** — unit testing
- **Vercel Functions** — typed, stateless analysis and health endpoints

## Architecture

```text
UI (explicit consent) -> useAnalyzer hook -> AnalyzerApiClient -> same-origin /api/analyze
                                                        -> request validation -> core pipeline
                                                                                parser -> extractors
                                                                                -> briefing result
UI <- request ID, engine version, processing time, result <---------------------- API
                              \-> Web Worker fallback only when the API is unavailable
UI -> user-triggered clipboard formatting/copy
```

| Module | Responsibility |
| --- | --- |
| `src/App.tsx`, `src/components/` | Compose the input and briefing UI; contain presentation behavior. |
| `src/hooks/useAnalyzer.ts` | Own analysis lifecycle, loading/error/result state, cancellation, and cleanup. |
| `src/services/analyzerApiClient.ts` | Send consented requests to the same-origin API, enforce timeouts, correlate request IDs, ignore stale responses, and fall back to the local Worker when the API is unavailable. |
| `src/api/analyzerProtocol.ts` | Shared typed request/response metadata contract for the API client and server. |
| `api/analyze.ts`, `api/health.ts` | Vercel Function endpoints; validate origin/method/content type, return request-scoped analysis or engine health, and disable response caching. |
| `api/_lib/analyzeRequest.ts` | Validate payload shape, text/name lengths, run the core, and produce versioned timing metadata without logging the input. |
| `src/worker/analyzerClient.ts`, `src/worker/protocol.ts`, `handleAnalyze.ts`, `analyzer.worker.ts` | Provide the typed local fallback path if the server endpoint is unavailable. |
| `src/core/parser.ts` | Parse supported chat lines into sender-attributed messages. |
| `src/core/extractors/` | Detect category-specific cues for urgency, actions, decisions, dates, announcements, and mentions. |
| `src/core/analyze.ts` | Orchestrate parsing and extractors, deduplicate and order results, then build the briefing summary. |
| `src/core/types.ts`, `format.ts`, `id.ts`, `index.ts` | Shared core types, deterministic per-run IDs, clipboard/warning formatting, and public exports. |
| `src/lib/analyzer.ts` | Compatibility re-export for existing imports. |

The core uses heuristic pattern matching, not an AI/ML model. It has no React, DOM, or component imports. The browser sends text only to this app's same-origin analysis endpoint after explicit consent. The endpoint does not intentionally persist conversation text; deployment-provider log retention is not verified.

To add an extractor, create a pure module under `src/core/extractors/` that exports a function with the shared `Extractor<T>` signature from `src/core/types.ts`. Keep category cue detection isolated, wire its output into the per-message orchestration in `src/core/analyze.ts`, and add synthetic regression tests for matched and non-matched input. Preserve the established item types, evidence fields, deduplication, and per-run ID generation.

The server endpoint keeps parsing and extraction off the browser's main thread and returns an engine version, elapsed analysis time, and request ID for each result. It is stateless at the application layer: no database, account, or conversation history is used. The trade-off is that consenting users send conversation text to the hosting environment, and the app cannot control provider-level request logs. An in-memory Worker fallback keeps analysis available if the API cannot be reached; it does not guarantee offline use across reloads. Conversations do not sync across devices.

## Setup & Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type check
npm run typecheck

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

## Testing

Tests cover parsing and heuristic extraction using clearly identified synthetic fixtures (not displayed as real conversations in the product):

```bash
npm test
```

Test cases include:
- Empty input handling
- Very large input handling (2,000 messages)
- Test fixture coverage: deadline detection, meeting time change, decision detection, task assignment, mention extraction, buried announcements, summary generation
- WhatsApp Android and iOS timestamp formats, including timestamps with and without seconds and AM/PM
- Malformed input (no senders, single line, no colons)
- Ambiguous tasks (no clear assignee)
- No-invention verification (casual-only conversations produce empty results)
- Source snippet presence on all extracted items

## Processing Model & Limitations

- A same-origin API performs analysis after the user checks the one-time consent control. A Web Worker fallback is used if the API is unavailable.
- The app does not intentionally persist or log conversation text. The hosting provider's logs and infrastructure behavior have not been verified.
- Conversation state is otherwise held in the current page. The app provides no feature to save or restore conversations.
- **Heuristic, not AI**: Hushline uses pattern-matching heuristics, not a language model. It may miss implicit or subtly phrased items. This is labeled honestly in the UI — confidence badges distinguish explicit facts from inferred interpretations.
- **No semantic understanding**: The engine cannot understand context, sarcasm, or nuance the way a language model could.
- **Format support**: Telegram, Slack, Discord, iMessage, and other untested export formats are unsupported; tested formats are plain text and WhatsApp Android/iOS exports.
- **Parser warnings**: Unattributed input lines and skipped system/deleted-message lines are counted and reported in the briefing.
- **Date ambiguity**: Numeric dates that can be interpreted in either day-first or month-first order are preserved as written and flagged as ambiguous.

## Security & Threat Model

- **Processed:** After explicit consent, pasted text and the optional username are sent to the same-origin `/api/analyze` endpoint. The function validates the request, enforces the 100,000-character limit, analyzes the request in memory, and does not intentionally log or persist conversation content.
- **Rendered:** Results are rendered as React text; the app source does not use `innerHTML` to render conversation content.
- **Stored:** The app has no conversation database or history feature. Conversation input and results remain in page memory, and request handling is stateless at the application layer.
- **Network:** Consent enables a same-origin POST to `/api/analyze`; `/api/health` returns service status and engine version. No third-party analysis provider is used by the app source.
- **Controls:** The API accepts POST JSON, checks same-origin requests when an Origin header is present, bounds payload characters, returns `Cache-Control: no-store`, and uses request IDs to correlate responses. CSP permits same-origin API connections.
- **Unverified:** Hosting-provider access logs, serverless platform internals, browser extensions, and retention outside the application code are not verified. Do not paste conversations you are not authorized to share with the hosting environment.

## Performance

Server-side analysis runs synchronously in a stateless Vercel Function, with a local Web Worker fallback. Each response reports analyzer time and engine version; request/network latency is separate and depends on the connection. Result lists render 50 items at a time with a control to show more. The production build's main JavaScript bundle is about 60 KB gzipped; the analyzer worker is emitted as a separate fallback asset.

Analyzer-only Node measurements on synthetic inputs, using seven runs per input and reporting the median: 100 messages (~11.9 KB) took about 3.5 ms; 1,500 messages (~178.5 KB) took about 39.6 ms; and a dense 100,000-character input (~841 lines) took about 23.3 ms. These are historical core-engine timings, not live server or end-to-end network measurements; function cold starts and network latency are not included.

## Deployment

### Deploy to Vercel
1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`
6. Ensure the `api/` functions are enabled; the analysis endpoint is required for server analysis.

Static hosting without a compatible function runtime serves the UI but will use the local Worker fallback for analysis.

## GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit: Hushline — browser-based conversation analyzer"
git branch -M main
git remote add origin https://github.com/<your-username>/hushline.git
git push -u origin main
```

## Known Limitations

- The heuristic extractor is English-only.
- Date extraction recognizes selected common formats and may miss unusual formats or ambiguous numeric dates.
- Task assignment detection relies on explicit names, mentions, sender identity for imperative messages, and action wording; subtle assignments may be missed.
- The summary is template-based, not generated by a language model.
- Each analysis is limited to 100,000 characters; oversized input can be analyzed chunk by chunk without changing the pasted original.
- No cross-device sync or conversation history.
- No fake data, sample conversations, or demo mode — the app only processes real user input.

## Generative AI Usage

Repository history includes commits marked as generated with **Devin** and commits with a **Copilot** co-author trailer. Those commit records do not establish the exact scope of either tool's contribution.
- **No model integration in the analyzer**: Conversation analysis is implemented with deterministic heuristic pattern matching in the shared core, called by the server endpoint or local Worker fallback.

## License

This project is licensed under the MIT License; see [LICENSE](./LICENSE).
