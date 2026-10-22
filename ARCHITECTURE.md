# Architecture

## Overview

AuthorAssist is a single-page React app with a Node.js Express server. The server proxies all WIP API calls (injecting auth) and hosts two AI endpoints for manuscript import and a chat assistant. The client uses `@wip/react` hooks (TanStack Query) for all data access.

```
Browser (React SPA, port 5180 in dev)
  │
  ├─ /wip/* ──→ Express proxy (port 3014) ──→ WIP backend
  ├─ /api/ask ──→ MCP agent loop (Claude + read-only WIP tools)
  └─ /api/import/* ──→ Claude entity extraction
```

## File structure

```
src/
├── main.tsx                  Entry point: fetches /api/app-config (namespace) before first render
├── App.tsx                   Router (14 routes), providers (QueryClient, WipProvider, BrowserRouter, BootstrapGate)
├── index.css                 Tailwind base + TipTap editor styles + composition mode
├── i18n/                     react-i18next setup; locales/en.json, de.json (+ duplicate-key test)
├── lib/
│   ├── wip.ts                WipClient + QueryClient (baseUrl = BASE_URL + wip)
│   ├── app-config.ts         Runtime app config (namespace) from the server
│   ├── constants.ts          NAMESPACE (set at boot), TEMPLATES, TERMINOLOGIES, color maps
│   ├── useBookStructure.ts   Book structure: chapter order, scene positions, chapter numbering
│   ├── structureUndo.tsx     Undo for structure moves (drag-and-drop, Move, merge)
│   ├── pointerDrag.ts        Pointer-based dragging shared by every drag in the app
│   ├── entityNames.ts        Names of characters, locations, threads resolved through their terms
│   ├── titles.ts             Display rules for number-only chapter titles and "ChN" scene prefixes
│   ├── useValidateScene.ts   Scene check: entity names in prose (Unicode word edges)
│   ├── mergeEntities.ts      Merge characters / locations / plot threads (plan, then execute)
│   ├── rename.ts             Rename by relabelling a term, or by copying a document under a new title
│   ├── media.ts              Images: AA_MEDIA per stored file, AA_ATTACHED_TO edges, permanent delete
│   ├── analysis.ts           Scene analysis with the writer's prompt library (AA_PROMPT)
│   ├── sse.ts                Reads server-sent event streams; loadDemoBook()
│   ├── useResizableWidth.ts  Resizable side panel
│   └── fakeWip.ts            In-memory WipClient stand-in for unit tests
├── components/
│   ├── Layout.tsx             Sidebar nav (14 items) + header + UnsavedDraftBanner + Outlet
│   ├── BootstrapGate.tsx      Offer-on-empty / use-on-exists gate around the app (also: bootstrap with the demo book)
│   ├── LoadDemoBook.tsx       "Load the demo book" card, shown only while the book is empty
│   ├── CreateEntityModal.tsx  Create/edit form for all entity types
│   ├── MergeEntities.tsx      Merge mode on list pages + the merge dialog (preview, run, result)
│   ├── MergeSceneDialog.tsx   Merge a scene with its previous or next scene
│   ├── MoveSceneDialog.tsx    Move a scene to a chapter and position
│   ├── MediaSection.tsx       Images on an entity: grid, lightbox, upload, attach from the book
│   ├── AliasManager.tsx       Aliases of a character / location / thread term
│   ├── CrossReferences.tsx    "Appears in" lists via the reporting layer (SQL by term id)
│   ├── Markdown.tsx           Renders Claude's Markdown; raw HTML shown as text
│   ├── AskBar.tsx             Floating AI chat (bottom-right)
│   ├── UnsavedDraftBanner.tsx Reminder for scene drafts left after a failed save
│   ├── LanguageSwitcher.tsx, StatusBadge.tsx, BackLink.tsx
└── pages/
    ├── DashboardPage.tsx      Book project details, stats and quick links
    ├── ScenesPage.tsx         Scene list + TipTap editor (autosave, split, merge, move, rename) + side panels
    ├── CorkboardPage.tsx      Scene cards by chapter; drag cards and chapters
    ├── ChaptersPage.tsx       Chapter list: drag, numbering rules, rename, images
    ├── CharactersPage.tsx     Card grid + detail (bio, relationships, images, Appears in); merge
    ├── LocationsPage.tsx      Card grid + detail; merge
    ├── PlotThreadsPage.tsx    Status-grouped threads; merge
    ├── NotesPage.tsx          Type-filtered notes with entity links
    ├── WorldRulesPage.tsx     Domain-grouped rules
    ├── TimelinePage.tsx       Read-only chronological view
    ├── MediaLibraryPage.tsx   Every image, where it is used, upload, permanent delete
    ├── PromptsPage.tsx        The writer's prompt library for Analyse
    ├── ImportPage.tsx         Import wizard (upload → structure → entities → confirm incl. book details → importing → done)
    └── SettingsPage.tsx       Anthropic key (set/rotate at runtime)

server/
├── index.ts                  Express app under APP_BASE_PATH: health, app-config, /api/ask, /api/import/*, /wip proxy;
│                             in production serves dist/ with an SPA fallback (unknown API paths → 404 JSON)
├── agent.ts                  MCP client + agentic Claude loop for the Ask bar (read-only tools)
├── analyse.ts                Analyse endpoint (prompts built in the browser)
├── import.ts                 Chapter/scene parser + Claude entity extraction
├── bootstrap.routes.ts       GET /server-api/bootstrap/status, POST /server-api/bootstrap/run (SSE)
├── config.routes.ts          Runtime Anthropic key endpoints
├── demo.routes.ts            GET /server-api/demo/status, POST /server-api/demo/load (SSE)
├── demo/book.ts              The demo novel as data (loaded by lib/demo-book.ts)
├── lib/                      bootstrap.ts (seed-driven bootstrap), demo-book.ts (loads the demo into an empty book), anthropic-key.ts, wip-api.ts, sse.ts
├── seed/                     Terminologies and templates the bootstrap creates
└── prompts/assistant.md      Optional system prompt supplement for the Ask bar

tests/
├── integration/              Vitest against real WIP (npm run test:integration)
└── e2e/                      Playwright in Chrome (npm run test:e2e)
```

