# Session Updates — APP-AA-20260704-003739

Append-only running log. Distinct from session.md (overwritten at end) and report-<slug>.md (per-decision). Read by /wip-wake after session.md and commits.md.

## 00:59 — CASE-376 verified done & marked implemented; CASE-602 filed for residual manifest gaps
Woke via /wip-wake (continues_from APP-AA-20260611-223941; that prior session's legacy dir was moved from FR-YAC/reports into this repo's reports/). Peter: "520 is implemented, analyse 376 fresh."

**CASE-376 (wip-aa deploy manifest, request→BE-YAC) → implemented.** Re-analysed fresh, not from memory. The manifest `apps/wip-aa/wip-app.yaml` exists and is committed in the WIP repo by BE-YAC (`c56f5f23` add + `71a8a790` fix missing routes block). Deploy contract proven live: container `wip-wip-aa` healthy up 6 days running `localhost/wip-aa:dev` (the --app-source dev-build path, not the manifest tag); and BootstrapGate self-bootstrapped the `aa` namespace on 2026-06-28 (BOOTSTRAP_RECORD `bootstrap-2026-06-28T22-19-15-376Z`, 12 templates + 12 terminologies via the server-side proxy) — which requires healthcheck + proxy both up. All 3 acceptance criteria met. Wrote CASE_RESPONSE (kind=implement) with the evidence, then patched status open→implemented. This closes out prior-session unfinished item (d) "manifest drafted but uncommitted".

**CASE-602 filed (open, request→BE-YAC, REFERENCES→376)** for two residual WIP-repo manifest gaps that post-date 376: (1) `image.tag: 20260610a` is a never-published day-1 placeholder — WIP-AA CI now ships `ghcr.io/<owner>/wip-aa:20260703a` (f30063f); bumping it matters for image-based (compose/k8s) installs only, dev --app-source ignores the tag. (2) manifest lacks `ANTHROPIC_API_KEY_FILE` + a writable volume, so a Settings-UI-set Anthropic key reverts on restart (CASE-509 contract). This formalises prior-session unfinished item (c).

No code/git commits this segment — KB writes only. Both cases go through the served kb-client (`bash $HOME/.cache/wip-kb-client/kb-client.sh`; note `~` doesn't expand inside a quoted KBC var — use $HOME). WIP-AA working tree still clean at f30063f; only untracked item is the new reports/ dir.
