# AuthorAssist — Design Document

## What This App Does

AuthorAssist is a novel-writing tool that helps authors develop plots, characters, events, timelines, and world-building. It provides equal NL and structured UI interfaces backed by WIP. The Scene Editor is the primary workspace — a contextual writing environment where every piece of information the author needs is at their fingertips without getting in the way.

## Namespace

`aa` — deletion_mode: full, isolation_mode: open

## Terminologies (12)

### Controlled Vocabularies (9)

| Value | ID (prefix) | Terms |
|-------|-------------|-------|
| AA_CHARACTER_ROLE | 019d44bd-aa82 | PROTAGONIST, DEUTERAGONIST, ANTAGONIST, SUPPORTING, MINOR, MENTIONED |
| AA_LOCATION_TYPE | 019d44bd-aaab | CITY, TOWN, BUILDING, ROOM, OUTDOOR, VEHICLE, REALM, VIRTUAL, OTHER |
| AA_EVENT_TYPE | 019d44bd-aac3 | SCENE, BACKSTORY, FLASHBACK, FLASH_FORWARD, DREAM, PROLOGUE, EPILOGUE, INTERLUDE |
| AA_CHAPTER_STATUS | 019d44bd-aad8 | OUTLINE, DRAFT, REVISED, FINAL |
| AA_PLOT_THREAD_STATUS | 019d44bd-aaea | OPEN, DEVELOPING, CLIMAX, RESOLVED, ABANDONED |
| AA_RELATIONSHIP_TYPE | 019d44bd-aafe | CHILD_OF, PARENT_OF, SIBLING_OF, MARRIED_TO, ALLY, RIVAL, ENEMY, FRIEND, ROMANTIC, MENTOR, PROTEGE, COLLEAGUE, MEMBER_OF |
| AA_NOTE_TYPE | 019d44bd-ab13 | IDEA, RESEARCH, VOICE, THEME, REVISION, BRAINSTORM |
| AA_TIME_SYSTEM | 019d44bd-ab2a | CALENDAR, RELATIVE, NAMED, ORDINAL |
| AA_GENRE | 019d44bd-ab3c | FANTASY, SCI_FI, THRILLER, MYSTERY, ROMANCE, HISTORICAL, LITERARY, HORROR, ADVENTURE, DYSTOPIAN, MEMOIR, OTHER |

### Index Terminologies (3) — grow as author writes, with alias resolution

| Value | ID (prefix) | Purpose | Ontology |
|-------|-------------|---------|----------|
| AA_CHARACTERS | 019d44bd-ab4f | Character name registry + aliases | — |
| AA_LOCATIONS | 019d44bd-ab61 | Location name registry + aliases | part_of (containment) |
| AA_PLOT_THREADS | 019d44bd-ab79 | Plot thread title registry | part_of (sub-threads) |

## Templates (9)

| Value | ID (prefix) | Ver | Identity Fields | Key Fields |
|-------|-------------|-----|-----------------|------------|
| AA_PROJECT | 019d44bf-8ddf | 1 | title | title, author, genre→AA_GENRE, time_system→AA_TIME_SYSTEM, description, setting_summary |
| AA_CHARACTER | 019d44bf-fd49 | 1 | name | name→AA_CHARACTERS, role→AA_CHARACTER_ROLE, age, description, personality, backstory, goals, flaws, voice_notes, arc_summary, relationships[](→AA_CHAR_REL) |
| AA_CHAR_REL | 019d44bf-e5da | 1 | — | character→AA_CHARACTERS, relationship_type→AA_RELATIONSHIP_TYPE, start_time, end_time, description |
| AA_LOCATION | 019d44bf-8de0 | 1 | name | name→AA_LOCATIONS, type→AA_LOCATION_TYPE, description, atmosphere, rules, significance |
| AA_CHAPTER | 019d44bf-8de1 | 1 | number | number, title, summary, themes[], status→AA_CHAPTER_STATUS, pov_character→AA_CHARACTERS, notes |
| AA_EVENT | 019d44bf-8de2-7742 | 1 | title | title, event_type→AA_EVENT_TYPE, chapter_number, scene_order, story_time_raw, story_time_sort, location→AA_LOCATIONS, characters[]→AA_CHARACTERS, summary, prose, plot_threads[]→AA_PLOT_THREADS, emotional_beat, notes |
| AA_PLOT_THREAD | 019d44bf-8de2-7e98 | 1 | title | title→AA_PLOT_THREADS, status→AA_PLOT_THREAD_STATUS, description, opened_chapter, resolved_chapter, characters[]→AA_CHARACTERS, notes |
| AA_NOTE | 019d44bf-8de3-7afd | 1 | title | title, note_type→AA_NOTE_TYPE, content, tags[], linked_characters[]→AA_CHARACTERS, linked_events[], linked_locations[]→AA_LOCATIONS |
| AA_WORLD_RULE | 019d44bf-8de3-7bd0 | 1 | name | name, domain, rule, implications, exceptions, related_characters[]→AA_CHARACTERS, related_locations[]→AA_LOCATIONS |

