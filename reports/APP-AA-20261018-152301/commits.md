## 722723e — feat(chapters): drag and drop to reorder chapters, undoable
**Time:** 16:01
**Files:** 7 files changed, +311/-84
**Tests:** tsc clean; browser on scratch ns dev-aa-chdnd (deleted after), real mouse drags: Chapters page A→after C, then D→top (second drag right after a drop), plain click still expands, history labels "Chapter D → Ch. 1", Undo restores; scripted pointer events: drop line position, Escape cancels with no write. Corkboard: heading drag to top and to end (empty chapter), no-op drop on own slot, card drag Scene 5 → before Scene 3 (refactored code path), plain card click opens the scene.
**What:** moveChapter in useStructureEditor; shared startPointerDrag helper (capture-phase click swallow replaces per-card consumeClick); chapter drag on Chapters page rows and Corkboard headings; en/de strings. ROADMAP: Image support ToDo added.
**Why:** Peter's ToDo (ROADMAP Next Up #1) and request to record Image support.
