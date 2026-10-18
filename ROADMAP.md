# AuthorAssist Roadmap

## Next Up
- **Merge characters, locations and plot threads at any time** (Peter, 2026-10-18; design agreed, BLOCKED until CASE-904 is answered: no code before then) — App-side rewrite (WIP cannot merge terms for document resolution, tested 2026-10-18). Merging X into Y: preview with counts ("7 scenes, 2 notes, 1 relationship, 3 images"); rewrite X's value to Y's in every reference (AA_EVENT characters/location/plot_threads/suppressed_suggestions, AA_CHAPTER pov_character, AA_PLOT_THREAD characters, AA_NOTE linked_*, AA_WORLD_RULE related_*, other characters' relationships, dropping a self-relationship), de-duplicating arrays; re-point image attachments; X's name and aliases become aliases of Y's term; Y keeps its own details and fills its EMPTY fields from X (Peter: option b); retire X's document and term; then a scene check limited to the scenes that changed. All three entity types in one go. Undo if feasible, not a priority. The app must always write canonical values (the import resolves names through aliases first)
- **Rename without duplicates** — Renaming a chapter, character, location, thread, note or rule through Edit creates a second entity (identity = name/title). Needs a real rename: create, re-point references (book structure ids, term values in scenes/notes/rules), retire the old one. See KNOWN_ISSUES

## Backlog
- (empty — see Ideas)

## Backlog (Non-Code)
- **End User Manual** — Writer-facing documentation covering all 11 pages, import workflow, scene editing, validation, alias management, and entity CRUD. Should be approachable for non-technical users

## Ideas
- **Media, next steps** (from the image design, 2026-10-18) — The model is generic (AA_MEDIA + AA_ATTACHED_TO, any file type). Not built yet: sound files (an audio player row; first check that the app proxy passes `Range` requests through, since seeking needs them: a Range request returned 200 with the full body on 2026-10-18); images inside scene prose (a custom editor node that stores the file id); shrinking large photos in the browser before upload
- **Structure history** (Peter, 2026-10-18) — A "History" panel listing earlier chapter/scene orders from AA_BOOK_STRUCTURE's WIP version history, with restore. Persists across reloads, unlike the in-session undo. Same idea could later cover scene prose versions (autosave creates them)
- **Book import/export** — Export the full book as a single file (e.g. Markdown, EPUB, or plain text) and reimport from exported format. Round-trip fidelity for backup and external editing workflows
- **AI-based scene validation** — Second validation mechanism complementing regex-based ValidateSceneAnnotations. Uses AI to detect entities mentioned indirectly (pronouns, descriptions, nicknames not in aliases) and flag semantic issues (character in wrong location, timeline inconsistencies). Design TBD
- **Full-text prose search** — Index scene prose for keyword/phrase search across the entire manuscript
- ~~**Test Ask Bar with valid API key**~~ — Verified working. Produces comprehensive cross-document synthesis (tested with full character profile query)

## Done
- Analysis results and Ask bar answers render as formatted text (Markdown: headings, bold/italic, lists, quotes, tables, links, code); raw HTML in Claude's output is shown as text, never rendered (2026-10-18)
- Chapter numbering: a Number button on each chapter (Chapters page) sets its rule: continue the count, restart at a chosen number, or no number (prologue, interlude, epilogue). Numbers are computed from the book order plus these rules, so they follow drag-and-drop and undo. Titles that are only a number ("Chapter 5", "Kapitel 5") show as untitled with the computed number, and scene titles drop the imported "ChN " prefix (display only, stored titles unchanged). Model: AA_CHAPTER_SLOT v2 (`number_start`, `unnumbered`), AA_BOOK_STRUCTURE v2 (2026-10-18)
- Images everywhere + Image library: Images on Chapters (in the expanded row), Notes and World Rules (an "Images (n)" toggle with thumbnails on each card); an Image library page (sidebar "Images") listing every image with where it is attached, an "Not attached" filter, uploads that attach nowhere, title/caption editing, and Delete permanently (removes every attachment, retires the media document, erases the stored file) (2026-10-18)
- Images (v1 of generic file support): an Images section on Character, Location and Plot Thread pages and an Images tab in the scene editor; upload by button or by dropping files; attach images already in the book; lightbox; title/caption (shared) and role (per attachment: Portrait, Illustration, Map, Reference, Other); the first Portrait becomes the character's avatar (detail header, Characters list, relationships, Corkboard, Timeline, scene editor). Model: AA_MEDIA (one per file, identity = the file, so the same image is stored once) + edge type AA_ATTACHED_TO (2026-10-18)
- Drag and drop for chapters: drag a chapter row on the Chapters page, or a chapter heading on the Corkboard; a line shows where it lands; chapter numbers follow; undoable. Corkboard card drag now shares the same pointer-drag code (2026-10-18)
- Merge scenes: Merge button next to Split -> dialog with previous/next scene, choose whose details to keep, preview; undoable (re-creates the removed scene with its original id) (2026-10-18)
- Phantom drafts fixed; draft reminder moved to a top-bar icon that only appears after a failed save (2026-10-18)
- Autosave + explicit Save: 45 s idle / max 5 min / on leave / on hidden tab; Save button shows the state; Cmd/Ctrl+S; prose-only PATCH (2026-10-18)
- Move dialog: "Move…" in the scene header/toolbar — choose chapter and position (beginning / after a scene / end); reorder within a chapter; undoable (2026-10-18)
- Corkboard drag is pointer-based (fixes: after one drop no other card could be dragged) (2026-10-18)
- Undo: quiet top-bar Undo + History list (return to any earlier state), survives navigation and reload (2026-10-18)
- Undo for scene moves: notice with Undo after every Corkboard/picker move, Cmd/Ctrl+Z outside text fields, multi-step, refuses (if_match) when the order changed meanwhile (2026-10-18)
- Move scenes between chapters: chapter picker in the scene editor header; new chapters join the book structure; unassigned scenes draggable on the Corkboard (2026-10-18)
- Unsaved-draft reminder floats and skips the open scene, so the editor no longer jumps while typing (2026-10-18)
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
