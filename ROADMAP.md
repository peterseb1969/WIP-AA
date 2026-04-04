# AuthorAssist Roadmap

## Next Up
- **Fix scene editor first-load** — Editor may appear unresponsive on first visit. Likely TipTap initialization timing.

## Backlog
- **Analyse button + Prompt Library** — AI-powered scene analysis with editable prompt library. Each analysis type (Continuity Check, Character Voice, Style Polish, Plot Intelligence, etc.) is a prompt definition with: name, context selector (which WIP entities to include), system prompt, user prompt template with placeholders, output format. Prompts stored as WIP documents (AA_PROMPT template) or local JSON for v1. UI: dropdown on Analyse button to pick analysis type, "Manage Prompts..." opens library editor. Results in Scene Editor context panel AI tab. Requires Anthropic API key — optional enhancement, not a gate
- **Relationship creation UI** — Inline on detail pages. "Add Relationship" button on entity detail views opens a picker: select target entity + relationship type. Consistent with existing edit pattern
- **Cross-entity stats on detail pages** — SQL via WIP reporting layer (`client.reporting.runQuery()`). Depends on `useReportQuery` hook in @wip/react. Reusable `<CrossReferences>` component on Location/Character/PlotThread detail pages
- **Corkboard identity crisis** — Currently read-only but the name implies drag-and-drop rearrangement. Either: (a) add DnD and earn the name, or (b) rename to "Story Map" / "Overview" and keep it read-only
- **Resizable scene editor sidebar** — Context panel has fixed width, cannot be resized
- **Project metadata editing** — Dashboard shows project info but no way to edit it

## Ideas
- **Book import/export** — Export the full book as a single file (e.g. Markdown, EPUB, or plain text) and reimport from exported format. Round-trip fidelity for backup and external editing workflows
- **AI-based scene validation** — Second validation mechanism complementing regex-based ValidateSceneAnnotations. Uses AI to detect entities mentioned indirectly (pronouns, descriptions, nicknames not in aliases) and flag semantic issues (character in wrong location, timeline inconsistencies). Design TBD
- **Full-text prose search** — Index scene prose for keyword/phrase search across the entire manuscript
- **Entity merge outside import** — Merge duplicates from entity list pages (Characters, Locations, Plot Threads — same select/merge UX as import). Warning: "Only name and aliases will be kept." Mechanism: absorb term aliases onto survivor, delete absorbed document/term, then scoped ValidateSceneAnnotations on scenes referencing absorbed entity only. Progress modal: "Checking N scenes... Found M suggestions." Depends on ValidateSceneAnnotations
- **Test Ask Bar with valid API key** — Verify the chat assistant works end-to-end with a real Anthropic API key and MCP connection

## Done
- Alias management: AliasManager component on Characters, Locations, and Plot Threads detail pages. Add/remove aliases as tags, immediate save via WIP API. No console access needed
- ValidateSceneAnnotations: regex-based prose scanning for characters, locations, plot threads. Four states (confirmed, missing, detected, suppressed). Shield button in toolbar, Validate tab in context panel. Actions: add, dismiss, remove, restore. AA_EVENT template v2 with `suppressed_suggestions` field
- Split scene: scissors button splits prose at cursor (paragraph boundary), creates new scene, updates book structure
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
