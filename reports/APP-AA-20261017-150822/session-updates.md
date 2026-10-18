# Session Updates — APP-AA-20261017-150822

## 15:45 — wip-deploy bring-up: two traps, both operator-side
`wip-deploy add-app ... --app-source /users/peter/...` (lowercase u) builds fine (macOS FS is case-insensitive) but fails at container start: the podman VM mount is case-sensitive → `statfs ... no such file or directory`, and the bad path is persisted into docker-compose.yaml (CASE-455 partial-apply). After the corrected retry, the Caddyfile on disk had the `/apps/aa/*` route but wip-caddy had not reloaded (started 15:02, Caddyfile mtime 15:33) → every `/apps/*` path returned an empty 200 from Caddy's catch-all. Peter's full redeploy fixed it. Also: the app's URL is `/apps/aa/` (APP_BASE_PATH), not `/apps/wip-aa/` — I gave the wrong URL first. Possible BE-YAC case (add-app retry doesn't reload Caddy) — not filed, unconfirmed root cause. Contract gaps found: no `/api/app-config` route; vite.config.ts SERVER_PORT fallback is '3002'; Vite 6 allowedHosts would 403 non-localhost ingress hosts. CLAUDE.md names `dev-authorassist` as dev namespace but the app actually lives in `aa`.

