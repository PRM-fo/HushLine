# Hushline

> **Silence the noise. Keep the signal.**

Hushline is a browser-based app that helps you catch up on group-chat conversations. Paste supported chat exports or messages in `Name: message` format, and Hushline applies local heuristics to identify summaries, urgent items, tasks, decisions, dates, mentions, and announcements.

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
- **Source network behavior**: Analysis runs in the browser; no network calls are present in the application source. This does not verify third-party hosting behavior or browser extensions.
- **No Fake Data**: The app starts with a genuinely empty state. All results are derived from the actual conversation you paste — no pre-populated content, no fabricated statistics.

## Tech Stack & Architecture

- **React 18** + **TypeScript** — UI framework with full type safety
- **Vite** — build tool and dev server
- **Tailwind CSS** — styling with the Midnight Aurora palette
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

- Analysis runs in the browser; there are no network calls in the source. This statement does not verify third-party hosting behavior or browser extensions.
- Conversation state is held in the current page. The app provides no feature to save or restore conversations.
- **Heuristic, not AI**: Hushline uses pattern-matching heuristics, not a language model. It may miss implicit or subtly phrased items. This is labeled honestly in the UI — confidence badges distinguish explicit facts from inferred interpretations.
- **No semantic understanding**: The engine cannot understand context, sarcasm, or nuance the way a language model could.
- **Format support**: Telegram, Slack, Discord, iMessage, and other untested export formats are unsupported; tested formats are plain text and WhatsApp Android/iOS exports.
- **Parser warnings**: Unattributed input lines and skipped system/deleted-message lines are counted and reported in the briefing.
- **Date ambiguity**: Numeric dates that can be interpreted in either day-first or month-first order are preserved as written and flagged as ambiguous.

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
- No persistence between sessions.
- No fake data, sample conversations, or demo mode — the app only processes real user input.

## Generative AI Usage

This section accurately documents the AI tools used in building Hushline:

- **Bolt.new**: Used to generate the initial project scaffold and the majority of the application code, including the analyzer engine, React components, styling, and tests. Bolt.new uses AI-assisted code generation.
- **Devin**: Used for code inspection, auditing, and improvements including removing unused dependencies, updating metadata, and preparing the repository for hackathon submission.
- **No model integration in the analyzer**: Conversation analysis is implemented with deterministic heuristic pattern matching in the browser.
- **AI contribution**: Bolt.new's AI assistant contributed the full application architecture, the heuristic extraction patterns, the UI design system, and all React/TypeScript implementation. Devin assisted with code review and improvements. The human developer reviewed, tested, and refined the output.

## License

This project is licensed under the MIT License; see [LICENSE](./LICENSE).
