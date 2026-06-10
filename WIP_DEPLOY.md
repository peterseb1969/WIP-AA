# Deploying AuthorAssist via `wip-deploy`

This is the AuthorAssist side of the deployable-app contract introduced by
CASE-375. The matching app manifest lives in the WIP repo at
`apps/wip-aa/wip-app.yaml` — that file is BE-YAC territory; this document
describes what AuthorAssist commits to so the manifest is creatable.

## Artifacts in this repo

| File | Role |
|---|---|
| `Dockerfile` | Prod image. Multi-stage build → `dist/` + server, runs `npx tsx server/index.ts` on port 3014. Used by `compose` and `k8s` targets. |
| `Dockerfile.dev` | Bind-mount-friendly dev image for `wip-deploy add-app wip-aa --app-source ~/Development/WIP-AA`. Canonical CASE-58 entrypoint pattern (same as WIP-KB / react-console). |
| `docker-entrypoint-dev.sh` | Populates the named `/app/node_modules` volume on first start; re-runs `npm ci` when the host's package-lock.json hash changes. |
| `.dockerignore` | Excludes node_modules, dist, .git, .claude, .env, *.md, tests, docs, data-model, yac-discussions, tools, .DS_Store. |
| `vite.config.ts` | Threads `VITE_BASE_PATH` / `APP_BASE_PATH` into Vite's `base` so emitted asset URLs match the gateway path. Binds 0.0.0.0 so the container dev server accepts external connections. |
| `server/index.ts` | Mounts all routes (including `/wip` proxy) under `APP_BASE_PATH`. In production, serves `dist/` statically from inside Express; in dev-with-app-source the renderer forces `NODE_ENV=development` and Caddy routes to the Vite port instead. |
| `src/App.tsx` | `BrowserRouter basename` derived from Vite's `BASE_URL` (CASE-370 surface #10) so client-side routes work under `/apps/aa`. |
| `src/lib/wip.ts` | Browser WIP client `baseUrl` = `${BASE_URL}wip` so proxy calls stay on the app's own path prefix. |

## Ports

| Port | Purpose | Manifest name |
|---|---|---|
| 3014 | Express server (API + `/wip` proxy + static SPA in prod) | `http` |
| 5180 | Vite dev server (active only when `--app-source` is used) | `dev` |

The numbering avoids `wip-kb` (3012) and `clintrial` (3013).

## What the WIP repo's `apps/wip-aa/wip-app.yaml` needs

Mirroring `apps/wip-kb/wip-app.yaml` (the working reference — same Express +
Vite + MCP-agent shape as AuthorAssist):

```yaml
api_version: wip.dev/v1
kind: App
metadata:
  name: wip-aa
  category: optional
  description: |
    AuthorAssist — novel-writing workspace over the aa namespace.
    Vite SPA + Express server (tsx).

spec:
  image:
    name: wip-aa
    tag: <date-suffixed, bump on rebuild — pull_policy caches by tag>

  ports:
    - {name: http, container_port: 3014}
    # CASE-375: Vite dev-server. Used only when --app-source is active.
    # 5180 avoids wip-kb (5173) and react-console (5174) on multi-app
    # dev installs.
    - {name: dev, container_port: 5180}

  env:
    required:
      - {name: WIP_BASE_URL, source: {from_component: router}}
      - {name: WIP_API_KEY, source: {from_secret: api-key}}
      - {name: PORT, source: {literal: "3014"}}
      - {name: APP_BASE_PATH, source: {literal: /apps/aa}}
      - {name: NODE_ENV, source: {literal: production}}
      - {name: WIP_NAMESPACE, source: {literal: "aa"}}
    optional:
      # AskBar + import extraction use Anthropic; degrade gracefully unset.
      - {name: ANTHROPIC_API_KEY, source: {from_secret: anthropic-api-key}}
      # CASE-375: the query agent uses MCP over HTTP; without MCP_URL it
      # falls back to spawning `python -m wip_mcp` via stdio, which fails
      # inside a Node container (no Python).
      - {name: MCP_URL, source: {literal: "http://wip-mcp-server:8007/mcp"}}
      - {name: MCP_TRANSPORT, source: {literal: "http"}}

  depends_on: [document-store]

  healthcheck:
    endpoint: /apps/aa/api/health
    probe: auto
    start_period_seconds: 15

app_metadata:
  display_name: AuthorAssist
  route_prefix: /apps/aa
  ui_only: false
```

The `APP_BASE_PATH` / `VITE_BASE_PATH` envs feed Vite's `base`, the Express
router mount, the SPA router basename, and the browser client's `/wip`
prefix — all four read the same value.

## Local verification

After the manifest lands and a `wip-deploy add-app authorassist` succeeds:

```bash
$ wip-deploy add-app authorassist \
    --name wip-dev-local \
    --app-source ~/Development/WIP-AA
$ open https://localhost:8443/apps/aa/
  # SPA loads via Vite (HMR works, edits to src/ reflect immediately)
$ curl -sk https://localhost:8443/apps/aa/api/health
  {"status":"ok","service":"authorassist"}
$ curl -sk https://localhost:8443/apps/aa/wip/api/registry/namespaces/aa
  # Server-side WIP proxy works through the gateway
```

## Local dev outside `wip-deploy`

The standalone dev flow remains unchanged for AuthorAssist developers who
don't run the full WIP install locally:

```bash
$ npm run dev
# Server on :3002, Vite on :5173 (defaults; override with PORT and VITE_PORT)
```

`vite.config.ts` is env-aware: `PORT=3003 VITE_PORT=5180 npm run dev` shifts
both. Useful when running alongside another local dev server.

## Known caveats

- **`NODE_ENV` is forced to development under `--app-source`** (CASE-55). The
  production static-serving block in `server/index.ts` only runs on
  compose/k8s targets — dev-with-app-source relies on the Vite dev port
  declared as `dev` in the manifest.
- **MCP_URL must point at a route the upstream router actually exposes.**
  CASE-375's "out of scope" section flags two BE-YAC issues — internal
  router not emitting `/mcp` handler, and `MCP_ALLOWED_HOST` missing on
  `mcp-server`. AuthorAssist can't work around these.
- **Scoped API keys don't currently grant def-store access** (CASE-351).
  Use the legacy admin key from `~/.wip-deploy/wip-dev-local/secrets/api-key`
  until that case lands.