## Key Design Decisions

1. **Index terminologies with aliases** — AA_CHARACTERS, AA_LOCATIONS, AA_PLOT_THREADS. Author writes "Ali", WIP resolves to Alice Ashworth. Sync pattern: create term + create document together.
2. **Embedded relationships on AA_CHARACTER** — temporal array (start_time/end_time), bidirectional writes, covers both family and dynamic relationships.
3. **Ontology only for locations (part_of containment) and plot threads (part_of sub-threads)** — hierarchy traversal via get_term_hierarchy.
4. **story_time_sort integer** — universal timeline key regardless of time system.
5. **AA_EVENT is the hub** — links characters, locations, chapters, and plot threads.
6. **NL and structured UI are equal peers** — same data, two lenses. NL for queries/quick edits, structured UI for browsing/bulk organization.
7. **One namespace per book** — multi-book later via cross-namespace references.
8. **Scene Editor is the primary workspace** — not a form, but a contextual writing environment with progressive disclosure.

## Ontology Relationships

- AA_LOCATIONS: `part_of` (e.g., THE_TAVERN part_of CAPITAL_CITY)
- AA_PLOT_THREADS: `part_of` (e.g., MISSING_ARTIFACT part_of THE_MAIN_QUEST)

## Test Data (kept)

- Project: "The Shattered Crown" (fantasy, named time system)
- Characters: Alice Ashworth (protagonist, v2), Bob Thorne (supporting)
- Location: The Tavern (part_of Capital City)
- Chapter 1: "The Stranger at the Bar"
- Event: "The Meeting at Old Pete's" (alias resolution verified)
- Plot Thread: "The Missing Artifact" (open)

---

## UI Design

### Design Philosophy

**Information at the author's fingertips — without getting in the way.**