## Data model mapping

Every page maps to one or more WIP templates. All entities live in the `aa` namespace.

| Template | Identity field | Primary page | Also used on |
|----------|---------------|--------------|--------------|
| `AA_PROJECT` | `title` | Dashboard | — |
| `AA_CHAPTER` | `number` | Chapters | Scenes, Corkboard, Timeline, Dashboard |
| `AA_EVENT` | `title` | Scenes | Corkboard, Timeline, Dashboard |
| `AA_CHARACTER` | `name` | Characters | Scenes (context panel) |
| `AA_CHAR_REL` | *(embedded)* | Characters | — |
| `AA_LOCATION` | `name` | Locations | Scenes (context panel) |
| `AA_PLOT_THREAD` | `title` | Plot Threads | Scenes (context panel), Dashboard |
| `AA_NOTE` | `title` | Notes | Scenes (context panel) |
| `AA_WORLD_RULE` | `name` | World Rules | Scenes (context panel) |

### Terminologies

| Terminology | Type | Used for |
|-------------|------|----------|
| `AA_CHARACTER_ROLE` | Fixed enum (6) | Character role badges and form dropdowns |
| `AA_LOCATION_TYPE` | Fixed enum (9) | Location type badges and form dropdowns |
| `AA_EVENT_TYPE` | Fixed enum (8) | Scene type badges |
| `AA_CHAPTER_STATUS` | Fixed enum (4) | Chapter progress badges |
| `AA_PLOT_THREAD_STATUS` | Fixed enum (5) | Thread status grouping |
| `AA_RELATIONSHIP_TYPE` | Fixed enum (13) | Character relationship type |
| `AA_NOTE_TYPE` | Fixed enum (6) | Note type filter buttons |
| `AA_TIME_SYSTEM` | Fixed enum (4) | Project metadata |
| `AA_GENRE` | Fixed enum (12) | Project metadata |
| `AA_CHARACTERS` | Extensible registry | Character name lookups across all pages, auto-created on import |
| `AA_LOCATIONS` | Extensible registry | Location name lookups, auto-created on import |
| `AA_PLOT_THREADS` | Extensible registry | Plot thread name lookups |

