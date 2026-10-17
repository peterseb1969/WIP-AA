# Commits — APP-AA-20261017-150822

## fa7ee0c — agent: default WIP_NAMESPACE to 'aa' to match the server
**Time:** 15:45
**Files:** 1 changed, +1/-1
**Tests:** tsc --noEmit clean; vite build clean (no test suite)
**What:** agent.ts WIP_NAMESPACE default '' → 'aa', matching server/index.ts.
**Why:** Carried uncommitted from APP-AA-20260705-184654 (CASE-632 follow-up); without it the agent's reporting-schema namespace injection never fired in standalone dev.

## 19bdb2b — libs: bump @wip/client 0.60.0, @wip/react 0.20.0, @wip/proxy 0.5.1
**Time:** 15:45
**Files:** 11 changed, +93/-39
**Tests:** tsc --noEmit clean (src + server); vite build clean; dev container restarted, npm ci picked up new libs, @wip/proxy round-trip to WIP verified in-container (namespaces + aa terminologies); no browser click-through
**What:** Scaffold refresh from World-in-a-Pie develop 2860f4e5 shipped new versioned tarballs; pins + lockfile synced; tarballs force-added.
**Why:** Peter asked for the latest client libs (30 minor versions behind on client).
**Discovered:** Libs ship no CHANGELOG — breaking changes had to be mined from `git log -- libs/wip-*`. Relevant ones (CASE-778 strict term addressing, CASE-640 input_index→index, register_synonyms removal) don't touch AA's call sites. Several AA call sites cast the client `as any` (e.g. AliasManager updateTerm), so tsc can't vouch for them. Wheel build failed during refresh (`build` module not installed) — toolkit wheel stays at 0.5.0.

## 8f79aad — Gene-pool refresh: commands, docs, rollover script, settings baseline
**Time:** 15:45
**Files:** 16 changed, +477/-100
**Tests:** not run (no app code)
**What:** Slash commands, wake-rollover.py, bundled docs, .mcp.json venv path, ROLE_PREFIX in .app-meta, new .settings-baseline.json, removal of the wip_toolkit 0.2.3 wheel.
**Why:** Residue of two refreshes (pre-July and today) that had never been committed.

## 1d54c88 — deploy contract: serve /api/app-config; default to AA's ports 3014/5180
**Time:** 15:53
**Files:** 5 changed
**Tests:** tsc --noEmit clean; live in dev container: /apps/aa/api/app-config → 200 {"namespace":"aa"}, Cache-Control: no-store
**What:** appConfigHandler route; server + vite port fallbacks 3002/5173 → 3014/5180; README/ARCHITECTURE/WIP_DEPLOY port mentions.
**Why:** Contract gap found in today's deploy checks; ports were clintrial's / collided with RC+KB.
**Discovered:** I first claimed the vite proxy fallback mismatched the server — wrong, both defaulted to 3002. SPA still hard-codes 'aa' (55 uses / 18 files); switching it to app-config at boot is unscoped follow-up.

## 5dbdbce — libs: wip_toolkit 0.5.1 wheel, add wip_archive 0.1.1 wheel
**Time:** 15:53
**Files:** 3 changed
**Tests:** not run
**What:** Wheels rebuilt by a second refresh after installing `build` into World-in-a-Pie/.venv.
**Why:** First refresh skipped both wheels (No module named build).

## bbae320 — CLAUDE.md: document the real namespace (aa); merge refresh doc pass
**Time:** 15:53
**Files:** 1 changed (+ untracked CLAUDE.md.refresh removed)
**Tests:** n/a
**What:** Namespace section rewritten for aa; What This App Does filled; four refresh hunks merged; dev-namespace hunks deliberately not merged.
**Why:** CLAUDE.md pointed at a never-created dev-authorassist namespace.
**Discovered:** .app-meta DEV_NAMESPACE feeds the CLAUDE.md render template, which includes a "retire dev namespace via delete_namespace" step — setting it to aa would make every refresh render a delete instruction for live data, so .app-meta was left as is. AA still uses unprefixed BOOTSTRAP_RECORD and has no "incomplete" gate state — open design decision.

