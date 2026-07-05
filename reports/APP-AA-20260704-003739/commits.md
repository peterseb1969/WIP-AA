## 9ac8a93 — scaffold refresh (engine cutover validation, CASE-612)
**Time:** 17:49
**Files:** 23 changed, +1594/-78
**Tests:** npm ci + tsc --noEmit clean against the new lib tarballs
**What:** Gene-pool refresh committed by Peter, checked and pushed by me. Lib bumps client 0.27.1→0.28.0 / proxy 0.3.0→0.4.0 (react stays 0.16.0); MCP interpreter cut over to the WIP-TC04 engine checkout (`/Users/peter/Development/WIP-TC04/.venv`); local docs copies added (Vision.md, wip-deployable-app-contract.md — fixes the stale FR-YAC path); new `.claude/scripts/wake-rollover.py`; `CLAUDE.md.refresh` sidecar (doc-hygiene pass, pending merge); session reports committed.
**Why:** Engine cutover validation (CASE-612) — the platform engine moved to WIP-TC04 and consumer repos get refreshed genes + bumped libs to validate against it.
**Discovered:** Checks before push: `.mcp.json` key path stayed on live `wip-local` (CASE-520 fix held, no wip-dev-local regression); TC04 venv imports `wip_mcp` fine; package.json/tarballs/lockfile all agree on the new pins; typecheck clean. `CLAUDE.md.refresh` differs from CLAUDE.md by a doc-hygiene delta (strips CASE-token pointers, repoints contract to local docs/, adds Vision.md to reading list, adds "case numbers are provenance, never substance" rule) — left unmerged for Peter/next pass. Pushed to both remotes (gitea + github) — in sync at 9ac8a93.
