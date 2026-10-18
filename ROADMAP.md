# AuthorAssist Roadmap

## Next Up
- **Rename without duplicates** — Renaming a chapter, character, location, thread, note or rule through Edit creates a second entity (identity = name/title). Needs a real rename: create, re-point references (book structure ids, term values in scenes/notes/rules), retire the old one. See KNOWN_ISSUES

## Backlog
- (empty — see Ideas)

## Backlog (Non-Code)
- **End User Manual** — Writer-facing documentation covering all 11 pages, import workflow, scene editing, validation, alias management, and entity CRUD. Should be approachable for non-technical users

## Ideas
- **Book import/export** — Export the full book as a single file (e.g. Markdown, EPUB, or plain text) and reimport from exported format. Round-trip fidelity for backup and external editing workflows
- **AI-based scene validation** — Second validation mechanism complementing regex-based ValidateSceneAnnotations. Uses AI to detect entities mentioned indirectly (pronouns, descriptions, nicknames not in aliases) and flag semantic issues (character in wrong location, timeline inconsistencies). Design TBD
- **Full-text prose search** — Index scene prose for keyword/phrase search across the entire manuscript
- **Entity merge outside import** — Merge duplicates from entity list pages (Characters, Locations, Plot Threads — same select/merge UX as import). Warning: "Only name and aliases will be kept." Mechanism: absorb term aliases onto survivor, delete absorbed document/term, then scoped ValidateSceneAnnotations on scenes referencing absorbed entity only. Progress modal: "Checking N scenes... Found M suggestions." Depends on ValidateSceneAnnotations
- ~~**Test Ask Bar with valid API key**~~ — Verified working. Produces comprehensive cross-document synthesis (tested with full character profile query)

## Done
- Analyse button + prompt library: ✨ menu in the scene editor runs a prompt from the library (AA_PROMPT documents, /prompts) and shows Claude's answer in an Analysis tab; four starter prompts; context built from the open scene incl. unsaved prose (2026-10-18)
- Corkboard drag-and-drop: reorder scenes within and across chapters in chapter view; empty chapters stay visible as drop targets (2026-10-18)
- "Appears in" cross-references on character, location and plot-thread pages: scenes, notes and world rules that reference the entity, via the WIP reporting layer (2026-10-18)
- Relationship creation: add/remove a character's relationships on the detail page (2026-10-18)
- Resizable scene editor side panel (drag the left edge, double-click to reset) (2026-10-18)
- Project details: create and edit on the Dashboard; edit forms no longer drop fields they don't show (2026-10-18)
- AA_NOTE `linked_plot_threads` restored in the seeds and on `aa` (notes linked to plot threads failed to save) (2026-10-18)
- Alias collision check: adding an alias that another entity already answers to (as value, label or alias, case-insensitive) shows who owns it, with Add anyway / Cancel (2026-10-17)
- Deploy contract: `/api/app-config` route; the SPA reads its namespace from it at boot (no hard-coded `aa`); AA's own ports 3014/5180 as defaults (2026-10-17)
- Bootstrap: namespace-prefixed `AA_BOOTSTRAP_RECORD` (legacy `BOOTSTRAP_RECORD` still accepted), "incomplete" state with idempotent resume, bootstrap follows `WIP_NAMESPACE` (2026-10-17)
- Libraries: @wip/client 0.60.0, @wip/react 0.20.0, @wip/proxy 0.5.1 (2026-10-17)
- Alias management: AliasManager component on Characters, Locations, and Plot Threads detail pages. Add/remove aliases as tags, immediate save via WIP API. No console access needed
- ValidateSceneAnnotations: regex-based prose scanning for characters, locations, plot threads. Four states (confirmed, missing, detected, suppressed). Shield button in toolbar, Validate tab in context panel. Actions: add, dismiss, remove, restore. AA_EVENT template v2 with `suppressed_suggestions` field
- Split scene: scissors button splits prose at cursor (paragraph boundary), creates new scene, updates book structure (2026-10-17: fixed text loss on a repeated split — new scenes get a unique "(continued N)" title; new scene is created before the original is shortened)
- Book structure refactoring: AA_BOOK_STRUCTURE replaces chapter_number/scene_order fields
- Dashboard "Danger Zone": per-entity-type deletion with checkboxes + name registry toggle
- Unsaved draft banner: dismiss (session-hide) vs discard (revert to WIP) + reliable resume navigation
- Scene dirty detection: HTML baseline comparison instead of update counting (no false positives)
- Nested button fix on Chapters page
- Import stores human-readable entity names (not UPPER_CASE term values)
- Delete X available in merge mode during import review
- Scene edit button shows "Editing" when active
- AskBar repositioned to avoid overlapping scene navigation
- All 11 pages built with live WIP data (Dashboard, Scenes, Corkboard, Characters, Chapters, Timeline, Locations, Plot Threads, Notes, World Rules, Import)
- Mouse-driven entity creation on every page (CreateEntityModal)
- Edit forms on all entity pages (mode='edit' on CreateEntityModal)
- Delete with confirmation on all entity pages
- Auto-term-creation in index terminologies (AA_CHARACTERS, AA_LOCATIONS)
- AI-powered manuscript import: text parsing, chapter/scene detection, per-chapter entity extraction, entity review with merge/edit/delete, bulk document creation
- Scene prose editor with TipTap (rich text, composition mode, flow view)
- Scene prose saving: explicit Save button + localStorage auto-backup with crash recovery
- Unsaved draft banner with dismiss button, reactive updates, clearAllDrafts after import
- Scene context panels: related characters, locations, threads, rules, notes
- Corkboard with grouping (chapter/character/thread) and coloring (status/type/POV)
- Timeline with zoom by time or chapter, character/location filters
- Import entity review: expandable cards, merge duplicates, inline editing, role/type dropdowns
- Import: German chapter detection (KAPITEL), Roman numerals
- Import: per-chapter character population on scene documents
- Hardcoded UUID replacement with stable value synonyms
- Ask bar: floating AI chat with read-only MCP tool access
- Sidebar text wrapping fix across all context panel tabs
- Data connectivity fixes (port, TLS, baseUrl)
- Notes page: plot thread linking (AA_NOTE template v2)
- Back navigation on every page (BackLink component)
