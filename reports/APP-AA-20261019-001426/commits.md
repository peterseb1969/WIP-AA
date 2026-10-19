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

## af995ef — feat(import): ask for the book's details and save them as the project
**Time:** 07:40
**Files:** 8 files changed, +157/-17
**Tests:** 68 passed (6 new: titleFromFileName); tsc clean; vite build ok. Browser on scratch ns dev-aa-imp (second app instance 3015/5181; deleted after): upload The_Long_Winter.txt → title pre-filled "The Long Winter"; empty title disables Create & Import (click does nothing); title + author + genre Fantasy → import → AA_PROJECT {title, author, genre FANTASY, time_system ORDINAL} created before the other docs, structure book_title "The Long Winter", top bar + Dashboard show it ("Fantasy", "Time: Sequence Only" after the label fix); second import with the project present → card says details are kept, still 1 project (v1); Dashboard "Create project" form pre-selects Sequence Only. Not tested in a browser: German strings.
**What:** ImportPage Book details card + project creation first; titleFromFileName in titles.ts; PROJECT_TIME_SYSTEM_DEFAULT + FieldDef.default in CreateEntityModal; TermSelect exported with an id prop (genre label now linked); Dashboard genre/time system by term label; en/de strings; ROADMAP Done.
**Why:** Peter: after an import the Dashboard claimed there was no project; time system defaults to Sequence Only.
**Discovered:** The import never created a project; live `aa` has none (doc_aa_project reporting table doesn't exist). Nothing in the app reads time_system (Timeline/Appears in sort by story_time_sort). The locale JSON files are hand-formatted (de.json mixes \u escapes and raw UTF-8): never round-trip them through json.dump — insert lines textually.

## 15c61e3 — feat: adopt WIP fixes — @wip/client 0.62.0, merge via mergeTerms (CASE-899, CASE-904)
**Time:** 08:22
**Files:** 15 files changed, +52/-66 (incl. vendored tarballs, lockfile)
**Tests:** 68 passed; tsc clean; vite build ok. Browser on scratch ns dev-aa-v62 (3015/5181; deleted after): 147 KB PNG upload via files.uploadFile → portrait shown; 73 KB scene save via the Save button → stored in full (v2, 73,392 bytes); merge Linnie → Lady Linora Thalyn → LINNIE deprecated + replaced_by survivor, survivor names LINNIE/Linnie, Linnie doc retired, scene characters rewritten, scene check 0 suggestions, new note write with "Linnie" resolves to the survivor term. Not tested: re-run of an interrupted merge (skip path), German UI. Dev container synced (npm install + marker with the node -v formula).
**What:** @wip/client 0.60.0→0.62.0, @wip/react 0.20.0→0.21.0; storeFile removed; executeMerge uses defStore.mergeTerms (skipped when the absorbed name already resolves to the survivor) instead of deleteTerm; status=active on every name-vocabulary listing; mergeEntities header rewritten; KNOWN_ISSUES three entries → one "fixed upstream" note; ROADMAP Done. Comments CASE-899#3 (e2e confirmation) and CASE-904#5 (merge doesn't carry the label).
**Why:** Peter: do 1–3 of the case review (lib upgrade + workaround removal, stale docs, mergeTerms) before he rebootstraps dev-test.
**PoNIF:** #1 (merged term stays deprecated — "nothing ever dies" — so term lists must filter status=active, which the API does not by default).
**Discovered:** mergeTerms moves value + names but not the label; merging a deprecated term is refused; merging when the survivor already has the names succeeds. Default term listing includes deprecated terms. zsh `$NS:A…` is a path modifier (`:A`) — build URLs in Python, not zsh.

## b63622b — chore(deps): npm audit fix (32 -> 8), TipTap aligned on 3.32
**Time:** 22:27
**Files:** package.json, package-lock.json, ROADMAP.md
**Tests:** 68 passed; tsc; build; host production server (aa, read-only) endpoint matrix ok; browser on scratch ns dev-aa-aud (deleted after): editor typing + Cmd+B + Cmd+S stored with <strong>, split stored correctly (original shortened, new scene, structure both), all sidebar pages without console errors. Dev container synced (npm install + marker); its server process still runs the old server deps until restarted.
**What:** in-range fixes only (74 packages; all 3 criticals incl. proxy-addr); TipTap family raised to ^3.32.0 (core/pm had moved alone). Left: Tailwind 3 build-time chain (needs TW4, held back by technology-stack.md), esbuild dev-server advisory (Windows only).
**Discovered:** the split button shows a native alert() when the cursor is in the last paragraph — it froze the automation tab once (stub window.alert before driving the editor). @hono/node-server went 1 -> 2 as a transitive of the MCP SDK.

## df21bbe — test: finish layer 1 — scene check, merge, rename, Markdown (108 tests); fix accented names in the scene check
**Time:** 22:32
**Files:** 7 files changed, +470/-5
**Tests:** 108 passed (7 files); tsc; build. Mutation check: skip-merge guard, label-in-aliases, fill-empty-only, rename collision check, retire-original, Markdown urlTransform — each fails exactly one test; accented-name tests failed on the old regex.
**What:** useValidateScene/mergeEntities/rename/Markdown tests; src/lib/fakeWip.ts (in-memory WipClient stand-in: status filters, incoming edges, term merge effect incl. "label not moved"); nameFoundInText uses Unicode lookarounds instead of \b.
**Why:** Peter: finish layer 1.
**Discovered:** \b in JS regex is ASCII-only → names starting/ending with an accented letter were never found by the scene check (aa: "The Café", "The Tree Café", "Sunny's Work Shift at the Tree Café") and "José" matched inside "Josées". Running vitest with --root / scans the whole filesystem — never do that; put probe tests inside the project.
