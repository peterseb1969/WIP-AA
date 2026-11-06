---
session_id: APP-AA-20261101-195127
role: APP-AA
started_at: 2026-11-01T19:51:27
status: closed
ended_at: 2026-11-06T22:29:37
continues_from: APP-AA-20261021-181514
---

# Session APP-AA-20261101-195127

Continues from APP-AA-20261021-181514 (via /wip-wake).

## Session Summary
**Duration:** 2026-11-01 19:51 – 2026-11-06 22:29 (one context window; Claude Code was restarted with `/exit` twice under the same session ID)
**Commits:** 23 (`3ba2e90` … `9e539fc`), all pushed to gitea and GitHub
**Lines:** +3468/-454 (89 files)
**Phase:** 4 / improve

**What happened:** AA went from one book to many, from Claude only to a choice of models per use, and onto an origin of its own.
- **Several books in one app** (Peter, 2026-11-01):
  - one namespace per book, the book in the URL (`<base>/book/<ns>/`) and as `?book=` to the server, and a Books page;
  - new books need the operator's reservation (CASE-1014 asks for prefixes);
  - Peter checked it by hand.
- **Settings → AI models** (Peter, 2026-11-02):
  - providers that speak the Anthropic API (Claude; oMLX's Qwen3.8 on this Mac), with a provider and model per use (Ask, analysis, import extraction);
  - stored in its own namespace `aa-settings`;
  - keys never in WIP, only `ANTHROPIC_API_KEY` / `AI_KEY_*`, and never sent to another provider's address.
- **Cases implemented:**
  - CASE-1006: dev entrypoint, `npm audit`;
  - CASE-1048: tsx by path in the Dockerfile;
  - CASE-1069: refused book names say why; reservation hints for both key models; the set-up panel's layout from Peter's screenshot.
- **CI:** the build workflow is off Node 20.
- **App origins** (CASE-1061, tracker CASE-1104):
  - scaffold refreshes to `@wip/react` 0.26.0, then 0.26.1;
  - renewal on the Books page, a draft flush on `pagehide`, no boot inside the renewal iframe;
  - live checks in Chrome found CASE-1105 (renewal impossible on plain `localhost`), which BE-YAC fixed with the dotted-hostname rule;
  - verified on `wip.localhost` (Peter re-installed the local install) and on `dev-test`.
- **KB moved to `https://kb.kb.internal`;** AA's `.claude/kb.json` is repointed (gitignored).

**WIP interactions:**
- **Filed:** CASE-1014 (prefix reservations), CASE-1016 (manifest: reserve `aa-settings`), CASE-1105 (renewal on localhost; implemented by BE-YAC, then verified by AA in #3 and #4).
- **Commented:** CASE-913 #2, CASE-1104 #1, #2, #5.
- **Responded to and implemented:** CASE-1048, CASE-1069.
- **Platform facts learnt:**
  - the iframe renewal was first checked in a real browser by this session;
  - the settings namespace is created in `retain` mode;
  - BE-YAC's own CASE-1061 checks had used a scripted HTTP client only.

**Dead ends:**
- **`localhost` with app origins:** not fixable app-side. Use `--hostname wip.localhost`.
- **`page.getByDisplayValue`:** does not exist in Playwright, and the type-check does not cover `tests/e2e`.
- **Locale JSON:** cannot be re-dumped (escaping differs per file, and keys like `via_deploy` repeat across sections). Edit lines in place, anchored on the section.
- **`podman build` with relative paths** from a background job failed (the Dockerfile wasn't found); use absolute paths.

**Downstream impact:**
- every repo needs `kb_app_url: https://kb.kb.internal`;
- AA's image must be rebuilt (from `8768527` or later) before the attached AA on wip-k3s can move;
- `aa-test-book` disappeared from the book list after the re-install; its reservation did not carry over.

**Unfinished:**
- **App origins:**
  - the remaining installs (`prod-test`, `kb.internal`, the attached AA on wip-k3s);
  - a tab open past 15 minutes;
  - an image upload on an app origin.
- **AI models:**
  - never tried with real Ask questions on Qwen3.8 against a book;
  - the `aa-settings` reservation on deployed installs waits on CASE-1016;
  - `aa-settings` may not exist on the re-installed local install.
- **Older items, still open:**
  - the server ignores `WIP_API_KEY_FILE`;
  - `.dockerignore` `*.md` drops `server/prompts/assistant.md`;
  - the scene list is capped at 200;
  - one instance per author (CASE-913), serving at the origin's root (CASE-1103).

**For the next YAC:**
- **Read first:** ROADMAP "Next Up" (the app-origin item has a status line) and DESIGN.md "Several books in one app" and "AI models".
- **Live checks without clicking:**
  - Playwright scripts can log in as the Dex user `e2e` (email `e2e@wip.local`, password in `~/.wip-deploy/<install>/secrets/dex-password-e2e`);
  - the local install is `https://wip.localhost:8443`, with AA at `https://aa.wip.localhost:8443/apps/aa/`;
  - dev-test is `https://aa.dev-test.internal/apps/aa/`;
  - never write to the live book `aa` from such a script.
- **Scratch settings namespace:** to delete one, flip it first: `deletion_mode: full` with `confirm_enable_deletion: true`.
- **After a dependency change,** run `podman restart wip-wip-aa`.
