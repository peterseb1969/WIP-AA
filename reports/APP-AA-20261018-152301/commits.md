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
