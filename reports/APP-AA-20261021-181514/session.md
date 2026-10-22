---
session_id: APP-AA-20261021-181514
role: APP-AA
started_at: 2026-10-21T18:15:14
status: closed
ended_at: 2026-10-23T01:37:40
continues_from: APP-AA-20261021-180404
---

# Session APP-AA-20261021-181514

Continues from APP-AA-20261021-180404 (via /wip-wake).

## Session Summary
**Duration:** 2026-10-21 18:15 – 2026-10-23 01:38 (one context window)
**Commits:** 34 (ac98a47..HEAD), +3398/-588 across 76 files
**Phase:** 4, /wip-improve: testing, fixes, demo book, Delete book
**What happened:** Started from Peter's "make sure e2e testing is solid": the suite could not run (key path still pointed at the renamed wip-local install), so configs now read `.env`, the watcher records failed requests, and every spec takes per-pass names so `--repeat-each=3` runs clean. Repeat runs and new tests found real bugs: split → merge → split revived a retired scene (title check saw active only); a save on leaving a scene could land after a later Cmd/Ctrl+S and overwrite it (prose writes now queued per scene); the import folded prologue/interlude/epilogue/front matter into neighbouring scenes and "Reset & import fresh" never cleared names (CASE-928, filed + implemented); Dashboard Recent Scenes printed term values. Tech debt cleared (as-any casts, Vite allowedHosts, bundle 1.26 MB → 443 kB via lazy pages, app-config error screen tested). Built a demo novel ("The Lantern Keeper's Tide") with a CLI loader and an in-app "Load the demo book" (empty books only), then "Delete book" as one full hard delete (books in deletion_mode full; aa switched with Peter's approval). Closed every ROADMAP e2e gap except automatic runs: 53 tests in 18 specs, 161 passed over 3 passes, unit 129.
**WIP interactions:** CASE-925 (containers after VM start: `wip-deploy start` vs `up`; reporting-sync no retry; postgres healthcheck db "wip"), CASE-926 (scene titled like a chapter refused), CASE-927 (recreated namespace resolves ns:VALUE to deleted entries; hit aa after Peter deleted/re-bootstrapped it, cleared after ~5 min; fix underway), CASE-930 (retired identity blocks re-creation after its name term was re-created). Peter corrected scope once: the AA YAC strayed into deployer/VM diagnosis (memory `stay-in-app-lane`).
**Unfinished:** running the e2e suite automatically (Peter deferred); server ignores WIP_API_KEY_FILE (bare `npm run dev` fails); .dockerignore `*.md` drops server/prompts/assistant.md from the image (not in KNOWN_ISSUES yet); scene list capped at 200; CLAUDE.md.refresh left unmerged on purpose; scratch namespaces aa-demo-book and aa-demo-app still exist (Peter not asked to delete yet).
**For the next YAC:** Read KNOWN_ISSUES and ROADMAP first, both current. Run e2e in the background (`npx playwright test`, ~1.5 min; `--repeat-each=3` ~4.5 min) after `nc -z localhost 8443`; it starts two app instances (3016/5182 main, 3019/5184 import/demo/delete). Never title a test chapter like any spec's scene (CASE-926). Stop stray dev instances by their `tsx watch` PID, not by port. Both remotes push over SSH from the agent shell (memory `git-remotes`). After a podman VM restart, `wip-deploy up`, not `start`.

