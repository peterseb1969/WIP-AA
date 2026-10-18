## 722723e — feat(chapters): drag and drop to reorder chapters, undoable
**Time:** 16:01
**Files:** 7 files changed, +311/-84
**Tests:** tsc clean; browser on scratch ns dev-aa-chdnd (deleted after), real mouse drags: Chapters page A→after C, then D→top (second drag right after a drop), plain click still expands, history labels "Chapter D → Ch. 1", Undo restores; scripted pointer events: drop line position, Escape cancels with no write. Corkboard: heading drag to top and to end (empty chapter), no-op drop on own slot, card drag Scene 5 → before Scene 3 (refactored code path), plain card click opens the scene.
**What:** moveChapter in useStructureEditor; shared startPointerDrag helper (capture-phase click swallow replaces per-card consumeClick); chapter drag on Chapters page rows and Corkboard headings; en/de strings. ROADMAP: Image support ToDo added.
**Why:** Peter's ToDo (ROADMAP Next Up #1) and request to record Image support.

## f569c4f — data-model: AA_MEDIA + AA_ATTACHED_TO edge type + AA_MEDIA_ROLE
**Time:** 18:05
**Files:** 8 files changed (seeds, data-model mirror, bootstrap mapField, constants)
**Tests:** scratch ns dev-aa-media: bootstrap accepted all three; file-as-identity dedup (same file → updated, same id); edges create, re-post updates (identity source+target), wrong direction rejected; relationships?include=peers returns header fields; detach (DELETE) hides, reattach reactivates same id; proxy download byte-identical. Payload equivalence: re-post to scratch → all unchanged; then applied to aa (created; aa 146 docs unchanged).
**What:** Generic file attachment model, approved by Peter.
**Why:** Image support ToDo; generic so sound files fit later.
**PoNIF:** #7 (edge type = template with usage relationship); #3 (file field as identity → WIP's content-dedup of uploads gives one media doc per image); #1 (detached edges are soft-deleted; re-attach reactivates).
**Discovered:** wip-local had no MinIO container (being switched to garage by Peter); after the switch uploads work. WIP dedups uploads by content (same bytes → same file_id). MCP upload_file returned an empty error while storage was down.

## 3cfc29f — feat(media): images on characters, locations, plot threads and scenes
**Time:** 18:34
**Files:** 12 files changed, +~700
**Tests:** tsc clean; browser on dev-aa-media (deleted after): upload 2 → first becomes Portrait, header avatar; 85/149 KB uploads; lightbox arrows/Escape; edit title/role/caption; detach; "From the book" re-use on a location with its own role; scene editor Images tab + upload of an already-stored file reuses the media doc (still 6 docs); portrait avatars on Characters list, Corkboard, scene Characters tab. Not tested: drop of OS files onto the section (not drivable by the test tool), Plot Thread page (no thread in scratch data), German UI.
**What:** media.ts (hooks, own upload), MediaSection (grid, lightbox, edit, picker, Avatar), page integration, en/de strings; KNOWN_ISSUES + ROADMAP.
**Why:** Peter's image-support scope: images only, inline prose images later.
**Discovered:** @wip/client FetchTransport sets keepalive:true on every request → browser rejects bodies > 64 KB ("Failed to fetch"). Affects every write, incl. scene saves of very long scenes (largest aa scene 13.5 KB today). Not yet reported upstream. Range requests through the proxy return 200 full body (matters for audio seeking later).

