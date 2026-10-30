# Known Issues

## Bugs

### Scene editing may not save on first load — closed 2026-10-22, guarded by e2e tests
**Page:** Scenes (`/scenes`)
**Symptom (as reported 2026-04-04):** Opening a scene shows the editor as read-only or unresponsive on first visit. Navigating away and back fixes it.
**Status:** Not reproducible since the suspected cause went: a `userEditedRef` gate that skipped the first `onUpdate`, removed about four hours after this entry was written, when dirty detection switched to an HTML baseline comparison (commit 99f5a3e). Checked by hand on 2026-10-17 (cold load from a URL and from the scene list, a 1,711-word scene from the real book). On 2026-10-22 `tests/e2e/scene-first-load.spec.ts` automated it: seven ways of opening a scene for the first time in a fresh browser (direct URL, scene list, Corkboard card, a leftover local draft, every WIP call delayed 1.5 s, a 120-paragraph scene, the second scene of a session); each time the editor is editable, typing shows, Cmd/Ctrl+S stores it. 49 runs (seven tests, seven passes), no failure. The code also rules out the obvious path: the editor mounts only after the scene list has loaded, so it never starts without the prose. If it shows up again, note the steps (which page you came from, whether a draft banner was showing, local or deployed app) and reopen.

### Import merged a prologue, interlude or epilogue into a neighbouring scene — fixed 2026-10-22 (CASE-928)
The parser started chapters only at `Chapter N` / `Kapitel N` / `# N`: text before the first heading was glued onto Chapter 1's first scene, and `Prologue` / `Interlude` / `Epilogue` headings with their text became part of the scene before them. Now `Prologue`/`Prolog`, `Interlude`/`Zwischenspiel` and `Epilogue`/`Epilog` (optionally `: title`, optionally `#`) start unnumbered parts: their scenes get event type PROLOGUE / INTERLUDE / EPILOGUE and the book structure marks them unnumbered. Text before the first heading is a "Front matter" part, listed in the structure step but not ticked. Scene titles are unique within an import (a Part Two restarting at Chapter 1 used to produce a second "Ch1 Scene 1", which the import's identity upsert turned into an overwrite), and extraction results are keyed by position, not chapter number. Found while testing the fix: **Reset & import fresh** never cleared the names. The server looked the vocabularies up by bare value, which a key spanning every namespace cannot resolve (400), skipped them silently and still answered ok, so the import page kept asking for a reset. It now addresses `<namespace>:AA_CHARACTERS` etc. and fails visibly. Guarded by `server/import.test.ts` and `tests/e2e/import.spec.ts` (its repeat passes go through the reset).

### The server exited when WIP was still starting — fixed 2026-10-30 (CASE-1001)
On the redeploy of 2026-10-30 the platform's MCP server answered 503 ("Cannot check the API key right now: Registry unreachable") while the Registry came up. AA's server connected the Ask agent before it listened, exited on that error, and in the dev container nothing restarted it (Vite and `tsx watch` keep the container alive), so every `/api` call failed until a manual restart. The server now listens first. The Ask agent connects in the background with retries (1 s doubling to 30 s, indefinitely; a 401/403 stops and is logged as a key problem), and is published only after a full connect, so a failed attempt never leaves a dead client counted as ready. `/api/ask` answers 503 with the reason meanwhile; `/api/health` does not depend on WIP. The extraction's role and location-type lists also load in the background and retry, instead of keeping the defaults until a restart. Guarded by `server/lib/agent-retry.test.ts`.

### Imported scenes opened as one long paragraph — fixed 2026-10-24
The import stored each scene's manuscript text as plain text, and the editor reads prose as HTML, where line breaks are spaces: every imported scene showed as a single paragraph (the demo book, stored as HTML, was never affected). The import now converts the text (`src/lib/prose.ts`: blank lines separate paragraphs, a single line break inside one is kept, text without blank lines has one paragraph per line, everything escaped). Books imported earlier are fixed with `npx tsx tools/convert-plain-prose.ts --namespace <ns> --apply` (lists first without `--apply`; writes each scene as a new version with if_match). `aa`'s 25 scenes were converted on 2026-10-24. Guarded by `src/lib/prose.test.ts` and `tests/e2e/import.spec.ts`.

### Import merge joined descriptions with a doubled full stop — fixed 2026-10-24
Merging entities in the import's review step joined descriptions (and locations' atmospheres) with `". "`, also after text that already ended in a full stop: "…until confronted with evidence.. Facility Manager at…" (Gerhard Brandt in `aa`, seen in the story bible export). `joinSentences` (`src/lib/prose.ts`) now adds a full stop only where a text has no closing punctuation. Books imported earlier keep the doubled stops until they are edited. Guarded by `src/lib/prose.test.ts`.

