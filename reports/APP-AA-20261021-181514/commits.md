## 483435b — test: e2e and integration read the WIP key from .env; watcher records failed requests
**Time:** 21:53
**Files:** 6 changed, +38/-15
**Tests:** e2e 24/24 (single run, key from .env); watcher probe recorded a page-level 404 (removed afterwards)
**What:** playwright + vitest integration configs load .env (dotenv) and require WIP_API_KEY_FILE/WIP_API_KEY instead of defaulting to ~/.wip-deploy/wip-local; watch() records HTTP >= 400 and failed requests; three scene tests now assert problems/dialogs; CLAUDE.md key path; smoke comment corrected.
**Why:** the local install was renamed wip-local → default, so npm run test:e2e died with ENOENT before running anything; nothing runs e2e automatically, so it went unnoticed.
**Discovered:** Chrome already logs 4xx/5xx as console errors, so the old watcher caught most failed requests too; the gain is naming the request. core.hooksPath was unset in this clone (reset to .githooks). wip-template-store + wip-wip-aa had exited (Peter restarted).

## 3a2ddf1 — fix: split picks a title no scene has ever had (split → merge back → split again failed)
**Time:** 22:01
**Tests:** new e2e 'split again after merging it back' fails on the old code (checked by reverting ScenesPage.tsx), passes with the fix; tsc clean
**What:** uniqueSceneTitle checks active, inactive and archived AA_EVENTs; scenes.spec tags titles per --repeat-each pass; support/book.ts gains pick/tag and term helpers.
**Why:** --repeat-each=3 exposed it: a status-less document query sees active docs only, so a retired '(continued)' title looked free; AA_EVENT identity is title, so the create revived the retired scene (active v2, outside the structure) and split aborted.
**PoNIF:** #3 (identity hash decides) + #1 (inactive keeps its identity) — the create was an upsert onto a retired entity.
**Discovered:** renameByCopy has the same blind spot (status: 'active' check) but there a revived retired doc just becomes the renamed entry, so it works; left as is. aa holds no inactive AA_EVENTs, so no live damage.

## 9efa345 — test: e2e entity merge through the UI; specs repeatable with --repeat-each
**Time:** 22:01
**Tests:** e2e --repeat-each=3: 74 passed, 0 failed/flaky; merge spec fails when executeMerge skips the reference rewrite
**What:** merge.spec.ts (characters merge via UI, stored result checked); per-pass names in characters/drag/merge specs; role=dialog + names on MergeEntitiesDialog and media DeleteDialog; aria-pressed on character cards in merge mode; library cards are named articles.
**Why:** Peter: step 6 (images + entity-merge coverage first) and repeatable specs for a clean flakiness measure.
**Discovered:** a term's label is not one of its names: fixtures must list the label as an alias for display-name writes to resolve.

## a5fe5ec — test: e2e images — upload on a character page becomes the portrait; permanent delete from the library
**Time:** 22:03
**Tests:** images spec 2/2; mutation checks: default role ILLUSTRATION → upload test fails; hardDeleteFile skipped → delete test fails (file still 200). Full e2e --repeat-each=3: 80 passed. Integration 22/22 (with .env key).
**What:** tests/e2e/images.spec.ts.
**Why:** Peter's step 6: images were the largest untested recent feature.
**Discovered:** GET /api/document-store/files/<id> answers 200 after a soft delete and 404 only after the hard delete — the 404 assertion really distinguishes the two.