## 16:03 — open-issue sweep done; scratch-namespace test pattern
Implemented app-config on the SPA side and the bootstrap port. Test pattern worth reusing: start a second server inside the running dev container with `podman exec -d -e WIP_NAMESPACE=<scratch> -e PORT=3099 wip-wip-aa sh -c 'npx tsx server/index.ts'` and drive /server-api/bootstrap/* against a deletion_mode=full scratch namespace — exercises bootstrap paths without touching `aa`. Kill by PID (pkill -f on env vars doesn't match). Gate the UI path stays unverified in a browser.

## 16:23 — three bugs worked; two lessons
(1) KNOWN_ISSUES entries can be older than the code they describe: both bug entries were written at 13:26 on 2026-04-04, before 99f5a3e (17:24) rewrote split and dirty detection. I first told Peter split was "probably still broken" because a *later commit touched the file* — wrong inference; `git log -S "<entry text>" -- KNOWN_ISSUES.md` dates the entry itself. Always reproduce before trusting a recorded root cause. (2) Browser click-through found a regression (empty gate label) that tsc, build and HTTP checks all passed. Local repro rig that worked well: `WIP_API_KEY=$(cat keyfile) WIP_NAMESPACE=<scratch> PORT=3015 VITE_PORT=5181 WIP_BASE_URL=https://localhost:8443 npm run dev` (env beats .env via dotenv), create the scratch namespace bare with deletion_mode=full (also exercises the gate's incomplete → resume path), seed via MCP, drive with claude-in-chrome, delete namespace after.

## 16:33 — roadmap features 1-6 in progress (3 of 6 done)
Peter asked for roadmap backlog items 1-6, order my choice. Done + committed: project editing (991d1ea, also fixes the shared edit modal dropping every field the form doesn't show), resizable scene panel (9f0db22), relationship add/remove (4dd4da2). Remaining, in order: cross-entity stats (useReportQuery, now available in @wip/react 0.20.0), corkboard drag-and-drop reorder (native HTML5 DnD, writes AA_BOOK_STRUCTURE), then Analyse + prompt library — needs Peter's approval of an AA_PROMPT template before anything is created in WIP. Also to raise with Peter: live `aa` AA_NOTE lacks `linked_plot_threads` (seed lost the v2 field; notes with plot-thread links fail with unknown_field) — additive template fix needs his OK. Known, not fixed: renaming any entity via Edit creates a duplicate (identity = name/title) — to record in KNOWN_ISSUES. Test rig: scratch namespace `dev-aa-feat` (deletion_mode full) seeded by scratchpad seed_feat.py, local server on 3015/5181 (background task); delete the namespace when done. The browser test window can't be resized past 547px, so md+ layouts need synthetic-event tests.

## 13:07 — roadmap 1-6 done
All six backlog features shipped (commits 991d1ea..36a81de) and verified in a browser on scratch namespace dev-aa-feat (deleted). Live aa changed only by the approved model change (AA_PROMPT, AA_PROMPT_CONTEXT, AA_NOTE v2 / v1 deactivated). Open: real Claude response for Analyse untested (no key); rename-creates-duplicate bug now Next Up; reporting entity-view column lag worth a BE-YAC case (Peter to decide).

## 13:41 — Analyse verified with a real key; "platform bug" was by design; Peter's ToDos recorded
Peter set an Anthropic key on the deployed app (runtime override, not persistable). Style Polish via the container's /api/analyse on a real aa scene (read-only): German, 10 suggestions, ~17 s, Markdown output (plain-text rendering is now a ToDo). The reporting entity-view "lag" is WIP's documented intersection-of-columns design (cross_version_view opt-in) — reproduced on a fresh namespace, then found the design in reporting_sync source; corrected KNOWN_ISSUES and the CrossReferences comment. Lesson: read the platform source before calling a platform bug. Peter's ToDos (ROADMAP Next Up): draft banner must not shift the editor; move scenes between chapters (incl. unassigned scenes, Corkboard DnD); merge characters/locations any time.

## 13:51 — Peter's ToDos 1 and 2 done (9032443, 53225aa)
Remaining Next Up: merge characters/locations, Markdown rendering for analysis, rename-without-duplicates. Context ~65%: next YAC should start from ROADMAP/KNOWN_ISSUES + this report.

## 14:10 — undo shipped; remaining agreed work for the next session
Undo done (fc53046). Next Up order: Move dialog (replaces the chapter <select>; record moves via useStructureEditor.moveScene(scene, chapter, before, label) so undo comes free), then autosave + explicit Save (spec in ROADMAP), then merge, Markdown, rename. Context ~70%: stop here.

## 14:18 — Peter: undo must persist across pages; bug "can't move a scene twice"; stopping at ~72% context
(1) Undo rework IN PROGRESS, UNCOMMITTED, UNTESTED: src/lib/structureUndo.tsx now keeps the stack in state + sessionStorage and exposes it; StructureUndoControl in the Layout top bar shows "Undo: <last move>" (+N) whenever something can be undone; Cmd/Ctrl+Z on any page outside text fields; no toast. tsc passes. Next: browser-test (move → navigate → undo; reload → undo; conflict), then commit. (2) Bug report "I cannot move a scene I moved once" — recorded in KNOWN_ISSUES with the aa structure version history (moves do reach WIP; UI-side failure). Need Peter's exact steps. (3) Peter said the chapter picker "seems unchanged" — correct: the Move dialog was deferred, not started. (4) IMPORTANT for any YAC: the deployed dev container bind-mounts this working tree, so every file save is live in Peter's browser immediately.

## 14:24 — undo rework committed; move bug not reproduced
Undo is now icons-only in the top bar + a history list (click a state to return to it), persisted in sessionStorage. The "can't move twice" report did not reproduce on either surface. Next session: Move dialog, autosave (ROADMAP Next Up).

## 14:32 — "can't move twice" was "can't drag ANY card after a drop": native HTML5 DnD; replaced with pointer drag
Peter's clarification: after one move no other card could be dragged; mouseup became a click (opened the editor). Cause: HTML5 DnD on <a> cards + re-render of the dragged card during the save left Chrome's drag session hanging. Replaced with pointer-based drag (61f303a); verified with REAL mouse drags (the claude-in-chrome left_click_drag produces pointer events — it could never drive native DnD, which is why earlier tests used synthetic DragEvents and missed the bug). Lesson: synthetic events that bypass a browser subsystem can't prove that subsystem works. Also: Peter — never stop on my own at high context (memory saved).

## 14:36 — Move dialog shipped (1046dfe)
Next Up now: autosave + explicit Save (spec in ROADMAP), merge characters/locations, Markdown analysis, rename without duplicates.

## 14:42 — autosave shipped (38b0460); Peter added chapter DnD + renumbering ToDos
Renumbering has an open design question (title numbers vs a number field; title = identity) — recorded in ROADMAP.

## 14:46 — split/autosave regression fixed (f38f551)
Save-on-leave rewrote the full text over a split's first half when the editor had unsaved edits. Fixed + verified. aa's only split (Ch1 Scene 1, 14:37) is intact. Peter's "odd chapter splitting" may be something else — asked for specifics.
