# AuthorAssist Roadmap

## In Progress
- **Edit forms** — Edit existing entities via CreateEntityModal with `mode: 'edit'` (code done, testing)

## Next Up
- **Scene prose saving** — Explicit Save button persists TipTap content to WIP. localStorage auto-backup every few seconds for crash recovery. Unsaved-changes indicator in UI. (Approach A — user controls versioning, no WIP version bloat)

## Backlog
- **Scene auto-detect characters & locations** — Debounced local string matching against AA_CHARACTERS and AA_LOCATIONS terminology caches (labels + aliases). Tokenize prose, strip possessives, match unigrams + bigrams. Show detected entities as suggestion chips the user confirms/dismisses. No API calls — pure in-browser matching via useTerms cache
- **Analyse button + Prompt Library** — AI-powered scene analysis with editable prompt library. Each analysis type (Continuity Check, Character Voice, Style Polish, Plot Intelligence, etc.) is a prompt definition with: name, context selector (which WIP entities to include), system prompt, user prompt template with placeholders, output format. Prompts stored as WIP documents (AA_PROMPT template) or local JSON for v1. UI: dropdown on Analyse button to pick analysis type, "Manage Prompts..." opens library editor. Results in Scene Editor context panel AI tab. Requires Anthropic API key — optional enhancement, not a gate
- **Relationship creation UI** — Inline on detail pages (Approach A). "Add Relationship" button on entity detail views opens a picker: select target entity + relationship type. Consistent with existing edit pattern. Future: dedicated relationship panel or visual graph
- **Notes page: link to plot threads** — Add plot thread linking to notes (currently only characters and locations)
- **Cross-entity stats on detail pages (Approach C+)** — SQL via WIP reporting layer (`client.reporting.runQuery()`). Depends on `useReportQuery` hook being added to @wip/react (BE-YAC implementing). Reusable `<CrossReferences>` component on Location/Character/PlotThread detail pages. Short staleTime (10s), predictable queryKey pattern. "Report queries are eventually consistent — use for display enrichment, not state management."
- **New Scene form validation** — Mark story_time_sort and summary as required with asterisks (DONE)
- **Corkboard identity crisis** — Currently read-only but the name implies drag-and-drop rearrangement (pin/unpin, reorder scenes, move between chapters). Either: (a) add DnD and earn the name, or (b) rename to "Story Map" / "Overview" and keep it read-only. Peter thinking through this
- **Back navigation on every page** — BackLink component with history back + dashboard fallback (DONE)

## Done
- All 10 pages built with live WIP data
- Mouse-driven entity creation on every page (CreateEntityModal)
- Auto-term-creation in index terminologies
- Data connectivity fixes (port, TLS, baseUrl)
