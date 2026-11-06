---
session_id: APP-AA-20261101-195127
role: APP-AA
started_at: 2026-11-01T19:51:27
status: active
continues_from: APP-AA-20261021-181514
---

# Session APP-AA-20261101-195127

Continues from APP-AA-20261021-181514 (via /wip-wake).

## Session Summary
**Duration:** 2026-11-01 19:51 – 2026-11-06 20:54 (one context window; Claude Code restarted twice with `/exit`, same session ID)
**Commits:** 18 (`3ba2e90` … `914926d`), all pushed to gitea and GitHub
**Lines:** +3397/-454 (89 files)
**Phase:** 4 / improve
**What happened:** The session moved AA from one book to many and from Claude-only to a choice of models, then onto an origin of its own.
- **Several books in one app** (Peter's decision, 2026-11-01). One namespace per book, the book in the URL (`<base>/book/<ns>/`) and as `?book=` to the server, a Books page. New books need an operator reservation (CASE-1014 asks for prefixes). Peter checked it by hand on the dev install.
- **Settings → AI models** (Peter's decisions, 2026-11-02). Providers that speak the Anthropic API (Claude, oMLX's Qwen3.8 on this Mac), a provider and model per use (Ask, analysis, import extraction). Stored in its own namespace `aa-settings`; keys never in WIP and restricted to `ANTHROPIC_API_KEY` / `AI_KEY_*`.
- **Cases closed out:**
  - CASE-1006: dev entrypoint, `npm audit`;
  - CASE-1048: tsx by path in the Dockerfile;
  - CASE-1069: refused book names say why; reservation hints for both key models; the set-up panel's layout from Peter's screenshot;
  - the CI workflow off Node 20.
- **App origins (CASE-1061 / tracker CASE-1104):**
  - refreshed to `@wip/react` 0.26.0;
  - renewal on the Books page, a draft flush on `pagehide`, no boot inside the renewal iframe;
  - checked live on `localhost` after Peter switched it.

**WIP interactions:**
- CASE-1014 (prefix reservations), CASE-1016 (manifest: `aa-settings`), CASE-1105 (renewal fails on localhost: the iframe's request to `localhost` carries no `wip_session`, so apps reload about every 5 minutes).
- Commented on CASE-913 (#2) and CASE-1104 (#1); responded to and implemented CASE-1048 and CASE-1069.
- The local stack restarted mid-test when Peter redeployed; it was not an AA failure.

**Unfinished:**
- **App origins:** the remaining installs (dev-test, prod-test, kb.internal; the attached AA on wip-k3s needs an image from `f84de20` or later) and the 15-minute-tab check, which waits on CASE-1105.
- **AI models:** never tried with real Ask questions on Qwen3.8 against a book; the `aa-settings` reservation for the deployed manifest waits on CASE-1016.
- **Older items, still open:**
  - the server ignores `WIP_API_KEY_FILE`;
  - `.dockerignore` `*.md` drops `server/prompts/assistant.md`;
  - the scene list is capped at 200;
  - one instance per author (CASE-913), root on own origin (CASE-1103).

**For the next YAC:**
- **Read first:** ROADMAP "Next Up" and DESIGN.md "Several books in one app" and "AI models".
- **Live check without clicking:** `scratchpad`-style Playwright scripts can log in as the Dex user `e2e` (`~/.wip-deploy/default/secrets/dex-password-e2e`, email `e2e@wip.local`). Never write to the live book `aa` from them.
- **Live namespaces:** the local install holds `aa`, `aa-test-book` (Peter's test of several books) and maybe `aa-settings`.
- **Settings namespace:** it is created in `retain` mode, so deleting a scratch copy needs `deletion_mode: full` with `confirm_enable_deletion` first.
- **Locale JSON:** never re-dump it; edit lines in place (`\u` escapes in `de.json`, and keys repeat across sections).
- **e2e:** the type-check does not cover `tests/e2e`.
