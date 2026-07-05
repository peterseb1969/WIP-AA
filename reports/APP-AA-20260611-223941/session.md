---
session_id: APP-AA-20260611-223941
role: APP-AA
started_at: 2026-06-11T22:39:41
status: closed
ended_at: 2026-07-03T23:34:35
continues_from: APP-AA-20260511-2032
---

## Tasks
- Review + commit BE-YAC's CASE-451 hotfix (MCP transport X-API-Key), mark case implemented
- Make AuthorAssist wip-deployable (BootstrapGate, dev container, manifest)
- CASE-493 nested-ref version pins + re-bootstrap; CASE-442 lib bumps
- Settings page for runtime Anthropic key
- Import character-merge bug (multi-round)
- Dual-remote push + dual-arch CI image build

## Session Summary
**Duration:** 2026-06-11 → 2026-07-03 (long multi-day continuation of APP-AA-20260511-2032). Tier-3 session; kb-mirrored.

**What happened.** (1) Implemented BE-YAC's CASE-451 MCP-transport X-API-Key hotfix and closed the case. (2) Made AA wip-deployable: BootstrapGate offer-on-empty (server/lib/bootstrap + routes + seed/ + BootstrapGate.tsx), canonical CASE-58 Dockerfile.dev + entrypoint, APP_BASE_PATH routing, BrowserRouter basename, browser-client BASE_URL prefix; drafted apps/wip-aa/wip-app.yaml in the WIP repo (CASE-376, uncommitted — BE-YAC to land). (3) CASE-493: the backend made template→template refs carry a mandatory pinned version with NO back-compat, which 500'd AA's stored AA_CHARACTER/AA_BOOK_STRUCTURE — added array_template_ref_version:1 to the two nested-array seeds + both bootstrap paths; proven on a throwaway dev namespace and via a live UI re-bootstrap. (4) CASE-442: lib tarballs to versioned-immutable pins (client 0.26.0→0.27.1, react 0.16.0, proxy 0.3.0), .gitignore exceptions + clean-clone CI verify each time. (5) Settings page to set/rotate the Anthropic key at runtime (server/lib/anthropic-key.ts resolver routed through BOTH agent.ts and import.ts; mirrors KB CASE-508/495). (6) Gene-pool refreshes (wip-* commands, regenerated CLAUDE.md, tier-3 kb.json/hooks/settings). (7) Filed CASE-520 (create-app-project.sh --refresh hardcodes dead wip-dev-local key path). (8) Dual-remote: origin now fans out to gitea+github (github had silently drifted 6 commits behind). (9) CI: replaced the QEMU single-job build with the three-job native dual-arch pattern (resolve-tag → build matrix amd64/arm64 → stitch) — validated with green runs; re-pointed image tag 20260703a per Peter's explicit override of the write-once guard.

**Dead ends / lessons.** The import character-merge bug: I shipped a filter band-aid (6b559c6) then a partial alias fix (c804d15) on a MISREAD root cause before reproducing the failure — Peter pushed back hard. Correct, empirically-proven cause: import term-creation is create-only with swallowed errors, so re-importing into a non-fresh namespace can't consolidate character terms that already exist; the merge→create path is correct only on a FRESH namespace (proven live: SUNNY_SUNRISE carried all merged aliases). **Lesson: reproduce the failure before shipping a fix.** Also CASE-520: --refresh keeps reverting .mcp.json/.env/CLAUDE.md to the dead wip-dev-local install — mitigated this session with WIP_API_KEY_FILE_OVERRIDE=wip-local plus a script "preserve target" improvement.

**Unfinished / for the next YAC.** (a) The real fix for iterative re-import is making import term writes **upsert** (create-or-updateTerm) so merges reconcile against existing terms — deferred; the freshness guard (warn-with-reset on the Import page) is the interim. (b) A *renamed* (not merged) character still loses its scene tag — needs a rename→alias mapping. (c) Durable runtime-key persistence needs ANTHROPIC_API_KEY_FILE + a writable volume in wip-app.yaml (deploy/BE-YAC). (d) apps/wip-aa/wip-app.yaml is drafted but uncommitted in the WIP repo (CASE-376). (e) Image tag 20260703a now points at commit f30063f's multi-arch build. Both remotes are in sync at f30063f; working tree clean.
