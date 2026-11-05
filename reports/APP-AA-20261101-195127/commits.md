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

## 753c881 — feat: Settings → AI models: providers, and the model for each use
**Time:** 2026-11-02 09:18
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 15 changed, +591/-14
**Tests:** not recorded
**Why:** A section under Settings: before setup it shows what runs today (Claude
for every use) and offers to set up the settings namespace, with the
reservation command; after setup, an editable provider list (key status
by last 4 only, model list, a typed key for a stored provider that needs
one), per use (Ask bar, scene analysis, import extraction) a provider, a
model and a Test (with a tool for the Ask bar), Save as a new version.
German and English texts.

The settings namespace can never be a book: isValidBookName refuses it,
so the book bootstrap cannot write book templates into it (DESIGN.md
claimed this before the code did). The e2e instances get their own
settings namespace; setup and teardown flip retain namespaces to full
before deleting them.

Tests: type-check, 194 unit, full e2e 72 passed (ai-settings.spec.ts
new: setup stores the defaults as version 1; a local provider added and
given the Ask bar is stored as version 2; WIP_API_KEY as key variable
refused, nothing stored)
Discovered: Playwright has no getByDisplayValue, and the type-check does
not cover tests/e2e, so the mistake showed only at run time

## 65b3785 — fix(docker): start tsx by path, never through npx (CASE-1048)
**Time:** 2026-11-04 01:55
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 1 changed, +6/-1
**Tests:** not recorded
**Why:** npx downloads a missing package from the npm registry at every start,
so an install without registry access could not start the app and would
run whatever tsx version the registry serves. By path a missing tsx
fails at once. tsx stays under dependencies; the runtime stage's
npm ci --omit=dev installs it.

Tests: production image built and started with --network none: the
server listened and /apps/aa/api/health answered ok; no registry lookup
in the logs. check-app-deployability not run.

## 477e168 — fix: a refused book name says why; reservation hints name both key models (CASE-1069)
**Time:** 2026-11-05 22:45
**Author:** Peter S <189785956+peterseb1969@users.noreply.github.com>
**Files:** 15 changed, +247/-49
**Tests:** not recorded
**Why:** The gate treated every error answer as "WIP is unreachable". A 400 or
404 from the book's status now shows a "can't be opened as a book" panel
with the server's reason and a way back to the book list; only a 503 or
no answer reads as unreachable. The server gives one reason per refusal
(malformed, the platform's namespace, the settings namespace), and
/api/app-config reports settings_namespace so the Books form refuses
both names before navigating.

Every place that told the operator how to reserve a name named only
wip-deploy. They now say the name must be reserved for the app's API
key and list both ways: wip-deploy app-namespace add, or widening a key
made in the console (RC) with a reservation. This includes the
bootstrap's own error after WIP refuses a create.

The set-up panel no longer runs out of its box (Peter's screenshot): the
text column may shrink, commands wrap only between arguments
(CommandLine), the copy is shorter, and the gate page has a gutter at
phone width.

Tests: type-check, 197 unit (server reasons, client rule with the
settings namespace); e2e books.spec 3 new (form refuses wip and the
settings namespace and names both ways; a refused name shows its
reason; a 503 or aborted request shows unreachable), mutation check: the
old gate fails the refused-name test; books + ai-settings 14 passed after
the layout changes, full suite 75 passed before them; screenshots at
1280 and 390 px checked
Discovered: React StrictMode runs the gate's status check twice in dev,
so an expected error answer appears twice in the e2e watch
