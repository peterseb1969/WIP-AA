# Known Issues

## Bugs

### Scene editing may not save on first load — not reproducible
**Page:** Scenes (`/scenes`)
**Symptom (as reported 2026-04-04):** Opening a scene shows the editor as read-only or unresponsive on first visit. Navigating away and back fixes it.
**Status:** Could not reproduce on 2026-10-17. The suspected cause, a `userEditedRef` gate that skipped the first `onUpdate`, was removed about four hours after this entry was written, when dirty detection switched to an HTML baseline comparison (commit 99f5a3e). Tested on a cold load, both straight from a URL and from the scene list, with a short scratch scene and a 1,711-word scene from the real book: the editor was editable and focused, the caret landed where clicked, typing marked the scene dirty, and Save became active. If it shows up again, note the steps (which page you came from, whether a draft banner was showing) and reopen.

## Unverified / technical debt

### Browser-unverified changes (2026-10-17)
Clicked through in a browser against a scratch namespace: loading the namespace from `/api/app-config`, the gate's **needs bootstrap** and **incomplete** panels, and Resume Bootstrap. Still unverified: the error screen `main.tsx` shows when `/api/app-config` can't be loaded.

### `as any` casts around the WIP client
Several `useTerms(...)` / `useTerminologies(...)` call sites cast their params to `any`, so `tsc` cannot check them against the client. `AliasManager`'s `updateTerm` call is typed again, and alias saving was retested in a browser with @wip/client 0.60.0 (2026-10-17).

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
