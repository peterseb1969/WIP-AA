---
session_id: APP-AA-20261017-150822
role: APP-AA
started_at: 2026-10-17T15:08:22
status: active
continues_from: APP-AA-20260705-184654
---

# Session APP-AA-20261017-150822

Continues from APP-AA-20260705-184654 (via /wip-wake).

**App:** AuthorAssist · **Phase:** 4 complete → /wip-improve mode · **Namespace:** `aa`

## Tasks
- [x] Wake + context recovery
- [x] Get the app running under wip-deploy --app-source (path-case + stale-Caddy issues; Peter redeployed)
- [x] Bump client libs to latest (client 0.60.0 / react 0.20.0 / proxy 0.5.1)
- [ ] Merge CLAUDE.md.refresh
- [ ] Add `/api/app-config` route (deploy-contract gap)
- [ ] vite.config.ts SERVER_PORT fallback '3002' → '3014'

## Session Summary
**Duration:** 2026-10-17 15:08 – 2026-10-18 13:07
**Commits:** 24 (+ this report commit)
**Lines:** +2300/-336 (excluding libs, lockfile, reports)
**Phase:** /wip-improve
**What happened:** Woke a three-month-old session, got the app running under wip-deploy (lowercase /users path, stale Caddy, wrong URL /apps/wip-aa → /apps/aa), bumped the client libs to client 0.60 / react 0.20 / proxy 0.5.1 and committed long-pending scaffold-refresh residue. Closed the deploy-contract gaps (/api/app-config, SPA reads its namespace at boot, AA ports), ported the bootstrap to AA_BOOTSTRAP_RECORD with an incomplete/resume state (legacy record still accepted so live `aa` stays ready). Synced KNOWN_ISSUES/ROADMAP, fixed the real split-scene data loss (title identity collision), showed the first-load editor bug is not reproducible, added alias-collision warnings. Then shipped all six roadmap backlog features (project editing, resizable panel, relationships, "Appears in" cross-references, Corkboard drag-and-drop, Analyse + prompt library) with Peter-approved data-model changes (AA_PROMPT, AA_PROMPT_CONTEXT, AA_NOTE.linked_plot_threads) applied to `aa`. Everything was tested in a browser against throwaway dev-* namespaces; `aa` was only read, except for the approved model change.
**WIP interactions:** (1) Scaffold bootstrap template has no legacy-BOOTSTRAP_RECORD fallback — pre-prefix namespaces read as incomplete (not filed). (2) Reporting entity view doc_<value> carries only columns shared by all template versions — BY DESIGN (reporting_sync models.py CrossVersionView, schema_manager._shared_columns; opt-in via reporting.cross_version_view). I first called it a platform bug; a fresh-namespace repro + the source corrected that. Docs gap: wip://conventions doesn't mention it. (3) @wip/react useReportQuery option type requires queryKey though its own doc example omits it. (4) add-app retry after a half-applied failure left Caddy unreloaded (Peter: ignore).
**Unfinished:** Analyse never saw a real Claude response (no key locally). Rename-through-Edit creates duplicates (Next Up). main.tsx app-config error screen unverified. Not pushed: commits after c9dc20a.
**For the next YAC:** Read KNOWN_ISSUES + ROADMAP first — both are current as of this session. Test rig that works: scratch namespace with deletion_mode=full, local `npm run dev` with env (WIP_API_KEY from the key file, WIP_NAMESPACE, PORT 3015, VITE_PORT 5181), seed via scratchpad-style script or MCP, drive with claude-in-chrome; the test browser window is stuck at 547px (md+ UI needs synthetic events) and automated mouse drags don't fire HTML5 DnD (dispatch DragEvents). Before trusting a KNOWN_ISSUES root cause, date the entry with `git log -S` — entries here were older than the code.
