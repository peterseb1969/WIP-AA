---
session_id: APP-AA-20261017-150822
role: APP-AA
started_at: 2026-10-17T15:08:22
status: closed
ended_at: 2026-10-18T15:09:51
continues_from: APP-AA-20260705-184654
---

# Session APP-AA-20261017-150822

Continues from APP-AA-20260705-184654 (via /wip-wake).

**App:** AuthorAssist · **Phase:** 4 complete → /wip-improve mode · **Namespace:** `aa`

## Tasks
- [x] Wake + context recovery; get the app running under wip-deploy (--app-source)
- [x] Client libs → @wip/client 0.60.0 / @wip/react 0.20.0 / @wip/proxy 0.5.1; scaffold refresh committed
- [x] Deploy contract gaps: /api/app-config, SPA reads its namespace at boot, ports 3014/5180
- [x] Bootstrap port: AA_BOOTSTRAP_RECORD, incomplete state + idempotent resume (legacy record accepted)
- [x] Bugs: split overwrote "(continued)" scenes; alias collisions; first-load editor (not reproducible)
- [x] Roadmap 1–6: project editing, resizable panel, relationships, "Appears in", Corkboard DnD, Analyse + prompt library
- [x] Approved model change on `aa`: AA_PROMPT, AA_PROMPT_CONTEXT, AA_NOTE.linked_plot_threads (v2, v1 deactivated)
- [x] Peter's follow-ups: draft banner, move scenes between chapters, undo (top bar + history), pointer drag, Move dialog, autosave + Save, merge scenes
- [x] Regressions found + fixed: split vs autosave, phantom drafts, stale editor after undo
- [ ] Next Up (ROADMAP): chapter drag-and-drop, chapter renumbering (open design Q), merge characters/locations, Markdown analysis, rename without duplicates

## Session Summary
**Duration:** 2026-10-17 15:08 – 2026-10-18 15:09
**Commits:** 49 (all pushed; origin/master = 1dfeb97 + this report commit)
**Lines:** +3466/-459 (excluding libs, lockfile, reports)
**Phase:** /wip-improve (Phase 4 complete), plus one approved data-model change

**What happened:** Woke a three-month-old session, got AA running under `wip-deploy` (lowercase `/users` path broke the podman mount; stale Caddy; the URL is `/apps/aa/`, not `/apps/wip-aa/`), bumped the libs and committed long-pending scaffold residue. Closed the deploy-contract gaps and ported the bootstrap to the prefixed `AA_BOOTSTRAP_RECORD` with an incomplete/resume state. Then a long improvement run driven by Peter's feedback: all six roadmap backlog features, the prompt library + Analyse (with Peter-approved templates applied to `aa`), and a second wave of UX work — undo (structure moves and merges, top-bar icons + history), a Move dialog, pointer-based Corkboard drag, autosave with an explicit Save, merge scenes. Every feature was browser-tested against a throwaway `dev-*` namespace (deleted afterwards); `aa` was only read, except for the approved model change.

**Current state of the app (all live, all pushed):**
- Scene editor: Save button = status (Save / Saving… / Saved HH:MM / red "Not saved — retry"); autosave 45 s idle, max every 5 min, on leave, on hidden tab; Cmd/Ctrl+S; prose-only PATCH. Toolbar: Split, Merge (dialog: prev/next in chapter, keep whose details), Move (dialog: chapter + position), Validate, Analyse (✨ prompt menu → Analysis tab). Resizable side panel.
- Book structure edits all go through `useStructureEditor()` (src/lib/useBookStructure.ts): moveScene / removeScene / addChapter, creating AA_BOOK_STRUCTURE if a book has none. Undo lives in `src/lib/structureUndo.tsx` (context above the router, sessionStorage-persisted, if_match-guarded; merge entries also re-create the removed scene and restore the kept one).
- Corkboard: pointer-based drag (not HTML5 DnD), unassigned scenes draggable, empty chapters droppable.
- Unsaved-draft reminder: top-bar icon only when a save failed; self-cleans drafts identical to WIP.
- Detail pages: "Appears in" cross-refs (reporting SQL on `data_json`), relationships editor, alias-collision warning. Dashboard: project create/edit. Prompt Library at /prompts.

**Dead ends / corrections (don't repeat):**
- Synthetic DragEvents can't prove HTML5 DnD works — they bypass the browser's drag session; that hid the "can't drag after a drop" bug. Real mouse drags (claude-in-chrome `left_click_drag`) drive pointer events, so the pointer-based drag is testable.
- The reporting entity view `doc_<value>` carries only columns shared by ALL template versions — by design (reporting-sync `CrossVersionView` / `_shared_columns`), not a bug; I first called it a platform bug. Query `data_json` instead.
- KNOWN_ISSUES entries were older than the code they described; date them with `git log -S "<text>" -- KNOWN_ISSUES.md` and reproduce before trusting a recorded root cause.
- I wrongly stopped twice at ~70% context; Peter decides when to stop (memory: feedback_no_self_stop).
- I first gave the wrong app URL and initially claimed a Vite port mismatch that wasn't one (both defaulted to 3002).

**WIP interactions / findings:**
- No document-restore endpoint, but re-creating a document with a soft-deleted one's identity REACTIVATES it (same document_id, new version). Merge undo relies on this.
- Scaffold bootstrap template has no fallback for pre-prefix `BOOTSTRAP_RECORD` namespaces (they'd read as incomplete) — not filed.
- `wip://conventions` doesn't mention the entity-view intersection rule — docs gap, not filed.
- `@wip/react` `useReportQuery`'s option type wrongly requires `queryKey` (its own example omits it).

**Unfinished:** ROADMAP Next Up — chapter drag-and-drop; chapter renumbering (needs Peter's choice: renumber titles vs a new `number` field on AA_CHAPTER — titles are identity, see rename problem); merge characters/locations; render analysis Markdown; rename without duplicates. Untested: the red failed-save state; main.tsx app-config error screen. The Settings Anthropic key on the deployed app is a non-persisted runtime override.

**For the next YAC:**
1. Read ROADMAP.md (Next Up) and KNOWN_ISSUES.md first — both current as of this summary.
2. The deployed dev container bind-mounts this working tree with HMR: every file save is live in Peter's browser immediately. Say so when Peter is testing while you edit.
3. Test rig that works: `PUT` a scratch namespace `dev-aa-<x>` with `deletion_mode: full`; run `WIP_API_KEY="$(cat <key file>)" WIP_NAMESPACE=dev-aa-<x> PORT=3015 VITE_PORT=5181 WIP_BASE_URL=https://localhost:8443 npm run dev` in the background; `POST :3015/server-api/bootstrap/run`; seed with a small script (I used one creating 2 chapters / 3 scenes / 2 characters / location / thread / structure); drive with claude-in-chrome; delete the namespace after. The test browser is ~1170px wide now (earlier 547px); md+ UI may need synthetic events.
4. Never iterate on the model in `aa` (live, ~140 docs, retain mode). Model changes need Peter's approval; apply via payloads built from `server/seed` with the bootstrap's field mapping, and deactivate superseded template versions.
5. Any new structure edit should go through `useStructureEditor()` so it gets undo; anything that writes a scene's prose must hold off autosave (`savingRef`, `idleTimerRef`) like split/merge do.
