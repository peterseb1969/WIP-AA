## 948a8d7 — docs(roadmap): test plan adopts RC's e2e pattern (fireside 32)
**Time:** 00:21
**Files:** 1 file changed, +16/-1
**Tests:** not run (docs only)
**What:** ROADMAP's Test coverage entry gains a "How layers 2 and 3 are built" section adapted from RC's Playwright suite (kb fireside 32): disposable aa-e2e-* namespace per run, UI drives / API checks, per-item-checked fixtures, eventually(), import-shaped seed data, twin namespace, fail-on-old-code, probe-before-assert, role/label selectors; Analyse/Ask/AI extraction excluded.
**Why:** Peter asked to fold fireside 32 into the plan before starting the tests.
**Discovered:** AA can't copy RC's "test through the router" principle: the dev container behind /apps/aa is pinned to WIP_NAMESPACE=aa (live book), so tests must drive a second app instance (Playwright webServer, own ports, run namespace).

## 691c39b — test: Vitest unit tests for titles, chapter numbering and names; fix 'Child' read as a number
**Time:** 00:27
**Files:** 10 files changed, +738/-49 (incl. package-lock)
**Tests:** 62 passed (npm test); tsc clean; vite build ok; mutation check: dropping number_start, ignoring unnumbered, the no-op drop guard, alias-before-value precedence and term-id matching in same() each fail 1–6 tests; live aa Characters list + Lady Linora Thalyn page ("Appears in" 1 scene) render with no console errors.
**What:** Vitest 4.1.11 + npm test/test:watch + vitest.config.ts (narrow include so Playwright specs never run there); tests for titles.ts, useBookStructure.ts (buildStructure now exported), entityNames.ts (nameIndex() extracted from the hook). Fix: NUMBER_ONLY_CHAPTER accepts only well-formed roman numerals.
**Why:** Peter: start layer 1 of the test plan.
**Discovered:** Vitest 5 requires Node ^22.12/24/≥26; the dev container runs Node 20.20 → pinned 4.1.11. The roman-numeral branch matched any run of i/v/x/l/c/d/m, so "Child"/"Chill"/"Chic"/"Chapter Mild" were hidden as number-only (aa unaffected: all 12 chapters are "Chapter N"). Lockfile also bumped two transitives (@jridgewell/sourcemap-codec, tinyglobby). Container node_modules synced via podman exec npm install + .wip-lock-hash.

## bf34c11 — build: Node 24 images, Vitest 5, tsx as a runtime dependency (CASE-909)
**Time:** 01:04
**Files:** 8 files changed, +80/-218 (mostly package-lock)
**Tests:** host: 62 passed, tsc clean. Local Dockerfile.dev build (Node 24.22, 1.5 GB limit): npm ci, 62 tests, tsc, vite build; entrypoint gate: empty volume installs, same Node no re-install, Node 20 on same volume re-installs. Local production build run with --network none: health/app-config 200 JSON, /, /characters?x=1 → index.html, unknown /api /server-api /mcp /wip → 404 JSON (GET/POST/DELETE), image HEALTHCHECK command ok. NOT deployed (Peter redeploys himself).
**What:** node:20-alpine → node:24-alpine (3 FROM lines); entrypoint hashes lockfile + node -v; tsx → dependencies; vitest 5.0.3; ROADMAP vuln backlog item; README/WIP_DEPLOY notes. CASE-909 filed (scaffold Dockerfile.dev + docs on Node 20; RC/KB/VAL/ReceiptScanner/Song on Node 20; KB has the same tsx/--omit=dev shape).
**Why:** Peter: upgrade Node (20 is EOL since 2026-04-30), no deploy agent.
**Discovered:** (1) Production image never had tsx (devDependency + npm ci --omit=dev) → `npx tsx` fetched the latest tsx from the registry on every start; hangs offline. (2) Running two image builds in parallel next to the WIP stack rebooted the 6 GB podman VM (~00:49, probable OOM); all containers came back healthy, aa intact. (3) After that reboot the AA container ran npm ci under Node 20 for the new lockfile → hash marker matched → a Node 24 redeploy would not have re-installed; fixed by the node -v hash. (4) npm audit: 32 vulnerabilities (3 critical), all pre-existing. (5) podman's default OCI image format drops HEALTHCHECK (warning only; the deployer sets its own probe).
