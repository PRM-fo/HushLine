# Hushline

> **Silence the noise. Keep the signal.**

Hushline is a privacy-first web app that helps you catch up on overwhelming group-chat conversations in seconds. Paste any chat export, and Hushline extracts what matters — summaries, urgent items, your tasks, group decisions, key dates, mentions, and buried announcements — all processed entirely in your browser.

Built for the hackathon challenge **"The Unread Problem — What Did I Miss?"**

---

## Problem Statement

Group chats generate hundreds of messages daily. Most are casual noise, but critical information — deadlines, schedule changes, decisions, task assignments — gets buried in the stream. Scrolling back to find what matters is tedious and error-prone. Hushline solves this by extracting the signal from the noise.

## Solution & Key Features

- **Conversation Input**: Paste any group chat (WhatsApp, Slack, Discord, iMessage formats supported). Optional username field identifies tasks assigned to you.
- **The Briefing**: A structured dashboard with:
  - **The Signal** — executive summary of the conversation
  - **Urgent** — time-sensitive messages with priority explanations
  - **Your Actions** — tasks assigned to you, with deadlines where available
  - **Decisions** — agreements and conclusions reached by the group
  - **Important Dates** — upcoming events, deadlines, and meetings
  - **Mentions** — messages that tag you or others
  - **What You Missed** — buried announcements easy to scroll past
- **Source Verification**: Every extracted item includes the original message snippet as evidence.
- **Priority & Category Filtering**: Filter results by category and priority level.
- **Copy to Clipboard**: Copy the full briefing or just your action items.
- **Privacy-First**: All processing happens in the browser. No data is ever sent to a server.
- **No Fake Data**: The app starts with a genuinely empty state. All results are derived from the actual conversation you paste — no pre-populated content, no fabricated statistics.

## Tech Stack & Architecture

- **React 18** + **TypeScript** — UI framework with full type safety
- **Vite** — build tool and dev server
- **Tailwind CSS** — styling with a custom midnight/teal design system
- **Lucide React** — icons
- **Vitest** — unit testing
- **No backend** — entirely client-side application

### Architecture

```
src/
├── App.tsx                      # Root component, state management, orchestration
├── lib/
│   ├── analyzer.ts              # Conversation parsing + heuristic extraction engine
│   └── analyzer.test.ts         # Unit tests for parsing and extraction
├── components/
│   ├── Header.tsx               # Fixed navigation header
│   ├── Hero.tsx                 # Landing hero with animated signal visual
│   ├── ConversationInput.tsx    # Text input area, username, validation
│   ├── Briefing.tsx             # Results dashboard with filtering
│   ├── InfoSections.tsx         # How It Works + Privacy sections
│   └── Footer.tsx               # Footer
└── index.css                    # Global styles, design tokens, reduced-motion support
```

The analyzer (`src/lib/analyzer.ts`) is fully decoupled from presentation. It parses raw text into messages, then applies heuristic pattern matching to identify urgency markers, action verbs, decision language, dates/times, announcements, and @mentions. It does not use any AI/ML model — it uses transparent, auditable regex-based heuristics.

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

Tests cover the core analyzer pipeline using clearly identified test fixtures (not displayed as real conversations in the product):

```bash
npm test
```

Test cases include:
- Empty input handling
- Very large input handling (2,000 messages)
- Test fixture verification: deadline detection, meeting time change, decision detection, task assignment, mention extraction, buried announcements, summary generation
- Malformed input (no senders, single line, no colons)
- Ambiguous tasks (no clear assignee)
- No-invention verification (casual-only conversations produce empty results)
- Source snippet presence on all extracted items

## Privacy Model & Verified Limitations

### What we verify
- **No network requests**: The analyzer runs entirely in the browser. No `fetch`, `XMLHttpRequest`, WebSocket, or any network API is called during processing.
- **No storage**: Conversation text is held in React state (memory) only. It is cleared when the user clicks "New conversation" or closes the tab.
- **No accounts**: No sign-up, login, or authentication of any kind.
- **No tracking**: No analytics, cookies, or telemetry.

### Limitations
- **Heuristic, not AI**: Hushline uses pattern-matching heuristics, not a language model. It may miss implicit or subtly phrased items. This is labeled honestly in the UI — confidence badges distinguish explicit facts from inferred interpretations.
- **No semantic understanding**: The engine cannot understand context, sarcasm, or nuance the way a language model could.
- **Browser-only**: Closing the tab clears all data. There is no persistence by design.

## Deployment

### Deploy to Netlify
1. Push the repository to GitHub.
2. Connect the repo to Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`

### Deploy to Vercel
1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`

### Deploy to any static host
Run `npm run build` and serve the `dist/` directory with any static file server.

## GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit: Hushline — privacy-first conversation analyzer"
git branch -M main
git remote add origin https://github.com/<your-username>/hushline.git
git push -u origin main
```

## Known Limitations

- The heuristic engine works best with English-language conversations.
- Date extraction recognizes common date formats but may miss unusual formats.
- Task assignment detection relies on keywords like "need you to", "can you", "@mentions", and "please" — subtle assignments may be missed.
- The summary is template-based, not generated by a language model.
- No persistence between sessions (by design for privacy).
- No fake data, sample conversations, or demo mode — the app only processes real user input.

## Generative AI Usage

This section accurately documents the AI tools used in building Hushline:

- **Bolt.new**: Used to generate the initial project scaffold and the majority of the application code, including the analyzer engine, React components, styling, and tests. Bolt.new uses AI-assisted code generation.
- **No runtime AI model**: Hushline does not use any AI model at runtime. All conversation analysis is performed by deterministic heuristic pattern matching in the browser. No language model, neural network, or AI API is invoked during processing.
- **No external AI services**: User conversations are never sent to any external AI service, API, or cloud function. All processing is local.
- **AI contribution**: Bolt.new's AI assistant contributed the full application architecture, the heuristic extraction patterns, the UI design system, and all React/TypeScript implementation. The human developer reviewed, tested, and refined the output.

## License

MIT