## 495c1fa — spa: read the WIP namespace from /api/app-config at boot
**Time:** 16:03
**Files:** 8 files changed, 85 insertions(+), 18 deletions(-)
**Tests:** tsc clean; vite build clean; in container via Vite :5180 — /apps/aa/api/app-config → {"namespace":"aa"}, served main.tsx contains fetchAppConfig. No browser click-through.
**What:** main.tsx awaits app-config before first render and sets NAMESPACE (export let + setter); literal 'aa' namespaces replaced; unused WIP_NAMESPACE export dropped.
**Why:** Contract: client-visible per-deployment values come from the runtime config, not bakes/constants.
**Discovered:** All NAMESPACE reads are inside components/hooks, so the ES live binding avoided touching 16 importers.

## a6f5a64 — bootstrap: AA_BOOTSTRAP_RECORD, incomplete state, idempotent resume
**Time:** 16:03
**Files:** 5 files changed, 120 insertions(+), 32 deletions(-)
**Tests:** Scratch namespace dev-authorassist via a 2nd server instance (PORT=3099): needs_bootstrap → incomplete → resume → ready; second run over existing data succeeded (12 templates, 68 terms, no dups). Live aa → ready (legacy fallback). Scratch namespace deleted.
**What:** Prefixed record + seed rename; incomplete state + gate panel; on_conflict=validate on terminology/term creates; full terminology flag forwarding; bootstrap honours WIP_NAMESPACE.
**Why:** Peter: fix the open issues (bootstrap-record convention was flagged as a design decision earlier).
**Discovered:** The scaffold template has no legacy-record handling — a straight port would mark every pre-CASE-757 namespace (incl. live aa) incomplete and offer a resume over live data. AA kept a legacy fallback. Worth telling BE-YAC (other apps bootstrapped before the prefix have the same trap) — not filed.

## 2c2c2fa — docs: sync KNOWN_ISSUES and ROADMAP with the current state
**Time:** 16:23
**Files:** 2 files changed, 30 insertions(+), 9 deletions(-)
**Tests:** n/a
**What:** Alias collision moved to Bugs; three bugs Next Up; unverified/tech-debt section; today's work in Done.
**Why:** Peter: sync before working the bugs.

## e7c05a1 — gate: read the namespace label at render, not at module load
**Time:** 16:23
**Files:** 1 file changed, 7 insertions(+), 7 deletions(-)
**Tests:** browser, scratch namespace — label shows dev-aa-split
**What:** Removed module-level NAMESPACE_LABEL copy.
**Why:** My own regression from 495c1fa: I audited the 55 existing NAMESPACE reads for module-scope use, then introduced a module-scope copy in the gate. Only the browser click-through caught it.

## 3121fe3 — fix(scenes): split no longer overwrites an existing "(continued)" scene
**Time:** 16:23
**Files:** 3 files changed, 76 insertions(+), 68 deletions(-)
**Tests:** browser repro on scratch namespace before (2nd split overwrote "(continued)" prose, structure got a duplicate id) and after (new "(continued 2)", old scene untouched, structure ordered, no dup)
**What:** Unique title via WIP query; create-new-first ordering; is_new guard; loud failure when the scene is missing from the structure.
**Why:** Data loss on repeated split.
**PoNIF:** #3 (identity hash) — title is AA_EVENT's identity, so a reused title is an upsert, silently.
**Discovered:** The KNOWN_ISSUES root cause (nested mutate calls) described code rewritten 4h after the entry was written. Basic split worked; the real bug was elsewhere.

## 7b4907e — docs: scene editor first-load bug is not reproducible
**Time:** 16:23
**Files:** 2 files changed, 3 insertions(+), 5 deletions(-)
**Tests:** browser: cold load via URL and via list; scratch scene and a 1,711-word real aa scene (read-only check, no typing/saving on aa)
**What:** Entry rewritten as not-reproducible with evidence and what to capture.
**Why:** Suspected cause (userEditedRef) removed in 99f5a3e after the entry was written.

## 185f3aa — feat(aliases): warn when an alias is already another entity's name
**Time:** 16:23
**Files:** 5 files changed, 74 insertions(+), 16 deletions(-)
**Tests:** tsc + vite build clean; browser on scratch namespace: collision flagged case-insensitively, Cancel saves nothing, free alias saves, Add anyway saves.
**What:** Exact defStore.searchTerms over the terminology before saving; owner shown; Add anyway / Cancel; en+de strings; dropped as-any on updateTerm.
**Why:** Bug 3 from KNOWN_ISSUES.
