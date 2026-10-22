# AuthorAssist

A novel writing assistant built on [WIP](https://github.com/...) (World In a Pie). Authors import a manuscript, then manage scenes, characters, locations, chapters, plot threads, world rules, and notes through a visual UI. All data lives in WIP's template-document storage; this app is a domain-specific frontend.

## Current state

The app is functional with a full German-language novel imported (129 documents, 39 characters, 94 locations). Core editing, creation, and deletion work across all entity types. The AI-powered import pipeline extracts structure and entities from raw manuscript text.

Known issues are tracked in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Project stats, recent scenes, open plot threads, chapter progress |
| Scenes | `/scenes` | Scene list by chapter, TipTap prose editor, context panels, flow view, composition mode |
| Corkboard | `/corkboard` | Visual scene cards grouped by chapter/character/thread, colored by status/type/POV |
| Characters | `/characters` | Character cards with role badges, detail bios, embedded relationships |
| Chapters | `/chapters` | Expandable chapter cards with inline editing, nested scene lists |
| Timeline | `/timeline` | Chronological event visualization, zoom by time or chapter, character/location filters |
| Locations | `/locations` | Location directory with type badges, detail view |
| Plot Threads | `/plot-threads` | Threads grouped by status (open/developing/climax/resolved/abandoned) |
| Notes | `/notes` | Freeform notes with type filtering, entity linking |
| World Rules | `/world-rules` | World-building rules organized by domain |
| Prompts | `/prompts` | Prompt library for the scene editor's Analyse (✨) menu: create, edit, starter prompts |
| Import | `/import` | Multi-step AI manuscript import: upload, structure, entity extraction, review, create |

All entity pages support create, edit, and delete via a shared `CreateEntityModal` component.

## AI features

- **Manuscript import** (`/import`): Paste or upload text. The server parses chapters/scenes, then Claude extracts characters, locations, and plot threads per chapter. Entity review step allows merge, edit, and delete before final import.
- **Ask bar**: Floating chat powered by Claude with read-only MCP tool access to all WIP data. Supports multi-turn conversations.

## Running

```bash
# Install dependencies
npm install
npm install ./libs/wip-client-*.tgz ./libs/wip-react-*.tgz ./libs/wip-proxy-*.tgz

# Development (client + server concurrently)
npm run dev

# Client only (port 5180)
npm run dev:client

# Server only (port 3014)
npm run dev:server

# Unit tests (Vitest)
npm test

# Integration tests against the local WIP (creates and deletes an aa-it-<timestamp> namespace)
npm run test:integration

# End-to-end tests in Chrome (Playwright; starts its own app instance on ports 3016/5182
# against a disposable aa-e2e-<timestamp> namespace). Needs WIP running and
# WIP_API_KEY_FILE in .env. Run in the background: a full run takes ~30 s, x3 ~70 s.
npm run test:e2e
npx playwright test --repeat-each=3   # flakiness check; specs use per-pass names

# Production build
npm run build && npm run start
```

### Environment

The server expects a WIP backend reachable via the proxy. The `@wip/proxy` middleware injects the API key; no client-side auth is needed.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3014` | Server port |
| `WIP_BASE_URL` | `https://localhost:8443` | WIP backend |
| `WIP_NAMESPACE` | `aa` | The book's namespace (also served to the browser by `/api/app-config`) |
| `WIP_API_KEY` | `dev_master_key_for_testing` | API key for WIP backend. The server reads only this variable; the fallback is refused by current installs |
| `WIP_API_KEY_FILE` | — | Set in `.env`. Read by the test configs (`playwright.config.ts`, `vitest.integration.config.ts`), **not yet by the server** (see KNOWN_ISSUES) |
| `APP_BASE_PATH` | `/` | Route prefix when deployed (e.g. `/apps/aa`) |
| `ANTHROPIC_API_KEY` | — | For import entity extraction and ask bar |
| `ANTHROPIC_API_KEY_FILE` | — | Key file; a key set on the Settings page is written here and survives restarts |
| `SESSION_TTL_MINUTES` | `30` | Ask bar session timeout |
| `MAX_TURNS` | `15` | Max tool-call turns per ask bar question |

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS 3.4, TanStack Query
- **Editor**: TipTap (ProseMirror) with StarterKit
- **Backend**: Express 5.1, `@wip/proxy` for API forwarding
- **AI**: Anthropic SDK, MCP client (stdio/SSE/HTTP)
- **Data**: WIP document store via `@wip/client` and `@wip/react` hooks
