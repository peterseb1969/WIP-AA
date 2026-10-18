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
