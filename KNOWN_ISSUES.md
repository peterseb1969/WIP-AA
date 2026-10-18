# Known Issues

## Bugs

### Scene editing may not save on first load — not reproducible
**Page:** Scenes (`/scenes`)
**Symptom (as reported 2026-04-04):** Opening a scene shows the editor as read-only or unresponsive on first visit. Navigating away and back fixes it.
**Status:** Could not reproduce on 2026-10-17. The suspected cause, a `userEditedRef` gate that skipped the first `onUpdate`, was removed about four hours after this entry was written, when dirty detection switched to an HTML baseline comparison (commit 99f5a3e). Tested on a cold load, both straight from a URL and from the scene list, with a short scratch scene and a 1,711-word scene from the real book: the editor was editable and focused, the caret landed where clicked, typing marked the scene dirty, and Save became active. If it shows up again, note the steps (which page you came from, whether a draft banner was showing) and reopen.

### Writes over 64 KB fail in the browser (@wip/client `keepalive`)
**Where:** every request the app sends through `@wip/client` 0.60.0 from the browser.
**Symptom:** a request whose body is over 64 KB fails at once with `TypeError: Failed to fetch`; nothing reaches the server.
**Root cause:** the client's `FetchTransport` sets `keepalive: true` on every request, and browsers refuse keepalive requests with bodies over 64 KB. Reproduced 2026-10-18 with plain `fetch`: a 60 KB form post with `keepalive` → 200, 70 KB with `keepalive` → "Failed to fetch", 70 KB without → 200.
**Status:** Image upload works around it (`storeFile` in `src/lib/media.ts` posts with its own `fetch`). Not worked around anywhere else. The largest scene in `aa` is 13.5 KB (2026-10-18), so saves work today, but a scene of roughly 10,000 words would fail to save, and so would any other single write over 64 KB. The fix belongs in `@wip/client` (drop `keepalive`, or set it only for small bodies); reported as CASE-899 (2026-10-18).

### Relationships `template` filter ignores the `namespace` parameter
**Where:** `GET /documents/{id}/relationships?template=<VALUE>&namespace=<ns>` (document-store).
**Symptom:** with the same edge type value in two namespaces (`aa` and a scratch copy), a bare `template=AA_ATTACHED_TO` plus `namespace=dev-aa-lib` returned 0 relationships, while `template=dev-aa-lib:AA_ATTACHED_TO` or the template's canonical id returned the expected 1 (2026-10-18). The bare value resolved to the other namespace's edge type.
**Status:** worked around: the app always passes the namespace-qualified `ns:VALUE` form (`attachedToFilter` in `src/lib/media.ts`). Reported as CASE-900 (2026-10-18).

### WIP resolves names of deleted or deprecated terms (CASE-904)
**Where:** every document write with a character, location or plot-thread name.
**What BE-YAC found (CASE-904, 2026-10-18):** the document store checks names against its own cached copy of each vocabulary. That copy includes deprecated and inactive terms indefinitely, and can be up to 5 minutes stale. A deleted or deprecated name therefore still resolves to its old term, ahead of another term's alias. Separately, hard-deleting a term leaves its Registry entry active, so re-creating the same name gets the old term id back.
**Consequences for AA:** the merge rewrites stored references instead of relying on aliases, and the app must always write canonical names. Book reset (Dashboard "Danger Zone" with "clear names", Import's "reset book") deletes every name; a re-import then reuses the old term ids, which is harmless when the names mean the same thing.
**Status:** fix proposed by BE-YAC (def-store becomes the only name resolver, a real `merge_terms`, term deletion removes the Registry entry); scope awaits Peter.

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
