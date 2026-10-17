# Known Issues

## Bugs

### Split scene is broken
**Page:** Scenes (`/scenes`)
**Symptom:** Clicking split saves the first half (truncated) but the second scene (text after cursor) never appears. The user loses the downstream text.
**Root cause:** `handleSplit` nests two `createDocument.mutate` calls. The first saves the truncated original. The second (in `onSuccess`) creates a new scene with `title + " (split)"`, but it either fails silently or `onBack()` navigates away before completion.
**Status:** Not fixed. The split button is visible in the toolbar — users can trigger it and lose text. (ROADMAP's "Done" entry records the feature landing on 2026-04-04; this issue was recorded after it, the same day.)
**Workaround:** Do not use split. If text was lost, the original version may still exist in WIP (identity dedup).

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
Verified at the HTTP and type-check level only, not clicked through in a browser:
- The SPA loads its WIP namespace from `/api/app-config` before first render, and shows an error screen if that fails.
- BootstrapGate's **incomplete** panel (Resume Bootstrap / Check Again).

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
