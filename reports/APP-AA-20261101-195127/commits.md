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

## 8d21f3b — feat: several books in one app, one namespace each (CASE-913)
**Time:** 2026-11-01 23:52
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 41 changed, +962/-186
**Tests:** not recorded
**Why:** The server treats as books the namespaces its key sees that hold AA's
templates (server/lib/books.ts) and takes the book per request from
?book=: requireBook() answers 400 for a malformed name, 404
unknown_book for a namespace that is not a book, 503 when WIP cannot
be asked; only the bootstrap accepts a new name, which is how a book is
added. Bootstrap, demo, extraction (term lists per book), export, book
contents, Delete book and Ask (namespace forced per request; a session
stays with its book) are per book. WIP_NAMESPACE is only the default
book. A refused namespace create (403: name not reserved) says which
wip-deploy app-namespace add command the operator runs.

The browser carries the book in the URL (<base>/book/<ns>/..., the
router basename), so every page and link stays as it was; main.tsx
reads it before the first render. A URL without a book (old links) opens
the last book used here, then the default book, else the book list.
Every server call about a book goes through bookApi(). New: the Books
page (<base>/books: list, set up a new book) and the current book with
"All books" in the sidebar; the gate's first-visit panel shows the
reservation command.

Tests: type-check, 182 unit (18 new: books server + client), 24 integration, full e2e 67 passed before the last locator fix in books.spec.ts, then books + app-config 8 passed; mutation checks: the server name/marker/book-check rules and the client ignoring the URL's book each fail the new tests
Discovered: page.route globs without a query (import.spec's extraction stub) silently stop matching once a URL gains ?book=; the stub now matches the path with any query