## Key patterns

### Entity creation flow
1. User clicks "New" button on any entity page
2. `CreateEntityModal` renders form fields defined in `ENTITY_CONFIGS`
3. If a field has `autoCreateTermIn`, the modal first creates a term in that terminology
4. Modal calls `useCreateDocument()` to save to WIP
5. WIP deduplicates by identity field — same identity = new version, not duplicate

### Scene editing flow
1. User selects scene from list → URL updates to `/scenes?id=<sceneId>`
2. TipTap editor loads the prose (a newer localStorage draft wins, and marks the scene dirty)
3. Saving writes a merge PATCH of `prose` only, so other fields are never touched. Autosave runs after 45 s without typing, at most every 5 min while typing non-stop, when the scene is left and when the tab is hidden; Save and Cmd/Ctrl+S save at once
4. The localStorage draft (`aa-scene-draft-{sceneId}`) is only a crash backup between saves; it outlives a save only when the save failed, and `UnsavedDraftBanner` then offers it
5. Split, merge, move and rename change the book structure (`AA_BOOK_STRUCTURE`, by document id); merge, move and drag-and-drop are undoable. A scene's identity is its title, so split picks a title no scene, active or retired, has had

### Import flow
1. User pastes/uploads manuscript text
2. Server parses chapters and scenes via regex (`server/import.ts`)
3. Per-chapter AI extraction identifies characters, locations, plot threads
4. User reviews, merges duplicates, edits entities
5. Import creates all documents in sequence: chapters, scenes (with per-chapter characters), characters, locations, plot threads
6. Auto-creates terms in extensible terminologies (AA_CHARACTERS, AA_LOCATIONS)

### Ask bar
- Server connects to WIP via MCP (stdio, SSE, or HTTP transport)
- Tool set filtered to read-only operations (no create/delete/update)
- `WIP_NAMESPACE` injected into the arguments of every tool that takes a namespace
- Sessions cached in memory with 30-minute TTL

## Proxy setup

In development, Vite proxies `/api/*` and `/wip/*` to the Express server on port 3014. The Express server uses `@wip/proxy` middleware on `/wip` to forward requests to the WIP backend with API key injection. No client-side authentication.

## Testing

| Layer | Command | Runs against | When |
|---|---|---|---|
| Unit (Vitest) | `npm test` | nothing external; merge and rename use `src/lib/fakeWip.ts` | pre-commit hook |
| Integration (Vitest) | `npm run test:integration` | the local WIP, disposable `aa-it-<timestamp>` namespace | by hand |
| End-to-end (Playwright, system Chrome) | `npm run test:e2e` | a second app instance (ports 3016/5182) on a disposable `aa-e2e-<timestamp>` namespace, bootstrapped through the app's own route | by hand |

Both WIP-backed layers read the key from the file `WIP_API_KEY_FILE` names in `.env`. The UI drives the behaviour under test; the WIP API creates fixtures and checks what was stored. `tests/e2e/support/page.ts` (`watch`) fails a test on page errors, console errors, HTTP ≥ 400, failed requests and native dialogs. Specs share one namespace and take per-pass names (`pick`/`tag`), so `npx playwright test --repeat-each=3` checks for flakiness. Coverage and what is still missing: ROADMAP, Next Up, "Test coverage".
