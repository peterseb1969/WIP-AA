## 8792f0d — agent: send X-API-Key on remote MCP transports (CASE-451)
**Time:** 22:41
**Files:** 1 changed, +10/-2
**Tests:** tsc clean; runtime verification = BE-YAC's live dev-stack run (container healthy, 25/91 tools)
**What:** WIP_API_KEY added to env(); both remote MCP transports (SSE, Streamable HTTP) now pass X-API-Key via requestInit headers. Fix authored live by BE-YAC-20260611-195632 in the hot-wired checkout; reviewed against the case and committed here.
**Why:** Platform MCP endpoint requires X-API-Key on every request; without it the dev server died at startup with 401 under MCP_TRANSPORT=http. CASE-451 flipped to implemented.

## 2eb2202 — .gitignore: exclude .claude/.session-id (session-local sentinel)
**Time:** 22:42
**Files:** 1 changed, +1
**What:** Session sentinel from the new wip-setup/wip-wake regime is machine-local; never commit.
**Why:** First session minted under the CASE-389 model in this repo (legacy APP-AA-20260511-2032 closed, this session continues_from it).
