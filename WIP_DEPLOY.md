# Deploying AuthorAssist via `wip-deploy`

This is the AuthorAssist side of the deployable-app contract introduced by
CASE-375. The matching app manifest lives in the WIP repo at
`apps/wip-aa/wip-app.yaml` — that file is BE-YAC territory; this document
describes what AuthorAssist commits to so the manifest is creatable.

## Artifacts in this repo

| File | Role |
|---|---|
| `Dockerfile` | Prod image. Multi-stage build → `dist/` + server, runs `npx tsx server/index.ts` on port 3014. Used by `compose` and `k8s` targets. |
| `Dockerfile.dev` | Bind-mount-friendly dev image for `wip-deploy --target dev --app-source authorassist=PATH`. Just `npm ci` and `npm run dev`. |
| `.dockerignore` | Excludes node_modules, dist, .git, .claude, .env, *.md, tests, docs, data-model, yac-discussions, tools, .DS_Store. |
| `vite.config.ts` | Threads `VITE_BASE_PATH` / `APP_BASE_PATH` into Vite's `base` so emitted asset URLs match the gateway path. Binds 0.0.0.0 so the container dev server accepts external connections. |
| `server/index.ts` | Mounts all routes (including `/wip` proxy) under `APP_BASE_PATH`. In production, serves `dist/` statically from inside Express; in dev-with-app-source the renderer forces `NODE_ENV=development` and Caddy routes to the Vite port instead. |

## Ports

| Port | Purpose | Manifest name |
|---|---|---|
| 3014 | Express server (API + `/wip` proxy + static SPA in prod) | `http` |
| 5180 | Vite dev server (active only when `--app-source` is used) | `dev` |

The numbering avoids `wip-kb` (3012) and `clintrial` (3013).

## What the WIP repo's `apps/wip-aa/wip-app.yaml` needs

Copying the shape from `apps/clintrial/wip-app.yaml` and `apps/react-console/wip-app.yaml`:

```yaml
spec:
  ports:
    - {name: http, container_port: 3014}
    # CASE-55: Vite dev server. Active only with --app-source.
    # The dev_simple renderer routes /apps/aa/* here instead of 3014
    # (which serves the API only in dev). Ignored on compose/k8s.
    - {name: dev, container_port: 5180}

  env:
    optional:
      # AuthorAssist's agent.ts uses MCP over HTTP. When the deployer
      # includes mcp-server as a module, MCP_URL points at it; when
      # absent, the agent skips MCP tools.
      - {name: MCP_URL, source: {literal: "http://wip-mcp-server:8007/mcp"}}
      - {name: MCP_TRANSPORT, source: {literal: "http"}}
      # ANTHROPIC_API_KEY needed for /api/ask and /api/import/extract.
      # Source from the install's secrets backend.
      - {name: ANTHROPIC_API_KEY, source: {secret: anthropic-api-key}}
      # WIP runtime key. For dev this is the namespace-scoped key (see
      # CASE-351 for the current scoped-key authz limitation). For prod
      # use a dedicated runtime key with read+write grants on `aa`.
      - {name: WIP_API_KEY, source: {secret: api-key-aa}}
      - {name: WIP_NAMESPACE, source: {literal: "aa"}}
```

The `APP_BASE_PATH` and `VITE_BASE_PATH` env vars are injected by the
renderer based on the manifest's `path`. AuthorAssist reads both.

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
