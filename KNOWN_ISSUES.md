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

### A scene can't be moved a second time (reported by Peter 2026-10-18, not yet reproduced)
**Symptom:** "I cannot move a scene I moved once."
**Evidence:** the live AA_BOOK_STRUCTURE history shows moves and undos reaching WIP (v1–v13 on 2026-10-18 between 11:53 and 12:14; scene …479f moved several times, each followed by a restore). So the PATCHes themselves work, and the failure is in the UI. Which surface (Corkboard drag or the editor's chapter picker) and what happens (nothing, an error, the scene snapping back) is still unknown. Scratch tests moved the same scene twice (picker, then Corkboard) without trouble.
**Suspects to check first:** (1) a move computed from a stale `structure` (the hook reads the cached chapter order, so a second move before the refetch lands would start from the old order); (2) on the Corkboard, the dragged card re-mounts into another chapter group during the save, so its `dragend` never fires and the drag state goes stale.
**Note:** the deployed dev app serves this working tree live (bind mount + HMR), so it was partly tested against in-progress edits.

## Unverified / technical debt

### Browser-unverified changes (2026-10-17)
Clicked through in a browser against a scratch namespace: loading the namespace from `/api/app-config`, the gate's **needs bootstrap** and **incomplete** panels, and Resume Bootstrap. Still unverified: the error screen `main.tsx` shows when `/api/app-config` can't be loaded.

### Analyse (2026-10-18)
Tested in a browser up to the Claude call (prompt library, starter prompts, the ✨ menu, the exact message sent, the "no API key" error). The Claude call itself was then tested against the deployed app with a real key: Style Polish on "Ch2 Scene 1" returned ten concrete suggestions in German in about 17 s. The answer is Markdown, which the Analysis tab shows as plain text (ROADMAP Next Up). The key set in Settings on the deployed dev app is a runtime override (`persistable: false`), so it is lost when the container restarts; persisting it needs `ANTHROPIC_API_KEY_FILE` on a writable mount in the app's manifest (see CLAUDE.md, MCP section). The Analysis tab lives in the scene editor's side panel, which is hidden below the `md` breakpoint (768px), so on narrow screens the result is not visible.

### Reporting entity view only has columns shared by every template version
Not a bug, WIP's documented design: the `doc_<value>` entity view carries only the columns all versions share with the same type. A field added in a later version (AA_NOTE's `linked_plot_threads` in v2) is only in `doc_<value>__v<N>`, unless the template opts in via `reporting.cross_version_view.columns`. The app's cross-reference queries match on `data_json`, which holds every version's data. Reproduced on a fresh namespace on 2026-10-18. The agent-facing `wip://conventions` resource doesn't mention this rule, which is how it got mistaken for a bug.

### `as any` casts around the WIP client
Several `useTerms(...)` / `useTerminologies(...)` call sites cast their params to `any`, so `tsc` cannot check them against the client. `AliasManager`'s `updateTerm` call is typed again, and alias saving was retested in a browser with @wip/client 0.60.0 (2026-10-17).

### Vite rejects unknown hosts
Vite's dev server answers 403 to a `Host` it doesn't recognise. Through Caddy on localhost this is fine; a non-localhost ingress (e.g. `kb.internal`) would need `server.allowedHosts` in `vite.config.ts`.

### Large bundle
The production bundle is ~930 kB (Vite warns above 500 kB). Code-splitting the pages would fix it.

## Deferred decisions

### Scene auto-save vs explicit save — decided 2026-10-18
Autosave to WIP (45 s idle, max every 5 min while typing, on leave/hide) plus an explicit Save that shows the state and answers Cmd/Ctrl+S. See ROADMAP Next Up.