### A scene cannot have the same title as a chapter (WIP, found 2026-10-22)
Creating a scene titled like an existing chapter in the same namespace fails: "Composite key already registered under different entry". Both templates use the title as identity, and WIP's Registry key evidently does not include the template, although `wip://conventions` scopes identity per template. Writers hit this with a chapter "Low Water" and a scene "Low Water". Renaming a scene to a chapter's title goes through the same create, so it should fail the same way (not tried). Reproduced on a scratch namespace with a chapter and a scene titled "Same Title Probe". Platform side: CASE-926 (BE-YAC).

### A namespace recreated under a deleted one's name resolves names to the deleted entries for a while (WIP, found 2026-10-22, CASE-927)
After deleting a namespace and creating it again with the same name, `ns:VALUE` resolved to the deleted namespace's terminologies (404 "Terminology … not found") while listing showed the new ones. On `aa` (re-created 2026-10-22 22:41 UTC) it lasted about 5 minutes for AA_CHARACTERS / AA_LOCATIONS, then resolved; on `aa-demo` it still failed a minute later. A fix is underway in WIP. Avoid it: empty a book with the app's "Delete book" (keeps the namespace); `tools/load-demo-book.ts` takes a new namespace name rather than reusing one.

### The server ignores `WIP_API_KEY_FILE` (found 2026-10-22)
**Where:** `server/index.ts:16`, `server/lib/wip-api.ts`
**Symptom:** `npm run dev` on the host, with `.env` as written (`WIP_API_KEY_FILE` only), sends the fallback key `dev_master_key_for_testing`, which the local install refuses (401), so every WIP call fails. Deployed containers are not affected: the manifest passes `WIP_API_KEY` from the install's secret. The tests are not affected either: their configs read the file and pass `WIP_API_KEY` to the app instance they start, which is also why this went unnoticed.
**Fix (not done):** resolve the key like the Anthropic key: `WIP_API_KEY`, else the file `WIP_API_KEY_FILE` names (or `@wip/proxy`'s `apiKeyFile` option), read at startup.

### Fixed upstream (2026-10-19): large writes, edge-type filter, term names
Three WIP issues AA reported are fixed in WIP and verified in AA on a scratch namespace:
- **Writes over 64 KB** (CASE-899): `@wip/client` 0.60.1 no longer sets `keepalive`. AA uses 0.62.0; a 147 KB image upload and a 73 KB scene save went through. The upload workaround (`storeFile`) is gone.
- **Edge-type filter ignoring `namespace`** (CASE-900): fixed in document-store. AA keeps passing `ns:VALUE`, which stays correct. Since the fix, an edge type that does not exist in the namespace answers 404 instead of an empty list.
- **Names of deleted or deprecated terms still resolving** (CASE-904): def-store is now the only resolver (no cache), deprecated terms are refused on write, and a term hard delete removes its Registry entry. Merge now uses WIP's term merge: the absorbed term stays behind as **deprecated**, pointing at the survivor, and every term list in AA asks for active terms only. Stored references are still rewritten by the app (WIP never re-resolves stored documents).
These fixes need a WIP built from `5920a66c` or later. On 2026-10-19 wip-local ran `5920a66c`, and dev-test's `20261018c` images answered the term-merge endpoint; on an older WIP the merge's last step fails.

## Unverified / technical debt

### Renamed chapters, scenes, notes and world rules start a new version history (2026-10-19)
Their identity is the title, so a rename copies the document under the new title (`src/lib/rename.ts`). The renamed document starts at version 1; earlier versions stay with the retired old document. Characters, locations and plot threads are not affected: they are renamed by relabelling their term.

A related edge (2026-10-22): `renameByCopy` checks only active documents for a title in use. Renaming onto the title of a retired document therefore brings that document back (a new version of it, with the new data) instead of creating one; its old history comes along. The rename itself works, so this was left as is. Split had the same blind spot and failed outright; it now checks every status (`uniqueSceneTitle`, `ScenesPage.tsx`).

### Browser-unverified changes (2026-10-17) — all verified 2026-10-22
Clicked through in a browser against a scratch namespace: loading the namespace from `/api/app-config`, the gate's **needs bootstrap** and **incomplete** panels, and Resume Bootstrap. The last item, the error screen `main.tsx` shows when `/api/app-config` can't be loaded, is covered by `tests/e2e/app-config.spec.ts` (HTTP 500, no namespace configured, server unreachable).

### Analyse (2026-10-18)
Tested in a browser up to the Claude call (prompt library, starter prompts, the ✨ menu, the exact message sent, the "no API key" error). The Claude call itself was then tested against the deployed app with a real key: Style Polish on "Ch2 Scene 1" returned ten concrete suggestions in German in about 17 s. The answer is Markdown, which the Analysis tab renders as formatted text (since 2026-10-18; raw HTML is shown as text, never rendered). The key set in Settings on the deployed dev app is a runtime override (`persistable: false`), so it is lost when the container restarts; persisting it needs `ANTHROPIC_API_KEY_FILE` on a writable mount in the app's manifest (see CLAUDE.md, MCP section). The Analysis tab lives in the scene editor's side panel, which is hidden below the `md` breakpoint (768px), so on narrow screens the result is not visible.

### Reporting entity view only has columns shared by every template version
Not a bug, WIP's documented design: the `doc_<value>` entity view carries only the columns all versions share with the same type. A field added in a later version (AA_NOTE's `linked_plot_threads` in v2) is only in `doc_<value>__v<N>`, unless the template opts in via `reporting.cross_version_view.columns`. The app's cross-reference queries match on `data_json`, which holds every version's data. Reproduced on a fresh namespace on 2026-10-18. The agent-facing `wip://conventions` resource doesn't mention this rule, which is how it got mistaken for a bug.

