# Known Issues

## Bugs

### Scene editing may not save on first load — not reproducible
**Page:** Scenes (`/scenes`)
**Symptom (as reported 2026-04-04):** Opening a scene shows the editor as read-only or unresponsive on first visit. Navigating away and back fixes it.
**Status:** Could not reproduce on 2026-10-17. The suspected cause, a `userEditedRef` gate that skipped the first `onUpdate`, was removed about four hours after this entry was written, when dirty detection switched to an HTML baseline comparison (commit 99f5a3e). Tested on a cold load, both straight from a URL and from the scene list, with a short scratch scene and a 1,711-word scene from the real book: the editor was editable and focused, the caret landed where clicked, typing marked the scene dirty, and Save became active. If it shows up again, note the steps (which page you came from, whether a draft banner was showing) and reopen.

### Fixed upstream (2026-10-19): large writes, edge-type filter, term names
Three WIP issues AA reported are fixed in WIP and verified in AA on a scratch namespace:
- **Writes over 64 KB** (CASE-899): `@wip/client` 0.60.1 no longer sets `keepalive`. AA uses 0.62.0; a 147 KB image upload and a 73 KB scene save went through. The upload workaround (`storeFile`) is gone.
- **Edge-type filter ignoring `namespace`** (CASE-900): fixed in document-store. AA keeps passing `ns:VALUE`, which stays correct. Since the fix, an edge type that does not exist in the namespace answers 404 instead of an empty list.
- **Names of deleted or deprecated terms still resolving** (CASE-904): def-store is now the only resolver (no cache), deprecated terms are refused on write, and a term hard delete removes its Registry entry. Merge now uses WIP's term merge: the absorbed term stays behind as **deprecated**, pointing at the survivor, and every term list in AA asks for active terms only. Stored references are still rewritten by the app (WIP never re-resolves stored documents).
These fixes need a WIP built from `5920a66c` or later. On 2026-10-19 wip-local ran `5920a66c`, and dev-test's `20261018c` images answered the term-merge endpoint; on an older WIP the merge's last step fails.

## Unverified / technical debt

### Renamed chapters, scenes, notes and world rules start a new version history (2026-10-19)
Their identity is the title, so a rename copies the document under the new title (`src/lib/rename.ts`). The renamed document starts at version 1; earlier versions stay with the retired old document. Characters, locations and plot threads are not affected: they are renamed by relabelling their term.

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
