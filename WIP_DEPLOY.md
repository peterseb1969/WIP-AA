# Deploying AuthorAssist via `wip-deploy`

This is the AuthorAssist side of the deployable-app contract introduced by
CASE-375. The matching app manifest lives in the WIP repo at
`apps/wip-aa/wip-app.yaml` — that file is BE-YAC territory; this document
describes what AuthorAssist commits to so the manifest is creatable.

## Artifacts in this repo

| File | Role |
|---|---|
| `Dockerfile` | Prod image (`node:24-alpine`, like `Dockerfile.dev`). Multi-stage build → `dist/` + server, runs `./node_modules/.bin/tsx server/index.ts` on port 3014 (by path, never through `npx`, CASE-1048). Built for the root of AA's origin: no base-path build argument. Used by `compose` and `k8s` targets. |
| `Dockerfile.dev` | Bind-mount-friendly dev image for `wip-deploy add-app wip-aa --app-source ~/Development/WIP-AA`. Canonical CASE-58 entrypoint pattern (same as WIP-KB / react-console). |
| `docker-entrypoint-dev.sh` | Populates the named `/app/node_modules` volume on first start; re-runs `npm ci` when the hash of package-lock.json plus `node -v` changes (so a new Node base image re-installs too). |
| `.dockerignore` | Excludes node_modules, dist, .git, .claude, .env, *.md, tests, docs, data-model, yac-discussions, tools, .DS_Store. |
| `vite.config.ts` | Keeps Vite's default base `/`: the app is served at the root of its own origin. Proxies `/api`, `/server-api` and `/wip` to the Express port. Binds 0.0.0.0 so the container dev server accepts external connections. |
| `server/index.ts` | Mounts all routes (including `/wip` proxy) at the root. In production, serves `dist/` statically from inside Express; in dev-with-app-source the renderer forces `NODE_ENV=development` and Caddy routes to the Vite port instead. |
| `src/App.tsx` | `BrowserRouter basename` derived from Vite's `BASE_URL` (CASE-370 surface #10) plus the current book (`/book/<ns>`). |
| `src/lib/wip.ts` | Browser WIP client `baseUrl` = `${BASE_URL}wip` so proxy calls stay relative to the app (`BASE_URL` is `/`). |
| `server/lib/bootstrap.ts` + `server/bootstrap.routes.ts` + `src/components/BootstrapGate.tsx` | Offer-on-empty / use-on-exists runtime bootstrap (gene-pool pattern). On a fresh install the app offers to seed the `aa` namespace itself and writes an `AA_BOOTSTRAP_RECORD` audit doc. An existing namespace without a record (an interrupted bootstrap) shows as incomplete with a resume offer; the legacy unprefixed `BOOTSTRAP_RECORD` written by older bootstraps still counts as complete. |
| `server/seed/` | Runtime seed files read by `runBootstrap()` — mirrors `data-model/` (the `/export-model` target) plus `00_AA_BOOTSTRAP_RECORD.json`. Keep in sync when the data model evolves. |

## Ports

| Port | Purpose | Manifest name |
|---|---|---|
| 3014 | Express server (API + `/wip` proxy + static SPA in prod) | `http` |
| 5180 | Vite dev server (active only when `--app-source` is used) | `dev` |

The numbering avoids `wip-kb` (3012) and `clintrial` (3013).

## What the WIP repo's `apps/wip-aa/wip-app.yaml` declares

The manifest is BE-YAC territory; read it in the WIP repo rather than a copy here. The parts AuthorAssist depends on (checked 2026-11-08, WIP `develop` at `283d70b7`):

- `app_metadata.label: aa`: the app's origin is `https://aa.<hostname>/`, served at its root. There is no `APP_BASE_PATH` or `VITE_BASE_PATH` any more, and no `/apps/aa` prefix (CASE-1103; an image built for the prefix cannot be served by an install after the cut).
- `routes: [{path: /, auth_required: true}]` and `healthcheck.endpoint: /api/health`, which answers without WIP.
- `spec.namespaces`: `aa` (role `main`, env `WIP_NAMESPACE`, `deletion_mode: full`) and `aa-settings` (role `settings`, env `SETTINGS_NAMESPACE`). Further books are reserved per install with `wip-deploy app-namespace add wip-aa <book> --setting deletion_mode=full`.
- Ports `http` 3014 and `dev` 5180; `WIP_BASE_URL` from the router; `MCP_URL` / `MCP_TRANSPORT` for the Ask agent; `ANTHROPIC_API_KEY` supplied by the operator. The deployer derives the app's own key (`app-wip-aa`) and sets `WIP_API_KEY`.
- `image.tag`: bump it to the tag CI built whenever AA's image changes (`pull_policy` caches by tag).

## Local verification

With the app enabled on the local install (`--hostname wip.localhost`) and `--app-source ~/Development/WIP-AA`:

```bash
$ open https://aa.wip.localhost:8443/
  # one login, then the SPA loads via Vite (HMR works)
$ curl -sk -o /dev/null -w '%{http_code}\n' https://aa.wip.localhost:8443/api/health
  # 302: the gateway sends a request without a session to the login
```

AA is served at the root of its own origin. App origins need a hostname with a dot: on plain `localhost` the session renewal cannot reach WIP's login cookie (CASE-1105), so the deployer refuses it there. Old links under `/apps/aa/` have no redirect. The gateway gives the origin a session of its own (15 minutes), which `WipProvider` (`@wip/react` ≥ 0.26.0) and the Books page renew in the background. After a logout elsewhere the page reloads, and the scene editor keeps any unsaved typing as a local draft. Scripts reach the app on its origin, logged in through the gateway (Playwright as the Dex user `e2e`); the server's routes are not reachable without a session.

## Local dev outside `wip-deploy`

The standalone dev flow remains unchanged for AuthorAssist developers who
don't run the full WIP install locally:

```bash
$ npm run dev
# Server on :3014, Vite on :5180 (defaults; override with PORT and VITE_PORT)
```

`vite.config.ts` is env-aware: `PORT=3003 VITE_PORT=5180 npm run dev` shifts
both. Useful when running alongside another local dev server.

## Known caveats

- **Adding an npm dependency while the dev container runs.** The container
  bind-mounts the tree but keeps `node_modules` in its own volume, so an
  import of a package only installed on the host breaks the live app. Install
  it in the container first and record the install, using the entrypoint's
  hash formula:
  `podman exec wip-wip-aa sh -c 'cd /app && npm install && { cat package-lock.json; node -v; } | sha256sum | cut -c1-64 > node_modules/.wip-lock-hash'`.
  Dev-only tools that the app never imports (e.g. Vitest) can skip this; the
  next container start re-installs.
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