### `as any` casts around the WIP client — fixed 2026-10-22
Gone. `@wip/react`'s `useTerms` forwards its params to the API, but its params type lacks `namespace` (`useTerminologies` has it); `src/lib/useBookTerms.ts` is now the one place that widens it, and every other cast needed none. Removing them surfaced one real gap, fixed: the import stored `undefined` in the book structure if a create returned no id. Left on purpose (not WIP-client casts): `catch (err: any)` blocks and the parsing of the server's import JSON in `ImportPage`/`DashboardPage`/`ScenesPage`/`AskBar`.

### Vite rejects unknown hosts — fixed 2026-10-22
Vite's dev server answers 403 to a `Host` other than localhost or an IP. `DEV_ALLOWED_HOSTS` (comma-separated, a leading dot allows subdomains) now feeds `server.allowedHosts`; unset keeps Vite's default. A dev install behind a non-localhost ingress needs that variable in its manifest (`apps/wip-aa/wip-app.yaml`, WIP repo), which it does not have yet.

### "Delete book" needs deletion mode `full` (2026-10-23, CASE-930)
"Delete book" (Dashboard) and "Delete book & import fresh" (Import page) delete everything the app writes into the book: documents (also ones an earlier soft delete left retired), stored image files and names, so the book is afterwards exactly like a freshly bootstrapped one and offers the demo again. They hard-delete, because WIP refuses a new document whose identity matches a retired one once its names were hard-deleted and created again ("Composite key already registered under different entry", CASE-930); retiring the documents would leave a book that cannot be imported or loaded again. Hard deletes need the namespace in deletion mode `full`: new books are bootstrapped that way, `aa` was switched on 2026-10-23, and a `retain` book shows an explanation instead of the delete button. The partial reset (checkboxes per kind) is gone: it left the title, images, prompts and dangling image attachments behind.

### Dashboard "Recent Scenes" showed locations as term values — fixed 2026-10-23
"Ch. 2 — THE_NARROWS" instead of "The Narrows": the list printed the stored term value. It now shows the location's name, like the rest of the app (`useEntityNames`). Guarded by `tests/e2e/dashboard.spec.ts`.

### The scene editor loads at most 200 scenes (found 2026-10-22)
`ScenesPage` lists scenes with one `useDocuments` call, `page_size: 200`, and finds the open scene in that list. In a book with more than 200 scenes the rest would show "Scene not found" and be missing from the list. `aa` has 12 scenes, so this is latent. Fix when a book gets near it: page through, or fetch the open scene by id.

### Large bundle — fixed 2026-10-22
The production bundle was one 1,257 kB chunk. Every page is now loaded on first visit (`React.lazy` in `App.tsx`, `Suspense` around the outlet in `Layout.tsx`), and the Ask bar loads its Markdown renderer with the first answer. Main chunk 443 kB; the scene editor (463 kB, TipTap) and Markdown (161 kB) load when needed; no chunk over Vite's 500 kB warning. Checked: a production build under `/apps/aa` serves every chunk, and the e2e suite passes three times in a row (116).

## Deferred decisions

### Scene auto-save vs explicit save — decided 2026-10-18
Autosave to WIP (45 s idle, max every 5 min while typing, on leave/hide) plus an explicit Save that shows the state and answers Cmd/Ctrl+S. See ROADMAP Next Up.