The app serves two modes of work: *creating* (writing scenes, building characters, plotting) and *reviewing* (reading what's written, checking consistency, exploring the story structure). Every page supports both, with progressive disclosure ensuring the common case is clean and the power is one click away.

The NL interface (AskBar) is always present and context-aware — it knows which page you're on, which scene you're editing, which characters are in play. It is an equal peer to the structured UI, not a sidebar feature.

### Pages (10)

#### 1. Scene Editor ★ (primary workspace)

The heart of AuthorAssist. Where the author writes, reviews, and refines scenes.

**Prose entry — three paths:**
- **Write** directly in the editor (primary path — the context panels are the point)
- **Paste** from external editor (Word, Scrivener, Google Docs)
- **Import & split** — paste a full chapter, mark scene breaks (or auto-detect on `***` / `---`), creates individual AA_EVENT documents

**Editor:** TipTap/ProseMirror-based. Lightweight formatting:
- Paragraphs, italic, bold, scene break markers
- Not a word processor — a contextual writing space
- Word count per scene (bottom bar)
- Markdown storage internally, rendered display

**Layout — progressive disclosure:**

| Zone | Default | Expanded |
|------|---------|----------|
| **Prose** (center, 60-70%) | Clean editor, word count at bottom | Full-width in Composition mode |
| **Scene metadata** (top strip) | Compact: chapter, scene order, location, time, event type | Full metadata form with all fields |
| **Characters present** (right panel) | Avatars/initials of characters in this scene | Click → point-in-time view: role, what they know so far (events witnessed), active relationships, last appearance, emotional state |
| **Context** (right panel, tabs) | Collapsed tabs | Location (atmosphere, rules), Plot Threads (active at this point), World Rules (applicable), Notes (research tagged to this scene's entities) |
| **Continuity** (bottom or left) | Previous scene summary, next scene summary | Full previous/next prose |

**Modes:**
- **Full context** — all panels visible (default)
- **Composition mode** — distraction-free, prose only, full screen. One toggle.
- **Flow view** — select a chapter and read all its scenes as continuous prose with faint dividers between scenes. For reviewing narrative flow without scene boundaries getting in the way.

**Scene operations:**
- **Split** at cursor position → author chooses which half keeps the metadata (upper, lower, or both). Creates a new AA_EVENT document.
- **Merge** with previous or next scene → choose which context to keep, which to discard. Characters and locations auto-detected from combined text.
- **Previous/Next** navigation buttons + jump-to-chapter
- **Version history** — view all versions of this scene (WIP document versioning), visual diff between drafts, rollback to any version

**AI assistance (scene-aware AskBar):**
When editing a scene, the AskBar has implicit context: this scene, these characters, this location, this point in the timeline. The author can ask:
- "Does Bob know about the artifact yet?" → checks events where Bob is present before this scene's story_time_sort
- "Is this consistent with the tavern description?" → checks location + world rules
- "How does Alice feel about Bob right now?" → traces relationship history to this point
- "Read this scene — anything contradicts the plot?" → AI has prose + all structured data
- "What loose threads should this scene address?" → checks open plot threads for characters present

#### 2. Corkboard

Visual overview of the story structure. Scenes as draggable index cards.

- **Card display:** Title + synopsis (from summary field) + word count
- **Color coding:** By chapter status, POV character, or event type (user toggle)
- **Drag-to-reorder:** Updates scene_order and chapter_number in AA_EVENT
- **Grouping:** By chapter (default), by plot thread, by character, ungrouped
- **Card actions:** Click to open in Scene Editor, quick-edit synopsis inline
- **Freeform mode:** Cards can be placed anywhere on canvas (for brainstorming/plotting)
- **Filters:** By chapter, character, location, plot thread, event type

#### 3. Dashboard

Project overview and orientation. Landing page.

- **Project card:** Title, author, genre, time system, description
- **Stats:** Character count, chapter count, scene count, total word count, words today
- **Word count targets:** Project target with progress bar, daily target with session tracker
- **Recent activity:** Last 5 scenes edited (with timestamps from WIP versioning)
- **Open plot threads:** List of OPEN/DEVELOPING threads with linked characters
- **Chapter progress:** Visual bar showing chapter statuses (outline/draft/revised/final)
- **Quick links:** Jump to Scene Editor, Corkboard, Characters

#### 4. Characters

Character bible — the complete reference for every person in the story.

- **List view:** Card grid showing name, role (color-coded badge), age, one-line description
- **Detail view:** Full character bible:
  - Identity: name, role, age, description
  - Inner life: personality, goals, flaws, arc summary
  - History: backstory, voice notes
  - **Relationships timeline:** Visual display of relationships with temporal data (start_time/end_time). Shows how relationships evolve through the story.
  - **Appearances:** List of scenes where this character is present, ordered by story_time_sort
  - **Knowledge tracker:** What this character knows at any point — derived from events they've witnessed
- **Form:** Create/edit character. Name field auto-creates AA_CHARACTERS term. Relationship editor with character search (alias-aware), type dropdown, temporal fields.

#### 5. Chapters

Chapter management with nested scene structure.

- **List view:** Ordered by chapter number. Each chapter shows: number, title, status badge, POV character, word count (sum of scenes), scene count
- **Detail view:** Chapter metadata + ordered list of scenes (title, summary, word count). Click scene to open in Scene Editor.
- **Flow view entry:** "Read chapter" button opens Flow view in Scene Editor — all scenes as continuous prose
- **Status workflow:** Visual status progression (outline → draft → revised → final)
- **Reorder:** Drag chapters to reorder (updates chapter numbers)

#### 6. Timeline

Visual chronological view of the story.

- **Horizontal timeline:** Events plotted by story_time_sort, grouped by chapter
- **Event cards:** Title, characters present (avatars), location, emotional beat
- **Filters:** By character, location, plot thread, event type, chapter range
- **Parallel tracks:** Show concurrent events (same story_time_sort, different locations/characters)
- **Click to open:** Any event opens in Scene Editor
- **Zoom levels:** Full story, act, chapter

#### 7. Locations

Place management with containment hierarchy.

- **Card grid:** Location name, type badge, one-line description
- **Containment breadcrumbs:** The Tavern → Capital City (from AA_LOCATIONS ontology part_of)
- **Detail view:** Full location profile — description, atmosphere, rules, significance
- **Scene list:** All scenes set in this location, ordered by story_time_sort
- **Hierarchy view:** Tree visualization of location containment

#### 8. Plot Threads

Track narrative arcs through the story.

- **Status cards:** Thread title, status badge (open/developing/climax/resolved/abandoned), description
- **Chapter span:** Opened in chapter X, resolved in chapter Y (or still open)
- **Linked characters:** Who's involved in this thread
- **Scene appearances:** Which scenes touch this thread, in order
- **Sub-threads:** Hierarchy from AA_PLOT_THREADS ontology part_of
- **Dangling thread alert:** Threads that are OPEN but haven't appeared in recent chapters

#### 9. Notes

Freeform scratchpad for ideas, research, and meta-thoughts.

- **Filterable list:** By note type (idea/research/voice/theme/revision/brainstorm), by tags, by linked entities
- **Quick create:** Capture an idea in seconds — title + content, everything else optional
- **Linked entities:** Connect notes to characters, events, locations
- **Tags:** Freeform tags for cross-cutting concerns

#### 10. World Rules

The laws of the story's universe.

- **Card list:** Rule name, domain, one-line rule statement
- **Detail view:** Full rule — implications, exceptions, related characters, related locations
- **Domain grouping:** Group rules by domain (magic, politics, geography, technology, etc.)

### Navigation

- **Sidebar (left):** All 10 sections, collapsible on mobile. Icons + labels. Active page highlighted.
  - Scene Editor ★
  - Corkboard
  - Dashboard
  - Characters
  - Chapters
  - Timeline
  - Locations
  - Plot Threads
  - Notes
  - World Rules
- **Top bar:** "AuthorAssist" wordmark + project title + settings gear
- **AskBar (floating, bottom-right):** NL interface, always present, context-aware based on current page/scene

### Cross-Cutting Features

#### Word Count System
- Per-scene count (in editor, on cards)
- Per-chapter count (sum of scenes)
- Project total
- Daily session count
- Optional targets with progress bars (stored on AA_PROJECT and AA_CHAPTER)

#### Version History
- Every save creates a WIP document version
- View version list for any document (scene, character, chapter, etc.)
- Visual diff between any two versions
- Rollback to any previous version

#### Point-in-Time Queries
- "What does Character X know at scene Y?" — derived from events where X is present with story_time_sort ≤ Y
- "What are the active relationships at chapter Z?" — filter relationship arrays by start_time/end_time
- "Which plot threads are open at this point?" — check thread status against chapter progression
- Powered by WIP reporting layer (SQL queries on story_time_sort)

#### Scene-Aware AI (AskBar)
- Knows current page context
- In Scene Editor: knows the scene, characters, location, timeline position
- Can check consistency, voice, continuity, plot threads
- Can suggest what should happen next
- Can compare scene prose against established facts
- Uses MCP tools to query WIP directly

### Existing Scaffold

- React 19, Express 5, Vite, Tailwind already configured
- NL interface scaffolded (AskBar + Express backend + MCP integration)
- Backend at port 3001, frontend at port 5173, proxy configured
- Not yet installed: @wip/client, @wip/react, @wip/proxy, shadcn/ui, TipTap

### Build Order

1. **Scaffold:** deps (@wip/client, @wip/react, shadcn/ui, TipTap), design tokens, layout shell (sidebar + top bar + router), WipProvider setup
2. **Scene Editor:** Prose editor + metadata strip + context panels + Flow view + Composition mode
3. **Corkboard:** Index cards, drag-to-reorder, color coding, grouping
4. **Characters:** Card grid + detail bible + relationship editor
5. **Chapters:** Ordered list + status workflow + Flow view entry point
6. **Dashboard:** Stats, word counts, recent activity, open threads
7. **Remaining pages:** Locations, Plot Threads, Notes, World Rules, Timeline
8. **NL prompt tuning:** Domain-specific instructions for scene-aware AI
9. **Tests + Dockerfile**

## Tech Stack

- React 19 + React Router 7 + TypeScript
- Vite, Tailwind CSS, shadcn/ui, Lucide React
- TipTap (prose editor, ProseMirror-based)
- @wip/client, @wip/react (install from libs/*.tgz)
- @wip/proxy for API proxying
- TanStack Query (via @wip/react)
- Express 5 backend (NL interface)
- Design tokens: primary #2B579A, accent #ED7D31, success #2E8B57, danger #DC3545, bg #F8FAFC, text #333333
- Font: Inter
