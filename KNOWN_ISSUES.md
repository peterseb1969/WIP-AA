# Known Issues

## Bugs

### Scene editing may not save on first load
**Page:** Scenes (`/scenes`)
**Symptom:** Opening a scene shows the editor as read-only or unresponsive on first visit. Navigating away and back fixes it.
**Root cause:** Not fully diagnosed. Possibly related to TipTap initialization timing or the `userEditedRef` gate that skips the first `onUpdate` event.
**Status:** Not fixed.

### Alias collision not detected
**Page:** Characters, Locations, Plot Threads (any detail page with AliasManager)
**Symptom:** A writer can add an alias that is already used as a label or alias on a different entity. For example, adding "The Captain" to character "Carter" when "The Captain" is already an alias for "Briggs". ValidateSceneAnnotations would then match both entities for the same text, producing confusing results.
**What's needed:** Before adding an alias, check all terms in the same terminology for label/alias collisions. Warn or block if the alias is already taken. Show which entity owns it so the writer can decide.
**Status:** Not implemented. The alias is accepted silently.

## Unverified / technical debt

### Browser-unverified changes (2026-10-17)
Clicked through in a browser against a scratch namespace: loading the namespace from `/api/app-config`, the gate's **needs bootstrap** and **incomplete** panels, and Resume Bootstrap. Still unverified: the error screen `main.tsx` shows when `/api/app-config` can't be loaded.

### `as any` casts around the WIP client
`AliasManager` (`defStore.updateTerm`) and several `useTerms(...)` call sites cast to `any`, so `tsc` cannot check them against @wip/client 0.60.0. Alias saving should be retested by hand after a client bump.

### Vite rejects unknown hosts
Vite's dev server answers 403 to a `Host` it doesn't recognise. Through Caddy on localhost this is fine; a non-localhost ingress (e.g. `kb.internal`) would need `server.allowedHosts` in `vite.config.ts`.

### Large bundle
The production bundle is ~930 kB (Vite warns above 500 kB). Code-splitting the pages would fix it.

## Missing features

### No edit forms for project metadata
The Dashboard shows project info (title, author, genre, description) but there is no way to edit it through the UI.

### Sidebar not resizable
The scene editor context panel (right sidebar) has a fixed width. It cannot be resized or collapsed independently of the panel toggle.

### No relationship creation UI
Character relationships are visible on the Characters detail page but cannot be created or edited through the UI. Relationships exist only if they were imported or created via MCP.

### Corkboard is read-only
The Corkboard displays scene cards but does not support drag-and-drop reordering, which the name implies. Consider either adding DnD or renaming to "Story Map" / "Overview."

### No cross-entity stats on detail pages
Location, Character, and Plot Thread detail views don't show how many scenes reference them. Requires the WIP reporting layer (`useReportQuery` hook).

## Deferred decisions

### Scene auto-save vs explicit save
Current approach: localStorage auto-backup + explicit Save button for WIP persistence. Question of whether to add true auto-save to WIP (creates many versions) is deferred.

### AI analysis / prompt library
Planned but not started. Would add Claude-powered scene analysis (continuity, voice, style) with an editable prompt library. Requires Anthropic API key.
