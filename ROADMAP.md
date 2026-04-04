# AuthorAssist Roadmap

## Next Up
- **Fix split scene** — The split feature is broken (second scene not created, text lost). Must debug the nested mutation in `handleSplit` before re-enabling. See KNOWN_ISSUES.md.
- **Fix scene editor first-load** — Editor may appear unresponsive on first visit. Likely TipTap initialization timing or the `userEditedRef` gate.

## Backlog
- **Scene auto-detect characters & locations** — Debounced local string matching against AA_CHARACTERS and AA_LOCATIONS terminology caches (labels + aliases). Tokenize prose, strip possessives, match unigrams + bigrams. Show detected entities as suggestion chips the user confirms/dismisses. No API calls — pure in-browser matching via useTerms cache
- **Analyse button + Prompt Library** — AI-powered scene analysis with editable prompt library. Each analysis type (Continuity Check, Character Voice, Style Polish, Plot Intelligence, etc.) is a prompt definition with: name, context selector (which WIP entities to include), system prompt, user prompt template with placeholders, output format. Prompts stored as WIP documents (AA_PROMPT template) or local JSON for v1. UI: dropdown on Analyse button to pick analysis type, "Manage Prompts..." opens library editor. Results in Scene Editor context panel AI tab. Requires Anthropic API key — optional enhancement, not a gate
- **Relationship creation UI** — Inline on detail pages. "Add Relationship" button on entity detail views opens a picker: select target entity + relationship type. Consistent with existing edit pattern
- **Cross-entity stats on detail pages** — SQL via WIP reporting layer (`client.reporting.runQuery()`). Depends on `useReportQuery` hook in @wip/react. Reusable `<CrossReferences>` component on Location/Character/PlotThread detail pages
- **Corkboard identity crisis** — Currently read-only but the name implies drag-and-drop rearrangement. Either: (a) add DnD and earn the name, or (b) rename to "Story Map" / "Overview" and keep it read-only
- **Resizable scene editor sidebar** — Context panel has fixed width, cannot be resized
- **Project metadata editing** — Dashboard shows project info but no way to edit it

## Ideas
- **Full-text prose search** — Index scene prose for keyword/phrase search across the entire manuscript
- **Entity merge outside import** — Allow merging duplicate characters, locations, or plot threads at any time, not only during the import review step
- **Test Ask Bar with valid API key** — Verify the chat assistant works end-to-end with a real Anthropic API key and MCP connection

## Done
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
