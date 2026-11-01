# Commits — APP-AA-20261101-195127

## 3ba2e90 — chore: dev entrypoint hashes the libc too; npm audit fix (CASE-1006)
**Time:** 2026-11-01 23:19
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 2 changed, +136/-133
**Tests:** not recorded
**Why:** The scaffold's docker-entrypoint-dev.sh now also hashes the libc (alpine
musl vs glibc), so a base-image switch with an unchanged lockfile still
re-runs npm ci; AA's copy hashed only the lockfile and node -v. Taken
verbatim. npm audit fix moved the lockfile within the existing ranges
(body-parser 2.4.0, zod 4.6.7, vite 6.4.5, fast-uri 3.1.9, esbuild):
5 advisories (2 high) to 0. Both Dockerfiles were already on node:24.

Tests: type-check, 164 unit, 65 e2e passed, build ok
Discovered: the Tailwind 3 build-chain advisories from the ROADMAP backlog no longer show in npm audit

## 5f3ddb9 — docs: design for several books in one app (CASE-913, CASE-1014)
**Time:** 2026-11-01 23:38
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 2 changed, +15/-1
**Tests:** not recorded
**Why:** Peter decided on 2026-11-01: one app instance with several books first,
one instance per author later. A book stays one namespace; the server
treats as books the namespaces its key sees that hold the bootstrap
record template; the browser carries the book in the URL and passes it
to the server as ?book=. Adding a book needs an operator reservation
until CASE-1014 (reservations by prefix) lands.

Tests: not run (docs only)
