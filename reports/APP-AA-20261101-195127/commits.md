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

## cc334de — docs(roadmap): several books checked by hand on the dev install
**Time:** 2026-11-02 08:14
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 2 changed, +29/-1
**Tests:** not recorded
**Why:** Peter, 2026-11-02, under the app's own key: unreserved name refused,
reserved name set up from the Books page, books separate, Ask scoped to
the open book.

Tests: not run (docs only)

## 521e315 — docs: design for choosing AI models per use (providers, uses, aa-settings)
**Time:** 2026-11-02 08:57
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 2 changed, +14/-0
**Tests:** not recorded
**Why:** Peter, 2026-11-02: app-wide, in its own namespace aa-settings. Providers
speak the Anthropic Messages API (Claude, oMLX's Qwen3.8 and LM Studio
checked for the endpoint on 2026-11-01); uses are AA_AI_USE terms; one
AA_AI_SETTINGS document; keys stay in server files.

Tests: not run (docs only)

## afd2a10 — model: AI settings seeds (AA_AI_USE, AA_AI_SETTINGS) and a bootstrap per namespace kind
**Time:** 2026-11-02 09:06
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 11 changed, +174/-27
**Tests:** not recorded
**Why:** Seeds for the app's settings namespace (server/seed/settings/, mirrored
in data-model/settings/): the AA_AI_USE vocabulary (ASK, ANALYSE,
IMPORT_EXTRACT), AA_AI_PROVIDER and AA_AI_ASSIGNMENT embedded in one
AA_AI_SETTINGS document (identity: scope = app), and its own bootstrap
record AA_SETTINGS_BOOTSTRAP_RECORD, so it never reads as a book. A
provider names the environment variable holding its key (key_env); the
key never enters WIP. The bootstrap takes a kind (BOOK, SETTINGS): seed
dir, record, create settings and the reservation hint; books unchanged.

Modelled in the scratch namespace dev-authorassist (deleted afterwards)
with the real bootstrap: status ready; a settings document created, a
second post of scope app became version 2 of it; WIP refused an unknown
use, a malformed provider id, a pasted key as key_env and another scope.
DESIGN.md: keys come from the deployer's secret store via key_env; why
the settings are a WIP document and not a file (Peter, 2026-11-02).

Tests: type-check, 182 unit; scratch-namespace modelling as above
PoNIF: #3 handled — identity is scope only, so an edit versions the one settings document

## 8715ba3 — server: AI providers and models per use, from the settings namespace
**Time:** 2026-11-02 09:11
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 9 changed, +556/-31
**Tests:** not recorded
**Why:** lib/ai-settings.ts reads the one AA_AI_SETTINGS document from
SETTINGS_NAMESPACE (default aa-settings); without it, or when WIP
cannot be read, every use runs as before (Claude, CLAUDE_MODEL /
ANALYSE_MODEL / IMPORT_MODEL, the Anthropic key). The Ask bar, scene
analysis and the import's extraction each take the provider and model
assigned to their use; every provider speaks the Anthropic Messages
API. The Ask agent connects to WIP without waiting for a key, and
/api/ask answers 503 with the reason when its use has no usable model.

Keys never enter WIP and go only where they belong: key_env may name
ANTHROPIC_API_KEY or AI_KEY_* only (template pattern and server check),
so the settings can never send WIP_API_KEY or another server secret to
a provider's URL; the Anthropic key goes to api.anthropic.com only; a
provider without key_env gets no key, not even one typed for its id; a
provider being edited is listed and tested without any key.

Routes under /server-api/config/ai: state, setup (bootstrap + the
defaults as version 1), save, model list, Test (with tools for Ask),
typed key per stored provider (AI_KEYS_DIR when mounted).

Tests: type-check, 194 unit (12 new; mutation checks on the key rules
fail them, one equivalent mutation noted); end to end on a throwaway
instance and settings namespace (deleted): defaults before setup, setup
ready with version 1, oMLX model list, tool test with Qwen3.8 ok (1.9 s,
tool call), save as version 2, WIP_API_KEY as key_env refused, typed key
for a keyless provider refused
Discovered: the settings namespace is created in retain mode (no
reservation setting), so deleting a scratch copy needs a flip to full first
