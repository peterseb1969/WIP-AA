# Commits — APP-AA-20260705-184654

## a13c40d — libs: bump @wip/client 0.30.0, @wip/react 0.17.0, @wip/proxy 0.4.1
**Time:** 01:13
**Files:** 11 changed, +143/-408
**Tests:** tsc --noEmit clean; vite build clean (no test suite run)
**What:** Scaffold refresh from World-in-a-Pie develop (860d4395) shipped the new versioned lib tarballs; pins + lockfile rewritten by the refresh, new tarballs force-added (`.gitignore` has `*.tgz` but bundled tarballs are deliberately tracked per the deployable-app contract).
**Why:** CASE-632/CASE-633 — client/react now expose the `namespace` option on runQuery/useReportQuery for per-namespace reporting schemas. AA has no runQuery call sites, so this is staying current, not a required fix.
**Discovered:** New tarballs silently skipped by `git status` because of the `*.tgz` gitignore line — easy to commit a broken `file:` pin (package.json referencing a tarball absent from the repo) if you don't `git add -f`.

## 9161f26 — libs: bump @wip/proxy 0.4.2
**Time:** 01:57
**Files:** 5 changed, +7/-5
**Tests:** tsc --noEmit clean; vite build clean (no test suite run)
**What:** Second refresh in the session — World-in-a-Pie develop advanced to ed2a4953 with wip-proxy 0.4.2; client 0.30.0 / react 0.17.0 unchanged (refresh rewrote identical bytes, no git delta).
**Why:** Peter asked for latest libs again; the CASE-637 proxy fix (regex prefix mount on both Express peer majors) had landed since commit a13c40d.
