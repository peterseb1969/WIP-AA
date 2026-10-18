---
session_id: APP-AA-20261018-152301
role: APP-AA
started_at: 2026-10-18T15:23:01
status: closed
ended_at: 2026-10-19T00:11:26
continues_from: APP-AA-20261017-150822
---

# Session APP-AA-20261018-152301

Continues from APP-AA-20261017-150822 (via /wip-wake).

## Tasks
- [x] Wake + context recovery
- [x] Chapter drag-and-drop (722723e)
- [x] ROADMAP: Image support ToDo (scope to agree with Peter; model change)
- [x] Media model (f569c4f) — applied to aa with Peter's approval
- [x] Images v1 UI (3cfc29f)
- [x] CASE-899 filed: @wip/client keepalive 64 KB bug
- [x] Images on chapters, notes, world rules + Image library with permanent delete (e4246e6)
- [x] CASE-900 filed: relationships template filter ignores namespace
- [x] Chapter numbering, option C (41544b6 model on aa, 9d7c862 UI)
- [x] Merge design agreed (A, fields b, undo optional, all three types); CASE-904 filed
- [x] Merge implementation (fc96e42), after CASE-904 was answered
- [x] Analysis/Ask answers render as Markdown (c3e84cb)
- [x] Scratch namespace dev-aa-md deleted
- [x] Rename without duplicates, A1 + B1 (2a27ee5); term-id matching fixes Appears-in etc. on aa

## Session Summary
**Duration:** 2026-10-18 15:23 – 2026-10-19 00:11
**Commits:** 23 (14 code/docs, 9 report logs), plus this summary commit — all on master, NONE PUSHED (master is 23 commits ahead of origin/master)
**Lines:** +3346/-294 across 45 files (excluding package-lock, reports, libs)
**Phase:** /wip-improve (Phase 4 complete), with three Peter-approved data-model changes on `aa`

### What happened
Woke from APP-AA-20261017-150822 and worked straight down Peter's ToDo list. Chapter drag-and-drop came first (shared pointer-drag helper, undoable). Peter then asked for image support; it grew into generic file support (AA_MEDIA + AA_ATTACHED_TO edge type), images on every entity, an image library with a true delete, and portraits as avatars. Chapter numbering went through a designed choice (option C: rules on the book structure, numbers computed), as did merging (option A: app-side rewrite, after CASE-904 showed WIP cannot merge terms) and renaming (A1 relabel the term / B1 copy and re-point). Claude's answers now render as Markdown. CASE-888 was applied for AA. Along the way four WIP cases were filed (899, 900, 904; plus a comment on 888). The rename work exposed live `aa` bugs caused by mixed name spellings; they were fixed by matching entities by term id everywhere. Last ask: test coverage is now the only Next Up item.

### State of the app (all live in the dev container; not pushed)
- **Chapters:** drag rows (Chapters page) or headings (Corkboard). The Number button sets continue / restart at N / no number; numbers are computed (`getDisplayNumber`), while positions (`getChapterNumber`) still drive grouping, filters and sorting. Number-only titles ("Chapter 5", "Kapitel 5") and the "ChN " scene prefix are hidden at display time (`src/lib/titles.ts`).
- **Images:** Images section on Character, Location and Plot Thread pages and in the scene editor's Images tab. Chapters show it in the expanded row; Notes and World Rules have an "Images (n)" toggle. The Image library (sidebar "Images") lists every image with its attachments, has a "Not attached" filter, uploads without attaching, and Delete permanently (edges → media doc → file soft-delete → hard-delete). The first PORTRAIT is the avatar everywhere (`usePortraitOf`, keyed by term id). Upload uses our own fetch (`storeFile` in `src/lib/media.ts`) because of CASE-899.
- **Merge:** "Merge…" on the Characters, Locations and Plot Threads lists → select → choose the one to keep → preview → confirm (`src/lib/mergeEntities.ts`, `src/components/MergeEntities.tsx`). Rewrites every reference (by value, label or alias) to the survivor's term value, moves images, fills empty fields only (Peter's option b), adds the old names as aliases, then retires the absorbed docs and terms. Idempotent, absorbed removed last. No undo (agreed).
- **Rename:** the Edit form detects a name change. Character / location / plot thread → `relabelEntity` (term label changes, old label becomes an alias, no doc changes). Chapter / note / world rule → `renameByCopy` (new doc, book structure + image edges re-pointed, old doc retired). Scenes: click the title in the scene editor header (refused while unsaved; also rewrites ids in the undo stack). Names already in use are refused (merge hint for term kinds).
- **Names:** `src/lib/entityNames.ts` (`label`, `termId`, `same`) is the only correct way to show or match character, location and plot-thread names. "Appears in" (`CrossReferences`) matches `term_references_json` by term id.
- **Markdown:** `src/components/Markdown.tsx` (react-markdown + remark-gfm; raw HTML never rendered) in the Analysis tab and Ask bar answers.
- **Server:** unknown `api|auth|wip|server-api|mcp` paths → 404 JSON in production (CASE-888).

### Data-model changes applied to `aa` (all approved by Peter, rehearsed on scratch namespaces first)
- f569c4f: AA_MEDIA_ROLE terminology, AA_MEDIA (identity = the file field), AA_ATTACHED_TO edge type (media → character/location/event/chapter/plot thread/note/world rule; role + sort_order).
- 41544b6: AA_CHAPTER_SLOT v2 (`number_start`, `unnumbered`) and AA_BOOK_STRUCTURE v2 (pins slot v2). The one structure doc was migrated (v46, template v2); both v1s deactivated (structure v1 needed force: its own inactive version row counts as a dependent). The bootstrap now pins nested template refs to the version created in the same run.
- No stored data was rewritten (Peter, 2026-10-19: "no fix for existing data").
- When last checked, `aa` had 148 docs and 1 file (Peter attached an image himself).

