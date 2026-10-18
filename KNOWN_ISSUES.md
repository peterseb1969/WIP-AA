# Known Issues

## Bugs

### Scene editing may not save on first load — not reproducible
**Page:** Scenes (`/scenes`)
**Symptom (as reported 2026-04-04):** Opening a scene shows the editor as read-only or unresponsive on first visit. Navigating away and back fixes it.
**Status:** Could not reproduce on 2026-10-17. The suspected cause, a `userEditedRef` gate that skipped the first `onUpdate`, was removed about four hours after this entry was written, when dirty detection switched to an HTML baseline comparison (commit 99f5a3e). Tested on a cold load, both straight from a URL and from the scene list, with a short scratch scene and a 1,711-word scene from the real book: the editor was editable and focused, the caret landed where clicked, typing marked the scene dirty, and Save became active. If it shows up again, note the steps (which page you came from, whether a draft banner was showing) and reopen.

### Renaming an entity through Edit creates a duplicate
**Pages:** Chapters, Characters, Locations, Plot Threads, Notes, World Rules (the shared edit form)
**Symptom:** Changing the name/title in the Edit form leaves the old entity in place and adds a new one with the new name.
**Root cause:** Each template's identity field is its name or title, so saving a different name is a *create*, not a new version (PoNIF #3), and nothing retires the original. A proper rename also has to re-point what references the old one: chapter and scene ids in the book structure, character/location/thread term values in scenes, notes and rules.
**Status:** Not fixed. The project (Dashboard) and prompts (Prompt Library) handle it, because nothing references them: they retire the old document after a rename.

## Unverified / technical debt

### Browser-unverified changes (2026-10-17)
Clicked through in a browser against a scratch namespace: loading the namespace from `/api/app-config`, the gate's **needs bootstrap** and **incomplete** panels, and Resume Bootstrap. Still unverified: the error screen `main.tsx` shows when `/api/app-config` can't be loaded.

### Analyse with a real Claude response (2026-10-18)
Everything up to the Claude call was tested in a browser (prompt library, starter prompts, the ✨ menu, the exact message sent, the "no API key" error). No Anthropic key was configured locally, so a real analysis result has not been seen yet. The Analysis tab lives in the scene editor's side panel, which is hidden below the `md` breakpoint (768px), so on narrow screens the result is not visible.

### Reporting entity view can lag a new template version
After AA_NOTE gained `linked_plot_threads` in v2, the per-version table `doc_aa_note__v2` had the column but the entity view `doc_aa_note` did not. The app's cross-reference queries match on `data_json` instead, which avoids it. Looks like a reporting-sync issue on the WIP side; not reported upstream yet.

### `as any` casts around the WIP client
Several `useTerms(...)` / `useTerminologies(...)` call sites cast their params to `any`, so `tsc` cannot check them against the client. `AliasManager`'s `updateTerm` call is typed again, and alias saving was retested in a browser with @wip/client 0.60.0 (2026-10-17).

### Vite rejects unknown hosts
Vite's dev server answers 403 to a `Host` it doesn't recognise. Through Caddy on localhost this is fine; a non-localhost ingress (e.g. `kb.internal`) would need `server.allowedHosts` in `vite.config.ts`.

### Large bundle
The production bundle is ~930 kB (Vite warns above 500 kB). Code-splitting the pages would fix it.

## Deferred decisions

### Scene auto-save vs explicit save
Current approach: localStorage auto-backup + explicit Save button for WIP persistence. Question of whether to add true auto-save to WIP (creates many versions) is deferred.