## e4246e6 — feat(media): images on chapters, notes, world rules; image library
**Time:** 18:48
**Files:** 12 files changed, +553/-73
**Tests:** tsc clean; browser on scratch ns dev-aa-lib (retain mode like aa; flipped to full and deleted after): library upload without attaching; note toggle + attach from book; world-rule toggle + upload (re-used existing media); chapter expanded row + attach; library usage chips, "Not attached" filter; Delete permanently of an image attached in 2 places → edges gone, media retired, file content + metadata 404. API test first: hard delete refused while referenced ("Only inactive files can be hard-deleted"); re-upload of the same bytes after a hard delete gets the same file_id and reactivates the old media doc.
**What:** MediaToggle, generic EditDialog/Lightbox, MediaLibraryPage + route + nav, useMediaUsage/useMediaLibrary, en/de strings.
**Why:** Peter: continue with chapters, notes, world rules; library page with a true delete.
**PoNIF:** #4 (bulk delete of edges checks per-item results before erasing the file); #1 (retain mode: documents retired, not erased).
**Discovered:** relationships endpoint resolves a bare `template=` value without honouring `namespace=` (picked aa's AA_ATTACHED_TO from a scratch namespace) — app now passes ns:VALUE; recorded in KNOWN_ISSUES, not reported. CASE-899 filed for the @wip/client keepalive bug.

## 41544b6 — data-model: chapter numbering rules on AA_CHAPTER_SLOT (v2)
**Time:** 21:55
**Files:** 3 files changed (slot seed + data-model mirror, bootstrap version pinning)
**Tests:** fresh bootstrap (slot v1 with new fields, structure pinned 1); upgrade rehearsal on a hand-built v1 namespace (slot v2, structure v2 pinned 2, migrate dry-run/apply 1/1, v1s deactivated, PATCH with number_start/unnumbered ok, create via latest ok, wrong type rejected); aa: v1 seeds re-posted → unchanged (aa matched), upgrade, migrate 1/1 (structure doc v46 on template v2, 13 slots), v1s deactivated.
**What/Why:** Peter chose option C (numbering rules on the structure, computed numbers).
**PoNIF:** #2 (update ≠ replace: deactivated v1s explicitly; migrate_documents to re-pin); nested template version pinning (CASE-493) — bootstrap now pins the version created in the same run.
**Discovered:** deactivating AA_BOOK_STRUCTURE v1 after migration still reports "1 dependent document" (the doc's own inactive v1 row); force was safe after checking the live doc is on v2. Template upsert's migration hint says "not eligible" for a pin-only change, yet the migrate dry-run passes. AA's bootstrap has no SEED_DIR override (module-relative seed path).

## 9d7c862 — feat(chapters): numbering rules; number-only titles show the computed number
**Time:** 22:41
**Files:** 10 files changed
**Tests:** tsc clean; tsx check of title regexes + displayNumberAfterMove; browser on scratch ns (deleted after): Prologue → no number (–, 1..4), restart at 10 (–,1,2,10,11), drag 2nd chapter to end (–,1,10,11,12; rule travels), undo history back to before the restart (–,1,2,3,4), Corkboard groups/filter/cards, Timeline by chapter, scene list, editor header/breadcrumb/footer ("Ch. 10"), German strings.
**What:** getDisplayNumber(+ForScene), NumberingRule/ruleOf/setNumbering (undoable), displayNumberAfterMove, titles.ts (chapterTitleShown, sceneTitleShown, chapterLabel), Numbering dialog, display sites on Chapters/Corkboard/Scenes/Dashboard/Timeline.
**Why:** Peter: option C + display-only handling of number-only titles.
**Discovered:** Corkboard keyed groups by label — two untitled unnumbered chapters would collide; now keyed by chapter id. With the ChN prefix hidden, scenes in different chapters can read identically ("Scene 1") in flat/character views.

## c3e84cb — feat(analysis): render Claude's answers as formatted Markdown
**Time:** 23:00
**Files:** 6 files changed (incl. package.json/lock: +react-markdown, +remark-gfm; 98 packages added, none removed or changed)
**Tests:** tsc clean; vite build ok; browser on scratch ns dev-aa-md with /api/analyse and /api/ask stubbed in-page: headings, bold/italic, nested lists, blockquote, table, link (target _blank, rel noopener), inline code, hr, strikethrough render; embedded <script>/<b> shown as text (0 script/b elements). Deployed container: deps installed into its node_modules volume first; Vite logged "new dependencies optimized … reloading", module serves 200.
**What/Why:** ROADMAP Next Up "Render analysis results as Markdown"; Ask bar answers too (same Claude Markdown).
**Discovered:** Adding an npm dependency while the dev container bind-mounts the tree breaks the live app until its node_modules volume has it — `podman exec wip-wip-aa sh -c 'cd /app && npm install'` first, then update node_modules/.wip-lock-hash. At 22:59 all WIP containers disappeared (redeploy in progress, not caused here); dev-aa-md namespace delete failed with 502 — retry later.

## fc96e42 — feat(merge): merge characters, locations and plot threads
**Time:** 23:31
**Files:** 10 files changed
**Tests:** tsc clean; browser on scratch ns dev-aa-mrg (retain mode; deleted after): LOVELACE→ADA with references in every field (scene lists incl. label spelling "Lovelace", suppressed suggestion, chapter POV, plot thread, note, world rule, Babbage's relationships, image) — preview counts matched, all rewritten, backstory filled, description/role kept, self-relationships dropped, duplicate relationship collapsed, image moved, LOVELACE doc retired + term deleted, aliases LOVELACE/Lovelace/Augusta on ADA, scene check 1 suggestion (correct). Plot threads (checkbox path) and locations merged the same way. Reordered aliases-before-retire, retested CHARLES→BABBAGE: alias accepted while CHARLES term still existed.
**What/Why:** Agreed merge design (A, fields b, no undo, all three kinds); CASE-904 answered: app-side rewrite confirmed, write canonical names.
**PoNIF:** #3 (identity = term-resolved name: survivor's doc keeps its identity; absorbed docs retired not re-posted); #4 (bulk results checked: single-item client calls throw on per-item errors).
**Discovered:** CASE-904 response: document-store's cached term lookup includes deprecated/inactive terms indefinitely (TTL 300 s, refetch on miss only); term hard-delete leaves Registry entry (re-created value reuses the old id).