### WIP interactions / cases
- **CASE-899** (filed): @wip/client sends every request with `keepalive: true`; browsers refuse keepalive bodies > 64 KB ("Failed to fetch"). Uploads work around it. Any other write > 64 KB (e.g. a ~10k-word scene save) would still fail. Largest aa scene: 13.5 KB.
- **CASE-900** (filed): the relationships endpoint's bare `template=` value ignores `namespace=` → the app passes `ns:VALUE`.
- **CASE-904** (filed, responded by BE-YAC): document-store resolves term names from its own cache, which includes deprecated/inactive terms indefinitely and is up to 300 s stale; a term hard-delete leaves an active Registry entry (a re-created name reuses the old id). The "right fix" (def-store as sole resolver, a real `merge_terms`, proper delete) is scoped and awaits Peter. Consequence for AA: always write canonical names; merge rewrites references.
- **CASE-888** (commented #2): AA done, a90fcbb; the case stays open for 5 other apps.
- WIP dedups file uploads by content (same bytes → same file_id). Re-creating a soft-deleted document's identity reactivates it (same id).
- MinIO was briefly absent from wip-local (Peter switched storage to Garage); WIP went down once mid-session (a redeploy) and came back.

### Dead ends / corrections (don't repeat)
- I first "proved" features on scratch data that used one spelling for both sides. Real `aa` stores display names on entities and term values in references, so "Appears in", portraits and the alias manager were broken in `aa` for a long time unnoticed. Seed test data like `aa` (memory: project_aa_name_spellings).
- Removing a term and adding its name as an alias, a Registry merge, and deprecate-with-replacement + alias all leave document writes resolving the old name to the old term (CASE-904). Don't build on them until BE-YAC's fix ships.
- My KNOWN_ISSUES edit in fc96e42 swallowed the "Unverified / technical debt" heading (restored in ecea23a). When slicing markdown by "next ### heading", watch for "##" headings in between.
- I once wrote a commit-log time without running `date` (fixed). Always run `date`.
- AA's bootstrap has no SEED_DIR override (seed path is module-relative); to build an "old-state" namespace, post templates with the scratchpad-style apply script instead.
- The zsh `${3:+…}` idiom doesn't word-split; it produced a fake 400 in a curl matrix. Pass curl args explicitly.
- Adding an npm dependency while the dev container bind-mounts the tree breaks the live app until its node_modules volume has it: `podman exec wip-wip-aa sh -c 'cd /app && npm install'` first, then update `node_modules/.wip-lock-hash`, then write the import.

### Unfinished
- **Next Up: Test coverage** (ROADMAP has the 3-layer plan). I proposed starting with unit tests; Peter has not answered yet. Zero tests exist today.
- Ideas (not scheduled): sound files (check Range passthrough first: it returned 200 full-body), inline images in prose, shrinking photos before upload, structure history, book export, AI scene validation, full-text search.
- Not tested in a browser: German UI for merge/rename/media/numbering (except the numbering strings); interrupted-merge re-run; location/plot-thread rename (same path as character); world-rule rename (same path as note); drop of OS files onto image sections.
- Peter's 2026-04 items 7 and 8 (New Scene required markers; new scene not showing after save) were never re-checked.
- Nothing is pushed.

### For the next YAC
1. Read ROADMAP.md (Next Up = Test coverage), KNOWN_ISSUES.md, then this file's commits.md. Memory has the name-spelling trap.
2. **The dev container bind-mounts this working tree with HMR**: every save is live in Peter's browser. New npm deps: install inside the container first (see dead ends).
3. **Test rig that worked all session:**
   - `PUT /api/registry/namespaces/dev-aa-<x>`; use `deletion_mode: retain` to behave like `aa`, flip to full with `confirm_enable_deletion: true` before deleting.
   - Start `WIP_API_KEY="$(cat ~/.wip-deploy/wip-local/secrets/api-key)" WIP_NAMESPACE=dev-aa-<x> PORT=3015 VITE_PORT=5181 WIP_BASE_URL=https://localhost:8443 npm run dev` in the background, then `POST :3015/server-api/bootstrap/run`.
   - Seed via the WIP REST API (terms first for name vocabularies, as value + label + alias like the importer).
   - Drive with claude-in-chrome. `file_upload` works with scratchpad PNGs; real `left_click_drag` drives the pointer drags.
   - Delete the namespace afterwards.
4. **Model changes:** never iterate on `aa`. Rehearse on scratch (fresh and upgrade-in-place), prove payload equivalence by re-posting to scratch (expect `unchanged`), check `aa` matches the old seeds (re-post old seeds → `unchanged`), then apply; migrate_documents dry-run → apply; deactivate old versions. Use `aa:VALUE` qualified ids (CASE-900).
5. **Code conventions added this session:** structure edits go through `useStructureEditor()` (moveScene, moveChapter, setNumbering, removeScene, addChapter) so they get undo. Entity names go through `useEntityNames()`. Renames go through `src/lib/rename.ts`. Merges go through `src/lib/mergeEntities.ts`. Media goes through `src/lib/media.ts`. Bulk WIP writes must check per-item results.
6. Pending Peter decisions: scope of BE-YAC's CASE-904 fix (platform side); whether to start the unit tests.
