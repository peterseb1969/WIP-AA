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
├── main.tsx                  Entry point (React 19, StrictMode)
├── App.tsx                   Router (11 routes), providers (QueryClient, WipProvider, BrowserRouter)
├── index.css                 Tailwind base + TipTap editor styles + composition mode
├── lib/
│   ├── wip.ts                WipClient + QueryClient setup (baseUrl = origin + /wip)
│   └── constants.ts          NAMESPACE, TEMPLATES, TERMINOLOGIES, color maps
├── components/
│   ├── Layout.tsx             Sidebar nav (11 items) + header + UnsavedDraftBanner + Outlet
│   ├── CreateEntityModal.tsx  Universal create/edit form for all entity types
│   ├── AskBar.tsx             Floating AI chat (bottom-right)
│   ├── UnsavedDraftBanner.tsx Draft recovery banner (localStorage scan, 24h retention)
│   ├── StatusBadge.tsx        Colored label component
│   └── BackLink.tsx           Back navigation helper
└── pages/
    ├── DashboardPage.tsx      Read-only stats and quick links
    ├── ScenesPage.tsx         Scene list + TipTap editor + context panels + flow/composition modes
    ├── CorkboardPage.tsx      Read-only visual scene cards with grouping and coloring
    ├── CharactersPage.tsx     Card grid + detail bio + embedded relationships
    ├── ChaptersPage.tsx       Expandable cards + inline edit + nested scene list
    ├── TimelinePage.tsx       Read-only chronological visualization
    ├── LocationsPage.tsx      Card grid + detail view
    ├── PlotThreadsPage.tsx    Status-grouped thread list
    ├── NotesPage.tsx          Type-filtered note list with entity links
    ├── WorldRulesPage.tsx     Domain-grouped rules
    └── ImportPage.tsx         6-step import wizard (upload → structure → entities → review → import → done)

server/
├── index.ts                  Express app: health, /api/ask, /api/import/*, WIP proxy
├── agent.ts                  MCP client + agentic Claude loop (read-only tools, 30min sessions)
├── import.ts                 Chapter/scene regex parser + Claude entity extraction
└── prompts/
    └── assistant.md          Optional system prompt supplement for ask bar
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
2. TipTap editor loads prose content
3. Auto-save writes to `localStorage` (`aa-scene-draft-{sceneId}`) every 3 seconds when dirty
4. Explicit "Save" button writes to WIP via `useCreateDocument` (identity dedup creates new version)
5. On unmount, dirty content is flushed to localStorage
6. `UnsavedDraftBanner` in Layout scans localStorage and shows recovery links

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
- `namespace: 'aa'` auto-injected into tool arguments
- Sessions cached in memory with 30-minute TTL

## Proxy setup

In development, Vite proxies `/api/*` and `/wip/*` to the Express server on port 3014. The Express server uses `@wip/proxy` middleware on `/wip` to forward requests to the WIP backend with API key injection. No client-side authentication.