## 298c505 — docs: test plan gaps, current architecture, the server's unread WIP_API_KEY_FILE
**Time:** 22:25
**Tests:** not run (docs only)
**What:** ROADMAP layer 3 brought current + missing pieces listed (locations/threads/notes/world rules, Move dialog, chapter numbering, rename dialogs, import review, German UI, automatic runs); ARCHITECTURE file tree / scene saving / Ask bar / new Testing section; README env table; KNOWN_ISSUES + CLAUDE.md corrected.
**Why:** Peter asked to add the test gaps and fix the documentation.
**Discovered:** the server never reads WIP_API_KEY_FILE (server/index.ts:16 reads WIP_API_KEY, fallback dev_master_key_for_testing → 401 on the local install), contradicting CLAUDE.md; a bare npm run dev on the host fails every WIP call. Tests and deployments mask it. Not fixed (Peter's call). ARCHITECTURE had been stale since ~11 routes; KNOWN_ISSUES still said Analysis shows plain text.

## 4bfd4c2 — test: e2e scene first load seven ways; close the 'may not save on first load' issue
**Time:** 22:25
**Tests:** first-load spec 49 runs (7 tests × 7 passes) no failure; full e2e --repeat-each=3: 101 passed
**What:** tests/e2e/scene-first-load.spec.ts (direct URL, list, Corkboard, leftover draft, slow WIP 1.5 s/call, 120-paragraph scene, second scene of a session); KNOWN_ISSUES entry closed; ROADMAP counts.
**Why:** Peter asked to dive into the never-reproduced first-load bug.
**Discovered:** SceneEditor mounts only after the events list loads, so it never starts without prose; the events list is page_size 200 — books over 200 scenes would show "Scene not found" (latent, recorded).

## 0a094eb — fix: prose saves to a scene land in the order they started; a save during a save is not dropped
**Time:** 23:04
**Tests:** scene-save-order.spec.ts 2/2; both fail on the old ScenesPage (stored the draft; "Two." dropped); full e2e --repeat-each=3: 116 passed; unit 118
**What:** queueProseWrite (module-level per-scene promise chain) for save, leave-save, split and scene merge; a save asked for during a running save runs right after it.
**Why:** a one-in-fifty failure of the first-load draft test: the leave-save (fire-and-forget; React's dev remount runs it at once) landed after the later Cmd/Ctrl+S and stored the older text. Same race possible in production on leave-and-return.
**Discovered:** an async helper that returns a promise makes its caller await that promise (test deadlock; wrapped in an object). Playwright route globs must match the query string; use a regex.

## 4bfceb8 — refactor: drop the as-any casts around the WIP client
**Time:** 23:04
**Tests:** tsc clean; unit 118; e2e full (single pass) before + in the 116-pass run
**What:** useBookTerms (the one widening of @wip/react useTerms params for namespace); casts removed from AliasManager, CreateEntityModal, useValidateScene, Characters/Dashboard/Import pages.
**Why:** KNOWN_ISSUES tech debt (Peter: "go for the technical debt").
**Discovered:** @wip/react useTerms params type lacks namespace (useTerminologies has it) — candidate case for BE-YAC. Import resolved creates without document_id as undefined → now rejects.

## 1c1fc5b — test: e2e the error screen when the app config cannot be loaded
**Time:** 23:04
**Tests:** app-config.spec.ts 3/3
**What:** HTTP 500 / no namespace / unreachable → "Cannot load app configuration", no nav rendered.
**Why:** last browser-unverified item from 2026-10-17.

## 4811781 — feat: DEV_ALLOWED_HOSTS lets the Vite dev server answer a non-localhost host
**Time:** 23:04
**Tests:** curl against a standalone Vite on :5190 — aa.internal 403 → 200 when listed, other hosts 403, unset unchanged
**What:** server.allowedHosts from DEV_ALLOWED_HOSTS.
**Why:** KNOWN_ISSUES tech debt. The wip-aa manifest (WIP repo) would still need the variable for a non-localhost dev ingress.

## 8e48b8e — docs: KNOWN_ISSUES — casts, unknown hosts and the app-config error screen resolved
**Time:** 23:04
**Tests:** not run (docs only)

## 6d0a22f — perf: load each page on first visit; main chunk 1,257 kB → 443 kB
**Time:** 23:11
**Tests:** e2e --repeat-each=3: 116 passed (after the podman VM came back; wip-template-store had again not started with the VM and was started by hand); prod build under /apps/aa: entry + lazy chunks 200
**What:** React.lazy for 14 pages, Suspense in Layout, lazy Markdown in AskBar.
**Why:** KNOWN_ISSUES "Large bundle" (Peter: technical debt).
**Discovered:** after a podman VM start, wip-template-store stays "Exited (0) 292 years ago" (never started) and wip-react-console exits (1) — twice today. Platform/deploy side, not AA.

## 7c4e800 — feat: demo novel touching every feature, with a loader and a manuscript
**Tests:** strict tsc on demo/ + tools/; loaded into aa-demo-book (9 characters, 8 locations, 6 threads, 8 chapters, 17 events, 6 notes, 3 rules, 2 prompts, 6 images / 9 attachments); a second app instance on aa-demo-book: all 12 pages load with no page/console/HTTP error; screenshots of Chapters (numbering), Characters (avatars), Images (attachments, unattached) as intended. Manuscript parsed with the real parseText: 5 chapters from all heading forms.
**What:** demo/book.ts, demo/README.md, demo/manuscript.txt, tools/load-demo-book.ts; tsconfig includes demo + tools.
**Why:** Peter asked for AA test data: a short novel using all features (manuscript + loader, own namespace).
**Discovered:** (1) AA bug: import folds prologue/interlude/epilogue into neighbouring scenes (pre-chapter buffer never cleared) — KNOWN_ISSUES, not fixed. (2) WIP: a scene titled like a chapter is refused, "Composite key already registered" → CASE-926. (3) WIP: a namespace recreated under a deleted name resolves ns:VALUE to the deleted terminology → CASE-927; aa-demo and aa-demo-2 deleted (unusable).

## f47a8fe — docs: KNOWN_ISSUES — case numbers for the two WIP bugs

## d908c38 — fix: import keeps prologue, interlude, epilogue and front matter as their own parts (CASE-928)
**Tests:** server/import.test.ts 11 (8 fail on the old parser); e2e import.spec (own app instance + namespace) fails on the old parser and on number-keyed results; unit 129; e2e --repeat-each=3 119 passed.
**What:** parseText recognises unnumbered headings (en/de), front matter part, unique scene titles, positional key; ImportPage: front matter unticked, kind labels, key-based extraction maps, PROLOGUE/INTERLUDE/EPILOGUE event types, unnumbered slots; server reset addresses <ns>:AA_CHARACTERS; second Playwright project for import.
**Why:** Peter: file a case + KNOWN_ISSUES, fix, close. CASE-928 filed, implemented, status implemented.
**Discovered:** "Reset & import fresh" never cleared names (bare terminology value → 400 for a multi-namespace key, swallowed by catch, answered ok) — fixed in the same commit; found by the import spec's repeat passes. target_yac APP-AA is not in the KB vocabulary (use any).

## a6e88b3 — feat: load the demo book from the app, in an empty book
**Tests:** e2e demo.spec (loads in a fresh book, offer gone afterwards; fails when bookIsEmpty always says yes); gate path driven in Chrome on a new namespace aa-demo-app (demo loaded in 9.3 s, no errors); unit 129; e2e --repeat-each=3 122 passed.
**What:** server/lib/demo-book.ts (+ data moved to server/demo/book.ts), server/demo.routes.ts (status + SSE load), LoadDemoBook card on Dashboard and Import page, "Bootstrap with the demo book" on the gate, src/lib/sse.ts; CLI is a thin wrapper.
**Why:** Peter could not see the demo in the app; asked for an in-app option, empty books only.
**Discovered:** Dashboard "Recent Scenes" prints locations as term values (KNOWN_ISSUES, not fixed). .dockerignore's unscoped *.md drops server/prompts/assistant.md from the image (deploy contract Skip 8; not fixed). A dev instance's `tsx watch` outlives a port-based kill and restarts its server on the next server edit: stop dev instances by their watcher PID.

## e66a118 — feat: Delete book deletes the whole book for good; new books in deletion mode full
**Tests:** e2e delete-book.spec (WIP checked after: no docs, no names, files 404, no title, demo offered); demo spec deletes then loads again; mutation (docs only retired) fails all three import-project specs; retain refusal checked on aa-demo-app; unit 129; e2e --repeat-each=3 125 passed.
**What:** server/lib/book-space.ts (book definition, contents, hard delete incl. retired docs and files), GET /api/book/contents + DELETE /api/book, Dashboard dialog (counts, type the title), import reset uses it, bootstrap creates new namespaces in deletion_mode full; aa switched retain → full (Peter approved).
**Why:** Peter: deleting the demo did not restore a virgin state (title, images, prompts left); a danger-zone delete must delete everything.
**Discovered:** WIP refuses re-creating a retired document's identity after its name term was hard-deleted and re-created → CASE-930 (filed). Hard-deleting a media document apparently removes its file (later delete → "File not found" bulk-item error; handled). Peter then deleted and re-bootstrapped aa → CASE-927 hit it: aa:AA_CHARACTERS / aa:AA_LOCATIONS 404 (commented on CASE-927). aa cannot create names until BE-YAC fixes it.

## 47fc4eb, 6863899, 026f72a, 5207eb7, b0d75b0, a5113a5, e0f019c — Recent Scenes fix; e2e gaps closed
**Tests:** each new spec run alone, then full e2e --repeat-each=3: 161 passed (53 tests in 18 specs); unit 129. Dashboard spec fails on the old code ("— SALT_CELLAR"); German raw-key check fails on a missing sidebar key.
**What:** Dashboard Recent Scenes show location names (useEntityNames). New specs: dashboard, entities (location/thread/note/world rule create-view-update, version 2 of the same doc), move (between two scenes + Undo), numbering (no number, start at, Undo; shown number + stored slot), rename (relabel, chapter/scene copy, names in use refused), german (switch, reload, no raw keys on any page). A11y for selectors: named cards/rows (role=article), Move and numbering dialogs named, labelled chapter select / number field / scene title field / language select; scene title keyboard-reachable. German wording aligned (Figuren, Schauplätze).
**Why:** Peter: fix Recent Scenes, then close the ROADMAP's e2e gaps.
**Discovered:** test data hit CASE-926 (numbering chapters titled like scenes.spec's scenes) — renamed; drag spec measured before render (flake 1/75) — waits now. Only remaining ROADMAP test item: running the suite automatically.

## 174f5b4 — demo: second test manuscript for the import; backlog items from its first run
**Time:** 2026-10-24 21:28
**Files:** 3 changed, +542/-0
**Tests:** pre-commit hook (type-check, unit) passed
**What:** `demo/the-crumbs-of-meridian-tower.txt` (~6,800 words, 12 parts, 25 scenes) as a second import test manuscript. Two ROADMAP backlog items from its first real import: duplicate entities, and the title taken from the file name.
**Why:** Peter asked for a longer test novel. It was imported into `aa` with the real AI extraction.
**Discovered:** The per-chapter extraction gave 18/43/39 characters/locations/threads for a story with about 11/14/8; the clean-up took about 20 manual merges.

## d1c57db — scene editor: Previous/Next cross into the neighbouring chapter
**Time:** 2026-10-24 21:36
**Files:** 6 changed, +170/-40
**Tests:** 3 new unit tests, new e2e `navigation.spec.ts` (fails on the old code); 23 e2e passed
**What:** `getSceneInReadingOrder` on the book structure. The arrows say "Next chapter" / "Previous chapter" with the chapter label, skip empty chapters, and end at the start or end of the book. Merge and the analysis context keep using the neighbours within the chapter.
**Why:** Peter: there was no way to go from a scene to the next chapter in edit mode.

## 3c55727 — import: store scene prose as paragraphs, not plain text
**Time:** 2026-10-24 21:40
**Files:** 6 changed, +117/-3
**Tests:** 5 unit (`prose.test.ts`); import e2e extended (fails without the fix)
**What:** `proseFromText` turns manuscript text into escaped `<p>` paragraphs. `tools/convert-plain-prose.ts` converted aa's 25 scenes in place (if_match; a re-run finds 0 left). CASE-937 filed and set to implemented.
**Why:** Every imported scene opened as one long paragraph: the editor reads prose as HTML.
**Discovered:** Found by eye in the editor; the import e2e test only matched the start of the text.

## 834206d — scene editor: open each scene at its top
**Time:** 2026-10-24 21:57
**Files:** 2 changed, +29/-4
**Tests:** navigation e2e extended (scrollTop 2840 vs 0 without the fix)
**What:** The prose scroll area resets to the top when the scene changes, also in composition mode.
**Why:** Peter: switching scenes kept the previous scroll position.

## 5f53988, 7d0ca37, a05edeb, d450e02, 15a1223 — Export page: Markdown, plain text, DOCX, EPUB, PDF print view, story bible
**Time:** 2026-10-24 22:24–22:38
**Files:** 53 changed, +1834/-187
**Tests:** 20 export unit tests, `export.spec.ts` (7 e2e); full e2e 65 passed
**What:** `server/lib/export/` and `GET /api/export/...`:
- Markdown and plain text read back through the import unchanged (checked on aa: 12 parts, 25 scenes, identical prose).
- DOCX in manuscript format or as a reading copy (`docx` 9.9.0, pinned to a version more than two weeks old).
- EPUB 3 (`jszip`).
- A print view for the PDF, with page margin boxes for page numbers.
- The story bible as a print view or Markdown.

The pure structure code moved to `src/lib/bookStructure.ts`; the production Dockerfile copies it and `titles.ts`.
**Why:** Peter asked for export formats; order agreed: md/txt → DOCX → EPUB → PDF → bible.
**Discovered:** A new runtime dependency kills the bind-mounted dev server until the container restarts (CASE-721 pattern); a `podman restart wip-wip-aa` lets the entrypoint run `npm ci`. Two links with the same accessible name ("Open PDF (print view)") were caught by the e2e test.

## 283a32a — import: merged descriptions no longer get a doubled full stop
**Time:** 2026-10-24 23:59
**Files:** 4 changed, +32/-8
**Tests:** 3 unit (`joinSentences`)
**What:** The review-step merge joins with a space after text that already ends in punctuation. 18 entries in aa were fixed in place (`..` + space → `.`; new versions with if_match).
**Why:** The story bible export showed "evidence.. Facility Manager".

## 1accf43 — fix: stop querying the archived document status WIP no longer has
**Time:** 2026-10-26 22:53
**Files:** 2 changed, +3/-3
**Tests:** full e2e 65 passed
**What:** Delete book and the split's title check query active and inactive only.
**Why:** WIP removed `archived`; status=archived answers 422, which broke both features in the running app.
**Discovered:** Surfaced by the new `@wip/client` types after the scaffold refresh, not by a failing test: no e2e had run against the new WIP.

## 07d9715 — chore: scaffold refresh — @wip/client 0.63.0, @wip/react 0.23.0, agent status line
**Time:** 2026-10-26 22:54
**Files:** 21 changed, +406/-80
**Tests:** type-check, 160 unit, 65 e2e passed
**What:** New library tarballs, force-added because `*.tgz` is gitignored but `package.json` installs from them. `useReportQuery` `queryKey` workarounds dropped (CASE-893 item 3, comment #4). `.mcp.json` and `.claude/kb.json` untracked. The dev container was restarted onto the new libraries.
**Why:** Peter ran `create-app-project.sh .`.

## 7d11498 — bootstrap: refuse a resume on a namespace in use (resume_blocked); CLAUDE.md refresh merged
**Time:** 2026-10-26 23:08
**Files:** 5 changed, +165/-38
**Tests:** 3 new integration tests (24 passed; the refusal tests fail on the old code), 65 e2e
**What:** Port of WIP 8aa39958: `checkStatusDetail()` returns `resume_blocked` with a message; the gate has a panel without a resume button; `runBootstrap` refuses `resume_blocked` and `ready`. CLAUDE.md takes three parts of the refresh and corrects the legacy-record paragraph.
**Why:** The CLAUDE.md refresh described the guard; taking the text without the code would have made it aspirational.
