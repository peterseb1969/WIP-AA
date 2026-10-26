---
session_id: APP-AA-20261021-181514
role: APP-AA
started_at: 2026-10-21T18:15:14
status: closed
ended_at: 2026-10-26T23:37:06
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

## Session Summary — continuation 2026-10-24 to 2026-10-26
Peter had this ID adopted for the work after the close on 2026-10-23: a `/clear` started a new conversation without `/wip-wake`, so no new ID was minted. The summary above covers 2026-10-21 to 2026-10-23 and is unchanged.

**Duration:** 2026-10-24 ~20:30 – 2026-10-26 23:37
**Commits:** 13 (174f5b4 … 7d11498), all pushed to gitea and GitHub
**Lines:** +3213/-278 (66 files)
**Phase:** 4 / improve

**What happened:**
- **Test novel and first real import.** Peter asked for a longer test novel. I wrote *The Crumbs of Meridian Tower*, replaced the demo book in `aa` with it, and drove the real AI import in Peter's Chrome.
  - The extraction's duplicates were cleaned up in the review step, by script (18/43/39 → 11/14/8).
  - The run showed that the import stored prose as plain text: one paragraph per scene. Fixed (CASE-937, implemented), and aa's 25 scenes were converted.
- **Scene editor.** The arrows cross chapter boundaries, and each scene opens at its top.
- **Export page.** PDF print view, Word (manuscript format or reading copy), EPUB, Markdown and plain text (both import again unchanged), and a story bible. That surfaced the import merge's doubled full stops: fixed in code, and 18 aa entries repaired.
- **Scaffold refresh.** Peter ran it on 2026-10-26. It revealed that WIP had dropped the `archived` status, which broke Delete book and Split in the running app; fixed. It also brought `@wip/client` 0.63 and `@wip/react` 0.23 and the resume guard (ported); CLAUDE.md was merged selectively.
- **Cases.**
  - CASE-602: re-assessed and responded (#1). The proposed tag is stale, there is no wip-kb key-file pattern to copy, and `DEV_ALLOWED_HOSTS` is missing.
  - CASE-893: adoption comment (#4).
  - FIRESIDE-34 (CASE-926/930 synonym design): read.

**WIP interactions:**
- The podman VM hung twice and was later reconfigured (8 → 24 GiB). The VM was not touched.
- WIP removed the `archived` document status with no notice reaching AA; queries with it answer 422.
- A new npm dependency kills the bind-mounted dev server until the container restarts (the CASE-721 pattern).
- `kind: App` storage support is unknown (asked in CASE-602#1).

**Dead ends:**
- **Claude in Chrome:**
  - Two other machines had the extension connected (a Mac mini, and a MacBook asleep).
  - On the Mac Studio, the extension worked only after Peter signed in to the extension there.
  - `list_connected_browsers` does not say which machine a browser is on; ask Peter.
- **Committing a scaffold refresh:** `git add` of the library tarballs silently drops them (`*.tgz` is ignored); use `git add -f`.
- **Re-saving locale JSON:** writing it with `json.dump` re-escaped unrelated strings; insert keys textually.

**Unfinished:**
- The server still ignores `WIP_API_KEY_FILE` (KNOWN_ISSUES).
- Export follow-ups (ROADMAP): choosing chapters, leaving out drafts, a table of contents with page numbers in the PDF.
- CASE-602 waits on BE-YAC (storage question, fresh image build).
- CASE-926 and CASE-930 are still open on the platform side. After CASE-926, the demo can use "Low Water" as a scene title again (`server/demo/book.ts:394`).
- Not checked: the Word files in Word or Pages, and the EPUB with epubcheck.
- The scene editor still loads at most 200 scenes (latent).

**For the next YAC:**
- **Start with `/wip-wake`**, so you get your own ID.
- **The live book.** `aa` holds the mouse novel (12 parts, 25 scenes), not the demo; "Delete book" plus "Load the demo book" swaps it back.
- **Export code.** It lives in `server/lib/export/`; `src/lib/bookStructure.ts` and `titles.ts` are shared with the server and must stay import-free (the Dockerfile copies only those two).
- **Dependencies.** After adding one, run `podman restart wip-wip-aa`.
- **Bootstrap.** It now refuses resumes on namespaces with documents (`resume_blocked`).
